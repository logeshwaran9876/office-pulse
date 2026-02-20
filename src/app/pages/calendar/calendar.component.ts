import { Component, OnInit, inject, signal, ViewChild, TemplateRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbModal, NgbDropdownModule, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  takeUntil,
  finalize
} from 'rxjs/operators';


// Services
import { CalendarApiService } from '../../services/calendar.service';

// Models
import { CelebrationEvent, CalendarView, CalendarDay, YearMonth, EventType } from '../../models/calendar.model';



@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgbDropdownModule,
    RouterLink
  ],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css']
})
export class CalendarComponent implements OnInit, OnDestroy {
  private calendarApi = inject(CalendarApiService);
  private modalService = inject(NgbModal);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  @ViewChild('eventModal') eventModal!: TemplateRef<any>;
  @ViewChild('eventDetailModal') eventDetailModal!: TemplateRef<any>;
  @ViewChild('dayEventsModal') dayEventsModal!: TemplateRef<any>;

  // Loading States
  isLoadingMonth = false;
  isLoadingUpcoming = false;
  isLoadingDay = false;
  isSearching = false;
showAllUpcoming = false;

  // Calendar State
  currentDate = new Date();
  currentMonth = new Date().getMonth();
  currentYear = new Date().getFullYear();
  currentView: CalendarView = 'month';
  calendarDays: CalendarDay[] = [];
  yearMonths: YearMonth[] = [];
  weekDays: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  monthNames: string[] = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Month indexes for iteration
  monthIndexes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  // Events Data
  private allEvents = signal<CelebrationEvent[]>([]);
  filteredEvents = signal<CelebrationEvent[]>([]);
  upcomingEvents = signal<CelebrationEvent[]>([]);
  selectedDate = signal<Date | undefined>(undefined);
  selectedEvent = signal<CelebrationEvent | null>(null);
  selectedDayEvents = signal<CelebrationEvent[]>([]);

  // Filters
  searchTerm = '';
  selectedFilterTypes: string[] = [];
  private searchSubject = new Subject<string>();
  private filterSubject = new Subject<string>();

  // Event Types
  eventTypes: EventType[] = [
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

    // Setup search debounce
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => {
        if (!term.trim()) {
          this.loadMonthEvents();
          return [];
        }
        this.isSearching = true;
        return this.calendarApi.searchEvents(term).pipe(
          finalize(() => this.isSearching = false)
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(events => {
      this.allEvents.set(events);
      this.filteredEvents.set(events);
      this.refreshCurrentView();
      this.loadUpcomingEvents();
    });

    // Setup filter debounce
    this.filterSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(type => {
        this.isSearching = true;
        if (!type) {
          this.loadMonthEvents();
          return [];
        }
        return this.calendarApi.filterEvents(type).pipe(
          finalize(() => this.isSearching = false)
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(events => {
      if (events && events.length > 0) {
        this.allEvents.set(events);
        this.filteredEvents.set(events);
        this.refreshCurrentView();
        this.loadUpcomingEvents();
      }
    });
  }

  ngOnInit(): void {
    this.loadMonthEvents();
    this.loadUpcomingEvents();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============== API Calls ==============

  loadMonthEvents(): void {
    this.isLoadingMonth = true;
    
    this.calendarApi.getMonthEvents(this.currentMonth + 1, this.currentYear)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoadingMonth = false)
      )
      .subscribe({
        next: (events) => {
          this.allEvents.set(events);
          this.filteredEvents.set(events);
          this.generateCalendar();
        },
        error: (error) => {
          console.error('Error loading month events:', error);
          this.allEvents.set([]);
          this.filteredEvents.set([]);
          this.generateCalendar();
        }
      });
  }

  loadUpcomingEvents(): void {
    this.isLoadingUpcoming = true;
    
    this.calendarApi.getUpcomingEvents(10)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoadingUpcoming = false)
      )
      .subscribe({
        next: (events) => {
          this.upcomingEvents.set(events);
        },
        error: (error) => {
          console.error('Error loading upcoming events:', error);
          this.upcomingEvents.set([]);
        }
      });
  }

  loadDayEvents(date: Date): void {
    this.isLoadingDay = true;
    
    this.calendarApi.getDayEvents(date)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoadingDay = false)
      )
      .subscribe({
        next: (events) => {
          this.selectedDayEvents.set(events);
          
          // Update events for this day in the calendar
          this.updateEventsForDate(date, events);
        },
        error: (error) => {
          console.error('Error loading day events:', error);
          this.selectedDayEvents.set([]);
        }
      });
  }

