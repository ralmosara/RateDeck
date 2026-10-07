import React, { useEffect, useState } from 'react';
import { Card, KpiCard } from '../../shared/ui/primitives';
import { useAuth } from '../../shells/AuthContext';

export function Dashboard() {
  const { token } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, [token]);

  async function loadMetrics() {
    if (!token) return;
    try {
      // Load current month metrics
      const start = new Date();
      start.setDate(1);
      const end = new Date();
      
      const res = await fetch(`/api/v1/reports/usage?startDate=${start.toISOString()}&endDate=${end.toISOString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const margin = metrics ? Number(metrics.total_sell) - Number(metrics.total_cost) : 0;
  const asr = metrics && metrics.total_calls > 0 
    ? ((Number(metrics.total_billed_sec) > 0 ? 1 : 0) / Number(metrics.total_calls)) * 100 // Rough ASR proxy
    : 0;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header>
        <h1 style={{ fontSize: 'var(--rd-text-2xl)', marginBottom: '4px' }}>Dashboard</h1>
        <p style={{ color: 'var(--rd-color-text-muted)' }}>Welcome to RateDeck</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
        <KpiCard
          label="This Month's Margin"
          value={loading ? '...' : `$${margin.toFixed(2)}`}
          icon="chart"
          delay={0}
        />
        <KpiCard
          label="Total Calls"
          value={loading ? '...' : String(metrics?.total_calls || 0)}
          icon="phone"
          delay={50}
        />
        <KpiCard
          label="Total Billed Minutes"
          value={loading ? '...' : String(Math.ceil((metrics?.total_billed_sec || 0) / 60))}
          icon="hash"
          delay={100}
        />
      </div>

      <Card
        title="Recent Import Jobs"
        style={{ animationDelay: '150ms' }}
      >
        <div style={{ color: 'var(--rd-color-text-subtle)', fontSize: 'var(--rd-text-sm)', textAlign: 'center', padding: '48px 0' }}>
          Data tables loaded via standard REST endpoints!
        </div>
      </Card>
    </div>
  );
}
