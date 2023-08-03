import React, { useState, useEffect } from "react";
import LikedSelectedCourses from "./LikedSelectedCourses";
import CourseSearch from "./CourseSearch/CourseSearch";
import ShowFilteredCourses from "./ShowFilteredCourses/ShowFilteredCourses";
import { Course } from "../CourseUI/CourseTypes";
import MajorSelect from "./MajorSearch/MajorSearch";

const CoursesHandler: React.FC = () => {
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedCourses, setSelectedCourses] = useState<Course[]>([]);
  const [hasBeenLoaded, setLoaded ] = useState(false);
  const [selectedMajor, setSelectedMajor] = useState<string | null>(null);

  // Load selectedCourses from the cookie when the component mounts
  useEffect(() => {
    const storedSelectedCourses = localStorage.getItem("selectedCourses");
    if (storedSelectedCourses) {
      setSelectedCourses(JSON.parse(storedSelectedCourses));
    }
  }, []); // Run this effect only once when the component mounts

  // Save selectedCourses to the cookie whenever it changes
  useEffect(() => {
    if ((selectedCourses.length > 0) || hasBeenLoaded){
      localStorage.setItem("selectedCourses", JSON.stringify(selectedCourses));
    }
  }, [selectedCourses, hasBeenLoaded]); // Run this effect whenever selectedCourses changes

  return (
    <div className="bg-gray-700 dark:bg-gray-800 rounded-md p-4 shadow-md transition-shadow duration-300">
      <LikedSelectedCourses
        selectedCourses={selectedCourses}
        setSelectedCourses={setSelectedCourses}
        setLoaded={setLoaded}
      />
      <MajorSelect 
        selectedMajor={selectedMajor}
        setSelectedMajor={setSelectedMajor}
      />
      <CourseSearch
        debouncedSearchTerm={debouncedSearchTerm}
        setDebouncedSearchTerm={setDebouncedSearchTerm}
      />
      <ShowFilteredCourses
        debouncedSearchTerm={debouncedSearchTerm}
        selectedCourses={selectedCourses}
        setSelectedCourses={setSelectedCourses}
        setLoaded={setLoaded}
      />
    </div>
  );
};

export default CoursesHandler;
