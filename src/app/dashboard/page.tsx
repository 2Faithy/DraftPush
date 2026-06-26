import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ConnectDriveButton from "@/components/dashboard/ConnectDriveButton";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  const driveConnected = !!user?.googleAccessToken;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">DraftPush</h1>
          <UserButton afterSignOutUrl="/" />
        </div>

        {!driveConnected ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Connect Google Drive</h2>
            <p className="text-gray-500 mb-6">Connect your Drive so DraftPush can find your ready drafts</p>
            <ConnectDriveButton />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-green-500">✓</span>
              <h2 className="text-lg font-semibold text-gray-800">Google Drive Connected</h2>
            </div>
            <p className="text-gray-500">Your drafts will appear here once detected.</p>
          </div>
        )}
      </div>
    </div>
  );
}
