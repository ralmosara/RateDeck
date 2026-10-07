import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Card, Button, Badge, KpiCard } from '../../shared/ui/primitives';
import { DataGrid } from '../../shared/ui/DataGrid';
import { useAuth } from '../../shells/AuthContext';

export function BillingOverview() {
  const { token } = useAuth();

  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ['billing', 'balance'],
    queryFn: async () => {
      const res = await fetch('/api/v1/billing/balance', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.json();
    },
    enabled: !!token,
  });

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['billing', 'transactions'],
    queryFn: async () => {
      const res = await fetch('/api/v1/billing/transactions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.json();
    },
    enabled: !!token,
  });

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: 'createdAt',
        header: 'Date',
        cell: (info) => new Date(info.getValue<string>()).toLocaleString(),
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: (info) => (
          <Badge tone={info.getValue() === 'deposit' ? 'success' : info.getValue() === 'charge' ? 'danger' : 'neutral'}>
            {info.getValue<string>()}
          </Badge>
        ),
      },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: (info) => info.getValue() || '-',
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: (info) => (
          <div style={{ textAlign: 'right', fontFamily: 'var(--rd-font-mono)' }}>
            ${Number(info.getValue() || 0).toFixed(4)}
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header>
        <h1 style={{ fontSize: 'var(--rd-text-2xl)', marginBottom: '4px' }}>Billing & Invoices</h1>
        <p style={{ color: 'var(--rd-color-text-muted)' }}>Manage your funds and download invoices.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
        <KpiCard
          label="Prepaid Balance"
          value={balanceLoading ? '...' : `$${Number(balanceData?.balance || 0).toFixed(2)}`}
          icon="credit-card"
        />
      </div>

      <Card
        title="Recent Ledger Transactions"
        actions={<Button variant="primary" icon="plus">Add Funds</Button>}
      >
        <DataGrid 
          data={txData || []} 
          columns={columns} 
          loading={txLoading} 
          emptyMessage="No transactions found." 
        />
      </Card>
    </div>
  );
}
