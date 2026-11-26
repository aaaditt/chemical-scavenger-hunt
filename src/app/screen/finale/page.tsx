import { Suspense } from "react";
import { Finale } from "./Finale";

export const metadata = { title: "Secret Catalyst — Finale" };

export default function FinalePage() {
  return (
    <Suspense>
      <Finale />
    </Suspense>
  );
}
