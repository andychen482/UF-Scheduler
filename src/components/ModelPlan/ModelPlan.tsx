import React, { useState, useEffect, useMemo, useCallback } from "react";
import fullTables from "../../data/fullTables.json";
import { Course as PlanRow, MajorPlans } from "./planTypes";
import { Course } from "../CourseUI/CourseTypes";
import Select, { CSSObjectWithLabel, SingleValue } from "react-select";
import "./planStyles.css";
import axios from "axios";
import { useAuth } from "react-oidc-context";
import { IoClose } from "react-icons/io5";

import { API_URLS, BACKEND_URLS, getAuthHeaders } from "../../config/api";
import { PiGraduationCap } from "react-icons/pi";

const SEMESTER_HEADER = /^Semester\s+(One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten)\b/i;

function groupRowsBySemester(rows: PlanRow[]): { title: string; rows: PlanRow[] }[] {
  const groups: { title: string; rows: PlanRow[] }[] = [];
  let title = "Semester One";
  let buf: PlanRow[] = [];

  const flush = () => {
    if (buf.length > 0) {
      groups.push({ title, rows: buf });
      buf = [];
    }
  };

  for (const course of rows) {
    const courseText = course["Semester One"];
    const descriptionText = course["Semester One.1"];
    const creditsText = course["Credits"];

    const isSemesterBanner =
      courseText &&
      courseText === descriptionText &&
      descriptionText === creditsText &&
      typeof courseText === "string" &&
      SEMESTER_HEADER.test(courseText);

    if (isSemesterBanner) {
      flush();
      title = courseText;
      continue;
    }
    buf.push(course);
  }
  flush();
  return groups;
}

function normalizeSpaces(s: string): string {
  return s.replace(/\u00a0/g, " ").trim();
}

/**
 * Pulls a UF-style course code from free text (e.g. MAC 2233, COP 3502C, COP3502C).
 * Lab/suffix letters after the four digits (common for CS/engineering) are included.
 */
function extractCourseCode(...parts: (string | null | undefined)[]): string | null {
  for (const p of parts) {
    if (!p) continue;
    const n = normalizeSpaces(p);
    // Spaced: "COP 3502C" — \b after bare \d{4} fails before the trailing C, so include optional letter.
    let m = n.match(/\b([A-Z]{2,4})\s+(\d{4})([A-Z])?\b/i);
    if (m) {
      return `${m[1].toUpperCase()} ${m[2]}${m[3] ?? ""}`;
    }
    // No space: "COP3502C"
    m = n.match(/\b([A-Z]{2,4})(\d{4})([A-Z])?\b/i);
    if (m) {
      return `${m[1].toUpperCase()} ${m[2]}${m[3] ?? ""}`;
    }
  }
  return null;
}

type PlanPopupState = {
  code: string;
  loading: boolean;
  course: Course | null;
  errorText?: string;
};

export interface ModelPlanProps {
  term: string;
  year: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  setDebouncedSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  searchTrigger: boolean;
  setSearchTrigger: React.Dispatch<React.SetStateAction<boolean>>;
  calendarView: () => void;
}

