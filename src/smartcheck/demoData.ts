/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

export interface DemoRule {
  id: string;
  title: string;
  description: string;
  expectedValue: string;
  errorCategory: string;
  skillCode: string;
  severity: 'warning' | 'error' | 'critical' | 'info';
}

export interface DemoFinding {
  id: string;
  ruleId: string;
  skillCode: string;
  sourceType: 'demo_dictionary' | 'simulated_model_finding';
  authorityStatus: 'unverified_demo_data' | 'non_authoritative_demo';
  currentValue: string | number;
  expectedValue: string | number;
  status: 'open' | 'in_progress' | 'resolved';
  severity: 'warning' | 'error' | 'critical' | 'info';
  title: string;
  evidence: string;
  ruleType: 'demo_dictionary_mapping' | 'demo_engineering_rule' | 'demo_office_rule';
  scenarioLabel?: string;
  sourceName: string;
}

export interface SmartCheckDemoState {
  checkRunStatus: 'idle' | 'completed';
  values: {
    quantityUnit: string;
    reinforcementCoverMm: number;
    wallPriority: number;
  };
  findings: DemoFinding[];
}

export interface DemoAcademyContent {
  id: string;
  title: string;
  slug: string;
  productCode: string;
  domain: string;
  skillCode: string;
  level: string;
  estimatedMinutes: number;
  contentType: string;
  softwareVersions: string[];
  status: string;
  area: 'teklif_metraj' | 'allplan' | 'openbim_comparison';
}

export const demoRules: DemoRule[] = [
  {
    id: 'rule-unit-mismatch',
    title: 'Poz ve Birim Uyumsuzluğu',
    description: 'BIM sözlüğüne göre IfcWall nesnesine ait pozların ölçü birimi m³ olmalıdır.',
    expectedValue: 'm³',
    errorCategory: 'quantity_standard',
    skillCode: 'quantity.unit_mapping',
    severity: 'error'
  },
  {
    id: 'rule-reinforcement-cover',
    title: 'Donatı Paspayı Sapması (Demo)',
    description: 'XC3 etiketli demo senaryosunda hedef demo paspayı değeri 35 mm olarak seçilmiştir.',
    expectedValue: '35 mm',
    errorCategory: 'modelling_standard',
    skillCode: 'allplan.reinforcement.cover',
    severity: 'critical'
  },
  {
    id: 'rule-wall-priority',
    title: 'Duvar Katman Priority Bağlantı Hatası',
    description: 'Yük taşıyıcı betonarme duvar katmanının Allplan priority değeri yalıtım ve tuğla katmanlarından yüksek (500) olmalıdır.',
    expectedValue: '500',
    errorCategory: 'modelling_standard',
    skillCode: 'allplan.wall.priority',
    severity: 'warning'
  }
];

