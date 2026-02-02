import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { exportGtfs } from '@/services/admin';
import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react';

export default function AdminToolsTab() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExportGtfs = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      await exportGtfs();
    } catch (err) {
      console.error('GTFS export failed:', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status?: number; data?: unknown } };
        if (axiosError.response?.status === 403) {
          setExportError('You need admin privileges to export GTFS.');
        } else {
          setExportError('Export failed. Please try again.');
        }
      } else {
        setExportError('Export failed. Please try again.');
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export GTFS
        </CardTitle>
        <CardDescription>
          Download the current GTFS dataset as a ZIP file. This is the same export that runs
          automatically at end of day (EOD) and is uploaded to S3; here you get the file directly.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {exportError && (
          <p className="text-destructive text-sm" role="alert">
            {exportError}
          </p>
        )}
        <Button onClick={handleExportGtfs} disabled={isExporting}>
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting…
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export GTFS (ZIP)
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
