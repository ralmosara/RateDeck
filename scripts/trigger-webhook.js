async function main() {
  const crypto = require('crypto');
  function base64url(str) {
    return Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({ sub: 'user_123', userId: 1, accountId: 1, accountPath: 'root' }));
  const signature = base64url(crypto.createHmac('sha256', 'supersecretpassword123').update(`${header}.${payload}`).digest());
  const accessToken = `${header}.${payload}.${signature}`;

  // Create webhook endpoint
  const createRes = await fetch('http://127.0.0.1:3000/v1/webhooks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ url: 'http://127.0.0.1:9999/fail', secret: 'test_secret', events: '*' })
  });
  
  if (!createRes.ok) throw new Error('Failed to create webhook: ' + await createRes.text());
  const endpoint = await createRes.json();
  console.log('Created endpoint:', endpoint.id);

  // Trigger test event
  const triggerRes = await fetch(`http://127.0.0.1:3000/v1/webhooks/${endpoint.id}/test`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  if (!triggerRes.ok) throw new Error('Failed to trigger webhook test: ' + await triggerRes.text());
  console.log('Dispatched test event to BullMQ. Check worker logs for retries!');
}

main().catch(console.error);
