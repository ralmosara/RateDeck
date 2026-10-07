import React, { useEffect, useState, useRef, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Card, Button, Badge } from '../../shared/ui/primitives';
import { DataGrid } from '../../shared/ui/DataGrid';

import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '../../shells/AuthContext';

export function RateDecksList() {
  const navigate = useNavigate();
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Deck Name',
        cell: (info) => <span style={{ fontWeight: 600 }}>{info.getValue<string>()}</span>,
      },
      {
        accessorKey: 'kind',
        header: 'Type',
        cell: (info) => <Badge tone="brand">{info.getValue<string>()}</Badge>,
      },
      {
        accessorKey: 'currency',
        header: 'Currency',
        cell: (info) => <span style={{ color: 'var(--rd-color-text-subtle)' }}>{info.getValue<string>()}</span>,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: (info) => (
          <div style={{ textAlign: 'right' }}>
            <Button variant="default" onClick={() => navigate({ to: `/rate-decks/${info.row.original.publicId}` })}>
              View Versions
            </Button>
          </div>
        ),
      },
    ],
    [navigate]
  );

  const { token } = useAuth();

  useEffect(() => {
    load();
  }, [token]);

  async function load() {
    if (!token) return;
    try {
      const res = await fetch('/api/v1/rates/decks', {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });
      if (res.ok) {
        const data = await res.json();
        setDecks(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/v1/rates/decks/import', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      
      if (res.ok) {
        const result = await res.json();
        alert(`Successfully parsed ${result.rowCount} rows! Sample:\n${JSON.stringify(result.sample, null, 2)}`);
        load();
      } else {
        alert('Upload failed.');
      }
    } catch (e) {
      console.error(e);
      alert('Upload error.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--rd-text-2xl)', marginBottom: '4px' }}>Rate Decks</h1>
          <p style={{ color: 'var(--rd-color-text-muted)' }}>Manage pricing and wholesale catalog</p>
        </div>
        <div>
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            style={{ display: 'none' }} 
            id="csv-upload" 
          />
          <Button 
            variant="primary" 
            icon="upload" 
            loading={uploading} 
            onClick={() => fileInputRef.current?.click()}
          >
            Import Deck
          </Button>
        </div>
      </header>

      <Card title="All Decks">
        <DataGrid
          data={decks || []}
          columns={columns}
          loading={loading}
          emptyMessage="No rate decks found. Click 'Import Deck' to upload your first CSV deck."
        />
      </Card>
    </div>
  );
}
