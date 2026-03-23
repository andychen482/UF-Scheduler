import React, { useRef, useEffect, useState, useCallback } from "react";
import mapboxgl, { MapboxGeoJSONFeature } from "mapbox-gl";
import rawCoords from "../../data/buildingCoords.json";
import parkingInfo from "../../data/parking_polys.json";
import scooterParking from "../../data/scooterParking.json";
import { MdFullscreen, MdFullscreenExit, MdOutlinePedalBike } from "react-icons/md";
import { FaPersonWalking } from "react-icons/fa6";
import { PiMopedFill } from "react-icons/pi";
import "./MapStyles.css";

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN as string;

const buildingCoords: BuildingCoords = rawCoords as BuildingCoords;

interface BuildingProperties {
  PropName: string;
  PropCID: string;
  Longitude: number;
  Latitude: number;
}

interface BuildingFeature {
  properties: BuildingProperties;
}

interface BuildingFeatures {
  [code: string]: BuildingFeature;
}

interface BuildingCoords {
  features: BuildingFeatures;
}

type MapLocation = {
  longitude: number;
  latitude: number;
};

type coordsProps = {
  name: string;
  location: MapLocation;
  color: string;
};

// Track active isochrone layers for refetching on transport mode change
interface ActiveIsochrone {
  coord: coordsProps;
  index: number;
  color: string;
}

function convert24to12(time: string, num: number) {
  const [hours, minutes] = time.split(":").map(Number);
  const suffix = hours < 12 ? "AM" : "PM";
  const hour = hours % 12 || 12;
  if (num === 0) return `${hour}:${minutes.toString().padStart(2, "0")}`;
  if (num === 1)
    return `${hour}:${minutes.toString().padStart(2, "0")} ${suffix}`;
}

function getContrastYIQ(hexcolor: string) {
  var r = parseInt(hexcolor.substring(1, 3), 16);
  var g = parseInt(hexcolor.substring(3, 5), 16);
  var b = parseInt(hexcolor.substring(5, 7), 16);
  var yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "black" : "white";
}

interface MapProps {
  term: string;
  year: string;
}

