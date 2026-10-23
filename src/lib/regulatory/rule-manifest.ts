export type RegulatoryVerificationStatus =
  | "public_verified"
  | "scope_pending"
  | "expert_review_required"
  | "identity_pending"
  | "access_required";

export interface RegulatoryRuleSource {
  authority: string;
  verificationStatus: RegulatoryVerificationStatus;
  url: string;
}

export type RegulatoryRuleSourceId =
  | "YAMBIS" | "KIK4734" | "KIK4735" | "KDV" | "PAIY"
  | "TS500" | "TS708" | "TBDY2018" | "EPYS_RG33331" | "ISO19650";

export const REGULATORY_RULE_SOURCES = {
  YAMBIS: {
    authority: "ÇŞİDB",
    verificationStatus: "public_verified",
    url: "https://meslekihizmetler.csb.gov.tr/haberler/yapi-muteahhitligi-yonetmeliginde-degisiklik-resmi-gazete-de-yayimlandi-305161",
  },
  KIK4734: {
    authority: "Kamu İhale Kurumu",
    verificationStatus: "scope_pending",
    url: "https://ekap.kik.gov.tr/EKAP/Vatandas/KurulKararGoster.aspx?KararId=26178bd78b9730925abbf20cecee0c1b9668cd30333cd4f9b4e9dde116a58a53",
  },
  KIK4735: {
    authority: "Cumhurbaşkanlığı / Kamu İhale Kurumu",
    verificationStatus: "scope_pending",
    url: "https://www.mevzuat.gov.tr/",
  },
  KDV: {
    authority: "Gelir İdaresi Başkanlığı / Resmî Gazete",
    verificationStatus: "expert_review_required",
    url: "https://www.gib.gov.tr/",
  },
  PAIY: {
    authority: "Çevre, Şehircilik ve İklim Değişikliği Bakanlığı",
    verificationStatus: "scope_pending",
    url: "https://www.mevzuat.gov.tr/",
  },
  TS500: {
    authority: "Türk Standardları Enstitüsü",
    verificationStatus: "access_required",
    url: "https://intweb.tse.org.tr/standard/standard/Standard.aspx",
  },
  TS708: {
    authority: "Türk Standardları Enstitüsü",
    verificationStatus: "access_required",
    url: "https://intweb.tse.org.tr/standard/standard/Standard.aspx",
  },
  TBDY2018: {
    authority: "AFAD / Resmî Gazete",
    verificationStatus: "public_verified",
    url: "https://resmigazete.gov.tr/eskiler/2018/03/20180318M1-2.htm",
  },
  EPYS_RG33331: {
    authority: "ÇŞİDB / Resmî Gazete",
    verificationStatus: "identity_pending",
    url: "https://www.resmigazete.gov.tr/",
  },
  ISO19650: {
    authority: "ISO / TSE",
    verificationStatus: "access_required",
    url: "https://www.iso.org/standard/68078.html",
  },
} satisfies Record<RegulatoryRuleSourceId, RegulatoryRuleSource>;
