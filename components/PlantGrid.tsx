"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "./PlantGrid.module.css";
import CoverPicker from "@/components/CoverPicker";
import Image from "next/image";

export type PlantType = {
  id: string;
  genus: string;
  cultivar: string;
  variegation: string | null;
  slug: string;
  cover_image_url: string | null;
};

function displayName(p: PlantType) {
  const genus = p.genus.trim();
  const cultivar = p.cultivar.trim();
  const variegation = p.variegation?.trim();
  return `${genus} ${cultivar}${variegation ? ` ${variegation}` : ""}`;
}

export default function PlantGrid({
  plants,
  isAdmin,
  totalCount,
}: {
  plants: PlantType[];
  isAdmin: boolean;
  totalCount: number | null;
}) {
  const [query, setQuery] = useState("");
  const [genus, setGenus] = useState("all");
  const effectivePlants = plants;

  const genera = useMemo(() => {
    const set = new Set(
      effectivePlants
        .map((p) => p.genus?.trim())
        .filter((value): value is string => Boolean(value))
    );
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [effectivePlants]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return effectivePlants.filter((p) => {
      const plantGenus = p.genus?.trim();
      const matchesGenus = genus === "all" || plantGenus === genus;

      if (!q) return matchesGenus;

      const hay = `${p.genus?.trim() ?? ""} ${p.cultivar?.trim() ?? ""} ${
        p.variegation?.trim() ?? ""
      } ${p.slug}`.toLowerCase();
      return matchesGenus && hay.includes(q);
    });
  }, [effectivePlants, query, genus]);

  return (
    <section>
      <div className={styles.controls}>
        <input
          className={styles.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Search… (e.g. "alocasia bl", "dragon", "mint")'
        />

        <select
          className={styles.select}
          value={genus}
          onChange={(e) => setGenus(e.target.value)}
        >
          {genera.map((g) => (
            <option key={g} value={g}>
              {g === "all" ? "All" : g}
            </option>
          ))}
        </select>
        {query.trim() ? (
          <div className={styles.pageMeta}>{filtered.length} results</div>
        ) : totalCount !== null ? (
          <div className={styles.pageMeta}>{totalCount} total</div>
        ) : null}

      </div>

      <div className={styles.grid}>
        {filtered.map((p) => {
          const cover =
            p.cover_image_url || "/placeholder-plant.svg";

          return (
            <div key={p.id} className={styles.card}>
              <CoverPicker
                isAdmin={isAdmin}
                plantTypeId={p.id}
                plantSlug={p.slug}
              />
              <Link href={`/plants/${p.slug}`} className={styles.cardLink}>
                <div className={styles.cardImage}>
                  <Image
                    src={cover}
                    alt={displayName(p)}
                    fill
                    sizes="(max-width: 600px) 90vw, (max-width: 1200px) 33vw, 260px"
                    className={styles.cardImg}
                  />
                </div>
                <div className={styles.cardContent}>
                  <div className={styles.cardTitle}>{displayName(p)}</div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
