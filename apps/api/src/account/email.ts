type Locale = 'pt' | 'en' | 'es';
type Letter = { subject: string; intro: string; action: string; note: string };

const letters: Record<'verify' | 'reset', Record<Locale, Letter>> = {
  verify: {
    pt: { subject: 'Confirme seu e-mail no Preachfy', intro: 'Falta um passo para confirmar sua conta.', action: 'Confirmar e-mail', note: 'Se você não criou esta conta, pode ignorar esta mensagem.' },
    en: { subject: 'Confirm your email on Preachfy', intro: 'One step left to confirm your account.', action: 'Confirm email', note: 'If you did not create this account, you can ignore this message.' },
    es: { subject: 'Confirma tu correo en Preachfy', intro: 'Falta un paso para confirmar tu cuenta.', action: 'Confirmar correo', note: 'Si no creaste esta cuenta, puedes ignorar este mensaje.' },
  },
  reset: {
    pt: { subject: 'Crie uma nova senha no Preachfy', intro: 'Recebemos um pedido para trocar a sua senha. O link vale por uma hora.', action: 'Criar nova senha', note: 'Se não foi você, ignore esta mensagem. Sua senha continua a mesma.' },
    en: { subject: 'Create a new Preachfy password', intro: 'We received a request to change your password. The link works for one hour.', action: 'Create new password', note: 'If this was not you, ignore this message. Your password stays the same.' },
    es: { subject: 'Crea una nueva contraseña en Preachfy', intro: 'Recibimos un pedido para cambiar tu contraseña. El enlace vale por una hora.', action: 'Crear nueva contraseña', note: 'Si no fuiste tú, ignora este mensaje. Tu contraseña sigue igual.' },
  },
};

/** Follows the language of the device that asked. */
function localeOf(request?: Request): Locale {
  const code = request?.headers.get('accept-language')?.slice(0, 2).toLowerCase();
  return code === 'en' || code === 'es' ? code : 'pt';
}

const html = ({ intro, action, note }: Letter, url: string) => `<!doctype html><html><body style="margin:0;padding:32px 20px;background:#FCFCFB;color:#16181D;font-family:-apple-system,Helvetica,Arial,sans-serif">
<div style="max-width:480px;margin:0 auto">
<p style="font-family:Georgia,serif;font-size:26px;font-weight:600;margin:0 0 24px">Preachfy</p>
<p style="font-size:17px;line-height:1.5;margin:0 0 24px">${intro}</p>
<p style="margin:0 0 24px"><a href="${url}" style="display:inline-block;background:#16181D;color:#FFFFFF;text-decoration:none;font-weight:600;padding:14px 24px;border-radius:26px">${action}</a></p>
<p style="font-size:14px;line-height:1.5;color:#6B6F76;margin:0">${note}</p>
</div></body></html>`;

async function send(to: string, kind: 'verify' | 'reset', url: string, request?: Request) {
  const key = process.env.BREVO_API_KEY;
  if (!key) {
    // Without a key, local work still needs the link. It must never reach production logs.
    if (process.env.NODE_ENV === 'production') console.error('BREVO_API_KEY is missing: email not sent');
    else console.log(`\n[e-mail local] ${kind} para ${to}:\n${url}\n`);
    return;
  }
  const letter = letters[kind][localeOf(request)];
  const response = await fetch(`${process.env.BREVO_API_URL ?? 'https://api.brevo.com'}/v3/smtp/email`, {
    method: 'POST',
    headers: { 'api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Preachfy', email: process.env.EMAIL_FROM },
      to: [{ email: to }],
      subject: letter.subject,
      htmlContent: html(letter, url),
    }),
  });
  if (!response.ok) console.error(`Brevo answered ${response.status}`);
}

/** Runs in the background, so response time does not reveal whether an email exists. */
export const sendMail = (to: string, kind: 'verify' | 'reset', url: string, request?: Request) => {
  send(to, kind, url, request).catch((error) => console.error('Email failed', error));
};
