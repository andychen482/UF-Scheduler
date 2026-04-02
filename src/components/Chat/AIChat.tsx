import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "react-oidc-context";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import ReactMarkdown from "react-markdown";
import { IoSend } from "react-icons/io5";
import { BsStars } from "react-icons/bs";
import { LuHistory } from "react-icons/lu";
import { BACKEND_URLS, getAuthHeaders } from "../../config/api";
import { useAIActionStore } from "../../store/aiActionStore";
import ToolCallCard from "./ToolCallCard";
import ChatHistoryPanel from "./ChatHistoryPanel";
import "./AIChat.css";

interface ToolCallMeta {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  status: "pending" | "confirmed" | "rejected";
}

interface ChatMessage {
  role: "user" | "assistant" | "tool_call";
  content: string;
  toolCall?: ToolCallMeta;
}

interface ChatSummary {
  session_id: string;
  title: string;
  updated_at: string;
}

const INTRO_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "Hey there, Gator! I'm your UF Course Assistant. Here's what I can help you with:\n\n" +
    "- **Course Search** — Find UF courses by code (e.g. \"COP3530\") or by topic (e.g. \"Data Structures\")\n" +
    "- **Section Details** — Look up instructors, meeting times, locations, and delivery mode for any course\n" +
    "- **Professor Ratings** — Pull up RateMyProfessors ratings, difficulty scores, and student reviews\n" +
    "- **GatorEvals** — Look up official UF teaching evaluation scores (1-5 scale, where 1 = Strongly Disagree and 5 = Strongly Agree)\n" +
    "- **Reddit Opinions** — Search r/UFL for real student experiences and opinions\n" +
    "- **Scheduler Actions** — Add or remove courses from the scheduler\n\n" +
    "What can I help you with?",
};

