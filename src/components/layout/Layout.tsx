import React, { useState, useEffect, useRef } from 'react'; // Added useRef
import Header from './Header';
import Footer from './Footer';
import Sidebar from "@/components/sidebar/Sidebar";
import Map from "@/components/map/Map";
import MapDock from "@/components/map/MapDock";

// Define our own interface for the map controls to mirror the declaration
// This makes usage within this component type-safe without relying solely on window
interface MapControls {
    startPlacingStart: () => void;
    startPlacingEnd: () => void;
    zoomIn?: () => void;
    zoomOut?: () => void;
    resetView?: () => void;
}

const Layout = ({ children }: { children: React.ReactNode }) => {
    const [showSidebar, setShowSidebar] = useState(false);
    // Use state to hold the controls once they are available
    const [mapControls, setMapControls] = useState<MapControls | null>(null);
    // Use a ref to track if the effect has already run to avoid race conditions or multiple checks
    const controlsCheckInterval = useRef<NodeJS.Timeout | null>(null);
    const controlsCheckAttempts = useRef(0);


    // Use effect to poll for map controls registered on the window object
    useEffect(() => {
        const checkForMapControls = () => {
            console.log("Layout: Checking for window.mapControls, attempt:", controlsCheckAttempts.current + 1);
            // Check if mapControls are available on window (based on updated definition)
            if (window.mapControls) {
                console.log("Layout: window.mapControls found!");
                setMapControls({
                    startPlacingStart: window.mapControls.startPlacingStart,
                    startPlacingEnd: window.mapControls.startPlacingEnd,
                    zoomIn: window.mapControls.zoomIn,
                    zoomOut: window.mapControls.zoomOut,
                    resetView: window.mapControls.resetView
                });
                // Clear interval once found
                if (controlsCheckInterval.current) {
                    clearInterval(controlsCheckInterval.current);
                    controlsCheckInterval.current = null;
                }
            } else {
                controlsCheckAttempts.current += 1;
                // Stop checking after a certain number of attempts (e.g., 10 attempts over 5 seconds)
                if(controlsCheckAttempts.current >= 10) {
                    console.warn("Layout: window.mapControls not found after multiple attempts.");
                    if (controlsCheckInterval.current) {
                        clearInterval(controlsCheckInterval.current);
                        controlsCheckInterval.current = null;
                    }
                }
                // Continue polling if not found yet and attempts remain
            }
        };

        // Start polling immediately and then every 500ms
        checkForMapControls(); // Initial check
        if (!window.mapControls && controlsCheckAttempts.current < 10) {
            controlsCheckInterval.current = setInterval(checkForMapControls, 500);
        }


        // Cleanup function: clear interval if component unmounts before controls are found
        return () => {
            if (controlsCheckInterval.current) {
                console.log("Layout: Cleaning up mapControls check interval.");
                clearInterval(controlsCheckInterval.current);
                controlsCheckInterval.current = null;
            }
        };
    }, []); // Empty dependency array ensures this effect runs only once on mount

    const toggleSidebar = () => {
        setShowSidebar(prev => !prev);
    };

    // Call methods directly from the state variable `mapControls`
    const handleStartMarkerSelect = () => {
        console.log("Layout: handleStartMarkerSelect called");
        mapControls?.startPlacingStart(); // Use optional chaining
    };

    const handleEndMarkerSelect = () => {
        console.log("Layout: handleEndMarkerSelect called");
        mapControls?.startPlacingEnd(); // Use optional chaining
    };

    const handleZoomIn = () => {
        mapControls?.zoomIn?.(); // Use optional chaining for function itself
    };

    const handleZoomOut = () => {
        mapControls?.zoomOut?.(); // Use optional chaining
    };

    const handleResetView = () => {
        mapControls?.resetView?.(); // Use optional chaining
    };

    // These functions now primarily control the sidebar visibility/state
    const handleToggleInfo = () => {
        // TODO: Add logic to switch sidebar tab to 'info' if needed
        setShowSidebar(true);
    };

    const handleToggleLayers = () => {
        // TODO: Add logic to switch sidebar tab to 'layers' if needed
        setShowSidebar(true);
    };


    return (
        <div className="flex flex-col h-screen">
            <Header />

            {/* flex-1 makes this div take remaining vertical space */}
            <div className="flex-1 relative overflow-hidden flex"> {/* Changed to flex row */}

                {/* Sidebar that slides over the map */}
                {/* Render sidebar first in DOM for potential focus order, but use z-index/positioning */}
                <Sidebar
                    onClose={toggleSidebar}
                    isOpen={showSidebar}
                    // Pass active tab state if controlled from here
                />

                {/* Main content area (Map) */}
                {/* flex-1 makes the main content take remaining horizontal space */}
                <main className="flex-1 h-full relative"> {/* Added relative positioning */}
                    <Map />
                    {/* Render children overlaying the map if necessary */}
                    {children}

                    {/* Position the dock absolutely relative to the main container */}
                    {/* Ensure MapDock appears above the map and potentially sidebar */}
                    <MapDock
                        onStartMarkerSelect={handleStartMarkerSelect}
                        onEndMarkerSelect={handleEndMarkerSelect}
                        onToggleSidebar={toggleSidebar} // This toggles the sidebar visibility
                        onToggleInfo={handleToggleInfo} // This shows sidebar (potentially on Info tab)
                        onToggleLayers={handleToggleLayers} // This shows sidebar (potentially on Layers tab)
                        onZoomIn={handleZoomIn}
                        onZoomOut={handleZoomOut}
                        onResetView={handleResetView}
                    />
                </main>

            </div>

            <Footer />
        </div>
    );
};

export default Layout;