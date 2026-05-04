"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

export default function StreetViewDialog({
  open,
  onClose,
  latitude,
  longitude,
  address,
}: {
  open: boolean;
  onClose: () => void;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
}) {
  if (latitude == null || longitude == null) return null;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const src = `https://www.google.com/maps/embed/v1/streetview?key=${apiKey}&location=${latitude},${longitude}&heading=0&pitch=0&fov=90`;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="overflow-hidden">
        <DialogHeader className="border-b bg-muted/40">
          <DialogTitle>Street View</DialogTitle>
          <DialogDescription className="truncate">
            {address || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`}
          </DialogDescription>
        </DialogHeader>
        <iframe
          title="Street View"
          src={src}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          referrerPolicy="no-referrer-when-downgrade"
          className="h-[min(600px,70vh)] w-full border-0"
        />
      </DialogContent>
    </Dialog>
  );
}
