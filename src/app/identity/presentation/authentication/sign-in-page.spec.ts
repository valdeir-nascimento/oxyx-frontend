import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { Notification } from '../../../shared/domain/notification';
import { failure, success } from '../../../shared/application/result';
import { SignInUseCase } from '../../application/authentication/sign-in.usecase';
import { SignInPage } from './sign-in-page';

/** Assinatura de `Router.navigate`, só com o que os testes usam. */
type Navigate = (commands: readonly unknown[]) => Promise<boolean>;

/**
 * A tela não decide nada: coleta o que foi digitado, entrega ao caso de uso e mostra o que voltou.
 * Se uma regra aparecer aqui, ela deixa de valer para quem chama a API por outro caminho.
 */
describe('SignInPage', () => {
  const maria = {
    id: '7c1f0b2e-3d4a-4f5b-8c9d-0e1f2a3b4c5d',
    fullName: 'Maria Silva',
    role: 'USER' as const,
    mustChangePassword: false,
  };

  let execute: Mock;
  let navigate: Mock<Navigate>;

  async function render(queryParams: Record<string, string> = {}): Promise<ComponentFixture<SignInPage>> {
    await TestBed.configureTestingModule({
      imports: [SignInPage],
      providers: [
        provideRouter([]),
        { provide: SignInUseCase, useValue: { execute } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } },
        },
      ],
    }).compileComponents();

    navigate = vi.fn<Navigate>().mockResolvedValue(true);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockImplementation(navigate);

    const fixture = TestBed.createComponent(SignInPage);
    fixture.detectChanges();
    return fixture;
  }

  function type(fixture: ComponentFixture<SignInPage>, field: string, value: string): void {
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#' + field);
    input!.value = value;
    input!.dispatchEvent(new Event('input'));
  }

  async function submit(fixture: ComponentFixture<SignInPage>): Promise<void> {
    (fixture.nativeElement as HTMLElement).querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function textOf(fixture: ComponentFixture<SignInPage>): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  beforeEach(() => {
    execute = vi.fn().mockResolvedValue(success(maria));
  });

  it('sends exactly what was typed, deciding nothing about the identifier', async () => {
    // Distinguir e-mail de celular é decisão do backend; a tela só entrega o que a pessoa digitou.
    const fixture = await render();
    type(fixture, 'identifier', '91988887777');
    type(fixture, 'password', 'GranjaNorte2026');

    await submit(fixture);

    expect(execute).toHaveBeenCalledWith('91988887777', 'GranjaNorte2026');
  });

  it('shows every refused field at once, each one next to its input', async () => {
    // FR-017: corrigir um campo e só então descobrir o outro é o que o requisito proíbe.
    execute.mockResolvedValue(
      failure(
        Notification.of([
          {
            code: 'IDENTIFIER_REQUIRED',
            field: 'identifier',
            message: 'Informe o e-mail ou o celular.',
          },
          { code: 'PASSWORD_REQUIRED', field: 'password', message: 'Informe a senha.' },
        ]),
      ),
    );
    const fixture = await render();

    await submit(fixture);

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('#identifier-error')?.textContent).toContain(
      'Informe o e-mail ou o celular.',
    );
    expect(element.querySelector('#password-error')?.textContent).toContain('Informe a senha.');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows the refusal that belongs to no field at the top of the form', async () => {
    execute.mockResolvedValue(
      failure(
        Notification.of([
          { code: 'INVALID_CREDENTIALS', message: 'E-mail, celular ou senha inválidos.' },
        ]),
      ),
    );
    const fixture = await render();

    await submit(fixture);

    const summary = (fixture.nativeElement as HTMLElement).querySelector('.error-summary');
    expect(summary?.textContent).toContain('E-mail, celular ou senha inválidos.');
  });

  it('shows a violation of a field this screen does not have, instead of swallowing it', async () => {
    // FR-017 manda mostrar todas as falhas. Uma chave de `details` que a tela não conhece não pode
    // sumir em silêncio, senão a pessoa submete de novo sem saber o que corrigir.
    execute.mockResolvedValue(
      failure(
        Notification.of([
          { code: 'VALIDATION_FAILED', field: 'tenant', message: 'Granja não informada.' },
        ]),
      ),
    );
    const fixture = await render();

    await submit(fixture);

    const summary = (fixture.nativeElement as HTMLElement).querySelector('.error-summary');
    expect(summary?.textContent).toContain('Granja não informada.');
    expect(summary?.querySelector('a')).toBeNull();
  });

  it('hands the destination to the route guard, which is where the provisional password is decided', async () => {
    // Repetir aqui a regra do FR-025 criaria dois lugares para manter em sincronia; o guard já
    // prende quem deve a troca.
    execute.mockResolvedValue(success({ ...maria, mustChangePassword: true }));
    const fixture = await render();

    await submit(fixture);

    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('goes to the authenticated area once the entry is accepted', async () => {
    const fixture = await render();

    await submit(fixture);

    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('explains that the session expired when that is why the screen reappeared', async () => {
    // FR-003: o motivo viaja no endereço, então continua explicado depois de um recarregamento.
    expect(textOf(await render({ sessao: 'expirada' }))).toContain('Sua sessão expirou');
  });

  it('says nothing about expiry on an ordinary first visit', async () => {
    expect(textOf(await render())).not.toContain('Sua sessão expirou');
  });

  it('hides the password while it is typed', async () => {
    const fixture = await render();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector<HTMLInputElement>('#identifier')!.type).toBe('text');
    expect(element.querySelector<HTMLInputElement>('#password')!.type).toBe('password');
  });
});
