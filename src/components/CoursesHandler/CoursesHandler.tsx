import React, { useState, useEffect } from "react";
import LikedSelectedCourses from "./LikedSelectedCourses";
import CourseSearch from "./CourseSearch/CourseSearch";
import ShowFilteredCourses from "./ShowFilteredCourses/ShowFilteredCourses";
import { Course } from "../CourseUI/CourseTypes";
import MajorSelect from "./MajorSearch/MajorSearch";

interface CoursesHandlerProps {
  selectedCourses: Course[];
  setSelectedCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  selectedMajor: string | null;
  setSelectedMajor: React.Dispatch<React.SetStateAction<string | null>>;
  debouncedSearchTerm: string;
  setDebouncedSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
}

const CoursesHandler: React.FC<CoursesHandlerProps> = (
  {
    selectedCourses,
    setSelectedCourses,
    selectedMajor,
    setSelectedMajor,
    debouncedSearchTerm,
    setDebouncedSearchTerm,
    searchTerm,
    setSearchTerm,
  }
) => {
  // const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  // const [selectedCourses, setSelectedCourses] = useState<Course[]>([]);
  const [hasBeenLoaded, setLoaded ] = useState(false);
  // const [selectedMajor, setSelectedMajor] = useState<string | null>(null);
  const [ totalCredits, setTotalCredits ] = useState(0);

  // Load selectedCourses from the cookie when the component mounts
  useEffect(() => {
    const storedSelectedCourses = localStorage.getItem("selectedCourses");
    if (storedSelectedCourses) {
      setSelectedCourses(JSON.parse(storedSelectedCourses));
    }
  }, [setSelectedCourses]); 
  
  useEffect(() => {
    if ((selectedCourses.length > 0) || hasBeenLoaded){
      localStorage.setItem("selectedCourses", JSON.stringify(selectedCourses));
    }
  }, [selectedCourses, hasBeenLoaded]);

  useEffect(() => {
    const storedSelectedMajor = localStorage.getItem("selectedMajor");
    if (storedSelectedMajor) {
      setSelectedMajor(JSON.parse(storedSelectedMajor));
    }
  }, [setSelectedMajor]);

  useEffect(() => {
    if (selectedMajor){
      localStorage.setItem("selectedMajor", JSON.stringify(selectedMajor));
    }
  }, [selectedMajor]);

  useEffect(() => {
    const sumCredits = selectedCourses.reduce((totalCredits, course) => {
      // Check if credits is a number
      if (typeof course.sections[0].credits === 'number') {
        return totalCredits + course.sections[0].credits;
      }
      // If it's not a number, just return the accumulated total so far
      return totalCredits;
    }, 0);
    
    setTotalCredits(sumCredits);
  }, [selectedCourses]);

  return (
    <div className="bg-gray-700 dark:bg-gray-800 rounded-md p-4 shadow-md transition-shadow duration-300">
      <LikedSelectedCourses
        selectedCourses={selectedCourses}
        setSelectedCourses={setSelectedCourses}
        setLoaded={setLoaded}
      />
      <div className="mb-1 text-white">
        Credits: {totalCredits}
      </div>
      <MajorSelect 
        selectedMajor={selectedMajor}
        setSelectedMajor={setSelectedMajor}
      />
      <CourseSearch
        debouncedSearchTerm={debouncedSearchTerm}
        setDebouncedSearchTerm={setDebouncedSearchTerm}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
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
