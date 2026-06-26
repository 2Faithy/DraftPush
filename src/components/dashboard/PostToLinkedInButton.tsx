"use client";

import { useState } from "react";

export default function PostToLinkedInButton({ platformId }: { platformId: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePost() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/linkedin/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platformId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to post");
      setDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (done) return <p className="text-xs text-green-500 mt-2">✓ Posted to LinkedIn</p>;

  return (
    <div className="mt-2">
      <button
        onClick={handlePost}
        disabled={loading}
        className="bg-[#0077B5] text-white text-xs px-3 py-1.5 rounded font-medium hover:bg-[#006097] transition disabled:opacity-50"
      >
        {loading ? "Posting..." : "Post to LinkedIn"}
      </button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
