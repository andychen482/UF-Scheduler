import { useState, useEffect, useCallback } from "react";
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
import AIChat from "../../components/Chat/AIChat";
import ModelPlan from "../../components/ModelPlan/ModelPlan";
import Graph from "../../components/Cytoscape/Graph";
import { ChangeEvent } from "react";

const Main = () => {
  const [selectedMajor, setSelectedMajor] = useState<string | null>(() => {
    const storedSelectedMajor = localStorage.getItem("selectedMajor");
    if (storedSelectedMajor) {
      return storedSelectedMajor;
    } else {
      return null;
    }
  });

  const [term, setTerm] = useState<string>(() => {
    return localStorage.getItem("selectedTerm") ?? "summer";
  });
  const [year, setYear] = useState<string>(() => {
    return localStorage.getItem("selectedYear") ?? "26";
  });
  const [selectedValue, setSelectedValue] = useState<string>(() => {
    return localStorage.getItem("selectedTermValue") ?? "summer 26";
  });
  const [calendarResetKey, setCalendarResetKey] = useState<string>(
    `${term}_${year}`
  );

  // Initialize selectedCourses based on the current term/year
  const [selectedCourses, setSelectedCourses] = useState<Course[]>(() => {
    const storedSelectedCourses = localStorage.getItem(
      `selectedCourses_${term}_${year}`
    );
    if (storedSelectedCourses) {
      return JSON.parse(storedSelectedCourses);
    } else {
      return [];
    }
  });

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchTrigger, setSearchTrigger] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<
    "calendar" | "graph" | "map" | "plan" | "ai" | ""
  >("");
  const [hasBeenLoaded, setLoaded] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const [isChatVisible, setIsChatVisible] = useState<boolean>(() => {
    const hasClosedChat = localStorage.getItem("hasClosedChat");
    return hasClosedChat ? false : true;
  });
  
  const [hasNewMessage, setHasNewMessage] = useState<boolean>(false);

  const [customAppointments, setCustomAppointments] = useState<any[]>(() => {
    const storedCustomAppointment = localStorage.getItem(
      `customAppointments_${term}_${year}`
    );
    if (storedCustomAppointment) {
      return JSON.parse(storedCustomAppointment);
    } else {
      return [];
    }
  });

  const [showArrow, setShowArrow] = useState<boolean>(() => {
    const storedShowArrow = localStorage.getItem("hasClickedCalendar");
    if (storedShowArrow) {
      return false;
    } else {
      return true;
    }
  });

  const [activeUsers, setActiveUsers] = useState<number>(0);

  useEffect(() => {
    setCurrentView("calendar");
  }, []);

  // ADJUST HERE FOR LOCAL STORAGE RESET
  const version = JSON.parse(localStorage.getItem("version") || "0");
  if (version === 0) {
    localStorage.clear();
    localStorage.setItem("version", JSON.stringify(1));
  }

  useEffect(() => {
    localStorage.removeItem("hasShownInstructions");
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Save selectedCourses when they change, using term-specific key
  useEffect(() => {
    if (selectedCourses.length > 0 || hasBeenLoaded) {
      localStorage.setItem(
        `selectedCourses_${term}_${year}`,
        JSON.stringify(selectedCourses)
      );
    }
  }, [selectedCourses, hasBeenLoaded, term, year]);

  // Save customAppointments when they change, using term-specific key
  useEffect(() => {
    localStorage.setItem(
      `customAppointments_${term}_${year}`,
      JSON.stringify(customAppointments)
    );
  }, [customAppointments, term, year]);

  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  };

  const calendarView = useCallback(() => {
    setCurrentView("calendar");
  }, []);

  const graphView = useCallback(() => {
    setCurrentView("graph");
  }, []);

  const mapView = useCallback(() => {
    setCurrentView("map");
  }, []);

  const planView = useCallback(() => {
    setCurrentView("plan");
  }, []);

  const aiChatView = useCallback(() => {
    setCurrentView("ai");
    setIsChatVisible(false);
  }, []);

  const handleNewMessage = useCallback(() => {
    if (!isChatVisible) {
      setHasNewMessage(true);
    }
  }, [isChatVisible]);

  const handleOpenChat = () => {
    setIsChatVisible(true);
    setHasNewMessage(false);
    localStorage.setItem("lastReadTimestamp", new Date().toISOString());
  };

  const handleActiveUsersUpdate = useCallback((count: number) => {
    setActiveUsers(count);
  }, []);

  const handleTermChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const [selectedTerm, selectedYear] = event.target.value.split(" ");
    const newTerm = selectedTerm.toLowerCase();
    const newYear = selectedYear;

    // Save current state before switching terms
    localStorage.setItem(
      `selectedCourses_${term}_${year}`,
      JSON.stringify(selectedCourses)
    );
    localStorage.setItem(
      `customAppointments_${term}_${year}`,
      JSON.stringify(customAppointments)
    );

    // Update the term and year state
    setSelectedValue(event.target.value);
    setTerm(newTerm);
    setYear(newYear);
    localStorage.setItem("selectedTerm", newTerm);
    localStorage.setItem("selectedYear", newYear);
    localStorage.setItem("selectedTermValue", event.target.value);

    // Create a new reset key to trigger the Calendar component to reload with the new term
    setCalendarResetKey(`${newTerm}_${newYear}`);

    // Load the saved state for the new term
    const storedSelectedCourses = localStorage.getItem(
      `selectedCourses_${newTerm}_${newYear}`
    );
    if (storedSelectedCourses) {
      setSelectedCourses(JSON.parse(storedSelectedCourses));
    } else {
      setSelectedCourses([]);
    }

    const storedCustomAppointments = localStorage.getItem(
      `customAppointments_${newTerm}_${newYear}`
    );
    if (storedCustomAppointments) {
      setCustomAppointments(JSON.parse(storedCustomAppointments));
    } else {
      setCustomAppointments([]);
    }

  };

  return (
    <div className="sora-unique">
      <div className={`chat ${isChatVisible ? "visible" : "hidden"}`}>
        <Chat
          isChatVisible={isChatVisible}
          setIsChatVisible={setIsChatVisible}
          handleNewMessage={handleNewMessage}
          onActiveUsersUpdate={handleActiveUsersUpdate}
        />
      </div>
      <button
        className={`chat-toggle-button ${isChatVisible || currentView === "ai" ? "hide" : "visible"} ${
          hasNewMessage ? "wiggle" : ""
        }`}
        onClick={handleOpenChat}
      >
        <AiOutlineMessage size={30} style={{ transform: "scaleX(-1)" }} />
        {hasNewMessage && <span className="badge"></span>}
      </button>
      <Header
        calendarView={calendarView}
        graphView={graphView}
        mapView={mapView}
        planView={planView}
        aiChatView={aiChatView}
        currentView={currentView}
        selectedCourses={selectedCourses}
        isDrawerOpen={isDrawerOpen}
        setIsDrawerOpen={setIsDrawerOpen}
        windowWidth={windowWidth}
        showArrow={showArrow}
        setShowArrow={setShowArrow}
        setTerm={setTerm}
        setYear={setYear}
      />
      <div
        className={`overlay ${isDrawerOpen ? "open" : "closed"}`}
        onClick={() => setIsDrawerOpen(false)}
      ></div>
      <div className="content-wrapper">
        <div className="flex flexImage course-display bg-[rgb(0,0,0)]">
          {windowWidth < 1001 && (
            <div
              className={`drawer overflow-y-auto ${
                isDrawerOpen ? "" : "closed"
              }`}
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
                setSearchTerm={setSearchTerm}
                setDebouncedSearchTerm={setDebouncedSearchTerm}
                searchTrigger={searchTrigger}
                setSearchTrigger={setSearchTrigger}
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
              term={term}
              year={year}
              selectedValue={selectedValue}
              handleTermChange={handleTermChange}
              searchTrigger={searchTrigger}
              setSearchTrigger={setSearchTrigger}
            />
          </div>
          {windowWidth > 1000 && (
            <div
              className="selected-courses overflow-y-auto"
              style={{
                height: "calc(100vh - 43px)",
                background: "rgb(0,0,0)",
              }}
            >
              <LikedSelectedCourses
                selectedCourses={selectedCourses}
                setSelectedCourses={setSelectedCourses}
                setLoaded={setLoaded}
                windowWidth={windowWidth}
                customAppointments={customAppointments}
                setCustomAppointments={setCustomAppointments}
                setSearchTerm={setSearchTerm}
                setDebouncedSearchTerm={setDebouncedSearchTerm}
                searchTrigger={searchTrigger}
                setSearchTrigger={setSearchTrigger}
              />
            </div>
          )}
          {currentView === "graph" && (
            <div id="display-write">
              <Graph
                setDebouncedSearchTerm={setDebouncedSearchTerm}
                setSearchTerm={setSearchTerm}
                setSearchTrigger={setSearchTrigger}
                searchTrigger={searchTrigger}
                isMobile={isMobile}
                selectedCourses={selectedCourses}
                selectedMajor={selectedMajor}
                setSelectedMajor={setSelectedMajor}
                term={term}
                year={year}
              />
            </div>
          )}
          {currentView === "calendar" && (
            <div className="calendar-container bg-[rgb(0,0,0)]">
              <Calendar
                selectedCourses={selectedCourses}
                customAppointments={customAppointments}
                setCustomAppointments={setCustomAppointments}
                term={term}
                year={year}
                key={calendarResetKey}
              />
            </div>
          )}
          {currentView === "map" && (
            // Add the map component here
            <div className="map-container bg-[rgb(0,0,0)]">
              <MapBox term={term} year={year} />
            </div>
          )}
          {currentView === "plan" && (
            <div className="order-3 plan-container-container-lol">
              <div className="plan-container bg-[rgb(0,0,0)]">
                <ModelPlan />
              </div>
            </div>
          )}
          {currentView === "ai" && (
            <div className="ai-chat-container bg-[rgb(0,0,0)]">
              <AIChat />
            </div>
          )}
        </div>
      </div>
      <Footer />
      <div className="floating-text">
        <div className="green-circle"></div>
        {activeUsers} online
      </div>
    </div>
  );
};

export default Main;
