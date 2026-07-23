"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";

const CloseIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    className="w-5 h-5">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const LogoutIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-4 h-4">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const SettingsModal = ({ isOpen, onClose, user }) => {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [form, setForm] = useState({
    name: user?.name || "",
    username: user?.username || "",
    bio: user?.bio || "Hey I'm using Neura",
  });

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });

      if (!res.ok) {
        throw new Error("Server failed to logout.");
      }

      router.push("/login");
    } catch (error) {
      console.error("Logout failed: ", error);
      setIsLoggingOut(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 md:p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            key="settings-modal"
            initial={{ opacity: 0, scale: 0.5, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 40 }}
            className="w-[95%] sm:w-full max-w-md bg-[#262626] rounded-2xl md:rounded-3xl shadow-[12px_12px_24px_#1a1a1a,-12px_-12px_24px_#323232,0_0_40px_rgba(0,0,0,0.5) overflow-hidden border border-white/5 flex flex-col max-h-[90dvh]">
            <div className="p-4 md:p-5 flex justify-between items-center border-b border-[#ace8cc]/5 shrink-0 bg-[#262626]">
              <h2 className="text-[#ace8cc] font-black text-lg md:text-xl tracking-wide relative group cursor-pointer">
                Settings
                <span className="absolute left-0 bottom-0 w-0 h-0.5 bg-[#ace8cc] transition-all duration-300 group-hover:w-full"></span>
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full text-[#ace8cc]/65 hover:text-red-500/80 hover:scale-130
                hover:rotate-180 transition-all duration-300 hover:backdrop-blur-sm ease-in-out">
                <CloseIcon />
              </button>
            </div>

            <div className="flex p-3 md:p-4 gap-2 md:gap-3 border-b border-white/5 shrink-0 overflow-x-auto">
              {["Profile", "Security", "Preferences"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 min-w-20 py-2 md:py-2.5 text-sm md:text-md font-bold tracking-widest uppercase rounded-xl transition-all duration-300 ease-in-out cursor-pointer relative group ${activeTab === tab ? "bg-[#323232] text-[#a7f3d0] shadow-[inset_2px_2px_4px_#1a1a1a,inset_-2px_-2px_4px_#3a3a3a]" : "text-neutral-500 hover:text-neutral-300"}`}>
                  {tab}
                  <span className="absolute left-0 bottom-0 w-0 group-hover:w-full h-0.5 bg-neutral-300 transition-all duration-300"></span>
                  <span className="absolute right-0 bottom-0 w-0.5 h-0 group-hover:h-1/2  bg-neutral-300 transition-all duration-300 delay-300"></span>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SettingsModal;
