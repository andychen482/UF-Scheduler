import { useState, useEffect } from "react";
import axios from 'axios';
import CoursesHandler from "../../components/CoursesHandler/CoursesHandler";
import "./CourseDisplay.css";
import { MainClasses } from "./MainClasses";
import { Course } from "../../components/CourseUI/CourseTypes";


const Main = () => {
  const { container } = MainClasses;
  const [showPopup, setShowPopup] = useState(false);
  const [image, setImage] = useState('');
  const [selectedMajor, setSelectedMajor] = useState<string | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<Course[]>([]);
  const [showTooltip, setShowTooltip] = useState(false);
  const [elapsedTime, setElapsedTime] = useState("");
  const [loading, setLoading] = useState(false);
  const togglePopup = () => {
    setShowPopup(!showPopup);
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

  const generateAList = async () => {
    await handleLoading(async () => {
      const selectedCoursesServ = selectedCourses.map((course) => course.code);
      // http://localhost:5000/generate_graph
      // https://ufscheduler.onrender.com/generate_graph
      // const response = await axios.post('http://localhost:5000/generate_a_list', {
      const response = await axios.post('https://ufscheduler.onrender.com/generate_a_list', {
        selectedMajorServ: selectedMajor,
        selectedCoursesServ: selectedCoursesServ
      });
    
      setImage(`data:image/png;base64,${response.data.image}`);
      setElapsedTime(response.data.time);
    });
  };

  const generateAMatrix = async () => {
    await handleLoading(async () => {
      const selectedCoursesServ = selectedCourses.map((course) => course.code);
      // const response = await axios.post('http://localhost:5000/generate_a_matrix', {
      const response = await axios.post('https://ufscheduler.onrender.com/generate_a_matrix', {
        selectedMajorServ: selectedMajor,
        selectedCoursesServ: selectedCoursesServ
      });

      setImage(`data:image/png;base64,${response.data.otherImage}`);
      setElapsedTime(response.data.otherTime);
    });
  };

  useEffect(() => {
    const storedImage = localStorage.getItem("image");
    if (storedImage) {
      setImage(storedImage);
    }
  }, []);

  useEffect(() => {
    if (image){
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



  return (
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
      <div id="button-stack" className="flex flex-col space-y-2">
          {/* Update the button click event handlers to use the new functions */}
          <button
            className="generate-button text-white"
            onClick={() => handleLoading(generateAList)}
            disabled={selectedMajor === null || loading}
          >
            Generate Adjacency List A
          </button>
          <button
            className="generate-button text-white"
            onClick={() => handleLoading(generateAMatrix)}
            disabled={selectedMajor === null || loading}
          >
            Generate Adjacency List B
          </button>
        </div>
        <div className="help-button">
          <button onClick={togglePopup}>?</button>
        </div>
      </div>
      <div className={`tooltip-window ${showTooltip ? "show" : ""}`}>
        Please select a major to enable the button.
      </div>
      <div className={`loading-window ${loading ? "show" : ""}`}>
        Loading...
      </div>
      {showPopup && (
        <div className="popup">
          <p>Enter your selected major and completed classes 
          to generate a graph of prerequisite classes.
          </p>
        </div>
      )}
      <div id="display-write">
        {image && <img src={image} alt="Generated Graph" />}
      </div>
      {elapsedTime &&
      (<div id="elapsed-time" className="elapsed-time">{elapsedTime}{" seconds"}</div>
      )}
    </div>
  );
};

export default Main;
