import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { kycAPI } from '../../services/api';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowLeftIcon,
  DocumentIcon,
  BuildingOfficeIcon,
  ReceiptPercentIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';

const KYCDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [businessLicense, setBusinessLicense] = useState(null);
  const [gstInfo, setGstInfo] = useState(null);
  const [creditLimit, setCreditLimit] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [verificationNote, setVerificationNote] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const profileData = await kycAPI.getProfile(id);
      setProfile(profileData);
      
      if (profileData?.userId) {
        try {
          const [documentsData, license, gst, credit] = await Promise.all([
            kycAPI.getAllDocuments(profileData.userId).catch(() => []),
            kycAPI.getBusinessLicense(profileData.userId).catch(() => null),
            kycAPI.getGSTInfo(profileData.userId).catch(() => null),
            kycAPI.getCreditLimit(profileData.userId).catch(() => null),
          ]);
          setDocuments(documentsData || []);
          setBusinessLicense(license);
          setGstInfo(gst);
          setCreditLimit(credit);
        } catch (error) {
          console.error('Error loading additional data:', error);
        }
      }
    } catch (error) {
      console.error('Error loading KYC data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (status) => {
    if (!window.confirm(`Are you sure you want to ${status} this KYC verification?`)) {
      return;
    }

    try {
      await kycAPI.updateProfile(id, {
        verificationStatus: status,
        verifiedAt: new Date().toISOString(),
        verifiedBy: 'admin',
        verificationNote,
      });
      alert(`KYC verification ${status} successfully`);
      loadData();
    } catch (error) {
      console.error('Error updating verification:', error);
      alert('Failed to update verification status');
    }
  };

  const handleCreditLimitUpdate = async () => {
    const newLimit = prompt('Enter new credit limit:', creditLimit?.approvedLimit || 0);
    if (newLimit && !isNaN(newLimit)) {
      try {
        await kycAPI.updateCreditLimit(profile.userId, {
          approvedLimit: parseFloat(newLimit),
          updatedBy: 'admin',
        });
        alert('Credit limit updated successfully');
        loadData();
      } catch (error) {
        console.error('Error updating credit limit:', error);
        alert('Failed to update credit limit');
      }
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case 'rejected':
        return <XCircleIcon className="h-6 w-6 text-red-500" />;
      case 'pending':
        return <ClockIcon className="h-6 w-6 text-yellow-500" />;
      default:
        return <ClockIcon className="h-6 w-6 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Profile not found</p>
        <Link to="/kyc" className="text-primary mt-4 inline-block">
          Back to KYC List
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => navigate('/kyc')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to KYC List
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {profile.firstName} {profile.lastName}
            </h1>
            <p className="text-gray-600 mt-1">User ID: {profile.userId}</p>
          </div>
          <div className="flex items-center space-x-4">
            {getStatusIcon(profile.verificationStatus || 'pending')}
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
              {profile.verificationStatus || 'pending'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {[
              { id: 'profile', label: 'Profile', icon: DocumentIcon },
              { id: 'documents', label: 'Documents', icon: DocumentIcon },
              { id: 'business', label: 'Business License', icon: BuildingOfficeIcon },
              { id: 'gst', label: 'GST Info', icon: ReceiptPercentIcon },
              { id: 'credit', label: 'Credit Limit', icon: CreditCardIcon },
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
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Name</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {profile.firstName} {profile.lastName}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd className="mt-1 text-sm text-gray-900">{profile.email}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Phone</dt>
                      <dd className="mt-1 text-sm text-gray-900">{profile.phone}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
                      <dd className="mt-1 text-sm text-gray-900">{profile.dateOfBirth || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">PAN Number</dt>
                      <dd className="mt-1 text-sm text-gray-900">{profile.panNumber || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Aadhaar Number</dt>
                      <dd className="mt-1 text-sm text-gray-900">{profile.aadhaarNumber || '-'}</dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">Address</h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Street</dt>
                      <dd className="mt-1 text-sm text-gray-900">{profile.address?.street || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">City</dt>
                      <dd className="mt-1 text-sm text-gray-900">{profile.address?.city || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">State</dt>
                      <dd className="mt-1 text-sm text-gray-900">{profile.address?.state || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Pincode</dt>
                      <dd className="mt-1 text-sm text-gray-900">{profile.address?.pincode || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Country</dt>
                      <dd className="mt-1 text-sm text-gray-900">{profile.address?.country || '-'}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Uploaded Documents</h3>
              {documents.length === 0 ? (
                <p className="text-gray-500">No documents uploaded</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {documents.map((doc) => (
                    <div key={doc.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{doc.documentType}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          doc.status === 'approved' ? 'bg-green-100 text-green-800' :
                          doc.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {doc.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{doc.fileName}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                      </p>
                      {doc.filePath && (
                        <a
                          href={`http://localhost:4000${doc.filePath}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary text-sm mt-2 inline-block"
                        >
                          View Document
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Business License Tab */}
          {activeTab === 'business' && (
            <div>
              {businessLicense ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">License Information</h3>
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">License Number</dt>
                        <dd className="mt-1 text-sm text-gray-900">{businessLicense.licenseNumber}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">License Type</dt>
                        <dd className="mt-1 text-sm text-gray-900">{businessLicense.licenseType || '-'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Issue Date</dt>
                        <dd className="mt-1 text-sm text-gray-900">{businessLicense.issueDate || '-'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Expiry Date</dt>
                        <dd className="mt-1 text-sm text-gray-900">{businessLicense.expiryDate || '-'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Issuing Authority</dt>
                        <dd className="mt-1 text-sm text-gray-900">{businessLicense.issuingAuthority || '-'}</dd>
                      </div>
                    </dl>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Business Information</h3>
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Business Name</dt>
                        <dd className="mt-1 text-sm text-gray-900">{businessLicense.businessName}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Business Type</dt>
                        <dd className="mt-1 text-sm text-gray-900">{businessLicense.businessType || '-'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Registration Number</dt>
                        <dd className="mt-1 text-sm text-gray-900">{businessLicense.registrationNumber || '-'}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No business license information available</p>
              )}
            </div>
          )}

          {/* GST Tab */}
          {activeTab === 'gst' && (
            <div>
              {gstInfo ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">GST Registration</h3>
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">GSTIN</dt>
                        <dd className="mt-1 text-sm text-gray-900 font-mono">{gstInfo.gstin}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Legal Name</dt>
                        <dd className="mt-1 text-sm text-gray-900">{gstInfo.legalName || '-'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Trade Name</dt>
                        <dd className="mt-1 text-sm text-gray-900">{gstInfo.tradeName || '-'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Status</dt>
                        <dd className="mt-1 text-sm text-gray-900">{gstInfo.status || '-'}</dd>
                      </div>
                    </dl>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Tax Details</h3>
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">GST Rate</dt>
                        <dd className="mt-1 text-sm text-gray-900">{gstInfo.taxDetails?.gstRate || '-'}%</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">HSN Code</dt>
                        <dd className="mt-1 text-sm text-gray-900">{gstInfo.taxDetails?.hsnCode || '-'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Tax Category</dt>
                        <dd className="mt-1 text-sm text-gray-900">{gstInfo.taxDetails?.taxCategory || '-'}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No GST information available</p>
              )}
            </div>
          )}

          {/* Credit Limit Tab */}
          {activeTab === 'credit' && (
            <div>
              {creditLimit ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600">Approved Limit</div>
                      <div className="text-2xl font-bold text-gray-900">
                        ₹{creditLimit.approvedLimit?.toLocaleString() || 0}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600">Utilized</div>
                      <div className="text-2xl font-bold text-red-600">
                        ₹{creditLimit.utilizedAmount?.toLocaleString() || 0}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600">Available</div>
                      <div className="text-2xl font-bold text-green-600">
                        ₹{((creditLimit.approvedLimit || 0) - (creditLimit.utilizedAmount || 0)).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleCreditLimitUpdate}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
                  >
                    Update Credit Limit
                  </button>
                </div>
              ) : (
                <p className="text-gray-500">No credit limit information available</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Verification Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Verification Actions</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Verification Note
            </label>
            <textarea
              value={verificationNote}
              onChange={(e) => setVerificationNote(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Add a note about this verification..."
            />
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => handleVerification('approved')}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Approve
            </button>
            <button
              onClick={() => handleVerification('rejected')}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KYCDetail;

