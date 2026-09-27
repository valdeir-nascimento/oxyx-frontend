import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { failure, success } from '../../../../shared/application/result';
import { Notification } from '../../../../shared/domain/notification';
import { Toaster } from '../../../../shared/presentation/ui/toast/toaster';
import { FindCageByIdUseCase } from '../../../application/cage/find-cage-by-id.usecase';
import { RegisterCageUseCase } from '../../../application/cage/register-cage.usecase';
import { UpdateCageUseCase } from '../../../application/cage/update-cage.usecase';
import { Cage } from '../../../domain/cage';
import { CageChanges } from '../cage-changes';
import { CageFormDialog } from './cage-form-dialog';

/** Assinatura de `Router.navigate`, só com o que os testes usam. */
type Navigate = (commands: readonly unknown[]) => Promise<boolean>;

/**
 * Diálogo de cadastro e de edição de gaiola (US2; FR-006, FR-009, FR-017): bateria, número e aves,
 * todas as falhas de uma vez, e fechar é voltar às gaiolas do setor.
 */
describe('CageFormDialog', () => {
  const sectorId = '3f6c2b1a-8d4e-4c7f-9a2b-1e5d7c9f0a11';
  const b07: Cage = {
    id: '9d2e4f6a-1b3c-4d5e-8f7a-2b4c6d8e0f44',
    sectorId,
    code: 'B-07',
    battery: 'B',
    number: 7,
    birdCount: 50,
    status: 'ACTIVE',
    createdAt: '2026-09-21T08:30:00Z',
    updatedAt: '2026-09-24T17:42:05Z',
  };

  let register: Mock;
  let update: Mock;
  let find: Mock;
  let navigate: Mock<Navigate>;
  let fixture: ComponentFixture<CageFormDialog>;

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

  async function submit(): Promise<void> {
    element().querySelector('form')!.dispatchEvent(new Event('submit'));
    await settle();
  }

  function toasts(): readonly string[] {
    return TestBed.inject(Toaster)
      .toasts()
      .map((toast) => toast.message);
  }

  async function render(cageId?: string): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [CageFormDialog],
      providers: [
        provideRouter([]),
        { provide: RegisterCageUseCase, useValue: { execute: register } },
        { provide: UpdateCageUseCase, useValue: { execute: update } },
        { provide: FindCageByIdUseCase, useValue: { execute: find } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap(cageId ? { cageId } : {}),
              parent: { paramMap: convertToParamMap({ sectorId }) },
            },
          },
        },
      ],
    }).compileComponents();
    navigate = vi.fn<Navigate>().mockResolvedValue(true);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockImplementation(navigate);

    fixture = TestBed.createComponent(CageFormDialog);
    document.body.appendChild(element());
    fixture.detectChanges();
    await settle();
  }

  beforeEach(() => {
    register = vi.fn().mockResolvedValue(success(b07));
    update = vi.fn().mockResolvedValue(success(b07));
    find = vi.fn().mockResolvedValue(success(b07));
  });

  afterEach(() => element().remove());

  it('registers the battery, the number and the birds as typed, in the sector of the address', async () => {
    await render();
    type('battery', 'b');
    type('number', '07');
    type('birdCount', '50');

    await submit();

    expect(register).toHaveBeenCalledWith(sectorId, { battery: 'b', number: '07', birdCount: '50' });
    expect(field('number').getAttribute('inputmode')).toBe('numeric');
    expect(field('birdCount').getAttribute('inputmode')).toBe('numeric');
  });

  it('confirms the registration in a toast, tells the list, and goes back to the cages of the sector', async () => {
    await render();

    await submit();

    expect(toasts()).toEqual(['Gaiola cadastrada: B-07.']);
    expect(TestBed.inject(CageChanges).version()).toBe(1);
    expect(navigate).toHaveBeenCalledWith(['/setores', sectorId, 'gaiolas']);
  });

  it('shows the three refused fields at once, each next to its field', async () => {
    register.mockResolvedValue(
      failure(
        Notification.of([
          { code: 'VALIDATION_FAILED', field: 'battery', message: 'Informe a bateria, com até 3 letras ou dígitos.' },
          { code: 'VALIDATION_FAILED', field: 'number', message: 'O número da gaiola deve ficar entre 1 e 999.' },
          { code: 'VALIDATION_FAILED', field: 'birdCount', message: 'A quantidade de aves deve ficar entre 0 e 1.000.' },
        ]),
      ),
    );
    await render();

    await submit();

    expect(element().querySelector('#battery-error')?.textContent).toContain('Informe a bateria');
    expect(element().querySelector('#number-error')?.textContent).toContain('entre 1 e 999');
    expect(element().querySelector('#birdCount-error')?.textContent).toContain('entre 0 e 1.000');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('tells the list when the sector turned out inactive, for it to show the notice behind the dialog', async () => {
    // QA N-7: fechado o diálogo recusado, a lista continuava com o setor ativo e o botão mudo.
    register.mockResolvedValue(
      failure(Notification.of([{ code: 'SECTOR_INACTIVE', message: 'O setor está inativo e não recebe gaiolas novas.' }])),
    );
    await render();
    type('battery', 'B');
    type('number', '8');
    type('birdCount', '40');

    await submit();

    expect(TestBed.inject(CageChanges).version()).toBe(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not tell the list about a refusal of the fields, which changes nothing in it', async () => {
    register.mockResolvedValue(
      failure(Notification.of([{ code: 'VALIDATION_FAILED', field: 'battery', message: 'Informe a bateria.' }])),
    );
    await render();

    await submit();

    expect(TestBed.inject(CageChanges).version()).toBe(0);
  });

  it('shows the cage that already exists next to the battery and the number', async () => {
    const message = 'Já existe uma gaiola ativa B-07 neste setor.';
    register.mockResolvedValue(
      failure(
        Notification.of([
          { code: 'CAGE_ALREADY_EXISTS', field: 'battery', message },
          { code: 'CAGE_ALREADY_EXISTS', field: 'number', message },
        ]),
      ),
    );
    await render();

    await submit();

    expect(element().querySelector('#battery-error')?.textContent).toContain(message);
    expect(element().querySelector('#number-error')?.textContent).toContain(message);
  });

  it('opens the edition with the data of the cage and its code in the title', async () => {
    await render(b07.id);

    expect(find).toHaveBeenCalledWith(sectorId, b07.id);
    expect(field('battery').value).toBe('B');
    expect(field('number').value).toBe('7');
    expect(field('birdCount').value).toBe('50');
    expect(element().querySelector('h2')?.textContent).toContain('Editar gaiola B-07');
  });

  it('saves the corrected birds, confirms it and goes back to the cages', async () => {
    update.mockResolvedValue(success({ ...b07, birdCount: 48 }));
    await render(b07.id);
    type('birdCount', '48');

    await submit();

    expect(update).toHaveBeenCalledWith(sectorId, b07.id, { battery: 'B', number: '7', birdCount: '48' });
    expect(toasts()).toEqual(['Alterações salvas: B-07.']);
    expect(navigate).toHaveBeenCalledWith(['/setores', sectorId, 'gaiolas']);
  });

  it('says the cage was not found for an address of no cage', async () => {
    find.mockResolvedValue(failure(Notification.of([{ code: 'CAGE_NOT_FOUND', message: 'Gaiola não encontrada.' }])));
    await render('9d2e4f6a-1b3c-4d5e-8f7a-2b4c6d8e0f45');

    expect(element().textContent).toContain('Gaiola não encontrada.');
    expect(element().querySelector('#battery')).toBeNull();
  });

  it('does not call the backend for an address that is not an identifier', async () => {
    await render('..%2F..%2Fme');

    expect(find).not.toHaveBeenCalled();
    expect(element().textContent).toContain('Gaiola não encontrada.');
  });
});
