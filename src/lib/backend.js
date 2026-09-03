import Constants from 'expo-constants';

export const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl;

export async function apiJson(path, opts) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' }, ...opts,
  });
  if (!res.ok) throw new Error(`Server returned ${res.status}`);
  return res.json();
}
