import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import { ROUTE_TYPE_LABELS } from './constants';
import { EditFormState } from './types';

function RouteTypeOption({ value, label }: { value: string; label: string }) {
  return (
    <option key={value} value={value}>
      {label}
    </option>
  );
}

interface RouteEditFormProps {
  editForm: EditFormState;
  setEditForm: React.Dispatch<React.SetStateAction<EditFormState>>;
  isSaving: boolean;
  saveError: string | null;
  onSave: () => void;
  onCancel: () => void;
}

export function RouteEditForm({
  editForm,
  setEditForm,
  isSaving,
  saveError,
  onSave,
  onCancel,
}: RouteEditFormProps) {
  return (
    <div className="space-y-4">
      {saveError && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
          {saveError}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="route_id">Route ID</Label>
        <Input
          id="route_id"
          value={editForm.route_id}
          required
          onChange={(e) =>
            setEditForm((prev) => ({ ...prev, route_id: e.target.value }))
          }
          placeholder="e.g., 500D"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="route_short_name">Short Name</Label>
        <Input
          id="route_short_name"
          value={editForm.route_short_name}
          onChange={(e) =>
            setEditForm((prev) => ({ ...prev, route_short_name: e.target.value }))
          }
          placeholder="e.g., 500D"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="route_long_name">Long Name</Label>
        <Input
          id="route_long_name"
          value={editForm.route_long_name}
          onChange={(e) =>
            setEditForm((prev) => ({ ...prev, route_long_name: e.target.value }))
          }
          placeholder="e.g., Kempegowda Bus Station - Electronic City"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="route_type">Route Type</Label>
        <select
          id="route_type"
          value={editForm.route_type}
          onChange={(e) =>
            setEditForm((prev) => ({ ...prev, route_type: Number(e.target.value) }))
          }
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {Object.entries(ROUTE_TYPE_LABELS).map(([value, label]) => (
            <RouteTypeOption key={value} value={value} label={label} />
          ))}
        </select>
      </div>

      <div className="flex gap-2 pt-2">
        <Button onClick={onSave} disabled={isSaving} className="flex-1">
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Changes
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
