import { FormEvent, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function PasswordRecovery({ reset = false }: { reset?: boolean }) {
  const { token } = useParams<{ token: string }>();
  const [value, setValue] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setMessage('');
    const response = await fetch(reset ? '/api/auth/reset-password' : '/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reset ? { token, password: value } : { email: value }) });
    const data = await response.json(); setMessage(data.message || data.error || 'İşlem tamamlanamadı.'); setLoading(false);
  };
  return <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-zinc-100"><section className="w-full max-w-md border border-zinc-800 bg-zinc-900 p-7"><h1 className="text-2xl font-semibold">{reset ? 'Yeni parola belirleyin' : 'Hesabınızı kurtarın'}</h1><p className="mt-2 text-sm leading-6 text-zinc-400">{reset ? 'En az 8 karakterli yeni parolanızı girin.' : 'Hesabınız varsa yenileme bağlantısını e-posta adresinize göndereceğiz.'}</p><form onSubmit={submit} className="mt-6 space-y-4"><Input type={reset ? 'password' : 'email'} autoComplete={reset ? 'new-password' : 'email'} required minLength={reset ? 8 : undefined} value={value} onChange={event => setValue(event.target.value)} placeholder={reset ? 'Yeni parola' : 'E-posta adresi'} className="h-12 border-zinc-700 bg-zinc-950" /><Button type="submit" disabled={loading} className="h-12 w-full bg-orange-600 text-white hover:bg-orange-700">{loading ? 'Gönderiliyor…' : reset ? 'Parolayı yenile' : 'Bağlantı iste'}</Button></form>{message && <p role="status" className="mt-4 text-sm text-zinc-300">{message}</p>}<Link to="/login" className="mt-6 inline-block text-sm text-orange-400 hover:underline">Girişe dön</Link></section></main>;
}
