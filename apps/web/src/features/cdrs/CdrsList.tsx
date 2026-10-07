import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Card, Button, Badge } from '../../shared/ui/primitives';
import { DataGrid } from '../../shared/ui/DataGrid';
import { useAuth } from '../../shells/AuthContext';

export function CdrsList() {
  const { token } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['cdrs'],
    queryFn: async () => {
      const res = await fetch('/api/v1/cdrs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.json();
    },
    enabled: !!token,
  });

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: 'startTime',
        header: 'Date',
        cell: (info) => new Date(info.getValue<string>()).toLocaleString(),
      },
      {
        accessorKey: 'caller',
        header: 'Caller',
        cell: (info) => <span style={{ fontFamily: 'var(--rd-font-mono)' }}>{info.getValue<string>() || 'Unknown'}</span>,
      },
      {
        accessorKey: 'callee',
        header: 'Callee',
        cell: (info) => <span style={{ fontFamily: 'var(--rd-font-mono)' }}>{info.getValue<string>()}</span>,
      },
      {
        accessorKey: 'durationSec',
        header: 'Duration',
        cell: (info) => `${info.getValue<number>()}s`,
      },
      {
        accessorKey: 'disposition',
        header: 'Status',
        cell: (info) => (
          <Badge tone={info.getValue() === 'ANSWERED' ? 'success' : 'danger'}>
            {info.getValue<string>()}
          </Badge>
        ),
      },
      {
        accessorKey: 'costAmount',
        header: 'Cost',
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
        <h1 style={{ fontSize: 'var(--rd-text-2xl)', marginBottom: '4px' }}>Call Detail Records</h1>
        <p style={{ color: 'var(--rd-color-text-muted)' }}>Search and filter your recent calls.</p>
      </header>

      <Card
        title="Recent CDRs"
        actions={<Button variant="default" icon="download">Export CSV</Button>}
      >
        <DataGrid 
          data={data?.data || []} 
          columns={columns} 
          loading={isLoading} 
          emptyMessage="No CDRs found." 
        />
      </Card>
    </div>
  );
}
