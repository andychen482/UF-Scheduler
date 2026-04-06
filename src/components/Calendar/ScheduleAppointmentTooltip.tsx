import React from "react";
import { format } from "date-fns";
import type { ResourceInstance } from "@devexpress/dx-react-scheduler";
import { AppointmentTooltip } from "@devexpress/dx-react-scheduler-material-ui";
import { IoTimeOutline, IoLocationOutline } from "react-icons/io5";

type TooltipContentProps = React.ComponentProps<
  typeof AppointmentTooltip.Content
>;

function resourceBorderColor(color: ResourceInstance["color"]): string {
  if (!color) return "rgba(255,255,255,0.35)";
  if (typeof color === "string") return color;
  return color[300] ?? color[500] ?? "rgba(255,255,255,0.35)";
}

/**
 * Cleaner tooltip when clicking a block on a generated schedule (DevExtreme scheduler).
 */
export const ScheduleAppointmentTooltipContent: React.FC<
  TooltipContentProps
> = ({
  appointmentData,
  appointmentResources,
  recurringIconComponent: RecurringIcon,
  className,
  children,
}) => {
  if (!appointmentData?.startDate) return null;

  const start = new Date(appointmentData.startDate);
  const end = appointmentData.endDate
    ? new Date(appointmentData.endDate)
    : start;
  const dayLine = format(start, "EEEE, MMM d");
  const timeLine = `${format(start, "h:mm a")} – ${format(end, "h:mm a")}`;
  const location = appointmentData.location as string | undefined;
  const finalExam = appointmentData.finalExam as string | undefined;
  const showFinal =
    finalExam &&
    String(finalExam).trim() !== "" &&
    String(finalExam).toLowerCase() !== "none";

  return (
    <div className={`schedule-tooltip-content ${className ?? ""}`.trim()}>
      <div className="schedule-tooltip-title-row">
        {!!appointmentData.rRule && (
          <span className="schedule-tooltip-recurring-wrap">
            <RecurringIcon />
          </span>
        )}
        <span className="schedule-tooltip-title">{appointmentData.title}</span>
      </div>
      <div className="schedule-tooltip-day">{dayLine}</div>
      <div className="schedule-tooltip-row">
        <IoTimeOutline className="schedule-tooltip-row-icon" aria-hidden />
        <span>{timeLine}</span>
      </div>
      {location ? (
        <div className="schedule-tooltip-row">
          <IoLocationOutline className="schedule-tooltip-row-icon" aria-hidden />
          <span>{location}</span>
        </div>
      ) : null}
      {appointmentResources.length > 0 ? (
        <div className="schedule-tooltip-resources">
          {appointmentResources.map((r: TooltipContentProps["appointmentResources"][number]) => (
            <span
              key={`${r.fieldName}-${String(r.id)}`}
              className="schedule-tooltip-pill"
              style={{ borderLeftColor: resourceBorderColor(r.color) }}
            >
              {r.text}
            </span>
          ))}
        </div>
      ) : null}
      {showFinal ? (
        <div className="schedule-tooltip-final">Final exam: {finalExam}</div>
      ) : null}
      {children}
    </div>
  );
};
