export function isAutomaticPricingSource(status: unknown): status is 'active' {
  return status === 'active';
}
