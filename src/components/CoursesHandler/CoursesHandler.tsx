import React, { useEffect, useState } from "react";
import CourseSearch from "./CourseSearch/CourseSearch";
import ShowFilteredCourses from "./ShowFilteredCourses/ShowFilteredCourses";
import { Course } from "../CourseUI/CourseTypes";
import "./CourseHandlerStyles.css"

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
  term: string;
  year: string;
  selectedValue: string;
  handleTermChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
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
    setCustomAppointments,
    term,
    year,
    selectedValue,
    handleTermChange
  }
) => {

  const [searchTrigger, setSearchTrigger] = useState<boolean>(false);

  useEffect(() => {
    if (selectedMajor){
      localStorage.setItem("selectedMajor", selectedMajor);
    }
    else {
      localStorage.removeItem("selectedMajor");
    }
  }, [selectedMajor]);

  return (
    <div className="bg-[rgb(0,0,0)] shadow-md transition-shadow duration-300 min-w-full min-h-full course-handler">
      {/* <LikedSelectedCourses
        selectedCourses={selectedCourses}
        setSelectedCourses={setSelectedCourses}
        setLoaded={setLoaded}
      /> */}
      {/* <MajorSelect 
        selectedMajor={selectedMajor}
        setSelectedMajor={setSelectedMajor}
      /> */}
      <CourseSearch
        setDebouncedSearchTerm={setDebouncedSearchTerm}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        searchTrigger={searchTrigger}
        setSearchTrigger={setSearchTrigger}
        selectedValue={selectedValue}
        handleTermChange={handleTermChange}
      />
      <ShowFilteredCourses
        debouncedSearchTerm={debouncedSearchTerm}
        selectedCourses={selectedCourses}
        setSelectedCourses={setSelectedCourses}
        setLoaded={setLoaded}
        term={term}
        year={year}
        searchTrigger={searchTrigger}
        selectedValue={selectedValue}
      />
    </div>
  );
};

export default CoursesHandler;
