import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonButton, IonInput, IonInputPasswordToggle } from '@ionic/angular/standalone';

/**
 * Overlay dialogs for PlanEditor (unlock, delete password, served warning, add text, save success).
 * Parent keeps service calls; this component is presentation + two-way field binding.
 */
@Component({
  selector: 'app-plan-editor-dialogs',
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonInput, IonInputPasswordToggle],
  templateUrl: './plan-editor-dialogs.component.html',
  styleUrl: './plan-editor-dialogs.component.scss',
})
export class PlanEditorDialogsComponent {
  @Input() showUnlockDialog = false;
  @Input() showDeletePasswordDialog = false;
  @Input() showServedDeleteWarning = false;
  @Input() showTextDialog = false;
  @Input() showSaveDialog = false;
  @Input() newText = '';
  @Input() deletePassword = '';
  @Input() deleteError = '';
  @Input() pendingDeleteTargetType: 'TABLE' | 'RESERVED' | null = null;

  @Output() newTextChange = new EventEmitter<string>();
  @Output() deletePasswordChange = new EventEmitter<string>();

  @Output() closeUnlock = new EventEmitter<void>();
  @Output() confirmUnlock = new EventEmitter<void>();
  @Output() closeDeletePassword = new EventEmitter<void>();
  @Output() confirmProtectedDelete = new EventEmitter<void>();
  @Output() cancelServedDelete = new EventEmitter<void>();
  @Output() confirmServedDelete = new EventEmitter<void>();
  @Output() closeText = new EventEmitter<void>();
  @Output() confirmAddText = new EventEmitter<void>();
  @Output() closeSave = new EventEmitter<void>();

  onNewText(value: string | null | undefined): void {
    this.newTextChange.emit(value ?? '');
  }

  onDeletePassword(value: string | null | undefined): void {
    this.deletePasswordChange.emit(value ?? '');
  }
}
