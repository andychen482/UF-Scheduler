import { Course, Section } from "../CourseUI/CourseTypes";
import "./CalendarStyle.css";
import { ViewState } from "@devexpress/dx-react-scheduler";
import { Paper } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { PaletteMode } from "@mui/material";
import { grey, indigo } from "@mui/material/colors";
import { useEffect, useState, useMemo, useRef } from "react";
import InfiniteScroll from "react-infinite-scroller";
import Select, { CSSObjectWithLabel } from "react-select";
import { addDays, format, startOfWeek } from "date-fns";
import IntervalTree, { Interval } from "@flatten-js/interval-tree";
import CustomAppointmentForm from "./CustomAppointments/customAppointmentForm";
import { ScheduleAppointmentTooltipContent } from "./ScheduleAppointmentTooltip";
import { ScheduleAppointmentTooltipLayout } from "./ScheduleAppointmentTooltipLayout";
import {
  Scheduler,
  Appointments,
  WeekView,
  AppointmentTooltip,
  Resources,
} from "@devexpress/dx-react-scheduler-material-ui";

function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

function getTimesForCombination(combination: Section[], key: string): number[] {
  const times: number[] = [];
  for (const section of combination) {
    for (const time of section.meetTimes) {
      const raw =
        key === "meetTimeBegin" ? time.meetTimeBegin : time.meetTimeEnd;
      times.push(timeToMinutes(raw));
    }
  }
  return times;
}

function getEarliestAndLatestTimes(combination: Section[]): [number, number] {
  const startTimes = getTimesForCombination(combination, "meetTimeBegin");
  const endTimes = getTimesForCombination(combination, "meetTimeEnd");
  if (startTimes.length === 0 || endTimes.length === 0) {
    return [0, 0];
  }
  return [Math.min(...startTimes), Math.max(...endTimes)];
}

const CALENDAR_SORT_KEYS: Record<
  string,
  { key: string; operation: typeof Math.min; direction: number }
> = {
  earliestStart: { key: "meetTimeBegin", operation: Math.min, direction: 1 },
  latestStart: { key: "meetTimeBegin", operation: Math.min, direction: -1 },
  earliestEnd: { key: "meetTimeEnd", operation: Math.max, direction: 1 },
  latestEnd: { key: "meetTimeEnd", operation: Math.max, direction: -1 },
};

/** Criteria object consumed by `sortCombinationList` (matches react-select option `value`). */
function buildCalendarSortCriteria(optionValue: string) {
  if (optionValue === "mostCompact") {
    return { value: "mostCompact" as const };
  }
  const base = CALENDAR_SORT_KEYS[optionValue];
  if (!base) {
    return { value: optionValue };
  }
  return { ...base, value: optionValue };
}

function sortCombinationList(
  combinations: Section[][],
  selectedOption: { value: string; key?: string; operation?: typeof Math.min; direction?: number }
): Section[][] {
  const arr = [...combinations];
  arr.sort((a, b) => {
    if (selectedOption.value === "mostCompact") {
      const [aStart, aEnd] = getEarliestAndLatestTimes(a);
      const [bStart, bEnd] = getEarliestAndLatestTimes(b);
      return aEnd - aStart - (bEnd - bStart);
    }
    if (
      selectedOption.key != null &&
      selectedOption.operation != null &&
      selectedOption.direction != null
    ) {
      const aTimes = getTimesForCombination(a, selectedOption.key);
      const bTimes = getTimesForCombination(b, selectedOption.key);
      if (aTimes.length === 0 || bTimes.length === 0) return 0;
      const aValue = selectedOption.operation(...aTimes);
      const bValue = selectedOption.operation(...bTimes);
      return selectedOption.direction * (aValue - bValue);
    }
    return 0;
  });
  return arr;
}

const today = new Date();
const isWeekend = today.getDay() === 6; // 6 is Saturday, 0 is Sunday

