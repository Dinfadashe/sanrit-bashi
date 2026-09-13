import { requireUser } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/site/ProfileForm";
import type { ProfileRow } from "@/types/database";

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  let profile = existingProfile as ProfileRow | null;

  // A profile row is normally created at registration, but an account created
  // directly in Supabase (e.g. from the dashboard, bypassing our register
  // flow) won't have one yet. Create a minimal one now rather than crash.
  if (!profile) {
    const fullName =
      (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "New Borrower";

    const { data: created } = await supabase
      .from("profiles")
      .insert({
        user_id: user.id,
        full_name: fullName,
        email: user.email ?? "",
        phone: (user.user_metadata?.phone as string | undefined) ?? null,
      })
      .select("*")
      .single();

    profile = created as ProfileRow | null;
  }

  if (!profile) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">Profile</h1>
        <p className="mt-3 text-sm text-red-600">
          We couldn&apos;t load or create your profile. Please refresh this page — if it keeps
          happening, contact support.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-navy">Profile</h1>
      <p className="mt-1 text-brand-slate">Keep your details up to date for a smoother loan review.</p>
      <div className="mt-6 max-w-3xl">
        <ProfileForm profile={profile} />
      </div>
    </div>
  );
}