"use client";

import { useEffect, useState } from "react";
import Toast from "./Toast";

export default function ToastHost() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const value = window.localStorage.getItem("pbj_toast");
    if (value) {
      setMessage(value);
      window.localStorage.removeItem("pbj_toast");
    }
  }, []);

  if (!message) return null;

  return <Toast message={message} />;
}
