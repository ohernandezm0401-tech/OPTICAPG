'use client';

import React, { useEffect, useRef } from 'react';

interface Props {
  onChange: (dato: { pngBase64: string; puntos: unknown }) => void;
}

export function PadPaciente({ onChange }: Props) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const aviso = useRef(onChange);

  useEffect(() => {
    aviso.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const canvas = lienzo.current;
    if (!canvas) return;
    const contexto = canvas.getContext('2d');
    if (contexto) {
      contexto.fillStyle = '#ffffff';
      contexto.fillRect(0, 0, canvas.width, canvas.height);
    }
    let cancelado = false;
    let limpiar: (() => void) | null = null;
    void import('signature_pad').then(({ default: SignaturePad }) => {
      if (cancelado || !lienzo.current) return;
      const pad = new SignaturePad(lienzo.current, { backgroundColor: 'rgb(255, 255, 255)' });
      const emitir = () => {
        if (pad.isEmpty()) return;
        const dataUrl = pad.toDataURL('image/png');
        const base64 = dataUrl.split(',')[1] ?? '';
        aviso.current({ pngBase64: base64, puntos: pad.toData() });
      };
      pad.addEventListener('endStroke', emitir);
      limpiar = () => pad.off();
    });
    return () => {
      cancelado = true;
      limpiar?.();
    };
  }, []);

  return (
    <canvas
      ref={lienzo}
      width={520}
      height={160}
      aria-label="Trazo de la firma del paciente"
      className="w-full max-w-xl rounded-md border border-input bg-white"
    />
  );
}
