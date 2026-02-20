import styles from "./page.module.css";
import { supabase } from "@/lib/supabaseClient";
import PlantGrid, { PlantType } from "@/components/PlantGrid";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import AddPlantModal from "@/components/AddPlantModal";
import ToastHost from "@/components/ToastHost";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const supabaseServer = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const isAdmin =
    !!adminEmail && user?.email?.toLowerCase() === adminEmail;
  const isLoggedIn = !!user;

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? "1") || 1);
  const perPage = 24;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data, error, count } = await supabase
    .from("plant_types")
    .select("id, genus, cultivar, variegation, slug, cover_image_url", {
      count: "exact",
    })
    .order("genus")
    .order("cultivar")
    .range(from, to);

  if (error) {
    return (
      <main>
        <h1 className={styles.title}>PlantsByJulie</h1>
        <pre>{error.message}</pre>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <ToastHost />
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          <Image
            className={styles.logoImage}
            src="/logo.png"
            alt="PlantsByJuli"
            width={220}
            height={70}
            priority
          />
        </Link>
        <div className={styles.headerActions}>
          <Link href="/swap" className={styles.navLink}>
            Swap
          </Link>
          {isLoggedIn ? (
            <a href="/logout" className={styles.navLink}>
              Logout
            </a>
          ) : (
            <Link href="/login" className={styles.navLink}>
              Login
            </Link>
          )}
          <AddPlantModal isAdmin={isAdmin} />
        </div>
      </header>

      <PlantGrid plants={(data ?? []) as PlantType[]} isAdmin={isAdmin} />
      {count && from + (data?.length ?? 0) < count ? (
        <div className={styles.loadMoreRow}>
          <Link href={`/?page=${page + 1}`} className={styles.loadMore}>
            Load more
          </Link>
        </div>
      ) : null}
    </main>
  );
}
