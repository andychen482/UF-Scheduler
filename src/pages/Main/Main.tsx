import { useState, useEffect, useRef } from "react";
import axios from "axios";
import CoursesHandler from "../../components/CoursesHandler/CoursesHandler";
import "./CourseDisplay.css";
import { MainClasses } from "./MainClasses";
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

cytoscape.use(klay);

const Main = () => {
  const { container } = MainClasses;
  const [selectedMajor, setSelectedMajor] = useState<string | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<Course[]>([]);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showTooltip, setShowTooltip] = useState(false);
  const [loading, setLoading] = useState(false);
  const cyContainerRef = useRef<HTMLDivElement | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [showDisplayWrite, setShowDisplayWrite] = useState(true);
  const [hasShownCalendar, setHasShownCalendar] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [hasBeenLoaded, setLoaded] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [customAppointments, setCustomAppointments] = useState<any[]>([]);

  useEffect(() => {
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

  const calendarView = () => {
    setShowDisplayWrite(false);
    setHasShownCalendar(true);
  };

  const graphView = () => {
    setShowDisplayWrite(true);
  };

  //Renders graph after calendar is switched away from
  useEffect(() => {
    if (showDisplayWrite && hasShownCalendar) {
      initializeCytoscape();
    }
  }, [showDisplayWrite]);

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
  }, [setGraphData]);

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
    if (container) {
      container.addEventListener("touchstart", handleTouchStart);
      container.addEventListener("touchend", handleTouchEnd);
      container.addEventListener("mousedown", handleMouseDown);
      container.addEventListener("mouseup", handleMouseUpOrLeave);
      container.addEventListener("mouseleave", handleMouseUpOrLeave);
      container.addEventListener("wheel", handleWheel);
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
    if (container) {
      container.addEventListener("touchstart", handleTouchStart);
      container.addEventListener("touchend", handleTouchEnd);
      container.addEventListener("mousedown", handleMouseDown);
      container.addEventListener("mouseup", handleMouseUpOrLeave);
      container.addEventListener("mouseleave", handleMouseUpOrLeave);
      container.addEventListener("wheel", handleWheel);
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
        "https://ufscheduler.onrender.com/generate_a_list",
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
      <Header
        calendarView={calendarView}
        graphView={graphView}
        showDisplayWrite={showDisplayWrite}
        selectedCourses={selectedCourses}
        isDrawerOpen={isDrawerOpen}
        setIsDrawerOpen={setIsDrawerOpen}
        windowWidth={windowWidth}
      />
      <div
        className={`overlay ${isDrawerOpen ? "open" : "closed"}`}
        onClick={() => setIsDrawerOpen(false)}
      ></div>
      <div className="content-wrapper">
        <div className="flex flexImage course-display bg-gray-900">
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
              style={{ height: "calc(100vh - 40px)", background: "rgb(27,27,27)" }}
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
          <div className={`flex flex-col items-start basis-full dark:bg-gray-800 transition-colors duration-500 overflow-y-auto p-0 rounded-none courses-handler`}>
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
          {showDisplayWrite ? (
            <div id="display-write">
              <div ref={cyContainerRef} id="cytoscape-container"></div>
              <div className={`loader-container ${loading ? "show" : ""}`}>
                <ClipLoader color="#ffffff" loading={loading} size={150} />
              </div>
            </div>
          ) : (
            <div className="calendar-container bg-[rgb(27,27,27)]">
              <Calendar
                selectedCourses={selectedCourses}
                customAppointments={customAppointments}
                setCustomAppointments={setCustomAppointments}
              />
            </div>
          )}
        </div>
      </div>
<Footer />
    </div>
  );
};

export default Main;