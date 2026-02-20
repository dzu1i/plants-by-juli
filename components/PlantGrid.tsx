"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "./PlantGrid.module.css";
import CoverPicker from "@/components/CoverPicker";

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
}: {
  plants: PlantType[];
  isAdmin: boolean;
}) {
  const [query, setQuery] = useState("");
  const [genus, setGenus] = useState("all");

  const genera = useMemo(() => {
    const set = new Set(
      plants
        .map((p) => p.genus?.trim())
        .filter((value): value is string => Boolean(value))
    );
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [plants]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return plants.filter((p) => {
      const plantGenus = p.genus?.trim();
      const matchesGenus = genus === "all" || plantGenus === genus;

      if (!q) return matchesGenus;

      const hay = `${p.genus?.trim() ?? ""} ${p.cultivar?.trim() ?? ""} ${
        p.variegation?.trim() ?? ""
      } ${p.slug}`.toLowerCase();
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
                <div
                  className={styles.cardImage}
                  style={{
                    backgroundImage: `url(${cover})`,
                  }}
                />
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
