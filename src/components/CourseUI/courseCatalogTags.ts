import type { Course } from "./CourseTypes";

/**
 * UF catalog copy often states Quest / Gen Ed designations in the course description.
 * Optional `tags` from the API is preferred when present.
 */
export function getCourseCatalogTags(course: Course): string[] {
  const extended = course as Course & { tags?: unknown };
  if (Array.isArray(extended.tags) && extended.tags.length > 0) {
    return extended.tags.filter((t): t is string => typeof t === "string");
  }
  const text = `${course.description ?? ""}\n${course.name ?? ""}`;
  const found = new Set<string>();
  if (/\bQuest\s*1\b/i.test(text)) found.add("Quest 1");
  if (/\bQuest\s*2\b/i.test(text)) found.add("Quest 2");
  if (/\bQuest\s*3\b/i.test(text)) found.add("Quest 3");
  if (/\bState\s+Core\b/i.test(text) || /\bState\s+Gen\s*Ed\b/i.test(text)) {
    found.add("State Core");
  }
  return Array.from(found);
}
