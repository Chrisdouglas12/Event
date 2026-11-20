import { revalidatePath } from "next/cache";
import { adminApi } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

type DeadJob = {
  id: string;
  channel: string;
  attempts: number;
  lastError?: string | null;
  createdAt: string;
  payload?: { participantName?: string; refCode?: string } | null;
};

async function retryJob(formData: FormData) {
  "use server";
  const id = String(formData.get("jobId") || "");
  if (!id) return;
  await adminApi(`/jobs/${encodeURIComponent(id)}/retry`, { method: "POST" });
  revalidatePath("/admin/messaging");
}

export default async function MessagingQueuePage() {
  let deadJobs: DeadJob[] = [];
  try {
    const data = await adminApi("/jobs?status=failed&limit=100");
    deadJobs = data.jobs || [];
  } catch (error) {
    console.error("[admin/messaging] Unable to load failed jobs:", error);
  }

  return (
    <main className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Operations</p>
        <h1 className="mt-1 text-2xl font-black text-[#111320]">Messaging dead letters</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Failed ticket SMS and email jobs. Contact details and ticket links are hidden here.
        </p>
      </header>

      {deadJobs.length === 0 ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-600">
          No failed messages are waiting for review.
        </section>
      ) : (
        <section className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Participant</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Attempts</th>
                <th className="px-4 py-3">Last attempt</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {deadJobs.map((job) => (
                <tr key={job.id}>
                  <td className="px-4 py-3 font-semibold text-gray-900">{job.payload?.participantName || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{job.payload?.refCode || "—"}</td>
                  <td className="px-4 py-3 uppercase">{job.channel}</td>
                  <td className="px-4 py-3">{job.attempts}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(job.createdAt).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}
                  </td>
                  <td className="px-4 py-3">
                    <form action={retryJob}>
                      <input type="hidden" name="jobId" value={job.id} />
                      <button className="rounded-lg bg-[#0E1020] px-3 py-2 text-xs font-bold text-white hover:bg-[#20243a]">
                        Retry
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
