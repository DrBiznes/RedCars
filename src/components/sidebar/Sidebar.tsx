import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RouteResult } from '@/lib/graph';
import { X } from 'lucide-react';

interface SidebarProps {
    onClose?: () => void;
    isOpen: boolean;
    // Props below are kept for compatibility but might be unused in this simplified version
    defaultTab?: string;
    onLinesChange?: (lines: string[]) => void;
    selectedLines?: string[];
}

const Sidebar: React.FC<SidebarProps> = ({
    onClose,
    isOpen
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
        const url = `https://www.google.com/maps/dir/?api=1&origin=${start[1]},${start[0]}&destination=${end[1]},${end[0]}&travelmode=driving`;
        window.open(url, '_blank');
    };

    return (
        <aside
            className={cn(
                "fixed top-[60px] left-0 bottom-[40px] w-96 bg-background/95 backdrop-blur-sm text-foreground border-r border-border h-[calc(100vh-100px)] flex flex-col z-10 shadow-lg",
                "transition-transform duration-300 ease-in-out",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}
        >
            <div className="p-4 border-b border-border flex justify-between items-center bg-muted/50">
                <h2 className="font-semibold text-lg">Route Debugger</h2>
                {onClose && (
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>

            <div className="p-4 flex-1 overflow-auto">
                {!routeResult ? (
                    <div className="text-sm text-muted-foreground text-center mt-10">
                        <p>Select a Start and End point on the map to calculate a route.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Summary Card */}
                        <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800">
                            <h3 className="text-red-800 dark:text-red-400 font-bold text-lg mb-2">Red Car Trip</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-red-600 dark:text-red-300 uppercase font-semibold">Total Time</p>
                                    <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                                        {Math.round(routeResult.totalTime)} <span className="text-sm font-normal">min</span>
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-red-600 dark:text-red-300 uppercase font-semibold">Distance</p>
                                    <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                                        {routeResult.segments.reduce((acc, seg) => acc + seg.distance, 0).toFixed(1)} <span className="text-sm font-normal">mi</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Segments List */}
                        <div>
                            <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Itinerary</h4>
                            <div className="space-y-0 relative border-l-2 border-muted ml-3 pl-6 pb-2">
                                {routeResult.segments.map((seg, idx) => (
                                    <div key={idx} className="relative mb-6 last:mb-0">
                                        {/* Timeline Dot */}
                                        <div className={cn(
                                            "absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-background",
                                            seg.instructions.includes("Walk") ? "bg-gray-400" : "bg-red-500"
                                        )} />

                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-medium text-sm">{seg.instructions}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {seg.distance.toFixed(2)} miles
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <span className="inline-flex items-center justify-center px-2 py-1 rounded-full bg-muted text-xs font-medium">
                                                    {Math.round(seg.time)} min
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Comparison */}
                        <div className="pt-4 border-t border-border">
                            <h4 className="font-semibold mb-2 text-sm">Modern Comparison</h4>
                            <Button
                                variant="outline"
                                className="w-full justify-between"
                                onClick={handleGoogleMapsClick}
                            >
                                <span>Check Google Maps</span>
                                <span className="text-xs text-muted-foreground">Opens in new tab</span>
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
};

export default Sidebar;