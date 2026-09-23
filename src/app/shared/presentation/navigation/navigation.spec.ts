import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Navigation } from './navigation';

/**
 * FR-011: a navegação expõe apenas as áreas permitidas ao perfil. Esconder o item não é a proteção
 * (quem protege é o backend), mas evita oferecer um caminho que terminaria em 403.
 */
describe('Navigation', () => {
  function linksFor(role: 'ADMINISTRATOR' | 'USER'): string[] {
    const fixture = TestBed.createComponent(Navigation);
    fixture.componentRef.setInput('role', role);
    fixture.detectChanges();
    const anchors = (fixture.nativeElement as HTMLElement).querySelectorAll('a');
    return Array.from(anchors).map((anchor) => anchor.textContent?.trim() ?? '');
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Navigation],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('hides administrative areas from a regular user', () => {
    const links = linksFor('USER');

    expect(links).toContain('Início');
    expect(links).not.toContain('Responsáveis');
  });

  it('shows administrative areas to an administrator', () => {
    expect(linksFor('ADMINISTRATOR')).toContain('Responsáveis');
  });
});
