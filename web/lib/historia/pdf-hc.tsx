// OPT-02 (T21) — PDF reutilizable de la historia clínica con adendas.
// OPT-06 (T25) debe entregar la copia al paciente llamando
// `documentoHistoriaFirmada` y esta función; no reimplementa el listado.
// TODO(Q-22): este PDF no es PDF/A. @react-pdf/renderer (MIT) no lo garantiza.
// BORRADOR – requiere revisión jurídica.
import React from 'react';
import { Document, Page, StyleSheet, Text, renderToBuffer } from '@react-pdf/renderer';

import { armarDocumentoHistoriaClinica, type EntradaPdfHistoria } from '../../dominio/adenda-atencion';
import { AVISO_PDF_A } from '../../dominio/firma';

const estilos = StyleSheet.create({
  pagina: { padding: 40, fontSize: 11, fontFamily: 'Helvetica', lineHeight: 1.4 },
  aviso: { fontSize: 9, marginBottom: 8 },
  titulo: { fontSize: 16, marginBottom: 8 },
  linea: { marginBottom: 2 },
});

function DocumentoCopia({ paginas }: { paginas: { lineas: string[]; titulo: string }[] }) {
  return (
    <Document title="Historia clínica">
      {paginas.map((documento, indice) => (
        <Page key={`atencion-${indice}`} size="A4" style={estilos.pagina}>
          <Text style={estilos.aviso}>{AVISO_PDF_A}</Text>
          <Text style={estilos.titulo}>{documento.titulo}</Text>
          {documento.lineas.map((linea, numero) => (
            <Text key={`${indice}-${numero}-${linea.slice(0, 24)}`} style={estilos.linea}>
              {linea}
            </Text>
          ))}
        </Page>
      ))}
    </Document>
  );
}

/**
 * Genera el PDF de una atención o de la copia cronológica.
 * T25 pasa las atenciones ya ordenadas; esta función no reordena ni reimplementa el listado.
 */
export async function renderizarPdfHistoriaClinica(
  entrada: EntradaPdfHistoria | readonly EntradaPdfHistoria[],
): Promise<Buffer> {
  const entradas = Array.isArray(entrada) ? entrada : [entrada];
  if (entradas.length === 0) {
    throw new Error('La copia no tiene atenciones.');
  }
  const paginas = entradas.map((item) => armarDocumentoHistoriaClinica(item));
  const buffer = await renderToBuffer(<DocumentoCopia paginas={paginas} />);
  return Buffer.from(buffer);
}
