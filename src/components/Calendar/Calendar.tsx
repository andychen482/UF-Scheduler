import { Course } from "../CourseUI/CourseTypes";
import "./CalendarStyle.css";
import { ViewState } from "@devexpress/dx-react-scheduler";
import { Paper } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { PaletteMode } from "@mui/material";
import { grey, indigo } from "@mui/material/colors";
import { useEffect, useState, useMemo } from "react";
import InfiniteScroll from "react-infinite-scroller";
import Select from "react-select";
import IntervalTree, { Interval } from '@flatten-js/interval-tree';
import {
  Scheduler,
  Appointments,
  WeekView,
  AppointmentTooltip,
} from "@devexpress/dx-react-scheduler-material-ui";

interface CustomAppointmentProps extends Appointments.AppointmentProps {
  color: string;
  style?: React.CSSProperties;
}

const Appointment: React.FC<CustomAppointmentProps> = ({
  children,
  style,
  data,
  color, // Separate color property
  ...restProps
}) => (
  <Appointments.Appointment
    {...restProps}
    data={data}
    style={{
      ...style,
      backgroundColor: color, // Apply the color here
    }}
  >
    {children}
  </Appointments.Appointment>
);

const currentDate = new Date().toISOString().split('T')[0];

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
}

const Calendar: React.FC<CalendarProps> = ({ selectedCourses }) => {
  const [currentCalendars, setCurrentCalendars] = useState<any[]>([]);
  const [hasMoreItems, setHasMoreItems] = useState(true);
  const [allPossibleCalendars, setAllPossibleCalendars] = useState<any[]>([]);

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
        return course.sections.filter((section) => section.instructors.length > 0);
      }
    });
  };

  // Step 2: Generate all possible combinations
  const generateAllCombinations = (arrays: any[][]) => {
    return arrays.reduce(
      (acc, curr) => acc.flatMap((c) => curr.map((n) => [].concat(c, n))),
      [[]]
    );
  };

  const allSelectedSections = useMemo(
    () => getAllSelectedSections(),
    [selectedCourses]
  );
  const allCombinations = useMemo(
    () => generateAllCombinations(allSelectedSections),
    [allSelectedSections]
  );

  const getDayDate = (dayIndex: number) => {
    const date = new Date();
    const diff = dayIndex - date.getDay();
    date.setDate(date.getDate() + diff);
    return date.toISOString().split('T')[0];
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

    return allCombinations.slice(startIndex, endIndex).map((combination) => {
      let appointments = [];
      let isValidCombination = true;
  
      // Creating an interval tree for efficient overlap checking
      const intervalTree = new IntervalTree();
  
      combinationLoop: for (let section of combination) {
        const title = `${section.courseName} ${section.number}`;
        const { color, meetTimes } = section;
  
        for (let { meetDays, meetTimeBegin, meetTimeEnd } of meetTimes) {
          const startDateBase = convertTo24Hour(meetTimeBegin);
          const endDateBase = convertTo24Hour(meetTimeEnd);
  
          for (let day of meetDays) {
            const date = dayMapping.get(day);
            const startDate = `${date}T${startDateBase}`;
            const endDate = `${date}T${endDateBase}`;
  
            const startMoment = new Date(startDate);
            const endMoment = new Date(endDate);
  
            // Creating an interval using the Interval class
            const interval = new Interval(startMoment.valueOf(), endMoment.valueOf());
  
            // Checking for overlapping appointments using the interval tree
            if (intervalTree.search(interval).length > 0) {
              isValidCombination = false;
              break combinationLoop;
            }
  
            // Adding the current appointment to the interval tree
            intervalTree.insert(interval, { title, color });
            appointments.push({ startDate, endDate, title, color });
          }
        }
      }
  
      return isValidCombination ? appointments : null;
    }).filter(Boolean);
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
  const renderCalendar = (appointments: any, index: number) => {
    const startDayHour = appointments.length
      ? Math.min(...appointments.map((a: any) => new Date(a.startDate).getHours())) -
        1
      : 7;

    const endDayHour = appointments.length
      ? Math.max(...appointments.map((a: any) => new Date(a.endDate).getHours())) + 1
      : 19.5;

    return (
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
                <Appointments
                  appointmentComponent={(props) => (
                    <Appointment {...props} color={props.data.color} />
                  )}
                />
                <AppointmentTooltip showCloseButton />
              </Scheduler>
            </div>
          </Paper>
        </ThemeProvider>
      </div>
    );
  };

  useEffect(() => {
    const allSelectedSections = getAllSelectedSections();
    const allCombinations = generateAllCombinations(allSelectedSections);
    const allCalendars = createCalendars(0, allCombinations.length);
    setAllPossibleCalendars(allCalendars);
    setCurrentCalendars(allCalendars.slice(0, 5));
    setHasMoreItems(true);
    console.log(allCalendars.length);
  }, [selectedCourses]);

  const calendarsWithComputedHours = useMemo(() => {
    return allPossibleCalendars.map((calendar) => {
      const startDayHour = calendar.length
        ? Math.min(
            ...calendar.map((appt: any) => new Date(appt.startDate).getHours())
          )
        : 24;
      const endDayHour = calendar.length
        ? Math.max(...calendar.map((appt: any) => new Date(appt.endDate).getHours()))
        : 0;
      return { calendar, startDayHour, endDayHour };
    });
  }, [allPossibleCalendars]);

  const handleSortChange = (selectedOption: any) => {
    let sortedCalendars: any[] = [];

    switch (selectedOption.value) {
      case "earliestStart":
        sortedCalendars = calendarsWithComputedHours
          .sort((a, b) => a.startDayHour - b.startDayHour)
          .map((item) => item.calendar);
        break;
      case "latestStart":
        sortedCalendars = calendarsWithComputedHours
          .sort((a, b) => b.startDayHour - a.startDayHour)
          .map((item) => item.calendar);
        break;
      case "earliestEnd":
        sortedCalendars = calendarsWithComputedHours
          .sort((a, b) => a.endDayHour - b.endDayHour)
          .map((item) => item.calendar);
        break;
      case "latestEnd":
        sortedCalendars = calendarsWithComputedHours
          .sort((a, b) => b.endDayHour - a.endDayHour)
          .map((item) => item.calendar);
        break;
      case "mostCompact":
        sortedCalendars = calendarsWithComputedHours
          .sort((a, b) => (a.endDayHour - a.startDayHour) - (b.endDayHour - b.startDayHour))
          .map((item) => item.calendar);
        break;
    }

    setAllPossibleCalendars(sortedCalendars);
    setCurrentCalendars(sortedCalendars.slice(0, 5));
  };

  return (
    <div className="calendar-container">
      <div className="calendar-display">
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "10vh",
          }}
        >
          <Select
            options={sortOptions}
            onChange={handleSortChange}
            placeholder="Sort by..."
            className="w-[90%] mt-2"
            menuPortalTarget={document.body} // Append the dropdown to the body element
            styles={{
              menuPortal: (base) => ({ ...base, zIndex: 999 }), // Adjust the z-index to a value lower than the drawer's but higher than other elements
              control: (base) => ({
                ...base,
                borderRadius: "4px", // Adjust this value to control the border radius of the control
              }),
            }}
          />
        </div>
        <div style={{ height: "80vh", overflow: "auto" }}>
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
              {currentCalendars.map((appointments, index) => (
                <div key={index}>{renderCalendar(appointments, index)}</div>
              ))}
            </div>
          </InfiniteScroll>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
