import { currentInstance } from '@/utils/constants';

export const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

export const DEFAULT_LAT = currentInstance.mapCenter[1];
export const DEFAULT_LON = currentInstance.mapCenter[0];

// Zoom limits
export const MIN_ZOOM = 8;
export const MIN_ZOOM_FOR_STOPS = 12;
export const MAX_ZOOM = 19;
export const DEFAULT_ZOOM = 15;

// LocalStorage key for persisting map state
export const MAP_STATE_KEY = 'stops-page-map-state';
