import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { EmployeeService } from '../../services/employee.service';
import { Employee } from '../../models/employee.model';

@Component({
  selector: 'app-employee-management',
  templateUrl: './employee-management.component.html',
  styleUrls: ['./employee-management.component.css']
})
export class EmployeeManagementComponent implements OnInit {
  @ViewChild('photoInput') photoInput!: ElementRef;

  employees: Employee[] = [];
  filteredEmployees: Employee[] = [];

  searchTerm = '';
  selectedRole = '';
  selectedStatus = '';
  selectedDepartment = '';
  selectedGender = '';
  selectedMaritalStatus = '';

  roles: string[] = [];
  departments: string[] = [];
  genders: string[] = [];
  maritalStatuses: string[] = [];

  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;

  selectedEmployee: Employee | null = null;
  isEditMode = false;
  
  // Photo upload
  selectedPhoto: File | null = null;
  photoPreview: string | null = null;

  // Toast notification
  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  showToast = false;

  // Loading state
  isLoading = false;

  employeeForm: UntypedFormGroup;

  constructor(
    private employeeService: EmployeeService,
    private modalService: NgbModal,
    private fb: UntypedFormBuilder
  ) {
    this.employeeForm = this.fb.group({
      id: [''],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      name: [''],
      email: ['', [Validators.required, Validators.email]],
      mobile: ['', [Validators.pattern('^[0-9+\\-\\s]+$')]],
      department: ['', Validators.required],
      role: [''],
      dateJoined: [''],
      dateOfBirth: [''],
      weddingDate: [''],
      status: ['Active', Validators.required],
      gender: [''],
      maritalStatus: [''],
      wifeName: [''],
      employeeId: [''],
      employeePhoto: [null]
    });
  }

  ngOnInit() {
    this.loadEmployees();
    this.genders = this.employeeService.getGenders();
    this.maritalStatuses = this.employeeService.getMaritalStatuses();
  }

  /**
   * Load Employees from API with pagination and filters
   */
  loadEmployees() {
    this.isLoading = true;
    
    const filters: any = {
      page: this.currentPage,
      pageSize: this.pageSize
    };

    if (this.searchTerm) filters.search = this.searchTerm;
    if (this.selectedDepartment) filters.department = this.selectedDepartment;
    if (this.selectedStatus) filters.status = this.selectedStatus;
    if (this.selectedGender) filters.gender = this.selectedGender;
    if (this.selectedMaritalStatus) filters.maritalStatus = this.selectedMaritalStatus;

    this.employeeService.getEmployees(filters).subscribe({
      next: (response: any) => {
        this.employees = response.data || [];
        this.filteredEmployees = this.employees;
        this.totalItems = response.pagination?.totalCount || this.employees.length;
        this.totalPages = response.pagination?.totalPages || 1;
        
        // Load unique departments and roles from the data
        this.extractFiltersFromData();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading employees:', error);
        this.showToastMessage('Failed to load employees', 'error');
        this.isLoading = false;
      }
    });
  }

  /**
   * Extract unique values for filters from employee data
   */
  extractFiltersFromData() {
    // Get unique departments
    const deptSet = new Set<string>();
    this.employees.forEach(emp => {
      if (emp.department) deptSet.add(emp.department);
    });
    this.departments = Array.from(deptSet).sort();

    // Get unique roles (using department as role for now)
    this.roles = [...this.departments];

    // Get unique genders from data (combine with predefined list)
    const genderSet = new Set<string>();
    this.employees.forEach(emp => {
      if (emp.gender) genderSet.add(emp.gender);
    });
    // Merge with predefined genders
    this.genders = Array.from(new Set([...this.genders, ...Array.from(genderSet)]));
  }

  /**
   * Apply filters and reload data
   */
  applyFilters() {
    this.currentPage = 1; // Reset to first page when applying filters
    this.loadEmployees();
  }

  /**
   * Search handler
   */
  onSearch(event: any) {
    this.searchTerm = event.target.value;
    this.applyFilters();
  }

  filterByDepartment(department: string) {
    this.selectedDepartment = department === 'All' ? '' : department;
    this.applyFilters();
  }

  filterByStatus(status: string) {
    this.selectedStatus = status === 'All' ? '' : status;
    this.applyFilters();
  }

  filterByGender(gender: string) {
    this.selectedGender = gender === 'All' ? '' : gender;
    this.applyFilters();
  }

  filterByMaritalStatus(status: string) {
    this.selectedMaritalStatus = status === 'All' ? '' : status;
    this.applyFilters();
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedRole = '';
    this.selectedDepartment = '';
    this.selectedStatus = '';
    this.selectedGender = '';
    this.selectedMaritalStatus = '';
    this.currentPage = 1;
    this.loadEmployees();
  }

  /**
   * Handle page change
   */
  onPageChange(page: number) {
    this.currentPage = page;
    this.loadEmployees();
  }

  /**
   * Handle marital status change
   */
  onMaritalStatusChange(event: any) {
    const status = event.target.value;
    if (status !== 'Married') {
      this.employeeForm.patchValue({ 
        wifeName: '',
        weddingDate: '' 
      });
    }
  }

