import React, { useEffect, useState } from "react";
import { Course, Section, websiteURL } from "../CourseUI/CourseTypes";
import ColorHash from "color-hash";
import { PiTrashBold, PiEyeBold, PiEyeSlashBold } from "react-icons/pi";
import { IoClose } from "react-icons/io5";
import "./LikedSelectedStyles.css";
import PrerequisiteBlock from "components/CourseUI/PrerequisiteBlock";
import CourseCatalogTagPills from "components/CourseUI/CourseCatalogTagPills";

interface LikedSelectedCoursesProps {
  selectedCourses: Course[];
  setSelectedCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  setLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  windowWidth: number;
  customAppointments: any[];
  setCustomAppointments: React.Dispatch<React.SetStateAction<any[]>>;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  setDebouncedSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  searchTrigger: boolean;
  setSearchTrigger: React.Dispatch<React.SetStateAction<boolean>>;
}

const colorHash = new ColorHash({
  saturation: [0.6, 0.61, 0.62, 0.63, 0.64, 0.65, 0.66, 0.67, 0.68, 0.69, 0.7],
  lightness: [0.4, 0.5, 0.6],
});

const getHashedColor = (course: Course) => {
  return colorHash.hex(course.code + course.name);
};

// Function to get the contrast color of the text based on the background color hex
function getContrastYIQ(hexcolor: string) {
  var r = parseInt(hexcolor.substring(1, 3), 16);
  var g = parseInt(hexcolor.substring(3, 5), 16);
  var b = parseInt(hexcolor.substring(5, 7), 16);
  var yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "black" : "white";
}

const getSelectedSection = (course: Course): Section | undefined => {
  return course.sections.find((section: Section) => section.selected === true);
};

const convertTo12HourFormat = (time: string): string => {
  const [hour, minute] = time.split(":");
  const hourNumber = Number(hour);
  const ampm = hourNumber >= 12 ? "PM" : "AM";
  const hour12Format =
    hourNumber > 12 ? hourNumber - 12 : hourNumber === 0 ? 12 : hourNumber;
  return `${hour12Format}:${minute} ${ampm}`;
};

const getRatingColor = (rating: number | null): string => {
  if (rating === null) return "text-gray-200";
  if (rating <= 2) return "text-red-400";
  if (rating < 4) return "text-yellow-400";
  return "text-green-400";
};

const getDifficultyColor = (difficulty: number | null): string => {
  if (difficulty === null) return "text-gray-200";
  if (difficulty <= 2) return "text-green-400";
  if (difficulty < 4) return "text-yellow-400";
  return "text-red-400";
};

const waitListAvailable = (section: Section) => {
  if (section.waitList.total === section.waitList.cap) {
    return section.waitList.total + "/" + section.waitList.cap + " (Full)";
  }
  return section.waitList.total + "/" + section.waitList.cap;
};

