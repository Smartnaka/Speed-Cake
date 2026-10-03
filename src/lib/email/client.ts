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
  return process.env.RESEND_FROM_EMAIL?.trim() || 'Speed Cake <orders@speedcake.com>'
}

export function getStoreNotificationEmail(): string {
  return process.env.STORE_NOTIFICATION_EMAIL?.trim() || 'orders@speedcake.com'
}

export function getSiteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://localhost:3000').replace(/\/+$/, '')
}
