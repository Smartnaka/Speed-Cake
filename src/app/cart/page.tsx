'use client'
import Link from 'next/link'
import {useEffect,useState} from 'react'
import {useRouter} from 'next/navigation'
import {Minus,Plus,Trash2,Loader2} from 'lucide-react'
import {CartItem,readCart,writeCart} from '@/lib/cart'
import {naira} from '@/lib/demo-products'
import {supabaseBrowser} from '@/lib/supabase/browser'
export default function Cart(){
  const [items,setItems]=useState<CartItem[]>([]);
  const [checkingOut,setCheckingOut]=useState(false);
  const router=useRouter();
  useEffect(()=>setItems(readCart()),[]);
  function save(next:CartItem[]){setItems(next);writeCart(next)}
  const subtotal=items.reduce((a,x)=>a+x.unitPrice*x.quantity,0);
  async function handleCheckout(e:React.MouseEvent){
    e.preventDefault();
    if(!items.length)return;
    setCheckingOut(true);
    try{
      const db=supabaseBrowser();
      const {data:{session}}=await db.auth.getSession();
      if(session){
        router.push('/checkout');
      }else{
        router.push('/account?next=%2Fcheckout');
      }
    }catch{
      router.push('/account?next=%2Fcheckout');
    }finally{
      setCheckingOut(false);
    }
  }
  return <main className="container py-16 min-h-[45vh]"><div className="eyebrow">Your picks</div><h1 className="serif text-5xl mt-2">Your bag</h1>{items.length===0?<div className="text-center py-24"><p className="serif text-2xl">A little room for something sweet.</p><Link className="inline-block mt-6 bg-[#6f3d36] text-white px-6 py-4 text-sm" href="/cakes">Explore the cakes</Link></div>:<div className="grid lg:grid-cols-[1fr_350px] gap-12 mt-10"><div className="grid gap-5">{items.map(item=><div key={item.key} className="flex gap-5 border-b border-[#e5d9d1] pb-5"><img src={item.image} alt="" className="w-28 h-32 object-cover"/><div className="flex-1"><Link href={`/cakes/${item.slug}`} className="serif text-xl">{item.name}</Link><div className="text-xs text-[#756862] mt-2">{item.size}{item.message&&` · “${item.message}”`}</div>{Object.values(item.choices||{}).flat().map(c=><div key={c.value} className="text-xs text-[#756862] mt-1">{c.label}{c.fee_kobo?` · +${naira(c.fee_kobo)}`:''}</div>)}<div className="font-medium text-sm mt-3">{naira(item.unitPrice)}</div><div className="flex gap-4 mt-4 items-center"><button aria-label="Decrease quantity" onClick={()=>save(items.map(x=>x.key===item.key?{...x,quantity:Math.max(1,x.quantity-1)}:x))}><Minus size={14}/></button><span className="text-sm">{item.quantity}</span><button aria-label="Increase quantity" onClick={()=>save(items.map(x=>x.key===item.key?{...x,quantity:Math.min(30,x.quantity+1)}:x))}><Plus size={14}/></button><button aria-label="Remove item" className="ml-2 text-[#8b6b63]" onClick={()=>save(items.filter(x=>x.key!==item.key))}><Trash2 size={15}/></button></div></div><b className="text-sm">{naira(item.unitPrice*item.quantity)}</b></div>)}</div><aside className="bg-[#f2e5de] p-6 h-fit"><h2 className="serif text-2xl">Order summary</h2><div className="flex justify-between mt-7 text-sm"><span>Subtotal</span><span>{naira(subtotal)}</span></div><p className="text-xs text-[#756862] mt-3">Delivery is calculated for your area at checkout.</p><div className="border-t border-[#dac8be] mt-5 pt-5 flex justify-between"><b>Total</b><b>{naira(subtotal)}</b></div><button onClick={handleCheckout} disabled={checkingOut} className="w-full block text-center mt-6 bg-[#6f3d36] text-white py-4 text-sm disabled:opacity-60 flex items-center justify-center gap-2">{checkingOut?<><Loader2 className="animate-spin inline" size={16}/><span>Checking account…</span></>:<span>Continue to checkout</span>}</button><Link href="/cakes" className="block text-center text-sm mt-4">Continue shopping</Link></aside></div>}</main>}