const ModelPlan: React.FC<ModelPlanProps> = ({
  term,
  year,
  setSearchTerm,
  setDebouncedSearchTerm,
  searchTrigger,
  setSearchTrigger,
  calendarView,
}) => {
  const auth = useAuth();
  const [selectedMajor, setSelectedMajor] = useState<string>("");
  const [planPopup, setPlanPopup] = useState<PlanPopupState | null>(null);

  useEffect(() => {
    const storedSelectedMajor = localStorage.getItem("selectedMajorPlan");
    if (storedSelectedMajor) {
      setSelectedMajor(storedSelectedMajor);
    }
  }, []);

  useEffect(() => {
    if (selectedMajor) {
      localStorage.setItem("selectedMajorPlan", selectedMajor);
    } else {
      localStorage.removeItem("selectedMajorPlan");
    }
  }, [selectedMajor]);

  useEffect(() => {
    if (!planPopup) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPlanPopup(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [planPopup]);

  const options = useMemo(
    () =>
      Object.keys(fullTables).map((major) => ({
        value: major,
        label: major,
      })),
    []
  );

  const sendMajorMetrics = async (major: string) => {
    try {
      await axios.post(
        BACKEND_URLS.MAJOR_METRICS,
        { major: major },
        { headers: getAuthHeaders(auth) }
      );
    } catch {
      // Metrics send failed silently
    }
  };

  const handleMajorChange = (
    selectedOption: SingleValue<{ value: string; label: string }>
  ) => {
    const selectedMajorValue = selectedOption ? selectedOption.value : "";
    setSelectedMajor(selectedMajorValue);
    if (selectedMajorValue) {
      sendMajorMetrics(selectedMajorValue);
    }
  };

  const fetchCourseForPopup = useCallback(
    async (code: string) => {
      setPlanPopup({ code, loading: true, course: null });
      try {
        const response = await axios.post(API_URLS.GET_COURSES, {
          searchTerm: code,
          itemsPerPage: 25,
          startFrom: 0,
          term,
          year,
        });
        const rows: Course[] = response.data ?? [];
        const norm = (c: string) => c.replace(/\s+/g, " ").toUpperCase();
        const target = norm(code);
        const match =
          rows.find((c) => norm(c.code) === target) ?? rows[0];
        if (match) {
          setPlanPopup({
            code,
            loading: false,
            course: {
              ...match,
              creditsEditable: match.sections[0]?.credits === "VAR",
            },
          });
        } else {
          setPlanPopup({
            code,
            loading: false,
            course: null,
            errorText: "No offering found for the current term in the catalog search.",
          });
        }
      } catch {
        setPlanPopup({
          code,
          loading: false,
          course: null,
          errorText: "Could not load course data.",
        });
      }
    },
    [term, year]
  );

  const goToScheduler = useCallback(() => {
    if (!planPopup) return;
    const code = planPopup.course?.code ?? planPopup.code;
    setSearchTerm(code);
    setDebouncedSearchTerm(code);
    setSearchTrigger(!searchTrigger);
    calendarView();
    setPlanPopup(null);
  }, [
    planPopup,
    setSearchTerm,
    setDebouncedSearchTerm,
    searchTrigger,
    setSearchTrigger,
    calendarView,
  ]);

  const renderSemesterTables = (major: string) => {
    const plans: MajorPlans = fullTables;
    if (!plans[major]) return null;

    const rows = plans[major];
    const groups = groupRowsBySemester(rows);
    const totalDataRows = groups.reduce((n, g) => n + g.rows.length, 0);
    let globalIdx = 0;
    let lastRowColor = "var(--mp-row-a)";

    const renderPlanRow = (
      course: PlanRow,
      index: number,
      globalLast: boolean,
      rowKey: string
    ): React.ReactNode => {
      let courseText = course["Semester One"];
      let descriptionText = course["Semester One.1"];
      let creditsText = course["Credits"];

      let courseSpan = 1;
      let descriptionSpan = 1;
      let creditsSpan = 1;

      /** Merged code+title in one cell (no per-row credits), e.g. options under "Select one:" */
      let mergedCourseNoCredits = false;

      let semesterText = false;

      let rowStyle: React.CSSProperties = {
        backgroundColor: index % 2 === 0 ? "var(--mp-row-a)" : "var(--mp-row-b)",
      };

      if (
        courseText === descriptionText &&
        descriptionText === creditsText
      ) {
        courseSpan = 3;
        descriptionSpan = 0;
        creditsSpan = 0;
        semesterText = true;
        lastRowColor = index % 2 === 0 ? "var(--mp-row-a)" : "var(--mp-row-b)";
      } else if (courseText === descriptionText) {
        courseSpan = 2;
        descriptionSpan = 0;
        lastRowColor = index % 2 === 0 ? "var(--mp-row-a)" : "var(--mp-row-b)";
      } else if (descriptionText === creditsText) {
        descriptionSpan = 2;
        creditsSpan = 0;
        lastRowColor = index % 2 === 0 ? "var(--mp-row-a)" : "var(--mp-row-b)";
      } else if (!courseText && descriptionText) {
        courseSpan = 2;
        courseText = descriptionText;
        descriptionSpan = 0;
        creditsSpan = 1;
        lastRowColor = index % 2 === 0 ? "var(--mp-row-a)" : "var(--mp-row-b)";
      } else if (!creditsText && descriptionText) {
        const merged =
          (courseText ?? "") +
          (courseText ? ": " : "") +
          descriptionText;
        courseText = merged;
        descriptionText = "";
        courseSpan = 2;
        descriptionSpan = 0;
        creditsSpan = 1;
        creditsText = "";
        mergedCourseNoCredits = true;
        rowStyle = {
          backgroundColor: lastRowColor,
        };
      }

      const isCreditsTotalRow =
        !course["Semester One"] && course["Semester One.1"] === "Credits";

      const resolvedCode =
        semesterText || isCreditsTotalRow
          ? null
          : extractCourseCode(courseText, descriptionText);

      const isLastRow = globalLast;
      const rowClassName = semesterText
        ? "model-plan-row model-plan-row--banner"
        : `model-plan-row${resolvedCode ? " model-plan-row--clickable" : ""}`;

      if (semesterText) {
        return (
          <tr
            key={rowKey}
            className={rowClassName}
            style={isLastRow ? { fontWeight: 700 } : rowStyle}
          >
            <td colSpan={2} className="model-plan-cell model-plan-cell--banner-text">
              {courseText}
            </td>
            <td colSpan={1} className="model-plan-cell model-plan-cell--banner-pad" aria-hidden />
          </tr>
        );
      }

      const rowProps = resolvedCode
        ? {
            role: "button" as const,
            tabIndex: 0,
            onClick: () => {
              void fetchCourseForPopup(resolvedCode);
            },
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                void fetchCourseForPopup(resolvedCode);
              }
            },
          }
        : {};

      return (
        <tr
          key={rowKey}
          className={rowClassName}
          style={isLastRow ? { fontWeight: 700 } : rowStyle}
          {...rowProps}
        >
          {courseSpan > 0 && (
            <td
              colSpan={courseSpan}
              className={
                mergedCourseNoCredits
                  ? "model-plan-cell model-plan-cell--merged-option"
                  : "model-plan-cell model-plan-cell--code"
              }
            >
              {courseText}
            </td>
          )}
          {descriptionSpan > 0 && (
            <td colSpan={descriptionSpan} className="model-plan-cell model-plan-cell--desc">
              {descriptionText}
            </td>
          )}
          {creditsSpan > 0 && (
            <td colSpan={creditsSpan} className="model-plan-cell model-plan-cell--cred">
              {creditsText}
            </td>
          )}
        </tr>
      );
    };

    return (
      <div className="model-plan-semesters" role="region" aria-label={`Plan for ${major}`}>
        {groups.map((group, gi) => (
          <section key={`${major}-${group.title}-${gi}`} className="model-plan-semester-card">
            <div className="model-plan-semester-card__head">
              <span className="model-plan-semester-card__index" aria-hidden>
                {gi + 1}
              </span>
              <h2 className="model-plan-semester-card__title">{group.title}</h2>
            </div>
            <div className="model-plan-table-wrap">
              <table className="model-plan">
                <thead>
                  <tr>
                    <th scope="col" className="model-plan-th model-plan-th--course" colSpan={2}>
                      Course
                    </th>
                    <th scope="col" className="model-plan-th model-plan-th--credits">
                      Credits
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((course, ri) => {
                    const globalLast = globalIdx === totalDataRows - 1;
                    globalIdx += 1;
                    return renderPlanRow(course, ri, globalLast, `${gi}-${ri}`);
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    );
  };

  const planTables = selectedMajor ? renderSemesterTables(selectedMajor) : null;

  const selectStyles = useMemo(
    () => ({
      menuPortal: (base: CSSObjectWithLabel) =>
        ({ ...base, zIndex: 999 } as CSSObjectWithLabel),
      control: (base: CSSObjectWithLabel, state: { isFocused: boolean }) =>
        ({
          ...base,
          backgroundColor: "rgba(22, 22, 22, 0.95)",
          borderColor: state.isFocused ? "rgba(250, 70, 22, 0.65)" : "rgba(255, 255, 255, 0.12)",
          boxShadow: state.isFocused ? "0 0 0 1px rgba(250, 70, 22, 0.35)" : "none",
          borderRadius: "12px",
          minHeight: "46px",
          paddingLeft: "4px",
          cursor: "pointer",
        } as CSSObjectWithLabel),
      menu: (base: CSSObjectWithLabel) =>
        ({
          ...base,
          backgroundColor: "#181818",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0 12px 40px rgba(0, 0, 0, 0.55)",
        } as CSSObjectWithLabel),
      menuList: (base: CSSObjectWithLabel) =>
        ({
          ...base,
          padding: "6px",
        } as CSSObjectWithLabel),
      option: (
        base: CSSObjectWithLabel,
        state: { isFocused: boolean; isSelected: boolean }
      ) =>
        ({
          ...base,
          backgroundColor: state.isSelected
            ? "rgba(250, 70, 22, 0.22)"
            : state.isFocused
              ? "rgba(255, 255, 255, 0.06)"
              : "transparent",
          color: "#f3f4f6",
          borderRadius: "8px",
          cursor: "pointer",
        } as CSSObjectWithLabel),
      singleValue: (base: CSSObjectWithLabel) =>
        ({ ...base, color: "#f3f4f6", fontWeight: 600 } as CSSObjectWithLabel),
      placeholder: (base: CSSObjectWithLabel) =>
        ({ ...base, color: "rgba(255, 255, 255, 0.42)" } as CSSObjectWithLabel),
      input: (base: CSSObjectWithLabel) =>
        ({ ...base, color: "#f3f4f6" } as CSSObjectWithLabel),
      clearIndicator: (base: CSSObjectWithLabel) =>
        ({ ...base, color: "rgba(255, 255, 255, 0.45)" } as CSSObjectWithLabel),
      dropdownIndicator: (base: CSSObjectWithLabel) =>
        ({ ...base, color: "rgba(255, 255, 255, 0.45)" } as CSSObjectWithLabel),
    }),
    []
  );

  const creditsLabel = (c: Course) => {
    const cr = c.sections[0]?.credits;
    if (cr === "VAR") return "Variable";
    if (typeof cr === "number") return String(cr);
    return "—";
  };

  return (
    <div className="model-plan-container overflow-y-auto">
      <header className="model-plan-hero">
        <p className="model-plan-eyebrow">University of Florida</p>
        <h1 className="model-plan-title">Model Semester Plans</h1>
        <p className="model-plan-lede">
          Browse the official sample sequence for each major to see how classes are typically taken. Then build your own schedule in the Scheduler tab.
        </p>
      </header>

      <div className="model-plan-controls">
        <label className="model-plan-label" htmlFor="model-plan-major-select">
          Major
        </label>
        <Select
          inputId="model-plan-major-select"
          options={options}
          isClearable={true}
          value={
            selectedMajor ? { value: selectedMajor, label: selectedMajor } : null
          }
          onChange={handleMajorChange}
          placeholder="Search or choose a major…"
          className="model-plan-select"
          classNamePrefix="mp-select"
          menuPortalTarget={document.body}
          styles={selectStyles}
          noOptionsMessage={() => "No majors match"}
        />
      </div>

      {!selectedMajor && (
        <div className="model-plan-empty" role="status">
          <PiGraduationCap className="model-plan-empty__icon" aria-hidden />
          <p className="model-plan-empty__title">Pick a major to view its plan</p>
          <p className="model-plan-empty__hint">
            Type in the box above to filter the list—plans load instantly from UF&apos;s published
            sequences.
          </p>
        </div>
      )}

      {selectedMajor && (
        <div className="table-container">
          {planTables}
        </div>
      )}

      {planPopup && (
        <div
          className="model-plan-popup-root"
          role="dialog"
          aria-modal="true"
          aria-labelledby="model-plan-popup-title"
        >
          <button
            type="button"
            className="model-plan-popup-backdrop"
            onClick={() => setPlanPopup(null)}
            aria-label="Close"
          />
          <div
            className="model-plan-popup"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="model-plan-popup__top">
              <div className="model-plan-popup__titles">
                <p className="model-plan-popup__code">{planPopup.code}</p>
                <h2 id="model-plan-popup-title" className="model-plan-popup__name">
                  {planPopup.loading
                    ? "Loading…"
                    : planPopup.course?.name ?? "Course"}
                </h2>
              </div>
              <button
                type="button"
                className="model-plan-popup__close"
                onClick={() => setPlanPopup(null)}
                aria-label="Close"
              >
                <IoClose size={22} />
              </button>
            </div>

            {planPopup.loading && (
              <p className="model-plan-popup__muted">Fetching catalog info for the selected term…</p>
            )}

            {!planPopup.loading && planPopup.errorText && (
              <p className="model-plan-popup__error">{planPopup.errorText}</p>
            )}

            {!planPopup.loading && planPopup.course && (
              <div className="model-plan-popup__body">
                <p className="model-plan-popup__credits">
                  <span className="model-plan-popup__credits-label">Credits</span>
                  {creditsLabel(planPopup.course)}
                </p>
                <p className="model-plan-popup__desc">
                  {planPopup.course.description
                    ? planPopup.course.description.replace("(P)", "").trim()
                    : "No description available."}
                </p>
              </div>
            )}

            <div className="model-plan-popup__actions">
              <button
                type="button"
                className="model-plan-popup__btn model-plan-popup__btn--ghost"
                onClick={() => setPlanPopup(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="model-plan-popup__btn model-plan-popup__btn--primary"
                onClick={goToScheduler}
              >
                View in Scheduler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelPlan;
