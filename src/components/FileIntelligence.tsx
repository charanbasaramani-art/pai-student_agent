import React, { useState, useRef } from "react";
import { FileMeta } from "../types";
import { 
  Upload, 
  FileText, 
  Trash2, 
  Compass, 
  BrainCircuit, 
  HelpCircle, 
  Send, 
  Loader2,
  FileCheck
} from "lucide-react";

interface FileIntelligenceProps {
  files: FileMeta[];
  onUploadFile: (name: string, size: number, type: string, base64Data: string) => Promise<void>;
  onDeleteFile: (id: string) => Promise<void>;
}

export default function FileIntelligence({ files, onUploadFile, onDeleteFile }: FileIntelligenceProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(files[0]?.id || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const [queryText, setQueryText] = useState("");
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryResponse, setQueryResponse] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedFile = files.find(f => f.id === selectedFileId);

  // File Upload base64 encoding helper
  const processUpload = (file: File) => {
    setUploading(true);
    setError("");

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const rawResult = reader.result as string;
        const base64Data = rawResult.split(",")[1]; // strip header
        
        await onUploadFile(file.name, file.size, file.type, base64Data);
        // Select newly completed document
        if (files.length > 0) {
          setSelectedFileId(files[files.length - 1].id);
        }
      } catch (err: any) {
        setError("Failed to digest document content: " + err.message);
      } finally {
        setUploading(false);
      }
    };

    reader.onerror = () => {
      setError("Failed to read file.");
      setUploading(false);
    };

    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUpload(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processUpload(e.target.files[0]);
    }
  };

  const triggerInputClick = () => {
    fileInputRef.current?.click();
  };

  const handleDocumentQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryText.trim() || !selectedFileId || queryLoading) return;

    setQueryLoading(true);
    setQueryResponse("");

    try {
      const token = localStorage.getItem("pai_jwt_token");
      const res = await fetch("/api/files/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          fileId: selectedFileId,
          query: queryText
        })
      });
      const data = await res.json();

      if (res.ok && data.answer) {
        setQueryResponse(data.answer);
      } else {
        setError(data.error || "Query failed.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setQueryLoading(false);
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto h-screen bg-transparent select-none">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        
        {/* Title */}
        <div className="flex items-center justify-between border-b border-slate-800/50 pb-4">
          <div>
            <h1 className="font-display font-medium text-lg text-white">File Intelligence & OCR</h1>
            <p className="text-xs text-slate-400 font-mono mt-1">COGNITIVE DOCUMENT RETRIEVAL & SUMMARIZATION</p>
          </div>
          <BrainCircuit className="w-5 h-5 text-indigo-400" />
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 text-rose-300 border border-rose-500/20 rounded-lg text-xs">
            {error}
          </div>
        )}

        {/* Dashboard Grid split structure */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          
          {/* File Picker & Drag and drop panel left column */}
          <div className="flex flex-col gap-4">
            
            {/* Dragn drop */}
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerInputClick}
              className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center gap-2 select-none cursor-pointer transition-all ${
                dragActive 
                  ? "border-indigo-500 bg-indigo-500/5" 
                  : "border-slate-800/60 bg-[#0D1117] hover:border-slate-700 hover:bg-slate-900/10"
              }`}
            >
              <input 
                ref={fileInputRef}
                type="file"
                onChange={handleInputChange}
                className="hidden"
                accept=".txt, .html, .css, .json, .js, .ts, image/*"
              />
              
              <div className="w-10 h-10 rounded-full bg-[#0A0C10] flex items-center justify-center text-slate-400 mb-1">
                {uploading ? <Loader2 className="w-5 h-5 animate-spin text-indigo-400" /> : <Upload className="w-5 h-5" />}
              </div>
              <span className="text-xs font-semibold text-slate-200">
                {uploading ? "Analyzing document details..." : "Drag files here or click to browse"}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Supports TXT, JS, HTML, SVG, PNG, JPG</span>
            </div>

            {/* List of digested files */}
            <div className="bg-[#0D1117] border border-slate-800/50 p-4.5 rounded-xl flex flex-col gap-3 shadow-sm">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Digested Corpus ({files.length})</span>
              
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                {files.length === 0 ? (
                  <p className="text-[11px] font-mono text-slate-500 text-center py-4">No uploads processed.</p>
                ) : (
                  files.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        setSelectedFileId(f.id);
                        setQueryResponse("");
                      }}
                      className={`p-2.5 rounded-lg text-xs border text-left truncate flex items-center justify-between gap-1 transition-all cursor-pointer ${
                        f.id === selectedFileId 
                          ? "bg-[#0A0C10] border-indigo-505 text-indigo-300 font-semibold" 
                          : "bg-slate-950/20 border-slate-900/60 hover:bg-slate-900/30 text-slate-400"
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileCheck className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="truncate max-w-40">{f.name}</span>
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteFile(f.id);
                          setSelectedFileId(files[0]?.id || null);
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-[#0A0C10]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </button>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Active file analysis & QA room right column (Takes 2 grid cols) */}
          <div className="md:col-span-2 flex flex-col gap-6">
            {selectedFile ? (
              <div className="flex flex-col gap-5 select-text">
                
                {/* Summary Box */}
                <div className="bg-[#0D1117] border border-slate-800/50 p-5 rounded-xl flex flex-col gap-3 shadow-sm">
                  <div className="border-b border-white/5 pb-2.5 select-none flex items-center justify-between">
                    <h3 className="font-display font-semibold text-xs text-slate-200 flex items-center gap-1.5 uppercase">
                      <FileText className="w-4 h-4 text-indigo-400" /> Document Executive Analysis Summary: {selectedFile.name}
                    </h3>
                    <span className="text-[9px] font-mono text-slate-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB • OCR active
                    </span>
                  </div>

                  <div className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-300">
                    {selectedFile.contentSummary || "AI summary compilation was bypassed for this element."}
                  </div>
                </div>

                {/* Cognitive QA search */}
                <div className="bg-[#0D1117] border border-slate-800/50 p-5 rounded-xl flex flex-col gap-4 shadow-sm">
                  <div className="border-b border-slate-800/50 pb-2 flex gap-1.5 items-center select-none text-slate-300">
                    <HelpCircle className="w-4 h-4 text-indigo-400" />
                    <span className="font-display font-semibold text-xs">Document Context Q&A Console</span>
                  </div>

                  <form onSubmit={handleDocumentQuery} className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Ask any factual question about this document..."
                      value={queryText}
                      onChange={(e) => setQueryText(e.target.value)}
                      className="flex-1 bg-[#0A0C10] border border-slate-800/80 rounded-lg py-2.5 px-4 text-xs text-white focus:outline-none focus:border-indigo-550"
                      required
                    />
                    <button
                      type="submit"
                      disabled={queryLoading || !queryText.trim()}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white p-2.5 rounded-lg flex items-center justify-center cursor-pointer transition-colors shadow-lg shadow-indigo-600/10"
                    >
                      {queryLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </form>

                  {/* QA response */}
                  {queryResponse && (
                    <div className="p-4 rounded-xl bg-[#0A0C10] border border-slate-800/60 flex flex-col gap-2 relative">
                      <span className="text-[9px] font-mono text-indigo-400 font-semibold select-none">INVESTIGATOR ANSWER:</span>
                      <p className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-300">
                        {queryResponse}
                      </p>
                    </div>
                  )}

                  {queryLoading && (
                    <div className="text-center py-4 flex flex-col items-center gap-1 font-mono text-[10px] text-slate-500 select-none">
                      <Loader2 className="w-4.5 h-4.5 animate-spin text-indigo-400" />
                      <span>Investigating details, matching schemas, looking up facts...</span>
                    </div>
                  )}

                </div>

              </div>
            ) : (
              <div className="text-center py-24 bg-[#0D1117] border border-slate-800/50 rounded-xl select-none text-slate-500 font-mono text-xs shadow-sm">
                No active document selected. Upload files or select an indexing in the mini sidebar.
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
