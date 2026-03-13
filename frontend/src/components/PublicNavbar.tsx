import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function PublicNavbar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();

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
        <nav className="sticky top-0 z-50 w-full bg-surface/80 backdrop-blur-md border-b border-border/50">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
                    <img
                        src="/icon_arm_transparent.png"
                        alt="ARM logo"
                        className="w-8 h-8 object-contain"
                    />
                    <span className="text-[0.72rem] font-bold leading-snug text-text max-w-50 sm:max-w-xs">
                        Mirzo Ulug'bek nomidagi O'zbekiston Milliy universitetining Jizzax filiali «Axborot Resurs Markazi»
                    </span>
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

                    {/* Theme Toggle Button */}
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-full text-text-muted hover:text-emerald-500 hover:bg-surface-hover transition-colors"
                        title={theme === 'dark' ? "Yorug' rejim" : "Tungi rejim"}
                    >
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
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
