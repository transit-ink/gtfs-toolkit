import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { getUsers, User } from '@/services/users';
import { capitalize, map } from 'lodash';
import {
  AlertCircle,
  Edit2,
  Loader2,
  Plus,
  Search,
  Trash2,
  Users as UsersIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { CreateUserDialog } from './createUserDialog';
import { DeleteUserDialog } from './deleteUserDialog';
import { EditUserDialog } from './editUserDialog';

interface UserRowProps {
  user: User;
  isAdmin: boolean;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}

function UserRow({ user, isAdmin, onEdit, onDelete }: UserRowProps) {
  return (
    <tr className="hover:bg-accent/50 transition-colors">
      <td className="px-4 py-3 text-sm">{user.username}</td>
      {isAdmin && (
        <td className="px-4 py-3 text-sm">
          {user.email || <span className="text-muted-foreground">—</span>}
        </td>
      )}
      <td className="px-4 py-3 text-sm">
        {map(user.roles || [], capitalize).join(', ')}
      </td>
      {isAdmin && (
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(user)}
              title="Edit user"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(user)}
              title="Delete user"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </td>
      )}
    </tr>
  );
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const isAdmin = currentUser?.roles?.includes('admin') || false;

  // Fetch users on mount
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getUsers();
        setUsers(data);
        setFilteredUsers(data);
      } catch (err) {
        console.error('Error fetching users:', err);
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosError = err as { response?: { status?: number } };
          if (axiosError.response?.status === 403) {
            setError('Permission denied: You need admin privileges to view users.');
          } else {
            setError('Failed to load users. Please try again.');
          }
        } else {
          setError('Failed to load users. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Filter users based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = users.filter(
      user =>
        user.username.toLowerCase().includes(query) ||
        (user.email && user.email.toLowerCase().includes(query))
    );
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  // Handle user created
  const handleUserCreated = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
      setFilteredUsers(data);
    } catch (err) {
      console.error('Error refreshing users:', err);
    }
  };

  // Handle user updated
  const handleUserUpdated = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
      setFilteredUsers(data);
    } catch (err) {
      console.error('Error refreshing users:', err);
    }
  };

  // Handle user deleted
  const handleUserDeleted = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    setFilteredUsers(prev => prev.filter(u => u.id !== userId));
    setSelectedUser(null);
  };

  // Handle edit button click
  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  // Handle delete button click
  const handleDeleteClick = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading users...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">Users</h1>
          <p className="text-muted-foreground">Manage user accounts and permissions</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New User
          </Button>
        )}
      </div>

      {/* Search Input */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search users by username or email..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 mb-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Users Table */}
      {!error && (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Username</th>
                  {isAdmin && <th className="px-4 py-3 text-left text-sm font-medium">Email</th>}
                  <th className="px-4 py-3 text-left text-sm font-medium">Roles</th>
                  {isAdmin && <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isAdmin ? 4 : 2}
                      className="px-4 py-12 text-center text-muted-foreground"
                    >
                      <UsersIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      {searchQuery.trim() ? (
                        <p>No users found for "{searchQuery}"</p>
                      ) : (
                        <p>No users found</p>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                    <UserRow
                      key={user.id}
                      user={user}
                      isAdmin={isAdmin}
                      onEdit={handleEditClick}
                      onDelete={handleDeleteClick}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onUserCreated={handleUserCreated}
      />

      <EditUserDialog
        user={selectedUser}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onUserUpdated={handleUserUpdated}
      />

      <DeleteUserDialog
        user={selectedUser}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onUserDeleted={handleUserDeleted}
      />
    </div>
  );
}
