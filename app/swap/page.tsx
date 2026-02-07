import Link from "next/link";
import styles from "./page.module.css";
import { supabase } from "@/lib/supabaseClient";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

type PlantType = {
  id: string;
  genus: string;
  cultivar: string;
  variegation: string | null;
  cover_image_url: string | null;
};

type PlantInstance = {
  id: string;
  type_id: string;
  acquired_at: string | null;
  price: number | null;
  currency: string | null;
  size_type: string | null;
  size_note: string | null;
  seller_name: string | null;
  source_type: string | null;
  for_swap: boolean | null;
  notes: string | null;
  plant_number: number | null;
  created_at: string | null;
};

type PlantPhoto = {
  id: string;
  instance_id: string;
  url: string;
  caption: string | null;
  taken_at: string | null;
  created_at: string | null;
  is_featured: boolean | null;
};

function displayNameFromType(p: PlantType | undefined) {
  if (!p) return "Unknown plant";
  return `${p.genus} ${p.cultivar}${p.variegation ? ` ${p.variegation}` : ""}`;
}

function sortPhotoKey(photo: PlantPhoto) {
  return photo.taken_at ?? photo.created_at ?? "";
}

function sortPhotos(a: PlantPhoto, b: PlantPhoto) {
  const aFeatured = a.is_featured ? 1 : 0;
  const bFeatured = b.is_featured ? 1 : 0;
  if (aFeatured !== bFeatured) return bFeatured - aFeatured;
  return sortPhotoKey(b).localeCompare(sortPhotoKey(a));
}

export default async function SwapPage() {
  const supabaseServer = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const isAdmin =
    !!adminEmail && user?.email?.toLowerCase() === adminEmail;
  const isLoggedIn = !!user;

  const { data: instances, error: instanceError } = await supabase
    .from("plant_instances")
    .select(
      "id, type_id, acquired_at, price, currency, size_type, size_note, seller_name, source_type, for_swap, notes, plant_number, created_at"
    )
    .eq("for_swap", true)
    .order("created_at", { ascending: false });

  const swapInstances = (instances ?? []) as PlantInstance[];
  const typeIds = Array.from(
    new Set(swapInstances.map((instance) => instance.type_id).filter(Boolean))
  );

  const { data: types } = typeIds.length
    ? await supabase
        .from("plant_types")
        .select("id, genus, cultivar, variegation, cover_image_url")
        .in("id", typeIds)
    : { data: [] };

  const typeMap = new Map(
    (types ?? []).map((type) => [type.id, type as PlantType])
  );

  const instanceIds = swapInstances.map((instance) => instance.id);

  const { data: photos } = instanceIds.length
    ? await supabase
        .from("plant_photos")
        .select("id, instance_id, url, caption, taken_at, created_at, is_featured")
        .in("instance_id", instanceIds)
        .order("taken_at", { ascending: false })
    : { data: [] };

  const photoMap = new Map<string, PlantPhoto[]>();
  (photos ?? []).forEach((photo) => {
    const list = photoMap.get(photo.instance_id) ?? [];
    list.push(photo);
    photoMap.set(photo.instance_id, list);
  });
  photoMap.forEach((list, key) => {
    photoMap.set(
      key,
      [...list].sort(sortPhotos)
    );
  });

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          <img
            className={styles.logoImage}
            src="/logo.png"
            alt="PlantsByJuli"
          />
        </Link>
        <div className={styles.headerActions}>
          <Link href="/" className={styles.navLink}>
            All Plants
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
          {isAdmin ? (
            <button className={styles.addButton} type="button">
              + Add Plant
            </button>
          ) : null}
        </div>
      </header>

      <h1 className={styles.title}>Swap</h1>

      {instanceError ? (
        <pre className={styles.error}>{instanceError.message}</pre>
      ) : swapInstances.length === 0 ? (
        <p className={styles.empty}>Nothing on swap yet.</p>
      ) : (
        <div className={styles.instanceGrid}>
          {swapInstances.map((instance) => {
            const type = typeMap.get(instance.type_id);
            const instancePhotos = photoMap.get(instance.id) ?? [];
            const heroUrl =
              type?.cover_image_url ?? instancePhotos[0]?.url ?? null;
            const numberLabel = instance.plant_number
              ? `#${instance.plant_number}`
              : null;
            const label = numberLabel
              ? `${displayNameFromType(type)} ${numberLabel}`
              : displayNameFromType(type);
            const metaParts = [
              instance.size_type,
              instance.size_note,
              instance.source_type,
              instance.seller_name,
            ].filter(Boolean);
            const priceLabel =
              instance.price && instance.currency
                ? `${instance.price} ${instance.currency}`
                : null;

            return (
              <div key={instance.id} className={styles.instanceCard}>
                <div
                  className={styles.instanceImage}
                  style={{
                    backgroundImage: heroUrl ? `url(${heroUrl})` : undefined,
                  }}
                />
                  <div className={styles.instanceBody}>
                    <div className={styles.instanceTitle}>{label}</div>
                    {isAdmin ? (
                      <>
                        {metaParts.length ? (
                          <div className={styles.instanceSlug}>
                            {metaParts.join(" · ")}
                          </div>
                        ) : null}
                        {instance.acquired_at ? (
                          <div className={styles.instanceMeta}>
                            Acquired {instance.acquired_at}
                          </div>
                        ) : null}
                        {priceLabel ? (
                          <div className={styles.instanceMeta}>{priceLabel}</div>
                        ) : null}
                        {instance.notes ? (
                          <div className={styles.instanceMeta}>
                            {instance.notes}
                          </div>
                        ) : null}
                        <div className={styles.instanceMeta}>
                          {instancePhotos.length} photos
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </main>
  );
}
