import React from 'react';

export default function OfflinePage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f8fafc',
      color: '#1e293b',
      textAlign: 'center',
      padding: '2rem',
      pointerEvents: 'all',
      userSelect: 'none',
      width: '100vw',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 99999
    }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Vous êtes hors connexion</h1>
      <p style={{ fontSize: '1.2rem' }}>
        Veuillez vérifier votre connexion Internet.<br />
        Cette page s'affichera tant que la connexion est absente.
      </p>
    </div>
  );
}
