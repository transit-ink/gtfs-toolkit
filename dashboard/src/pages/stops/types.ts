import { Stop, Trip } from '@/types/gtfs';

export type EditMode = 'none' | 'add' | 'move' | 'set-parent';

export interface StopsPageState {
  stops: Stop[];
  selectedStop: Stop | null;
  isLoadingStops: boolean;
  mapReady: boolean;
  editMode: EditMode;
  editName: string;
  isSaving: boolean;
  deleteDialogOpen: boolean;
  error: string | null;
  tripsForStop: Trip[];
  isLoadingTrips: boolean;
  parentStop: Stop | null;
  isLoadingParent: boolean;
  externalParentStops: Map<string, Stop>;
  externalChildStops: Map<string, Stop[]>;
  childStopsForSelected: Stop[];
  isLoadingChildren: boolean;
}
