import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calculateProgressPayment,
  type ProgressPaymentCalculationInput,
} from './progress-payment';

const SHA = 'a'.repeat(64);
const LOCK = {
  revision: 1,
  lockedBy: 'Kontrol teşkilatı',
  lockedAt: '2026-10-23',
  evidenceSha256: SHA,
};

function approvedDecision(reference: string) {
  return {
    status: 'approved' as const,
    reference,
    reviewer: 'Bağımsız maliyet kontrol uzmanı',
    decidedAt: '2026-10-23',
    evidenceSha256: SHA,
  };
}

function goldenInput(): ProgressPaymentCalculationInput {
  return {
    contractId: 'CTR-001',
    items: [
      { id: 'concrete', description: 'C30/37 beton', unit: 'm3', contractedQuantity: '100.0000', unitPrice: '2500.00' },
      { id: 'steel', description: 'B420C donatı', unit: 'ton', contractedQuantity: '10.0000', unitPrice: '10000.00' },
    ],
    variations: [
      {
        id: 'VO-001',
        sequence: 1,
        itemId: 'concrete',
        kind: 'addition',
        quantity: '10.0000',
        decision: approvedDecision('VO-001 / kurul kararı'),
      },
    ],
    periods: [
      {
        id: 'HP-001',
        sequence: 1,
        status: 'locked',
        lockEvidence: LOCK,
        lines: [
          { itemId: 'concrete', currentQuantity: '40.0000' },
          { itemId: 'steel', currentQuantity: '4.0000' },
        ],
        adjustments: [{ id: 'ADV-001', kind: 'advance_payment', amount: '20000.00', evidenceReference: 'Avans teminatı 001' }],
      },
      {
        id: 'HP-002',
        sequence: 2,
        status: 'locked',
        lockEvidence: { ...LOCK, revision: 2 },
        lines: [
          { itemId: 'concrete', currentQuantity: '70.0000' },
          { itemId: 'steel', currentQuantity: '6.0000' },
        ],
        adjustments: [
          { id: 'DED-001', kind: 'deduction', amount: '10000.00', evidenceReference: 'Kesinti tutanağı 001' },
          { id: 'REC-001', kind: 'advance_recovery', amount: '20000.00', evidenceReference: 'Avans mahsup tutanağı 001' },
        ],
        priceEscalationSnapshot: {
          snapshotId: 'PE-001',
          status: 'approved',
          amount: '5000.00',
          approvedBy: 'Kontrol teşkilatı',
          approvedAt: '2026-10-23',
          sourceSha256: SHA,
        },
      },
    ],
    finalAccountRequested: true,
  };
}

