import {z} from 'zod'

export const DELIVERY_TIME_WINDOWS = [
  '9:00 AM – 12:00 PM',
  '12:00 PM – 3:00 PM',
  '3:00 PM – 6:00 PM',
  '6:00 PM – 9:00 PM',
] as const

export type DeliveryTimeWindow = (typeof DELIVERY_TIME_WINDOWS)[number]

export const fulfillmentTypeSchema = z.enum(['delivery', 'pickup'])
export type FulfillmentType = z.infer<typeof fulfillmentTypeSchema>

const phoneRegex = /^\+?[0-9\s\-()]{7,25}$/

export const checkoutItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1).max(30),
  customization: z
    .object({
      message: z.string().max(45).optional(),
      choices: z.record(z.string().uuid(), z.array(z.string().max(120)).max(30)).optional(),
    })
    .optional(),
})

export const checkoutBaseSchema = z.object({
  fulfillment_type: fulfillmentTypeSchema.default('delivery'),
  first_name: z.string().trim().min(1, 'First name is required').max(60, 'First name cannot exceed 60 characters'),
  last_name: z.string().trim().min(1, 'Last name is required').max(60, 'Last name cannot exceed 60 characters'),
  country: z.string().trim().min(2, 'Country / Region is required').max(100).default('Nigeria'),
  phone: z
    .string()
    .trim()
    .min(7, 'Phone number must be at least 7 digits')
    .max(25, 'Phone number cannot exceed 25 characters')
    .regex(phoneRegex, 'Please enter a valid phone number'),
  email: z.string().trim().email('Please enter a valid email address').max(150),
  city: z.string().trim().min(2, 'Town / City is required').max(100),
  state: z.string().trim().min(2, 'State is required').max(100),
  address: z.string().trim().max(300).optional().nullable(),
  landmark: z.string().trim().max(200).optional().nullable(),
  instructions: z.string().trim().max(500).optional().nullable(),
  delivery_date: z.string().trim().optional().nullable(),
  delivery_window: z.string().trim().optional().nullable(),
  idempotency_key: z.string().trim().max(128).optional().nullable(),
  name: z.string().trim().optional(), // For backward compatibility
  items: z.array(checkoutItemSchema).min(1, 'Your order must contain at least one cake').max(30),
})

function refineCheckoutFulfillment(
  data: {
    fulfillment_type: 'delivery' | 'pickup'
    address?: string | null
    delivery_date?: string | null
    delivery_window?: string | null
  },
  ctx: z.RefinementCtx
) {
  const isDelivery = data.fulfillment_type === 'delivery'

  if (isDelivery) {
    // Address is required for delivery
    if (!data.address || data.address.trim().length < 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A valid delivery street address (at least 5 characters) is required',
        path: ['address'],
      })
    }

    // Delivery date is required and cannot be in the past
    if (!data.delivery_date || !/^\d{4}-\d{2}-\d{2}$/.test(data.delivery_date)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A valid delivery date (YYYY-MM-DD) is required',
        path: ['delivery_date'],
      })
    } else {
      const todayStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Lagos',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date())

      if (data.delivery_date < todayStr) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Delivery date cannot be in the past',
          path: ['delivery_date'],
        })
      }
    }

    // Delivery window is required and must be configured
    if (!data.delivery_window || !(DELIVERY_TIME_WINDOWS as readonly string[]).includes(data.delivery_window)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please choose an available delivery window',
        path: ['delivery_window'],
      })
    }
  }
}

export const checkoutFormSchema = checkoutBaseSchema
  .omit({ items: true })
  .superRefine(refineCheckoutFulfillment)

export type CheckoutFormInput = z.infer<typeof checkoutFormSchema>

export const checkoutSchema = checkoutBaseSchema.superRefine(refineCheckoutFulfillment)

export type CheckoutInput = z.infer<typeof checkoutSchema>

export const statusTransitions: Record<string, string[]> = {
  pending_payment: ['paid', 'cancelled'],
  paid: ['confirmed', 'cancelled', 'refund_pending'],
  confirmed: ['preparing', 'cancelled', 'refund_pending'],
  preparing: ['ready', 'cancelled', 'refund_pending'],
  ready: ['out_for_delivery', 'cancelled', 'refund_pending'],
  out_for_delivery: ['delivered', 'refund_pending'],
  delivered: ['refund_pending'],
  refund_pending: ['refunded'],
  cancelled: [],
  refunded: [],
}
export function canTransition(from:string,to:string){return statusTransitions[from]?.includes(to)??false}