export const initialFindings: DemoFinding[] = [
  {
    id: 'finding-a',
    ruleId: 'rule-unit-mismatch',
    title: 'Metraj Poz Birimi Uyuşmazlığı',
    skillCode: 'quantity.unit_mapping',
    sourceType: 'demo_dictionary',
    authorityStatus: 'unverified_demo_data',
    currentValue: 'm²',
    expectedValue: 'm³',
    status: 'open',
    severity: 'error',
    evidence: 'Demo eşleştirme verisi.\nResmî poz veya mevzuat verisi değildir.\n\nTeklif Satırı ID: #1042\nIFC Sınıfı: IfcWall\nPoz Kodu: DEMO-15.120.1001\nUyuşmazlık: Teklif satırında girilen m² ölçü birimi, BIMPLAN standardı olan m³ birimi ile uyuşmuyor.',
    ruleType: 'demo_dictionary_mapping',
    sourceName: 'Demo IFC-Poz Dictionary Mapping'
  },
  {
    id: 'finding-b',
    ruleId: 'rule-reinforcement-cover',
    title: 'Donatı Paspayı Sapması (Demo)',
    skillCode: 'allplan.reinforcement.cover',
    sourceType: 'simulated_model_finding',
    authorityStatus: 'non_authoritative_demo',
    currentValue: 20,
    expectedValue: 35,
    status: 'open',
    severity: 'critical',
    evidence: 'Bu demoda hedef değer 35 mm olarak seçilmiştir. Gerçek nominal beton örtüsü; maruziyet sınıfı, yapısal sınıf, aderans gereksinimi, uygulama toleransı, ulusal ek ve proje koşullarına göre belirlenmelidir.\n\nModel Dosyası: Blok_A_Formwork.ndw\nEleman: B15 Kolonu (Level 1)\nPaspayı: Modelde çizilen paspayı 20 mm. Hedef değer 35 mm olarak belirlenmiştir.',
    ruleType: 'demo_engineering_rule',
    scenarioLabel: 'XC3 demo scenario',
    sourceName: 'XC3 demo scenario'
  },
  {
    id: 'finding-c',
    ruleId: 'rule-wall-priority',
    title: 'Taşıyıcı Duvar Öncelik Çakışması',
    skillCode: 'allplan.wall.priority',
    sourceType: 'simulated_model_finding',
    authorityStatus: 'non_authoritative_demo',
    currentValue: 300,
    expectedValue: 500,
    status: 'open',
    severity: 'warning',
    evidence: 'Priority 500, ALLPLAN’ın evrensel standardı değildir. Bu değer yalnız simüle edilmiş demo ofis modelleme kuralıdır.\n\nModel Dosyası: Blok_A_Architecture.ndw\nKatman: Structural Concrete Wall (Priority: 300)\nÇakışan Katman: Facing Brickwork (Priority: 400)\nSonuç: Yalıtım ve tuğla katmanları taşıyıcı betonu kesiyor, kalıp geometrisi hatalı.',
    ruleType: 'demo_office_rule',
    sourceName: 'Demo Office Modeling Standard'
  }
];

export const demoAcademyContent: DemoAcademyContent[] = [
  {
    id: 'content-unit-mapping',
    title: 'Poz ve Birim Eşleştirme Mikro İçeriği',
    slug: 'quantity-and-unit-mapping',
    productCode: 'ALLPLAN',
    domain: 'proposal',
    skillCode: 'quantity.unit_mapping',
    level: 'beginner',
    estimatedMinutes: 8,
    contentType: 'microlearning',
    softwareVersions: ['2024', '2026'],
    status: 'demo',
    area: 'teklif_metraj'
  },
  {
    id: 'content-reinforcement-cover',
    title: 'Donatı Paspayı Demo Simülatörü',
    slug: 'cover-requirements',
    productCode: 'ALLPLAN',
    domain: 'product',
    skillCode: 'allplan.reinforcement.cover',
    level: 'intermediate',
    estimatedMinutes: 20,
    contentType: 'interactive',
    softwareVersions: ['2024', '2025', '2026'],
    status: 'demo',
    area: 'allplan'
  },
  {
    id: 'content-wall-priority',
    title: 'Duvar Birleşim Priority Demo Simülatörü',
    slug: 'wall-layer-priority',
    productCode: 'ALLPLAN',
    domain: 'product',
    skillCode: 'allplan.wall.priority',
    level: 'intermediate',
    estimatedMinutes: 15,
    contentType: 'interactive',
    softwareVersions: ['2024', '2026'],
    status: 'demo',
    area: 'allplan'
  },
  {
    id: 'content-bim-software-comparison',
    title: 'BIM Yazılımları Metraj Karşılaştırması & Brutal Truth',
    slug: 'bim-software-quantity-comparison',
    productCode: 'ALLPLAN',
    domain: 'proposal',
    skillCode: 'quantity.unit_mapping',
    level: 'intermediate',
    estimatedMinutes: 15,
    contentType: 'microlearning',
    softwareVersions: ['Revit 2025', 'Allplan 2026', 'Archicad 28'],
    status: 'demo',
    area: 'openbim_comparison'
  }
];

// All singleton state helper functions have been migrated to the React Context state model.
