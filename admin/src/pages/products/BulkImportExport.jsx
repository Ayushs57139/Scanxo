import React, { useState } from 'react';
import { productsAPI } from '../../services/api';
import { ArrowDownTrayIcon, ArrowUpTrayIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

const BulkImportExport = () => {
  const [importMode, setImportMode] = useState('csv');
  const [csvData, setCsvData] = useState('');
  const [importResults, setImportResults] = useState(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format = 'csv') => {
    setExporting(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/products/export/${format}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `products-export-${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      alert('Products exported successfully!');
    } catch (error) {
      console.error('Error exporting products:', error);
      alert('Error exporting products');
    } finally {
      setExporting(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvData(event.target.result);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvData.trim()) {
      alert('Please provide CSV data or upload a file');
      return;
    }

    setImporting(true);
    setImportResults(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/products/import/csv`, {
        csvData
      });
      
      setImportResults(response.data);
      if (response.data.success > 0) {
        alert(`Successfully imported ${response.data.success} products!`);
        setCsvData('');
      }
    } catch (error) {
      console.error('Error importing products:', error);
      alert('Error importing products: ' + (error.response?.data?.error || error.message));
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = `name,category,price,retailPrice,moq,unit,packSize,pricePerPack,stockQuantity,hsnCode,gstRate,supplier,supplierCode,image,description,discount,isTrending
Paracetamol 500mg,Pain Relief,45.00,60.00,100,tablets,10,450.00,5000,30049099,12.00,MediCorp,MC001,https://example.com/image.jpg,Fast-acting pain relief,15.00,true
Amoxicillin 250mg,Antibiotics,120.00,180.00,50,capsules,10,1200.00,3000,30041090,12.00,HealthCare,HP002,https://example.com/image2.jpg,Broad-spectrum antibiotic,20.00,true`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'products-import-template.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Product Bulk Import/Export</h1>
        <p className="text-gray-600 mt-2">Import and export products in bulk using CSV format</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <ArrowDownTrayIcon className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Export Products</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Export all products to CSV format for backup or external use.
          </p>
          
          <div className="space-y-3">
            <button
              onClick={() => handleExport('csv')}
              disabled={exporting}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {exporting ? (
                'Exporting...'
              ) : (
                <>
                  <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                  Export to CSV
                </>
              )}
            </button>
          </div>
        </div>

        {/* Import Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <ArrowUpTrayIcon className="h-6 w-6 text-green-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Import Products</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Import products from CSV file. Make sure your CSV matches the template format.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload CSV File
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or Paste CSV Data
              </label>
              <textarea
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                rows={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Paste CSV data here or upload a file..."
              />
            </div>

            <div className="flex space-x-2">
              <button
                onClick={downloadTemplate}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Download Template
              </button>
              <button
                onClick={handleImport}
                disabled={importing || !csvData.trim()}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? 'Importing...' : 'Import Products'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Import Results */}
      {importResults && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Results</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Successful</div>
              <div className="text-2xl font-bold text-green-600">{importResults.success}</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Failed</div>
              <div className="text-2xl font-bold text-red-600">{importResults.failed}</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Total</div>
              <div className="text-2xl font-bold text-blue-600">
                {importResults.success + importResults.failed}
              </div>
            </div>
          </div>

          {importResults.errors && importResults.errors.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Errors:</h4>
              <div className="max-h-48 overflow-y-auto">
                {importResults.errors.map((error, index) => (
                  <div key={index} className="text-sm text-red-600 mb-1">
                    Line {error.line}: {error.error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">CSV Format Instructions</h3>
        <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
          <li>First row must contain column headers</li>
          <li>Required columns: name, category, price</li>
          <li>Optional columns: retailPrice, moq, unit, packSize, pricePerPack, stockQuantity, hsnCode, gstRate, supplier, supplierCode, image, description, discount, isTrending</li>
          <li>Boolean values (isTrending) should be "true" or "false" or "1" or "0"</li>
          <li>Numeric values should not include currency symbols</li>
          <li>If a value contains commas, it will be automatically quoted</li>
        </ul>
      </div>
    </div>
  );
};

export default BulkImportExport;

