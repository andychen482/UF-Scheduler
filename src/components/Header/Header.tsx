import "./HeaderStyles.css";
import { useEffect, useState } from "react";
import { AiOutlineCalendar, AiOutlineSchedule } from "react-icons/ai";
import { PiGraphFill } from "react-icons/pi";
import { BiMenu, BiLogOut, BiLogIn } from "react-icons/bi";
import { IoMapOutline } from "react-icons/io5";
import { BsStars } from "react-icons/bs";
import { Course } from "../CourseUI/CourseTypes";
import { useAuth } from "react-oidc-context";
import { signOutRedirect } from "../../config/api";

interface HeaderProps {
  calendarView: () => void;
  graphView: () => void;
  mapView: () => void;
  planView: () => void;
  aiChatView: () => void;
  currentView: string;
  selectedCourses: Course[];
  isDrawerOpen: boolean;
  setIsDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  windowWidth: number;
  showArrow: boolean;
  setShowArrow: React.Dispatch<React.SetStateAction<boolean>>;
  setTerm: React.Dispatch<React.SetStateAction<string>>;
  setYear: React.Dispatch<React.SetStateAction<string>>;
}

const Header: React.FC<HeaderProps> = ({
  calendarView,
  graphView,
  mapView,
  planView,
  aiChatView,
  currentView,
  selectedCourses,
  isDrawerOpen,
  setIsDrawerOpen,
  windowWidth,
  showArrow,
  setShowArrow,
  setTerm,
  setYear,
}) => {
  const auth = useAuth();
  const [totalCredits, setTotalCredits] = useState(0);

  const userEmail = auth.user?.profile?.email ?? "";
  const userInitial = userEmail ? userEmail[0].toUpperCase() : "?";
  const userPicture = auth.user?.profile?.picture as string | undefined;

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
      if (course.excludedFromSchedule) return totalCredits;
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
          <span className="mt-1 text-base">Credits: {totalCredits}</span>
        </div>
        <div className="flex flex-row space-x-4">
          {/* <p className="flex items-center mt-1 text-base whitespace-nowrap">
            Fall 25
          </p> */}
          <a
            className="buyButton"
            target="_blank"
            href="https://www.buymeacoffee.com/ufscheduler"
            rel="noreferrer"
          >
            <span className="coffeeButtonText">Donate</span>
          </a>
        </div>
        {windowWidth >= 1001 && (
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
                onClick={mapView}
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
              <button
                className={`Button cursor-pointer text-gray-400 ${
                  currentView === "ai" ? "show ai-chat-tab" : "grayed"
                }`}
                onClick={aiChatView}
              >
                <div className="button-content">
                  <div className="icon-text-container">
                    <BsStars
                      size={22}
                      style={{ minWidth: "22px", minHeight: "22px" }}
                    />
                    <span className="text-[1.0rem] overflow-hidden label">
                      AI Chat
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
        {windowWidth < 1001 && windowWidth > 500 && (
          <div className="mx-2 self-center">
            <a href="/">
              <span className="title font-semibold text-blue-500">UF</span>
              <span className="title font-semibold text-orange-500">
                Scheduler
              </span>
            </a>
          </div>
        )}
        {windowWidth <= 500 && (
          <div className="mx-2 self-center text-sm">
            <a href="/">
              <span className="title font-semibold text-blue-500">UF</span>
              <span className="title font-semibold text-orange-500">
                Scheduler
              </span>
            </a>
          </div>
        )}
        <div className="auth-section">
          {auth.isAuthenticated ? (
            <>
              <div className="auth-avatar" title={userEmail}>
                {userPicture ? (
                  <img
                    src={userPicture}
                    alt={userInitial}
                    className="auth-avatar-img"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  userInitial
                )}
              </div>
              {windowWidth >= 1001 && (
                <span className="auth-email">{userEmail}</span>
              )}
              <button
                className="auth-signout-btn"
                onClick={signOutRedirect}
                title="Sign out"
              >
                {windowWidth >= 1001 ? (
                  "Sign Out"
                ) : (
                  <BiLogOut size={18} />
                )}
              </button>
            </>
          ) : (
            <button
              className="auth-signin-btn"
              onClick={() => auth.signinRedirect()}
            >
              {windowWidth >= 1001 ? (
                "Sign In"
              ) : (
                <BiLogIn size={18} />
              )}
            </button>
          )}
        </div>
      </div>
      {windowWidth < 1001 && (
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
            onClick={mapView}
          >
            <div className="button-content">
              <div className="icon-text-container">
                <span className="text-[1.0rem] overflow-hidden label">Map</span>
              </div>
            </div>
          </button>
          <button
            className={`Button cursor-pointer text-gray-400 ${
              currentView === "ai" ? "show ai-chat-tab" : "grayed"
            }`}
            onClick={aiChatView}
          >
            <div className="button-content">
              <div className="icon-text-container">
                <span className="text-[1.0rem] overflow-hidden label">AI Chat</span>
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

export default Header;
