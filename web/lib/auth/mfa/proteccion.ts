// SEG-01 (T08) / SEG-12 (T11) — El secreto TOTP se persiste solo por esta
// interfaz. El sobre AES-256-GCM usa la DEK del tenant (clave maestra fuera
// del repositorio). Quien lea la columna obtiene ciphertext, no el secreto.
import 'server-only';

import { obtenerCifrado } from '../../cifrado/servicio';

export interface ProteccionSecretoMfa {
  proteger(secreto: string, tenantId: string): Promise<string>;
  revelar(protegido: string, tenantId: string): Promise<string>;
}

export const proteccionEnvelope: ProteccionSecretoMfa = {
  proteger(secreto, tenantId) {
    return obtenerCifrado().cifrarSecretoMfa(tenantId, secreto);
  },
  revelar(protegido, tenantId) {
    return obtenerCifrado().revelarSecretoMfa(tenantId, protegido);
  },
};
