"use client";

import type { ListingOut } from "@/lib/api";
import ListingEditForm from "@/components/ListingEditForm";
import type { ListingFormValues } from "@/components/ListingFormFields";

type PendingListingCardProps = {
  listing: ListingOut;
  isEditing: boolean;
  editForm: ListingFormValues;
  onEditFormChange: (values: ListingFormValues) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onReview: (approve: boolean) => void;
  actingOn: boolean;
};

export default function PendingListingCard({
  listing,
  isEditing,
  editForm,
  onEditFormChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onReview,
  actingOn,
}: PendingListingCardProps) {
  if (isEditing) {
    return (
      <div className="listing-card">
        <ListingEditForm
          values={editForm}
          onChange={onEditFormChange}
          onCancel={onCancelEdit}
          onSave={onSaveEdit}
          saving={actingOn}
        />
      </div>
    );
  }

  return (
    <div className="listing-card">
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
        <button className="reject-button" disabled={actingOn} onClick={() => onReview(false)}>
          Reject
        </button>
        <button className="approve-button" onClick={onStartEdit}>
          Edit
        </button>
        <button className="approve-button" disabled={actingOn} onClick={() => onReview(true)}>
          Approve
        </button>
      </div>
    </div>
  );
}
