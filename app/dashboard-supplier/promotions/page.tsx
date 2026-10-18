"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { createPortal } from "react-dom";
import {
  Percent,
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  Loader2,
  Package,
  Calendar,
  CheckCircle,
  AlertCircle,
  ShoppingBag,
  FlaskConical,
  Cpu,
  Wrench,
  Gift,
  Image as ImageIcon,
} from "lucide-react";
import SupplierCatalogSearchSelect, {
  type SupplierCatalogOption,
} from "@/components/SupplierCatalogSearchSelect";
import {
  getSupplierPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
  CatalogItemType,
  Promotion,
} from "@/lib/api";
import { getMediaUrl } from "@/lib/media-url";

type OfferType = "price" | "gift";

const OFFER_OPTIONS: {
  type: OfferType;
  title: string;
  text: string;
  Icon: typeof Percent;
}[] = [
  {
    type: "price",
    title: "Réduction de prix",
    text: "Baissez le prix à partir d'une quantité minimum",
    Icon: Percent,
  },
  {
    type: "gift",
    title: "Produit offert",
    text: "Le labo reçoit un article gratuit en achetant celui-ci",
    Icon: Gift,
  },
];

const KIND_OPTIONS: {
  kind: CatalogItemType;
  label: string;
  article: string;
  Icon: typeof FlaskConical;
}[] = [
  { kind: "product", label: "Produit", article: "un produit", Icon: FlaskConical },
  { kind: "machine", label: "Machine", article: "une machine", Icon: Cpu },
  { kind: "service", label: "Service", article: "un service", Icon: Wrench },
];

const kindOption = (kind: CatalogItemType) =>
  KIND_OPTIONS.find((o) => o.kind === kind) ?? KIND_OPTIONS[0];

const kindBadgeClass = (kind: CatalogItemType) =>
  kind === "product"
    ? "bg-green-100 text-green-700"
    : kind === "machine"
      ? "bg-blue-100 text-blue-700"
      : "bg-amber-100 text-amber-800";

type PromotionFormState = {
  offerType: OfferType;
  itemType: CatalogItemType;
  id_product: string;
  id_product_free: string;
  productLabel: string;
  productImage: string;
  freeLabel: string;
  freeImage: string;
  freePrice: string;
  normal_price: string;
  price_discount: string;
  min_quantity: string;
  start_day: string;
  end_day: string;
};

const emptyForm: PromotionFormState = {
  offerType: "price",
  itemType: "product",
  id_product: "",
  id_product_free: "",
  productLabel: "",
  productImage: "",
  freeLabel: "",
  freeImage: "",
  freePrice: "",
  price_discount: "",
  normal_price: "",
  min_quantity: "1",
  start_day: "",
  end_day: "",
};

const DECIMAL_INPUT = /^\d*([.,]\d*)?$/;
const INTEGER_INPUT = /^\d*$/;

function normalizeDecimalInput(value: string) {
  return value.replace(",", ".");
}

function parseFormNumbers(form: PromotionFormState) {
  return {
    normal_price: parseFloat(normalizeDecimalInput(form.normal_price)),
    price_discount: parseFloat(normalizeDecimalInput(form.price_discount)),
    min_quantity: parseInt(form.min_quantity, 10),
  };
}

