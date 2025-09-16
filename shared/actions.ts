import { z } from "zod";

// Define available actions that can be performed from chat
export const ActionType = z.enum([
  'create_project',
  'add_file',
  'update_file',
  'delete_file',
  'create_web_page',
  'modify_apk',
  'run_python',
  'generate_code_snippet'
]);

// Schema for each action type
export const CreateProjectAction = z.object({
  type: z.literal('create_project'),
  name: z.string().min(1, 'Project name is required'),
  projectType: z.enum(['web', 'apk', 'python']),
  description: z.string().optional(),
  template: z.enum(['blank', 'basic_website', 'react_app', 'android_app']).optional(),
});

export const AddFileAction = z.object({
  type: z.literal('add_file'),
  projectId: z.string(),
  name: z.string().min(1, 'File name is required'),
  content: z.string(),
  path: z.string(),
  fileType: z.enum(['html', 'css', 'js', 'py', 'xml', 'java', 'kt', 'smali']),
});

export const UpdateFileAction = z.object({
  type: z.literal('update_file'),
  fileId: z.string(),
  content: z.string().optional(),
  path: z.string().optional(),
  name: z.string().optional(),
});

export const DeleteFileAction = z.object({
  type: z.literal('delete_file'),
  fileId: z.string(),
});

export const CreateWebPageAction = z.object({
  type: z.literal('create_web_page'),
  projectId: z.string(),
  pageName: z.string().min(1, 'Page name is required'),
  pageType: z.enum(['landing', 'contact', 'about', 'blog', 'product', 'service']),
  style: z.enum(['modern', 'classic', 'minimal', 'colorful']).optional(),
  features: z.array(z.string()).optional(), // ['contact_form', 'gallery', 'testimonials', etc.]
});

export const ModifyApkAction = z.object({
  type: z.literal('modify_apk'),
  projectId: z.string(),
  action: z.enum(['change_icon', 'modify_strings', 'add_feature', 'change_theme']),
  parameters: z.record(z.any()),
});

export const RunPythonAction = z.object({
  type: z.literal('run_python'),
  code: z.string().min(1, 'Python code is required'),
  description: z.string().optional(),
});

export const GenerateCodeSnippetAction = z.object({
  type: z.literal('generate_code_snippet'),
  language: z.string(),
  description: z.string().min(1, 'Code description is required'),
  context: z.string().optional(),
});

// Union type for all actions
export const ChatAction = z.discriminatedUnion('type', [
  CreateProjectAction,
  AddFileAction,
  UpdateFileAction,
  DeleteFileAction,
  CreateWebPageAction,
  ModifyApkAction,
  RunPythonAction,
  GenerateCodeSnippetAction,
]);

export type ChatActionType = z.infer<typeof ChatAction>;

// Response schema for action execution
export const ActionResponse = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.any().optional(),
  requiresConfirmation: z.boolean().optional().default(false),
  confirmationMessage: z.string().optional(),
  actionId: z.string().optional(), // For pending confirmations
});

export type ActionResponseInput = z.input<typeof ActionResponse>;
export type ActionResponseOutput = z.output<typeof ActionResponse>; 
export type ActionResponseType = ActionResponseInput; // Use Input for internal returns

// Quick action suggestions for the UI
export const QuickActions = [
  {
    id: 'create_web_project',
    title: 'Crear proyecto web',
    description: 'Crear un nuevo proyecto de sitio web',
    icon: 'Globe',
    prompt: 'Crea un nuevo proyecto web llamado "mi-sitio-web" con una página de inicio moderna',
  },
  {
    id: 'add_contact_page',
    title: 'Agregar página de contacto',
    description: 'Agregar una página de contacto al proyecto actual',
    icon: 'Mail',
    prompt: 'Agrega una página de contacto con un formulario de contacto al proyecto actual',
  },
  {
    id: 'modify_apk',
    title: 'Modificar APK',
    description: 'Modificar un archivo APK existente',
    icon: 'Smartphone',
    prompt: 'Quiero modificar el icono y el tema de mi aplicación APK',
  },
  {
    id: 'run_python',
    title: 'Ejecutar Python',
    description: 'Ejecutar código Python',
    icon: 'Code',
    prompt: 'Ejecuta un script Python que genere un gráfico de ventas',
  },
  {
    id: 'generate_component',
    title: 'Generar componente',
    description: 'Generar un componente de código',
    icon: 'Package',
    prompt: 'Genera un componente React para mostrar tarjetas de productos',
  },
] as const;