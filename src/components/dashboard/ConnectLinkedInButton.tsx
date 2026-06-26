"use client";

export default function ConnectLinkedInButton() {
  return (
    <button
      onClick={() => { window.location.href = "/api/linkedin/auth"; }}
      className="inline-block bg-[#0077B5] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#006097] transition"
    >
      Connect LinkedIn
    </button>
  );
}
