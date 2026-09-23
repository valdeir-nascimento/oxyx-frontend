import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AccessDenied } from './access-denied';

/**
 * FR-010: a recusa não revela a existência, o conteúdo nem a estrutura do recurso. O backend omite
 * essa informação no 403, e esta tela não pode reintroduzi-la.
 */
describe('AccessDenied', () => {
  async function render(): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [AccessDenied],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(AccessDenied);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows a generic refusal that names no resource or route', async () => {
    const text = (await render()).textContent ?? '';

    expect(text).toContain('Acesso negado');
    expect(text).toContain('Você não tem permissão para executar esta operação.');
    expect(text).not.toMatch(/\/api\/|responsáve|caretaker/i);
  });

  it('offers a way back to the start page', async () => {
    const link = (await render()).querySelector('a');

    expect(link?.getAttribute('href')).toBe('/');
  });
});
