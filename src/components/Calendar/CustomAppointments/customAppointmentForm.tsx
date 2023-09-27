import React, { useState, useEffect } from "react";
import { Section } from "../../CourseUI/CourseTypes"; // adjust the path as necessary
import "./AppointmentStyling.css";
import { AiOutlineClose } from "react-icons/ai";

interface CustomAppointmentProps {
  customAppointments: Section[];
  setCustomAppointments: React.Dispatch<React.SetStateAction<Section[]>>;
  appointment?: Section;
  style?: React.CSSProperties; // Add style prop here
  setIsAppointmentFormVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

const CustomAppointmentForm: React.FC<CustomAppointmentProps> = ({
  customAppointments,
  setCustomAppointments,
  appointment,
  style,
  setIsAppointmentFormVisible,
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
    const newAppointment: Section = {
      classNumber,
      display,
      credits,
      deptName,
      instructors: [], // You might want to add functionality to add instructors
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
    };

    setCustomAppointments([...customAppointments, newAppointment]);
    setIsAppointmentFormVisible(false);
  };

  return (
    <form className="custom-appointment-form" style={style}>
      {/* Include input fields for all the properties such as display, credits, deptName, finalExam, and color */}
      <div className="form-row">
        <div>
          <label>Name:</label>
          <input
            type="text"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
          />
        </div>
        <div>
          <label>Meet Days:</label>
          <input
            type="checkbox"
            id="monday"
            value="M"
            onChange={handleMeetDaysChange}
          />
          <label className="checkbox-label" htmlFor="monday">
            M
          </label>

          <input
            type="checkbox"
            id="tuesday"
            value="T"
            onChange={handleMeetDaysChange}
          />
          <label className="checkbox-label" htmlFor="tuesday">
            T
          </label>

          <input
            type="checkbox"
            id="wednesday"
            value="W"
            onChange={handleMeetDaysChange}
          />
          <label className="checkbox-label" htmlFor="wednesday">
            W
          </label>

          <input
            type="checkbox"
            id="thursday"
            value="R"
            onChange={handleMeetDaysChange}
          />
          <label className="checkbox-label" htmlFor="thursday">
            R
          </label>

          <input
            type="checkbox"
            id="friday"
            value="F"
            onChange={handleMeetDaysChange}
          />
          <label className="checkbox-label" htmlFor="friday">
            F
          </label>
        </div>
      </div>
      <AiOutlineClose
            style={{ position: "absolute", right: "2%", top: "10px", color: "#FF605C" }}
            onClick={() => setIsAppointmentFormVisible((prev) => !prev)}
            className="close-button"
          />
      <div className="form-row">
        <div>
          <label>Start Time:</label>
          <input
            type="time"
            value={meetTimeBegin}
            onChange={(e) => setMeetTimeBegin(e.target.value)}
          />
        </div>
        <div>
          <label>End Time:</label>
          <input
            type="time"
            value={meetTimeEnd}
            onChange={(e) => setMeetTimeEnd(e.target.value)}
          />
        </div>
      </div>
      <div className="form-row">
        <div>
          <label>Color:</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </div>
      </div>
<div className="form-row button-row">
  <button
    type="button"
    className={`add-appointment-button ${!isFormValid ? 'disabled-button' : ''}`}
    onClick={handleAddAppointment}
    disabled={!isFormValid}
  >
    Add Recurring Event
  </button>
</div>
    </form>
  );
};

export default CustomAppointmentForm;