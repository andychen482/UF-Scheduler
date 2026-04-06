import React, { useEffect, useMemo, useRef, useState } from "react";
import cytoscape from "cytoscape";
import { GraphData } from "./cytoscapeTypes";
import klay from "cytoscape-klay";
import MajorSelect from "../CoursesHandler/MajorSearch/MajorSearch";
import { API_URLS } from "../../config/api";
import ClipLoader from "react-spinners/ClipLoader";
import { Course } from "../CourseUI/CourseTypes";
import axios from "axios";
import "./GraphStyles.css";
import { PiGraphFill } from "react-icons/pi";
import { IoClose } from "react-icons/io5";
import PrerequisiteBlock from "../CourseUI/PrerequisiteBlock";

interface GraphProps {
  setDebouncedSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  isMobile: () => boolean;
  selectedCourses: Course[];
  setSearchTrigger: React.Dispatch<React.SetStateAction<boolean>>;
  searchTrigger: boolean;
  selectedMajor: string | null;
  setSelectedMajor: React.Dispatch<React.SetStateAction<string | null>>;
  term: string;
  year: string;
}

cytoscape.use(klay);

/** Compare / match course ids across graph elements and API payloads. */
function normalizeCourseKey(id: string): string {
  return id.replace(/\n/g, " ").replace(/\s+/g, "").trim().toUpperCase();
}

function formatCourseCodeForDisplay(key: string): string {
  const k = normalizeCourseKey(key);
  const m = k.match(/^([A-Z]{2,4})(\d{4}[A-Z]?)$/);
  if (m) return `${m[1]} ${m[2]}`;
  return key.replace(/\n/g, " ").trim();
}

/** Viewport coordinates for a fixed tooltip below the node center. */
function getNodeTooltipViewportPosition(
  cy: cytoscape.Core,
  node: cytoscape.Singular
): { left: number; top: number } {
  const bb = node.renderedBoundingBox();
  const container = cy.container();
  if (!container) return { left: 0, top: 0 };
  const cr = container.getBoundingClientRect();
  return {
    left: cr.left + (bb.x1 + bb.x2) / 2,
    top: cr.top + bb.y2 + 8,
  };
}

/** Looser graphs stay compact; dense graphs get more spacing so nodes don't feel crushed. */
function getKlayTuningForDensity(graphData: GraphData): {
  spacing: number;
  borderSpacing: number;
  inLayerSpacingFactor: number;
  edgeSpacingFactor: number;
  layoutPadding: number;
  fitPadding: number;
} {
  const n = graphData.nodes.length;
  const e = graphData.edges.length;
  const edgesPerNode = e / Math.max(n, 1);
  const densityScore = Math.min(
    1,
    (n / 46) * 0.48 + (edgesPerNode / 3.2) * 0.52
  );
  const t = densityScore;
  return {
    spacing: 26 + Math.round(11 * t + 7 * t * t),
    borderSpacing: 14 + Math.round(4 + 9 * t),
    inLayerSpacingFactor: 0.72 + 0.17 * t + 0.04 * t * t,
    edgeSpacingFactor: 0.38 + 0.16 * t + 0.06 * t * t,
    layoutPadding: 22 + Math.round(7 * t),
    fitPadding: 36 + Math.round(18 * t),
  };
}

