import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DocumentArrowDownIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

const Reconciliations = () => {
  const [activeTab, setActiveTab] = useState('reconciliations');
  const [reconciliations, setReconciliations] = useState([]);
  const [exports, setExports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    gatewayId: '',
    reconciliationStatus: '',
    exportType: '',
    exportStatus: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    loadData();
  }, [activeTab, filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'reconciliations') {
        await loadReconciliations();
      } else if (activeTab === 'exports') {
        await loadExports();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReconciliations = async () => {
    try {
      const params = {};
      if (filters.gatewayId) params.gatewayId = filters.gatewayId;
      if (filters.reconciliationStatus) params.reconciliationStatus = filters.reconciliationStatus;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      
      const response = await axios.get(`${API_BASE_URL}/reconciliations`, { params });
      setReconciliations(response.data || []);
    } catch (error) {
      console.error('Error loading reconciliations:', error);
      setReconciliations([]);
    }
  };

  const loadExports = async () => {
    try {
      const params = {};
      if (filters.exportType) params.exportType = filters.exportType;
      if (filters.exportStatus) params.exportStatus = filters.exportStatus;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      
      const response = await axios.get(`${API_BASE_URL}/accounting-exports`, { params });
      setExports(response.data || []);
    } catch (error) {
      console.error('Error loading exports:', error);
      setExports([]);
    }
  };

  const handleCreateExport = async () => {
    const exportType = prompt('Enter export type (sales, purchases, payments, etc.):');
    const format = prompt('Enter format (csv, xml, tally, zoho):', 'csv');
    
    if (!exportType) return;

    try {
      const startDate = prompt('Start Date (YYYY-MM-DD) or leave empty:') || null;
      const endDate = prompt('End Date (YYYY-MM-DD) or leave empty:') || null;
      
      await axios.post(`${API_BASE_URL}/accounting-exports`, {
        exportType,
        format,
        startDate,
        endDate
      });
      
      alert('Export created successfully!');
      loadExports();
    } catch (error) {
      console.error('Error creating export:', error);
      alert('Error creating export');
    }
  };

  const handleDownloadExport = async (exportId, format = 'csv') => {
    try {
      const response = await axios.get(`${API_BASE_URL}/accounting-exports/${exportId}/download?format=${format}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `export-${exportId}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading export:', error);
      alert('Error downloading export');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'reconciled':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Reconciliations & Accounting Exports</h1>
        <p className="text-gray-600 mt-2">Manage payment reconciliations and export data for Tally/Zoho Books</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('reconciliations')}
              className={`flex items-center px-6 py-4 border-b-2 font-medium text-sm ${
                activeTab === 'reconciliations'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              Reconciliations
            </button>
            <button
              onClick={() => setActiveTab('exports')}
              className={`flex items-center px-6 py-4 border-b-2 font-medium text-sm ${
                activeTab === 'exports'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
              Accounting Exports
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Filters */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            {activeTab === 'reconciliations' ? (
              <>
                <input
                  type="text"
                  placeholder="Gateway ID"
                  value={filters.gatewayId}
                  onChange={(e) => setFilters({ ...filters, gatewayId: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <select
                  value={filters.reconciliationStatus}
                  onChange={(e) => setFilters({ ...filters, reconciliationStatus: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="reconciled">Reconciled</option>
                  <option value="discrepancy">Discrepancy</option>
                </select>
              </>
            ) : (
              <>
                <select
                  value={filters.exportType}
                  onChange={(e) => setFilters({ ...filters, exportType: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">All Types</option>
                  <option value="sales">Sales</option>
                  <option value="purchases">Purchases</option>
                  <option value="payments">Payments</option>
                  <option value="receivables">Receivables</option>
                </select>
                <select
                  value={filters.exportStatus}
                  onChange={(e) => setFilters({ ...filters, exportStatus: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </>
            )}
            <input
              type="date"
              placeholder="Start Date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              type="date"
              placeholder="End Date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          {activeTab === 'exports' && (
            <div className="mb-4">
              <button
                onClick={handleCreateExport}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Create New Export
              </button>
            </div>
          )}

          {/* Reconciliations Tab */}
          {activeTab === 'reconciliations' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reconciliation ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gateway</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actual Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Difference</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reconciliations.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-gray-500">No reconciliations found</td>
                    </tr>
                  ) : (
                    reconciliations.map((recon) => (
                      <tr key={recon.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">#{recon.id}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{recon.gatewayName || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(recon.reconciliationDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">₹{recon.expectedAmount || 0}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">₹{recon.actualAmount || 0}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          ₹{Math.abs((recon.expectedAmount || 0) - (recon.actualAmount || 0))}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(recon.reconciliationStatus)}`}>
                            {recon.reconciliationStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Exports Tab */}
          {activeTab === 'exports' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Export #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Format</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Range</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {exports.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-gray-500">No exports found</td>
                    </tr>
                  ) : (
                    exports.map((exportItem) => (
                      <tr key={exportItem.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{exportItem.exportNumber}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{exportItem.exportType}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{exportItem.format || 'csv'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {exportItem.startDate && exportItem.endDate
                            ? `${new Date(exportItem.startDate).toLocaleDateString()} - ${new Date(exportItem.endDate).toLocaleDateString()}`
                            : 'All'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(exportItem.exportStatus)}`}>
                            {exportItem.exportStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(exportItem.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {exportItem.exportStatus === 'completed' && (
                            <button
                              onClick={() => handleDownloadExport(exportItem.id, exportItem.format || 'csv')}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Download
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reconciliations;

