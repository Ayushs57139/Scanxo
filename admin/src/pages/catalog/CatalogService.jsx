import React, { useState, useEffect } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import { productsAPI } from '../../services/api';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowLeftIcon,
  CubeIcon,
  CurrencyDollarIcon,
  ArrowsRightLeftIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

const CatalogService = () => {
  const { id } = useParams();
  const location = useLocation();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('skus');
  
  // SKUs
  const [skus, setSkus] = useState([]);
  const [showSKUForm, setShowSKUForm] = useState(false);
  const [editingSKU, setEditingSKU] = useState(null);
  const [skuFormData, setSkuFormData] = useState({
    sku: '',
    variantName: '',
    variantValue: '',
    price: '',
    stockQuantity: '',
    barcode: '',
    isActive: true,
  });

  // Price Tiers
  const [priceTiers, setPriceTiers] = useState([]);
  const [showTierForm, setShowTierForm] = useState(false);
  const [editingTier, setEditingTier] = useState(null);
  const [tierFormData, setTierFormData] = useState({
    tierName: '',
    minQuantity: '',
    maxQuantity: '',
    price: '',
    discount: '',
    isActive: true,
  });

  // Unit Conversions
  const [unitConversions, setUnitConversions] = useState([]);
  const [showConversionForm, setShowConversionForm] = useState(false);
  const [editingConversion, setEditingConversion] = useState(null);
  const [conversionFormData, setConversionFormData] = useState({
    fromUnit: '',
    toUnit: '',
    conversionFactor: '',
    isActive: true,
  });

  // Substitute Products
  const [substitutes, setSubstitutes] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [showSubstituteForm, setShowSubstituteForm] = useState(false);
  const [editingSubstitute, setEditingSubstitute] = useState(null);
  const [substituteFormData, setSubstituteFormData] = useState({
    substituteProductId: '',
    priority: '',
    reason: '',
    isActive: true,
  });

  useEffect(() => {
    if (id) {
      loadProduct();
      loadAllProducts();
    }
  }, [id, location.pathname]);

  useEffect(() => {
    if (id) {
      switch (activeTab) {
        case 'skus':
          loadSKUs();
          break;
        case 'price-tiers':
          loadPriceTiers();
          break;
        case 'unit-conversions':
          loadUnitConversions();
          break;
        case 'substitutes':
          loadSubstitutes();
          break;
        default:
          break;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, id]);

  const loadProduct = async () => {
    try {
      const data = await productsAPI.getById(id);
      setProduct(data);
    } catch (error) {
      console.error('Error loading product:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSKUs = async () => {
    try {
      const data = await productsAPI.getSKUs(id);
      setSkus(data || []);
    } catch (error) {
      console.error('Error loading SKUs:', error);
      setSkus([]);
    }
  };

  const loadPriceTiers = async () => {
    try {
      const data = await productsAPI.getPriceTiers(id);
      setPriceTiers(data || []);
    } catch (error) {
      console.error('Error loading price tiers:', error);
      setPriceTiers([]);
    }
  };

  const loadUnitConversions = async () => {
    try {
      const data = await productsAPI.getUnitConversions(id);
      setUnitConversions(data || []);
    } catch (error) {
      console.error('Error loading unit conversions:', error);
      setUnitConversions([]);
    }
  };

  const loadSubstitutes = async () => {
    try {
      const data = await productsAPI.getSubstitutes(id);
      setSubstitutes(data || []);
    } catch (error) {
      console.error('Error loading substitutes:', error);
      setSubstitutes([]);
    }
  };

  const loadAllProducts = async () => {
    try {
      const data = await productsAPI.getAll();
      setAllProducts(data.filter(p => p.id !== parseInt(id)));
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  // SKU Handlers
  const handleSKUSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!skuFormData.sku || skuFormData.sku.trim() === '') {
      alert('Please enter a SKU code');
      return;
    }
    
    try {
      const skuData = {
        sku: skuFormData.sku.trim(),
        variantName: skuFormData.variantName?.trim() || null,
        variantValue: skuFormData.variantValue?.trim() || null,
        price: skuFormData.price ? parseFloat(skuFormData.price) : null,
        stockQuantity: skuFormData.stockQuantity ? parseInt(skuFormData.stockQuantity) : 0,
        barcode: skuFormData.barcode?.trim() || null,
        isActive: skuFormData.isActive !== undefined ? skuFormData.isActive : true,
      };
      
      if (editingSKU) {
        await productsAPI.updateSKU(editingSKU.id, skuData);
        alert('SKU updated successfully!');
      } else {
        await productsAPI.createSKU(id, skuData);
        alert('SKU created successfully!');
      }
      
      resetSKUForm();
      await loadSKUs();
    } catch (error) {
      console.error('Error saving SKU:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error';
      alert(`Error saving SKU: ${errorMessage}`);
    }
  };

  const handleSKUDelete = async (skuId) => {
    if (window.confirm('Are you sure you want to delete this SKU? This action cannot be undone.')) {
      try {
        await productsAPI.deleteSKU(skuId);
        alert('SKU deleted successfully!');
        await loadSKUs();
      } catch (error) {
        console.error('Error deleting SKU:', error);
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error';
        alert(`Error deleting SKU: ${errorMessage}`);
      }
    }
  };

  const clearSKUFormData = () => {
    setSkuFormData({
      sku: '',
      variantName: '',
      variantValue: '',
      price: '',
      stockQuantity: '',
      barcode: '',
      isActive: true,
    });
  };

  const resetSKUForm = () => {
    clearSKUFormData();
    setShowSKUForm(false);
    setEditingSKU(null);
  };

  // Price Tier Handlers
  const handleTierSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!tierFormData.tierName || tierFormData.tierName.trim() === '') {
      alert('Please enter a tier name');
      return;
    }
    
    if (!tierFormData.minQuantity || parseInt(tierFormData.minQuantity) < 0) {
      alert('Please enter a valid minimum quantity');
      return;
    }
    
    if (!tierFormData.price || parseFloat(tierFormData.price) <= 0) {
      alert('Please enter a valid price');
      return;
    }
    
    try {
      const tierData = {
        tierName: tierFormData.tierName.trim(),
        minQuantity: parseInt(tierFormData.minQuantity),
        maxQuantity: tierFormData.maxQuantity && tierFormData.maxQuantity.trim() !== '' ? parseInt(tierFormData.maxQuantity) : null,
        price: parseFloat(tierFormData.price),
        discount: tierFormData.discount && tierFormData.discount !== '' ? parseFloat(tierFormData.discount) : 0,
        isActive: tierFormData.isActive !== undefined ? tierFormData.isActive : true,
      };
      
      if (editingTier) {
        await productsAPI.updatePriceTier(editingTier.id, tierData);
        alert('Price tier updated successfully!');
      } else {
        await productsAPI.createPriceTier(id, tierData);
        alert('Price tier created successfully!');
      }
      
      resetTierForm();
      await loadPriceTiers();
    } catch (error) {
      console.error('Error saving price tier:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error';
      alert(`Error saving price tier: ${errorMessage}`);
    }
  };

  const handleTierDelete = async (tierId) => {
    if (window.confirm('Are you sure you want to delete this price tier? This action cannot be undone.')) {
      try {
        await productsAPI.deletePriceTier(tierId);
        alert('Price tier deleted successfully!');
        await loadPriceTiers();
      } catch (error) {
        console.error('Error deleting price tier:', error);
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error';
        alert(`Error deleting price tier: ${errorMessage}`);
      }
    }
  };

  const clearTierFormData = () => {
    setTierFormData({
      tierName: '',
      minQuantity: '',
      maxQuantity: '',
      price: '',
      discount: '',
      isActive: true,
    });
  };

  const resetTierForm = () => {
    clearTierFormData();
    setShowTierForm(false);
    setEditingTier(null);
  };

  // Unit Conversion Handlers
  const handleConversionSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!conversionFormData.fromUnit || conversionFormData.fromUnit.trim() === '') {
      alert('Please enter a "From Unit"');
      return;
    }
    
    if (!conversionFormData.toUnit || conversionFormData.toUnit.trim() === '') {
      alert('Please enter a "To Unit"');
      return;
    }
    
    if (!conversionFormData.conversionFactor || parseFloat(conversionFormData.conversionFactor) <= 0) {
      alert('Please enter a valid conversion factor (must be greater than 0)');
      return;
    }
    
    try {
      const conversionData = {
        fromUnit: conversionFormData.fromUnit.trim(),
        toUnit: conversionFormData.toUnit.trim(),
        conversionFactor: parseFloat(conversionFormData.conversionFactor),
        isActive: conversionFormData.isActive !== undefined ? conversionFormData.isActive : true,
      };
      
      if (editingConversion) {
        await productsAPI.updateUnitConversion(editingConversion.id, conversionData);
        alert('Unit conversion updated successfully!');
      } else {
        await productsAPI.createUnitConversion(id, conversionData);
        alert('Unit conversion created successfully!');
      }
      
      resetConversionForm();
      await loadUnitConversions();
    } catch (error) {
      console.error('Error saving unit conversion:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error';
      alert(`Error saving unit conversion: ${errorMessage}`);
    }
  };

  const handleConversionDelete = async (conversionId) => {
    if (window.confirm('Are you sure you want to delete this unit conversion? This action cannot be undone.')) {
      try {
        await productsAPI.deleteUnitConversion(conversionId);
        alert('Unit conversion deleted successfully!');
        await loadUnitConversions();
      } catch (error) {
        console.error('Error deleting unit conversion:', error);
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error';
        alert(`Error deleting unit conversion: ${errorMessage}`);
      }
    }
  };

  const clearConversionFormData = () => {
    setConversionFormData({
      fromUnit: '',
      toUnit: '',
      conversionFactor: '',
      isActive: true,
    });
  };

  const resetConversionForm = () => {
    clearConversionFormData();
    setShowConversionForm(false);
    setEditingConversion(null);
  };

  // Substitute Handlers
  const handleSubstituteSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!substituteFormData.substituteProductId || substituteFormData.substituteProductId === '') {
      alert('Please select a substitute product');
      return;
    }
    
    const substituteProductId = parseInt(substituteFormData.substituteProductId);
    if (substituteProductId === parseInt(id)) {
      alert('A product cannot be a substitute for itself');
      return;
    }
    
    try {
      const substituteData = {
        substituteProductId: substituteProductId,
        priority: substituteFormData.priority && substituteFormData.priority !== '' ? parseInt(substituteFormData.priority) : 0,
        reason: substituteFormData.reason?.trim() || null,
        isActive: substituteFormData.isActive !== undefined ? substituteFormData.isActive : true,
      };
      
      if (editingSubstitute) {
        await productsAPI.updateSubstitute(editingSubstitute.id, substituteData);
        alert('Substitute product updated successfully!');
      } else {
        await productsAPI.createSubstitute(id, substituteData);
        alert('Substitute product created successfully!');
      }
      
      resetSubstituteForm();
      await loadSubstitutes();
    } catch (error) {
      console.error('Error saving substitute product:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error';
      alert(`Error saving substitute product: ${errorMessage}`);
    }
  };

  const handleSubstituteDelete = async (substituteId) => {
    if (window.confirm('Are you sure you want to delete this substitute product? This action cannot be undone.')) {
      try {
        await productsAPI.deleteSubstitute(substituteId);
        alert('Substitute product deleted successfully!');
        await loadSubstitutes();
      } catch (error) {
        console.error('Error deleting substitute product:', error);
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error';
        alert(`Error deleting substitute product: ${errorMessage}`);
      }
    }
  };

  const clearSubstituteFormData = () => {
    setSubstituteFormData({
      substituteProductId: '',
      priority: '',
      reason: '',
      isActive: true,
    });
  };

  const resetSubstituteForm = () => {
    clearSubstituteFormData();
    setShowSubstituteForm(false);
    setEditingSubstitute(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Product not found</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/products"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Products
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catalog Service</h1>
          <p className="text-gray-600 mt-1">{product.name}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {[
              { id: 'skus', label: 'SKUs', icon: CubeIcon },
              { id: 'price-tiers', label: 'Price Tiers', icon: CurrencyDollarIcon },
              { id: 'unit-conversions', label: 'Unit Conversions', icon: ArrowsRightLeftIcon },
              { id: 'substitutes', label: 'Substitute Products', icon: ArrowPathIcon },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-6 py-4 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* SKUs Tab */}
          {activeTab === 'skus' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Product SKUs</h3>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Add SKU button clicked');
                    setEditingSKU(null);
                    clearSKUFormData();
                    setShowSKUForm(true);
                  }}
                  className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark flex items-center transition-colors cursor-pointer"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add SKU
                </button>
              </div>

              {showSKUForm && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-lg">
                      {editingSKU ? 'Edit SKU' : 'Add New SKU'}
                    </h4>
                    <button
                      type="button"
                      onClick={resetSKUForm}
                      className="text-gray-500 hover:text-gray-700 text-sm"
                    >
                      ✕ Close
                    </button>
                  </div>
                  <form onSubmit={handleSKUSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
                      <input
                        type="text"
                        required
                        value={skuFormData.sku}
                        onChange={(e) => setSkuFormData({ ...skuFormData, sku: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Variant Name</label>
                      <input
                        type="text"
                        value={skuFormData.variantName}
                        onChange={(e) => setSkuFormData({ ...skuFormData, variantName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Variant Value</label>
                      <input
                        type="text"
                        value={skuFormData.variantValue}
                        onChange={(e) => setSkuFormData({ ...skuFormData, variantValue: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={skuFormData.price}
                        onChange={(e) => setSkuFormData({ ...skuFormData, price: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
                      <input
                        type="number"
                        value={skuFormData.stockQuantity}
                        onChange={(e) => setSkuFormData({ ...skuFormData, stockQuantity: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
                      <input
                        type="text"
                        value={skuFormData.barcode}
                        onChange={(e) => setSkuFormData({ ...skuFormData, barcode: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div className="md:col-span-3 flex items-center">
                      <input
                        type="checkbox"
                        id="skuIsActive"
                        checked={skuFormData.isActive}
                        onChange={(e) => setSkuFormData({ ...skuFormData, isActive: e.target.checked })}
                        className="h-4 w-4 text-primary"
                      />
                      <label htmlFor="skuIsActive" className="ml-2 text-sm text-gray-700">Active</label>
                    </div>
                    <div className="md:col-span-3 flex space-x-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark text-sm"
                      >
                        {editingSKU ? 'Update' : 'Create'}
                      </button>
                      <button
                        type="button"
                        onClick={resetSKUForm}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variant</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Barcode</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {skus.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-4 py-8 text-center text-gray-500">No SKUs found</td>
                      </tr>
                    ) : (
                      skus.map((sku) => (
                        <tr key={sku.id}>
                          <td className="px-4 py-3 text-sm font-medium">{sku.sku}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {sku.variantName && sku.variantValue ? `${sku.variantName}: ${sku.variantValue}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm">₹{Number(sku.price || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm">{sku.stockQuantity || 0}</td>
                          <td className="px-4 py-3 text-sm">{sku.barcode || '-'}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              sku.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {sku.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex space-x-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setEditingSKU(sku);
                                  setSkuFormData({
                                    sku: sku.sku || '',
                                    variantName: sku.variantName || '',
                                    variantValue: sku.variantValue || '',
                                    price: sku.price || '',
                                    stockQuantity: sku.stockQuantity || '',
                                    barcode: sku.barcode || '',
                                    isActive: sku.isActive !== undefined ? sku.isActive : true,
                                  });
                                  setShowSKUForm(true);
                                }}
                                className="text-primary hover:text-primary-dark cursor-pointer"
                              >
                                <PencilIcon className="h-5 w-5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleSKUDelete(sku.id);
                                }}
                                className="text-red-600 hover:text-red-800 cursor-pointer"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Price Tiers Tab */}
          {activeTab === 'price-tiers' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Price Tiers</h3>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Add Price Tier button clicked');
                    setEditingTier(null);
                    clearTierFormData();
                    setShowTierForm(true);
                  }}
                  className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark flex items-center transition-colors cursor-pointer"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Price Tier
                </button>
              </div>

              {showTierForm && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-lg">
                      {editingTier ? 'Edit Price Tier' : 'Add New Price Tier'}
                    </h4>
                    <button
                      type="button"
                      onClick={resetTierForm}
                      className="text-gray-500 hover:text-gray-700 text-sm"
                    >
                      ✕ Close
                    </button>
                  </div>
                  <form onSubmit={handleTierSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tier Name *</label>
                      <input
                        type="text"
                        required
                        value={tierFormData.tierName}
                        onChange={(e) => setTierFormData({ ...tierFormData, tierName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Min Quantity *</label>
                      <input
                        type="number"
                        required
                        value={tierFormData.minQuantity}
                        onChange={(e) => setTierFormData({ ...tierFormData, minQuantity: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Quantity</label>
                      <input
                        type="number"
                        value={tierFormData.maxQuantity}
                        onChange={(e) => setTierFormData({ ...tierFormData, maxQuantity: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={tierFormData.price}
                        onChange={(e) => setTierFormData({ ...tierFormData, price: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Discount (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={tierFormData.discount}
                        onChange={(e) => setTierFormData({ ...tierFormData, discount: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div className="md:col-span-3 flex items-center">
                      <input
                        type="checkbox"
                        id="tierIsActive"
                        checked={tierFormData.isActive}
                        onChange={(e) => setTierFormData({ ...tierFormData, isActive: e.target.checked })}
                        className="h-4 w-4 text-primary"
                      />
                      <label htmlFor="tierIsActive" className="ml-2 text-sm text-gray-700">Active</label>
                    </div>
                    <div className="md:col-span-3 flex space-x-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark text-sm"
                      >
                        {editingTier ? 'Update' : 'Create'}
                      </button>
                      <button
                        type="button"
                        onClick={resetTierForm}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity Range</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {priceTiers.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center text-gray-500">No price tiers found</td>
                      </tr>
                    ) : (
                      priceTiers.map((tier) => (
                        <tr key={tier.id}>
                          <td className="px-4 py-3 text-sm font-medium">{tier.tierName}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {tier.minQuantity} - {tier.maxQuantity || '∞'}
                          </td>
                          <td className="px-4 py-3 text-sm">₹{Number(tier.price || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm">{tier.discount || 0}%</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              tier.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {tier.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex space-x-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setEditingTier(tier);
                                  setTierFormData({
                                    tierName: tier.tierName || '',
                                    minQuantity: tier.minQuantity || '',
                                    maxQuantity: tier.maxQuantity || '',
                                    price: tier.price || '',
                                    discount: tier.discount || '',
                                    isActive: tier.isActive !== undefined ? tier.isActive : true,
                                  });
                                  setShowTierForm(true);
                                }}
                                className="text-primary hover:text-primary-dark cursor-pointer"
                              >
                                <PencilIcon className="h-5 w-5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleTierDelete(tier.id);
                                }}
                                className="text-red-600 hover:text-red-800 cursor-pointer"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Unit Conversions Tab */}
          {activeTab === 'unit-conversions' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Unit Conversions</h3>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Add Conversion button clicked');
                    setEditingConversion(null);
                    clearConversionFormData();
                    setShowConversionForm(true);
                  }}
                  className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark flex items-center transition-colors cursor-pointer"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Conversion
                </button>
              </div>

              {showConversionForm && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-lg">
                      {editingConversion ? 'Edit Unit Conversion' : 'Add New Unit Conversion'}
                    </h4>
                    <button
                      type="button"
                      onClick={resetConversionForm}
                      className="text-gray-500 hover:text-gray-700 text-sm"
                    >
                      ✕ Close
                    </button>
                  </div>
                  <form onSubmit={handleConversionSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">From Unit *</label>
                      <input
                        type="text"
                        required
                        value={conversionFormData.fromUnit}
                        onChange={(e) => setConversionFormData({ ...conversionFormData, fromUnit: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="e.g., tablets"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">To Unit *</label>
                      <input
                        type="text"
                        required
                        value={conversionFormData.toUnit}
                        onChange={(e) => setConversionFormData({ ...conversionFormData, toUnit: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="e.g., strips"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Conversion Factor *</label>
                      <input
                        type="number"
                        step="0.0001"
                        required
                        value={conversionFormData.conversionFactor}
                        onChange={(e) => setConversionFormData({ ...conversionFormData, conversionFactor: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="e.g., 10 (1 strip = 10 tablets)"
                      />
                    </div>
                    <div className="md:col-span-4 flex items-center">
                      <input
                        type="checkbox"
                        id="conversionIsActive"
                        checked={conversionFormData.isActive}
                        onChange={(e) => setConversionFormData({ ...conversionFormData, isActive: e.target.checked })}
                        className="h-4 w-4 text-primary"
                      />
                      <label htmlFor="conversionIsActive" className="ml-2 text-sm text-gray-700">Active</label>
                    </div>
                    <div className="md:col-span-4 flex space-x-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark text-sm"
                      >
                        {editingConversion ? 'Update' : 'Create'}
                      </button>
                      <button
                        type="button"
                        onClick={resetConversionForm}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">From Unit</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">To Unit</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conversion Factor</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {unitConversions.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-gray-500">No unit conversions found</td>
                      </tr>
                    ) : (
                      unitConversions.map((conversion) => (
                        <tr key={conversion.id}>
                          <td className="px-4 py-3 text-sm font-medium">{conversion.fromUnit}</td>
                          <td className="px-4 py-3 text-sm">{conversion.toUnit}</td>
                          <td className="px-4 py-3 text-sm">{conversion.conversionFactor}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              conversion.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {conversion.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex space-x-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setEditingConversion(conversion);
                                  setConversionFormData({
                                    fromUnit: conversion.fromUnit || '',
                                    toUnit: conversion.toUnit || '',
                                    conversionFactor: conversion.conversionFactor || '',
                                    isActive: conversion.isActive !== undefined ? conversion.isActive : true,
                                  });
                                  setShowConversionForm(true);
                                }}
                                className="text-primary hover:text-primary-dark cursor-pointer"
                              >
                                <PencilIcon className="h-5 w-5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleConversionDelete(conversion.id);
                                }}
                                className="text-red-600 hover:text-red-800 cursor-pointer"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Substitute Products Tab */}
          {activeTab === 'substitutes' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Substitute Products</h3>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Add Substitute button clicked');
                    setEditingSubstitute(null);
                    clearSubstituteFormData();
                    setShowSubstituteForm(true);
                  }}
                  className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark flex items-center transition-colors cursor-pointer"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Substitute
                </button>
              </div>

              {showSubstituteForm && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-lg">
                      {editingSubstitute ? 'Edit Substitute Product' : 'Add New Substitute Product'}
                    </h4>
                    <button
                      type="button"
                      onClick={resetSubstituteForm}
                      className="text-gray-500 hover:text-gray-700 text-sm"
                    >
                      ✕ Close
                    </button>
                  </div>
                  <form onSubmit={handleSubstituteSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Substitute Product *</label>
                      <select
                        required
                        value={substituteFormData.substituteProductId}
                        onChange={(e) => setSubstituteFormData({ ...substituteFormData, substituteProductId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">Select Product</option>
                        {allProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                      <input
                        type="number"
                        value={substituteFormData.priority}
                        onChange={(e) => setSubstituteFormData({ ...substituteFormData, priority: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="0 = highest priority"
                      />
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={substituteFormData.isActive}
                        onChange={(e) => setSubstituteFormData({ ...substituteFormData, isActive: e.target.checked })}
                        className="h-4 w-4 text-primary"
                      />
                      <label className="ml-2 text-sm text-gray-700">Active</label>
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                      <textarea
                        value={substituteFormData.reason}
                        onChange={(e) => setSubstituteFormData({ ...substituteFormData, reason: e.target.value })}
                        rows="2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="Why is this a substitute?"
                      />
                    </div>
                    <div className="md:col-span-3 flex space-x-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark text-sm"
                      >
                        {editingSubstitute ? 'Update' : 'Create'}
                      </button>
                      <button
                        type="button"
                        onClick={resetSubstituteForm}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Substitute Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {substitutes.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center text-gray-500">No substitute products found</td>
                      </tr>
                    ) : (
                      substitutes.map((substitute) => (
                        <tr key={substitute.id}>
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              {substitute.substituteProductImage && (
                                <img
                                  src={substitute.substituteProductImage}
                                  alt={substitute.substituteProductName}
                                  className="h-10 w-10 rounded-lg object-cover mr-3"
                                />
                              )}
                              <span className="text-sm font-medium">{substitute.substituteProductName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">₹{Number(substitute.substituteProductPrice || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm">{substitute.priority || 0}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{substitute.reason || '-'}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              substitute.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {substitute.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex space-x-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setEditingSubstitute(substitute);
                                  setSubstituteFormData({
                                    substituteProductId: substitute.substituteProductId || '',
                                    priority: substitute.priority || '',
                                    reason: substitute.reason || '',
                                    isActive: substitute.isActive !== undefined ? substitute.isActive : true,
                                  });
                                  setShowSubstituteForm(true);
                                }}
                                className="text-primary hover:text-primary-dark cursor-pointer"
                              >
                                <PencilIcon className="h-5 w-5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleSubstituteDelete(substitute.id);
                                }}
                                className="text-red-600 hover:text-red-800 cursor-pointer"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CatalogService;

