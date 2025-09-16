import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Trash2, Columns } from "lucide-react";
import { io, Socket } from "socket.io-client";

interface TerminalLine {
  type: 'input' | 'output' | 'error';
  content: string;
  timestamp: Date;
}

export default function Terminal() {
  const [currentCommand, setCurrentCommand] = useState("");
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([
    {
      type: 'output',
      content: 'Python 3.11.0 (main, Oct 24 2022, 18:26:48) [MSC v.1933 64 bit (AMD64)] on win32',
      timestamp: new Date(),
    },
    {
      type: 'output',
      content: 'Type "help", "copyright", "credits" or "license" for more information.',
      timestamp: new Date(),
    },
  ]);
  const [problems, setProblems] = useState<Array<{type: 'error' | 'warning', message: string, file: string, line: number}>>([
    {
      type: 'warning',
      message: 'Considera agregar atributos de accesibilidad',
      file: 'index.html',
      line: 14,
    },
  ]);
  
  const terminalRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize socket connection for real-time terminal
    socketRef.current = io();
    
    socketRef.current.on('python-output', (data: { type: 'output' | 'error', data: string }) => {
      setTerminalLines(prev => [...prev, {
        type: data.type,
        content: data.data,
        timestamp: new Date(),
      }]);
    });

    // Start Python session
    socketRef.current.emit('start-python-session');

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLines]);

  const executePythonMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/execute-python", { code });
      return response.json();
    },
    onSuccess: (result) => {
      setTerminalLines(prev => [
        ...prev,
        {
          type: result.success ? 'output' : 'error',
          content: result.output || result.error || '',
          timestamp: new Date(),
        },
      ]);
    },
  });

  const handleCommand = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      if (!currentCommand.trim()) return;

      // Add command to terminal
      setTerminalLines(prev => [...prev, {
        type: 'input',
        content: `>>> ${currentCommand}`,
        timestamp: new Date(),
      }]);

      // Send command via socket for interactive session
      if (socketRef.current) {
        socketRef.current.emit('python-command', currentCommand);
      } else {
        // Fallback to direct execution
        executePythonMutation.mutate(currentCommand);
      }

      setCurrentCommand("");
    }
  };

  const clearTerminal = () => {
    setTerminalLines([
      {
        type: 'output',
        content: 'Terminal cleared',
        timestamp: new Date(),
      },
    ]);
  };

  const renderTerminalLine = (line: TerminalLine, index: number) => {
    const getLineClass = () => {
      switch (line.type) {
        case 'input':
          return 'text-foreground';
        case 'output':
          return 'text-foreground';
        case 'error':
          return 'text-destructive';
        default:
          return 'text-foreground';
      }
    };

    return (
      <div key={index} className={`${getLineClass()} whitespace-pre-wrap`} data-testid={`terminal-line-${index}`}>
        {line.content}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col" data-testid="terminal">
      <Tabs defaultValue="python" className="h-full flex flex-col">
        <div className="bg-muted px-4 py-2 border-b border-border flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="python" data-testid="tab-python">Python</TabsTrigger>
            <TabsTrigger value="bash" data-testid="tab-bash">Bash</TabsTrigger>
            <TabsTrigger value="problems" data-testid="tab-problems">Problemas</TabsTrigger>
          </TabsList>
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="sm" onClick={clearTerminal} data-testid="button-clear">
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" data-testid="button-split">
              <Columns className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <TabsContent value="python" className="flex-1 flex flex-col m-0">
          <div 
            ref={terminalRef}
            className="flex-1 bg-background font-mono text-sm p-4 overflow-auto space-y-1"
            data-testid="python-terminal"
          >
            {terminalLines.map(renderTerminalLine)}
            <div className="flex items-center">
              <span className="text-accent mr-2">{'>>> '}</span>
              <Input
                value={currentCommand}
                onChange={(e) => setCurrentCommand(e.target.value)}
                onKeyDown={handleCommand}
                className="border-0 bg-transparent p-0 font-mono focus:ring-0 focus:outline-none"
                placeholder="Escribe un comando Python..."
                data-testid="python-input"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="bash" className="flex-1 flex flex-col m-0">
          <div className="flex-1 bg-background font-mono text-sm p-4 overflow-auto">
            <div className="text-muted-foreground mb-2">Bash terminal no está disponible en esta versión</div>
            <div className="flex items-center">
              <span className="text-accent mr-2">$ </span>
              <Input
                disabled
                className="border-0 bg-transparent p-0 font-mono"
                placeholder="Bash terminal próximamente..."
                data-testid="bash-input"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="problems" className="flex-1 flex flex-col m-0">
          <div className="flex-1 bg-background text-sm p-4 overflow-auto">
            <div className="space-y-2">
              {problems.map((problem, index) => (
                <div 
                  key={index} 
                  className="flex items-center space-x-2 p-2 rounded hover:bg-secondary cursor-pointer"
                  data-testid={`problem-${index}`}
                >
                  <i className={`fas ${problem.type === 'error' ? 'fa-times-circle text-destructive' : 'fa-exclamation-triangle text-yellow-500'}`}></i>
                  <span className="flex-1">{problem.message}</span>
                  <span className="text-muted-foreground text-xs">{problem.file}:{problem.line}</span>
                </div>
              ))}
              {problems.length === 0 && (
                <div className="text-muted-foreground text-center py-8">
                  <i className="fas fa-check-circle text-accent text-2xl mb-2"></i>
                  <p>No hay problemas detectados</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
