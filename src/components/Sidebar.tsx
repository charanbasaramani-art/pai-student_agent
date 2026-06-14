import { 
  LayoutDashboard, 
  MessageSquare, 
  CheckSquare, 
  Target, 
  BookOpen, 
  Brain, 
  Search, 
  FileText, 
  BarChart3, 
  Settings, 
  LogOut,
  Sparkles,
  Bell,
  Check,
  Sun,
  Moon
} from "lucide-react";
import { User, AppNotification } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import brandLogo from "../assets/images/pai_expert_logo_1780840497065.png";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User | null;
  onLogout: () => void;
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onClearNotifications: () => void;
  currentTheme: "dark" | "light" | "system";
  onToggleTheme: () => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  user,
  onLogout,
  notifications,
  onMarkRead,
  onClearNotifications,
  currentTheme,
  onToggleTheme
}: SidebarProps) {
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "chat", label: "AI Study Assistant", icon: MessageSquare },
    { id: "tasks", label: "To-Do Manager", icon: CheckSquare },
    { id: "files", label: "Documents", icon: FileText },
    { id: "study_planner", label: "Study Planner", icon: Target },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="w-64 h-screen border-r border-slate-800/50 flex flex-col justify-between p-4 bg-[#0D1117] shrink-0 select-none relative z-30">
      {/* Upper Logo Section */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 border border-indigo-400 rounded-full overflow-hidden flex items-center justify-center shadow-md shadow-indigo-500/10">
              <img 
                src={brandLogo} 
                alt="PAI Agent Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <span className="font-display font-bold text-lg text-white tracking-wide">PAI</span>
              <span className="font-mono text-[9px] text-indigo-400 block -mt-[3px] font-semibold">STUDENT AGENT v2.0</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Notifications Button */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all duration-200 relative cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-[9px] text-white font-bold rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

            {/* Notifications Dropdown Window */}
            <AnimatePresence>
              {showNotifMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-10 top-0 w-80 bg-[#0A0C10] border border-slate-800 rounded-xl p-4 shadow-2xl z-50 text-slate-200"
                >
                  <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                    <span className="font-display font-medium text-sm text-indigo-200 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5" /> Notifications ({unreadCount})
                    </span>
                    {notifications.length > 0 && (
                      <button 
                        onClick={() => {
                          onClearNotifications();
                          setShowNotifMenu(false);
                        }}
                        className="text-[10px] text-slate-400 hover:text-indigo-300 transition-colors cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  <div className="max-h-60 overflow-y-auto flex flex-col gap-2">
                    {notifications.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-500 font-mono">
                        No recent active metrics.
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n.id} 
                          className={`p-2 rounded-lg text-xs transition-colors flex items-start justify-between gap-1.5 ${n.read ? "bg-[#0D1117] text-slate-400" : "bg-[#0D1117]/85 text-slate-200 border-l-2 border-indigo-500"}`}
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-indigo-300">{n.title}</span>
                            <span className="text-[11px] leading-relaxed text-slate-300">{n.content}</span>
                          </div>
                          {!n.read && (
                            <button 
                              onClick={() => onMarkRead(n.id)}
                              className="p-1 rounded hover:bg-slate-700 text-indigo-400 hover:text-white shrink-0 cursor-pointer"
                              title="Mark as read"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isSelected = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setShowNotifMenu(false);
                }}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-200 cursor-pointer group ${
                  isSelected 
                    ? "bg-indigo-600/10 border-l-2 border-indigo-500 text-white font-medium" 
                    : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isSelected ? "text-indigo-400" : "text-slate-400 group-hover:text-indigo-300"}`} />
                  <span className="tracking-wide">{item.label}</span>
                </div>

              </button>
            );
          })}
        </nav>
      </div>

      {/* User profile & Logout */}
      <div className="flex flex-col gap-4 border-t border-slate-800/50 pt-4">
        {user && (
          <div className="flex items-center justify-between px-1.5 gap-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center font-display font-bold text-white text-sm select-none shadow shadow-indigo-500/25 shrink-0">
                {user.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-white truncate max-w-[110px]">{user.fullName}</p>
                <p className="text-[10px] font-mono text-slate-400 truncate max-w-[110px]">{user.email}</p>
              </div>
            </div>
            
            {/* Theme Toggle Button beside profile */}
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-lg hover:bg-[#0A0C10] dark:hover:bg-slate-800 text-slate-400 hover:text-white transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0"
              title={`Switch to ${currentTheme === "dark" || currentTheme === "system" ? "light" : "dark"} theme`}
            >
              {currentTheme === "dark" || currentTheme === "system" ? (
                <Sun className="w-4 h-4 text-amber-500 hover:text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-500 hover:text-indigo-400" />
              )}
            </button>
          </div>
        )}
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200 w-full group cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-400 group-hover:-translate-x-0.5" />
          <span>Disconnect PAI</span>
        </button>
      </div>
    </div>
  );
}
