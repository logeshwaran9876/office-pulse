import { Injectable } from '@angular/core';
import { Employee } from '../models/employee.model';

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  private employees: Employee[] = [
    {
      id: 'EMP-001',
      employeeId: 'EMP-001',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@company.com',
      department: 'Engineering',
      role: 'Senior Developer',
      dateJoined: new Date('2023-01-15'),
      status: 'Active'
    },
    {
      id: 'EMP-002',
      employeeId: 'EMP-002',
      name: 'Michael Chen',
      email: 'michael.chen@company.com',
      department: 'Marketing',
      role: 'Marketing Manager',
      dateJoined: new Date('2023-03-22'),
      status: 'Active'
    },
    {
      id: 'EMP-003',
      employeeId: 'EMP-003',
      name: 'Emily Rodriguez',
      email: 'emily.rodriguez@company.com',
      department: 'HR',
      role: 'HR Specialist',
      dateJoined: new Date('2023-08-05'),
      status: 'Inactive'
    },
    {
      id: 'EMP-004',
      employeeId: 'EMP-004',
      name: 'David Park',
      email: 'david.park@company.com',
      department: 'Sales',
      role: 'Sales Executive',
      dateJoined: new Date('2023-09-16'),
      status: 'Inactive'
    }
  ];

  getEmployees(): Employee[] {
    return this.employees;
  }

  getFilteredEmployees(): Employee[] {
    return this.employees;
  }

  addEmployee(employee: Omit<Employee, 'id' | 'employeeId'>): void {
    const newId = `EMP-${String(this.employees.length + 1).padStart(3, '0')}`;
    const newEmployee: Employee = {
      ...employee,
      id: newId,
      employeeId: newId
    } as Employee;
    this.employees = [...this.employees, newEmployee];
  }

  updateEmployee(id: string, employee: Partial<Employee>): void {
    this.employees = this.employees.map(emp =>
      emp.id === id ? { ...emp, ...employee } as Employee : emp
    );
  }

  deleteEmployee(id: string): void {
    this.employees = this.employees.filter(emp => emp.id !== id);
  }

  getUniqueRoles(): string[] {
    return [...new Set(this.employees.map(emp => emp.role))];
  }
}