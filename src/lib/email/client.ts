import { Resend } from 'resend'

let resendInstance: Resend | null = null

export function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key || key.startsWith('re_YOUR_') || key === 'placeholder') {
    return null
  }
  if (!resendInstance) {
    resendInstance = new Resend(key)
  }
  return resendInstance
}

export function getEmailFromAddress(): string {
  const fromName = process.env.RESEND_FROM_NAME?.trim() || 'Instant Cakes Delivery'
  const rawEmail = process.env.RESEND_FROM_EMAIL?.trim() || 'orders@speedcake.com'
  const emailMatch = rawEmail.match(/<([^>]+)>/)
  const emailOnly = emailMatch ? emailMatch[1] : rawEmail
  return `${fromName} <${emailOnly}>`
}

export function getStoreNotificationEmail(): string {
  return (
    process.env.ADMIN_ORDER_EMAIL?.trim() ||
    process.env.STORE_NOTIFICATION_EMAIL?.trim() ||
    'orders@speedcake.com'
  )
}

export function getSiteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://localhost:3000').replace(/\/+$/, '')
}
