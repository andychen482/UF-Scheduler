import React, { useState } from "react";
import LikedSelectedCourses from "./LikedSelectedCourses";
import CourseSearch from "./CourseSearch/CourseSearch";
import ShowFilteredCourses from "./ShowFilteredCourses/ShowFilteredCourses";
import { Course } from "../CourseUI/CourseTypes";

const CoursesHandler: React.FC = () => {
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedCourses, setSelectedCourses] = useState<Course[]>([]);
  const [likedCourses, setLikedCourses] = useState<Course[]>([]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-md p-4 shadow-md transition-shadow duration-300">
      <LikedSelectedCourses
        selectedCourses={selectedCourses}
        likedCourses={likedCourses}
        setSelectedCourses={setSelectedCourses}
        setLikedCourses={setLikedCourses}
      />
      <CourseSearch
        debouncedSearchTerm={debouncedSearchTerm}
        setDebouncedSearchTerm={setDebouncedSearchTerm}
      />
      <ShowFilteredCourses
        debouncedSearchTerm={debouncedSearchTerm}
        selectedCourses={selectedCourses}
        setSelectedCourses={setSelectedCourses}
        likedCourses={likedCourses}
        setLikedCourses={setLikedCourses}
      />
    </div>
  );

  // return (
  //   <div className="bg-white dark:bg-gray-800 rounded-md p-4 shadow-md transition-shadow duration-300">
  //     <div className="lg:flex">
  //       <div className="lg:w-2/3 lg:mr-4">
  //         <ShowFilteredCourses
  //           debouncedSearchTerm={debouncedSearchTerm}
  //           selectedCourses={selectedCourses}
  //           setSelectedCourses={setSelectedCourses}
  //           likedCourses={likedCourses}
  //           setLikedCourses={setLikedCourses}
  //         />
  //       </div>
  //       <div className="lg:w-1/3">
  //         <LikedSelectedCourses
  //           selectedCourses={selectedCourses}
  //           likedCourses={likedCourses}
  //           setSelectedCourses={setSelectedCourses}
  //           setLikedCourses={setLikedCourses}
  //         />
  //       </div>
  //     </div>
  //     <div className="hidden lg:block">
  //       <CourseSearch
  //         debouncedSearchTerm={debouncedSearchTerm}
  //         setDebouncedSearchTerm={setDebouncedSearchTerm}
  //       />
  //     </div>
  //   </div>
  // );
};
  

export default CoursesHandler;
