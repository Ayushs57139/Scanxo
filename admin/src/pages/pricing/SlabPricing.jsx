import React, { useState, useEffect } from 'react';
import { pricingAPI, productsAPI, categoriesAPI } from '../../services/api';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const SlabPricing = () => {
  const [slabs, setSlabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSlab, setEditingSlab] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filter, setFilter] = useState({ isActive: undefined });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    productId: '',
    categoryId: '',
    minQuantity: '',
    maxQuantity: '',
    price: '',
    discountPercentage: '',
    priority: 0,
    isActive: true,
  });

  useEffect(() => {
    loadSlabs();
    loadProducts();
    loadCategories();
  }, [filter]);

  const loadSlabs = async () => {
    try {
      setLoading(true);
      const data = await pricingAPI.getSlabPricing(filter);
      setSlabs(data);
    } catch (error) {
      console.error('Error loading slab pricing:', error);
      alert('Failed to load slab pricing');
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
      const slabData = {
        ...formData,
        productId: formData.productId ? parseInt(formData.productId) : null,
        categoryId: formData.categoryId ? parseInt(formData.categoryId) : null,
        minQuantity: parseInt(formData.minQuantity),
        maxQuantity: formData.maxQuantity ? parseInt(formData.maxQuantity) : null,
        price: parseFloat(formData.price),
        discountPercentage: formData.discountPercentage ? parseFloat(formData.discountPercentage) : 0,
        priority: parseInt(formData.priority) || 0,
      };

      if (editingSlab) {
        await pricingAPI.updateSlabPricing(editingSlab.id, slabData);
        alert('Slab pricing updated successfully!');
      } else {
        await pricingAPI.createSlabPricing(slabData);
        alert('Slab pricing created successfully!');
      }

      resetForm();
      loadSlabs();
    } catch (error) {
      console.error('Error saving slab pricing:', error);
      alert('Failed to save slab pricing');
    }
  };

  const handleEdit = (slab) => {
    setEditingSlab(slab);
    setFormData({
      name: slab.name || '',
      description: slab.description || '',
      productId: slab.productId || '',
      categoryId: slab.categoryId || '',
      minQuantity: slab.minQuantity || '',
      maxQuantity: slab.maxQuantity || '',
      price: slab.price || '',
      discountPercentage: slab.discountPercentage || '',
      priority: slab.priority || 0,
      isActive: slab.isActive !== undefined ? slab.isActive : true,
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this slab pricing?')) return;
    try {
      await pricingAPI.deleteSlabPricing(id);
      alert('Slab pricing deleted successfully!');
      loadSlabs();
    } catch (error) {
      console.error('Error deleting slab pricing:', error);
      alert('Failed to delete slab pricing');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      productId: '',
      categoryId: '',
      minQuantity: '',
      maxQuantity: '',
      price: '',
      discountPercentage: '',
      priority: 0,
      isActive: true,
    });
    setEditingSlab(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Slab Pricing</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Slab Pricing
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
              <h2 className="text-xl font-bold">{editingSlab ? 'Edit' : 'Add'} Slab Pricing</h2>
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
                  <label className="block text-sm font-medium text-gray-700">Product</label>
                  <select
                    value={formData.productId}
                    onChange={(e) => setFormData({ ...formData, productId: e.target.value, categoryId: '' })}
                    className="mt-1 block w-full border rounded px-3 py-2"
                  >
                    <option value="">All Products</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value, productId: '' })}
                    className="mt-1 block w-full border rounded px-3 py-2"
                  >
                    <option value="">All Categories</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Min Quantity *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.minQuantity}
                    onChange={(e) => setFormData({ ...formData, minQuantity: e.target.value })}
                    className="mt-1 block w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Max Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxQuantity}
                    onChange={(e) => setFormData({ ...formData, maxQuantity: e.target.value })}
                    className="mt-1 block w-full border rounded px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="mt-1 block w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Discount %</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.discountPercentage}
                    onChange={(e) => setFormData({ ...formData, discountPercentage: e.target.value })}
                    className="mt-1 block w-full border rounded px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Priority</label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="mt-1 block w-full border rounded px-3 py-2"
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
                  {editingSlab ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slabs List */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity Range</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount %</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {slabs.map((slab) => (
                <tr key={slab.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{slab.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {slab.minQuantity} - {slab.maxQuantity || '∞'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{slab.price}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{slab.discountPercentage || 0}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{slab.priority}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded ${slab.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {slab.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(slab)}
                      className="text-primary hover:text-primary-dark mr-4"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(slab.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {slabs.length === 0 && (
            <div className="text-center py-8 text-gray-500">No slab pricing found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SlabPricing;

