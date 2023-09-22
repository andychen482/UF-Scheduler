import { Course, Section } from "../CourseUI/CourseTypes";
import "./CalendarStyle.css";
import { ViewState } from "@devexpress/dx-react-scheduler";
import { Paper } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { PaletteMode } from "@mui/material";
import { grey, indigo } from "@mui/material/colors";
import { useEffect, useState, useMemo } from "react";
import InfiniteScroll from "react-infinite-scroller";
import Select from "react-select";
import { addDays, format, getDay, startOfWeek } from "date-fns";
import IntervalTree, { Interval } from "@flatten-js/interval-tree";
import CustomAppointmentForm from "./CustomAppointments/customAppointmentForm";
import {
  Scheduler,
  Appointments,
  WeekView,
  AppointmentTooltip,
  Resources,
} from "@devexpress/dx-react-scheduler-material-ui";

const currentDate = new Date().toISOString().split("T")[0];

function convertTo24Hour(timeStr: string) {
  let [time, modifier] = timeStr.split(" ");
  let [hours, minutes] = time.split(":");

  let hoursInt = parseInt(hours, 10);

  if (modifier === "PM") {
    hoursInt = hoursInt !== 12 ? hoursInt + 12 : hoursInt;
  } else if (hoursInt === 12) {
    hoursInt = 0;
  }

  hours = hoursInt < 10 ? "0" + hoursInt : hoursInt.toString();

  return `${hours}:${minutes}`;
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

  let resources: any[] = [
    {
      fieldName: "classNumber",
      title: "classNumber",
      allowMultiple: false,
      instances: [...instancesThis],
    },
  ];

  const sortOptions = [
    { value: "earliestStart", label: "Earliest Start" },
    { value: "latestStart", label: "Latest Start" },
    { value: "earliestEnd", label: "Earliest End" },
    { value: "latestEnd", label: "Latest End" },
    { value: "mostCompact", label: "Most Compact" },
  ];

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
          if (section.instructors.length > 0) {
            if (section.meetTimes && section.meetTimes.length > 0) {
              return true;
            } else if (allowedNoMeetTimeSection) {
              allowedNoMeetTimeSection = false;
              return true;
            }
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
  // const allCombinations = useMemo(
  //   () => generateAllCombinations(allSelectedSections),
  //   [allSelectedSections, customAppointments]
  // );
  const [allCombinations, setAllCombinations] = useState<Section[][]>(() =>
    generateAllCombinations(allSelectedSections)
  );

  useEffect(() => {
    const newCombinations = generateAllCombinations(allSelectedSections);
    setAllCombinations(newCombinations);
  }, [allSelectedSections, customAppointments]);

  const getDayDate = (dayIndex: number) => {
    const start = startOfWeek(new Date()); // This gets the start of the week (Sunday by default)
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

        for (let { meetDays, meetTimeBegin, meetTimeEnd } of meetTimes) {
          const startDateBase = convertTo24Hour(meetTimeBegin);
          const endDateBase = convertTo24Hour(meetTimeEnd);

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

            // Adding the current appointment to the interval tree
            intervalTree.insert(interval, { title, color });
            appointments.push({
              startDate,
              endDate,
              id,
              classNumber,
              title,
              color,
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
        {onlineMessage && (
          <div
            className="online-section-message mx-[30px]"
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
      </>
    );
  };

  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const getTimes = (combination: any, key: string): number[] => {
    return combination.flatMap((section: any) =>
      section.meetTimes.map((time: any) =>
        timeToMinutes(convertTo24Hour(time[key]))
      )
    );
  };

  const getEarliestAndLatestTimes = (combination: any): [number, number] => {
    const startTimes = getTimes(combination, 'meetTimeBegin');
    const endTimes = getTimes(combination, 'meetTimeEnd');
    return [Math.min(...startTimes), Math.max(...endTimes)];
  };

  const sortCombinations = (selectedOption: any) => {
    return allCombinations.sort((a, b) => {
      if (selectedOption.value === 'mostCompact') {
        const [aStart, aEnd] = getEarliestAndLatestTimes(a);
        const [bStart, bEnd] = getEarliestAndLatestTimes(b);
        return (aEnd - aStart) - (bEnd - bStart);
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
        earliestStart: { key: 'meetTimeBegin', operation: Math.min, direction: 1 },
        latestStart: { key: 'meetTimeBegin', operation: Math.min, direction: -1 },
        earliestEnd: { key: 'meetTimeEnd', operation: Math.max, direction: 1 },
        latestEnd: { key: 'meetTimeEnd', operation: Math.max, direction: -1 },
      };
    
      const sortedCombinations = sortCombinations({ ...sortOptions[selectedOption.value], value: selectedOption.value });
      setAllCombinations(sortedCombinations);
      setCurrentCalendars([]);
      setLastIndex(0);
      setIsLoadingSort(false); // Set loading state to false at the end
    }, 0);
  };

  useEffect(() => {
    setCurrentCalendars([]);
    setLastIndex(0);
    setHasMoreItems(true);
    setSelectedSortOption(null);
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
            <div className="flex flex-col">
              {currentCalendars.map(({ appointments, combination }, index) => (
                <div key={index}>
                  {renderCalendar({ appointments, combination }, index)}
                </div>
              ))}
            </div>
          </InfiniteScroll>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
