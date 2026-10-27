import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { WorkspaceUserAlertModalComponent } from './workspace-user-alert-modal.component';

describe('WorkspaceUserAlertModalComponent', () => {
  function create(): WorkspaceUserAlertModalComponent {
    TestBed.configureTestingModule({
      imports: [WorkspaceUserAlertModalComponent],
    });
    return TestBed.createComponent(WorkspaceUserAlertModalComponent).componentInstance;
  }

  it('emits acknowledged when Continuar is triggered', () => {
    const cmp = create();
    const ack = vi.fn();
    cmp.acknowledged.subscribe(ack);
    cmp.open = true;
    cmp.acknowledged.emit();
    expect(ack).toHaveBeenCalled();
  });

  it('accepts open and copy inputs from parent', () => {
    const cmp = create();
    cmp.open = true;
    cmp.eyebrow = 'AVISO';
    cmp.title = 'Nueva observación';
    cmp.message = 'Revisa la mesa';
    expect(cmp.open).toBe(true);
    expect(cmp.eyebrow).toBe('AVISO');
    expect(cmp.title).toBe('Nueva observación');
    expect(cmp.message).toBe('Revisa la mesa');
  });
});
