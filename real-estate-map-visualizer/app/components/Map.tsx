// app/components/Map.tsx

import Map, { Marker, Popup } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useState } from "react";

const LOCATIONS = [
  {
    id: 1,
    longitude: -74.006,
    latitude: 40.7128,
    title: "New York",
    description: "Population: 8.3M",
  },
  {
    id: 2,
    longitude: -118.2437,
    latitude: 34.0522,
    title: "Los Angeles",
    description: "Population: 4M",
  },
  {
    id: 3,
    longitude: -87.6298,
    latitude: 41.8781,
    title: "Chicago",
    description: "Population: 2.7M",
  },
];

export default function MapComponent() {
  const [selectedLocation, setSelectedLocation] = useState(null);

  return (
    <Map
      mapboxAccessToken="pk.eyJ1Ijoic3ZheXNlciIsImEiOiJjbGgwbzl5NXcwdmMzM2VwdTkya2J6cDVmIn0.VrQewCt9w1K8QPsLzuDZjg"
      initialViewState={{ longitude: -100, latitude: 40, zoom: 3.5 }}
      style={{ width: "100%", height: "100vh" }}
      mapStyle="mapbox://styles/mapbox/streets-v11"
    >
      {LOCATIONS.map((location) => (
        <Marker
          key={location.id}
          longitude={location.longitude}
          latitude={location.latitude}
          anchor="bottom"
          onClick={() => setSelectedLocation(location)}
        />
      ))}

      {selectedLocation && (
        <Popup
          longitude={selectedLocation.longitude}
          latitude={selectedLocation.latitude}
          anchor="top"
          onClose={() => setSelectedLocation(null)}
          closeOnClick={false}
        >
          <h3>{selectedLocation.title}</h3>
          <p>{selectedLocation.description}</p>
        </Popup>
      )}
    </Map>
  );
}