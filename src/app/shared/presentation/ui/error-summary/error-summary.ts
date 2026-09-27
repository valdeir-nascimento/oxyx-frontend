import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  input,
  viewChild,
} from '@angular/core';
import { DomainError } from '../../../domain/domain-error';
import { Icon } from '../icon/icon';

let nextId = 0;

/** O título da recusa de preenchimento: alguma falha leva a um campo da tela. */
const FORM_HEADING = 'Não foi possível concluir. Corrija o que está indicado:';

/** O título da recusa que não aponta campo nenhum da tela: não há o que corrigir no formulário. */
const OPERATION_HEADING = 'Não foi possível concluir a operação:';

/**
 * Resumo da recusa de um formulário: todas as falhas de uma vez (FR-017), cada uma com o caminho até
 * o seu campo (T234). Visualmente é o aviso de perigo do design system (`.alert.danger`).
 *
 * Recebe o foco quando aparece e a cada recusa nova. É a mudança de foco que o leitor de tela
 * anuncia — antes, o foco ficava no botão e a pessoa não ouvia nada, porque a mensagem de cada
 * campo só é lida quando o foco entra nele. Pelo mesmo motivo não usa `role="alert"`: o anúncio já
 * vem do foco, e o alerta faria o leitor repetir a recusa. É um `group`, e não um `div` sem papel,
 * porque só um papel que admite nome deixa o título nomeá-lo (ARIA 1.2).
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
  imports: [Icon],
  templateUrl: './error-summary.html',
  styleUrl: './error-summary.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
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

  /**
   * O título, que também nomeia o resumo. Sem título dado, fala de formulário quando alguma falha leva
   * a um campo da tela, e da operação quando nenhuma leva: a gaiola recusada porque o setor está
   * inativo, ou uma falha de rede, não têm o que corrigir. A tela em que a recusa nunca é de
   * preenchimento — uma ação recusada — diz o que convém a ela.
   */
  readonly heading = input<string | undefined>(undefined);

  protected readonly title = computed(
    () => this.heading() ?? (this.errors().some((error) => this.linkable(error)) ? FORM_HEADING : OPERATION_HEADING),
  );

  protected readonly titleId = `ovyx-error-summary-${++nextId}`;

  /**
   * As falhas sem repetir a mesma frase: o conflito de gaiola põe a mesma mensagem na bateria e no
   * número, e o resumo a lia duas vezes. Fica a primeira, com o link para o primeiro campo; junto de
   * cada campo a mensagem continua.
   */
  protected readonly shown = computed(() => {
    const seen = new Set<string>();
    return this.errors().filter((error) => !seen.has(error.message) && seen.add(error.message));
  });

  private readonly region = viewChild.required<ElementRef<HTMLElement>>('region');

  constructor() {
    // Roda depois de desenhar, a cada lista de erros nova: cada recusa volta a levar o foco ao
    // resumo, inclusive a segunda, quando a pessoa já estava num campo.
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
