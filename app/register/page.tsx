"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FlaskConical, Mail, Lock, Eye, EyeOff, User, Phone, Building2, AlertCircle, CheckCircle } from "lucide-react";
import { registerClient, loginClient } from "@/lib/api";
import { validateStrongPassword } from "@/lib/password-validation";
import { getApiUrl } from "@/lib/api-config";
import LocationPicker from "@/components/LocationPicker";
import SupplierWilayaSelector from "@/components/SupplierWilayaSelector";
import { type LocationData, isLocationComplete } from "@/lib/location";
import { LABO_TYPE_OPTIONS, type LaboTypeValue } from "@/lib/labo-types";
import { ALGERIA_WILAYA_CODES } from "@/lib/algeria-wilayas";

type UserType = "supplier" | "client";

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type") === "supplier" ? "supplier" : "client";
  const [userType, setUserType] = useState<UserType>(initialType);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Ensure feedback alerts are visible even when user submits from the bottom.
  useEffect(() => {
    if (!error && !success) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [error, success]);

  useEffect(() => {
    const type = searchParams.get("type");
    if (type === "supplier" || type === "client") {
      setUserType(type);
    }
  }, [searchParams]);
  
  // Supplier form data
  const [supplierFormData, setSupplierFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [supplierLocation, setSupplierLocation] = useState<LocationData | null>(null);
  /** Default: cover all Algeria wilayas (same as profile "Toutes les wilayas") */
  const [coversAllWilayas, setCoversAllWilayas] = useState(true);
  const [coverageWilayas, setCoverageWilayas] = useState<string[]>([
    ...ALGERIA_WILAYA_CODES,
  ]);

  // Client form data
  const [clientFormData, setClientFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    laboType: "" as LaboTypeValue | "",
  });
  const [clientLocation, setClientLocation] = useState<LocationData | null>(null);

  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    // Validate passwords match
    if (supplierFormData.password !== supplierFormData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    const supplierPasswordError = validateStrongPassword(supplierFormData.password);
    if (supplierPasswordError) {
      setError(supplierPasswordError);
      return;
    }

    if (!isLocationComplete(supplierLocation)) {
      setError("Veuillez sélectionner votre localisation sur la carte (wilaya et commune requises)");
      return;
    }

    if (!coversAllWilayas && coverageWilayas.length === 0) {
      setError("Sélectionnez au moins une wilaya de couverture ou activez « Toutes les wilayas ».");
      return;
    }

    setIsLoading(true);

    try {
      const API_BASE_URL = getApiUrl();
      const response = await fetch(`${API_BASE_URL}/supplier/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          firstName: supplierFormData.firstName,
          lastName: supplierFormData.lastName,
          email: supplierFormData.email,
          password: supplierFormData.password,
          phone: supplierFormData.phone,
          address: supplierLocation!.address,
          latitude: supplierLocation!.latitude,
          longitude: supplierLocation!.longitude,
          wilaya: supplierLocation!.wilaya,
          daira: supplierLocation!.daira || "",
          commune: supplierLocation!.commune,
          placeId: supplierLocation!.placeId,
          role: "supplier",
          coversAllWilayas,
          wilayas: coversAllWilayas ? [...ALGERIA_WILAYA_CODES] : coverageWilayas,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.message || "Une erreur est survenue lors de l'inscription");
        setIsLoading(false);
        return;
      }

      const result = await response.json();

      if (result.success) {
        const loginResult = await loginClient({
          email: supplierFormData.email,
          password: supplierFormData.password,
        });

        if (loginResult.success) {
          setSuccess("Compte créé avec succès ! Redirection...");
          setTimeout(() => {
            router.push(loginResult.data?.redirectTo || "/supplier/upload-documents");
          }, 1500);
        } else {
          setSuccess("Compte créé. Connectez-vous pour continuer.");
          setTimeout(() => router.push("/login"), 1500);
        }
      } else {
        setError(result.message || "Une erreur est survenue lors de l'inscription");
      }
    } catch (err) {
      setError("Une erreur est survenue. Veuillez réessayer.");
      console.error("Registration error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    // Validate passwords match
    if (clientFormData.password !== clientFormData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    const clientPasswordError = validateStrongPassword(clientFormData.password);
    if (clientPasswordError) {
      setError(clientPasswordError);
      return;
    }

    // Validate laboType for clients
    if (!clientFormData.laboType) {
      setError("Veuillez sélectionner un type de laboratoire");
      return;
    }

    if (!isLocationComplete(clientLocation)) {
      setError("Veuillez sélectionner votre localisation sur la carte (wilaya et commune requises)");
      return;
    }

    setIsLoading(true);

    try {
      const result = await registerClient({
        firstName: clientFormData.firstName,
        lastName: clientFormData.lastName,
        email: clientFormData.email,
        password: clientFormData.password,
        phone: clientFormData.phone,
        address: clientLocation!.address,
        latitude: clientLocation!.latitude,
        longitude: clientLocation!.longitude,
        wilaya: clientLocation!.wilaya,
        daira: clientLocation!.daira || "",
        commune: clientLocation!.commune,
        placeId: clientLocation!.placeId,
        role: "client",
        laboType: clientFormData.laboType as LaboTypeValue,
      });

      if (result.success) {
        const loginResult = await loginClient({
          email: clientFormData.email,
          password: clientFormData.password,
        });

        if (loginResult.success) {
          setSuccess("Compte créé avec succès ! Redirection...");
          setTimeout(() => {
            router.push(loginResult.data?.redirectTo || "/client/upload-documents");
          }, 1500);
        } else {
          setSuccess("Compte créé. Connectez-vous pour continuer.");
          setTimeout(() => router.push("/login"), 1500);
        }
      } else {
        setError(result.message || "Une erreur est survenue lors de l'inscription");
      }
    } catch (err) {
      setError("Une erreur est survenue. Veuillez réessayer.");
      console.error("Registration error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      <div className="max-w-xl w-full space-y-8 relative z-10 animate-fade-in-up">
        {/* Logo and Header */}
        <div className="text-center">
          <Link href="/home" className="inline-block mb-6 group">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center shadow-2xl transform transition-transform group-hover:scale-110 group-hover:rotate-6 mx-auto">
              <FlaskConical className="w-10 h-10 text-white" />
            </div>
          </Link>
          <h2 className="text-4xl font-bold text-gray-900 mb-2">
            Créer un compte
          </h2>
          <p className="text-gray-600">
            Rejoignez MarketLab et accédez à nos services
          </p>
        </div>

        {/* Register Form */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-gray-200 hover-lift">
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

          {/* User Type Selector */}
          <div className="mb-6">
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
              <button
                type="button"
                onClick={() => setUserType("supplier")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all duration-300 ${
                  userType === "supplier"
                    ? "bg-blue-600 text-white shadow-lg transform scale-105"
                    : "text-gray-700 hover:bg-gray-200"
                }`}
              >
                <Building2 className="w-5 h-5" />
                <span>Fournisseur</span>
              </button>
              <button
                type="button"
                onClick={() => setUserType("client")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all duration-300 ${
                  userType === "client"
                    ? "bg-blue-600 text-white shadow-lg transform scale-105"
                    : "text-gray-700 hover:bg-gray-200"
                }`}
              >
                <User className="w-5 h-5" />
                <span>laboratoire</span>
              </button>
            </div>
          </div>

          {/* Supplier Form */}
          {userType === "supplier" && (
            <form className="space-y-5" onSubmit={handleSupplierSubmit}>
            {/* First Name Field */}
            <div className="space-y-2">
              <label htmlFor="supplier-firstName" className="block text-sm font-medium text-gray-700">
                Prénom
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="supplier-firstName"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  required
                  value={supplierFormData.firstName}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, firstName: e.target.value })}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                  placeholder="Jean"
                />
              </div>
            </div>

            {/* Last Name Field */}
            <div className="space-y-2">
              <label htmlFor="supplier-lastName" className="block text-sm font-medium text-gray-700">
                Nom
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="supplier-lastName"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  required
                  value={supplierFormData.lastName}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, lastName: e.target.value })}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                  placeholder="Dupont"
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-2">
                <label htmlFor="supplier-email" className="block text-sm font-medium text-gray-700">
                Adresse email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    id="supplier-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                    value={supplierFormData.email}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, email: e.target.value })}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                  placeholder="votre@email.com"
                />
              </div>
            </div>

            {/* Phone Field */}
            <div className="space-y-2">
                <label htmlFor="supplier-phone" className="block text-sm font-medium text-gray-700">
                Téléphone
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    id="supplier-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                    value={supplierFormData.phone}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                  placeholder="+33 6 12 34 56 78"
                />
              </div>
            </div>

            {/* Location */}
            <LocationPicker
              inputId="supplier-location"
              label="Localisation"
              value={supplierLocation}
              onChange={setSupplierLocation}
            />

            {/* Coverage wilayas */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Zones de couverture (wilayas) <span className="text-red-500">*</span>
              </label>
              <p className="text-sm text-gray-500">
                Par défaut toutes les wilayas sont sélectionnées. Vous pouvez modifier la zone de couverture.
              </p>
              <SupplierWilayaSelector
                coversAllWilayas={coversAllWilayas}
                selectedCodes={coverageWilayas}
                onCoversAllChange={(value) => {
                  setCoversAllWilayas(value);
                  setCoverageWilayas(value ? [...ALGERIA_WILAYA_CODES] : coverageWilayas);
                }}
                onSelectedCodesChange={setCoverageWilayas}
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
                <label htmlFor="supplier-password" className="block text-sm font-medium text-gray-700">
                Mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    id="supplier-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                    value={supplierFormData.password}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, password: e.target.value })}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
                <label htmlFor="supplier-confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    id="supplier-confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                    value={supplierFormData.confirmPassword}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, confirmPassword: e.target.value })}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-start">
              <input
                  id="supplier-terms"
                  name="terms"
                  type="checkbox"
                  required
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                />
                <label htmlFor="supplier-terms" className="ml-2 block text-sm text-gray-700">
                  J'accepte les{" "}
                  <Link href="#" className="text-blue-600 hover:text-blue-700">
                    conditions générales
                  </Link>{" "}
                  et la{" "}
                  <Link href="#" className="text-blue-600 hover:text-blue-700">
                    politique de confidentialité
                  </Link>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform hover:scale-105 hover-lift hover-glow mt-6 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? "Création en cours..." : "Créer mon compte fournisseur"}
              </button>
            </form>
          )}

          {/* Client Form */}
          {userType === "client" && (
            <form className="space-y-5" onSubmit={handleClientSubmit}>
              {/* First Name Field */}
              <div className="space-y-2">
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  Prénom
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    required
                    value={clientFormData.firstName}
                    onChange={(e) => setClientFormData({ ...clientFormData, firstName: e.target.value })}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                    placeholder="Jean"
                  />
                </div>
              </div>

              {/* Last Name Field */}
              <div className="space-y-2">
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Nom
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    required
                    value={clientFormData.lastName}
                    onChange={(e) => setClientFormData({ ...clientFormData, lastName: e.target.value })}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                    placeholder="Dupont"
                  />
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="client-email" className="block text-sm font-medium text-gray-700">
                  Adresse email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="client-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={clientFormData.email}
                    onChange={(e) => setClientFormData({ ...clientFormData, email: e.target.value })}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                    placeholder="votre@email.com"
                  />
                </div>
              </div>

              {/* Phone Field */}
              <div className="space-y-2">
                <label htmlFor="client-phone" className="block text-sm font-medium text-gray-700">
                  Téléphone
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="client-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    required
                    value={clientFormData.phone}
                    onChange={(e) => setClientFormData({ ...clientFormData, phone: e.target.value })}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                    placeholder="+33 6 12 34 56 78"
                  />
                </div>
              </div>

              {/* Location */}
              <LocationPicker
                inputId="client-location"
                label="Localisation"
                value={clientLocation}
                onChange={setClientLocation}
              />

              {/* Labo Type Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Type de laboratoire <span className="text-red-500">*</span>
                </label>
                <p className="text-sm text-gray-500">
                  Votre laboratoire est de quel type ?
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {LABO_TYPE_OPTIONS.map((opt) => {
                    const selected = clientFormData.laboType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setClientFormData({ ...clientFormData, laboType: opt.value })
                        }
                        className={`text-left p-4 rounded-xl border-2 transition-all ${
                          selected
                            ? "border-teal-500 bg-gradient-to-br from-teal-50 to-cyan-50 shadow-sm"
                            : "border-teal-200 bg-gradient-to-br from-teal-50/60 to-cyan-50/60 hover:border-teal-400"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <FlaskConical
                            className={`h-5 w-5 mt-0.5 shrink-0 ${
                              selected ? "text-teal-600" : "text-gray-400"
                            }`}
                          />
                          <p className="font-semibold text-gray-900 text-sm leading-snug">
                            {opt.label}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label htmlFor="client-password" className="block text-sm font-medium text-gray-700">
                  Mot de passe
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="client-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={clientFormData.password}
                    onChange={(e) => setClientFormData({ ...clientFormData, password: e.target.value })}
                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <label htmlFor="client-confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="client-confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={clientFormData.confirmPassword}
                    onChange={(e) => setClientFormData({ ...clientFormData, confirmPassword: e.target.value })}
                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="flex items-start">
                <input
                  id="client-terms"
                name="terms"
                type="checkbox"
                required
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
                <label htmlFor="client-terms" className="ml-2 block text-sm text-gray-700">
                J'accepte les{" "}
                <Link href="#" className="text-blue-600 hover:text-blue-700">
                  conditions générales
                </Link>{" "}
                et la{" "}
                <Link href="#" className="text-blue-600 hover:text-blue-700">
                  politique de confidentialité
                </Link>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform hover:scale-105 hover-lift hover-glow mt-6 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? "Création en cours..." : "Créer mon compte client"}
            </button>
          </form>
          )}

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

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Vous avez déjà un compte ?{" "}
              <Link
                href="/login"
                className="font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                Se connecter
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
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50">
          <p className="text-gray-600">Chargement...</p>
        </div>
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}

