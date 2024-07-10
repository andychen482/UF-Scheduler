import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import CoursesHandler from "../../components/CoursesHandler/CoursesHandler";
import "./CourseDisplay.css";
import { Course } from "../../components/CourseUI/CourseTypes";
import cytoscape from "cytoscape";
import { GraphData } from "../../components/Cytoscape/cytoscapeTypes";
import Calendar from "../../components/Calendar/Calendar";
import klay from "cytoscape-klay";
import ClipLoader from "react-spinners/ClipLoader";
import Header from "../../components/Header/Header";
import LikedSelectedCourses from "../../components/CoursesHandler/LikedSelectedCourses";
import { AiOutlineClose } from "react-icons/ai";
import Footer from "../../components/Footer/Footer";
import MapBox from "../../components/MapBox/Map";

cytoscape.use(klay);

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
  const [showTooltip, setShowTooltip] = useState(false);
  const [loading, setLoading] = useState(false);
  const cyContainerRef = useRef<HTMLDivElement | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [currentView, setCurrentView] = useState<"calendar" | "graph" | "map">(
    "graph"
  );
  const [hasShownCalendar, setHasShownCalendar] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [hasBeenLoaded, setLoaded] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
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

  // ADJUST HERE FOR LOCAL STORAGE RESET
  const version = JSON.parse(localStorage.getItem("version") || "0");
  if (version === 0) {
    localStorage.clear();
    localStorage.setItem("version", JSON.stringify(1));
  }

  const handleCloseInstructions = () => {
    setShowInstructions(false);
    sessionStorage.setItem("hasShownInstructions", "true");
  };

  useEffect(() => {
    if (!sessionStorage.getItem("hasShownInstructions")) {
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

  //Renders graph after calendar is switched away from
  useEffect(() => {
    if (currentView === "graph" && hasShownCalendar) {
      initializeCytoscape();
    }
  }, [currentView]);

  const handleLoading = async (callback: () => Promise<void>) => {
    try {
      setLoading(true);
      await callback();
    } catch (error) {
      // Handle any errors here if needed
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedGraphData = localStorage.getItem("graphData");
    if (storedGraphData) {
      setGraphData(JSON.parse(storedGraphData));
    }
  }, []);

  useEffect(() => {
    if (graphData) {
      localStorage.setItem("graphData", JSON.stringify(graphData));
    }
    initializeCytoscape();
  }, [graphData]);

  const initializeCytoscape = () => {
    if (graphData && cyContainerRef.current) {
      const cy = cytoscape({
        container: cyContainerRef.current,
        userPanningEnabled: false,
        userZoomingEnabled: true,
        elements: [...graphData.nodes, ...graphData.edges],
        style: [
          {
            selector: "node",
            style: {
              "background-color": "#0021A5",
              label: "data(id)",
              color: "white",
              "text-valign": "center",
              "text-halign": "center",
              "text-wrap": "wrap",
              "text-max-width": "120px",
              "font-weight": "normal",
              "font-size": "30px",
              width: "150px",
              height: "150px",
            },
          },
          {
            selector: "node.selected",
            style: {
              "background-color": "#FA4616",
            },
          },
          {
            selector: "edge",
            style: {
              width: 12,
              "line-color": "#ccc",
              "target-arrow-color": "#ccc",
              "arrow-scale": 1.2,
              "target-arrow-shape": "triangle",
              "target-arrow-fill": "filled",
              "curve-style": "bezier",
            },
          },
        ],
        layout: {
          name: "klay",
          padding: 20,
          klay: {
            direction: "RIGHT",
            spacing: 80,
            nodeLayering: "NETWORK_SIMPLEX",
            edgeRouting: "ORTHOGONAL",
          },
        } as any,
        minZoom: 0.1,
        maxZoom: 3,
      });
      cyRef.current = cy;

      setupZoomEventHandler(cy);

      cy.on("tap", "node", (event) => {
        const nodeId = event.target.id();
        setDebouncedSearchTerm(nodeId.replace("\n", ""));
        setSearchTerm(nodeId.slice(0, 4) + " " + nodeId.slice(4));
      });
    }
    setLoadedOnce(true);
  };

  const setupZoomEventHandler = (cy: cytoscape.Core) => {
    let touchCount = 0;

    const handleWheel = (e: WheelEvent) => {
      if (cyRef && cyRef.current) {
        // Check if cyRef and cyRef.current are not null
        e.preventDefault();

        const zoomFactor = e.deltaY < 0 ? 1.05 : 1 / 1.05;
        const container = cyRef.current.container();
        if (container) {
          // Check if container is not null
          const offset = container.getBoundingClientRect();
          const pos = {
            x: e.clientX - offset.left,
            y: e.clientY - offset.top,
          };
          const zoomedPosition = {
            x: (pos.x - cyRef.current.pan().x) / cyRef.current.zoom(),
            y: (pos.y - cyRef.current.pan().y) / cyRef.current.zoom(),
          };

          cyRef.current.zoom({
            level: cyRef.current.zoom() * zoomFactor,
            position: zoomedPosition,
          });
        }
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (!isMobile() && cyRef.current) {
        cyRef.current.userPanningEnabled(true);
      }
    };

    const handleMouseUpOrLeave = (e: MouseEvent) => {
      if (!isMobile() && cyRef.current) {
        cyRef.current.userPanningEnabled(false);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchCount = e.touches.length;

      if (isMobile()) {
        if (touchCount === 2 && cyRef.current) {
          cyRef.current.userPanningEnabled(true);
        }
      } else {
        if (touchCount === 1 && cyRef.current) {
          cyRef.current.userPanningEnabled(true);
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      touchCount = e.touches.length;

      if (isMobile()) {
        if (touchCount !== 2 && cyRef.current) {
          cyRef.current.userPanningEnabled(false);
        }
      } else {
        if (touchCount !== 1 && cyRef.current) {
          cyRef.current.userPanningEnabled(false);
        }
      }
    };

    const container = cyContainerRef.current;
    const options = { passive: false };
    if (container) {
      container.addEventListener("touchstart", handleTouchStart, options);
      container.addEventListener("touchend", handleTouchEnd);
      container.addEventListener("mousedown", handleMouseDown);
      container.addEventListener("mouseup", handleMouseUpOrLeave);
      container.addEventListener("mouseleave", handleMouseUpOrLeave);
      container.addEventListener("wheel", handleWheel, options);
    }

    return () => {
      if (container) {
        container.removeEventListener("touchstart", handleTouchStart);
        container.removeEventListener("touchend", handleTouchEnd);
        container.removeEventListener("mousedown", handleMouseDown);
        container.removeEventListener("mouseup", handleMouseUpOrLeave);
        container.removeEventListener("mouseleave", handleMouseUpOrLeave);
        container.removeEventListener("wheel", handleWheel);
      }
    };
  };

  useEffect(() => {
    let touchCount = 0;

    const handleWheel = (e: WheelEvent) => {
      if (cyRef && cyRef.current) {
        // Check if cyRef and cyRef.current are not null
        e.preventDefault();

        const zoomFactor = e.deltaY < 0 ? 1.05 : 1 / 1.05;
        const container = cyRef.current.container();
        if (container) {
          // Check if container is not null
          const offset = container.getBoundingClientRect();
          const pos = {
            x: e.clientX - offset.left,
            y: e.clientY - offset.top,
          };
          const zoomedPosition = {
            x: (pos.x - cyRef.current.pan().x) / cyRef.current.zoom(),
            y: (pos.y - cyRef.current.pan().y) / cyRef.current.zoom(),
          };

          cyRef.current.zoom({
            level: cyRef.current.zoom() * zoomFactor,
            position: zoomedPosition,
          });
        }
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (!isMobile() && cyRef.current) {
        cyRef.current.userPanningEnabled(true);
      }
    };

    const handleMouseUpOrLeave = (e: MouseEvent) => {
      if (!isMobile() && cyRef.current) {
        cyRef.current.userPanningEnabled(false);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchCount = e.touches.length;

      if (isMobile()) {
        if (touchCount === 2 && cyRef.current) {
          cyRef.current.userPanningEnabled(true);
        }
      } else {
        if (touchCount === 1 && cyRef.current) {
          cyRef.current.userPanningEnabled(true);
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      touchCount = e.touches.length;

      if (isMobile()) {
        if (touchCount !== 2 && cyRef.current) {
          cyRef.current.userPanningEnabled(false);
        }
      } else {
        if (touchCount !== 1 && cyRef.current) {
          cyRef.current.userPanningEnabled(false);
        }
      }
    };

    const container = cyContainerRef.current;
    const options = { passive: false };
    if (container) {
      container.addEventListener("touchstart", handleTouchStart, options);
      container.addEventListener("touchend", handleTouchEnd);
      container.addEventListener("mousedown", handleMouseDown);
      container.addEventListener("mouseup", handleMouseUpOrLeave);
      container.addEventListener("mouseleave", handleMouseUpOrLeave);
      container.addEventListener("wheel", handleWheel, options);
    }

    return () => {
      if (container) {
        container.removeEventListener("touchstart", handleTouchStart);
        container.removeEventListener("touchend", handleTouchEnd);
        container.removeEventListener("mousedown", handleMouseDown);
        container.removeEventListener("mouseup", handleMouseUpOrLeave);
        container.removeEventListener("mouseleave", handleMouseUpOrLeave);
        container.removeEventListener("wheel", handleWheel);
      }
    };
  }, [cyRef]);

  useEffect(() => {
    if (loadedOnce) {
      handleLoading(generateAList);
    }
  }, [selectedCourses, selectedMajor]);

  const generateAList = async () => {
    await handleLoading(async () => {
      const selectedCoursesServ = selectedCourses.map((course) => course.code);
      const response = await axios.post(
        "https://api.ufscheduler.com/generate_a_list",
        {
          // const response = await axios.post('http://localhost:5000/generate_a_list', {
          selectedMajorServ: selectedMajor,
          selectedCoursesServ: selectedCoursesServ,
        }
      );

      const data: GraphData = response.data;
      setGraphData(data);
    });
  };

  useEffect(() => {
    setShowTooltip(selectedMajor === null);
  }, [selectedMajor]);

  useEffect(() => {
    if (showTooltip) {
      const timeoutId = setTimeout(() => {
        setShowTooltip(false);
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [showTooltip]);

  return (
    <div>
      {showInstructions && (
        <div className="instructions-popup">
          <AiOutlineClose
            className="close-icon"
            onClick={handleCloseInstructions}
          />
          <div className="text-center font-bold mb-2 text-[2.25rem]">
            <span>Welcome to </span>
            <span className="text-blue-500">UF</span>
            <span className="text-orange-500">Scheduler!</span>
          </div>
          <div className="mb-2">
            <h2 className="instruction-headers">Select Your Major</h2>
            <p className="instruction-desc">
              Select your major from the left panel to view all related courses
              and their prerequisites. This visualization helps you understand
              the sequence of courses and plan your academic trajectory.{" "}
            </p>
            <p className="instruction-headers">View Courses and Availability</p>
            <p className="instruction-desc">
              Explore available course sections directly from your major’s
              course list. Check real-time availability, see if sections are on
              a waitlist, and register for open spots with just a few clicks.{" "}
            </p>
            <p className="instruction-headers">Graph</p>
            <p className="instruction-desc">
              See a visual representation of the prerequisites for all courses
              within your selected major.{" "}
            </p>
            <p className="instruction-headers">Calendar</p>
            <p className="instruction-desc">
              Generate and customize your course schedule. Sort by start times,
              end times, or compactness to fit your daily routine and
              preferences.
            </p>
            <p className="instruction-headers">Map</p>
            <p className="instruction-desc">
              See a detailed view of your daily class locations. Click on any
              class marker to see travel options from that location, including
              walking, biking, and driving times. You can also view parking
              locations and required pass levels for each.{" "}
            </p>
          </div>
        </div>
      )}
      {showInstructions && (
        <>
          <div
            className={`overlay ${showInstructions ? "open" : "closed"}`}
            onClick={handleCloseInstructions}
          ></div>
        </>
      )}
      {/* {showArrow && (
        <>
          <div className="arrow-container" style={{ userSelect: "none" }}>
            <img src={"images/white-arrow.png"} alt="" className="arrow"></img>
            <figcaption className="caption">Calendar here!</figcaption>
          </div>
        </>
      )} */}
      <Header
        calendarView={calendarView}
        graphView={graphView}
        mapView={mapView}
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
                <AiOutlineClose className="mt-1 text-white" size={18} />
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
                height: "calc(100vh - 40px)",
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
              <div ref={cyContainerRef} id="cytoscape-container"></div>
              <div className={`loader-container ${loading ? "show" : ""}`}>
                <ClipLoader color="#ffffff" loading={loading} size={150} />
              </div>
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
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Main;
