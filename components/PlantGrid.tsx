"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "./PlantGrid.module.css";

export type PlantType = {
  id: string;
  genus: string;
  cultivar: string;
  variegation: string | null;
  slug: string;
  cover_image_url: string | null;
};

function displayName(p: PlantType) {
  return `${p.genus} ${p.cultivar}${p.variegation ? ` ${p.variegation}` : ""}`;
}

export default function PlantGrid({ plants }: { plants: PlantType[] }) {
  const [query, setQuery] = useState("");
  const [genus, setGenus] = useState("all");

  const genera = useMemo(() => {
    const set = new Set(plants.map((p) => p.genus).filter(Boolean));
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [plants]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return plants.filter((p) => {
      const matchesGenus = genus === "all" || p.genus === genus;

      if (!q) return matchesGenus;

      const hay = `${p.genus} ${p.cultivar} ${p.variegation ?? ""} ${p.slug}`.toLowerCase();
      return matchesGenus && hay.includes(q);
    });
  }, [plants, query, genus]);

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

      </div>

      <div className={styles.grid}>
        {filtered.map((p) => (
          <Link key={p.id} href={`/plants/${p.slug}`} className={styles.card}>
            <div
              className={styles.cardImage}
              style={{
                backgroundImage: p.cover_image_url
                  ? `url(${p.cover_image_url})`
                  : undefined,
              }}
            />
            <div className={styles.cardContent}>
              <div className={styles.cardTitle}>{displayName(p)}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
