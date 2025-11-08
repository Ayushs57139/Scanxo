import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { inventoryAPI, productsAPI } from '../../services/api';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BuildingStorefrontIcon,
  CubeIcon,
  ClipboardDocumentListIcon,
  BellIcon,
} from '@heroicons/react/24/outline';

const InventoryService = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('warehouses');
  
  // Warehouses
  const [warehouses, setWarehouses] = useState([]);
  const [showWarehouseForm, setShowWarehouseForm] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [warehouseFormData, setWarehouseFormData] = useState({
    name: '',
    code: '',
    type: 'warehouse',
    address: '',
    city: '',
    state: '',
    pincode: '',
    contactPerson: '',
    phone: '',
    email: '',
    isActive: true,
  });

  // Stock Inventory
  const [stockInventory, setStockInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [showStockForm, setShowStockForm] = useState(false);
  const [editingStock, setEditingStock] = useState(null);
  const [stockFormData, setStockFormData] = useState({
    productId: '',
    warehouseId: '',
    batchNumber: '',
    expiryDate: '',
    quantity: '',
    costPrice: '',
    sellingPrice: '',
    stockMethod: 'FIFO',
    location: '',
    notes: '',
  });

  // PO Reservations
  const [poReservations, setPOReservations] = useState([]);
  const [showPOReservationForm, setShowPOReservationForm] = useState(false);
  const [editingPOReservation, setEditingPOReservation] = useState(null);
  const [poReservationFormData, setPOReservationFormData] = useState({
    poNumber: '',
    productId: '',
    warehouseId: '',
    quantity: '',
    batchNumber: '',
    expiryDate: '',
    notes: '',
    stockMethod: 'FIFO',
  });

  // Stock Events
  const [stockEvents, setStockEvents] = useState([]);
  const [eventFilter, setEventFilter] = useState({
    eventType: '',
    isPublished: '',
  });

  useEffect(() => {
    loadData();
  }, [activeTab, location.pathname]);

  const loadData = async () => {
    switch (activeTab) {
      case 'warehouses':
        await loadWarehouses();
        break;
      case 'stock':
        await loadStockInventory();
        await loadProducts();
        await loadWarehouses();
        break;
      case 'reservations':
        await loadPOReservations();
        await loadProducts();
        await loadWarehouses();
        break;
      case 'events':
        await loadStockEvents();
        break;
      default:
        break;
    }
  };

  // Warehouse Functions
  const loadWarehouses = async () => {
    try {
      const data = await inventoryAPI.getWarehouses();
      setWarehouses(data || []);
    } catch (error) {
      console.error('Error loading warehouses:', error);
      setWarehouses([]);
    }
  };

  const clearWarehouseFormData = () => {
    setWarehouseFormData({
      name: '',
      code: '',
      type: 'warehouse',
      address: '',
      city: '',
      state: '',
      pincode: '',
      contactPerson: '',
      phone: '',
      email: '',
      isActive: true,
    });
  };

  const resetWarehouseForm = () => {
    clearWarehouseFormData();
    setShowWarehouseForm(false);
    setEditingWarehouse(null);
  };

  const handleWarehouseSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!warehouseFormData.name || !warehouseFormData.code) {
      alert('Please enter warehouse name and code');
      return;
    }
    
    try {
      if (editingWarehouse) {
        await inventoryAPI.updateWarehouse(editingWarehouse.id, warehouseFormData);
        alert('Warehouse updated successfully!');
      } else {
        await inventoryAPI.createWarehouse(warehouseFormData);
        alert('Warehouse created successfully!');
      }
      resetWarehouseForm();
      await loadWarehouses();
    } catch (error) {
      console.error('Error saving warehouse:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error';
      alert(`Error saving warehouse: ${errorMessage}`);
    }
  };

  const handleWarehouseDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this warehouse? This action cannot be undone.')) {
      try {
        await inventoryAPI.deleteWarehouse(id);
        alert('Warehouse deleted successfully!');
        await loadWarehouses();
      } catch (error) {
        console.error('Error deleting warehouse:', error);
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error';
        alert(`Error deleting warehouse: ${errorMessage}`);
      }
    }
  };

  // Stock Inventory Functions
  const loadStockInventory = async () => {
    try {
      const data = await inventoryAPI.getStockInventory();
      setStockInventory(data || []);
    } catch (error) {
      console.error('Error loading stock inventory:', error);
      setStockInventory([]);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await productsAPI.getAll();
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const clearStockFormData = () => {
    setStockFormData({
      productId: '',
      warehouseId: '',
      batchNumber: '',
      expiryDate: '',
      quantity: '',
      costPrice: '',
      sellingPrice: '',
      stockMethod: 'FIFO',
      location: '',
      notes: '',
    });
  };

  const resetStockForm = () => {
    clearStockFormData();
    setShowStockForm(false);
    setEditingStock(null);
  };

  const handleStockSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!stockFormData.productId || !stockFormData.warehouseId || !stockFormData.quantity) {
      alert('Please select product, warehouse, and enter quantity');
      return;
    }
    
    try {
      const stockData = {
        productId: parseInt(stockFormData.productId),
        warehouseId: parseInt(stockFormData.warehouseId),
        batchNumber: stockFormData.batchNumber?.trim() || null,
        expiryDate: stockFormData.expiryDate || null,
        quantity: parseInt(stockFormData.quantity),
        costPrice: stockFormData.costPrice ? parseFloat(stockFormData.costPrice) : null,
        sellingPrice: stockFormData.sellingPrice ? parseFloat(stockFormData.sellingPrice) : null,
        stockMethod: stockFormData.stockMethod || 'FIFO',
        location: stockFormData.location?.trim() || null,
        notes: stockFormData.notes?.trim() || null,
      };
      
      if (editingStock) {
        await inventoryAPI.updateStockItem(editingStock.id, stockData);
        alert('Stock item updated successfully!');
      } else {
        await inventoryAPI.createStockItem(stockData);
        alert('Stock item created successfully!');
      }
      resetStockForm();
      await loadStockInventory();
    } catch (error) {
      console.error('Error saving stock item:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error';
      alert(`Error saving stock item: ${errorMessage}`);
    }
  };

  const handleStockDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this stock item? This action cannot be undone.')) {
      try {
        await inventoryAPI.deleteStockItem(id);
        alert('Stock item deleted successfully!');
        await loadStockInventory();
      } catch (error) {
        console.error('Error deleting stock item:', error);
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error';
        alert(`Error deleting stock item: ${errorMessage}`);
      }
    }
  };

  // PO Reservation Functions
  const loadPOReservations = async () => {
    try {
      const data = await inventoryAPI.getPOReservations();
      setPOReservations(data || []);
    } catch (error) {
      console.error('Error loading PO reservations:', error);
      setPOReservations([]);
    }
  };

  const clearPOReservationFormData = () => {
    setPOReservationFormData({
      poNumber: '',
      productId: '',
      warehouseId: '',
      quantity: '',
      batchNumber: '',
      expiryDate: '',
      notes: '',
      stockMethod: 'FIFO',
    });
  };

  const resetPOReservationForm = () => {
    clearPOReservationFormData();
    setShowPOReservationForm(false);
    setEditingPOReservation(null);
  };

  const handlePOReservationSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!poReservationFormData.poNumber || !poReservationFormData.productId || !poReservationFormData.warehouseId || !poReservationFormData.quantity) {
      alert('Please fill in all required fields (PO Number, Product, Warehouse, Quantity)');
      return;
    }
    
    try {
      const reservationData = {
        poNumber: poReservationFormData.poNumber.trim(),
        productId: parseInt(poReservationFormData.productId),
        warehouseId: parseInt(poReservationFormData.warehouseId),
        quantity: parseInt(poReservationFormData.quantity),
        batchNumber: poReservationFormData.batchNumber?.trim() || null,
        expiryDate: poReservationFormData.expiryDate || null,
        notes: poReservationFormData.notes?.trim() || null,
        stockMethod: poReservationFormData.stockMethod || 'FIFO',
      };
      
      if (editingPOReservation) {
        await inventoryAPI.updatePOReservation(editingPOReservation.id, reservationData);
        alert('PO Reservation updated successfully!');
      } else {
        await inventoryAPI.createPOReservation(reservationData);
        alert('PO Reservation created successfully!');
      }
      resetPOReservationForm();
      await loadPOReservations();
    } catch (error) {
      console.error('Error saving PO reservation:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error';
      alert(`Error saving PO reservation: ${errorMessage}`);
    }
  };

  const handlePOReservationDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this PO reservation? This action cannot be undone.')) {
      try {
        await inventoryAPI.deletePOReservation(id);
        alert('PO Reservation deleted successfully!');
        await loadPOReservations();
      } catch (error) {
        console.error('Error deleting PO reservation:', error);
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error';
        alert(`Error deleting PO reservation: ${errorMessage}`);
      }
    }
  };

  // Stock Events Functions
  const loadStockEvents = async () => {
    try {
      const params = {};
      if (eventFilter.eventType) params.eventType = eventFilter.eventType;
      if (eventFilter.isPublished !== '') params.isPublished = eventFilter.isPublished;
      const data = await inventoryAPI.getStockEvents(params);
      setStockEvents(data || []);
    } catch (error) {
      console.error('Error loading stock events:', error);
      setStockEvents([]);
    }
  };

  const handlePublishEvent = async (id) => {
    try {
      await inventoryAPI.publishStockEvent(id);
      alert('Event published successfully!');
      await loadStockEvents();
    } catch (error) {
      console.error('Error publishing event:', error);
      alert('Error publishing event');
    }
  };

  useEffect(() => {
    if (activeTab === 'events') {
      loadStockEvents();
    }
  }, [eventFilter, activeTab]);

  const tabs = [
    { id: 'warehouses', label: 'Warehouses', icon: BuildingStorefrontIcon },
    { id: 'stock', label: 'Stock Inventory', icon: CubeIcon },
    { id: 'reservations', label: 'PO Reservations', icon: ClipboardDocumentListIcon },
    { id: 'events', label: 'Stock Events', icon: BellIcon },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Inventory Service</h1>
        <p className="text-gray-600 mt-2">Manage warehouses, stock inventory, PO reservations, and stock events</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
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
          {/* Warehouses Tab */}
          {activeTab === 'warehouses' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Warehouses & Shops</h3>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setEditingWarehouse(null);
                    clearWarehouseFormData();
                    setShowWarehouseForm(true);
                  }}
                  className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark flex items-center transition-colors cursor-pointer"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Warehouse
                </button>
              </div>

              {showWarehouseForm && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-lg">
                      {editingWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}
                    </h4>
                    <button
                      type="button"
                      onClick={resetWarehouseForm}
                      className="text-gray-500 hover:text-gray-700 text-sm"
                    >
                      ✕ Close
                    </button>
                  </div>
                  <form onSubmit={handleWarehouseSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                      <input
                        type="text"
                        required
                        value={warehouseFormData.name}
                        onChange={(e) => setWarehouseFormData({ ...warehouseFormData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                      <input
                        type="text"
                        required
                        value={warehouseFormData.code}
                        onChange={(e) => setWarehouseFormData({ ...warehouseFormData, code: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                      <select
                        required
                        value={warehouseFormData.type}
                        onChange={(e) => setWarehouseFormData({ ...warehouseFormData, type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="warehouse">Warehouse</option>
                        <option value="shop">Shop</option>
                        <option value="store">Store</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                      <input
                        type="text"
                        value={warehouseFormData.contactPerson}
                        onChange={(e) => setWarehouseFormData({ ...warehouseFormData, contactPerson: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="text"
                        value={warehouseFormData.phone}
                        onChange={(e) => setWarehouseFormData({ ...warehouseFormData, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={warehouseFormData.email}
                        onChange={(e) => setWarehouseFormData({ ...warehouseFormData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <textarea
                        value={warehouseFormData.address}
                        onChange={(e) => setWarehouseFormData({ ...warehouseFormData, address: e.target.value })}
                        rows="2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        value={warehouseFormData.city}
                        onChange={(e) => setWarehouseFormData({ ...warehouseFormData, city: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      <input
                        type="text"
                        value={warehouseFormData.state}
                        onChange={(e) => setWarehouseFormData({ ...warehouseFormData, state: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                      <input
                        type="text"
                        value={warehouseFormData.pincode}
                        onChange={(e) => setWarehouseFormData({ ...warehouseFormData, pincode: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div className="md:col-span-2 flex items-center">
                      <input
                        type="checkbox"
                        id="warehouseIsActive"
                        checked={warehouseFormData.isActive}
                        onChange={(e) => setWarehouseFormData({ ...warehouseFormData, isActive: e.target.checked })}
                        className="h-4 w-4 text-primary"
                      />
                      <label htmlFor="warehouseIsActive" className="ml-2 text-sm text-gray-700">Active</label>
                    </div>
                    <div className="md:col-span-2 flex space-x-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark text-sm"
                      >
                        {editingWarehouse ? 'Update' : 'Create'}
                      </button>
                      <button
                        type="button"
                        onClick={resetWarehouseForm}
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {warehouses.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-4 py-8 text-center text-gray-500">No warehouses found</td>
                      </tr>
                    ) : (
                      warehouses.map((warehouse) => (
                        <tr key={warehouse.id}>
                          <td className="px-4 py-3 text-sm font-medium">{warehouse.code}</td>
                          <td className="px-4 py-3 text-sm">{warehouse.name}</td>
                          <td className="px-4 py-3 text-sm capitalize">{warehouse.type}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {warehouse.city && warehouse.state ? `${warehouse.city}, ${warehouse.state}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{warehouse.phone || '-'}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              warehouse.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {warehouse.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex space-x-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setEditingWarehouse(warehouse);
                                  setWarehouseFormData({
                                    name: warehouse.name || '',
                                    code: warehouse.code || '',
                                    type: warehouse.type || 'warehouse',
                                    address: warehouse.address || '',
                                    city: warehouse.city || '',
                                    state: warehouse.state || '',
                                    pincode: warehouse.pincode || '',
                                    contactPerson: warehouse.contactPerson || '',
                                    phone: warehouse.phone || '',
                                    email: warehouse.email || '',
                                    isActive: warehouse.isActive !== undefined ? warehouse.isActive : true,
                                  });
                                  setShowWarehouseForm(true);
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
                                  handleWarehouseDelete(warehouse.id);
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

          {/* Stock Inventory Tab - Continuing in next part due to length */}
          {activeTab === 'stock' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Stock Inventory</h3>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setEditingStock(null);
                    clearStockFormData();
                    setShowStockForm(true);
                  }}
                  className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark flex items-center transition-colors cursor-pointer"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Stock
                </button>
              </div>

              {showStockForm && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-lg">
                      {editingStock ? 'Edit Stock Item' : 'Add New Stock Item'}
                    </h4>
                    <button
                      type="button"
                      onClick={resetStockForm}
                      className="text-gray-500 hover:text-gray-700 text-sm"
                    >
                      ✕ Close
                    </button>
                  </div>
                  <form onSubmit={handleStockSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
                      <select
                        required
                        value={stockFormData.productId}
                        onChange={(e) => setStockFormData({ ...stockFormData, productId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">Select Product</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse *</label>
                      <select
                        required
                        value={stockFormData.warehouseId}
                        onChange={(e) => setStockFormData({ ...stockFormData, warehouseId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">Select Warehouse</option>
                        {warehouses.filter(w => w.isActive).map((w) => (
                          <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number</label>
                      <input
                        type="text"
                        value={stockFormData.batchNumber}
                        onChange={(e) => setStockFormData({ ...stockFormData, batchNumber: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                      <input
                        type="date"
                        value={stockFormData.expiryDate}
                        onChange={(e) => setStockFormData({ ...stockFormData, expiryDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={stockFormData.quantity}
                        onChange={(e) => setStockFormData({ ...stockFormData, quantity: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Stock Method</label>
                      <select
                        value={stockFormData.stockMethod}
                        onChange={(e) => setStockFormData({ ...stockFormData, stockMethod: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="FIFO">FIFO (First In First Out)</option>
                        <option value="LIFO">LIFO (Last In First Out)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={stockFormData.costPrice}
                        onChange={(e) => setStockFormData({ ...stockFormData, costPrice: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={stockFormData.sellingPrice}
                        onChange={(e) => setStockFormData({ ...stockFormData, sellingPrice: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                      <input
                        type="text"
                        value={stockFormData.location}
                        onChange={(e) => setStockFormData({ ...stockFormData, location: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <textarea
                        value={stockFormData.notes}
                        onChange={(e) => setStockFormData({ ...stockFormData, notes: e.target.value })}
                        rows="2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div className="md:col-span-2 flex space-x-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark text-sm"
                      >
                        {editingStock ? 'Update' : 'Create'}
                      </button>
                      <button
                        type="button"
                        onClick={resetStockForm}
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reserved</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Available</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stockInventory.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="px-4 py-8 text-center text-gray-500">No stock items found</td>
                      </tr>
                    ) : (
                      stockInventory.map((stock) => (
                        <tr key={stock.id}>
                          <td className="px-4 py-3 text-sm font-medium">{stock.productName}</td>
                          <td className="px-4 py-3 text-sm">{stock.warehouseName}</td>
                          <td className="px-4 py-3 text-sm">{stock.batchNumber || '-'}</td>
                          <td className="px-4 py-3 text-sm">
                            {stock.expiryDate ? new Date(stock.expiryDate).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm">{stock.quantity}</td>
                          <td className="px-4 py-3 text-sm text-yellow-600">{stock.reservedQuantity || 0}</td>
                          <td className="px-4 py-3 text-sm font-medium text-green-600">{stock.availableQuantity || 0}</td>
                          <td className="px-4 py-3 text-sm">{stock.stockMethod}</td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex space-x-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setEditingStock(stock);
                                  setStockFormData({
                                    productId: stock.productId.toString(),
                                    warehouseId: stock.warehouseId.toString(),
                                    batchNumber: stock.batchNumber || '',
                                    expiryDate: stock.expiryDate ? stock.expiryDate.split('T')[0] : '',
                                    quantity: stock.quantity.toString(),
                                    costPrice: stock.costPrice || '',
                                    sellingPrice: stock.sellingPrice || '',
                                    stockMethod: stock.stockMethod || 'FIFO',
                                    location: stock.location || '',
                                    notes: stock.notes || '',
                                  });
                                  setShowStockForm(true);
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
                                  handleStockDelete(stock.id);
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

          {/* PO Reservations Tab */}
          {activeTab === 'reservations' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">PO Reservations</h3>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setEditingPOReservation(null);
                    clearPOReservationFormData();
                    setShowPOReservationForm(true);
                  }}
                  className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark flex items-center transition-colors cursor-pointer"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Reservation
                </button>
              </div>

              {showPOReservationForm && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-lg">
                      {editingPOReservation ? 'Edit PO Reservation' : 'Add New PO Reservation'}
                    </h4>
                    <button
                      type="button"
                      onClick={resetPOReservationForm}
                      className="text-gray-500 hover:text-gray-700 text-sm"
                    >
                      ✕ Close
                    </button>
                  </div>
                  <form onSubmit={handlePOReservationSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">PO Number *</label>
                      <input
                        type="text"
                        required
                        value={poReservationFormData.poNumber}
                        onChange={(e) => setPOReservationFormData({ ...poReservationFormData, poNumber: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
                      <select
                        required
                        value={poReservationFormData.productId}
                        onChange={(e) => setPOReservationFormData({ ...poReservationFormData, productId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">Select Product</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse *</label>
                      <select
                        required
                        value={poReservationFormData.warehouseId}
                        onChange={(e) => setPOReservationFormData({ ...poReservationFormData, warehouseId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">Select Warehouse</option>
                        {warehouses.filter(w => w.isActive).map((w) => (
                          <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={poReservationFormData.quantity}
                        onChange={(e) => setPOReservationFormData({ ...poReservationFormData, quantity: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Stock Method</label>
                      <select
                        value={poReservationFormData.stockMethod}
                        onChange={(e) => setPOReservationFormData({ ...poReservationFormData, stockMethod: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="FIFO">FIFO (First In First Out)</option>
                        <option value="LIFO">LIFO (Last In First Out)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number</label>
                      <input
                        type="text"
                        value={poReservationFormData.batchNumber}
                        onChange={(e) => setPOReservationFormData({ ...poReservationFormData, batchNumber: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                      <input
                        type="date"
                        value={poReservationFormData.expiryDate}
                        onChange={(e) => setPOReservationFormData({ ...poReservationFormData, expiryDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <textarea
                        value={poReservationFormData.notes}
                        onChange={(e) => setPOReservationFormData({ ...poReservationFormData, notes: e.target.value })}
                        rows="2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div className="md:col-span-2 flex space-x-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark text-sm"
                      >
                        {editingPOReservation ? 'Update' : 'Create'}
                      </button>
                      <button
                        type="button"
                        onClick={resetPOReservationForm}
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO Number</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reserved At</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {poReservations.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-4 py-8 text-center text-gray-500">No PO reservations found</td>
                      </tr>
                    ) : (
                      poReservations.map((reservation) => (
                        <tr key={reservation.id}>
                          <td className="px-4 py-3 text-sm font-medium">{reservation.poNumber}</td>
                          <td className="px-4 py-3 text-sm">{reservation.productName}</td>
                          <td className="px-4 py-3 text-sm">{reservation.warehouseName}</td>
                          <td className="px-4 py-3 text-sm">{reservation.quantity}</td>
                          <td className="px-4 py-3 text-sm">{reservation.batchNumber || '-'}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              reservation.status === 'reserved' ? 'bg-yellow-100 text-yellow-800' :
                              reservation.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                              reservation.status === 'fulfilled' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {reservation.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {new Date(reservation.reservedAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex space-x-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setEditingPOReservation(reservation);
                                  setPOReservationFormData({
                                    poNumber: reservation.poNumber || '',
                                    productId: reservation.productId.toString(),
                                    warehouseId: reservation.warehouseId.toString(),
                                    quantity: reservation.quantity.toString(),
                                    batchNumber: reservation.batchNumber || '',
                                    expiryDate: reservation.expiryDate ? reservation.expiryDate.split('T')[0] : '',
                                    notes: reservation.notes || '',
                                    stockMethod: 'FIFO',
                                  });
                                  setShowPOReservationForm(true);
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
                                  handlePOReservationDelete(reservation.id);
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

          {/* Stock Events Tab */}
          {activeTab === 'events' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Stock Events</h3>
                <div className="flex space-x-2">
                  <select
                    value={eventFilter.eventType}
                    onChange={(e) => setEventFilter({ ...eventFilter, eventType: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">All Event Types</option>
                    <option value="stock_low">Stock Low</option>
                    <option value="stock_debited">Stock Debited</option>
                    <option value="stock_added">Stock Added</option>
                    <option value="stock_reserved">Stock Reserved</option>
                    <option value="stock_released">Stock Released</option>
                    <option value="expiry_warning">Expiry Warning</option>
                  </select>
                  <select
                    value={eventFilter.isPublished}
                    onChange={(e) => setEventFilter({ ...eventFilter, isPublished: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">All Status</option>
                    <option value="true">Published</option>
                    <option value="false">Unpublished</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created At</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stockEvents.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-4 py-8 text-center text-gray-500">No stock events found</td>
                      </tr>
                    ) : (
                      stockEvents.map((event) => (
                        <tr key={event.id}>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              event.eventType === 'stock_low' ? 'bg-red-100 text-red-800' :
                              event.eventType === 'stock_debited' ? 'bg-orange-100 text-orange-800' :
                              event.eventType === 'stock_added' ? 'bg-green-100 text-green-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {event.eventType.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium">{event.productName}</td>
                          <td className="px-4 py-3 text-sm">{event.warehouseName || '-'}</td>
                          <td className="px-4 py-3 text-sm">{event.quantity || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{event.message || '-'}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              event.isPublished ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {event.isPublished ? 'Published' : 'Unpublished'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {new Date(event.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {!event.isPublished && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handlePublishEvent(event.id);
                                }}
                                className="px-3 py-1 bg-primary text-white rounded text-xs hover:bg-primary-dark"
                              >
                                Publish
                              </button>
                            )}
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

export default InventoryService;

