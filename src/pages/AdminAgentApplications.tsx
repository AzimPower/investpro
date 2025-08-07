import { useEffect, useState } from 'react';
import { Shield, Search } from 'lucide-react';
import { notificationManager } from '@/lib/notificationManager';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AgentApplication {
  id: number;
  userId: number;
  fullName: string;
  phone: string;
  operator: string;
  agentNumber: string;
  status: string;
  adminNote?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
}

export default function AdminAgentApplications() {
  const [actionLoading, setActionLoading] = useState(false);
  // Confirmation dialog state
  const [confirmAction, setConfirmAction] = useState<{ open: boolean; action: () => void; message: string }>({ open: false, action: () => {}, message: '' });
  // Pagination states
  const [pendingPage, setPendingPage] = useState(1);
  const [processedPage, setProcessedPage] = useState(1);
  const PAGE_SIZE = 5;
  const [applications, setApplications] = useState<AgentApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/backend/agent_applications.php');
      if (!res.ok) throw new Error('Erreur chargement demandes agent');
      const data = await res.json();
      setApplications(Array.isArray(data) ? data : []);
    } catch (error) {
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  async function updateStatus(id: number, status: string) {
    setLoading(true);
    try {
      const res = await fetch(`/backend/agent_applications.php?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Erreur lors de la mise à jour du statut');
    } catch (error) {
      alert('Erreur lors de la mise à jour du statut');
    } finally {
      loadApplications();
    }
  }

  async function handleAccept(id: number) {
    setActionLoading(true);
    await updateStatus(id, 'approved');
    const app = applications.find(a => a.id === id);
    if (app) {
      await notificationManager.createNotification(
        app.userId,
        'Demande agent acceptée',
        'Votre demande pour devenir agent a été acceptée. Vous pouvez maintenant accéder à votre espace agent.',
        'success',
        'agent',
        id
      );
    }
    setActionLoading(false);
  }
  async function handleReject(id: number) {
    setActionLoading(true);
    await updateStatus(id, 'rejected');
    const app = applications.find(a => a.id === id);
    if (app) {
      await notificationManager.createNotification(
        app.userId,
        'Demande agent refusée',
        "Votre demande pour devenir agent a été refusée. Pour plus d'informations, contactez l'administration.",
        'error',
        'agent',
        id
      );
    }
    setActionLoading(false);
  }

  // Filtrage par recherche
  const filtered = applications.filter(app => {
    const q = search.toLowerCase();
    return (
      app.fullName.toLowerCase().includes(q) ||
      app.phone.toLowerCase().includes(q) ||
      app.operator.toLowerCase().includes(q) ||
      app.agentNumber.toLowerCase().includes(q) ||
      (app.adminNote?.toLowerCase().includes(q) ?? false)
    );
  });

  const pendingApps = filtered.filter(app => app.status === 'pending');
  const processedApps = filtered.filter(app => app.status !== 'pending');

  // Pagination logic
  const pendingTotalPages = Math.ceil(pendingApps.length / PAGE_SIZE) || 1;
  const processedTotalPages = Math.ceil(processedApps.length / PAGE_SIZE) || 1;
  const paginatedPending = pendingApps.slice((pendingPage - 1) * PAGE_SIZE, pendingPage * PAGE_SIZE);
  const paginatedProcessed = processedApps.slice((processedPage - 1) * PAGE_SIZE, processedPage * PAGE_SIZE);

  return (
    <>
      <Navigation userRole="admin" />
      <div className="p-2 sm:p-6 space-y-3 sm:space-y-6 min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#e0e7ef] to-[#f1f5f9] mb-16 sm:mb-24">
        {/* Header modernisé */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4 bg-white/80 rounded-lg shadow-md p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text">
              Demandes pour devenir agent ({filtered.length})
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Recherche globale..."
              className="w-full sm:w-80 px-3 py-2 border border-indigo-200 rounded shadow focus:outline-none focus:ring focus:border-indigo-400"
            />
          </div>
        </div>

        {/* Tableaux modernisés */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Tableau en attente */}
          <div className="bg-white/90 rounded-lg shadow-md border-0 p-4">
            <h2 className="text-lg font-semibold text-indigo-700 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-yellow-500" /> En attente ({pendingApps.length})
            </h2>
            {pendingApps.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground">Aucune demande en attente</div>
            ) : (
              <>
                <div className="space-y-2">
                  {paginatedPending.map(app => (
                    <Card key={app.id} className="border border-yellow-200 shadow-card bg-yellow-50">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                          <div>
                            <div className="font-semibold text-base text-indigo-700">{app.fullName}</div>
                            <div className="text-xs text-slate-600">Téléphone : <span className="font-mono">+226 {app.phone}</span></div>
                            <div className="text-xs text-slate-600">Opérateur : {app.operator}</div>
                            <div className="text-xs text-slate-600">Numéro agent : <span className="font-mono">+226 {app.agentNumber}</span></div>
                            <div className="text-xs text-slate-500">Demande le {new Date(app.createdAt).toLocaleString('fr-FR')}</div>
                            <div className="text-xs mt-1">
                              Statut : <span className="text-yellow-600 font-bold">{app.status}</span>
                            </div>
                            {app.adminNote && (
                              <div className="text-xs text-indigo-500 mt-1">Note admin : {app.adminNote}</div>
                            )}
                          </div>
                          <div className="flex gap-2 mt-2 sm:mt-0">
                            <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setConfirmAction({ open: true, action: () => handleAccept(app.id), message: 'Confirmer l\'acceptation de la demande ?' })}>
                              Accepter
                            </Button>
                            <Button size="sm" variant="destructive" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => setConfirmAction({ open: true, action: () => handleReject(app.id), message: 'Confirmer le refus de la demande ?' })}>
                              Refuser
                            </Button>
      {/* Confirmation dialog */}
      {confirmAction.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-lg p-6 min-w-[300px] max-w-xs flex flex-col items-center">
            <div className="mb-4 text-center text-lg font-semibold text-indigo-700">{confirmAction.message}</div>
            {actionLoading ? (
              <div className="text-center text-sm text-indigo-600 mb-2">Traitement en cours...</div>
            ) : (
              <div className="flex gap-3">
                <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => { confirmAction.action(); setConfirmAction({ ...confirmAction, open: false }); }}>
                  Confirmer
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConfirmAction({ ...confirmAction, open: false })}>
                  Annuler
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="flex justify-center mt-4 gap-2">
                  <Button size="sm" variant="outline" disabled={pendingPage === 1} onClick={() => setPendingPage(pendingPage - 1)}>
                    Précédent
                  </Button>
                  <span className="px-3 py-1 rounded bg-indigo-50 text-indigo-700 font-semibold text-sm">Page {pendingPage} / {pendingTotalPages}</span>
                  <Button size="sm" variant="outline" disabled={pendingPage === pendingTotalPages} onClick={() => setPendingPage(pendingPage + 1)}>
                    Suivant
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Tableau déjà traitées */}
          <div className="bg-white/90 rounded-lg shadow-md border-0 p-4">
            <h2 className="text-lg font-semibold text-indigo-700 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-500" /> Déjà traitées ({processedApps.length})
            </h2>
            {processedApps.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground">Aucune demande traitée</div>
            ) : (
              <>
                <div className="space-y-2">
                  {paginatedProcessed.map(app => (
                    <Card key={app.id} className={
                      app.status === 'accepted'
                        ? "border border-green-200 shadow-card bg-green-50"
                        : "border border-red-200 shadow-card bg-red-50"
                    }>
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                          <div>
                            <div className="font-semibold text-base text-indigo-700">{app.fullName}</div>
                            <div className="text-xs text-slate-600">Téléphone : <span className="font-mono">+226 {app.phone}</span></div>
                            <div className="text-xs text-slate-600">Opérateur : {app.operator}</div>
                            <div className="text-xs text-slate-600">Numéro agent : <span className="font-mono">+226 {app.agentNumber}</span></div>
                            <div className="text-xs text-slate-500">Demande le {new Date(app.createdAt).toLocaleString('fr-FR')}</div>
                            <div className="text-xs mt-1">
                              Statut : <span className={
                                app.status === 'accepted' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'
                              }>{app.status}</span>
                            </div>
                            {app.adminNote && (
                              <div className="text-xs text-indigo-500 mt-1">Note admin : {app.adminNote}</div>
                            )}
                            {app.reviewedAt && (
                              <div className="text-xs text-slate-400 mt-1">Revu le {new Date(app.reviewedAt).toLocaleString('fr-FR')} par {app.reviewedBy || 'admin'}</div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="flex justify-center mt-4 gap-2">
                  <Button size="sm" variant="outline" disabled={processedPage === 1} onClick={() => setProcessedPage(processedPage - 1)}>
                    Précédent
                  </Button>
                  <span className="px-3 py-1 rounded bg-indigo-50 text-indigo-700 font-semibold text-sm">Page {processedPage} / {processedTotalPages}</span>
                  <Button size="sm" variant="outline" disabled={processedPage === processedTotalPages} onClick={() => setProcessedPage(processedPage + 1)}>
                    Suivant
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        {loading && (
          <div className="text-center text-sm text-muted-foreground mt-8">Chargement...</div>
        )}
      </div>
    </>
  );
}
