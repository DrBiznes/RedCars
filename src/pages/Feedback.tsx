import React from 'react';
import { Button } from '@/components/ui/button';
import { PacificElectricLoader } from '@/components/ui/PacificElectricLoader';
import { Mail, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const Feedback = () => {
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
                        Contact Me
                    </h1>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                        Shoot me an email if you have any complaints or hate my work or something.
                    </p>
                </div>

                <div className="pt-4">
                    <Button
                        size="lg"
                        className="bg-red-car-red hover:bg-red-car-red/90 text-white font-['Josefin_Sans'] text-lg px-8 py-6 shadow-lg shadow-red-car-red/20 transition-all hover:scale-105"
                        onClick={() => window.location.href = 'mailto:contact@jamino.me'}
                    >
                        <Mail className="mr-2 h-5 w-5" />
                        Email Me
                    </Button>
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

export default Feedback;
