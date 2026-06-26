"use client";

import { useState } from "react";

export default function TestCaptionButton({ draftId }: { draftId: string }) {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTest() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        onClick={handleTest}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
      >
        {loading ? "Generating..." : "Generate Captions"}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}
      {result && (
        <pre className="mt-4 bg-gray-100 p-4 rounded-lg text-sm overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
