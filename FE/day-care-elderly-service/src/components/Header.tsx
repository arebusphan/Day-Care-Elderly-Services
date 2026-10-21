export default function Header() {
    return (
        <header className="sticky top-0 z-50 bg-white shadow-sm">
            <div className="mx-auto flex max-w-7xl items-center justify-between  py-4">
                {/* Logo */}
                <a
                    href="#home"
                    className="text-2xl font-bold text-blue-600"
                >
                    DayCare
                </a>

                {/* Navigation */}
                <nav className="flex items-center gap-8">
                    <a
                        href="#home"
                        className="font-medium text-slate-700 transition hover:text-blue-600"
                    >
                        Home
                    </a>

                    <a
                        href="#about"
                        className="font-medium text-slate-700 transition hover:text-blue-600"
                    >
                        About
                    </a>

                    <a
                        href="#services"
                        className="font-medium text-slate-700 transition hover:text-blue-600"
                    >
                        Services
                    </a>

                    <a
                        href="#blog"
                        className="font-medium text-slate-700 transition hover:text-blue-600"
                    >
                        Blog
                    </a>

                    <a
                        href="#contact"
                        className="font-medium text-slate-700 transition hover:text-blue-600"
                    >
                        Contact
                    </a>
                </nav>

                {/* Login */}
                <a
                    href="/login"
                    className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-700"
                >
                    Login
                </a>
            </div>
        </header>
    );
}