"use client";

import { useChat } from "@/context/ChatContext";
import { useEffect, useRef, useState } from "react";

// ─── SVG Icons ────────────────────────────────────────────────────────────
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
    stroke={read ? "#2ecc71" : "#9499b7"}
    strokeWidth="2.5"
    className="w-4 h-4 inline-block">
    <polyline points="20 6 9 17 4 12" />
    {double && <polyline points="20 10 15 15" className="opacity-70" />}
  </svg>
);

export default function ChatArea() {
  const {
    users,
    groups,
    activeChat,
    setActiveChat,
    onlineUsers,
    typingUsers,
    websocket,
    fetchGroups,
    fetchUsers,
    createGroup,
    currentUserId,
  } = useChat();

  const [input, setInput] = useState("");
  const [replyTarget, setReplyTarget] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);

  const messageEndRef = useRef(null);
  const typingTimeOutRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);

  // 1. Fetch History on Chat Switch
  useEffect(() => {
    if (!activeChat) return;

    const loadHistory = async () => {
      try {
        // Updated to use the correct userId parameter as we discussed!
        const res = await fetch(`/api/messages?userId=${activeChat._id}`);
        const data = await res.json();
        if (data.success) {
          websocket.setMessages(data.messages);

          // 🚀 ADD SAFETY CHECK: Only send read receipts if the socket is fully open
          if (websocket.isConnected) {
            data.messages.forEach((msg) => {
              // Note: Accommodating your populated sender object
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
  }, [activeChat?._id, websocket.isConnected]);

  // 2. Auto-scroll to bottom on new message
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [websocket.messages, typingUsers]);

  if (!activeChat) {
    return (
      <div className="flex-1 h-full bg-[#fbf2de] rounded-3xl shadow-[12px_12px_24px_#bec3cf,-12px_-12px_24px_#ffffff] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-[#e0e5ec] shadow-[6px_6px_12px_#bec3cf,-6px_-6px_12px_#ffffff] flex items-center justify-center text-[#9499b7] mb-4">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="w-10 h-10">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <h3 className="text-[#3d4468] font-black text-xl mb-1">
          Neura Connect
        </h3>
        <p className="text-[#9499b7] text-sm max-w-xs">
          Select a secure channel from the left matrix to begin real-time
          transmission.
        </p>
      </div>
    );
  }
  const isPartnerOnline = onlineUsers.has(activeChat._id);
  const isPartnerTyping = typingUsers[activeChat._id];

  // ─── Input & Transmission Handlers ────────────────────────────────────────
  const handleTyping = (e) => {
    setInput(e.target.value);

    if (!isTyping) {
      setIsTyping(true);
      websocket.sendTyping(activeChat._id, true);
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeOutRef.current = setTimeout(() => {
      setIsTyping(false);
      websocket.sendTyping(activeChat._id, false);
    }, 1500); // Stop typing if no keystroke for 1.5s
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !websocket.isConnected) return;

    if (activeChat.type === "direct") {
      websocket.sendPrivateMessage(activeChat._id, input, replyTarget?._id);
    } else {
      websocket.sendGroupMessage(activeChat._id, input);
    }

    setInput("");
    setReplyTarget(null);
    setIsTyping(false);
    websocket.sendTyping(activeChat._id, false);
  };

  const handleDelete = async (msgId, scope) => {
    // Note: You will need an API route like /api/messages/delete to handle this in DB
    // But for optimisitc UI, we can update the state immediately:
    try {
      await fetch("/api/messages/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: msgId, scope }),
      });

      // 🟢 ADDED: Only update UI if the server returned a 2xx success status
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

  // 🟢 ADDED: Put this near the top of ChatArea.jsx, above your return statement
  const getSenderId = (sender) =>
    typeof sender === "object" ? sender._id : sender;

  return (
    <div className="flex-1 h-full bg-[#fbf2de] rounded-3xl shadow-[12px_12px_24px_#bec3cf,-12px_-12px_24px_#ffffff] flex flex-col overflow-hidden relative">
      {/* ─── Header ─── */}
      <div className="p-4 bg-[#fbf2de] border-b border-black/5 flex items-center justify-between z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#e0e5ec] shadow-[2px_2px_5px_#bec3cf,-2px_-2px_5px_#ffffff] flex items-center justify-center font-bold text-[#3d4468]">
            {activeChat.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-[#3d4468] font-bold text-base leading-tight">
              {activeChat.name}
            </h3>
            <p className="text-[11px] font-semibold mt-0.5">
              {isPartnerTyping ? (
                <span className="text-[#2ecc71] font-bold animate-pulse">
                  typing...
                </span>
              ) : isPartnerOnline ? (
                <span className="text-[#3498db]">Online</span>
              ) : (
                <span className="text-[#9499b7]">
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#fbf2de]">
        {websocket.messages.map((msg) => {
          const senderId =
            typeof msg.sender === "object" ? msg.sender._id : msg.sender;
          const isMe = senderId === currentUserId;

          // Find the reply context if it exists
          const replyContext = msg.replyTo
            ? websocket.messages.find((m) => m._id === msg.replyTo)
            : null;

          return (
            <div
              key={msg._id || msg.tempId}
              className={`flex flex-col ${isMe ? "items-end" : "items-start"} relative group`}>
              <div
                className={`max-w-[70%] rounded-2xl p-3 relative ${
                  isMe
                    ? "bg-[#e0e5ec] shadow-[5px_5px_10px_#bec3cf,-5px_-5px_10px_#ffffff] rounded-tr-sm"
                    : "bg-[#fcc48c] shadow-[4px_4px_8px_#d9a776,-4px_-4px_8px_#ffe1a2] rounded-tl-sm"
                }`}>
                {/* Reply Snippet */}
                {replyContext && (
                  <div
                    className={`mb-2 p-2 rounded-lg text-xs opacity-80 border-l-4 ${isMe ? "bg-black/5 border-[#3d4468]" : "bg-white/30 border-[#e67e22]"}`}>
                    <p className="font-bold">
                      {getSenderId(replyContext.sender) === currentUserId
                        ? "You"
                        : activeChat.name}
                    </p>
                    <p className="truncate max-w-[200px]">
                      {replyContext.content}
                    </p>
                  </div>
                )}

                <p
                  className={`text-[15px] leading-relaxed text-[#3d4468] ${msg.isDeleted ? "italic opacity-60" : ""}`}>
                  {msg.content}
                </p>

                {/* Status and Time Row */}
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="text-[10px] text-[#3d4468]/60 font-semibold">
                    {new Date(msg.createdAt || Date.now()).toLocaleTimeString(
                      [],
                      { hour: "2-digit", minute: "2-digit" },
                    )}
                  </span>

                  {isMe && !msg.isDeleted && (
                    <span>
                      {msg.status === "read" && <CheckIcon double read />}
                      {msg.status === "delivered" && <CheckIcon double />}
                      {msg.status === "sent" && <CheckIcon />}
                      {(!msg.status || msg.status === "pending") && (
                        <span className="text-[10px] text-[#9499b7]">⌚</span>
                      )}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Dropdown Toggle (Hover) */}
              {!msg.isDeleted && (
                <div
                  className={`absolute top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1 z-20 ${isMe ? "left-0 -translate-x-8" : "right-0 translate-x-8"}`}>
                  <button
                    onClick={() =>
                      setActiveMenuId(activeMenuId === msg._id ? null : msg._id)
                    }
                    className="text-[#9499b7] hover:text-[#3d4468] p-1 rounded-full bg-[#e0e5ec] shadow-[2px_2px_5px_#bec3cf,-2px_-2px_5px_#ffffff]">
                    •••
                  </button>
                </div>
              )}

              {/* Contextual Actions Menu */}
              {activeMenuId === (msg._id || msg.tempId) && (
                <div
                  className={`absolute bg-[#e0e5ec] shadow-[4px_4px_15px_#bec3cf,-4px_-4px_15px_#ffffff] p-2 rounded-xl flex flex-col gap-2 z-30 top-8 w-32 ${isMe ? "right-0" : "left-0"}`}>
                  <button
                    onClick={() => {
                      setReplyTarget(msg);
                      setActiveMenuId(null);
                    }}
                    className="flex items-center gap-2 text-xs font-bold text-[#3d4468] hover:bg-black/5 p-1.5 rounded-lg w-full text-left">
                    <ReplyIcon /> Reply
                  </button>
                  <div className="w-full h-px bg-black/5" />
                  <button
                    onClick={() => handleDelete(msg._id, "me")}
                    className="flex items-center gap-2 text-xs font-bold text-[#e74c3c] hover:bg-[#e74c3c]/10 p-1.5 rounded-lg w-full text-left">
                    <TrashIcon /> Delete for Me
                  </button>
                  {isMe && (
                    <button
                      onClick={() => handleDelete(msg._id, "everyone")}
                      className="flex items-center gap-2 text-xs font-bold text-[#e74c3c] hover:bg-[#e74c3c]/10 p-1.5 rounded-lg w-full text-left">
                      <TrashIcon /> Delete for All
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div ref={messageEndRef} />
      </div>

      {/* ─── Messaging Input ─── */}
      <form
        onSubmit={handleSendMessage}
        className="p-4 bg-[#fbf2de] flex flex-col gap-2 z-10">
        {/* Reply Context Bar */}
        {replyTarget && (
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#e0e5ec] shadow-[inset_3px_3px_6px_#bec3cf,inset_-3px_-3px_6px_#ffffff] text-sm animate-slideDown">
            <div className="truncate border-l-4 border-[#3d4468] pl-2">
              <span className="font-bold text-[#3d4468]">
                Replying to{" "}
                {replyTarget.sender === currentUserId
                  ? "Yourself"
                  : activeChat.name}
              </span>
              <p className="text-[#9499b7] truncate max-w-sm">
                {replyTarget.content}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReplyTarget(null)}
              className="text-[#e74c3c] font-black text-lg p-2">
              ×
            </button>
          </div>
        )}

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder={
              websocket.isConnected
                ? "Type a secure message..."
                : "Reconnecting to server..."
            }
            value={input}
            onChange={handleTyping}
            disabled={!websocket.isConnected}
            className="flex-1 bg-[#e0e5ec] border-none rounded-2xl p-4 shadow-[inset_4px_4px_8px_#bec3cf,inset_-4px_-4px_8px_#ffffff] text-[#3d4468] text-sm outline-none font-medium placeholder-[#9499b7]"
          />
          <button
            type="submit"
            disabled={!websocket.isConnected || !input.trim()}
            className="p-4 rounded-2xl bg-[#e0e5ec] text-[#3d4468] shadow-[4px_4px_8px_#bec3cf,-4px_-4px_8px_#ffffff] active:shadow-[inset_2px_2px_4px_#bec3cf,inset_-2px_-2px_4px_#ffffff] disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center">
            <SendIcon />
          </button>
        </div>
      </form>
    </div>
  );
}
