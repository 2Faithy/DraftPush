"use client";

export default function ConnectLinkedInButton({ label = "Connect LinkedIn" }: { label?: string }) {
  return (
    <button
      onClick={() => { window.location.href = "/api/linkedin/auth"; }}
      className="inline-block bg-[#0077B5] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#006097] transition"
    >
      {label}
    </button>
  );
}
