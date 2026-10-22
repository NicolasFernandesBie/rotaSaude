"use client";

import { useEffect, useState } from "react";

export function useLocalFlag(key: string) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(localStorage.getItem(key) !== "ok");
  }, [key]);

  function dismiss() {
    localStorage.setItem(key, "ok");
    setVisible(false);
  }

  return { visible, dismiss };
}
