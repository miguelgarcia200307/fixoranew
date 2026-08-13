const SignatureCore = require('../js/signature-core.js');

describe('SignatureCore', () => {
  it('accepts only 32-byte base64url signature tokens', () => {
    expect(SignatureCore.isValidToken('A'.repeat(43))).toBe(true);
    expect(SignatureCore.isValidToken('A'.repeat(42))).toBe(false);
    expect(SignatureCore.isValidToken(`${'A'.repeat(42)}+`)).toBe(false);
  });

  it('rejects an empty signature and a single accidental tap', () => {
    expect(SignatureCore.isMeaningful([])).toBe(false);
    expect(SignatureCore.isMeaningful([[{ x: 0.5, y: 0.5 }]])).toBe(false);
  });

  it('rejects a long but nearly straight insignificant mark', () => {
    const stroke = Array.from({ length: 10 }, (_, index) => ({ x: 0.1 + index * 0.02, y: 0.5 }));
    expect(SignatureCore.isMeaningful([stroke])).toBe(false);
  });

  it('accepts a signature with sufficient path and bounding area', () => {
    const stroke = [
      { x: 0.10, y: 0.50 }, { x: 0.16, y: 0.38 }, { x: 0.22, y: 0.58 },
      { x: 0.28, y: 0.35 }, { x: 0.34, y: 0.56 }, { x: 0.42, y: 0.40 },
      { x: 0.50, y: 0.54 }, { x: 0.58, y: 0.42 }, { x: 0.68, y: 0.48 }
    ];
    expect(SignatureCore.isMeaningful([stroke])).toBe(true);
  });

  it('ignores malformed points without producing NaN metrics', () => {
    const result = SignatureCore.metrics([[{ x: 0, y: 0 }, null, { x: 0.2, y: 0.2 }]]);
    expect(Number.isFinite(result.length)).toBe(true);
    expect(result.points).toBe(2);
  });
});
