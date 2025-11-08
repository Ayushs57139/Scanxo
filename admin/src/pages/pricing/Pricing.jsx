import React from 'react';
import { Link } from 'react-router-dom';
import {
  TagIcon,
  CubeIcon,
  TicketIcon,
  ReceiptPercentIcon,
  CreditCardIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

const Pricing = () => {
  const pricingSections = [
    {
      name: 'Discount Rules',
      description: 'Manage discount rules and promotions',
      icon: TagIcon,
      href: '/pricing/discount-rules',
      color: 'bg-blue-500',
    },
    {
      name: 'Slab Pricing',
      description: 'Configure quantity-based pricing tiers',
      icon: CubeIcon,
      href: '/pricing/slab-pricing',
      color: 'bg-green-500',
    },
    {
      name: 'Promo Codes',
      description: 'Create and manage promotional codes',
      icon: TicketIcon,
      href: '/pricing/promo-codes',
      color: 'bg-yellow-500',
    },
    {
      name: 'Tax Rules (GST)',
      description: 'Configure GST and tax rules',
      icon: ReceiptPercentIcon,
      href: '/pricing/tax-rules',
      color: 'bg-purple-500',
    },
    {
      name: 'Credit Limits',
      description: 'Manage user credit limits and terms',
      icon: CreditCardIcon,
      href: '/pricing/credit-limits',
      color: 'bg-red-500',
    },
    {
      name: 'Payment Terms',
      description: 'Configure payment terms and delayed payments',
      icon: ClockIcon,
      href: '/pricing/payment-terms',
      color: 'bg-indigo-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pricing / Scheme Engine</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage discounts, pricing, taxes, credit limits, and payment terms
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pricingSections.map((section) => (
          <Link
            key={section.name}
            to={section.href}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center mb-4">
              <div className={`${section.color} p-3 rounded-lg`}>
                <section.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="ml-4 text-lg font-semibold text-gray-900">{section.name}</h3>
            </div>
            <p className="text-sm text-gray-600">{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Pricing;

