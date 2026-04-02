import React from "react";
import { MdDeleteOutline } from "react-icons/md";

interface ChatSummary {
  session_id: string;
  title: string;
  updated_at: string;
}

interface ChatHistoryPanelProps {
  chats: ChatSummary[];
  activeSessionId: string | undefined;
  loading: boolean;
  onSelect: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
}

function formatRelativeTime(isoString: string): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const ChatHistoryPanel: React.FC<ChatHistoryPanelProps> = ({
  chats,
  activeSessionId,
  loading,
  onSelect,
  onDelete,
}) => {
  if (loading) {
    return (
      <div className="ai-history-panel">
        <div className="ai-history-loading">Loading chats...</div>
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="ai-history-panel">
        <div className="ai-history-empty">No previous chats</div>
      </div>
    );
  }

  return (
    <div className="ai-history-panel">
      {chats.map((chat) => (
        <div
          key={chat.session_id}
          className={`ai-history-item ${chat.session_id === activeSessionId ? "ai-history-item-active" : ""}`}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(chat.session_id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(chat.session_id);
            }
          }}
        >
          <div className="ai-history-item-content">
            <span className="ai-history-item-title">{chat.title}</span>
            <span className="ai-history-item-time">
              {formatRelativeTime(chat.updated_at)}
            </span>
          </div>
          <button
            className="ai-history-delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(chat.session_id);
            }}
            aria-label="Delete chat"
          >
            <MdDeleteOutline size={15} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ChatHistoryPanel;
