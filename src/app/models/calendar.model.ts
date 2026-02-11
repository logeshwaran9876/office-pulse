export interface CelebrationEvent {
  id: string;
  title: string;
  type: 'birthday' | 'wedding' | 'work' | 'achievement' | 'event';
  date: Date;
  employeeId?: string;
  employeeName?: string;
  department?: string;
  profileImage?: string;
  description?: string;
  color?: string;
}

export type CalendarView = 'month' | 'week' | 'day' | 'year';

export interface CalendarDay {
  date: Date;
  day: number;
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