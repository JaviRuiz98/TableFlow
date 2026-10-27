import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonButton, IonModal } from '@ionic/angular/standalone';

/**
 * USER new-order / observation alert modal (presentation only).
 * Parent owns open flag + copy strings and handles acknowledge navigation.
 */
@Component({
  selector: 'app-workspace-user-alert-modal',
  standalone: true,
  imports: [IonButton, IonModal],
  templateUrl: './workspace-user-alert-modal.component.html',
  styleUrl: './workspace-user-alert-modal.component.scss',
})
export class WorkspaceUserAlertModalComponent {
  @Input() open = false;
  @Input() eyebrow = '';
  @Input() title = '';
  @Input() message = '';

  @Output() acknowledged = new EventEmitter<void>();
}
