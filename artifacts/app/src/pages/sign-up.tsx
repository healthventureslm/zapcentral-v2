import { SignUp } from "@clerk/react";
import { basePath } from "@/App";

export default function SignUpPage() {
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
