import React, { useState, useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import Sidebar from "@/components/sidebar/Sidebar";
import Map from "@/components/map/Map";
import MapDock from "@/components/map/MapDock";

// Update the window interface to match window.mapControls
declare global {
  interface Window {
    mapControls?: {
      startPlacingStart: () => void;
      startPlacingEnd: () => void;
      zoomIn: () => void;
      zoomOut: () => void;
      resetView: () => void;
    };
  }
}

// Define our own interface for the map controls
interface MapControls {
  startPlacingStart: () => void;
  startPlacingEnd: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
}

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [showSidebar, setShowSidebar] = useState(false);
  const [mapControls, setMapControls] = useState<MapControls | null>(null);
  const [selectedLines, setSelectedLines] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('results');

  // Use effect to get the map controls once they're registered
  useEffect(() => {
    const checkForMapControls = () => {
      if (window.mapControls) {
        setMapControls({
          startPlacingStart: window.mapControls.startPlacingStart,
          startPlacingEnd: window.mapControls.startPlacingEnd,
          zoomIn: window.mapControls.zoomIn,
          zoomOut: window.mapControls.zoomOut,
          resetView: window.mapControls.resetView
        });
      } else {
        // Try again in a moment if not available yet
        setTimeout(checkForMapControls, 500);
      }
    };

    checkForMapControls();

    return () => {
      // Clean up if needed
    };
  }, []);

  const toggleSidebar = () => {
    setShowSidebar(prev => !prev);
  };

  const handleStartMarkerSelect = () => {
    if (mapControls) {
      mapControls.startPlacingStart();
    }
  };

  const handleEndMarkerSelect = () => {
    if (mapControls) {
      mapControls.startPlacingEnd();
    }
  };

  const handleZoomIn = () => {
    if (mapControls) {
      mapControls.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapControls) {
      mapControls.zoomOut();
    }
  };

  const handleResetView = () => {
    if (mapControls) {
      mapControls.resetView();
    }
  };

  const handleToggleInfo = () => {
    setActiveTab('info');
    setShowSidebar(true);
  };

  const handleToggleLayers = () => {
    setActiveTab('layers');
    setShowSidebar(true);
  };

  const handleLinesChange = (lines: string[]) => {
    setSelectedLines(lines);
  };

  return (
    <div className="flex flex-col h-screen">
      <Header />

      <div className="flex-1 relative overflow-hidden">
        {/* Main content (map) always takes full width */}
        <main className="w-full h-full">
          <Map selectedLines={selectedLines} />
          {children}
        </main>

        {/* Sidebar that slides over the map */}
        <Sidebar
          onClose={toggleSidebar}
          isOpen={showSidebar}
          defaultTab={activeTab}
          onLinesChange={handleLinesChange}
          selectedLines={selectedLines}
        />

        {/* Position the dock absolutely relative to the main container so it's above the map */}
        <MapDock
          onStartMarkerSelect={handleStartMarkerSelect}
          onEndMarkerSelect={handleEndMarkerSelect}
          onToggleSidebar={toggleSidebar}
          onToggleInfo={handleToggleInfo}
          onToggleLayers={handleToggleLayers}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetView={handleResetView}
        />
      </div>

      <Footer />
    </div>
  );
};

export default Layout;