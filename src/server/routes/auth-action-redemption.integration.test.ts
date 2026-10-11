import assert from 'node:assert/strict';
import test from 'node:test';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import express from 'express';
import { useTestIsolation } from './test-isolation';
dotenv.config({path:'.env.local'});
useTestIsolation();

test('reset claims token atomically while email delivery is disabled; verification is idempotent', async () => {
  const [{db}, {users,authActionTokens}, {registerAuthRoutes}, {eq}, {AuthService}] = await Promise.all([
    import('../../db'),import('../../db/schema'),import('./auth'),import('drizzle-orm'),import('../../services/auth/authService')]);
  const oldMode=process.env.AUTH_EMAIL_DELIVERY_MODE;
  process.env.AUTH_EMAIL_DELIVERY_MODE='disabled';
  const app=express(); app.use(express.json()); registerAuthRoutes(app);
  const server=app.listen(0,'127.0.0.1');
  await new Promise<void>(resolve=>server.once('listening',resolve));
  const address=server.address(); assert.ok(address && typeof address!=='string');
  const base=`http://127.0.0.1:${address.port}`;
  const [user]=await db.insert(users).values({email:'redeem@example.test',fullName:'Reset Tester'}).returning();
  const token=()=>crypto.randomBytes(32).toString('base64url');
  const hash=(raw:string)=>crypto.createHash('sha256').update(raw).digest('hex');
  const create=async(type:string,raw:string,expired=false)=>db.insert(authActionTokens).values({userId:user.id,type,tokenHash:hash(raw),expiresAt:new Date(Date.now()+(expired?-1000:60000))});
  const reset=(raw:string,password:string)=>fetch(`${base}/api/auth/reset-password`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token:raw,password})});
  try {
    const raw=token();await create('reset_password',raw);
    const passwords=Array.from({length:8},(_,i)=>`UserChosenPassword-${i}`);
    const responses=await Promise.all(passwords.map(password=>reset(raw,password)));
    assert.equal(responses.filter(r=>r.status===200).length,1,'only one concurrent request can redeem token');
    assert.equal(responses.filter(r=>r.status===400).length,7);
    const [updated]=await db.select().from(users).where(eq(users.id,user.id));
    assert.equal(await AuthService.comparePassword(passwords[responses.findIndex(r=>r.status===200)],updated.passwordHash!),true);
    assert.equal((await reset(raw,'DifferentPassword')).status,400);
    const expired=token();await create('reset_password',expired,true);
    assert.equal((await reset(expired,'DifferentPassword')).status,400);
    const verification=token();await create('verify_email',verification);
    assert.equal((await reset(verification,'DifferentPassword')).status,400);
    const verified=await Promise.all(Array.from({length:6},()=>fetch(`${base}/api/auth/verify-email/${verification}`)));
    assert.equal(verified.every(r=>r.status===200),true);
    const [before]=await db.select().from(users).where(eq(users.id,user.id));
    assert.ok(before.emailVerified);
    assert.equal((await fetch(`${base}/api/auth/verify-email/${verification}`)).status,200);
    const [after]=await db.select().from(users).where(eq(users.id,user.id));
    assert.equal(after.emailVerified?.getTime(),before.emailVerified?.getTime());
  } finally {
    if(oldMode===undefined)delete process.env.AUTH_EMAIL_DELIVERY_MODE;else process.env.AUTH_EMAIL_DELIVERY_MODE=oldMode;
    await new Promise<void>(resolve=>{server.close(()=>resolve());server.closeAllConnections()});
  }
});
