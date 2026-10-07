import React, { useEffect, useState } from 'react';
import { useParams, Link } from '@tanstack/react-router';
import { Card, Button, Badge } from '../../shared/ui/primitives';

export function RateDeckDetails() {
  const { id } = useParams({ strict: false });
  const [deck, setDeck] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const headers = { Authorization: `Bearer ${localStorage.getItem('rd_auth_token')}` };
        
        const [deckRes, versionsRes] = await Promise.all([
          fetch(`/api/v1/rates/decks/${id}`, { headers }),
          fetch(`/api/v1/rates/decks/${id}/versions`, { headers })
        ]);

        if (deckRes.ok) setDeck(await deckRes.json());
        if (versionsRes.ok) setVersions(await versionsRes.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  if (loading) return <div style={{ padding: '48px', textAlign: 'center' }}>Loading deck details...</div>;
  if (!deck) return <div style={{ padding: '48px', textAlign: 'center' }}>Deck not found.</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '8px' }}>
            <Link to="/rate-decks" style={{ color: 'var(--rd-color-text-muted)', textDecoration: 'none' }}>&larr; Back</Link>
            <Badge tone="brand">{deck.kind}</Badge>
          </div>
          <h1 style={{ fontSize: 'var(--rd-text-3xl)', marginBottom: '4px' }}>{deck.name}</h1>
          <p style={{ color: 'var(--rd-color-text-muted)' }}>Currency: {deck.currency} | ID: {deck.publicId}</p>
        </div>
      </header>

      <Card title="Versions">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {versions.map((v) => (
            <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid var(--rd-color-border-subtle)' }}>
              <div>
                <h3 style={{ fontSize: 'var(--rd-text-lg)', marginBottom: '4px' }}>
                  Version {v.version}
                  <span style={{ marginLeft: '8px' }}><Badge tone={v.status === 'published' ? 'success' : 'warning'}>{v.status}</Badge></span>
                </h3>
                <span style={{ color: 'var(--rd-color-text-subtle)', fontSize: 'var(--rd-text-sm)' }}>
                  Effective: {v.effective}
                </span>
              </div>
              <div>
                {v.status === 'draft' ? (
                  <Link to={`/rate-decks/${deck.publicId}/versions/${v.id}` as any}>
                    <Button variant="primary">Review & Publish</Button>
                  </Link>
                ) : (
                  <Link to={`/rate-decks/${deck.publicId}/versions/${v.id}` as any}>
                    <Button variant="default">View Rates</Button>
                  </Link>
                )}
              </div>
            </div>
          ))}
          {versions.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--rd-color-text-muted)' }}>
              No versions exist for this deck.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
