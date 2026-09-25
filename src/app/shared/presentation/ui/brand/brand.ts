import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { BrandMark } from './brand-mark';

/**
 * A marca com o nome: o ovo de codorna e "Ovyx", com uma linha de apoio abaixo.
 *
 * Fica dentro do `.side-brand` do design system, no menu lateral e na tela de acesso. O nome é o do
 * Ovyx, e não o "Avicultura" do protótipo — decisão do responsável pelo projeto.
 */
@Component({
  selector: 'ovyx-brand',
  imports: [BrandMark],
  templateUrl: './brand.html',
  styleUrl: './brand.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Brand {
  readonly tagline = input('Gestão de postura');
}
