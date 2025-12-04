import React from 'react';
import { cn } from '@/lib/utils';
import { RouteResult } from '@/lib/graph';
import PanelContent from './PanelContent.tsx';

// Shared content component
interface DesktopControlPanelProps {
    onStartMarkerSelect: () => void;
    onEndMarkerSelect: () => void;
    handleStartLocationSelect: (lat: number, lon: number) => void;
    handleEndLocationSelect: (lat: number, lon: number) => void;
    routeResult: RouteResult | null;
    handleGoogleMapsClick: () => void;
    handleTwitterShare: () => void;
    className?: string;
    innerClassName?: string;
}

const DesktopControlPanel: React.FC<DesktopControlPanelProps> = ({
    onStartMarkerSelect,
    onEndMarkerSelect,
    handleStartLocationSelect,
    handleEndLocationSelect,
    routeResult,
    handleGoogleMapsClick,
    handleTwitterShare,
    className,
    innerClassName
}) => {
    return (
        <div className={cn(
            "absolute top-36 left-6 z-10 flex flex-col gap-2 w-96 transition-all duration-300 ease-in-out",
            "hidden md:flex", // Hide on mobile
            className
        )}>
            <div className={cn(
                "bg-background/95 backdrop-blur-md border border-border/50 shadow-2xl rounded-2xl overflow-hidden flex flex-col",
                "max-h-[calc(100vh-180px)]",
                innerClassName
            )}>
                {/* Header Section */}
                <div className="p-3 bg-muted/30 border-b border-border/50">
                    <h2 className="font-['Josefin_Sans'] text-2xl font-bold text-foreground ">Trip Planner</h2>
                </div>
                <div className="p-5 space-y-6 overflow-y-auto custom-scrollbar">
                    <PanelContent
                        onStartMarkerSelect={onStartMarkerSelect}
                        onEndMarkerSelect={onEndMarkerSelect}
                        handleStartLocationSelect={handleStartLocationSelect}
                        handleEndLocationSelect={handleEndLocationSelect}
                        routeResult={routeResult}
                        handleGoogleMapsClick={handleGoogleMapsClick}
                        handleTwitterShare={handleTwitterShare}
                    />
                </div>
            </div>
        </div>
    );
};

export default DesktopControlPanel;
