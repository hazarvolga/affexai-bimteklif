import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { createConnection, type Socket } from 'node:net';
import { connect as connectTls } from 'node:tls';
import { assertAuthEmailAvailable, EmailDeliveryError } from './email-policy';

type Template = 'verify_email' | 'reset_password' | 'invitation';
type Env = Record<string, string | undefined>;
type Delivery = { status: 'accepted' } | { status: 'development'; url: string };
type Message = { from: string; to: string; subject: string; text: string; html: string };
const SMTP_OPERATION_TIMEOUT_MS = 10_000;
const EMAIL_DELIVERY_DEADLINE_MS = 15_000;
export type SmtpFactory = (options: SMTPTransport.Options) => {
  sendMail(message: Message): Promise<{ accepted?: unknown[]; rejected?: unknown[] }>;
  close(): void;
};
const copy = {
  verify_email: ['Bimmetraj e-posta doğrulaması', 'E-posta adresinizi doğrulamak için aşağıdaki bağlantıyı kullanın.', 'E-posta adresimi doğrula'],
  reset_password: ['Bimmetraj şifre yenileme', 'Şifrenizi yenilemek için aşağıdaki bağlantıyı kullanın.', 'Şifremi yenile'],
  invitation: ['Bimmetraj ekip daveti', 'Bimmetraj çalışma alanı davetinizi kabul etmek için aşağıdaki bağlantıyı kullanın.', 'Daveti görüntüle'],
} as const;
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

function message(template: Template, email: string, url: string, env: Env): Message {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || url.length > 4096) throw new Error('Invalid action URL');
  if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email) || email.length > 254) throw new Error('Invalid recipient');
  const [subject, introduction, label] = copy[template];
  return {
    from: env.AUTH_EMAIL_FROM!, to: email, subject,
    text: `${introduction}\n\n${url}\n\nBu işlemi siz başlatmadıysanız bu mesajı yok sayabilirsiniz.`,
    html: `<html lang="tr"><body><h1>${escapeHtml(subject)}</h1><p>${escapeHtml(introduction)}</p><p><a href="${escapeHtml(url)}">${escapeHtml(label)}</a></p><p>Bu işlemi siz başlatmadıysanız bu mesajı yok sayabilirsiniz.</p></body></html>`,
  };
}

// SMTPTransport.close alone does not destroy its in-flight socket. Own the
// underlying socket so the total deadline also releases TCP/TLS resources.
export type SmtpSocketFactory = {
  openTcp(input: { host: string; port: number }): Socket;
  openTls(input: { host: string; port: number; servername: string; rejectUnauthorized: boolean; minVersion: 'TLSv1.2' }): Socket;
};

const defaultSmtpSocketFactory: SmtpSocketFactory = {
  openTcp: input => createConnection(input),
  openTls: input => connectTls(input),
};

export type SmtpTransportCreator = (options: SMTPTransport.Options) => ReturnType<SmtpFactory>;

export function createSmtpFactory(deps: { socketFactory?: SmtpSocketFactory; createTransport?: SmtpTransportCreator } = {}): SmtpFactory {
  const socketFactory = deps.socketFactory ?? defaultSmtpSocketFactory;
  const createTransport = deps.createTransport ?? (options => nodemailer.createTransport(options) as ReturnType<SmtpFactory>);
  return options => {
  let socket: Socket | undefined;
  let closed = false;
  const transport = createTransport({ ...options, getSocket(config, callback) {
    if (closed) return callback(new Error('Email transport closed'), false);
    const secured = Boolean(config.secure);
    socket = secured
      ? socketFactory.openTls({ host: config.host!, port: Number(config.port), servername: config.host!, rejectUnauthorized: true, minVersion: 'TLSv1.2' })
      : socketFactory.openTcp({ host: config.host!, port: Number(config.port) });
    const onError = (error: Error) => callback(error, false);
    socket.once('error', onError);
    socket.once(secured ? 'secureConnect' : 'connect', () => {
      socket!.removeListener('error', onError);
      callback(null, { connection: socket!, secured });
    });
  } } as SMTPTransport.Options);
  return { sendMail: payload => transport.sendMail(payload), close() { closed = true; socket?.destroy(); transport.close(); } };
  };
}