  /**
   * Photo handling
   */
  onPhotoSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.showToastMessage('File size must be less than 5MB', 'error');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.showToastMessage('Please select an image file', 'error');
      return;
    }

    this.selectedPhoto = file;
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.photoPreview = e.target.result;
      this.employeeForm.patchValue({ employeePhoto: e.target.result });
    };
    reader.readAsDataURL(file);
  }

  removePhoto() {
    this.selectedPhoto = null;
    this.photoPreview = null;
    this.employeeForm.patchValue({ employeePhoto: null });
    if (this.photoInput) {
      this.photoInput.nativeElement.value = '';
    }
  }

  /**
   * Modal methods
   */
  openAddModal(content: any) {
    this.isEditMode = false;
    this.selectedEmployee = null;
    this.selectedPhoto = null;
    this.photoPreview = null;
    this.employeeForm.reset({ 
      status: 'Active',
      gender: '',
      maritalStatus: ''
    });

    this.modalService.open(content, { size: 'lg', centered: true, backdrop: 'static' });
  }

  openEditModal(content: any, employee: Employee) {
    this.isEditMode = true;
    this.selectedEmployee = employee;
    this.selectedPhoto = null;
    this.photoPreview = employee.employeePhoto ? this.employeeService.getPhotoUrl(employee.employeePhoto) : null;

    this.employeeForm.patchValue({
      id: employee.id,
      firstName: employee.firstName || '',
      lastName: employee.lastName || '',
      name: employee.name,
      email: employee.email,
      mobile: employee.mobile,
      department: employee.department,
      role: employee.role || employee.department,
      dateJoined: employee.dateJoined ? new Date(employee.dateJoined).toISOString().split('T')[0] : '',
      dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth).toISOString().split('T')[0] : '',
      weddingDate: employee.weddingDate ? new Date(employee.weddingDate).toISOString().split('T')[0] : '',
      status: employee.status,
      gender: employee.gender,
      maritalStatus: employee.maritalStatus,
      wifeName: employee.wifeName,
      employeeId: employee.employeeId,
      employeePhoto: employee.employeePhoto
    });

    this.modalService.open(content, { size: 'lg', centered: true, backdrop: 'static' });
  }

  openDeleteModal(content: any, employee: Employee) {
    this.selectedEmployee = employee;
    this.modalService.open(content, { centered: true, backdrop: 'static' });
  }

  /**
   * Submit Form
   */
  onSubmit() {
    if (this.employeeForm.valid) {
      const formValue = this.employeeForm.value;
      
      // Prepare employee data
      const employeeData: Partial<Employee> = {
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        name: `${formValue.firstName} ${formValue.lastName}`.trim(),
        email: formValue.email,
        mobile: formValue.mobile,
        department: formValue.department,
        role: formValue.department,
        dateJoined: formValue.dateJoined || null,
        dateOfBirth: formValue.dateOfBirth || null,
        weddingDate: formValue.maritalStatus === 'Married' ? formValue.weddingDate : null,
        status: formValue.status,
        gender: formValue.gender || null,
        maritalStatus: formValue.maritalStatus || null,
        wifeName: formValue.maritalStatus === 'Married' ? formValue.wifeName : null,
        employeePhoto: formValue.employeePhoto || this.photoPreview
      };

      const request = this.isEditMode && this.selectedEmployee?.id
        ? this.employeeService.updateEmployee(this.selectedEmployee.id, employeeData)
        : this.employeeService.addEmployee(employeeData);

      request.subscribe({
        next: () => {
          this.modalService.dismissAll();
          this.loadEmployees();
          this.showToastMessage(
            this.isEditMode ? 'Employee updated successfully' : 'Employee added successfully',
            'success'
          );
        },
        error: (error) => {
          console.error('Error saving employee:', error);
          this.showToastMessage('Failed to save employee', 'error');
        }
      });
    } else {
      this.markFormGroupTouched(this.employeeForm);
      this.showToastMessage('Please fill all required fields', 'error');
    }
  }

  /**
   * Delete Employee
   */
  deleteEmployee() {
    if (this.selectedEmployee?.id) {
      this.employeeService.deleteEmployee(this.selectedEmployee.id)
        .subscribe({
          next: () => {
            this.modalService.dismissAll();
            this.loadEmployees();
            this.showToastMessage('Employee deleted successfully', 'success');
          },
          error: (error) => {
            console.error('Error deleting employee:', error);
            this.showToastMessage('Failed to delete employee', 'error');
          }
        });
    }
  }

  /**
   * Helper to mark all form fields as touched
   */
  private markFormGroupTouched(formGroup: UntypedFormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if ((control as any).controls) {
        this.markFormGroupTouched(control as UntypedFormGroup);
      }
    });
  }

  /**
   * Get employee photo URL
   */
  getEmployeePhotoUrl(employee: Employee): string {
    if (!employee.employeePhoto) return '';
    return this.employeeService.getPhotoUrl(employee.employeePhoto);
  }

  /**
   * Format date for display
   */
  formatDate(date: string | null): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Get initials for avatar
   */
  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  /**
   * Get a short identifier for table display
   */
  getEmployeeShortId(emp: Employee): string {
    if (emp.employeeId) {
      return emp.employeeId;
    }
    if (emp.id) {
      return emp.id.substring(0, 8);
    }
    return '';
  }

  /**
   * Get marital status icon
   */
  getMaritalStatusIcon(status: string | null): string {
    switch(status) {
      case 'Married': return 'bi bi-heart-fill text-danger';
      case 'Single': return 'bi bi-heart text-secondary';
      case 'Divorced': return 'bi bi-heart-half text-warning';
      case 'Widowed': return 'bi bi-heartbreak text-secondary';
      default: return 'bi bi-question-circle';
    }
  }

  /**
   * Get status badge class
   */
  getStatusBadgeClass(status: string): string {
    return status === 'Active' ? 'bg-success' : 'bg-secondary';
  }

  /**
   * Toast notification methods
   */
  showToastMessage(message: string, type: 'success' | 'error' | 'info'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    
    setTimeout(() => {
      this.showToast = false;
    }, 5000);
  }

  hideToast(): void {
    this.showToast = false;
  }
}
