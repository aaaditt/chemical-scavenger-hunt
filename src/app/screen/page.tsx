import { Suspense } from "react";
import { BigScreen } from "./BigScreen";

export const metadata = { title: "Secret Catalyst — Live" };

export default function ScreenPage() {
  return (
    <Suspense>
      <BigScreen />
    </Suspense>
  );
}
