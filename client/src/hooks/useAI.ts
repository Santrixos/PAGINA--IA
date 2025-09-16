import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export function useAI() {
  const { toast } = useToast();

  const generateCodeMutation = useMutation({
    mutationFn: async (params: {
      prompt: string;
      language: string;
      context?: string;
    }) => {
      const response = await apiRequest('POST', '/api/ai/generate-code', params);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Código generado',
        description: 'El código ha sido generado con IA correctamente.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo generar el código con IA.',
        variant: 'destructive',
      });
    },
  });

  const fixErrorsMutation = useMutation({
    mutationFn: async (params: {
      code: string;
      error: string;
      language: string;
    }) => {
      const response = await apiRequest('POST', '/api/ai/fix-errors', params);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Errores corregidos',
        description: 'Los errores han sido corregidos con IA.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudieron corregir los errores.',
        variant: 'destructive',
      });
    },
  });

  const optimizeCodeMutation = useMutation({
    mutationFn: async (params: {
      code: string;
      language: string;
    }) => {
      const response = await apiRequest('POST', '/api/ai/optimize-code', params);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Código optimizado',
        description: 'El código ha sido optimizado con IA.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo optimizar el código.',
        variant: 'destructive',
      });
    },
  });

  const chatMutation = useMutation({
    mutationFn: async (params: {
      message: string;
      conversationId?: string;
      context?: any;
    }) => {
      const response = await apiRequest('POST', '/api/ai/chat', params);
      return response.json();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo enviar el mensaje al asistente IA.',
        variant: 'destructive',
      });
    },
  });

  return {
    generateCode: generateCodeMutation.mutate,
    fixErrors: fixErrorsMutation.mutate,
    optimizeCode: optimizeCodeMutation.mutate,
    sendChatMessage: chatMutation.mutate,
    isGenerating: generateCodeMutation.isPending,
    isFixing: fixErrorsMutation.isPending,
    isOptimizing: optimizeCodeMutation.isPending,
    isChatting: chatMutation.isPending,
  };
}
