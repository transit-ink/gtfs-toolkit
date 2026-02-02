import { updateRoute } from '@/services/routes';
import { AxiosError } from 'axios';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EditFormState, RouteDetails } from '../types';

interface UseRouteEditFormParams {
  routeId: string | undefined;
  details: RouteDetails | null;
  editForm: EditFormState;
  setEditForm: React.Dispatch<React.SetStateAction<EditFormState>>;
  setDetails: React.Dispatch<React.SetStateAction<RouteDetails | null>>;
}

export function useRouteEditForm({
  routeId,
  details,
  editForm,
  setEditForm,
  setDetails,
}: UseRouteEditFormParams) {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    if (!details || !routeId) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const updatedRoute = await updateRoute(routeId, {
        route_id: editForm.route_id,
        route_short_name: editForm.route_short_name,
        route_long_name: editForm.route_long_name,
        route_type: editForm.route_type,
      });

      // Update the details with the new route data
      setDetails((prev) => (prev ? { ...prev, route: updatedRoute } : null));
      
      // Update the editForm state with the server response to ensure sync
      setEditForm({
        route_id: updatedRoute.route_id || '',
        route_short_name: updatedRoute.route_short_name || '',
        route_long_name: updatedRoute.route_long_name || '',
        route_type: updatedRoute.route_type,
      });

      // If route_id changed, update the URL
      if (updatedRoute.route_id !== routeId) {
        navigate(`/routes/${encodeURIComponent(updatedRoute.route_id)}`, { replace: true });
      }

      setIsEditing(false);
    } catch (err) {
      if (err instanceof AxiosError) {
        if (err.response?.status === 403) {
          setSaveError('Permission denied: You need admin privileges to edit routes.');
        } else {
          setSaveError(err.response?.data?.message || 'Failed to save changes');
        }
      } else {
        setSaveError('An unexpected error occurred');
      }
    } finally {
      setIsSaving(false);
    }
  }, [details, routeId, editForm, setDetails, setEditForm, navigate]);

  const handleCancelEdit = useCallback(() => {
    if (details) {
      setEditForm({
        route_id: details.route.route_id || '',
        route_short_name: details.route.route_short_name || '',
        route_long_name: details.route.route_long_name || '',
        route_type: details.route.route_type,
      });
    }
    setIsEditing(false);
    setSaveError(null);
  }, [details, setEditForm]);

  return {
    isEditing,
    setIsEditing,
    isSaving,
    saveError,
    handleSave,
    handleCancelEdit,
  };
}
