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
  PiVideoCameraSlashBold,
  PiPencilBold
} from "react-icons/pi";
import { Tooltip } from 'react-tooltip';
import "./ShowFilteredCourses.css";
import PrerequisiteBlock from "components/CourseUI/PrerequisiteBlock";
import CourseCatalogTagPills from "../../CourseUI/CourseCatalogTagPills";
import { API_URLS, BACKEND_URLS, getAuthHeaders } from "../../../config/api";
import { useAuth } from "react-oidc-context";

interface ShowFilteredCoursesProps {
  debouncedSearchTerm: string;
  selectedCourses: Course[];
  setSelectedCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  setLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  term: string;
  year: string;
  searchTrigger: boolean;
  selectedValue: string;
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
  term,
  year,
  searchTrigger,
  selectedValue
}) => {
  const auth = useAuth();
  const [openCourseCode, setOpenCourseCode] = useState<string[] | null>();
  const [courseAnimation, setCourseAnimation] = useState<{
    [key: string]: boolean;
  }>({});

  const [animationKey, setAnimationKey] = useState<string>(debouncedSearchTerm);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const { minusIcon, plusIcon, caretDownIcon, caretUpIcon, courseCard } =
    ShowFilteredCoursesClasses;

  const [editingCredits, setEditingCredits] = useState<string | null>(null);
  const [noCoursesFound, setNoCoursesFound] = useState<boolean>(false);

  const handleCourseCardClick = (event: React.MouseEvent, course: Course) => {
    toggleCourseDropdown(`${course.code}|${course.name}`);
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

      sendCourseMetrics(course);
    }
  };

  // New function to add only non-online sections
  const toggleNonOnlineSections = (course: Course) => {
    setLoaded(true);

    const nonOnlineSections = course.sections.filter(
      (section) => section.meetTimes && section.meetTimes.length > 0
    );

    const selectedNonOnline = {
      ...course,
      sections: nonOnlineSections,
      inPerson: true,
    };

    // const isSelected = selectedCourses.some(
    //   (selectedCourse) =>
    //     selectedCourse.code === course.code &&
    //     selectedCourse.name === course.name &&
    //     selectedCourse.sections.length === selectedNonOnline.sections.length
    // );

    // if (isSelected) {
    //   setSelectedCourses((prevSelectedCourses) =>
    //     prevSelectedCourses.filter(
    //       (selectedCourse) =>
    //         selectedCourse.code !== course.code ||
    //         selectedCourse.name !== course.name
    //     )
    //   );
    // } else {
      setSelectedCourses((prevSelectedCourses) => [
        ...prevSelectedCourses,
        selectedNonOnline,
      ]);
    // }
  };

  const itemsPerPage = 20;
  const [hasMore, setHasMore] = useState(true);
  const [records, setRecords] = useState(itemsPerPage);

  const groupedFilteredCourses = useMemo(() => {
    return groupByCourseCodeAndName(filteredCourses);
  }, [filteredCourses]);

  const { selectedKeysFromSearch, unselectedKeysFromSearch } = useMemo(() => {
    const keys = Object.keys(groupedFilteredCourses);
    const selectedKeysFromSearch = keys.filter((k) => {
      const c = groupedFilteredCourses[k][0];
      return selectedCourses.some(
        (s) => s.code === c.code && s.name === c.name
      );
    });
    const sel = new Set(selectedKeysFromSearch);
    const unselectedKeysFromSearch = keys.filter((k) => !sel.has(k));
    return { selectedKeysFromSearch, unselectedKeysFromSearch };
  }, [groupedFilteredCourses, selectedCourses]);

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
    if (filteredCourses.length < 20) {
      return;
    }

    try {
      const response = await axios.post(API_URLS.GET_COURSES, {
        searchTerm: debouncedSearchTerm,
        itemsPerPage: itemsPerPage,
        startFrom: records,
        term,
        year
      });

      setFilteredCourses((prevCourses) => [...prevCourses, ...response.data]);
      setRecords(records + itemsPerPage);
    } catch (error) {
      // Data load failed silently
    }

    if (records >= 2 * itemsPerPage + filteredCourses.length) {
      setHasMore(false);
    }
  };

  const sendCourseMetrics = async (course: Course) => {
    try {
      await axios.post(
        BACKEND_URLS.COURSE_METRICS,
        { code: course.code, name: course.name },
        { headers: getAuthHeaders(auth) }
      );
    } catch (error) {
      // Metrics send failed silently
    }
  };

  useEffect(() => {
    if (debouncedSearchTerm === "") return;
    const fetchData = async () => {
      try {
        const response = await axios.post(API_URLS.GET_COURSES, {
          searchTerm: debouncedSearchTerm,
          itemsPerPage: itemsPerPage,
          startFrom: 0,
          term,
          year
        });
        if (response.data.length > 0) {
          setNoCoursesFound(false);
          setFilteredCourses(response.data.map((course: Course) => ({
            ...course,
            creditsEditable: course.sections[0].credits === "VAR"
          })));
        }
        else {
          setNoCoursesFound(true);
          setFilteredCourses([]);
        }
      } catch (error) {
        // Data fetch failed silently
      }
    };
    fetchData();
    setOpenCourseCode(null);
  }, [searchTrigger, selectedValue]);

  const handleCreditsChange = (courseCode: string, courseName: string, newCredits: number) => {
    setFilteredCourses((prevCourses) =>
      prevCourses.map((course) => {
        if (course.code === courseCode && course.name === courseName) {
          return {
            ...course,
            sections: course.sections.map((section) => ({
              ...section,
              credits: newCredits,
            })),
          };
        }
        return course;
      })
    );
  };

  const renderGroupedCourse = (key: string, index: number) => {
    const courses = groupedFilteredCourses[key];
    const firstCourse = courses[0];
    const isCourseSelected = selectedCourses.some(
      (selectedCourse) =>
        selectedCourse.code === firstCourse.code &&
        selectedCourse.name === firstCourse.name
    );
    const isCourseAnimated =
      courseAnimation[`${firstCourse.code}|${firstCourse.name}`] || false;
    const isOpen = openCourseCode?.includes(
      `${firstCourse.code}|${firstCourse.name}`
    );
    const currentBatchIndex = index % itemsPerPage;

    return (
      <React.Fragment key={key}>
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
              <div className="flex flex-row text-white items-center justify-evenly w-full h-6 p-1 m-0">
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
                <div className="flex items-center text-sm font-normal text-gray-300 mr-2 h-5 mb-[0.3rem] whitespace-nowrap overflow-hidden text-overflow-ellipsis">
                  Credits:{" "}
                  {(firstCourse.creditsEditable || editingCredits === `${firstCourse.code}|${firstCourse.name}`) ? (
                    editingCredits === `${firstCourse.code}|${firstCourse.name}` ? (
                      <input
                        type="number"
                        min="0"
                        className="credits-input ml-1"
                        style={{
                          backgroundColor: '#292929',
                          color: 'white',
                          outline: 'none',
                          borderBottom: '1px solid #ffffff',
                          width: '3ch',
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          handleCreditsChange(
                            firstCourse.code, firstCourse.name,
                            parseInt(e.target.value, 10)
                          )
                        }
                        onBlur={() => setEditingCredits(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setEditingCredits(null);
                          }
                        }}
                      />
                    ) : (
                      <div className="ml-1 flex items-center">
                        {firstCourse.sections[0].credits}
                        <PiPencilBold
                          className="ml-1 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCredits(`${firstCourse.code}|${firstCourse.name}`);
                          }}
                        />
                      </div>
                    )
                  ) : (
                    firstCourse.sections[0].credits
                  )}
                </div>
                <div className="mx-1 h-9">
                  {isCourseSelected ? (
                    <PiMinusBold
                      className={`${minusIcon}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCourseSelected(firstCourse);
                      }}
                      data-tooltip-id="remove-course-tooltip"
                      data-tooltip-content="Remove all sections"
                    />
                  ) : (
                    <PiPlusBold
                      className={`${plusIcon}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCourseSelected(firstCourse);
                      }}
                      data-tooltip-id="add-course-tooltip"
                      data-tooltip-content="Add all sections"
                    />
                  )}
                </div>
                <div className="mx-1 h-9">
                  {!isCourseSelected && (
                    <PiVideoCameraSlashBold
                      className={`${plusIcon}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleNonOnlineSections(firstCourse);
                      }}
                      data-tooltip-id="non-online-tooltip"
                      data-tooltip-content="Add only in-person sections"
                    />
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
              <div className="text-sm font-normal text-gray-300 mx-1 line-clamp-2 overflow-ellipsis overflow-hidden">
                {firstCourse.name}
              </div>
              <CourseCatalogTagPills
                course={firstCourse}
                className="flex flex-wrap gap-1 mt-1 mx-1"
              />
            </div>
            {isOpen && (
              <div>
                <div className="mt-2 mb-0 mx-1 text-gray-200 space-y-3">
                  <hr
                    style={{
                      border: "1px solid #ffffff",
                      marginBottom: "4px",
                    }}
                  />
                  <div>
                    <strong className="text-gray-100">Description</strong>
                    <p className="mt-1 text-sm font-normal text-gray-300">
                      {firstCourse.description
                        ? firstCourse.description.replace("(P)", "").trim()
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className="h-4 w-0.5 rounded-full bg-[#fa4616] shrink-0"
                        aria-hidden
                      />
                      <strong className="text-gray-100 text-sm">
                        Prerequisites
                      </strong>
                    </div>
                    <PrerequisiteBlock
                      prerequisites={firstCourse.prerequisites}
                      variant="compact"
                    />
                  </div>
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
  };

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
          <>
            {selectedKeysFromSearch.length > 0 && (
              <>
                <div className="mx-1 mb-2 mt-1 flex items-center gap-2">
                  <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ffb38a]/75">
                    In your schedule
                  </span>
                  <span className="h-px min-w-0 flex-1 bg-gray-700" />
                </div>
                {selectedKeysFromSearch.map((key, index) =>
                  renderGroupedCourse(key, index)
                )}
              </>
            )}
            {unselectedKeysFromSearch.length > 0 && (
              <>
                {selectedKeysFromSearch.length > 0 && (
                  <div className="mx-1 mb-2 mt-3 flex items-center gap-2">
                    <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                      More results
                    </span>
                    <span className="h-px min-w-0 flex-1 bg-gray-700" />
                  </div>
                )}
                {unselectedKeysFromSearch.map((key, index) =>
                  renderGroupedCourse(key, index)
                )}
              </>
            )}
          </>
        ) : (
          noCoursesFound && (
            <div className="text-gray-300 fade-text-in">
              No courses found for the selected semester.
            </div>
          )
        )}
      </InfiniteScroll>
      <Tooltip id="non-online-tooltip" place="top" style={{ zIndex: 1000 }} />
      <Tooltip id="add-course-tooltip" place="top" style={{ zIndex: 1000 }} />
      <Tooltip id="remove-course-tooltip" place="top" style={{ zIndex: 1000 }} />
    </div>
  );
};

export default ShowFilteredCourses;
