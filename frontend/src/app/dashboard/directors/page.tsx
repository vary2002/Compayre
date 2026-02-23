"use client";

import { useState } from "react";
import CompareTab from "../components/CompareTab";

export default function DirectorsPage() {
  const [isCompareWide, setIsCompareWide] = useState(false);

  return (
    <div>
      <CompareTab onLayoutModeChange={setIsCompareWide} />
    </div>
  );
}
