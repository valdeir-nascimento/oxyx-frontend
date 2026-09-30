import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DomainError } from '../../../../shared/domain/domain-error';
import { Notification } from '../../../../shared/domain/notification';
import { Button } from '../../../../shared/presentation/ui/button/button';
import { Dialog } from '../../../../shared/presentation/ui/dialog/dialog';
import { ErrorSummary } from '../../../../shared/presentation/ui/error-summary/error-summary';
import { FormField } from '../../../../shared/presentation/ui/form-field/form-field';
import { Toaster } from '../../../../shared/presentation/ui/toast/toaster';
import { ExportDailyReportsUseCase } from '../../../application/daily-report/export-daily-reports.usecase';
import { monthToDateOf } from '../../../domain/daily-report';
import { paramOf } from '../route-params';

/**
 * O id de cada campo na tela, pelo nome com que o backend o recusa. Os ids são próprios porque o diálogo abre
 * sobre a lista, e dois campos com o mesmo id levariam o rótulo e o resumo de erros a outro campo.
 */
const FIELD_IDS: Readonly<Record<string, string>> = { from: 'exportFrom', to: 'exportTo' };

/** O dia de hoje no relógio de quem exporta, como o campo de data o escreve ("2026-09-28"). */
function today(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * A exportação dos relatórios de um setor num intervalo (US1 da 007; FR-011 a FR-013), em diálogo sobre a
 * lista, pela rota filha `exportar`.
 *
 * O intervalo vem sugerido do primeiro dia do mês até hoje, no relógio de quem exporta, como a data sugerida da
 * pesagem (R-015). O diálogo não valida as datas: entrega o que foi digitado, e o backend devolve as falhas de
 * uma vez, cada uma no seu campo. Enquanto a planilha é gerada, o envio fica desabilitado e diz "Gerando…"; no
 * sucesso, a planilha é salva, o aviso diz o nome dela, e o diálogo volta à lista. O setor inativo também
 * exporta, porque os relatórios dele continuam consultáveis.
 */
@Component({
  selector: 'ovyx-export-dialog',
  imports: [Button, Dialog, ErrorSummary, FormField],
  templateUrl: './export-dialog.html',
  styleUrl: './export-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExportDialog {
  private readonly exportReports = inject(ExportDailyReportsUseCase);
  private readonly toaster = inject(Toaster);
  private readonly router = inject(Router);
  private readonly sectorId = paramOf(inject(ActivatedRoute).snapshot, 'sectorId');

  protected readonly fields = Object.values(FIELD_IDS);
  protected readonly form = inject(FormBuilder).nonNullable.group(monthToDateOf(today()));

  protected readonly notification = signal(Notification.empty());
  protected readonly submitting = signal(false);

  /** As recusas, com o campo trocado pelo id dele na tela, para o resumo levar ao campo certo. */
  protected readonly errors = computed<readonly DomainError[]>(() =>
    this.notification().errors.map((error) =>
      error.field && FIELD_IDS[error.field] ? { ...error, field: FIELD_IDS[error.field] } : error,
    ),
  );

  protected messageFor(field: string): string | undefined {
    return this.notification().messageFor(field);
  }

  /** Fechar volta à lista. Enquanto gera, não fecha. */
  protected close(): void {
    if (!this.submitting()) {
      void this.router.navigate(this.list());
    }
  }

  protected async submit(): Promise<void> {
    if (this.submitting()) {
      return;
    }
    const { from, to } = this.form.getRawValue();
    this.submitting.set(true);
    const result = await this.exportReports.execute(this.sectorId, from, to);
    this.submitting.set(false);

    if (!result.success) {
      this.notification.set(result.notification);
      return;
    }
    this.notification.set(Notification.empty());
    this.toaster.show(`Planilha gerada (${result.value}).`);
    await this.router.navigate(this.list());
  }

  private list(): string[] {
    return ['/setores', this.sectorId, 'relatorios'];
  }
}
