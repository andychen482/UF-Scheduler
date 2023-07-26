import React, { useState} from "react";
import { PyScript, PyRepl } from "pyscript-react";
import CoursesHandler from "../../components/CoursesHandler/CoursesHandler";
import "./CourseDisplay.css";
import { MainClasses } from "./MainClasses";

const Main = () => {
    const { container } = MainClasses;

    return (
      <div className="flex course-display">
        <div className={`${container} courses-handler`}>
          <CoursesHandler />
        </div>
      </div>
    );
  };

export default Main;