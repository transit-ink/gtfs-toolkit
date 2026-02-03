import axios from '@/utils/axios';

// Enums matching server definitions
export enum ChangesetStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum EntityType {
  AGENCY = 'agency',
  STOP = 'stop',
  ROUTE = 'route',
  TRIP = 'trip',
  STOP_TIME = 'stop_time',
  CALENDAR = 'calendar',
  CALENDAR_DATE = 'calendar_date',
  SHAPE = 'shape',
}

export enum ChangeOperation {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}

// Types
export interface Change {
  id: string;
  changeset_id: string;
  entity_type: EntityType;
  entity_id: string;
  operation: ChangeOperation;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  related_route_id: string | null;
  related_stop_id: string | null;
  related_trip_id: string | null;
  created_at: string;
}

export interface User {
  id: string;
  username: string;
  email?: string;
  roles: string[];
}

export interface Changeset {
  id: string;
  user_id: string;
  user: User;
  status: ChangesetStatus;
  description: string | null;
  reviewed_by: string | null;
  reviewer: User | null;
  reviewed_at: string | null;
  review_comment: string | null;
  changes: Change[];
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ChangesetFilterParams {
  page?: number;
  limit?: number;
  status?: ChangesetStatus;
  user_id?: string;
  entity_type?: EntityType;
}

// Get or create the current user's draft changeset
export const getOrCreateDraft = async (): Promise<Changeset> => {
  const response = await axios.get<Changeset>('/changesets/draft');
  return response.data;
};

// Get a changeset by ID
export const getChangeset = async (id: string): Promise<Changeset> => {
  const response = await axios.get<Changeset>(`/changesets/${id}`);
  return response.data;
};

// List changesets with optional filters
export const listChangesets = async (
  params?: ChangesetFilterParams
): Promise<PaginatedResponse<Changeset>> => {
  const response = await axios.get<PaginatedResponse<Changeset>>('/changesets', {
    params,
  });
  return response.data;
};

// Create a new changeset
export const createChangeset = async (description?: string): Promise<Changeset> => {
  const response = await axios.post<Changeset>('/changesets', { description });
  return response.data;
};

// Update a changeset (draft only)
export const updateChangeset = async (
  id: string,
  data: { description?: string }
): Promise<Changeset> => {
  const response = await axios.patch<Changeset>(`/changesets/${id}`, data);
  return response.data;
};

// Delete a changeset (draft only)
export const deleteChangeset = async (id: string): Promise<void> => {
  await axios.delete(`/changesets/${id}`);
};

// Add a change to a changeset
export interface AddChangeData {
  entity_type: EntityType;
  entity_id: string;
  operation: ChangeOperation;
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  related_route_id?: string;
  related_stop_id?: string;
  related_trip_id?: string;
}

export const addChange = async (
  changesetId: string,
  data: AddChangeData
): Promise<Change> => {
  const response = await axios.post<Change>(`/changesets/${changesetId}/changes`, data);
  return response.data;
};

// Remove a change from a changeset
export const removeChange = async (changeId: string): Promise<void> => {
  await axios.delete(`/changesets/changes/${changeId}`);
};

// Submit a changeset for review
export const submitChangeset = async (
  id: string,
  description: string
): Promise<Changeset> => {
  const response = await axios.post<Changeset>(`/changesets/${id}/submit`, {
    description,
  });
  return response.data;
};

// Approve a changeset (Moderator/Admin only)
export const approveChangeset = async (
  id: string,
  comment?: string
): Promise<Changeset> => {
  const response = await axios.post<Changeset>(`/changesets/${id}/approve`, {
    comment,
  });
  return response.data;
};

// Reject a changeset (Moderator/Admin only)
export const rejectChangeset = async (
  id: string,
  comment?: string
): Promise<Changeset> => {
  const response = await axios.post<Changeset>(`/changesets/${id}/reject`, {
    comment,
  });
  return response.data;
};

// Get pending changes for entities
export const getPendingChanges = async (
  entityType: EntityType,
  entityIds?: string[]
): Promise<Change[]> => {
  const response = await axios.get<Change[]>('/changesets/pending/by-entity', {
    params: {
      entity_type: entityType,
      entity_ids: entityIds?.join(','),
    },
  });
  return response.data;
};

// Helper to check if user can do direct edits (moderator/admin)
export const canDirectEdit = (roles: string[]): boolean => {
  return roles.includes('moderator') || roles.includes('admin');
};

// Helper to check if user is a contributor (uses changeset workflow)
export const isContributor = (roles: string[]): boolean => {
  return roles.includes('contributor') && !canDirectEdit(roles);
};

// Helper to check if user can review changesets (moderator/admin)
export const canReview = (roles: string[]): boolean => {
  return roles.includes('moderator') || roles.includes('admin');
};

// Helper to check if user can manage users (admin only)
export const canManageUsers = (roles: string[]): boolean => {
  return roles.includes('admin');
};
