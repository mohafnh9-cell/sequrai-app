import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendScanCompletedEmail(params: {
  to: string;
  projectName: string;
  scanId: string;
  vulnerabilityCount: number;
  criticalCount: number;
  score: number;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.log("[Resend] Mock: Scan completed email would be sent to", params.to);
    return;
  }

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "noreply@sequrai.com",
    to: params.to,
    subject: `Production analysis completed for ${params.projectName}`,
    html: `
      <h2>Security Scan Completed</h2>
      <p>Your security scan for <strong>${params.projectName}</strong> has completed.</p>
      <ul>
        <li>Security Score: <strong>${params.score}/100</strong></li>
        <li>Total Vulnerabilities: <strong>${params.vulnerabilityCount}</strong></li>
        <li>Critical Issues: <strong>${params.criticalCount}</strong></li>
      </ul>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/projects">View Results</a>
    `,
  });
}

export async function sendCriticalVulnerabilityEmail(params: {
  to: string;
  projectName: string;
  vulnerabilityTitle: string;
  vulnerabilityId: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.log("[Resend] Mock: Critical vulnerability email would be sent to", params.to);
    return;
  }

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "noreply@sequrai.com",
    to: params.to,
    subject: `[CRITICAL] Security vulnerability detected in ${params.projectName}`,
    html: `
      <h2>Critical Security Vulnerability Detected</h2>
      <p>A critical vulnerability was found in <strong>${params.projectName}</strong>:</p>
      <p><strong>${params.vulnerabilityTitle}</strong></p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/projects">View and Fix Now</a>
    `,
  });
}
