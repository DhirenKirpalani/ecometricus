// ─────────────────────────────────────────────────────────────
// Mila Daily Scan — Supabase Edge Function
// Runs daily to detect anomalies, check compliance, and generate
// proactive insights for all users.
//
// Schedule: Run via Supabase pg_cron or external scheduler:
//   SELECT cron.schedule('mila-daily-scan', '0 23 * * *', $$SELECT net.http_post(
//     url := 'https://rqhlhazvplpajzwwoncz.supabase.co/functions/v1/mila-daily-scan',
//     headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb
//   )$$);
// ─────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://rqhlhazvplpajzwwoncz.supabase.co';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY') || 'sk-0a92323227144880af7b3a250fbfbe42';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const BATCH_ID = `scan-${new Date().toISOString().split('T')[0]}`;

// ── Main handler ──
Deno.serve(async (req) => {
    try {
        console.log(`[Mila Daily Scan] Starting batch: ${BATCH_ID}`);

        // 1. Get all users who should receive insights
        const { data: users, error: usersError } = await supabase
            .from('personnel')
            .select('id, full_name, role, outlet_code, email')
            .in('role', ['admin', 'super_admin', 'supervisor']);

        if (usersError || !users) {
            return json({ error: 'Could not fetch users', detail: usersError?.message }, 500);
        }

        const results: any[] = [];

        // 2. For each user, run anomaly detection
        for (const user of users) {
            const insights: any[] = [];

            // ── Anomaly Detection: Compare today's waste vs 7-day average ──
            const anomalyInsight = await detectWasteAnomaly(user);
            if (anomalyInsight) insights.push(anomalyInsight);

            // ── Compliance Check: Missing data entries ──
            const complianceInsight = await checkDataCompliance(user);
            if (complianceInsight) insights.push(complianceInsight);

            // ── Trend Analysis: Weekly trend direction ──
            const trendInsight = await analyzeWeeklyTrend(user);
            if (trendInsight) insights.push(trendInsight);

            // ── Resource Anomaly: Water/Energy spikes ──
            const resourceInsight = await detectResourceAnomaly(user);
            if (resourceInsight) insights.push(resourceInsight);

            // 3. Insert insights into mila_insights table
            if (insights.length > 0) {
                const rows = insights.map(insight => ({
                    user_id: user.id,
                    outlet_code: user.outlet_code,
                    severity: insight.severity,
                    category: insight.category,
                    title: insight.title,
                    description: insight.description,
                    recommendation: insight.recommendation,
                    metadata: insight.metadata || {},
                    scan_batch_id: BATCH_ID,
                }));

                const { error: insertError } = await supabase.from('mila_insights').insert(rows);
                if (!insertError) {
                    results.push({ user: user.full_name, insightsCreated: insights.length });
                }
            }
        }

        // 4. Generate AI-powered summary for admin users
        await generateAdminSummary();

        console.log(`[Mila Daily Scan] Complete. ${results.length} users processed.`);
        return json({ success: true, batchId: BATCH_ID, usersProcessed: results.length, results });

    } catch (err: any) {
        console.error('[Mila Daily Scan] Error:', err);
        return json({ error: err.message }, 500);
    }
});

