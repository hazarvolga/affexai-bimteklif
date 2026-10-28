type DemoSourceState<Form extends { clientId: string }, Item> = {
  formData: Form;
  items: Item[];
  ifcTransferNotice: unknown;
  preBimNotice: unknown;
  excelImportNotice: unknown;
  aiResult: unknown;
  description: string;
};

/** Replace the entire example payload and discard source claims from the displaced rows. */
export function replaceWithDemo<Form extends { clientId: string }, Item>(
  state: DemoSourceState<Form, Item>,
  demoForm: Partial<Form>,
  demoItems: Item[],
) {
  return {
    formData: { ...state.formData, ...demoForm, clientId: '' },
    items: demoItems,
    ifcTransferNotice: null,
    preBimNotice: null,
    excelImportNotice: null,
    aiResult: null,
    description: '',
  };
}

export function maySaveQuote(input: { demoLoaded: boolean; clientId: string; projectName: string }): boolean {
  return !input.demoLoaded && Boolean(input.clientId && input.projectName.trim());
}
