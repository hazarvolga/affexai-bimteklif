import type { Express } from 'express';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { adminAuditLogs, priceFeedStaging, pricingDataSources } from '../../db/schema';
import { authenticate, checkSuperAdmin, requireVerifiedEmail } from '../middleware/auth';
import { consumeRateLimit } from '../auth/security';
import { parseLicensedPriceCsv } from '../crawler/licensed-csv';

export function registerPricingFileImportRoutes(app: Express) {
 app.post('/api/admin/pricing-sources/:id/import-csv',authenticate,checkSuperAdmin(),requireVerifiedEmail,async(req,res)=>{
  if(!z.string().uuid().safeParse(req.params.id).success)return res.status(400).json({error:'Kaynak kimliği geçersiz.'});
  let parsed:ReturnType<typeof parseLicensedPriceCsv>;
  try {parsed=parseLicensedPriceCsv(req.body);} catch {return res.status(400).json({error:'CSV, kullanım izni ve geçerlilik alanlarını kontrol edin. En fazla 500 KB / 500 satır; başlıklar: itemCode,itemName,unit,price. Fiyat ondalığı nokta olmalı.'});}
  try {
   const limit=await consumeRateLimit(`pricing-file:${req.user.userId}`,10,60_000);
   if(!limit.allowed)return res.status(429).json({error:'Dosya içe aktarma limiti doldu.'});
   const result=await db.transaction(async tx=>{
    const [parent]=await tx.select().from(pricingDataSources).where(eq(pricingDataSources.id,req.params.id)).for('share');
    if(!parent)return null;
    // Every file/version gets its own source: older approvals retain their dates/hash.
    const code=`csv:${parent.id}:${parsed.versionHash}`;
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${code},0))`);
    const [existing]=await tx.select().from(pricingDataSources).where(eq(pricingDataSources.code,code));
    if(existing)return {sourceId:existing.id,insertedCount:0,reused:true};
    const metadata={kind:'licensed-csv-v1',parentSourceId:parent.id,documentHash:parsed.documentHash,fileName:parsed.fileName,
     licenseReference:parsed.licenseReference,licenseConfirmedBy:req.user.userId,importedAt:new Date().toISOString()};
    const [source]=await tx.insert(pricingDataSources).values({code,name:`${parent.name} — ${parsed.fileName}`,category:'market_commodity',
     authority:parent.authority,sourceUrl:parent.sourceUrl,countryCode:parent.countryCode,currency:'TRY',status:'active',syncFrequency:'annually',
     itemCount:parsed.rows.length,validityStart:new Date(parsed.validityStart),validityEnd:new Date(`${parsed.validityEnd}T23:59:59.999Z`),
     versionTag:`csv:${parsed.versionHash}`,dataHash:parsed.documentHash,crawlerConfig:metadata,lastSyncAt:new Date(),
    }).returning();
    await tx.insert(priceFeedStaging).values(parsed.rows.map((row,index)=>({sourceId:source.id,itemCode:row.itemCode,itemName:row.itemName,
     unit:row.unit,crawledPrice:row.price,status:'pending',confidenceScore:'0',sourceUrl:parent.sourceUrl,
     notes:'[licensed-csv-v1] '+JSON.stringify({...metadata,row:index+2}),
    })));
    await tx.insert(adminAuditLogs).values({adminId:req.user.userId,action:'pricing_csv_imported',details:{...metadata,sourceId:source.id,rowCount:parsed.rows.length}});
    return {sourceId:source.id,insertedCount:parsed.rows.length,reused:false};
   });
   if(!result)return res.status(404).json({error:'Kaynak bulunamadı.'});
   return res.status(result.reused?200:201).json(result);
  } catch {return res.status(503).json({error:'Dosya içe aktarılamadı. Kayıtlar kısmen kaydedilmedi; tekrar deneyin.'});}
 });
}
