import React, { useState, useMemo, Suspense } from "react";
import jsonData from "../../../courses/UF_Jun-30-2023_23_summer_clean.json";
import { Course } from "../../CourseUI/CourseTypes";
import CourseDropdown from "../../CourseUI/CourseDropdown/CourseDropdown";
import { ShowFilteredCoursesClasses } from "./ShowFilteredCoursesClasses";
import {
  PiPlusBold,
  PiMinusBold,
  PiCaretDownBold,
  PiCaretUpBold,
} from "react-icons/pi";

interface ShowFilteredCoursesProps {
  debouncedSearchTerm: string;
  selectedCourses: Course[];
  setSelectedCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  likedCourses: Course[];
  setLikedCourses: React.Dispatch<React.SetStateAction<Course[]>>;
}

const groupByCourseCodeAndName = (courses: Course[]) => {
  return courses.reduce((grouped: { [key: string]: Course[] }, course) => {
    const key = `${course.code}|${course.name}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(course);
    return grouped;
  }, {});
};

const ShowFilteredCourses: React.FC<ShowFilteredCoursesProps> = ({
  debouncedSearchTerm,
  selectedCourses,
  setSelectedCourses,
  likedCourses,
  setLikedCourses,
}) => {
  const [openCourseCode, setOpenCourseCode] = useState<string[] | null>();
  const [lastClick, setLastClick] = useState(0);
  const [clickTimeout, setClickTimeout] = useState<NodeJS.Timeout | null>(null);
  const [courseAnimation, setCourseAnimation] = useState<{
    [key: string]: boolean;
  }>({});


  const {
    minusIcon,
    plusIcon,
    caretDownIcon,
    caretUpIcon,
    courseCard,
  } = ShowFilteredCoursesClasses;

  const handleCourseCardClick = (event: React.MouseEvent, course: Course) => {
    const isButtonClick =
      (event.target as HTMLElement).closest(".plus-icon") !== null ||
      (event.target as HTMLElement).closest(".minus-icon") !== null ||
      (event.target as HTMLElement).closest(".carets") !== null ||
      (event.target as HTMLElement).closest(".heart-icon") !== null;

    const currentTime = new Date().getTime();

    if (!isButtonClick) {
      const isSelected = selectedCourses.some(
        (selectedCourse) =>
          selectedCourse.code === course.code &&
          selectedCourse.name === course.name
      );

      // If less than 250ms have passed since the last click, treat it as a double click.
      if (currentTime - lastClick < 250) {
        // Clear any existing timeouts
        if (clickTimeout) {
          clearTimeout(clickTimeout);
          setClickTimeout(null);
        }

        toggleCourseSelected(course);
      } else {
        // Set up a timeout for the single click action
        setClickTimeout(
          setTimeout(() => {
            toggleCourseDropdown(`${course.code}|${course.name}`);
          }, 250)
        );
      }

      // Update last click time
      setLastClick(currentTime);
    }
  };

  const toggleCourseDropdown = (courseCode: string) => {
    setOpenCourseCode((prevOpenCourseCodes = []) => {
      if (prevOpenCourseCodes === null) {
        // If prevOpenCourseCodes is null, initialize it with the current course code
        return [courseCode];
      } else {
        const isOpen = prevOpenCourseCodes.includes(courseCode);
        // Update the courseAnimation state
        setCourseAnimation((prevCourseAnimation) => ({
          ...prevCourseAnimation,
          [courseCode]: !isOpen,
        }));
        if (!isOpen) {
          // Course is closed, add it to the array
          return [...prevOpenCourseCodes, courseCode];
        } else {
          // Course is already open, remove it from the array
          return prevOpenCourseCodes.filter((code) => code !== courseCode);
        }
      }
    });
  };

  const toggleCourseSelected = (course: Course) => {
    const isSelected = selectedCourses.some(
      (selectedCourse) =>
        selectedCourse.code === course.code &&
        selectedCourse.name === course.name
    );

    if (isSelected) {
      // Remove the course from the list of selected courses if it's already selected.
      setSelectedCourses((prevSelectedCourses) =>
        prevSelectedCourses.filter(
          (selectedCourse) =>
            selectedCourse.code !== course.code ||
            selectedCourse.name !== course.name
        )
      );
    } else {
      // Add the course to the list of selected courses if it's not already selected.
      setSelectedCourses((prevSelectedCourses) => [
        ...prevSelectedCourses,
        course,
      ]);

      // If the course is liked, un-like it.
      if (
        likedCourses.some(
          (likedCourse) =>
            likedCourse.code === course.code && likedCourse.name === course.name
        )
      ) {
        toggleCourseLiked(course);
      }
    }
  };

  const toggleCourseLiked = (course: Course) => {
    const isCourseLiked = likedCourses.some(
      (likedCourse) =>
        likedCourse.code === course.code && likedCourse.name === course.name
    );

    if (isCourseLiked) {
      // Remove the course from the list of liked courses if it's already liked.
      setLikedCourses((prevLikedCourses) =>
        prevLikedCourses.filter(
          (prevLikedCourse) =>
            prevLikedCourse.code !== course.code ||
            prevLikedCourse.name !== course.name
        )
      );
    } else {
      // Add the course to the list of liked courses if it's not already liked.
      setLikedCourses((prevLikedCourses) => [...prevLikedCourses, course]);

      // If the course is selected, unselect it.
      if (
        selectedCourses.some(
          (selectedCourse) =>
            selectedCourse.code === course.code &&
            selectedCourse.name === course.name
        )
      ) {
        toggleCourseSelected(course);
      }
    }
  };

  const filteredCourses = useMemo(() => {
    const formattedSearchTerm = debouncedSearchTerm
      .replace(/\s/g, "")
      .toUpperCase();
    if (formattedSearchTerm.length === 0) {
      return []; // Return an empty array if no search term is provided
    }
    const prefix = formattedSearchTerm.match(/[a-zA-Z]+/)?.[0]?.toUpperCase(); // Extract course prefix
    const additionalCharacters = formattedSearchTerm.slice(prefix?.length); // Extract additional characters
    return (jsonData as Course[])
      .filter((course: Course) => {
        const { code } = course;
        const coursePrefix = code.match(/[a-zA-Z]+/)?.[0]?.toUpperCase(); // Extract course prefix
        return (
          coursePrefix &&
          coursePrefix === prefix &&
          code.toUpperCase().includes(additionalCharacters)
        );
      })
      .sort(
        (a: Course, b: Course) =>
          a.code.localeCompare(b.code) || a.termInd.localeCompare(b.termInd)
      );
  }, [debouncedSearchTerm]);

  const groupedFilteredCourses = useMemo(() => {
    return groupByCourseCodeAndName(filteredCourses);
  }, [filteredCourses]);

  return (
    <div className="max-h-[calc(100vh-8rem)] overflow-auto">
      <Suspense fallback={<div>Loading...</div>}>
        {Object.keys(groupedFilteredCourses).length > 0 ? (
          Object.keys(groupedFilteredCourses).map((key, index) => {
            const courses = groupedFilteredCourses[key];
            const firstCourse = courses[0];
            const isCourseSelected = selectedCourses.includes(firstCourse);
            const isCourseAnimated =
              courseAnimation[`${firstCourse.code}|${firstCourse.name}`] ||
              false;
            const isOpen = openCourseCode?.includes(
              `${firstCourse.code}|${firstCourse.name}`
            );
          return (
            <React.Fragment key={index}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div
                    className={courseCard}
                    onClick={(e) => handleCourseCardClick(e, firstCourse)}
                  >
                    <div className="flex flex-row text-black dark:text-white items-center justify-evenly w-full h-6 p-1 m-0">
                      {firstCourse.termInd !== " " && firstCourse.termInd !== "C" ? (
                        <>
                          <div className="mr-auto h-6">
                            {firstCourse.code.replace(/([A-Z]+)/g, "$1 ")} - {firstCourse.termInd}
                          </div>
                        </>
                      ) : (
                        <div className="mr-auto h-6">
                          {firstCourse.code.replace(/([A-Z]+)/g, "$1 ")}
                        </div>
                      )}
                      <div className="mx-1 h-9">
                        {isCourseSelected ? (
                          <>
                            <PiMinusBold
                              className={`${minusIcon}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCourseSelected(firstCourse);
                              }}
                            />
                          </>
                        ) : (
                          <>
                            <PiPlusBold
                              className={`${plusIcon}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCourseSelected(firstCourse);
                              }}
                            />
                          </>
                        )}
                        {/* Move the caret icons here */}
                        {isOpen ? (
                          <PiCaretUpBold
                            className={`${caretUpIcon} ${
                              isCourseAnimated
                                ? "opacity-100 transition-opacity duration-300"
                                : ""
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCourseDropdown(
                                `${firstCourse.code}|${firstCourse.name}`
                              );
                            }}
                          />
                        ) : (
                          <PiCaretDownBold
                            className={`${caretDownIcon} ${
                              isCourseAnimated
                                ? "opacity-100 transition-opacity duration-100"
                                : ""
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCourseDropdown(
                                `${firstCourse.code}|${firstCourse.name}`
                              );
                            }}
                          />
                        )}
                      </div>
                    </div>
                    <div className="text-sm font-normal text-black dark:text-white mx-1 line-clamp-1 overflow-ellipsis overflow-hidden">
                      {firstCourse.name}
                    </div>
                  </div>
                </div>
              </div>
              {isOpen && (
                  <div className="ml-4 opacity-100 visible transition-opacity">
                    {courses.map((course, index) => (
                      <CourseDropdown key={index} course={course} />
                    ))}
                  </div>
                )}
            </React.Fragment>
          );
        })
        ) : (
          <div className="text-center text-black dark:text-white">
            No courses found.
          </div>
        )}
      </Suspense>
    </div>
  );
}
export default ShowFilteredCourses;