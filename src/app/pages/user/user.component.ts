import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { UserService, EventData, EmployeeData, EventWithEmployee } from '../../services/user.service';

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.css']
})
export class UserComponent implements OnInit, OnDestroy {
  events: EventWithEmployee[] = [];
  currentSlideIndex = 0;
  
  // Loading states
  isLoading = false;
  isLoadingMore = false;
  
  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalEvents = 0;
  totalPages = 1;
  
  // Error handling
  errorMessage: string | null = null;
  
  // Auto-slide
  private autoSlideInterval: any;
  private destroy$ = new Subject<void>();

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadEvents();
  }

  /**
   * Load events with employee details from API
   */
  loadEvents(page: number = 1): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.userService.getEventsWithEmployees(page, this.pageSize)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          this.isLoadingMore = false;
        })
      )
      .subscribe({
        next: (events) => {
          if (page === 1) {
            this.events = events;
          } else {
            this.events = [...this.events, ...events];
          }
          
          // Update pagination info
          this.totalEvents = events.length;
          this.totalPages = Math.ceil(this.totalEvents / this.pageSize);
          this.currentPage = page;
          
          // Start auto-slide only after first page loads and we have events
          if (page === 1 && this.events.length > 0) {
            this.startAutoSlide();
          }
        },
        error: (error) => {
          console.error('Error loading events:', error);
          this.errorMessage = 'Failed to load events. Please try again later.';
          this.events = [];
        }
      });
  }

  /**
   * Load more events
   */
  loadMoreEvents(): void {
    if (this.currentPage < this.totalPages && !this.isLoadingMore) {
      this.isLoadingMore = true;
      this.loadEvents(this.currentPage + 1);
    }
  }

  /**
   * Refresh events
   */
  refreshEvents(): void {
    this.stopAutoSlide();
    this.currentSlideIndex = 0;
    this.loadEvents(1);
  }

  /**
   * Start automatic slideshow
   */
  startAutoSlide(): void {
    if (this.autoSlideInterval) {
      clearInterval(this.autoSlideInterval);
    }
    
    this.autoSlideInterval = setInterval(() => {
      this.nextSlide();
    }, 5000);
  }

  /**
   * Stop auto slide
   */
  stopAutoSlide(): void {
    if (this.autoSlideInterval) {
      clearInterval(this.autoSlideInterval);
      this.autoSlideInterval = null;
    }
  }

  /**
   * Go to next slide
   */
  nextSlide(): void {
    if (this.events.length > 0) {
      this.currentSlideIndex = (this.currentSlideIndex + 1) % this.events.length;
    }
  }

  /**
   * Go to previous slide
   */
  prevSlide(): void {
    if (this.events.length > 0) {
      this.currentSlideIndex = (this.currentSlideIndex - 1 + this.events.length) % this.events.length;
    }
  }

  /**
   * Go to specific slide
   */
  goToSlide(index: number): void {
    if (index >= 0 && index < this.events.length) {
      this.currentSlideIndex = index;
    }
  }

  /**
   * Handle image loading error
   */
  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/default-avatar.jpg';
  }

  /**
   * Get employee photo URL - FIXED to accept EmployeeData | null
   */
  getEmployeePhoto(employee: EmployeeData | null): string {
    if (!employee) return '';
    return this.userService.getEmployeePhoto(employee);
  }

  /**
   * Get employee initials - FIXED to accept EmployeeData | null
   */
  getEmployeeInitials(employee: EmployeeData | null): string {
    if (!employee) return '?';
    return this.userService.getEmployeeInitials(employee);
  }

  /**
   * Get employee full name - FIXED to accept EmployeeData | null
   */
  getEmployeeName(employee: EmployeeData | null): string {
    if (!employee) return '';
    return this.userService.getEmployeeFullName(employee);
  }

  /**
   * Get event type icon
   */
  getEventTypeIcon(eventType: string): string {
    const icons: { [key: string]: string } = {
      'Birthday': 'fas fa-birthday-cake',
      'Conference': 'fas fa-chalkboard-teacher',
      'Workshop': 'fas fa-tools',
      'Anniversary': 'fas fa-heart',
      'Meeting': 'fas fa-users',
      'Party': 'fas fa-glass-cheers',
      'Seminar': 'fas fa-microphone-alt',
      'Wedding': 'fas fa-ring',
      'CompanyEvent': 'fas fa-building',
      'Dinner': 'fas fa-utensils',
      'BestPerformer': 'fas fa-trophy',
       'Leave': 'bi-umbrella-fill',  // Add this
      'default': 'fas fa-calendar-alt'
    };
    
    return icons[eventType] || icons['default'];
  }

  /**
   * Get event type badge color class
   */
  getEventTypeClass(eventType: string): string {
    const classes: { [key: string]: string } = {
      'Birthday': 'badge-birthday',
      'Conference': 'badge-conference',
      'Workshop': 'badge-workshop',
      'Anniversary': 'badge-anniversary',
      'Meeting': 'badge-meeting',
      'Party': 'badge-party',
      'Seminar': 'badge-seminar',
      'Wedding': 'badge-wedding',
      'CompanyEvent': 'badge-company',
      'Dinner': 'badge-dinner',
      'BestPerformer': 'badge-performer',
      'default': 'badge-default'
    };
    
    return classes[eventType] || classes['default'];
  }

  /**
   * Split facilities string into array
   */
  getFacilitiesList(facilities: string): string[] {
    if (!facilities || facilities === 'string') return [];
    return facilities.split(',').map(f => f.trim());
  }

  /**
   * Check if event is live/active now
   */
  isEventLive(event: EventWithEmployee): boolean {
    const now = new Date();
    const start = new Date(event.activeFrom);
    const end = new Date(event.activeTo);
    return now >= start && now <= end;
  }

  /**
   * Get time remaining until event starts/ends
   */
  getTimeRemaining(event: EventWithEmployee): string {
    const now = new Date();
    const start = new Date(event.activeFrom);
    const end = new Date(event.activeTo);
    
    if (now < start) {
      const diff = start.getTime() - now.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (days > 0) {
        return `Starts in ${days} day${days > 1 ? 's' : ''}`;
      } else if (hours > 0) {
        return `Starts in ${hours} hour${hours > 1 ? 's' : ''}`;
      } else {
        return 'Starting soon';
      }
    } else if (now > end) {
      return 'Event ended';
    } else {
      const diff = end.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) {
        return `${hours}h ${minutes}m remaining`;
      } else {
        return `${minutes}m remaining`;
      }
    }
  }

  /**
   * Get avatar color based on UID
   */
  getAvatarColor(uid: string): string {
    if (!uid) return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    
    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)'
    ];
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < uid.length; i++) {
      hash = ((hash << 5) - hash) + uid.charCodeAt(i);
      hash |= 0;
    }
    
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }

  /**
   * Format date for display
   */


  /**
   * Get full image URL using service
   */
  getFullImageUrl(url: string): string {
    return this.userService.getFullImageUrl(url);
  }



