import React, { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import rawCoords from "../../data/buildingCoords.json";
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
};

const Map = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [selectedDay, setSelectedDay] = useState<string>("M"); // Example selected day, could be set based on user input

  // Initialize map when component mounts
  useEffect(() => {
    let map: mapboxgl.Map | null = null;

    const selectedCalendar = JSON.parse(
      localStorage.getItem("selectedCalendar") || "{}"
    );
    const { combination } = selectedCalendar;

    if (mapContainerRef.current) {
      map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/gt-scheduler/cktc4yzhm018w17ql65xa802o",
        center: [-82.3488, 29.6446],
        zoom: 14.6,
        cooperativeGestures: true,
      });

      const coords: coordsProps[] = [];

      // Filter and create markers based on the selected day
      combination.forEach((section: any) => {
        section.meetTimes.forEach((meet: any) => {
          if (meet.meetDays.includes(selectedDay)) {
            const buildingCode = meet.meetBldgCode;
            const { Longitude, Latitude } =
              buildingCoords.features[buildingCode].properties;
            coords.push({
              name: "P" + meet.meetPeriodBegin + " - " + section.display,
              location: { longitude: Longitude, latitude: Latitude },
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

      mergedCoords.forEach((coord) => {
        const popup = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 25,
          className: "custom-popup",
        }).setText(coord.name)
        .setHTML(coord.name.replace(/\n/g, '<br/>'));  // Replace newline characters with HTML line breaks


        new mapboxgl.Marker()
          .setLngLat([coord.location.longitude, coord.location.latitude])
          .setPopup(popup)
          .addTo(map!);
        
        if (map)
          popup.setLngLat([coord.location.longitude, coord.location.latitude]).addTo(map);
      });

      // Add navigation control (the +/- zoom buttons)
      map.addControl(new mapboxgl.NavigationControl(), "top-right");
    }

    // Clean up on unmount
    return () => {
      if (map) {
        map.remove();
      }
    };
  }, [selectedDay]);

  return (
    <div>
      <div
        className="mappp h-[calc(100vh-100px)]"
        ref={mapContainerRef}
        style={{ width: "100%" }}
      />
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 50,
          background: "#fff",
          padding: "5px",
          borderRadius: "5px",
        }}
      >
        {["M", "T", "W", "R", "F"].map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            style={{
              margin: "0 4px",
              backgroundColor: selectedDay === day ? "grey" : "initial",
              color: selectedDay === day ? "white" : "black",
              fontWeight: "bold",
            }}
          >
            {day}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Map;
