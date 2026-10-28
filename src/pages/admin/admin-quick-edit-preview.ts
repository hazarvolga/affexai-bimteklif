import { planIdentity, PREVIEW_STALE_NOTICE } from './admin-change-preview';

type TenantSnapshot = {
  name?: string | null;
  plan_id?: string | null;
  plan_name?: string | null;
  subscription_status?: string | null;
  bonus_quote_limit?: number | null;
};
type QuickEdit = { planId: string | null; status: string; bonusQuoteLimit: number };
type Plan = { id: string; name: string };

export function quickEditPreview(tenant: TenantSnapshot, next: QuickEdit, plans: readonly Plan[]): string {
  const noSubscription = tenant.subscription_status === null;
  const previousPlan = tenant.plan_id === undefined ? 'Bilinmiyor' : tenant.plan_id
    ? planIdentity(tenant.plan_name ?? undefined, tenant.plan_id)
    : noSubscription ? 'Abonelik yok' : tenant.plan_name ? `Eski plan: ${tenant.plan_name}` : 'Eski plan bilinmiyor';
  const nextPlan = next.planId ? planIdentity(plans.find(plan => plan.id === next.planId)?.name, next.planId)
    : noSubscription ? 'Katalog paketi seçilmedi; yeni abonelikte varsayılan eski plan uygulanabilir'
    : tenant.plan_id === null && tenant.plan_name ? `Katalog paketi yok; eski plan korunur: ${tenant.plan_name}`
    : 'Katalog paketi kaldırılacak; uygulanacak eski plan bilinmiyor';
  const previousStatus = noSubscription ? 'Abonelik yok' : tenant.subscription_status ?? 'Bilinmiyor';
  const previousBonus = tenant.bonus_quote_limit ?? 'Bilinmiyor';
  return [
    `Firma: ${tenant.name || 'Bilinmiyor'}`,
    `Paket: ${previousPlan} → ${nextPlan}`,
    `Abonelik durumu: ${previousStatus} → ${next.status}`,
    `Ek teklif kotası (toplam): ${previousBonus} → ${next.bonusQuoteLimit}`,
    ...(noSubscription ? ['Yeni abonelik oluşturulacak.'] : []),
    '',
    PREVIEW_STALE_NOTICE,
    'Bu önizleme eşzamanlı değişiklikleri engellemez. Değişiklikler kaydedilsin mi?',
  ].join('\n');
}
