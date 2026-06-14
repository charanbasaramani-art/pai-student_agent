import { useState, useEffect } from "react";
import { User, Conversation, Task, Goal, Note, Memory, FileMeta, AppNotification, SystemAnalytics } from "./types";
import Sidebar from "./components/Sidebar";
import AuthPage from "./components/AuthPage";
import ChatPanel from "./components/ChatPanel";
import TaskTracker from "./components/TaskTracker";
import GoalTracker from "./components/GoalTracker";
import NotesManager from "./components/NotesManager";
import FileIntelligence from "./components/FileIntelligence";
import AnalyticsMonitor from "./components/AnalyticsMonitor";
import SettingsPanel from "./components/SettingsPanel";
import StudyPlanner from "./components/StudyPlanner";
import { 
  Sparkles, 
  Brain, 
  CheckSquare, 
  Target, 
  MessageSquare,
  Clock,
  LayoutDashboard,
  Loader2,
  Search,
  Trash2,
  Plus,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Check,
  Send,
  PlusCircle,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import brandLogo from "./assets/images/pai_expert_logo_1780840497065.png";

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("pai_jwt_token"));
  const [user, setUser] = useState<User | null>(null);

  // Theme Management System
  const [currentTheme, setCurrentTheme] = useState<"dark" | "light" | "system">(() => {
    const localTheme = localStorage.getItem("pai_theme");
    return (localTheme as "dark" | "light" | "system") || "dark";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    let appliedTheme: "light" | "dark" = "dark";

    if (currentTheme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      appliedTheme = mediaQuery.matches ? "dark" : "light";

      const listener = (e: MediaQueryListEvent) => {
        root.classList.remove("light", "dark");
        root.classList.add(e.matches ? "dark" : "light");
      };
      
      mediaQuery.addEventListener("change", listener);
      root.classList.add(appliedTheme);

      localStorage.setItem("pai_theme", "system");
      return () => mediaQuery.removeEventListener("change", listener);
    } else {
      appliedTheme = currentTheme;
      root.classList.add(appliedTheme);
      localStorage.setItem("pai_theme", currentTheme);
    }
  }, [currentTheme]);

  const handleToggleTheme = () => {
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    setCurrentTheme(nextTheme);
    if (user) {
      handleUpdatePreferences({ theme: nextTheme });
    }
  };
  
  // Platform States
  const [activeTab, setActiveTab] = useState("dashboard");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [files, setFiles] = useState<FileMeta[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [analytics, setAnalytics] = useState<SystemAnalytics | null>(null);
  
  const [chatLoading, setChatLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Unified Simple Dashboard States
  const [searchTerm, setSearchTerm] = useState("");
  const [chatInputText, setChatInputText] = useState("");
  const [voiceActive, setVoiceActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceWarningMsg, setVoiceWarningMsg] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Quick Task Add States
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState("Studies");
  const [newTaskPriority, setNewTaskPriority] = useState("MEDIUM");

  // Authenticate & Load state
  useEffect(() => {
    if (token) {
      fetchMasterData(token);
    } else {
      setInitialLoading(false);
    }
  }, [token]);

  const uploadBackups = async (activeToken: string) => {
    const backupHeaders = { 
      "Authorization": `Bearer ${activeToken}`,
      "Content-Type": "application/json"
    };

    try {
      // Restore Tasks
      const cachedTasksStr = localStorage.getItem("local_pai_tasks_backup");
      if (cachedTasksStr) {
        const cachedTasks = JSON.parse(cachedTasksStr);
        if (Array.isArray(cachedTasks) && cachedTasks.length > 0) {
          for (const task of cachedTasks) {
            await fetch("/api/tasks", {
              method: "POST",
              headers: backupHeaders,
              body: JSON.stringify({
                title: task.title,
                description: task.description || "",
                priority: task.priority || "MEDIUM",
                category: task.category || "General",
                dueDate: task.dueDate
              })
            }).catch(e => console.error("Restore task err", e));
          }
        }
      }

      // Restore Goals
      const cachedGoalsStr = localStorage.getItem("local_pai_goals_backup");
      if (cachedGoalsStr) {
        const cachedGoals = JSON.parse(cachedGoalsStr);
        if (Array.isArray(cachedGoals) && cachedGoals.length > 0) {
          for (const goal of cachedGoals) {
            await fetch("/api/goals", {
              method: "POST",
              headers: backupHeaders,
              body: JSON.stringify({
                title: goal.title,
                description: goal.description || "",
                type: goal.type || "SHORT_TERM",
                targetDate: goal.targetDate
              })
            }).catch(e => console.error("Restore goal err", e));
          }
        }
      }

      // Restore Notes
      const cachedNotesStr = localStorage.getItem("local_pai_notes_backup");
      if (cachedNotesStr) {
        const cachedNotes = JSON.parse(cachedNotesStr);
        if (Array.isArray(cachedNotes) && cachedNotes.length > 0) {
          for (const note of cachedNotes) {
            await fetch("/api/notes", {
              method: "POST",
              headers: backupHeaders,
              body: JSON.stringify({
                title: note.title,
                content: note.content || "",
                category: note.category || "General"
              })
            }).catch(e => console.error("Restore note err", e));
          }
        }
      }
    } catch (err) {
      console.error("Backup restoration failed", err);
    }
  };

  const fetchMasterData = async (activeToken: string) => {
    let headers = { 
      "Authorization": `Bearer ${activeToken}`,
      "Content-Type": "application/json"
    };

    try {
      let userRes = await fetch("/api/auth/me", { headers });

      if (!userRes.ok) {
        // Since the server DB is ephemeral and resets on scale-down/restarts,
        // let's check if we have a client-side backup of user credentials to automatically recover!
        const backupStr = localStorage.getItem("local_pai_credentials");
        if (backupStr) {
          try {
            const backup = JSON.parse(backupStr);
            if (backup && backup.email && backup.password) {
              // 1. Recover account registry behind the scenes
              const regRes = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: backup.email,
                  password: backup.password,
                  fullName: backup.fullName || "PAI Student"
                })
              });
              if (regRes.ok) {
                // 2. Perform fresh login
                const logRes = await fetch("/api/auth/login", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    email: backup.email,
                    password: backup.password
                  })
                });
                if (logRes.ok) {
                  const logData = await logRes.json();
                  localStorage.setItem("pai_jwt_token", logData.token);
                  setToken(logData.token);
                  
                  // Update active token and headers for downstream calls
                  activeToken = logData.token;
                  headers = {
                    "Authorization": `Bearer ${logData.token}`,
                    "Content-Type": "application/json"
                  };
                  
                  // Restore other backed up data points
                  await uploadBackups(logData.token);
                  
                  // Retry user verification with the new token
                  userRes = await fetch("/api/auth/me", { headers });
                }
              }
            }
          } catch (recoveryErr) {
            console.error("PAI core user recovery session failed", recoveryErr);
          }
        }
      }

      const needsRestore = localStorage.getItem("local_pai_needs_restore") === "true";
      if (needsRestore) {
        localStorage.removeItem("local_pai_needs_restore");
        try {
          await uploadBackups(activeToken);
        } catch (e) {
          console.error("Failed to auto-restore backups on login:", e);
        }
      }

      const [
        tasksRes,
        goalsRes,
        notesRes,
        memoriesRes,
        filesRes,
        notifRes,
        analyticsRes,
        convRes
      ] = await Promise.all([
        fetch("/api/tasks", { headers }),
        fetch("/api/goals", { headers }),
        fetch("/api/notes", { headers }),
        fetch("/api/memories", { headers }),
        fetch("/api/files", { headers }),
        fetch("/api/notifications", { headers }),
        fetch("/api/analytics", { headers }),
        fetch("/api/conversations", { headers })
      ]);

      if (userRes.ok) {
        const u = await userRes.json();
        setUser(u.user);
        if (u.user && u.user.preferences) {
          if (u.user.preferences.theme) {
            setCurrentTheme(u.user.preferences.theme);
          }
          if (u.user.preferences.speechEnabled !== undefined) {
            setSoundEnabled(u.user.preferences.speechEnabled);
          }
        }
      } else {
        // Token expired or invalid
        handleLogout();
        return;
      }

      if (tasksRes.ok) {
        const t = await tasksRes.json();
        setTasks(t.tasks);
        if (t.tasks && t.tasks.length > 0) {
          localStorage.setItem("local_pai_tasks_backup", JSON.stringify(t.tasks));
        }
      }
      if (goalsRes.ok) {
        const g = await goalsRes.json();
        setGoals(g.goals);
        if (g.goals && g.goals.length > 0) {
          localStorage.setItem("local_pai_goals_backup", JSON.stringify(g.goals));
        }
      }
      if (notesRes.ok) {
        const n = await notesRes.json();
        setNotes(n.notes);
        if (n.notes && n.notes.length > 0) {
          localStorage.setItem("local_pai_notes_backup", JSON.stringify(n.notes));
        }
      }
      if (memoriesRes.ok) {
        const m = await memoriesRes.json();
        setMemories(m.memories);
      }
      if (filesRes.ok) {
        const f = await filesRes.json();
        setFiles(f.files);
      }
      if (notifRes.ok) {
        const n = await notifRes.json();
        setNotifications(n.notifications);
      }
      if (analyticsRes.ok) {
        const a = await analyticsRes.json();
        setAnalytics(a.stats);
      }
      if (convRes.ok) {
        const c = await convRes.json();
        setConversations(c.conversations);
        if (c.conversations.length > 0) {
          // Default to latest
          setActiveConvId(c.conversations[0].id);
        }
      }
    } catch (e) {
      console.error("Master synchronized load failure:", e);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleAuthSuccess = (newToken: string) => {
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem("pai_jwt_token");
    localStorage.removeItem("local_pai_credentials");
    localStorage.removeItem("local_pai_tasks_backup");
    localStorage.removeItem("local_pai_goals_backup");
    localStorage.removeItem("local_pai_notes_backup");
    setToken(null);
    setUser(null);
    setConversations([]);
    setActiveConvId(null);
    setTasks([]);
    setGoals([]);
    setNotes([]);
    setMemories([]);
    setFiles([]);
    setNotifications([]);
    setAnalytics(null);
    setActiveTab("dashboard");
  };

  // ==================================================
  // SHARED MUTATION HANDLERS
  // ==================================================

  const headers = { 
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  };

  // Preference updates
  const handleUpdatePreferences = async (prefs: Partial<User["preferences"]>) => {
    const res = await fetch("/api/auth/preferences", {
      method: "PATCH",
      headers,
      body: JSON.stringify(prefs)
    });
    const data = await res.json();
    if (res.ok && data.user) {
      setUser(data.user);
      if (prefs.theme) {
        setCurrentTheme(prefs.theme as any);
        localStorage.setItem("pai_theme", prefs.theme);
      }
      if (prefs.speechEnabled !== undefined) {
        setSoundEnabled(prefs.speechEnabled);
      }
    }
  };

  // Conversational AI messaging flow
  const handleChatSendMessage = async (text: string, researchMode: boolean, thinkingMode: boolean = false) => {
    setChatLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          messageContent: text,
          conversationId: activeConvId || undefined,
          checkResearchMode: researchMode,
          thinkingMode: thinkingMode
        })
      });
      const data = await res.json();

      if (res.ok && data.reply) {
        setConversations(data.allConversations);
        setActiveConvId(data.conversationId);
        
        // Re-sync memories, task additions and notification indices that might have auto-completed server-side
        triggerMetricsSync();
      } else {
        alert(data.error || "Conversational engine failure.");
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setChatLoading(false);
    }
  };

  const triggerMetricsSync = async () => {
    if (!token) return;
    try {
      const [m, t, g, n, a] = await Promise.all([
        fetch("/api/memories", { headers }),
        fetch("/api/tasks", { headers }),
        fetch("/api/goals", { headers }),
        fetch("/api/notifications", { headers }),
        fetch("/api/analytics", { headers })
      ]);
      if (m.ok) setMemories((await m.json()).memories);
      if (t.ok) {
        const tasksData = (await t.json()).tasks;
        setTasks(tasksData);
        if (tasksData && tasksData.length > 0) {
          localStorage.setItem("local_pai_tasks_backup", JSON.stringify(tasksData));
        }
      }
      if (g.ok) {
        const goalsData = (await g.json()).goals;
        setGoals(goalsData);
        if (goalsData && goalsData.length > 0) {
          localStorage.setItem("local_pai_goals_backup", JSON.stringify(goalsData));
        }
      }
      if (n.ok) setNotifications((await n.json()).notifications);
      if (a.ok) setAnalytics((await a.json()).stats);
    } catch (e) {
      console.warn("Soft re-sync metrics skipped safely.", e);
    }
  };

  // Notes
  const handleCreateNote = async (note: { title: string; content: string; category: string }) => {
    const res = await fetch("/api/notes", {
      method: "POST",
      headers,
      body: JSON.stringify(note)
    });
    const data = await res.json();
    if (res.ok && data.note) {
      setNotes(prev => {
        const updated = [...prev, data.note];
        localStorage.setItem("local_pai_notes_backup", JSON.stringify(updated));
        return updated;
      });
    }
  };

  const handleUpdateNote = async (id: string, updates: Partial<Note>) => {
    const res = await fetch(`/api/notes/${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (res.ok && data.note) {
      setNotes(prev => {
        const updated = prev.map(n => n.id === id ? data.note : n);
        localStorage.setItem("local_pai_notes_backup", JSON.stringify(updated));
        return updated;
      });
    }
  };

  const handleDeleteNote = async (id: string) => {
    const res = await fetch(`/api/notes/${id}`, { method: "DELETE", headers });
    if (res.ok) {
      setNotes(prev => {
        const updated = prev.filter(n => n.id !== id);
        localStorage.setItem("local_pai_notes_backup", JSON.stringify(updated));
        return updated;
      });
    }
  };

  // Tasks
  const handleCreateTask = async (task: { title: string; description: string; priority: any; category: string; dueDate?: string }) => {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers,
      body: JSON.stringify(task)
    });
    const data = await res.json();
    if (res.ok && data.task) {
      setTasks(prev => {
        const updated = [...prev, data.task];
        localStorage.setItem("local_pai_tasks_backup", JSON.stringify(updated));
        return updated;
      });
      triggerMetricsSync();
    }
  };

  const handleUpdateTask = async (id: string, updates: Partial<Task>) => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (res.ok && data.task) {
      setTasks(prev => {
        const updated = prev.map(t => t.id === id ? data.task : t);
        localStorage.setItem("local_pai_tasks_backup", JSON.stringify(updated));
        return updated;
      });
      triggerMetricsSync();
    }
  };

  const handleDeleteTask = async (id: string) => {
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE", headers });
    if (res.ok) {
      setTasks(prev => {
        const updated = prev.filter(t => t.id !== id);
        localStorage.setItem("local_pai_tasks_backup", JSON.stringify(updated));
        return updated;
      });
      triggerMetricsSync();
    }
  };

  // Goals
  const handleCreateGoal = async (goal: { title: string; description: string; targetDate?: string; type: any }) => {
    const res = await fetch("/api/goals", {
      method: "POST",
      headers,
      body: JSON.stringify(goal)
    });
    const data = await res.json();
    if (res.ok && data.goal) {
      setGoals(prev => {
        const updated = [...prev, data.goal];
        localStorage.setItem("local_pai_goals_backup", JSON.stringify(updated));
        return updated;
      });
    }
  };

  const handleUpdateGoal = async (id: string, updates: Partial<Goal>) => {
    const res = await fetch(`/api/goals/${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (res.ok && data.goal) {
      setGoals(prev => {
        const updated = prev.map(g => g.id === id ? data.goal : g);
        localStorage.setItem("local_pai_goals_backup", JSON.stringify(updated));
        return updated;
      });
    }
  };

  const handleDeleteGoal = async (id: string) => {
    const res = await fetch(`/api/goals/${id}`, { method: "DELETE", headers });
    if (res.ok) {
      setGoals(prev => {
        const updated = prev.filter(g => g.id !== id);
        localStorage.setItem("local_pai_goals_backup", JSON.stringify(updated));
        return updated;
      });
    }
  };

  // Memories
  const handleAddMemory = async (content: string, category: any) => {
    const res = await fetch("/api/memories", {
      method: "POST",
      headers,
      body: JSON.stringify({ content, category })
    });
    const data = await res.json();
    if (res.ok && data.memory) {
      setMemories(prev => [...prev, data.memory]);
      triggerMetricsSync();
    }
  };

  const handleDeleteMemory = async (id: string) => {
    const res = await fetch(`/api/memories/${id}`, { method: "DELETE", headers });
    if (res.ok) {
      setMemories(prev => prev.filter(m => m.id !== id));
      triggerMetricsSync();
    }
  };

  // File Uploads
  const handleUploadFile = async (name: string, size: number, mimeType: string, base64Data: string) => {
    const res = await fetch("/api/files/upload", {
      method: "POST",
      headers,
      body: JSON.stringify({ name, size, mimeType, base64Data })
    });
    const data = await res.json();
    if (res.ok && data.file) {
      setFiles(prev => [...prev, data.file]);
      triggerMetricsSync();
    } else {
      throw new Error(data.error || "File base64 digest failure.");
    }
  };

  const handleDeleteFile = async (id: string) => {
    const res = await fetch(`/api/files/${id}`, { method: "DELETE", headers });
    if (res.ok) {
      setFiles(prev => prev.filter(f => f.id !== id));
    }
  };

  // Notifications Toggle Reads
  const handleMarkNotifRead = async (id: string) => {
    const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH", headers });
    if (res.ok) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }
  };

  const handleClearNotifications = async () => {
    const res = await fetch("/api/notifications", { method: "DELETE", headers });
    if (res.ok) {
      setNotifications([]);
    }
  };

  const handleStartNewConversation = () => {
    setActiveConvId("c_" + Math.random().toString(36).substring(2, 9));
  };

  const handleWipeChatHistory = async () => {
    const res = await fetch("/api/chat/history", { method: "DELETE", headers });
    if (res.ok) {
      setConversations([]);
      setActiveConvId(null);
    }
  };

  // ==================================================
  // VOICE COMMANDS SPEECH UTILITIES (TTS & STT)
  // ==================================================

  const speakText = (text: string) => {
    if (!window.speechSynthesis || !soundEnabled) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#`_\-]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText.substring(0, 500));
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    // Load active voice parameters from Local Storage with server-synced backfalls
    const savedType = localStorage.getItem("pai_voice_type") || user?.preferences?.voiceType || "system";
    const savedSelectedName = localStorage.getItem("pai_voice_selected") || user?.preferences?.voiceSelected || "";
    const savedRate = localStorage.getItem("pai_voice_rate") ? parseFloat(localStorage.getItem("pai_voice_rate")!) : (user?.preferences?.voiceRate ?? 1.0);
    const savedPitch = localStorage.getItem("pai_voice_pitch") ? parseFloat(localStorage.getItem("pai_voice_pitch")!) : (user?.preferences?.voicePitch ?? 1.0);
    const savedVolume = localStorage.getItem("pai_voice_volume") ? parseFloat(localStorage.getItem("pai_voice_volume")!) : (user?.preferences?.voiceVolume ?? 1.0);

    utterance.rate = savedRate;
    utterance.pitch = savedPitch;
    utterance.volume = savedVolume;

    const voices = window.speechSynthesis.getVoices();
    let matchedVoice: SpeechSynthesisVoice | undefined;

    const getVoiceGender = (v: SpeechSynthesisVoice): "male" | "female" | "system" => {
      const name = v.name.toLowerCase();
      const femaleKeywords = [
        "female", "woman", "girl", "zira", "hazel", "karen", "samantha", "moira", "tessa", 
        "veena", "me-me", "alice", "melina", "kyoko", "sin-ji", "ting-ting", "mei-jia", 
        "kore", "amelia", "fiona", "sara", "anna", "zoya", "victoria", "mariska", "heather", 
        "katherine", "joana", "laura", "ms", "nora", "carla", "celeste", "clara", "elena", 
        "helena", "isabella", "lisa", "nadia", "olivia", "paula", "sophia", "valeria", "yasmine"
      ];
      const maleKeywords = [
        "male", "man", "guy", "david", "george", "james", "mark", "richard", "puck", 
        "charon", "fenrir", "zephyr", "daniel", "ravi", "alex", "fred", "thomas", "oliver", "rishi"
      ];
      
      if (femaleKeywords.some(kw => name.includes(kw))) return "female";
      if (maleKeywords.some(kw => name.includes(kw))) return "male";
      return "system";
    };

    // First try exact name match
    if (savedSelectedName) {
      matchedVoice = voices.find(v => v.name === savedSelectedName);
    }

    // Try gender type match if exact name wasn't matched or wasn't specified
    if (!matchedVoice && savedType !== "system") {
      const candidates = voices.filter(v => getVoiceGender(v) === savedType);
      if (candidates.length > 0) {
        matchedVoice = candidates[0];
      }
    }

    // Bug Fix #2: Alert user and trigger nearest fallback if the specified voice or gender is not found on device
    if (savedType === "female" && (!matchedVoice || getVoiceGender(matchedVoice) !== "female")) {
      const anyFemaleVoice = voices.find(v => getVoiceGender(v) === "female");
      if (anyFemaleVoice) {
        matchedVoice = anyFemaleVoice;
      } else {
        setVoiceWarningMsg("Selected voice unavailable. Using closest available voice.");
        setTimeout(() => setVoiceWarningMsg(null), 4000);
      }
    } else if (savedType === "male" && (!matchedVoice || getVoiceGender(matchedVoice) !== "male")) {
      const anyMaleVoice = voices.find(v => getVoiceGender(v) === "male");
      if (anyMaleVoice) {
        matchedVoice = anyMaleVoice;
      } else {
        setVoiceWarningMsg("Selected voice unavailable. Using closest available voice.");
        setTimeout(() => setVoiceWarningMsg(null), 4000);
      }
    }

    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    window.speechSynthesis.speak(utterance);
  };

  const parseAndExecuteVoiceCommand = (command: string): boolean => {
    const text = command.trim().toLowerCase();
    
    // 1. "Add task Complete Java Assignment"
    if (text.startsWith("add task ")) {
      const taskTitle = command.substring(9).trim();
      if (taskTitle) {
        handleCreateTask({
          title: taskTitle,
          description: "Created via voice command.",
          priority: "HIGH" as any,
          category: "Studies",
          dueDate: new Date().toISOString().substring(0, 10)
        });
        speakText(`Successfully added study task: ${taskTitle}`);
        return true;
      }
    }
    
    // 2. "Show my pending tasks" or "Show pending tasks"
    if (text.includes("show my pending tasks") || text.includes("show pending tasks") || text.includes("show my tasks")) {
      setActiveTab("tasks");
      speakText("Switching to your To-Do Manager to review pending tasks.");
      return true;
    }
    
    // 3. "Mark DBMS task completed" or "Mark ... completed"
    if (text.startsWith("mark ") && (text.endsWith(" task completed") || text.endsWith(" completed") || text.endsWith(" as completed"))) {
      let query = text.substring(5);
      if (query.endsWith(" task completed")) {
        query = query.substring(0, query.length - 15);
      } else if (query.endsWith(" completed")) {
        query = query.substring(0, query.length - 10);
      } else if (query.endsWith(" as completed")) {
        query = query.substring(0, query.length - 13);
      }
      query = query.trim();
      
      const matchedTask = tasks.find(t => t.title.toLowerCase().includes(query) && t.status !== "COMPLETED");
      if (matchedTask) {
        handleUpdateTask(matchedTask.id, { status: "COMPLETED" as any });
        speakText(`Excellent study milestone! Marked task ${matchedTask.title} as completed.`);
      } else {
        speakText(`I couldn't find an active task matching ${query}.`);
      }
      return true;
    }
    
    // 4. "Create a study plan for tomorrow"
    if (text.includes("create a study plan for tomorrow") || text.includes("create study plan")) {
      setActiveTab("chat");
      handleChatSendMessage("Create a comprehensive study plan for tomorrow with a step-by-step checklist based on my exam prep goals.", false);
      speakText("Creating your customized study plan for tomorrow in the AI Study Assistant.");
      return true;
    }
    
    // 5. "Summarize this document"
    if (text.includes("summarize this document") || text.includes("summarize document") || text.includes("summarize my document")) {
      if (files.length > 0) {
        setActiveTab("files");
        speakText("Navigating to your Document Space to analyze the selected document.");
      } else {
        speakText("You haven't uploaded any documents yet. Please drag and drop a study material first.");
      }
      return true;
    }
    
    // 6. "Explain Machine Learning" or "Explain ..."
    if (text.startsWith("explain ")) {
      const topic = command.substring(8).trim();
      setActiveTab("chat");
      handleChatSendMessage(`Explain ${topic} simply in an educational mentor style, breaking down key components and practical academic examples.`, false);
      speakText(`Understood. Explaining the concept of ${topic} in the Study Assistant.`);
      return true;
    }
    
    return false;
  };

  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice command Speech Recognition is not supported by this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = "en-US";
    recognition.interimResults = false;

    recognition.onstart = () => {
      setVoiceActive(true);
    };

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      const parsedCmd = parseAndExecuteVoiceCommand(text);
      if (!parsedCmd) {
        setChatInputText(text);
        handleSendMessageWithVoice(text);
      }
    };

    recognition.onerror = () => {
      setVoiceActive(false);
    };

    recognition.onend = () => {
      setVoiceActive(false);
    };

    recognition.start();
  };

  // Conversational AI messaging flow custom wrapper with vocal outputs
  const handleSendMessageWithVoice = async (text: string) => {
    const isCmd = parseAndExecuteVoiceCommand(text);
    if (isCmd) return;

    setChatLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          messageContent: text,
          conversationId: activeConvId || undefined,
          checkResearchMode: false
        })
      });
      const data = await res.json();

      if (res.ok && data.reply) {
        setConversations(data.allConversations);
        setActiveConvId(data.conversationId);
        
        // vocalize reply if speechEnabled is explicitly active in preferences
        if (user?.preferences?.speechEnabled) {
          speakText(data.reply);
        }
        
        triggerMetricsSync();
      } else {
        alert(data.error || "Conversational engine failure.");
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setChatLoading(false);
    }
  };

  // ==================================================
  // INTEGRATED COCKPIT RENDERER
  // ==================================================

  const renderActiveTab = () => {
    switch (activeTab) {
      case "chat":
        return (
          <ChatPanel 
            user={user}
            conversations={conversations}
            activeConversationId={activeConvId}
            onSendMessage={handleChatSendMessage}
            onClearHistory={handleWipeChatHistory}
            loading={chatLoading}
            onSelectConversation={setActiveConvId}
            onStartNewConversation={handleStartNewConversation}
          />
        );
      case "tasks":
        return (
          <TaskTracker 
            tasks={tasks}
            onCreateTask={handleCreateTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
          />
        );
      case "files":
        return (
          <FileIntelligence 
            files={files}
            onUploadFile={handleUploadFile}
            onDeleteFile={handleDeleteFile}
          />
        );
      case "study_planner":
        return (
          <StudyPlanner 
            onAddTask={(title, priority, dueDate) => handleCreateTask({
              title,
              description: "AI Generated Study Checklist Item",
              priority,
              category: "STUDY",
              dueDate
            })}
            token={token}
          />
        );
      case "settings":
        return (
          <SettingsPanel 
            user={user}
            onUpdatePreferences={handleUpdatePreferences}
            onClearHistory={handleWipeChatHistory}
          />
        );
      case "dashboard":
      default:
        return renderDashboardCockpit();
    }
  };

  const renderDashboardCockpit = () => {
    const activeConv = conversations.find(c => c.id === activeConvId);
    const messages = activeConv ? activeConv.messages : [];

    const queueTasks = tasks.filter(t => t.status !== "COMPLETED");
    const completedTasks = tasks.filter(t => t.status === "COMPLETED");
    const completionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

    return (
      <div className="flex-1 p-6 md:p-8 overflow-y-auto h-screen bg-transparent relative z-10 animate-fade-in">
        <div className="max-w-6xl mx-auto flex flex-col gap-8">
          
          {/* Welcome Display Header inside a sleek Glass card */}
          <div className="welcome-header bg-gradient-to-r from-slate-900 via-[#0D1117] to-slate-900 border border-slate-800/60 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-32 bg-indigo-500/5 blur-3xl pointer-events-none rounded-full" />
            <div className="z-10">
              <span className="text-[10px] font-mono tracking-widest text-indigo-400 font-bold uppercase block mb-1">
                STUDENT RESEARCH & STUDY SYSTEM
              </span>
              <h1 className="font-display font-medium text-2xl text-white flex items-center gap-2 select-none">
                Welcome back, {user?.fullName || "Scholar"} <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
              </h1>
              <p className="text-xs text-slate-400 font-sans mt-1 max-w-xl">
                Your lightweight academic assistant is synced. Prepare for exams, structure lecture notes, or run grounded Web research instantly.
              </p>
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0 bg-[#0A0C10]/60 p-3 rounded-xl border border-slate-850 z-10 font-mono text-[10px] text-slate-300">
              <div className="flex items-center gap-1.5 font-bold text-indigo-300">
                <Clock className="w-3.5 h-3.5 text-indigo-405 animate-spin" style={{ animationDuration: '6s' }} />
                <span>UTC RECORD: {new Date().toISOString().substring(11, 16)}</span>
              </div>
              <span className="text-slate-500 text-[9px] mt-0.5">STATUS ACTIVE • LOCAL SYNCED</span>
            </div>
          </div>

          {/* Static Sandbox Notification Banner */}
          {localStorage.getItem("pai_force_sandbox") === "true" && (
            <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-2xl p-4 flex items-center gap-3.5 animate-fade-in text-indigo-200 text-xs shadow-lg shadow-indigo-950/10">
              <span className="flex h-2.5 w-2.5 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-400"></span>
              </span>
              <div className="flex-1 select-none leading-relaxed text-slate-300">
                <strong className="text-indigo-300">HYBRID PLAYGROUND SANDBOX DETECTED:</strong> Running on a static host (Netlify). PAI has automatically fallback-synchronized a fast client-side browser database so all features (Planner, Note-taking, To-Do track) are 100% active. To unlock persistent Cloud Firestore sync, real-time voice commands, and live Gemini AI web-grounding, simply deploy PAI's backend Express server (<code className="font-mono text-[11px] bg-slate-900 px-1 py-0.5 rounded text-indigo-300 border border-slate-800">server.ts</code>) to a full-stack container host (Railway, Render, or Cloud Run).
              </div>
            </div>
          )}

          {/* Productivity progress bar & key metrics bento block */}
          <div className="bg-[#0D1117]/70 backdrop-blur-md border border-slate-800/80 p-6 rounded-2xl shadow-xl select-none flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center font-mono text-sm font-bold text-indigo-400 shrink-0">
                {completionRate}%
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">Today's Academic Goals</span>
                <h4 className="text-sm font-semibold text-slate-200">
                  {completedTasks.length} of {tasks.length} tasks completed
                </h4>
              </div>
            </div>

            <div className="w-full sm:w-1/2 flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 font-bold">
                <span>PROGRESS INTEGRATION</span>
                <span>{completionRate}%</span>
              </div>
              <div className="w-full bg-[#0A0C10] h-2 rounded-full overflow-hidden border border-slate-800/40">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
          </div>          {/* Quick Study Action keys bar with elevated hover animations */}
          <div className="flex flex-col gap-2 select-none">
            <span className="text-[10px] font-mono tracking-widest text-slate-400 font-bold uppercase">
              QUICK ACADEMIC ACTIONS
            </span>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {[
                { label: "Create Study Plan", icon: Target, desc: "🧠 Schedul Exam prep", action: () => setActiveTab("study_planner") },
                { label: "Summarize PDF", icon: Sparkles, desc: "📄 Documents Center", action: () => setActiveTab("files") },
                { 
                  label: "Generate Notes", 
                  icon: MessageSquare, 
                  desc: "📝 Quick study notes", 
                  action: () => {
                    setActiveTab("chat");
                    handleChatSendMessage("Generate extensive, well-structured lecture notes with key terms, formulas, and mock questions for an academic module.", false);
                  } 
                },
                { 
                  label: "Start Research", 
                  icon: Brain, 
                  desc: "🔬 Grounded research", 
                  action: () => {
                    setActiveTab("chat");
                    handleChatSendMessage("Let's begin focused scholarly research on educational technologies. Search the web for current peer-reviewed topics.", true);
                  } 
                },
                { 
                  label: "Voice Mode", 
                  icon: Mic, 
                  desc: "🎤 Voice-based learning", 
                  action: () => {
                    speakText("Voice mode listening. Ask me to explain computer science concepts.");
                    startSpeechRecognition();
                  } 
                },
                { label: "Add Task", icon: CheckSquare, desc: "✅ Task manager schedule", action: () => setActiveTab("tasks") }
              ].map((act, i) => (
                <motion.button
                  key={i}
                  onClick={act.action}
                  whileHover={{ y: -3, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-[#0D1117] border border-slate-850/80 p-3.5 rounded-xl hover:bg-slate-900/60 transition-all text-left flex flex-col justify-between h-24 shadow-sm hover:shadow-lg hover:shadow-indigo-500/5 group cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-200">
                    <act.icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-white block mt-2 truncate font-sans">
                      {act.label}
                    </span>
                    <span className="text-[9px] text-slate-550 block truncate font-sans">
                      {act.desc}
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Unified Central Custom Prompt / Search Bar */}
          <div className="relative flex items-center bg-[#0D1117] border border-slate-850 rounded-xl px-4 py-3 shadow-md gap-3 focus-within:border-indigo-500/60 transition-all duration-200 select-none">
            <Search className="w-5 h-5 text-indigo-400 shrink-0" />
            <input 
              type="text"
              placeholder="Prompt study topics (e.g. explain machine learning) or search local checklists here..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchTerm.trim() !== "") {
                  handleSendMessageWithVoice(searchTerm);
                  setSearchTerm("");
                }
              }}
              className="bg-transparent text-xs w-full outline-none text-white placeholder-slate-500 font-sans"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="text-[10px] text-slate-500 hover:text-white mr-1 cursor-pointer font-mono">
                Clear
              </button>
            )}
            <button 
              disabled={!searchTerm.trim() || chatLoading}
              onClick={() => {
                if (searchTerm.trim() !== "") {
                  handleSendMessageWithVoice(searchTerm);
                  setSearchTerm("");
                }
              }}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer shrink-0 transition-all shadow-md active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
            >
              Ask PAI
            </button>
          </div>

          {/* Split Bento Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            
            {/* Bento Card Left Side: Studious Mentor Assistant */}
            <div className="flex flex-col gap-4 bg-[#0D1117]/70 backdrop-blur-md rounded-2xl border border-slate-800/80 p-6 shadow-xl h-[580px] hover:border-slate-700/60 transition-all duration-300">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 select-none">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">Study Companion Assistant</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={handleStartNewConversation}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 px-2 py-1 rounded bg-indigo-500/5 cursor-pointer font-mono font-medium transition-colors"
                  >
                    + New Room
                  </button>
                  <button 
                    onClick={handleWipeChatHistory}
                    className="text-[10px] text-rose-400 hover:text-rose-300 border border-rose-500/10 px-2 py-1 rounded bg-rose-500/5 cursor-pointer font-mono font-medium transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Chat Stream message feed */}
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 min-h-0 select-text">
                {messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3 select-none">
                    <div className="w-11 h-11 bg-indigo-600/10 border border-indigo-500/15 rounded-full flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-200 font-sans">PAI Academic Mentor Mode</h4>
                      <p className="text-slate-500 text-[11px] mt-1 font-sans max-w-sm mx-auto leading-relaxed">
                        I specialize in clarifying computer science definitions, planning exam preparations, or reviewing notes. Just ask or dictation!
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 justify-center mt-2 max-w-md">
                      {[
                        "Explain Machine Learning",
                        "Create a study plan for tomorrow",
                        "Show my pending tasks",
                        "Give key study productivity tips"
                      ].map((chip) => (
                        <button
                          key={chip}
                          onClick={() => handleSendMessageWithVoice(chip)}
                          className="px-2.5 py-1 bg-[#0A0C10] hover:bg-indigo-600/15 border border-slate-800 rounded-full text-[10px] text-slate-400 hover:text-indigo-300 cursor-pointer font-sans transition-all"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isUser = m.sender === "user";
                    return (
                      <div 
                        key={m.id} 
                        className={`flex flex-col max-w-[85%] ${isUser ? "self-end items-end" : "self-start items-start"}`}
                      >
                        <div 
                          className={`p-3 rounded-xl text-xs leading-relaxed font-sans ${
                            isUser 
                              ? "bg-indigo-600 text-white rounded-br-none shadow shadow-indigo-600/10" 
                              : "bg-[#0A0C10] text-slate-200 border border-slate-800/80 rounded-bl-none shadow shadow-black/25"
                          }`}
                        >
                          {m.content}
                        </div>
                        <span className="text-[9px] text-slate-500 font-mono mt-1 px-1">
                          {isUser ? "Scholar" : "Mentor"} • {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
                
                {chatLoading && (
                  <div className="self-start flex items-center gap-2 max-w-[85%] bg-[#0A0C10] border border-slate-800/80 p-3 rounded-xl rounded-bl-none">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400 shrink-0" />
                    <span className="text-[10px] text-slate-400 font-mono">Formulating study explanations...</span>
                  </div>
                )}
              </div>

              {/* Past histories index */}
              {conversations.length > 1 && (
                <div className="border-t border-slate-800/60 pt-2 flex items-center gap-2 overflow-x-auto select-none bg-[#0A0C10]/40 p-2 rounded-lg py-1.5 scrollbar-thin shrink-0">
                  <span className="text-[9px] font-mono text-slate-500 uppercase shrink-0 font-bold">Past Rooms:</span>
                  {conversations.slice(0, 4).map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setActiveConvId(conv.id)}
                      className={`px-2 py-1 rounded text-[10px] font-mono truncate max-w-28 cursor-pointer border transition-all shrink-0 ${
                        activeConvId === conv.id 
                          ? "bg-indigo-600/10 border-indigo-500/30 text-indigo-300"
                          : "bg-[#0D1117] border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-300"
                      }`}
                    >
                      {conv.title || "Study Session"}
                    </button>
                  ))}
                </div>
              )}

              {/* Voice triggers footer panel */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!chatInputText.trim() || chatLoading) return;
                  const currentText = chatInputText;
                  setChatInputText("");
                  handleSendMessageWithVoice(currentText);
                }}
                className="flex items-center gap-2 mt-2 border-t border-slate-855 pt-2 shrink-0 select-none"
              >
                <button
                  type="button"
                  onClick={startSpeechRecognition}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                    voiceActive 
                      ? "bg-rose-600/20 border-rose-500/40 text-rose-400 animate-pulse" 
                      : "bg-[#0A0C10] border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-300"
                  }`}
                  title="Speech-to-Text Voice Command Mode"
                >
                  {voiceActive ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                    soundEnabled 
                      ? "bg-indigo-600/10 border-indigo-500/20 text-indigo-400" 
                      : "bg-[#0A0C10] border-slate-800 text-slate-500"
                  }`}
                  title={soundEnabled ? "Speech Output Enabled" : "Speech Muted"}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>

                <input
                  type="text"
                  placeholder="Ask study companion or try voice commands..."
                  value={chatInputText}
                  onChange={(e) => setChatInputText(e.target.value)}
                  className="flex-1 bg-[#0A0C10] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500/60 font-sans"
                />

                <button
                  type="submit"
                  disabled={!chatInputText.trim() || chatLoading}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-550 text-white rounded-xl transition-all cursor-pointer shadow-lg text-xs font-semibold disabled:opacity-40 disabled:pointer-events-none active:scale-95 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

            </div>

            {/* Bento Card Right Side: To-Do Trackers (Pending queue & completed list) */}
            <div className="flex flex-col gap-4 bg-[#0D1117]/70 backdrop-blur-md rounded-2xl border border-slate-800/80 p-6 shadow-xl h-[580px] hover:border-slate-700/60 transition-all duration-300">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 select-none">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                  Academic Task Checklist
                </span>
                <span className="text-[10px] font-mono text-indigo-400 font-bold bg-indigo-500/5 border border-indigo-500/20 px-2 py-0.5 rounded">
                  Queue: {queueTasks.length} Pending
                </span>
              </div>

              {/* Task Add Mini-form */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newTaskTitle.trim()) return;
                  handleCreateTask({
                    title: newTaskTitle,
                    description: "Created via quick task launcher.",
                    priority: newTaskPriority as any,
                    category: newTaskCategory || "Studies",
                    dueDate: new Date().toISOString().substring(0, 10)
                  });
                  setNewTaskTitle("");
                }}
                className="flex items-center gap-2 bg-[#0A0C10] p-1.5 rounded-xl border border-slate-800 shrink-0"
              >
                <input 
                  type="text"
                  placeholder="Quick add (e.g. Revise Computer Networks)"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="bg-transparent text-xs text-white placeholder-slate-500 outline-none w-full pl-2.5 font-sans"
                />
                <button 
                  type="submit"
                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-550 text-white text-[10px] font-mono font-semibold rounded-lg cursor-pointer transition-colors shrink-0"
                >
                  + Add
                </button>
              </form>

              {/* Divided checklists: Task queue & Task Completed */}
              <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
                
                {/* 1. Today's Pending Queue (Task List) */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10.5px] font-mono font-bold text-slate-400 uppercase flex items-center gap-1.5 select-none">
                    <CheckSquare className="w-3.5 h-3.5 text-amber-400 shrink-0" /> Pending Queue ({queueTasks.length})
                  </span>

                  <div className="flex flex-col gap-1.5 select-none">
                    {queueTasks.length === 0 ? (
                      <div className="text-center py-6 bg-[#0A0C10]/50 border border-slate-850 rounded-xl text-slate-500 text-[10px] font-mono">
                        {searchTerm ? "No pending matching keys." : "No pending academic tasks! Nice work."}
                      </div>
                    ) : (
                      queueTasks.map(t => (
                        <div 
                          key={t.id}
                          className="bg-[#0A0C10] border border-slate-850 p-2.5 rounded-xl flex items-center justify-between gap-3 text-xs shadow-sm hover:border-slate-800 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <button 
                              onClick={() => handleUpdateTask(t.id, { status: "COMPLETED" as any })}
                              className="w-4 h-4 rounded-full border border-slate-700 hover:border-indigo-500 flex items-center justify-center shrink-0 cursor-pointer transition-all group"
                              title="Mark task completed"
                            >
                              <div className="w-2 h-2 rounded-full bg-transparent group-hover:bg-indigo-500 transition-colors" />
                            </button>

                            <div className="flex flex-col min-w-0">
                              <span className="text-slate-100 font-medium truncate font-sans text-[11px]">{t.title}</span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[8.5px] font-mono px-1 bg-slate-900 border border-slate-800 rounded text-slate-400 uppercase">{t.priority}</span>
                                <span className="text-[8.5px] font-sans text-slate-500 italic truncate">{t.category}</span>
                              </div>
                            </div>
                          </div>

                          <button 
                            onClick={() => handleDeleteTask(t.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 cursor-pointer shrink-0 transition-colors"
                            title="Delete task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 2. Tasks Completed (History) */}
                <div className="flex flex-col gap-2 border-t border-slate-800/40 pt-3">
                  <span className="text-[10.5px] font-mono font-bold text-slate-400 uppercase flex items-center gap-1.5 select-none">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Target Completed ({completedTasks.length})
                  </span>

                  <div className="flex flex-col gap-1.5 select-none">
                    {completedTasks.length === 0 ? (
                      <div className="text-center py-6 bg-[#0A0C10]/30 border border-slate-850 rounded-xl text-slate-500 text-[10px] font-mono">
                        No targets checked off yet for today.
                      </div>
                    ) : (
                      completedTasks.map(t => (
                        <div 
                          key={t.id}
                          className="bg-[#0A0C10]/40 border border-slate-850 p-2.5 rounded-xl flex items-center justify-between gap-3 text-xs shadow-sm hover:border-slate-800 transition-colors opacity-70"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <button 
                              onClick={() => handleUpdateTask(t.id, { status: "TODO" as any })}
                              className="w-4 h-4 rounded-full border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center shrink-0 cursor-pointer"
                              title="Restore back to pending"
                            >
                              <Check className="w-2.5 h-2.5 text-emerald-400" />
                            </button>

                            <div className="flex flex-col min-w-0">
                              <span className="text-slate-400 line-through truncate font-sans text-[11px]">{t.title}</span>
                              <span className="text-[8.5px] font-sans text-slate-600 truncate italic mt-0.5">{t.category}</span>
                            </div>
                          </div>

                          <button 
                            onClick={() => handleDeleteTask(t.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 cursor-pointer shrink-0 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>
      </div>
    );
  };

  // Full onboarding loading indicator
  if (initialLoading) {
    return (
      <div className="w-full min-h-screen bg-[#0A0C10] flex flex-col items-center justify-center gap-3 select-none text-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        <h3 className="font-display font-semibold text-slate-300 text-xs">Assembling PAI Agent Platform Space...</h3>
        <span className="text-[10px] font-mono text-slate-500">Verifying secure JWT credentials & synchronizing file databases</span>
      </div>
    );
  }

  // Auth gate
  if (!token) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="flex bg-[#0A0C10] h-screen overflow-hidden text-slate-200 relative">
      
      {/* Searchable/Selected Voice warnings & notices */}
      {voiceWarningMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all">
          <div className="bg-[#0D1117] border border-amber-500/40 p-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs text-amber-300 font-sans select-none backdrop-blur shadow-amber-500/5 animate-pulse">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <span className="font-semibold tracking-wide uppercase font-mono text-[10px]">Speech Synth Warning:</span>
            <span>{voiceWarningMsg}</span>
          </div>
        </div>
      )}

      {/* Sidebar navigation */}
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
        notifications={notifications}
        onMarkRead={handleMarkNotifRead}
        onClearNotifications={handleClearNotifications}
        currentTheme={currentTheme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Workspace with soft layout transitions */}
      <div className="flex-1 h-screen overflow-hidden bg-transparent relative z-10">
        
        {/* Layer 1 Supplement: Subtle ambient light orbs inside workspace */}
        <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-500/10 dark:bg-indigo-500/8 blur-[120px] pointer-events-none rounded-full z-0 animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-10%] left-[10%] w-[40vw] h-[40vw] bg-violet-600/5 dark:bg-violet-600/5 blur-[100px] pointer-events-none rounded-full z-0" />

        {/* Layer 2: Giant Watermark Logo inside workspace background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[72vmin] h-[72vmin] max-w-[850px] max-h-[850px] pointer-events-none z-[1] select-none flex items-center justify-center shrink-0">
          <img 
            src={brandLogo} 
            alt="PAI Background Branding" 
            className="w-full h-full object-contain opacity-[0.06] dark:opacity-[0.12] animate-logo-watermark transition-opacity duration-500"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Layer 3: Glass Overlay pane across the workspace */}
        <div className="absolute inset-0 bg-[#0A0C10]/45 dark:bg-[#0A0C10]/65 backdrop-blur-[24px] md:backdrop-blur-[36px] z-[2] pointer-events-none" />

        {/* Layer 4: Dashboard Components */}
        <div className="relative z-10 w-full h-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="w-full h-full bg-transparent"
            >
              {renderActiveTab()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

    </div>
  );
}
export {Loader2}; // export a small dummy export if needed by any importsorts
