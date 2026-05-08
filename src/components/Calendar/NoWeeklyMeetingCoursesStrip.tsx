import React, { useCallback, useEffect, useState } from "react";
import { IoCalendarOutline } from "react-icons/io5";
import { AppointmentTooltip } from "@devexpress/dx-react-scheduler-material-ui";
import type {
  AppointmentModel,
  FormatterFn,
  ValidResourceInstance,
} from "@devexpress/dx-react-scheduler";
import type { Section } from "../CourseUI/CourseTypes";
import { ScheduleTooltipPopover } from "./ScheduleTooltipPopover";
import { ScheduleAppointmentTooltipContent } from "./ScheduleAppointmentTooltip";

const noopFormatDate: FormatterFn = () => "";

const RecurringIconStub: React.ComponentType<object> = () => null;

function buildNoMeetSectionTooltipResources(section: Section): ValidResourceInstance[] {
  const color = section.color || "rgba(255,255,255,0.35)";
  const base = {
    color,
    fieldName: "classNumber",
    allowMultiple: false,
    isMain: false,
  };
  const out: ValidResourceInstance[] = [];
  let i = 0;
  if (section.display?.trim()) {
    const text = section.display.trim();
    out.push({
      ...base,
      id: `nm-${i++}`,
      text,
      title: text,
    });
  }
  if (section.classNumber) {
    const text = `Class # ${section.classNumber}`;
    out.push({
      ...base,
      id: `nm-${i++}`,
      text,
      title: text,
    });
  }
  const credText = `${section.credits} cr`;
  out.push({
    ...base,
    id: `nm-${i++}`,
    text: credText,
    title: credText,
  });
  if (section.startDate && section.endDate) {
    const text = `${section.startDate} – ${section.endDate}`;
    out.push({
      ...base,
      id: `nm-${i++}`,
      text,
      title: text,
    });
  }
  return out;
}

function noMeetAppointmentModel(section: Section): AppointmentModel {
  return {
    title: section.courseCode || section.courseName,
    startDate: new Date(0),
    noWeeklyMeeting: true,
    courseFullName: section.courseName,
    instructors: section.instructors,
    finalExam: section.finalExam,
  };
}

type NoWeeklyMeetingCoursesStripProps = {
  sections: Section[];
};

/**
 * Sections with no meet times don't render on the DevExtreme week grid.
 * Chips open the same non-blocking popover UI as calendar appointment tooltips.
 */
const NoWeeklyMeetingCoursesStrip: React.FC<NoWeeklyMeetingCoursesStripProps> = ({
  sections,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [openSection, setOpenSection] = useState<Section | null>(null);

  const close = useCallback(() => {
    setAnchorEl(null);
    setOpenSection(null);
  }, []);

  useEffect(() => {
    if (openSection && !sections.some((s) => sectionKey(s) === sectionKey(openSection))) {
      close();
    }
  }, [sections, openSection, close]);

  const handleChipClick = (section: Section) => (e: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(e.currentTarget);
    setOpenSection(section);
  };

  if (sections.length === 0) return null;

  const popoverOpen = Boolean(anchorEl && openSection);

  return (
    <>
      <div className="no-meet-strip" role="region" aria-label="Courses without a weekly meeting time">
        <div className="no-meet-strip-inner">
          <div className="no-meet-strip-heading">
            <span className="no-meet-strip-icon-wrap" aria-hidden>
              <IoCalendarOutline className="no-meet-strip-icon" />
            </span>
            <div className="no-meet-strip-titles">
              <span className="no-meet-strip-title">Not on this week view</span>
              <span className="no-meet-strip-sub">
                No weekly class time — click for details. Often online or TBA.
              </span>
            </div>
          </div>
          <div className="no-meet-chip-row">
            {sections.map((section) => (
              <button
                key={sectionKey(section)}
                type="button"
                className="no-meet-chip"
                style={{ borderLeftColor: section.color || "rgba(255,255,255,0.35)" }}
                onClick={handleChipClick(section)}
              >
                <span className="no-meet-chip-code">
                  {section.courseCode || section.courseName}
                </span>
                <span className="no-meet-chip-name">{section.courseName}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {openSection && (
        <ScheduleTooltipPopover
          open={popoverOpen}
          anchorEl={anchorEl}
          onDismiss={close}
          showCloseButton
          commandButtonComponent={AppointmentTooltip.CommandButton}
        >
          <ScheduleAppointmentTooltipContent
            appointmentData={noMeetAppointmentModel(openSection)}
            appointmentResources={buildNoMeetSectionTooltipResources(openSection)}
            formatDate={noopFormatDate}
            recurringIconComponent={RecurringIconStub}
          />
        </ScheduleTooltipPopover>
      )}
    </>
  );
};

function sectionKey(s: Section): string {
  if (s.classNumber !== "") return `${s.courseCode}|${s.classNumber}`;
  return `${s.courseName}|${s.color}`;
}

export default NoWeeklyMeetingCoursesStrip;
