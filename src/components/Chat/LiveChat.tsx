import React, { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "react-oidc-context";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { IoClose, IoSend, IoChatbubblesOutline } from "react-icons/io5";
import { BACKEND_URLS, getAuthHeaders } from "../../config/api";
import "./Chat.css";

interface Message {
  id?: string;
  message: string;
  user: string;
  timestamp?: string;
}

interface ChatProps {
  setIsChatVisible: React.Dispatch<React.SetStateAction<boolean>>;
  isChatVisible: boolean;
  handleNewMessage: () => void;
  onActiveUsersUpdate: (count: number) => void;
}

const Chat: React.FC<ChatProps> = ({
  setIsChatVisible,
  isChatVisible,
  handleNewMessage,
  onActiveUsersUpdate,
}) => {
  const auth = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [username, setUsername] = useState<string>("");
  const [isUsernameSet, setIsUsernameSet] = useState<boolean>(false);
  const [lastEvaluatedKey, setLastEvaluatedKey] = useState<any>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const isChatVisibleRef = useRef(isChatVisible);
  const usernameRef = useRef(username);
  const handleNewMessageRef = useRef(handleNewMessage);

  useEffect(() => { isChatVisibleRef.current = isChatVisible; }, [isChatVisible]);
  useEffect(() => { usernameRef.current = username; }, [username]);
  useEffect(() => { handleNewMessageRef.current = handleNewMessage; }, [handleNewMessage]);

  const fetchUserProfile = useCallback(async () => {
    if (!auth.user?.id_token) return;
    try {
      const res = await fetch(BACKEND_URLS.GET_PROFILE, {
        headers: getAuthHeaders(auth),
      });
      const data = await res.json();
      if (data.username) {
        setUsername(data.username);
        setIsUsernameSet(true);
      }
    } catch {
      // Profile fetch failed silently
    }
  }, [auth]);

  useEffect(() => {
    if (auth.isAuthenticated) {
      fetchUserProfile();
    }
  }, [auth.isAuthenticated, fetchUserProfile]);

  const loadMessages = useCallback(async (cursor?: any) => {
    if (!auth.user?.id_token) return;
    try {
      const url = new URL(BACKEND_URLS.MESSAGES);
      if (cursor) {
        url.searchParams.set("last_evaluated_key", JSON.stringify(cursor));
      }
      const res = await fetch(url.toString(), {
        headers: getAuthHeaders(auth),
      });
      const data = await res.json();
      return {
        messages: data.messages as Message[],
        last_evaluated_key: data.last_evaluated_key,
      };
    } catch {
      return null;
    }
  }, [auth]);

  // Load initial messages when authenticated
  useEffect(() => {
    if (!auth.isAuthenticated) return;
    (async () => {
      const result = await loadMessages();
      if (result) {
        setMessages(result.messages);
        setLastEvaluatedKey(result.last_evaluated_key);
        checkForUnreadMessages(result.messages);
      }
    })();
  }, [auth.isAuthenticated, loadMessages]); // eslint-disable-line react-hooks/exhaustive-deps

  // SSE stream for real-time messages and active user count
  useEffect(() => {
    if (!auth.isAuthenticated || !auth.user?.id_token) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    fetchEventSource(BACKEND_URLS.MESSAGES_STREAM, {
      headers: { Authorization: `Bearer ${auth.user.id_token}` },
      signal: controller.signal,
      onmessage(ev) {
        if (ev.event === "message") {
          const msg: Message = JSON.parse(ev.data);
          setMessages((prev) => [...prev, msg]);
          if (!isChatVisibleRef.current && msg.user !== usernameRef.current) {
            handleNewMessageRef.current();
          }
        }
        if (ev.event === "active_users") {
          const { active_users } = JSON.parse(ev.data);
          onActiveUsersUpdate(active_users);
        }
      },
      onerror() {
        // Reconnection is handled automatically by fetchEventSource
      },
    });

    return () => {
      controller.abort();
      abortControllerRef.current = null;
    };
  }, [auth.isAuthenticated, auth.user?.id_token, onActiveUsersUpdate]);

  const checkForUnreadMessages = (messagesList: Message[]) => {
    if (!isChatVisible && messagesList.length > 0) {
      const lastReadTimestamp = localStorage.getItem("lastReadTimestamp");
      if (lastReadTimestamp) {
        const hasUnreadMessages = messagesList.some((msg) => {
          if (!msg.timestamp) return false;
          return new Date(msg.timestamp) > new Date(lastReadTimestamp);
        });
        if (hasUnreadMessages) {
          handleNewMessage();
        }
      } else {
        // First visit — no previous read timestamp. Set it to now so future
        // messages are correctly detected as unread, but don't show a badge
        // for pre-existing messages the user hasn't seen yet.
        localStorage.setItem("lastReadTimestamp", new Date().toISOString());
      }
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !username || !auth.user?.id_token) return;
    try {
      await fetch(BACKEND_URLS.MESSAGES, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(auth),
        },
        body: JSON.stringify({ message }),
      });
      setMessage("");
      scrollToBottom();
    } catch {
      // Send failed silently
    }
  };

  const handleUsernameSubmit = async () => {
    if (!username.trim() || !auth.user?.id_token) return;
    try {
      const response = await fetch(BACKEND_URLS.SET_USERNAME, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(auth),
        },
        body: JSON.stringify({ username }),
      });

      const result = await response.json();
      if (response.status === 200) {
        setIsUsernameSet(true);
      } else if (response.status === 409) {
        alert(result.message || result.error);
      }
    } catch {
      // Username set failed silently
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleSendMessage();
    }
  };

  const handleUserNameKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter") {
      handleUsernameSubmit();
    }
  };

  const handleScrollToTop = useCallback(async () => {
    if (
      chatMessagesRef.current?.scrollTop === 0 &&
      lastEvaluatedKey &&
      !isLoadingMore
    ) {
      setIsLoadingMore(true);
      const prevScrollHeight = chatMessagesRef.current?.scrollHeight || 0;
      const result = await loadMessages(lastEvaluatedKey);
      if (result) {
        setMessages((prev) => [...result.messages, ...prev]);
        setLastEvaluatedKey(result.last_evaluated_key);
        setTimeout(() => {
          if (chatMessagesRef.current) {
            const newScrollHeight = chatMessagesRef.current.scrollHeight;
            chatMessagesRef.current.scrollTop = newScrollHeight - prevScrollHeight;
          }
        }, 0);
      }
      setIsLoadingMore(false);
    }
  }, [lastEvaluatedKey, isLoadingMore, loadMessages]);

  useEffect(() => {
    const el = chatMessagesRef.current;
    if (el) {
      el.addEventListener("scroll", handleScrollToTop);
    }
    return () => {
      el?.removeEventListener("scroll", handleScrollToTop);
    };
  }, [handleScrollToTop]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "auto" });
        observer.disconnect();
      }
    });

    if (chatMessagesRef.current) {
      observer.observe(chatMessagesRef.current, { childList: true });
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [isChatVisible]);

  const handleToggleChat = () => {
    setIsChatVisible(false);
    localStorage.setItem("hasClosedChat", "true");
    const now = new Date().toISOString();
    localStorage.setItem("lastReadTimestamp", now);
  };

  useEffect(() => {
    if (isUsernameSet) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      }, 0);
    }
  }, [isUsernameSet]);

  const renderChatBody = () => {
    if (!auth.isAuthenticated) {
      return (
        <div className="livechat-signin-state">
          <IoChatbubblesOutline className="livechat-signin-icon" />
          <h2 className="livechat-signin-title">Live Chat</h2>
          <p className="livechat-signin-subtitle">
            Connect with other Gators in real time
          </p>
          <button
            className="livechat-signin-btn"
            onClick={() => auth.signinRedirect()}
          >
            Sign in to chat
          </button>
        </div>
      );
    }

    if (!isUsernameSet) {
      return (
        <div>
          <h2 className="text-white text-center choose-username-text">
            Choose a Username
          </h2>
          <div className="chat-input-container">
            <input
              type="text"
              className="text-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleUserNameKeyDown}
              placeholder="Enter your username"
            />
            <IoSend
              onClick={handleUsernameSubmit}
              className="text-white cursor-pointer"
            />
          </div>
        </div>
      );
    }

    return (
      <div className="chat-input-container">
        <input
          type="text"
          className="text-input"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Send a message"
        />
        <IoSend
          onClick={handleSendMessage}
          className="text-white cursor-pointer"
        />
      </div>
    );
  };

  return (
    <div className="chat-panel" ref={containerRef}>
      <IoClose className="close-icon" onClick={handleToggleChat} />
      <h1 className="text-white text-xl">Chat</h1>
      <div className="chat-content">
        <div className="chat-messages-container">
          <div className="chat-messages" ref={chatMessagesRef}>
            {auth.isAuthenticated && isUsernameSet
              ? messages.map((msg, index) => (
                  <div
                    key={msg.timestamp + msg.user}
                    className="message-container text-white"
                    id={`message-${index}`}
                  >
                    <div className="message-header">
                      <strong>{msg.user}</strong>
                      <span className="timestamp">
                        {new Date(msg.timestamp || "").toLocaleTimeString(
                          "en-GB",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          }
                        )}
                      </span>
                    </div>
                    <div className="message-content">{msg.message}</div>
                  </div>
                ))
              : null}
            <div ref={messagesEndRef} />
          </div>
          {renderChatBody()}
        </div>
      </div>
    </div>
  );
};

export default Chat;
