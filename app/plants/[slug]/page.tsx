import { supabase } from "@/lib/supabaseClient";
import styles from "./page.module.css";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import AddInstanceModal from "@/components/AddInstanceModal";
import ToastHost from "@/components/ToastHost";
import InstanceCard from "@/components/InstanceCard";

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

function displayNameFromType(p: PlantType) {
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
      "id, type_id, acquired_at, price, currency, size_type, size_note, seller_name, source_type, for_swap, notes, plant_number, created_at"
    )
    .eq("type_id", plantType.id)
    .order("created_at", { ascending: false });

  const instances = (instancesData ?? []) as PlantInstance[];
  const instanceIds = instances.map((instance) => instance.id);

  const { data: photos, error: photoError } = instanceIds.length
    ? await supabase
        .from("plant_photos")
        .select("id, instance_id, url, caption, taken_at, created_at, is_featured")
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
      [...list].sort(sortPhotos)
    );
  });

  const displayName = displayNameFromType(plantType);

  return (
    <main className={styles.page}>
      <ToastHost />
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
            <AddInstanceModal
              isAdmin={isAdmin}
              typeId={plantType.id}
              typeSlug={plantType.slug}
            />
          </div>
        </div>

        <div className={styles.banner}>
          <h1 className={styles.title}>{displayName}</h1>
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
              const numberLabel = instance.plant_number
                ? `#${instance.plant_number}`
                : `Plant ${instance.id.slice(0, 6)}`;
              const label = isAdmin
                ? numberLabel
                : `${displayName} ${numberLabel}`;
              const metaParts = [
                instance.size_type,
                instance.size_note,
                instance.source_type,
                instance.seller_name,
              ].filter((value): value is string => Boolean(value));
              const priceLabel =
                instance.price && instance.currency
                  ? `${instance.price} ${instance.currency}`
                  : null;

              return (
                <InstanceCard
                  key={instance.id}
                  isAdmin={isAdmin}
                  typeSlug={plantType.slug}
                  displayName={displayName}
                  instanceId={instance.id}
                  label={label}
                  heroUrl={heroUrl}
                  photoCount={instancePhotos.length}
                  photos={instancePhotos}
                  metaParts={metaParts}
                  acquiredAt={instance.acquired_at}
                  priceLabel={priceLabel}
                  notes={instance.notes}
                />
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
