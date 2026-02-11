export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  role: string;
  dateJoined: Date | string;
  status: 'Active' | 'Inactive';
}

