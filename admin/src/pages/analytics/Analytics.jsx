import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  CubeIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { analyticsAPI } from '../../services/api';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const Analytics = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [overviewData, setOverviewData] = useState(null);
  const [salesData, setSalesData] = useState(null);
  const [inventoryData, setInventoryData] = useState(null);
  const [ordersData, setOrdersData] = useState(null);
  const [receivablesData, setReceivablesData] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, [activeTab, period, startDate, endDate]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const params = { period, startDate, endDate };
      
      switch (activeTab) {
        case 'overview':
          const overview = await analyticsAPI.getOverviewDashboard(params);
          setOverviewData(overview);
          break;
        case 'sales':
          const sales = await analyticsAPI.getSalesDashboard(params);
          setSalesData(sales);
          break;
        case 'inventory':
          const inventory = await analyticsAPI.getInventoryDashboard(params);
          setInventoryData(inventory);
          break;
        case 'orders':
          const orders = await analyticsAPI.getOrdersDashboard(params);
          setOrdersData(orders);
          break;
        case 'receivables':
          const receivables = await analyticsAPI.getReceivablesDashboard(params);
          setReceivablesData(receivables);
          break;
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `₹${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'sales', name: 'Sales', icon: CurrencyDollarIcon },
    { id: 'inventory', name: 'Inventory', icon: CubeIcon },
    { id: 'orders', name: 'Orders', icon: ShoppingCartIcon },
    { id: 'receivables', name: 'Receivables', icon: CurrencyDollarIcon },
  ];

  if (loading && !overviewData && !salesData && !inventoryData && !ordersData && !receivablesData) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Analytics / BI</h1>
        <p className="text-gray-600 mt-2">Business intelligence and analytics dashboards</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setPeriod('daily');
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && overviewData && (
          <OverviewDashboard data={overviewData} formatCurrency={formatCurrency} />
        )}
        {activeTab === 'sales' && salesData && (
          <SalesDashboard data={salesData} formatCurrency={formatCurrency} />
        )}
        {activeTab === 'inventory' && inventoryData && (
          <InventoryDashboard data={inventoryData} formatCurrency={formatCurrency} />
        )}
        {activeTab === 'orders' && ordersData && (
          <OrdersDashboard data={ordersData} formatCurrency={formatCurrency} />
        )}
        {activeTab === 'receivables' && receivablesData && (
          <ReceivablesDashboard data={receivablesData} formatCurrency={formatCurrency} />
        )}
      </div>
    </div>
  );
};

// Overview Dashboard Component
const OverviewDashboard = ({ data, formatCurrency }) => {
  return (
    <>
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Sales"
          value={formatCurrency(data.sales?.total)}
          subtitle={`${data.sales?.orderCount || 0} orders`}
          color="blue"
        />
        <MetricCard
          title="Pending Orders"
          value={data.orders?.pending || 0}
          subtitle={formatCurrency(data.orders?.pendingValue)}
          color="yellow"
        />
        <MetricCard
          title="Outstanding Receivables"
          value={formatCurrency(data.receivables?.totalOutstanding)}
          subtitle={`Overdue: ${formatCurrency(data.receivables?.overdue)}`}
          color="red"
        />
        <MetricCard
          title="Inventory Value"
          value={formatCurrency(data.inventory?.totalValue)}
          subtitle={`${data.inventory?.lowStockCount || 0} low stock items`}
          color="green"
        />
      </div>
    </>
  );
};

// Sales Dashboard Component
const SalesDashboard = ({ data, formatCurrency }) => {
  return (
    <>
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <MetricCard
          title="Total Sales"
          value={formatCurrency(data.totalSales)}
          subtitle={`${data.orderCount || 0} orders`}
          color="blue"
        />
        <MetricCard
          title="Average Order Value"
          value={formatCurrency(data.averageOrderValue)}
          subtitle="Per order"
          color="green"
        />
        <MetricCard
          title="Total Orders"
          value={data.orderCount || 0}
          subtitle="Completed orders"
          color="purple"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.salesTrend || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Line type="monotone" dataKey="amount" stroke="#3B82F6" name="Sales" />
              <Line type="monotone" dataKey="count" stroke="#10B981" name="Orders" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.salesByCategory || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="totalRevenue" fill="#3B82F6" name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity Sold</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(data.topProducts || []).map((product) => (
                <tr key={product.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.totalQuantity || 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(product.totalRevenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

// Inventory Dashboard Component
const InventoryDashboard = ({ data, formatCurrency }) => {
  return (
    <>
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <MetricCard
          title="Total Inventory Value"
          value={formatCurrency(data.inventoryValue?.totalValue)}
          subtitle={`${data.inventoryValue?.totalProducts || 0} products`}
          color="blue"
        />
        <MetricCard
          title="Low Stock Items"
          value={data.lowStockAlerts?.length || 0}
          subtitle="Items below threshold"
          color="yellow"
        />
        <MetricCard
          title="Out of Stock"
          value={data.inventoryValue?.outOfStockCount || 0}
          subtitle="Items unavailable"
          color="red"
        />
      </div>

      {/* Inventory Turnover Chart */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory Turnover (Top 10)</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={(data.inventoryTurnover || []).slice(0, 10)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="turnoverRatio" fill="#3B82F6" name="Turnover Ratio" />
            <Bar dataKey="unitsSold" fill="#10B981" name="Units Sold" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Stock Levels by Category */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Levels by Category</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.stockLevels || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="totalStock" fill="#3B82F6" name="Total Stock" />
            <Bar dataKey="lowStock" fill="#F59E0B" name="Low Stock" />
            <Bar dataKey="outOfStock" fill="#EF4444" name="Out of Stock" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Low Stock Alerts */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Low Stock Alerts</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(data.lowStockAlerts || []).map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">{item.stockQuantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(item.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

// Orders Dashboard Component
const OrdersDashboard = ({ data, formatCurrency }) => {
  return (
    <>
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <MetricCard
          title="Pending Orders"
          value={data.pendingOrders?.count || 0}
          subtitle={formatCurrency(data.pendingOrders?.totalValue)}
          color="yellow"
        />
        <MetricCard
          title="Average Order Value"
          value={formatCurrency(data.pendingOrders?.avgValue)}
          subtitle="Pending orders"
          color="blue"
        />
        <MetricCard
          title="Total Pending Value"
          value={formatCurrency(data.pendingOrders?.totalValue)}
          subtitle="Unprocessed orders"
          color="orange"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Status Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.orderStatus || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {(data.orderStatus || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.orderTrend || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#3B82F6" name="Orders" />
              <Line type="monotone" dataKey="totalValue" stroke="#10B981" name="Value" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Average Order Value Trend */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Average Order Value Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.averageOrderValueTrend || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Legend />
            <Line type="monotone" dataKey="avgValue" stroke="#8B5CF6" name="Avg Order Value" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
};

// Receivables Dashboard Component
const ReceivablesDashboard = ({ data, formatCurrency }) => {
  return (
    <>
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <MetricCard
          title="Total Outstanding"
          value={formatCurrency(data.outstandingSummary?.totalOutstanding)}
          subtitle={`${data.outstandingSummary?.totalInvoices || 0} invoices`}
          color="red"
        />
        <MetricCard
          title="Pending"
          value={formatCurrency(data.outstandingSummary?.pendingAmount)}
          subtitle="Unpaid invoices"
          color="yellow"
        />
        <MetricCard
          title="Partial"
          value={formatCurrency(data.outstandingSummary?.partialAmount)}
          subtitle="Partially paid"
          color="orange"
        />
        <MetricCard
          title="Overdue"
          value={formatCurrency(data.outstandingSummary?.overdueAmount)}
          subtitle="Past due date"
          color="red"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Aging Receivables</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.agingReceivables || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="ageBucket" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="totalAmount" fill="#EF4444" name="Amount" />
              <Bar dataKey="count" fill="#F59E0B" name="Count" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.paymentStatus || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="totalAmount"
              >
                {(data.paymentStatus || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Collection Trend */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Collection Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.collectionTrend || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Legend />
            <Line type="monotone" dataKey="totalCollected" stroke="#10B981" name="Collected" />
            <Line type="monotone" dataKey="count" stroke="#3B82F6" name="Payments" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
};

// Metric Card Component
const MetricCard = ({ title, value, subtitle, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    red: 'bg-red-50 border-red-200',
    orange: 'bg-orange-50 border-orange-200',
    purple: 'bg-purple-50 border-purple-200',
  };

  return (
    <div className={`bg-white rounded-lg shadow p-6 border-l-4 ${colorClasses[color]}`}>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
};

export default Analytics;

