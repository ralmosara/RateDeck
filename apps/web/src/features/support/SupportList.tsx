import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ColumnDef } from '@tanstack/react-table';
import { Card, Button, Badge } from '../../shared/ui/primitives';
import { DataGrid } from '../../shared/ui/DataGrid';
import { useAuth } from '../../shells/AuthContext';

export function SupportList() {
  const { token } = useAuth();

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['support', 'tickets'],
    queryFn: async () => {
      const res = await fetch('/api/v1/support/tickets', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load tickets');
      return res.json();
    },
    enabled: !!token,
  });

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: 'publicId',
        header: 'Ticket ID',
        cell: (info) => (
          <Link 
            to="/support/$id" 
            params={{ id: info.getValue<string>() }} 
            style={{ color: 'var(--rd-color-primary)', textDecoration: 'none', fontWeight: 500 }}
          >
            {info.getValue<string>()}
          </Link>
        ),
      },
      {
        accessorKey: 'subject',
        header: 'Subject',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: (info) => (
          <Badge tone={info.getValue() === 'open' ? 'warning' : info.getValue() === 'resolved' ? 'success' : 'neutral'}>
            {info.getValue<string>()}
          </Badge>
        ),
      },
      {
        accessorKey: 'priority',
        header: 'Priority',
        cell: (info) => (
          <Badge tone={info.getValue() === 'urgent' || info.getValue() === 'high' ? 'danger' : 'neutral'}>
            {info.getValue<string>()}
          </Badge>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: (info) => new Date(info.getValue<string>()).toLocaleString(),
      },
    ],
    []
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--rd-text-2xl)', marginBottom: '4px' }}>Support Tickets</h1>
          <p style={{ color: 'var(--rd-color-text-muted)' }}>Manage and track your support requests.</p>
        </div>
        <Button variant="primary" icon="plus">New Ticket</Button>
      </header>

      <Card>
        <DataGrid 
          data={tickets || []} 
          columns={columns} 
          loading={isLoading} 
          emptyMessage="No tickets found." 
        />
      </Card>
    </div>
  );
}
