import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ROUTE_TYPE_LABELS } from './constants';
import { RouteDetails } from './types';

interface RouteDetailsHeaderProps {
  details: RouteDetails;
}

export function RouteDetailsHeader({ details }: RouteDetailsHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="border-b bg-card p-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/routes')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div
          className="px-4 py-2 rounded-md font-bold text-xl"
          style={{
            backgroundColor: details.route.route_color
              ? `#${details.route.route_color}`
              : '#6b7280',
            color: details.route.route_text_color
              ? `#${details.route.route_text_color}`
              : '#ffffff',
          }}
        >
          {details.route.route_short_name}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">{details.route.route_long_name}</h1>
          <p className="text-sm text-muted-foreground">
            {ROUTE_TYPE_LABELS[details.route.route_type] || 'Unknown'} •{' '}
            <span className="font-mono text-xs">{details.route.route_id}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
