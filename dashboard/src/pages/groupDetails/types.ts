import { Route, Shape, Stop } from '@/types/gtfs';
import { GroupItem } from '@/services/groups';

export interface RouteWithShapes extends Route {
  shapes?: Shape[];
}

export interface GroupItemWithData extends GroupItem {
  data?: Stop | RouteWithShapes;
  loading?: boolean;
  error?: string;
}
