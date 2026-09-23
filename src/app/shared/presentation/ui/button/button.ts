import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Peso visual da ação: o que ela representa, não a cor que ela tem. */
export type ButtonVariant = 'primary' | 'secondary' | 'danger';

/**
 * Ação do sistema.
 *
 * Envolve um `<button>` nativo em vez de estilizar um `<div>`: teclado, foco, `disabled` e
 * submissão de formulário continuam sendo trabalho do navegador. O componente não sabe o que a
 * ação faz — ele avisa que foi pressionado, e quem o usa decide.
 *
 * `busy` é o que impede o duplo envio: enquanto a operação corre, o botão fica desabilitado e
 * anuncia `aria-busy`.
 */
@Component({
  selector: 'ovyx-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      class="button"
      [type]="type()"
      [attr.data-variant]="variant()"
      [disabled]="disabled() || busy()"
      [attr.aria-busy]="busy() ? 'true' : null"
      (click)="pressed.emit()"
    >
      @if (busy()) {
        <span class="button__spinner" aria-hidden="true"></span>
      }
      <span class="button__label"><ng-content /></span>
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
    }

    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--ovyx-space-2);
      min-height: var(--ovyx-control-height-md);
      min-width: var(--ovyx-control-height-md);
      padding: 0 var(--ovyx-space-4);
      border: var(--ovyx-border-width-thick) solid transparent;
      border-radius: var(--ovyx-radius-md);
      font-size: var(--ovyx-font-size-md);
      font-weight: var(--ovyx-font-weight-semibold);
      line-height: var(--ovyx-line-height-tight);
      cursor: pointer;
      transition:
        background-color var(--ovyx-duration-fast) ease,
        border-color var(--ovyx-duration-fast) ease;
    }

    .button[data-variant='primary'] {
      background-color: var(--ovyx-color-brand);
      color: var(--ovyx-color-text-on-brand);
    }

    .button[data-variant='primary']:hover:not(:disabled) {
      background-color: var(--ovyx-color-brand-strong);
    }

    .button[data-variant='secondary'] {
      background-color: var(--ovyx-color-surface-raised);
      border-color: var(--ovyx-color-border-strong);
      color: var(--ovyx-color-text);
    }

    .button[data-variant='secondary']:hover:not(:disabled) {
      background-color: var(--ovyx-color-surface-sunken);
    }

    .button[data-variant='danger'] {
      background-color: var(--ovyx-color-danger-solid);
      color: var(--ovyx-color-text-on-danger);
    }

    .button[data-variant='danger']:hover:not(:disabled) {
      border-color: var(--ovyx-color-text);
    }

    /* Desabilitado não é dito só por cor: o cursor muda e o rótulo continua legível. */
    .button:disabled {
      opacity: var(--ovyx-opacity-disabled);
      cursor: not-allowed;
    }

    /* Em execução: uma forma girando, não uma mudança de tom. */
    .button__spinner {
      width: var(--ovyx-space-4);
      height: var(--ovyx-space-4);
      border: var(--ovyx-border-width-thick) solid currentcolor;
      border-top-color: transparent;
      border-radius: var(--ovyx-radius-pill);
      animation: ovyx-button-spin var(--ovyx-duration-base) linear infinite;
    }

    @media (prefers-reduced-motion: reduce) {
      .button__spinner {
        animation: none;
      }
    }

    @keyframes ovyx-button-spin {
      to {
        transform: rotate(1turn);
      }
    }
  `,
})
export class Button {
  /** Peso da ação. `danger` é reservado ao que destrói ou inativa. */
  readonly variant = input<ButtonVariant>('primary');

  /** `submit` entrega o envio do formulário ao navegador; `button` é o padrão. */
  readonly type = input<'button' | 'submit'>('button');

  readonly disabled = input(false);

  /** Verdadeiro enquanto a ação corre: bloqueia o segundo clique e anuncia o andamento. */
  readonly busy = input(false);

  /** O botão avisa que foi pressionado; quem o usa decide o que isso significa. */
  readonly pressed = output<void>();
}
