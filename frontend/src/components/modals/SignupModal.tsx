"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface SignupModalProps {
  onSwitchToLogin: () => void;
}

export function SignupModal({ onSwitchToLogin }: SignupModalProps) {
  const { register, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    company_name: "",
    designation: "",
    password: "",
    password_confirm: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Validation helpers
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone.replace(/\D/g, ""));
  };

  const validatePassword = (password: string): boolean => {
    // At least 8 characters with at least one letter and one digit (special chars allowed)
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
  };

  const validateNoNumeric = (text: string): boolean => {
    // Check that field contains no digits
    return !/\d/.test(text);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // First Name validation
    if (!formData.first_name.trim()) {
      newErrors.first_name = "First name is required";
    } else if (!validateNoNumeric(formData.first_name)) {
      newErrors.first_name = "First name cannot contain numbers";
    }

    // Last Name validation
    if (!formData.last_name.trim()) {
      newErrors.last_name = "Last name is required";
    } else if (!validateNoNumeric(formData.last_name)) {
      newErrors.last_name = "Last name cannot contain numbers";
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    // Phone validation
    if (!formData.phone_number.trim()) {
      newErrors.phone_number = "Phone number is required";
    } else if (!validatePhone(formData.phone_number)) {
      newErrors.phone_number = "Phone number must be 10 digits";
    }

    // Company Name validation
    if (!formData.company_name.trim()) {
      newErrors.company_name = "Company name is required";
    } else if (!validateNoNumeric(formData.company_name)) {
      newErrors.company_name = "Company name cannot contain numbers";
    }

    // Designation validation
    if (!formData.designation.trim()) {
      newErrors.designation = "Designation is required";
    } else if (!validateNoNumeric(formData.designation)) {
      newErrors.designation = "Designation cannot contain numbers";
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (!validatePassword(formData.password)) {
      newErrors.password = "Password must be at least 8 characters with letters and numbers";
    }

    // Confirm Password validation
    if (!formData.password_confirm) {
      newErrors.password_confirm = "Please confirm your password";
    } else if (formData.password !== formData.password_confirm) {
      newErrors.password_confirm = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
    if (generalError) {
      setGeneralError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setGeneralError("");
      await register({
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone_number: formData.phone_number,
        company_name: formData.company_name,
        designation: formData.designation,
        password: formData.password,
        password_confirm: formData.password_confirm,
      });

      setSuccessMessage("Account created successfully! Please sign in with your credentials.");
      // Reset form
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        phone_number: "",
        company_name: "",
        designation: "",
        password: "",
        password_confirm: "",
      });

      // Switch to login after 2 seconds
      setTimeout(() => {
        onSwitchToLogin();
      }, 2000);
    } catch (error: any) {
      console.error('Signup error:', error);
      console.error('Error keys:', Object.keys(error || {}));
      console.error('Full error object:', JSON.stringify(error, null, 2));
      
      if (typeof error === 'object' && error !== null) {
        // Handle field-specific errors
        const fieldErrors: Record<string, string> = {};
        let hasFieldErrors = false;

        for (const [key, value] of Object.entries(error)) {
          if (Array.isArray(value)) {
            fieldErrors[key] = value[0];
            hasFieldErrors = true;
          }
        }

        if (hasFieldErrors) {
          setErrors(fieldErrors);
          // Also show a helpful general message
          if (fieldErrors.email) {
            setGeneralError("❌ Email already in use. Please try a different email address.");
          } else if (fieldErrors.phone_number) {
            setGeneralError("❌ Phone number already in use. Please try a different number or leave it blank.");
          }
        } else {
          const errorMessage = JSON.stringify(error);
          console.error('Setting general error:', errorMessage);
          setGeneralError(errorMessage || "Registration failed. Please try again.");
        }
      } else {
        setGeneralError(error?.message || "Registration failed. Please try again.");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
        <p className="mt-2 text-sm text-gray-600">Join us to get started</p>
      </div>

      {successMessage && (
        <div className="rounded-lg bg-green-50 p-3 border border-green-200">
          <p className="text-xs text-green-600">{successMessage}</p>
        </div>
      )}

      {generalError && (
        <div className="rounded-lg bg-red-50 p-3 border border-red-200">
          <p className="text-xs text-red-600">{generalError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {/* First Name */}
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
              First Name
            </label>
            <input
              id="first_name"
              name="first_name"
              type="text"
              placeholder="John"
              value={formData.first_name}
              onChange={handleChange}
              disabled={isLoading}
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors disabled:bg-gray-100 ${
                errors.first_name
                  ? "border-red-500 bg-red-50 focus:ring-2 focus:ring-red-200"
                  : "border-gray-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              }`}
            />
            {errors.first_name && <p className="mt-0.5 text-xs text-red-600">{errors.first_name}</p>}
          </div>

          {/* Last Name */}
          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
              Last Name
            </label>
            <input
              id="last_name"
              name="last_name"
              type="text"
              placeholder="Doe"
              value={formData.last_name}
              onChange={handleChange}
              disabled={isLoading}
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors disabled:bg-gray-100 ${
                errors.last_name
                  ? "border-red-500 bg-red-50 focus:ring-2 focus:ring-red-200"
                  : "border-gray-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              }`}
            />
            {errors.last_name && <p className="mt-0.5 text-xs text-red-600">{errors.last_name}</p>}
          </div>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            disabled={isLoading}
            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors disabled:bg-gray-100 ${
              errors.email
                ? "border-red-500 bg-red-50 focus:ring-2 focus:ring-red-200"
                : "border-gray-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            }`}
          />
          {errors.email && <p className="mt-0.5 text-xs text-red-600">{errors.email}</p>}
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700">
            Phone Number
          </label>
          <input
            id="phone_number"
            name="phone_number"
            type="tel"
            placeholder="9876543210"
            value={formData.phone_number}
            onChange={handleChange}
            disabled={isLoading}
            maxLength={10}
            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors disabled:bg-gray-100 ${
              errors.phone_number
                ? "border-red-500 bg-red-50 focus:ring-2 focus:ring-red-200"
                : "border-gray-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            }`}
          />
          {errors.phone_number && <p className="mt-0.5 text-xs text-red-600">{errors.phone_number}</p>}
        </div>

        {/* Company Name */}
        <div>
          <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">
            Company Name
          </label>
          <input
            id="company_name"
            name="company_name"
            type="text"
            placeholder="Your Company"
            value={formData.company_name}
            onChange={handleChange}
            disabled={isLoading}
            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors disabled:bg-gray-100 ${
              errors.company_name
                ? "border-red-500 bg-red-50 focus:ring-2 focus:ring-red-200"
                : "border-gray-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            }`}
          />
          {errors.company_name && <p className="mt-0.5 text-xs text-red-600">{errors.company_name}</p>}
        </div>

        {/* Designation */}
        <div>
          <label htmlFor="designation" className="block text-sm font-medium text-gray-700">
            Designation
          </label>
          <input
            id="designation"
            name="designation"
            type="text"
            placeholder="Chief Executive Officer"
            value={formData.designation}
            onChange={handleChange}
            disabled={isLoading}
            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors disabled:bg-gray-100 ${
              errors.designation
                ? "border-red-500 bg-red-50 focus:ring-2 focus:ring-red-200"
                : "border-gray-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            }`}
          />
          {errors.designation && <p className="mt-0.5 text-xs text-red-600">{errors.designation}</p>}
        </div>

        {/* Password */}
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
            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors disabled:bg-gray-100 ${
              errors.password
                ? "border-red-500 bg-red-50 focus:ring-2 focus:ring-red-200"
                : "border-gray-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            }`}
          />
          {errors.password && <p className="mt-0.5 text-xs text-red-600">{errors.password}</p>}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="password_confirm" className="block text-sm font-medium text-gray-700">
            Confirm Password
          </label>
          <input
            id="password_confirm"
            name="password_confirm"
            type="password"
            placeholder="••••••••"
            value={formData.password_confirm}
            onChange={handleChange}
            disabled={isLoading}
            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors disabled:bg-gray-100 ${
              errors.password_confirm
                ? "border-red-500 bg-red-50 focus:ring-2 focus:ring-red-200"
                : "border-gray-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            }`}
          />
          {errors.password_confirm && <p className="mt-0.5 text-xs text-red-600">{errors.password_confirm}</p>}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isLoading ? "Creating Account..." : "Sign Up"}
        </button>
      </form>

      {/* Switch to Login */}
      <div className="text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{" "}
          <button
            onClick={onSwitchToLogin}
            disabled={isLoading}
            className="font-medium text-blue-600 hover:text-blue-700 disabled:text-gray-400"
            type="button"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
