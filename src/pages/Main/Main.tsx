import React, { useState } from "react";
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

  const togglePopup = () => {
    setShowPopup(!showPopup);
  };

  const generateGraph = async () => {
    const selectedCoursesServ = selectedCourses.map((course) => course.code);
    // http://localhost:5000/generate_graph
    // https://ufscheduler.onrender.com/generate_graph
    const response = await axios.post('https://ufscheduler.onrender.com/generate_graph', {
      selectedMajorServ: selectedMajor,
      selectedCoursesServ: selectedCoursesServ
    });
  
    setImage(`data:image/png;base64,${response.data.image}`);
  };

  return (
    <div className="flex course-display bg-gray-800">
      <div className={`${container} courses-handler`}>
        <CoursesHandler
          selectedCourses={selectedCourses}
          setSelectedCourses={setSelectedCourses}
          selectedMajor={selectedMajor}
          setSelectedMajor={setSelectedMajor}
        />
      </div>
      <button className="generate-button text-white" onClick={generateGraph}>Generate Graph</button>
      <div className="help-button">
        <button onClick={togglePopup}>?</button>
      </div>
      {showPopup && (
        <div className="popup">
          <p>Enter your selected major and completed classes</p>
          <p>to generate a graph of your suggested course plan</p>
        </div>
      )}
      <div id="display-write">
        {image && <img src={image} alt="Generated Graph" />}
      </div>
    </div>
  );
};

export default Main;
