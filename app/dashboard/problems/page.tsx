"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { MessageCircle, Search, Mail, Phone, Clock, CheckCircle, XCircle, Loader2, AlertCircle, Eye, X } from "lucide-react";
import { getAllProblems, markProblemAsRead, Problem, getSessionRole } from "@/lib/api";
import { isSouAdminRole } from "@/lib/admin-access";

export default function ProblemsPage() {
  const router = useRouter();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    setMounted(true);
    void getSessionRole().then((session) => {
      if (isSouAdminRole(session?.role)) {
        router.replace("/dashboard");
        return;
      }
      setAllowed(true);
    });
  }, [router]);

  useEffect(() => {
    if (!allowed) return;
    const loadProblems = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getAllProblems();

        if (result.success && result.data) {
          // Filter by search query if provided
          let filteredProblems = result.data;
          if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filteredProblems = result.data.filter(
              (problem) =>
                problem.email.toLowerCase().includes(query) ||
                problem.phone.toLowerCase().includes(query) ||
                problem.message.toLowerCase().includes(query)
            );
          }
          // Sort by creation date (newest first)
          filteredProblems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setProblems(filteredProblems);
        } else {
          setError(result.message || "Erreur lors du chargement des problèmes");
        }
      } catch (err) {
        console.error("Load problems error:", err);
        setError("Une erreur est survenue lors du chargement des données");
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce search
    const timeoutId = setTimeout(() => {
      loadProblems();
    }, searchQuery ? 500 : 0);

    return () => clearTimeout(timeoutId);
  }, [allowed, searchQuery]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const handleProblemClick = async (problem: Problem) => {
    setSelectedProblem(problem);
    setShowModal(true);

    // Mark as read if not already read
    if (!problem.is_read) {
      await handleMarkAsRead(problem._id);
    }
  };

  const handleMarkAsRead = async (problemId: string) => {
    if (markingAsRead === problemId) return;

    setMarkingAsRead(problemId);
    try {
      const result = await markProblemAsRead(problemId);

      if (result.success) {
        // Update the problem in the list
        setProblems((prev) =>
          prev.map((p) => (p._id === problemId ? { ...p, is_read: true } : p))
        );
        // Update selected problem if it's the same
        if (selectedProblem && selectedProblem._id === problemId) {
          setSelectedProblem({ ...selectedProblem, is_read: true });
        }
      } else {
        console.error("Failed to mark problem as read:", result.message);
      }
    } catch (err) {
      console.error("Mark as read error:", err);
    } finally {
      setMarkingAsRead(null);
    }
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showModal]);

  const unreadCount = problems.filter((p) => !p.is_read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Problèmes</h1>
          <p className="text-gray-600 mt-1">Gérer les messages de support des utilisateurs</p>
        </div>
        {unreadCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-lg">
            <AlertCircle className="w-5 h-5" />
            <span className="font-semibold">{unreadCount} non lu{unreadCount > 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher par email, téléphone ou message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          />
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Problems List */}
      {!isLoading && !error && (
        <>
          {problems.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg font-medium">Aucun problème trouvé</p>
              <p className="text-gray-500 mt-2">
                {searchQuery ? "Essayez de modifier votre recherche" : "Aucun message de support pour le moment"}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Téléphone
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Message
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {problems.map((problem) => (
                      <tr
                        key={problem._id}
                        className={`hover:bg-gray-50 transition-colors ${
                          !problem.is_read ? "bg-blue-50" : ""
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">{problem.email}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">{problem.phone}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-900 line-clamp-2 max-w-md">
                            {problem.message}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-600">{formatDate(problem.createdAt)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {problem.is_read ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="w-4 h-4" />
                              Lu
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <AlertCircle className="w-4 h-4" />
                              Non lu
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleProblemClick(problem)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            <span>Voir</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Problem Details Modal */}
      {mounted && showModal && selectedProblem && createPortal(
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity animate-fade-in"
            onClick={() => setShowModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all animate-fade-in-up border border-gray-200">
              {/* Header */}
              <div className="p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className="p-1.5 sm:p-2 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg sm:rounded-xl flex-shrink-0">
                      <MessageCircle className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Détails du problème</h3>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 ml-2"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Status */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                  <span className="text-xs sm:text-sm font-medium text-gray-700">Statut:</span>
                  {selectedProblem.is_read ? (
                    <span className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                      Lu
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                      Non lu
                    </span>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Email</label>
                  <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-gray-50 rounded-lg">
                    <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-gray-900 break-words">{selectedProblem.email}</span>
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Téléphone</label>
                  <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-gray-50 rounded-lg">
                    <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-gray-900 break-words">{selectedProblem.phone}</span>
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Message</label>
                  <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs sm:text-sm text-gray-900 whitespace-pre-wrap break-words">{selectedProblem.message}</p>
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Date</label>
                  <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-gray-50 rounded-lg">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-gray-900">{formatDate(selectedProblem.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
