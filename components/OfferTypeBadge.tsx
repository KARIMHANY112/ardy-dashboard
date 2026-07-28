import { OFFER_TYPE_LABELS, type OfferType } from "@/lib/api";

// Listings created before offer_type existed come back as "sale" from the backend,
// but guard anyway so an unexpected value renders as plain text instead of an
// unstyled badge.
export default function OfferTypeBadge({ offerType }: { offerType: OfferType }) {
  return (
    <span className={`offer-badge ${offerType}`}>
      {OFFER_TYPE_LABELS[offerType] ?? offerType}
    </span>
  );
}
