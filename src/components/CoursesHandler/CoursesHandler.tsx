import React, { useEffect } from "react";
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
  hasBeenLoaded: boolean;
  setLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  customAppointments: any[];
  setCustomAppointments: React.Dispatch<React.SetStateAction<any[]>>;
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
    hasBeenLoaded,
    setLoaded,
    customAppointments,
    setCustomAppointments
  }
) => {

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
    const storedCustomAppointment = localStorage.getItem("customAppointments");
    if (storedCustomAppointment) {
      setCustomAppointments(JSON.parse(storedCustomAppointment));
    }
  }, [setCustomAppointments]);

  useEffect(() => {
    if (customAppointments.length > 0 || hasBeenLoaded){
      localStorage.setItem("customAppointments", JSON.stringify(customAppointments));
    }
  }, [customAppointments, hasBeenLoaded]);

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

  return (
    <div className="bg-gray-700 dark:bg-gray-800 rounded-md p-4 shadow-md transition-shadow duration-300 min-w-full min-h-full" style={{ maxHeight: 'calc(100vh - 72px)'}}>
      {/* <LikedSelectedCourses
        selectedCourses={selectedCourses}
        setSelectedCourses={setSelectedCourses}
        setLoaded={setLoaded}
      /> */}
      <MajorSelect 
        selectedMajor={selectedMajor}
        setSelectedMajor={setSelectedMajor}
      />
      <CourseSearch
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
