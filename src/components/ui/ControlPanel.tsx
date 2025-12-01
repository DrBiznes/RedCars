import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RouteResult } from '@/lib/graph';
import { MapPin, Navigation } from 'lucide-react';
import SearchBox from './SearchBox';
import { Separator } from '@/components/ui/separator';

interface ControlPanelProps {
    onStartMarkerSelect: () => void;
    onEndMarkerSelect: () => void;
    onLocationSelect: (lat: number, lon: number, name: string) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
    onStartMarkerSelect,
    onEndMarkerSelect,
    onLocationSelect
}) => {
    const [routeResult, setRouteResult] = useState<RouteResult | null>(null);

    useEffect(() => {
        const handleRouteCalculated = (event: CustomEvent<RouteResult | null>) => {
            setRouteResult(event.detail);
        };

        window.addEventListener('route-calculated', handleRouteCalculated as EventListener);
        return () => {
            window.removeEventListener('route-calculated', handleRouteCalculated as EventListener);
        };
    }, []);

    const handleGoogleMapsClick = () => {
        if (!routeResult || routeResult.path.length === 0) return;
        const start = routeResult.path[0];
        const end = routeResult.path[routeResult.path.length - 1];
        const url = `https://www.google.com/maps/dir/?api=1&origin=${start[1]},${start[0]}&destination=${end[1]},${end[0]}&travelmode=transit`;
        window.open(url, '_blank');
    };

    return (
        <div className={cn(
            "absolute top-36 left-6 z-10 transition-all duration-300 ease-in-out flex flex-col gap-2 w-96 opacity-100"
        )}>
            {/* Main Panel */}
            <div className={cn(
                "bg-background/95 backdrop-blur-md border border-border/50 shadow-2xl rounded-2xl overflow-hidden flex flex-col transition-all duration-300",
                "w-full max-h-[calc(100vh-180px)]" // Adjusted to prevent clipping with footer and account for new top position
            )}>
                {/* Header Section */}
                <div className="p-5 bg-muted/30 border-b border-border/50">
                    <h2 className="font-['Josefin_Sans'] text-2xl font-bold text-foreground mb-1">Trip Planner</h2>
                </div>

                <div className="p-5 space-y-6 overflow-y-auto custom-scrollbar">
                    {/* Search Section */}
                    <div className="space-y-4">
                        <SearchBox onLocationSelect={onLocationSelect} placeholder="Where to?" />

                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                variant="outline"
                                className="h-auto py-3 flex flex-col gap-1 items-center justify-center border-dashed border-2 hover:border-green-500/50 hover:bg-green-500/5 dark:hover:bg-green-500/10 transition-all group"
                                onClick={onStartMarkerSelect}
                            >
                                <MapPin className="h-5 w-5 text-green-600 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-medium">Set Start</span>
                            </Button>
                            <Button
                                variant="outline"
                                className="h-auto py-3 flex flex-col gap-1 items-center justify-center border-dashed border-2 hover:border-red-500/50 hover:bg-red-500/5 dark:hover:bg-red-500/10 transition-all group"
                                onClick={onEndMarkerSelect}
                            >
                                <MapPin className="h-5 w-5 text-red-600 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-medium">Set End</span>
                            </Button>
                        </div>
                    </div>

                    <Separator />

                    {/* Route Results */}
                    {!routeResult ? (
                        <div className="text-center py-8 text-muted-foreground/50">
                            <Navigation className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p className="text-sm font-medium">Select points to calculate route</p>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Summary Card */}
                            <div className="bg-red-car-red/5 border border-red-car-red/20 rounded-xl p-4">
                                <div className="flex justify-between items-end mb-4">
                                    <div>
                                        <p className="text-xs font-bold text-red-car-red uppercase tracking-wider mb-1">Total Travel Time</p>
                                        <p className="text-4xl font-['Josefin_Sans'] font-bold text-foreground">
                                            {Math.round(routeResult.totalTime)}<span className="text-lg ml-1 text-muted-foreground">min</span>
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Distance</p>
                                        <p className="text-xl font-['Josefin_Sans'] font-bold text-foreground">
                                            {routeResult.segments.reduce((acc, seg) => acc + seg.distance, 0).toFixed(1)}<span className="text-sm ml-1 text-muted-foreground">mi</span>
                                        </p>
                                    </div>
                                </div>

                                <Button
                                    className="w-full bg-red-car-red hover:bg-red-car-red/90 text-white font-['Josefin_Sans'] tracking-wide shadow-lg shadow-red-car-red/20"
                                    onClick={handleGoogleMapsClick}
                                >
                                    Compare with Modern Transit
                                </Button>
                            </div>

                            {/* Itinerary */}
                            <div className="space-y-4">
                                <h3 className="font-['Josefin_Sans'] font-bold text-lg border-b border-border/50 pb-2">Itinerary</h3>
                                <div className="relative pl-6 space-y-6 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border/50">
                                    {routeResult.segments.map((seg, idx) => (
                                        <div key={idx} className="relative group">
                                            <div className={cn(
                                                "absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-background shadow-sm transition-colors",
                                                seg.instructions.includes("Walk") ? "bg-muted-foreground" : "bg-red-car-red"
                                            )} />
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-1">
                                                    <p className="font-medium text-sm leading-tight">{seg.instructions}</p>
                                                    <p className="text-xs text-muted-foreground">{seg.distance.toFixed(2)} miles</p>
                                                </div>
                                                <span className="text-xs font-bold bg-muted px-2 py-1 rounded-md tabular-nums">
                                                    {Math.round(seg.time)} min
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>

    );
};

export default ControlPanel;
