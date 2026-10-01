import {NextResponse} from 'next/server'
import {supabaseAdmin} from '@/lib/supabase/server'

export async function GET(req:Request,{params}:{params:{number:string}}){
  try{
    const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')
    if(!token)return NextResponse.json({error:'Sign in to view this order.'},{status:401})
    const db=supabaseAdmin(),{data:{user},error:authError}=await db.auth.getUser(token)
    if(authError||!user)return NextResponse.json({error:'Sign in to view this order.'},{status:401})
    const {data,error}=await db.from('orders').select('id,order_number,status,payment_status,delivery_date,delivery_window,total_kobo,delivery_charge_kobo,subtotal_kobo,created_at,order_items(product_snapshot,variant_snapshot,quantity,line_total_kobo,customization),order_status_history(status,note,created_at)').eq('order_number',params.number).eq('user_id',user.id).single()
    if(error||!data)return NextResponse.json({error:'We could not find that order in your account.'},{status:404})
    return NextResponse.json({order:data})
  }catch{return NextResponse.json({error:'Order tracking is unavailable right now.'},{status:503})}
}