describe('Faz 6 T35-T37 fixed-point hakediş hesap çekirdeği', () => {
  it('golden: önceki, bu dönem ve kümülatif miktar/tutar ile final hesabı kuruş kesinliğinde üretir', () => {
    const result = calculateProgressPayment(goldenInput());

    assert.equal(result.status, 'calculated');
    if (result.status !== 'calculated') return;

    assert.deepEqual(result.periods[1].lines, [
      {
        itemId: 'concrete',
        previousQuantity: '40.0000',
        currentQuantity: '70.0000',
        cumulativeQuantity: '110.0000',
        previousAmount: '100000.00',
        currentAmount: '175000.00',
        cumulativeAmount: '275000.00',
      },
      {
        itemId: 'steel',
        previousQuantity: '4.0000',
        currentQuantity: '6.0000',
        cumulativeQuantity: '10.0000',
        previousAmount: '40000.00',
        currentAmount: '60000.00',
        cumulativeAmount: '100000.00',
      },
    ]);
    assert.equal(result.periods[0].netPayable, '160000.00');
    assert.equal(result.periods[1].netPayable, '210000.00');
    assert.deepEqual(result.finalAccount, {
      status: 'closed',
      baselineContractValue: '350000.00',
      approvedAdditions: '25000.00',
      approvedOmissions: '0.00',
      revisedContractValue: '375000.00',
      measuredWorkValue: '375000.00',
      priceEscalation: '5000.00',
      deductions: '10000.00',
      advancePaid: '20000.00',
      advanceRecovered: '20000.00',
      outstandingAdvance: '0.00',
      finalNetPayable: '370000.00',
    });
  });

  it('artış ve eksilişi onaylı kararlarla revize sözleşme değerine ayrı taşır', () => {
    const input = goldenInput();
    const result = calculateProgressPayment({
      ...input,
      items: [{ id: 'item', description: 'İmalat', unit: 'm2', contractedQuantity: '10.0000', unitPrice: '100.00' }],
      variations: [
        { id: 'add', sequence: 1, itemId: 'item', kind: 'addition', quantity: '2.0000', decision: approvedDecision('add') },
        { id: 'omit', sequence: 2, itemId: 'item', kind: 'omission', quantity: '1.5000', decision: approvedDecision('omit') },
      ],
      periods: [{ id: 'p1', sequence: 1, status: 'locked', lockEvidence: LOCK, lines: [{ itemId: 'item', currentQuantity: '10.5000' }], adjustments: [] }],
    });

    assert.equal(result.status, 'calculated');
    if (result.status !== 'calculated') return;
    assert.equal(result.finalAccount.approvedAdditions, '200.00');
    assert.equal(result.finalAccount.approvedOmissions, '150.00');
    assert.equal(result.finalAccount.revisedContractValue, '1050.00');
  });

  it('yarım kuruş miktar çarpımını bigint ile ticari olarak yukarı yuvarlar', () => {
    const result = calculateProgressPayment({
      contractId: 'ROUND',
      items: [{ id: 'i', description: 'Sınır', unit: 'm', contractedQuantity: '0.0001', unitPrice: '50.00' }],
      variations: [],
      periods: [{ id: 'p', sequence: 1, status: 'locked', lockEvidence: LOCK, lines: [{ itemId: 'i', currentQuantity: '0.0001' }], adjustments: [] }],
      finalAccountRequested: true,
    });

    assert.equal(result.status, 'calculated');
    if (result.status !== 'calculated') return;
    assert.equal(result.periods[0].grossWorkAmount, '0.01');
    assert.equal(result.finalAccount.finalNetPayable, '0.01');
  });

  it('dönem tutarını kümülatif eksi önceki hesaplayarak alt-kuruş tekrarlarında fazla ödeme üretmez', () => {
    const result = calculateProgressPayment({
      contractId: 'ROUND-CUMULATIVE',
      items: [{ id: 'i', description: 'Sınır', unit: 'm', contractedQuantity: '0.0002', unitPrice: '50.00' }],
      variations: [],
      periods: [
        { id: 'p1', sequence: 1, status: 'locked', lockEvidence: LOCK, lines: [{ itemId: 'i', currentQuantity: '0.0001' }], adjustments: [] },
        { id: 'p2', sequence: 2, status: 'locked', lockEvidence: { ...LOCK, revision: 2 }, lines: [{ itemId: 'i', currentQuantity: '0.0001' }], adjustments: [] },
      ],
      finalAccountRequested: true,
    });

    assert.equal(result.status, 'calculated');
    if (result.status !== 'calculated') return;
    assert.equal(result.periods[0].lines[0].currentAmount, '0.01');
    assert.equal(result.periods[1].lines[0].previousAmount, '0.01');
    assert.equal(result.periods[1].lines[0].currentAmount, '0.00');
    assert.equal(result.periods[1].lines[0].cumulativeAmount, '0.01');
    assert.equal(result.finalAccount.measuredWorkValue, '0.01');
  });

  it('onaysız varyasyon veya eksik uzman kanıtında fail-closed manual_review üretir', () => {
    const input = goldenInput();
    const result = calculateProgressPayment({
      ...input,
      variations: [{
        id: 'VO-DRAFT',
        sequence: 1,
        itemId: 'concrete',
        kind: 'addition',
        quantity: '10.0000',
        decision: { ...approvedDecision('taslak'), status: 'pending', evidenceSha256: '' },
      }],
    });

    assert.equal(result.status, 'manual_review');
    if (result.status === 'manual_review') assert.match(result.reasons.join(' '), /VO-DRAFT.*uzman.*onay/i);
  });

  it('price-escalation çıktısını yalnız tam onaylı değişmez snapshot olarak kabul eder', () => {
    const input = goldenInput();
    const result = calculateProgressPayment({
      ...input,
      periods: input.periods.map((period) => period.sequence === 2
        ? { ...period, priceEscalationSnapshot: { ...period.priceEscalationSnapshot!, status: 'calculated_review_required' as const } }
        : period),
    });

    assert.equal(result.status, 'manual_review');
    if (result.status === 'manual_review') assert.match(result.reasons.join(' '), /PE-001.*onaylı.*snapshot/i);
  });

  it('dönemler artan ve ardışık değilse hesaplamaz', () => {
    const input = goldenInput();
    const result = calculateProgressPayment({ ...input, periods: [input.periods[1], input.periods[0]] });

    assert.equal(result.status, 'manual_review');
    if (result.status === 'manual_review') assert.match(result.reasons.join(' '), /dönem.*sıra/i);
  });

  it('negatif miktar, kapsam aşımı ve bilinmeyen kalemi manual_review ile reddeder', () => {
    const base = goldenInput();
    const negative = calculateProgressPayment({
      ...base,
      periods: [{ ...base.periods[0], lines: [{ itemId: 'concrete', currentQuantity: '-1.0000' }] }],
    });
    assert.equal(negative.status, 'manual_review');

    const overScope = calculateProgressPayment({
      ...base,
      periods: [{ ...base.periods[0], lines: [{ itemId: 'steel', currentQuantity: '10.0001' }] }],
    });
    assert.equal(overScope.status, 'manual_review');
    if (overScope.status === 'manual_review') assert.match(overScope.reasons.join(' '), /sözleşme kapsamını/i);

    const unknown = calculateProgressPayment({
      ...base,
      periods: [{ ...base.periods[0], lines: [{ itemId: 'unknown', currentQuantity: '1.0000' }] }],
    });
    assert.equal(unknown.status, 'manual_review');
  });

  it('int64 parasal sınırını aşan çarpımda sessiz taşma yerine manual_review üretir', () => {
    const result = calculateProgressPayment({
      contractId: 'OVERFLOW',
      items: [{
        id: 'i',
        description: 'Taşma',
        unit: 'm',
        contractedQuantity: '999999999999999.9999',
        unitPrice: '999999999999999.99',
      }],
      variations: [],
      periods: [],
      finalAccountRequested: false,
    });

    assert.equal(result.status, 'manual_review');
    if (result.status === 'manual_review') assert.match(result.reasons.join(' '), /sınır|taşma/i);
  });

  it('final hesabı kilitlenmemiş dönem veya kapanmamış avans bakiyesiyle kapatmaz', () => {
    const input = goldenInput();
    const unlocked = calculateProgressPayment({
      ...input,
      periods: input.periods.map((period) => period.sequence === 2 ? { ...period, status: 'approved' as const } : period),
    });
    assert.equal(unlocked.status, 'manual_review');
    if (unlocked.status === 'manual_review') assert.match(unlocked.reasons.join(' '), /kilitli/i);

    const outstanding = calculateProgressPayment({
      ...input,
      periods: input.periods.map((period) => ({
        ...period,
        adjustments: period.adjustments.filter((adjustment) => adjustment.kind !== 'advance_recovery'),
      })),
    });
    assert.equal(outstanding.status, 'manual_review');
    if (outstanding.status === 'manual_review') assert.match(outstanding.reasons.join(' '), /avans.*mahsup/i);
  });

  it('negatif onaylı fiyat farkını korur ve kapanış istenmeyen ara hesabı açık bırakır', () => {
    const input = goldenInput();
    const result = calculateProgressPayment({
      ...input,
      finalAccountRequested: false,
      periods: input.periods.map((period) => period.sequence === 2
        ? { ...period, status: 'approved', priceEscalationSnapshot: { ...period.priceEscalationSnapshot!, amount: '-5000.00' } }
        : period),
    });

    assert.equal(result.status, 'calculated');
    if (result.status !== 'calculated') return;
    assert.equal(result.periods[1].priceEscalation, '-5000.00');
    assert.equal(result.finalAccount.status, 'open');
    assert.equal(result.finalAccount.finalNetPayable, '360000.00');
  });

  it('draft dönemi ayrı preview üretir; authoritative kümülatif, net ve final hesaba katmaz', () => {
    const result = calculateProgressPayment({
      contractId: 'DRAFT-PREVIEW',
      items: [{ id: 'i', description: 'İmalat', unit: 'm2', contractedQuantity: '10.0000', unitPrice: '100.00' }],
      variations: [],
      periods: [
        { id: 'p1', sequence: 1, status: 'approved', lines: [{ itemId: 'i', currentQuantity: '4.0000' }], adjustments: [] },
        {
          id: 'p2-draft',
          sequence: 2,
          status: 'draft',
          lines: [{ itemId: 'i', currentQuantity: '3.0000' }],
          adjustments: [{ id: 'draft-deduction', kind: 'deduction', amount: '25.00', evidenceReference: 'Taslak kesinti' }],
        },
        { id: 'p3', sequence: 3, status: 'approved', lines: [{ itemId: 'i', currentQuantity: '6.0000' }], adjustments: [] },
      ],
      finalAccountRequested: false,
    });

    assert.equal(result.status, 'calculated');
    if (result.status !== 'calculated') return;
    assert.equal(result.periods[0].authority, 'authoritative');
    assert.equal(result.periods[1].authority, 'preview');
    assert.equal(result.periods[1].lines[0].previousQuantity, '4.0000');
    assert.equal(result.periods[1].lines[0].cumulativeQuantity, '7.0000');
    assert.equal(result.periods[1].netPayable, '275.00');
    assert.equal(result.periods[2].authority, 'authoritative');
    assert.equal(result.periods[2].lines[0].previousQuantity, '4.0000');
    assert.equal(result.periods[2].lines[0].cumulativeQuantity, '10.0000');
    assert.equal(result.finalAccount.measuredWorkValue, '1000.00');
    assert.equal(result.finalAccount.deductions, '0.00');
    assert.equal(result.finalAccount.finalNetPayable, '1000.00');
  });

  it('geçersiz decimal, yinelenen kimlik, farklı varyasyon fiyatı ve eksik kanıtı ayrı ayrı fail-closed ele alır', () => {
    const base = goldenInput();
    const cases: Array<[ProgressPaymentCalculationInput, RegExp]> = [
      [{ ...base, items: [{ ...base.items[0], contractedQuantity: '1.00001' }] }, /ondalıklı/i],
      [{ ...base, items: [{ ...base.items[0], id: 'same' }, { ...base.items[1], id: 'same' }] }, /yineleniyor/i],
      [{ ...base, variations: [{ ...base.variations[0], unitPrice: '2500.01' }] }, /farklı birim fiyat/i],
      [{ ...base, periods: [{ ...base.periods[0], adjustments: [{ ...base.periods[0].adjustments[0], evidenceReference: '' }] }] }, /kanıt referansı/i],
      [{ ...base, variations: [{ ...base.variations[0], kind: 'invalid' as 'addition' }] }, /varyasyon türü/i],
      [{ ...base, variations: [{ ...base.variations[0], sequence: 2 }] }, /varyasyon.*sıra/i],
      [{ ...base, periods: [{ ...base.periods[0], status: 'invalid' as 'locked' }] }, /dönem durumu/i],
      [{ ...base, periods: [{ ...base.periods[0], adjustments: [{ ...base.periods[0].adjustments[0], kind: 'invalid' as 'deduction' }] }] }, /düzeltme türü/i],
    ];

    for (const [input, expected] of cases) {
      const result = calculateProgressPayment(input);
      assert.equal(result.status, 'manual_review');
      if (result.status === 'manual_review') assert.match(result.reasons.join(' '), expected);
    }
  });

  it('bozuk runtime payload, kanıtsız kilit ve ödeme öncesi avans mahsubunda exception sızdırmaz', () => {
    const malformed = calculateProgressPayment({ contractId: 'MALFORMED' } as ProgressPaymentCalculationInput);
    assert.equal(malformed.status, 'manual_review');

    const nonBooleanClosure = calculateProgressPayment({
      ...goldenInput(),
      finalAccountRequested: 'false' as unknown as boolean,
    });
    assert.equal(nonBooleanClosure.status, 'manual_review');
    if (nonBooleanClosure.status === 'manual_review') assert.match(nonBooleanClosure.reasons.join(' '), /boolean/i);

    const base = goldenInput();
    const noLockEvidence = calculateProgressPayment({
      ...base,
      periods: base.periods.map((period) => period.sequence === 2 ? { ...period, lockEvidence: undefined } : period),
    });
    assert.equal(noLockEvidence.status, 'manual_review');
    if (noLockEvidence.status === 'manual_review') assert.match(noLockEvidence.reasons.join(' '), /kilit.*kanıt/i);

    const earlyRecovery = calculateProgressPayment({
      ...base,
      periods: [{
        ...base.periods[0],
        adjustments: [{ id: 'REC-EARLY', kind: 'advance_recovery', amount: '1.00', evidenceReference: 'Mahsup' }],
      }],
      finalAccountRequested: false,
    });
    assert.equal(earlyRecovery.status, 'manual_review');
    if (earlyRecovery.status === 'manual_review') assert.match(earlyRecovery.reasons.join(' '), /avans.*aşıyor/i);
  });
});
