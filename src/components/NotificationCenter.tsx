import React, { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Settings, X, Clock, AlertCircle, CheckCircle, Info, AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useNotifications } from '@/contexts/NotificationContext';
import { useBackendNotifications, useMarkAsRead, useDeleteNotification, useMarkAllAsRead, useDeleteAllNotifications } from '@/hooks/useBackendNotifications';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface NotificationCenterProps {
  className?: string;
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [deletingNotifications, setDeletingNotifications] = useState<Set<number>>(new Set());
  const [markingAsRead, setMarkingAsRead] = useState<Set<number>>(new Set());
  
  // Récupérer l'utilisateur actuel depuis localStorage
  useEffect(() => {
    const currentUserData = localStorage.getItem('currentUser');
    if (currentUserData) {
      try {
        const userData = JSON.parse(currentUserData);
        setCurrentUserId(userData.id);
      } catch (error) {
        console.error('Erreur lors du parsing des données utilisateur:', error);
      }
    }
  }, []);

  // Hooks pour les notifications backend
  const { data: backendNotifications = [], isLoading, error, forceRefresh } = useBackendNotifications(currentUserId);
  const markAsReadMutation = useMarkAsRead();
  const deleteNotificationMutation = useDeleteNotification();
  const markAllAsReadMutation = useMarkAllAsRead();
  const deleteAllNotificationsMutation = useDeleteAllNotifications();

  // Hooks pour les notifications locales (pour les toasts)
  const {
    settings,
    updateSettings,
  } = useNotifications();

  // Calculer le nombre de notifications non lues
  const unreadCount = backendNotifications.filter((n: any) => !n.isRead).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'transaction':
        return 'bg-blue-100 text-blue-800';
      case 'earning':
        return 'bg-green-100 text-green-800';
      case 'system':
        return 'bg-purple-100 text-purple-800';
      case 'agent':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        updateSettings({ pushNotifications: true });
      } else {
        updateSettings({ pushNotifications: false });
      }
    }
  };

  const handleDeleteNotification = async (notificationId: number) => {
    setDeletingNotifications(prev => new Set(prev).add(notificationId));
    try {
      await deleteNotificationMutation.mutateAsync(notificationId);
      // Actualiser les données après suppression
      await forceRefresh();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    } finally {
      setDeletingNotifications(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  const handleMarkAsRead = async (notificationId: number) => {
    setMarkingAsRead(prev => new Set(prev).add(notificationId));
    try {
      await markAsReadMutation.mutateAsync(notificationId);
      // Actualiser les données après marquage
      await forceRefresh();
    } catch (error) {
      console.error('Erreur lors du marquage comme lu:', error);
    } finally {
      setMarkingAsRead(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUserId) return;
    
    console.log('Début du marquage de toutes les notifications comme lues pour userId:', currentUserId);
    
    try {
      await markAllAsReadMutation.mutateAsync(currentUserId);
      console.log('Marquage de toutes les notifications réussi');
      // Actualiser les données après marquage de toutes
      await forceRefresh();
      console.log('Actualisation des données terminée');
    } catch (error) {
      console.error('Erreur lors du marquage de toutes les notifications:', error);
    }
  };

  const handleDeleteAllNotifications = async () => {
    if (!currentUserId) return;
    
    console.log('Début de la suppression de toutes les notifications pour userId:', currentUserId);
    
    try {
      await deleteAllNotificationsMutation.mutateAsync(currentUserId);
      console.log('Suppression de toutes les notifications réussie');
      // Actualiser les données après suppression de toutes
      await forceRefresh();
      console.log('Actualisation des données terminée');
    } catch (error) {
      console.error('Erreur lors de la suppression de toutes les notifications:', error);
    }
  };

  return (
    <div className={className}>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-0" align="end">
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notifications
                  {unreadCount > 0 && (
                    <Badge variant="secondary">{unreadCount}</Badge>
                  )}
                </CardTitle>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleMarkAllAsRead}
                      className="text-xs"
                      disabled={markAllAsReadMutation.isPending}
                    >
                      <CheckCheck className="h-4 w-4 mr-1" />
                      {markAllAsReadMutation.isPending ? 'Marquage...' : 'Tout lire'}
                    </Button>
                  )}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="end">
                      <div className="space-y-4">
                        <h4 className="font-medium leading-none">Paramètres de notification</h4>
                        <Separator />
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="push-notifications" className="text-sm">
                              Notifications push
                            </Label>
                            <Switch
                              id="push-notifications"
                              checked={settings.pushNotifications}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  requestNotificationPermission();
                                } else {
                                  updateSettings({ pushNotifications: false });
                                }
                              }}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <Label htmlFor="transaction-notifications" className="text-sm">
                              Notifications de transaction
                            </Label>
                            <Switch
                              id="transaction-notifications"
                              checked={settings.transactionNotifications}
                              onCheckedChange={(checked) => 
                                updateSettings({ transactionNotifications: checked })
                              }
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <Label htmlFor="earning-notifications" className="text-sm">
                              Notifications de gains
                            </Label>
                            <Switch
                              id="earning-notifications"
                              checked={settings.earningNotifications}
                              onCheckedChange={(checked) => 
                                updateSettings({ earningNotifications: checked })
                              }
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <Label htmlFor="system-notifications" className="text-sm">
                              Notifications système
                            </Label>
                            <Switch
                              id="system-notifications"
                              checked={settings.systemNotifications}
                              onCheckedChange={(checked) => 
                                updateSettings({ systemNotifications: checked })
                              }
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <Label htmlFor="agent-notifications" className="text-sm">
                              Notifications agent
                            </Label>
                            <Switch
                              id="agent-notifications"
                              checked={settings.agentNotifications}
                              onCheckedChange={(checked) => 
                                updateSettings({ agentNotifications: checked })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              {error && (
                <div className="p-4 border-b bg-red-50 text-red-700 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Erreur de synchronisation. Les données seront mises à jour automatiquement.
                </div>
              )}
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p>Chargement...</p>
                </div>
              ) : backendNotifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune notification</p>
                </div>
              ) : (
                <>
                  <ScrollArea className="h-96">
                    <div className="space-y-1 p-4">
                      {backendNotifications.map((notification: any) => (
                        <div
                          key={notification.id}
                          className={`group p-3 rounded-lg border transition-colors hover:bg-muted/50 cursor-pointer ${
                            !notification.isRead ? 'bg-muted/30 border-primary/20' : 'border-border'
                          } ${markingAsRead.has(notification.id) ? 'opacity-60' : ''}`}
                          onClick={() => !notification.isRead && !markingAsRead.has(notification.id) && handleMarkAsRead(notification.id)}
                          title={!notification.isRead ? "Cliquer pour marquer comme lu" : ""}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                              {getNotificationIcon(notification.type)}
                            </div>
                            
                            <div className="flex-1 space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className={`text-sm font-medium ${!notification.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                                  {notification.title}
                                </h4>
                                <div className="flex items-center gap-1">
                                  {notification.category && (
                                    <Badge variant="secondary" className={`text-xs ${getCategoryColor(notification.category)}`}>
                                      {notification.category}
                                    </Badge>
                                  )}
                                  
                                  {/* Bouton Marquer comme lu */}
                                  {!notification.isRead && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => handleMarkAsRead(notification.id)}
                                      disabled={markingAsRead.has(notification.id) || markAsReadMutation.isPending}
                                      title="Marquer comme lu"
                                    >
                                      {markingAsRead.has(notification.id) ? (
                                        <div className="h-3 w-3 animate-spin rounded-full border-b border-current" />
                                      ) : (
                                        <Check className="h-3 w-3 text-green-600" />
                                      )}
                                    </Button>
                                  )}
                                  
                                  {/* Bouton Supprimer avec confirmation */}
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                        disabled={deletingNotifications.has(notification.id)}
                                        title="Supprimer la notification"
                                      >
                                        {deletingNotifications.has(notification.id) ? (
                                          <div className="h-3 w-3 animate-spin rounded-full border-b border-current" />
                                        ) : (
                                          <Trash2 className="h-3 w-3 text-red-500" />
                                        )}
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Supprimer la notification</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Êtes-vous sûr de vouloir supprimer cette notification ? Cette action est irréversible.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDeleteNotification(notification.id)}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          Supprimer
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                              
                              <p className="text-sm text-muted-foreground">
                                {notification.message}
                              </p>
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {formatDistanceToNow(new Date(notification.createdAt), { 
                                    addSuffix: true, 
                                    locale: fr 
                                  })}
                                  {notification.isRead && notification.readAt && (
                                    <span className="text-green-600 flex items-center gap-1">
                                      <CheckCircle className="h-3 w-3" />
                                      Lu
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-1">
                                  {!notification.isRead && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 text-xs text-blue-600 hover:text-blue-700"
                                      onClick={() => handleMarkAsRead(notification.id)}
                                      disabled={markingAsRead.has(notification.id) || markAsReadMutation.isPending}
                                    >
                                      {markingAsRead.has(notification.id) ? (
                                        <div className="h-3 w-3 animate-spin rounded-full border-b border-current mr-1" />
                                      ) : (
                                        <Check className="h-3 w-3 mr-1" />
                                      )}
                                      {markingAsRead.has(notification.id) ? 'Marquage...' : 'Marquer comme lu'}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  
                  {backendNotifications.length > 0 && (
                    <div className="border-t p-3 space-y-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleMarkAllAsRead}
                        className="w-full text-muted-foreground hover:text-foreground"
                        disabled={markAllAsReadMutation.isPending || unreadCount === 0}
                      >
                        <CheckCheck className="h-4 w-4 mr-2" />
                        {markAllAsReadMutation.isPending ? 'Marquage...' : 'Marquer tout comme lu'}
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer toutes les notifications
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer toutes les notifications</AlertDialogTitle>
                            <AlertDialogDescription>
                              Êtes-vous sûr de vouloir supprimer toutes vos notifications ? Cette action est irréversible.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDeleteAllNotifications}
                              className="bg-red-600 hover:bg-red-700"
                              disabled={deleteAllNotificationsMutation.isPending}
                            >
                              {deleteAllNotificationsMutation.isPending ? 'Suppression...' : 'Tout supprimer'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>
    </div>
  );
}
