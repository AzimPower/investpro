import { useState } from 'react';
import { FaUserFriends, FaUserCheck, FaTimesCircle } from 'react-icons/fa';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { notificationManager } from '@/lib/notificationManager';
import { apiGetUsers } from '@/lib/api';

interface SendNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendNotificationDialog({ open, onOpenChange }: SendNotificationDialogProps) {
  const [userId, setUserId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [category, setCategory] = useState<'transaction' | 'earning' | 'system' | 'agent' | 'general'>('general');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  // Charger tous les utilisateurs une seule fois
  const loadUsers = async () => {
    if (users.length > 0) return;
    const allUsers = await apiGetUsers();
    setUsers(allUsers || []);
  };

  // Filtrer les utilisateurs par nom ou ID
  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    await loadUsers();
    const term = e.target.value.toLowerCase();
    setFilteredUsers(
      users.filter(
        (u) =>
          u.fullName?.toLowerCase().includes(term) ||
          u.id.toString().includes(term) ||
          u.phone?.toLowerCase().includes(term)
      )
    );
  };

  // Envoyer la notification
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult('');
    try {
      if (userId === 'all') {
        // Notification globale (userId: 0)
        const ok = await notificationManager.createNotification(
          0,
          title,
          message,
          type,
          category,
          undefined
        );
        setResult(ok ? 'Notification globale envoyée à tous les utilisateurs.' : 'Erreur lors de l\'envoi.');
      } else {
        // Notif à un user précis
        const ok = await notificationManager.createNotification(
          Number(userId),
          title,
          message,
          type,
          category
        );
        setResult(ok ? 'Notification envoyée avec succès.' : 'Erreur lors de l\'envoi.');
      }
    } catch (err) {
      setResult('Erreur lors de l\'envoi.');
    } finally {
      setLoading(false);
    }
  };

  // Reset on close
  const handleClose = () => {
    setUserId('');
    setSearchTerm('');
    setFilteredUsers([]);
    setTitle('');
    setMessage('');
    setType('info');
    setCategory('general');
    setLoading(false);
    setResult('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-lg sm:max-w-lg p-0 rounded-3xl shadow-2xl border-0 bg-gradient-to-br from-white via-blue-50 to-blue-100 overflow-y-auto max-h-[95vh]">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center justify-center gap-3 sm:gap-4 text-blue-700 px-2 pt-4">
            <FaUserFriends className="inline-block text-blue-400 text-2xl sm:text-3xl" />
            <span className="truncate">Envoyer une notification</span>
          </DialogTitle>
        </DialogHeader>
        <CardContent className="px-2 sm:px-6 pb-4 pt-2 w-full">
          <form onSubmit={handleSend} className="space-y-4 sm:space-y-6">
            <div>
              <label className="block text-base font-semibold mb-2 text-blue-700">Destinataire</label>
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full">
                <Button
                  type="button"
                  variant={userId === 'all' ? 'default' : 'outline'}
                  className={`transition-all duration-150 rounded-full px-4 py-2 shadow-sm border-2 w-full sm:w-auto ${userId === 'all' ? 'ring-2 ring-blue-400 bg-blue-600 text-white' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'}`}
                  onClick={() => setUserId(userId === 'all' ? '' : 'all')}
                >
                  {userId === 'all' ? <FaUserCheck className="inline-block mr-1" /> : <FaUserFriends className="inline-block mr-1" />}Tous
                </Button>
                <Input
                  placeholder="Rechercher un utilisateur (nom, id, téléphone)"
                  value={searchTerm}
                  onChange={handleSearch}
                  className="w-full sm:w-64 rounded-full border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 text-blue-900 bg-white/80"
                  disabled={userId === 'all'}
                  style={{ background: userId === 'all' ? '#e5e7fa' : undefined }}
                />
                {(userId !== undefined && userId !== '') && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="sm:ml-2 text-xs px-2 py-1 border border-gray-200 hover:bg-blue-50 text-blue-500 rounded-full flex items-center gap-1 w-full sm:w-auto justify-center"
                    onClick={() => { setUserId(''); setSearchTerm(''); setFilteredUsers([]); }}
                  >
                    <FaTimesCircle className="inline-block" />
                    <span className="hidden sm:inline">Effacer</span>
                  </Button>
                )}
              </div>
              {/* Liste des utilisateurs filtrés */}
              {userId !== 'all' && searchTerm && filteredUsers.length > 0 && (
                <div className="border rounded-2xl mt-2 max-h-52 overflow-y-auto bg-white shadow-lg z-10 divide-y divide-blue-50">
                  {filteredUsers.map((u) => (
                    <div
                      key={u.id}
                      className={`flex items-center px-4 py-2 cursor-pointer transition-colors rounded-xl ${userId == u.id ? 'bg-blue-100 border-l-4 border-blue-400' : 'hover:bg-blue-50'}`}
                      onClick={() => setUserId(u.id.toString())}
                    >
                      <span className="font-medium text-blue-900">{u.fullName}</span>
                      <span className="ml-2 text-xs text-blue-500">#{u.id}</span>
                      <span className="ml-2 text-xs text-blue-400">{u.phone}</span>
                      {userId == u.id && <FaUserCheck className="ml-auto text-blue-500" />}
                    </div>
                  ))}
                </div>
              )}
              {/* Affichage de l'utilisateur sélectionné */}
              {userId && userId !== 'all' && (
                <div className="mt-2 text-xs text-blue-700 flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-1 w-fit shadow-sm">
                  <FaUserCheck className="text-blue-400" />
                  Utilisateur sélectionné: <span className="font-semibold text-blue-900">{userId}</span>
                </div>
              )}
              {/* Affichage de la sélection globale */}
              {userId === 'all' && (
                <div className="mt-2 text-xs text-blue-700 flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-1 w-fit shadow-sm">
                  <FaUserFriends className="text-blue-400" />
                  <span className="font-semibold">Tous les utilisateurs sont sélectionnés.</span>
                </div>
              )}
            </div>
            <div>
              <label className="block text-base font-semibold mb-2 text-blue-700">Titre</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} required maxLength={100} className="rounded-xl border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 text-blue-900 bg-white/80 w-full" />
            </div>
            <div>
              <label className="block text-base font-semibold mb-2 text-blue-700">Message</label>
              <Textarea value={message} onChange={e => setMessage(e.target.value)} required maxLength={500} className="rounded-xl border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 text-blue-900 bg-white/80 min-h-[100px] w-full" />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full">
              <div className="w-full sm:w-1/2">
                <label className="block text-xs font-semibold mb-1 text-blue-700">Type</label>
                <select value={type} onChange={e => setType(e.target.value as any)} className="border rounded-xl px-3 py-2 text-blue-900 bg-white/80 border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 w-full">
                  <option value="info">Info</option>
                  <option value="success">Succès</option>
                  <option value="warning">Alerte</option>
                  <option value="error">Erreur</option>
                </select>
              </div>
              <div className="w-full sm:w-1/2">
                <label className="block text-xs font-semibold mb-1 text-blue-700">Catégorie</label>
                <select value={category} onChange={e => setCategory(e.target.value as any)} className="border rounded-xl px-3 py-2 text-blue-900 bg-white/80 border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 w-full">
                  <option value="general">Général</option>
                  <option value="transaction">Transaction</option>
                  <option value="earning">Gain</option>
                  <option value="system">Système</option>
                  <option value="agent">Agent</option>
                </select>
              </div>
            </div>
            <Button type="submit" disabled={loading || !title || !message || !userId} className="w-full rounded-2xl py-3 text-lg font-bold bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg hover:from-blue-600 hover:to-blue-800 transition-all">
              {loading ? 'Envoi...' : 'Envoyer'}
            </Button>
            {result && <div className="mt-4 text-base text-center text-blue-700 font-semibold bg-blue-50 rounded-xl py-2 shadow-sm">{result}</div>}
          </form>
        </CardContent>
      </DialogContent>
    </Dialog>
  );
}
