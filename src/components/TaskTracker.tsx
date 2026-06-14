import React, { useState } from "react";
import { Task, TaskPriority, TaskStatus } from "../types";
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  Calendar, 
  AlertTriangle,
  Folder,
  SlidersHorizontal,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const particlesColors = ["#10B981", "#34D399", "#059669", "#6EE7B7", "#06B6D4", "#60A5FA"];

interface TaskTrackerProps {
  tasks: Task[];
  onCreateTask: (task: { title: string; description: string; priority: TaskPriority; dueDate?: string; category: string }) => Promise<void>;
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
}

export default function TaskTracker({ tasks, onCreateTask, onUpdateTask, onDeleteTask }: TaskTrackerProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [category, setCategory] = useState("Work");
  const [dueDate, setDueDate] = useState("");

  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [loading, setLoading] = useState(false);

  const [activeBursts, setActiveBursts] = useState<string[]>([]);

  const triggerBurst = (taskId: string) => {
    setActiveBursts((prev) => [...prev, taskId]);
    setTimeout(() => {
      setActiveBursts((prev) => prev.filter((id) => id !== taskId));
    }, 1000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || loading) return;

    setLoading(true);
    try {
      await onCreateTask({
        title,
        description: description || undefined,
        priority,
        category,
        dueDate: dueDate || undefined
      });
      setTitle("");
      setDescription("");
      setDueDate("");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (p: TaskPriority) => {
    switch (p) {
      case TaskPriority.URGENT: return "text-rose-400 bg-rose-500/10 border-rose-500/20";
      case TaskPriority.HIGH: return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      case TaskPriority.MEDIUM: return "text-indigo-400 bg-indigo-500/10 border-indigo-500/20";
      case TaskPriority.LOW: return "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";
    }
  };

  const filteredTasks = tasks.filter(t => {
    const statusMatch = filterStatus === "ALL" || t.status === filterStatus;
    const priorityMatch = filterPriority === "ALL" || t.priority === filterPriority;
    return statusMatch && priorityMatch;
  });

  return (
    <div className="flex-1 p-8 overflow-y-auto h-screen bg-transparent select-none">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        
        {/* Title */}
        <div className="flex items-center justify-between border-b border-slate-800/50 pb-4">
          <div>
            <h1 className="font-display font-medium text-lg text-white">AI Productivity Task Engine</h1>
            <p className="text-xs text-slate-400 font-mono mt-1">SITUATIONAL ASSIGNMENT & VELOCITY MONITORING</p>
          </div>
          <div className="flex items-center gap-1 bg-[#0D1117] border border-slate-850 rounded-lg p-1.5 text-xs text-slate-400 font-mono">
            <span>Completed Rate:</span>
            <span className="text-indigo-400 font-bold">
              {tasks.length > 0 
                ? Math.round((tasks.filter(t => t.status === TaskStatus.COMPLETED).length / tasks.length) * 100) 
                : 0}%
            </span>
          </div>
        </div>

        {/* Dashboard Grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          
          {/* Creator form left Column */}
          <div className="bg-[#0D1117] border border-slate-800/50 p-5 rounded-xl flex flex-col gap-4 shadow-sm">
            <h3 className="font-display text-sm font-semibold text-slate-200">Schedule Task Card</h3>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-slate-400 font-semibold">TASK TITLE</label>
                <input 
                  type="text"
                  placeholder="Review BCA dissertation draft"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-[#0A0C10] border border-slate-800/80 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-slate-400 font-semibold">DESCRIPTION</label>
                <textarea 
                  placeholder="Expand on structural schemas, API endpoints tables, and system metrics..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-[#0A0C10] border border-slate-800/80 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 h-20 resize-none"
                />
              </div>

              {/* Priority & category */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono text-slate-400 font-semibold">PRIORITY</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="bg-[#0A0C10] border border-slate-800/80 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                  >
                    <option value={TaskPriority.LOW}>Low</option>
                    <option value={TaskPriority.MEDIUM}>Medium</option>
                    <option value={TaskPriority.HIGH}>High</option>
                    <option value={TaskPriority.URGENT}>Urgent</option>
                  </select>
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono text-slate-400 font-semibold">CATEGORY</label>
                  <input 
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Work"
                    className="bg-[#0A0C10] border border-slate-800/80 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-slate-400 font-semibold">TARGET DUE DATE</label>
                <input 
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="bg-[#0A0C10] border border-slate-800/80 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !title.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-lg shadow-indigo-600/10"
              >
                {loading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>Assign Task Card</span>
              </button>

            </form>
          </div>

          {/* Filtering & Live task listings right Column list (Takes 2 grid columns) */}
          <div className="md:col-span-2 flex flex-col gap-4">
            
            {/* Filter toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0D1117] p-3 rounded-lg border border-slate-800/50">
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold font-mono">
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                <span>FILTER PARAMETERS</span>
              </div>
              
              <div className="flex items-center gap-3">
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-[#0A0C10] border border-slate-800/80 rounded px-2 py-1 text-[11px] text-slate-400 cursor-pointer focus:outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value={TaskStatus.TODO}>To Do</option>
                  <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
                  <option value={TaskStatus.COMPLETED}>Completed</option>
                </select>

                <select 
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="bg-[#0A0C10] border border-slate-800/80 rounded px-2 py-1 text-[11px] text-slate-400 cursor-pointer focus:outline-none"
                >
                  <option value="ALL">All Priorities</option>
                  <option value={TaskPriority.LOW}>Low</option>
                  <option value={TaskPriority.MEDIUM}>Medium</option>
                  <option value={TaskPriority.HIGH}>High</option>
                  <option value={TaskPriority.URGENT}>Urgent</option>
                </select>
              </div>
            </div>

            {/* Task list array */}
            <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-12 bg-[#0D1117] border border-slate-800/50 rounded-xl text-slate-500 font-mono text-xs shadow-sm">
                  No active tasks matching filter schema.
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {filteredTasks.map((t) => {
                    const isCompleted = t.status === TaskStatus.COMPLETED;
                    const isProg = t.status === TaskStatus.IN_PROGRESS;
                    
                    return (
                      <motion.div 
                        key={t.id}
                        layout
                        initial={{ opacity: 0, y: 15, scale: 0.97 }}
                        animate={{ opacity: isCompleted ? 0.6 : 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -15, scale: 0.97 }}
                        transition={{ 
                          type: "spring", 
                          stiffness: 400, 
                          damping: 28,
                          layout: { duration: 0.25 }
                        }}
                        className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 bg-[#0D1117] hover:bg-[#0D1117]/85 shadow-sm ${
                          isCompleted ? "border-slate-900/60" : "border-slate-800/50"
                        }`}
                      >
                      <div className="flex items-start gap-3">
                        {/* Status Checkbox toggle */}
                        <div className="relative shrink-0 mt-0.5">
                          <button 
                            onClick={() => {
                              const nextStatus = isCompleted 
                                ? TaskStatus.TODO 
                                : isProg 
                                ? TaskStatus.COMPLETED 
                                : TaskStatus.IN_PROGRESS;
                              
                              if (nextStatus === TaskStatus.COMPLETED) {
                                triggerBurst(t.id);
                              }
                              
                              onUpdateTask(t.id, { status: nextStatus });
                            }}
                            className="p-1 rounded text-slate-500 hover:text-indigo-400 transition-colors cursor-pointer block"
                            title={isCompleted ? "Set to Todo" : isProg ? "Mark completed" : "Set to In Progress"}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : isProg ? (
                              <div className="w-4 h-4 rounded-full border border-indigo-400 flex items-center justify-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                              </div>
                            ) : (
                              <Circle className="w-4 h-4 text-slate-500" />
                            )}
                          </button>

                          {/* Futuristic Particle & Checkmark Burst Animation */}
                          {activeBursts.includes(t.id) && (
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-visible z-20">
                              {/* Glowing expanding ring */}
                              <motion.div
                                initial={{ scale: 0.5, opacity: 1, border: "2px solid #10B981" }}
                                animate={{ scale: 2.5, opacity: 0, borderWidth: "1px" }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className="absolute rounded-full w-4 h-4"
                              />
                              
                              {/* Shooting neon particles */}
                              {[...Array(8)].map((_, idx) => {
                                const angle = (idx * 45 * Math.PI) / 180;
                                const distance = 20 + Math.random() * 15;
                                const x = Math.cos(angle) * distance;
                                const y = Math.sin(angle) * distance;
                                const color = particlesColors[idx % particlesColors.length];
                                const size = 3 + (idx % 3);

                                return (
                                  <motion.div
                                    key={idx}
                                    initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                                    animate={{ x, y, scale: 0, opacity: 0 }}
                                    transition={{ duration: 0.65, ease: "easeOut" }}
                                    className="absolute rounded-full"
                                    style={{
                                      width: `${size}px`,
                                      height: `${size}px`,
                                      backgroundColor: color,
                                      boxShadow: `0 0 6px ${color}`,
                                    }}
                                  />
                                );
                              })}

                              {/* Floating XP pop indicator */}
                              <motion.div
                                initial={{ scale: 0.4, y: 0, opacity: 0 }}
                                animate={{ 
                                  scale: [0.4, 1.2, 1], 
                                  y: [0, -18, -15],
                                  opacity: [0, 1, 0] 
                                }}
                                transition={{ times: [0, 0.35, 1], duration: 0.85, ease: "easeOut" }}
                                className="absolute pointer-events-none bg-emerald-500/95 text-[8px] font-mono font-bold text-[#0A0C10] px-1 py-0.5 rounded flex items-center justify-center whitespace-nowrap shadow-lg shadow-emerald-500/10 border border-emerald-400/20"
                              >
                                <span>+10 XP</span>
                              </motion.div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-1.5 overflow-hidden">
                          <h4 className={`text-xs font-semibold leading-snug truncate ${isCompleted ? "line-through text-slate-500" : "text-white"}`}>
                            {t.title}
                          </h4>
                          {t.description && (
                            <p className="text-[11px] text-slate-400 leading-relaxed font-sans block truncate max-w-sm">
                              {t.description}
                            </p>
                          )}
                          
                          {/* Metadata capsules */}
                          <div className="flex flex-wrap items-center gap-2 mt-1 select-none text-[9px] font-mono">
                            <span className={`px-2 py-0.5 rounded border ${getPriorityColor(t.priority)}`}>
                              {t.priority}
                            </span>
                            
                            <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800 flex items-center gap-1">
                              <Folder className="w-3 h-3 text-slate-500" />
                              {t.category}
                            </span>

                            {t.dueDate && (
                              <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-500" />
                                {t.dueDate}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right actions delete */}
                      <button
                        onClick={() => onDeleteTask(t.id)}
                        className="p-1.5 rounded border border-rose-500/10 hover:border-rose-500 hover:bg-rose-500/10 text-rose-400 transition-all cursor-pointer"
                        title="Delete task assignment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
