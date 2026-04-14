"use client";

// app/components/Map.tsx

import React, { useState, useRef } from "react";
import Map, { Marker, Popup, Source, Layer, MapRef } from "react-map-gl/mapbox";
import type { FillLayer, LineLayer } from "mapbox-gl";
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

// ─── Parcel Layer Styles ───────────────────────────────────────────────────────
// Dynamic fill color: highlighted (clicked) > hovered > default
// Uses feature-state for hover/selected states

const parcelFillLayer: FillLayer = {
  id: "parcels-fill",
  type: "fill",
  source: "parcels",
  "source-layer": "attom-parcels",
  paint: {
    "fill-color": [
      "case",
      ["boolean", ["feature-state", "selected"], false],
      "#FF6B35", // Selected/clicked parcel - orange
      ["boolean", ["feature-state", "hover"], false],
      "#6BCB77", // Hovered parcel - green
      "#4A90D9", // Default - blue
    ],
    "fill-opacity": [
      "case",
      ["boolean", ["feature-state", "selected"], false],
      0.6,
      ["boolean", ["feature-state", "hover"], false],
      0.5,
      0.2,
    ],
  },
};

const parcelLineLayer: LineLayer = {
  id: "parcels-line",
  type: "line",
  source: "parcels",
  "source-layer": "attom-parcels",
  paint: {
    "line-color": [
      "case",
      ["boolean", ["feature-state", "selected"], false],
      "#FF4500", // Selected parcel outline - orange-red
      ["boolean", ["feature-state", "hover"], false],
      "#2E8B57", // Hovered parcel outline - sea green
      "#2C6FAC", // Default - blue
    ],
    "line-width": [
      "case",
      ["boolean", ["feature-state", "selected"], false],
      3,
      ["boolean", ["feature-state", "hover"], false],
      2,
      1,
    ],
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function MapComponent() {
  const [selectedProperty, setSelectedProperty] = useState<TaxAssessor | null>(
    null,
  );
  const [parcelId, setParcelId] = useState<string | null>(null);

  const { loading, error, data } =
    useQuery<AttomTaxAssessorsData>(GET_TAX_ASSESSORS);

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
      {loading && <div style={overlayStyle}>Loading properties...</div>}
      {error && (
        <div style={{ ...overlayStyle, color: "#e87d6d" }}>
          Error: {error.message}
        </div>
      )}

      {/* Debug: show the last clicked parcel ID */}
      {parcelId && (
        <div style={{ ...overlayStyle, top: "auto", bottom: 16 }}>
          Parcel ID: {parcelId}
        </div>
      )}

      <Map
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        initialViewState={{ longitude: -100, latitude: 40, zoom: 3.5 }}
        style={{ width: "100%", height: "100vh" }}
        mapStyle="mapbox://styles/mapbox/streets-v11"
        interactiveLayerIds={["parcels-fill", "parcels-line"]}
        onClick={(event) => {
          if (event.features && event.features.length > 0) {
            setParcelId(event.features[0].properties?.ID ?? null);
          }
        }}
      >
        {/* ── Parcel boundaries source + layers ── */}
        <Source
          id="parcels"
          type="vector"
          url="mapbox://svayser.parcel-boundaries"
        >
          <Layer {...parcelFillLayer} />
          <Layer {...parcelLineLayer} />
        </Source>

        {/* ── Property markers from GraphQL ── */}
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

        {/* ── Popup for selected property ── */}
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
