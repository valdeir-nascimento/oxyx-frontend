import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

/**
 * Chave liga-desliga, o `.switch` do design system, para um filtro que se liga e desliga, como "Só
 * gaiolas com ocorrência".
 *
 * É uma caixa de marcação nativa, com `role="switch"`: o teclado a alcança e a opera com a barra de
 * espaço, e o leitor de tela a anuncia como chave, ligada ou desligada. O estado é um `model()`: quem usa
 * escuta a mudança em `checkedChange`.
 */
@Component({
  selector: 'ovyx-switch-field',
  templateUrl: './switch-field.html',
  styleUrl: './switch-field.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SwitchField {
  readonly controlId = input.required<string>();

  readonly label = input.required<string>();

  readonly checked = model(false);

  protected toggle(event: Event): void {
    this.checked.set((event.target as HTMLInputElement).checked);
  }
}
