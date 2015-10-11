// The ubspatch module provides a single function that applies a diff file
// generated with the ubsdiff command line tool.  The function signature is:
//
//  function(oldBuffer, patchBuffer)
//
// Where both oldBuffer and patchBuffer are ArrayBuffer objects.  The oldBuffer
// should contain the contents of the original file.  The patchBuffer should
// contain the contents of the ubsdiff-generated diff file.
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.returnExports = factory();
  }
}(this, function() {

'use strict';

// Offsets are 64-bit little endian signed ints.  We support positive and
// negative values that can be expressed in 32-bits.  Otherwise we throw.
// This seems reasonable given that its unlikely the browser will need to
// process files greater than 2GB.
function offtin(dataView, offset) {
  var high = dataView.getInt32(offset + 4, true /* litteEndian */);
  // Only non-zero value we allow for high bytes are sign extension from
  // the lower 32-bits.
  var sign = high === -0x80000000 ? -1 : 1;
  if (high !== 0 && high !== -0x80000000) {
    throw new Error('offset exceeds 32-bit limit');
  }
  return sign * dataView.getInt32(offset, true /* litteEndian */);
}

function parseHeader(dataView) {
  var magic = 'BSDIFF40'
  for (var i = 0; i < magic.length; ++i) {
    if (dataView.getInt8(i) !== magic.charCodeAt(i)) {
      throw new Error('Corrupt patch');
    }
  }

  var result = {
    ctrllen: offtin(dataView, 8),
    difflen: offtin(dataView, 16),
    newsize: offtin(dataView, 24)
  };

  if (result.ctrllen < 0 || result.difflen < 0 || result.newsize < 0) {
    throw new Error('Corrupt patch');
  }

  return result;
}

function parseControlBlock(dataView, offset) {
  var result = new Array(3);
  result[0] = offtin(dataView, offset);
  result[1] = offtin(dataView, offset + 8);
  result[2] = offtin(dataView, offset + 16);
  return result;
}

return function (oldBuffer, patchBuffer) {
  var oldArray = new Uint8Array(oldBuffer);

  // Parse the header.  This gives us the location of the control,
  // diff, and extra sections within the patch.  Each section contains
  // the same number of blocks that must be read together.
  var headerDataView = new DataView(patchBuffer, 0, 32);
  var header = parseHeader(headerDataView);

  // We need to parse the control section, so open it as a data view.
  var controlDataView = new DataView(patchBuffer, 32, header.ctrllen);
  var ctrlpos = 0;

  // We are going to bulk copy from the diff section, so use a typed
  // array.
  var diffArray = new Uint8Array(patchBuffer, 32 + header.ctrllen,
                                 header.difflen);
  var diffpos = 0;

  // We are also going to bulk copy from the extra section
  var extraArray = new Uint8Array(patchBuffer,
                                  32 + header.ctrllen + header.difflen);
  var extrapos = 0;

  // Create the output buffer.  This will receive bulk copies, so again,
  // use a typed array.
  var newBuffer = new ArrayBuffer(header.newsize);
  var newArray = new Uint8Array(newBuffer);

  var oldpos = 0;
  var newpos = 0;

  while (newpos < header.newsize) {
    // Parse the control block.  This gives us three values:
    //  ctrl[0] - How many bytes to bulk copy from the diff section into the
    //            new buffer.  It also then gives the number of bytes from the
    //            old buffer to add byte-by-byte to this copied data.
    //  ctrl[1] - How many bytes to bulk copy from the extra section.
    //  ctrl[2] - How many bytes to skip in the old buffer in place of the
    //            data copied from the extra section.
    var ctrl = parseControlBlock(controlDataView, ctrlpos);
    ctrlpos += 24;

    if (newpos + ctrl[0] > header.newsize) {
      throw new Error('Corrupt patch');
    }

    // Bulk copy bytes from the diff section
    var diffToCopy = diffArray.subarray(diffpos, diffpos + ctrl[0]);
    newArray.set(diffToCopy, newpos);
    diffpos += ctrl[0];

    // Add bytes from the old buffer to the copied data
    for (var i = 0; i <ctrl[0]; ++i) {
      if ((oldpos + i >= 0) && (oldpos + i < oldArray.length)) {
        newArray[newpos + i] += oldArray[oldpos + i];
      }
    }

    newpos += ctrl[0];
    oldpos += ctrl[0];

    if (ctrl[1]) {
      if (newpos + ctrl[1] > header.newsize) {
        throw new Error('Corrupt patch');
      }

      // Bulk copy bytes form the extra section
      var extraToCopy = extraArray.subarray(extrapos. extrapos + ctrl[1]);
      newArray.set(extraToCopy, newpos);
      extrapos += ctrl[1];

      newpos += ctrl[1];
    }

    // Skip bytes in the old buffer
    oldpos += ctrl[2];
  }

  return newBuffer;
};

}));
