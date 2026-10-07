import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from '@tanstack/react-router';
import { ColumnDef } from '@tanstack/react-table';
import { Card, Button, Badge, KpiCard } from '../../shared/ui/primitives';
import { DataGrid } from '../../shared/ui/DataGrid';

export function RateDeckDiff() {
  const { id, versionId } = useParams({ strict: false });
  const [diff, setDiff] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [publishing, setPublishing] = useState(false);

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: 'diffKind',
        header: 'Kind',
        cell: (info) => {
          const val = info.getValue<string>();
          return <Badge tone={val === 'insert' ? 'success' : val === 'delete' ? 'danger' : 'warning'}>{val.toUpperCase()}</Badge>;
        }
      },
      {
        accessorKey: 'destination',
        header: 'Destination',
        cell: (info) => <span style={{ fontWeight: 500 }}>{info.getValue<string>()}</span>
      },
      {
        accessorKey: 'prefix',
        header: 'Prefix',
        cell: (info) => <span style={{ fontFamily: 'var(--rd-font-mono)' }}>{info.getValue<string>()}</span>
      },
      {
        accessorKey: 'oldRate',
        header: 'Old Rate',
        cell: (info) => {
          const isDelete = info.row.original.diffKind === 'delete';
          return <span style={{ color: 'var(--rd-color-text-muted)', textDecoration: isDelete ? 'line-through' : 'none' }}>{info.getValue<string>() || '-'}</span>;
        }
      },
      {
        accessorKey: 'ratePerMin',
        header: 'New Rate',
        cell: (info) => {
          const isUpdate = info.row.original.diffKind === 'update';
          return <span style={{ fontWeight: isUpdate ? 600 : 400 }}>{info.getValue<string>() || '-'}</span>;
        }
      }
    ],
    []
  );

  useEffect(() => {
    async function load() {
      try {
        const headers = { Authorization: `Bearer ${localStorage.getItem('rd_auth_token')}` };
        const res = await fetch(`/api/v1/rates/versions/${versionId}/diff`, { headers });
        if (res.ok) setDiff(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    if (versionId) load();
  }, [versionId]);

  async function handlePublish() {
    if (!confirm('Are you sure you want to publish this rate deck version?')) return;
    setPublishing(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('rd_auth_token')}` };
      const res = await fetch(`/api/v1/rates/versions/${versionId}/publish`, { method: 'POST', headers });
      if (res.ok) {
        alert('Deck published successfully!');
        window.location.href = `/rate-decks/${id}`;
      } else {
        alert('Failed to publish deck');
      }
    } catch (e) {
      console.error(e);
      alert('Error publishing deck');
    } finally {
      setPublishing(false);
    }
  }

  if (loading) return <div style={{ padding: '48px', textAlign: 'center' }}>Analyzing diff...</div>;
  if (!diff) return <div style={{ padding: '48px', textAlign: 'center' }}>Error loading diff.</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '8px' }}>
            <Link to={`/rate-decks/${id}` as any} style={{ color: 'var(--rd-color-text-muted)', textDecoration: 'none' }}>&larr; Back to Deck</Link>
          </div>
          <h1 style={{ fontSize: 'var(--rd-text-3xl)', marginBottom: '4px' }}>Review Draft Changes</h1>
          <p style={{ color: 'var(--rd-color-text-muted)' }}>Analyze rate modifications before publishing</p>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <Button variant="ghost" style={{ color: 'var(--rd-color-danger)' }}>Discard Draft</Button>
          <Button variant="primary" loading={publishing} onClick={handlePublish}>Publish Now</Button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        <KpiCard label="New Rates (Inserts)" value={diff.inserts} icon="arrowUp" delay={0} />
        <KpiCard label="Modified Rates (Updates)" value={diff.updates} icon="settings" delay={50} />
        <KpiCard label="Removed Rates (Deletes)" value={diff.deletes} icon="arrowDown" delay={100} />
      </div>

      <Card title="Sample Differential" style={{ animationDelay: '150ms' }}>
        <DataGrid 
          data={diff.sample} 
          columns={columns} 
          emptyMessage="No changes detected."
          getRowStyle={(row) => {
            if (row.diffKind === 'insert') return { backgroundColor: 'rgba(16, 185, 129, 0.05)' };
            if (row.diffKind === 'delete') return { backgroundColor: 'rgba(239, 68, 68, 0.05)' };
            if (row.diffKind === 'update') return { backgroundColor: 'rgba(245, 158, 11, 0.05)' };
            return {};
          }}
        />
      </Card>
    </div>
  );
}
