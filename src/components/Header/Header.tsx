import "./HeaderStyles.css";
import { useEffect, useState } from "react";
import { AiOutlineCalendar } from "react-icons/ai";
import { PiGraphFill } from "react-icons/pi";
import { Course } from "../CourseUI/CourseTypes";

interface HeaderProps {
  calendarView: () => void;
  graphView: () => void;
  showDisplayWrite: boolean;
  selectedCourses: Course[];
}

const Header: React.FC<HeaderProps> = ({
  calendarView,
  graphView,
  showDisplayWrite,
  selectedCourses,
}) => {
  const [totalCredits, setTotalCredits] = useState(0);

  useEffect(() => {
    const sumCredits = selectedCourses.reduce((totalCredits, course) => {
      // Check if credits is a number
      if (typeof course.sections[0].credits === "number") {
        return totalCredits + course.sections[0].credits;
      }
      // If it's not a number, just return the accumulated total so far
      return totalCredits;
    }, 0);

    setTotalCredits(sumCredits);
  }, [selectedCourses]);
  return (
    <header className="header flex gap-x-5">
      <div className="credits-container mt-1 text-white">Credits: {totalCredits}</div>
      <div className="button-container gap-x-4">
        <button
          className={`Button cursor-pointer text-gray-400 ${
            showDisplayWrite ? "show" : "grayed"
          }`}
          onClick={graphView}
        >
          <div className="button-content">
            <div className="icon-text-container">
              <PiGraphFill />
              <span className="text-[1.0rem] ml-2 overflow-hidden">Graph</span>
            </div>
          </div>
        </button>
        <button
          className={`Button cursor-pointer text-gray-400 ${
            showDisplayWrite ? "grayed" : "show"
          }`}
          onClick={calendarView}
        >
          <div className="button-content">
            <div className="icon-text-container">
              <AiOutlineCalendar />
              <span className="text-[1.0rem] ml-2">Calendar</span>
            </div>
          </div>
        </button>
      </div>
      <div className="mr-2">
        <h1 className="title">UFScheduler</h1>
      </div>
    </header>
  );
};

export default Header;
