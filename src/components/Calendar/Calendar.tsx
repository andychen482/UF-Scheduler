import { Course, Section } from "../CourseUI/CourseTypes";
import "./CalendarStyle.css";
import { ViewState } from "@devexpress/dx-react-scheduler";
import { Paper } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { PaletteMode } from "@mui/material";
import { grey, indigo } from "@mui/material/colors";
import { useEffect, useState, useMemo, useRef } from "react";
import InfiniteScroll from "react-infinite-scroller";
import Select from "react-select";
import { addDays, format, startOfWeek } from "date-fns";
import IntervalTree, { Interval } from "@flatten-js/interval-tree";
import CustomAppointmentForm from "./CustomAppointments/customAppointmentForm";
import {
  Scheduler,
  Appointments,
  WeekView,
  AppointmentTooltip,
  Resources,
} from "@devexpress/dx-react-scheduler-material-ui";

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

//For calendar ICS to stop on final exam (add back when final exam dates are finalized)
function convertToICSFormat(dateStr?: string): string | null {
  if (typeof dateStr !== "string") {
    console.error("Invalid input to convertToICSFormat:", dateStr);
    return null;
  }

  // Extract the date and time parts from the input string
  const [datePart, timePart] = dateStr.split(" @ ");
  const [month, day, year] = datePart.split("/").map(Number);
  const [startTime] = timePart.split(" - ");
  const [hourPart, period] = startTime.split(" ");
  let [hours, minutes] = hourPart.split(":").map(Number);

  // Adjust hours based on AM/PM
  if (period === "PM" && hours !== 12) {
    hours += 12;
  } else if (period === "AM" && hours === 12) {
    hours = 0;
  }

  // Convert to ICS format
  const icsDate = `${year}${String(month).padStart(2, "0")}${String(
    day
  ).padStart(2, "0")}T${String(hours).padStart(2, "0")}${String(
    minutes
  ).padStart(2, "0")}00`;
  return icsDate;
}

const generateICSContent = (appointments: any[]) => {
  let icsContent =
    "BEGIN:VCALENDAR\nVERSION:2.0\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\nPRODID:-//YourCompany//YourApp//EN\n";

  // Mapping between the days of the week and the corresponding dates in the target week
  const dayToDateMapping: { [key: number]: string } = {
    0: "20240107", // Sunday
    1: "20240108", // Monday
    2: "20240109", // Tuesday
    3: "20240110", // Wednesday
    4: "20240111", // Thursday
    5: "20240112", // Friday
    6: "20240113", // Saturday
  };

  for (let appointment of appointments) {
    // Extract the date and time parts from the startDate and endDate
    const startDateParts = appointment.startDate.split("T");
    const endDateParts = appointment.endDate.split("T");

    // Replace the date part with the corresponding date in the target week
    const newStartDate = dayToDateMapping[new Date(appointment.startDate).getUTCDay()] + "T" + startDateParts[1];
    const newEndDate = dayToDateMapping[new Date(appointment.endDate).getUTCDay()] + "T" + endDateParts[1];

    icsContent += "BEGIN:VEVENT\n";
    icsContent += `DTSTART:${newStartDate.replace(/[-:]/g, "")}00\n`; // Append "00" for seconds
    icsContent += `DTEND:${newEndDate.replace(/[-:]/g, "")}00\n`; // Append "00" for seconds
    //wait until final exam dates are finalized
    // icsContent += `RRULE:FREQ=WEEKLY;UNTIL=${convertToICSFormat(appointment.finalExam)}\n`
    icsContent += "RRULE:FREQ=WEEKLY;UNTIL=20240503T115900\n";
    icsContent += `UID:${appointment.id.replace(" ", "")}@ufscheduler.com\n`;
    icsContent += `SUMMARY:${appointment.title}\n`;
    icsContent += `LOCATION:${appointment.location}\n`;
    icsContent += "END:VEVENT\n";
  }

  icsContent += "END:VCALENDAR";
  return icsContent;
};

type SelectedCalendarType = {
  appointments: any[];
  combination: Section[];
} | null;

interface CalendarProps {
  selectedCourses: Course[];
  customAppointments: any[];
  setCustomAppointments: React.Dispatch<React.SetStateAction<any[]>>;
}

