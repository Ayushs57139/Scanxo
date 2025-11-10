import React, { useState, useEffect } from 'react';
import { ordersAPI } from '../../services/api';
import axios from 'axios';
import {
  ArrowPathIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

const OrderManagement = () => {
  const [activeTab, setActiveTab] = useState('returns');
  const [returns, setReturns] = useState([]);
  const [creditNotes, setCreditNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    returnStatus: '',
    orderId: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    loadData();
  }, [activeTab, filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'returns') {
        await loadReturns();
      } else if (activeTab === 'credit-notes') {
        await loadCreditNotes();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReturns = async () => {
    try {
      const params = {};
      if (filters.returnStatus) params.returnStatus = filters.returnStatus;
      if (filters.orderId) params.orderId = filters.orderId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      
      const response = await axios.get(`${API_BASE_URL}/order-returns`, { params });
      setReturns(response.data || []);
    } catch (error) {
      console.error('Error loading returns:', error);
      setReturns([]);
    }
  };

  const loadCreditNotes = async () => {
    try {
      const params = {};
      if (filters.orderId) params.orderId = filters.orderId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      
      const response = await axios.get(`${API_BASE_URL}/credit-notes`, { params });
      setCreditNotes(response.data || []);
    } catch (error) {
      console.error('Error loading credit notes:', error);
      setCreditNotes([]);
    }
  };

  const handleReturnStatusUpdate = async (returnId, newStatus) => {
    try {
      await axios.put(`${API_BASE_URL}/order-returns/${returnId}/status`, {
        returnStatus: newStatus
      });
      alert('Return status updated successfully!');
      loadReturns();
    } catch (error) {
      console.error('Error updating return status:', error);
      alert('Error updating return status');
    }
  };

  const handleCreateCreditNote = async (returnId, orderId, amount) => {
    try {
      await axios.post(`${API_BASE_URL}/credit-notes`, {
        orderId,
        returnId,
        amount,
        reason: 'Order return refund'
      });
      alert('Credit note created successfully!');
      loadCreditNotes();
    } catch (error) {
      console.error('Error creating credit note:', error);
      alert('Error creating credit note');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'requested':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'processed':
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
        <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
        <p className="text-gray-600 mt-2">Manage order returns and credit notes</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('returns')}
              className={`flex items-center px-6 py-4 border-b-2 font-medium text-sm ${
                activeTab === 'returns'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ArrowPathIcon className="h-5 w-5 mr-2" />
              Returns
            </button>
            <button
              onClick={() => setActiveTab('credit-notes')}
              className={`flex items-center px-6 py-4 border-b-2 font-medium text-sm ${
                activeTab === 'credit-notes'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <DocumentTextIcon className="h-5 w-5 mr-2" />
              Credit Notes
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Filters */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Order ID"
              value={filters.orderId}
              onChange={(e) => setFilters({ ...filters, orderId: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            {activeTab === 'returns' && (
              <select
                value={filters.returnStatus}
                onChange={(e) => setFilters({ ...filters, returnStatus: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All Status</option>
                <option value="requested">Requested</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="processed">Processed</option>
                <option value="completed">Completed</option>
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

          {/* Returns Tab */}
          {activeTab === 'returns' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Return ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Refund Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {returns.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-4 py-8 text-center text-gray-500">No returns found</td>
                    </tr>
                  ) : (
                    returns.map((returnItem) => (
                      <tr key={returnItem.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">#{returnItem.id}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">#{returnItem.orderId}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{returnItem.productName || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{returnItem.quantity}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{returnItem.reason}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">₹{returnItem.refundAmount || 0}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(returnItem.returnStatus)}`}>
                            {returnItem.returnStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(returnItem.returnedAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm space-x-2">
                          {returnItem.returnStatus === 'requested' && (
                            <>
                              <button
                                onClick={() => handleReturnStatusUpdate(returnItem.id, 'approved')}
                                className="text-green-600 hover:text-green-800"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReturnStatusUpdate(returnItem.id, 'rejected')}
                                className="text-red-600 hover:text-red-800"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {returnItem.returnStatus === 'approved' && (
                            <button
                              onClick={() => handleCreateCreditNote(returnItem.id, returnItem.orderId, returnItem.refundAmount)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Create Credit Note
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

          {/* Credit Notes Tab */}
          {activeTab === 'credit-notes' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credit Note #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {creditNotes.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-gray-500">No credit notes found</td>
                    </tr>
                  ) : (
                    creditNotes.map((note) => (
                      <tr key={note.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{note.creditNoteNumber}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">#{note.orderId}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">₹{note.amount}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{note.reason || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(note.status)}`}>
                            {note.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(note.createdAt).toLocaleDateString()}
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

export default OrderManagement;

