import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // Refreshes the session cookie if needed — required for Server Components to see
  // an up-to-date session further down the request lifecycle.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // SECURITY: gate the whole /admin area here, in addition to the check in
  // admin/layout.tsx. Next.js does not re-run a layout's checks on every
  // navigation (partial rendering), so a layout alone is not a reliable
  // guard — and several admin pages read data with the service-role client,
  // which bypasses database protections. Middleware runs on every request
  // to the path, including the background fetches the router makes, so it
  // cannot be skipped the way a layout check can.
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const redirectTo = (path: string) => {
      const redirect = NextResponse.redirect(new URL(path, request.url));
      // Keep any refreshed session cookies on the redirect response too.
      response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
      return redirect;
    };

    if (!user) {
      return redirectTo("/login");
    }

    const { data: admin } = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!admin) {
      return redirectTo("/dashboard");
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
