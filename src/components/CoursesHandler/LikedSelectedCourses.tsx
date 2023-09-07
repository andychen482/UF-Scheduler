import React from "react";
import { Course } from "../CourseUI/CourseTypes";
import ColorHash from "color-hash";
import "./LikedSelectedStyles.css";

interface LikedSelectedCoursesProps {
  selectedCourses: Course[];
  setSelectedCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  setLoaded: React.Dispatch<React.SetStateAction<boolean>>;
}

const colorHash = new ColorHash({
  saturation: [0.4],
  lightness: [0.4, 0.5, 0.6],
});

const getHashedColor = (course: Course) => {
  return colorHash.hex(course.code + course.name);
};

const LikedSelectedCourses: React.FC<LikedSelectedCoursesProps> = ({
  selectedCourses,
  setSelectedCourses,
  setLoaded,
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
    setLoaded(true);
  };

  // Function to chunk the selected courses into pairs
  const chunkArray = (array: Course[], chunkSize: number) => {
    const chunkedArray = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunkedArray.push(array.slice(i, i + chunkSize));
    }
    return chunkedArray;
  };

  const selectedCoursesChunks = chunkArray(selectedCourses, 1);

  return (
    <>
      <div className="mt-4 space-y-2 w-full flex flex-col">
        {selectedCoursesChunks.map(
          (courseChunk: Course[], chunkIndex: number) => (
            <div key={chunkIndex} className="flex">
              {courseChunk.map((course: Course, index: number) => (
                <div
                  id="badge"
                  key={index}
                  className={`flex-1 p-[0.6rem] rounded-md mb-2 text-black dark:text-white cursor-pointer w-full h-16 overflow-hidden`}
                  style={getCourseBackgroundColor(course)}
                  onClick={() => handleBadgeClick(course)}
                >
                  {/* Display course code and credits */}
                  <div className="flex justify-between">
                    <div className="flex-1 min-w-0">
                      {course.termInd !== " " && course.termInd !== "C" ? (
                        <strong className="block truncate">
                          {course.code.replace(/([A-Z]+)/g, "$1 ")} -{" "}
                          {course.termInd}
                        </strong>
                      ) : (
                        <strong className="block truncate">
                          {course.code.replace(/([A-Z]+)/g, "$1 ")}
                        </strong>
                      )}
                      <div className="text-sm line-clamp-1 text-ellipsis">
                        {course.name}
                      </div>
                    </div>
                    <div>
                      <span className="text-white font-bold text-sm">
                        {course.sections[0].credits}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </>
  );
};
export default LikedSelectedCourses;
