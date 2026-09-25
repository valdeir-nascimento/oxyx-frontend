import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Notification } from '../../../shared/domain/notification';
import { failure, success } from '../../../shared/application/result';
import { Toaster } from '../../../shared/presentation/ui/toast/toaster';
import { SessionStore } from '../../application/authentication/session-store';
import { SignOutUseCase } from '../../application/authentication/sign-out.usecase';
import { AuthenticatedCaretaker } from '../../domain/authenticated-caretaker';
import { AuthenticatedShell } from './authenticated-shell';

/** Assinatura de `Router.navigate`, só com o que os testes usam. */
type Navigate = (commands: readonly unknown[]) => Promise<boolean>;

/**
 * A casca liga a sessão ao layout compartilhado: o layout recebe nome e perfil por entrada (V-01) e
 * avisa a intenção de sair; quem executa a saída é o caso de uso.
 */
describe('AuthenticatedShell', () => {
  const maria: AuthenticatedCaretaker = {
    id: '7c1f0b2e-3d4a-4f5b-8c9d-0e1f2a3b4c5d',
    fullName: 'Maria Silva',
    role: 'ADMINISTRATOR',
    mustChangePassword: false,
  };

  let execute: Mock;
  let navigate: Mock<Navigate>;

  async function render(
    caretaker: AuthenticatedCaretaker = maria,
  ): Promise<ComponentFixture<AuthenticatedShell>> {
    await TestBed.configureTestingModule({
      imports: [AuthenticatedShell],
      providers: [provideRouter([]), { provide: SignOutUseCase, useValue: { execute } }],
    }).compileComponents();

    navigate = vi.fn<Navigate>().mockResolvedValue(true);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockImplementation(navigate);
    TestBed.inject(SessionStore).remember(caretaker);

    const fixture = TestBed.createComponent(AuthenticatedShell);
    fixture.detectChanges();
    return fixture;
  }

  /** Os itens do menu lateral; a navegação inferior do celular repete os mesmos. */
  function menuLabels(fixture: ComponentFixture<AuthenticatedShell>): (string | undefined)[] {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.side-links a')).map((link) =>
      link.textContent?.trim(),
    );
  }

  async function clickSignOut(fixture: ComponentFixture<AuthenticatedShell>): Promise<void> {
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.logout')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    execute = vi.fn().mockResolvedValue(success(undefined));
  });

  it('shows the name and the role of whoever is in the session', async () => {
    const text = ((await render()).nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Maria Silva');
    expect(text).toContain('Administrador');
  });

  it('labels a common user as such', async () => {
    const text = ((await render({ ...maria, role: 'USER' })).nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Usuário');
  });

  it('hides the caretaker administration from a common user (FR-011)', async () => {
    // Esconder não é a proteção — o backend responde 403 —, mas evita oferecer um caminho que
    // terminaria em recusa.
    const fixture = await render({ ...maria, role: 'USER' });

    expect(menuLabels(fixture)).toEqual(['Início', 'Setores', 'Trocar senha']);
  });

  it('shows the caretaker administration to an administrator', async () => {
    const fixture = await render();

    expect(menuLabels(fixture)).toContain('Responsáveis');
  });

  it('returns to the access screen once the backend invalidated the session', async () => {
    const fixture = await render();

    await clickSignOut(fixture);

    expect(execute).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(['/acesso']);
  });

  it('keeps the person where they are when the sign-out failed, and says why in a toast', async () => {
    // Ir para a tela de acesso sem o backend ter encerrado a sessão faria parecer encerrado o que
    // continua valendo no cookie (FR-004).
    execute.mockResolvedValue(
      failure(
        Notification.of([
          {
            code: 'REQUEST_FAILED',
            message: 'Não houve resposta do servidor. Tente novamente em instantes.',
          },
        ]),
      ),
    );
    const fixture = await render();

    await clickSignOut(fixture);

    expect(navigate).not.toHaveBeenCalled();
    expect(TestBed.inject(Toaster).toasts()).toEqual([
      expect.objectContaining({ message: 'Não houve resposta do servidor. Tente novamente em instantes.', tone: 'danger' }),
    ]);
  });
});
