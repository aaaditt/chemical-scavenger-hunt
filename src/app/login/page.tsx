import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-dvh max-w-md mx-auto px-6 py-12 flex flex-col">
      <h1 className="wide text-4xl leading-none">Secret<br />Catalyst</h1>
      <p className="mt-4 text-label-dim">Sign in with your BITS Pilani Dubai Google account to open your lab.</p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
