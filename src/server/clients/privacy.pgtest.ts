import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import test from 'node:test';
import pg from 'pg';

test('privacy controls isolate companies, preserve financial history and block new identity writes', { timeout: 120_000 }, async () => {
  const raw = process.env.CLIENT_PRIVACY_TEST_URL;
  assert.ok(raw && process.env.NODE_ENV === 'test' && process.env.CI_DISPOSABLE_DATABASE === 'true');
  const url = new URL(raw);
  assert.ok(['localhost', '127.0.0.1'].includes(url.hostname) && url.pathname === '/teklifpro_bootstrap_test' && url.username && url.password && !url.search && !url.hash);
  const db = new pg.Client({ connectionString: raw }); await db.connect();
  const identity = await db.query<{ system_identifier: string; superuser: boolean }>("SELECT system_identifier::text, (SELECT rolsuper FROM pg_roles WHERE rolname=current_user) superuser FROM pg_control_system()");
  assert.equal(identity.rows[0].superuser, true);
  const { makeWorkerUtils, Logger } = await import('graphile-worker');
  const worker = await makeWorkerUtils({ connectionString: raw, schema: 'teklifpro_queue', logger: new Logger(() => () => {}) }); await worker.release();
  const creds = Object.fromEntries(['bimmetraj_migrator','bimmetraj_app','bimmetraj_control','bimmetraj_worker','bimmetraj_backup'].map(role => [role, randomBytes(32).toString('hex')])) as Record<'bimmetraj_migrator'|'bimmetraj_app'|'bimmetraj_control'|'bimmetraj_worker'|'bimmetraj_backup',string>;
  const { provisionDatabaseRoles } = await import('../../../scripts/database-roles/provision');
  await provisionDatabaseRoles(db, creds, { expectedDatabase: 'teklifpro_bootstrap_test', expectedSystemIdentifier: identity.rows[0].system_identifier, requiredMarkerRegclass: 'teklifpro_release.migrations' }, decodeURIComponent(url.password));
  const appUrl = new URL(url); appUrl.username = 'bimmetraj_app'; appUrl.password = creds.bimmetraj_app;
  const controlUrl = new URL(url); controlUrl.username = 'bimmetraj_control'; controlUrl.password = creds.bimmetraj_control;
  process.env.DATABASE_URL = appUrl.toString(); process.env.CONTROL_DATABASE_URL = controlUrl.toString();
  const { AuthService } = await import('../../services/auth/authService');
  const { createApiApp } = await import('../app');
  const { pool } = await import('../../db'); const { closeControlDatabase } = await import('../../db/control-plane');
  const a=randomUUID(),b=randomUUID(),owner=randomUUID(),foreign=randomUUID(),viewer=randomUUID(),unverified=randomUUID(),admin=randomUUID(),client=randomUUID(),other=randomUUID(),quote=randomUUID();
  await db.query("INSERT INTO companies(id,name) VALUES($1,'A'),($2,'B')",[a,b]);
  await db.query("INSERT INTO users(id,email,full_name,email_verified) VALUES ($1,$2,'A',now()),($3,$4,'B',now()),($5,$6,'Viewer',now())",[owner,`${owner}@example.test`,foreign,`${foreign}@example.test`,viewer,`${viewer}@example.test`]);
  await db.query("INSERT INTO memberships(user_id,company_id,role) VALUES ($1,$2,'owner'),($3,$4,'owner'),($5,$2,'viewer')",[owner,a,foreign,b,viewer]);
  await db.query("INSERT INTO users(id,email,full_name,email_verified,is_super_admin) VALUES ($1,$2,'Unverified',NULL,false),($3,$4,'Admin',now(),true)",[unverified,`${unverified}@example.test`,admin,`${admin}@example.test`]);
  await db.query("INSERT INTO memberships(user_id,company_id,role) VALUES ($1,$2,'owner')",[unverified,a]);
  await db.query("INSERT INTO subscriptions(company_id,plan,status) VALUES($1,'starter','active'),($2,'starter','active')",[a,b]);
  await db.query("INSERT INTO clients(id,company_id,name,type,phone,email,address,notes) VALUES($1,$2,'PERSON SECRET','person','SECRET PHONE','secret@example.test','SECRET ADDRESS','SECRET NOTE'),($3,$4,'OTHER','company',NULL,NULL,NULL,NULL)",[client,a,other,b]);
  await db.query("INSERT INTO quotations(id,company_id,client_id,quote_number,project_name,expiry_date,subtotal,discount_total,vat_total,grand_total) VALUES ($1,$2,$3,'PRIV-1','project',now()+interval '30 days',100,0,20,120)",[quote,a,client]);
  const token = (userId:string, companyId:string, role:string) => AuthService.generateToken({ userId, companyId, role });
  const ta=token(owner,a,'owner'),tb=token(foreign,b,'owner'),tv=token(viewer,a,'viewer'),tu=token(unverified,a,'owner');
  const impersonation=AuthService.generateImpersonationToken({ userId:owner,companyId:a,impersonatedBy:admin,readOnly:false });
  const app = createApiApp(); const server=app.listen(0,'127.0.0.1'); await new Promise<void>(r=>server.once('listening',r));
  const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
  const path=`/api/clients/${client}/privacy`;
  const request=(path:string,token:string,method='GET',body?:unknown)=>fetch(base+path,{method,headers:{authorization:`Bearer ${token}`,...(body===undefined?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  try {
    assert.equal((await fetch(base+path,{method:'POST',headers:{cookie:`bm_session=${ta}`,'content-type':'application/json',origin:'https://attacker.example'},body:JSON.stringify({action:'request'})})).status,403);
    assert.equal((await request(path,tb,'POST',{action:'request'})).status,404);
    assert.equal((await request(path,tv,'POST',{action:'request'})).status,403);
    assert.equal((await request(path,tu,'POST',{action:'request'})).status,403);
    assert.equal((await request(path,impersonation,'POST',{action:'request'})).status,403);
    assert.equal((await request(path,ta,'POST',{action:'mask'})).status,409);
    assert.equal((await request(path,ta,'POST',{action:'request'})).status,200);
    assert.equal((await request(path,ta,'POST',{action:'hold'})).status,200);
    assert.equal((await request(path,ta,'POST',{action:'mask'})).status,409);
    assert.equal((await request(path,ta,'POST',{action:'release'})).status,200);
    // Failure of the audit insert must roll back the masking itself.
    await db.query('REVOKE INSERT ON smartcheck_audit_logs FROM bimmetraj_app');
    try {
      assert.equal((await request(path,ta,'POST',{action:'mask'})).status,500);
      const rolledBack=(await db.query('SELECT name,privacy_status FROM clients WHERE id=$1',[client])).rows[0];
      assert.equal(rolledBack.name,'PERSON SECRET'); assert.equal(rolledBack.privacy_status,'requested');
    } finally { await db.query('GRANT INSERT ON smartcheck_audit_logs TO bimmetraj_app'); }
    await db.query("UPDATE subscriptions SET status='past_due' WHERE company_id=$1",[a]);
    assert.equal((await request(`/api/clients/${client}`,ta)).status,200,'suspended owner can load client detail');
    assert.equal((await request(path,ta)).status,200,'suspended owner can load privacy status');
    assert.equal((await request(`/api/clients/${client}/deletion-impact`,ta)).status,200,'suspended owner can view impact');
    assert.equal((await request(path,tb)).status,404,'suspension does not weaken tenant isolation');
    assert.equal((await request(path,tv)).status,403,'suspension does not grant viewer permission');
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      const { createServer }=await import('vite');
      const { default: puppeteer }=await import('puppeteer');
      const vite=await createServer({ server: { port:0, host:'127.0.0.1', hmr:false, proxy:{ '/api': {target:base} } }, appType:'spa' });
      let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
      try {
        await vite.listen(); const address=vite.httpServer!.address(); assert.ok(address && typeof address==='object');
        const frontend=`http://127.0.0.1:${address.port}`;
        browser=await puppeteer.launch({ headless:true, executablePath:process.env.PUPPETEER_EXECUTABLE_PATH, args:['--no-sandbox'] });
        const page=await browser.newPage(); await page.setViewport({width:390,height:844});
        await page.setCookie({name:'bm_session',value:ta,url:frontend});
        await page.evaluateOnNewDocument(()=>localStorage.setItem('bm_authed','1'));
        await page.goto(`${frontend}/app/clients/${client}`,{waitUntil:'networkidle0'});
        await page.waitForSelector('[data-testid="client-privacy-control"]',{timeout:15_000});
        await page.waitForFunction(()=>document.querySelector('[data-testid="client-privacy-control"]')?.textContent?.includes('İnceleme bekliyor'));
        page.on('dialog', dialog=>void dialog.accept());
        const button=await page.waitForSelector('button ::-p-text(Kimlik alanlarını maskele)'); assert.ok(button); await button.click();
        await page.waitForFunction(()=>document.querySelector('[data-testid="client-privacy-control"]')?.textContent?.includes('Kimlik alanları maskelendi'));
      } finally { await browser?.close(); await vite.close(); }
    }
    assert.equal((await request(path,ta,'POST',{action:'mask'})).status,200, 'suspended owner can exercise privacy request');
    assert.equal((await request(path,ta,'POST',{action:'mask'})).status,200, 'mask is idempotent');
    assert.equal((await request(`/api/clients/${client}`,ta,'PATCH',{name:'SECRET AGAIN'})).status,403, 'subscription guard still protects ordinary writes');
    await db.query("UPDATE subscriptions SET status='active' WHERE company_id=$1",[a]);
    assert.equal((await request(`/api/clients/${client}`,ta,'PATCH',{name:'SECRET AGAIN'})).status,409);
    assert.equal((await request(`/api/clients/${client}/notes`,ta,'POST',{stage:'lead',content:'SECRET AGAIN'})).status,409);
    assert.equal((await request('/api/crm/deals',ta,'POST',{clientId:client,name:'new',value:1,stage:'lead'})).status,404);
    assert.equal((await request('/api/quotations',ta,'POST',{clientId:client,quoteNumber:'NEW-MASKED',projectName:'New',date:'2026-01-01',expiryDate:'2027-01-01',items:[{description:'Concrete',unit:'m3',quantity:1,unitPrice:100}]})).status,400);
    // SmartCheck cannot bind a newly created quotation to a masked client.
    const doc=randomUUID(),run=randomUUID(),rowId=randomUUID();
    await db.query('UPDATE companies SET is_smartcheck_enabled=true WHERE id=$1',[a]);
    await db.query("INSERT INTO documents(id,company_id,uploaded_by_user_id,original_file_name,display_name,mime_type,file_size_bytes,storage_key,checksum_sha256) VALUES($1,$2,$3,'privacy.ifc','Privacy','application/x-step',1024,$4,repeat('a',64))",[doc,a,owner,`${a}/privacy-${doc}.ifc`]);
    await db.query("INSERT INTO document_processing_runs(id,company_id,document_id,status,current_stage,idempotency_key,pipeline_version,provider,model,progress_percent,completed_at) VALUES($1,$2,$3,'succeeded','completed',$4,5,'ifcopenshell','0.8.5',100,now())",[run,a,doc,`privacy-${run}`]);
    await db.query("INSERT INTO normalized_quantity_rows(id,company_id,document_id,processing_run_id,sheet_name,source_row_number,source_cell_range,normalized_description,normalized_position_code,normalized_unit,normalized_quantity,raw_description,raw_position_code,raw_unit,raw_quantity,formula_json,quantity_source,review_status,reviewer_user_id,reviewed_at) VALUES($1,$2,$3,$4,'IFC',1,'IfcSlab#1','Concrete','15.150.1006','m³',1,'Concrete','15.150.1006','m3',1,$5::jsonb,'ifc_qto','approved',$6,now())",[rowId,a,doc,run,JSON.stringify({quantitySourcePath:'#1/Qto_SlabBaseQuantities/NetVolume'}),owner]);
    const transfer=await request(`/api/smartcheck/documents/${doc}/transfer-to-new-quotation`,ta,'POST',{clientId:client,projectName:'No masked customer',rowIds:[rowId]});
    assert.equal(transfer.status,404,await transfer.clone().text());
    assert.equal((await request(`/api/quotations/${quote}`,ta)).status,200);
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      const pdf=await request(`/api/quotations/${quote}/pdf`,ta); assert.equal(pdf.status,200,await pdf.clone().text());
      assert.ok((await pdf.arrayBuffer()).byteLength>1000, 'historical quote still renders PDF');
    }
    assert.equal((await request(`/api/quotations/${quote}/revision`,ta,'POST',{})).status,200, 'existing quotation revision remains available');
    const otherA=randomUUID(),draft=randomUUID();
    await db.query("INSERT INTO clients(id,company_id,name,type) VALUES ($1,$2,'Other A','company')",[otherA,a]);
    await db.query("INSERT INTO quotations(id,company_id,client_id,quote_number,project_name,expiry_date,subtotal,discount_total,vat_total,grand_total) VALUES($1,$2,$3,'PRIV-OTHER','Other',now()+interval '30 days',100,0,20,120)",[draft,a,otherA]);
    const editable=await request(`/api/quotations/${draft}/edit`,ta); assert.equal(editable.status,200);
    const editVersion=(await editable.json() as {updatedAt:string}).updatedAt;
    const editInput={clientId:client,quoteNumber:'PRIV-OTHER',projectName:'Other',date:'2026-01-01',expiryDate:'2027-01-01',updatedAt:editVersion,items:[{description:'x',unit:'adet',quantity:1,unitPrice:1}]};
    assert.equal((await request(`/api/quotations/${draft}/edit`,ta,'PATCH',editInput)).status,400,'new masked customer binding must be rejected');
    assert.equal((await db.query('SELECT client_id FROM quotations WHERE id=$1',[draft])).rows[0].client_id,otherA);
    // A membership demotion raced with masking is rechecked while holding the membership lock.
    const raceUser=randomUUID(),roleClient=randomUUID();
    await db.query("INSERT INTO users(id,email,full_name,email_verified) VALUES($1,$2,'Race user',now())",[raceUser,`${raceUser}@example.test`]);
    await db.query("INSERT INTO memberships(user_id,company_id,role) VALUES($1,$2,'admin')",[raceUser,a]);
    await db.query("INSERT INTO clients(id,company_id,name,type,privacy_status) VALUES($1,$2,'Role race','company','requested')",[roleClient,a]);
    const roleLocker=new pg.Client({connectionString:raw}); await roleLocker.connect();
    try {
      await roleLocker.query('BEGIN'); await roleLocker.query("UPDATE memberships SET role='viewer' WHERE user_id=$1 AND company_id=$2",[raceUser,a]);
      const action=request(`/api/clients/${roleClient}/privacy`,token(raceUser,a,'admin'),'POST',{action:'mask'});
      let waiting=false;
      for(let i=0;i<60;i++) { const pending=await db.query("SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%bimmetraj_lock_price_reviewer%'"); if(pending.rowCount) {waiting=true;break;} await new Promise(resolve=>setTimeout(resolve,50)); }
      assert.ok(waiting,'reviewer lock must wait for concurrent role change');
      await roleLocker.query('COMMIT');
      assert.equal((await action).status,403);
      assert.equal((await db.query('SELECT privacy_status FROM clients WHERE id=$1',[roleClient])).rows[0].privacy_status,'requested');
    } finally { await roleLocker.end(); }

    const row=(await db.query('SELECT name,phone,email,address,notes,privacy_status,privacy_masked_at FROM clients WHERE id=$1',[client])).rows[0];
    assert.deepEqual({name:row.name,phone:row.phone,email:row.email,address:row.address,notes:row.notes,status:row.privacy_status}, {name:'Maskelenmiş müşteri',phone:null,email:null,address:null,notes:null,status:'masked'}); assert.ok(row.privacy_masked_at);
    assert.deepEqual((await db.query('SELECT client_id,subtotal::text,grand_total::text FROM quotations WHERE id=$1',[quote])).rows[0],{client_id:client,subtotal:'100.00',grand_total:'120.00'});
    // Bulk import reads the pre-mask name while a concurrent mask holds the row lock.
    // Its conditional UPDATE must recheck the post-commit status and count a skip.
    const raceClient = randomUUID();
    await db.query("INSERT INTO clients(id,company_id,name,type) VALUES ($1,$2,'RACE CLIENT','company')",[raceClient,a]);
    const locker = new pg.Client({ connectionString: appUrl.toString() }); await locker.connect();
    try {
      await locker.query('BEGIN');
      await locker.query("SELECT set_config('bimmetraj.company_id',$1,true), set_config('bimmetraj.user_id',$2,true)",[a,owner]);
      await locker.query("UPDATE clients SET name='Maskelenmiş müşteri', privacy_status='masked', privacy_masked_at=now() WHERE id=$1",[raceClient]);
      const bulk = request('/api/clients/bulk-import',ta,'POST',{clients:[{name:'RACE CLIENT',type:'company',notes:'RETURNED PRIVATE DATA'}],duplicateStrategy:'update'});
      let waiting=false;
      for (let i=0;i<60;i++) {
        const pending=await db.query("SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%update%clients%'");
        if (pending.rowCount) { waiting=true; break; }
        await new Promise(resolve=>setTimeout(resolve,50));
      }
      assert.ok(waiting,'bulk update must wait on the masking transaction');
      await locker.query('COMMIT');
      const result=await bulk; assert.equal(result.status,200,await result.clone().text());
      const summary=await result.json() as {updatedCount:number;skippedCount:number};
      assert.equal(summary.updatedCount,0); assert.equal(summary.skippedCount,1);
      assert.equal((await db.query('SELECT notes FROM clients WHERE id=$1',[raceClient])).rows[0].notes,null);
    } finally { await locker.end(); }
    const audit=(await db.query("SELECT metadata_json FROM smartcheck_audit_logs WHERE company_id=$1 AND entity_id=$2 AND action LIKE 'client.privacy_%'",[a,client])).rows;
    assert.equal(audit.length,4); assert.ok(!JSON.stringify(audit).includes('SECRET'));
  } finally { await new Promise<void>(r=>server.close(()=>r())); await pool.end(); await closeControlDatabase(); await db.end(); }
});
