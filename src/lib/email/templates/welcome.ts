import { renderEmailLayout, escapeHtml } from './base-layout.ts'
import { getSiteBaseUrl } from '../client.ts'

export interface WelcomeEmailData {
  customerName: string
  customerEmail: string
}

export function renderWelcomeEmailHtml(data: WelcomeEmailData): string {
  const siteUrl = getSiteBaseUrl()
  const name = escapeHtml(data.customerName || 'there')

  const bodyHtml = `
    <div style="text-align: center; margin-bottom: 28px;">
      <span style="display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #8a5b51; margin-bottom: 8px;">
        Welcome to our bakery
      </span>
      <h1 style="font-family: Georgia, 'Playfair Display', serif; font-size: 30px; font-weight: normal; color: #352c28; margin: 0 0 12px 0; line-height: 1.25;">
        Welcome to Speed Cake, ${name}
      </h1>
      <p style="font-size: 15px; color: #756862; margin: 0 auto; max-width: 460px; line-height: 1.6;">
        We’re delighted to have you join our celebration family. Every cake we bake is crafted from scratch with premium ingredients and hand-piped with care.
      </p>
    </div>

    <!-- Feature box -->
    <div style="background-color: #fbf7f4; border: 1px solid #ebdcd3; border-radius: 4px; padding: 24px; margin-bottom: 32px;">
      <h2 style="font-family: Georgia, serif; font-size: 18px; color: #6f3d36; margin: 0 0 12px 0;">
        How Speed Cake works:
      </h2>
      <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #52443e; line-height: 1.8;">
        <li><b>Explore handpicked recipes</b>: From Velvet Afterglow to Golden Hour Citrus.</li>
        <li><b>Tailor your celebration</b>: Choose your size, flavours, and custom written cake message.</li>
        <li><b>Seamless Doorstep Delivery or Store Pickup</b> across Lagos.</li>
        <li><b>Real-time Tracking</b>: Follow your order from bakery oven to your party table.</li>
      </ul>
    </div>

    <!-- CTA Button -->
    <div style="text-align: center; margin-bottom: 24px;">
      <a href="${siteUrl}/cakes" target="_blank" style="display: inline-block; background-color: #6f3d36; color: #ffffff; text-decoration: none; padding: 14px 32px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; border-radius: 2px; box-shadow: 0 2px 8px rgba(111,61,54,0.18);">
        Browse Cake Collection &rarr;
      </a>
    </div>

    <p style="text-align: center; font-size: 12px; color: #9c8e87; margin: 0;">
      Already planning an event? You can always access your saved cake bag and past orders in your <a href="${siteUrl}/account" style="color: #6f3d36; text-decoration: underline;">account</a>.
    </p>
  `

  return renderEmailLayout({
    title: `Welcome to Speed Cake, ${data.customerName}!`,
    previewText: `Welcome to Speed Cake! Freshly baked bespoke celebration cakes made with care.`,
    bodyHtml,
  })
}

export function renderWelcomeEmailText(data: WelcomeEmailData): string {
  const siteUrl = getSiteBaseUrl()
  return `Welcome to Speed Cake, ${data.customerName || 'there'}!

We're delighted to have you join us. Every cake we bake is crafted from scratch with premium ingredients and hand-piped with care for your special moments.

Explore our collection:
${siteUrl}/cakes

Your Account:
${siteUrl}/account

Questions? Reply to this email or reach us at orders@speedcake.com.
`
}
