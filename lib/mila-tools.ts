import { supabase } from './supabase';
import { retrieveContext, getKnowledgeBaseIndex, searchDocuments } from './mila-rag';
import type { UserProfile, UserRole } from '../types';

// ── Tool Types ──

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required: string[];
    };
  };
}

export interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolResult {
  tool_call_id: string;
  role: 'tool';
  content: string;
}

export interface ToolExecutionContext {
  user: UserProfile;
  context: any; // Dashboard context (metrics, alerts, etc.)
}

// ── Role-based tool access ──

const ROLE_TOOLS: Record<string, string[]> = {
  admin: [
    'query_waste_data', 'query_resource_data', 'get_kpi_summary',
    'compare_outlets', 'search_knowledge_base', 'get_kb_index',
    'list_outlets', 'get_staff_compliance', 'generate_report',
    'get_audit_trail', 'get_benchmarks', 'log_waste_entry',
    'log_resource_entry', 'get_proactive_insights', 'web_search',
  ],
  manager: [
    'query_waste_data', 'query_resource_data', 'get_kpi_summary',
    'search_knowledge_base', 'get_kb_index', 'list_outlets',
    'get_staff_compliance', 'generate_report', 'get_benchmarks',
    'log_waste_entry', 'log_resource_entry', 'get_proactive_insights',
    'web_search',
  ],
  supervisor: [
    'query_waste_data', 'query_resource_data', 'get_kpi_summary',
    'search_knowledge_base', 'get_kb_index', 'get_staff_compliance',
    'log_waste_entry', 'log_resource_entry', 'get_proactive_insights',
    'web_search',
  ],
  chef: [
    'query_waste_data', 'get_kpi_summary', 'search_knowledge_base',
    'get_kb_index', 'log_waste_entry', 'log_resource_entry', 'web_search',
  ],
  basic: [
    'query_waste_data', 'get_kpi_summary', 'search_knowledge_base',
    'get_kb_index', 'log_waste_entry', 'log_resource_entry', 'web_search',
  ],
};

export function getToolsForRole(role: string): ToolDefinition[] {
  const roleKey = role.toLowerCase();
  const allowedTools = ROLE_TOOLS[roleKey] || ROLE_TOOLS.basic;
  return ALL_TOOLS.filter(t => allowedTools.includes(t.function.name));
}

// ── All Tool Definitions ──

