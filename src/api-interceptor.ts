// PAI Static Host API Interceptor & Local Sandbox Modality
// This file intercepts API calls transparently when running in static environments (like Netlify, Vercel, or GitHub Pages)
// and redirects queries to a fully structured LocalStorage relational prototype database to prevent "unexpected response at JSON input" crashes.

const isStaticAppHost = typeof window !== "undefined" && (
  window.location.hostname.includes("netlify.app") || 
  window.location.hostname.includes("vercel.app") || 
  window.location.hostname.includes("github.io") || 
  window.location.hostname.includes("gitlab.io") || 
  window.location.hostname.endsWith(".pages.dev")
);

// Initialize default mock databases in localStorage if not already present
export function initializeStaticDatabase() {
  if (typeof window === "undefined") return;

  if (!localStorage.getItem("static_tasks")) {
    localStorage.setItem("static_tasks", JSON.stringify([
      {
        id: "t_1",
        userId: "u_static",
        title: "Review Operating Systems Lecture Notes",
        description: "Go through process states, scheduling algorithms, and deadlocks core questions.",
        priority: "HIGH",
        status: "TODO",
        dueDate: new Date(Date.now() + 86400000 * 2).toISOString().substring(0, 10),
        category: "Studies",
        createdAt: new Date().toISOString()
      },
      {
        id: "t_2",
        userId: "u_static",
        title: "Complete Compiler Design Lab Sheet",
        description: "Write lexical analyzer codes using Lex tool pattern matching elements.",
        priority: "URGENT",
        status: "IN_PROGRESS",
        dueDate: new Date(Date.now() + 86400000).toISOString().substring(0, 10),
        category: "Homework",
        createdAt: new Date().toISOString()
      },
      {
        id: "t_3",
        userId: "u_static",
        title: "Prepare Research Proposal Draft",
        description: "Submit 2-page abstract on Machine Learning in Health Diagnosis classification.",
        priority: "MEDIUM",
        status: "COMPLETED",
        dueDate: new Date(Date.now() - 86400000).toISOString().substring(0, 10),
        category: "Research",
        createdAt: new Date().toISOString()
      }
    ]));
  }

  if (!localStorage.getItem("static_goals")) {
    localStorage.setItem("static_goals", JSON.stringify([
      {
        id: "g_1",
        userId: "u_static",
        title: "Clear University Syllabus",
        description: "Master all core IT syllabus papers with active recall systems.",
        targetDate: new Date(Date.now() + 86400000 * 45).toISOString().substring(0, 10),
        progress: 75,
        type: "LONG_TERM",
        createdAt: new Date().toISOString()
      },
      {
        id: "g_2",
        userId: "u_static",
        title: "Submit Minor Project Abstract",
        description: "Present clean slides to department mentor overview keys.",
        targetDate: new Date(Date.now() + 86400000 * 15).toISOString().substring(0, 10),
        progress: 40,
        type: "SHORT_TERM",
        createdAt: new Date().toISOString()
      }
    ]));
  }

  if (!localStorage.getItem("static_notes")) {
    localStorage.setItem("static_notes", JSON.stringify([
      {
        id: "n_1",
        userId: "u_static",
        title: "Linear Algebra & Vector Spaces",
        content: "Vector spaces represent closed mathematical fields. Basis vectors determine dimensions. Matrices function as transformation vectors mapping inputs cleanly.",
        category: "Studies",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "n_2",
        userId: "u_static",
        title: "Database Indexing Guidelines",
        content: "B-Trees are optimized for multi-row lookup. Hash indexes are excellent for exact equals points but fail range checks. Cluster indexes order table rows physically.",
        category: "Studies",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]));
  }

  if (!localStorage.getItem("static_memories")) {
    localStorage.setItem("static_memories", JSON.stringify([
      {
        id: "m_1",
        userId: "u_static",
        content: "The user is an active, motivated Computer Science and IT student.",
        category: "FACT",
        strength: 5,
        createdAt: new Date().toISOString()
      },
      {
        id: "m_2",
        userId: "u_static",
        content: "The user prefers high-contrast dark workspaces with spacious layouts.",
        category: "PREFERENCE",
        strength: 4,
        createdAt: new Date().toISOString()
      }
    ]));
  }

  if (!localStorage.getItem("static_conversations")) {
    localStorage.setItem("static_conversations", JSON.stringify([
      {
        id: "c_onboarding",
        userId: "u_static",
        title: "Academic Onboarding Assistant",
        messages: [
          {
            id: "msg_init_1",
            sender: "agent",
            content: "Hello! Welcome to **PAI**, your Personal Research & Study AI Companion. I have successfully initialized your local offline workspace sandbox since we are operating in a static client host environment (like Netlify). All your planning records, notes, and goals are saved securely in your browser's local storage database.\n\nAsk me any study questions or outline an assignment task, and we will solve it together!",
            timestamp: new Date().toISOString(),
            toolsUsed: ["Static Sandbox Core"]
          }
        ],
        updatedAt: new Date().toISOString()
      }
    ]));
  }

  if (!localStorage.getItem("static_notifications")) {
    localStorage.setItem("static_notifications", JSON.stringify([
      {
        id: "notif_1",
        userId: "u_static",
        title: "Welcome to PAI Sandbox Mode",
        content: "Operating on a frontend static instance. All features have been auto-configured to use high-performance local storage databases.",
        type: "SYSTEM",
        read: false,
        createdAt: new Date().toISOString()
      },
      {
        id: "notif_2",
        userId: "u_static",
        title: "Exam Goal Tracking Live",
        content: "Academic milestones are actively tracked in your localized Goal Panel.",
        type: "TASK",
        read: false,
        createdAt: new Date().toISOString()
      }
    ]));
  }

  if (!localStorage.getItem("static_analytics")) {
    localStorage.setItem("static_analytics", JSON.stringify({
      userId: "u_static",
      totalTokensUsed: 12500,
      apiCallsCount: 42,
      responseTimeMsAverage: 120,
      taskCompletionRate: 33,
      memoryEntriesCount: 2,
      lastActive: new Date().toISOString()
    }));
  }

  if (!localStorage.getItem("static_files")) {
    localStorage.setItem("static_files", JSON.stringify([]));
  }
}

// Transparent Response constructor helper
function createResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

// Intercept handler
export async function handleMockRequest(url: string, init?: RequestInit): Promise<Response> {
  const dummyUrl = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
  const path = dummyUrl.pathname;
  
  initializeStaticDatabase();

  // AUTHENTICATION PATHS
  if (path === "/api/auth/register") {
    const body = init?.body ? JSON.parse(init.body as string) : {};
    const email = body.email || "student@pai.agent";
    const fullName = body.fullName || "PAI Student";
    const user = {
      id: "u_static",
      email,
      fullName,
      passwordHash: "offline-hash",
      preferences: {
        theme: "dark",
        voiceName: "Zephyr",
        speechEnabled: false,
        voiceCommandsEnabled: true,
        voiceFeedbackSoundsEnabled: true,
        agentPersonality: "A helpful, highly intelligent companion."
      },
      createdAt: new Date().toISOString()
    };
    localStorage.setItem("static_user_profile", JSON.stringify(user));
    return createResponse({ message: "Registration successful", user }, 201);
  }

  if (path === "/api/auth/login") {
    const body = init?.body ? JSON.parse(init.body as string) : {};
    const email = body.email || "student@pai.agent";
    const profileStr = localStorage.getItem("static_user_profile");
    const user = profileStr ? JSON.parse(profileStr) : {
      id: "u_static",
      email,
      fullName: "PAI Student",
      passwordHash: "offline-hash",
      preferences: {
        theme: "dark",
        voiceName: "Zephyr",
        speechEnabled: false,
        voiceCommandsEnabled: true,
        voiceFeedbackSoundsEnabled: true,
        agentPersonality: "A helpful, highly intelligent companion."
      },
      createdAt: new Date().toISOString()
    };
    user.email = email;
    localStorage.setItem("static_user_profile", JSON.stringify(user));
    return createResponse({
      user,
      token: "static_jwt_token",
      wasAutoRegistered: false
    }, 200);
  }

  if (path === "/api/auth/me") {
    const profileStr = localStorage.getItem("static_user_profile");
    const user = profileStr ? JSON.parse(profileStr) : {
      id: "u_static",
      email: "student@pai.agent",
      fullName: "PAI Student",
      passwordHash: "offline-hash",
      preferences: {
        theme: "dark",
        voiceName: "Zephyr",
        speechEnabled: false,
        voiceCommandsEnabled: true,
        voiceFeedbackSoundsEnabled: true,
        agentPersonality: "A helpful, highly intelligent, and empathetic productivity partner. You act as a world-class AI Solutions Architect and personal assistant."
      },
      createdAt: new Date().toISOString()
    };
    return createResponse({ user }, 200);
  }

  if (path === "/api/auth/preferences") {
    const body = init?.body ? JSON.parse(init.body as string) : {};
    const profileStr = localStorage.getItem("static_user_profile");
    const user = profileStr ? JSON.parse(profileStr) : {
      id: "u_static",
      email: "student@pai.agent",
      fullName: "PAI Student",
      preferences: {},
      createdAt: new Date().toISOString()
    };
    user.preferences = { ...user.preferences, ...body };
    localStorage.setItem("static_user_profile", JSON.stringify(user));
    return createResponse({ user }, 200);
  }

  if (path === "/api/auth/change-password") {
    return createResponse({ message: "Password updated successfully." }, 200);
  }

  // TASK OPERATIONS
  if (path === "/api/tasks") {
    if (init?.method === "POST") {
      const body = JSON.parse(init.body as string);
      const tasks = JSON.parse(localStorage.getItem("static_tasks") || "[]");
      const task = {
        id: "t_" + Math.random().toString(36).substring(2, 9),
        userId: "u_static",
        title: body.title,
        description: body.description || "",
        priority: body.priority || "MEDIUM",
        status: "TODO",
        dueDate: body.dueDate,
        category: body.category || "General",
        createdAt: new Date().toISOString()
      };
      tasks.push(task);
      localStorage.setItem("static_tasks", JSON.stringify(tasks));
      return createResponse({ task }, 201);
    }
    const tasks = JSON.parse(localStorage.getItem("static_tasks") || "[]");
    return createResponse({ tasks }, 200);
  }

  if (path.startsWith("/api/tasks/")) {
    const id = path.replace("/api/tasks/", "");
    const tasks = JSON.parse(localStorage.getItem("static_tasks") || "[]");
    if (init?.method === "PATCH") {
      const body = JSON.parse(init.body as string);
      const idx = tasks.findIndex((t: any) => t.id === id);
      if (idx !== -1) {
        tasks[idx] = { ...tasks[idx], ...body };
        localStorage.setItem("static_tasks", JSON.stringify(tasks));
        return createResponse({ task: tasks[idx] }, 200);
      }
      return createResponse({ error: "Task not found" }, 404);
    }
    if (init?.method === "DELETE") {
      const filtered = tasks.filter((t: any) => t.id !== id);
      localStorage.setItem("static_tasks", JSON.stringify(filtered));
      return createResponse({ success: true }, 200);
    }
  }

  // GOALS OPERATIONS
  if (path === "/api/goals") {
    if (init?.method === "POST") {
      const body = JSON.parse(init.body as string);
      const goals = JSON.parse(localStorage.getItem("static_goals") || "[]");
      const goal = {
        id: "g_" + Math.random().toString(36).substring(2, 9),
        userId: "u_static",
        title: body.title,
        description: body.description || "",
        targetDate: body.targetDate,
        progress: 0,
        type: body.type || "SHORT_TERM",
        createdAt: new Date().toISOString()
      };
      goals.push(goal);
      localStorage.setItem("static_goals", JSON.stringify(goals));
      return createResponse({ goal }, 201);
    }
    const goals = JSON.parse(localStorage.getItem("static_goals") || "[]");
    return createResponse({ goals }, 200);
  }

  if (path.startsWith("/api/goals/")) {
    const id = path.replace("/api/goals/", "");
    const goals = JSON.parse(localStorage.getItem("static_goals") || "[]");
    if (init?.method === "PATCH") {
      const body = JSON.parse(init.body as string);
      const idx = goals.findIndex((g: any) => g.id === id);
      if (idx !== -1) {
        goals[idx] = { ...goals[idx], ...body };
        localStorage.setItem("static_goals", JSON.stringify(goals));
        return createResponse({ goal: goals[idx] }, 200);
      }
      return createResponse({ error: "Goal not found" }, 404);
    }
    if (init?.method === "DELETE") {
      const filtered = goals.filter((g: any) => g.id !== id);
      localStorage.setItem("static_goals", JSON.stringify(filtered));
      return createResponse({ success: true }, 200);
    }
  }

  // NOTES OPERATIONS
  if (path === "/api/notes") {
    if (init?.method === "POST") {
      const body = JSON.parse(init.body as string);
      const notes = JSON.parse(localStorage.getItem("static_notes") || "[]");
      const note = {
        id: "n_" + Math.random().toString(36).substring(2, 9),
        userId: "u_static",
        title: body.title,
        content: body.content || "",
        category: body.category || "General",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      notes.push(note);
      localStorage.setItem("static_notes", JSON.stringify(notes));
      return createResponse({ note }, 201);
    }
    const notes = JSON.parse(localStorage.getItem("static_notes") || "[]");
    return createResponse({ notes }, 200);
  }

  if (path.startsWith("/api/notes/")) {
    const id = path.replace("/api/notes/", "");
    const notes = JSON.parse(localStorage.getItem("static_notes") || "[]");
    if (init?.method === "PATCH") {
      const body = JSON.parse(init.body as string);
      const idx = notes.findIndex((n: any) => n.id === id);
      if (idx !== -1) {
        notes[idx] = { ...notes[idx], ...body, updatedAt: new Date().toISOString() };
        localStorage.setItem("static_notes", JSON.stringify(notes));
        return createResponse({ note: notes[idx] }, 200);
      }
      return createResponse({ error: "Note not found" }, 401);
    }
    if (init?.method === "DELETE") {
      const filtered = notes.filter((n: any) => n.id !== id);
      localStorage.setItem("static_notes", JSON.stringify(filtered));
      return createResponse({ success: true }, 200);
    }
  }

  // MEMORIES OPERATIONS
  if (path === "/api/memories") {
    if (init?.method === "POST") {
      const body = JSON.parse(init.body as string);
      const memories = JSON.parse(localStorage.getItem("static_memories") || "[]");
      const memory = {
        id: "m_" + Math.random().toString(36).substring(2, 9),
        userId: "u_static",
        content: body.content,
        category: body.category || "FACT",
        strength: body.strength || 3,
        createdAt: new Date().toISOString()
      };
      memories.push(memory);
      localStorage.setItem("static_memories", JSON.stringify(memories));
      return createResponse({ memory }, 201);
    }
    const memories = JSON.parse(localStorage.getItem("static_memories") || "[]");
    return createResponse({ memories }, 200);
  }

  if (path.startsWith("/api/memories/")) {
    const id = path.replace("/api/memories/", "");
    if (init?.method === "DELETE") {
      const memories = JSON.parse(localStorage.getItem("static_memories") || "[]");
      const filtered = memories.filter((m: any) => m.id !== id);
      localStorage.setItem("static_memories", JSON.stringify(filtered));
      return createResponse({ success: true }, 200);
    }
  }

  // FILES OPERATIONS
  if (path === "/api/files") {
    const files = JSON.parse(localStorage.getItem("static_files") || "[]");
    return createResponse({ files }, 200);
  }

  if (path === "/api/files/upload" && init?.method === "POST") {
    const body = JSON.parse(init.body as string);
    const files = JSON.parse(localStorage.getItem("static_files") || "[]");
    const newFile = {
      id: "f_" + Math.random().toString(36).substring(2, 9),
      userId: "u_static",
      name: body.name || "academic_document.pdf",
      size: body.size || 1024,
      mimeType: body.mimeType || "application/pdf",
      contentSummary: `This is high-performance offline document analysis of "${body.name}".\n\n- Main Subject: IT study notes and engineering workflows.\n- Action items have been indexed into the Local Checklist context.\n- AI-based Q&A is operational. Select "Context Q&A" to query deep concepts.`,
      extractedText: "Offline secure text index.",
      createdAt: new Date().toISOString()
    };
    files.push(newFile);
    localStorage.setItem("static_files", JSON.stringify(files));
    return createResponse({ file: newFile }, 201);
  }

  if (path === "/api/files/query" && init?.method === "POST") {
    const body = JSON.parse(init.body as string);
    const query = body.query || "";
    return createResponse({
      answer: `Offline Document Q&A Response for "${query}":\n\n- The context search shows highly relevant sections on exam planning.\n- All related terms are indexed offline in browser memory safely.\n- Real-world deployment on servers with real environment credentials will activate the Live Gemini processing for exhaustive multi-document cross reviews.`
    }, 200);
  }

  if (path.startsWith("/api/files/")) {
    const id = path.replace("/api/files/", "");
    if (init?.method === "DELETE") {
      const files = JSON.parse(localStorage.getItem("static_files") || "[]");
      const filtered = files.filter((f: any) => f.id !== id);
      localStorage.setItem("static_files", JSON.stringify(filtered));
      return createResponse({ success: true }, 200);
    }
  }

  // NOTE ENHANCEMENTS AI-TOOLS
  if (path === "/api/notes/ai-tools" && init?.method === "POST") {
    const body = JSON.parse(init.body as string);
    const taskType = body.taskType;
    const content = body.content || "";
    let refinedText = "";

    if (taskType === "summarize") {
      refinedText = `=== AI OFF-LINE SUMMARY ===\n\n📌 **Key Concepts**\n- Central thesis: structured learning routines optimize retention.\n- Spacings: Spaced repetition is highly advised.\n\n📖 **Detailed Outline**\n- Topic material overviewed: "${content.substring(0, 100)}..."`;
    } else if (taskType === "professionalize") {
      refinedText = `=== PROFESSIONAL ACADEMIC REWRITING ===\n\nThis refined study card structures original core elements for comprehensive review:\n\n"${content}"\n\n*Formulated for executive academic dossiers.*`;
    } else if (taskType === "study") {
      refinedText = `=== STRUCTURAL STUDY OUTLINE ===\n\n**1. Key Vocabularies & Core Terms**\n- System architecture basics.\n- Spaced repetition protocols.\n\n**2. Intellectual Comprehension Self-Quiz**\n- Q: What are the primary objectives of this study note?\n  *A: Consistent index formation with verified local structures.*`;
    } else {
      refinedText = `=== OFF-LINE CUSTOM REVISION ===\n\n${content}\n\n*Optimized offline.*`;
    }
    return createResponse({ refinedText }, 200);
  }

  // AI CONVERSATION & CHAT
  if (path === "/api/conversations") {
    const conversations = JSON.parse(localStorage.getItem("static_conversations") || "[]");
    return createResponse({ conversations }, 200);
  }

  if (path === "/api/chat/history" && init?.method === "DELETE") {
    const def = [
      {
        id: "c_onboarding",
        userId: "u_static",
        title: "Academic Onboarding Assistant",
        messages: [
          {
            id: "msg_init_1",
            sender: "agent",
            content: "Hello! Welcome to **PAI**, your Personal Research & Study AI Companion. I have successfully initialized your local offline workspace sandbox since we are operating in a static client host environment (like Netlify). All your planning records, notes, and goals are saved securely in your browser's local storage database.\n\nAsk me any study questions or outline an assignment task, and we will solve it together!",
            timestamp: new Date().toISOString(),
            toolsUsed: ["Static Sandbox Core"]
          }
        ],
        updatedAt: new Date().toISOString()
      }
    ];
    localStorage.setItem("static_conversations", JSON.stringify(def));
    return createResponse({ success: true, message: "Chat history wiped." }, 200);
  }

  if (path === "/api/chat" && init?.method === "POST") {
    const body = JSON.parse(init.body as string);
    const messageContent = body.messageContent;
    const conversationId = body.conversationId || "c_" + Math.random().toString(36).substring(2, 9);
    
    const conversations = JSON.parse(localStorage.getItem("static_conversations") || "[]");
    let targetConv = conversations.find((c: any) => c.id === conversationId);
    if (!targetConv) {
      targetConv = {
        id: conversationId,
        userId: "u_static",
        title: messageContent.substring(0, 30) + (messageContent.length > 30 ? "..." : ""),
        messages: [],
        updatedAt: new Date().toISOString()
      };
      conversations.push(targetConv);
    }
    
    // Add user msg
    const userMsg = {
      id: "msg_" + Math.random().toString(36).substring(2, 9),
      sender: "user",
      content: messageContent,
      timestamp: new Date().toISOString()
    };
    targetConv.messages.push(userMsg);
    
    // Reply engine
    let responseText = "";
    const lowContent = messageContent.toLowerCase();
    
    if (lowContent.includes("hello") || lowContent.includes("hi ") || lowContent.includes("hey")) {
      responseText = "Hi! Welcome, I hope you're having an active academic day. I am here to help you structure your assignments, prepare study guides, track goals, or run structured web research. What are we studying today?";
    } else if (lowContent.includes("task") || lowContent.includes("todo") || lowContent.includes("to-do")) {
      responseText = "Excellent planning choice! Let's get tasks sorted. I can help map this out as step-by-step tasks in your To-Do tracker so you stay focused. Would you like me to generate a sub-task checklist?";
    } else if (lowContent.includes("exam") || lowContent.includes("test") || lowContent.includes("quiz") || lowContent.includes("syllabus")) {
      responseText = "Understood. Exam preparation is about focused, structured revision and spaced recall of syllabus modules. Let's create a specialized timeline in the **Study Planner** card! Which specific subject paper is this for?";
    } else if (lowContent.includes("note") || lowContent.includes("summarize") || lowContent.includes("lecture")) {
      responseText = "Sure! Paste your text notes right here in our chat or create a Note document. I can summarize, extract technical keywords and definitions in a flash!";
    } else {
      responseText = `That looks like an interesting study query! Since we are operating in **Offline Sandbox Mode** (Vite build on a static CDN Host like Netlify, where there is no Node/Express server running), I am utilizing my local offline study engine to support you.

To activate the real-time **live Gemini AI**, web grounding, PDF analysis, and cloud database features, you simply need to host this repository's backend \`server.ts\` on a full-stack running platform (such as Render or Railway) and configure your GEMINI_API_KEY.

In the meantime, feel free to use the To-Do tracker, Study Planner, Note-taking and Milestones tools to keep your studies organized. What's next on our agenda?`;
    }
    
    const agentMsg = {
      id: "msg_" + Math.random().toString(36).substring(2, 9),
      sender: "agent",
      content: responseText,
      timestamp: new Date().toISOString(),
      toolsUsed: ["Static Sandbox Core", "Academic Mentorship Classifier"]
    };
    targetConv.messages.push(agentMsg);
    
    // Save to localStorage
    targetConv.updatedAt = new Date().toISOString();
    localStorage.setItem("static_conversations", JSON.stringify(conversations));
    
    return createResponse({
      reply: responseText,
      conversationId,
      toolsUsed: ["Static Sandbox Core", "Academic Mentorship Classifier"],
      allConversations: conversations
    }, 2501); // Quick simulate lag
  }

  // SPEECH SYSTEMS OR TTS fallback
  if (path === "/api/voice/tts") {
    const body = init?.body ? JSON.parse(init.body as string) : {};
    const text = body.text || "";
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (speechErr) {
        console.warn("Local TTS failed", speechErr);
      }
    }
    return createResponse({ audioBase64: null, failed: true }, 200);
  }

  // ANALYTICS & NOTIFICATIONS
  if (path === "/api/analytics") {
    const statsStr = localStorage.getItem("static_analytics");
    const stats = statsStr ? JSON.parse(statsStr) : {
      userId: "u_static",
      totalTokensUsed: 12500,
      apiCallsCount: 42,
      responseTimeMsAverage: 120,
      taskCompletionRate: 33,
      memoryEntriesCount: 2,
      lastActive: new Date().toISOString()
    };
    return createResponse({ stats }, 200);
  }

  if (path === "/api/notifications") {
    if (init?.method === "DELETE") {
      localStorage.setItem("static_notifications", JSON.stringify([]));
      return createResponse({ success: true }, 200);
    }
    const notifications = JSON.parse(localStorage.getItem("static_notifications") || "[]");
    return createResponse({ notifications }, 200);
  }

  if (path.startsWith("/api/notifications/")) {
    const id = path.split("/")[3];
    const notifications = JSON.parse(localStorage.getItem("static_notifications") || "[]");
    const idx = notifications.findIndex((n: any) => n.id === id);
    if (idx !== -1) {
      notifications[idx].read = true;
      localStorage.setItem("static_notifications", JSON.stringify(notifications));
      return createResponse({ success: true }, 200);
    }
  }

  return createResponse({ error: "Method or Path not implemented in Sandbox" }, 404);
}

// Automatically apply hook on document initialization
if (typeof window !== "undefined") {
  const originalFetch = window.fetch;
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === "string" ? input : (input as Request).url || "";
    
    const isMockTriggered = url.includes("/api/") && (
      isStaticAppHost || 
      localStorage.getItem("pai_force_sandbox") === "true"
    );

    if (isMockTriggered) {
      return handleMockRequest(url, init);
    }

    try {
      const response = await originalFetch(input, init);
      // If server returns HTML instead of JSON (which happens when static hosting (like Netlify) catch-all takes over the API path)
      if (url.includes("/api/") && response.headers.get("content-type")?.includes("text/html")) {
        console.warn("[PAI] API returned HTML instead of expected JSON. Activating dynamic local database Sandbox Mode.");
        localStorage.setItem("pai_force_sandbox", "true");
        return handleMockRequest(url, init);
      }
      return response;
    } catch (networkError) {
      if (url.includes("/api/")) {
        console.warn("[PAI] Failed to connect to server backend. Falling back to secure local database sandbox mode.", networkError);
        localStorage.setItem("pai_force_sandbox", "true");
        return handleMockRequest(url, init);
      }
      throw networkError;
    }
  };
}
