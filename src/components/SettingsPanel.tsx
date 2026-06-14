import React, { useState } from "react";
import { User } from "../types";
import { Settings, User as UserIcon, Volume2, Shield, Loader2, Sparkles, AlertCircle, Sun, Moon, Laptop, Search, Lock } from "lucide-react";

interface SettingsPanelProps {
  user: User | null;
  onUpdatePreferences: (prefs: Partial<User["preferences"]>) => Promise<void>;
  onClearHistory: () => void;
}

export default function SettingsPanel({ user, onUpdatePreferences, onClearHistory }: SettingsPanelProps) {
  const [theme, setTheme] = useState(user?.preferences.theme || localStorage.getItem("pai_theme") || "dark");
  const [voiceName, setVoiceName] = useState(user?.preferences.voiceName || "Zephyr");
  const [speechEnabled, setSpeechEnabled] = useState(user?.preferences.speechEnabled ?? false);
  const [voiceCommandsEnabled, setVoiceCommandsEnabled] = useState(user?.preferences.voiceCommandsEnabled ?? true);
  const [voiceFeedbackSoundsEnabled, setVoiceFeedbackSoundsEnabled] = useState(user?.preferences.voiceFeedbackSoundsEnabled ?? true);
  const [agentPersonality, setAgentPersonality] = useState(user?.preferences.agentPersonality || "");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  // Password Change States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState("");

  const [voiceType, setVoiceType] = useState<"male" | "female" | "system">(
    ((localStorage.getItem("pai_voice_type") || user?.preferences?.voiceType || "system") as any)
  );
  const [voiceSelected, setVoiceSelected] = useState<string>(
    localStorage.getItem("pai_voice_selected") || user?.preferences?.voiceSelected || ""
  );
  const [voiceRate, setVoiceRate] = useState<number>(
    localStorage.getItem("pai_voice_rate") ? parseFloat(localStorage.getItem("pai_voice_rate")!) : (user?.preferences?.voiceRate ?? 1.0)
  );
  const [voicePitch, setVoicePitch] = useState<number>(
    localStorage.getItem("pai_voice_pitch") ? parseFloat(localStorage.getItem("pai_voice_pitch")!) : (user?.preferences?.voicePitch ?? 1.0)
  );
  const [voiceVolume, setVoiceVolume] = useState<number>(
    localStorage.getItem("pai_voice_volume") ? parseFloat(localStorage.getItem("pai_voice_volume")!) : (user?.preferences?.voiceVolume ?? 1.0)
  );

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceSearch, setVoiceSearch] = useState("");
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const loadVoices = () => {
        const list = window.speechSynthesis.getVoices();
        setVoices(list);
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  React.useEffect(() => {
    if (user?.preferences?.theme) {
      setTheme(user.preferences.theme);
    }
    if (user?.preferences) {
      setVoiceName(user.preferences.voiceName || "Zephyr");
      setSpeechEnabled(user.preferences.speechEnabled ?? false);
      setVoiceCommandsEnabled(user.preferences.voiceCommandsEnabled ?? true);
      setVoiceFeedbackSoundsEnabled(user.preferences.voiceFeedbackSoundsEnabled ?? true);
      
      const savedType = localStorage.getItem("pai_voice_type") || user.preferences.voiceType || "system";
      const savedSelected = localStorage.getItem("pai_voice_selected") || user.preferences.voiceSelected || "";
      const savedRate = localStorage.getItem("pai_voice_rate") ? parseFloat(localStorage.getItem("pai_voice_rate")!) : (user.preferences.voiceRate ?? 1.0);
      const savedPitch = localStorage.getItem("pai_voice_pitch") ? parseFloat(localStorage.getItem("pai_voice_pitch")!) : (user.preferences.voicePitch ?? 1.0);
      const savedVolume = localStorage.getItem("pai_voice_volume") ? parseFloat(localStorage.getItem("pai_voice_volume")!) : (user.preferences.voiceVolume ?? 1.0);

      setVoiceType(savedType as any);
      setVoiceSelected(savedSelected);
      setVoiceRate(savedRate);
      setVoicePitch(savedPitch);
      setVoiceVolume(savedVolume);
    }
  }, [user?.preferences]);

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

  const displayVoices = voices.filter(v => {
    const term = voiceSearch.toLowerCase();
    const matchesSearch = v.name.toLowerCase().includes(term) || v.lang.toLowerCase().includes(term);
    if (!matchesSearch) return false;
    if (voiceType === "system") return true;
    return getVoiceGender(v) === voiceType;
  });

  // Safe initialization: Only runs when voices populate, and avoids flipping during active typing searches
  React.useEffect(() => {
    if (voices.length > 0) {
      const savedSel = localStorage.getItem("pai_voice_selected") || user?.preferences?.voiceSelected || voiceSelected;
      if (savedSel && voices.some(v => v.name === savedSel)) {
        setVoiceSelected(savedSel);
      } else {
        const compatible = voices.find(v => voiceType === "system" || getVoiceGender(v) === voiceType);
        if (compatible) {
          setVoiceSelected(compatible.name);
        } else {
          setVoiceSelected(voices[0].name);
        }
      }
    }
  }, [voices, voiceType]);

  const handleTestVoice = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    
    window.speechSynthesis.cancel();
    
    if (isTestingVoice) {
      setIsTestingVoice(false);
      return;
    }

    const testText = "Hello, I am your PAI Study Assistant.";
    const utterance = new SpeechSynthesisUtterance(testText);
    
    const voicesList = window.speechSynthesis.getVoices();
    let selectedObj = voicesList.find(v => v.name === voiceSelected);
    
    if (!selectedObj && voiceType !== "system") {
      selectedObj = voicesList.find(v => getVoiceGender(v) === voiceType);
    }

    if (voiceType === "female" && (!selectedObj || getVoiceGender(selectedObj) !== "female")) {
      setStatus("Selected voice unavailable. Using closest available voice.");
      // Attempt to find any female voice as closest
      const femaleFallback = voicesList.find(v => getVoiceGender(v) === "female");
      if (femaleFallback) {
        selectedObj = femaleFallback;
      }
    }
    
    if (selectedObj) {
      utterance.voice = selectedObj;
    }
    
    utterance.rate = voiceRate;
    utterance.pitch = voicePitch;
    utterance.volume = voiceVolume;
    
    utterance.onstart = () => setIsTestingVoice(true);
    utterance.onend = () => setIsTestingVoice(false);
    utterance.onerror = () => setIsTestingVoice(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus("");

    try {
      await onUpdatePreferences({
        theme,
        voiceName,
        speechEnabled,
        voiceCommandsEnabled,
        voiceFeedbackSoundsEnabled,
        agentPersonality,
        voiceType,
        voiceSelected,
        voiceRate,
        voicePitch,
        voiceVolume
      });
      // Store in local storage to prevent loss between tab navigation and refreshes
      localStorage.setItem("pai_theme", theme);
      localStorage.setItem("pai_voice_type", voiceType);
      localStorage.setItem("pai_voice_selected", voiceSelected);
      localStorage.setItem("pai_voice_rate", String(voiceRate));
      localStorage.setItem("pai_voice_pitch", String(voicePitch));
      localStorage.setItem("pai_voice_volume", String(voiceVolume));

      setStatus("Preferences stored securely in DB and Local Storage.");
    } catch (err: any) {
      setStatus("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus("");
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordStatus("Error: All fields are required.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus("Error: New passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordStatus("Error: New password must be at least 6 characters.");
      return;
    }

    setPasswordLoading(true);

    try {
      const token = localStorage.getItem("pai_jwt_token");
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Password change failed.");
      }

      // Also update local_pai_credentials if they exist so backend restarts don't revert to old pass
      const localCredsStr = localStorage.getItem("local_pai_credentials");
      if (localCredsStr) {
        try {
          const localCreds = JSON.parse(localCredsStr);
          if (localCreds) {
            localCreds.password = newPassword;
            localStorage.setItem("local_pai_credentials", JSON.stringify(localCreds));
          }
        } catch (e) {
          console.error("Failed to update credentials in sync storage", e);
        }
      }

      setPasswordStatus("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordStatus("Error: " + err.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto h-screen bg-transparent select-none">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        
        {/* Title */}
        <div className="flex items-center justify-between border-b border-slate-800/50 pb-4">
          <div>
            <h1 className="font-display font-medium text-lg text-white">Platform Configurations</h1>
            <p className="text-xs text-slate-400 font-mono mt-1">MANAGE SECURITY KEYWORDS, PREFERENCES, AND CHARACTER ROLES</p>
          </div>
          <Settings className="w-5 h-5 text-indigo-400 grow-0 shrink-0" />
        </div>

        {status && (
          <div className={`p-3 rounded-lg text-xs leading-relaxed ${status.includes("Error") ? "bg-rose-500/10 text-rose-300 border border-rose-500/20" : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"}`}>
            {status}
          </div>
        )}

        <div className="flex flex-col gap-6">
          
          {/* Section 1: Change Password */}
          <div className="bg-[#0D1117] border border-slate-800/50 p-5 rounded-xl flex flex-col gap-4 shadow-sm">
            <h3 className="font-display font-semibold text-xs text-slate-200 uppercase flex items-center gap-2 select-none">
              <Lock className="w-4 h-4 text-indigo-400" /> Change Password
            </h3>

            {passwordStatus && (
              <div className={`p-3 rounded-lg text-xs leading-relaxed ${passwordStatus.includes("Error") ? "bg-rose-500/10 text-rose-300 border border-rose-500/20" : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"}`}>
                {passwordStatus}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono font-semibold text-slate-400 select-none">CURRENT PASSWORD</label>
                  <input 
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#0A0C10] border border-slate-800/80 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono font-semibold text-slate-400 select-none">NEW PASSWORD</label>
                  <input 
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full bg-[#0A0C10] border border-slate-800/80 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono font-semibold text-slate-400 select-none">CONFIRM NEW PASSWORD</label>
                  <input 
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#0A0C10] border border-slate-800/80 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-6 rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-lg shadow-indigo-600/10"
                >
                  {passwordLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Change Password</span>
                </button>
              </div>
            </form>
          </div>

          {/* Section 3: Identity Specs */}
          <div className="bg-[#0D1117] border border-slate-800/50 p-5 rounded-xl flex flex-col gap-4 shadow-sm">
            <h3 className="font-display font-semibold text-xs text-slate-200 uppercase flex items-center gap-2 select-none">
              <UserIcon className="w-4 h-4 text-amber-400" /> Identity Specification
            </h3>

            <div className="flex flex-col gap-2.5 text-xs text-slate-400 leading-relaxed">
              <div className="flex justify-between items-center bg-[#0A0C10] p-2.5 rounded border border-slate-800/50">
                <span className="font-mono text-slate-500">FullName Signature:</span>
                <span className="text-slate-300 font-bold">{user?.fullName}</span>
              </div>

              <div className="flex justify-between items-center bg-[#0A0C10] p-2.5 rounded border border-slate-800/50">
                <span className="font-mono text-slate-500">Primary Domain Email:</span>
                <span className="text-slate-300 font-bold">{user?.email}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Section 4: Advanced developer triggers */}
        <div className="mt-4 border-t border-rose-500/10 pt-6 select-none">
          <div className="p-4 rounded-xl border border-rose-500/10 bg-rose-500/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex gap-2.5 items-start">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="font-display font-semibold text-xs text-rose-300">Danger Zone Wipes</span>
                <span className="text-[10px] text-slate-500 font-mono leading-relaxed max-w-sm mt-0.5">
                  This action permanently destroys conversation trees and indices on Express local data pools. This is irreversible.
                </span>
              </div>
            </div>

            <button 
              onClick={() => {
                if (confirm("Are you sure you want to permanently clear your chat logs?")) {
                  onClearHistory();
                  alert("Chat records purged.");
                }
              }}
              className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600 border border-rose-700/30 hover:text-white text-rose-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0"
            >
              Wipe Core Registries
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
