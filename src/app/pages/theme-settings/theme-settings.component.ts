import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, finalize, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ThemeSettingsService, EventSetting, Theme, UploadThemePayload } from '../../services/theme-settings.service';

interface EventTypeWithCount extends EventSetting {
  count?: number;
  isActive?: boolean;
  icon?: string;
}

@Component({
  selector: 'app-theme-settings',
  templateUrl: './theme-settings.component.html',
  styleUrls: ['./theme-settings.component.css']
})
export class ThemeSettingsComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // Event Types
  eventTypes: EventTypeWithCount[] = [];
  selectedEventType: EventTypeWithCount | null = null;

  // Themes
  themes: Theme[] = [];
  totalThemes = 0;
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  // Upload Form
  uploadForm: FormGroup;
  selectedFile: File | null = null;
  fileBase64 = '';
  fileName = '';
  isFileReady = false;
  isConverting = false;
  conversionProgress = 0;

  // Loading States
  isLoadingEventTypes = false;
  isLoadingThemes = false;
  isUploading = false;
  isDeleting = false;

  // Toast
  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  toastVisible = false;
  private toastTimeout: any;

  // Confirmation Dialog
  showConfirmDialog = false;
  themeToDelete: Theme | null = null;
  deleteInProgress = false;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private themeService: ThemeSettingsService
  ) {
    this.uploadForm = this.fb.group({
      isDefault: [false],
      file: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadEventTypes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
  }

  /**
   * Load event types from settings API
   */
  loadEventTypes(): void {
    this.isLoadingEventTypes = true;

    this.themeService.getEventTypesFromSettings()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoadingEventTypes = false)
      )
      .subscribe({
        next: (settings) => {
          this.eventTypes = settings.map(setting => ({
            ...setting,
            count: 0,
            isActive: false,
            icon: this.themeService.getEventTypeIcon(setting.eventType)
          }));

          // Auto-select first event type if available
          if (this.eventTypes.length > 0) {
            this.selectEventType(this.eventTypes[0]);
          }
        },
        error: (error: any) => {
          console.error('Error loading event types:', error);
          this.showToast('Failed to load event types', 'error');
        }
      });
  }

  /**
   * Select event type and load its themes
   */
  selectEventType(eventType: EventTypeWithCount): void {
    // Update active states
    this.eventTypes.forEach(et => et.isActive = false);
    eventType.isActive = true;
    this.selectedEventType = eventType;

    // Reset pagination
    this.currentPage = 1;

    // Load themes
    this.loadThemes();
  }

  /**
   * Load themes for selected event type
   */
  loadThemes(): void {
    if (!this.selectedEventType) return;

    this.isLoadingThemes = true;
    this.themes = [];

    this.themeService.getThemesByEventType(this.selectedEventType.eventType, this.currentPage, this.pageSize)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoadingThemes = false)
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.themes = response.data.map(theme => ({
              ...theme,
              previewUrl: theme.imageUrl ? this.themeService.getFullImageUrl(theme.imageUrl) : undefined
            }));
            this.totalThemes = response.pagination.totalCount;
            this.totalPages = response.pagination.totalPages;

            // Update count for this event type
            if (this.selectedEventType) {
              this.selectedEventType.count = this.totalThemes;
            }
          }
        },
        error: (error: any) => {
          console.error('Error loading themes:', error);
          this.showToast('Failed to load themes', 'error');
        }
      });
  }

  /**
   * Handle file selection
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      this.showToast('File size must be less than 10MB', 'error');
      this.resetFileInput();
      return;
    }

    this.selectedFile = file;
    this.fileName = file.name;
    this.isFileReady = false;
    this.isConverting = false;
    this.conversionProgress = 0;

    this.showToast(`File selected: ${file.name}`, 'info');
  }

  /**
   * Process selected file (convert to Base64)
   */
  processSelectedFile(): void {
    if (!this.selectedFile) return;

    this.isConverting = true;
    this.conversionProgress = 0;

    const reader = new FileReader();
    const fileSize = this.selectedFile.size;
    let loaded = 0;

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      if (loaded < fileSize) {
        loaded += Math.min(fileSize / 10, 102400); // 100KB chunks
        this.conversionProgress = Math.min(90, Math.floor((loaded / fileSize) * 100));
      }
    }, 100);

    reader.onload = () => {
      clearInterval(progressInterval);
      this.conversionProgress = 100;
      
      const base64String = reader.result as string;
      this.fileBase64 = base64String.split(',')[1];
      this.isFileReady = true;
      this.isConverting = false;

      this.showToast('File ready for upload', 'success');
    };

    reader.onerror = () => {
      clearInterval(progressInterval);
      console.error('Error reading file');
      this.showToast('Error processing file', 'error');
      this.resetFileInput();
    };

    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        loaded = event.loaded;
        this.conversionProgress = Math.floor((event.loaded / event.total) * 100);
      }
    };

    reader.readAsDataURL(this.selectedFile);
  }

  /**
   * Upload theme
   */
  /**
 * Upload theme
 */
