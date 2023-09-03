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
  const [image, setImage] = useState("");
  const [selectedMajor, setSelectedMajor] = useState<string | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<Course[]>([]);
  const [showTooltip, setShowTooltip] = useState(false);
  const [elapsedTime, setElapsedTime] = useState("");
  const [loading, setLoading] = useState(false);
  const cyContainerRef = useRef(null);

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

  const initializeCytoscape = (graphData: GraphData) => {
    if (cyContainerRef.current) {
      const cy = cytoscape({
        container: cyContainerRef.current,
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
              'text-max-width': '150px', 
              'font-size': '30px',
              'width': '150px',  // Set a fixed width
              'height': '150px', // Set the same value for height to make it a circle
            }
          },
          {
            selector: 'edge',
            style: {
              'width': 5,
              'line-color': '#ccc',
              'target-arrow-color': '#ccc',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier'
            }
          }
        ],
        layout: {
          name: 'klay',
          nodeDimensionsIncludeLabels: true,
          padding: 20,
          klay: {
            direction: 'RIGHT', // Layout flows from left to right
            spacing: 80,        // Adjust as needed for spacing between nodes
            nodeLayering: 'NETWORK_SIMPLEX', // Strategy for node layering
            edgeRouting: 'ORTHOGONAL', 
          }
        } as any,
        minZoom: 0.22,  // Set the minimum zoom level. Adjust as needed.
        maxZoom: 3,    // Optional: Set a maximum zoom level if needed.
        wheelSensitivity: 0.1  // Optional: Adjusts the sensitivity of mousewheel zooming.
      });
    }
  };

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
  
      const graphData = response.data;
      console.log(graphData);
      initializeCytoscape(graphData);
    });
  };

  useEffect(() => {
    const storedImage = localStorage.getItem("image");
    if (storedImage) {
      setImage(storedImage);
    }
  }, []);

  useEffect(() => {
    if (image) {
      localStorage.setItem("image", image);
    }
  }, [image]);

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
            <div ref={cyContainerRef} id="cytoscape-container" style={{ width: '100%', height: '100%' }}></div>
            {elapsedTime && (
            <div id="elapsed-time" className="elapsed-time">
              {elapsedTime}
              {" seconds"}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Main;
