"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

// ─── SVG ICONS ──────────────────────────────────────────────────────────
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
const ChevronLeftIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    className="w-6 h-6">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const ChevronRightIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    className="w-5 h-5 opacity-50">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
const LogoutIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    className="w-5 h-5">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
const SecurityIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-5 h-5">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const PaletteIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-5 h-5">
    <circle cx="12" cy="12" r="10" />
    <circle cx="8" cy="10" r="1.5" />
    <circle cx="12" cy="7" r="1.5" />
    <circle cx="16" cy="10" r="1.5" />
    <path d="M12 22v-3a2 2 0 0 1 2-2h4" />
  </svg>
);

const SettingsModal = ({ isOpen, onClose }) => {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeView, setActiveView] = useState("main");

  // ─── STATE ───
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [form, setForm] = useState({
    name: "",
    username: "",
    bio: "",
    email: "",
    phoneNumber: "",
    avatar: "",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // ─── FETCH PROFILE ON OPEN ───

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoadingProfile(true);
      try {
        // 🚨 CHECK THIS URL!
        // If your file is at 'app/api/me/route.js', change this to "/api/me"
        // If your file is at 'app/api/users/me/route.js', leave it as "/api/users/me"
        const res = await fetch("/api/auth/me");

        // 🛡️ SAFETY CHECK: Did the server return HTML instead of JSON?
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error(
            `API returned HTML instead of JSON. Check if the API route path is correct!`,
          );
        }

        const data = await res.json();

        if (data.success && data.user) {
          setForm({
            name: data.user.name || "",
            username: data.user.username || "",
            bio: data.user.bio || "Hey I'm using Neura",
            email: data.user.email || "",
            phoneNumber: data.user.phoneNumber || "",
            avatar: data.user.avatar || "",
          });
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      setActiveView("main");
      fetchProfile();
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // ─── SAVE PROFILE HANDLER ───
  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          bio: form.bio,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to save profile");
      }

      setActiveView("main"); // Slide back to main menu
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // ─── LOGOUT HANDLER ───
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) throw new Error("Server failed to logout.");
      router.push("/login");
    } catch (error) {
      console.error("Logout failed: ", error);
      setIsLoggingOut(false);
    }
  };

  const viewVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { type: "spring", stiffness: 300, damping: 25 },
    },
    exit: { opacity: 0, x: -20, transition: { duration: 0.15 } },
  };

  if (!mounted) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 md:p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            key="settings-modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-[95%] sm:w-full max-w-md bg-[#262626] rounded-2xl md:rounded-3xl shadow-[12px_12px_24px_#1a1a1a,-12px_-12px_24px_#323232,0_0_40px_rgba(0,0,0,0.5)] overflow-hidden border border-white/5 flex flex-col max-h-[90dvh]">
            {/* ─── DYNAMIC HEADER ─── */}
            <div className="p-4 md:p-5 flex justify-between items-center border-b border-[#ace8cc]/10 shrink-0 bg-[#262626] z-10">
              <div className="flex items-center gap-2">
                {activeView !== "main" && (
                  <button
                    onClick={() => setActiveView("main")}
                    className="p-1 -ml-2 text-neutral-400 hover:text-[#ace8cc] transition-colors">
                    <ChevronLeftIcon />
                  </button>
                )}
                <h2 className="text-[#ace8cc] font-black text-lg md:text-xl tracking-wide capitalize">
                  {activeView === "main" ? "Settings" : activeView}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 -mr-2 rounded-full text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-300">
                <CloseIcon />
              </button>
            </div>

            {/* ─── SCROLLABLE CONTENT AREA ─── */}
            <div className="flex-1 overflow-x-hidden overflow-y-auto custom-scrollbar relative bg-[#262626] min-h-[350px]">
              {isLoadingProfile ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4 py-20">
                  <div className="w-8 h-8 border-4 border-[#323232] border-t-[#ace8cc] rounded-full animate-spin"></div>
                  <p className="text-neutral-500 font-bold tracking-widest text-xs uppercase animate-pulse">
                    Loading Profile...
                  </p>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  {/* ─── VIEW 1: MAIN MENU ─── */}
                  {activeView === "main" && (
                    <motion.div
                      key="main"
                      variants={viewVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="flex flex-col p-3 md:p-4 gap-2">
                      <button
                        onClick={() => setActiveView("profile")}
                        className="flex items-center gap-4 p-4 rounded-2xl bg-[#262626] shadow-[4px_4px_8px_#1a1a1a,-4px_-4px_8px_#323232] hover:shadow-[inset_2px_2px_4px_#1a1a1a,inset_-2px_-2px_4px_#323232] transition-all group w-full text-left mb-4">
                        <div className="w-16 h-16 rounded-full bg-[#323232] shadow-inner flex items-center justify-center text-[#ecfdf5] font-black text-2xl shrink-0 overflow-hidden">
                          {form.avatar ? (
                            <img
                              src={form.avatar}
                              alt="Profile"
                              className="w-full h-full object-cover"
                            />
                          ) : form.name ? (
                            form.name.charAt(0).toUpperCase()
                          ) : (
                            "?"
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-[#ecfdf5] font-bold text-lg truncate group-hover:text-[#a7f3d0] transition-colors">
                            {form.name || "Your Name"}
                          </h3>
                          <p className="text-neutral-400 text-xs truncate mt-0.5 font-light">
                            {form.bio}
                          </p>
                        </div>
                        <div className="shrink-0 text-neutral-500 group-hover:text-[#a7f3d0] transition-colors">
                          <ChevronRightIcon />
                        </div>
                      </button>

                      <div className="flex flex-col gap-3">
                        <button
                          onClick={() => setActiveView("security")}
                          className="flex items-center gap-4 p-4 rounded-xl bg-[#262626] shadow-[4px_4px_8px_#1a1a1a,-4px_-4px_8px_#323232] hover:shadow-[inset_2px_2px_4px_#1a1a1a,inset_-2px_-2px_4px_#323232] transition-all group text-left">
                          <div className="text-neutral-400 group-hover:text-[#ace8cc]">
                            <SecurityIcon />
                          </div>
                          <span className="flex-1 font-bold text-sm text-neutral-300 group-hover:text-[#ecfdf5]">
                            Security & Privacy
                          </span>
                          <ChevronRightIcon />
                        </button>
                        <button
                          onClick={() => setActiveView("preferences")}
                          className="flex items-center gap-4 p-4 rounded-xl bg-[#262626] shadow-[4px_4px_8px_#1a1a1a,-4px_-4px_8px_#323232] hover:shadow-[inset_2px_2px_4px_#1a1a1a,inset_-2px_-2px_4px_#323232] transition-all group text-left">
                          <div className="text-neutral-400 group-hover:text-[#ace8cc]">
                            <PaletteIcon />
                          </div>
                          <span className="flex-1 font-bold text-sm text-neutral-300 group-hover:text-[#ecfdf5]">
                            Theme & Preferences
                          </span>
                          <ChevronRightIcon />
                        </button>
                        <div className="h-px bg-white/5 my-2 w-full"></div>
                        <button
                          onClick={handleLogout}
                          disabled={isLoggingOut}
                          className="flex items-center gap-4 p-4 rounded-xl bg-[#262626] shadow-[4px_4px_8px_#1a1a1a,-4px_-4px_8px_#323232] hover:shadow-[inset_2px_2px_4px_#1a1a1a,inset_-2px_-2px_4px_#323232] transition-all group text-left disabled:opacity-50">
                          <div className="text-rose-400 group-hover:text-rose-500">
                            <LogoutIcon />
                          </div>
                          <span className="flex-1 font-bold text-sm text-rose-400 group-hover:text-rose-500 tracking-wide">
                            {isLoggingOut ? "Logging out..." : "Log Out"}
                          </span>
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* ─── VIEW 2: PROFILE EDITOR ─── */}
                  {activeView === "profile" && (
                    <motion.div
                      key="profile"
                      variants={viewVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="p-4 md:p-5">
                      <form
                        onSubmit={handleSave}
                        className="space-y-4 md:space-y-5">
                        <div className="flex flex-col items-center justify-center mb-6">
                          <div className="w-24 h-24 rounded-full bg-[#323232] shadow-[4px_4px_8px_#1a1a1a,-4px_-4px_8px_#3a3a3a] flex items-center justify-center text-[#ecfdf5] font-black text-4xl mb-4 border border-white/5 overflow-hidden">
                            {form.avatar ? (
                              <img
                                src={form.avatar}
                                alt="Profile"
                                className="w-full h-full object-cover"
                              />
                            ) : form.name ? (
                              form.name.charAt(0).toUpperCase()
                            ) : (
                              "?"
                            )}
                          </div>
                          <button
                            type="button"
                            className="text-xs font-bold text-[#ace8cc] tracking-wider hover:underline hover:text-[#a7f3d0]">
                            Edit Avatar
                          </button>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest pl-1 mb-1.5 block">
                              Display Name
                            </label>
                            <input
                              type="text"
                              value={form.name}
                              onChange={(e) =>
                                setForm({ ...form, name: e.target.value })
                              }
                              className="w-full bg-[#1a1a1a] border-none rounded-xl p-3.5 text-[#ecfdf5] text-base md:text-sm outline-none shadow-[inset_4px_4px_8px_#0f0f0f,inset_-4px_-4px_8px_#252525] focus:shadow-[inset_2px_2px_4px_#0f0f0f,inset_-2px_-2px_4px_#252525] transition-all"
                            />
                          </div>
                          <div>
                            <label className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest pl-1 mb-1.5 block">
                              Username
                            </label>
                            <input
                              type="text"
                              value={form.username}
                              disabled
                              className="w-full bg-[#262626] border-none rounded-xl p-3.5 text-neutral-500 text-base md:text-sm outline-none shadow-[inset_2px_2px_4px_#1a1a1a,inset_-2px_-2px_4px_#323232] cursor-not-allowed"
                            />
                          </div>
                          <div>
                            <label className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest pl-1 mb-1.5 block">
                              Email Address
                            </label>
                            <input
                              type="email"
                              value={form.email}
                              disabled
                              className="w-full bg-[#262626] border-none rounded-xl p-3.5 text-neutral-500 text-base md:text-sm outline-none shadow-[inset_2px_2px_4px_#1a1a1a,inset_-2px_-2px_4px_#323232] cursor-not-allowed"
                            />
                            <p className="text-[9px] text-neutral-600 mt-1.5 pl-1">
                              Email changes require security verification.
                            </p>
                          </div>
                          {form.phoneNumber && (
                            <div>
                              <label className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest pl-1 mb-1.5 block">
                                Phone Number
                              </label>
                              <input
                                type="tel"
                                value={form.phoneNumber}
                                disabled
                                className="w-full bg-[#262626] border-none rounded-xl p-3.5 text-neutral-500 text-base md:text-sm outline-none shadow-[inset_2px_2px_4px_#1a1a1a,inset_-2px_-2px_4px_#323232] cursor-not-allowed"
                              />
                            </div>
                          )}
                          <div>
                            <label className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest pl-1 mb-1.5 block">
                              About You
                            </label>
                            <textarea
                              value={form.bio}
                              onChange={(e) =>
                                setForm({ ...form, bio: e.target.value })
                              }
                              rows={3}
                              className="w-full bg-[#1a1a1a] border-none rounded-xl p-3.5 text-[#ecfdf5] text-base md:text-sm outline-none shadow-[inset_4px_4px_8px_#0f0f0f,inset_-4px_-4px_8px_#252525] resize-none custom-scrollbar"
                            />
                          </div>
                        </div>

                        <div className="pt-2">
                          <button
                            type="submit"
                            disabled={isSaving}
                            className="w-full py-4 bg-[#323232] text-[#a7f3d0] text-sm font-bold tracking-widest uppercase rounded-xl shadow-[4px_4px_8px_#1a1a1a,-4px_-4px_8px_#3a3a3a] hover:bg-[#3a3a3a] active:shadow-[inset_2px_2px_4px_#1a1a1a,inset_-2px_-2px_4px_#3a3a3a] transition-all disabled:opacity-50">
                            {isSaving ? "Saving..." : "Save Profile"}
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  )}

                  {/* ─── VIEW 3: SECURITY ─── */}
                  {activeView === "security" && (
                    <motion.div
                      key="security"
                      variants={viewVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="p-8 text-center">
                      <div className="w-16 h-16 mx-auto bg-[#323232] rounded-full flex items-center justify-center text-neutral-500 shadow-[4px_4px_8px_#1a1a1a,-4px_-4px_8px_#3a3a3a] mb-4">
                        <SecurityIcon />
                      </div>
                      <h3 className="text-[#ecfdf5] font-bold text-lg mb-2">
                        Security Hub
                      </h3>
                      <p className="text-neutral-500 text-sm font-light">
                        Password updates and 2FA settings will be implemented
                        here.
                      </p>
                    </motion.div>
                  )}

                  {/* ─── VIEW 4: PREFERENCES ─── */}
                  {activeView === "preferences" && (
                    <motion.div
                      key="preferences"
                      variants={viewVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="p-8 text-center">
                      <div className="w-16 h-16 mx-auto bg-[#323232] rounded-full flex items-center justify-center text-neutral-500 shadow-[4px_4px_8px_#1a1a1a,-4px_-4px_8px_#3a3a3a] mb-4">
                        <PaletteIcon />
                      </div>
                      <h3 className="text-[#ecfdf5] font-bold text-lg mb-2">
                        App Preferences
                      </h3>
                      <p className="text-neutral-500 text-sm font-light">
                        Custom themes, notification sounds, and visual density
                        controls.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default SettingsModal;
