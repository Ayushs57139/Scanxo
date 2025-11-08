import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { productsAPI } from '../../services/api';
import { CubeIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const Catalog = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    loadProducts();
  }, [location.pathname]);

  const loadProducts = async () => {
    try {
      const data = await productsAPI.getAll();
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = (productId) => {
    setSelectedProducts(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map(p => p.id));
    }
  };

  const filteredProducts = products.filter(product =>
    product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Catalog Service</h1>
        <p className="text-gray-600 mt-2">Manage SKUs, price tiers, unit conversions, and substitute products for all products</p>
      </div>

      {/* Search and Bulk Actions */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products by name, category, or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleSelectAll}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              {selectedProducts.length === products.length ? 'Deselect All' : 'Select All'}
            </button>
            {selectedProducts.length > 0 && (
              <span className="text-sm text-gray-600">
                {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            No products found
          </div>
        ) : (
          filteredProducts.map((product) => (
            <div
              key={product.id}
              className={`bg-white rounded-lg shadow hover:shadow-md transition-shadow border-2 ${
                selectedProducts.includes(product.id) ? 'border-primary' : 'border-transparent'
              }`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={() => handleSelectProduct(product.id)}
                      className="h-5 w-5 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    {product.image && (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-16 w-16 rounded-lg object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                      <p className="text-sm text-gray-500">{product.category || 'Uncategorized'}</p>
                      {product.sku && (
                        <p className="text-xs text-gray-400 mt-1">SKU: {product.sku}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-gray-500">Price:</span>
                    <span className="font-medium ml-2">₹{Number(product.price || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Stock:</span>
                    <span className={`font-medium ml-2 ${
                      (product.stockQuantity || 0) > 50 ? 'text-green-600' :
                      (product.stockQuantity || 0) > 0 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {product.stockQuantity || 0}
                    </span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Link
                    to={`/products/catalog/${product.id}`}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center justify-center text-sm"
                  >
                    <CubeIcon className="h-4 w-4 mr-2" />
                    Manage Catalog
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bulk Actions Footer */}
      {selectedProducts.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t shadow-lg p-4 z-40">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="text-sm text-gray-600">
              {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  if (selectedProducts.length === 1) {
                    navigate(`/products/catalog/${selectedProducts[0]}`);
                  } else if (selectedProducts.length > 1) {
                    alert('Please select only one product to manage its catalog, or use the "Manage Catalog" button on individual products.');
                  } else {
                    alert('Please select a product first.');
                  }
                }}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark text-sm"
              >
                Manage Selected ({selectedProducts.length})
              </button>
              <button
                onClick={() => setSelectedProducts([])}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Catalog;

