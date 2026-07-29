import type { AvailabilityStatus } from "@/types/profile";

const labels: Record<AvailabilityStatus, string> = {
  open_to_talk: "Open to talk",
  busy: "Busy",
};

export function AvailabilityBadge({
  status,
}: {
  status: AvailabilityStatus;
}) {
  return (
    <span className={`availability-badge ${status}`}>
      <span aria-hidden="true" className="availability-dot" />
      {labels[status]}
    </span>
  );
}
