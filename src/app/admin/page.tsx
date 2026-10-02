'use client'
import {
  Clock,
  Layers,
  Package,
  ShoppingBag,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react'

export default function AdminDashboardPage() {
  const metrics = [
    {
      label: 'Total Orders',
      value: '0',
      subtext: 'No customer orders placed yet',
      icon: ShoppingBag,
    },
    {
      label: 'Verified Revenue',
      value: '₦0',
      subtext: 'Paystack transaction total',
      icon: Wallet,
    },
    {
      label: 'Registered Customers',
      value: '0',
      subtext: 'Customer account records',
      icon: Users,
    },
    {
      label: 'Active Cakes',
      value: '0',
      subtext: 'Catalogue inventory rows',
      icon: Package,
    },
  ]

  const upcomingStages = [
    {
      stage: 'Stage 1',
      title: 'Admin Foundation & Security',
      status: 'Active',
      description: 'Role-based authorization, /admin/login, layout shell, and session protection.',
      isCurrent: true,
    },
    {
      stage: 'Stage 2',
      title: 'Products & Categories',
      status: 'Upcoming',
      description: 'Cake catalogue CRUD, price points, variants, and customization options.',
      isCurrent: false,
    },
    {
      stage: 'Stage 3',
      title: 'Orders & Fulfillment',
      status: 'Upcoming',
      description: 'Live order tracking, state transitions, customer details, and delivery notes.',
      isCurrent: false,
    },
    {
      stage: 'Stage 4',
      title: 'Delivery & Settings',
      status: 'Upcoming',
      description: 'Lagos zones, slot cutoff rules, charges, and payment verification auditing.',
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
            <span>Stage 1 · Foundation Active</span>
          </span>
        </div>
      </div>

      {/* Metric Cards (Placeholder / Initial state without fake data) */}
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

      {/* Recent Orders Section with Empty State */}
      <section className="bg-white border border-[#ded0c8] p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-[#eee3db]">
          <div>
            <h2 className="serif text-xl text-[#352c28]">Recent Orders</h2>
            <p className="text-xs text-[#756862] mt-0.5">
              Live customer orders and delivery schedules will appear here.
            </p>
          </div>
          <span className="text-[11px] text-[#867872] uppercase tracking-wider font-medium">
            0 Orders
          </span>
        </div>

        <div className="py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-[#f6eee8] text-[#6f3d36] mx-auto flex items-center justify-center mb-3">
            <ShoppingBag size={22} />
          </div>
          <h3 className="serif text-lg text-[#352c28]">No orders recorded yet</h3>
          <p className="text-xs text-[#756862] max-w-md mx-auto mt-2 leading-relaxed">
            When customers place and complete cake orders through the storefront, they will be listed here with customer contact details, delivery date, time window, and status progression controls.
          </p>
          <div className="mt-5 inline-flex items-center gap-1.5 text-[11px] text-[#8a5b51] font-medium bg-[#faf3ef] px-3 py-1.5 rounded-sm">
            <Clock size={13} />
            <span>Order management & status progression arriving in Stage 3</span>
          </div>
        </div>
      </section>

      {/* Admin Implementation Roadmap */}
      <section className="bg-white border border-[#ded0c8] p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Layers size={16} className="text-[#6f3d36]" />
          <h2 className="serif text-lg text-[#352c28]">Admin Development Stages</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {upcomingStages.map(s => (
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
