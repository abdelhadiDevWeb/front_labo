"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FlaskConical, Mail, ArrowLeft, CheckCircle, Loader2, X } from "lucide-react";
import { verifyPasswordResetCode } from "@/lib/api";

export default function VerifyResetCodePage() {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Get email from sessionStorage
    if (typeof window !== "undefined") {
      const storedEmail = sessionStorage.getItem("resetPasswordEmail");
      if (!storedEmail) {
        router.push("/forgot-password");
        return;
      }
      setEmail(storedEmail);
    }
  }, [router]);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      // If pasting multiple digits
      const digits = value.slice(0, 6).split("");
      const newCode = [...code];
      digits.forEach((digit, i) => {
        if (index + i < 6 && /^\d$/.test(digit)) {
          newCode[index + i] = digit;
        }
      });
      setCode(newCode);
      // Focus on last input
      const nextIndex = Math.min(index + digits.length, 5);
      const nextInput = document.getElementById(`code-${nextIndex}`);
      if (nextInput) {
        (nextInput as HTMLInputElement).focus();
      }
    } else if (/^\d$/.test(value) || value === "") {
      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);

      // Auto-focus next input
      if (value && index < 5) {
        const nextInput = document.getElementById(`code-${index + 1}`);
        if (nextInput) {
          (nextInput as HTMLInputElement).focus();
        }
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      if (prevInput) {
        (prevInput as HTMLInputElement).focus();
      }
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

    try {
      const result = await verifyPasswordResetCode(email, fullCode);
      if (result.success && result.data) {
        setIsVerified(true);
        // Store reset token for next step
        if (typeof window !== "undefined") {
          sessionStorage.setItem("resetToken", result.data.resetToken);
        }
        // Redirect to reset password page after 1 second
        setTimeout(() => {
          router.push("/reset-password");
        }, 1000);
      } else {
        setError(result.message || "Code invalide ou expiré");
        // Clear code on error
        setCode(["", "", "", "", "", ""]);
        const firstInput = document.getElementById("code-0");
        if (firstInput) {
          (firstInput as HTMLInputElement).focus();
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
            Vérification du code
          </h2>
          <p className="text-gray-600">
            {isVerified
              ? "Code vérifié avec succès !"
              : "Entrez le code de 6 chiffres envoyé à votre email"}
          </p>
          {email && (
            <p className="text-sm text-gray-500 mt-2">
              {email}
            </p>
          )}
        </div>

        {/* Form or Success Message */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-gray-200 hover-lift">
          {isVerified ? (
            <div className="text-center space-y-6 animate-scale-in">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Code vérifié !
                </h3>
                <p className="text-gray-600">
                  Redirection vers la page de réinitialisation...
                </p>
              </div>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Code Input Fields */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700 text-center">
                  Code de vérification
                </label>
                <div className="flex justify-center gap-3">
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      id={`code-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                      placeholder="0"
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Le code est valide pendant 10 minutes
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
                  <p className="text-sm text-red-600">{error}</p>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || code.join("").length !== 6}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform hover:scale-105 hover-lift hover-glow disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Vérification...
                  </>
                ) : (
                  "Vérifier le code"
                )}
              </button>
            </form>
          )}

          {/* Back to Forgot Password */}
          {!isVerified && (
            <div className="mt-6 text-center">
              <Link
                href="/forgot-password"
                className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
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
