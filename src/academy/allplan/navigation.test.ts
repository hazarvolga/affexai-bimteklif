import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { safeAcademyReturnPath } from './navigation';

describe('Academy return navigation', () => {
  it('allows only canonical quotation detail paths', () => {
    assert.equal(safeAcademyReturnPath('/app/quotes/123e4567-e89b-12d3-a456-426614174000'), '/app/quotes/123e4567-e89b-12d3-a456-426614174000');
  });

  it('rejects external, protocol-relative, and unrelated internal targets', () => {
    assert.equal(safeAcademyReturnPath('https://attacker.example'), null);
    assert.equal(safeAcademyReturnPath('//attacker.example'), null);
    assert.equal(safeAcademyReturnPath('/app/settings'), null);
  });
});
