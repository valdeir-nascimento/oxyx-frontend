import type { Mock } from 'vitest';
import { WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Notification } from '../../../shared/domain/notification';
import { failure, success } from '../../../shared/application/result';
import { Toaster } from '../../../shared/presentation/ui/toast/toaster';
import { SessionStore } from '../../application/authentication/session-store';
import { SignOutUseCase } from '../../application/authentication/sign-out.usecase';
import { AuthenticatedCaretaker } from '../../domain/authenticated-caretaker';
import { AuthenticatedShell } from './authenticated-shell';
import { ChooseThemeUseCase } from '../../application/account/choose-theme.usecase';
import { THEME_DISPLAY } from '../../../shared/application/theme-display';
import { ThemePreference } from '../../../shared/domain/theme-preference';

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
    theme: 'SYSTEM',
  };

  let execute: Mock;
  let chooseTheme: Mock;
  let navigate: Mock<Navigate>;
  /** O tema em vigor na tela, como a porta o mostra. */
  let current: WritableSignal<ThemePreference>;

  async function render(
    caretaker: AuthenticatedCaretaker = maria,
  ): Promise<ComponentFixture<AuthenticatedShell>> {
    await TestBed.configureTestingModule({
      imports: [AuthenticatedShell],
      providers: [
        provideRouter([]),
        { provide: SignOutUseCase, useValue: { execute } },
        { provide: ChooseThemeUseCase, useValue: { execute: chooseTheme } },
        { provide: THEME_DISPLAY, useValue: { apply: (preference: ThemePreference) => current.set(preference), current } },
      ],
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
    current = signal<ThemePreference>('SYSTEM');
    // Como o caso de uso de verdade, aplica o tema na tela antes de ir à rede.
    chooseTheme = vi.fn((preference: ThemePreference) => {
      current.set(preference);
      return Promise.resolve(success(undefined));
    });
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

    expect(menuLabels(fixture)).toEqual(['Início', 'Setores', 'Fórmulas', 'Trocar senha']);
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

  // ---------------------------------------------------------------- tema (011)

  function themeButton(fixture: ComponentFixture<AuthenticatedShell>): HTMLButtonElement {
    return (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.topbar button[aria-haspopup]')!;
  }

  it('puts the theme picker in the top bar', async () => {
    const fixture = await render();

    expect(themeButton(fixture).getAttribute('aria-label')).toBe('Tema: Igual ao sistema');
  });

  it('chooses the theme through the use case, and shows the new choice', async () => {
    const fixture = await render();
    themeButton(fixture).click();
    fixture.detectChanges();

    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('[role="menuitemradio"]'))
      .find((option) => option.textContent?.trim() === 'Escuro')!
      .click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(chooseTheme).toHaveBeenCalledWith('DARK');
    expect(themeButton(fixture).getAttribute('aria-label')).toBe('Tema: Escuro');
  });

  it('shows the theme in effect on the page, not the one of the account kept since the sign-in (011, QA D2)', async () => {
    // A casca recriada (de volta do "Acesso negado", por exemplo) depois de uma escolha: a sessão ainda guarda o tema
    // da entrada.
    current.set('LIGHT');

    const fixture = await render({ ...maria, theme: 'DARK' });

    expect(themeButton(fixture).getAttribute('aria-label')).toBe('Tema: Claro');
  });

  it('follows the theme chosen in another tab of the same browser (011, QA D2)', async () => {
    const fixture = await render();

    current.set('DARK');
    fixture.detectChanges();

    expect(themeButton(fixture).getAttribute('aria-label')).toBe('Tema: Escuro');
  });

  it('tells the person when the theme could not be saved in the account, and keeps it on the page (011)', async () => {
    chooseTheme.mockImplementation((preference: ThemePreference) => {
      current.set(preference);
      return Promise.resolve(failure(Notification.of([{ code: 'UNAUTHENTICATED', message: 'Sessão expirada.' }])));
    });
    const fixture = await render();
    themeButton(fixture).click();
    fixture.detectChanges();

    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('[role="menuitemradio"]'))
      .find((option) => option.textContent?.trim() === 'Escuro')!
      .click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(TestBed.inject(Toaster).toasts().map((toast) => toast.message)).toEqual([
      'Tema aplicado só neste aparelho; não foi possível guardar na sua conta.',
    ]);
    expect(themeButton(fixture).getAttribute('aria-label')).toBe('Tema: Escuro');
  });
});
