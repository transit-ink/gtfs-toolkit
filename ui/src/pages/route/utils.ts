import { Route, Stop, StopTime, Trip } from '../../types/gtfs';

export interface ShapeInfo {
  shapeId: string;
  tripId: string;
  tripIds: string[];
  stopTimes: StopTime[];
  firstStop?: Stop;
  lastStop?: Stop;
}

export interface RouteDetailsForShapeInfo {
  route: Route;
  stopTimes: StopTime[];
  stops: Stop[];
}

/**
 * Get shape/direction info for a route.
 * For metro/rail routes, groups by direction_id and picks the trip with the most stops per direction.
 * For bus routes, groups by shape_id (and by first/last stop for trips without shape).
 */
export function getShapeInfos(
  details: RouteDetailsForShapeInfo | null,
  validTrips: Trip[]
): ShapeInfo[] {
  if (!details) return [];

  const isMetroRoute = details.route.route_type !== 3;

  if (isMetroRoute) {
    const tripsByDirection: { [directionKey: string]: Trip[] } = {};

    validTrips.forEach(trip => {
      const dirRaw = trip.direction_id;
      const directionKey =
        dirRaw === 0 || dirRaw === 1 || dirRaw === false || dirRaw === true
          ? String(Number(dirRaw))
          : 'unknown';

      if (!tripsByDirection[directionKey]) {
        tripsByDirection[directionKey] = [];
      }
      tripsByDirection[directionKey].push(trip);
    });

    const directionEntries = Object.entries(tripsByDirection).filter(
      ([, trips]) => trips.length > 0
    );

    if (directionEntries.length === 0) {
      return [];
    }

    return directionEntries.map(([directionKey, trips]) => {
      const tripWithStopTimes = trips.map(trip => {
        const stopTimes = details.stopTimes
          .filter(st => st.trip_id === trip.trip_id)
          .sort((a, b) => a.stop_sequence - b.stop_sequence);
        return { trip, stopTimes };
      });

      const representative = tripWithStopTimes.reduce(
        (best, current) => {
          if (!best) return current;
          if (current.stopTimes.length > best.stopTimes.length) return current;
          return best;
        },
        tripWithStopTimes[0] as (typeof tripWithStopTimes)[number] | undefined
      )!;

      const stopTimes = representative.stopTimes;
      const firstStopId = stopTimes[0]?.stop_id;
      const lastStopId = stopTimes[stopTimes.length - 1]?.stop_id;
      const shapeId = representative.trip.shape_id || `direction-${directionKey}`;

      return {
        shapeId,
        tripId: representative.trip.trip_id,
        tripIds: trips.map(t => t.trip_id),
        stopTimes,
        firstStop: details.stops.find(s => s.stop_id === firstStopId),
        lastStop: details.stops.find(s => s.stop_id === lastStopId),
      };
    });
  }

  const tripsByShape: { [shapeId: string]: Trip[] } = {};
  validTrips.forEach(trip => {
    if (trip.shape_id) {
      if (!tripsByShape[trip.shape_id]) {
        tripsByShape[trip.shape_id] = [];
      }
      tripsByShape[trip.shape_id].push(trip);
    }
  });

  const tripsWithoutShape = validTrips.filter(t => !t.shape_id);
  const noShapeInfos: ShapeInfo[] =
    tripsWithoutShape.length > 0
      ? (() => {
          const byStartEnd: { [key: string]: Trip[] } = {};
          tripsWithoutShape.forEach(trip => {
            const stopTimes = details.stopTimes
              .filter(st => st.trip_id === trip.trip_id)
              .sort((a, b) => a.stop_sequence - b.stop_sequence);
            const firstStopId = stopTimes[0]?.stop_id ?? '';
            const lastStopId = stopTimes[stopTimes.length - 1]?.stop_id ?? '';
            const key = `${firstStopId}→${lastStopId}`;
            if (!byStartEnd[key]) byStartEnd[key] = [];
            byStartEnd[key].push(trip);
          });
          return Object.entries(byStartEnd).map(([key, trips]) => {
            const tripWithStopTimes = trips.map(trip => {
              const sts = details.stopTimes
                .filter(st => st.trip_id === trip.trip_id)
                .sort((a, b) => a.stop_sequence - b.stop_sequence);
              return { trip, stopTimes: sts };
            });
            const representative = tripWithStopTimes.reduce(
              (best, current) => {
                if (!best) return current;
                return current.stopTimes.length > best.stopTimes.length ? current : best;
              },
              tripWithStopTimes[0] as (typeof tripWithStopTimes)[number] | undefined
            )!;
            const stopTimes = representative.stopTimes;
            const firstStopId = stopTimes[0]?.stop_id;
            const lastStopId = stopTimes[stopTimes.length - 1]?.stop_id;
            return {
              shapeId: `no-shape-${key}`,
              tripId: representative.trip.trip_id,
              tripIds: trips.map(t => t.trip_id),
              stopTimes,
              firstStop: details.stops.find(s => s.stop_id === firstStopId),
              lastStop: details.stops.find(s => s.stop_id === lastStopId),
            };
          });
        })()
      : [];

  const shapeBasedInfos: ShapeInfo[] =
    Object.keys(tripsByShape).length > 0
      ? Object.entries(tripsByShape).map(([shapeId, trips]) => {
          const representativeTrip = trips[0];
          const stopTimes = details.stopTimes
            .filter(st => st.trip_id === representativeTrip.trip_id)
            .sort((a, b) => a.stop_sequence - b.stop_sequence);

          const firstStopId = stopTimes[0]?.stop_id;
          const lastStopId = stopTimes[stopTimes.length - 1]?.stop_id;

          return {
            shapeId,
            tripId: representativeTrip.trip_id,
            tripIds: trips.map(t => t.trip_id),
            stopTimes,
            firstStop: details.stops.find(s => s.stop_id === firstStopId),
            lastStop: details.stops.find(s => s.stop_id === lastStopId),
          };
        })
      : [];

  return [...shapeBasedInfos, ...noShapeInfos];
}
