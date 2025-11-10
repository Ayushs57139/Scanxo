import React, { useState, useEffect } from 'react';
import { paymentAPI } from '../../services/api';
import {
  CreditCardIcon,
  BanknotesIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  TableCellsIcon,
  Cog6ToothIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const Payments = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [payments, setPayments] = useState([]);
  const [gateways, setGateways] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [reconciliations, setReconciliations] = useState([]);
  const [exports, setExports] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: '',
    gatewayId: '',
  });
  const [showGatewayModal, setShowGatewayModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showReconciliationModal, setShowReconciliationModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  
  // Form states
  const [gatewayForm, setGatewayForm] = useState({
    name: '',
    displayName: '',
    gatewayType: 'razorpay',
    isActive: true,
    isTestMode: true,
    apiKey: '',
    apiSecret: '',
    webhookSecret: '',
    merchantId: '',
    supportedPaymentMethods: ['card', 'upi', 'netbanking'],
    supportedCurrencies: ['INR'],
  });
  
  const [refundForm, setRefundForm] = useState({
    paymentId: '',
    orderId: '',
    userId: '',
    amount: '',
    currency: 'INR',
    refundType: 'full',
    refundReason: '',
  });
  
  const [invoiceForm, setInvoiceForm] = useState({
    orderId: '',
    userId: '',
    invoiceType: 'sales',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    subtotal: '',
    taxAmount: '',
    discountAmount: '',
    shippingAmount: '',
    totalAmount: '',
    billingAddress: '',
    shippingAddress: '',
    notes: '',
  });
  
  const [reconciliationForm, setReconciliationForm] = useState({
    gatewayId: '',
    reconciliationDate: new Date().toISOString().split('T')[0],
    startDate: '',
    endDate: '',
    gatewayStatement: '',
  });
  
  const [exportForm, setExportForm] = useState({
    exportType: 'payments',
    format: 'csv',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    loadData();
  }, [activeTab, filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.status) params.paymentStatus = filters.status;
      if (filters.gatewayId) params.gatewayId = filters.gatewayId;

      switch (activeTab) {
        case 'overview':
          const [stats, paymentsData, gatewaysData] = await Promise.all([
            paymentAPI.getPaymentStatistics(params),
            paymentAPI.getPayments(params),
            paymentAPI.getGateways(),
          ]);
          setStatistics(stats);
          setPayments(paymentsData);
          setGateways(gatewaysData);
          break;
        case 'payments':
          setPayments(await paymentAPI.getPayments(params));
          break;
        case 'gateways':
          setGateways(await paymentAPI.getGateways());
          break;
        case 'refunds':
          setRefunds(await paymentAPI.getRefunds(params));
          break;
        case 'invoices':
          setInvoices(await paymentAPI.getInvoices(params));
          break;
        case 'reconciliations':
          setReconciliations(await paymentAPI.getReconciliations(params));
          break;
        case 'exports':
          setExports(await paymentAPI.getAccountingExports(params));
          break;
      }
    } catch (error) {
      console.error('Error loading data:', error);
      // Set empty arrays/objects to prevent further errors
      if (activeTab === 'overview') {
        setStatistics({});
        setPayments([]);
        setGateways([]);
      } else if (activeTab === 'payments') {
        setPayments([]);
      } else if (activeTab === 'gateways') {
        setGateways([]);
      } else if (activeTab === 'refunds') {
        setRefunds([]);
      } else if (activeTab === 'invoices') {
        setInvoices([]);
      } else if (activeTab === 'reconciliations') {
        setReconciliations([]);
      } else if (activeTab === 'exports') {
        setExports([]);
      }
      // Only show alert if it's a real error (not just empty data)
      if (error.response?.status !== 404 && error.message !== 'Network Error') {
        alert(`Failed to load data: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  // Handler functions
  const handleGatewaySubmit = async (e) => {
    e.preventDefault();
    try {
      await paymentAPI.createGateway(gatewayForm);
      alert('Gateway added successfully!');
      setShowGatewayModal(false);
      setGatewayForm({
        name: '',
        displayName: '',
        gatewayType: 'razorpay',
        isActive: true,
        isTestMode: true,
        apiKey: '',
        apiSecret: '',
        webhookSecret: '',
        merchantId: '',
        supportedPaymentMethods: ['card', 'upi', 'netbanking'],
        supportedCurrencies: ['INR'],
      });
      loadData();
    } catch (error) {
      alert(`Failed to add gateway: ${error.message || 'Unknown error'}`);
    }
  };

  const handleRefundSubmit = async (e) => {
    e.preventDefault();
    try {
      await paymentAPI.createRefund({
        ...refundForm,
        processedBy: 'admin', // In real app, get from auth
      });
      alert('Refund processed successfully!');
      setShowRefundModal(false);
      setRefundForm({
        paymentId: '',
        orderId: '',
        userId: '',
        amount: '',
        currency: 'INR',
        refundType: 'full',
        refundReason: '',
      });
      loadData();
    } catch (error) {
      alert(`Failed to process refund: ${error.message || 'Unknown error'}`);
    }
  };

  const handleInvoiceSubmit = async (e) => {
    e.preventDefault();
    try {
      const invoiceData = {
        ...invoiceForm,
        subtotal: parseFloat(invoiceForm.subtotal) || 0,
        taxAmount: parseFloat(invoiceForm.taxAmount) || 0,
        discountAmount: parseFloat(invoiceForm.discountAmount) || 0,
        shippingAmount: parseFloat(invoiceForm.shippingAmount) || 0,
        totalAmount: parseFloat(invoiceForm.totalAmount) || 0,
        items: [], // Would be populated from order
        taxDetails: {}, // Would be calculated
      };
      await paymentAPI.createInvoice(invoiceData);
      alert('Invoice created successfully!');
      setShowInvoiceModal(false);
      setInvoiceForm({
        orderId: '',
        userId: '',
        invoiceType: 'sales',
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        subtotal: '',
        taxAmount: '',
        discountAmount: '',
        shippingAmount: '',
        totalAmount: '',
        billingAddress: '',
        shippingAddress: '',
        notes: '',
      });
      loadData();
    } catch (error) {
      alert(`Failed to create invoice: ${error.message || 'Unknown error'}`);
    }
  };

  const handleReconciliationSubmit = async (e) => {
    e.preventDefault();
    try {
      let gatewayStatement = [];
      if (reconciliationForm.gatewayStatement) {
        try {
          gatewayStatement = JSON.parse(reconciliationForm.gatewayStatement);
        } catch (e) {
          alert('Invalid JSON format for gateway statement');
          return;
        }
      }
      await paymentAPI.createReconciliation({
        ...reconciliationForm,
        gatewayStatement,
        reconciledBy: 'admin', // In real app, get from auth
      });
      alert('Reconciliation created successfully!');
      setShowReconciliationModal(false);
      setReconciliationForm({
        gatewayId: '',
        reconciliationDate: new Date().toISOString().split('T')[0],
        startDate: '',
        endDate: '',
        gatewayStatement: '',
      });
      loadData();
    } catch (error) {
      alert(`Failed to create reconciliation: ${error.message || 'Unknown error'}`);
    }
  };

  const handleExportSubmit = async (e) => {
    e.preventDefault();
    try {
      await paymentAPI.createAccountingExport({
        ...exportForm,
        exportedBy: 'admin', // In real app, get from auth
      });
      alert('Export request created successfully!');
      setShowExportModal(false);
      setExportForm({
        exportType: 'payments',
        format: 'csv',
        startDate: '',
        endDate: '',
      });
      loadData();
    } catch (error) {
      alert(`Failed to create export: ${error.message || 'Unknown error'}`);
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      success: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: CreditCardIcon },
    { id: 'payments', name: 'Payments', icon: BanknotesIcon },
    { id: 'gateways', name: 'Gateways', icon: Cog6ToothIcon },
    { id: 'refunds', name: 'Refunds', icon: ArrowPathIcon },
    { id: 'invoices', name: 'Invoices', icon: DocumentTextIcon },
    { id: 'reconciliations', name: 'Reconciliations', icon: ArrowPathIcon },
    { id: 'exports', name: 'Accounting Exports', icon: TableCellsIcon },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Payment / Finance Module</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Status</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gateway</label>
            <select
              value={filters.gatewayId}
              onChange={(e) => setFilters({ ...filters, gatewayId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Gateways</option>
              {gateways.map((gw) => (
                <option key={gw.id} value={gw.id}>
                  {gw.displayName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="text-sm font-medium text-gray-500">Total Payments</div>
                <div className="mt-2 text-2xl font-bold text-gray-900">{statistics.totalPayments || 0}</div>
                <div className="mt-1 text-sm text-green-600">
                  {statistics.successfulPayments || 0} successful
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="text-sm font-medium text-gray-500">Total Amount</div>
                <div className="mt-2 text-2xl font-bold text-gray-900">
                  {formatCurrency(statistics.totalAmount || 0)}
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  Avg: {formatCurrency(statistics.averageAmount || 0)}
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="text-sm font-medium text-gray-500">Failed Payments</div>
                <div className="mt-2 text-2xl font-bold text-red-600">{statistics.failedPayments || 0}</div>
                <div className="mt-1 text-sm text-gray-600">
                  {statistics.pendingPayments || 0} pending
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="text-sm font-medium text-gray-500">Payment Methods</div>
                <div className="mt-2 space-y-1">
                  <div className="text-sm">Card: {statistics.cardPayments || 0}</div>
                  <div className="text-sm">UPI: {statistics.upiPayments || 0}</div>
                  <div className="text-sm">Net Banking: {statistics.netbankingPayments || 0}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Payments</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment #</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gateway</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{payment.paymentNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payment.userId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(payment.amount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payment.paymentMethod}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payment.gatewayDisplayName || payment.gatewayName || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(payment.paymentStatus)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(payment.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {payments.length === 0 && (
                  <div className="text-center py-12 text-gray-500">No payments found</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'gateways' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Payment Gateways</h2>
                <button
                  onClick={() => setShowGatewayModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                  <PlusIcon className="h-5 w-5" />
                  <span>Add Gateway</span>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                {gateways.map((gateway) => (
                  <div key={gateway.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{gateway.displayName}</h3>
                      {getStatusBadge(gateway.isActive ? 'active' : 'inactive')}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">Type: {gateway.gatewayType}</div>
                    <div className="text-sm text-gray-600 mb-2">
                      Test Mode: {gateway.isTestMode ? 'Yes' : 'No'}
                    </div>
                    <div className="text-sm text-gray-600">
                      Methods: {gateway.supportedPaymentMethods?.join(', ') || 'N/A'}
                    </div>
                  </div>
                ))}
                {gateways.length === 0 && (
                  <div className="col-span-full text-center py-12 text-gray-500">No gateways configured</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'refunds' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Refunds</h2>
                <button
                  onClick={async () => {
                    // Load payments if not already loaded
                    if (payments.length === 0) {
                      try {
                        const paymentsData = await paymentAPI.getPayments({ paymentStatus: 'success' });
                        setPayments(paymentsData);
                      } catch (error) {
                        console.error('Error loading payments:', error);
                      }
                    }
                    setShowRefundModal(true);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                  <PlusIcon className="h-5 w-5" />
                  <span>Process Refund</span>
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Refund #</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {refunds.map((refund) => (
                      <tr key={refund.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{refund.refundNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{refund.paymentId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(refund.amount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{refund.refundType}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(refund.refundStatus)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(refund.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {refunds.length === 0 && (
                  <div className="text-center py-12 text-gray-500">No refunds found</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Invoices</h2>
                <button
                  onClick={() => setShowInvoiceModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                  <PlusIcon className="h-5 w-5" />
                  <span>Create Invoice</span>
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{invoice.invoiceNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.orderId || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(invoice.totalAmount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(invoice.paidAmount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(invoice.balanceAmount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(invoice.invoiceStatus)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(invoice.invoiceDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {invoices.length === 0 && (
                  <div className="text-center py-12 text-gray-500">No invoices found</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'reconciliations' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Reconciliations</h2>
                <button
                  onClick={() => setShowReconciliationModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                  <PlusIcon className="h-5 w-5" />
                  <span>New Reconciliation</span>
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reconciliation #</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gateway</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matched</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discrepancies</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reconciliations.map((recon) => (
                      <tr key={recon.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{recon.reconciliationNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{recon.gatewayId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(recon.startDate)} - {formatDate(recon.endDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(recon.totalAmount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {recon.matchedTransactions}/{recon.totalTransactions}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{recon.discrepancyCount || 0}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(recon.reconciliationStatus)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {reconciliations.length === 0 && (
                  <div className="text-center py-12 text-gray-500">No reconciliations found</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'exports' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Accounting Exports</h2>
                <button
                  onClick={() => setShowExportModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                  <PlusIcon className="h-5 w-5" />
                  <span>New Export</span>
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Export #</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Format</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Records</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {exports.map((exp) => (
                      <tr key={exp.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{exp.exportNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exp.exportType}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 uppercase">{exp.format}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(exp.startDate)} - {formatDate(exp.endDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exp.recordCount || 0}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(exp.exportStatus)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(exp.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {exports.length === 0 && (
                  <div className="text-center py-12 text-gray-500">No exports found</div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Gateway Modal */}
      {showGatewayModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add Payment Gateway</h2>
              <button onClick={() => setShowGatewayModal(false)} className="text-gray-500 hover:text-gray-700">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleGatewaySubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={gatewayForm.name}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., razorpay"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Name *</label>
                  <input
                    type="text"
                    required
                    value={gatewayForm.displayName}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, displayName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., Razorpay"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gateway Type *</label>
                <select
                  required
                  value={gatewayForm.gatewayType}
                  onChange={(e) => setGatewayForm({ ...gatewayForm, gatewayType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="razorpay">Razorpay</option>
                  <option value="stripe">Stripe</option>
                  <option value="payu">PayU</option>
                  <option value="paytm">Paytm</option>
                  <option value="phonepe">PhonePe</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                  <input
                    type="text"
                    value={gatewayForm.apiKey}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, apiKey: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">API Secret</label>
                  <input
                    type="password"
                    value={gatewayForm.apiSecret}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, apiSecret: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Merchant ID</label>
                <input
                  type="text"
                  value={gatewayForm.merchantId}
                  onChange={(e) => setGatewayForm({ ...gatewayForm, merchantId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={gatewayForm.isActive}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, isActive: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={gatewayForm.isTestMode}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, isTestMode: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Test Mode</span>
                </label>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowGatewayModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                >
                  Add Gateway
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Process Refund</h2>
              <button onClick={() => setShowRefundModal(false)} className="text-gray-500 hover:text-gray-700">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleRefundSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment *</label>
                <select
                  required
                  value={refundForm.paymentId}
                  onChange={(e) => {
                    const selectedPayment = payments.find(p => p.id.toString() === e.target.value);
                    setRefundForm({ 
                      ...refundForm, 
                      paymentId: e.target.value,
                      orderId: selectedPayment?.orderId || '',
                      userId: selectedPayment?.userId || '',
                      amount: selectedPayment?.amount || '',
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select Payment</option>
                  {payments.filter(p => p.paymentStatus === 'success').map((payment) => (
                    <option key={payment.id} value={payment.id}>
                      {payment.paymentNumber} - {formatCurrency(payment.amount)} ({payment.userId})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order ID</label>
                  <input
                    type="text"
                    value={refundForm.orderId}
                    onChange={(e) => setRefundForm({ ...refundForm, orderId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User ID *</label>
                  <input
                    type="text"
                    required
                    value={refundForm.userId}
                    onChange={(e) => setRefundForm({ ...refundForm, userId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={refundForm.amount}
                    onChange={(e) => setRefundForm({ ...refundForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Refund Type *</label>
                  <select
                    required
                    value={refundForm.refundType}
                    onChange={(e) => setRefundForm({ ...refundForm, refundType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="full">Full</option>
                    <option value="partial">Partial</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Refund Reason</label>
                <textarea
                  value={refundForm.refundReason}
                  onChange={(e) => setRefundForm({ ...refundForm, refundReason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  rows="3"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowRefundModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                >
                  Process Refund
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Create Invoice</h2>
              <button onClick={() => setShowInvoiceModal(false)} className="text-gray-500 hover:text-gray-700">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleInvoiceSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order ID</label>
                  <input
                    type="text"
                    value={invoiceForm.orderId}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, orderId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User ID *</label>
                  <input
                    type="text"
                    required
                    value={invoiceForm.userId}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, userId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date *</label>
                  <input
                    type="date"
                    required
                    value={invoiceForm.invoiceDate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={invoiceForm.dueDate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subtotal *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={invoiceForm.subtotal}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, subtotal: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={invoiceForm.taxAmount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, taxAmount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={invoiceForm.discountAmount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, discountAmount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={invoiceForm.shippingAmount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, shippingAmount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={invoiceForm.totalAmount}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, totalAmount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Billing Address</label>
                <textarea
                  value={invoiceForm.billingAddress}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, billingAddress: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  rows="2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={invoiceForm.notes}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  rows="3"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                >
                  Create Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reconciliation Modal */}
      {showReconciliationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">New Reconciliation</h2>
              <button onClick={() => setShowReconciliationModal(false)} className="text-gray-500 hover:text-gray-700">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleReconciliationSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gateway *</label>
                <select
                  required
                  value={reconciliationForm.gatewayId}
                  onChange={(e) => setReconciliationForm({ ...reconciliationForm, gatewayId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select Gateway</option>
                  {gateways.map((gw) => (
                    <option key={gw.id} value={gw.id}>{gw.displayName}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={reconciliationForm.startDate}
                    onChange={(e) => setReconciliationForm({ ...reconciliationForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={reconciliationForm.endDate}
                    onChange={(e) => setReconciliationForm({ ...reconciliationForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gateway Statement (JSON) *</label>
                <textarea
                  required
                  value={reconciliationForm.gatewayStatement}
                  onChange={(e) => setReconciliationForm({ ...reconciliationForm, gatewayStatement: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                  rows="8"
                  placeholder='[{"transactionId": "txn_123", "amount": 1000, "paymentId": "pay_123"}, ...]'
                />
                <p className="text-xs text-gray-500 mt-1">Enter gateway statement as JSON array</p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowReconciliationModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                >
                  Create Reconciliation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">New Accounting Export</h2>
              <button onClick={() => setShowExportModal(false)} className="text-gray-500 hover:text-gray-700">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleExportSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Export Type *</label>
                <select
                  required
                  value={exportForm.exportType}
                  onChange={(e) => setExportForm({ ...exportForm, exportType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="payments">Payments</option>
                  <option value="invoices">Invoices</option>
                  <option value="refunds">Refunds</option>
                  <option value="reconciliations">Reconciliations</option>
                  <option value="all">All</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Format *</label>
                <select
                  required
                  value={exportForm.format}
                  onChange={(e) => setExportForm({ ...exportForm, format: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="csv">CSV</option>
                  <option value="xlsx">Excel (XLSX)</option>
                  <option value="json">JSON</option>
                  <option value="xml">XML</option>
                  <option value="tally">Tally</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={exportForm.startDate}
                    onChange={(e) => setExportForm({ ...exportForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={exportForm.endDate}
                    onChange={(e) => setExportForm({ ...exportForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                >
                  Create Export
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;

