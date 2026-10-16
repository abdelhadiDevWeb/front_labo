"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Loader2, Search, X, Package, Check } from "lucide-react";
import {
  getSupplierProducts,
  getSupplierMachines,
  getSupplierServices,
  CatalogItemType,
  Product,
  UniqueDataItem,
} from "@/lib/api";
import { getMediaUrl } from "@/lib/media-url";

export type SupplierCatalogOption = {
  id: string;
  kind: CatalogItemType;
  name: string;
  price: number;
  brand?: string;
  images: string[];
  video?: string;
  unique_data?: Record<string, unknown>;
};

type Props = {
  kind: CatalogItemType;
  value: string;
  onChange: (id: string, option: SupplierCatalogOption | null) => void;
  /** Hide these ids from results (e.g. already selected free gift / active sponsor). */
  excludeIds?: string[];
  /** Extra client filter after backend results (prefer excludeIds when possible). */
  filterOption?: (option: SupplierCatalogOption) => boolean;
  placeholder?: string;
  emptyLabel?: string;
  focusRingClassName?: string;
  disabled?: boolean;
  /** Prefill label when editing an existing selection. */
  selectedLabel?: string;
  limit?: number;
};

const NAME_KEYS = ["name", "Nom", "nom", "Désignation", "designation"];
const BRAND_KEYS = ["brand", "Marque", "marque"];
const PRICE_KEYS = ["sellingPrice", "Prix TTC", "prixTTC", "price", "Prix"];

const pickStr = (data: Record<string, unknown> | undefined, keys: string[]): string => {
  if (!data) return "";
  for (const key of keys) {
    const v = data[key];
    if (v !== undefined && v !== null && String(v).trim()) return String(v).trim();
  }
  const lower = new Map(
    Object.entries(data).map(([k, v]) => [k.toLowerCase().trim(), v])
  );
  for (const key of keys) {
    const v = lower.get(key.toLowerCase().trim());
    if (v !== undefined && v !== null && String(v).trim()) return String(v).trim();
  }
  return "";
};

