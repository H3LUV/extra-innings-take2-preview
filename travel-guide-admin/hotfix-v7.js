(() => {
  encodeData = async function encodeDataV7(data) {
    const raw = new TextEncoder().encode(JSON.stringify(data));
    return `n${bytesToB64url(raw)}`;
  };
})();
