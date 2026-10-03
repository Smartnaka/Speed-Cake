export type PaystackVerification = {
  id: string | number
  reference: string
  amount: number
  currency: string
  status: string
}

export function isPaymentReference(value: unknown): value is string {
  return typeof value === 'string' && /^SC-[A-Za-z0-9-]{8,116}$/.test(value)
}

export async function verifyPaystackTransaction(reference: string, secret: string) {
  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secret}` }, cache: 'no-store' }
  )
  const body = await response.json().catch(() => null)
  return { response, body, transaction: body?.data as PaystackVerification | undefined }
}

export function paymentMatchesLocalRecord(
  transaction: PaystackVerification | undefined,
  reference: string,
  paymentAmountKobo: number,
  orderTotalKobo: number
) {
  return Boolean(
    transaction &&
      transaction.status === 'success' &&
      transaction.reference === reference &&
      transaction.currency === 'NGN' &&
      Number.isSafeInteger(transaction.amount) &&
      transaction.amount === paymentAmountKobo &&
      transaction.amount === orderTotalKobo
  )
}
