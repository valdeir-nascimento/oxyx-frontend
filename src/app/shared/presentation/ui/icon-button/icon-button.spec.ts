import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IconButton } from './icon-button';

/** Ação só de ícone: o nome obrigatório é o que o leitor de tela anuncia e o ponteiro mostra. */
describe('IconButton', () => {
  let fixture: ComponentFixture<IconButton>;

  function button(): HTMLButtonElement {
    return (fixture.nativeElement as HTMLElement).querySelector('button')!;
  }

  function render(inputs: Record<string, unknown> = {}): void {
    TestBed.configureTestingModule({ imports: [IconButton] });
    fixture = TestBed.createComponent(IconButton);
    fixture.componentRef.setInput('icon', 'lock');
    fixture.componentRef.setInput('label', 'Inativar Maria Silva');
    Object.entries(inputs).forEach(([name, value]) => fixture.componentRef.setInput(name, value));
    fixture.detectChanges();
  }

  it('is named by its label, for the screen reader and for the pointer', () => {
    render();

    expect(button().getAttribute('aria-label')).toBe('Inativar Maria Silva');
    expect(button().getAttribute('title')).toBe('Inativar Maria Silva');
  });

  it('is a plain button, so it does not submit the form around it', () => {
    render();

    expect(button().type).toBe('button');
  });

  it('reports the press', () => {
    render();
    const pressed = vi.fn();
    fixture.componentInstance.pressed.subscribe(pressed);

    button().click();

    expect(pressed).toHaveBeenCalledOnce();
  });

  it('takes the small and the danger looks of the design system', () => {
    render({ small: true, danger: true });

    expect(button().classList).toContain('sm');
    expect(button().classList).toContain('danger');
  });

  it('says whether the region it opens is open, and which one it is', () => {
    render({ expanded: false, controls: 'ovyx-drawer' });

    expect(button().getAttribute('aria-expanded')).toBe('false');
    expect(button().getAttribute('aria-controls')).toBe('ovyx-drawer');
  });

  it('says nothing about a region when it opens none', () => {
    render();

    expect(button().hasAttribute('aria-expanded')).toBe(false);
    expect(button().hasAttribute('aria-controls')).toBe(false);
  });
});
