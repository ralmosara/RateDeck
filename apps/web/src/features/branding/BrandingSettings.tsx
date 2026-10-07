import { useState } from 'react';
import { Card, Button } from '../../shared/ui/primitives';
import { useAuth } from '../../shells/AuthContext';

export function BrandingSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    companyName: 'RateDeck Reseller',
    primaryColor: '#0055ff',
    supportEmail: 'support@example.com',
    logoUrl: ''
  });

  const handleSave = async () => {
    setLoading(true);
    // Dummy fetch to simulate saving branding settings
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    alert('Branding settings saved successfully!');
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header>
        <h1 style={{ fontSize: 'var(--rd-text-2xl)', marginBottom: '4px' }}>Branding & Settings</h1>
        <p style={{ color: 'var(--rd-color-text-muted)' }}>Customize the appearance of your customer portal.</p>
      </header>

      <Card title="White-label Configuration">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: 'var(--rd-text-sm)', fontWeight: 500 }}>Company Name</label>
            <input 
              type="text" 
              value={settings.companyName}
              onChange={e => setSettings({...settings, companyName: e.target.value})}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--rd-color-border)',
                backgroundColor: 'var(--rd-color-bg)',
                color: 'var(--rd-color-text)'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: 'var(--rd-text-sm)', fontWeight: 500 }}>Primary Color</label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input 
                type="color" 
                value={settings.primaryColor}
                onChange={e => setSettings({...settings, primaryColor: e.target.value})}
                style={{
                  padding: '0',
                  borderRadius: '4px',
                  border: 'none',
                  width: '40px',
                  height: '40px',
                  cursor: 'pointer'
                }}
              />
              <span style={{ fontFamily: 'var(--rd-font-mono)' }}>{settings.primaryColor}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: 'var(--rd-text-sm)', fontWeight: 500 }}>Support Email</label>
            <input 
              type="email" 
              value={settings.supportEmail}
              onChange={e => setSettings({...settings, supportEmail: e.target.value})}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--rd-color-border)',
                backgroundColor: 'var(--rd-color-bg)',
                color: 'var(--rd-color-text)'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: 'var(--rd-text-sm)', fontWeight: 500 }}>Logo URL</label>
            <input 
              type="url" 
              placeholder="https://example.com/logo.png"
              value={settings.logoUrl}
              onChange={e => setSettings({...settings, logoUrl: e.target.value})}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--rd-color-border)',
                backgroundColor: 'var(--rd-color-bg)',
                color: 'var(--rd-color-text)'
              }}
            />
          </div>

        </div>
        
        <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