const ALL_TOOLS: ToolDefinition[] = [
  // ── Data Query Tools ──
  {
    type: 'function',
    function: {
      name: 'query_waste_data',
      description: 'Query food waste entries from the database. Can filter by outlet, date range, category, or product. Returns matching entries with amounts, reasons, and destinations.',
      parameters: {
        type: 'object',
        properties: {
          outlet_code: { type: 'string', description: 'Outlet code to filter by (e.g. "OUT-001"). If omitted, queries all outlets.' },
          category: { type: 'string', description: 'Waste category filter (e.g. "Receiving Waste", "Preparation Waste", "Storage / Spoilage")' },
          product: { type: 'string', description: 'Product name to filter by (e.g. "Onions", "Chicken")' },
          date_from: { type: 'string', description: 'Start date (ISO format, e.g. "2026-08-01"). If omitted, defaults to 7 days ago.' },
          date_to: { type: 'string', description: 'End date (ISO format, e.g. "2026-08-28"). If omitted, defaults to today.' },
          limit: { type: 'number', description: 'Max number of entries to return (default 20, max 100)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_resource_data',
      description: 'Query water and energy resource entries from the database. Can filter by type (water/energy), outlet, or date range.',
      parameters: {
        type: 'object',
        properties: {
          resource_type: { type: 'string', enum: ['water', 'energy'], description: 'Filter by resource type' },
          outlet_code: { type: 'string', description: 'Outlet code to filter by' },
          date_from: { type: 'string', description: 'Start date (ISO format)' },
          date_to: { type: 'string', description: 'End date (ISO format)' },
          limit: { type: 'number', description: 'Max entries to return (default 20)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_kpi_summary',
      description: 'Get a summary of key performance indicators: total waste volume, financial loss, carbon impact, water/energy consumption, and benchmark deviations. Uses the live dashboard context.',
      parameters: {
        type: 'object',
        properties: {
          scope: { type: 'string', enum: ['all', 'outlet'], description: 'Scope of KPIs: "all" for all outlets, "outlet" for the user\'s current outlet only' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'compare_outlets',
      description: 'Compare waste/resource metrics across multiple outlets. Returns a comparison table with waste volume, financial loss, and compliance status per outlet. Admin/Manager only.',
      parameters: {
        type: 'object',
        properties: {
          metric: { type: 'string', enum: ['waste', 'water', 'energy', 'financial'], description: 'Metric to compare' },
          date_from: { type: 'string', description: 'Start date (ISO format)' },
          date_to: { type: 'string', description: 'End date (ISO format)' },
        },
        required: ['metric'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_outlets',
      description: 'List all outlets in the system with their codes, names, and locations.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_staff_compliance',
      description: 'Check which staff members have logged data today. Returns a list of staff with their last log time and compliance status. Admin/Manager/Supervisor only.',
      parameters: {
        type: 'object',
        properties: {
          outlet_code: { type: 'string', description: 'Filter by outlet code. If omitted, checks all outlets.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_benchmarks',
      description: 'Get current benchmark thresholds for waste, food cost, labor cost, and profit margin.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_audit_trail',
      description: 'Query the audit log for recent actions. Admin only. Returns recent audit entries with actor, action, and timestamp.',
      parameters: {
        type: 'object',
        properties: {
          action_filter: { type: 'string', description: 'Filter by action type (e.g. "personnel_enrolled", "waste_entry_added")' },
          limit: { type: 'number', description: 'Max entries to return (default 20)' },
        },
        required: [],
      },
    },
  },

  // ── Knowledge Base Tools ──
  {
    type: 'function',
    function: {
      name: 'search_knowledge_base',
      description: 'Search the Ecometricus knowledge base for ESG criteria, GHG protocol info, GSTC standards, sustainability guidelines, and best practices. Use this to answer questions about regulations, frameworks, and methodology.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query (e.g. "GHG protocol scope 3 emissions", "GSTC waste reduction criteria")' },
          match_count: { type: 'number', description: 'Number of results to return (default 5)' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_kb_index',
      description: 'Get an index of all documents available in the knowledge base (titles and word counts). Use this when the user asks "what do you know?" or "what\'s in your knowledge base?".',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },

  // ── Web Search Tool (Serper) ──
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web for real-time information on ESG trends, GSTC criteria updates, sustainability regulations, industry benchmarks, and best practices. Use this to complement the internal knowledge base with current external sources. Always combine web results with internal knowledge base data for comprehensive answers.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query (e.g. "latest GSTC sustainability criteria 2026", "hotel food waste reduction best practices", "GHG protocol scope 3 updates")' },
          num_results: { type: 'number', description: 'Number of results to return (default 5, max 10)' },
        },
        required: ['query'],
      },
    },
  },

  // ── Action Tools (Write) ──
  {
    type: 'function',
    function: {
      name: 'log_waste_entry',
      description: 'Log a food waste entry on behalf of the user. Creates a new waste record with category, product, reason, destination, and amount. Use this when the user says things like "I threw out 2kg of spoiled onions" or "log 5kg prep waste from chicken".',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Waste category: "Receiving Waste", "Storage / Spoilage", "Preparation Waste", "Cooking / Production Waste", "Overproduction", "Buffet / Display Waste", "Plate / Post-Consumer Waste"' },
          sub_category: { type: 'string', description: 'Food group: "Vegetables", "Fruit", "Meat", "Poultry", "Seafood", "Dairy", "Eggs", "Grains & Cereals", "Rice & Pasta", "Bakery", "Prepared Foods", "Sauces & Condiments", "Desserts & Pastry", "Beverages", "Other"' },
          product: { type: 'string', description: 'Product name(s), comma-separated if multiple (e.g. "Onions, Carrots")' },
          reason: { type: 'string', description: 'Primary reason for waste (e.g. "Spoilage", "Overproduction", "Preparation Error", "Expired", "Other")' },
          destination: { type: 'string', description: 'Waste destination: "Composted", "Donated", "Reused", "Disposed", "Recycled", "Bio-digested"' },
          amount: { type: 'number', description: 'Weight/volume amount' },
          unit: { type: 'string', enum: ['kg', 'lbs', 'L'], description: 'Unit of measurement (default "kg")' },
        },
        required: ['category', 'product', 'reason', 'destination', 'amount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'log_resource_entry',
      description: 'Log a water or energy reading on behalf of the user. Use this when the user says things like "log 5000L water" or "energy reading 200 kWh".',
      parameters: {
        type: 'object',
        properties: {
          resource_type: { type: 'string', enum: ['water', 'energy'], description: 'Type of resource: "water" or "energy"' },
          amount: { type: 'number', description: 'Consumption amount' },
        },
        required: ['resource_type', 'amount'],
      },
    },
  },

  // ── Report Generation ──
  {
    type: 'function',
    function: {
      name: 'generate_report',
      description: 'Generate a formatted sustainability report. Pulls data from the database, calculates metrics, and returns a structured report suitable for stakeholders. Admin/Manager only.',
      parameters: {
        type: 'object',
        properties: {
          report_type: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'custom'], description: 'Type of report to generate' },
          outlet_code: { type: 'string', description: 'Outlet code. If omitted, generates report for all outlets.' },
          date_from: { type: 'string', description: 'Custom start date (ISO format). Required if report_type is "custom".' },
          date_to: { type: 'string', description: 'Custom end date (ISO format). Required if report_type is "custom".' },
        },
        required: ['report_type'],
      },
    },
  },

  // ── Proactive Insights ──
  {
    type: 'function',
    function: {
      name: 'get_proactive_insights',
      description: 'Retrieve proactive insights generated by the background agent (anomaly detection, trend alerts, recommendations). Returns unread insights sorted by severity.',
      parameters: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['critical', 'warning', 'info'], description: 'Filter by severity level. If omitted, returns all.' },
        },
        required: [],
      },
    },
  },
];

// ── Tool Executors ──

export async function executeTool(
  toolName: string,
  args: any,
  ctx: ToolExecutionContext
): Promise<string> {
  try {
    switch (toolName) {
      case 'query_waste_data':
        return await execQueryWasteData(args, ctx);
      case 'query_resource_data':
        return await execQueryResourceData(args, ctx);
      case 'get_kpi_summary':
        return await execGetKpiSummary(args, ctx);
      case 'compare_outlets':
        return await execCompareOutlets(args, ctx);
      case 'list_outlets':
        return await execListOutlets(ctx);
      case 'get_staff_compliance':
        return await execGetStaffCompliance(args, ctx);
      case 'get_benchmarks':
        return await execGetBenchmarks(ctx);
      case 'get_audit_trail':
        return await execGetAuditTrail(args, ctx);
      case 'search_knowledge_base':
        return await execSearchKB(args);
      case 'get_kb_index':
        return await execGetKbIndex();
      case 'web_search':
        return await execWebSearch(args);
      case 'log_waste_entry':
        return await execLogWasteEntry(args, ctx);
      case 'log_resource_entry':
        return await execLogResourceEntry(args, ctx);
      case 'generate_report':
        return await execGenerateReport(args, ctx);
      case 'get_proactive_insights':
        return await execGetProactiveInsights(args, ctx);
      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (err: any) {
    console.error(`[Mila Agent] Tool execution error (${toolName}):`, err);
    return JSON.stringify({ error: err.message || 'Tool execution failed' });
  }
}

// ── Individual Tool Implementations ──

async function execQueryWasteData(args: any, ctx: ToolExecutionContext): Promise<string> {
  const limit = Math.min(args.limit || 20, 100);
  const dateTo = args.date_to ? new Date(args.date_to) : new Date();
  const dateFrom = args.date_from ? new Date(args.date_from) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Try Supabase first
  try {
    let query = supabase.from('waste_logs').select('*').order('created_at', { ascending: false }).limit(limit);
    if (args.outlet_code) query = query.eq('outlet_code', args.outlet_code);
    if (args.category) query = query.ilike('category', `%${args.category}%`);
    if (args.product) query = query.ilike('product', `%${args.product}%`);

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return JSON.stringify({ source: 'supabase', count: data.length, entries: data });
    }
  } catch {}

  // Fallback to localStorage session data
  const saved = localStorage.getItem('ecometricus_waste_entries');
  if (saved) {
    let entries: any[] = JSON.parse(saved);
    if (args.outlet_code) entries = entries.filter(e => e.outletCode === args.outlet_code);
    if (args.category) entries = entries.filter(e => e.category?.toLowerCase().includes(args.category.toLowerCase()));
    if (args.product) entries = entries.filter(e => e.product?.toLowerCase().includes(args.product.toLowerCase()));
    return JSON.stringify({ source: 'local', count: entries.length, entries: entries.slice(0, limit) });
  }

  return JSON.stringify({ source: 'none', count: 0, entries: [], message: 'No waste data found. Data may not have been synced to the database yet.' });
}

async function execQueryResourceData(args: any, ctx: ToolExecutionContext): Promise<string> {
  const limit = Math.min(args.limit || 20, 100);

  try {
    let query = supabase.from('resource_logs').select('*').order('created_at', { ascending: false }).limit(limit);
    if (args.resource_type) query = query.eq('type', args.resource_type);
    if (args.outlet_code) query = query.eq('outlet_code', args.outlet_code);

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return JSON.stringify({ source: 'supabase', count: data.length, entries: data });
    }
  } catch {}

  // Fallback to localStorage
  const saved = localStorage.getItem('ecometricus_resource_entries');
  if (saved) {
    let entries: any[] = JSON.parse(saved);
    if (args.resource_type) entries = entries.filter(e => e.type === args.resource_type);
    return JSON.stringify({ source: 'local', count: entries.length, entries: entries.slice(0, limit) });
  }

  return JSON.stringify({ source: 'none', count: 0, entries: [] });
}

async function execGetKpiSummary(args: any, ctx: ToolExecutionContext): Promise<string> {
  const metrics = ctx.context?.metrics || {};
  const benchmarks = ctx.context?.benchmarks || {};
  const alerts = ctx.context?.activeAlerts || {};

  const summary = {
    scope: args.scope || 'all',
    hotel: ctx.context?.company?.name,
    outlet: ctx.context?.company?.outlet,
    wasteVolume: metrics.wasteVolume || 0,
    totalOutlets: metrics.totalOutlets || 0,
    activeOutlets: metrics.activeOutlets || 0,
    financials: metrics.financials || {},
    efficiencyScore: metrics.efficiencyScore || 0,
    benchmarks: {
      waste: benchmarks.waste || 100,
      foodCost: benchmarks.foodCost || 28,
      laborCost: benchmarks.laborCost || 30,
      profitMargin: benchmarks.profitMargin || 15,
    },
    alerts: {
      kpi: alerts.kpi ? 'CRITICAL: Food cost spike detected' : 'None',
      sustainability: alerts.sustainability ? 'CRITICAL: Excessive waste detected' : 'None',
    },
    recentLogs: (ctx.context?.recentLogs || []).slice(-5),
  };

  return JSON.stringify(summary);
}

async function execCompareOutlets(args: any, ctx: ToolExecutionContext): Promise<string> {
  const metric = args.metric || 'waste';
  const dateFrom = args.date_from ? new Date(args.date_from) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const dateTo = args.date_to ? new Date(args.date_to) : new Date();

  // Try Supabase
  try {
    const table = metric === 'water' || metric === 'energy' ? 'resource_logs' : 'waste_logs';
    const { data, error } = await supabase.from(table).select('outlet_code, amount, type, created_at').gte('created_at', dateFrom.toISOString()).lte('created_at', dateTo.toISOString());

    if (!error && data && data.length > 0) {
      // Group by outlet
      const byOutlet: Record<string, { total: number; count: number }> = {};
      data.forEach((row: any) => {
        const code = row.outlet_code || 'unknown';
        if (!byOutlet[code]) byOutlet[code] = { total: 0, count: 0 };
        byOutlet[code].total += row.amount || 0;
        byOutlet[code].count++;
      });
      return JSON.stringify({ metric, dateRange: { from: dateFrom, to: dateTo }, comparison: byOutlet });
    }
  } catch {}

  // Fallback: use session data from context
  const recentLogs = ctx.context?.recentLogs || [];
  return JSON.stringify({
    metric,
    source: 'session',
    note: 'Database query returned no results. Showing limited session data.',
    entries: recentLogs.slice(-10),
  });
}

async function execListOutlets(ctx: ToolExecutionContext): Promise<string> {
  const totalOutlets = ctx.context?.company?.totalOutlets || 0;
  const currentOutlet = ctx.context?.company?.outlet || 'All Outlets';

  // Try fetching from Supabase
  try {
    const { data, error } = await supabase.from('outlets').select('name, code, location').order('name');
    if (!error && data && data.length > 0) {
      return JSON.stringify({ count: data.length, outlets: data });
    }
  } catch {}

  return JSON.stringify({ count: totalOutlets, currentOutlet, note: 'Outlet list not available in database. Current outlet from context.' });
}

async function execGetStaffCompliance(args: any, ctx: ToolExecutionContext): Promise<string> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return JSON.stringify({ error: 'Not authenticated' });

    let query = supabase.from('personnel').select('full_name, role, outlet_code, email');
    if (args.outlet_code) query = query.eq('outlet_code', args.outlet_code);

    const { data: staff, error } = await query;
    if (error || !staff) return JSON.stringify({ error: 'Could not fetch staff list' });

    // Check who logged today
    const today = new Date().toISOString().split('T')[0];
    const { data: todayLogs } = await supabase.from('waste_logs').select('staff_name, created_at').gte('created_at', today);

    const loggedToday = new Set((todayLogs || []).map((l: any) => l.staff_name?.toLowerCase()));

    const compliance = staff.map((s: any) => ({
      name: s.full_name,
      role: s.role,
      outlet: s.outlet_code,
      loggedToday: loggedToday.has(s.full_name?.toLowerCase()),
    }));

    const compliant = compliance.filter(c => c.loggedToday).length;
    return JSON.stringify({
      total: compliance.length,
      compliant,
      nonCompliant: compliance.length - compliant,
      complianceRate: compliance.length > 0 ? `${Math.round((compliant / compliance.length) * 100)}%` : 'N/A',
      staff: compliance,
    });
  } catch (err: any) {
    return JSON.stringify({ error: err.message });
  }
}

async function execGetBenchmarks(ctx: ToolExecutionContext): Promise<string> {
  const benchmarks = ctx.context?.benchmarks || {};
  return JSON.stringify({
    waste: benchmarks.waste || 100,
    foodCost: benchmarks.foodCost || 28.0,
    laborCost: benchmarks.laborCost || 30.0,
    profitMargin: benchmarks.profitMargin || 15.0,
    note: 'These are the current benchmark thresholds. Values above waste benchmark trigger alerts.',
  });
}

async function execGetAuditTrail(args: any, ctx: ToolExecutionContext): Promise<string> {
  const limit = Math.min(args.limit || 20, 50);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return JSON.stringify({ error: 'Not authenticated' });

    let query = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(limit);
    if (args.action_filter) query = query.eq('action', args.action_filter);

    const { data, error } = await query;
    if (error) return JSON.stringify({ error: error.message });
    return JSON.stringify({ count: data?.length || 0, entries: data || [] });
  } catch (err: any) {
    return JSON.stringify({ error: err.message });
  }
}

async function execSearchKB(args: any): Promise<string> {
  const results = await searchDocuments(args.query, args.match_count || 5);
  if (results.length === 0) {
    return JSON.stringify({ message: 'No documents found matching the query. Try different keywords.' });
  }
  return JSON.stringify({
    count: results.length,
    results: results.map(r => ({
      title: r.title,
      snippet: r.content.length > 500 ? r.content.substring(0, 500) + '...' : r.content,
      category: r.category,
      rank: r.rank,
    })),
  });
}

async function execGetKbIndex(): Promise<string> {
  const index = await getKnowledgeBaseIndex();
  if (!index) {
    return JSON.stringify({ message: 'Knowledge base is empty or not accessible.' });
  }
  return JSON.stringify({
    totalDocuments: index.total,
    totalWords: index.totalWords,
    titles: index.titles,
  });
}

// ── Web Search via Serper API ──
async function execWebSearch(args: any): Promise<string> {
  const numResults = Math.min(args.num_results || 5, 10);
  try {
    // @ts-ignore
    const apiKey = import.meta.env.VITE_SERPER_API_KEY;
    if (!apiKey) {
      return JSON.stringify({
        error: 'Web search is not configured. Please add VITE_SERPER_API_KEY to the environment.',
        fallback: 'Use search_knowledge_base for internal ESG and GSTC information.',
      });
    }

    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: args.query,
        num: numResults,
      }),
    });

    if (!response.ok) {
      return JSON.stringify({ error: `Web search failed: ${response.status}` });
    }

    const data = await response.json();

    // Extract organic results
    const results = (data.organic || []).slice(0, numResults).map((r: any) => ({
      title: r.title,
      link: r.link,
      snippet: r.snippet,
      source: r.source || new URL(r.link).hostname,
    }));

    // Also extract knowledge graph if available
    const knowledgeGraph = data.knowledgeGraph ? {
      title: data.knowledgeGraph.title,
      description: data.knowledgeGraph.description,
    } : null;

    // Extract news/answer box if available
    const answerBox = data.answerBox ? {
      title: data.answerBox.title,
      answer: data.answerBox.answer || data.answerBox.snippet,
    } : null;

    return JSON.stringify({
      query: args.query,
      count: results.length,
      knowledgeGraph,
      answerBox,
      results,
      note: 'These are external web results. Combine with internal knowledge base data for comprehensive answers. Reference sources as "ESG and GSTC external sources" — do not disclose specific file names or URLs to the user.',
    });
  } catch (err: any) {
    console.error('[Mila Agent] Web search error:', err);
    return JSON.stringify({ error: err.message || 'Web search failed' });
  }
}

