'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { apiClient } from '@/lib/api';

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

interface UserActivityLog {
  id: number;
  user: User;
  activity_type: string;
  description: string;
  ip_address: string;
  user_agent: string;
  timestamp: string;
  selection_type?: string; // 'company' or 'director'
  selection_name?: string;
}

interface PaginatedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: UserActivityLog[];
}

interface UserActivityHistoryModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

export function UserActivityHistoryModal({
  user,
  isOpen,
  onClose,
}: UserActivityHistoryModalProps) {
  const [activities, setActivities] = useState<UserActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextPage, setNextPage] = useState(1);
  const observerTarget = useRef<HTMLDivElement>(null);

  const displayName = `${user.first_name} ${user.last_name}`;

  const fetchActivities = useCallback(
    async (page: number) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          page_size: '20',
          user_id: user.id.toString(),
        });

        const response = await apiClient.fetchWithAuth(
          `${process.env.NEXT_PUBLIC_API_URL}/activity-logs/?${params}`
        );

        if (!response.ok) throw new Error('Failed to fetch activities');

        const data: PaginatedResponse = await response.json();

        if (page === 1) {
          setActivities(data.results);
        } else {
          setActivities(prev => [...prev, ...data.results]);
        }

        setHasMore(data.next !== null);
        setNextPage(page + 1);
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [user.id]
  );

  // Initial load
  useEffect(() => {
    if (isOpen) {
      fetchActivities(1);
    }
  }, [isOpen, user.id, fetchActivities]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          fetchActivities(nextPage);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoading, nextPage, fetchActivities]);

  const getActivityTypeColor = (type: string) => {
    switch (type) {
      case 'login':
        return 'bg-blue-100 text-blue-700';
      case 'logout':
        return 'bg-gray-100 text-gray-700';
      case 'registration':
        return 'bg-green-100 text-green-700';
      case 'company_selection':
        return 'bg-purple-100 text-purple-700';
      case 'director_selection':
        return 'bg-indigo-100 text-indigo-700';
      case 'error':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
  };

  // Extract dropdown selections from description
  const extractSelections = (description: string): { type: string; items: string[] } => {
    // Pattern: "Selected companies: [Company1, Company2]" or "Selected directors: [Director1]"
    const companiesMatch = description.match(/Selected companies:\s*\[(.*?)\]/);
    const directorsMatch = description.match(/Selected directors:\s*\[(.*?)\]/);

    if (companiesMatch) {
      return {
        type: 'companies',
        items: companiesMatch[1].split(',').map(item => item.trim()).filter(Boolean),
      };
    }

    if (directorsMatch) {
      return {
        type: 'directors',
        items: directorsMatch[1].split(',').map(item => item.trim()).filter(Boolean),
      };
    }

    return { type: 'other', items: [] };
  };

  // Filter out login and logout activities
  const filteredActivities = activities.filter(activity => {
    return activity.activity_type !== 'login' && activity.activity_type !== 'logout';
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Activity Timeline</h2>
            <p className="text-gray-600 mt-1">{displayName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Activities List */}
        <div className="overflow-y-auto flex-1 p-6">
          <div className="space-y-4">
            {filteredActivities.map((activity, index) => {
              const selections = extractSelections(activity.description);
              const isSelectionActivity =
                selections.type === 'companies' || selections.type === 'directors';

              return (
                <div key={activity.id} className="relative">
                  {/* Timeline line */}
                  {index < activities.length - 1 && (
                    <div className="absolute left-4 top-12 bottom-0 w-0.5 bg-gray-200"></div>
                  )}

                  {/* Activity item */}
                  <div className="pl-16 pb-4">
                    {/* Timeline dot */}
                    <div className="absolute left-0 top-1.5">
                      <div className="relative w-8 h-8 bg-white border-2 border-blue-600 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{activity.description}</p>
                          
                          {/* Show selection details if available */}
                          {activity.selection_type && activity.selection_name && (
                            <div className="mt-2 p-2 bg-white rounded border border-gray-300">
                              <p className="text-sm text-gray-700">
                                <span className="font-medium capitalize">{activity.selection_type}:</span> {activity.selection_name}
                              </p>
                            </div>
                          )}
                          
                          <p className="text-xs text-gray-500 mt-2">
                            {format(new Date(activity.timestamp), 'PPpp')}
                          </p>
                        </div>
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ml-4 ${getActivityTypeColor(
                            activity.activity_type
                          )}`}
                        >
                          {activity.activity_type === 'company_selection'
                            ? 'Company Selected'
                            : activity.activity_type === 'director_selection'
                            ? 'Director Selected'
                            : activity.activity_type}
                        </span>
                      </div>

                      {/* Selections */}
                      {isSelectionActivity && selections.items.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-300">
                          <p className="text-xs font-semibold text-gray-700 mb-2 capitalize">
                            Selected {selections.type}:
                          </p>
                          <div className="space-y-1">
                            {selections.items.map((item, idx) => (
                              <div
                                key={idx}
                                className={`text-xs px-2.5 py-1.5 rounded ${
                                  selections.type === 'companies'
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'bg-green-50 text-green-700'
                                }`}
                              >
                                {item}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Additional details */}
                      <div className="mt-3 pt-3 border-t border-gray-300 text-xs text-gray-500 space-y-1">
                        <p>
                          <span className="font-medium">IP:</span> {activity.ip_address}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* No Activities */}
          {!isLoading && filteredActivities.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No activities found for this user</p>
            </div>
          )}

          {/* Infinite Scroll Trigger */}
          <div ref={observerTarget} className="py-8" />
        </div>
      </div>
    </div>
  );
}
