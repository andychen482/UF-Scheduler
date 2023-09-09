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
import Select from "react-select";
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
  const [allPossibleCalendars, setAllPossibleCalendars] = useState<any[]>([]);

  const sortOptions = [
    { value: 'earliestStart', label: 'Earliest Start' },
    { value: 'latestStart', label: 'Latest Start' },
    { value: 'earliestEnd', label: 'Earliest End' },
    { value: 'latestEnd', label: 'Latest End' },
    { value: 'mostCompact', label: 'Most Compact' },
  ];

  function isOverlapping(appointment1: any, appointment2: any) {
    return (
      moment(appointment1.startDate).isBefore(appointment2.endDate) &&
      moment(appointment2.startDate).isBefore(appointment1.endDate)
    );
  }

  function isOverlappingWithAny(appointment: any, calendar: any[]) {
    return calendar.some(existingAppointment => isOverlapping(existingAppointment, appointment));
  }

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
  
      let isValidCombination = true;
  
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
  
            if (isOverlappingWithAny({ startDate, endDate, title }, appointments)) {
              isValidCombination = false;
            } else {
              appointments.push({ startDate, endDate, title });
            }
          });
        });
      });
  
      return isValidCombination ? appointments : null;
    }).filter(calendar => calendar !== null);
  };

  const loadMoreCalendars = () => {
    if (currentCalendars.length >= allPossibleCalendars.length) {
      setHasMoreItems(false);
      return;
    }

    const newCalendars = allPossibleCalendars.slice(currentCalendars.length, currentCalendars.length + 5);
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
    const allSelectedSections = getAllSelectedSections();
    const allCombinations = generateAllCombinations(allSelectedSections);
    const allCalendars = createCalendars(0, allCombinations.length);
    setAllPossibleCalendars(allCalendars);
    setCurrentCalendars(allCalendars.slice(0, 5));
    setHasMoreItems(true);
  }, [selectedCourses]);

  const handleSortChange = (selectedOption: any) => {
    let sortedCalendars;

    switch (selectedOption.value) {
      case 'earliestStart':
        sortedCalendars = [...allPossibleCalendars].sort((a, b) => {
          const aStartDayHour = a.length ? Math.min(...a.map((appt: any) => moment(appt.startDate).hour())) : 24;
          const bStartDayHour = b.length ? Math.min(...b.map((appt: any) => moment(appt.startDate).hour())) : 24;
          return aStartDayHour - bStartDayHour;
        });
        break;
      case 'latestStart':
        sortedCalendars = [...allPossibleCalendars].sort((a, b) => {
          const aStartDayHour = a.length ? Math.min(...a.map((appt: any) => moment(appt.startDate).hour())) : 24;
          const bStartDayHour = b.length ? Math.min(...b.map((appt: any) => moment(appt.startDate).hour())) : 24;
          return bStartDayHour - aStartDayHour;
        });
        break;
      case 'earliestEnd':
        sortedCalendars = [...allPossibleCalendars].sort((a, b) => {
          const aEndDayHour = a.length ? Math.max(...a.map((appt: any) => moment(appt.endDate).hour())) : 0;
          const bEndDayHour = b.length ? Math.max(...b.map((appt: any) => moment(appt.endDate).hour())) : 0;
          return aEndDayHour - bEndDayHour;
        });
        break;
      case 'latestEnd':
        sortedCalendars = [...allPossibleCalendars].sort((a, b) => {
          const aEndDayHour = a.length ? Math.max(...a.map((appt: any) => moment(appt.endDate).hour())) : 0;
          const bEndDayHour = b.length ? Math.max(...b.map((appt: any) => moment(appt.endDate).hour())) : 0;
          return bEndDayHour - aEndDayHour;
        });
        break;
      case 'mostCompact':
        // this is most definetly wrong
        sortedCalendars = [...allPossibleCalendars].sort((a, b) => {
          const aDuration = a.length ? Math.min(Math.max(...a.map((appt: any) => moment(appt.endDate).hour())) - Math.min(...a.map((appt: any) => moment(appt.startDate).hour()))) : 24;
          const bDuration = b.length ? Math.min(Math.max(...b.map((appt: any) => moment(appt.endDate).hour())) - Math.min(...b.map((appt: any) => moment(appt.startDate).hour()))) : 24;
          return aDuration - bDuration;
        });
        break;
      default:
        sortedCalendars = allPossibleCalendars;
    }

    setAllPossibleCalendars(sortedCalendars);
    setCurrentCalendars(sortedCalendars.slice(0, 5));
  };

  return (
    <div className="calendar-container">
      <div className="calendar-display">
        <div className="centered-text text-2xl text-white mb-2">
          Calendar
        </div>
        <Select
          options={sortOptions}
          onChange={handleSortChange}
          placeholder="Sort by..."
          className="m-5"
          menuPortalTarget={document.body} // Append the dropdown to the body element
          styles={{
            menuPortal: base => ({ ...base, zIndex: 999 }), // Adjust the z-index to a value lower than the drawer's but higher than other elements
            control: (base) => ({
              ...base,
              borderRadius: "4px",  // Adjust this value to control the border radius of the control
            }),
          }}
        />
        <div style={{ height: '78vh', overflow: 'auto' }}> {/* Add this container with defined height and overflow */}
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