const AIChat: React.FC = () => {
  const auth = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([INTRO_MESSAGE]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyChats, setHistoryChats] = useState<ChatSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchHistory = useCallback(async () => {
    if (!auth.user?.id_token) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(BACKEND_URLS.AI_CHAT_HISTORY, {
        headers: getAuthHeaders(auth),
      });
      if (res.ok) {
        const data = await res.json();
        setHistoryChats(data.chats ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setHistoryLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    if (historyOpen) {
      fetchHistory();
    }
  }, [historyOpen, fetchHistory]);

  const loadChat = async (targetSessionId: string) => {
    if (!auth.user?.id_token) return;
    try {
      const res = await fetch(`${BACKEND_URLS.AI_CHAT}/${targetSessionId}`, {
        headers: getAuthHeaders(auth),
      });
      if (!res.ok) return;
      const data = await res.json();
      const loaded: ChatMessage[] = (data.messages ?? []).map(
        (m: { role: string; content: string }) => ({
          role: m.role as ChatMessage["role"],
          content: m.content,
        }),
      );
      setMessages(loaded.length > 0 ? loaded : [INTRO_MESSAGE]);
      setSessionId(targetSessionId);
      setHistoryOpen(false);
    } catch {
      // silently fail
    }
  };

  const deleteChat = async (targetSessionId: string) => {
    if (!auth.user?.id_token) return;
    try {
      await fetch(`${BACKEND_URLS.AI_CHAT}/${targetSessionId}`, {
        method: "DELETE",
        headers: getAuthHeaders(auth),
      });
    } catch {
      // silently fail
    }
    setHistoryChats((prev) =>
      prev.filter((c) => c.session_id !== targetSessionId),
    );
    if (targetSessionId === sessionId) {
      setMessages([INTRO_MESSAGE]);
      setSessionId(undefined);
    }
  };

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
          term: localStorage.getItem("selectedTerm") || undefined,
          year: localStorage.getItem("selectedYear") || undefined,
          selected_courses: (() => {
            const t = localStorage.getItem("selectedTerm") || "summer";
            const y = localStorage.getItem("selectedYear") || "26";
            const stored = localStorage.getItem(`selectedCourses_${t}_${y}`);
            if (!stored) return [];
            return JSON.parse(stored).map((c: any) => c.code);
          })(),
        }),
        signal: controller.signal,
        openWhenHidden: true,
        onmessage(ev) {
          if (ev.event === "token") {
            const { token, session_id } = JSON.parse(ev.data);
            fullResponse += token;
            setSessionId(session_id);
            setMessages((prev) => {
              const updated = [...prev];
              for (let i = updated.length - 1; i >= 0; i--) {
                if (updated[i].role === "assistant") {
                  updated[i] = { role: "assistant", content: fullResponse };
                  break;
                }
              }
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
              for (let i = updated.length - 1; i >= 0; i--) {
                if (updated[i].role === "assistant") {
                  updated[i] = {
                    role: "assistant",
                    content: `Error: ${detail}`,
                  };
                  break;
                }
              }
              return updated;
            });
            setIsStreaming(false);
          }
          if (ev.event === "tool_call") {
            const { tool_call_id, name, arguments: args, session_id } =
              JSON.parse(ev.data);
            setSessionId(session_id);
            useAIActionStore
              .getState()
              .addAction({ id: tool_call_id, name, arguments: args });
            setMessages((prev) => [
              ...prev,
              {
                role: "tool_call",
                content: "",
                toolCall: {
                  id: tool_call_id,
                  name,
                  arguments: args,
                  status: "pending",
                },
              },
            ]);
          }
        },
        onclose() {
          throw new Error("stream ended");
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

  const handleNewConversation = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([INTRO_MESSAGE]);
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
        <div className="ai-view-header-actions">
          <button
            className={`ai-view-header-btn ${historyOpen ? "ai-view-header-btn-active" : ""}`}
            onClick={() => setHistoryOpen((prev) => !prev)}
            disabled={isStreaming}
            aria-label="Chat history"
          >
            <LuHistory size={15} />
            History
          </button>
          <button
            className="ai-view-header-btn"
            onClick={handleNewConversation}
            disabled={isStreaming}
          >
            New Chat
          </button>
        </div>
      </div>
      {historyOpen && (
        <ChatHistoryPanel
          chats={historyChats}
          activeSessionId={sessionId}
          loading={historyLoading}
          onSelect={loadChat}
          onDelete={deleteChat}
        />
      )}
      <div className="ai-view-messages">
        {messages.map((msg, index) =>
          msg.role === "tool_call" && msg.toolCall ? (
            <ToolCallCard
              key={index}
              toolCall={msg.toolCall}
              onConfirm={() => {
                useAIActionStore
                  .getState()
                  .confirmAction(msg.toolCall!.id);
                setMessages((prev) =>
                  prev.map((m, i) =>
                    i === index && m.toolCall
                      ? { ...m, toolCall: { ...m.toolCall, status: "confirmed" } }
                      : m
                  )
                );
              }}
              onReject={() => {
                useAIActionStore
                  .getState()
                  .rejectAction(msg.toolCall!.id);
                setMessages((prev) =>
                  prev.map((m, i) =>
                    i === index && m.toolCall
                      ? { ...m, toolCall: { ...m.toolCall, status: "rejected" } }
                      : m
                  )
                );
              }}
            />
          ) : (
            <div
              key={index}
              className={`ai-msg ${msg.role === "user" ? "ai-msg-user" : "ai-msg-assistant"}`}
            >
              <div className="ai-msg-content">
                {msg.role === "assistant" ? (
                  <>
                    <ReactMarkdown
                      components={{
                        a: ({ children, ...props }) => (
                          <a {...props} target="_blank" rel="noopener noreferrer">
                            {children}
                          </a>
                        ),
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                    {isStreaming && index === messages.length - 1 && (
                      <span className="ai-cursor">|</span>
                    )}
                  </>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          )
        )}
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