const toPrice = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = parseFloat(value.replace(",", ".").replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

const productToOption = (product: Product): SupplierCatalogOption => {
  const d = (product.unique_data || {}) as Record<string, unknown>;
  return {
    id: product.id,
    kind: "product",
    name:
      pickStr(d, NAME_KEYS) ||
      (product.name ? String(product.name).trim() : "") ||
      "Produit",
    price: toPrice(pickStr(d, PRICE_KEYS) || product.sellingPrice) || 0,
    brand: pickStr(d, BRAND_KEYS) || product.brand || undefined,
    images: product.images?.length
      ? product.images
      : Array.isArray(d.images)
        ? (d.images as string[]).filter(Boolean)
        : [],
    video: product.video || pickStr(d, ["video"]) || undefined,
    unique_data: d,
  };
};

const uniqueDataToOption = (
  item: UniqueDataItem,
  kind: "machine" | "service"
): SupplierCatalogOption => {
  const d = (item.unique_data || {}) as Record<string, unknown>;
  const images = Array.isArray(d.images)
    ? (d.images as string[]).filter(Boolean)
    : [];
  return {
    id: String(item.id),
    kind,
    name: pickStr(d, NAME_KEYS) || (kind === "machine" ? "Machine" : "Service"),
    price: toPrice(pickStr(d, PRICE_KEYS)),
    brand: pickStr(d, BRAND_KEYS) || undefined,
    images,
    video: pickStr(d, ["video"]) || undefined,
    unique_data: d,
  };
};

const formatPrice = (price: number) =>
  price > 0 ? `${price.toFixed(2)} DA` : "prix non défini";

const DEBOUNCE_MS = 300;
const DEFAULT_LIMIT = 20;

export default function SupplierCatalogSearchSelect({
  kind,
  value,
  onChange,
  excludeIds = [],
  filterOption,
  placeholder = "Rechercher par nom, marque…",
  emptyLabel = "Aucun résultat",
  focusRingClassName = "focus:ring-green-500 focus:border-green-500",
  disabled = false,
  selectedLabel,
  limit = DEFAULT_LIMIT,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef(0);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [options, setOptions] = useState<SupplierCatalogOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selectedCache, setSelectedCache] = useState<SupplierCatalogOption | null>(
    null
  );

  const excludeKey = useMemo(
    () =>
      excludeIds
        .filter(Boolean)
        .map(String)
        .sort()
        .join(","),
    [excludeIds]
  );

  const excludeList = useMemo(
    () => (excludeKey ? excludeKey.split(",") : []),
    [excludeKey]
  );

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setQuery("");
    setDebouncedQuery("");
    setOptions([]);
    setError(null);
    setHasMore(false);
    setNextCursor(null);
    if (!value) setSelectedCache(null);
  }, [kind]);

  useEffect(() => {
    if (!value) {
      setSelectedCache(null);
      return;
    }
    if (selectedCache?.id === value) return;
    if (selectedLabel) {
      setSelectedCache({
        id: value,
        kind,
        name: selectedLabel,
        price: 0,
        images: [],
      });
    }
  }, [value, selectedLabel, kind, selectedCache?.id]);

  const mapResult = useCallback(
    (
      kindValue: CatalogItemType,
      data:
        | { products?: Product[]; machines?: UniqueDataItem[]; services?: UniqueDataItem[] }
        | undefined
    ): SupplierCatalogOption[] => {
      const excluded = new Set(excludeList);
      let mapped: SupplierCatalogOption[] =
        kindValue === "product"
          ? (data?.products || []).map(productToOption)
          : kindValue === "machine"
            ? (data?.machines || []).map((m) => uniqueDataToOption(m, "machine"))
            : (data?.services || []).map((s) => uniqueDataToOption(s, "service"));

      if (excluded.size > 0) {
        mapped = mapped.filter((o) => !excluded.has(o.id));
      }
      if (filterOption) mapped = mapped.filter(filterOption);
      return mapped;
    },
    [excludeList, filterOption]
  );

  const fetchPage = useCallback(
    async (search: string, cursor?: string | null, append = false) => {
      const reqId = ++requestIdRef.current;
      if (append) setIsLoadingMore(true);
      else setIsLoading(true);
      setError(null);
      try {
        const params = {
          search: search || undefined,
          limit,
          cursor: cursor || undefined,
          excludeIds: excludeList.length ? excludeList : undefined,
        };
        const result =
          kind === "product"
            ? await getSupplierProducts(params)
            : kind === "machine"
              ? await getSupplierMachines(params)
              : await getSupplierServices(params);

        if (reqId !== requestIdRef.current) return;

        if (!result.success || !result.data) {
          if (!append) setOptions([]);
          setHasMore(false);
          setNextCursor(null);
          setError(result.message || "Recherche impossible");
          return;
        }

        const mapped = mapResult(kind, result.data);
        setOptions((prev) => {
          if (!append) return mapped;
          const seen = new Set(prev.map((o) => o.id));
          return [...prev, ...mapped.filter((o) => !seen.has(o.id))];
        });
        setHasMore(Boolean(result.data.hasMore));
        setNextCursor(result.data.nextCursor || null);
      } catch {
        if (reqId !== requestIdRef.current) return;
        if (!append) setOptions([]);
        setHasMore(false);
        setNextCursor(null);
        setError("Une erreur est survenue");
      } finally {
        if (reqId === requestIdRef.current) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [kind, limit, excludeList, mapResult]
  );

  useEffect(() => {
    if (!open) return;
    void fetchPage(debouncedQuery, null, false);
  }, [open, debouncedQuery, fetchPage]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const displaySelected =
    selectedCache && selectedCache.id === value
      ? selectedCache
      : options.find((o) => o.id === value) || null;

  const handleSelect = (option: SupplierCatalogOption) => {
    setSelectedCache(option);
    onChange(option.id, option);
    setQuery("");
    setOpen(false);
  };

  const handleClear = () => {
    setSelectedCache(null);
    onChange("", null);
    setQuery("");
  };

  return (
    <div ref={rootRef} className="relative">
      {value && displaySelected && !open ? (
        <div className="flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5">
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-gray-100 flex items-center justify-center">
            {displaySelected.images[0] ? (
              <img
                src={getMediaUrl(displaySelected.images[0]) || ""}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <Package className="h-4 w-4 text-gray-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900">
              {displaySelected.name}
            </p>
            <p className="truncate text-xs text-gray-500">
              {[displaySelected.brand, formatPrice(displaySelected.price)]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={() => {
                setOpen(true);
                setQuery("");
              }}
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              Changer
            </button>
          )}
          {!disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Effacer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={query}
            disabled={disabled}
            placeholder={placeholder}
            autoComplete="off"
            aria-expanded={open}
            aria-controls={listId}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            className={`w-full rounded-xl border-2 border-gray-200 bg-white py-3 pl-10 pr-10 text-sm outline-none transition-all focus:ring-2 ${focusRingClassName} disabled:bg-gray-50 disabled:text-gray-400`}
          />
          {isLoading ? (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
          ) : query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Effacer la recherche"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      )}

      {open && (
        <div
          id={listId}
          role="listbox"
          className="absolute z-40 mt-1.5 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
        >
          <div className="max-h-64 overflow-y-auto">
            {error ? (
              <p className="px-4 py-3 text-sm text-red-600">{error}</p>
            ) : isLoading && options.length === 0 ? (
              <div className="flex items-center gap-2 px-4 py-4 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Recherche…
              </div>
            ) : options.length === 0 ? (
              <p className="px-4 py-4 text-sm text-gray-500">
                {debouncedQuery
                  ? emptyLabel
                  : "Aucun élément disponible. Tapez un nom, une marque ou une catégorie pour rechercher dans tout votre catalogue."}
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {options.map((option) => {
                  const selected = option.id === value;
                  const thumb = option.images[0]
                    ? getMediaUrl(option.images[0])
                    : null;
                  return (
                    <li key={option.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => handleSelect(option)}
                        className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-emerald-50 ${
                          selected ? "bg-emerald-50/80" : ""
                        }`}
                      >
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-gray-100 flex items-center justify-center">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Package className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {option.name}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {[option.brand, formatPrice(option.price)]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                        {selected ? (
                          <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {hasMore || (!debouncedQuery && options.length > 0) ? (
            <div className="border-t border-gray-100 bg-gray-50 px-3 py-2 space-y-1.5">
              {hasMore ? (
                <button
                  type="button"
                  disabled={isLoadingMore || !nextCursor}
                  onClick={() => void fetchPage(debouncedQuery, nextCursor, true)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Chargement…
                    </>
                  ) : (
                    "Afficher plus de résultats"
                  )}
                </button>
              ) : null}
              <p className="text-center text-[11px] text-gray-500">
                {debouncedQuery
                  ? "Continuez à taper pour affiner — recherche serveur"
                  : "Tapez pour chercher parmi tous vos articles (pas seulement cette page)"}
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
