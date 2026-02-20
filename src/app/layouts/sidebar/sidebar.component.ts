import { Component, Input } from '@angular/core';

import { AuthService} from "../../services/auth.service"
@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  @Input() isCollapsed = false;
  constructor(private authService: AuthService) {}
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
      path: '/event-settings',
      label: 'Event Settings',
      icon: 'bi-sliders',
      active: false
    },
        {
      path: '/theme-settings',
      label: 'theme Settings',
      icon: 'bi bi-images',
    
      active: false
    },
      {
      path: '/users',
      label: 'user Component',
      icon: 'bi bi-person-square',
   
      active: false
    }
 
  ];
     
  logout() {
    console.log("Logout clicked ✅");

   
    this.authService.logout();
  }
}
