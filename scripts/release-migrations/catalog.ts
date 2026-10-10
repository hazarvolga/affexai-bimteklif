import { createHash } from 'node:crypto';
import type pg from 'pg';

export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

export async function catalog(client: pg.Client) {
  const queries = {
    columns: `select c.relname, a.attname, format_type(a.atttypid,a.atttypmod) as type,
      a.attnotnull, a.attidentity, a.attgenerated, pg_get_expr(d.adbin,d.adrelid) as default_value
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      join pg_attribute a on a.attrelid=c.oid left join pg_attrdef d on d.adrelid=c.oid and d.adnum=a.attnum
      where n.nspname='public' and c.relkind in ('r','p','v','m') and a.attnum>0 and not a.attisdropped order by c.relname,a.attname`,
    relations: `select c.relname,c.relkind,c.relrowsecurity,c.relforcerowsecurity,c.relpersistence
      from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' order by c.relname`,
    constraints: `select c.relname,k.conname,k.contype,k.convalidated,k.condeferrable,k.condeferred,pg_get_constraintdef(k.oid) as definition
      from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' order by c.relname,k.conname`,
    indexes: `select tablename,indexname,indexdef from pg_indexes where schemaname='public' order by tablename,indexname`,
    enums: `select t.typname,e.enumlabel,e.enumsortorder from pg_type t join pg_namespace n on n.oid=t.typnamespace
      join pg_enum e on e.enumtypid=t.oid where n.nspname='public' order by t.typname,e.enumsortorder`,
    sequences: `select sequencename,data_type,start_value,min_value,max_value,increment_by,cycle,cache_size
      from pg_sequences where schemaname='public' order by sequencename`,
    triggers: `select c.relname,t.tgname,pg_get_triggerdef(t.oid) as definition from pg_trigger t
      join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and not t.tgisinternal order by c.relname,t.tgname`,
    policies: `select tablename,policyname,permissive,roles,cmd,qual,with_check from pg_policies where schemaname='public' order by tablename,policyname`,
    views: `select viewname,definition from pg_views where schemaname='public' order by viewname`,
    functions: `select p.proname,pg_get_function_identity_arguments(p.oid) as arguments,pg_get_functiondef(p.oid) as definition
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind in ('f','p') order by p.proname,arguments`,
    extensions: 'select extname,extversion from pg_extension order by extname',
  };
  const result: Record<string, unknown[]> = {};
  for (const [key, query] of Object.entries(queries)) result[key] = (await client.query(query)).rows;
  return { signature: sha256(JSON.stringify(result)), objects: result };
}
