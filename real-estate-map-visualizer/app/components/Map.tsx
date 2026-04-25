"use client";

// app/components/Map.tsx — Week 5-6: GraphQL + Mapbox parcel integration

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import Map, { Source, Layer, MapRef, Marker, NavigationControl } from "react-map-gl/mapbox";
import type { MarkerDragEvent } from "react-map-gl/mapbox";
import type { CircleLayer, FillLayer, LineLayer, MapMouseEvent } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useQuery, useApolloClient, gql } from "@apollo/client";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  Camera,
  ChevronDown,
  Loader2,
  MapPinned,
  RotateCcw,
  RotateCw,
  Search,
  X,
} from "lucide-react";
import SearchBar from "./SearchBar";
import StreetViewDialog from "./StreetViewDialog";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

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
  address_line1: string | null;
}

interface ReonomyPropertiesData {
  reonomyProperties: {
    items: ReonomyProperty[];
  };
}

interface ParcelByLocationData {
  executeGetParcelByLocation: { id: string | null }[] | null;
}

interface ReonomyAddressSearchData {
  reonomyProperties: {
    items: { parcel_id: string | null }[];
  };
}

// ─── GraphQL Queries ──────────────────────────────────────────────────────────

function buildParcelByLocationQuery(latitude: number, longitude: number) {
  return gql`
    query GetParcelByLocationLiteral {
      executeGetParcelByLocation(longitude: ${longitude}, latitude: ${latitude}) {
        id
      }
    }
  `;
}

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
        address_line1
      }
    }
  }
`;

const GET_REONOMY_BY_ADDRESS_CITY = gql`
  query GetReonomyByAddressCity($address: String!, $city: String!) {
    reonomyProperties(
      filter: { address_line1: { contains: $address }, city: { eq: $city } }
    ) {
      items {
        parcel_id
      }
    }
  }
