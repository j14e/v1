import Link from "next/link";
import { MinimalSignupForm } from "@/components/minimal-signup-form";

export default function SignupPage() {
  return (
    <main className="sona-signup-page">
      <section className="sona-signup-card">
        <Link className="sona-signup-wordmark" href="/">SONA</Link>
        <h1>JOIN NOW</h1>
        <MinimalSignupForm />
      </section>
    </main>
  );
}
