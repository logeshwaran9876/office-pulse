import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

export interface EventData {
  uId: string;
  eventType: string;
  employeeUId: string;
  title: string;
  theme: string;
  description: string;
  activeFrom: string;
  activeTo: string;
  imageUrl: string;
  facilities: string;
}

export interface EmployeeData {
  uId: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  employeePhoto?: string | null; // Changed from profileImage to employeePhoto to match API
  status?: string;
  mobile?: string;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface ApiResponse {
  success: boolean;
  message: string;
  data: EventData[];
  pagination: PaginationInfo;
}

export interface EmployeeApiResponse {
  success: boolean;
  message: string;
  data: any[]; // Raw API response
  pagination: PaginationInfo;
}

// Define the combined event with employee type
export interface EventWithEmployee extends EventData {
  employee: EmployeeData | null;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private eventApiUrl = 'http://localhost:7000/api/Event';
  private employeeApiUrl = 'http://localhost:7000/api/employees';
  private tenantId = 'dd';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'accept': '*/*',
      'tid': this.tenantId
    });
  }

  /**
   * Get all events with pagination
   */
  getEvents(page: number = 1, pageSize: number = 10): Observable<ApiResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<ApiResponse>(this.eventApiUrl, {
      headers: this.getHeaders(),
      params: params
    });
  }

  /**
   * Get all events with employee details
   */
  getEventsWithEmployees(page: number = 1, pageSize: number = 10): Observable<EventWithEmployee[]> {
    return this.getEvents(page, pageSize).pipe(
      switchMap(eventResponse => {
        if (!eventResponse.success || !eventResponse.data.length) {
          return of([]);
        }

        // Get unique employee UIDs from events
        const employeeUids = [...new Set(eventResponse.data.map(event => event.employeeUId))];
        
        // Fetch all employees
        return this.getEmployeesByIds(employeeUids).pipe(
          map(employees => {
            // Create a map of employee by UID for quick lookup
            const employeeMap = new Map(employees.map(emp => [emp.uId, emp]));
            
            // Combine event data with employee data
            return eventResponse.data.map(event => ({
              ...event,
              employee: employeeMap.get(event.employeeUId) || null
            })) as EventWithEmployee[];
          })
        );
      })
    );
  }

  /**
   * Get employee by ID
   */
  getEmployeeById(uid: string): Observable<EmployeeData> {
    return this.http.get<any>(`${this.employeeApiUrl}/${uid}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => this.mapEmployeeData(response.data))
    );
  }

  /**
   * Map raw employee data to EmployeeData interface
   */
  private mapEmployeeData(emp: any): EmployeeData {
    return {
      uId: emp.uId,
      firstName: emp.firstName || '',
      lastName: emp.lastName || '',
      email: emp.email || '',
      department: emp.department || '',
      employeePhoto: emp.employeePhoto || null, // Map employeePhoto from API
      status: emp.status,
      mobile: emp.mobile
    };
  }

  /**
   * Get multiple employees by IDs
   */
  getEmployeesByIds(uids: string[]): Observable<EmployeeData[]> {
    if (!uids.length) {
      return of([]);
    }

    const params = new HttpParams()
      .set('page', '1')
      .set('pageSize', '100');

    return this.http.get<EmployeeApiResponse>(this.employeeApiUrl, {
      headers: this.getHeaders(),
      params: params
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          // Map each employee and filter by UIDs
          return response.data
            .filter((emp: any) => uids.includes(emp.uId))
            .map((emp: any) => this.mapEmployeeData(emp));
        }
        return [];
      })
    );
  }

  /**
   * Get all employees (paginated)
   */
  getEmployees(page: number = 1, pageSize: number = 50): Observable<EmployeeData[]> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<EmployeeApiResponse>(this.employeeApiUrl, {
      headers: this.getHeaders(),
      params: params
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data.map((emp: any) => this.mapEmployeeData(emp));
        }
        return [];
      })
    );
  }

  /**
   * Get event by ID with employee details
   */
  getEventByIdWithEmployee(uId: string): Observable<EventWithEmployee> {
    return this.http.get<any>(`${this.eventApiUrl}/${uId}`, {
      headers: this.getHeaders()
    }).pipe(
      switchMap(eventResponse => {
        const event = eventResponse.data;
        return this.getEmployeeById(event.employeeUId).pipe(
          map(employee => ({
            ...event,
            employee: employee
          }))
        );
      })
    );
  }

  /**
   * Get active events for today with employee details
   */
  getActiveTodayEventsWithEmployees(page: number = 1, pageSize: number = 10): Observable<EventWithEmployee[]> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<ApiResponse>(`${this.eventApiUrl}/active/today`, {
      headers: this.getHeaders(),
      params: params
    }).pipe(
      switchMap(eventResponse => {
        if (!eventResponse.success || !eventResponse.data.length) {
          return of([]);
        }

        const employeeUids = [...new Set(eventResponse.data.map(event => event.employeeUId))];
        
        return this.getEmployeesByIds(employeeUids).pipe(
          map(employees => {
            const employeeMap = new Map(employees.map(emp => [emp.uId, emp]));
            return eventResponse.data.map(event => ({
              ...event,
              employee: employeeMap.get(event.employeeUId) || null
            })) as EventWithEmployee[];
          })
        );
      })
    );
  }

  /**
   * Get upcoming events with employee details
   */
  getUpcomingEventsWithEmployees(days: number = 7, page: number = 1, pageSize: number = 10): Observable<EventWithEmployee[]> {
    const params = new HttpParams()
      .set('days', days.toString())
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<ApiResponse>(`${this.eventApiUrl}/upcoming`, {
      headers: this.getHeaders(),
      params: params
    }).pipe(
      switchMap(eventResponse => {
        if (!eventResponse.success || !eventResponse.data.length) {
          return of([]);
        }

        const employeeUids = [...new Set(eventResponse.data.map(event => event.employeeUId))];
        
        return this.getEmployeesByIds(employeeUids).pipe(
          map(employees => {
            const employeeMap = new Map(employees.map(emp => [emp.uId, emp]));
            return eventResponse.data.map(event => ({
              ...event,
              employee: employeeMap.get(event.employeeUId) || null
            })) as EventWithEmployee[];
          })
        );
      })
    );
  }

  /**
   * Get events by category with employee details
   */
  getEventsByCategoryWithEmployees(category: string, page: number = 1, pageSize: number = 10): Observable<EventWithEmployee[]> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<ApiResponse>(`${this.eventApiUrl}/category/${category}`, {
      headers: this.getHeaders(),
      params: params
    }).pipe(
      switchMap(eventResponse => {
        if (!eventResponse.success || !eventResponse.data.length) {
          return of([]);
        }

        const employeeUids = [...new Set(eventResponse.data.map(event => event.employeeUId))];
        
        return this.getEmployeesByIds(employeeUids).pipe(
          map(employees => {
            const employeeMap = new Map(employees.map(emp => [emp.uId, emp]));
            return eventResponse.data.map(event => ({
              ...event,
              employee: employeeMap.get(event.employeeUId) || null
            })) as EventWithEmployee[];
          })
        );
      })
    );
  }

  /**
   * Helper method to construct full image URL
   */
  getFullImageUrl(relativeUrl: string): string {
    if (!relativeUrl) return '';
    if (relativeUrl.startsWith('http')) return relativeUrl;
    if (relativeUrl.startsWith('data:')) return relativeUrl;
    
    const baseUrl = 'http://localhost:7000';
    const normalizedUrl = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`;
     console.log(`${baseUrl}${normalizedUrl}`);
    return `${baseUrl}${normalizedUrl}`;
  }

  /**
   * Get employee photo URL
   */
 getEmployeePhoto(employee: EmployeeData | null): string {
  if (!employee) return '';
  console.log()
  if (employee.employeePhoto) {
    return this.getFullImageUrl(employee.employeePhoto);
  }
  
  return '';
}

  /**
   * Get employee initials
   */
  getEmployeeInitials(employee: EmployeeData | null): string {
    if (!employee) return '?';
    
    const first = employee.firstName?.charAt(0) || '';
    const last = employee.lastName?.charAt(0) || '';
    
    return (first + last).toUpperCase() || '?';
  }

  /**
   * Get employee full name
   */
  getEmployeeFullName(employee: EmployeeData | null): string {
    if (!employee) return 'Unknown Employee';
    return `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unknown';
  }
}