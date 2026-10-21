export default function HeroSection() {
    return (
        <section id="home" className="scroll-mt-24 bg-blue-50">
            <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28">

                {/* Left: Content */}
                <div>
                    <span className="inline-block rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
                        DAY-CARE ELDERLY SERVICE
                    </span>

                    <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
                        Care That Feels Like Home,{" "}
                        <span className="text-blue-600">
                            Every Day.
                        </span>
                    </h1>

                    <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 md:text-lg">
                        Providing compassionate daytime care, meaningful
                        activities, and personalized support for seniors —
                        while giving families peace of mind throughout the day.
                    </p>

                    <div className="mt-8 flex flex-wrap gap-4">
                        <a
                            href="/services"
                            className="rounded-xl bg-blue-600 px-7 py-3.5 font-semibold text-white shadow-md transition hover:bg-blue-700"
                        >
                            Explore Our Services
                        </a>

                        <a
                            href="/contact"
                            className="rounded-xl border border-slate-300 bg-white px-7 py-3.5 font-semibold text-slate-700 transition hover:border-blue-600 hover:text-blue-600"
                        >
                            Contact Us
                        </a>
                    </div>

                    <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-slate-600">
                        <span>✓ Compassionate Care</span>
                        <span>✓ Safe Environment</span>
                        <span>✓ Family Connection</span>
                    </div>
                </div>

                {/* Right: Image Placeholder */}
                <div className="relative">
                    <div className="flex h-[320px] items-center justify-center rounded-3xl border-2 border-dashed border-blue-200 bg-blue-100/50 md:h-[450px]">
                        <div className="text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm">
                                ♡
                            </div>

                            <p className="font-semibold text-slate-600">
                                Hero Image
                            </p>

                            <p className="mt-1 text-sm text-slate-400">
                                Add your image here later
                            </p>
                        </div>
                    </div>

                    {/* Floating Information Card */}
                    <div className="absolute -bottom-5 left-4 rounded-2xl bg-white p-4 shadow-lg md:-left-6 md:p-5">
                        <p className="font-bold text-slate-900">
                            Care with Compassion
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                            Making every day meaningful
                        </p>
                    </div>
                </div>

            </div>
        </section>
    );
}