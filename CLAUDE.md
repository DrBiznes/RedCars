# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React + TypeScript web application that visualizes the historical Pacific Electric Red Car transit system in Los Angeles. The app allows users to compare historical Red Car travel times with modern public transit options through an interactive map interface.

## Development Commands

- `npm run dev` - Start development server with Vite
- `npm run build` - Build production version (runs TypeScript compilation first)
- `npm run lint` - Run ESLint for code quality checks
- `npm run preview` - Preview production build locally

## Architecture Overview

### Tech Stack
- **Frontend**: React 19 with TypeScript
- **Build Tool**: Vite with TypeScript plugin
- **Styling**: Tailwind CSS v4 with shadcn/ui components
- **Mapping**: Leaflet.js with React-Leaflet for interactive maps
- **Data**: GeoJSON files for Pacific Electric route data

### Core Architecture Patterns

**Component Structure:**
- `Layout.tsx` acts as the main coordinator, managing global state and communication between components
- Uses a global `window.mapControls` pattern to enable communication between layout and map components
- Map component exposes control functions via global window object for cross-component interaction

**State Management:**
- Local React state with props drilling for data flow
- `selectedLines` state flows from Layout → Map → PELineSelector for line visibility control
- Map placement state managed internally in Map component with callback pattern

**Map Integration:**
- Custom Leaflet marker icons and styling
- GeoJSON rendering with dynamic styling based on selected lines
- Interactive line clicking with popup information
- Start/end point placement system for route planning

### Key Components

**Layout System:**
- `Layout.tsx`: Main coordinator with sidebar toggle, map controls, and state management
- `Header.tsx` / `Footer.tsx`: Static layout components
- `MapDock.tsx`: Floating action buttons for map controls

**Map System:**
- `Map.tsx`: Main Leaflet map with GeoJSON rendering, marker placement, and zoom controls
- `PELineSelector.tsx`: Line filtering interface in sidebar
- `PELinesLayer.tsx`: GeoJSON layer management

**UI Components:**
- Uses shadcn/ui component library with Radix UI primitives
- Custom Tailwind CSS classes with CSS variables for theming
- Responsive design with mobile-first approach

### Data Structure

**GeoJSON Data:**
- `/src/data/GeoJSON/lines.geojson` - Pacific Electric route geometries
- `/src/data/GeoJSON/stations.geojson` - Station locations
- Features include `Name` and `description` properties for line identification

### Development Notes

- Uses `@` alias for `./src` directory imports
- Leaflet requires manual icon configuration in React environment
- Map controls exposed globally to avoid prop drilling complexity
- GeoJSON styling uses CSS custom properties for theming consistency
- TypeScript strict mode enabled with comprehensive type definitions

### Path Alias Configuration
The project uses `@` as an alias for the `src` directory, configured in both `vite.config.ts` and `tsconfig.json`.