`;

const initialViewState = { longitude: -100, latitude: 40, zoom: 3.5 };

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

const selectedPointLayer: CircleLayer = {
  id: "selected-point",
  type: "circle",
  source: "selected-point",
  paint: {
    "circle-radius": 5,
    "circle-color": "#0f172a",
    "circle-stroke-color": "#ffffff",
    "circle-stroke-width": 2,
  },
};

const selectedPointPulseLayer: CircleLayer = {
  id: "selected-point-pulse",
  type: "circle",
  source: "selected-point",
  paint: {
    "circle-radius": ["get", "pulseRadius"],
    "circle-color": "#0284c7",
    "circle-opacity": ["get", "pulseOpacity"],
    "circle-stroke-width": 0,
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

function getAddressSearchParts(formattedAddress: string) {
  const [street = "", city = ""] = formattedAddress
    .split(",")
    .map((part) => part.trim().toUpperCase());
  const streetTokens = street.replace(/[^\dA-Z\s]/g, " ").split(/\s+/).filter(Boolean);
  return {
    address: streetTokens.slice(0, 2).join(" "),
    city,
  };
}

// ─── Sidebar Component ────────────────────────────────────────────────────────

function Sidebar({
  parcelId,
  onClose,
  onOpenStreetView,
  canStreetView,
}: {
  parcelId: string | null;
  onClose: () => void;
  onOpenStreetView: (address: string | null) => void;
  canStreetView: boolean;
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
    <aside className="absolute inset-y-0 left-0 z-10 flex w-[min(360px,100%)] flex-col border-r bg-background shadow-lg md:relative md:w-[360px] md:min-w-[360px]">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-foreground">Parcel Details</h2>
            <p className="text-xs text-muted-foreground">Assessment and location data</p>
          </div>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close sidebar">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {parcelId && (
        <div className="border-b bg-muted/40 px-4 py-3">
          {property?.address_line1 && (
            <div className="mb-2 truncate text-sm font-semibold text-foreground">
              {property.address_line1}
            </div>
          )}
          <Badge variant="secondary" className="mb-2">Parcel ID</Badge>
          <div className="break-all font-mono text-xs text-muted-foreground">{parcelId}</div>
          {canStreetView && (
            <Button
              type="button"
              onClick={() => onOpenStreetView(property?.address_line1 ?? null)}
              className="mt-3 w-full"
              size="sm"
            >
              <Camera className="h-4 w-4" />
              Open Street View
            </Button>
          )}
        </div>
      )}

      {!parcelId && (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <MapPinned className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Click a parcel on the map to view its details.
          </p>
        </div>
      )}

      {parcelId && loading && (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Fetching property data…
          </p>
        </div>
      )}

      {parcelId && error && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <p className="text-sm font-medium text-destructive">
            Failed to load property data.
          </p>
          <p className="text-xs text-muted-foreground">
            {error.message}
          </p>
        </div>
      )}

      {parcelId && !loading && !error && !property && (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <Search className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No property record found for this parcel.
          </p>
        </div>
      )}

      {property && (
        <div className="flex-1 overflow-y-auto p-3">
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

          <Section title="Lot">
            <Row label="Property Type" value={fmt(property.asset_type)} />
            <Row label="Lot Area SF" value={fmt(property.lot_size_sqft, "sf")} />
            <Row label="Lot Area Acres" value={fmt(property.lot_size_acres, "acres")} />
            <Row label="Zoning" value={fmt(property.zoning)} />
            <Row label="Census Tract" value={fmt(property.census_tract)} />
            <Row label="Opportunity Zone" value={formatBoolean(property.opp_zone)} />
          </Section>

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
    <Card className="mb-3 overflow-hidden">
      <CardHeader className="border-b bg-muted/30 px-4 py-3">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 border-b px-4 py-2.5 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-words text-right font-medium text-foreground">{value ?? "—"}</span>
    </div>
  );
}

function SelectionSummary({
  address,
  parcelId,
  coords,
}: {
  address: string | null;
  parcelId: string | null;
  coords: { lat: number; lng: number } | null;
}) {
  const { loading, data } = useQuery<ReonomyPropertiesData>(
    GET_REONOMY_PROPERTY,
    {
      variables: { parcelId },
      skip: !parcelId || Boolean(address),
    },
  );
  const propertyAddress = data?.reonomyProperties?.items?.[0]?.address_line1 ?? null;
  const displayAddress =
    address ?? propertyAddress ?? (loading ? "Loading address..." : coords ? "Address unavailable" : "—");

  if (!parcelId && !coords && !address) return null;

  return (
    <Card className="absolute right-3 top-3 z-20 hidden w-[min(420px,calc(100%-24px))] overflow-hidden bg-background/95 shadow-lg backdrop-blur lg:block">
      <CardHeader className="border-b bg-muted/30 px-4 py-3">
        <CardTitle>Active Parcel</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Row label="Address" value={displayAddress} />
        <Row label="Parcel ID" value={parcelId ?? "—"} />
        <Row
          label="Coordinates"
          value={coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : "—"}
        />
      </CardContent>
    </Card>
  );
}

// ─── Main Map Component ───────────────────────────────────────────────────────

export default function MapComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const apolloClient = useApolloClient();
  const parcelFromUrl = searchParams.get("parcel");
  const [pendingParcelId, setSelectedParcelId] = useState<string | null>(null);
  const [selectionCoords, setSelectionCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [streetViewOpen, setStreetViewOpen] = useState(false);
  const [streetViewAddress, setStreetViewAddress] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResetSignal, setSearchResetSignal] = useState(0);
  const [pulseFrame, setPulseFrame] = useState(0);
  const [rotationMenuOpen, setRotationMenuOpen] = useState(false);

  const mapRef = useRef<MapRef>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
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

  const activeParcelId = pendingParcelId;
  const sidebarOpen = activeParcelId !== null;

  const selectedPointGeoJson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: selectionCoords
        ? [
            {
              type: "Feature" as const,
              properties: {
                pulseRadius: 12 + pulseFrame * 18,
                pulseOpacity: Math.max(0, 0.32 - pulseFrame * 0.28),
              },
              geometry: {
                type: "Point" as const,
                coordinates: [selectionCoords.lng, selectionCoords.lat],
              },
            },
          ]
        : [],
    }),
    [pulseFrame, selectionCoords],
  );

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

  useEffect(() => {
    if (!selectionCoords) return;
    const animation = window.setInterval(() => {
      setPulseFrame((frame) => (frame + 0.04) % 1);
    }, 50);
    return () => window.clearInterval(animation);
  }, [selectionCoords]);

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    const handleTrackpadRotate = (event: WheelEvent) => {
      if (!event.shiftKey) return;

      const map = mapRef.current?.getMap();
      if (!map) return;

      event.preventDefault();
      event.stopPropagation();

      const dominantDelta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (dominantDelta === 0) return;

      map.rotateTo(map.getBearing() + dominantDelta * 0.35, {
        duration: 0,
        essential: true,
      });
    };

    container.addEventListener("wheel", handleTrackpadRotate, {
      capture: true,
      passive: false,
    });

    return () => {
      container.removeEventListener("wheel", handleTrackpadRotate, {
        capture: true,
      });
    };
  }, []);

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

    const trySelect = () => {
      const features = map.querySourceFeatures("parcels", {
        sourceLayer: selectionFeatureRef.sourceLayer,
        filter: ["==", ["to-string", ["get", "ID"]], parcelFromUrl],
      });
      const feature = features[0];
      if (feature?.id === undefined) return false;
      if (selectedFeatureRef.current?.id === feature.id) return true;
      clearSelected();
      const featureRef = { ...selectionFeatureRef, id: feature.id };
      map.setFeatureState(featureRef, { selected: true });
      selectedFeatureRef.current = featureRef;
      return true;
    };

    if (trySelect()) return;

    // Tiles may not be loaded yet (e.g. after search flyTo). Retry on tile loads.
    const onSourceData = (e: { sourceId?: string; isSourceLoaded?: boolean }) => {
      if (e.sourceId !== "parcels" || !e.isSourceLoaded) return;
      if (trySelect()) {
        map.off("sourcedata", onSourceData);
      }
    };
    map.on("sourcedata", onSourceData);
    return () => {
      map.off("sourcedata", onSourceData);
    };
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
        setSelectionCoords(null);
        setSelectedAddress(null);
        return;
      }

      const feature = features[0];
      const rawParcelId = feature.properties?.ID;
      const parcelId = rawParcelId == null ? null : String(rawParcelId);
      const featureId = feature.id;

      if (!parcelId) {
        clearSelected();
        setSelectedParcelId(null);
        setSelectionCoords(null);
        setSelectedAddress(null);
        return;
      }

      setSelectionCoords({ lat: event.lngLat.lat, lng: event.lngLat.lng });
      setSelectedAddress(null);

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
    setSelectionCoords(null);
    setSelectedAddress(null);
  }, [clearSelected]);

  const resetMap = useCallback(() => {
    clearHover();
    clearSelected();
    setSelectedParcelId(null);
    setSelectionCoords(null);
    setSelectedAddress(null);
    setSearchError(null);
    setSearchLoading(false);
    setStreetViewOpen(false);
    setStreetViewAddress(null);
    setSearchResetSignal((signal) => signal + 1);
    mapRef.current?.flyTo({ ...initialViewState, essential: true });
  }, [clearHover, clearSelected]);

  useEffect(() => {
    window.addEventListener("real-estate-map:reset", resetMap);
    return () => {
      window.removeEventListener("real-estate-map:reset", resetMap);
    };
  }, [resetMap]);

  // ── Search: Google Places → parcel-by-location → highlight ───────────────
  const handleSearchResult = useCallback(
    async ({
      latitude,
      longitude,
      formattedAddress,
    }: {
      latitude: number;
      longitude: number;
      formattedAddress: string;
    }) => {
      const map = mapRef.current?.getMap();
      if (map) {
        map.flyTo({ center: [longitude, latitude], zoom: 18, essential: true });
      }
      setSelectionCoords({ lat: latitude, lng: longitude });
      setSelectedAddress(formattedAddress);
      setSearchError(null);
      setSearchLoading(true);
      try {
        const { data } = await apolloClient.query<ParcelByLocationData>({
          query: buildParcelByLocationQuery(latitude, longitude),
          fetchPolicy: "network-only",
        });
        const parcelId = data?.executeGetParcelByLocation?.[0]?.id ?? null;
        if (!parcelId) {
          setSearchError(`No parcel found at "${formattedAddress}".`);
          clearSelected();
          setSelectedParcelId(null);
          setSelectedAddress(null);
          return;
        }

        const { data: directPropertyData } = await apolloClient.query<ReonomyPropertiesData>({
          query: GET_REONOMY_PROPERTY,
          variables: { parcelId },
          fetchPolicy: "network-only",
        });
        let reonomyParcelId = directPropertyData.reonomyProperties.items[0]?.parcel_id ?? null;

        if (!reonomyParcelId) {
          const addressParts = getAddressSearchParts(formattedAddress);
          if (addressParts.address && addressParts.city) {
            const { data: addressPropertyData } =
              await apolloClient.query<ReonomyAddressSearchData>({
                query: GET_REONOMY_BY_ADDRESS_CITY,
                variables: addressParts,
                fetchPolicy: "network-only",
              });
            reonomyParcelId =
              addressPropertyData.reonomyProperties.items.find((item) => item.parcel_id)
                ?.parcel_id ?? null;
          }
        }

        clearSelected();
        setSelectedParcelId(reonomyParcelId ?? String(parcelId));
      } catch (err) {
        setSearchError(err instanceof Error ? err.message : "Parcel lookup failed");
      } finally {
        setSearchLoading(false);
      }
    },
    [apolloClient, clearSelected],
  );

  const handleMarkerDragEnd = useCallback(
    async (event: MarkerDragEvent) => {
      const { lngLat } = event;
      setSelectionCoords({ lat: lngLat.lat, lng: lngLat.lng });
      setSelectedAddress(null);
      setSearchError(null);
      setSearchLoading(true);

      try {
        const { data } = await apolloClient.query<ParcelByLocationData>({
          query: buildParcelByLocationQuery(lngLat.lat, lngLat.lng),
          fetchPolicy: "network-only",
        });
        const parcelId = data?.executeGetParcelByLocation?.[0]?.id ?? null;
        if (!parcelId) {
          setSearchError("No parcel found at the dropped pin.");
          clearSelected();
          setSelectedParcelId(null);
          setSelectedAddress(null);
          return;
        }

        clearSelected();
        setSelectedParcelId(String(parcelId));
      } catch (err) {
        setSearchError(err instanceof Error ? err.message : "Parcel lookup failed");
      } finally {
        setSearchLoading(false);
      }
    },
    [apolloClient, clearSelected],
  );

  const handleOpenStreetView = useCallback((address: string | null) => {
    setStreetViewAddress(address);
    setStreetViewOpen(true);
  }, []);

  const rotateMap = useCallback((degrees: number) => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.easeTo({
      bearing: map.getBearing() + degrees,
      duration: 350,
      essential: true,
    });
  }, []);

  const resetRotation = useCallback(() => {
    mapRef.current?.getMap().easeTo({
      bearing: 0,
      pitch: 0,
      duration: 350,
      essential: true,
    });
  }, []);

  return (
    <div className="flex h-[calc(100vh-64px)] w-full bg-background">
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      {sidebarOpen && (
        <Sidebar
          parcelId={activeParcelId}
          onClose={handleSidebarClose}
          onOpenStreetView={handleOpenStreetView}
          canStreetView={selectionCoords !== null}
        />
      )}

      {/* ── Map ─────────────────────────────────────────────────────────────── */}
      <div ref={mapContainerRef} className="relative min-w-0 flex-1">
        <SearchBar
          onResult={handleSearchResult}
          loading={searchLoading}
          error={searchError}
          resetSignal={searchResetSignal}
        />
        <SelectionSummary
          address={selectedAddress}
          parcelId={activeParcelId}
          coords={selectionCoords}
        />
        <div className="absolute bottom-20 right-3 z-20 flex flex-col gap-2 rounded-lg border bg-background/95 p-2 shadow-lg backdrop-blur">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRotationMenuOpen((open) => !open)}
            aria-expanded={rotationMenuOpen}
            aria-controls="map-rotation-menu"
            className="w-36 justify-between"
          >
            <span className="inline-flex items-center gap-2">
              <RotateCw className="h-4 w-4" />
              Rotation
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${rotationMenuOpen ? "rotate-180" : ""}`}
            />
          </Button>
          {rotationMenuOpen && (
            <div id="map-rotation-menu" className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => rotateMap(-15)}
                aria-label="Rotate map left"
                title="Rotate map left"
                className="w-36 justify-start"
              >
                <RotateCcw className="h-4 w-4" />
                Rotate left
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => rotateMap(15)}
                aria-label="Rotate map right"
                title="Rotate map right"
                className="w-36 justify-start"
              >
                <RotateCw className="h-4 w-4" />
                Rotate right
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetRotation}
                aria-label="Reset map rotation"
                title="Reset map rotation"
                className="w-36 justify-start"
              >
                <MapPinned className="h-4 w-4" />
                Reset north
              </Button>
              <div className="w-36 border-t pt-2 text-center text-[10px] leading-snug text-muted-foreground">
                Use buttons, compass,two fingers on track pad or right click on mouse
              </div>
            </div>
          )}
        </div>
        <Map
          ref={mapRef}
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          initialViewState={initialViewState}
          style={{ width: "100%", height: "100%" }}
          mapStyle="mapbox://styles/mapbox/streets-v11"
          interactiveLayerIds={["parcels-fill", "parcels-line"]}
          dragRotate
          touchPitch
          touchZoomRotate
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
          <NavigationControl position="top-right" showCompass visualizePitch />

          {/* Parcel boundaries vector tile source */}
          <Source
            id="parcels"
            type="vector"
            url="mapbox://svayser.parcel-boundaries"
          >
            <Layer {...parcelFillLayer} />
            <Layer {...parcelLineLayer} />
          </Source>

          {selectionCoords && (
            <Source id="selected-point" type="geojson" data={selectedPointGeoJson}>
              <Layer {...selectedPointPulseLayer} />
              <Layer {...selectedPointLayer} />
            </Source>
          )}

          {selectionCoords && (
            <Marker
              longitude={selectionCoords.lng}
              latitude={selectionCoords.lat}
              anchor="bottom"
              draggable
              onDragEnd={handleMarkerDragEnd}
            >
              <div className="flex translate-y-1 flex-col items-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-lg">
                  <MapPinned className="h-5 w-5" />
                </div>
                <div className="h-3 w-3 -translate-y-1 rotate-45 border-b-2 border-r-2 border-background bg-primary shadow-sm" />
              </div>
            </Marker>
          )}
        </Map>

        {/* Hint text when sidebar is closed */}
        {!sidebarOpen && (
          <div className="pointer-events-none absolute bottom-6 left-1/2 max-w-[calc(100%-24px)] -translate-x-1/2 whitespace-nowrap rounded-full border bg-background/90 px-4 py-2 text-xs font-medium text-foreground shadow-lg backdrop-blur">
            Search an address or click a parcel to view details
          </div>
        )}
      </div>

      <StreetViewDialog
        open={streetViewOpen}
        onClose={() => setStreetViewOpen(false)}
        latitude={selectionCoords?.lat ?? null}
        longitude={selectionCoords?.lng ?? null}
        address={streetViewAddress}
      />
    </div>
  );
}
