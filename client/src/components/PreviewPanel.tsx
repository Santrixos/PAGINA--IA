import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Smartphone, Tablet, Monitor, RefreshCw, ExternalLink } from "lucide-react";
import type { Project, File } from "@shared/schema";

interface PreviewPanelProps {
  project: Project | null;
  selectedFile: File | undefined;
}

export default function PreviewPanel({ project, selectedFile }: PreviewPanelProps) {
  const [previewMode, setPreviewMode] = useState("web");
  const [deviceView, setDeviceView] = useState("desktop");
  const [previewContent, setPreviewContent] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (selectedFile && selectedFile.type === 'html') {
      setPreviewContent(selectedFile.content);
    } else if (project?.type === 'web') {
      // Try to find an index.html file
      setPreviewContent('<html><body><h1>¡Hola Mundo!</h1><p>Esta es mi página web generada con IA</p><button onclick="alert(\'¡Hola desde JavaScript!\')">Hacer clic</button></body></html>');
    }
  }, [selectedFile, project]);

  const refreshPreview = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const openInNewWindow = () => {
    const newWindow = window.open('', '_blank', 'width=800,height=600');
    if (newWindow) {
      newWindow.document.write(previewContent);
      newWindow.document.close();
    }
  };

  const getDeviceClass = () => {
    switch (deviceView) {
      case 'mobile':
        return 'w-80 h-96';
      case 'tablet':
        return 'w-96 h-80';
      default:
        return 'w-full h-full';
    }
  };

  const renderWebPreview = () => (
    <div className={`bg-white ${getDeviceClass()}`}>
      <iframe
        ref={iframeRef}
        srcDoc={previewContent}
        className="w-full h-full border-0"
        title="Web Preview"
        data-testid="web-preview-iframe"
      />
    </div>
  );

  const renderAPKPreview = () => (
    <div className="h-full flex items-center justify-center bg-gray-100">
      <div className="text-center text-gray-600">
        <div className="w-32 h-56 bg-gray-800 rounded-lg mx-auto mb-4 relative">
          <div className="w-28 h-52 bg-white rounded-md absolute top-2 left-2">
            <div className="p-4">
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-blue-500 rounded-full mx-auto mb-2"></div>
                <div className="text-xs font-medium">Mi App</div>
              </div>
              <div className="space-y-2">
                <div className="h-2 bg-gray-200 rounded"></div>
                <div className="h-2 bg-gray-200 rounded w-3/4"></div>
                <div className="h-2 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="mt-4">
                <div className="h-6 bg-blue-500 rounded text-white text-xs flex items-center justify-center">
                  Button
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="text-sm">Vista previa del APK</p>
        <p className="text-xs text-gray-500 mt-1">Emulador simulado</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full border-l border-border" data-testid="preview-panel">
      {/* Preview Toolbar */}
      <div className="bg-card border-b border-border px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-medium">Vista previa</h3>
          <Select value={previewMode} onValueChange={setPreviewMode}>
            <SelectTrigger className="w-32" data-testid="select-preview-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="web">Web</SelectItem>
              <SelectItem value="apk">APK Emulator</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant={deviceView === 'mobile' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setDeviceView('mobile')}
            data-testid="device-mobile"
          >
            <Smartphone className="w-4 h-4" />
          </Button>
          <Button
            variant={deviceView === 'tablet' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setDeviceView('tablet')}
            data-testid="device-tablet"
          >
            <Tablet className="w-4 h-4" />
          </Button>
          <Button
            variant={deviceView === 'desktop' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setDeviceView('desktop')}
            data-testid="device-desktop"
          >
            <Monitor className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={refreshPreview} data-testid="button-refresh">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={openInNewWindow} data-testid="button-open-external">
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-auto p-4 bg-gray-50">
        <div className="flex items-center justify-center h-full">
          {previewMode === 'web' ? renderWebPreview() : renderAPKPreview()}
        </div>
      </div>
    </div>
  );
}
