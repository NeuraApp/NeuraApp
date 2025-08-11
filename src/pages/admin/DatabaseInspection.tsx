import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { DatabaseStatus } from '@/components/DatabaseStatus';
import { useAdmin } from '@/hooks/useAdmin';
import { LoadingButton } from '@/components/LoadingButton';
import { useToast } from '@/hooks/useToast';
import { 
  Database, 
  Shield, 
  Activity, 
  AlertTriangle, 
  CheckCircle,
  Download,
  RefreshCw
} from 'lucide-react';
import { inspectDatabase, DatabaseInspectionResult } from '@/utils/databaseInspector';

export default function DatabaseInspection() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { success, error } = useToast();
  const [inspectionResult, setInspectionResult] = useState<DatabaseInspectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    if (adminLoading) return;
    
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    
    // Initial inspection
    runInspection();
  }, [isAdmin, adminLoading, navigate]);

  const runInspection = async () => {
    setLoading(true);
    try {
      const result = await inspectDatabase(true);
      setInspectionResult(result);
      
      if (result.status === 'SUCCESS') {
        success('Database inspection completed successfully');
      } else if (result.status === 'WARNING') {
        error('Database inspection found warnings');
      } else {
        error('Database inspection found critical issues');
      }
    } catch (err) {
      console.error('Inspection error:', err);
      error('Failed to run database inspection');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (!inspectionResult) return;
    
    const report = JSON.stringify(inspectionResult, null, 2);
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `database-inspection-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    success('Inspection report downloaded');
  };

  if (adminLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">Checking admin permissions...</p>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-medium">Access Denied</p>
            <p className="text-gray-600">Admin privileges required</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="w-8 h-8 text-purple-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Database Inspection</h1>
              <p className="text-gray-600">Comprehensive database health and integrity check</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              Auto-refresh
            </label>
            
            <LoadingButton
              onClick={runInspection}
              loading={loading}
              className="px-4 py-2"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Run Inspection
            </LoadingButton>
          </div>
        </div>

        {/* Quick Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <Database className="w-6 h-6 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Tables</p>
                <p className="text-lg font-bold text-gray-800">
                  {inspectionResult ? `${inspectionResult.summary.tables_present}/${inspectionResult.summary.total_tables}` : '-'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">RLS Enabled</p>
                <p className="text-lg font-bold text-gray-800">
                  {inspectionResult ? 
                    inspectionResult.details.tables.filter(t => t.rls_enabled).length : '-'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <Activity className="w-6 h-6 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Status</p>
                <p className={`text-lg font-bold ${
                  inspectionResult?.status === 'SUCCESS' ? 'text-green-600' :
                  inspectionResult?.status === 'WARNING' ? 'text-yellow-600' :
                  inspectionResult?.status === 'FAILURE' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {inspectionResult?.status || 'UNKNOWN'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Issues</p>
                <p className="text-lg font-bold text-gray-800">
                  {inspectionResult?.summary.critical_issues || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Database Status Component */}
        <DatabaseStatus 
          showDetails={true} 
          autoRefresh={autoRefresh}
          refreshInterval={30000}
        />

        {/* Detailed Results */}
        {inspectionResult && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-800">Inspection Results</h2>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">
                  Completed in {inspectionResult.execution_time_ms}ms
                </span>
                <button
                  onClick={downloadReport}
                  className="text-purple-600 hover:text-purple-800 text-sm font-medium flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  Download Report
                </button>
              </div>
            </div>

            {/* Tables Status */}
            <div className="mb-6">
              <h3 className="text-md font-semibold text-gray-800 mb-3">Tables Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {inspectionResult.details.tables.map((table) => (
                  <div
                    key={table.name}
                    className={`p-3 rounded-lg border ${
                      table.exists 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-800">{table.name}</span>
                      <div className="flex items-center gap-1">
                        {table.exists ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        {table.rls_enabled && (
                          <Shield className="w-4 h-4 text-blue-500" title="RLS Enabled" />
                        )}
                      </div>
                    </div>
                    
                    {table.issues.length > 0 && (
                      <div className="text-xs text-red-600">
                        {table.issues.slice(0, 2).map((issue, index) => (
                          <p key={index}>• {issue}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Views Status */}
            {inspectionResult.details.views && inspectionResult.details.views.length > 0 && (
              <div className="mb-6">
                <h3 className="text-md font-semibold text-gray-800 mb-3">Views Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {inspectionResult.details.views.map((view) => (
                    <div
                      key={view.name}
                      className={`p-3 rounded-lg border ${
                        view.exists 
                          ? 'border-green-200 bg-green-50' 
                          : 'border-red-200 bg-red-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-800">{view.name}</span>
                        {view.exists ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      
                      {!view.dependencies_met && (
                        <p className="text-xs text-yellow-600 mt-1">
                          Missing dependencies: {view.missing_dependencies.join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Functions Status */}
            {inspectionResult.details.functions && inspectionResult.details.functions.length > 0 && (
              <div className="mb-6">
                <h3 className="text-md font-semibold text-gray-800 mb-3">Functions Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {inspectionResult.details.functions.map((func) => (
                    <div
                      key={func.name}
                      className={`p-3 rounded-lg border ${
                        func.exists 
                          ? 'border-green-200 bg-green-50' 
                          : 'border-red-200 bg-red-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-800">{func.name}</span>
                        {func.exists ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      
                      {func.return_type && (
                        <p className="text-xs text-gray-600 mt-1">
                          Returns: {func.return_type}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {inspectionResult.recommendations.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-md font-semibold text-yellow-800 mb-3">
                  Recommendations for Improvement
                </h3>
                <ul className="text-sm text-yellow-700 space-y-2">
                  {inspectionResult.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-yellow-600 mt-0.5">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/admin/subscriptions')}
              className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Shield className="w-6 h-6 text-blue-600 mb-2" />
              <h3 className="font-medium text-gray-800">Manage Subscriptions</h3>
              <p className="text-sm text-gray-600">View and manage user subscriptions</p>
            </button>
            
            <button
              onClick={() => navigate('/preferencias')}
              className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Activity className="w-6 h-6 text-purple-600 mb-2" />
              <h3 className="font-medium text-gray-800">System Preferences</h3>
              <p className="text-sm text-gray-600">Configure AI and system settings</p>
            </button>
            
            <button
              onClick={runInspection}
              disabled={loading}
              className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-6 h-6 text-green-600 mb-2 ${loading ? 'animate-spin' : ''}`} />
              <h3 className="font-medium text-gray-800">Re-run Inspection</h3>
              <p className="text-sm text-gray-600">Refresh database status</p>
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}