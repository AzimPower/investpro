// Utilitaire de logging optimisé pour la production
import { useRef, useEffect } from 'react';

const isDevelopment = import.meta.env.DEV;

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  
  error: (...args: any[]) => {
    // Les erreurs sont toujours affichées
    console.error(...args);
  },
  
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  }
};

// Hook pour déboguer les re-renders en développement
export const useWhyDidYouUpdate = (name: string, props: Record<string, any>) => {
  if (!isDevelopment) return;
  
  const previous = useRef<Record<string, any>>();
  useEffect(() => {
    if (previous.current) {
      const allKeys = Object.keys({...previous.current, ...props});
      const changedProps: Record<string, any> = {};
      
      allKeys.forEach(key => {
        if (previous.current![key] !== props[key]) {
          changedProps[key] = {
            from: previous.current![key],
            to: props[key]
          };
        }
      });
      
      if (Object.keys(changedProps).length) {
        console.log('[why-did-you-update]', name, changedProps);
      }
    }
    previous.current = props;
  });
};