  // ============== Filter Methods ==============

  /**
   * Apply all active filters to events
   */
  applyFilters(): void {
    let filtered = this.allEvents();

    // Apply search filter
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(term) ||
        (event.employeeName?.toLowerCase().includes(term) ?? false) ||
        (event.department?.toLowerCase().includes(term) ?? false) ||
        (event.description?.toLowerCase().includes(term) ?? false)
      );
    }

    // Apply type filters
    if (this.selectedFilterTypes.length > 0) {
      filtered = filtered.filter(event => 
        this.selectedFilterTypes.includes(event.type)
      );
    }

    this.filteredEvents.set(filtered);
    this.refreshCurrentView();
    this.loadUpcomingEvents();
  }

  /**
   * Handle search input
   */
  onSearchInput(): void {
    if (this.searchTerm.trim()) {
      // Use debounced search for API calls
      this.searchSubject.next(this.searchTerm);
    } else {
      // If search is cleared, reload from API
      this.loadMonthEvents();
    }
  }

  /**
   * Toggle filter type
   */
  toggleFilter(type: string): void {
    const index = this.selectedFilterTypes.indexOf(type);
    if (index === -1) {
      this.selectedFilterTypes.push(type);
    } else {
      this.selectedFilterTypes.splice(index, 1);
    }
    
    // Apply filters locally
    this.applyFilters();
    
    // Also trigger API filter if only one type is selected
    if (this.selectedFilterTypes.length === 1) {
      this.filterSubject.next(this.selectedFilterTypes[0]);
    } else if (this.selectedFilterTypes.length === 0) {
      this.filterSubject.next('');
    }
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.searchTerm = '';
    this.selectedFilterTypes = [];
    this.filteredEvents.set(this.allEvents());
    this.refreshCurrentView();
    this.loadUpcomingEvents();
    this.filterSubject.next('');
  }

  /**
   * Filter by specific type (for dropdown menu)
   */
  filterByType(type: string): void {
    if (!type) {
      this.clearFilters();
      return;
    }
    
    this.selectedFilterTypes = [type];
    this.applyFilters();
    this.filterSubject.next(type);
  }

  // ============== Calendar Generation ==============

  generateCalendar(): void {
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
    return this.filteredEvents().filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.toDateString() === date.toDateString();
    });
  }

  updateEventsForDate(date: Date, events: CelebrationEvent[]): void {
    // Update the events in the current filtered list
    const otherEvents = this.filteredEvents().filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.toDateString() !== date.toDateString();
    });
    
    this.filteredEvents.set([...otherEvents, ...events]);
    
    // Update the calendar days
    this.calendarDays = this.calendarDays.map(day => {
      if (day.date.toDateString() === date.toDateString()) {
        return { ...day, events };
      }
      return day;
    });
  }

  refreshCurrentView(): void {
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

  // ============== View Navigation ==============

  changeView(view: CalendarView): void {
    this.currentView = view;
    this.refreshCurrentView();
  }

  generateWeekView(): void {
    const startOfWeek = new Date(this.currentDate);
    startOfWeek.setDate(this.currentDate.getDate() - this.currentDate.getDay());
    
    const days: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push({
        day: date.getDate(),
        date,
        dayName: this.weekDays[date.getDay()],
        monthName: this.monthNames[date.getMonth()],
        year: date.getFullYear(),
        isCurrentMonth: date.getMonth() === this.currentMonth,
        isToday: this.isToday(date),
        events: this.getEventsForDate(date)
      });
    }
    
    this.calendarDays = days;
  }

  generateDayView(): void {
    const days: CalendarDay[] = [{
      day: this.currentDate.getDate(),
      date: this.currentDate,
      dayName: this.weekDays[this.currentDate.getDay()],
      monthName: this.monthNames[this.currentDate.getMonth()],
      year: this.currentDate.getFullYear(),
      isCurrentMonth: true,
      isToday: true,
      events: this.getEventsForDate(this.currentDate)
    }];
    this.calendarDays = days;
  }

  generateYearView(): void {
    const months: YearMonth[] = [];
    for (let month = 0; month < 12; month++) {
      months.push({
        month,
        monthName: this.monthNames[month],
        year: this.currentYear,
        events: this.filteredEvents().filter(event => {
          const eventDate = new Date(event.date);
          return eventDate.getMonth() === month && eventDate.getFullYear() === this.currentYear;
        })
      });
    }
    this.yearMonths = months;
  }

  previousPeriod(): void {
    if (this.currentView === 'month') {
      if (this.currentMonth === 0) {
        this.currentMonth = 11;
        this.currentYear--;
      } else {
        this.currentMonth--;
      }
      this.currentDate = new Date(this.currentYear, this.currentMonth, 1);
      this.loadMonthEvents();
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

  nextPeriod(): void {
    if (this.currentView === 'month') {
      if (this.currentMonth === 11) {
        this.currentMonth = 0;
        this.currentYear++;
      } else {
        this.currentMonth++;
      }
      this.currentDate = new Date(this.currentYear, this.currentMonth, 1);
      this.loadMonthEvents();
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

  goToToday(): void {
    this.currentDate = new Date();
    this.currentMonth = this.currentDate.getMonth();
    this.currentYear = this.currentDate.getFullYear();
    
    if (this.currentView === 'month') {
      this.loadMonthEvents();
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

  // ============== Modal Operations ==============

  onDateClick(date: Date): void {
    this.loadDayEvents(date);
    
    const events = this.getEventsForDate(date);
    if (events.length > 1) {
      this.openDayEventsModal(this.dayEventsModal, date, events);
    } else if (events.length === 1) {
      this.openEventDetailModal(this.eventDetailModal, events[0]);
    } else {
      this.openAddEventModal(this.eventModal, date);
    }
  }

  openAddEventModal(content: TemplateRef<any>, date?: Date): void {
    this.isEditMode = false;
    this.selectedDate.set(date || new Date());
    this.eventForm.reset({
      date: this.formatDate(date || new Date()),
      color: 'primary'
    });
    this.activeModal = this.modalService.open(content, { size: 'lg', centered: true });
  }

  openEditEventModal(content: TemplateRef<any>, event: CelebrationEvent): void {
    this.isEditMode = true;
    this.selectedEvent.set(event);
    this.eventForm.patchValue({
      id: event.id,
      title: event.title,
      type: event.type,
      date: this.formatDate(new Date(event.date)),
      employeeId: event.employeeId,
      employeeName: event.employeeName,
      department: event.department,
      description: event.description,
      profileImage: event.profileImage,
      color: event.color || 'primary'
    });
    this.activeModal = this.modalService.open(content, { size: 'lg', centered: true });
  }

  openEventDetailModal(content: TemplateRef<any>, event: CelebrationEvent): void {
    this.selectedEvent.set(event);
    this.activeModal = this.modalService.open(content, { size: 'md', centered: true });
  }

  openDayEventsModal(content: TemplateRef<any>, date: Date, events: CelebrationEvent[]): void {
    this.selectedDate.set(date);
    this.selectedDayEvents.set(events);
    this.activeModal = this.modalService.open(content, { size: 'md', centered: true });
  }

  saveEvent(): void {
    if (this.eventForm.valid) {
      // In a real app, you'd call API to save
      // For now, just close modal
      this.modalService.dismissAll();
      this.activeModal = null;
      this.eventForm.reset();
      
      // Reload events to reflect changes
      this.loadMonthEvents();
      this.loadUpcomingEvents();
    }
  }

  deleteEvent(eventId: string): void {
    if (confirm('Are you sure you want to delete this event?')) {
      // In a real app, you'd call API to delete
      this.modalService.dismissAll();
      this.activeModal = null;
      
      // Reload events
      this.loadMonthEvents();
      this.loadUpcomingEvents();
    }
  }

  closeModal(): void {
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

  getProfileImage(event: CelebrationEvent): string {
    if (event.profileImage) {
      return event.profileImage;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(event.employeeName || 'User')}&background=2c7a7b&color=fff`;
  }

  // ============== TrackBy Functions ==============

  trackByEventId(index: number, event: CelebrationEvent): string {
    return event.id;
  }

  trackByDate(index: number, day: CalendarDay): string {
    return day.date.toISOString();
  }

  trackByEventType(index: number, type: EventType): string {
    return type.value;
  }

  // ============== Safe Getters ==============

  getYearMonth(month: number): YearMonth {
    return this.yearMonths[month] || {
      month,
      monthName: this.monthNames[month],
      year: this.currentYear,
      events: []
    };
  }
}