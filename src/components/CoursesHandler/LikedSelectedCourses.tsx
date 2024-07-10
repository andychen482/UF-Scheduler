import React from "react";
import { Course, Section } from "../CourseUI/CourseTypes";
import ColorHash from "color-hash";
import "./LikedSelectedStyles.css";

interface LikedSelectedCoursesProps {
  selectedCourses: Course[];
  setSelectedCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  setLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  windowWidth: number;
  customAppointments: any[];
  setCustomAppointments: React.Dispatch<React.SetStateAction<any[]>>;
}

const colorHash = new ColorHash({
  saturation: [0.6, 0.61, 0.62, 0.63, 0.64, 0.65, 0.66, 0.67, 0.68, 0.69, 0.7],
  lightness: [0.4, 0.5, 0.6],
});

const getHashedColor = (course: Course) => {
  return colorHash.hex(course.code + course.name);
};

// Function to get the contrast color of the text based on the background color hex
function getContrastYIQ(hexcolor: string){
  var r = parseInt(hexcolor.substring(1,3),16);
  var g = parseInt(hexcolor.substring(3,5),16);
  var b = parseInt(hexcolor.substring(5,7),16);
  var yiq = ((r*299)+(g*587)+(b*114))/1000;
  return (yiq >= 128) ? 'black' : 'white';
}

const getSelectedSection = (course: Course): Section | undefined => {
  return course.sections.find((section: Section) => section.selected === true);
};

const LikedSelectedCourses: React.FC<LikedSelectedCoursesProps> = ({
  selectedCourses,
  setSelectedCourses,
  setLoaded,
  windowWidth,
  customAppointments,
  setCustomAppointments,
}) => {
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
    setSelectedCourses((prevSelectedCourses) =>
      prevSelectedCourses.filter(
        (selectedCourse) =>
          selectedCourse.code !== course.code ||
          selectedCourse.name !== course.name
      )
    );
    setLoaded(true);
  };

  const handleAppointmentBadgeClick = (section: any) => {
    setCustomAppointments((prevAppointments) =>
      prevAppointments.filter(
        (selectedAppointment) => !(selectedAppointment === section)
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

  return (
    <>
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
                  return (
                    <div
                      id="badge"
                      key={index}
                      className={`flex-1 p-[0.6rem] rounded-md mb-2 text-${getContrastYIQ(getHashedColor(course))} dark:text-white cursor-pointer w-full h-full overflow-hidden`}
                      style={getCourseBackgroundColor(course)}
                      onClick={() => handleBadgeClick(course)}
                    >
                      {/* Display course code, credits, and class number */}
                      <div className="flex justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between">
                            {course.termInd !== " " &&
                            course.termInd !== "C" ? (
                              <strong className="block truncate">
                                {course.code.replace(/([A-Z]+)/g, "$1 ")} -{" "}
                                {course.termInd}
                              </strong>
                            ) : (
                              <strong className="block truncate">
                                {course.code.replace(/([A-Z]+)/g, "$1 ")}
                              </strong>
                            )}
                            <span className="mt-[0.12rem] font-bold text-sm">
                              {course.sections[0].credits}
                            </span>
                          </div>
                          <div className="text-sm text-ellipsis">
                            {course.name}{" "}
                                {selectedSection
                                  ? `| Class # ${selectedSection.classNumber}`
                                  : ""}
                          </div>
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
                    className={`flex-1 p-[0.6rem] rounded-md mb-2 text-${getContrastYIQ(appointment.color)} dark:text-white cursor-pointer w-full h-full overflow-hidden`}
                    style={{ backgroundColor: appointment.color }}
                    onClick={() => handleAppointmentBadgeClick(appointment)}
                  >
                    {/* Display course code and credits */}
                    <div className="flex justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between">
                          <strong className="block truncate">
                            {appointment.courseName}
                          </strong>
                          <div>
                            <strong className="block truncate text-sm mt-[0.12rem]">
                              {appointment.meetTimes
                                .map((meetTime: any) => meetTime.meetDays)
                                .join(", ")}
                            </strong>
                          </div>
                        </div>
                        <div className="text-sm">
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
