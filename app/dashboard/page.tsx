"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  getLiveListings,
  getSoldListings,
  getPapersPendingListings,
  markListingPapersPending,
  finalizeSale,
  revertListingToLive,
  getBuyRequests,
  reviewBuyRequest,
  getPendingListings,
  reviewListing,
  whatsappLink,
  createListing,
  updateListing,
  uploadListingPhoto,
  formatListingPrice,
  ApiError,
  type ListingOut,
  type UserOut,
  type BuyRequestOut,
} from "@/lib/api";
import { getToken, getUser, clearSession } from "@/lib/session";
import ListingFormFields, { emptyListingForm, type ListingFormValues } from "@/components/ListingFormFields";
import LiveListingCard from "@/components/LiveListingCard";
import OfferTypeBadge from "@/components/OfferTypeBadge";

export default function DashboardPage() {
  const router = useRouter();
  const [liveListings, setLiveListings] = useState<ListingOut[] | null>(null);
  const [soldListings, setSoldListings] = useState<ListingOut[] | null>(null);
  const [papersPendingListings, setPapersPendingListings] = useState<ListingOut[] | null>(null);
  const [buyRequests, setBuyRequests] = useState<BuyRequestOut[] | null>(null);
  const [pendingListings, setPendingListings] = useState<ListingOut[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [sellingId, setSellingId] = useState<string | null>(null);
  const [soldPrice, setSoldPrice] = useState("");
  const [soldToName, setSoldToName] = useState("");
  const [soldToPhone, setSoldToPhone] = useState("");
  const [user, setUser] = useState<UserOut | null>(null);
  const [activeTab, setActiveTab] = useState<
    "review" | "live" | "papersPending" | "sold" | "buyRequests" | "newListing"
  >("review");

  const [newForm, setNewForm] = useState<ListingFormValues>(emptyListingForm);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [posting, setPosting] = useState(false);
  const [postSuccess, setPostSuccess] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ListingFormValues>(emptyListingForm);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      const [live, sold, papersPending, requests, pending] = await Promise.all([
        getLiveListings(),
        getSoldListings(token),
        getPapersPendingListings(token),
        getBuyRequests(token),
        getPendingListings(token),
      ]);
      setPendingListings(pending);
      setLiveListings(live);
      setSoldListings(sold);
      setPapersPendingListings(papersPending);
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

  function openSellForm(listingId: string) {
    setSellingId(listingId);
    setSoldPrice("");
    setSoldToName("");
    setSoldToPhone("");
  }

  async function handleMarkPapersPending(listingId: string) {
    const token = getToken();
    if (!token) return;
    const price = Number(soldPrice);
    if (!price || !soldToName.trim() || !soldToPhone.trim()) {
      setError("Agreed price, buyer name, and buyer phone are all required.");
      return;
    }
    setActingOn(listingId);
    try {
      const pending = await markListingPapersPending(token, listingId, {
        sold_price: price,
        sold_to_name: soldToName.trim(),
        sold_to_phone: soldToPhone.trim(),
      });
      setLiveListings((prev) => prev?.filter((l) => l.id !== listingId) ?? null);
      setPapersPendingListings((prev) => [pending, ...(prev ?? [])]);
      setSellingId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the server.");
    } finally {
      setActingOn(null);
    }
  }

  async function handleFinalizeSale(listingId: string) {
    const token = getToken();
    if (!token) return;
    setActingOn(listingId);
    try {
      const sold = await finalizeSale(token, listingId);
      setPapersPendingListings((prev) => prev?.filter((l) => l.id !== listingId) ?? null);
      setSoldListings((prev) => [sold, ...(prev ?? [])]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the server.");
    } finally {
      setActingOn(null);
    }
  }

  async function handleRevertToLive(listingId: string) {
    const token = getToken();
    if (!token) return;
    setActingOn(listingId);
    try {
      const live = await revertListingToLive(token, listingId);
      setPapersPendingListings((prev) => prev?.filter((l) => l.id !== listingId) ?? null);
      setLiveListings((prev) => [live, ...(prev ?? [])]);
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
        const pendingListing = reviewed.listing;
        // Approving auto-rejects any other pending request on the same listing server-side —
        // drop them here too so the list doesn't show stale "pending" entries. The listing
        // moves to papers-pending, not sold, until the owner finalizes the paperwork.
        setBuyRequests((prev) => prev?.filter((r) => r.listing.id !== pendingListing.id) ?? null);
        setLiveListings((prev) => prev?.filter((l) => l.id !== pendingListing.id) ?? null);
        setPapersPendingListings((prev) => [pendingListing, ...(prev ?? [])]);
      } else {
        setBuyRequests((prev) => prev?.filter((r) => r.id !== requestId) ?? null);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the server.");
    } finally {
      setActingOn(null);
    }
  }

  async function handleListingReview(listingId: string, approve: boolean) {
    const token = getToken();
    if (!token) return;
    setActingOn(listingId);
    try {
      const reviewed = await reviewListing(token, listingId, approve);
      setPendingListings((prev) => prev?.filter((l) => l.id !== listingId) ?? null);
      if (approve) setLiveListings((prev) => [reviewed, ...(prev ?? [])]);
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
    setNewForm(emptyListingForm);
    setNewPhotos([]);
  }

  async function handleCreateListing() {
    const token = getToken();
    if (!token) return;

    const price = Number(newForm.price);
    const size = Number(newForm.size);
    if (
      !newForm.title.trim() ||
      !newForm.type.trim() ||
      !newForm.offerType ||
      !newForm.location.trim() ||
      !price ||
      !size
    ) {
      setError("Title, type, offer type, price, size, and location are all required.");
      return;
    }
    if (newForm.offerType === "rent" && !newForm.rentPeriod) {
      setError("Choose whether the rent is charged per month or per year.");
      return;
    }

    setPosting(true);
    setError(null);
    setPostSuccess(null);
    try {
      let listing = await createListing(token, {
        title: newForm.title.trim(),
        type: newForm.type.trim(),
        offer_type: newForm.offerType,
        price,
        // Sent only on rentals — the API rejects the field on sale/resale.
        rent_period: newForm.offerType === "rent" ? newForm.rentPeriod || undefined : undefined,
        size,
        location: newForm.location.trim(),
        description: newForm.description.trim() || undefined,
        latitude: newForm.latitude ?? undefined,
        longitude: newForm.longitude ?? undefined,
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

  function openEditForm(listing: ListingOut) {
    setEditingId(listing.id);
    setEditForm({
      title: listing.title,
      type: listing.type,
      offerType: listing.offer_type,
      price: String(listing.price),
      rentPeriod: listing.rent_period ?? "",
      size: String(listing.size),
      location: listing.location,
      description: listing.description ?? "",
      latitude: null,
      longitude: null,
    });
  }

  function closeEditForm() {
    setEditingId(null);
  }

  async function handleSaveEdit(listingId: string) {
    const token = getToken();
    if (!token) return;

    const price = Number(editForm.price);
    const size = Number(editForm.size);
    if (
      !editForm.title.trim() ||
      !editForm.type.trim() ||
      !editForm.offerType ||
      !editForm.location.trim() ||
      !price ||
      !size
    ) {
      setError("Title, type, offer type, price, size, and location are all required.");
      return;
    }
    if (editForm.offerType === "rent" && !editForm.rentPeriod) {
      setError("Choose whether the rent is charged per month or per year.");
      return;
    }

    setActingOn(listingId);
    try {
      const updated = await updateListing(token, listingId, {
        title: editForm.title.trim(),
        type: editForm.type.trim(),
        offer_type: editForm.offerType,
        price,
        rent_period: editForm.offerType === "rent" ? editForm.rentPeriod || undefined : undefined,
        size,
        location: editForm.location.trim(),
        // null, not undefined — an omitted key leaves the old description in place,
        // so emptying the box has to be sent explicitly to actually clear it.
        description: editForm.description.trim() || null,
        latitude: editForm.latitude ?? undefined,
        longitude: editForm.longitude ?? undefined,
      });
      setLiveListings((prev) => prev?.map((l) => (l.id === listingId ? updated : l)) ?? null);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the server.");
    } finally {
      setActingOn(null);
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
          <div className="stat-card" role="button" onClick={() => setActiveTab("review")}>
            <div className="value">{pendingListings?.length ?? "—"}</div>
            <div className="label">Awaiting Review</div>
          </div>
          <div className="stat-card" role="button" onClick={() => setActiveTab("sold")}>
            <div className="value">{soldListings?.length ?? "—"}</div>
            <div className="label">Sold Listings</div>
          </div>
          <div className="stat-card" role="button" onClick={() => setActiveTab("papersPending")}>
            <div className="value">{papersPendingListings?.length ?? "—"}</div>
            <div className="label">Papers Pending</div>
          </div>
          <div className="stat-card" role="button" onClick={() => setActiveTab("buyRequests")}>
            <div className="value">{buyRequests?.length ?? "—"}</div>
            <div className="label">Pending Buy Requests</div>
          </div>
        </div>

        {error && <div className="error-text">{error}</div>}

        <div className="tab-bar">
          <button
            className={activeTab === "review" ? "tab-button active" : "tab-button"}
            onClick={() => setActiveTab("review")}
          >
            Awaiting Review{pendingListings?.length ? ` (${pendingListings.length})` : ""}
          </button>
          <button
            className={activeTab === "live" ? "tab-button active" : "tab-button"}
            onClick={() => setActiveTab("live")}
          >
            Live Listings
          </button>
          <button
            className={activeTab === "papersPending" ? "tab-button active" : "tab-button"}
            onClick={() => setActiveTab("papersPending")}
          >
            Papers Pending
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

        {activeTab === "review" && (
        <>
        <h2 style={{ fontSize: 16 }}>Listings Awaiting Review</h2>
        <p style={{ fontSize: 13, color: "rgba(28, 35, 31, 0.6)", marginTop: -4 }}>
          Submitted from the app. Call the seller to check the details, then approve to publish it.
          The seller&apos;s number is never shown to buyers.
        </p>

        {pendingListings === null && !error && <p>Loading...</p>}

        {pendingListings?.length === 0 && (
          <div className="empty-state">No listings are waiting for review.</div>
        )}

        {pendingListings?.map((listing) => (
          <div className="listing-card" key={listing.id}>
            <h3>
              {listing.title}
              <OfferTypeBadge offerType={listing.offer_type} />
            </h3>
            <div className="listing-meta">
              {listing.ref_code} · {listing.type} · {listing.size} {listing.size_unit ?? "sqm"} ·{" "}
              {listing.location} · {formatListingPrice(listing)}
            </div>
            <div className="listing-meta">
              Submitted by {listing.submitted_by_name} on {new Date(listing.created_at).toLocaleDateString()}
            </div>
            {listing.contact_phone ? (
              <div className="listing-meta" style={{ color: "var(--ink)", fontWeight: 700 }}>
                Seller&apos;s number: {listing.contact_phone} ·{" "}
                <a href={`tel:${listing.contact_phone}`}>Call</a> ·{" "}
                <a href={whatsappLink(listing.contact_phone)} target="_blank" rel="noreferrer">
                  WhatsApp
                </a>
              </div>
            ) : (
              <div className="listing-meta">No contact number given</div>
            )}
            {listing.description && (
              <p style={{ fontSize: 13, margin: "8px 0" }}>{listing.description}</p>
            )}
            {listing.photo_urls.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "8px 0" }}>
                {listing.photo_urls.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 8 }}
                    />
                  </a>
                ))}
              </div>
            )}
            <div className="listing-actions">
              <button
                className="reject-button"
                disabled={actingOn === listing.id}
                onClick={() => handleListingReview(listing.id, false)}
              >
                Reject
              </button>
              <button
                className="approve-button"
                disabled={actingOn === listing.id}
                onClick={() => handleListingReview(listing.id, true)}
              >
                Approve &amp; Publish
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
          <LiveListingCard
            key={listing.id}
            listing={listing}
            isEditing={editingId === listing.id}
            editForm={editForm}
            onEditFormChange={setEditForm}
            onStartEdit={() => openEditForm(listing)}
            onCancelEdit={closeEditForm}
            onSaveEdit={() => handleSaveEdit(listing.id)}
            actingOn={actingOn === listing.id}
            isSelling={sellingId === listing.id}
            soldPrice={soldPrice}
            soldToName={soldToName}
            soldToPhone={soldToPhone}
            onSoldPriceChange={setSoldPrice}
            onSoldToNameChange={setSoldToName}
            onSoldToPhoneChange={setSoldToPhone}
            onStartSell={() => openSellForm(listing.id)}
            onCancelSell={() => setSellingId(null)}
            onConfirmSell={() => handleMarkPapersPending(listing.id)}
          />
        ))}
        </>
        )}

        {activeTab === "papersPending" && (
        <>
        <h2 style={{ fontSize: 16 }}>Papers Pending</h2>

        {papersPendingListings === null && !error && <p>Loading...</p>}

        {papersPendingListings?.length === 0 && (
          <div className="empty-state">No listings are currently awaiting paperwork.</div>
        )}

        {papersPendingListings?.map((listing) => (
          <div className="listing-card" key={listing.id}>
            <h3>
              {listing.title}
              <OfferTypeBadge offerType={listing.offer_type} />
            </h3>
            <div className="listing-meta">
              {listing.ref_code} · {listing.type} · {listing.size} sqm · {listing.location} · listed at{" "}
              {formatListingPrice(listing)}
            </div>
            <div className="listing-meta">
              Agreed price ${listing.sold_price?.toLocaleString()} with {listing.sold_to_name} (
              {listing.sold_to_phone})
            </div>
            <div className="listing-actions">
              <button
                className="reject-button"
                disabled={actingOn === listing.id}
                onClick={() => handleRevertToLive(listing.id)}
              >
                Deal Fell Through
              </button>
              <button
                className="approve-button"
                disabled={actingOn === listing.id}
                onClick={() => handleFinalizeSale(listing.id)}
              >
                Finalize Sale
              </button>
            </div>
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
            <h3>
              {listing.title}
              <OfferTypeBadge offerType={listing.offer_type} />
            </h3>
            <div className="listing-meta">
              {listing.ref_code} · {listing.type} · {listing.size} sqm · {listing.location} · listed at{" "}
              {formatListingPrice(listing)}
            </div>
            <div className="listing-meta">
              Seller: {listing.submitted_by_name} · {listing.submitted_by_phone ?? "no phone"}
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
            <h3>
              {request.listing.title}
              <OfferTypeBadge offerType={request.listing.offer_type} />
            </h3>
            <div className="listing-meta">
              {request.listing.ref_code} · {request.listing.type} · {request.listing.size} sqm ·{" "}
              {request.listing.location} · {formatListingPrice(request.listing)}
            </div>
            <div className="listing-meta">
              Buyer: {request.buyer_name} · {request.buyer_phone ?? "no phone"}
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
          <ListingFormFields values={newForm} onChange={setNewForm} />
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
