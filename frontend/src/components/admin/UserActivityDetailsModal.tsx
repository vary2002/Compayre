'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { format } from 'date-fns';

interface UserActivityLog {
  id: number;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  activity_type: string;
  description: string;
  ip_address: string;
  user_agent: string;
  timestamp: string;
}

interface UserActivityDetailsModalProps {
  log: UserActivityLog;
  isOpen: boolean;
  onClose: () => void;
}

interface UserSelection {
  companies: Array<{ id: number; name: string }>;
  directors: Array<{ id: number; name: string }>;
}

export function UserActivityDetailsModal({
  log,
  isOpen,
  onClose,
}: UserActivityDetailsModalProps) {
  const [selections, setSelections] = useState<UserSelection | null>(null);
  const [isLoadingSelections, setIsLoadingSelections] = useState(false);

  useEffect(() => {
    if (isOpen && isOpen) {
      fetchUserSelections();
    }
  }, [isOpen, log.user.id]);

  const fetchUserSelections = async () => {
    setIsLoadingSelections(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/${log.user.id}/selections/`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSelections(data);
      }
    } catch (error) {
      console.error('Error fetching user selections:', error);
    } finally {
      setIsLoadingSelections(false);
    }
  };

  if (!isOpen) return null;

  const displayName = `${log.user.first_name} ${log.user.last_name}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Activity Details</h2>
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
          <div className="mb-8 pb-8 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <p className="text-gray-900">{displayName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <p className="text-gray-900">{log.user.email}</p>
              </div>
            </div>
          </div>

          {/* Activity Info */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Activity Type</label>
                <p className="text-gray-900 capitalize">{log.activity_type}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <p className="text-gray-900">{log.description}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timestamp</label>
                <p className="text-gray-900">{format(new Date(log.timestamp), 'PPpp')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
                <p className="text-gray-900 font-mono text-sm">{log.ip_address}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User Agent</label>
                <p className="text-gray-900 text-sm break-words">{log.user_agent}</p>
              </div>
            </div>
          </div>

          {/* User Selections */}
          {isLoadingSelections ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : selections ? (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Company & Director Selections
              </h3>

              {selections.companies && selections.companies.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selected Companies
                  </label>
                  <div className="space-y-2">
                    {selections.companies.map(company => (
                      <div
                        key={company.id}
                        className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-gray-900"
                      >
                        {company.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selections.directors && selections.directors.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selected Directors
                  </label>
                  <div className="space-y-2">
                    {selections.directors.map(director => (
                      <div
                        key={director.id}
                        className="p-3 bg-green-50 border border-green-200 rounded-lg text-gray-900"
                      >
                        {director.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!selections.companies || selections.companies.length === 0) &&
                (!selections.directors || selections.directors.length === 0) && (
                  <p className="text-gray-500 text-center py-8">
                    No company or director selections found
                  </p>
                )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
