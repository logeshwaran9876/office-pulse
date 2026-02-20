import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface EventSetting {
  eventType: string;
  passiveStartDays: number;
  passiveEndDays: number;
  isRecurringSupported: boolean;
  description?: string;
}

export interface Theme {
  id: number;
  themeId: string;
  fileName: string;
  isDefault: boolean;
  uploadedAt: string;
  imageUrl?: string;
  previewUrl?: string;
}

export interface UploadThemePayload {
  themeFileBase64: string;
  themeFileName: string;
  isDefault: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ThemeSettingsService {
  private apiUrl = 'http://localhost:7000/api';
  private tenantId = 'bbb';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'tid': this.tenantId
    });
  }

  /**
   * Get all event types from settings API
   */
  getEventTypesFromSettings(page: number = 1, pageSize: number = 50): Observable<EventSetting[]> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<ApiResponse<EventSetting[]>>(`${this.apiUrl}/event-settings`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        return [];
      })
    );
  }

  /**
   * Get themes for a specific event type
   */
  getThemesByEventType(eventType: string, page: number = 1, pageSize: number = 10): Observable<PaginatedResponse<Theme>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<PaginatedResponse<Theme>>(
      `${this.apiUrl}/event-settings/${encodeURIComponent(eventType)}/themes`,
      {
        headers: this.getHeaders(),
        params
      }
    );
  }

  /**
   * Upload a theme for an event type
   */
  uploadTheme(eventType: string, payload: UploadThemePayload): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/event-settings/${encodeURIComponent(eventType)}/themes`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Delete a theme by ID
   */
  deleteTheme(themeId: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(
      `${this.apiUrl}/event-settings/themes/${themeId}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Get full image URL
   */
  getFullImageUrl(relativeUrl: string | undefined): string {
    if (!relativeUrl) return '';
    if (relativeUrl.startsWith('http')) return relativeUrl;
    const baseUrl = this.apiUrl.replace(/\/api\/?$/, '');
    const normalizedUrl = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`;
    return `${baseUrl}${normalizedUrl}`;
  }

  /**
   * Format file size
   */
  formatFileSize(size: number): string {
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
    return (size / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /**
   * Get file icon based on extension
   */
  getFileIcon(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg':
      case 'webp':
        return 'bi bi-file-image';
      case 'pdf':
        return 'bi bi-file-pdf';
      case 'doc':
      case 'docx':
        return 'bi bi-file-word';
      case 'xls':
      case 'xlsx':
        return 'bi bi-file-excel';
      case 'zip':
      case 'rar':
      case '7z':
        return 'bi bi-file-zip';
      case 'mp4':
      case 'mov':
      case 'avi':
        return 'bi bi-file-play';
      case 'mp3':
      case 'wav':
        return 'bi bi-file-music';
      default:
        return 'bi bi-file';
    }
  }

  /**
   * Get icon for event type
   */
  getEventTypeIcon(eventType: string): string {
    const iconMap: { [key: string]: string } = {
      'Birthday': 'bi bi-gift',
      'Treat': 'bi bi-cup-straw',
      'Anniversary': 'bi bi-heart',
      'WorkAnniversary': 'bi bi-briefcase',
      'WeddingAnniversary': 'bi bi-heart-fill',
      'BestEmployee': 'bi bi-star',
      'CompanyEvent': 'bi bi-calendar-event',
      'Holiday': 'bi bi-sun',
      'Meeting': 'bi bi-people',
      'Training': 'bi bi-book'
    };
    
    return iconMap[eventType] || 'bi bi-calendar';
  }
}