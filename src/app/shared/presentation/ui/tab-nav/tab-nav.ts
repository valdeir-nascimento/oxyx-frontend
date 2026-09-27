import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/** Uma aba: o rótulo, a rota e, se houver, o ícone e uma contagem, como "pendente". */
export interface TabLink {
  readonly label: string;
  /** Os comandos da rota, como os do `routerLink`. */
  readonly link: readonly unknown[];
  readonly icon?: IconName;
  readonly count?: string;
  /** A contagem em destaque de aviso, como o "pendente" do protótipo. */
  readonly highlight?: boolean;
}

/**
 * Abas de navegação, o `.tabs` do design system, para trocar de tela sem sair do contexto, como os
 * lançamentos do relatório (Produção · Mortalidade).
 *
 * Cada aba é um link para uma rota, e não um `role="tab"`: trocar de aba muda o endereço, e o voltar do
 * navegador volta à aba anterior. A aba da rota atual é a página em que se está (`aria-current="page"`).
 */
@Component({
  selector: 'ovyx-tab-nav',
  imports: [Icon, RouterLink, RouterLinkActive],
  templateUrl: './tab-nav.html',
  styleUrl: './tab-nav.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabNav {
  /** O nome da navegação para o leitor de tela, como "Lançamentos do relatório". */
  readonly label = input.required<string>();

  readonly tabs = input.required<readonly TabLink[]>();
}
