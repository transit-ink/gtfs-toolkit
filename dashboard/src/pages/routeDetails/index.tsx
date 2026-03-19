import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft, FileEdit, Loader2, X } from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import {
  useRouteDetails,
  useRouteEditForm,
  useRouteMap,
  useShapeEdit,
  useStopEdit,
  useStopOrder,
  useTripTimeEdit,
} from './hooks';
import { RemoveStopDialog } from './removeStopDialog';
import { RouteDetailsHeader } from './routeDetailsHeader';
import { RouteDetailsMap } from './routeDetailsMap';
import { RouteDetailsSidebar } from './routeDetailsSidebar';
import { UnsavedChangesBanner } from './UnsavedChangesBanner';
import { Changeset, ChangesetStatus, getChangeset } from '@/services/changesets';
import { ChangesetHierarchy } from '@/components/EntityChangeCard';

// Status badge component
function ChangesetStatusBadge({ status }: { status: ChangesetStatus }) {
  const styles = {
    [ChangesetStatus.DRAFT]: 'bg-gray-100 text-gray-700',
    [ChangesetStatus.PENDING]: 'bg-yellow-100 text-yellow-700',
    [ChangesetStatus.APPROVED]: 'bg-green-100 text-green-700',
    [ChangesetStatus.REJECTED]: 'bg-red-100 text-red-700',
  };

  const labels = {
    [ChangesetStatus.DRAFT]: 'Draft',
    [ChangesetStatus.PENDING]: 'Pending Review',
    [ChangesetStatus.APPROVED]: 'Approved',
    [ChangesetStatus.REJECTED]: 'Rejected',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export default function RouteDetailsPage() {
  const { routeId } = useParams<{ routeId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Changeset context from URL
  const changesetId = searchParams.get('changeset');
  const [viewingChangeset, setViewingChangeset] = useState<Changeset | null>(null);
  const [changesetExpanded, setChangesetExpanded] = useState(true);

  // Fetch changeset if ID is present in URL
  useEffect(() => {
    if (!changesetId) {
      setViewingChangeset(null);
      return;
    }

    const fetchChangeset = async () => {
      try {
        const changeset = await getChangeset(changesetId);
        setViewingChangeset(changeset);
      } catch (err) {
        console.error('Failed to fetch changeset:', err);
        setViewingChangeset(null);
      }
    };

    fetchChangeset();
  }, [changesetId]);

  // Filter changes for this route
  const routeChanges = useMemo(() => {
    if (!viewingChangeset || !routeId) return [];
    return viewingChangeset.changes.filter(
      (change) =>
        (change.entity_type === 'route' && change.entity_id === routeId) ||
        change.related_route_id === routeId
    );
  }, [viewingChangeset, routeId]);

  // Clear changeset context
  const handleClearChangeset = () => {
    searchParams.delete('changeset');
    setSearchParams(searchParams);
  };

  // Route details hook
  const {
    details,
    setDetails,
    loading,
    error,
    selectedShapeId,
    setSelectedShapeId,
    shapeInfos,
    selectedShapeInfo,
    editForm,
    setEditForm,
    refreshTripsAndStops,
    calendars,
  } = useRouteDetails(routeId);

  // Service (schedule) selection state
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  // Build service options (hide services with 0 trips)
  const serviceOptions = useMemo(() => {
    if (!details) return [];

    const tripsByService: { [serviceId: string]: number } = {};
    details.trips.forEach(trip => {
      if (!trip.service_id) return;
      tripsByService[trip.service_id] = (tripsByService[trip.service_id] || 0) + 1;
    });

    return Object.entries(tripsByService)
      .filter(([, count]) => count > 0)
      .map(([serviceId, count]) => ({
        serviceId,
        tripsCount: count,
        calendar: calendars.find(c => c.service_id === serviceId),
      }))
      .sort((a, b) => b.tripsCount - a.tripsCount);
  }, [details, calendars]);

  // Ensure a service is selected when options change
  useEffect(() => {
    if (!selectedServiceId && serviceOptions.length > 0) {
      setSelectedServiceId(serviceOptions[0].serviceId);
    }
  }, [serviceOptions, selectedServiceId]);

  // Route edit form hook
  const { isEditing, setIsEditing, isSaving, saveError, handleSave, handleCancelEdit } =
    useRouteEditForm({
      routeId,
      details,
      editForm,
      setEditForm,
      setDetails,
    });

  // Shape edit hook
  const {
    isEditingShape,
    shapeEditMode,
    setShapeEditMode,
    currentPointIndex,
    setCurrentPointIndex,
    customShapePoints,
    hasUnsavedShapeChanges,
    isSavingShape,
    shapeError,
    getCurrentShapePoints,
    handleToggleShapeEdit,
    handleUpdateShapePoint,
    handleAddShapePoint,
    handleDeleteShapePoint,
    handleSaveShape,
    handleDiscardShapeChanges,
  } = useShapeEdit({
    selectedShapeId,
    details,
    setDetails,
  });

  // Stop edit hook
  const {
    allStops,
    isLoadingAllStops,
    stopEditMode,
    pendingStopChanges,
    hasUnsavedStopChanges,
    isSavingStops,
    stopsError,
    stopToRemove,
    removeStopDialogOpen,
    setRemoveStopDialogOpen,
    handleToggleStopEdit,
    handleConfirmRemoveStop,
    handleSaveStopChanges,
    handleDiscardStopChanges,
    fetchAllStopsInBounds,
    // Refs for marker callbacks
    stopEditModeRef,
    selectedShapeIdRef,
    pendingStopChangesRef,
    getCurrentStopIdsRef,
    handleAddStopToRouteRef,
    handleRemoveStopClickRef,
  } = useStopEdit({
    selectedShapeId,
    selectedShapeInfo,
    details,
    refreshTripsAndStops,
  });

  // Stop order hook
  const {
    timetableData,
    hasUnsavedStopOrderChanges,
    isSavingStopOrder,
    stopOrderError,
    handleReorderStops,
    handleSaveStopOrder,
    handleDiscardStopOrderChanges,
  } = useStopOrder({
    selectedShapeId,
    selectedShapeInfo,
    details,
    setDetails,
    pendingStopChanges,
    selectedServiceId,
  });

  // Timings edit mode state
  const [timingsEditMode, setTimingsEditMode] = useState(false);

  // Trip time edit hook
  const {
    hasUnsavedTripTimeChanges,
    isSavingTripTimes,
    tripTimesError,
    getDisplayTime,
    updateTripTime,
    adjustRowTime,
    adjustColumnTime,
    handleSaveTripTimes,
    handleDiscardTripTimes,
  } = useTripTimeEdit({
    selectedShapeId,
    details,
    timetableData,
    refreshTripsAndStops,
    routeId,
  });

  // Map hook
  const { mapContainer } = useRouteMap({
    details,
    selectedShapeId,
    setSelectedShapeId,
    isEditingShape,
    shapeEditMode,
    currentPointIndex,
    setCurrentPointIndex,
    customShapePoints,
    getCurrentShapePoints,
    handleUpdateShapePoint,
    handleAddShapePoint,
    handleDeleteShapePoint,
    allStops,
    stopEditModeRef,
    selectedShapeIdRef,
    pendingStopChangesRef,
    getCurrentStopIdsRef,
    handleAddStopToRouteRef,
    handleRemoveStopClickRef,
    stopEditMode,
    pendingStopChanges,
    stopSequence: timetableData.stopSequence,
    fetchAllStopsInBounds,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading route details...</span>
        </div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate('/routes')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Routes
        </Button>
        <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive">
          <AlertCircle className="w-5 h-5" />
          <span>{error || 'Route not found'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Unsaved shape changes banner */}
      {hasUnsavedShapeChanges && (
        <UnsavedChangesBanner
          message="You have unsaved changes to shape line"
          error={shapeError}
          isSaving={isSavingShape}
          onSave={handleSaveShape}
          onDiscard={handleDiscardShapeChanges}
        />
      )}

      {/* Unsaved stop changes banner */}
      {hasUnsavedStopChanges && (
        <UnsavedChangesBanner
          message="You have unsaved changes to stops"
          error={stopsError}
          isSaving={isSavingStops}
          onSave={handleSaveStopChanges}
          onDiscard={handleDiscardStopChanges}
        />
      )}

      {/* Unsaved stop order changes banner */}
      {hasUnsavedStopOrderChanges && (
        <UnsavedChangesBanner
          message="You have unsaved changes to stop order"
          error={stopOrderError}
          isSaving={isSavingStopOrder}
          onSave={handleSaveStopOrder}
          onDiscard={handleDiscardStopOrderChanges}
        />
      )}

      {/* Unsaved trip time changes banner */}
      {hasUnsavedTripTimeChanges && (
        <UnsavedChangesBanner
          message="You have unsaved changes to trip times"
          error={tripTimesError}
          isSaving={isSavingTripTimes}
          onSave={handleSaveTripTimes}
          onDiscard={handleDiscardTripTimes}
        />
      )}

      {/* Changeset context banner */}
      {viewingChangeset && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileEdit className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-blue-900">
                      Viewing Changeset
                    </span>
                    <ChangesetStatusBadge status={viewingChangeset.status} />
                  </div>
                  <p className="text-sm text-blue-700">
                    {viewingChangeset.description || 'No description'} •{' '}
                    {viewingChangeset.user?.username || 'Unknown user'} •{' '}
                    {routeChanges.length} change{routeChanges.length !== 1 ? 's' : ''} for this route
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setChangesetExpanded(!changesetExpanded)}
                  className="text-blue-700 hover:text-blue-900 hover:bg-blue-100"
                >
                  {changesetExpanded ? 'Hide Changes' : 'Show Changes'}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClearChangeset}
                  className="text-blue-700 hover:text-blue-900 hover:bg-blue-100"
                  title="Close changeset view"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            {changesetExpanded && routeChanges.length > 0 && (
              <div className="mt-3 border rounded-lg p-3 bg-white">
                <ChangesetHierarchy changes={routeChanges} />
              </div>
            )}
          </div>
        </div>
      )}

      <RouteDetailsHeader details={details} />

      <div className="flex-1 flex overflow-hidden">
        <RouteDetailsMap
          mapContainerRef={mapContainer}
          shapeInfos={shapeInfos}
          selectedShapeId={selectedShapeId}
          setSelectedShapeId={setSelectedShapeId}
          isEditingShape={isEditingShape}
          shapeEditMode={shapeEditMode}
          setShapeEditMode={setShapeEditMode}
          currentPointIndex={currentPointIndex}
          onToggleShapeEdit={handleToggleShapeEdit}
          hasUnsavedShapeChanges={hasUnsavedShapeChanges}
          stopEditMode={stopEditMode}
          onToggleStopEdit={handleToggleStopEdit}
          hasUnsavedStopChanges={hasUnsavedStopChanges}
          isLoadingAllStops={isLoadingAllStops}
        />

        <RouteDetailsSidebar
          details={details}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          editForm={editForm}
          setEditForm={setEditForm}
          isSaving={isSaving}
          saveError={saveError}
          onSave={handleSave}
          onCancelEdit={handleCancelEdit}
          timetableData={timetableData}
          serviceOptions={serviceOptions}
          selectedServiceId={selectedServiceId}
          onSelectService={setSelectedServiceId}
          onReorderStops={handleReorderStops}
          pendingStopChanges={selectedShapeId ? pendingStopChanges[selectedShapeId] || [] : []}
          refreshTripsAndStops={refreshTripsAndStops}
          stopEditMode={stopEditMode}
          onToggleStopEdit={handleToggleStopEdit}
          timingsEditMode={timingsEditMode}
          onToggleTimingsEdit={() => setTimingsEditMode(prev => !prev)}
          getDisplayTime={getDisplayTime}
          updateTripTime={updateTripTime}
          adjustRowTime={adjustRowTime}
          adjustColumnTime={adjustColumnTime}
        />
      </div>

      {/* Remove stop confirmation dialog */}
      <RemoveStopDialog
        open={removeStopDialogOpen}
        onOpenChange={setRemoveStopDialogOpen}
        stop={stopToRemove}
        tripCount={selectedShapeInfo?.tripIds.length || 0}
        isRemoving={false}
        onConfirm={handleConfirmRemoveStop}
      />
    </div>
  );
}
