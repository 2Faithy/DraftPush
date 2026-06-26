import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">DraftPush</h1>
          <UserButton afterSignOutUrl="/" />
        </div>
        <p className="text-gray-600">Your dashboard is ready. Drafts will appear here.</p>
      </div>
    </div>
  );
}
