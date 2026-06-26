"use client";

export default function ConnectDriveButton() {
  return (
    <button
      onClick={() => { window.location.href = "/api/drive/auth"; }}
      className="inline-block bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition"
    >
      Connect Google Drive
    </button>
  );
}
