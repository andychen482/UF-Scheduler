export type Instructor = {
  name: string;
};

export type MeetingTime = {
  meetDays: string[];
  meetTimeBegin: string;
  meetTimeEnd: string;
  meetBuilding: string;
  meetRoom: string | number;
};

export type Section = {
  number: string;
  display: string;
  credits: number;
  deptName: string;
  instructors: Instructor[];
  meetTimes: MeetingTime[];
  // openSeats: number;
  finalExam: string;
};

export type Course = {
  code: string;
  // id: string;
  name: string;
  termInd: string;
  description: string;
  prerequisites: string;
  sections: Section[];
};

