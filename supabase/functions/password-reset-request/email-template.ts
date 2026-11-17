const SITE_URL = "https://gmpitangueiras-tech.github.io/guarda-municipal-front-end-novo/";
const BRASAO_URL = `${SITE_URL}brasao-guarda-pitangueiras.png`;

const COLORS = {
  forest: "#123b35",
  forestDeep: "#0c2d29",
  accent: "#efa94b",
  ink: "#182321",
  muted: "#6e7974",
  line: "#dfe5df",
  surface: "#f4f6f2",
};

export type RecoveryEmailInput = {
  nome: string | null;
  email: string;
  link: string;
  expiresInMinutes: number;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function firstName(nome: string | null): string {
  const clean = (nome ?? "").trim();
  if (!clean) return "Guarda";
  return clean.split(/\s+/)[0];
}

export function buildRecoveryEmail({ nome, email, link, expiresInMinutes }: RecoveryEmailInput) {
  const saudacao = escapeHtml(firstName(nome));
  const safeLink = escapeHtml(link);
  const safeEmail = escapeHtml(email);

  const subject = "Redefinição de senha — Guarda Municipal de Pitangueiras";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.surface};font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:${COLORS.ink};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Use o botão abaixo para criar uma nova senha de acesso ao sistema da Guarda Municipal de Pitangueiras. O link expira em ${expiresInMinutes} minutos.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.surface};padding:24px 12px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 18px 45px rgba(12,45,41,0.12);">
        <tr>
          <td style="background:${COLORS.forest};background-image:linear-gradient(135deg,${COLORS.forestDeep} 0%,${COLORS.forest} 100%);padding:28px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="64" valign="middle" style="padding-right:16px;">
                  <img src="${BRASAO_URL}" width="56" height="56" alt="Brasão da Guarda Municipal de Pitangueiras" style="display:block;border:0;border-radius:14px;background:#ffffff;padding:6px;" />
                </td>
                <td valign="middle" style="font-family:Inter,Arial,sans-serif;color:#ffffff;">
                  <div style="font-size:16px;font-weight:700;letter-spacing:0.2px;">Guarda Municipal</div>
                  <div style="font-size:12px;letter-spacing:1.6px;text-transform:uppercase;color:#a9c8b9;margin-top:4px;">Pitangueiras — PR</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px 8px 32px;">
            <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${COLORS.muted};font-weight:700;">Área segura</p>
            <h1 style="margin:0 0 16px 0;font-size:26px;line-height:1.25;color:${COLORS.ink};font-weight:800;">Redefinição de senha</h1>
            <p style="margin:0 0 16px 0;font-size:15px;line-height:1.65;color:${COLORS.ink};">Olá, ${saudacao}.</p>
            <p style="margin:0 0 20px 0;font-size:15px;line-height:1.65;color:${COLORS.ink};">
              Recebemos um pedido para redefinir a senha de acesso ao sistema da Guarda Municipal de Pitangueiras
              para a conta vinculada a <strong>${safeEmail}</strong>. Para criar uma nova senha, use o botão abaixo.
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px 0;">
              <tr>
                <td align="center" style="border-radius:12px;background:${COLORS.forest};">
                  <a href="${safeLink}" style="display:inline-block;padding:15px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">Criar nova senha</a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px 0;font-size:13px;line-height:1.6;color:${COLORS.muted};">
              Este link é válido por <strong>${expiresInMinutes} minutos</strong> e só pode ser usado uma vez.
            </p>
            <p style="margin:0 0 24px 0;font-size:13px;line-height:1.6;color:${COLORS.muted};">
              Se o botão não abrir, copie e cole este endereço no navegador:<br />
              <a href="${safeLink}" style="color:${COLORS.forest};word-break:break-all;">${safeLink}</a>
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fdf4e6;border-left:4px solid ${COLORS.accent};border-radius:10px;">
              <tr>
                <td style="padding:14px 16px;font-size:13px;line-height:1.6;color:#6b4a13;">
                  <strong>Você não pediu a redefinição?</strong> Ignore este e-mail: sua senha atual continua valendo.
                  Se as tentativas se repetirem, avise o administrador do sistema.
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 30px 32px;">
            <div style="height:1px;background:${COLORS.line};margin:0 0 18px 0;"></div>
            <p style="margin:0;font-size:12px;line-height:1.6;color:${COLORS.muted};">
              Guarda Municipal de Pitangueiras — Paraná<br />
              Mensagem automática do sistema de gestão operacional. Não responda este e-mail.<br />
              Seus dados são protegidos e utilizados apenas no ambiente operacional.
            </p>
          </td>
        </tr>
      </table>
      <p style="max-width:600px;margin:16px auto 0 auto;font-size:11px;line-height:1.6;color:#93a09a;text-align:center;">
        Por segurança, nunca compartilhe este link. O acesso é individual e registrado.
      </p>
    </td>
  </tr>
</table>
</body>
</html>`;

  const text = [
    `Olá, ${firstName(nome)}.`,
    "",
    "Recebemos um pedido para redefinir a senha de acesso ao sistema da Guarda Municipal de Pitangueiras.",
    `Conta: ${email}`,
    "",
    "Crie uma nova senha neste link:",
    link,
    "",
    `O link é válido por ${expiresInMinutes} minutos e só pode ser usado uma vez.`,
    "Se você não pediu a redefinição, ignore este e-mail: sua senha atual continua valendo.",
    "",
    "Guarda Municipal de Pitangueiras — Paraná",
    "Mensagem automática do sistema de gestão operacional. Não responda este e-mail.",
  ].join("\n");

  return { subject, html, text };
}
