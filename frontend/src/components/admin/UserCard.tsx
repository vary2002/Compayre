'use client';

import { formatDistanceToNow } from 'date-fns';

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

interface UserCardProps {
  user: User;
  onClick: () => void;
}

export function UserCard({ user, onClick }: UserCardProps) {
  const displayName = user.first_name && user.last_name 
    ? `${user.first_name} ${user.last_name}`
    : user.email;

  const subscriptionColor = {
    'admin': 'bg-blue-100 text-blue-700',
    'subscriber': 'bg-green-100 text-green-700',
    'user': 'bg-red-100 text-red-700',
  }[user.subscription_type] || 'bg-gray-100 text-gray-700';

  const subscriptionLabel = {
    'admin': 'Admin',
    'subscriber': 'Subscribed',
    'user': 'Unsubscribed',
  }[user.subscription_type] || 'Unknown';

  return (
    <button
      onClick={onClick}
      className="text-left p-4 bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-shadow cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{displayName}</h3>
          <p className="text-sm text-gray-600">{user.email}</p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${subscriptionColor}`}>
          {subscriptionLabel}
        </span>
      </div>

      {/* Company and Role */}
      {user.company_name && (
        <p className="text-sm text-gray-600 mb-2">
          <span className="font-medium">Company:</span> {user.company_name}
        </p>
      )}

      {user.designation && (
        <p className="text-sm text-gray-600 mb-3">
          <span className="font-medium">Role:</span> {user.designation}
        </p>
      )}

      {/* Last Activity */}
      <div className="pt-3 border-t border-gray-200 text-xs text-gray-500">
        <p>Updated {formatDistanceToNow(new Date(user.updated_at), { addSuffix: true })}</p>
      </div>
    </button>
  );
}
