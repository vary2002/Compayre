'use client';

import { useState } from 'react';
import { X, Calendar } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  company_name?: string;
  designation?: string;
  role: string;
  subscription_type: string;
  is_staff: boolean;
  created_at: string;
  updated_at: string;
}

interface UserDetailsModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSubscriptionUpdate: () => void;
}

export function UserDetailsModal({
  user,
  isOpen,
  onClose,
  onSubscriptionUpdate,
}: UserDetailsModalProps) {
  const [isUpdatingSubscription, setIsUpdatingSubscription] = useState(false);
  const [subscriptionType, setSubscriptionType] = useState(user.subscription_type);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const displayName = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`
    : user.email;

  const handleSubscriptionUpdate = async () => {
    setError('');
    setSuccess('');

    if (subscriptionType === 'subscriber' && (!fromDate || !toDate)) {
      setError('Please select both from and to dates for subscriber subscription');
      return;
    }

    if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
      setError('From date must be before to date');
      return;
    }

    setIsUpdatingSubscription(true);
    try {
      const payload: any = {
        subscription_type: subscriptionType,
      };

      if (subscriptionType === 'subscriber') {
        payload.subscription_start_date = fromDate;
        payload.subscription_end_date = toDate;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/${user.id}/set_subscription/`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update subscription');
      }

      setSuccess('Subscription updated successfully');
      setTimeout(() => {
        onSubscriptionUpdate();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update subscription');
    } finally {
      setIsUpdatingSubscription(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">User Details</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* User Info */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <p className="text-gray-900">{displayName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <p className="text-gray-900">{user.email}</p>
              </div>
              {user.phone_number && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <p className="text-gray-900">{user.phone_number}</p>
                </div>
              )}
              {user.company_name && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization
                  </label>
                  <p className="text-gray-900">{user.company_name}</p>
                </div>
              )}
              {user.designation && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <p className="text-gray-900">{user.designation}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role Type</label>
                <p className="text-gray-900 capitalize">{user.role}</p>
              </div>
            </div>
          </div>

          {/* Activity Info */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Login
                </label>
                <p className="text-gray-900">
                  {formatDistanceToNow(new Date(user.updated_at), { addSuffix: true })}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {format(new Date(user.updated_at), 'PPpp')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Member Since
                </label>
                <p className="text-gray-900">
                  {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {format(new Date(user.created_at), 'PPpp')}
                </p>
              </div>
            </div>
          </div>

          {/* Subscription Management */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Manage Subscription</h3>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                {success}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subscription Type
              </label>
              <select
                value={subscriptionType}
                onChange={e => setSubscriptionType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="user">Unsubscribed</option>
                <option value="subscriber">Subscriber</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Date Range for Subscriber */}
            {subscriptionType === 'subscriber' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subscription Start Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input
                      type="date"
                      value={fromDate}
                      onChange={e => setFromDate(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subscription End Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input
                      type="date"
                      value={toDate}
                      onChange={e => setToDate(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleSubscriptionUpdate}
              disabled={isUpdatingSubscription}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdatingSubscription ? 'Updating...' : 'Update Subscription'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
