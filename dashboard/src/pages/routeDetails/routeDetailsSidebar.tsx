import { Stop } from '@/types/gtfs';
import { useMemo } from 'react';
import { RouteEditForm } from './routeEditForm';
import { RouteInfoPanel } from './routeInfoPanel';
import { TimetableSection } from './timetableSection';
import { EditFormState, PendingStopChange, RouteDetails, TimetableData } from './types';
import RouteServiceSelector, { ServiceOption } from './ServiceSelector';

interface RouteDetailsSidebarProps {
  details: RouteDetails;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  editForm: EditFormState;
  setEditForm: React.Dispatch<React.SetStateAction<EditFormState>>;
  isSaving: boolean;
  saveError: string | null;
  onSave: () => void;
  onCancelEdit: () => void;
  timetableData: TimetableData;
  serviceOptions: ServiceOption[];
  selectedServiceId: string | null;
  onSelectService: (serviceId: string) => void;
  onReorderStops?: (fromIndex: number, toIndex: number) => void;
  pendingStopChanges: PendingStopChange[];
  refreshTripsAndStops: () => Promise<void>;
  stopEditMode: 'none' | 'add' | 'remove';
  onToggleStopEdit: () => void;
  timingsEditMode: boolean;
  onToggleTimingsEdit: () => void;
  getDisplayTime: (tripId: string, stopId: string, type: 'arrival' | 'departure') => string;
  updateTripTime: (
    tripId: string,
    stopId: string,
    arrivalTime: string,
    departureTime: string
  ) => void;
  adjustRowTime: (stopId: string, minutes: number) => void;
  adjustColumnTime: (tripId: string, minutes: number) => void;
}

export function RouteDetailsSidebar({
  details,
  isEditing,
  setIsEditing,
  editForm,
  setEditForm,
  isSaving,
  saveError,
  onSave,
  onCancelEdit,
  timetableData,
  serviceOptions,
  selectedServiceId,
  onSelectService,
  onReorderStops,
  pendingStopChanges,
  refreshTripsAndStops,
  stopEditMode,
  onToggleStopEdit,
  timingsEditMode,
  onToggleTimingsEdit,
  getDisplayTime,
  updateTripTime,
  adjustRowTime,
  adjustColumnTime,
}: RouteDetailsSidebarProps) {
  // Merge details.stops with pending added stops
  const allStopsForTimetable = useMemo<Stop[]>(() => {
    const stopsMap = new Map<string, Stop>();

    // Add existing stops
    details.stops.forEach(stop => stopsMap.set(stop.stop_id, stop));

    // Add pending stops
    pendingStopChanges.filter(c => c.type === 'add').forEach(c => stopsMap.set(c.stopId, c.stop));

    return Array.from(stopsMap.values());
  }, [details.stops, pendingStopChanges]);
  return (
    <div className="w-[600px] border-l bg-card flex flex-col overflow-y-auto">
      <div className="p-4 space-y-6">
        {isEditing ? (
          <RouteEditForm
            editForm={editForm}
            setEditForm={setEditForm}
            isSaving={isSaving}
            saveError={saveError}
            onSave={onSave}
            onCancel={onCancelEdit}
          />
        ) : (
          <RouteInfoPanel details={details} onEdit={() => setIsEditing(true)} />
        )}

        <RouteServiceSelector
          services={serviceOptions}
          selectedServiceId={selectedServiceId}
          onSelectService={onSelectService}
        />

        <TimetableSection
          timetableData={timetableData}
          stops={allStopsForTimetable}
          pendingStopChanges={pendingStopChanges}
          onReorderStops={onReorderStops}
          refreshTripsAndStops={refreshTripsAndStops}
          stopEditMode={stopEditMode}
          onToggleStopEdit={onToggleStopEdit}
          timingsEditMode={timingsEditMode}
          onToggleTimingsEdit={onToggleTimingsEdit}
          getDisplayTime={getDisplayTime}
          updateTripTime={updateTripTime}
          adjustRowTime={adjustRowTime}
          adjustColumnTime={adjustColumnTime}
        />
      </div>
    </div>
  );
}
