import "./HeaderStyles.css";
import { useEffect, useState } from "react";
import { AiOutlineCalendar, AiOutlineSchedule } from "react-icons/ai";
import { PiGraphFill } from "react-icons/pi";
import { BiMenu } from "react-icons/bi";
import { IoMapOutline } from "react-icons/io5";
import { Course } from "../CourseUI/CourseTypes";

interface HeaderProps {
  calendarView: () => void;
  graphView: () => void;
  mapView: () => void;
  planView: () => void;
  currentView: string;
  selectedCourses: Course[];
  isDrawerOpen: boolean;
  setIsDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  windowWidth: number;
  showArrow: boolean;
  setShowArrow: React.Dispatch<React.SetStateAction<boolean>>;
}

const Header: React.FC<HeaderProps> = ({
  calendarView,
  graphView,
  mapView,
  planView,
  currentView,
  selectedCourses,
  isDrawerOpen,
  setIsDrawerOpen,
  windowWidth,
  showArrow,
  setShowArrow,
}) => {
  const [totalCredits, setTotalCredits] = useState(0);

  const handleClickingCalendar = () => {
    setShowArrow(false);
    localStorage.setItem("hasClickedCalendar", "true");
  };

  const handleCalendarButtonClick = () => {
    calendarView();
    handleClickingCalendar();
  };

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
    <div className="header-container">
      <div className="header flex gap-x-5">
        <div className="credits-container text-white">
        {windowWidth < 1001 && (
          <BiMenu
            className={`menu-button cursor-pointer mt-1 ${
              isDrawerOpen ? "faded" : ""
            }`}
            onClick={() => setIsDrawerOpen((prev) => !prev)}
          ></BiMenu>
        )}
          <span className="mt-1">Credits: {totalCredits}</span>
        </div>
        <a
        className="buyButton"
        target="_blank"
        href="https://www.buymeacoffee.com/ufscheduler"
        rel="noreferrer"
      >
        <span className="gatorEmoji">🐊</span>
        <span className="coffeeButtonText">Donate</span>
      </a>
        {windowWidth >= 965 && (
          <div className="flex">
            <div className="button-container gap-x-4">
              <button
                className={`Button cursor-pointer text-gray-400 ${
                  currentView === "calendar" ? "show" : "grayed"
                }`}
                onClick={handleCalendarButtonClick}
              >
                <div className="button-content">
                  <div className="icon-text-container">
                    <AiOutlineCalendar
                      size={24}
                      style={{ minWidth: "24px", minHeight: "24px" }}
                    />
                    <span className="text-[1.0rem] overflow-hidden label">
                      Scheduler
                    </span>
                  </div>
                </div>
              </button>
              <button
                className={`Button cursor-pointer text-gray-400 ${
                  currentView === "graph" ? "show" : "grayed"
                }`}
                onClick={graphView}
              >
                <div className="button-content">
                  <div className="icon-text-container">
                    <PiGraphFill
                      size={24}
                      style={{ minWidth: "24px", minHeight: "24px" }}
                    />
                    <span className="text-[1.0rem] overflow-hidden label">
                      Prerequisites
                    </span>
                  </div>
                </div>
              </button>
              <button
                className={`Button cursor-pointer text-gray-400 ${
                  currentView === "plan" ? "show" : "grayed"
                }`}
                onClick={planView}
              >
                <div className="button-content">
                  <div className="icon-text-container">
                    <AiOutlineSchedule
                      size={24}
                      style={{ minWidth: "24px", minHeight: "24px" }}
                    />
                    <span className="text-[1.0rem] overflow-hidden whitespace-nowrap label">
                      Model Plans
                    </span>
                  </div>
                </div>
              </button>
              <button
                className={`Button cursor-pointer text-gray-400 ${
                  currentView === "map" ? "show" : "grayed"
                }`}
                onClick={mapView} // use the mapView prop here
              >
                <div className="button-content">
                  <div className="icon-text-container">
                    <IoMapOutline
                      size={24}
                      style={{ minWidth: "24px", minHeight: "24px" }}
                    />
                    <span className="text-[1.0rem] overflow-hidden label">
                      Map
                    </span>
                  </div>
                </div>
              </button>
            </div>
            <div className="mx-2 self-center">
              <a href="/">
                <span className="title font-semibold text-blue-500">UF</span>
                <span className="title font-semibold text-orange-500">
                  Scheduler
                </span>
              </a>
            </div>
          </div>
        )}
        {windowWidth < 965 && (
          <div className="mx-2 self-center">
            <a href="/">
              <span className="title font-semibold text-blue-500">UF</span>
              <span className="title font-semibold text-orange-500">
                Scheduler
              </span>
            </a>
          </div>
        )}
      </div>
      {windowWidth < 965 && (
        <div className="button-container">
          <button
            className={`Button cursor-pointer text-gray-400 ${
              currentView === "calendar" ? "show" : "grayed"
            }`}
            onClick={handleCalendarButtonClick}
          >
            <div className="button-content">
              <div className="icon-text-container">
                {/* <AiOutlineCalendar
                  size={24}
                  style={{ minWidth: "24px", minHeight: "24px" }}
                /> */}
                <span className="text-[1.0rem] overflow-hidden label">
                  Scheduler
                </span>
              </div>
            </div>
          </button>
          <button
            className={`Button cursor-pointer text-gray-400 ${
              currentView === "graph" ? "show" : "grayed"
            }`}
            onClick={graphView}
          >
            <div className="button-content">
              <div className="icon-text-container">
                {/* <PiGraphFill
                  size={24}
                  style={{ minWidth: "24px", minHeight: "24px" }}
                /> */}
                <span className="text-[1.0rem] overflow-hidden label">
                  Prerequisites
                </span>
              </div>
            </div>
          </button>
          <button
            className={`Button cursor-pointer text-gray-400 ${
              currentView === "plan" ? "show" : "grayed"
            }`}
            onClick={planView}
          >
            <div className="button-content">
              <div className="icon-text-container">
                {/* <AiOutlineSchedule
                  size={24}
                  style={{ minWidth: "24px", minHeight: "24px" }}
                /> */}
                <span className="text-[1.0rem] overflow-hidden whitespace-nowrap label">
                  Model Plans
                </span>
              </div>
            </div>
          </button>
          <button
            className={`Button cursor-pointer text-gray-400 ${
              currentView === "map" ? "show" : "grayed"
            }`}
            onClick={mapView} // use the mapView prop here
          >
            <div className="button-content">
              <div className="icon-text-container">
                {/* <IoMapOutline
                  size={24}
                  style={{ minWidth: "24px", minHeight: "24px" }}
                /> */}
                <span className="text-[1.0rem] overflow-hidden label">Map</span>
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

export default Header;
