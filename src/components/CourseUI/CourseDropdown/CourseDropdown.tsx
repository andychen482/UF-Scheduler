import React from "react";
import { Course, Section } from "../CourseTypes";
import { courseUIClasses } from "../CourseUIClasses";
import { AiOutlineStar, AiFillStar } from "react-icons/ai";
import { PiPlusBold, PiMinusBold } from "react-icons/pi";
import { DropdownClasses } from "./DropdownClasses";
import { Icon } from "@mui/material";

interface CourseDropdownProps {
  course: Course;
  selectedCourses: Course[];
  setSelectedCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  filteredCourses: Course[];
}

const CourseDropdown: React.FC<CourseDropdownProps> = ({
  course,
  selectedCourses,
  setSelectedCourses,
  filteredCourses,
}) => {
  const { listItem, content } = courseUIClasses;

  const { icons, minusicons } = DropdownClasses;

  const isCourseSelected = () => {
    return selectedCourses.some((c) => c.code === course.code);
  };

  const isSectionSelected = (section: Section) => {
    const selectedCourse = selectedCourses.find((c) => c.code === course.code);
    if (selectedCourse) {
      const selectedSection = selectedCourse.sections.find(
        (s) => s.number === section.number
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
            if (s.number === section.number) {
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
          if (s.number === section.number) {
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

  const renderSectionInformation = (section: Section) => {
    return (
      <div className="pl-4">
        {/* Star Icon based on section selected status */}

        <div className="text-gray-200">
          <strong>Instructors:</strong>{" "}
          {section.instructors.length > 0 ? (
            section.instructors.map((instructor, index) => (
              <span key={index} className="text-gray-200 dark:text-gray-200">
                {instructor.name}
              </span>
            ))
          ) : (
            <span className="text-gray-200 dark:text-gray-200">N/A</span>
          )}
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
                className={`mt-2 ml-2 text-gray-200 dark:text-gray-200`}
              >
                <strong>{meetingTime.meetDays.join(", ")}: </strong> &nbsp;{" "}
                {meetingTime.meetTimeBegin} - {meetingTime.meetTimeEnd}
              </div>
            ))
          ) : (
            <span className={`${content} text-gray-200 dark:text-gray-200`}>
              N/A
            </span>
          )}
        </div>

        {/* Description */}
        {/* <div className="text-gray-200 dark:text-gray-200">
          <strong>Description:</strong>
          <div className={`${content} text-gray-200 dark:text-gray-500`}>
            {course.description
              ? course.description.replace("(P)", "").trim()
              : "N/A"}
          </div>
        </div> */}

        {/* Render other section details if needed */}
      </div>
    );
  };

  return (
    <div
      className={`bg-[#43464d] dark:bg-gray-800 rounded-lg pl-2 pr-2 pb-2 space-y-2 text-[15px]`}
    >
      <div className="list-none">
        {course.sections.map((section, index) => (
          <li
            key={index}
            className={`${listItem} ${
              index > 0 ? "border-gray-400 dark:border-gray-700" : ""
            }`}
          >
            <div className="flex justify-between items-center">
              <div className="font-bold text-gray-200 dark:text-gray-200 flex items-center">
                <span className="inline-block w-2 h-2 bg-gray-900 rounded-full mr-2"></span>
                Section {section.number}:
              </div>
              {/* Star Icon based on section selected status */}
              {isSectionSelected(section) ? (
                <PiMinusBold
                  className={`${minusicons}`}
                  onClick={() => toggleSectionSelected(section)}
                />
              ) : (
                <PiPlusBold
                  className={`${icons}`}
                  onClick={() => toggleSectionSelected(section)}
                />
              )}
            </div>
            {renderSectionInformation(section)}
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
