"use client";

// app/components/Map.tsx

import React, { useState } from "react";
import Map, { Marker, Popup } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useQuery, gql } from "@apollo/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaxAssessor {
  PropertyAddressFull: string | null;
  PropertyLatitude: number | null;
  PropertyLongitude: number | null;
  ATTOM_ID: string | null;
  parcel_id: string | null;
}

interface AttomTaxAssessorsData {
  attomTaxAssessors: {
    items: TaxAssessor[];
  };
}

// ─── Query ────────────────────────────────────────────────────────────────────

const GET_TAX_ASSESSORS = gql`
  query {
    attomTaxAssessors {
      items {
        PropertyAddressFull
        PropertyLatitude
        PropertyLongitude
        ATTOM_ID
        parcel_id
      }
    }
  }
`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function MapComponent() {
  const [selectedProperty, setSelectedProperty] = useState<TaxAssessor | null>(
    null,
  );

  const { loading, error, data } =
    useQuery<AttomTaxAssessorsData>(GET_TAX_ASSESSORS);

  // Filter out properties missing coordinates before rendering markers
  const validProperties =
    data?.attomTaxAssessors.items.filter(
      (
        item,
      ): item is TaxAssessor & {
        PropertyLatitude: number;
        PropertyLongitude: number;
      } => item.PropertyLatitude !== null && item.PropertyLongitude !== null,
    ) ?? [];

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh" }}>
      {/* Loading / error overlays */}
      {loading && <div style={overlayStyle}>Loading properties...</div>}
      {error && (
        <div style={{ ...overlayStyle, color: "#e87d6d" }}>
          Error: {error.message}
        </div>
      )}

      <Map
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        initialViewState={{ longitude: -100, latitude: 40, zoom: 3.5 }}
        style={{ width: "100%", height: "100vh" }}
        mapStyle="mapbox://styles/mapbox/streets-v11"
      >
        {/* Property markers from GraphQL */}
        {validProperties.map((property) => (
          <Marker
            key={
              property.ATTOM_ID ??
              `${property.PropertyLatitude}-${property.PropertyLongitude}`
            }
            longitude={property.PropertyLongitude}
            latitude={property.PropertyLatitude}
            anchor="bottom"
            onClick={() => setSelectedProperty(property)}
          />
        ))}

        {/* Popup for selected property */}
        {selectedProperty &&
          selectedProperty.PropertyLatitude !== null &&
          selectedProperty.PropertyLongitude !== null && (
            <Popup
              longitude={selectedProperty.PropertyLongitude}
              latitude={selectedProperty.PropertyLatitude}
              anchor="top"
              onClose={() => setSelectedProperty(null)}
              closeOnClick={false}
            >
              <h3 style={{ margin: "0 0 4px", fontSize: "13px" }}>
                {selectedProperty.PropertyAddressFull ?? "Unknown address"}
              </h3>
              <p style={{ margin: 0, fontSize: "11px", color: "#666" }}>
                ATTOM ID: {selectedProperty.ATTOM_ID ?? "—"}
              </p>
              <p style={{ margin: 0, fontSize: "11px", color: "#666" }}>
                Parcel: {selectedProperty.parcel_id ?? "—"}
              </p>
            </Popup>
          )}
      </Map>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: "absolute",
  top: 16,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 10,
  background: "rgba(0,0,0,0.7)",
  color: "#fff",
  padding: "8px 16px",
  borderRadius: "6px",
  fontSize: "13px",
  fontFamily: "monospace",
};
