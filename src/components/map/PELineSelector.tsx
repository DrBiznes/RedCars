import React, { useState, useEffect } from 'react';
import { Feature, FeatureCollection } from 'geojson';

interface PELineSelectorProps {
  onLinesChange: (lines: string[]) => void;
  selectedLines: string[];
  className?: string;
}

const PELineSelector: React.FC<PELineSelectorProps> = ({ 
  onLinesChange, 
  selectedLines,
  className 
}) => {
  const [lines, setLines] = useState<{name: string; description: string | null}[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLines = async () => {
      try {
        setLoading(true);
        const response = await fetch('/src/data/GeoJSON/lines.geojson');
        const data: FeatureCollection = await response.json();
        
        const lineNames = data.features
          .map((feature: Feature) => ({
            name: feature.properties?.Name || 'Unnamed Line',
            description: feature.properties?.description || null
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        
        setLines(lineNames);
      } catch (error) {
        console.error('Error loading lines:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLines();
  }, []);

  const handleLineToggle = (lineName: string) => {
    if (selectedLines.includes(lineName)) {
      onLinesChange(selectedLines.filter(name => name !== lineName));
    } else {
      onLinesChange([...selectedLines, lineName]);
    }
  };

  const toggleAllLines = () => {
    if (selectedLines.length === lines.length) {
      onLinesChange([]);
    } else {
      onLinesChange(lines.map(line => line.name));
    }
  };

  const filteredLines = lines.filter(line => 
    line.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (line.description && line.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className={`pe-line-selector ${className || ''}`}>
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="Search lines..."
          className="px-3 py-2 border border-border rounded w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <div className="mb-4">
        <button 
          onClick={toggleAllLines}
          className="px-3 py-1 text-sm bg-accent/20 rounded border border-border w-full"
        >
          {selectedLines.length === lines.length ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">Loading lines...</div>
      ) : (
        <div className="overflow-y-auto max-h-[400px] border border-border rounded p-2">
          {filteredLines.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">No lines match your search</div>
          ) : (
            <ul className="space-y-1">
              {filteredLines.map((line) => (
                <li key={line.name} className="py-1">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedLines.includes(line.name)}
                      onChange={() => handleLineToggle(line.name)}
                      className="mt-1"
                    />
                    <div>
                      <div className="text-sm font-medium">{line.name}</div>
                      {line.description && (
                        <div className="text-xs text-muted-foreground">
                          {line.description}
                        </div>
                      )}
                    </div>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default PELineSelector;