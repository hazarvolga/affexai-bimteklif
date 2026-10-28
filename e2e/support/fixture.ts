/**
 * Shared, test-only fixture identity for the Playwright E2E suite (T43).
 * The server launcher seeds exactly these rows into a disposable PostgreSQL
 * schema; the specs log in with them. None of these values exist outside it.
 */
export const E2E_PORT = Number(process.env.E2E_PORT ?? 4317);
export const E2E_BASE_URL = `http://127.0.0.1:${E2E_PORT}`;

export const E2E_PASSWORD = 'E2e-fixture-pass-123';

export const E2E_OWNER = { email: 'e2e-owner@example.test', fullName: 'E2E Owner' } as const;
export const E2E_ADMIN = { email: 'e2e-admin@example.test', fullName: 'E2E Super Admin' } as const;
export const E2E_COMPANY_NAME = 'E2E Taahhüt A.Ş.';
export const E2E_CLIENT_NAME = 'E2E Müşteri Ltd.';

/** Repo sample model (buildingSMART, see fixtures/phase-0/open-source). */
export const E2E_IFC_SAMPLE = 'fixtures/phase-0/open-source/buildingsmart/ifc4x3-building-structural.ifc';
/** Multiple contexts make this model's geometry unsafe for quantity evidence. */
export const E2E_IFC_UNVERIFIED_GEOMETRY = 'fixtures/phase-0/open-source/buildingsmart/ifc4-wall-opening-window.ifc';
