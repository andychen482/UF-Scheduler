import React from "react";
import { Course, Section } from "../CourseTypes";
import { courseUIClasses } from "../CourseUIClasses";

interface CourseDropdownProps {
  course: Course;
};

const CourseDropdown: React.FC<CourseDropdownProps> = ({ course }) => {
  const { listItem, content } = courseUIClasses;

  const renderSectionInformation = (section: Section) => {
    return (
      <>
        {/* Department */}
        {/* <div>
          <strong>Department:</strong>{" "}
          {section.deptName || "N/A"}
        </div> */}

        {/* Instructors */}
        <div className="text-gray-200">
          <strong>Instructors:</strong>{" "}
          {section.instructors.length > 0 ? (
            section.instructors.map((instructor, index) => (
              <span
                key={index}
                className="text-gray-200 dark:text-gray-200" // Add the class to change the color of names
              >
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
                className={`${content} text-gray-200 dark:text-gray-200`}
              >
                <strong>{meetingTime.meetDays.join(", ")}: </strong> &nbsp; {meetingTime.meetTimeBegin} -{" "}
                {meetingTime.meetTimeEnd}
              </div>
            ))
          ) : (
            <span className={`${content} text-gray-200 dark:text-gray-200`}>
              N/A
            </span>
          )}
        </div>

        {/* Description */}
        <div className="text-gray-200 dark:text-gray-200">
          <strong>Description:</strong>
          <div className={`${content} text-gray-200 dark:text-gray-500`}>
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
    <div className={`bg-[#43464d] dark:bg-gray-800 rounded-lg p-4 space-y-2 text-[15px]`}>
      <div className="list-none">
        {course.sections.map((section, index) => (
          <li
            key={index}
            className={`${listItem} border-t border-gray-400 dark:border-gray-700`}
          >
            <div className="font-bold text-gray-200 dark:text-gray-200">
              Section {section.number}:
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
