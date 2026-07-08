#!/usr/bin/env node
// R4 smoke test — walks the web app's core flow against a running local
// dev server (register -> sign in -> create itinerary -> add day/POI ->
// list -> expense-splitting read). Asserts 2xx at each step, exits non-zero
// with the failing step on error. Not part of `pnpm check` — needs a live
// `pnpm dev:api` in another terminal.
//
// Usage:
//   terminal A: cd packages/api && pnpm dev   (predev auto-applies D1 migrations)
//   terminal B: pnpm smoke

const BASE = process.env.SMOKE_BASE ?? 'http://localhost:3000';

async function step(name, fn) {
  process.stdout.write(`-> ${name}... `);
  const result = await fn();
  process.stdout.write('ok\n');
  return result;
}

async function json(res, label) {
  if (!res.ok) {
    const body = await res.text().catch(() => '<unreadable body>');
    throw new Error(`${label} failed: ${res.status} ${body}`);
  }
  return res.json();
}

async function main() {
  const email = `smoke+${Date.now()}@example.com`;
  const password = 'pw12345678';

  await step('register (sign up)', async () => {
    const res = await fetch(`${BASE}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, flow: 'signUp', name: 'Smoke' }),
    });
    return json(res, 'signup');
  });

  const { token } = await step('sign in', async () => {
    const res = await fetch(`${BASE}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, flow: 'signIn' }),
    });
    return json(res, 'signin');
  });

  const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  // Write endpoints return an enveloped `{ data: { id } }` (auth is the
  // exception — it returns the token at top level), so unwrap `.data`.
  const { data: { id: itineraryId } } = await step('create itinerary', async () => {
    const res = await fetch(`${BASE}/api/itineraries`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Smoke Trip',
        cityId: 1,
        startDate: '2026-08-01',
        endDate: '2026-08-03',
      }),
    });
    return json(res, 'create itinerary');
  });

  const { data: { id: dayId } } = await step('add day', async () => {
    const res = await fetch(`${BASE}/api/itineraries/${itineraryId}/days`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ dayNumber: 1, date: '2026-08-01' }),
    });
    return json(res, 'add day');
  });

  await step('add POI to day', async () => {
    const res = await fetch(`${BASE}/api/itineraries/${itineraryId}/days/${dayId}/items`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ poiId: 1, orderIndex: 0 }),
    });
    return json(res, 'add POI');
  });

  await step('list itineraries', async () => {
    const res = await fetch(`${BASE}/api/itineraries`, { headers: authHeaders });
    return json(res, 'list itineraries');
  });

  await step('expense-splitting balance (read)', async () => {
    const res = await fetch(`${BASE}/api/expense-splitting/balance?itineraryId=${itineraryId}`, {
      headers: authHeaders,
    });
    return json(res, 'expense-splitting balance');
  });

  process.stdout.write('SMOKE OK\n');
}

main().catch((err) => {
  console.error('SMOKE FAIL:', err.message);
  process.exit(1);
});
