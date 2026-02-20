import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

import { EventSettingsComponent } from './event-settings.component';
import { EventSettingsModalComponent } from './event-settings-modal/event-settings-modal.component';
import { EventSettingsService } from '../../services/event-settings.service';

const routes: Routes = [
  { path: '', component: EventSettingsComponent }
];

@NgModule({
  declarations: [
    EventSettingsComponent,
    EventSettingsModalComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule,
    RouterModule.forChild(routes)
  ],
  providers: [EventSettingsService]
})
export class EventSettingsModule {}