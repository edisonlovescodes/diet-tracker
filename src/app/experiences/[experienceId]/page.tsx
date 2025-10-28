import { DashboardPage } from "@/server/dashboard-page";

type ExperiencePageProps = {
  params: Promise<{ experienceId: string }>;
  searchParams?: Promise<{
    date?: string;
  }>;
};

export default async function ExperiencePage({ params, searchParams }: ExperiencePageProps) {
  const { experienceId } = await params;
  return (
    <DashboardPage
      experienceId={experienceId}
      searchParamsPromise={searchParams}
    />
  );
}