const Map: React.FC<MapProps> = ({ term, year }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const popupsRef = useRef<mapboxgl.Popup[]>([]);
  const activeIsochronesRef = useRef<ActiveIsochrone[]>([]);
  const mapLoadedRef = useRef<boolean>(false);
  const [selectedDay, setSelectedDay] = useState<string>("M"); // Example selected day, could be set based on user input
  const [transportMode, setTransportMode] = useState<string>("walking");
  const [showHelp, setShowHelp] = useState(true);
  const [mapFullscreen, setMapFullscreen] = useState<boolean>(false);
  const [isLargeScreen, setIsLargeScreen] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth >= 1001 : false
  );
  // ref to hold latest mapFullscreen to avoid stale closures in event handlers
  const mapFullscreenRef = useRef<boolean>(mapFullscreen);
  // ref to hold latest transportMode for use in callbacks
  const transportModeRef = useRef<string>(transportMode);

  // keep ref in sync whenever mapFullscreen changes
  useEffect(() => {
    mapFullscreenRef.current = mapFullscreen;
  }, [mapFullscreen]);

  // keep transport mode ref in sync
  useEffect(() => {
    transportModeRef.current = transportMode;
  }, [transportMode]);

  // track screen width so we only show fullscreen button on wide screens
  useEffect(() => {
    const onResize = () => {
      setIsLargeScreen(window.innerWidth >= 1001);
      if (window.innerWidth < 1001 && mapFullscreenRef.current === true) {
        // auto-exit fullscreen if viewport shrinks below threshold
        setMapFullscreen(false);
        const mappp = mapContainerRef.current;
        const mapEl = mappp && mappp.parentElement && mappp.parentElement.parentElement;
        if (mapEl instanceof HTMLElement) {
          mapEl.classList.remove('fullscreen-map');
          mapEl.classList.add('map-container');
        }
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Helper to remove isochrone layers and source for a given index
  const removeIsochroneLayers = useCallback((map: mapboxgl.Map, index: number) => {
    const sourceId = `isochrone-source-${index}`;
    const layerId = `isochrone-layer-${index}`;
    const borderLayerId = `isochrone-border-${index}`;
    const borderLabelId = `isochrone-label-${index}`;

    if (map.getLayer(borderLabelId)) map.removeLayer(borderLabelId);
    if (map.getLayer(borderLayerId)) map.removeLayer(borderLayerId);
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);
  }, []);

  // Function to fetch isochrone data and create a layer
  const fetchIsochrone = useCallback(async (
    map: mapboxgl.Map,
    coord: coordsProps,
    index: number,
    color: string,
    mode: string
  ) => {
    const url = `https://api.mapbox.com/isochrone/v1/mapbox/${mode}/${coord.location.longitude},${coord.location.latitude}?contours_minutes=15&polygons=true&access_token=${mapboxgl.accessToken}`;
    const response = await fetch(url);
    const data = await response.json();

    if (map && data.features) {
      const sourceId = `isochrone-source-${index}`;
      const layerId = `isochrone-layer-${index}`;
      const borderLayerId = `isochrone-border-${index}`;
      const borderLabelId = `isochrone-label-${index}`;

      // Remove existing layers/source if they exist (for updates)
      removeIsochroneLayers(map, index);

      // Add source for isochrone
      map.addSource(sourceId, {
        type: "geojson",
        data: data,
      });

      // Add layer for isochrone
      map.addLayer({
        id: layerId,
        type: "fill",
        source: sourceId,
        layout: {},
        paint: {
          "fill-color": color,
          "fill-opacity": 0.20,
        },
      });

      map.addLayer({
        id: borderLayerId,
        type: "line",
        source: sourceId,
        layout: {},
        paint: {
          "line-color": color, // Set the border color; adjust as needed
          "line-width": 2, // Set the border width; adjust as needed
        },
      });

      map.addLayer({
        id: borderLabelId,
        type: "symbol",
        source: sourceId,
        layout: {
          "text-field": "15 MIN",
          "text-size": 12,
          "text-font": ["DIN Offc Pro Bold", "Arial Unicode MS Bold"],
          "text-offset": [0, 0],
          "text-anchor": "center",
          "symbol-placement": "line",
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": color,
          "text-halo-color": getContrastYIQ(color),
          "text-halo-width": 0.5,
        },
      });
    }
  }, [removeIsochroneLayers]);

  // Helper to clear all markers, popups and isochrone layers
  const clearMarkersAndIsochrones = useCallback(() => {
    const map = mapRef.current;
    
    // Remove all markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    
    // Remove all popups
    popupsRef.current.forEach(popup => popup.remove());
    popupsRef.current = [];
    
    // Remove all isochrone layers
    if (map) {
      activeIsochronesRef.current.forEach((_, index) => {
        removeIsochroneLayers(map, index);
      });
    }
    activeIsochronesRef.current = [];
  }, [removeIsochroneLayers]);

  // Helper to add markers for a given day
  const addMarkersForDay = useCallback((map: mapboxgl.Map, day: string) => {
    const selectedCalendar = JSON.parse(
      localStorage.getItem(`selectedCalendar_${term}_${year}`) || "{}"
    );

    if (!selectedCalendar || !Array.isArray(selectedCalendar.combination))
      return;

    const { combination } = selectedCalendar;

    const coords: coordsProps[] = [];

    // Filter and create markers based on the selected day
    combination.forEach((section: any) => {
      section.meetTimes.forEach((meet: any) => {
        if (meet.meetDays.includes(day)) {
          const buildingCode = meet.meetBldgCode.replace(/^0+/, '');
          if (buildingCoords.features[buildingCode]) {
            const { Longitude, Latitude } =
              buildingCoords.features[buildingCode].properties;
            coords.push({
              name:
                section.courseCode +
                " " +
                convert24to12(meet.meetTimeBegin, 0) +
                " - " +
                convert24to12(meet.meetTimeEnd, 1),
              location: { longitude: Longitude, latitude: Latitude },
              color: section.color,
            });
          }
        }
      });
    });

    // Merge coordinates with identical locations
    const mergedCoords = coords.reduce((acc: coordsProps[], current) => {
      const found = acc.find(
        (item) =>
          item.location.longitude === current.location.longitude &&
          item.location.latitude === current.location.latitude
      );
      if (found) {
        found.name += `\n${current.name}`;
      } else {
        acc.push(current);
      }
      return acc;
    }, []);

    mergedCoords.forEach((coord, index) => {
      const el = document.createElement("div");
      el.className = "marker";
      el.innerHTML = `<svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="map-pin" class="svg-inline--fa fa-map-pin pin-icon" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 180"><path fill="${coord.color}" shape-rendering="geometricPrecision" d="M136,127.42V232a8,8,0,0,1-16,0V127.42a56,56,0,1,1,16,0Z"></path></svg>`;
      el.style.width = "50px";
      el.style.height = "50px";
      (el.children[0] as HTMLElement).style.stroke = "black";
      (el.children[0] as HTMLElement).style.strokeWidth = "4px";

      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 25,
        className: "custom-popup",
      })
        .setText(coord.name)
        .setHTML(coord.name.replace(/\n/g, "<br/>")); // Replace newline characters with HTML line breaks

      const marker = new mapboxgl.Marker(el, {
        offset: [-4, -15],
      })
        .setLngLat([coord.location.longitude, coord.location.latitude])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
      popupsRef.current.push(popup);

      const layerId = `isochrone-layer-${index}`;

      // Adding the click event to the marker
      el.addEventListener("click", () => {
        if (map) {
          if (map.getLayer(layerId)) {
            // Toggle visibility of the existing layer
            const visibility = map.getLayoutProperty(layerId, "visibility");
            if (visibility === "visible" || !visibility) {
              map.setLayoutProperty(layerId, "visibility", "none");
              map.setLayoutProperty(
                `isochrone-border-${index}`,
                "visibility",
                "none"
              );
              map.setLayoutProperty(
                `isochrone-label-${index}`,
                "visibility",
                "none"
              );
              (el.children[0] as HTMLElement).style.stroke = "black";
              (el.children[0] as HTMLElement).style.strokeWidth = "4px";
              // Remove from active isochrones
              activeIsochronesRef.current = activeIsochronesRef.current.filter(
                iso => iso.index !== index
              );
            } else {
              map.setLayoutProperty(layerId, "visibility", "visible");
              map.setLayoutProperty(
                `isochrone-border-${index}`,
                "visibility",
                "visible"
              );
              map.setLayoutProperty(
                `isochrone-label-${index}`,
                "visibility",
                "visible"
              );
              (el.children[0] as HTMLElement).style.stroke = "white";
              (el.children[0] as HTMLElement).style.strokeWidth = "10px";
              // Add to active isochrones if not already there
              if (!activeIsochronesRef.current.find(iso => iso.index === index)) {
                activeIsochronesRef.current.push({ coord, index, color: coord.color });
              }
            }
          } else {
            // Fetch and display new isochrone using current transport mode
            fetchIsochrone(map, coord, index, coord.color, transportModeRef.current);
            (el.children[0] as HTMLElement).style.stroke = "white";
            (el.children[0] as HTMLElement).style.strokeWidth = "10px";
            // Track this isochrone as active
            activeIsochronesRef.current.push({ coord, index, color: coord.color });
          }
        }
        popup.remove();
      });

      popup
        .setLngLat([coord.location.longitude, coord.location.latitude])
        .addTo(map);
    });
  }, [term, year, fetchIsochrone]);

  // Initialize map when component mounts or term/year changes
  useEffect(() => {
    let map: mapboxgl.Map | null = null;
    mapLoadedRef.current = false;

    if (mapContainerRef.current) {
      map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/andycn7/cm2mvgs99004701qsb31w406a",
        center: [-82.346, 29.646],
        zoom: 15.25,
      });

      // store map instance in ref so other effects can access it
      mapRef.current = map;

      map.on("load", function () {
        if (map) {
          map.addSource("parking", {
            type: "geojson",
            data: parkingInfo as mapboxgl.GeoJSONSourceRaw["data"],
          });

          // Helper to load an image and register it, returning a Promise
          const loadImg = (url: string, name: string): Promise<void> =>
            new Promise((resolve, reject) =>
              map!.loadImage(url, (error, image) => {
                if (error) return reject(error);
                if (map && image) map.addImage(name, image);
                resolve();
              })
            );

          // Define colors based on ZONE_DES
          const zoneColors = {
            Red: "#e74c3c",
            RedOne: "#ff0000",
            Brown: "#784212",
            Brown3: "#784212",
            Brown3XOB: "#784212",
            Green: "#2ecc71",
            Orange: "#e67e22",
            Blue: "#2980b9",
            OrangeAndBlue: "#FFA500",
            GoldAndSilver: "#C0C0C0",
            GreenAndBrown: "#008000",
            ParkAndRide: "#8B4513",
            Service: "#CCCCCC",
            ServiceXOB: "#CCCCCC",
            Reserved: "#ffffff",
            Visitor: "#f8bbd0",
            ShandsSouth: "#f9e79f",
            AnyPermit: "#fad7a0",
            MedRes: "#3249a6",
            StaffCommuter: "#3249a6",
          };

          map.addLayer({
            id: "parking-fill",
            type: "fill",
            source: "parking",
            paint: {
              "fill-color": [
                "match",
                ["get", "ZONE_DES"],
                "Red",
                zoneColors.Red,
                "Red One",
                zoneColors.RedOne,
                "Brown",
                zoneColors.Brown,
                "Brown 3",
                zoneColors.Brown3,
                "Brown 3 XOB",
                zoneColors.Brown3XOB,
                "Green",
                zoneColors.Green,
                "Orange",
                zoneColors.Orange,
                "Blue",
                zoneColors.Blue,
                "Orange/Blue",
                zoneColors.OrangeAndBlue,
                "Gold/Silver",
                zoneColors.GoldAndSilver,
                "Green/Brown",
                zoneColors.GreenAndBrown,
                "Park and Ride",
                zoneColors.ParkAndRide,
                "Service",
                zoneColors.Service,
                "Service XOB",
                zoneColors.ServiceXOB,
                "Reserved",
                zoneColors.Reserved,
                "Visitor",
                zoneColors.Visitor,
                "Shands South",
                zoneColors.ShandsSouth,
                "Any Permit",
                zoneColors.AnyPermit,
                "Any Permit*",
                zoneColors.AnyPermit,
                "Med Res",
                zoneColors.MedRes,
                "Staff Commuter",
                zoneColors.StaffCommuter,
                "#3249a6", // Default color if no match
              ],
              "fill-opacity": 0.5,
              "fill-emissive-strength": 0.4,
            },
            
          });

          // Add parking-stripes layer only after both stripe images are loaded
          Promise.all([
            loadImg("/images/orange-blue-stripes-smaller.png", "orange-blue-stripes"),
            loadImg("/images/gold-stripes.png", "gold-stripes"),
          ]).then(() => {
            if (!map) return;
            map.addLayer({
              id: "parking-stripes",
              type: "fill",
              source: "parking",
              paint: {
                "fill-pattern": [
                  "match",
                  ["get", "ZONE_DES"],
                  "Orange/Blue",
                  "orange-blue-stripes",
                  "Gold/Silver",
                  "gold-stripes",
                  "",
                ],
                "fill-opacity": [
                  "match",
                  ["get", "ZONE_DES"],
                  "Orange/Blue",
                  1,
                  "Gold/Silver",
                  0.5,
                  1,
                ],
                "fill-emissive-strength": 0.4,
              },
            });
          }).catch(console.error);

          map.addSource("scooter-parking-points", {
            type: "geojson",
            data: scooterParking as GeoJSON.FeatureCollection,
          });

          // Add scooter layer only after the scooter image is loaded
          loadImg("/images/scooter.png", "scooter").then(() => {
            if (!map) return;
            map.addLayer({
              id: "scooter-parking-points-layer",
              type: "symbol",
              source: "scooter-parking-points",
              layout: {
                "icon-image": "scooter",
                "icon-size": 0.8,
              },
            });
          }).catch(console.error);

        }

        if (map) {
          map.on("click", "parking-fill", function (e) {
            if (e.features && e.features.length > 0) {
              const feature = e.features[0];
              // Ensure the geometry is a Polygon for accessing coordinates
              if (feature.geometry.type === "Polygon") {
                const description = feature.properties!.CUSTOM_POPUP;

                new mapboxgl.Popup()
                  .setLngLat([e.lngLat.lng, e.lngLat.lat])
                  .setHTML(description)
                  .addTo(map!);
              }
            }
          });

          // Change the cursor to a pointer when the mouse is over the parking-fill layer.
          map.on("mouseenter", "parking-fill", function () {
            map!.getCanvas().style.cursor = "pointer";
          });

          // Change it back to a pointer when it leaves.
          map.on("mouseleave", "parking-fill", function () {
            map!.getCanvas().style.cursor = "";
          });
        }

        if (map) map.addControl(new mapboxgl.NavigationControl(), "top-right");

        // Mark map as loaded so marker effect can run
        mapLoadedRef.current = true;

        // Add initial markers for the default day
        if (map) {
          addMarkersForDay(map, selectedDay);
        }
      });
    }

    // Clean up on unmount or when term/year changes
    return () => {
      clearMarkersAndIsochrones();
      if (map) {
        map.remove();
        mapRef.current = null;
        mapLoadedRef.current = false;
      }
    };
    // Only reinitialize map when term or year changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, year]);

  // Update markers when selectedDay changes (without reinitializing the map)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) return;

    // Clear existing markers and isochrones
    clearMarkersAndIsochrones();

    // Add new markers for the selected day
    addMarkersForDay(map, selectedDay);
  }, [selectedDay, addMarkersForDay, clearMarkersAndIsochrones]);

  // Refetch isochrones when transportMode changes (without reinitializing markers)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) return;

    // Refetch all active isochrones with the new transport mode
    const activeIsochrones = [...activeIsochronesRef.current];
    activeIsochrones.forEach(({ coord, index, color }) => {
      fetchIsochrone(map, coord, index, color, transportMode);
    });
  }, [transportMode, fetchIsochrone]);

  // Toggle fullscreen for map container and prevent body scrolling when open
  useEffect(() => {
    const mappp = mapContainerRef.current;
    const mapEl = mappp && mappp.parentElement && mappp.parentElement.parentElement;
    if (mapEl instanceof HTMLElement) {
      if (mapFullscreen) {
        mapEl.classList.add('fullscreen-map');
        mapEl.classList.remove('map-container');
      } else {
        mapEl.classList.remove('fullscreen-map');
        mapEl.classList.add('map-container');
      }
    }

    document.body.style.overflow = mapFullscreen ? 'hidden' : '';

    const mapInstance = mapRef.current;
    if (mapInstance) {
      // Ensure Mapbox recalculates layout after CSS changes
      requestAnimationFrame(() => mapInstance.resize());
      const t = setTimeout(() => mapInstance.resize(), 150);
      return () => {
        clearTimeout(t);
        document.body.style.overflow = '';
      };
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [mapFullscreen]);

  return (
    <div>
      <div className="mappp" ref={mapContainerRef} style={{ width: "100%" }} />
      <div className="day-selector">
        {/* <p className="text-center">Day</p> */}
        {["M", "T", "W", "R", "F"].map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            style={{
              margin: "0 4px",
              padding: "0 4px",
              backgroundColor: selectedDay === day ? "grey" : "initial",
              color: selectedDay === day ? "white" : "black",
              fontWeight: "bold",
              borderRadius: "4px",
            }}
          >
            {day}
          </button>
        ))}
      </div>
      {/* Fullscreen toggle button - matches style of day/transport buttons */}
      {isLargeScreen && (
        <div className="fullscreen-button">
          <button
            type="button"
            onClick={() => setMapFullscreen((s) => !s)}
            title={mapFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            style={{
              margin: "0 4px",
              padding: "2px 1px",
              backgroundColor: mapFullscreen ? "grey" : "initial",
              color: mapFullscreen ? "white" : "black",
              fontWeight: "bold",
              borderRadius: "4px",
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem'
            }}
          >
            {mapFullscreen ? <MdFullscreenExit /> : <MdFullscreen />}
          </button>
        </div>
      )}
      <div className="mode-selector">
        {/* <p className="text-center">Transportation</p> */}
        {["walking", "cycling", "driving"].map((mode) => (
          <button
            key={mode}
            onClick={() => setTransportMode(mode)}
            style={{
              margin: "0 4px",
              padding: "4px 4px",
              backgroundColor: transportMode === mode ? "grey" : "initial",
              color: transportMode === mode ? "white" : "black",
              fontWeight: "bold",
              borderRadius: "4px",
              fontSize: "1.25rem",
            }}
          >
            {mode === "walking" ? (
              <FaPersonWalking />
            ) : mode === "cycling" ? (
              <MdOutlinePedalBike />
            ) : (
              mode === "driving" && <PiMopedFill />
            )}
          </button>
        ))}
      </div>
      <div
        className="help-overlay"
        style={{ display: showHelp ? "block" : "none" }}
        onClick={() => setShowHelp(!showHelp)}
      />
      <div
        className="help-content"
        style={{ display: showHelp ? "block" : "none" }}
      >
        <p>
          Select the day of the week to view your class locations.
        </p>
        <hr
          style={{
            height: "1px",
            borderWidth: "0",
            color: "gray",
            backgroundColor: "gray",
            marginTop: "2px",
            marginBottom: "2px",
          }}
        />
        <p>
          Select your mode of transportation and click on the markers to view
          the reachable area within 15 minutes (passing).
        </p>
      </div>
      <button
        type="button"
        className="question-mark-button inline-block rounded-full bg-primary p-2 uppercase leading-normal text-white shadow-[0_4px_9px_-4px_#ff7f1f] transition duration-150 ease-in-out hover:bg-primary-600 hover:shadow-[0_8px_9px_-4px_rgba(255,127,31,0.3),0_4px_18px_0_rgba(255,127,31,0.2)] focus:bg-primary-600 focus:shadow-[0_8px_9px_-4px_rgba(255,127,31,0.3),0_4px_18px_0_rgba(255,127,31,0.2)] focus:outline-none focus:ring-0 active:bg-primary-700 active:shadow-[0_8px_9px_-4px_rgba(255,127,31,0.3),0_4px_18px_0_rgba(255,127,31,0.2)]"
        style={{
          backgroundColor: "#d46919",
        }}
        onClick={() => setShowHelp(!showHelp)}
      >
        <svg
          viewBox="0 0 48 48"
          xmlns="http://www.w3.org/2000/svg"
          fill="#ffffff"
          width="24px"
          height="24px"
        >
          <path d="M24.3,6A11.2,11.2,0,0,0,16,9.3a11,11,0,0,0-3.5,8.2,2.5,2.5,0,0,0,5,0,6.5,6.5,0,0,1,2-4.7A6.2,6.2,0,0,1,24.2,11a6.5,6.5,0,0,1,1,12.9,4.4,4.4,0,0,0-3.7,4.4v3.2a2.5,2.5,0,0,0,5,0V28.7a11.6,11.6,0,0,0,9-11.5A11.7,11.7,0,0,0,24.3,6Z" />
          <circle cx="24" cy="39.5" r="2.5" />
        </svg>
      </button>
    </div>
  );
};

export default Map;
