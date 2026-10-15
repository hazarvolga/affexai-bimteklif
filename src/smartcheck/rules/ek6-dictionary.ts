export type IfcClassName = "IfcBeam" | "IfcColumn" | "IfcSlab" | "IfcWall" | "IfcDoor" | "IfcWindow" | "IfcSpace" | "IfcCovering";

export interface Ek6Rule {
  propertySet: string;
  propertyName: string;
  dataType: "String" | "Number" | "Boolean";
  /** True when required by RG 33331 EK-6 (Tablo 6.1–6.68); false for optional/5D bridge properties. */
  isRequired: boolean;
  tableRef?: string;
}

export const Ek6Dictionary: Record<IfcClassName, Ek6Rule[]> = {
  IfcBeam: [
    { propertySet: "Pset_BeamCommon", propertyName: "FireRating", dataType: "String", isRequired: true, tableRef: "EK-6 Tablo 6.3" },
    { propertySet: "TREpys_PozOzellikSeti", propertyName: "PozNo", dataType: "String", isRequired: false, tableRef: "5D Metraj Köprüsü" }
  ],
  IfcColumn: [
    { propertySet: "Pset_ColumnCommon", propertyName: "FireRating", dataType: "String", isRequired: true, tableRef: "EK-6 Tablo 6.16" },
    { propertySet: "Pset_ColumnCommon", propertyName: "LoadBearing", dataType: "Boolean", isRequired: true, tableRef: "EK-6 Tablo 6.16" },
    { propertySet: "TREpys_PozOzellikSeti", propertyName: "PozNo", dataType: "String", isRequired: false, tableRef: "5D Metraj Köprüsü" }
  ],
  IfcSlab: [
    { propertySet: "Pset_SlabCommon", propertyName: "FireRating", dataType: "String", isRequired: true, tableRef: "EK-6 Tablo 6.56" },
    { propertySet: "TREpys_PozOzellikSeti", propertyName: "PozNo", dataType: "String", isRequired: false, tableRef: "5D Metraj Köprüsü" }
  ],
  IfcWall: [
    { propertySet: "Pset_WallCommon", propertyName: "FireRating", dataType: "String", isRequired: true, tableRef: "EK-6 Tablo 6.66" },
    { propertySet: "Pset_WallCommon", propertyName: "IsExternal", dataType: "Boolean", isRequired: true, tableRef: "EK-6 Tablo 6.66" },
    { propertySet: "TREpys_PozOzellikSeti", propertyName: "PozNo", dataType: "String", isRequired: false, tableRef: "5D Metraj Köprüsü" }
  ],
  IfcDoor: [
    { propertySet: "Pset_DoorCommon", propertyName: "FireRating", dataType: "String", isRequired: true, tableRef: "EK-6 Tablo 6.25" },
    { propertySet: "Pset_DoorCommon", propertyName: "IsExternal", dataType: "Boolean", isRequired: true, tableRef: "EK-6 Tablo 6.25" },
    { propertySet: "Pset_DoorCommon", propertyName: "FireExit", dataType: "Boolean", isRequired: true, tableRef: "EK-6 Tablo 6.25" },
    { propertySet: "TREpys_PozOzellikSeti", propertyName: "PozNo", dataType: "String", isRequired: false, tableRef: "5D Metraj Köprüsü" }
  ],
  IfcWindow: [
    { propertySet: "Pset_WindowCommon", propertyName: "FireRating", dataType: "String", isRequired: true, tableRef: "EK-6 Tablo 6.68" },
    { propertySet: "Pset_WindowCommon", propertyName: "IsExternal", dataType: "Boolean", isRequired: true, tableRef: "EK-6 Tablo 6.68" },
    { propertySet: "TREpys_PozOzellikSeti", propertyName: "PozNo", dataType: "String", isRequired: false, tableRef: "5D Metraj Köprüsü" }
  ],
  IfcSpace: [
    { propertySet: "Pset_SpaceCoveringRequirements", propertyName: "FloorCovering", dataType: "String", isRequired: true, tableRef: "EK-6 Tablo 6.58" },
    { propertySet: "Pset_SpaceCoveringRequirements", propertyName: "WallCovering", dataType: "String", isRequired: true, tableRef: "EK-6 Tablo 6.58" },
    { propertySet: "Pset_SpaceCoveringRequirements", propertyName: "CeilingCovering", dataType: "String", isRequired: true, tableRef: "EK-6 Tablo 6.58" }
  ],
  IfcCovering: [
    { propertySet: "Pset_CoveringCommon", propertyName: "FireRating", dataType: "String", isRequired: false, tableRef: "EK-6 Tablo 6.20" },
    { propertySet: "TREpys_PozOzellikSeti", propertyName: "PozNo", dataType: "String", isRequired: false, tableRef: "5D Metraj Köprüsü" }
  ]
};
