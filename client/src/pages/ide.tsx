import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import TopNavigation from "@/components/TopNavigation";
import FileExplorer from "@/components/FileExplorer";
import CodeEditor from "@/components/CodeEditor";
import PreviewPanel from "@/components/PreviewPanel";
import Terminal from "@/components/Terminal";
import AIChat from "@/components/AIChat";
import { Separator } from "@/components/ui/separator";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

export default function IDE() {
  const { id } = useParams<{ id?: string }>();
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  
  const { data: projects } = useQuery({
    queryKey: ['/api/projects'],
  });
  
  const currentProject = projects?.[0] || null;
  const currentProjectId = id || currentProject?.id;

  const { data: files } = useQuery({
    queryKey: ['/api/projects', currentProjectId, 'files'],
    enabled: !!currentProjectId,
  });

  const { data: selectedFile } = useQuery({
    queryKey: ['/api/files', selectedFileId],
    enabled: !!selectedFileId,
  });

  useEffect(() => {
    if (files && files.length > 0 && !selectedFileId) {
      const firstFile = files[0];
      setSelectedFileId(firstFile.id);
      setOpenTabs([firstFile.id]);
      setActiveTab(firstFile.id);
    }
  }, [files, selectedFileId]);

  const handleFileSelect = (fileId: string) => {
    setSelectedFileId(fileId);
    setActiveTab(fileId);
    if (!openTabs.includes(fileId)) {
      setOpenTabs([...openTabs, fileId]);
    }
  };

  const handleCloseTab = (fileId: string) => {
    const newTabs = openTabs.filter(id => id !== fileId);
    setOpenTabs(newTabs);
    
    if (activeTab === fileId) {
      const activeIndex = openTabs.indexOf(fileId);
      const newActiveTab = newTabs[Math.max(0, activeIndex - 1)] || null;
      setActiveTab(newActiveTab);
      setSelectedFileId(newActiveTab);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background text-foreground" data-testid="ide-container">
      <TopNavigation project={currentProject} />
      
      <div className="flex-1 flex overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Sidebar */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <div className="h-full bg-card border-r border-border flex flex-col">
              <FileExplorer
                project={currentProject}
                files={files || []}
                selectedFileId={selectedFileId}
                onFileSelect={handleFileSelect}
                data-testid="file-explorer"
              />
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Main Editor Area */}
          <ResizablePanel defaultSize={55}>
            <div className="h-full flex flex-col">
              <CodeEditor
                files={files || []}
                selectedFile={selectedFile}
                openTabs={openTabs}
                activeTab={activeTab}
                onTabSelect={setActiveTab}
                onTabClose={handleCloseTab}
                onFileSelect={handleFileSelect}
                data-testid="code-editor"
              />
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Preview Panel */}
          <ResizablePanel defaultSize={25}>
            <PreviewPanel
              project={currentProject}
              selectedFile={selectedFile}
              data-testid="preview-panel"
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Bottom Panel */}
      <Separator />
      <div className="h-48 bg-card">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={70}>
            <Terminal data-testid="terminal" />
          </ResizablePanel>
          
          <ResizableHandle />
          
          <ResizablePanel defaultSize={30}>
            <AIChat 
              projectId={currentProjectId}
              selectedFile={selectedFile}
              data-testid="ai-chat"
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
