import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { fetchWithAuth } from '../../lib/api';
import { blockerLabel } from './tenant-deletion-labels';

interface TenantDeletePanelProps {
  companyId: string;
  companyName: string;
}

interface DeletionPreview {
  deletable: boolean;
  blockers: Record<string, number>;
}

export function TenantDeletePanel({ companyId, companyName }: TenantDeletePanelProps) {
  const navigate = useNavigate();
  const [preview, setPreview] = useState<DeletionPreview | null>(null);
  const [confirmName, setConfirmName] = useState('');
  const [busy, setBusy] = useState(false);

  const loadPreview = async () => {
    setBusy(true);
    try {
      const res = await fetchWithAuth(`/api/admin/tenants/${companyId}/deletion-preview`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Silme kontrolü yapılamadı');
      setPreview(body);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Silme kontrolü yapılamadı');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const res = await fetchWithAuth(`/api/admin/tenants/${companyId}`, { method: 'DELETE', body: JSON.stringify({ confirmName }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Firma silinemedi');
      toast.success(`Firma silindi. Silinen kullanıcı: ${body.deletedUsers}, korunan kullanıcı: ${body.retainedUsers}.`);
      navigate('/admin/tenants');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Firma silinemedi');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section data-testid="tenant-delete-panel" className="space-y-3 rounded border border-destructive/40 bg-card p-4 text-xs">
      <h2 className="text-sm font-semibold text-destructive">Firmayı Kalıcı Olarak Sil</h2>
      <p className="text-muted-foreground">Bu işlem geri alınamaz. Firma, teklifleri, müşterileri ve başka kaydı olmayan kullanıcıları silinir. Denetim kayıtları korunur.</p>
      {!preview && <Button type="button" variant="outline" disabled={busy} onClick={loadPreview}>Silinebilirliği Kontrol Et</Button>}
      {preview && !preview.deletable && (
        <div className="space-y-1">
          <p className="font-semibold text-foreground">Bu firma silinemez, korunan kayıtları var. Gerekirse aboneliğini askıya alın.</p>
          <ul className="list-disc pl-4 text-muted-foreground">
            {Object.entries(preview.blockers).map(([table, count]) => <li key={table}>{blockerLabel(table)}: {count}</li>)}
          </ul>
        </div>
      )}
      {preview?.deletable && (
        <div className="space-y-2">
          <label htmlFor="tenant-delete-confirm" className="block text-foreground">Onaylamak için firma adını yazın: <strong>{companyName}</strong></label>
          <input id="tenant-delete-confirm" value={confirmName} onChange={event => setConfirmName(event.target.value)} className="h-9 w-full rounded border border-border bg-background px-2 text-foreground" />
          <Button type="button" variant="destructive" disabled={busy || confirmName !== companyName} onClick={remove}>Firmayı Kalıcı Olarak Sil</Button>
        </div>
      )}
    </section>
  );
}
