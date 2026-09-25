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
import { RouterLink } from '@angular/router';
import { Notification } from '../../../../shared/domain/notification';
import { Button } from '../../../../shared/presentation/ui/button/button';
import { ConfirmDialog } from '../../../../shared/presentation/ui/confirm-dialog/confirm-dialog';
import { DataTable } from '../../../../shared/presentation/ui/data-table/data-table';
import { ErrorSummary } from '../../../../shared/presentation/ui/error-summary/error-summary';
import { FormField } from '../../../../shared/presentation/ui/form-field/form-field';
import { PageHeader } from '../../../../shared/presentation/ui/page-header/page-header';
import { SelectField, SelectOption } from '../../../../shared/presentation/ui/select-field/select-field';
import { StatusBadge } from '../../../../shared/presentation/ui/status-badge/status-badge';
import { DeactivateCaretakerUseCase } from '../../../application/caretaker/deactivate-caretaker.usecase';
import { SearchCaretakersUseCase } from '../../../application/caretaker/search-caretakers.usecase';
import { CaretakerPage, CaretakerStatus, CaretakerSummary } from '../../../domain/caretaker';
import { roleLabelOf, statusLabelOf } from '../../labels/labels';
import { CaretakerNotice } from '../caretaker-notice';

const PAGE_SIZE = 20;

const STATUS_OPTIONS: readonly SelectOption[] = [
  { value: '', label: 'Todas' },
  { value: 'ACTIVE', label: 'Ativos' },
  { value: 'INACTIVE', label: 'Inativos' },
];

/**
 * Lista de responsáveis (FR-014, US2): pesquisa por trecho do nome, páginas e inativação.
 *
 * Inativar pede confirmação ao lado da linha (FR-018). Cancelar devolve o foco ao botão de onde a
 * pessoa veio; confirmar diz o que aconteceu numa região de estado que existe sempre, e recarrega a
 * página. Se o backend recusar — o último administrador ativo, por exemplo —, o resumo de recusa
 * recebe o foco e diz por quê (T234). A recusa some na próxima carga que der certo.
 *
 * As páginas seguem os filtros da última pesquisa feita, e não o que está digitado e ainda não foi
 * pesquisado: senão a página 2 viria de uma pesquisa que ninguém pediu.
 */
