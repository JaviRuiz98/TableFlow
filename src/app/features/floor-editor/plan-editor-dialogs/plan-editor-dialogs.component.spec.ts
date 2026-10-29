import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { PlanEditorDialogsComponent } from './plan-editor-dialogs.component';

describe('PlanEditorDialogsComponent', () => {
  let fixture: ComponentFixture<PlanEditorDialogsComponent>;
  let cmp: PlanEditorDialogsComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PlanEditorDialogsComponent],
    });
    fixture = TestBed.createComponent(PlanEditorDialogsComponent);
    cmp = fixture.componentInstance;
  });

  it('emits close/confirm for unlock dialog', () => {
    const close = vi.fn();
    const confirm = vi.fn();
    cmp.closeUnlock.subscribe(close);
    cmp.confirmUnlock.subscribe(confirm);
    cmp.showUnlockDialog = true;
    fixture.detectChanges();
    cmp.closeUnlock.emit();
    cmp.confirmUnlock.emit();
    expect(close).toHaveBeenCalled();
    expect(confirm).toHaveBeenCalled();
  });

  it('forwards newText and deletePassword via change outputs', () => {
    const textSpy = vi.fn();
    const passSpy = vi.fn();
    cmp.newTextChange.subscribe(textSpy);
    cmp.deletePasswordChange.subscribe(passSpy);
    cmp.onNewText('Hola');
    cmp.onDeletePassword('secret');
    expect(textSpy).toHaveBeenCalledWith('Hola');
    expect(passSpy).toHaveBeenCalledWith('secret');
  });

  it('renders clear-drawing confirm copy', () => {
    cmp.showClearDrawingDialog = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('¿Borrar todo el dibujo?');
  });

  it('renders mesa password delete copy', () => {
    cmp.showDeletePasswordDialog = true;
    cmp.pendingDeleteTargetType = 'TABLE';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('eliminar esta mesa');
  });
});
