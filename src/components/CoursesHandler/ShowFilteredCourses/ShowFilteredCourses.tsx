import React, { useState, useMemo, useEffect } from "react";
// import jsonData from "../../../courses/UF_Jun-30-2023_23_fall_clean.json";
import { Course } from "../../CourseUI/CourseTypes";
import CourseDropdown from "../../CourseUI/CourseDropdown/CourseDropdown";
import { ShowFilteredCoursesClasses } from "./ShowFilteredCoursesClasses";
import InfiniteScroll from "react-infinite-scroller";
import axios from 'axios';
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
  setLoaded: React.Dispatch<React.SetStateAction<boolean>>;
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
  setLoaded,
}) => {
  const [openCourseCode, setOpenCourseCode] = useState<string[] | null>();
  const [lastClick, setLastClick] = useState(0);
  const [clickTimeout, setClickTimeout] = useState<NodeJS.Timeout | null>(null);
  const [courseAnimation, setCourseAnimation] = useState<{
    [key: string]: boolean;
  }>({});

  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);


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
      (event.target as HTMLElement).closest(".carets") !== null;

    const currentTime = new Date().getTime();

    if (!isButtonClick) {
      // eslint-disable-next-line
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
    setLoaded(true);
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
    }
  };

  const itemsPerPage = 20;
  const [hasMore, setHasMore] = useState(true);
  const [records, setrecords] = useState(itemsPerPage);

  // const filteredCourses = useMemo(() => {
  //   setHasMore(true);
  //   setrecords(itemsPerPage);
  //   const formattedSearchTerm = debouncedSearchTerm
  //     .replace(/\s/g, "")
  //     .toUpperCase();
  //   if (formattedSearchTerm.length === 0) {
  //     return []; // Return an empty array if no search term is provided
  //   }
  //   const prefix = formattedSearchTerm.match(/[a-zA-Z]+/)?.[0]?.toUpperCase(); // Extract course prefix
  //   const additionalCharacters = formattedSearchTerm.slice(prefix?.length); // Extract additional characters
  //   return (jsonData as Course[])
  //     .filter((course: Course) => {
  //       const { code } = course;
  //       const coursePrefix = code.match(/[a-zA-Z]+/)?.[0]?.toUpperCase(); // Extract course prefix
  //       const jsonAdditionalChars = code.slice(coursePrefix?.length); // Extract additional characters
  //       return (
  //         coursePrefix &&
  //         coursePrefix.startsWith(prefix!) &&
  //         jsonAdditionalChars.toUpperCase().startsWith(additionalCharacters)
  //       );
  //     })
  //     .sort(
  //       (a: Course, b: Course) =>
  //         a.code.localeCompare(b.code) || a.termInd.localeCompare(b.termInd)
  //     );
  // }, [debouncedSearchTerm]);

  const groupedFilteredCourses = useMemo(() => {
    return groupByCourseCodeAndName(filteredCourses);
  }, [filteredCourses]);

  // const loadMore = () => {
  //   if (records >= Object.keys(groupedFilteredCourses).length) {
  //     setHasMore(false);
  //   } else {
  //     setTimeout(() => {
  //       setrecords(records + itemsPerPage);
  //     }, 2000);
  //   }
  // };

  useMemo(() => {
    setHasMore(true);
    setrecords(itemsPerPage);
  }, [debouncedSearchTerm]);

  const loadMore = async () => {
    try {
      const response = await axios.post("https://ufscheduler.onrender.com/api/get_courses", {
        searchTerm: debouncedSearchTerm,
        itemsPerPage: itemsPerPage,
        startFrom: records  // start from current record count
      });

      setFilteredCourses(prevCourses => [...prevCourses, ...response.data]);
      setrecords(records + itemsPerPage);
      console.log(records);
    } catch (error) {
      console.error("Error loading more data", error);
    }
    if (records >= 2*itemsPerPage + filteredCourses.length) {
      setHasMore(false);
    }
    console.log("Records:" + records);
    console.log("Length of results:" + filteredCourses.length);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.post("https://ufscheduler.onrender.com/api/get_courses", {
          searchTerm: debouncedSearchTerm,
          itemsPerPage: itemsPerPage,
          startFrom: 0  // assuming you want to paginate from the start when the search term changes
        });

        setFilteredCourses(response.data);
      } catch (error) {
        console.error("Error fetching data", error);
      }
    }
    if (debouncedSearchTerm !== "")
    {
      fetchData();
    }
  }, [debouncedSearchTerm]);

  return (
    <div className="max-h-[calc(100vh-11.6rem)] overflow-auto mt-3">
      <InfiniteScroll
        pageStart={0}
        loadMore={loadMore}
        hasMore={hasMore}
        useWindow={false}
      >
        {Object.keys(groupedFilteredCourses).length > 0 ? (
          Object.keys(groupedFilteredCourses).slice(0, records).map((key, index) => {
            const courses = groupedFilteredCourses[key];
            const firstCourse = courses[0];
            const isCourseSelected = selectedCourses.some(
              (selectedCourse) =>
                selectedCourse.code === firstCourse.code && selectedCourse.name === firstCourse.name);
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
                      <div className="flex flex-row text-white dark:text-white items-center justify-evenly w-full h-6 p-1 m-0">
                        {firstCourse.termInd !== " " &&
                        firstCourse.termInd !== "C" ? (
                          <>
                            <div className="mr-auto h-6">
                              {firstCourse.code.replace(/([A-Z]+)/g, "$1 ")}{" "}
                              - {firstCourse.termInd}
                            </div>
                          </>
                        ) : (
                          <div className="mr-auto h-6">
                            {firstCourse.code.replace(/([A-Z]+)/g, "$1 ")}
                          </div>
                        )}
                        <div className="text-sm font-normal text-gray-300 mr-6 h-5">
                          Credits: {" "}
                          {firstCourse.sections[0].credits}
                        </div>
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
                        </div>
                        <div className="mx-1 h-9">
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
                      <div className="text-sm font-normal text-gray-300 dark:text-white mx-1 line-clamp-1 overflow-ellipsis overflow-hidden">
                        {firstCourse.name}
                      </div>
                    </div>
                  </div>
                </div>
                {isOpen && (
                  <div className="w-[20rem] sm:w-[20rem] md:w-[24rem] lg:w-[28rem] xl:w-[32rem] opacity-100 visible transition-opacity">
                    {courses.map((course, index) => (
                      <CourseDropdown key={index} course={course} />
                    ))}
                  </div>
                )}
              </React.Fragment>
            );
          })
        ) : (
          <div className="text-gray-300">No courses found.</div>
        )}
      </InfiniteScroll>
    </div>
  );
}

export default ShowFilteredCourses;