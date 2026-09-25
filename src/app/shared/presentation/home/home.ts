import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyState } from '../ui/empty-state/empty-state';
import { PageHeader } from '../ui/page-header/page-header';

/**
 * Página inicial da área autenticada.
 *
 * Nesta fatia a fundação de acesso é o que existe: o painel de produção do design system chega com as
 * features de avicultura. A página diz isso com o estado vazio, em vez de mostrar indicadores sem
 * dado — e não inventa número nenhum.
 */
@Component({
  selector: 'ovyx-home',
  imports: [EmptyState, PageHeader],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {}
