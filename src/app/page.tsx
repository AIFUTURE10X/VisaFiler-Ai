import { AppShell } from "@/components/app-shell";
import { readAppData } from "@/lib/store-service";

export default async function Home() {
  const data = await readAppData();

  return <AppShell initialData={data} />;
}
