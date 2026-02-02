import { Calendar } from '@/types/calendar';
import axios from '@/utils/axios';

export const getCalendars = async (): Promise<Calendar[]> => {
  const response = await axios.get<Calendar[]>('/gtfs/calendar');
  return response.data;
};

export const getCalendar = async (id: string): Promise<Calendar> => {
  const response = await axios.get<Calendar>(`/gtfs/calendar/${encodeURIComponent(id)}`);
  return response.data;
};
