import axios from '@/utils/axios';
import { currentInstance } from '@/utils/constants';

/**
 * Triggers a download of the current GTFS data as a ZIP file (admin only).
 * Same content as the EOD cron export but returned as a file download.
 */
export const exportGtfs = async (): Promise<void> => {
  const response = await axios.get('/admin/export-gtfs', {
    responseType: 'blob',
  });
  const blob = response.data as Blob;
  const disposition = response.headers['content-disposition'];
  const match = disposition?.match(/filename="?([^";\n]+)"?/);
  const filename =
    match?.[1] ?? `gtfs-export-${currentInstance.id}-${new Date().toISOString()}.zip`;
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};
