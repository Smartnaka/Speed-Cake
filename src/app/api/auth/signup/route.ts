import {NextResponse} from 'next/server'
import {z} from 'zod'
import {supabaseAdmin} from '@/lib/supabase/server'
import {sendWelcomeEmail} from '@/lib/email/service'

const schema=z.object({name:z.string().trim().min(2).max(120),email:z.string().trim().email().max(254),password:z.string().min(8).max(128)})
export async function POST(req:Request){
  const input=schema.safeParse(await req.json().catch(()=>null))
  if(!input.success)return NextResponse.json({error:'Enter a name, valid email, and password with at least 8 characters.'},{status:400})
  try{
    const db=supabaseAdmin()
    const {error}=await db.auth.admin.createUser({email:input.data.email,password:input.data.password,email_confirm:true,user_metadata:{full_name:input.data.name}})
    if(error)return NextResponse.json({error:error.message.includes('already')?'An account already exists for that email. Sign in instead.':'Unable to create the account. Please try again.'},{status:400})

    // Asynchronously dispatch welcome email
    void sendWelcomeEmail({ to: input.data.email, name: input.data.name }).catch(err => {
      console.error('Welcome email error:', err)
    })

    return NextResponse.json({ok:true})
  }catch{return NextResponse.json({error:'Account service is unavailable.'},{status:503})}
}
