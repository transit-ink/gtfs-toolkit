// GTFS Calendar interfaces (aligned with server entities)

export interface Calendar {
  id?: number;
  service_id: string;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  start_date: string;
  end_date: string;
}

export interface CalendarDate {
  id?: number;
  service_id: string;
  date: string;
  exception_type: number; // 1 = added, 2 = removed
}

