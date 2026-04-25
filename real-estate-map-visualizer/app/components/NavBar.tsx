"use client";

import { useRouter } from "next/navigation";
import { Home, MapPinned } from "lucide-react";
import { Button } from "./ui/button";

const Navbar = () => {
  const router = useRouter();

  const handleHomeClick = () => {
    window.dispatchEvent(new Event("real-estate-map:reset"));
    router.replace("/");
  };

  return (
    <nav className="flex h-16 w-full items-center justify-between border-b bg-background px-4 shadow-sm sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <MapPinned className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold tracking-normal text-foreground sm:text-lg">
            Broker Prospecting Intelligence Map
          </h1>
          <p className="hidden text-xs text-muted-foreground sm:block">
            Data-driven parcel and property search for New York City brokers
          </p>
        </div>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={handleHomeClick}>
        <Home className="h-4 w-4" />
        Home
      </Button>
    </nav>
  );
};

export default Navbar;