function toDateInputValue(value: string | Date) {
  const d = new Date(value);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

function getPromotionStatus(promotion: Promotion) {
  const now = new Date();
  const start = new Date(promotion.start_day);
  const end = new Date(promotion.end_day);
  end.setHours(23, 59, 59, 999);

  if (now < start) return { label: "À venir", className: "bg-blue-100 text-blue-800" };
  if (now > end) return { label: "Expirée", className: "bg-gray-100 text-gray-700" };
  return { label: "Active", className: "bg-green-100 text-green-800" };
}

function discountPercent(normal: number, discount: number) {
  if (normal <= 0) return 0;
  return Math.round(((normal - discount) / normal) * 100);
}

function SelectedItemCard({
  label,
  name,
  image,
  price,
  tone,
}: {
  label: string;
  name: string;
  image: string;
  price: string;
  tone: "green" | "amber";
}) {
  const priceNum = parseFloat(normalizeDecimalInput(price));
  const toneClass =
    tone === "green"
      ? "border-green-200 bg-green-50/70 text-green-800"
      : "border-amber-200 bg-amber-50/70 text-amber-800";
  return (
    <div className={`mt-2 flex items-center gap-3 rounded-xl border p-2.5 ${toneClass}`}>
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-white bg-white">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={getMediaUrl(image) || ""} alt="" className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-5 w-5 text-gray-300" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wide">{label}</p>
        <p className="truncate text-sm font-semibold text-gray-900">{name}</p>
        <p className="text-xs text-gray-600">
          {Number.isFinite(priceNum) && priceNum > 0
            ? `Prix actuel : ${priceNum.toLocaleString("fr-FR")} DA`
            : "Aucun prix défini"}
        </p>
      </div>
    </div>
  );
}

function PromotionFormFields({
  form,
  setForm,
  onKindChange,
  onProductSelect,
  onOfferTypeChange,
  isUpdate,
}: {
  form: PromotionFormState;
  setForm: Dispatch<SetStateAction<PromotionFormState>>;
  onKindChange: (kind: CatalogItemType, isUpdate?: boolean) => void;
  onProductSelect: (
    productId: string,
    option: SupplierCatalogOption | null,
    isUpdate?: boolean
  ) => void;
  onOfferTypeChange: (type: OfferType, isUpdate?: boolean) => void;
  isUpdate?: boolean;
}) {
  const normalNum = parseFloat(normalizeDecimalInput(form.normal_price));
  const discountNum = parseFloat(normalizeDecimalInput(form.price_discount));
  const option = kindOption(form.itemType);
  const hasSelected = Boolean(form.id_product);
  const normalPriceLocked = hasSelected && parseFloat(form.normal_price) > 0;
  const isGift = form.offerType === "gift";

  return (
    <>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Type d&apos;offre <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {OFFER_OPTIONS.map(({ type, title, text, Icon }) => {
            const selected = form.offerType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => onOfferTypeChange(type, isUpdate)}
                className={`flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                  selected
                    ? type === "gift"
                      ? "border-amber-500 bg-amber-50 ring-2 ring-amber-200"
                      : "border-green-600 bg-green-50 ring-2 ring-green-200"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    type === "gift" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-gray-900">{title}</span>
                  <span className="block text-xs text-gray-500">{text}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Catalogue <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {KIND_OPTIONS.map(({ kind, label, Icon }) => {
            const selected = form.itemType === kind;
            return (
              <button
                key={kind}
                type="button"
                onClick={() => onKindChange(kind, isUpdate)}
                className={`flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-3 text-sm font-semibold transition-all ${
                  selected
                    ? "border-green-600 bg-green-50 text-green-900 ring-2 ring-green-200"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {option.label} <span className="text-red-500">*</span>
        </label>
        <SupplierCatalogSearchSelect
          kind={form.itemType}
          value={form.id_product}
          selectedLabel={form.productLabel || undefined}
          onChange={(id, selected) => onProductSelect(id, selected, isUpdate)}
          placeholder={`Rechercher ${option.article}…`}
          emptyLabel={`Aucun ${option.label.toLowerCase()} trouvé`}
          focusRingClassName="focus:ring-green-500 focus:border-green-500"
        />
        {hasSelected ? (
          <SelectedItemCard
            label={isGift ? "Article à acheter" : "Article en promotion"}
            name={form.productLabel}
            image={form.productImage}
            price={form.normal_price}
            tone="green"
          />
        ) : (
          <p className="text-xs text-gray-500 mt-2">
            Tapez pour rechercher dans votre catalogue (recherche serveur).
          </p>
        )}
      </div>

      {isGift && hasSelected && !normalPriceLocked && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Prix / unité (DA) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            inputMode="decimal"
            required
            autoComplete="off"
            placeholder="Ex: 2000"
            value={form.normal_price}
            onChange={(e) => {
              const value = e.target.value.replace(/[^\d.,]/g, "");
              if (DECIMAL_INPUT.test(value) || value === "") {
                setForm((prev) => ({ ...prev, normal_price: value }));
              }
            }}
            className="w-full px-4 py-3 border-2 border-green-200 rounded-xl outline-none bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Aucun prix défini pour ce {option.label.toLowerCase()} — saisissez son prix
          </p>
        </div>
      )}

      {!isGift && (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Prix normal / unité (DA) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            inputMode="decimal"
            required
            readOnly={normalPriceLocked || !hasSelected}
            autoComplete="off"
            placeholder={hasSelected ? "Ex: 2000" : `Sélectionnez ${option.article}`}
            value={form.normal_price}
            onChange={(e) => {
              const value = e.target.value.replace(/[^\d.,]/g, "");
              if (DECIMAL_INPUT.test(value) || value === "") {
                setForm((prev) => ({ ...prev, normal_price: value }));
              }
            }}
            className={`w-full px-4 py-3 border-2 rounded-xl outline-none ${
              normalPriceLocked || !hasSelected
                ? "border-gray-200 bg-gray-50 text-gray-700 cursor-default"
                : "border-green-200 bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
            }`}
          />
          <p className="text-xs text-gray-500 mt-1">
            {hasSelected && !normalPriceLocked
              ? `Aucun prix défini pour ce ${option.label.toLowerCase()} — saisissez le prix normal`
              : `Prix de vente actuel ${
                  form.itemType === "machine"
                    ? "de la machine"
                    : form.itemType === "service"
                      ? "du service"
                      : "du produit"
                }`}
          </p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Prix promo / unité (DA) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            inputMode="decimal"
            required
            autoComplete="off"
            placeholder={
              normalNum > 0 ? `Inférieur à ${normalNum.toLocaleString("fr-FR")}` : "Ex: 1500"
            }
            value={form.price_discount}
            onChange={(e) => {
              const value = e.target.value.replace(/[^\d.,]/g, "");
              if (DECIMAL_INPUT.test(value) || value === "") {
                setForm((prev) => ({ ...prev, price_discount: value }));
              }
            }}
            className="w-full px-4 py-3 border-2 border-green-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white"
          />
          <p className="text-xs text-gray-500 mt-1">
            Saisissez le prix promotionnel (chiffres uniquement)
          </p>
          {!Number.isNaN(normalNum) &&
            !Number.isNaN(discountNum) &&
            normalNum > 0 &&
            form.price_discount !== "" && (
              <p
                className={`text-xs mt-1 ${discountNum < normalNum ? "text-green-700" : "text-red-600"}`}
              >
                {discountNum < normalNum
                  ? `Réduction: ${discountPercent(normalNum, discountNum)}%`
                  : "Le prix promo doit être inférieur au prix actuel"}
              </p>
            )}
        </div>
      </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {isGift ? "Quantité à acheter pour recevoir le cadeau" : "Quantité minimum à acheter"}{" "}
          <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          inputMode="numeric"
          required
          placeholder="1"
          value={form.min_quantity}
          onChange={(e) => {
            const value = e.target.value;
            if (INTEGER_INPUT.test(value)) {
              setForm((prev) => ({ ...prev, min_quantity: value }));
            }
          }}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
        />
        <p className="text-xs text-gray-500 mt-1">
          {isGift
            ? "Le labo reçoit le cadeau dès qu'il achète cette quantité."
            : "Le client doit acheter au moins cette quantité pour bénéficier du prix promotionnel."}
        </p>
      </div>

      {isGift && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {option.label} offert{form.itemType === "machine" ? "e" : ""} gratuitement{" "}
            <span className="text-red-500">*</span>
          </label>
          <SupplierCatalogSearchSelect
            kind={form.itemType}
            value={form.id_product_free}
            selectedLabel={form.freeLabel || undefined}
            excludeIds={form.id_product ? [form.id_product] : []}
            disabled={!hasSelected}
            onChange={(id, selected) =>
              setForm((prev) => ({
                ...prev,
                id_product_free: id,
                freeLabel: selected?.name || "",
                freeImage: selected?.images?.[0] || "",
                freePrice: selected && selected.price > 0 ? String(selected.price) : "",
              }))
            }
            placeholder={
              hasSelected
                ? `Rechercher ${option.article} à offrir…`
                : `Choisissez d'abord ${option.article} à acheter`
            }
            emptyLabel={`Aucun ${option.label.toLowerCase()} trouvé`}
            focusRingClassName="focus:ring-amber-500 focus:border-amber-500"
          />
          {form.id_product_free ? (
            <SelectedItemCard
              label="Offert gratuitement"
              name={form.freeLabel}
              image={form.freeImage}
              price={form.freePrice}
              tone="amber"
            />
          ) : (
            <p className="text-xs text-gray-500 mt-1">
              Cet article est donné gratuitement au labo quand il achète le premier.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Date de début <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            required
            value={form.start_day || ""}
            onChange={(e) => setForm((prev) => ({ ...prev, start_day: e.target.value }))}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Date de fin <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            required
            value={form.end_day || ""}
            onChange={(e) => setForm((prev) => ({ ...prev, end_day: e.target.value }))}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
          />
        </div>
      </div>
    </>
  );
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [createForm, setCreateForm] = useState<PromotionFormState>(emptyForm);
  const [updateForm, setUpdateForm] = useState<PromotionFormState>(emptyForm);

  useEffect(() => {
    setMounted(true);
    void loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const promotionsResult = await getSupplierPromotions();
      if (promotionsResult.success && promotionsResult.data) {
        setPromotions(promotionsResult.data.promotions);
      } else if (!promotionsResult.success) {
        setError(promotionsResult.message || "Erreur lors du chargement des promotions");
      }
    } catch {
      setError("Une erreur est survenue lors du chargement");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKindChange = (kind: CatalogItemType, isUpdate = false) => {
    const setForm = isUpdate ? setUpdateForm : setCreateForm;
    setForm((prev) =>
      prev.itemType === kind
        ? prev
        : {
            ...prev,
            itemType: kind,
            id_product: "",
            id_product_free: "",
            productLabel: "",
            productImage: "",
            freeLabel: "",
            freeImage: "",
            freePrice: "",
            normal_price: "",
            price_discount: "",
          }
    );
  };

  const handleOfferTypeChange = (type: OfferType, isUpdate = false) => {
    const setForm = isUpdate ? setUpdateForm : setCreateForm;
    setForm((prev) =>
      prev.offerType === type
        ? prev
        : type === "price"
          ? {
              ...prev,
              offerType: type,
              id_product_free: "",
              freeLabel: "",
              freeImage: "",
              freePrice: "",
              price_discount: "",
            }
          : { ...prev, offerType: type, price_discount: "" }
    );
  };

  /** Gift offers keep the item at its current price; price offers need a real discount. */
  const buildPromotionPayload = (form: PromotionFormState): {
    error?: string;
    normal_price?: number;
    price_discount?: number;
    min_quantity?: number;
    id_product_free?: string | null;
  } => {
    const parsed = parseFormNumbers(form);
    if (
      !form.id_product ||
      !form.start_day ||
      !form.end_day ||
      Number.isNaN(parsed.normal_price) ||
      Number.isNaN(parsed.min_quantity)
    ) {
      return { error: "Veuillez remplir tous les champs correctement" };
    }
    if (form.offerType === "gift") {
      if (!form.id_product_free) {
        return { error: "Choisissez l'article offert gratuitement" };
      }
      return {
        normal_price: parsed.normal_price,
        price_discount: parsed.normal_price,
        min_quantity: parsed.min_quantity,
        id_product_free: form.id_product_free,
      };
    }
    if (Number.isNaN(parsed.price_discount)) {
      return { error: "Saisissez le prix promotionnel" };
    }
    if (parsed.price_discount >= parsed.normal_price) {
      return { error: "Le prix promotionnel doit être inférieur au prix actuel" };
    }
    return {
      normal_price: parsed.normal_price,
      price_discount: parsed.price_discount,
      min_quantity: parsed.min_quantity,
      id_product_free: null,
    };
  };

  const handleProductSelect = (
    productId: string,
    option: SupplierCatalogOption | null,
    isUpdate = false
  ) => {
    const setForm = isUpdate ? setUpdateForm : setCreateForm;
    setForm((prev) => {
      if (!productId || !option) {
        return {
          ...prev,
          id_product: "",
          productLabel: "",
          productImage: "",
          normal_price: "",
        };
      }
      const freeIsSame = prev.id_product_free === productId;
      return {
        ...prev,
        id_product: productId,
        productLabel: option.name,
        productImage: option.images?.[0] || "",
        normal_price: option.price > 0 ? String(option.price) : "",
        price_discount:
          isUpdate || prev.id_product === productId ? prev.price_discount : "",
        id_product_free: freeIsSame ? "" : prev.id_product_free,
        freeLabel: freeIsSame ? "" : prev.freeLabel,
        freeImage: freeIsSame ? "" : prev.freeImage,
        freePrice: freeIsSame ? "" : prev.freePrice,
      };
    });
  };

  const filteredPromotions = promotions.filter((promotion) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      promotion.product?.name.toLowerCase().includes(q) ||
      promotion.freeProduct?.name?.toLowerCase().includes(q) ||
      kindOption(promotion.itemType || "product").label.toLowerCase().includes(q) ||
      promotion.id.toLowerCase().includes(q) ||
      promotion.normal_price.toString().includes(q) ||
      promotion.price_discount.toString().includes(q)
    );
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = buildPromotionPayload(createForm);
      if (payload.error) {
        setError(payload.error);
        setIsSubmitting(false);
        return;
      }

      const result = await createPromotion({
        itemType: createForm.itemType,
        id_product: createForm.id_product,
        id_product_free: payload.id_product_free ?? null,
        start_day: createForm.start_day,
        end_day: createForm.end_day,
        normal_price: payload.normal_price!,
        price_discount: payload.price_discount!,
        min_quantity: payload.min_quantity!,
      });

      if (result.success) {
        setSuccess("Promotion créée avec succès");
        setShowCreateModal(false);
        setCreateForm(emptyForm);
        await loadData();
      } else {
        setError(result.message || "Erreur lors de la création");
      }
    } catch {
      setError("Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenUpdate = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setUpdateForm({
      offerType: promotion.id_product_free ? "gift" : "price",
      itemType: promotion.itemType || "product",
      id_product: promotion.id_product,
      id_product_free: promotion.id_product_free || "",
      productLabel: promotion.product?.name || "",
      productImage: promotion.product?.images?.[0] || "",
      freeLabel: promotion.freeProduct?.name || "",
      freeImage: promotion.freeProduct?.images?.[0] || "",
      freePrice:
        promotion.freeProduct?.sellingPrice && promotion.freeProduct.sellingPrice > 0
          ? String(promotion.freeProduct.sellingPrice)
          : "",
      price_discount: String(promotion.price_discount),
      normal_price: String(promotion.normal_price),
      min_quantity: String(promotion.min_quantity),
      start_day: toDateInputValue(promotion.start_day),
      end_day: toDateInputValue(promotion.end_day),
    });
    setShowUpdateModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPromotion) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = buildPromotionPayload(updateForm);
      if (payload.error) {
        setError(payload.error);
        setIsSubmitting(false);
        return;
      }

      const result = await updatePromotion(selectedPromotion.id, {
        itemType: updateForm.itemType,
        id_product: updateForm.id_product,
        id_product_free: payload.id_product_free ?? null,
        start_day: updateForm.start_day,
        end_day: updateForm.end_day,
        normal_price: payload.normal_price!,
        price_discount: payload.price_discount!,
        min_quantity: payload.min_quantity!,
      });

      if (result.success) {
        setSuccess("Promotion mise à jour avec succès");
        setShowUpdateModal(false);
        setSelectedPromotion(null);
        await loadData();
      } else {
        setError(result.message || "Erreur lors de la mise à jour");
      }
    } catch {
      setError("Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (promotionId: string) => {
    if (!confirm("Supprimer cette promotion ?")) return;

    setDeletingId(promotionId);
    setError(null);
    setSuccess(null);

    try {
      const result = await deletePromotion(promotionId);
      if (result.success) {
        setSuccess("Promotion supprimée avec succès");
        await loadData();
      } else {
        setError(result.message || "Erreur lors de la suppression");
      }
    } catch {
      setError("Une erreur est survenue");
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-12 h-12 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Percent className="w-8 h-8 text-green-600" />
            Promotions
          </h1>
          <p className="text-gray-600 mt-1">
            Créez des remises sur vos produits, machines ou services par quantité et période
          </p>
        </div>
        <button
          onClick={() => {
            setCreateForm(emptyForm);
            setShowCreateModal(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700"
        >
          <Plus className="w-5 h-5" />
          Nouvelle promotion
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800">
          <AlertCircle className="w-5 h-5 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3 text-green-800">
          <CheckCircle className="w-5 h-5 mt-0.5" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher une promotion..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
          />
        </div>

        {filteredPromotions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                  <th className="py-3 px-3 font-semibold">Élément</th>
                  <th className="py-3 px-3 font-semibold">Offert gratuit</th>
                  <th className="py-3 px-3 font-semibold">Prix normal</th>
                  <th className="py-3 px-3 font-semibold">Prix promo</th>
                  <th className="py-3 px-3 font-semibold">Qté min.</th>
                  <th className="py-3 px-3 font-semibold">Période</th>
                  <th className="py-3 px-3 font-semibold">Statut</th>
                  <th className="py-3 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPromotions.map((promotion) => {
                  const status = getPromotionStatus(promotion);
                  return (
                    <tr key={promotion.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-3 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <span>{promotion.product?.name || promotion.id_product}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${kindBadgeClass(promotion.itemType || "product")}`}
                          >
                            {kindOption(promotion.itemType || "product").label}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-sm text-amber-800">
                        {promotion.freeProduct?.name || (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3">{promotion.normal_price.toLocaleString("fr-FR")} DA</td>
                      <td className="py-3 px-3 text-green-700 font-semibold">
                        {promotion.price_discount < promotion.normal_price ? (
                          <>
                            {promotion.price_discount.toLocaleString("fr-FR")} DA
                            <span className="text-xs text-gray-500 ml-1">
                              (-{discountPercent(promotion.normal_price, promotion.price_discount)}%)
                            </span>
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                            <Gift className="h-3.5 w-3.5" />
                            Produit offert
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1">
                          <ShoppingBag className="w-4 h-4 text-gray-400" />
                          {promotion.min_quantity}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-sm text-gray-600">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {toDateInputValue(promotion.start_day)} →{" "}
                          {toDateInputValue(promotion.end_day)}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenUpdate(promotion)}
                            className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                          >
                            <Edit className="w-4 h-4" />
                            Modifier
                          </button>
                          <button
                            onClick={() => handleDelete(promotion.id)}
                            disabled={deletingId === promotion.id}
                            className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
                          >
                            {deletingId === promotion.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchQuery ? "Aucune promotion trouvée" : "Aucune promotion pour le moment"}
            </p>
          </div>
        )}
      </div>

      {mounted &&
        showCreateModal &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 flex items-center justify-between rounded-t-2xl">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Plus className="w-6 h-6" />
                  Nouvelle promotion
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-white/80 hover:text-white p-2"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <PromotionFormFields
                  form={createForm}
                  setForm={setCreateForm}
                  onKindChange={handleKindChange}
                  onProductSelect={handleProductSelect}
                  onOfferTypeChange={handleOfferTypeChange}
                />
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-3 border rounded-xl"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Créer
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {mounted &&
        showUpdateModal &&
        selectedPromotion &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 flex items-center justify-between rounded-t-2xl">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Edit className="w-6 h-6" />
                  Modifier la promotion
                </h3>
                <button
                  onClick={() => setShowUpdateModal(false)}
                  className="text-white/80 hover:text-white p-2"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleUpdate} className="p-6 space-y-4">
                <PromotionFormFields
                  form={updateForm}
                  setForm={setUpdateForm}
                  onKindChange={handleKindChange}
                  onProductSelect={handleProductSelect}
                  onOfferTypeChange={handleOfferTypeChange}
                  isUpdate
                />
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowUpdateModal(false)}
                    className="flex-1 px-4 py-3 border rounded-xl"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Enregistrer
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
