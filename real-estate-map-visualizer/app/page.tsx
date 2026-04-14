"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const Map = dynamic(() => import("./components/Map"), { ssr: false });

export default function Home() {
  return (
    <main>
      <Suspense fallback={null}>
        <Map />
      </Suspense>
    </main>
  );
}
