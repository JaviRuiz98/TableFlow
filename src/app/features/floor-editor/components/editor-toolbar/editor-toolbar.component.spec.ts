import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { EditorToolbarComponent } from './editor-toolbar.component';

describe('EditorToolbarComponent', () => {
  let fixture: ComponentFixture<EditorToolbarComponent>;
  let cmp: EditorToolbarComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EditorToolbarComponent],
    });
    fixture = TestBed.createComponent(EditorToolbarComponent);
    cmp = fixture.componentInstance;
  });

  it('emits setTool and zoom in editor mode', () => {
    const toolSpy = vi.fn();
    const zoomSpy = vi.fn();
    cmp.setTool.subscribe(toolSpy);
    cmp.zoom.subscribe(zoomSpy);
    cmp.mode = 'editor';
    cmp.canEditGeometry = true;
    cmp.isAdmin = true;
    fixture.detectChanges();
    cmp.setTool.emit('draw');
    cmp.zoom.emit(0.1);
    expect(toolSpy).toHaveBeenCalledWith('draw');
    expect(zoomSpy).toHaveBeenCalledWith(0.1);
  });

  it('shows operativo chrome without save/lock actions markup', () => {
    cmp.mode = 'operativo';
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Seleccionar');
    expect(text).toContain('MOVER');
    expect(text).not.toContain('Guardar diseño');
  });

  it('emits textFontSizeChange from control', () => {
    const spy = vi.fn();
    cmp.textFontSizeChange.subscribe(spy);
    cmp.mode = 'editor';
    cmp.showTextSizeControl = true;
    cmp.selectedTextFontSize = 24;
    fixture.detectChanges();
    cmp.textFontSizeChange.emit('30');
    expect(spy).toHaveBeenCalledWith('30');
  });
});
