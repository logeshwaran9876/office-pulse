import { Component, OnInit } from '@angular/core';
import { EmployeeService } from '../../services/employee.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  constructor(private employeeService: EmployeeService) {}

  stats = {
    totalEmployees: 0,
    activeEmployees: 0,
    totalEvents: 8,
    totalAnnouncements: 4,
    totalDepartments: 5
  };
  
  recentEmployees: any[] = [];
  
  announcements = [
    {
      title: 'Office Party Celebration',
      description: 'Join us for year-end celebration on December 25th',
      tag: 'Important',
      tagClass: 'bg-danger',
      date: '2024-12-25'
    },
    {
      title: 'Employee of the Month',
      description: 'Congratulations to Sarah Johnson for outstanding performance',
      tag: 'Achievement',
      tagClass: 'bg-success',
      date: '2024-12-01'
    },
    {
      title: 'Holiday Notice',
      description: 'Office will be closed on December 26 for Christmas',
      tag: 'Holiday',
      tagClass: 'bg-info',
      date: '2024-12-26'
    }
  ];
  
  upcomingEvents = [
    { name: 'Team Meeting', date: '2024-12-20', time: '10:00 AM', attendees: 12 },
    { name: 'Project Review', date: '2024-12-21', time: '2:00 PM', attendees: 8 },
    { name: 'Client Presentation', date: '2024-12-22', time: '11:00 AM', attendees: 6 }
  ];
  
  currentDate = new Date();

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    const employees = this.employeeService.getEmployees();
    this.stats.totalEmployees = employees.length;
    this.stats.activeEmployees = employees.filter(e => e.status === 'Active').length;
    this.recentEmployees = employees.slice(0, 5);
  }
}