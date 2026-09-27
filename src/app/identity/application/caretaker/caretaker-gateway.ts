import { InjectionToken } from '@angular/core';
import { Result } from '../../../shared/application/result';
import {
  CaretakerDetail,
  CaretakerPage,
  CaretakerRegistration,
  CaretakerSearch,
  CaretakerUpdate,
} from '../../domain/caretaker';

/**
 * Porta da administração de responsáveis, declarada na aplicação e implementada em
 * `infrastructure`. Toda recusa do backend chega como `Result`, com as mensagens por campo.
 */
export interface CaretakerGateway {
  search(search: CaretakerSearch): Promise<Result<CaretakerPage>>;
  find(id: string): Promise<Result<CaretakerDetail>>;
  register(registration: CaretakerRegistration): Promise<Result<CaretakerDetail>>;
  update(id: string, update: CaretakerUpdate): Promise<Result<CaretakerDetail>>;
  deactivate(id: string): Promise<Result<CaretakerDetail>>;
}

export const CARETAKER_GATEWAY = new InjectionToken<CaretakerGateway>('CaretakerGateway');
