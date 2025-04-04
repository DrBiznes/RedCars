# Pacific Electric Red Car Travel Time Comparison Tool
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

### Algorithm Outline
1. **User Input Processing**
   - Capture start and end points from user map pins or location search and geolocation api
   - Find nearest Red Car stops to these points
   - Calculate walking time to/from these stops

2. **Route Finding**
   - Determine possible Red Car routes between the selected stops
   - Handle transfers between different lines if necessary
   - Select optimal route based on total travel time

3. **Travel Time Calculation**
   - Use digitized timetable data to calculate rail travel time
   - Add walking time to/from stops
   - Add transfer waiting time where applicable
   - Calculate total journey time

4. **Result Presentation**
   - Display route on map with color-coded segments
   - Show breakdown of travel time components
   - Generate Google Maps URL for comparison

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