const LikedSelectedCourses: React.FC<LikedSelectedCoursesProps> = ({
  selectedCourses,
  setSelectedCourses,
  setLoaded,
  windowWidth: _windowWidth,
  customAppointments,
  setCustomAppointments,
  setSearchTerm,
  setDebouncedSearchTerm,
  searchTrigger,
  setSearchTrigger,
}) => {
  const [detailCourse, setDetailCourse] = useState<Course | null>(null);

  useEffect(() => {
    if (!detailCourse) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDetailCourse(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detailCourse]);

  const getCourseBackgroundColor = (course: Course) => {
    const hashedColor = getHashedColor(course);
    course.sections.map((section: Section) => {
      section.color = hashedColor;
    });
    return {
      backgroundColor: hashedColor,
    };
  };

  const handleBadgeClick = (course: Course) => {
    setDetailCourse(course);
  };

  const handleSearchThisCourse = () => {
    if (!detailCourse) return;
    const searchQuery = detailCourse.code;
    setSearchTerm(searchQuery);
    setDebouncedSearchTerm(searchQuery);
    setSearchTrigger(!searchTrigger);
    setDetailCourse(null);
  };

  const toggleExcludedFromSchedule = (e: React.MouseEvent, course: Course) => {
    e.stopPropagation();
    setSelectedCourses((prev) =>
      prev.map((c) =>
        c.code === course.code && c.name === course.name
          ? { ...c, excludedFromSchedule: !c.excludedFromSchedule }
          : c
      )
    );
    setLoaded(true);
    setDetailCourse((current) => {
      if (
        current &&
        current.code === course.code &&
        current.name === course.name
      ) {
        return {
          ...current,
          excludedFromSchedule: !current.excludedFromSchedule,
        };
      }
      return current;
    });
  };

  const handleRemoveCourse = (e: React.MouseEvent, course: Course) => {
    e.stopPropagation();
    setSelectedCourses((prevSelectedCourses) =>
      prevSelectedCourses.filter(
        (selectedCourse) =>
          selectedCourse.code !== course.code ||
          selectedCourse.name !== course.name
      )
    );
    setLoaded(true);
    setDetailCourse((c) =>
      c && c.code === course.code && c.name === course.name ? null : c
    );
  };

  const handleAppointmentBadgeClick = (appointment: any) => {
    // For appointments, we'll keep the current behavior of showing details (do nothing for now)
    // Or you could populate search if needed
  };

  const handleRemoveAppointment = (e: React.MouseEvent, appointment: any) => {
    e.stopPropagation();
    setCustomAppointments((prevAppointments) =>
      prevAppointments.filter(
        (selectedAppointment) => !(selectedAppointment === appointment)
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

  const appointmentChunkArray = (array: any[], chunkSize: number) => {
    const chunkedArray = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunkedArray.push(array.slice(i, i + chunkSize));
    }
    return chunkedArray;
  };

  const selectedCoursesChunks = chunkArray(selectedCourses, 1);
  const appointmentChunks = appointmentChunkArray(customAppointments, 1);

  const renderCourseDetailModal = () => {
    if (!detailCourse) return null;
    const c = detailCourse;
    const desc = c.description
      ? c.description.replace("(P)", "").trim()
      : "N/A";

    const searchThisCode = (code: string) => {
      setSearchTerm(code);
      setDebouncedSearchTerm(code);
      setSearchTrigger(!searchTrigger);
      setDetailCourse(null);
    };

    return (
      <div
        className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="course-detail-title"
      >
        <button
          type="button"
          className="absolute inset-0 bg-black/70 cursor-default border-0 w-full h-full"
          onClick={() => setDetailCourse(null)}
          aria-label="Close dialog"
        />
        <div
          className="relative z-[2001] w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl bg-[#1a1a1a] border border-gray-600 shadow-2xl text-left"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 flex items-start justify-between gap-3 px-4 py-3 border-b border-gray-600 bg-[#1a1a1a] z-10">
            <div className="min-w-0 flex-1">
              <h2
                id="course-detail-title"
                className="text-lg font-bold text-white leading-tight"
              >
                {c.code.replace(/([A-Z]+)/g, "$1 ")}
                {c.termInd !== " " && c.termInd !== "C"
                  ? ` — ${c.termInd}`
                  : ""}
              </h2>
              <p className="text-sm text-gray-300 mt-1">{c.name}</p>
            </div>
            <button
              type="button"
              onClick={() => setDetailCourse(null)}
              className="shrink-0 p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <IoClose size={22} />
            </button>
          </div>

          <div className="px-4 py-3 space-y-4 text-[14px] text-gray-200">
            <div>
              <strong className="text-white">Description</strong>
              <p className="mt-1 whitespace-pre-wrap">{desc}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="h-5 w-1 rounded-full bg-[#fa4616] shrink-0"
                  aria-hidden
                />
                <strong className="text-white text-[15px] font-semibold">
                  Prerequisites
                </strong>
              </div>
              <PrerequisiteBlock
                prerequisites={c.prerequisites}
                variant="modal"
                onCourseCodeClick={searchThisCode}
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={handleSearchThisCourse}
                className="text-sm px-3 py-1.5 rounded-md bg-[#292929] border border-gray-500 text-gray-100 hover:bg-[#333] transition-colors"
              >
                Find in course search
              </button>
              <button
                type="button"
                onClick={(e) => toggleExcludedFromSchedule(e, c)}
                className="text-sm px-3 py-1.5 rounded-md bg-[#292929] border border-gray-500 text-gray-100 hover:bg-[#333] transition-colors inline-flex items-center gap-2"
              >
                {c.excludedFromSchedule ? (
                  <>
                    <PiEyeSlashBold size={16} aria-hidden />
                    Include in schedules
                  </>
                ) : (
                  <>
                    <PiEyeBold size={16} aria-hidden />
                    Hide from schedules
                  </>
                )}
              </button>
            </div>

            <div>
              <strong className="text-white block mb-2">Sections</strong>
              <div className="space-y-3">
                {[...c.sections]
                  .sort((a, b) => a.waitList.total - b.waitList.total)
                  .map((section, idx) => (
                    <div
                      key={section.classNumber + String(idx)}
                      className="rounded-md bg-[#212121] border border-gray-600 p-3 space-y-2"
                    >
                      <div className="font-semibold text-gray-100 flex flex-wrap gap-x-2 gap-y-1 items-baseline">
                        <span>Class #{section.classNumber}</span>
                        {!section.waitList.total && section.waitList.cap > 0 ? (
                          <span className="text-green-400 text-sm">
                            Open Seats
                          </span>
                        ) : !section.waitList.total && !section.waitList.cap ? (
                          <span className="text-red-400 text-sm">
                            Seats Unknown
                          </span>
                        ) : section.waitList.total && section.waitList.cap ? (
                          <span className="text-blue-400 text-sm">
                            Wait list: {waitListAvailable(section)}
                          </span>
                        ) : null}
                      </div>

                      <div>
                        {section.instructors.length > 1 ? (
                          <strong>Instructors</strong>
                        ) : (
                          <strong>Instructor</strong>
                        )}
                        {section.instructors.map((instructor, i) => (
                          <div
                            key={i}
                            className="mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:justify-between gap-1 text-sm"
                          >
                            <span className="text-gray-200">{instructor.name}</span>
                            {instructor.avgRating != null && (
                              <span className="flex flex-wrap gap-x-3 gap-y-0">
                                <span>
                                  Rating:{" "}
                                  <a
                                    className={`font-semibold ${getRatingColor(
                                      instructor.avgRating
                                    )} underline`}
                                    href={`${websiteURL}${instructor.professorID}`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    {instructor.avgRating.toFixed(1)}/5
                                  </a>
                                </span>
                                <span>
                                  Difficulty:{" "}
                                  <a
                                    className={`font-semibold ${getDifficultyColor(
                                      instructor.avgDifficulty
                                    )} underline`}
                                    href={`${websiteURL}${instructor.professorID}`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    {instructor.avgDifficulty.toFixed(1)}/5
                                  </a>
                                </span>
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="text-sm">
                        <strong>Meeting times</strong>
                        {section.meetTimes.length > 0 ? (
                          section.meetTimes.map((meetingTime) => (
                            <div
                              key={
                                meetingTime.meetDays +
                                meetingTime.meetTimeBegin +
                                meetingTime.meetTimeEnd
                              }
                              className="ml-0 sm:ml-2 mt-1"
                            >
                              <strong>
                                {meetingTime.meetDays.join(", ")}:{" "}
                              </strong>
                              {convertTo12HourFormat(
                                meetingTime.meetTimeBegin
                              )}{" "}
                              –{" "}
                              {convertTo12HourFormat(meetingTime.meetTimeEnd)} @{" "}
                              {meetingTime.meetBuilding} {meetingTime.meetRoom}
                            </div>
                          ))
                        ) : (
                          <span className="text-gray-400"> N/A</span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
              {c.sections.length === 0 && (
                <p className="text-gray-400">No sections loaded.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {renderCourseDetailModal()}
      <div className="mt-4 space-y-2 w-full flex flex-col">
        <div>
          <div className="text-white font-bold w-full flex justify-center items-center">
            Courses
          </div>
          <hr className="mx-1" />
        </div>

        {selectedCoursesChunks.length > 0 ? (
          selectedCoursesChunks.map(
            (courseChunk: Course[], chunkIndex: number) => (
              <div key={chunkIndex} className="flex mx-3">
                {courseChunk.map((course: Course, index: number) => {
                  const selectedSection = getSelectedSection(course);
                  const excluded = !!course.excludedFromSchedule;
                  return (
                    <div
                      id="badge"
                      key={index}
                      className={`flex-1 p-[0.6rem] rounded-md mb-2 text-${getContrastYIQ(
                        getHashedColor(course)
                      )} cursor-pointer w-full h-full overflow-hidden fade-in relative transition-opacity ${
                        excluded ? "opacity-50 ring-1 ring-white/35" : ""
                      }`}
                      style={getCourseBackgroundColor(course)}
                      onClick={() => handleBadgeClick(course)}
                    >
                      <div className="relative min-h-0 pr-[2.75rem]">
                        <div className="min-w-0">
                          <div className="flex justify-between gap-2">
                            {course.termInd !== " " &&
                            course.termInd !== "C" ? (
                              <strong className="block truncate min-w-0">
                                {course.code.replace(/([A-Z]+)/g, "$1 ")} -{" "}
                                {course.termInd}
                              </strong>
                            ) : (
                              <strong className="block truncate min-w-0">
                                {course.code.replace(/([A-Z]+)/g, "$1 ")}
                              </strong>
                            )}
                            <span className="mt-[0.12rem] font-bold text-sm shrink-0">
                              {course.sections[0].credits}
                            </span>
                          </div>
                          <div className="text-sm break-words">
                            {course.name}{" "}
                            {course.inPerson ? "(in-person)" : ""}
                            {selectedSection
                              ? `| Class # ${selectedSection.classNumber}`
                              : ""}
                          </div>
                          <CourseCatalogTagPills
                            course={course}
                            className="flex flex-wrap gap-1 mt-1"
                          />
                          {excluded && (
                            <div className="text-xs mt-0.5 opacity-90">
                              Hidden from schedules
                            </div>
                          )}
                        </div>
                        <div className="absolute right-0 top-0 flex flex-col gap-1 items-center">
                          <button
                            type="button"
                            onClick={(e) =>
                              toggleExcludedFromSchedule(e, course)
                            }
                            className="p-1 rounded hover:bg-black/20 transition-colors"
                            style={{
                              color: getContrastYIQ(getHashedColor(course)),
                            }}
                            title={
                              excluded
                                ? "Hidden from schedules — click to include"
                                : "Included in schedules — click to hide"
                            }
                            aria-pressed={!excluded}
                            aria-label={
                              excluded
                                ? "Include course in schedule combinations"
                                : "Exclude course from schedule combinations"
                            }
                          >
                            {excluded ? (
                              <PiEyeSlashBold size={15} />
                            ) : (
                              <PiEyeBold size={15} />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleRemoveCourse(e, course)}
                            className="course-badge-delete-btn p-1.5 rounded-full border-2 border-white/90 bg-black/40 text-white shadow-[0_1px_4px_rgba(0,0,0,0.85)] hover:bg-black/55 hover:border-white transition-opacity"
                            aria-label="Remove course"
                          >
                            <PiTrashBold
                              size={14}
                              className="drop-shadow-[0_0_1px_rgba(0,0,0,0.9)]"
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )
        ) : (
          <div className="text-white font-bold w-full flex justify-center items-center">
            No courses
          </div>
        )}

        <div>
          <div className="text-white font-bold w-full flex justify-center items-center text-center">
            Recurring Events
          </div>
          <hr className="mx-1" />
        </div>

        {appointmentChunks.length > 0 ? (
          appointmentChunks.map(
            (appointmentChunk: any[], chunkIndex: number) => (
              <div key={chunkIndex} className="flex mx-3">
                {appointmentChunk.map((appointment: any, index: number) => (
                  <div
                    id="badge"
                    key={index}
                    className={`flex-1 p-[0.6rem] rounded-md mb-2 text-${getContrastYIQ(
                      appointment.color
                    )} cursor-pointer w-full h-full overflow-hidden fade-in relative`}
                    style={{ backgroundColor: appointment.color }}
                    onClick={() => handleAppointmentBadgeClick(appointment)}
                  >
                    <div className="relative min-h-0 pr-[2.75rem]">
                      <div className="min-w-0">
                        <div className="flex justify-between gap-2">
                          <strong className="block truncate min-w-0">
                            {appointment.courseName}
                          </strong>
                          <strong className="block truncate text-sm mt-[0.12rem] shrink-0">
                            {appointment.meetTimes
                              .map((meetTime: any) => meetTime.meetDays)
                              .join(", ")}
                          </strong>
                        </div>
                        <div className="text-sm break-words">
                          {appointment.meetTimes[0].meetTimeBegin.replace(
                            /^0/,
                            ""
                          )}{" "}
                          -{" "}
                          {appointment.meetTimes[0].meetTimeEnd.replace(
                            /^0/,
                            ""
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) =>
                          handleRemoveAppointment(e, appointment)
                        }
                        className="course-badge-delete-btn absolute right-0 top-1/2 -translate-y-1/2 p-1.5 rounded-full border-2 border-white/90 bg-black/40 text-white shadow-[0_1px_4px_rgba(0,0,0,0.85)] hover:bg-black/55 hover:border-white transition-opacity"
                        aria-label="Remove appointment"
                      >
                        <PiTrashBold
                          size={14}
                          className="drop-shadow-[0_0_1px_rgba(0,0,0,0.9)]"
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )
        ) : (
          <div className="text-white font-bold w-full flex justify-center items-center">
            No events
          </div>
        )}
      </div>
    </>
  );
};
export default LikedSelectedCourses;
