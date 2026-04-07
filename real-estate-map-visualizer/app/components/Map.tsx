"use client";

// app/components/Map.tsx — Week 5-6: GraphQL + Mapbox parcel integration

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import Map, { Source, Layer, MapRef } from "react-map-gl/mapbox";
import type { FillLayer, LineLayer, MapMouseEvent } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useQuery, gql } from "@apollo/client";
import { useRouter, useSearchParams } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReonomyProperty {
  parcel_id: string | null;
  // Building
  year_built: number | null;
  year_renovated: number | null;
  floors: number | null;
  sum_buildings_nbr: number | null;
  existing_floor_area_ratio: number | null;
  commercial_units: number | null;
  residential_units: number | null;
  total_units: number | null;
  building_area: number | null;
  // Lot
  asset_type: string | null;
  lot_size_sqft: number | null;
  lot_size_acres: number | null;
  zoning: string | null;
  census_tract: string | null;
  opp_zone: boolean | null;
  // Location
  msa_name: string | null;
  fips_county: string | null;
  municipality: string | null;
  mcd_name: string | null;
  neighborhood_name: string | null;
  legal_description: string | null;
}

interface ReonomyPropertiesData {
  reonomyProperties: {
    items: ReonomyProperty[];
  };
}

// ─── GraphQL Queries ──────────────────────────────────────────────────────────

const GET_REONOMY_PROPERTY = gql`
  query GetReonomyProperty($parcelId: String!) {
    reonomyProperties(filter: { parcel_id: { eq: $parcelId } }) {
      items {
        parcel_id
        year_built
        year_renovated
        floors
        sum_buildings_nbr
        existing_floor_area_ratio
        commercial_units
        residential_units
        total_units
        building_area
        asset_type
        lot_size_sqft
        lot_size_acres
        zoning
        census_tract
        opp_zone
        msa_name
        fips_county
        municipality
        mcd_name
        neighborhood_name
        legal_description
      }
    }
  }
`;

// ─── Parcel Layer Styles ───────────────────────────────────────────────────────

