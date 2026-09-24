import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthenticatedLayout } from './authenticated-layout';

describe('AuthenticatedLayout', () => {
  async function render() {
    await TestBed.configureTestingModule({
      imports: [AuthenticatedLayout],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(AuthenticatedLayout);
    fixture.componentRef.setInput('fullName', 'Maria Silva');
    fixture.componentRef.setInput('roleLabel', 'Administrador');
    fixture.componentRef.setInput('menuItems', [{ label: 'Início', route: '/' }]);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the name, the role label and the menu it receives', async () => {
    const text = ((await render()).nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Maria Silva');
    expect(text).toContain('Administrador');
    expect(text).toContain('Início');
  });

  it('announces the sign-out intent without performing it itself', async () => {
    // O layout não conhece o contexto identity nem faz chamada HTTP: apenas avisa a intenção.
    const fixture = await render();
    const signOut = vi.fn();
    fixture.componentInstance.signOut.subscribe(signOut);

    (fixture.nativeElement as HTMLElement).querySelector('button')?.click();

    expect(signOut).toHaveBeenCalledOnce();
  });
});
