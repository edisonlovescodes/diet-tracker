import { DashboardPage } from "@/server/dashboard-page";

type PageProps = {
  searchParams?: Promise<{
    date?: string;
  }>;
};

export default function Home({ searchParams }: PageProps) {
  return <DashboardPage searchParamsPromise={searchParams} />;
}
