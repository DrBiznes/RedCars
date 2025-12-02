# Pacific Electric Pathfinder
## Project Specification

### Project Overview
This web application will allow users to compare historical Pacific Electric Red Car travel times with modern public transit options in Los Angeles. The tool aims to raise awareness about LA's former rail transit system by demonstrating what commute times might have looked like if the Red Car system still existed today.

### Goals & Objectives
- Educate users about the historical Pacific Electric Red Car system
- Provide a user-friendly interface to visualize historical rail lines on a map
- Allow users to compare theoretical Red Car travel times to modern transit options
- Raise awareness about public transit history and possibilities in Los Angeles

### Target Audience
- General public with interest in Los Angeles transit history
- Urban planning enthusiasts
- Public transportation advocates

### Technical Requirements

#### Tech Stack
- **Frontend Framework**: React with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Mapping**: Leaflet.js (free, open-source, works with OpenStreetMap)
- **GeoData Format**: GeoJSON for storing Red Car route and stop information
- **Hosting**: Cloudflare Pages (client-side only application)

#### Key Features
1. **Interactive Map Interface**
   - Full-screen map showing historical Red Car routes and stops
   - Ability to place start/end pins for route calculation
   - Visual display of calculated routes

2. **Route Calculation**
   - Algorithm to determine historical Red Car travel times based on digitized timetables
   - Consider transfers between different Red Car lines where necessary
   - Calculate total journey time including walking to/from stops

3. **Comparison Feature**
   - Button to open the same route in Google Maps for modern transit comparison
   - Side-by-side time comparison display

4. **Information Panel**
   - Sidebar with search/input controls
   - Historical information about the Red Car system
   - Detailed journey breakdown

### Data Requirements
- GeoJSON data for all Pacific Electric Red Car routes
- Stop location coordinates for all Red Car stops
- Digitized historical timetables showing travel times between stops
- Walking time estimates for reaching stops

### Routing Algorithm
The application uses a custom implementation of **Dijkstra's Algorithm** to find the optimal route.

1.  **Graph Construction**:
    *   The rail network is built from GeoJSON data (`lines.geojson`).
    *   **Densification**: Lines are split into segments of **0.25 miles** to create a dense network of nodes.
    *   **Transfers**: Connections are created between different lines where they come within **0.25 miles** of each other. A transfer penalty (5 minutes) is applied.

2.  **Route Calculation**:
    *   **Start/End Snapping**: When a user places a marker, it "snaps" to the nearest node on the graph.
    *   **Walking Segments**: The time to walk from the user's click to the snapped node (and from the final node to the destination) is calculated at **3 mph** and added to the total journey time.
    *   **Pathfinding**: Dijkstra's algorithm searches the graph for the path with the lowest total weight (travel time + transfer penalties).

3.  **Result**:
    *   The output includes a detailed itinerary with walking, riding, and transfer segments.
    *   Total time and distance are displayed.

### How to Use
1.  **Explore the Map**: Pan and zoom to explore the historical Pacific Electric Red Car network.
2.  **Place Markers**:
    *   Click the **"Place Start"** button in the bottom dock, then click anywhere on the map.
    *   Click the **"Place End"** button, then click your destination.
3.  **View Route**: The application will automatically calculate the best route.
    *   The **Sidebar** will show a step-by-step itinerary.
    *   The map will display the route path.
    *   If no route is found (e.g., points are too far from any line), an error will appear in the console (UI error handling coming soon).
4.  **Compare**: Click "Open in Google Maps" to see how long the same trip would take today using modern transit or driving.

### Data Acquisition & Processing
1. **Source Identification**
   - Locate historical maps and timetables of the Pacific Electric system
   - Find existing GeoJSON data or convert from Google Maps custom map

2. **Digitization Process**
   - Convert route maps to GeoJSON format
   - Create digital timetables from historical photographs
   - Establish a consistent data structure for the application

### UI/UX Design
- Google Maps-inspired interface with:
  - Full-screen map as the primary interface
  - Left sidebar for search results
  - Historical styling touches to distinguish from modern maps (maybe googie architecture inspired)
  - Mobile-responsive design (secondary priority)