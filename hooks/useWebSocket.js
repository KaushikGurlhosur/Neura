"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useWebSocket() {
  // STATE
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);

  // REFS - Storing values without re-rendering
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // This ref acts as a "master switch" to tell the hook whether
  // it SHOULD be trying to connect or if it should stay off.
  const shouldReconnectRef = useRef(true);

  // CONNECTION LOGIC
  const connect = useCallback((token) => {
    if (!token) return;

    // Reset the flag: we want to be connected now
    shouldReconnectRef.current = true;

    // If a connection already exists (even if it's currently connecting),
    // we kill it before starting a new one to prevent duplicate sockets.
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) {
      wsRef.current.close();
    }

    // Support both secure wss and non-secure ws connections
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}?token=${token}`;

    wsRef.current = new WebSocket(wsUrl); // Initialize WS

    // EVENT: Connection established
    wsRef.current.onopen = () => {
      console.log("Websocket connected✅");
      setIsConnected(true);

      // Clear any pending reconnection timers if we successfully connect
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };

    // EVENT: Server sent a message
    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleIncomingMessage(data);
      } catch (error) {
        console.error("Failed to parse websocket message: ", error);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error("Failed to parse WebSocket error:", error);
    };

    // Event: Connection Lost
    wsRef.current.onclose = () => {
      console.log("Websocket disconnected ❌");
      setIsConnected(false);

      // If disconnect() was called, shouldReconnectRef.current is FALSE,
      // so we stop right here and don't trigger the 3-second timer.
      if (!shouldReconnectRef.current) return;

      // AUTO RECONNECT: This is vital for mobile users switching between WiFi and Mobile data
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log("Attempting to reconnect...");
        connect(token);
      }, 3000); // Wait 3 seconds before retrying
    };
  }, []); // Empty dependency array means this function only runs ONCE when the component mounts

  // DISCONNECT LOGIC
  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false; // "Don't try to come back"
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null; // Garbage collection
    }
  }, []);

  // INCOMING MESSAGE HANDLER
  const handleIncomingMessage = (data) => {
    switch (data.type) {
      case "new_message":
      case "group_message":
        // Append new messages to the existing list
        setMessages((prev) => [...prev, data.message]);
        break;

      case "message_sent_confirm":
        // OPTIMISTIC UI: When the server confirms the message was saved.
        // We find the "tempId" message and replace it with the real DB object.
        setMessages((prev) =>
          prev.map((msg) =>
            msg.tempId === data.tempId
              ? { ...msg, ...data.message, status: "sent" }
              : msg,
          ),
        );
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
  };

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

  // Helper for Private Messages
  const sendPrivateMessage = useCallback(
    (receiverId, content, replyTo = null) => {
      const tempId = generateId(); // Temporary ID for Optimistic UI

      sendMessage("private_message", { receiverId, content, replyTo, tempId });
      return tempId; // Return the tempId so that the UI can display the message immediately
    },
    [sendMessage],
  );

  // Helper for Group Messages
  const sendGroupMessage = useCallback(
    (groupId, content) => {
      const tempId = Date.now().toString();
      sendMessage("group_message", { groupId, content, tempId });
      return tempId;
    },
    [sendMessage],
  );

  // Helper for Typing Indicators (WhatsApp's "user is typing..." feature)
  const sendTyping = useCallback(
    (receiverId, isTyping) => {
      sendMessage("typing", { receiverId, isTyping });
    },
    [sendMessage],
  );

  // Helper for Read Receipts
  const sendReadReceipt = useCallback(
    (messageId, chatType) => {
      sendMessage("read_receipt", { messageId, chatType });
    },
    [sendMessage],
  );

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
