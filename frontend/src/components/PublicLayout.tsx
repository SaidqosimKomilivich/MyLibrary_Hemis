import { Outlet, useLocation } from 'react-router-dom';
import PublicNavbar from './PublicNavbar';

export default function PublicLayout() {
    const location = useLocation();

    return (
        <div className="min-h-screen flex flex-col bg-canvas text-text font-sans">
            <PublicNavbar />
            <div key={location.pathname} className="page-transition-wrapper flex-1 w-full relative">
                <Outlet />
            </div>
        </div>
    );
}
