import React, { useState, useEffect } from "react";
import LikedSelectedCourses from "./LikedSelectedCourses";
import CourseSearch from "./CourseSearch/CourseSearch";
import ShowFilteredCourses from "./ShowFilteredCourses/ShowFilteredCourses";
import { Course } from "../CourseUI/CourseTypes";
import Cookies from "js-cookie"; // Import the js-cookie library

const CoursesHandler: React.FC = () => {
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedCourses, setSelectedCourses] = useState<Course[]>([]);

  // Load selectedCourses from the cookie when the component mounts
  useEffect(() => {
    const cookieSelectedCourses = localStorage.getItem("selectedCourses");
    if (cookieSelectedCourses) {
      setSelectedCourses(JSON.parse(cookieSelectedCourses));
    }
  }, []); // Run this effect only once when the component mounts

  // Save selectedCourses to the cookie whenever it changes
  useEffect(() => {
    if (selectedCourses.length > 0) {
      localStorage.setItem("selectedCourses", JSON.stringify(selectedCourses));
    }
  }, [selectedCourses]); // Run this effect whenever selectedCourses changes

  return (
    <div className="bg-gray-700 dark:bg-gray-800 rounded-md p-4 shadow-md transition-shadow duration-300">
      <LikedSelectedCourses
        selectedCourses={selectedCourses}
        setSelectedCourses={setSelectedCourses}
      />
      <CourseSearch
        debouncedSearchTerm={debouncedSearchTerm}
        setDebouncedSearchTerm={setDebouncedSearchTerm}
      />
      <ShowFilteredCourses
        debouncedSearchTerm={debouncedSearchTerm}
        selectedCourses={selectedCourses}
        setSelectedCourses={setSelectedCourses}
      />
    </div>
  );
};

export default CoursesHandler;
