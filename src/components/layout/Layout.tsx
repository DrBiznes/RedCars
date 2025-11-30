import React, { useState } from 'react';
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

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [showSidebar, setShowSidebar] = useState(true); // Default to open for debugging

  const toggleSidebar = () => {
    setShowSidebar(prev => !prev);
  };

  const handleStartMarkerSelect = () => {
    if (window.mapControls) {
      window.mapControls.startPlacingStart();
    }
  };

  const handleEndMarkerSelect = () => {
    if (window.mapControls) {
      window.mapControls.startPlacingEnd();
    }
  };

  const handleZoomIn = () => {
    if (window.mapControls) {
      window.mapControls.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (window.mapControls) {
      window.mapControls.zoomOut();
    }
  };

  const handleResetView = () => {
    if (window.mapControls) {
      window.mapControls.resetView();
    }
  };


  return (
    <div className="flex flex-col h-screen">
      <Header />

      <div className="flex-1 relative overflow-hidden">
        {/* Main content (map) always takes full width */}
        <main className="w-full h-full">
          <Map />
          {children}
        </main>

        {/* Sidebar that slides over the map */}
        <Sidebar
          onClose={toggleSidebar}
          isOpen={showSidebar}
        />

        {/* Position the dock absolutely relative to the main container so it's above the map */}
        <MapDock
          onStartMarkerSelect={handleStartMarkerSelect}
          onEndMarkerSelect={handleEndMarkerSelect}
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