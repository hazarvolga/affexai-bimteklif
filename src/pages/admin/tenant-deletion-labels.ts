const BLOCKER_LABELS: Readonly<Record<string, string>> = {
  documents: 'SmartCheck belgeleri',
  document_processing_runs: 'Belge işleme kayıtları',
  document_processing_artifacts: 'Belge işleme çıktıları',
  normalized_quantity_rows: 'Metraj kanıt satırları',
  smartcheck_audit_logs: 'SmartCheck denetim kayıtları',
  quotation_transfer_ledgers: 'Teklif aktarım kayıtları',
  construction_contracts: 'Hakediş sözleşmeleri',
  progress_payment_periods: 'Hakediş dönemleri',
  cde_projects: 'CDE projeleri',
  academy_enrollments: 'Academy kayıtları',
  academy_payment_events: 'Academy ödemeleri',
  pilot_applications: 'Pilot başvuruları',
  allplan_certificates: 'Sertifikalar',
};

export function blockerLabel(table: string): string {
  return BLOCKER_LABELS[table] ?? table;
}
