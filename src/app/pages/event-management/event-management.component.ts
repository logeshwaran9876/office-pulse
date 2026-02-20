import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { Event as AppEvent, EventTheme, EventAnalytics } from '../../models/event.model';
import { EventManagementService, EventSetting } from '../../services/event-management.service';
import { EmployeeforEvent } from '../../models/employee.model';

interface ThemeOption {
  id: string;
  name: string;
  class: string;
  styles: {
    background: string;
    color: string;
  };
}

interface EventFilters {
  search: string;
  category: string;
  priority: string;
  status: string;
  dateRange: {
    start: string;
    end: string;
  };
}

interface CustomThemeModel {
  name: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
}

type EventFormModel = Partial<AppEvent> & {
  themeClass?: string;
  eventDate?: string; // Single date picker for the actual event
};

@Component({
  selector: 'app-event-management',
  templateUrl: './event-management.component.html',
  styleUrls: ['./event-management.component.css']
})
export class EventManagementComponent implements OnInit, OnDestroy {
  events: AppEvent[] = [];
  analytics: EventAnalytics = {
    total: 0,
    active: 0,
    scheduled: 0,
    expired: 0,
    byCategory: {},
    upcomingEvents: 0
  };

  isLoading = true;
  selectedView: 'cards' | 'table' = 'cards';
  
  // Event Settings from API
  eventSettings: EventSetting[] = [];
  categories: string[] = [];
  
  priorities = ['Normal', 'Important', 'Urgent'];
  filters: EventFilters = {
    search: '',
    category: '',
    priority: '',
    status: '',
    dateRange: { start: '', end: '' }
  };

  form: EventFormModel = this.getEmptyForm();
  showForm = false;
  editMode = false;
  isSubmitting = false;

  // Selected event setting for the current form
  selectedEventSetting: EventSetting | null = null;

  themes: ThemeOption[] = [];
  eventThemes: EventTheme[] = [];
  showThemeSelector = false;
  themeSelectionMode: 'default' | 'custom' = 'default';
  themeSelectorEventType = '';
  isLoadingThemes = false;
  selectedEventTheme: EventTheme | null = null;

  customTheme: CustomThemeModel = {
    name: '',
    backgroundColor: '#ffffff',
    textColor: '#000000',
    accentColor: '#0d6efd'
  };
  customThemePreview: string | null = null;
  customThemeFile: File | null = null;

  showThemeBuilder = false;
  showPreview = false;
  selectedEvent: AppEvent | null = null;

  showDeleteModal = false;
  eventToDeleteId: string | null = null;

  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  showToast = false;
  private toastTimeoutId?: ReturnType<typeof setTimeout>;

  private subscriptions: Subscription[] = [];

  currentPage = 1;
  itemsPerPage = 6;
  totalPages = 1;

  emp: EmployeeforEvent[] = [];

  constructor(private eventService: EventManagementService) {}

  ngOnInit(): void {
    this.themes = (this.eventService.getThemes() as ThemeOption[]) || [];
    
    // Load event settings first
    this.loadEventSettings();
    
    this.subscriptions.push(
      this.eventService.getEvents().subscribe(events => {
        this.events = events || [];
        this.isLoading = false;
        this.currentPage = 1;
        this.updatePagination(this.applyFilters(this.events).length);
      })
    );

    this.subscriptions.push(
      this.eventService.getAnalytics().subscribe(analytics => {
        this.analytics = analytics;
      })
    );

    this.loadEmployees();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.toastTimeoutId) {
      clearTimeout(this.toastTimeoutId);
    }
  }

  /**
   * Load event settings from API
   */
  loadEventSettings(): void {
    this.eventService.getEventSettings().subscribe({
      next: (settings) => {
        this.eventSettings = settings;
        this.categories = settings.map(s => s.eventType);
      },
      error: (error) => {
        console.error('Error loading event settings:', error);
        this.showToastMessage('Failed to load event types', 'error');
      }
    });
  }
