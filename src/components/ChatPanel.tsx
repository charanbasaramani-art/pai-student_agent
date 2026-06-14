import React, { useState, useRef, useEffect } from "react";
import { 
  Send, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  History, 
  Sparkles, 
  Info,
  Globe,
  Loader2,
  Trash2,
  Brain,
  AlertCircle
} from "lucide-react";
import { Conversation, User, Message } from "../types";
import AudioVisualizer from "./AudioVisualizer";
import { motion } from "motion/react";

interface ChatPanelProps {
  user: User | null;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSendMessage: (text: string, researchMode: boolean, thinkingMode: boolean) => Promise<void>;
  onClearHistory: () => void;
  loading: boolean;
  onSelectConversation: (id: string) => void;
  onStartNewConversation: () => void;
}

export default function ChatPanel({
  user,
  conversations,
  activeConversationId,
  onSendMessage,
  onClearHistory,
  loading,
  onSelectConversation,
  onStartNewConversation
}: ChatPanelProps) {
  const [inputText, setInputText] = useState("");
  const [researchMode, setResearchMode] = useState(false);
  const [thinkingMode, setThinkingMode] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(user?.preferences.speechEnabled ?? false);
  const [activeSpeakingMessageId, setActiveSpeakingMessageId] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const activeConv = conversations.find(c => c.id === activeConversationId);
  const messages = activeConv ? activeConv.messages : [];

  // Sync component soundEnabled with global speechEnabled pref
  useEffect(() => {
    setSoundEnabled(user?.preferences.speechEnabled ?? false);
  }, [user?.preferences.speechEnabled]);

  // Scroll to bottom on updates
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Sythesize nice web audio feedback clicks/beeps dynamically
  const playFeedbackChime = (type: "start" | "success" | "stop") => {
    const isFeedbackEnabled = user?.preferences.voiceFeedbackSoundsEnabled ?? true;
    if (!isFeedbackEnabled) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === "start") {
        osc.type = "sine";
        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === "success") {
        osc.type = "triangle";
        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.setValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === "stop") {
        osc.type = "sine";
        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(550, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch (e) {
      console.warn("Audio synthesis skipped due to user interaction state.", e);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || loading) return;

    const textToSend = inputText;
    setInputText("");
    await onSendMessage(textToSend, researchMode, thinkingMode);
  };

  // AI should never automatically speak responses.
  // Default behavior is text response only, and manual Speak button activation.

  const synthesizeSpeech = async (msgId: string, text: string) => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsSpeaking(false);
      setActiveSpeakingMessageId(null);
    }

    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        const cleanText = text.replace(/[*#`_\-]/g, "");
        const utterance = new SpeechSynthesisUtterance(cleanText.substring(0, 500));
        
        utterance.onstart = () => {
          setIsSpeaking(true);
          setActiveSpeakingMessageId(msgId);
        };
        utterance.onend = () => {
          setIsSpeaking(false);
          setActiveSpeakingMessageId(null);
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          setActiveSpeakingMessageId(null);
        };

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

        if (savedSelectedName) {
          matchedVoice = voices.find(v => v.name === savedSelectedName);
        }

        if (!matchedVoice && savedType !== "system") {
          const candidates = voices.filter(v => getVoiceGender(v) === savedType);
          if (candidates.length > 0) {
            matchedVoice = candidates[0];
          }
        }

        // Bug Fix #2: Alert user if fallback gets executed
        if (savedType === "female" && (!matchedVoice || getVoiceGender(matchedVoice) !== "female")) {
          const anyFemaleVoice = voices.find(v => getVoiceGender(v) === "female");
          if (anyFemaleVoice) {
            matchedVoice = anyFemaleVoice;
          } else {
            setVoiceNotice("Selected voice unavailable. Using closest available voice.");
            setTimeout(() => setVoiceNotice(null), 4000);
          }
        } else if (savedType === "male" && (!matchedVoice || getVoiceGender(matchedVoice) !== "male")) {
          const anyMaleVoice = voices.find(v => getVoiceGender(v) === "male");
          if (anyMaleVoice) {
            matchedVoice = anyMaleVoice;
          } else {
            setVoiceNotice("Selected voice unavailable. Using closest available voice.");
            setTimeout(() => setVoiceNotice(null), 4000);
          }
        }

        if (matchedVoice) {
          utterance.voice = matchedVoice;
        }

        window.speechSynthesis.speak(utterance);
        return;
      } catch (e) {
        console.warn("Speech Synthesis failed, falling back to API", e);
      }
    }

    try {
      const token = localStorage.getItem("pai_jwt_token");
      const cleanTextForTts = text.replace(/[*#`_\-]/g, "").substring(0, 300);

      setIsSpeaking(true);
      setActiveSpeakingMessageId(msgId);

      const response = await fetch("/api/voice/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ text: cleanTextForTts })
      });
      const data = await response.json();

      if (response.ok && data.audioBase64) {
        const snd = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
        audioRef.current = snd;
        snd.onended = () => {
          setIsSpeaking(false);
          setActiveSpeakingMessageId(null);
        };
        snd.onerror = () => {
          setIsSpeaking(false);
          setActiveSpeakingMessageId(null);
        };
        snd.play();
      } else {
        setIsSpeaking(false);
        setActiveSpeakingMessageId(null);
      }
    } catch (e) {
      setIsSpeaking(false);
      setActiveSpeakingMessageId(null);
    }
  };

  // Speak specific message action button
  const handleSpeakMessage = async (msgId: string, text: string) => {
    if (isSpeaking && activeSpeakingMessageId === msgId) {
      handleStopSpeech();
      return;
    }
    
    playFeedbackChime("start");
    await synthesizeSpeech(msgId, text);
  };

  // Copy message action button
  const handleCopyMessage = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(msgId);
    playFeedbackChime("success");
    setTimeout(() => {
      setCopiedMessageId(null);
    }, 2000);
  };

  // Regenerate message action button
  const handleRegenerateFromMessage = (msgId: string) => {
    const idx = messages.findIndex(m => m.id === msgId);
    if (idx === -1) return;

    let lastUserMsgContent = "";
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].sender === "user") {
        lastUserMsgContent = messages[i].content;
        break;
      }
    }

    if (lastUserMsgContent) {
      playFeedbackChime("start");
      onSendMessage(lastUserMsgContent, researchMode, thinkingMode);
    } else {
      alert("Could not find previous user prompt to regenerate the message.");
    }
  };

  // Speech commands recognition
  const toggleVoiceListen = () => {
    const isVoiceCmdEnabled = user?.preferences.voiceCommandsEnabled ?? true;
    if (!isVoiceCmdEnabled) {
      alert("Voice Commands input is disabled in configurations. Please activate it under configurations first.");
      return;
    }

    if (voiceActive) {
      setVoiceActive(false);
      playFeedbackChime("stop");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice command Speech Recognition is not supported by this browser.");
      return;
    }

    playFeedbackChime("start");

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = "en-US";
    recognition.interimResults = false;

    recognition.onstart = () => {
      setVoiceActive(true);
    };

    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInputText(transcript);
      setVoiceActive(false);
      playFeedbackChime("success");
    };

    recognition.onerror = () => {
      setVoiceActive(false);
    };

    recognition.onend = () => {
      setVoiceActive(false);
    };

    recognition.start();
  };

  // Purge any playing synthetic speaker audios
  const handleStopSpeech = () => {
    window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsSpeaking(false);
    setActiveSpeakingMessageId(null);
    playFeedbackChime("stop");
  };

  return (
    <div className="flex-1 h-screen flex border-r border-slate-800/50 bg-transparent">
      
      {/* Sessions History List Left Mini Rail */}
      <div className="w-56 h-screen border-r border-slate-800/50 p-3 bg-[#0D1117] flex flex-col justify-between select-none">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sessions</span>
            <button 
              onClick={onStartNewConversation}
              className="p-1 px-2 rounded hover:bg-indigo-600 bg-indigo-600/10 text-indigo-400 hover:text-white transition-all cursor-pointer text-[10px] font-semibold"
            >
              + New Chat
            </button>
          </div>
          
          <div className="flex flex-col gap-1 max-h-[70vh] overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="text-[11px] font-mono text-slate-500 py-3 text-center">No active rooms.</p>
            ) : (
              conversations.map(c => (
                <button
                  key={c.id}
                  onClick={() => onSelectConversation(c.id)}
                  className={`px-2.5 py-2 text-left rounded-lg text-xs truncate transition-all duration-150 cursor-pointer ${
                    c.id === activeConversationId 
                      ? "bg-[#0A0C10] text-indigo-300 font-semibold border-l-2 border-indigo-500" 
                      : "text-slate-400 hover:text-white hover:bg-[#0A0C10]/60"
                  }`}
                >
                  {c.title}
                </button>
              ))
            )}
          </div>
        </div>

        {conversations.length > 0 && (
          <button 
            onClick={onClearHistory}
            className="flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-mono text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10 rounded border border-rose-500/20 cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            Wipe Chat Records
          </button>
        )}
      </div>

      {/* Main Chat Stream View */}
      <div className="flex-1 flex flex-col justify-between h-screen relative">
        
        {/* Floating Voice playback notifications */}
        {voiceNotice && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 pointer-events-none transition-all">
            <div className="bg-[#0D1117]/95 border border-amber-500/40 p-3.5 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs text-amber-300 font-sans backdrop-blur select-none animate-pulse shadow-amber-500/5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-semibold tracking-wide uppercase font-mono text-[9px]">Acoustic Sync:</span>
              <span>{voiceNotice}</span>
            </div>
          </div>
        )}

        {/* Header toolbar */}
        <div className="h-14 px-6 border-b border-slate-800/50 flex items-center justify-between select-none bg-[#0D1117]">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-indigo-600/10 text-indigo-400 rounded-md flex items-center justify-center">
              <Sparkles className="w-3 h-3" />
            </div>
            <div>
              <span className="font-display font-medium text-sm text-slate-200">Personal AI Workspace</span>
              <span className="text-[10px] text-slate-500 ml-1.5 font-mono">MODEL: gemini-3.5-flash</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sound Switch */}
            <button
              onClick={() => {
                const updated = !soundEnabled;
                setSoundEnabled(updated);
                if (!updated) handleStopSpeech();
              }}
              className={`p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-white cursor-pointer`}
              title={soundEnabled ? "Disable Text-To-Speech" : "Enable Text-To-Speech"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-indigo-400" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Speach stopper */}
            {isSpeaking && (
              <button 
                onClick={handleStopSpeech}
                className="text-[10px] font-mono bg-rose-500/25 border border-rose-500/40 text-rose-300 px-2 py-1 rounded hover:bg-rose-500/40 cursor-pointer animate-pulse"
              >
                Mute Agent
              </button>
            )}
          </div>
        </div>

        {/* Message Feeds content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          {messages.length === 0 ? (
            <div className="m-auto max-w-sm text-center flex flex-col items-center gap-3 select-none">
              <div className="w-10 h-10 rounded-full bg-indigo-600/10 flex items-center justify-center text-indigo-400">
                <Brain className="w-5 h-5" />
              </div>
              <h3 className="font-display font-medium text-slate-200 text-sm">PAI Agent Space</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-mono">
                Initiate standard multi-turn communication. PAI keeps memories on-the-fly and processes active tools. Try typing "Search web for latest Space X flights."
              </p>
            </div>
          ) : (
            messages.map((m) => (
              <div 
                key={m.id} 
                className={`flex max-w-[85%] flex-col gap-1.5 rounded-xl p-4 text-xs leading-relaxed ${
                  m.sender === "user" 
                    ? "bg-indigo-600/10 border border-indigo-500/20 text-slate-150 self-end ml-12" 
                    : "bg-[#0D1117] border border-slate-800/50 text-slate-200 self-start mr-12"
                }`}
              >
                <div className="flex items-center gap-2 border-b border-white/5 pb-1 select-none text-[10px] font-mono text-slate-500">
                  <span className={m.sender === "user" ? "text-indigo-400 font-semibold" : "text-emerald-400 font-semibold"}>
                    {m.sender === "user" ? "OWNER" : "PAI AGENT"}
                  </span>
                  <span>•</span>
                  <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                
                {/* Message Body with standard line breaks support */}
                <div className="whitespace-pre-wrap leading-relaxed font-sans text-slate-100">
                  {m.content}
                </div>

                {/* Grounding web Sources citations */}
                {m.groundingSources && m.groundingSources.length > 0 && (
                  <div className="mt-3 border-t border-slate-800/50 pt-2 flex flex-col gap-1.5 select-all">
                    <span className="text-[10px] text-indigo-400 font-mono flex items-center gap-1 font-semibold">
                      <Globe className="w-3 h-3 text-emerald-400" /> Grounded Web Reference Citations:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {m.groundingSources.map((g, i) => (
                        <a 
                          key={i} 
                          href={g.uri} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 rounded bg-[#0A0C10] hover:bg-indigo-600/20 hover:text-white border border-slate-800 text-[10px] text-indigo-400 font-mono transition-colors flex items-center gap-1 shrink-0"
                        >
                          [{i + 1}] {g.title.substring(0, 30)}{g.title.length > 30 ? "..." : ""}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tools Used indicator */}
                {m.toolsUsed && m.toolsUsed.length > 0 && (
                  <div className="mt-2 text-[9px] text-slate-500 flex flex-wrap gap-1 select-none font-mono">
                    <span className="font-semibold text-indigo-400/80">CORE TOOLS:</span>
                    {m.toolsUsed.map((tool, idx) => (
                      <span key={idx} className="bg-[#0A0C10] px-1.5 py-0.5 rounded border border-slate-800 text-slate-400">
                        {tool}
                      </span>
                    ))}
                  </div>
                )}

                {/* Message action buttons */}
                {m.sender === "agent" && (
                  <div className="flex flex-wrap gap-2 mt-3 pt-2.5 border-t border-slate-800/40 select-none">
                    {isSpeaking && activeSpeakingMessageId === m.id ? (
                      <button
                        onClick={() => handleStopSpeech()}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 text-[11px] font-mono transition-all cursor-pointer animate-pulse"
                      >
                        🔇 Stop
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSpeakMessage(m.id, m.content)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0A0C10] hover:bg-[#151922] border border-slate-800 text-indigo-400 hover:text-white text-[11px] font-mono transition-all cursor-pointer"
                      >
                        🔊 Speak
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleCopyMessage(m.id, m.content)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0A0C10] hover:bg-[#151922] border border-slate-800 text-slate-400 hover:text-slate-200 text-[11px] font-mono transition-all cursor-pointer"
                    >
                      {copiedMessageId === m.id ? "✅ Copied!" : "📋 Copy"}
                    </button>

                    <button
                      onClick={() => handleRegenerateFromMessage(m.id)}
                      disabled={loading}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0A0C10] hover:bg-[#151922] border border-slate-800 text-indigo-400/80 hover:text-indigo-300 text-[11px] font-mono transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                    >
                      ↻ Regenerate
                    </button>
                  </div>
                )}
              </div>
            ))
          )}

          {loading && (
            <div className="flex items-center gap-2 p-4 text-xs font-mono text-slate-500 self-start select-none">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              <span>PAI is executing thoughts and synchronizing tools...</span>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Input Control Interface */}
        <div className="p-4 border-t border-slate-805 bg-[#0D1117] shadow-xl">
          
          {/* Quick toggle options & Visual frequency meter */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex flex-wrap items-center gap-4 select-none">
              <label className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 hover:text-white cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={researchMode}
                  onChange={(e) => setResearchMode(e.target.checked)}
                  className="rounded border-slate-800 bg-[#0A0C10] focus:ring-indigo-505 text-indigo-600 w-3.5 h-3.5 cursor-pointer"
                />
                <span className={researchMode ? "text-indigo-300 font-semibold" : ""}>Web Research Mode</span>
              </label>

              <label className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 hover:text-white cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={thinkingMode}
                  onChange={(e) => setThinkingMode(e.target.checked)}
                  className="rounded border-slate-800 bg-[#0A0C10] focus:ring-indigo-505 text-indigo-600 w-3.5 h-3.5 cursor-pointer"
                />
                <span className={thinkingMode ? "text-amber-400 font-semibold flex items-center gap-1 animate-pulse" : "flex items-center gap-1"}>
                  <Brain className={`w-3.5 h-3.5 ${thinkingMode ? "text-amber-400" : "text-slate-500"}`} /> High Thinking Mode
                </span>
              </label>

              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                <Info className="w-3 h-3 text-slate-600" />
                <span>{thinkingMode ? "Activates deep scholastic reasoning loops." : "Resolves standard student replies."}</span>
              </div>
            </div>

            {/* Pulse visual waves */}
            {(voiceActive || isSpeaking) && (
              <div className="w-48">
                <AudioVisualizer isActive={voiceActive} isSpeaking={isSpeaking} />
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="flex gap-2 relative">
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={voiceActive ? "Listening to your speech input..." : "Talk to PAI, explore insights, plan tasks..."}
              className="flex-1 bg-[#0A0C10] border border-slate-800/80 rounded-lg py-3 pl-4 pr-24 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
              disabled={loading || voiceActive}
            />
            
            {/* Action Group */}
            <div className="absolute right-3 top-2 flex items-center gap-1.5">
              
              {/* Mic Icon */}
              <button
                type="button"
                onClick={toggleVoiceListen}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  voiceActive 
                    ? "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30" 
                    : "hover:bg-slate-800 text-slate-400 hover:text-indigo-400"
                }`}
                title="Dictate message"
                disabled={loading}
              >
                {voiceActive ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>

              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white p-1.5 rounded-md shadow-md shadow-indigo-600/10 cursor-pointer disabled:opacity-40"
                disabled={!inputText.trim() || loading}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>

      </div>

    </div>
  );
}
