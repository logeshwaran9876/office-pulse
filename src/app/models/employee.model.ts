// Single unified Employee interface that includes all fields
export interface Employee {
  // Core fields
  id: string;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  role: string;
  status: 'Active' | 'Inactive';
  
  // Additional fields from API
  firstName?: string;
  lastName?: string;
  mobile?: string;
  dateJoined: string | null;
  dateOfBirth?: string | null;
  weddingDate?: string | null;
  gender?: string | null;
  maritalStatus?: string | null;
  wifeName?: string | null;
  employeePhoto?: string | null;
  password?: string;
}

// Interface for Employee data used in events (subset of Employee)
export interface EmployeeforEvent {
  uid: string;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  role: string;
}

// API response interfaces
export interface EmployeeApiResponse {
  success: boolean;
  message: string;
  data: EmployeeRawData[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface EmployeeRawData {
  uId: string;
  firstName: string;
  lastName: string;
  gender: string | null;
  maritalStatus: string | null;
  dateOfBirth: string;
  dateOfJoining: string;
  weddingDate: string | null;
  status: string;
  department: string;
  employeePhoto: string | null;
  wifeName: string | null;
  mobile: string;
  email: string;
  password: string;
}