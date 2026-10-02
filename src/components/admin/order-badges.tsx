export function OrderStatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase()
  let classes = 'bg-stone-100 text-stone-800 border-stone-200'

  if (normalized === 'pending_payment') {
    classes = 'bg-amber-50 text-amber-800 border-amber-200'
  } else if (normalized === 'paid') {
    classes = 'bg-blue-50 text-blue-800 border-blue-200'
  } else if (normalized === 'confirmed') {
    classes = 'bg-sky-50 text-sky-800 border-sky-200'
  } else if (normalized === 'preparing') {
    classes = 'bg-purple-50 text-purple-800 border-purple-200'
  } else if (normalized === 'ready') {
    classes = 'bg-teal-50 text-teal-800 border-teal-200'
  } else if (normalized === 'out_for_delivery') {
    classes = 'bg-orange-50 text-orange-800 border-orange-200'
  } else if (normalized === 'delivered') {
    classes = 'bg-emerald-50 text-emerald-800 border-emerald-200'
  } else if (normalized === 'cancelled') {
    classes = 'bg-rose-50 text-rose-800 border-rose-200'
  } else if (normalized === 'refund_pending' || normalized === 'refunded') {
    classes = 'bg-red-50 text-red-800 border-red-200'
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize whitespace-nowrap ${classes}`}
    >
      {normalized.replaceAll('_', ' ')}
    </span>
  )
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase()
  let classes = 'bg-stone-100 text-stone-700 border-stone-200'

  if (normalized === 'paid' || normalized === 'success') {
    classes = 'bg-emerald-50 text-emerald-800 border-emerald-200'
  } else if (normalized === 'pending') {
    classes = 'bg-amber-50 text-amber-800 border-amber-200'
  } else if (normalized === 'failed') {
    classes = 'bg-rose-50 text-rose-800 border-rose-200'
  } else if (normalized === 'refunded') {
    classes = 'bg-stone-100 text-stone-700 border-stone-300'
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border capitalize whitespace-nowrap ${classes}`}
    >
      {normalized}
    </span>
  )
}