const currentDate = isWeekend
  ? new Date(addDays(today, 7 - today.getDay())).toISOString().split("T")[0]
  : today.toISOString().split("T")[0];

const getDayDate = (dayIndex: number) => {
  const start = isWeekend
    ? startOfWeek(addDays(new Date(), 7))
    : startOfWeek(new Date());
  const targetDate = addDays(start, dayIndex);
  return format(targetDate, "yyyy-MM-dd");
};

const dayMapping = new Map([
  ["M", getDayDate(1)],
  ["T", getDayDate(2)],
  ["W", getDayDate(3)],
  ["R", getDayDate(4)],
  ["F", getDayDate(5)],
]);

function areAppointmentsEqual(appointments1?: any[], appointments2?: any[]) {
  if (!appointments1 || !appointments2) return false;
  if (appointments1.length !== appointments2.length) return false;
  for (let i = 0; i < appointments1.length; i++) {
    if (JSON.stringify(appointments1[i]) !== JSON.stringify(appointments2[i])) {
      return false;
    }
  }
  return true;
}

/** Same section set as another schedule (order-independent). */
function areCombinationsEqual(
  a: Section[] | null | undefined,
  b: Section[] | null | undefined
): boolean {
  if (!a || !b || a.length !== b.length) return false;
  const sig = (s: Section) =>
    `${s.courseCode ?? ""}|${s.classNumber ?? ""}|${s.courseName ?? ""}`;
  const sa = [...a].map(sig).sort();
  const sb = [...b].map(sig).sort();
  return sa.every((v, i) => v === sb[i]);
}

/** Tooltip uses instructors on each block; older saved calendars may omit them—recover from combination. */
function mergeInstructorsIntoAppointments(
  appointments: any[],
  combination: Section[]
): any[] {
  return appointments.map((apt) => {
    if (Array.isArray(apt.instructors) && apt.instructors.length > 0) {
      return apt;
    }
    const classNum =
      apt.classNumber != null && apt.classNumber !== ""
        ? String(apt.classNumber)
        : "";
    const section = combination.find((s) => {
      if (s.classNumber !== "" && String(s.classNumber) === classNum) {
        return true;
      }
      if (s.classNumber === "" && `${s.courseName}-${s.color}` === classNum) {
        return true;
      }
      return false;
    });
    if (section?.instructors?.length) {
      return { ...apt, instructors: section.instructors };
    }
    return apt;
  });
}

const getDesignTokens = (mode: PaletteMode) => ({
  palette: {
    mode,
    primary: {
      ...indigo,
      ...(mode === "dark" && {
        main: indigo[400],
      }),
    },
    ...(mode === "dark" && {
      background: {
        default: grey[900],
        paper: grey[900],
      },
    }),
    text: {
      ...{
        primary: "#fff",
        secondary: grey[500],
      },
    },
  },
});

const darkModeTheme = createTheme(getDesignTokens("dark"));

