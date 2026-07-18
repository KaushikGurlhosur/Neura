"use client";

import { useChat } from "@/context/ChatContext";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── SVG Icons ─────────
const SendIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-5 h-5">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const ReplyIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-4 h-4">
    <polyline points="9 17 4 12 9 7" />
    <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
  </svg>
);
const TrashIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-4 h-4">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
const CheckIcon = ({ double, read }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={read ? "#a7f3d0" : "#737373"}
    strokeWidth="2.5"
    className="w-4 h-4 inline-block">
    <polyline points="20 6 9 17 4 12" />
    {double && <polyline points="20 10 15 15" className="opacity-70" />}
  </svg>
);

export default function ChatArea() {
  const {
    activeChat,
    setActiveChat,
    onlineUsers,
    typingUsers,
    websocket,
    currentUserId,
  } = useChat();

  const [input, setInput] = useState("");
  const [replyTarget, setReplyTarget] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [activeConversationId, setActiveConversationId] = useState(null);

  const messageEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);

  // ─── AI AUTOPILOT STATE ─────────────────────────────────────────────────
  const [aiMode, setAiMode] = useState("off");
  const [aiPersona, setAiPersona] = useState("friendly");
  const [showAiMenu, setShowAiMenu] = useState(false);
  const aiMenuRef = useRef(null);

  const [isDrafting, setIsDrafting] = useState(false);

  // Ref for auto pilot execution
  const isAutoReplying = useRef(false);

  // ─── PRIVACY GUARD STATE ────────────────────────────────────────────────

  const [infoRequest, setInfoRequest] = useState(null);

  const [infoInputValue, setInfoInputValue] = useState("");

  //FIX: Store teachings so the next AI request remembers them!
  const [localKnowledge, setLocalKnowledge] = useState({});
  const [localSkipped, setLocalSkipped] = useState([]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (aiMenuRef.current && !aiMenuRef.current.contains(event.target)) {
        setShowAiMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ─── 🟢 FIXED: SAVE AI SETTINGS (Data Integrity Guard) ──────────────────
  const saveAiSettings = async (newMode, newPersona) => {
    if (!activeConversationId) return;
    try {
      const res = await fetch("/api/ai/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConversationId,
          mode: newMode,
          persona: newPersona,
        }),
      });

      // CodeRabbit Fix: Don't trust silent failures!
      if (!res.ok) {
        throw new Error("Failed to save AI settings");
      }
    } catch (error) {
      console.error("Failed to save AI settings", error);
      // Optional: You could add a toast notification here to tell the user it failed
    }
  };

  const handleAiModeChange = (m) => {
    setAiMode(m);
    saveAiSettings(m, aiPersona);
  };

  const handleAiPersonaChange = (p) => {
    setAiPersona(p);
    saveAiSettings(aiMode, p);
  };

  // ─── 🟢 FIXED: HISTORY & SCROLLING (Stale ID Race Condition Guard) ──────
  useEffect(() => {
    if (!activeChat) return;

    // CodeRabbit Fix: Setup a cancellation token and immediately clear stale data
    let cancelled = false;
    setActiveConversationId(null); // Instantly blocks the send button until the new chat loads
    setAiMode("off");
    setAiPersona("friendly");

    const loadHistory = async () => {
      try {
        const res = await fetch(`/api/messages?userId=${activeChat._id}`);
        const data = await res.json();

        // CodeRabbit Fix: Only apply data if the user hasn't clicked away during the fetch
        if (!cancelled && data.success) {
          setActiveConversationId(data.conversationId);
          websocket.setMessages(data.messages || []);

          if (data.aiSettings) {
            setAiMode(data.aiSettings.mode);
            setAiPersona(data.aiSettings.persona);
          } else {
            setAiMode("off");
            setAiPersona("friendly");
          }

          if (websocket.isConnected) {
            data.messages.forEach((msg) => {
              const senderId =
                typeof msg.sender === "object" ? msg.sender._id : msg.sender;
              if (senderId !== currentUserId && msg.status !== "read") {
                websocket.sendReadReceipt(msg._id, "User");
              }
            });
          }
        }
      } catch (error) {
        console.error("Failed to load chat history: ", error);
      }
    };

    loadHistory();

    // Cleanup function runs if activeChat changes before the fetch finishes
    return () => {
      cancelled = true;
    };
  }, [activeChat?._id, websocket.isConnected]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [websocket.messages, typingUsers]);

  // ─── 🤖 THE FULL AUTOPILOT ENGINE ─────────────────────────────────────────
  useEffect(() => {
    // 1. Only run if Full Autopilot is ON and we have a valid conversation
    if (aiMode !== "full" || !activeConversationId || !websocket.isConnected)
      return;

    const messages = websocket.messages;
    if (messages.length === 0) return;

    const lastMsg = messages[messages.length - 1];

    // 2. Guards: Don't reply to yourself, wait if they are typing, lock if already replying
    if (getSenderId(lastMsg.sender) === currentUserId) return;
    if (typingUsers[activeChat._id]) return;
    if (isAutoReplying.current) return;

    const executeAutoPilot = async () => {
      isAutoReplying.current = true;
      try {
        // ⏱️ Simulate reading speed (1.5 seconds)
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Abort if they started typing again or you turned off Autopilot
        if (typingUsers[activeChat._id] || aiMode !== "full") {
          isAutoReplying.current = false;
          return;
        }

        // 🟢 Show "typing..." indicator to your friend
        websocket.sendTyping(activeChat._id, true);

        const recentMessages = websocket.messages.slice(-5).map((msg) => ({
          role: getSenderId(msg.sender) === currentUserId ? "Me" : "Friend",
          content: msg.content,
        }));

        // Fetch AI Decision
        const res = await fetch("/api/ai/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatHistory: recentMessages,
            persona: aiPersona,
            knowledgeBase: localKnowledge,
            skippedFields: localSkipped,
          }),
        });

        const data = await res.json();

        if (data.success && data.decision) {
          if (data.decision.status === "needs_info") {
            // 🛡️ PRIVACY INTERCEPT: Downgrade to partial mode and pop the shield!
            setAiMode("partial");
            setInfoRequest(data.decision.missingField || "a personal detail");
          } else {
            const replyText = data.decision.reply || "";
            if (!replyText) return;

            // ⏱️ Simulate typing speed (30ms per char)
            const typingDelay = Math.min(
              Math.max(replyText.length * 30, 1000),
              4000,
            );
            await new Promise((resolve) => setTimeout(resolve, typingDelay));

            // Abort if user turned it off while AI was "typing"
            if (aiMode !== "full") return;

            // 🚀 FIRE THE AUTONOMOUS MESSAGE!
            if (activeChat.type === "direct") {
              websocket.sendPrivateMessage(
                activeChat._id,
                replyText,
                null,
                activeConversationId,
              );
            } else {
              websocket.sendGroupMessage(activeChat._id, replyText);
            }
          }
        }
      } catch (error) {
        console.error("Autopilot Error:", error);
      } finally {
        websocket.sendTyping(activeChat._id, false);

        // Wait 2 full seconds before allowing the AI to process the timeline again.
        // This gives the WebSocket enough time to broadcast the sent message back
        // to our screen, preventing the AI from replying to the same message twice!
        setTimeout(() => {
          isAutoReplying.current = false;
        }, 2000);
      }
    };

    executeAutoPilot();
  }, [
    websocket.messages,
    typingUsers,
    aiMode,
    activeConversationId,
    activeChat,
    currentUserId,
    aiPersona,
    localKnowledge,
    localSkipped,
    websocket,
  ]);

  if (!activeChat) {
    return (
      <div className="flex-1 h-full bg-[#262626] rounded-3xl shadow-[12px_12px_24px_#1a1a1a,-12px_-12px_24px_#323232] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-[#262626] shadow-[inset_6px_6px_12px_#1a1a1a,inset_-6px_-6px_12px_#323232] flex items-center justify-center text-neutral-500 mb-4">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="w-10 h-10">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <h3 className="text-[#ecfdf5] font-black text-xl mb-1 tracking-wider">
          Neura Connect
        </h3>
        <p className="text-neutral-500 text-sm max-w-xs font-light tracking-wide">
          Select a secure channel from the left matrix to begin real-time
          transmission.
        </p>
      </div>
    );
  }

  const isPartnerOnline = onlineUsers.has(activeChat._id);
  const isPartnerTyping = typingUsers[activeChat._id];
  const chatDisplayName = activeChat.name || activeChat.username || "Chat";
  const getSenderId = (sender) => sender?._id || sender;

  // ─── HANDLERS ───────────────────────────────────────────────────────────
  const handleTyping = (e) => {
    setInput(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
      websocket.sendTyping(activeChat._id, true);
    }
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      websocket.sendTyping(activeChat._id, false);
    }, 1500);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !websocket.isConnected || aiMode === "full") return;

    // Fix: Block sending if the conversation hasn't loaded yet!
    if (activeChat.type === "direct" && !activeConversationId) return;

    if (activeChat.type === "direct") {
      websocket.sendPrivateMessage(
        activeChat._id,
        input,
        replyTarget?._id,
        activeConversationId,
      );
    } else {
      websocket.sendGroupMessage(activeChat._id, input);
    }

    setInput("");
    setReplyTarget(null);
    setIsTyping(false);
    websocket.sendTyping(activeChat._id, false);
  };

  const triggerAiDraft = async (
    overrideKnowledge = null,
    overrideSkipped = null,
  ) => {
    if (!activeConversationId || websocket.messages.length === 0 || isDrafting)
      return;

    setIsDrafting(true);
    setInput("✨ AI is analyzing context...");

    try {
      const recentMessages = websocket.messages.slice(-5).map((msg) => ({
        role: getSenderId(msg.sender) === currentUserId ? "Me" : "Friend",
        content: msg.content,
      }));

      const res = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatHistory: recentMessages,
          persona: aiPersona,
          knowledgeBase: overrideKnowledge || localKnowledge,
          skippedFields: overrideSkipped || localSkipped,
        }),
      });

      const data = await res.json();

      if (data.success && data.decision) {
        if (data.decision.status === "needs_info") {
          setInput("");
          setInfoRequest(data.decision.missingField);
        } else {
          setInput(data.decision.reply || "");
        }
      } else {
        setInput("");
        console.error("Failed to generate draft");
      }
    } catch (error) {
      setInput("");
      console.error("AI Draft Error:", error);
    } finally {
      setIsDrafting(false);
    }
  };

  const handleAiDraft = () => triggerAiDraft();

  const handleTeachAi = () => {
    const newKnowledge = { ...localKnowledge, [infoRequest]: infoInputValue };
    setLocalKnowledge(newKnowledge);
    setInfoRequest(null);
    setInfoInputValue("");
    triggerAiDraft(newKnowledge, localSkipped); // auto-retry draft with new info
  };

  const handleSkipAi = () => {
    const newSkipped = [...localSkipped, infoRequest];
    setLocalSkipped(newSkipped);
    setInfoRequest(null);
    triggerAiDraft(localKnowledge, newSkipped); // Auto-retry draft skipping topic
  };

  //─── 🟢 FIXED: REASONING ENGINE AI DRAFT ─────────
  // const handleAiDraft = async () => {
  //   if (websocket.messages.length === 0 || isDrafting) return; // Prevent drafting if no messages or already drafting

  //   setIsDrafting(true);
  //   setInput("✨ AI is analyzing context...");

  //   try {
  //     // Grab the last 5 messages for context
  //     const recentMessages = websocket.messages.slice(-5).map((msg) => ({
  //       role: getSenderId(msg.sender) === currentUserId ? "Me" : "Friend",
  //       content: msg.content,
  //     }));

  //     const res = await fetch("/api/ai/draft", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         chatHistory: recentMessages,
  //         persona: aiPersona,
  //         knowledgeBase: {}, // TODO: Connect to DB later
  //         skippedFields: [], // TODO: Connect to DB later
  //       }),
  //     });

  //     const data = await res.json();

  //     if (data.success) {
  //       // 🟢 NEW LOGIC: Check the JSON decision from the backend!
  //       if (data.decision.status === "needs_info") {
  //         setInput("");
  //         setInfoRequest(data.decision.missingField); // 🛡️ Pops the Privacy Shield!
  //       } else {
  //         setInput(data.decision.reply); // 📝 Safe to Draft
  //       }
  //     } else {
  //       setInput("");
  //       console.error("Failed to generate draft");
  //     }
  //   } catch (error) {
  //     setInput("");
  //     console.error("AI Draft Error:", error);
  //   } finally {
  //     setIsDrafting(false);
  //   }
  // };

  const handleDelete = async (msgId, scope) => {
    try {
      const res = await fetch("/api/messages/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: msgId, scope }),
      });

      if (!res.ok) throw new Error("Failed to delete message");

      websocket.setMessages((prev) =>
        prev.map((m) =>
          m._id === msgId
            ? { ...m, isDeleted: true, content: "This message was deleted" }
            : m,
        ),
      );
    } catch (err) {
      console.error(err);
    }
    setActiveMenuId(null);
  };
  return (
    // 🟢 MOBILE-FIRST FIX: Takes up full width on mobile if active.
    <div
      className={`dashboard-element ${!activeChat ? "hidden md:flex" : "flex"} flex-1 h-full bg-[#262626] rounded-2xl md:rounded-3xl shadow-[8px_8px_16px_#1a1a1a,-8px_-8px_16px_#323232] flex-col overflow-hidden relative min-w-0`}>
      {/* ─── Header ─── */}
      <div className="p-3 md:p-4 bg-[#262626] border-b border-white/5 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2 md:gap-3">
          {/* 🟢 MOBILE BACK BUTTON */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setActiveChat(null)}
            className="md:hidden p-2 mr-1 rounded-xl bg-[#262626] text-neutral-400 shadow-[4px_4px_8px_#1a1a1a,-4px_-4px_8px_#323232] active:shadow-[inset_2px_2px_4px_#1a1a1a,inset_-2px_-2px_4px_#323232]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="w-5 h-5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </motion.button>

          <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-[#262626] shadow-[inset_2px_2px_4px_#1a1a1a,inset_-2px_-2px_4px_#323232] flex items-center justify-center font-bold text-[#ecfdf5] text-sm md:text-base">
            {chatDisplayName.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <h3 className="text-[#ecfdf5] font-bold text-sm md:text-base leading-tight flex items-center gap-2 tracking-wide truncate">
              {chatDisplayName}
              {aiMode === "full" && (
                <span className="text-[8px] md:text-[10px] bg-purple-900/30 text-purple-300 px-2 py-0.5 rounded-full font-bold animate-pulse tracking-widest border border-purple-500/20 shrink-0">
                  AUTOPILOT
                </span>
              )}
            </h3>
            <p className="text-[10px] md:text-xs font-medium mt-0.5 tracking-wider truncate">
              {isPartnerTyping ? (
                <span className="text-[#a7f3d0] font-bold animate-pulse">
                  typing...
                </span>
              ) : isPartnerOnline ? (
                <span className="text-amber-200">Online</span>
              ) : (
                <span className="text-neutral-500">
                  Last seen{" "}
                  {activeChat.lastSeen
                    ? new Date(activeChat.lastSeen).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "recently"}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Messages Timeline ─── */}
      <div className="flex-1 overflow-y-auto p-3 md:p-5 space-y-4 custom-scrollbar bg-[#262626]">
        <AnimatePresence initial={false}>
          {websocket.messages.map((msg) => {
            const senderId = getSenderId(msg.sender);
            const isMe = senderId === currentUserId;
            const menuId = msg._id || msg.tempId;
            const replyContext = msg.replyTo
              ? websocket.messages.find((m) => m._id === msg.replyTo)
              : null;

            return (
              // 🟢 FRAMER MOTION: Smoothly animates new messages springing into the timeline
              <motion.div
                layout
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                key={menuId}
                className={`flex ${isMe ? "justify-end" : "justify-start"} relative group`}>
                {/* 🟢 UNTRAPPED MENU BUTTON (LEFT SIDE FOR 'ME') */}
                {isMe && !msg.isDeleted && (
                  <div
                    className={`flex items-center justify-center pr-2 transition-opacity duration-300 ${activeMenuId === menuId ? "opacity-100" : "opacity-0 md:group-hover:opacity-100"}`}>
                    <button
                      onClick={() =>
                        setActiveMenuId(activeMenuId === menuId ? null : menuId)
                      }
                      className={`p-2 rounded-full transition-all ${activeMenuId === menuId ? "text-[#a7f3d0] bg-[#323232] shadow-[inset_2px_2px_4px_#1a1a1a,inset_-2px_-2px_4px_#3a3a3a]" : "text-neutral-500 hover:text-[#ecfdf5] hover:bg-[#323232] hover:shadow-[4px_4px_8px_#1a1a1a,-4px_-4px_8px_#323232]"}`}>
                      •••
                    </button>
                  </div>
                )}

                <div
                  className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-3 md:p-4 relative ${isMe ? "bg-[#262626] shadow-[4px_4px_8px_#1a1a1a,-4px_-4px_8px_#323232] rounded-tr-sm border border-white/5" : "bg-[#323232] shadow-[4px_4px_8px_#1a1a1a,-4px_-4px_8px_#323232] rounded-tl-sm border border-amber-900/20"}`}>
                  {replyContext && (
                    <div
                      className={`mb-2 p-2 rounded-lg text-[10px] md:text-xs opacity-80 border-l-2 ${isMe ? "bg-black/20 border-[#ecfdf5]" : "bg-black/20 border-[#fed7aa]"}`}>
                      <p className="font-bold text-neutral-300">
                        {getSenderId(replyContext.sender) === currentUserId
                          ? "You"
                          : chatDisplayName}
                      </p>
                      <p className="truncate max-w-[180px] md:max-w-[250px] text-neutral-400">
                        {replyContext.content}
                      </p>
                    </div>
                  )}
                  <p
                    className={`text-[13px] md:text-[14px] font-light tracking-wide leading-relaxed text-[#ecfdf5] ${msg.isDeleted ? "italic text-neutral-500" : ""}`}>
                    {msg.content}
                  </p>
                  <div className="flex items-center justify-end gap-1 mt-2">
                    <span className="text-[9px] md:text-[10px] text-neutral-500 font-medium tracking-wider">
                      {msg.createdAt
                        ? new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Just now"}
                    </span>
                    {isMe && !msg.isDeleted && (
                      <span>
                        {msg.status === "read" ? (
                          <CheckIcon double read />
                        ) : msg.status === "delivered" ? (
                          <CheckIcon double />
                        ) : msg.status === "sent" ? (
                          <CheckIcon />
                        ) : (
                          <span className="text-[10px] text-neutral-500">
                            ⌚
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* 🟢 UNTRAPPED MENU BUTTON (RIGHT SIDE FOR 'THEM') */}
                {!isMe && !msg.isDeleted && (
                  <div
                    className={`flex items-center justify-center pl-2 transition-opacity duration-300 ${activeMenuId === menuId ? "opacity-100" : "opacity-0 md:group-hover:opacity-100"}`}>
                    <button
                      onClick={() =>
                        setActiveMenuId(activeMenuId === menuId ? null : menuId)
                      }
                      className={`p-2 rounded-full transition-all ${activeMenuId === menuId ? "text-[#a7f3d0] bg-[#323232] shadow-[inset_2px_2px_4px_#1a1a1a,inset_-2px_-2px_4px_#3a3a3a]" : "text-neutral-500 hover:text-[#ecfdf5] hover:bg-[#323232] hover:shadow-[4px_4px_8px_#1a1a1a,-4px_-4px_8px_#323232]"}`}>
                      •••
                    </button>
                  </div>
                )}

                {/* 🟢 ABSOLUTE Z-INDEX 9999 MENU POPOVER */}
                <AnimatePresence>
                  {activeMenuId === menuId && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -10 }}
                      className={`absolute z-[9999] top-full mt-2 bg-[#262626] border border-white/10 shadow-[12px_12px_24px_#1a1a1a,-12px_-12px_24px_#323232,0_0_20px_rgba(0,0,0,0.8)] p-2 rounded-xl flex flex-col gap-1 w-40 md:w-44 ${isMe ? "right-0" : "left-0"}`}>
                      <button
                        onClick={() => {
                          setReplyTarget(msg);
                          setActiveMenuId(null);
                        }}
                        className="flex items-center gap-2 text-xs md:text-sm font-medium tracking-wider text-[#ecfdf5] hover:bg-white/5 p-2.5 rounded-lg w-full text-left transition-colors">
                        <ReplyIcon /> Reply
                      </button>
                      <div className="w-full h-px bg-white/5 my-1" />
                      <button
                        onClick={() => handleDelete(msg._id, "me")}
                        className="flex items-center gap-2 text-xs md:text-sm font-medium tracking-wider text-rose-400 hover:bg-rose-500/10 p-2.5 rounded-lg w-full text-left transition-colors">
                        <TrashIcon /> Delete for Me
                      </button>
                      {isMe && (
                        <button
                          onClick={() => handleDelete(msg._id, "everyone")}
                          className="flex items-center gap-2 text-xs md:text-sm font-medium tracking-wider text-rose-400 hover:bg-rose-500/10 p-2.5 rounded-lg w-full text-left transition-colors">
                          <TrashIcon /> Delete for All
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messageEndRef} />
      </div>

      {/* ─── FOOTER CONTROLS ─── */}
      <div className="relative p-3 md:p-4 bg-[#262626] flex flex-col gap-2 z-10 border-t border-white/5 shrink-0">
        <AnimatePresence>
          {showAiMenu && (
            <motion.div
              ref={aiMenuRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-[75px] md:bottom-[85px] left-3 md:left-4 z-50 w-[92%] md:w-64 max-w-sm p-4 md:p-5 bg-[#262626] rounded-2xl shadow-[12px_12px_24px_#1a1a1a,-12px_-12px_24px_#323232] border border-white/10">
              <h4 className="text-[#ecfdf5] font-black text-xs md:text-sm mb-4 tracking-widest uppercase text-center">
                Autopilot Control
              </h4>
              <div className="flex bg-[#1a1a1a] rounded-xl p-1 mb-5 shadow-[inset_4px_4px_8px_#0f0f0f,inset_-4px_-4px_8px_#252525]">
                {["off", "partial", "full"].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleAiModeChange(m)}
                    className={`flex-1 text-[9px] md:text-[10px] font-bold py-2 md:py-2.5 tracking-wider capitalize rounded-lg transition-all ${aiMode === m ? "bg-[#262626] text-[#a7f3d0] shadow-[2px_2px_5px_#1a1a1a,-2px_-2px_5px_#323232]" : "text-neutral-500 hover:text-neutral-300"}`}>
                    {m}
                  </button>
                ))}
              </div>
              {aiMode !== "off" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <label className="text-neutral-500 text-[9px] md:text-[10px] font-bold mb-2 block uppercase tracking-widest pl-1">
                    AI Persona
                  </label>
                  <select
                    value={aiPersona}
                    onChange={(e) => handleAiPersonaChange(e.target.value)}
                    className="w-full bg-[#1a1a1a] text-[#ecfdf5] text-xs md:text-sm font-medium p-3 rounded-xl shadow-[inset_4px_4px_8px_#0f0f0f,inset_-4px_-4px_8px_#252525] outline-none border border-transparent focus:border-amber-500/20 cursor-pointer">
                    <option value="friendly">Friendly 😊</option>
                    <option value="professional">Professional 💼</option>
                    <option value="flirty">Flirty ✨</option>
                    <option value="cryptic">Cryptic 🕶️</option>
                    <option value="sarcastic">Sarcastic 😆</option>
                    <option value="humorous">Humorous 🙂‍↔️</option>
                  </select>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── 🛡️ PRIVACY GUARD UI ─── */}
        <AnimatePresence>
          {infoRequest && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-20 md:bottom-24 left-3 md:left-4 right-3 md:right-4 z-50 p-4 bg-[#262626] rounded-2xl shadow-[12px_12px_24px_#1a1a1a,-12px_-12px_24px_#323232] border border-amber-500/40">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center bg-amber-500/20 text-amber-300 text-sm">
                    🛡️
                  </div>
                  <div className="flex-1">
                    <h4 className="text-amber-100 font-bold text-xs md:text-sm tracking-wide">
                      Privacy Shield Active
                    </h4>
                    <p className="text-neutral-400 text-[10px] md:text-xs mt-0.5">
                      Asked for:{" "}
                      <span className="text-[#a7f3d0] font-black uppercase">
                        {infoRequest}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex w-full md:flex-1 gap-2 mt-2 md:mt-0">
                  <input
                    type="text"
                    placeholder={`Type your ${infoRequest}...`}
                    value={infoInputValue}
                    onChange={(e) => setInfoInputValue(e.target.value)}
                    className="flex-1 bg-[#1a1a1a] text-[#ecfdf5] text-xs p-2.5 rounded-xl outline-none shadow-[inset_4px_4px_8px_#0f0f0f,inset_-4px_-4px_8px_#252525]"
                  />
                  <button
                    onClick={handleTeachAi}
                    className="px-3 py-2 bg-[#262626] text-[#a7f3d0] rounded-xl text-xs font-bold shadow-[4px_4px_8px_#1a1a1a,-4px_-4px_8px_#323232] hover:text-[#ecfdf5]">
                    Teach
                  </button>
                  <button
                    onClick={handleSkipAi}
                    className="px-3 py-2 bg-[#262626] text-rose-400 rounded-xl text-xs font-bold shadow-[4px_4px_8px_#1a1a1a,-4px_-4px_8px_#323232] hover:text-rose-200">
                    Skip
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {replyTarget && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center justify-between px-3 md:px-4 py-2.5 md:py-3 rounded-xl bg-[#262626] shadow-[inset_4px_4px_8px_#1a1a1a,inset_-4px_-4px_8px_#323232] mb-1">
              <div className="truncate border-l-2 border-amber-500/50 pl-3 min-w-0">
                <span className="font-bold text-[#ecfdf5] tracking-wide text-[9px] md:text-[10px] uppercase">
                  Replying to{" "}
                  {getSenderId(replyTarget.sender) === currentUserId
                    ? "Yourself"
                    : chatDisplayName}
                </span>
                <p className="text-neutral-400 font-light truncate max-w-[200px] md:max-w-sm mt-0.5 text-[11px] md:text-xs">
                  {replyTarget.content}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReplyTarget(null)}
                className="text-neutral-500 hover:text-rose-400 font-black text-lg px-2">
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <form
          onSubmit={handleSendMessage}
          className="flex items-center gap-2 md:gap-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="button"
            disabled={isDrafting}
            onClick={() => setShowAiMenu(!showAiMenu)}
            className={`p-3 md:p-4 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs tracking-widest transition-all shrink-0 ${aiMode !== "off" ? "bg-purple-900/40 text-purple-300 shadow-[inset_2px_2px_4px_#1a1a1a,inset_-2px_-2px_4px_#323232] border border-purple-500/30" : "bg-[#262626] text-neutral-400 shadow-[4px_4px_8px_#1a1a1a,-4px_-4px_8px_#323232]"}`}>
            AI
          </motion.button>
          <div className="flex-1 relative flex items-center min-w-0">
            {/* 🟢 FIXED: Input Placeholder changes dynamically for Full Autopilot */}
            <input
              type="text"
              placeholder={
                aiMode === "full"
                  ? "🚀 Autopilot engaged. Hands free..."
                  : websocket.isConnected && activeConversationId
                    ? "Message..."
                    : "Loading..."
              }
              value={input}
              onChange={handleTyping}
              disabled={
                !websocket.isConnected ||
                aiMode === "full" ||
                !activeConversationId ||
                isDrafting
              }
              className={`w-full border border-transparent rounded-xl md:rounded-2xl p-3 md:p-4 pr-16 md:pr-24 text-xs md:text-sm outline-none font-light tracking-wide transition-all ${aiMode === "full" ? "bg-[#1a1a1a] shadow-[inset_4px_4px_8px_#0f0f0f,inset_-4px_-4px_8px_#252525] text-purple-300/50 italic" : "bg-[#262626] shadow-[inset_4px_4px_8px_#1a1a1a,inset_-4px_-4px_8px_#323232] text-[#ecfdf5] focus:border-amber-100/20"}`}
            />
            <AnimatePresence>
              {aiMode === "partial" && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  type="button"
                  onClick={handleAiDraft}
                  disabled={!activeConversationId || isDrafting}
                  className="absolute right-2 md:right-3 py-1.5 md:py-2 px-3 md:px-4 rounded-lg md:rounded-xl bg-[#323232] text-amber-200 font-medium tracking-wide text-[9px] md:text-[10px] uppercase shadow-[4px_4px_8px_#1a1a1a,-4px_-4px_8px_#323232] hover:bg-[#3a3a3a] transition-all whitespace-nowrap">
                  {isDrafting ? "✨..." : "Draft ✨"}
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={
              !websocket.isConnected ||
              !input.trim() ||
              !activeConversationId ||
              isDrafting
            }
            className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-[#262626] text-amber-100 shadow-[4px_4px_8px_#1a1a1a,-4px_-4px_8px_#323232] disabled:opacity-30 shrink-0 flex items-center justify-center">
            <SendIcon />
          </motion.button>
        </form>
      </div>
    </div>
  );
}
