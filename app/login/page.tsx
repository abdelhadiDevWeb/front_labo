"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FlaskConical, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, LogOut, Home, Clock, XCircle, AlertTriangle } from "lucide-react";
import { loginClient, logoutClient } from "@/lib/api";
import { validateOnboardingRedirect } from "@/lib/security";
import { performLogout } from "@/lib/perform-logout";

const LOGIN_MAX_ATTEMPTS = 4;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [showWaitingAlert, setShowWaitingAlert] = useState(false);
  const [showSubscriptionExpiredAlert, setShowSubscriptionExpiredAlert] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const isLocked = failedAttempts >= LOGIN_MAX_ATTEMPTS;

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showWaitingAlert || showSubscriptionExpiredAlert) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showWaitingAlert, showSubscriptionExpiredAlert]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setWarning(null);
    setSuccess(null);

    if (isLocked) {
      setError("Trop de tentatives de connexion. Réessayez dans 15 minutes.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await loginClient({
        email: formData.email,
        password: formData.password,
      });

      if (result.success) {
        setFailedAttempts(0);
        const userRole = result.data?.role || "client";
        const safeRedirect = validateOnboardingRedirect(result.data?.redirectTo);

        setSuccess("Connexion réussie ! Redirection...");
        setTimeout(() => {
          if (safeRedirect && result.data?.onboardingStep) {
            router.push(safeRedirect);
            return;
          }

          if (userRole === "admin" || userRole === "sou-admin") {
            router.push("/dashboard");
          } else if (userRole === "supplier") {
            router.push("/dashboard-supplier");
          } else {
            router.push("/home");
          }
        }, 1000);
      } else {
        if (result.message === "account_not_activated") {
          await logoutClient();
          setShowWaitingAlert(true);
        } else if (result.message === "subscription_expired" || result.message === "no_subscription") {
          // Fallback: send to choose-plan based on role from error payload if present
          const role = result.data?.role;
          const renewPath =
            role === "supplier"
              ? "/supplier/choose-subscription"
              : "/client/choose-subscription";
          setSuccess("Abonnement expiré — redirection vers le choix du plan...");
          setTimeout(() => {
            router.push(renewPath);
          }, 800);
        } else {
          const nextAttempts = failedAttempts + 1;
          setFailedAttempts(nextAttempts);

          const isRateLimited =
            nextAttempts >= LOGIN_MAX_ATTEMPTS ||
            /trop de tentatives|too many|rate limit|429/i.test(result.message || "");

          if (isRateLimited) {
            setFailedAttempts(LOGIN_MAX_ATTEMPTS);
            setWarning(null);
            setError(
              result.message?.includes("Trop de tentatives")
                ? result.message
                : "Trop de tentatives de connexion. Réessayez dans 15 minutes."
            );
          } else if (nextAttempts === 3) {
            setError(result.message || "Email ou mot de passe incorrect");
            setWarning(
              "Attention : il ne vous reste plus qu'une tentative avant un blocage temporaire (15 min)."
            );
          } else {
            setError(result.message || "Email ou mot de passe incorrect");
          }
        }
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
            Connexion
          </h2>
          <p className="text-gray-600">
            Connectez-vous à votre compte MarketLab
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-gray-200 hover-lift">
          {/* Orange warning on 3rd failed attempt */}
          {warning && (
            <div className="mb-6 p-4 bg-orange-50 border border-orange-300 rounded-xl flex items-start gap-3 animate-fade-in">
              <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-orange-800">Avertissement</p>
                <p className="text-sm text-orange-700 mt-0.5">{warning}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3 animate-fade-in">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Adresse email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={isLocked || isLoading}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="votre@email.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  disabled={isLocked || isLoading}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLocked}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Se souvenir de moi
                </label>
              </div>
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                Mot de passe oublié ?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || isLocked}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform hover:scale-105 hover-lift hover-glow disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading
                ? "Connexion en cours..."
                : isLocked
                  ? "Connexion bloquée temporairement"
                  : "Se connecter"}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Ou</span>
              </div>
            </div>
          </div>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Vous n'avez pas de compte ?{" "}
              <Link
                href="/register"
                className="font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                Créer un compte
              </Link>
            </p>
          </div>
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

      {/* Waiting Alert Modal */}
      {showWaitingAlert && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity animate-fade-in"
            onClick={() => setShowWaitingAlert(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-fade-in-up border border-gray-200">
              {/* Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-yellow-100 rounded-xl">
                    <Clock className="w-8 h-8 text-yellow-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">En attente de confirmation</h3>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-gray-700 mb-2 leading-relaxed">
                  Votre compte a été créé avec succès.
                </p>
                <p className="text-gray-700 mb-6 leading-relaxed">
                  Vous devez attendre que <strong>l&apos;administrateur confirme votre compte et votre abonnement</strong> avant de pouvoir accéder à votre tableau de bord.
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  Vous recevrez une notification une fois que votre compte sera approuvé.
                </p>

                {/* Actions */}
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      void performLogout(router, { redirectTo: "/home" });
                      setShowWaitingAlert(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                  >
                    <Home className="w-5 h-5" />
                    <span>Retour à l'accueil</span>
                  </button>
                  <button
                    onClick={() => {
                      void performLogout(router);
                      setShowWaitingAlert(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Se déconnecter</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Subscription Expired Alert Modal */}
      {showSubscriptionExpiredAlert && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] transition-opacity animate-fade-in"
            onClick={() => setShowSubscriptionExpiredAlert(false)}
          />
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-fade-in-up border border-gray-200">
              {/* Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-red-100 rounded-xl">
                    <XCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Abonnement expiré</h3>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-gray-700 mb-2 leading-relaxed">
                  Votre abonnement est expiré.
                </p>
                <p className="text-gray-700 mb-6 leading-relaxed">
                  Vous devez <strong>contacter le support</strong> pour renouveler votre abonnement et continuer à utiliser la plateforme.
                </p>

                {/* Actions */}
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      void performLogout(router, { redirectTo: "/home" });
                      setShowWaitingAlert(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                  >
                    <Home className="w-5 h-5" />
                    <span>Retour à l'accueil</span>
                  </button>
                  <button
                    onClick={() => {
                      void performLogout(router);
                      setShowSubscriptionExpiredAlert(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Fermer</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

