import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2 } from 'lucide-react';

interface UnsavedChangesBannerProps {
  message: string;
  error?: string | null;
  isSaving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

export function UnsavedChangesBanner({
  message,
  error,
  isSaving,
  onSave,
  onDiscard,
}: UnsavedChangesBannerProps) {
  return (
    <div className="sticky top-0 z-50 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">{message}</span>
        {error && <span className="text-sm text-destructive ml-2">— {error}</span>}
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={onSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Saving...
            </>
          ) : (
            'Save'
          )}
        </Button>
        <Button size="sm" variant="outline" onClick={onDiscard} disabled={isSaving}>
          Discard
        </Button>
      </div>
    </div>
  );
}
