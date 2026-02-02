import { Stop, Trip } from '@/types/gtfs';
import axios from '@/utils/axios';

export interface StopsInBoundsParams {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
  limit?: number;
}

// Get all stops within bounds (including child stops)
export const getStopsInBounds = async (params: StopsInBoundsParams): Promise<Stop[]> => {
  const response = await axios.get<Stop[]>('/gtfs/stops/bounds/all', { params });
  return response.data;
};

// Get a single stop by ID
export const getStop = async (id: string): Promise<Stop> => {
  const response = await axios.get<Stop>(`/gtfs/stops/${encodeURIComponent(id)}`);
  return response.data;
};

// Create a new stop
export const createStop = async (stop: Partial<Stop>): Promise<Stop> => {
  const response = await axios.post<Stop>('/gtfs/stops', stop);
  return response.data;
};

// Update a stop
export const updateStop = async (id: string, stop: Partial<Stop>): Promise<Stop> => {
  const response = await axios.put<Stop>(`/gtfs/stops/${encodeURIComponent(id)}`, stop);
  return response.data;
};

// Delete a stop
export const deleteStop = async (id: string): Promise<void> => {
  await axios.delete(`/gtfs/stops/${encodeURIComponent(id)}`);
};

// Get stop group (parent and all children)
export const getStopGroup = async (id: string): Promise<Stop[]> => {
  const response = await axios.get<Stop[]>(`/gtfs/stops/group/${encodeURIComponent(id)}`);
  return response.data;
};

// Get trips that include this stop
export const getTripsForStop = async (id: string): Promise<Trip[]> => {
  const response = await axios.get<Trip[]>(`/gtfs/stops/${encodeURIComponent(id)}/trips`);
  return response.data;
};

// Search stops by text query
export const searchStops = async (query: string): Promise<Stop[]> => {
  const response = await axios.get<Array<{ stop?: Stop; route?: unknown; score: number }>>(
    '/gtfs/search',
    {
      params: { q: query },
    }
  );
  // Filter to only stops and return them
  return response.data
    .filter((item): item is { stop: Stop; score: number } => !!item.stop)
    .map(item => item.stop);
};
