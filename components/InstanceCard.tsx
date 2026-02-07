"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import AddPhotosModal from "@/components/AddPhotosModal";
import styles from "./InstanceCard.module.css";

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

  const hasPhotos = items.length > 0;
  const current = items[activeIndex] ?? null;

  function openModal() {
    setActiveIndex(0);
    setOpen(true);
  }

  function prev() {
    setActiveIndex((prevIndex) =>
      prevIndex === 0 ? items.length - 1 : prevIndex - 1
    );
  }

  function next() {
    setActiveIndex((prevIndex) =>
      prevIndex === items.length - 1 ? 0 : prevIndex + 1
    );
  }

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
                  <button
                    className={styles.arrow}
                    type="button"
                    onClick={prev}
                    disabled={!hasPhotos}
                  >
                    ←
                  </button>
                  <div className={styles.imageWrap}>
                    {current ? (
                      <img
                        src={current.url}
                        alt={current.caption ?? displayName}
                        className={styles.image}
                      />
                    ) : (
                      <div className={styles.empty}>No photos yet</div>
                    )}
                  </div>
                  <button
                    className={styles.arrow}
                    type="button"
                    onClick={next}
                    disabled={!hasPhotos}
                  >
                    →
                  </button>
                </div>

                {current ? (
                  <div className={styles.captionRow}>
                    <div className={styles.caption}>
                      {current.caption ?? " "}
                    </div>
                    {isAdmin ? (
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
