import { redirect } from "next/navigation";
import { OracleMatcher } from "@/components/oracle-matcher";
import { SimpleHeader } from "@/components/simple-header";
import { createClient } from "@/lib/supabase/server";
import type { OracleMatch, OracleState } from "@/types/oracle";
import type { Profile } from "@/types/profile";

export const dynamic = "force-dynamic";

type OracleConnection = {
  member_low: string;
  member_high: string;
  created_at: string;
};

function getMatchReasons(profile: Profile, candidate: Profile) {
  const reasons: string[] = [];
  if (profile.year_level === candidate.year_level) reasons.push("same year");
  if (profile.programme && profile.programme === candidate.programme) {
    reasons.push("same programme");
  }
  if (profile.major && profile.major === candidate.major) {
    reasons.push("same major");
  }
  if (profile.department && profile.department === candidate.department) {
    reasons.push("same department");
  }
  if (candidate.courses.some((course) => profile.courses.includes(course))) {
    reasons.push("shared courses");
  }
  return reasons;
}

export default async function OraclePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const [{ data: ownProfile }, { data: rawConnections }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id,email,display_name,availability_status,year_level,programme,major,department,courses,avatar_url,verified,created_at",
      )
      .eq("id", user.id)
      .eq("verified", true)
      .maybeSingle(),
    supabase
      .from("oracle_connections")
      .select("member_low,member_high,created_at")
      .or(`member_low.eq.${user.id},member_high.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (!ownProfile) redirect("/account");
  const profile = ownProfile as Profile;
  const connections = (rawConnections ?? []) as OracleConnection[];
  const connectedAt = new Map(
    connections.map((connection) => [
      connection.member_low === user.id
        ? connection.member_high
        : connection.member_low,
      connection.created_at,
    ]),
  );
  const peerIds = Array.from(connectedAt.keys());

  const { data: rawPeers } = peerIds.length
    ? await supabase
        .from("profiles")
        .select(
          "id,email,display_name,availability_status,year_level,programme,major,department,courses,avatar_url,verified,created_at",
        )
        .in("id", peerIds)
    : { data: [] };

  const peers = new Map(
    ((rawPeers ?? []) as Profile[]).map((peer) => [peer.id, peer]),
  );
  const initialMatches = peerIds.flatMap((peerId): OracleMatch[] => {
    const peer = peers.get(peerId);
    const date = connectedAt.get(peerId);
    if (!peer || !date) return [];
    return [
      {
        matched_id: peer.id,
        display_name: peer.display_name,
        availability_status: peer.availability_status,
        year_level: peer.year_level,
        programme: peer.programme,
        major: peer.major,
        department: peer.department,
        courses: peer.courses,
        avatar_url: peer.avatar_url,
        match_reasons: getMatchReasons(profile, peer),
        connected_at: date,
      },
    ];
  });
  const initialState: OracleState = {
    matches: initialMatches,
    message: initialMatches.length
      ? `${initialMatches.length} previous Oracle ${
          initialMatches.length === 1 ? "connection" : "connections"
        }.`
      : "",
    error: "",
    hasRun: false,
  };

  return (
    <div className="site-shell">
      <SimpleHeader name={profile.display_name} />
      <main className="oracle-page">
        <OracleMatcher profile={profile} initialState={initialState} />
      </main>
    </div>
  );
}
