import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-dvh max-w-md mx-auto px-6 py-12 flex flex-col">
      <h1><span className="block pf-48 text-text">Secret</span><span className="block pf-48 text-candle mt-2">Catalyst</span></h1>
      <p className="mt-4 text-fog">Sign in with your BITS Pilani Dubai Google account to open your lab.</p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