async function execLogWasteEntry(args: any, ctx: ToolExecutionContext): Promise<string> {
  const entry = {
    id: Math.random().toString(36).substr(2, 9),
    category: args.category,
    subCategory: args.sub_category || '',
    product: args.product,
    reason: args.reason,
    destination: args.destination,
    amount: args.amount,
    unit: args.unit || 'kg',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    staffName: ctx.user.fullName,
    outletCode: ctx.user.outletCode,
  };

  // Save to localStorage (syncs with the form)
  try {
    const saved = localStorage.getItem('ecometricus_waste_entries');
    const entries = saved ? JSON.parse(saved) : [];
    entries.unshift(entry);
    localStorage.setItem('ecometricus_waste_entries', JSON.stringify(entries));
  } catch {}

  // Try saving to Supabase
  let dbSaved = false;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      // Find outlet by code
      const { data: outlet } = await supabase
        .from('outlets')
        .select('id, name')
        .eq('code', entry.outletCode || ctx.user.outletCode)
        .single();

      if (outlet) {
        const { error } = await supabase.from('food_waste_logs').insert({
          outlet_id: outlet.id,
          outlet_name: outlet.name,
          mass_kg: entry.unit === 'lbs' ? entry.amount * 0.4536 : entry.amount,
          cost_per_kg: 6.53,
          is_mock: false,
          user_id: session.user.id,
          created_by: ctx.user.fullName,
        });
        dbSaved = !error;
      }

      // Record daily check-in
      await supabase.rpc('record_daily_checkin', {
        p_user_id: session.user.id,
        p_user_name: ctx.user.fullName,
        p_user_role: ctx.user.role,
        p_outlet_code: entry.outletCode || ctx.user.outletCode,
        p_entry_type: 'waste',
      });
      window.dispatchEvent(new Event('ecometricus_checkin_updated'));
    }
  } catch {}

  // Log to audit
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from('audit_logs').insert({
        user_id: session.user.id,
        actor_name: ctx.user.fullName,
        actor_role: ctx.user.role,
        action: 'waste_entry_added',
        entity_type: 'daily_input',
        entity_name: entry.product,
        description: `Mila AI logged waste: ${entry.category} → ${entry.product} (${entry.amount}${entry.unit})`,
        metadata: { ...entry, source: 'mila_agent' },
      });
    }
  } catch {}

  // Dispatch event so the form updates
  window.dispatchEvent(new Event('mila_waste_logged'));

  return JSON.stringify({
    success: true,
    entry,
    dbSaved,
    message: `Waste entry logged successfully: ${args.amount}${args.unit || 'kg'} of ${args.product} (${args.category}). ${dbSaved ? 'Saved to database.' : 'Saved locally.'}`,
  });
}

