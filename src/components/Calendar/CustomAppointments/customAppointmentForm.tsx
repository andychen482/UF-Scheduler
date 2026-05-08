import React, { useState, useEffect } from "react";
import { Section } from "../../CourseUI/CourseTypes";
import "./AppointmentStyling.css";
import { IoClose } from "react-icons/io5";

interface CustomAppointmentProps {
  customAppointments: Section[];
  setCustomAppointments: React.Dispatch<React.SetStateAction<Section[]>>;
  appointment?: Section;
  setIsAppointmentFormVisible: React.Dispatch<React.SetStateAction<boolean>>;
  term: string;
  year: string;
}

const DAY_OPTIONS = [
  { id: "monday", value: "M", label: "M" },
  { id: "tuesday", value: "T", label: "T" },
  { id: "wednesday", value: "W", label: "W" },
  { id: "thursday", value: "R", label: "R" },
  { id: "friday", value: "F", label: "F" },
] as const;

const CustomAppointmentForm: React.FC<CustomAppointmentProps> = ({
  customAppointments,
  setCustomAppointments,
  appointment,
  setIsAppointmentFormVisible,
  term,
  year,
}) => {
  const [courseName, setCourseName] = useState("");
  const classNumber = "";
  const [meetDays, setMeetDays] = useState<string[]>([]);
  const [meetTimeBegin, setMeetTimeBegin] = useState("");
  const [meetTimeEnd, setMeetTimeEnd] = useState("");
  const [meetBuilding, setMeetBuilding] = useState("");
  const meetRoom = "";
  const display = "";
  const credits = 0;
  const deptName = "";
  const finalExam = "";
  const [color, setColor] = useState("#1f4da8");
  const [isFormValid, setIsFormValid] = useState(false);
  const meetBldgCode = "";

  const getSemesterDates = () => {
    const currentYear = year || new Date().getFullYear().toString();

    if (term.toLowerCase().includes("fall")) {
      return {
        firstDay: `08/20/${currentYear}`,
        lastDay: `12/04/${currentYear}`,
      };
    } else if (term.toLowerCase().includes("spring")) {
      return {
        firstDay: `01/13/${currentYear}`,
        lastDay: `04/23/${currentYear}`,
      };
    } else if (term.toLowerCase().includes("summer")) {
      return {
        firstDay: `05/13/${currentYear}`,
        lastDay: `08/06/${currentYear}`,
      };
    } else {
      return {
        firstDay: `01/01/${currentYear}`,
        lastDay: `12/31/${currentYear}`,
      };
    }
  };

  useEffect(() => {
    const isValid =
      Boolean(courseName) &&
      meetDays.length > 0 &&
      Boolean(meetTimeBegin) &&
      Boolean(meetTimeEnd) &&
      Boolean(color);
    setIsFormValid(isValid);
  }, [courseName, meetDays, meetTimeBegin, meetTimeEnd, color]);

  useEffect(() => {
    if (appointment) {
      setCourseName(appointment.courseName || "");
      setColor(appointment.color || "");
      if (appointment.meetTimes && appointment.meetTimes[0]) {
        setMeetDays(appointment.meetTimes[0].meetDays || []);
        setMeetTimeBegin(appointment.meetTimes[0].meetTimeBegin || "");
        setMeetTimeEnd(appointment.meetTimes[0].meetTimeEnd || "");
        setMeetBuilding(appointment.meetTimes[0].meetBuilding || "");
      }
    }
  }, [appointment]);

  const handleMeetDaysChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (event.target.checked) {
      setMeetDays((prev) => [...prev, value]);
    } else {
      setMeetDays((prev) => prev.filter((day) => day !== value));
    }
  };

  const handleAddAppointment = () => {
    const semesterDates = getSemesterDates();

    const newAppointment: Section = {
      classNumber,
      display,
      credits,
      deptName,
      instructors: [],
      meetTimes: [
        {
          meetDays,
          meetTimeBegin: meetTimeBegin,
          meetTimeEnd: meetTimeEnd,
          meetBuilding,
          meetRoom,
          meetBldgCode,
        },
      ],
      finalExam,
      selected: false,
      courseName,
      color,
      courseCode: "",
      waitList: {
        cap: 0,
        isEligible: "",
        total: 0,
      },
      startDate: semesterDates.firstDay,
      endDate: semesterDates.lastDay,
      firstDay: semesterDates.firstDay,
      lastDay: semesterDates.lastDay,
    };

    setCustomAppointments([...customAppointments, newAppointment]);
    setIsAppointmentFormVisible(false);
  };

  return (
    <form
      className="custom-appointment-form"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="custom-appointment-form-header">
        <h2 id="recurring-event-modal-title" className="custom-appointment-form-title">
          Add recurring event
        </h2>
        <button
          type="button"
          className="custom-appointment-form-close"
          onClick={() => setIsAppointmentFormVisible(false)}
          aria-label="Close"
        >
          <IoClose size={22} />
        </button>
      </div>

      <p className="custom-appointment-form-hint">
        Blocks time on your calendar every week for this term (e.g. work, gym).
      </p>

      <div className="custom-appointment-form-field">
        <label htmlFor="recurring-event-name">Name</label>
        <input
          id="recurring-event-name"
          type="text"
          placeholder="e.g. Work, Study block"
          value={courseName}
          onChange={(e) => setCourseName(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="custom-appointment-form-field">
        <span className="custom-appointment-form-label">Days</span>
        <div className="custom-appointment-day-toggles" role="group" aria-label="Meeting days">
          {DAY_OPTIONS.map(({ id, value, label }) => (
            <label key={id} className="custom-appointment-day-chip">
              <input
                type="checkbox"
                id={`recurring-${id}`}
                value={value}
                checked={meetDays.includes(value)}
                onChange={handleMeetDaysChange}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="custom-appointment-form-row-times">
        <div className="custom-appointment-form-field">
          <label htmlFor="recurring-start-time">Start</label>
          <input
            id="recurring-start-time"
            type="time"
            value={meetTimeBegin}
            onChange={(e) => setMeetTimeBegin(e.target.value)}
          />
        </div>
        <div className="custom-appointment-form-field">
          <label htmlFor="recurring-end-time">End</label>
          <input
            id="recurring-end-time"
            type="time"
            value={meetTimeEnd}
            onChange={(e) => setMeetTimeEnd(e.target.value)}
          />
        </div>
      </div>

      <div className="custom-appointment-form-field">
        <label htmlFor="recurring-building">Location (optional)</label>
        <input
          id="recurring-building"
          type="text"
          placeholder="Building or description"
          value={meetBuilding}
          onChange={(e) => setMeetBuilding(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="custom-appointment-form-field custom-appointment-form-field-color">
        <label htmlFor="recurring-color">Color</label>
        <input
          id="recurring-color"
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
      </div>

      <div className="custom-appointment-form-actions">
        <button
          type="button"
          className="custom-appointment-form-cancel"
          onClick={() => setIsAppointmentFormVisible(false)}
        >
          Cancel
        </button>
        <button
          type="button"
          className={`custom-appointment-form-submit ${
            !isFormValid ? "is-disabled" : ""
          }`}
          onClick={handleAddAppointment}
          disabled={!isFormValid}
        >
          Add event
        </button>
      </div>
    </form>
  );
};

export default CustomAppointmentForm;
