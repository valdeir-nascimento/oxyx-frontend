import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Notification } from '../../../../shared/domain/notification';
import { Alert } from '../../../../shared/presentation/ui/alert/alert';
import { Button } from '../../../../shared/presentation/ui/button/button';
import { Dialog } from '../../../../shared/presentation/ui/dialog/dialog';
import { ErrorSummary } from '../../../../shared/presentation/ui/error-summary/error-summary';
import { FormField } from '../../../../shared/presentation/ui/form-field/form-field';
import { Toaster } from '../../../../shared/presentation/ui/toast/toaster';
import { FindSectorByIdUseCase } from '../../../application/sector/find-sector-by-id.usecase';
import { RegisterSectorUseCase } from '../../../application/sector/register-sector.usecase';
import { UpdateSectorUseCase } from '../../../application/sector/update-sector.usecase';
import { SectorChanges } from '../sector-changes';

const NOT_FOUND = 'SECTOR_NOT_FOUND';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FIELDS = ['name', 'description'];
const LIST = '/setores';

/**
 * Cadastro e edição de setor (US1; FR-001, FR-003, FR-020), em diálogo sobre a lista, como o design
 * system abre os formulários curtos. As rotas `/setores/novo` e `/setores/:sectorId` carregam o
 * diálogo; fechar é voltar à lista, e o foco volta a quem abriu (FocusTrap).
 *
 * O formulário não valida nada: entrega o que foi digitado, e o backend devolve todas as falhas de
 * uma vez (FR-017). Cada mensagem aparece junto do seu campo, e o resumo da recusa leva a cada uma.
 *
 * Na edição, os campos só aparecem depois de o setor carregar: vazios, podiam ser enviados e gravar
 * em branco por cima dos dados.
 */
@Component({
  selector: 'ovyx-sector-form-dialog',
  imports: [Alert, Button, Dialog, ErrorSummary, FormField],
  templateUrl: './sector-form-dialog.html',
  styleUrl: './sector-form-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectorFormDialog {
  private readonly register = inject(RegisterSectorUseCase);
  private readonly update = inject(UpdateSectorUseCase);
  private readonly find = inject(FindSectorByIdUseCase);
  private readonly changes = inject(SectorChanges);
  private readonly toaster = inject(Toaster);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** Identificador do setor que se edita; ausente no cadastro. */
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('sectorId');

  protected readonly editing = this.id !== null;
  protected readonly fields = FIELDS;

  protected readonly form = inject(FormBuilder).nonNullable.group({ name: '', description: '' });

  protected readonly notification = signal(Notification.empty());
  protected readonly submitting = signal(false);

  /** O cadastro já nasce pronto; a edição espera o setor carregar. */
  protected readonly state = signal<'loading' | 'ready' | 'missing' | 'failed'>(
    this.id === null ? 'ready' : 'loading',
  );

  /** O nome do setor como carregou; o que se digita no campo não muda o subtítulo. */
  private readonly loadedName = signal('');

  protected readonly subtitle = computed(() =>
    this.editing ? this.loadedName() : 'Um galpão, uma espécie ou um lote acompanhado separadamente.',
  );

  constructor() {
    if (this.id !== null) {
      void this.load(this.id);
    }
  }

  protected messageFor(field: string): string | undefined {
    return this.notification().messageFor(field);
  }

  /** Voltar à lista fecha o diálogo. Enquanto grava, não fecha: o resultado já está a caminho. */
  protected close(): void {
    if (!this.submitting()) {
      void this.router.navigate([LIST]);
    }
  }

  protected async submit(): Promise<void> {
    // O botão ocupado já barra o segundo clique; o Enter num campo envia sem passar por ele.
    if (this.submitting() || this.state() !== 'ready') {
      return;
    }
    const input = this.form.getRawValue();

    this.submitting.set(true);
    const result =
      this.id === null ? await this.register.execute(input) : await this.update.execute(this.id, input);
    this.submitting.set(false);

    if (!result.success) {
      this.notification.set(result.notification);
      return;
    }

    this.notification.set(Notification.empty());
    this.toaster.show(
      this.id === null ? `Setor cadastrado: ${result.value.name}.` : `Alterações salvas: ${result.value.name}.`,
    );
    this.changes.notify();
    await this.router.navigate([LIST]);
  }

  private async load(id: string): Promise<void> {
    // Um endereço que não traz um identificador nem chega ao backend: forjado com "../", ele levava a
    // tela de edição a chamar outro endpoint.
    if (!UUID.test(id)) {
      this.state.set('missing');
      return;
    }

    const result = await this.find.execute(id);
    if (!result.success) {
      const missing = result.notification.errors.some((error) => error.code === NOT_FOUND);
      this.notification.set(missing ? Notification.empty() : result.notification);
      this.state.set(missing ? 'missing' : 'failed');
      return;
    }

    const { name, description } = result.value;
    this.form.patchValue({ name, description: description ?? '' });
    this.loadedName.set(name);
    this.state.set('ready');
    this.focusFirstFieldAfterRender();
  }

  /** Com os campos na tela, o foco vai para o primeiro — se continua no diálogo. */
  private focusFirstFieldAfterRender(): void {
    afterNextRender(
      () => {
        const root = this.host.nativeElement;
        const focused = document.activeElement;
        if (!focused || focused === document.body || root.contains(focused)) {
          root.querySelector<HTMLElement>('#name')?.focus();
        }
      },
      { injector: this.injector },
    );
  }
}
