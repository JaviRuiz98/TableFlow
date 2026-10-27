/**
 * Shared host surface for PlanEditor helper classes.
 * Implemented by PlanEditorComponent (sole Stage owner).
 */
import type { ChangeDetectorRef, ElementRef } from '@angular/core';
import type Konva from 'konva';
import type { Point } from '../geometry';
import type { EditorTool } from '../tools';
import type { ClubTable, FloorPlan, FloorPlanElement } from '../../../core/models/models';

export interface PlanEditorHost {
  // Stage / layers (created only by PlanEditor)
  stage: Konva.Stage;
  layer: Konva.Layer;
  draftLayer: Konva.Layer;
  container: ElementRef<HTMLDivElement>;
  cdr: ChangeDetectorRef;

  // Model
  plan: FloorPlan;
  mode: 'editor' | 'operativo';
  tool: EditorTool;
  panMode: boolean;
  canEditGeometry: boolean;
  elements: FloorPlanElement[];
  tables: ClubTable[];
  reserved: ClubTable[];
  drawing: Point[];
  orderCountMap: Map<string, number>;

  // Selection / endpoints
  selectedTable: ClubTable | null;
  selectedReserved: ClubTable | null;
  selectedElementId: string | null;
  selectedOrderTarget: ClubTable | null;
  activeEndpoint: 'start' | 'end' | null;
  endpointShape: Konva.Circle | null;

  // Delete dialog state
  pendingDeleteTarget: ClubTable | null;
  deletePassword: string;
  deleteError: string;
  showDeletePasswordDialog: boolean;
  showServedDeleteWarning: boolean;
  showOrderDialog: boolean;

  // Text dialog
  newText: string;
  showTextDialog: boolean;

  // Coordination
  pushHistory(): void;
  requestRender(): void;
  getStagePointerPoint(event: Event): Point | null;
  getCanvasPoint(ev: PointerEvent): Point | null;
  onSelectTable(t: ClubTable): void;
  onSelectReserved(r: ClubTable): void;
  setTool(tool: EditorTool): void;
  openTextDialog(point: Point): void;
}