@Component({
  selector: 'ovyx-caretaker-list-page',
  imports: [
    Button,
    ConfirmDialog,
    DataTable,
    ErrorSummary,
    FormField,
    PageHeader,
    RouterLink,
    SelectField,
    StatusBadge,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="caretakers">
      <ovyx-page-header title="Responsáveis">
        <a class="caretakers__new" routerLink="/responsaveis/novo">Novo responsável</a>
      </ovyx-page-header>

      <p class="caretakers__status" role="status" tabindex="-1">{{ status() }}</p>

      @if (refusal().hasErrors) {
        <ovyx-error-summary
          heading="Não foi possível concluir a operação:"
          [errors]="refusal().errors"
          [fields]="[]"
        />
      }

      <form class="caretakers__search" role="search" (submit)="search($event)">
        <ovyx-form-field controlId="name" label="Nome" [control]="filters.controls.name" />
        <ovyx-select-field
          controlId="status"
          label="Situação"
          [control]="filters.controls.status"
          [options]="statusOptions"
        />
        <ovyx-button type="submit" variant="secondary">Pesquisar</ovyx-button>
      </form>

      <ovyx-data-table
        caption="Responsáveis cadastrados"
        emptyMessage="Nenhum responsável encontrado."
        [loading]="loading()"
        [empty]="page().content.length === 0"
        [summary]="found()"
      >
        <thead>
          <tr>
            <th scope="col">Nome</th>
            <th scope="col">E-mail</th>
            <th scope="col">Celular</th>
            <th scope="col">Perfil</th>
            <th scope="col">Situação</th>
            <th scope="col">Ações</th>
          </tr>
        </thead>
        <tbody>
          @for (caretaker of page().content; track caretaker.id) {
            <tr [attr.data-caretaker]="caretaker.id">
              <td>{{ caretaker.fullName }}</td>
              <td>{{ caretaker.email }}</td>
              <td>{{ caretaker.mobilePhone }}</td>
              <td>{{ roleLabelOf(caretaker.role) }}</td>
              <td>
                <ovyx-status-badge
                  [label]="statusLabelOf(caretaker.status)"
                  [tone]="caretaker.status === 'ACTIVE' ? 'positive' : 'neutral'"
                />
              </td>
              <td class="caretakers__actions">
                <a
                  class="caretakers__edit"
                  [routerLink]="['/responsaveis', caretaker.id]"
                  [attr.aria-label]="'Editar ' + caretaker.fullName"
                >
                  Editar
                </a>
                @if (caretaker.status === 'ACTIVE') {
                  <ovyx-button
                    variant="danger"
                    [accessibleName]="'Inativar ' + caretaker.fullName"
                    (pressed)="confirming.set(caretaker)"
                  >
                    Inativar
                  </ovyx-button>
                }
              </td>
            </tr>
            @if (confirming()?.id === caretaker.id) {
              <tr>
                <td colspan="6">
                  <ovyx-confirm-dialog
                    [title]="'Inativar ' + caretaker.fullName + '?'"
                    confirmLabel="Inativar"
                    [busy]="deactivating()"
                    (confirmed)="deactivate(caretaker)"
                    (cancelled)="cancel(caretaker)"
                  >
                    O responsável deixa de conseguir entrar no sistema. O histórico é preservado.
                  </ovyx-confirm-dialog>
                </td>
              </tr>
            }
          }
        </tbody>
      </ovyx-data-table>

      <nav class="caretakers__pages" aria-label="Páginas da lista">
        <ovyx-button variant="secondary" [disabled]="page().page === 0" (pressed)="goTo(page().page - 1)">
          Anterior
        </ovyx-button>
        <span>Página {{ page().page + 1 }} de {{ lastPage() }}</span>
        <ovyx-button
          variant="secondary"
          [disabled]="page().page + 1 >= page().totalPages"
          (pressed)="goTo(page().page + 1)"
        >
          Próxima
        </ovyx-button>
      </nav>
    </section>
  `,
  styles: `
    .caretakers {
      display: grid;
      gap: var(--ovyx-space-4);
    }

    .caretakers__new {
      display: inline-flex;
      align-items: center;
      min-height: var(--ovyx-control-height-md);
      padding: 0 var(--ovyx-space-4);
      border-radius: var(--ovyx-radius-md);
      background-color: var(--ovyx-color-brand);
      color: var(--ovyx-color-text-on-brand);
      font-weight: var(--ovyx-font-weight-semibold);
      text-decoration: none;
    }

    .caretakers__new:hover {
      background-color: var(--ovyx-color-brand-strong);
    }

    /* Vazia, sai da tela, mas não da árvore de acessibilidade: região que nasce junto com o texto não
     * é anunciada (T235). */
    .caretakers__status:empty {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
    }

    /* No telefone, um campo por linha; na mesa, os filtros lado a lado com o botão. */
    .caretakers__search {
      display: grid;
      gap: var(--ovyx-space-3);
      align-items: end;
    }

    @media (min-width: 48rem) {
      .caretakers__search {
        grid-template-columns: 2fr 1fr auto;
      }
    }

    .caretakers__actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--ovyx-space-2);
    }

    .caretakers__edit {
      display: inline-flex;
      align-items: center;
      min-height: var(--ovyx-control-height-md);
      padding: 0 var(--ovyx-space-2);
      color: var(--ovyx-color-brand-text);
    }

    .caretakers__pages {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--ovyx-space-3);
    }
  `,
})
export class CaretakerListPage {
  private readonly searchCaretakers = inject(SearchCaretakersUseCase);
  private readonly deactivateCaretaker = inject(DeactivateCaretakerUseCase);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly roleLabelOf = roleLabelOf;
  protected readonly statusLabelOf = statusLabelOf;

  protected readonly filters = inject(FormBuilder).nonNullable.group({ name: '', status: '' });

  protected readonly page = signal<CaretakerPage>({
    content: [],
    page: 0,
    size: PAGE_SIZE,
    totalElements: 0,
    totalPages: 0,
  });
  protected readonly loading = signal(true);
  protected readonly status = signal('');
  protected readonly refusal = signal(Notification.empty());
  protected readonly confirming = signal<CaretakerSummary | null>(null);
  protected readonly deactivating = signal(false);

  /** O total da pesquisa, dito pela região de estado da tabela quando há linhas. */
  protected readonly found = computed(() => {
    const total = this.page().totalElements;
    return total === 1 ? '1 responsável encontrado.' : `${total} responsáveis encontrados.`;
  });

  /** Os filtros da última pesquisa feita. */
  private readonly searched = signal({ name: '', status: '' });

  constructor() {
    const notice = inject(CaretakerNotice).take();
    if (notice) {
      // O aviso do formulário recebe o foco: o da tela anterior se perdeu na navegação, e é a mudança
      // de foco que o leitor de tela anuncia. O texto entra depois do primeiro desenho, para a
      // região nascer vazia e só então recebê-lo.
      afterNextRender(() => this.announce(notice));
    }
    void this.load(0);
  }

  protected lastPage(): number {
    return Math.max(this.page().totalPages, 1);
  }

  protected search(event: Event): void {
    event.preventDefault();
    this.searched.set(this.filters.getRawValue());
    this.status.set('');
    void this.load(0);
  }

  protected goTo(page: number): void {
    this.status.set('');
    void this.load(page);
  }

  protected cancel(caretaker: CaretakerSummary): void {
    this.confirming.set(null);
    this.focusAfterRender(`tr[data-caretaker="${caretaker.id}"] button`);
  }

  protected async deactivate(caretaker: CaretakerSummary): Promise<void> {
    this.deactivating.set(true);
    const result = await this.deactivateCaretaker.execute(caretaker.id);
    this.deactivating.set(false);
    this.confirming.set(null);

    if (!result.success) {
      this.refuse(result.notification);
      return;
    }

    // O botão de onde a pessoa veio sumiu com a inativação; o foco vai para o aviso do que aconteceu.
    this.announce(`Responsável inativado: ${caretaker.fullName}.`);
    await this.load(this.page().page);
  }

  private announce(message: string): void {
    this.status.set(message);
    this.focusAfterRender('.caretakers__status');
  }

  /**
   * Uma recusa nova toma o lugar do aviso anterior. Juntos, diziam coisas de momentos diferentes:
   * "Responsável inativado" logo acima de uma inativação que acabara de ser recusada.
   */
  private refuse(notification: Notification): void {
    this.status.set('');
    this.refusal.set(notification);
  }

  private async load(page: number): Promise<void> {
    const { name, status } = this.searched();
    this.loading.set(true);
    const result = await this.searchCaretakers.execute({
      name,
      status: (status || undefined) as CaretakerStatus | undefined,
      page,
      size: PAGE_SIZE,
    });
    this.loading.set(false);

    if (!result.success) {
      this.refuse(result.notification);
      return;
    }
    this.refusal.set(Notification.empty());
    this.page.set(result.value);
  }

  private focusAfterRender(selector: string): void {
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus(), {
      injector: this.injector,
    });
  }
}
