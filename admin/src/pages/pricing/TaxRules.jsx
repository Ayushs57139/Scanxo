import React, { useState, useEffect } from 'react';
import { pricingAPI, productsAPI, categoriesAPI } from '../../services/api';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const TaxRules = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filter, setFilter] = useState({ isActive: undefined });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    taxType: 'GST',
    taxRate: '',
    applicableTo: 'all',
    applicableToId: '',
    stateCode: '',
    hsnCode: '',
    effectiveFrom: '',
    effectiveTo: '',
    isActive: true,
  });

  const stateCodes = [
    'AP', 'AR', 'AS', 'BR', 'CT', 'GA', 'GJ', 'HR', 'HP', 'JK',
    'JH', 'KA', 'KL', 'LA', 'MP', 'MH', 'MN', 'ML', 'MZ', 'NL',
    'OR', 'PB', 'RJ', 'SK', 'TN', 'TG', 'TR', 'UP', 'UT', 'WB'
  ];

  useEffect(() => {
    loadRules();
    loadProducts();
    loadCategories();
  }, [filter]);

  const loadRules = async () => {
    try {
      setLoading(true);
      const data = await pricingAPI.getTaxRules(filter);
      setRules(data);
    } catch (error) {
      console.error('Error loading tax rules:', error);
      alert('Failed to load tax rules');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await productsAPI.getAll();
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await categoriesAPI.getAll();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const ruleData = {
        ...formData,
        taxRate: parseFloat(formData.taxRate),
        applicableToId: formData.applicableToId ? parseInt(formData.applicableToId) : null,
        stateCode: formData.stateCode || null,
        hsnCode: formData.hsnCode || null,
        effectiveFrom: formData.effectiveFrom || null,
        effectiveTo: formData.effectiveTo || null,
      };

      if (editingRule) {
        await pricingAPI.updateTaxRule(editingRule.id, ruleData);
        alert('Tax rule updated successfully!');
      } else {
        await pricingAPI.createTaxRule(ruleData);
        alert('Tax rule created successfully!');
      }

      resetForm();
      loadRules();
    } catch (error) {
      console.error('Error saving tax rule:', error);
      alert('Failed to save tax rule');
    }
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name || '',
      description: rule.description || '',
      taxType: rule.taxType || 'GST',
      taxRate: rule.taxRate || '',
      applicableTo: rule.applicableTo || 'all',
      applicableToId: rule.applicableToId || '',
      stateCode: rule.stateCode || '',
      hsnCode: rule.hsnCode || '',
      effectiveFrom: rule.effectiveFrom ? rule.effectiveFrom.split('T')[0] : '',
      effectiveTo: rule.effectiveTo ? rule.effectiveTo.split('T')[0] : '',
      isActive: rule.isActive !== undefined ? rule.isActive : true,
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this tax rule?')) return;
    try {
      await pricingAPI.deleteTaxRule(id);
      alert('Tax rule deleted successfully!');
      loadRules();
    } catch (error) {
      console.error('Error deleting tax rule:', error);
      alert('Failed to delete tax rule');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      taxType: 'GST',
      taxRate: '',
      applicableTo: 'all',
      applicableToId: '',
      stateCode: '',
      hsnCode: '',
      effectiveFrom: '',
      effectiveTo: '',
      isActive: true,
    });
    setEditingRule(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Tax Rules (GST)</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Tax Rule
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
              <h2 className="text-xl font-bold">{editingRule ? 'Edit' : 'Add'} Tax Rule</h2>
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
                  <label className="block text-sm font-medium text-gray-700">Tax Type *</label>
                  <select
                    required
                    value={formData.taxType}
                    onChange={(e) => setFormData({ ...formData, taxType: e.target.value })}
                    className="mt-1 block w-full border rounded px-3 py-2"
                  >
                    <option value="GST">GST</option>
                    <option value="SGST">SGST</option>
                    <option value="CGST">CGST</option>
                    <option value="IGST">IGST</option>
                    <option value="VAT">VAT</option>
                    <option value="CST">CST</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Tax Rate (%) *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                    className="mt-1 block w-full border rounded px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Applicable To *</label>
                  <select
                    required
                    value={formData.applicableTo}
                    onChange={(e) => setFormData({ ...formData, applicableTo: e.target.value, applicableToId: '', stateCode: '' })}
                    className="mt-1 block w-full border rounded px-3 py-2"
                  >
                    <option value="all">All</option>
                    <option value="category">Category</option>
                    <option value="product">Product</option>
                    <option value="state">State</option>
                  </select>
                </div>

                {formData.applicableTo === 'product' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Product *</label>
                    <select
                      required
                      value={formData.applicableToId}
                      onChange={(e) => setFormData({ ...formData, applicableToId: e.target.value })}
                      className="mt-1 block w-full border rounded px-3 py-2"
                    >
                      <option value="">Select Product</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.applicableTo === 'category' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category *</label>
                    <select
                      required
                      value={formData.applicableToId}
                      onChange={(e) => setFormData({ ...formData, applicableToId: e.target.value })}
                      className="mt-1 block w-full border rounded px-3 py-2"
                    >
                      <option value="">Select Category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.applicableTo === 'state' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">State Code *</label>
                    <select
                      required
                      value={formData.stateCode}
                      onChange={(e) => setFormData({ ...formData, stateCode: e.target.value })}
                      className="mt-1 block w-full border rounded px-3 py-2"
                    >
                      <option value="">Select State</option>
                      {stateCodes.map((code) => (
                        <option key={code} value={code}>
                          {code}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">HSN Code</label>
                <input
                  type="text"
                  value={formData.hsnCode}
                  onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                  className="mt-1 block w-full border rounded px-3 py-2"
                  placeholder="e.g., 3004"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Effective From</label>
                  <input
                    type="date"
                    value={formData.effectiveFrom}
                    onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                    className="mt-1 block w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Effective To</label>
                  <input
                    type="date"
                    value={formData.effectiveTo}
                    onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })}
                    className="mt-1 block w-full border rounded px-3 py-2"
                  />
                </div>
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
                  {editingRule ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rules List */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tax Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applicable To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">HSN Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{rule.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rule.taxType}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rule.taxRate}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {rule.applicableTo} {rule.stateCode ? `(${rule.stateCode})` : ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rule.hsnCode || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded ${rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(rule)}
                      className="text-primary hover:text-primary-dark mr-4"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rules.length === 0 && (
            <div className="text-center py-8 text-gray-500">No tax rules found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaxRules;

