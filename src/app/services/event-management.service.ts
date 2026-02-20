import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, forkJoin } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Event, EventAnalytics, CategoryCountResponse, PaginatedResponse, CelebrationResponse, ApiResponse, EventTheme, EventThemeResponse } from '../models/event.model';
import { EmployeeforEvent } from '../models/employee.model';

export interface EventSetting {
  eventType: string;
  passiveStartDays: number;
  passiveEndDays: number;
  isRecurringSupported: boolean;
  description?: string;
}


@Injectable({
  providedIn: 'root'
})
export class EventManagementService {
  private apiUrl = 'http://localhost:7000/api/event';
  private eventSettingsUrl = 'http://localhost:7000/api/event-settings';
  private tenantId = 'bbb';

  private eventsSubject = new BehaviorSubject<Event[]>([]);
  private analyticsSubject = new BehaviorSubject<EventAnalytics>({
    total: 0,
    active: 0,
    scheduled: 0,
    expired: 0,
    byCategory: {},
    upcomingEvents: 0
  });


  
  private themes = [
    { id: 'default', name: 'Default Light', class: 'theme-default', styles: { background: '#ffffff', color: '#000000' } },
    { id: 'dark', name: 'Dark Theme', class: 'theme-dark', styles: { background: '#343a40', color: '#ffffff' } },
    { id: 'colorful', name: 'Colorful', class: 'theme-colorful', styles: { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#ffffff' } },
    { id: 'minimal', name: 'Minimal', class: 'theme-minimal', styles: { background: '#f8f9fa', color: '#212529' } },
    { id: 'gradient', name: 'Gradient', class: 'theme-gradient', styles: { background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: '#ffffff' } }
  ];

  constructor(private http: HttpClient) {
    this.loadInitialData();
    setInterval(() => this.refreshAllData(), 5 * 60 * 1000);
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'tid': this.tenantId
    });
  }

  getThemesByEventType(eventType: string, page: number = 1, pageSize: number = 50): Observable<EventTheme[]> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<EventThemeResponse>(
      `${this.eventSettingsUrl}/${eventType}/themes`, 
      { 
        headers: this.getHeaders(),
        params 
      }
    ).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data.map(theme => ({
            ...theme,
            previewUrl: this.getFullImageUrl(theme.imageUrl)
          }));
        }
        return [];
      })
    );
  }



  
