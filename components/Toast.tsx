"use client";

import { useEffect, useState } from "react";
import styles from "./Toast.module.css";

type Props = {
  message: string;
  durationMs?: number;
};

export default function Toast({ message, durationMs = 2500 }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), durationMs);
    return () => clearTimeout(timer);
  }, [durationMs]);

  if (!visible) return null;

  return <div className={styles.toast}>{message}</div>;
}
