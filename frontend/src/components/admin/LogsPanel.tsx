'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { UserActivityHistoryModal } from './UserActivityHistoryModal';
import { apiClient } from '@/lib/api';

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

interface UserActivitySummary {
  user_id: number;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  latest_activity: UserActivityLog;
  activity_count: number;
}

interface PaginatedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: UserActivityLog[];
}

export function LogsPanel() {
  const [allLogs, setAllLogs] = useState<UserActivityLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextPage, setNextPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<UserActivitySummary | null>(null);
  const [showModal, setShowModal] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  const fetchLogs = useCallback(
    async (page: number, search: string = '') => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          page_size: '100',
          ...(search && { search }),
        });

        const response = await apiClient.fetchWithAuth(
          `${process.env.NEXT_PUBLIC_API_URL}/activity-logs/?${params}`
        );

        if (!response.ok) throw new Error('Failed to fetch logs');

        const data: PaginatedResponse = await response.json();

        if (page === 1) {
          setAllLogs(data.results);
        } else {
          setAllLogs(prev => [...prev, ...data.results]);
        }

        setHasMore(data.next !== null);
        setNextPage(page + 1);
      } catch (error) {
        console.error('Error fetching logs:', error);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Initial load
  useEffect(() => {
    fetchLogs(1, searchQuery);
  }, [searchQuery, fetchLogs]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          fetchLogs(nextPage, searchQuery);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoading, nextPage, searchQuery, fetchLogs]);

  // Group logs by user and get latest activity per user (excluding login/logout)
  const userSummaries = useMemo(() => {
    const userMap = new Map<number, UserActivitySummary>();

    allLogs.forEach(log => {
      // Skip login and logout activities
      if (log.activity_type === 'login' || log.activity_type === 'logout') {
        return;
      }

      if (!userMap.has(log.user.id)) {
        userMap.set(log.user.id, {
          user_id: log.user.id,
          user: log.user,
          latest_activity: log,
          activity_count: 1,
        });
      } else {
        const summary = userMap.get(log.user.id)!;
        summary.activity_count += 1;
      }
    });

    return Array.from(userMap.values());
  }, [allLogs]);

  const handleUserClick = (userSummary: UserActivitySummary) => {
    setSelectedUser(userSummary);
    setShowModal(true);
  };

  const getActivityTypeColor = (type: string) => {
    switch (type) {
      case 'login':
        return 'bg-blue-100 text-blue-700';
      case 'logout':
        return 'bg-gray-100 text-gray-700';
      case 'registration':
        return 'bg-green-100 text-green-700';
      case 'error':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
  };

  return (
    <div>
      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setNextPage(1);
            }}
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Users Activity Summary */}
      <div className="space-y-3">
        {userSummaries.map(summary => (
          <button
            key={summary.user_id}
            onClick={() => handleUserClick(summary)}
            className="w-full text-left p-4 bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {summary.user.first_name} {summary.user.last_name}
                    </p>
                    <p className="text-sm text-gray-600">{summary.user.email}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-700 mb-2">{summary.latest_activity.description}</p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(summary.latest_activity.timestamp), { addSuffix: true })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {summary.activity_count} activities
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${getActivityTypeColor(
                    summary.latest_activity.activity_type
                  )}`}
                >
                  {summary.latest_activity.activity_type}
                </span>
                <ChevronDown size={18} className="text-gray-400" />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* No Results */}
      {!isLoading && userSummaries.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No activity logs found</p>
        </div>
      )}

      {/* Infinite Scroll Trigger */}
      <div ref={observerTarget} className="py-8" />

      {/* User Activity History Modal */}
      {selectedUser && (
        <UserActivityHistoryModal
          user={selectedUser.user}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

