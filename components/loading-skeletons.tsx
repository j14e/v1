import type { ReactNode } from "react";

const directoryRows = ["one", "two", "three", "four", "five"];
const detailRows = [
  "name",
  "availability",
  "year",
  "programme",
  "major",
  "department",
  "courses",
];
const messageRows = ["first", "second", "third", "fourth"];
const adminRows = ["member-one", "member-two", "member-three"];

function SkeletonLine({
  className = "",
}: {
  className?: string;
}) {
  return <span className={`skeleton-block skeleton-line ${className}`} />;
}

function SkeletonHeader() {
  return (
    <>
      <header className="topbar skeleton-topbar">
        <span className="wordmark">v1</span>
        <nav className="primary-nav" aria-hidden="true">
          <span className="skeleton-nav-item" />
          <span className="skeleton-nav-item" />
          <span className="skeleton-nav-item" />
        </nav>
        <div className="member-actions">
          <SkeletonLine className="skeleton-signed-in" />
          <SkeletonLine className="skeleton-nav-action" />
        </div>
      </header>
      <div className="utility-strip skeleton-utility" aria-hidden="true">
        <SkeletonLine className="skeleton-utility-title" />
        <SkeletonLine className="skeleton-utility-copy" />
      </div>
    </>
  );
}

function SkeletonShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="site-shell skeleton-shell"
      role="status"
      aria-label="Loading page"
    >
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
      <div className="page-grid">
        <aside className="sidebar skeleton-sidebar">
          {["browse", "about", "access"].map((panel) => (
            <section className="side-panel skeleton-side-panel" key={panel}>
              <div className="panel-heading">
                <SkeletonLine className="skeleton-panel-title" />
              </div>
              <div className="skeleton-panel-body">
                <SkeletonLine />
                <SkeletonLine className="short" />
                <SkeletonLine className="medium" />
              </div>
            </section>
          ))}
        </aside>
        <main className="directory-main">
          <div className="section-heading skeleton-section-heading">
            <div>
              <SkeletonLine className="skeleton-heading-line" />
              <SkeletonLine className="skeleton-subheading-line" />
            </div>
          </div>
          <div className="directory-tools">
            <SkeletonLine className="skeleton-label-line" />
            <span className="skeleton-block skeleton-input-block" />
          </div>
          <section className="directory-panel">
            <div className="directory-header">
              <span>person</span>
              <span>year</span>
              <span>programme / major</span>
              <span>faculty or department</span>
              <span />
            </div>
            <div className="directory-list">
              {directoryRows.map((row) => (
                <div className="directory-row skeleton-directory-row" key={row}>
                  <span className="person-cell">
                    <span className="skeleton-block skeleton-avatar" />
                    <span className="skeleton-person-lines">
                      <SkeletonLine className="medium" />
                      <SkeletonLine className="short" />
                    </span>
                  </span>
                  <SkeletonLine className="short" />
                  <span>
                    <SkeletonLine className="medium" />
                    <SkeletonLine className="short" />
                  </span>
                  <SkeletonLine className="medium" />
                  <SkeletonLine className="short" />
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </SkeletonShell>
  );
}

export function ProfileLoadingSkeleton() {
  return (
    <SkeletonShell>
      <main className="profile-page">
        <section className="profile-card">
          <div className="profile-titlebar">
            <SkeletonLine className="skeleton-heading-line" />
            <SkeletonLine className="skeleton-status-line" />
          </div>
          <div className="profile-body">
            <aside className="profile-photo">
              <span className="skeleton-block skeleton-profile-photo" />
              <SkeletonLine className="medium" />
            </aside>
            <div className="profile-details skeleton-profile-details">
              <dl>
                {detailRows.map((row) => (
                  <div key={row}>
                    <dt>
                      <SkeletonLine className="medium" />
                    </dt>
                    <dd>
                      <SkeletonLine className={row === "courses" ? "long" : "medium"} />
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="skeleton-profile-actions">
                <span className="skeleton-block skeleton-button-block" />
                <span className="skeleton-block skeleton-button-block" />
              </div>
            </div>
          </div>
        </section>
      </main>
    </SkeletonShell>
  );
}

export function MessagesLoadingSkeleton({ chat = false }: { chat?: boolean }) {
  return (
    <SkeletonShell>
      <main className="messages-page">
        <section className={chat ? "chat-card" : "messages-card"}>
          <div className={chat ? "chat-titlebar" : "profile-titlebar"}>
            <SkeletonLine className="skeleton-heading-line" />
            <SkeletonLine className="skeleton-status-line" />
          </div>
          {chat ? (
            <>
              <div className="message-history skeleton-message-history">
                {messageRows.map((row, index) => (
                  <div
                    className={index % 2 ? "message-row mine" : "message-row"}
                    key={row}
                  >
                    <span className="skeleton-block skeleton-chat-avatar" />
                    <span className="message-bubble skeleton-message-bubble">
                      <SkeletonLine className="short" />
                      <SkeletonLine className={index % 2 ? "medium" : "long"} />
                      <SkeletonLine className="medium" />
                    </span>
                  </div>
                ))}
              </div>
              <div className="message-composer skeleton-composer">
                <SkeletonLine className="skeleton-label-line" />
                <span className="skeleton-block skeleton-textarea-block" />
                <span className="skeleton-block skeleton-button-block" />
              </div>
            </>
          ) : (
            <div className="conversation-list">
              {messageRows.map((row) => (
                <div className="conversation-row" key={row}>
                  <span className="skeleton-block skeleton-conversation-avatar" />
                  <span className="conversation-person">
                    <SkeletonLine className="medium" />
                    <SkeletonLine className="short" />
                  </span>
                  <SkeletonLine className="long" />
                  <SkeletonLine className="short" />
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </SkeletonShell>
  );
}

export function AdminLoadingSkeleton() {
  return (
    <SkeletonShell>
      <main className="admin-page">
        <section className="admin-directory">
          <div className="admin-titlebar">
            <div>
              <SkeletonLine className="skeleton-heading-line" />
              <SkeletonLine className="short" />
            </div>
            <span className="skeleton-block skeleton-button-block" />
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table skeleton-admin-table">
              <thead>
                <tr>
                  {["member", "email", "joined", "studies", "department", "courses", "status", "controls"].map(
                    (heading) => (
                      <th key={heading}>{heading}</th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {adminRows.map((row) => (
                  <tr key={row}>
                    <td>
                      <span className="admin-person">
                        <span className="skeleton-block skeleton-chat-avatar" />
                        <SkeletonLine className="medium" />
                      </span>
                    </td>
                    <td><SkeletonLine className="long" /></td>
                    <td><SkeletonLine className="medium" /></td>
                    <td><SkeletonLine className="medium" /></td>
                    <td><SkeletonLine className="medium" /></td>
                    <td><SkeletonLine className="short" /></td>
                    <td><SkeletonLine className="short" /></td>
                    <td><span className="skeleton-block skeleton-button-block" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </SkeletonShell>
  );
}
