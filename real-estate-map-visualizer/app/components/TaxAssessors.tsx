"use client";

/**
 * TaxAssessors.tsx
 * Week 3 — GraphQL as a Client
 *
 * Refactored from raw mapbox-gl to react-map-gl.
 */

import { useQuery, gql } from "@apollo/client";
import { useRef, useState, CSSProperties } from "react";
import Map, { Marker, Popup, MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

// ─── 1. Types ─────────────────────────────────────────────────────────────────

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

// ─── 2. GraphQL Query ─────────────────────────────────────────────────────────

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

// ─── 3. Main Component ────────────────────────────────────────────────────────

export function TaxAssessors() {
  const mapRef = useRef<MapRef>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [popup, setPopup] = useState<TaxAssessor | null>(null);

  const { loading, error, data } =
    useQuery<AttomTaxAssessorsData>(GET_TAX_ASSESSORS);

  const validItems =
    data?.attomTaxAssessors.items.filter(
      (
        item,
      ): item is TaxAssessor & {
        PropertyLatitude: number;
        PropertyLongitude: number;
      } => item.PropertyLatitude !== null && item.PropertyLongitude !== null,
    ) ?? [];

  // ── Fly to a property when clicked in the sidebar ────────────────────────

  const flyToProperty = (item: TaxAssessor) => {
    if (
      !mapRef.current ||
      item.PropertyLatitude === null ||
      item.PropertyLongitude === null
    )
      return;
    setSelectedId(item.ATTOM_ID);
    mapRef.current.flyTo({
      center: [item.PropertyLongitude, item.PropertyLatitude],
      zoom: 15,
      speed: 1.2,
      curve: 1.4,
    });
  };

  // ─── 4. Render ──────────────────────────────────────────────────────────────

  return (
    <div style={styles.wrapper}>
      {/* ── Sidebar ── */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h2 style={styles.title}>Properties</h2>
          {data && (
            <span style={styles.count}>
              {data.attomTaxAssessors.items.length} results
            </span>
          )}
        </div>

        {loading && <p style={styles.status}>Loading...</p>}
        {error && (
          <p style={{ ...styles.status, color: "#e87d6d" }}>
            Error: {error.message}
          </p>
        )}

        {data && (
          <ul style={styles.list}>
            {data.attomTaxAssessors.items.map((item, index) => (
              <li
                key={item.ATTOM_ID ?? index}
                style={{
                  ...styles.listItem,
                  ...(selectedId === item.ATTOM_ID
                    ? styles.listItemActive
                    : {}),
                }}
                onClick={() => flyToProperty(item)}
              >
                <span style={styles.itemAddress}>
                  {item.PropertyAddressFull ?? "Unknown address"}
                </span>
                <span style={styles.itemMeta}>
                  ATTOM {item.ATTOM_ID ?? "—"} · Parcel {item.parcel_id ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* ── Map ── */}
      <Map
        ref={mapRef}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        initialViewState={{
          longitude: -74.006,
          latitude: 40.7128,
          zoom: 10,
        }}
        style={styles.map}
        mapStyle="mapbox://styles/mapbox/dark-v11"
      >
        {/* ── Property markers ── */}
        {validItems.map((item) => (
          <Marker
            key={item.ATTOM_ID ?? `${item.PropertyLatitude}-${item.PropertyLongitude}`}
            longitude={item.PropertyLongitude}
            latitude={item.PropertyLatitude}
            anchor="center"
            onClick={() => {
              setSelectedId(item.ATTOM_ID);
              setPopup(item);
            }}
          >
            {/* Custom dot marker with hover highlight */}
            <div
              style={{
                ...styles.markerDot,
                background:
                  selectedId === item.ATTOM_ID || hoveredId === item.ATTOM_ID
                    ? "#f5d08a"
                    : "#e8b86d",
                transform:
                  selectedId === item.ATTOM_ID || hoveredId === item.ATTOM_ID
                    ? "scale(1.6)"
                    : "scale(1)",
              }}
              onMouseEnter={() => setHoveredId(item.ATTOM_ID)}
              onMouseLeave={() => setHoveredId(null)}
            />
          </Marker>
        ))}

        {/* ── Popup for selected marker ── */}
        {popup &&
          popup.PropertyLatitude !== null &&
          popup.PropertyLongitude !== null && (
            <Popup
              longitude={popup.PropertyLongitude}
              latitude={popup.PropertyLatitude}
              anchor="top"
              offset={16}
              closeButton={false}
              onClose={() => setPopup(null)}
            >
              <div style={styles.popupContent}>
                <strong>{popup.PropertyAddressFull ?? "Unknown address"}</strong>
                <br />
                <span style={styles.popupMeta}>
                  ATTOM ID: {popup.ATTOM_ID ?? "—"}
                </span>
              </div>
            </Popup>
          )}
      </Map>
    </div>
  );
}

// ─── 5. Styles ────────────────────────────────────────────────────────────────

const styles: Record<string, CSSProperties> = {
  wrapper: {
    display: "flex",
    height: "100vh",
    width: "100%",
    fontFamily: "'IBM Plex Mono', monospace",
    background: "#0f1117",
    color: "#e8e8e8",
  },
  sidebar: {
    width: "320px",
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    background: "#16181f",
    borderRight: "1px solid #2a2d38",
    overflow: "hidden",
  },
  sidebarHeader: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    padding: "20px 20px 12px",
    borderBottom: "1px solid #2a2d38",
  },
  title: {
    margin: 0,
    fontSize: "13px",
    fontWeight: 600,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#e8b86d",
  },
  count: {
    fontSize: "11px",
    color: "#555",
    letterSpacing: "0.05em",
  },
  status: {
    padding: "20px",
    margin: 0,
    fontSize: "12px",
    color: "#666",
  },
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    overflowY: "auto",
    flex: 1,
  },
  listItem: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "14px 20px",
    borderBottom: "1px solid #1e2028",
    cursor: "pointer",
    transition: "background 0.1s",
  },
  listItemActive: {
    background: "#1e2130",
    borderLeft: "3px solid #e8b86d",
    paddingLeft: "17px",
  },
  itemAddress: {
    fontSize: "12px",
    color: "#d4d4d4",
    lineHeight: 1.4,
  },
  itemMeta: {
    fontSize: "10px",
    color: "#555",
    letterSpacing: "0.03em",
  },
  map: {
    flex: 1,
  },
  markerDot: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    border: "2px solid #fff",
    cursor: "pointer",
    transition: "transform 0.15s ease, background 0.15s ease",
  },
  popupContent: {
    fontFamily: "monospace",
    fontSize: "12px",
    padding: "4px",
  },
  popupMeta: {
    color: "#888",
  },
};
