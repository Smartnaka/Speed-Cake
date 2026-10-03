'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Calendar,
  Clock,
  Layers,
  Package,
  ShoppingBag,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react'
import { naira } from '@/lib/demo-products'
import type { AdminOrderRecord } from '@/lib/orders-db'
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/admin/order-badges'
import { getAdminAuthHeader } from '@/lib/admin-client-auth'

export default function AdminDashboardPage() {
  const [productCount, setProductCount] = useState<number | null>(null)
  const [orders, setOrders] = useState<AdminOrderRecord[]>([])
  const [totalOrders, setTotalOrders] = useState<number | null>(null)
  const [revenueKobo, setRevenueKobo] = useState<number | null>(null)

  useEffect(() => {
    async function loadDashboard() {
      const headers = await getAdminAuthHeader()

      // 1. Fetch products count
      fetch('/api/admin/products', { headers })
        .then(res => res.json())
        .then(data => {
          if (data.ok && Array.isArray(data.products)) {
            const activeCakes = data.products.filter((p: any) => p.active).length
            setProductCount(activeCakes)
          }
        })
        .catch(() => {})

      // 2. Fetch recent orders
      fetch('/api/admin/orders?limit=5', { headers })
        .then(res => res.json())
        .then(data => {
          if (data.ok && Array.isArray(data.orders)) {
            setOrders(data.orders)
            setTotalOrders(data.total)
            // Compute verified revenue from paid orders
            const verified = data.orders
              .filter((o: AdminOrderRecord) => o.payment_status === 'paid' || o.payment_status === 'success')
              .reduce((acc: number, curr: AdminOrderRecord) => acc + (curr.total_kobo || 0), 0)
            setRevenueKobo(verified)
          }
        })
        .catch(() => {})
    }

    void loadDashboard()
  }, [])

  const metrics = [
    {
      label: 'Total Orders',
      value: totalOrders !== null ? totalOrders.toString() : '…',
      subtext: 'Customer order records',
      icon: ShoppingBag,
    },
    {
      label: 'Verified Revenue',
      value: revenueKobo !== null ? naira(revenueKobo) : '…',
      subtext: 'Paid orders subtotal',
      icon: Wallet,
    },
    {
      label: 'Active Cakes',
      value: productCount !== null ? productCount.toString() : '…',
      subtext: 'Storefront catalogue rows',
      icon: Package,
    },
    {
      label: 'Customer Accounts',
      value: 'Secured',
      subtext: 'Supabase authenticated',
      icon: Users,
    },
  ]

  const stages = [
    {
      stage: 'Stage 1',
      title: 'Admin Foundation & Security',
      status: 'Completed',
      description: 'Role-based authorization, /admin/login, layout shell, and session protection.',
      isCurrent: false,
    },
    {
      stage: 'Stage 2',
      title: 'Products & Categories',
      status: 'Completed',
      description: 'Cake catalogue CRUD, price points, variants, image upload, and category links.',
      isCurrent: false,
    },
    {
      stage: 'Stage 3',
      title: 'Orders & Fulfillment',
      status: 'Active',
      description: 'Live order tracking, state transitions, customer details, and delivery notes.',
      isCurrent: true,
    },
    {
      stage: 'Stage 4',
      title: 'Store Settings',
      status: 'Upcoming',
      description: 'Store information and customer support contact details.',
      isCurrent: false,
    },
  ]

  return (
    <div className="space-y-10">
      {/* Welcome / Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#ded0c8]">
        <div>
          <div className="eyebrow text-[#8a5b51]">Operations Overview</div>
          <h1 className="serif text-4xl text-[#352c28] mt-1.5">Admin Dashboard</h1>
          <p className="text-xs text-[#756862] mt-2 max-w-xl leading-relaxed">
            Welcome to the Speed Cake management console. Monitor live orders, revenue, customer accounts, and bakery workflow.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f3e5df] text-[#6f3d36] text-xs font-medium rounded-sm border border-[#e8d2c8]">
            <Sparkles size={14} />
            <span>Stage 3 · Orders & Fulfillment Active</span>
          </span>
        </div>
      </div>

      {/* Metric Cards */}
      <section>
        <h2 className="text-xs uppercase tracking-wider text-[#867872] font-semibold mb-4">
          Store Snapshot
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map(m => (
            <div
              key={m.label}
              className="bg-white border border-[#ded0c8] p-5 shadow-sm hover:border-[#c28d79] transition flex flex-col justify-between min-h-[130px]"
            >
              <div className="flex items-center justify-between text-[#867872]">
                <span className="text-xs uppercase tracking-wider font-medium">{m.label}</span>
                <m.icon size={17} className="text-[#6f3d36]" />
              </div>
              <div>
                <div className="serif text-3xl text-[#352c28] mt-2 font-normal">{m.value}</div>
                <div className="text-[11px] text-[#756862] mt-1">{m.subtext}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Orders Section */}
      <section className="bg-white border border-[#ded0c8] p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-[#eee3db]">
          <div>
            <h2 className="serif text-xl text-[#352c28]">Recent Orders</h2>
            <p className="text-xs text-[#756862] mt-0.5">
              Live customer orders and fulfillment schedules.
            </p>
          </div>
          <Link
            href="/admin/orders"
            className="text-xs font-medium text-[#6f3d36] hover:underline"
          >
            View all orders &rarr;
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-[#f6eee8] text-[#6f3d36] mx-auto flex items-center justify-center mb-3">
              <ShoppingBag size={22} />
            </div>
            <h3 className="serif text-lg text-[#352c28]">No orders recorded yet</h3>
            <p className="text-xs text-[#756862] max-w-md mx-auto mt-2 leading-relaxed">
              When customers place orders through the storefront, they will be listed here with customer contact details, delivery date, time window, and status progression controls.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-[#fcf9f7] border-b border-[#e5d9d1] text-xs font-medium text-[#756862] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Order #</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Delivery Date</th>
                  <th className="py-2.5 px-3">Payment</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee4dc]">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-[#fdfbf9] transition-colors">
                    <td className="py-3 px-3 font-mono font-medium text-[#6f3d36]">
                      <Link href={`/admin/orders/${order.id}`} className="hover:underline">
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="py-3 px-3 text-xs text-[#352c28]">
                      <div className="font-medium">{order.customer_name}</div>
                      <div className="text-[#867872]">{order.customer_email}</div>
                    </td>
                    <td className="py-3 px-3 text-xs text-[#756862]">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} className="text-[#867872]" />
                        <span>{order.delivery_date || 'Standard'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <PaymentStatusBadge status={order.payment_status} />
                    </td>
                    <td className="py-3 px-3">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="py-3 px-3 text-right text-xs font-medium text-[#352c28]">
                      {naira(order.total_kobo)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-xs font-medium text-[#6f3d36] hover:underline"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Admin Implementation Roadmap */}
      <section className="bg-white border border-[#ded0c8] p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Layers size={16} className="text-[#6f3d36]" />
          <h2 className="serif text-lg text-[#352c28]">Admin Development Stages</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stages.map(s => (
            <div
              key={s.stage}
              className={`p-4 border text-xs flex flex-col justify-between ${
                s.isCurrent
                  ? 'border-[#6f3d36] bg-[#fdf8f5]'
                  : 'border-[#e8ddd6] bg-[#faf7f4]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-[#6f3d36] text-[11px] uppercase tracking-wider">
                    {s.stage}
                  </span>
                  <span
                    className={`text-[9px] uppercase px-1.5 py-0.5 rounded-sm font-semibold tracking-wider ${
                      s.isCurrent ? 'bg-[#6f3d36] text-white' : 'bg-[#e5dcd6] text-[#63554e]'
                    }`}
                  >
                    {s.status}
                  </span>
                </div>
                <div className="font-medium text-[#352c28] mt-1">{s.title}</div>
                <div className="text-[#756862] text-[11px] mt-2 leading-relaxed">{s.description}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
