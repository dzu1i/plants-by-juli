"use client";

import { FormEvent, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import styles from "./AddPlantModal.module.css";

type Props = {
  isAdmin: boolean;
};

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AddPlantModal({ isAdmin }: Props) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [genus, setGenus] = useState("");
  const [cultivar, setCultivar] = useState("");
  const [variegation, setVariegation] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [slugOverride, setSlugOverride] = useState("");

  if (!isAdmin) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const display = [genus, cultivar, variegation].filter(Boolean).join(" ");
    const autoSlug = slugify(display);
    const slug = slugOverride.trim() ? slugify(slugOverride) : autoSlug;

    let coverImageUrl: string | null = null;

    if (imageFile) {
      const bucket =
        process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "plant-types";
      const fileExt = imageFile.name.split(".").pop() || "jpg";
      const filePath = `${slug || crypto.randomUUID()}/cover.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, imageFile, { upsert: true });

      if (uploadError) {
        setBusy(false);
        setMessage(uploadError.message);
        return;
      }

      const { data: publicUrl } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      coverImageUrl = publicUrl.publicUrl;
    }

    const { error: insertError } = await supabase.from("plant_types").insert({
      genus,
      cultivar,
      variegation: variegation || null,
      slug,
      cover_image_url: coverImageUrl,
    });

    if (insertError) {
      setBusy(false);
      setMessage(insertError.message);
      return;
    }

    setBusy(false);
    setMessage("Saved");
    setGenus("");
    setCultivar("");
    setVariegation("");
    setSlugOverride("");
    setImageFile(null);
    setOpen(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("pbj_toast", "Plant saved");
      window.location.href = "/";
    }
  }

  const display = [genus, cultivar, variegation].filter(Boolean).join(" ");
  const slugPreview = slugify(display);
  const finalSlug = slugOverride.trim()
    ? slugify(slugOverride)
    : slugPreview;

  return (
    <>
      <button
        className={styles.addButton}
        type="button"
        onClick={() => setOpen(true)}
      >
        + Add Plant
      </button>

      {open ? (
        <div className={styles.backdrop} onClick={() => setOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Add Plant Type</h2>
              <button
                className={styles.closeButton}
                type="button"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <label className={styles.label}>
                Genus
                <input
                  className={styles.input}
                  value={genus}
                  onChange={(e) => setGenus(e.target.value)}
                  placeholder="Alocasia"
                  required
                />
              </label>

              <label className={styles.label}>
                Cultivar
                <input
                  className={styles.input}
                  value={cultivar}
                  onChange={(e) => setCultivar(e.target.value)}
                  placeholder="Dragon Scale"
                  required
                />
              </label>

              <label className={styles.label}>
                Variegation (optional)
                <input
                  className={styles.input}
                  value={variegation}
                  onChange={(e) => setVariegation(e.target.value)}
                  placeholder="Mint"
                />
              </label>

              <label className={styles.label}>
                Slug
                <input
                  className={styles.input}
                  value={slugOverride}
                  onChange={(e) => setSlugOverride(e.target.value)}
                  placeholder={slugPreview || "auto-generated"}
                />
                <span className={styles.slugHint}>
                  Final slug: {finalSlug || "—"}
                </span>
              </label>

              <label className={styles.label}>
                Cover image
                <input
                  className={styles.inputFile}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                  required
                />
              </label>

              <button className={styles.saveButton} type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save plant"}
              </button>
            </form>

            {message ? <p className={styles.message}>{message}</p> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
