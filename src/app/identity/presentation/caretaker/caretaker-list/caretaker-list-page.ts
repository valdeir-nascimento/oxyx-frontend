import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { RouterLink, RouterOutlet } from '@angular/router';
import { Notification } from '../../../../shared/domain/notification';
import { Avatar, AvatarTone } from '../../../../shared/presentation/ui/avatar/avatar';
import { Button } from '../../../../shared/presentation/ui/button/button';
import { ConfirmDialog } from '../../../../shared/presentation/ui/confirm-dialog/confirm-dialog';
import { DataTable } from '../../../../shared/presentation/ui/data-table/data-table';
import { ErrorSummary } from '../../../../shared/presentation/ui/error-summary/error-summary';
import { Icon } from '../../../../shared/presentation/ui/icon/icon';
import { IconButton } from '../../../../shared/presentation/ui/icon-button/icon-button';
import { PageHeader } from '../../../../shared/presentation/ui/page-header/page-header';
import { Pager } from '../../../../shared/presentation/ui/pager/pager';
import { SearchField } from '../../../../shared/presentation/ui/search-field/search-field';
import {
  SegmentOption,
  SegmentedControl,
} from '../../../../shared/presentation/ui/segmented-control/segmented-control';
import { StatusBadge } from '../../../../shared/presentation/ui/status-badge/status-badge';
import { Toaster } from '../../../../shared/presentation/ui/toast/toaster';
import { DeactivateCaretakerUseCase } from '../../../application/caretaker/deactivate-caretaker.usecase';
import { SearchCaretakersUseCase } from '../../../application/caretaker/search-caretakers.usecase';
import { CaretakerPage, CaretakerStatus, CaretakerSummary } from '../../../domain/caretaker';
import { roleLabelOf, statusLabelOf } from '../../labels/labels';
import { CaretakerChanges } from '../caretaker-changes';

const PAGE_SIZE = 20;

const STATUS_OPTIONS: readonly SegmentOption[] = [
  { value: '', label: 'Todos' },
  { value: 'ACTIVE', label: 'Ativos' },
  { value: 'INACTIVE', label: 'Inativos' },
];

/** Os tons do avatar se alternam de linha em linha, como no design system. */
const AVATAR_TONES: readonly AvatarTone[] = ['gema', 'capim', 'ceu'];

/** Os filtros de uma pesquisa: o trecho do nome e a situação, vazia para todas. */
interface Filters {
  readonly name: string;
  readonly status: string;
}

/**
 * Lista de responsáveis (FR-014, US2): pesquisa por trecho do nome, filtro de situação, páginas e
 * inativação, com a tabela, a barra de ferramentas e a paginação do design system.
 *
 * Inativar pede confirmação num diálogo modal (FR-018). Cancelar devolve o foco ao botão de onde a
 * pessoa veio; confirmar diz o que aconteceu num toast, recarrega a página e leva o foco à ação de
 * editar da mesma linha — o botão de inativar some com a inativação. Se o backend recusar — o último
 * administrador ativo, por exemplo —, o resumo de recusa recebe o foco e diz por quê (T234). A recusa
 * some na próxima carga que der certo.
 *
 * O cadastro e a edição abrem em diálogo sobre a lista, pelas rotas filhas `novo` e `:id`; quando eles
 * gravam, avisam por `CaretakerChanges`, e a lista busca de novo a página em que está.
 *
 * As páginas seguem os filtros da última pesquisa feita, e não o que está digitado e ainda não foi
 * pesquisado: senão a página 2 viria de uma pesquisa que ninguém pediu. Escolher a situação já é
 * pesquisar, com o nome que estiver no campo.
 */
@Component({
  selector: 'ovyx-caretaker-list-page',
  imports: [
    Avatar,
    Button,
    ConfirmDialog,
    DataTable,
    ErrorSummary,
    Icon,
    IconButton,
    PageHeader,
    Pager,
    RouterLink,
    RouterOutlet,
    SearchField,
    SegmentedControl,
    StatusBadge,
  ],
  templateUrl: './caretaker-list-page.html',
  styleUrl: './caretaker-list-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CaretakerListPage {
  private readonly searchCaretakers = inject(SearchCaretakersUseCase);
  private readonly deactivateCaretaker = inject(DeactivateCaretakerUseCase);
  private readonly toaster = inject(Toaster);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly roleLabelOf = roleLabelOf;
  protected readonly statusLabelOf = statusLabelOf;

  protected readonly filters = inject(FormBuilder).nonNullable.group({ name: '' });

  /** A situação escolhida no segmento. */
  protected readonly status = signal('');

  protected readonly page = signal<CaretakerPage>({
    content: [],
    page: 0,
    size: PAGE_SIZE,
    totalElements: 0,
    totalPages: 0,
  });
  protected readonly loading = signal(true);
  protected readonly refusal = signal(Notification.empty());
  protected readonly confirming = signal<CaretakerSummary | null>(null);
  protected readonly deactivating = signal(false);

  /** O total da pesquisa, dito pela região de estado da tabela quando há linhas. */
  protected readonly found = computed(() => {
    const total = this.page().totalElements;
    return total === 1 ? '1 responsável encontrado.' : `${total} responsáveis encontrados.`;
  });

  /** Os filtros da última pesquisa feita. */
  private readonly searched = signal<Filters>({ name: '', status: '' });

  constructor() {
    // A primeira carga, e cada gravação do diálogo de cadastro e edição: a lista busca de novo a
    // página em que está. Só a versão é dependência; a página lida aqui não é.
    const changes = inject(CaretakerChanges).version;
    effect(() => {
      changes();
      untracked(() => void this.load(this.page().page));
    });
  }

  protected toneOf(index: number): AvatarTone {
    return AVATAR_TONES[index % AVATAR_TONES.length];
  }

  protected search(event: Event): void {
    event.preventDefault();
    this.searchWith(this.status());
  }

  protected filterByStatus(status: string): void {
    this.status.set(status);
    this.searchWith(status);
  }

  protected goTo(page: number): void {
    void this.load(page);
  }

  protected async deactivate(caretaker: CaretakerSummary): Promise<void> {
    this.deactivating.set(true);
    const result = await this.deactivateCaretaker.execute(caretaker.id);
    this.deactivating.set(false);
    this.confirming.set(null);

    if (!result.success) {
      this.refusal.set(result.notification);
      return;
    }

    this.toaster.show(`Responsável inativado: ${caretaker.fullName}.`);
    await this.load(this.page().page);
    this.focusRowAfterRender(caretaker);
  }

  private searchWith(status: string): void {
    this.searched.set({ name: this.filters.controls.name.value, status });
    void this.load(0);
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
      this.refusal.set(result.notification);
      return;
    }
    this.refusal.set(Notification.empty());
    this.page.set(result.value);
  }

  /**
   * Depois de inativar, o foco vai para a ação de editar da mesma linha. Se a linha saiu da lista —
   * o filtro mostra só os ativos —, vai para a tabela, que é onde a pessoa estava.
   */
  private focusRowAfterRender(caretaker: CaretakerSummary): void {
    afterNextRender(
      () => {
        const root = this.host.nativeElement;
        const target =
          root.querySelector<HTMLElement>(`tr[data-caretaker="${caretaker.id}"] a.icon-btn`) ??
          root.querySelector<HTMLElement>('.tbl-wrap');
        target?.focus();
      },
      { injector: this.injector },
    );
  }
}
