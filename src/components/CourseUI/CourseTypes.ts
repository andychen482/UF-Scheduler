export type Instructor = {
  name: string;
  avgRating: number;
  avgDifficulty: number;
  professorID: number;
};

export type MeetingTime = {
  meetDays: string[];
  meetTimeBegin: string;
  meetTimeEnd: string;
  meetBuilding: string;
  meetBldgCode: string;
  meetRoom: string | number;
};

export type Section = {
  classNumber: string;
  display: string;
  credits: number | "VAR"; // Allow credits to be a number or "VAR"
  deptName: string;
  instructors: Instructor[];
  meetTimes: MeetingTime[];
  finalExam: string;
  selected: boolean;
  courseName: string;
  color: string;
  waitList: WaitList;
  courseCode: string;
  startDate: string;
  endDate: string;
  firstDay?: string; // Added for ICS calendar generation with MM/DD/YYYY format
  lastDay?: string; // Added for ICS calendar generation with MM/DD/YYYY format
};

export type WaitList = {
  cap: number;
  isEligible: string;
  total: number;
};

export type Course = {
  code: string;
  name: string;
  termInd: string;
  description: string;
  prerequisites: string;
  sections: Section[];
  inPerson: boolean;
  creditsEditable: boolean;
  /** When true, course stays in the list but is omitted from schedule combinations and the graph. */
  excludedFromSchedule?: boolean;
};

export const websiteURL: string = "https://www.ratemyprofessors.com/professor/";
