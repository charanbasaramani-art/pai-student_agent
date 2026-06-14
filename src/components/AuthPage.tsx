import React, { useState } from "react";
import { Sparkles, Mail, Lock, User as UserIcon, LogIn, UserPlus, Eye, EyeOff } from "lucide-react";
import { motion } from "motion/react";
import brandLogo from "../assets/images/pai_expert_logo_1780840497065.png";

interface AuthPageProps {
  onAuthSuccess: (token: string) => void;
}

export default function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const url = isLogin ? "/api/auth/login" : "/api/auth/register";
    const body = isLogin 
      ? { email, password } 
      : { email, password, fullName };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      if (isLogin) {
        localStorage.setItem("pai_jwt_token", data.token);
        localStorage.setItem("local_pai_credentials", JSON.stringify({ email, password, fullName: data.user?.fullName || "PAI Student" }));
        if (data.wasAutoRegistered) {
          localStorage.setItem("local_pai_needs_restore", "true");
        }
        onAuthSuccess(data.token);
      } else {
        localStorage.setItem("local_pai_credentials", JSON.stringify({ email, password, fullName }));
        // Register successful, toggle to login immediately
        setIsLogin(true);
        setPassword("");
        setError("Account registered successfully! Please log in.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#0A0C10] flex items-center justify-center p-4 relative overflow-hidden select-none animate-fade-in animate-duration-500">
      {/* Background glowing blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-3xl" />

      {/* Auth Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md bg-[#0D1117] rounded-3xl p-8 border border-slate-800/80 shadow-2xl relative z-10 glass-panel-glow"
      >
        <div className="text-center mb-6">
          <div className="inline-flex w-24 h-24 rounded-full border-2 border-indigo-400 p-1 bg-slate-950/40 items-center justify-center shadow-lg shadow-indigo-500/15 mb-4">
            <img 
              src={brandLogo} 
              alt="PAI Agent Human-AI Collaboration Logo" 
              className="w-full h-full rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="font-display font-bold text-2xl text-white tracking-tight flex items-center justify-center gap-1.5">
            PAI <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-indigo-500/15 text-indigo-300 font-normal">Student Mentor</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">RESEARCH & STUDY AI COMPANION</p>
        </div>

        {error && (
          <div className={`p-3 rounded-lg text-xs leading-relaxed mb-5 ${error.includes("successfully") ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" : "bg-rose-500/10 text-rose-300 border border-rose-500/20"}`}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!isLogin && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono font-semibold text-slate-400">FULL NAME</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter full name"
                  className="w-full bg-[#0A0C10] border border-slate-800 rounded-lg py-3 pl-10 pr-4 text-xs font-sans text-white focus:outline-none focus:border-indigo-500 focus:bg-slate-950 transition-all duration-200"
                  required
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-mono font-semibold text-slate-400">EMAIL ADDRESS</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@pai.agent"
                className="w-full bg-[#0A0C10] border border-slate-800 rounded-lg py-3 pl-10 pr-4 text-xs font-sans text-white focus:outline-none focus:border-indigo-500 focus:bg-slate-950 transition-all duration-200"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-mono font-semibold text-slate-400">PASSWORD</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="******"
                className="w-full bg-[#0A0C10] border border-slate-800 rounded-lg py-3 pl-10 pr-10 text-xs font-sans text-white focus:outline-none focus:border-indigo-500 focus:bg-slate-950 transition-all duration-200"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 w-5 h-5 text-slate-500 hover:text-indigo-400 cursor-pointer flex items-center justify-center focus:outline-none"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white font-medium text-xs py-3.5 rounded-lg flex items-center justify-center gap-2 mt-2 hover:bg-indigo-500 active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-indigo-600/10"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isLogin ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Initialize Platform Session</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Establish Core Register</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-6 border-t border-slate-800/50 pt-4">
          <button 
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }}
            className="text-xs text-slate-400 hover:text-indigo-300 font-mono tracking-wide cursor-pointer ml-1 transition-all text-center mx-auto block"
          >
            {isLogin ? "CREATE A NEW CREDENTIAL INSTANCE" : "RETRIEVE ACCESS CREDENTIAL CONSOLE"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
