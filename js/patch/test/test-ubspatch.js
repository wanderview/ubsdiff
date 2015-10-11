// Copyright Benjamin J. Kelly
// All rights reserved
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted providing that the following conditions 
// are met:
// 1. Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in the
//    documentation and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE AUTHOR ``AS IS'' AND ANY EXPRESS OR
// IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
// WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED.  IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY
// DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
// DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS
// OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
// HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
// STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING
// IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

'use strict';

var ubspatch = require('../ubspatch.js');

var path = require('path');
var fs = require('fs');

function fileToArrayBuffer(subdir, filename, cb) {
  var file = path.join(__dirname, 'data', subdir, filename);
  fs.stat(file, function(err, stats) {
    if (err) { return cb(err); }
    fs.open(file, 'r', function(err, fd) {
      if (err) { return cb(err); }
      var nodeBuf = new Buffer(stats.size);
      fs.read(fd, nodeBuf, 0, stats.size, 0, function(err, bytesRead) {
        if (err) { return cb(err); }
        if (bytesRead !== stats.size) { return cb(new Error('bad size')); }
        var buf = new ArrayBuffer(stats.size);
        var arr = new Uint8Array(buf);
        for (var i = 0; i < nodeBuf.length; ++i) {
          arr[i] = nodeBuf[i];
        }
        cb(null, buf);
      });
    });
  });
}

function loadFiles(subdir, cb) {
  fileToArrayBuffer(subdir, 'original', function(err, origBuf) {
    if (err) { return cb(err); }
    fileToArrayBuffer(subdir, 'patch', function(err, patchBuf) {
      if (err) { return cb(err); }
      fileToArrayBuffer(subdir, 'expected', function(err, expBuf) {
        if (err) { return cb(err); }
        cb(null, origBuf, patchBuf, expBuf);
      });
    });
  });
}

function testFiles(test, subdir) {
  loadFiles(subdir, function(err, origBuf, patchBuf, expBuf) {
    if (err) { return test.done(err); }
    try {
      var result = ubspatch(origBuf, patchBuf);
      var resultArr = new Uint8Array(result);
      var expArr = new Uint8Array(expBuf);
      test.equals(expArr.length, resultArr.length);
      for (var i = 0; i < resultArr.length; ++i) {
        test.equals(expArr[i], resultArr[i]);
      }
      test.done();
    } catch(e) {
      test.done(e);
    }
  });
}

module.exports.args = function(test) {
  test.equals('function', typeof ubspatch);
  test.throws(function() {
    ubspatch();
  });
  test.throws(function() {
    ubspatch(new ArrayBuffer(0));
  });
  test.throws(function() {
    ubspatch(new ArrayBuffer(0), new ArrayBuffer(0));
  });
  test.done();
};

module.exports.prefix = function(test) {
  testFiles(test, 'prefix');
};

module.exports.suffix = function(test) {
  testFiles(test, 'suffix');
};

module.exports.case = function(test) {
  testFiles(test, 'case');
};

module.exports.mixed = function(test) {
  testFiles(test, 'mixed');
};

module.exports.jquery = function(test) {
  testFiles(test, 'jquery');
};
