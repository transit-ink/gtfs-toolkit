import { Route } from '@/types/gtfs';
import { Bus, TrainFront, TramFront } from 'lucide-react';
import { Link } from 'react-router-dom';

const RouteIcon = ({ routeType, color }: { routeType: number; color: string }) => {
  switch (routeType) {
    case 0: // Tram / Streetcar
      return <TramFront className="w-5 h-5" style={{ color }} />;
    case 1: // Subway / Metro
    case 2: // Rail
      return <TrainFront className="w-5 h-5" style={{ color }} />;
    case 3: // Bus
    default:
      return <Bus className="w-5 h-5" style={{ color }} />;
  }
};

const FALLBACKS = {
  primary: {
    routeColor: '#dc2626',
    bgColor: 'rgb(254 226 226)',
    iconColor: '#dc2626',
  },
  muted: {
    routeColor: '#6b7280',
    bgColor: 'rgb(243 244 246)',
    iconColor: '#6b7280',
  },
} as const;

interface RouteRowProps {
  route: Route;
  variant?: 'primary' | 'muted';
}

const RouteRow = ({ route, variant = 'primary' }: RouteRowProps) => {
  const fallback = FALLBACKS[variant];
  const routeColor = route.route_color ? `#${route.route_color}` : fallback.routeColor;
  const routeTextColor = route.route_text_color ? `#${route.route_text_color}` : '#ffffff';
  const bgColor = route.route_color ? routeColor : fallback.bgColor;
  const iconColor = route.route_color ? routeTextColor : fallback.iconColor;

  return (
    <Link
      to={`/route/${route.route_id}`}
      className="flex items-center gap-3 p-3 hover:bg-accent rounded-lg transition-colors"
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: bgColor }}
      >
        <RouteIcon routeType={route.route_type} color={iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium">{route.route_short_name}</p>
        <p className="text-sm text-muted-foreground truncate">{route.route_long_name}</p>
      </div>
    </Link>
  );
};

export default RouteRow;
