'use client'
import {useEffect,useState} from 'react'
import {useRouter} from 'next/navigation'
import {useForm} from 'react-hook-form'
import {zodResolver} from '@hookform/resolvers/zod'
import {checkoutSchema} from '@/lib/schemas'
import {CartItem,readCart} from '@/lib/cart'
import {naira} from '@/lib/demo-products'
import {supabaseBrowser} from '@/lib/supabase/browser'
type Form={name:string;email:string;phone:string;address:string;city:string;state:string;landmark?:string;instructions?:string;delivery_date:string;delivery_window:string}
const input='w-full border border-[#ded0c8] bg-transparent px-3 py-3 text-sm outline-none focus:border-[#6f3d36]'
export default function Checkout(){
 const [items,setItems]=useState<CartItem[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(false),[authReady,setAuthReady]=useState(false),[windows,setWindows]=useState<string[]>([]),[checkingWindows,setCheckingWindows]=useState(false)
 const router=useRouter()
 const {register,handleSubmit,formState:{errors},setValue,watch}=useForm<Form>({resolver:zodResolver(checkoutSchema.omit({items:true}))})
 const state=watch('state'),city=watch('city'),date=watch('delivery_date')
 useEffect(()=>{setItems(readCart());supabaseBrowser().auth.getSession().then(({data})=>{if(!data.session){router.replace('/account?next=%2Fcheckout');return}setAuthReady(true);setValue('email',data.session.user.email||'');setValue('name',data.session.user.user_metadata?.full_name||'')})},[router,setValue])
 useEffect(()=>{setWindows([]);if(!state||!city||!date||!items.length)return;let live=true;setCheckingWindows(true);const query=new URLSearchParams({state,city,date,products:[...new Set(items.map(i=>i.productId))].join(',')});fetch(`/api/delivery-options?${query}`).then(r=>r.json()).then(d=>{if(live)setWindows(Array.isArray(d.windows)?d.windows:[])}).catch(()=>{if(live)setWindows([])}).finally(()=>{if(live)setCheckingWindows(false)});return()=>{live=false}},[state,city,date,items])
 const subtotal=items.reduce((a,x)=>a+x.unitPrice*x.quantity,0)
 async function submit(values:Form){
  setError('');if(!items.length){setError('Your bag is empty.');return}setLoading(true)
  try{
   const {data:{session}}=await supabaseBrowser().auth.getSession();if(!session){router.replace('/account?next=%2Fcheckout');return}
   const orderItems=items.map(item=>({productId:item.productId,variantId:item.variantId,quantity:item.quantity,customization:{message:item.message,choices:Object.fromEntries(Object.entries(item.choices||{}).map(([id,choices])=>[id,choices.map(choice=>choice.value)]))}}))
   const response=await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({...values,items:orderItems})})
   const data=await response.json()
   if(data.authorization_url){localStorage.setItem('speedcake-last-order',JSON.stringify({order_number:data.order_number}));window.location.href=data.authorization_url;return}
   setError(data.error||'We could not start checkout.')
  }catch{setError('We could not connect. Please try again.')}finally{setLoading(false)}
 }
 if(!authReady)return <main className="container py-20">Checking your account…</main>
 return <main className="container py-14"><div className="eyebrow">Almost there</div><h1 className="serif text-5xl mt-2">Checkout</h1><div className="grid lg:grid-cols-[1fr_360px] gap-12 mt-10"><form className="grid sm:grid-cols-2 gap-4" onSubmit={handleSubmit(submit)}><h2 className="serif text-2xl sm:col-span-2">Where should we bring it?</h2>{([['name','Full name','text'],['email','Email address','email'],['phone','Phone number','tel'],['address','Street address','text'],['city','City','text'],['state','State','text'],['landmark','Landmark (optional)','text'],['delivery_date','Preferred date','date']] as const).map(([key,label,type])=><label className={key==='address'?'sm:col-span-2':''} key={key}><span className="text-xs block mb-2">{label}</span><input className={input} type={type} {...register(key)}/>{errors[key]&&<span className="text-xs text-red-700">{errors[key]?.message}</span>}</label>)}<label><span className="text-xs block mb-2">Delivery window</span><select className={input} {...register('delivery_window')} disabled={checkingWindows||!windows.length}><option value="">{checkingWindows?'Checking availability…':'Choose an available window'}</option>{windows.map(w=><option key={w} value={w}>{w}</option>)}</select>{errors.delivery_window&&<span className="text-xs text-red-700">Choose an available delivery window.</span>}{state&&city&&date&&!checkingWindows&&!windows.length&&<span className="text-xs text-[#756862]">No configured delivery windows are available for this area and date.</span>}</label><label className="sm:col-span-2"><span className="text-xs block mb-2">Delivery notes (optional)</span><textarea rows={3} className={input} {...register('instructions')}/></label><div className="sm:col-span-2"><p className="text-xs text-[#756862]">Delivery dates, configured time windows, and charges are checked against the delivery settings before payment.</p>{error&&<p role="alert" className="text-sm text-red-700 mt-3">{error}</p>}<button disabled={loading||!items.length} className="w-full mt-5 bg-[#6f3d36] text-white py-4 text-sm disabled:opacity-50">{loading?'Preparing secure payment…':'Continue to secure payment'}</button></div></form><aside className="bg-[#f2e5de] p-6 h-fit"><h2 className="serif text-2xl">Your order</h2>{items.map(i=><div key={i.key} className="flex justify-between gap-4 mt-5 text-sm"><span>{i.quantity} × {i.name}<small className="block text-xs text-[#756862] mt-1">{i.size}</small>{Object.values(i.choices||{}).flat().map(c=><small key={c.value} className="block text-xs text-[#756862] mt-1">{c.label}</small>)}{i.message&&<small className="block text-xs text-[#756862] mt-1">Message: {i.message}</small>}</span><span>{naira(i.unitPrice*i.quantity)}</span></div>)}<div className="border-t border-[#dac8be] mt-6 pt-5 flex justify-between text-sm"><span>Subtotal</span><span>{naira(subtotal)}</span></div><div className="flex justify-between mt-3 text-sm"><span>Delivery</span><span>Calculated for your area</span></div><p className="text-xs text-[#756862] mt-5 leading-5">Final delivery charge is verified using your configured delivery zone.</p></aside></div></main>
}