// Add these methods to the service class
getEventSettings(page: number = 1, pageSize: number = 50): Observable<EventSetting[]> {
  const params = new HttpParams()
    .set('page', page.toString())
    .set('pageSize', pageSize.toString());

  return this.http.get<any>(`${this.eventSettingsUrl}`, {
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

// Optional: Get a specific event setting by type
getEventSettingByType(eventType: string): Observable<EventSetting | undefined> {
  return this.getEventSettings().pipe(
    map(settings => settings.find(s => s.eventType === eventType))
  );
}
  private getFullImageUrl(relativeUrl: string): string {
    if (!relativeUrl) return '';
    if (relativeUrl.startsWith('http')) return relativeUrl;
    const baseUrl = 'http://localhost:7000';
    const normalizedUrl = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`;
    return `${baseUrl}${normalizedUrl}`;
  }

  private loadInitialData(): void {
    forkJoin({
      events: this.getAllEvents(1, 100).pipe(map((res: PaginatedResponse<Event>) => res.data)),
      analytics: this.getDashboardAnalytics()
    }).subscribe({
      next: ({ events, analytics }) => {
        this.eventsSubject.next(this.processEvents(events));
        this.analyticsSubject.next(analytics);
      },
      error: (error) => {
        console.error('Error loading initial data:', error);
      }
    });
  }

  private refreshAllData(): void {
    this.loadInitialData();
  }

  private processEvents(events: any[]): Event[] {
    return events.map(event => ({
      ...event,
      status: this.calculateStatus(event.activeFrom, event.activeTo)
    }));
  }

  private calculateStatus(activeFrom: string, activeTo: string): 'Active' | 'Scheduled' | 'Expired' {
    const now = new Date();
    const start = new Date(activeFrom);
    const end = new Date(activeTo);

    if (now < start) return 'Scheduled';
    if (now > end) return 'Expired';
    return 'Active';
  }

  getAllEvents(page: number = 1, pageSize: number = 10): Observable<PaginatedResponse<Event>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<PaginatedResponse<Event>>(`${this.apiUrl}`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      tap(response => {
        if (response.success) {
          const processedEvents = this.processEvents(response.data);
          this.eventsSubject.next(processedEvents);
        }
      })
    );
  }

  getEventById(uid: string): Observable<ApiResponse<Event>> {
    return this.http.get<ApiResponse<Event>>(`${this.apiUrl}/${uid}`, {
      headers: this.getHeaders()
    });
  }

  getEmployees(): Observable<EmployeeforEvent[]> {
    return this.http
      .get<ApiResponse<any[]>>(`http://localhost:7000/api/employees`, {
        headers: this.getHeaders()
      })
      .pipe(
        map((res) =>
          res.data.map((emp: any) => {
            const uid = emp.uId || emp.uid || emp.id;
            return {
              uid: uid,
              employeeId: uid ? uid.substring(0, 8) : "N/A",
              name: `${emp.firstName || ""} ${emp.lastName || ""}`.trim(),
              email: emp.email || "",
              department: emp.department || "",
              role: emp.role || emp.department || ""
            };
          })
        )
      );
  }

  createEvent(eventData: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/new`, eventData, {
      headers: this.getHeaders()
    }).pipe(
      tap(() => this.refreshAllData())
    );
  }

  updateEvent(uid: string, eventData: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/${uid}`, eventData, {
      headers: this.getHeaders()
    }).pipe(
      tap(() => this.refreshAllData())
    );
  }

  deleteEvent(uid: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${uid}`, {
      headers: this.getHeaders()
    }).pipe(
      tap(() => this.refreshAllData())
    );
  }

  getActiveTodayEvents(page: number = 1, pageSize: number = 10): Observable<PaginatedResponse<Event>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<PaginatedResponse<Event>>(`${this.apiUrl}/active/today`, {
      headers: this.getHeaders(),
      params
    });
  }

  getUpcomingEventsPaginated(days: number = 7, page: number = 1, pageSize: number = 10): Observable<PaginatedResponse<Event>> {
    const params = new HttpParams()
      .set('days', days.toString())
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<PaginatedResponse<Event>>(`${this.apiUrl}/upcoming`, {
      headers: this.getHeaders(),
      params
    });
  }

  getEventsByCategory(category: string, page: number = 1, pageSize: number = 10): Observable<PaginatedResponse<Event>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<PaginatedResponse<Event>>(`${this.apiUrl}/category/${category}`, {
      headers: this.getHeaders(),
      params
    });
  }

  getTotalEventCount(): Observable<{ total: number }> {
    return this.http.get<{ success: boolean; total: number }>(`${this.apiUrl}/count`, {
      headers: this.getHeaders()
    }).pipe(map(response => ({ total: response.total })));
  }

  getActiveEventCount(): Observable<{ total: number }> {
    return this.http.get<{ success: boolean; total: number }>(`${this.apiUrl}/count/active`, {
      headers: this.getHeaders()
    }).pipe(map(response => ({ total: response.total })));
  }

  getCategoryWiseCount(): Observable<CategoryCountResponse> {
    return this.http.get<CategoryCountResponse>(`${this.apiUrl}/count/category`, {
      headers: this.getHeaders()
    });
  }

  getTodayBirthdays(): Observable<CelebrationResponse> {
    return this.http.get<CelebrationResponse>(`${this.apiUrl}/celebrations/birthdays/today`, {
      headers: this.getHeaders()
    });
  }

  getUpcomingBirthdays(days: number = 30): Observable<CelebrationResponse> {
    return this.http.get<CelebrationResponse>(`${this.apiUrl}/celebrations/birthdays/upcoming?days=${days}`, {
      headers: this.getHeaders()
    });
  }

  getTodayBirthdayCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/celebrations/birthdays/today/count`, {
      headers: this.getHeaders()
    });
  }

  getTodayWorkAnniversaries(): Observable<CelebrationResponse> {
    return this.http.get<CelebrationResponse>(`${this.apiUrl}/celebrations/anniversaries/work/today`, {
      headers: this.getHeaders()
    });
  }

  getUpcomingWorkAnniversaries(days: number = 7): Observable<CelebrationResponse> {
    return this.http.get<CelebrationResponse>(`${this.apiUrl}/celebrations/anniversaries/work/upcoming?days=${days}`, {
      headers: this.getHeaders()
    });
  }

  getTodayWeddingAnniversaries(): Observable<CelebrationResponse> {
    return this.http.get<CelebrationResponse>(`${this.apiUrl}/celebrations/anniversaries/wedding/today`, {
      headers: this.getHeaders()
    });
  }

  getUpcomingWeddingAnniversaries(days: number = 7): Observable<CelebrationResponse> {
    return this.http.get<CelebrationResponse>(`${this.apiUrl}/celebrations/anniversaries/wedding/upcoming?days=${days}`, {
      headers: this.getHeaders()
    });
  }

  getMonthlyBestEmployees(): Observable<CelebrationResponse> {
    return this.http.get<CelebrationResponse>(`${this.apiUrl}/celebrations/best-employees/monthly`, {
      headers: this.getHeaders()
    });
  }

  addBestEmployeePost(postData: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/celebrations/best-employees`, postData, {
      headers: this.getHeaders()
    }).pipe(
      tap(() => this.refreshAllData())
    );
  }

  getDashboardAnalytics(): Observable<EventAnalytics> {
    return forkJoin({
      total: this.getTotalEventCount(),
      active: this.getActiveEventCount(),
      categoryCounts: this.getCategoryWiseCount(),
      todayBirthdays: this.getTodayBirthdayCount(),
      upcoming: this.getUpcomingEventsPaginated(7, 1, 1).pipe(map((res: PaginatedResponse<Event>) => res.pagination.totalCount))
    }).pipe(
      map(({ total, active, categoryCounts, todayBirthdays, upcoming }) => ({
        total: total.total,
        active: active.total,
        scheduled: 0,
        expired: 0,
        byCategory: categoryCounts.data,
        upcomingEvents: upcoming,
        todayBirthdays: todayBirthdays.count,
        todayAnniversaries: 0
      }))
    );
  }

  getEvents(): Observable<Event[]> {
    return this.eventsSubject.asObservable();
  }

  getAnalytics(): Observable<EventAnalytics> {
    return this.analyticsSubject.asObservable();
  }

  getEventsValue(): Event[] {
    return this.eventsSubject.value;
  }

  getAnalyticsValue(): EventAnalytics {
    return this.analyticsSubject.value;
  }

  getThemes() {
    return this.themes;
  }

  filterEvents(filters: {
    category?: string;
    priority?: string;
    startDate?: Date;
    endDate?: Date;
    status?: string;
  }): Event[] {
    const currentEvents = this.eventsSubject.value;
    return currentEvents.filter(event => {
      let match = true;

      if (filters.category && event.eventType !== filters.category) match = false;
      if (filters.status && event.status !== filters.status) match = false;
      if (filters.startDate && new Date(event.activeFrom).getTime() < filters.startDate.getTime()) match = false;
      if (filters.endDate && new Date(event.activeTo).getTime() > filters.endDate.getTime()) match = false;

      return match;
    });
  }

  searchEvents(query: string): Event[] {
    const searchTerm = query.toLowerCase();
    const currentEvents = this.eventsSubject.value;
    return currentEvents.filter(event =>
      event.title.toLowerCase().includes(searchTerm) ||
      event.description.toLowerCase().includes(searchTerm) ||
      (event.eventType || '').toLowerCase().includes(searchTerm)
    );
  }

  getEventsActiveToday(): Event[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.eventsSubject.value.filter(event =>
      event.status === 'Active' &&
      new Date(event.activeFrom).getTime() <= tomorrow.getTime() &&
      new Date(event.activeTo).getTime() >= today.getTime()
    );
  }

  getUpcomingEventsList(days: number = 7): Event[] {
    const now = new Date();
    const future = new Date(now);
    future.setDate(future.getDate() + days);

    return this.eventsSubject.value
      .filter(event =>
        event.status === 'Scheduled' &&
        new Date(event.activeFrom).getTime() <= future.getTime() &&
        new Date(event.activeFrom).getTime() >= now.getTime()
      )
      .sort((a, b) => new Date(a.activeFrom).getTime() - new Date(b.activeFrom).getTime());
  }
}