import React from "react";
import { format } from "date-fns";
import type { ResourceInstance } from "@devexpress/dx-react-scheduler";
import { AppointmentTooltip } from "@devexpress/dx-react-scheduler-material-ui";
import { IoTimeOutline, IoLocationOutline, IoPersonOutline } from "react-icons/io5";
import { websiteURL, type Instructor } from "../CourseUI/CourseTypes";

type TooltipContentProps = React.ComponentProps<
  typeof AppointmentTooltip.Content
>;

type AppointmentData = NonNullable<TooltipContentProps["appointmentData"]>;

function resourceBorderColor(color: ResourceInstance["color"]): string {
  if (!color) return "rgba(255,255,255,0.35)";
  if (typeof color === "string") return color;
  return color[300] ?? color[500] ?? "rgba(255,255,255,0.35)";
}

function ratingClass(rating: number | null | undefined): string {
  if (rating == null) return "schedule-tooltip-rating-none";
  if (rating <= 2) return "schedule-tooltip-rating-low";
  if (rating < 4) return "schedule-tooltip-rating-mid";
  return "schedule-tooltip-rating-high";
}

/** Lower difficulty = easier (green); higher = harder (red). Matches LikedSelectedCourses / CourseDropdown. */
function difficultyClass(difficulty: number | null | undefined): string {
  if (difficulty == null) return "schedule-tooltip-difficulty-none";
  if (difficulty <= 2) return "schedule-tooltip-difficulty-easy";
  if (difficulty < 4) return "schedule-tooltip-difficulty-mid";
  return "schedule-tooltip-difficulty-hard";
}

type AppointmentDataExtras = {
  noWeeklyMeeting?: boolean;
  courseFullName?: string;
};

function filterTooltipInstructors(
  instructors: AppointmentData["instructors"]
): Instructor[] | undefined {
  const raw = instructors as Instructor[] | undefined;
  return raw?.filter((i) => i && String(i.name ?? "").trim() !== "");
}

function tooltipDisplayLocation(raw: unknown): string | undefined {
  if (raw == null) return undefined;
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();
  return t === "" ? undefined : t;
}

function shouldShowFinalExam(finalExam: unknown): boolean {
  if (finalExam == null) return false;
  if (typeof finalExam === "string") {
    const s = finalExam.trim();
    return s !== "" && s.toLowerCase() !== "none";
  }
  if (typeof finalExam === "number" || typeof finalExam === "boolean") {
    const s = String(finalExam).trim();
    return s !== "" && s.toLowerCase() !== "none";
  }
  return false;
}

function TooltipResourcePills({
  resources,
}: Readonly<{
  resources: TooltipContentProps["appointmentResources"];
}>) {
  if (resources.length === 0) return null;
  return (
    <div className="schedule-tooltip-resources">
      {resources.map((r: TooltipContentProps["appointmentResources"][number]) => (
        <span
          key={`${r.fieldName}-${String(r.id)}`}
          className="schedule-tooltip-pill"
          style={{ borderLeftColor: resourceBorderColor(r.color) }}
        >
          {r.text}
        </span>
      ))}
    </div>
  );
}

function TooltipFinalExamLine({
  showFinal,
  finalExam,
}: Readonly<{
  showFinal: boolean;
  finalExam: string | undefined;
}>) {
  if (!showFinal) return null;
  return (
    <div className="schedule-tooltip-final">Final exam: {finalExam}</div>
  );
}

