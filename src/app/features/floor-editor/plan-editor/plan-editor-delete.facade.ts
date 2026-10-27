/**
 * Password-gated table/reserved deletion UX for PlanEditor.
 * Calls TableDeletionService; local model updates stay on the host.
 */
import type { TableDeletionService } from '../../tables';
import type { PlanEditorHost } from './plan-editor-host';

export class PlanEditorDeleteFacade {
  private verifiedDeletePassword = '';

  constructor(
    private readonly host: PlanEditorHost,
    private readonly tableDeletion: TableDeletionService,
  ) {}

  deleteSelected(): void {
    const h = this.host;
    if (!h.canEditGeometry) return;
    if (h.selectedElementId) {
      const id = h.selectedElementId;
      h.elements = h.elements.filter((e) => e.id !== id);
      h.selectedElementId = null;
      h.activeEndpoint = null;
      h.pushHistory();
      h.requestRender();
      return;
    }
    const target = h.selectedTable ?? h.selectedReserved;
    if (!target) return;
    h.pendingDeleteTarget = target;
    h.deletePassword = '';
    h.deleteError = '';
    this.verifiedDeletePassword = '';
    h.showDeletePasswordDialog = true;
  }

  closeDeletePasswordDialog(): void {
    const h = this.host;
    h.showDeletePasswordDialog = false;
    h.deletePassword = '';
    h.deleteError = '';
    h.pendingDeleteTarget = null;
  }

  async confirmProtectedDelete(): Promise<void> {
    const h = this.host;
    const target = h.pendingDeleteTarget;
    if (!target || !h.deletePassword || !h.canEditGeometry) return;
    h.deleteError = '';
    try {
      const result = await this.tableDeletion.delete(target.id, h.deletePassword, false);
      if (!result.ok && result.reason === 'BAD_PASSWORD') {
        h.deleteError = 'Contraseña incorrecta';
        return;
      }
      if (!result.ok && result.reason === 'SERVED_PRODUCTS') {
        this.verifiedDeletePassword = h.deletePassword;
        h.showDeletePasswordDialog = false;
        h.showServedDeleteWarning = true;
        return;
      }
      if (!result.ok) {
        h.deleteError = 'No se pudo eliminar la mesa/reservado';
        return;
      }
      this.removeTargetLocally(target.id);
      this.closeDeletePasswordDialog();
    } catch (error) {
      h.deleteError = error instanceof Error ? error.message : 'No se pudo eliminar';
    }
  }

  cancelServedDelete(): void {
    const h = this.host;
    h.showServedDeleteWarning = false;
    h.pendingDeleteTarget = null;
    this.verifiedDeletePassword = '';
    h.deletePassword = '';
  }

  async confirmServedDelete(): Promise<void> {
    const h = this.host;
    const target = h.pendingDeleteTarget;
    if (!target || !this.verifiedDeletePassword || !h.canEditGeometry) return;
    try {
      const result = await this.tableDeletion.delete(target.id, this.verifiedDeletePassword, true);
      if (!result.ok) throw new Error('No se pudo completar el borrado');
      this.removeTargetLocally(target.id);
      this.cancelServedDelete();
    } catch (error) {
      console.error('Error eliminando mesa con productos servidos:', error);
    }
  }

  private removeTargetLocally(id: string): void {
    const h = this.host;
    h.tables = h.tables.filter((t) => t.id !== id);
    h.reserved = h.reserved.filter((r) => r.id !== id);
    if (h.selectedTable?.id === id) h.selectedTable = null;
    if (h.selectedReserved?.id === id) h.selectedReserved = null;
    if (h.selectedOrderTarget?.id === id) {
      h.showOrderDialog = false;
      h.selectedOrderTarget = null;
    }
    h.pushHistory();
    h.requestRender();
  }
}
