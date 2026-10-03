// SEG-08 (T14) — PDF del documento de ejemplo.
// TODO(Q-22): este PDF no es PDF/A. @react-pdf/renderer (MIT) no lo garantiza.
// BORRADOR – requiere revisión jurídica.
import React from 'react';
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';

import { AVISO_DOCUMENTO_EJEMPLO, AVISO_PDF_A, TEXTO_ACUERDO_FIRMA } from '../../dominio/firma';
import { matrizQr } from '../auth/mfa/qr';

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

export interface DatosPdfConsentimiento {
  titulo: string;
  cuerpo: string;
  procedimiento: string;
  version: number;
  hashTexto: string;
  firmante: string;
  nombre: string;
  documento: string;
  horaBogota: string;
  ip: string;
  trazoDataUrl: string;
}

function PdfConsentimiento({ datos }: { datos: DatosPdfConsentimiento }) {
  return (
    <Document title={datos.titulo} author={datos.nombre}>
      <Page size="A4" style={estilos.pagina}>
        <Text style={estilos.aviso}>BORRADOR – requiere revisión jurídica</Text>
        <Text style={estilos.aviso}>{AVISO_PDF_A}</Text>
        <Text style={estilos.titulo}>{datos.titulo}</Text>
        <Text>Procedimiento: {datos.procedimiento}</Text>
        <Text>Versión de la plantilla: {String(datos.version)}</Text>
        <Text>Hash del texto: {datos.hashTexto}</Text>
        <Text style={estilos.bloque}>{datos.cuerpo}</Text>
        <View style={estilos.bloque}>
          <Text>Firma de {datos.firmante}: {datos.nombre}</Text>
          <Text>Documento: {datos.documento}</Text>
          <Text>Hora (America/Bogota): {datos.horaBogota}</Text>
          <Text>IP: {datos.ip}</Text>
          <Text>{TEXTO_ACUERDO_FIRMA}</Text>
          {/* No es un <img> de HTML: @react-pdf/renderer no tiene alt. */}
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={datos.trazoDataUrl} style={{ width: 180, height: 60, marginTop: 8 }} />
        </View>
      </Page>
    </Document>
  );
}

export async function renderizarPdfConsentimiento(datos: DatosPdfConsentimiento): Promise<Buffer> {
  const buffer = await renderToBuffer(<PdfConsentimiento datos={datos} />);
  return Buffer.from(buffer);
}

export interface DatosPdfPrescripcion {
  lineas: string[];
  nombreProfesional: string;
  registroProfesional: string;
  lineaProfesional: string;
  urlVerificacion: string;
}

const CELDA_QR = 3;

function codigoQr(url: string) {
  let matriz: boolean[][];
  try {
    matriz = matrizQr(url);
  } catch {
    return <Text>TODO: código QR no generado. Use la URL de verificación impresa arriba.</Text>;
  }
  return (
    <View style={{ marginTop: 8 }}>
      {matriz.map((fila, y) => {
        const tramos: { x: number; ancho: number }[] = [];
        let inicio = -1;
        fila.forEach((oscuro, x) => {
          if (oscuro && inicio < 0) inicio = x;
          if (!oscuro && inicio >= 0) {
            tramos.push({ x: inicio, ancho: x - inicio });
            inicio = -1;
          }
        });
        if (inicio >= 0) tramos.push({ x: inicio, ancho: fila.length - inicio });
        return (
          <View key={`qr-${y}`} style={{ height: CELDA_QR, position: 'relative' }}>
            {tramos.map((tramo) => (
              <View
                key={`qr-${y}-${tramo.x}`}
                style={{
                  position: 'absolute',
                  left: tramo.x * CELDA_QR,
                  width: tramo.ancho * CELDA_QR,
                  height: CELDA_QR,
                  backgroundColor: '#000000',
                }}
              />
            ))}
          </View>
        );
      })}
    </View>
  );
}

function sinCorte(palabra: string): string[] {
  return [palabra];
}

function PdfPrescripcion({ datos }: { datos: DatosPdfPrescripcion }) {
  return (
    <Document title="Prescripción" author={datos.nombreProfesional}>
      <Page size="A4" style={estilos.pagina}>
        <Text style={estilos.aviso} hyphenationCallback={sinCorte}>
          BORRADOR – requiere revisión jurídica
        </Text>
        <Text style={estilos.aviso} hyphenationCallback={sinCorte}>
          {AVISO_PDF_A}
        </Text>
        <Text style={estilos.titulo} hyphenationCallback={sinCorte}>
          Prescripción
        </Text>
        {datos.lineas.map((linea, indice) => (
          <Text key={`${indice}-${linea.slice(0, 24)}`} style={estilos.bloque} hyphenationCallback={sinCorte}>
            {linea}
          </Text>
        ))}
        <Text style={estilos.sello} hyphenationCallback={sinCorte}>
          {datos.lineaProfesional}
        </Text>
        <Text hyphenationCallback={sinCorte}>Nombre completo del prescriptor: {datos.nombreProfesional}</Text>
        <Text hyphenationCallback={sinCorte}>Registro profesional: {datos.registroProfesional}</Text>
        <Text style={estilos.bloque} hyphenationCallback={sinCorte}>
          Verificación del hash: {datos.urlVerificacion}
        </Text>
        {codigoQr(datos.urlVerificacion)}
      </Page>
    </Document>
  );
}

/** PDF A4 de la prescripción. TODO(Q-22): no es PDF/A. El QR reutiliza el generador de T08. */
export async function renderizarPdfPrescripcion(datos: DatosPdfPrescripcion): Promise<Buffer> {
  const buffer = await renderToBuffer(<PdfPrescripcion datos={datos} />);
  return Buffer.from(buffer);
}