const generateICSContent = (appointments: any[]) => {
  let icsContent =
    "BEGIN:VCALENDAR\nVERSION:2.0\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\nPRODID:-//YourCompany//YourApp//EN\n";

  for (let appointment of appointments) {
    // Parse the firstDay and lastDay dates (MM/DD/YYYY format)
    const firstDayParts = appointment.firstDay?.split('/') || [];
    const lastDayParts = appointment.lastDay?.split('/') || [];
    
    // If we don't have valid first/last day data, skip this appointment
    if (firstDayParts.length !== 3 || lastDayParts.length !== 3) {
      continue;
    }
    
    // Create Date objects for first and last day
    // Note: month is 0-indexed in JavaScript Date
    const firstDay = new Date(
      parseInt(firstDayParts[2]), // year
      parseInt(firstDayParts[0]) - 1, // month (0-indexed)
      parseInt(firstDayParts[1]) // day
    );
    
    const lastDay = new Date(
      parseInt(lastDayParts[2]), // year
      parseInt(lastDayParts[0]) - 1, // month (0-indexed)
      parseInt(lastDayParts[1]) // day
    );
    
    // Get the day of week (0-6) from the startDate
    const dayOfWeek = new Date(appointment.startDate).getDay();
    
    // Find the first occurrence of this day of week on or after firstDay
    let eventStartDate = new Date(firstDay);
    while (eventStartDate.getDay() !== dayOfWeek) {
      eventStartDate.setDate(eventStartDate.getDate() + 1);
    }
    
    // Extract time parts from startDate and endDate
    const startTimePart = appointment.startDate.split('T')[1];
    const endTimePart = appointment.endDate.split('T')[1];
    
    // Format the last day for the UNTIL part of RRULE
    const untilDate = new Date(lastDay);
    // Format as YYYYMMDD
    const untilDateFormatted = untilDate.getFullYear().toString() +
      (untilDate.getMonth() + 1).toString().padStart(2, '0') +
      untilDate.getDate().toString().padStart(2, '0');
    
    // Format the event start and end dates with the correct times
    const eventStartFormatted = eventStartDate.getFullYear().toString() +
      (eventStartDate.getMonth() + 1).toString().padStart(2, '0') +
      eventStartDate.getDate().toString().padStart(2, '0') +
      'T' + startTimePart.replace(/[:-]/g, '');
    
    const eventEndFormatted = eventStartDate.getFullYear().toString() +
      (eventStartDate.getMonth() + 1).toString().padStart(2, '0') +
      eventStartDate.getDate().toString().padStart(2, '0') +
      'T' + endTimePart.replace(/[:-]/g, '');
    
    icsContent += "BEGIN:VEVENT\n";
    icsContent += `DTSTART:${eventStartFormatted}00\n`; // Append "00" for seconds
    icsContent += `DTEND:${eventEndFormatted}00\n`; // Append "00" for seconds
    icsContent += `RRULE:FREQ=WEEKLY;UNTIL=${untilDateFormatted}T235959Z\n`;
    icsContent += `UID:${appointment.id.replace(" ", "")}@ufscheduler.com\n`;
    icsContent += `SUMMARY:${appointment.title}\n`;
    icsContent += `LOCATION:${appointment.location}\n`;
    icsContent += "END:VEVENT\n";
  }

  icsContent += "END:VCALENDAR";
  return icsContent;
};

export type SelectedCalendarType = {
  appointments: any[];
  combination: Section[];
} | null;

interface CalendarProps {
  selectedCourses: Course[];
  customAppointments: any[];
  setCustomAppointments: React.Dispatch<React.SetStateAction<any[]>>;
  term: string;
  year: string;
}

