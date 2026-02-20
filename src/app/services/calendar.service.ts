import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CelebrationEvent, ApiResponse } from '../models/calendar.model';

@Injectable({
  providedIn: 'root'
})
export class CalendarApiService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:7000/api/calendar';

  /**
   * Get events for a specific month and year
   */
  getMonthEvents(month: number, year: number): Observable<CelebrationEvent[]> {
    const params = new HttpParams()
      .set('month', month.toString())
      .set('year', year.toString());

    return this.http.get<ApiResponse<CelebrationEvent[]>>(`${this.baseUrl}/month`, { params })
      .pipe(
        map((response: ApiResponse<CelebrationEvent[]>) => {
          if (response.success && response.data) {
            return response.data.map((event: CelebrationEvent) => ({
              ...event,
              date: this.ensureDateFormat(event.date)
            }));
          }
          return [];
        })
      );
  }

  /**
   * Get events for a specific day
   */
  getDayEvents(date: Date): Observable<CelebrationEvent[]> {
    const formattedDate = this.formatDateForApi(date);
    const params = new HttpParams().set('date', formattedDate);

    return this.http.get<ApiResponse<CelebrationEvent[]>>(`${this.baseUrl}/day`, { params })
      .pipe(
        map((response: ApiResponse<CelebrationEvent[]>) => {
          if (response.success && response.data) {
            return response.data.map((event: CelebrationEvent) => ({
              ...event,
              date: this.ensureDateFormat(event.date)
            }));
          }
          return [];
        })
      );
  }

  /**
   * Search events by query text
   */
  searchEvents(query: string): Observable<CelebrationEvent[]> {
    if (!query.trim()) {
      return new Observable<CelebrationEvent[]>(observer => {
        observer.next([]);
        observer.complete();
      });
    }

    const params = new HttpParams().set('query', query);

    return this.http.get<ApiResponse<CelebrationEvent[]>>(`${this.baseUrl}/search`, { params })
      .pipe(
        map((response: ApiResponse<CelebrationEvent[]>) => {
          if (response.success && response.data) {
            return response.data.map((event: CelebrationEvent) => ({
              ...event,
              date: this.ensureDateFormat(event.date)
            }));
          }
          return [];
        })
      );
  }

  /**
   * Filter events by type
   */
  filterEvents(type: string): Observable<CelebrationEvent[]> {
    if (!type) {
      return new Observable<CelebrationEvent[]>(observer => {
        observer.next([]);
        observer.complete();
      });
    }

    const params = new HttpParams().set('type', type);

    return this.http.get<ApiResponse<CelebrationEvent[]>>(`${this.baseUrl}/filter`, { params })
      .pipe(
        map((response: ApiResponse<CelebrationEvent[]>) => {
          if (response.success && response.data) {
            return response.data.map((event: CelebrationEvent) => ({
              ...event,
              date: this.ensureDateFormat(event.date)
            }));
          }
          return [];
        })
      );
  }

  /**
   * Get upcoming events for next N days
   */
  getUpcomingEvents(days: number = 5): Observable<CelebrationEvent[]> {
    const params = new HttpParams().set('days', days.toString());

    return this.http.get<ApiResponse<CelebrationEvent[]>>(`${this.baseUrl}/upcoming`, { params })
      .pipe(
        map((response: ApiResponse<CelebrationEvent[]>) => {
          if (response.success && response.data) {
            return response.data.map((event: CelebrationEvent) => ({
              ...event,
              date: this.ensureDateFormat(event.date)
            }));
          }
          return [];
        })
      );
  }

  /**
   * Format date for API (YYYY-MM-DD)
   */
  private formatDateForApi(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Ensure date is in ISO format
   */
  private ensureDateFormat(date: any): string {
    if (!date) return new Date().toISOString();
    
    // If it's already a string, ensure it's ISO format
    if (typeof date === 'string') {
      // Check if it's YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return new Date(date).toISOString();
      }
      return date;
    }
    
    // If it's a Date object
    if (date instanceof Date) {
      return date.toISOString();
    }
    
    return new Date(date).toISOString();
  }
}