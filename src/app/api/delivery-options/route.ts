import {NextResponse} from 'next/server'
import {supabaseAdmin} from '@/lib/supabase/server'

const localNow=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).reduce((o:any,p)=>({...o,[p.type]:p.value}),{})

export async function GET(req:Request){
  const url=new URL(req.url);const state=url.searchParams.get('state')?.trim();const city=url.searchParams.get('city')?.trim();const date=url.searchParams.get('date');const productIds=(url.searchParams.get('products')||'').split(',').filter(Boolean)
  if(!state||!city||!date||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!productIds.length||productIds.length>30)return NextResponse.json({windows:[]})
  try{
    const db=supabaseAdmin();const [{data:zone},{data:products}]=await Promise.all([db.from('delivery_zones').select('id').eq('state',state).eq('city',city).eq('active',true).maybeSingle(),db.from('products').select('id,lead_days').in('id',productIds).eq('active',true)])
    if(!zone||!products||products.length!==new Set(productIds).size)return NextResponse.json({windows:[]})
    const lead=Math.max(...products.map(p=>Number(p.lead_days)||0));const now=localNow();const min=new Date(`${now.year}-${now.month}-${now.day}T00:00:00Z`);min.setUTCDate(min.getUTCDate()+lead);const requested=new Date(`${date}T00:00:00Z`);if(!Number.isFinite(requested.getTime())||requested<min)return NextResponse.json({windows:[]})
    const weekday=requested.getUTCDay();const {data:slots,error}=await db.from('delivery_slots').select('window_name,weekday,cutoff_time').eq('zone_id',zone.id).eq('active',true).or(`weekday.is.null,weekday.eq.${weekday}`);if(error)throw error
    const today=`${now.year}-${now.month}-${now.day}`;const windows=[...new Set((slots||[]).filter(s=>date!==today||!s.cutoff_time||`${now.hour}:${now.minute}:00`<s.cutoff_time).map(s=>s.window_name))]
    return NextResponse.json({windows})
  }catch{return NextResponse.json({error:'Delivery availability is temporarily unavailable.',windows:[]},{status:503})}
}
