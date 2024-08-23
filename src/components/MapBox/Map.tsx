import { useRef, useEffect, useState } from "react";
import mapboxgl, { MapboxGeoJSONFeature } from "mapbox-gl";
import rawCoords from "../../data/buildingCoords.json";
import parkingInfo from "../../data/parking_polys.json";
import scooterParking from "../../data/scooterParking.json";
import { MdOutlinePedalBike } from "react-icons/md";
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

const Map = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [selectedDay, setSelectedDay] = useState<string>("M"); // Example selected day, could be set based on user input
  const [transportMode, setTransportMode] = useState<string>("walking");
  const [showHelp, setShowHelp] = useState(true);

  // Function to fetch isochrone data and create a layer
  const fetchIsochrone = async (
    map: mapboxgl.Map,
    coord: coordsProps,
    index: number,
    color: string
  ) => {
    const url = `https://api.mapbox.com/isochrone/v1/mapbox/${transportMode}/${coord.location.longitude},${coord.location.latitude}?contours_minutes=15&polygons=true&access_token=${mapboxgl.accessToken}`;
    const response = await fetch(url);
    const data = await response.json();

    if (map && data.features) {
      const sourceId = `isochrone-source-${index}`;
      const layerId = `isochrone-layer-${index}`;
      const borderLayerId = `isochrone-border-${index}`;
      const borderLabelId = `isochrone-label-${index}`;

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
          "fill-opacity": 0.05,
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
  };

  // Initialize map when component mounts
  useEffect(() => {
    let map: mapboxgl.Map | null = null;

    if (mapContainerRef.current) {
      map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/andycn7/clwx270uy005701nm9xs3eq9o",
        center: [-82.347, 29.645],
        zoom: 14.6,
        // cooperativeGestures: true,
      });

      map.on("load", function () {
        if (map) {
          map.addSource("parking", {
            type: "geojson",
            data: parkingInfo as mapboxgl.GeoJSONSourceRaw["data"],
          });

          map.loadImage(
            "/images/orange-blue-stripes-smaller.png",
            function (error, image) {
              if (error) throw error;

              if (map && image) map.addImage("orange-blue-stripes", image);
            }
          );

          map.loadImage("/images/gold-stripes.png", function (error, image) {
            if (error) throw error;

            if (map && image) map.addImage("gold-stripes", image);
          });
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
            },
          });

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
            },
          });

          map.addLayer({
            id: "add-3d-buildings",
            source: "composite",
            "source-layer": "building",
            filter: ["==", "extrude", "true"],
            type: "fill-extrusion",
            minzoom: 14.1,
            paint: {
              "fill-extrusion-color": "#2F2F2F",
              "fill-extrusion-height": [
                "interpolate",
                ["linear"],
                ["zoom"],
                14.1,
                0,
                14.15,
                ["get", "height"],
              ],
              "fill-extrusion-base": [
                "interpolate",
                ["linear"],
                ["zoom"],
                14.1,
                0,
                14.15,
                ["get", "min_height"],
              ],
              "fill-extrusion-opacity": 0.6,
            },
          });

          map.loadImage("/images/scooter.png", function (error, image) {
            if (error) throw error;

            if (map && image) map.addImage("scooter", image);
          });

          map.addSource("scooter-parking-points", {
            type: "geojson",
            data: scooterParking as GeoJSON.FeatureCollection,
          });

          map.addLayer({
            id: "scooter-parking-points-layer",
            type: "symbol",
            source: "scooter-parking-points",
            layout: {
              "icon-image": "scooter",
              "icon-size": 0.8,
            },
          });

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

        const selectedCalendar = JSON.parse(
          localStorage.getItem("selectedCalendar") || "{}"
        );

        if (!selectedCalendar || !Array.isArray(selectedCalendar.combination))
          return;

        const { combination } = selectedCalendar;

        const coords: coordsProps[] = [];

        // Filter and create markers based on the selected day
        combination.forEach((section: any) => {
          section.meetTimes.forEach((meet: any) => {
            if (meet.meetDays.includes(selectedDay)) {
              if (buildingCoords.features[meet.meetBldgCode]) {
                const buildingCode = meet.meetBldgCode;
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

          new mapboxgl.Marker(el)
            .setLngLat([coord.location.longitude, coord.location.latitude])
            .setPopup(popup)
            .addTo(map!);

          const layerId = `isochrone-layer-${index}`;

          // Adding the click event to the marker
          el.addEventListener("click", () => {
            if (map) {
              if (map.getLayer(layerId)) {
                // Toggle visibility of the existing layer
                // console.log(map.getLayoutProperty(layerId, "visibility"));
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
                }
              } else {
                // Fetch and display new isochrone
                fetchIsochrone(map!, coord, index, coord.color);
                (el.children[0] as HTMLElement).style.stroke = "white";
                (el.children[0] as HTMLElement).style.strokeWidth = "10px";
              }
            }
            popup.remove();
          });

          if (map)
            popup
              .setLngLat([coord.location.longitude, coord.location.latitude])
              .addTo(map);
        });
      });
    }

    // Clean up on unmount
    return () => {
      if (map) {
        map.remove();
      }
    };
  }, [selectedDay, transportMode]);

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
