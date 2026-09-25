import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Notification } from '../../../../shared/domain/notification';
import { failure, success } from '../../../../shared/application/result';
import { Toaster } from '../../../../shared/presentation/ui/toast/toaster';
import { ChangeOwnPasswordUseCase } from '../../../application/account/change-password.usecase';
import { OwnPasswordPage } from './own-password-page';

/** Assinatura de `Router.navigate`, só com o que os testes usam. */
type Navigate = (commands: readonly unknown[]) => Promise<boolean>;

/**
 * Troca da própria senha por vontade própria, pelo menu (US4, T109): uma página dentro da casca, com
 * caminho de volta. A troca obrigatória da senha provisória continua na tela cheia de `/trocar-senha`.
 */
describe('OwnPasswordPage', () => {
  let execute: Mock;
  let navigate: Mock<Navigate>;
  let fixture: ComponentFixture<OwnPasswordPage>;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function type(field: string, value: string): void {
    const input = element().querySelector<HTMLInputElement>('#' + field)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  async function submit(): Promise<void> {
    element().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function render(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [OwnPasswordPage],
      providers: [provideRouter([]), { provide: ChangeOwnPasswordUseCase, useValue: { execute } }],
    }).compileComponents();

    navigate = vi.fn<Navigate>().mockResolvedValue(true);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockImplementation(navigate);

    fixture = TestBed.createComponent(OwnPasswordPage);
    document.body.appendChild(element());
    fixture.detectChanges();
  }

  beforeEach(() => {
    execute = vi.fn().mockResolvedValue(success(undefined));
  });

  afterEach(() => element().remove());

  it('is a page of the account area, titled by what it does', async () => {
    await render();

    expect(element().querySelector('.eyebrow')?.textContent?.trim()).toBe('Minha conta');
    expect(element().querySelector('h1')?.textContent?.trim()).toBe('Trocar senha');
  });

  it('sends the current and the new password to the use case', async () => {
    await render();
    type('currentPassword', 'GranjaNorte2026');
    type('newPassword', 'PosturaAviario2027');

    await submit();

    expect(execute).toHaveBeenCalledWith('GranjaNorte2026', 'PosturaAviario2027');
  });

  it('confirms the change in a toast and goes back to the home', async () => {
    await render();

    await submit();

    expect(TestBed.inject(Toaster).toasts().map((toast) => toast.message)).toEqual(['Senha trocada.']);
    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('stays on the page with the refusal next to the field and the summary focused', async () => {
    execute.mockResolvedValue(
      failure(
        Notification.of([
          { code: 'VALIDATION_FAILED', field: 'currentPassword', message: 'A senha atual está incorreta.' },
        ]),
      ),
    );
    await render();

    await submit();

    expect(element().querySelector('#currentPassword-error')?.textContent).toContain('A senha atual está incorreta.');
    expect(document.activeElement).toBe(element().querySelector('.error-summary'));
    expect(navigate).not.toHaveBeenCalled();
    expect(TestBed.inject(Toaster).toasts()).toEqual([]);
  });

  it('goes back to the home on cancel, without changing anything', async () => {
    await render();

    Array.from(element().querySelectorAll('button'))
      .find((button) => button.textContent?.trim() === 'Cancelar')!
      .click();
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(['/']);
    expect(execute).not.toHaveBeenCalled();
  });

  it('does not claim the urgency of the provisional password', async () => {
    await render();

    expect(element().textContent).not.toContain('senha provisória');
  });
});
