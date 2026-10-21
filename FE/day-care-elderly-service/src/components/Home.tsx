import AboutSection from "./AuboutSection";
import BlogSection from "./BlogSection";
import HeroSection from "./HeroSection";
import ServiceSection from "./ServiceSection";

export default function Home() {
    return (
        <div>
            <HeroSection/>
            <AboutSection />
            <ServiceSection />
            <BlogSection />
        </div>

    )
}