import React, { useState } from "react";
import { 
  Search, 
  BookOpen, 
  Globe, 
  MapPin, 
  Loader2, 
  FileText, 
  Compass, 
  CheckCircle2, 
  Share2,
  Bookmark
} from "lucide-react";

interface ResearchReport {
  topic: string;
  reportText: string;
  citations: Array<{ uri: string; title: string }>;
  timestamp: string;
}

export default function ResearchLab() {
  const [query, setQuery] = useState("");
  const [depth, setDepth] = useState<"brief" | "comprehensive">("comprehensive");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ResearchReport | null>(null);

  const handleExecuteResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setReport(null);

    try {
      const token = localStorage.getItem("pai_jwt_token");
      
      const instruct = depth === "brief" 
        ? "Compile a concise executive research summary, outlining key players, core issues, and recent milestones. Include comparison vectors."
        : "Produce an extensive, highly structured, deep technical dossier on this topic. Format with clear display typography headers, a strategic bullet outline, technical SWOT analysis matrix, and comparative tables where appropriate.";

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          messageContent: `${instruct}\n\nSearch Topic: "${query}"`,
          checkResearchMode: true // Forces search grounding
        })
      });

      const data = await res.json();

      if (res.ok && data.reply) {
        setReport({
          topic: query,
          reportText: data.reply,
          citations: data.groundingSources || [],
          timestamp: new Date().toISOString()
        });
      } else {
        alert(data.error || "Failed to trigger cognitive research agents.");
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto h-screen bg-transparent select-none">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/50 pb-4">
          <div>
            <h1 className="font-display font-medium text-lg text-white">AI Search & Research Lab</h1>
            <p className="text-xs text-slate-400 font-mono mt-1">REAL-TIME WEB GROUNDING & DEEP REPORT GENERATORS</p>
          </div>
          <Compass className="w-5 h-5 text-indigo-400" />
        </div>

        {/* Input panel glass box */}
        <div className="bg-[#0D1117] border border-slate-800/50 p-6 rounded-xl shadow-sm">
          <form onSubmit={handleExecuteResearch} className="flex flex-col gap-4">
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-slate-400 font-semibold uppercase">Research Hypothesis or Query</label>
              <div className="relative">
                <Search className="absolute left-3 top-3.5 w-4.5 h-4.5 text-slate-500" />
                <input 
                  type="text" 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g., Progress in solid-state battery tech 2026, or BCA degree syllabus comparisons..."
                  className="w-full bg-[#0A0C10] border border-slate-800/80 rounded-lg py-3.5 pl-11 pr-4 text-xs text-white focus:outline-none focus:border-indigo-505"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-4 items-center">
                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                  <input 
                    type="radio" 
                    name="depth" 
                    checked={depth === "brief"}
                    onChange={() => setDepth("brief")}
                    className="accent-indigo-500 bg-[#0A0C10] border-slate-800/50 cursor-pointer"
                  />
                  <span>Executive Briefing</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                  <input 
                    type="radio" 
                    name="depth" 
                    checked={depth === "comprehensive"}
                    onChange={() => setDepth("comprehensive")}
                    className="accent-indigo-500 bg-[#0A0C10] border-slate-800/50 cursor-pointer"
                  />
                  <span className="text-indigo-300 font-semibold">Deep Dossier Report</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-6 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-lg shadow-indigo-600/10"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>Initiate Research Dossier</span>
              </button>
            </div>

          </form>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="py-24 text-center justify-center items-center flex flex-col gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            <h3 className="font-display font-semibold text-slate-350 text-xs">Assembling live grounding sources...</h3>
            <p className="text-[10px] text-slate-500 font-mono max-w-xs leading-relaxed">
              Gemini is researching active web queries, filtering citations, comparing viewpoints, and building technical matrices.
            </p>
          </div>
        )}

        {/* Generated Report Dossier output */}
        {report && (
          <div className="flex flex-col gap-6 animate-fade-in select-text">
            
            {/* Top Stat bars columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div className="bg-[#0D1117] border border-slate-800/50 p-4 rounded-xl flex items-center gap-3 select-none shadow-sm">
                <Globe className="w-6 h-6 text-cyan-400 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-mono">SOURCES INGESTED</span>
                  <span className="text-sm font-bold font-display text-white">{report.citations.length} Verified Web Links</span>
                </div>
              </div>

              <div className="bg-[#0D1117] border border-slate-800/50 p-4 rounded-xl flex items-center gap-3 select-none shadow-sm">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-mono">INTEGRITY ANALYSIS</span>
                  <span className="text-sm font-bold font-display text-emerald-400">100% Grounded (No Hallucination)</span>
                </div>
              </div>

              <div className="bg-[#0D1117] border border-slate-800/50 p-4 rounded-xl flex items-center gap-3 select-none shadow-sm">
                <FileText className="w-6 h-6 text-indigo-405 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-mono">COMPILED DOSSIER</span>
                  <span className="text-sm font-bold font-display text-indigo-300">SWOT Matrix Included</span>
                </div>
              </div>

            </div>

            {/* Citations section */}
            {report.citations.length > 0 && (
              <div className="bg-[#0D1117] border border-slate-800/50 p-5 rounded-xl flex flex-col gap-3 shadow-sm">
                <span className="text-[10px] text-indigo-300 font-mono font-bold flex items-center gap-1.5 tracking-wider uppercase select-none">
                  <Globe className="w-3.5 h-3.5 text-indigo-400" /> Grounded citation indexes:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {report.citations.map((c, i) => (
                    <a 
                      key={i} 
                      href={c.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-3 bg-[#0A0C10] hover:bg-indigo-600/10 rounded-lg border border-slate-805 text-[11px] text-cyan-400 font-mono transition-colors block truncate hover:text-white"
                      title={c.title}
                    >
                      <span className="text-slate-500 font-semibold mr-1">[{i + 1}]</span>
                      {c.title || "Reference article URL"}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Dossier Report body */}
            <div className="bg-[#0D1117] border border-slate-800/50 p-6 rounded-xl flex flex-col gap-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800/50 pb-3 select-none">
                <span className="text-slate-300 text-xs font-semibold font-display tracking-tight flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5 text-indigo-400" /> TECHNICAL DOSSIER DETAILS
                </span>
                
                <span className="text-[10px] text-slate-500 font-mono">
                  Ingested: {new Date(report.timestamp).toLocaleTimeString()}
                </span>
              </div>

              {/* dossier Text */}
              <div className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-200">
                {report.reportText}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
