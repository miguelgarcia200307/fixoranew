/* Pure electronic-signature helpers shared by browser code and tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SignatureCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

  function isValidToken(token) {
    return TOKEN_PATTERN.test(String(token || ''));
  }

  function metrics(strokes) {
    const safeStrokes = Array.isArray(strokes) ? strokes.filter(Array.isArray) : [];
    const points = safeStrokes.flat().filter((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y));
    if (!points.length) return { length: 0, width: 0, height: 0, points: 0 };
    let length = 0;
    safeStrokes.forEach((stroke) => stroke.slice(1).forEach((point, index) => {
      const previous = stroke[index];
      if (Number.isFinite(previous?.x) && Number.isFinite(previous?.y) && Number.isFinite(point?.x) && Number.isFinite(point?.y)) {
        length += Math.hypot(point.x - previous.x, point.y - previous.y);
      }
    }));
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    return {
      length,
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
      points: points.length
    };
  }

  function isMeaningful(strokes) {
    const result = metrics(strokes);
    return result.points >= 8 && result.length >= 0.12 && result.width >= 0.05 && result.height >= 0.025;
  }

  return { TOKEN_PATTERN, isValidToken, metrics, isMeaningful };
});

