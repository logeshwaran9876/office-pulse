export interface CelebrationEvent {
  id: string;
  title: string;
  type: string;
  date: string; // ISO string format from API
  employeeId?: string;
  employeeName?: string;
  department?: string;
  profileImage?: string;
  description?: string;
  color?: string;
}

export interface CalendarDay {
  day: number;
  date: Date;
  dayName?: string;
  monthName?: string;
  year?: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CelebrationEvent[];
}

export interface YearMonth {
  month: number;
  monthName: string;
  year: number;
  events: CelebrationEvent[];
}

export interface CalendarFilter {
  search?: string;
  types?: string[];
  startDate?: Date;
  endDate?: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

export type CalendarView = 'month' | 'week' | 'day' | 'year';

export interface EventType {
  value: string;
  label: string;
  icon: string;
  color: string;
}