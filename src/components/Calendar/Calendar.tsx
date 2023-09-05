import { render } from "@testing-library/react";
import { Course, Section } from "../CourseUI/CourseTypes";
import "./CalendarStyle.css";

interface CalendarProps {
  selectedCourses: Course[];
}

const Calendar: React.FC<CalendarProps> = ({ selectedCourses }) => {
  return (
    <div className="calendar-container">
      <div className="centered-text text-2xl text-white">WIP</div>
      {selectedCourses.map((course) => {
        return (
          <div key={course.code} className="list-none text-gray-200 font-bold">
            <div className="course-name">{course.name}</div>
            {course.sections.map((section, index) => (
              <div key={index}>
                <div className="ml-4 font-semibold text-gray-200 dark:text-gray-200">
                  Section {section.number}:
                </div>
                {section.meetTimes.map((meetingTime) => (
                  <div
                    key={
                      meetingTime.meetDays +
                      meetingTime.meetTimeBegin +
                      meetingTime.meetTimeEnd
                    }
                    className={`ml-8 font-normal text-gray-200 dark:text-gray-200`}
                  >
                    {meetingTime.meetDays.join(", ")}: &nbsp;{" "}
                    {meetingTime.meetTimeBegin} - {meetingTime.meetTimeEnd}
                  </div>
                ))}
              </div>
            ))}
            {course.sections.length === 0 && (
              <div className={`text-gray-200 dark:text-gray-200`}>
                No sections found.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default Calendar;
