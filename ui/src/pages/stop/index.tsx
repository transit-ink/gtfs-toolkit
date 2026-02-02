import PageLoader from '@/components/pageLoader';
import { Button } from '@/components/ui/button';
import { map, size } from 'lodash';
import { MapPin, Navigation, Star } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Sidebar from '../../components/sidebar';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Route, Stop, StopTime, Trip } from '../../types/gtfs';
import { StopDetailsData, useStopDetails } from '../../utils/api';
import { MAX_HISTORY_LENGTH, SEARCH_RESULT_TYPES } from '../../utils/constants';
import RouteRow from './routeRow';
import StopMap from './stopMap';

interface StopDetails {
  stops: Stop[];
  primaryStop: Stop;
  stopTimes: StopTime[];
  trips: Trip[];
  routes: Route[];
}

function isRedirect(data: StopDetailsData | { redirect: string }): data is { redirect: string } {
  return 'redirect' in data;
}

export default function StopPage() {
  const { stopId } = useParams<{ stopId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: stopData, isPending: loading } = useStopDetails(stopId);
  const details: StopDetails | null = stopData && !isRedirect(stopData) ? stopData : null;
  const [isFavourited, setIsFavourited] = useState(false);

  // Redirect to parent stop when this is a child stop
  useEffect(() => {
    if (stopData && isRedirect(stopData)) {
      navigate(`/stop/${stopData.redirect}?selected_stop=${stopId}`, { replace: true });
    }
  }, [stopData, stopId, navigate]);

  // Get selected stop from URL query param, or default to first stop if multiple
  const selectedStopId = useMemo(() => {
    const fromUrl = searchParams.get('selected_stop');
    if (fromUrl && details?.stops.some(s => s.stop_id === fromUrl)) {
      return fromUrl;
    }
    return stopId;
  }, [searchParams, details]);

  // Get routes that pass through the selected stop vs other platforms
  const { routesThroughSelected, routesFromNearbyPlatforms } = useMemo(() => {
    if (!details || !selectedStopId) {
      return { routesThroughSelected: [], routesFromNearbyPlatforms: [] };
    }

    // Find stop times for the selected stop
    const selectedStopTimes = details.stopTimes.filter(st => st.stop_id === selectedStopId);
    const selectedTripIds = new Set(selectedStopTimes.map(st => st.trip_id));

    // Find routes that have trips passing through the selected stop
    const routeIdsForSelected = new Set(
      details.trips.filter(t => selectedTripIds.has(t.trip_id)).map(t => t.route_id)
    );

    const throughSelected = details.routes
      .filter(r => routeIdsForSelected.has(r.route_id))
      .sort((a, b) =>
        a.route_short_name.localeCompare(b.route_short_name, undefined, { numeric: true })
      );
    const fromNearby = details.routes
      .filter(r => !routeIdsForSelected.has(r.route_id))
      .sort((a, b) =>
        a.route_short_name.localeCompare(b.route_short_name, undefined, { numeric: true })
      );

    return { routesThroughSelected: throughSelected, routesFromNearbyPlatforms: fromNearby };
  }, [details, selectedStopId]);

  // Determine which stops are "metro-only" (all routes passing through are metro/rail)
  const metroOnlyStopIds = useMemo(() => {
    if (!details) return [];

    const METRO_ROUTE_TYPES = new Set([1, 2]); // 1: Subway/Metro, 2: Rail

    const tripById = new Map(details.trips.map(trip => [trip.trip_id, trip]));
    const routeById = new Map(details.routes.map(route => [route.route_id, route]));

    const stopToRouteTypes = new Map<string, Set<number>>();

    details.stopTimes.forEach(stopTime => {
      const trip = tripById.get(stopTime.trip_id);
      if (!trip) return;
      const route = routeById.get(trip.route_id);
      if (!route) return;

      const existing = stopToRouteTypes.get(stopTime.stop_id) ?? new Set<number>();
      existing.add(route.route_type);
      stopToRouteTypes.set(stopTime.stop_id, existing);
    });

    const result: string[] = [];
    stopToRouteTypes.forEach((types, stopId) => {
      if (types.size > 0 && Array.from(types).every(type => METRO_ROUTE_TYPES.has(type))) {
        result.push(stopId);
      }
    });

    return result;
  }, [details]);

  // Handle stop selection from map click
  const handleStopSelect = (newStopId: string) => {
    if (stopId) {
      navigate(`/stop/${stopId}?selected_stop=${newStopId}`, { replace: true });
    }
  };

  usePageMeta({
    title: details ? details.primaryStop.stop_name : 'Stop Details',
    description: details
      ? `${details.primaryStop.stop_name}. View all bus and metro routes passing through this stop.`
      : 'View bus stop details and routes passing through.',
  });

  // Sync favourited from localStorage when details load
  useEffect(() => {
    if (!details?.primaryStop) return;
    const favourites = JSON.parse(localStorage.getItem('bpt_favourites') || '[]');
    setIsFavourited(
      favourites.some(
        (f: { type: string; id: string }) =>
          f.type === SEARCH_RESULT_TYPES.bus_stop && f.id === details.primaryStop.stop_id
      )
    );
  }, [details?.primaryStop?.stop_id]);

  // Update history when stop details load
  useEffect(() => {
    if (!details?.primaryStop) return;
    const primaryStop = details.primaryStop;
    const historyItems = JSON.parse(localStorage.getItem('bpt_history') || '[]');
    const newHistoryItem = {
      id: primaryStop.stop_id,
      text: primaryStop.stop_name,
      type: SEARCH_RESULT_TYPES.bus_stop,
    };
    const newHistory = [
      newHistoryItem,
      ...historyItems.filter(
        (h: { id: string; type: string }) =>
          !(h.id === primaryStop.stop_id && h.type === SEARCH_RESULT_TYPES.bus_stop)
      ),
    ].slice(0, MAX_HISTORY_LENGTH);
    localStorage.setItem('bpt_history', JSON.stringify(newHistory));
  }, [details?.primaryStop?.stop_id]);

  const toggleFavourite = () => {
    if (!details) return;

    const currentFavourites = JSON.parse(localStorage.getItem('bpt_favourites') || '[]');
    let newFavourites = [];

    if (isFavourited) {
      newFavourites = currentFavourites.filter(
        (f: any) =>
          !(f.type === SEARCH_RESULT_TYPES.bus_stop && f.id === details.primaryStop.stop_id)
      );
    } else {
      newFavourites = [
        {
          id: details.primaryStop.stop_id,
          text: details.primaryStop.stop_name,
          type: SEARCH_RESULT_TYPES.bus_stop,
        },
        ...currentFavourites,
      ];
    }

    setIsFavourited(!isFavourited);
    localStorage.setItem('bpt_favourites', JSON.stringify(newFavourites));
  };

  if (loading) {
    return <PageLoader text="Loading stop..." />;
  }

  if (!details) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center gap-2 bg-primary text-primary-foreground p-4">
          <Sidebar />
          <h1 className="text-lg font-semibold">Stop</h1>
        </div>
        <div className="p-4 flex flex-col items-center justify-center gap-4 min-h-[50vh]">
          <p className="text-muted-foreground text-center">Stop not found</p>
          <Button asChild>
            <Link to="/search">Search for stop</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground p-4">
        <div className="flex items-center gap-3">
          <Sidebar />
          <MapPin className="w-5 h-5 shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">{details.primaryStop.stop_name}</h1>
            <div className="flex items-center gap-2 text-primary-foreground/80 text-xs">
              {details.primaryStop.stop_code && <span>Code: {details.primaryStop.stop_code}</span>}
              {details.primaryStop.stop_code && details.stops.length > 1 && <span>•</span>}
              {details.stops.length > 1 && <span>{details.stops.length} platforms</span>}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <Link to={`/plan?to=${encodeURIComponent(details.primaryStop.stop_id)}`}>
              <Navigation className="w-5 h-5" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" className="shrink-0" onClick={toggleFavourite}>
            <Star className={`w-5 h-5 ${isFavourited ? 'fill-yellow-400 text-yellow-400' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Spacer for fixed header */}
      <div className="h-16" />

      <div className="h-[70vh]">
        <StopMap
          stops={details.stops}
          selectedStopId={selectedStopId}
          onStopSelect={handleStopSelect}
          metroOnlyStopIds={metroOnlyStopIds}
        />
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Routes through selected stop */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">Routes along this stop</h2>
            <span className="text-sm text-muted-foreground">
              {routesThroughSelected.length} routes
            </span>
          </div>
          <div className="space-y-1">
            {map(routesThroughSelected, (route: Route) => (
              <RouteRow key={route.route_id} route={route} variant="primary" />
            ))}
            {size(routesThroughSelected) === 0 && (
              <p className="text-muted-foreground text-sm py-2">No routes found for this stop</p>
            )}
          </div>
        </section>

        {/* Routes from nearby platforms */}
        {routesFromNearbyPlatforms.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-foreground">
                Routes from nearby platforms
              </h2>
              <span className="text-sm text-muted-foreground">
                {routesFromNearbyPlatforms.length} routes
              </span>
            </div>
            <div className="space-y-1">
              {routesFromNearbyPlatforms.map(route => (
                <RouteRow key={route.route_id} route={route} variant="muted" />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
