import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ConnectDriveButton from "@/components/dashboard/ConnectDriveButton";
import ConnectLinkedInButton from "@/components/dashboard/ConnectLinkedInButton";
import TestCaptionButton from "@/components/dashboard/TestCaptionButton";
import PostToLinkedInButton from "@/components/dashboard/PostToLinkedInButton";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { drafts: { include: { platforms: true } } },
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

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500 mb-3">Google Drive</p>
            {driveConnected ? (
              <p className="text-green-600 font-medium">✓ Connected</p>
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
          {user?.drafts.map((draft) => (
            <div key={draft.id} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{draft.postTitle}</h3>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{draft.status}</span>
              </div>
              <p className="text-sm text-gray-500 mb-1">
                Publish: {new Date(draft.publishDate).toDateString()}
              </p>
              {draft.userCaption && (
                <p className="text-sm text-gray-600 mb-2">Caption: {draft.userCaption}</p>
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
                      <p className="text-xs text-blue-500 mt-1">{p.hashtags}</p>
                      {p.name === 'linkedin' && linkedinConnected && !p.publishedAt && (
                        <PostToLinkedInButton platformId={p.id} />
                      )}
                      {p.publishedAt && (
                        <p className="text-xs text-green-500 mt-1">✓ Published</p>
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
