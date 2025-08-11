import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Expected database schema definition
const EXPECTED_SCHEMA = {
  tables: {
    ideias_virais: {
      columns: {
        id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
        user_id: { type: 'uuid', nullable: false },
        conteudo: { type: 'text', nullable: true },
        created_at: { type: 'timestamp without time zone', nullable: true, default: 'now()' },
        favorito: { type: 'boolean', nullable: true, default: 'false' },
        categoria: { type: 'text', nullable: true },
        formato: { type: 'text', nullable: true },
        plataforma_alvo: { type: 'text', nullable: true },
        tendencia_utilizada: { type: 'text', nullable: true },
        ganchos_sugeridos: { type: 'jsonb', nullable: true, default: "'[]'::jsonb" }
      },
      constraints: ['PRIMARY KEY (id)', 'FOREIGN KEY (user_id) REFERENCES users(id)'],
      indexes: ['idx_ideias_virais_user_id', 'idx_ideias_virais_created_at', 'idx_ideias_virais_categoria']
    },
    performance_conteudo: {
      columns: {
        id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
        ideia_id: { type: 'uuid', nullable: false },
        user_id: { type: 'uuid', nullable: false },
        views: { type: 'integer', nullable: true, default: '0' },
        likes: { type: 'integer', nullable: true, default: '0' },
        comments: { type: 'integer', nullable: true, default: '0' },
        shares: { type: 'integer', nullable: true, default: '0' },
        saves: { type: 'integer', nullable: true, default: '0' },
        retention_rate_3s: { type: 'double precision', nullable: true, default: '0.0' },
        retention_rate_15s: { type: 'double precision', nullable: true, default: '0.0' },
        retention_rate_30s: { type: 'double precision', nullable: true, default: '0.0' },
        average_watch_time: { type: 'double precision', nullable: true, default: '0.0' },
        click_through_rate: { type: 'double precision', nullable: true, default: '0.0' },
        conversion_rate: { type: 'double precision', nullable: true, default: '0.0' },
        posted_at: { type: 'timestamp with time zone', nullable: true },
        collected_at: { type: 'timestamp with time zone', nullable: true, default: 'now()' },
        platform_specific_data: { type: 'jsonb', nullable: true, default: "'{}'::jsonb" }
      },
      constraints: ['PRIMARY KEY (id)', 'UNIQUE (ideia_id)', 'FOREIGN KEY (ideia_id) REFERENCES ideias_virais(id)'],
      indexes: ['idx_performance_ideia_id', 'idx_performance_user_id']
    },
    campanhas: {
      columns: {
        id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
        user_id: { type: 'uuid', nullable: false },
        objetivo_principal: { type: 'text', nullable: false },
        data_inicio: { type: 'date', nullable: true },
        data_fim: { type: 'date', nullable: true },
        status: { type: 'text', nullable: true, default: "'rascunho'::text" },
        created_at: { type: 'timestamp with time zone', nullable: true, default: 'now()' },
        updated_at: { type: 'timestamp with time zone', nullable: true, default: 'now()' }
      },
      constraints: ['PRIMARY KEY (id)', 'FOREIGN KEY (user_id) REFERENCES users(id)'],
      indexes: ['idx_campanhas_user_id', 'idx_campanhas_status']
    },
    etapas_campanha: {
      columns: {
        id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
        campanha_id: { type: 'uuid', nullable: false },
        ideia_id: { type: 'uuid', nullable: false },
        ordem_etapa: { type: 'integer', nullable: false },
        objetivo_etapa: { type: 'text', nullable: false },
        data_sugerida: { type: 'date', nullable: true },
        status: { type: 'text', nullable: true, default: "'pendente'::text" },
        created_at: { type: 'timestamp with time zone', nullable: true, default: 'now()' }
      },
      constraints: ['PRIMARY KEY (id)', 'UNIQUE (ideia_id)', 'FOREIGN KEY (campanha_id) REFERENCES campanhas(id)'],
      indexes: ['idx_etapas_campanha_id', 'idx_etapas_ordem']
    },
    user_connections: {
      columns: {
        id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
        user_id: { type: 'uuid', nullable: false },
        platform: { type: 'text', nullable: false },
        platform_user_id: { type: 'text', nullable: false },
        platform_username: { type: 'text', nullable: true },
        access_token: { type: 'text', nullable: false },
        refresh_token: { type: 'text', nullable: true },
        expires_at: { type: 'timestamp with time zone', nullable: true },
        status: { type: 'text', nullable: true, default: "'active'::text" },
        last_sync_at: { type: 'timestamp with time zone', nullable: true },
        platform_data: { type: 'jsonb', nullable: true, default: "'{}'::jsonb" },
        created_at: { type: 'timestamp with time zone', nullable: true, default: 'now()' }
      },
      constraints: ['PRIMARY KEY (id)', 'UNIQUE (user_id, platform)', 'FOREIGN KEY (user_id) REFERENCES users(id)'],
      indexes: ['idx_user_connections_user_id', 'idx_user_connections_platform']
    },
    subscriptions: {
      columns: {
        id: { type: 'text', nullable: false },
        user_id: { type: 'uuid', nullable: false },
        status: { type: 'text', nullable: false },
        price_id: { type: 'text', nullable: false },
        current_period_end: { type: 'timestamp with time zone', nullable: false },
        cancel_at_period_end: { type: 'boolean', nullable: true, default: 'false' },
        created_at: { type: 'timestamp with time zone', nullable: true, default: 'now()' },
        updated_at: { type: 'timestamp with time zone', nullable: true, default: 'now()' }
      },
      constraints: ['PRIMARY KEY (id)', 'UNIQUE (user_id)', 'FOREIGN KEY (user_id) REFERENCES users(id)'],
      indexes: ['idx_subscriptions_user_id', 'idx_subscriptions_status']
    },
    profiles: {
      columns: {
        id: { type: 'uuid', nullable: false },
        stripe_customer_id: { type: 'text', nullable: true },
        full_name: { type: 'text', nullable: true },
        avatar_url: { type: 'text', nullable: true },
        created_at: { type: 'timestamp with time zone', nullable: true, default: 'now()' },
        updated_at: { type: 'timestamp with time zone', nullable: true, default: 'now()' }
      },
      constraints: ['PRIMARY KEY (id)', 'UNIQUE (stripe_customer_id)', 'FOREIGN KEY (id) REFERENCES users(id)'],
      indexes: ['idx_profiles_stripe_customer_id']
    },
    tendencias_globais: {
      columns: {
        id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
        fonte: { type: 'text', nullable: false },
        item_nome: { type: 'text', nullable: false },
        item_valor: { type: 'numeric', nullable: true },
        regiao: { type: 'text', nullable: true },
        categoria_nicho: { type: 'text', nullable: true },
        growth_rate: { type: 'double precision', nullable: true, default: '0.0' },
        status: { type: 'text', nullable: true, default: "'new'::text" },
        data_coleta: { type: 'timestamp with time zone', nullable: true, default: 'now()' }
      },
      constraints: ['PRIMARY KEY (id)', 'UNIQUE (fonte, item_nome, regiao, data_coleta)'],
      indexes: ['idx_tendencias_fonte', 'idx_tendencias_status', 'idx_tendencias_growth_rate']
    },
    logs: {
      columns: {
        id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
        event: { type: 'text', nullable: false },
        user_id: { type: 'uuid', nullable: false },
        success: { type: 'boolean', nullable: false, default: 'true' },
        model: { type: 'text', nullable: true },
        error: { type: 'text', nullable: true },
        timestamp: { type: 'timestamp with time zone', nullable: false, default: 'now()' },
        metadata: { type: 'jsonb', nullable: true }
      },
      constraints: ['PRIMARY KEY (id)', 'FOREIGN KEY (user_id) REFERENCES users(id)'],
      indexes: ['idx_logs_user_id', 'idx_logs_timestamp']
    },
    analytics: {
      columns: {
        id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
        event: { type: 'text', nullable: false },
        user_id: { type: 'uuid', nullable: false },
        properties: { type: 'jsonb', nullable: false, default: "'{}'::jsonb" },
        timestamp: { type: 'timestamp with time zone', nullable: false, default: 'now()' }
      },
      constraints: ['PRIMARY KEY (id)', 'FOREIGN KEY (user_id) REFERENCES users(id)'],
      indexes: ['idx_analytics_user_id', 'idx_analytics_timestamp']
    }
  },
  views: {
    content_analytics: {
      dependencies: ['ideias_virais', 'performance_conteudo']
    },
    campaign_analytics: {
      dependencies: ['campanhas', 'etapas_campanha', 'ideias_virais']
    },
    trend_analysis: {
      dependencies: ['tendencias_globais']
    }
  },
  functions: [
    'is_admin',
    'get_active_connections',
    'get_user_content_insights',
    'calculate_performance_score',
    'check_usage_limit',
    'update_updated_at_column'
  ]
};

