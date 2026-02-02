import { Button } from '@/components/ui/button';
import { Bus } from 'lucide-react';
import { ROUTE_TYPE_LABELS } from './constants';
import { RouteDetails } from './types';

interface RouteInfoPanelProps {
  details: RouteDetails;
  onEdit: () => void;
}

export function RouteInfoPanel({ details, onEdit }: RouteInfoPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Bus className="w-4 h-4" />
          Route Information
        </h3>
        <Button variant="outline" size="sm" onClick={onEdit}>
          Edit
        </Button>
      </div>
      <div className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground">Short Name</p>
          <p className="font-medium">{details.route.route_short_name}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Long Name</p>
          <p className="font-medium">{details.route.route_long_name}</p>
        </div>
        {details.route.route_desc && (
          <div>
            <p className="text-xs text-muted-foreground">Description</p>
            <p>{details.route.route_desc}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-muted-foreground">Route Type</p>
          <p>{ROUTE_TYPE_LABELS[details.route.route_type] || 'Unknown'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Trips</p>
          <p>{details.trips.length} trip(s)</p>
        </div>
      </div>
    </div>
  );
}
