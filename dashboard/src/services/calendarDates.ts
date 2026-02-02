import { CalendarDate } from '@/types/calendar';
import axios from '@/utils/axios';

export const getCalendarDates = async (): Promise<CalendarDate[]> => {
  const response = await axios.get<CalendarDate[]>('/gtfs/calendar_dates');
  return response.data;
};

export const getCalendarDatesByServiceId = async (
  serviceId: string
): Promise<CalendarDate[]> => {
  const response = await axios.get<CalendarDate[]>(
    `/gtfs/calendar_dates/${encodeURIComponent(serviceId)}`
  );
  return response.data;
};
