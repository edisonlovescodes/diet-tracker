import { DashboardPage } from "@/server/dashboard-page";
import { headers } from "next/headers";

type PageProps = {
  searchParams?: Promise<{
    date?: string;
  }>;
};

export default async function Home({ searchParams }: PageProps) {
  const headersList = await headers();
  const experienceId = headersList.get("x-whop-experience-id");

  return <DashboardPage experienceId={experienceId ?? undefined} searchParamsPromise={searchParams} />;
}
