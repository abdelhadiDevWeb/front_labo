"use client";

import { User, LogOut, UserCircle, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { removeAuthToken, getAuthToken } from "@/lib/api";

interface UserDropdownProps {
  userEmail?: string;
}

export default function UserDropdown({ userEmail }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    removeAuthToken();
    setIsOpen(false);
    // Clear cart on logout
    if (typeof window !== "undefined") {
      localStorage.removeItem("cart");
    }
    // Force full page reload to clear all state
    window.location.href = "/home";
  };

  const handleProfile = () => {
    setIsOpen(false);
    router.push("/profile");
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 rounded-xl hover:bg-gray-100 transition-colors group"
      >
        <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
          <User className="w-5 h-5 text-white" />
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-600 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-fade-in-up z-50">
          {/* User Info */}
          {userEmail && (
            <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-cyan-50">
              <p className="text-sm font-medium text-gray-900">Connecté en tant que</p>
              <p className="text-sm text-gray-600 truncate">{userEmail}</p>
            </div>
          )}

          {/* Menu Items */}
          <div className="py-2">
            <button
              onClick={handleProfile}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors group"
            >
              <UserCircle className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">
                Mon profil
              </span>
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-red-50 transition-colors group"
            >
              <LogOut className="w-5 h-5 text-gray-600 group-hover:text-red-600 transition-colors" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-red-600">
                Déconnexion
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

