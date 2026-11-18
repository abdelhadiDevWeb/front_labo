"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FlaskConical,
  ArrowLeft,
  CheckCircle,
  Loader2,
  X,
  Mail,
} from "lucide-react";
import {
  getProfile,
  resendEmailCode,
  verifyEmailCode,
  checkAuthSession,
} from "@/lib/api";
import { validateOnboardingRedirect } from "@/lib/security";
import { performLogout } from "@/lib/perform-logout";
import RegistrationStepper from "@/components/RegistrationStepper";

export default function ConfirmEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <ConfirmEmailContent />
    </Suspense>
  );
}

function ConfirmEmailContent() {
  const router = useRouter();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<"client" | "supplier">("client");

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      const ok = await checkAuthSession();
      if (!ok) {
        router.replace("/login?next=/confirm-email");
        return;
      }
      const profile = await getProfile();
      if (!profile.success || !profile.data) {
        router.replace("/login?next=/confirm-email");
        return;
      }
      if (profile.data.email_confirme !== false) {
        const role = profile.data.role;
        const fallback =
          role === "supplier"
            ? "/supplier/upload-documents"
            : "/client/upload-documents?fresh=1";
        router.replace(fallback);
        return;
      }
      if (!cancelled) {
        setEmail(profile.data.email || "");
        setRole(profile.data.role === "supplier" ? "supplier" : "client");
        setReady(true);
      }
    };
    void boot();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.slice(0, 6).split("");
      const newCode = [...code];
      digits.forEach((digit, i) => {
        if (index + i < 6 && /^\d$/.test(digit)) {
          newCode[index + i] = digit;
        }
      });
      setCode(newCode);
      const nextIndex = Math.min(index + digits.length, 5);
      const nextInput = document.getElementById(`email-code-${nextIndex}`);
      if (nextInput) (nextInput as HTMLInputElement).focus();
    } else if (/^\d$/.test(value) || value === "") {
      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);
      if (value && index < 5) {
        const nextInput = document.getElementById(`email-code-${index + 1}`);
        if (nextInput) (nextInput as HTMLInputElement).focus();
      }
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      const prevInput = document.getElementById(`email-code-${index - 1}`);
      if (prevInput) (prevInput as HTMLInputElement).focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      setError("Veuillez entrer le code complet de 6 chiffres");
      return;
    }
    setIsLoading(true);
    setError(null);
    setInfo(null);
    try {
      const result = await verifyEmailCode(fullCode);
      if (result.success) {
        setIsVerified(true);
        const redirect =
          validateOnboardingRedirect(result.data?.redirectTo) ||
          (result.data?.role === "supplier"
            ? "/supplier/upload-documents"
            : "/client/upload-documents?fresh=1");
        setTimeout(() => {
          window.location.assign(redirect);
        }, 800);
      } else {
        setError(result.message || "Code invalide ou expiré");
        setCode(["", "", "", "", "", ""]);
        const firstInput = document.getElementById("email-code-0");
        if (firstInput) (firstInput as HTMLInputElement).focus();
      }
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (isResending) return;
    setIsResending(true);
    setError(null);
    setInfo(null);
    try {
      const result = await resendEmailCode();
      if (result.success) {
        setInfo("Un nouveau code a été envoyé à votre adresse email.");
      } else {
        setError(result.message || "Impossible de renvoyer le code");
      }
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsResending(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 relative z-10 animate-fade-in-up">
        <div className="text-center">
          <Link href="/home" className="inline-block mb-6 group">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center shadow-2xl mx-auto group-hover:scale-110 transition-transform">
              <FlaskConical className="w-10 h-10 text-white" />
            </div>
          </Link>
          <RegistrationStepper role={role} current={2} className="mb-6 max-w-lg mx-auto" />
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Confirmez votre email
          </h2>
          <p className="text-gray-600">
            {isVerified
              ? "Email confirmé avec succès !"
              : "Entrez le code à 6 chiffres envoyé à votre adresse email"}
          </p>
          {email && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-gray-500">
              <Mail className="h-4 w-4" />
              {email}
            </p>
          )}
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-gray-200">
          {isVerified ? (
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <p className="font-semibold text-gray-900">Email confirmé !</p>
              <p className="text-sm text-gray-600">
                Redirection vers le dépôt de documents…
              </p>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={(e) => void handleSubmit(e)}>
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700 text-center">
                  Code de confirmation
                </label>
                <div className="flex justify-center gap-2 sm:gap-3">
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      id={`email-code-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="h-12 w-11 sm:h-14 sm:w-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="0"
                      autoComplete="one-time-code"
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Le code est valide pendant 10 minutes
                </p>
              </div>

              {error && (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-sm text-red-600">{error}</p>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="text-red-600"
                    aria-label="Fermer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {info && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  {info}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || code.join("").length !== 6}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Vérification…
                  </>
                ) : (
                  "Confirmer"
                )}
              </button>

              <button
                type="button"
                onClick={() => void handleResend()}
                disabled={isResending}
                className="w-full flex justify-center items-center gap-2 py-2.5 text-sm font-medium text-blue-700 hover:text-blue-800 disabled:opacity-50"
              >
                {isResending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Envoi…
                  </>
                ) : (
                  "Renvoyer le code par email"
                )}
              </button>
            </form>
          )}

          {!isVerified && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() =>
                  void performLogout(router, {
                    clearCart: true,
                    redirectTo: "/login",
                  })
                }
                className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-blue-600"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
