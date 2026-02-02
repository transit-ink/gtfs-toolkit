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
import { createUser, CreateUserData } from '@/services/users';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: () => void;
}

export function CreateUserDialog({ open, onOpenChange, onUserCreated }: CreateUserDialogProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roles, setRoles] = useState<string[]>(['user']);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setUsername('');
      setEmail('');
      setPassword('');
      setRoles(['editor']);
      setError(null);
    }
  }, [open]);

  const handleCreate = async () => {
    if (!username.trim() || !password.trim()) return;

    setIsCreating(true);
    setError(null);

    try {
      const userData: CreateUserData = {
        username: username.trim(),
        email: email?.trim() ? email.trim().toLowerCase() : undefined,
        password: password?.trim() || '',
        roles: roles,
      };
      await createUser(userData);
      onUserCreated();
      onOpenChange(false);
    } catch (err: unknown) {
      console.error('Error creating user:', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status?: number; data?: { message?: string } } };
        if (axiosError.response?.status === 403) {
          setError('Permission denied: You need admin privileges to create users.');
        } else if (axiosError.response?.status === 409) {
          setError('A user with this username or email already exists.');
        } else {
          setError(axiosError.response?.data?.message || 'Failed to create user');
        }
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsCreating(false);
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
    if (
      e.key === 'Enter' &&
      !e.shiftKey &&
      username.trim() &&
      email.trim() &&
      password.trim() &&
      !isCreating
    ) {
      e.preventDefault();
      handleCreate();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Create New User</AlertDialogTitle>
          <AlertDialogDescription>
            Create a new user account with username, email, and roles.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2" onKeyDown={handleKeyDown}>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="e.g., johndoe"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="e.g., john@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!username.trim() || !password.trim() || roles.length === 0 || isCreating}
          >
            {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create User
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
