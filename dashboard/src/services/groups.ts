import axios from '@/utils/axios';

export enum GroupItemType {
  ROUTE = 'route',
  STOP = 'stop',
}

export interface GroupItem {
  type: GroupItemType;
  id: string;
}

export interface Group {
  id: string;
  group_id: string;
  name: string;
  description?: string;
  items: GroupItem[];
  created_at: string;
  updated_at: string;
}

// Get all groups
export const getGroups = async (): Promise<Group[]> => {
  const response = await axios.get<Group[]>('/groups');
  return response.data;
};

// Get a single group by ID
export const getGroup = async (id: string): Promise<Group> => {
  const response = await axios.get<Group>(`/groups/${encodeURIComponent(id)}`);
  return response.data;
};

// Create a new group
export const createGroup = async (group: Partial<Group>): Promise<Group> => {
  const response = await axios.post<Group>('/groups', group);
  return response.data;
};

// Update a group
export const updateGroup = async (id: string, group: Partial<Group>): Promise<Group> => {
  const response = await axios.put<Group>(`/groups/${encodeURIComponent(id)}`, group);
  return response.data;
};

// Delete a group
export const deleteGroup = async (id: string): Promise<void> => {
  await axios.delete(`/groups/${encodeURIComponent(id)}`);
};
