'use client';

import { useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';

import { accionAceptarInvitacion } from '@/app/acciones/usuarios';

export default function PaginaInvitacion() {
  const params = useParams<{ token: string }>();
  const [contrasena, setContrasena] = useState('');
  const [mensaje, setMensaje] = useState('');

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    const token = Array.isArray(params.token) ? params.token[0] : params.token;
    const resultado = await accionAceptarInvitacion(token ?? '', contrasena);
    setMensaje(resultado.mensaje ?? '');
  }

  return (
    <main className="mx-auto max-w-md space-y-4 p-8">
      <h1 className="text-2xl font-bold">Activar invitación</h1>
      <p className="text-sm text-muted-foreground">El enlace es de un solo uso. Elija una contraseña de al menos 12 caracteres.</p>
      <form className="space-y-3" onSubmit={(evento) => void enviar(evento)}>
        <label className="block text-sm">
          Contraseña
          <input
            className="mt-1 w-full rounded-md border px-2 py-1"
            type="password"
            value={contrasena}
            onChange={(evento) => setContrasena(evento.target.value)}
            autoComplete="new-password"
            required
          />
        </label>
        <button type="submit" className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
          Activar cuenta
        </button>
      </form>
      {mensaje ? (
        <p className="text-sm" role="status">
          {mensaje}
        </p>
      ) : null}
    </main>
  );
}
