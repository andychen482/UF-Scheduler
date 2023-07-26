import React, { useState, useEffect } from "react";
import { useMediaQuery } from "react-responsive";
import { Course } from "../CourseTypes";
import { courseUIClasses } from "../CourseUIClasses";

export type CourseCardProps = {
  course: Course;
};

const CourseCard: React.FC<CourseCardProps> = ({ course }) => {
  const [termExists, setTermExists] = useState(false);
  const [meetTimeExists, setMeetTimeExists] = useState(false);
  const [finalExamExists, setFinalExamExists] = useState(false);

  const isMobile = useMediaQuery({ maxWidth: 640 });

  useEffect(() => {
    const doesTermExist = course.termInd !== " ";
    setTermExists(doesTermExist);

    const doesMeetTimeExist = course.sections.some(
      (section) => section.meetTimes && section.meetTimes.length > 0
    );
    setMeetTimeExists(doesMeetTimeExist);

    const doesFinalExamExist = course.sections.some(
      (section) => section.finalExam && section.finalExam.length > 0
    );
    setFinalExamExists(doesFinalExamExist);
  }, [course]);

  const {
    card,
    title,
    subtitle,
    list,
    listItem,
    content,
    contentML2,
  } = courseUIClasses;

  return (
    <div className={`${card} ${isMobile ? "p-4 m-2" : "p-6 m-4"}`}>
      <h3 className={`${title} ${isMobile ? "text-lg" : "text-2xl"}`}>
        {course.code} - {course.name}
      </h3>
      {termExists && (
        <p className={subtitle}>
          <strong>Term:</strong> {course.termInd}
        </p>
      )}
      <p>
        <strong>Description:</strong> {course.description}
      </p>
      <p>
        <strong>Prerequisites:</strong> {course.prerequisites}
      </p>
      <strong>Sections:</strong>
      <ul className={list}>
        {course.sections.map((section, index) => (
          <li key={index} className={listItem}>
            <div className={content}>
              <strong>Section {section.number}:</strong> {section.display} (
              {section.credits} credits)
              <br />
              <div className={contentML2}>
                <strong>Department:</strong> {section.deptName}
                <br />
                <strong>Instructors:</strong>{" "}
                {section.instructors
                  .map((instructor) => instructor.name)
                  .join(", ")}
                <br />
                <strong>Meeting Times:</strong>
                {meetTimeExists ? "" : " N/A"}
                <ul
                  className={`${isMobile ? "ml-0" : "ml-4"}`}
                >
                  {meetTimeExists &&
                    section.meetTimes.map((meetTime, index) => (
                      <li key={index} className={listItem}>
                        Days: {meetTime.meetDays.join(", ")}
                        <br />
                        Time: {meetTime.meetTimeBegin} - {meetTime.meetTimeEnd}
                        <br />
                        Building: {meetTime.meetBuilding}
                        <br />
                        Room: {meetTime.meetRoom}
                      </li>
                    ))}
                </ul>
                <strong>Final Exam:</strong>{" "}
                {finalExamExists ? section.finalExam : "N/A"}
              </div>
            </div>
            <br />
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CourseCard;
