export const DELIVERY_TIME_WINDOWS = [
  '9:00 AM – 12:00 PM',
  '12:00 PM – 3:00 PM',
  '3:00 PM – 6:00 PM',
  '6:00 PM – 9:00 PM',
] as const

export type DeliveryTimeWindow = (typeof DELIVERY_TIME_WINDOWS)[number]

export const SPEEDCAKE_PICKUP_LOCATION = {
  name: 'Speed Cake Main Bakery',
  address: '14 Admiralty Way, Lekki Phase 1',
  city: 'Lekki',
  state: 'Lagos',
  country: 'Nigeria',
  phone: '+234 802 345 6789',
  hours: 'Mon – Sat: 9:00 AM – 7:00 PM, Sun: 10:00 AM – 5:00 PM',
  instructions: 'Please bring your order number when picking up your freshly prepared cake.',
} as const

export const DEFAULT_DELIVERY_CHARGE_KOBO = 250000 // ₦2,500 standard delivery
