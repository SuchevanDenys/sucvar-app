// Dev-only page for verifying that environment variables are configured.
// Renders a 404 in production so it never exposes configuration state.
import { notFound } from "next/navigation";

export default function EnvCheck() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <pre style={{ padding: 24 }}>
      {JSON.stringify(
        {
          url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          anon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          publishable: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        },
        null,
        2
      )}
    </pre>
  );
}
