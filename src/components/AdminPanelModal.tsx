import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Users,
  Dumbbell,
  Calendar,
  Lock,
  Unlock,
  Trash2,
  RotateCcw,
  AlertTriangle,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  Activity
} from 'lucide-react';
import { api } from '../services/api';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  isBlocked: boolean;
  createdAt: string;
  programsCount: number;
  daysCount: number;
  exercisesCount: number;
  sessionsCount: number;
  lastSessionAt: string | null;
}

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  currentUserId
}) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Modal de confirmação
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAdminUsers();
      setUsers(data);
    } catch {
      setActionNotice('Erro ao carregar lista de usuários');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  if (!isOpen) return null;

  // Filtragem de busca
  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Ações Administrativas
  const handleToggleBlock = (user: AdminUser) => {
    const nextState = !user.isBlocked;
    setConfirmDialog({
      isOpen: true,
      title: nextState ? `Bloquear Usuário ${user.name}` : `Desbloquear Usuário ${user.name}`,
      description: nextState
        ? `O usuário ${user.email} não conseguirá mais fazer login no AppFit até ser desbloqueado.`
        : `O acesso do usuário ${user.email} será restabelecido imediatamente.`,
      confirmText: nextState ? 'Sim, Bloquear' : 'Sim, Desbloquear',
      onConfirm: async () => {
        const ok = await api.blockUser(user.id, nextState);
        if (ok) {
          showNotice(`Usuário ${user.name} ${nextState ? 'bloqueado' : 'desbloqueado'} com sucesso!`);
          fetchUsers();
        }
      }
    });
  };

  const handleDeleteUserWorkouts = (user: AdminUser) => {
    setConfirmDialog({
      isOpen: true,
      title: `Apagar Treino de ${user.name}`,
      description: `Tem certeza que deseja apagar a ficha de treino atual de ${user.name}? O histórico de sessões anteriores será preservado.`,
      confirmText: 'Apagar Treino',
      onConfirm: async () => {
        const ok = await api.deleteUserWorkouts(user.id);
        if (ok) {
          showNotice(`Treino de ${user.name} apagado com sucesso!`);
          fetchUsers();
        }
      }
    });
  };

  const handleCleanupUserHistory = (user: AdminUser) => {
    setConfirmDialog({
      isOpen: true,
      title: `Limpar Histórico de ${user.name}`,
      description: `Tem certeza que deseja apagar todo o histórico de treinos realizados por ${user.name}? Esta ação não pode ser desfeita.`,
      confirmText: 'Limpar Histórico',
      onConfirm: async () => {
        const ok = await api.cleanupHistory({ targetUserId: user.id, clearAll: true });
        if (ok) {
          showNotice(`Histórico de ${user.name} limpo com sucesso!`);
          fetchUsers();
        }
      }
    });
  };

  const handleDeleteUser = (user: AdminUser) => {
    if (user.role === 'admin') {
      alert('Não é permitido excluir o usuário Administrador principal.');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: `Excluir Conta de ${user.name}`,
      description: `Tem certeza que deseja remover completamente a conta de ${user.name} (${user.email}) e todos os seus dados?`,
      confirmText: 'Excluir Usuário',
      onConfirm: async () => {
        const ok = await api.deleteUser(user.id);
        if (ok) {
          showNotice(`Usuário ${user.name} removido do sistema.`);
          fetchUsers();
        }
      }
    });
  };

  const handleCleanOldHistoryGlobal = (days: number) => {
    setConfirmDialog({
      isOpen: true,
      title: `Limpar Históricos Anteriores a ${days} Dias`,
      description: `Todas as sessões de treino de todos os usuários concluídas há mais de ${days} dias serão removidas para otimizar espaço.`,
      confirmText: 'Confirmar Limpeza',
      onConfirm: async () => {
        const ok = await api.cleanupHistory({ olderThanDays: days });
        if (ok) {
          showNotice(`Históricos anteriores a ${days} dias foram removidos com sucesso.`);
          fetchUsers();
        }
      }
    });
  };

  const handleResetAllSystem = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Zerar Treinos e Histórico Geral do Sistema',
      description: 'ATENÇÃO: Isso irá zerar todas as fichas de treino e históricos de sessões de todos os usuários do banco PostgreSQL.',
      confirmText: 'Sim, Zerar Tudo',
      onConfirm: async () => {
        const ok = await api.resetAllSystemData();
        if (ok) {
          showNotice('Sistema e banco de dados totalmente zerados!');
          fetchUsers();
        }
      }
    });
  };

  // Totais
  const totalUsers = users.length;
  const blockedUsers = users.filter(u => u.isBlocked).length;
  const totalWorkouts = users.reduce((acc, u) => acc + (u.programsCount || 0), 0);
  const totalSessions = users.reduce((acc, u) => acc + (u.sessionsCount || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b1220] border-2 border-amber-500/50 rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="p-4 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-md shadow-amber-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                Painel Administrativo
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  AppFit Admin
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">Gerenciamento completo de usuários e banco de dados</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Notice Bar */}
        {actionNotice && (
          <div className="bg-emerald-950/80 border-b border-emerald-500/40 px-4 py-2 flex items-center gap-2 text-xs text-emerald-300 font-semibold animate-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-2.5">
              <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                <Users className="w-3 h-3 text-cyan-400" />
                Usuários
              </div>
              <div className="text-lg font-black text-white mt-0.5">{totalUsers}</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-2.5">
              <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                <Lock className="w-3 h-3 text-red-400" />
                Bloqueados
              </div>
              <div className="text-lg font-black text-red-400 mt-0.5">{blockedUsers}</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-2.5">
              <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                <Dumbbell className="w-3 h-3 text-teal-400" />
                Fichas
              </div>
              <div className="text-lg font-black text-teal-300 mt-0.5">{totalWorkouts}</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-2.5">
              <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                <Activity className="w-3 h-3 text-amber-400" />
                Treinos Feitos
              </div>
              <div className="text-lg font-black text-amber-300 mt-0.5">{totalSessions}</div>
            </div>
          </div>

          {/* Quick Maintenance Actions Accordion */}
          <div className="bg-[#080e1b] rounded-2xl p-3 border border-slate-800 space-y-2.5">
            <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Manutenção Geral do Sistema</span>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <button
                onClick={() => handleCleanOldHistoryGlobal(30)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 font-semibold transition-all active:scale-95 flex items-center gap-1.5 text-[11px]"
              >
                <Clock className="w-3 h-3 text-cyan-400" />
                Limpar treinos &gt; 30 dias
              </button>

              <button
                onClick={() => handleCleanOldHistoryGlobal(60)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 font-semibold transition-all active:scale-95 flex items-center gap-1.5 text-[11px]"
              >
                <Clock className="w-3 h-3 text-cyan-400" />
                Limpar treinos &gt; 60 dias
              </button>

              <button
                onClick={handleResetAllSystem}
                className="px-3 py-1.5 rounded-xl bg-red-950/50 hover:bg-red-950 border border-red-500/40 text-red-300 font-bold transition-all active:scale-95 flex items-center gap-1.5 text-[11px] ml-auto"
              >
                <Trash2 className="w-3 h-3 text-red-400" />
                Zerar treinos do sistema
              </button>
            </div>
          </div>

          {/* Users List Header & Search */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                Gerenciar Usuários ({filteredUsers.length})
              </h3>

              <button
                onClick={fetchUsers}
                disabled={isLoading}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome ou e-mail..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Users Cards */}
          <div className="space-y-2.5">
            {filteredUsers.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                Nenhum usuário encontrado.
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className={`p-3 rounded-2xl border transition-all ${
                    user.isBlocked
                      ? 'bg-red-950/20 border-red-500/40'
                      : user.role === 'admin'
                      ? 'bg-[#10172a] border-amber-500/40'
                      : 'bg-[#0d1627] border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                        user.role === 'admin'
                          ? 'bg-amber-500 text-slate-950'
                          : user.isBlocked
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      }`}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-white truncate">{user.name}</span>
                          {user.role === 'admin' && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              Admin
                            </span>
                          )}
                          {user.isBlocked && (
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-red-500/30 text-red-300 border border-red-500/50">
                              Bloqueado
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
                      </div>
                    </div>

                    {/* Stats pill */}
                    <div className="text-right text-[10px] text-slate-400 shrink-0">
                      <div>{user.programsCount > 0 ? `${user.programsCount} programa(s)` : 'Sem treino'}</div>
                      <div className="text-cyan-400 font-semibold">{user.sessionsCount} treino(s) feito(s)</div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Bloquear / Desbloquear */}
                      {user.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleBlock(user)}
                          className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all active:scale-95 ${
                            user.isBlocked
                              ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900'
                              : 'bg-amber-950/60 border border-amber-500/40 text-amber-300 hover:bg-amber-900'
                          }`}
                        >
                          {user.isBlocked ? (
                            <>
                              <Unlock className="w-3 h-3 text-emerald-400" />
                              Desbloquear
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3 text-amber-400" />
                              Bloquear
                            </>
                          )}
                        </button>
                      )}

                      {/* Apagar Treino */}
                      <button
                        onClick={() => handleDeleteUserWorkouts(user)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 font-semibold transition-all active:scale-95 flex items-center gap-1"
                        title="Apagar ficha de treino do usuário"
                      >
                        <Dumbbell className="w-3 h-3 text-cyan-400" />
                        Apagar Treino
                      </button>

                      {/* Limpar Histórico */}
                      {user.sessionsCount > 0 && (
                        <button
                          onClick={() => handleCleanupUserHistory(user)}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 font-semibold transition-all active:scale-95 flex items-center gap-1"
                          title="Limpar histórico de sessões deste usuário"
                        >
                          <Calendar className="w-3 h-3 text-teal-400" />
                          Limpar Histórico
                        </button>
                      )}
                    </div>

                    {/* Excluir Conta (Apenas não-admin) */}
                    {user.role !== 'admin' && (
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="px-2 py-1 rounded-lg hover:bg-red-950/50 text-slate-500 hover:text-red-400 transition-colors flex items-center gap-1 ml-auto"
                        title="Excluir usuário do sistema"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Excluir</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Logado como Administrador: <strong className="text-amber-300">AppFit</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all"
          >
            Fechar Painel
          </button>
        </div>
      </div>

      {/* Confirmation Sub-Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-[#0b1220] border-2 border-amber-500/60 rounded-3xl w-full max-w-sm p-5 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">{confirmDialog.title}</h3>
                <p className="text-xs text-amber-300 font-semibold">Ação Administrativa</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {confirmDialog.description}
            </p>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs active:scale-95 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const action = confirmDialog.onConfirm;
                  setConfirmDialog(null);
                  await action();
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-white font-extrabold text-xs shadow-lg shadow-amber-600/30 active:scale-95 transition-all"
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