const Calendar: React.FC<CalendarProps> = ({
  selectedCourses,
  customAppointments,
  setCustomAppointments,
  term,
  year,
}) => {
  const [currentCalendars, setCurrentCalendars] = useState<
    { appointments: any[]; combination: Section[] }[]
  >([]);
  const [hasMoreItems, setHasMoreItems] = useState(true);
  const [isAppointmentFormVisible, setIsAppointmentFormVisible] =
    useState(false);
  const [instancesThis, setInstances] = useState<any[]>([]);
  const [lastIndex, setLastIndex] = useState(0);
  const [selectedSortOption, setSelectedSortOption] = useState<{
    value: string;
    label: string;
  } | null>(null);
  const selectedSortOptionRef = useRef<{
    value: string;
    label: string;
  } | null>(null);
  selectedSortOptionRef.current = selectedSortOption;
  const [isLoadingSort, setIsLoadingSort] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const prevSelectedCoursesRef = useRef<Course[]>();
  const prevCustomAppointmentsRef = useRef<any[]>();
  const [animationKey, setAnimationKey] = useState<string>(
    Date.now().toString()
  );

  useEffect(() => {
    if (!isAppointmentFormVisible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsAppointmentFormVisible(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isAppointmentFormVisible]);

  const getCurrentWeekDayDate = (dayIndex: number) => {
    const today = new Date();
    const isSaturday = today.getDay() === 6;
    const start = startOfWeek(today, { weekStartsOn: 0 });
  
    // If it's Saturday, adjust the start to the next week
    const adjustedStart = isSaturday ? addDays(start, 7) : start;
    return addDays(adjustedStart, dayIndex);
  };
  
  const adjustAppointmentsToCurrentWeek = (appointments: any[]) => {
    return appointments.map((appointment) => {
      const dayOfWeek = new Date(appointment.startDate).getDay();
      const currentWeekDate = getCurrentWeekDayDate(dayOfWeek);
      const startTime = appointment.startDate.split("T")[1];
      const endTime = appointment.endDate.split("T")[1];
      
      const newStartDate = `${currentWeekDate.toISOString().split("T")[0]}T${startTime}`;
      const newEndDate = `${currentWeekDate.toISOString().split("T")[0]}T${endTime}`;
  
      return {
        ...appointment,
        startDate: newStartDate,
        endDate: newEndDate,
      };
    });
  };
  
  const [selectedCalendar, setSelectedCalendar] = useState<SelectedCalendarType>(() => {
    const storedValue = localStorage.getItem(`selectedCalendar_${term}_${year}`);
    if (storedValue) {
      try {
        const parsedValue: SelectedCalendarType = JSON.parse(storedValue);
        if (
          parsedValue &&
          Array.isArray(parsedValue.appointments) &&
          Array.isArray(parsedValue.combination)
        ) {
          const adjustedAppointments = adjustAppointmentsToCurrentWeek(parsedValue.appointments);
          return { appointments: adjustedAppointments, combination: parsedValue.combination };
        }
      } catch (error) {
        return null;
      }
    }
    return null;
  });
  

  let resources: any[] = [
    {
      fieldName: "classNumber",
      title: "classNumber",
      allowMultiple: false,
      instances: [...instancesThis],
    },
    {
      fieldName: "location",
      title: "Location",
      allowMultiple: false,
      instances: [...locations],
    },
  ];

  const sortOptions = [
    { value: "earliestStart", label: "Earliest Start" },
    { value: "latestStart", label: "Latest Start" },
    { value: "earliestEnd", label: "Earliest End" },
    { value: "latestEnd", label: "Latest End" },
    { value: "mostCompact", label: "Most Compact" },
  ];

  useEffect(() => {
    if (selectedCalendar !== undefined) {
      localStorage.setItem(
        `selectedCalendar_${term}_${year}`,
        JSON.stringify(selectedCalendar)
      );
    }
  }, [selectedCalendar, term, year]);

  // Reset calendar when term changes
  useEffect(() => {
    // Load the selectedCalendar from localStorage for this term
    const storedCalendar = localStorage.getItem(`selectedCalendar_${term}_${year}`);
    if (storedCalendar) {
      try {
        const parsedCalendar: SelectedCalendarType = JSON.parse(storedCalendar);
        if (
          parsedCalendar &&
          Array.isArray(parsedCalendar.appointments) &&
          Array.isArray(parsedCalendar.combination)
        ) {
          const adjustedAppointments = adjustAppointmentsToCurrentWeek(parsedCalendar.appointments);
          setSelectedCalendar({ 
            appointments: adjustedAppointments, 
            combination: parsedCalendar.combination 
          });
        } else {
          setSelectedCalendar(null);
        }
      } catch (error) {
        setSelectedCalendar(null);
      }
    } else {
      setSelectedCalendar(null);
    }
    
    // Reset state for new calendars
    setCurrentCalendars([]);
    setLastIndex(0);
    setHasMoreItems(true);
    setSelectedSortOption(null);
    setAnimationKey(Date.now().toString());
  }, [term, year]);

  // Step 1: Identify selected sections (omit courses hidden via eye toggle)
  const getAllSelectedSections = () => {
    return selectedCourses
      .filter((course) => !course.excludedFromSchedule)
      .map((course) => {
      const selectedSection = course.sections.find(
        (section) => section.selected === true
      );
      if (selectedSection) {
        selectedSection.courseName = course.name;
        selectedSection.courseCode = course.code;
        return [selectedSection];
      } else {
        course.sections.forEach((section) => {
          section.courseName = course.name;
          section.courseCode = course.code;
        });

        let allowedNoMeetTimeSection = true;

        return course.sections.filter((section) => {
          if (section.meetTimes && section.meetTimes.length > 0) {
            return true;
          } else if (allowedNoMeetTimeSection) {
            allowedNoMeetTimeSection = false;
            return true;
          }
          return false;
        });
      }
    });
  };

  // Step 2: Generate all possible combinations
  const generateAllCombinations = (arrays: Section[][]) => {
    arrays = [...arrays, ...customAppointments.map((item) => [item])];
    for (let sections of arrays) {
      for (let section of sections) {
        if (section.classNumber !== "") {
          instancesThis.push({
            id: `${section.classNumber}`,
            text: `Class # ${section.classNumber}`,
            color: `${section.color}`,
          });
        } else {
          instancesThis.push({
            id: `${section.courseName}-${section.color}`,
            text: `${section.courseName}`,
            color: `${section.color}`,
          });
        }
        for (let meetTime of section.meetTimes) {
          if (meetTime.meetBuilding !== "") {
            locations.push({
              id: `${meetTime.meetBuilding} ${meetTime.meetRoom}`,
              text: `${meetTime.meetBuilding} ${meetTime.meetRoom}`,
              color: `${section.color}`,
            });
          }
        }
      }
    }
    return arrays.reduce<Section[][]>(
      (acc, curr) =>
        acc.flatMap((c: Section[]) =>
          curr.map((n: Section) => ([] as Section[]).concat(c, [n]))
        ),
      [[]]
    );
  };

  const allSelectedSections = useMemo(
    () => getAllSelectedSections(),
    [selectedCourses]
  );

  const [allCombinations, setAllCombinations] = useState<Section[][]>(() =>
    generateAllCombinations(allSelectedSections)
  );

  useEffect(() => {
    const newCombinations = generateAllCombinations(allSelectedSections);
    const opt = selectedSortOptionRef.current;
    if (opt && newCombinations.length > 0) {
      const criteria = buildCalendarSortCriteria(opt.value);
      setAllCombinations(sortCombinationList(newCombinations, criteria));
    } else {
      setAllCombinations(newCombinations);
    }
    setAnimationKey(Date.now().toString());
  }, [allSelectedSections, customAppointments]);

  // Step 3: Create calendars
  const createCalendars = (startIndex: number, numRequested: number) => {
    let generatedCalendars = [];
    let index = startIndex;

    while (
      generatedCalendars.length < numRequested &&
      index < allCombinations.length
    ) {
      const combination = allCombinations[index];
      let appointments = [];
      let isValidCombination = true;
      const intervalTree = new IntervalTree();

      combinationLoop: for (let section of combination) {
        let title = "";
        if (section.courseCode) {
          title = `${section.courseCode}`;
        } else {
          title = `${section.courseName}`;
        }
        const { color, meetTimes } = section;

        for (let {
          meetDays,
          meetTimeBegin,
          meetTimeEnd,
          meetBuilding,
          meetRoom,
        } of meetTimes) {
          const startDateBase = meetTimeBegin;
          const endDateBase = meetTimeEnd;
          const building = meetBuilding;
          const room = meetRoom;

          for (let day of meetDays) {
            const date = dayMapping.get(day);
            const startDate = `${date}T${startDateBase}`;
            const endDate = `${date}T${endDateBase}`;
            const id = `${section.courseName}-${startDate}-${date}`;
            let classNumber = null;
            if (section.classNumber !== "") {
              classNumber = `${section.classNumber}`;
            } else {
              classNumber = `${section.courseName}-${section.color}`;
            }
            // const number = id;
            const startMoment = new Date(startDate);
            const endMoment = new Date(endDate);

            // Creating an interval using the Interval class
            const interval = new Interval(
              startMoment.valueOf(),
              endMoment.valueOf()
            );

            // Checking for overlapping appointments using the interval tree
            if (intervalTree.search(interval).length > 0) {
              isValidCombination = false;
              break combinationLoop;
            }

            const finalExam = section.finalExam;

            const location = `${building} ${room}`;

            const firstDay = section.startDate;
            const lastDay = section.endDate;

            // Adding the current appointment to the interval tree
            intervalTree.insert(interval);
            appointments.push({
              startDate,
              endDate,
              id,
              classNumber,
              title,
              color,
              finalExam,
              location,
              firstDay,
              lastDay,
              instructors: section.instructors,
            });
          }
        }
      }
      if (isValidCombination) {
        generatedCalendars.push({ appointments, combination });
      }
      index++;
    }
    setLastIndex(index); // Update the lastIndex state
    return generatedCalendars;
  };

  const loadMoreCalendars = () => {
    const newCalendars = createCalendars(lastIndex, 5); // Assuming you want to generate 5 calendars at a time

    if (newCalendars.length === 0) {
      setHasMoreItems(false); // No more valid combinations, stop loading
      return;
    }
    setCurrentCalendars([...currentCalendars, ...newCalendars]);
  };

  const debounce = (func: (...args: any[]) => void, delay: number) => {
    let debounceTimer: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => func(...args), delay);
    };
  };

  const loadMoreCalendarsDebounced = debounce(loadMoreCalendars, 50);

  // Step 4: Render calendars
  const renderCalendar = (
    {
      appointments,
      combination,
    }: { appointments: any[]; combination: Section[] },
    index: number
  ) => {
    const startDayHour = appointments.length
      ? Math.min(
          Math.min(
            ...appointments.map((a: any) => new Date(a.startDate).getHours())
          ) - 1,
          23.5
        )
      : 7;

    const endDayHour = appointments.length
      ? Math.min(
          Math.max(
            ...appointments.map((a: any) => new Date(a.endDate).getHours())
          ) + 1,
          23.5
        )
      : 19.5;

    let mainResourceName = "classNumber";

    const onlineSections = combination.filter(
      (section) => !section.meetTimes || section.meetTimes.length === 0
    );

    const onlineSectionNames = onlineSections.map(
      (section) => section.courseName
    );
    let onlineMessage = "";
    if (onlineSectionNames.length > 1) {
      onlineMessage = `${onlineSectionNames
        .slice(0, -1)
        .join(", ")} and ${onlineSectionNames.slice(-1)} are online`;
    } else     if (onlineSectionNames.length === 1) {
      onlineMessage = `${onlineSectionNames[0]} is online`;
    }

    const schedulerAppointments = mergeInstructorsIntoAppointments(
      appointments,
      combination
    );

    return (
      <>
        <div className="header-and-calendar">
          {onlineMessage && (
            <div
              className="online-section-message"
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                padding: "5px",
                color: "#fff",
              }}
            >
              {onlineMessage}
            </div>
          )}
          <div>
            <ThemeProvider theme={darkModeTheme}>
              <Paper>
                <div className="Scheduler">
                  <Scheduler data={schedulerAppointments}>
                    <ViewState currentDate={currentDate} />
                    <WeekView
                      startDayHour={startDayHour}
                      endDayHour={endDayHour}
                      intervalCount={1}
                      cellDuration={50}
                      excludedDays={[0, 6]}
                    />
                    <Appointments />
                    <AppointmentTooltip
                      showCloseButton
                      showDeleteButton={false}
                      contentComponent={ScheduleAppointmentTooltipContent}
                      layoutComponent={ScheduleAppointmentTooltipLayout}
                    />
                    <Resources
                      data={resources}
                      mainResourceName={mainResourceName}
                    />
                  </Scheduler>
                </div>
              </Paper>
            </ThemeProvider>
          </div>
        </div>

        {appointments.length > 0 && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "end",
                marginBottom: "25px",
                marginRight: "30px",
              }}
            >
              {!areAppointmentsEqual(
                selectedCalendar?.appointments,
                appointments
              ) ? (
                <button
                  onClick={() => {
                    setSelectedCalendar({ appointments, combination });
                  }}
                  style={{
                    padding: "5px",
                    fontSize: "16px",
                    borderRadius: "4px",
                    border: "none",
                    backgroundColor: "#008000",
                    color: "#fff",
                    cursor: "pointer",
                    boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
                    marginTop: "7px",
                    height: "auto",
                    width: "auto",
                    marginLeft: "30px",
                  }}
                >
                  Select
                </button>
              ) : (
                <button
                  onClick={() => {
                    setSelectedCalendar(null);
                  }}
                  style={{
                    padding: "5px",
                    fontSize: "16px",
                    borderRadius: "4px",
                    border: "none",
                    backgroundColor: "#D22B2B",
                    color: "#fff",
                    cursor: "pointer",
                    boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
                    marginTop: "7px",
                    height: "auto",
                    width: "auto",
                    marginLeft: "30px",
                  }}
                >
                  Deselect
                </button>
              )}
              <button
                onClick={() => {
                  const icsContent = generateICSContent(appointments);
                  const blob = new Blob([icsContent], {
                    type: "text/calendar",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "calendar.ics";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="text-white"
              >
                Download ICS
              </button>
            </div>
          </>
        )}
      </>
    );
  };

  const displayedCalendars = useMemo(() => {
    if (!selectedCalendar) return currentCalendars;
    return currentCalendars.filter(
      (c) =>
        !areCombinationsEqual(c.combination, selectedCalendar.combination)
    );
  }, [currentCalendars, selectedCalendar]);

  const handleSortChange = (selectedOption: any) => {
    setIsLoadingSort(true);

    setTimeout(() => {
      const criteria = buildCalendarSortCriteria(selectedOption.value);
      const sortedCombinations = sortCombinationList(allCombinations, criteria);
      setAllCombinations(sortedCombinations);
      setCurrentCalendars([]);
      setLastIndex(0);
      setHasMoreItems(true);
      setIsLoadingSort(false);
    }, 0);
  };

  useEffect(() => {
    // Step 2: Compare the current values with the previous values
    if (
      JSON.stringify(prevSelectedCoursesRef.current) !==
        JSON.stringify(selectedCourses) ||
      JSON.stringify(prevCustomAppointmentsRef.current) !==
        JSON.stringify(customAppointments)
    ) {
      setCurrentCalendars([]);
      setLastIndex(0);
      setHasMoreItems(true);
    }

    // Step 4: Update the reference values
    prevSelectedCoursesRef.current = selectedCourses;
    prevCustomAppointmentsRef.current = customAppointments;
  }, [selectedCourses, customAppointments]);

  useEffect(() => {
    // Load initial calendars when the component mounts
    loadMoreCalendarsDebounced();
  }, []); // Empty dependency array means this useEffect runs once when component mounts

  return (
    <div className="calendar-container-2">
      {isLoadingSort && <div className="spinner"></div>}
      <div className="calendar-display">
        {isAppointmentFormVisible && (
          <div
            className="recurring-event-modal-overlay"
            role="presentation"
            onClick={() => setIsAppointmentFormVisible(false)}
          >
            <div
              className="recurring-event-modal-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="recurring-event-modal-title"
              onClick={(e) => e.stopPropagation()}
            >
              <CustomAppointmentForm
                customAppointments={customAppointments}
                setCustomAppointments={setCustomAppointments}
                setIsAppointmentFormVisible={setIsAppointmentFormVisible}
                term={term}
                year={year}
              />
            </div>
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0 20px",
            height: "60px",
            marginBottom: "20px",
          }}
        >
          <Select
            value={selectedSortOption}
            options={sortOptions}
            onChange={(option) => {
              setSelectedSortOption(option || null);
              handleSortChange(option);
            }}
            theme={(theme) => ({
              ...theme,
              borderRadius: 6,
              colors: {
                ...theme.colors,
                primary25: "#E6E6E6",
                primary: "#B3B3B3",
              },
            })}
            placeholder="Sort by..."
            className="sort-dropdown w-[80%] mt-2 font-sans font-semibold"
            menuPortalTarget={document.body} // Append the dropdown to the body element
            styles={{
              menuPortal: (base) =>
                ({ ...base, zIndex: 999 } as CSSObjectWithLabel), // Adjust the z-index to a value lower than the drawer's but higher than other elements
              control: (base) =>
                ({
                  ...base,
                  borderRadius: "4px", // Adjust this value to control the border radius of the control
                  boxShadow: "none", // Remove the box shadow to eliminate the thick border
                  border: "1px solid #ccc", // Optional: Customize the border style
                } as CSSObjectWithLabel),
            }}
          />
          <button
            style={{
              padding: "5px", // Add padding to make the button larger
              fontSize: "16px", // Set a font size
              borderRadius: "4px", // Round the corners of the button
              border: "none", // Remove the default border
              backgroundColor: "#1c63d6", // Use a background color that matches your theme
              color: "#fff", // Set the text color to white
              cursor: "pointer", // Change the cursor to a pointer on hover
              boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)", // Add a subtle box shadow
              marginTop: "7px", // Add some top margin
              height: "auto", // Set the height
              width: "auto", // Set the width
              marginLeft: "10px",
            }}
            onClick={() => setIsAppointmentFormVisible((prev) => !prev)}
          >
            Add Events
          </button>
        </div>
        <div style={{ height: "calc(100vh - 123px)", overflowY: "scroll" }}>
          {" "}
          {/* Add this container with defined height and overflow */}
          <InfiniteScroll
            pageStart={0}
            loadMore={loadMoreCalendarsDebounced}
            hasMore={hasMoreItems}
            useWindow={false}
            key={0}
          >
            {/* Step 3: If selectedCalendar is not empty, display it first */}
            {selectedCalendar && (
              <>
                <div className="bg-gray-800 pt-4 pb-[1px] rounded-md mx-[20px]">
                  <p className="text-white text-lg font-bold ml-[30px] mb-[10px]">
                    Selected Calendar
                  </p>
                  <div>{renderCalendar(selectedCalendar, -1)}</div>
                </div>
              </>
            )}
            {selectedCalendar && displayedCalendars.length > 0 && (
              <div className="mx-6 mt-5 mb-2 flex items-center gap-3">
                <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                  More schedules
                </span>
                <span className="h-px min-w-0 flex-1 bg-gray-700" />
              </div>
            )}
            <div className="flex flex-col mt-2">
              {displayedCalendars.map(({ appointments, combination }, index) => {
                const currentBatchIndex = index % 5;

                return (
                  <div
                    key={`${animationKey}-${index}`}
                    className="fade-in-wave"
                    style={{ animationDelay: `${currentBatchIndex * 100}ms` }}
                  >
                    {renderCalendar({ appointments, combination }, index)}
                  </div>
                );
              })}
              {displayedCalendars.length === 0 &&
                !(selectedCalendar && currentCalendars.length === 0) && (
                  <div className="text-white text-lg text-center align-middle leading-[50vh] fade-text-in">
                    {selectedCalendar && currentCalendars.length > 0
                      ? "No other schedule combinations."
                      : "No possible calendars."}
                  </div>
                )}
            </div>
          </InfiniteScroll>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
