import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Notification } from '../../../../shared/domain/notification';
import { failure, success } from '../../../../shared/application/result';
import { ChangeOwnPasswordUseCase } from '../../../application/account/change-password.usecase';
import { ChangePasswordForm } from './change-password-form';

/**
 * Formulário da troca da própria senha, o mesmo na tela cheia da senha provisória e na página da
 * conta (US4): recolhe as duas senhas, entrega ao caso de uso, mostra a recusa e avisa quando deu
 * certo. Para onde ir depois é decisão de cada tela.
 */
describe('ChangePasswordForm', () => {
  let execute: Mock;
  let fixture: ComponentFixture<ChangePasswordForm>;

  function form(): HTMLFormElement {
    return (fixture.nativeElement as HTMLElement).querySelector('form')!;
  }

  function submitButton(): HTMLButtonElement {
    return form().querySelector<HTMLButtonElement>('button[type="submit"]')!;
  }

  function cancelButton(): HTMLButtonElement | undefined {
    return Array.from(form().querySelectorAll('button')).find((button) => button.textContent?.trim() === 'Cancelar');
  }

  async function submit(): Promise<void> {
    form().dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function listenTo(event: 'changed' | 'cancelled'): ReturnType<typeof vi.fn> {
    const listener = vi.fn();
    fixture.componentInstance[event].subscribe(listener);
    return listener;
  }

  function render(variant?: 'screen' | 'panel'): ReturnType<typeof vi.fn> {
    TestBed.configureTestingModule({
      imports: [ChangePasswordForm],
      providers: [{ provide: ChangeOwnPasswordUseCase, useValue: { execute } }],
    });
    fixture = TestBed.createComponent(ChangePasswordForm);
    if (variant) {
      fixture.componentRef.setInput('variant', variant);
    }
    const changed = vi.fn();
    fixture.componentInstance.changed.subscribe(changed);
    fixture.detectChanges();
    return changed;
  }

  beforeEach(() => {
    execute = vi.fn().mockResolvedValue(success(undefined));
  });

  it('reports the change once the use case accepts it', async () => {
    const changed = render();

    await submit();

    expect(changed).toHaveBeenCalledOnce();
  });

  it('reports nothing when the change is refused', async () => {
    execute.mockResolvedValue(
      failure(Notification.of([{ code: 'VALIDATION_FAILED', field: 'newPassword', message: 'Senha fraca.' }])),
    );
    const changed = render();

    await submit();

    expect(changed).not.toHaveBeenCalled();
  });

  it('keeps the button busy while the change runs, so it is not sent twice', async () => {
    execute.mockReturnValue(new Promise(() => undefined));
    render();

    await submit();
    await submit();

    expect(submitButton().disabled).toBe(true);
    expect(execute).toHaveBeenCalledOnce();
  });

  it('lets the person correct and send again after a refusal (FR-017)', async () => {
    // Sem soltar o estado ocupado, a primeira recusa travava o formulário: corrigir e reenviar ficava
    // impossível, justamente o caminho dos cenários 2 e 3 da US4.
    execute
      .mockResolvedValueOnce(
        failure(Notification.of([{ code: 'VALIDATION_FAILED', field: 'currentPassword', message: 'A senha atual está incorreta.' }])),
      )
      .mockResolvedValueOnce(success(undefined));
    const changed = render();

    await submit();
    expect(submitButton().disabled).toBe(false);
    await submit();

    expect(execute).toHaveBeenCalledTimes(2);
    expect(changed).toHaveBeenCalledOnce();
  });

  it('is a form the browser does not validate, so every refusal comes from the backend at once', () => {
    render();

    expect(form().noValidate).toBe(true);
  });

  it('takes the look of the access screens by default, with no way to cancel', () => {
    // Na troca obrigatória não há para onde voltar: é a única tela liberada (FR-025).
    render();

    expect(form().classList).toContain('login-form');
    expect(cancelButton()).toBeUndefined();
  });

  it('takes the look of a panel inside the shell when asked', () => {
    render('panel');

    expect(form().classList).toContain('panel');
    expect(form().classList).not.toContain('login-form');
  });

  it('reports the cancellation in the panel, without sending anything', () => {
    render('panel');
    const cancelled = listenTo('cancelled');

    cancelButton()!.click();

    expect(cancelled).toHaveBeenCalledOnce();
    expect(execute).not.toHaveBeenCalled();
  });

  it('cannot be cancelled while the change runs, since the result is on its way', async () => {
    // Saindo no meio do envio, a senha mudava no servidor e a pessoa, sem o toast, achava que tinha
    // cancelado (revisão da US4).
    execute.mockReturnValue(new Promise(() => undefined));
    render('panel');
    const cancelled = listenTo('cancelled');

    await submit();
    cancelButton()!.click();

    expect(cancelButton()!.disabled).toBe(true);
    expect(cancelled).not.toHaveBeenCalled();
  });
});
