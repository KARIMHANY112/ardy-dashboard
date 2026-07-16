const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type UserOut = {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: "buyer" | "owner";
  status: "pending" | "approved" | "rejected";
};

export type Token = {
  access_token: string;
  token_type: string;
  user: UserOut;
};

export type ListingOut = {
  id: string;
  ref_code: string;
  title: string;
  type: string;
  price: number;
  size: number;
  location: string;
  description: string | null;
  status: "pending" | "live" | "rejected" | "sold";
  photo_urls: string[];
  created_at: string;
  sold_price: number | null;
  sold_to_name: string | null;
  sold_to_phone: string | null;
  sold_at: string | null;
  // Only present on owner-dashboard endpoints (pending/sold) — never on the public browse endpoint.
  submitted_by_name?: string;
  submitted_by_phone?: string;
};

export type BuyRequestOut = {
  id: string;
  listing: ListingOut;
  buyer_name: string;
  buyer_phone: string;
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

export async function getPendingListings(token: string): Promise<ListingOut[]> {
  const res = await fetch(`${API_BASE}/listings/dashboard/pending`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return handle<ListingOut[]>(res);
}

export async function reviewListing(token: string, listingId: string, approve: boolean): Promise<ListingOut> {
  const res = await fetch(`${API_BASE}/listings/${listingId}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ approve }),
  });
  return handle<ListingOut>(res);
}

export async function getLiveListings(): Promise<ListingOut[]> {
  const res = await fetch(`${API_BASE}/listings`, { cache: "no-store" });
  return handle<ListingOut[]>(res);
}

export type ListingCreatePayload = {
  title: string;
  type: string;
  price: number;
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

export type MarkSoldPayload = {
  sold_price: number;
  sold_to_name: string;
  sold_to_phone: string;
};

export async function markListingSold(
  token: string,
  listingId: string,
  payload: MarkSoldPayload
): Promise<ListingOut> {
  const res = await fetch(`${API_BASE}/listings/${listingId}/sold`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
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

export async function getPendingBuyers(token: string): Promise<UserOut[]> {
  const res = await fetch(`${API_BASE}/users/dashboard/pending`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return handle<UserOut[]>(res);
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

export async function reviewBuyer(token: string, userId: string, approve: boolean): Promise<UserOut> {
  const res = await fetch(`${API_BASE}/users/${userId}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ approve }),
  });
  return handle<UserOut>(res);
}
