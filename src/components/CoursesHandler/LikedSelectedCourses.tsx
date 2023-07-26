import React from "react";
import { Course } from "../CourseUI/CourseTypes";
import ColorHash from "color-hash";

interface LikedSelectedCoursesProps {
  likedCourses: Course[];
  setLikedCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  selectedCourses: Course[];
  setSelectedCourses: React.Dispatch<React.SetStateAction<Course[]>>;
}

const colorHash = new ColorHash({
  saturation: [0.4],
  lightness: [0.4, 0.5, 0.6],
});

const getHashedColor = (course: Course) => {
  return colorHash.hex(course.code + course.name);
};

const LikedSelectedCourses: React.FC<LikedSelectedCoursesProps> = ({
  likedCourses,
  setLikedCourses,
  selectedCourses,
  setSelectedCourses,
}) => {
  const getCourseBackgroundColor = (course: Course) => {
    const hashedColor = getHashedColor(course);
    return {
      backgroundColor: hashedColor,
    };
  };

  const handleBadgeClick = (course: Course) => {
    setSelectedCourses((prevSelectedCourses) =>
      prevSelectedCourses.filter(
        (selectedCourse) =>
          selectedCourse.code !== course.code ||
          selectedCourse.name !== course.name
      )
    );

    setLikedCourses((prevLikedCourses) =>
      prevLikedCourses.filter(
        (likedCourse) =>
          likedCourse.code !== course.code || likedCourse.name !== course.name
      )
    );
  };

  return (
    <>
      <div className="space-x-2 mb-4 flex flex-wrap">
        {likedCourses.length > 0 &&
          likedCourses.map((course: Course, index: number) => (
            <div
              key={index}
              className={`p-4 rounded-md m-2 text-black dark:text-white opacity-60 cursor-pointer sm:w-[18.5rem] w-full h-20 overflow-hidden`}
              style={getCourseBackgroundColor(course)}
              onClick={() => handleBadgeClick(course)}
            >
              {course.code.replace(/([A-Z]+)/g, "$1 ")}
              <div className="text-xs line-clamp-2 overflow-ellipsis overflow-hidden">
                {course.name}
              </div>
            </div>
          ))}
      </div>
      <div className="space-x-2 mb-4 flex flex-wrap">
        {selectedCourses.length > 0 &&
          selectedCourses.map((course: Course, index: number) => (
            <div
              key={index}
              className={`p-4 rounded-md m-2 text-black dark:text-white cursor-pointer sm:w-[18.5rem] w-full h-20 overflow-hidden`}
              style={getCourseBackgroundColor(course)}
              onClick={() => handleBadgeClick(course)}
            >
              {course.termInd !== " " && course.termInd !== "C" ? (
                <strong>
                  {course.code.replace(/([A-Z]+)/g, "$1 ")} - {course.termInd}
                </strong>
              ) : (
                <strong>{course.code.replace(/([A-Z]+)/g, "$1 ")}</strong>
              )}
              <div className="text-sm line-clamp-1 overflow-ellipsis overflow-hidden">
                {course.name}
              </div>
            </div>
          ))}
      </div>
    </>
  );
};

export default LikedSelectedCourses;
