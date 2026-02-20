"use client";

import { FormEvent, useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import styles from "./CoverPicker.module.css";
import Image from "next/image";

type Photo = {
  id: string;
  url: string;
};

type Props = {
  isAdmin: boolean;
  plantTypeId: string;
  plantSlug: string;
};

export default function CoverPicker({
  isAdmin,
  plantTypeId,
  plantSlug,
}: Props) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!isAdmin) return null;

  async function loadPhotos() {
    setMessage("");
    const { data: instances } = await supabase
      .from("plant_instances")
      .select("id")
      .eq("type_id", plantTypeId);

    const ids = (instances ?? []).map((row) => row.id);
    if (ids.length === 0) {
      setPhotos([]);
      return;
    }

    const { data: plantPhotos } = await supabase
      .from("plant_photos")
      .select("id, url")
      .in("instance_id", ids)
      .order("created_at", { ascending: false });

    setPhotos((plantPhotos ?? []) as Photo[]);
  }

  async function openModal(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    setOpen(true);
    await loadPhotos();
  }

  async function setCover(url: string | null) {
    setBusy(true);
    setMessage("");
    const { error } = await supabase
      .from("plant_types")
      .update({ cover_image_url: url })
      .eq("id", plantTypeId);

    if (error) {
      setBusy(false);
      setMessage(error.message);
      return;
    }

    setBusy(false);
    setOpen(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("pbj_toast", "Cover updated");
      window.location.assign("/");
    }
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    setBusy(true);
    setMessage("");

    const bucket =
      process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "plants";
    const fileExt = file.name.split(".").pop() || "jpg";
    const filePath = `${plantSlug}/cover.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setBusy(false);
      setMessage(uploadError.message);
      return;
    }

    const { data: publicUrl } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    await setCover(publicUrl.publicUrl);
  }

  return (
    <>
      <button className={styles.editButton} type="button" onClick={openModal}>
        ✎
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div className={styles.backdrop} onClick={() => setOpen(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <h2 className={styles.modalTitle}>Change cover</h2>
                  <button
                    className={styles.closeButton}
                    type="button"
                    onClick={() => setOpen(false)}
                  >
                    Close
                  </button>
                </div>

                <div className={styles.section}>
                  <div className={styles.sectionTitle}>From existing photos</div>
                  <div className={styles.grid}>
                    {photos.length === 0 ? (
                      <div className={styles.empty}>
                        No instance photos yet.
                      </div>
                    ) : (
                      photos.map((photo) => (
                        <button
                          key={photo.id}
                          className={styles.thumb}
                          type="button"
                          onClick={() => setCover(photo.url)}
                        >
                          <Image
                            src={photo.url}
                            alt=""
                            width={200}
                            height={150}
                          />
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <form className={styles.section} onSubmit={handleUpload}>
                  <div className={styles.sectionTitle}>Upload new cover</div>
                  <input
                    className={styles.inputFile}
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  <button
                    className={styles.saveButton}
                    type="submit"
                    disabled={!file || busy}
                  >
                    {busy ? "Uploading…" : "Upload & set"}
                  </button>
                </form>

                <div className={styles.section}>
                  <button
                    className={styles.clearButton}
                    type="button"
                    onClick={() => setCover(null)}
                    disabled={busy}
                  >
                    Use placeholder
                  </button>
                  {message ? <p className={styles.message}>{message}</p> : null}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
