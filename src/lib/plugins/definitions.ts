import { IndustryPlugin } from "./types";

const residentialPlugin: IndustryPlugin = {
  id: "residential",
  name: "Konut İnşaatı",
  description: "Villa, apartman ve müstakil ev projeleri için kaba ve ince inşaat çözümleri.",
  quotationRules: {
    calculationModel: "material_heavy",
    defaultVatRate: 20,
    currencySupport: ["TRY", "USD", "EUR"]
  },
  aiProfile: {
    systemPrompt: "Sen Türkiye'deki konut projeleri konusunda uzman bir maliyet tahmincisisin. Girdileri hafriyat, beton, demir, kalıp, duvar örme kalemlerine ayır.",
    extractionRules: "Metrekare bazlı beton ve demir oranlarını standart Türk yönetmeliklerine göre hesapla."
  },
  defaultLineItems: [
    "Hafriyat ve Kazı İşleri",
    "C30/37 Hazır Beton",
    "Nervürlü İnşaat Demiri",
    "Kalıp ve İskele Kurulumu",
    "Tuğla Duvar Örülmesi"
  ],
  pdfTemplateId: "default_construction",
  riskRules: [
    "Döviz kurları volatilitesi",
    "Demir fiyatları endeksi",
    "Beton pompa sırası gecikmesi"
  ],
  enabled: true
};

const electricalPlugin: IndustryPlugin = {
  id: "electrical",
  name: "Elektrik Taahhüt",
  description: "Bina içi tesisat, altyapı, pano ve aydınlatma işleri.",
  quotationRules: {
    calculationModel: "balanced",
    defaultVatRate: 20,
    currencySupport: ["TRY", "USD", "EUR"]
  },
  aiProfile: {
    systemPrompt: "Sen elektrik taahhüt işleri konusunda uzman bir maliyet tahmincisisin. Kablolama, pano montajı ve şalt malzemelerine odaklan.",
    extractionRules: "Metraj ve linyat sayılarına göre kablo ihtiyacını belirle."
  },
  defaultLineItems: [
    "NHXMH Kablo Tesisatı",
    "Sigorta Kutusu ve Dağıtım Panosu",
    "Anahtar ve Priz Montajı",
    "Kablo Kanalı ve Borulama",
    "Topraklama Tesisatı"
  ],
  pdfTemplateId: "modern_minimal",
  riskRules: [
    "Bakır fiyatı artış hızı",
    "İthal şalt malzemeleri teslim süreleri",
    "Saha koordinasyon aksaklıkları"
  ],
  enabled: true
};

const mechanicalPlugin: IndustryPlugin = {
  id: "mechanical",
  name: "Mekanik & HVAC",
  description: "Isıtma, soğutma, havalandırma ve sıhhi tesisat sistemleri.",
  quotationRules: {
    calculationModel: "system_based",
    defaultVatRate: 20,
    currencySupport: ["TRY", "USD", "EUR"]
  },
  aiProfile: {
    systemPrompt: "Sen mekanik tesisat ve iklimlendirme uzmanısın. Borulama, kanal imalatı ve cihaz montaj kalemlerini çıkar.",
    extractionRules: "Cihaz kapasitelerini ve boru çaplarını tasarım standartlarına göre tahmin et."
  },
  defaultLineItems: [
    "Merkezi Klima Santrali",
    "Galvaniz Havalandırma Kanalı",
    "PVC Atık Su Borulama",
    "Isıtma Kolon Hattı",
    "Vana ve Pompa Grupları"
  ],
  pdfTemplateId: "modern_minimal",
  riskRules: [
    "Cihaz ithalat vergileri",
    "Kaynak işçiliği standartları",
    "Sızdırmazlık test süreci"
  ],
  enabled: true
};

const renovationPlugin: IndustryPlugin = {
  id: "renovation",
  name: "Tadilat & Dekorasyon",
  description: "Daire, ofis ve iş yeri yenileme, ince işçilik ve dekorasyon.",
  quotationRules: {
    calculationModel: "labor_heavy",
    defaultVatRate: 20,
    currencySupport: ["TRY", "USD", "EUR"]
  },
  aiProfile: {
    systemPrompt: "Sen iç mekan tadilat ve dekorasyon uzmanısın. Kırım, boya, seramik ve ince işlere odaklan.",
    extractionRules: "İşçilik saatlerini ve yüzey alanlarını hassas hesapla."
  },
  defaultLineItems: [
    "Zemin Seramik Kaplama",
    "Saten Alçı ve Su Bazlı Boya",
    "Asma Tavan Sistemleri",
    "Dahili Kapı ve Doğrama",
    "Tesisat Yenileme"
  ],
  pdfTemplateId: "luxury_villa",
  riskRules: [
    "Gizli kusur çıkma riski (kırım sonrası)",
    "Hassas malzeme firesi",
    "Apartman çalışma saati kısıtları"
  ],
  enabled: true
};

export const INITIAL_PLUGINS: IndustryPlugin[] = [
  residentialPlugin,
  electricalPlugin,
  mechanicalPlugin,
  renovationPlugin
];
