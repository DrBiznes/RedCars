import { PacificElectricLoader } from '@/components/ui/PacificElectricLoader';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const NotFound = () => {
    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-car-red/5 via-background to-background pointer-events-none" />

            <div className="z-10 max-w-md w-full text-center space-y-8">
                <div className="flex justify-center">
                    <PacificElectricLoader className="h-32 w-32 text-red-car-red" />
                </div>

                <div className="space-y-4">
                    <h1 className="text-4xl font-['Josefin_Sans'] font-bold text-foreground">
                        404
                    </h1>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                        Page not found.
                    </p>
                </div>

                <div className="pt-12">
                    <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors group">
                        <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Map
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
