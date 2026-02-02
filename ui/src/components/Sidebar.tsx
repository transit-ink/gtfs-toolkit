import { Button } from '@/components/ui/button';
import { Home, Info, Map, Menu, Navigation, Search, Star, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../utils/constants';

interface SidebarProps {
  variant?: 'light' | 'dark';
}

const Sidebar: React.FC<SidebarProps> = ({ variant = 'dark' }) => {
  const [isOpen, setIsOpen] = useState(false);

  const iconColor = variant === 'light' ? 'text-foreground' : 'text-primary-foreground';
  const buttonHover = variant === 'light' ? 'hover:bg-accent' : 'hover:bg-primary-foreground/10';

  return (
    <>
      {/* Hamburger Button */}
      <Button
        variant="ghost"
        size="icon"
        className={`${iconColor} ${buttonHover}`}
        onClick={() => setIsOpen(true)}
      >
        <Menu className="w-6 h-6" color="white" />
      </Button>

      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsOpen(false)} />
      )}

      {/* Sidebar Panel */}
      <div
        className={`fixed top-0 left-0 h-full w-72 bg-primary text-primary-foreground z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-primary-foreground/20">
          {/* <h2 className="text-lg font-semibold">Bus & Metro Routes</h2> */}
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-5 h-5" color="white" />
          </Button>
        </div>

        {/* Menu Items */}
        <nav className="p-4">
          <ul className="space-y-2">
            <li>
              <Link
                to={ROUTES.home}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-primary-foreground/10 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Home className="w-5 h-5" />
                <span>Home</span>
              </Link>
            </li>
            <li>
              <Link
                to={ROUTES.search}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-primary-foreground/10 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Search className="w-5 h-5" />
                <span>Search</span>
              </Link>
            </li>
            <li>
              <Link
                to={ROUTES.plan}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-primary-foreground/10 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Navigation className="w-5 h-5" />
                <span>Plan Trip</span>
              </Link>
            </li>
            <li>
              <Link
                to={ROUTES.explore}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-primary-foreground/10 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Map className="w-5 h-5" />
                <span>Explore</span>
              </Link>
            </li>
            <li>
              <Link
                to={ROUTES.favourites}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-primary-foreground/10 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Star className="w-5 h-5" />
                <span>Favourites</span>
              </Link>
            </li>
            <li>
              <Link
                to="https://transit.ink"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-primary-foreground/10 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Info className="w-5 h-5" />
                <span>About</span>
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
