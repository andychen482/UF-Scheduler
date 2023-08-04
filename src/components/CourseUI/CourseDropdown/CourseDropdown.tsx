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
        <div className="text-gray-900">
          <strong>Instructors:</strong>{" "}
          {section.instructors.length > 0 ? (
            section.instructors.map((instructor) => (
              <span
                className="text-gray-900 dark:text-white" // Add the class to change the color of names
              >
                {instructor.name}
              </span>
            ))
          ) : (
            <span className="text-gray-900 dark:text-white">N/A</span>
          )}
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
    <div className={`bg-gray-500 dark:bg-gray-800 rounded-lg p-4 space-y-2`}>
      <div className="list-none">
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
      </div>
    </div>
  );
};

export default CourseDropdown;
