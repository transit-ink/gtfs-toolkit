// GTFS Interfaces
export interface Agency {
  agency_id: string;
  agency_name: string;
  agency_url: string;
  agency_timezone: string;
}

export interface Calendar {
  service_id: string;
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
  start_date: string;
  end_date: string;
}

export interface CalendarDate {
  service_id: string;
  date: string;
  exception_type: number;
}

export interface Shape {
  shape_id: string;
  shape_pt_lat: number | string;
  shape_pt_lon: number | string;
  shape_pt_sequence: number;
}

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

export interface Route {
  id?: number;
  route_id: string;
  agency_id?: string;
  route_short_name: string;
  route_long_name: string;
  route_desc?: string | null;
  route_type: number;
  route_url?: string | null;
  route_color?: string | null;
  route_text_color?: string | null;
  route_sort_order?: number | null;
  continuous_pickup?: number | null;
  continuous_drop_off?: number | null;
  network_id?: string | null;
}
