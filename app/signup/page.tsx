import { MinimalSignupForm } from "@/components/minimal-signup-form";
import { SonaLogo } from "@/components/sona-logo";

export default function SignupPage() {
  return (
    <main className="sona-signup-page">
      <section className="sona-signup-card">
        <header className="sona-signup-heading">
          <SonaLogo variant="page" />
          <h1>JOIN NOW</h1>
        </header>
        <MinimalSignupForm />
      </section>
    </main>
  );
}
