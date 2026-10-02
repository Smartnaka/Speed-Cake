'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import {useSearchParams,useRouter} from 'next/navigation'
import {Suspense} from 'react'
import {supabaseBrowser} from '@/lib/supabase/browser'
import {naira} from '@/lib/demo-products'
import {safeReturnPath} from '@/lib/schemas'

function AccountContent(){
  const params=useSearchParams(),router=useRouter()
  const [mode,setMode]=useState<'login'|'signup'|'reset'|'new-password'>('login')
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[name,setName]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[session,setSession]=useState<any>(null),[orders,setOrders]=useState<any[]>([])
  const next=params.get('next')||'/account'
  const safeNext=safeReturnPath(next)
  const isOrderFlow=safeNext.startsWith('/checkout')

  useEffect(()=>{
    try{
      const db=supabaseBrowser();
      db.auth.getSession().then(({data})=>{
        setSession(data.session);
        if(data.session&&safeNext!=='/account'){
          router.replace(safeNext);
        }
      });
      const {data:{subscription}}=db.auth.onAuthStateChange((event,current)=>{
        setSession(current);
        if(event==='PASSWORD_RECOVERY')setMode('new-password');
        if(current&&safeNext!=='/account'&&(event==='SIGNED_IN'||event==='INITIAL_SESSION')){
          router.replace(safeNext);
        }
      });
      return()=>subscription.unsubscribe();
    }catch{}
  },[safeNext,router])

  useEffect(()=>{
    if(!session)return;
    try{
      const db=supabaseBrowser();
      db.from('orders').select('id,order_number,total_kobo,status,payment_status,created_at,order_items(product_snapshot,quantity)').order('created_at',{ascending:false}).then(({data,error})=>{
        if(error)setMessage('Your orders could not be loaded right now.');
        else setOrders(data||[]);
      });
    }catch{}
  },[session])

  async function submit(e:React.FormEvent){
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try{
      const db=supabaseBrowser();
      if(mode==='signup'){
        const r=await fetch('/api/auth/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,password})});
        const d=await r.json();
        if(!r.ok)throw new Error(d.error);
        const signed=await db.auth.signInWithPassword({email,password});
        if(signed.error)throw signed.error;
        router.replace(safeNext);
        return;
      }
      if(mode==='reset'){
        const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:`${location.origin}/account`});
        if(error)throw error;
        setMessage('If an account uses this email, a password reset link is on its way.');
        return;
      }
      if(mode==='new-password'){
        const {error}=await db.auth.updateUser({password});
        if(error)throw error;
        setMode('login');
        setPassword('');
        setMessage('Your password has been updated. Sign in to continue.');
        return;
      }
      const {error}=await db.auth.signInWithPassword({email,password});
      if(error)throw error;
      router.replace(safeNext);
    }catch(e){
      setMessage(e instanceof Error?e.message:'Account request failed. Please try again.');
    }finally{
      setBusy(false);
    }
  }

  async function logout(){
    try{
      await supabaseBrowser().auth.signOut();
    }catch{}
    setOrders([]);
    setSession(null);
    setMessage('You are signed out.');
  }

  if(session){
    if(safeNext!=='/account'){
      return <main className="container py-20 min-h-[50vh] text-center"><p className="text-sm text-[#756862]">Redirecting to your order…</p></main>;
    }
    return (
      <main className="container py-14 min-h-[55vh]">
        <div className="flex flex-wrap justify-between gap-4 items-end">
          <div>
            <div className="eyebrow">Your Speed Cake</div>
            <h1 className="serif text-5xl mt-2">Your account</h1>
            <p className="text-sm text-[#756862] mt-2">{session.user.email}</p>
          </div>
          <button onClick={logout} className="border border-[#6f3d36] px-5 py-3 text-sm">Sign out</button>
        </div>
        <section className="mt-10">
          <h2 className="serif text-3xl">Your orders</h2>
          {orders.length===0?(
            <div className="border border-[#e5d9d1] p-8 mt-5 text-sm text-[#756862]">
              No orders yet. <Link className="underline text-[#6f3d36]" href="/cakes">Browse cakes</Link>
            </div>
          ):(
            <div className="grid gap-3 mt-5">
              {orders.map(o=>(
                <Link href={`/account/orders/${o.order_number}`} key={o.id} className="border border-[#e5d9d1] p-5 flex flex-wrap justify-between gap-4">
                  <span>
                    <b>{o.order_number}</b>
                    <small className="block mt-2 text-[#756862]">{(o.order_items||[]).map((i:any)=>`${i.quantity} × ${i.product_snapshot?.name||'Cake'}`).join(', ')}</small>
                  </span>
                  <span className="text-right text-sm">
                    {naira(o.total_kobo)}
                    <small className="block mt-2 capitalize">{o.status.replaceAll('_',' ')} · {o.payment_status}</small>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="container py-16 min-h-[55vh]">
      <div className="max-w-md mx-auto">
        <div className="eyebrow">Your Speed Cake</div>
        <h1 className="serif text-5xl mt-3">
          {mode==='login'?'Welcome back':mode==='signup'?'Create an account':mode==='reset'?'Reset password':'Choose a new password'}
        </h1>
        <p className="text-sm text-[#756862] mt-3">
          {isOrderFlow
            ? 'Create an account or log in to continue with your order.'
            : mode==='signup'
            ? 'Create your account to continue with your cake order.'
            : mode==='login'
            ? 'Sign in to continue your order and see updates.'
            : 'We’ll help you get back into your account.'}
        </p>
        {isOrderFlow&&(
          <div className="mt-6 p-4 bg-[#f8ede6] border border-[#e5d2c7] text-sm text-[#5a342e]">
            <p className="font-semibold">Create an account or log in to continue with your order.</p>
            <p className="text-xs text-[#756862] mt-1">Your cake configuration is safely saved and ready for checkout.</p>
          </div>
        )}
        {mode!=='reset'&&mode!=='new-password'&&(
          <div className="flex border-b border-[#ded0c8] mt-6 mb-4">
            <button
              type="button"
              onClick={()=>{setMessage('');setMode('login')}}
              className={`pb-3 text-sm flex-1 font-medium transition ${mode==='login'?'border-b-2 border-[#6f3d36] text-[#6f3d36]':'text-[#867872]'}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={()=>{setMessage('');setMode('signup')}}
              className={`pb-3 text-sm flex-1 font-medium transition ${mode==='signup'?'border-b-2 border-[#6f3d36] text-[#6f3d36]':'text-[#867872]'}`}
            >
              Create account
            </button>
          </div>
        )}
        <form className="grid gap-4 mt-6" onSubmit={submit}>
          {mode==='signup'&&(
            <input required value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" autoComplete="name" className="border border-[#ded0c8] bg-transparent p-3 text-sm"/>
          )}
          {mode!=='new-password'&&(
            <input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address" autoComplete="email" className="border border-[#ded0c8] bg-transparent p-3 text-sm"/>
          )}
          {mode!=='reset'&&(
            <input required minLength={8} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==='new-password'?'New password (8+ characters)':'Password (8+ characters)'} autoComplete={mode==='login'?'current-password':'new-password'} className="border border-[#ded0c8] bg-transparent p-3 text-sm"/>
          )}
          <button disabled={busy} className="bg-[#6f3d36] py-4 text-sm text-white disabled:opacity-60">
            {busy?'Please wait…':mode==='login'?'Sign in':mode==='signup'?'Create account':mode==='reset'?'Send reset link':'Save new password'}
          </button>
        </form>
        {message&&<p role="status" className="text-sm mt-4 text-[#8b3d33]">{message}</p>}
        <div className="flex justify-between text-xs mt-5 underline">
          {mode!=='new-password'&&(
            <button type="button" onClick={()=>{setMessage('');setMode(mode==='login'?'signup':'login')}}>
              {mode==='login'?'Need an account? Create one':'Already have an account? Sign in'}
            </button>
          )}
          {mode!=='new-password'&&(
            <button type="button" onClick={()=>{setMessage('');setMode('reset')}}>
              Forgot password?
            </button>
          )}
        </div>
        <p className="text-center text-xs text-[#756862] mt-8">
          <Link className="underline" href="/cakes">Continue browsing cakes</Link>
        </p>
      </div>
    </main>
  );
}
export default function Account(){return <Suspense fallback={<main className="container py-20">Loading account…</main>}><AccountContent/></Suspense>}

