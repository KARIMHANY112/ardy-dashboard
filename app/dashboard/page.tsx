"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  getPendingListings,
  reviewListing,
  getLiveListings,
  getSoldListings,
  markListingSold,
  getBuyRequests,
  reviewBuyRequest,
  createListing,
  uploadListingPhoto,
  ApiError,
  type ListingOut,
  type UserOut,
  type BuyRequestOut,
} from "@/lib/api";
import { getToken, getUser, clearSession } from "@/lib/session";
import LocationPicker from "@/components/LocationPicker";

export default function DashboardPage() {
  const router = useRouter();
  const [listings, setListings] = useState<ListingOut[] | null>(null);
  const [liveListings, setLiveListings] = useState<ListingOut[] | null>(null);
  const [soldListings, setSoldListings] = useState<ListingOut[] | null>(null);
  const [buyRequests, setBuyRequests] = useState<BuyRequestOut[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [sellingId, setSellingId] = useState<string | null>(null);
  const [soldPrice, setSoldPrice] = useState("");
  const [soldToName, setSoldToName] = useState("");
  const [soldToPhone, setSoldToPhone] = useState("");
  const [user, setUser] = useState<UserOut | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "live" | "sold" | "buyRequests" | "newListing">(
    "pending"
  );

  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newSize, setNewSize] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newLatitude, setNewLatitude] = useState<number | null>(null);
  const [newLongitude, setNewLongitude] = useState<number | null>(null);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [posting, setPosting] = useState(false);
  const [postSuccess, setPostSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      const [pendingListings, live, sold, requests] = await Promise.all([
        getPendingListings(token),
        getLiveListings(),
        getSoldListings(token),
        getBuyRequests(token),
      ]);
      setListings(pendingListings);
      setLiveListings(live);
      setSoldListings(sold);
      setBuyRequests(requests);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }
      setError(err instanceof ApiError ? err.message : "Could not reach the server.");
    }
  }, [router]);

  useEffect(() => {
    load();
    setUser(getUser());
  }, [load]);

  async function handleReview(listingId: string, approve: boolean) {
    const token = getToken();
    if (!token) return;
    setActingOn(listingId);
    try {
      await reviewListing(token, listingId, approve);
      setListings((prev) => prev?.filter((l) => l.id !== listingId) ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the server.");
    } finally {
      setActingOn(null);
    }
  }

  function openSellForm(listingId: string) {
    setSellingId(listingId);
    setSoldPrice("");
    setSoldToName("");
    setSoldToPhone("");
  }

  async function handleMarkSold(listingId: string) {
    const token = getToken();
    if (!token) return;
    const price = Number(soldPrice);
    if (!price || !soldToName.trim() || !soldToPhone.trim()) {
      setError("Sold price, buyer name, and buyer phone are all required.");
      return;
    }
    setActingOn(listingId);
    try {
      const sold = await markListingSold(token, listingId, {
        sold_price: price,
        sold_to_name: soldToName.trim(),
        sold_to_phone: soldToPhone.trim(),
      });
      setLiveListings((prev) => prev?.filter((l) => l.id !== listingId) ?? null);
      setSoldListings((prev) => [sold, ...(prev ?? [])]);
      setSellingId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the server.");
    } finally {
      setActingOn(null);
    }
  }

  async function handleBuyRequestReview(requestId: string, approve: boolean) {
    const token = getToken();
    if (!token) return;
    setActingOn(requestId);
    try {
      const reviewed = await reviewBuyRequest(token, requestId, approve);
      if (approve) {
        const soldListing = reviewed.listing;
        // Approving auto-rejects any other pending request on the same listing server-side —
        // drop them here too so the list doesn't show stale "pending" entries for a sold listing.
        setBuyRequests((prev) => prev?.filter((r) => r.listing.id !== soldListing.id) ?? null);
        setLiveListings((prev) => prev?.filter((l) => l.id !== soldListing.id) ?? null);
        setSoldListings((prev) => [soldListing, ...(prev ?? [])]);
      } else {
        setBuyRequests((prev) => prev?.filter((r) => r.id !== requestId) ?? null);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the server.");
    } finally {
      setActingOn(null);
    }
  }

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  function resetNewListingForm() {
    setNewTitle("");
    setNewType("");
    setNewPrice("");
    setNewSize("");
    setNewLocation("");
    setNewDescription("");
    setNewLatitude(null);
    setNewLongitude(null);
    setNewPhotos([]);
  }

  async function handleCreateListing() {
    const token = getToken();
    if (!token) return;

    const price = Number(newPrice);
    const size = Number(newSize);
    if (!newTitle.trim() || !newType.trim() || !newLocation.trim() || !price || !size) {
      setError("Title, type, price, size, and location are all required.");
      return;
    }

    setPosting(true);
    setError(null);
    setPostSuccess(null);
    try {
      let listing = await createListing(token, {
        title: newTitle.trim(),
        type: newType.trim(),
        price,
        size,
        location: newLocation.trim(),
        description: newDescription.trim() || undefined,
        latitude: newLatitude ?? undefined,
        longitude: newLongitude ?? undefined,
      });

      for (const photo of newPhotos) {
        listing = await uploadListingPhoto(token, listing.id, photo);
      }

      setLiveListings((prev) => [listing, ...(prev ?? [])]);
      setPostSuccess(`"${listing.title}" was posted and is now live.`);
      resetNewListingForm();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the server.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="page">
      <div className="topbar">
        <h1>Ardy Owner Dashboard</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {user && <span style={{ fontSize: 13 }}>{user.name}</span>}
          <button className="logout-button" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </div>

      <div className="dashboard-body">
        <div className="stats-row">
          <div className="stat-card" role="button" onClick={() => setActiveTab("pending")}>
            <div className="value">{listings?.length ?? "—"}</div>
            <div className="label">Pending Listings</div>
          </div>
          <div className="stat-card" role="button" onClick={() => setActiveTab("sold")}>
            <div className="value">{soldListings?.length ?? "—"}</div>
            <div className="label">Sold Listings</div>
          </div>
          <div className="stat-card" role="button" onClick={() => setActiveTab("buyRequests")}>
            <div className="value">{buyRequests?.length ?? "—"}</div>
            <div className="label">Pending Buy Requests</div>
          </div>
        </div>

        {error && <div className="error-text">{error}</div>}

        <div className="tab-bar">
          <button
            className={activeTab === "pending" ? "tab-button active" : "tab-button"}
            onClick={() => setActiveTab("pending")}
          >
            Pending Listings
          </button>
          <button
            className={activeTab === "live" ? "tab-button active" : "tab-button"}
            onClick={() => setActiveTab("live")}
          >
            Live Listings
          </button>
          <button
            className={activeTab === "sold" ? "tab-button active" : "tab-button"}
            onClick={() => setActiveTab("sold")}
          >
            Sold Listings
          </button>
          <button
            className={activeTab === "buyRequests" ? "tab-button active" : "tab-button"}
            onClick={() => setActiveTab("buyRequests")}
          >
            Pending Buy Requests
          </button>
          <button
            className={activeTab === "newListing" ? "tab-button active" : "tab-button"}
            onClick={() => setActiveTab("newListing")}
          >
            New Listing
          </button>
        </div>

        {activeTab === "pending" && (
        <>
        <h2 style={{ fontSize: 16 }}>Pending Listings</h2>

        {listings === null && !error && <p>Loading...</p>}

        {listings?.length === 0 && (
          <div className="empty-state">No listings are waiting for review.</div>
        )}

        {listings?.map((listing) => (
          <div className="listing-card" key={listing.id}>
            <h3>{listing.title}</h3>
            <div className="listing-meta">
              {listing.ref_code} · {listing.type} · {listing.size} sqm · {listing.location} · $
              {listing.price.toLocaleString()}
            </div>
            {listing.description && <p style={{ fontSize: 13 }}>{listing.description}</p>}
            {listing.photo_urls.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                {listing.photo_urls.map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={url}
                    src={url}
                    alt={listing.title}
                    style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8 }}
                  />
                ))}
              </div>
            )}
            <div className="listing-meta">
              Seller: {listing.submitted_by_name} · {listing.submitted_by_phone}
            </div>
            <div className="listing-actions">
              <button
                className="reject-button"
                disabled={actingOn === listing.id}
                onClick={() => handleReview(listing.id, false)}
              >
                Reject
              </button>
              <button
                className="approve-button"
                disabled={actingOn === listing.id}
                onClick={() => handleReview(listing.id, true)}
              >
                Approve
              </button>
            </div>
          </div>
        ))}
        </>
        )}

        {activeTab === "live" && (
        <>
        <h2 style={{ fontSize: 16 }}>Live Listings</h2>

        {liveListings === null && !error && <p>Loading...</p>}

        {liveListings?.length === 0 && (
          <div className="empty-state">No listings are currently live.</div>
        )}

        {liveListings?.map((listing) => (
          <div className="listing-card" key={listing.id}>
            <h3>{listing.title}</h3>
            <div className="listing-meta">
              {listing.ref_code} · {listing.type} · {listing.size} sqm · {listing.location} · $
              {listing.price.toLocaleString()}
            </div>

            {sellingId === listing.id ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                <input
                  className="sell-form-input"
                  placeholder="Sold price"
                  type="number"
                  value={soldPrice}
                  onChange={(e) => setSoldPrice(e.target.value)}
                />
                <input
                  className="sell-form-input"
                  placeholder="Buyer name"
                  value={soldToName}
                  onChange={(e) => setSoldToName(e.target.value)}
                />
                <input
                  className="sell-form-input"
                  placeholder="Buyer phone"
                  value={soldToPhone}
                  onChange={(e) => setSoldToPhone(e.target.value)}
                />
                <div className="listing-actions">
                  <button className="reject-button" onClick={() => setSellingId(null)}>
                    Cancel
                  </button>
                  <button
                    className="approve-button"
                    disabled={actingOn === listing.id}
                    onClick={() => handleMarkSold(listing.id)}
                  >
                    Confirm Sold
                  </button>
                </div>
              </div>
            ) : (
              <div className="listing-actions">
                <button className="approve-button" onClick={() => openSellForm(listing.id)}>
                  Mark as Sold
                </button>
              </div>
            )}
          </div>
        ))}
        </>
        )}

        {activeTab === "sold" && (
        <>
        <h2 style={{ fontSize: 16 }}>Sold Listings</h2>

        {soldListings === null && !error && <p>Loading...</p>}

        {soldListings?.length === 0 && (
          <div className="empty-state">No listings have been sold yet.</div>
        )}

        {soldListings?.map((listing) => (
          <div className="listing-card" key={listing.id}>
            <h3>{listing.title}</h3>
            <div className="listing-meta">
              {listing.ref_code} · {listing.type} · {listing.size} sqm · {listing.location} · listed at $
              {listing.price.toLocaleString()}
            </div>
            <div className="listing-meta">
              Seller: {listing.submitted_by_name} · {listing.submitted_by_phone}
            </div>
            <div className="listing-meta">
              Sold for ${listing.sold_price?.toLocaleString()} to {listing.sold_to_name} (
              {listing.sold_to_phone}) ·{" "}
              {listing.sold_at && new Date(listing.sold_at).toLocaleDateString()}
            </div>
          </div>
        ))}
        </>
        )}

        {activeTab === "buyRequests" && (
        <>
        <h2 style={{ fontSize: 16 }}>Pending Buy Requests</h2>

        {buyRequests === null && !error && <p>Loading...</p>}

        {buyRequests?.length === 0 && (
          <div className="empty-state">No buy requests are waiting for review.</div>
        )}

        {buyRequests?.map((request) => (
          <div className="listing-card" key={request.id}>
            <h3>{request.listing.title}</h3>
            <div className="listing-meta">
              {request.listing.ref_code} · {request.listing.type} · {request.listing.size} sqm ·{" "}
              {request.listing.location} · ${request.listing.price.toLocaleString()}
            </div>
            <div className="listing-meta">
              Buyer: {request.buyer_name} · {request.buyer_phone}
            </div>
            <div className="listing-meta">
              Requested {new Date(request.created_at).toLocaleDateString()}
            </div>
            <div className="listing-actions">
              <button
                className="reject-button"
                disabled={actingOn === request.id}
                onClick={() => handleBuyRequestReview(request.id, false)}
              >
                Reject
              </button>
              <button
                className="approve-button"
                disabled={actingOn === request.id}
                onClick={() => handleBuyRequestReview(request.id, true)}
              >
                Approve
              </button>
            </div>
          </div>
        ))}
        </>
        )}

        {activeTab === "newListing" && (
        <>
        <h2 style={{ fontSize: 16 }}>Post a New Listing</h2>

        {postSuccess && <div style={{ color: "var(--nile-green)", fontSize: 13, marginBottom: 12 }}>{postSuccess}</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 420 }}>
          <input
            className="sell-form-input"
            placeholder="Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <input
            className="sell-form-input"
            placeholder="Type (e.g. land, apartment, villa, factory)"
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
          />
          <input
            className="sell-form-input"
            placeholder="Price"
            type="number"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
          />
          <input
            className="sell-form-input"
            placeholder="Size (sqm)"
            type="number"
            value={newSize}
            onChange={(e) => setNewSize(e.target.value)}
          />
          <input
            className="sell-form-input"
            placeholder="Location"
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value)}
          />
          <LocationPicker
            latitude={newLatitude}
            longitude={newLongitude}
            onChange={(lat, lng) => {
              setNewLatitude(lat);
              setNewLongitude(lng);
            }}
          />
          <textarea
            className="sell-form-input"
            placeholder="Description"
            rows={4}
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
          />
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setNewPhotos(Array.from(e.target.files ?? []))}
          />
          {newPhotos.length > 0 && (
            <div style={{ fontSize: 13, color: "rgba(28, 35, 31, 0.6)" }}>
              {newPhotos.length} photo{newPhotos.length > 1 ? "s" : ""} selected
            </div>
          )}
          <button className="primary-button" disabled={posting} onClick={handleCreateListing}>
            {posting ? "Posting..." : "Post Listing"}
          </button>
        </div>
        </>
        )}
      </div>
    </div>
  );
}
