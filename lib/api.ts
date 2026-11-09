const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

export type UserOut = {
  id: string;
  name: string;
  phone: string | null;
  email: string;
  role: "buyer" | "owner";
  status: "pending" | "approved" | "rejected";
};

export type Token = {
  access_token: string;
  token_type: string;
  user: UserOut;
};

// What the listing is offered as — mirrors the backend's OfferType enum.
// Every listing declares one; rows that predate the field fall back to "sale".
export type OfferType = "sale" | "rent" | "resale";

export const OFFER_TYPE_LABELS: Record<OfferType, string> = {
  sale: "For Sale",
  rent: "For Rent",
  resale: "Resale",
};

// How often rent is charged. The backend requires this on rentals and rejects it on
// sale/resale, so it must be sent only alongside offer_type "rent".
export type RentPeriod = "monthly" | "yearly";

export const RENT_PERIOD_LABELS: Record<RentPeriod, string> = {
  monthly: "Per month",
  yearly: "Per year",
};

// Compact suffix for prices, e.g. "$12,000 /mo".
export const RENT_PERIOD_SUFFIX: Record<RentPeriod, string> = {
  monthly: "/mo",
  yearly: "/yr",
};

// "$12,000" for a sale, "$12,000 /mo" for a rental — a rent figure on its own doesn't
// say what it buys you.
export function formatListingPrice(listing: Pick<ListingOut, "price" | "rent_period">): string {
  const price = `$${listing.price.toLocaleString()}`;
  return listing.rent_period ? `${price} ${RENT_PERIOD_SUFFIX[listing.rent_period]}` : price;
}

export type ListingOut = {
  id: string;
  ref_code: string;
  title: string;
  type: string;
  offer_type: OfferType;
  price: number;
  rent_period: RentPeriod | null;
  size: number;
  size_unit?: "sqm" | "feddan";
  location: string;
  description: string | null;
  status: "pending" | "live" | "papers_pending" | "rejected" | "sold";
  photo_urls: string[];
  created_at: string;
  sold_price: number | null;
  sold_to_name: string | null;
  sold_to_phone: string | null;
  sold_at: string | null;
  // Only present on owner-dashboard endpoints (pending/sold) — never on the public browse endpoint.
  submitted_by_name?: string;
  submitted_by_phone?: string;
  // The number the seller typed on the app's "List your property" form — the one to
  // call before approving. Owner endpoints only; never sent to the app's public feed.
  contact_phone?: string | null;
};

export type BuyRequestOut = {
  id: string;
  listing: ListingOut;
  buyer_name: string;
  buyer_phone: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.detail ?? res.statusText, res.status);
  }
  return res.json();
}

export async function login(email: string, password: string): Promise<Token> {
  const body = new URLSearchParams();
  body.set("username", email);
  body.set("password", password);

  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return handle<Token>(res);
}

export async function getLiveListings(): Promise<ListingOut[]> {
  const res = await fetch(`${API_BASE}/listings`, { cache: "no-store" });
  return handle<ListingOut[]>(res);
}

export type ListingCreatePayload = {
  title: string;
  type: string;
  offer_type: OfferType;
  price: number;
  // Omitted entirely unless offer_type is "rent" — the backend 422s on a stray value.
  rent_period?: RentPeriod;
  size: number;
  location: string;
  description?: string;
  latitude?: number;
  longitude?: number;
};

export async function createListing(token: string, payload: ListingCreatePayload): Promise<ListingOut> {
  const res = await fetch(`${API_BASE}/listings/dashboard`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return handle<ListingOut>(res);
}

// A partial edit: the backend applies only the keys actually present in the body
// (model_dump(exclude_unset=True)), so an omitted key means "leave alone" rather than
// "clear". Description is therefore explicitly nullable — sending null is the only way
// to wipe one, since omitting it would silently keep the old text.
export type ListingUpdatePayload = Omit<ListingCreatePayload, "description"> & {
  description?: string | null;
};

export async function updateListing(
  token: string,
  listingId: string,
  payload: ListingUpdatePayload
): Promise<ListingOut> {
  const res = await fetch(`${API_BASE}/listings/${listingId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return handle<ListingOut>(res);
}

export async function uploadListingPhoto(token: string, listingId: string, file: File): Promise<ListingOut> {
  const body = new FormData();
  body.set("file", file);
  const res = await fetch(`${API_BASE}/listings/dashboard/${listingId}/photos`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
  return handle<ListingOut>(res);
}

export type ListingSalePayload = {
  sold_price: number;
  sold_to_name: string;
  sold_to_phone: string;
};

// Owner records a deal agreed by phone — moves a live listing to papers-pending,
// not straight to sold. Finalized later via finalizeSale().
export async function markListingPapersPending(
  token: string,
  listingId: string,
  payload: ListingSalePayload
): Promise<ListingOut> {
  const res = await fetch(`${API_BASE}/listings/${listingId}/papers-pending`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return handle<ListingOut>(res);
}

// Owner confirms the registration paperwork is done — the sale is now 100% closed.
export async function finalizeSale(token: string, listingId: string): Promise<ListingOut> {
  const res = await fetch(`${API_BASE}/listings/${listingId}/finalize-sale`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle<ListingOut>(res);
}

// Owner reports the deal fell through during paperwork — listing goes back on the market.
export async function revertListingToLive(token: string, listingId: string): Promise<ListingOut> {
  const res = await fetch(`${API_BASE}/listings/${listingId}/revert-to-live`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle<ListingOut>(res);
}

export async function getSoldListings(token: string): Promise<ListingOut[]> {
  const res = await fetch(`${API_BASE}/listings/dashboard/sold`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return handle<ListingOut[]>(res);
}

export async function getPapersPendingListings(token: string): Promise<ListingOut[]> {
  const res = await fetch(`${API_BASE}/listings/dashboard/papers-pending`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return handle<ListingOut[]>(res);
}

// Listings submitted from the app, waiting for the owner to approve or reject.
export async function getPendingListings(token: string): Promise<ListingOut[]> {
  const res = await fetch(`${API_BASE}/listings/dashboard/pending`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return handle<ListingOut[]>(res);
}

// Approve publishes the submission to the live feed; reject declines it. Either way
// the seller gets a push notification.
export async function reviewListing(token: string, listingId: string, approve: boolean): Promise<ListingOut> {
  const res = await fetch(`${API_BASE}/listings/dashboard/${listingId}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ approve }),
  });
  return handle<ListingOut>(res);
}

// "01001234567" -> "201001234567", the international form wa.me links need.
export function whatsappLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("0") ? `20${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}`;
}

export async function getBuyRequests(token: string): Promise<BuyRequestOut[]> {
  const res = await fetch(`${API_BASE}/listings/dashboard/buy-requests`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return handle<BuyRequestOut[]>(res);
}

export async function reviewBuyRequest(
  token: string,
  requestId: string,
  approve: boolean
): Promise<BuyRequestOut> {
  const res = await fetch(`${API_BASE}/listings/buy-requests/${requestId}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ approve }),
  });
  return handle<BuyRequestOut>(res);
}
