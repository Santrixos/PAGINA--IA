import { z } from "zod";
import { ChatAction, ChatActionType, ActionResponseType, CreateProjectAction, AddFileAction, UpdateFileAction, DeleteFileAction, CreateWebPageAction, ModifyApkAction, RunPythonAction, GenerateCodeSnippetAction } from "@shared/actions";
import { storage } from "../storage";
import { fileSystemService } from "./fileSystem";
import { pythonExecutor } from "./pythonExecutor";
import { generateCode, generateProjectStructure, chatWithAI } from "./gemini";
import { randomUUID } from "crypto";

export class ActionProcessor {
  private pendingConfirmations: Map<string, { action: ChatActionType; userId?: string }> = new Map();

  // Parse user message and extract potential actions using AI
  async parseUserRequest(message: string, context?: {
    projectId?: string;
    currentFile?: string;
    fileContent?: string;
  }): Promise<{ actions: ChatActionType[]; needsMoreInfo: boolean; clarificationMessage?: string }> {
    try {
      const systemPrompt = `You are an action parser for a development assistant. Parse user requests and convert them to structured actions.

Available actions:
- create_project: Create new projects (web, apk, python)
- add_file: Add new files to projects 
- update_file: Modify existing files
- create_web_page: Create specific types of web pages (landing, contact, about, etc.)
- modify_apk: Modify APK files (change icon, strings, features, theme)
- run_python: Execute Python code
- generate_code_snippet: Generate code in any language

Context: ${context ? JSON.stringify(context) : 'No context provided'}

User request: "${message}"

If the request is clear and actionable, respond with a JSON array of actions:
[
  {
    "type": "action_type",
    "param1": "value1",
    ...
  }
]

If you need more information to proceed, respond with:
{
  "needsMoreInfo": true,
  "clarificationMessage": "What specific information do you need?"
}

Examples:
User: "Crea un proyecto web llamado mi-sitio"
Response: [{"type": "create_project", "name": "mi-sitio", "projectType": "web", "template": "basic_website"}]

User: "Agrega una página de contacto"
Response: [{"type": "create_web_page", "projectId": "current", "pageName": "contacto", "pageType": "contact"}]

User: "Genera código React para mostrar productos"
Response: [{"type": "generate_code_snippet", "language": "javascript", "description": "Componente React para mostrar productos"}]

Be specific and use the exact schema types. If projectId is needed and not provided, use "current" if there's a current project context.`;

      const result = await chatWithAI(systemPrompt, {
        projectType: 'web',
        currentFile: context?.currentFile,
        fileContent: context?.fileContent?.substring(0, 500)
      });

      // Try to parse as JSON
      try {
        const parsed = JSON.parse(result);
        
        if (parsed.needsMoreInfo) {
          return {
            actions: [],
            needsMoreInfo: true,
            clarificationMessage: parsed.clarificationMessage
          };
        }

        // Validate and sanitize actions
        const actions = Array.isArray(parsed) ? parsed : [parsed];
        const validatedActions: ChatActionType[] = [];

        for (const action of actions) {
          // Replace "current" projectId with actual current project
          if (action.projectId === "current" && context?.projectId) {
            action.projectId = context.projectId;
          }

          try {
            const validatedAction = ChatAction.parse(action);
            validatedActions.push(validatedAction);
          } catch (error) {
            console.error('Invalid action:', action, error);
          }
        }

        return {
          actions: validatedActions,
          needsMoreInfo: false
        };
      } catch (parseError) {
        // If can't parse as JSON, treat as needing more info
        return {
          actions: [],
          needsMoreInfo: true,
          clarificationMessage: "No pude entender tu solicitud. ¿Podrías ser más específico sobre lo que quieres hacer?"
        };
      }
    } catch (error) {
      console.error('Error parsing user request:', error);
      return {
        actions: [],
        needsMoreInfo: true,
        clarificationMessage: "Hubo un error procesando tu solicitud. ¿Podrías intentar de nuevo?"
      };
    }
  }

