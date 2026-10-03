import { FichaUsuarios } from '@/components/usuarios/ficha-usuarios';
import { ROLES_ASIGNABLES } from '@/dominio/usuarios-adm';

export default function UsuariosAdminPage() {
  return <FichaUsuarios roles={[...ROLES_ASIGNABLES]} />;
}
