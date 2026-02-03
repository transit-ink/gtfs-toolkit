import axios from '@/utils/axios';

export interface User {
  id: string;
  username: string;
  email?: string;
  roles: string[];
  isEmailVerified: boolean;
  profileUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserData {
  username: string;
  email?: string;
  password: string;
  roles: string[];
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  roles?: string[];
  profileUrl?: string;
}

// Get all users (admin only)
export const getUsers = async (): Promise<User[]> => {
  const response = await axios.get<User[]>('/users');
  return response.data;
};

// Create a new user (admin only)
export const createUser = async (userData: CreateUserData): Promise<User> => {
  const response = await axios.post<User>('/users', userData);
  return response.data;
};

// Update a user (admin only)
export const updateUser = async (userId: string, userData: UpdateUserData): Promise<User> => {
  const response = await axios.put<User>(`/users/${encodeURIComponent(userId)}`, userData);
  return response.data;
};

// Delete a user (admin only)
export const deleteUser = async (userId: string): Promise<void> => {
  await axios.delete(`/users/${encodeURIComponent(userId)}`);
};
