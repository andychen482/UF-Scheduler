import React from "react";
import type { Course } from "./CourseTypes";
import { getCourseCatalogTags } from "./courseCatalogTags";

type Props = {
  course: Course;
  className?: string;
};

/** Compact UF-style designation chips from catalog text or API `tags`. */
const CourseCatalogTagPills: React.FC<Props> = ({ course, className }) => {
  const tags = getCourseCatalogTags(course);
  if (tags.length === 0) return null;
  return (
    <div
      className={className ?? "flex flex-wrap gap-1 mt-1"}
      aria-label="Course designations"
    >
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-[#2a1810] text-[#ffb38a] ring-1 ring-[#fa4616]/35"
        >
          {t}
        </span>
      ))}
    </div>
  );
};

export default CourseCatalogTagPills;
