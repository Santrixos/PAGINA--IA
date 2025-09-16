import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI with the API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function generateCode(prompt: string, language: string, context?: string): Promise<string> {
  try {
    const systemPrompt = `You are an expert ${language} developer. Generate clean, working, and well-commented code based on the user's request. 
    
    Guidelines:
    - Write production-ready code with proper error handling
    - Include helpful comments explaining key parts
    - Follow best practices for ${language}
    - Make the code readable and maintainable
    - If creating HTML, include proper DOCTYPE and meta tags
    - If creating CSS, use modern practices and responsive design
    - If creating JavaScript, use modern ES6+ syntax
    - If creating Python, follow PEP 8 standards
    - For mobile languages (Java/Kotlin), follow Android development best practices
    
    ${context ? `Additional context: ${context}` : ''}
    
    User request: ${prompt}
    
    Respond only with the code, no explanations outside of comments.`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(systemPrompt);
    const response = await result.response;

    return response.text() || "// Error: Unable to generate code";
  } catch (error) {
    throw new Error(`Failed to generate code: ${error}`);
  }
}

export async function fixCodeErrors(code: string, error: string, language: string): Promise<string> {
  try {
    const systemPrompt = `You are a ${language} debugging expert. Fix the following code that has this error: "${error}"

Original code:
\`\`\`${language}
${code}
\`\`\`

Please provide the corrected code with:
1. The error fixed
2. Comments explaining what was wrong and how it was fixed
3. Any additional improvements for better code quality

Respond only with the corrected code.`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const result = await model.generateContent(systemPrompt);
    const response = await result.response;

    return response.text() || code; // Return original if fixing fails
  } catch (error) {
    throw new Error(`Failed to fix code errors: ${error}`);
  }
}

export async function optimizeCode(code: string, language: string): Promise<string> {
  try {
    const systemPrompt = `You are a ${language} optimization expert. Optimize the following code for:
    - Better performance
    - Improved readability
    - Best practices compliance
    - Security considerations
    - Maintainability

Original code:
\`\`\`${language}
${code}
\`\`\`

Provide the optimized version with comments explaining the improvements made.
Respond only with the optimized code.`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const result = await model.generateContent(systemPrompt);
    const response = await result.response;

    return response.text() || code; // Return original if optimization fails
  } catch (error) {
    throw new Error(`Failed to optimize code: ${error}`);
  }
}

export async function detectCodeErrors(code: string, language: string): Promise<Array<{
  line: number;
  type: 'error' | 'warning';
  message: string;
  suggestion: string;
}>> {
  try {
    const systemPrompt = `You are a ${language} code analyzer. Analyze the following code and detect any errors, warnings, or potential issues:

\`\`\`${language}
${code}
\`\`\`

Provide a JSON array of issues found, each with:
- line: line number (1-based)
- type: "error" or "warning"
- message: description of the issue
- suggestion: how to fix it

If no issues are found, return an empty array.`;

    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });
    
    const result = await model.generateContent([
      { text: systemPrompt },
      { text: code }
    ]);
    const response = await result.response;

    const rawJson = response.text();
    if (rawJson) {
      return JSON.parse(rawJson);
    }
    return [];
  } catch (error) {
    console.error('Error detecting code issues:', error);
    return [];
  }
}

export async function generateProjectStructure(projectType: string, description: string): Promise<{
  files: Array<{
    path: string;
    name: string;
    content: string;
    type: string;
  }>;
  description: string;
}> {
  try {
    const systemPrompt = `You are a project structure generator. Create a complete ${projectType} project based on this description: ${description}

Generate a JSON response with:
- files: array of files with path, name, content, and type
- description: brief description of the generated project

For web projects, include:
- index.html with proper structure
- styles.css with modern CSS
- script.js with functional JavaScript
- Any additional files needed

For mobile projects, include:
- MainActivity.java or MainActivity.kt
- AndroidManifest.xml
- layout XML files
- resource files as needed

Make the project functional and complete.`;

    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });
    
    const result = await model.generateContent([
      { text: systemPrompt },
      { text: description }
    ]);
    const response = await result.response;

    const rawJson = response.text();
    if (rawJson) {
      return JSON.parse(rawJson);
    }
    
    throw new Error("Failed to generate project structure");
  } catch (error) {
    throw new Error(`Failed to generate project structure: ${error}`);
  }
}

export async function chatWithAI(message: string, context?: {
  projectType?: string;
  currentFile?: string;
  fileContent?: string;
  previousMessages?: Array<{role: 'user' | 'assistant', content: string}>;
}): Promise<string> {
  try {
    let systemPrompt = `You are an AI coding assistant specialized in web development, mobile app development, and programming. You help developers with:

- Code generation and improvement
- Debugging and error fixing
- Best practices and optimization
- Architecture and design decisions
- Learning programming concepts
- Troubleshooting technical issues

Be helpful, concise, and provide actionable advice. When showing code examples, make them practical and relevant to the user's context.`;

    if (context?.projectType) {
      systemPrompt += `\n\nCurrent project type: ${context.projectType}`;
    }

    if (context?.currentFile && context?.fileContent) {
      systemPrompt += `\n\nUser is currently working on: ${context.currentFile}
Current file content (first 500 chars): ${context.fileContent.substring(0, 500)}`;
    }

    let conversationHistory = '';
    if (context?.previousMessages && context.previousMessages.length > 0) {
      conversationHistory = '\n\nRecent conversation:\n' + 
        context.previousMessages.slice(-4).map(msg => 
          `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
        ).join('\n');
    }

    const fullPrompt = systemPrompt + conversationHistory + `\n\nUser: ${message}`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;

    return response.text() || "I'm sorry, I couldn't process your request. Please try again.";
  } catch (error) {
    throw new Error(`Failed to get AI response: ${error}`);
  }
}

// Legacy functions for compatibility with existing routes
export async function summarizeArticle(text: string): Promise<string> {
  return chatWithAI(text);
}

export interface Sentiment {
  rating: number;
  confidence: number;
}

export async function analyzeSentiment(text: string): Promise<Sentiment> {
  try {
    const systemPrompt = `You are a sentiment analysis expert. 
Analyze the sentiment of the text and provide a rating
from 1 to 5 stars and a confidence score between 0 and 1.
Respond with JSON in this format: 
{'rating': number, 'confidence': number}`;

    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });
    
    const result = await model.generateContent([
      { text: systemPrompt },
      { text: text }
    ]);
    const response = await result.response;

    const rawJson = response.text();

    if (rawJson) {
      const data: Sentiment = JSON.parse(rawJson);
      return data;
    } else {
      throw new Error("Empty response from model");
    }
  } catch (error) {
    throw new Error(`Failed to analyze sentiment: ${error}`);
  }
}
