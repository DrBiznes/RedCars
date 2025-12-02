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
                            The network was anchored by massive downtown hubs like the <strong>Subway Terminal Building</strong>, where trains dove underground to speed beneath the congested streets, and the <strong>Pacific Electric Building on 6th and Main</strong>, a stunning Beaux-Arts structure that served as the system's headquarters and main terminal. It was a transit paradise that would make any modern urbanist weep openly in public. Seriously, look at a map of the 1920s system and try not to get emotional.
                        </p>
                        <div className="my-6 rounded-lg overflow-hidden border border-border/50">
                            <img
                                src="/pebuilding.jpg"
                                alt="Historic Pacific Electric Building on 6th and Main in downtown Los Angeles"
                                className="w-full h-auto"
                            />
                            <p className="text-sm text-muted-foreground text-center py-2 px-4 bg-muted/30">
                                The Pacific Electric Building, 6th and Main, Los Angeles
                            </p>
                        </div>
                        <p>
                            So where did it all go? Well, if you catch me after I've had a few beers at the bar, I'll tell you the truth: a shadowy cabal of auto/oil/tire companies bought up the system specifically to dismantle it and force everyone (but especially me) to drive. While historians might mumble about "changing land use patterns" and "deferred maintenance," we all know the truth. They bought it, they scrapped it, and now we're stuck in traffic on the 405.
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
                            The network was reconstructed by digitizing historical maps in <strong>ArcGIS</strong>, combining routes from multiple eras of the Pacific Electric system into a single comprehensive GeoJSON dataset. Historical timetables from the <strong>Pacific Electric Railway Historical Society</strong> and the <strong>Electric Railway Historical Association of Southern California</strong> provided average speeds for major lines, which were incorporated into the routing model.
                        </p>
                        <p>
                            The routing engine builds a graph where each node represents a point along a transit line, spaced approximately every quarter mile. Edges between nodes are weighted by travel time, calculated from the line's historical speed. Transfer edges connect nodes from different lines within 0.25 miles, with additional time penalties to account for waiting and walking. <strong>Dijkstra's Algorithm</strong> then finds the optimal path through this graph, running entirely in the browser.
                        </p>
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
                            <p className="text-sm text-muted-foreground">Primary source for historical maps.</p>
                        </li>
                        <li>
                            <a href="https://www.pacificelectric.org/" target="_blank" rel="noopener noreferrer" className="text-red-car-red hover:underline text-lg">
                                Pacific Electric Railway Historical Society
                            </a>
                            <p className="text-sm text-muted-foreground">Detailed history, photographs, and timetable data.</p>
                        </li>
                        <li>
                            <a href="https://www.erha.org/" target="_blank" rel="noopener noreferrer" className="text-red-car-red hover:underline text-lg">
                                Electric Railway Historical Association of Southern California
                            </a>
                            <p className="text-sm text-muted-foreground">Historical timetables and operational data for speed calculations.</p>
                        </li>
                    </ul>
                </section>

                {/* Made By Section */}
                <section className="space-y-6 border-t border-border/30 pt-8">
                    <div className="text-center space-y-4">
                        <p className="text-lg text-muted-foreground">
                            Made by <strong className="text-foreground">James Femino</strong>
                        </p>
                        <div className="flex justify-center gap-6">
                            <a
                                href="https://github.com/DrBiznes"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-red-car-red transition-colors"
                                aria-label="GitHub"
                            >
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                </svg>
                            </a>
                            <a
                                href="https://jamino.me"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-red-car-red transition-colors"
                                aria-label="Website"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                </svg>
                            </a>
                            <a
                                href="https://x.com/drbiznez"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-red-car-red transition-colors"
                                aria-label="Twitter/X"
                            >
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                                </svg>
                            </a>
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
};

export default About;
