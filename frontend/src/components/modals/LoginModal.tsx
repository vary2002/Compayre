"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface LoginModalProps {
  onSwitchToSignup: () => void;
  onClose?: () => void;
}

export function LoginModal({ onSwitchToSignup, onClose }: LoginModalProps) {
  const { login, isLoading } = useAuth();
  const [formData, setFormData] = useState({ username: "", password: "", rememberMe: false });
  const [errors, setErrors] = useState<{ username?: string; password?: string; general?: string }>({});

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!formData.username.trim()) {
      newErrors.username = "Email is required";
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error for this field when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await login({
        username: formData.username,
        password: formData.password,
      });
      
      // Remember me functionality
      if (formData.rememberMe) {
        localStorage.setItem('rememberUsername', formData.username);
      } else {
        localStorage.removeItem('rememberUsername');
      }
      
      onClose?.();
    } catch (error: any) {
      setErrors({ general: error.message || "Login failed. Please try again." });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
        <p className="mt-2 text-sm text-gray-600">Sign in to your account to continue</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* General Error */}
        {errors.general && (
          <div className="rounded-lg bg-red-50 p-3 border border-red-200">
            <p className="text-xs text-red-600">{errors.general}</p>
          </div>
        )}

        {/* Email Field */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="username"
            name="username"
            type="email"
            placeholder="your@email.com"
            value={formData.username}
            onChange={handleChange}
            disabled={isLoading}
            className={`mt-1 w-full rounded-lg border px-4 py-2 text-sm outline-none transition-colors disabled:bg-gray-100 ${
              errors.username
                ? "border-red-500 bg-red-50 focus:ring-2 focus:ring-red-200"
                : "border-gray-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            }`}
          />
          {errors.username && <p className="mt-1 text-xs text-red-600">{errors.username}</p>}
        </div>

        {/* Password Field */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            disabled={isLoading}
            className={`mt-1 w-full rounded-lg border px-4 py-2 text-sm outline-none transition-colors disabled:bg-gray-100 ${
              errors.password
                ? "border-red-500 bg-red-50 focus:ring-2 focus:ring-red-200"
                : "border-gray-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            }`}
          />
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
        </div>

        {/* Remember Me Checkbox */}
        <div className="flex items-center">
          <input
            id="rememberMe"
            name="rememberMe"
            type="checkbox"
            checked={formData.rememberMe}
            onChange={handleChange}
            disabled={isLoading}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-700">
            Remember me
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isLoading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      {/* Switch to Signup */}
      <div className="text-center">
        <p className="text-sm text-gray-600">
          Don't have an account?{" "}
          <button
            onClick={onSwitchToSignup}
            disabled={isLoading}
            className="font-medium text-blue-600 hover:text-blue-700 disabled:text-gray-400"
            type="button"
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}
