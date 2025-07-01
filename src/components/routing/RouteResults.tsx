import { RouteResult } from '@/routing/types/routing.types';
import { Clock, Route, FootprintsIcon, Train } from 'lucide-react';

interface RouteResultsProps {
  route: RouteResult;
}

const RouteResults = ({ route }: RouteResultsProps) => {
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDistance = (miles: number): string => {
    return `${miles.toFixed(1)} mi`;
  };

  return (
    <div className="p-4 space-y-4">
      {/* Summary */}
      <div className="bg-muted rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <span className="font-semibold">Total Time</span>
          </div>
          <span className="text-lg font-bold">{formatTime(route.totalTime)}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Route className="w-4 h-4 text-muted-foreground" />
            <span>Distance</span>
          </div>
          <span>{formatDistance(route.totalDistance)}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Train className="w-4 h-4 text-muted-foreground" />
            <span>Transfers</span>
          </div>
          <span>{route.transfers}</span>
        </div>
      </div>

      {/* Time Breakdown */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm">Time Breakdown</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <div className="flex items-center gap-2">
              <FootprintsIcon className="w-4 h-4 text-muted-foreground" />
              <span>Walking</span>
            </div>
            <span>{formatTime(route.walkingTime)}</span>
          </div>
          <div className="flex justify-between">
            <div className="flex items-center gap-2">
              <Train className="w-4 h-4 text-muted-foreground" />
              <span>Transit</span>
            </div>
            <span>{formatTime(route.transitTime)}</span>
          </div>
        </div>
      </div>

      {/* Route Details */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm">Route Details</h3>
        <div className="space-y-3">
          {route.segments.map((segment, index) => (
            <div key={index} className="relative">
              {index > 0 && (
                <div className="absolute left-2 -top-3 w-0.5 h-3 bg-border" />
              )}
              
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-4 h-4 rounded-full bg-primary mt-0.5" />
                
                <div className="flex-1 text-sm">
                  {segment.isWalking ? (
                    <div>
                      <span className="text-muted-foreground">Walk</span>
                      <span className="ml-1">{formatTime(segment.time)}</span>
                      <span className="text-muted-foreground ml-1">
                        ({formatDistance(segment.distance)})
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="font-medium">{segment.lineName}</span>
                      {segment.isTransfer && (
                        <span className="text-xs text-muted-foreground ml-1">(transfer)</span>
                      )}
                      <div className="text-muted-foreground">
                        {segment.from.name || 'Station'} → {segment.to.name || 'Station'}
                      </div>
                      <span className="text-muted-foreground">
                        {formatTime(segment.time)} ({formatDistance(segment.distance)})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lines Used */}
      {route.lines.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Lines Used</h3>
          <div className="flex flex-wrap gap-2">
            {route.lines.map((line, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs"
              >
                {line}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteResults;