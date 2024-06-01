import { useRef, useEffect, useState } from "react";
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

    if (mapContainerRef.current) {
      map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/gt-scheduler/cktc4yzhm018w17ql65xa802o",
        center: [-82.347, 29.645],
        zoom: 14.6,
        // cooperativeGestures: true,
      });

      const selectedCalendar = JSON.parse(
        localStorage.getItem("selectedCalendar") || "{}"
      );

      if (!selectedCalendar || !Array.isArray(selectedCalendar.combination)) return;

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
        const el = document.createElement('div');
        el.className = 'marker';
        el.innerHTML = '<svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="map-pin" class="svg-inline--fa fa-map-pin pin-icon" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512"><path fill="#c54848" d="M320 144c0 79.5-64.5 144-144 144S32 223.5 32 144S96.5 0 176 0s144 64.5 144 144zM176 80c8.8 0 16-7.2 16-16s-7.2-16-16-16c-53 0-96 43-96 96c0 8.8 7.2 16 16 16s16-7.2 16-16c0-35.3 28.7-64 64-64zM144 480V317.1c10.4 1.9 21.1 2.9 32 2.9s21.6-1 32-2.9V480c0 17.7-14.3 32-32 32s-32-14.3-32-32z"></path></svg>';
        el.style.width = '20px';
        el.style.height = '20px';
        // el.style.backgroundSize = 'cover';

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

        if (map)
          popup
            .setLngLat([coord.location.longitude, coord.location.latitude])
            .addTo(map);
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
