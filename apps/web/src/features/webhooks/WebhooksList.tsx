import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Card, Button, Badge } from '../../shared/ui/primitives';
import { DataGrid } from '../../shared/ui/DataGrid';
import { useAuth } from '../../shells/AuthContext';

export function WebhooksList() {
  const { token } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: async () => {
      const res = await fetch('/api/v1/webhooks', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.json();
    },
    enabled: !!token,
  });

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: 'active',
        header: 'Status',
        cell: (info) => (
          <Badge tone={info.getValue() ? 'success' : 'neutral'}>
            {info.getValue() ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
      {
        accessorKey: 'url',
        header: 'URL',
        cell: (info) => <span style={{ fontFamily: 'var(--rd-font-mono)' }}>{info.getValue<string>()}</span>,
      },
      {
        accessorKey: 'events',
        header: 'Subscribed Events',
        cell: (info) => (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {info.getValue<string>().split(',').map((ev: string) => (
              <span key={ev} style={{ background: 'var(--rd-color-surface-hover)', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>
                {ev.trim()}
              </span>
            ))}
          </div>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: (info) => (
          <div style={{ textAlign: 'right' }}>
            <Button variant="default" onClick={async () => {
              try {
                const res = await fetch(`/api/v1/webhooks/${info.row.original.id}/test`, {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) alert('Test event dispatched! Check your webhook receiver (or logs if failing).');
                else alert('Failed to dispatch test event.');
              } catch (e) {
                alert('Error dispatching test event.');
              }
            }}>Test</Button>
          </div>
        ),
      },
    ],
    [token]
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header>
        <h1 style={{ fontSize: 'var(--rd-text-2xl)', marginBottom: '4px' }}>Webhooks & Integrations</h1>
        <p style={{ color: 'var(--rd-color-text-muted)' }}>Configure endpoints to receive push notifications for events.</p>
      </header>

      <Card
        title="Configured Endpoints"
        actions={<Button variant="primary" icon="plus">Add Endpoint</Button>}
      >
        <DataGrid 
          data={data || []} 
          columns={columns} 
          loading={isLoading} 
          emptyMessage="No webhook endpoints configured." 
        />
      </Card>
    </div>
  );
}
