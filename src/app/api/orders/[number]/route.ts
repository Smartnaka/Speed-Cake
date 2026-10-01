import {NextResponse} from 'next/server'
import {z} from 'zod'
import {supabaseAdmin} from '@/lib/supabase/server'
const lookup=z.object({email:z.string().email()})
export async function POST(req:Request,{params}:{params:{number:string}}){const parsed=lookup.safeParse(await req.json());if(!parsed.success)return NextResponse.json({error:'Enter the email used at checkout.'},{status:400});try{const db=supabaseAdmin();const {data,error}=await db.from('orders').select('order_number,status,payment_status,delivery_date,delivery_window,order_items(product_snapshot,variant_snapshot,quantity,customization),order_status_history(status,note,created_at)').eq('order_number',params.number).eq('customer_email',parsed.data.email).single();if(error||!data)return NextResponse.json({error:'We could not find an order with those details.'},{status:404});return NextResponse.json({order:data})}catch{return NextResponse.json({error:'Order tracking is not configured yet.'},{status:503})}}
