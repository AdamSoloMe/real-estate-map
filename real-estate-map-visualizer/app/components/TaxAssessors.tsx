/**
 * TaxAssessors.tsx
 * Week 3 — GraphQL as a Client
 *
 * Covers:
 *  - Apollo useQuery with attomTaxAssessors
 *  - Mapbox GL JS map with property markers
 *  - Advanced: Mapbox Terrain vector source + layer
 *
 * Setup before using:
 *  npm install @apollo/client graphql mapbox-gl
 *  npm install -D @types/mapbox-gl
 *
 * Replace YOUR_MAPBOX_TOKEN with your actual token from mapbox.com
 */

import { useQuery, gql } from '@apollo/client';
import { useEffect, useRef, useState, CSSProperties } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

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
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Apollo hook — fires the query, returns reactive { loading, error, data }
  const { loading, error, data } = useQuery<AttomTaxAssessorsData>(GET_TAX_ASSESSORS);

  // ── 3a. Initialize Mapbox map (runs once on mount) ────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-74.006, 40.7128], // default: New York City
      zoom: 10,
    });

    // Navigation controls (zoom in/out, compass)
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // ── Advanced: Terrain vector source + layer ───────────────────────────
    map.on('load', () => {
      // 1. Add the Mapbox Terrain DEM source
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      });

      // 2. Set the terrain on the map using the DEM source
      map.setTerrain({
        source: 'mapbox-dem',
        exaggeration: 1.5, // amplify elevation for visual effect
      });

      // 3. Add a sky layer so the horizon looks natural with 3D terrain
      map.addLayer({
        id: 'sky',
        type: 'sky',
        paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 90.0],
          'sky-atmosphere-sun-intensity': 15,
        },
      });
    });

    mapRef.current = map;

    // Cleanup on unmount
    return () => {
      markersRef.current.forEach((m) => m.remove());
      map.remove();
    };
  }, []);

  // ── 3b. Add property markers once data arrives ────────────────────────────
  useEffect(() => {
    if (!data || !mapRef.current) return;

    const map = mapRef.current;
    const items = data.attomTaxAssessors.items;

    // Remove any existing markers before re-adding
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Filter out items missing coordinates
    const validItems = items.filter(
      (item): item is TaxAssessor & { PropertyLatitude: number; PropertyLongitude: number } =>
        item.PropertyLatitude !== null && item.PropertyLongitude !== null
    );

    // Fit the map to the bounding box of all properties
    if (validItems.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      validItems.forEach(({ PropertyLongitude, PropertyLatitude }) => {
        bounds.extend([PropertyLongitude, PropertyLatitude]);
      });
      map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
    }

    // Create a marker for each property
    validItems.forEach((item) => {
      const { PropertyLongitude, PropertyLatitude, PropertyAddressFull, ATTOM_ID } = item;

      // Custom marker element
      const el = document.createElement('div');
      el.style.cssText = `
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #e8b86d;
        border: 2px solid #fff;
        cursor: pointer;
        transition: transform 0.15s ease, background 0.15s ease;
      `;

      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.6)';
        el.style.background = '#f5d08a';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
        el.style.background = ATTOM_ID === selectedId ? '#f5d08a' : '#e8b86d';
      });

      const popup = new mapboxgl.Popup({ offset: 16, closeButton: false }).setHTML(`
        <div style="font-family: monospace; font-size: 12px; padding: 4px;">
          <strong>${PropertyAddressFull ?? 'Unknown address'}</strong><br/>
          <span style="color: #888;">ATTOM ID: ${ATTOM_ID ?? '—'}</span>
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([PropertyLongitude, PropertyLatitude])
        .setPopup(popup)
        .addTo(map);

      el.addEventListener('click', () => setSelectedId(ATTOM_ID));

      markersRef.current.push(marker);
    });
  }, [data]);

  // ── 3c. Fly to property when selected in sidebar ──────────────────────────
  const flyToProperty = (item: TaxAssessor): void => {
    if (!mapRef.current || item.PropertyLatitude === null || item.PropertyLongitude === null) return;
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
          <p style={{ ...styles.status, color: '#e87d6d' }}>Error: {error.message}</p>
        )}

        {data && (
          <ul style={styles.list}>
            {data.attomTaxAssessors.items.map((item, index) => (
              <li
                key={item.ATTOM_ID ?? index}
                style={{
                  ...styles.listItem,
                  ...(selectedId === item.ATTOM_ID ? styles.listItemActive : {}),
                }}
                onClick={() => flyToProperty(item)}
              >
                <span style={styles.itemAddress}>
                  {item.PropertyAddressFull ?? 'Unknown address'}
                </span>
                <span style={styles.itemMeta}>
                  ATTOM {item.ATTOM_ID ?? '—'} · Parcel {item.parcel_id ?? '—'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* ── Map ── */}
      <div ref={mapContainerRef} style={styles.map} />
    </div>
  );
}

// ─── 5. Styles ────────────────────────────────────────────────────────────────

const styles: Record<string, CSSProperties> = {
  wrapper: {
    display: 'flex',
    height: '100vh',
    width: '100%',
    fontFamily: "'IBM Plex Mono', monospace",
    background: '#0f1117',
    color: '#e8e8e8',
  },
  sidebar: {
    width: '320px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    background: '#16181f',
    borderRight: '1px solid #2a2d38',
    overflow: 'hidden',
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    padding: '20px 20px 12px',
    borderBottom: '1px solid #2a2d38',
  },
  title: {
    margin: 0,
    fontSize: '13px',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#e8b86d',
  },
  count: {
    fontSize: '11px',
    color: '#555',
    letterSpacing: '0.05em',
  },
  status: {
    padding: '20px',
    margin: 0,
    fontSize: '12px',
    color: '#666',
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    overflowY: 'auto',
    flex: 1,
  },
  listItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '14px 20px',
    borderBottom: '1px solid #1e2028',
    cursor: 'pointer',
    transition: 'background 0.1s',
  },
  listItemActive: {
    background: '#1e2130',
    borderLeft: '3px solid #e8b86d',
    paddingLeft: '17px',
  },
  itemAddress: {
    fontSize: '12px',
    color: '#d4d4d4',
    lineHeight: 1.4,
  },
  itemMeta: {
    fontSize: '10px',
    color: '#555',
    letterSpacing: '0.03em',
  },
  map: {
    flex: 1,
  },
};
