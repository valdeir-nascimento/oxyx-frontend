import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  input,
  viewChild,
} from '@angular/core';
import { DomainError } from '../../../domain/domain-error';

let nextId = 0;

/**
 * Resumo da recusa de um formulário: todas as falhas de uma vez (FR-017), cada uma com o caminho até
 * o seu campo (T234).
 *
 * Recebe o foco quando aparece e a cada recusa nova. É a mudança de foco que o leitor de tela
 * anuncia — antes, o foco ficava no botão e a pessoa não ouvia nada, porque a mensagem de cada
 * campo só é lida quando o foco entra nele. Pelo mesmo motivo não usa `role="alert"`: o anúncio já
 * vem do foco, e o alerta faria o leitor repetir a recusa.
 *
 * A mensagem de cada campo continua também ao lado do campo, no `ovyx-form-field`: o resumo diz o
 * que falta, e o campo diz onde. Falha sem campo — de rede, por exemplo — aparece só aqui.
 *
 * ```html
 * @if (notification().hasErrors) {
 *   <ovyx-error-summary [errors]="notification().errors" />
 * }
 * ```
 */
@Component({
  selector: 'ovyx-error-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #region class="error-summary" tabindex="-1" [attr.aria-labelledby]="titleId">
      <p class="error-summary__title" [id]="titleId">
        Não foi possível concluir. Corrija o que está indicado:
      </p>
      <ul class="error-summary__list">
        @for (error of errors(); track $index) {
          <li>
            @if (linkable(error); as field) {
              <a class="error-summary__link" [href]="'#' + field" (click)="goTo($event, field)">
                {{ error.message }}
              </a>
            } @else {
              {{ error.message }}
            }
          </li>
        }
      </ul>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .error-summary {
      display: grid;
      gap: var(--ovyx-space-2);
      padding: var(--ovyx-space-3);
      background-color: var(--ovyx-color-danger-surface);
      /* A borda mais grossa que a do alerta é o que marca o resumo como o lugar a corrigir, sem
       * depender só da cor. */
      border: var(--ovyx-border-width-thick) solid var(--ovyx-color-danger-border);
      border-radius: var(--ovyx-radius-sm);
      color: var(--ovyx-color-danger-text);
    }

    .error-summary__title {
      font-weight: var(--ovyx-font-weight-semibold);
    }

    .error-summary__list {
      display: grid;
      gap: var(--ovyx-space-1);
      margin: 0;
      padding-left: var(--ovyx-space-5);
    }

    .error-summary__link {
      color: inherit;
      text-decoration: underline;
    }
  `,
})
export class ErrorSummary {
  /** As violações da recusa, na ordem em que o backend as devolveu. */
  readonly errors = input.required<readonly DomainError[]>();

  /**
   * Os campos que o formulário mostra. Só eles viram link; a falha de um campo que a tela não tem
   * aparece como texto, porque um link que não leva a lugar nenhum é pior que texto. Ausente,
   * todo campo vira link.
   */
  readonly fields = input<readonly string[] | undefined>(undefined);

  protected readonly titleId = `ovyx-error-summary-${++nextId}`;

  private readonly region = viewChild.required<ElementRef<HTMLElement>>('region');

  constructor() {
    // Roda depois de desenhar, a cada lista de erros nova: cada recusa volta a levar o foco ao
    // resumo, inclusive a segunda, quando a pessoa ja estava num campo.
    afterRenderEffect(() => {
      if (this.errors().length > 0) {
        this.region().nativeElement.focus();
      }
    });
  }

  /** O campo para onde a falha leva, quando a tela o mostra. */
  protected linkable(error: DomainError): string | undefined {
    const fields = this.fields();
    return error.field && (!fields || fields.includes(error.field)) ? error.field : undefined;
  }

  /**
   * Leva o foco ao campo recusado.
   *
   * O `href` fica pela semântica de link, mas a navegação por âncora mudaria o endereço, e o
   * roteador trataria isso como troca de rota.
   */
  protected goTo(event: Event, field: string): void {
    event.preventDefault();
    document.getElementById(field)?.focus();
  }
}
