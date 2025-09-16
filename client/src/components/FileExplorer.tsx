import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FilePlus, FolderPlus, RefreshCw, Upload, Circle } from "lucide-react";
import type { Project, File } from "@shared/schema";

interface FileExplorerProps {
  project: Project | null;
  files: File[];
  selectedFileId: string | null;
  onFileSelect: (fileId: string) => void;
}

export default function FileExplorer({ project, files, selectedFileId, onFileSelect }: FileExplorerProps) {
  const [newFileName, setNewFileName] = useState("");
  const [newFileType, setNewFileType] = useState("html");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<string[]>(["/src"]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createFileMutation = useMutation({
    mutationFn: async (fileData: { name: string; type: string; path: string }) => {
      if (!project) throw new Error("No project selected");
      
      const response = await apiRequest("POST", `/api/projects/${project.id}/files`, {
        name: fileData.name,
        path: fileData.path,
        content: getDefaultContent(fileData.type),
        type: fileData.type,
        isModified: false,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', project?.id, 'files'] });
      setIsCreateDialogOpen(false);
      setNewFileName("");
      toast({
        title: "Archivo creado",
        description: "El archivo se ha creado correctamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear el archivo.",
        variant: "destructive",
      });
    },
  });

  const uploadAPKMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!project) throw new Error("No project selected");
      
      const formData = new FormData();
      formData.append('apk', file);
      
      const response = await fetch(`/api/projects/${project.id}/upload-apk`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload APK');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', project?.id, 'files'] });
      setIsUploadDialogOpen(false);
      toast({
        title: "APK procesado",
        description: "El archivo APK se ha descompilado correctamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo procesar el archivo APK.",
        variant: "destructive",
      });
    },
  });

  const getDefaultContent = (type: string): string => {
    switch (type) {
      case 'html':
        return '<!DOCTYPE html>\n<html lang="es">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Documento</title>\n</head>\n<body>\n    \n</body>\n</html>';
      case 'css':
        return '/* Estilos CSS */\nbody {\n    font-family: Arial, sans-serif;\n    margin: 0;\n    padding: 20px;\n}';
      case 'js':
        return '// Código JavaScript\nconsole.log("Hola mundo!");';
      case 'py':
        return '# Código Python\nprint("Hola mundo!")';
      case 'java':
        return 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hola mundo!");\n    }\n}';
      case 'kt':
        return 'fun main() {\n    println("Hola mundo!")\n}';
      case 'xml':
        return '<?xml version="1.0" encoding="utf-8"?>\n<root>\n    \n</root>';
      case 'smali':
        return '.class public LMain;\n.super Ljava/lang/Object;\n\n.method public constructor <init>()V\n    .registers 1\n    invoke-direct {p0}, Ljava/lang/Object;-><init>()V\n    return-void\n.end method';
      default:
        return '';
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'html':
        return <i className="fab fa-html5 text-orange-500 text-xs"></i>;
      case 'css':
        return <i className="fab fa-css3-alt text-blue-500 text-xs"></i>;
      case 'js':
        return <i className="fab fa-js text-yellow-500 text-xs"></i>;
      case 'py':
        return <i className="fab fa-python text-green-500 text-xs"></i>;
      case 'java':
        return <i className="fab fa-java text-red-500 text-xs"></i>;
      case 'kt':
        return <i className="fas fa-file-code text-purple-500 text-xs"></i>;
      case 'xml':
        return <i className="fas fa-code text-gray-500 text-xs"></i>;
      case 'smali':
        return <i className="fas fa-microchip text-cyan-500 text-xs"></i>;
      default:
        return <i className="fas fa-file text-gray-400 text-xs"></i>;
    }
  };

  const handleCreateFile = () => {
    if (!newFileName.trim()) return;
    
    const path = `/src/${newFileName}`;
    createFileMutation.mutate({
      name: newFileName,
      type: newFileType,
      path,
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.apk')) {
      uploadAPKMutation.mutate(file);
    }
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => 
      prev.includes(path) 
        ? prev.filter(p => p !== path)
        : [...prev, path]
    );
  };

  const renderFileTree = () => {
    const groupedFiles = files.reduce((acc, file) => {
      const pathParts = file.path.split('/').filter(Boolean);
      const folder = pathParts.length > 1 ? `/${pathParts[0]}` : '/';
      
      if (!acc[folder]) {
        acc[folder] = [];
      }
      acc[folder].push(file);
      return acc;
    }, {} as Record<string, File[]>);

    return Object.entries(groupedFiles).map(([folder, folderFiles]) => (
      <div key={folder} className="space-y-1">
        {folder !== '/' && (
          <div 
            className="flex items-center space-x-1 py-1 px-2 rounded hover:bg-secondary cursor-pointer text-sm"
            onClick={() => toggleFolder(folder)}
            data-testid={`folder-${folder.replace('/', '')}`}
          >
            <i className={`fas ${expandedFolders.includes(folder) ? 'fa-chevron-down' : 'fa-chevron-right'} text-xs text-muted-foreground`}></i>
            <i className="fas fa-folder text-primary text-xs"></i>
            <span>{folder.replace('/', '')}</span>
          </div>
        )}
        
        {(folder === '/' || expandedFolders.includes(folder)) && (
          <div className={folder !== '/' ? 'ml-4 space-y-1' : 'space-y-1'}>
            {folderFiles.map((file) => (
              <div
                key={file.id}
                className={`flex items-center space-x-1 py-1 px-2 rounded cursor-pointer text-sm ${
                  selectedFileId === file.id ? 'bg-secondary' : 'hover:bg-secondary'
                }`}
                onClick={() => onFileSelect(file.id)}
                data-testid={`file-${file.name}`}
              >
                {getFileIcon(file.type)}
                <span>{file.name}</span>
                {file.isModified && (
                  <Circle className="w-2 h-2 fill-accent text-accent ml-auto" data-testid={`modified-indicator-${file.name}`} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="flex flex-col h-full" data-testid="file-explorer">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">Explorador</h3>
          <div className="flex space-x-1">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="p-1" data-testid="button-new-file">
                  <FilePlus className="w-3 h-3" />
                </Button>
              </DialogTrigger>
              <DialogContent data-testid="dialog-create-file">
                <DialogHeader>
                  <DialogTitle>Crear nuevo archivo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Nombre del archivo"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    data-testid="input-file-name"
                  />
                  <Select value={newFileType} onValueChange={setNewFileType}>
                    <SelectTrigger data-testid="select-file-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="html">HTML</SelectItem>
                      <SelectItem value="css">CSS</SelectItem>
                      <SelectItem value="js">JavaScript</SelectItem>
                      <SelectItem value="py">Python</SelectItem>
                      <SelectItem value="java">Java</SelectItem>
                      <SelectItem value="kt">Kotlin</SelectItem>
                      <SelectItem value="xml">XML</SelectItem>
                      <SelectItem value="smali">Smali</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleCreateFile} data-testid="button-create-file">
                    Crear archivo
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button variant="ghost" size="sm" className="p-1" data-testid="button-new-folder">
              <FolderPlus className="w-3 h-3" />
            </Button>
            
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="p-1" data-testid="button-upload-apk">
                  <Upload className="w-3 h-3" />
                </Button>
              </DialogTrigger>
              <DialogContent data-testid="dialog-upload-apk">
                <DialogHeader>
                  <DialogTitle>Subir archivo APK</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    type="file"
                    accept=".apk"
                    onChange={handleFileUpload}
                    data-testid="input-apk-file"
                  />
                  <p className="text-sm text-muted-foreground">
                    Selecciona un archivo APK para descompilar y editar
                  </p>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button variant="ghost" size="sm" className="p-1" data-testid="button-refresh">
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          {project?.name || "Sin proyecto"}
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {renderFileTree()}
      </div>

      {/* AI Assistant Panel */}
      <div className="border-t border-border p-3">
        <div className="flex items-center space-x-2 mb-2">
          <i className="fas fa-robot text-accent"></i>
          <h3 className="text-sm font-medium">Asistente IA</h3>
          <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
        </div>
        <div className="space-y-2">
          <Button variant="secondary" size="sm" className="w-full justify-start text-xs" data-testid="button-ai-generate">
            <i className="fas fa-magic mr-2"></i>Generar código
          </Button>
          <Button variant="secondary" size="sm" className="w-full justify-start text-xs" data-testid="button-ai-debug">
            <i className="fas fa-bug mr-2"></i>Detectar errores
          </Button>
          <Button variant="secondary" size="sm" className="w-full justify-start text-xs" data-testid="button-ai-optimize">
            <i className="fas fa-tools mr-2"></i>Optimizar código
          </Button>
        </div>
      </div>
    </div>
  );
}
