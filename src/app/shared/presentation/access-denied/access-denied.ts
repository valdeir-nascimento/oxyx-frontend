import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyState } from '../ui/empty-state/empty-state';
import { Icon } from '../ui/icon/icon';

/**
 * Tela de acesso negado (FR-010), com o estado vazio do design system.
 *
 * Deliberadamente genérica: não diz qual recurso foi negado, nem que ele existe. O backend omite
 * essa informação no 403 justamente para não confirmar a existência de área administrativa a quem
 * está sondando o sistema — repetir aqui o que lá foi omitido desfaria a proteção.
 */
@Component({
  selector: 'ovyx-access-denied',
  imports: [RouterLink, EmptyState, Icon],
  templateUrl: './access-denied.html',
  styleUrl: './access-denied.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessDenied {}
