import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const PWAInstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Vérifier si l'app est déjà installée
    const checkIfInstalled = () => {
      if (window.navigator && 'standalone' in window.navigator) {
        // iOS Safari
        setIsInstalled((window.navigator as any).standalone);
      } else if (window.matchMedia('(display-mode: standalone)').matches) {
        // Android/Desktop
        setIsInstalled(true);
      }
    };

    checkIfInstalled();

    // Écouter l'événement beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setIsInstallable(true);
    };

    // Écouter l'installation de l'app
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      
      setDeferredPrompt(null);
      setIsInstallable(false);
    } catch (error) {
      console.error('Error during installation:', error);
    }
  };

  // Instructions pour iOS Safari
  const getIOSInstructions = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    return isIOS && isSafari;
  };

  if (isInstalled) {
    return null; // Ne pas afficher le bouton si l'app est déjà installée
  }

  if (getIOSInstructions()) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-start space-x-3">
          <Smartphone className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-blue-900 mb-1">
              Installer InvestPro sur votre iPhone
            </h3>
            <p className="text-xs text-blue-700 mb-2">
              Pour une meilleure expérience, ajoutez InvestPro à votre écran d'accueil :
            </p>
            <ol className="text-xs text-blue-700 space-y-1">
              <li>1. Appuyez sur l'icône de partage 📤 en bas de l'écran</li>
              <li>2. Sélectionnez "Sur l'écran d'accueil"</li>
              <li>3. Confirmez en appuyant sur "Ajouter"</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  if (isInstallable && deferredPrompt) {
    return (
      <Button
        onClick={handleInstallClick}
        className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold px-6 py-3 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200 border border-green-500/20 mb-4 w-full sm:w-auto"
      >
        <Download className="h-4 w-4 mr-2" />
        Installer InvestPro
      </Button>
    );
  }

  return null;
};