const Graph: React.FC<GraphProps> = ({
  setDebouncedSearchTerm,
  setSearchTerm,
  isMobile,
  selectedCourses,
  setSearchTrigger,
  searchTrigger,
  selectedMajor,
  setSelectedMajor,
  term,
  year,
}) => {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(false);
  const cyContainerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const [graphNodeModal, setGraphNodeModal] = useState<string | null>(null);
  const [modalCourse, setModalCourse] = useState<Course | null>(null);
  const [modalCourseLoading, setModalCourseLoading] = useState(false);

  const [graphTooltip, setGraphTooltip] = useState<{
    left: number;
    top: number;
    name: string;
  } | null>(null);
  const termYearRef = useRef({ term, year });
  const courseNameCacheRef = useRef<Map<string, string>>(new Map());
  const graphTooltipHoveredNodeRef = useRef<cytoscape.Singular | null>(null);
  const graphTooltipHoverSeqRef = useRef(0);

  useEffect(() => {
    termYearRef.current = { term, year };
  }, [term, year]);

  const graphNeighborhood = useMemo(() => {
    if (!graphData || !graphNodeModal) return null;
    const nid = normalizeCourseKey(graphNodeModal);
    const incoming = new Map<string, string[]>();
    const outgoing = new Map<string, string[]>();
    for (const edge of graphData.edges) {
      const s = normalizeCourseKey(edge.data.source);
      const t = normalizeCourseKey(edge.data.target);
      if (!outgoing.has(s)) outgoing.set(s, []);
      outgoing.get(s)!.push(t);
      if (!incoming.has(t)) incoming.set(t, []);
      incoming.get(t)!.push(s);
    }
    const prereqs = Array.from(new Set(incoming.get(nid) ?? [])).sort();
    const unlocks = Array.from(new Set(outgoing.get(nid) ?? [])).sort();
    const unlockDetails = unlocks.map((u) => ({
      code: u,
      alsoRequires: Array.from(
        new Set((incoming.get(u) ?? []).filter((x) => x !== nid))
      ).sort(),
    }));
    return { prereqs, unlocks, unlockDetails };
  }, [graphData, graphNodeModal]);

  useEffect(() => {
    if (!graphNodeModal) {
      setModalCourse(null);
      setModalCourseLoading(false);
      return;
    }
    setModalCourse(null);
    setModalCourseLoading(true);
    let cancelled = false;
    const q = graphNodeModal.replace(/\n/g, " ").trim();
    axios
      .post(API_URLS.GET_COURSES, {
        searchTerm: q,
        itemsPerPage: 24,
        startFrom: 0,
        term,
        year,
      })
      .then((res) => {
        if (cancelled) return;
        const courses = res.data as Course[];
        const key = normalizeCourseKey(q);
        const exact =
          courses.find((c) => normalizeCourseKey(c.code) === key) ?? null;
        setModalCourse(exact ?? courses[0] ?? null);
        setModalCourseLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setModalCourse(null);
          setModalCourseLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [graphNodeModal, term, year]);

  useEffect(() => {
    if (!graphNodeModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setGraphNodeModal(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [graphNodeModal]);

  const closeGraphModal = () => setGraphNodeModal(null);

  const openGraphCourseFromCode = (code: string) => {
    setGraphNodeModal(code.replace(/\n/g, " ").trim());
  };

  const handleGraphModalFindInSearch = () => {
    if (!graphNodeModal) return;
    const q = (modalCourse?.code ?? graphNodeModal).replace(/\n/g, " ").trim();
    setSearchTerm(q);
    setDebouncedSearchTerm(q);
    setSearchTrigger((prev) => !prev);
    setGraphNodeModal(null);
  };

  //Renders graph after calendar is switched away from
  useEffect(() => {
    initializeCytoscape();
  }, []);

  const handleLoading = async (callback: () => Promise<void>) => {
    try {
      setLoading(true);
      await callback();
    } catch (error) {
      // Error handled silently in production
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedGraphData = localStorage.getItem("graphData");
    if (storedGraphData) {
      setGraphData(JSON.parse(storedGraphData));
    }
  }, []);

  useEffect(() => {
    if (graphData) {
      localStorage.setItem("graphData", JSON.stringify(graphData));
    }
    // Clean up previous event handlers before reinitializing
    if (cleanupRef.current) {
      cleanupRef.current();
    }
    initializeCytoscape();
    
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [graphData]);

  const initializeCytoscape = () => {
    if (cyRef.current) {
      cyRef.current.destroy();
      cyRef.current = null;
    }

    if (graphData && cyContainerRef.current) {
      const tune = getKlayTuningForDensity(graphData);
      const cy = cytoscape({
        container: cyContainerRef.current,
        userPanningEnabled: false,
        userZoomingEnabled: true,
        wheelSensitivity: 0.22,
        elements: [...graphData.nodes, ...graphData.edges],
        style: [
          {
            selector: "node",
            style: {
              shape: "roundrectangle",
              label: "data(id)",
              color: "#f8fafc",
              "text-valign": "center",
              "text-halign": "center",
              "text-wrap": "wrap",
              "text-max-width": "96px",
              "font-family":
                'Sora, "Segoe UI", system-ui, sans-serif',
              "font-weight": 600,
              "font-size": "12px",
              "line-height": 1.2,
              "min-zoomed-font-size": 6,
              width: "label",
              height: "label",
              padding: "8px 10px",
              "background-color": "#0d2a9e",
              "background-opacity": 1,
              "border-width": 1.5,
              "border-color": "rgba(255, 255, 255, 0.22)",
              "border-opacity": 1,
            },
          },
          {
            selector: "node.selected",
            style: {
              "background-color": "#e63e0c",
              "border-width": 2.5,
              "border-color": "rgba(255, 255, 255, 0.55)",
            },
          },
          {
            selector: "node.hover-em",
            style: {
              "overlay-opacity": 0.14,
              "overlay-color": "#ffffff",
              "overlay-padding": "8px",
            },
          },
          {
            selector: "node.selected.hover-em",
            style: {
              "overlay-opacity": 0.22,
              "overlay-color": "#fff7ed",
              "overlay-padding": "8px",
            },
          },
          {
            selector: "edge",
            style: {
              width: 1.75,
              opacity: 0.55,
              "line-color": "#94a3b8",
              "target-arrow-color": "#94a3b8",
              "arrow-scale": 0.85,
              "target-arrow-shape": "triangle",
              "target-arrow-fill": "filled",
              "curve-style": "taxi",
              "taxi-direction": "auto",
              "taxi-turn": "20px",
            },
          },
          {
            selector: "edge.hover-em",
            style: {
              opacity: 0.92,
              width: 2.25,
              "line-color": "#cbd5e1",
              "target-arrow-color": "#cbd5e1",
            },
          },
        ] as cytoscape.Stylesheet[],
        layout: {
          name: "klay",
          // Critical: Klay must see full label bounds or nodes overlap visually.
          nodeDimensionsIncludeLabels: true,
          padding: tune.layoutPadding,
          klay: {
            direction: "RIGHT",
            spacing: tune.spacing,
            borderSpacing: tune.borderSpacing,
            compactComponents: true,
            crossingMinimization: "LAYER_SWEEP",
            nodeLayering: "NETWORK_SIMPLEX",
            nodePlacement: "LINEAR_SEGMENTS",
            edgeRouting: "ORTHOGONAL",
            edgeSpacingFactor: tune.edgeSpacingFactor,
            inLayerSpacingFactor: tune.inLayerSpacingFactor,
            thoroughness: 14,
            aspectRatio: 1.35,
            linearSegmentsDeflectionDampening: 0.42,
            mergeEdges: true,
            mergeHierarchyCrossingEdges: true,
          },
        } as any,
        minZoom: 0.08,
        maxZoom: 3.25,
      });
      cyRef.current = cy;

      // Store cleanup function for event handlers
      cleanupRef.current = setupZoomEventHandler(cy);

      cy.on("tap", "node", (event) => {
        graphTooltipHoveredNodeRef.current = null;
        graphTooltipHoverSeqRef.current += 1;
        setGraphTooltip(null);
        const nodeId = event.target.id().replace(/\n/g, " ").trim();
        setGraphNodeModal(nodeId);
      });

      cy.ready(() => {
        requestAnimationFrame(() => {
          cy.fit(undefined, tune.fitPadding);
        });
      });

      cy.on("mouseover", "node", (e) => {
        const node = e.target;
        node.addClass("hover-em");
        node.connectedEdges().addClass("hover-em");

        graphTooltipHoveredNodeRef.current = node;
        const seq = ++graphTooltipHoverSeqRef.current;
        const code = node.id().replace(/\n/g, " ").trim();
        const key = normalizeCourseKey(code);
        const pos = getNodeTooltipViewportPosition(cy, node);

        const cached = courseNameCacheRef.current.get(key);
        if (cached) {
          setGraphTooltip({ ...pos, name: cached });
        } else {
          void (async () => {
            const { term: t, year: y } = termYearRef.current;
            try {
              const res = await axios.post(API_URLS.GET_COURSES, {
                searchTerm: code,
                itemsPerPage: 20,
                startFrom: 0,
                term: t,
                year: y,
              });
              if (graphTooltipHoverSeqRef.current !== seq) return;
              const courses = res.data as Course[];
              const match = courses.find(
                (c) => normalizeCourseKey(c.code) === key
              );
              const name =
                match?.name?.trim() || formatCourseCodeForDisplay(code);
              courseNameCacheRef.current.set(key, name);
              const hovered = graphTooltipHoveredNodeRef.current;
              if (!hovered || graphTooltipHoverSeqRef.current !== seq) return;
              const p = getNodeTooltipViewportPosition(cy, hovered);
              setGraphTooltip({ ...p, name });
            } catch {
              if (graphTooltipHoverSeqRef.current !== seq) return;
              const fallback = formatCourseCodeForDisplay(code);
              courseNameCacheRef.current.set(key, fallback);
              const hovered = graphTooltipHoveredNodeRef.current;
              if (!hovered || graphTooltipHoverSeqRef.current !== seq) return;
              const p = getNodeTooltipViewportPosition(cy, hovered);
              setGraphTooltip({ ...p, name: fallback });
            }
          })();
        }
      });

      cy.on("mouseout", "node", (e) => {
        e.target.removeClass("hover-em");
        e.target.connectedEdges().removeClass("hover-em");
        graphTooltipHoveredNodeRef.current = null;
        graphTooltipHoverSeqRef.current += 1;
        setGraphTooltip(null);
      });

      cy.on("pan zoom", () => {
        const node = graphTooltipHoveredNodeRef.current;
        if (!node || typeof node.renderedBoundingBox !== "function") return;
        const pos = getNodeTooltipViewportPosition(cy, node);
        setGraphTooltip((prev) => (prev ? { ...prev, ...pos } : null));
      });
    }
    setLoadedOnce(true);
  };

  const setupZoomEventHandler = (cy: cytoscape.Core) => {
    let touchCount = 0;

    const handleWheel = (e: WheelEvent) => {
      if (cyRef && cyRef.current) {
        // Check if cyRef and cyRef.current are not null
        e.preventDefault();

        const zoomFactor = e.deltaY < 0 ? 1.05 : 1 / 1.05;
        const container = cyRef.current.container();
        if (container) {
          // Check if container is not null
          const offset = container.getBoundingClientRect();
          const pos = {
            x: e.clientX - offset.left,
            y: e.clientY - offset.top,
          };
          const zoomedPosition = {
            x: (pos.x - cyRef.current.pan().x) / cyRef.current.zoom(),
            y: (pos.y - cyRef.current.pan().y) / cyRef.current.zoom(),
          };

          cyRef.current.zoom({
            level: cyRef.current.zoom() * zoomFactor,
            position: zoomedPosition,
          });
        }
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (!isMobile() && cyRef.current) {
        cyRef.current.userPanningEnabled(true);
      }
    };

    const handleMouseUpOrLeave = (e: MouseEvent) => {
      if (!isMobile() && cyRef.current) {
        cyRef.current.userPanningEnabled(false);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchCount = e.touches.length;

      if (isMobile()) {
        if (touchCount === 2 && cyRef.current) {
          cyRef.current.userPanningEnabled(true);
        }
      } else {
        if (touchCount === 1 && cyRef.current) {
          cyRef.current.userPanningEnabled(true);
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      touchCount = e.touches.length;

      if (isMobile()) {
        if (touchCount !== 2 && cyRef.current) {
          cyRef.current.userPanningEnabled(false);
        }
      } else {
        if (touchCount !== 1 && cyRef.current) {
          cyRef.current.userPanningEnabled(false);
        }
      }
    };

    const container = cyContainerRef.current;
    const options = { passive: false };
    if (container) {
      container.addEventListener("touchstart", handleTouchStart, options);
      container.addEventListener("touchend", handleTouchEnd);
      container.addEventListener("mousedown", handleMouseDown);
      container.addEventListener("mouseup", handleMouseUpOrLeave);
      container.addEventListener("mouseleave", handleMouseUpOrLeave);
      container.addEventListener("wheel", handleWheel, options);
    }

    return () => {
      if (container) {
        container.removeEventListener("touchstart", handleTouchStart);
        container.removeEventListener("touchend", handleTouchEnd);
        container.removeEventListener("mousedown", handleMouseDown);
        container.removeEventListener("mouseup", handleMouseUpOrLeave);
        container.removeEventListener("mouseleave", handleMouseUpOrLeave);
        container.removeEventListener("wheel", handleWheel);
      }
    };
  };

  useEffect(() => {
    if (loadedOnce) {
      handleLoading(generateAList);
    }
  }, [selectedCourses, selectedMajor]);

  const generateAList = async () => {
    await handleLoading(async () => {
      const selectedCoursesServ = selectedCourses
        .filter((course) => !course.excludedFromSchedule)
        .map((course) => course.code);
      const response = await axios.post(API_URLS.GENERATE_A_LIST, {
        selectedMajorServ: selectedMajor,
        selectedCoursesServ: selectedCoursesServ,
        term: term,
        year: year,
      });

      const data: GraphData = response.data;
      setGraphData(data);
    });
  };
  const graphModalTitleId = "graph-course-modal-title";

  return (
    <>
      {graphNodeModal && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby={graphModalTitleId}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70 cursor-default border-0 w-full h-full"
            onClick={closeGraphModal}
            aria-label="Close dialog"
          />
          <div
            className="relative z-[2001] flex flex-col w-full max-w-lg max-h-[85vh] min-h-0 rounded-xl bg-[#1a1a1a] border border-gray-600 shadow-2xl text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 flex items-start justify-between gap-3 px-4 py-3 border-b border-gray-600 bg-[#1a1a1a]">
              <div className="min-w-0 flex-1">
                <h2
                  id={graphModalTitleId}
                  className="text-lg font-bold text-white leading-tight"
                >
                  {(modalCourse?.code ?? graphNodeModal).replace(
                    /([A-Z]+)/g,
                    "$1 "
                  )}
                </h2>
                {modalCourseLoading ? (
                  <p className="text-sm text-gray-500 mt-1">Loading details…</p>
                ) : modalCourse ? (
                  <p className="text-sm text-gray-300 mt-1">{modalCourse.name}</p>
                ) : (
                  <p className="text-sm text-gray-500 mt-1">
                    Course title unavailable from catalog search.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={closeGraphModal}
                className="shrink-0 p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <IoClose size={22} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-4 text-[14px] text-gray-200">
              {modalCourse?.description && (
                <div>
                  <strong className="text-white">Description</strong>
                  <p className="mt-1 whitespace-pre-wrap text-gray-300">
                    {modalCourse.description.replace("(P)", "").trim()}
                  </p>
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="h-5 w-1 rounded-full bg-[#fa4616] shrink-0"
                    aria-hidden
                  />
                  <strong className="text-white text-[15px] font-semibold">
                    Prerequisites
                  </strong>
                </div>
                <PrerequisiteBlock
                  prerequisites={modalCourse?.prerequisites}
                  variant="modal"
                  onCourseCodeClick={openGraphCourseFromCode}
                />
              </div>

              {graphNeighborhood && graphNeighborhood.prereqs.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="h-5 w-1 rounded-full bg-sky-600/90 shrink-0"
                      aria-hidden
                    />
                    <strong className="text-white text-[15px] font-semibold">
                      Prerequisites in this graph
                    </strong>
                  </div>
                  <p className="text-xs text-gray-500 mb-2 leading-snug">
                    Direct incoming edges in this view (other prereqs may still apply
                    in the catalog).
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {graphNeighborhood.prereqs.map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => openGraphCourseFromCode(code)}
                        className="text-sm px-2.5 py-1.5 rounded-md bg-[#252525] border border-gray-600 text-gray-100 hover:bg-[#2f2f2f] transition-colors"
                      >
                        {formatCourseCodeForDisplay(code)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="h-5 w-1 rounded-full bg-emerald-600/90 shrink-0"
                    aria-hidden
                  />
                  <strong className="text-white text-[15px] font-semibold">
                    Unlocks in this graph
                  </strong>
                </div>
                <p className="text-xs text-gray-500 mb-2 leading-snug">
                  Courses that list this one as a prerequisite in this graph.
                </p>
                {graphNeighborhood && graphNeighborhood.unlockDetails.length > 0 ? (
                  <ul className="space-y-3 list-none m-0 p-0">
                    {graphNeighborhood.unlockDetails.map((u) => (
                      <li
                        key={u.code}
                        className="rounded-lg border border-gray-600/70 bg-[#212121] p-3"
                      >
                        <button
                          type="button"
                          onClick={() => openGraphCourseFromCode(u.code)}
                          className="text-left font-semibold text-white hover:text-sky-200 transition-colors"
                        >
                          {formatCourseCodeForDisplay(u.code)}
                        </button>
                        {u.alsoRequires.length > 0 ? (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500 mb-1.5">
                              Also required for that course (in this graph)
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {u.alsoRequires.map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => openGraphCourseFromCode(c)}
                                  className="text-xs px-2 py-1 rounded-md bg-[#1a1a1a] border border-gray-600 text-gray-200 hover:bg-[#262626] transition-colors"
                                >
                                  {formatCourseCodeForDisplay(c)}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500 mt-1.5">
                            No other prerequisites appear in this graph for that
                            course.
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">
                    No downstream courses in this graph view.
                  </p>
                )}
              </div>
            </div>

            <div className="shrink-0 border-t border-gray-600 bg-[#141414] px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.45)]">
              <button
                type="button"
                onClick={handleGraphModalFindInSearch}
                className="w-full text-sm font-medium px-4 py-2.5 rounded-lg bg-[#292929] border border-gray-500 text-gray-100 hover:bg-[#333] transition-colors"
              >
                Find in course search
              </button>
            </div>
          </div>
        </div>
      )}

      {graphTooltip && (
        <div
          role="tooltip"
          className="fixed z-[1500] pointer-events-none max-w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 px-3 py-1.5 rounded-md bg-[#111] border border-gray-600 text-xs text-gray-100 shadow-lg"
          style={{ left: graphTooltip.left, top: graphTooltip.top }}
        >
          <span className="leading-snug">{graphTooltip.name}</span>
        </div>
      )}

      <div className="graph-view">
      <header className="graph-toolbar">
        <div className="graph-toolbar-title">
          <span className="graph-toolbar-icon" aria-hidden>
            <PiGraphFill size={22} />
          </span>
          <div>
            <h2 className="graph-toolbar-heading">Prerequisite paths</h2>
            <p className="graph-toolbar-sub">
              Arrows point from prereq to class. Click a course to see prereqs and unlocks.
            </p>
          </div>
        </div>

        <div className="graph-legend" role="group" aria-label="Node colors">
          <span className="graph-legend-item">
            <span className="graph-swatch graph-swatch--course" /> Course
          </span>
          <span className="graph-legend-item">
            <span className="graph-swatch graph-swatch--yours" /> On your list
          </span>
          <span className="graph-legend-hint">Scroll to zoom · drag to pan</span>
        </div>

        <div className="graph-major-wrap">
          <label className="graph-major-label" htmlFor="graph-major-select-input">
            Filter by department
          </label>
          <MajorSelect
            inputId="graph-major-select-input"
            selectedMajor={selectedMajor}
            setSelectedMajor={setSelectedMajor}
          />
        </div>
      </header>

      <div className="graph-canvas-host">
        <div ref={cyContainerRef} id="cytoscape-container" />
        <div className={`loader-container ${loading ? "show" : ""}`}>
          <ClipLoader color="#ffffff" loading={loading} size={150} />
        </div>
      </div>
    </div>
    </>
  );
};

export default Graph;
