import React, { useState, useEffect } from 'react';
import { pricingAPI } from '../../services/api';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const PaymentTerms = () => {
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTerm, setEditingTerm] = useState(null);
  const [filter, setFilter] = useState({ isActive: undefined });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    paymentDays: '',
    gracePeriod: '',
    interestRate: '',
    lateFeePercentage: '',
    applicableTo: 'all',
    applicableToId: '',
    isActive: true,
  });

  useEffect(() => {
    loadTerms();
  }, [filter]);

  const loadTerms = async () => {
    try {
      setLoading(true);
      const data = await pricingAPI.getPaymentTerms(filter);
      setTerms(data);
    } catch (error) {
      console.error('Error loading payment terms:', error);
      alert('Failed to load payment terms');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const termData = {
        ...formData,
        paymentDays: parseInt(formData.paymentDays),
        gracePeriod: formData.gracePeriod ? parseInt(formData.gracePeriod) : 0,
        interestRate: formData.interestRate ? parseFloat(formData.interestRate) : 0,
        lateFeePercentage: formData.lateFeePercentage ? parseFloat(formData.lateFeePercentage) : 0,
        applicableToId: formData.applicableToId ? parseInt(formData.applicableToId) : null,
        conditions: formData.conditions ? JSON.parse(formData.conditions) : null,
      };

      if (editingTerm) {
        await pricingAPI.updatePaymentTerm(editingTerm.id, termData);
        alert('Payment term updated successfully!');
      } else {
        await pricingAPI.createPaymentTerm(termData);
        alert('Payment term created successfully!');
      }

      resetForm();
      loadTerms();
    } catch (error) {
      console.error('Error saving payment term:', error);
      alert('Failed to save payment term');
    }
  };

  const handleEdit = (term) => {
    setEditingTerm(term);
    setFormData({
      name: term.name || '',
      description: term.description || '',
      paymentDays: term.paymentDays || '',
      gracePeriod: term.gracePeriod || '',
      interestRate: term.interestRate || '',
      lateFeePercentage: term.lateFeePercentage || '',
      applicableTo: term.applicableTo || 'all',
      applicableToId: term.applicableToId || '',
      isActive: term.isActive !== undefined ? term.isActive : true,
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this payment term?')) return;
    try {
      await pricingAPI.deletePaymentTerm(id);
      alert('Payment term deleted successfully!');
      loadTerms();
    } catch (error) {
      console.error('Error deleting payment term:', error);
      alert('Failed to delete payment term');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      paymentDays: '',
      gracePeriod: '',
      interestRate: '',
      lateFeePercentage: '',
      applicableTo: 'all',
      applicableToId: '',
      isActive: true,
    });
    setEditingTerm(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Payment Terms</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Payment Term
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
              <h2 className="text-xl font-bold">{editingTerm ? 'Edit' : 'Add'} Payment Term</h2>
              <button onClick={resetForm} className="text-gray-500 hover:text-gray-700">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full border rounded px-3 py-2"
                  placeholder="e.g., Net 30, Net 60"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 block w-full border rounded px-3 py-2"
                  rows="3"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Days *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.paymentDays}
                    onChange={(e) => setFormData({ ...formData, paymentDays: e.target.value })}
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
              </div>

              <div className="grid grid-cols-2 gap-4">
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

                <div>
                  <label className="block text-sm font-medium text-gray-700">Late Fee (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.lateFeePercentage}
                    onChange={(e) => setFormData({ ...formData, lateFeePercentage: e.target.value })}
                    className="mt-1 block w-full border rounded px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Applicable To *</label>
                <select
                  required
                  value={formData.applicableTo}
                  onChange={(e) => setFormData({ ...formData, applicableTo: e.target.value, applicableToId: '' })}
                  className="mt-1 block w-full border rounded px-3 py-2"
                >
                  <option value="all">All</option>
                  <option value="user">User</option>
                  <option value="user_group">User Group</option>
                  <option value="order_type">Order Type</option>
                </select>
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
                  {editingTerm ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Terms List */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Days</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grace Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Interest Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Late Fee %</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applicable To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {terms.map((term) => (
                <tr key={term.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{term.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{term.paymentDays} days</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{term.gracePeriod || 0} days</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{term.interestRate || 0}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{term.lateFeePercentage || 0}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{term.applicableTo}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded ${term.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {term.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(term)}
                      className="text-primary hover:text-primary-dark mr-4"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(term.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {terms.length === 0 && (
            <div className="text-center py-8 text-gray-500">No payment terms found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentTerms;

