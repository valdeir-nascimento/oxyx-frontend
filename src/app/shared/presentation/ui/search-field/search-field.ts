import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Icon } from '../icon/icon';

/**
 * Busca da barra de ferramentas da tabela: o `.control` com a lupa, como no design system.
 *
 * Sem rótulo visível — a lupa e o texto de exemplo dizem o que ela faz a quem vê —, então o nome vai
 * em `aria-label`. O valor fica no controle; quem pesquisa é o formulário que envolve o campo.
 */
@Component({
  selector: 'ovyx-search-field',
  imports: [ReactiveFormsModule, Icon],
  templateUrl: './search-field.html',
  styleUrl: './search-field.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchField {
  readonly control = input.required<FormControl<string>>();

  /** O nome do campo para o leitor de tela, como "Buscar por nome". */
  readonly label = input.required<string>();

  readonly placeholder = input('');

  /** `id` da entrada, para um link do resumo de recusa levar até ela. */
  readonly controlId = input<string>();
}
