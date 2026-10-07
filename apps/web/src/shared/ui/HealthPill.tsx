import type { HealthResponse } from '@ratedeck/contracts';
import { useQuery } from '@tanstack/react-query';
import { Badge } from './primitives';

async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch('/api/health');
  if (!res.ok && res.status !== 503) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as HealthResponse;
}

/** Live API/dependency status, polled every 15s. */
export function HealthPill() {
  const { data, isError, isPending } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    refetchInterval: 15_000,
    retry: false,
  });

  if (isPending) return <Badge dot>Connecting…</Badge>;
  if (isError || !data) {
    return (
      <span title="Start the API with: pnpm dev:api">
        <Badge tone="danger" dot>
          API offline
        </Badge>
      </span>
    );
  }
  const title = `Database: ${data.checks.database} · Redis: ${data.checks.redis} · v${data.version}`;
  return (
    <span title={title}>
      <Badge tone={data.status === 'ok' ? 'success' : 'warning'} dot live>
        {data.status === 'ok' ? 'All systems operational' : 'Degraded'}
      </Badge>
    </span>
  );
}
