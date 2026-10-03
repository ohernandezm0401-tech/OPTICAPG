// SEG-01 / SEG-12 — El secreto TOTP no se guarda en claro.
// `proteger` escribe un sobre AES-256-GCM con la DEK del tenant.
// Un valor legado (T08, sin prefijo de sobre) solo se revela en
// desarrollo y pruebas, hasta `npm run cifrado:recifrar-mfa`.
// En producción un valor en claro es un error. No se registra el secreto.
import 'server-only';

import { esProduccion } from '../../entorno';
import { esSobreTexto } from '../../cifrado/aes.mjs';
import { cifrarTextoTenant, descifrarTextoTenant } from '../../cifrado/servicio';

export interface ProteccionSecretoMfa {
  proteger(secreto: string, tenantId: string): Promise<string>;
  revelar(protegido: string, tenantId: string): Promise<string>;
}

export const proteccionSecretoMfa: ProteccionSecretoMfa = {
  async proteger(secreto, tenantId) {
    const sobre = await cifrarTextoTenant(tenantId, Buffer.from(secreto, 'utf8'));
    return sobre.texto;
  },
  async revelar(protegido, tenantId) {
    if (!esSobreTexto(protegido)) {
      if (esProduccion()) {
        throw new Error('secreto MFA sin cifrado');
      }
      return protegido;
    }
    return descifrarTextoTenant(tenantId, protegido);
  },
};
