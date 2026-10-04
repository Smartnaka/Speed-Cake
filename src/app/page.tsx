import Link from 'next/link'
import { ArrowRight, Sparkles, ShieldCheck, HeartHandshake, Truck, Cake } from 'lucide-react'
import { getProducts } from '@/lib/products'
import { ProductCard } from '@/components/product-card'

export default async function Home() {
  const products = await getProducts()
  const categories = [...new Set(products.map(p => p.category))]
  const signatureCake = products.find(p => p.slug === 'sunday-strawberry') || products[0]

  return (
    <main className="space-y-20 md:space-y-28">
      {/* 1. Hero Section Inspired by Visual Reference */}
      <section className="container pt-4 md:pt-8">
        <div className="relative rounded-[2.5rem] bg-white border-2 border-[#FAD1E0] p-6 sm:p-10 md:p-14 lg:p-16 shadow-card overflow-hidden">
          {/* Subtle Pinkish Background Gradient & Scattered Berry Dots */}
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#FFE4EE]/60 blur-3xl -z-10 pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-[#FFF0F5]/80 blur-3xl -z-10 pointer-events-none" />

          {/* Floating Strawberry Petal Decors */}
          <span className="hidden lg:block absolute top-10 left-1/2 text-xl select-none animate-bounce duration-1000">🍓</span>
          <span className="hidden lg:block absolute bottom-12 left-1/3 text-lg select-none">🌸</span>
          <span className="hidden lg:block absolute top-20 right-10 text-xl select-none">✨</span>

          <div className="grid lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* Left Narrative */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2">
                <span className="handwriting text-2xl md:text-3xl text-[#E60067] font-bold tracking-wide">
                  Every One Loves —
                </span>
                <span className="text-xl">✨</span>
              </div>

              <h1 className="font-extrabold text-4xl sm:text-5xl md:text-6xl text-[#2A1E24] tracking-tight leading-[1.08]">
                Natural and <br className="hidden sm:inline" />
                <span className="text-[#E60067] relative inline-block">
                  healthy Cakes.
                  <svg className="absolute -bottom-2 left-0 w-full text-[#FAD1E0] h-3 -z-10" viewBox="0 0 100 20" preserveAspectRatio="none">
                    <path d="M0,10 Q50,0 100,10 Q50,20 0,10" fill="currentColor" />
                  </svg>
                </span>
              </h1>

              <p className="text-base md:text-lg text-[#55424D] leading-relaxed max-w-xl">
                Artisanal celebration cakes baked fresh to order in Lagos using 100% natural butter, fresh berry compotes, and hand-piped bespoke messages. Pure joy delivered right to your doorstep.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <Link
                  href="/cakes"
                  className="inline-flex items-center justify-center px-8 py-4 rounded-full text-xs font-black uppercase tracking-wider text-white bg-[#E60067] hover:bg-[#C70055] transition-all duration-200 shadow-pink-glow hover:scale-105 active:scale-95"
                >
                  ORDER NOW
                </Link>

                <Link
                  href="/cakes"
                  className="inline-flex items-center justify-center px-8 py-4 rounded-full text-xs font-black uppercase tracking-wider text-[#E60067] bg-white border-2 border-[#E60067] hover:bg-[#FFEBF2] transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  EXPLORE MORE
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="pt-4 flex flex-wrap items-center gap-6 text-xs font-bold text-[#8A7380]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E60067]" />
                  <span>Small-Batch Lagos Bakery</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E60067]" />
                  <span>Fast Temperature-Safe Delivery</span>
                </div>
              </div>
            </div>

            {/* Right Hero Arch Frame with Featured Cake */}
            <div className="lg:col-span-5 relative flex justify-center">
              <div className="relative w-full max-w-[340px] sm:max-w-[380px]">
                {/* Floating "WE CARE ABOUT YOUR CAKE" Circular Stamp */}
                <div className="absolute -top-5 -left-5 sm:-top-7 sm:-left-7 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white border-2 border-dashed border-[#E60067] shadow-card flex flex-col items-center justify-center text-center p-2 z-20">
                  <span className="text-[8px] sm:text-[9px] font-black text-[#E60067] uppercase tracking-wider leading-none">
                    WE CARE
                  </span>
                  <Cake size={16} className="text-[#E60067] my-0.5 sm:my-1" />
                  <span className="text-[7px] sm:text-[8px] font-extrabold text-[#2A1E24] uppercase tracking-tight leading-none">
                    ABOUT CAKE!
                  </span>
                </div>

                {/* Iconic Arched Cake Container */}
                <div className="arch-card border-4 border-[#E60067] p-2 bg-white shadow-card overflow-hidden relative">
                  <div className="arch-card overflow-hidden aspect-[0.9] bg-[#FFEBF2] relative">
                    <img
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                      src="https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=1000&q=85"
                      alt="Natural and fresh berry cake"
                    />
                  </div>
                </div>

                {/* Floating Golden Star Rating Pill */}
                <div className="absolute -bottom-4 -right-3 sm:-bottom-5 sm:-right-4 bg-[#2A1E24] text-white px-4 py-2 sm:py-2.5 rounded-2xl flex items-center gap-2 shadow-card z-20">
                  <div className="flex text-[#FFB800] text-sm tracking-tighter">★★★★★</div>
                  <span className="text-xs font-black tracking-wide">4.9</span>
                </div>

                {/* Decorative Fruit Accents */}
                <span className="absolute -top-3 right-6 text-xl select-none">🍓</span>
                <span className="absolute bottom-2 -left-4 text-xl select-none">🍓</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Value Pillars */}
      <section className="container">
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          <div className="bg-white rounded-3xl p-8 border border-[#FAD1E0] shadow-card space-y-3 hover:border-[#E60067] transition-all">
            <div className="w-12 h-12 rounded-2xl bg-[#FFEBF2] text-[#E60067] flex items-center justify-center">
              <HeartHandshake size={24} />
            </div>
            <h3 className="text-xl text-[#2A1E24] font-extrabold">100% Fresh to Order</h3>
            <p className="text-sm text-[#55424D] leading-relaxed">
              We never freeze cake sponges. Every single order is mixed, baked, layered with fruit compote, and iced right on schedule.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-[#FAD1E0] shadow-card space-y-3 hover:border-[#E60067] transition-all">
            <div className="w-12 h-12 rounded-2xl bg-[#FFEBF2] text-[#E60067] flex items-center justify-center">
              <Truck size={24} />
            </div>
            <h3 className="text-xl text-[#2A1E24] font-extrabold">Gentle Cake Couriers</h3>
            <p className="text-sm text-[#55424D] leading-relaxed">
              Transported flat and cold in protective temperature-controlled boxes across Lagos. Or pick up directly at our bakery.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-[#FAD1E0] shadow-card space-y-3 hover:border-[#E60067] transition-all">
            <div className="w-12 h-12 rounded-2xl bg-[#FFEBF2] text-[#E60067] flex items-center justify-center">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-xl text-[#2A1E24] font-extrabold">Custom Piping & Candles</h3>
            <p className="text-sm text-[#55424D] leading-relaxed">
              Personalize with your recipient&apos;s name, age candles, custom greeting card messages, and gourmet sparklers in one click.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Featured Collection Showcase */}
      <section className="container" id="collections">
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-8">
          <div>
            <div className="eyebrow mb-1">Our Confectionery Bestsellers</div>
            <h2 className="text-3xl md:text-4xl text-[#2A1E24] font-extrabold tracking-tight">
              Freshly Baked For You
            </h2>
          </div>
          <Link
            href="/cakes"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#E60067] hover:text-[#C70055] transition-colors"
          >
            <span>See full collection</span>
            <ArrowRight size={16} />
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
        <div className="bg-[#2A1722] text-white rounded-[2.5rem] p-8 md:p-14 lg:p-16 overflow-hidden relative shadow-card">
          <div className="max-w-xl space-y-4 mb-10">
            <div className="text-xs uppercase font-extrabold tracking-widest text-[#FFB3D1]">
              For Every Special Occasion
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white">
              Every celebration deserves a cake.
            </h2>
            <p className="text-sm text-[#E0D0D9] leading-relaxed">
              Birthdays, romantic anniversaries, corporate milestones, or spontaneous weekend cravings.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map(category => (
              <Link
                key={category}
                href={`/cakes?category=${encodeURIComponent(category)}`}
                className="group relative p-6 rounded-3xl bg-[#3D2533] hover:bg-[#E60067] border border-[#553849] hover:border-[#E60067] transition-all flex flex-col justify-between min-h-[140px] shadow-subtle"
              >
                <div className="text-xs text-[#FFB3D1] uppercase tracking-wider font-bold group-hover:text-white">
                  Celebrate
                </div>
                <div className="text-xl text-white font-extrabold group-hover:text-white transition-colors flex items-center justify-between">
                  <span>{category}</span>
                  <ArrowRight size={18} className="transform group-hover:translate-x-1.5 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Bakery Promise Banner */}
      <section className="container text-center py-6">
        <div className="max-w-2xl mx-auto space-y-6 bg-white border border-[#FAD1E0] rounded-[2.5rem] p-10 md:p-14 shadow-card">
          <div className="eyebrow">The Speed Cake Promise</div>
          <h2 className="text-3xl md:text-4xl text-[#2A1E24] font-extrabold leading-tight">
            Happiness in every slice.
          </h2>
          <p className="text-base text-[#55424D] leading-relaxed">
            Select your favorite recipe, personalize your cake inscription, and our pastry chefs handle everything with love. Real-time tracking from oven to delivery.
          </p>
          <div className="pt-2">
            <Link
              href="/cakes"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-xs font-black uppercase tracking-wider text-white bg-[#E60067] hover:bg-[#C70055] transition-all duration-200 shadow-pink-glow hover:scale-105 active:scale-95"
            >
              <span>ORDER YOUR CELEBRATION CAKE</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
