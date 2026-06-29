"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Helper to grab the login token from the browser cookies
const getCookie = (name) => {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`; // Add a "; " at the beginning to make sure we can split correctly even if it's the first cookie
  const parts = value.split(`; ${name}=`); // Split the cookie string into parts based on the target cookie name
  if (parts.length === 2) return parts.pop().split(";").shift(); // If we found the cookie, split it again at ";" to isolate its value and return it
  return null;
};

export function useWebSocket() {
  // STATE
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);

  // REFS - Storing values without re-rendering
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const reconnectTokenRef = useRef(null);
  const connectRef = useRef(null);

  // This ref acts as a "master switch" to tell the hook whether
  // it SHOULD be trying to connect or if it should stay off.
  const shouldReconnectRef = useRef(true);

  // 🟢 ADDED: Memory bank to track processed messages and prevent duplicate events
  const seenMessagesRef = useRef(new Set());

  const buildWebSocketUrl = useCallback((token) => {
    return process.env.NEXT_PUBLIC_WS_URL;
    // return process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";
  }, []);

  // INCOMING MESSAGE HANDLER
  const handleIncomingMessage = useCallback((data) => {
    switch (data.type) {
      case "new_message":
      case "group_message":
        // 🟢 FIXED: CodeRabbit Duplicate Guard
        // Check our memory bank FIRST. If we've seen this ID, kill the process completely.
        if (seenMessagesRef.current.has(data.message._id)) return;

        // Add to memory bank so we never process it again
        seenMessagesRef.current.add(data.message._id);

        // Append new messages to the existing list
        // 🟢 UPDATED: Cross-Chat Contamination Protection
        setMessages((prev) => {
          // Prevent duplicate rendering
          if (prev.some((msg) => msg._id === data.message._id)) return prev;

          // Prevent bleeding: If we have a message on the screen and the new message is from a different conversation, we ignore it.
          if (
            prev.length > 0 &&
            data.message.conversationId &&
            prev[0].conversationId
          ) {
            if (prev[0].conversationId !== data.message.conversationId) {
              return prev; // Ignore messages from other conversations
            }
          }

          return [...prev, data.message];
        });

        window.dispatchEvent(
          new CustomEvent("chatUpdate", { detail: data.message }),
        );
        break;

      case "read_receipt":
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === data.messageId ? { ...msg, status: "read" } : msg,
          ),
        );
        break;

      case "message_delivered":
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === data.messageId && msg.status !== "read"
              ? { ...msg, status: "delivered" }
              : msg,
          ),
        );
        break;

      case "message_sent_confirm":
        // OPTIMISTIC UI: When the server confirms the message was saved.
        // We find the "tempId" message and replace it with the real DB object.

        setMessages((prev) => {
          const exists = prev.some((msg) => msg.tempId === data.tempId);
          if (exists) {
            return prev.map((msg) =>
              msg.tempId === data.tempId
                ? { ...msg, ...data.message, status: "sent" }
                : msg,
            );
          }
          // If it wasn't on screen, add it now
          return [...prev, data.message];
        });
        break;

      case "status_update":
        // We use CustomEvents so the sidebar.js can listen for online/offline
        // Updates without being directly linked to the hook.
        window.dispatchEvent(
          new CustomEvent("userStatusUpdate", {
            detail: {
              userId: data.userId,
              isOnline: data.isOnline,
              lastSeen: data.lastSeen,
            },
          }),
        );
        break;

      // Your backend was sending this, but the hook was ignoring it.
      // Now it dispatches a global event for the UI to catch.
      case "group_typing":
        window.dispatchEvent(
          new CustomEvent("groupTyping", {
            detail: {
              groupId: data.groupId,
              userId: data.userId,
              isTyping: data.isTyping,
            },
          }),
        );
        break;

      case "typing":
        window.dispatchEvent(
          new CustomEvent("userTyping", {
            detail: {
              userId: data.userId,
              isTyping: data.isTyping,
            },
          }),
        );
        break;

      default:
        console.log("Unknown message type: ", data.type);
    }
  }, []);

  // CONNECTION LOGIC
  const connect = useCallback(async () => {
    // 🟢 CHANGED: Added Server-Side Rendering (SSR) protection.
    // WHY: Next.js runs code on the server first. WebSockets don't exist there. This stops the app from crashing on load.
    if (typeof window === "undefined") return;

    // Reset the flag: we want to be connected now
    shouldReconnectRef.current = true;

    // If a connection already exists (even if it's currently connecting),
    // we kill it before starting a new one to prevent duplicate sockets.
    if (wsRef.current) {
      wsRef.current.onclose = null; // Prevent the auto-reconnect from triggering when we manually close it
      wsRef.current.close();
    }

    let ticketToUse = null;
    try {
      console.log("Requesting secure WebSocket boarding pass...");
      const res = await fetch("/api/auth/ticket");
      const data = await res.json();

      if (data.success && data.ticket) {
        ticketToUse = data.ticket;
      }
    } catch (error) {
      console.error("Failed to fetch WebSocket ticket", error);
    }

    if (!ticketToUse) {
      console.warn("No ticket available. Aborting WebSocket connection.");
      return;
    }

    // 🟢 CHANGED: Replaced the old "window.location.host" logic with our new URL builder.
    // WHY: This forces the React frontend to connect to NestJS (Port 3001) instead of itself (Port 3000).
    const wsUrl = buildWebSocketUrl();

    const socket = new WebSocket(wsUrl);
    wsRef.current = socket; // Initialize WS

    // EVENT: Connection established
    socket.onopen = () => {
      if (socket !== wsRef.current) return; // GUARD: Only proceed if this is still the active socket.
      console.log("Websocket connected✅");
      setIsConnected(true);

      socket.send(
        JSON.stringify({
          event: "authenticate",
          data: { token: ticketToUse },
        }),
      );

      // Clear any pending reconnection timers if we successfully connect
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };

    // EVENT: Server sent a message
    socket.onmessage = (event) => {
      if (socket !== wsRef.current) return; // GUARD: Only proceed if this is still the active socket.

      try {
        const data = JSON.parse(event.data);
        handleIncomingMessage(data);
      } catch (error) {
        console.error("Failed to parse websocket message: ", error);
      }
    };

    socket.onerror = (error) => {
      if (socket !== wsRef.current) return; // GUARD: Only proceed if this is still the active socket.

      console.error("Failed to parse WebSocket error:", error);
    };

    // Event: Connection Lost
    socket.onclose = (event) => {
      if (socket !== wsRef.current) return; // GUARD: Only proceed if this is still the active socket.

      console.log("Websocket disconnected ❌");
      setIsConnected(false);

      // If disconnect() was called, shouldReconnectRef.current is FALSE,
      // so we stop right here and don't trigger the 3-second timer.
      if (!shouldReconnectRef.current) return;

      if (event && event.code === 1008) return;

      // AUTO RECONNECT: This is vital for mobile users switching between WiFi and Mobile data
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log("Attempting to reconnect...");
        connectRef.current?.(reconnectTokenRef.current); // Use the latest token for reconnection
      }, 3000); // Wait 3 seconds before retrying
    };
  }, [buildWebSocketUrl, handleIncomingMessage]); // Empty dependency array means this function only runs ONCE when the component mounts

  // 🟢 CHANGED: Added this useEffect to keep the connectRef updated for the timeout timer.
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // DISCONNECT LOGIC
  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false; // "Don't try to come back"
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null; // Garbage collection
    }
  }, []);

  // OUTGOING MESSAGE HELPER
  const sendMessage = useCallback((type, payload) => {
    // Check if the socket is "Ready state 1" OPEN before sending to avoid crashes
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, ...payload }));
    } else {
      console.warn("WebSocket not connected.");
    }
  }, []);

  // Replaced Date.now() with a secure UUID generator.
  const generateId = () =>
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  // ==========================================
  // SEND MESSAGE FUNCTIONS (NestJS Formatted)
  // ==========================================

  const sendPrivateMessage = useCallback(
    (receiverId, content, replyTo = null, conversationId = null) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const tempId = Date.now().toString(); // Generate a temporary ID

        // 🟢 CHANGED: We now format it EXACTLY how NestJS wants it: { event, data }
        const payload = {
          event: "private_message",
          data: {
            receiverId,
            content,
            replyTo,
            tempId,
            conversationId,
          },
        };

        wsRef.current.send(JSON.stringify(payload));
      }
    },
    [],
  );

  const sendGroupMessage = useCallback((groupId, content) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const tempId = Date.now().toString();

      const payload = {
        event: "group_message",
        data: {
          groupId,
          content,
          tempId,
        },
      };

      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const sendTyping = useCallback((receiverId, isTyping) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const payload = {
        event: "typing",
        data: {
          receiverId,
          isTyping,
        },
      };
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const sendReadReceipt = useCallback((messageId, chatType) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const payload = {
        event: "read_receipt",
        data: {
          messageId,
          chatType,
        },
      };
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  // CLEANUP: If the user navigates away or closes the tab, kill the socket
  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return {
    isConnected,
    messages,
    setMessages,
    connect,
    disconnect,
    sendPrivateMessage,
    sendTyping,
    sendGroupMessage,
    sendReadReceipt,
  };
}
