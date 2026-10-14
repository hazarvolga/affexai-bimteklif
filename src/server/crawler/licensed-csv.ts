import { createHash } from 'node:crypto';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value);
const request = z.object({ csv:z.string().min(1).max(512_000),fileName:z.string().trim().min(1).max(200),
 licenseConfirmed:z.literal(true),licenseReference:z.string().trim().min(5).max(1000), validityStart:date,validityEnd:date,
 autoApprove:z.boolean().optional(),
}).refine(value=>value.validityStart<=value.validityEnd,'Geçerlilik aralığı hatalı');
const text=z.string().trim().min(1).max(300).refine(value=>!/[\u0000-\u001f]/.test(value));
const unitText=z.string().trim().min(1).max(30).refine(value=>!/[\u0000-\u001f]/.test(value));
const row=z.object({itemCode:text,itemName:text,unit:unitText,price:z.string().regex(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/).refine(value=>Number(value)>0)}).strict();
export function parseLicensedPriceCsv(input:unknown) {
 const data=request.parse(input);
 if(Buffer.byteLength(data.csv,'utf8')>512_000)throw new Error('CSV en fazla 500 KB olabilir');
 const raw=parse(data.csv,{columns:true,bom:true,skip_empty_lines:true,max_record_size:4096,trim:true}) as unknown[];
 if(raw.length===0||raw.length>500)throw new Error('CSV 1–500 satır içermeli');
 const rows=raw.map(value=>row.parse(value));
 if(new Set(rows.map(value=>value.itemCode)).size!==rows.length)throw new Error('Poz kodları benzersiz olmalı');
 const documentHash=createHash('sha256').update(data.csv,'utf8').digest('hex');
 const versionHash=createHash('sha256').update(JSON.stringify({documentHash,licenseReference:data.licenseReference,validityStart:data.validityStart,validityEnd:data.validityEnd})).digest('hex');
 return {...data,rows,documentHash,versionHash};
}
