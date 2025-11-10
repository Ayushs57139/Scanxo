import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DocumentTextIcon, ChartBarIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

const ComplianceReports = () => {
  const [activeTab, setActiveTab] = useState('invoices');
  const [invoices, setInvoices] = useState([]);
  const [gstSummary, setGstSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    gstin: '',
    invoiceStatus: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    loadData();
  }, [activeTab, filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'invoices') {
        await loadInvoices();
      } else if (activeTab === 'gst-summary') {
        await loadGSTSummary();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInvoices = async () => {
    try {
      const params = {};
      if (filters.gstin) params.gstin = filters.gstin;
      if (filters.invoiceStatus) params.invoiceStatus = filters.invoiceStatus;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      
      const response = await axios.get(`${API_BASE_URL}/invoices/gst`, { params });
      setInvoices(response.data || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
      setInvoices([]);
    }
  };

  const loadGSTSummary = async () => {
    try {
      const params = {};
      if (filters.gstin) params.gstin = filters.gstin;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      
      const response = await axios.get(`${API_BASE_URL}/reports/gst-summary`, { params });
      setGstSummary(response.data || []);
    } catch (error) {
      console.error('Error loading GST summary:', error);
      setGstSummary([]);
    }
  };

  const handleDownloadInvoice = async (invoiceId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/invoices/${invoiceId}/gst-pdf`);
      // In production, this would return a PDF blob
      // For now, we'll show the invoice data
      alert('Invoice data ready. PDF generation would happen here.');
      console.log('Invoice data:', response.data);
    } catch (error) {
      console.error('Error downloading invoice:', error);
      alert('Error downloading invoice');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
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
        <h1 className="text-3xl font-bold text-gray-900">Compliance & Reports</h1>
        <p className="text-gray-600 mt-2">GST-ready invoices and compliance reports</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('invoices')}
              className={`flex items-center px-6 py-4 border-b-2 font-medium text-sm ${
                activeTab === 'invoices'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <DocumentTextIcon className="h-5 w-5 mr-2" />
              GST Invoices
            </button>
            <button
              onClick={() => setActiveTab('gst-summary')}
              className={`flex items-center px-6 py-4 border-b-2 font-medium text-sm ${
                activeTab === 'gst-summary'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ChartBarIcon className="h-5 w-5 mr-2" />
              GST Summary
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Filters */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="GSTIN"
              value={filters.gstin}
              onChange={(e) => setFilters({ ...filters, gstin: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            {activeTab === 'invoices' && (
              <select
                value={filters.invoiceStatus}
                onChange={(e) => setFilters({ ...filters, invoiceStatus: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All Status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </select>
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

          {/* Invoices Tab */}
          {activeTab === 'invoices' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Retailer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">GSTIN</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tax</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-4 py-8 text-center text-gray-500">No invoices found</td>
                    </tr>
                  ) : (
                    invoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{invoice.invoiceNumber}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">#{invoice.orderId}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{invoice.retailerName || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{invoice.retailerGstin || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">₹{invoice.amount || 0}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {invoice.taxBreakdown && typeof invoice.taxBreakdown === 'object' ? (
                            <div className="text-xs">
                              CGST: ₹{invoice.taxBreakdown.cgst || 0}<br />
                              SGST: ₹{invoice.taxBreakdown.sgst || 0}<br />
                              IGST: ₹{invoice.taxBreakdown.igst || 0}
                            </div>
                          ) : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.invoiceStatus)}`}>
                            {invoice.invoiceStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(invoice.invoiceDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => handleDownloadInvoice(invoice.id)}
                            className="text-blue-600 hover:text-blue-800 flex items-center"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                            Download
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* GST Summary Tab */}
          {activeTab === 'gst-summary' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">GSTIN</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Retailer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CGST</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SGST</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IGST</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice Count</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {gstSummary.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-8 text-center text-gray-500">No GST summary found</td>
                    </tr>
                  ) : (
                    gstSummary.map((summary, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(summary.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{summary.gstin || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{summary.retailerName || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">₹{summary.totalAmount || 0}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">₹{summary.totalCGST || 0}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">₹{summary.totalSGST || 0}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">₹{summary.totalIGST || 0}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{summary.invoiceCount || 0}</td>
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

export default ComplianceReports;

