import 'dotenv/config';
import nodemailer from 'nodemailer';

/**
 * Criação do transporte SMTP se configurado no ambiente (.env).
 * Variáveis suportadas:
 * - SMTP_HOST: ex: smtp.gmail.com, smtpout.secureserver.net, smtp.resend.com
 * - SMTP_PORT: ex: 587 (TLS/STARTTLS) ou 465 (SSL)
 * - SMTP_SECURE: true para porta 465, false para 587
 * - SMTP_USER: usuário/e-mail para autenticação SMTP
 * - SMTP_PASS: senha de app ou token SMTP
 * - SMTP_FROM: Remetente exibido (ex: "AppFit" <noreply@appfit.luanmazevedo.dev>)
 */
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

const transporter = createTransporter();

if (transporter) {
  console.log(`[AppFit Mailer] Transporte SMTP configurado para ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587}`);
} else {
  console.warn('[AppFit Mailer] Variáveis SMTP não configuradas. Em desenvolvimento local os códigos serão exibidos neste terminal.');
}

/**
 * Envia o e-mail contendo o código de 6 dígitos para o endereço informado.
 */
export async function sendVerificationCodeEmail({ to, code, name }) {
  const recipientName = name?.trim() || to.split('@')[0] || 'Atleta';
  const fromAddress = process.env.SMTP_FROM || `"AppFit" <${process.env.SMTP_USER || 'noreply@appfit.luanmazevedo.dev'}>`;

  // Se não houver SMTP configurado no .env, registra no terminal do servidor
  if (!transporter) {
    console.log(`
┌────────────────────────────────────────────────────────────────────────┐
│ 📧 [AppFit Mailer] CÓDIGO DE VERIFICAÇÃO GERADO                       │
├────────────────────────────────────────────────────────────────────────┤
│ Para:    ${to.padEnd(59)} │
│ Nome:    ${recipientName.padEnd(59)} │
│ CÓDIGO:  ${String(code).padEnd(59)} │
│ Expira:  10 minutos                                                    │
│ Aviso:   Configure SMTP_HOST, SMTP_PORT, SMTP_USER e SMTP_PASS no .env │
└────────────────────────────────────────────────────────────────────────┘
    `);
    return {
      success: true,
      simulated: true,
      message: 'SMTP não configurado. Código registrado no console do servidor para testes locais.'
    };
  }

  const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Código de Verificação AppFit</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #060a12;
      color: #f1f5f9;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 520px;
      margin: 30px auto;
      background-color: #0b1220;
      border: 1px solid #1e293b;
      border-radius: 20px;
      padding: 36px 30px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    }
    .logo-badge {
      display: inline-block;
      padding: 8px 16px;
      background: linear-gradient(135deg, #0d9488, #06b6d4);
      color: #ffffff;
      font-weight: 900;
      font-size: 18px;
      border-radius: 12px;
      letter-spacing: 1px;
      margin-bottom: 24px;
    }
    h1 {
      font-size: 22px;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 12px 0;
    }
    p {
      font-size: 14px;
      line-height: 1.6;
      color: #94a3b8;
      margin: 0 0 16px 0;
    }
    .code-box {
      background: #020617;
      border: 1px solid #0891b2;
      border-radius: 16px;
      padding: 20px;
      text-align: center;
      margin: 28px 0;
    }
    .code-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #38bdf8;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .code-value {
      font-size: 36px;
      font-weight: 900;
      letter-spacing: 10px;
      color: #ffffff;
      font-family: ui-monospace, Menlo, Monaco, Consolas, monospace;
      margin: 4px 0;
    }
    .footer {
      border-top: 1px solid #1e293b;
      padding-top: 20px;
      margin-top: 30px;
      font-size: 11px;
      color: #64748b;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div style="text-align: center;">
      <div class="logo-badge">⚡ AppFit</div>
      <h1>Confirme seu E-mail</h1>
      <p>Olá, <strong style="color: #ffffff;">${recipientName}</strong>! Use o código abaixo para validar sua conta e acessar o AppFit:</p>
      
      <div class="code-box">
        <div class="code-label">Seu Código de Verificação</div>
        <div class="code-value">${code}</div>
      </div>

      <p style="font-size: 12px; color: #64748b;">
        Este código é válido por <strong>10 minutos</strong>. Se você não solicitou este cadastro ou validação, ignore este e-mail.
      </p>
    </div>

    <div class="footer">
      AppFit • Registro e Treino Inteligente<br/>
      <a href="https://appfit.luanmazevedo.dev" style="color: #06b6d4; text-decoration: none;">appfit.luanmazevedo.dev</a>
    </div>
  </div>
</body>
</html>
  `.trim();

  const textContent = `
AppFit - Código de Verificação

Olá, ${recipientName}!
Seu código de verificação para validar sua conta no AppFit é: ${code}

Este código expira em 10 minutos. Se você não solicitou este código, por favor ignore esta mensagem.

AppFit • Registro e Treino Inteligente
https://appfit.luanmazevedo.dev
  `.trim();

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject: `Seu código de verificação AppFit: ${code}`,
      text: textContent,
      html: htmlContent,
    });

    console.log(`[AppFit Mailer] E-mail enviado com sucesso para ${to}. ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[AppFit Mailer Error] Falha ao enviar e-mail para ${to}:`, err);
    return { success: false, error: err.message };
  }
}
