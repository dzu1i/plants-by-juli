"use client";

import { FormEvent, useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import styles from "./AddInstanceModal.module.css";

type Props = {
  isAdmin: boolean;
  typeId: string;
  typeSlug: string;
};

const SIZE_OPTIONS = [
  "corm",
  "baby",
  "juvenile",
  "mature",
  "cutting",
  "tc",
  "rescue",
] as const;

const SOURCE_OPTIONS = [
  "shop",
  "privateSeller",
  "exchange",
  "gift",
  "import",
] as const;

export default function AddInstanceModal({ isAdmin, typeId, typeSlug }: Props) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const [acquiredAt, setAcquiredAt] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("CZK");
  const [sizeType, setSizeType] = useState("baby");
  const [sizeNote, setSizeNote] = useState("");
  const [sellerName, setSellerName] = useState("");
  const [sourceType, setSourceType] = useState("shop");
  const [notes, setNotes] = useState("");
  const [forSwap, setForSwap] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isAdmin) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const { data: instance, error: insertError } = await supabase
      .from("plant_instances")
      .insert({
        type_id: typeId,
        acquired_at: acquiredAt || null,
        price: price ? Number(price) : null,
        currency: price ? currency : null,
        size_type: sizeType || null,
        size_note: sizeNote || null,
        seller_name: sellerName || null,
        source_type: sourceType || null,
        notes: notes || null,
        for_swap: forSwap,
      })
      .select("id")
      .single();

    if (insertError || !instance) {
      setBusy(false);
      setMessage(insertError?.message ?? "Failed to create instance.");
      return;
    }

    if (imageFile) {
      const bucket =
        process.env.NEXT_PUBLIC_SUPABASE_INSTANCE_BUCKET || "plant-instances";
      const fileExt = imageFile.name.split(".").pop() || "jpg";
      const filePath = `${typeSlug}/${instance.id}/cover.${fileExt}`;

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

      const { error: photoError } = await supabase.from("plant_photos").insert({
        instance_id: instance.id,
        url: publicUrl.publicUrl,
      });

      if (photoError) {
        setBusy(false);
        setMessage(photoError.message);
        return;
      }
    }

    setBusy(false);
    setMessage("Saved");
    setOpen(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("pbj_toast", "Instance saved");
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
        + Add Instance
      </button>

      {open && mounted
        ? createPortal(
            <div className={styles.backdrop} onClick={() => setOpen(false)}>
              <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <h2 className={styles.modalTitle}>Add Instance</h2>
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
                    Acquired at
                    <input
                      className={styles.input}
                      type="date"
                      value={acquiredAt}
                      onChange={(e) => setAcquiredAt(e.target.value)}
                    />
                  </label>

                  <div className={styles.row}>
                    <label className={styles.label}>
                      Price
                      <input
                        className={styles.input}
                        type="number"
                        min="0"
                        step="1"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="1200"
                      />
                    </label>
                    <label className={styles.label}>
                      Currency
                      <input
                        className={styles.input}
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        placeholder="CZK"
                      />
                    </label>
                  </div>

                  <div className={styles.row}>
                    <label className={styles.label}>
                      Size type
                      <select
                        className={styles.select}
                        value={sizeType}
                        onChange={(e) => setSizeType(e.target.value)}
                      >
                        {SIZE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={styles.label}>
                      Size note
                      <input
                        className={styles.input}
                        value={sizeNote}
                        onChange={(e) => setSizeNote(e.target.value)}
                        placeholder="2 leaves"
                      />
                    </label>
                  </div>

                  <div className={styles.row}>
                    <label className={styles.label}>
                      Source type
                      <select
                        className={styles.select}
                        value={sourceType}
                        onChange={(e) => setSourceType(e.target.value)}
                      >
                        {SOURCE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={styles.label}>
                      Seller
                      <input
                        className={styles.input}
                        value={sellerName}
                        onChange={(e) => setSellerName(e.target.value)}
                        placeholder="GreenHaven"
                      />
                    </label>
                  </div>

                  <label className={styles.label}>
                    Notes
                    <textarea
                      className={styles.textarea}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="mint sectoring, slight root damage"
                    />
                  </label>

                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={forSwap}
                      onChange={(e) => setForSwap(e.target.checked)}
                    />
                    For swap
                  </label>

                  <label className={styles.label}>
                    Cover image
                    <input
                      className={styles.inputFile}
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                    />
                  </label>

                  <button
                    className={styles.saveButton}
                    type="submit"
                    disabled={busy}
                  >
                    {busy ? "Saving…" : "Save instance"}
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
