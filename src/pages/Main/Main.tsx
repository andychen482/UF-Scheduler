import React, { useState } from "react";
import CoursesHandler from "../../components/CoursesHandler/CoursesHandler";
import "./CourseDisplay.css";
import { MainClasses } from "./MainClasses";

const Main = () => {
  const { container } = MainClasses;
  const [showPopup, setShowPopup] = useState(false);

  const togglePopup = () => {
    setShowPopup(!showPopup);
  };

  return (
    <div className="flex course-display bg-gray-800">
      <div className={`${container} courses-handler`}>
        <CoursesHandler />
      </div>
      <div className="help-button">
        <button onClick={togglePopup}>?</button>
      </div>
      {showPopup && (
        <div className="popup">
          <p>Enter your selected major and completed classes</p>
          <p>to generate a graph of your suggested course plan</p>
        </div>
      )}
    </div>
  );
};

export default Main;
