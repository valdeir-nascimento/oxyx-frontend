import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { Notification } from '../../../../shared/domain/notification';
import { failure, success } from '../../../../shared/application/result';
import { FindCaretakerByIdUseCase } from '../../../application/caretaker/find-caretaker-by-id.usecase';
import { RegisterCaretakerUseCase } from '../../../application/caretaker/register-caretaker.usecase';
import { UpdateCaretakerUseCase } from '../../../application/caretaker/update-caretaker.usecase';
import { CaretakerDetail } from '../../../domain/caretaker';
import { CaretakerNotice } from '../caretaker-notice';
import { CaretakerFormPage } from './caretaker-form-page';

/** Assinatura de `Router.navigate`, só com o que os testes usam. */
type Navigate = (commands: readonly unknown[]) => Promise<boolean>;

/**
 * Formulário de cadastro e de edição de responsável (T091): todas as falhas de uma vez, cada uma
 * junto do seu campo, e o resumo da recusa com o foco (FR-017, T234).
 */
describe('CaretakerFormPage', () => {
  const joao: CaretakerDetail = {
    id: '9f8e7d6c-5b4a-4938-2716-0f1e2d3c4b5a',
    fullName: 'João Pereira de Souza',
    cpf: '52998224725',
    email: 'joao.pereira@ovyx.com.br',
    mobilePhone: '91991234567',
    role: 'USER',
    status: 'ACTIVE',
    createdAt: '2026-09-18T13:45:10Z',
    updatedAt: '2026-09-18T13:45:10Z',
  };

  let register: Mock;
  let update: Mock;
  let find: Mock;
  let navigate: Mock<Navigate>;
  let fixture: ComponentFixture<CaretakerFormPage>;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function field(id: string): HTMLInputElement {
    return element().querySelector<HTMLInputElement>('#' + id)!;
  }

  function type(id: string, value: string): void {
    field(id).value = value;
    field(id).dispatchEvent(new Event('input'));
  }

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function submitButton(): HTMLButtonElement {
    return element().querySelector<HTMLButtonElement>('form button[type="submit"]')!;
  }

  async function submit(): Promise<void> {
    element().querySelector('form')!.dispatchEvent(new Event('submit'));
    await settle();
  }

  async function render(id?: string): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [CaretakerFormPage],
      providers: [
        provideRouter([]),
        { provide: RegisterCaretakerUseCase, useValue: { execute: register } },
        { provide: UpdateCaretakerUseCase, useValue: { execute: update } },
        { provide: FindCaretakerByIdUseCase, useValue: { execute: find } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } },
        },
      ],
    }).compileComponents();
    navigate = vi.fn<Navigate>().mockResolvedValue(true);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockImplementation(navigate);

    fixture = TestBed.createComponent(CaretakerFormPage);
    document.body.appendChild(element());
    fixture.detectChanges();
    await settle();
  }

  beforeEach(() => {
    register = vi.fn().mockResolvedValue(success(joao));
    update = vi.fn().mockResolvedValue(success(joao));
    find = vi.fn().mockResolvedValue(success(joao));
  });

  afterEach(() => element().remove());

  it('registers what was typed, with the common user as the default role', async () => {
    await render();
    type('fullName', 'João Pereira de Souza');
    type('cpf', '529.982.247-25');
    type('email', 'joao.pereira@ovyx.com.br');
    type('mobilePhone', '(91) 99123-4567');
    type('password', 'AviarioSul2026');

    await submit();

    expect(register).toHaveBeenCalledWith({
      fullName: 'João Pereira de Souza',
      cpf: '529.982.247-25',
      email: 'joao.pereira@ovyx.com.br',
      mobilePhone: '(91) 99123-4567',
      password: 'AviarioSul2026',
      role: 'USER',
    });
  });

  it('goes back to the list, which says the caretaker was registered', async () => {
    await render();

    await submit();

    expect(navigate).toHaveBeenCalledWith(['/responsaveis']);
    expect(TestBed.inject(CaretakerNotice).take()).toBe('Responsável cadastrado: João Pereira de Souza.');
  });

  it('shows every refused field at once, each next to its own input, and focuses the summary', async () => {
    register.mockResolvedValue(
      failure(
        Notification.of([
          { code: 'VALIDATION_FAILED', field: 'fullName', message: 'Informe o nome completo.' },
          { code: 'VALIDATION_FAILED', field: 'cpf', message: 'CPF inválido.' },
          { code: 'VALIDATION_FAILED', field: 'email', message: 'Informe um e-mail em formato válido.' },
        ]),
      ),
    );
    await render();

    await submit();

    const summary = element().querySelector('.error-summary')!;
    expect(Array.from(summary.querySelectorAll('a')).map((link) => link.getAttribute('href'))).toEqual([
      '#fullName',
      '#cpf',
      '#email',
    ]);
    expect(element().querySelector('#cpf-error')?.textContent).toContain('CPF inválido.');
    expect(document.activeElement).toBe(summary);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('loads the caretaker into the form to edit it, without a password field', async () => {
    await render(joao.id);

    expect(find).toHaveBeenCalledWith(joao.id);
    expect(field('fullName').value).toBe('João Pereira de Souza');
    expect(field('cpf').value).toBe('52998224725');
    expect(element().querySelector('#password')).toBeNull();
  });

  it('saves the changes by the caretaker id and goes back to the list', async () => {
    await render(joao.id);
    const role = element().querySelector<HTMLSelectElement>('#role')!;
    role.value = 'ADMINISTRATOR';
    role.dispatchEvent(new Event('change'));

    await submit();

    expect(update).toHaveBeenCalledWith(joao.id, {
      fullName: joao.fullName,
      cpf: joao.cpf,
      email: joao.email,
      mobilePhone: joao.mobilePhone,
      role: 'ADMINISTRATOR',
    });
    expect(navigate).toHaveBeenCalledWith(['/responsaveis']);
  });

  it('explains a refused demotion of the last administrator on the role itself', async () => {
    update.mockResolvedValue(
      failure(
        Notification.of([
          {
            code: 'LAST_ADMINISTRATOR',
            field: 'role',
            message: 'O sistema precisa de ao menos um administrador ativo.',
          },
        ]),
      ),
    );
    await render(joao.id);

    await submit();

    expect(element().querySelector('#role-error')?.textContent).toContain(
      'O sistema precisa de ao menos um administrador ativo.',
    );
  });

  it('does not let the browser block the form before the summary can list every failure', async () => {
    // A validação nativa barrava o envio no primeiro e-mail malformado, com um balão fora do padrão,
    // e o resumo nunca aparecia (QA da T275).
    await render();

    expect(element().querySelector('form')!.noValidate).toBe(true);
  });

  it('keeps the submit button busy while the registration runs, so it is not sent twice', async () => {
    register.mockReturnValue(new Promise(() => undefined));
    await render();

    submitButton().click();
    await settle();

    expect(submitButton().disabled).toBe(true);
  });

  it('ignores a second submission while the first one runs, as when Enter is pressed again', async () => {
    register.mockReturnValue(new Promise(() => undefined));
    await render();

    await submit();
    await submit();

    expect(register).toHaveBeenCalledOnce();
  });

  it('says the changes were saved, and not that someone was registered, after an edit', async () => {
    await render(joao.id);

    await submit();

    expect(TestBed.inject(CaretakerNotice).take()).toBe('Alterações salvas: João Pereira de Souza.');
  });

  it('does not link a refusal of the password on edit, where there is no password field', async () => {
    update.mockResolvedValue(
      failure(
        Notification.of([
          { code: 'VALIDATION_FAILED', field: 'password', message: 'A senha deve ter ao menos 12 caracteres.' },
        ]),
      ),
    );
    await render(joao.id);

    await submit();

    expect(element().querySelector('.error-summary a')).toBeNull();
  });

  it('shows nothing to submit while the caretaker is still loading', async () => {
    // Vazio e enviável durante a carga, o formulário gravaria em branco por cima dos dados.
    find.mockReturnValue(new Promise(() => undefined));

    await render(joao.id);

    expect(element().querySelector('form')).toBeNull();
    expect(element().querySelector('[role="status"]')?.textContent?.trim()).toBe('Carregando…');
  });

  it('shows why the caretaker could not be loaded, instead of an empty form', async () => {
    find.mockResolvedValue(
      failure(
        Notification.of([
          { code: 'REQUEST_FAILED', message: 'Não foi possível concluir a operação. Tente novamente.' },
        ]),
      ),
    );

    await render(joao.id);

    expect(element().querySelector('.error-summary')?.textContent).toContain(
      'Não foi possível concluir a operação. Tente novamente.',
    );
    expect(element().querySelector('form')).toBeNull();
  });

  it('treats an address that carries no caretaker id as a caretaker that does not exist', async () => {
    // Forjado com "../", o endereço levava a tela a chamar outro endpoint da API.
    await render('..%2F..%2Fme%2Fpassword');

    expect(find).not.toHaveBeenCalled();
    expect(element().textContent).toContain('Responsável não encontrado.');
  });

  it('treats an id the backend refuses as malformed as a caretaker that does not exist', async () => {
    // O 400 traz "caretakerId" em details, que a tela mostrava como se fosse uma mensagem.
    find.mockResolvedValue(
      failure(Notification.of([{ code: 'VALIDATION_FAILED', message: "Valor inválido para o parâmetro 'caretakerId'." }])),
    );

    await render(joao.id);

    expect(element().textContent).toContain('Responsável não encontrado.');
    expect(element().querySelector('form')).toBeNull();
  });

  it('says so when the caretaker does not exist, instead of an empty form', async () => {
    find.mockResolvedValue(
      failure(
        Notification.of([{ code: 'CARETAKER_NOT_FOUND', message: 'Responsável não encontrado.' }]),
      ),
    );
    await render(joao.id);

    expect(element().textContent).toContain('Responsável não encontrado.');
    expect(element().querySelector('form')).toBeNull();
  });
});
