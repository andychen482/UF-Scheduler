import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "react-oidc-context";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import ReactMarkdown from "react-markdown";
import { IoSend } from "react-icons/io5";
import { BsStars } from "react-icons/bs";
import { BACKEND_URLS, getAuthHeaders } from "../../config/api";
import "./AIChat.css";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const AIChat: React.FC = () => {
  const auth = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming || !auth.user?.id_token) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsStreaming(true);

    let fullResponse = "";
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await fetchEventSource(BACKEND_URLS.AI_CHAT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(auth),
        },
        body: JSON.stringify({
          prompt: userMessage,
          session_id: sessionId || undefined,
        }),
        signal: controller.signal,
        onmessage(ev) {
          if (ev.event === "token") {
            const { token, session_id } = JSON.parse(ev.data);
            fullResponse += token;
            setSessionId(session_id);
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: "assistant",
                content: fullResponse,
              };
              return updated;
            });
          }
          if (ev.event === "done") {
            const { session_id } = JSON.parse(ev.data);
            setSessionId(session_id);
            setIsStreaming(false);
          }
          if (ev.event === "error") {
            const { detail } = JSON.parse(ev.data);
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: "assistant",
                content: `Error: ${detail}`,
              };
              return updated;
            });
            setIsStreaming(false);
          }
        },
        onerror() {
          setIsStreaming(false);
          throw new Error("SSE connection failed");
        },
      });
    } catch {
      if (!controller.signal.aborted) {
        setIsStreaming(false);
      }
    }
  };

  const handleNewConversation = async () => {
    if (sessionId && auth.user?.id_token) {
      try {
        await fetch(`${BACKEND_URLS.AI_CHAT}/${sessionId}`, {
          method: "DELETE",
          headers: getAuthHeaders(auth),
        });
      } catch {
        // Delete failed silently
      }
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setSessionId(undefined);
    setIsStreaming(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleSend();
    }
  };

  if (!auth.isAuthenticated) {
    return (
      <div className="ai-view-panel">
        <div className="ai-view-empty-state">
          <BsStars className="ai-view-empty-icon" />
          <h2 className="ai-view-empty-title">AI Assistant</h2>
          <p className="ai-view-empty-subtitle">
            Get help with courses, sections, and schedules
          </p>
          <button
            className="ai-view-signin-btn"
            onClick={() => auth.signinRedirect()}
          >
            Sign in to use AI Assistant
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-view-panel">
      <div className="ai-view-header">
        <div className="ai-view-header-left">
          <BsStars className="ai-view-header-icon" />
          <h2 className="ai-view-title">AI Assistant</h2>
        </div>
        <button
          className="ai-view-new-chat-btn"
          onClick={handleNewConversation}
          disabled={isStreaming}
        >
          New Chat
        </button>
      </div>
      <div className="ai-view-messages">
        {messages.length === 0 && (
          <div className="ai-view-welcome">
            <BsStars className="ai-view-welcome-icon" />
            <p className="ai-view-welcome-text">
              Ask me about courses, sections, or schedules.
            </p>
          </div>
        )}
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`ai-msg ${msg.role === "user" ? "ai-msg-user" : "ai-msg-assistant"}`}
          >
            <div className="ai-msg-content">
              {msg.role === "assistant" ? (
                <>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                  {isStreaming && index === messages.length - 1 && (
                    <span className="ai-cursor">|</span>
                  )}
                </>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="ai-view-input-bar">
        <input
          type="text"
          className="ai-view-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about courses..."
          disabled={isStreaming}
        />
        <button
          className={`ai-view-send-btn ${isStreaming ? "disabled" : ""}`}
          onClick={handleSend}
          disabled={isStreaming}
        >
          <IoSend size={18} />
        </button>
      </div>
    </div>
  );
};

export default AIChat;
