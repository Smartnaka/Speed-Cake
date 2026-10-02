'use client'
import {useState} from 'react'
import {useRouter} from 'next/navigation'
import {Check,Minus,Plus,ShoppingBag,Loader2} from 'lucide-react'
import type {Product} from '@/lib/demo-products'
import {naira} from '@/lib/demo-products'
import {addCartItem} from '@/lib/cart'
import type {CartChoice, CartItem} from '@/lib/cart'
import {supabaseBrowser} from '@/lib/supabase/browser'
export function ProductDetails({product}:{product:Product}){
 const [size,setSize]=useState(product.sizes[0]);const [qty,setQty]=useState(1);const [message,setMessage]=useState('');const [added,setAdded]=useState(false);const [ordering,setOrdering]=useState(false);const [selected,setSelected]=useState<Record<string,CartChoice[]>>({});const router=useRouter();const groups=product.customizations||[];const extras=Object.values(selected).flat().reduce((n,x)=>n+x.fee_kobo,0);const total=(size.price_kobo+extras)*qty;
 function choose(id:string,choice:CartChoice,multiple:boolean,checked:boolean){setSelected(old=>{const current=old[id]||[];const next=multiple?(checked?[...current.filter(x=>x.value!==choice.value),choice]:current.filter(x=>x.value!==choice.value)):(checked?[choice]:[]);return {...old,[id]:next}})}
 async function add(buy=false){
  const variantId=size.id||size.name;
  if(!variantId)return;
  const choices=Object.fromEntries(Object.entries(selected).filter(([id,list])=>groups.some(g=>g.id===id)&&(list||[]).length>0));
  const sortedChoiceEntries=Object.entries(choices).sort(([a],[b])=>a.localeCompare(b));
  const labels=sortedChoiceEntries.flatMap(([_,list])=>list.map(x=>x.label).sort()).join(',');
  const trimmedMessage=message.trim();
  const item:CartItem={key:`${product.id}:${variantId}:${trimmedMessage}:${labels}`,productId:product.id,variantId,slug:product.slug,name:product.name,image:product.image,size:size.name,unitPrice:size.price_kobo+extras,quantity:qty,message:trimmedMessage,choices};
  if(buy){
   setOrdering(true);
   addCartItem(item,{replace:true});
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
    setOrdering(false);
   }
  }else{
   addCartItem(item);
   setAdded(true);
  }
 }
 return <main className="container py-12"><div className="grid md:grid-cols-2 gap-10 lg:gap-16"><div className="bg-[#f0e6dc]"><img src={product.image} alt={product.name} className="w-full aspect-[.92] object-cover"/></div><div className="py-3"><div className="eyebrow">{product.category} · made to order</div><h1 className="serif text-5xl mt-3">{product.name}</h1><p className="text-[#6f3d36] mt-4 text-xl">From {naira(product.price_kobo)}</p><p className="text-[#756862] leading-7 mt-6">{product.description}</p>
 <div className="mt-8"><label className="block text-xs uppercase tracking-widest mb-3">Choose your size</label><div className="grid gap-2">{product.sizes.map(s=><button key={s.id||s.name} onClick={()=>setSize(s)} className={`flex justify-between border px-4 py-4 text-sm ${size.name===s.name?'border-[#6f3d36] bg-[#f3e5df]':'border-[#ded0c8]'}`}><span>{s.name}</span><span>{naira(s.price_kobo)}</span></button>)}</div></div>
 {groups.map(g=><fieldset key={g.id} className="mt-7"><legend className="block text-xs uppercase tracking-widest mb-3">{g.label}{g.kind==='addon'?' (optional)':''}</legend><div className="grid grid-cols-2 gap-2">{g.options.map(o=><label key={o.value} className="flex items-center gap-2 border border-[#ded0c8] p-3 text-sm"><input type={g.kind==='addon'?'checkbox':'radio'} name={g.id} checked={(selected[g.id]||[]).some(x=>x.value===o.value)} onChange={e=>choose(g.id,o,g.kind==='addon',e.target.checked)}/><span className="flex-1">{o.label}</span>{o.fee_kobo>0&&<small>+{naira(o.fee_kobo)}</small>}</label>)}</div></fieldset>)}
 <div className="mt-7"><label htmlFor="inscription" className="block text-xs uppercase tracking-widest mb-2">A little message (optional)</label><input maxLength={45} id="inscription" value={message} onChange={e=>setMessage(e.target.value)} placeholder="e.g. Happy birthday, Ada!" className="w-full border border-[#ded0c8] bg-transparent p-3 text-sm outline-none focus:border-[#6f3d36]"/><div className="text-right text-xs text-[#98857e] mt-1">{message.length}/45</div></div>
 <div className="mt-7 flex gap-4 items-center"><div className="flex border border-[#ded0c8] items-center"><button aria-label="Decrease quantity" className="p-3" onClick={()=>setQty(Math.max(1,qty-1))}><Minus size={15}/></button><span className="w-7 text-center text-sm">{qty}</span><button aria-label="Increase quantity" className="p-3" onClick={()=>setQty(Math.min(30,qty+1))}><Plus size={15}/></button></div><span className="text-xs text-[#756862]">Made fresh · {product.lead_days} days’ notice</span></div><div className="mt-7 text-sm flex justify-between border-t border-[#ded0c8] pt-4"><span>Your cake total</span><b>{naira(total)}</b></div><button disabled={ordering} onClick={()=>add()} className="w-full mt-5 bg-[#6f3d36] text-white py-4 text-sm disabled:opacity-60">{added?<><Check className="inline mr-2" size={16}/>Added to your bag</>:<><ShoppingBag className="inline mr-2" size={16}/>Add to bag</>}</button><button disabled={ordering} onClick={()=>add(true)} className="w-full mt-3 border border-[#6f3d36] py-4 text-sm disabled:opacity-60 flex items-center justify-center gap-2">{ordering?<><Loader2 className="animate-spin inline" size={16}/><span>Checking account…</span></>:<span>Order Cake · {naira(total)}</span>}</button><p className="mt-5 text-xs leading-5 text-[#867872]">Please order at least {product.lead_days} days ahead. Delivery availability is confirmed at checkout.</p></div></div></main>
}
