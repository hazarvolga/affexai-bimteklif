import { useCallback, useEffect, useState } from "react";
import { parseVerificationRecords, type LineVerification, type ReviewerIdentity } from "@/ifc/expert-verification";

const RECORDS_PREFIX = "bimmetraj:expert-verification:";
const REVIEWER_KEY = "bimmetraj:expert-reviewer";
const EMPTY_REVIEWER: ReviewerIdentity = { name: "", title: "", registrationNo: "" };

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Depolama kapalı olabilir (gizli pencere); kayıtlar bu oturumda bellekte kalır.
  }
}

function readReviewer(): ReviewerIdentity {
  const raw = readStorage(REVIEWER_KEY);
  if (!raw) return EMPTY_REVIEWER;
  try {
    const parsed = JSON.parse(raw) as Partial<ReviewerIdentity>;
    return {
      name: typeof parsed.name === "string" ? parsed.name.slice(0, 120) : "",
      title: typeof parsed.title === "string" ? parsed.title.slice(0, 120) : "",
      registrationNo: typeof parsed.registrationNo === "string" ? parsed.registrationNo.slice(0, 40) : "",
    };
  } catch {
    return EMPTY_REVIEWER;
  }
}

/**
 * Uzman doğrulama kayıtları. Ön sürüm: kayıtlar yalnız uzmanın kendi tarayıcısında, veri setine
 * özgü anahtarla tutulur; kalıcı ve paylaşılan kayıt için rapor CSV olarak indirilir.
 */
export function useExpertVerification(datasetKey: string) {
  const storageKey = `${RECORDS_PREFIX}${datasetKey}`;
  const [records, setRecords] = useState<Record<string, LineVerification>>(() => parseVerificationRecords(readStorage(storageKey)));
  const [reviewer, setReviewer] = useState<ReviewerIdentity>(readReviewer);

  useEffect(() => {
    setRecords(parseVerificationRecords(readStorage(storageKey)));
  }, [storageKey]);

  useEffect(() => writeStorage(storageKey, JSON.stringify(records)), [storageKey, records]);
  useEffect(() => writeStorage(REVIEWER_KEY, JSON.stringify(reviewer)), [reviewer]);

  const saveRecord = useCallback((record: LineVerification | null, itemId: string) => {
    setRecords((current) => {
      const { [itemId]: _removed, ...rest } = current;
      return record ? { ...rest, [itemId]: record } : rest;
    });
  }, []);

  return { records, reviewer, setReviewer, saveRecord };
}
