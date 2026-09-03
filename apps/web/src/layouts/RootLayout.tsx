import React from "react";
import { Outlet } from "react-router-dom";
import { Navbar } from "../components/Navbar";

export const RootLayout: React.FC = () => {
    return (
        <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
            <Navbar />
            <main className="flex-1 w-full p-6 lg:p-8">
                <Outlet />
            </main>
        </div>
    );
};
