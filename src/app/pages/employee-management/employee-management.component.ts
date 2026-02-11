import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { EmployeeService } from '../../services/employee.service';
import { Employee } from '../../models/employee.model';

@Component({
  selector: 'app-employee-management',
  templateUrl: './employee-management.component.html',
  styleUrls: ['./employee-management.component.css']
})
export class EmployeeManagementComponent implements OnInit {
  employees: Employee[] = [];
  filteredEmployees: Employee[] = [];

  searchTerm = '';
  selectedRole = '';
  selectedStatus = '';
  
  roles: string[] = [];
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  
  selectedEmployee: Employee | null = null;
  isEditMode = false;

  employeeForm: FormGroup;

  constructor(
    private employeeService: EmployeeService,
    private modalService: NgbModal,
    private fb: FormBuilder
  ) {
    this.employeeForm = this.fb.group({
      id: [''],
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      department: ['', Validators.required],
      role: ['', Validators.required],
      dateJoined: ['', Validators.required],
      status: ['Active', Validators.required],
      employeeId: ['']
    });
  }

  ngOnInit() {
    this.loadEmployees();
    this.roles = this.employeeService.getUniqueRoles();
  }

  loadEmployees() {
    this.employees = this.employeeService.getFilteredEmployees();
    this.applyFilters();
  }

  applyFilters() {
    let filtered = [...this.employees];
    
    if (this.searchTerm) {
      filtered = filtered.filter(emp => 
        emp.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        emp.employeeId?.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
    
    if (this.selectedRole) {
      filtered = filtered.filter(emp => emp.role === this.selectedRole);
    }
    
    if (this.selectedStatus) {
      filtered = filtered.filter(emp => emp.status === this.selectedStatus);
    }
    
    this.filteredEmployees = filtered;
    this.totalItems = filtered.length;
  }

  onSearch(event: any) {
    this.searchTerm = event.target.value;
    this.currentPage = 1;
    this.applyFilters();
  }

  filterByRole(role: string) {
    this.selectedRole = role;
    this.currentPage = 1;
    this.applyFilters();
  }

  filterByStatus(status: string) {
    this.selectedStatus = status;
    this.currentPage = 1;
    this.applyFilters();
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedRole = '';
    this.selectedStatus = '';
    this.currentPage = 1;
    this.applyFilters();
  }

  openAddModal(content: any) {
    this.isEditMode = false;
    this.selectedEmployee = null;
    this.employeeForm.reset({ status: 'Active' });
    this.modalService.open(content, { size: 'lg', centered: true });
  }

  openEditModal(content: any, employee: Employee) {
    this.isEditMode = true;
    this.selectedEmployee = employee;
    this.employeeForm.patchValue({
      ...employee,
      dateJoined: employee.dateJoined ? new Date(employee.dateJoined).toISOString().split('T')[0] : ''
    });
    this.modalService.open(content, { size: 'lg', centered: true });
  }

  openDeleteModal(content: any, employee: Employee) {
    this.selectedEmployee = employee;
    this.modalService.open(content, { centered: true });
  }

  onSubmit() {
    if (this.employeeForm.valid) {
      const formValue = this.employeeForm.value;
      
      if (this.isEditMode && this.selectedEmployee?.id) {
        this.employeeService.updateEmployee(this.selectedEmployee.id, formValue);
      } else {
        this.employeeService.addEmployee(formValue);
      }
      
      this.modalService.dismissAll();
      this.loadEmployees();
      this.roles = this.employeeService.getUniqueRoles();
    }
  }

  deleteEmployee() {
    if (this.selectedEmployee?.id) {
      this.employeeService.deleteEmployee(this.selectedEmployee.id);
      this.modalService.dismissAll();
      this.loadEmployees();
      this.roles = this.employeeService.getUniqueRoles();
    }
  }

  get paginatedEmployees() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredEmployees.slice(startIndex, startIndex + this.pageSize);
  }
}