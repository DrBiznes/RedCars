import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const About = () => {
    return (
        <div className="min-h-screen bg-background text-foreground font-['Josefin_Sans'] p-8 pt-24 overflow-y-auto">
            <div className="max-w-3xl mx-auto space-y-12 pb-20">

                {/* Header */}
                <div className="space-y-4">
                    <Link to="/">
                        <Button variant="ghost" className="pl-0 hover:bg-transparent hover:text-red-car-red group">
                            <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                            Back to Map
                        </Button>
                    </Link>
                    <h1 className="text-5xl font-bold text-red-car-red">About the Project</h1>
                    <p className="text-xl text-muted-foreground leading-relaxed">
                        Reconstructing the lost Pacific Electric Railway network to visualize what could have been.
                    </p>
                </div>

                {/* History Section */}
                <section className="space-y-6">
                    <h2 className="text-3xl font-bold border-b border-border/50 pb-2">The Great Red Cars</h2>
                    <div className="prose dark:prose-invert max-w-none space-y-4 text-lg">
                        <p>
                            The <strong>Pacific Electric Railway</strong>, affectionately known as the "Red Cars," was once the largest electric railway system in the world. At its peak in the 1920s, it spanned over 1,000 miles of track, connecting Los Angeles, Orange, Riverside, and San Bernardino counties.
                        </p>
                        <p>
                            For decades, the Red Cars were the lifeblood of Southern California, shaping the region's development and allowing people to travel easily between the city center, the beaches, and the mountains. However, with the rise of the automobile and the expansion of the freeway system, ridership declined. The last Red Car ran in 1961, marking the end of an era.
                        </p>
                        <p>
                            Today, as Los Angeles invests billions in rebuilding its transit network, we look back at the Red Cars not just with nostalgia, but as a blueprint for a connected future.
                        </p>
                    </div>
                </section>

                {/* Project Info Section */}
                <section className="space-y-6">
                    <h2 className="text-3xl font-bold border-b border-border/50 pb-2">How It Was Built</h2>
                    <div className="prose dark:prose-invert max-w-none space-y-4 text-lg">
                        <p>
                            <strong>Pacific Electric Pathfinder</strong> was built to answer a simple question: <em>"How long would my commute take if the Red Cars were still here?"</em>
                        </p>
                        <p>
                            To achieve this, I digitized historical maps and timetables from the 1940s. The application uses a custom routing engine built with <strong>Dijkstra's Algorithm</strong> to calculate the optimal path through the historical network.
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Frontend:</strong> React, TypeScript, Tailwind CSS</li>
                            <li><strong>Mapping:</strong> Mapbox GL JS, Leaflet</li>
                            <li><strong>Data:</strong> GeoJSON digitized from historical archives</li>
                            <li><strong>Routing:</strong> Custom graph-based pathfinding running entirely in the browser</li>
                        </ul>
                    </div>
                </section>

                {/* References Section */}
                <section className="space-y-6">
                    <h2 className="text-3xl font-bold border-b border-border/50 pb-2">References & Resources</h2>
                    <ul className="space-y-3">
                        <li>
                            <a href="https://www.metro.net/about/library/archives/" target="_blank" rel="noopener noreferrer" className="text-red-car-red hover:underline text-lg">
                                LA Metro Transportation Library & Archive
                            </a>
                            <p className="text-sm text-muted-foreground">Primary source for historical maps and timetables.</p>
                        </li>
                        <li>
                            <a href="https://www.pacificelectric.org/" target="_blank" rel="noopener noreferrer" className="text-red-car-red hover:underline text-lg">
                                Pacific Electric Railway Historical Society
                            </a>
                            <p className="text-sm text-muted-foreground">Invaluable detailed history and photographs of the rolling stock.</p>
                        </li>
                        <li>
                            <a href="https://www.loc.gov/" target="_blank" rel="noopener noreferrer" className="text-red-car-red hover:underline text-lg">
                                Library of Congress
                            </a>
                            <p className="text-sm text-muted-foreground">Source for high-resolution historical maps of Los Angeles County.</p>
                        </li>
                    </ul>
                </section>

            </div>
        </div>
    );
};

export default About;
