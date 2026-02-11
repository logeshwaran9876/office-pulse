import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  @Input() isCollapsed = false;

  menuItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: 'bi-speedometer2',
      active: true
    },
    {
      path: '/employees',
      label: 'Employees',
      icon: 'bi-people',
      active: false
    },
    {
      path: '/events',
      label: 'Events',
      icon: 'bi-calendar-event',
      active: false
    },
    {
      path: '/calendar',
      label: 'Calendar',
      icon: 'bi-calendar3',
      active: false
    },
    {
      path: '/settings',
      label: 'Settings',
      icon: 'bi-gear',
      active: false
    }
  ];
}