import {
  canDirectEdit,
  Changeset,
  deleteChangeset as deleteChangesetApi,
  getOrCreateDraft,
  isContributor,
  removeChange as removeChangeApi,
  submitChangeset as submitChangesetApi,
} from '@/services/changesets';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

interface ChangesetContextType {
  // Current draft changeset
  draftChangeset: Changeset | null;
  isLoading: boolean;
  error: string | null;

  // User role helpers
  isContributorUser: boolean;
  canDirectEditUser: boolean;

  // Actions
  refreshDraft: () => Promise<void>;
  submitChangeset: (description: string) => Promise<void>;
  removeChange: (changeId: string) => Promise<void>;
  discardDraft: () => Promise<void>;

  // Computed values
  hasChanges: boolean;
  changeCount: number;
}

const ChangesetContext = createContext<ChangesetContextType | null>(null);

interface ChangesetProviderProps {
  children: ReactNode;
}

export const ChangesetProvider = ({ children }: ChangesetProviderProps) => {
  const { user, isAuthenticated } = useAuth();
  const [draftChangeset, setDraftChangeset] = useState<Changeset | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userRoles = user?.roles || [];
  const isContributorUser = isContributor(userRoles);
  const canDirectEditUser = canDirectEdit(userRoles);

  const refreshDraft = useCallback(async () => {
    if (!isAuthenticated || !isContributorUser) {
      setDraftChangeset(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const draft = await getOrCreateDraft();
      setDraftChangeset(draft);
    } catch (err) {
      console.error('Failed to fetch draft changeset:', err);
      setError('Failed to load your draft changes');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, isContributorUser]);

  const submitChangeset = useCallback(
    async (description: string) => {
      if (!draftChangeset) {
        throw new Error('No draft changeset to submit');
      }

      setIsLoading(true);
      setError(null);

      try {
        await submitChangesetApi(draftChangeset.id, description);
        // Refresh to get a new draft
        await refreshDraft();
      } catch (err) {
        console.error('Failed to submit changeset:', err);
        setError('Failed to submit changes for review');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [draftChangeset, refreshDraft]
  );

  const removeChange = useCallback(
    async (changeId: string) => {
      setError(null);

      try {
        await removeChangeApi(changeId);
        // Refresh the draft to update the changes list
        await refreshDraft();
      } catch (err) {
        console.error('Failed to remove change:', err);
        setError('Failed to remove change');
        throw err;
      }
    },
    [refreshDraft]
  );

  const discardDraft = useCallback(async () => {
    if (!draftChangeset) return;

    setIsLoading(true);
    setError(null);

    try {
      await deleteChangesetApi(draftChangeset.id);
      setDraftChangeset(null);
      // Create a new empty draft
      await refreshDraft();
    } catch (err) {
      console.error('Failed to discard draft:', err);
      setError('Failed to discard changes');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [draftChangeset, refreshDraft]);

  // Fetch draft on mount and when user changes
  useEffect(() => {
    if (isAuthenticated && isContributorUser) {
      refreshDraft();
    } else {
      setDraftChangeset(null);
    }
  }, [isAuthenticated, isContributorUser, refreshDraft]);

  const hasChanges = (draftChangeset?.changes?.length ?? 0) > 0;
  const changeCount = draftChangeset?.changes?.length ?? 0;

  return (
    <ChangesetContext.Provider
      value={{
        draftChangeset,
        isLoading,
        error,
        isContributorUser,
        canDirectEditUser,
        refreshDraft,
        submitChangeset,
        removeChange,
        discardDraft,
        hasChanges,
        changeCount,
      }}
    >
      {children}
    </ChangesetContext.Provider>
  );
};

export const useChangeset = () => {
  const context = useContext(ChangesetContext);
  if (!context) {
    throw new Error('useChangeset must be used within a ChangesetProvider');
  }
  return context;
};
