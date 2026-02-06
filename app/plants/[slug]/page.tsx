import { supabase } from "@/lib/supabaseClient";
import styles from "./page.module.css";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

type PlantType = {
  id: string;
  genus: string;
  cultivar: string;
  variegation: string | null;
  slug: string;
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
  created_at: string | null;
};

type PlantPhoto = {
  id: string;
  instance_id: string;
  url: string;
  caption: string | null;
  taken_at: string | null;
  created_at: string | null;
};

function displayNameFromType(p: PlantType) {
  return `${p.genus} ${p.cultivar}${p.variegation ? ` ${p.variegation}` : ""}`;
}

function sortPhotoKey(photo: PlantPhoto) {
  return photo.taken_at ?? photo.created_at ?? "";
}

export default async function PlantTypePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const supabaseServer = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const isAdmin =
    !!adminEmail && user?.email?.toLowerCase() === adminEmail;
  const isLoggedIn = !!user;

  const { slug } = await params;
  const { data: plantType, error } = await supabase
    .from("plant_types")
    .select("id, genus, cultivar, variegation, slug, cover_image_url")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>PlantsByJulie</h1>
        <pre>{error.message}</pre>
      </main>
    );
  }

  if (!plantType) {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>PlantsByJulie</h1>
        <p className={styles.empty}>
          Plant type with slug &quot;{slug}&quot; was not found in{" "}
          <code>plant_types</code>.
        </p>
      </main>
    );
  }

  const { data: instancesData, error: instanceError } = await supabase
    .from("plant_instances")
    .select(
      "id, type_id, acquired_at, price, currency, size_type, size_note, seller_name, source_type, for_swap, created_at"
    )
    .eq("type_id", plantType.id)
    .order("created_at", { ascending: false });

  const instances = (instancesData ?? []) as PlantInstance[];
  const instanceIds = instances.map((instance) => instance.id);

  const { data: photos, error: photoError } = instanceIds.length
    ? await supabase
        .from("plant_photos")
        .select("id, instance_id, url, caption, taken_at, created_at")
        .in("instance_id", instanceIds)
        .order("taken_at", { ascending: false })
    : { data: [], error: null };

  const photoMap = new Map<string, PlantPhoto[]>();
  (photos ?? []).forEach((photo) => {
    const list = photoMap.get(photo.instance_id) ?? [];
    list.push(photo);
    photoMap.set(photo.instance_id, list);
  });
  photoMap.forEach((list, key) => {
    photoMap.set(
      key,
      [...list].sort((a, b) => sortPhotoKey(b).localeCompare(sortPhotoKey(a)))
    );
  });

  const displayName = displayNameFromType(plantType);

  return (
    <main className={styles.page}>
      <div className={styles.backRow}>
        <Link href="/" className={styles.backLink}>
          ← Back to all plants
        </Link>
      </div>

      <header className={styles.header}>
        <div className={styles.headerTop}>
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
            {isAdmin ? (
              <button className={styles.addButton} type="button">
                + Add Instance
              </button>
            ) : null}
          </div>
        </div>

        <div className={styles.headerBody}>
          <div
            className={styles.headerImage}
            style={{
              backgroundImage: plantType.cover_image_url
                ? `url(${plantType.cover_image_url})`
                : undefined,
            }}
          />
          <div className={styles.headerContent}>
            <h1 className={styles.title}>{displayName}</h1>
          </div>
        </div>
      </header>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>My Plants</h2>
          <div className={styles.sectionMeta}>{instances.length} instances</div>
        </div>

        {instanceError ? (
          <pre className={styles.error}>{instanceError.message}</pre>
        ) : instances.length === 0 ? (
          <p className={styles.empty}>
            No instances yet. Add your first plant in Supabase.
          </p>
        ) : (
          <div className={styles.instanceGrid}>
            {instances.map((instance) => {
              const instancePhotos = photoMap.get(instance.id) ?? [];
              const heroUrl = instancePhotos[0]?.url ?? null;
              const label = `Plant ${instance.id.slice(0, 6)}`;
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
                    <div className={styles.instanceMeta}>
                      {instancePhotos.length} photos
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {photoError ? (
          <pre className={styles.error}>{photoError.message}</pre>
        ) : null}
      </section>
    </main>
  );
}
