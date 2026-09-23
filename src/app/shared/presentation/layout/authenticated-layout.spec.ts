import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthenticatedLayout } from './authenticated-layout';

describe('AuthenticatedLayout', () => {
  async function render(role: 'ADMINISTRATOR' | 'USER') {
    await TestBed.configureTestingModule({
      imports: [AuthenticatedLayout],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(AuthenticatedLayout);
    fixture.componentRef.setInput('fullName', 'Maria Silva');
    fixture.componentRef.setInput('role', role);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the caretaker name and the role in Portuguese', async () => {
    const fixture = await render('ADMINISTRATOR');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Maria Silva');
    expect(text).toContain('Administrador');
  });

  it('labels a regular user as such', async () => {
    const text = ((await render('USER')).nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Usuário');
  });

  it('announces the sign-out intent without performing it itself', async () => {
    // O layout não conhece o contexto identity nem faz chamada HTTP: apenas avisa a intenção.
    const fixture = await render('USER');
    const signOut = vi.fn();
    fixture.componentInstance.signOut.subscribe(signOut);

    (fixture.nativeElement as HTMLElement).querySelector('button')?.click();

    expect(signOut).toHaveBeenCalledOnce();
  });
});
