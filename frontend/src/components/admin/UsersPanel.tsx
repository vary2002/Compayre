'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { UserCard } from './UserCard';
import { UserDetailsModal } from './UserDetailsModal';

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

interface PaginatedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: User[];
}

export function UsersPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextPage, setNextPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string>('');
  const observerTarget = useRef<HTMLDivElement>(null);

  const fetchUsers = useCallback(
    async (page: number, search: string = '') => {
      setIsLoading(true);
      setError('');
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
        const params = new URLSearchParams({
          page: page.toString(),
          page_size: '20',
          ...(search && { search }),
        });

        const response = await apiClient.fetchWithAuth(
          `${apiUrl}/users/?${params}`
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`API Error ${response.status}: ${JSON.stringify(errorData)}`);
        }

        const data: PaginatedResponse = await response.json();
        
        if (page === 1) {
          setUsers(data.results);
        } else {
          setUsers(prev => [...prev, ...data.results]);
        }

        setHasMore(data.next !== null);
        setNextPage(page + 1);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch users';
        console.error('Error fetching users:', error);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Initial load
  useEffect(() => {
    fetchUsers(1, searchQuery);
  }, [searchQuery, fetchUsers]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          fetchUsers(nextPage, searchQuery);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoading, nextPage, searchQuery, fetchUsers]);

  const handleUserClick = (user: User) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  return (
    <div>
      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search users by name, email, or company..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setNextPage(1);
            }}
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm font-medium">Error loading users:</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <p className="text-red-600 text-xs mt-2">
            Make sure the backend server is running at {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}
          </p>
        </div>
      )}

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map(user => (
          <UserCard
            key={user.id}
            user={user}
            onClick={() => handleUserClick(user)}
          />
        ))}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* No Results */}
      {!isLoading && users.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No users found</p>
        </div>
      )}

      {/* Infinite Scroll Trigger */}
      <div ref={observerTarget} className="py-8" />

      {/* User Details Modal */}
      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSubscriptionUpdate={() => {
            fetchUsers(1, searchQuery);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}
