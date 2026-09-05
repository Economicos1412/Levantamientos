import { getStore } from '@netlify/blobs';
import type { Levantamiento, Ramal } from '@/lib/records';

export type StoredRamal = Ramal & { createdAt: string };
export type StoredLevantamiento = Omit<Levantamiento, 'ramal' | 'subestacion'> & { createdAt: string };
export type AppState = { ramales: StoredRamal[]; levantamientos: StoredLevantamiento[] };

const seedState: AppState = {
  ramales: [],
  levantamientos: [],
};

function cloneSeed() {
  return JSON.parse(JSON.stringify(seedState)) as AppState;
}

export async function readState(): Promise<AppState> {
  const store = getStore('levantamientos-data', { consistency: 'strong' });
  const value = await store.get('state-v1', { type: 'json' }) as AppState | null;
  if (!value || !Array.isArray(value.ramales) || !Array.isArray(value.levantamientos)) return cloneSeed();
  return value;
}

export async function writeState(state: AppState) {
  const store = getStore('levantamientos-data', { consistency: 'strong' });
  await store.setJSON('state-v1', state);
}
