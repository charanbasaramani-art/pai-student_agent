export enum TaskPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT"
}

export enum TaskStatus {
  TODO = "TODO",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED"
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
  category: string;
  createdAt: string;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  targetDate?: string;
  progress: number; // 0 to 100
  type: "SHORT_TERM" | "LONG_TERM";
  createdAt: string;
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileMeta {
  id: string;
  userId: string;
  name: string;
  size: number;
  mimeType: string;
  contentSummary?: string;
  extractedText?: string;
  createdAt: string;
}

export interface Memory {
  id: string;
  userId: string;
  content: string;
  category: "PREFERENCE" | "GOAL" | "INTEREST" | "FACT" | "SUMMARY";
  strength: number; // For decay/relevance (1-5)
  createdAt: string;
}

export interface Message {
  id: string;
  sender: "user" | "agent";
  content: string;
  timestamp: string;
  audioUrl?: string; // If synthesized to audio
  groundingSources?: Array<{ uri: string; title: string }>;
  toolsUsed?: string[];
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  messages: Message[];
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  preferences: {
    theme: "dark" | "light" | "cyberpunk" | "nebula" | "system";
    voiceName: "Zephyr" | "Kore" | "Puck" | "Charon" | "Fenrir";
    speechEnabled: boolean;
    voiceCommandsEnabled?: boolean;
    voiceFeedbackSoundsEnabled?: boolean;
    agentPersonality: string;
    voiceType?: "male" | "female" | "system";
    voiceSelected?: string;
    voiceRate?: number;
    voicePitch?: number;
    voiceVolume?: number;
  };
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: "TASK" | "SYSTEM" | "INSIGHT" | "MEMORY";
  read: boolean;
  createdAt: string;
}

export interface SystemAnalytics {
  userId: string;
  totalTokensUsed: number;
  apiCallsCount: number;
  responseTimeMsAverage: number;
  taskCompletionRate: number;
  memoryEntriesCount: number;
  lastActive: string;
}
