import React, { useEffect, useRef, useState } from "react";
import cytoscape from "cytoscape";
import { GraphData } from "./cytoscapeTypes";
import klay from "cytoscape-klay";
import MajorSelect from "../CoursesHandler/MajorSearch/MajorSearch";
import { API_URLS } from "../../config/api";
import ClipLoader from "react-spinners/ClipLoader";
import { Course } from "../CourseUI/CourseTypes";
import axios from "axios";
import "./GraphStyles.css";

interface GraphProps {
  setDebouncedSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  isMobile: () => boolean;
  selectedCourses: Course[];
  setSearchTrigger: React.Dispatch<React.SetStateAction<boolean>>;
  searchTrigger: boolean;
  selectedMajor: string | null;
  setSelectedMajor: React.Dispatch<React.SetStateAction<string | null>>;
  term: string;
  year: string;
}

cytoscape.use(klay);

const Graph: React.FC<GraphProps> = ({
  setDebouncedSearchTerm,
  setSearchTerm,
  isMobile,
  selectedCourses,
  setSearchTrigger,
  searchTrigger,
  selectedMajor,
  setSelectedMajor,
  term,
  year,
}) => {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(false);
  const cyContainerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [loadedOnce, setLoadedOnce] = useState(false);

  //Renders graph after calendar is switched away from
  useEffect(() => {
    initializeCytoscape();
  }, []);

  const handleLoading = async (callback: () => Promise<void>) => {
    try {
      setLoading(true);
      await callback();
    } catch (error) {
      // Error handled silently in production
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
    // Clean up previous event handlers before reinitializing
    if (cleanupRef.current) {
      cleanupRef.current();
    }
    initializeCytoscape();
    
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
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

      // Store cleanup function for event handlers
      cleanupRef.current = setupZoomEventHandler(cy);

      cy.on("tap", "node", (event) => {
        const nodeId = event.target.id();
        setDebouncedSearchTerm(nodeId.replace("\n", ""));
        setSearchTerm(nodeId.replace("\n", ""));
        setSearchTrigger(prev => !prev);
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
    if (loadedOnce) {
      handleLoading(generateAList);
    }
  }, [selectedCourses, selectedMajor]);

  const generateAList = async () => {
    await handleLoading(async () => {
      const selectedCoursesServ = selectedCourses.map((course) => course.code);
      const response = await axios.post(API_URLS.GENERATE_A_LIST, {
        selectedMajorServ: selectedMajor,
        selectedCoursesServ: selectedCoursesServ,
        term: term,
        year: year,
      });

      const data: GraphData = response.data;
      setGraphData(data);
    });
  };
  return (
    <div className="h-[calc(100vh-108px)]">
        <div className="department-select">
        <MajorSelect selectedMajor={selectedMajor} setSelectedMajor={setSelectedMajor} />
        </div>
      <div ref={cyContainerRef} id="cytoscape-container"></div>
      <div className={`loader-container ${loading ? "show" : ""}`}>
        <ClipLoader color="#ffffff" loading={loading} size={150} />
      </div>
    </div>
  );
};

export default Graph;
