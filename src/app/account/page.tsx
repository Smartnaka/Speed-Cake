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
  const initialMode = params.get('mode') === 'signup' ? 'signup' as const : 'login' as const
  const [mode,setMode]=useState<'login'|'signup'|'reset'|'new-password'>(initialMode)
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
      return <main className="container py-24 min-h-[50vh] text-center"><p className="text-sm text-[#8A7380] font-medium">Redirecting to your order…</p></main>;
    }
    return (
      <main className="container py-10 md:py-14 min-h-[60vh] space-y-8">
        <div className="bg-white rounded-3xl border border-[#FAD1E0] p-6 sm:p-10 shadow-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <div className="eyebrow">Client Portal</div>
            <h1 className="text-3xl sm:text-4xl text-[#2A1E24] font-extrabold mt-1">Your Account</h1>
            <p className="text-sm text-[#8A7380] mt-1 font-medium">{session.user.email}</p>
          </div>
          <button
            onClick={logout}
            className="px-6 py-2.5 rounded-full border border-[#FAD1E0] bg-white hover:border-[#E60067] text-xs font-bold text-[#2A1E24] hover:text-[#E60067] transition shadow-subtle"
          >
            Sign out
          </button>
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl text-[#2A1E24] font-extrabold">Your Past Orders</h2>
            <Link href="/cakes" className="text-xs font-bold text-[#E60067] hover:underline">
              Browse More Cakes &rarr;
            </Link>
          </div>

          {orders.length===0?(
            <div className="bg-white rounded-3xl border border-[#FAD1E0] p-10 text-center space-y-3 shadow-card">
              <p className="text-sm text-[#8A7380]">You haven’t placed any celebration orders yet.</p>
              <Link className="inline-block px-7 py-3 rounded-full bg-[#E60067] text-white text-xs font-black uppercase tracking-wider shadow-pink-glow hover:bg-[#C70055] transition" href="/cakes">
                Browse Cake Menu
              </Link>
            </div>
          ):(
            <div className="grid gap-3">
              {orders.map(o=>(
                <Link
                  href={`/account/orders/${o.order_number}`}
                  key={o.id}
                  className="bg-white rounded-2xl border border-[#FAD1E0] hover:border-[#E60067] p-5 sm:p-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition shadow-subtle hover:shadow-card"
                >
                  <div className="space-y-1">
                    <div className="font-extrabold text-base text-[#2A1E24] flex items-center gap-2">
                      <span className="font-mono">{o.order_number}</span>
                      <span className="text-xs px-3 py-0.5 rounded-full bg-[#FFE4EE] border border-[#FAD1E0] text-[#E60067] font-black capitalize">
                        {o.status.replaceAll('_',' ')}
                      </span>
                    </div>
                    <div className="text-xs text-[#8A7380]">
                      {(o.order_items||[]).map((i:any)=>`${i.quantity} × ${i.product_snapshot?.name||'Cake'}`).join(', ')}
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <div className="font-black text-base text-[#2A1E24]">
                      {naira(o.total_kobo)}
                    </div>
                    <div className="text-[11px] text-[#8A7380] capitalize mt-0.5">
                      Payment: <b className="text-[#2A1E24]">{o.payment_status}</b>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="container py-10 md:py-14 min-h-[60vh]">
      <div className="max-w-md mx-auto bg-white rounded-3xl border border-[#FAD1E0] p-8 sm:p-10 shadow-card">
        <div className="text-center space-y-2 mb-6">
          <div className="eyebrow">Your Speed Cake</div>
          <h1 className="text-3xl sm:text-4xl text-[#2A1E24] font-extrabold">
            {mode==='login'?'Welcome back':mode==='signup'?'Create an account':mode==='reset'?'Reset password':'Choose a new password'}
          </h1>
          <p className="text-xs text-[#8A7380] leading-relaxed">
            {isOrderFlow
              ? 'Create an account or sign in to continue with your cake order.'
              : mode==='signup'
              ? 'Join Speed Cake to save your cake bag and track delivery.'
              : mode==='login'
              ? 'Sign in to review orders and live kitchen milestones.'
              : 'We’ll email you a secure link to reset your account password.'}
          </p>
        </div>

        {isOrderFlow&&(
          <div className="mb-6 p-4 bg-[#FFE4EE] rounded-2xl border border-[#FAD1E0] text-xs text-[#E60067]">
            <p className="font-extrabold">Your cake configuration is safely saved.</p>
            <p className="text-[11px] text-[#8A7380] mt-0.5">Sign in or create an account to proceed directly to checkout.</p>
          </div>
        )}

        {mode!=='reset'&&mode!=='new-password'&&(
          <div className="bg-[#FFF5F8] p-1 rounded-full border border-[#FAD1E0] flex mb-6">
            <button
              type="button"
              onClick={()=>{setMessage('');setMode('login')}}
              className={`py-2 text-xs flex-1 rounded-full font-bold transition ${
                mode==='login'?'bg-[#E60067] text-white shadow-pink-glow':'text-[#8A7380] hover:text-[#2A1E24]'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={()=>{setMessage('');setMode('signup')}}
              className={`py-2 text-xs flex-1 rounded-full font-bold transition ${
                mode==='signup'?'bg-[#E60067] text-white shadow-pink-glow':'text-[#8A7380] hover:text-[#2A1E24]'
              }`}
            >
              Create account
            </button>
          </div>
        )}

        <form className="space-y-4" onSubmit={submit}>
          {mode==='signup'&&(
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#2A1E24] mb-1 font-bold">
                Your Full Name
              </label>
              <input
                required
                value={name}
                onChange={e=>setName(e.target.value)}
                placeholder="e.g. Chimamanda Adichie"
                autoComplete="name"
                className="w-full px-4 py-3 rounded-2xl border border-[#FAD1E0] bg-[#FFF5F8] text-sm text-[#2A1E24] placeholder:text-[#8A7380] outline-none focus:border-[#E60067] focus:bg-white focus:ring-2 focus:ring-[#FFE4EE] transition shadow-subtle"
              />
            </div>
          )}

          {mode!=='new-password'&&(
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#2A1E24] mb-1 font-bold">
                Email Address
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={e=>setEmail(e.target.value)}
                placeholder="e.g. name@example.com"
                autoComplete="email"
                className="w-full px-4 py-3 rounded-2xl border border-[#FAD1E0] bg-[#FFF5F8] text-sm text-[#2A1E24] placeholder:text-[#8A7380] outline-none focus:border-[#E60067] focus:bg-white focus:ring-2 focus:ring-[#FFE4EE] transition shadow-subtle"
              />
            </div>
          )}

          {mode!=='reset'&&(
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#2A1E24] mb-1 font-bold">
                Password
              </label>
              <input
                required
                minLength={8}
                type="password"
                value={password}
                onChange={e=>setPassword(e.target.value)}
                placeholder={mode==='new-password'?'New password (8+ characters)':'Password (8+ characters)'}
                autoComplete={mode==='login'?'current-password':'new-password'}
                className="w-full px-4 py-3 rounded-2xl border border-[#FAD1E0] bg-[#FFF5F8] text-sm text-[#2A1E24] placeholder:text-[#8A7380] outline-none focus:border-[#E60067] focus:bg-white focus:ring-2 focus:ring-[#FFE4EE] transition shadow-subtle"
              />
            </div>
          )}

          <button
            disabled={busy}
            className="w-full py-4 px-6 rounded-full bg-[#E60067] hover:bg-[#C70055] text-white text-xs font-black uppercase tracking-wider transition-all shadow-pink-glow hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 cursor-pointer"
          >
            {busy?'Please wait…':mode==='login'?'Sign in':mode==='signup'?'Create account':mode==='reset'?'Send reset link':'Save new password'}
          </button>
        </form>

        {message&&(
          <div role="status" className="mt-4 p-3.5 rounded-2xl bg-[#FFE4EE] border border-[#FAD1E0] text-xs text-[#E60067] font-bold">
            {message}
          </div>
        )}

        <div className="flex justify-between text-xs mt-6 text-[#8A7380]">
          {mode!=='new-password'&&(
            <button
              type="button"
              className="hover:text-[#E60067] underline font-medium"
              onClick={()=>{setMessage('');setMode(mode==='login'?'signup':'login')}}
            >
              {mode==='login'?'Need an account? Sign up':'Already have an account? Sign in'}
            </button>
          )}

          {mode!=='new-password'&&(
            <button
              type="button"
              className="hover:text-[#E60067] underline font-medium"
              onClick={()=>{setMessage('');setMode('reset')}}
            >
              Forgot password?
            </button>
          )}
        </div>

        <p className="text-center text-xs text-[#8A7380] mt-8 pt-4 border-t border-[#FAD1E0]/60">
          <Link className="hover:text-[#E60067] underline font-medium" href="/cakes">
            Continue browsing celebration cakes &rarr;
          </Link>
        </p>
      </div>
    </main>
  );
}
export default function Account(){return <Suspense fallback={<main className="container py-20 text-center font-bold text-[#8A7380]">Loading account…</main>}><AccountContent/></Suspense>}
