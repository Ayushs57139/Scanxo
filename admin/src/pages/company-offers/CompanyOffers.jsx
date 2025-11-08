import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { companyOffersAPI } from '../../services/api';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

const CompanyOffers = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    discount: 0,
    discountType: 'percentage',
    minPurchaseAmount: 0,
    maxDiscountAmount: null,
    validFrom: '',
    validTo: '',
    image: '',
    termsAndConditions: '',
    isActive: true,
    priority: 0,
    applicableCategories: [],
    applicableProducts: [],
  });
  const location = useLocation();

  useEffect(() => {
    loadOffers();
  }, [location.pathname]);

  const loadOffers = async () => {
    try {
      const data = await companyOffersAPI.getAll();
      setOffers(data);
    } catch (error) {
      console.error('Error loading company offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        discount: parseFloat(formData.discount) || 0,
        minPurchaseAmount: parseFloat(formData.minPurchaseAmount) || 0,
        maxDiscountAmount: formData.maxDiscountAmount ? parseFloat(formData.maxDiscountAmount) : null,
        priority: parseInt(formData.priority) || 0,
        applicableCategories: Array.isArray(formData.applicableCategories) 
          ? formData.applicableCategories 
          : formData.applicableCategories 
          ? formData.applicableCategories.split(',').map(c => c.trim()).filter(c => c)
          : [],
        applicableProducts: Array.isArray(formData.applicableProducts) 
          ? formData.applicableProducts 
          : formData.applicableProducts 
          ? formData.applicableProducts.split(',').map(p => p.trim()).filter(p => p)
          : [],
      };

      if (editingOffer) {
        await companyOffersAPI.update(editingOffer.id, submitData);
      } else {
        await companyOffersAPI.create(submitData);
      }
      resetForm();
      loadOffers();
    } catch (error) {
      alert('Error saving company offer');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      discount: 0,
      discountType: 'percentage',
      minPurchaseAmount: 0,
      maxDiscountAmount: null,
      validFrom: '',
      validTo: '',
      image: '',
      termsAndConditions: '',
      isActive: true,
      priority: 0,
      applicableCategories: [],
      applicableProducts: [],
    });
    setShowForm(false);
    setEditingOffer(null);
  };

  const handleEdit = (offer) => {
    setEditingOffer(offer);
    setFormData({
      title: offer.title || '',
      description: offer.description || '',
      discount: offer.discount || 0,
      discountType: offer.discountType || 'percentage',
      minPurchaseAmount: offer.minPurchaseAmount || 0,
      maxDiscountAmount: offer.maxDiscountAmount || null,
      validFrom: offer.validFrom || '',
      validTo: offer.validTo || '',
      image: offer.image || '',
      termsAndConditions: offer.termsAndConditions || '',
      isActive: offer.isActive !== undefined ? offer.isActive : true,
      priority: offer.priority || 0,
      applicableCategories: Array.isArray(offer.applicableCategories) 
        ? offer.applicableCategories.join(', ')
        : offer.applicableCategories || '',
      applicableProducts: Array.isArray(offer.applicableProducts) 
        ? offer.applicableProducts.join(', ')
        : offer.applicableProducts || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this company offer?')) {
      try {
        await companyOffersAPI.delete(id);
        loadOffers();
      } catch (error) {
        alert('Error deleting company offer');
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Company Offers</h1>
          <p className="text-gray-600 mt-2">Manage company offers and discounts</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingOffer(null);
            resetForm();
          }}
          className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Offer
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingOffer ? 'Edit Company Offer' : 'Add New Company Offer'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discount Type
                </label>
                <select
                  value={formData.discountType}
                  onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discount {formData.discountType === 'percentage' ? '(%)' : '(₹)'} *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min. Purchase Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.minPurchaseAmount}
                  onChange={(e) => setFormData({ ...formData, minPurchaseAmount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max. Discount Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.maxDiscountAmount || ''}
                  onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value || null })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valid From
                </label>
                <input
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valid To
                </label>
                <input
                  type="date"
                  value={formData.validTo}
                  onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image URL
                </label>
                <input
                  type="url"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://example.com/offer.jpg"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Terms & Conditions
                </label>
                <textarea
                  value={formData.termsAndConditions}
                  onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Applicable Categories (comma-separated)
                </label>
                <input
                  type="text"
                  value={typeof formData.applicableCategories === 'string' ? formData.applicableCategories : formData.applicableCategories?.join(', ') || ''}
                  onChange={(e) => setFormData({ ...formData, applicableCategories: e.target.value })}
                  placeholder="Category1, Category2"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Applicable Products (comma-separated IDs)
                </label>
                <input
                  type="text"
                  value={typeof formData.applicableProducts === 'string' ? formData.applicableProducts : formData.applicableProducts?.join(', ') || ''}
                  onChange={(e) => setFormData({ ...formData, applicableProducts: e.target.value })}
                  placeholder="1, 2, 3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                  Active
                </label>
              </div>
            </div>
            {formData.image && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preview
                </label>
                <img
                  src={formData.image}
                  alt="Offer preview"
                  className="w-full h-48 object-cover rounded-lg border"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
              >
                {editingOffer ? 'Update Offer' : 'Create Offer'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {offers.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            No company offers found
          </div>
        ) : (
          offers.map((offer) => {
            const discountText = offer.discountType === 'percentage' 
              ? `${offer.discount}% OFF`
              : `₹${offer.discount} OFF`;
            
            return (
              <div key={offer.id} className="bg-white rounded-lg shadow overflow-hidden">
                {offer.image && (
                  <div className="relative h-48 bg-gray-200">
                    <img
                      src={offer.image}
                      alt={offer.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">{offer.title}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      offer.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {offer.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-lg font-bold text-primary mb-2">{discountText}</p>
                  {offer.description && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{offer.description}</p>
                  )}
                  <div className="text-xs text-gray-500 space-y-1 mb-4">
                    {offer.minPurchaseAmount > 0 && (
                      <div>Min. Purchase: ₹{offer.minPurchaseAmount}</div>
                    )}
                    {(offer.validFrom || offer.validTo) && (
                      <div>
                        {offer.validFrom && offer.validTo 
                          ? `${formatDate(offer.validFrom)} - ${formatDate(offer.validTo)}`
                          : offer.validFrom 
                          ? `From ${formatDate(offer.validFrom)}`
                          : `Until ${formatDate(offer.validTo)}`}
                      </div>
                    )}
                    <div>Priority: {offer.priority}</div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => handleEdit(offer)}
                      className="text-primary hover:text-primary-dark"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(offer.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CompanyOffers;

