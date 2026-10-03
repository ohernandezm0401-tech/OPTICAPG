'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Building2, 
  Mail, 
  Shield, 
  X, 
  UserPlus,
  Edit2,
  Key
} from 'lucide-react';
import { useClinicStore } from '@/lib/store';
import { PLANES_CONFIG } from '@/lib/plans-config';
import { toast } from '@/lib/toast-store';
import { motion, AnimatePresence } from 'motion/react';
import { Role, Usuario } from '@/lib/types';

export default function GlobalUsersPage() {
  const { empresas, usuarios, sedes, addUsuario, updateUsuario, deleteUsuario } = useClinicStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [selectedEmpresaFilter, setSelectedEmpresaFilter] = useState<string>('all');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Form states for new user
  const [newNombre, setNewNombre] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newRole, setNewRole] = useState<Role>('asesor');
  const [newEmpresaId, setNewEmpresaId] = useState('');
  const [newSedesAccess, setNewSedesAccess] = useState<string[]>([]);

  // Form states for editing user
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<Role>('asesor');
  const [editEmpresaId, setEditEmpresaId] = useState('');
  const [editSedesAccess, setEditSedesAccess] = useState<string[]>([]);

  // Password reset states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordUser, setPasswordUser] = useState<Usuario | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [confirmPasswordValue, setConfirmPasswordValue] = useState('');
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedRoleFilter, selectedEmpresaFilter]);

  // Filtering users
  const filteredUsers = usuarios.filter(user => {
    const matchesSearch = user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = selectedRoleFilter === 'all' || user.role === selectedRoleFilter;
    const matchesEmpresa = selectedEmpresaFilter === 'all' || user.empresaId === selectedEmpresaFilter;
    
    return matchesSearch && matchesRole && matchesEmpresa;
  });

  // Paginated users
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const displayedUsers = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNombre || !newEmail || !newPassword || (!newEmpresaId && newRole !== 'owner')) {
      toast.warning('Por favor completa todos los campos requeridos (incluyendo la contraseña).');
      return;
    }

    // Check if company has reached its user limit
    if (newRole !== 'owner') {
      const targetEmpresa = empresas.find(emp => emp.id === newEmpresaId);
      if (targetEmpresa) {
        const planConfig = PLANES_CONFIG[targetEmpresa.plan];
        const maxUsers = targetEmpresa.customMaxUsuarios ?? planConfig.maxUsuarios;
        const currentUsersCount = usuarios.filter(u => u.empresaId === newEmpresaId).length;

        if (currentUsersCount >= maxUsers) {
          toast.error(`No se puede crear el usuario. La empresa "${targetEmpresa.nombre}" ha alcanzado su límite máximo de ${maxUsers} usuarios.`);
          return;
        }
      }
    }

    setIsCreatingUser(true);
    try {
      const response = await fetch('/api/owner/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          nombre: newNombre,
          role: newRole,
          empresaId: newRole === 'owner' ? '' : newEmpresaId
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al crear el usuario.');
      }

      const newUser = {
        id: data.user.id,
        empresaId: data.user.empresaId,
        sedesAccess: newRole === 'owner' ? [] : newSedesAccess,
        nombre: newNombre,
        email: newEmail,
        role: newRole
      };

      addUsuario(newUser);
      toast.success(`Usuario "${newNombre}" creado exitosamente.`);
      
      // Reset form
      setNewNombre('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('asesor');
      setNewEmpresaId('');
      setNewSedesAccess([]);
      setShowAddModal(false);

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error de red al crear el usuario.');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleEditClick = (user: Usuario) => {
    setEditingUser(user);
    setEditNombre(user.nombre);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditEmpresaId(user.empresaId || '');
    setEditSedesAccess(user.sedesAccess || []);
    setShowEditModal(true);
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editNombre || !editEmail || (!editEmpresaId && editRole !== 'owner')) {
      toast.warning('Por favor completa todos los campos requeridos.');
      return;
    }

    // Check if company has reached user limit (only if company was changed)
    if (editRole !== 'owner' && editEmpresaId !== editingUser.empresaId) {
      const targetEmpresa = empresas.find(emp => emp.id === editEmpresaId);
      if (targetEmpresa) {
        const planConfig = PLANES_CONFIG[targetEmpresa.plan];
        const maxUsers = targetEmpresa.customMaxUsuarios ?? planConfig.maxUsuarios;
        const currentUsersCount = usuarios.filter(u => u.empresaId === editEmpresaId).length;

        if (currentUsersCount >= maxUsers) {
          toast.error(`No se puede mover el usuario. La empresa "${targetEmpresa.nombre}" ha alcanzado su límite máximo de ${maxUsers} usuarios.`);
          return;
        }
      }
    }

    updateUsuario(editingUser.id, {
      nombre: editNombre,
      email: editEmail,
      role: editRole,
      empresaId: editRole === 'owner' ? '' : editEmpresaId,
      sedesAccess: editRole === 'owner' ? [] : editSedesAccess
    });

    toast.success(`Usuario "${editNombre}" actualizado correctamente.`);
    setShowEditModal(false);
    setEditingUser(null);
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar al usuario "${userName}"?`)) {
      deleteUsuario(userId);
      toast.success(`Usuario "${userName}" removido de la plataforma.`);
    }
  };

  const handlePasswordClick = (user: Usuario) => {
    setPasswordUser(user);
    setNewPasswordValue('');
    setConfirmPasswordValue('');
    setShowPasswordModal(true);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordUser) return;
    if (!newPasswordValue || !confirmPasswordValue) {
      toast.warning('Por favor completa todos los campos.');
      return;
    }
    if (newPasswordValue !== confirmPasswordValue) {
      toast.error('Las contraseñas no coinciden.');
      return;
    }
    if (newPasswordValue.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setIsSubmittingPassword(true);
    try {
      const response = await fetch('/api/owner/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: passwordUser.id,
          newPassword: newPasswordValue,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar la contraseña');
      }

      toast.success(`Contraseña de "${passwordUser.nombre}" actualizada correctamente.`);
      setShowPasswordModal(false);
      setPasswordUser(null);
      setNewPasswordValue('');
      setConfirmPasswordValue('');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error de red al actualizar la contraseña.');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  // Get available sedes for dynamic listing
  const availableSedesForNew = sedes.filter(s => s.empresaId === newEmpresaId);
  const availableSedesForEdit = sedes.filter(s => s.empresaId === editEmpresaId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuarios Globales</h1>
          <p className="text-muted-foreground text-sm">Monitorea y gestiona todos los usuarios registrados en OptiSaaS.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          Crear Usuario Global
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex items-center gap-4">
          <div className="bg-primary/10 p-3 rounded-lg text-primary">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{usuarios.length}</div>
            <div className="text-xs text-muted-foreground">Usuarios Totales</div>
          </div>
        </div>
        
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex items-center gap-4">
          <div className="bg-purple-500/10 p-3 rounded-lg text-purple-600">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{usuarios.filter(u => u.role === 'admin').length}</div>
            <div className="text-xs text-muted-foreground">Administradores de Clínica</div>
          </div>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex items-center gap-4">
          <div className="bg-emerald-500/10 p-3 rounded-lg text-emerald-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{usuarios.filter(u => u.role === 'optometra').length}</div>
            <div className="text-xs text-muted-foreground">Optómetras Clínicos</div>
          </div>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex items-center gap-4">
          <div className="bg-slate-500/10 p-3 rounded-lg text-slate-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{usuarios.filter(u => u.role === 'asesor').length}</div>
            <div className="text-xs text-muted-foreground">Asesores Comerciales</div>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col">
        
        {/* Filters */}
        <div className="p-4 border-b border-border grid grid-cols-1 md:grid-cols-4 gap-3 bg-secondary/15 rounded-t-xl">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o correo..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
            />
          </div>
          
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="px-3 py-2 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
          >
            <option value="all">Todos los Roles</option>
            <option value="owner">Plataforma (Owner)</option>
            <option value="admin">Administrador</option>
            <option value="optometra">Optómetra</option>
            <option value="asesor">Asesor Comercial</option>
          </select>

          <select
            value={selectedEmpresaFilter}
            onChange={(e) => setSelectedEmpresaFilter(e.target.value)}
            className="px-3 py-2 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
          >
            <option value="all">Todas las Empresas</option>
            {empresas.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.nombre}</option>
            ))}
          </select>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border font-bold">
              <tr>
                <th className="px-6 py-3.5">Nombre / Correo</th>
                <th className="px-6 py-3.5">Empresa</th>
                <th className="px-6 py-3.5">Rol</th>
                <th className="px-6 py-3.5">Sedes Habilitadas</th>
                <th className="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {displayedUsers.map((user) => {
                const userEmp = empresas.find(e => e.id === user.empresaId);
                return (
                  <tr key={user.id} className="hover:bg-secondary/15 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-foreground">{user.nombre}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {userEmp ? (
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          {userEmp.nombre}
                        </div>
                      ) : (
                        <span className="text-xs font-semibold px-2 py-0.5 bg-purple-500/10 text-purple-600 rounded-full border border-purple-500/20">
                          Soporte OptiSaaS
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                        user.role === 'owner' ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' :
                        user.role === 'admin' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                        user.role === 'optometra' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                        'bg-slate-500/10 text-slate-600 border-slate-500/20'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-muted-foreground">
                      {user.role === 'owner' ? (
                        <span>Acceso Global a la Infraestructura</span>
                      ) : (
                        <span>{user.sedesAccess?.length || 0} sedes asignadas</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button 
                          onClick={() => handleEditClick(user)}
                          className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          Editar
                        </button>
                        <button 
                          onClick={() => handlePasswordClick(user)}
                          className="text-xs font-bold text-amber-600 hover:underline flex items-center gap-1"
                        >
                          <Key className="w-3 h-3" />
                          Contraseña
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.id, user.nombre)}
                          className="text-xs font-bold text-destructive hover:underline"
                          disabled={user.role === 'owner' && user.email === 'owner@optisaas.co'}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {displayedUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-muted-foreground font-medium">
                    No se encontraron usuarios con los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between bg-secondary/10 rounded-b-xl">
            <span className="text-xs text-muted-foreground font-medium">
              Mostrando {Math.min(filteredUsers.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)} a {Math.min(filteredUsers.length, currentPage * ITEMS_PER_PAGE)} de {filteredUsers.length} usuarios
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-border rounded-lg bg-background text-xs font-semibold hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Anterior
              </button>
              <span className="text-xs font-mono font-bold flex items-center px-2">
                Pág. {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 border border-border rounded-lg bg-background text-xs font-semibold hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-md rounded-2xl shadow-2xl p-6 border border-border max-h-[85vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center pb-3 border-b border-border mb-4">
                <h2 className="text-lg font-black flex items-center gap-1.5 text-foreground">
                  <UserPlus className="w-5 h-5 text-primary" />
                  Nuevo Usuario Global
                </h2>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form className="space-y-4" onSubmit={handleCreateUser}>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground block">Nombre Completo *</label>
                  <input 
                    type="text" 
                    required 
                    value={newNombre} 
                    onChange={(e) => setNewNombre(e.target.value)} 
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-colors" 
                    placeholder="Ej: Dr. Fernando Gómez" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground block">Correo Electrónico *</label>
                  <input 
                    type="email" 
                    required 
                    value={newEmail} 
                    onChange={(e) => setNewEmail(e.target.value)} 
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-colors" 
                    placeholder="ejemplo@optica.com" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground block">Contraseña Temporal *</label>
                  <input 
                    type="password" 
                    required 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-colors" 
                    placeholder="Min. 6 caracteres" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground block">Rol de Usuario</label>
                    <select 
                      value={newRole} 
                      onChange={(e) => {
                        const val = e.target.value as Role;
                        setNewRole(val);
                        if (val === 'owner') {
                          setNewEmpresaId('');
                          setNewSedesAccess([]);
                        }
                      }} 
                      className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-colors"
                    >
                      <option value="admin">Administrador</option>
                      <option value="optometra">Optómetra</option>
                      <option value="asesor">Asesor</option>
                      <option value="owner">Soporte (Owner)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground block">Empresa Asignada</label>
                    <select 
                      value={newEmpresaId} 
                      disabled={newRole === 'owner'}
                      onChange={(e) => {
                        setNewEmpresaId(e.target.value);
                        setNewSedesAccess([]);
                      }} 
                      className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-colors disabled:opacity-50"
                    >
                      <option value="">Selecciona Empresa</option>
                      {empresas.map(e => (
                        <option key={e.id} value={e.id}>{e.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sedes Assignment Checklist */}
                {newRole !== 'owner' && newEmpresaId && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground block">Sedes Autorizadas</label>
                    {availableSedesForNew.length > 0 ? (
                      <div className="border border-border rounded-xl p-3 bg-secondary/15 max-h-32 overflow-y-auto space-y-2">
                        {availableSedesForNew.map(s => {
                          const isChecked = newSedesAccess.includes(s.id);
                          return (
                            <label key={s.id} className="flex items-center gap-2 text-xs font-medium cursor-pointer text-foreground">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setNewSedesAccess(prev => prev.filter(id => id !== s.id));
                                  } else {
                                    setNewSedesAccess(prev => [...prev, s.id]);
                                  }
                                }}
                                className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                              />
                              <span>{s.nombre} <span className="text-[10px] text-muted-foreground">({s.ciudad})</span></span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-xs text-amber-500 font-medium bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 leading-relaxed">
                        Esta empresa no tiene sedes registradas todavía. Por favor, crea sedes en la pestaña de Empresas primero.
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2.5 pt-4 border-t border-border mt-5">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowAddModal(false);
                      setNewSedesAccess([]);
                    }} 
                    className="px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-secondary rounded-xl transition-colors border border-border"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={isCreatingUser}
                    className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-md flex items-center gap-1 disabled:opacity-50"
                  >
                    {isCreatingUser ? 'Creando...' : 'Crear Usuario'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {showEditModal && editingUser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-md rounded-2xl shadow-2xl p-6 border border-border max-h-[85vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center pb-3 border-b border-border mb-4">
                <h2 className="text-lg font-black flex items-center gap-1.5 text-foreground">
                  <Edit2 className="w-5 h-5 text-primary" />
                  Editar Usuario Global
                </h2>
                <button 
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                  }}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form className="space-y-4" onSubmit={handleUpdateUser}>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground block">Nombre Completo *</label>
                  <input 
                    type="text" 
                    required 
                    value={editNombre} 
                    onChange={(e) => setEditNombre(e.target.value)} 
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-colors" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground block">Correo Electrónico *</label>
                  <input 
                    type="email" 
                    required 
                    value={editEmail} 
                    disabled={editingUser.role === 'owner' && editingUser.email === 'owner@optisaas.co'}
                    onChange={(e) => setEditEmail(e.target.value)} 
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-colors disabled:opacity-50" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground block">Rol de Usuario</label>
                    <select 
                      value={editRole} 
                      disabled={editingUser.role === 'owner' && editingUser.email === 'owner@optisaas.co'}
                      onChange={(e) => {
                        const val = e.target.value as Role;
                        setEditRole(val);
                        if (val === 'owner') {
                          setEditEmpresaId('');
                          setEditSedesAccess([]);
                        }
                      }} 
                      className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-colors disabled:opacity-50"
                    >
                      <option value="admin">Administrador</option>
                      <option value="optometra">Optómetra</option>
                      <option value="asesor">Asesor</option>
                      <option value="owner">Soporte (Owner)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground block">Empresa Asignada</label>
                    <select 
                      value={editEmpresaId} 
                      disabled={editRole === 'owner' || (editingUser.role === 'owner' && editingUser.email === 'owner@optisaas.co')}
                      onChange={(e) => {
                        setEditEmpresaId(e.target.value);
                        setEditSedesAccess([]);
                      }} 
                      className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-colors disabled:opacity-50"
                    >
                      <option value="">Selecciona Empresa</option>
                      {empresas.map(e => (
                        <option key={e.id} value={e.id}>{e.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sedes Assignment Checklist */}
                {editRole !== 'owner' && editEmpresaId && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground block">Sedes Autorizadas</label>
                    {availableSedesForEdit.length > 0 ? (
                      <div className="border border-border rounded-xl p-3 bg-secondary/15 max-h-32 overflow-y-auto space-y-2">
                        {availableSedesForEdit.map(s => {
                          const isChecked = editSedesAccess.includes(s.id);
                          return (
                            <label key={s.id} className="flex items-center gap-2 text-xs font-medium cursor-pointer text-foreground">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setEditSedesAccess(prev => prev.filter(id => id !== s.id));
                                  } else {
                                    setEditSedesAccess(prev => [...prev, s.id]);
                                  }
                                }}
                                className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                              />
                              <span>{s.nombre} <span className="text-[10px] text-muted-foreground">({s.ciudad})</span></span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-xs text-amber-500 font-medium bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 leading-relaxed">
                        Esta empresa no tiene sedes registradas todavía. Por favor, crea sedes en la pestaña de Empresas primero.
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2.5 pt-4 border-t border-border mt-5">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingUser(null);
                    }} 
                    className="px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-secondary rounded-xl transition-colors border border-border"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-md"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PASSWORD CHANGE MODAL */}
      <AnimatePresence>
        {showPasswordModal && passwordUser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-md rounded-2xl shadow-2xl p-6 border border-border max-h-[85vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center pb-3 border-b border-border mb-4">
                <h2 className="text-lg font-black flex items-center gap-1.5 text-foreground">
                  <Key className="w-5 h-5 text-primary" />
                  Cambiar Contraseña
                </h2>
                <button 
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordUser(null);
                  }}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 bg-secondary/20 p-3 rounded-xl border border-border/50 text-left">
                <p className="text-xs text-muted-foreground font-bold uppercase">Usuario</p>
                <p className="text-sm font-black text-foreground mt-0.5">{passwordUser.nombre}</p>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">{passwordUser.email}</p>
              </div>

              <form className="space-y-4" onSubmit={handleUpdatePassword}>
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold uppercase text-muted-foreground block">Nueva Contraseña *</label>
                  <input 
                    type="password" 
                    required 
                    value={newPasswordValue} 
                    onChange={(e) => setNewPasswordValue(e.target.value)} 
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-colors" 
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold uppercase text-muted-foreground block">Confirmar Contraseña *</label>
                  <input 
                    type="password" 
                    required 
                    value={confirmPasswordValue} 
                    onChange={(e) => setConfirmPasswordValue(e.target.value)} 
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-colors" 
                    placeholder="Repite la nueva contraseña"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-border mt-5">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowPasswordModal(false);
                      setPasswordUser(null);
                    }} 
                    className="px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-secondary rounded-xl transition-colors border border-border"
                    disabled={isSubmittingPassword}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-md flex items-center gap-1 disabled:opacity-50"
                    disabled={isSubmittingPassword}
                  >
                    {isSubmittingPassword ? 'Actualizando...' : 'Actualizar Contraseña'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

