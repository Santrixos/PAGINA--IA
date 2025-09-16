import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema, insertFileSchema, insertAIConversationSchema } from "@shared/schema";
import { fileSystemService } from "./services/fileSystem";
import { pythonExecutor } from "./services/pythonExecutor";
import { summarizeArticle, analyzeSentiment, generateCode, fixCodeErrors, optimizeCode, chatWithAI, chatWithAIStream } from "./services/gemini";
import multer from "multer";
import { Server as SocketIOServer } from "socket.io";

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Socket.io for real-time features
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join-project', (projectId: string) => {
      socket.join(projectId);
    });

    socket.on('code-change', (data: { projectId: string, fileId: string, content: string }) => {
      socket.to(data.projectId).emit('code-updated', data);
    });

    socket.on('start-python-session', () => {
      pythonExecutor.startInteractiveSession();
      
      pythonExecutor.on('output', (output: string) => {
        socket.emit('python-output', { type: 'output', data: output });
      });

      pythonExecutor.on('error', (error: string) => {
        socket.emit('python-output', { type: 'error', data: error });
      });
    });

    socket.on('python-command', (command: string) => {
      pythonExecutor.sendCommand(command);
    });

    // AI Streaming Chat
    socket.on('ai-chat-stream', async (data: { 
      message: string, 
      conversationId?: string, 
      context?: any 
    }) => {
      try {
        const { message, conversationId, context } = data;
        
        // Load conversation history if conversationId is provided
        let previousMessages: Array<{role: 'user' | 'assistant', content: string}> = [];
        if (conversationId) {
          const conversation = await storage.getConversation(conversationId);
          if (conversation && conversation.messages) {
            previousMessages = conversation.messages;
          }
        }
        
        // Include conversation history in context
        const enhancedContext = {
          ...context,
          previousMessages
        };
        
        // Start streaming response
        socket.emit('ai-chat-start');
        let fullResponse = '';
        
        for await (const chunk of chatWithAIStream(message, enhancedContext)) {
          fullResponse += chunk;
          socket.emit('ai-chat-chunk', { chunk });
        }
        
        // Update conversation if provided
        if (conversationId) {
          const conversation = await storage.getConversation(conversationId);
          if (conversation) {
            const updatedMessages = [
              ...(conversation.messages || []),
              { role: 'user' as const, content: message },
              { role: 'assistant' as const, content: fullResponse }
            ];
            await storage.updateConversation(conversationId, { messages: updatedMessages });
          }
        }
        
        socket.emit('ai-chat-end', { fullResponse });
      } catch (error) {
        console.error('AI streaming error:', error);
        socket.emit('ai-chat-error', { error: 'Failed to get AI response' });
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // Projects API
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(projectData);
      await fileSystemService.createProject(project.id);
      res.json(project);
    } catch (error) {
      res.status(400).json({ error: "Invalid project data" });
    }
  });

  app.put("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.updateProject(req.params.id, req.body);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const success = await storage.deleteProject(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Project not found" });
      }
      await fileSystemService.deleteProject(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // Files API
  app.get("/api/projects/:projectId/files", async (req, res) => {
    try {
      const files = await storage.getFilesByProject(req.params.projectId);
      res.json(files);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch files" });
    }
  });

  app.get("/api/files/:id", async (req, res) => {
    try {
      const file = await storage.getFile(req.params.id);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      res.json(file);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch file" });
    }
  });

  app.post("/api/projects/:projectId/files", async (req, res) => {
    try {
      const fileData = insertFileSchema.parse({
        ...req.body,
        projectId: req.params.projectId
      });
      const file = await storage.createFile(fileData);
      await fileSystemService.createFile(file.projectId, file.path, file.content);
      res.json(file);
    } catch (error) {
      res.status(400).json({ error: "Invalid file data" });
    }
  });

  app.put("/api/files/:id", async (req, res) => {
    try {
      const file = await storage.updateFile(req.params.id, req.body);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      await fileSystemService.updateFile(file.projectId, file.path, file.content);
      
      // Emit file update to connected clients
      io.to(file.projectId).emit('file-updated', file);
      
      res.json(file);
    } catch (error) {
      res.status(500).json({ error: "Failed to update file" });
    }
  });

  app.delete("/api/files/:id", async (req, res) => {
    try {
      const file = await storage.getFile(req.params.id);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      
      await storage.deleteFile(req.params.id);
      await fileSystemService.deleteFile(file.projectId, file.path);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  // APK Upload and Processing
  app.post("/api/projects/:projectId/upload-apk", upload.single('apk'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No APK file provided" });
      }

      await fileSystemService.processAPK(req.params.projectId, req.file.buffer);
      
      // Update project type to APK
      await storage.updateProject(req.params.projectId, { type: 'apk' });
      
      res.json({ success: true, message: "APK processed successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to process APK" });
    }
  });

  // Python Execution
  app.post("/api/execute-python", async (req, res) => {
    try {
      const { code } = req.body;
      const result = await pythonExecutor.executeCode(code);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to execute Python code" });
    }
  });

  // AI Integration
  app.post("/api/ai/generate-code", async (req, res) => {
    try {
      const { prompt, language, context } = req.body;
      const generatedCode = await generateCode(prompt, language, context);
      res.json({ code: generatedCode });
    } catch (error) {
      console.error('AI generate code error:', error);
      res.status(500).json({ error: "Failed to generate code with AI" });
    }
  });

  app.post("/api/ai/fix-errors", async (req, res) => {
    try {
      const { code, error, language } = req.body;
      const fixedCode = await fixCodeErrors(code, error, language);
      res.json({ fixedCode });
    } catch (error) {
      console.error('AI fix errors error:', error);
      res.status(500).json({ error: "Failed to fix errors with AI" });
    }
  });

  app.post("/api/ai/optimize-code", async (req, res) => {
    try {
      const { code, language } = req.body;
      const optimizedCode = await optimizeCode(code, language);
      res.json({ optimizedCode });
    } catch (error) {
      console.error('AI optimize code error:', error);
      res.status(500).json({ error: "Failed to optimize code with AI" });
    }
  });

  app.post("/api/ai/analyze-sentiment", async (req, res) => {
    try {
      const { text } = req.body;
      const sentiment = await analyzeSentiment(text);
      res.json(sentiment);
    } catch (error) {
      res.status(500).json({ error: "Failed to analyze sentiment" });
    }
  });

  // AI Conversations
  app.get("/api/projects/:projectId/conversations", async (req, res) => {
    try {
      const conversations = await storage.getConversationsByProject(req.params.projectId);
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.post("/api/projects/:projectId/conversations", async (req, res) => {
    try {
      const conversationData = insertAIConversationSchema.parse({
        ...req.body,
        projectId: req.params.projectId
      });
      const conversation = await storage.createConversation(conversationData);
      res.json(conversation);
    } catch (error) {
      res.status(400).json({ error: "Invalid conversation data" });
    }
  });

  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message, conversationId, context } = req.body;
      
      // Load conversation history if conversationId is provided
      let previousMessages: Array<{role: 'user' | 'assistant', content: string}> = [];
      if (conversationId) {
        const conversation = await storage.getConversation(conversationId);
        if (conversation && conversation.messages) {
          previousMessages = conversation.messages;
        }
      }
      
      // Include conversation history in context
      const enhancedContext = {
        ...context,
        previousMessages
      };
      
      const response = await chatWithAI(message, enhancedContext);
      
      // Update conversation if provided
      if (conversationId) {
        const conversation = await storage.getConversation(conversationId);
        if (conversation) {
          const updatedMessages = [
            ...(conversation.messages || []),
            { role: 'user' as const, content: message },
            { role: 'assistant' as const, content: response }
          ];
          await storage.updateConversation(conversationId, { messages: updatedMessages });
        }
      }
      
      res.json({ response });
    } catch (error) {
      console.error('AI chat error:', error);
      res.status(500).json({ error: "Failed to get AI response" });
    }
  });

  return httpServer;
}
