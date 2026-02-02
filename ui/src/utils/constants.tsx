export const HOSTNAME = window.location.hostname;

export const isDev = HOSTNAME.includes('localhost');

// Flight icon for Airport buses
const AirportIcon = () => (
  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-amber-600">
      <path
        d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
        fill="currentColor"
      />
    </svg>
  </div>
);

// Subway icon for Metro feeders
const MetroIcon = () => (
  <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center">
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-cyan-600">
      <path
        d="M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h2.23l2-2H14l2 2h2v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-3.58-4-8-4zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm3.5-6H6V8h5v3zm2 0V8h5v3h-5zm3.5 6c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"
        fill="currentColor"
      />
    </svg>
  </div>
);

export const INSTANCES = [
  {
    id: 'blr',
    name: 'Bengaluru',
    hostname: 'blr.transit.ink',
    apiBaseUrl: 'https://blr-api.transit.ink',
    gaMeasurementId: 'G-WNSY1SCZLL',
    sentryDsn:
      'https://e5f76ec0f480b357a940dc35303b4281@o4510791936114688.ingest.de.sentry.io/4510791996473424',
    isDev: false,
    featuredGroups: [
      {
        id: 'airport-buses',
        icon: AirportIcon,
      },
      {
        id: 'metro-feeders',
        icon: MetroIcon,
      },
    ],
    mapCenter: [77.5946, 12.9716],
    bounds: {
      north: 13.083199823288053,
      south: 12.800593356495508,
      west: 77.41284699054769,
      east: 77.73401218129092,
    },
  },
  {
    id: 'hyd',
    name: 'Hyderabad',
    hostname: 'hyd.transit.ink',
    apiBaseUrl: 'https://hyd-api.transit.ink',
    gaMeasurementId: 'G-3D2ML2KCJT',
    sentryDsn:
      'https://e5f76ec0f480b357a940dc35303b4281@o4510791936114688.ingest.de.sentry.io/4510791996473424',
    isDev: false,
    featuredGroups: [],
    mapCenter: [78.4785, 17.4116],
    bounds: {
      north: 17.605002899105376,
      south: 17.195195056544218,
      west: 78.23643508811358,
      east: 78.70553139796479,
    },
  },
  {
    id: 'dev',
    name: 'Development',
    hostname: 'localhost',
    apiBaseUrl: 'http://localhost:9000',
    gaMeasurementId: undefined,
    sentryDsn:
      'https://e5f76ec0f480b357a940dc35303b4281@o4510791936114688.ingest.de.sentry.io/4510791996473424',
    isDev: true,
    featuredGroups: [],
    mapCenter: [78.4785, 17.4116],
    bounds: {
      north: 17.605002899105376,
      south: 17.195195056544218,
      west: 78.23643508811358,
      east: 78.70553139796479,
    },
  },
];

export const availableInstances = INSTANCES.filter(instance => isDev || !instance.isDev);
export const currentInstance =
  availableInstances.find(instance => HOSTNAME.includes(instance.hostname)) ??
  availableInstances[0];

/** SEO defaults per instance. BLR: BMTC, BMRCL; HYD: TGSRTC, HMRL. */
export const SEO_CONFIG: Record<
  string,
  { siteName: string; defaultTitle: string; defaultDescription: string; keywords: string }
> = {
  blr: {
    siteName: 'Bengaluru Bus & Metro Routes',
    defaultTitle: 'Bengaluru Bus & Metro Routes',
    defaultDescription:
      'Find BMTC and BMRCL bus and metro routes, stops, and plan your trip in Bengaluru. Search routes, view timetables',
    keywords:
      'BMTC, BMRCL, Bengaluru bus routes, Namma Metro, bus stops, trip planner, Bangalore transit',
  },
  hyd: {
    siteName: 'Hyderabad Bus & Metro Routes',
    defaultTitle: 'Hyderabad Bus & Metro Routes',
    defaultDescription:
      'Find TGSRTC and HMRL bus and metro routes, stops, and plan your trip in Hyderabad. Search routes, view timetables',
    keywords:
      'TGSRTC, HMRL, Hyderabad bus routes, metro, bus stops, trip planner, Hyderabad transit',
  },
  dev: {
    siteName: 'Bus & Metro Routes',
    defaultTitle: 'Bus & Metro Routes',
    defaultDescription:
      'Bus and metro routes, stops, and trip planning. Search routes, view timetables',
    keywords: 'bus routes, metro, bus stops, trip planner, transit',
  },
};

/** Copy for About page and other UI; city and operator names per instance. */
export const INSTANCE_COPY: Record<
  string,
  { cityName: string; busOperator: string; metroName: string; metroOperator: string }
> = {
  blr: {
    cityName: 'Bengaluru',
    busOperator: 'BMTC',
    metroName: 'Namma Metro',
    metroOperator: 'BMRCL',
  },
  hyd: {
    cityName: 'Hyderabad',
    busOperator: 'TGSRTC',
    metroName: 'Hyderabad Metro',
    metroOperator: 'HMRL',
  },
  dev: {
    cityName: 'your city',
    busOperator: 'bus',
    metroName: 'metro',
    metroOperator: 'metro',
  },
};

export const BACKEND_HOST = currentInstance.apiBaseUrl;

export const MAX_HISTORY_LENGTH: number = 20;

export const ROUTES = {
  home: '/',
  search: '/search',
  plan: '/plan',
  explore: '/explore',
  route: '/route/:routeId',
  stop: '/stop/:stopId',
  favourites: '/favourites',
} as const;

export type RouteKey = keyof typeof ROUTES;

export const SEARCH_RESULT_TYPES = {
  location: 'location',
  bus_stop: 'bus_stop',
  metro_station_purple: 'metro_station_purple',
  metro_station_green: 'metro_station_green',
  bus_number: 'bus_number',
} as const;

export type SearchResultType = (typeof SEARCH_RESULT_TYPES)[keyof typeof SEARCH_RESULT_TYPES];

export const API_CALL_STATUSES = {
  INITIAL: 'INITIAL',
  PROGRESS: 'PROGRESS',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
} as const;

export type ApiCallStatus = (typeof API_CALL_STATUSES)[keyof typeof API_CALL_STATUSES];
