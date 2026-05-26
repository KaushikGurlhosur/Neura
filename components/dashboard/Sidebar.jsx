import { useChat } from "@/context/ChatContext";
import { useEffect, useState } from "react";

// ─── Component Icons ────────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
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
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const GroupIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-4 h-4 mr-1 inline-block align-text-bottom">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const Sidebar = () => {
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

  const [search, setSearch] = useState("");

  //    Hydrate lists from your MongoDB endpoints when the sidebar mounts
  useEffect(() => {
    fetchUsers();
    fetchGroups();
  }, []);

  // Filter content matching your search state criteria
  const filteredUsers =
    users?.filter(
      (u) =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.username?.toLowerCase().includes(search.toLowerCase()),
    ) || [];

  const filteredGroups =
    groups?.filter((g) =>
      g.name?.toLowerCase().includes(search.toLowerCase()),
    ) || [];

  return (
    <div className="w-[380px] h-full bg-[#fbf2de] rounded-3xl shadow-[12px_12px_24px_#bec3cf,-12px_-12px_24px_#ffffff] flex flex-col overflow-hidden p-4">
      {/* ─── Profile Header Summary ─── */}
      <div className="flex items-center justify-between mb-5 px-1">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-[#fcc48c] animate-pulse shadow-[4px_4px_8px_#bec3cf,-4px_-4px_8px_#ffffff] flex items-center justify-center font-bold text-[#3d4468] text-lg border border-white/20 ">
            N
          </div>
          <div>
            <h3 className="text-[#3d4468] font-black text-[16px] tracking-widest leading-tight">
              Neura AI
            </h3>
            <p className="text-[#2ecc71] text-xs font-bold tracking-wider mt-0.5 uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2ecc71] inline-block animate-pulse" />
              Connected Node
            </p>
          </div>
        </div>

        <button className="p-2.5 rounded-xl bg-[#e0e5ec] text-[#9499b7] hover:text-[#3d4468] shadow-[4px_4px_8px_#bec3cf,-4px_-4px_8px_#ffffff] active:shadow-[inset_2px_2px_4px_#bec3cf,inset_-2px_-2px_4px_#ffffff] transition-all duration-150 cursor-pointer">
          <SettingsIcon />
        </button>
      </div>

      {/* ─── Search Field Input Vector ─── */}
      <div className="relative mb-4">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9499b7]">
          <SearchIcon />
        </div>
        <input
          type="text"
          placeholder="Search contacts or rooms..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#e0e5ec] border-none rounded-xl p-3.5 pl-11 shadow-[inset_4px_4px_8px_#bec3cf,inset_-4px_-4px_8px_#ffffff] text-[#3d4468] text-sm outline-none placeholder-[#9499b7] font-medium"
        />
      </div>

      {/* ─── Shared Section Scroll Matrix ─── */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
        {/* ─── Groups Section Channel Allocation ─── */}
        {filteredGroups.length > 0 && (
          <div>
            <h4 className="text-[11px] font-black uppercase tracking-wider text-[#9499b7] mb-2 px-1 flex items-center">
              <GroupIcon /> Secure Rooms ({filteredGroups.length})
            </h4>
            <div className="space-y-2.5">
              {filteredGroups.map((group) => {
                const isSelected =
                  activeChat?.type === "group" && activeChat?._id === group._id;
                return (
                  <div
                    key={group._id}
                    onClick={() => setActiveChat({ ...group, type: "group" })}
                    className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? "bg-[#e0e5ec] shadow-[inset_5px_5px_10px_#bec3cf,inset_-5px_-5px_10px_#ffffff]"
                        : "bg-[#e0e5ec] shadow-[4px_4px_10px_#bec3cf,-4px_-4px_10px_#ffffff] hover:shadow-[2px_2px_5px_#bec3cf,-2px_-2px_5px_#ffffff]"
                    }`}>
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-[#e0e5ec] shadow-[3px_3px_6px_#bec3cf,-3px_-3px_6px_#ffffff] flex items-center justify-center font-bold text-[#3d4468] text-sm border border-white/10">
                        #
                      </div>
                      <div className="min-w-0 flex-1">
                        <h5 className="text-[#3d4468] font-bold text-sm truncate">
                          {group.name}
                        </h5>
                        <p className="text-[11px] text-[#9499b7] font-medium truncate">
                          Room ID: {group._id.slice(-6)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Direct Messages (Users Array Map) ─── */}
        <div>
          <h4 className="text-[11px] font-black uppercase tracking-wider text-[#9499b7] mb-2 px-1">
            ⚡ Direct Matrix Lines ({filteredUsers.length})
          </h4>
          <div className="space-y-2.5">
            {filteredUsers.map((item) => {
              const isSelected =
                activeChat?.type === "direct" && activeChat?._id === item._id;

              // Watch the active state matching your Set data structure
              const isOnline = onlineUsers?.has(item._id);
              const isTyping = typingUsers?.[item._id];

              return (
                <div
                  key={item._id}
                  onClick={() => setActiveChat({ ...item, type: "direct" })}
                  className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? "bg-[#e0e5ec] shadow-[inset_5px_5px_10px_#bec3cf,inset_-5px_-5px_10px_#ffffff]"
                      : "bg-[#e0e5ec] shadow-[4px_4px_10px_#bec3cf,-4px_-4px_10px_#ffffff] hover:shadow-[2px_2px_5px_#bec3cf,-2px_-2px_5px_#ffffff]"
                  }`}>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-[#e0e5ec] shadow-[3px_3px_6px_#bec3cf,-3px_-3px_6px_#ffffff] flex items-center justify-center font-bold text-[#3d4468] text-sm border border-white/10">
                        {item.name?.charAt(0).toUpperCase()}
                      </div>
                      {isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#2ecc71] border-2 border-[#e0e5ec]" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h5 className="text-[#3d4468] font-bold text-sm truncate">
                        {item.name || item.username}
                      </h5>
                      <p
                        className={`text-[11px] font-medium truncate ${isTyping ? "text-[#2ecc71] font-bold animate-pulse" : "text-[#9499b7]"}`}>
                        {isTyping
                          ? "typing..."
                          : item.lastMessage?.content
                            ? `${
                                item.lastMessage.sender === currentUserId
                                  ? "You: "
                                  : ""
                              }${item.lastMessage.content}`
                            : `@${item.username}`}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {filteredUsers.length === 0 && filteredGroups.length === 0 && (
          <p className="text-center text-xs font-semibold text-[#9499b7] pt-6">
            No matching secure entities initialized.
          </p>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
