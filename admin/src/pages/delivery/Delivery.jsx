import React, { useState, useEffect } from 'react';
import {
  TruckIcon,
  PlusIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon,
  EyeIcon,
  PencilIcon,
  XMarkIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { shipmentsAPI, ordersAPI } from '../../services/api';

const Delivery = () => {
  const [shipments, setShipments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [logisticsPartners, setLogisticsPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [trackingHistory, setTrackingHistory] = useState([]);
  const [filters, setFilters] = useState({ status: '', logisticsPartner: '' });

  const [formData, setFormData] = useState({
    orderId: '',
    logisticsPartner: 'shadow',
    originAddress: {
      name: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      phone: '',
    },
    destinationAddress: {
      name: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      phone: '',
    },
    weight: '',
    dimensions: {
      length: '',
      width: '',
      height: '',
    },
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load data independently so one failure doesn't break everything
      const results = await Promise.allSettled([
        shipmentsAPI.getAll(filters).catch(err => {
          console.error('Error loading shipments:', err);
          return [];
        }),
        ordersAPI.getCustomerOrders().catch(err => {
          console.error('Error loading orders:', err);
          return [];
        }),
        shipmentsAPI.getLogisticsPartners().catch(err => {
          console.error('Error loading logistics partners:', err);
          return [];
        }),
      ]);
      
      setShipments(results[0].status === 'fulfilled' ? results[0].value : []);
      setOrders(results[1].status === 'fulfilled' ? results[1].value : []);
      setLogisticsPartners(results[2].status === 'fulfilled' ? results[2].value : []);
    } catch (error) {
      console.error('Error loading data:', error);
      // Set empty arrays as fallback
      setShipments([]);
      setOrders([]);
      setLogisticsPartners([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShipment = async (e) => {
    e.preventDefault();
    try {
      await shipmentsAPI.create(formData);
      alert('Shipment created successfully!');
      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error creating shipment:', error);
      alert(error.response?.data?.error || 'Error creating shipment');
    }
  };

  const handleGenerateLabel = async (shipmentId) => {
    try {
      const result = await shipmentsAPI.generateLabel(shipmentId);
      alert('Label generated successfully!');
      if (result.labelUrl) {
        window.open(result.labelUrl, '_blank');
      }
      loadData();
    } catch (error) {
      console.error('Error generating label:', error);
      alert(error.response?.data?.error || 'Error generating label');
    }
  };

  const handleViewTracking = async (shipment) => {
    try {
      setSelectedShipment(shipment);
      const tracking = await shipmentsAPI.getTracking(shipment.id);
      setTrackingHistory(tracking);
      setShowTrackingModal(true);
    } catch (error) {
      console.error('Error loading tracking:', error);
      alert('Error loading tracking information');
    }
  };

  const handleSyncTracking = async (shipmentId) => {
    try {
      await shipmentsAPI.syncTracking(shipmentId);
      alert('Tracking synced successfully!');
      if (selectedShipment?.id === shipmentId) {
        const tracking = await shipmentsAPI.getTracking(shipmentId);
        setTrackingHistory(tracking);
      }
      loadData();
    } catch (error) {
      console.error('Error syncing tracking:', error);
      alert(error.response?.data?.error || 'Error syncing tracking');
    }
  };

  const handleUpdateStatus = async (shipmentId, newStatus) => {
    try {
      await shipmentsAPI.update(shipmentId, { status: newStatus });
      alert('Status updated successfully!');
      loadData();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status');
    }
  };

  const resetForm = () => {
    setFormData({
      orderId: '',
      logisticsPartner: 'shadow',
      originAddress: {
        name: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        phone: '',
      },
      destinationAddress: {
        name: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        phone: '',
      },
      weight: '',
      dimensions: {
        length: '',
        width: '',
        height: '',
      },
      notes: '',
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'out_for_delivery':
        return 'bg-blue-100 text-blue-800';
      case 'in_transit':
        return 'bg-yellow-100 text-yellow-800';
      case 'created':
        return 'bg-purple-100 text-purple-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'delivered':
        return <CheckCircleIcon className="h-5 w-5" />;
      case 'in_transit':
      case 'out_for_delivery':
        return <TruckIcon className="h-5 w-5" />;
      default:
        return <ClockIcon className="h-5 w-5" />;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Delivery / Logistics</h1>
          <p className="text-gray-600 mt-2">Manage shipments, labels, and tracking</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Shipment
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="created">Created</option>
              <option value="in_transit">In Transit</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Logistics Partner</label>
            <select
              value={filters.logisticsPartner}
              onChange={(e) => setFilters({ ...filters, logisticsPartner: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">All Partners</option>
              {logisticsPartners.map((partner) => (
                <option key={partner.id} value={partner.name}>
                  {partner.displayName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ status: '', logisticsPartner: '' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Shipments Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Shipment #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Partner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tracking #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estimated Delivery
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {shipments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    No shipments found
                  </td>
                </tr>
              ) : (
                shipments.map((shipment) => (
                  <tr key={shipment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {shipment.shipmentNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      #{shipment.orderId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {logisticsPartners.find(p => p.name === shipment.logisticsPartner)?.displayName || shipment.logisticsPartner}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {shipment.trackingNumber || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(shipment.status)}`}>
                        {getStatusIcon(shipment.status)}
                        <span className="ml-1">{shipment.status?.replace('_', ' ')}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {shipment.estimatedDeliveryDate
                        ? new Date(shipment.estimatedDeliveryDate).toLocaleDateString()
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewTracking(shipment)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Tracking"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleGenerateLabel(shipment.id)}
                          className="text-green-600 hover:text-green-900"
                          title="Generate Label"
                        >
                          <DocumentArrowDownIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleSyncTracking(shipment.id)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Sync Tracking"
                        >
                          <ArrowPathIcon className="h-5 w-5" />
                        </button>
                        <select
                          value={shipment.status}
                          onChange={(e) => handleUpdateStatus(shipment.id, e.target.value)}
                          className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-primary"
                        >
                          <option value="pending">Pending</option>
                          <option value="created">Created</option>
                          <option value="in_transit">In Transit</option>
                          <option value="out_for_delivery">Out for Delivery</option>
                          <option value="delivered">Delivered</option>
                          <option value="failed">Failed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Shipment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Create New Shipment</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleCreateShipment} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order ID *</label>
                  <select
                    value={formData.orderId}
                    onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  >
                    <option value="">Select Order</option>
                    {orders.map((order) => (
                      <option key={order.id} value={order.id}>
                        Order #{order.id} - ₹{Number(order.total || order.finalAmount || 0).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Logistics Partner *</label>
                  <select
                    value={formData.logisticsPartner}
                    onChange={(e) => setFormData({ ...formData, logisticsPartner: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  >
                    {logisticsPartners.filter(p => p.isActive).map((partner) => (
                      <option key={partner.id} value={partner.name}>
                        {partner.displayName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dimensions (cm)</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      placeholder="Length"
                      value={formData.dimensions.length}
                      onChange={(e) => setFormData({
                        ...formData,
                        dimensions: { ...formData.dimensions, length: e.target.value }
                      })}
                      className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <input
                      type="number"
                      placeholder="Width"
                      value={formData.dimensions.width}
                      onChange={(e) => setFormData({
                        ...formData,
                        dimensions: { ...formData.dimensions, width: e.target.value }
                      })}
                      className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <input
                      type="number"
                      placeholder="Height"
                      value={formData.dimensions.height}
                      onChange={(e) => setFormData({
                        ...formData,
                        dimensions: { ...formData.dimensions, height: e.target.value }
                      })}
                      className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Origin Address *</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Name"
                    value={formData.originAddress.name}
                    onChange={(e) => setFormData({
                      ...formData,
                      originAddress: { ...formData.originAddress, name: e.target.value }
                    })}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Phone"
                    value={formData.originAddress.phone}
                    onChange={(e) => setFormData({
                      ...formData,
                      originAddress: { ...formData.originAddress, phone: e.target.value }
                    })}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Address"
                    value={formData.originAddress.address}
                    onChange={(e) => setFormData({
                      ...formData,
                      originAddress: { ...formData.originAddress, address: e.target.value }
                    })}
                    className="md:col-span-2 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                  <input
                    type="text"
                    placeholder="City"
                    value={formData.originAddress.city}
                    onChange={(e) => setFormData({
                      ...formData,
                      originAddress: { ...formData.originAddress, city: e.target.value }
                    })}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                  <input
                    type="text"
                    placeholder="State"
                    value={formData.originAddress.state}
                    onChange={(e) => setFormData({
                      ...formData,
                      originAddress: { ...formData.originAddress, state: e.target.value }
                    })}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Pincode"
                    value={formData.originAddress.pincode}
                    onChange={(e) => setFormData({
                      ...formData,
                      originAddress: { ...formData.originAddress, pincode: e.target.value }
                    })}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Destination Address *</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Name"
                    value={formData.destinationAddress.name}
                    onChange={(e) => setFormData({
                      ...formData,
                      destinationAddress: { ...formData.destinationAddress, name: e.target.value }
                    })}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Phone"
                    value={formData.destinationAddress.phone}
                    onChange={(e) => setFormData({
                      ...formData,
                      destinationAddress: { ...formData.destinationAddress, phone: e.target.value }
                    })}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Address"
                    value={formData.destinationAddress.address}
                    onChange={(e) => setFormData({
                      ...formData,
                      destinationAddress: { ...formData.destinationAddress, address: e.target.value }
                    })}
                    className="md:col-span-2 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                  <input
                    type="text"
                    placeholder="City"
                    value={formData.destinationAddress.city}
                    onChange={(e) => setFormData({
                      ...formData,
                      destinationAddress: { ...formData.destinationAddress, city: e.target.value }
                    })}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                  <input
                    type="text"
                    placeholder="State"
                    value={formData.destinationAddress.state}
                    onChange={(e) => setFormData({
                      ...formData,
                      destinationAddress: { ...formData.destinationAddress, state: e.target.value }
                    })}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Pincode"
                    value={formData.destinationAddress.pincode}
                    onChange={(e) => setFormData({
                      ...formData,
                      destinationAddress: { ...formData.destinationAddress, pincode: e.target.value }
                    })}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="3"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div className="mt-6 flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                  Create Shipment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tracking Modal */}
      {showTrackingModal && selectedShipment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Tracking Information</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Shipment: {selectedShipment.shipmentNumber} | Tracking: {selectedShipment.trackingNumber || 'N/A'}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleSyncTracking(selectedShipment.id)}
                  className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                >
                  <ArrowPathIcon className="h-4 w-4 inline mr-1" />
                  Sync
                </button>
                <button
                  onClick={() => {
                    setShowTrackingModal(false);
                    setSelectedShipment(null);
                    setTrackingHistory([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              {trackingHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No tracking information available</div>
              ) : (
                <div className="space-y-4">
                  {trackingHistory.map((tracking, index) => (
                    <div key={tracking.id} className="flex items-start space-x-4">
                      <div className={`flex-shrink-0 w-3 h-3 rounded-full mt-2 ${
                        index === 0 ? 'bg-primary' : 'bg-gray-300'
                      }`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-semibold ${getStatusColor(tracking.status)} px-2 py-1 rounded`}>
                            {tracking.status?.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(tracking.timestamp).toLocaleString()}
                          </span>
                        </div>
                        {tracking.location && (
                          <p className="text-sm text-gray-600 mt-1">📍 {tracking.location}</p>
                        )}
                        {tracking.description && (
                          <p className="text-sm text-gray-700 mt-1">{tracking.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">Source: {tracking.source}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Delivery;

