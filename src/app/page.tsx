import Link from 'next/link'
import { ArrowRight, Sparkles, ShieldCheck, HeartHandshake, Truck } from 'lucide-react'
import { getProducts } from '@/lib/products'
import { ProductCard } from '@/components/product-card'

export default async function Home() {
  const products = await getProducts()
  const categories = [...new Set(products.map(p => p.category))]

  return (
    <main className="space-y-24 md:space-y-32">
      {/* 1. Hero Section */}
      <section className="container pt-6 md:pt-10">
        <div className="relative rounded-3xl bg-gradient-to-b from-[#F5EFE9] to-[#FAF8F5] border border-[#EAE3DC] p-8 md:p-14 lg:p-16 overflow-hidden">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Narrative */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-[#DFD7CF] text-[11px] font-semibold tracking-wider uppercase text-[#933D32] shadow-subtle">
                <Sparkles size={13} className="text-[#933D32]" />
                <span>Small-Batch Bakery &middot; Baked Fresh in Lagos</span>
              </div>

              <h1 className="serif text-5xl md:text-6xl lg:text-7xl font-normal text-[#1E1917] tracking-tight leading-[1.06]">
                Make the moment <span className="italic text-[#933D32]">sweeter.</span>
              </h1>

              <p className="text-base md:text-lg text-[#5A524D] leading-relaxed max-w-xl">
                Thoughtfully crafted celebration cakes baked to order with premium butter, fresh berry compotes, and hand-piped inscriptions. Delivered safely to your doorstep or ready for pickup.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <Link
                  href="/cakes"
                  className="inline-flex items-center gap-2 px-7 py-4 rounded-full text-sm font-semibold text-white bg-[#1E1917] hover:bg-[#332C29] transition-all shadow-card hover:shadow-card-hover"
                >
                  <span>Explore Cake Menu</span>
                  <ArrowRight size={16} />
                </Link>

                <Link
                  href="/track"
                  className="inline-flex items-center gap-2 px-6 py-4 rounded-full text-sm font-medium text-[#1E1917] bg-white border border-[#DFD7CF] hover:border-[#1E1917] transition-all shadow-subtle"
                >
                  <span>Track an Order</span>
                </Link>
              </div>

              <div className="pt-4 flex items-center gap-8 text-xs text-[#7A726D]">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2A6947]" />
                  <span>2–5 days advance notice</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2A6947]" />
                  <span>Secure Paystack payments</span>
                </div>
              </div>
            </div>

            {/* Right Hero Visual */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl overflow-hidden aspect-[0.92] shadow-card bg-[#EAE3DC]">
                <img
                  className="w-full h-full object-cover"
                  src="https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=90"
                  alt="Artisanal celebration cake with fresh berry topping"
                />

                {/* Floating Highlight Card */}
                <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md p-4 rounded-xl border border-white/60 shadow-card flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-widest text-[#933D32]">
                      Signature Recipe
                    </div>
                    <div className="serif text-base text-[#1E1917] font-medium">
                      Sunday Strawberry
                    </div>
                  </div>
                  <Link
                    href="/cakes/sunday-strawberry"
                    className="text-xs font-semibold text-[#1E1917] underline decoration-[#DFD7CF] hover:decoration-[#1E1917]"
                  >
                    View cake &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Value Pillars */}
      <section className="container">
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          <div className="bg-white rounded-2xl p-8 border border-[#EAE3DC] shadow-subtle space-y-3">
            <div className="w-11 h-11 rounded-xl bg-[#F8ECE9] text-[#933D32] flex items-center justify-center">
              <HeartHandshake size={22} />
            </div>
            <h3 className="serif text-xl text-[#1E1917] font-normal">Made Fresh to Order</h3>
            <p className="text-sm text-[#7A726D] leading-relaxed">
              We never freeze cake layers. Every single order is mixed, baked, filled, and piped specifically for your scheduled date.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 border border-[#EAE3DC] shadow-subtle space-y-3">
            <div className="w-11 h-11 rounded-xl bg-[#F8ECE9] text-[#933D32] flex items-center justify-center">
              <Truck size={22} />
            </div>
            <h3 className="serif text-xl text-[#1E1917] font-normal">Dedicated Cake Couriers</h3>
            <p className="text-sm text-[#7A726D] leading-relaxed">
              Transported flat and cold in temperature-controlled boxes across Lagos. Or pick up directly at our Lekki bakery.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 border border-[#EAE3DC] shadow-subtle space-y-3">
            <div className="w-11 h-11 rounded-xl bg-[#F8ECE9] text-[#933D32] flex items-center justify-center">
              <ShieldCheck size={22} />
            </div>
            <h3 className="serif text-xl text-[#1E1917] font-normal">Bespoke Inscriptions</h3>
            <p className="text-sm text-[#7A726D] leading-relaxed">
              Add your custom greeting card note, custom piping inscription, and celebration candles right from the cake customizer.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Featured Collection Showcase */}
      <section className="container" id="collections">
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-10">
          <div>
            <div className="eyebrow mb-1">Handpicked Recipes</div>
            <h2 className="serif text-3xl md:text-4xl text-[#1E1917] font-normal">
              The Cake Collection
            </h2>
          </div>
          <Link
            href="/cakes"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1E1917] hover:text-[#933D32] transition-colors"
          >
            <span>See all cakes</span>
            <ArrowRight size={15} />
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {products.slice(0, 3).map(p => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* 4. Occasions Editorial Grid */}
      <section className="container">
        <div className="bg-[#1E1917] text-white rounded-3xl p-8 md:p-14 lg:p-16 overflow-hidden">
          <div className="max-w-xl space-y-4 mb-10">
            <div className="text-xs uppercase font-semibold tracking-widest text-[#E8D4CF]">
              For every milestone
            </div>
            <h2 className="serif text-3xl md:text-5xl font-normal tracking-tight text-white">
              A reason is optional.<br />Cake is not.
            </h2>
            <p className="text-sm text-[#A39993] leading-relaxed">
              Whether celebrating another spin around the sun, a wedding milestone, or an intimate weekend gathering.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map(category => (
              <Link
                key={category}
                href={`/cakes?category=${encodeURIComponent(category)}`}
                className="group relative p-6 rounded-2xl bg-[#282220] hover:bg-[#332C29] border border-[#3D3430] hover:border-[#E8D4CF]/30 transition-all flex flex-col justify-between min-h-[140px]"
              >
                <div className="text-xs text-[#A39993] uppercase tracking-wider font-medium">
                  Occasion
                </div>
                <div className="serif text-xl text-white font-normal group-hover:text-[#E8D4CF] transition-colors flex items-center justify-between">
                  <span>{category}</span>
                  <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Bakery Promise Banner */}
      <section className="container text-center py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="eyebrow">The Speed Cake Promise</div>
          <h2 className="serif text-4xl md:text-5xl text-[#1E1917] font-normal leading-tight">
            There’s always time for something lovely.
          </h2>
          <p className="text-base text-[#7A726D] leading-relaxed">
            Select your cake, personalize your size and message, and our bakers will take care of the rest. We provide real-time tracking from oven to delivery.
          </p>
          <div className="pt-2">
            <Link
              href="/cakes"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-sm font-semibold text-white bg-[#1E1917] hover:bg-[#332C29] transition-all shadow-card hover:shadow-card-hover"
            >
              <span>Order Your Celebration Cake</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
