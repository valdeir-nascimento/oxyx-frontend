import type { Mock } from 'vitest';
import { Location } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { Notification } from '../../../../shared/domain/notification';
import { failure, success } from '../../../../shared/application/result';
import { ResetPasswordUseCase } from '../../../application/recovery/reset-password.usecase';
import { VerifyRecoveryLinkUseCase } from '../../../application/recovery/verify-recovery-link.usecase';
import { ResetPasswordPage } from './reset-password-page';

/** Assinatura de `Router.navigate`, só com o que os testes usam. */
type Navigate = (commands: readonly unknown[], extras?: unknown) => Promise<boolean>;

const CODE = '3q2-7wq9Xk1vF0bQm8ZsY4tLr6NcHe2JpWdUaGo5iKx';

const INVALID_LINK = Notification.of([
  {
    code: 'RECOVERY_LINK_INVALID',
    message: 'Este link de recuperação não vale mais. Peça um novo na tela de entrada.',
  },
]);

/**
 * A redefinição pelo link (US2 da 012): o código vem do fragmento, sai do endereço, e o link é conferido antes de a
 * tela pedir a senha nova.
 */
describe('ResetPasswordPage', () => {
  let verify: Mock;
  let reset: Mock;
  let navigate: Mock<Navigate>;
  let replaceState: Mock;
  let fragments: BehaviorSubject<string | null>;

  async function render(
    fragment: string | null = CODE,
  ): Promise<ComponentFixture<ResetPasswordPage>> {
    fragments = new BehaviorSubject<string | null>(fragment);
    await TestBed.configureTestingModule({
      imports: [ResetPasswordPage],
      providers: [
        provideRouter([]),
        { provide: VerifyRecoveryLinkUseCase, useValue: { execute: verify } },
        { provide: ResetPasswordUseCase, useValue: { execute: reset } },
        { provide: ActivatedRoute, useValue: { snapshot: { fragment }, fragment: fragments } },
      ],
    }).compileComponents();

    navigate = vi.fn<Navigate>().mockResolvedValue(true);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockImplementation(navigate);
    replaceState = vi.fn();
    vi.spyOn(TestBed.inject(Location), 'replaceState').mockImplementation(replaceState);

    const fixture = TestBed.createComponent(ResetPasswordPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  function page(fixture: ComponentFixture<ResetPasswordPage>): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function type(fixture: ComponentFixture<ResetPasswordPage>, value: string): void {
    const input = page(fixture).querySelector<HTMLInputElement>('#newPassword')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  async function submit(fixture: ComponentFixture<ResetPasswordPage>): Promise<void> {
    page(fixture).querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    verify = vi.fn().mockResolvedValue(success(undefined));
    reset = vi.fn().mockResolvedValue(success('signed-out'));
  });

  it('reads the code from the fragment, takes it out of the address and checks the link', async () => {
    await render();

    expect(verify).toHaveBeenCalledWith(CODE);
    expect(replaceState).toHaveBeenCalledWith('/redefinir-senha');
  });

  it('asks for the new password once the link holds, with the way to show it', async () => {
    const fixture = await render();

    const input = page(fixture).querySelector<HTMLInputElement>('#newPassword');
    expect(input?.type).toBe('password');
    expect(input?.autocomplete).toBe('new-password');
    expect(page(fixture).textContent).toContain('Redefinir senha');
  });

  it('says the link no longer holds, offering another one, with the focus on the message', async () => {
    verify.mockResolvedValue(failure(INVALID_LINK));

    const fixture = await render();

    expect(page(fixture).textContent).toContain('Este link de recuperação não vale mais.');
    expect(page(fixture).querySelector('a[href="/esqueci-a-senha"]')?.textContent?.trim()).toBe(
      'Pedir outro link',
    );
    expect(page(fixture).querySelector('form')).toBeNull();
    expect(document.activeElement?.textContent?.trim()).toBe('Link inválido');
  });

  it('treats an address without the code as an invalid link, asking nothing to the backend', async () => {
    const fixture = await render(null);

    expect(verify).not.toHaveBeenCalled();
    expect(page(fixture).textContent).toContain('Link inválido');
  });

  it('sends the code and the new password, and goes to the sign-in screen with the notice', async () => {
    const fixture = await render();
    type(fixture, 'PosturaAviario2027');

    await submit(fixture);

    expect(reset).toHaveBeenCalledWith(CODE, 'PosturaAviario2027');
    expect(navigate).toHaveBeenCalledWith(['/acesso'], { queryParams: { senha: 'redefinida' } });
  });

  it('shows every violation of the policy in the summary at the top, keeping the form', async () => {
    reset.mockResolvedValue(
      failure(
        Notification.of([
          {
            code: 'VALIDATION_FAILED',
            field: 'newPassword',
            message:
              'A senha deve ter ao menos 12 caracteres. A senha deve conter ao menos um dígito.',
          },
        ]),
      ),
    );
    const fixture = await render();
    type(fixture, 'curta');

    await submit(fixture);

    expect(page(fixture).querySelector('ovyx-error-summary')?.textContent).toContain(
      'ao menos um dígito',
    );
    expect(page(fixture).querySelector('form')).not.toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('confirms the reset in place to whoever stays signed in with another account (QA D-01)', async () => {
    reset.mockResolvedValue(success('still-signed-in'));
    const fixture = await render();
    type(fixture, 'PosturaAviario2027');

    await submit(fixture);

    expect(navigate).not.toHaveBeenCalled();
    expect(page(fixture).textContent).toContain(
      'A conta que está conectada neste navegador continua conectada.',
    );
    expect(page(fixture).querySelector('a[href="/"]')?.textContent?.trim()).toBe('Voltar ao Ovyx');
    expect(document.activeElement?.textContent?.trim()).toBe('Senha redefinida');
  });

  it('reads and checks a new link opened in the same tab, taking it out of the address (QA O-3)', async () => {
    verify.mockResolvedValueOnce(failure(INVALID_LINK));
    const fixture = await render();
    expect(page(fixture).textContent).toContain('Link inválido');
    const newer = 'Zz9-7wq9Xk1vF0bQm8ZsY4tLr6NcHe2JpWdUaGo5iKx';

    fragments.next(newer);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(verify).toHaveBeenLastCalledWith(newer);
    expect(replaceState).toHaveBeenCalledTimes(2);
    expect(page(fixture).querySelector('#newPassword')).not.toBeNull();
  });

  it('ignores the answer about a link that a newer one replaced in the same tab (revisão 2)', async () => {
    let answerOlder!: (value: unknown) => void;
    verify.mockReturnValueOnce(new Promise((resolve) => (answerOlder = resolve)));
    const fixture = await render();
    const newer = 'Zz9-7wq9Xk1vF0bQm8ZsY4tLr6NcHe2JpWdUaGo5iKx';

    fragments.next(newer);
    await fixture.whenStable();
    answerOlder(failure(INVALID_LINK));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(verify).toHaveBeenLastCalledWith(newer);
    expect(page(fixture).querySelector('#newPassword')).not.toBeNull();
    expect(page(fixture).textContent).not.toContain('Link inválido');
  });

  it('turns to the invalid link message when the link died before the new password was sent', async () => {
    reset.mockResolvedValue(failure(INVALID_LINK));
    const fixture = await render();
    type(fixture, 'PosturaAviario2027');

    await submit(fixture);

    expect(page(fixture).textContent).toContain('Link inválido');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('keeps the form, with the warning, when the check failed for another reason than the link', async () => {
    verify.mockResolvedValue(
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

    expect(page(fixture).querySelector('form')).not.toBeNull();
    expect(page(fixture).textContent).toContain('Não houve resposta do servidor.');
  });
});
