import { Component, OnInit, ViewChild } from '@angular/core';
import { EventSettingsModalComponent } from './event-settings-modal/event-settings-modal.component';
import { EventSettingsService, EventSetting, ApiResponse } from '../../services/event-settings.service';

@Component({
  selector: 'app-event-settings',
  templateUrl: './event-settings.component.html',
  styleUrls: ['./event-settings.component.css']
})
export class EventSettingsComponent implements OnInit {
  @ViewChild('eventModal') eventModal!: EventSettingsModalComponent;
  
  events: EventSetting[] = [];
  filteredEvents: EventSetting[] = [];
  searchTerm: string = '';
  isEditMode: boolean = false;
  selectedEvent: EventSetting | null = null;
  hasUnsavedChanges: boolean = false;
  
  isLoading: boolean = false;
  isSaving: boolean = false;
  
  currentPage: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;
  totalPages: number = 1;

  toastMessage: string = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  showToast: boolean = false;
  private toastTimeout: any;

  constructor(private eventSettingsService: EventSettingsService) {}

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(page: number = 1): void {
    this.isLoading = true;
    
    this.eventSettingsService.getSettings(page, this.pageSize).subscribe({
      next: (response: ApiResponse<EventSetting[]>) => {
        if (response.success) {
          this.events = response.data.map((item: any) => ({
            eventType: item.eventType,
            isRecurringSupported: item.isRecurringSupported || false,
            passiveStartDays: item.passiveStartDays || 0,
            passiveEndDays: item.passiveEndDays || 0,
            description: item.description,
            defaultStartTime: '09:00',
            defaultEndTime: '17:00',
            isActive: true
          }));
          
          if (response.pagination) {
            this.totalItems = response.pagination.totalCount;
            this.totalPages = response.pagination.totalPages;
            this.currentPage = response.pagination.page;
          }
          
          this.filterEvents();
          this.showToastMessage(response.message || 'Settings loaded successfully', 'success');
        } else {
          this.showToastMessage(response.message || 'Failed to load settings', 'error');
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading settings:', error);
        const errorMsg = error.error?.message || error.message || 'Failed to load event settings';
        this.showToastMessage(errorMsg, 'error');
        this.isLoading = false;
      }
    });
  }

  filterEvents(): void {
    if (!this.searchTerm.trim()) {
      this.filteredEvents = [...this.events];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredEvents = this.events.filter(event => 
        event.eventType.toLowerCase().includes(term)
      );
    }
  }

  getEventIcon(eventType: string): string {
    return this.eventSettingsService.getEventIcon(eventType);
  }

  getEventColor(eventType: string): string {
    return this.eventSettingsService.getEventColor(eventType);
  }

  openAddModal(): void {
    this.isEditMode = false;
    this.selectedEvent = null;
    this.eventModal.openModal();
  }

  openEditModal(event: EventSetting): void {
    this.isEditMode = true;
    this.selectedEvent = { ...event };
    this.eventModal.openModal();
  }

  handleEventSave(eventData: any): void {
    this.isSaving = true;
    
    if (this.isEditMode && this.selectedEvent) {
      // Update existing setting
      this.eventSettingsService.updateSetting(this.selectedEvent.eventType, {
        isRecurringSupported: eventData.isRecurring,
        passiveStartDays: eventData.passiveStartDays,
        passiveEndDays: eventData.passiveEndDays
      }).subscribe({
        next: (response: ApiResponse<any>) => {
          if (response.success) {
            this.showToastMessage(response.message || 'Event setting updated successfully', 'success');
            this.loadSettings(this.currentPage);
            this.eventModal.closeModal();
          } else {
            this.showToastMessage(response.message || 'Update failed', 'error');
          }
          this.isSaving = false;
        },
        error: (error) => {
          console.error('Error updating setting:', error);
          const errorMsg = error.error?.message || error.message || 'Failed to update setting';
          this.showToastMessage(errorMsg, 'error');
          this.isSaving = false;
        }
      });
    } else {
      // Create new setting
      this.eventSettingsService.createSetting({
        eventType: eventData.type,
        isRecurringSupported: eventData.isRecurring,
        passiveStartDays: eventData.passiveStartDays,
        passiveEndDays: eventData.passiveEndDays
      }).subscribe({
        next: (response: ApiResponse<any>) => {
          if (response.success) {
            this.showToastMessage(response.message || 'Event setting created successfully', 'success');
            this.loadSettings(1);
            this.eventModal.closeModal();
          } else {
            this.showToastMessage(response.message || 'Creation failed', 'error');
          }
          this.isSaving = false;
        },
        error: (error) => {
          console.error('Error creating setting:', error);
          const errorMsg = error.error?.message || error.message || 'Failed to create setting';
          this.showToastMessage(errorMsg, 'error');
          this.isSaving = false;
        }
      });
    }
  }

  toggleEventStatus(event: EventSetting): void {
    event.isActive = !event.isActive;
    this.hasUnsavedChanges = true;
    this.showToastMessage(
      `Event ${event.eventType} ${event.isActive ? 'activated' : 'deactivated'}`,
      'info'
    );
  }

  deleteEvent(eventType: string): void {
    if (confirm('Are you sure you want to delete this event type?')) {
      this.eventSettingsService.deleteSetting(eventType).subscribe({
        next: (response: ApiResponse<any>) => {
          if (response.success) {
            this.showToastMessage(response.message || 'Event setting deleted successfully', 'success');
            this.loadSettings(this.currentPage);
          } else {
            this.showToastMessage(response.message || 'Delete failed', 'error');
          }
        },
        error: (error) => {
          console.error('Error deleting setting:', error);
          const errorMsg = error.error?.message || error.message || 'Failed to delete setting';
          this.showToastMessage(errorMsg, 'error');
        }
      });
    }
  }

  saveAllChanges(): void {
    localStorage.setItem('event_settings_status', JSON.stringify(
      this.events.map(e => ({ eventType: e.eventType, isActive: e.isActive }))
    ));
    this.hasUnsavedChanges = false;
    this.showToastMessage('Changes saved successfully', 'success');
  }

  discardChanges(): void {
    if (confirm('Discard all unsaved changes?')) {
      this.loadSettings(this.currentPage);
      this.hasUnsavedChanges = false;
    }
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadSettings(page);
    }
  }

  showToastMessage(message: string, type: 'success' | 'error' | 'info'): void {
    // Clear any existing timeout
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    
    // Auto-hide after 5 seconds
    this.toastTimeout = setTimeout(() => {
      this.showToast = false;
      this.toastTimeout = null;
    }, 5000);
  }

  hideToast(): void {
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
      this.toastTimeout = null;
    }
    this.showToast = false;
  }
}