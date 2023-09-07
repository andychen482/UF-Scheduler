import { render } from "@testing-library/react";
import { Course } from "../CourseUI/CourseTypes";
import "./CalendarStyle.css";
import { ViewState } from "@devexpress/dx-react-scheduler";
import { Paper } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { PaletteMode } from "@mui/material";
import { grey, indigo } from "@mui/material/colors";
import moment from "moment";
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
  const courseAppointments = () => {
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

    selectedCourses.forEach((course) => {
      const selectedSection = course.sections.find(
        (section) => section.selected === true
      );
      if (selectedSection) {
        selectedSection.meetTimes.forEach((meetingTime) => {
          meetingTime.meetDays.forEach((day) => {
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
            const title = `${course.name}`;
            appointments.push({ startDate, endDate, title });
          });
        });
      }
    });

    return appointments;
  };

  const appointments = courseAppointments();

  const startDayHour = appointments.length
    ? Math.min(...appointments.map((a) => moment(a.startDate).hour())) - 0.5
    : 7;

  const endDayHour = appointments.length
    ? Math.max(...appointments.map((a) => moment(a.endDate).hour())) + 1
    : 19.5;

  return (
    <div className="calendar-container">
      <div className="calendar-display">
        <div className="centered-text text-2xl text-white mb-10">
          Calendar (WIP)
        </div>
        <ThemeProvider theme={darkModeTheme}>
          <div className="schedule">
            <Paper>
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
            </Paper>
          </div>
        </ThemeProvider>
      </div>
    </div>
  );
};

export default Calendar;
