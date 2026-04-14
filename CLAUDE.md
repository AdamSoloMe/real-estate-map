# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Next.js application for visualizing real estate parcels on a Mapbox map. It uses Apollo Client to query a GraphQL API for property data and displays parcel boundaries from a Mapbox vector tile source.

## Commands

All commands should be run from the `real-estate-map-visualizer` directory:

```bash
cd real-estate-map-visualizer
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Architecture

**Entry Point**: `app/page.tsx` dynamically imports `Map.tsx` with SSR disabled (required for Mapbox compatibility).

**Key Components**:
- `app/components/Map.tsx` - Main map using `react-map-gl` with Mapbox GL JS. Displays parcel boundaries via vector tiles and property markers from GraphQL.
- `app/components/TaxAssessors.tsx` - Alternative implementation using raw Mapbox GL JS API with terrain/sky layers and a sidebar property list.
- `app/components/ApolloWrapper.tsx` - Apollo Client provider wrapping the entire app. GraphQL endpoint is configured here.

**Data Flow**:
1. Apollo Client queries `attomTaxAssessors` GraphQL endpoint
2. Properties are rendered as markers on the map
3. Parcel boundaries are loaded from Mapbox vector tile source `mapbox://svayser.parcel-boundaries`

**Environment Variables**:
- `NEXT_PUBLIC_MAPBOX_TOKEN` - Mapbox access token (required)

## Tech Stack

- Next.js 16 (App Router) + React 19
- TypeScript (strict mode)
- Tailwind CSS v4
- Apollo Client + GraphQL
- Mapbox GL JS / react-map-gl