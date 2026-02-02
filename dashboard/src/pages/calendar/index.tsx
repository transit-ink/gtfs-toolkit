import { getCalendars } from '@/services/calendar';
import { getCalendarDates } from '@/services/calendarDates';
import { Calendar as CalendarType, CalendarDate } from '@/types/calendar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

function formatDate(value: string | Date): string {
  if (typeof value === 'string') return value;
  return value.toISOString().slice(0, 10);
}

function CalendarDayCell({ value }: { day: (typeof WEEKDAYS)[number]; value: boolean }) {
  return (
    <td className="py-2 px-2">
      {value ? '✓' : '—'}
    </td>
  );
}

function CalendarRow({ row }: { row: CalendarType }) {
  return (
    <tr className="border-b last:border-0">
      <td className="py-2 pr-4 font-mono">{row.service_id}</td>
      {WEEKDAYS.map(day => (
        <CalendarDayCell key={day} day={day} value={!!row[day]} />
      ))}
      <td className="py-2 pl-4">{formatDate(row.start_date)}</td>
      <td className="py-2 pl-2">{formatDate(row.end_date)}</td>
    </tr>
  );
}

function CalendarDateRow({ row }: { row: CalendarDate; idx: number }) {
  return (
    <tr className="border-b last:border-0">
      <td className="py-2 pr-4 font-mono">{row.service_id}</td>
      <td className="py-2 px-4">{formatDate(row.date)}</td>
      <td className="py-2 pl-4">
        {row.exception_type === 1 ? 'Added' : row.exception_type === 2 ? 'Removed' : row.exception_type}
      </td>
    </tr>
  );
}

function CalendarTab() {
  const [calendars, setCalendars] = useState<CalendarType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCalendars = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCalendars();
      setCalendars(data);
    } catch (err) {
      console.error('Error fetching calendars:', err);
      setError('Failed to load calendars.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendars();
  }, [fetchCalendars]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendar</CardTitle>
        <CardDescription>
          Service schedules by weekdays and date range ({calendars.length} service(s))
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <div className="min-w-[600px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium">Service ID</th>
                  <th className="text-left py-2 px-2 font-medium">Mon</th>
                  <th className="text-left py-2 px-2 font-medium">Tue</th>
                  <th className="text-left py-2 px-2 font-medium">Wed</th>
                  <th className="text-left py-2 px-2 font-medium">Thu</th>
                  <th className="text-left py-2 px-2 font-medium">Fri</th>
                  <th className="text-left py-2 px-2 font-medium">Sat</th>
                  <th className="text-left py-2 px-2 font-medium">Sun</th>
                  <th className="text-left py-2 pl-4 font-medium">Start</th>
                  <th className="text-left py-2 pl-2 font-medium">End</th>
                </tr>
              </thead>
              <tbody>
                {calendars.map(row => (
                  <CalendarRow key={row.service_id} row={row} />
                ))}
              </tbody>
            </table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function CalendarDatesTab() {
  const [calendarDates, setCalendarDates] = useState<CalendarDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCalendarDates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCalendarDates();
      setCalendarDates(data);
    } catch (err) {
      console.error('Error fetching calendar dates:', err);
      setError('Failed to load calendar dates.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendarDates();
  }, [fetchCalendarDates]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendar Dates</CardTitle>
        <CardDescription>
          Service exceptions: added (1) or removed (2) by date ({calendarDates.length} date(s))
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <div className="min-w-[400px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium">Service ID</th>
                  <th className="text-left py-2 px-4 font-medium">Date</th>
                  <th className="text-left py-2 pl-4 font-medium">Exception</th>
                </tr>
              </thead>
              <tbody>
                {calendarDates.map((row, idx) => (
                  <CalendarDateRow key={`${row.service_id}-${row.date}-${idx}`} row={row} idx={idx} />
                ))}
              </tbody>
            </table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default function CalendarPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="text-muted-foreground">
          View service calendars and calendar date exceptions.
        </p>
      </div>
      <Tabs defaultValue="calendar" className="flex-1">
        <TabsList>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="calendar-dates">Calendar Dates</TabsTrigger>
        </TabsList>
        <TabsContent value="calendar" className="mt-4">
          <CalendarTab />
        </TabsContent>
        <TabsContent value="calendar-dates" className="mt-4">
          <CalendarDatesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
