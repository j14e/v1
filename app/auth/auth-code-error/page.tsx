import Link from "next/link";

export default function AuthCodeErrorPage() {
  return (
    <main className="plain-message-page">
      <section className="side-panel message-card">
        <div className="panel-heading">Email confirmation problem</div>
        <div>
          <h1>The confirmation link did not work.</h1>
          <p>
            It may have expired or already been used. Return to the directory
            and sign in, or create the account again to receive a fresh link.
          </p>
          <Link className="button inline-button" href="/">
            Return to directory
          </Link>
        </div>
      </section>
    </main>
  );
}
