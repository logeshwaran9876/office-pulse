import { Component, OnInit, inject, signal, ViewChild, TemplateRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbModal, NgbDropdownModule, NgbTooltipModule, NgbPopoverModule, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { RouterLink } from '@angular/router';

// Services
import { EmployeeService } from '../../services/employee.service';

// Models - FIXED: Removed CalendarEvent import
import { CelebrationEvent, CalendarView, CalendarDay, YearMonth } from '../../models/calendar.model';
import { Employee } from '../../models/employee.model';

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css']
})
export class CalendarComponent implements OnInit, AfterViewInit {
  private employeeService = inject(EmployeeService);
  private modalService = inject(NgbModal);
  private fb = inject(FormBuilder);

  // FIXED: ViewChild with correct TemplateRef type
  @ViewChild('eventModal') eventModal!: TemplateRef<any>;
  @ViewChild('eventDetailModal') eventDetailModal!: TemplateRef<any>;
  @ViewChild('dayEventsModal') dayEventsModal!: TemplateRef<any>;

  // Calendar State
  currentDate = new Date();
  currentMonth = new Date().getMonth();
  currentYear = new Date().getFullYear();
  currentView: CalendarView = 'month';
  calendarDays: CalendarDay[] = [];
  yearMonths: YearMonth[] = []; // FIXED: Separate variable for year view
  weekDays: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  monthNames: string[] = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Events Data
  private allEvents = signal<CelebrationEvent[]>([]);
  filteredEvents = signal<CelebrationEvent[]>([]);
  selectedDate = signal<Date | null>(null);
  selectedEvent = signal<CelebrationEvent | null>(null);
  selectedDayEvents = signal<CelebrationEvent[]>([]); // FIXED: For day with multiple events
  selectedEmployee = signal<Employee | null>(null);

  // Upcoming Events
  upcomingEvents = signal<CelebrationEvent[]>([]);

  // Filters
  searchTerm = '';
  selectedFilterTypes: string[] = [];
  eventTypes = [
    { value: 'birthday', label: 'Birthday', icon: '🎂', color: 'primary' },
    { value: 'wedding', label: 'Wedding Anniversary', icon: '💍', color: 'danger' },
    { value: 'work', label: 'Work Anniversary', icon: '🕯️', color: 'warning' },
    { value: 'achievement', label: 'Best Employee', icon: '🏆', color: 'success' },
    { value: 'event', label: 'Office Event', icon: '🎊', color: 'info' }
  ];

  // Event Form
  eventForm: FormGroup;
  isEditMode = false;
  private activeModal: NgbModalRef | null = null;

  constructor() {
    this.eventForm = this.fb.group({
      id: [''],
      title: ['', Validators.required],
      type: ['', Validators.required],
      date: ['', Validators.required],
      employeeId: [''],
      employeeName: [''],
      department: [''],
      description: [''],
      profileImage: [''],
      color: ['primary']
    });
  }

  ngOnInit() {
    this.loadEvents();
  }

  ngAfterViewInit() {
    // Ensure modals are ready
  }

  // ============== Calendar Generation ==============
  generateCalendar() {
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days: CalendarDay[] = [];

    // Previous month days
    const prevMonthLastDay = new Date(this.currentYear, this.currentMonth, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      const date = new Date(this.currentYear, this.currentMonth - 1, day);
      days.push({
        day,
        date,
        isCurrentMonth: false,
        isToday: this.isToday(date),
        events: this.getEventsForDate(date)
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const date = new Date(this.currentYear, this.currentMonth, i);
      days.push({
        day: i,
        date,
        isCurrentMonth: true,
        isToday: this.isToday(date),
        events: this.getEventsForDate(date)
      });
    }

    // Next month days (to fill 42 cells for 6 rows)
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      const date = new Date(this.currentYear, this.currentMonth + 1, i);
      days.push({
        day: i,
        date,
        isCurrentMonth: false,
        isToday: this.isToday(date),
        events: this.getEventsForDate(date)
      });
    }

    this.calendarDays = days;
  }

  getEventsForDate(date: Date): CelebrationEvent[] {
    return this.filteredEvents().filter(event  => {
      const eventDate = new Date(event.date);
      return eventDate.toDateString() === date.toDateString();
    });
  }

  // ============== View Navigation ==============
  changeView(view: CalendarView) {
    this.currentView = view;
    if (view === 'month') {
      this.generateCalendar();
    } else if (view === 'week') {
      this.generateWeekView();
    } else if (view === 'day') {
      this.generateDayView();
    } else if (view === 'year') {
      this.generateYearView();
    }
  }

  generateWeekView() {
    const startOfWeek = new Date(this.currentDate);
    startOfWeek.setDate(this.currentDate.getDate() - this.currentDate.getDay());
    
    const days: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push({
        day: date.getDate(),
        date,
        isCurrentMonth: date.getMonth() === this.currentMonth,
        isToday: this.isToday(date),
        events: this.getEventsForDate(date)
      });
    }
    
    this.calendarDays = days;
  }

