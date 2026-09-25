import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, provideRouter } from '@angular/router';
import { AuthenticatedLayout, crumbsOf } from './authenticated-layout';
import { MenuItem } from './menu-item';

@Component({ template: '' })
class Blank {}

const MENU: readonly MenuItem[] = [
  { label: 'Início', route: '/', icon: 'chart', group: 'Painel' },
  { label: 'Responsáveis', route: '/responsaveis', icon: 'users', group: 'Administração' },
];

/**
 * Casca autenticada do design system: menu lateral agrupado, barra superior com o caminho da página
 * e, no celular, a gaveta modal com o mesmo menu.
 */
describe('AuthenticatedLayout', () => {
  let fixture: ComponentFixture<AuthenticatedLayout>;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function menuButton(): HTMLButtonElement {
    return element().querySelector<HTMLButtonElement>('[aria-label="Abrir menu"]')!;
  }

  function drawer(): HTMLElement | null {
    return element().querySelector('.drawer');
  }

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function render(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [AuthenticatedLayout],
      providers: [
        provideRouter([
          { path: '', component: Blank, data: { crumbs: ['Início'] } },
          { path: 'responsaveis', component: Blank, data: { crumbs: ['Administração', 'Responsáveis'] } },
        ]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthenticatedLayout);
    fixture.componentRef.setInput('fullName', 'Maria Silva');
    fixture.componentRef.setInput('roleLabel', 'Administrador');
    fixture.componentRef.setInput('menuItems', MENU);
    document.body.appendChild(element());
    fixture.detectChanges();
  }

  async function visit(url: string): Promise<void> {
    await TestBed.inject(Router).navigateByUrl(url);
    await settle();
  }

  async function openDrawer(): Promise<void> {
    menuButton().focus();
    menuButton().click();
    await settle();
  }

  afterEach(() => element().remove());

  it('shows the name, the role label and the menu it receives', async () => {
    await render();
    const side = element().querySelector('.side')!;

    expect(side.querySelector('.who')?.textContent).toContain('Maria Silva');
    expect(side.querySelector('.who')?.textContent).toContain('Administrador');
    expect(Array.from(side.querySelectorAll('.nav-item span')).map((label) => label.textContent)).toEqual([
      'Início',
      'Responsáveis',
      'Sair',
    ]);
  });

  it('puts each item under the name of its group', async () => {
    await render();

    expect(Array.from(element().querySelectorAll('.side .nav-group')).map((group) => group.textContent)).toEqual([
      'Painel',
      'Administração',
    ]);
  });

  it('announces the sign-out intent without performing it itself', async () => {
    // O layout não conhece o contexto identity nem faz chamada HTTP: apenas avisa a intenção.
    await render();
    const signOut = vi.fn();
    fixture.componentInstance.signOut.subscribe(signOut);

    element().querySelector<HTMLButtonElement>('.logout')!.click();

    expect(signOut).toHaveBeenCalledOnce();
  });

  it('marks the area the person is in, in the side menu and in the bottom navigation', async () => {
    await render();

    await visit('/responsaveis');

    const current = Array.from(element().querySelectorAll('[aria-current="page"]'));
    expect(current.map((link) => link.textContent?.trim())).toEqual(['Responsáveis', 'Responsáveis', 'Responsáveis']);
  });

  it('does not mark the home as current in every area, since every address starts with it', async () => {
    await render();

    await visit('/responsaveis');

    const home = element().querySelector('.side a[href="/"]');
    expect(home?.getAttribute('aria-current')).toBeNull();
  });

  it('shows where the page is, with the current page last', async () => {
    await render();

    await visit('/responsaveis');

    expect(element().querySelector('.crumbs .crumb')?.textContent).toBe('Administração');
    expect(element().querySelector('.crumbs .cur')?.textContent).toBe('Responsáveis');
    expect(element().querySelector('.crumbs .cur')?.getAttribute('aria-current')).toBe('page');
  });

  it('opens the menu as a modal drawer, tied to the button that opens it', async () => {
    await render();

    await openDrawer();

    const dialog = drawer()?.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(menuButton().getAttribute('aria-expanded')).toBe('true');
    expect(menuButton().getAttribute('aria-controls')).toBe(dialog?.id);
  });

  it('moves the focus into the drawer, and back to the button once it closes', async () => {
    await render();
    await openDrawer();

    expect(drawer()?.contains(document.activeElement)).toBe(true);

    drawer()!.querySelector('a')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle();

    expect(drawer()).toBeNull();
    expect(document.activeElement).toBe(menuButton());
  });

  it('closes the drawer on a click outside it, but not on a click inside it', async () => {
    await render();
    await openDrawer();

    drawer()!.querySelector<HTMLElement>('.who')!.click();
    await settle();
    expect(drawer()).not.toBeNull();

    drawer()!.click();
    await settle();
    expect(drawer()).toBeNull();
  });

  it('closes the drawer once the person goes to another area', async () => {
    await render();
    await openDrawer();

    await visit('/responsaveis');

    expect(drawer()).toBeNull();
  });
});

describe('crumbsOf', () => {
  function route(crumbs: readonly string[] | undefined, child: ActivatedRouteSnapshot | null) {
    return { data: crumbs ? { crumbs } : {}, firstChild: child } as unknown as ActivatedRouteSnapshot;
  }

  it('takes the path declared by the deepest route that declares one', () => {
    const tree = route(['Início'], route(undefined, route(['Administração', 'Responsáveis'], route(undefined, null))));

    expect(crumbsOf(tree)).toEqual(['Administração', 'Responsáveis']);
  });

  it('is empty when no route declares a path', () => {
    expect(crumbsOf(route(undefined, null))).toEqual([]);
  });
});
