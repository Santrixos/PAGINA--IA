import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { X, Columns, WandSparkles, Bug } from "lucide-react";
import type { File } from "@shared/schema";

interface CodeEditorProps {
  files: File[];
  selectedFile: File | undefined;
  openTabs: string[];
  activeTab: string | null;
  onTabSelect: (fileId: string) => void;
  onTabClose: (fileId: string) => void;
  onFileSelect: (fileId: string) => void;
}

export default function CodeEditor({ 
  files, 
  selectedFile, 
  openTabs, 
  activeTab, 
  onTabSelect, 
  onTabClose,
  onFileSelect 
}: CodeEditorProps) {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("html");
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [errors, setErrors] = useState<string[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (selectedFile) {
      setCode(selectedFile.content);
      setLanguage(selectedFile.type);
    }
  }, [selectedFile]);

  const updateFileMutation = useMutation({
    mutationFn: async ({ fileId, content }: { fileId: string; content: string }) => {
      const response = await apiRequest("PUT", `/api/files/${fileId}`, {
        content,
        isModified: true,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
    },
  });

  const aiGenerateMutation = useMutation({
    mutationFn: async ({ prompt, language, context }: { prompt: string; language: string; context?: string }) => {
      const response = await apiRequest("POST", "/api/ai/generate-code", {
        prompt,
        language,
        context,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setCode(data.code);
      if (selectedFile) {
        updateFileMutation.mutate({ fileId: selectedFile.id, content: data.code });
      }
      toast({
        title: "Código generado",
        description: "El código ha sido generado con IA correctamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo generar el código con IA.",
        variant: "destructive",
      });
    },
  });

  const aiFixErrorsMutation = useMutation({
    mutationFn: async ({ code, error, language }: { code: string; error: string; language: string }) => {
      const response = await apiRequest("POST", "/api/ai/fix-errors", {
        code,
        error,
        language,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setCode(data.fixedCode);
      if (selectedFile) {
        updateFileMutation.mutate({ fileId: selectedFile.id, content: data.fixedCode });
      }
      setErrors([]);
      toast({
        title: "Errores corregidos",
        description: "Los errores han sido corregidos con IA.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudieron corregir los errores.",
        variant: "destructive",
      });
    },
  });

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (selectedFile) {
      // Debounce the update
      const timeoutId = setTimeout(() => {
        updateFileMutation.mutate({ fileId: selectedFile.id, content: newCode });
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  };

  const handleAIGenerate = () => {
    const prompt = window.prompt("¿Qué código quieres generar?");
    if (prompt) {
      aiGenerateMutation.mutate({
        prompt,
        language,
        context: selectedFile?.name,
      });
    }
  };

  const handleFixErrors = () => {
    if (errors.length > 0) {
      aiFixErrorsMutation.mutate({
        code,
        error: errors[0],
        language,
      });
    } else {
      // Simulate error detection
      setErrors(["Considera agregar atributos de accesibilidad"]);
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'html':
        return <i className="fab fa-html5 text-orange-500 mr-2"></i>;
      case 'css':
        return <i className="fab fa-css3-alt text-blue-500 mr-2"></i>;
      case 'js':
        return <i className="fab fa-js text-yellow-500 mr-2"></i>;
      case 'py':
        return <i className="fab fa-python text-green-500 mr-2"></i>;
      case 'java':
        return <i className="fab fa-java text-red-500 mr-2"></i>;
      case 'kt':
        return <i className="fas fa-file-code text-purple-500 mr-2"></i>;
      case 'xml':
        return <i className="fas fa-code text-gray-500 mr-2"></i>;
      case 'smali':
        return <i className="fas fa-microchip text-cyan-500 mr-2"></i>;
      default:
        return <i className="fas fa-file text-gray-400 mr-2"></i>;
    }
  };

  const generateLineNumbers = () => {
    const lines = code.split('\n').length;
    return Array.from({ length: lines }, (_, i) => i + 1);
  };

  const getTabFiles = () => {
    return openTabs.map(tabId => files.find(f => f.id === tabId)).filter(Boolean) as File[];
  };

  const renderTabs = () => {
    const tabFiles = getTabFiles();
    
    return (
      <div className="bg-card border-b border-border flex items-center overflow-x-auto">
        <div className="flex">
          {tabFiles.map((file) => (
            <div
              key={file.id}
              className={`flex items-center px-3 py-2 border-r border-border text-sm cursor-pointer ${
                activeTab === file.id ? 'bg-background' : 'hover:bg-secondary'
              }`}
              onClick={() => {
                onTabSelect(file.id);
                onFileSelect(file.id);
              }}
              data-testid={`tab-${file.name}`}
            >
              {getFileIcon(file.type)}
              <span>{file.name}</span>
              {file.isModified && (
                <div className="w-2 h-2 bg-accent rounded-full ml-2"></div>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="ml-2 h-4 w-4 p-0 hover:bg-secondary rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(file.id);
                }}
                data-testid={`close-tab-${file.name}`}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex items-center ml-auto pr-2">
          <Button variant="ghost" size="sm" className="p-2" data-testid="button-split-editor">
            <Columns className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  if (!selectedFile) {
    return (
      <div className="flex-1 flex flex-col">
        {renderTabs()}
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <i className="fas fa-file-code text-4xl mb-4"></i>
            <p>Selecciona un archivo para comenzar a editar</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col" data-testid="code-editor">
      {/* Editor Tabs */}
      {renderTabs()}

      {/* Editor Toolbar */}
      <div className="bg-muted px-4 py-2 border-b border-border flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-32" data-testid="select-language">
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
          <div className="flex items-center space-x-2">
            <Button 
              size="sm" 
              onClick={handleAIGenerate}
              disabled={aiGenerateMutation.isPending}
              data-testid="button-ai-improve"
            >
              <WandSparkles className="w-3 h-3 mr-1" />
              IA: Mejorar
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={handleFixErrors}
              disabled={aiFixErrorsMutation.isPending}
              data-testid="button-ai-fix"
            >
              <Bug className="w-3 h-3 mr-1" />
              Corregir
            </Button>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <span data-testid="cursor-position">Línea {cursorPosition.line}, Columna {cursorPosition.column}</span>
          <span>UTF-8</span>
          <span>LF</span>
        </div>
      </div>

      {/* Code Editor Content */}
      <div className="flex-1 bg-background font-mono text-sm overflow-hidden">
        <div className="h-full flex">
          {/* Line Numbers */}
          <div className="bg-muted border-r border-border px-2 py-4 text-muted-foreground select-none">
            <div className="space-y-1">
              {generateLineNumbers().map((lineNum) => (
                <div
                  key={lineNum}
                  className={`text-right leading-6 ${
                    lineNum === cursorPosition.line ? 'bg-primary/20' : ''
                  }`}
                  data-testid={`line-number-${lineNum}`}
                >
                  {lineNum}
                </div>
              ))}
            </div>
          </div>
          
          {/* Code Content */}
          <div className="flex-1 relative">
            <Textarea
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              className="w-full h-full border-0 bg-transparent resize-none font-mono text-sm leading-6 p-4"
              placeholder="Escribe tu código aquí..."
              data-testid="code-textarea"
              onSelect={(e) => {
                const target = e.target as HTMLTextAreaElement;
                const lines = target.value.substr(0, target.selectionStart).split('\n');
                setCursorPosition({
                  line: lines.length,
                  column: lines[lines.length - 1].length + 1,
                });
              }}
            />
          </div>
        </div>
      </div>

      {/* Error/Warning Bar */}
      {errors.length > 0 && (
        <div className="bg-destructive/10 border-t border-destructive/20 px-4 py-2 flex items-center space-x-2">
          <i className="fas fa-exclamation-triangle text-destructive"></i>
          <span className="text-sm">{errors.length} advertencia encontrada: {errors[0]}</span>
          <Button 
            size="sm" 
            className="ml-auto" 
            onClick={handleFixErrors}
            disabled={aiFixErrorsMutation.isPending}
            data-testid="button-fix-error"
          >
            Corregir con IA
          </Button>
        </div>
      )}
    </div>
  );
}