const parcelFillLayer: FillLayer = {
  id: "parcels-fill",
  type: "fill",
  source: "parcels",
  "source-layer": "attom-parcels",
  paint: {
    "fill-color": [
      "case",
      ["boolean", ["feature-state", "selected"], false],
      "#FF6B35",
      ["boolean", ["feature-state", "hover"], false],
      "#6BCB77",
      "#4A90D9",
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
      "#FF4500",
      ["boolean", ["feature-state", "hover"], false],
      "#2E8B57",
      "#2C6FAC",
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

// ─── Helper: Format Numbers ───────────────────────────────────────────────────

function formatNumber(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}

function formatBoolean(value: boolean | null): string {
  if (value === null) return "—";
  return value ? "Yes" : "No";
}

function fmt(value: number | string | null | undefined, unit?: string): string {
  if (value === null || value === undefined) return "—";
  const formatted = typeof value === "number" ? formatNumber(value) : value;
  return unit && unit.trim() ? `${formatted} ${unit.trim()}` : formatted;
}

// ─── Sidebar Component ────────────────────────────────────────────────────────

function Sidebar({
  parcelId,
  onClose,
}: {
  parcelId: string | null;
  onClose: () => void;
}) {
  const { loading, error, data } = useQuery<ReonomyPropertiesData>(
    GET_REONOMY_PROPERTY,
    {
      variables: { parcelId },
      skip: !parcelId,
    },
  );

  const property = data?.reonomyProperties?.items?.[0] ?? null;

  return (
    <aside style={sidebarStyle}>
      {/* Header */}
      <div style={sidebarHeaderStyle}>
        <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#1a1a2e" }}>
          Parcel Details
        </h2>
        <button onClick={onClose} style={closeBtnStyle} aria-label="Close sidebar">
          ✕
        </button>
      </div>

      {/* Parcel ID pill */}
      {parcelId && (
        <div style={parcelIdStyle}>
          <span style={{ fontSize: "10px", color: "#888", display: "block", marginBottom: 2 }}>
            PARCEL ID
          </span>
          <span style={{ fontSize: "12px", fontFamily: "monospace", color: "#333", wordBreak: "break-all" }}>
            {parcelId}
          </span>
        </div>
      )}

      {/* States */}
      {!parcelId && (
        <div style={emptyStateStyle}>
          <div style={{ fontSize: "36px", marginBottom: 12 }}>🗺️</div>
          <p style={{ margin: 0, color: "#888", fontSize: "14px", textAlign: "center" }}>
            Click a parcel on the map to view its details.
          </p>
        </div>
      )}

      {parcelId && loading && (
        <div style={emptyStateStyle}>
          <div style={spinnerStyle} />
          <p style={{ margin: "12px 0 0", color: "#888", fontSize: "13px" }}>
            Fetching property data…
          </p>
        </div>
      )}

      {parcelId && error && (
        <div style={{ ...emptyStateStyle, gap: 8 }}>
          <div style={{ fontSize: "28px" }}>⚠️</div>
          <p style={{ margin: 0, color: "#c0392b", fontSize: "13px", textAlign: "center" }}>
            Failed to load property data.
          </p>
          <p style={{ margin: 0, color: "#999", fontSize: "11px", textAlign: "center" }}>
            {error.message}
          </p>
        </div>
      )}

      {parcelId && !loading && !error && !property && (
        <div style={emptyStateStyle}>
          <div style={{ fontSize: "28px" }}>🔍</div>
          <p style={{ margin: 0, color: "#888", fontSize: "13px", textAlign: "center" }}>
            No property record found for this parcel.
          </p>
        </div>
      )}

      {property && (
        <div style={{ overflowY: "auto", flex: 1 }}>
          {/* Building */}
          <Section title="Building">
            <Row label="Year Built" value={fmt(property.year_built)} />
            <Row label="Year Renovated" value={fmt(property.year_renovated)} />
            <Row label="Stories" value={fmt(property.floors)} />
            <Row label="Number of Buildings" value={fmt(property.sum_buildings_nbr)} />
            <Row label="Existing Floor Area Ratio" value={fmt(property.existing_floor_area_ratio)} />
            <Row label="Commercial Units" value={fmt(property.commercial_units)} />
            <Row label="Residential Units" value={fmt(property.residential_units)} />
            <Row label="Total Units" value={fmt(property.total_units)} />
            <Row label="Building Area" value={fmt(property.building_area, "sf")} />
          </Section>

          {/* Lot */}
          <Section title="Lot">
            <Row label="Property Type" value={fmt(property.asset_type)} />
            <Row label="Lot Area SF" value={fmt(property.lot_size_sqft, "sf")} />
            <Row label="Lot Area Acres" value={fmt(property.lot_size_acres, "acres")} />
            <Row label="Zoning" value={fmt(property.zoning)} />
            <Row label="Census Tract" value={fmt(property.census_tract)} />
            <Row label="Opportunity Zone" value={formatBoolean(property.opp_zone)} />
          </Section>

          {/* Location */}
          <Section title="Location">
            <Row label="Metropolitan Statistical Area" value={fmt(property.msa_name)} />
            <Row label="County" value={fmt(property.fips_county)} />
            <Row label="Municipality" value={fmt(property.municipality)} />
            <Row label="Minor Civil Division" value={fmt(property.mcd_name)} />
            <Row label="Neighborhood" value={fmt(property.neighborhood_name)} />
            <Row label="Legal" value={fmt(property.legal_description)} />
          </Section>

        </div>
      )}
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 0 }}>
      <div style={sectionHeaderStyle}>{title}</div>
      <div style={{ padding: "0 16px" }}>{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div style={rowStyle}>
      <span style={rowLabelStyle}>{label}</span>
      <span style={rowValueStyle}>{value ?? "—"}</span>
    </div>
  );
}

// ─── Main Map Component ───────────────────────────────────────────────────────

export default function MapComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const parcelFromUrl = searchParams.get("parcel");
  const [pendingParcelId, setSelectedParcelId] = useState<string | null>(parcelFromUrl);

  const mapRef = useRef<MapRef>(null);
  const hoveredFeatureRef = useRef<{ id: string | number; source: string; sourceLayer: string } | null>(null);
  const selectedFeatureRef = useRef<{ id: string | number; source: string; sourceLayer: string } | null>(null);
  const lastSyncedParcelRef = useRef<string | null>(parcelFromUrl);

  const selectionFeatureRef = useMemo(
    () => ({
      source: "parcels",
      sourceLayer: "attom-parcels",
    }),
    [],
  );

  useEffect(() => {
    lastSyncedParcelRef.current = parcelFromUrl;
  }, [parcelFromUrl]);

  const activeParcelId = pendingParcelId ?? parcelFromUrl;
  const sidebarOpen = activeParcelId !== null;

  useEffect(() => {
    if (activeParcelId === lastSyncedParcelRef.current) return;

    const params = new URLSearchParams(searchParams.toString());
    if (activeParcelId) {
      params.set("parcel", activeParcelId);
    } else {
      params.delete("parcel");
    }

    lastSyncedParcelRef.current = activeParcelId;
    const nextQuery = params.toString();
    router.replace(nextQuery ? `?${nextQuery}` : "?", { scroll: false });
  }, [router, searchParams, activeParcelId]);
  // ── Feature-state helpers ──────────────────────────────────────────────────

  const clearHover = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map || !hoveredFeatureRef.current) return;
    map.setFeatureState(hoveredFeatureRef.current, { hover: false });
    hoveredFeatureRef.current = null;
  }, []);

  const clearSelected = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map || !selectedFeatureRef.current) return;
    map.setFeatureState(selectedFeatureRef.current, { selected: false });
    selectedFeatureRef.current = null;
  }, []);

  useEffect(() => {
    if (!parcelFromUrl) {
      clearSelected();
      return;
    }

    const map = mapRef.current?.getMap();
    if (!map) return;

    const features = map.querySourceFeatures("parcels", {
      sourceLayer: selectionFeatureRef.sourceLayer,
      filter: ["==", ["to-string", ["get", "ID"]], parcelFromUrl],
    });
    const feature = features[0];
    if (feature?.id === undefined) return;

    if (selectedFeatureRef.current?.id === feature.id) return;

    clearSelected();

    const featureRef = {
      ...selectionFeatureRef,
      id: feature.id,
    };
    map.setFeatureState(featureRef, { selected: true });
    selectedFeatureRef.current = featureRef;
  }, [clearSelected, parcelFromUrl, selectionFeatureRef]);

  // ── Mouse move: hover highlighting ────────────────────────────────────────

  const handleMouseMove = useCallback(
    (event: MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }) => {
      const map = mapRef.current?.getMap();
      if (!map) return;

      const features = map.queryRenderedFeatures(event.point, {
        layers: ["parcels-fill"],
      });

      if (features.length === 0) {
        clearHover();
        map.getCanvas().style.cursor = "";
        return;
      }

      const feature = features[0];
      const featureId = feature.id;
      if (featureId === undefined) return;

      // Skip re-setting hover if same feature
      if (hoveredFeatureRef.current && hoveredFeatureRef.current.id === featureId) return;

      clearHover();

      const featureRef = {
        id: featureId,
        source: "parcels",
        sourceLayer: "attom-parcels",
      };
      map.setFeatureState(featureRef, { hover: true });
      hoveredFeatureRef.current = featureRef;
      map.getCanvas().style.cursor = "pointer";
    },
    [clearHover],
  );

  // ── Mouse leave: remove hover ─────────────────────────────────────────────

  const handleMouseLeave = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    clearHover();
    map.getCanvas().style.cursor = "";
  }, [clearHover]);

  // ── Click: select parcel and open sidebar ─────────────────────────────────

  const handleClick = useCallback(
    (event: MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }) => {
      const map = mapRef.current?.getMap();
      if (!map) return;

      const features = map.queryRenderedFeatures(event.point, {
        layers: ["parcels-fill"],
      });

      if (features.length === 0) {
        // Clicked empty area — deselect
        clearSelected();
        setSelectedParcelId(null);
        return;
      }

      const feature = features[0];
      const rawParcelId = feature.properties?.ID;
      const parcelId = rawParcelId == null ? null : String(rawParcelId);
      const featureId = feature.id;

      if (!parcelId) {
        clearSelected();
        setSelectedParcelId(null);
        return;
      }

      // Clear previous selected state
      clearSelected();

      // Set new selected state
      if (featureId !== undefined) {
        const featureRef = {
          id: featureId,
          source: "parcels",
          sourceLayer: "attom-parcels",
        };
        map.setFeatureState(featureRef, { selected: true });
        selectedFeatureRef.current = featureRef;
      }

      setSelectedParcelId(parcelId);
    },
    [clearSelected],
  );

  const handleSidebarClose = useCallback(() => {
    clearSelected();
    setSelectedParcelId(null);
  }, [clearSelected]);

  return (
    <div style={{ display: "flex", width: "100%", height: "calc(100vh - 64px)" }}>
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      {sidebarOpen && (
        <Sidebar parcelId={activeParcelId} onClose={handleSidebarClose} />
      )}

      {/* ── Map ─────────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, position: "relative" }}>
        <Map
          ref={mapRef}
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          initialViewState={{ longitude: -100, latitude: 40, zoom: 3.5 }}
          style={{ width: "100%", height: "100%" }}
          mapStyle="mapbox://styles/mapbox/streets-v11"
          interactiveLayerIds={["parcels-fill", "parcels-line"]}
          onLoad={() => {
            if (!parcelFromUrl) return;

            const map = mapRef.current?.getMap();
            if (!map) return;

            const features = map.querySourceFeatures("parcels", {
              sourceLayer: selectionFeatureRef.sourceLayer,
              filter: ["==", ["to-string", ["get", "ID"]], parcelFromUrl],
            });
            const feature = features[0];
            if (feature?.id === undefined) return;

            const featureRef = {
              ...selectionFeatureRef,
              id: feature.id,
            };
            map.setFeatureState(featureRef, { selected: true });
            selectedFeatureRef.current = featureRef;
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
        >
          {/* Parcel boundaries vector tile source */}
          <Source
            id="parcels"
            type="vector"
            url="mapbox://svayser.parcel-boundaries"
          >
            <Layer {...parcelFillLayer} />
            <Layer {...parcelLineLayer} />
          </Source>
        </Map>

        {/* Hint text when sidebar is closed */}
        {!sidebarOpen && (
          <div style={hintStyle}>
            Click a parcel to view details
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const sidebarStyle: React.CSSProperties = {
  width: "340px",
  minWidth: "340px",
  height: "100%",
  background: "#f9f9fb",
  borderRight: "1px solid #e0e0e8",
  display: "flex",
  flexDirection: "column",
  overflowY: "hidden",
  boxShadow: "2px 0 8px rgba(0,0,0,0.06)",
  zIndex: 10,
};

const sidebarHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 16px 12px",
  borderBottom: "1px solid #e0e0e8",
  background: "#fff",
  flexShrink: 0,
};

const closeBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: "16px",
  color: "#888",
  padding: "4px 6px",
  borderRadius: "4px",
  lineHeight: 1,
};

const parcelIdStyle: React.CSSProperties = {
  padding: "10px 16px",
  background: "#eef1f7",
  borderBottom: "1px solid #e0e0e8",
  flexShrink: 0,
};

const emptyStateStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px 20px",
};

const spinnerStyle: React.CSSProperties = {
  width: "32px",
  height: "32px",
  border: "3px solid #e0e0e8",
  borderTop: "3px solid #4A90D9",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#888",
  padding: "12px 16px 6px",
  background: "#f9f9fb",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 8,
  padding: "7px 0",
  borderBottom: "1px solid #f0f0f4",
  fontSize: "13px",
};

const rowLabelStyle: React.CSSProperties = {
  color: "#777",
  flexShrink: 0,
  maxWidth: "45%",
};

const rowValueStyle: React.CSSProperties = {
  color: "#1a1a2e",
  fontWeight: 500,
  textAlign: "right",
  wordBreak: "break-word",
};

const hintStyle: React.CSSProperties = {
  position: "absolute",
  bottom: 24,
  left: "50%",
  transform: "translateX(-50%)",
  background: "rgba(0,0,0,0.65)",
  color: "#fff",
  padding: "8px 16px",
  borderRadius: "20px",
  fontSize: "13px",
  pointerEvents: "none",
  whiteSpace: "nowrap",
};