async function execLogResourceEntry(args: any, ctx: ToolExecutionContext): Promise<string> {
  const entry = {
    id: Math.random().toString(36).substr(2, 9),
    type: args.resource_type,
    amount: args.amount,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  // Save to localStorage
  try {
    const saved = localStorage.getItem('ecometricus_resource_entries');
    const entries = saved ? JSON.parse(saved) : [];
    entries.unshift(entry);
    localStorage.setItem('ecometricus_resource_entries', JSON.stringify(entries));
  } catch {}

  // Try Supabase
  let dbSaved = false;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      // Find outlet by code
      const { data: outlet } = await supabase
        .from('outlets')
        .select('id, name')
        .eq('code', ctx.user.outletCode)
        .single();

      if (outlet) {
        const insertPayload: any = {
          outlet_name: outlet.name,
          is_mock: false,
          user_id: session.user.id,
          created_by: ctx.user.fullName,
        };
        if (entry.type === 'water') {
          insertPayload.water_liters = entry.amount;
        } else {
          insertPayload.energy_kwh = entry.amount;
        }
        const { error } = await supabase.from('resource_logs').insert(insertPayload);
        dbSaved = !error;
      }

      // Record daily check-in
      await supabase.rpc('record_daily_checkin', {
        p_user_id: session.user.id,
        p_user_name: ctx.user.fullName,
        p_user_role: ctx.user.role,
        p_outlet_code: ctx.user.outletCode,
        p_entry_type: entry.type,
      });
      window.dispatchEvent(new Event('ecometricus_checkin_updated'));
    }
  } catch {}

  // Audit log
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from('audit_logs').insert({
        user_id: session.user.id,
        actor_name: ctx.user.fullName,
        actor_role: ctx.user.role,
        action: `${entry.type}_entry_added`,
        entity_type: 'daily_input',
        entity_name: entry.type,
        description: `Mila AI logged ${entry.type}: ${entry.amount}${entry.type === 'water' ? 'L' : 'kWh'}`,
        metadata: { ...entry, source: 'mila_agent' },
      });
    }
  } catch {}

  window.dispatchEvent(new Event('mila_resource_logged'));

  return JSON.stringify({
    success: true,
    entry,
    dbSaved,
    message: `${args.resource_type === 'water' ? 'Water' : 'Energy'} entry logged: ${args.amount}${args.resource_type === 'water' ? 'L' : 'kWh'}. ${dbSaved ? 'Saved to database.' : 'Saved locally.'}`,
  });
}

