import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Marca do Ovyx: o ovo de codorna pintado do design system (design-system/brand).
 *
 * Só o desenho: o nome "Ovyx" vem ao lado, em texto, e por isso a marca é decorativa. As cores são as
 * da própria marca, fixas nos dois temas — é o único lugar do cliente com cor que não vem de token.
 */
@Component({
  selector: 'ovyx-brand-mark',
  templateUrl: './brand-mark.html',
  styleUrl: './brand-mark.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandMark {}
