import React, { useState } from 'react';
import { Card, Button, Input, KpiCard } from '../../shared/ui/primitives';

export function RateQuote() {
  const [destination, setDestination] = useState('');
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleQuote(e: React.FormEvent) {
    e.preventDefault();
    if (!destination) return;
    setLoading(true);
    setError(null);
    setQuote(null);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('rd_auth_token')}` };
      const res = await fetch(`/api/v1/rates/quote/${encodeURIComponent(destination)}`, { headers });
      if (res.ok) {
        setQuote(await res.json());
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.message || 'No active rate found for this destination.');
      }
    } catch (e) {
      console.error(e);
      setError('A network error occurred while fetching the quote.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header>
        <h1 style={{ fontSize: 'var(--rd-text-3xl)', marginBottom: '4px' }}>Rate Simulator</h1>
        <p style={{ color: 'var(--rd-color-text-muted)' }}>Test routing and pricing for any destination instantly.</p>
      </header>

      <Card>
        <form onSubmit={handleQuote} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', padding: '16px' }}>
          <div style={{ flex: 1 }}>
            <Input 
              label="Destination Number or Prefix" 
              placeholder="e.g. 447812345678" 
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              aria-invalid={!!error}
            />
          </div>
          <Button variant="primary" type="submit" loading={loading} style={{ height: '48px', marginBottom: '4px' }}>
            Get Quote
          </Button>
        </form>
        {error && (
          <div style={{ padding: '0 16px 16px', color: 'var(--rd-color-danger)', fontSize: 'var(--rd-text-sm)', fontWeight: 500 }}>
            {error}
          </div>
        )}
      </Card>

      {quote && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <h2 style={{ fontSize: 'var(--rd-text-xl)', borderBottom: '1px solid var(--rd-color-border-subtle)', paddingBottom: '8px' }}>
            Results for {quote.destination}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
            <KpiCard label="Rate per minute" value={`$${quote.ratePerMin}`} icon="calculator" />
            <KpiCard label="Matched Prefix" value={quote.prefix} icon="hash" delay={50} />
            <KpiCard label="Billing Increment" value={`${quote.incrementFirst}/${quote.incrementNext}`} icon="settings" delay={100} />
            <KpiCard label="Connection Fee" value={`$${quote.connectionFee}`} icon="card" delay={150} />
          </div>
        </div>
      )}
    </div>
  );
}
