export default function AboutSection() {
    return (
        <section id="about" className="scroll-mt-24 bg-white py-20 md:py-28">
            <div className="mx-auto max-w-7xl px-6">
                <div className="grid items-center gap-12 md:grid-cols-2">

                    {/* Left: Empty Image Placeholder */}
                    <div className="flex h-[320px] items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 md:h-[420px]">
                        {/* Add your About image here later */}
                    </div>

                    {/* Right: About Content */}
                    <div>
                        <span className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
                            About Us
                        </span>

                        <h2 className="mt-4 text-3xl font-bold leading-tight text-slate-900 md:text-4xl">
                            A Better Day for Seniors,
                            <span className="text-blue-600">
                                {" "}Greater Peace of Mind for Families.
                            </span>
                        </h2>

                        <p className="mt-6 text-base leading-8 text-slate-600">
                            At Day-Care Elderly Service, we believe every
                            senior deserves care, respect, and meaningful
                            connections. Our service provides a safe and
                            welcoming environment where older adults can
                            receive daytime care, enjoy daily activities,
                            share meals, and stay socially connected.
                        </p>

                        <p className="mt-4 text-base leading-8 text-slate-600">
                            We help families stay informed through daily care
                            updates, schedules, and notifications, making it
                            easier to care for their loved ones while balancing
                            their everyday responsibilities.
                        </p>
                    </div>

                </div>
            </div>
        </section>
    );
}