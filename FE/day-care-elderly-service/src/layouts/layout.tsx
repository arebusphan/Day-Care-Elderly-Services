import type { ReactNode } from "react";

import Header from "../components/Header";
import Footer from "../components/Footer";

interface MainLayoutProps {
    children: ReactNode;
}
export default function Layout({ children }: MainLayoutProps) {
    return (
        <div className="flex min-h-screen flex-col">
            

            
                <Header />

                <main className="flex-1">
                    {children}
            </main>
            <Footer />
        </div>

    )
}