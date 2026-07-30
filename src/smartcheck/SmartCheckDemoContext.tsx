/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useReducer, useEffect } from 'react';

export interface DemoFinding {
  id: string;
  ruleId: string;
  skillCode: 'quantity.unit_mapping' | 'allplan.reinforcement.cover' | 'allplan.wall.priority';
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
  checkRunStatus: 'idle' | 'running' | 'completed';
  values: {
    quantityUnit: string;
    reinforcementCoverMm: number;
    wallPriority: number;
  };
  findings: DemoFinding[];
}

export interface StoredSmartCheckDemoState {
  schemaVersion: 1;
  state: SmartCheckDemoState;
}

export interface DemoAcademyContent {
  id: string;
  slug: string;
  title: string;
  domain: 'proposal_quantity' | 'product';
  productCode?: 'ALLPLAN';
  skillCode: 'quantity.unit_mapping' | 'allplan.reinforcement.cover' | 'allplan.wall.priority';
  contentType: 'microlearning' | 'interactive';
  level: 'foundation';
  estimatedMinutes: number;
  softwareVersions?: string[];
  status: 'demo';
}

export interface DemoRule {
  id: string;
  title: string;
  description: string;
  expectedValue: string;
  errorCategory: string;
  skillCode: string;
  severity: 'warning' | 'error' | 'critical' | 'info';
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

// Initial default structures
export const initialFindings: DemoFinding[] = [
  {
    id: 'finding-a',
    ruleId: 'rule-unit-mismatch',
    skillCode: 'quantity.unit_mapping',
    sourceType: 'demo_dictionary',
    authorityStatus: 'unverified_demo_data',
    currentValue: 'm²',
    expectedValue: 'm³',
    status: 'open',
    severity: 'error',
    title: 'Metraj Poz Birimi Uyuşmazlığı',
    evidence: 'Demo eşleştirme verisi.\nResmî poz veya mevzuat verisi değildir.\n\nTeklif Satırı ID: #1042\nIFC Sınıfı: IfcWall\nPoz Kodu: DEMO-15.120.1001\nUyuşmazlık: Teklif satırında girilen m² ölçü birimi, BIMPLAN standardı olan m³ birimi ile uyuşmuyor.',
    ruleType: 'demo_dictionary_mapping',
    sourceName: 'Demo IFC-Poz Dictionary Mapping'
  },
  {
    id: 'finding-b',
    ruleId: 'rule-reinforcement-cover',
    skillCode: 'allplan.reinforcement.cover',
    sourceType: 'simulated_model_finding',
    authorityStatus: 'non_authoritative_demo',
    currentValue: 20,
    expectedValue: 35,
    status: 'open',
    severity: 'critical',
    title: 'Donatı Paspayı Sapması (Demo)',
    evidence: 'Bu demoda hedef değer 35 mm olarak seçilmiştir. Gerçek nominal beton örtüsü; maruziyet sınıfı, yapısal sınıf, aderans gereksinimi, uygulama toleransı, ulusal ek ve proje koşullarına göre belirlenmelidir.\n\nModel Dosyası: Blok_A_Formwork.ndw\nEleman: B15 Kolonu (Level 1)\nPaspayı: Modelde çizilen paspayı 20 mm. Hedef değer 35 mm olarak belirlenmiştir.',
    ruleType: 'demo_engineering_rule',
    scenarioLabel: 'XC3 demo scenario',
    sourceName: 'XC3 demo scenario'
  },
  {
    id: 'finding-c',
    ruleId: 'rule-wall-priority',
    skillCode: 'allplan.wall.priority',
    sourceType: 'simulated_model_finding',
    authorityStatus: 'non_authoritative_demo',
    currentValue: 300,
    expectedValue: 500,
    status: 'open',
    severity: 'warning',
    title: 'Taşıyıcı Duvar Priority Çakışması',
    evidence: 'Priority 500, ALLPLAN’ın evrensel standardı değildir. Bu değer yalnız simüle edilmiş demo ofis modelleme kuralıdır.\n\nModel Dosyası: Blok_A_Architecture.ndw\nKatman: Structural Concrete Wall (Priority: 300)\nÇakışan Katman: Facing Brickwork (Priority: 400)\nSonuç: Yalıtım ve tuğla katmanları taşıyıcı betonu kesiyor, kalıp geometrisi hatalı.',
    ruleType: 'demo_office_rule',
    sourceName: 'Demo Office Modeling Standard'
  }
];

export const demoAcademyContent: DemoAcademyContent[] = [
  {
    id: 'content-unit-mapping',
    title: 'Poz ve Birim Eşleştirme Mikro İçeriği',
    slug: 'quantity-unit-mapping',
    domain: 'proposal_quantity',
    skillCode: 'quantity.unit_mapping',
    level: 'foundation',
    estimatedMinutes: 8,
    contentType: 'microlearning',
    status: 'demo'
  },
  {
    id: 'content-reinforcement-cover',
    title: 'Donatı Paspayı Demo Simülatörü',
    slug: 'reinforcement-cover',
    productCode: 'ALLPLAN',
    domain: 'product',
    skillCode: 'allplan.reinforcement.cover',
    level: 'foundation',
    estimatedMinutes: 20,
    contentType: 'interactive',
    softwareVersions: ['2024', '2025', '2026'],
    status: 'demo'
  },
  {
    id: 'content-wall-priority',
    title: 'Duvar Birleşim Priority Demo Simülatörü',
    slug: 'wall-priority',
    productCode: 'ALLPLAN',
    domain: 'product',
    skillCode: 'allplan.wall.priority',
    level: 'foundation',
    estimatedMinutes: 15,
    contentType: 'interactive',
    softwareVersions: ['2024', '2026'],
    status: 'demo'
  },
  {
    id: 'content-bim-software-comparison',
    title: 'BIM Yazılımları Metraj Karşılaştırması & Brutal Truth',
    slug: 'bim-software-quantity-comparison',
    productCode: 'ALLPLAN',
    domain: 'proposal_quantity',
    skillCode: 'quantity.unit_mapping',
    level: 'foundation',
    estimatedMinutes: 15,
    contentType: 'microlearning',
    softwareVersions: ['Revit 2025', 'Allplan 2026', 'Archicad 28'],
    status: 'demo'
  }
];

const LOCAL_STORAGE_KEY = 'teklifpro.smartcheck.demo.v1';

export const defaultState: SmartCheckDemoState = {
  checkRunStatus: 'idle',
  values: {
    quantityUnit: 'm²',
    reinforcementCoverMm: 20,
    wallPriority: 300
  },
  findings: initialFindings
};

// Safe hydration from localStorage with validation
export function hydrateDemoState(): SmartCheckDemoState {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!stored) {
      return defaultState;
    }
    const parsed = JSON.parse(stored);

