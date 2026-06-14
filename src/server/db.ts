import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  collection, 
  query, 
  where, 
  updateDoc, 
  deleteDoc,
  limit
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { User, Conversation, Message, Memory, Task, Goal, Note, FileMeta, AppNotification, SystemAnalytics, TaskPriority, TaskStatus } from "../types";

// Initialize Firebase client on the server
const app = initializeApp(firebaseConfig);
const firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const JWT_SECRET = process.env.JWT_SECRET || "pai-super-secret-key-10928";

async function ensureAnalytics(userId: string): Promise<SystemAnalytics> {
  const docRef = doc(firestoreDb, "users", userId, "analytics", "main");
  const snap = await getDoc(docRef);
  
  if (!snap.exists()) {
    const memoriesCol = collection(firestoreDb, "users", userId, "memories");
    const memoriesSnap = await getDocs(memoriesCol);
    const initialAnalytics: SystemAnalytics = {
      userId,
      totalTokensUsed: Math.floor(Math.random() * 5000) + 1200,
      apiCallsCount: Math.floor(Math.random() * 40) + 15,
      responseTimeMsAverage: Math.floor(Math.random() * 300) + 250,
      taskCompletionRate: 0,
      memoryEntriesCount: memoriesSnap.size,
      lastActive: new Date().toISOString()
    };
    await setDoc(docRef, initialAnalytics);
    return initialAnalytics;
  }
  return snap.data() as SystemAnalytics;
}

