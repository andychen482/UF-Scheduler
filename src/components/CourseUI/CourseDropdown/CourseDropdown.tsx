import React from "react";
import { Course, Section } from "../CourseTypes";
import { courseUIClasses } from "../CourseUIClasses";

interface CourseDropdownProps {
  course: Course;
};

const CourseDropdown: React.FC<CourseDropdownProps> = ({ course }) => {
  const { listItem, content, term } = courseUIClasses;

  const renderSectionInformation = (section: Section) => {
    return (
      <>
        {/* Department */}
        {/* <div>
          <strong>Department:</strong>{" "}
          {section.deptName || "N/A"}
        </div> */}

        {/* Instructors */}
        <div className="text-gray-900 dark:text-white">
          <strong>Instructors:</strong>{" "}
          {section.instructors.length > 0
            ? section.instructors
                .map((instructor) => instructor.name)
                .join(", ")
            : "N/A"}
        </div>

        {/* Meeting Times */}
        <div className="text-gray-900 dark:text-white">
          <strong>Meeting Times:</strong>{" "}
          {section.meetTimes.length > 0 ? (
            section.meetTimes.map((meetingTime) => (
              <div
                key={
                  meetingTime.meetDays +
                  meetingTime.meetTimeBegin +
                  meetingTime.meetTimeEnd
                }
                className={`${content} text-gray-900 dark:text-white`}
              >
                {meetingTime.meetDays.join(", ")}: {meetingTime.meetTimeBegin} -{" "}
                {meetingTime.meetTimeEnd}
              </div>
            ))
          ) : (
            <span className={`${content} text-gray-900 dark:text-white`}>
              N/A
            </span>
          )}
        </div>

        {/* Description */}
        <div className="text-gray-900 dark:text-white">
          <strong>Description:</strong>
          <div className={`${content} text-gray-900 dark:text-white`}>
            {course.description
              ? course.description.replace("(P)", "").trim()
              : "N/A"}
          </div>
        </div>

        {/* Render other section details if needed */}
      </>
    );
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg p-4 space-y-2`}>
      <div
        className={`${listItem} font-semibold text-gray-800 dark:text-gray-200 mb-1`}
      >
        <strong>Term:</strong>{" "}
        <span className={term}>{course.termInd || "N/A"}</span>
      </div>
      <ul className="list-none pl-0">
        {course.sections.map((section, index) => (
          <li
            key={index}
            className={`${listItem} border-t border-gray-400 dark:border-gray-700`}
          >
            <div className="font-bold text-gray-900 dark:text-white">
              Section {section.number}:
            </div>
            {renderSectionInformation(section)}
          </li>
        ))}
        {course.sections.length === 0 && (
          <div
            className={`${listItem} ${content} text-gray-900 dark:text-white`}
          >
            No sections found.
          </div>
        )}
      </ul>
    </div>
  );
};

export default CourseDropdown;
