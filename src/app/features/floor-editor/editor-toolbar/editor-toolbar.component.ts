import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonButton } from '@ionic/angular/standalone';
import type { ClubTable } from '../../../../core/models/models';
import type { EditorTool } from '../../tools';

/**
 * Editor / operativo toolbar chrome. Parent owns tool state and Stage actions.
 */
@Component({
  selector: 'app-editor-toolbar',
  standalone: true,
  imports: [CommonModule, IonButton],
  templateUrl: './editor-toolbar.component.html',
  styleUrl: './editor-toolbar.component.scss',
})
export class EditorToolbarComponent {
  @Input() mode: 'editor' | 'operativo' = 'editor';
  @Input() tool: EditorTool = 'select';
  @Input() toolLabel = '';
  @Input() canEditGeometry = false;
  @Input() isAdmin = false;
  @Input() isLocked = false;
  @Input() canZoomOut = false;
  @Input() canZoomIn = false;
  @Input() historyIndex = -1;
  @Input() historyLength = 0;
  @Input() drawingLength = 0;
  @Input() selectedElementId: string | null = null;
  @Input() selectedTable: ClubTable | null = null;
  @Input() selectedReserved: ClubTable | null = null;
  @Input() showTextSizeControl = false;
  @Input() selectedTextFontSize = 22;

  @Output() setTool = new EventEmitter<EditorTool>();
  @Output() save = new EventEmitter<void>();
  @Output() lockToggle = new EventEmitter<void>();
  @Output() deleteSelected = new EventEmitter<void>();
  @Output() clearDrawing = new EventEmitter<void>();
  @Output() addTable = new EventEmitter<void>();
  @Output() addReserved = new EventEmitter<void>();
  @Output() undo = new EventEmitter<void>();
  @Output() redo = new EventEmitter<void>();
  @Output() zoom = new EventEmitter<number>();
  @Output() textFontSizeChange = new EventEmitter<string | number>();
}
