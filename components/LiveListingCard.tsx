"use client";

import type { ListingOut } from "@/lib/api";
import ListingEditForm from "@/components/ListingEditForm";
import type { ListingFormValues } from "@/components/ListingFormFields";

type LiveListingCardProps = {
  listing: ListingOut;
  isEditing: boolean;
  editForm: ListingFormValues;
  onEditFormChange: (values: ListingFormValues) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  actingOn: boolean;
  isSelling: boolean;
  soldPrice: string;
  soldToName: string;
  soldToPhone: string;
  onSoldPriceChange: (value: string) => void;
  onSoldToNameChange: (value: string) => void;
  onSoldToPhoneChange: (value: string) => void;
  onStartSell: () => void;
  onCancelSell: () => void;
  onConfirmSell: () => void;
};

export default function LiveListingCard({
  listing,
  isEditing,
  editForm,
  onEditFormChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  actingOn,
  isSelling,
  soldPrice,
  soldToName,
  soldToPhone,
  onSoldPriceChange,
  onSoldToNameChange,
  onSoldToPhoneChange,
  onStartSell,
  onCancelSell,
  onConfirmSell,
}: LiveListingCardProps) {
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

      {isSelling ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          <input
            className="sell-form-input"
            placeholder="Sold price"
            type="number"
            value={soldPrice}
            onChange={(e) => onSoldPriceChange(e.target.value)}
          />
          <input
            className="sell-form-input"
            placeholder="Buyer name"
            value={soldToName}
            onChange={(e) => onSoldToNameChange(e.target.value)}
          />
          <input
            className="sell-form-input"
            placeholder="Buyer phone"
            value={soldToPhone}
            onChange={(e) => onSoldToPhoneChange(e.target.value)}
          />
          <div className="listing-actions">
            <button className="reject-button" onClick={onCancelSell}>
              Cancel
            </button>
            <button className="approve-button" disabled={actingOn} onClick={onConfirmSell}>
              Confirm Papers Pending
            </button>
          </div>
        </div>
      ) : (
        <div className="listing-actions">
          <button className="approve-button" onClick={onStartEdit}>
            Edit
          </button>
          <button className="approve-button" onClick={onStartSell}>
            Mark Papers Pending
          </button>
        </div>
      )}
    </div>
  );
}
