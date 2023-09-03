import { useState, useEffect, useRef } from "react";
import axios from "axios";
import CoursesHandler from "../../components/CoursesHandler/CoursesHandler";
import "./CourseDisplay.css";
import { MainClasses } from "./MainClasses";
import { Course } from "../../components/CourseUI/CourseTypes";
import cytoscape from 'cytoscape';
import { GraphData } from '../../components/Cytoscape/cytoscapeTypes';
import klay from 'cytoscape-klay';

cytoscape.use(klay);

const Header = () => {
  return (
    <header className="header">
      <h1>UFScheduler</h1>
    </header>
  );
};

const Main = () => {
  const { container } = MainClasses;
  const [showPopup, setShowPopup] = useState(false);
  const [selectedMajor, setSelectedMajor] = useState<string | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<Course[]>([]);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showTooltip, setShowTooltip] = useState(false);
  const [loading, setLoading] = useState(false);
  const cyContainerRef = useRef<HTMLDivElement | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };
  


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
  }, [setGraphData])
  
  useEffect(() => {
    if (graphData){
      localStorage.setItem("graphData", JSON.stringify(graphData));
    }
  }, [graphData])

  useEffect(() => {
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
            selector: 'node',
            style: {
              'background-color': '#0021A5',
              'label': 'data(id)',
              'color': 'white',
              'text-valign': 'center',
              'text-halign': 'center',
              'text-wrap': 'wrap', 
              'text-max-width': '120px', 
              'font-weight': 'normal',
              'font-size': '30px',
              'width': '150px',  // Set a fixed width
              'height': '150px', // Set the same value for height to make it a circle
            }
          },
          {
            selector: 'node.selected',
            style: {
              'background-color': '#FA4616',
            }

          },
          {
            selector: 'edge',
            style: {
              'width': 12,
              'line-color': '#ccc',
              'target-arrow-color': '#ccc',
              'arrow-scale': 1.2,
              'target-arrow-shape': 'triangle',
              'target-arrow-fill': 'filled',
              'curve-style': 'bezier'
            }
          }
        ],
        layout: {
          name: 'klay',
          padding: 20,
          klay: {
            direction: 'RIGHT', // Layout flows from left to right
            spacing: 80,        // Adjust as needed for spacing between nodes
            nodeLayering: 'NETWORK_SIMPLEX', // Strategy for node layering
            edgeRouting: 'ORTHOGONAL', 
          }
        } as any,
        minZoom: 0.1,  // Set the minimum zoom level. Adjust as needed.
        maxZoom: 3,    // Optional: Set a maximum zoom level if needed.
      });
      cyRef.current = cy;

      cy.on('tap', 'node', (event) => {
        const nodeId = event.target.id();
        setDebouncedSearchTerm(nodeId.replace("\n", ""));
        setSearchTerm(nodeId.slice(0, 4) + " " + nodeId.slice(4));
      });
    }
  };

  useEffect(() => {
    let touchCount = 0;

    const handleWheel = (e: WheelEvent) => {
      if (cyRef && cyRef.current) {  // Check if cyRef and cyRef.current are not null
        e.preventDefault();
    
        const zoomFactor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
        const container = cyRef.current.container();
        if (container) {  // Check if container is not null
          const offset = container.getBoundingClientRect();
          const pos = {
            x: e.clientX - offset.left,
            y: e.clientY - offset.top
          };
          const zoomedPosition = {
            x: (pos.x - cyRef.current.pan().x) / cyRef.current.zoom(),
            y: (pos.y - cyRef.current.pan().y) / cyRef.current.zoom()
          };
    
          cyRef.current.zoom({
            level: cyRef.current.zoom() * zoomFactor,
            position: zoomedPosition
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
      container.addEventListener('touchstart', handleTouchStart);
      container.addEventListener('touchend', handleTouchEnd);
      container.addEventListener('mousedown', handleMouseDown);
      container.addEventListener('mouseup', handleMouseUpOrLeave);
      container.addEventListener('mouseleave', handleMouseUpOrLeave);
      container.addEventListener('wheel', handleWheel);
    }
  
    return () => {
      if (container) {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchend', handleTouchEnd);
        container.removeEventListener('mousedown', handleMouseDown);
        container.removeEventListener('mouseup', handleMouseUpOrLeave);
        container.removeEventListener('mouseleave', handleMouseUpOrLeave);
        container.removeEventListener('wheel', handleWheel);
      }
    };
  }, [cyRef]);

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
  
      // const graphData = response.data;
      // console.log(graphData);
      // initializeCytoscape(graphData);

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

  useEffect(() => {
    if (showPopup) {
      const timeoutId = setTimeout(() => {
        setShowPopup(false);
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [showPopup]);

  return (
    <div>
      <Header />
      <div className="content-wrapper">
        <div className="flex flexImage course-display bg-gray-800">
          <div className={`${container} courses-handler`}>
            <CoursesHandler
              selectedCourses={selectedCourses}
              setSelectedCourses={setSelectedCourses}
              selectedMajor={selectedMajor}
              setSelectedMajor={setSelectedMajor}
              debouncedSearchTerm={debouncedSearchTerm}
              setDebouncedSearchTerm={setDebouncedSearchTerm}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
            />
          </div>
          <div className="buttons-container">
            <button
              className="generate-button text-white"
              onClick={() => handleLoading(generateAList)}
              disabled={selectedMajor === null || loading}
            >
              Prerequisite Visualizer
            </button>
            {/* <div className={`help-button ${showPopup ? "show" : ""}`}>
              <button onClick={() => setShowPopup(true)}>?</button>
            </div> */}
          </div>
          <div className={`tooltip-window ${showTooltip ? "show" : ""}`}>
            Please select a major to enable the button.
          </div>
          <div className={`loading-window ${loading ? "show" : ""}`}>
            Loading...
          </div>
          <div className={`popup ${showPopup ? "show" : ""}`}>
            <p>
              Enter your selected major and completed classes to generate a
              graph of prerequisite classes.
            </p>
          </div>
          <div id="display-write">
            {/* {image && <img src={image} alt="Generated Graph" />} */}
            <div ref={cyContainerRef} id="cytoscape-container"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Main;
