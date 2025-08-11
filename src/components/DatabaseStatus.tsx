import React, { useState, useEffect } from 'react';
import { Database, CheckCircle, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';
import { inspectDatabase, formatInspectionReport, quickHealthCheck, DatabaseInspectionResult } from '@/utils/databaseInspector';
import { LoadingButton } from './LoadingButton';

interface DatabaseStatusProps {
  showDetails?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function DatabaseStatus({ 
  showDetails = false, 
  autoRefresh = false, 
  refreshInterval = 30000 
}: DatabaseStatusProps) {
  const [result, setResult] = useState<DatabaseInspectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    // Initial health check
    performQuickCheck();

    // Auto refresh if enabled
    if (autoRefresh) {
      const interval = setInterval(performQuickCheck, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const performQuickCheck = async () => {
    try {
      const health = await quickHealthCheck();
      setLastCheck(new Date());
      
      if (!health.healthy) {
        console.warn('Database health check failed:', health.issues);
      }
    } catch (error) {
      console.error('Quick health check error:', error);
    }
  };

  const performFullInspection = async () => {
    setLoading(true);
    try {
      const inspectionResult = await inspectDatabase(true);
      setResult(inspectionResult);
      setLastCheck(new Date());
      setShowReport(true);
    } catch (error) {
      console.error('Database inspection error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (!result) return <Database className="w-5 h-5 text-gray-500" />;
    
    switch (result.status) {
      case 'SUCCESS':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'FAILURE':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Database className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    if (!result) return 'text-gray-600';
    
    switch (result.status) {
      case 'SUCCESS':
        return 'text-green-600';
      case 'WARNING':
        return 'text-yellow-600';
      case 'FAILURE':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Database Status</h3>
            {lastCheck && (
              <p className="text-sm text-gray-500">
                Last check: {lastCheck.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
        
        <LoadingButton
          onClick={performFullInspection}
          loading={loading}
          className="text-sm px-4 py-2"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Full Inspection
        </LoadingButton>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <p className="font-medium text-gray-600">Tables</p>
              <p className={`text-lg font-bold ${getStatusColor()}`}>
                {result.summary.tables_present}/{result.summary.total_tables}
              </p>
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-600">Views</p>
              <p className={`text-lg font-bold ${getStatusColor()}`}>
                {result.summary.views_present}
              </p>
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-600">Functions</p>
              <p className={`text-lg font-bold ${getStatusColor()}`}>
                {result.summary.functions_present}
              </p>
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-600">Issues</p>
              <p className={`text-lg font-bold ${result.summary.critical_issues > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {result.summary.critical_issues}
              </p>
            </div>
          </div>

          {showDetails && result.details.issues.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-800 mb-2">Critical Issues</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {result.details.issues.slice(0, 5).map((issue, index) => (
                  <li key={index}>• {issue}</li>
                ))}
              </ul>
            </div>
          )}

          {result.recommendations.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Recommendations</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                {result.recommendations.slice(0, 3).map((rec, index) => (
                  <li key={index}>• {rec}</li>
                ))}
              </ul>
            </div>
          )}

          {showReport && (
            <div className="mt-4">
              <button
                onClick={() => setShowReport(!showReport)}
                className="text-sm text-purple-600 hover:text-purple-800 font-medium"
              >
                {showReport ? 'Hide' : 'Show'} Detailed Report
              </button>
              
              {showReport && (
                <div className="mt-4 bg-gray-50 rounded-lg p-4">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">
                    {formatInspectionReport(result)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}