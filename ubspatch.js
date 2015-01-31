// Offsets are 64-bit little endian signed ints.  We support positive and
// negative values that can be expressed in 32-bits.  Otherwise we throw.
function offtin(dataView, offset) {
  var high = dataView.getInt32(4, true /* litteEndian */);
  // Only non-zero value we allow for high bytes are sign extension from
  // the lower 32-bits.
  if (high !== 0 && high !== -1) {
    throw new Error('offset exceeds 32-bit limit');
  }
  return dataView.getInt32(0, true /* litteEndian */);
}
