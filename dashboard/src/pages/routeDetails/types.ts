import { Route, Shape, Stop, StopTime, Trip } from '@/types/gtfs';

export interface RouteDetails {
  route: Route;
  trips: Trip[];
  shapes: Shape[];
  stopTimes: StopTime[];
  stops: Stop[];
}

export interface ShapeInfo {
  shapeId: string;
  tripId: string;
  tripIds: string[];
  stopTimes: StopTime[];
  firstStop?: Stop;
  lastStop?: Stop;
}

export interface EditFormState {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  route_type: number;
}

export interface TimetableData {
  trips: {
    tripId: string;
    stopTimes: { [stopId: string]: StopTime };
  }[];
  stopSequence: string[];
}

// Shape editing types
export interface EditableShapePoint {
  lat: number;
  lon: number;
  sequence: number;
}

export interface ShapeEditState {
  [shapeId: string]: EditableShapePoint[];
}

export type ShapeEditMode = 'move' | 'add' | 'delete';

// Stop editing types
export type StopEditMode = 'none' | 'add' | 'remove';

export interface PendingStopChange {
  type: 'add' | 'remove';
  stopId: string;
  stop: Stop;
  // For 'add' type: calculated times per trip (calculated immediately when added)
  tripTimes?: { [tripId: string]: { arrivalTime: string; departureTime: string } };
}
