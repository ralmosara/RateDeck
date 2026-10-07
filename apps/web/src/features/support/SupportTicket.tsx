import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from '@tanstack/react-router';
import { Card, Button, Badge } from '../../shared/ui/primitives';
import { useAuth } from '../../shells/AuthContext';

export function SupportTicket() {
  const { id } = useParams({ from: '/authenticated/support/$id' });
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [reply, setReply] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['support', 'tickets', id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/support/tickets/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load ticket');
      return res.json();
    },
    enabled: !!token,
  });

  const replyMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await fetch(`/api/v1/support/tickets/${id}/messages`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ body: message })
      });
      if (!res.ok) throw new Error('Failed to send reply');
      return res.json();
    },
    onSuccess: () => {
      setReply('');
      queryClient.invalidateQueries({ queryKey: ['support', 'tickets', id] });
    }
  });

  if (isLoading) return <div>Loading...</div>;
  if (!data) return <div>Ticket not found</div>;

  const { ticket, messages } = data;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ marginBottom: '16px' }}>
        <Link to="/support" style={{ color: 'var(--rd-color-text-subtle)', textDecoration: 'none' }}>
          &larr; Back to Tickets
        </Link>
      </div>
      
      <Card>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: 'var(--rd-text-xl)', marginBottom: '8px' }}>{ticket.subject}</h1>
            <div style={{ display: 'flex', gap: '12px', color: 'var(--rd-color-text-muted)', fontSize: 'var(--rd-text-sm)' }}>
              <span>Ticket #{ticket.publicId}</span>
              <span>•</span>
              <span>{new Date(ticket.createdAt).toLocaleString()}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Badge tone={ticket.status === 'open' ? 'warning' : ticket.status === 'resolved' ? 'success' : 'neutral'}>
              {ticket.status}
            </Badge>
            <Badge tone={ticket.priority === 'urgent' || ticket.priority === 'high' ? 'danger' : 'neutral'}>
              {ticket.priority}
            </Badge>
          </div>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.map((msg: any) => (
            <div 
              key={msg.id} 
              style={{ 
                padding: '16px', 
                backgroundColor: msg.isInternalNote ? 'var(--rd-color-warning-subtle)' : 'var(--rd-color-bg-subtle)', 
                borderRadius: '8px' 
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: 'var(--rd-text-sm)', color: 'var(--rd-color-text-subtle)' }}>
                <strong>User #{msg.authorId}</strong>
                <span>{new Date(msg.createdAt).toLocaleString()}</span>
              </div>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{msg.body}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Reply">
        <textarea 
          value={reply}
          onChange={e => setReply(e.target.value)}
          placeholder="Type your reply here..."
          style={{ 
            width: '100%', 
            minHeight: '120px', 
            padding: '12px', 
            borderRadius: '6px', 
            border: '1px solid var(--rd-color-border)', 
            backgroundColor: 'var(--rd-color-bg)', 
            color: 'var(--rd-color-text)',
            marginBottom: '16px',
            fontFamily: 'inherit'
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button 
            variant="primary" 
            onClick={() => replyMutation.mutate(reply)}
            disabled={!reply.trim() || replyMutation.isPending}
          >
            {replyMutation.isPending ? 'Sending...' : 'Send Reply'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