const Calendar: React.FC<CalendarProps> = ({
  selectedCourses,
  customAppointments,
  setCustomAppointments,
}) => {
  const [currentCalendars, setCurrentCalendars] = useState<
    { appointments: any[]; combination: Section[] }[]
  >([]);
  const [hasMoreItems, setHasMoreItems] = useState(true);
  const [isAppointmentFormVisible, setIsAppointmentFormVisible] =
    useState(false);
  const [instancesThis, setInstances] = useState<any[]>([]);
  const [lastIndex, setLastIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSortOption, setSelectedSortOption] = useState<{
    value: string;
    label: string;
  } | null>(null);
  const [isLoadingSort, setIsLoadingSort] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const prevSelectedCoursesRef = useRef<Course[]>();
  const prevCustomAppointmentsRef = useRef<any[]>();

  const [selectedCalendar, setSelectedCalendar] =
    useState<SelectedCalendarType>(() => {
      const storedValue = localStorage.getItem("selectedCalendar");
      if (storedValue) {
        try {
          const parsedValue: SelectedCalendarType = JSON.parse(storedValue);
          if (
            parsedValue &&
            Array.isArray(parsedValue.appointments) &&
            Array.isArray(parsedValue.combination)
          ) {
            return parsedValue;
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
        "selectedCalendar",
        JSON.stringify(selectedCalendar)
      );
    }
  }, [selectedCalendar]);

  // Step 1: Identify selected sections
  const getAllSelectedSections = () => {
    return selectedCourses.map((course) => {
      const selectedSection = course.sections.find(
        (section) => section.selected === true
      );
      if (selectedSection) {
        selectedSection.courseName = course.name;
        return [selectedSection];
      } else {
        course.sections.forEach((section) => {
          section.courseName = course.name;
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
          locations.push({
            id: `${meetTime.meetBuilding} ${meetTime.meetBldgCode}`,
            text: `${meetTime.meetBuilding} ${meetTime.meetBldgCode}`,
            color: `${section.color}`,
          });
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
    setAllCombinations(newCombinations);
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
        const title = `${section.courseName}`;
        const { color, meetTimes } = section;

        for (let {
          meetDays,
          meetTimeBegin,
          meetTimeEnd,
          meetBuilding,
          meetBldgCode,
        } of meetTimes) {
          const startDateBase = meetTimeBegin;
          const endDateBase = meetTimeEnd;
          const building = meetBuilding;
          const room = meetBldgCode;

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

            // Adding the current appointment to the interval tree
            intervalTree.insert(interval, { title, color });
            appointments.push({
              startDate,
              endDate,
              id,
              classNumber,
              title,
              color,
              finalExam,
              location,
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
    if (isLoading) {
      return; // Exit if already loading
    }

    setIsLoading(true); // Set loading state to true

    const newCalendars = createCalendars(lastIndex, 5); // Assuming you want to generate 5 calendars at a time

    if (newCalendars.length === 0) {
      setHasMoreItems(false); // No more valid combinations, stop loading
      setIsLoading(false);
      return;
    }
    setCurrentCalendars([...currentCalendars, ...newCalendars]);
    setIsLoading(false); // Set loading state to false
  };

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
    } else if (onlineSectionNames.length === 1) {
      onlineMessage = `${onlineSectionNames[0]} is online`;
    }

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
          <div className="test">
            <ThemeProvider theme={darkModeTheme}>
              <Paper>
                <div className="Scheduler">
                  <Scheduler data={appointments}>
                    <ViewState currentDate={currentDate} />
                    <WeekView
                      startDayHour={startDayHour}
                      endDayHour={endDayHour}
                      intervalCount={1}
                      cellDuration={50}
                      excludedDays={[0, 6]}
                    />
                    <Appointments />
                    <AppointmentTooltip showCloseButton />
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
                  onClick={() =>
                    setSelectedCalendar({ appointments, combination })
                  }
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
                  onClick={() => setSelectedCalendar(null)}
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

  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const getTimes = (combination: any, key: string) => {
    const times = [];
    for (let section of combination) {
      for (let time of section.meetTimes) {
        times.push(timeToMinutes(time[key]));
      }
    }
    return times;
  };

  const getEarliestAndLatestTimes = (combination: any) => {
    const startTimes = getTimes(combination, "meetTimeBegin");
    const endTimes = getTimes(combination, "meetTimeEnd");
    return [Math.min(...startTimes), Math.max(...endTimes)];
  };

  const sortCombinations = (selectedOption: any) => {
    return allCombinations.sort((a, b) => {
      if (selectedOption.value === "mostCompact") {
        const [aStart, aEnd] = getEarliestAndLatestTimes(a);
        const [bStart, bEnd] = getEarliestAndLatestTimes(b);
        return aEnd - aStart - (bEnd - bStart);
      } else {
        const aTimes = getTimes(a, selectedOption.key);
        const bTimes = getTimes(b, selectedOption.key);
        const aValue = selectedOption.operation(...aTimes);
        const bValue = selectedOption.operation(...bTimes);
        return selectedOption.direction * (aValue - bValue);
      }
    });
  };

  const handleSortChange = (selectedOption: any) => {
    setIsLoadingSort(true); // Set loading state to true at the start

    setTimeout(() => {
      const sortOptions: any = {
        earliestStart: {
          key: "meetTimeBegin",
          operation: Math.min,
          direction: 1,
        },
        latestStart: {
          key: "meetTimeBegin",
          operation: Math.min,
          direction: -1,
        },
        earliestEnd: { key: "meetTimeEnd", operation: Math.max, direction: 1 },
        latestEnd: { key: "meetTimeEnd", operation: Math.max, direction: -1 },
      };

      const sortedCombinations = sortCombinations({
        ...sortOptions[selectedOption.value],
        value: selectedOption.value,
      });
      setAllCombinations(sortedCombinations);
      setCurrentCalendars([]);
      setLastIndex(0);
      setHasMoreItems(true);
      setIsLoadingSort(false); // Set loading state to false at the end
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
      setSelectedSortOption(null);
    }

    // Step 4: Update the reference values
    prevSelectedCoursesRef.current = selectedCourses;
    prevCustomAppointmentsRef.current = customAppointments;
  }, [selectedCourses, customAppointments]);

  return (
    <div className="calendar-container">
      {isLoadingSort && <div className="spinner"></div>}
      <div className="calendar-display">
        {isAppointmentFormVisible && (
          <CustomAppointmentForm
            customAppointments={customAppointments}
            setCustomAppointments={setCustomAppointments}
            setIsAppointmentFormVisible={setIsAppointmentFormVisible}
            style={{
              transform: "translateX(-50%)",
              position: "fixed",
              top: "50%",
              left: "50%",
              width: "auto",
              height: "auto",
              zIndex: 999,
              backgroundColor: "#252422",
              marginLeft: "0%", // Adjust to center horizontally
              marginTop: "-15%", // Adjust to center vertically
              border: "1px solid #ccc",
            }}
          ></CustomAppointmentForm>
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
            className="w-[80%] mt-2"
            menuPortalTarget={document.body} // Append the dropdown to the body element
            styles={{
              menuPortal: (base) => ({ ...base, zIndex: 999 }), // Adjust the z-index to a value lower than the drawer's but higher than other elements
              control: (base) => ({
                ...base,
                borderRadius: "4px", // Adjust this value to control the border radius of the control
              }),
            }}
          />
          <button
            style={{
              padding: "5px", // Add padding to make the button larger
              fontSize: "16px", // Set a font size
              borderRadius: "4px", // Round the corners of the button
              border: "none", // Remove the default border
              backgroundColor: indigo[400], // Use a background color that matches your theme
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
        <div style={{ height: "calc(100vh - 123px)", overflow: "auto" }}>
          {" "}
          {/* Add this container with defined height and overflow */}
          <InfiniteScroll
            pageStart={0}
            loadMore={loadMoreCalendars}
            hasMore={hasMoreItems}
            loader={
              <div className="loader text-gray-300 ml-[20px]" key={0}>
                Loading ...
              </div>
            }
            useWindow={false}
          >
            {/* Step 3: If selectedCalendar is not empty, display it first */}
            {selectedCalendar && (
              <>
                <div className="bg-gray-800 pt-4 pb-[1px]">
                  <p className="text-white text-lg font-bold ml-[30px] mb-[10px]">
                    Selected Calendar
                  </p>
                  <div>{renderCalendar(selectedCalendar, -1)}</div>
                </div>
              </>
            )}
            <div className="flex flex-col mt-2">
              {currentCalendars.map(({ appointments, combination }, index) => (
                <div key={index}>
                  {renderCalendar({ appointments, combination }, index)}
                </div>
              ))}
              {currentCalendars.length === 0 && (
                <div className="text-white ml-[20px]">
                  No possible calendars.
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
