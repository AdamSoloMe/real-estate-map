# An Interactive Map Application for Real Estate Prospecting

This is my interactive real estate prospecting map: a web application built to help brokers discover, inspect, and qualify potential leads directly from a map. Instead of making users jump between separate mapping tools, property databases, and street-level context, I brought the core workflow into one interface.

The app combines parcel boundary visualization, address search, Street View, and GraphQL-powered property data. A broker can search for an address, click a parcel, inspect property details, view the parcel location, and use the map controls to explore the surrounding area.

The current coverage is focused on New York City.

## Demo

Public build: [click to view Project here](https://real-estate-map-dun.vercel.app)

Screenshots:

| Map Search | Parcel Details | Street View |
| --- | --- | --- |
| _Add screenshot_ | _Add screenshot_ | _Add screenshot_ |

## Project Highlights

- Built an interactive Mapbox map that displays parcel boundaries from a hosted vector tileset.
- Added Google Places address search so users can quickly locate NYC properties.
- Connected the frontend to a GraphQL property API with Apollo Client.
- Built a parcel details sidebar that displays building, lot, and location data.
- Added Street View access for selected parcels so users can inspect a location visually. ( this is currently disabled within the project due to api costs)
- Added custom map interactions, including hover states, selected parcel states, draggable markers, animated GeoJSON layers, and map rotation controls.
- Refreshed the interface with Tailwind CSS and shadcn-style UI components.
- Deployed-ready configuration with environment variable documentation for Vercel.

## Key Features I Built

### Map-Based Parcel Exploration

Users can click directly on a parcel boundary to select a property. The app reads the parcel feature from the Mapbox vector layer, extracts the parcel identifier, highlights the selected parcel, and loads the related property data.

### Address Search for Prospecting

The search bar uses Google Places Autocomplete so users can search for NYC addresses. Once an address is selected, the app uses the returned coordinates to find the related parcel record and load the matching property data.

### Property Data Sidebar

The sidebar is designed as the main prospecting workspace. It shows property details grouped into clear sections:

- Building data
- Lot data
- Location data
- Parcel ID
- Street View access when coordinates are available

### Advanced Map Interactions

I added several interaction features to make the map feel more like a professional prospecting tool:

- Parcel hover highlighting
- Selected parcel highlighting
- Custom selected-location marker
- Draggable marker with parcel lookup after repositioning
- Animated GeoJSON pulse around the active point
- Navigation controls
- Compass and map rotation controls
- Collapsible rotation menu

### Street View Integration

When a parcel has coordinates, users can open a Street View dialog and inspect the property context without leaving the app.

## How It Works

The app supports two main user flows that demonstrate the engineering behind the project.

### Parcel Click Flow

1. A broker clicks a parcel boundary on the map.
2. The app extracts the parcel ID from the Mapbox feature.
3. Apollo Client queries the GraphQL API by parcel ID.
4. The sidebar displays property and building details when data is available.

### Address Search Flow

1. A broker searches for an NYC address.
2. Google Places Autocomplete returns the selected address and coordinates.
3. The app sends the latitude and longitude to `executeGetParcelByLocation`.
4. The returned parcel is resolved against the property dataset.
5. Apollo Client queries property details and displays the result in the sidebar.

## Tech Stack

### Next.js and React

I built the application with [Next.js](https://nextjs.org/docs), the App Router, TypeScript, and React client components. The main map is dynamically imported with server-side rendering disabled because Mapbox GL depends on browser APIs.

### Mapbox GL and react-map-gl

I used [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/guides/) through [react-map-gl](https://visgl.github.io/react-map-gl/) to build the interactive map. Parcel boundaries are loaded from a Mapbox vector tile source:

```txt
mapbox://svayser.parcel-boundaries
```

The parcel tileset is hosted in Mapbox and rendered with fill and line layers. I also used Mapbox controls and interaction features such as navigation controls, feature hover state, selected feature state, custom markers, draggable markers, and a dynamic GeoJSON layer.

Useful references:

- [Mapbox GL JS documentation](https://docs.mapbox.com/mapbox-gl-js/guides/)
- [Mapbox Studio tilesets](https://docs.mapbox.com/studio-manual/reference/tilesets/)
- [react-map-gl documentation](https://visgl.github.io/react-map-gl/)

### GraphQL and Apollo Client

I used [Apollo Client](https://www.apollographql.com/docs/react/) to query the backend GraphQL endpoint. GraphQL is a good fit for this project because the sidebar needs structured property data while avoiding over-fetching large records.

Apollo Client provides:

- A shared GraphQL client through `ApolloProvider`.
- Declarative data fetching with `useQuery`.
- Imperative parcel lookup queries with `useApolloClient`.
- Client-side caching for repeated property detail requests.

Useful references:

- [GraphQL documentation](https://graphql.org/learn/)
- [Apollo Client React documentation](https://www.apollographql.com/docs/react/)

### Azure Data API Builder / GraphQL Backend

The app expects a GraphQL API that exposes property and parcel lookup data. This kind of backend can be implemented with [Data API builder for Azure Databases](https://learn.microsoft.com/azure/data-api-builder/), which can expose database tables, views, and stored procedures through REST and GraphQL endpoints.

In this app, the frontend queries:

- `reonomyProperties` for parcel and property details.
- `executeGetParcelByLocation` to map coordinates to a parcel record.

### Google APIs

I integrated Google services for address search and Street View.

- [Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/overview): loads the browser-side Google Maps library.
- [Places Autocomplete](https://developers.google.com/maps/documentation/javascript/place-autocomplete): lets users select a structured address and returns coordinates.
- [Street View Embed API](https://developers.google.com/maps/documentation/embed/embedding-map#street_view_mode): displays Street View for selected coordinates.

The current app does not require Google Geocoding API. Search depends on selecting a Places suggestion rather than free-text geocoding.

### UI

I rebuilt the interface with Tailwind CSS and shadcn-style primitives for consistent buttons, inputs, cards, badges, and dialogs. Icons come from [Lucide React](https://lucide.dev/).

## Project Structure

```txt
app/
  components/
    ApolloWrapper.tsx       # Apollo Client provider
    Map.tsx                 # Main Mapbox map and parcel/property workflow
    NavBar.tsx              # App header and reset/home action
    SearchBar.tsx           # Google Places address search
    StreetViewDialog.tsx    # Street View modal
    ui/                     # shadcn-style reusable UI primitives
  lib/
    googleMaps.ts           # Google Maps JavaScript loader
    utils.ts                # className utility
  page.tsx                  # Dynamically imports the map
```

## Environment Variables

Create a `.env.local` file in the project directory:

```env
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

For Vercel deployments, add the same variables in **Project Settings → Environment Variables** for the relevant environments. Because these variables are prefixed with `NEXT_PUBLIC_`, Next.js includes them in the client bundle at build time, so deployments must be rebuilt after changing them.

## Local Setup

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Build and Validation

Run ESLint:

```bash
npm run lint
```

Create a production build:

```bash
npm run build
```

Start the production server after building:

```bash
npm run start
```

Tests are not currently implemented. If test coverage is added later, a typical workflow would be:

```bash
npm test
```

## Deploying to Vercel

1. Push the project to GitHub.
2. Import the repository into [Vercel](https://vercel.com/docs).
3. Confirm the framework is detected as Next.js.
4. Add the required environment variables:
   - `NEXT_PUBLIC_MAPBOX_TOKEN`
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
5. Deploy.

If the project is imported from the parent repository, make sure Vercel's root directory points to:

```txt
real-estate-map-visualizer
```

## Future Improvements

- Add saved lead lists for brokers.
- Add exportable prospecting reports.
- Add richer parcel filters by zoning, lot size, asset type, and unit count.
- Add authenticated broker workspaces.
- Add automated tests for search, parcel selection, and data rendering.
- Add screenshots and a public demo link to this README.

## Why This Project Matters

Real estate prospecting often requires switching between maps, ownership records, assessment data, and street-level context. My goal with this project was to combine those pieces into a single workflow so brokers can search, inspect, and qualify leads faster.

This project showcases my ability to connect multiple APIs, build an interactive geospatial interface, manage GraphQL data on the client, design a usable workflow, and prepare the app for deployment.
