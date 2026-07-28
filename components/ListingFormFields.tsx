"use client";

import LocationPicker from "@/components/LocationPicker";
import { OFFER_TYPE_LABELS, RENT_PERIOD_LABELS, type OfferType, type RentPeriod } from "@/lib/api";

export type ListingFormValues = {
  title: string;
  type: string;
  // "" means the poster hasn't chosen yet — the form blocks submitting until they do.
  offerType: OfferType | "";
  price: string;
  // Only meaningful when offerType is "rent". Forced back to "" whenever the offer type
  // changes to anything else, so a stale period can never reach the API — the backend
  // rejects rent_period on a sale outright.
  rentPeriod: RentPeriod | "";
  size: string;
  location: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
};

export const emptyListingForm: ListingFormValues = {
  title: "",
  type: "",
  offerType: "",
  price: "",
  rentPeriod: "",
  size: "",
  location: "",
  description: "",
  latitude: null,
  longitude: null,
};

const OFFER_TYPE_OPTIONS = Object.entries(OFFER_TYPE_LABELS) as [OfferType, string][];
const RENT_PERIOD_OPTIONS = Object.entries(RENT_PERIOD_LABELS) as [RentPeriod, string][];

type ListingFormFieldsProps = {
  values: ListingFormValues;
  onChange: (values: ListingFormValues) => void;
};

export default function ListingFormFields({ values, onChange }: ListingFormFieldsProps) {
  function set<K extends keyof ListingFormValues>(key: K, value: ListingFormValues[K]) {
    onChange({ ...values, [key]: value });
  }

  function setOfferType(offerType: OfferType | "") {
    // Drop any period the poster picked before switching off "rent" — it would be
    // meaningless on a sale and the API refuses it.
    onChange({ ...values, offerType, rentPeriod: offerType === "rent" ? values.rentPeriod : "" });
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
      <select
        className="sell-form-input"
        value={values.offerType}
        onChange={(e) => setOfferType(e.target.value as OfferType | "")}
      >
        <option value="">Offered as… (required)</option>
        {OFFER_TYPE_OPTIONS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <input
        className="sell-form-input"
        placeholder={values.offerType === "rent" ? "Rent" : "Price"}
        type="number"
        value={values.price}
        onChange={(e) => set("price", e.target.value)}
      />
      {values.offerType === "rent" && (
        <select
          className="sell-form-input"
          value={values.rentPeriod}
          onChange={(e) => set("rentPeriod", e.target.value as RentPeriod | "")}
        >
          <option value="">Charged… (required)</option>
          {RENT_PERIOD_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      )}
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
