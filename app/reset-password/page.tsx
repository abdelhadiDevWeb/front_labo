"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FlaskConical, Lock, ArrowLeft, CheckCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { resetPassword } from "@/lib/api";

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Get reset token from sessionStorage
    if (typeof window !== "undefined") {
      const token = sessionStorage.getItem("resetToken");
      if (!token) {
        router.push("/forgot-password");
        return;
      }
      setResetToken(token);
    }
  }, [router]);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return "Le mot de passe doit contenir au moins 8 caractères";
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return "Le mot de passe doit contenir au moins une lettre minuscule";
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return "Le mot de passe doit contenir au moins une lettre majuscule";
    }
    if (!/(?=.*\d)/.test(password)) {
      return "Le mot de passe doit contenir au moins un chiffre";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    if (!resetToken) {
      setError("Token de réinitialisation manquant. Veuillez recommencer.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await resetPassword(resetToken, newPassword);
      if (result.success) {
        setIsSuccess(true);
        // Clear session storage
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("resetToken");
          sessionStorage.removeItem("resetPasswordEmail");
        }
        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        setError(result.message || "Erreur lors de la réinitialisation du mot de passe");
      }
    } catch (err) {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      <div className="max-w-md w-full space-y-8 relative z-10 animate-fade-in-up">
        {/* Logo and Header */}
        <div className="text-center">
          <Link href="/home" className="inline-block mb-6 group">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center shadow-2xl transform transition-transform group-hover:scale-110 group-hover:rotate-6 mx-auto">
              <FlaskConical className="w-10 h-10 text-white" />
            </div>
          </Link>
          <h2 className="text-4xl font-bold text-gray-900 mb-2">
            Nouveau mot de passe
          </h2>
          <p className="text-gray-600">
            {isSuccess
              ? "Mot de passe réinitialisé avec succès !"
              : "Choisissez un nouveau mot de passe sécurisé"}
          </p>
        </div>

        {/* Form or Success Message */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-gray-200 hover-lift">
          {isSuccess ? (
            <div className="text-center space-y-6 animate-scale-in">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Mot de passe réinitialisé !
                </h3>
                <p className="text-gray-600 mb-4">
                  Votre mot de passe a été modifié avec succès.
                </p>
                <p className="text-sm text-gray-500">
                  Redirection vers la page de connexion...
                </p>
              </div>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* New Password Field */}
              <div className="space-y-2">
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                    placeholder="Entrez votre nouveau mot de passe"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Au moins 8 caractères, avec majuscule, minuscule et chiffre
                </p>
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                    placeholder="Confirmez votre nouveau mot de passe"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform hover:scale-105 hover-lift hover-glow disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Réinitialisation...
                  </>
                ) : (
                  "Réinitialiser le mot de passe"
                )}
              </button>
            </form>
          )}

          {/* Back to Login */}
          {!isSuccess && (
            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour à la connexion
              </Link>
            </div>
          )}
        </div>

        {/* Back to Home */}
        <div className="text-center">
          <Link
            href="/home"
            className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
          >
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
