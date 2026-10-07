import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Card, KpiCard, Button } from '../../shared/ui/primitives';
import { DataGrid } from '../../shared/ui/DataGrid';
import { useAuth } from '../../shells/AuthContext';
import { useShell } from '../../shells/ShellContext';

export function ReportsOverview() {
  const { token } = useAuth();
  const { portal } = useShell();

  // For simplicity, just checking last 30 days
  const [dateRange] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    return { start, end };
  });

  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ['reports', 'usage', dateRange.start, dateRange.end],
    queryFn: async () => {
      const qs = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });
      const res = await fetch(`/api/v1/reports/usage?${qs}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch usage');
      return res.json();
    },
    enabled: !!token,
  });

  const { data: destinationsData, isLoading: destLoading } = useQuery({
    queryKey: ['reports', 'destinations', dateRange.start, dateRange.end],
    queryFn: async () => {
      const qs = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });
      const res = await fetch(`/api/v1/reports/destinations?${qs}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch destinations');
      return res.json();
    },
    enabled: !!token,
  });

  const margin = usageData ? Number(usageData.total_sell) - Number(usageData.total_cost) : 0;
  const asr = usageData && usageData.total_calls > 0
    ? (Number(usageData.total_billed_sec) > 0 ? 1 : 0) / Number(usageData.total_calls) * 100 // approximation
    : 0;
  const acd = usageData && usageData.total_calls > 0
    ? Number(usageData.total_duration_sec) / Number(usageData.total_calls)
    : 0;

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: 'destination',
        header: 'Destination',
      },
      {
        accessorKey: 'total_calls',
        header: 'Total Calls',
        cell: (info) => Number(info.getValue()).toLocaleString(),
      },
      {
        accessorKey: 'total_billed_sec',
        header: 'Billed Minutes',
        cell: (info) => (Number(info.getValue()) / 60).toFixed(2),
      },
      {
        accessorKey: 'total_sell',
        header: 'Revenue',
        cell: (info) => `$${Number(info.getValue()).toFixed(4)}`,
      },
    ],
    []
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--rd-text-2xl)', marginBottom: '4px' }}>Reports & Analytics</h1>
          <p style={{ color: 'var(--rd-color-text-muted)' }}>Usage, margins, and performance for the last 30 days.</p>
        </div>
        <Button variant="default" icon="download">Export CSV</Button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
        <KpiCard
          label="Total Revenue"
          value={usageLoading ? '...' : `$${Number(usageData?.total_sell || 0).toFixed(2)}`}
          icon="invoice"
        />
        {portal !== 'customer' && (
          <KpiCard
            label="Total Margin"
            value={usageLoading ? '...' : `$${margin.toFixed(2)}`}
            icon="chart"
          />
        )}
        <KpiCard
          label="Average Call Duration (ACD)"
          value={usageLoading ? '...' : `${acd.toFixed(1)}s`}
          icon="hash"
        />
        <KpiCard
          label="Est. Answer Seizure Ratio (ASR)"
          value={usageLoading ? '...' : `${asr.toFixed(1)}%`}
          icon="layers"
        />
      </div>

      <Card title="Top Destinations by Revenue">
        <DataGrid 
          data={destinationsData || []} 
          columns={columns} 
          loading={destLoading} 
          emptyMessage="No destination data found for this period." 
        />
      </Card>
    </div>
  );
}
