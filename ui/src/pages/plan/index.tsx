import { ArrowRight, ArrowRightLeft, Bus, MapPin, Navigation } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleLoaderBlock } from '../../components/circleLoader';
import Sidebar from '../../components/sidebar';
import StopSearchInput from '../../components/stopSearchInput';
import { usePageMeta } from '../../hooks/usePageMeta';
import { getUrlParameter } from '../../utils';
import {
  DirectRoute,
  InterchangeRoute,
  TripPlanResult,
  usePlanTrip,
  useStopsBulk,
} from '../../utils/api';
import { API_CALL_STATUSES, ApiCallStatus } from '../../utils/constants';

interface SelectedStop {
  stop_id: string;
  stop_name: string;
}

const isDirectRoute = (result: TripPlanResult): result is DirectRoute => {
  return result.type === 'direct';
};

export default function PlanPage() {
  usePageMeta({
    title: 'Plan Trip',
    description:
      'Plan your bus and metro trip. Find direct routes or routes with interchanges between any two stops.',
  });

  const fromId = getUrlParameter('from');
  const toId = getUrlParameter('to');
  const urlStopIds = [fromId, toId].filter(Boolean) as string[];
  const { data: urlStops = [], isFetched: urlStopsFetched } = useStopsBulk(urlStopIds);

  const [fromStop, setFromStop] = useState<SelectedStop | null>(null);
  const [toStop, setToStop] = useState<SelectedStop | null>(null);

  // Initialize from/to from URL when stops bulk loads
  useEffect(() => {
    if (!urlStopsFetched || urlStops.length === 0) return;
    if (fromId) {
      const s = urlStops.find(st => st.stop_id === fromId);
      if (s) setFromStop({ stop_id: s.stop_id, stop_name: s.stop_name });
    }
    if (toId) {
      const s = urlStops.find(st => st.stop_id === toId);
      if (s) setToStop({ stop_id: s.stop_id, stop_name: s.stop_name });
    }
  }, [urlStopsFetched, urlStops, fromId, toId]);

  const isInitializing = urlStopIds.length > 0 && !urlStopsFetched;

  const {
    data: results = [],
    status,
    isFetching,
  } = usePlanTrip(fromStop?.stop_id, toStop?.stop_id);

  const apiStatus: ApiCallStatus =
    !fromStop || !toStop
      ? API_CALL_STATUSES.INITIAL
      : isFetching || status === 'pending'
        ? API_CALL_STATUSES.PROGRESS
        : status === 'error'
          ? API_CALL_STATUSES.ERROR
          : API_CALL_STATUSES.SUCCESS;

  // Update URL when stops change
  useEffect(() => {
    if (isInitializing) return;
    const params = new URLSearchParams();
    if (fromStop) params.set('from', fromStop.stop_id);
    if (toStop) params.set('to', toStop.stop_id);
    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    history.replaceState(null, '', newUrl);
  }, [fromStop, toStop, isInitializing]);

  const handleSwapStops = () => {
    const temp = fromStop;
    setFromStop(toStop);
    setToStop(temp);
  };

  const handleFromChange = (stop: SelectedStop | null) => {
    setFromStop(stop);
  };

  const handleToChange = (stop: SelectedStop | null) => {
    setToStop(stop);
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background">
        <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground p-4">
          <div className="flex items-center gap-3">
            <Sidebar />
            <Navigation className="w-5 h-5 shrink-0" />
            <h1 className="font-semibold">Plan Trip</h1>
          </div>
        </div>
        <div className="h-14" />
        <CircleLoaderBlock />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground p-4">
        <div className="flex items-center gap-3">
          <Sidebar />
          <Navigation className="w-5 h-5 shrink-0" />
          <h1 className="font-semibold">Plan Trip</h1>
        </div>
      </div>

      {/* Spacer for fixed header */}
      <div className="h-14" />

      {/* Search Inputs */}
      <div className="p-4 space-y-6 py-8">
        <section className="space-y-1">
          <div className="space-y-1">
            <label className="text-base font-medium text-foreground">From</label>
            <StopSearchInput
              placeholder="Search for starting stop"
              value={fromStop}
              onChange={handleFromChange}
            />
          </div>

          <div className="flex justify-center pt-1 mb-0">
            <button
              onClick={handleSwapStops}
              className="p-2 rounded-full hover:bg-accent transition-colors"
              disabled={!fromStop && !toStop}
            >
              <ArrowRightLeft className="w-5 h-5 text-muted-foreground rotate-90" />
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-base font-medium text-foreground">To</label>
            <StopSearchInput
              placeholder="Search for destination stop"
              value={toStop}
              onChange={handleToChange}
            />
          </div>
        </section>

        {/* Results */}
        {apiStatus === API_CALL_STATUSES.PROGRESS && <CircleLoaderBlock />}

        {apiStatus === API_CALL_STATUSES.SUCCESS && results.length === 0 && (
          <div className="py-8 text-center text-muted-foreground">
            No routes found between these stops
          </div>
        )}

        {apiStatus === API_CALL_STATUSES.ERROR && (
          <div className="py-8 text-center text-destructive">
            Error searching for routes. Please try again.
          </div>
        )}

        {apiStatus === API_CALL_STATUSES.SUCCESS && results.length > 0 && fromStop && toStop && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              {results.length} route{results.length !== 1 ? 's' : ''} found
            </h2>

            {results.map((result, index) =>
              isDirectRoute(result) ? (
                <DirectRouteCard
                  key={`direct-${result.route_id}-${index}`}
                  route={result}
                  fromStopId={fromStop.stop_id}
                  toStopId={toStop.stop_id}
                />
              ) : (
                <InterchangeRouteCard
                  key={`interchange-${index}`}
                  route={result}
                  fromStopId={fromStop.stop_id}
                  toStopId={toStop.stop_id}
                />
              )
            )}
          </section>
        )}
      </div>
    </div>
  );
}

