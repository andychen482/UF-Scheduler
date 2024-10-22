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
  credits: number;
  deptName: string;
  instructors: Instructor[];
  meetTimes: MeetingTime[];
  finalExam: string;
  selected: boolean;
  courseName: string;
  color: string;
  waitList: WaitList;
  courseCode: string;
};

export type WaitList = {
  cap: number;
  isEligible: string;
  total: number;
}

export type Course = {
  code: string;
  name: string;
  termInd: string;
  description: string;
  prerequisites: string;
  sections: Section[];
};

export const websiteURL: string = "https://www.ratemyprofessors.com/professor/";