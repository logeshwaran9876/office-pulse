import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { EventSetting } from '../../../services/event-settings.service';
declare const bootstrap: any;

@Component({
  selector: 'app-event-settings-modal',
  templateUrl: './event-settings-modal.component.html',
  styleUrls: ['./event-settings-modal.component.css']
})
export class EventSettingsModalComponent implements OnInit, OnChanges {
  @Input() isEdit: boolean = false;
  @Input() eventData: EventSetting | null = null;
  @Output() onSave = new EventEmitter<EventSetting>();

  eventForm!: FormGroup;
  private modalInstance: any = null;
  
  eventTypes: string[] = [
    'Birthday',
    'Conference',
    'Anniversary',
    'Company Event',
    'Holidays',
    'Workshop',
    'Meeting',
    'Seminar',
    'Party',
    'Wedding'
  ];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['eventData'] && this.eventData && this.eventForm) {
      this.eventForm.patchValue({
        type: this.eventData.eventType,
        isRecurring: this.eventData.isRecurringSupported || false,
        passiveStartDays: this.eventData.passiveStartDays || 0,
        passiveEndDays: this.eventData.passiveEndDays || 0,
        defaultStartTime: this.eventData.defaultStartTime || '09:00',
        defaultEndTime: this.eventData.defaultEndTime || '17:00'
      });
    }
  }

  initForm(): void {
    this.eventForm = this.fb.group({
      type: ['', [Validators.required]],
      isRecurring: [false],
      passiveStartDays: [0, [Validators.required, Validators.min(0), Validators.max(365)]],
      passiveEndDays: [0, [Validators.required, Validators.min(0), Validators.max(365)]],
      defaultStartTime: ['09:00', [Validators.required]],
      defaultEndTime: ['17:00', [Validators.required]]
    }, { validators: [this.rangeValidator, this.timeValidator] });
  }

  rangeValidator(control: AbstractControl): ValidationErrors | null {
    const start = control.get('passiveStartDays')?.value;
    const end = control.get('passiveEndDays')?.value;
    
    if (start !== null && end !== null && end < start) {
      return { rangeInvalid: true };
    }
    return null;
  }

  timeValidator(control: AbstractControl): ValidationErrors | null {
    const start = control.get('defaultStartTime')?.value;
    const end = control.get('defaultEndTime')?.value;
    
    if (start && end && start >= end) {
      return { timeInvalid: true };
    }
    return null;
  }

  openModal(): void {
    if (!this.modalInstance) {
      const modalElement = document.getElementById('eventSettingsModal');
      if (modalElement) {
        this.modalInstance = new bootstrap.Modal(modalElement);
      }
    }
    
    if (!this.isEdit) {
      this.eventForm.reset({
        type: '',
        isRecurring: false,
        passiveStartDays: 0,
        passiveEndDays: 0,
        defaultStartTime: '09:00',
        defaultEndTime: '17:00'
      });
    }
    
    this.modalInstance?.show();
  }

  closeModal(): void {
    this.modalInstance?.hide();
  }

  onSubmit(): void {
    if (this.eventForm.valid) {
      this.onSave.emit(this.eventForm.value);
      this.closeModal();
    } else {
      this.eventForm.markAllAsTouched();
    }
  }

  get type() { return this.eventForm.get('type'); }
  get isRecurring() { return this.eventForm.get('isRecurring'); }
  get passiveStartDays() { return this.eventForm.get('passiveStartDays'); }
  get passiveEndDays() { return this.eventForm.get('passiveEndDays'); }
  get defaultStartTime() { return this.eventForm.get('defaultStartTime'); }
  get defaultEndTime() { return this.eventForm.get('defaultEndTime'); }
}