  generateDayView() {
    const days: CalendarDay[] = [{
      day: this.currentDate.getDate(),
      date: this.currentDate,
      isCurrentMonth: true,
      isToday: true,
      events: this.getEventsForDate(this.currentDate)
    }];
    this.calendarDays = days;
  }

  generateYearView() {
    const months: YearMonth[] = [];
    for (let month = 0; month < 12; month++) {
      months.push({
        month,
        monthName: this.monthNames[month],
        year: this.currentYear,
        events: this.getEventsForMonth(month)
      });
    }
    this.yearMonths = months;
  }

  getEventsForMonth(month: number): CelebrationEvent[] {
    return this.filteredEvents().filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.getMonth() === month && eventDate.getFullYear() === this.currentYear;
    });
  }

  previousPeriod() {
    if (this.currentView === 'month') {
      if (this.currentMonth === 0) {
        this.currentMonth = 11;
        this.currentYear--;
      } else {
        this.currentMonth--;
      }
      this.currentDate = new Date(this.currentYear, this.currentMonth, 1);
      this.generateCalendar();
    } else if (this.currentView === 'week') {
      this.currentDate.setDate(this.currentDate.getDate() - 7);
      this.generateWeekView();
    } else if (this.currentView === 'day') {
      this.currentDate.setDate(this.currentDate.getDate() - 1);
      this.generateDayView();
    } else if (this.currentView === 'year') {
      this.currentYear--;
      this.generateYearView();
    }
  }

  nextPeriod() {
    if (this.currentView === 'month') {
      if (this.currentMonth === 11) {
        this.currentMonth = 0;
        this.currentYear++;
      } else {
        this.currentMonth++;
      }
      this.currentDate = new Date(this.currentYear, this.currentMonth, 1);
      this.generateCalendar();
    } else if (this.currentView === 'week') {
      this.currentDate.setDate(this.currentDate.getDate() + 7);
      this.generateWeekView();
    } else if (this.currentView === 'day') {
      this.currentDate.setDate(this.currentDate.getDate() + 1);
      this.generateDayView();
    } else if (this.currentView === 'year') {
      this.currentYear++;
      this.generateYearView();
    }
  }

  goToToday() {
    this.currentDate = new Date();
    this.currentMonth = this.currentDate.getMonth();
    this.currentYear = this.currentDate.getFullYear();
    
    if (this.currentView === 'month') {
      this.generateCalendar();
    } else if (this.currentView === 'week') {
      this.generateWeekView();
    } else if (this.currentView === 'day') {
      this.generateDayView();
    } else if (this.currentView === 'year') {
      this.generateYearView();
    }
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  // ============== Event Management ==============
  loadEvents() {
    // Mock data with profile images
    const mockEvents: CelebrationEvent[] = [
      {
        id: '1',
        title: 'Karthi Kumar - Birthday',
        type: 'birthday',
        date: new Date(2026, 1, 14),
        employeeId: 'EMP-001',
        employeeName: 'Karthi Kumar',
        department: 'Engineering',
        profileImage: 'https://ui-avatars.com/api/?name=Karthi+Kumar&background=2c7a7b&color=fff',
        description: '35th Birthday Celebration'
      },
      {
        id: '2',
        title: 'Priya Sharma - Wedding Anniversary',
        type: 'wedding',
        date: new Date(2026, 1, 14),
        employeeId: 'EMP-002',
        employeeName: 'Priya Sharma',
        department: 'Marketing',
        profileImage: 'https://ui-avatars.com/api/?name=Priya+Sharma&background=2c7a7b&color=fff',
        description: '5th Wedding Anniversary'
      },
      {
        id: '3',
        title: 'Rajan Iyer - Work Anniversary',
        type: 'work',
        date: new Date(2026, 1, 15),
        employeeId: 'EMP-003',
        employeeName: 'Rajan Iyer',
        department: 'Engineering',
        profileImage: 'https://ui-avatars.com/api/?name=Rajan+Iyer&background=2c7a7b&color=fff',
        description: '10 Years of Service'
      },
      {
        id: '4',
        title: 'Employee of the Month',
        type: 'achievement',
        date: new Date(2026, 1, 16),
        employeeId: 'EMP-004',
        employeeName: 'Divya Krishnan',
        department: 'Sales',
        profileImage: 'https://ui-avatars.com/api/?name=Divya+Krishnan&background=2c7a7b&color=fff',
        description: 'Best Performance - January 2026'
      },
      {
        id: '5',
        title: 'Office Party',
        type: 'event',
        date: new Date(2026, 1, 20),
        description: 'Year-end Celebration'
      }
    ];
    
    this.allEvents.set(mockEvents);
    this.filteredEvents.set(mockEvents);
    
    // FIXED: Generate calendar AFTER events are set
    this.generateCalendar();
    this.loadUpcomingEvents();
    this.generateYearView();
  }

  loadUpcomingEvents() {
    const upcoming = this.filteredEvents()
      .filter(event => new Date(event.date) >= new Date())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
    this.upcomingEvents.set(upcoming);
  }

  // ============== Filters ==============
  toggleFilter(type: string) {
    const index = this.selectedFilterTypes.indexOf(type);
    if (index === -1) {
      this.selectedFilterTypes.push(type);
    } else {
      this.selectedFilterTypes.splice(index, 1);
    }
    this.applyFilters();
  }

  applyFilters() {
    let filtered = this.allEvents();

    // Filter by search term
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(term) ||
        event.employeeName?.toLowerCase().includes(term) ||
        event.department?.toLowerCase().includes(term) ||
        false
      );
    }

    // Filter by event types
    if (this.selectedFilterTypes.length > 0) {
      filtered = filtered.filter(event => 
        this.selectedFilterTypes.includes(event.type)
      );
    }

    this.filteredEvents.set(filtered);
    
    // FIXED: Regenerate views after filtering
    if (this.currentView === 'month') {
      this.generateCalendar();
    } else if (this.currentView === 'week') {
      this.generateWeekView();
    } else if (this.currentView === 'day') {
      this.generateDayView();
    } else if (this.currentView === 'year') {
      this.generateYearView();
    }
    
    this.loadUpcomingEvents();
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedFilterTypes = [];
    this.filteredEvents.set(this.allEvents());
    
    // FIXED: Regenerate views after clearing filters
    if (this.currentView === 'month') {
      this.generateCalendar();
    } else if (this.currentView === 'week') {
      this.generateWeekView();
    } else if (this.currentView === 'day') {
      this.generateDayView();
    } else if (this.currentView === 'year') {
      this.generateYearView();
    }
    
    this.loadUpcomingEvents();
  }

  // ============== Modal Operations ==============
  openAddEventModal(content: TemplateRef<any>, date?: Date) {
    this.isEditMode = false;
    this.selectedDate.set(date || new Date());
    this.eventForm.reset({
      date: this.formatDate(date || new Date()),
      color: 'primary'
    });
    this.activeModal = this.modalService.open(content, { size: 'lg', centered: true, backdrop: 'static' });
  }

  openEditEventModal(content: TemplateRef<any>, event: CelebrationEvent) {
    this.isEditMode = true;
    this.selectedEvent.set(event);
    this.eventForm.patchValue({
      id: event.id,
      title: event.title,
      type: event.type,
      date: this.formatDate(event.date),
      employeeId: event.employeeId,
      employeeName: event.employeeName,
      department: event.department,
      description: event.description,
      profileImage: event.profileImage,
      color: event.color || 'primary'
    });
    this.activeModal = this.modalService.open(content, { size: 'lg', centered: true, backdrop: 'static' });
  }

  // FIXED: Separate method for single event detail
  openEventDetailModal(content: TemplateRef<any>, event: CelebrationEvent) {
    this.selectedEvent.set(event);
    this.activeModal = this.modalService.open(content, { size: 'md', centered: true });
  }

  // FIXED: New method for day with multiple events
  openDayEventsModal(content: TemplateRef<any>, date: Date, events: CelebrationEvent[]) {
    this.selectedDate.set(date);
    this.selectedDayEvents.set(events);
    this.activeModal = this.modalService.open(content, { size: 'md', centered: true });
  }

  onDateClick(date: Date) {
    const events = this.getEventsForDate(date);
    if (events.length > 1) {
      // Multiple events - show day events modal
      this.openDayEventsModal(this.dayEventsModal, date, events);
    } else if (events.length === 1) {
      // Single event - show event detail
      this.openEventDetailModal(this.eventDetailModal, events[0]);
    } else {
      // No events - show add event modal
      this.openAddEventModal(this.eventModal, date);
    }
  }

  // FIXED: Date conversion properly handled
  saveEvent() {
    if (this.eventForm.valid) {
      const formValue = this.eventForm.value;
      
      // FIXED: Convert date string to Date object
      const eventData = {
        ...formValue,
        date: new Date(formValue.date)
      };
      
      if (this.isEditMode) {
        // Update existing event
        const updatedEvents = this.allEvents().map(event => 
          event.id === eventData.id ? { ...event, ...eventData } : event
        );
        this.allEvents.set(updatedEvents);
      } else {
        // Add new event
        const newEvent: CelebrationEvent = {
          ...eventData,
          id: `EVT-${Date.now()}`
        };
        this.allEvents.set([...this.allEvents(), newEvent]);
      }
      
      // FIXED: Reset filtered events and refresh views
      this.filteredEvents.set(this.allEvents());
      this.modalService.dismissAll();
      this.activeModal = null;
      
      // Refresh all views
      if (this.currentView === 'month') {
        this.generateCalendar();
      } else if (this.currentView === 'week') {
        this.generateWeekView();
      } else if (this.currentView === 'day') {
        this.generateDayView();
      } else if (this.currentView === 'year') {
        this.generateYearView();
      }
      
      this.loadUpcomingEvents();
      this.eventForm.reset();
    }
  }

  deleteEvent(eventId: string) {
    if (confirm('Are you sure you want to delete this event?')) {
      const updatedEvents = this.allEvents().filter(event => event.id !== eventId);
      this.allEvents.set(updatedEvents);
      this.filteredEvents.set(updatedEvents);
      this.modalService.dismissAll();
      this.activeModal = null;
      
      // Refresh all views
      if (this.currentView === 'month') {
        this.generateCalendar();
      } else if (this.currentView === 'week') {
        this.generateWeekView();
      } else if (this.currentView === 'day') {
        this.generateDayView();
      } else if (this.currentView === 'year') {
        this.generateYearView();
      }
      
      this.loadUpcomingEvents();
    }
  }

  closeModal() {
    this.modalService.dismissAll();
    this.activeModal = null;
    this.eventForm.reset();
  }

  // ============== Utility Functions ==============
  formatDate(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getEventIcon(type: string): string {
    const eventType = this.eventTypes.find(et => et.value === type);
    return eventType?.icon || '📅';
  }

  getEventColor(type: string): string {
    const eventType = this.eventTypes.find(et => et.value === type);
    return eventType?.color || 'primary';
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getMonthName(month: number): string {
    return this.monthNames[month];
  }

  // FIXED: Safe access to profile image
  getProfileImage(event: CelebrationEvent): string {
    if (event.profileImage) {
      return event.profileImage;
    }
    // Fallback to avatar generator
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(event.employeeName || 'User')}&background=2c7a7b&color=fff`;
  }

  trackByEventId(index: number, event: CelebrationEvent): string {
    return event.id;
  }

  trackByDate(index: number, day: CalendarDay): string {
    return day.date.toISOString();
  }
}