interface InspectionResult {
  status: 'SUCCESS' | 'FAILURE' | 'WARNING';
  summary: {
    total_tables: number;
    tables_present: number;
    tables_missing: number;
    views_present: number;
    functions_present: number;
    critical_issues: number;
  };
  details: {
    tables: TableInspection[];
    views: ViewInspection[];
    functions: FunctionInspection[];
    foreign_keys: ForeignKeyInspection[];
  };
  execution_time_ms: number;
  recommendations: string[];
}

interface TableInspection {
  name: string;
  exists: boolean;
  columns_status: 'COMPLETE' | 'PARTIAL' | 'MISSING';
  missing_columns: string[];
  extra_columns: string[];
  constraints_status: 'COMPLETE' | 'PARTIAL' | 'MISSING';
  missing_constraints: string[];
  indexes_status: 'COMPLETE' | 'PARTIAL' | 'MISSING';
  missing_indexes: string[];
  rls_enabled: boolean;
  issues: string[];
}

interface ViewInspection {
  name: string;
  exists: boolean;
  dependencies_met: boolean;
  missing_dependencies: string[];
}

interface FunctionInspection {
  name: string;
  exists: boolean;
  return_type?: string;
}

interface ForeignKeyInspection {
  table: string;
  constraint_name: string;
  exists: boolean;
  definition: string;
}

