"use client";

import { useChat } from "@/context/ChatContext";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── SVG ICONS ────────────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-4 h-4">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const SettingsIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-5 h-5">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const Sidebar = () => {
  const {
    activeChat,
    setActiveChat,
    onlineUsers,
    typingUsers,
    currentUserId,
    conversations,
    setConversations,
    fetchConversations,
  } = useChat();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // ─── 1. REAL-TIME SIDEBAR UPDATES ─────────────────────────────────────
  // Listens for "chatUpdate" from useWebSocket.js to bump chats to the top
  useEffect(() => {
    const handleChatUpdate = (event) => {
      const newMsg = event.detail;
      setConversations((prev) => {
        let updated = [...prev];
        const index = updated.findIndex((c) => c._id === newMsg.conversationId);

        if (index > -1) {
          const chatToUpdate = updated[index];
          chatToUpdate.lastMessage = newMsg;
          chatToUpdate.lastMessageAt = newMsg.createdAt;

          updated.splice(index, 1);
          updated.unshift(chatToUpdate); // Bump to top
        } else {
          fetchConversations(); // New conversation, fetch the list
        }
        return updated;
      });
    };

    window.addEventListener("chatUpdate", handleChatUpdate);
    return () => window.removeEventListener("chatUpdate", handleChatUpdate);
  }, [setConversations, fetchConversations]);

  // ─── 2. REAL-TIME SEARCH (DEBOUNCED) ──────────────────────────────────
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/users/search?q=${encodeURIComponent(searchQuery)}`,
        );
        const data = await res.json();
        setSearchResults(data.users || []);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // ─── 3. INITIATE OR OPEN CONVERSATION ─────────────────────────────────
  const handleUserSelect = async (user) => {
    try {
      const res = await fetch("/api/conversations/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: user._id }),
      });
      const data = await res.json();

      if (data.conversationId) {
        await fetchConversations(); // Refresh sidebar list

        setActiveChat({
          _id: user._id,
          name: user.name,
          username: user.username,
          avatar: user.avatar,
          type: "direct",
          conversationId: data.conversationId,
        });
        setSearchQuery(""); // Clear search to show the normal list again
      }
    } catch (error) {
      console.error("Failed to initiate chat:", error);
    }
  };

  return (
    <div className="w-80 h-full bg-[#262626] rounded-3xl shadow-[12px_12px_24px_#bec3cf,-12px_-12px_24px_#ffffff] flex flex-col overflow-hidden">
      {/* ─── HEADER ─── */}
      <div className="p-5 pb-4 flex justify-between items-center border-b border-white/5">
        <h2 className="text-2xl font-black text-[#ecfdf5] hover:text-[#fed7aa] transition duration-300 ease-in-out cursor-pointer">
          Chats
        </h2>
        <button className="p-2 rounded-xl text-[#ecfdf5] hover:text-[#a7f3d0] transition duration-300 ease-in-out shadow-[inset_2px_2px_5px_#525252,inset_-2px_-2px_5px_#737373] active:shadow-[inset_4px_4px_8px_#525252,inset_-4px_-4px_8px_#737373] hover:scale-110">
          <SettingsIcon />
        </button>
      </div>

      {/* ─── NEUMORPHIC SEARCH BAR ─── */}
      <div className="px-5 py-4">
        <div className="relative flex items-center">
          <div className="absolute left-3 text-neutral-400 hover:text-amber-100 hover:scale-110 transition duration-300 ease-in-out">
            <SearchIcon />
          </div>
          <input
            type="text"
            placeholder="Search friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#262626] text-neutral-300 placeholder-neutral-500 text-sm p-3 pl-9 rounded-xl tracking-widest font-extralight outline-none border border-transparent hover:border-amber-50/20 transition-all ease-in-out duration-300 shadow-[inset_4px_4px_8px_#1a1a1a,inset_-4px_-4px_8px_#323232] focus:shadow-[inset_6px_6px_12px_#1a1a1a,inset_-6px_-6px_12px_#323232] focus:border-violet-100/20"
          />
        </div>
      </div>

      {/* ─── LIST AREA ─── */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 custom-scrollbar">
        <AnimatePresence>
          {searchQuery.length >= 3 ? (
            /* ─── SEARCH RESULTS ─── */
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-3">
              <h4 className="px-3 text-xs font-black text-neutral-500 uppercase tracking-widest mb-1">
                Directory
              </h4>
              {isSearching ? (
                <div className="text-center text-sm text-neutral-500 py-4 animate-pulse font-light tracking-wider">
                  Searching Network...
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((user) => (
                  <button
                    key={user._id}
                    onClick={() => handleUserSelect(user)}
                    className="flex items-center gap-3 p-3 rounded-2xl w-full text-left transition-all duration-300 bg-[#262626] shadow-[4px_4px_8px_#1a1a1a,-4px_-4px_8px_#323232] hover:shadow-[inset_2px_2px_5px_#1a1a1a,inset_-2px_-2px_5px_#323232] group">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-12 h-12 rounded-full shadow-md object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="flex-1 overflow-hidden">
                      <h4 className="text-[#ecfdf5] font-bold text-sm truncate group-hover:text-[#fed7aa] transition-colors duration-300">
                        {user.name}
                      </h4>
                      <p className="text-neutral-400 font-light text-xs truncate tracking-wider">
                        @{user.username}
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center text-sm text-neutral-500 font-light tracking-wider py-4">
                  No users found.
                </div>
              )}
            </motion.div>
          ) : (
            /* ─── RECENT CONVERSATIONS (Default View) ─── */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-2">
              {conversations?.map((conv) => {
                const partner = conv.participants?.find(
                  (p) => typeof p === "object" && p._id !== currentUserId,
                );
                if (!partner) return null;

                const isOnline = onlineUsers.has(partner._id);
                const isTyping = typingUsers[partner._id];
                const isActive = activeChat?._id === partner._id;

                const mySettings = conv.participantSettings?.find(
                  (s) => s.user === currentUserId,
                );
                const unreadCount = mySettings?.unreadCount || 0;

                return (
                  <button
                    key={conv._id}
                    onClick={() =>
                      setActiveChat({
                        _id: partner._id,
                        name: partner.name,
                        username: partner.username,
                        avatar: partner.avatar,
                        type: "direct",
                        conversationId: conv._id,
                      })
                    }
                    className={`relative flex items-center gap-3 p-3 rounded-2xl w-full text-left transition-all duration-300 group ${
                      isActive
                        ? "bg-[#262626] shadow-[inset_4px_4px_8px_#1a1a1a,inset_-4px_-4px_8px_#323232]"
                        : "bg-transparent hover:bg-[#323232]/30"
                    }`}>
                    {/* Avatar & Online Badge */}
                    <div className="relative">
                      <img
                        src={partner.avatar}
                        alt={partner.name}
                        className={`w-12 h-12 rounded-full shadow-sm object-cover transition-transform duration-300 ${!isActive && "group-hover:scale-105"}`}
                      />
                      {isOnline && (
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#2ecc71] border-2 border-[#262626] rounded-full shadow-sm"></div>
                      )}
                    </div>

                    {/* Text Content */}
                    <div className="flex-1 overflow-hidden">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h4
                          className={`font-bold text-sm truncate pr-2 transition-colors duration-300 ${isActive ? "text-[#a7f3d0]" : "text-[#ecfdf5] group-hover:text-[#fed7aa]"}`}>
                          {partner.name}
                        </h4>
                        {conv.lastMessageAt && (
                          <span className="text-[10px] font-semibold text-neutral-500 shrink-0 tracking-wider">
                            {new Date(conv.lastMessageAt).toLocaleTimeString(
                              [],
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </span>
                        )}
                      </div>

                      <div className="flex justify-between items-center">
                        <p
                          className={`text-xs truncate pr-2 font-light tracking-wide ${unreadCount > 0 ? "text-[#ecfdf5] font-medium" : "text-neutral-400"}`}>
                          {isTyping ? (
                            <span className="text-[#a7f3d0] animate-pulse">
                              typing...
                            </span>
                          ) : (
                            conv.lastMessage?.content || "Tap to chat"
                          )}
                        </p>

                        {/* Unread Badge */}
                        {unreadCount > 0 && (
                          <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-[#262626] text-[10px] font-black shadow-sm shrink-0">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Sidebar;