const smtpFactory: SmtpFactory = createSmtpFactory();

function smtpOptions(env: Env): SMTPTransport.Options {
  const port = Number(env.AUTH_EMAIL_SMTP_PORT);
  return {
    host: env.AUTH_EMAIL_SMTP_HOST, port, secure: port === 465, requireTLS: port === 587,
    auth: { user: env.AUTH_EMAIL_SMTP_USER, pass: env.AUTH_EMAIL_SMTP_PASSWORD },
    tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2', servername: env.AUTH_EMAIL_SMTP_HOST },
    connectionTimeout: SMTP_OPERATION_TIMEOUT_MS, greetingTimeout: SMTP_OPERATION_TIMEOUT_MS, socketTimeout: SMTP_OPERATION_TIMEOUT_MS, dnsTimeout: SMTP_OPERATION_TIMEOUT_MS,
    logger: false, debug: false, disableFileAccess: true, disableUrlAccess: true,
  };
}

async function webhook(template: Template, email: string, url: string, env: Env, transport: typeof fetch, signal: AbortSignal) {
  const response = await transport(env.AUTH_EMAIL_WEBHOOK_URL!, {
    method: 'POST', redirect: 'error', signal,
    headers: { 'Content-Type': 'application/json', ...(env.AUTH_EMAIL_WEBHOOK_SECRET ? { Authorization: `Bearer ${env.AUTH_EMAIL_WEBHOOK_SECRET}` } : {}) },
    body: JSON.stringify({ template, email, url }),
  });
  void response.body?.cancel().catch(() => {});
  if (!response.ok) throw new Error('Provider rejected request');
}

export async function deliverTransactionalEmail(template: Template, email: string, url: string, env: Env = process.env, transport: typeof fetch = fetch, createSmtp: SmtpFactory = smtpFactory): Promise<Delivery> {
  assertAuthEmailAvailable(env);
  if ((env.AUTH_EMAIL_DELIVERY_MODE ?? 'webhook') === 'webhook' && !env.AUTH_EMAIL_WEBHOOK_URL && env.NODE_ENV !== 'production') return { status: 'development', url };
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let smtp: ReturnType<SmtpFactory> | undefined;
  try {
    const deadline = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => { controller.abort(); reject(new Error('Email deadline exceeded')); }, EMAIL_DELIVERY_DEADLINE_MS);
    });
    const send = async () => {
      if (env.AUTH_EMAIL_DELIVERY_MODE !== 'smtp') return webhook(template, email, url, env, transport, controller.signal);
      const payload = message(template, email, url, env);
      smtp = createSmtp(smtpOptions(env));
      const result = await smtp.sendMail(payload);
      if (!result.accepted?.includes(email) || result.rejected?.includes(email)) throw new Error('SMTP did not accept recipient');
    };
    await Promise.race([send(), deadline]);
    return { status: 'accepted' };
  } catch (error) {
    const failure = error as { name?: unknown; code?: unknown; responseCode?: unknown };
    // Keep SMTP credentials and protocol responses out of logs; the error class
    // and code are enough to distinguish TLS, auth and timeout failures.
    console.warn('Transactional email delivery failed', {
      mode: env.AUTH_EMAIL_DELIVERY_MODE ?? 'webhook',
      errorName: typeof failure?.name === 'string' ? failure.name : 'UnknownError',
      errorCode: typeof failure?.code === 'string' ? failure.code : undefined,
      responseCode: typeof failure?.responseCode === 'number' ? failure.responseCode : undefined,
    });
    throw new EmailDeliveryError('EMAIL_DELIVERY_UNAVAILABLE');
  } finally {
    clearTimeout(timeout);
    controller.abort();
    smtp?.close();
  }
}
