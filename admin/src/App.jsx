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
          <Route path="categories" element={<Categories />} />
          <Route path="banners" element={<Banners />} />
          <Route path="orders" element={<Orders />} />
          <Route path="distributors" element={<Distributors />} />
          <Route path="retailers" element={<Retailers />} />
          <Route path="rewards" element={<Rewards />} />
          <Route path="outstanding" element={<Outstanding />} />
          <Route path="company-offers" element={<CompanyOffers />} />
          <Route path="kyc" element={<KYCList />} />
          <Route path="kyc/:id" element={<KYCDetail />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

