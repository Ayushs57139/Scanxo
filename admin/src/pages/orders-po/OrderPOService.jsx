import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ordersAPI, productsAPI, inventoryAPI } from '../../services/api';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ClipboardDocumentListIcon,
  ShoppingCartIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

const OrderPOService = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('purchase-orders');
  
  // Purchase Orders
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [showPOForm, setShowPOForm] = useState(false);
  const [editingPO, setEditingPO] = useState(null);
  const [selectedPO, setSelectedPO] = useState(null);
  const [poFormData, setPOFormData] = useState({
    supplierName: '',
    warehouseId: '',
    orderDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: '',
    notes: '',
  });
  const [poItems, setPOItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');

  // Customer Orders
  const [customerOrders, setCustomerOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderFormData, setOrderFormData] = useState({
    userId: '',
    warehouseId: '',
    orderType: 'retail',
    paymentMethod: '',
    shippingAddress: '',
    billingAddress: '',
    expectedDeliveryDate: '',
    notes: '',
  });
  const [orderItems, setOrderItems] = useState([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState('');

  // Returns
  const [orderReturns, setOrderReturns] = useState([]);
  const [returnStatusFilter, setReturnStatusFilter] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab, location.pathname, statusFilter, orderStatusFilter, returnStatusFilter]);

  const loadData = async () => {
    switch (activeTab) {
      case 'purchase-orders':
        await loadPurchaseOrders();
        await loadWarehouses();
        await loadProducts();
        break;
      case 'customer-orders':
        await loadCustomerOrders();
        await loadWarehouses();
        await loadProducts();
        await loadUsers();
        break;
      case 'returns':
        await loadOrderReturns();
        break;
      default:
        break;
    }
  };

  const loadWarehouses = async () => {
    try {
      const data = await inventoryAPI.getWarehouses();
      setWarehouses(data || []);
    } catch (error) {
      console.error('Error loading warehouses:', error);
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

  const loadUsers = async () => {
    try {
      // You may need to add a users API endpoint
      // For now, we'll use an empty array
      setUsers([]);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  // Purchase Order Functions
  const loadPurchaseOrders = async () => {
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const data = await ordersAPI.getPurchaseOrders(params);
      setPurchaseOrders(data || []);
    } catch (error) {
      console.error('Error loading purchase orders:', error);
      setPurchaseOrders([]);
    }
  };

  const loadPurchaseOrderDetails = async (id) => {
    try {
      const data = await ordersAPI.getPurchaseOrder(id);
      setSelectedPO(data);
    } catch (error) {
      console.error('Error loading PO details:', error);
    }
  };

  const clearPOFormData = () => {
    setPOFormData({
      supplierName: '',
      warehouseId: '',
      orderDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate: '',
      notes: '',
    });
    setPOItems([]);
  };

  const resetPOForm = () => {
    clearPOFormData();
    setShowPOForm(false);
    setEditingPO(null);
  };

  const handleAddPOItem = () => {
    setPOItems([...poItems, {
      productId: '',
      quantity: '',
      unitPrice: '',
      discount: '',
      taxRate: '',
      batchNumber: '',
      expiryDate: '',
      notes: '',
    }]);
  };

  const handleRemovePOItem = (index) => {
    setPOItems(poItems.filter((_, i) => i !== index));
  };

  const handlePOItemChange = (index, field, value) => {
    const updatedItems = [...poItems];
    updatedItems[index][field] = value;
    
    // Auto-fill product name when product is selected
    if (field === 'productId' && value) {
      const product = products.find(p => p.id === parseInt(value));
      if (product) {
        updatedItems[index].productName = product.name;
        updatedItems[index].unitPrice = product.price || '';
      }
    }
    
    setPOItems(updatedItems);
  };

  const handlePOSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!poFormData.warehouseId) {
      alert('Please select a warehouse');
      return;
    }
    
    if (poItems.length === 0) {
      alert('Please add at least one item to the PO');
      return;
    }
    
    try {
      const items = poItems.map(item => ({
        productId: parseInt(item.productId),
        productName: item.productName || products.find(p => p.id === parseInt(item.productId))?.name,
        quantity: parseInt(item.quantity),
        unitPrice: parseFloat(item.unitPrice) || 0,
        discount: parseFloat(item.discount) || 0,
        taxRate: parseFloat(item.taxRate) || 0,
        batchNumber: item.batchNumber?.trim() || null,
        expiryDate: item.expiryDate || null,
        notes: item.notes?.trim() || null,
      }));
      
      const poData = {
        ...poFormData,
        warehouseId: parseInt(poFormData.warehouseId),
        items: items,
      };
      
      await ordersAPI.createPurchaseOrder(poData);
      alert('Purchase Order created successfully!');
      resetPOForm();
      await loadPurchaseOrders();
    } catch (error) {
      console.error('Error creating PO:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error';
      alert(`Error creating PO: ${errorMessage}`);
    }
  };

  const handlePOStatusChange = async (poId, newStatus, notes = '') => {
    try {
      await ordersAPI.updatePOStatus(poId, {
        status: newStatus,
        notes: notes,
        changedBy: 1, // Admin user ID
      });
      alert(`PO status updated to ${newStatus} successfully!`);
      await loadPurchaseOrders();
      if (selectedPO && selectedPO.id === poId) {
        await loadPurchaseOrderDetails(poId);
      }
    } catch (error) {
      console.error('Error updating PO status:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error';
      alert(`Error updating PO status: ${errorMessage}`);
    }
  };

  // Customer Order Functions
  const loadCustomerOrders = async () => {
    try {
      const params = {};
      if (orderStatusFilter) params.status = orderStatusFilter;
      const data = await ordersAPI.getCustomerOrders(params);
      setCustomerOrders(data || []);
    } catch (error) {
      console.error('Error loading customer orders:', error);
      setCustomerOrders([]);
    }
  };

  const loadCustomerOrderDetails = async (id) => {
    try {
      const data = await ordersAPI.getCustomerOrder(id);
      setSelectedOrder(data);
    } catch (error) {
      console.error('Error loading order details:', error);
    }
  };

  const clearOrderFormData = () => {
    setOrderFormData({
      userId: '',
      warehouseId: '',
      orderType: 'retail',
      paymentMethod: '',
      shippingAddress: '',
      billingAddress: '',
      expectedDeliveryDate: '',
      notes: '',
    });
    setOrderItems([]);
  };

  const resetOrderForm = () => {
    clearOrderFormData();
    setShowOrderForm(false);
    setEditingOrder(null);
  };

  const handleAddOrderItem = () => {
    setOrderItems([...orderItems, {
      productId: '',
      quantity: '',
      unitPrice: '',
      discount: '',
      taxRate: '',
      batchNumber: '',
      expiryDate: '',
      notes: '',
    }]);
  };

  const handleRemoveOrderItem = (index) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleOrderItemChange = (index, field, value) => {
    const updatedItems = [...orderItems];
    updatedItems[index][field] = value;
    
    if (field === 'productId' && value) {
      const product = products.find(p => p.id === parseInt(value));
      if (product) {
        updatedItems[index].productName = product.name;
        updatedItems[index].unitPrice = product.price || '';
      }
    }
    
    setOrderItems(updatedItems);
  };

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!orderFormData.userId) {
      alert('Please select a user');
      return;
    }
    
    if (orderItems.length === 0) {
      alert('Please add at least one item to the order');
      return;
    }
    
    try {
      const items = orderItems.map(item => ({
        productId: parseInt(item.productId),
        productName: item.productName || products.find(p => p.id === parseInt(item.productId))?.name,
        quantity: parseInt(item.quantity),
        unitPrice: parseFloat(item.unitPrice) || 0,
        discount: parseFloat(item.discount) || 0,
        taxRate: parseFloat(item.taxRate) || 0,
        batchNumber: item.batchNumber?.trim() || null,
        expiryDate: item.expiryDate || null,
        notes: item.notes?.trim() || null,
      }));
      
      const orderData = {
        ...orderFormData,
        userId: parseInt(orderFormData.userId),
        warehouseId: orderFormData.warehouseId ? parseInt(orderFormData.warehouseId) : null,
        items: items,
      };
      
      await ordersAPI.createCustomerOrder(orderData);
      alert('Customer Order created successfully!');
      resetOrderForm();
      await loadCustomerOrders();
    } catch (error) {
      console.error('Error creating order:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error';
      alert(`Error creating order: ${errorMessage}`);
    }
  };

  const handleOrderStatusChange = async (orderId, newStatus, additionalData = {}) => {
    try {
      await ordersAPI.updateOrderStatus(orderId, {
        status: newStatus,
        notes: additionalData.notes || '',
        changedBy: 1, // Admin user ID
        trackingNumber: additionalData.trackingNumber || null,
        invoiceNumber: additionalData.invoiceNumber || null,
      });
      alert(`Order status updated to ${newStatus} successfully!`);
      await loadCustomerOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        await loadCustomerOrderDetails(orderId);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error';
      alert(`Error updating order status: ${errorMessage}`);
    }
  };

  // Return Functions
  const loadOrderReturns = async () => {
    try {
      const params = {};
      if (returnStatusFilter) params.returnStatus = returnStatusFilter;
      const data = await ordersAPI.getOrderReturns(params);
      setOrderReturns(data || []);
    } catch (error) {
      console.error('Error loading order returns:', error);
      setOrderReturns([]);
    }
  };

  const handleReturnStatusChange = async (returnId, newStatus) => {
    try {
      await ordersAPI.updateReturnStatus(returnId, {
        returnStatus: newStatus,
        processedBy: 1, // Admin user ID
      });
      alert(`Return status updated to ${newStatus} successfully!`);
      await loadOrderReturns();
    } catch (error) {
      console.error('Error updating return status:', error);
      alert('Error updating return status');
    }
  };

  // State Machine Visualization
  const getPOStatusFlow = () => {
    return [
      { status: 'created', label: 'Created', color: 'gray' },
      { status: 'pending_approval', label: 'Pending Approval', color: 'yellow' },
      { status: 'approved', label: 'Approved', color: 'blue' },
      { status: 'confirmed', label: 'Confirmed', color: 'blue' },
      { status: 'packed', label: 'Packed', color: 'purple' },
      { status: 'shipped', label: 'Shipped', color: 'indigo' },
      { status: 'delivered', label: 'Delivered', color: 'green' },
      { status: 'invoiced', label: 'Invoiced', color: 'green' },
      { status: 'paid', label: 'Paid', color: 'green' },
      { status: 'cancelled', label: 'Cancelled', color: 'red' },
    ];
  };

  const getOrderStatusFlow = () => {
    return [
      { status: 'created', label: 'Created', color: 'gray' },
      { status: 'confirmed', label: 'Confirmed', color: 'blue' },
      { status: 'packed', label: 'Packed', color: 'purple' },
      { status: 'shipped', label: 'Shipped', color: 'indigo' },
      { status: 'delivered', label: 'Delivered', color: 'green' },
      { status: 'invoiced', label: 'Invoiced', color: 'green' },
      { status: 'paid', label: 'Paid', color: 'green' },
      { status: 'cancelled', label: 'Cancelled', color: 'red' },
      { status: 'returned', label: 'Returned', color: 'orange' },
    ];
  };

  const getStatusColor = (status, flow) => {
    const statusObj = flow.find(s => s.status === status);
    if (!statusObj) return 'gray';
    
    const colorMap = {
      gray: 'bg-gray-100 text-gray-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      blue: 'bg-blue-100 text-blue-800',
      purple: 'bg-purple-100 text-purple-800',
      indigo: 'bg-indigo-100 text-indigo-800',
      green: 'bg-green-100 text-green-800',
      red: 'bg-red-100 text-red-800',
      orange: 'bg-orange-100 text-orange-800',
    };
    
    return colorMap[statusObj.color] || 'bg-gray-100 text-gray-800';
  };

  const getNextStatuses = (currentStatus, flowType) => {
    if (flowType === 'po') {
      const poFlow = {
        'created': ['pending_approval', 'cancelled'],
        'pending_approval': ['approved', 'cancelled'],
        'approved': ['confirmed', 'cancelled'],
        'confirmed': ['packed', 'cancelled'],
        'packed': ['shipped', 'cancelled'],
        'shipped': ['delivered', 'cancelled'],
        'delivered': ['invoiced', 'cancelled'],
        'invoiced': ['paid', 'cancelled'],
        'paid': [],
        'cancelled': [],
      };
      return poFlow[currentStatus] || [];
    } else {
      const orderFlow = {
        'created': ['confirmed', 'cancelled'],
        'confirmed': ['packed', 'cancelled'],
        'packed': ['shipped', 'cancelled'],
        'shipped': ['delivered', 'cancelled'],
        'delivered': ['invoiced', 'returned', 'cancelled'],
        'invoiced': ['paid', 'cancelled'],
        'paid': [],
        'cancelled': [],
        'returned': [],
      };
      return orderFlow[currentStatus] || [];
    }
  };

  const tabs = [
    { id: 'purchase-orders', label: 'Purchase Orders', icon: ClipboardDocumentListIcon },
    { id: 'customer-orders', label: 'Customer Orders', icon: ShoppingCartIcon },
    { id: 'returns', label: 'Returns', icon: ArrowPathIcon },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Order / PO Service</h1>
        <p className="text-gray-600 mt-2">Manage purchase orders, customer orders, and returns with state machine tracking</p>
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
          {/* Purchase Orders Tab */}
          {activeTab === 'purchase-orders' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Purchase Orders</h3>
                <div className="flex space-x-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">All Status</option>
                    {getPOStatusFlow().map(status => (
                      <option key={status.status} value={status.status}>{status.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setEditingPO(null);
                      clearPOFormData();
                      setShowPOForm(true);
                    }}
                    className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark flex items-center transition-colors cursor-pointer"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Create PO
                  </button>
                </div>
              </div>

              {showPOForm && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-lg">Create Purchase Order</h4>
                    <button
                      type="button"
                      onClick={resetPOForm}
                      className="text-gray-500 hover:text-gray-700 text-sm"
                    >
                      ✕ Close
                    </button>
                  </div>
                  <form onSubmit={handlePOSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
                        <input
                          type="text"
                          value={poFormData.supplierName}
                          onChange={(e) => setPOFormData({ ...poFormData, supplierName: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse *</label>
                        <select
                          required
                          value={poFormData.warehouseId}
                          onChange={(e) => setPOFormData({ ...poFormData, warehouseId: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="">Select Warehouse</option>
                          {warehouses.filter(w => w.isActive).map((w) => (
                            <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Order Date *</label>
                        <input
                          type="date"
                          required
                          value={poFormData.orderDate}
                          onChange={(e) => setPOFormData({ ...poFormData, orderDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery Date</label>
                        <input
                          type="date"
                          value={poFormData.expectedDeliveryDate}
                          onChange={(e) => setPOFormData({ ...poFormData, expectedDeliveryDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <textarea
                        value={poFormData.notes}
                        onChange={(e) => setPOFormData({ ...poFormData, notes: e.target.value })}
                        rows="2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700">PO Items *</label>
                        <button
                          type="button"
                          onClick={handleAddPOItem}
                          className="text-primary text-sm hover:text-primary-dark"
                        >
                          + Add Item
                        </button>
                      </div>
                      {poItems.map((item, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-2 p-3 bg-white rounded border">
                          <select
                            required
                            value={item.productId}
                            onChange={(e) => handlePOItemChange(index, 'productId', e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="">Product</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            required
                            min="1"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => handlePOItemChange(index, 'quantity', e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <input
                            type="number"
                            required
                            step="0.01"
                            placeholder="Price"
                            value={item.unitPrice}
                            onChange={(e) => handlePOItemChange(index, 'unitPrice', e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Discount"
                            value={item.discount}
                            onChange={(e) => handlePOItemChange(index, 'discount', e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Tax %"
                            value={item.taxRate}
                            onChange={(e) => handlePOItemChange(index, 'taxRate', e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemovePOItem(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      ))}
                      {poItems.length === 0 && (
                        <p className="text-gray-500 text-sm">No items added. Click "Add Item" to add products.</p>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark text-sm"
                      >
                        Create PO
                      </button>
                      <button
                        type="button"
                        onClick={resetPOForm}
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {purchaseOrders.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-4 py-8 text-center text-gray-500">No purchase orders found</td>
                      </tr>
                    ) : (
                      purchaseOrders.map((po) => (
                        <tr key={po.id}>
                          <td className="px-4 py-3 text-sm font-medium">{po.poNumber}</td>
                          <td className="px-4 py-3 text-sm">{po.supplierName || '-'}</td>
                          <td className="px-4 py-3 text-sm">{po.warehouseName}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(po.status, getPOStatusFlow())}`}>
                              {po.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">₹{Number(po.finalAmount || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm">{new Date(po.orderDate).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex space-x-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  loadPurchaseOrderDetails(po.id);
                                  setSelectedPO({ id: po.id });
                                }}
                                className="text-primary hover:text-primary-dark cursor-pointer"
                              >
                                <EyeIcon className="h-5 w-5" />
                              </button>
                              {getNextStatuses(po.status, 'po').length > 0 && (
                                <select
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      const notes = window.prompt('Enter notes (optional):') || '';
                                      handlePOStatusChange(po.id, e.target.value, notes);
                                      e.target.value = '';
                                    }
                                  }}
                                  className="text-xs border border-gray-300 rounded px-2 py-1"
                                >
                                  <option value="">Change Status</option>
                                  {getNextStatuses(po.status, 'po').map(status => (
                                    <option key={status} value={status}>{status.replace('_', ' ')}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* PO Details Modal */}
              {selectedPO && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                    <div className="p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold">PO Details</h3>
                        <button
                          type="button"
                          onClick={() => setSelectedPO(null)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          ✕
                        </button>
                      </div>
                      {selectedPO && selectedPO.items && (
                        <>
                          <div className="mb-4">
                            <p className="font-semibold">PO Number: {selectedPO.poNumber}</p>
                            <p className="text-sm text-gray-600">Status: <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(selectedPO.status, getPOStatusFlow())}`}>{selectedPO.status}</span></p>
                          </div>
                          
                          {/* Status History */}
                          {selectedPO.statusHistory && selectedPO.statusHistory.length > 0 && (
                            <div className="mb-4">
                              <h4 className="font-semibold mb-2">Status History</h4>
                              <div className="space-y-1">
                                {selectedPO.statusHistory.map((history, idx) => (
                                  <div key={idx} className="text-sm text-gray-600">
                                    {history.status} - {new Date(history.changedAt).toLocaleString()}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Status Flow Visualization */}
                          <div className="mb-4">
                            <h4 className="font-semibold mb-2">Status Flow</h4>
                            <div className="flex flex-wrap gap-2">
                              {getPOStatusFlow().map((status, idx) => {
                                const isCurrent = status.status === selectedPO.status;
                                const isCompleted = getPOStatusFlow().findIndex(s => s.status === selectedPO.status) > idx;
                                return (
                                  <div key={status.status} className="flex items-center">
                                    <span className={`px-3 py-1 text-xs rounded-full ${
                                      isCurrent ? 'bg-primary text-white font-bold' :
                                      isCompleted ? getStatusColor(status.status, getPOStatusFlow()) :
                                      'bg-gray-100 text-gray-400'
                                    }`}>
                                      {status.label}
                                    </span>
                                    {idx < getPOStatusFlow().length - 1 && (
                                      <span className="mx-2 text-gray-400">→</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          
                          {/* Items */}
                          <div>
                            <h4 className="font-semibold mb-2">Items</h4>
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {selectedPO.items.map((item) => (
                                  <tr key={item.id}>
                                    <td className="px-4 py-2 text-sm">{item.productName}</td>
                                    <td className="px-4 py-2 text-sm">{item.quantity}</td>
                                    <td className="px-4 py-2 text-sm">₹{Number(item.unitPrice).toFixed(2)}</td>
                                    <td className="px-4 py-2 text-sm">₹{Number(item.subtotal).toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          
                          {/* Next Actions */}
                          {getNextStatuses(selectedPO.status, 'po').length > 0 && (
                            <div className="mt-4">
                              <h4 className="font-semibold mb-2">Available Actions</h4>
                              <div className="flex flex-wrap gap-2">
                                {getNextStatuses(selectedPO.status, 'po').map(status => (
                                  <button
                                    key={status}
                                    type="button"
                                    onClick={() => {
                                      const notes = window.prompt('Enter notes (optional):') || '';
                                      handlePOStatusChange(selectedPO.id, status, notes);
                                    }}
                                    className={`px-4 py-2 rounded-lg text-sm ${
                                      status === 'cancelled' ? 'bg-red-500 text-white hover:bg-red-600' :
                                      'bg-primary text-white hover:bg-primary-dark'
                                    }`}
                                  >
                                    {status === 'cancelled' ? 'Cancel PO' : `Mark as ${status.replace('_', ' ')}`}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Customer Orders Tab */}
          {activeTab === 'customer-orders' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Customer Orders</h3>
                <div className="flex space-x-2">
                  <select
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">All Status</option>
                    {getOrderStatusFlow().map(status => (
                      <option key={status.status} value={status.status}>{status.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setEditingOrder(null);
                      clearOrderFormData();
                      setShowOrderForm(true);
                    }}
                    className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark flex items-center transition-colors cursor-pointer"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Create Order
                  </button>
                </div>
              </div>

              {showOrderForm && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-lg">Create Customer Order</h4>
                    <button
                      type="button"
                      onClick={resetOrderForm}
                      className="text-gray-500 hover:text-gray-700 text-sm"
                    >
                      ✕ Close
                    </button>
                  </div>
                  <form onSubmit={handleOrderSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">User ID *</label>
                        <input
                          type="number"
                          required
                          value={orderFormData.userId}
                          onChange={(e) => setOrderFormData({ ...orderFormData, userId: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="Enter User ID"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Order Type</label>
                        <select
                          value={orderFormData.orderType}
                          onChange={(e) => setOrderFormData({ ...orderFormData, orderType: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="retail">Retail</option>
                          <option value="wholesale">Wholesale</option>
                          <option value="b2b">B2B</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse</label>
                        <select
                          value={orderFormData.warehouseId}
                          onChange={(e) => setOrderFormData({ ...orderFormData, warehouseId: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="">Select Warehouse</option>
                          {warehouses.filter(w => w.isActive).map((w) => (
                            <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                        <input
                          type="text"
                          value={orderFormData.paymentMethod}
                          onChange={(e) => setOrderFormData({ ...orderFormData, paymentMethod: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="Cash, Card, UPI, etc."
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Address</label>
                      <textarea
                        value={orderFormData.shippingAddress}
                        onChange={(e) => setOrderFormData({ ...orderFormData, shippingAddress: e.target.value })}
                        rows="2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Billing Address</label>
                      <textarea
                        value={orderFormData.billingAddress}
                        onChange={(e) => setOrderFormData({ ...orderFormData, billingAddress: e.target.value })}
                        rows="2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700">Order Items *</label>
                        <button
                          type="button"
                          onClick={handleAddOrderItem}
                          className="text-primary text-sm hover:text-primary-dark"
                        >
                          + Add Item
                        </button>
                      </div>
                      {orderItems.map((item, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-2 p-3 bg-white rounded border">
                          <select
                            required
                            value={item.productId}
                            onChange={(e) => handleOrderItemChange(index, 'productId', e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="">Product</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            required
                            min="1"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => handleOrderItemChange(index, 'quantity', e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <input
                            type="number"
                            required
                            step="0.01"
                            placeholder="Price"
                            value={item.unitPrice}
                            onChange={(e) => handleOrderItemChange(index, 'unitPrice', e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Discount"
                            value={item.discount}
                            onChange={(e) => handleOrderItemChange(index, 'discount', e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Tax %"
                            value={item.taxRate}
                            onChange={(e) => handleOrderItemChange(index, 'taxRate', e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveOrderItem(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      ))}
                      {orderItems.length === 0 && (
                        <p className="text-gray-500 text-sm">No items added. Click "Add Item" to add products.</p>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark text-sm"
                      >
                        Create Order
                      </button>
                      <button
                        type="button"
                        onClick={resetOrderForm}
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order Number</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {customerOrders.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-4 py-8 text-center text-gray-500">No customer orders found</td>
                      </tr>
                    ) : (
                      customerOrders.map((order) => (
                        <tr key={order.id}>
                          <td className="px-4 py-3 text-sm font-medium">{order.orderNumber}</td>
                          <td className="px-4 py-3 text-sm">{order.userName || `User ${order.userId}`}</td>
                          <td className="px-4 py-3 text-sm">{order.warehouseName || '-'}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(order.status, getOrderStatusFlow())}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">₹{Number(order.finalAmount || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                              order.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {order.paymentStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">{new Date(order.orderDate).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex space-x-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  loadCustomerOrderDetails(order.id);
                                  setSelectedOrder({ id: order.id });
                                }}
                                className="text-primary hover:text-primary-dark cursor-pointer"
                              >
                                <EyeIcon className="h-5 w-5" />
                              </button>
                              {getNextStatuses(order.status, 'order').length > 0 && (
                                <select
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      if (e.target.value === 'shipped') {
                                        const trackingNumber = window.prompt('Enter tracking number (optional):') || null;
                                        handleOrderStatusChange(order.id, e.target.value, { trackingNumber });
                                      } else if (e.target.value === 'invoiced') {
                                        const invoiceNumber = window.prompt('Enter invoice number (optional):') || null;
                                        handleOrderStatusChange(order.id, e.target.value, { invoiceNumber });
                                      } else {
                                        const notes = window.prompt('Enter notes (optional):') || '';
                                        handleOrderStatusChange(order.id, e.target.value, { notes });
                                      }
                                      e.target.value = '';
                                    }
                                  }}
                                  className="text-xs border border-gray-300 rounded px-2 py-1"
                                >
                                  <option value="">Change Status</option>
                                  {getNextStatuses(order.status, 'order').map(status => (
                                    <option key={status} value={status}>{status}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Order Details Modal */}
              {selectedOrder && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                    <div className="p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold">Order Details</h3>
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(null)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          ✕
                        </button>
                      </div>
                      {selectedOrder && selectedOrder.items && (
                        <>
                          <div className="mb-4">
                            <p className="font-semibold">Order Number: {selectedOrder.orderNumber}</p>
                            <p className="text-sm text-gray-600">Status: <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(selectedOrder.status, getOrderStatusFlow())}`}>{selectedOrder.status}</span></p>
                            <p className="text-sm text-gray-600">Payment: <span className={`px-2 py-1 text-xs rounded-full ${
                              selectedOrder.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>{selectedOrder.paymentStatus}</span></p>
                          </div>
                          
                          {/* Status History */}
                          {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 && (
                            <div className="mb-4">
                              <h4 className="font-semibold mb-2">Status History</h4>
                              <div className="space-y-1">
                                {selectedOrder.statusHistory.map((history, idx) => (
                                  <div key={idx} className="text-sm text-gray-600">
                                    {history.status} - {new Date(history.changedAt).toLocaleString()}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Status Flow Visualization */}
                          <div className="mb-4">
                            <h4 className="font-semibold mb-2">Status Flow</h4>
                            <div className="flex flex-wrap gap-2">
                              {getOrderStatusFlow().map((status, idx) => {
                                const isCurrent = status.status === selectedOrder.status;
                                const isCompleted = getOrderStatusFlow().findIndex(s => s.status === selectedOrder.status) > idx;
                                return (
                                  <div key={status.status} className="flex items-center">
                                    <span className={`px-3 py-1 text-xs rounded-full ${
                                      isCurrent ? 'bg-primary text-white font-bold' :
                                      isCompleted ? getStatusColor(status.status, getOrderStatusFlow()) :
                                      'bg-gray-100 text-gray-400'
                                    }`}>
                                      {status.label}
                                    </span>
                                    {idx < getOrderStatusFlow().length - 1 && (
                                      <span className="mx-2 text-gray-400">→</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          
                          {/* Items */}
                          <div>
                            <h4 className="font-semibold mb-2">Items</h4>
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {selectedOrder.items.map((item) => (
                                  <tr key={item.id}>
                                    <td className="px-4 py-2 text-sm">{item.productName}</td>
                                    <td className="px-4 py-2 text-sm">{item.quantity}</td>
                                    <td className="px-4 py-2 text-sm">₹{Number(item.unitPrice).toFixed(2)}</td>
                                    <td className="px-4 py-2 text-sm">₹{Number(item.subtotal).toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          
                          {/* Next Actions */}
                          {getNextStatuses(selectedOrder.status, 'order').length > 0 && (
                            <div className="mt-4">
                              <h4 className="font-semibold mb-2">Available Actions</h4>
                              <div className="flex flex-wrap gap-2">
                                {getNextStatuses(selectedOrder.status, 'order').map(status => (
                                  <button
                                    key={status}
                                    type="button"
                                    onClick={() => {
                                      if (status === 'shipped') {
                                        const trackingNumber = window.prompt('Enter tracking number (optional):') || null;
                                        handleOrderStatusChange(selectedOrder.id, status, { trackingNumber });
                                      } else if (status === 'invoiced') {
                                        const invoiceNumber = window.prompt('Enter invoice number (optional):') || null;
                                        handleOrderStatusChange(selectedOrder.id, status, { invoiceNumber });
                                      } else if (status === 'cancelled' || status === 'returned') {
                                        const reason = window.prompt('Enter reason:') || '';
                                        if (reason) {
                                          handleOrderStatusChange(selectedOrder.id, status, { notes: reason });
                                        }
                                      } else {
                                        handleOrderStatusChange(selectedOrder.id, status);
                                      }
                                    }}
                                    className={`px-4 py-2 rounded-lg text-sm ${
                                      status === 'cancelled' ? 'bg-red-500 text-white hover:bg-red-600' :
                                      status === 'returned' ? 'bg-orange-500 text-white hover:bg-orange-600' :
                                      'bg-primary text-white hover:bg-primary-dark'
                                    }`}
                                  >
                                    {status === 'cancelled' ? 'Cancel Order' : status === 'returned' ? 'Return Order' : `Mark as ${status}`}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Returns Tab */}
          {activeTab === 'returns' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Order Returns</h3>
                <select
                  value={returnStatusFilter}
                  onChange={(e) => setReturnStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">All Status</option>
                  <option value="requested">Requested</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="processed">Processed</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order Number</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Refund Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Returned At</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orderReturns.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-4 py-8 text-center text-gray-500">No returns found</td>
                      </tr>
                    ) : (
                      orderReturns.map((returnItem) => (
                        <tr key={returnItem.id}>
                          <td className="px-4 py-3 text-sm font-medium">{returnItem.orderNumber}</td>
                          <td className="px-4 py-3 text-sm">{returnItem.productName}</td>
                          <td className="px-4 py-3 text-sm">{returnItem.quantity}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{returnItem.reason}</td>
                          <td className="px-4 py-3 text-sm">₹{Number(returnItem.refundAmount || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              returnItem.returnStatus === 'completed' ? 'bg-green-100 text-green-800' :
                              returnItem.returnStatus === 'approved' ? 'bg-blue-100 text-blue-800' :
                              returnItem.returnStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                              returnItem.returnStatus === 'processed' ? 'bg-purple-100 text-purple-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {returnItem.returnStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {new Date(returnItem.returnedAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {['requested', 'approved'].includes(returnItem.returnStatus) && (
                              <select
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleReturnStatusChange(returnItem.id, e.target.value);
                                    e.target.value = '';
                                  }
                                }}
                                className="text-xs border border-gray-300 rounded px-2 py-1"
                              >
                                <option value="">Update Status</option>
                                {returnItem.returnStatus === 'requested' && (
                                  <>
                                    <option value="approved">Approve</option>
                                    <option value="rejected">Reject</option>
                                  </>
                                )}
                                {returnItem.returnStatus === 'approved' && (
                                  <>
                                    <option value="processed">Process</option>
                                    <option value="completed">Complete</option>
                                  </>
                                )}
                              </select>
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

export default OrderPOService;

