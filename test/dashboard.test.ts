import http from 'http';
import app from '../src/dashboard/server';

describe('dashboard API', () => {
  let server: http.Server;
  let base: string;
  beforeAll(async () => { server = http.createServer(app); await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve)); const address = server.address() as any; base = `http://127.0.0.1:${address.port}`; });
  afterAll(async () => { await new Promise<void>(resolve => server.close(() => resolve())); });
  test('reports health and analyzes source', async () => {
    const health = await fetch(`${base}/api/health`);
    expect(health.status).toBe(200);
    const response = await fetch(`${base}/api/analyze`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: 'window.addEventListener("resize", () => redraw())' }) });
    const result = await response.json() as any;
    expect(response.status).toBe(200);
    expect(result.findings[0].id).toBe('unthrottled-event-listener');
  });
  test('rejects invalid source syntax', async () => {
    const response = await fetch(`${base}/api/analyze`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: 'const =' }) });
    expect(response.status).toBe(422);
  });
});
