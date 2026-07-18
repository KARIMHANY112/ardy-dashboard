"use client";

import LocationPicker from "@/components/LocationPicker";

export type ListingFormValues = {
  title: string;
  type: string;
  price: string;
  size: string;
  location: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
};

export const emptyListingForm: ListingFormValues = {
  title: "",
  type: "",
  price: "",
  size: "",
  location: "",
  description: "",
  latitude: null,
  longitude: null,
};

type ListingFormFieldsProps = {
  values: ListingFormValues;
  onChange: (values: ListingFormValues) => void;
};

export default function ListingFormFields({ values, onChange }: ListingFormFieldsProps) {
  function set<K extends keyof ListingFormValues>(key: K, value: ListingFormValues[K]) {
    onChange({ ...values, [key]: value });
  }

  return (
    <>
      <input
        className="sell-form-input"
        placeholder="Title"
        value={values.title}
        onChange={(e) => set("title", e.target.value)}
      />
      <input
        className="sell-form-input"
        placeholder="Type (e.g. land, apartment, villa, factory)"
        value={values.type}
        onChange={(e) => set("type", e.target.value)}
      />
      <input
        className="sell-form-input"
        placeholder="Price"
        type="number"
        value={values.price}
        onChange={(e) => set("price", e.target.value)}
      />
      <input
        className="sell-form-input"
        placeholder="Size (sqm)"
        type="number"
        value={values.size}
        onChange={(e) => set("size", e.target.value)}
      />
      <input
        className="sell-form-input"
        placeholder="Location"
        value={values.location}
        onChange={(e) => set("location", e.target.value)}
      />
      <LocationPicker
        latitude={values.latitude}
        longitude={values.longitude}
        onChange={(lat, lng) => onChange({ ...values, latitude: lat, longitude: lng })}
      />
      <textarea
        className="sell-form-input"
        placeholder="Description"
        rows={4}
        value={values.description}
        onChange={(e) => set("description", e.target.value)}
      />
    </>
  );
}
