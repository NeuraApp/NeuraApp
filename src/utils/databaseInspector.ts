import { supabase } from '@/lib/supabase';

export interface DatabaseInspectionResult {
  status: 'SUCCESS' | 'FAILURE' | 'WARNING';
  summary: {
    total_tables: number;
    tables_present: number;
    tables_missing: number;
    critical_issues: number;
  };
  details: {
    tables: TableStatus[];
    issues: string[];
    recommendations: string[];
  };
  execution_time_ms: number;
}

export interface TableStatus {
  name: string;
  exists: boolean;
  rls_enabled: boolean;
  issues: string[];
}

// Cache for inspection results (5 minutes)
let cachedResult: DatabaseInspectionResult | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function inspectDatabase(forceRefresh = false): Promise<DatabaseInspectionResult> {
  const now = Date.now();
  
  // Return cached result if still valid
  if (!forceRefresh && cachedResult && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedResult;
  }

  const startTime = Date.now();

  try {
    console.log('🔍 Running database inspection...');

    // Call the Edge Function for comprehensive inspection
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/inspect-database`, {
      method: 'POST',
      headers: {
        'Authorization': session ? `Bearer ${session.access_token}` : `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Inspection failed: ${response.status}`);
    }

    const result = await response.json();
    
    // Cache the result
    cachedResult = result;
    cacheTimestamp = now;
    
    return result;

  } catch (error) {
    console.error('Database inspection error:', error);
    
    // Return fallback result
    const fallbackResult: DatabaseInspectionResult = {
      status: 'FAILURE',
      summary: {
        total_tables: 0,
        tables_present: 0,
        tables_missing: 0,
        critical_issues: 1
      },
      details: {
        tables: [],
        issues: [`Inspection failed: ${error.message}`],
        recommendations: ['Check database connection', 'Verify Edge Function deployment']
      },
      execution_time_ms: Date.now() - startTime
    };

    return fallbackResult;
  }
}

export function formatInspectionReport(result: DatabaseInspectionResult): string {
  const { status, summary, details } = result;
  
  let report = `# 🔍 DATABASE INSPECTION REPORT\n\n`;
  
  // Status header
  const statusEmoji = status === 'SUCCESS' ? '✅' : status === 'WARNING' ? '⚠️' : '❌';
  report += `**Status**: ${statusEmoji} ${status}\n`;
  report += `**Execution Time**: ${result.execution_time_ms}ms\n\n`;
  
  // Summary
  report += `## 📊 SUMMARY\n`;
  report += `- **Tables**: ${summary.tables_present}/${summary.total_tables} present\n`;
  report += `- **Critical Issues**: ${summary.critical_issues}\n\n`;
  
  // Issues
  if (details.issues.length > 0) {
    report += `## 🚨 ISSUES FOUND\n`;
    details.issues.forEach(issue => {
      report += `- ${issue}\n`;
    });
    report += `\n`;
  }
  
  // Recommendations
  if (details.recommendations.length > 0) {
    report += `## 💡 RECOMMENDATIONS\n`;
    details.recommendations.forEach(rec => {
      report += `- ${rec}\n`;
    });
    report += `\n`;
  }
  
  // Table details
  report += `## 📋 TABLE STATUS\n`;
  details.tables.forEach(table => {
    const tableEmoji = table.exists ? '✅' : '❌';
    const rlsEmoji = table.rls_enabled ? '🔒' : '🔓';
    report += `- ${tableEmoji} **${table.name}** ${rlsEmoji}\n`;
    
    if (table.issues.length > 0) {
      table.issues.forEach(issue => {
        report += `  - ⚠️ ${issue}\n`;
      });
    }
  });
  
  return report;
}

// Quick health check function
export async function quickHealthCheck(): Promise<{
  healthy: boolean;
  issues: string[];
}> {
  try {
    // Test basic connectivity
    const { data, error } = await supabase
      .from('ideias_virais')
      .select('count')
      .limit(1);

    if (error) {
      return {
        healthy: false,
        issues: [`Database connection failed: ${error.message}`]
      };
    }

    // Test auth
    const { data: { user } } = await supabase.auth.getUser();
    
    return {
      healthy: true,
      issues: []
    };

  } catch (error) {
    return {
      healthy: false,
      issues: [`Health check failed: ${error.message}`]
    };
  }
}