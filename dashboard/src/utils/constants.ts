export const HOSTNAME = window.location.hostname;

export const isDev = HOSTNAME.includes('localhost');

export const INSTANCES = [
  {
    id: 'blr',
    name: 'Bengaluru',
    hostname: 'blr-dashboard.transit.ink',
    apiBaseUrl: 'https://blr-api.transit.ink',
    sentryDsn:
      'https://3e2b60e7e6b8f22d9e71e1e2e3084950@o4510791936114688.ingest.de.sentry.io/4510791976681552',
    isDev: false,
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
    hostname: 'hyd-dashboard.transit.ink',
    apiBaseUrl: 'https://hyd-api.transit.ink',
    sentryDsn:
      'https://3e2b60e7e6b8f22d9e71e1e2e3084950@o4510791936114688.ingest.de.sentry.io/4510791976681552',
    isDev: false,
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
    sentryDsn: '',
    isDev: true,
    mapCenter: [77.5946, 12.9716],
    bounds: {
      north: 13.083199823288053,
      south: 12.800593356495508,
      west: 77.41284699054769,
      east: 77.73401218129092,
    },
  },
];

export const availableInstances = INSTANCES.filter(instance => isDev || !instance.isDev);
export const currentInstance =
  availableInstances.find(instance => HOSTNAME.includes(instance.hostname)) ??
  availableInstances[0];

export const BACKEND_HOST = currentInstance.apiBaseUrl;
