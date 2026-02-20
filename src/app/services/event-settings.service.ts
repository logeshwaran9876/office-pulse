import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


export interface EventSetting {
  eventType: string;
  isRecurringSupported: boolean;
  passiveStartDays: number;
  passiveEndDays: number;
  description?: string;
  defaultStartTime?: string;
  defaultEndTime?: string;
  isActive?: boolean;
}

export interface CreateEventSettingRequest {
  eventType: string;
  isRecurringSupported: boolean;
  passiveStartDays: number;
  passiveEndDays: number;
}

export interface UpdateEventSettingRequest {
  isRecurringSupported: boolean;
  passiveStartDays: number;
  passiveEndDays: number;
}

export interface AddThemeRequest {
  themeName: string;
  // Add other theme properties as needed
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

@Injectable({
  providedIn: 'root'
})

export class EventSettingsService {

  private apiUrl = "http://localhost:7000/api/event-settings";

  constructor(private http: HttpClient) {}

  // Create Setting
  createSetting(request: CreateEventSettingRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(this.apiUrl, request);
  }

  // Get All Settings
  getSettings(page: number = 1, pageSize: number = 10): Observable<ApiResponse<EventSetting[]>> {
    return this.http.get<ApiResponse<EventSetting[]>>(`${this.apiUrl}?page=${page}&pageSize=${pageSize}`);
  }

  // Update Setting
  updateSetting(eventType: string, request: UpdateEventSettingRequest): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/${encodeURIComponent(eventType)}`, request);
  }

  // Delete Setting
  deleteSetting(eventType: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${encodeURIComponent(eventType)}`);
  }

  // Add Theme
  addTheme(eventType: string, request: AddThemeRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${encodeURIComponent(eventType)}/themes`, request);
  }

  // Get Themes
  getThemes(eventType: string, page: number = 1, pageSize: number = 10): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/${encodeURIComponent(eventType)}/themes?page=${page}&pageSize=${pageSize}`);
  }

  // Delete Theme
  deleteTheme(themeId: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/themes/${themeId}`);
  }

  // Count Settings
  getSettingsCount(): Observable<ApiResponse<number>> {
    return this.http.get<ApiResponse<number>>(`${this.apiUrl}/count`);
  }

  // Count Themes
  getThemesCount(eventType: string): Observable<ApiResponse<number>> {
    return this.http.get<ApiResponse<number>>(`${this.apiUrl}/${encodeURIComponent(eventType)}/themes/count`);
  }

  // Utility methods for icons and colors (these might come from backend or stay frontend)
  getEventIcon(eventType: string): string {
    const iconMap: { [key: string]: string } = {
      'Conference': 'bi bi-people-fill',
      'Workshop': 'bi bi-easel-fill',
      'Meeting': 'bi bi-chat-dots-fill',
      'Training': 'bi bi-mortarboard-fill',
      'Webinar': 'bi bi-camera-video-fill',
      'Seminar': 'bi bi-mic-fill',
      'default': 'bi bi-calendar-event-fill'
    };
    return iconMap[eventType] || iconMap['default'];
  }

  getEventColor(eventType: string): string {
    const colorMap: { [key: string]: string } = {
      'Conference': '#4A90E2',
      'Workshop': '#50C878',
      'Meeting': '#FF6B6B',
      'Training': '#9B59B6',
      'Webinar': '#F39C12',
      'Seminar': '#1ABC9C',
      'default': '#95A5A6'
    };
    return colorMap[eventType] || colorMap['default'];
  }
}