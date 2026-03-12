import React from "react";
import { FiPlus, FiGrid, FiTrash2 } from "react-icons/fi";
import { FaCheck } from "react-icons/fa6";
import { IoClose } from "react-icons/io5";

interface ToolCallMeta {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  status: "pending" | "confirmed" | "rejected";
}

interface ToolCallCardProps {
  toolCall: ToolCallMeta;
  onConfirm: () => void;
  onReject: () => void;
}

const ACTION_META: Record<
  string,
  { icon: React.ReactNode; label: (args: Record<string, unknown>) => string }
> = {
  add_course_to_scheduler: {
    icon: <FiPlus />,
    label: (args) => `Add ${args.course_code} to schedule`,
  },
  switch_scheduler_view: {
    icon: <FiGrid />,
    label: (args) => `Switch view to ${args.view}`,
  },
  remove_course_from_scheduler: {
    icon: <FiTrash2 />,
    label: (args) => `Remove ${args.course_code}`,
  },
};

const ToolCallCard: React.FC<ToolCallCardProps> = ({
  toolCall,
  onConfirm,
  onReject,
}) => {
  const meta = ACTION_META[toolCall.name];
  const label = meta
    ? meta.label(toolCall.arguments)
    : `${toolCall.name}(${JSON.stringify(toolCall.arguments)})`;
  const icon = meta?.icon ?? <FiGrid />;

  const isPending = toolCall.status === "pending";
  const isConfirmed = toolCall.status === "confirmed";
  const isRejected = toolCall.status === "rejected";

  return (
    <div
      className={`tool-call-card ${isConfirmed ? "tool-call-confirmed" : ""} ${isRejected ? "tool-call-rejected" : ""}`}
    >
      <div className="tool-call-icon">{icon}</div>
      <div className="tool-call-body">
        <span className="tool-call-label">{label}</span>
        {!isPending && (
          <span
            className={`tool-call-status ${isConfirmed ? "status-confirmed" : "status-rejected"}`}
          >
            {isConfirmed ? "Confirmed" : "Dismissed"}
          </span>
        )}
      </div>
      {isPending && (
        <div className="tool-call-actions">
          <button
            className="tool-call-btn tool-call-btn-confirm"
            onClick={onConfirm}
            title="Confirm"
          >
            <FaCheck size={12} />
          </button>
          <button
            className="tool-call-btn tool-call-btn-reject"
            onClick={onReject}
            title="Dismiss"
          >
            <IoClose size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ToolCallCard;
