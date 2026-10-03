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

function DocumentoPdf({ lineas, titulo }: { lineas: string[]; titulo: string }) {
  return (
    <Document title={titulo}>
      <Page size="A4" style={estilos.pagina}>
        <Text style={estilos.aviso}>{AVISO_PDF_A}</Text>
        <Text style={estilos.titulo}>{titulo}</Text>
        {lineas.map((linea, indice) => (
          <Text key={`${indice}-${linea.slice(0, 24)}`} style={estilos.linea}>
            {linea}
          </Text>
        ))}
      </Page>
    </Document>
  );
}

/** Genera el PDF de la HC. T25 reutiliza esta función para la copia al paciente. */
export async function renderizarPdfHistoriaClinica(entrada: EntradaPdfHistoria): Promise<Buffer> {
  const documento = armarDocumentoHistoriaClinica(entrada);
  const buffer = await renderToBuffer(<DocumentoPdf lineas={documento.lineas} titulo={documento.titulo} />);
  return Buffer.from(buffer);
}