interface DirectRouteCardProps {
  route: DirectRoute;
  fromStopId: string;
  toStopId: string;
}

const DirectRouteCard: React.FC<DirectRouteCardProps> = ({ route, fromStopId, toStopId }) => {
  const resultUrl = `/plan/result?type=direct&from=${encodeURIComponent(fromStopId)}&to=${encodeURIComponent(toStopId)}&route1=${encodeURIComponent(route.route_id)}`;

  return (
    <Link
      to={resultUrl}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
    >
      <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full shrink-0">
        <Bus className="w-5 h-5 text-green-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-green-600">Direct</span>
          <span className="text-xs text-muted-foreground">
            {route.to_stop_sequence - route.from_stop_sequence} stops
          </span>
        </div>
        <div className="text-sm font-medium truncate">{route.route_short_name}</div>
        <div className="text-xs text-muted-foreground truncate">{route.route_long_name}</div>
      </div>
      <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />
    </Link>
  );
};

interface InterchangeRouteCardProps {
  route: InterchangeRoute;
  fromStopId: string;
  toStopId: string;
}

const InterchangeRouteCard: React.FC<InterchangeRouteCardProps> = ({
  route,
  fromStopId,
  toStopId,
}) => {
  const totalStops =
    route.first_leg.to_stop_sequence -
    route.first_leg.from_stop_sequence +
    (route.second_leg.to_stop_sequence - route.second_leg.from_stop_sequence);

  const resultUrl = `/plan/result?type=interchange&from=${encodeURIComponent(fromStopId)}&to=${encodeURIComponent(toStopId)}&route1=${encodeURIComponent(route.first_leg.route_id)}&route2=${encodeURIComponent(route.second_leg.route_id)}&interchange=${encodeURIComponent(route.interchange_stop.stop_id)}`;

  return (
    <Link to={resultUrl} className="block p-3 rounded-lg hover:bg-accent transition-colors">
      <div className="flex items-center gap-2 mb-3">
        <span className="font-semibold text-blue-600">1 Interchange</span>
        <span className="text-xs text-muted-foreground">{totalStops} stops total</span>
        <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto" />
      </div>

      {/* First Leg */}
      <div className="flex items-center gap-3 py-2">
        <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full shrink-0">
          <Bus className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{route.first_leg.route_short_name}</div>
          <div className="text-xs text-muted-foreground truncate">
            {route.first_leg.route_long_name}
          </div>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {route.first_leg.to_stop_sequence - route.first_leg.from_stop_sequence} stops
        </span>
      </div>

      {/* Interchange Stop */}
      <div className="flex items-center gap-3 py-2 ml-4 border-l-2 border-dashed border-blue-300">
        <div className="flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full shrink-0">
          <MapPin className="w-3 h-3 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-blue-600 font-medium">Change at</div>
          <div className="text-sm truncate">{route.interchange_stop.stop_name}</div>
        </div>
      </div>

      {/* Second Leg */}
      <div className="flex items-center gap-3 py-2">
        <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-full shrink-0">
          <Bus className="w-4 h-4 text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{route.second_leg.route_short_name}</div>
          <div className="text-xs text-muted-foreground truncate">
            {route.second_leg.route_long_name}
          </div>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {route.second_leg.to_stop_sequence - route.second_leg.from_stop_sequence} stops
        </span>
      </div>
    </Link>
  );
};
