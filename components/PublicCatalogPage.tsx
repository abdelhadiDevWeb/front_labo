"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  Package,
  Building2,
  Tag,
  Clock,
  Image as ImageIcon,
  Loader2,
  ArrowLeft,
  SlidersHorizontal,
  DollarSign,
  Eye,
  ShoppingCart,
} from "lucide-react";
import {
  Category,
  PublicCatalogItem,
  getPublicCategories,
  getPublicMachines,
  getPublicServices,
  getSessionRole,
} from "@/lib/api";
import { getMediaUrl } from "@/lib/media-url";
import { useUserLocation } from "@/hooks/useUserLocation";
import { resolveWilayaCode, catalogItemAvailableInWilaya } from "@/lib/algeria-wilayas";
import CatalogItemDetailsModal from "@/components/CatalogItemDetailsModal";
import CatalogLocationBanner from "@/components/CatalogLocationBanner";
import CartPanel from "@/components/CartPanel";
import LoginAlert from "@/components/LoginAlert";
import CatalogPrice from "@/components/CatalogPrice";
import { useCart } from "@/contexts/CartContext";

type CatalogKind = "machine" | "service";

const PAGE_SIZE = 48;

const KIND_META: Record<
  CatalogKind,
  {
    title: string;
    singular: string;
    listPath: string;
    detailBase: string;
    categoryType: "machine" | "services";
    badgeClass: string;
  }
> = {
  machine: {
    title: "Machines",
    singular: "machine",
    listPath: "/machines",
    detailBase: "/machines",
    categoryType: "machine",
    badgeClass: "bg-blue-100 text-blue-700",
  },
  service: {
    title: "Services",
    singular: "service",
    listPath: "/services",
    detailBase: "/services",
    categoryType: "services",
    badgeClass: "bg-amber-100 text-amber-800",
  },
};

