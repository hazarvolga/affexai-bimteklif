import assert from 'node:assert/strict';
import test from 'node:test';
import { deliverTransactionalEmail, type SmtpFactory } from './email-delivery';
import { validateAuthEmailEnvironment } from './email-policy';
const email = 'recipient@example.test';
const env = { NODE_ENV: 'production', AUTH_EMAIL_DELIVERY_MODE: 'smtp', AUTH_EMAIL_SMTP_HOST: 'mail.bimmetraj.com', AUTH_EMAIL_SMTP_PORT: '465', AUTH_EMAIL_SMTP_USER: 'noreply@bimmetraj.com', AUTH_EMAIL_SMTP_PASSWORD: 'test-smtp-credential', AUTH_EMAIL_FROM: 'noreply@bimmetraj.com' };

test('SMTP requires authenticated TLS configuration, rejects malformed host/header/ports', () => {
  assert.deepEqual(validateAuthEmailEnvironment(env), []);
  assert.deepEqual(validateAuthEmailEnvironment({ ...env, AUTH_EMAIL_SMTP_PORT: '587' }), []);
  for (const key of ['AUTH_EMAIL_SMTP_HOST','AUTH_EMAIL_SMTP_PORT','AUTH_EMAIL_SMTP_USER','AUTH_EMAIL_SMTP_PASSWORD','AUTH_EMAIL_FROM']) assert.ok(validateAuthEmailEnvironment({ ...env, [key]: '' }).length);
  for (const port of ['25','0','587bad','465.0']) assert.ok(validateAuthEmailEnvironment({ ...env, AUTH_EMAIL_SMTP_PORT: port }).length);
  for (const host of ['https://mail.test','mail.test/path','mail\r\n.test','']) assert.ok(validateAuthEmailEnvironment({ ...env, AUTH_EMAIL_SMTP_HOST: host }).length);
  assert.ok(validateAuthEmailEnvironment({ ...env, AUTH_EMAIL_FROM: 'bad\r\nBcc: a@b.test' }).length);
  assert.ok(validateAuthEmailEnvironment({ AUTH_EMAIL_DELIVERY_MODE: 'smtp', NODE_ENV: 'test' }).length);
});

test('SMTP templates are escaped; both TLS modes authenticated and connections always closed', async () => {
  for (const port of ['465','587']) for (const template of ['verify_email','reset_password','invitation'] as const) {
    const url = 'https://bimmetraj.com/path?token=a&quote="<unsafe>';
    let calls = 0, closed = 0;
    const factory: SmtpFactory = options => {
      assert.equal(options.port, Number(port)); assert.equal(options.secure, port === '465');
      assert.equal(options.requireTLS, port === '587'); assert.equal(options.tls?.rejectUnauthorized, true);
      assert.equal(options.auth?.user, env.AUTH_EMAIL_SMTP_USER); assert.equal(options.auth?.pass, env.AUTH_EMAIL_SMTP_PASSWORD);
      assert.equal(options.socketTimeout, 5000); assert.equal(options.connectionTimeout, 5000); assert.equal(options.dnsTimeout, 5000);
      assert.equal(options.logger, false); assert.equal(options.debug, false);
      assert.equal(options.disableFileAccess, true); assert.equal(options.disableUrlAccess, true);
      return { close: () => { closed++; }, sendMail: async payload => {
        calls++; assert.equal(payload.to, email); assert.equal(payload.from, env.AUTH_EMAIL_FROM);
        assert.ok(payload.text.includes(url)); assert.ok(payload.html.includes('&amp;quote=&quot;&lt;unsafe&gt;'));
        assert.ok(!payload.html.includes('<unsafe>')); return { accepted: [email], rejected: [] };
      } };
    };
    assert.deepEqual(await deliverTransactionalEmail(template,email,url,{...env,AUTH_EMAIL_SMTP_PORT:port},fetch,factory),{status:'accepted'});
    assert.equal(calls,1); assert.equal(closed,1);
  }
});

test('SMTP rejection and errors expose no credentials, do not retry and close resources', async () => {
  for (const result of [{ accepted: [], rejected: [email] }, { accepted: ['other@domain.test'], rejected: [] }, new Error(env.AUTH_EMAIL_SMTP_PASSWORD)]) {
    let calls=0,closed=0;
    const factory: SmtpFactory = () => ({ close:()=>{closed++;},sendMail:async()=>{calls++;if(result instanceof Error)throw result;return result;} });
    await assert.rejects(deliverTransactionalEmail('verify_email',email,'https://bimmetraj.com/token',env,fetch,factory), error => {
      assert.equal((error as any).code,'EMAIL_DELIVERY_UNAVAILABLE');assert.ok(!String(error).includes(env.AUTH_EMAIL_SMTP_PASSWORD));return true;
    });
    assert.equal(calls,1);assert.equal(closed,1);
  }
});

test('SMTP total deadline closes a stalled send', async t => {
  t.mock.timers.enable({apis:['setTimeout']});
  let closed=0;
  const factory: SmtpFactory=()=>({close:()=>{closed++;},sendMail:()=>new Promise(()=>{})});
  const pending=deliverTransactionalEmail('reset_password',email,'https://bimmetraj.com/token',env,fetch,factory);
  const rejected=assert.rejects(pending,{code:'EMAIL_DELIVERY_UNAVAILABLE'});
  t.mock.timers.tick(5000);await rejected;assert.equal(closed,1);
});

test('development/webhook remain supported; disabled never calls transport', async () => {
  assert.deepEqual(await deliverTransactionalEmail('invitation',email,'dev-url',{NODE_ENV:'test'}),{status:'development',url:'dev-url'});
  let calls=0;
  const transport:typeof fetch=async(_input,init)=>{calls++;assert.equal(init?.redirect,'error');assert.deepEqual(JSON.parse(init?.body as string),{template:'invitation',email,url:'https://bimmetraj.com/token'});return new Response('',{status:202});};
  assert.deepEqual(await deliverTransactionalEmail('invitation',email,'https://bimmetraj.com/token',{NODE_ENV:'production',AUTH_EMAIL_WEBHOOK_URL:'https://provider.example.test/hook',AUTH_EMAIL_WEBHOOK_SECRET:'w'.repeat(48)},transport),{status:'accepted'});
  await assert.rejects(deliverTransactionalEmail('invitation',email,'url',{AUTH_EMAIL_DELIVERY_MODE:'disabled'},transport),{code:'EMAIL_DELIVERY_DISABLED'});
  assert.equal(calls,1);
});
