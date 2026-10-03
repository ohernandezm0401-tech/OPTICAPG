// SEG-08 (T14) — PDF del documento de ejemplo.
// TODO(Q-22): este PDF no es PDF/A. @react-pdf/renderer (MIT) no lo garantiza.
// BORRADOR – requiere revisión jurídica.
import React from 'react';
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';

import { AVISO_DOCUMENTO_EJEMPLO, AVISO_PDF_A, TEXTO_ACUERDO_FIRMA } from '../../dominio/firma';

const estilos = StyleSheet.create({
  pagina: { padding: 40, fontSize: 11, fontFamily: 'Helvetica', lineHeight: 1.4 },
  aviso: { fontSize: 9, marginBottom: 8 },
  titulo: { fontSize: 16, marginBottom: 8 },
  bloque: { marginTop: 10 },
  sello: { marginTop: 16, fontSize: 11 },
});

export interface DatosPdfFirma {
  titulo: string;
  cuerpo: string;
  lineaProfesional: string;
  nombreProfesional: string;
  registroProfesional: string;
  horaBogota: string;
  paciente: {
    nombre: string;
    documento: string;
    horaBogota: string;
    ip: string;
    otpVerificado: boolean;
    otpCanal: string | null;
    trazoDataUrl: string;
  } | null;
}

function DocumentoPdf({ datos }: { datos: DatosPdfFirma }) {
  return (
    <Document title={datos.titulo} author={datos.nombreProfesional}>
      <Page size="A4" style={estilos.pagina}>
        <Text style={estilos.aviso}>BORRADOR – requiere revisión jurídica</Text>
        <Text style={estilos.aviso}>{AVISO_PDF_A}</Text>
        <Text style={estilos.aviso}>{AVISO_DOCUMENTO_EJEMPLO}</Text>
        <Text style={estilos.titulo}>{datos.titulo}</Text>
        <Text>{datos.cuerpo}</Text>
        <Text style={estilos.sello}>{datos.lineaProfesional}</Text>
        <Text>Nombre completo: {datos.nombreProfesional}</Text>
        <Text>Registro profesional: {datos.registroProfesional}</Text>
        <Text>Fecha y hora (America/Bogota): {datos.horaBogota}</Text>
        {datos.paciente ? (
          <View style={estilos.bloque}>
            <Text>Firma del paciente: {datos.paciente.nombre}</Text>
            <Text>Documento: {datos.paciente.documento}</Text>
            <Text>Hora (America/Bogota): {datos.paciente.horaBogota}</Text>
            <Text>IP: {datos.paciente.ip}</Text>
            <Text>
              OTP: {datos.paciente.otpVerificado ? 'verificado' : 'sin verificar'}
              {datos.paciente.otpCanal ? ` (${datos.paciente.otpCanal})` : ''}
            </Text>
            <Text>{TEXTO_ACUERDO_FIRMA}</Text>
            {/* No es un <img> de HTML: @react-pdf/renderer no tiene alt. */}
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={datos.paciente.trazoDataUrl} style={{ width: 180, height: 60, marginTop: 8 }} />
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

export async function renderizarPdfFirma(datos: DatosPdfFirma): Promise<Buffer> {
  const buffer = await renderToBuffer(<DocumentoPdf datos={datos} />);
  return Buffer.from(buffer);
}
