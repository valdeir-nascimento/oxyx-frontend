import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastStack } from './toast-stack';
import { Toaster } from './toaster';

/** Pilha de toasts: uma região de estado que existe sempre, para cada toast novo ser anunciado. */
describe('ToastStack', () => {
  let fixture: ComponentFixture<ToastStack>;

  function region(): HTMLElement {
    return (fixture.nativeElement as HTMLElement).querySelector('.toasts')!;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ToastStack] });
    fixture = TestBed.createComponent(ToastStack);
    fixture.detectChanges();
  });

  it('is a status region that is there before the first toast', () => {
    // Leitor de tela costuma não anunciar a região que já nasce preenchida (T235).
    expect(region().getAttribute('role')).toBe('status');
    expect(region().children).toHaveLength(0);
  });

  it('shows each toast with its message', () => {
    TestBed.inject(Toaster).show('Responsável cadastrado: Maria Silva.');
    fixture.detectChanges();

    expect(region().querySelector('.toast')?.textContent?.trim()).toBe('Responsável cadastrado: Maria Silva.');
  });

  it('marks a failure with the danger look, and not only by its color', () => {
    // O ícone de alerta distingue a falha de quem não enxerga a cor.
    TestBed.inject(Toaster).show('Não foi possível sair.', 'danger');
    fixture.detectChanges();

    const toast = region().querySelector('.toast')!;
    expect(toast.getAttribute('data-tone')).toBe('danger');
    expect(toast.querySelector('.t-ico')?.classList).toContain('danger');
  });
});