    // Schema version check
    if (parsed && parsed.schemaVersion === 1 && parsed.state) {
      const s = parsed.state;
      // Basic runtime structural checks to prevent UI crashes
      if (
        (s.checkRunStatus === 'idle' || s.checkRunStatus === 'running' || s.checkRunStatus === 'completed') &&
        s.values &&
        typeof s.values.quantityUnit === 'string' &&
        typeof s.values.reinforcementCoverMm === 'number' &&
        typeof s.values.wallPriority === 'number' &&
        Array.isArray(s.findings)
      ) {
        return s;
      }
    }
    // Schema mismatch or invalid state structure
    return defaultState;
  } catch (e) {
    // JSON parse error
    return defaultState;
  }
}

export function persistDemoState(state: SmartCheckDemoState): void {
  const payload: StoredSmartCheckDemoState = {
    schemaVersion: 1,
    state
  };
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
}

// Action definitions
export type DemoAction =
  | { type: 'START_DEMO_CHECK' }
  | { type: 'APPLY_DEMO_FIX'; payload: { field: 'quantityUnit' | 'reinforcementCoverMm' | 'wallPriority'; value: any } }
  | { type: 'RUN_RECHECK' }
  | { type: 'RESET_DEMO' }
  | { type: 'HYDRATE_DEMO'; payload: SmartCheckDemoState };

// Reducer implementation
export function demoReducer(state: SmartCheckDemoState, action: DemoAction): SmartCheckDemoState {
  let newState: SmartCheckDemoState;

  switch (action.type) {
    case 'START_DEMO_CHECK':
      newState = {
        ...state,
        checkRunStatus: 'completed',
        findings: state.findings.map(f => ({ ...f, status: 'open' }))
      };
      break;

    case 'APPLY_DEMO_FIX': {
      const { field, value } = action.payload;
      const newValues = { ...state.values, [field]: value };

      const newFindings = state.findings.map(f => {
        let isMatching = false;
        let mappedVal = value;
        if (field === 'quantityUnit' && f.id === 'finding-a') {
          isMatching = true;
        } else if (field === 'reinforcementCoverMm' && f.id === 'finding-b') {
          isMatching = true;
        } else if (field === 'wallPriority' && f.id === 'finding-c') {
          isMatching = true;
        }

        if (isMatching) {
          return {
            ...f,
            currentValue: mappedVal,
            status: f.status === 'resolved' ? 'resolved' : 'in_progress'
          } as DemoFinding;
        }
        return f;
      });

      newState = {
        ...state,
        values: newValues,
        findings: newFindings
      };
      break;
    }

    case 'RUN_RECHECK': {
      const newFindings = state.findings.map(f => {
        if (f.id === 'finding-a') {
          const isOk = state.values.quantityUnit === 'm³';
          return {
            ...f,
            currentValue: state.values.quantityUnit,
            status: isOk ? 'resolved' : 'open'
          } as DemoFinding;
        }
        if (f.id === 'finding-b') {
          const isOk = state.values.reinforcementCoverMm === 35;
          return {
            ...f,
            currentValue: f.status === 'resolved' && state.values.reinforcementCoverMm !== 35 ? state.values.reinforcementCoverMm : state.values.reinforcementCoverMm,
            status: isOk ? 'resolved' : 'open'
          } as DemoFinding;
        }
        if (f.id === 'finding-c') {
          const isOk = state.values.wallPriority === 500;
          return {
            ...f,
            currentValue: state.values.wallPriority,
            status: isOk ? 'resolved' : 'open'
          } as DemoFinding;
        }
        return f;
      });

      newState = {
        ...state,
        findings: newFindings
      };
      break;
    }

    case 'RESET_DEMO':
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      return defaultState;

    case 'HYDRATE_DEMO':
      return action.payload;

    default:
      return state;
  }

  persistDemoState(newState);
  return newState;
}

// React Context setup
const SmartCheckDemoContext = createContext<{
  state: SmartCheckDemoState;
  dispatch: React.Dispatch<DemoAction>;
} | undefined>(undefined);

export const SmartCheckDemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(demoReducer, defaultState, hydrateDemoState);

  // Synchronize state with LocalStorage modifications
  useEffect(() => {
    dispatch({ type: 'HYDRATE_DEMO', payload: hydrateDemoState() });
  }, []);

  return (
    <SmartCheckDemoContext.Provider value={{ state, dispatch }}>
      {children}
    </SmartCheckDemoContext.Provider>
  );
};

export function useSmartCheckDemo() {
  const context = useContext(SmartCheckDemoContext);
  if (!context) {
    throw new Error('useSmartCheckDemo must be used within a SmartCheckDemoProvider');
  }
  return context;
}
