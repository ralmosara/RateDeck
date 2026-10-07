import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuth } from './AuthContext';
import { Button, Card, Input } from '../shared/ui/primitives';
import { Icon } from '../shared/ui/Icon';
import s from './Login.module.css';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Direct fetch to API for Phase 1
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await res.json();
      login(data);
      
      navigate({ to: '/' });
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={s.container}>
      <div className={s.ambient}></div>
      <Card className={s.loginCard}>
        <div className={s.brand}>
          <div className={s.logo}><Icon name="server" size={24} /></div>
          <h2>RateDeck</h2>
          <p>Sign in to your account</p>
        </div>
        
        {error && <div className={s.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={s.form}>
          <Input 
            label="Email Address" 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            autoComplete="email"
          />
          <Input 
            label="Password" 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            autoComplete="current-password"
          />
          
          <Button 
            type="submit" 
            variant="primary" 
            className={s.submitBtn} 
            loading={loading}
          >
            Sign In
          </Button>
        </form>
      </Card>
    </div>
  );
}
