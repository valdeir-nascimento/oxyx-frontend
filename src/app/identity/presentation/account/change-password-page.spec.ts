import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Notification } from '../../../shared/domain/notification';
import { failure, success } from '../../../shared/application/result';
import { ChangeOwnPasswordUseCase } from '../../application/account/change-password.usecase';
import { SessionStore } from '../../application/authentication/session-store';
import { ChangePasswordPage } from './change-password-page';

/** Assinatura de `Router.navigate`, só com o que os testes usam. */
type Navigate = (commands: readonly unknown[]) => Promise<boolean>;

/**
 * Tela da troca da própria senha. Enquanto a senha provisória valer, é a única tela liberada
 * (FR-025, V-05) — e por isso ela precisa dizer, em português, por que apareceu.
 */
describe('ChangePasswordPage', () => {
  const maria = {
    id: '7c1f0b2e-3d4a-4f5b-8c9d-0e1f2a3b4c5d',
    fullName: 'Maria Silva',
    role: 'ADMINISTRATOR' as const,
    mustChangePassword: false,
  };

  let execute: Mock;
  let navigate: Mock<Navigate>;

  async function render(pending: boolean): Promise<ComponentFixture<ChangePasswordPage>> {
    await TestBed.configureTestingModule({
      imports: [ChangePasswordPage],
      providers: [provideRouter([]), { provide: ChangeOwnPasswordUseCase, useValue: { execute } }],
    }).compileComponents();

    navigate = vi.fn<Navigate>().mockResolvedValue(true);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockImplementation(navigate);
    TestBed.inject(SessionStore).remember({ ...maria, mustChangePassword: pending });

    const fixture = TestBed.createComponent(ChangePasswordPage);
    fixture.detectChanges();
    return fixture;
  }

  function type(fixture: ComponentFixture<ChangePasswordPage>, field: string, value: string): void {
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#' + field);
    input!.value = value;
    input!.dispatchEvent(new Event('input'));
  }

  async function submit(fixture: ComponentFixture<ChangePasswordPage>): Promise<void> {
    (fixture.nativeElement as HTMLElement).querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    execute = vi.fn().mockResolvedValue(success(undefined));
  });

  it('sends the current and the new password to the use case', async () => {
    const fixture = await render(true);
    type(fixture, 'currentPassword', 'GranjaNorte2026');
    type(fixture, 'newPassword', 'PosturaAviario2027');

    await submit(fixture);

    expect(execute).toHaveBeenCalledWith('GranjaNorte2026', 'PosturaAviario2027');
  });

  it('shows each refused field next to its own input', async () => {
    execute.mockResolvedValue(
      failure(
        Notification.of([
          {
            code: 'VALIDATION_FAILED',
            field: 'currentPassword',
            message: 'A senha atual está incorreta.',
          },
          {
            code: 'VALIDATION_FAILED',
            field: 'newPassword',
            message: 'A senha deve ter ao menos 12 caracteres.',
          },
        ]),
      ),
    );
    const fixture = await render(true);

    await submit(fixture);

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('#currentPassword-error')?.textContent).toContain(
      'A senha atual está incorreta.',
    );
    expect(element.querySelector('#newPassword-error')?.textContent).toContain(
      'ao menos 12 caracteres',
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it('says why the screen appeared when the provisional password is still in use', async () => {
    const fixture = await render(true);

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Troque a senha provisória para continuar',
    );
  });

  it('does not claim urgency when the change is voluntary', async () => {
    const fixture = await render(false);

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(
      'Troque a senha provisória para continuar',
    );
  });

  it('goes to the authenticated home once the change succeeds', async () => {
    const fixture = await render(true);

    await submit(fixture);

    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('shows a refusal that belongs to no field, instead of leaving the button looking inert', async () => {
    // É o caso da falha de rede: sem `details`, a violação não tem campo. Sem lugar para ela, a
    // pessoa clicava em "Trocar senha" e não via nada acontecer.
    execute.mockResolvedValue(
      failure(
        Notification.of([
          {
            code: 'REQUEST_FAILED',
            message: 'Não foi possível concluir a operação. Tente novamente.',
          },
        ]),
      ),
    );
    const fixture = await render(true);

    await submit(fixture);

    const summary = (fixture.nativeElement as HTMLElement).querySelector('.error-summary');
    expect(summary?.textContent).toContain('Não foi possível concluir a operação.');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('hides both passwords while they are typed', async () => {
    const element = (await render(true)).nativeElement as HTMLElement;

    expect(element.querySelector<HTMLInputElement>('#currentPassword')!.type).toBe('password');
    expect(element.querySelector<HTMLInputElement>('#newPassword')!.type).toBe('password');
  });
});
