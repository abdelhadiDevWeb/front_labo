"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, CheckCircle, Heart, Loader2, MapPin, Sparkles } from "lucide-react";
import { getFavoriteSuppliers, removeSupplierFromFavorites, SupplierCard } from "@/lib/api";
import { getMediaUrl } from "@/lib/media-url";

export default function FavorablePage() {
  const [suppliers, setSuppliers] = useState<SupplierCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadFavorites = async () => {
    setIsLoading(true);
    const result = await getFavoriteSuppliers();
    if (result.success && result.data) {
      setSuppliers(result.data.suppliers || []);
    } else {
      setSuppliers([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const removeFav = async (supplierId: string) => {
    const result = await removeSupplierFromFavorites(supplierId);
    if (result.success) {
      setSuppliers((prev) => prev.filter((s) => s.id !== supplierId));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Favorable</h1>
          <Link href="/suppliers" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Suppliers
          </Link>
        </div>

        {isLoading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : suppliers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <Heart className="w-14 h-14 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">Aucun supplier en favori</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {suppliers.map((supplier) => (
              <div
                key={supplier.id}
                className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              >
                <div className="h-1.5 bg-gradient-to-r from-rose-500 to-red-500" />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <Link href={`/supplier/${supplier.id}`} className="flex items-center gap-3 min-w-0">
                      {supplier.profileImage ? (
                        <img
                          src={getMediaUrl(supplier.profileImage) || ""}
                          alt={`${supplier.firstName} ${supplier.lastName}`}
                          className="w-14 h-14 rounded-full object-cover border-2 border-blue-100"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center border-2 border-blue-200">
                          <Building2 className="w-7 h-7 text-blue-600" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 truncate text-lg">
                          {supplier.firstName} {supplier.lastName}
                        </h3>
                        <p className="text-sm text-gray-500 truncate">{supplier.email}</p>
                      </div>
                    </Link>
                    <button
                      onClick={() => removeFav(supplier.id)}
                      className="p-2.5 rounded-xl bg-red-100 text-red-600"
                      title="Retirer du favori"
                    >
                      <Heart className="w-5 h-5 fill-current" />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {supplier.certife && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-300">
                        <CheckCircle className="w-3 h-3" />
                        Certifie
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                      <Sparkles className="w-3 h-3" />
                      {supplier.productsCount} produit(s)
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-4 line-clamp-2 flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
                    <span>{supplier.address}</span>
                  </p>

                  <Link
                    href={`/supplier/${supplier.id}`}
                    className="inline-flex w-full justify-center px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold"
                  >
                    Voir details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

