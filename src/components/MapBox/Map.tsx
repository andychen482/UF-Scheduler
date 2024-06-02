import { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import rawCoords from "../../data/buildingCoords.json";
import parkingInfo from "../../data/parking_polys.json";
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

const Map = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [selectedDay, setSelectedDay] = useState<string>("M"); // Example selected day, could be set based on user input
  const [transportMode, setTransportMode] = useState<string>("walking");

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
          "fill-opacity": 0.5,
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
          map.addLayer({
            id: "parking-fill",
            type: "fill",
            source: "parking",
            paint: {
              "fill-color": "#3249a6",
              "fill-opacity": 0.5,
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
              "fill-extrusion-color": "#292929",
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
              const buildingCode = meet.meetBldgCode;
              const { Longitude, Latitude } =
                buildingCoords.features[buildingCode].properties;
              coords.push({
                name: "P" + meet.meetPeriodBegin + " - " + section.courseCode,
                location: { longitude: Longitude, latitude: Latitude },
                color: section.color,
              });
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
          el.innerHTML =
            '<svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="map-pin" class="svg-inline--fa fa-map-pin pin-icon" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512"><path fill="#c54848" d="M320 144c0 79.5-64.5 144-144 144S32 223.5 32 144S96.5 0 176 0s144 64.5 144 144zM176 80c8.8 0 16-7.2 16-16s-7.2-16-16-16c-53 0-96 43-96 96c0 8.8 7.2 16 16 16s16-7.2 16-16c0-35.3 28.7-64 64-64zM144 480V317.1c10.4 1.9 21.1 2.9 32 2.9s21.6-1 32-2.9V480c0 17.7-14.3 32-32 32s-32-14.3-32-32z"></path></svg>';
          el.style.width = "20px";
          el.style.height = "20px";

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
                console.log(map.getLayoutProperty(layerId, "visibility"));
                const visibility = map.getLayoutProperty(layerId, "visibility");
                if (visibility === "visible" || !visibility) {
                  map.setLayoutProperty(layerId, "visibility", "none");
                } else {
                  map.setLayoutProperty(layerId, "visibility", "visible");
                }
              } else {
                // Fetch and display new isochrone
                fetchIsochrone(map!, coord, index, coord.color);
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
      <div
        className="mappp"
        ref={mapContainerRef}
        style={{ width: "100%" }}
      />
      <div className="day-selector">
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
    </div>
  );
};

export default Map;
