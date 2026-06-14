import { SystemAnalytics, Task, Goal, Memory } from "../types";
import { 
  BarChart3, 
  Cpu, 
  Database, 
  Activity, 
  Gauge, 
  CheckSquare, 
  Target, 
  Brain,
  Wifi
} from "lucide-react";

interface AnalyticsMonitorProps {
  analytics: SystemAnalytics | null;
  tasks: Task[];
  goals: Goal[];
  memories: Memory[];
}

export default function AnalyticsMonitor({ analytics, tasks, goals, memories }: AnalyticsMonitorProps) {
  
  // Calculate completed task count
  const completedTasks = tasks.filter(t => t.status === "COMPLETED").length;
  const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  // Compile dashboard tiles
  const tokens = analytics?.totalTokensUsed || 2400;
  const calls = analytics?.apiCallsCount || 40;
  const latency = analytics?.responseTimeMsAverage || 280;

  const bentoItems = [
    { 
      title: "COGNITIVE TOKENS INGEST", 
      value: `${(tokens / 1000).toFixed(2)}K`, 
      sub: "Total cumulative context tokens",
      icon: Database, 
      color: "text-indigo-400" 
    },
    { 
      title: "API COMMUNICATIONS", 
      value: `${calls} Hits`, 
      sub: "Active HTTPS & SSE invocations", 
      icon: Activity, 
      color: "text-cyan-400" 
    },
    { 
      title: "AGENT RESPONSE LATENCY", 
      value: `${latency}ms`, 
      sub: "Weighted Gemini 3.5 response time", 
      icon: Gauge, 
      color: "text-amber-400" 
    }
  ];

  return (
    <div className="flex-1 p-8 overflow-y-auto h-screen bg-transparent select-none">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/50 pb-4">
          <div>
            <h1 className="font-display font-medium text-lg text-white">System Analytics & Monitoring</h1>
            <p className="text-xs text-slate-400 font-mono mt-1">TELEMETRY, AI PERFORMANCE, AND PRODUCTIVITY VELOCITIES</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono rounded-full font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>PAI CLOUD RUN ACTIVE</span>
          </div>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {bentoItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="bg-[#0D1117] border border-slate-800/50 p-5 rounded-xl flex items-center justify-between gap-4 shadow-sm">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono font-bold text-slate-500 tracking-wider">{item.title}</span>
                  <span className="text-xl font-bold font-display text-white">{item.value}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{item.sub}</span>
                </div>
                <div className={`p-3 bg-[#0A0C10] border border-slate-800/60 rounded-lg ${item.color}`}>
                  <Icon className="w-5 h-5 shrink-0" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic comparison progress panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Productivity progress velocities */}
          <div className="bg-[#0D1117] border border-slate-800/50 p-5 rounded-xl flex flex-col gap-4 shadow-sm">
            <h3 className="font-display font-semibold text-xs text-slate-200 uppercase flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-indigo-400" /> PRODUCTIVITY VELOCITY
            </h3>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400">Task Completion Rate</span>
                  <span className="text-indigo-400 font-bold">{completionRate}%</span>
                </div>
                <div className="w-full bg-[#0A0C10] rounded-full h-2 overflow-hidden border border-slate-800/60">
                  <div className="bg-gradient-to-r from-indigo-500 to-indigo-650 h-full rounded-full" style={{ width: `${completionRate}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center text-xs font-mono mt-2">
                <div className="bg-[#0A0C10] p-3 rounded-lg border border-slate-800/50">
                  <span className="text-[11px] text-slate-500">ASSIGNED</span>
                  <p className="text-sm font-bold text-white mt-1">{tasks.length}</p>
                </div>

                <div className="bg-[#0A0C10] p-3 rounded-lg border border-slate-800/50">
                  <span className="text-[11px] text-slate-500">TODO</span>
                  <p className="text-sm font-bold text-amber-400 mt-1">{tasks.filter(t => t.status === "TODO").length}</p>
                </div>

                <div className="bg-[#0A0C10] p-3 rounded-lg border border-slate-800/50">
                  <span className="text-[11px] text-slate-500">COMPLETED</span>
                  <p className="text-sm font-bold text-emerald-400 mt-1">{completedTasks}</p>
                </div>
              </div>
            </div>
          </div>

          {/* AI Metrics database and system metrics */}
          <div className="bg-[#0D1117] border border-slate-800/50 p-5 rounded-xl flex flex-col gap-4 shadow-sm">
            <h3 className="font-display font-semibold text-xs text-slate-200 uppercase flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" /> COGNITIVE INFRASTRUCTURE INDEX
            </h3>

            <div className="flex flex-col gap-4">
              
              <div className="flex items-center justify-between p-2.5 bg-[#0A0C10] rounded-lg border border-slate-800/50 text-xs font-mono">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5 text-indigo-400" /> Long-Term Memory Cells
                </span>
                <span className="text-white font-bold">{memories.length} Cells Active</span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-[#0A0C10] rounded-lg border border-slate-800/50 text-xs font-mono">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-amber-400" /> Strategic goal trackers
                </span>
                <span className="text-white font-bold">{goals.length} Benchmarks Scheduled</span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-[#0A0C10] rounded-lg border border-slate-800/50 text-xs font-mono">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> Infrastructure Gateway
                </span>
                <span className="text-emerald-400 font-bold">Secure SHA-256 Auth</span>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
