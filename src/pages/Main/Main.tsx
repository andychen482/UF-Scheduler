import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import CoursesHandler from "../../components/CoursesHandler/CoursesHandler";
import "./MainStyles.css";
import { Course } from "../../components/CourseUI/CourseTypes";
import Calendar from "../../components/Calendar/Calendar";
import Header from "../../components/Header/Header";
import LikedSelectedCourses from "../../components/CoursesHandler/LikedSelectedCourses";
import { AiOutlineMessage } from "react-icons/ai";
import { IoClose } from "react-icons/io5";
import Footer from "../../components/Footer/Footer";
import MapBox from "../../components/MapBox/Map";
import Chat from "../../components/Chat/LiveChat";
import ModelPlan from "../../components/ModelPlan/ModelPlan";
import Graph from "../../components/Cytoscape/Graph";

const Main = () => {
  const [selectedMajor, setSelectedMajor] = useState<string | null>(() => {
    const storedSelectedMajor = localStorage.getItem("selectedMajor");
    if (storedSelectedMajor) {
      return storedSelectedMajor;
    } else {
      return null;
    }
  });
  const [selectedCourses, setSelectedCourses] = useState<Course[]>([]);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentView, setCurrentView] = useState<
    "calendar" | "graph" | "map" | "plan" | ""
  >("");
  const [hasShownCalendar, setHasShownCalendar] = useState(false);
  const [hasBeenLoaded, setLoaded] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const [isChatVisible, setIsChatVisible] = useState(true);

  const [customAppointments, setCustomAppointments] = useState<any[]>(() => {
    const storedCustomAppointment = localStorage.getItem("customAppointments");
    if (storedCustomAppointment) {
      return JSON.parse(storedCustomAppointment);
    } else {
      return [];
    }
  });
  const [showInstructions, setShowInstructions] = useState(false);
  const [showArrow, setShowArrow] = useState<boolean>(() => {
    const storedShowArrow = localStorage.getItem("hasClickedCalendar");
    if (storedShowArrow) {
      return false;
    } else {
      return true;
    }
  });

  useEffect(() => {
    setCurrentView("calendar");
  }, []);

  // ADJUST HERE FOR LOCAL STORAGE RESET
  const version = JSON.parse(localStorage.getItem("version") || "0");
  if (version === 0) {
    localStorage.clear();
    localStorage.setItem("version", JSON.stringify(1));
  }

  const handleCloseInstructions = () => {
    setShowInstructions(false);
    localStorage.setItem("hasShownInstructions", "true");
  };

  useEffect(() => {
    if (!localStorage.getItem("hasShownInstructions")) {
      setShowInstructions(true);
    }
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  };

  const calendarView = useCallback(() => {
    setCurrentView("calendar");
    setHasShownCalendar(true);
  }, []);

  const graphView = useCallback(() => {
    setCurrentView("graph");
  }, []);

  const mapView = useCallback(() => {
    setCurrentView("map");
    setHasShownCalendar(true);
  }, []);

  const planView = useCallback(() => {
    setCurrentView("plan");
    setHasShownCalendar(true);
  }, []);

  return (
    <div>
      <div className={`chat ${isChatVisible ? "visible" : "hidden"}`}>
        <Chat
          isChatVisible={isChatVisible}
          setIsChatVisible={setIsChatVisible}
        />
      </div>
      <button
        className={`chat-toggle-button ${isChatVisible ? "hide" : "visible"}`}
        onClick={() => setIsChatVisible(!isChatVisible)}
      >
        <AiOutlineMessage size={30} />
      </button>
      <Header
        calendarView={calendarView}
        graphView={graphView}
        mapView={mapView}
        planView={planView}
        currentView={currentView}
        selectedCourses={selectedCourses}
        isDrawerOpen={isDrawerOpen}
        setIsDrawerOpen={setIsDrawerOpen}
        windowWidth={windowWidth}
        showArrow={showArrow}
        setShowArrow={setShowArrow}
      />
      <div
        className={`overlay ${isDrawerOpen ? "open" : "closed"}`}
        onClick={() => setIsDrawerOpen(false)}
      ></div>
      <div className="content-wrapper">
        <div className="flex flexImage course-display bg-gray-[920]">
          {windowWidth < 1001 ? (
            <div
              className={`drawer overflow-auto ${isDrawerOpen ? "" : "closed"}`}
            >
              <button
                className="drawer-close-button"
                onClick={() => setIsDrawerOpen(false)}
              >
                <IoClose className="mt-1 text-white" size={18} />
              </button>

              <LikedSelectedCourses
                selectedCourses={selectedCourses}
                setSelectedCourses={setSelectedCourses}
                setLoaded={setLoaded}
                windowWidth={windowWidth}
                customAppointments={customAppointments}
                setCustomAppointments={setCustomAppointments}
              />
            </div>
          ) : (
            <div
              className="selected-courses overflow-auto"
              style={{
                height: "calc(100vh - 43px)",
                background: "rgb(27,27,27)",
              }}
            >
              <LikedSelectedCourses
                selectedCourses={selectedCourses}
                setSelectedCourses={setSelectedCourses}
                setLoaded={setLoaded}
                windowWidth={windowWidth}
                customAppointments={customAppointments}
                setCustomAppointments={setCustomAppointments}
              />
            </div>
          )}
          <div
            className={`flex flex-col items-start basis-full dark:bg-gray-800 transition-colors duration-500 overflow-y-hidden p-0 rounded-none courses-handler`}
          >
            <CoursesHandler
              selectedCourses={selectedCourses}
              setSelectedCourses={setSelectedCourses}
              selectedMajor={selectedMajor}
              setSelectedMajor={setSelectedMajor}
              debouncedSearchTerm={debouncedSearchTerm}
              setDebouncedSearchTerm={setDebouncedSearchTerm}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              hasBeenLoaded={hasBeenLoaded}
              setLoaded={setLoaded}
              customAppointments={customAppointments}
              setCustomAppointments={setCustomAppointments}
            />
          </div>
          {currentView === "graph" && (
            <div id="display-write">
              <Graph
                currentView={currentView}
                setDebouncedSearchTerm={setDebouncedSearchTerm}
                setSearchTerm={setSearchTerm}
                isMobile={isMobile}
                selectedCourses={selectedCourses}
                selectedMajor={selectedMajor}
                setSelectedMajor={setSelectedMajor}
              />
            </div>
          )}
          {currentView === "calendar" && (
            <div className="calendar-container bg-[rgb(27,27,27)]">
              <Calendar
                selectedCourses={selectedCourses}
                customAppointments={customAppointments}
                setCustomAppointments={setCustomAppointments}
              />
            </div>
          )}
          {currentView === "map" && (
            // Add the map component here
            <div className="map-container bg-[rgb(27,27,27)]">
              <MapBox />
            </div>
          )}
          {currentView === "plan" && (
            <div className="order-3 plan-container-container-lol">
              <div className="plan-container bg-[rgb(20,20,20)]">
                <ModelPlan />
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Main;
