import { useState } from "react";
import { Note } from "../types";
import { 
  Plus, 
  Trash2, 
  FileText, 
  Sparkles, 
  Search, 
  Save, 
  Loader2,
  ListRestart,
  Heading,
  HelpCircle,
  FolderPlus
} from "lucide-react";

interface NotesManagerProps {
  notes: Note[];
  onCreateNote: (note: { title: string; content: string; category: string }) => Promise<void>;
  onUpdateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
}

export default function NotesManager({ notes, onCreateNote, onUpdateNote, onDeleteNote }: NotesManagerProps) {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(notes[0]?.id || null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("General");
  const [searchQuery, setSearchQuery] = useState("");

  const [aiLoading, setAiLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const selectedNote = notes.find(n => n.id === selectedNoteId);

  // Sync state with selected item
  const handleSelectNote = (note: Note) => {
    setSelectedNoteId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setCategory(note.category);
  };

  const handleCreateNew = async () => {
    const defaultTitle = "Untitled Note " + (notes.length + 1);
    await onCreateNote({
      title: defaultTitle,
      content: "",
      category: "General"
    });
    // Set to newly created note if possible
    if (notes.length > 0) {
      handleSelectNote(notes[notes.length - 1]);
    }
  };

  const syncOnSave = async () => {
    if (!selectedNoteId) return;
    setSaveLoading(true);
    try {
      await onUpdateNote(selectedNoteId, {
        title,
        content,
        category
      });
    } catch (e) {
      console.error(e);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleAiRefinement = async (taskType: "summarize" | "professionalize" | "study") => {
    if (!content.trim()) return;
    setAiLoading(true);
    try {
      const token = localStorage.getItem("pai_jwt_token");
      const res = await fetch("/api/notes/ai-tools", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          content,
          taskType
        })
      });
      const data = await res.json();
      if (res.ok && data.refinedText) {
        // We append or overwrite. Let's append with nice header dividers!
        const dividers = `\n\n=== AI GENERATED INSIGHTS (${taskType.toUpperCase()}) ===\n${data.refinedText}`;
        setContent(prev => prev + dividers);
      } else {
        alert(data.error || "Failed to process note through AI.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const filteredNotes = notes.filter(n => {
    const titleMatch = n.title.toLowerCase().includes(searchQuery.toLowerCase());
    const contentMatch = n.content.toLowerCase().includes(searchQuery.toLowerCase());
    const catMatch = n.category.toLowerCase().includes(searchQuery.toLowerCase());
    return titleMatch || contentMatch || catMatch;
  });

  return (
    <div className="flex-1 overflow-hidden h-screen bg-[#0A0C10] flex">
      
      {/* Sidebar Knowledge Items selector */}
      <div className="w-64 border-r border-slate-800/50 bg-[#0D1117] flex flex-col p-4 gap-4 shrink-0 select-none">
        
        {/* Title row */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/50">
          <div>
            <span className="font-display font-semibold text-xs text-slate-200">Knowledge Notes</span>
            <span className="text-[10px] block text-indigo-400 font-mono font-semibold">SEMANTIC INDEX</span>
          </div>
          <button 
            onClick={handleCreateNew}
            className="p-1 rounded bg-[#0A0C10] border border-slate-800/60 text-indigo-400 hover:text-white cursor-pointer hover:bg-indigo-600 transition-all"
            title="Create new note card"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Search filter input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search indexing..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0A0C10] border border-slate-800/60 py-1.5 pl-8 pr-3 rounded-lg text-[11px] focus:outline-none focus:border-indigo-500 text-white"
          />
        </div>

        {/* List of items */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-1.5">
          {filteredNotes.length === 0 ? (
            <p className="text-[11px] font-mono text-slate-500 text-center py-6">No records match query.</p>
          ) : (
            filteredNotes.map((n) => (
              <button
                key={n.id}
                onClick={() => handleSelectNote(n)}
                className={`p-3 rounded-xl text-left border flex flex-col gap-1 transition-all cursor-pointer ${
                  n.id === selectedNoteId 
                    ? "bg-[#0A0C10] border-indigo-505 text-indigo-300" 
                    : "bg-slate-900/10 border-slate-800/40 hover:bg-slate-800/20 text-slate-350"
                }`}
              >
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="font-semibold text-xs truncate w-full">{n.title || "Untitled Note"}</span>
                </div>
                <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 w-full mt-1">
                  <span>{n.category || "General"}</span>
                  <span>{new Date(n.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Editor Panel right side */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {selectedNote ? (
          <div className="flex-1 flex flex-col justify-between h-screen relative">
            
            {/* Header attributes configuration */}
            <div className="h-14 px-6 border-b border-slate-800/50 flex items-center justify-between bg-[#0D1117] select-none">
              <div className="flex items-center gap-4 flex-1">
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Note Title"
                  className="bg-transparent border-0 font-display font-semibold text-sm text-slate-200 focus:outline-none w-56 focus:border-b focus:border-indigo-500"
                />
                <input 
                  type="text" 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Category"
                  className="bg-[#0A0C10] border border-slate-800/80 py-1 px-2 text-[10px] text-slate-400 font-mono rounded w-32 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Toolbar button save / delete */}
              <div className="flex items-center gap-2">
                <button
                  onClick={syncOnSave}
                  disabled={saveLoading}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/10"
                >
                  {saveLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Save Note</span>
                </button>

                <button 
                  onClick={() => {
                    onDeleteNote(selectedNote.id);
                    setSelectedNoteId(notes[0]?.id || null);
                  }}
                  className="p-2 border border-rose-500/15 hover:border-rose-500 text-rose-450 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                  title="Wipe note card"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* AI Action Accelerator Toolbar right above text */}
            <div className="bg-[#0D1117] border-b border-slate-800/50 px-6 py-2 flex items-center justify-between select-none">
              <span className="font-mono text-[9px] font-bold text-slate-500 flex items-center gap-1.5 uppercase">
                <Sparkles className="w-3 h-3 text-indigo-400" /> Cognitive AI Co-Pilot Optimization Tools:
              </span>
              
              <div className="flex items-center gap-2">
                <button
                  disabled={aiLoading || !content.trim()}
                  onClick={() => handleAiRefinement("summarize")}
                  className="text-[10px] bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 font-semibold px-2 py-1 rounded cursor-pointer transition-all border border-indigo-500/20 flex items-center gap-1"
                >
                  {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  <span>AI Summarize</span>
                </button>

                <button
                  disabled={aiLoading || !content.trim()}
                  onClick={() => handleAiRefinement("professionalize")}
                  className="text-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-1 rounded cursor-pointer transition-all border border-emerald-500/20 flex items-center gap-1"
                >
                  {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Heading className="w-3 h-3" />}
                  <span>AI Professionalize</span>
                </button>

                <button
                  disabled={aiLoading || !content.trim()}
                  onClick={() => handleAiRefinement("study")}
                  className="text-[10px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-semibold px-2 py-1 rounded cursor-pointer transition-all border border-indigo-500/20 flex items-center gap-1"
                >
                  {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <HelpCircle className="w-3 h-3" />}
                  <span>AI Study Mode</span>
                </button>
              </div>
            </div>

            {/* Textarea Workspace Editor */}
            <div className="flex-1 p-6 relative bg-slate-950/5">
              {aiLoading && (
                <div className="absolute inset-0 bg-[#0A0C10]/80 backdrop-filter blur-[2px] z-20 flex flex-col items-center justify-center gap-2 select-none">
                  <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mb-1" />
                  <span className="text-xs text-indigo-300 font-mono tracking-wide">Gemini is rewriting ideas...</span>
                </div>
              )}
              <textarea 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your research, summarize thoughts, or drop technical keywords..."
                className="w-full h-full bg-transparent border-0 resize-none font-sans text-xs focus:ring-0 focus:outline-none leading-relaxed text-slate-100"
              />
            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center select-none text-center p-6 bg-[#0A0C10]">
            <FolderPlus className="w-10 h-10 text-slate-700 animate-pulse mb-3" />
            <h3 className="font-display font-semibold text-slate-300 text-sm">No notes selected</h3>
            <p className="text-xs text-slate-500 max-w-sm font-mono mt-1 leading-relaxed">
              Create a new notes card manually or select a listed card in the sidebar to initiate AI tools.
            </p>
            <button 
              onClick={handleCreateNew}
              className="mt-4 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/30 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all"
            >
              + Create Note Card
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
