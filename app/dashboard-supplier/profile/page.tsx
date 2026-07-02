"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Save,
  Camera,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Loader2,
  Upload,
  X,
  CreditCard,
} from "lucide-react";
import { getProfile, ClientData, getAuthToken } from "@/lib/api";
import { getApiUrl } from "@/lib/api-config";
import { getMediaUrl } from "@/lib/media-url";
import SupplierWilayaSelector from "@/components/SupplierWilayaSelector";

interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  rip_post: string;
  rip_bank: string;
  methode_payment: string[];
  coversAllWilayas: boolean;
  wilayas: string[];
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function SupplierProfilePage() {
  const router = useRouter();
  const [userData, setUserData] = useState<ClientData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const [profileForm, setProfileForm] = useState<ProfileFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    rip_post: "",
    rip_bank: "",
    methode_payment: [],
    coversAllWilayas: false,
    wilayas: [],
  });
  

  const [passwordForm, setPasswordForm] = useState<PasswordFormData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsLoading(true);
        const token = getAuthToken();
        if (!token) {
          router.push("/login");
          return;
        }

        const result = await getProfile();
        if (result.success && result.data) {
          setUserData(result.data);
          setProfileForm({
            firstName: result.data.firstName || "",
            lastName: result.data.lastName || "",
            email: result.data.email || "",
            phone: result.data.phone || "",
            address: result.data.address || "",
            rip_post: (result.data as ClientData).rip_post || "",
            rip_bank: (result.data as ClientData).rip_bank || "",
            methode_payment: (result.data as ClientData).methode_payment || [],
            coversAllWilayas: !!(result.data as ClientData).coversAllWilayas,
            wilayas: (result.data as ClientData).wilayas || [],
          });
        }

        // Load profile image
        await loadProfileImage();
      } catch (err) {
        // Silent error handling
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [router ]);

  // Listen for profile image updates
  useEffect(() => {
    const handleProfileImageUpdate = () => {
      loadProfileImage();
    };

    window.addEventListener('profileImageUpdated', handleProfileImageUpdate);

    return () => {
      window.removeEventListener('profileImageUpdated', handleProfileImageUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfileImage = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        return;
      }

      const API_BASE_URL = getApiUrl();
      
      const response = await fetch(`${API_BASE_URL}/supplier/profile-image`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.data && result.data.image) {
          let imagePath = result.data.image;
          
          // Remove leading slash if present
          if (imagePath.startsWith("/")) {
            imagePath = imagePath.slice(1);
          }
          
          // Normalize Windows paths (backslashes to forward slashes)
          imagePath = imagePath.replace(/\\/g, "/");
          
          const resolvedPath = imagePath.startsWith("uploads/")
            ? imagePath
            : `uploads/profile/${imagePath}`;
          const fullImageUrl = getMediaUrl(resolvedPath);
          setProfileImage(
            fullImageUrl
              ? `${fullImageUrl}${fullImageUrl.includes("?") ? "&" : "?"}t=${Date.now()}`
              : null
          );
        } else {
          setProfileImage(null);
        }
      } else if (response.status === 404) {
        // No profile image exists yet
        setProfileImage(null);
      } else {
        setProfileImage(null);
      }
    } catch (err) {
      setProfileImage(null);
    }
  };
  
  

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePaymentMethodChange = (method: string) => {
    setProfileForm((prev) => {
      const currentMethods = prev.methode_payment || [];
      if (currentMethods.includes(method)) {
        // Remove if already selected
        return {
          ...prev,
          methode_payment: currentMethods.filter((m) => m !== method),
        };
      } else {
        // Add if not selected
        return {
          ...prev,
          methode_payment: [...currentMethods, method],
        };
      }
    });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate payment methods and required fields
    const hasByPost = profileForm.methode_payment.includes("by post");
    const hasBank = profileForm.methode_payment.includes("bank");

    if (hasByPost && !profileForm.rip_post.trim()) {
      setError("Vous devez renseigner votre RIP Post si vous acceptez les paiements par Poste.");
      return;
    }

    if (hasBank && !profileForm.rip_bank.trim()) {
      setError("Vous devez renseigner votre RIP Bank si vous acceptez les paiements par Banque.");
      return;
    }

    if (!profileForm.coversAllWilayas && profileForm.wilayas.length === 0) {
      setError("Sélectionnez au moins une wilaya ou activez « Toutes les wilayas ».");
      return;
    }

    setIsUpdating(true);

    try {
      const token = getAuthToken();
      if (!token) {
        router.push("/login");
        return;
      }

      const API_BASE_URL = getApiUrl();
      const response = await fetch(`${API_BASE_URL}/supplier/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileForm),
      });

      const result = await response.json();

      if (!response.ok) {
        // Display specific validation errors if available
        if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
          setError(result.errors.join(". "));
        } else {
          setError(result.message || "Erreur lors de la mise à jour du profil");
        }
        setIsUpdating(false);
        return;
      }

      if (result.success) {
        setSuccess("Profil mis à jour avec succès !");
        setUserData(result.data);
        // Dispatch custom event to notify layout to refresh profile
        window.dispatchEvent(new CustomEvent("profileUpdated"));
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError("Une erreur est survenue. Veuillez réessayer.");
      // Silent error handling
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError("Le nouveau mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const token = getAuthToken();
      if (!token) {
        router.push("/login");
        return;
      }

      const API_BASE_URL = getApiUrl();
      const response = await fetch(`${API_BASE_URL}/supplier/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Display specific validation errors if available
        if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
          setError(result.errors.join(". "));
        } else {
          setError(result.message || "Erreur lors de la mise à jour du mot de passe");
        }
        setIsUpdatingPassword(false);
        return;
      }

      if (result.success) {
        setSuccess("Mot de passe mis à jour avec succès !");
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError("Une erreur est survenue. Veuillez réessayer.");
      // Silent error handling
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Seuls les fichiers image sont acceptés");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("La taille de l'image ne doit pas dépasser 5MB");
        return;
      }
      setSelectedImage(file);
      setError(null);
    }
  };

  const handleImageUpload = async () => {
    if (!selectedImage) {
      setError("Veuillez sélectionner une image");
      return;
    }

    setError(null);
    setSuccess(null);
    setIsUploadingImage(true);

    try {
      const token = getAuthToken();
      if (!token) {
        router.push("/login");
        return;
      }

      const API_BASE_URL = getApiUrl();
      const formData = new FormData();
      formData.append("image", selectedImage);

      const response = await fetch(`${API_BASE_URL}/supplier/profile-image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Erreur lors de l'upload de l'image");
        setIsUploadingImage(false);
        return;
      }

      if (result.success) {
        setSuccess("Image de profil mise à jour avec succès !");
        setSelectedImage(null);
        await loadProfileImage();
        
        // Trigger a custom event to notify the layout to refresh the profile image
        window.dispatchEvent(new CustomEvent('profileImageUpdated'));
        
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError("Une erreur est survenue. Veuillez réessayer.");
      // Silent error handling
    } finally {
      setIsUploadingImage(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Mon Profil</h2>
        <p className="text-gray-600 mt-1">Gérez vos informations personnelles</p>
      </div>

      {/* Messages */}
      {success && (
        <div className="p-5 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-xl shadow-lg flex items-start gap-4">
          <div className="p-2 bg-green-100 rounded-lg">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-green-900 mb-1">Succès !</p>
            <p className="text-sm text-green-700">{success}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-5 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 rounded-xl shadow-lg flex items-start gap-4">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-red-900 mb-1">Erreur</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Profile Image Section */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-8 text-white">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              {profileImage ? (
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/30 shadow-xl">
                  <img 
                    src={profileImage} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Silent error handling
                      setProfileImage(null);
                    }}
                  />
                </div>
              ) : (
                <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center border-4 border-white/30">
                  <User className="w-16 h-16 text-white" />
                </div>
              )}
              <label className="absolute bottom-0 right-0 p-3 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-all cursor-pointer">
                <Camera className="w-5 h-5 text-green-600" />
                <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
              </label>
            </div>
            <div className="text-center sm:text-left flex-1">
              <h3 className="text-2xl font-bold mb-1">
                {userData?.firstName} {userData?.lastName}
              </h3>
              <p className="text-green-100">{userData?.email}</p>
              {selectedImage && (
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                    {selectedImage.name}
                  </span>
                  <button
                    onClick={handleImageUpload}
                    disabled={isUploadingImage}
                    className="px-4 py-2 bg-white text-green-600 rounded-lg font-semibold hover:bg-gray-100 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {isUploadingImage ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Upload...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Uploader</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="p-2 text-white hover:bg-white/20 rounded-lg transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Information Form */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 sm:p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <User className="w-6 h-6 text-green-600" />
          Informations personnelles
        </h3>
        <form onSubmit={handleProfileSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <User className="w-4 h-4 text-green-600" />
                Prénom
              </label>
              <input
                type="text"
                name="firstName"
                value={profileForm.firstName}
                onChange={handleProfileChange}
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <User className="w-4 h-4 text-green-600" />
                Nom
              </label>
              <input
                type="text"
                name="lastName"
                value={profileForm.lastName}
                onChange={handleProfileChange}
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <Mail className="w-4 h-4 text-green-600" />
                Email
              </label>
              <input
                type="email"
                name="email"
                value={profileForm.email}
                onChange={handleProfileChange}
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <Phone className="w-4 h-4 text-green-600" />
                Téléphone
              </label>
              <input
                type="tel"
                name="phone"
                value={profileForm.phone}
                onChange={handleProfileChange}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
              />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <MapPin className="w-4 h-4 text-green-600" />
                Adresse
              </label>
              <textarea
                name="address"
                value={profileForm.address}
                onChange={handleProfileChange}
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all resize-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <MapPin className="w-4 h-4 text-green-600" />
                Zones de couverture (wilayas)
              </label>
              <p className="text-sm text-gray-500 mb-4">
                Indiquez les wilayas où vous proposez vos produits et services.
              </p>
              <SupplierWilayaSelector
                coversAllWilayas={profileForm.coversAllWilayas}
                selectedCodes={profileForm.wilayas}
                onCoversAllChange={(value) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    coversAllWilayas: value,
                    wilayas: value ? [] : prev.wilayas,
                  }))
                }
                onSelectedCodesChange={(codes) =>
                  setProfileForm((prev) => ({ ...prev, wilayas: codes }))
                }
              />
            </div>
             <div className="md:col-span-2">
               <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                 <CreditCard className="w-4 h-4 text-green-600" />
                 Méthodes de paiement
               </label>
               <div className="space-y-3">
                 <label className="flex items-center gap-3 p-4 border-2 border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-all">
                   <input
                     type="checkbox"
                     checked={profileForm.methode_payment.includes("cash")}
                     onChange={() => handlePaymentMethodChange("cash")}
                     className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                   />
                   <span className="text-gray-700 font-medium">Cash</span>
                 </label>
                 <div>
                   <label className="flex items-center gap-3 p-4 border-2 border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-all">
                     <input
                       type="checkbox"
                       checked={profileForm.methode_payment.includes("by post")}
                       onChange={() => handlePaymentMethodChange("by post")}
                       className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                     />
                     <span className="text-gray-700 font-medium">Par Poste</span>
                   </label>
                   {profileForm.methode_payment.includes("by post") && (
                     <div className="mt-3 ml-8">
                       <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                         <CreditCard className="w-4 h-4 text-green-600" />
                         Numéro RIP Post
                         <span className="text-red-500">*</span>
                       </label>
                       <input
                         type="text"
                         name="rip_post"
                         value={profileForm.rip_post}
                         onChange={handleProfileChange}
                         placeholder="Entrez votre numéro RIP Post"
                         required
                         className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${
                           profileForm.rip_post.trim()
                             ? "border-gray-300"
                             : "border-red-300 focus:border-red-500 focus:ring-red-500"
                         }`}
                       />
                       {!profileForm.rip_post.trim() && (
                         <p className="text-red-500 text-xs mt-1">Veuillez renseigner votre numéro RIP Post</p>
                       )}
                     </div>
                   )}
                 </div>
                 <div>
                   <label className="flex items-center gap-3 p-4 border-2 border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-all">
                     <input
                       type="checkbox"
                       checked={profileForm.methode_payment.includes("bank")}
                       onChange={() => handlePaymentMethodChange("bank")}
                       className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                     />
                     <span className="text-gray-700 font-medium">Banque</span>
                   </label>
                   {profileForm.methode_payment.includes("bank") && (
                     <div className="mt-3 ml-8">
                       <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                         <CreditCard className="w-4 h-4 text-green-600" />
                         Numéro RIP Bank
                         <span className="text-red-500">*</span>
                       </label>
                       <input
                         type="text"
                         name="rip_bank"
                         value={profileForm.rip_bank}
                         onChange={handleProfileChange}
                         placeholder="Entrez votre numéro RIP Bank"
                         required
                         className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${
                           profileForm.rip_bank.trim()
                             ? "border-gray-300"
                             : "border-red-300 focus:border-red-500 focus:ring-red-500"
                         }`}
                       />
                       {!profileForm.rip_bank.trim() && (
                         <p className="text-red-500 text-xs mt-1">Veuillez renseigner votre numéro RIP Bank</p>
                       )}
                     </div>
                   )}
                 </div>
               </div>
             </div>
          </div>
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={isUpdating}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Mise à jour...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Enregistrer les modifications</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Password Update Form */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 sm:p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Lock className="w-6 h-6 text-green-600" />
          Changer le mot de passe
        </h3>
        <form onSubmit={handlePasswordSubmit} className="space-y-6">
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <Lock className="w-4 h-4 text-green-600" />
              Mot de passe actuel
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="currentPassword"
                value={passwordForm.currentPassword}
                onChange={handlePasswordChange}
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <Lock className="w-4 h-4 text-green-600" />
              Nouveau mot de passe
            </label>
            <input
              type={showPassword ? "text" : "password"}
              name="newPassword"
              value={passwordForm.newPassword}
              onChange={handlePasswordChange}
              required
              minLength={6}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <Lock className="w-4 h-4 text-green-600" />
              Confirmer le nouveau mot de passe
            </label>
            <input
              type={showPassword ? "text" : "password"}
              name="confirmPassword"
              value={passwordForm.confirmPassword}
              onChange={handlePasswordChange}
              required
              minLength={6}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
            />
          </div>
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
            >
              {isUpdatingPassword ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Mise à jour...</span>
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  <span>Changer le mot de passe</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
