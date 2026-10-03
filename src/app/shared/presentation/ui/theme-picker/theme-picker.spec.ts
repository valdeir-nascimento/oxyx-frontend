import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ThemePreference } from '../../../domain/theme-preference';
import { ThemePicker } from './theme-picker';

/** Quem usa o seletor: guarda o valor e anota cada escolha. */
@Component({
  imports: [ThemePicker],
  template: `<ovyx-theme-picker
      [value]="value()"
      (valueChange)="chosen.push($event); value.set($event)"
    />
    <button type="button" id="fora">Fora</button>`,
})
class Host {
  readonly value = signal<ThemePreference>('DARK');
  readonly chosen: ThemePreference[] = [];
}

/**
 * O seletor de tema do topo (R-005 da 011): um botão de ícone que abre as três opções, com o padrão de menu de
 * opções exclusivas, pelo mouse e pelo teclado.
 */
describe('ThemePicker', () => {
  let fixture: ComponentFixture<Host>;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function trigger(): HTMLButtonElement {
    return element().querySelector<HTMLButtonElement>('button[aria-haspopup]')!;
  }

  function options(): HTMLElement[] {
    return Array.from(element().querySelectorAll<HTMLElement>('[role="menuitemradio"]'));
  }

  function option(label: string): HTMLElement {
    return options().find((candidate) => candidate.textContent?.trim() === label)!;
  }

  function key(target: Element, name: string): void {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }));
    fixture.detectChanges();
  }

  async function render(value: ThemePreference = 'DARK'): Promise<void> {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    fixture.componentInstance.value.set(value);
    document.body.appendChild(element());
    fixture.detectChanges();
  }

  function open(): void {
    trigger().click();
    fixture.detectChanges();
  }

  afterEach(() => element()?.remove());

  it.each([
    ['DARK', 'moon', 'Tema: Escuro'],
    ['LIGHT', 'sun', 'Tema: Claro'],
    ['SYSTEM', 'monitor', 'Tema: Igual ao sistema'],
  ] as const)('shows %s with the icon %s and the name "%s"', async (value, icon, name) => {
    await render(value);

    expect(trigger().getAttribute('aria-label')).toBe(name);
    expect(trigger().querySelector('ovyx-icon')?.getAttribute('data-icon')).toBe(icon);
  });

  it('opens the three options in order, with only the current one checked', async () => {
    await render('DARK');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(options()).toHaveLength(0);

    open();

    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(trigger().getAttribute('aria-haspopup')).toBe('menu');
    expect(options().map((item) => item.textContent?.trim())).toEqual([
      'Claro',
      'Escuro',
      'Igual ao sistema',
    ]);
    expect(options().map((item) => item.getAttribute('aria-checked'))).toEqual([
      'false',
      'true',
      'false',
    ]);
  });

  it('chooses an option on click, closes the list and gives the focus back to the button', async () => {
    await render('DARK');
    open();

    option('Igual ao sistema').click();
    fixture.detectChanges();

    expect(fixture.componentInstance.chosen).toEqual(['SYSTEM']);
    expect(options()).toHaveLength(0);
    expect(document.activeElement).toBe(trigger());
    expect(trigger().getAttribute('aria-label')).toBe('Tema: Igual ao sistema');
  });

  it('puts the focus on the checked option when it opens', async () => {
    await render('SYSTEM');

    open();

    expect(document.activeElement).toBe(option('Igual ao sistema'));
  });

  it('moves with the arrows, going around, and with Home and End', async () => {
    await render('DARK');
    open();

    key(document.activeElement!, 'ArrowDown');
    expect(document.activeElement).toBe(option('Igual ao sistema'));
    key(document.activeElement!, 'ArrowDown');
    expect(document.activeElement).toBe(option('Claro'));
    key(document.activeElement!, 'ArrowUp');
    expect(document.activeElement).toBe(option('Igual ao sistema'));
    key(document.activeElement!, 'Home');
    expect(document.activeElement).toBe(option('Claro'));
    key(document.activeElement!, 'End');
    expect(document.activeElement).toBe(option('Igual ao sistema'));
  });

  it.each(['Enter', ' '])('chooses the focused option with "%s"', async (name) => {
    await render('DARK');
    open();
    key(document.activeElement!, 'ArrowUp');

    key(document.activeElement!, name);

    expect(fixture.componentInstance.chosen).toEqual(['LIGHT']);
    expect(options()).toHaveLength(0);
    expect(document.activeElement).toBe(trigger());
  });

  it('closes with Escape without choosing, and gives the focus back to the button', async () => {
    await render('DARK');
    open();

    key(document.activeElement!, 'Escape');

    expect(fixture.componentInstance.chosen).toEqual([]);
    expect(options()).toHaveLength(0);
    expect(document.activeElement).toBe(trigger());
  });

  it('closes when the person clicks outside the list', async () => {
    await render('DARK');
    open();

    element()
      .querySelector<HTMLButtonElement>('#fora')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(options()).toHaveLength(0);
    expect(fixture.componentInstance.chosen).toEqual([]);
  });
});
