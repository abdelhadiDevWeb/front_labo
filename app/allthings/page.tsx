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
  Microscope,
  FlaskConical,
  LayoutGrid,
} from "lucide-react";
import {
  Category,
  PublicCatalogItem,
  PublicProduct,
  getAllProducts,
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
import AppLoadingScreen from "@/components/AppLoadingScreen";
import { useCart } from "@/contexts/CartContext";

type ItemKind = "reactif" | "machine" | "service";
type KindFilter = "all" | ItemKind;

type UnifiedItem = {
  id: string;
  kind: ItemKind;
  name: string;
  brand: string;
  category: string;
  sousCategory?: string;
  deliveryTime?: string;
  price: number;
  quantity: number;
  images: string[];
  supplier?: PublicCatalogItem["supplier"];
  wilaya?: string | null;
  unique_data?: Record<string, unknown> | null;
  id_catgory?: string | null;
  id_sous_catgory?: string | null;
  rawProduct?: PublicProduct;
  rawCatalog?: PublicCatalogItem;
};

const PAGE_SIZE = 48;

const KIND_LABEL: Record<ItemKind, string> = {
  reactif: "Réactif",
  machine: "Machine",
  service: "Service",
};

const KIND_BADGE: Record<ItemKind, string> = {
  reactif: "bg-green-100 text-green-700",
  machine: "bg-blue-100 text-blue-700",
  service: "bg-amber-100 text-amber-800",
};

const productToUnified = (p: PublicProduct): UnifiedItem => ({
  id: p.id,
  kind: "reactif",
  name: p.name,
  brand: p.brand || "",
  category: p.category || "",
  deliveryTime: p.deliveryTime,
  price: p.price,
  quantity: p.quantity,
  images: p.images || [],
  supplier: p.supplier,
  wilaya: p.wilaya,
  unique_data: p.unique_data as Record<string, unknown> | null,
  id_catgory: p.id_catgory,
  id_sous_catgory: p.id_sous_catgory,
  rawProduct: p,
});

const catalogToUnified = (
  item: PublicCatalogItem,
  kind: "machine" | "service"
): UnifiedItem => ({
  id: item.id,
  kind,
  name: item.name,
  brand: item.brand || "",
  category: item.category || "",
  sousCategory: item.sousCategory ?? undefined,
  deliveryTime: item.deliveryTime,
  price: item.price,
  quantity: item.quantity,
  images: item.images || [],
  supplier: item.supplier,
  wilaya: item.wilaya,
  unique_data: item.unique_data ?? null,
  id_catgory: item.id_catgory,
  id_sous_catgory: item.id_sous_catgory,
  rawCatalog: item,
});

export default function AllThingsPage() {
  const [items, setItems] = useState<UnifiedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [cursors, setCursors] = useState<{
    reactif: string | null;
    machine: string | null;
    service: string | null;
  }>({ reactif: null, machine: null, service: null });
  const [hasMoreMap, setHasMoreMap] = useState({
    reactif: false,
    machine: false,
    service: false,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [filterKind, setFilterKind] = useState<KindFilter>("all");
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [filterCategoryId, setFilterCategoryId] = useState("all");
  const [filterSousCategoryId, setFilterSousCategoryId] = useState("all");
  const [filterBrand, setFilterBrand] = useState("all");
  const [filterSupplier, setFilterSupplier] = useState("all");
  const [priceSort, setPriceSort] = useState<"default" | "asc" | "desc">("default");
  const [showFilters, setShowFilters] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(true);
  const [detailsItem, setDetailsItem] = useState<PublicCatalogItem | null>(null);
  const [detailsKind, setDetailsKind] = useState<"machine" | "service">("machine");
  const [cartOpen, setCartOpen] = useState(false);
  const [loginAlertOpen, setLoginAlertOpen] = useState(false);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const loadMoreLockRef = useRef(false);
  const { addToCart } = useCart();
  const {
    location: userLocation,
    status: locationStatus,
    requestBrowserLocation,
  } = useUserLocation();

  const requiresWilayaForCatalog = isGuest || userRole === "client";
  const clientWilayaCode = useMemo(
    () => resolveWilayaCode(userLocation?.wilaya),
    [userLocation?.wilaya]
  );
  const appliesWilayaFilter = requiresWilayaForCatalog && !!clientWilayaCode;

  const hasMore =
    filterKind === "all"
      ? hasMoreMap.reactif || hasMoreMap.machine || hasMoreMap.service
      : hasMoreMap[filterKind];

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
        setDbCategories(result.data.categories || []);
      }
    };
    void loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  const wilayaFilters = useCallback(() => {
    const wilayaCode = resolveWilayaCode(userLocation?.wilaya);
    const hasWilaya = Boolean(wilayaCode || userLocation?.wilaya);
    const canFilterByWilaya =
      requiresWilayaForCatalog && locationStatus === "granted" && hasWilaya;
    if (!canFilterByWilaya) return {};
    if (wilayaCode) return { wilayaCode };
    if (userLocation?.wilaya) return { wilayaCode: userLocation.wilaya };
    return {};
  }, [requiresWilayaForCatalog, locationStatus, userLocation?.wilaya]);

  const loadInitial = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setItems([]);
    setTotalCount(null);
    setCursors({ reactif: null, machine: null, service: null });
    setHasMoreMap({ reactif: false, machine: false, service: false });

    const base = { ...wilayaFilters(), limit: PAGE_SIZE };

    try {
      const [productsRes, machinesRes, servicesRes] = await Promise.all([
        getAllProducts(base),
        getPublicMachines(base),
        getPublicServices(base),
      ]);

      const nextItems: UnifiedItem[] = [];
      let total = 0;

      if (productsRes.success && productsRes.data) {
        nextItems.push(...(productsRes.data.products || []).map(productToUnified));
        total += productsRes.data.totalCount ?? productsRes.data.products?.length ?? 0;
        setCursors((c) => ({ ...c, reactif: productsRes.data?.nextCursor ?? null }));
        setHasMoreMap((h) => ({ ...h, reactif: Boolean(productsRes.data?.hasMore) }));
      }
      if (machinesRes.success && machinesRes.data) {
        nextItems.push(
          ...(machinesRes.data.machines || []).map((m) => catalogToUnified(m, "machine"))
        );
        total += machinesRes.data.totalCount ?? machinesRes.data.machines?.length ?? 0;
        setCursors((c) => ({ ...c, machine: machinesRes.data?.nextCursor ?? null }));
        setHasMoreMap((h) => ({ ...h, machine: Boolean(machinesRes.data?.hasMore) }));
      }
      if (servicesRes.success && servicesRes.data) {
        nextItems.push(
          ...(servicesRes.data.services || []).map((s) => catalogToUnified(s, "service"))
        );
        total += servicesRes.data.totalCount ?? servicesRes.data.services?.length ?? 0;
        setCursors((c) => ({ ...c, service: servicesRes.data?.nextCursor ?? null }));
        setHasMoreMap((h) => ({ ...h, service: Boolean(servicesRes.data?.hasMore) }));
      }

      if (
        !productsRes.success &&
        !machinesRes.success &&
        !servicesRes.success
      ) {
        setError("Erreur lors du chargement du catalogue");
        setTotalCount(0);
      } else {
        setItems(nextItems);
        setTotalCount(total);
      }
    } catch {
      setError("Une erreur est survenue");
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [wilayaFilters]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading || isLoadingMore || loadMoreLockRef.current) return;
    loadMoreLockRef.current = true;
    setIsLoadingMore(true);

    const base = { ...wilayaFilters(), limit: PAGE_SIZE };
    const kindsToLoad: ItemKind[] =
      filterKind === "all" ? ["reactif", "machine", "service"] : [filterKind];

    try {
      const results = await Promise.all(
        kindsToLoad.map(async (kind) => {
          const cursor = cursors[kind];
          if (!hasMoreMap[kind] || !cursor) {
            return { kind, items: [] as UnifiedItem[], nextCursor: null as string | null, more: false };
          }
          if (kind === "reactif") {
            const res = await getAllProducts({ ...base, cursor });
            const list = res.success && res.data ? (res.data.products || []).map(productToUnified) : [];
            return {
              kind,
              items: list,
              nextCursor: res.data?.nextCursor ?? null,
              more: Boolean(res.data?.hasMore),
            };
          }
          if (kind === "machine") {
            const res = await getPublicMachines({ ...base, cursor });
            const list =
              res.success && res.data
                ? (res.data.machines || []).map((m) => catalogToUnified(m, "machine"))
                : [];
            return {
              kind,
              items: list,
              nextCursor: res.data?.nextCursor ?? null,
              more: Boolean(res.data?.hasMore),
            };
          }
          const res = await getPublicServices({ ...base, cursor });
          const list =
            res.success && res.data
              ? (res.data.services || []).map((s) => catalogToUnified(s, "service"))
              : [];
          return {
            kind,
            items: list,
            nextCursor: res.data?.nextCursor ?? null,
            more: Boolean(res.data?.hasMore),
          };
        })
      );

      setItems((prev) => {
        const seen = new Set(prev.map((i) => `${i.kind}:${i.id}`));
        const extra = results.flatMap((r) => r.items).filter((i) => !seen.has(`${i.kind}:${i.id}`));
        return [...prev, ...extra];
      });

      setCursors((prev) => {
        const next = { ...prev };
        for (const r of results) {
          if (r.nextCursor !== undefined) next[r.kind] = r.nextCursor;
        }
        return next;
      });
      setHasMoreMap((prev) => {
        const next = { ...prev };
        for (const r of results) {
          next[r.kind] = r.more;
        }
        return next;
      });
    } catch {
      // keep loaded items
    } finally {
      setIsLoadingMore(false);
      loadMoreLockRef.current = false;
    }
  }, [
    hasMore,
    isLoading,
    isLoadingMore,
    filterKind,
    cursors,
    hasMoreMap,
    wilayaFilters,
  ]);

  useEffect(() => {
    const node = loadMoreSentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { root: null, rootMargin: "320px", threshold: 0 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore, items.length]);

  const categoriesForFilter = useMemo(() => {
    if (filterKind === "all") return dbCategories;
    if (filterKind === "reactif") {
      return dbCategories.filter((c) => (c.type_catgory || "product") === "product");
    }
    if (filterKind === "machine") {
      return dbCategories.filter((c) => c.type_catgory === "machine");
    }
    return dbCategories.filter((c) => c.type_catgory === "services");
  }, [dbCategories, filterKind]);

  const selectedCategory = useMemo(
    () => categoriesForFilter.find((c) => c.id === filterCategoryId),
    [categoriesForFilter, filterCategoryId]
  );
  const availableSousCategories = selectedCategory?.sousCategories ?? [];

  const brands = Array.from(new Set(items.map((i) => i.brand).filter(Boolean))).sort();
  const suppliers = Array.from(
    new Set(items.map((i) => i.supplier?.name).filter(Boolean) as string[])
  ).sort();

  const filteredItems = useMemo(() => {
    const category = categoriesForFilter.find((c) => c.id === filterCategoryId);
    const sousCategories = category?.sousCategories ?? [];

    const matched = items.filter((item) => {
      if (filterKind !== "all" && item.kind !== filterKind) return false;

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
        catalogItemAvailableInWilaya(
          {
            wilaya: item.wilaya,
            unique_data: item.unique_data,
            supplier: item.supplier,
          },
          clientWilayaCode,
          userLocation?.wilaya
        );

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
    filterKind,
    filterCategoryId,
    filterSousCategoryId,
    filterBrand,
    filterSupplier,
    priceSort,
    categoriesForFilter,
    appliesWilayaFilter,
    clientWilayaCode,
    userLocation?.wilaya,
  ]);

  if (isLoading) {
    return <AppLoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <Link
                href="/home"
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                aria-label="Retour"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                <LayoutGrid className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Tout le catalogue
                </h1>
                <p className="text-sm text-gray-500">
                  {totalCount == null
                    ? "…"
                    : `${totalCount} élément${totalCount > 1 ? "s" : ""} au total`}
                  {filterKind !== "all"
                    ? ` · ${filteredItems.length} ${KIND_LABEL[filterKind].toLowerCase()}${
                        filteredItems.length > 1 ? "s" : ""
                      } affiché${filteredItems.length > 1 ? "s" : ""}`
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

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un réactif, une machine ou un service..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-6">
        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          <aside
            className={`bg-white rounded-2xl border border-gray-200 p-4 h-fit lg:sticky lg:top-28 space-y-4 ${
              showFilters ? "block" : "hidden sm:block"
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-gray-900">
              <Filter className="w-4 h-4 text-blue-600" />
              Filtres
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Type</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(
                  [
                    { id: "all", label: "Tout", icon: LayoutGrid },
                    { id: "reactif", label: "Réactifs", icon: Package },
                    { id: "machine", label: "Machines", icon: Microscope },
                    { id: "service", label: "Services", icon: FlaskConical },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setFilterKind(id);
                      setFilterCategoryId("all");
                      setFilterSousCategoryId("all");
                    }}
                    className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                      filterKind === id
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
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
                {categoriesForFilter.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_catgory}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">
                Sous-catégorie
              </label>
              <select
                value={filterSousCategoryId}
                onChange={(e) => setFilterSousCategoryId(e.target.value)}
                disabled={filterCategoryId === "all" || availableSousCategories.length === 0}
                className="mt-1 w-full py-2.5 px-3 border border-gray-300 rounded-xl bg-white disabled:opacity-50"
              >
                <option value="all">Toutes</option>
                {availableSousCategories.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.name_sou_catgory}
                  </option>
                ))}
              </select>
            </div>

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

            <button
              type="button"
              onClick={() => {
                setFilterKind("all");
                setFilterCategoryId("all");
                setFilterSousCategoryId("all");
                setFilterBrand("all");
                setFilterSupplier("all");
                setPriceSort("default");
                setSearchTerm("");
              }}
              className="w-full text-sm text-blue-600 font-medium hover:text-blue-700"
            >
              Réinitialiser
            </button>
          </aside>

          <main>
            {requiresWilayaForCatalog && (
              <CatalogLocationBanner
                isGuest={isGuest}
                locationStatus={locationStatus}
                wilayaLabel={userLocation?.wilaya}
                onRequestLocation={requestBrowserLocation}
                catalogLabel="réactifs, machines et services"
              />
            )}

            {error ? (
              <div className="bg-white rounded-2xl border border-red-200 p-8 text-center text-red-600">
                {error}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <Package className="w-14 h-14 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">Aucun élément trouvé</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredItems.map((item) => {
                  const image =
                    item.images?.[0] != null ? getMediaUrl(item.images[0]) : null;
                  const detailHref =
                    item.kind === "reactif"
                      ? `/products/${item.id}`
                      : item.kind === "machine"
                        ? `/machines/${item.id}`
                        : `/services/${item.id}`;

                  return (
                    <div
                      key={`${item.kind}-${item.id}`}
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
                          className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold ${KIND_BADGE[item.kind]}`}
                        >
                          {KIND_LABEL[item.kind]}
                        </span>
                      </div>
                      <div className="p-4 space-y-2 flex-1 flex flex-col">
                        <h3 className="font-bold text-gray-900 line-clamp-2 group-hover:text-blue-600">
                          {item.name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Building2 className="w-4 h-4" />
                          <span className="truncate">{item.brand || "—"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Tag className="w-4 h-4" />
                          <span className="truncate">
                            {item.category}
                            {item.sousCategory ? ` / ${item.sousCategory}` : ""}
                          </span>
                        </div>
                        {item.supplier && (
                          <p className="text-xs text-gray-500 truncate">{item.supplier.name}</p>
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
                          {item.deliveryTime && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
                              <Clock className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[90px]">{item.deliveryTime}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 pt-2 mt-auto">
                          {(item.kind === "reactif" || item.kind === "machine") && (
                            <button
                              type="button"
                              onClick={() => {
                                if (isGuest) {
                                  setLoginAlertOpen(true);
                                  return;
                                }
                                addToCart({
                                  id: item.id,
                                  name: item.name,
                                  price: item.price,
                                  supplierId: item.supplier?.id || "",
                                  itemType: item.kind === "machine" ? "machine" : "product",
                                });
                                setCartOpen(true);
                              }}
                              disabled={item.quantity === 0}
                              className="flex-1 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50"
                            >
                              <ShoppingCart className="w-4 h-4" />
                              {item.quantity === 0 ? "Rupture" : "Ajouter"}
                            </button>
                          )}
                          {item.kind === "service" || item.kind === "machine" ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (item.rawCatalog) {
                                  setDetailsKind(item.kind === "service" ? "service" : "machine");
                                  setDetailsItem(item.rawCatalog);
                                }
                              }}
                              className="flex-1 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 border-2 border-blue-600 text-blue-700 hover:bg-blue-50"
                            >
                              <Eye className="w-4 h-4" />
                              Détails
                            </button>
                          ) : (
                            <Link
                              href={detailHref}
                              className="flex-1 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                              Voir
                            </Link>
                          )}
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
                  <p className="text-sm text-gray-500">Tout le catalogue a été chargé</p>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      {detailsItem && (
        <CatalogItemDetailsModal
          item={detailsItem}
          kind={detailsKind}
          onClose={() => setDetailsItem(null)}
          onReserved={() => setCartOpen(true)}
        />
      )}
      <CartPanel isOpen={cartOpen} onClose={() => setCartOpen(false)} />
      <LoginAlert isOpen={loginAlertOpen} onClose={() => setLoginAlertOpen(false)} />
    </div>
  );
}
