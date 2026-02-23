'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Users, Activity } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { UsersPanel } from '@/components/admin/UsersPanel';
import { LogsPanel } from '@/components/admin/LogsPanel';

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'logs'>('users');

  // Redirect if not authenticated or not admin
  if (!isLoading && (!user || user.subscription_type !== 'admin')) {
    redirect('/');
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      {/* Admin Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container-max py-6">
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-600 mt-2">Manage users and view activity logs</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container-max">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'users'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users size={18} />
                Users
              </div>
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'logs'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Activity size={18} />
                Activity Logs
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="container-max py-8">
        {activeTab === 'users' && <UsersPanel />}
        {activeTab === 'logs' && <LogsPanel />}
      </div>
    </div>
  );
}
