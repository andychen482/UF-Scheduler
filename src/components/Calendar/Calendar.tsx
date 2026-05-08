import { Course, Section } from "../CourseUI/CourseTypes";
import "./CalendarStyle.css";
import { ViewState } from "@devexpress/dx-react-scheduler";
import { Paper , PaletteMode } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { grey, indigo } from "@mui/material/colors";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import InfiniteScroll from "react-infinite-scroller";
import Select, { CSSObjectWithLabel } from "react-select";
import { addDays, format, startOfWeek } from "date-fns";
import IntervalTree, { Interval } from "@flatten-js/interval-tree";
import CustomAppointmentForm from "./CustomAppointments/customAppointmentForm";
import NoWeeklyMeetingCoursesStrip from "./NoWeeklyMeetingCoursesStrip";
import { ScheduleAppointmentTooltipContent } from "./ScheduleAppointmentTooltip";
import { ScheduleAppointmentTooltipLayout } from "./ScheduleAppointmentTooltipLayout";
import {
  Scheduler,
  Appointments,
  WeekView,
  AppointmentTooltip,
  Resources,
} from "@devexpress/dx-react-scheduler-material-ui";
import {
  findExampleOverlapAcrossCombinations,
  findPairwiseConflictPairs,
  formatSectionShort,
} from "./calendarConflictUtils";

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
  if (a?.length !== b?.length) return false;
  if (!a || !b) return false;
  const sig = (s: Section) =>
    `${s.courseCode ?? ""}|${s.classNumber ?? ""}|${s.courseName ?? ""}`;
  const sa = [...(a ?? [])].map(sig).sort((x, y) => x.localeCompare(y));
  const sb = [...(b ?? [])].map(sig).sort((x, y) => x.localeCompare(y));
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
        primary: "#fff",
        secondary: grey[500],
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
      Number.parseInt(firstDayParts[2]), // year
      Number.parseInt(firstDayParts[0]) - 1, // month (0-indexed)
      Number.parseInt(firstDayParts[1]) // day
    );
    
    const lastDay = new Date(
      Number.parseInt(lastDayParts[2]), // year
      Number.parseInt(lastDayParts[0]) - 1, // month (0-indexed)
      Number.parseInt(lastDayParts[1]) // day
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
      'T' + startTimePart.replaceAll(/[:-]/g, '');
    
    const eventEndFormatted = eventStartDate.getFullYear().toString() +
      (eventStartDate.getMonth() + 1).toString().padStart(2, '0') +
      eventStartDate.getDate().toString().padStart(2, '0') +
      'T' + endTimePart.replaceAll(/[:-]/g, '');
    
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
  const [instancesThis] = useState<any[]>([]);
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
  const [locations] = useState<any[]>([]);
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
    globalThis.addEventListener("keydown", onKey);
    return () => globalThis.removeEventListener("keydown", onKey);
  }, [isAppointmentFormVisible]);

  const getCurrentWeekDayDate = useCallback((dayIndex: number) => {
    const today = new Date();
    const isSaturday = today.getDay() === 6;
    const start = startOfWeek(today, { weekStartsOn: 0 });
  
    // If it's Saturday, adjust the start to the next week
    const adjustedStart = isSaturday ? addDays(start, 7) : start;
    return addDays(adjustedStart, dayIndex);
  }, []);
  
  const adjustAppointmentsToCurrentWeek = useCallback((appointments: any[]) => {
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
  }, [getCurrentWeekDayDate]);
  
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
        console.error(error);
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

  /** Dark select — UF blue focus ring */
  const calendarSelectStyles = useMemo(
    () => ({
      menuPortal: (base: CSSObjectWithLabel) =>
        ({ ...base, zIndex: 999 } as CSSObjectWithLabel),
      control: (base: CSSObjectWithLabel, state: { isFocused: boolean }) =>
        ({
          ...base,
          backgroundColor: "rgba(22, 22, 22, 0.95)",
          borderColor: state.isFocused
            ? "rgba(0, 33, 165, 0.55)"
            : "rgba(255, 255, 255, 0.12)",
          boxShadow: state.isFocused
            ? "0 0 0 1px rgba(0, 33, 165, 0.35)"
            : "none",
          borderRadius: "12px",
          minHeight: "46px",
          paddingLeft: "4px",
          cursor: "pointer",
        } as CSSObjectWithLabel),
      menu: (base: CSSObjectWithLabel) =>
        ({
          ...base,
          backgroundColor: "#181818",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0 12px 40px rgba(0, 0, 0, 0.55)",
        } as CSSObjectWithLabel),
      menuList: (base: CSSObjectWithLabel) =>
        ({
          ...base,
          padding: "6px",
        } as CSSObjectWithLabel),
      option: (
        base: CSSObjectWithLabel,
        state: { isFocused: boolean; isSelected: boolean }
      ) =>
        ({
          ...base,
          backgroundColor: state.isSelected
            ? "rgba(255, 255, 255, 0.1)"
            : "transparent",
          color: "#f3f4f6",
          borderRadius: "8px",
          cursor: "pointer",
        } as CSSObjectWithLabel),
      singleValue: (base: CSSObjectWithLabel) =>
        ({ ...base, color: "#f3f4f6", fontWeight: 600 } as CSSObjectWithLabel),
      placeholder: (base: CSSObjectWithLabel) =>
        ({ ...base, color: "rgba(255, 255, 255, 0.42)" } as CSSObjectWithLabel),
      input: (base: CSSObjectWithLabel) =>
        ({ ...base, color: "#f3f4f6" } as CSSObjectWithLabel),
      clearIndicator: (base: CSSObjectWithLabel) =>
        ({ ...base, color: "rgba(255, 255, 255, 0.45)" } as CSSObjectWithLabel),
      dropdownIndicator: (base: CSSObjectWithLabel) =>
        ({ ...base, color: "rgba(255, 255, 255, 0.45)" } as CSSObjectWithLabel),
    }),
    []
  );

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
        console.error(error);
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
  }, [adjustAppointmentsToCurrentWeek, term, year]);

  // Step 1: Identify selected sections (omit courses hidden via eye toggle)
  const getAllSelectedSections = useCallback(() => {
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
  }, [selectedCourses]);

  // Step 2: Generate all possible combinations
  const generateAllCombinations = useCallback((arrays: Section[][]) => {
    arrays = [...arrays, ...customAppointments.map((item) => [item])];
    for (let sections of arrays) {
      for (let section of sections) {
        if (section.classNumber && section.classNumber !== "") {
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
    // Produces the Cartesian product of 'arrays', where each element is an array of Section[]
    function cartesianProduct<T>(input: T[][]): T[][] {
      if (input.length === 0) return [[]];
      // Start with [[]] and iteratively build up product
      return input.reduce<T[][]>((prod, curr) => {
        const newProd: T[][] = [];
        for (const arr of prod) {
          for (const item of curr) {
            newProd.push([...arr, item]);
          }
        }
        return newProd;
      }, [[]]);
    }
    return cartesianProduct(arrays);
  }, [instancesThis, customAppointments, locations]);

  const allSelectedSections = useMemo(
    () => getAllSelectedSections(),
    [getAllSelectedSections]
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
  }, [allSelectedSections, customAppointments, generateAllCombinations]);

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
            if (section.classNumber && section.classNumber !== "") {
              classNumber = `${section.classNumber}`;
            } else {
              classNumber = `${section.courseName}-${section.color}`;
            }
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

    const noMeetTimeSections = combination.filter(
      (section) => !section.meetTimes || section.meetTimes.length === 0
    );

    const schedulerAppointments = mergeInstructorsIntoAppointments(
      appointments,
      combination
    );

    return (
      <>
        <div className="header-and-calendar">
          <NoWeeklyMeetingCoursesStrip sections={noMeetTimeSections} />
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
          <div className="calendar-toolbar-actions">
              {selectedCalendar == null || !areAppointmentsEqual(
                selectedCalendar.appointments, 
                appointments
              ) ? (
                <button
                  type="button"
                  className="calendar-toolbar-btn calendar-toolbar-btn--success"
                  onClick={() => {
                    setSelectedCalendar({ appointments, combination });
                  }}
                >
                  Select
                </button>
              ) : (
                <button
                  type="button"
                  className="calendar-toolbar-btn calendar-toolbar-btn--danger"
                  onClick={() => {
                    setSelectedCalendar(null);
                  }}
                >
                  Deselect
                </button>
              )}
              <button
                type="button"
                className="calendar-toolbar-btn"
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
              >
                Download ICS
              </button>
            </div>
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

  const scheduleCombinationInputs = useMemo(
    () => [...allSelectedSections, ...customAppointments.map((item) => [item])],
    [allSelectedSections, customAppointments]
  );

  const schedulingConflictDetail = useMemo(() => {
    if (isLoadingSort || hasMoreItems || currentCalendars.length > 0) return null;
    if (allCombinations.length === 0) return null;

    const pairwise = findPairwiseConflictPairs(scheduleCombinationInputs);
    if (pairwise.length > 0) {
      return { kind: "pairwise" as const, pairwise };
    }

    const example = findExampleOverlapAcrossCombinations(allCombinations);
    if (example) {
      return { kind: "example" as const, a: example.a, b: example.b };
    }
    return null;
  }, [
    isLoadingSort,
    hasMoreItems,
    currentCalendars.length,
    allCombinations,
    scheduleCombinationInputs,
  ]);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array means this useEffect runs once when component mounts

  return (
    <div className="calendar-container-2">
      {isLoadingSort && <div className="spinner"></div>}
      <div className="calendar-display">
        {isAppointmentFormVisible && (
          <div className="recurring-event-modal-overlay">
            <button
              type="button"
              className="recurring-event-modal-backdrop"
              aria-label="Close dialog"
              onClick={() => setIsAppointmentFormVisible(false)}
            />
            <dialog
              className="recurring-event-modal-panel"
              open
              aria-labelledby="recurring-event-modal-title"
            >
              <CustomAppointmentForm
                customAppointments={customAppointments}
                setCustomAppointments={setCustomAppointments}
                setIsAppointmentFormVisible={setIsAppointmentFormVisible}
                term={term}
                year={year}
              />
            </dialog>
          </div>
        )}
        <div className="calendar-toolbar">
          <div className="calendar-toolbar-select-wrap">
            <Select
              inputId="calendar-sort-select"
              value={selectedSortOption}
              options={sortOptions}
              onChange={(option) => {
                setSelectedSortOption(option || null);
                handleSortChange(option);
              }}
              placeholder="Sort by…"
              className="calendar-toolbar-select font-sans"
              classNamePrefix="cal-select"
              menuPortalTarget={document.body}
              styles={calendarSelectStyles}
            />
          </div>
          <button
            type="button"
            className="calendar-toolbar-btn calendar-toolbar-btn--brand"
            title="Add custom blocks to your schedule"
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
              <div className="bg-gray-800 pt-4 pb-[1px] rounded-md mx-[20px]">
                  <p className="text-white text-lg font-bold ml-[30px] mb-[10px]">
                    Selected Calendar
                  </p>
                  <div>{renderCalendar(selectedCalendar, -1)}</div>
                </div>
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
              {displayedCalendars.length === 0 && !isLoadingSort && !hasMoreItems && (
                <div className="text-white text-lg text-center fade-text-in px-4 max-w-lg mx-auto py-12">
                  <p className="mb-0">
                    {selectedCalendar
                      ? "No other schedule combinations."
                      : "No possible calendars."}
                  </p>
                  {schedulingConflictDetail ? (
                    <div className="mt-4 text-sm leading-relaxed text-gray-300 text-left">
                      {schedulingConflictDetail.kind === "pairwise" ? (
                        <>
                          <p className="font-semibold text-[#ffb38a]/90 mb-2">
                            These pairs always clash (no section choice avoids overlap):
                          </p>
                          <ul className="list-disc pl-5 space-y-1.5">
                            {schedulingConflictDetail.pairwise.map((p, i) => (
                              <li key={`${p.labelA}-${p.labelB}-${i}`}>
                                <span className="text-gray-200">{p.labelA}</span>
                                <span className="text-gray-500"> and </span>
                                <span className="text-gray-200">{p.labelB}</span>
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <p>
                          <span className="text-gray-400">Example overlap: </span>
                          {formatSectionShort(schedulingConflictDetail.a)} and{" "}
                          {formatSectionShort(schedulingConflictDetail.b)} share a meeting time on
                          the same day.
                        </p>
                      )}
                    </div>
                  ) : null}
                  {allCombinations.length === 0 && !schedulingConflictDetail ? (
                    <p className="mt-3 text-sm text-gray-400">
                      No section combinations to build a week (add courses or meeting times).
                    </p>
                  ) : null}
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
