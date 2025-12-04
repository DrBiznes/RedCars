import React, { useState, useEffect } from 'react';
import { RouteResult } from '@/lib/graph';
import DesktopControlPanel from './DesktopControlPanel';
import MobileControlPanel from './MobileControlPanel';

interface ControlPanelProps {
    onStartMarkerSelect: () => void;
    onEndMarkerSelect: () => void;
    className?: string;
    innerClassName?: string;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
    onStartMarkerSelect,
    onEndMarkerSelect,
    className,
    innerClassName
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

    const handleTwitterShare = () => {
        if (!routeResult) return;

        const totalMin = Math.round(routeResult.totalTime);
        let timeText = '';

        if (totalMin < 60) {
            timeText = `${totalMin} minutes`;
        } else {
            const hrs = Math.floor(totalMin / 60);
            const mins = totalMin % 60;
            if (mins === 0) {
                timeText = hrs === 1 ? '1 hour' : `${hrs} hours`;
            } else {
                timeText = `${hrs} hour${hrs > 1 ? 's' : ''} ${mins} minutes`;
            }
        }

        const tweetText = `It would have taken me ${timeText} to commute on the Pacific Electric Red Car network. Check it out at https://redcars.jamino.me`;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
        window.open(twitterUrl, '_blank');
    };

    const handleStartLocationSelect = (lat: number, lon: number) => {
        if (window.mapControls) {
            window.mapControls.setStartLocation(lat, lon);
        }
    };

    const handleEndLocationSelect = (lat: number, lon: number) => {
        if (window.mapControls) {
            window.mapControls.setEndLocation(lat, lon);
        }
    };

    return (
        <>
            <DesktopControlPanel
                onStartMarkerSelect={onStartMarkerSelect}
                onEndMarkerSelect={onEndMarkerSelect}
                handleStartLocationSelect={handleStartLocationSelect}
                handleEndLocationSelect={handleEndLocationSelect}
                routeResult={routeResult}
                handleGoogleMapsClick={handleGoogleMapsClick}
                handleTwitterShare={handleTwitterShare}
                className={className}
                innerClassName={innerClassName}
            />
            <MobileControlPanel
                onStartMarkerSelect={onStartMarkerSelect}
                onEndMarkerSelect={onEndMarkerSelect}
                handleStartLocationSelect={handleStartLocationSelect}
                handleEndLocationSelect={handleEndLocationSelect}
                routeResult={routeResult}
                handleGoogleMapsClick={handleGoogleMapsClick}
                handleTwitterShare={handleTwitterShare}
            />
        </>
    );
};

export default ControlPanel;

