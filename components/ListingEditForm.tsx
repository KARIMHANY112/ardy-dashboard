"use client";

import ListingFormFields, { type ListingFormValues } from "@/components/ListingFormFields";

type ListingEditFormProps = {
  values: ListingFormValues;
  onChange: (values: ListingFormValues) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
};

export default function ListingEditForm({ values, onChange, onCancel, onSave, saving }: ListingEditFormProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <ListingFormFields values={values} onChange={onChange} />
      <div className="listing-actions">
        <button className="reject-button" onClick={onCancel}>
          Cancel
        </button>
        <button className="approve-button" disabled={saving} onClick={onSave}>
          Save
        </button>
      </div>
    </div>
  );
}
