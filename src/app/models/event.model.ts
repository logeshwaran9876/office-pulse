export interface Event {
  uId?: string;
  id?: number;
  title: string;
  description: string;
  eventType?: string;
  category?: string;
  priority?: 'Normal' | 'Important' | 'Urgent';
  activeFrom: string;
  activeTo: string;
  startDate?: Date;
  endDate?: Date;
  status?: 'Active' | 'Scheduled' | 'Expired';
  theme?: string;
  themeId?: number;
  themeFileName?: string;
  imageUrl?: string;
  facilities?: string;
  createdAt?: Date;
  updatedAt?: Date;
  attachments?: Attachment[];
  employeeUId?: string;
}

export interface Attachment {
  id: number;
  fileName: string;
  fileUrl: string;
  fileType: string;
  uploadedAt: Date;
  size?: number;
}

export interface EventAnalytics {
  total: number;
  active: number;
  scheduled: number;
  expired: number;
  byCategory: { [key: string]: number };
  byPriority?: { [key: string]: number };
  upcomingEvents: number;
  todayBirthdays?: number;
  todayAnniversaries?: number;
}

export interface CategoryCountResponse {
  success: boolean;
  data: { [category: string]: number };
}

export interface Pagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: Pagination;
  message?: string;
}

export interface CelebrationResponse {
  success: boolean;
  data: any[];
  message?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface EventTheme {
  id: number;
  themeFileName: string;
  isDefault: boolean;
  imageUrl: string;
  createdOn: string;
  previewUrl?: string;
}

export interface EventThemeResponse {
  success: boolean;
  message: string;
  data: EventTheme[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
  };
}


export interface EventSetting {
  eventType: string;
  passiveStartDays: number;
  passiveEndDays: number;
  isRecurringSupported: boolean;
  description?: string;
}