import { type User, type InsertUser, type Project, type InsertProject, type File, type InsertFile, type AIConversation, type InsertAIConversation } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Project methods
  getProject(id: string): Promise<Project | undefined>;
  getProjects(): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;
  
  // File methods
  getFile(id: string): Promise<File | undefined>;
  getFilesByProject(projectId: string): Promise<File[]>;
  createFile(file: InsertFile): Promise<File>;
  updateFile(id: string, file: Partial<File>): Promise<File | undefined>;
  deleteFile(id: string): Promise<boolean>;
  
  // AI Conversation methods
  getConversation(id: string): Promise<AIConversation | undefined>;
  getConversationsByProject(projectId: string): Promise<AIConversation[]>;
  createConversation(conversation: InsertAIConversation): Promise<AIConversation>;
  updateConversation(id: string, conversation: Partial<AIConversation>): Promise<AIConversation | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private projects: Map<string, Project>;
  private files: Map<string, File>;
  private conversations: Map<string, AIConversation>;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.files = new Map();
    this.conversations = new Map();
    
    // Initialize with a sample project
    this.initializeSampleData();
  }
  
  private initializeSampleData() {
    const sampleProject: Project = {
      id: "sample-web-project",
      name: "mi-proyecto-web",
      type: "web",
      description: "Proyecto web de ejemplo",
      files: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.projects.set(sampleProject.id, sampleProject);
    
    const sampleFiles: File[] = [
      {
        id: "file-1",
        projectId: "sample-web-project",
        path: "/src/index.html",
        name: "index.html",
        content: `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mi Aplicación Web</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <h1>¡Hola Mundo!</h1>
        <p>Esta es mi página web generada con IA</p>
        <button onclick="saludar()">Hacer clic</button>
    </div>
    <script src="script.js"></script>
</body>
</html>`,
        type: "html",
        isModified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "file-2",
        projectId: "sample-web-project",
        path: "/src/styles.css",
        name: "styles.css",
        content: `.container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    font-family: Arial, sans-serif;
}

h1 {
    color: #333;
    text-align: center;
}

button {
    background-color: #007bff;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
}

button:hover {
    background-color: #0056b3;
}`,
        type: "css",
        isModified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "file-3",
        projectId: "sample-web-project",
        path: "/src/script.js",
        name: "script.js",
        content: `function saludar() {
    alert("¡Hola desde JavaScript!");
}

// Código generado por IA
document.addEventListener('DOMContentLoaded', function() {
    console.log('Página cargada correctamente');
});`,
        type: "js",
        isModified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "file-4",
        projectId: "sample-web-project",
        path: "/main.py",
        name: "main.py",
        content: `# Ejemplo de código Python
def main():
    print("¡Hola desde Python!")
    nombre = input("¿Cómo te llamas? ")
    print(f"¡Hola, {nombre}!")

if __name__ == "__main__":
    main()`,
        type: "py",
        isModified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    
    sampleFiles.forEach(file => {
      this.files.set(file.id, file);
    });
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Project methods
  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = randomUUID();
    const project: Project = {
      ...insertProject,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.projects.set(id, project);
    return project;
  }

  async updateProject(id: string, projectUpdate: Partial<Project>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    
    const updatedProject = { ...project, ...projectUpdate, updatedAt: new Date() };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: string): Promise<boolean> {
    const deleted = this.projects.delete(id);
    // Also delete associated files
    Array.from(this.files.entries())
      .filter(([_, file]) => file.projectId === id)
      .forEach(([fileId, _]) => this.files.delete(fileId));
    return deleted;
  }

  // File methods
  async getFile(id: string): Promise<File | undefined> {
    return this.files.get(id);
  }

  async getFilesByProject(projectId: string): Promise<File[]> {
    return Array.from(this.files.values()).filter(file => file.projectId === projectId);
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const id = randomUUID();
    const file: File = {
      ...insertFile,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.files.set(id, file);
    return file;
  }

  async updateFile(id: string, fileUpdate: Partial<File>): Promise<File | undefined> {
    const file = this.files.get(id);
    if (!file) return undefined;
    
    const updatedFile = { ...file, ...fileUpdate, updatedAt: new Date() };
    this.files.set(id, updatedFile);
    return updatedFile;
  }

  async deleteFile(id: string): Promise<boolean> {
    return this.files.delete(id);
  }

  // AI Conversation methods
  async getConversation(id: string): Promise<AIConversation | undefined> {
    return this.conversations.get(id);
  }

  async getConversationsByProject(projectId: string): Promise<AIConversation[]> {
    return Array.from(this.conversations.values()).filter(conv => conv.projectId === projectId);
  }

  async createConversation(insertConversation: InsertAIConversation): Promise<AIConversation> {
    const id = randomUUID();
    const conversation: AIConversation = {
      ...insertConversation,
      id,
      createdAt: new Date(),
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async updateConversation(id: string, conversationUpdate: Partial<AIConversation>): Promise<AIConversation | undefined> {
    const conversation = this.conversations.get(id);
    if (!conversation) return undefined;
    
    const updatedConversation = { ...conversation, ...conversationUpdate };
    this.conversations.set(id, updatedConversation);
    return updatedConversation;
  }
}

export const storage = new MemStorage();
