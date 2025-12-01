import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';

import { cn } from '@/lib/utils';

interface SearchResult {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
}

interface SearchBoxProps {
    onLocationSelect: (lat: number, lon: number, name: string) => void;
    placeholder?: string;
    className?: string;
}

const SearchBox: React.FC<SearchBoxProps> = ({ onLocationSelect, placeholder = "Search location...", className }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (query.length < 3) {
                setResults([]);
                return;
            }

            setIsLoading(true);
            try {
                // Bounding box for Los Angeles area roughly
                const viewbox = "-118.6682,33.7037,-118.1553,34.3373";
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&viewbox=${viewbox}&bounded=1&limit=5`
                );
                const data = await response.json();
                setResults(data);
                setIsOpen(true);
            } catch (error) {
                console.error("Search failed:", error);
            } finally {
                setIsLoading(false);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    const handleSelect = (result: SearchResult) => {
        setQuery(result.display_name.split(',')[0]); // Keep it short
        setIsOpen(false);
        onLocationSelect(parseFloat(result.lat), parseFloat(result.lon), result.display_name);
    };

    return (
        <div ref={wrapperRef} className={cn("relative w-full", className)}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    type="text"
                    placeholder={placeholder}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.length >= 3 && setIsOpen(true)}
                    className="pl-9 pr-4 py-6 rounded-xl border-border/50 bg-background/50 backdrop-blur-sm focus:bg-background transition-all font-['Josefin_Sans'] text-lg shadow-sm"
                />
                {isLoading && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                )}
            </div>

            {isOpen && results.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-background/95 backdrop-blur-md rounded-xl border border-border/50 shadow-xl overflow-hidden max-h-[300px] overflow-y-auto">
                    {results.map((result) => (
                        <button
                            key={result.place_id}
                            onClick={() => handleSelect(result)}
                            className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-start gap-3 border-b border-border/30 last:border-0"
                        >
                            <MapPin className="h-4 w-4 mt-1 text-red-car-red shrink-0" />
                            <div>
                                <p className="font-medium text-sm line-clamp-1">{result.display_name.split(',')[0]}</p>
                                <p className="text-xs text-muted-foreground line-clamp-1 opacity-70">
                                    {result.display_name.split(',').slice(1).join(',')}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SearchBox;
