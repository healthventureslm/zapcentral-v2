import { SignUp } from "@clerk/react";
import { basePath } from "@/App";
import { DEV_AUTH_BYPASS } from "@/lib/devAuth";
import DevSignInPage from "@/pages/dev-sign-in";

export default function SignUpPage() {
  // No bypass nao existe cadastro: qualquer identidade e aceita na hora.
  if (DEV_AUTH_BYPASS) return <DevSignInPage />;

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-b from-[#0F1923] to-[#1a2735] p-4">
      {/* path must be the full browser path — Clerk reads window.location.pathname directly */}
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </div>
  );
}
