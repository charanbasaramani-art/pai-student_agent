import React, { useState } from "react";
import { Goal } from "../types";
import { 
  Target, 
  Trash2, 
  Plus, 
  Calendar,
  Layers,
  Sparkles,
  Loader2
} from "lucide-react";

interface GoalTrackerProps {
  goals: Goal[];
  onCreateGoal: (goal: { title: string; description: string; targetDate?: string; type: "SHORT_TERM" | "LONG_TERM" }) => Promise<void>;
  onUpdateGoal: (id: string, updates: Partial<Goal>) => Promise<void>;
  onDeleteGoal: (id: string) => Promise<void>;
}

export default function GoalTracker({ goals, onCreateGoal, onUpdateGoal, onDeleteGoal }: GoalTrackerProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"SHORT_TERM" | "LONG_TERM">("SHORT_TERM");
  const [targetDate, setTargetDate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || loading) return;

    setLoading(true);
    try {
      await onCreateGoal({
        title,
        description: description || undefined,
        targetDate: targetDate || undefined,
        type
      });
      setTitle("");
      setDescription("");
      setTargetDate("");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto h-screen bg-[#0A0C10] select-none">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        
        {/* Title */}
        <div className="flex items-center justify-between border-b border-slate-800/50 pb-4">
          <div>
            <h1 className="font-display font-medium text-lg text-white">AI Goal & Milestones Tracker</h1>
            <p className="text-xs text-slate-400 font-mono mt-1">STRATEGIC ACCELERATION & PREFERENCE SYNCHRONIZATION</p>
          </div>
          <Target className="w-5 h-5 text-indigo-400" />
        </div>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          
          {/* Create Goal left Column */}
          <div className="bg-[#0D1117] border border-slate-800/50 p-5 rounded-xl flex flex-col gap-4 shadow-sm">
            <h3 className="font-display font-semibold text-sm text-slate-200">Set New Milestone</h3>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-slate-400 font-semibold">MILESTONE TITLE</label>
                <input 
                  type="text"
                  placeholder="Complete all BCA design prototypes"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-[#0A0C10] border border-slate-800/80 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-slate-400 font-semibold">STRATEGY DETAILS</label>
                <textarea 
                  placeholder="Define milestones, UI layouts, database helpers, and compile code..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-[#0A0C10] border border-slate-800/80 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 h-20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono text-slate-400 font-semibold">TIMELINE TYPE</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="bg-[#0A0C10] border border-slate-800/80 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="SHORT_TERM">Short Term</option>
                    <option value="LONG_TERM">Long Term</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono text-slate-400 font-semibold">TARGET DUE DATE</label>
                  <input 
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="bg-[#0A0C10] border border-slate-800/80 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !title.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-lg shadow-indigo-600/10"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>Establish Goal</span>
              </button>

            </form>
          </div>

          {/* Goal List Cards right 2-cols layout */}
          <div className="md:col-span-2 flex flex-col gap-4">
            {goals.length === 0 ? (
              <div className="text-center py-16 bg-[#0D1117] border border-slate-800/50 rounded-xl text-slate-500 font-mono text-xs shadow-sm">
                No active strategic goals scheduled.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {goals.map((g) => {
                  return (
                    <div 
                      key={g.id}
                      className="bg-[#0D1117] border border-slate-800/50 p-4.5 rounded-xl flex flex-col gap-3 relative hover:border-indigo-500/30 transition-all shadow-sm"
                    >
                      {/* Header title */}
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex flex-col">
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border self-start mb-1.5 ${g.type === "SHORT_TERM" ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/20" : "bg-indigo-500/10 text-indigo-300 border-indigo-500/20"}`}>
                            {g.type === "SHORT_TERM" ? "SHORT TERM" : "LONG TERM"}
                          </span>
                          <h4 className="text-xs font-semibold text-slate-100 uppercase tracking-tight">
                            {g.title}
                          </h4>
                          {g.description && (
                            <p className="text-[11px] text-slate-400 font-sans mt-1 leading-relaxed">
                              {g.description}
                            </p>
                          )}
                        </div>

                        {/* Delete btn */}
                        <button 
                          onClick={() => onDeleteGoal(g.id)}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-[#0A0C10] transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Slider Progress Controls */}
                      <div className="flex flex-col gap-2 mt-2">
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                          <span>Progress:</span>
                          <span className={`${g.progress === 100 ? "text-emerald-400 font-bold" : "text-indigo-400 font-semibold"}`}>{g.progress}%</span>
                        </div>

                        {/* Slide input */}
                        <input 
                          type="range"
                          min="0"
                          max="100"
                          value={g.progress}
                          onChange={(e) => onUpdateGoal(g.id, { progress: parseInt(e.target.value) })}
                          className="w-full accent-indigo-500 bg-[#0A0C10] border border-slate-800/50 rounded-lg appearance-none h-1.5 cursor-pointer"
                        />

                        {/* Dynamic Progress indicator card */}
                        <div className="w-full bg-[#0A0C10] rounded-full h-1 overflow-hidden select-none">
                          <div 
                            className="bg-indigo-600 h-full rounded-full" 
                            style={{ width: `${g.progress}%` }}
                          />
                        </div>

                        {g.targetDate && (
                          <div className="text-[10px] text-slate-400 font-mono mt-1 flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            Target Due Date: {g.targetDate}
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
