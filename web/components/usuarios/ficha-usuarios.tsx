'use client';

// ADM-02 (T17) — Alta por invitación, rol por sede y perfil profesional.
// Solo datos sintéticos. La verificación del registro es manual.
import { useEffect, useState, type FormEvent } from 'react';

import {
  accionCambiarRol,
  accionDesactivarUsuario,
  accionGuardarPerfil,
  accionInvitarUsuario,
  accionListarUsuarios,
} from '@/app/acciones/usuarios';
import { PageHeader } from '@/components/shared/page-header';

interface RolSede {
  sede_id: string;
  rol: string;
}

interface Vista {
  id: string;
  email: string;
  estado: string;
  roles: RolSede[];
  perfil: { registro_profesional: string; estado: string; entidad: string | null } | null;
}

const ETIQUETA_ROL: Record<string, string> = {
  admin: 'Administrador',
  asesor: 'Asesor',
  optometra: 'Optómetra',
  oftalmologo: 'Oftalmólogo',
  auxiliar_clinico: 'Auxiliar clínico',
  tecnico_lab: 'Técnico de laboratorio',
  auditor: 'Auditor',
};

export function FichaUsuarios({ roles }: { roles: readonly string[] }) {
  const [usuarios, setUsuarios] = useState<Vista[]>([]);
  const [mensaje, setMensaje] = useState('');
  const [enlace, setEnlace] = useState('');
  const [email, setEmail] = useState('');
  const [rol, setRol] = useState('asesor');
  const [sedeId, setSedeId] = useState('');
  const [perfilId, setPerfilId] = useState('');

  async function recargar() {
    const lista = await accionListarUsuarios();
    if (!lista.ok) {
      setMensaje(lista.mensaje ?? 'No se pudieron leer los usuarios.');
      return;
    }
    const filas = lista.usuarios ?? [];
    setUsuarios(filas);
    const sede = filas.flatMap((usuario) => usuario.roles.map((item) => item.sede_id))[0] ?? '';
    setSedeId((actual) => actual || sede);
    setPerfilId((actual) => actual || filas[0]?.id || '');
  }

  useEffect(() => {
    void recargar();
  }, []);

  async function invitar(evento: FormEvent) {
    evento.preventDefault();
    const resultado = await accionInvitarUsuario({ email, sedeId, rol });
    setMensaje(resultado.mensaje ?? '');
    setEnlace(resultado.enlace ?? '');
    if (resultado.usuarios) setUsuarios(resultado.usuarios);
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-10">
      <PageHeader
        title="Usuarios y roles"
        subtitle="Invitación de un solo uso y rol por sede. Este entorno no envía el correo: el enlace queda registrado. La verificación del registro profesional es manual."
      />
      <p className="text-sm text-muted-foreground">
        TODO(NV-23): no se consulta un registro oficial. BORRADOR – requiere revisión jurídica.
      </p>
      {mensaje ? (
        <p className="text-sm" role="alert">
          {mensaje}
        </p>
      ) : null}
      {enlace ? (
        <p className="text-sm break-all" data-enlace-invitacion="true">
          Enlace de invitación (no enviado): {enlace}
        </p>
      ) : null}

      <form className="space-y-3" onSubmit={(evento) => void invitar(evento)}>
        <label className="block text-sm">
          Correo
          <input
            className="mt-1 w-full rounded-md border px-2 py-1"
            type="email"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          Sede
          <select className="mt-1 w-full rounded-md border px-2 py-1" value={sedeId} onChange={(evento) => setSedeId(evento.target.value)}>
            {Array.from(new Set(usuarios.flatMap((usuario) => usuario.roles.map((item) => item.sede_id)))).map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Rol en la sede
          <select className="mt-1 w-full rounded-md border px-2 py-1" value={rol} onChange={(evento) => setRol(evento.target.value)} aria-label="Rol en la sede">
            {roles.map((opcion) => (
              <option key={opcion} value={opcion}>
                {ETIQUETA_ROL[opcion] ?? opcion}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
          Invitar usuario
        </button>
      </form>

      <ul className="space-y-3">
        {usuarios.map((usuario) => (
          <li key={usuario.id} className="rounded-md border p-3 text-sm">
            <p>
              {usuario.email} · <span>{usuario.estado}</span>
            </p>
            <p>{usuario.roles.map((item) => ETIQUETA_ROL[item.rol] ?? item.rol).join(', ') || 'Sin rol'}</p>
            {usuario.perfil ? (
              <p>
                Tarjeta {usuario.perfil.registro_profesional} · {usuario.perfil.estado}
                {usuario.perfil.entidad ? ` · ${usuario.perfil.entidad}` : ''}
              </p>
            ) : (
              <p>Sin registro profesional</p>
            )}
            {usuario.roles.map((item) => (
              <form
                key={`${usuario.id}-${item.sede_id}-${item.rol}`}
                className="mt-2 flex flex-wrap gap-2"
                onSubmit={(evento) => {
                  evento.preventDefault();
                  const datos = new FormData(evento.currentTarget);
                  void accionCambiarRol({
                    usuarioId: usuario.id,
                    sedeId: item.sede_id,
                    rolAnterior: item.rol,
                    rolNuevo: String(datos.get('rolNuevo') ?? ''),
                  }).then((resultado) => {
                    setMensaje(resultado.mensaje ?? '');
                    if (resultado.usuarios) setUsuarios(resultado.usuarios);
                  });
                }}
              >
                <label className="text-sm">
                  Cambiar {ETIQUETA_ROL[item.rol] ?? item.rol}
                  <select name="rolNuevo" className="ml-2 rounded-md border px-2 py-1" defaultValue={item.rol} aria-label={`Nuevo rol de ${usuario.email}`}>
                    {roles.map((opcion) => (
                      <option key={opcion} value={opcion}>
                        {ETIQUETA_ROL[opcion] ?? opcion}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit" className="rounded-md border px-2 py-1">
                  Guardar rol
                </button>
              </form>
            ))}
            <button
              type="button"
              className="mt-2 rounded-md border px-2 py-1"
              onClick={() =>
                void accionDesactivarUsuario(usuario.id).then((resultado) => {
                  setMensaje(resultado.mensaje ?? '');
                  if (resultado.usuarios) setUsuarios(resultado.usuarios);
                })
              }
            >
              Desactivar
            </button>
          </li>
        ))}
      </ul>

      <form
        className="space-y-3"
        onSubmit={(evento) => {
          evento.preventDefault();
          const datos = new FormData(evento.currentTarget);
          const archivo = datos.get('firma');
          const leer = async () => {
            let firmaPngBase64 = '';
            if (archivo instanceof File && archivo.size > 0) {
              const bytes = new Uint8Array(await archivo.arrayBuffer());
              let binario = '';
              bytes.forEach((byte) => {
                binario += String.fromCharCode(byte);
              });
              firmaPngBase64 = btoa(binario);
            }
            const resultado = await accionGuardarPerfil({
              usuarioId: perfilId,
              nombreCompleto: String(datos.get('nombre') ?? ''),
              documento: String(datos.get('documento') ?? ''),
              tipo: String(datos.get('tipo') ?? ''),
              registroProfesional: String(datos.get('tarjeta') ?? ''),
              entidad: String(datos.get('entidad') ?? ''),
              vigenteHasta: String(datos.get('vigencia') ?? ''),
              firmaPngBase64,
              verificadoManual: datos.get('verificado') === 'on',
            });
            setMensaje(resultado.mensaje ?? '');
            if (resultado.usuarios) setUsuarios(resultado.usuarios);
          };
          void leer();
        }}
      >
        <h2 className="text-lg font-semibold">Perfil profesional</h2>
        <label className="block text-sm">
          Usuario
          <select className="mt-1 w-full rounded-md border px-2 py-1" value={perfilId} onChange={(evento) => setPerfilId(evento.target.value)}>
            {usuarios.map((usuario) => (
              <option key={usuario.id} value={usuario.id}>
                {usuario.email}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Nombre
          <input name="nombre" className="mt-1 w-full rounded-md border px-2 py-1" required />
        </label>
        <label className="block text-sm">
          Documento
          <input name="documento" className="mt-1 w-full rounded-md border px-2 py-1" required />
        </label>
        <label className="block text-sm">
          Tipo
          <select name="tipo" className="mt-1 w-full rounded-md border px-2 py-1" defaultValue="optometra">
            <option value="optometra">Optómetra</option>
            <option value="oftalmologo">Oftalmólogo</option>
          </select>
        </label>
        <label className="block text-sm">
          Tarjeta profesional
          <input name="tarjeta" className="mt-1 w-full rounded-md border px-2 py-1" required />
        </label>
        <label className="block text-sm">
          Entidad
          <input name="entidad" className="mt-1 w-full rounded-md border px-2 py-1" required />
        </label>
        <label className="block text-sm">
          Vigencia declarada
          <input name="vigencia" type="date" className="mt-1 w-full rounded-md border px-2 py-1" required />
        </label>
        <label className="block text-sm">
          Firma digitalizada (PNG)
          <input name="firma" type="file" accept="image/png" className="mt-1 w-full text-sm" />
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input name="verificado" type="checkbox" />
          Confirmo la verificación manual del registro. No hay consulta a un registro oficial.
        </label>
        <button type="submit" className="rounded-md border px-3 py-2 text-sm">
          Guardar perfil
        </button>
      </form>
    </div>
  );
}