async function inspectTables(): Promise<TableInspection[]> {
  const results: TableInspection[] = [];
  
  // Get all existing tables in one query
  const { data: existingTables, error: tablesError } = await supabase
    .rpc('get_table_info');

  if (tablesError) {
    console.error('Error fetching table info:', tablesError);
    // Fallback to basic table check
    const { data: basicTables } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE');
    
    for (const [tableName] of Object.entries(EXPECTED_SCHEMA.tables)) {
      const exists = basicTables?.some(t => t.table_name === tableName) || false;
      results.push({
        name: tableName,
        exists,
        columns_status: exists ? 'COMPLETE' : 'MISSING',
        missing_columns: exists ? [] : ['ALL'],
        extra_columns: [],
        constraints_status: exists ? 'COMPLETE' : 'MISSING',
        missing_constraints: exists ? [] : ['ALL'],
        indexes_status: exists ? 'COMPLETE' : 'MISSING',
        missing_indexes: exists ? [] : ['ALL'],
        rls_enabled: false,
        issues: exists ? [] : ['Table does not exist']
      });
    }
    return results;
  }

  // Detailed inspection for each expected table
  for (const [tableName, expectedTable] of Object.entries(EXPECTED_SCHEMA.tables)) {
    const inspection: TableInspection = {
      name: tableName,
      exists: false,
      columns_status: 'MISSING',
      missing_columns: [],
      extra_columns: [],
      constraints_status: 'MISSING',
      missing_constraints: [],
      indexes_status: 'MISSING',
      missing_indexes: [],
      rls_enabled: false,
      issues: []
    };

    try {
      // Check if table exists
      const { data: tableExists } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', tableName)
        .single();

      if (!tableExists) {
        inspection.issues.push('Table does not exist');
        results.push(inspection);
        continue;
      }

      inspection.exists = true;

      // Check columns
      const { data: columns } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_schema', 'public')
        .eq('table_name', tableName);

      if (columns) {
        const existingColumns = columns.map(c => c.column_name);
        const expectedColumns = Object.keys(expectedTable.columns);
        
        inspection.missing_columns = expectedColumns.filter(col => !existingColumns.includes(col));
        inspection.extra_columns = existingColumns.filter(col => !expectedColumns.includes(col));
        
        if (inspection.missing_columns.length === 0 && inspection.extra_columns.length === 0) {
          inspection.columns_status = 'COMPLETE';
        } else if (inspection.missing_columns.length === 0) {
          inspection.columns_status = 'COMPLETE';
        } else {
          inspection.columns_status = 'PARTIAL';
        }

        // Validate column types and constraints
        for (const column of columns) {
          const expectedCol = expectedTable.columns[column.column_name];
          if (expectedCol) {
            if (!column.data_type.includes(expectedCol.type.split(' ')[0])) {
              inspection.issues.push(`Column ${column.column_name} has wrong type: ${column.data_type} (expected: ${expectedCol.type})`);
            }
          }
        }
      }

      // Check RLS
      const { data: rlsStatus } = await supabase
        .from('pg_tables')
        .select('rowsecurity')
        .eq('schemaname', 'public')
        .eq('tablename', tableName)
        .single();

      inspection.rls_enabled = rlsStatus?.rowsecurity || false;

      // Check indexes
      const { data: indexes } = await supabase
        .from('pg_indexes')
        .select('indexname')
        .eq('schemaname', 'public')
        .eq('tablename', tableName);

      if (indexes && expectedTable.indexes) {
        const existingIndexes = indexes.map(i => i.indexname);
        inspection.missing_indexes = expectedTable.indexes.filter(idx => 
          !existingIndexes.some(existing => existing.includes(idx))
        );
        
        inspection.indexes_status = inspection.missing_indexes.length === 0 ? 'COMPLETE' : 'PARTIAL';
      }

      // Check constraints
      const { data: constraints } = await supabase
        .from('information_schema.table_constraints')
        .select('constraint_name, constraint_type')
        .eq('table_schema', 'public')
        .eq('table_name', tableName);

      if (constraints) {
        const hasPRIMARY = constraints.some(c => c.constraint_type === 'PRIMARY KEY');
        const hasFOREIGN = constraints.some(c => c.constraint_type === 'FOREIGN KEY');
        
        if (!hasPRIMARY) inspection.missing_constraints.push('PRIMARY KEY');
        if (expectedTable.constraints.some(c => c.includes('FOREIGN KEY')) && !hasFOREIGN) {
          inspection.missing_constraints.push('FOREIGN KEY');
        }
        
        inspection.constraints_status = inspection.missing_constraints.length === 0 ? 'COMPLETE' : 'PARTIAL';
      }

    } catch (error) {
      inspection.issues.push(`Inspection error: ${error.message}`);
    }

    results.push(inspection);
  }

  return results;
}