export default function PublicCatalogPage({ kind }: { kind: CatalogKind }) {
  const meta = KIND_META[kind];
  const [items, setItems] = useState<PublicCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const loadMoreLockRef = useRef(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [filterCategoryId, setFilterCategoryId] = useState("all");
  const [filterSousCategoryId, setFilterSousCategoryId] = useState("all");
  const [filterBrand, setFilterBrand] = useState("all");
  const [filterSupplier, setFilterSupplier] = useState("all");
  /** `default` | `asc` (cheap→expensive) | `desc` (expensive→cheap) */
  const [priceSort, setPriceSort] = useState<"default" | "asc" | "desc">("default");
  const [showFilters, setShowFilters] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(true);
  const [detailsItem, setDetailsItem] = useState<PublicCatalogItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [loginAlertOpen, setLoginAlertOpen] = useState(false);
  const { addToCart } = useCart();
  const {
    location: userLocation,
    status: locationStatus,
    requestBrowserLocation,
  } = useUserLocation();

  const requiresWilayaForCatalog = isGuest || userRole === "client";

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getSessionRole();
      if (!session) {
        setIsGuest(true);
        setUserRole(null);
        return;
      }
      setIsGuest(false);
      setUserRole(session.role);
    };
    void checkAuth();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadCategories = async () => {
      const result = await getPublicCategories();
      if (cancelled) return;
      if (result.success && result.data) {
        setDbCategories(
          (result.data.categories || []).filter(
            (c) => (c.type_catgory || "product") === meta.categoryType
          )
        );
      }
    };
    void loadCategories();
    return () => {
      cancelled = true;
    };
  }, [meta.categoryType]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const wilayaCode = resolveWilayaCode(userLocation?.wilaya);
      const hasWilaya = Boolean(wilayaCode || userLocation?.wilaya);

      try {
        setIsLoading(true);
        setError(null);
        setHasMore(false);
        setNextCursor(null);
        setTotalCount(null);

        const canFilterByWilaya =
          requiresWilayaForCatalog &&
          locationStatus === "granted" &&
          hasWilaya;
        const filters = {
          ...(canFilterByWilaya
            ? wilayaCode
              ? { wilayaCode }
              : userLocation?.wilaya
                ? { wilayaCode: userLocation.wilaya }
                : {}
            : {}),
          limit: PAGE_SIZE,
        };
        const result =
          kind === "machine"
            ? await getPublicMachines(filters)
            : await getPublicServices(filters);
        if (cancelled) return;
        if (result.success && result.data) {
          const list =
            kind === "machine"
              ? (result.data as { machines: PublicCatalogItem[] }).machines || []
              : (result.data as { services: PublicCatalogItem[] }).services || [];
          setItems(list);
          setNextCursor(result.data.nextCursor ?? null);
          setHasMore(Boolean(result.data.hasMore));
          setTotalCount(
            typeof result.data.totalCount === "number"
              ? result.data.totalCount
              : list.length
          );
        } else {
          setError(result.message || `Erreur lors du chargement des ${meta.title.toLowerCase()}`);
          setItems([]);
          setTotalCount(0);
        }
      } catch {
        if (cancelled) return;
        setError("Une erreur est survenue");
        setItems([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [kind, meta.title, requiresWilayaForCatalog, userLocation?.wilaya, locationStatus]);

  const loadMoreItems = useCallback(async () => {
    if (!hasMore || !nextCursor || isLoading || isLoadingMore || loadMoreLockRef.current) {
      return;
    }

    loadMoreLockRef.current = true;
    setIsLoadingMore(true);

    const wilayaCode = resolveWilayaCode(userLocation?.wilaya);
    const hasWilaya = Boolean(wilayaCode || userLocation?.wilaya);
    const canFilterByWilaya =
      requiresWilayaForCatalog &&
      locationStatus === "granted" &&
      hasWilaya;
    const filters = {
      ...(canFilterByWilaya
        ? wilayaCode
          ? { wilayaCode }
          : userLocation?.wilaya
            ? { wilayaCode: userLocation.wilaya }
            : {}
        : {}),
      limit: PAGE_SIZE,
      cursor: nextCursor,
    };

    try {
      const result =
        kind === "machine"
          ? await getPublicMachines(filters)
          : await getPublicServices(filters);

      if (result.success && result.data) {
        const incoming =
          kind === "machine"
            ? (result.data as { machines: PublicCatalogItem[] }).machines || []
            : (result.data as { services: PublicCatalogItem[] }).services || [];
        setItems((prev) => {
          const seen = new Set(prev.map((i) => i.id));
          return [...prev, ...incoming.filter((i) => !seen.has(i.id))];
        });
        setNextCursor(result.data.nextCursor ?? null);
        setHasMore(Boolean(result.data.hasMore));
      }
    } catch {
      // keep loaded items
    } finally {
      setIsLoadingMore(false);
      loadMoreLockRef.current = false;
    }
  }, [
    hasMore,
    nextCursor,
    isLoading,
    isLoadingMore,
    kind,
    requiresWilayaForCatalog,
    userLocation?.wilaya,
    locationStatus,
  ]);

  useEffect(() => {
    const node = loadMoreSentinelRef.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMoreItems();
        }
      },
      { root: null, rootMargin: "320px", threshold: 0 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMoreItems, items.length]);

  const selectedCategory = useMemo(
    () => dbCategories.find((c) => c.id === filterCategoryId),
    [dbCategories, filterCategoryId]
  );
  const availableSousCategories = selectedCategory?.sousCategories ?? [];
  const brands = Array.from(new Set(items.map((i) => i.brand).filter(Boolean))).sort();
  const suppliers = Array.from(
    new Set(items.map((i) => i.supplier?.name).filter(Boolean) as string[])
  ).sort();

  const clientWilayaCode = useMemo(
    () => resolveWilayaCode(userLocation?.wilaya),
    [userLocation?.wilaya]
  );
  const appliesWilayaFilter = requiresWilayaForCatalog && !!clientWilayaCode;

  const filteredItems = useMemo(() => {
    const category = dbCategories.find((c) => c.id === filterCategoryId);
    const sousCategories = category?.sousCategories ?? [];

    const matched = items.filter((item) => {
      const haystack = `${item.name} ${item.brand} ${item.category} ${item.sousCategory || ""} ${
        item.supplier?.name || ""
      }`.toLowerCase();
      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      const matchesCategory =
        filterCategoryId === "all" ||
        item.id_catgory === filterCategoryId ||
        (!item.id_catgory &&
          !!category &&
          item.category.toLowerCase() === category.name_catgory.toLowerCase());
      const matchesSousCategory =
        filterSousCategoryId === "all" ||
        item.id_sous_catgory === filterSousCategoryId ||
        (!item.id_sous_catgory &&
          filterSousCategoryId !== "all" &&
          sousCategories.some(
            (sc) =>
              sc.id === filterSousCategoryId &&
              (item.sousCategory || item.category).toLowerCase() ===
                sc.name_sou_catgory.toLowerCase()
          ));
      const matchesBrand = filterBrand === "all" || item.brand === filterBrand;
      const matchesSupplier =
        filterSupplier === "all" || item.supplier?.name === filterSupplier;
      const matchesWilaya =
        !appliesWilayaFilter ||
        catalogItemAvailableInWilaya(item, clientWilayaCode, userLocation?.wilaya);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesSousCategory &&
        matchesBrand &&
        matchesSupplier &&
        matchesWilaya
      );
    });

    if (priceSort === "default") return matched;

    return [...matched].sort((a, b) => {
      const pa = Number(a.price) || 0;
      const pb = Number(b.price) || 0;
      return priceSort === "asc" ? pa - pb : pb - pa;
    });
  }, [
    items,
    searchTerm,
    filterCategoryId,
    filterSousCategoryId,
    filterBrand,
    filterSupplier,
    priceSort,
    dbCategories,
    appliesWilayaFilter,
    clientWilayaCode,
    userLocation?.wilaya,
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/home"
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
              aria-label="Retour"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{meta.title}</h1>
              <p className="text-sm text-gray-500">
                {totalCount == null
                  ? "…"
                  : `${totalCount} ${meta.singular}${totalCount > 1 ? "s" : ""} au total`}
                {priceSort === "asc"
                  ? " · du moins cher au plus cher"
                  : priceSort === "desc"
                    ? " · du plus cher au moins cher"
                    : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="sm:hidden px-3 py-2 rounded-xl border border-gray-300 flex items-center gap-2 text-sm"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtres
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-6">
        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          <aside
            className={`bg-white rounded-2xl border border-gray-200 p-4 h-fit lg:sticky lg:top-24 ${
              showFilters ? "block" : "hidden sm:block"
            }`}
          >
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-blue-600" />
              <h2 className="font-semibold text-gray-900">Filtres</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Recherche</label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={`Rechercher une ${meta.singular}...`}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Catégorie</label>
                <select
                  value={filterCategoryId}
                  onChange={(e) => {
                    setFilterCategoryId(e.target.value);
                    setFilterSousCategoryId("all");
                  }}
                  className="mt-1 w-full py-2.5 px-3 border border-gray-300 rounded-xl bg-white"
                >
                  <option value="all">Toutes</option>
                  {dbCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name_catgory}
                    </option>
                  ))}
                </select>
              </div>

              {availableSousCategories.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">
                    Sous-catégorie
                  </label>
                  <select
                    value={filterSousCategoryId}
                    onChange={(e) => setFilterSousCategoryId(e.target.value)}
                    className="mt-1 w-full py-2.5 px-3 border border-gray-300 rounded-xl bg-white"
                  >
                    <option value="all">Toutes</option>
                    {availableSousCategories.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.name_sou_catgory}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Marque</label>
                <select
                  value={filterBrand}
                  onChange={(e) => setFilterBrand(e.target.value)}
                  className="mt-1 w-full py-2.5 px-3 border border-gray-300 rounded-xl bg-white"
                >
                  <option value="all">Toutes</option>
                  {brands.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Fournisseur</label>
                <select
                  value={filterSupplier}
                  onChange={(e) => setFilterSupplier(e.target.value)}
                  className="mt-1 w-full py-2.5 px-3 border border-gray-300 rounded-xl bg-white"
                >
                  <option value="all">Tous</option>
                  {suppliers.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Prix</label>
                <select
                  value={priceSort}
                  onChange={(e) =>
                    setPriceSort(e.target.value as "default" | "asc" | "desc")
                  }
                  className="mt-1 w-full py-2.5 px-3 border border-gray-300 rounded-xl bg-white"
                >
                  <option value="default">Par défaut</option>
                  <option value="asc">Moins cher → plus cher</option>
                  <option value="desc">Plus cher → moins cher</option>
                </select>
              </div>
            </div>
          </aside>

          <main>
            {requiresWilayaForCatalog && (
              <CatalogLocationBanner
                isGuest={isGuest}
                locationStatus={locationStatus}
                wilayaLabel={userLocation?.wilaya}
                onRequestLocation={requestBrowserLocation}
                catalogLabel={meta.title.toLowerCase()}
              />
            )}

            {isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
              </div>
            ) : error ? (
              <div className="bg-white rounded-2xl border border-red-200 p-8 text-center text-red-600">
                {error}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <Package className="w-14 h-14 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">Aucune {meta.singular} trouvée</p>
                {items.length > 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    Des résultats existent mais ne correspondent pas aux filtres
                    sélectionnés.
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredItems.map((item) => {
                  const image =
                    item.images?.[0] != null ? getMediaUrl(item.images[0]) : null;
                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all group flex flex-col"
                    >
                      <div className="relative h-44 bg-gray-100">
                        {image ? (
                          <img
                            src={image}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-12 h-12 text-gray-300" />
                          </div>
                        )}
                        <span
                          className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.badgeClass}`}
                        >
                          {meta.singular}
                        </span>
                      </div>
                      <div className="p-4 space-y-2 flex-1 flex flex-col">
                        <h3 className="font-bold text-gray-900 line-clamp-2 group-hover:text-blue-600">
                          {item.name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Building2 className="w-4 h-4" />
                          <span className="truncate">{item.brand}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Tag className="w-4 h-4" />
                          <span className="truncate">
                            {item.category}
                            {item.sousCategory ? ` / ${item.sousCategory}` : ""}
                          </span>
                        </div>
                        {item.supplier && (
                          <p className="text-xs text-gray-500 truncate">
                            {item.supplier.name}
                          </p>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 gap-2">
                          <div className="flex items-center gap-1 text-blue-600 font-bold min-w-0">
                            <DollarSign className="w-4 h-4 shrink-0" />
                            <CatalogPrice
                              amount={item.price}
                              visible={!isGuest}
                              className="font-bold text-blue-600"
                              lockedClassName="text-xs font-medium text-gray-500"
                            />
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
                            <Clock className="w-3.5 h-3.5" />
                            {item.deliveryTime}
                          </div>
                        </div>
                        <div className="flex gap-2 mt-auto pt-1">
                          {kind === "machine" && (
                            <button
                              type="button"
                              onClick={() => {
                                if (userRole === "client") {
                                  addToCart({
                                    id: item.id,
                                    name: item.name,
                                    price: item.price,
                                    supplierId: item.supplier?.id || "",
                                    itemType: "machine",
                                  });
                                  setCartOpen(true);
                                } else {
                                  setLoginAlertOpen(true);
                                }
                              }}
                              disabled={item.quantity === 0}
                              className="flex-1 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50"
                            >
                              <ShoppingCart className="w-4 h-4" />
                              {item.quantity === 0 ? "Rupture" : "Réserver"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setDetailsItem(item)}
                            className={`py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 border-2 ${
                              kind === "machine"
                                ? "flex-1 border-blue-600 text-blue-700 hover:bg-blue-50"
                                : "w-full border-amber-600 text-amber-800 hover:bg-amber-50"
                            }`}
                          >
                            <Eye className="w-4 h-4" />
                            Détails
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {items.length > 0 && (
              <div
                ref={loadMoreSentinelRef}
                className="py-8 flex flex-col items-center justify-center gap-2"
              >
                {isLoadingMore && (
                  <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
                )}
                {!hasMore && !isLoadingMore && (
                  <p className="text-sm text-gray-500">
                    Tous les {meta.title.toLowerCase()} ont été chargés
                  </p>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      {detailsItem && (
        <CatalogItemDetailsModal
          item={detailsItem}
          kind={kind}
          onClose={() => setDetailsItem(null)}
          onReserved={() => setCartOpen(true)}
        />
      )}

      <CartPanel isOpen={cartOpen} onClose={() => setCartOpen(false)} />
      <LoginAlert
        isOpen={loginAlertOpen}
        onClose={() => setLoginAlertOpen(false)}
      />
    </div>
  );
}