// Leave type mapping
getLeaveType(leaveType: string): string {
  const leaveTypes: { [key: string]: string } = {
    'Annual': 'Annual Leave',
    'Sick': 'Sick Leave',
    'Personal': 'Personal Leave',
    'Maternity': 'Maternity Leave',
    'Paternity': 'Paternity Leave',
    'Unpaid': 'Unpaid Leave',
    'Bereavement': 'Bereavement Leave',
    'Study': 'Study Leave',
    'default': 'Leave'
  };
  return leaveTypes[leaveType] || leaveTypes['default'];
}

// Calculate leave duration
getLeaveDuration(event: any): number {
  if (event.leaveFrom && event.leaveTo) {
    const from = new Date(event.leaveFrom);
    const to = new Date(event.leaveTo);
    const diffTime = Math.abs(to.getTime() - from.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  }
  return 1; // Default to 1 day if dates not provided
}

// Get leave balance percentage
getLeaveBalancePercentage(event: any): number {
  if (event.leaveBalance && event.leaveTotal) {
    return (event.leaveBalance / event.leaveTotal) * 100;
  }
  return 50; // Default 50%
}

// Handover person details
getHandoverName(event: any): string {
  if (event.handoverTo) {
    if (typeof event.handoverTo === 'object') {
      return event.handoverTo.name || 'Colleague';
    }
    return event.handoverTo;
  }
  return 'Not Assigned';
}

getHandoverInitials(event: any): string {
  if (event.handoverTo && typeof event.handoverTo === 'object' && event.handoverTo.name) {
    return event.handoverTo.name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
  }
  return 'H';
}

getHandoverPhoto(event: any): string | null {
  if (event.handoverTo && typeof event.handoverTo === 'object' && event.handoverTo.photo) {
    return event.handoverTo.photo;
  }
  return null;
}

// Format date helper (add this if not already present)
formatDate(date: string | Date): string {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
}










  /**
   * Clean up on component destroy
   */
  ngOnDestroy(): void {
    this.stopAutoSlide();
    this.destroy$.next();
    this.destroy$.complete();
  }
}