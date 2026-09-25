import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SegmentedControl } from './segmented-control';

/** Seleção segmentada: botões de alternância num grupo nomeado, com uma opção escolhida por vez. */
describe('SegmentedControl', () => {
  let fixture: ComponentFixture<SegmentedControl>;

  function buttons(): HTMLButtonElement[] {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
  }

  function render(): void {
    TestBed.configureTestingModule({ imports: [SegmentedControl] });
    fixture = TestBed.createComponent(SegmentedControl);
    fixture.componentRef.setInput('label', 'Situação');
    fixture.componentRef.setInput('options', [
      { value: '', label: 'Todos' },
      { value: 'ACTIVE', label: 'Ativos' },
    ]);
    fixture.detectChanges();
  }

  it('is a group named for the screen reader', () => {
    render();
    const group = (fixture.nativeElement as HTMLElement).querySelector('.seg')!;

    expect(group.getAttribute('role')).toBe('group');
    expect(group.getAttribute('aria-label')).toBe('Situação');
  });

  it('says which option is chosen', () => {
    render();

    expect(buttons().map((button) => button.getAttribute('aria-pressed'))).toEqual(['true', 'false']);
  });

  it('chooses the option pressed and reports the new value', () => {
    render();
    const changed = vi.fn();
    fixture.componentInstance.value.subscribe(changed);

    buttons()[1].click();
    fixture.detectChanges();

    expect(changed).toHaveBeenCalledWith('ACTIVE');
    expect(buttons().map((button) => button.getAttribute('aria-pressed'))).toEqual(['false', 'true']);
  });

  it('reports nothing when the option already chosen is pressed again', () => {
    // Pressionar de novo a mesma opção não é uma escolha nova, e não deve pesquisar de novo.
    render();
    const changed = vi.fn();
    fixture.componentInstance.value.subscribe(changed);

    buttons()[0].click();

    expect(changed).not.toHaveBeenCalled();
  });
});