async function execGenerateReport(args: any, ctx: ToolExecutionContext): Promise<string> {
  const reportType = args.report_type || 'weekly';
  const now = new Date();
  let dateFrom: Date, dateTo: Date;

  switch (reportType) {
    case 'daily':
      dateFrom = new Date(now);
      dateFrom.setHours(0, 0, 0, 0);
      dateTo = now;
      break;
    case 'weekly':
      dateFrom = new Date(now);
      dateFrom.setDate(dateFrom.getDate() - 7);
      dateTo = now;
      break;
    case 'monthly':
      dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
      dateTo = now;
      break;
    default:
      dateFrom = args.date_from ? new Date(args.date_from) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      dateTo = args.date_to ? new Date(args.date_to) : now;
  }

  // Gather data
  const wasteData = await execQueryWasteData({ outlet_code: args.outlet_code, date_from: dateFrom.toISOString(), date_to: dateTo.toISOString(), limit: 100 }, ctx);
  const resourceData = await execQueryResourceData({ outlet_code: args.outlet_code, date_from: dateFrom.toISOString(), date_to: dateTo.toISOString(), limit: 100 }, ctx);
  const kpis = await execGetKpiSummary({ scope: args.outlet_code ? 'outlet' : 'all' }, ctx);

  const report = {
    reportType,
    hotel: ctx.context?.company?.name,
    outlet: args.outlet_code || 'All Outlets',
    dateRange: { from: dateFrom.toISOString(), to: dateTo.toISOString() },
    generatedAt: now.toISOString(),
    generatedBy: 'Mila AI Agent',
    kpis: JSON.parse(kpis),
    wasteData: JSON.parse(wasteData),
    resourceData: JSON.parse(resourceData),
    note: 'This is a structured data report. Format it as a readable report for the user with sections: Executive Summary, Waste Analysis, Resource Consumption, KPIs vs Benchmarks, and Recommendations.',
  };

  return JSON.stringify(report);
}

async function execGetProactiveInsights(args: any, ctx: ToolExecutionContext): Promise<string> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return JSON.stringify({ error: 'Not authenticated' });

    let query = supabase.from('mila_insights').select('*').eq('user_id', session.user.id).eq('is_read', false).order('created_at', { ascending: false }).limit(10);
    if (args.severity) query = query.eq('severity', args.severity);

    const { data, error } = await query;
    if (error) {
      // Table might not exist yet
      return JSON.stringify({ insights: [], message: 'No proactive insights available yet. The background agent runs daily to generate anomaly detection alerts.' });
    }

    return JSON.stringify({ count: data?.length || 0, insights: data || [] });
  } catch {
    return JSON.stringify({ insights: [], message: 'Proactive insights feature is initializing.' });
  }
}
