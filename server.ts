import express, { Request, Response, NextFunction } from "express";
import path from "path";
import jwt from "jsonwebtoken";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality, ThinkingLevel } from "@google/genai";
import { DB } from "./src/server/db";
import { TaskPriority, TaskStatus } from "./src/types";

const PORT = 3000;

// Lazy initialization of Gemini as recommended
let aiInstance: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });
  }
  return aiInstance;
}

// Authentication Middleware (Awaits Firestore checks)
async function authenticateJWT(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Access denied. Token missing." });
    return;
  }
  const token = authHeader.split(" ")[1];
  try {
    const user = await DB.verifyToken(token);
    if (!user) {
      res.status(403).json({ error: "Access denied. Invalid or expired token." });
      return;
    }
    (req as any).user = user;
    next();
  } catch (err) {
    res.status(403).json({ error: "Authentication check failed." });
  }
}

async function startServer() {
  const app = express();

  // Allow larger payload sizes to process base64 files
  app.use(express.json({ limit: "25mb" }));

  // ==================================================
  // AUTHENTICATION ENDPOINTS
  // ==================================================
  
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const { email, password, fullName } = req.body;
    if (!email || !password || !fullName) {
      res.status(400).json({ error: "Missing required registration parameters." });
      return;
    }
    const result = await DB.registerUser(email, password, fullName);
    if (result.error) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json({ message: "Registration successful", user: result.user });
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Missing email or password." });
      return;
    }
    const result = await DB.loginUser(email, password);
    if (result.error) {
      res.status(401).json({ error: result.error });
      return;
    }
    res.json({ user: result.user, token: result.token, wasAutoRegistered: result.wasAutoRegistered });
  });

  app.post("/api/auth/firebase-login", async (req: Request, res: Response) => {
    const { email, fullName, uid } = req.body;
    if (!email || !uid) {
      res.status(400).json({ error: "Missing email or uid for Google Sign-In" });
      return;
    }
    try {
      const user = await DB.getOrCreateFirebaseUser(email, fullName, uid);
      const JWT_SECRET = process.env.JWT_SECRET || "pai-super-secret-key-10928";
      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "30d" });
      res.json({ user, token });
    } catch (err: any) {
      console.error("Firebase Login Route Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/auth/me", authenticateJWT, async (req: Request, res: Response) => {
    const user = (req as any).user;
    res.json({ user });
  });

  app.patch("/api/auth/preferences", authenticateJWT, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { 
      theme, 
      voiceName, 
      speechEnabled, 
      voiceCommandsEnabled, 
      voiceFeedbackSoundsEnabled, 
      agentPersonality,
      voiceType,
      voiceSelected,
      voiceRate,
      voicePitch,
      voiceVolume
    } = req.body;
    const updated = await DB.updateUserPreferences(user.id, { 
      theme, 
      voiceName, 
      speechEnabled, 
      voiceCommandsEnabled, 
      voiceFeedbackSoundsEnabled, 
      agentPersonality,
      voiceType,
      voiceSelected,
      voiceRate,
      voicePitch,
      voiceVolume
    });
    if (!updated) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    res.json({ user: updated });
  });

  app.post("/api/auth/change-password", authenticateJWT, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: "Missing current password or new password." });
      return;
    }
    const result = await DB.updateUserPassword(user.id, currentPassword, newPassword);
    if (!result.success) {
      res.status(400).json({ error: result.error || "Failed to update password." });
      return;
    }
    res.json({ message: "Password updated successfully." });
  });

  // ==================================================
  // TASK MANAGER ENDPOINTS
  // ==================================================

  app.get("/api/tasks", authenticateJWT, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const tasks = await DB.getTasks(user.id);
    res.json({ tasks });
  });

  app.post("/api/tasks", authenticateJWT, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { title, description, priority, dueDate, category } = req.body;
    if (!title) {
      res.status(400).json({ error: "Task title is required." });
      return;
    }
    const task = await DB.createTask(user.id, {
      title,
      description,
      priority: priority || TaskPriority.MEDIUM,
      dueDate,
      category: category || "General"
    });
    res.status(201).json({ task });
  });

  app.patch("/api/tasks/:id", authenticateJWT, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { id } = req.params;
    const updates = req.body;
    const updated = await DB.updateTask(user.id, id, updates);
    if (!updated) {
      res.status(404).json({ error: "Task not found or access denied." });
      return;
    }
    res.json({ task: updated });
  });

  app.delete("/api/tasks/:id", authenticateJWT, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { id } = req.params;
    const deleted = await DB.deleteTask(user.id, id);
    if (!deleted) {
      res.status(404).json({ error: "Task not found or access denied." });
      return;
    }
    res.json({ success: true, message: "Task deleted successfully." });
  });

  // ==================================================
  // GOAL TRACKER ENDPOINTS
  // ==================================================

  app.get("/api/goals", authenticateJWT, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const goals = await DB.getGoals(user.id);
    res.json({ goals });
  });

  app.post("/api/goals", authenticateJWT, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { title, description, targetDate, type } = req.body;
    if (!title) {
      res.status(400).json({ error: "Goal title is required." });
      return;
    }
    const goal = await DB.createGoal(user.id, {
      title,
      description,
      targetDate,
      type: type || "SHORT_TERM"
    });
    res.status(201).json({ goal });
  });

  app.patch("/api/goals/:id", authenticateJWT, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { id } = req.params;
    const updates = req.body;
    const updated = await DB.updateGoal(user.id, id, updates);
    if (!updated) {
      res.status(404).json({ error: "Goal not found." });
      return;
    }
    res.json({ goal: updated });
  });

  app.delete("/api/goals/:id", authenticateJWT, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { id } = req.params;
    const deleted = await DB.deleteGoal(user.id, id);
    if (!deleted) {
      res.status(404).json({ error: "Goal not found." });
      return;
    }
    res.json({ success: true, message: "Goal deleted successfully." });
  });

  // ==================================================
  // KNOWLEDGE BASE (NOTES) ENDPOINTS
  // ==================================================

  app.get("/api/notes", authenticateJWT, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const notes = await DB.getNotes(user.id);
    res.json({ notes });
  });

  app.post("/api/notes", authenticateJWT, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { title, content, category } = req.body;
    if (!title) {
      res.status(400).json({ error: "Note title is required." });
      return;
    }
    const note = await DB.createNote(user.id, {
      title,
      content: content || "",
      category: category || "Notes"
    });
    res.status(201).json({ note });
  });

  app.patch("/api/notes/:id", authenticateJWT, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { id } = req.params;
    const updates = req.body;
    const updated = await DB.updateNote(user.id, id, updates);
    if (!updated) {
      res.status(404).json({ error: "Note not found." });
      return;
    }
    res.json({ note: updated });
  });

  app.delete("/api/notes/:id", authenticateJWT, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { id } = req.params;
    const deleted = await DB.deleteNote(user.id, id);
    if (!deleted) {
      res.status(404).json({ error: "Note not found." });
      return;
    }
    res.json({ success: true, message: "Note deleted successfully." });
  });

  // AI Assistance Note Refinement Tools
  app.post("/api/notes/ai-tools", authenticateJWT, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { content, taskType, instruction } = req.body; 
    
    if (!content) {
      res.status(400).json({ error: "Note content is required." });
      return;
    }

    const t0 = Date.now();
    try {
      const ai = getGemini();

      let prompt = "";
      if (taskType === "summarize") {
        prompt = `You are a professional compiler. Provide a clear, structured summary with a list of key points for the following content:\n\n${content}`;
      } else if (taskType === "professionalize") {
        prompt = `Rewrite the following text with highly professional, elegant business style and clear, concise organization. Maintain all original intent:\n\n${content}`;
      } else if (taskType === "study") {
        prompt = `Based on the following learning material, generate a clear study note, listing technical keywords with definitions, 3 conceptual self-quizzing questions (with answer keys), and a visual structure guidelines.\n\nMaterial:\n${content}`;
      } else {
        prompt = `You are an executive notes strategist. Refine or process this note according to this instruction: "${instruction || "Improve clarity"}".\n\nOriginal Text:\n${content}`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt
      });

      const refinedText = response.text || "AI Refinement yielded empty result.";
      await DB.recordMetrics(user.id, refinedText.length / 4, Date.now() - t0);

      res.json({ refinedText });
    } catch (e: any) {
      console.error("Gemini Note enhancement failed:", e);
      res.status(500).json({ error: "Gemini AI processing failed: " + e.message });
    }
  });

  // ==================================================
  // INTEGRATED DOCUMENTS & FILE INTELLIGENCE SYSTEM
  // ==================================================

  app.get("/api/files", authenticateJWT, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const files = await DB.getFiles(user.id);
    res.json({ files });
  });

  app.post("/api/files/upload", authenticateJWT, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { name, size, mimeType, base64Data } = req.body;

    if (!name || !mimeType || !base64Data) {
      res.status(400).json({ error: "Missing required file metadata or data payload." });
      return;
    }

    const t0 = Date.now();
    try {
      const ai = getGemini();
      let extractedText = "";
      let summary = "";

      // Check if it's an image
      const isImage = mimeType.startsWith("image/");
      
      if (isImage) {
        // Send base64 image immediately to Gemini Flash
        const imagePart = {
          inlineData: {
            mimeType,
            data: base64Data
          }
        };
        const textPart = {
          text: "Analyze this image/document. Provide a 4-bullet executive summary covering key concepts, main elements, any readable text, and strategic insights."
        };

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: { parts: [imagePart, textPart] }
        });
        
        summary = response.text || "No insights were extracted from the document.";
        extractedText = `[Analyzed visual content of ${name}, MIME type: ${mimeType}]`;
      } else {
        // Decode standard text
        const decoded = Buffer.from(base64Data, "base64").toString("utf8");
        extractedText = decoded.substring(0, 10000); // safety cap

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `Analyze this uploaded document. Provide: 1. Core topics. 2. A 3-sentence executive summary. 3. List of key takeaways and actionable items.\n\nDocument Title: ${name}\n\nContent:\n${extractedText}`
        });

        summary = response.text || "Failed to compile document analysis.";
      }

      const savedFile = await DB.saveFileMeta(user.id, {
        name,
        size,
        mimeType,
        contentSummary: summary,
        extractedText: extractedText
      });

      await DB.recordMetrics(user.id, (summary.length + extractedText.length) / 4, Date.now() - t0);

      res.status(201).json({ file: savedFile });
    } catch (e: any) {
      console.error("Gemini File Intelligence compilation failed:", e);
      res.status(500).json({ error: "Failed to compile File Intelligence with AI: " + e.message });
    }
  });

  // Query specific document (Contextual Q&A)
  app.post("/api/files/query", authenticateJWT, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { fileId, query } = req.body;

    if (!fileId || !query) {
      res.status(400).json({ error: "File ID and query are required." });
      return;
    }

    const files = await DB.getFiles(user.id);
    const targetFile = files.find(f => f.id === fileId);
    if (!targetFile) {
      res.status(404).json({ error: "Document meta record not found." });
      return;
    }

    const t0 = Date.now();
    try {
      const ai = getGemini();
      const prompt = `You are an expert Document Investigator. You have access to the document "${targetFile.name}". Use its provided content or summary to answer this user query with extreme factual precision. Direct quotes are highly appreciated, but synthesize clearly.

Document Summary:
${targetFile.contentSummary}

Document Full Sample Text:
${targetFile.extractedText || "No text available."}

User query: "${query}"`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt
      });

      const finalAnswer = response.text || "Failed to secure factual response.";
      await DB.recordMetrics(user.id, finalAnswer.length / 4, Date.now() - t0);

      res.json({ answer: finalAnswer });
    } catch (e: any) {
      console.error("Document query failed:", e);
      res.status(500).json({ error: "Failed to answer query with document context: " + e.message });
    }
  });

  app.delete("/api/files/:id", authenticateJWT, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { id } = req.params;
    const deleted = await DB.deleteFileMeta(user.id, id);
    if (!deleted) {
      res.status(404).json({ error: "Document not found." });
      return;
    }
    res.json({ success: true });
  });

  // ==================================================
  // MEMORY CENTER ENDPOINTS
  // ==================================================

  app.get("/api/memories", authenticateJWT, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const memories = await DB.getMemories(user.id);
    res.json({ memories });
  });

  app.post("/api/memories", authenticateJWT, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { content, category, strength } = req.body;
    if (!content || !category) {
      res.status(400).json({ error: "Memory content and category are required." });
      return;
    }
    const memory = await DB.addMemory(user.id, content, category, strength || 3);
    res.status(201).json({ memory });
  });

  app.delete("/api/memories/:id", authenticateJWT, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { id } = req.params;
    const deleted = await DB.deleteMemory(user.id, id);
    if (!deleted) {
      res.status(404).json({ error: "Memory not found." });
      return;
    }
    res.json({ success: true, message: "Memory removed successfully." });
  });

  // ==================================================
  // INTEGRATED COGNITIVE AI AGENT LOOP (CHAT)
  // ==================================================

  app.get("/api/conversations", authenticateJWT, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const list = await DB.getConversations(user.id);
    res.json({ conversations: list });
  });

  app.post("/api/chat", authenticateJWT, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { messageContent, conversationId, checkResearchMode, thinkingMode } = req.body;

    if (!messageContent) {
      res.status(400).json({ error: "Message content cannot be blank." });
      return;
    }

    const t0 = Date.now();
    const activeConversationId = conversationId || "c_" + Math.random().toString(36).substring(2, 9);

    try {
      const ai = getGemini();

      // Retrieve User Contextual Data to feed the AI context system
      const memories = await DB.getMemories(user.id);
      const tasks = (await DB.getTasks(user.id)).filter(t => t.status !== TaskStatus.COMPLETED);
      const goals = await DB.getGoals(user.id);
      const profile = user.fullName;

      // Compile Memory context
      const memoriesFormatted = memories.map(m => `[Preference: ${m.category}] ${m.content} (Strength: ${m.strength})`).join("\n");
      // Compile Task & Goal context
      const tasksFormatted = tasks.map(t => `- [Priority: ${t.priority}] ${t.title} (${t.category} category)`).join("\n");
      const goalsFormatted = goals.map(g => `- [${g.type}] ${g.title} (${g.progress}% tracker)`).join("\n");

      // Custom system instructions
      const systemInstruction = `You are PAI (Personal AI Agent), an enterprise-grade digital companion, cognitive memory architect, and productivity partner.
Your current owner is: ${profile}.
Your current configured personality preferences are: "${user.preferences.agentPersonality}".

==================================================
OWNER'S PERSONAL COGNITIVE MEMORIES
==================================================
The following are real, persistent facts, goals, and interests learned in active interactions:
${memoriesFormatted || "No memories acquired yet. Observe carefully and ask if needed."}

==================================================
OWNER'S PRODUCTIVITY ENGINE STATUS
==================================================
Active Tasks:
${tasksFormatted || "All tasks are cleared!"}

Active Milestones/Goals:
${goalsFormatted || "No goals active. Encourage setting target dates."}

==================================================
OPERATIONAL PRINCIPLES & CAPABILITIES
==================================================
1. Adapt seamlessly to the user's communication style. Be empathetic, objective, and extremely competent.
2. Long-Term Memory: Actively observe if the user reveals personal preferences, facts, or workflow constraints in their chat. You have automated background memory formation agents that will index these.
3. EXTENSIBLE TOOLS SYSTEM:
   - TASK tool: If the conversation indicates they want to assign, plan, or complete a task, act like a task planner tool.
   - NOTE tool: If the conversation indicates they want to capture, summarize, or refine ideas.
   - RESEARCH tool: For current events or deep factual analyses, you have web search grounding connected.
4. Voice Optimization: Since user may converse through spoken audios, keep explanations well-structured, punchy, avoiding bloated text blocks where practical.
5. Do NOT make up any mock system ports or telemetry in your conversational body unless requested. Standard professional human responses ONLY.`;

      // Form Chat History and append current message
      const historyList = await DB.getConversations(user.id);
      const history = historyList.find(c => c.id === activeConversationId);
      const contentsPayload: any[] = [];

      if (history) {
        // Load recent messages (last 10 to fit tokens cleanly)
        const recentMessages = history.messages.slice(-10);
        for (const msg of recentMessages) {
          contentsPayload.push({
            role: msg.sender === "user" ? "user" : "model",
            parts: [{ text: msg.content }]
          });
        }
      }

      // Add actual input message
      contentsPayload.push({
        role: "user",
        parts: [{ text: messageContent }]
      });

      // Prepare AI Tools Config (Grounding or Standard based on prompt words or explicitly stated checkboxes)
      const forceDisableResearch = req.body.forceDisableResearch === true;
      const needsResearch = !forceDisableResearch && (checkResearchMode || 
        /(search|lookup|current weather|live|news|recent|who won|latest|google)/i.test(messageContent));
      
      const config: any = {
        systemInstruction,
        temperature: 0.75
      };

      if (needsResearch) {
        config.tools = [{ googleSearch: {} }];
      }

      // Thinking Mode integration
      let modelToUse = "gemini-3.5-flash";
      if (thinkingMode === true) {
        modelToUse = "gemini-3.1-pro-preview";
        config.thinkingConfig = {
          thinkingLevel: ThinkingLevel.HIGH
        };
        delete config.temperature; // Remove temperature for reasoning models
      }

      // Call API
      const response = await ai.models.generateContent({
        model: modelToUse,
        contents: contentsPayload,
        config
      });

      const responseText = response.text || "I processed your request, but was unable to formulate a conversational text payload.";
      const elapsed = Date.now() - t0;

      // Extract Grounding Sources if search is active
      const groundingSources: Array<{ uri: string; title: string }> = [];
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (groundingChunks) {
        for (const chunk of groundingChunks) {
          if (chunk.web?.uri) {
            groundingSources.push({
              uri: chunk.web.uri,
              title: chunk.web.title || "Web Reference"
            });
          }
        }
      }

      // Record API Analytics
      await DB.recordMetrics(user.id, (messageContent.length + responseText.length) / 4, elapsed);

      // Save user message to database
      await DB.saveMessage(user.id, activeConversationId, {
        sender: "user",
        content: messageContent,
        timestamp: new Date().toISOString()
      });

      // Assemble list of tools used for visual feedback
      const toolsUsed: string[] = ["Conversational Engine"];
      if (needsResearch) toolsUsed.push("Research Tool (Google Search)");
      if (/(task|todo|schedule|priority)/i.test(messageContent)) toolsUsed.push("Task Automation Tool");
      if (/(note|idea|summarize|document)/i.test(messageContent)) toolsUsed.push("Knowledge Base Tool");
      if (thinkingMode === true) toolsUsed.push("Cognitive Reasoning Path (Thinking Mode)");

      // Save model message to database
      const savedConv = await DB.saveMessage(user.id, activeConversationId, {
        sender: "agent",
        content: responseText,
        timestamp: new Date().toISOString(),
        groundingSources: groundingSources.length > 0 ? groundingSources : undefined,
        toolsUsed
      });

      // Automated cognitive memory extraction background task
      try {
        const memoryPrompt = `Analyze the user conversational request to determine if they are conveying a permanent personal preference, habit, fact, direct goal, or area of interest that a long-term AI companion should construct a memory card for (e.g., "I prefer dark layouts", "I am studying BCA", "My goal is to run a marathon next month", "My spouse is and I like coffee").
        If yes, formulate the preference in a clear 1-sentence statement starting with "The user...". If no preference or fact is revealed, reply with the exact text "NULL".

        User Request: "${messageContent}"

        Constructed 1-Sentence Preference or reply exactly NULL:`;

        const memResponse = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: memoryPrompt
        });

        const extractedFact = memResponse.text ? memResponse.text.trim() : "NULL";
        if (extractedFact && !extractedFact.toLowerCase().includes("null") && extractedFact.length > 5) {
          // Detect category of learned item
          let cat: "PREFERENCE" | "GOAL" | "INTEREST" | "FACT" = "FACT";
          if (/preference|like|dislike|prefer/i.test(extractedFact)) cat = "PREFERENCE";
          else if (/study|learn|career|bca|exam|goal/i.test(extractedFact)) cat = "GOAL";
          else if (/interest|enjoy|hobby|love/i.test(extractedFact)) cat = "INTEREST";

          await DB.addMemory(user.id, extractedFact, cat, 3);
        }
      } catch (me) {
        console.warn("Background memory formation agent failed safely. Ignoring.", me);
      }

      res.json({
        reply: responseText,
        conversationId: activeConversationId,
        groundingSources: groundingSources.length > 0 ? groundingSources : undefined,
        toolsUsed,
        allConversations: await DB.getConversations(user.id)
      });
    } catch (e: any) {
      console.error("Gemini Personal Agent conversational failure:", e);
      res.status(500).json({ error: "Gemini conversational error: " + e.message });
    }
  });

  app.delete("/api/chat/history", authenticateJWT, async (req: Request, res: Response) => {
    const user = (req as any).user;
    await DB.clearHistory(user.id);
    res.json({ success: true, message: "Chat history wiped." });
  });

  // SPEECH SYSTEMS: GEMINI-POWERED COGNITIVE TTS
  app.post("/api/voice/tts", authenticateJWT, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { text } = req.body;

    if (!text) {
      res.status(400).json({ error: "Text payload is mandatory." });
      return;
    }

    const t0 = Date.now();
    try {
      const ai = getGemini();

      // Ensure we use the configured prebuilt voice
      const voicePreference = user.preferences.voiceName || "Zephyr";

      const r = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: text.substring(0, 150) }] }], // lightweight tts wrap
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voicePreference }
            }
          }
        }
      });

      const audioBase64 = r.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!audioBase64) {
        throw new Error("No audio bits generated.");
      }

      await DB.recordMetrics(user.id, 50, Date.now() - t0);
      res.json({ audioBase64 });
    } catch (e: any) {
      console.warn("Express TTS API failed, sending fallback warning to user:", e.message);
      res.json({ audioBase64: null, failed: true });
    }
  });

  // ANALYTICS & SYSTEM PERFORMANCE MONITORING
  app.get("/api/analytics", authenticateJWT, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const stats = await DB.getAnalytics(user.id);
    res.json({ stats });
  });

  // APP NOTIFICATIONS ENDPOINTS
  app.get("/api/notifications", authenticateJWT, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const notifications = await DB.getNotifications(user.id);
    res.json({ notifications });
  });

  app.patch("/api/notifications/:id/read", authenticateJWT, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { id } = req.params;
    const done = await DB.markNotificationAsRead(user.id, id);
    res.json({ success: done });
  });

  app.delete("/api/notifications", authenticateJWT, async (req: Request, res: Response) => {
    const user = (req as any).user;
    await DB.clearNotifications(user.id);
    res.json({ success: true });
  });

  // ==================================================
  // VITE DEVELOPMENT MIDDLEWARE INTERFACES & MAIN ROUTING
  // ==================================================

  if (process.env.NODE_ENV !== "production") {
    console.log("Vite dev environments detected. Mounting Vite middleware mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    console.log("Production environment detected. Serving static folder /dist...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[PAI ENGINE READY] Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Critical server launch failure:", err);
});
