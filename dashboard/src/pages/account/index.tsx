import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/context/AuthContext';
import { capitalize } from 'lodash';
import { FormEvent, useEffect, useState } from 'react';

function RoleBadge({ role }: { role: string }) {
  return (
    <span className="inline-flex items-center px-4 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary">
      {capitalize(role)}
    </span>
  );
}

export default function AccountPage() {
  const { user, refreshUser, api } = useAuth();
  const [profileForm, setProfileForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
    profileUrl: user?.profileUrl || '',
  });
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update profile form when user changes
  useEffect(() => {
    if (user) {
      setProfileForm({
        username: user.username,
        email: user.email,
        profileUrl: user.profileUrl || '',
      });
    }
  }, [user]);

  const handleProfileUpdate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!profileForm.username.trim() || !profileForm.email.trim()) {
      setProfileError('Username and email are required');
      return;
    }

    setIsSavingProfile(true);
    try {
      await api.patch('/users/me', {
        username: profileForm.username.trim(),
        email: profileForm.email.trim(),
        profileUrl: profileForm.profileUrl.trim() || undefined,
      });
      setProfileSuccess('Profile updated successfully');
      await refreshUser();
    } catch (error: any) {
      setProfileError(
        error.response?.data?.message ||
          'Failed to update profile. Username or email may already be in use.'
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordChange = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    // Validate passwords match
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    // Validate password length
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.patch('/users/me/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordSuccess('Password updated successfully');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setIsChangingPassword(false);
    } catch (error: any) {
      setPasswordError(
        error.response?.data?.message ||
          'Failed to update password. Please check your current password.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading account information...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">Account</h1>
      </div>

      {/* Profile Information */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-4">Profile Information</h2>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={profileForm.username}
                  onChange={e => setProfileForm({ ...profileForm, username: e.target.value })}
                  required
                  disabled={isSavingProfile}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={profileForm.email}
                  onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                  required
                  disabled={isSavingProfile}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profileUrl">Profile URL</Label>
              <Input
                id="profileUrl"
                type="url"
                placeholder="Enter your profile URL"
                value={profileForm.profileUrl}
                onChange={e => setProfileForm({ ...profileForm, profileUrl: e.target.value })}
                disabled={isSavingProfile}
              />
            </div>
            <div className="space-y-2">
              <Label>Roles</Label>
              <div className="flex flex-wrap gap-2">
                {user.roles.map(role => (
                  <RoleBadge key={role} role={role} />
                ))}
              </div>
            </div>

            {profileError && <div className="text-sm text-destructive">{profileError}</div>}
            {profileSuccess && (
              <div className="text-sm text-green-600 dark:text-green-400">{profileSuccess}</div>
            )}

            <Button type="submit" disabled={isSavingProfile}>
              {isSavingProfile ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </div>
      </div>

      <Separator />

      {/* Password Change */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-4">Change Password</h2>
          {!isChangingPassword ? (
            <Button onClick={() => setIsChangingPassword(true)} variant="outline">
              Change Password
            </Button>
          ) : (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  placeholder="Enter your current password"
                  value={passwordForm.currentPassword}
                  onChange={e =>
                    setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                  }
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter your new password"
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  required
                  disabled={isSubmitting}
                  minLength={8}
                />
                <p className="text-xs text-muted-foreground">
                  Password must be at least 8 characters long
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your new password"
                  value={passwordForm.confirmPassword}
                  onChange={e =>
                    setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                  }
                  required
                  disabled={isSubmitting}
                  minLength={8}
                />
              </div>

              {passwordError && <div className="text-sm text-destructive">{passwordError}</div>}
              {passwordSuccess && (
                <div className="text-sm text-green-600 dark:text-green-400">{passwordSuccess}</div>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Updating...' : 'Update Password'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setPasswordForm({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: '',
                    });
                    setPasswordError('');
                    setPasswordSuccess('');
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