// ── Helper: JSON response ──
function json(data: any, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

// ── Anomaly Detection: Waste volume spike ──
async function detectWasteAnomaly(user: any): Promise<any | null> {
    try {
        const today = new Date().toISOString().split('T')[0];
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        // Get today's waste total
        const { data: todayData } = await supabase
            .from('waste_logs')
            .select('amount')
            .eq('outlet_code', user.outlet_code)
            .gte('created_at', today);

        const todayTotal = (todayData || []).reduce((sum: number, r: any) => sum + (r.amount || 0), 0);

        // Get 7-day average (excluding today)
        const { data: weekData } = await supabase
            .from('waste_logs')
            .select('amount, created_at')
            .eq('outlet_code', user.outlet_code)
            .gte('created_at', weekAgo)
            .lt('created_at', today);

        // Group by day
        const byDay: Record<string, number> = {};
        (weekData || []).forEach((r: any) => {
            const day = r.created_at?.split('T')[0];
            if (day) byDay[day] = (byDay[day] || 0) + (r.amount || 0);
        });

        const dayCount = Object.keys(byDay).length;
        if (dayCount === 0) return null;

        const avgDaily = Object.values(byDay).reduce((a: number, b: number) => a + b, 0) / dayCount;

        if (avgDaily === 0) return null;

        const deviation = ((todayTotal - avgDaily) / avgDaily) * 100;

        if (deviation > 50) {
            return {
                severity: 'critical',
                category: 'anomaly',
                title: `Waste Spike Detected: ${deviation.toFixed(0)}% above average`,
                description: `Today's waste volume (${todayTotal.toFixed(1)}kg) is ${deviation.toFixed(0)}% higher than the 7-day average (${avgDaily.toFixed(1)}kg/day) at outlet ${user.outlet_code}.`,
                recommendation: `Investigate today's operations at ${user.outlet_code}. Check for overproduction, supplier quality issues, or unusual service patterns. Consider adjusting prep quantities for tomorrow.`,
                metadata: { todayTotal, avgDaily, deviation, outletCode: user.outlet_code },
            };
        } else if (deviation > 25) {
            return {
                severity: 'warning',
                category: 'anomaly',
                title: `Waste Above Average: ${deviation.toFixed(0)}% higher than normal`,
                description: `Today's waste (${todayTotal.toFixed(1)}kg) is ${deviation.toFixed(0)}% above the 7-day average (${avgDaily.toFixed(1)}kg/day).`,
                recommendation: `Monitor tomorrow's waste closely. Review today's prep logs for overproduction indicators.`,
                metadata: { todayTotal, avgDaily, deviation, outletCode: user.outlet_code },
            };
        }

        return null;
    } catch (err) {
        console.error('[Anomaly Detection] Error:', err);
        return null;
    }
}

// ── Compliance Check: Missing data entries ──
async function checkDataCompliance(user: any): Promise<any | null> {
    try {
        const today = new Date().toISOString().split('T')[0];

        // Get all staff at this outlet
        const { data: staff } = await supabase
            .from('personnel')
            .select('full_name')
            .eq('outlet_code', user.outlet_code)
            .neq('role', 'admin');

        if (!staff || staff.length === 0) return null;

        // Get who logged today
        const { data: todayLogs } = await supabase
            .from('waste_logs')
            .select('staff_name')
            .eq('outlet_code', user.outlet_code)
            .gte('created_at', today);

        const loggedToday = new Set((todayLogs || []).map((l: any) => l.staff_name?.toLowerCase()));
        const missing = staff.filter((s: any) => !loggedToday.has(s.full_name?.toLowerCase()));

        if (missing.length === 0) return null;

        const complianceRate = Math.round(((staff.length - missing.length) / staff.length) * 100);

        return {
            severity: complianceRate < 50 ? 'critical' : 'warning',
            category: 'compliance',
            title: `${missing.length} staff member(s) haven't logged data today`,
            description: `Data compliance at ${user.outlet_code} is at ${complianceRate}%. Missing: ${missing.map((s: any) => s.full_name).join(', ')}.`,
            recommendation: `Send reminders to missing staff. Consider setting up automated reminder notifications for the daily input cutoff.`,
            metadata: { totalStaff: staff.length, loggedCount: staff.length - missing.length, missing: missing.map((s: any) => s.full_name), complianceRate },
        };
    } catch (err) {
        console.error('[Compliance Check] Error:', err);
        return null;
    }
}

// ── Weekly Trend Analysis ──
async function analyzeWeeklyTrend(user: any): Promise<any | null> {
    try {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

        // This week's total
        const { data: thisWeek } = await supabase
            .from('waste_logs')
            .select('amount')
            .eq('outlet_code', user.outlet_code)
            .gte('created_at', weekAgo);

        const thisWeekTotal = (thisWeek || []).reduce((sum: number, r: any) => sum + (r.amount || 0), 0);

        // Last week's total
        const { data: lastWeek } = await supabase
            .from('waste_logs')
            .select('amount')
            .eq('outlet_code', user.outlet_code)
            .gte('created_at', twoWeeksAgo)
            .lt('created_at', weekAgo);

        const lastWeekTotal = (lastWeek || []).reduce((sum: number, r: any) => sum + (r.amount || 0), 0);

        if (lastWeekTotal === 0) return null;

        const trendPct = ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100;

        if (Math.abs(trendPct) < 10) return null; // No significant trend

        const isImproving = trendPct < 0;

        return {
            severity: isImproving ? 'info' : 'warning',
            category: 'trend',
            title: isImproving
                ? `Great progress! Waste down ${Math.abs(trendPct).toFixed(0)}% this week`
                : `Waste trending up ${trendPct.toFixed(0)}% this week`,
            description: isImproving
                ? `This week's waste (${thisWeekTotal.toFixed(1)}kg) is ${Math.abs(trendPct).toFixed(0)}% lower than last week (${lastWeekTotal.toFixed(1)}kg). Keep it up!`
                : `This week's waste (${thisWeekTotal.toFixed(1)}kg) is ${trendPct.toFixed(0)}% higher than last week (${lastWeekTotal.toFixed(1)}kg).`,
            recommendation: isImproving
                ? `Maintain current practices. Share what's working with other outlets.`
                : `Review this week's operations. Identify the highest-waste days and categories for targeted intervention.`,
            metadata: { thisWeekTotal, lastWeekTotal, trendPct, direction: isImproving ? 'down' : 'up' },
        };
    } catch (err) {
        console.error('[Trend Analysis] Error:', err);
        return null;
    }
}

// ── Resource Anomaly: Water/Energy spikes ──
async function detectResourceAnomaly(user: any): Promise<any | null> {
    try {
        const today = new Date().toISOString().split('T')[0];
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        for (const type of ['water', 'energy']) {
            const { data: todayData } = await supabase
                .from('resource_logs')
                .select('amount')
                .eq('outlet_code', user.outlet_code)
                .eq('type', type)
                .gte('created_at', today);

            const todayTotal = (todayData || []).reduce((sum: number, r: any) => sum + (r.amount || 0), 0);

            const { data: weekData } = await supabase
                .from('resource_logs')
                .select('amount, created_at')
                .eq('outlet_code', user.outlet_code)
                .eq('type', type)
                .gte('created_at', weekAgo)
                .lt('created_at', today);

            const byDay: Record<string, number> = {};
            (weekData || []).forEach((r: any) => {
                const day = r.created_at?.split('T')[0];
                if (day) byDay[day] = (byDay[day] || 0) + (r.amount || 0);
            });

            const dayCount = Object.keys(byDay).length;
            if (dayCount === 0) continue;

            const avgDaily = Object.values(byDay).reduce((a: number, b: number) => a + b, 0) / dayCount;
            if (avgDaily === 0) continue;

            const deviation = ((todayTotal - avgDaily) / avgDaily) * 100;

            if (deviation > 40) {
                return {
                    severity: 'warning',
                    category: 'anomaly',
                    title: `${type === 'water' ? 'Water' : 'Energy'} consumption spike: ${deviation.toFixed(0)}% above average`,
                    description: `Today's ${type} usage (${todayTotal.toLocaleString()}${type === 'water' ? 'L' : 'kWh'}) is ${deviation.toFixed(0)}% higher than the 7-day average (${avgDaily.toLocaleString()}${type === 'water' ? 'L' : 'kWh'}).`,
                    recommendation: type === 'water'
                        ? `Check for leaks, running taps, or unusual kitchen activity. Verify water meter readings.`
                        : `Check HVAC schedules, equipment left running, or unusual kitchen load. Review energy-intensive equipment usage.`,
                    metadata: { type, todayTotal, avgDaily, deviation, outletCode: user.outlet_code },
                };
            }
        }

        return null;
    } catch (err) {
        console.error('[Resource Anomaly] Error:', err);
        return null;
    }
}

// ── Generate AI-powered summary for admin ──
async function generateAdminSummary(): Promise<void> {
    try {
        // Get all insights from this batch
        const { data: insights } = await supabase
            .from('mila_insights')
            .select('*')
            .eq('scan_batch_id', BATCH_ID)
            .order('severity', { ascending: false });

        if (!insights || insights.length === 0) return;

        // Get admin users
        const { data: admins } = await supabase
            .from('personnel')
            .select('id')
            .ilike('role', 'admin');

        if (!admins || admins.length === 0) return;

        // Build summary prompt
        const insightsText = insights.map((i: any) =>
            `[${i.severity.toUpperCase()}] ${i.title}: ${i.description}`
        ).join('\n');

        const systemPrompt = `You are Mila, an ESG AI agent. Summarize today's daily scan results into a concise executive summary. Limit to 3 bullet points. Use markdown.`;

        const userPrompt = `Today's scan found ${insights.length} insights across all outlets:\n\n${insightsText}\n\nProvide a brief executive summary.`;

        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${deepseekApiKey}`,
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                stream: false,
                temperature: 0.5,
            }),
        });

        const data = await response.json();
        const summary = data.choices?.[0]?.message?.content || 'Daily scan complete. See individual insights for details.';

        // Insert as an info insight for each admin
        const adminRows = admins.map((admin: any) => ({
            user_id: admin.id,
            severity: 'info',
            category: 'daily_summary',
            title: `Daily Scan Summary — ${new Date().toLocaleDateString()}`,
            description: summary,
            recommendation: 'Review the individual alerts below and take action on critical items.',
            metadata: { totalInsights: insights.length, batchId: BATCH_ID },
            scan_batch_id: BATCH_ID,
        }));

        await supabase.from('mila_insights').insert(adminRows);
        console.log(`[Mila Daily Scan] Admin summary generated for ${admins.length} admins.`);
    } catch (err) {
        console.error('[Admin Summary] Error:', err);
    }
}
