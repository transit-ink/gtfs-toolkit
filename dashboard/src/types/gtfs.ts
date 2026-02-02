// GTFS Stop Interface
export interface Stop {
  id?: number;
  stop_id: string;
  stop_code?: string | null;
  stop_name: string;
  stop_desc?: string | null;
  stop_lat: number | string;
  stop_lon: number | string;
  location_type?: number | null;
  parent_station?: string | null;
  stop_url?: string | null;
  zone_id?: string | null;
  stop_timezone?: string | null;
  wheelchair_boarding?: number | null;
  level_id?: string | null;
  platform_code?: string | null;
  tts_stop_name?: string | null;
  agency_id?: string;
}

// GTFS Route Interface
export interface Route {
  id?: number;
  route_id: string;
  agency_id: string;
  route_short_name: string;
  route_long_name: string;
  route_desc?: string | null;
  route_type: RouteType;
  route_url?: string | null;
  route_color?: string | null;
  route_text_color?: string | null;
  route_sort_order?: number | null;
  continuous_pickup?: string | null;
  continuous_drop_off?: string | null;
  network_id?: string | null;
}

export enum RouteType {
  TRAM = 0,
  SUBWAY = 1,
  RAIL = 2,
  BUS = 3,
  FERRY = 4,
  CABLE_TRAM = 5,
  AERIAL_LIFT = 6,
  FUNICULAR = 7,
  TROLLEYBUS = 800,
  MONORAIL = 900,
}

// Route search result item
export interface RouteSearchResult {
  route: Route;
  score: number;
}

// GTFS Shape Interface
export interface Shape {
  shape_id: string;
  shape_pt_lat: number | string;
  shape_pt_lon: number | string;
  shape_pt_sequence: number;
}

// GTFS StopTime Interface
export interface StopTime {
  id?: number;
  trip_id: string;
  arrival_time: string;
  departure_time: string;
  stop_id: string;
  stop_sequence: number;
  stop_headsign?: string | null;
  pickup_type?: number | null;
  drop_off_type?: number | null;
  continuous_pickup?: number | null;
  continuous_drop_off?: number | null;
  shape_dist_traveled?: number | null;
  timepoint?: number | null;
}

// GTFS Trip Interface
export interface Trip {
  id?: number;
  trip_id: string;
  route_id: string;
  service_id: string;
  trip_headsign?: string | null;
  trip_short_name?: string | null;
  direction_id?: boolean | number | null;
  block_id?: string | null;
  shape_id?: string | null;
  wheelchair_accessible?: number | null;
  bikes_allowed?: number | null;
}

// Location types as per GTFS spec
export enum LocationType {
  STOP = 0,
  STATION = 1,
  ENTRANCE_EXIT = 2,
  GENERIC_NODE = 3,
  BOARDING_AREA = 4,
}

// GTFS Search Response Item
export interface GtfsSearchResponseItem {
  route?: Route;
  stop?: Stop;
  score: number;
}

// Stop Search Result
export interface StopSearchResult {
  stop: Stop;
  score: number;
}