  // Execute a single action
  async executeAction(action: ChatActionType, userId?: string): Promise<ActionResponseType> {
    try {
      switch (action.type) {
        case 'create_project':
          return await this.createProject(action);
        
        case 'add_file':
          return await this.addFile(action);
        
        case 'update_file':
          return await this.updateFile(action);
        
        case 'delete_file':
          return await this.deleteFile(action);
        
        case 'create_web_page':
          return await this.createWebPage(action);
        
        case 'modify_apk':
          return await this.modifyApk(action);
        
        case 'run_python':
          return await this.runPython(action);
        
        case 'generate_code_snippet':
          return await this.generateCodeSnippet(action);
        
        default:
          return {
            success: false,
            message: `Tipo de acción no soportado: ${(action as any).type}`
          };
      }
    } catch (error) {
      console.error('Error executing action:', error);
      return {
        success: false,
        message: `Error ejecutando la acción: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  // Create a new project
  private async createProject(action: z.infer<typeof CreateProjectAction>): Promise<ActionResponseType> {
    try {
      // Generate project structure using AI
      const projectStructure = await generateProjectStructure(action.projectType, action.description || action.name);
      
      // Create project
      const project = await storage.createProject({
        name: action.name,
        type: action.projectType,
        description: action.description || `Proyecto ${action.projectType} creado con IA`,
        files: {}
      });
      
      // Create project in file system
      await fileSystemService.createProject(project.id, project.name);

      // Create files from structure
      const createdFiles = [];
      for (const fileData of projectStructure.files) {
        const file = await storage.createFile({
          projectId: project.id,
          name: fileData.name,
          path: fileData.path,
          content: fileData.content,
          type: fileData.type,
          isModified: false
        });
        
        // Create file in file system
        await fileSystemService.createFile(project.id, fileData.path, fileData.content);
        createdFiles.push(file);
      }

      return {
        success: true,
        message: `Proyecto "${action.name}" creado exitosamente con ${createdFiles.length} archivos.`,
        data: { project, files: createdFiles }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error creando el proyecto: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  // Add a file to a project
  private async addFile(action: z.infer<typeof AddFileAction>): Promise<ActionResponseType> {
    try {
      const file = await storage.createFile({
        projectId: action.projectId,
        name: action.name,
        path: action.path,
        content: action.content,
        type: action.fileType,
        isModified: false
      });

      // Create file in file system
      await fileSystemService.createFile(action.projectId, action.path, action.content);

      return {
        success: true,
        message: `Archivo "${action.name}" agregado exitosamente.`,
        data: { file }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error agregando el archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  // Update an existing file
  private async updateFile(action: z.infer<typeof UpdateFileAction>): Promise<ActionResponseType> {
    try {
      const updates: Partial<any> = {};
      if (action.content !== undefined) updates.content = action.content;
      if (action.path !== undefined) updates.path = action.path;
      if (action.name !== undefined) updates.name = action.name;
      updates.isModified = true;

      const file = await storage.updateFile(action.fileId, updates);
      if (!file) {
        return {
          success: false,
          message: "Archivo no encontrado."
        };
      }

      // Update file in file system if content changed
      if (action.content !== undefined) {
        await fileSystemService.updateFile(file.projectId, file.path, action.content);
      }

      return {
        success: true,
        message: `Archivo "${file.name}" actualizado exitosamente.`,
        data: { file }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error actualizando el archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  // Delete a file from a project
  private async deleteFile(action: z.infer<typeof DeleteFileAction>): Promise<ActionResponseType> {
    try {
      const file = await storage.getFile(action.fileId);
      if (!file) {
        return {
          success: false,
          message: "Archivo no encontrado."
        };
      }

      const deleted = await storage.deleteFile(action.fileId);
      if (!deleted) {
        return {
          success: false,
          message: "No se pudo eliminar el archivo."
        };
      }

      // Delete file from file system (if implemented)
      try {
        // Note: fileSystemService.deleteFile may not be implemented yet
        // await fileSystemService.deleteFile(file.projectId, file.path);
      } catch (fsError) {
        console.warn('Could not delete file from filesystem:', fsError);
      }

      return {
        success: true,
        message: `Archivo "${file.name}" eliminado exitosamente.`
      };
    } catch (error) {
      return {
        success: false,
        message: `Error eliminando el archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  // Create a web page
  private async createWebPage(action: z.infer<typeof CreateWebPageAction>): Promise<ActionResponseType> {
    try {
      // Generate page content using AI
      const prompt = `Create a ${action.pageType} page named "${action.pageName}" for a web project.
      Style: ${action.style || 'modern'}
      Features: ${action.features?.join(', ') || 'standard features'}
      
      Generate complete HTML, CSS, and JavaScript files for this page.
      Make it responsive and modern.`;

      const pageStructure = await generateProjectStructure('web', prompt);
      
      // Create files for the page
      const createdFiles = [];
      for (const fileData of pageStructure.files) {
        const file = await storage.createFile({
          projectId: action.projectId,
          name: `${action.pageName}-${fileData.name}`,
          path: `/pages/${action.pageName}/${fileData.name}`,
          content: fileData.content,
          type: fileData.type,
          isModified: false
        });
        createdFiles.push(file);
      }

      return {
        success: true,
        message: `Página "${action.pageName}" creada exitosamente con ${createdFiles.length} archivos.`,
        data: { files: createdFiles }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error creando la página: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  // Modify APK (placeholder implementation)
  private async modifyApk(action: z.infer<typeof ModifyApkAction>): Promise<ActionResponseType> {
    try {
      // This is a complex operation that would require APK decompilation/recompilation
      // For now, return a confirmation requirement
      const actionId = randomUUID();
      this.pendingConfirmations.set(actionId, { action });

      return {
        success: false,
        message: "La modificación de APK es una operación compleja.",
        requiresConfirmation: true,
        confirmationMessage: `¿Estás seguro de que quieres ${action.action} en tu APK? Esta operación puede afectar la funcionalidad de la aplicación.`,
        actionId
      };
    } catch (error) {
      return {
        success: false,
        message: `Error modificando APK: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  // Run Python code
  private async runPython(action: z.infer<typeof RunPythonAction>): Promise<ActionResponseType> {
    try {
      const result = await pythonExecutor.executeCode(action.code);
      
      return {
        success: result.success,
        message: result.success ? "Código Python ejecutado exitosamente." : "Error ejecutando código Python.",
        data: result
      };
    } catch (error) {
      return {
        success: false,
        message: `Error ejecutando Python: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  // Generate code snippet
  private async generateCodeSnippet(action: z.infer<typeof GenerateCodeSnippetAction>): Promise<ActionResponseType> {
    try {
      const code = await generateCode(action.description, action.language, action.context);
      
      return {
        success: true,
        message: `Código ${action.language} generado exitosamente.`,
        data: { code, language: action.language }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error generando código: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  // Confirm a pending action
  async confirmAction(actionId: string, confirmed: boolean): Promise<ActionResponseType> {
    const pending = this.pendingConfirmations.get(actionId);
    if (!pending) {
      return {
        success: false,
        message: "Acción no encontrada o ya procesada."
      };
    }

    this.pendingConfirmations.delete(actionId);

    if (!confirmed) {
      return {
        success: false,
        message: "Acción cancelada por el usuario."
      };
    }

    // Execute the confirmed action
    return await this.executeAction(pending.action, pending.userId);
  }
}

// Export singleton instance
export const actionProcessor = new ActionProcessor();