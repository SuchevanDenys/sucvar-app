"use client";

export default function EnvCheck() {
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