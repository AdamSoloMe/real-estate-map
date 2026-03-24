"use client";

import dynamic from "next/dynamic";

const Map = dynamic(() => import("./components/Map"), { ssr: false });

export default function Home() {
  //re commit for redeploy
  return (
    // app/page.tsx

    <main>
      <Map/>
    </main>
  );
}
