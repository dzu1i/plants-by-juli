"use client";

import { FormEvent, useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import styles from "./AddPhotosModal.module.css";

type Props = {
  isAdmin: boolean;
  instanceId: string;
  typeSlug: string;
};

export default function AddPhotosModal({ isAdmin, instanceId, typeSlug }: Props) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isAdmin) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    if (files.length === 0) {
      setBusy(false);
      setMessage("Select at least one photo.");
      return;
    }

    const bucket =
      process.env.NEXT_PUBLIC_SUPABASE_INSTANCE_BUCKET || "plant-instances";
    const uploads = files.map((file, index) => {
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${typeSlug}/${instanceId}/${Date.now()}-${index}.${ext}`;
      return { file, filePath };
    });

    for (const upload of uploads) {
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(upload.filePath, upload.file, { upsert: true });

      if (uploadError) {
        setBusy(false);
        setMessage(uploadError.message);
        return;
      }

      const { data: publicUrl } = supabase.storage
        .from(bucket)
        .getPublicUrl(upload.filePath);

      const { error: photoError } = await supabase.from("plant_photos").insert({
        instance_id: instanceId,
        url: publicUrl.publicUrl,
      });

      if (photoError) {
        setBusy(false);
        setMessage(photoError.message);
        return;
      }
    }

    setBusy(false);
    setOpen(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("pbj_toast", "Photos added");
      window.location.href = `/plants/${typeSlug}`;
    }
  }

  return (
    <>
      <button
        className={styles.addButton}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        + Add Photos
      </button>

      {open && mounted
        ? createPortal(
            <div
              className={styles.backdrop}
              onClick={() => setOpen(false)}
              onMouseDown={(e) => e.preventDefault()}
            >
              <div
                className={styles.modal}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className={styles.modalHeader}>
                  <h2 className={styles.modalTitle}>Add Photos</h2>
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
                    Photos
                    <input
                      className={styles.inputFile}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) =>
                        setFiles(Array.from(e.target.files ?? []))
                      }
                      required
                    />
                  </label>
                  <button
                    className={styles.saveButton}
                    type="submit"
                    disabled={busy}
                  >
                    {busy ? "Uploading…" : "Upload photos"}
                  </button>
                </form>

                {message ? <p className={styles.message}>{message}</p> : null}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
