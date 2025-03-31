import React from 'react';
import Header from './Header';
import Footer from './Footer';
import Sidebar from "@/sidebar/Sidebar.tsx";
import Map from "@/map/Map";

const Layout = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="flex flex-col h-screen">
            <Header />

            <div className="flex flex-1 overflow-hidden">
                <Sidebar />

                <main className="flex-1 relative">
                    <Map />
                    {children}
                </main>
            </div>

            <Footer />
        </div>
    );
};

export default Layout;