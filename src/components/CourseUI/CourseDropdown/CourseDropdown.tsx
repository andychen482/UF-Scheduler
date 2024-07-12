import React from "react";
import { Course, Section, websiteURL } from "../CourseTypes";
import { courseUIClasses } from "../CourseUIClasses";
import { BiSolidLockOpen, BiSolidLockAlt } from "react-icons/bi";
import { DropdownClasses } from "./DropdownClasses";

interface CourseDropdownProps {
  course: Course;
  selectedCourses: Course[];
  setSelectedCourses: React.Dispatch<React.SetStateAction<Course[]>>;
}

const convertTo12HourFormat = (time: string): string => {
  const [hour, minute] = time.split(":");
  const hourNumber = Number(hour);
  const ampm = hourNumber >= 12 ? "PM" : "AM";
  const hour12Format =
    hourNumber > 12 ? hourNumber - 12 : hourNumber === 0 ? 12 : hourNumber;
  return `${hour12Format}:${minute} ${ampm}`;
};

const CourseDropdown: React.FC<CourseDropdownProps> = ({
  course,
  selectedCourses,
  setSelectedCourses,
}) => {
  const { listItem, content } = courseUIClasses;

  const { icons, minusicons } = DropdownClasses;

  const waitListAvailable = (section: Section) => {
    if (section.waitList.total === section.waitList.cap) {
      return section.waitList.total + "/" + section.waitList.cap + " (Full)";
    }
    return section.waitList.total + "/" + section.waitList.cap;
  };

  const isSectionSelected = (section: Section) => {
    const selectedCourse = selectedCourses.find((c) => c.code === course.code);
    if (selectedCourse) {
      const selectedSection = selectedCourse.sections.find(
        (s) => s.classNumber === section.classNumber
      );
      return selectedSection?.selected === true;
    }
    return false;
  };

  const toggleSectionSelected = (section: Section) => {
    let courseExists = false;
    const updatedCourses = selectedCourses.map((c) => {
      if (c.code === course.code) {
        courseExists = true;
        return {
          ...c,
          sections: c.sections.map((s) => {
            if (s.classNumber === section.classNumber) {
              return {
                ...s,
                selected: !s.selected,
              };
            } else {
              // Deselect all other sections
              return {
                ...s,
                selected: false,
              };
            }
          }),
        };
      }
      return c;
    });

    // If the course doesn't exist in selectedCourses, add it
    if (!courseExists) {
      const newCourse = {
        ...course,
        sections: course.sections.map((s) => {
          if (s.classNumber === section.classNumber) {
            return {
              ...s,
              selected: true,
            };
          } else {
            return {
              ...s,
              selected: false,
            };
          }
        }),
      };
      updatedCourses.push(newCourse);
    } else {
      // Check if all sections are not selected
      const selectedCourse = updatedCourses.find((c) => c.code === course.code);
      if (selectedCourse && !selectedCourse.sections.some((s) => s.selected)) {
        // Remove the course from selectedCourses
        return setSelectedCourses((prev) =>
          prev.filter((c) => c.code !== course.code)
        );
      }
    }

    setSelectedCourses(updatedCourses);
  };

  const getRatingColor = (rating: number | null): string => {
    if (rating === null) return "text-gray-200 dark:text-gray-200"; // Default
    if (rating <= 2) return "text-red-400"; // Red
    if (rating < 4) return "text-yellow-400"; // Yellow
    return "text-green-400"; // Green
  };

  const getDifficultyColor = (difficulty: number | null): string => {
    if (difficulty === null) return "text-gray-200 dark:text-gray-200"; // Default
    if (difficulty <= 2) return "text-green-400"; // Red
    if (difficulty < 4) return "text-yellow-400"; // Yellow
    return "text-red-400"; // Green
  };

  const renderSectionInformation = (section: Section) => {
    return (
      <div>
        {/* Star Icon based on section selected status */}

        <div className="text-gray-200">
          {section.instructors.length > 1 ? (
            <strong>Instructors: </strong>
          ) : (
            <strong>Instructor: </strong>
          )}
{section.instructors.map((instructor, index) => (
  <div
    key={index}
    className="text-gray-200 dark:text-gray-200 flex justify-between"
  >
    <div className="instructor-name ml-2 flex-1">
      {instructor.name}
    </div>
    {instructor.avgRating != null && (
      <>
        <div className="instructor-rating flex-1">
          {"Rating: "}
          <a
            className={`font-bold whitespace-nowrap ${getRatingColor(
              instructor.avgRating
            )} underline`}
            href={`${websiteURL}${instructor.professorID}`}
            target="_blank"
          >
            {instructor.avgRating.toFixed(1)}/5
          </a>
        </div>
        <div className="instructor-difficulty flex-1">
          {"Difficulty: "}
          <a
            className={`font-bold whitespace-nowrap ${getDifficultyColor(
              instructor.avgDifficulty
            )} underline`}
            href={`${websiteURL}${instructor.professorID}`}
            target="_blank"
          >
            {instructor.avgDifficulty.toFixed(1)}/5
          </a>
        </div>
      </>
    )}
  </div>
))}

        </div>

        {/* Meeting Times */}
        <div className="text-gray-200 dark:text-gray-200">
          <strong>Meeting Times:</strong>{" "}
          {section.meetTimes.length > 0 ? (
            section.meetTimes.map((meetingTime) => (
              <div
                key={
                  meetingTime.meetDays +
                  meetingTime.meetTimeBegin +
                  meetingTime.meetTimeEnd
                }
                className={`ml-2 text-gray-200 dark:text-gray-200`}
              >
                <strong>{meetingTime.meetDays.join(", ")}: </strong> &nbsp;{" "}
                {convertTo12HourFormat(meetingTime.meetTimeBegin)} -{" "}
                {convertTo12HourFormat(meetingTime.meetTimeEnd)} @{" "}
                {meetingTime.meetBuilding} {meetingTime.meetRoom}
              </div>
            ))
          ) : (
            <span className={`${content} text-gray-200 dark:text-gray-200`}>
              N/A
            </span>
          )}
        </div>

        {/* Render other section details if needed */}
      </div>
    );
  };

  return (
    <div
      className={`bg-[#43464d] dark:bg-gray-800 rounded-lg space-y-2 text-[15px]`}
    >
      <div className="list-none">
        {course.sections
          .sort((a, b) => a.waitList.total - b.waitList.total)
          .map((section, index) => (
            <li
              key={index}
              className="my-2 rounded-sm bg-gray-800 border-gray-400 dark:border-gray-700"
            >
              <div className="space-y-2 p-2">
                <div className="flex justify-between items-center">
                  <div className="font-bold text-gray-200 dark:text-gray-200 flex items-center">
                    Class # {section.classNumber} -{" "}
                    {!section.waitList.total && section.waitList.cap > 0 ? (
                      <span className="text-green-400 ml-1">Open Seats</span>
                    ) : !section.waitList.total && !section.waitList.cap ? (
                      <span className="text-red-400 ml-1">Seats Unknown</span>
                    ) : (
                      section.waitList.total &&
                      section.waitList.cap && (
                        <span className="text-blue-400 ml-1">
                          Wait List: {waitListAvailable(section)}
                        </span>
                      )
                    )}
                  </div>
                  {/* Star Icon based on section selected status */}
                  {isSectionSelected(section) ? (
                    <BiSolidLockAlt
                      className={`${minusicons}`}
                      onClick={() => toggleSectionSelected(section)}
                    />
                  ) : (
                    <BiSolidLockOpen
                      className={`${icons}`}
                      onClick={() => toggleSectionSelected(section)}
                    />
                  )}
                </div>
                {renderSectionInformation(section)}
              </div>
            </li>
          ))}
        {course.sections.length === 0 && (
          <div
            className={`${listItem} ${content} text-gray-200 dark:text-gray-200`}
          >
            No sections found.
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseDropdown;
