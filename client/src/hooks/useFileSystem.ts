import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export function useFileSystem(projectId?: string) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createFile = useCallback(async (fileData: {
    name: string;
    type: string;
    path: string;
    content: string;
  }) => {
    if (!projectId) throw new Error('No project selected');
    
    const response = await apiRequest('POST', `/api/projects/${projectId}/files`, fileData);
    return response.json();
  }, [projectId]);

  const updateFile = useCallback(async (fileId: string, updates: {
    content?: string;
    isModified?: boolean;
  }) => {
    const response = await apiRequest('PUT', `/api/files/${fileId}`, updates);
    return response.json();
  }, []);

  const deleteFile = useCallback(async (fileId: string) => {
    const response = await apiRequest('DELETE', `/api/files/${fileId}`);
    return response.json();
  }, []);

  const uploadAPK = useCallback(async (file: File) => {
    if (!projectId) throw new Error('No project selected');
    
    const formData = new FormData();
    formData.append('apk', file);
    
    const response = await fetch(`/api/projects/${projectId}/upload-apk`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Failed to upload APK');
    }
    
    return response.json();
  }, [projectId]);

  const createFileMutation = useMutation({
    mutationFn: createFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'files'] });
      toast({
        title: 'Archivo creado',
        description: 'El archivo se ha creado correctamente.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo crear el archivo.',
        variant: 'destructive',
      });
    },
  });

  const updateFileMutation = useMutation({
    mutationFn: ({ fileId, updates }: { fileId: string; updates: any }) =>
      updateFile(fileId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: deleteFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'files'] });
      toast({
        title: 'Archivo eliminado',
        description: 'El archivo se ha eliminado correctamente.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el archivo.',
        variant: 'destructive',
      });
    },
  });

  const uploadAPKMutation = useMutation({
    mutationFn: uploadAPK,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'files'] });
      toast({
        title: 'APK procesado',
        description: 'El archivo APK se ha descompilado correctamente.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo procesar el archivo APK.',
        variant: 'destructive',
      });
    },
  });

  return {
    createFile: createFileMutation.mutate,
    updateFile: updateFileMutation.mutate,
    deleteFile: deleteFileMutation.mutate,
    uploadAPK: uploadAPKMutation.mutate,
    isCreating: createFileMutation.isPending,
    isUpdating: updateFileMutation.isPending,
    isDeleting: deleteFileMutation.isPending,
    isUploading: uploadAPKMutation.isPending,
    isLoading,
  };
}
