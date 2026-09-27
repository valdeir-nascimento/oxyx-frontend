import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { failure, success } from '../../../../shared/application/result';
import { Notification } from '../../../../shared/domain/notification';
import { Toaster } from '../../../../shared/presentation/ui/toast/toaster';
import { FindSectorByIdUseCase } from '../../../application/sector/find-sector-by-id.usecase';
import { RegisterSectorUseCase } from '../../../application/sector/register-sector.usecase';
import { UpdateSectorUseCase } from '../../../application/sector/update-sector.usecase';
import { Sector } from '../../../domain/sector';
import { SectorChanges } from '../sector-changes';
import { SectorFormDialog } from './sector-form-dialog';

/** Assinatura de `Router.navigate`, só com o que os testes usam. */
type Navigate = (commands: readonly unknown[]) => Promise<boolean>;

/**
 * Diálogo de cadastro e de edição de setor (US1; FR-001, FR-003, FR-017, FR-020): todas as falhas de
 * uma vez, cada uma junto do seu campo, e fechar é voltar à lista.
 */
describe('SectorFormDialog', () => {
  const galpao: Sector = {
    id: '3f6c2b1a-8d4e-4c7f-9a2b-1e5d7c9f0a11',
    name: 'Codornas — Galpão 1',
    description: 'Codornas japonesas em postura, baterias A a D',
    status: 'ACTIVE',
    activeCageCount: 48,
    birdCount: 2400,
    batteries: ['A', 'B', 'C', 'D'],
    createdAt: '2026-09-20T10:15:00Z',
    updatedAt: '2026-09-24T17:40:12Z',
  };

  let register: Mock;
  let update: Mock;
  let find: Mock;
  let navigate: Mock<Navigate>;
  let fixture: ComponentFixture<SectorFormDialog>;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function field(id: string): HTMLInputElement | HTMLTextAreaElement {
    return element().querySelector<HTMLInputElement | HTMLTextAreaElement>('#' + id)!;
  }

  function type(id: string, value: string): void {
    field(id).value = value;
    field(id).dispatchEvent(new Event('input'));
  }

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function submit(): Promise<void> {
    element().querySelector('form')!.dispatchEvent(new Event('submit'));
    await settle();
  }

  function button(text: string): HTMLButtonElement {
    return Array.from(element().querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === text,
    )!;
  }

  function toasts(): readonly string[] {
    return TestBed.inject(Toaster)
      .toasts()
      .map((toast) => toast.message);
  }

  async function render(sectorId?: string): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [SectorFormDialog],
      providers: [
        provideRouter([]),
        { provide: RegisterSectorUseCase, useValue: { execute: register } },
        { provide: UpdateSectorUseCase, useValue: { execute: update } },
        { provide: FindSectorByIdUseCase, useValue: { execute: find } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(sectorId ? { sectorId } : {}) } },
        },
      ],
    }).compileComponents();
    navigate = vi.fn<Navigate>().mockResolvedValue(true);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockImplementation(navigate);

    fixture = TestBed.createComponent(SectorFormDialog);
    document.body.appendChild(element());
    fixture.detectChanges();
    await settle();
  }

  beforeEach(() => {
    register = vi.fn().mockResolvedValue(success(galpao));
    update = vi.fn().mockResolvedValue(success(galpao));
    find = vi.fn().mockResolvedValue(success(galpao));
  });

  afterEach(() => element().remove());

  it('is a modal dialog named by what it does', async () => {
    await render();

    const dialog = element().querySelector('[role="dialog"]')!;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(element().querySelector(`#${dialog.getAttribute('aria-labelledby')}`)?.textContent).toBe('Novo setor');
  });

  it('registers the name and the description as typed, the description in a text area', async () => {
    await render();
    type('name', 'Codornas — Galpão 4');
    type('description', 'Codornas japonesas em postura, baterias A e B');

    await submit();

    expect(field('description').tagName).toBe('TEXTAREA');
    expect(register).toHaveBeenCalledWith({
      name: 'Codornas — Galpão 4',
      description: 'Codornas japonesas em postura, baterias A e B',
    });
  });

  it('confirms the registration in a toast, tells the list, and goes back to it', async () => {
    await render();

    await submit();

    expect(toasts()).toEqual(['Setor cadastrado: Codornas — Galpão 1.']);
    expect(TestBed.inject(SectorChanges).version()).toBe(1);
    expect(navigate).toHaveBeenCalledWith(['/setores']);
  });

  it('shows every refused field at once, each next to its field, and stays open', async () => {
    register.mockResolvedValue(
      failure(
        Notification.of([
          {
            code: 'VALIDATION_FAILED',
            field: 'name',
            message: 'O nome do setor deve ter ao menos 2 caracteres.',
          },
          {
            code: 'VALIDATION_FAILED',
            field: 'description',
            message: 'A descrição deve ter no máximo 500 caracteres.',
          },
        ]),
      ),
    );
    await render();

    await submit();

    expect(element().querySelector('#name-error')?.textContent).toContain(
      'O nome do setor deve ter ao menos 2 caracteres.',
    );
    expect(element().querySelector('#description-error')?.textContent).toContain(
      'A descrição deve ter no máximo 500 caracteres.',
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows the name in use next to the name', async () => {
    register.mockResolvedValue(
      failure(
        Notification.of([
          { code: 'SECTOR_NAME_IN_USE', field: 'name', message: 'Já existe um setor ativo com este nome.' },
        ]),
      ),
    );
    await render();

    await submit();

    expect(element().querySelector('#name-error')?.textContent).toContain('Já existe um setor ativo com este nome.');
  });

  it('opens the edition with the data of the sector', async () => {
    await render(galpao.id);

    expect(find).toHaveBeenCalledWith(galpao.id);
    expect(field('name').value).toBe('Codornas — Galpão 1');
    expect(field('description').value).toBe('Codornas japonesas em postura, baterias A a D');
    expect(element().querySelector('h2')?.textContent).toContain('Editar setor');
  });

  it('saves the edition, confirms it in a toast and goes back to the list', async () => {
    update.mockResolvedValue(success({ ...galpao, name: 'Codornas — Galpão 1 (norte)' }));
    await render(galpao.id);
    type('name', 'Codornas — Galpão 1 (norte)');

    await submit();

    expect(update).toHaveBeenCalledWith(galpao.id, {
      name: 'Codornas — Galpão 1 (norte)',
      description: 'Codornas japonesas em postura, baterias A a D',
    });
    expect(toasts()).toEqual(['Alterações salvas: Codornas — Galpão 1 (norte).']);
    expect(navigate).toHaveBeenCalledWith(['/setores']);
  });

  it('says the sector was not found, without the fields, for an address of no sector', async () => {
    find.mockResolvedValue(
      failure(Notification.of([{ code: 'SECTOR_NOT_FOUND', message: 'Setor não encontrado.' }])),
    );
    await render('9d2e4f6a-1b3c-4d5e-8f7a-2b4c6d8e0f44');

    expect(element().textContent).toContain('Setor não encontrado.');
    expect(element().querySelector('#name')).toBeNull();
  });

  it('does not call the backend for an address that is not an identifier', async () => {
    await render('..%2F..%2Fme');

    expect(find).not.toHaveBeenCalled();
    expect(element().textContent).toContain('Setor não encontrado.');
  });

  it('goes back to the list without saving when cancelled', async () => {
    await render();

    button('Cancelar').click();
    await settle();

    expect(register).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/setores']);
  });
});
