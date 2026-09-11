import type { Plugin, ViteDevServer, PreviewServer } from "vite";
import nodemailer from "nodemailer";
import { SMTP_CONFIG } from "./smtp-config";
import { TWO_FACTOR_CONFIG } from "./two-factor-config";

function getCredentials() {
  const email = process.env.VITE_SMTP_EMAIL || SMTP_CONFIG.email || "rohanakula06@gmail.com";
  const passkey = (process.env.VITE_SMTP_PASSKEY || SMTP_CONFIG.passkey || "bzjk usne qemd chkn").replace(/\s+/g, "");
  const host = process.env.VITE_SMTP_HOST || SMTP_CONFIG.host || "smtp.gmail.com";
  const port = Number(process.env.VITE_SMTP_PORT || SMTP_CONFIG.port || 465);
  const fromName = SMTP_CONFIG.fromName || "ArogyaOS Clinical Security";

  return { email, passkey, host, port, fromName };
}

function get2FactorApiKey() {
  return (process.env.VITE_2FACTOR_API_KEY || TWO_FACTOR_CONFIG.apiKey || "").trim();
}

function handleSmtpRequest(req: any, res: any) {
  if (req.method !== "POST") return false;

  // 1. Email OTP Endpoint
  if (req.url?.startsWith("/api/send-otp-email")) {
    let body = "";
    req.on("data", (chunk: any) => {
      body += chunk;
    });

    req.on("end", async () => {
      try {
        const data = JSON.parse(body || "{}");
        const { to, otp, fullName } = data;

        if (!to || !otp) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: false, error: "Recipient email ('to') and 'otp' are required." }));
          return;
        }

        const creds = getCredentials();
        const transporter = nodemailer.createTransport({
          host: creds.host,
          port: creds.port,
          secure: creds.port === 465,
          auth: {
            user: creds.email,
            pass: creds.passkey,
          },
        });

        const recipientName = fullName ? fullName.trim() : "Valued User";
        const subject = `${otp} is your ArogyaOS verification code`;

        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>ArogyaOS Security Verification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background: #1e293b; border-radius: 20px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #334155; background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);">
              <div style="display: inline-block; padding: 8px 16px; background: rgba(14, 165, 233, 0.15); border: 1px solid rgba(14, 165, 233, 0.4); border-radius: 9999px; font-size: 12px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 1px;">
                ✦ ArogyaOS Intelligence
              </div>
              <h1 style="margin: 16px 0 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                Account Email Verification (Factor 1)
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 24px; color: #cbd5e1;">
                Hello <strong>${recipientName}</strong>,
              </p>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 22px; color: #94a3b8;">
                You are creating an account on <strong>ArogyaOS</strong>. Use the 6-digit email OTP below to verify your email address:
              </p>
              <div style="text-align: center; margin: 28px 0; padding: 20px; background: #0f172a; border-radius: 14px; border: 1px solid #0284c7;">
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #38bdf8; display: inline-block; padding-left: 10px;">
                  ${otp}
                </span>
              </div>
              <div style="background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; border-radius: 6px; padding: 12px 14px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 12px; line-height: 18px; color: #fca5a5;">
                  <strong>Security Warning:</strong> This OTP expires in <strong>10 minutes</strong>. Never share this code with anyone.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background: #0f172a; border-top: 1px solid #334155; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #64748b;">
                © ${new Date().getFullYear()} ArogyaOS Clinical Systems. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `;

        const info = await transporter.sendMail({
          from: `"${creds.fromName}" <${creds.email}>`,
          to: to.trim(),
          subject,
          text: `Your ArogyaOS email verification code is: ${otp}. It expires in 10 minutes.`,
          html,
        });

        console.info(`[ArogyaOS SMTP] Successfully sent Email OTP ${otp} to ${to} (Message ID: ${info.messageId})`);

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: true, messageId: info.messageId, recipient: to }));
      } catch (err: any) {
        console.error("[ArogyaOS SMTP Error]", err);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: false, error: err.message || "Failed to dispatch email via SMTP." }));
      }
    });

    return true;
  }

  // 2. Phone SMS 2-Factor OTP Endpoint
  if (req.url?.startsWith("/api/send-phone-otp")) {
    let body = "";
    req.on("data", (chunk: any) => {
      body += chunk;
    });

    req.on("end", async () => {
      try {
        const data = JSON.parse(body || "{}");
        const { phone, otp } = data;

        if (!phone || !otp) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: false, error: "Phone number and 'otp' are required." }));
          return;
        }

        const apiKey = get2FactorApiKey();
        const cleanPhone = String(phone).replace(/\D/g, "");

        if (apiKey) {
          console.info(`[ArogyaOS 2Factor SMS] Dispatching SMS OTP to ${cleanPhone} via 2Factor API`);
          const targetUrl = `https://2factor.in/API/V1/${encodeURIComponent(apiKey)}/SMS/${cleanPhone}/${encodeURIComponent(otp)}/ArogyaOS`;
          
          try {
            const apiRes = await fetch(targetUrl);
            const apiData: any = await apiRes.json().catch(() => ({}));
            console.info(`[ArogyaOS 2Factor Response]`, apiData);

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({
              success: true,
              provider: "2Factor.in",
              details: apiData.Details || "SMS Sent",
              phone: cleanPhone,
            }));
            return;
          } catch (apiErr: any) {
            console.warn(`[ArogyaOS 2Factor Gateway Warning]`, apiErr);
          }
        }

        // Fallback / Simulated mode if no live SMS credits or during local testing
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({
          success: true,
          provider: "Local/Simulated",
          phone: cleanPhone,
          message: `SMS 2-Factor OTP generated for ${cleanPhone}.`,
        }));
      } catch (err: any) {
        console.error("[ArogyaOS SMS Error]", err);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: false, error: err.message || "Failed to dispatch SMS OTP." }));
      }
    });

    return true;
  }

  return false;
}

export function smtpEmailPlugin(): Plugin {
  return {
    name: "vite-plugin-smtp-and-2factor",
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        if (!handleSmtpRequest(req, res)) {
          next();
        }
      });
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use((req, res, next) => {
        if (!handleSmtpRequest(req, res)) {
          next();
        }
      });
    },
  };
}
