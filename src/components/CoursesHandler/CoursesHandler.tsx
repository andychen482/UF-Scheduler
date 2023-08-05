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
}

const CoursesHandler: React.FC<CoursesHandlerProps> = (
  {
    selectedCourses,
    setSelectedCourses,
    selectedMajor,
    setSelectedMajor
  }
) => {
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
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
  }, []); 
  
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
  }, []);

  useEffect(() => {
    if (selectedMajor){
      localStorage.setItem("selectedMajor", JSON.stringify(selectedMajor));
    }
  }, [selectedMajor]);

  useEffect(() => {
    const sumCredits = selectedCourses.reduce(
      (totalCredits, course) => totalCredits + course.sections[0].credits,
      0
    );
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
