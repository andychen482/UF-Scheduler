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
import IntervalTree, { Interval } from "@flatten-js/interval-tree";
import CustomAppointmentForm from "./CustomAppointments/customAppointmentForm";
import {
  Scheduler,
  Appointments,
  WeekView,
  AppointmentTooltip,
  Resources,
} from "@devexpress/dx-react-scheduler-material-ui";
import { isEqual } from "lodash";

type CalendarWithHours = {
  calendar: any[];
  startDayHour: number;
  endDayHour: number;
};

const currentDate = new Date().toISOString().split("T")[0];

function useDeepCompareEffect(callback: () => void, dependencies: any[]) {
  const dependenciesRef = useRef<any[]>();

  useEffect(() => {
    if (!isEqual(dependencies, dependenciesRef.current)) {
      callback();
    }

    dependenciesRef.current = dependencies;
  }, [dependencies, callback]);
}

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
  const [currentCalendars, setCurrentCalendars] = useState<{appointments: any[], combination: Section[]}[]>([]);
  const [hasMoreItems, setHasMoreItems] = useState(true);
  const [allPossibleCalendars, setAllPossibleCalendars] = useState<any[]>([]);
  const [isAppointmentFormVisible, setIsAppointmentFormVisible] =
    useState(false);
  const [instancesThis, setInstances] = useState<any[]>([]);

  let resources: any[] = [
    {
      fieldName: "number",
      title: "number",
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
        if (section.number !== "") {
          instancesThis.push({
            id: `${section.number}`,
            text: `Section ${section.number}`,
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
  const allCombinations = useMemo(
    () => generateAllCombinations(allSelectedSections),
    [allSelectedSections, customAppointments]
  );

  const getDayDate = (dayIndex: number) => {
    const date = new Date();
    const diff = dayIndex - date.getDay();
    date.setDate(date.getDate() + diff);
    return date.toISOString().split("T")[0];
  };

  const dayMapping = new Map([
    ["M", getDayDate(1)],
    ["T", getDayDate(2)],
    ["W", getDayDate(3)],
    ["R", getDayDate(4)],
    ["F", getDayDate(5)],
  ]);

  // Step 3: Create calendars
  const createCalendars = (startIndex: number, endIndex: number) => {
    return allCombinations
      .slice(startIndex, endIndex)
      .map((combination: Section[], index: number) => {
        let appointments = [];
        let isValidCombination = true;

        // Creating an interval tree for efficient overlap checking
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
              let number = null;
              if (section.number !== "") {
                number = `${section.number}`;
              } else {
                number = `${section.courseName}-${section.color}`;
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
                number,
                title,
                color,
              });
            }
          }
        }

        return isValidCombination ? {appointments, combination} : null;
      })
      .filter(Boolean) as { appointments: any[]; combination: Section[] }[]; // Add a type assertion here
    };

  const loadMoreCalendars = () => {
    if (currentCalendars.length >= allPossibleCalendars.length) {
      setHasMoreItems(false);
      return;
    }

    const newCalendars = allPossibleCalendars.slice(
      currentCalendars.length,
      currentCalendars.length + 5
    );
    setCurrentCalendars([...currentCalendars, ...newCalendars]);
  };

  // Step 4: Render calendars
  const renderCalendar = ({ appointments, combination }: { appointments: any[], combination: Section[] }, index: number) => {
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

    let mainResourceName = "number";

    const onlineSections = combination.filter(section => !section.meetTimes || section.meetTimes.length === 0);


    const onlineSectionNames = onlineSections.map(section => section.courseName);
    let onlineMessage = "";
    if (onlineSectionNames.length > 1) {
      onlineMessage = `${onlineSectionNames.slice(0, -1).join(', ')} and ${onlineSectionNames.slice(-1)} are online`;
    } else if (onlineSectionNames.length === 1) {
      onlineMessage = `${onlineSectionNames[0]} is online`;
    }

    return (
      <>
      {onlineMessage && (
        <div className="online-section-message mx-[30px]" style={{backgroundColor: 'rgba(0, 0, 0, 0.6)', padding: '5px', color: '#fff' }}>
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

  useDeepCompareEffect(() => {
    const allCalendars = createCalendars(0, allCombinations.length);
    setAllPossibleCalendars(allCalendars);
    setCurrentCalendars(allCalendars.slice(0, 5));
    setHasMoreItems(true);
    console.log(allCalendars.length);
    // console.log(instancesThis);
  }, [selectedCourses, customAppointments]);

  const calendarsWithComputedHours = (): CalendarWithHours[] => {
    return allPossibleCalendars.map((calendar) => {
      const startDayHour = calendar.length
        ? Math.min(
            ...calendar.map((appt: any) => new Date(appt.startDate).getHours())
          )
        : 24;
      const endDayHour = calendar.length
        ? Math.max(
            ...calendar.map((appt: any) => new Date(appt.endDate).getHours())
          )
        : 0;
      return { calendar, startDayHour, endDayHour };
    });
  };

  const handleSortChange = (selectedOption: any) => {
    let sortedCalendars: { appointments: any[]; combination: Section[] }[] = [];
    switch (selectedOption.value) {
      case "earliestStart":
        sortedCalendars = allPossibleCalendars
          .slice()
          .sort(
            (a, b) =>
              Math.min(...a.appointments.map((appt: any) => new Date(appt.startDate).getHours())) -
              Math.min(...b.appointments.map((appt: any) => new Date(appt.startDate).getHours()))
          );
        break;
      case "latestStart":
        sortedCalendars = allPossibleCalendars
          .slice()
          .sort(
            (a, b) =>
              Math.max(...b.appointments.map((appt: any) => new Date(appt.startDate).getHours())) -
              Math.max(...a.appointments.map((appt: any) => new Date(appt.startDate).getHours()))
          );
        break;
      case "earliestEnd":
        sortedCalendars = allPossibleCalendars
          .slice()
          .sort(
            (a, b) =>
              Math.min(...a.appointments.map((appt: any) => new Date(appt.endDate).getHours())) -
              Math.min(...b.appointments.map((appt: any) => new Date(appt.endDate).getHours()))
          );
        break;
      case "latestEnd":
        sortedCalendars = allPossibleCalendars
          .slice()
          .sort(
            (a, b) =>
              Math.max(...b.appointments.map((appt: any) => new Date(appt.endDate).getHours())) -
              Math.max(...a.appointments.map((appt: any) => new Date(appt.endDate).getHours()))
          );
        break;
      case "mostCompact":
        sortedCalendars = allPossibleCalendars
          .slice()
          .sort(
            (a, b) =>
              (Math.max(...a.appointments.map((appt: any) => new Date(appt.endDate).getHours())) -
                Math.min(...a.appointments.map((appt: any) => new Date(appt.startDate).getHours()))) -
              (Math.max(...b.appointments.map((appt: any) => new Date(appt.endDate).getHours())) -
                Math.min(...b.appointments.map((appt: any) => new Date(appt.startDate).getHours())))
          );
        break;
    }
  
    setAllPossibleCalendars(sortedCalendars);
    setCurrentCalendars(sortedCalendars.slice(0, 5));
  };
  

  return (
    <div className="calendar-container">
      <div className="calendar-display">
        {/* Step 2: Add a button at the top of your component to toggle the visibility state */}

        {/* Step 3: Apply CSS transitions to the CustomAppointmentForm component to achieve the slide-out effect */}
        {isAppointmentFormVisible && (
          <CustomAppointmentForm
            customAppointments={customAppointments}
            setCustomAppointments={setCustomAppointments}
            isAppointmentFormVisible={isAppointmentFormVisible}
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
            options={sortOptions}
            onChange={handleSortChange}
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