uploadTheme(): void {
  if (!this.selectedEventType || !this.fileBase64 || !this.isFileReady) {
    this.showToast('Please select and process a file first', 'error');
    return;
  }

  this.isUploading = true;

  const payload: UploadThemePayload = {
    themeFileBase64: this.fileBase64,
    themeFileName: this.fileName,
    isDefault: this.uploadForm.get('isDefault')?.value || false
  };

  this.themeService.uploadTheme(this.selectedEventType.eventType, payload)
    .pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.isUploading = false;
      })
    )
    .subscribe({
      next: (response) => {
        const uploadSucceeded = response?.success !== false;
        if (uploadSucceeded) {
          this.showToast('Theme uploaded successfully', 'success');
          this.resetFileInput();
          this.uploadForm.reset({ isDefault: false });
          this.loadThemes(); // Reload themes
        } else {
          const errorMessage = response?.message || 'Upload failed';
          this.showToast(errorMessage, 'error');
        }
      },
      error: (error: any) => {
        console.error('Upload error:', error);
        // Extract error message from response if available
        const errorMessage = error.error?.message || error.message || 'Upload failed';
        this.showToast(errorMessage, 'error');
      }
    });
}
  /**
   * Confirm theme deletion
   */
  confirmDelete(theme: Theme): void {
    this.themeToDelete = theme;
    this.showConfirmDialog = true;
  }

  /**
   * Cancel deletion
   */
  cancelDelete(): void {
    this.showConfirmDialog = false;
    this.themeToDelete = null;
  }

  /**
   * Delete theme
   */
  deleteTheme(): void {
    if (!this.themeToDelete) return;

    this.deleteInProgress = true;

    this.themeService.deleteTheme(this.themeToDelete.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.deleteInProgress = false;
          this.showConfirmDialog = false;
        })
      )
      .subscribe({
        next: (response) => {
          const deleteSucceeded = response?.success !== false;
          if (deleteSucceeded) {
            this.showToast('Theme deleted successfully', 'success');
            this.themes = this.themes.filter(t => t.id !== this.themeToDelete?.id);
            this.totalThemes--;

            // Update count for selected event type
            if (this.selectedEventType) {
              this.selectedEventType.count = this.totalThemes;
            }

            this.themeToDelete = null;
          } else {
            this.showToast(response.message || 'Delete failed', 'error');
          }
        },
        error: (error: any) => {
          console.error('Delete error:', error);
          this.showToast(error.error?.message || 'Delete failed', 'error');
        }
      });
  }

  /**
   * Change page
   */
  changePage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.loadThemes();
  }

  /**
   * Reset file input
   */
  resetFileInput(): void {
    this.selectedFile = null;
    this.fileBase64 = '';
    this.fileName = '';
    this.isFileReady = false;
    this.isConverting = false;
    this.conversionProgress = 0;
    
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  /**
   * Show toast message
   */
  showToast(message: string, type: 'success' | 'error' | 'info'): void {
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }

    this.toastMessage = message;
    this.toastType = type;
    this.toastVisible = true;

    this.toastTimeout = setTimeout(() => {
      this.toastVisible = false;
      this.toastTimeout = null;
    }, 5000);
  }

  /**
   * Hide toast
   */
  hideToast(): void {
    this.toastVisible = false;
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
      this.toastTimeout = null;
    }
  }

  /**
   * Format date for display
   */
  formatDate(dateString?: string): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch {
      return '';
    }
  }

  /**
   * Get file icon
   */
  getFileIcon(fileName: string): string {
    return this.themeService.getFileIcon(fileName);
  }

  /**
   * Format file size
   */
  formatFileSize(size?: number): string {
    if (!size) return '';
    return this.themeService.formatFileSize(size);
  }

  /**
   * Min helper for template
   */
  min(a: number, b: number): number {
    return Math.min(a, b);
  }

  /**
   * Get selected event type name safely
   */
  getSelectedEventTypeName(): string {
    return this.selectedEventType?.eventType || '';
  }
}