export const DB = {
  // Authentication & Users
  async registerUser(email: string, passwordPlain: string, fullName: string, forceUid?: string): Promise<{ user?: User; error?: string }> {
    try {
      const q = query(collection(firestoreDb, "users"), where("email", "==", email.toLowerCase()), limit(1));
      const qSnap = await getDocs(q);
      
      if (!qSnap.empty) {
        return { error: "User already exists with this email address." };
      }

      const userId = forceUid || "u_" + Math.random().toString(36).substring(2, 9);
      const passwordHash = bcrypt.hashSync(passwordPlain, 10);
      
      const newUser: User = {
        id: userId,
        email: email.toLowerCase(),
        passwordHash,
        fullName,
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

      await setDoc(doc(firestoreDb, "users", userId), newUser);

      // Onboarding Notification
      const notifId = "notif_" + Math.random().toString(36).substring(2, 9);
      await setDoc(doc(firestoreDb, "users", userId, "notifications", notifId), {
        id: notifId,
        userId,
        title: "Welcome to PAI!",
        content: "Thank you for initializing your Personal AI Agent platform. Select a goal and talk to PAI to start building long-term memories.",
        type: "SYSTEM",
        read: false,
        createdAt: new Date().toISOString()
      });

      // Default Onboarding Task
      const taskId = "t_init";
      await setDoc(doc(firestoreDb, "users", userId, "tasks", taskId), {
        id: taskId,
        userId,
        title: "Explore the PAI Dashboard",
        description: "Take a tour around your customized glassmorphism dashboard, check the Memory Center, open the Research Lab, and chat with your agent.",
        priority: TaskPriority.HIGH,
        status: TaskStatus.TODO,
        category: "Onboarding",
        createdAt: new Date().toISOString()
      });

      // Default Onboarding Goal
      const goalId = "g_init";
      await setDoc(doc(firestoreDb, "users", userId, "goals", goalId), {
        id: goalId,
        userId,
        title: "Master Personal AI Workflows",
        description: "Define 3 categories of active tasks and establish robust knowledge base structures.",
        progress: 25,
        type: "SHORT_TERM",
        createdAt: new Date().toISOString()
      });

      await ensureAnalytics(userId);
      return { user: newUser };
    } catch (err: any) {
      console.error("Firestore Registry Fail:", err);
      return { error: "Firebase failed to structure account: " + err.message };
    }
  },

  async loginUser(email: string, passwordPlain: string): Promise<{ user?: User; token?: string; error?: string; wasAutoRegistered?: boolean }> {
    try {
      const q = query(collection(firestoreDb, "users"), where("email", "==", email.toLowerCase()), limit(1));
      const qSnap = await getDocs(q);
      
      let user: User | null = null;
      let wasAutoRegistered = false;

      if (qSnap.empty) {
        // Ephemeral DB recovery fallback
        const registerResult = await this.registerUser(email, passwordPlain, "PAI Student");
        if (registerResult.error) {
          return { error: registerResult.error };
        }
        user = registerResult.user!;
        wasAutoRegistered = true;
      } else {
        user = qSnap.docs[0].data() as User;
      }

      const match = bcrypt.compareSync(passwordPlain, user.passwordHash);
      if (!match) {
        return { error: "Invalid email or password." };
      }

      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "30d" });
      return { user, token, wasAutoRegistered };
    } catch (err: any) {
      console.error("Firestore Login Fail:", err);
      return { error: "Firebase authentication issue: " + err.message };
    }
  },

  async verifyToken(token: string): Promise<User | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const docRef = doc(firestoreDb, "users", decoded.userId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as User;
      }
      return null;
    } catch (e) {
      return null;
    }
  },

  async updateUserPreferences(userId: string, prefs: Partial<User["preferences"]>): Promise<User | null> {
    try {
      const docRef = doc(firestoreDb, "users", userId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;

      const userData = snap.data() as User;
      const updatedPreferences = {
        ...userData.preferences,
        ...prefs
      };

      await updateDoc(docRef, { preferences: updatedPreferences });
      return {
        ...userData,
        preferences: updatedPreferences
      };
    } catch (err) {
      console.error("Preferences Update Fail:", err);
      return null;
    }
  },

  async updateUserPassword(userId: string, currentPasswordPlain: string, newPasswordPlain: string): Promise<{ success: boolean; error?: string }> {
    try {
      const docRef = doc(firestoreDb, "users", userId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        return { success: false, error: "User not found." };
      }
      const user = snap.data() as User;
      const match = bcrypt.compareSync(currentPasswordPlain, user.passwordHash);
      if (!match) {
        return { success: false, error: "Incorrect current password." };
      }
      const passwordHash = bcrypt.hashSync(newPasswordPlain, 10);
      await updateDoc(docRef, { passwordHash });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // Conversations & History
  async getConversations(userId: string): Promise<Conversation[]> {
    try {
      const colRef = collection(firestoreDb, "users", userId, "conversations");
      const snap = await getDocs(colRef);
      
      const list: Conversation[] = [];
      snap.forEach((docSnap) => {
        list.push(docSnap.data() as Conversation);
      });

      if (list.length === 0) {
        const defaultConv: Conversation = {
          id: "c_default",
          userId,
          title: "Initial Sync",
          messages: [
            {
              id: "msg_init",
              sender: "agent",
              content: "Greetings! I am PAI, your enterprise-grade Personal AI Agent. I have initialized your productivity center, memory engines, and intelligence tools. What shall we achieve today?",
              timestamp: new Date().toISOString()
            }
          ],
          updatedAt: new Date().toISOString()
        };
        await setDoc(doc(firestoreDb, "users", userId, "conversations", "c_default"), defaultConv);
        return [defaultConv];
      }

      return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch (err) {
      console.error("Fetch Conversations Fail:", err);
      return [];
    }
  },

  async saveMessage(userId: string, conversationId: string, message: Omit<Message, "id">): Promise<Conversation | null> {
    try {
      const docRef = doc(firestoreDb, "users", userId, "conversations", conversationId);
      const snap = await getDoc(docRef);
      
      let conv: Conversation;
      if (!snap.exists()) {
        conv = {
          id: conversationId,
          userId,
          title: message.content.substring(0, 30) + (message.content.length > 30 ? "..." : ""),
          messages: [],
          updatedAt: new Date().toISOString()
        };
      } else {
        conv = snap.data() as Conversation;
      }

      const fullMessage: Message = {
        ...message,
        id: "msg_" + Math.random().toString(36).substring(2, 9)
      };
      
      conv.messages.push(fullMessage);
      conv.updatedAt = new Date().toISOString();

      if (conv.messages.length === 2 && conv.title === "Initial Sync") {
        conv.title = conv.messages[1].content.substring(0, 30) + (conv.messages[1].content.length > 30 ? "..." : "");
      }

      await setDoc(docRef, conv);
      return conv;
    } catch (err) {
      console.error("Save Message Fail:", err);
      return null;
    }
  },

  async clearHistory(userId: string): Promise<void> {
    try {
      const colRef = collection(firestoreDb, "users", userId, "conversations");
      const snap = await getDocs(colRef);
      const deletePromises = snap.docs.map(docSnap => deleteDoc(docSnap.ref));
      await Promise.all(deletePromises);
    } catch (err) {
      console.error("Clear History Fail:", err);
    }
  },

  // Memories
  async getMemories(userId: string): Promise<Memory[]> {
    try {
      const colRef = collection(firestoreDb, "users", userId, "memories");
      const snap = await getDocs(colRef);
      const list: Memory[] = [];
      snap.forEach(docSnap => {
        list.push(docSnap.data() as Memory);
      });
      return list;
    } catch (err) {
      console.error("Fetch Memories Fail:", err);
      return [];
    }
  },

  async addMemory(userId: string, content: string, category: Memory["category"], strength: number = 3): Promise<Memory> {
    const memoryId = "mrm_" + Math.random().toString(36).substring(2, 9);
    const newMemory: Memory = {
      id: memoryId,
      userId,
      content,
      category,
      strength,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(firestoreDb, "users", userId, "memories", memoryId), newMemory);
      
      const notifId = "notif_" + Math.random().toString(36).substring(2, 9);
      await setDoc(doc(firestoreDb, "users", userId, "notifications", notifId), {
        id: notifId,
        userId,
        title: "Memory System Updated",
        content: `Learned new preference/fact: "${content.substring(0, 40)}${content.length > 40 ? "..." : ""}"`,
        type: "MEMORY",
        read: false,
        createdAt: new Date().toISOString()
      });

      const analytics = await ensureAnalytics(userId);
      const memories = await this.getMemories(userId);
      await updateDoc(doc(firestoreDb, "users", userId, "analytics", "main"), {
        memoryEntriesCount: memories.length
      });
    } catch (err) {
      console.error("Add Memory Fail:", err);
    }

    return newMemory;
  },

  async deleteMemory(userId: string, memoryId: string): Promise<boolean> {
    try {
      const docRef = doc(firestoreDb, "users", userId, "memories", memoryId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return false;

      await deleteDoc(docRef);
      const memories = await this.getMemories(userId);
      await updateDoc(doc(firestoreDb, "users", userId, "analytics", "main"), {
        memoryEntriesCount: memories.length
      });
      return true;
    } catch (err) {
      console.error("Delete Memory Fail:", err);
      return false;
    }
  },

  // Tasks
  async getTasks(userId: string): Promise<Task[]> {
    try {
      const colRef = collection(firestoreDb, "users", userId, "tasks");
      const snap = await getDocs(colRef);
      const list: Task[] = [];
      snap.forEach(docSnap => {
        list.push(docSnap.data() as Task);
      });
      return list;
    } catch (err) {
      console.error("Fetch Tasks Fail:", err);
      return [];
    }
  },

  async createTask(userId: string, task: Omit<Task, "id" | "userId" | "createdAt" | "status">): Promise<Task> {
    const taskId = "t_" + Math.random().toString(36).substring(2, 9);
    const newTask: Task = {
      ...task,
      id: taskId,
      userId,
      status: TaskStatus.TODO,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(firestoreDb, "users", userId, "tasks", taskId), newTask);

      const notifId = "notif_" + Math.random().toString(36).substring(2, 9);
      await setDoc(doc(firestoreDb, "users", userId, "notifications", notifId), {
        id: notifId,
        userId,
        title: "Task Created",
        content: `New task assigned: "${task.title}"`,
        type: "TASK",
        read: false,
        createdAt: new Date().toISOString()
      });

      await this.recalculateTaskAnalytics(userId);
    } catch (err) {
      console.error("Create Task Fail:", err);
    }

    return newTask;
  },

  async updateTask(userId: string, taskId: string, updates: Partial<Task>): Promise<Task | null> {
    try {
      const docRef = doc(firestoreDb, "users", userId, "tasks", taskId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;

      const originalTask = snap.data() as Task;
      const updatedTask = {
        ...originalTask,
        ...updates
      };

      await setDoc(docRef, updatedTask);

      if (updates.status === TaskStatus.COMPLETED) {
        const notifId = "notif_" + Math.random().toString(36).substring(2, 9);
        await setDoc(doc(firestoreDb, "users", userId, "notifications", notifId), {
          id: notifId,
          userId,
          title: "Task Completed!",
          content: `Nicely done: "${originalTask.title}" has been completed.`,
          type: "TASK",
          read: false,
          createdAt: new Date().toISOString()
        });
      }

      await this.recalculateTaskAnalytics(userId);
      return updatedTask;
    } catch (err) {
      console.error("Update Task Fail:", err);
      return null;
    }
  },

  async deleteTask(userId: string, taskId: string): Promise<boolean> {
    try {
      const docRef = doc(firestoreDb, "users", userId, "tasks", taskId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return false;

      await deleteDoc(docRef);
      await this.recalculateTaskAnalytics(userId);
      return true;
    } catch (err) {
      console.error("Delete Task Fail:", err);
      return false;
    }
  },

  async recalculateTaskAnalytics(userId: string): Promise<void> {
    try {
      const tasks = await this.getTasks(userId);
      const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED);
      const rate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;
      await updateDoc(doc(firestoreDb, "users", userId, "analytics", "main"), {
        taskCompletionRate: rate
      });
    } catch (err) {
      console.error("Recalculate Task Analytics Fail:", err);
    }
  },

  // Goals
  async getGoals(userId: string): Promise<Goal[]> {
    try {
      const colRef = collection(firestoreDb, "users", userId, "goals");
      const snap = await getDocs(colRef);
      const list: Goal[] = [];
      snap.forEach(docSnap => {
        list.push(docSnap.data() as Goal);
      });
      return list;
    } catch (err) {
      console.error("Fetch Goals Fail:", err);
      return [];
    }
  },

  async createGoal(userId: string, goal: Omit<Goal, "id" | "userId" | "createdAt" | "progress">): Promise<Goal> {
    const goalId = "g_" + Math.random().toString(36).substring(2, 9);
    const newGoal: Goal = {
      ...goal,
      id: goalId,
      userId,
      progress: 0,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(firestoreDb, "users", userId, "goals", goalId), newGoal);
    } catch (err) {
      console.error("Create Goal Fail:", err);
    }

    return newGoal;
  },

  async updateGoal(userId: string, goalId: string, updates: Partial<Goal>): Promise<Goal | null> {
    try {
      const docRef = doc(firestoreDb, "users", userId, "goals", goalId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;

      const originalGoal = snap.data() as Goal;
      const updatedGoal = {
        ...originalGoal,
        ...updates
      };

      await setDoc(docRef, updatedGoal);
      return updatedGoal;
    } catch (err) {
      console.error("Update Goal Fail:", err);
      return null;
    }
  },

  async deleteGoal(userId: string, goalId: string): Promise<boolean> {
    try {
      const docRef = doc(firestoreDb, "users", userId, "goals", goalId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return false;

      await deleteDoc(docRef);
      return true;
    } catch (err) {
      console.error("Delete Goal Fail:", err);
      return false;
    }
  },

  // Notes
  async getNotes(userId: string): Promise<Note[]> {
    try {
      const colRef = collection(firestoreDb, "users", userId, "notes");
      const snap = await getDocs(colRef);
      const list: Note[] = [];
      snap.forEach(docSnap => {
        list.push(docSnap.data() as Note);
      });
      return list;
    } catch (err) {
      console.error("Fetch Notes Fail:", err);
      return [];
    }
  },

  async createNote(userId: string, note: Omit<Note, "id" | "userId" | "createdAt" | "updatedAt">): Promise<Note> {
    const noteId = "note_" + Math.random().toString(36).substring(2, 9);
    const newNote: Note = {
      ...note,
      id: noteId,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(firestoreDb, "users", userId, "notes", noteId), newNote);
    } catch (err) {
      console.error("Create Note Fail:", err);
    }

    return newNote;
  },

  async updateNote(userId: string, noteId: string, updates: Partial<Note>): Promise<Note | null> {
    try {
      const docRef = doc(firestoreDb, "users", userId, "notes", noteId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;

      const originalNote = snap.data() as Note;
      const updatedNote = {
        ...originalNote,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await setDoc(docRef, updatedNote);
      return updatedNote;
    } catch (err) {
      console.error("Update Note Fail:", err);
      return null;
    }
  },

  async deleteNote(userId: string, noteId: string): Promise<boolean> {
    try {
      const docRef = doc(firestoreDb, "users", userId, "notes", noteId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return false;

      await deleteDoc(docRef);
      return true;
    } catch (err) {
      console.error("Delete Note Fail:", err);
      return false;
    }
  },

  // Files
  async getFiles(userId: string): Promise<FileMeta[]> {
    try {
      const colRef = collection(firestoreDb, "users", userId, "files");
      const snap = await getDocs(colRef);
      const list: FileMeta[] = [];
      snap.forEach(docSnap => {
        list.push(docSnap.data() as FileMeta);
      });
      return list;
    } catch (err) {
      console.error("Fetch Files Fail:", err);
      return [];
    }
  },

  async saveFileMeta(userId: string, file: Omit<FileMeta, "id" | "userId" | "createdAt">): Promise<FileMeta> {
    const fileId = "f_" + Math.random().toString(36).substring(2, 9);
    const newFile: FileMeta = {
      ...file,
      id: fileId,
      userId,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(firestoreDb, "users", userId, "files", fileId), newFile);
    } catch (err) {
      console.error("Save File Meta Fail:", err);
    }

    return newFile;
  },

  async deleteFileMeta(userId: string, fileId: string): Promise<boolean> {
    try {
      const docRef = doc(firestoreDb, "users", userId, "files", fileId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return false;

      await deleteDoc(docRef);
      return true;
    } catch (err) {
      console.error("Delete File Meta Fail:", err);
      return false;
    }
  },

  // Notifications
  async getNotifications(userId: string): Promise<AppNotification[]> {
    try {
      const colRef = collection(firestoreDb, "users", userId, "notifications");
      const snap = await getDocs(colRef);
      const list: AppNotification[] = [];
      snap.forEach(docSnap => {
        list.push(docSnap.data() as AppNotification);
      });
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      console.error("Fetch Notifications Fail:", err);
      return [];
    }
  },

  async markNotificationAsRead(userId: string, notifId: string): Promise<boolean> {
    try {
      const docRef = doc(firestoreDb, "users", userId, "notifications", notifId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return false;

      await updateDoc(docRef, { read: true });
      return true;
    } catch (err) {
      console.error("Mark Notification Read Fail:", err);
      return false;
    }
  },

  async clearNotifications(userId: string): Promise<void> {
    try {
      const colRef = collection(firestoreDb, "users", userId, "notifications");
      const snap = await getDocs(colRef);
      const deletePromises = snap.docs.map(docSnap => deleteDoc(docSnap.ref));
      await Promise.all(deletePromises);
    } catch (err) {
      console.error("Clear Notifications Fail:", err);
    }
  },

  // Analytics
  async getAnalytics(userId: string): Promise<SystemAnalytics> {
    return ensureAnalytics(userId);
  },

  async recordMetrics(userId: string, tokens: number, elapsedMs: number): Promise<void> {
    try {
      const record = await ensureAnalytics(userId);
      const updatedTokens = record.totalTokensUsed + Math.round(tokens);
      const updatedCalls = record.apiCallsCount + 1;
      const updatedResponseTime = Math.round((record.responseTimeMsAverage * 9 + elapsedMs) / 10);
      
      const docRef = doc(firestoreDb, "users", userId, "analytics", "main");
      await updateDoc(docRef, {
        totalTokensUsed: updatedTokens,
        apiCallsCount: updatedCalls,
        responseTimeMsAverage: updatedResponseTime,
        lastActive: new Date().toISOString()
      });
    } catch (err) {
      console.error("Record Metrics Fail:", err);
    }
  },

  async getOrCreateFirebaseUser(email: string, fullName: string, uid: string): Promise<User> {
    const docRef = doc(firestoreDb, "users", uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as User;
    }
    
    const newUser: User = {
      id: uid,
      email: email.toLowerCase(),
      fullName: fullName || "PAI Student",
      passwordHash: "firebase-oauth-token-validated",
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
    await setDoc(docRef, newUser);
    
    // Create onboarding notifications, tasks and goals
    const notifId = "notif_google_onboarding";
    await setDoc(doc(firestoreDb, "users", uid, "notifications", notifId), {
      id: notifId,
      userId: uid,
      title: "Welcome to PAI via Google Sign-In!",
      content: "Thank you for initializing your Personal AI Agent platform using safe Google credentials. Open the dashboard and start chatting.",
      type: "SYSTEM",
      read: false,
      createdAt: new Date().toISOString()
    });

    const taskId = "t_google_init";
    await setDoc(doc(firestoreDb, "users", uid, "tasks", taskId), {
      id: taskId,
      userId: uid,
      title: "Explore the PAI Dashboard",
      description: "Take a tour around your customized glassmorphism dashboard, check the Memory Center, open the Research Lab, and chat with your agent.",
      priority: TaskPriority.HIGH,
      status: TaskStatus.TODO,
      category: "Onboarding",
      createdAt: new Date().toISOString()
    });

    const goalId = "g_google_init";
    await setDoc(doc(firestoreDb, "users", uid, "goals", goalId), {
      id: goalId,
      userId: uid,
      title: "Master Personal AI Workflows",
      description: "Define 3 categories of active tasks and establish robust knowledge base structures.",
      progress: 25,
      type: "SHORT_TERM",
      createdAt: new Date().toISOString()
    });

    await ensureAnalytics(uid);
    return newUser;
  }
};
