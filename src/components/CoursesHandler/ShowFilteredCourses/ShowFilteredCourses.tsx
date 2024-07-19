import React, { useState, useMemo, useEffect, useRef } from "react";
import { Course } from "../../CourseUI/CourseTypes";
import CourseDropdown from "../../CourseUI/CourseDropdown/CourseDropdown";
import { ShowFilteredCoursesClasses } from "./ShowFilteredCoursesClasses";
import InfiniteScroll from "react-infinite-scroller";
import axios from "axios";
import {
  PiPlusBold,
  PiMinusBold,
  PiCaretDownBold,
  PiCaretUpBold,
} from "react-icons/pi";
import "./ShowFilteredCourses.css";
import ReactGA from "react-ga4";

interface ShowFilteredCoursesProps {
  debouncedSearchTerm: string;
  selectedCourses: Course[];
  setSelectedCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  setLoaded: React.Dispatch<React.SetStateAction<boolean>>;
}

let backendServer = process.env.REACT_APP_BACKEND_SERVER_IP as string;

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
  const [courseAnimation, setCourseAnimation] = useState<{
    [key: string]: boolean;
  }>({});

  const [animationKey, setAnimationKey] = useState<string>(debouncedSearchTerm);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const { minusIcon, plusIcon, caretDownIcon, caretUpIcon, courseCard } =
    ShowFilteredCoursesClasses;

  const handleCourseCardClick = (event: React.MouseEvent, course: Course) => {
    const isButtonClick =
      (event.target as HTMLElement).closest(".plus-icon") !== null ||
      (event.target as HTMLElement).closest(".minus-icon") !== null ||
      (event.target as HTMLElement).closest(".carets") !== null;

    if (!isButtonClick) {
      toggleCourseDropdown(`${course.code}|${course.name}`);
    }
  };

  const toggleCourseDropdown = (courseCode: string) => {
    setOpenCourseCode((prevOpenCourseCodes = []) => {
      if (prevOpenCourseCodes === null) {
        return [courseCode];
      } else {
        const isOpen = prevOpenCourseCodes.includes(courseCode);
        setCourseAnimation((prevCourseAnimation) => ({
          ...prevCourseAnimation,
          [courseCode]: !isOpen,
        }));
        if (!isOpen) {
          return [...prevOpenCourseCodes, courseCode];
        } else {
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
      setSelectedCourses((prevSelectedCourses) =>
        prevSelectedCourses.filter(
          (selectedCourse) =>
            selectedCourse.code !== course.code ||
            selectedCourse.name !== course.name
        )
      );
    } else {
      setSelectedCourses((prevSelectedCourses) => [
        ...prevSelectedCourses,
        course,
      ]);
      // ReactGA.event({
      //   category: "Courses",
      //   action: "Select Course",
      //   label: `${course.code} | ${course.name}`,
      // });
      sendCourseMetrics(course);
    }
  };

  const itemsPerPage = 20;
  const [hasMore, setHasMore] = useState(true);
  const [records, setRecords] = useState(itemsPerPage);

  const groupedFilteredCourses = useMemo(() => {
    return groupByCourseCodeAndName(filteredCourses);
  }, [filteredCourses]);

  useMemo(() => {
    setHasMore(true);
    setRecords(itemsPerPage);
    setAnimationKey(debouncedSearchTerm);
  }, [debouncedSearchTerm]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [debouncedSearchTerm]);

  const loadMore = async () => {
    try {
      const response = await axios.post(
        "https://api.ufscheduler.com/api/get_courses",
        {
          searchTerm: debouncedSearchTerm,
          itemsPerPage: itemsPerPage,
          startFrom: records,
        }
      );

      setFilteredCourses((prevCourses) => [...prevCourses, ...response.data]);
      setRecords(records + itemsPerPage);
    } catch (error) {
      console.error("Error loading more data", error);
    }

    if (records >= 2 * itemsPerPage + filteredCourses.length) {
      setHasMore(false);
    }
  };

  const sendCourseMetrics = async (course: Course) => {
    try {
      await axios.post(
        `https://${backendServer}/metrics/course`,
        {
          code: course.code,
          name: course.name,
        }
      );
    }
    catch (error) {
      console.error("Error sending course metrics", error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.post(
          "https://api.ufscheduler.com/api/get_courses",
          {
            searchTerm: debouncedSearchTerm,
            itemsPerPage: itemsPerPage,
            startFrom: 0,
          }
        );

        setFilteredCourses(response.data);
      } catch (error) {
        console.error("Error fetching data", error);
      }
    };
    fetchData();
    setOpenCourseCode(null);
  }, [debouncedSearchTerm]);

  return (
    <div
      ref={containerRef}
      className="filtered-courses-container overflow-y-scroll mt-3"
    >
      <InfiniteScroll
        pageStart={0}
        loadMore={loadMore}
        hasMore={hasMore}
        useWindow={false}
      >
        {Object.keys(groupedFilteredCourses).length > 0 ? (
          Object.keys(groupedFilteredCourses).map((key, index) => {
            const courses = groupedFilteredCourses[key];
            const firstCourse = courses[0];
            const isCourseSelected = selectedCourses.some(
              (selectedCourse) =>
                selectedCourse.code === firstCourse.code &&
                selectedCourse.name === firstCourse.name
            );
            const isCourseAnimated =
              courseAnimation[`${firstCourse.code}|${firstCourse.name}`] ||
              false;
            const isOpen = openCourseCode?.includes(
              `${firstCourse.code}|${firstCourse.name}`
            );
            const currentBatchIndex = index % itemsPerPage;

            return (
              <React.Fragment key={index}>
                <div
                  key={`${animationKey}`}
                  className="flex items-center w-full justify-between fade-in-wave"
                  style={{ animationDelay: `${currentBatchIndex * 35}ms` }}
                >
                  <div className={`${courseCard}`}>
                    <div
                      className="cursor-pointer"
                      onClick={(e) => handleCourseCardClick(e, firstCourse)}
                    >
                      <div className="flex flex-row text-white dark:text-white items-center justify-evenly w-full h-6 p-1 m-0">
                        {firstCourse.termInd !== " " &&
                        firstCourse.termInd !== "C" ? (
                          <>
                            <div className="mr-auto h-6 whitespace-nowrap overflow-hidden text-overflow-ellipsis">
                              {firstCourse.code.replace(/([A-Z]+)/g, "$1 ")} -{" "}
                              {firstCourse.termInd}
                            </div>
                          </>
                        ) : (
                          <div className="mr-auto h-6  whitespace-nowrap overflow-hidden text-overflow-ellipsis">
                            {firstCourse.code.replace(/([A-Z]+)/g, "$1 ")}
                          </div>
                        )}
                        <div className="text-sm font-normal text-gray-300 mr-6 h-5 mb-[0.3rem] whitespace-nowrap overflow-hidden text-overflow-ellipsis">
                          Credits: {firstCourse.sections[0].credits}
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
                      <div className="text-sm font-normal text-gray-300 dark:text-white mx-1 line-clamp-2 overflow-ellipsis overflow-hidden">
                        {firstCourse.name}
                      </div>
                    </div>
                    {isOpen && (
                      <div>
                        <div className={`mt-2 mb-0 mx-1 text-gray-200 `}>
                          <hr
                            style={{
                              border: "1px solid #ffffff",
                              marginBottom: "4px",
                            }}
                          />
                          <strong>Description: </strong>
                          {firstCourse.description
                            ? firstCourse.description.replace("(P)", "").trim()
                            : "N/A"}
                          <br />
                          <strong> Prerequisites: </strong>
                          {firstCourse.prerequisites
                            ? firstCourse.prerequisites
                                .replace("Prereq: ", "")
                                .trim()
                            : "N/A"}
                        </div>
                        <div>
                          <div className="w-[100%] opacity-100 visible transition-opacity my-1">
                            <CourseDropdown
                              course={firstCourse}
                              selectedCourses={selectedCourses}
                              setSelectedCourses={setSelectedCourses}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })
        ) : (
          <div className="text-gray-300 fade-text-in">No courses found.</div>
        )}
      </InfiniteScroll>
    </div>
  );
};

export default ShowFilteredCourses;
