import styles from "./page.module.css";
import { supabase } from "@/lib/supabaseClient";
import PlantGrid, { PlantType } from "@/components/PlantGrid";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import AddPlantModal from "@/components/AddPlantModal";
import ToastHost from "@/components/ToastHost";

export default async function Home() {
  const supabaseServer = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const isAdmin =
    !!adminEmail && user?.email?.toLowerCase() === adminEmail;
  const isLoggedIn = !!user;

  const { data, error } = await supabase
    .from("plant_types")
    .select("id, genus, cultivar, variegation, slug, cover_image_url")
    .order("genus")
    .order("cultivar");

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
          <img
            className={styles.logoImage}
            src="/logo.png"
            alt="PlantsByJuli"
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

      <PlantGrid plants={(data ?? []) as PlantType[]} />
    </main>
  );
}
