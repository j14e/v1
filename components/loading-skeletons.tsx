import type { ReactNode } from "react";

const rows = ["one", "two", "three", "four", "five", "six"];

function Bone({ className = "" }: { className?: string }) {
  return <span className={`sona-bone ${className}`} />;
}

function SkeletonHeader() {
  return (
    <>
      <header className="sona-topbar sona-skeleton-topbar">
        <span className="sona-wordmark">SONA</span>
        <div className="sona-skeleton-session">
          <Bone className="sona-bone-name" />
          <Bone className="sona-bone-pill" />
        </div>
      </header>
      <nav className="sona-tabs sona-skeleton-tabs" aria-hidden="true">
        <Bone className="sona-tab-bone active" />
        <Bone className="sona-tab-bone" />
        <Bone className="sona-tab-bone" />
      </nav>
    </>
  );
}

function SkeletonShell({ children }: { children: ReactNode }) {
  return (
    <div className="sona-app-shell sona-skeleton-shell" role="status" aria-label="Loading page">
      <span className="visually-hidden">Loading page</span>
      <div aria-hidden="true">
        <SkeletonHeader />
        {children}
      </div>
    </div>
  );
}

export function DirectoryLoadingSkeleton() {
  return (
    <SkeletonShell>
      <main className="sona-main">
        <div className="sona-new-members sona-new-members-skeleton">
          <strong className="sona-new-members-title">New users</strong>
          <div className="sona-new-members-list">
            {rows.slice(0, 5).map((row) => (
              <div className="sona-new-member" key={row}>
                <Bone className="sona-bone-new-avatar" />
                <Bone className="sona-bone-new-name" />
                <Bone className="sona-bone-new-course" />
              </div>
            ))}
          </div>
        </div>
        <div className="sona-directory-layout">
          <section className="sona-directory-column sona-skeleton-directory">
            <div className="sona-skeleton-search">
              <Bone className="sona-bone-input" />
            </div>
            <div className="sona-skeleton-member-list">
              {rows.map((row) => (
                <div className="sona-directory-card sona-skeleton-member" key={row}>
                  <Bone className="sona-bone-avatar" />
                  <span className="sona-skeleton-member-copy">
                    <Bone className="sona-bone-person" />
                    <Bone className="sona-bone-study" />
                    <Bone className="sona-bone-meta" />
                  </span>
                  <Bone className="sona-bone-chevron" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </SkeletonShell>
  );
}

export function ProfileLoadingSkeleton() {
  return (
    <SkeletonShell>
      <main className="sona-main">
        <section className="sona-profile-card sona-skeleton-profile">
          <div className="sona-profile-cover" />
          <div className="sona-profile-content">
            <Bone className="sona-bone-profile-avatar" />
            <div className="sona-skeleton-profile-name">
              <Bone className="sona-bone-eyebrow" />
              <Bone className="sona-bone-title" />
              <Bone className="sona-bone-study" />
            </div>
            <div className="sona-skeleton-details">
              {["year", "studies", "major", "department", "courses", "email"].map((item) => (
                <div key={item}>
                  <Bone className="sona-bone-label" />
                  <Bone className="sona-bone-study" />
                </div>
              ))}
            </div>
            <Bone className="sona-bone-pill wide" />
          </div>
        </section>
      </main>
    </SkeletonShell>
  );
}

export function MessagesLoadingSkeleton({ chat = false }: { chat?: boolean }) {
  return (
    <SkeletonShell>
      <main className="sona-main sona-skeleton-narrow">
        <section className="sona-skeleton-page-card">
          <div className="sona-skeleton-card-heading">
            <Bone className="sona-bone-title" />
            <Bone className="sona-bone-count" />
          </div>
          <div className={chat ? "sona-skeleton-chat" : "sona-skeleton-conversations"}>
            {rows.slice(0, chat ? 4 : 5).map((row, index) => (
              <div className={chat ? `sona-skeleton-bubble-row ${index % 2 ? "mine" : ""}` : "sona-skeleton-conversation"} key={row}>
                <Bone className="sona-bone-avatar small" />
                <span>
                  <Bone className="sona-bone-person" />
                  <Bone className={index % 2 ? "sona-bone-study short" : "sona-bone-study"} />
                </span>
                {!chat ? <Bone className="sona-bone-meta" /> : null}
              </div>
            ))}
          </div>
          {chat ? (
            <div className="sona-skeleton-composer">
              <Bone className="sona-bone-input tall" />
              <Bone className="sona-bone-pill wide" />
            </div>
          ) : null}
        </section>
      </main>
    </SkeletonShell>
  );
}

export function AdminLoadingSkeleton() {
  return (
    <SkeletonShell>
      <main className="sona-main">
        <section className="sona-skeleton-page-card">
          <div className="sona-skeleton-card-heading">
            <div>
              <Bone className="sona-bone-title" />
              <Bone className="sona-bone-study" />
            </div>
            <Bone className="sona-bone-pill" />
          </div>
          <div className="sona-skeleton-admin-grid">
            {rows.map((row) => (
              <div key={row}>
                <Bone className="sona-bone-avatar small" />
                <Bone className="sona-bone-person" />
                <Bone className="sona-bone-study" />
                <Bone className="sona-bone-meta" />
                <Bone className="sona-bone-pill" />
              </div>
            ))}
          </div>
        </section>
      </main>
    </SkeletonShell>
  );
}
