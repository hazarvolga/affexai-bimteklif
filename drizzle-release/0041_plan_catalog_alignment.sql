UPDATE public.plans AS p SET
  monthly_ai_limit = COALESCE(p.monthly_ai_limit, c.ai),
  monthly_pdf_limit = COALESCE(p.monthly_pdf_limit, c.pdf),
  monthly_crm_limit = COALESCE(p.monthly_crm_limit, c.crm),
  monthly_regulation_limit = COALESCE(p.monthly_regulation_limit, c.regulation),
  monthly_profit_analysis_limit = COALESCE(p.monthly_profit_analysis_limit, c.profit),
  storage_max_bytes = COALESCE(p.storage_max_bytes, c.storage),
  max_documents = COALESCE(p.max_documents, c.documents)
FROM (VALUES
  ('2b507e20-83d1-4b21-9fc1-000000000001'::uuid, '14 Günlük Ücretsiz Deneme', 5, 3, 15, 5, 5, 268435456::bigint, 25),
  ('2b507e20-83d1-4b21-9fc1-000000000002'::uuid, 'e-PYS & BIM Standart Denetçi', 10, 8, 25, 15, 5, 1073741824::bigint, 150),
  ('2b507e20-83d1-4b21-9fc1-000000000003'::uuid, 'Teklif & Şantiye', 25, 15, 150, 30, 25, 2147483648::bigint, 300),
  ('2b507e20-83d1-4b21-9fc1-000000000004'::uuid, '5D BIM & SmartCheck', 60, 35, 500, 100, 75, 5368709120::bigint, 750),
  ('2b507e20-83d1-4b21-9fc1-000000000005'::uuid, 'Kurumsal Taahhüt & e-PYS', 150, 75, 1500, 250, 200, 16106127360::bigint, 2000)
) AS c(id, name, ai, pdf, crm, regulation, profit, storage, documents)
WHERE p.id = c.id OR p.name = c.name;
--> statement-breakpoint
UPDATE public.plans SET ifc_max_concurrent = 1 WHERE ifc_max_concurrent > 1 AND (id = '2b507e20-83d1-4b21-9fc1-000000000005' OR name = 'Kurumsal Taahhüt & e-PYS');
--> statement-breakpoint
UPDATE public.plans SET marketing_description = 'Yüksek teklif ve IFC kapasitesi için.' WHERE marketing_description = 'Ekip yönetimi, yüksek kapasite ve öncelikli işleme için.' AND (id = '2b507e20-83d1-4b21-9fc1-000000000005' OR name = 'Kurumsal Taahhüt & e-PYS');
