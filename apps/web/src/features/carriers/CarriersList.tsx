import { useQuery } from '@tanstack/react-query';
import { Card, Button, Badge } from '../../shared/ui/primitives';
import { useAuth } from '../../shells/AuthContext';

export function CarriersList() {
  const { token } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['carriers'],
    queryFn: async () => {
      const res = await fetch('/api/v1/carriers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.json();
    },
    enabled: !!token,
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header>
        <h1 style={{ fontSize: 'var(--rd-text-2xl)', marginBottom: '4px' }}>Carriers & Trunks</h1>
        <p style={{ color: 'var(--rd-color-text-muted)' }}>Manage your SIP trunks and routing peers.</p>
      </header>

      <Card
        title="Configured Carriers"
        actions={<Button variant="primary" icon="plus">Add Carrier</Button>}
      >
        {isLoading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--rd-color-text-subtle)' }}>Loading...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--rd-text-sm)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--rd-color-border)', color: 'var(--rd-color-text-muted)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Name</th>
                <th style={{ padding: '12px 16px' }}>Created</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '48px 0', textAlign: 'center', color: 'var(--rd-color-text-subtle)' }}>
                    No carriers configured.
                  </td>
                </tr>
              )}
              {data?.map((carrier: any) => (
                <tr key={carrier.id} style={{ borderBottom: '1px solid var(--rd-color-border)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <Badge tone={carrier.status === 'active' ? 'success' : 'neutral'}>
                      {carrier.status}
                    </Badge>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: '500' }}>{carrier.name}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--rd-color-text-subtle)' }}>
                    {new Date(carrier.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <Button variant="default">View Trunks</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
