import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  @Output() toggleSidebar = new EventEmitter<void>();

  isNotificationOpen = false;

  notifications = [
    { id: 1, title: 'New employee added', time: '5 min ago', read: false },
    { id: 2, title: 'Event tomorrow', time: '1 hour ago', read: false },
    { id: 3, title: 'Report ready', time: '3 hours ago', read: true }
  ];

  get unreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }
}