export function safeReturnPath(value?: string | null): string {
  if (!value) return '/account'
  try {
    const target = new URL(value, 'https://speedcake.invalid')
    if (target.origin !== 'https://speedcake.invalid') return '/account'
    const path = `${target.pathname}${target.search}${target.hash}`
    if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return '/account'
    return path
  } catch {
    return '/account'
  }
}

export function safeAdminReturnPath(value?: string | null): string {
  if (!value) return '/admin'
  try {
    const target = new URL(value, 'https://speedcake.invalid')
    if (target.origin !== 'https://speedcake.invalid') return '/admin'
    const path = `${target.pathname}${target.search}${target.hash}`
    if (!path.startsWith('/admin') || path.startsWith('/admin/login') || path.startsWith('//') || path.startsWith('/\\')) {
      return '/admin'
    }
    return path
  } catch {
    return '/admin'
  }
}

export type AdminSessionResult =
  | { ok: true; user: { id: string; email?: string }; profile: { id: string; role: string; full_name?: string } }
  | { ok: false; status: 401 | 403 | 500; error: string }

export function evaluateAdminStatus(
  user: { id: string; email?: string } | null,
  profile: { id: string; role: string; full_name?: string } | null
): AdminSessionResult {
  if (!user) return { ok: false, status: 401, error: 'Unauthorized: Invalid session' };
  if (!profile) return { ok: false, status: 403, error: 'Forbidden: Profile not found' };
  if (profile.role !== 'admin') return { ok: false, status: 403, error: 'Forbidden: Administrator privileges required' };
  return { ok: true, user: { id: user.id, email: user.email }, profile };
}

// ---------------------------------------------------------------------------
// Stage 2: Product & Category Catalogue Schemas
// ---------------------------------------------------------------------------
export const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const slugSchema = z
  .string()
  .trim()
  .min(2, 'Slug must be at least 2 characters')
  .max(100, 'Slug cannot exceed 100 characters')
  .regex(slugRegex, 'Slug must contain only lowercase letters, numbers, and hyphens (e.g. "chocolate-cake")')

export function generateSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2, 'Category name must be at least 2 characters').max(100, 'Category name cannot exceed 100 characters'),
  slug: slugSchema,
  description: z.string().trim().max(500, 'Description cannot exceed 500 characters').optional().nullable(),
  image_url: z.string().trim().max(1000).optional().nullable(),
  sort_order: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
})

export type CategoryInput = z.infer<typeof categoryInputSchema>

export const variantInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'Size/variant name is required').max(100, 'Name cannot exceed 100 characters'),
  price_kobo: z.number().int().min(0, 'Price must be 0 or greater'),
  active: z.boolean().default(true),
})

export type VariantInput = z.infer<typeof variantInputSchema>

export const productInputSchema = z.object({
  name: z.string().trim().min(2, 'Product name must be at least 2 characters').max(150, 'Product name cannot exceed 150 characters'),
  slug: slugSchema,
  category_id: z.string().uuid('Invalid category ID').nullable().optional().or(z.literal('')),
  description: z.string().trim().max(2000, 'Description cannot exceed 2000 characters').default(''),
  lead_days: z.number().int().min(0, 'Lead days cannot be negative').max(60, 'Lead days cannot exceed 60').default(2),
  active: z.boolean().default(true),
  featured: z.boolean().default(false),
  image: z.string().trim().max(1000).optional().nullable(),
  variants: z.array(variantInputSchema).min(1, 'At least one cake size/variant is required'),
})

export type ProductInput = z.infer<typeof productInputSchema>

// ---------------------------------------------------------------------------
// Stage 3: Order Management Schemas
// ---------------------------------------------------------------------------
export const validOrderStates = [
  'pending_payment',
  'paid',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'refund_pending',
  'refunded',
] as const

export const orderStateSchema = z.enum(validOrderStates)
export type OrderState = z.infer<typeof orderStateSchema>

export const validPaymentStates = ['pending', 'success', 'paid', 'failed', 'refunded'] as const
export const paymentStateSchema = z.enum(validPaymentStates)
export type PaymentState = z.infer<typeof paymentStateSchema>

export const updateOrderStatusSchema = z.object({
  status: orderStateSchema,
  note: z.string().trim().max(500, 'Note cannot exceed 500 characters').optional().nullable(),
  expected_updated_at: z.string().datetime({ offset: true }),
})
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>

export const orderFilterSchema = z.object({
  search: z.string().trim().max(100).optional(),
  orderStatus: z.union([orderStateSchema, z.literal('all')]).optional(),
  paymentStatus: z.union([paymentStateSchema, z.literal('all')]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
export type OrderFilterInput = z.infer<typeof orderFilterSchema>
