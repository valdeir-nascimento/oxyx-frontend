import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Notification } from '../../../../shared/domain/notification';
import { failure, success } from '../../../../shared/application/result';
import { RequestRecoveryUseCase } from '../../../application/recovery/request-recovery.usecase';
import { ForgotPasswordPage } from './forgot-password-page';

/**
 * Esqueci a senha (US1 da 012): a tela entrega o e-mail ao caso de uso e mostra o que voltou. Depois do envio, diz o
 * mesmo para qualquer e-mail, porque não sabe se a conta existe.
 */
describe('ForgotPasswordPage', () => {
  let execute: Mock;

  async function render(): Promise<ComponentFixture<ForgotPasswordPage>> {
    await TestBed.configureTestingModule({
      imports: [ForgotPasswordPage],
      providers: [provideRouter([]), { provide: RequestRecoveryUseCase, useValue: { execute } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(ForgotPasswordPage);
    fixture.detectChanges();
    return fixture;
  }

  function page(fixture: ComponentFixture<ForgotPasswordPage>): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function type(fixture: ComponentFixture<ForgotPasswordPage>, value: string): void {
    const input = page(fixture).querySelector<HTMLInputElement>('#email')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  async function submit(fixture: ComponentFixture<ForgotPasswordPage>): Promise<void> {
    page(fixture).querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    execute = vi.fn().mockResolvedValue(success(undefined));
  });

  it('sends the email exactly as it was typed', async () => {
    const fixture = await render();
    type(fixture, 'Marina.Costa@ovyx.com.br');

    await submit(fixture);

    expect(execute).toHaveBeenCalledWith('Marina.Costa@ovyx.com.br');
  });

  it('says the same thing for any email once sent, in place of the form, with the focus on it', async () => {
    const fixture = await render();
    type(fixture, 'marina.costa@ovyx.com.br');

    await submit(fixture);

    const text = page(fixture).textContent ?? '';
    expect(text).toContain(
      'Se houver uma conta ativa com esse e-mail, enviamos um link para definir a nova senha. Ele vale por 30 minutos.',
    );
    expect(page(fixture).querySelector('form')).toBeNull();
    expect(document.activeElement?.textContent?.trim()).toBe('Verifique seu e-mail');
  });

  it('shows the refusal of the email in the summary at the top and next to the field', async () => {
    execute.mockResolvedValue(
      failure(
        Notification.of([
          {
            code: 'VALIDATION_FAILED',
            field: 'email',
            message: 'Informe um e-mail em formato válido.',
          },
        ]),
      ),
    );
    const fixture = await render();
    type(fixture, 'marina');

    await submit(fixture);

    const summary = page(fixture).querySelector('ovyx-error-summary');
    expect(summary?.textContent).toContain('Informe um e-mail em formato válido.');
    expect(page(fixture).querySelector('form')).not.toBeNull();
    expect(page(fixture).textContent).not.toContain('Verifique seu e-mail');
  });

  it('keeps the button busy while the request is on its way', async () => {
    let answer!: (value: unknown) => void;
    execute.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    const fixture = await render();
    type(fixture, 'marina.costa@ovyx.com.br');

    page(fixture).querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(page(fixture).querySelector('button[type="submit"]')?.getAttribute('aria-busy')).toBe(
      'true',
    );
    answer(success(undefined));
    await fixture.whenStable();
  });

  it('offers the way back to the sign-in screen, before and after sending', async () => {
    const fixture = await render();
    expect(page(fixture).querySelector('a[href="/acesso"]')?.textContent?.trim()).toBe(
      'Voltar à entrada',
    );

    type(fixture, 'marina.costa@ovyx.com.br');
    await submit(fixture);

    expect(page(fixture).querySelector('a[href="/acesso"]')?.textContent?.trim()).toBe(
      'Voltar à entrada',
    );
  });
});
