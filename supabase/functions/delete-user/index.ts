// ─────────────────────────────────────────────────────────────
// Delete User — Supabase Edge Function
// Deletes a user's auth account + all their data from the DB
// Called by admin/super_admin only (verified via JWT)
// ─────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  try {
    // Get the caller's JWT to verify they are admin/super_admin
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    const callerClient = createClient(supabaseUrl, token, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // Verify caller is admin or super_admin
    const { data: callerPersonnel } = await supabase
      .from('personnel')
      .select('role')
      .eq('email', caller.email)
      .maybeSingle();

    const callerRole = (callerPersonnel?.role || '').toLowerCase();
    if (callerRole !== 'admin' && callerRole !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Forbidden — admin access required' }), { status: 403 });
    }

    // Parse request body
    const { userId, email } = await req.json();

    if (!userId && !email) {
      return new Response(JSON.stringify({ error: 'userId or email required' }), { status: 400 });
    }

    // 1. Find the user's auth UUID by email (if only email provided)
    let targetUserId = userId;
    if (!targetUserId && email) {
      const { data: userList, error: userErr } = await supabase.auth.admin.listUsers();
      if (userErr) {
        return new Response(JSON.stringify({ error: 'Failed to list users: ' + userErr.message }), { status: 500 });
      }
      const found = userList.users.find((u: any) => u.email === email);
      if (!found) {
        return new Response(JSON.stringify({ error: 'User not found in auth' }), { status: 404 });
      }
      targetUserId = found.id;
    }

    // 2. Delete the user's auth account
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(targetUserId);
    if (deleteAuthError) {
      console.error('Failed to delete auth account:', deleteAuthError);
      // Continue anyway — the personnel row may reference a different ID
    }

    // 3. Delete personnel record
    if (email) {
      await supabase.from('personnel').delete().eq('email', email);
    }
    if (userId) {
      await supabase.from('personnel').delete().eq('id', userId);
    }

    // 4. Delete daily_checkins
    await supabase.from('daily_checkins').delete().eq('user_id', targetUserId);

    // 5. Delete benchmarks
    await supabase.from('benchmarks').delete().eq('user_id', targetUserId);

    // Note: food_waste_logs and resource_logs are kept for historical data
    // (the outlet still needs the records for charts/analytics)

    return new Response(JSON.stringify({
      success: true,
      message: 'User account deleted successfully',
      deletedUserId: targetUserId,
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (err) {
    console.error('delete-user error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error: ' + String(err) }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});
