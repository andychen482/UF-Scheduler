import { render } from "@testing-library/react";
import { Course } from "../CourseUI/CourseTypes";
import "./CalendarStyle.css";
import { ViewState } from "@devexpress/dx-react-scheduler";
import { Paper } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { PaletteMode } from "@mui/material";
import { grey, indigo } from "@mui/material/colors";
import moment from "moment";
import { useEffect, useState } from "react";
import InfiniteScroll from 'react-infinite-scroller';
import {
  Scheduler,
  Appointments,
  WeekView,
  AppointmentTooltip,
} from "@devexpress/dx-react-scheduler-material-ui";

const currentDate = moment().format("YYYY-MM-DD");

function convertTo24Hour(timeStr: string) {
  const [time, modifier] = timeStr.split(" ");

  let [hours, minutes] = time.split(":");

  if (hours === "12") {
    hours = "00";
  }

  if (modifier === "PM") {
    hours = (parseInt(hours, 10) + 12).toString();
  } else {
    if (parseInt(hours, 10) >= 0 && parseInt(hours, 10) < 10) {
      hours = "0" + hours;
    }
  }

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

  // Step 1: Identify selected sections
  const getAllSelectedSections = () => {
    return selectedCourses.map(course => {
      const selectedSection = course.sections.find(section => section.selected === true);
      if (selectedSection) {
        selectedSection.courseName = course.name;
        return [selectedSection];
      } else {
        course.sections.forEach(section => {
          section.courseName = course.name;
        });
        return course.sections;
      }
    });
  };
  

  // Step 2: Generate all possible combinations
  const generateAllCombinations = (arrays: any[][]) => {
    return arrays.reduce((acc, curr) => 
      acc.flatMap(c => curr.map(n => [].concat(c, n)))
    , [[]]);
  };

  const allSelectedSections = getAllSelectedSections();
  const allCombinations = generateAllCombinations(allSelectedSections);

  // Step 3: Create calendars
  const createCalendars = (startIndex: number, endIndex: number) => {
    return allCombinations.slice(startIndex, endIndex).map(combination => {
      let appointments: {
        startDate: string;
        endDate: string;
        title: string;
      }[] = [];

      const dayMapping: { [key: string]: string } = {
        M: "Monday",
        T: "Tuesday",
        W: "Wednesday",
        R: "Thursday",
        F: "Friday",
      };

      combination.forEach((section: any) => {
        section.meetTimes.forEach((meetingTime: any) => {
          meetingTime.meetDays.forEach((day: string) => {
            const fullDayName = dayMapping[day];
            const startDate = `${moment()
              .day(fullDayName)
              .format("YYYY-MM-DD")}T${convertTo24Hour(
              meetingTime.meetTimeBegin
            )}`;
            const endDate = `${moment()
              .day(fullDayName)
              .format("YYYY-MM-DD")}T${convertTo24Hour(
              meetingTime.meetTimeEnd
            )}`;
            const title = `${section.courseName}`;
            appointments.push({ startDate, endDate, title });
          });
        });
      });

      return appointments;
    });
  };

  const loadMoreCalendars = () => {
    // const allSelectedSections = getAllSelectedSections();
    // const allCombinations = generateAllCombinations(allSelectedSections);
    if (currentCalendars.length >= allCombinations.length) {
      setHasMoreItems(false);
      return;
    }

    const newCalendars = createCalendars(currentCalendars.length, currentCalendars.length + 5);
    setCurrentCalendars([...currentCalendars, ...newCalendars]);
  };

  // Step 4: Render calendars
  const renderCalendar = (appointments: any, index: number) => {
    const startDayHour = appointments.length
      ? Math.min(...appointments.map((a: any) => moment(a.startDate).hour())) - 0.5
      : 7;
  
    const endDayHour = appointments.length
      ? Math.max(...appointments.map((a: any) => moment(a.endDate).hour())) + 1
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
              cellDuration={30}
              excludedDays={[0, 6]}
            />
            <Appointments />
            <AppointmentTooltip showCloseButton />
          </Scheduler>
          </div>
        </Paper>
      </ThemeProvider>
      </div>
    );
  };
  
  useEffect(() => {
    setCurrentCalendars([]);
    setHasMoreItems(true);
  }, [selectedCourses]);

  return (
    <div className="calendar-container">
      <div className="calendar-display">
        <div className="centered-text text-2xl text-white mb-5">
          Calendar
        </div>
        <div style={{ height: '80vh', overflow: 'auto' }}> {/* Add this container with defined height and overflow */}
          <InfiniteScroll
            pageStart={0}
            loadMore={loadMoreCalendars}
            hasMore={hasMoreItems}
            loader={<div className="loader" key={0}>Loading ...</div>}
            useWindow={false}
          >
            <div className="flex flex-col">
            {currentCalendars.map((appointments, index) => (
              <div key={index}>
                {renderCalendar(appointments, index)}
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