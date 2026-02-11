import { Injectable, signal } from '@angular/core';
import { CelebrationEvent, CalendarFilter } from '../models/calendar.model';

@Injectable({
  providedIn: 'root'
})
export class CalendarService {
  private events = signal<CelebrationEvent[]>([]);
  
  getEvents() {
    return this.events.asReadonly();
  }
  
  addEvent(event: CelebrationEvent) {
    this.events.update(events => [...events, event]);
  }
  
  updateEvent(id: string, updatedEvent: Partial<CelebrationEvent>) {
    this.events.update(events =>
      events.map(event => event.id === id ? { ...event, ...updatedEvent } : event)
    );
  }
  
  deleteEvent(id: string) {
    this.events.update(events => events.filter(event => event.id !== id));
  }
  
  filterEvents(events: CelebrationEvent[], filter: CalendarFilter) {
    return events.filter(event => {
      let matches = true;
      
      if (filter.search) {
        matches = matches && (
          event.title.toLowerCase().includes(filter.search.toLowerCase()) ||
          event.employeeName?.toLowerCase().includes(filter.search.toLowerCase()) ||
          false
        );
      }
      
      if (filter.types && filter.types.length > 0) {
        matches = matches && filter.types.includes(event.type);
      }
      
      if (filter.startDate) {
        matches = matches && new Date(event.date) >= filter.startDate;
      }
      
      if (filter.endDate) {
        matches = matches && new Date(event.date) <= filter.endDate;
      }
      
      return matches;
    });
  }
}