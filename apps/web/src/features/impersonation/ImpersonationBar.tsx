import React, { useState } from 'react';
import { useAuth } from '../../shells/AuthContext';
import { Button } from '../../shared/ui/primitives';
import { useNavigate } from '@tanstack/react-router';

export function ImpersonationBar() {
  const { user, token, login, logout } = useAuth();
  const [targetId, setTargetId] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // If the user isn't impersonating, show a minimal form to impersonate.
  // We can detect if they are impersonating if their token contains claims,
  // but for simplicity, we just allow anyone to try to impersonate downward.

  async function handleImpersonate(e: React.FormEvent) {
    e.preventDefault();
    if (!targetId || !token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/impersonation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetAccountId: Number(targetId) }),
      });
      
      if (res.ok) {
        const data = await res.json();
        login(data);
        navigate({ to: '/' });
      } else {
        alert('Impersonation failed: Target may not exist or is not a sub-tenant.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handleExit() {
    // A simple exit mechanism: logout and force re-login.
    logout();
    navigate({ to: '/login' });
  }

  return (
    <div style={{ 
      background: 'var(--rd-color-surface-hover)', 
      borderBottom: '1px solid var(--rd-color-border)', 
      padding: '8px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: 'var(--rd-text-sm)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <strong>Current Context:</strong> 
        <span style={{ fontFamily: 'var(--rd-font-mono)' }}>{user?.accountPath || 'Unknown'}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <form onSubmit={handleImpersonate} style={{ display: 'flex', gap: '8px' }}>
          <input 
            type="number" 
            placeholder="Account ID"
            value={targetId}
            onChange={e => setTargetId(e.target.value)}
            style={{ 
              padding: '4px 8px', 
              borderRadius: '4px', 
              border: '1px solid var(--rd-color-border)',
              background: 'var(--rd-color-surface)',
              color: 'var(--rd-color-text)'
            }}
          />
          <Button variant="default" loading={loading} type="submit">
            Impersonate
          </Button>
        </form>
        <Button variant="ghost" onClick={handleExit}>
          Exit Session
        </Button>
      </div>
    </div>
  );
}
