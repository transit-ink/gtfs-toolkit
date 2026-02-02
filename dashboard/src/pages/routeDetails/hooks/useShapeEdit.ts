import { updateShape } from '@/services/routes';
import { Shape } from '@/types/gtfs';
import { AxiosError } from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { EditableShapePoint, RouteDetails, ShapeEditMode, ShapeEditState } from '../types';

interface UseShapeEditParams {
  selectedShapeId: string | null;
  details: RouteDetails | null;
  setDetails: React.Dispatch<React.SetStateAction<RouteDetails | null>>;
}

export function useShapeEdit({ selectedShapeId, details, setDetails }: UseShapeEditParams) {
  const [isEditingShape, setIsEditingShape] = useState(false);
  const [shapeEditMode, setShapeEditMode] = useState<ShapeEditMode>('move');
  const [currentPointIndex, setCurrentPointIndex] = useState<number | null>(null);
  const [customShapePoints, setCustomShapePoints] = useState<ShapeEditState>({});
  const [isSavingShape, setIsSavingShape] = useState(false);
  const [shapeError, setShapeError] = useState<string | null>(null);

  // Check if there are unsaved shape changes for the current shape
  const hasUnsavedShapeChanges = useMemo(() => {
    if (!selectedShapeId) return false;
    return Object.prototype.hasOwnProperty.call(customShapePoints, selectedShapeId);
  }, [selectedShapeId, customShapePoints]);

  // Get original shape points from details (not custom)
  const getOriginalShapePoints = useCallback(
    (shapeId: string): EditableShapePoint[] => {
      if (!details) return [];

      return details.shapes
        .filter((s) => s.shape_id === shapeId)
        .sort((a, b) => a.shape_pt_sequence - b.shape_pt_sequence)
        .map((s) => ({
          lat: parseFloat(String(s.shape_pt_lat)),
          lon: parseFloat(String(s.shape_pt_lon)),
          sequence: s.shape_pt_sequence,
        }));
    },
    [details]
  );

  // Get current shape points (custom or original) - for reading only
  const getCurrentShapePoints = useCallback(
    (shapeId: string): EditableShapePoint[] => {
      if (customShapePoints[shapeId]) {
        return customShapePoints[shapeId];
      }
      return getOriginalShapePoints(shapeId);
    },
    [customShapePoints, getOriginalShapePoints]
  );

  // Update current point index when shape changes or editing starts
  useEffect(() => {
    if (isEditingShape && selectedShapeId) {
      const points = getCurrentShapePoints(selectedShapeId);
      if (points.length > 0 && currentPointIndex === null) {
        // Default to last point
        setCurrentPointIndex(points.length - 1);
      } else if (points.length > 0 && currentPointIndex !== null && currentPointIndex >= points.length) {
        // Adjust if current point index is out of bounds
        setCurrentPointIndex(points.length - 1);
      }
    } else if (!isEditingShape) {
      setCurrentPointIndex(null);
    }
  }, [isEditingShape, selectedShapeId, currentPointIndex, getCurrentShapePoints]);

  // Toggle shape editing mode
  const handleToggleShapeEdit = useCallback(() => {
    if (isEditingShape) {
      // Exiting edit mode
      setIsEditingShape(false);
      setShapeEditMode('move');
      setCurrentPointIndex(null);
    } else {
      // Entering edit mode
      setIsEditingShape(true);
      setShapeEditMode('move');
      if (selectedShapeId) {
        const points = getCurrentShapePoints(selectedShapeId);
        if (points.length > 0) {
          setCurrentPointIndex(points.length - 1);
        }
      }
    }
    setShapeError(null);
  }, [isEditingShape, selectedShapeId, getCurrentShapePoints]);

  // Update shape point position
  const handleUpdateShapePoint = useCallback(
    (shapeId: string, index: number, lat: number, lon: number) => {
      setCustomShapePoints((prev) => {
        // Use prev state if available, otherwise get original points
        const currentPoints = prev[shapeId] || getOriginalShapePoints(shapeId);
        const newPoints = [...currentPoints];
        newPoints[index] = { ...newPoints[index], lat, lon };
        return { ...prev, [shapeId]: newPoints };
      });
      setShapeError(null);
    },
    [getOriginalShapePoints]
  );

  // Add a new point to the shape at a specific index
  const handleAddShapePoint = useCallback(
    (shapeId: string, index: number, lat: number, lon: number) => {
      setCustomShapePoints((prev) => {
        // Use prev state if available, otherwise get original points
        const currentPoints = prev[shapeId] || getOriginalShapePoints(shapeId);
        const newPoints = [...currentPoints];
        // Insert new point after the index
        newPoints.splice(index + 1, 0, { lat, lon, sequence: 0 });
        // Re-sequence all points
        const resequencedPoints = newPoints.map((p, i) => ({ ...p, sequence: i + 1 }));
        return { ...prev, [shapeId]: resequencedPoints };
      });
      // Update current point index to the newly added point
      setCurrentPointIndex(index + 1);
      setShapeError(null);
    },
    [getOriginalShapePoints]
  );

  // Delete a shape point
  const handleDeleteShapePoint = useCallback(
    (shapeId: string, index: number) => {
      setCustomShapePoints((prev) => {
        // Use prev state if available, otherwise get original points
        const currentPoints = prev[shapeId] || getOriginalShapePoints(shapeId);
        if (currentPoints.length <= 2) {
          setShapeError('Shape must have at least 2 points');
          return prev;
        }
        const newPoints = currentPoints.filter((_, i) => i !== index);
        // Re-sequence all points
        const resequencedPoints = newPoints.map((p, i) => ({ ...p, sequence: i + 1 }));
        // Update current point index - if deleted point was current or after, adjust
        if (currentPointIndex !== null) {
          if (index === currentPointIndex) {
            // Deleted the current point
            // If it was the last point, move to the new last point
            // Otherwise, move to the previous point (or 0 if it was the first)
            const newLength = resequencedPoints.length;
            if (index >= newLength) {
              // Was the last point, move to new last point
              setCurrentPointIndex(newLength - 1);
            } else {
              // Move to previous point (or 0 if it was the first)
              setCurrentPointIndex(Math.max(0, index - 1));
            }
          } else if (index < currentPointIndex) {
            // Deleted a point before current, adjust index down by 1
            setCurrentPointIndex(currentPointIndex - 1);
          }
          // If index > currentPointIndex, no adjustment needed
        }
        return { ...prev, [shapeId]: resequencedPoints };
      });
    },
    [getOriginalShapePoints, currentPointIndex]
  );

  // Save shape changes
  const handleSaveShape = useCallback(async () => {
    if (!selectedShapeId || !hasUnsavedShapeChanges) return;

    const points = customShapePoints[selectedShapeId];
    if (!points) return;

    setIsSavingShape(true);
    setShapeError(null);

    try {
      await updateShape(
        selectedShapeId,
        points.map((p) => ({
          lat: p.lat,
          lon: p.lon,
          sequence: p.sequence,
        }))
      );

      // Update the local details to reflect the new shape
      if (details) {
        // Remove old shape points for this shape_id
        const updatedShapes = details.shapes.filter((s) => s.shape_id !== selectedShapeId);
        // Add new shape points
        const newShapeEntries: Shape[] = points.map((p) => ({
          shape_id: selectedShapeId,
          shape_pt_lat: p.lat,
          shape_pt_lon: p.lon,
          shape_pt_sequence: p.sequence,
        }));
        setDetails({ ...details, shapes: [...updatedShapes, ...newShapeEntries] });
      }

      // Clear the custom points for this shape since it's now saved
      setCustomShapePoints((prev) => {
        const newPoints = { ...prev };
        delete newPoints[selectedShapeId];
        return newPoints;
      });

      setIsEditingShape(false);
    } catch (err) {
      if (err instanceof AxiosError) {
        if (err.response?.status === 403) {
          setShapeError('Permission denied: You need admin privileges to edit shapes.');
        } else {
          setShapeError(err.response?.data?.message || 'Failed to save shape');
        }
      } else {
        setShapeError('An unexpected error occurred');
      }
    } finally {
      setIsSavingShape(false);
    }
  }, [selectedShapeId, hasUnsavedShapeChanges, customShapePoints, details, setDetails]);

  // Discard shape changes
  const handleDiscardShapeChanges = useCallback(() => {
    if (!selectedShapeId) return;

    setCustomShapePoints((prev) => {
      const newPoints = { ...prev };
      delete newPoints[selectedShapeId];
      return newPoints;
    });
    setShapeError(null);
    setIsEditingShape(false);
    setShapeEditMode('move');
    setCurrentPointIndex(null);
  }, [selectedShapeId]);

  return {
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
  };
}