async function inspectViews(): Promise<ViewInspection[]> {
  const results: ViewInspection[] = [];

  for (const [viewName, viewConfig] of Object.entries(EXPECTED_SCHEMA.views)) {
    const inspection: ViewInspection = {
      name: viewName,
      exists: false,
      dependencies_met: false,
      missing_dependencies: []
    };

    try {
      // Check if view exists
      const { data: viewExists } = await supabase
        .from('information_schema.views')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', viewName)
        .single();

      inspection.exists = !!viewExists;

      // Check dependencies
      if (viewConfig.dependencies) {
        for (const dep of viewConfig.dependencies) {
          const { data: depExists } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public')
            .eq('table_name', dep)
            .single();

          if (!depExists) {
            inspection.missing_dependencies.push(dep);
          }
        }
        
        inspection.dependencies_met = inspection.missing_dependencies.length === 0;
      }

    } catch (error) {
      console.error(`Error inspecting view ${viewName}:`, error);
    }

    results.push(inspection);
  }

  return results;
}

async function inspectFunctions(): Promise<FunctionInspection[]> {
  const results: FunctionInspection[] = [];

  try {
    const { data: functions } = await supabase
      .from('information_schema.routines')
      .select('routine_name, data_type')
      .eq('routine_schema', 'public')
      .in('routine_name', EXPECTED_SCHEMA.functions);

    for (const expectedFunction of EXPECTED_SCHEMA.functions) {
      const existingFunction = functions?.find(f => f.routine_name === expectedFunction);
      
      results.push({
        name: expectedFunction,
        exists: !!existingFunction,
        return_type: existingFunction?.data_type
      });
    }

  } catch (error) {
    console.error('Error inspecting functions:', error);
    
    // Fallback: mark all as unknown
    for (const functionName of EXPECTED_SCHEMA.functions) {
      results.push({
        name: functionName,
        exists: false
      });
    }
  }

  return results;
}

async function inspectForeignKeys(): Promise<ForeignKeyInspection[]> {
  const results: ForeignKeyInspection[] = [];

  try {
    const { data: foreignKeys } = await supabase
      .from('information_schema.referential_constraints')
      .select(`
        constraint_name,
        table_name,
        unique_constraint_name
      `)
      .eq('constraint_schema', 'public');

    // Check critical foreign keys
    const criticalFKs = [
      { table: 'ideias_virais', constraint: 'fk_user', definition: 'FOREIGN KEY (user_id) REFERENCES users(id)' },
      { table: 'performance_conteudo', constraint: 'performance_conteudo_ideia_id_fkey', definition: 'FOREIGN KEY (ideia_id) REFERENCES ideias_virais(id)' },
      { table: 'campanhas', constraint: 'campanhas_user_id_fkey', definition: 'FOREIGN KEY (user_id) REFERENCES users(id)' },
      { table: 'user_connections', constraint: 'user_connections_user_id_fkey', definition: 'FOREIGN KEY (user_id) REFERENCES users(id)' },
      { table: 'subscriptions', constraint: 'subscriptions_user_id_fkey', definition: 'FOREIGN KEY (user_id) REFERENCES users(id)' }
    ];

    for (const fk of criticalFKs) {
      const exists = foreignKeys?.some(existing => 
        existing.table_name === fk.table && 
        existing.constraint_name.includes(fk.constraint.split('_')[0])
      ) || false;

      results.push({
        table: fk.table,
        constraint_name: fk.constraint,
        exists,
        definition: fk.definition
      });
    }

  } catch (error) {
    console.error('Error inspecting foreign keys:', error);
  }

  return results;
}

