import type { MeetingTime, Section } from "../CourseUI/CourseTypes";

function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

/** True if two meeting blocks share a day and their clock ranges overlap. */
function meetingTimesOverlap(a: MeetingTime, b: MeetingTime): boolean {
  for (const day of a.meetDays) {
    if (!b.meetDays.includes(day)) continue;
    const a1 = timeToMinutes(a.meetTimeBegin);
    const a2 = timeToMinutes(a.meetTimeEnd);
    const b1 = timeToMinutes(b.meetTimeBegin);
    const b2 = timeToMinutes(b.meetTimeEnd);
    if (a1 < b2 && b1 < a2) return true;
  }
  return false;
}

/** True if two sections share at least one overlapping class time. */
export function sectionsOverlap(s1: Section, s2: Section): boolean {
  if (!s1.meetTimes?.length || !s2.meetTimes?.length) return false;
  for (const t1 of s1.meetTimes) {
    for (const t2 of s2.meetTimes) {
      if (meetingTimesOverlap(t1, t2)) return true;
    }
  }
  return false;
}

/**
 * True iff every section option in A overlaps with every section option in B
 * (impossible to take both courses together with any section choice).
 */
function pairwiseCoursesAlwaysOverlap(
  sectionsA: Section[],
  sectionsB: Section[]
): boolean {
  const withMeetA = sectionsA.filter((s) => s.meetTimes?.length);
  const withMeetB = sectionsB.filter((s) => s.meetTimes?.length);
  if (withMeetA.length === 0 || withMeetB.length === 0) return false;
  for (const s1 of withMeetA) {
    for (const s2 of withMeetB) {
      if (!sectionsOverlap(s1, s2)) return false;
    }
  }
  return true;
}

export function courseLabelFromSections(sections: Section[]): string {
  const s = sections[0];
  if (!s) return "Course";
  if (s.courseCode) return `${s.courseCode} — ${s.courseName}`;
  return s.courseName || "Event";
}

export type PairwiseConflict = { labelA: string; labelB: string };

/** Pairs of schedule rows where no section choice can avoid a time clash. */
export function findPairwiseConflictPairs(
  courseSectionGroups: Section[][]
): PairwiseConflict[] {
  const pairs: PairwiseConflict[] = [];
  for (let i = 0; i < courseSectionGroups.length; i++) {
    for (let j = i + 1; j < courseSectionGroups.length; j++) {
      if (pairwiseCoursesAlwaysOverlap(courseSectionGroups[i], courseSectionGroups[j])) {
        pairs.push({
          labelA: courseLabelFromSections(courseSectionGroups[i]),
          labelB: courseLabelFromSections(courseSectionGroups[j]),
        });
      }
    }
  }
  return pairs;
}

export function formatSectionShort(section: Section): string {
  const code = section.courseCode?.trim();
  const name = section.courseName?.trim();
  const display = section.display?.trim();
  if (code && name) {
    return display ? `${code} (${display})` : code;
  }
  return name || display || "Section";
}

/** First pair of sections in this combination that share an overlapping meeting time. */
export function findFirstOverlappingPairInCombination(
  combination: Section[]
): { a: Section; b: Section } | null {
  const withMeet = combination.filter((s) => s.meetTimes?.length);
  for (let i = 0; i < withMeet.length; i++) {
    for (let j = i + 1; j < withMeet.length; j++) {
      if (sectionsOverlap(withMeet[i], withMeet[j])) {
        return { a: withMeet[i], b: withMeet[j] };
      }
    }
  }
  return null;
}

/** Scan combinations until two sections in one combo overlap (for “no valid schedule” hints). */
export function findExampleOverlapAcrossCombinations(
  combinations: Section[][]
): { a: Section; b: Section } | null {
  for (const combo of combinations) {
    const hit = findFirstOverlappingPairInCombination(combo);
    if (hit) return hit;
  }
  return null;
}
