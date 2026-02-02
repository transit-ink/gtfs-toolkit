import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateUser, UpdateUserData, User } from '@/services/users';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface EditUserDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
}

export function EditUserDialog({ user, open, onOpenChange, onUserUpdated }: EditUserDialogProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens/closes or user changes
  useEffect(() => {
    if (open && user) {
      setUsername(user.username);
      setEmail(user.email || '');
      setRoles(user.roles || []);
      setError(null);
    } else if (!open) {
      setUsername('');
      setEmail('');
      setRoles([]);
      setError(null);
    }
  }, [open, user]);

  const handleUpdate = async () => {
    if (!user || !username.trim()) return;

    setIsUpdating(true);
    setError(null);

    try {
      const userData: UpdateUserData = {
        username: username.trim(),
        email: email.trim() ? email.trim().toLowerCase() : '',
        roles: roles.length > 0 ? roles : undefined,
      };
      await updateUser(user.id, userData);
      onUserUpdated();
      onOpenChange(false);
    } catch (err: unknown) {
      console.error('Error updating user:', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status?: number; data?: { message?: string } } };
        if (axiosError.response?.status === 403) {
          setError('Permission denied: You need admin privileges to update users.');
        } else if (axiosError.response?.status === 409) {
          setError('A user with this username or email already exists.');
        } else {
          setError(axiosError.response?.data?.message || 'Failed to update user');
        }
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRoleToggle = (role: string) => {
    if (roles.includes(role)) {
      setRoles(roles.filter(r => r !== role));
    } else {
      setRoles([...roles, role]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && username.trim() && email.trim() && !isUpdating) {
      e.preventDefault();
      handleUpdate();
    }
  };

  if (!user) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Edit User</AlertDialogTitle>
          <AlertDialogDescription>Update user information and roles.</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2" onKeyDown={handleKeyDown}>
          <div className="space-y-2">
            <Label htmlFor="edit-username">Username</Label>
            <Input
              id="edit-username"
              placeholder="e.g., johndoe"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              placeholder="e.g., john@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Roles</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={roles.includes('editor')}
                  onChange={() => handleRoleToggle('editor')}
                  className="w-4 h-4"
                />
                <span>Editor</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={roles.includes('admin')}
                  onChange={() => handleRoleToggle('admin')}
                  className="w-4 h-4"
                />
                <span>Admin</span>
              </label>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>
            Cancel
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={!username.trim() || roles.length === 0 || isUpdating}
          >
            {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Update User
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
