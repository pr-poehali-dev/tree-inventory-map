import { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import { User } from '@/hooks/useAuth';
import { API, STORAGE_KEYS } from '@/config/api';

const AUTH_URL = API.AUTH;
const TOKEN_KEY = STORAGE_KEYS.AUTH_TOKEN;

const ROLES: { value: string; label: string; color: string }[] = [
  { value: 'user', label: 'Только просмотр', color: 'bg-gray-100 text-gray-600' },
  { value: 'editor', label: 'Редактор', color: 'bg-blue-100 text-blue-700' },
  { value: 'admin', label: 'Администратор', color: 'bg-[var(--forest-pale)] text-[var(--forest-dark)]' },
];

interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

interface AdminViewProps {
  currentUser: User;
}

export default function AdminView({ currentUser }: AdminViewProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState<number | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem(TOKEN_KEY) || '';
    const res = await fetch(AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list_users', token }),
    });
    const data = await res.json();
    if (data.error) setError(data.error);
    else setUsers(data.users || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const setRole = async (userId: number, role: string) => {
    setSaving(userId);
    const token = localStorage.getItem(TOKEN_KEY) || '';
    const res = await fetch(AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_role', token, user_id: userId, role }),
    });
    const data = await res.json();
    if (data.ok) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    }
    setSaving(null);
  };

  const getRoleInfo = (role: string) => ROLES.find(r => r.value === role) || ROLES[0];

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="forest-bg rounded-xl p-5 text-white">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/15 rounded-lg flex items-center justify-center">
            <Icon name="Users" size={18} />
          </div>
          <div>
            <div className="text-lg font-bold font-heading">Управление пользователями</div>
            <div className="text-white/60 text-xs">Назначение прав доступа</div>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 text-xs text-amber-800">
        <Icon name="Info" size={14} className="shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Роли:</span>{' '}
          <span className="font-medium">Только просмотр</span> — читает карту без изменений.{' '}
          <span className="font-medium">Редактор</span> — может добавлять и редактировать деревья.{' '}
          <span className="font-medium">Администратор</span> — полный доступ, управление пользователями.
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 text-[var(--stone)]">
          <Icon name="Loader2" size={20} className="animate-spin mr-2" />
          Загрузка...
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm flex gap-2">
          <Icon name="AlertCircle" size={16} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="bg-white rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
            <div className="text-sm font-semibold text-[var(--forest-dark)] font-heading">
              Пользователи ({users.length})
            </div>
            <button onClick={loadUsers} className="text-[var(--stone)] hover:text-[var(--forest-dark)] transition-colors">
              <Icon name="RefreshCw" size={15} />
            </button>
          </div>

          <div className="divide-y divide-[var(--border)]">
            {users.map(user => {
              const roleInfo = getRoleInfo(user.role);
              const isMe = user.id === currentUser.id;
              return (
                <div key={user.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[var(--forest-pale)] flex items-center justify-center shrink-0">
                    <span className="text-[var(--forest-dark)] font-bold text-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-[var(--forest-dark)] truncate">{user.name}</div>
                      {isMe && <span className="text-[10px] bg-[var(--forest-pale)] text-[var(--forest-mid)] px-1.5 py-0.5 rounded font-medium">это вы</span>}
                    </div>
                    <div className="text-xs text-[var(--stone)] truncate">{user.email}</div>
                  </div>

                  {isMe ? (
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${roleInfo.color}`}>
                      {roleInfo.label}
                    </span>
                  ) : (
                    <div className="relative">
                      {saving === user.id ? (
                        <div className="flex items-center gap-1.5 text-xs text-[var(--stone)] px-2">
                          <Icon name="Loader2" size={13} className="animate-spin" />
                          Сохраняю...
                        </div>
                      ) : (
                        <select
                          value={user.role}
                          onChange={e => setRole(user.id, e.target.value)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border)] font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--forest-mid)] ${roleInfo.color}`}
                        >
                          {ROLES.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}