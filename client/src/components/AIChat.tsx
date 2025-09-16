import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Send, Trash2, Bot, User } from "lucide-react";
import type { File } from "@shared/schema";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatProps {
  projectId?: string;
  selectedFile: File | undefined;
}

export default function AIChat({ projectId, selectedFile }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '¡Hola! Soy tu asistente de IA. Puedo ayudarte a generar código, corregir errores, optimizar tu aplicación y más. ¿En qué te puedo ayudar?',
      timestamp: new Date(),
    },
  ]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get existing conversations for the project
  const { data: conversations } = useQuery({
    queryKey: ['/api/projects', projectId, 'conversations'],
    enabled: !!projectId,
  });

  useEffect(() => {
    // Auto-scroll to bottom
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, context }: { message: string; context?: any }) => {
      const response = await apiRequest("POST", "/api/ai/chat", {
        message,
        conversationId,
        context,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      }]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje al asistente IA.",
        variant: "destructive",
      });
    },
  });

  const createConversationMutation = useMutation({
    mutationFn: async (messages: Message[]) => {
      if (!projectId) throw new Error("No project selected");
      
      const response = await apiRequest("POST", `/api/projects/${projectId}/conversations`, {
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      });
      return response.json();
    },
    onSuccess: (conversation) => {
      setConversationId(conversation.id);
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'conversations'] });
    },
  });

  const handleSendMessage = () => {
    if (!currentMessage.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: currentMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);

    // Create context from current file and project
    const context = {
      file: selectedFile ? {
        name: selectedFile.name,
        type: selectedFile.type,
        content: selectedFile.content.substring(0, 1000), // Limit context size
      } : null,
      projectId,
    };

    sendMessageMutation.mutate({ 
      message: currentMessage, 
      context 
    });

    // Save conversation if we have a project but no conversation ID yet
    if (projectId && !conversationId) {
      createConversationMutation.mutate([...messages, userMessage]);
    }

    setCurrentMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: '¡Hola! Soy tu asistente de IA. ¿En qué te puedo ayudar?',
        timestamp: new Date(),
      },
    ]);
    setConversationId(null);
  };

  const renderMessage = (message: Message, index: number) => {
    const isUser = message.role === 'user';
    
    return (
      <div 
        key={index} 
        className={`${isUser ? 'ml-8' : 'mr-8'} mb-3`}
        data-testid={`message-${index}`}
      >
        <div className={`rounded-lg p-3 text-sm ${
          isUser 
            ? 'bg-primary/20 ml-auto' 
            : 'bg-secondary'
        }`}>
          {!isUser && (
            <div className="flex items-center space-x-2 mb-2">
              <Bot className="w-4 h-4 text-accent" />
              <span className="font-medium text-xs">Gemini AI</span>
            </div>
          )}
          
          <div className={`${isUser ? 'text-right' : 'text-left'}`}>
            {message.content.includes('```') ? (
              // Render code blocks
              <div className="space-y-2">
                {message.content.split('```').map((part, i) => 
                  i % 2 === 0 ? (
                    <p key={i} className="text-muted-foreground whitespace-pre-wrap">{part}</p>
                  ) : (
                    <div key={i} className="bg-background rounded p-2 font-mono text-xs overflow-x-auto">
                      <pre>{part}</pre>
                    </div>
                  )
                )}
              </div>
            ) : (
              <p className="text-muted-foreground whitespace-pre-wrap">{message.content}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col border-l border-border" data-testid="ai-chat">
      {/* Header */}
      <div className="bg-muted px-4 py-2 border-b border-border flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bot className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-medium">Chat IA</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={clearChat} data-testid="button-clear-chat">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3" data-testid="chat-messages">
        <div ref={scrollRef}>
          {messages.map(renderMessage)}
          {sendMessageMutation.isPending && (
            <div className="mr-8 mb-3">
              <div className="bg-secondary rounded-lg p-3 text-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <Bot className="w-4 h-4 text-accent" />
                  <span className="font-medium text-xs">Gemini AI</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-accent rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-xs text-muted-foreground">Escribiendo...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border p-3">
        <div className="flex space-x-2">
          <Input
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Pregunta algo..."
            className="flex-1"
            disabled={sendMessageMutation.isPending}
            data-testid="input-chat-message"
          />
          <Button 
            onClick={handleSendMessage}
            disabled={sendMessageMutation.isPending || !currentMessage.trim()}
            data-testid="button-send-message"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