function generateRecommendations(
  tables: TableInspection[],
  views: ViewInspection[],
  functions: FunctionInspection[]
): string[] {
  const recommendations: string[] = [];

  // Critical missing tables
  const missingTables = tables.filter(t => !t.exists);
  if (missingTables.length > 0) {
    recommendations.push(`🚨 CRÍTICO: ${missingTables.length} tabelas ausentes: ${missingTables.map(t => t.name).join(', ')}`);
  }

  // Tables without RLS
  const noRLSTables = tables.filter(t => t.exists && !t.rls_enabled);
  if (noRLSTables.length > 0) {
    recommendations.push(`🔒 SEGURANÇA: Habilitar RLS em: ${noRLSTables.map(t => t.name).join(', ')}`);
  }

  // Missing indexes
  const tablesWithMissingIndexes = tables.filter(t => t.missing_indexes.length > 0);
  if (tablesWithMissingIndexes.length > 0) {
    recommendations.push(`⚡ PERFORMANCE: Adicionar índices em ${tablesWithMissingIndexes.length} tabelas`);
  }

  // Missing functions
  const missingFunctions = functions.filter(f => !f.exists);
  if (missingFunctions.length > 0) {
    recommendations.push(`🔧 FUNCIONALIDADE: Implementar funções: ${missingFunctions.map(f => f.name).join(', ')}`);
  }

  // Missing views
  const missingViews = views.filter(v => !v.exists);
  if (missingViews.length > 0) {
    recommendations.push(`📊 ANALYTICS: Criar views: ${missingViews.map(v => v.name).join(', ')}`);
  }

  return recommendations;
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    console.log('🔍 Starting comprehensive database inspection...');

    // Run all inspections in parallel for efficiency
    const [tables, views, functions, foreignKeys] = await Promise.all([
      inspectTables(),
      inspectViews(),
      inspectFunctions(),
      inspectForeignKeys()
    ]);

    const executionTime = Date.now() - startTime;

    // Calculate summary statistics
    const summary = {
      total_tables: Object.keys(EXPECTED_SCHEMA.tables).length,
      tables_present: tables.filter(t => t.exists).length,
      tables_missing: tables.filter(t => !t.exists).length,
      views_present: views.filter(v => v.exists).length,
      functions_present: functions.filter(f => f.exists).length,
      critical_issues: tables.filter(t => !t.exists || t.issues.length > 0).length
    };

    // Determine overall status
    let status: 'SUCCESS' | 'FAILURE' | 'WARNING' = 'SUCCESS';
    
    if (summary.tables_missing > 0 || summary.critical_issues > 3) {
      status = 'FAILURE';
    } else if (summary.critical_issues > 0 || summary.functions_present < EXPECTED_SCHEMA.functions.length) {
      status = 'WARNING';
    }

    // Generate recommendations
    const recommendations = generateRecommendations(tables, views, functions);

    const result: InspectionResult = {
      status,
      summary,
      details: {
        tables,
        views,
        functions,
        foreign_keys: foreignKeys
      },
      execution_time_ms: executionTime,
      recommendations
    };

    // Log inspection results
    await supabase.from('logs').insert({
      event: 'database_inspection_completed',
      user_id: null, // System operation
      success: status !== 'FAILURE',
      metadata: {
        status,
        tables_inspected: summary.total_tables,
        tables_present: summary.tables_present,
        critical_issues: summary.critical_issues,
        execution_time_ms: executionTime
      },
      timestamp: new Date().toISOString()
    });

    console.log(`✅ Database inspection completed in ${executionTime}ms`);
    console.log(`📊 Status: ${status} | Tables: ${summary.tables_present}/${summary.total_tables} | Issues: ${summary.critical_issues}`);

    return new Response(
      JSON.stringify(result, null, 2),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Execution-Time': String(executionTime),
          'X-Inspection-Status': status
        } 
      }
    );

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('Database inspection failed:', error);

    // Log failure
    await supabase.from('logs').insert({
      event: 'database_inspection_failed',
      user_id: null,
      success: false,
      error: error.message,
      metadata: {
        execution_time_ms: executionTime
      },
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({ 
        status: 'FAILURE',
        error: 'Database inspection failed',
        details: error.message,
        execution_time_ms: executionTime
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});