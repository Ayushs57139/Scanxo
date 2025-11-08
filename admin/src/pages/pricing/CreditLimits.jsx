import React, { useState, useEffect } from 'react';
import { pricingAPI, retailersAPI } from '../../services/api';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const CreditLimits = () => {
  const [creditLimits, setCreditLimits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLimit, setEditingLimit] = useState(null);
  const [retailers, setRetailers] = useState([]);
  const [filter, setFilter] = useState({ isActive: undefined });

  const [formData, setFormData] = useState({
    userId: '',
    userType: 'retailer',
    creditLimit: '',
    paymentTerms: '',
    gracePeriod: '',
    interestRate: '',
    isActive: true,
    notes: '',
  });

  useEffect(() => {
    loadCreditLimits();
    loadRetailers();
  }, [filter]);

  const loadCreditLimits = async () => {
    try {
      setLoading(true);
      const data = await pricingAPI.getCreditLimits(filter);
      setCreditLimits(data);
    } catch (error) {
      console.error('Error loading credit limits:', error);
      alert('Failed to load credit limits');
    } finally {
      setLoading(false);
    }
  };

  const loadRetailers = async () => {
    try {
      const data = await retailersAPI.getAll();
      setRetailers(data);
    } catch (error) {
      console.error('Error loading retailers:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const limitData = {
        ...formData,
        userId: parseInt(formData.userId),
        creditLimit: parseFloat(formData.creditLimit),
        paymentTerms: formData.paymentTerms ? parseInt(formData.paymentTerms) : 0,
        gracePeriod: formData.gracePeriod ? parseInt(formData.gracePeriod) : 0,
        interestRate: formData.interestRate ? parseFloat(formData.interestRate) : 0,
      };

      if (editingLimit) {
        await pricingAPI.updateCreditLimit(editingLimit.id, limitData);
        alert('Credit limit updated successfully!');
      } else {
        await pricingAPI.createCreditLimit(limitData);
        alert('Credit limit created successfully!');
      }

      resetForm();
      loadCreditLimits();
    } catch (error) {
      console.error('Error saving credit limit:', error);
      alert('Failed to save credit limit');
    }
  };

  const handleEdit = (limit) => {
    setEditingLimit(limit);
    setFormData({
      userId: limit.userId || '',
      userType: limit.userType || 'retailer',
      creditLimit: limit.creditLimit || '',
      paymentTerms: limit.paymentTerms || '',
      gracePeriod: limit.gracePeriod || '',
      interestRate: limit.interestRate || '',
      isActive: limit.isActive !== undefined ? limit.isActive : true,
      notes: limit.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this credit limit?')) return;
    try {
      await pricingAPI.deleteCreditLimit(id);
      alert('Credit limit deleted successfully!');
      loadCreditLimits();
    } catch (error) {
      console.error('Error deleting credit limit:', error);
      alert('Failed to delete credit limit');
    }
  };

  const resetForm = () => {
    setFormData({
      userId: '',
      userType: 'retailer',
      creditLimit: '',
      paymentTerms: '',
      gracePeriod: '',
      interestRate: '',
      isActive: true,
      notes: '',
    });
    setEditingLimit(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Credit Limits</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Credit Limit
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex gap-4">
          <select
            value={filter.isActive ?? ''}
            onChange={(e) => setFilter({ ...filter, isActive: e.target.value === '' ? undefined : e.target.value === 'true' })}
            className="border rounded px-3 py-2"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{editingLimit ? 'Edit' : 'Add'} Credit Limit</h2>
              <button onClick={resetForm} className="text-gray-500 hover:text-gray-700">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">User Type *</label>
                  <select
                    required
                    value={formData.userType}
                    onChange={(e) => setFormData({ ...formData, userType: e.target.value })}
                    className="mt-1 block w-full border rounded px-3 py-2"
                  >
                    <option value="retailer">Retailer</option>
                    <option value="distributor">Distributor</option>
                    <option value="customer">Customer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">User *</label>
                  <select
                    required
                    value={formData.userId}
                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                    className="mt-1 block w-full border rounded px-3 py-2"
                  >
                    <option value="">Select User</option>
                    {retailers.map((retailer) => (
                      <option key={retailer.id} value={retailer.id}>
                        {retailer.name || retailer.storeName} ({retailer.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Credit Limit (₹) *</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={formData.creditLimit}
                  onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                  className="mt-1 block w-full border rounded px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Terms (Days)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    className="mt-1 block w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Grace Period (Days)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.gracePeriod}
                    onChange={(e) => setFormData({ ...formData, gracePeriod: e.target.value })}
                    className="mt-1 block w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.interestRate}
                    onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                    className="mt-1 block w-full border rounded px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="mt-1 block w-full border rounded px-3 py-2"
                  rows="3"
                />
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
              </div>

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
                >
                  {editingLimit ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credit Limits List */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credit Limit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Used</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Available</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Terms</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {creditLimits.map((limit) => (
                <tr key={limit.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {limit.userName || limit.userEmail || `User ${limit.userId}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{limit.userType}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{limit.creditLimit?.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{limit.usedCredit?.toFixed(2) || '0.00'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ₹{limit.availableCredit?.toFixed(2) || limit.creditLimit?.toFixed(2) || '0.00'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{limit.paymentTerms || 0} days</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded ${limit.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {limit.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(limit)}
                      className="text-primary hover:text-primary-dark mr-4"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(limit.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {creditLimits.length === 0 && (
            <div className="text-center py-8 text-gray-500">No credit limits found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default CreditLimits;

