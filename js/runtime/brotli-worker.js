// Decodes one brotli file off the main thread for runtime/loader.js.
// In: the compressed ArrayBuffer. Out: { bytes } with the decoded
// ArrayBuffer (transferred) or { error } with the decoder's message.
import { BrotliDecode } from '../vendor/brotli/decode.js';

self.onmessage = function (event) {
  try {
    var decoded = BrotliDecode(new Int8Array(event.data));
    self.postMessage({ bytes: decoded.buffer }, [decoded.buffer]);
  } catch (error) {
    self.postMessage({ error: String(error) });
  }
};