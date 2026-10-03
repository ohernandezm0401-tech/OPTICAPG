// OPT-05 (T24) — Verificación pública del hash de la prescripción.
// La función SQL solo devuelve número, fecha, nombre y registro.
// No desactiva RLS ni usa un rol con BYPASSRLS.
import 'server-only';

import { obtenerPool } from './index';
import { respuestaVerificacion, type VerificacionPublicaPrescripcion } from '../dominio/prescripcion';

export async function verificarPrescripcionPublica(hash: string): Promise<VerificacionPublicaPrescripcion> {
  if (!/^[a-f0-9]{64}$/.test(hash)) return { coincide: false };
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query('SET LOCAL ROLE optisaas_app');
    const filas = await cliente.query<{
      numero: string;
      fecha_emision: string;
      nombre_prescriptor: string;
      registro_profesional: string;
    }>(
      `select numero, fecha_emision::text as fecha_emision, nombre_prescriptor, registro_profesional
         from verificar_prescripcion_por_hash($1)`,
      [hash],
    );
    await cliente.query('COMMIT');
    return respuestaVerificacion(filas.rows[0] ?? null);
  } catch (error) {
    try {
      await cliente.query('ROLLBACK');
    } catch {
      // La transacción ya estaba cerrada.
    }
    throw error;
  } finally {
    cliente.release();
  }
}