// Add this method to calculate duration
calculateDuration(startDate: string, endDate: string): number {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}
  /**
   * Handle event type change
   */
  onEventTypeChange(eventType: string): void {
    // Find the selected event setting
    this.selectedEventSetting = this.eventSettings.find(s => s.eventType === eventType) || null;
    
    // Clear event date when event type changes
    this.form.eventDate = '';
    
    // Clear calculated dates
    this.form.activeFrom = '';
    this.form.activeTo = '';
    
    if (this.selectedEventSetting) {
      this.showToastMessage(
        `Selected: ${eventType}. Event will start ${this.selectedEventSetting.passiveStartDays} days before and end ${this.selectedEventSetting.passiveEndDays} days after.`,
        'info'
      );
    }
  }

  /**
   * Handle event date change - automatically calculate activeFrom and activeTo
   */
  onEventDateChange(eventDate: string): void {
    if (!eventDate || !this.selectedEventSetting) {
      return;
    }

    const date = new Date(eventDate);
    
    // Calculate start date (eventDate - passiveStartDays)
    const startDate = new Date(date);
    startDate.setDate(date.getDate() - this.selectedEventSetting.passiveStartDays);
    
    // Calculate end date (eventDate + passiveEndDays)
    const endDate = new Date(date);
    endDate.setDate(date.getDate() + this.selectedEventSetting.passiveEndDays);
    
    // Format to YYYY-MM-DD for input
    this.form.activeFrom = this.formatDateForInput(startDate);
    this.form.activeTo = this.formatDateForInput(endDate);
    
    // Also store the event date for reference
    this.form.eventDate = eventDate;
  }

  /**
   * Format date to YYYY-MM-DD for input
   */
  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  filteredEvents(): AppEvent[] {
    const filtered = this.applyFilters(this.events);
    this.updatePagination(filtered.length);
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return filtered.slice(start, start + this.itemsPerPage);
  }

  clearFilters(): void {
    this.filters = {
      search: '',
      category: '',
      priority: '',
      status: '',
      dateRange: { start: '', end: '' }
    };
    this.currentPage = 1;
  }

  changePage(page: number): void {
    if (page < 1) {
      page = 1;
    }
    if (page > this.totalPages) {
      page = this.totalPages;
    }
    this.currentPage = page;
  }

  getActiveTodayCount(): number {
    return this.eventService.getEventsActiveToday().length;
  }

  getUpcomingCount(): number {
    return this.eventService.getUpcomingEventsList().length;
  }

  getCategoryCount(): number {
    return this.categories.length;
  }

  getThemeStyles(event: AppEvent): Record<string, string> {
    if (!event?.theme) {
      return {};
    }
    const match = this.themes.find(item => item.class === event.theme || item.id === event.theme);
    return match?.styles || {};
  }

  getThemeClass(event: AppEvent): string {
    return event?.theme || 'theme-default';
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'Urgent':
        return 'badge bg-danger';
      case 'Important':
        return 'badge bg-warning text-dark';
      default:
        return 'badge bg-secondary';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Active':
        return 'badge bg-success';
      case 'Scheduled':
        return 'badge bg-info text-dark';
      case 'Expired':
        return 'badge bg-danger';
      default:
        return 'badge bg-secondary';
    }
  }

  isEventExpiringSoon(event: AppEvent): boolean {
    if (!event || !event.activeTo) {
      return false;
    }
    const now = new Date();
    const end = new Date(event.activeTo);
    const diff = end.getTime() - now.getTime();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    return diff > 0 && diff <= threeDaysMs;
  }

  getFullImageUrl(relativeUrl: string | undefined): string {
    if (!relativeUrl) {
      return '';
    }
    if (relativeUrl.startsWith('http')) {
      return relativeUrl;
    }
    const baseUrl = 'http://localhost:7000';
    const normalized = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`;
    return `${baseUrl}${normalized}`;
  }

  handleImageError(evt: Event): void {
    const target = evt.target as HTMLImageElement;
    target.src =
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150">' +
      '<rect width="200" height="150" fill="%23f0f0f0"/><text x="50%" y="50%" dominant-baseline="middle" ' +
      'text-anchor="middle" fill="%23999" font-size="14">Image unavailable</text></svg>';
  }

  openForm(): void {
    this.form = this.getEmptyForm();
    this.editMode = false;
    this.showForm = true;
    this.selectedEventSetting = null;
  }

  closeForm(): void {
    this.showForm = false;
    this.editMode = false;
    this.isSubmitting = false;
    this.form = this.getEmptyForm();
    this.selectedEventSetting = null;
  }

  editEvent(event: AppEvent): void {
    // For edit mode, we need to find the original event setting
    const setting = this.eventSettings.find(s => s.eventType === event.eventType);
    this.selectedEventSetting = setting || null;
    
    // Calculate event date from activeFrom if possible (reverse of passive days)
    let eventDate = '';
    if (setting && event.activeFrom) {
      const startDate = new Date(event.activeFrom);
      startDate.setDate(startDate.getDate() + setting.passiveStartDays);
      eventDate = this.formatDateForInput(startDate);
    }

    this.form = {
      ...event,
      themeClass: event.theme || 'theme-default',
      activeFrom: this.formatForInput(event.activeFrom),
      activeTo: this.formatForInput(event.activeTo),
      eventDate: eventDate || this.formatForInput(event.activeFrom)
    };
    this.showForm = true;
    this.editMode = true;
  }

  saveEvent(): void {
    if (!this.form.title || !this.form.eventType || !this.form.eventDate) {
      this.showToastMessage('Title, Event Type, and Event Date are required', 'error');
      return;
    }

    this.isSubmitting = true;
    const payload = this.makeEventPayload();
    const request$ = this.editMode && this.form.uId
      ? this.eventService.updateEvent(this.form.uId, payload)
      : this.eventService.createEvent(payload);

    request$.pipe(finalize(() => (this.isSubmitting = false))).subscribe({
      next: () => {
        this.showToastMessage(this.editMode ? 'Event updated' : 'Event created', 'success');
        this.closeForm();
      },
      error: () => {
        this.showToastMessage('Unable to save event', 'error');
      }
    });
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.form.imageUrl = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  applyTheme(eventId: string | undefined, themeId: string): void {
    if (!eventId) {
      return;
    }
    const theme = this.themes.find(item => item.id === themeId);
    if (!theme) {
      return;
    }
    this.eventService.updateEvent(eventId, {
      theme: theme.class,
      themeFileName: theme.name
    } as AppEvent).subscribe({
      next: () => this.showToastMessage('Theme applied', 'success'),
      error: () => this.showToastMessage('Failed to apply theme', 'error')
    });
  }

  openThemeSelector(eventType?: string): void {
    if (!eventType?.trim()) {
      this.showToastMessage('Select an event type first', 'error');
      return;
    }
    this.themeSelectionMode = 'default';
    this.themeSelectorEventType = eventType;
    this.showThemeSelector = true;
    this.isLoadingThemes = true;
    this.selectedEventTheme = null;
    this.eventThemes = [];

    this.eventService.getThemesByEventType(eventType)
      .pipe(finalize(() => (this.isLoadingThemes = false)))
      .subscribe({
        next: themes => (this.eventThemes = themes),
        error: () => this.showToastMessage('Unable to load themes', 'error')
      });
  }

  removeSelectedTheme(): void {
    this.form.theme = '';
    this.form.themeFileName = '';
    this.form.themeClass = 'theme-default';
  }

  selectEventTheme(theme: EventTheme): void {
    this.selectedEventTheme = theme;
  }

  confirmThemeSelection(): void {
    if (!this.selectedEventTheme) {
      return;
    }
    this.form.theme = this.selectedEventTheme.previewUrl || this.selectedEventTheme.imageUrl;
    this.form.themeFileName = this.selectedEventTheme.themeFileName;
    this.form.themeClass = 'theme-custom';
    this.cancelThemeSelection();
  }

  cancelThemeSelection(): void {
    this.showThemeSelector = false;
    this.themeSelectionMode = 'default';
    this.selectedEventTheme = null;
    this.eventThemes = [];
    this.customThemePreview = null;
    this.customThemeFile = null;
  }

  switchToCustomTheme(): void {
    this.themeSelectionMode = 'custom';
    this.selectedEventTheme = null;
    this.customThemePreview = null;
    this.customThemeFile = null;
  }

  onCustomThemeSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.customThemeFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.customThemePreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  uploadCustomTheme(): void {
    if (!this.customThemePreview) {
      return;
    }
    this.form.theme = this.customThemePreview;
    this.form.themeFileName = this.customThemeFile?.name || 'Custom Theme';
    this.form.themeClass = 'theme-custom';
    this.cancelThemeSelection();
  }

  openThemeBuilder(): void {
    this.showThemeBuilder = true;
  }

  closeThemeBuilder(): void {
    this.showThemeBuilder = false;
  }

  saveCustomTheme(): void {
    if (!this.customTheme.name.trim()) {
      this.showToastMessage('Please enter a name for the custom theme', 'error');
      return;
    }
    const preview = this.createCustomThemePreviewSvg(this.customTheme);
    this.form.theme = preview;
    this.form.themeFileName = this.customTheme.name;
    this.form.themeClass = 'theme-custom';
    this.showThemeBuilder = false;
    this.showToastMessage('Custom theme saved locally', 'info');
  }

  previewEvent(event: AppEvent): void {
    this.selectedEvent = event;
    this.showPreview = true;
  }

  closePreview(): void {
    this.showPreview = false;
    this.selectedEvent = null;
  }

  openDeleteModal(eventId: string | undefined): void {
    if (!eventId) {
      return;
    }
    this.eventToDeleteId = eventId;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.eventToDeleteId = null;
    this.showDeleteModal = false;
  }

  confirmDelete(): void {
    if (!this.eventToDeleteId) {
      return;
    }
    this.eventService.deleteEvent(this.eventToDeleteId).subscribe({
      next: () => {
        this.showToastMessage('Event deleted', 'success');
        this.closeDeleteModal();
      },
      error: () => this.showToastMessage('Unable to delete event', 'error')
    });
  }

  showToastMessage(message: string, type: 'success' | 'error' | 'info'): void {
    if (this.toastTimeoutId) {
      clearTimeout(this.toastTimeoutId);
    }
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    this.toastTimeoutId = setTimeout(() => (this.showToast = false), 3500);
  }

  hideToast(): void {
    this.showToast = false;
    if (this.toastTimeoutId) {
      clearTimeout(this.toastTimeoutId);
      this.toastTimeoutId = undefined;
    }
  }

  private loadEmployees(): void {
    this.subscriptions.push(
      this.eventService.getEmployees().subscribe({
        next: employees => {
          this.emp = employees || [];
        },
        error: () => this.showToastMessage('Unable to load employees', 'error')
      })
    );
  }

  private applyFilters(data: AppEvent[]): AppEvent[] {
    const searchTerm = this.filters.search.trim().toLowerCase();
    const startDate = this.filters.dateRange.start ? new Date(this.filters.dateRange.start) : null;
    const endDate = this.filters.dateRange.end ? new Date(this.filters.dateRange.end) : null;
    if (startDate) {
      startDate.setHours(0, 0, 0, 0);
    }
    if (endDate) {
      endDate.setHours(23, 59, 59, 999);
    }

    return data.filter(item => {
      if (searchTerm) {
        const haystack = [item.title, item.description, item.eventType, item.facilities]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(searchTerm)) {
          return false;
        }
      }
      if (this.filters.category && item.eventType !== this.filters.category) {
        return false;
      }
      if (this.filters.priority && item.priority !== this.filters.priority) {
        return false;
      }
      if (this.filters.status && item.status !== this.filters.status) {
        return false;
      }
      const itemStart = item.activeFrom ? new Date(item.activeFrom) : null;
      const itemEnd = item.activeTo ? new Date(item.activeTo) : null;
      if (startDate && itemStart && itemStart < startDate) {
        return false;
      }
      if (endDate && itemEnd && itemEnd > endDate) {
        return false;
      }
      return true;
    });
  }

  private updatePagination(totalItems: number): void {
    this.totalPages = totalItems === 0 ? 1 : Math.ceil(totalItems / this.itemsPerPage);
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }
  }

  private getEmptyForm(): EventFormModel {
    const today = this.getTodayString();
    return {
      title: '',
      description: '',
      eventType: '',
      facilities: '',
      employeeUId: '',
      priority: 'Normal',
      eventDate: today,
      activeFrom: today,
      activeTo: today,
      theme: '',
      themeFileName: '',
      imageUrl: '',
      themeClass: 'theme-default'
    };
  }

  private getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }

  private formatForInput(value?: string | Date): string {
    if (!value) {
      return this.getTodayString();
    }
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return this.getTodayString();
    }
    return date.toISOString().split('T')[0];
  }

  private makeEventPayload(): AppEvent {
    // Ensure dates are calculated
    if (this.form.eventDate && this.selectedEventSetting && (!this.form.activeFrom || !this.form.activeTo)) {
      this.onEventDateChange(this.form.eventDate);
    }

    return {
      title: (this.form.title || '').trim(),
      description: this.form.description || '',
      eventType: this.form.eventType || '',
      category: this.form.eventType || '',
      facilities: this.form.facilities || '',
      priority: (this.form.priority || 'Normal') as AppEvent['priority'],
      activeFrom: this.form.activeFrom || this.getTodayString(),
      activeTo: this.form.activeTo || this.getTodayString(),
      imageUrl: this.form.imageUrl,
      theme: this.getNormalizedTheme(this.form.theme || this.form.themeClass || 'theme-default'),
      themeFileName: this.form.themeFileName,
      employeeUId: this.form.employeeUId
    };
  }

  private getNormalizedTheme(value?: string): string {
    if (!value) {
      return '';
    }

    const trimmed = value.trim();
    const localhostPrefix = 'http://localhost:7000';
    if (trimmed.startsWith(localhostPrefix)) {
      return trimmed.slice(localhostPrefix.length);
    }

    return trimmed;
  }

  private createCustomThemePreviewSvg(theme: CustomThemeModel): string {
    const svg = `<svg width="360" height="180" xmlns="http://www.w3.org/2000/svg">` +
      `<defs><linearGradient id="customGradient" x1="0%" y1="0%" x2="100%" y2="100%">` +
      `<stop offset="0%" stop-color="${theme.backgroundColor}"/>` +
      `<stop offset="100%" stop-color="${theme.accentColor}"/>` +
      `</linearGradient></defs>` +
      `<rect width="360" height="180" fill="url(#customGradient)"/>` +
      `<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="20" fill="${theme.textColor}">` +
      `${theme.name}</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }
}