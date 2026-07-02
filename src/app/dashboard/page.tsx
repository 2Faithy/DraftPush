import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ConnectDriveButton from "@/components/dashboard/ConnectDriveButton";
import ConnectLinkedInButton from "@/components/dashboard/ConnectLinkedInButton";
import TestCaptionButton from "@/components/dashboard/TestCaptionButton";
import PostToLinkedInButton from "@/components/dashboard/PostToLinkedInButton";
import ScanDriveButton from "@/components/dashboard/ScanDriveButton";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { drafts: { include: { platforms: true }, orderBy: { publishDate: 'asc' } } },
  });

  const driveConnected = !!user?.googleAccessToken;
  const linkedinConnected = !!user?.linkedinAccessToken;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">DraftPush</h1>
          <UserButton afterSignOutUrl="/" />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500 mb-3">Google Drive</p>
            {driveConnected ? (
              <div className="space-y-3">
                <p className="text-green-600 font-medium">✓ Connected</p>
                <ScanDriveButton />
              </div>
            ) : (
              <ConnectDriveButton />
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500 mb-3">LinkedIn</p>
            {linkedinConnected ? (
              <div className="flex items-center gap-3">
                <p className="text-blue-600 font-medium">✓ Connected</p>
                <ConnectLinkedInButton label="Reconnect" />
              </div>
            ) : (
              <ConnectLinkedInButton />
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Your Drafts</h2>
          {!user?.drafts.length && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-gray-500">No drafts yet.</p>
              <p className="text-sm text-gray-400 mt-1">
                Add <span className="font-mono bg-gray-100 px-1 rounded">✅ Title — Date</span> to a Google Doc and click Scan Drive.
              </p>
            </div>
          )}
          {user?.drafts.map((draft) => (
            <div key={draft.id} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{draft.postTitle}</h3>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  draft.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' :
                  draft.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                  draft.status === 'AI_GENERATED' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-600'
                }`}>{draft.status}</span>
              </div>
              <p className="text-sm text-gray-500 mb-1">
                📅 {new Date(draft.publishDate).toDateString()}
              </p>
              {draft.userCaption && (
                <p className="text-sm text-gray-600 mb-3">"{draft.userCaption}"</p>
              )}
              {draft.platforms.length === 0 && (
                <TestCaptionButton draftId={draft.id} />
              )}
              {draft.platforms.length > 0 && (
                <div className="mt-3 space-y-2">
                  {draft.platforms.map((p) => (
                    <div key={p.id} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{p.name}</p>
                      <p className="text-sm text-gray-700">{p.caption}</p>
                      {p.hashtags && <p className="text-xs text-blue-500 mt-1">{p.hashtags}</p>}
                      {p.name === 'linkedin' && linkedinConnected && !p.publishedAt && (
                        <PostToLinkedInButton platformId={p.id} />
                      )}
                      {p.publishedAt && (
                        <p className="text-xs text-green-500 mt-2">✓ Published {new Date(p.publishedAt).toLocaleDateString()}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
