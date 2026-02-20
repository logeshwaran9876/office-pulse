import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  Employee,
  EmployeeRawData,
  EmployeeforEvent
} from '../models/employee.model';

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {

  private baseUrl = 'http://localhost:7000/api/employees';
  private tenantId = 'WW';

  constructor(private http: HttpClient) {}

  // =====================================================
  // ✅ HEADERS
  // =====================================================
  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      tid: this.tenantId
    });
  }

  // =====================================================
  // ✅ GET EMPLOYEES (PAGINATION + FILTERS)
  // =====================================================
  getEmployees(filters?: any): Observable<{
    data: Employee[];
    pagination: any;
  }> {

    let params = new HttpParams()
      .set('page', filters?.page?.toString() || '1')
      .set('pageSize', filters?.pageSize?.toString() || '10');

    if (filters?.department) params = params.set('department', filters.department);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.gender) params = params.set('gender', filters.gender);
    if (filters?.maritalStatus) params = params.set('maritalStatus', filters.maritalStatus);

    return this.http
      .get<any>(this.baseUrl, { params, headers: this.getHeaders() })
      .pipe(
        map((res) => ({
          data: res.data.map((emp: EmployeeRawData) => this.mapToEmployee(emp)),
          pagination: res.pagination
        }))
      );
  }

  // =====================================================
  // ✅ GET EMPLOYEES FOR EVENT DROPDOWN
  // =====================================================
  getEmployeesForEvent(): Observable<EmployeeforEvent[]> {

    return this.http
      .get<any>(this.baseUrl, {
        params: new HttpParams().set('page', '1').set('pageSize', '500'),
        headers: this.getHeaders()
      })
      .pipe(
        map((res) =>
          res.data.map((emp: EmployeeRawData) => ({
            uid: emp.uId,
            employeeId: emp.uId.substring(0, 8).toUpperCase(),
            name: `${emp.firstName} ${emp.lastName}`.trim(),
            email: emp.email,
            department: emp.department,
            role: emp.department
          }))
        )
      );
  }

  // =====================================================
  // ✅ MAP RAW API DATA → EMPLOYEE MODEL
  // =====================================================
  private mapToEmployee(emp: EmployeeRawData): Employee {

  const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();

  return {
    id: emp.uId,
    employeeId: emp.uId.substring(0, 8).toUpperCase(),

    firstName: emp.firstName,
    lastName: emp.lastName,
    name: fullName,

    email: emp.email,
    mobile: emp.mobile,

    department: emp.department,
    role: emp.department,

    dateJoined:
      emp.dateOfJoining === '0001-01-01T00:00:00Z'
        ? null
        : emp.dateOfJoining,

    dateOfBirth:
      emp.dateOfBirth === '0001-01-01T00:00:00Z'
        ? null
        : emp.dateOfBirth,

    weddingDate: emp.weddingDate,

    // ✅ FIXED STATUS
    status: emp.status === 'Active' ? 'Active' : 'Inactive',

    gender: emp.gender,
    maritalStatus: emp.maritalStatus,

    wifeName: emp.wifeName,
    employeePhoto: emp.employeePhoto,

    password: emp.password
  };
}


  // =====================================================
  // ✅ GET EMPLOYEE BY ID
  // =====================================================
  getEmployeeById(id: string): Observable<Employee> {
    return this.http
      .get<any>(`${this.baseUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(map((res) => this.mapToEmployee(res.data)));
  }

  // =====================================================
  // ✅ CREATE EMPLOYEE
  // =====================================================
  addEmployee(employee: Partial<Employee>): Observable<any> {

    const payload = {
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      mobile: employee.mobile,
      department: employee.department,
      status: employee.status || 'Active',
      gender: employee.gender || null,
      maritalStatus: employee.maritalStatus || null,
      dateOfBirth: employee.dateOfBirth || null,
      dateOfJoining: employee.dateJoined || null,
      weddingDate: employee.weddingDate || null,
      wifeName: employee.wifeName || null,
      employeePhoto: employee.employeePhoto || null
    };

    return this.http.post(this.baseUrl, payload, {
      headers: this.getHeaders()
    });
  }

  // =====================================================
  // ✅ UPDATE EMPLOYEE
  // =====================================================
  updateEmployee(id: string, employee: Partial<Employee>): Observable<any> {

    const payload = {
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      mobile: employee.mobile,
      department: employee.department,
      status: employee.status,
      gender: employee.gender || null,
      maritalStatus: employee.maritalStatus || null,
      dateOfBirth: employee.dateOfBirth || null,
      dateOfJoining: employee.dateJoined || null,
      weddingDate: employee.weddingDate || null,
      wifeName: employee.wifeName || null,
      employeePhoto: employee.employeePhoto || null
    };

    return this.http.put(`${this.baseUrl}/${id}`, payload, {
      headers: this.getHeaders()
    });
  }

  // =====================================================
  // ✅ DELETE EMPLOYEE
  // =====================================================
  deleteEmployee(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`, {
      headers: this.getHeaders()
    });
  }

  // =====================================================
  // ✅ UNIQUE DEPARTMENTS (ROLES)
  // =====================================================
  getUniqueRoles(): Observable<string[]> {

    return this.getEmployees({ page: 1, pageSize: 500 }).pipe(
      map((response) =>
        Array.from(
          new Set(
            response.data
              .map((emp) => emp.department)
              .filter((dept): dept is string => !!dept)
          )
        )
      )
    );
  }

  // =====================================================
  // ✅ UNIQUE DEPARTMENTS
  // =====================================================
  getUniqueDepartments(): Observable<string[]> {
    return this.getUniqueRoles();
  }

  // =====================================================
  // ✅ STATIC DROPDOWN VALUES
  // =====================================================
  getMaritalStatuses(): string[] {
    return ['Single', 'Married', 'Divorced', 'Widowed'];
  }

  getGenders(): string[] {
    return ['Male', 'Female', 'Other'];
  }

  // =====================================================
  // ✅ PHOTO URL FIX
  // =====================================================
  getPhotoUrl(photoPath: string | null): string {

    if (!photoPath) return '';

    if (photoPath.startsWith('data:')) return photoPath;

    if (photoPath.startsWith('http')) return photoPath;

    return `http://localhost:7000/${photoPath}`;
  }
}
