"use client";

import { useState } from "react";

export default function ScanDriveButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleScan() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/drive/scan");
      const data = await res.json();
      if (data.saved > 0) {
        setResult(`Found ${data.saved} new draft${data.saved > 1 ? 's' : ''}!`);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setResult("No new drafts found.");
      }
    } catch {
      setResult("Scan failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleScan}
        disabled={loading}
        className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50"
      >
        {loading ? "Scanning..." : "Scan Drive"}
      </button>
      {result && <p className="text-sm text-gray-600">{result}</p>}
    </div>
  );
}
