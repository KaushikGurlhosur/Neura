import { useWebSocket } from "@/hooks/useWebSocket";
import { createContext, useContext, useEffect, useRef, useState } from "react";

// Create the context Object
const ChatContext = createContext();

// 🟢 ADDED: A helper function to read the user's login token from browser cookies.
// WHY: NestJS needs this token to know WHO is connecting.
const getCookie = (name) => {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
};

/**
 * ChatProvider - The Wrapper Component
 * Wrap this around your layout so all children can access the chat state.
 */
export function ChatProvider({ children }) {
  const [users, setUsers] = useState([]); // List of all available contacts
  const [currentUserId, setCurrentUserId] = useState(null);
  const [groups, setGroups] = useState([]); // List of groups the user belongs to
  const [activeChat, setActiveChat] = useState(null); // The currently opened chat

  const [conversations, setConversations] = useState([]); // List of all conversations (threads)

  // --- REAL-TIME TRACKING ---
  // Using a Set for onlineUsers makes lookups very fast: onlineUsers.has(userId)
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState({}); // Format: { userId: true/false }

  // We use a Ref to store timeout IDs so they persist without triggering re-renders
  const typingTimersRef = useRef({});

  // Initialize the WebSocket hook inside the context
  const websocket = useWebSocket();

  // 🟢 ADDED: This block actually turns the WebSocket ON when the app loads.
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Look for the token in cookies, fallback to localStorage just in case.

      console.log("Triggering WebSocket connection...");
      websocket.connect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * EVENT LISTENERS
   * We listen for the CustomEvents dispatched by our useWebSocket hook.
   * This bridges the gap between raw socket data and our React state.
   */

  useEffect(() => {
    // Handler for when someone comes online or goes offline
    const handleStatusUpdate = (event) => {
      const { userId, isOnline } = event.detail;
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        if (isOnline) {
          newSet.add(userId);
        } else {
          newSet.delete(userId);
        }
        return newSet;
      });
    };

    // Handler for "Kaushik is typing..."
    const handleUserTyping = (event) => {
      const { userId, groupId, isTyping } = event.detail;

      // If it's a group, we create a unique key so multiple group indicators can show
      const typingKey = groupId ? `${groupId}_${userId}` : userId;

      setTypingUsers((prev) => ({ ...prev, [userId]: isTyping }));

      // SAFETY: If a user's browser crashes while typing, the server might not
      // send an "isTyping: false". We clear it manually after 2 seconds.
      if (isTyping) {
        if (typingTimersRef.current[typingKey]) {
          clearTimeout(typingTimersRef.current[typingKey]);
        }

        typingTimersRef.current[typingKey] = setTimeout(() => {
          setTypingUsers((prev) => ({ ...prev, [userId]: false }));
          delete typingTimersRef.current[typingKey];
        }, 2000);
      }
    };

    // Attach listeners to the global window object
    window.addEventListener("userStatusUpdate", handleStatusUpdate);
    window.addEventListener("userTyping", handleUserTyping);

    // CLEANUP: Remove listeners when the provider unmounts
    return () => {
      window.removeEventListener("userStatusUpdate", handleStatusUpdate);
      window.removeEventListener("userTyping", handleUserTyping);

      // Clean up all timers on unmount to prevent memory leaks
      Object.values(typingTimersRef.current).forEach(clearTimeout);
    };
  }, []);

  /**
   * API FETCHERS
   * These hydrate our state with data from the MongoDB database via API routes.
   */

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
        setCurrentUserId(data.currentUserId);
      } else {
        setUsers([]);
        setCurrentUserId(null);
      }
    } catch (error) {
      console.error("Error fetching users: ", error);
      setUsers([]);
      setCurrentUserId(null);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await fetch("/api/groups");
      const data = await response.json();
      if (data.success) {
        setGroups(data.groups);
      }
    } catch (error) {
      console.error("Error fetching groups: ", error);
    }
  };

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/conversations");
      const data = await res.json();

      if (data.success) {
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error("Error fetching conversations: ", error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchGroups();
    fetchConversations();
  }, []);

  /**
   * ACTIONS
   * Logic to create new resources (like a WhatsApp Group)
   */

  const createGroup = async (name, memberIds) => {
    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, memberIds }),
      });
      const data = await response.json();
      if (data.success) {
        setGroups((prev) => [...prev, data.group]);
        return data.group;
      }
    } catch (error) {
      console.error("Error creating group: ", error);
    }
  };

  // Provide all state and functions to the rest of the app
  return (
    <ChatContext.Provider
      value={{
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
        conversations,
        setConversations,
        fetchConversations,
      }}>
      {children}
    </ChatContext.Provider>
  );
}

// Custom hook to use the ChatContext easily in components

export const useChat = () => useContext(ChatContext);
