/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

import { useEffect, useMemo, useState } from "react";
import type { KikWorkCategory } from "@/lib/kik-adt";
import type { CdeState, EirDeliveryMilestone, SuitabilityCode } from "@/smartcheck/rules/iso19650";
import type { MinhaRuleProfile } from "@/smartcheck/rules/minha";

/**
 * Tender, CDE and contractual minha inputs of the IFC icmal workspace, remembered per project title in this
 * browser (`bimmetraj:calm-session:v1:<title>`). Kept above the step views so switching steps keeps them.
 */
export function useCalmSessionInputs(projectTitle: string) {
  const storageKey = useMemo(() => `bimmetraj:calm-session:v1:${projectTitle}`, [projectTitle]);

  const [kikWorkCategory, setKikWorkCategory] = useState<KikWorkCategory>("ust_yapi");
  const [tenderYmInput, setTenderYmInput] = useState<string>("");
  const [tenderBidsInput, setTenderBidsInput] = useState<string>("");

  const [cdeStateInput, setCdeStateInput] = useState<CdeState | "">("");
  const [suitabilityInput, setSuitabilityInput] = useState<SuitabilityCode | "">("");
  const [revisionInput, setRevisionInput] = useState<string>("");
  const [deliveryStageInput, setDeliveryStageInput] = useState<"COORDINATION" | "TENDER_OR_PERMIT">("COORDINATION");
  const [eirMilestoneInput, setEirMilestoneInput] = useState<EirDeliveryMilestone>("IMPLEMENTATION");

  const [minhaProfile, setMinhaProfile] = useState<MinhaRuleProfile>("CSB_2026");
  const [customMinhaThresholdInput, setCustomMinhaThresholdInput] = useState<string>("");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<{
        kikWorkCategory: KikWorkCategory;
        tenderYmInput: string;
        tenderBidsInput: string;
        cdeStateInput: CdeState | "";
        suitabilityInput: SuitabilityCode | "";
        revisionInput: string;
        deliveryStageInput: "COORDINATION" | "TENDER_OR_PERMIT";
        eirMilestoneInput: EirDeliveryMilestone;
        minhaProfile: MinhaRuleProfile;
        customMinhaThresholdInput: string;
      }>;
      if (parsed.kikWorkCategory) setKikWorkCategory(parsed.kikWorkCategory);
      if (typeof parsed.tenderYmInput === "string") setTenderYmInput(parsed.tenderYmInput);
      if (typeof parsed.tenderBidsInput === "string") setTenderBidsInput(parsed.tenderBidsInput);
      if (typeof parsed.cdeStateInput === "string") setCdeStateInput(parsed.cdeStateInput);
      if (typeof parsed.suitabilityInput === "string") setSuitabilityInput(parsed.suitabilityInput);
      if (typeof parsed.revisionInput === "string") setRevisionInput(parsed.revisionInput);
      if (parsed.deliveryStageInput) setDeliveryStageInput(parsed.deliveryStageInput);
      if (parsed.eirMilestoneInput) setEirMilestoneInput(parsed.eirMilestoneInput);
      if (parsed.minhaProfile) setMinhaProfile(parsed.minhaProfile);
      if (typeof parsed.customMinhaThresholdInput === "string") {
        setCustomMinhaThresholdInput(parsed.customMinhaThresholdInput);
      }
    } catch {
      // ignore localStorage read errors
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          kikWorkCategory,
          tenderYmInput,
          tenderBidsInput,
          cdeStateInput,
          suitabilityInput,
          revisionInput,
          deliveryStageInput,
          eirMilestoneInput,
          minhaProfile,
          customMinhaThresholdInput,
        }),
      );
    } catch {
      // ignore localStorage write errors
    }
  }, [
    cdeStateInput,
    customMinhaThresholdInput,
    deliveryStageInput,
    eirMilestoneInput,
    kikWorkCategory,
    minhaProfile,
    revisionInput,
    storageKey,
    suitabilityInput,
    tenderBidsInput,
    tenderYmInput,
  ]);

  return {
    kikWorkCategory, setKikWorkCategory, tenderYmInput, setTenderYmInput, tenderBidsInput, setTenderBidsInput,
    cdeStateInput, setCdeStateInput, suitabilityInput, setSuitabilityInput, revisionInput, setRevisionInput,
    deliveryStageInput, setDeliveryStageInput, eirMilestoneInput, setEirMilestoneInput,
    minhaProfile, setMinhaProfile, customMinhaThresholdInput, setCustomMinhaThresholdInput,
  };
}
