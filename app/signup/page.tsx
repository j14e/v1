import Link from "next/link";
import { MinimalSignupForm } from "@/components/minimal-signup-form";

export default function SignupPage() {
  return (
    <main className="sona-signup-page">
      <section className="sona-signup-card">
        <Link className="sona-signup-wordmark" href="/">SONA</Link>
        <h1>Join the directory</h1>
        <p>University of Auckland students only. It takes less than a minute.</p>
        <MinimalSignupForm />
        <Link className="sona-back-link" href="/">Back to SONA</Link>
      </section>
    </main>
  );
}
