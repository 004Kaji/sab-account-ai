import { Resend } from 'resend'
import { escHtml as esc, escSubject } from '@/lib/email-utils'

function maskEmail(email: string): string {
  const parts = email.split('@')
  if (parts.length !== 2) return email
  const masked = parts[0].slice(0, 3) + '***'
  return `${masked}@${parts[1]}`
}

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

function getFrom(): string {
  return process.env.EMAIL_FROM ?? 'onboarding@resend.dev'
}

export async function sendFriendSignedUpEmail(params: {
  referrerEmail: string
  referrerName: string
  referredName: string
  code: string
  totalReferrals: number
  convertedReferrals: number
}) {
  const { referrerEmail, referrerName, referredName, code, totalReferrals, convertedReferrals } = params
  const link = `https://sabaccountai.com/signup?ref=${code}`

  await getResend().emails.send({
    from: getFrom(),
    to: [referrerEmail],
    subject: `${escSubject(referredName)} just signed up using your link!`,
    html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1c1917;line-height:1.6">
      <h2 style="color:#c84b2f">Great news, ${esc(referrerName)}!</h2>
      <p>Your friend <strong>${esc(referredName)}</strong> just created their SAB Account AI account using your referral link.</p>
      <p>When they upgrade to a paid plan, you'll automatically receive 1 free month added to your account.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:1.5rem 0"/>
      <p><strong>Your referral progress:</strong></p>
      <ul>
        <li>✓ ${totalReferrals} friend${totalReferrals === 1 ? '' : 's'} signed up</li>
        <li>✓ ${convertedReferrals} upgraded to paid</li>
      </ul>
      <p>Keep sharing your link to earn more rewards!</p>
      <p>Your link: <a href="${link}" style="color:#c84b2f">${link}</a></p>
      <p style="color:#6b7280;font-size:0.875rem;margin-top:2rem">The SAB Account AI team</p>
    </div>`,
  })
}

export async function sendFriendConvertedEmail(params: {
  referrerEmail: string
  referrerName: string
  referredEmail: string
  code: string
  convertedReferrals: number
  additionalMonths: number
  lifetimePro: boolean
  newBillingDate: string
}) {
  const {
    referrerEmail, referrerName, referredEmail, code,
    convertedReferrals, additionalMonths, lifetimePro, newBillingDate,
  } = params
  const link = `https://sabaccountai.com/signup?ref=${code}`
  const maskedEmail = maskEmail(referredEmail)

  let rewardHtml = ''
  if (lifetimePro) {
    rewardHtml = `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:1rem;margin:1rem 0">
      <p style="margin:0">👑 <strong>LIFETIME PRO UNLOCKED!</strong> You'll never be billed again.</p>
    </div>`
  } else if (convertedReferrals >= 3 && additionalMonths >= 2) {
    rewardHtml = `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:1rem;margin:1rem 0">
      <p style="margin:0">✓ <strong>3 months free added!</strong> You've hit the 3-friend milestone!<br/>
      📅 Your next billing date: ${newBillingDate}</p>
    </div>`
  } else {
    rewardHtml = `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:1rem;margin:1rem 0">
      <p style="margin:0">✓ <strong>1 free month added to your account automatically!</strong><br/>
      📅 Your next billing date: ${newBillingDate}</p>
    </div>`
  }

  await getResend().emails.send({
    from: getFrom(),
    to: [referrerEmail],
    subject: `You earned a free month! ${escSubject(maskedEmail)} upgraded.`,
    html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1c1917;line-height:1.6">
      <h2 style="color:#c84b2f">Your referral just paid off, ${esc(referrerName)}!</h2>
      <p>${maskedEmail} upgraded to a paid plan and you've earned a reward.</p>
      ${rewardHtml}
      <p>Keep sharing: <a href="${link}" style="color:#c84b2f">${link}</a></p>
      <p style="color:#6b7280;font-size:0.875rem;margin-top:2rem">The SAB Account AI team</p>
    </div>`,
  })
}

export async function sendWelcomeReferredEmail(params: {
  newUserEmail: string
  newUserName: string
  referrerName: string
}) {
  const { newUserEmail, newUserName, referrerName } = params

  await getResend().emails.send({
    from: getFrom(),
    to: [newUserEmail],
    subject: `Welcome to SAB Account AI! Your friend ${escSubject(referrerName)} invited you.`,
    html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1c1917;line-height:1.6">
      <h2 style="color:#c84b2f">Welcome, ${esc(newUserName)}!</h2>
      <p>You joined via your friend <strong>${esc(referrerName)}</strong>'s referral link — they'll earn a free month when you upgrade.</p>
      <p><strong>Get started in 3 steps:</strong></p>
      <ol>
        <li>Create your first invoice (takes 30 seconds with AI)</li>
        <li>Set up your business profile in Settings</li>
        <li>Try the payslip calculator if you have staff</li>
      </ol>
      <p>Your free plan includes 3 invoices/month. Upgrade to Starter ($9/mo) for unlimited invoices.</p>
      <p>Questions? Just reply to this email.</p>
      <p style="color:#6b7280;font-size:0.875rem;margin-top:2rem">The SAB Account AI team</p>
    </div>`,
  })
}
