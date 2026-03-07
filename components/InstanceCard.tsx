"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import AddPhotosModal from "@/components/AddPhotosModal";
import styles from "./InstanceCard.module.css";
import Image from "next/image";

type Photo = {
  id: string;
  url: string;
  caption: string | null;
  taken_at: string | null;
  created_at: string | null;
  is_featured: boolean | null;
};

type Props = {
  isAdmin: boolean;
  typeSlug: string;
  displayName: string;
  instanceId: string;
  label: string;
  heroUrl: string | null;
  photoCount: number;
  photos: Photo[];
  metaParts: string[];
  acquiredAt: string | null;
  priceLabel: string | null;
  notes: string | null;
};

export default function InstanceCard({
  isAdmin,
  typeSlug,
  displayName,
  instanceId,
  label,
  heroUrl,
  photoCount,
  photos,
  metaParts,
  acquiredAt,
  priceLabel,
  notes,
}: Props) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [items, setItems] = useState(photos);
  const [loading, setLoading] = useState(false);

  const current = items[activeIndex] ?? null;

  function openModal() {
    setActiveIndex(0);
    setLoading(true);
    setOpen(true);
  }

  const prev = useCallback(() => {
    setActiveIndex((prevIndex) =>
      prevIndex === 0 ? items.length - 1 : prevIndex - 1
    );
    setLoading(true);
  }, [items.length]);

  const next = useCallback(() => {
    setActiveIndex((prevIndex) =>
      prevIndex === items.length - 1 ? 0 : prevIndex + 1
    );
    setLoading(true);
  }, [items.length]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") {
        if (items.length > 1) {
          event.preventDefault();
          prev();
        }
      }
      if (event.key === "ArrowRight") {
        if (items.length > 1) {
          event.preventDefault();
          next();
        }
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, items.length, next, prev]);

  async function setFeatured(photoId: string) {
    if (!isAdmin) return;
    await supabase
      .from("plant_photos")
      .update({ is_featured: false })
      .eq("instance_id", instanceId);

    await supabase
      .from("plant_photos")
      .update({ is_featured: true })
      .eq("id", photoId);

    setItems((prev) => {
      const updated = prev.map((photo) => ({
        ...photo,
        is_featured: photo.id === photoId,
      }));
      return updated.sort((a, b) => {
        const aFeatured = a.is_featured ? 1 : 0;
        const bFeatured = b.is_featured ? 1 : 0;
        if (aFeatured !== bFeatured) return bFeatured - aFeatured;
        const aKey = a.taken_at ?? a.created_at ?? "";
        const bKey = b.taken_at ?? b.created_at ?? "";
        return bKey.localeCompare(aKey);
      });
    });
    setActiveIndex(0);
    window.location.reload();
  }

  function formatPhotoDate(photo: Photo) {
    const raw = photo.taken_at || photo.created_at;
    if (!raw) return "";
    try {
      return new Date(raw).toLocaleDateString("cs-CZ");
    } catch {
      return raw;
    }
  }

  function getStoragePathFromUrl(url: string, bucket: string) {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const index = url.indexOf(marker);
    if (index === -1) return null;
    return url.slice(index + marker.length);
  }

  async function deletePhoto(photoId: string, url: string) {
    if (!isAdmin) return;
    const ok = window.confirm("Delete this photo?");
    if (!ok) return;

    const bucket =
      process.env.NEXT_PUBLIC_SUPABASE_INSTANCE_BUCKET || "plant-instances";
    const path = getStoragePathFromUrl(url, bucket);

    if (path) {
      await supabase.storage.from(bucket).remove([path]);
    }

    await supabase.from("plant_photos").delete().eq("id", photoId);

    setItems((prev) => prev.filter((photo) => photo.id !== photoId));
    setActiveIndex((prev) => Math.max(0, Math.min(prev, items.length - 2)));
  }

  return (
    <>
      <div className={styles.card} onClick={openModal} role="button">
        <div
          className={styles.cardImage}
          style={{
            backgroundImage: heroUrl ? `url(${heroUrl})` : undefined,
          }}
        />
        <div className={styles.cardBody}>
          <div className={styles.cardTitle}>{label}</div>
          {isAdmin ? (
            <>
              <div className={styles.cardActions}>
                <AddPhotosModal
                  isAdmin={isAdmin}
                  instanceId={instanceId}
                  typeSlug={typeSlug}
                />
              </div>
              {metaParts.length ? (
                <div className={styles.cardMeta}>{metaParts.join(" · ")}</div>
              ) : null}
              {acquiredAt ? (
                <div className={styles.cardMeta}>Acquired {acquiredAt}</div>
              ) : null}
              {priceLabel ? (
                <div className={styles.cardMeta}>{priceLabel}</div>
              ) : null}
              {notes ? <div className={styles.cardMeta}>{notes}</div> : null}
              <div className={styles.cardMeta}>{photoCount} photos</div>
            </>
          ) : null}
        </div>
      </div>

      {open
        ? createPortal(
            <div className={styles.backdrop} onClick={() => setOpen(false)}>
              <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <div>
                    <div className={styles.modalTitle}>{displayName}</div>
                    <div className={styles.modalSubtitle}>{label}</div>
                  </div>
                  <button
                    className={styles.closeButton}
                    type="button"
                    onClick={() => setOpen(false)}
                  >
                    Close
                  </button>
                </div>

                <div className={styles.viewer}>
                  {items.length > 1 ? (
                    <button
                      className={styles.arrow}
                      type="button"
                      onClick={prev}
                    >
                      ←
                    </button>
                  ) : null}
                  <div className={styles.imageWrap}>
                    {current ? (
                      <>
                        <Image
                          src={current.url || "/placeholder-plant.svg"}
                          alt={current.caption ?? displayName}
                          width={1200}
                          height={800}
                          sizes="(max-width: 720px) 90vw, 900px"
                          className={styles.image}
                          onLoad={() => setLoading(false)}
                        />
                        {loading ? (
                          <div className={styles.loadingOverlay}>
                            <div className={styles.spinner} />
                          </div>
                        ) : null}
                        <div className={styles.dateOverlay}>
                          {formatPhotoDate(current)}
                        </div>
                        {isAdmin ? (
                          <button
                            className={styles.deleteOverlay}
                            type="button"
                            onClick={() => deletePhoto(current.id, current.url)}
                          >
                            Delete
                          </button>
                        ) : null}
                      </>
                    ) : (
                      <div className={styles.empty}>No photos yet</div>
                    )}
                  </div>
                  {items.length > 1 ? (
                    <button
                      className={styles.arrow}
                      type="button"
                      onClick={next}
                    >
                      →
                    </button>
                  ) : null}
                </div>

                {current ? (
                  <div className={styles.captionRow}>
                    <div className={styles.caption}>
                      {current.caption ?? " "}
                    </div>
                    {items.length > 1 ? (
                      <div className={styles.counter}>
                        {activeIndex + 1} / {items.length}
                      </div>
                    ) : null}
                    {isAdmin ? (
                      <div className={styles.adminActions}>
                        <button
                          className={
                            current.is_featured
                              ? styles.starActive
                              : styles.star
                          }
                          type="button"
                          onClick={() => setFeatured(current.id)}
                        >
                          ★
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
