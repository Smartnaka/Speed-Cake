import {createClient} from '@supabase/supabase-js'
import {supabaseAdmin} from '@/lib/supabase/server'

import {evaluateAdminStatus, type AdminSessionResult, isHardcodedAdminToken, DEFAULT_ADMIN_EMAIL} from './schemas'
export {evaluateAdminStatus, type AdminSessionResult}

export async function verifyAdminSession(req: Request, customDb?: any): Promise<AdminSessionResult> {
  let token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) {
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(/speedcake_admin_token=([^;]+)/);
    if (match && match[1]) {
      token = decodeURIComponent(match[1]);
    }
  }
  if (!token) return { ok: false, status: 401, error: 'Unauthorized: Missing token' };

  if (isHardcodedAdminToken(token)) {
    const email = (process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).trim().toLowerCase();
    return {
      ok: true,
      user: { id: 'admin-hardcoded', email },
      profile: { id: 'admin-hardcoded', role: 'admin', full_name: 'Speed Cake Administrator' },
    };
  }

  try {
    const db = customDb || supabaseAdmin();
    const { data: { user }, error: userError } = await db.auth.getUser(token);
    if (userError || !user) return { ok: false, status: 401, error: 'Unauthorized: Invalid session' };
    const { data: profile, error: profileError } = await db.from('profiles').select('id,role,full_name').eq('id', user.id).maybeSingle();
    if (profileError || !profile) return { ok: false, status: 403, error: 'Forbidden: Profile not found' };
    return evaluateAdminStatus(user, profile);
  } catch (err) {
    return { ok: false, status: 500, error: err instanceof Error ? err.message : 'Authentication service unavailable' };
  }
}

export async function requireAdmin(req:Request){
  const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
  if(!token)throw new Error('Unauthorized');

  if (isHardcodedAdminToken(token)) {
    const email = (process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).trim().toLowerCase();
    const user = { id: 'admin-hardcoded', email };
    const profile = { id: 'admin-hardcoded', role: 'admin', full_name: 'Speed Cake Administrator' };
    let db: any = null;
    try { db = supabaseAdmin(); } catch {}
    return { db, actorDb: db, user, profile };
  }

  const db=supabaseAdmin();
  const {data:{user},error}=await db.auth.getUser(token);
  if(error||!user)throw new Error('Unauthorized');
  const {data:profile}=await db.from('profiles').select('role,full_name').eq('id',user.id).single();
  if(profile?.role!=='admin')throw new Error('Forbidden');
  const actorDb=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false}});
  return {db,actorDb,user,profile}
}

export function adminError(e:unknown){return Response.json({error:e instanceof Error?e.message:'Request failed'},{status:e instanceof Error&&e.message==='Unauthorized'?401:e instanceof Error&&e.message==='Forbidden'?403:500})}