function ScheduleTooltipInstructorBlock({
  instructors,
}: Readonly<{
  instructors: Instructor[];
}>) {
  if (!instructors.length) return null;
  return (
    <div className="schedule-tooltip-row schedule-tooltip-instructors-block">
      <IoPersonOutline className="schedule-tooltip-row-icon" aria-hidden />
      <div className="schedule-tooltip-instructors">
        <div className="schedule-tooltip-instructors-heading">
          {instructors.length > 1 ? "Instructors" : "Instructor"}
        </div>
        {instructors.map((instructor) => (
          <div
            key={`${instructor.name}-${instructor.professorID}`}
            className="schedule-tooltip-instructor-line"
          >
            <span className="schedule-tooltip-instructor-name">{instructor.name}</span>
            {(instructor.avgRating != null || instructor.avgDifficulty != null) && (
              <span className="schedule-tooltip-instructor-metrics">
                {instructor.avgRating ? (
                  <>
                    <span className="schedule-tooltip-metric-label">Rating</span>
                    <a
                      className={`schedule-tooltip-rating ${ratingClass(instructor.avgRating)}`}
                      href={`${websiteURL}${instructor.professorID}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {instructor.avgRating.toFixed(1)}/5
                    </a>
                  </>
                ) : null}
                {instructor.avgRating != null && instructor.avgDifficulty != null ? (
                  <span className="schedule-tooltip-metric-sep" aria-hidden>
                    ·
                  </span>
                ) : null}
                {instructor.avgDifficulty ? (
                  <>
                    <span className="schedule-tooltip-metric-label">Difficulty</span>
                    <a
                      className={`schedule-tooltip-rating ${difficultyClass(
                        instructor.avgDifficulty
                      )}`}
                      href={`${websiteURL}${instructor.professorID}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {instructor.avgDifficulty.toFixed(1)}/5
                    </a>
                  </>
                ) : null}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function NoWeeklyAppointmentTooltip({
  className,
  appointmentData,
  extras,
  appointmentResources,
  instructors,
  showFinal,
  finalExam,
  children,
}: Readonly<{
  className: string;
  appointmentData: AppointmentData;
  extras: AppointmentDataExtras;
  appointmentResources: TooltipContentProps["appointmentResources"];
  instructors: Instructor[] | undefined;
  showFinal: boolean;
  finalExam: string | undefined;
  children: React.ReactNode;
}>) {
  const courseFullName = extras.courseFullName?.trim();
  return (
    <div className={className}>
      <div className="schedule-tooltip-title-row">
        <span className="schedule-tooltip-title">{appointmentData.title}</span>
      </div>
      {courseFullName ? (
        <div className="schedule-tooltip-day">{courseFullName}</div>
      ) : null}
      <div className="schedule-tooltip-row">
        <IoTimeOutline className="schedule-tooltip-row-icon" aria-hidden />
        <span>No weekly meeting time</span>
      </div>
      {instructors && instructors.length > 0 ? (
        <ScheduleTooltipInstructorBlock instructors={instructors} />
      ) : null}
      <TooltipResourcePills resources={appointmentResources} />
      <TooltipFinalExamLine showFinal={showFinal} finalExam={finalExam} />
      {children}
    </div>
  );
}

function WeeklyAppointmentTooltip({
  className,
  appointmentData,
  appointmentResources,
  instructors,
  showFinal,
  finalExam,
  RecurringIcon,
  children,
}: Readonly<{
  className: string;
  appointmentData: AppointmentData;
  appointmentResources: TooltipContentProps["appointmentResources"];
  instructors: Instructor[] | undefined;
  showFinal: boolean;
  finalExam: string | undefined;
  RecurringIcon: React.ComponentType;
  children: React.ReactNode;
}>) {
  const start = new Date(appointmentData.startDate);
  const end = appointmentData.endDate ? new Date(appointmentData.endDate) : start;
  const dayLine = format(start, "EEEE, MMM d");
  const timeLine = `${format(start, "h:mm a")} – ${format(end, "h:mm a")}`;
  const location = tooltipDisplayLocation(appointmentData.location);

  return (
    <div className={className}>
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
      {instructors && instructors.length > 0 ? (
        <ScheduleTooltipInstructorBlock instructors={instructors} />
      ) : null}
      <TooltipResourcePills resources={appointmentResources} />
      <TooltipFinalExamLine showFinal={showFinal} finalExam={finalExam} />
      {children}
    </div>
  );
}

/**
 * Cleaner tooltip when clicking a block on a generated schedule (DevExtreme scheduler).
 * Also supports sections with no weekly meet time (`noWeeklyMeeting`) for the strip above the grid.
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
  const extras = appointmentData as typeof appointmentData & AppointmentDataExtras;
  const isNoWeekly = Boolean(extras?.noWeeklyMeeting);

  if (!appointmentData || (!isNoWeekly && !appointmentData.startDate)) return null;

  const finalExam = appointmentData.finalExam as string | undefined;
  const showFinal = shouldShowFinalExam(finalExam);
  const instructors = filterTooltipInstructors(appointmentData.instructors);
  const contentClass = `schedule-tooltip-content ${className ?? ""}`.trim();

  if (isNoWeekly) {
    return (
      <NoWeeklyAppointmentTooltip
        className={contentClass}
        appointmentData={appointmentData}
        extras={extras}
        appointmentResources={appointmentResources}
        instructors={instructors}
        showFinal={showFinal}
        finalExam={finalExam}
      >
        {children}
      </NoWeeklyAppointmentTooltip>
    );
  }

  return (
    <WeeklyAppointmentTooltip
      className={contentClass}
      appointmentData={appointmentData}
      appointmentResources={appointmentResources}
      instructors={instructors}
      showFinal={showFinal}
      finalExam={finalExam}
      RecurringIcon={RecurringIcon}
    >
      {children}
    </WeeklyAppointmentTooltip>
  );
};
