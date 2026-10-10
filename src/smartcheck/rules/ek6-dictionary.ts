export type IfcClassName = "IfcBeam" | "IfcColumn" | "IfcSlab" | "IfcWall" | "IfcDoor" | "IfcWindow" | "IfcSpace" | "IfcCovering";

export interface Ek6Rule {
  propertySet: string;
  propertyName: string;
  dataType: "String" | "Number" | "Boolean";
  isRequired: boolean;
}

export const Ek6Dictionary: Record<IfcClassName, Ek6Rule[]> = {
  IfcBeam: [
    { propertySet: "Pset_BeamCommon", propertyName: "FireRating", dataType: "Number", isRequired: true },
    { propertySet: "Pset_BeamCommon", propertyName: "LoadBearing", dataType: "Boolean", isRequired: true },
    { propertySet: "Tr_Pset_CSB", propertyName: "PozNo", dataType: "String", isRequired: true }
  ],
  IfcColumn: [
    { propertySet: "Pset_ColumnCommon", propertyName: "FireRating", dataType: "Number", isRequired: true },
    { propertySet: "Pset_ColumnCommon", propertyName: "LoadBearing", dataType: "Boolean", isRequired: true },
    { propertySet: "Tr_Pset_CSB", propertyName: "PozNo", dataType: "String", isRequired: true }
  ],
  IfcSlab: [
    { propertySet: "Pset_SlabCommon", propertyName: "FireRating", dataType: "Number", isRequired: true },
    { propertySet: "Pset_SlabCommon", propertyName: "LoadBearing", dataType: "Boolean", isRequired: true },
    { propertySet: "Tr_Pset_CSB", propertyName: "PozNo", dataType: "String", isRequired: true }
  ],
  IfcWall: [
    { propertySet: "Pset_WallCommon", propertyName: "FireRating", dataType: "Number", isRequired: true },
    { propertySet: "Pset_WallCommon", propertyName: "LoadBearing", dataType: "Boolean", isRequired: true },
    { propertySet: "Tr_Pset_CSB", propertyName: "PozNo", dataType: "String", isRequired: true },
    { propertySet: "Pset_WallCommon", propertyName: "IsExternal", dataType: "Boolean", isRequired: true }
  ],
  IfcDoor: [
    { propertySet: "Pset_DoorCommon", propertyName: "FireRating", dataType: "Number", isRequired: true },
    { propertySet: "Pset_DoorCommon", propertyName: "IsExternal", dataType: "Boolean", isRequired: true },
    { propertySet: "Tr_Pset_CSB", propertyName: "PozNo", dataType: "String", isRequired: true }
  ],
  IfcWindow: [
    { propertySet: "Pset_WindowCommon", propertyName: "FireRating", dataType: "Number", isRequired: true },
    { propertySet: "Pset_WindowCommon", propertyName: "IsExternal", dataType: "Boolean", isRequired: true },
    { propertySet: "Tr_Pset_CSB", propertyName: "PozNo", dataType: "String", isRequired: true }
  ],
  IfcSpace: [
    { propertySet: "Pset_SpaceCommon", propertyName: "GrossPlannedArea", dataType: "Number", isRequired: true }
  ],
  IfcCovering: [
    { propertySet: "Pset_CoveringCommon", propertyName: "FireRating", dataType: "Number", isRequired: true },
    { propertySet: "Tr_Pset_CSB", propertyName: "PozNo", dataType: "String", isRequired: true }
  ]
};
