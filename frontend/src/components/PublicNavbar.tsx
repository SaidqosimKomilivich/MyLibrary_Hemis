import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Library } from 'lucide-react';

export default function PublicNavbar() {
    const location = useLocation();
    const navigate = useNavigate();

    const handleScrollOrNavigate = (targetId: string, fallbackPath: string) => {
        if (location.pathname === '/') {
            const element = document.getElementById(targetId);
            if (element) {
                const y = element.getBoundingClientRect().top + window.scrollY - 80;
                window.scrollTo({ top: y, behavior: 'smooth' });
            } else {
                navigate(fallbackPath);
            }
        } else {
            navigate(fallbackPath);
        }
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-md border-b border-border/50">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2 text-emerald-500 hover:text-emerald-400 transition-colors">
                    <Library size={24} />
                    <span className="text-xl font-bold tracking-tight text-text">Kutubxona</span>
                </Link>
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => {
                            if (location.pathname === '/') {
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            } else {
                                navigate('/');
                            }
                        }}
                        className="text-sm font-medium text-text-muted hover:text-emerald-500 transition-colors hidden sm:block"
                        type="button"
                    >
                        Bosh sahifa
                    </button>
                    <button
                        onClick={() => handleScrollOrNavigate('about', '/#about')}
                        className="text-sm font-medium text-text-muted hover:text-emerald-500 transition-colors hidden sm:block"
                        type="button"
                    >
                        Biz haqimizda
                    </button>
                    <button
                        onClick={() => handleScrollOrNavigate('news', '/news')}
                        className="text-sm font-medium text-text-muted hover:text-emerald-500 transition-colors hidden sm:block"
                        type="button"
                    >
                        Yangiliklar
                    </button>
                    <button
                        onClick={() => handleScrollOrNavigate('books', '/search')}
                        className="text-sm font-medium text-text-muted hover:text-emerald-500 transition-colors hidden sm:block"
                        type="button"
                    >
                        Kitoblar
                    </button>
                    <button
                        onClick={() => handleScrollOrNavigate('help', '/#help')}
                        className="text-sm font-medium text-text-muted hover:text-emerald-500 transition-colors hidden sm:block"
                        type="button"
                    >
                        Yordam
                    </button>
                    <Link
                        to="/login"
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20"
                    >
                        Kirish
                    </Link>
                </div>
            </div>
        </nav>
    );
}
