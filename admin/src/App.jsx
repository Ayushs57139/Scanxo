import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/products/Products';
import ProductForm from './pages/products/ProductForm';
import Categories from './pages/categories/Categories';
import Banners from './pages/banners/Banners';
import Orders from './pages/orders/Orders';
import Distributors from './pages/distributors/Distributors';
import Retailers from './pages/retailers/Retailers';
import Rewards from './pages/rewards/Rewards';
import Outstanding from './pages/outstanding/Outstanding';
import Settings from './pages/Settings';
import KYCList from './pages/kyc/KYCList';
import KYCDetail from './pages/kyc/KYCDetail';
import CompanyOffers from './pages/company-offers/CompanyOffers';
import Catalog from './pages/catalog/Catalog';
import CatalogService from './pages/catalog/CatalogService';
import InventoryService from './pages/inventory/InventoryService';
import OrderPOService from './pages/orders-po/OrderPOService';
import Pricing from './pages/pricing/Pricing';
import DiscountRules from './pages/pricing/DiscountRules';
import SlabPricing from './pages/pricing/SlabPricing';
import PromoCodes from './pages/pricing/PromoCodes';
import TaxRules from './pages/pricing/TaxRules';
import CreditLimits from './pages/pricing/CreditLimits';
import PaymentTerms from './pages/pricing/PaymentTerms';
import Payments from './pages/payments/Payments';
import Delivery from './pages/delivery/Delivery';
import Analytics from './pages/analytics/Analytics';
import AuditEvents from './pages/audit/AuditEvents';
import BulkImportExport from './pages/products/BulkImportExport';
import OrderManagement from './pages/orders/OrderManagement';
import Reconciliations from './pages/payments/Reconciliations';
import ComplianceReports from './pages/compliance/ComplianceReports';
import Layout from './components/Layout';

function App() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(
    localStorage.getItem('adminToken') !== null
  );

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={
            isAuthenticated ? <Navigate to="/dashboard" /> : <Login setIsAuthenticated={setIsAuthenticated} />
          } 
        />
        <Route
          path="/"
          element={
            isAuthenticated ? <Layout setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/login" />
          }
        >
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="products/new" element={<ProductForm />} />
          <Route path="products/edit/:id" element={<ProductForm />} />
          <Route path="products/catalog/:id" element={<CatalogService />} />
          <Route path="products/bulk-import-export" element={<BulkImportExport />} />
          <Route path="catalog" element={<Catalog />} />
          <Route path="inventory" element={<InventoryService />} />
          <Route path="orders-po" element={<OrderPOService />} />
          <Route path="categories" element={<Categories />} />
          <Route path="banners" element={<Banners />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/management" element={<OrderManagement />} />
          <Route path="distributors" element={<Distributors />} />
          <Route path="retailers" element={<Retailers />} />
          <Route path="rewards" element={<Rewards />} />
          <Route path="outstanding" element={<Outstanding />} />
          <Route path="company-offers" element={<CompanyOffers />} />
          <Route path="kyc" element={<KYCList />} />
          <Route path="kyc/:id" element={<KYCDetail />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="pricing/discount-rules" element={<DiscountRules />} />
          <Route path="pricing/slab-pricing" element={<SlabPricing />} />
          <Route path="pricing/promo-codes" element={<PromoCodes />} />
          <Route path="pricing/tax-rules" element={<TaxRules />} />
          <Route path="pricing/credit-limits" element={<CreditLimits />} />
          <Route path="pricing/payment-terms" element={<PaymentTerms />} />
          <Route path="payments" element={<Payments />} />
          <Route path="payments/reconciliations" element={<Reconciliations />} />
          <Route path="delivery" element={<Delivery />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="audit-events" element={<AuditEvents />} />
          <Route path="compliance" element={<ComplianceReports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

