import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { retailersAPI } from '../../services/api';
import { TrashIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';

const Retailers = () => {
  const [retailers, setRetailers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected
  const [processingId, setProcessingId] = useState(null);
  const location = useLocation();

  useEffect(() => {
    loadRetailers();
  }, [location.pathname]);

  const loadRetailers = async () => {
    try {
      const data = await retailersAPI.getAll();
      // Parse address JSON if it's a string
      const parsedData = data.map(retailer => {
        if (retailer.address && typeof retailer.address === 'string') {
          try {
            retailer.address = JSON.parse(retailer.address);
          } catch (e) {
            // Keep as is if parsing fails
          }
        }
        return retailer;
      });
      setRetailers(parsedData);
    } catch (error) {
      console.error('Error loading retailers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Are you sure you want to approve this retailer?')) {
      return;
    }

    setProcessingId(id);
    try {
      const adminEmail = localStorage.getItem('adminEmail') || 'admin@scanxo.com';
      await retailersAPI.approve(id, 'approve', adminEmail);
      alert('Retailer approved successfully!');
      loadRetailers();
    } catch (error) {
      alert('Error approving retailer: ' + (error.response?.data?.error || error.message));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id) => {
    const rejectionReason = window.prompt('Please provide a reason for rejection:');
    if (!rejectionReason || rejectionReason.trim() === '') {
      return;
    }

    setProcessingId(id);
    try {
      const adminEmail = localStorage.getItem('adminEmail') || 'admin@scanxo.com';
      await retailersAPI.approve(id, 'reject', adminEmail, rejectionReason);
      alert('Retailer rejected successfully!');
      loadRetailers();
    } catch (error) {
      alert('Error rejecting retailer: ' + (error.response?.data?.error || error.message));
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this retailer?')) {
      try {
        await retailersAPI.delete(id);
        loadRetailers();
      } catch (error) {
        alert('Error deleting retailer');
      }
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      approved: { color: 'bg-green-100 text-green-800', label: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const filteredRetailers = filter === 'all' 
    ? retailers 
    : retailers.filter(r => r.approvalStatus === filter);

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Retailers</h1>
        <p className="text-gray-600 mt-2">Manage registered retailers and approve/reject new registrations</p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex space-x-4 border-b border-gray-200">
        <button
          onClick={() => setFilter('all')}
          className={`pb-2 px-4 font-medium ${
            filter === 'all'
              ? 'border-b-2 border-primary text-primary'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          All ({retailers.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`pb-2 px-4 font-medium ${
            filter === 'pending'
              ? 'border-b-2 border-primary text-primary'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Pending ({retailers.filter(r => r.approvalStatus === 'pending').length})
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`pb-2 px-4 font-medium ${
            filter === 'approved'
              ? 'border-b-2 border-primary text-primary'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Approved ({retailers.filter(r => r.approvalStatus === 'approved').length})
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`pb-2 px-4 font-medium ${
            filter === 'rejected'
              ? 'border-b-2 border-primary text-primary'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Rejected ({retailers.filter(r => r.approvalStatus === 'rejected').length})
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Store Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Store Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  GSTIN
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRetailers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    No retailers found
                  </td>
                </tr>
              ) : (
                filteredRetailers.map((retailer) => {
                  const address = retailer.address || {};
                  const isProcessing = processingId === retailer.id;
                  
                  return (
                    <tr key={retailer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {retailer.storeName || retailer.businessName || 'N/A'}
                        </div>
                        {retailer.name && (
                          <div className="text-xs text-gray-500">Contact: {retailer.name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {retailer.storeType || retailer.businessType || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>{retailer.phone || 'N/A'}</div>
                        <div className="text-xs text-gray-400">{retailer.email || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {retailer.gstin || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {address.city || 'N/A'}, {address.state || 'N/A'}
                        {address.pincode && <div className="text-xs text-gray-400">PIN: {address.pincode}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(retailer.approvalStatus || 'pending')}
                        {retailer.approvedBy && (
                          <div className="text-xs text-gray-400 mt-1">
                            By: {retailer.approvedBy}
                          </div>
                        )}
                        {retailer.approvedAt && (
                          <div className="text-xs text-gray-400">
                            {new Date(retailer.approvedAt).toLocaleDateString()}
                          </div>
                        )}
                        {retailer.rejectionReason && (
                          <div className="text-xs text-red-600 mt-1 max-w-xs truncate" title={retailer.rejectionReason}>
                            Reason: {retailer.rejectionReason}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          {retailer.approvalStatus === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(retailer.id)}
                                disabled={isProcessing}
                                className="text-green-600 hover:text-green-800 disabled:opacity-50"
                                title="Approve"
                              >
                                <CheckCircleIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleReject(retailer.id)}
                                disabled={isProcessing}
                                className="text-red-600 hover:text-red-800 disabled:opacity-50"
                                title="Reject"
                              >
                                <XCircleIcon className="h-5 w-5" />
                              </button>
                            </>
                          )}
                          {retailer.approvalStatus === 'approved' && (
                            <span className="text-green-600">
                              <CheckCircleIconSolid className="h-5 w-5" />
                            </span>
                          )}
                          {retailer.approvalStatus === 'rejected' && (
                            <span className="text-red-600">
                              <XCircleIcon className="h-5 w-5" />
                            </span>
                          )}
                          <button
                            onClick={() => handleDelete(retailer.id)}
                            className="text-red-600 hover:text-red-800 ml-2"
                            title="Delete"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Retailers;

