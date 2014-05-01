/*
faust2webaduio

Primarily written by Myles Borins
During the Spring 2013 offering of Music 420b with Julius Smith
A bit during the Summer of 2013 with the help of Joshua Kit Clayton
And finally a sprint during the late fall of 2013 to get everything working
A Special thanks to Yann Orlarey and Stéphane Letz

faust2webaudio is distributed under the terms the MIT or GPL2 Licenses.
Choose the license that best suits your project. The text of the MIT and GPL
licenses are at the root directory.

*/

/*global webkitAudioContext, Module, HEAPF32, HEAP32, Pointer_stringify, ALLOC_STACK, intArrayFromString, allocate*/

var faust = faust || {};

// Shim AudioConext on webkit
if (window.AudioContext === undefined) {
  window.AudioContext = window.webkitAudioContext;
}

(function () {

// The Module object: Our interface to the outside world. We import
// and export values on it, and do the work to get that through
// closure compiler if necessary. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to do an eval in order to handle the closure compiler
// case, where this code here is minified but Module was defined
// elsewhere (e.g. case 4 above). We also need to check if Module
// already exists (e.g. case 3 above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module;
if (!Module) Module = (typeof Module !== 'undefined' ? Module : null) || {};

// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = {};
for (var key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}

// The environment setup code below is customized to use Module.
// *** Environment setup code ***
var ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function';
var ENVIRONMENT_IS_WEB = typeof window === 'object';
var ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

if (ENVIRONMENT_IS_NODE) {
  // Expose functionality in the same simple way that the shells work
  // Note that we pollute the global namespace here, otherwise we break in node
  if (!Module['print']) Module['print'] = function print(x) {
    process['stdout'].write(x + '\n');
  };
  if (!Module['printErr']) Module['printErr'] = function printErr(x) {
    process['stderr'].write(x + '\n');
  };

  var nodeFS = require('fs');
  var nodePath = require('path');

  Module['read'] = function read(filename, binary) {
    filename = nodePath['normalize'](filename);
    var ret = nodeFS['readFileSync'](filename);
    // The path is absolute if the normalized version is the same as the resolved.
    if (!ret && filename != nodePath['resolve'](filename)) {
      filename = path.join(__dirname, '..', 'src', filename);
      ret = nodeFS['readFileSync'](filename);
    }
    if (ret && !binary) ret = ret.toString();
    return ret;
  };

  Module['readBinary'] = function readBinary(filename) { return Module['read'](filename, true) };

  Module['load'] = function load(f) {
    globalEval(read(f));
  };

  Module['arguments'] = process['argv'].slice(2);

  module['exports'] = Module;
}
else if (ENVIRONMENT_IS_SHELL) {
  if (!Module['print']) Module['print'] = print;
  if (typeof printErr != 'undefined') Module['printErr'] = printErr; // not present in v8 or older sm

  if (typeof read != 'undefined') {
    Module['read'] = read;
  } else {
    Module['read'] = function read() { throw 'no read() available (jsc?)' };
  }

  Module['readBinary'] = function readBinary(f) {
    return read(f, 'binary');
  };

  if (typeof scriptArgs != 'undefined') {
    Module['arguments'] = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  this['Module'] = Module;

  eval("if (typeof gc === 'function' && gc.toString().indexOf('[native code]') > 0) var gc = undefined"); // wipe out the SpiderMonkey shell 'gc' function, which can confuse closure (uses it as a minified name, and it is then initted to a non-falsey value unexpectedly)
}
else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  Module['read'] = function read(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    return xhr.responseText;
  };

  if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  if (typeof console !== 'undefined') {
    if (!Module['print']) Module['print'] = function print(x) {
      console.log(x);
    };
    if (!Module['printErr']) Module['printErr'] = function printErr(x) {
      console.log(x);
    };
  } else {
    // Probably a worker, and without console.log. We can do very little here...
    var TRY_USE_DUMP = false;
    if (!Module['print']) Module['print'] = (TRY_USE_DUMP && (typeof(dump) !== "undefined") ? (function(x) {
      dump(x);
    }) : (function(x) {
      // self.postMessage(x); // enable this if you want stdout to be sent as messages
    }));
  }

  if (ENVIRONMENT_IS_WEB) {
    window['Module'] = Module;
  } else {
    Module['load'] = importScripts;
  }
}
else {
  // Unreachable because SHELL is dependant on the others
  throw 'Unknown runtime environment. Where are we?';
}

function globalEval(x) {
  eval.call(null, x);
}
if (!Module['load'] == 'undefined' && Module['read']) {
  Module['load'] = function load(f) {
    globalEval(Module['read'](f));
  };
}
if (!Module['print']) {
  Module['print'] = function(){};
}
if (!Module['printErr']) {
  Module['printErr'] = Module['print'];
}
if (!Module['arguments']) {
  Module['arguments'] = [];
}
// *** Environment setup code ***

// Closure helpers
Module.print = Module['print'];
Module.printErr = Module['printErr'];

// Callbacks
Module['preRun'] = [];
Module['postRun'] = [];

// Merge back in the overrides
for (var key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}



// === Auto-generated preamble library stuff ===

//========================================
// Runtime code shared with compiler
//========================================

var Runtime = {
  stackSave: function () {
    return STACKTOP;
  },
  stackRestore: function (stackTop) {
    STACKTOP = stackTop;
  },
  forceAlign: function (target, quantum) {
    quantum = quantum || 4;
    if (quantum == 1) return target;
    if (isNumber(target) && isNumber(quantum)) {
      return Math.ceil(target/quantum)*quantum;
    } else if (isNumber(quantum) && isPowerOfTwo(quantum)) {
      return '(((' +target + ')+' + (quantum-1) + ')&' + -quantum + ')';
    }
    return 'Math.ceil((' + target + ')/' + quantum + ')*' + quantum;
  },
  isNumberType: function (type) {
    return type in Runtime.INT_TYPES || type in Runtime.FLOAT_TYPES;
  },
  isPointerType: function isPointerType(type) {
  return type[type.length-1] == '*';
},
  isStructType: function isStructType(type) {
  if (isPointerType(type)) return false;
  if (isArrayType(type)) return true;
  if (/<?\{ ?[^}]* ?\}>?/.test(type)) return true; // { i32, i8 } etc. - anonymous struct types
  // See comment in isStructPointerType()
  return type[0] == '%';
},
  INT_TYPES: {"i1":0,"i8":0,"i16":0,"i32":0,"i64":0},
  FLOAT_TYPES: {"float":0,"double":0},
  or64: function (x, y) {
    var l = (x | 0) | (y | 0);
    var h = (Math.round(x / 4294967296) | Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  },
  and64: function (x, y) {
    var l = (x | 0) & (y | 0);
    var h = (Math.round(x / 4294967296) & Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  },
  xor64: function (x, y) {
    var l = (x | 0) ^ (y | 0);
    var h = (Math.round(x / 4294967296) ^ Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  },
  getNativeTypeSize: function (type) {
    switch (type) {
      case 'i1': case 'i8': return 1;
      case 'i16': return 2;
      case 'i32': return 4;
      case 'i64': return 8;
      case 'float': return 4;
      case 'double': return 8;
      default: {
        if (type[type.length-1] === '*') {
          return Runtime.QUANTUM_SIZE; // A pointer
        } else if (type[0] === 'i') {
          var bits = parseInt(type.substr(1));
          assert(bits % 8 === 0);
          return bits/8;
        } else {
          return 0;
        }
      }
    }
  },
  getNativeFieldSize: function (type) {
    return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
  },
  dedup: function dedup(items, ident) {
  var seen = {};
  if (ident) {
    return items.filter(function(item) {
      if (seen[item[ident]]) return false;
      seen[item[ident]] = true;
      return true;
    });
  } else {
    return items.filter(function(item) {
      if (seen[item]) return false;
      seen[item] = true;
      return true;
    });
  }
},
  set: function set() {
  var args = typeof arguments[0] === 'object' ? arguments[0] : arguments;
  var ret = {};
  for (var i = 0; i < args.length; i++) {
    ret[args[i]] = 0;
  }
  return ret;
},
  STACK_ALIGN: 8,
  getAlignSize: function (type, size, vararg) {
    // we align i64s and doubles on 64-bit boundaries, unlike x86
    if (!vararg && (type == 'i64' || type == 'double')) return 8;
    if (!type) return Math.min(size, 8); // align structures internally to 64 bits
    return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE);
  },
  calculateStructAlignment: function calculateStructAlignment(type) {
    type.flatSize = 0;
    type.alignSize = 0;
    var diffs = [];
    var prev = -1;
    var index = 0;
    type.flatIndexes = type.fields.map(function(field) {
      index++;
      var size, alignSize;
      if (Runtime.isNumberType(field) || Runtime.isPointerType(field)) {
        size = Runtime.getNativeTypeSize(field); // pack char; char; in structs, also char[X]s.
        alignSize = Runtime.getAlignSize(field, size);
      } else if (Runtime.isStructType(field)) {
        if (field[1] === '0') {
          // this is [0 x something]. When inside another structure like here, it must be at the end,
          // and it adds no size
          // XXX this happens in java-nbody for example... assert(index === type.fields.length, 'zero-length in the middle!');
          size = 0;
          if (Types.types[field]) {
            alignSize = Runtime.getAlignSize(null, Types.types[field].alignSize);
          } else {
            alignSize = type.alignSize || QUANTUM_SIZE;
          }
        } else {
          size = Types.types[field].flatSize;
          alignSize = Runtime.getAlignSize(null, Types.types[field].alignSize);
        }
      } else if (field[0] == 'b') {
        // bN, large number field, like a [N x i8]
        size = field.substr(1)|0;
        alignSize = 1;
      } else if (field[0] === '<') {
        // vector type
        size = alignSize = Types.types[field].flatSize; // fully aligned
      } else if (field[0] === 'i') {
        // illegal integer field, that could not be legalized because it is an internal structure field
        // it is ok to have such fields, if we just use them as markers of field size and nothing more complex
        size = alignSize = parseInt(field.substr(1))/8;
        assert(size % 1 === 0, 'cannot handle non-byte-size field ' + field);
      } else {
        assert(false, 'invalid type for calculateStructAlignment');
      }
      if (type.packed) alignSize = 1;
      type.alignSize = Math.max(type.alignSize, alignSize);
      var curr = Runtime.alignMemory(type.flatSize, alignSize); // if necessary, place this on aligned memory
      type.flatSize = curr + size;
      if (prev >= 0) {
        diffs.push(curr-prev);
      }
      prev = curr;
      return curr;
    });
    if (type.name_ && type.name_[0] === '[') {
      // arrays have 2 elements, so we get the proper difference. then we scale here. that way we avoid
      // allocating a potentially huge array for [999999 x i8] etc.
      type.flatSize = parseInt(type.name_.substr(1))*type.flatSize/2;
    }
    type.flatSize = Runtime.alignMemory(type.flatSize, type.alignSize);
    if (diffs.length == 0) {
      type.flatFactor = type.flatSize;
    } else if (Runtime.dedup(diffs).length == 1) {
      type.flatFactor = diffs[0];
    }
    type.needsFlattening = (type.flatFactor != 1);
    return type.flatIndexes;
  },
  generateStructInfo: function (struct, typeName, offset) {
    var type, alignment;
    if (typeName) {
      offset = offset || 0;
      type = (typeof Types === 'undefined' ? Runtime.typeInfo : Types.types)[typeName];
      if (!type) return null;
      if (type.fields.length != struct.length) {
        printErr('Number of named fields must match the type for ' + typeName + ': possibly duplicate struct names. Cannot return structInfo');
        return null;
      }
      alignment = type.flatIndexes;
    } else {
      var type = { fields: struct.map(function(item) { return item[0] }) };
      alignment = Runtime.calculateStructAlignment(type);
    }
    var ret = {
      __size__: type.flatSize
    };
    if (typeName) {
      struct.forEach(function(item, i) {
        if (typeof item === 'string') {
          ret[item] = alignment[i] + offset;
        } else {
          // embedded struct
          var key;
          for (var k in item) key = k;
          ret[key] = Runtime.generateStructInfo(item[key], type.fields[i], alignment[i]);
        }
      });
    } else {
      struct.forEach(function(item, i) {
        ret[item[1]] = alignment[i];
      });
    }
    return ret;
  },
  dynCall: function (sig, ptr, args) {
    if (args && args.length) {
      if (!args.splice) args = Array.prototype.slice.call(args);
      args.splice(0, 0, ptr);
      return Module['dynCall_' + sig].apply(null, args);
    } else {
      return Module['dynCall_' + sig].call(null, ptr);
    }
  },
  functionPointers: [],
  addFunction: function (func) {
    for (var i = 0; i < Runtime.functionPointers.length; i++) {
      if (!Runtime.functionPointers[i]) {
        Runtime.functionPointers[i] = func;
        return 2*(1 + i);
      }
    }
    throw 'Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.';
  },
  removeFunction: function (index) {
    Runtime.functionPointers[(index-2)/2] = null;
  },
  getAsmConst: function (code, numArgs) {
    // code is a constant string on the heap, so we can cache these
    if (!Runtime.asmConstCache) Runtime.asmConstCache = {};
    var func = Runtime.asmConstCache[code];
    if (func) return func;
    var args = [];
    for (var i = 0; i < numArgs; i++) {
      args.push(String.fromCharCode(36) + i); // $0, $1 etc
    }
    var source = Pointer_stringify(code);
    if (source[0] === '"') {
      // tolerate EM_ASM("..code..") even though EM_ASM(..code..) is correct
      if (source.indexOf('"', 1) === source.length-1) {
        source = source.substr(1, source.length-2);
      } else {
        // something invalid happened, e.g. EM_ASM("..code($0)..", input)
        abort('invalid EM_ASM input |' + source + '|. Please use EM_ASM(..code..) (no quotes) or EM_ASM({ ..code($0).. }, input) (to input values)');
      }
    }
    try {
      var evalled = eval('(function(' + args.join(',') + '){ ' + source + ' })'); // new Function does not allow upvars in node
    } catch(e) {
      Module.printErr('error in executing inline EM_ASM code: ' + e + ' on: \n\n' + source + '\n\nwith args |' + args + '| (make sure to use the right one out of EM_ASM, EM_ASM_ARGS, etc.)');
      throw e;
    }
    return Runtime.asmConstCache[code] = evalled;
  },
  warnOnce: function (text) {
    if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
    if (!Runtime.warnOnce.shown[text]) {
      Runtime.warnOnce.shown[text] = 1;
      Module.printErr(text);
    }
  },
  funcWrappers: {},
  getFuncWrapper: function (func, sig) {
    assert(sig);
    if (!Runtime.funcWrappers[func]) {
      Runtime.funcWrappers[func] = function dynCall_wrapper() {
        return Runtime.dynCall(sig, func, arguments);
      };
    }
    return Runtime.funcWrappers[func];
  },
  UTF8Processor: function () {
    var buffer = [];
    var needed = 0;
    this.processCChar = function (code) {
      code = code & 0xFF;

      if (buffer.length == 0) {
        if ((code & 0x80) == 0x00) {        // 0xxxxxxx
          return String.fromCharCode(code);
        }
        buffer.push(code);
        if ((code & 0xE0) == 0xC0) {        // 110xxxxx
          needed = 1;
        } else if ((code & 0xF0) == 0xE0) { // 1110xxxx
          needed = 2;
        } else {                            // 11110xxx
          needed = 3;
        }
        return '';
      }

      if (needed) {
        buffer.push(code);
        needed--;
        if (needed > 0) return '';
      }

      var c1 = buffer[0];
      var c2 = buffer[1];
      var c3 = buffer[2];
      var c4 = buffer[3];
      var ret;
      if (buffer.length == 2) {
        ret = String.fromCharCode(((c1 & 0x1F) << 6)  | (c2 & 0x3F));
      } else if (buffer.length == 3) {
        ret = String.fromCharCode(((c1 & 0x0F) << 12) | ((c2 & 0x3F) << 6)  | (c3 & 0x3F));
      } else {
        // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
        var codePoint = ((c1 & 0x07) << 18) | ((c2 & 0x3F) << 12) |
                        ((c3 & 0x3F) << 6)  | (c4 & 0x3F);
        ret = String.fromCharCode(
          Math.floor((codePoint - 0x10000) / 0x400) + 0xD800,
          (codePoint - 0x10000) % 0x400 + 0xDC00);
      }
      buffer.length = 0;
      return ret;
    }
    this.processJSString = function processJSString(string) {
      /* TODO: use TextEncoder when present,
        var encoder = new TextEncoder();
        encoder['encoding'] = "utf-8";
        var utf8Array = encoder['encode'](aMsg.data);
      */
      string = unescape(encodeURIComponent(string));
      var ret = [];
      for (var i = 0; i < string.length; i++) {
        ret.push(string.charCodeAt(i));
      }
      return ret;
    }
  },
  getCompilerSetting: function (name) {
    throw 'You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work';
  },
  stackAlloc: function (size) { var ret = STACKTOP;STACKTOP = (STACKTOP + size)|0;STACKTOP = (((STACKTOP)+7)&-8); return ret; },
  staticAlloc: function (size) { var ret = STATICTOP;STATICTOP = (STATICTOP + size)|0;STATICTOP = (((STATICTOP)+7)&-8); return ret; },
  dynamicAlloc: function (size) { var ret = DYNAMICTOP;DYNAMICTOP = (DYNAMICTOP + size)|0;DYNAMICTOP = (((DYNAMICTOP)+7)&-8); if (DYNAMICTOP >= TOTAL_MEMORY) enlargeMemory();; return ret; },
  alignMemory: function (size,quantum) { var ret = size = Math.ceil((size)/(quantum ? quantum : 8))*(quantum ? quantum : 8); return ret; },
  makeBigInt: function (low,high,unsigned) { var ret = (unsigned ? ((+((low>>>0)))+((+((high>>>0)))*(+4294967296))) : ((+((low>>>0)))+((+((high|0)))*(+4294967296)))); return ret; },
  GLOBAL_BASE: 8,
  QUANTUM_SIZE: 4,
  __dummy__: 0
}


Module['Runtime'] = Runtime;









//========================================
// Runtime essentials
//========================================

var __THREW__ = 0; // Used in checking for thrown exceptions.

var ABORT = false; // whether we are quitting the application. no code should run after this. set in exit() and abort()
var EXITSTATUS = 0;

var undef = 0;
// tempInt is used for 32-bit signed values or smaller. tempBigInt is used
// for 32-bit unsigned values or more than 32 bits. TODO: audit all uses of tempInt
var tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD, tempDouble, tempFloat;
var tempI64, tempI64b;
var tempRet0, tempRet1, tempRet2, tempRet3, tempRet4, tempRet5, tempRet6, tempRet7, tempRet8, tempRet9;

function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}

var globalScope = this;

// C calling interface. A convenient way to call C functions (in C files, or
// defined with extern "C").
//
// Note: LLVM optimizations can inline and remove functions, after which you will not be
//       able to call them. Closure can also do so. To avoid that, add your function to
//       the exports using something like
//
//         -s EXPORTED_FUNCTIONS='["_main", "_myfunc"]'
//
// @param ident      The name of the C function (note that C++ functions will be name-mangled - use extern "C")
// @param returnType The return type of the function, one of the JS types 'number', 'string' or 'array' (use 'number' for any C pointer, and
//                   'array' for JavaScript arrays and typed arrays; note that arrays are 8-bit).
// @param argTypes   An array of the types of arguments for the function (if there are no arguments, this can be ommitted). Types are as in returnType,
//                   except that 'array' is not possible (there is no way for us to know the length of the array)
// @param args       An array of the arguments to the function, as native JS values (as in returnType)
//                   Note that string arguments will be stored on the stack (the JS string will become a C string on the stack).
// @return           The return value, as a native JS value (as in returnType)
function ccall(ident, returnType, argTypes, args) {
  return ccallFunc(getCFunc(ident), returnType, argTypes, args);
}
Module["ccall"] = ccall;

// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  try {
    var func = Module['_' + ident]; // closure exported function
    if (!func) func = eval('_' + ident); // explicit lookup
  } catch(e) {
  }
  assert(func, 'Cannot call unknown function ' + ident + ' (perhaps LLVM optimizations or closure removed it?)');
  return func;
}

// Internal function that does a C call using a function, not an identifier
function ccallFunc(func, returnType, argTypes, args) {
  var stack = 0;
  function toC(value, type) {
    if (type == 'string') {
      if (value === null || value === undefined || value === 0) return 0; // null string
      value = intArrayFromString(value);
      type = 'array';
    }
    if (type == 'array') {
      if (!stack) stack = Runtime.stackSave();
      var ret = Runtime.stackAlloc(value.length);
      writeArrayToMemory(value, ret);
      return ret;
    }
    return value;
  }
  function fromC(value, type) {
    if (type == 'string') {
      return Pointer_stringify(value);
    }
    assert(type != 'array');
    return value;
  }
  var i = 0;
  var cArgs = args ? args.map(function(arg) {
    return toC(arg, argTypes[i++]);
  }) : [];
  var ret = fromC(func.apply(null, cArgs), returnType);
  if (stack) Runtime.stackRestore(stack);
  return ret;
}

// Returns a native JS wrapper for a C function. This is similar to ccall, but
// returns a function you can call repeatedly in a normal way. For example:
//
//   var my_function = cwrap('my_c_function', 'number', ['number', 'number']);
//   alert(my_function(5, 22));
//   alert(my_function(99, 12));
//
function cwrap(ident, returnType, argTypes) {
  var func = getCFunc(ident);
  return function() {
    return ccallFunc(func, returnType, argTypes, Array.prototype.slice.call(arguments));
  }
}
Module["cwrap"] = cwrap;

// Sets a value in memory in a dynamic way at run-time. Uses the
// type data. This is the same as makeSetValue, except that
// makeSetValue is done at compile-time and generates the needed
// code then, whereas this function picks the right code at
// run-time.
// Note that setValue and getValue only do *aligned* writes and reads!
// Note that ccall uses JS types as for defining types, while setValue and
// getValue need LLVM types ('i8', 'i32') - this is a lower-level operation
function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[(ptr)]=value; break;
      case 'i8': HEAP8[(ptr)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math_abs(tempDouble))) >= (+1) ? (tempDouble > (+0) ? ((Math_min((+(Math_floor((tempDouble)/(+4294967296)))), (+4294967295)))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/(+4294967296))))))>>>0) : 0)],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': HEAPF64[((ptr)>>3)]=value; break;
      default: abort('invalid type for setValue: ' + type);
    }
}
Module['setValue'] = setValue;

// Parallel to setValue.
function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[(ptr)];
      case 'i8': return HEAP8[(ptr)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      default: abort('invalid type for setValue: ' + type);
    }
  return null;
}
Module['getValue'] = getValue;

var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_STATIC = 2; // Cannot be freed
var ALLOC_DYNAMIC = 3; // Cannot be freed except through sbrk
var ALLOC_NONE = 4; // Do not allocate
Module['ALLOC_NORMAL'] = ALLOC_NORMAL;
Module['ALLOC_STACK'] = ALLOC_STACK;
Module['ALLOC_STATIC'] = ALLOC_STATIC;
Module['ALLOC_DYNAMIC'] = ALLOC_DYNAMIC;
Module['ALLOC_NONE'] = ALLOC_NONE;

// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }

  var singleType = typeof types === 'string' ? types : null;

  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [_malloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
  }

  if (zeroinit) {
    var ptr = ret, stop;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)|0)]=0;
    }
    return ret;
  }

  if (singleType === 'i8') {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(slab, ret);
    } else {
      HEAPU8.set(new Uint8Array(slab), ret);
    }
    return ret;
  }

  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];

    if (typeof curr === 'function') {
      curr = Runtime.getFunctionIndex(curr);
    }

    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }

    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later

    setValue(ret+i, curr, type);

    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = Runtime.getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }

  return ret;
}
Module['allocate'] = allocate;

function Pointer_stringify(ptr, /* optional */ length) {
  // TODO: use TextDecoder
  // Find the length, and check for UTF while doing so
  var hasUtf = false;
  var t;
  var i = 0;
  while (1) {
    t = HEAPU8[(((ptr)+(i))|0)];
    if (t >= 128) hasUtf = true;
    else if (t == 0 && !length) break;
    i++;
    if (length && i == length) break;
  }
  if (!length) length = i;

  var ret = '';

  if (!hasUtf) {
    var MAX_CHUNK = 1024; // split up into chunks, because .apply on a huge string can overflow the stack
    var curr;
    while (length > 0) {
      curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
      ret = ret ? ret + curr : curr;
      ptr += MAX_CHUNK;
      length -= MAX_CHUNK;
    }
    return ret;
  }

  var utf8 = new Runtime.UTF8Processor();
  for (i = 0; i < length; i++) {
    t = HEAPU8[(((ptr)+(i))|0)];
    ret += utf8.processCChar(t);
  }
  return ret;
}
Module['Pointer_stringify'] = Pointer_stringify;

// Given a pointer 'ptr' to a null-terminated UTF16LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.
function UTF16ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
    if (codeUnit == 0)
      return str;
    ++i;
    // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
    str += String.fromCharCode(codeUnit);
  }
}
Module['UTF16ToString'] = UTF16ToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF16LE form. The copy will require at most (str.length*2+1)*2 bytes of space in the HEAP.
function stringToUTF16(str, outPtr) {
  for(var i = 0; i < str.length; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    HEAP16[(((outPtr)+(i*2))>>1)]=codeUnit;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP16[(((outPtr)+(str.length*2))>>1)]=0;
}
Module['stringToUTF16'] = stringToUTF16;

// Given a pointer 'ptr' to a null-terminated UTF32LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.
function UTF32ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
    if (utf32 == 0)
      return str;
    ++i;
    // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
    if (utf32 >= 0x10000) {
      var ch = utf32 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
}
Module['UTF32ToString'] = UTF32ToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF32LE form. The copy will require at most (str.length+1)*4 bytes of space in the HEAP,
// but can use less, since str.length does not return the number of characters in the string, but the number of UTF-16 code units in the string.
function stringToUTF32(str, outPtr) {
  var iChar = 0;
  for(var iCodeUnit = 0; iCodeUnit < str.length; ++iCodeUnit) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    var codeUnit = str.charCodeAt(iCodeUnit); // possibly a lead surrogate
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
      var trailSurrogate = str.charCodeAt(++iCodeUnit);
      codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
    }
    HEAP32[(((outPtr)+(iChar*4))>>2)]=codeUnit;
    ++iChar;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP32[(((outPtr)+(iChar*4))>>2)]=0;
}
Module['stringToUTF32'] = stringToUTF32;

function demangle(func) {
  var i = 3;
  // params, etc.
  var basicTypes = {
    'v': 'void',
    'b': 'bool',
    'c': 'char',
    's': 'short',
    'i': 'int',
    'l': 'long',
    'f': 'float',
    'd': 'double',
    'w': 'wchar_t',
    'a': 'signed char',
    'h': 'unsigned char',
    't': 'unsigned short',
    'j': 'unsigned int',
    'm': 'unsigned long',
    'x': 'long long',
    'y': 'unsigned long long',
    'z': '...'
  };
  var subs = [];
  var first = true;
  function dump(x) {
    //return;
    if (x) Module.print(x);
    Module.print(func);
    var pre = '';
    for (var a = 0; a < i; a++) pre += ' ';
    Module.print (pre + '^');
  }
  function parseNested() {
    i++;
    if (func[i] === 'K') i++; // ignore const
    var parts = [];
    while (func[i] !== 'E') {
      if (func[i] === 'S') { // substitution
        i++;
        var next = func.indexOf('_', i);
        var num = func.substring(i, next) || 0;
        parts.push(subs[num] || '?');
        i = next+1;
        continue;
      }
      if (func[i] === 'C') { // constructor
        parts.push(parts[parts.length-1]);
        i += 2;
        continue;
      }
      var size = parseInt(func.substr(i));
      var pre = size.toString().length;
      if (!size || !pre) { i--; break; } // counter i++ below us
      var curr = func.substr(i + pre, size);
      parts.push(curr);
      subs.push(curr);
      i += pre + size;
    }
    i++; // skip E
    return parts;
  }
  function parse(rawList, limit, allowVoid) { // main parser
    limit = limit || Infinity;
    var ret = '', list = [];
    function flushList() {
      return '(' + list.join(', ') + ')';
    }
    var name;
    if (func[i] === 'N') {
      // namespaced N-E
      name = parseNested().join('::');
      limit--;
      if (limit === 0) return rawList ? [name] : name;
    } else {
      // not namespaced
      if (func[i] === 'K' || (first && func[i] === 'L')) i++; // ignore const and first 'L'
      var size = parseInt(func.substr(i));
      if (size) {
        var pre = size.toString().length;
        name = func.substr(i + pre, size);
        i += pre + size;
      }
    }
    first = false;
    if (func[i] === 'I') {
      i++;
      var iList = parse(true);
      var iRet = parse(true, 1, true);
      ret += iRet[0] + ' ' + name + '<' + iList.join(', ') + '>';
    } else {
      ret = name;
    }
    paramLoop: while (i < func.length && limit-- > 0) {
      //dump('paramLoop');
      var c = func[i++];
      if (c in basicTypes) {
        list.push(basicTypes[c]);
      } else {
        switch (c) {
          case 'P': list.push(parse(true, 1, true)[0] + '*'); break; // pointer
          case 'R': list.push(parse(true, 1, true)[0] + '&'); break; // reference
          case 'L': { // literal
            i++; // skip basic type
            var end = func.indexOf('E', i);
            var size = end - i;
            list.push(func.substr(i, size));
            i += size + 2; // size + 'EE'
            break;
          }
          case 'A': { // array
            var size = parseInt(func.substr(i));
            i += size.toString().length;
            if (func[i] !== '_') throw '?';
            i++; // skip _
            list.push(parse(true, 1, true)[0] + ' [' + size + ']');
            break;
          }
          case 'E': break paramLoop;
          default: ret += '?' + c; break paramLoop;
        }
      }
    }
    if (!allowVoid && list.length === 1 && list[0] === 'void') list = []; // avoid (void)
    if (rawList) {
      if (ret) {
        list.push(ret + '?');
      }
      return list;
    } else {
      return ret + flushList();
    }
  }
  try {
    // Special-case the entry point, since its name differs from other name mangling.
    if (func == 'Object._main' || func == '_main') {
      return 'main()';
    }
    if (typeof func === 'number') func = Pointer_stringify(func);
    if (func[0] !== '_') return func;
    if (func[1] !== '_') return func; // C function
    if (func[2] !== 'Z') return func;
    switch (func[3]) {
      case 'n': return 'operator new()';
      case 'd': return 'operator delete()';
    }
    return parse();
  } catch(e) {
    return func;
  }
}

function demangleAll(text) {
  return text.replace(/__Z[\w\d_]+/g, function(x) { var y = demangle(x); return x === y ? x : (x + ' [' + y + ']') });
}

function stackTrace() {
  var stack = new Error().stack;
  return stack ? demangleAll(stack) : '(no stack trace available)'; // Stack trace is not available at least on IE10 and Safari 6.
}

// Memory management

var PAGE_SIZE = 4096;
function alignMemoryPage(x) {
  return (x+4095)&-4096;
}

var HEAP;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

var STATIC_BASE = 0, STATICTOP = 0, staticSealed = false; // static area
var STACK_BASE = 0, STACKTOP = 0, STACK_MAX = 0; // stack area
var DYNAMIC_BASE = 0, DYNAMICTOP = 0; // dynamic area handled by sbrk

function enlargeMemory() {
  abort('Cannot enlarge memory arrays. Either (1) compile with -s TOTAL_MEMORY=X with X higher than the current value ' + TOTAL_MEMORY + ', (2) compile with ALLOW_MEMORY_GROWTH which adjusts the size at runtime but prevents some optimizations, or (3) set Module.TOTAL_MEMORY before the program runs.');
}

var TOTAL_STACK = Module['TOTAL_STACK'] || 5242880;
var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 16777216;
var FAST_MEMORY = Module['FAST_MEMORY'] || 2097152;

var totalMemory = 4096;
while (totalMemory < TOTAL_MEMORY || totalMemory < 2*TOTAL_STACK) {
  if (totalMemory < 16*1024*1024) {
    totalMemory *= 2;
  } else {
    totalMemory += 16*1024*1024
  }
}
if (totalMemory !== TOTAL_MEMORY) {
  Module.printErr('increasing TOTAL_MEMORY to ' + totalMemory + ' to be more reasonable');
  TOTAL_MEMORY = totalMemory;
}

// Initialize the runtime's memory
// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(typeof Int32Array !== 'undefined' && typeof Float64Array !== 'undefined' && !!(new Int32Array(1)['subarray']) && !!(new Int32Array(1)['set']),
       'JS engine does not provide full typed array support');

var buffer = new ArrayBuffer(TOTAL_MEMORY);
HEAP8 = new Int8Array(buffer);
HEAP16 = new Int16Array(buffer);
HEAP32 = new Int32Array(buffer);
HEAPU8 = new Uint8Array(buffer);
HEAPU16 = new Uint16Array(buffer);
HEAPU32 = new Uint32Array(buffer);
HEAPF32 = new Float32Array(buffer);
HEAPF64 = new Float64Array(buffer);

// Endianness check (note: assumes compiler arch was little-endian)
HEAP32[0] = 255;
assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, 'Typed arrays 2 must be run on a little-endian system');

Module['HEAP'] = HEAP;
Module['HEAP8'] = HEAP8;
Module['HEAP16'] = HEAP16;
Module['HEAP32'] = HEAP32;
Module['HEAPU8'] = HEAPU8;
Module['HEAPU16'] = HEAPU16;
Module['HEAPU32'] = HEAPU32;
Module['HEAPF32'] = HEAPF32;
Module['HEAPF64'] = HEAPF64;

function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback();
      continue;
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Runtime.dynCall('v', func);
      } else {
        Runtime.dynCall('vi', func, [callback.arg]);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}

var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the runtime has exited

var runtimeInitialized = false;

function preRun() {
  // compatibility - merge in anything from Module['preRun'] at this time
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function ensureInitRuntime() {
  if (runtimeInitialized) return;
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__);
}

function postRun() {
  // compatibility - merge in anything from Module['postRun'] at this time
  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}
Module['addOnPreRun'] = Module.addOnPreRun = addOnPreRun;

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}
Module['addOnInit'] = Module.addOnInit = addOnInit;

function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}
Module['addOnPreMain'] = Module.addOnPreMain = addOnPreMain;

function addOnExit(cb) {
  __ATEXIT__.unshift(cb);
}
Module['addOnExit'] = Module.addOnExit = addOnExit;

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}
Module['addOnPostRun'] = Module.addOnPostRun = addOnPostRun;

// Tools

// This processes a JS string into a C-line array of numbers, 0-terminated.
// For LLVM-originating strings, see parser.js:parseLLVMString function
function intArrayFromString(stringy, dontAddNull, length /* optional */) {
  var ret = (new Runtime.UTF8Processor()).processJSString(stringy);
  if (length) {
    ret.length = length;
  }
  if (!dontAddNull) {
    ret.push(0);
  }
  return ret;
}
Module['intArrayFromString'] = intArrayFromString;

function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}
Module['intArrayToString'] = intArrayToString;

// Write a Javascript array to somewhere in the heap
function writeStringToMemory(string, buffer, dontAddNull) {
  var array = intArrayFromString(string, dontAddNull);
  var i = 0;
  while (i < array.length) {
    var chr = array[i];
    HEAP8[(((buffer)+(i))|0)]=chr;
    i = i + 1;
  }
}
Module['writeStringToMemory'] = writeStringToMemory;

function writeArrayToMemory(array, buffer) {
  for (var i = 0; i < array.length; i++) {
    HEAP8[(((buffer)+(i))|0)]=array[i];
  }
}
Module['writeArrayToMemory'] = writeArrayToMemory;

function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; i++) {
    HEAP8[(((buffer)+(i))|0)]=str.charCodeAt(i);
  }
  if (!dontAddNull) HEAP8[(((buffer)+(str.length))|0)]=0;
}
Module['writeAsciiToMemory'] = writeAsciiToMemory;

function unSign(value, bits, ignore) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}

// check for imul support, and also for correctness ( https://bugs.webkit.org/show_bug.cgi?id=126345 )
if (!Math['imul'] || Math['imul'](0xffffffff, 5) !== -5) Math['imul'] = function imul(a, b) {
  var ah  = a >>> 16;
  var al = a & 0xffff;
  var bh  = b >>> 16;
  var bl = b & 0xffff;
  return (al*bl + ((ah*bl + al*bh) << 16))|0;
};
Math.imul = Math['imul'];


var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_min = Math.min;

// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// PRE_RUN_ADDITIONS (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled

function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
}
Module['addRunDependency'] = addRunDependency;
function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}
Module['removeRunDependency'] = removeRunDependency;

Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data


var memoryInitializer = null;

// === Body ===
var __ZTVN10__cxxabiv117__class_type_infoE = 14088;
var __ZTVN10__cxxabiv120__si_class_type_infoE = 14128;




STATIC_BASE = 8;

STATICTOP = STATIC_BASE + Runtime.alignMemory(14955);
/* global initializers */ __ATINIT__.push({ func: function() { __GLOBAL__I_a() } });


/* memory initializer */ allocate([0,0,0,0,96,0,0,0,1,0,0,0,2,0,0,0,1,0,0,0,2,0,0,0,3,0,0,0,3,0,0,0,1,0,0,0,2,0,0,0,1,0,0,0,2,0,0,0,3,0,0,0,1,0,0,0,2,0,0,0,1,0,0,0,52,74,83,85,73,0,0,0,50,85,73,0,0,0,0,0,16,55,0,0,80,0,0,0,56,55,0,0,72,0,0,0,88,0,0,0,0,0,0,0,0,0,0,0,208,0,0,0,4,0,0,0,5,0,0,0,1,0,0,0,2,0,0,0,4,0,0,0,5,0,0,0,2,0,0,0,6,0,0,0,56,79,115,99,95,119,114,97,112,0,0,0,0,0,0,0,51,79,115,99,0,0,0,0,51,100,115,112,0,0,0,0,16,55,0,0,176,0,0,0,56,55,0,0,168,0,0,0,184,0,0,0,0,0,0,0,56,55,0,0,152,0,0,0,192,0,0,0,0,0,0,0,99,117,98,105,99,68,105,115,116,111,114,116,105,111,110,0,49,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,48,0,0,0,0,0,0,0,116,111,111,108,116,105,112,0,83,105,110,101,32,111,115,99,105,108,108,97,116,111,114,32,98,97,115,101,100,32,111,110,32,50,68,32,118,101,99,116,111,114,32,114,111,116,97,116,105,111,110,0,0,0,0,0,83,73,78,69,32,87,65,86,69,32,79,83,67,73,76,76,65,84,79,82,32,111,115,99,114,115,0,0,0,0,0,0,83,97,119,116,111,111,116,104,32,119,97,118,101,102,111,114,109,32,97,109,112,108,105,116,117,100,101,0,0,0,0,0,117,110,105,116,0,0,0,0,100,66,0,0,0,0,0,0,65,109,112,108,105,116,117,100,101,0,0,0,0,0,0,0,50,0,0,0,0,0,0,0,83,105,110,101,32,119,97,118,101,32,102,114,101,113,117,101,110,99,121,32,97,115,32,97,32,80,105,97,110,111,32,75,101,121,32,40,80,75,41,32,110,117,109,98,101,114,32,40,65,52,52,48,32,61,32,52,57,32,80,75,41,0,0,0,80,75,0,0,0,0,0,0,70,114,101,113,117,101,110,99,121,0,0,0,0,0,0,0,51,0,0,0,0,0,0,0,80,111,114,116,97,109,101,110,116,111,32,40,102,114,101,113,117,101,110,99,121,45,103,108,105,100,101,41,32,116,105,109,101,45,99,111,110,115,116,97,110,116,32,105,110,32,115,101,99,111,110,100,115,0,0,0,115,101,99,0,0,0,0,0,80,111,114,116,97,109,101,110,116,111,0,0,0,0,0,0,82,101,102,101,114,101,110,99,101,58,32,32,32,32,32,32,32,32,32,32,104,116,116,112,115,58,47,47,99,99,114,109,97,46,115,116,97,110,102,111,114,100,46,101,100,117,47,126,106,111,115,47,112,97,115,112,47,67,117,98,105,99,95,83,111,102,116,95,67,108,105,112,112,101,114,46,104,116,109,108,0,0,0,0,0,0,0,0,67,85,66,73,67,32,78,79,78,76,73,78,69,65,82,73,84,89,32,99,117,98,105,99,110,108,0,0,0,0,0,0,87,104,101,110,32,116,104,105,115,32,105,115,32,99,104,101,99,107,101,100,44,32,116,104,101,32,110,111,110,108,105,110,101,97,114,105,116,121,32,104,97,115,32,110,111,32,101,102,102,101,99,116,0,0,0,0,66,121,112,97,115,115,0,0,65,109,111,117,110,116,32,111,102,32,100,105,115,116,111,114,116,105,111,110,0,0,0,0,68,114,105,118,101,0,0,0,66,114,105,110,103,115,32,105,110,32,101,118,101,110,32,104,97,114,109,111,110,105,99,115,0,0,0,0,0,0,0,0,79,102,102,115,101,116,0,0,83,101,101,32,70,97,117,115,116,39,115,32,102,105,108,116,101,114,46,108,105,98,32,102,111,114,32,100,111,99,117,109,101,110,116,97,116,105,111,110,32,97,110,100,32,114,101,102,101,114,101,110,99,101,115,0,67,79,78,83,84,65,78,84,45,81,32,83,80,69,67,84,82,85,77,32,65,78,65,76,89,90,69,82,32,40,54,69,41,44,32,49,53,32,98,97,110,100,115,32,115,112,97,110,110,105,110,103,32,76,80,44,32,57,32,111,99,116,97,118,101,115,32,98,101,108,111,119,32,49,54,48,48,48,32,72,122,44,32,72,80,0,0,0,83,112,101,99,116,114,97,108,32,66,97,110,100,32,76,101,118,101,108,32,105,110,32,100,66,0,0,0,0,0,0,0,52,0,0,0,0,0,0,0,53,0,0,0,0,0,0,0,54,0,0,0,0,0,0,0,55,0,0,0,0,0,0,0,56,0,0,0,0,0,0,0,57,0,0,0,0,0,0,0,49,48,0,0,0,0,0,0,49,49,0,0,0,0,0,0,49,50,0,0,0,0,0,0,49,51,0,0,0,0,0,0,49,52,0,0,0,0,0,0,83,80,69,67,84,82,85,77,32,65,78,65,76,89,90,69,82,32,67,79,78,84,82,79,76,83,0,0,0,0,0,0,98,97,110,100,45,108,101,118,101,108,32,97,118,101,114,97,103,105,110,103,32,116,105,109,101,32,105,110,32,115,101,99,111,110,100,115,0,0,0,0,76,101,118,101,108,32,65,118,101,114,97,103,105,110,103,32,84,105,109,101,0,0,0,0,76,101,118,101,108,32,111,102,102,115,101,116,32,105,110,32,100,101,99,105,98,101,108,115,0,0,0,0,0,0,0,0,76,101,118,101,108,32,100,66,32,79,102,102,115,101,116], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE);
/* memory initializer */ allocate([120,9,0,0,6,0,0,0,7,0,0,0,7,0,0,0,1,0,0,0,1,0,0,0,3,0,0,0,3,0,0,0,4,0,0,0,2,0,0,0,5,0,0,0,6,0,0,0,1,0,0,0,3,0,0,0,2,0,0,0,78,83,116,51,95,95,49,49,49,95,95,115,116,100,111,117,116,98,117,102,73,119,69,69,0,0,0,0,0,0,0,0,56,55,0,0,88,9,0,0,168,15,0,0,0,0,0,0,0,0,0,0,224,9,0,0,8,0,0,0,9,0,0,0,8,0,0,0,1,0,0,0,1,0,0,0,3,0,0,0,7,0,0,0,4,0,0,0,2,0,0,0,8,0,0,0,9,0,0,0,3,0,0,0,4,0,0,0,4,0,0,0,78,83,116,51,95,95,49,49,48,95,95,115,116,100,105,110,98,117,102,73,119,69,69,0,56,55,0,0,200,9,0,0,168,15,0,0,0,0,0,0,117,110,115,117,112,112,111,114,116,101,100,32,108,111,99,97,108,101,32,102,111,114,32,115,116,97,110,100,97,114,100,32,105,110,112,117,116,0,0,0,0,0,0,0,120,10,0,0,10,0,0,0,11,0,0,0,9,0,0,0,5,0,0,0,2,0,0,0,4,0,0,0,10,0,0,0,11,0,0,0,6,0,0,0,12,0,0,0,13,0,0,0,5,0,0,0,7,0,0,0,6,0,0,0,78,83,116,51,95,95,49,49,49,95,95,115,116,100,111,117,116,98,117,102,73,99,69,69,0,0,0,0,0,0,0,0,56,55,0,0,88,10,0,0,104,15,0,0,0,0,0,0,0,0,0,0,224,10,0,0,12,0,0,0,13,0,0,0,10,0,0,0,5,0,0,0,2,0,0,0,4,0,0,0,14,0,0,0,11,0,0,0,6,0,0,0,15,0,0,0,16,0,0,0,7,0,0,0,8,0,0,0,8,0,0,0,78,83,116,51,95,95,49,49,48,95,95,115,116,100,105,110,98,117,102,73,99,69,69,0,56,55,0,0,200,10,0,0,104,15,0,0,0,0,0,0,78,83,116,51,95,95,49,49,52,95,95,115,104,97,114,101,100,95,99,111,117,110,116,69,0,0,0,0,0,0,0,0,16,55,0,0,240,10,0,0,0,0,0,0,88,11,0,0,14,0,0,0,15,0,0,0,17,0,0,0,0,0,0,0,0,0,0,0,192,11,0,0,16,0,0,0,17,0,0,0,18,0,0,0,0,0,0,0,83,116,49,49,108,111,103,105,99,95,101,114,114,111,114,0,56,55,0,0,72,11,0,0,0,0,0,0,0,0,0,0,0,0,0,0,152,11,0,0,14,0,0,0,18,0,0,0,17,0,0,0,0,0,0,0,83,116,49,50,108,101,110,103,116,104,95,101,114,114,111,114,0,0,0,0,0,0,0,0,56,55,0,0,128,11,0,0,88,11,0,0,0,0,0,0,83,116,49,51,114,117,110,116,105,109,101,95,101,114,114,111,114,0,0,0,0,0,0,0,56,55,0,0,168,11,0,0,0,0,0,0,0,0,0,0,58,32,0,0,0,0,0,0,0,0,0,0,8,12,0,0,19,0,0,0,20,0,0,0,18,0,0,0,0,0,0,0,78,83,116,51,95,95,49,49,50,115,121,115,116,101,109,95,101,114,114,111,114,69,0,0,56,55,0,0,240,11,0,0,192,11,0,0,0,0,0,0,78,83,116,51,95,95,49,49,52,101,114,114,111,114,95,99,97,116,101,103,111,114,121,69,0,0,0,0,0,0,0,0,16,55,0,0,24,12,0,0,78,83,116,51,95,95,49,49,50,95,95,100,111,95,109,101,115,115,97,103,101,69,0,0,56,55,0,0,64,12,0,0,56,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,98,97,115,105,99,95,115,116,114,105,110,103,0,0,0,0,0,0,0,0,104,15,0,0,21,0,0,0,22,0,0,0,11,0,0,0,5,0,0,0,2,0,0,0,4,0,0,0,14,0,0,0,11,0,0,0,6,0,0,0,12,0,0,0,13,0,0,0,5,0,0,0,8,0,0,0,8,0,0,0,0,0,0,0,168,15,0,0,23,0,0,0,24,0,0,0,12,0,0,0,1,0,0,0,1,0,0,0,3,0,0,0,7,0,0,0,4,0,0,0,2,0,0,0,5,0,0,0,6,0,0,0,1,0,0,0,4,0,0,0,4,0,0,0,8,0,0,0,0,0,0,0,224,15,0,0,25,0,0,0,26,0,0,0,248,255,255,255,248,255,255,255,224,15,0,0,27,0,0,0,28,0,0,0,8,0,0,0,0,0,0,0,40,16,0,0,29,0,0,0,30,0,0,0,248,255,255,255,248,255,255,255,40,16,0,0,31,0,0,0,32,0,0,0,4,0,0,0,0,0,0,0,112,16,0,0,33,0,0,0,34,0,0,0,252,255,255,255,252,255,255,255,112,16,0,0,35,0,0,0,36,0,0,0,4,0,0,0,0,0,0,0,184,16,0,0,37,0,0,0,38,0,0,0,252,255,255,255,252,255,255,255,184,16,0,0,39,0,0,0,40,0,0,0,105,111,115,116,114,101,97,109,0,0,0,0,0,0,0,0,117,110,115,112,101,99,105,102,105,101,100,32,105,111,115,116,114,101,97,109,95,99,97,116,101,103,111,114,121,32,101,114,114,111,114,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,14,0,0,41,0,0,0,42,0,0,0,18,0,0,0,0,0,0,0,0,0,0,0,168,14,0,0,43,0,0,0,44,0,0,0,105,111,115,95,98,97,115,101,58,58,99,108,101,97,114,0,78,83,116,51,95,95,49,56,105,111,115,95,98,97,115,101,55,102,97,105,108,117,114,101,69,0,0,0,0,0,0,0,56,55,0,0,96,14,0,0,8,12,0,0,0,0,0,0,78,83,116,51,95,95,49,56,105,111,115,95,98,97,115,101,69,0,0,0,0,0,0,0,16,55,0,0,144,14,0,0,78,83,116,51,95,95,49,57,98,97,115,105,99,95,105,111,115,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,0,0,0,0,0,0,0,56,55,0,0,176,14,0,0,168,14,0,0,0,0,0,0,78,83,116,51,95,95,49,57,98,97,115,105,99,95,105,111,115,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,0,0,0,0,0,0,0,56,55,0,0,240,14,0,0,168,14,0,0,0,0,0,0,78,83,116,51,95,95,49,49,53,98,97,115,105,99,95,115,116,114,101,97,109,98,117,102,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,0,0,0,0,0,0,0,0,16,55,0,0,48,15,0,0,78,83,116,51,95,95,49,49,53,98,97,115,105,99,95,115,116,114,101,97,109,98,117,102,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,0,0,0,0,0,0,0,0,16,55,0,0,112,15,0,0,78,83,116,51,95,95,49,49,51,98,97,115,105,99,95,105,115,116,114,101,97,109,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,0,0,152,55,0,0,176,15,0,0,0,0,0,0,1,0,0,0,224,14,0,0,3,244,255,255,78,83,116,51,95,95,49,49,51,98,97,115,105,99,95,105,115,116,114,101,97,109,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,0,0,152,55,0,0,248,15,0,0,0,0,0,0,1,0,0,0,32,15,0,0,3,244,255,255,78,83,116,51,95,95,49,49,51,98,97,115,105,99,95,111,115,116,114,101,97,109,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,0,0,152,55,0,0,64,16,0,0,0,0,0,0,1,0,0,0,224,14,0,0,3,244,255,255,78,83,116,51,95,95,49,49,51,98,97,115,105,99,95,111,115,116,114,101,97,109,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,0,0,152,55,0,0,136,16,0,0,0,0,0,0,1,0,0,0,32,15,0,0,3,244,255,255,0,0,0,0,24,17,0,0,45,0,0,0,46,0,0,0,19,0,0,0,3,0,0,0,9,0,0,0,10,0,0,0,4,0,0,0,0,0,0,0,78,83,116,51,95,95,49,49,57,95,95,105,111,115,116,114,101,97,109,95,99,97,116,101,103,111,114,121,69,0,0,0,56,55,0,0,248,16,0,0,88,12,0,0,0,0,0,0,0,0,0,0,64,31,0,0,47,0,0,0,48,0,0,0,49,0,0,0,1,0,0,0,5,0,0,0,11,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,104,31,0,0,50,0,0,0,51,0,0,0,49,0,0,0,2,0,0,0,6,0,0,0,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,24,36,0,0,52,0,0,0,53,0,0,0,49,0,0,0,1,0,0,0,2,0,0,0,3,0,0,0,4,0,0,0,5,0,0,0,6,0,0,0,7,0,0,0,8,0,0,0,9,0,0,0,10,0,0,0,11,0,0,0,0,0,0,0,0,0,0,0,48,49,50,51,52,53,54,55,56,57,97,98,99,100,101,102,65,66,67,68,69,70,120,88,43,45,112,80,105,73,110,78,0,0,0,0,0,0,0,0,37,112,0,0,0,0,0,0,0,0,0,0,176,36,0,0,54,0,0,0,55,0,0,0,49,0,0,0,12,0,0,0,13,0,0,0,14,0,0,0,15,0,0,0,16,0,0,0,17,0,0,0,18,0,0,0,19,0,0,0,20,0,0,0,21,0,0,0,22,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,112,37,0,0,56,0,0,0,57,0,0,0,49,0,0,0,3,0,0,0,4,0,0,0,23,0,0,0,5,0,0,0,24,0,0,0,1,0,0,0,2,0,0,0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,8,38,0,0,58,0,0,0,59,0,0,0,49,0,0,0,7,0,0,0,8,0,0,0,25,0,0,0,9,0,0,0,26,0,0,0,3,0,0,0,4,0,0,0,10,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,0,0,0,0,0,0,0,37,112,0,0,0,0,0,0,0,0,0,0,48,33,0,0,60,0,0,0,61,0,0,0,49,0,0,0,20,0,0,0,27,0,0,0,28,0,0,0,29,0,0,0,30,0,0,0,31,0,0,0,1,0,0,0,248,255,255,255,48,33,0,0,21,0,0,0,22,0,0,0,23,0,0,0,24,0,0,0,25,0,0,0,26,0,0,0,27,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,72,58,37,77,58,37,83,37,109,47,37,100,47,37,121,37,89,45,37,109,45,37,100,37,73,58,37,77,58,37,83,32,37,112,0,0,0,0,0,37,72,58,37,77,0,0,0,37,72,58,37,77,58,37,83,0,0,0,0,208,33,0,0,62,0,0,0,63,0,0,0,49,0,0,0,28,0,0,0,32,0,0,0,33,0,0,0,34,0,0,0,35,0,0,0,36,0,0,0,2,0,0,0,248,255,255,255,208,33,0,0,29,0,0,0,30,0,0,0,31,0,0,0,32,0,0,0,33,0,0,0,34,0,0,0,35,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,0,0,0,72,0,0,0,58,0,0,0,37,0,0,0,77,0,0,0,58,0,0,0,37,0,0,0,83,0,0,0,37,0,0,0,109,0,0,0,47,0,0,0,37,0,0,0,100,0,0,0,47,0,0,0,37,0,0,0,121,0,0,0,37,0,0,0,89,0,0,0,45,0,0,0,37,0,0,0,109,0,0,0,45,0,0,0,37,0,0,0,100,0,0,0,37,0,0,0,73,0,0,0,58,0,0,0,37,0,0,0,77,0,0,0,58,0,0,0,37,0,0,0,83,0,0,0,32,0,0,0,37,0,0,0,112,0,0,0,0,0,0,0,37,0,0,0,72,0,0,0,58,0,0,0,37,0,0,0,77,0,0,0,0,0,0,0,37,0,0,0,72,0,0,0,58,0,0,0,37,0,0,0,77,0,0,0,58,0,0,0,37,0,0,0,83,0,0,0,0,0,0,0,96,34,0,0,64,0,0,0,65,0,0,0,49,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,200,34,0,0,66,0,0,0,67,0,0,0,49,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,184,31,0,0,68,0,0,0,69,0,0,0,49,0,0,0,36,0,0,0,37,0,0,0,13,0,0,0,14,0,0,0,15,0,0,0,16,0,0,0,38,0,0,0,17,0,0,0,18,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,248,31,0,0,70,0,0,0,71,0,0,0,49,0,0,0,39,0,0,0,40,0,0,0,19,0,0,0,20,0,0,0,21,0,0,0,22,0,0,0,41,0,0,0,23,0,0,0,24,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,56,32,0,0,72,0,0,0,73,0,0,0,49,0,0,0,42,0,0,0,43,0,0,0,25,0,0,0,26,0,0,0,27,0,0,0,28,0,0,0,44,0,0,0,29,0,0,0,30,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,120,32,0,0,74,0,0,0,75,0,0,0,49,0,0,0,45,0,0,0,46,0,0,0,31,0,0,0,32,0,0,0,33,0,0,0,34,0,0,0,47,0,0,0,35,0,0,0,36,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,152,38,0,0,76,0,0,0,77,0,0,0,49,0,0,0,3,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,48,49,50,51,52,53,54,55,56,57,0,0,0,0,0,0,37,76,102,0,0,0,0,0,109,111,110,101,121,95,103,101,116,32,101,114,114,111,114,0,0,0,0,0,40,39,0,0,78,0,0,0,79,0,0,0,49,0,0,0,5,0,0,0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,48,49,50,51,52,53,54,55,56,57,0,0,0,0,0,0,0,0,0,0,184,39,0,0,80,0,0,0,81,0,0,0,49,0,0,0,1,0,0,0,37,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,46,48,76,102,0,0,0,0,0,0,0,72,40,0,0,82,0,0,0,83,0,0,0,49,0,0,0,2,0,0,0,38,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,32,35,0,0,84,0,0,0,85,0,0,0,49,0,0,0,13,0,0,0,11,0,0,0,37,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,88,35,0,0,86,0,0,0,87,0,0,0,49,0,0,0,14,0,0,0,12,0,0,0,38,0,0,0,0,0,0,0,0,0,0,0,118,101,99,116,111,114,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,67,0,0,0,0,0,0,0,0,0,0,0,24,31,0,0,88,0,0,0,89,0,0,0,49,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,27,0,0,90,0,0,0,91,0,0,0,49,0,0,0,9,0,0,0,15,0,0,0,10,0,0,0,16,0,0,0,11,0,0,0,1,0,0,0,17,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,208,28,0,0,92,0,0,0,93,0,0,0,49,0,0,0,1,0,0,0,2,0,0,0,4,0,0,0,48,0,0,0,49,0,0,0,5,0,0,0,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,200,30,0,0,94,0,0,0,95,0,0,0,49,0,0,0,51,0,0,0,52,0,0,0,39,0,0,0,40,0,0,0,41,0,0,0,0,0,0,0,240,30,0,0,96,0,0,0,97,0,0,0,49,0,0,0,53,0,0,0,54,0,0,0,42,0,0,0,43,0,0,0,44,0,0,0,116,114,117,101,0,0,0,0,116,0,0,0,114,0,0,0,117,0,0,0,101,0,0,0,0,0,0,0,0,0,0,0,102,97,108,115,101,0,0,0,102,0,0,0,97,0,0,0,108,0,0,0,115,0,0,0,101,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,109,47,37,100,47,37,121,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,0,0,0,109,0,0,0,47,0,0,0,37,0,0,0,100,0,0,0,47,0,0,0,37,0,0,0,121,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,72,58,37,77,58,37,83,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,0,0,0,72,0,0,0,58,0,0,0,37,0,0,0,77,0,0,0,58,0,0,0,37,0,0,0,83,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,97,32,37,98,32,37,100,32,37,72,58,37,77,58,37,83,32,37,89,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,0,0,0,97,0,0,0,32,0,0,0,37,0,0,0,98,0,0,0,32,0,0,0,37,0,0,0,100,0,0,0,32,0,0,0,37,0,0,0,72,0,0,0,58,0,0,0,37,0,0,0,77,0,0,0,58,0,0,0,37,0,0,0,83,0,0,0,32,0,0,0,37,0,0,0,89,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,73,58,37,77,58,37,83,32,37,112,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,0,0,0,73,0,0,0,58,0,0,0,37,0,0,0,77,0,0,0,58,0,0,0,37,0,0,0,83,0,0,0,32,0,0,0,37,0,0,0,112,0,0,0,0,0,0,0,108,111,99,97,108,101,32,110,111,116,32,115,117,112,112,111,114,116,101,100,0,0,0,0,0,0,0,0,40,27,0,0,98,0,0,0,99,0,0,0,49,0,0,0,0,0,0,0,78,83,116,51,95,95,49,54,108,111,99,97,108,101,53,102,97,99,101,116,69,0,0,0,56,55,0,0,16,27,0,0,16,11,0,0,0,0,0,0,0,0,0,0,184,27,0,0,98,0,0,0,100,0,0,0,49,0,0,0,18,0,0,0,2,0,0,0,3,0,0,0,4,0,0,0,12,0,0,0,19,0,0,0,13,0,0,0,20,0,0,0,14,0,0,0,5,0,0,0,21,0,0,0,6,0,0,0,0,0,0,0,78,83,116,51,95,95,49,53,99,116,121,112,101,73,119,69,69,0,0,0,0,0,0,0,78,83,116,51,95,95,49,49,48,99,116,121,112,101,95,98,97,115,101,69,0,0,0,0,16,55,0,0,152,27,0,0,152,55,0,0,128,27,0,0,0,0,0,0,2,0,0,0,40,27,0,0,2,0,0,0,176,27,0,0,2,0,0,0,78,83,116,51,95,95,49,53,99,116,121,112,101,73,99,69,69,0,0,0,0,0,0,0,152,55,0,0,216,27,0,0,0,0,0,0,2,0,0,0,40,27,0,0,2,0,0,0,176,27,0,0,2,0,0,0,0,0,0,0,136,28,0,0,98,0,0,0,101,0,0,0,49,0,0,0,3,0,0,0,4,0,0,0,7,0,0,0,55,0,0,0,56,0,0,0,8,0,0,0,57,0,0,0,78,83,116,51,95,95,49,55,99,111,100,101,99,118,116,73,99,99,49,49,95,95,109,98,115,116,97,116,101,95,116,69,69,0,0,0,0,0,0,0,78,83,116,51,95,95,49,49,50,99,111,100,101,99,118,116,95,98,97,115,101,69,0,0,16,55,0,0,104,28,0,0,152,55,0,0,64,28,0,0,0,0,0,0,2,0,0,0,40,27,0,0,2,0,0,0,128,28,0,0,2,0,0,0,78,83,116,51,95,95,49,55,99,111,100,101,99,118,116,73,119,99,49,49,95,95,109,98,115,116,97,116,101,95,116,69,69,0,0,0,0,0,0,0,152,55,0,0,168,28,0,0,0,0,0,0,2,0,0,0,40,27,0,0,2,0,0,0,128,28,0,0,2,0,0,0,0,0,0,0,72,29,0,0,98,0,0,0,102,0,0,0,49,0,0,0,5,0,0,0,6,0,0,0,9,0,0,0,58,0,0,0,59,0,0,0,10,0,0,0,60,0,0,0,78,83,116,51,95,95,49,55,99,111,100,101,99,118,116,73,68,115,99,49,49,95,95,109,98,115,116,97,116,101,95,116,69,69,0,0,0,0,0,0,152,55,0,0,32,29,0,0,0,0,0,0,2,0,0,0,40,27,0,0,2,0,0,0,128,28,0,0,2,0,0,0,0,0,0,0,192,29,0,0,98,0,0,0,103,0,0,0,49,0,0,0,7,0,0,0,8,0,0,0,11,0,0,0,61,0,0,0,62,0,0,0,12,0,0,0,63,0,0,0,78,83,116,51,95,95,49,55,99,111,100,101,99,118,116,73,68,105,99,49,49,95,95,109,98,115,116,97,116,101,95,116,69,69,0,0,0,0,0,0,152,55,0,0,152,29,0,0,0,0,0,0,2,0,0,0,40,27,0,0,2,0,0,0,128,28,0,0,2,0,0,0,0,0,0,0,56,30,0,0,98,0,0,0,104,0,0,0,49,0,0,0,7,0,0,0,8,0,0,0,11,0,0,0,61,0,0,0,62,0,0,0,12,0,0,0,63,0,0,0,78,83,116,51,95,95,49,49,54,95,95,110,97,114,114,111,119,95,116,111,95,117,116,102,56,73,76,106,51,50,69,69,69,0,0,0,0,0,0,0,56,55,0,0,16,30,0,0,192,29,0,0,0,0,0,0,0,0,0,0,160,30,0,0,98,0,0,0,105,0,0,0,49,0,0,0,7,0,0,0,8,0,0,0,11,0,0,0,61,0,0,0,62,0,0,0,12,0,0,0,63,0,0,0,78,83,116,51,95,95,49,49,55,95,95,119,105,100,101,110,95,102,114,111,109,95,117,116,102,56,73,76,106,51,50,69,69,69,0,0,0,0,0,0,56,55,0,0,120,30,0,0,192,29,0,0,0,0,0,0,78,83,116,51,95,95,49,56,110,117,109,112,117,110,99,116,73,99,69,69,0,0,0,0,56,55,0,0,176,30,0,0,40,27,0,0,0,0,0,0,78,83,116,51,95,95,49,56,110,117,109,112,117,110,99,116,73,119,69,69,0,0,0,0,56,55,0,0,216,30,0,0,40,27,0,0,0,0,0,0,78,83,116,51,95,95,49,54,108,111,99,97,108,101,53,95,95,105,109,112,69,0,0,0,56,55,0,0,0,31,0,0,40,27,0,0,0,0,0,0,78,83,116,51,95,95,49,55,99,111,108,108,97,116,101,73,99,69,69,0,0,0,0,0,56,55,0,0,40,31,0,0,40,27,0,0,0,0,0,0,78,83,116,51,95,95,49,55,99,111,108,108,97,116,101,73,119,69,69,0,0,0,0,0,56,55,0,0,80,31,0,0,40,27,0,0,0,0,0,0,78,83,116,51,95,95,49,49,48,109,111,110,101,121,112,117,110,99,116,73,99,76,98,48,69,69,69,0,0,0,0,0,78,83,116,51,95,95,49,49,48,109,111,110,101,121,95,98,97,115,101,69,0,0,0,0,16,55,0,0,152,31,0,0,152,55,0,0,120,31,0,0,0,0,0,0,2,0,0,0,40,27,0,0,2,0,0,0,176,31,0,0,2,0,0,0,78,83,116,51,95,95,49,49,48,109,111,110,101,121,112,117,110,99,116,73,99,76,98,49,69,69,69,0,0,0,0,0,152,55,0,0,216,31,0,0,0,0,0,0,2,0,0,0,40,27,0,0,2,0,0,0,176,31,0,0,2,0,0,0,78,83,116,51,95,95,49,49,48,109,111,110,101,121,112,117,110,99,116,73,119,76,98,48,69,69,69,0,0,0,0,0,152,55,0,0,24,32,0,0,0,0,0,0,2,0,0,0,40,27,0,0,2,0,0,0,176,31,0,0,2,0,0,0,78,83,116,51,95,95,49,49,48,109,111,110,101,121,112,117,110,99,116,73,119,76,98,49,69,69,69,0,0,0,0,0,152,55,0,0,88,32,0,0,0,0,0,0,2,0,0,0,40,27,0,0,2,0,0,0,176,31,0,0,2,0,0,0,78,83,116,51,95,95,49,56,116,105,109,101,95,103,101,116,73,99,78,83,95,49,57,105,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,69,69,0,0,0,0,78,83,116,51,95,95,49,57,116,105,109,101,95,98,97,115,101,69,0,0,0,0,0,0,16,55,0,0,224,32,0,0,78,83,116,51,95,95,49,50,48,95,95,116,105,109,101,95,103,101,116,95,99,95,115,116,111,114,97,103,101,73,99,69,69,0,0,0,0,0,0,0,16,55,0,0,0,33,0,0,152,55,0,0,152,32,0,0,0,0,0,0,3,0,0,0,40,27,0,0,2,0,0,0,248,32,0,0,2,0,0,0,40,33,0,0,0,8,0,0,78,83,116,51,95,95,49,56,116,105,109,101,95,103,101,116,73,119,78,83,95,49,57,105,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,69,69,0,0,0,0,78,83,116,51,95,95,49,50,48,95,95,116,105,109,101,95,103,101,116,95,99,95,115,116,111,114,97,103,101,73,119,69,69,0,0,0,0,0,0,0,16,55,0,0,160,33,0,0,152,55,0,0,88,33,0,0,0,0,0,0,3,0,0,0,40,27,0,0,2,0,0,0,248,32,0,0,2,0,0,0,200,33,0,0,0,8,0,0,78,83,116,51,95,95,49,56,116,105,109,101,95,112,117,116,73,99,78,83,95,49,57,111,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,69,69,0,0,0,0,78,83,116,51,95,95,49,49,48,95,95,116,105,109,101,95,112,117,116,69,0,0,0,0,16,55,0,0,64,34,0,0,152,55,0,0,248,33,0,0,0,0,0,0,2,0,0,0,40,27,0,0,2,0,0,0,88,34,0,0,0,8,0,0,78,83,116,51,95,95,49,56,116,105,109,101,95,112,117,116,73,119,78,83,95,49,57,111,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,69,69,0,0,0,0,152,55,0,0,128,34,0,0,0,0,0,0,2,0,0,0,40,27,0,0,2,0,0,0,88,34,0,0,0,8,0,0,78,83,116,51,95,95,49,56,109,101,115,115,97,103,101,115,73,99,69,69,0,0,0,0,78,83,116,51,95,95,49,49,51,109,101,115,115,97,103,101,115,95,98,97,115,101,69,0,16,55,0,0,0,35,0,0,152,55,0,0,232,34,0,0,0,0,0,0,2,0,0,0,40,27,0,0,2,0,0,0,24,35,0,0,2,0,0,0,78,83,116,51,95,95,49,56,109,101,115,115,97,103,101,115,73,119,69,69,0,0,0,0,152,55,0,0,64,35,0,0,0,0,0,0,2,0,0,0,40,27,0,0,2,0,0,0,24,35,0,0,2,0,0,0,78,83,116,51,95,95,49,55,110,117,109,95,103,101,116,73,99,78,83,95,49,57,105,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,69,69,0,0,0,0,0,78,83,116,51,95,95,49,57,95,95,110,117,109,95,103,101,116,73,99,69,69,0,0,0,78,83,116,51,95,95,49,49,52,95,95,110,117,109,95,103,101,116,95,98,97,115,101,69,0,0,0,0,0,0,0,0,16,55,0,0,216,35,0,0,152,55,0,0,192,35,0,0,0,0,0,0,1,0,0,0,248,35,0,0,0,0,0,0,152,55,0,0,120,35,0,0,0,0,0,0,2,0,0,0,40,27,0,0,2,0,0,0,0,36,0,0,0,0,0,0,78,83,116,51,95,95,49,55,110,117,109,95,103,101,116,73,119,78,83,95,49,57,105,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,69,69,0,0,0,0,0,78,83,116,51,95,95,49,57,95,95,110,117,109,95,103,101,116,73,119,69,69,0,0,0,152,55,0,0,128,36,0,0,0,0,0,0,1,0,0,0,248,35,0,0,0,0,0,0,152,55,0,0,56,36,0,0,0,0,0,0,2,0,0,0,40,27,0,0,2,0,0,0,152,36,0,0,0,0,0,0,78,83,116,51,95,95,49,55,110,117,109,95,112,117,116,73,99,78,83,95,49,57,111,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,69,69,0,0,0,0,0,78,83,116,51,95,95,49,57,95,95,110,117,109,95,112,117,116,73,99,69,69,0,0,0,78,83,116,51,95,95,49,49,52,95,95,110,117,109,95,112,117,116,95,98,97,115,101,69,0,0,0,0,0,0,0,0,16,55,0,0,48,37,0,0,152,55,0,0,24,37,0,0,0,0,0,0,1,0,0,0,80,37,0,0,0,0,0,0,152,55,0,0,208,36,0,0,0,0,0,0,2,0,0,0,40,27,0,0,2,0,0,0,88,37,0,0,0,0,0,0,78,83,116,51,95,95,49,55,110,117,109,95,112,117,116,73,119,78,83,95,49,57,111,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,69,69,0,0,0,0,0,78,83,116,51,95,95,49,57,95,95,110,117,109,95,112,117,116,73,119,69,69,0,0,0,152,55,0,0,216,37,0,0,0,0,0,0,1,0,0,0,80,37,0,0,0,0,0,0,152,55,0,0,144,37,0,0,0,0,0,0,2,0,0,0,40,27,0,0,2,0,0,0,240,37,0,0,0,0,0,0,78,83,116,51,95,95,49,57,109,111,110,101,121,95,103,101,116,73,99,78,83,95,49,57,105,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,69,69,0,0,0,78,83,116,51,95,95,49,49,49,95,95,109,111,110,101,121,95,103,101,116,73,99,69,69,0,0,0,0,0,0,0,0,16,55,0,0,112,38,0,0,152,55,0,0,40,38,0,0,0,0,0,0,2,0,0,0,40,27,0,0,2,0,0,0,144,38,0,0,0,0,0,0,78,83,116,51,95,95,49,57,109,111,110,101,121,95,103,101,116,73,119,78,83,95,49,57,105,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,69,69,0,0,0,78,83,116,51,95,95,49,49,49,95,95,109,111,110,101,121,95,103,101,116,73,119,69,69,0,0,0,0,0,0,0,0,16,55,0,0,0,39,0,0,152,55,0,0,184,38,0,0,0,0,0,0,2,0,0,0,40,27,0,0,2,0,0,0,32,39,0,0,0,0,0,0,78,83,116,51,95,95,49,57,109,111,110,101,121,95,112,117,116,73,99,78,83,95,49,57,111,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,69,69,0,0,0,78,83,116,51,95,95,49,49,49,95,95,109,111,110,101,121,95,112,117,116,73,99,69,69,0,0,0,0,0,0,0,0,16,55,0,0,144,39,0,0,152,55,0,0,72,39,0,0,0,0,0,0,2,0,0,0,40,27,0,0,2,0,0,0,176,39,0,0,0,0,0,0,78,83,116,51,95,95,49,57,109,111,110,101,121,95,112,117,116,73,119,78,83,95,49,57,111,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,69,69,0,0,0,78,83,116,51,95,95,49,49,49,95,95,109,111,110,101,121,95,112,117,116,73,119,69,69,0,0,0,0,0,0,0,0,16,55,0,0,32,40,0,0,152,55,0,0,216,39,0,0,0,0,0,0,2,0,0,0,40,27,0,0,2,0,0,0,64,40,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,65,0,0,0,77,0,0,0,0,0,0,0,0,0,0,0,80,0,0,0,77,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,65,77,0,0,0,0,0,0,80,77,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,74,0,0,0,97,0,0,0,110,0,0,0,117,0,0,0,97,0,0,0,114,0,0,0,121,0,0,0,0,0,0,0,70,0,0,0,101,0,0,0,98,0,0,0,114,0,0,0,117,0,0,0,97,0,0,0,114,0,0,0,121,0,0,0,0,0,0,0,0,0,0,0,77,0,0,0,97,0,0,0,114,0,0,0,99,0,0,0,104,0,0,0,0,0,0,0,65,0,0,0,112,0,0,0,114,0,0,0,105,0,0,0,108,0,0,0,0,0,0,0,74,0,0,0,117,0,0,0,110,0,0,0,101,0,0,0,0,0,0,0,0,0,0,0,74,0,0,0,117,0,0,0,108,0,0,0,121,0,0,0,0,0,0,0,0,0,0,0,65,0,0,0,117,0,0,0,103,0,0,0,117,0,0,0,115,0,0,0,116,0,0,0,0,0,0,0,0,0,0,0,83,0,0,0,101,0,0,0,112,0,0,0,116,0,0,0,101,0,0,0,109,0,0,0,98,0,0,0,101,0,0,0,114,0,0,0,0,0,0,0,79,0,0,0,99,0,0,0,116,0,0,0,111,0,0,0,98,0,0,0,101,0,0,0,114,0,0,0,0,0,0,0,78,0,0,0,111,0,0,0,118,0,0,0,101,0,0,0,109,0,0,0,98,0,0,0,101,0,0,0,114,0,0,0,0,0,0,0,0,0,0,0,68,0,0,0,101,0,0,0,99,0,0,0,101,0,0,0,109,0,0,0,98,0,0,0,101,0,0,0,114,0,0,0,0,0,0,0,0,0,0,0,74,0,0,0,97,0,0,0,110,0,0,0,0,0,0,0,70,0,0,0,101,0,0,0,98,0,0,0,0,0,0,0,77,0,0,0,97,0,0,0,114,0,0,0,0,0,0,0,65,0,0,0,112,0,0,0,114,0,0,0,0,0,0,0,77,0,0,0,97,0,0,0,121,0,0,0,0,0,0,0,74,0,0,0,117,0,0,0,110,0,0,0,0,0,0,0,74,0,0,0,117,0,0,0,108,0,0,0,0,0,0,0,65,0,0,0,117,0,0,0,103,0,0,0,0,0,0,0,83,0,0,0,101,0,0,0,112,0,0,0,0,0,0,0,79,0,0,0,99,0,0,0,116,0,0,0,0,0,0,0,78,0,0,0,111,0,0,0,118,0,0,0,0,0,0,0,68,0,0,0,101,0,0,0,99], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+2324);
/* memory initializer */ allocate([74,97,110,117,97,114,121,0,70,101,98,114,117,97,114,121,0,0,0,0,0,0,0,0,77,97,114,99,104,0,0,0,65,112,114,105,108,0,0,0,77,97,121,0,0,0,0,0,74,117,110,101,0,0,0,0,74,117,108,121,0,0,0,0,65,117,103,117,115,116,0,0,83,101,112,116,101,109,98,101,114,0,0,0,0,0,0,0,79,99,116,111,98,101,114,0,78,111,118,101,109,98,101,114,0,0,0,0,0,0,0,0,68,101,99,101,109,98,101,114,0,0,0,0,0,0,0,0,74,97,110,0,0,0,0,0,70,101,98,0,0,0,0,0,77,97,114,0,0,0,0,0,65,112,114,0,0,0,0,0,74,117,110,0,0,0,0,0,74,117,108,0,0,0,0,0,65,117,103,0,0,0,0,0,83,101,112,0,0,0,0,0,79,99,116,0,0,0,0,0,78,111,118,0,0,0,0,0,68,101,99,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,83,0,0,0,117,0,0,0,110,0,0,0,100,0,0,0,97,0,0,0,121,0,0,0,0,0,0,0,0,0,0,0,77,0,0,0,111,0,0,0,110,0,0,0,100,0,0,0,97,0,0,0,121,0,0,0,0,0,0,0,0,0,0,0,84,0,0,0,117,0,0,0,101,0,0,0,115,0,0,0,100,0,0,0,97,0,0,0,121,0,0,0,0,0,0,0,87,0,0,0,101,0,0,0,100,0,0,0,110,0,0,0,101,0,0,0,115,0,0,0,100,0,0,0,97,0,0,0,121,0,0,0,0,0,0,0,84,0,0,0,104,0,0,0,117,0,0,0,114,0,0,0,115,0,0,0,100,0,0,0,97,0,0,0,121,0,0,0,0,0,0,0,0,0,0,0,70,0,0,0,114,0,0,0,105,0,0,0,100,0,0,0,97,0,0,0,121,0,0,0,0,0,0,0,0,0,0,0,83,0,0,0,97,0,0,0,116,0,0,0,117,0,0,0,114,0,0,0,100,0,0,0,97,0,0,0,121,0,0,0,0,0,0,0,0,0,0,0,83,0,0,0,117,0,0,0,110,0,0,0,0,0,0,0,77,0,0,0,111,0,0,0,110,0,0,0,0,0,0,0,84,0,0,0,117,0,0,0,101,0,0,0,0,0,0,0,87,0,0,0,101,0,0,0,100,0,0,0,0,0,0,0,84,0,0,0,104,0,0,0,117,0,0,0,0,0,0,0,70,0,0,0,114,0,0,0,105,0,0,0,0,0,0,0,83,0,0,0,97,0,0,0,116,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,83,117,110,100,97,121,0,0,77,111,110,100,97,121,0,0,84,117,101,115,100,97,121,0,87,101,100,110,101,115,100,97,121,0,0,0,0,0,0,0,84,104,117,114,115,100,97,121,0,0,0,0,0,0,0,0,70,114,105,100,97,121,0,0,83,97,116,117,114,100,97,121,0,0,0,0,0,0,0,0,83,117,110,0,0,0,0,0,77,111,110,0,0,0,0,0,84,117,101,0,0,0,0,0,87,101,100,0,0,0,0,0,84,104,117,0,0,0,0,0,70,114,105,0,0,0,0,0,83,97,116,0,0,0,0,0,2,0,0,192,3,0,0,192,4,0,0,192,5,0,0,192,6,0,0,192,7,0,0,192,8,0,0,192,9,0,0,192,10,0,0,192,11,0,0,192,12,0,0,192,13,0,0,192,14,0,0,192,15,0,0,192,16,0,0,192,17,0,0,192,18,0,0,192,19,0,0,192,20,0,0,192,21,0,0,192,22,0,0,192,23,0,0,192,24,0,0,192,25,0,0,192,26,0,0,192,27,0,0,192,28,0,0,192,29,0,0,192,30,0,0,192,31,0,0,192,0,0,0,179,1,0,0,195,2,0,0,195,3,0,0,195,4,0,0,195,5,0,0,195,6,0,0,195,7,0,0,195,8,0,0,195,9,0,0,195,10,0,0,195,11,0,0,195,12,0,0,195,13,0,0,211,14,0,0,195,15,0,0,195,0,0,12,187,1,0,12,195,2,0,12,195,3,0,12,195,4,0,12,211,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,136,54,0,0,106,0,0,0,107,0,0,0,64,0,0,0,0,0,0,0,115,116,100,58,58,98,97,100,95,99,97,115,116,0,0,0,83,116,57,116,121,112,101,95,105,110,102,111,0,0,0,0,16,55,0,0,96,54,0,0,83,116,56,98,97,100,95,99,97,115,116,0,0,0,0,0,56,55,0,0,120,54,0,0,0,0,0,0,0,0,0,0,78,49,48,95,95,99,120,120,97,98,105,118,49,49,54,95,95,115,104,105,109,95,116,121,112,101,95,105,110,102,111,69,0,0,0,0,0,0,0,0,56,55,0,0,152,54,0,0,112,54,0,0,0,0,0,0,78,49,48,95,95,99,120,120,97,98,105,118,49,49,55,95,95,99,108,97,115,115,95,116,121,112,101,95,105,110,102,111,69,0,0,0,0,0,0,0,56,55,0,0,208,54,0,0,192,54,0,0,0,0,0,0,0,0,0,0,248,54,0,0,108,0,0,0,109,0,0,0,110,0,0,0,111,0,0,0,22,0,0,0,13,0,0,0,1,0,0,0,7,0,0,0,0,0,0,0,128,55,0,0,108,0,0,0,112,0,0,0,110,0,0,0,111,0,0,0,22,0,0,0,14,0,0,0,2,0,0,0,8,0,0,0,78,49,48,95,95,99,120,120,97,98,105,118,49,50,48,95,95,115,105,95,99,108,97,115,115,95,116,121,112,101,95,105,110,102,111,69,0,0,0,0,56,55,0,0,88,55,0,0,248,54,0,0,0,0,0,0,0,0,0,0,224,55,0,0,108,0,0,0,113,0,0,0,110,0,0,0,111,0,0,0,22,0,0,0,15,0,0,0,3,0,0,0,9,0,0,0,78,49,48,95,95,99,120,120,97,98,105,118,49,50,49,95,95,118,109,105,95,99,108,97,115,115,95,116,121,112,101,95,105,110,102,111,69,0,0,0,56,55,0,0,184,55,0,0,248,54,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,32,58,0,0,114,0,0,0,115,0,0,0,65,0,0,0,0,0,0,0,115,116,100,58,58,98,97,100,95,97,108,108,111,99,0,0,83,116,57,98,97,100,95,97,108,108,111,99,0,0,0,0,56,55,0,0,16,58,0,0,0,0,0,0,0,0,0,0,105,110,102,105,110,105,116,121,0,0,0,0,0,0,0,0,110,97,110,0,0,0,0,0,95,112,137,0,255,9,47,15,10,0,0,0,100,0,0,0,232,3,0,0,16,39,0,0,160,134,1,0,64,66,15,0,128,150,152,0,0,225,245,5], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+12584);




var tempDoublePtr = Runtime.alignMemory(allocate(12, "i8", ALLOC_STATIC), 8);

assert(tempDoublePtr % 8 == 0);

function copyTempFloat(ptr) { // functions, because inlining this code increases code size too much

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

}

function copyTempDouble(ptr) {

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

  HEAP8[tempDoublePtr+4] = HEAP8[ptr+4];

  HEAP8[tempDoublePtr+5] = HEAP8[ptr+5];

  HEAP8[tempDoublePtr+6] = HEAP8[ptr+6];

  HEAP8[tempDoublePtr+7] = HEAP8[ptr+7];

}


  
  function _atexit(func, arg) {
      __ATEXIT__.unshift({ func: func, arg: arg });
    }var ___cxa_atexit=_atexit;

   
  Module["_i64Subtract"] = _i64Subtract;

  var _fabsf=Math_abs;

   
  Module["_i64Add"] = _i64Add;

  
  
  
   
  Module["_strlen"] = _strlen;
  
  function __reallyNegative(x) {
      return x < 0 || (x === 0 && (1/x) === -Infinity);
    }function __formatString(format, varargs) {
      var textIndex = format;
      var argIndex = 0;
      function getNextArg(type) {
        // NOTE: Explicitly ignoring type safety. Otherwise this fails:
        //       int x = 4; printf("%c\n", (char)x);
        var ret;
        if (type === 'double') {
          ret = (HEAP32[((tempDoublePtr)>>2)]=HEAP32[(((varargs)+(argIndex))>>2)],HEAP32[(((tempDoublePtr)+(4))>>2)]=HEAP32[(((varargs)+((argIndex)+(4)))>>2)],(+(HEAPF64[(tempDoublePtr)>>3])));
        } else if (type == 'i64') {
          ret = [HEAP32[(((varargs)+(argIndex))>>2)],
                 HEAP32[(((varargs)+(argIndex+4))>>2)]];
  
        } else {
          type = 'i32'; // varargs are always i32, i64, or double
          ret = HEAP32[(((varargs)+(argIndex))>>2)];
        }
        argIndex += Runtime.getNativeFieldSize(type);
        return ret;
      }
  
      var ret = [];
      var curr, next, currArg;
      while(1) {
        var startTextIndex = textIndex;
        curr = HEAP8[(textIndex)];
        if (curr === 0) break;
        next = HEAP8[((textIndex+1)|0)];
        if (curr == 37) {
          // Handle flags.
          var flagAlwaysSigned = false;
          var flagLeftAlign = false;
          var flagAlternative = false;
          var flagZeroPad = false;
          var flagPadSign = false;
          flagsLoop: while (1) {
            switch (next) {
              case 43:
                flagAlwaysSigned = true;
                break;
              case 45:
                flagLeftAlign = true;
                break;
              case 35:
                flagAlternative = true;
                break;
              case 48:
                if (flagZeroPad) {
                  break flagsLoop;
                } else {
                  flagZeroPad = true;
                  break;
                }
              case 32:
                flagPadSign = true;
                break;
              default:
                break flagsLoop;
            }
            textIndex++;
            next = HEAP8[((textIndex+1)|0)];
          }
  
          // Handle width.
          var width = 0;
          if (next == 42) {
            width = getNextArg('i32');
            textIndex++;
            next = HEAP8[((textIndex+1)|0)];
          } else {
            while (next >= 48 && next <= 57) {
              width = width * 10 + (next - 48);
              textIndex++;
              next = HEAP8[((textIndex+1)|0)];
            }
          }
  
          // Handle precision.
          var precisionSet = false, precision = -1;
          if (next == 46) {
            precision = 0;
            precisionSet = true;
            textIndex++;
            next = HEAP8[((textIndex+1)|0)];
            if (next == 42) {
              precision = getNextArg('i32');
              textIndex++;
            } else {
              while(1) {
                var precisionChr = HEAP8[((textIndex+1)|0)];
                if (precisionChr < 48 ||
                    precisionChr > 57) break;
                precision = precision * 10 + (precisionChr - 48);
                textIndex++;
              }
            }
            next = HEAP8[((textIndex+1)|0)];
          }
          if (precision < 0) {
            precision = 6; // Standard default.
            precisionSet = false;
          }
  
          // Handle integer sizes. WARNING: These assume a 32-bit architecture!
          var argSize;
          switch (String.fromCharCode(next)) {
            case 'h':
              var nextNext = HEAP8[((textIndex+2)|0)];
              if (nextNext == 104) {
                textIndex++;
                argSize = 1; // char (actually i32 in varargs)
              } else {
                argSize = 2; // short (actually i32 in varargs)
              }
              break;
            case 'l':
              var nextNext = HEAP8[((textIndex+2)|0)];
              if (nextNext == 108) {
                textIndex++;
                argSize = 8; // long long
              } else {
                argSize = 4; // long
              }
              break;
            case 'L': // long long
            case 'q': // int64_t
            case 'j': // intmax_t
              argSize = 8;
              break;
            case 'z': // size_t
            case 't': // ptrdiff_t
            case 'I': // signed ptrdiff_t or unsigned size_t
              argSize = 4;
              break;
            default:
              argSize = null;
          }
          if (argSize) textIndex++;
          next = HEAP8[((textIndex+1)|0)];
  
          // Handle type specifier.
          switch (String.fromCharCode(next)) {
            case 'd': case 'i': case 'u': case 'o': case 'x': case 'X': case 'p': {
              // Integer.
              var signed = next == 100 || next == 105;
              argSize = argSize || 4;
              var currArg = getNextArg('i' + (argSize * 8));
              var origArg = currArg;
              var argText;
              // Flatten i64-1 [low, high] into a (slightly rounded) double
              if (argSize == 8) {
                currArg = Runtime.makeBigInt(currArg[0], currArg[1], next == 117);
              }
              // Truncate to requested size.
              if (argSize <= 4) {
                var limit = Math.pow(256, argSize) - 1;
                currArg = (signed ? reSign : unSign)(currArg & limit, argSize * 8);
              }
              // Format the number.
              var currAbsArg = Math.abs(currArg);
              var prefix = '';
              if (next == 100 || next == 105) {
                if (argSize == 8 && i64Math) argText = i64Math.stringify(origArg[0], origArg[1], null); else
                argText = reSign(currArg, 8 * argSize, 1).toString(10);
              } else if (next == 117) {
                if (argSize == 8 && i64Math) argText = i64Math.stringify(origArg[0], origArg[1], true); else
                argText = unSign(currArg, 8 * argSize, 1).toString(10);
                currArg = Math.abs(currArg);
              } else if (next == 111) {
                argText = (flagAlternative ? '0' : '') + currAbsArg.toString(8);
              } else if (next == 120 || next == 88) {
                prefix = (flagAlternative && currArg != 0) ? '0x' : '';
                if (argSize == 8 && i64Math) {
                  if (origArg[1]) {
                    argText = (origArg[1]>>>0).toString(16);
                    var lower = (origArg[0]>>>0).toString(16);
                    while (lower.length < 8) lower = '0' + lower;
                    argText += lower;
                  } else {
                    argText = (origArg[0]>>>0).toString(16);
                  }
                } else
                if (currArg < 0) {
                  // Represent negative numbers in hex as 2's complement.
                  currArg = -currArg;
                  argText = (currAbsArg - 1).toString(16);
                  var buffer = [];
                  for (var i = 0; i < argText.length; i++) {
                    buffer.push((0xF - parseInt(argText[i], 16)).toString(16));
                  }
                  argText = buffer.join('');
                  while (argText.length < argSize * 2) argText = 'f' + argText;
                } else {
                  argText = currAbsArg.toString(16);
                }
                if (next == 88) {
                  prefix = prefix.toUpperCase();
                  argText = argText.toUpperCase();
                }
              } else if (next == 112) {
                if (currAbsArg === 0) {
                  argText = '(nil)';
                } else {
                  prefix = '0x';
                  argText = currAbsArg.toString(16);
                }
              }
              if (precisionSet) {
                while (argText.length < precision) {
                  argText = '0' + argText;
                }
              }
  
              // Add sign if needed
              if (currArg >= 0) {
                if (flagAlwaysSigned) {
                  prefix = '+' + prefix;
                } else if (flagPadSign) {
                  prefix = ' ' + prefix;
                }
              }
  
              // Move sign to prefix so we zero-pad after the sign
              if (argText.charAt(0) == '-') {
                prefix = '-' + prefix;
                argText = argText.substr(1);
              }
  
              // Add padding.
              while (prefix.length + argText.length < width) {
                if (flagLeftAlign) {
                  argText += ' ';
                } else {
                  if (flagZeroPad) {
                    argText = '0' + argText;
                  } else {
                    prefix = ' ' + prefix;
                  }
                }
              }
  
              // Insert the result into the buffer.
              argText = prefix + argText;
              argText.split('').forEach(function(chr) {
                ret.push(chr.charCodeAt(0));
              });
              break;
            }
            case 'f': case 'F': case 'e': case 'E': case 'g': case 'G': {
              // Float.
              var currArg = getNextArg('double');
              var argText;
              if (isNaN(currArg)) {
                argText = 'nan';
                flagZeroPad = false;
              } else if (!isFinite(currArg)) {
                argText = (currArg < 0 ? '-' : '') + 'inf';
                flagZeroPad = false;
              } else {
                var isGeneral = false;
                var effectivePrecision = Math.min(precision, 20);
  
                // Convert g/G to f/F or e/E, as per:
                // http://pubs.opengroup.org/onlinepubs/9699919799/functions/printf.html
                if (next == 103 || next == 71) {
                  isGeneral = true;
                  precision = precision || 1;
                  var exponent = parseInt(currArg.toExponential(effectivePrecision).split('e')[1], 10);
                  if (precision > exponent && exponent >= -4) {
                    next = ((next == 103) ? 'f' : 'F').charCodeAt(0);
                    precision -= exponent + 1;
                  } else {
                    next = ((next == 103) ? 'e' : 'E').charCodeAt(0);
                    precision--;
                  }
                  effectivePrecision = Math.min(precision, 20);
                }
  
                if (next == 101 || next == 69) {
                  argText = currArg.toExponential(effectivePrecision);
                  // Make sure the exponent has at least 2 digits.
                  if (/[eE][-+]\d$/.test(argText)) {
                    argText = argText.slice(0, -1) + '0' + argText.slice(-1);
                  }
                } else if (next == 102 || next == 70) {
                  argText = currArg.toFixed(effectivePrecision);
                  if (currArg === 0 && __reallyNegative(currArg)) {
                    argText = '-' + argText;
                  }
                }
  
                var parts = argText.split('e');
                if (isGeneral && !flagAlternative) {
                  // Discard trailing zeros and periods.
                  while (parts[0].length > 1 && parts[0].indexOf('.') != -1 &&
                         (parts[0].slice(-1) == '0' || parts[0].slice(-1) == '.')) {
                    parts[0] = parts[0].slice(0, -1);
                  }
                } else {
                  // Make sure we have a period in alternative mode.
                  if (flagAlternative && argText.indexOf('.') == -1) parts[0] += '.';
                  // Zero pad until required precision.
                  while (precision > effectivePrecision++) parts[0] += '0';
                }
                argText = parts[0] + (parts.length > 1 ? 'e' + parts[1] : '');
  
                // Capitalize 'E' if needed.
                if (next == 69) argText = argText.toUpperCase();
  
                // Add sign.
                if (currArg >= 0) {
                  if (flagAlwaysSigned) {
                    argText = '+' + argText;
                  } else if (flagPadSign) {
                    argText = ' ' + argText;
                  }
                }
              }
  
              // Add padding.
              while (argText.length < width) {
                if (flagLeftAlign) {
                  argText += ' ';
                } else {
                  if (flagZeroPad && (argText[0] == '-' || argText[0] == '+')) {
                    argText = argText[0] + '0' + argText.slice(1);
                  } else {
                    argText = (flagZeroPad ? '0' : ' ') + argText;
                  }
                }
              }
  
              // Adjust case.
              if (next < 97) argText = argText.toUpperCase();
  
              // Insert the result into the buffer.
              argText.split('').forEach(function(chr) {
                ret.push(chr.charCodeAt(0));
              });
              break;
            }
            case 's': {
              // String.
              var arg = getNextArg('i8*');
              var argLength = arg ? _strlen(arg) : '(null)'.length;
              if (precisionSet) argLength = Math.min(argLength, precision);
              if (!flagLeftAlign) {
                while (argLength < width--) {
                  ret.push(32);
                }
              }
              if (arg) {
                for (var i = 0; i < argLength; i++) {
                  ret.push(HEAPU8[((arg++)|0)]);
                }
              } else {
                ret = ret.concat(intArrayFromString('(null)'.substr(0, argLength), true));
              }
              if (flagLeftAlign) {
                while (argLength < width--) {
                  ret.push(32);
                }
              }
              break;
            }
            case 'c': {
              // Character.
              if (flagLeftAlign) ret.push(getNextArg('i8'));
              while (--width > 0) {
                ret.push(32);
              }
              if (!flagLeftAlign) ret.push(getNextArg('i8'));
              break;
            }
            case 'n': {
              // Write the length written so far to the next parameter.
              var ptr = getNextArg('i32*');
              HEAP32[((ptr)>>2)]=ret.length;
              break;
            }
            case '%': {
              // Literal percent sign.
              ret.push(curr);
              break;
            }
            default: {
              // Unknown specifiers remain untouched.
              for (var i = startTextIndex; i < textIndex + 2; i++) {
                ret.push(HEAP8[(i)]);
              }
            }
          }
          textIndex += 2;
          // TODO: Support a/A (hex float) and m (last error) specifiers.
          // TODO: Support %1${specifier} for arg selection.
        } else {
          ret.push(curr);
          textIndex += 1;
        }
      }
      return ret;
    }
  
  function _malloc(bytes) {
      /* Over-allocate to make sure it is byte-aligned by 8.
       * This will leak memory, but this is only the dummy
       * implementation (replaced by dlmalloc normally) so
       * not an issue.
       */
      var ptr = Runtime.dynamicAlloc(bytes + 8);
      return (ptr+8) & 0xFFFFFFF8;
    }
  Module["_malloc"] = _malloc;function _snprintf(s, n, format, varargs) {
      // int snprintf(char *restrict s, size_t n, const char *restrict format, ...);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/printf.html
      var result = __formatString(format, varargs);
      var limit = (n === undefined) ? result.length
                                    : Math.min(result.length, Math.max(n - 1, 0));
      if (s < 0) {
        s = -s;
        var buf = _malloc(limit+1);
        HEAP32[((s)>>2)]=buf;
        s = buf;
      }
      for (var i = 0; i < limit; i++) {
        HEAP8[(((s)+(i))|0)]=result[i];
      }
      if (limit < n || (n === undefined)) HEAP8[(((s)+(i))|0)]=0;
      return result.length;
    }function _vsnprintf(s, n, format, va_arg) {
      return _snprintf(s, n, format, HEAP32[((va_arg)>>2)]);
    }

  
  function __ZSt18uncaught_exceptionv() { // std::uncaught_exception()
      return !!__ZSt18uncaught_exceptionv.uncaught_exception;
    }
  
  
  
  function ___cxa_is_number_type(type) {
      var isNumber = false;
      try { if (type == __ZTIi) isNumber = true } catch(e){}
      try { if (type == __ZTIj) isNumber = true } catch(e){}
      try { if (type == __ZTIl) isNumber = true } catch(e){}
      try { if (type == __ZTIm) isNumber = true } catch(e){}
      try { if (type == __ZTIx) isNumber = true } catch(e){}
      try { if (type == __ZTIy) isNumber = true } catch(e){}
      try { if (type == __ZTIf) isNumber = true } catch(e){}
      try { if (type == __ZTId) isNumber = true } catch(e){}
      try { if (type == __ZTIe) isNumber = true } catch(e){}
      try { if (type == __ZTIc) isNumber = true } catch(e){}
      try { if (type == __ZTIa) isNumber = true } catch(e){}
      try { if (type == __ZTIh) isNumber = true } catch(e){}
      try { if (type == __ZTIs) isNumber = true } catch(e){}
      try { if (type == __ZTIt) isNumber = true } catch(e){}
      return isNumber;
    }function ___cxa_does_inherit(definiteType, possibilityType, possibility) {
      if (possibility == 0) return false;
      if (possibilityType == 0 || possibilityType == definiteType)
        return true;
      var possibility_type_info;
      if (___cxa_is_number_type(possibilityType)) {
        possibility_type_info = possibilityType;
      } else {
        var possibility_type_infoAddr = HEAP32[((possibilityType)>>2)] - 8;
        possibility_type_info = HEAP32[((possibility_type_infoAddr)>>2)];
      }
      switch (possibility_type_info) {
      case 0: // possibility is a pointer
        // See if definite type is a pointer
        var definite_type_infoAddr = HEAP32[((definiteType)>>2)] - 8;
        var definite_type_info = HEAP32[((definite_type_infoAddr)>>2)];
        if (definite_type_info == 0) {
          // Also a pointer; compare base types of pointers
          var defPointerBaseAddr = definiteType+8;
          var defPointerBaseType = HEAP32[((defPointerBaseAddr)>>2)];
          var possPointerBaseAddr = possibilityType+8;
          var possPointerBaseType = HEAP32[((possPointerBaseAddr)>>2)];
          return ___cxa_does_inherit(defPointerBaseType, possPointerBaseType, possibility);
        } else
          return false; // one pointer and one non-pointer
      case 1: // class with no base class
        return false;
      case 2: // class with base class
        var parentTypeAddr = possibilityType + 8;
        var parentType = HEAP32[((parentTypeAddr)>>2)];
        return ___cxa_does_inherit(definiteType, parentType, possibility);
      default:
        return false; // some unencountered type
      }
    }
  
  
  
  var ___cxa_last_thrown_exception=0;function ___resumeException(ptr) {
      if (!___cxa_last_thrown_exception) { ___cxa_last_thrown_exception = ptr; }
      throw ptr + " - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch.";
    }
  
  var ___cxa_exception_header_size=8;function ___cxa_find_matching_catch(thrown, throwntype) {
      if (thrown == -1) thrown = ___cxa_last_thrown_exception;
      header = thrown - ___cxa_exception_header_size;
      if (throwntype == -1) throwntype = HEAP32[((header)>>2)];
      var typeArray = Array.prototype.slice.call(arguments, 2);
  
      // If throwntype is a pointer, this means a pointer has been
      // thrown. When a pointer is thrown, actually what's thrown
      // is a pointer to the pointer. We'll dereference it.
      if (throwntype != 0 && !___cxa_is_number_type(throwntype)) {
        var throwntypeInfoAddr= HEAP32[((throwntype)>>2)] - 8;
        var throwntypeInfo= HEAP32[((throwntypeInfoAddr)>>2)];
        if (throwntypeInfo == 0)
          thrown = HEAP32[((thrown)>>2)];
      }
      // The different catch blocks are denoted by different types.
      // Due to inheritance, those types may not precisely match the
      // type of the thrown object. Find one which matches, and
      // return the type of the catch block which should be called.
      for (var i = 0; i < typeArray.length; i++) {
        if (___cxa_does_inherit(typeArray[i], throwntype, thrown))
          return ((asm["setTempRet0"](typeArray[i]),thrown)|0);
      }
      // Shouldn't happen unless we have bogus data in typeArray
      // or encounter a type for which emscripten doesn't have suitable
      // typeinfo defined. Best-efforts match just in case.
      return ((asm["setTempRet0"](throwntype),thrown)|0);
    }function ___cxa_throw(ptr, type, destructor) {
      if (!___cxa_throw.initialized) {
        try {
          HEAP32[((__ZTVN10__cxxabiv119__pointer_type_infoE)>>2)]=0; // Workaround for libcxxabi integration bug
        } catch(e){}
        try {
          HEAP32[((__ZTVN10__cxxabiv117__class_type_infoE)>>2)]=1; // Workaround for libcxxabi integration bug
        } catch(e){}
        try {
          HEAP32[((__ZTVN10__cxxabiv120__si_class_type_infoE)>>2)]=2; // Workaround for libcxxabi integration bug
        } catch(e){}
        ___cxa_throw.initialized = true;
      }
      var header = ptr - ___cxa_exception_header_size;
      HEAP32[((header)>>2)]=type;
      HEAP32[(((header)+(4))>>2)]=destructor;
      ___cxa_last_thrown_exception = ptr;
      if (!("uncaught_exception" in __ZSt18uncaught_exceptionv)) {
        __ZSt18uncaught_exceptionv.uncaught_exception = 1;
      } else {
        __ZSt18uncaught_exceptionv.uncaught_exception++;
      }
      throw ptr + " - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch.";
    }

  function _pthread_mutex_lock() {}

  
  
  var ERRNO_CODES={EPERM:1,ENOENT:2,ESRCH:3,EINTR:4,EIO:5,ENXIO:6,E2BIG:7,ENOEXEC:8,EBADF:9,ECHILD:10,EAGAIN:11,EWOULDBLOCK:11,ENOMEM:12,EACCES:13,EFAULT:14,ENOTBLK:15,EBUSY:16,EEXIST:17,EXDEV:18,ENODEV:19,ENOTDIR:20,EISDIR:21,EINVAL:22,ENFILE:23,EMFILE:24,ENOTTY:25,ETXTBSY:26,EFBIG:27,ENOSPC:28,ESPIPE:29,EROFS:30,EMLINK:31,EPIPE:32,EDOM:33,ERANGE:34,ENOMSG:42,EIDRM:43,ECHRNG:44,EL2NSYNC:45,EL3HLT:46,EL3RST:47,ELNRNG:48,EUNATCH:49,ENOCSI:50,EL2HLT:51,EDEADLK:35,ENOLCK:37,EBADE:52,EBADR:53,EXFULL:54,ENOANO:55,EBADRQC:56,EBADSLT:57,EDEADLOCK:35,EBFONT:59,ENOSTR:60,ENODATA:61,ETIME:62,ENOSR:63,ENONET:64,ENOPKG:65,EREMOTE:66,ENOLINK:67,EADV:68,ESRMNT:69,ECOMM:70,EPROTO:71,EMULTIHOP:72,EDOTDOT:73,EBADMSG:74,ENOTUNIQ:76,EBADFD:77,EREMCHG:78,ELIBACC:79,ELIBBAD:80,ELIBSCN:81,ELIBMAX:82,ELIBEXEC:83,ENOSYS:38,ENOTEMPTY:39,ENAMETOOLONG:36,ELOOP:40,EOPNOTSUPP:95,EPFNOSUPPORT:96,ECONNRESET:104,ENOBUFS:105,EAFNOSUPPORT:97,EPROTOTYPE:91,ENOTSOCK:88,ENOPROTOOPT:92,ESHUTDOWN:108,ECONNREFUSED:111,EADDRINUSE:98,ECONNABORTED:103,ENETUNREACH:101,ENETDOWN:100,ETIMEDOUT:110,EHOSTDOWN:112,EHOSTUNREACH:113,EINPROGRESS:115,EALREADY:114,EDESTADDRREQ:89,EMSGSIZE:90,EPROTONOSUPPORT:93,ESOCKTNOSUPPORT:94,EADDRNOTAVAIL:99,ENETRESET:102,EISCONN:106,ENOTCONN:107,ETOOMANYREFS:109,EUSERS:87,EDQUOT:122,ESTALE:116,ENOTSUP:95,ENOMEDIUM:123,EILSEQ:84,EOVERFLOW:75,ECANCELED:125,ENOTRECOVERABLE:131,EOWNERDEAD:130,ESTRPIPE:86};
  
  var ERRNO_MESSAGES={0:"Success",1:"Not super-user",2:"No such file or directory",3:"No such process",4:"Interrupted system call",5:"I/O error",6:"No such device or address",7:"Arg list too long",8:"Exec format error",9:"Bad file number",10:"No children",11:"No more processes",12:"Not enough core",13:"Permission denied",14:"Bad address",15:"Block device required",16:"Mount device busy",17:"File exists",18:"Cross-device link",19:"No such device",20:"Not a directory",21:"Is a directory",22:"Invalid argument",23:"Too many open files in system",24:"Too many open files",25:"Not a typewriter",26:"Text file busy",27:"File too large",28:"No space left on device",29:"Illegal seek",30:"Read only file system",31:"Too many links",32:"Broken pipe",33:"Math arg out of domain of func",34:"Math result not representable",35:"File locking deadlock error",36:"File or path name too long",37:"No record locks available",38:"Function not implemented",39:"Directory not empty",40:"Too many symbolic links",42:"No message of desired type",43:"Identifier removed",44:"Channel number out of range",45:"Level 2 not synchronized",46:"Level 3 halted",47:"Level 3 reset",48:"Link number out of range",49:"Protocol driver not attached",50:"No CSI structure available",51:"Level 2 halted",52:"Invalid exchange",53:"Invalid request descriptor",54:"Exchange full",55:"No anode",56:"Invalid request code",57:"Invalid slot",59:"Bad font file fmt",60:"Device not a stream",61:"No data (for no delay io)",62:"Timer expired",63:"Out of streams resources",64:"Machine is not on the network",65:"Package not installed",66:"The object is remote",67:"The link has been severed",68:"Advertise error",69:"Srmount error",70:"Communication error on send",71:"Protocol error",72:"Multihop attempted",73:"Cross mount point (not really error)",74:"Trying to read unreadable message",75:"Value too large for defined data type",76:"Given log. name not unique",77:"f.d. invalid for this operation",78:"Remote address changed",79:"Can   access a needed shared lib",80:"Accessing a corrupted shared lib",81:".lib section in a.out corrupted",82:"Attempting to link in too many libs",83:"Attempting to exec a shared library",84:"Illegal byte sequence",86:"Streams pipe error",87:"Too many users",88:"Socket operation on non-socket",89:"Destination address required",90:"Message too long",91:"Protocol wrong type for socket",92:"Protocol not available",93:"Unknown protocol",94:"Socket type not supported",95:"Not supported",96:"Protocol family not supported",97:"Address family not supported by protocol family",98:"Address already in use",99:"Address not available",100:"Network interface is not configured",101:"Network is unreachable",102:"Connection reset by network",103:"Connection aborted",104:"Connection reset by peer",105:"No buffer space available",106:"Socket is already connected",107:"Socket is not connected",108:"Can't send after socket shutdown",109:"Too many references",110:"Connection timed out",111:"Connection refused",112:"Host is down",113:"Host is unreachable",114:"Socket already connected",115:"Connection already in progress",116:"Stale file handle",122:"Quota exceeded",123:"No medium (in tape drive)",125:"Operation canceled",130:"Previous owner died",131:"State not recoverable"};
  
  
  var ___errno_state=0;function ___setErrNo(value) {
      // For convenient setting and returning of errno.
      HEAP32[((___errno_state)>>2)]=value;
      return value;
    }
  
  var PATH={splitPath:function (filename) {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },normalizeArray:function (parts, allowAboveRoot) {
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === '.') {
            parts.splice(i, 1);
          } else if (last === '..') {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        // if the path is allowed to go above the root, restore leading ..s
        if (allowAboveRoot) {
          for (; up--; up) {
            parts.unshift('..');
          }
        }
        return parts;
      },normalize:function (path) {
        var isAbsolute = path.charAt(0) === '/',
            trailingSlash = path.substr(-1) === '/';
        // Normalize the path
        path = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), !isAbsolute).join('/');
        if (!path && !isAbsolute) {
          path = '.';
        }
        if (path && trailingSlash) {
          path += '/';
        }
        return (isAbsolute ? '/' : '') + path;
      },dirname:function (path) {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
          // No dirname whatsoever
          return '.';
        }
        if (dir) {
          // It has a dirname, strip trailing slash
          dir = dir.substr(0, dir.length - 1);
        }
        return root + dir;
      },basename:function (path) {
        // EMSCRIPTEN return '/'' for '/', not an empty string
        if (path === '/') return '/';
        var lastSlash = path.lastIndexOf('/');
        if (lastSlash === -1) return path;
        return path.substr(lastSlash+1);
      },extname:function (path) {
        return PATH.splitPath(path)[3];
      },join:function () {
        var paths = Array.prototype.slice.call(arguments, 0);
        return PATH.normalize(paths.join('/'));
      },join2:function (l, r) {
        return PATH.normalize(l + '/' + r);
      },resolve:function () {
        var resolvedPath = '',
          resolvedAbsolute = false;
        for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
          var path = (i >= 0) ? arguments[i] : FS.cwd();
          // Skip empty and invalid entries
          if (typeof path !== 'string') {
            throw new TypeError('Arguments to path.resolve must be strings');
          } else if (!path) {
            continue;
          }
          resolvedPath = path + '/' + resolvedPath;
          resolvedAbsolute = path.charAt(0) === '/';
        }
        // At this point the path should be resolved to a full absolute path, but
        // handle relative paths to be safe (might happen when process.cwd() fails)
        resolvedPath = PATH.normalizeArray(resolvedPath.split('/').filter(function(p) {
          return !!p;
        }), !resolvedAbsolute).join('/');
        return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
      },relative:function (from, to) {
        from = PATH.resolve(from).substr(1);
        to = PATH.resolve(to).substr(1);
        function trim(arr) {
          var start = 0;
          for (; start < arr.length; start++) {
            if (arr[start] !== '') break;
          }
          var end = arr.length - 1;
          for (; end >= 0; end--) {
            if (arr[end] !== '') break;
          }
          if (start > end) return [];
          return arr.slice(start, end - start + 1);
        }
        var fromParts = trim(from.split('/'));
        var toParts = trim(to.split('/'));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) {
          if (fromParts[i] !== toParts[i]) {
            samePartsLength = i;
            break;
          }
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) {
          outputParts.push('..');
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join('/');
      }};
  
  var TTY={ttys:[],init:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // currently, FS.init does not distinguish if process.stdin is a file or TTY
        //   // device, it always assumes it's a TTY device. because of this, we're forcing
        //   // process.stdin to UTF8 encoding to at least make stdin reading compatible
        //   // with text files until FS.init can be refactored.
        //   process['stdin']['setEncoding']('utf8');
        // }
      },shutdown:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // inolen: any idea as to why node -e 'process.stdin.read()' wouldn't exit immediately (with process.stdin being a tty)?
        //   // isaacs: because now it's reading from the stream, you've expressed interest in it, so that read() kicks off a _read() which creates a ReadReq operation
        //   // inolen: I thought read() in that case was a synchronous operation that just grabbed some amount of buffered data if it exists?
        //   // isaacs: it is. but it also triggers a _read() call, which calls readStart() on the handle
        //   // isaacs: do process.stdin.pause() and i'd think it'd probably close the pending call
        //   process['stdin']['pause']();
        // }
      },register:function (dev, ops) {
        TTY.ttys[dev] = { input: [], output: [], ops: ops };
        FS.registerDevice(dev, TTY.stream_ops);
      },stream_ops:{open:function (stream) {
          var tty = TTY.ttys[stream.node.rdev];
          if (!tty) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          stream.tty = tty;
          stream.seekable = false;
        },close:function (stream) {
          // flush any pending line data
          if (stream.tty.output.length) {
            stream.tty.ops.put_char(stream.tty, 10);
          }
        },read:function (stream, buffer, offset, length, pos /* ignored */) {
          if (!stream.tty || !stream.tty.ops.get_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = stream.tty.ops.get_char(stream.tty);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            if (result === undefined && bytesRead === 0) {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
            if (result === null || result === undefined) break;
            bytesRead++;
            buffer[offset+i] = result;
          }
          if (bytesRead) {
            stream.node.timestamp = Date.now();
          }
          return bytesRead;
        },write:function (stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.put_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          for (var i = 0; i < length; i++) {
            try {
              stream.tty.ops.put_char(stream.tty, buffer[offset+i]);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
          }
          if (length) {
            stream.node.timestamp = Date.now();
          }
          return i;
        }},default_tty_ops:{get_char:function (tty) {
          if (!tty.input.length) {
            var result = null;
            if (ENVIRONMENT_IS_NODE) {
              result = process['stdin']['read']();
              if (!result) {
                if (process['stdin']['_readableState'] && process['stdin']['_readableState']['ended']) {
                  return null;  // EOF
                }
                return undefined;  // no data available
              }
            } else if (typeof window != 'undefined' &&
              typeof window.prompt == 'function') {
              // Browser.
              result = window.prompt('Input: ');  // returns null on cancel
              if (result !== null) {
                result += '\n';
              }
            } else if (typeof readline == 'function') {
              // Command line.
              result = readline();
              if (result !== null) {
                result += '\n';
              }
            }
            if (!result) {
              return null;
            }
            tty.input = intArrayFromString(result, true);
          }
          return tty.input.shift();
        },put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['print'](tty.output.join(''));
            tty.output = [];
          } else {
            tty.output.push(TTY.utf8.processCChar(val));
          }
        }},default_tty1_ops:{put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['printErr'](tty.output.join(''));
            tty.output = [];
          } else {
            tty.output.push(TTY.utf8.processCChar(val));
          }
        }}};
  
  var MEMFS={ops_table:null,CONTENT_OWNING:1,CONTENT_FLEXIBLE:2,CONTENT_FIXED:3,mount:function (mount) {
        return MEMFS.createNode(null, '/', 16384 | 511 /* 0777 */, 0);
      },createNode:function (parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
          // no supported
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (!MEMFS.ops_table) {
          MEMFS.ops_table = {
            dir: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                lookup: MEMFS.node_ops.lookup,
                mknod: MEMFS.node_ops.mknod,
                rename: MEMFS.node_ops.rename,
                unlink: MEMFS.node_ops.unlink,
                rmdir: MEMFS.node_ops.rmdir,
                readdir: MEMFS.node_ops.readdir,
                symlink: MEMFS.node_ops.symlink
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek
              }
            },
            file: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek,
                read: MEMFS.stream_ops.read,
                write: MEMFS.stream_ops.write,
                allocate: MEMFS.stream_ops.allocate,
                mmap: MEMFS.stream_ops.mmap
              }
            },
            link: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                readlink: MEMFS.node_ops.readlink
              },
              stream: {}
            },
            chrdev: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: FS.chrdev_stream_ops
            },
          };
        }
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
          node.node_ops = MEMFS.ops_table.dir.node;
          node.stream_ops = MEMFS.ops_table.dir.stream;
          node.contents = {};
        } else if (FS.isFile(node.mode)) {
          node.node_ops = MEMFS.ops_table.file.node;
          node.stream_ops = MEMFS.ops_table.file.stream;
          node.contents = [];
          node.contentMode = MEMFS.CONTENT_FLEXIBLE;
        } else if (FS.isLink(node.mode)) {
          node.node_ops = MEMFS.ops_table.link.node;
          node.stream_ops = MEMFS.ops_table.link.stream;
        } else if (FS.isChrdev(node.mode)) {
          node.node_ops = MEMFS.ops_table.chrdev.node;
          node.stream_ops = MEMFS.ops_table.chrdev.stream;
        }
        node.timestamp = Date.now();
        // add the new node to the parent
        if (parent) {
          parent.contents[name] = node;
        }
        return node;
      },ensureFlexible:function (node) {
        if (node.contentMode !== MEMFS.CONTENT_FLEXIBLE) {
          var contents = node.contents;
          node.contents = Array.prototype.slice.call(contents);
          node.contentMode = MEMFS.CONTENT_FLEXIBLE;
        }
      },node_ops:{getattr:function (node) {
          var attr = {};
          // device numbers reuse inode numbers.
          attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
          attr.ino = node.id;
          attr.mode = node.mode;
          attr.nlink = 1;
          attr.uid = 0;
          attr.gid = 0;
          attr.rdev = node.rdev;
          if (FS.isDir(node.mode)) {
            attr.size = 4096;
          } else if (FS.isFile(node.mode)) {
            attr.size = node.contents.length;
          } else if (FS.isLink(node.mode)) {
            attr.size = node.link.length;
          } else {
            attr.size = 0;
          }
          attr.atime = new Date(node.timestamp);
          attr.mtime = new Date(node.timestamp);
          attr.ctime = new Date(node.timestamp);
          // NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),
          //       but this is not required by the standard.
          attr.blksize = 4096;
          attr.blocks = Math.ceil(attr.size / attr.blksize);
          return attr;
        },setattr:function (node, attr) {
          if (attr.mode !== undefined) {
            node.mode = attr.mode;
          }
          if (attr.timestamp !== undefined) {
            node.timestamp = attr.timestamp;
          }
          if (attr.size !== undefined) {
            MEMFS.ensureFlexible(node);
            var contents = node.contents;
            if (attr.size < contents.length) contents.length = attr.size;
            else while (attr.size > contents.length) contents.push(0);
          }
        },lookup:function (parent, name) {
          throw FS.genericErrors[ERRNO_CODES.ENOENT];
        },mknod:function (parent, name, mode, dev) {
          return MEMFS.createNode(parent, name, mode, dev);
        },rename:function (old_node, new_dir, new_name) {
          // if we're overwriting a directory at new_name, make sure it's empty.
          if (FS.isDir(old_node.mode)) {
            var new_node;
            try {
              new_node = FS.lookupNode(new_dir, new_name);
            } catch (e) {
            }
            if (new_node) {
              for (var i in new_node.contents) {
                throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
              }
            }
          }
          // do the internal rewiring
          delete old_node.parent.contents[old_node.name];
          old_node.name = new_name;
          new_dir.contents[new_name] = old_node;
          old_node.parent = new_dir;
        },unlink:function (parent, name) {
          delete parent.contents[name];
        },rmdir:function (parent, name) {
          var node = FS.lookupNode(parent, name);
          for (var i in node.contents) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
          }
          delete parent.contents[name];
        },readdir:function (node) {
          var entries = ['.', '..']
          for (var key in node.contents) {
            if (!node.contents.hasOwnProperty(key)) {
              continue;
            }
            entries.push(key);
          }
          return entries;
        },symlink:function (parent, newname, oldpath) {
          var node = MEMFS.createNode(parent, newname, 511 /* 0777 */ | 40960, 0);
          node.link = oldpath;
          return node;
        },readlink:function (node) {
          if (!FS.isLink(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return node.link;
        }},stream_ops:{read:function (stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (size > 8 && contents.subarray) { // non-trivial, and typed array
            buffer.set(contents.subarray(position, position + size), offset);
          } else
          {
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          }
          return size;
        },write:function (stream, buffer, offset, length, position, canOwn) {
          var node = stream.node;
          node.timestamp = Date.now();
          var contents = node.contents;
          if (length && contents.length === 0 && position === 0 && buffer.subarray) {
            // just replace it with the new data
            if (canOwn && offset === 0) {
              node.contents = buffer; // this could be a subarray of Emscripten HEAP, or allocated from some other source.
              node.contentMode = (buffer.buffer === HEAP8.buffer) ? MEMFS.CONTENT_OWNING : MEMFS.CONTENT_FIXED;
            } else {
              node.contents = new Uint8Array(buffer.subarray(offset, offset+length));
              node.contentMode = MEMFS.CONTENT_FIXED;
            }
            return length;
          }
          MEMFS.ensureFlexible(node);
          var contents = node.contents;
          while (contents.length < position) contents.push(0);
          for (var i = 0; i < length; i++) {
            contents[position + i] = buffer[offset + i];
          }
          return length;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.contents.length;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          stream.ungotten = [];
          stream.position = position;
          return position;
        },allocate:function (stream, offset, length) {
          MEMFS.ensureFlexible(stream.node);
          var contents = stream.node.contents;
          var limit = offset + length;
          while (limit > contents.length) contents.push(0);
        },mmap:function (stream, buffer, offset, length, position, prot, flags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          var ptr;
          var allocated;
          var contents = stream.node.contents;
          // Only make a new copy when MAP_PRIVATE is specified.
          if ( !(flags & 2) &&
                (contents.buffer === buffer || contents.buffer === buffer.buffer) ) {
            // We can't emulate MAP_SHARED when the file is not backed by the buffer
            // we're mapping to (e.g. the HEAP buffer).
            allocated = false;
            ptr = contents.byteOffset;
          } else {
            // Try to avoid unnecessary slices.
            if (position > 0 || position + length < contents.length) {
              if (contents.subarray) {
                contents = contents.subarray(position, position + length);
              } else {
                contents = Array.prototype.slice.call(contents, position, position + length);
              }
            }
            allocated = true;
            ptr = _malloc(length);
            if (!ptr) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOMEM);
            }
            buffer.set(contents, ptr);
          }
          return { ptr: ptr, allocated: allocated };
        }}};
  
  var IDBFS={dbs:{},indexedDB:function () {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
      },DB_VERSION:21,DB_STORE_NAME:"FILE_DATA",mount:function (mount) {
        // reuse all of the core MEMFS functionality
        return MEMFS.mount.apply(null, arguments);
      },syncfs:function (mount, populate, callback) {
        IDBFS.getLocalSet(mount, function(err, local) {
          if (err) return callback(err);
  
          IDBFS.getRemoteSet(mount, function(err, remote) {
            if (err) return callback(err);
  
            var src = populate ? remote : local;
            var dst = populate ? local : remote;
  
            IDBFS.reconcile(src, dst, callback);
          });
        });
      },getDB:function (name, callback) {
        // check the cache first
        var db = IDBFS.dbs[name];
        if (db) {
          return callback(null, db);
        }
  
        var req;
        try {
          req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION);
        } catch (e) {
          return callback(e);
        }
        req.onupgradeneeded = function(e) {
          var db = e.target.result;
          var transaction = e.target.transaction;
  
          var fileStore;
  
          if (db.objectStoreNames.contains(IDBFS.DB_STORE_NAME)) {
            fileStore = transaction.objectStore(IDBFS.DB_STORE_NAME);
          } else {
            fileStore = db.createObjectStore(IDBFS.DB_STORE_NAME);
          }
  
          fileStore.createIndex('timestamp', 'timestamp', { unique: false });
        };
        req.onsuccess = function() {
          db = req.result;
  
          // add to the cache
          IDBFS.dbs[name] = db;
          callback(null, db);
        };
        req.onerror = function() {
          callback(this.error);
        };
      },getLocalSet:function (mount, callback) {
        var entries = {};
  
        function isRealDir(p) {
          return p !== '.' && p !== '..';
        };
        function toAbsolute(root) {
          return function(p) {
            return PATH.join2(root, p);
          }
        };
  
        var check = FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));
  
        while (check.length) {
          var path = check.pop();
          var stat;
  
          try {
            stat = FS.stat(path);
          } catch (e) {
            return callback(e);
          }
  
          if (FS.isDir(stat.mode)) {
            check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)));
          }
  
          entries[path] = { timestamp: stat.mtime };
        }
  
        return callback(null, { type: 'local', entries: entries });
      },getRemoteSet:function (mount, callback) {
        var entries = {};
  
        IDBFS.getDB(mount.mountpoint, function(err, db) {
          if (err) return callback(err);
  
          var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readonly');
          transaction.onerror = function() { callback(this.error); };
  
          var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
          var index = store.index('timestamp');
  
          index.openKeyCursor().onsuccess = function(event) {
            var cursor = event.target.result;
  
            if (!cursor) {
              return callback(null, { type: 'remote', db: db, entries: entries });
            }
  
            entries[cursor.primaryKey] = { timestamp: cursor.key };
  
            cursor.continue();
          };
        });
      },loadLocalEntry:function (path, callback) {
        var stat, node;
  
        try {
          var lookup = FS.lookupPath(path);
          node = lookup.node;
          stat = FS.stat(path);
        } catch (e) {
          return callback(e);
        }
  
        if (FS.isDir(stat.mode)) {
          return callback(null, { timestamp: stat.mtime, mode: stat.mode });
        } else if (FS.isFile(stat.mode)) {
          return callback(null, { timestamp: stat.mtime, mode: stat.mode, contents: node.contents });
        } else {
          return callback(new Error('node type not supported'));
        }
      },storeLocalEntry:function (path, entry, callback) {
        try {
          if (FS.isDir(entry.mode)) {
            FS.mkdir(path, entry.mode);
          } else if (FS.isFile(entry.mode)) {
            FS.writeFile(path, entry.contents, { encoding: 'binary', canOwn: true });
          } else {
            return callback(new Error('node type not supported'));
          }
  
          FS.utime(path, entry.timestamp, entry.timestamp);
        } catch (e) {
          return callback(e);
        }
  
        callback(null);
      },removeLocalEntry:function (path, callback) {
        try {
          var lookup = FS.lookupPath(path);
          var stat = FS.stat(path);
  
          if (FS.isDir(stat.mode)) {
            FS.rmdir(path);
          } else if (FS.isFile(stat.mode)) {
            FS.unlink(path);
          }
        } catch (e) {
          return callback(e);
        }
  
        callback(null);
      },loadRemoteEntry:function (store, path, callback) {
        var req = store.get(path);
        req.onsuccess = function(event) { callback(null, event.target.result); };
        req.onerror = function() { callback(this.error); };
      },storeRemoteEntry:function (store, path, entry, callback) {
        var req = store.put(entry, path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function() { callback(this.error); };
      },removeRemoteEntry:function (store, path, callback) {
        var req = store.delete(path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function() { callback(this.error); };
      },reconcile:function (src, dst, callback) {
        var total = 0;
  
        var create = [];
        Object.keys(src.entries).forEach(function (key) {
          var e = src.entries[key];
          var e2 = dst.entries[key];
          if (!e2 || e.timestamp > e2.timestamp) {
            create.push(key);
            total++;
          }
        });
  
        var remove = [];
        Object.keys(dst.entries).forEach(function (key) {
          var e = dst.entries[key];
          var e2 = src.entries[key];
          if (!e2) {
            remove.push(key);
            total++;
          }
        });
  
        if (!total) {
          return callback(null);
        }
  
        var errored = false;
        var completed = 0;
        var db = src.type === 'remote' ? src.db : dst.db;
        var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readwrite');
        var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
  
        function done(err) {
          if (err) {
            if (!done.errored) {
              done.errored = true;
              return callback(err);
            }
            return;
          }
          if (++completed >= total) {
            return callback(null);
          }
        };
  
        transaction.onerror = function() { done(this.error); };
  
        // sort paths in ascending order so directory entries are created
        // before the files inside them
        create.sort().forEach(function (path) {
          if (dst.type === 'local') {
            IDBFS.loadRemoteEntry(store, path, function (err, entry) {
              if (err) return done(err);
              IDBFS.storeLocalEntry(path, entry, done);
            });
          } else {
            IDBFS.loadLocalEntry(path, function (err, entry) {
              if (err) return done(err);
              IDBFS.storeRemoteEntry(store, path, entry, done);
            });
          }
        });
  
        // sort paths in descending order so files are deleted before their
        // parent directories
        remove.sort().reverse().forEach(function(path) {
          if (dst.type === 'local') {
            IDBFS.removeLocalEntry(path, done);
          } else {
            IDBFS.removeRemoteEntry(store, path, done);
          }
        });
      }};
  
  var NODEFS={isWindows:false,staticInit:function () {
        NODEFS.isWindows = !!process.platform.match(/^win/);
      },mount:function (mount) {
        assert(ENVIRONMENT_IS_NODE);
        return NODEFS.createNode(null, '/', NODEFS.getMode(mount.opts.root), 0);
      },createNode:function (parent, name, mode, dev) {
        if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node = FS.createNode(parent, name, mode);
        node.node_ops = NODEFS.node_ops;
        node.stream_ops = NODEFS.stream_ops;
        return node;
      },getMode:function (path) {
        var stat;
        try {
          stat = fs.lstatSync(path);
          if (NODEFS.isWindows) {
            // On Windows, directories return permission bits 'rw-rw-rw-', even though they have 'rwxrwxrwx', so 
            // propagate write bits to execute bits.
            stat.mode = stat.mode | ((stat.mode & 146) >> 1);
          }
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code]);
        }
        return stat.mode;
      },realPath:function (node) {
        var parts = [];
        while (node.parent !== node) {
          parts.push(node.name);
          node = node.parent;
        }
        parts.push(node.mount.opts.root);
        parts.reverse();
        return PATH.join.apply(null, parts);
      },flagsToPermissionStringMap:{0:"r",1:"r+",2:"r+",64:"r",65:"r+",66:"r+",129:"rx+",193:"rx+",514:"w+",577:"w",578:"w+",705:"wx",706:"wx+",1024:"a",1025:"a",1026:"a+",1089:"a",1090:"a+",1153:"ax",1154:"ax+",1217:"ax",1218:"ax+",4096:"rs",4098:"rs+"},flagsToPermissionString:function (flags) {
        if (flags in NODEFS.flagsToPermissionStringMap) {
          return NODEFS.flagsToPermissionStringMap[flags];
        } else {
          return flags;
        }
      },node_ops:{getattr:function (node) {
          var path = NODEFS.realPath(node);
          var stat;
          try {
            stat = fs.lstatSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          // node.js v0.10.20 doesn't report blksize and blocks on Windows. Fake them with default blksize of 4096.
          // See http://support.microsoft.com/kb/140365
          if (NODEFS.isWindows && !stat.blksize) {
            stat.blksize = 4096;
          }
          if (NODEFS.isWindows && !stat.blocks) {
            stat.blocks = (stat.size+stat.blksize-1)/stat.blksize|0;
          }
          return {
            dev: stat.dev,
            ino: stat.ino,
            mode: stat.mode,
            nlink: stat.nlink,
            uid: stat.uid,
            gid: stat.gid,
            rdev: stat.rdev,
            size: stat.size,
            atime: stat.atime,
            mtime: stat.mtime,
            ctime: stat.ctime,
            blksize: stat.blksize,
            blocks: stat.blocks
          };
        },setattr:function (node, attr) {
          var path = NODEFS.realPath(node);
          try {
            if (attr.mode !== undefined) {
              fs.chmodSync(path, attr.mode);
              // update the common node structure mode as well
              node.mode = attr.mode;
            }
            if (attr.timestamp !== undefined) {
              var date = new Date(attr.timestamp);
              fs.utimesSync(path, date, date);
            }
            if (attr.size !== undefined) {
              fs.truncateSync(path, attr.size);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },lookup:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          var mode = NODEFS.getMode(path);
          return NODEFS.createNode(parent, name, mode);
        },mknod:function (parent, name, mode, dev) {
          var node = NODEFS.createNode(parent, name, mode, dev);
          // create the backing node for this in the fs root as well
          var path = NODEFS.realPath(node);
          try {
            if (FS.isDir(node.mode)) {
              fs.mkdirSync(path, node.mode);
            } else {
              fs.writeFileSync(path, '', { mode: node.mode });
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return node;
        },rename:function (oldNode, newDir, newName) {
          var oldPath = NODEFS.realPath(oldNode);
          var newPath = PATH.join2(NODEFS.realPath(newDir), newName);
          try {
            fs.renameSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },unlink:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.unlinkSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },rmdir:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.rmdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readdir:function (node) {
          var path = NODEFS.realPath(node);
          try {
            return fs.readdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },symlink:function (parent, newName, oldPath) {
          var newPath = PATH.join2(NODEFS.realPath(parent), newName);
          try {
            fs.symlinkSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readlink:function (node) {
          var path = NODEFS.realPath(node);
          try {
            return fs.readlinkSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        }},stream_ops:{open:function (stream) {
          var path = NODEFS.realPath(stream.node);
          try {
            if (FS.isFile(stream.node.mode)) {
              stream.nfd = fs.openSync(path, NODEFS.flagsToPermissionString(stream.flags));
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },close:function (stream) {
          try {
            if (FS.isFile(stream.node.mode) && stream.nfd) {
              fs.closeSync(stream.nfd);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },read:function (stream, buffer, offset, length, position) {
          // FIXME this is terrible.
          var nbuffer = new Buffer(length);
          var res;
          try {
            res = fs.readSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          if (res > 0) {
            for (var i = 0; i < res; i++) {
              buffer[offset + i] = nbuffer[i];
            }
          }
          return res;
        },write:function (stream, buffer, offset, length, position) {
          // FIXME this is terrible.
          var nbuffer = new Buffer(buffer.subarray(offset, offset + length));
          var res;
          try {
            res = fs.writeSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return res;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              try {
                var stat = fs.fstatSync(stream.nfd);
                position += stat.size;
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES[e.code]);
              }
            }
          }
  
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
  
          stream.position = position;
          return position;
        }}};
  
  var _stdin=allocate(1, "i32*", ALLOC_STATIC);
  
  var _stdout=allocate(1, "i32*", ALLOC_STATIC);
  
  var _stderr=allocate(1, "i32*", ALLOC_STATIC);var FS={root:null,mounts:[],devices:[null],streams:[],nextInode:1,nameTable:null,currentPath:"/",initialized:false,ignorePermissions:true,ErrnoError:null,genericErrors:{},handleFSError:function (e) {
        if (!(e instanceof FS.ErrnoError)) throw e + ' : ' + stackTrace();
        return ___setErrNo(e.errno);
      },lookupPath:function (path, opts) {
        path = PATH.resolve(FS.cwd(), path);
        opts = opts || {};
  
        var defaults = {
          follow_mount: true,
          recurse_count: 0
        };
        for (var key in defaults) {
          if (opts[key] === undefined) {
            opts[key] = defaults[key];
          }
        }
  
        if (opts.recurse_count > 8) {  // max recursive lookup of 8
          throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
        }
  
        // split the path
        var parts = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), false);
  
        // start at the root
        var current = FS.root;
        var current_path = '/';
  
        for (var i = 0; i < parts.length; i++) {
          var islast = (i === parts.length-1);
          if (islast && opts.parent) {
            // stop resolving
            break;
          }
  
          current = FS.lookupNode(current, parts[i]);
          current_path = PATH.join2(current_path, parts[i]);
  
          // jump to the mount's root node if this is a mountpoint
          if (FS.isMountpoint(current)) {
            if (!islast || (islast && opts.follow_mount)) {
              current = current.mounted.root;
            }
          }
  
          // by default, lookupPath will not follow a symlink if it is the final path component.
          // setting opts.follow = true will override this behavior.
          if (!islast || opts.follow) {
            var count = 0;
            while (FS.isLink(current.mode)) {
              var link = FS.readlink(current_path);
              current_path = PATH.resolve(PATH.dirname(current_path), link);
              
              var lookup = FS.lookupPath(current_path, { recurse_count: opts.recurse_count });
              current = lookup.node;
  
              if (count++ > 40) {  // limit max consecutive symlinks to 40 (SYMLOOP_MAX).
                throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
              }
            }
          }
        }
  
        return { path: current_path, node: current };
      },getPath:function (node) {
        var path;
        while (true) {
          if (FS.isRoot(node)) {
            var mount = node.mount.mountpoint;
            if (!path) return mount;
            return mount[mount.length-1] !== '/' ? mount + '/' + path : mount + path;
          }
          path = path ? node.name + '/' + path : node.name;
          node = node.parent;
        }
      },hashName:function (parentid, name) {
        var hash = 0;
  
  
        for (var i = 0; i < name.length; i++) {
          hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
        }
        return ((parentid + hash) >>> 0) % FS.nameTable.length;
      },hashAddNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node;
      },hashRemoveNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
          FS.nameTable[hash] = node.name_next;
        } else {
          var current = FS.nameTable[hash];
          while (current) {
            if (current.name_next === node) {
              current.name_next = node.name_next;
              break;
            }
            current = current.name_next;
          }
        }
      },lookupNode:function (parent, name) {
        var err = FS.mayLookup(parent);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
          var nodeName = node.name;
          if (node.parent.id === parent.id && nodeName === name) {
            return node;
          }
        }
        // if we failed to find it in the cache, call into the VFS
        return FS.lookup(parent, name);
      },createNode:function (parent, name, mode, rdev) {
        if (!FS.FSNode) {
          FS.FSNode = function(parent, name, mode, rdev) {
            if (!parent) {
              parent = this;  // root node sets parent to itself
            }
            this.parent = parent;
            this.mount = parent.mount;
            this.mounted = null;
            this.id = FS.nextInode++;
            this.name = name;
            this.mode = mode;
            this.node_ops = {};
            this.stream_ops = {};
            this.rdev = rdev;
          };
  
          FS.FSNode.prototype = {};
  
          // compatibility
          var readMode = 292 | 73;
          var writeMode = 146;
  
          // NOTE we must use Object.defineProperties instead of individual calls to
          // Object.defineProperty in order to make closure compiler happy
          Object.defineProperties(FS.FSNode.prototype, {
            read: {
              get: function() { return (this.mode & readMode) === readMode; },
              set: function(val) { val ? this.mode |= readMode : this.mode &= ~readMode; }
            },
            write: {
              get: function() { return (this.mode & writeMode) === writeMode; },
              set: function(val) { val ? this.mode |= writeMode : this.mode &= ~writeMode; }
            },
            isFolder: {
              get: function() { return FS.isDir(this.mode); },
            },
            isDevice: {
              get: function() { return FS.isChrdev(this.mode); },
            },
          });
        }
  
        var node = new FS.FSNode(parent, name, mode, rdev);
  
        FS.hashAddNode(node);
  
        return node;
      },destroyNode:function (node) {
        FS.hashRemoveNode(node);
      },isRoot:function (node) {
        return node === node.parent;
      },isMountpoint:function (node) {
        return !!node.mounted;
      },isFile:function (mode) {
        return (mode & 61440) === 32768;
      },isDir:function (mode) {
        return (mode & 61440) === 16384;
      },isLink:function (mode) {
        return (mode & 61440) === 40960;
      },isChrdev:function (mode) {
        return (mode & 61440) === 8192;
      },isBlkdev:function (mode) {
        return (mode & 61440) === 24576;
      },isFIFO:function (mode) {
        return (mode & 61440) === 4096;
      },isSocket:function (mode) {
        return (mode & 49152) === 49152;
      },flagModes:{"r":0,"rs":1052672,"r+":2,"w":577,"wx":705,"xw":705,"w+":578,"wx+":706,"xw+":706,"a":1089,"ax":1217,"xa":1217,"a+":1090,"ax+":1218,"xa+":1218},modeStringToFlags:function (str) {
        var flags = FS.flagModes[str];
        if (typeof flags === 'undefined') {
          throw new Error('Unknown file open mode: ' + str);
        }
        return flags;
      },flagsToPermissionString:function (flag) {
        var accmode = flag & 2097155;
        var perms = ['r', 'w', 'rw'][accmode];
        if ((flag & 512)) {
          perms += 'w';
        }
        return perms;
      },nodePermissions:function (node, perms) {
        if (FS.ignorePermissions) {
          return 0;
        }
        // return 0 if any user, group or owner bits are set.
        if (perms.indexOf('r') !== -1 && !(node.mode & 292)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('w') !== -1 && !(node.mode & 146)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('x') !== -1 && !(node.mode & 73)) {
          return ERRNO_CODES.EACCES;
        }
        return 0;
      },mayLookup:function (dir) {
        return FS.nodePermissions(dir, 'x');
      },mayCreate:function (dir, name) {
        try {
          var node = FS.lookupNode(dir, name);
          return ERRNO_CODES.EEXIST;
        } catch (e) {
        }
        return FS.nodePermissions(dir, 'wx');
      },mayDelete:function (dir, name, isdir) {
        var node;
        try {
          node = FS.lookupNode(dir, name);
        } catch (e) {
          return e.errno;
        }
        var err = FS.nodePermissions(dir, 'wx');
        if (err) {
          return err;
        }
        if (isdir) {
          if (!FS.isDir(node.mode)) {
            return ERRNO_CODES.ENOTDIR;
          }
          if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
            return ERRNO_CODES.EBUSY;
          }
        } else {
          if (FS.isDir(node.mode)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return 0;
      },mayOpen:function (node, flags) {
        if (!node) {
          return ERRNO_CODES.ENOENT;
        }
        if (FS.isLink(node.mode)) {
          return ERRNO_CODES.ELOOP;
        } else if (FS.isDir(node.mode)) {
          if ((flags & 2097155) !== 0 ||  // opening for write
              (flags & 512)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
      },MAX_OPEN_FDS:4096,nextfd:function (fd_start, fd_end) {
        fd_start = fd_start || 0;
        fd_end = fd_end || FS.MAX_OPEN_FDS;
        for (var fd = fd_start; fd <= fd_end; fd++) {
          if (!FS.streams[fd]) {
            return fd;
          }
        }
        throw new FS.ErrnoError(ERRNO_CODES.EMFILE);
      },getStream:function (fd) {
        return FS.streams[fd];
      },createStream:function (stream, fd_start, fd_end) {
        if (!FS.FSStream) {
          FS.FSStream = function(){};
          FS.FSStream.prototype = {};
          // compatibility
          Object.defineProperties(FS.FSStream.prototype, {
            object: {
              get: function() { return this.node; },
              set: function(val) { this.node = val; }
            },
            isRead: {
              get: function() { return (this.flags & 2097155) !== 1; }
            },
            isWrite: {
              get: function() { return (this.flags & 2097155) !== 0; }
            },
            isAppend: {
              get: function() { return (this.flags & 1024); }
            }
          });
        }
        // clone it, so we can return an instance of FSStream
        var newStream = new FS.FSStream();
        for (var p in stream) {
          newStream[p] = stream[p];
        }
        stream = newStream;
        var fd = FS.nextfd(fd_start, fd_end);
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream;
      },closeStream:function (fd) {
        FS.streams[fd] = null;
      },getStreamFromPtr:function (ptr) {
        return FS.streams[ptr - 1];
      },getPtrForStream:function (stream) {
        return stream ? stream.fd + 1 : 0;
      },chrdev_stream_ops:{open:function (stream) {
          var device = FS.getDevice(stream.node.rdev);
          // override node's stream ops with the device's
          stream.stream_ops = device.stream_ops;
          // forward the open call
          if (stream.stream_ops.open) {
            stream.stream_ops.open(stream);
          }
        },llseek:function () {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }},major:function (dev) {
        return ((dev) >> 8);
      },minor:function (dev) {
        return ((dev) & 0xff);
      },makedev:function (ma, mi) {
        return ((ma) << 8 | (mi));
      },registerDevice:function (dev, ops) {
        FS.devices[dev] = { stream_ops: ops };
      },getDevice:function (dev) {
        return FS.devices[dev];
      },getMounts:function (mount) {
        var mounts = [];
        var check = [mount];
  
        while (check.length) {
          var m = check.pop();
  
          mounts.push(m);
  
          check.push.apply(check, m.mounts);
        }
  
        return mounts;
      },syncfs:function (populate, callback) {
        if (typeof(populate) === 'function') {
          callback = populate;
          populate = false;
        }
  
        var mounts = FS.getMounts(FS.root.mount);
        var completed = 0;
  
        function done(err) {
          if (err) {
            if (!done.errored) {
              done.errored = true;
              return callback(err);
            }
            return;
          }
          if (++completed >= mounts.length) {
            callback(null);
          }
        };
  
        // sync all mounts
        mounts.forEach(function (mount) {
          if (!mount.type.syncfs) {
            return done(null);
          }
          mount.type.syncfs(mount, populate, done);
        });
      },mount:function (type, opts, mountpoint) {
        var root = mountpoint === '/';
        var pseudo = !mountpoint;
        var node;
  
        if (root && FS.root) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        } else if (!root && !pseudo) {
          var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
          mountpoint = lookup.path;  // use the absolute path
          node = lookup.node;
  
          if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
          }
  
          if (!FS.isDir(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
          }
        }
  
        var mount = {
          type: type,
          opts: opts,
          mountpoint: mountpoint,
          mounts: []
        };
  
        // create a root node for the fs
        var mountRoot = type.mount(mount);
        mountRoot.mount = mount;
        mount.root = mountRoot;
  
        if (root) {
          FS.root = mountRoot;
        } else if (node) {
          // set as a mountpoint
          node.mounted = mount;
  
          // add the new mount to the current mount's children
          if (node.mount) {
            node.mount.mounts.push(mount);
          }
        }
  
        return mountRoot;
      },unmount:function (mountpoint) {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
        if (!FS.isMountpoint(lookup.node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
  
        // destroy the nodes for this mount, and all its child mounts
        var node = lookup.node;
        var mount = node.mounted;
        var mounts = FS.getMounts(mount);
  
        Object.keys(FS.nameTable).forEach(function (hash) {
          var current = FS.nameTable[hash];
  
          while (current) {
            var next = current.name_next;
  
            if (mounts.indexOf(current.mount) !== -1) {
              FS.destroyNode(current);
            }
  
            current = next;
          }
        });
  
        // no longer a mountpoint
        node.mounted = null;
  
        // remove this mount from the child mounts
        var idx = node.mount.mounts.indexOf(mount);
        assert(idx !== -1);
        node.mount.mounts.splice(idx, 1);
      },lookup:function (parent, name) {
        return parent.node_ops.lookup(parent, name);
      },mknod:function (path, mode, dev) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var err = FS.mayCreate(parent, name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.mknod) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.mknod(parent, name, mode, dev);
      },create:function (path, mode) {
        mode = mode !== undefined ? mode : 438 /* 0666 */;
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0);
      },mkdir:function (path, mode) {
        mode = mode !== undefined ? mode : 511 /* 0777 */;
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0);
      },mkdev:function (path, mode, dev) {
        if (typeof(dev) === 'undefined') {
          dev = mode;
          mode = 438 /* 0666 */;
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev);
      },symlink:function (oldpath, newpath) {
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        var newname = PATH.basename(newpath);
        var err = FS.mayCreate(parent, newname);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.symlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.symlink(parent, newname, oldpath);
      },rename:function (old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        // parents must exist
        var lookup, old_dir, new_dir;
        try {
          lookup = FS.lookupPath(old_path, { parent: true });
          old_dir = lookup.node;
          lookup = FS.lookupPath(new_path, { parent: true });
          new_dir = lookup.node;
        } catch (e) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        // need to be part of the same mount
        if (old_dir.mount !== new_dir.mount) {
          throw new FS.ErrnoError(ERRNO_CODES.EXDEV);
        }
        // source must exist
        var old_node = FS.lookupNode(old_dir, old_name);
        // old path should not be an ancestor of the new path
        var relative = PATH.relative(old_path, new_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        // new path should not be an ancestor of the old path
        relative = PATH.relative(new_path, old_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
        }
        // see if the new path already exists
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
          // not fatal
        }
        // early out if nothing needs to change
        if (old_node === new_node) {
          return;
        }
        // we'll need to delete the old entry
        var isdir = FS.isDir(old_node.mode);
        var err = FS.mayDelete(old_dir, old_name, isdir);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        // need delete permissions if we'll be overwriting.
        // need create permissions if new doesn't already exist.
        err = new_node ?
          FS.mayDelete(new_dir, new_name, isdir) :
          FS.mayCreate(new_dir, new_name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!old_dir.node_ops.rename) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        // if we are going to change the parent, check write permissions
        if (new_dir !== old_dir) {
          err = FS.nodePermissions(old_dir, 'w');
          if (err) {
            throw new FS.ErrnoError(err);
          }
        }
        // remove the node from the lookup hash
        FS.hashRemoveNode(old_node);
        // do the underlying fs rename
        try {
          old_dir.node_ops.rename(old_node, new_dir, new_name);
        } catch (e) {
          throw e;
        } finally {
          // add the node back to the hash (in case node_ops.rename
          // changed its name)
          FS.hashAddNode(old_node);
        }
      },rmdir:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, true);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.rmdir) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
      },readdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        if (!node.node_ops.readdir) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        return node.node_ops.readdir(node);
      },unlink:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, false);
        if (err) {
          // POSIX says unlink should set EPERM, not EISDIR
          if (err === ERRNO_CODES.EISDIR) err = ERRNO_CODES.EPERM;
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.unlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
      },readlink:function (path) {
        var lookup = FS.lookupPath(path);
        var link = lookup.node;
        if (!link.node_ops.readlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        return link.node_ops.readlink(link);
      },stat:function (path, dontFollow) {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        var node = lookup.node;
        if (!node.node_ops.getattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return node.node_ops.getattr(node);
      },lstat:function (path) {
        return FS.stat(path, true);
      },chmod:function (path, mode, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          mode: (mode & 4095) | (node.mode & ~4095),
          timestamp: Date.now()
        });
      },lchmod:function (path, mode) {
        FS.chmod(path, mode, true);
      },fchmod:function (fd, mode) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chmod(stream.node, mode);
      },chown:function (path, uid, gid, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          timestamp: Date.now()
          // we ignore the uid / gid for now
        });
      },lchown:function (path, uid, gid) {
        FS.chown(path, uid, gid, true);
      },fchown:function (fd, uid, gid) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chown(stream.node, uid, gid);
      },truncate:function (path, len) {
        if (len < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: true });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!FS.isFile(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var err = FS.nodePermissions(node, 'w');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        node.node_ops.setattr(node, {
          size: len,
          timestamp: Date.now()
        });
      },ftruncate:function (fd, len) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        FS.truncate(stream.node, len);
      },utime:function (path, atime, mtime) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        node.node_ops.setattr(node, {
          timestamp: Math.max(atime, mtime)
        });
      },open:function (path, flags, mode, fd_start, fd_end) {
        flags = typeof flags === 'string' ? FS.modeStringToFlags(flags) : flags;
        mode = typeof mode === 'undefined' ? 438 /* 0666 */ : mode;
        if ((flags & 64)) {
          mode = (mode & 4095) | 32768;
        } else {
          mode = 0;
        }
        var node;
        if (typeof path === 'object') {
          node = path;
        } else {
          path = PATH.normalize(path);
          try {
            var lookup = FS.lookupPath(path, {
              follow: !(flags & 131072)
            });
            node = lookup.node;
          } catch (e) {
            // ignore
          }
        }
        // perhaps we need to create the node
        if ((flags & 64)) {
          if (node) {
            // if O_CREAT and O_EXCL are set, error out if the node already exists
            if ((flags & 128)) {
              throw new FS.ErrnoError(ERRNO_CODES.EEXIST);
            }
          } else {
            // node doesn't exist, try to create it
            node = FS.mknod(path, mode, 0);
          }
        }
        if (!node) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        // can't truncate a device
        if (FS.isChrdev(node.mode)) {
          flags &= ~512;
        }
        // check permissions
        var err = FS.mayOpen(node, flags);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        // do truncation if necessary
        if ((flags & 512)) {
          FS.truncate(node, 0);
        }
        // we've already handled these, don't pass down to the underlying vfs
        flags &= ~(128 | 512);
  
        // register the stream with the filesystem
        var stream = FS.createStream({
          node: node,
          path: FS.getPath(node),  // we want the absolute path to the node
          flags: flags,
          seekable: true,
          position: 0,
          stream_ops: node.stream_ops,
          // used by the file family libc calls (fopen, fwrite, ferror, etc.)
          ungotten: [],
          error: false
        }, fd_start, fd_end);
        // call the new stream's open function
        if (stream.stream_ops.open) {
          stream.stream_ops.open(stream);
        }
        if (Module['logReadFiles'] && !(flags & 1)) {
          if (!FS.readFiles) FS.readFiles = {};
          if (!(path in FS.readFiles)) {
            FS.readFiles[path] = 1;
            Module['printErr']('read file: ' + path);
          }
        }
        return stream;
      },close:function (stream) {
        try {
          if (stream.stream_ops.close) {
            stream.stream_ops.close(stream);
          }
        } catch (e) {
          throw e;
        } finally {
          FS.closeStream(stream.fd);
        }
      },llseek:function (stream, offset, whence) {
        if (!stream.seekable || !stream.stream_ops.llseek) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        return stream.stream_ops.llseek(stream, offset, whence);
      },read:function (stream, buffer, offset, length, position) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.read) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead;
      },write:function (stream, buffer, offset, length, position, canOwn) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.write) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        if (stream.flags & 1024) {
          // seek to the end before writing in append mode
          FS.llseek(stream, 0, 2);
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        return bytesWritten;
      },allocate:function (stream, offset, length) {
        if (offset < 0 || length <= 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (!FS.isFile(stream.node.mode) && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        if (!stream.stream_ops.allocate) {
          throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
        }
        stream.stream_ops.allocate(stream, offset, length);
      },mmap:function (stream, buffer, offset, length, position, prot, flags) {
        // TODO if PROT is PROT_WRITE, make sure we have write access
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EACCES);
        }
        if (!stream.stream_ops.mmap) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        return stream.stream_ops.mmap(stream, buffer, offset, length, position, prot, flags);
      },ioctl:function (stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTTY);
        }
        return stream.stream_ops.ioctl(stream, cmd, arg);
      },readFile:function (path, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'r';
        opts.encoding = opts.encoding || 'binary';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        var ret;
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === 'utf8') {
          ret = '';
          var utf8 = new Runtime.UTF8Processor();
          for (var i = 0; i < length; i++) {
            ret += utf8.processCChar(buf[i]);
          }
        } else if (opts.encoding === 'binary') {
          ret = buf;
        }
        FS.close(stream);
        return ret;
      },writeFile:function (path, data, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'w';
        opts.encoding = opts.encoding || 'utf8';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        var stream = FS.open(path, opts.flags, opts.mode);
        if (opts.encoding === 'utf8') {
          var utf8 = new Runtime.UTF8Processor();
          var buf = new Uint8Array(utf8.processJSString(data));
          FS.write(stream, buf, 0, buf.length, 0, opts.canOwn);
        } else if (opts.encoding === 'binary') {
          FS.write(stream, data, 0, data.length, 0, opts.canOwn);
        }
        FS.close(stream);
      },cwd:function () {
        return FS.currentPath;
      },chdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        if (!FS.isDir(lookup.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        var err = FS.nodePermissions(lookup.node, 'x');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        FS.currentPath = lookup.path;
      },createDefaultDirectories:function () {
        FS.mkdir('/tmp');
      },createDefaultDevices:function () {
        // create /dev
        FS.mkdir('/dev');
        // setup /dev/null
        FS.registerDevice(FS.makedev(1, 3), {
          read: function() { return 0; },
          write: function() { return 0; }
        });
        FS.mkdev('/dev/null', FS.makedev(1, 3));
        // setup /dev/tty and /dev/tty1
        // stderr needs to print output using Module['printErr']
        // so we register a second tty just for it.
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev('/dev/tty', FS.makedev(5, 0));
        FS.mkdev('/dev/tty1', FS.makedev(6, 0));
        // we're not going to emulate the actual shm device,
        // just create the tmp dirs that reside in it commonly
        FS.mkdir('/dev/shm');
        FS.mkdir('/dev/shm/tmp');
      },createStandardStreams:function () {
        // TODO deprecate the old functionality of a single
        // input / output callback and that utilizes FS.createDevice
        // and instead require a unique set of stream ops
  
        // by default, we symlink the standard streams to the
        // default tty devices. however, if the standard streams
        // have been overwritten we create a unique device for
        // them instead.
        if (Module['stdin']) {
          FS.createDevice('/dev', 'stdin', Module['stdin']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdin');
        }
        if (Module['stdout']) {
          FS.createDevice('/dev', 'stdout', null, Module['stdout']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdout');
        }
        if (Module['stderr']) {
          FS.createDevice('/dev', 'stderr', null, Module['stderr']);
        } else {
          FS.symlink('/dev/tty1', '/dev/stderr');
        }
  
        // open default streams for the stdin, stdout and stderr devices
        var stdin = FS.open('/dev/stdin', 'r');
        HEAP32[((_stdin)>>2)]=FS.getPtrForStream(stdin);
        assert(stdin.fd === 0, 'invalid handle for stdin (' + stdin.fd + ')');
  
        var stdout = FS.open('/dev/stdout', 'w');
        HEAP32[((_stdout)>>2)]=FS.getPtrForStream(stdout);
        assert(stdout.fd === 1, 'invalid handle for stdout (' + stdout.fd + ')');
  
        var stderr = FS.open('/dev/stderr', 'w');
        HEAP32[((_stderr)>>2)]=FS.getPtrForStream(stderr);
        assert(stderr.fd === 2, 'invalid handle for stderr (' + stderr.fd + ')');
      },ensureErrnoError:function () {
        if (FS.ErrnoError) return;
        FS.ErrnoError = function ErrnoError(errno) {
          this.errno = errno;
          for (var key in ERRNO_CODES) {
            if (ERRNO_CODES[key] === errno) {
              this.code = key;
              break;
            }
          }
          this.message = ERRNO_MESSAGES[errno];
        };
        FS.ErrnoError.prototype = new Error();
        FS.ErrnoError.prototype.constructor = FS.ErrnoError;
        // Some errors may happen quite a bit, to avoid overhead we reuse them (and suffer a lack of stack info)
        [ERRNO_CODES.ENOENT].forEach(function(code) {
          FS.genericErrors[code] = new FS.ErrnoError(code);
          FS.genericErrors[code].stack = '<generic error, no stack>';
        });
      },staticInit:function () {
        FS.ensureErrnoError();
  
        FS.nameTable = new Array(4096);
  
        FS.mount(MEMFS, {}, '/');
  
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
      },init:function (input, output, error) {
        assert(!FS.init.initialized, 'FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)');
        FS.init.initialized = true;
  
        FS.ensureErrnoError();
  
        // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
        Module['stdin'] = input || Module['stdin'];
        Module['stdout'] = output || Module['stdout'];
        Module['stderr'] = error || Module['stderr'];
  
        FS.createStandardStreams();
      },quit:function () {
        FS.init.initialized = false;
        for (var i = 0; i < FS.streams.length; i++) {
          var stream = FS.streams[i];
          if (!stream) {
            continue;
          }
          FS.close(stream);
        }
      },getMode:function (canRead, canWrite) {
        var mode = 0;
        if (canRead) mode |= 292 | 73;
        if (canWrite) mode |= 146;
        return mode;
      },joinPath:function (parts, forceRelative) {
        var path = PATH.join.apply(null, parts);
        if (forceRelative && path[0] == '/') path = path.substr(1);
        return path;
      },absolutePath:function (relative, base) {
        return PATH.resolve(base, relative);
      },standardizePath:function (path) {
        return PATH.normalize(path);
      },findObject:function (path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (ret.exists) {
          return ret.object;
        } else {
          ___setErrNo(ret.error);
          return null;
        }
      },analyzePath:function (path, dontResolveLastLink) {
        // operate from within the context of the symlink's target
        try {
          var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          path = lookup.path;
        } catch (e) {
        }
        var ret = {
          isRoot: false, exists: false, error: 0, name: null, path: null, object: null,
          parentExists: false, parentPath: null, parentObject: null
        };
        try {
          var lookup = FS.lookupPath(path, { parent: true });
          ret.parentExists = true;
          ret.parentPath = lookup.path;
          ret.parentObject = lookup.node;
          ret.name = PATH.basename(path);
          lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          ret.exists = true;
          ret.path = lookup.path;
          ret.object = lookup.node;
          ret.name = lookup.node.name;
          ret.isRoot = lookup.path === '/';
        } catch (e) {
          ret.error = e.errno;
        };
        return ret;
      },createFolder:function (parent, name, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.mkdir(path, mode);
      },createPath:function (parent, path, canRead, canWrite) {
        parent = typeof parent === 'string' ? parent : FS.getPath(parent);
        var parts = path.split('/').reverse();
        while (parts.length) {
          var part = parts.pop();
          if (!part) continue;
          var current = PATH.join2(parent, part);
          try {
            FS.mkdir(current);
          } catch (e) {
            // ignore EEXIST
          }
          parent = current;
        }
        return current;
      },createFile:function (parent, name, properties, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.create(path, mode);
      },createDataFile:function (parent, name, data, canRead, canWrite, canOwn) {
        var path = name ? PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name) : parent;
        var mode = FS.getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
          if (typeof data === 'string') {
            var arr = new Array(data.length);
            for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
            data = arr;
          }
          // make sure we can write to the file
          FS.chmod(node, mode | 146);
          var stream = FS.open(node, 'w');
          FS.write(stream, data, 0, data.length, 0, canOwn);
          FS.close(stream);
          FS.chmod(node, mode);
        }
        return node;
      },createDevice:function (parent, name, input, output) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(!!input, !!output);
        if (!FS.createDevice.major) FS.createDevice.major = 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        // Create a fake device that a set of stream ops to emulate
        // the old behavior.
        FS.registerDevice(dev, {
          open: function(stream) {
            stream.seekable = false;
          },
          close: function(stream) {
            // flush any pending line data
            if (output && output.buffer && output.buffer.length) {
              output(10);
            }
          },
          read: function(stream, buffer, offset, length, pos /* ignored */) {
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
              var result;
              try {
                result = input();
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
              if (result === undefined && bytesRead === 0) {
                throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
              }
              if (result === null || result === undefined) break;
              bytesRead++;
              buffer[offset+i] = result;
            }
            if (bytesRead) {
              stream.node.timestamp = Date.now();
            }
            return bytesRead;
          },
          write: function(stream, buffer, offset, length, pos) {
            for (var i = 0; i < length; i++) {
              try {
                output(buffer[offset+i]);
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
            }
            if (length) {
              stream.node.timestamp = Date.now();
            }
            return i;
          }
        });
        return FS.mkdev(path, mode, dev);
      },createLink:function (parent, name, target, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        return FS.symlink(target, path);
      },forceLoadFile:function (obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        var success = true;
        if (typeof XMLHttpRequest !== 'undefined') {
          throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
        } else if (Module['read']) {
          // Command-line.
          try {
            // WARNING: Can't read binary files in V8's d8 or tracemonkey's js, as
            //          read() will try to parse UTF8.
            obj.contents = intArrayFromString(Module['read'](obj.url), true);
          } catch (e) {
            success = false;
          }
        } else {
          throw new Error('Cannot load without read() or XMLHttpRequest.');
        }
        if (!success) ___setErrNo(ERRNO_CODES.EIO);
        return success;
      },createLazyFile:function (parent, name, url, canRead, canWrite) {
        // Lazy chunked Uint8Array (implements get and length from Uint8Array). Actual getting is abstracted away for eventual reuse.
        function LazyUint8Array() {
          this.lengthKnown = false;
          this.chunks = []; // Loaded chunks. Index is the chunk number
        }
        LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
          if (idx > this.length-1 || idx < 0) {
            return undefined;
          }
          var chunkOffset = idx % this.chunkSize;
          var chunkNum = Math.floor(idx / this.chunkSize);
          return this.getter(chunkNum)[chunkOffset];
        }
        LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
          this.getter = getter;
        }
        LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
            // Find length
            var xhr = new XMLHttpRequest();
            xhr.open('HEAD', url, false);
            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
            var datalength = Number(xhr.getResponseHeader("Content-length"));
            var header;
            var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
            var chunkSize = 1024*1024; // Chunk size in bytes
  
            if (!hasByteServing) chunkSize = datalength;
  
            // Function to get a range from the remote URL.
            var doXHR = (function(from, to) {
              if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
              if (to > datalength-1) throw new Error("only " + datalength + " bytes available! programmer error!");
  
              // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
              var xhr = new XMLHttpRequest();
              xhr.open('GET', url, false);
              if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
  
              // Some hints to the browser that we want binary data.
              if (typeof Uint8Array != 'undefined') xhr.responseType = 'arraybuffer';
              if (xhr.overrideMimeType) {
                xhr.overrideMimeType('text/plain; charset=x-user-defined');
              }
  
              xhr.send(null);
              if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
              if (xhr.response !== undefined) {
                return new Uint8Array(xhr.response || []);
              } else {
                return intArrayFromString(xhr.responseText || '', true);
              }
            });
            var lazyArray = this;
            lazyArray.setDataGetter(function(chunkNum) {
              var start = chunkNum * chunkSize;
              var end = (chunkNum+1) * chunkSize - 1; // including this byte
              end = Math.min(end, datalength-1); // if datalength-1 is selected, this is the last block
              if (typeof(lazyArray.chunks[chunkNum]) === "undefined") {
                lazyArray.chunks[chunkNum] = doXHR(start, end);
              }
              if (typeof(lazyArray.chunks[chunkNum]) === "undefined") throw new Error("doXHR failed!");
              return lazyArray.chunks[chunkNum];
            });
  
            this._length = datalength;
            this._chunkSize = chunkSize;
            this.lengthKnown = true;
        }
        if (typeof XMLHttpRequest !== 'undefined') {
          if (!ENVIRONMENT_IS_WORKER) throw 'Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc';
          var lazyArray = new LazyUint8Array();
          Object.defineProperty(lazyArray, "length", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._length;
              }
          });
          Object.defineProperty(lazyArray, "chunkSize", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._chunkSize;
              }
          });
  
          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url: url };
        }
  
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        // This is a total hack, but I want to get this lazy file code out of the
        // core of MEMFS. If we want to keep this lazy file concept I feel it should
        // be its own thin LAZYFS proxying calls to MEMFS.
        if (properties.contents) {
          node.contents = properties.contents;
        } else if (properties.url) {
          node.contents = null;
          node.url = properties.url;
        }
        // override each stream op with one that tries to force load the lazy file first
        var stream_ops = {};
        var keys = Object.keys(node.stream_ops);
        keys.forEach(function(key) {
          var fn = node.stream_ops[key];
          stream_ops[key] = function forceLoadLazyFile() {
            if (!FS.forceLoadFile(node)) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            return fn.apply(null, arguments);
          };
        });
        // use a custom read function
        stream_ops.read = function stream_ops_read(stream, buffer, offset, length, position) {
          if (!FS.forceLoadFile(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EIO);
          }
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (contents.slice) { // normal array
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          } else {
            for (var i = 0; i < size; i++) { // LazyUint8Array from sync binary XHR
              buffer[offset + i] = contents.get(position + i);
            }
          }
          return size;
        };
        node.stream_ops = stream_ops;
        return node;
      },createPreloadedFile:function (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn) {
        Browser.init();
        // TODO we should allow people to just pass in a complete filename instead
        // of parent and name being that we just join them anyways
        var fullname = name ? PATH.resolve(PATH.join2(parent, name)) : parent;
        function processData(byteArray) {
          function finish(byteArray) {
            if (!dontCreateFile) {
              FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
            }
            if (onload) onload();
            removeRunDependency('cp ' + fullname);
          }
          var handled = false;
          Module['preloadPlugins'].forEach(function(plugin) {
            if (handled) return;
            if (plugin['canHandle'](fullname)) {
              plugin['handle'](byteArray, fullname, finish, function() {
                if (onerror) onerror();
                removeRunDependency('cp ' + fullname);
              });
              handled = true;
            }
          });
          if (!handled) finish(byteArray);
        }
        addRunDependency('cp ' + fullname);
        if (typeof url == 'string') {
          Browser.asyncLoad(url, function(byteArray) {
            processData(byteArray);
          }, onerror);
        } else {
          processData(url);
        }
      },indexedDB:function () {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
      },DB_NAME:function () {
        return 'EM_FS_' + window.location.pathname;
      },DB_VERSION:20,DB_STORE_NAME:"FILE_DATA",saveFilesToDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = function openRequest_onupgradeneeded() {
          console.log('creating db');
          var db = openRequest.result;
          db.createObjectStore(FS.DB_STORE_NAME);
        };
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          var transaction = db.transaction([FS.DB_STORE_NAME], 'readwrite');
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var putRequest = files.put(FS.analyzePath(path).object.contents, path);
            putRequest.onsuccess = function putRequest_onsuccess() { ok++; if (ok + fail == total) finish() };
            putRequest.onerror = function putRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      },loadFilesFromDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = onerror; // no database to load from
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          try {
            var transaction = db.transaction([FS.DB_STORE_NAME], 'readonly');
          } catch(e) {
            onerror(e);
            return;
          }
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var getRequest = files.get(path);
            getRequest.onsuccess = function getRequest_onsuccess() {
              if (FS.analyzePath(path).exists) {
                FS.unlink(path);
              }
              FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
              ok++;
              if (ok + fail == total) finish();
            };
            getRequest.onerror = function getRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      }};function _fflush(stream) {
      // int fflush(FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fflush.html
      // we don't currently perform any user-space buffering of data
    }

  
  
  
  function _isspace(chr) {
      return (chr == 32) || (chr >= 9 && chr <= 13);
    }
  function __parseInt64(str, endptr, base, min, max, unsign) {
      var isNegative = false;
      // Skip space.
      while (_isspace(HEAP8[(str)])) str++;
  
      // Check for a plus/minus sign.
      if (HEAP8[(str)] == 45) {
        str++;
        isNegative = true;
      } else if (HEAP8[(str)] == 43) {
        str++;
      }
  
      // Find base.
      var ok = false;
      var finalBase = base;
      if (!finalBase) {
        if (HEAP8[(str)] == 48) {
          if (HEAP8[((str+1)|0)] == 120 ||
              HEAP8[((str+1)|0)] == 88) {
            finalBase = 16;
            str += 2;
          } else {
            finalBase = 8;
            ok = true; // we saw an initial zero, perhaps the entire thing is just "0"
          }
        }
      } else if (finalBase==16) {
        if (HEAP8[(str)] == 48) {
          if (HEAP8[((str+1)|0)] == 120 ||
              HEAP8[((str+1)|0)] == 88) {
            str += 2;
          }
        }
      }
      if (!finalBase) finalBase = 10;
      var start = str;
  
      // Get digits.
      var chr;
      while ((chr = HEAP8[(str)]) != 0) {
        var digit = parseInt(String.fromCharCode(chr), finalBase);
        if (isNaN(digit)) {
          break;
        } else {
          str++;
          ok = true;
        }
      }
  
      if (!ok) {
        ___setErrNo(ERRNO_CODES.EINVAL);
        return ((asm["setTempRet0"](0),0)|0);
      }
  
      // Set end pointer.
      if (endptr) {
        HEAP32[((endptr)>>2)]=str;
      }
  
      try {
        var numberString = isNegative ? '-'+Pointer_stringify(start, str - start) : Pointer_stringify(start, str - start);
        i64Math.fromString(numberString, finalBase, min, max, unsign);
      } catch(e) {
        ___setErrNo(ERRNO_CODES.ERANGE); // not quite correct
      }
  
      return ((asm["setTempRet0"](((HEAP32[(((tempDoublePtr)+(4))>>2)])|0)),((HEAP32[((tempDoublePtr)>>2)])|0))|0);
    }function _strtoull(str, endptr, base) {
      return __parseInt64(str, endptr, base, 0, '18446744073709551615', true);  // ULONG_MAX.
    }function _strtoull_l(str, endptr, base) {
      return _strtoull(str, endptr, base); // no locale support yet
    }

  function _sysconf(name) {
      // long sysconf(int name);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/sysconf.html
      switch(name) {
        case 30: return PAGE_SIZE;
        case 132:
        case 133:
        case 12:
        case 137:
        case 138:
        case 15:
        case 235:
        case 16:
        case 17:
        case 18:
        case 19:
        case 20:
        case 149:
        case 13:
        case 10:
        case 236:
        case 153:
        case 9:
        case 21:
        case 22:
        case 159:
        case 154:
        case 14:
        case 77:
        case 78:
        case 139:
        case 80:
        case 81:
        case 79:
        case 82:
        case 68:
        case 67:
        case 164:
        case 11:
        case 29:
        case 47:
        case 48:
        case 95:
        case 52:
        case 51:
        case 46:
          return 200809;
        case 27:
        case 246:
        case 127:
        case 128:
        case 23:
        case 24:
        case 160:
        case 161:
        case 181:
        case 182:
        case 242:
        case 183:
        case 184:
        case 243:
        case 244:
        case 245:
        case 165:
        case 178:
        case 179:
        case 49:
        case 50:
        case 168:
        case 169:
        case 175:
        case 170:
        case 171:
        case 172:
        case 97:
        case 76:
        case 32:
        case 173:
        case 35:
          return -1;
        case 176:
        case 177:
        case 7:
        case 155:
        case 8:
        case 157:
        case 125:
        case 126:
        case 92:
        case 93:
        case 129:
        case 130:
        case 131:
        case 94:
        case 91:
          return 1;
        case 74:
        case 60:
        case 69:
        case 70:
        case 4:
          return 1024;
        case 31:
        case 42:
        case 72:
          return 32;
        case 87:
        case 26:
        case 33:
          return 2147483647;
        case 34:
        case 1:
          return 47839;
        case 38:
        case 36:
          return 99;
        case 43:
        case 37:
          return 2048;
        case 0: return 2097152;
        case 3: return 65536;
        case 28: return 32768;
        case 44: return 32767;
        case 75: return 16384;
        case 39: return 1000;
        case 89: return 700;
        case 71: return 256;
        case 40: return 255;
        case 2: return 100;
        case 180: return 64;
        case 25: return 20;
        case 5: return 16;
        case 6: return 6;
        case 73: return 4;
        case 84: return 1;
      }
      ___setErrNo(ERRNO_CODES.EINVAL);
      return -1;
    }

  
  
  
  
  function _mkport() { throw 'TODO' }var SOCKFS={mount:function (mount) {
        return FS.createNode(null, '/', 16384 | 511 /* 0777 */, 0);
      },createSocket:function (family, type, protocol) {
        var streaming = type == 1;
        if (protocol) {
          assert(streaming == (protocol == 6)); // if SOCK_STREAM, must be tcp
        }
  
        // create our internal socket structure
        var sock = {
          family: family,
          type: type,
          protocol: protocol,
          server: null,
          peers: {},
          pending: [],
          recv_queue: [],
          sock_ops: SOCKFS.websocket_sock_ops
        };
  
        // create the filesystem node to store the socket structure
        var name = SOCKFS.nextname();
        var node = FS.createNode(SOCKFS.root, name, 49152, 0);
        node.sock = sock;
  
        // and the wrapping stream that enables library functions such
        // as read and write to indirectly interact with the socket
        var stream = FS.createStream({
          path: name,
          node: node,
          flags: FS.modeStringToFlags('r+'),
          seekable: false,
          stream_ops: SOCKFS.stream_ops
        });
  
        // map the new stream to the socket structure (sockets have a 1:1
        // relationship with a stream)
        sock.stream = stream;
  
        return sock;
      },getSocket:function (fd) {
        var stream = FS.getStream(fd);
        if (!stream || !FS.isSocket(stream.node.mode)) {
          return null;
        }
        return stream.node.sock;
      },stream_ops:{poll:function (stream) {
          var sock = stream.node.sock;
          return sock.sock_ops.poll(sock);
        },ioctl:function (stream, request, varargs) {
          var sock = stream.node.sock;
          return sock.sock_ops.ioctl(sock, request, varargs);
        },read:function (stream, buffer, offset, length, position /* ignored */) {
          var sock = stream.node.sock;
          var msg = sock.sock_ops.recvmsg(sock, length);
          if (!msg) {
            // socket is closed
            return 0;
          }
          buffer.set(msg.buffer, offset);
          return msg.buffer.length;
        },write:function (stream, buffer, offset, length, position /* ignored */) {
          var sock = stream.node.sock;
          return sock.sock_ops.sendmsg(sock, buffer, offset, length);
        },close:function (stream) {
          var sock = stream.node.sock;
          sock.sock_ops.close(sock);
        }},nextname:function () {
        if (!SOCKFS.nextname.current) {
          SOCKFS.nextname.current = 0;
        }
        return 'socket[' + (SOCKFS.nextname.current++) + ']';
      },websocket_sock_ops:{createPeer:function (sock, addr, port) {
          var ws;
  
          if (typeof addr === 'object') {
            ws = addr;
            addr = null;
            port = null;
          }
  
          if (ws) {
            // for sockets that've already connected (e.g. we're the server)
            // we can inspect the _socket property for the address
            if (ws._socket) {
              addr = ws._socket.remoteAddress;
              port = ws._socket.remotePort;
            }
            // if we're just now initializing a connection to the remote,
            // inspect the url property
            else {
              var result = /ws[s]?:\/\/([^:]+):(\d+)/.exec(ws.url);
              if (!result) {
                throw new Error('WebSocket URL must be in the format ws(s)://address:port');
              }
              addr = result[1];
              port = parseInt(result[2], 10);
            }
          } else {
            // create the actual websocket object and connect
            try {
              // runtimeConfig gets set to true if WebSocket runtime configuration is available.
              var runtimeConfig = (Module['websocket'] && ('object' === typeof Module['websocket']));
  
              // The default value is 'ws://' the replace is needed because the compiler replaces "//" comments with '#'
              // comments without checking context, so we'd end up with ws:#, the replace swaps the "#" for "//" again.
              var url = 'ws:#'.replace('#', '//');
  
              if (runtimeConfig) {
                if ('string' === typeof Module['websocket']['url']) {
                  url = Module['websocket']['url']; // Fetch runtime WebSocket URL config.
                }
              }
  
              if (url === 'ws://' || url === 'wss://') { // Is the supplied URL config just a prefix, if so complete it.
                url = url + addr + ':' + port;
              }
  
              // Make the WebSocket subprotocol (Sec-WebSocket-Protocol) default to binary if no configuration is set.
              var subProtocols = 'binary'; // The default value is 'binary'
  
              if (runtimeConfig) {
                if ('string' === typeof Module['websocket']['subprotocol']) {
                  subProtocols = Module['websocket']['subprotocol']; // Fetch runtime WebSocket subprotocol config.
                }
              }
  
              // The regex trims the string (removes spaces at the beginning and end, then splits the string by
              // <any space>,<any space> into an Array. Whitespace removal is important for Websockify and ws.
              subProtocols = subProtocols.replace(/^ +| +$/g,"").split(/ *, */);
  
              // The node ws library API for specifying optional subprotocol is slightly different than the browser's.
              var opts = ENVIRONMENT_IS_NODE ? {'protocol': subProtocols.toString()} : subProtocols;
  
              // If node we use the ws library.
              var WebSocket = ENVIRONMENT_IS_NODE ? require('ws') : window['WebSocket'];
              ws = new WebSocket(url, opts);
              ws.binaryType = 'arraybuffer';
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EHOSTUNREACH);
            }
          }
  
  
          var peer = {
            addr: addr,
            port: port,
            socket: ws,
            dgram_send_queue: []
          };
  
          SOCKFS.websocket_sock_ops.addPeer(sock, peer);
          SOCKFS.websocket_sock_ops.handlePeerEvents(sock, peer);
  
          // if this is a bound dgram socket, send the port number first to allow
          // us to override the ephemeral port reported to us by remotePort on the
          // remote end.
          if (sock.type === 2 && typeof sock.sport !== 'undefined') {
            peer.dgram_send_queue.push(new Uint8Array([
                255, 255, 255, 255,
                'p'.charCodeAt(0), 'o'.charCodeAt(0), 'r'.charCodeAt(0), 't'.charCodeAt(0),
                ((sock.sport & 0xff00) >> 8) , (sock.sport & 0xff)
            ]));
          }
  
          return peer;
        },getPeer:function (sock, addr, port) {
          return sock.peers[addr + ':' + port];
        },addPeer:function (sock, peer) {
          sock.peers[peer.addr + ':' + peer.port] = peer;
        },removePeer:function (sock, peer) {
          delete sock.peers[peer.addr + ':' + peer.port];
        },handlePeerEvents:function (sock, peer) {
          var first = true;
  
          var handleOpen = function () {
            try {
              var queued = peer.dgram_send_queue.shift();
              while (queued) {
                peer.socket.send(queued);
                queued = peer.dgram_send_queue.shift();
              }
            } catch (e) {
              // not much we can do here in the way of proper error handling as we've already
              // lied and said this data was sent. shut it down.
              peer.socket.close();
            }
          };
  
          function handleMessage(data) {
            assert(typeof data !== 'string' && data.byteLength !== undefined);  // must receive an ArrayBuffer
            data = new Uint8Array(data);  // make a typed array view on the array buffer
  
  
            // if this is the port message, override the peer's port with it
            var wasfirst = first;
            first = false;
            if (wasfirst &&
                data.length === 10 &&
                data[0] === 255 && data[1] === 255 && data[2] === 255 && data[3] === 255 &&
                data[4] === 'p'.charCodeAt(0) && data[5] === 'o'.charCodeAt(0) && data[6] === 'r'.charCodeAt(0) && data[7] === 't'.charCodeAt(0)) {
              // update the peer's port and it's key in the peer map
              var newport = ((data[8] << 8) | data[9]);
              SOCKFS.websocket_sock_ops.removePeer(sock, peer);
              peer.port = newport;
              SOCKFS.websocket_sock_ops.addPeer(sock, peer);
              return;
            }
  
            sock.recv_queue.push({ addr: peer.addr, port: peer.port, data: data });
          };
  
          if (ENVIRONMENT_IS_NODE) {
            peer.socket.on('open', handleOpen);
            peer.socket.on('message', function(data, flags) {
              if (!flags.binary) {
                return;
              }
              handleMessage((new Uint8Array(data)).buffer);  // copy from node Buffer -> ArrayBuffer
            });
            peer.socket.on('error', function() {
              // don't throw
            });
          } else {
            peer.socket.onopen = handleOpen;
            peer.socket.onmessage = function peer_socket_onmessage(event) {
              handleMessage(event.data);
            };
          }
        },poll:function (sock) {
          if (sock.type === 1 && sock.server) {
            // listen sockets should only say they're available for reading
            // if there are pending clients.
            return sock.pending.length ? (64 | 1) : 0;
          }
  
          var mask = 0;
          var dest = sock.type === 1 ?  // we only care about the socket state for connection-based sockets
            SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport) :
            null;
  
          if (sock.recv_queue.length ||
              !dest ||  // connection-less sockets are always ready to read
              (dest && dest.socket.readyState === dest.socket.CLOSING) ||
              (dest && dest.socket.readyState === dest.socket.CLOSED)) {  // let recv return 0 once closed
            mask |= (64 | 1);
          }
  
          if (!dest ||  // connection-less sockets are always ready to write
              (dest && dest.socket.readyState === dest.socket.OPEN)) {
            mask |= 4;
          }
  
          if ((dest && dest.socket.readyState === dest.socket.CLOSING) ||
              (dest && dest.socket.readyState === dest.socket.CLOSED)) {
            mask |= 16;
          }
  
          return mask;
        },ioctl:function (sock, request, arg) {
          switch (request) {
            case 21531:
              var bytes = 0;
              if (sock.recv_queue.length) {
                bytes = sock.recv_queue[0].data.length;
              }
              HEAP32[((arg)>>2)]=bytes;
              return 0;
            default:
              return ERRNO_CODES.EINVAL;
          }
        },close:function (sock) {
          // if we've spawned a listen server, close it
          if (sock.server) {
            try {
              sock.server.close();
            } catch (e) {
            }
            sock.server = null;
          }
          // close any peer connections
          var peers = Object.keys(sock.peers);
          for (var i = 0; i < peers.length; i++) {
            var peer = sock.peers[peers[i]];
            try {
              peer.socket.close();
            } catch (e) {
            }
            SOCKFS.websocket_sock_ops.removePeer(sock, peer);
          }
          return 0;
        },bind:function (sock, addr, port) {
          if (typeof sock.saddr !== 'undefined' || typeof sock.sport !== 'undefined') {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);  // already bound
          }
          sock.saddr = addr;
          sock.sport = port || _mkport();
          // in order to emulate dgram sockets, we need to launch a listen server when
          // binding on a connection-less socket
          // note: this is only required on the server side
          if (sock.type === 2) {
            // close the existing server if it exists
            if (sock.server) {
              sock.server.close();
              sock.server = null;
            }
            // swallow error operation not supported error that occurs when binding in the
            // browser where this isn't supported
            try {
              sock.sock_ops.listen(sock, 0);
            } catch (e) {
              if (!(e instanceof FS.ErrnoError)) throw e;
              if (e.errno !== ERRNO_CODES.EOPNOTSUPP) throw e;
            }
          }
        },connect:function (sock, addr, port) {
          if (sock.server) {
            throw new FS.ErrnoError(ERRNO_CODS.EOPNOTSUPP);
          }
  
          // TODO autobind
          // if (!sock.addr && sock.type == 2) {
          // }
  
          // early out if we're already connected / in the middle of connecting
          if (typeof sock.daddr !== 'undefined' && typeof sock.dport !== 'undefined') {
            var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
            if (dest) {
              if (dest.socket.readyState === dest.socket.CONNECTING) {
                throw new FS.ErrnoError(ERRNO_CODES.EALREADY);
              } else {
                throw new FS.ErrnoError(ERRNO_CODES.EISCONN);
              }
            }
          }
  
          // add the socket to our peer list and set our
          // destination address / port to match
          var peer = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
          sock.daddr = peer.addr;
          sock.dport = peer.port;
  
          // always "fail" in non-blocking mode
          throw new FS.ErrnoError(ERRNO_CODES.EINPROGRESS);
        },listen:function (sock, backlog) {
          if (!ENVIRONMENT_IS_NODE) {
            throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
          }
          if (sock.server) {
             throw new FS.ErrnoError(ERRNO_CODES.EINVAL);  // already listening
          }
          var WebSocketServer = require('ws').Server;
          var host = sock.saddr;
          sock.server = new WebSocketServer({
            host: host,
            port: sock.sport
            // TODO support backlog
          });
  
          sock.server.on('connection', function(ws) {
            if (sock.type === 1) {
              var newsock = SOCKFS.createSocket(sock.family, sock.type, sock.protocol);
  
              // create a peer on the new socket
              var peer = SOCKFS.websocket_sock_ops.createPeer(newsock, ws);
              newsock.daddr = peer.addr;
              newsock.dport = peer.port;
  
              // push to queue for accept to pick up
              sock.pending.push(newsock);
            } else {
              // create a peer on the listen socket so calling sendto
              // with the listen socket and an address will resolve
              // to the correct client
              SOCKFS.websocket_sock_ops.createPeer(sock, ws);
            }
          });
          sock.server.on('closed', function() {
            sock.server = null;
          });
          sock.server.on('error', function() {
            // don't throw
          });
        },accept:function (listensock) {
          if (!listensock.server) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          var newsock = listensock.pending.shift();
          newsock.stream.flags = listensock.stream.flags;
          return newsock;
        },getname:function (sock, peer) {
          var addr, port;
          if (peer) {
            if (sock.daddr === undefined || sock.dport === undefined) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
            }
            addr = sock.daddr;
            port = sock.dport;
          } else {
            // TODO saddr and sport will be set for bind()'d UDP sockets, but what
            // should we be returning for TCP sockets that've been connect()'d?
            addr = sock.saddr || 0;
            port = sock.sport || 0;
          }
          return { addr: addr, port: port };
        },sendmsg:function (sock, buffer, offset, length, addr, port) {
          if (sock.type === 2) {
            // connection-less sockets will honor the message address,
            // and otherwise fall back to the bound destination address
            if (addr === undefined || port === undefined) {
              addr = sock.daddr;
              port = sock.dport;
            }
            // if there was no address to fall back to, error out
            if (addr === undefined || port === undefined) {
              throw new FS.ErrnoError(ERRNO_CODES.EDESTADDRREQ);
            }
          } else {
            // connection-based sockets will only use the bound
            addr = sock.daddr;
            port = sock.dport;
          }
  
          // find the peer for the destination address
          var dest = SOCKFS.websocket_sock_ops.getPeer(sock, addr, port);
  
          // early out if not connected with a connection-based socket
          if (sock.type === 1) {
            if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
            } else if (dest.socket.readyState === dest.socket.CONNECTING) {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
          }
  
          // create a copy of the incoming data to send, as the WebSocket API
          // doesn't work entirely with an ArrayBufferView, it'll just send
          // the entire underlying buffer
          var data;
          if (buffer instanceof Array || buffer instanceof ArrayBuffer) {
            data = buffer.slice(offset, offset + length);
          } else {  // ArrayBufferView
            data = buffer.buffer.slice(buffer.byteOffset + offset, buffer.byteOffset + offset + length);
          }
  
          // if we're emulating a connection-less dgram socket and don't have
          // a cached connection, queue the buffer to send upon connect and
          // lie, saying the data was sent now.
          if (sock.type === 2) {
            if (!dest || dest.socket.readyState !== dest.socket.OPEN) {
              // if we're not connected, open a new connection
              if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
                dest = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
              }
              dest.dgram_send_queue.push(data);
              return length;
            }
          }
  
          try {
            // send the actual data
            dest.socket.send(data);
            return length;
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
        },recvmsg:function (sock, length) {
          // http://pubs.opengroup.org/onlinepubs/7908799/xns/recvmsg.html
          if (sock.type === 1 && sock.server) {
            // tcp servers should not be recv()'ing on the listen socket
            throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
          }
  
          var queued = sock.recv_queue.shift();
          if (!queued) {
            if (sock.type === 1) {
              var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
  
              if (!dest) {
                // if we have a destination address but are not connected, error out
                throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
              }
              else if (dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
                // return null if the socket has closed
                return null;
              }
              else {
                // else, our socket is in a valid state but truly has nothing available
                throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
              }
            } else {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
          }
  
          // queued.data will be an ArrayBuffer if it's unadulterated, but if it's
          // requeued TCP data it'll be an ArrayBufferView
          var queuedLength = queued.data.byteLength || queued.data.length;
          var queuedOffset = queued.data.byteOffset || 0;
          var queuedBuffer = queued.data.buffer || queued.data;
          var bytesRead = Math.min(length, queuedLength);
          var res = {
            buffer: new Uint8Array(queuedBuffer, queuedOffset, bytesRead),
            addr: queued.addr,
            port: queued.port
          };
  
  
          // push back any unread data for TCP connections
          if (sock.type === 1 && bytesRead < queuedLength) {
            var bytesRemaining = queuedLength - bytesRead;
            queued.data = new Uint8Array(queuedBuffer, queuedOffset + bytesRead, bytesRemaining);
            sock.recv_queue.unshift(queued);
          }
  
          return res;
        }}};function _send(fd, buf, len, flags) {
      var sock = SOCKFS.getSocket(fd);
      if (!sock) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
      // TODO honor flags
      return _write(fd, buf, len);
    }
  
  function _pwrite(fildes, buf, nbyte, offset) {
      // ssize_t pwrite(int fildes, const void *buf, size_t nbyte, off_t offset);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/write.html
      var stream = FS.getStream(fildes);
      if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
      try {
        var slab = HEAP8;
        return FS.write(stream, slab, buf, nbyte, offset);
      } catch (e) {
        FS.handleFSError(e);
        return -1;
      }
    }function _write(fildes, buf, nbyte) {
      // ssize_t write(int fildes, const void *buf, size_t nbyte);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/write.html
      var stream = FS.getStream(fildes);
      if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
  
  
      try {
        var slab = HEAP8;
        return FS.write(stream, slab, buf, nbyte);
      } catch (e) {
        FS.handleFSError(e);
        return -1;
      }
    }
  
  function _fileno(stream) {
      // int fileno(FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fileno.html
      stream = FS.getStreamFromPtr(stream);
      if (!stream) return -1;
      return stream.fd;
    }function _fwrite(ptr, size, nitems, stream) {
      // size_t fwrite(const void *restrict ptr, size_t size, size_t nitems, FILE *restrict stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fwrite.html
      var bytesToWrite = nitems * size;
      if (bytesToWrite == 0) return 0;
      var fd = _fileno(stream);
      var bytesWritten = _write(fd, ptr, bytesToWrite);
      if (bytesWritten == -1) {
        var streamObj = FS.getStreamFromPtr(stream);
        if (streamObj) streamObj.error = true;
        return 0;
      } else {
        return Math.floor(bytesWritten / size);
      }
    }

  
  function _strtoll(str, endptr, base) {
      return __parseInt64(str, endptr, base, '-9223372036854775808', '9223372036854775807');  // LLONG_MIN, LLONG_MAX.
    }function _strtoll_l(str, endptr, base) {
      return _strtoll(str, endptr, base); // no locale support yet
    }

  var _llvm_pow_f32=Math_pow;

  function _log10(x) {
      return Math.log(x) / Math.LN10;
    }


   
  Module["_memset"] = _memset;

  function _pthread_cond_broadcast() {
      return 0;
    }

  
  
  function __isLeapYear(year) {
        return year%4 === 0 && (year%100 !== 0 || year%400 === 0);
    }
  
  function __arraySum(array, index) {
      var sum = 0;
      for (var i = 0; i <= index; sum += array[i++]);
      return sum;
    }
  
  
  var __MONTH_DAYS_LEAP=[31,29,31,30,31,30,31,31,30,31,30,31];
  
  var __MONTH_DAYS_REGULAR=[31,28,31,30,31,30,31,31,30,31,30,31];function __addDays(date, days) {
      var newDate = new Date(date.getTime());
      while(days > 0) {
        var leap = __isLeapYear(newDate.getFullYear());
        var currentMonth = newDate.getMonth();
        var daysInCurrentMonth = (leap ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR)[currentMonth];
  
        if (days > daysInCurrentMonth-newDate.getDate()) {
          // we spill over to next month
          days -= (daysInCurrentMonth-newDate.getDate()+1);
          newDate.setDate(1);
          if (currentMonth < 11) {
            newDate.setMonth(currentMonth+1)
          } else {
            newDate.setMonth(0);
            newDate.setFullYear(newDate.getFullYear()+1);
          }
        } else {
          // we stay in current month 
          newDate.setDate(newDate.getDate()+days);
          return newDate;
        }
      }
  
      return newDate;
    }function _strftime(s, maxsize, format, tm) {
      // size_t strftime(char *restrict s, size_t maxsize, const char *restrict format, const struct tm *restrict timeptr);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/strftime.html
      
      var date = {
        tm_sec: HEAP32[((tm)>>2)],
        tm_min: HEAP32[(((tm)+(4))>>2)],
        tm_hour: HEAP32[(((tm)+(8))>>2)],
        tm_mday: HEAP32[(((tm)+(12))>>2)],
        tm_mon: HEAP32[(((tm)+(16))>>2)],
        tm_year: HEAP32[(((tm)+(20))>>2)],
        tm_wday: HEAP32[(((tm)+(24))>>2)],
        tm_yday: HEAP32[(((tm)+(28))>>2)],
        tm_isdst: HEAP32[(((tm)+(32))>>2)]
      };
  
      var pattern = Pointer_stringify(format);
  
      // expand format
      var EXPANSION_RULES_1 = {
        '%c': '%a %b %d %H:%M:%S %Y',     // Replaced by the locale's appropriate date and time representation - e.g., Mon Aug  3 14:02:01 2013
        '%D': '%m/%d/%y',                 // Equivalent to %m / %d / %y
        '%F': '%Y-%m-%d',                 // Equivalent to %Y - %m - %d
        '%h': '%b',                       // Equivalent to %b
        '%r': '%I:%M:%S %p',              // Replaced by the time in a.m. and p.m. notation
        '%R': '%H:%M',                    // Replaced by the time in 24-hour notation
        '%T': '%H:%M:%S',                 // Replaced by the time
        '%x': '%m/%d/%y',                 // Replaced by the locale's appropriate date representation
        '%X': '%H:%M:%S',                 // Replaced by the locale's appropriate date representation
      };
      for (var rule in EXPANSION_RULES_1) {
        pattern = pattern.replace(new RegExp(rule, 'g'), EXPANSION_RULES_1[rule]);
      }
  
      var WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
      function leadingSomething(value, digits, character) {
        var str = typeof value === 'number' ? value.toString() : (value || '');
        while (str.length < digits) {
          str = character[0]+str;
        }
        return str;
      };
  
      function leadingNulls(value, digits) {
        return leadingSomething(value, digits, '0');
      };
  
      function compareByDay(date1, date2) {
        function sgn(value) {
          return value < 0 ? -1 : (value > 0 ? 1 : 0);
        };
  
        var compare;
        if ((compare = sgn(date1.getFullYear()-date2.getFullYear())) === 0) {
          if ((compare = sgn(date1.getMonth()-date2.getMonth())) === 0) {
            compare = sgn(date1.getDate()-date2.getDate());
          }
        }
        return compare;
      };
  
      function getFirstWeekStartDate(janFourth) {
          switch (janFourth.getDay()) {
            case 0: // Sunday
              return new Date(janFourth.getFullYear()-1, 11, 29);
            case 1: // Monday
              return janFourth;
            case 2: // Tuesday
              return new Date(janFourth.getFullYear(), 0, 3);
            case 3: // Wednesday
              return new Date(janFourth.getFullYear(), 0, 2);
            case 4: // Thursday
              return new Date(janFourth.getFullYear(), 0, 1);
            case 5: // Friday
              return new Date(janFourth.getFullYear()-1, 11, 31);
            case 6: // Saturday
              return new Date(janFourth.getFullYear()-1, 11, 30);
          }
      };
  
      function getWeekBasedYear(date) {
          var thisDate = __addDays(new Date(date.tm_year+1900, 0, 1), date.tm_yday);
  
          var janFourthThisYear = new Date(thisDate.getFullYear(), 0, 4);
          var janFourthNextYear = new Date(thisDate.getFullYear()+1, 0, 4);
  
          var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
          var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
  
          if (compareByDay(firstWeekStartThisYear, thisDate) <= 0) {
            // this date is after the start of the first week of this year
            if (compareByDay(firstWeekStartNextYear, thisDate) <= 0) {
              return thisDate.getFullYear()+1;
            } else {
              return thisDate.getFullYear();
            }
          } else { 
            return thisDate.getFullYear()-1;
          }
      };
  
      var EXPANSION_RULES_2 = {
        '%a': function(date) {
          return WEEKDAYS[date.tm_wday].substring(0,3);
        },
        '%A': function(date) {
          return WEEKDAYS[date.tm_wday];
        },
        '%b': function(date) {
          return MONTHS[date.tm_mon].substring(0,3);
        },
        '%B': function(date) {
          return MONTHS[date.tm_mon];
        },
        '%C': function(date) {
          var year = date.tm_year+1900;
          return leadingNulls(Math.floor(year/100),2);
        },
        '%d': function(date) {
          return leadingNulls(date.tm_mday, 2);
        },
        '%e': function(date) {
          return leadingSomething(date.tm_mday, 2, ' ');
        },
        '%g': function(date) {
          // %g, %G, and %V give values according to the ISO 8601:2000 standard week-based year. 
          // In this system, weeks begin on a Monday and week 1 of the year is the week that includes 
          // January 4th, which is also the week that includes the first Thursday of the year, and 
          // is also the first week that contains at least four days in the year. 
          // If the first Monday of January is the 2nd, 3rd, or 4th, the preceding days are part of 
          // the last week of the preceding year; thus, for Saturday 2nd January 1999, 
          // %G is replaced by 1998 and %V is replaced by 53. If December 29th, 30th, 
          // or 31st is a Monday, it and any following days are part of week 1 of the following year. 
          // Thus, for Tuesday 30th December 1997, %G is replaced by 1998 and %V is replaced by 01.
          
          return getWeekBasedYear(date).toString().substring(2);
        },
        '%G': function(date) {
          return getWeekBasedYear(date);
        },
        '%H': function(date) {
          return leadingNulls(date.tm_hour, 2);
        },
        '%I': function(date) {
          return leadingNulls(date.tm_hour < 13 ? date.tm_hour : date.tm_hour-12, 2);
        },
        '%j': function(date) {
          // Day of the year (001-366)
          return leadingNulls(date.tm_mday+__arraySum(__isLeapYear(date.tm_year+1900) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, date.tm_mon-1), 3);
        },
        '%m': function(date) {
          return leadingNulls(date.tm_mon+1, 2);
        },
        '%M': function(date) {
          return leadingNulls(date.tm_min, 2);
        },
        '%n': function() {
          return '\n';
        },
        '%p': function(date) {
          if (date.tm_hour > 0 && date.tm_hour < 13) {
            return 'AM';
          } else {
            return 'PM';
          }
        },
        '%S': function(date) {
          return leadingNulls(date.tm_sec, 2);
        },
        '%t': function() {
          return '\t';
        },
        '%u': function(date) {
          var day = new Date(date.tm_year+1900, date.tm_mon+1, date.tm_mday, 0, 0, 0, 0);
          return day.getDay() || 7;
        },
        '%U': function(date) {
          // Replaced by the week number of the year as a decimal number [00,53]. 
          // The first Sunday of January is the first day of week 1; 
          // days in the new year before this are in week 0. [ tm_year, tm_wday, tm_yday]
          var janFirst = new Date(date.tm_year+1900, 0, 1);
          var firstSunday = janFirst.getDay() === 0 ? janFirst : __addDays(janFirst, 7-janFirst.getDay());
          var endDate = new Date(date.tm_year+1900, date.tm_mon, date.tm_mday);
          
          // is target date after the first Sunday?
          if (compareByDay(firstSunday, endDate) < 0) {
            // calculate difference in days between first Sunday and endDate
            var februaryFirstUntilEndMonth = __arraySum(__isLeapYear(endDate.getFullYear()) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, endDate.getMonth()-1)-31;
            var firstSundayUntilEndJanuary = 31-firstSunday.getDate();
            var days = firstSundayUntilEndJanuary+februaryFirstUntilEndMonth+endDate.getDate();
            return leadingNulls(Math.ceil(days/7), 2);
          }
  
          return compareByDay(firstSunday, janFirst) === 0 ? '01': '00';
        },
        '%V': function(date) {
          // Replaced by the week number of the year (Monday as the first day of the week) 
          // as a decimal number [01,53]. If the week containing 1 January has four 
          // or more days in the new year, then it is considered week 1. 
          // Otherwise, it is the last week of the previous year, and the next week is week 1. 
          // Both January 4th and the first Thursday of January are always in week 1. [ tm_year, tm_wday, tm_yday]
          var janFourthThisYear = new Date(date.tm_year+1900, 0, 4);
          var janFourthNextYear = new Date(date.tm_year+1901, 0, 4);
  
          var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
          var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
  
          var endDate = __addDays(new Date(date.tm_year+1900, 0, 1), date.tm_yday);
  
          if (compareByDay(endDate, firstWeekStartThisYear) < 0) {
            // if given date is before this years first week, then it belongs to the 53rd week of last year
            return '53';
          } 
  
          if (compareByDay(firstWeekStartNextYear, endDate) <= 0) {
            // if given date is after next years first week, then it belongs to the 01th week of next year
            return '01';
          }
  
          // given date is in between CW 01..53 of this calendar year
          var daysDifference;
          if (firstWeekStartThisYear.getFullYear() < date.tm_year+1900) {
            // first CW of this year starts last year
            daysDifference = date.tm_yday+32-firstWeekStartThisYear.getDate()
          } else {
            // first CW of this year starts this year
            daysDifference = date.tm_yday+1-firstWeekStartThisYear.getDate();
          }
          return leadingNulls(Math.ceil(daysDifference/7), 2);
        },
        '%w': function(date) {
          var day = new Date(date.tm_year+1900, date.tm_mon+1, date.tm_mday, 0, 0, 0, 0);
          return day.getDay();
        },
        '%W': function(date) {
          // Replaced by the week number of the year as a decimal number [00,53]. 
          // The first Monday of January is the first day of week 1; 
          // days in the new year before this are in week 0. [ tm_year, tm_wday, tm_yday]
          var janFirst = new Date(date.tm_year, 0, 1);
          var firstMonday = janFirst.getDay() === 1 ? janFirst : __addDays(janFirst, janFirst.getDay() === 0 ? 1 : 7-janFirst.getDay()+1);
          var endDate = new Date(date.tm_year+1900, date.tm_mon, date.tm_mday);
  
          // is target date after the first Monday?
          if (compareByDay(firstMonday, endDate) < 0) {
            var februaryFirstUntilEndMonth = __arraySum(__isLeapYear(endDate.getFullYear()) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, endDate.getMonth()-1)-31;
            var firstMondayUntilEndJanuary = 31-firstMonday.getDate();
            var days = firstMondayUntilEndJanuary+februaryFirstUntilEndMonth+endDate.getDate();
            return leadingNulls(Math.ceil(days/7), 2);
          }
          return compareByDay(firstMonday, janFirst) === 0 ? '01': '00';
        },
        '%y': function(date) {
          // Replaced by the last two digits of the year as a decimal number [00,99]. [ tm_year]
          return (date.tm_year+1900).toString().substring(2);
        },
        '%Y': function(date) {
          // Replaced by the year as a decimal number (for example, 1997). [ tm_year]
          return date.tm_year+1900;
        },
        '%z': function(date) {
          // Replaced by the offset from UTC in the ISO 8601:2000 standard format ( +hhmm or -hhmm ),
          // or by no characters if no timezone is determinable. 
          // For example, "-0430" means 4 hours 30 minutes behind UTC (west of Greenwich). 
          // If tm_isdst is zero, the standard time offset is used. 
          // If tm_isdst is greater than zero, the daylight savings time offset is used. 
          // If tm_isdst is negative, no characters are returned. 
          // FIXME: we cannot determine time zone (or can we?)
          return '';
        },
        '%Z': function(date) {
          // Replaced by the timezone name or abbreviation, or by no bytes if no timezone information exists. [ tm_isdst]
          // FIXME: we cannot determine time zone (or can we?)
          return '';
        },
        '%%': function() {
          return '%';
        }
      };
      for (var rule in EXPANSION_RULES_2) {
        if (pattern.indexOf(rule) >= 0) {
          pattern = pattern.replace(new RegExp(rule, 'g'), EXPANSION_RULES_2[rule](date));
        }
      }
  
      var bytes = intArrayFromString(pattern, false);
      if (bytes.length > maxsize) {
        return 0;
      } 
  
      writeArrayToMemory(bytes, s);
      return bytes.length-1;
    }function _strftime_l(s, maxsize, format, tm) {
      return _strftime(s, maxsize, format, tm); // no locale support yet
    }

  
  
  function __exit(status) {
      // void _exit(int status);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/exit.html
      Module['exit'](status);
    }function _exit(status) {
      __exit(status);
    }function __ZSt9terminatev() {
      _exit(-1234);
    }

  function _pthread_mutex_unlock() {}

  
  function _isxdigit(chr) {
      return (chr >= 48 && chr <= 57) ||
             (chr >= 97 && chr <= 102) ||
             (chr >= 65 && chr <= 70);
    }function _isxdigit_l(chr) {
      return _isxdigit(chr); // no locale support yet
    }

  
  function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.set(HEAPU8.subarray(src, src+num), dest);
      return dest;
    } 
  Module["_memcpy"] = _memcpy;

  function _sbrk(bytes) {
      // Implement a Linux-like 'memory area' for our 'process'.
      // Changes the size of the memory area by |bytes|; returns the
      // address of the previous top ('break') of the memory area
      // We control the "dynamic" memory - DYNAMIC_BASE to DYNAMICTOP
      var self = _sbrk;
      if (!self.called) {
        DYNAMICTOP = alignMemoryPage(DYNAMICTOP); // make sure we start out aligned
        self.called = true;
        assert(Runtime.dynamicAlloc);
        self.alloc = Runtime.dynamicAlloc;
        Runtime.dynamicAlloc = function() { abort('cannot dynamically allocate, sbrk now has control') };
      }
      var ret = DYNAMICTOP;
      if (bytes != 0) self.alloc(bytes);
      return ret;  // Previous break location.
    }

   
  Module["_bitshift64Shl"] = _bitshift64Shl;

  function _newlocale(mask, locale, base) {
      return _malloc(4);
    }

   
  Module["_memmove"] = _memmove;

  function ___errno_location() {
      return ___errno_state;
    }

  var _BItoD=true;

  function _catclose(catd) {
      // int catclose (nl_catd catd)
      return 0;
    }

  function _fmod(x, y) {
      return x % y;
    }

  var _tanf=Math_tan;

  function _ungetc(c, stream) {
      // int ungetc(int c, FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/ungetc.html
      stream = FS.getStreamFromPtr(stream);
      if (!stream) {
        return -1;
      }
      if (c === -1) {
        // do nothing for EOF character
        return c;
      }
      c = unSign(c & 0xFF);
      stream.ungotten.push(c);
      stream.eof = false;
      return c;
    }

  var _expf=Math_exp;

  function _uselocale(locale) {
      return 0;
    }

  var _cosf=Math_cos;

  
  
  
  function __getFloat(text) {
      return /^[+-]?[0-9]*\.?[0-9]+([eE][+-]?[0-9]+)?/.exec(text);
    }function __scanString(format, get, unget, varargs) {
      if (!__scanString.whiteSpace) {
        __scanString.whiteSpace = {};
        __scanString.whiteSpace[32] = 1;
        __scanString.whiteSpace[9] = 1;
        __scanString.whiteSpace[10] = 1;
        __scanString.whiteSpace[11] = 1;
        __scanString.whiteSpace[12] = 1;
        __scanString.whiteSpace[13] = 1;
      }
      // Supports %x, %4x, %d.%d, %lld, %s, %f, %lf.
      // TODO: Support all format specifiers.
      format = Pointer_stringify(format);
      var soFar = 0;
      if (format.indexOf('%n') >= 0) {
        // need to track soFar
        var _get = get;
        get = function get() {
          soFar++;
          return _get();
        }
        var _unget = unget;
        unget = function unget() {
          soFar--;
          return _unget();
        }
      }
      var formatIndex = 0;
      var argsi = 0;
      var fields = 0;
      var argIndex = 0;
      var next;
  
      mainLoop:
      for (var formatIndex = 0; formatIndex < format.length;) {
        if (format[formatIndex] === '%' && format[formatIndex+1] == 'n') {
          var argPtr = HEAP32[(((varargs)+(argIndex))>>2)];
          argIndex += Runtime.getAlignSize('void*', null, true);
          HEAP32[((argPtr)>>2)]=soFar;
          formatIndex += 2;
          continue;
        }
  
        if (format[formatIndex] === '%') {
          var nextC = format.indexOf('c', formatIndex+1);
          if (nextC > 0) {
            var maxx = 1;
            if (nextC > formatIndex+1) {
              var sub = format.substring(formatIndex+1, nextC);
              maxx = parseInt(sub);
              if (maxx != sub) maxx = 0;
            }
            if (maxx) {
              var argPtr = HEAP32[(((varargs)+(argIndex))>>2)];
              argIndex += Runtime.getAlignSize('void*', null, true);
              fields++;
              for (var i = 0; i < maxx; i++) {
                next = get();
                HEAP8[((argPtr++)|0)]=next;
                if (next === 0) return i > 0 ? fields : fields-1; // we failed to read the full length of this field
              }
              formatIndex += nextC - formatIndex + 1;
              continue;
            }
          }
        }
  
        // handle %[...]
        if (format[formatIndex] === '%' && format.indexOf('[', formatIndex+1) > 0) {
          var match = /\%([0-9]*)\[(\^)?(\]?[^\]]*)\]/.exec(format.substring(formatIndex));
          if (match) {
            var maxNumCharacters = parseInt(match[1]) || Infinity;
            var negateScanList = (match[2] === '^');
            var scanList = match[3];
  
            // expand "middle" dashs into character sets
            var middleDashMatch;
            while ((middleDashMatch = /([^\-])\-([^\-])/.exec(scanList))) {
              var rangeStartCharCode = middleDashMatch[1].charCodeAt(0);
              var rangeEndCharCode = middleDashMatch[2].charCodeAt(0);
              for (var expanded = ''; rangeStartCharCode <= rangeEndCharCode; expanded += String.fromCharCode(rangeStartCharCode++));
              scanList = scanList.replace(middleDashMatch[1] + '-' + middleDashMatch[2], expanded);
            }
  
            var argPtr = HEAP32[(((varargs)+(argIndex))>>2)];
            argIndex += Runtime.getAlignSize('void*', null, true);
            fields++;
  
            for (var i = 0; i < maxNumCharacters; i++) {
              next = get();
              if (negateScanList) {
                if (scanList.indexOf(String.fromCharCode(next)) < 0) {
                  HEAP8[((argPtr++)|0)]=next;
                } else {
                  unget();
                  break;
                }
              } else {
                if (scanList.indexOf(String.fromCharCode(next)) >= 0) {
                  HEAP8[((argPtr++)|0)]=next;
                } else {
                  unget();
                  break;
                }
              }
            }
  
            // write out null-terminating character
            HEAP8[((argPtr++)|0)]=0;
            formatIndex += match[0].length;
            
            continue;
          }
        }      
        // remove whitespace
        while (1) {
          next = get();
          if (next == 0) return fields;
          if (!(next in __scanString.whiteSpace)) break;
        }
        unget();
  
        if (format[formatIndex] === '%') {
          formatIndex++;
          var suppressAssignment = false;
          if (format[formatIndex] == '*') {
            suppressAssignment = true;
            formatIndex++;
          }
          var maxSpecifierStart = formatIndex;
          while (format[formatIndex].charCodeAt(0) >= 48 &&
                 format[formatIndex].charCodeAt(0) <= 57) {
            formatIndex++;
          }
          var max_;
          if (formatIndex != maxSpecifierStart) {
            max_ = parseInt(format.slice(maxSpecifierStart, formatIndex), 10);
          }
          var long_ = false;
          var half = false;
          var longLong = false;
          if (format[formatIndex] == 'l') {
            long_ = true;
            formatIndex++;
            if (format[formatIndex] == 'l') {
              longLong = true;
              formatIndex++;
            }
          } else if (format[formatIndex] == 'h') {
            half = true;
            formatIndex++;
          }
          var type = format[formatIndex];
          formatIndex++;
          var curr = 0;
          var buffer = [];
          // Read characters according to the format. floats are trickier, they may be in an unfloat state in the middle, then be a valid float later
          if (type == 'f' || type == 'e' || type == 'g' ||
              type == 'F' || type == 'E' || type == 'G') {
            next = get();
            while (next > 0 && (!(next in __scanString.whiteSpace)))  {
              buffer.push(String.fromCharCode(next));
              next = get();
            }
            var m = __getFloat(buffer.join(''));
            var last = m ? m[0].length : 0;
            for (var i = 0; i < buffer.length - last + 1; i++) {
              unget();
            }
            buffer.length = last;
          } else {
            next = get();
            var first = true;
            
            // Strip the optional 0x prefix for %x.
            if ((type == 'x' || type == 'X') && (next == 48)) {
              var peek = get();
              if (peek == 120 || peek == 88) {
                next = get();
              } else {
                unget();
              }
            }
            
            while ((curr < max_ || isNaN(max_)) && next > 0) {
              if (!(next in __scanString.whiteSpace) && // stop on whitespace
                  (type == 's' ||
                   ((type === 'd' || type == 'u' || type == 'i') && ((next >= 48 && next <= 57) ||
                                                                     (first && next == 45))) ||
                   ((type === 'x' || type === 'X') && (next >= 48 && next <= 57 ||
                                     next >= 97 && next <= 102 ||
                                     next >= 65 && next <= 70))) &&
                  (formatIndex >= format.length || next !== format[formatIndex].charCodeAt(0))) { // Stop when we read something that is coming up
                buffer.push(String.fromCharCode(next));
                next = get();
                curr++;
                first = false;
              } else {
                break;
              }
            }
            unget();
          }
          if (buffer.length === 0) return 0;  // Failure.
          if (suppressAssignment) continue;
  
          var text = buffer.join('');
          var argPtr = HEAP32[(((varargs)+(argIndex))>>2)];
          argIndex += Runtime.getAlignSize('void*', null, true);
          switch (type) {
            case 'd': case 'u': case 'i':
              if (half) {
                HEAP16[((argPtr)>>1)]=parseInt(text, 10);
              } else if (longLong) {
                (tempI64 = [parseInt(text, 10)>>>0,(tempDouble=parseInt(text, 10),(+(Math_abs(tempDouble))) >= (+1) ? (tempDouble > (+0) ? ((Math_min((+(Math_floor((tempDouble)/(+4294967296)))), (+4294967295)))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/(+4294967296))))))>>>0) : 0)],HEAP32[((argPtr)>>2)]=tempI64[0],HEAP32[(((argPtr)+(4))>>2)]=tempI64[1]);
              } else {
                HEAP32[((argPtr)>>2)]=parseInt(text, 10);
              }
              break;
            case 'X':
            case 'x':
              HEAP32[((argPtr)>>2)]=parseInt(text, 16);
              break;
            case 'F':
            case 'f':
            case 'E':
            case 'e':
            case 'G':
            case 'g':
            case 'E':
              // fallthrough intended
              if (long_) {
                HEAPF64[((argPtr)>>3)]=parseFloat(text);
              } else {
                HEAPF32[((argPtr)>>2)]=parseFloat(text);
              }
              break;
            case 's':
              var array = intArrayFromString(text);
              for (var j = 0; j < array.length; j++) {
                HEAP8[(((argPtr)+(j))|0)]=array[j];
              }
              break;
          }
          fields++;
        } else if (format[formatIndex].charCodeAt(0) in __scanString.whiteSpace) {
          next = get();
          while (next in __scanString.whiteSpace) {
            if (next <= 0) break mainLoop;  // End of input.
            next = get();
          }
          unget(next);
          formatIndex++;
        } else {
          // Not a specifier.
          next = get();
          if (format[formatIndex].charCodeAt(0) !== next) {
            unget(next);
            break mainLoop;
          }
          formatIndex++;
        }
      }
      return fields;
    }function _sscanf(s, format, varargs) {
      // int sscanf(const char *restrict s, const char *restrict format, ... );
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/scanf.html
      var index = 0;
      function get() { return HEAP8[(((s)+(index++))|0)]; };
      function unget() { index--; };
      return __scanString(format, get, unget, varargs);
    }function _vsscanf(s, format, va_arg) {
      return _sscanf(s, format, HEAP32[((va_arg)>>2)]);
    }



  
  
  
  function _recv(fd, buf, len, flags) {
      var sock = SOCKFS.getSocket(fd);
      if (!sock) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
      // TODO honor flags
      return _read(fd, buf, len);
    }
  
  function _pread(fildes, buf, nbyte, offset) {
      // ssize_t pread(int fildes, void *buf, size_t nbyte, off_t offset);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/read.html
      var stream = FS.getStream(fildes);
      if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
      try {
        var slab = HEAP8;
        return FS.read(stream, slab, buf, nbyte, offset);
      } catch (e) {
        FS.handleFSError(e);
        return -1;
      }
    }function _read(fildes, buf, nbyte) {
      // ssize_t read(int fildes, void *buf, size_t nbyte);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/read.html
      var stream = FS.getStream(fildes);
      if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
  
  
      try {
        var slab = HEAP8;
        return FS.read(stream, slab, buf, nbyte);
      } catch (e) {
        FS.handleFSError(e);
        return -1;
      }
    }function _fread(ptr, size, nitems, stream) {
      // size_t fread(void *restrict ptr, size_t size, size_t nitems, FILE *restrict stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fread.html
      var bytesToRead = nitems * size;
      if (bytesToRead == 0) {
        return 0;
      }
      var bytesRead = 0;
      var streamObj = FS.getStreamFromPtr(stream);
      if (!streamObj) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return 0;
      }
      while (streamObj.ungotten.length && bytesToRead > 0) {
        HEAP8[((ptr++)|0)]=streamObj.ungotten.pop();
        bytesToRead--;
        bytesRead++;
      }
      var err = _read(streamObj.fd, ptr, bytesToRead);
      if (err == -1) {
        if (streamObj) streamObj.error = true;
        return 0;
      }
      bytesRead += err;
      if (bytesRead < bytesToRead) streamObj.eof = true;
      return Math.floor(bytesRead / size);
    }function _fgetc(stream) {
      // int fgetc(FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fgetc.html
      var streamObj = FS.getStreamFromPtr(stream);
      if (!streamObj) return -1;
      if (streamObj.eof || streamObj.error) return -1;
      var ret = _fread(_fgetc.ret, 1, 1, stream);
      if (ret == 0) {
        return -1;
      } else if (ret == -1) {
        streamObj.error = true;
        return -1;
      } else {
        return HEAPU8[((_fgetc.ret)|0)];
      }
    }

  var _log10f=_log10;

  
  function _strerror_r(errnum, strerrbuf, buflen) {
      if (errnum in ERRNO_MESSAGES) {
        if (ERRNO_MESSAGES[errnum].length > buflen - 1) {
          return ___setErrNo(ERRNO_CODES.ERANGE);
        } else {
          var msg = ERRNO_MESSAGES[errnum];
          writeAsciiToMemory(msg, strerrbuf);
          return 0;
        }
      } else {
        return ___setErrNo(ERRNO_CODES.EINVAL);
      }
    }function _strerror(errnum) {
      if (!_strerror.buffer) _strerror.buffer = _malloc(256);
      _strerror_r(errnum, _strerror.buffer, 256);
      return _strerror.buffer;
    }


  function _abort() {
      Module['abort']();
    }


  function _pthread_cond_wait() {
      return 0;
    }

  
  function _isdigit(chr) {
      return chr >= 48 && chr <= 57;
    }function _isdigit_l(chr) {
      return _isdigit(chr); // no locale support yet
    }

  
  function _exp2(x) {
      return Math.pow(2, x);
    }var _exp2f=_exp2;

  var _fabs=Math_abs;

  var _getc=_fgetc;

  var Browser={mainLoop:{scheduler:null,method:"",shouldPause:false,paused:false,queue:[],pause:function () {
          Browser.mainLoop.shouldPause = true;
        },resume:function () {
          if (Browser.mainLoop.paused) {
            Browser.mainLoop.paused = false;
            Browser.mainLoop.scheduler();
          }
          Browser.mainLoop.shouldPause = false;
        },updateStatus:function () {
          if (Module['setStatus']) {
            var message = Module['statusMessage'] || 'Please wait...';
            var remaining = Browser.mainLoop.remainingBlockers;
            var expected = Browser.mainLoop.expectedBlockers;
            if (remaining) {
              if (remaining < expected) {
                Module['setStatus'](message + ' (' + (expected - remaining) + '/' + expected + ')');
              } else {
                Module['setStatus'](message);
              }
            } else {
              Module['setStatus']('');
            }
          }
        }},isFullScreen:false,pointerLock:false,moduleContextCreatedCallbacks:[],workers:[],init:function () {
        if (!Module["preloadPlugins"]) Module["preloadPlugins"] = []; // needs to exist even in workers
  
        if (Browser.initted || ENVIRONMENT_IS_WORKER) return;
        Browser.initted = true;
  
        try {
          new Blob();
          Browser.hasBlobConstructor = true;
        } catch(e) {
          Browser.hasBlobConstructor = false;
          console.log("warning: no blob constructor, cannot create blobs with mimetypes");
        }
        Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : (typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : (!Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null));
        Browser.URLObject = typeof window != "undefined" ? (window.URL ? window.URL : window.webkitURL) : undefined;
        if (!Module.noImageDecoding && typeof Browser.URLObject === 'undefined') {
          console.log("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available.");
          Module.noImageDecoding = true;
        }
  
        // Support for plugins that can process preloaded files. You can add more of these to
        // your app by creating and appending to Module.preloadPlugins.
        //
        // Each plugin is asked if it can handle a file based on the file's name. If it can,
        // it is given the file's raw data. When it is done, it calls a callback with the file's
        // (possibly modified) data. For example, a plugin might decompress a file, or it
        // might create some side data structure for use later (like an Image element, etc.).
  
        var imagePlugin = {};
        imagePlugin['canHandle'] = function imagePlugin_canHandle(name) {
          return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name);
        };
        imagePlugin['handle'] = function imagePlugin_handle(byteArray, name, onload, onerror) {
          var b = null;
          if (Browser.hasBlobConstructor) {
            try {
              b = new Blob([byteArray], { type: Browser.getMimetype(name) });
              if (b.size !== byteArray.length) { // Safari bug #118630
                // Safari's Blob can only take an ArrayBuffer
                b = new Blob([(new Uint8Array(byteArray)).buffer], { type: Browser.getMimetype(name) });
              }
            } catch(e) {
              Runtime.warnOnce('Blob constructor present but fails: ' + e + '; falling back to blob builder');
            }
          }
          if (!b) {
            var bb = new Browser.BlobBuilder();
            bb.append((new Uint8Array(byteArray)).buffer); // we need to pass a buffer, and must copy the array to get the right data range
            b = bb.getBlob();
          }
          var url = Browser.URLObject.createObjectURL(b);
          var img = new Image();
          img.onload = function img_onload() {
            assert(img.complete, 'Image ' + name + ' could not be decoded');
            var canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            Module["preloadedImages"][name] = canvas;
            Browser.URLObject.revokeObjectURL(url);
            if (onload) onload(byteArray);
          };
          img.onerror = function img_onerror(event) {
            console.log('Image ' + url + ' could not be decoded');
            if (onerror) onerror();
          };
          img.src = url;
        };
        Module['preloadPlugins'].push(imagePlugin);
  
        var audioPlugin = {};
        audioPlugin['canHandle'] = function audioPlugin_canHandle(name) {
          return !Module.noAudioDecoding && name.substr(-4) in { '.ogg': 1, '.wav': 1, '.mp3': 1 };
        };
        audioPlugin['handle'] = function audioPlugin_handle(byteArray, name, onload, onerror) {
          var done = false;
          function finish(audio) {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = audio;
            if (onload) onload(byteArray);
          }
          function fail() {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = new Audio(); // empty shim
            if (onerror) onerror();
          }
          if (Browser.hasBlobConstructor) {
            try {
              var b = new Blob([byteArray], { type: Browser.getMimetype(name) });
            } catch(e) {
              return fail();
            }
            var url = Browser.URLObject.createObjectURL(b); // XXX we never revoke this!
            var audio = new Audio();
            audio.addEventListener('canplaythrough', function() { finish(audio) }, false); // use addEventListener due to chromium bug 124926
            audio.onerror = function audio_onerror(event) {
              if (done) return;
              console.log('warning: browser could not fully decode audio ' + name + ', trying slower base64 approach');
              function encode64(data) {
                var BASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
                var PAD = '=';
                var ret = '';
                var leftchar = 0;
                var leftbits = 0;
                for (var i = 0; i < data.length; i++) {
                  leftchar = (leftchar << 8) | data[i];
                  leftbits += 8;
                  while (leftbits >= 6) {
                    var curr = (leftchar >> (leftbits-6)) & 0x3f;
                    leftbits -= 6;
                    ret += BASE[curr];
                  }
                }
                if (leftbits == 2) {
                  ret += BASE[(leftchar&3) << 4];
                  ret += PAD + PAD;
                } else if (leftbits == 4) {
                  ret += BASE[(leftchar&0xf) << 2];
                  ret += PAD;
                }
                return ret;
              }
              audio.src = 'data:audio/x-' + name.substr(-3) + ';base64,' + encode64(byteArray);
              finish(audio); // we don't wait for confirmation this worked - but it's worth trying
            };
            audio.src = url;
            // workaround for chrome bug 124926 - we do not always get oncanplaythrough or onerror
            Browser.safeSetTimeout(function() {
              finish(audio); // try to use it even though it is not necessarily ready to play
            }, 10000);
          } else {
            return fail();
          }
        };
        Module['preloadPlugins'].push(audioPlugin);
  
        // Canvas event setup
  
        var canvas = Module['canvas'];
        
        // forced aspect ratio can be enabled by defining 'forcedAspectRatio' on Module
        // Module['forcedAspectRatio'] = 4 / 3;
        
        canvas.requestPointerLock = canvas['requestPointerLock'] ||
                                    canvas['mozRequestPointerLock'] ||
                                    canvas['webkitRequestPointerLock'] ||
                                    canvas['msRequestPointerLock'] ||
                                    function(){};
        canvas.exitPointerLock = document['exitPointerLock'] ||
                                 document['mozExitPointerLock'] ||
                                 document['webkitExitPointerLock'] ||
                                 document['msExitPointerLock'] ||
                                 function(){}; // no-op if function does not exist
        canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
  
        function pointerLockChange() {
          Browser.pointerLock = document['pointerLockElement'] === canvas ||
                                document['mozPointerLockElement'] === canvas ||
                                document['webkitPointerLockElement'] === canvas ||
                                document['msPointerLockElement'] === canvas;
        }
  
        document.addEventListener('pointerlockchange', pointerLockChange, false);
        document.addEventListener('mozpointerlockchange', pointerLockChange, false);
        document.addEventListener('webkitpointerlockchange', pointerLockChange, false);
        document.addEventListener('mspointerlockchange', pointerLockChange, false);
  
        if (Module['elementPointerLock']) {
          canvas.addEventListener("click", function(ev) {
            if (!Browser.pointerLock && canvas.requestPointerLock) {
              canvas.requestPointerLock();
              ev.preventDefault();
            }
          }, false);
        }
      },createContext:function (canvas, useWebGL, setInModule, webGLContextAttributes) {
        var ctx;
        var errorInfo = '?';
        function onContextCreationError(event) {
          errorInfo = event.statusMessage || errorInfo;
        }
        try {
          if (useWebGL) {
            var contextAttributes = {
              antialias: false,
              alpha: false
            };
  
            if (webGLContextAttributes) {
              for (var attribute in webGLContextAttributes) {
                contextAttributes[attribute] = webGLContextAttributes[attribute];
              }
            }
  
  
            canvas.addEventListener('webglcontextcreationerror', onContextCreationError, false);
            try {
              ['experimental-webgl', 'webgl'].some(function(webglId) {
                return ctx = canvas.getContext(webglId, contextAttributes);
              });
            } finally {
              canvas.removeEventListener('webglcontextcreationerror', onContextCreationError, false);
            }
          } else {
            ctx = canvas.getContext('2d');
          }
          if (!ctx) throw ':(';
        } catch (e) {
          Module.print('Could not create canvas: ' + [errorInfo, e]);
          return null;
        }
        if (useWebGL) {
          // Set the background of the WebGL canvas to black
          canvas.style.backgroundColor = "black";
  
          // Warn on context loss
          canvas.addEventListener('webglcontextlost', function(event) {
            alert('WebGL context lost. You will need to reload the page.');
          }, false);
        }
        if (setInModule) {
          GLctx = Module.ctx = ctx;
          Module.useWebGL = useWebGL;
          Browser.moduleContextCreatedCallbacks.forEach(function(callback) { callback() });
          Browser.init();
        }
        return ctx;
      },destroyContext:function (canvas, useWebGL, setInModule) {},fullScreenHandlersInstalled:false,lockPointer:undefined,resizeCanvas:undefined,requestFullScreen:function (lockPointer, resizeCanvas) {
        Browser.lockPointer = lockPointer;
        Browser.resizeCanvas = resizeCanvas;
        if (typeof Browser.lockPointer === 'undefined') Browser.lockPointer = true;
        if (typeof Browser.resizeCanvas === 'undefined') Browser.resizeCanvas = false;
  
        var canvas = Module['canvas'];
        function fullScreenChange() {
          Browser.isFullScreen = false;
          var canvasContainer = canvas.parentNode;
          if ((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
               document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
               document['fullScreenElement'] || document['fullscreenElement'] ||
               document['msFullScreenElement'] || document['msFullscreenElement'] ||
               document['webkitCurrentFullScreenElement']) === canvasContainer) {
            canvas.cancelFullScreen = document['cancelFullScreen'] ||
                                      document['mozCancelFullScreen'] ||
                                      document['webkitCancelFullScreen'] ||
                                      document['msExitFullscreen'] ||
                                      document['exitFullscreen'] ||
                                      function() {};
            canvas.cancelFullScreen = canvas.cancelFullScreen.bind(document);
            if (Browser.lockPointer) canvas.requestPointerLock();
            Browser.isFullScreen = true;
            if (Browser.resizeCanvas) Browser.setFullScreenCanvasSize();
          } else {
            
            // remove the full screen specific parent of the canvas again to restore the HTML structure from before going full screen
            canvasContainer.parentNode.insertBefore(canvas, canvasContainer);
            canvasContainer.parentNode.removeChild(canvasContainer);
            
            if (Browser.resizeCanvas) Browser.setWindowedCanvasSize();
          }
          if (Module['onFullScreen']) Module['onFullScreen'](Browser.isFullScreen);
          Browser.updateCanvasDimensions(canvas);
        }
  
        if (!Browser.fullScreenHandlersInstalled) {
          Browser.fullScreenHandlersInstalled = true;
          document.addEventListener('fullscreenchange', fullScreenChange, false);
          document.addEventListener('mozfullscreenchange', fullScreenChange, false);
          document.addEventListener('webkitfullscreenchange', fullScreenChange, false);
          document.addEventListener('MSFullscreenChange', fullScreenChange, false);
        }
  
        // create a new parent to ensure the canvas has no siblings. this allows browsers to optimize full screen performance when its parent is the full screen root
        var canvasContainer = document.createElement("div");
        canvas.parentNode.insertBefore(canvasContainer, canvas);
        canvasContainer.appendChild(canvas);
        
        // use parent of canvas as full screen root to allow aspect ratio correction (Firefox stretches the root to screen size)
        canvasContainer.requestFullScreen = canvasContainer['requestFullScreen'] ||
                                            canvasContainer['mozRequestFullScreen'] ||
                                            canvasContainer['msRequestFullscreen'] ||
                                           (canvasContainer['webkitRequestFullScreen'] ? function() { canvasContainer['webkitRequestFullScreen'](Element['ALLOW_KEYBOARD_INPUT']) } : null);
        canvasContainer.requestFullScreen();
      },requestAnimationFrame:function requestAnimationFrame(func) {
        if (typeof window === 'undefined') { // Provide fallback to setTimeout if window is undefined (e.g. in Node.js)
          setTimeout(func, 1000/60);
        } else {
          if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = window['requestAnimationFrame'] ||
                                           window['mozRequestAnimationFrame'] ||
                                           window['webkitRequestAnimationFrame'] ||
                                           window['msRequestAnimationFrame'] ||
                                           window['oRequestAnimationFrame'] ||
                                           window['setTimeout'];
          }
          window.requestAnimationFrame(func);
        }
      },safeCallback:function (func) {
        return function() {
          if (!ABORT) return func.apply(null, arguments);
        };
      },safeRequestAnimationFrame:function (func) {
        return Browser.requestAnimationFrame(function() {
          if (!ABORT) func();
        });
      },safeSetTimeout:function (func, timeout) {
        return setTimeout(function() {
          if (!ABORT) func();
        }, timeout);
      },safeSetInterval:function (func, timeout) {
        return setInterval(function() {
          if (!ABORT) func();
        }, timeout);
      },getMimetype:function (name) {
        return {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'bmp': 'image/bmp',
          'ogg': 'audio/ogg',
          'wav': 'audio/wav',
          'mp3': 'audio/mpeg'
        }[name.substr(name.lastIndexOf('.')+1)];
      },getUserMedia:function (func) {
        if(!window.getUserMedia) {
          window.getUserMedia = navigator['getUserMedia'] ||
                                navigator['mozGetUserMedia'];
        }
        window.getUserMedia(func);
      },getMovementX:function (event) {
        return event['movementX'] ||
               event['mozMovementX'] ||
               event['webkitMovementX'] ||
               0;
      },getMovementY:function (event) {
        return event['movementY'] ||
               event['mozMovementY'] ||
               event['webkitMovementY'] ||
               0;
      },getMouseWheelDelta:function (event) {
        return Math.max(-1, Math.min(1, event.type === 'DOMMouseScroll' ? event.detail : -event.wheelDelta));
      },mouseX:0,mouseY:0,mouseMovementX:0,mouseMovementY:0,touches:{},lastTouches:{},calculateMouseEvent:function (event) { // event should be mousemove, mousedown or mouseup
        if (Browser.pointerLock) {
          // When the pointer is locked, calculate the coordinates
          // based on the movement of the mouse.
          // Workaround for Firefox bug 764498
          if (event.type != 'mousemove' &&
              ('mozMovementX' in event)) {
            Browser.mouseMovementX = Browser.mouseMovementY = 0;
          } else {
            Browser.mouseMovementX = Browser.getMovementX(event);
            Browser.mouseMovementY = Browser.getMovementY(event);
          }
          
          // check if SDL is available
          if (typeof SDL != "undefined") {
          	Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
          	Browser.mouseY = SDL.mouseY + Browser.mouseMovementY;
          } else {
          	// just add the mouse delta to the current absolut mouse position
          	// FIXME: ideally this should be clamped against the canvas size and zero
          	Browser.mouseX += Browser.mouseMovementX;
          	Browser.mouseY += Browser.mouseMovementY;
          }        
        } else {
          // Otherwise, calculate the movement based on the changes
          // in the coordinates.
          var rect = Module["canvas"].getBoundingClientRect();
          var cw = Module["canvas"].width;
          var ch = Module["canvas"].height;
  
          // Neither .scrollX or .pageXOffset are defined in a spec, but
          // we prefer .scrollX because it is currently in a spec draft.
          // (see: http://www.w3.org/TR/2013/WD-cssom-view-20131217/)
          var scrollX = ((typeof window.scrollX !== 'undefined') ? window.scrollX : window.pageXOffset);
          var scrollY = ((typeof window.scrollY !== 'undefined') ? window.scrollY : window.pageYOffset);
  
          if (event.type === 'touchstart' || event.type === 'touchend' || event.type === 'touchmove') {
            var touch = event.touch;
            if (touch === undefined) {
              return; // the "touch" property is only defined in SDL
  
            }
            var adjustedX = touch.pageX - (scrollX + rect.left);
            var adjustedY = touch.pageY - (scrollY + rect.top);
  
            adjustedX = adjustedX * (cw / rect.width);
            adjustedY = adjustedY * (ch / rect.height);
  
            var coords = { x: adjustedX, y: adjustedY };
            
            if (event.type === 'touchstart') {
              Browser.lastTouches[touch.identifier] = coords;
              Browser.touches[touch.identifier] = coords;
            } else if (event.type === 'touchend' || event.type === 'touchmove') {
              Browser.lastTouches[touch.identifier] = Browser.touches[touch.identifier];
              Browser.touches[touch.identifier] = { x: adjustedX, y: adjustedY };
            } 
            return;
          }
  
          var x = event.pageX - (scrollX + rect.left);
          var y = event.pageY - (scrollY + rect.top);
  
          // the canvas might be CSS-scaled compared to its backbuffer;
          // SDL-using content will want mouse coordinates in terms
          // of backbuffer units.
          x = x * (cw / rect.width);
          y = y * (ch / rect.height);
  
          Browser.mouseMovementX = x - Browser.mouseX;
          Browser.mouseMovementY = y - Browser.mouseY;
          Browser.mouseX = x;
          Browser.mouseY = y;
        }
      },xhrLoad:function (url, onload, onerror) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function xhr_onload() {
          if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
            onload(xhr.response);
          } else {
            onerror();
          }
        };
        xhr.onerror = onerror;
        xhr.send(null);
      },asyncLoad:function (url, onload, onerror, noRunDep) {
        Browser.xhrLoad(url, function(arrayBuffer) {
          assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
          onload(new Uint8Array(arrayBuffer));
          if (!noRunDep) removeRunDependency('al ' + url);
        }, function(event) {
          if (onerror) {
            onerror();
          } else {
            throw 'Loading data file "' + url + '" failed.';
          }
        });
        if (!noRunDep) addRunDependency('al ' + url);
      },resizeListeners:[],updateResizeListeners:function () {
        var canvas = Module['canvas'];
        Browser.resizeListeners.forEach(function(listener) {
          listener(canvas.width, canvas.height);
        });
      },setCanvasSize:function (width, height, noUpdates) {
        var canvas = Module['canvas'];
        Browser.updateCanvasDimensions(canvas, width, height);
        if (!noUpdates) Browser.updateResizeListeners();
      },windowedWidth:0,windowedHeight:0,setFullScreenCanvasSize:function () {
        // check if SDL is available   
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags | 0x00800000; // set SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },setWindowedCanvasSize:function () {
        // check if SDL is available       
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags & ~0x00800000; // clear SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },updateCanvasDimensions:function (canvas, wNative, hNative) {
        if (wNative && hNative) {
          canvas.widthNative = wNative;
          canvas.heightNative = hNative;
        } else {
          wNative = canvas.widthNative;
          hNative = canvas.heightNative;
        }
        var w = wNative;
        var h = hNative;
        if (Module['forcedAspectRatio'] && Module['forcedAspectRatio'] > 0) {
          if (w/h < Module['forcedAspectRatio']) {
            w = Math.round(h * Module['forcedAspectRatio']);
          } else {
            h = Math.round(w / Module['forcedAspectRatio']);
          }
        }
        if (((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
             document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
             document['fullScreenElement'] || document['fullscreenElement'] ||
             document['msFullScreenElement'] || document['msFullscreenElement'] ||
             document['webkitCurrentFullScreenElement']) === canvas.parentNode) && (typeof screen != 'undefined')) {
           var factor = Math.min(screen.width / w, screen.height / h);
           w = Math.round(w * factor);
           h = Math.round(h * factor);
        }
        if (Browser.resizeCanvas) {
          if (canvas.width  != w) canvas.width  = w;
          if (canvas.height != h) canvas.height = h;
          if (typeof canvas.style != 'undefined') {
            canvas.style.removeProperty( "width");
            canvas.style.removeProperty("height");
          }
        } else {
          if (canvas.width  != wNative) canvas.width  = wNative;
          if (canvas.height != hNative) canvas.height = hNative;
          if (typeof canvas.style != 'undefined') {
            if (w != wNative || h != hNative) {
              canvas.style.setProperty( "width", w + "px", "important");
              canvas.style.setProperty("height", h + "px", "important");
            } else {
              canvas.style.removeProperty( "width");
              canvas.style.removeProperty("height");
            }
          }
        }
      }};

  function ___ctype_b_loc() {
      // http://refspecs.freestandards.org/LSB_3.0.0/LSB-Core-generic/LSB-Core-generic/baselib---ctype-b-loc.html
      var me = ___ctype_b_loc;
      if (!me.ret) {
        var values = [
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,2,2,2,2,2,2,2,2,2,8195,8194,8194,8194,8194,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,24577,49156,49156,49156,
          49156,49156,49156,49156,49156,49156,49156,49156,49156,49156,49156,49156,55304,55304,55304,55304,55304,55304,55304,55304,
          55304,55304,49156,49156,49156,49156,49156,49156,49156,54536,54536,54536,54536,54536,54536,50440,50440,50440,50440,50440,
          50440,50440,50440,50440,50440,50440,50440,50440,50440,50440,50440,50440,50440,50440,50440,49156,49156,49156,49156,49156,
          49156,54792,54792,54792,54792,54792,54792,50696,50696,50696,50696,50696,50696,50696,50696,50696,50696,50696,50696,50696,
          50696,50696,50696,50696,50696,50696,50696,49156,49156,49156,49156,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        ];
        var i16size = 2;
        var arr = _malloc(values.length * i16size);
        for (var i = 0; i < values.length; i++) {
          HEAP16[(((arr)+(i * i16size))>>1)]=values[i];
        }
        me.ret = allocate([arr + 128 * i16size], 'i16*', ALLOC_NORMAL);
      }
      return me.ret;
    }

  
  function _free() {
  }
  Module["_free"] = _free;function _freelocale(locale) {
      _free(locale);
    }

  function ___cxa_allocate_exception(size) {
      var ptr = _malloc(size + ___cxa_exception_header_size);
      return ptr + ___cxa_exception_header_size;
    }

  var _fmodl=_fmod;

  function _catopen(name, oflag) {
      // nl_catd catopen (const char *name, int oflag)
      return -1;
    }

  function _catgets(catd, set_id, msg_id, s) {
      // char *catgets (nl_catd catd, int set_id, int msg_id, const char *s)
      return s;
    }

  
  
  function _sprintf(s, format, varargs) {
      // int sprintf(char *restrict s, const char *restrict format, ...);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/printf.html
      return _snprintf(s, undefined, format, varargs);
    }function _asprintf(s, format, varargs) {
      return _sprintf(-s, format, varargs);
    }function _vasprintf(s, format, va_arg) {
      return _asprintf(s, format, HEAP32[((va_arg)>>2)]);
    }

  function _time(ptr) {
      var ret = Math.floor(Date.now()/1000);
      if (ptr) {
        HEAP32[((ptr)>>2)]=ret;
      }
      return ret;
    }

  function _copysign(a, b) {
      return __reallyNegative(a) === __reallyNegative(b) ? a : -a;
    }

  function ___ctype_toupper_loc() {
      // http://refspecs.freestandards.org/LSB_3.1.1/LSB-Core-generic/LSB-Core-generic/libutil---ctype-toupper-loc.html
      var me = ___ctype_toupper_loc;
      if (!me.ret) {
        var values = [
          128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,
          158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,
          188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,
          218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,
          248,249,250,251,252,253,254,-1,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,
          33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,
          73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,
          81,82,83,84,85,86,87,88,89,90,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,
          145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,
          175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,
          205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,
          235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255
        ];
        var i32size = 4;
        var arr = _malloc(values.length * i32size);
        for (var i = 0; i < values.length; i++) {
          HEAP32[(((arr)+(i * i32size))>>2)]=values[i];
        }
        me.ret = allocate([arr + 128 * i32size], 'i32*', ALLOC_NORMAL);
      }
      return me.ret;
    }

  function ___cxa_guard_acquire(variable) {
      if (!HEAP8[(variable)]) { // ignore SAFE_HEAP stuff because llvm mixes i64 and i8 here
        HEAP8[(variable)]=1;
        return 1;
      }
      return 0;
    }

  function ___cxa_guard_release() {}

  function ___ctype_tolower_loc() {
      // http://refspecs.freestandards.org/LSB_3.1.1/LSB-Core-generic/LSB-Core-generic/libutil---ctype-tolower-loc.html
      var me = ___ctype_tolower_loc;
      if (!me.ret) {
        var values = [
          128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,
          158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,
          188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,
          218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,
          248,249,250,251,252,253,254,-1,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,
          33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,97,98,99,100,101,102,103,
          104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,91,92,93,94,95,96,97,98,99,100,101,102,103,
          104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,
          134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,
          164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,
          194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,
          224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,
          254,255
        ];
        var i32size = 4;
        var arr = _malloc(values.length * i32size);
        for (var i = 0; i < values.length; i++) {
          HEAP32[(((arr)+(i * i32size))>>2)]=values[i];
        }
        me.ret = allocate([arr + 128 * i32size], 'i32*', ALLOC_NORMAL);
      }
      return me.ret;
    }

  
  var ___cxa_caught_exceptions=[];function ___cxa_begin_catch(ptr) {
      __ZSt18uncaught_exceptionv.uncaught_exception--;
      ___cxa_caught_exceptions.push(___cxa_last_thrown_exception);
      return ptr;
    }

  var _sinf=Math_sin;


  function __ZNSt9exceptionD2Ev() {}


   
  Module["_strcpy"] = _strcpy;

  var _copysignl=_copysign;

  var __ZTISt9exception=allocate([allocate([1,0,0,0,0,0,0], "i8", ALLOC_STATIC)+8, 0], "i32", ALLOC_STATIC);

  var ___dso_handle=allocate(1, "i32*", ALLOC_STATIC);



FS.staticInit();__ATINIT__.unshift({ func: function() { if (!Module["noFSInit"] && !FS.init.initialized) FS.init() } });__ATMAIN__.push({ func: function() { FS.ignorePermissions = false } });__ATEXIT__.push({ func: function() { FS.quit() } });Module["FS_createFolder"] = FS.createFolder;Module["FS_createPath"] = FS.createPath;Module["FS_createDataFile"] = FS.createDataFile;Module["FS_createPreloadedFile"] = FS.createPreloadedFile;Module["FS_createLazyFile"] = FS.createLazyFile;Module["FS_createLink"] = FS.createLink;Module["FS_createDevice"] = FS.createDevice;
___errno_state = Runtime.staticAlloc(4); HEAP32[((___errno_state)>>2)]=0;
__ATINIT__.unshift({ func: function() { TTY.init() } });__ATEXIT__.push({ func: function() { TTY.shutdown() } });TTY.utf8 = new Runtime.UTF8Processor();
if (ENVIRONMENT_IS_NODE) { var fs = require("fs"); NODEFS.staticInit(); }
__ATINIT__.push({ func: function() { SOCKFS.root = FS.mount(SOCKFS, {}, null); } });
_fgetc.ret = allocate([0], "i8", ALLOC_STATIC);
Module["requestFullScreen"] = function Module_requestFullScreen(lockPointer, resizeCanvas) { Browser.requestFullScreen(lockPointer, resizeCanvas) };
  Module["requestAnimationFrame"] = function Module_requestAnimationFrame(func) { Browser.requestAnimationFrame(func) };
  Module["setCanvasSize"] = function Module_setCanvasSize(width, height, noUpdates) { Browser.setCanvasSize(width, height, noUpdates) };
  Module["pauseMainLoop"] = function Module_pauseMainLoop() { Browser.mainLoop.pause() };
  Module["resumeMainLoop"] = function Module_resumeMainLoop() { Browser.mainLoop.resume() };
  Module["getUserMedia"] = function Module_getUserMedia() { Browser.getUserMedia() }
STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);

staticSealed = true; // seal the static portion of memory

STACK_MAX = STACK_BASE + 5242880;

DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);

assert(DYNAMIC_BASE < TOTAL_MEMORY, "TOTAL_MEMORY not big enough for stack");

 var ctlz_i8 = allocate([8,7,6,6,5,5,5,5,4,4,4,4,4,4,4,4,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_DYNAMIC);
 var cttz_i8 = allocate([8,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,7,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0], "i8", ALLOC_DYNAMIC);

var Math_min = Math.min;
function invoke_iiii(index,a1,a2,a3) {
  try {
    return Module["dynCall_iiii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_viiiiii(index,a1,a2,a3,a4,a5,a6) {
  try {
    Module["dynCall_viiiiii"](index,a1,a2,a3,a4,a5,a6);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_viiidddd(index,a1,a2,a3,a4,a5,a6,a7) {
  try {
    Module["dynCall_viiidddd"](index,a1,a2,a3,a4,a5,a6,a7);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_viiiiiii(index,a1,a2,a3,a4,a5,a6,a7) {
  try {
    Module["dynCall_viiiiiii"](index,a1,a2,a3,a4,a5,a6,a7);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_viiidd(index,a1,a2,a3,a4,a5) {
  try {
    Module["dynCall_viiidd"](index,a1,a2,a3,a4,a5);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_vi(index,a1) {
  try {
    Module["dynCall_vi"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_vii(index,a1,a2) {
  try {
    Module["dynCall_vii"](index,a1,a2);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_viiiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8,a9) {
  try {
    Module["dynCall_viiiiiiiii"](index,a1,a2,a3,a4,a5,a6,a7,a8,a9);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_ii(index,a1) {
  try {
    return Module["dynCall_ii"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_viiiiiid(index,a1,a2,a3,a4,a5,a6,a7) {
  try {
    Module["dynCall_viiiiiid"](index,a1,a2,a3,a4,a5,a6,a7);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_viii(index,a1,a2,a3) {
  try {
    Module["dynCall_viii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_viiiiid(index,a1,a2,a3,a4,a5,a6) {
  try {
    Module["dynCall_viiiiid"](index,a1,a2,a3,a4,a5,a6);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_v(index) {
  try {
    Module["dynCall_v"](index);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iiiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8) {
  try {
    return Module["dynCall_iiiiiiiii"](index,a1,a2,a3,a4,a5,a6,a7,a8);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iiiii(index,a1,a2,a3,a4) {
  try {
    return Module["dynCall_iiiii"](index,a1,a2,a3,a4);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_viiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8) {
  try {
    Module["dynCall_viiiiiiii"](index,a1,a2,a3,a4,a5,a6,a7,a8);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_viiiii(index,a1,a2,a3,a4,a5) {
  try {
    Module["dynCall_viiiii"](index,a1,a2,a3,a4,a5);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iii(index,a1,a2) {
  try {
    return Module["dynCall_iii"](index,a1,a2);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iiiiii(index,a1,a2,a3,a4,a5) {
  try {
    return Module["dynCall_iiiiii"](index,a1,a2,a3,a4,a5);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_viiii(index,a1,a2,a3,a4) {
  try {
    Module["dynCall_viiii"](index,a1,a2,a3,a4);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function asmPrintInt(x, y) {
  Module.print('int ' + x + ',' + y);// + ' ' + new Error().stack);
}
function asmPrintFloat(x, y) {
  Module.print('float ' + x + ',' + y);// + ' ' + new Error().stack);
}
// EMSCRIPTEN_START_ASM
var asm=(function(global,env,buffer){"use asm";var a=new global.Int8Array(buffer);var b=new global.Int16Array(buffer);var c=new global.Int32Array(buffer);var d=new global.Uint8Array(buffer);var e=new global.Uint16Array(buffer);var f=new global.Uint32Array(buffer);var g=new global.Float32Array(buffer);var h=new global.Float64Array(buffer);var i=env.STACKTOP|0;var j=env.STACK_MAX|0;var k=env.tempDoublePtr|0;var l=env.ABORT|0;var m=env.cttz_i8|0;var n=env.ctlz_i8|0;var o=env.__ZTISt9exception|0;var p=env.___dso_handle|0;var q=env._stderr|0;var r=env._stdin|0;var s=env._stdout|0;var t=0;var u=0;var v=0;var w=0;var x=+env.NaN,y=+env.Infinity;var z=0,A=0,B=0,C=0,D=0.0,E=0,F=0,G=0,H=0.0;var I=0;var J=0;var K=0;var L=0;var M=0;var N=0;var O=0;var P=0;var Q=0;var R=0;var S=global.Math.floor;var T=global.Math.abs;var U=global.Math.sqrt;var V=global.Math.pow;var W=global.Math.cos;var X=global.Math.sin;var Y=global.Math.tan;var Z=global.Math.acos;var _=global.Math.asin;var $=global.Math.atan;var aa=global.Math.atan2;var ba=global.Math.exp;var ca=global.Math.log;var da=global.Math.ceil;var ea=global.Math.imul;var fa=env.abort;var ga=env.assert;var ha=env.asmPrintInt;var ia=env.asmPrintFloat;var ja=env.min;var ka=env.invoke_iiii;var la=env.invoke_viiiiii;var ma=env.invoke_viiidddd;var na=env.invoke_viiiiiii;var oa=env.invoke_viiidd;var pa=env.invoke_vi;var qa=env.invoke_vii;var ra=env.invoke_viiiiiiiii;var sa=env.invoke_ii;var ta=env.invoke_viiiiiid;var ua=env.invoke_viii;var va=env.invoke_viiiiid;var wa=env.invoke_v;var xa=env.invoke_iiiiiiiii;var ya=env.invoke_iiiii;var za=env.invoke_viiiiiiii;var Aa=env.invoke_viiiii;var Ba=env.invoke_iii;var Ca=env.invoke_iiiiii;var Da=env.invoke_viiii;var Ea=env._fabs;var Fa=env._vsscanf;var Ga=env.__ZSt9terminatev;var Ha=env.___cxa_guard_acquire;var Ia=env._sscanf;var Ja=env.__ZSt18uncaught_exceptionv;var Ka=env.___ctype_toupper_loc;var La=env.__addDays;var Ma=env._sbrk;var Na=env.___cxa_begin_catch;var Oa=env._emscripten_memcpy_big;var Pa=env._exp2;var Qa=env._sysconf;var Ra=env._tanf;var Sa=env._fileno;var Ta=env._fread;var Ua=env._write;var Va=env.__isLeapYear;var Wa=env._expf;var Xa=env.__ZNSt9exceptionD2Ev;var Ya=env.___cxa_does_inherit;var Za=env.__exit;var _a=env._catclose;var $a=env._send;var ab=env.___cxa_is_number_type;var bb=env.___cxa_find_matching_catch;var cb=env._isxdigit_l;var db=env.___cxa_guard_release;var eb=env._strerror_r;var fb=env.___setErrNo;var gb=env._llvm_pow_f32;var hb=env._newlocale;var ib=env._isdigit_l;var jb=env.___resumeException;var kb=env._freelocale;var lb=env._sprintf;var mb=env._vasprintf;var nb=env._vsnprintf;var ob=env._strtoull_l;var pb=env._read;var qb=env._fwrite;var rb=env._time;var sb=env._pthread_mutex_lock;var tb=env._catopen;var ub=env._exit;var vb=env.___ctype_b_loc;var wb=env._fmod;var xb=env.___cxa_allocate_exception;var yb=env._strtoll;var zb=env._pwrite;var Ab=env._fabsf;var Bb=env._uselocale;var Cb=env._snprintf;var Db=env.__scanString;var Eb=env._strtoull;var Fb=env._strftime;var Gb=env._sinf;var Hb=env._isxdigit;var Ib=env.__reallyNegative;var Jb=env._pthread_cond_broadcast;var Kb=env._recv;var Lb=env._fgetc;var Mb=env.__parseInt64;var Nb=env.__getFloat;var Ob=env._abort;var Pb=env._isspace;var Qb=env._pthread_cond_wait;var Rb=env._cosf;var Sb=env._ungetc;var Tb=env._fflush;var Ub=env._strftime_l;var Vb=env._log10;var Wb=env._catgets;var Xb=env._asprintf;var Yb=env._strtoll_l;var Zb=env.__arraySum;var _b=env.___ctype_tolower_loc;var $b=env._pthread_mutex_unlock;var ac=env._pread;var bc=env._mkport;var cc=env.___errno_location;var dc=env._copysign;var ec=env.___cxa_throw;var fc=env._isdigit;var gc=env._strerror;var hc=env.__formatString;var ic=env._atexit;var jc=0.0;
// EMSCRIPTEN_START_FUNCS
function Ec(a){a=a|0;var b=0;b=i;i=i+a|0;i=i+7&-8;return b|0}function Fc(){return i|0}function Gc(a){a=a|0;i=a}function Hc(a,b){a=a|0;b=b|0;if((t|0)==0){t=a;u=b}}function Ic(b){b=b|0;a[k]=a[b];a[k+1|0]=a[b+1|0];a[k+2|0]=a[b+2|0];a[k+3|0]=a[b+3|0]}function Jc(b){b=b|0;a[k]=a[b];a[k+1|0]=a[b+1|0];a[k+2|0]=a[b+2|0];a[k+3|0]=a[b+3|0];a[k+4|0]=a[b+4|0];a[k+5|0]=a[b+5|0];a[k+6|0]=a[b+6|0];a[k+7|0]=a[b+7|0]}function Kc(a){a=a|0;I=a}function Lc(a){a=a|0;J=a}function Mc(a){a=a|0;K=a}function Nc(a){a=a|0;L=a}function Oc(a){a=a|0;M=a}function Pc(a){a=a|0;N=a}function Qc(a){a=a|0;O=a}function Rc(a){a=a|0;P=a}function Sc(a){a=a|0;Q=a}function Tc(a){a=a|0;R=a}function Uc(a){a=a|0;var b=0,d=0,e=0,f=0;b=i;d=Wm(3444)|0;rn(d|0,0,3440)|0;c[d>>2]=120;e=Wm(20)|0;c[e>>2]=16;f=e+8|0;c[f>>2]=0;c[e+12>>2]=0;c[e+4>>2]=f;f=d+3440|0;c[f>>2]=e;zd(d,a);qc[c[(c[d>>2]|0)+16>>2]&63](d,c[f>>2]|0);a=c[f>>2]|0;c[a+16>>2]=c[a+4>>2];i=b;return d|0}function Vc(a){a=a|0;return c[(c[a+3440>>2]|0)+12>>2]|0}function Wc(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0;e=i;f=b+3440|0;b=c[(c[f>>2]|0)+16>>2]|0;g=c[b+28>>2]|0;h=b+16|0;if((a[h]&1)==0){j=h+1|0}else{j=c[b+24>>2]|0}vn(d|0,j|0)|0;j=(c[f>>2]|0)+16|0;d=c[j>>2]|0;b=c[d+4>>2]|0;if((b|0)==0){h=d;while(1){d=c[h+8>>2]|0;if((c[d>>2]|0)==(h|0)){k=d;break}else{h=d}}}else{h=b;while(1){b=c[h>>2]|0;if((b|0)==0){k=h;break}else{h=b}}}c[j>>2]=k;k=c[f>>2]|0;f=k+16|0;if((c[f>>2]|0)!=(k+8|0)){i=e;return g|0}c[f>>2]=c[k+4>>2];i=e;return g|0}function Xc(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0;f=i;Dc[c[(c[a>>2]|0)+24>>2]&15](a,b,d,e);i=f;return 1}function Yc(a){a=a|0;var b=0,d=0;b=i;d=sc[c[(c[a>>2]|0)+8>>2]&127](a)|0;i=b;return d|0}function Zc(a){a=a|0;var b=0,d=0;b=i;d=sc[c[(c[a>>2]|0)+12>>2]&127](a)|0;i=b;return d|0}function _c(a){a=a|0;var b=0;b=i;if((a|0)==0){i=b;return}pc[c[(c[a>>2]|0)+4>>2]&255](a);i=b;return}function $c(a){a=a|0;var b=0;b=i;c[a>>2]=16;rd(a+4|0,c[a+8>>2]|0);i=b;return}function ad(a){a=a|0;var b=0;b=i;c[a>>2]=16;rd(a+4|0,c[a+8>>2]|0);Ym(a);i=b;return}function bd(a,b){a=a|0;b=b|0;return}function cd(a,b){a=a|0;b=b|0;return}function dd(a,b){a=a|0;b=b|0;return}function ed(a){a=a|0;return}function fd(a,b,c){a=a|0;b=b|0;c=c|0;var d=0;d=i;nd(a,b,c);i=d;return}function gd(a,b,c){a=a|0;b=b|0;c=c|0;var d=0;d=i;nd(a,b,c);i=d;return}function hd(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=+d;e=+e;f=+f;g=+g;var h=0;h=i;nd(a,b,c);i=h;return}function id(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=+d;e=+e;f=+f;g=+g;var h=0;h=i;nd(a,b,c);i=h;return}function jd(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=+d;e=+e;f=+f;g=+g;var h=0;h=i;nd(a,b,c);i=h;return}function kd(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=+d;e=+e;return}function ld(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=+d;e=+e;return}function md(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;return}function nd(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;f=i;i=i+80|0;g=f+64|0;h=f+48|0;j=f+32|0;k=f+16|0;l=f;m=qn(d|0)|0;if(m>>>0>4294967279){Be(0)}if(m>>>0<11){n=m<<1&255;a[l]=n;o=l;p=n;q=l+1|0}else{n=m+16&-16;r=Wm(n)|0;c[l+8>>2]=r;s=n|1;c[l>>2]=s;c[l+4>>2]=m;o=l;p=s&255;q=r}sn(q|0,d|0,m|0)|0;a[q+m|0]=0;if((p&1)==0){c[k+0>>2]=c[o+0>>2];c[k+4>>2]=c[o+4>>2];c[k+8>>2]=c[o+8>>2];t=k;u=a[k]|0}else{o=c[l+8>>2]|0;m=c[l+4>>2]|0;if(m>>>0>4294967279){Be(0)}if(m>>>0<11){q=m<<1&255;a[k]=q;v=k;w=q;x=k+1|0}else{q=m+16&-16;d=Wm(q)|0;c[k+8>>2]=d;r=q|1;c[k>>2]=r;c[k+4>>2]=m;v=k;w=r&255;x=d}sn(x|0,o|0,m|0)|0;a[x+m|0]=0;t=v;u=w}c[k+12>>2]=e;if((u&1)==0){c[j+0>>2]=c[t+0>>2];c[j+4>>2]=c[t+4>>2];c[j+8>>2]=c[t+8>>2];y=j;z=a[j]|0}else{u=c[k+8>>2]|0;w=c[k+4>>2]|0;if(w>>>0>4294967279){Be(0)}if(w>>>0<11){v=w<<1&255;a[j]=v;A=j;B=v;C=j+1|0}else{v=w+16&-16;m=Wm(v)|0;c[j+8>>2]=m;x=v|1;c[j>>2]=x;c[j+4>>2]=w;A=j;B=x&255;C=m}sn(C|0,u|0,w|0)|0;a[C+w|0]=0;y=A;z=B}c[j+12>>2]=e;B=b+4|0;if((z&1)==0){c[h+0>>2]=c[y+0>>2];c[h+4>>2]=c[y+4>>2];c[h+8>>2]=c[y+8>>2]}else{z=c[j+8>>2]|0;b=c[j+4>>2]|0;if(b>>>0>4294967279){Be(0)}if(b>>>0<11){a[h]=b<<1;D=h+1|0}else{A=b+16&-16;w=Wm(A)|0;c[h+8>>2]=w;c[h>>2]=A|1;c[h+4>>2]=b;D=w}sn(D|0,z|0,b|0)|0;a[D+b|0]=0}c[h+12>>2]=e;od(g,B,h);if(!((a[h]&1)==0)){Ym(c[h+8>>2]|0)}if(!((a[y]&1)==0)){Ym(c[j+8>>2]|0)}if(!((a[t]&1)==0)){Ym(c[k+8>>2]|0)}if((p&1)==0){i=f;return}Ym(c[l+8>>2]|0);i=f;return}function od(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0;f=i;i=i+16|0;g=f;h=pd(d,g,e)|0;j=c[h>>2]|0;if((j|0)!=0){k=0;l=j;c[b>>2]=l;m=b+4|0;a[m]=k;i=f;return}j=Wm(32)|0;n=j+16|0;if((a[e]&1)==0){c[n+0>>2]=c[e+0>>2];c[n+4>>2]=c[e+4>>2];c[n+8>>2]=c[e+8>>2]}else{o=c[e+8>>2]|0;p=c[e+4>>2]|0;if(p>>>0>4294967279){Be(0)}if(p>>>0<11){a[n]=p<<1;q=j+17|0}else{r=p+16&-16;s=Wm(r)|0;c[j+24>>2]=s;c[n>>2]=r|1;c[j+20>>2]=p;q=s}sn(q|0,o|0,p|0)|0;a[q+p|0]=0}c[j+28>>2]=c[e+12>>2];e=c[g>>2]|0;c[j>>2]=0;c[j+4>>2]=0;c[j+8>>2]=e;c[h>>2]=j;e=c[c[d>>2]>>2]|0;if((e|0)==0){t=j}else{c[d>>2]=e;t=c[h>>2]|0}qd(c[d+4>>2]|0,t);t=d+8|0;c[t>>2]=(c[t>>2]|0)+1;k=1;l=j;c[b>>2]=l;m=b+4|0;a[m]=k;i=f;return}function pd(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0;f=i;g=c[b+4>>2]|0;if((g|0)==0){h=b+4|0;c[d>>2]=h;j=h;i=f;return j|0}h=a[e]|0;b=(h&255)>>>1;k=e+1|0;l=e+8|0;m=e+4|0;a:do{if((h&1)==0){e=g;while(1){n=e+16|0;o=a[n]|0;p=(o&1)==0;if(p){q=(o&255)>>>1;r=n+1|0}else{q=c[e+20>>2]|0;r=c[e+24>>2]|0}s=q>>>0<b>>>0;t=mn(k,r,s?q:b)|0;if((t|0)==0){u=b>>>0<q>>>0?-1:s&1}else{u=t}if((u|0)<0){t=c[e>>2]|0;if((t|0)==0){v=e;w=e;x=24;break}else{e=t;continue}}if(p){y=(o&255)>>>1;z=n+1|0}else{y=c[e+20>>2]|0;z=c[e+24>>2]|0}n=b>>>0<y>>>0;o=mn(z,k,n?b:y)|0;if((o|0)==0){A=y>>>0<b>>>0?-1:n&1}else{A=o}if((A|0)>=0){B=e;x=33;break a}o=e+4|0;n=c[o>>2]|0;if((n|0)==0){C=o;D=e;x=32;break}else{e=n}}}else{e=g;while(1){n=e+16|0;o=c[m>>2]|0;p=a[n]|0;t=(p&1)==0;if(t){E=(p&255)>>>1;F=n+1|0}else{E=c[e+20>>2]|0;F=c[e+24>>2]|0}s=E>>>0<o>>>0;G=mn(c[l>>2]|0,F,s?E:o)|0;if((G|0)==0){H=o>>>0<E>>>0?-1:s&1}else{H=G}if((H|0)<0){G=c[e>>2]|0;if((G|0)==0){v=e;w=e;x=24;break}else{e=G;continue}}if(t){I=(p&255)>>>1;J=n+1|0}else{I=c[e+20>>2]|0;J=c[e+24>>2]|0}n=c[m>>2]|0;p=n>>>0<I>>>0;t=mn(J,c[l>>2]|0,p?n:I)|0;if((t|0)==0){K=I>>>0<n>>>0?-1:p&1}else{K=t}if((K|0)>=0){B=e;x=33;break a}t=e+4|0;p=c[t>>2]|0;if((p|0)==0){C=t;D=e;x=32;break}else{e=p}}}}while(0);if((x|0)==24){c[d>>2]=w;j=v;i=f;return j|0}else if((x|0)==32){c[d>>2]=D;j=C;i=f;return j|0}else if((x|0)==33){c[d>>2]=B;j=d;i=f;return j|0}return 0}function qd(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;e=i;f=(d|0)==(b|0);a[d+12|0]=f&1;if(f){i=e;return}else{g=d}while(1){h=g+8|0;j=c[h>>2]|0;d=j+12|0;if((a[d]|0)!=0){k=37;break}l=j+8|0;m=c[l>>2]|0;f=c[m>>2]|0;if((f|0)==(j|0)){n=c[m+4>>2]|0;if((n|0)==0){k=7;break}o=n+12|0;if((a[o]|0)!=0){k=7;break}a[d]=1;a[m+12|0]=(m|0)==(b|0)|0;a[o]=1}else{if((f|0)==0){k=24;break}o=f+12|0;if((a[o]|0)!=0){k=24;break}a[d]=1;a[m+12|0]=(m|0)==(b|0)|0;a[o]=1}if((m|0)==(b|0)){k=37;break}else{g=m}}if((k|0)==7){if((c[j>>2]|0)==(g|0)){p=j;q=m;r=j}else{b=j+4|0;o=c[b>>2]|0;d=c[o>>2]|0;c[b>>2]=d;if((d|0)==0){s=m}else{c[d+8>>2]=j;s=c[l>>2]|0}d=o+8|0;c[d>>2]=s;s=c[l>>2]|0;if((c[s>>2]|0)==(j|0)){c[s>>2]=o}else{c[s+4>>2]=o}c[o>>2]=j;c[l>>2]=o;s=c[d>>2]|0;p=o;q=s;r=c[s>>2]|0}a[p+12|0]=1;a[q+12|0]=0;p=r+4|0;s=c[p>>2]|0;c[q>>2]=s;if((s|0)!=0){c[s+8>>2]=q}s=q+8|0;c[r+8>>2]=c[s>>2];o=c[s>>2]|0;if((c[o>>2]|0)==(q|0)){c[o>>2]=r}else{c[o+4>>2]=r}c[p>>2]=q;c[s>>2]=r;i=e;return}else if((k|0)==24){if((c[j>>2]|0)==(g|0)){r=g+4|0;s=c[r>>2]|0;c[j>>2]=s;if((s|0)==0){t=m}else{c[s+8>>2]=j;t=c[l>>2]|0}c[h>>2]=t;t=c[l>>2]|0;if((c[t>>2]|0)==(j|0)){c[t>>2]=g}else{c[t+4>>2]=g}c[r>>2]=j;c[l>>2]=g;u=g;v=c[h>>2]|0}else{u=j;v=m}a[u+12|0]=1;a[v+12|0]=0;u=v+4|0;m=c[u>>2]|0;j=c[m>>2]|0;c[u>>2]=j;if((j|0)!=0){c[j+8>>2]=v}j=v+8|0;c[m+8>>2]=c[j>>2];u=c[j>>2]|0;if((c[u>>2]|0)==(v|0)){c[u>>2]=m}else{c[u+4>>2]=m}c[m>>2]=v;c[j>>2]=m;i=e;return}else if((k|0)==37){i=e;return}}function rd(b,d){b=b|0;d=d|0;var e=0;e=i;if((d|0)==0){i=e;return}rd(b,c[d>>2]|0);rd(b,c[d+4>>2]|0);if(!((a[d+16|0]&1)==0)){Ym(c[d+24>>2]|0)}Ym(d);i=e;return}function sd(a){a=a|0;return}function td(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function ud(a){a=a|0;return 0}function vd(a){a=a|0;return 2}function wd(a,b){a=a|0;b=b|0;var d=0,e=0;d=i;qc[c[(c[b>>2]|0)+16>>2]&63](b,224);Dc[c[(c[b>>2]|0)+52>>2]&15](b,0,240,248);qc[c[(c[b>>2]|0)+16>>2]&63](b,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,0,256,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,0,264,272);qc[c[(c[b>>2]|0)+16>>2]&63](b,320);e=a+84|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,240,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,352);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,392);mc[c[(c[b>>2]|0)+36>>2]&3](b,400,e,-20.0,-120.0,10.0,.10000000149011612);e=a+104|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,416,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,424);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,488);mc[c[(c[b>>2]|0)+36>>2]&3](b,496,e,49.0,1.0,88.0,.009999999776482582);e=a+100|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,512,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,520);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,576);mc[c[(c[b>>2]|0)+36>>2]&3](b,584,e,.10000000149011612,0.0,1.0,.0010000000474974513);pc[c[(c[b>>2]|0)+20>>2]&255](b);pc[c[(c[b>>2]|0)+20>>2]&255](b);Dc[c[(c[b>>2]|0)+52>>2]&15](b,0,416,248);qc[c[(c[b>>2]|0)+16>>2]&63](b,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,0,264,600);qc[c[(c[b>>2]|0)+16>>2]&63](b,688);e=a+80|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,256,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,720);uc[c[(c[b>>2]|0)+28>>2]&7](b,776,e);e=a+132|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,240,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,784);mc[c[(c[b>>2]|0)+36>>2]&3](b,808,e,0.0,0.0,1.0,.009999999776482582);e=a+144|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,416,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,816);mc[c[(c[b>>2]|0)+36>>2]&3](b,848,e,0.0,0.0,1.0,.009999999776482582);pc[c[(c[b>>2]|0)+20>>2]&255](b);pc[c[(c[b>>2]|0)+20>>2]&255](b);Dc[c[(c[b>>2]|0)+52>>2]&15](b,0,512,248);qc[c[(c[b>>2]|0)+16>>2]&63](b,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,0,256,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,0,264,856);qc[c[(c[b>>2]|0)+12>>2]&63](b,912);e=a+3436|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,256,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1e3);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,392);oc[c[(c[b>>2]|0)+48>>2]&3](b,248,e,-50.0,10.0);e=a+3324|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,240,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1e3);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,392);oc[c[(c[b>>2]|0)+48>>2]&3](b,248,e,-50.0,10.0);e=a+3088|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,416,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1e3);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,392);oc[c[(c[b>>2]|0)+48>>2]&3](b,248,e,-50.0,10.0);e=a+2852|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,512,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1e3);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,392);oc[c[(c[b>>2]|0)+48>>2]&3](b,248,e,-50.0,10.0);e=a+2616|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,1032,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1e3);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,392);oc[c[(c[b>>2]|0)+48>>2]&3](b,248,e,-50.0,10.0);e=a+2380|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,1040,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1e3);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,392);oc[c[(c[b>>2]|0)+48>>2]&3](b,248,e,-50.0,10.0);e=a+2144|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,1048,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1e3);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,392);oc[c[(c[b>>2]|0)+48>>2]&3](b,248,e,-50.0,10.0);e=a+1908|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,1056,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1e3);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,392);oc[c[(c[b>>2]|0)+48>>2]&3](b,248,e,-50.0,10.0);e=a+1672|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,1064,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1e3);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,392);oc[c[(c[b>>2]|0)+48>>2]&3](b,248,e,-50.0,10.0);e=a+1436|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,1072,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1e3);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,392);oc[c[(c[b>>2]|0)+48>>2]&3](b,248,e,-50.0,10.0);e=a+1200|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,1080,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1e3);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,392);oc[c[(c[b>>2]|0)+48>>2]&3](b,248,e,-50.0,10.0);e=a+964|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,1088,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1e3);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,392);oc[c[(c[b>>2]|0)+48>>2]&3](b,248,e,-50.0,10.0);e=a+728|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,1096,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1e3);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,392);oc[c[(c[b>>2]|0)+48>>2]&3](b,248,e,-50.0,10.0);e=a+492|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,1104,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1e3);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,392);oc[c[(c[b>>2]|0)+48>>2]&3](b,248,e,-50.0,10.0);e=a+256|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,1112,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1e3);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,392);oc[c[(c[b>>2]|0)+48>>2]&3](b,248,e,-50.0,10.0);pc[c[(c[b>>2]|0)+20>>2]&255](b);Dc[c[(c[b>>2]|0)+52>>2]&15](b,0,240,248);qc[c[(c[b>>2]|0)+12>>2]&63](b,1120);e=a+28|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,256,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1152);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,576);mc[c[(c[b>>2]|0)+36>>2]&3](b,1192,e,.10000000149011612,0.0,1.0,.009999999776482582);e=a+8|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,240,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1216);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,392);mc[c[(c[b>>2]|0)+36>>2]&3](b,1248,e,50.0,0.0,100.0,1.0);pc[c[(c[b>>2]|0)+20>>2]&255](b);pc[c[(c[b>>2]|0)+20>>2]&255](b);pc[c[(c[b>>2]|0)+20>>2]&255](b);i=d;return}function xd(a,b){a=a|0;b=b|0;var d=0;d=i;qc[c[(c[a>>2]|0)+28>>2]&63](a,b);i=d;return}function yd(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0.0,h=0.0,j=0.0,k=0.0,l=0.0,m=0.0,n=0.0,o=0.0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,U=0,Y=0,Z=0,_=0,$=0,aa=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0,la=0,ma=0,na=0,oa=0,pa=0,qa=0,ra=0,sa=0,ta=0,ua=0,va=0,wa=0,xa=0,ya=0,za=0,Aa=0,Ba=0,Ca=0,Da=0,Ea=0,Fa=0,Ga=0,Ha=0,Ia=0,Ja=0,Ka=0,La=0,Ma=0,Na=0,Oa=0,Qa=0,Ra=0,Sa=0,Ta=0,Ua=0,Va=0,Wa=0,Xa=0,Ya=0,Za=0,_a=0,$a=0,ab=0,bb=0,cb=0,db=0,eb=0,fb=0,gb=0,hb=0,ib=0,jb=0,kb=0,lb=0,mb=0,nb=0,ob=0,pb=0,qb=0,rb=0,sb=0,tb=0,ub=0,vb=0,wb=0,xb=0,yb=0,zb=0,Ab=0,Bb=0,Cb=0,Db=0,Eb=0,Fb=0,Gb=0,Hb=0,Ib=0,Jb=0,Kb=0,Lb=0,Mb=0,Nb=0,Ob=0,Pb=0,Qb=0,Rb=0,Sb=0,Tb=0,Ub=0,Wb=0,Xb=0,Yb=0,Zb=0,_b=0,$b=0,ac=0,bc=0,cc=0,dc=0,ec=0,fc=0,gc=0,hc=0,ic=0,jc=0,kc=0,lc=0,mc=0,nc=0,oc=0,pc=0,qc=0,rc=0,sc=0,tc=0,uc=0,vc=0,wc=0,xc=0,yc=0,zc=0,Ac=0,Bc=0,Cc=0,Dc=0,Ec=0,Fc=0,Gc=0,Hc=0,Ic=0,Jc=0,Kc=0,Lc=0,Mc=0,Nc=0,Oc=0,Pc=0,Qc=0,Rc=0,Sc=0,Tc=0,Uc=0,Vc=0,Wc=0,Xc=0,Yc=0,Zc=0,_c=0,$c=0,ad=0,bd=0,cd=0,dd=0,ed=0,fd=0,gd=0,hd=0,id=0,jd=0,kd=0,ld=0,md=0,nd=0,od=0,pd=0,qd=0,rd=0,sd=0,td=0,ud=0,vd=0,wd=0,xd=0,yd=0,zd=0,Ad=0,Bd=0,Cd=0,Dd=0,Ed=0,Fd=0,Gd=0,Hd=0,Id=0,Jd=0,Kd=0,Ld=0,Md=0,Nd=0,Od=0,Pd=0,Qd=0,Rd=0,Sd=0,Td=0,Ud=0,Vd=0,Wd=0,Xd=0,Yd=0,Zd=0,_d=0,$d=0,ae=0,be=0,ce=0,de=0,ee=0,fe=0,ge=0,he=0,ie=0,je=0,ke=0,le=0,me=0,ne=0,oe=0,pe=0,qe=0,re=0,se=0,te=0,ue=0,ve=0,we=0,xe=0,ye=0,ze=0,Ae=0,Be=0,Ce=0,De=0,Ee=0,Fe=0,Ge=0,He=0,Ie=0,Je=0,Ke=0,Le=0,Me=0,Ne=0,Oe=0,Pe=0,Qe=0,Re=0,Se=0,Te=0,Ue=0,Ve=0,We=0,Xe=0,Ye=0,Ze=0,_e=0,$e=0,af=0,bf=0,cf=0,df=0,ef=0,ff=0,gf=0,hf=0,jf=0,kf=0,lf=0,mf=0,nf=0,of=0,pf=0,qf=0,rf=0,sf=0,tf=0,uf=0,vf=0,wf=0,xf=0,yf=0,zf=0,Af=0,Bf=0,Cf=0,Df=0,Ef=0,Ff=0,Gf=0,Hf=0,If=0,Jf=0,Kf=0,Lf=0,Mf=0,Nf=0,Of=0,Pf=0,Qf=0,Rf=0,Sf=0,Tf=0,Uf=0,Vf=0,Wf=0,Xf=0,Yf=0,Zf=0,_f=0,$f=0,ag=0,bg=0,cg=0,dg=0,eg=0,fg=0,gg=0,hg=0,ig=0,jg=0,kg=0,lg=0,mg=0,ng=0,og=0,pg=0,qg=0,rg=0,sg=0,tg=0,ug=0,vg=0,wg=0,xg=0,yg=0,zg=0,Ag=0,Bg=0,Cg=0,Dg=0,Eg=0,Fg=0,Gg=0,Hg=0,Ig=0,Jg=0,Kg=0,Lg=0,Mg=0,Ng=0,Og=0,Pg=0,Qg=0,Rg=0,Sg=0,Tg=0,Ug=0,Vg=0,Wg=0,Xg=0,Yg=0,Zg=0,_g=0,$g=0,ah=0,bh=0,ch=0,dh=0,eh=0,fh=0,gh=0,hh=0,ih=0,jh=0,kh=0,lh=0,mh=0,nh=0,oh=0,ph=0,qh=0,rh=0,sh=0,th=0,uh=0,vh=0,wh=0,xh=0,yh=0,zh=0,Ah=0,Bh=0,Ch=0,Dh=0,Eh=0,Fh=0,Gh=0,Hh=0,Ih=0,Jh=0,Kh=0,Lh=0,Mh=0,Nh=0,Oh=0,Ph=0,Qh=0,Rh=0,Sh=0,Th=0,Uh=0,Vh=0,Wh=0,Xh=0,Yh=0,Zh=0,_h=0,$h=0,ai=0,bi=0,ci=0,di=0,ei=0,fi=0,gi=0,hi=0,ii=0,ji=0,ki=0,li=0,mi=0,ni=0,oi=0,pi=0,qi=0,ri=0,si=0,ti=0,ui=0,vi=0,wi=0,xi=0,yi=0,zi=0,Ai=0,Bi=0,Ci=0,Di=0,Ei=0,Fi=0,Gi=0,Hi=0,Ii=0,Ji=0,Ki=0,Li=0,Mi=0,Ni=0,Oi=0,Pi=0,Qi=0,Ri=0,Si=0,Ti=0,Ui=0,Vi=0,Wi=0,Xi=0,Yi=0,Zi=0,_i=0,$i=0,aj=0,bj=0,cj=0,dj=0,ej=0,fj=0,gj=0,hj=0,ij=0,jj=0,kj=0,lj=0,mj=0,nj=0,oj=0,pj=0,qj=0,rj=0,sj=0,tj=0,uj=0,vj=0,wj=0,xj=0,yj=0,zj=0,Aj=0,Bj=0,Cj=0,Dj=0,Ej=0,Fj=0,Gj=0,Hj=0,Ij=0,Jj=0,Kj=0,Lj=0,Mj=0,Nj=0,Oj=0,Pj=0,Qj=0,Rj=0,Sj=0,Tj=0,Uj=0,Vj=0,Wj=0,Xj=0,Yj=0,Zj=0,_j=0,$j=0,ak=0,bk=0,ck=0,dk=0,ek=0,fk=0,gk=0,hk=0,ik=0,jk=0,kk=0,lk=0,mk=0,nk=0,ok=0,pk=0,qk=0,rk=0,sk=0,tk=0,uk=0,vk=0,wk=0,xk=0,yk=0,zk=0,Ak=0,Bk=0,Ck=0,Dk=0,Ek=0,Fk=0,Gk=0,Hk=0,Ik=0,Jk=0,Kk=0,Lk=0,Mk=0,Nk=0,Ok=0,Pk=0,Qk=0,Rk=0,Sk=0,Tk=0,Uk=0,Vk=0,Wk=0,Xk=0,Yk=0,Zk=0,_k=0,$k=0,al=0,bl=0,cl=0,dl=0,el=0,fl=0,gl=0,hl=0,il=0,jl=0,kl=0,ll=0,ml=0,nl=0,ol=0,pl=0,ql=0,rl=0,sl=0,tl=0,ul=0,vl=0,wl=0,xl=0,yl=0,zl=0,Al=0,Bl=0,Cl=0,Dl=0,El=0,Fl=0,Gl=0,Hl=0,Il=0,Jl=0,Kl=0,Ll=0,Ml=0,Nl=0,Ol=0,Pl=0,Ql=0,Rl=0,Sl=0,Tl=0,Ul=0,Vl=0,Wl=0,Xl=0,Yl=0,Zl=0,_l=0,$l=0,am=0,bm=0,cm=0,dm=0,em=0,fm=0,gm=0,hm=0,im=0,jm=0,km=0,lm=0,mm=0,nm=0,om=0,pm=0,qm=0,rm=0,sm=0,tm=0,um=0,vm=0,wm=0,xm=0,ym=0,zm=0,Am=0,Bm=0,Cm=0,Dm=0,Em=0,Fm=0,Gm=0,Hm=0,Im=0,Jm=0,Km=0,Lm=0,Mm=0,Nm=0,Om=0,Pm=0,Qm=0,Rm=0,Sm=0,Tm=0,Um=0,Vm=0,Wm=0,Xm=0,Ym=0,Zm=0,_m=0,$m=0,an=0,bn=0,cn=0,dn=0,en=0.0,fn=0.0,gn=0.0,hn=0.0,jn=0,kn=0.0,ln=0.0,mn=0.0,nn=0.0,on=0.0,pn=0.0,qn=0.0,rn=0.0,sn=0.0,tn=0.0,un=0.0,vn=0.0,wn=0.0,xn=0.0,yn=0.0,zn=0.0,An=0.0,Bn=0.0,Cn=0.0,Dn=0.0,En=0.0,Fn=0.0,Gn=0,Hn=0.0,In=0.0,Jn=0.0,Kn=0.0,Ln=0.0,Mn=0.0,Nn=0.0,On=0.0,Pn=0.0,Qn=0.0,Rn=0.0;d=i;f=+g[a+8>>2];h=+g[a+24>>2];j=+ba(+(0.0-h/+g[a+28>>2]));k=1.0-j;l=+V(10.0,+(+g[a+84>>2]*.05000000074505806))*.0010000000474974513;m=+ba(+(0.0-h/+g[a+100>>2]));h=(1.0-m)*+Pa(+((+g[a+104>>2]+-49.0)*.0833333358168602))*440.0;n=+g[a+132>>2]*.0010000000474974513;o=+g[a+144>>2]*.0010000000474974513;p=c[e>>2]|0;q=c[e+4>>2]|0;if((b|0)<=0){i=d;return}e=a+12|0;r=a+92|0;s=a+88|0;t=a+112|0;u=a+108|0;v=a+96|0;w=a+128|0;x=a+120|0;y=a+116|0;z=a+16|0;A=a+124|0;B=a+140|0;C=a+136|0;D=a+152|0;E=a+148|0;F=a+156|0;G=a+168|0;H=a+160|0;I=a+164|0;J=a+68|0;K=a+176|0;L=a+188|0;M=a+180|0;N=a+192|0;O=a+184|0;P=a+76|0;Q=a+196|0;R=a+56|0;S=a+200|0;U=a+212|0;Y=a+204|0;Z=a+216|0;_=a+208|0;$=a+64|0;aa=a+220|0;ca=a+40|0;da=a+224|0;ea=a+236|0;fa=a+228|0;ga=a+240|0;ha=a+232|0;ia=a+252|0;ja=a+52|0;ka=a+244|0;la=a+248|0;ma=a+256|0;na=a+324|0;oa=a+336|0;pa=a+348|0;qa=a+340|0;ra=a+352|0;sa=a+344|0;ta=a+332|0;ua=a+356|0;va=a+316|0;wa=a+360|0;xa=a+376|0;ya=a+364|0;za=a+372|0;Aa=a+368|0;Ba=a+320|0;Ca=a+380|0;Da=a+308|0;Ea=a+384|0;Fa=a+396|0;Ga=a+388|0;Ha=a+400|0;Ia=a+392|0;Ja=a+312|0;Ka=a+404|0;La=a+296|0;Ma=a+412|0;Na=a+424|0;Oa=a+416|0;Qa=a+428|0;Ra=a+420|0;Sa=a+304|0;Ta=a+432|0;Ua=a+284|0;Va=a+436|0;Wa=a+448|0;Xa=a+440|0;Ya=a+452|0;Za=a+444|0;_a=a+292|0;$a=a+456|0;ab=a+268|0;bb=a+460|0;cb=a+472|0;db=a+464|0;eb=a+476|0;fb=a+468|0;gb=a+488|0;hb=a+280|0;ib=a+480|0;jb=a+484|0;kb=a+492|0;lb=a+560|0;mb=a+572|0;nb=a+584|0;ob=a+576|0;pb=a+588|0;qb=a+580|0;rb=a+568|0;sb=a+592|0;tb=a+552|0;ub=a+596|0;vb=a+608|0;wb=a+600|0;xb=a+612|0;yb=a+604|0;zb=a+556|0;Ab=a+616|0;Bb=a+544|0;Cb=a+620|0;Db=a+632|0;Eb=a+624|0;Fb=a+636|0;Gb=a+628|0;Hb=a+548|0;Ib=a+640|0;Jb=a+532|0;Kb=a+648|0;Lb=a+660|0;Mb=a+652|0;Nb=a+664|0;Ob=a+656|0;Pb=a+540|0;Qb=a+668|0;Rb=a+520|0;Sb=a+672|0;Tb=a+684|0;Ub=a+676|0;Wb=a+688|0;Xb=a+680|0;Yb=a+528|0;Zb=a+692|0;_b=a+504|0;$b=a+696|0;ac=a+708|0;bc=a+700|0;cc=a+712|0;dc=a+704|0;ec=a+724|0;fc=a+516|0;gc=a+716|0;hc=a+720|0;ic=a+728|0;jc=a+796|0;kc=a+808|0;lc=a+820|0;mc=a+812|0;nc=a+824|0;oc=a+816|0;pc=a+804|0;qc=a+828|0;rc=a+788|0;sc=a+832|0;tc=a+844|0;uc=a+836|0;vc=a+848|0;wc=a+840|0;xc=a+792|0;yc=a+852|0;zc=a+780|0;Ac=a+856|0;Bc=a+868|0;Cc=a+860|0;Dc=a+872|0;Ec=a+864|0;Fc=a+784|0;Gc=a+876|0;Hc=a+768|0;Ic=a+884|0;Jc=a+896|0;Kc=a+888|0;Lc=a+900|0;Mc=a+892|0;Nc=a+776|0;Oc=a+904|0;Pc=a+756|0;Qc=a+908|0;Rc=a+920|0;Sc=a+912|0;Tc=a+924|0;Uc=a+916|0;Vc=a+764|0;Wc=a+928|0;Xc=a+740|0;Yc=a+932|0;Zc=a+944|0;_c=a+936|0;$c=a+948|0;ad=a+940|0;bd=a+960|0;cd=a+752|0;dd=a+952|0;ed=a+956|0;fd=a+964|0;gd=a+1032|0;hd=a+1044|0;id=a+1056|0;jd=a+1048|0;kd=a+1060|0;ld=a+1052|0;md=a+1040|0;nd=a+1064|0;od=a+1024|0;pd=a+1068|0;qd=a+1080|0;rd=a+1072|0;sd=a+1084|0;td=a+1076|0;ud=a+1028|0;vd=a+1088|0;wd=a+1016|0;xd=a+1092|0;yd=a+1104|0;zd=a+1096|0;Ad=a+1108|0;Bd=a+1100|0;Cd=a+1020|0;Dd=a+1112|0;Ed=a+1004|0;Fd=a+1120|0;Gd=a+1132|0;Hd=a+1124|0;Id=a+1136|0;Jd=a+1128|0;Kd=a+1012|0;Ld=a+1140|0;Md=a+992|0;Nd=a+1144|0;Od=a+1156|0;Pd=a+1148|0;Qd=a+1160|0;Rd=a+1152|0;Sd=a+1e3|0;Td=a+1164|0;Ud=a+976|0;Vd=a+1168|0;Wd=a+1180|0;Xd=a+1172|0;Yd=a+1184|0;Zd=a+1176|0;_d=a+1196|0;$d=a+988|0;ae=a+1188|0;be=a+1192|0;ce=a+1200|0;de=a+1268|0;ee=a+1280|0;fe=a+1292|0;ge=a+1284|0;he=a+1296|0;ie=a+1288|0;je=a+1276|0;ke=a+1300|0;le=a+1260|0;me=a+1304|0;ne=a+1316|0;oe=a+1308|0;pe=a+1320|0;qe=a+1312|0;re=a+1264|0;se=a+1324|0;te=a+1252|0;ue=a+1328|0;ve=a+1340|0;we=a+1332|0;xe=a+1344|0;ye=a+1336|0;ze=a+1256|0;Ae=a+1348|0;Be=a+1240|0;Ce=a+1356|0;De=a+1368|0;Ee=a+1360|0;Fe=a+1372|0;Ge=a+1364|0;He=a+1248|0;Ie=a+1376|0;Je=a+1228|0;Ke=a+1380|0;Le=a+1392|0;Me=a+1384|0;Ne=a+1396|0;Oe=a+1388|0;Pe=a+1236|0;Qe=a+1400|0;Re=a+1212|0;Se=a+1404|0;Te=a+1416|0;Ue=a+1408|0;Ve=a+1420|0;We=a+1412|0;Xe=a+1432|0;Ye=a+1224|0;Ze=a+1424|0;_e=a+1428|0;$e=a+1436|0;af=a+1504|0;bf=a+1516|0;cf=a+1528|0;df=a+1520|0;ef=a+1532|0;ff=a+1524|0;gf=a+1512|0;hf=a+1536|0;jf=a+1496|0;kf=a+1540|0;lf=a+1552|0;mf=a+1544|0;nf=a+1556|0;of=a+1548|0;pf=a+1500|0;qf=a+1560|0;rf=a+1488|0;sf=a+1564|0;tf=a+1576|0;uf=a+1568|0;vf=a+1580|0;wf=a+1572|0;xf=a+1492|0;yf=a+1584|0;zf=a+1476|0;Af=a+1592|0;Bf=a+1604|0;Cf=a+1596|0;Df=a+1608|0;Ef=a+1600|0;Ff=a+1484|0;Gf=a+1612|0;Hf=a+1464|0;If=a+1616|0;Jf=a+1628|0;Kf=a+1620|0;Lf=a+1632|0;Mf=a+1624|0;Nf=a+1472|0;Of=a+1636|0;Pf=a+1448|0;Qf=a+1640|0;Rf=a+1652|0;Sf=a+1644|0;Tf=a+1656|0;Uf=a+1648|0;Vf=a+1668|0;Wf=a+1460|0;Xf=a+1660|0;Yf=a+1664|0;Zf=a+1672|0;_f=a+1740|0;$f=a+1752|0;ag=a+1764|0;bg=a+1756|0;cg=a+1768|0;dg=a+1760|0;eg=a+1748|0;fg=a+1772|0;gg=a+1732|0;hg=a+1776|0;ig=a+1788|0;jg=a+1780|0;kg=a+1792|0;lg=a+1784|0;mg=a+1736|0;ng=a+1796|0;og=a+1724|0;pg=a+1800|0;qg=a+1812|0;rg=a+1804|0;sg=a+1816|0;tg=a+1808|0;ug=a+1728|0;vg=a+1820|0;wg=a+1712|0;xg=a+1828|0;yg=a+1840|0;zg=a+1832|0;Ag=a+1844|0;Bg=a+1836|0;Cg=a+1720|0;Dg=a+1848|0;Eg=a+1700|0;Fg=a+1852|0;Gg=a+1864|0;Hg=a+1856|0;Ig=a+1868|0;Jg=a+1860|0;Kg=a+1708|0;Lg=a+1872|0;Mg=a+1684|0;Ng=a+1876|0;Og=a+1888|0;Pg=a+1880|0;Qg=a+1892|0;Rg=a+1884|0;Sg=a+1904|0;Tg=a+1696|0;Ug=a+1896|0;Vg=a+1900|0;Wg=a+1908|0;Xg=a+1976|0;Yg=a+1988|0;Zg=a+2e3|0;_g=a+1992|0;$g=a+2004|0;ah=a+1996|0;bh=a+1984|0;ch=a+2008|0;dh=a+1968|0;eh=a+2012|0;fh=a+2024|0;gh=a+2016|0;hh=a+2028|0;ih=a+2020|0;jh=a+1972|0;kh=a+2032|0;lh=a+1960|0;mh=a+2036|0;nh=a+2048|0;oh=a+2040|0;ph=a+2052|0;qh=a+2044|0;rh=a+1964|0;sh=a+2056|0;th=a+1948|0;uh=a+2064|0;vh=a+2076|0;wh=a+2068|0;xh=a+2080|0;yh=a+2072|0;zh=a+1956|0;Ah=a+2084|0;Bh=a+1936|0;Ch=a+2088|0;Dh=a+2100|0;Eh=a+2092|0;Fh=a+2104|0;Gh=a+2096|0;Hh=a+1944|0;Ih=a+2108|0;Jh=a+1920|0;Kh=a+2112|0;Lh=a+2124|0;Mh=a+2116|0;Nh=a+2128|0;Oh=a+2120|0;Ph=a+2140|0;Qh=a+1932|0;Rh=a+2132|0;Sh=a+2136|0;Th=a+2144|0;Uh=a+2212|0;Vh=a+2224|0;Wh=a+2236|0;Xh=a+2228|0;Yh=a+2240|0;Zh=a+2232|0;_h=a+2220|0;$h=a+2244|0;ai=a+2204|0;bi=a+2248|0;ci=a+2260|0;di=a+2252|0;ei=a+2264|0;fi=a+2256|0;gi=a+2208|0;hi=a+2268|0;ii=a+2196|0;ji=a+2272|0;ki=a+2284|0;li=a+2276|0;mi=a+2288|0;ni=a+2280|0;oi=a+2200|0;pi=a+2292|0;qi=a+2184|0;ri=a+2300|0;si=a+2312|0;ti=a+2304|0;ui=a+2316|0;vi=a+2308|0;wi=a+2192|0;xi=a+2320|0;yi=a+2172|0;zi=a+2324|0;Ai=a+2336|0;Bi=a+2328|0;Ci=a+2340|0;Di=a+2332|0;Ei=a+2180|0;Fi=a+2344|0;Gi=a+2156|0;Hi=a+2348|0;Ii=a+2360|0;Ji=a+2352|0;Ki=a+2364|0;Li=a+2356|0;Mi=a+2376|0;Ni=a+2168|0;Oi=a+2368|0;Pi=a+2372|0;Qi=a+2380|0;Ri=a+2448|0;Si=a+2460|0;Ti=a+2472|0;Ui=a+2464|0;Vi=a+2476|0;Wi=a+2468|0;Xi=a+2456|0;Yi=a+2480|0;Zi=a+2440|0;_i=a+2484|0;$i=a+2496|0;aj=a+2488|0;bj=a+2500|0;cj=a+2492|0;dj=a+2444|0;ej=a+2504|0;fj=a+2432|0;gj=a+2508|0;hj=a+2520|0;ij=a+2512|0;jj=a+2524|0;kj=a+2516|0;lj=a+2436|0;mj=a+2528|0;nj=a+2420|0;oj=a+2536|0;pj=a+2548|0;qj=a+2540|0;rj=a+2552|0;sj=a+2544|0;tj=a+2428|0;uj=a+2556|0;vj=a+2408|0;wj=a+2560|0;xj=a+2572|0;yj=a+2564|0;zj=a+2576|0;Aj=a+2568|0;Bj=a+2416|0;Cj=a+2580|0;Dj=a+2392|0;Ej=a+2584|0;Fj=a+2596|0;Gj=a+2588|0;Hj=a+2600|0;Ij=a+2592|0;Jj=a+2612|0;Kj=a+2404|0;Lj=a+2604|0;Mj=a+2608|0;Nj=a+2616|0;Oj=a+2684|0;Pj=a+2696|0;Qj=a+2708|0;Rj=a+2700|0;Sj=a+2712|0;Tj=a+2704|0;Uj=a+2692|0;Vj=a+2716|0;Wj=a+2676|0;Xj=a+2720|0;Yj=a+2732|0;Zj=a+2724|0;_j=a+2736|0;$j=a+2728|0;ak=a+2680|0;bk=a+2740|0;ck=a+2668|0;dk=a+2744|0;ek=a+2756|0;fk=a+2748|0;gk=a+2760|0;hk=a+2752|0;ik=a+2672|0;jk=a+2764|0;kk=a+2656|0;lk=a+2772|0;mk=a+2784|0;nk=a+2776|0;ok=a+2788|0;pk=a+2780|0;qk=a+2664|0;rk=a+2792|0;sk=a+2644|0;tk=a+2796|0;uk=a+2808|0;vk=a+2800|0;wk=a+2812|0;xk=a+2804|0;yk=a+2652|0;zk=a+2816|0;Ak=a+2628|0;Bk=a+2820|0;Ck=a+2832|0;Dk=a+2824|0;Ek=a+2836|0;Fk=a+2828|0;Gk=a+2848|0;Hk=a+2640|0;Ik=a+2840|0;Jk=a+2844|0;Kk=a+2852|0;Lk=a+2920|0;Mk=a+2932|0;Nk=a+2944|0;Ok=a+2936|0;Pk=a+2948|0;Qk=a+2940|0;Rk=a+2928|0;Sk=a+2952|0;Tk=a+2912|0;Uk=a+2956|0;Vk=a+2968|0;Wk=a+2960|0;Xk=a+2972|0;Yk=a+2964|0;Zk=a+2916|0;_k=a+2976|0;$k=a+2904|0;al=a+2980|0;bl=a+2992|0;cl=a+2984|0;dl=a+2996|0;el=a+2988|0;fl=a+2908|0;gl=a+3e3|0;hl=a+2892|0;il=a+3008|0;jl=a+3020|0;kl=a+3012|0;ll=a+3024|0;ml=a+3016|0;nl=a+2900|0;ol=a+3028|0;pl=a+2880|0;ql=a+3032|0;rl=a+3044|0;sl=a+3036|0;tl=a+3048|0;ul=a+3040|0;vl=a+2888|0;wl=a+3052|0;xl=a+2864|0;yl=a+3056|0;zl=a+3068|0;Al=a+3060|0;Bl=a+3072|0;Cl=a+3064|0;Dl=a+3084|0;El=a+2876|0;Fl=a+3076|0;Gl=a+3080|0;Hl=a+3088|0;Il=a+3156|0;Jl=a+3168|0;Kl=a+3180|0;Ll=a+3172|0;Ml=a+3184|0;Nl=a+3176|0;Ol=a+3164|0;Pl=a+3188|0;Ql=a+3148|0;Rl=a+3192|0;Sl=a+3204|0;Tl=a+3196|0;Ul=a+3208|0;Vl=a+3200|0;Wl=a+3152|0;Xl=a+3212|0;Yl=a+3140|0;Zl=a+3216|0;_l=a+3228|0;$l=a+3220|0;am=a+3232|0;bm=a+3224|0;cm=a+3144|0;dm=a+3236|0;em=a+3128|0;fm=a+3244|0;gm=a+3256|0;hm=a+3248|0;im=a+3260|0;jm=a+3252|0;km=a+3136|0;lm=a+3264|0;mm=a+3116|0;nm=a+3268|0;om=a+3280|0;pm=a+3272|0;qm=a+3284|0;rm=a+3276|0;sm=a+3124|0;tm=a+3288|0;um=a+3100|0;vm=a+3292|0;wm=a+3304|0;xm=a+3296|0;ym=a+3308|0;zm=a+3300|0;Am=a+3320|0;Bm=a+3112|0;Cm=a+3312|0;Dm=a+3316|0;Em=a+3324|0;Fm=a+3344|0;Gm=a+3356|0;Hm=a+3368|0;Im=a+3360|0;Jm=a+3372|0;Km=a+3364|0;Lm=a+3352|0;Mm=a+3376|0;Nm=a+3336|0;Om=a+3380|0;Pm=a+3392|0;Qm=a+3384|0;Rm=a+3396|0;Sm=a+3388|0;Tm=a+3340|0;Um=a+3400|0;Vm=a+3328|0;Wm=a+3404|0;Xm=a+3416|0;Ym=a+3408|0;Zm=a+3420|0;_m=a+3412|0;$m=a+3432|0;an=a+3332|0;bn=a+3424|0;cn=a+3428|0;dn=a+3436|0;en=+g[r>>2];fn=+g[t>>2];gn=+g[w>>2];hn=+g[x>>2];jn=c[z>>2]|0;kn=+g[B>>2];ln=+g[D>>2];mn=+g[G>>2];nn=+g[H>>2];on=+g[L>>2];pn=+g[N>>2];qn=+g[U>>2];rn=+g[Z>>2];sn=+g[ea>>2];if((~~+g[a+80>>2]|0)==0){tn=en;un=fn;vn=gn;wn=hn;a=jn;xn=kn;yn=ln;zn=mn;An=nn;Bn=on;Cn=pn;Dn=qn;En=rn;Fn=sn;Gn=0;do{c[e>>2]=1;Hn=l+tn*.9990000128746033;g[s>>2]=Hn;In=h+m*un;g[u>>2]=In;Jn=+g[v>>2]*In;In=+X(+Jn);Kn=+W(+Jn);Jn=In*vn+Kn*wn;g[y>>2]=Jn;g[A>>2]=Kn*vn+(0.0-In)*wn+1.0- +(a|0);In=n+xn*.9990000128746033;g[C>>2]=In;Kn=o+yn*.9990000128746033;g[E>>2]=Kn;Ln=Hn*Jn*+V(10.0,+(In*2.0))+Kn;Kn=Ln<1.0?Ln:1.0;Ln=Kn>-1.0?Kn:-1.0;Kn=Ln*(1.0-Ln*Ln*.3333333432674408);g[F>>2]=Kn;Ln=zn*.9950000047683716+Kn-An;g[I>>2]=Ln;Kn=+g[J>>2];In=Ln-Kn*(+g[K>>2]*Bn+ +g[M>>2]*Cn);g[O>>2]=In;Jn=+g[P>>2];Hn=+g[R>>2];Mn=Kn*(Jn*Cn+(+g[Q>>2]*Bn+Jn*In))-Hn*(+g[S>>2]*Dn+ +g[Y>>2]*En);g[_>>2]=Mn;In=+g[$>>2];Jn=+g[ca>>2];Kn=+g[ga>>2];Nn=Hn*(In*Mn+ +g[aa>>2]*Dn+In*En)-Jn*(+g[da>>2]*Fn+ +g[fa>>2]*Kn);g[ha>>2]=Nn;In=+g[ja>>2];Mn=j*+g[ia>>2]+k*+T(+(Jn*(In*Kn+(In*Nn+ +g[ka>>2]*+g[ea>>2]))));g[la>>2]=Mn;g[ma>>2]=f+ +Vb(+Mn)*20.0;Mn=+g[na>>2];Nn=+g[pa>>2];In=+g[ra>>2];Kn=Ln-Mn*(+g[oa>>2]*Nn+ +g[qa>>2]*In);g[sa>>2]=Kn;Jn=+g[ta>>2];Hn=+g[va>>2];On=+g[xa>>2];Pn=+g[za>>2];Qn=Mn*(Jn*Kn+ +g[ua>>2]*Nn+Jn*In)-Hn*(+g[wa>>2]*On+ +g[ya>>2]*Pn);g[Aa>>2]=Qn;In=+g[Ba>>2];Jn=+g[Da>>2];Nn=+g[Fa>>2];Kn=+g[Ha>>2];Mn=Hn*(In*Qn+ +g[Ca>>2]*Pn+In*On)-Jn*(+g[Ea>>2]*Nn+ +g[Ga>>2]*Kn);g[Ia>>2]=Mn;On=+g[Ja>>2];In=Jn*(On*Mn+ +g[Ka>>2]*Nn+On*Kn);Kn=+g[La>>2];On=+g[Na>>2];Nn=+g[Qa>>2];Mn=In-Kn*(+g[Ma>>2]*On+ +g[Oa>>2]*Nn);g[Ra>>2]=Mn;Jn=+g[Sa>>2];Pn=+g[Ua>>2];Qn=+g[Wa>>2];Hn=+g[Ya>>2];Rn=Kn*(Jn*Mn+ +g[Ta>>2]*On+Jn*Nn)-Pn*(+g[Va>>2]*Qn+ +g[Xa>>2]*Hn);g[Za>>2]=Rn;Nn=+g[_a>>2];Jn=+g[ab>>2];On=+g[cb>>2];Mn=+g[eb>>2];Kn=Pn*(Nn*Hn+(Nn*Rn+ +g[$a>>2]*Qn))-Jn*(+g[bb>>2]*On+ +g[db>>2]*Mn);g[fb>>2]=Kn;Qn=+g[hb>>2];Rn=j*+g[gb>>2]+k*+T(+(Jn*(Qn*Mn+(Qn*Kn+ +g[ib>>2]*On))));g[jb>>2]=Rn;g[kb>>2]=f+ +Vb(+Rn)*20.0;Rn=+g[lb>>2];On=+g[nb>>2];Kn=+g[pb>>2];Qn=In-Rn*(+g[mb>>2]*On+ +g[ob>>2]*Kn);g[qb>>2]=Qn;In=+g[rb>>2];Mn=+g[tb>>2];Jn=+g[vb>>2];Nn=+g[xb>>2];Hn=Rn*(In*Kn+(In*Qn+ +g[sb>>2]*On))-Mn*(+g[ub>>2]*Jn+ +g[wb>>2]*Nn);g[yb>>2]=Hn;On=+g[zb>>2];Qn=+g[Bb>>2];In=+g[Db>>2];Kn=+g[Fb>>2];Rn=Mn*(On*Hn+ +g[Ab>>2]*Jn+On*Nn)-Qn*(+g[Cb>>2]*In+ +g[Eb>>2]*Kn);g[Gb>>2]=Rn;Nn=+g[Hb>>2];On=Qn*(Nn*Rn+ +g[Ib>>2]*In+Nn*Kn);Kn=+g[Jb>>2];Nn=+g[Lb>>2];In=+g[Nb>>2];Rn=On-Kn*(+g[Kb>>2]*Nn+ +g[Mb>>2]*In);g[Ob>>2]=Rn;Qn=+g[Pb>>2];Jn=+g[Rb>>2];Hn=+g[Tb>>2];Mn=+g[Wb>>2];Pn=Kn*(Qn*In+(Qn*Rn+ +g[Qb>>2]*Nn))-Jn*(+g[Sb>>2]*Hn+ +g[Ub>>2]*Mn);g[Xb>>2]=Pn;Nn=+g[Yb>>2];Rn=+g[_b>>2];Qn=+g[ac>>2];In=+g[cc>>2];Kn=Jn*(Nn*Mn+(Nn*Pn+ +g[Zb>>2]*Hn))-Rn*(+g[$b>>2]*Qn+ +g[bc>>2]*In);g[dc>>2]=Kn;Hn=+g[fc>>2];Pn=j*+g[ec>>2]+k*+T(+(Rn*(Hn*In+(Hn*Kn+ +g[gc>>2]*Qn))));g[hc>>2]=Pn;g[ic>>2]=f+ +Vb(+Pn)*20.0;Pn=+g[jc>>2];Qn=+g[lc>>2];Kn=+g[nc>>2];Hn=On-Pn*(+g[kc>>2]*Qn+ +g[mc>>2]*Kn);g[oc>>2]=Hn;On=+g[pc>>2];In=+g[rc>>2];Rn=+g[tc>>2];Nn=+g[vc>>2];Mn=Pn*(On*Kn+(On*Hn+ +g[qc>>2]*Qn))-In*(+g[sc>>2]*Rn+ +g[uc>>2]*Nn);g[wc>>2]=Mn;Qn=+g[xc>>2];Hn=+g[zc>>2];On=+g[Bc>>2];Kn=+g[Dc>>2];Pn=In*(Qn*Mn+ +g[yc>>2]*Rn+Qn*Nn)-Hn*(+g[Ac>>2]*On+ +g[Cc>>2]*Kn);g[Ec>>2]=Pn;Nn=+g[Fc>>2];Qn=Hn*(Nn*Kn+(Nn*Pn+ +g[Gc>>2]*On));On=+g[Hc>>2];Pn=+g[Jc>>2];Nn=+g[Lc>>2];Kn=Qn-On*(+g[Ic>>2]*Pn+ +g[Kc>>2]*Nn);g[Mc>>2]=Kn;Hn=+g[Nc>>2];Rn=+g[Pc>>2];Mn=+g[Rc>>2];In=+g[Tc>>2];Jn=On*(Hn*Nn+(Hn*Kn+ +g[Oc>>2]*Pn))-Rn*(+g[Qc>>2]*Mn+ +g[Sc>>2]*In);g[Uc>>2]=Jn;Pn=+g[Vc>>2];Kn=+g[Xc>>2];Hn=+g[Zc>>2];Nn=+g[$c>>2];On=Rn*(Pn*In+(Pn*Jn+ +g[Wc>>2]*Mn))-Kn*(+g[Yc>>2]*Hn+ +g[_c>>2]*Nn);g[ad>>2]=On;Mn=+g[cd>>2];Jn=j*+g[bd>>2]+k*+T(+(Kn*(Mn*Nn+(Mn*On+ +g[dd>>2]*Hn))));g[ed>>2]=Jn;g[fd>>2]=f+ +Vb(+Jn)*20.0;Jn=+g[gd>>2];Hn=+g[id>>2];On=+g[kd>>2];Mn=Qn-Jn*(+g[hd>>2]*Hn+ +g[jd>>2]*On);g[ld>>2]=Mn;Qn=+g[md>>2];Nn=+g[od>>2];Kn=+g[qd>>2];Pn=+g[sd>>2];In=Jn*(Qn*On+(Qn*Mn+ +g[nd>>2]*Hn))-Nn*(+g[pd>>2]*Kn+ +g[rd>>2]*Pn);g[td>>2]=In;Hn=+g[ud>>2];Mn=+g[wd>>2];Qn=+g[yd>>2];On=+g[Ad>>2];Jn=Nn*(Hn*Pn+(Hn*In+ +g[vd>>2]*Kn))-Mn*(+g[xd>>2]*Qn+ +g[zd>>2]*On);g[Bd>>2]=Jn;Kn=+g[Cd>>2];In=Mn*(Kn*On+(Kn*Jn+ +g[Dd>>2]*Qn));Qn=+g[Ed>>2];Jn=+g[Gd>>2];Kn=+g[Id>>2];On=In-Qn*(+g[Fd>>2]*Jn+ +g[Hd>>2]*Kn);g[Jd>>2]=On;Mn=+g[Kd>>2];Hn=+g[Md>>2];Pn=+g[Od>>2];Nn=+g[Qd>>2];Rn=Qn*(Mn*Kn+(Mn*On+ +g[Ld>>2]*Jn))-Hn*(+g[Nd>>2]*Pn+ +g[Pd>>2]*Nn);g[Rd>>2]=Rn;Jn=+g[Sd>>2];On=+g[Ud>>2];Mn=+g[Wd>>2];Kn=+g[Yd>>2];Qn=Hn*(Jn*Nn+(Jn*Rn+ +g[Td>>2]*Pn))-On*(+g[Vd>>2]*Mn+ +g[Xd>>2]*Kn);g[Zd>>2]=Qn;Pn=+g[$d>>2];Rn=j*+g[_d>>2]+k*+T(+(On*(Pn*Kn+(Pn*Qn+ +g[ae>>2]*Mn))));g[be>>2]=Rn;g[ce>>2]=f+ +Vb(+Rn)*20.0;Rn=+g[de>>2];Mn=+g[fe>>2];Qn=+g[he>>2];Pn=In-Rn*(+g[ee>>2]*Mn+ +g[ge>>2]*Qn);g[ie>>2]=Pn;In=+g[je>>2];Kn=+g[le>>2];On=+g[ne>>2];Jn=+g[pe>>2];Nn=Rn*(In*Qn+(In*Pn+ +g[ke>>2]*Mn))-Kn*(+g[me>>2]*On+ +g[oe>>2]*Jn);g[qe>>2]=Nn;Mn=+g[re>>2];Pn=+g[te>>2];In=+g[ve>>2];Qn=+g[xe>>2];Rn=Kn*(Mn*Jn+(Mn*Nn+ +g[se>>2]*On))-Pn*(+g[ue>>2]*In+ +g[we>>2]*Qn);g[ye>>2]=Rn;On=+g[ze>>2];Nn=Pn*(On*Qn+(On*Rn+ +g[Ae>>2]*In));In=+g[Be>>2];Rn=+g[De>>2];On=+g[Fe>>2];Qn=Nn-In*(+g[Ce>>2]*Rn+ +g[Ee>>2]*On);g[Ge>>2]=Qn;Pn=+g[He>>2];Mn=+g[Je>>2];Jn=+g[Le>>2];Kn=+g[Ne>>2];Hn=In*(Pn*On+(Pn*Qn+ +g[Ie>>2]*Rn))-Mn*(+g[Ke>>2]*Jn+ +g[Me>>2]*Kn);g[Oe>>2]=Hn;Rn=+g[Pe>>2];Qn=+g[Re>>2];Pn=+g[Te>>2];On=+g[Ve>>2];In=Mn*(Rn*Kn+(Rn*Hn+ +g[Qe>>2]*Jn))-Qn*(+g[Se>>2]*Pn+ +g[Ue>>2]*On);g[We>>2]=In;Jn=+g[Ye>>2];Hn=j*+g[Xe>>2]+k*+T(+(Qn*(Jn*On+(Jn*In+ +g[Ze>>2]*Pn))));g[_e>>2]=Hn;g[$e>>2]=f+ +Vb(+Hn)*20.0;Hn=+g[af>>2];Pn=+g[cf>>2];In=+g[ef>>2];Jn=Nn-Hn*(+g[bf>>2]*Pn+ +g[df>>2]*In);g[ff>>2]=Jn;Nn=+g[gf>>2];On=+g[jf>>2];Qn=+g[lf>>2];Rn=+g[nf>>2];Kn=Hn*(Nn*In+(Nn*Jn+ +g[hf>>2]*Pn))-On*(+g[kf>>2]*Qn+ +g[mf>>2]*Rn);g[of>>2]=Kn;Pn=+g[pf>>2];Jn=+g[rf>>2];Nn=+g[tf>>2];In=+g[vf>>2];Hn=On*(Pn*Rn+(Pn*Kn+ +g[qf>>2]*Qn))-Jn*(+g[sf>>2]*Nn+ +g[uf>>2]*In);g[wf>>2]=Hn;Qn=+g[xf>>2];Kn=Jn*(Qn*In+(Qn*Hn+ +g[yf>>2]*Nn));Nn=+g[zf>>2];Hn=+g[Bf>>2];Qn=+g[Df>>2];In=Kn-Nn*(+g[Af>>2]*Hn+ +g[Cf>>2]*Qn);g[Ef>>2]=In;Jn=+g[Ff>>2];Pn=+g[Hf>>2];Rn=+g[Jf>>2];On=+g[Lf>>2];Mn=Nn*(Jn*Qn+(Jn*In+ +g[Gf>>2]*Hn))-Pn*(+g[If>>2]*Rn+ +g[Kf>>2]*On);g[Mf>>2]=Mn;Hn=+g[Nf>>2];In=+g[Pf>>2];Jn=+g[Rf>>2];Qn=+g[Tf>>2];Nn=Pn*(Hn*On+(Hn*Mn+ +g[Of>>2]*Rn))-In*(+g[Qf>>2]*Jn+ +g[Sf>>2]*Qn);g[Uf>>2]=Nn;Rn=+g[Wf>>2];Mn=j*+g[Vf>>2]+k*+T(+(In*(Rn*Qn+(Rn*Nn+ +g[Xf>>2]*Jn))));g[Yf>>2]=Mn;g[Zf>>2]=f+ +Vb(+Mn)*20.0;Mn=+g[_f>>2];Jn=+g[ag>>2];Nn=+g[cg>>2];Rn=Kn-Mn*(+g[$f>>2]*Jn+ +g[bg>>2]*Nn);g[dg>>2]=Rn;Kn=+g[eg>>2];Qn=+g[gg>>2];In=+g[ig>>2];Hn=+g[kg>>2];On=Mn*(Kn*Nn+(Kn*Rn+ +g[fg>>2]*Jn))-Qn*(+g[hg>>2]*In+ +g[jg>>2]*Hn);g[lg>>2]=On;Jn=+g[mg>>2];Rn=+g[og>>2];Kn=+g[qg>>2];Nn=+g[sg>>2];Mn=Qn*(Jn*Hn+(Jn*On+ +g[ng>>2]*In))-Rn*(+g[pg>>2]*Kn+ +g[rg>>2]*Nn);g[tg>>2]=Mn;In=+g[ug>>2];On=Rn*(In*Nn+(In*Mn+ +g[vg>>2]*Kn));Kn=+g[wg>>2];Mn=+g[yg>>2];In=+g[Ag>>2];Nn=On-Kn*(+g[xg>>2]*Mn+ +g[zg>>2]*In);g[Bg>>2]=Nn;Rn=+g[Cg>>2];Jn=+g[Eg>>2];Hn=+g[Gg>>2];Qn=+g[Ig>>2];Pn=Kn*(Rn*In+(Rn*Nn+ +g[Dg>>2]*Mn))-Jn*(+g[Fg>>2]*Hn+ +g[Hg>>2]*Qn);g[Jg>>2]=Pn;Mn=+g[Kg>>2];Nn=+g[Mg>>2];Rn=+g[Og>>2];In=+g[Qg>>2];Kn=Jn*(Mn*Qn+(Mn*Pn+ +g[Lg>>2]*Hn))-Nn*(+g[Ng>>2]*Rn+ +g[Pg>>2]*In);g[Rg>>2]=Kn;Hn=+g[Tg>>2];Pn=j*+g[Sg>>2]+k*+T(+(Nn*(Hn*In+(Hn*Kn+ +g[Ug>>2]*Rn))));g[Vg>>2]=Pn;g[Wg>>2]=f+ +Vb(+Pn)*20.0;Pn=+g[Xg>>2];Rn=+g[Zg>>2];Kn=+g[$g>>2];Hn=On-Pn*(+g[Yg>>2]*Rn+ +g[_g>>2]*Kn);g[ah>>2]=Hn;On=+g[bh>>2];In=+g[dh>>2];Nn=+g[fh>>2];Mn=+g[hh>>2];Qn=Pn*(On*Kn+(On*Hn+ +g[ch>>2]*Rn))-In*(+g[eh>>2]*Nn+ +g[gh>>2]*Mn);g[ih>>2]=Qn;Rn=+g[jh>>2];Hn=+g[lh>>2];On=+g[nh>>2];Kn=+g[ph>>2];Pn=In*(Rn*Mn+(Rn*Qn+ +g[kh>>2]*Nn))-Hn*(+g[mh>>2]*On+ +g[oh>>2]*Kn);g[qh>>2]=Pn;Nn=+g[rh>>2];Qn=Hn*(Nn*Kn+(Nn*Pn+ +g[sh>>2]*On));On=+g[th>>2];Pn=+g[vh>>2];Nn=+g[xh>>2];Kn=Qn-On*(+g[uh>>2]*Pn+ +g[wh>>2]*Nn);g[yh>>2]=Kn;Hn=+g[zh>>2];Rn=+g[Bh>>2];Mn=+g[Dh>>2];In=+g[Fh>>2];Jn=On*(Hn*Nn+(Hn*Kn+ +g[Ah>>2]*Pn))-Rn*(+g[Ch>>2]*Mn+ +g[Eh>>2]*In);g[Gh>>2]=Jn;Pn=+g[Hh>>2];Kn=+g[Jh>>2];Hn=+g[Lh>>2];Nn=+g[Nh>>2];On=Rn*(Pn*In+(Pn*Jn+ +g[Ih>>2]*Mn))-Kn*(+g[Kh>>2]*Hn+ +g[Mh>>2]*Nn);g[Oh>>2]=On;Mn=+g[Qh>>2];Jn=j*+g[Ph>>2]+k*+T(+(Kn*(Mn*Nn+(Mn*On+ +g[Rh>>2]*Hn))));g[Sh>>2]=Jn;g[Th>>2]=f+ +Vb(+Jn)*20.0;Jn=+g[Uh>>2];Hn=+g[Wh>>2];On=+g[Yh>>2];Mn=Qn-Jn*(+g[Vh>>2]*Hn+ +g[Xh>>2]*On);g[Zh>>2]=Mn;Qn=+g[_h>>2];Nn=+g[ai>>2];Kn=+g[ci>>2];Pn=+g[ei>>2];In=Jn*(Qn*On+(Qn*Mn+ +g[$h>>2]*Hn))-Nn*(+g[bi>>2]*Kn+ +g[di>>2]*Pn);g[fi>>2]=In;Hn=+g[gi>>2];Mn=+g[ii>>2];Qn=+g[ki>>2];On=+g[mi>>2];Jn=Nn*(Hn*Pn+(Hn*In+ +g[hi>>2]*Kn))-Mn*(+g[ji>>2]*Qn+ +g[li>>2]*On);g[ni>>2]=Jn;Kn=+g[oi>>2];In=Mn*(Kn*On+(Kn*Jn+ +g[pi>>2]*Qn));Qn=+g[qi>>2];Jn=+g[si>>2];Kn=+g[ui>>2];On=In-Qn*(+g[ri>>2]*Jn+ +g[ti>>2]*Kn);g[vi>>2]=On;Mn=+g[wi>>2];Hn=+g[yi>>2];Pn=+g[Ai>>2];Nn=+g[Ci>>2];Rn=Qn*(Mn*Kn+(Mn*On+ +g[xi>>2]*Jn))-Hn*(+g[zi>>2]*Pn+ +g[Bi>>2]*Nn);g[Di>>2]=Rn;Jn=+g[Ei>>2];On=+g[Gi>>2];Mn=+g[Ii>>2];Kn=+g[Ki>>2];Qn=Hn*(Jn*Nn+(Jn*Rn+ +g[Fi>>2]*Pn))-On*(+g[Hi>>2]*Mn+ +g[Ji>>2]*Kn);g[Li>>2]=Qn;Pn=+g[Ni>>2];Rn=j*+g[Mi>>2]+k*+T(+(On*(Pn*Kn+(Pn*Qn+ +g[Oi>>2]*Mn))));g[Pi>>2]=Rn;g[Qi>>2]=f+ +Vb(+Rn)*20.0;Rn=+g[Ri>>2];Mn=+g[Ti>>2];Qn=+g[Vi>>2];Pn=In-Rn*(+g[Si>>2]*Mn+ +g[Ui>>2]*Qn);g[Wi>>2]=Pn;In=+g[Xi>>2];Kn=+g[Zi>>2];On=+g[$i>>2];Jn=+g[bj>>2];Nn=Rn*(In*Qn+(In*Pn+ +g[Yi>>2]*Mn))-Kn*(+g[_i>>2]*On+ +g[aj>>2]*Jn);g[cj>>2]=Nn;Mn=+g[dj>>2];Pn=+g[fj>>2];In=+g[hj>>2];Qn=+g[jj>>2];Rn=Kn*(Mn*Jn+(Mn*Nn+ +g[ej>>2]*On))-Pn*(+g[gj>>2]*In+ +g[ij>>2]*Qn);g[kj>>2]=Rn;On=+g[lj>>2];Nn=Pn*(On*Qn+(On*Rn+ +g[mj>>2]*In));In=+g[nj>>2];Rn=+g[pj>>2];On=+g[rj>>2];Qn=Nn-In*(+g[oj>>2]*Rn+ +g[qj>>2]*On);g[sj>>2]=Qn;Pn=+g[tj>>2];Mn=+g[vj>>2];Jn=+g[xj>>2];Kn=+g[zj>>2];Hn=In*(Pn*On+(Pn*Qn+ +g[uj>>2]*Rn))-Mn*(+g[wj>>2]*Jn+ +g[yj>>2]*Kn);g[Aj>>2]=Hn;Rn=+g[Bj>>2];Qn=+g[Dj>>2];Pn=+g[Fj>>2];On=+g[Hj>>2];In=Mn*(Rn*Kn+(Rn*Hn+ +g[Cj>>2]*Jn))-Qn*(+g[Ej>>2]*Pn+ +g[Gj>>2]*On);g[Ij>>2]=In;Jn=+g[Kj>>2];Hn=j*+g[Jj>>2]+k*+T(+(Qn*(Jn*On+(Jn*In+ +g[Lj>>2]*Pn))));g[Mj>>2]=Hn;g[Nj>>2]=f+ +Vb(+Hn)*20.0;Hn=+g[Oj>>2];Pn=+g[Qj>>2];In=+g[Sj>>2];Jn=Nn-Hn*(+g[Pj>>2]*Pn+ +g[Rj>>2]*In);g[Tj>>2]=Jn;Nn=+g[Uj>>2];On=+g[Wj>>2];Qn=+g[Yj>>2];Rn=+g[_j>>2];Kn=Hn*(Nn*In+(Nn*Jn+ +g[Vj>>2]*Pn))-On*(+g[Xj>>2]*Qn+ +g[Zj>>2]*Rn);g[$j>>2]=Kn;Pn=+g[ak>>2];Jn=+g[ck>>2];Nn=+g[ek>>2];In=+g[gk>>2];Hn=On*(Pn*Rn+(Pn*Kn+ +g[bk>>2]*Qn))-Jn*(+g[dk>>2]*Nn+ +g[fk>>2]*In);g[hk>>2]=Hn;Qn=+g[ik>>2];Kn=Jn*(Qn*In+(Qn*Hn+ +g[jk>>2]*Nn));Nn=+g[kk>>2];Hn=+g[mk>>2];Qn=+g[ok>>2];In=Kn-Nn*(+g[lk>>2]*Hn+ +g[nk>>2]*Qn);g[pk>>2]=In;Jn=+g[qk>>2];Pn=+g[sk>>2];Rn=+g[uk>>2];On=+g[wk>>2];Mn=Nn*(Jn*Qn+(Jn*In+ +g[rk>>2]*Hn))-Pn*(+g[tk>>2]*Rn+ +g[vk>>2]*On);g[xk>>2]=Mn;Hn=+g[yk>>2];In=+g[Ak>>2];Jn=+g[Ck>>2];Qn=+g[Ek>>2];Nn=Pn*(Hn*On+(Hn*Mn+ +g[zk>>2]*Rn))-In*(+g[Bk>>2]*Jn+ +g[Dk>>2]*Qn);g[Fk>>2]=Nn;Rn=+g[Hk>>2];Mn=j*+g[Gk>>2]+k*+T(+(In*(Rn*Qn+(Rn*Nn+ +g[Ik>>2]*Jn))));g[Jk>>2]=Mn;g[Kk>>2]=f+ +Vb(+Mn)*20.0;Mn=+g[Lk>>2];Jn=+g[Nk>>2];Nn=+g[Pk>>2];Rn=Kn-Mn*(+g[Mk>>2]*Jn+ +g[Ok>>2]*Nn);g[Qk>>2]=Rn;Kn=+g[Rk>>2];Qn=+g[Tk>>2];In=+g[Vk>>2];Hn=+g[Xk>>2];On=Mn*(Kn*Nn+(Kn*Rn+ +g[Sk>>2]*Jn))-Qn*(+g[Uk>>2]*In+ +g[Wk>>2]*Hn);g[Yk>>2]=On;Jn=+g[Zk>>2];Rn=+g[$k>>2];Kn=+g[bl>>2];Nn=+g[dl>>2];Mn=Qn*(Jn*Hn+(Jn*On+ +g[_k>>2]*In))-Rn*(+g[al>>2]*Kn+ +g[cl>>2]*Nn);g[el>>2]=Mn;In=+g[fl>>2];On=Rn*(In*Nn+(In*Mn+ +g[gl>>2]*Kn));Kn=+g[hl>>2];Mn=+g[jl>>2];In=+g[ll>>2];Nn=On-Kn*(+g[il>>2]*Mn+ +g[kl>>2]*In);g[ml>>2]=Nn;Rn=+g[nl>>2];Jn=+g[pl>>2];Hn=+g[rl>>2];Qn=+g[tl>>2];Pn=Kn*(Rn*In+(Rn*Nn+ +g[ol>>2]*Mn))-Jn*(+g[ql>>2]*Hn+ +g[sl>>2]*Qn);g[ul>>2]=Pn;Mn=+g[vl>>2];Nn=+g[xl>>2];Rn=+g[zl>>2];In=+g[Bl>>2];Kn=Jn*(Mn*Qn+(Mn*Pn+ +g[wl>>2]*Hn))-Nn*(+g[yl>>2]*Rn+ +g[Al>>2]*In);g[Cl>>2]=Kn;Hn=+g[El>>2];Pn=j*+g[Dl>>2]+k*+T(+(Nn*(Hn*In+(Hn*Kn+ +g[Fl>>2]*Rn))));g[Gl>>2]=Pn;g[Hl>>2]=f+ +Vb(+Pn)*20.0;Pn=+g[Il>>2];Rn=+g[Kl>>2];Kn=+g[Ml>>2];Hn=On-Pn*(+g[Jl>>2]*Rn+ +g[Ll>>2]*Kn);g[Nl>>2]=Hn;On=+g[Ol>>2];In=+g[Ql>>2];Nn=+g[Sl>>2];Mn=+g[Ul>>2];Qn=Pn*(On*Kn+(On*Hn+ +g[Pl>>2]*Rn))-In*(+g[Rl>>2]*Nn+ +g[Tl>>2]*Mn);g[Vl>>2]=Qn;Rn=+g[Wl>>2];Hn=+g[Yl>>2];On=+g[_l>>2];Kn=+g[am>>2];Pn=In*(Rn*Mn+(Rn*Qn+ +g[Xl>>2]*Nn))-Hn*(+g[Zl>>2]*On+ +g[$l>>2]*Kn);g[bm>>2]=Pn;Nn=+g[cm>>2];Qn=Hn*(Nn*Kn+(Nn*Pn+ +g[dm>>2]*On));On=+g[em>>2];Pn=+g[gm>>2];Nn=+g[im>>2];Kn=Qn-On*(+g[fm>>2]*Pn+ +g[hm>>2]*Nn);g[jm>>2]=Kn;Hn=+g[km>>2];Rn=+g[mm>>2];Mn=+g[om>>2];In=+g[qm>>2];Jn=On*(Hn*Nn+(Hn*Kn+ +g[lm>>2]*Pn))-Rn*(+g[nm>>2]*Mn+ +g[pm>>2]*In);g[rm>>2]=Jn;Pn=+g[sm>>2];Kn=+g[um>>2];Hn=+g[wm>>2];Nn=+g[ym>>2];On=Rn*(Pn*In+(Pn*Jn+ +g[tm>>2]*Mn))-Kn*(+g[vm>>2]*Hn+ +g[xm>>2]*Nn);g[zm>>2]=On;Mn=+g[Bm>>2];Jn=j*+g[Am>>2]+k*+T(+(Kn*(Mn*Nn+(Mn*On+ +g[Cm>>2]*Hn))));g[Dm>>2]=Jn;g[Em>>2]=f+ +Vb(+Jn)*20.0;Jn=+g[Fm>>2];Hn=+g[Hm>>2];On=+g[Jm>>2];Mn=Qn-Jn*(+g[Gm>>2]*Hn+ +g[Im>>2]*On);g[Km>>2]=Mn;Qn=+g[Lm>>2];Nn=+g[Nm>>2];Kn=+g[Pm>>2];Pn=+g[Rm>>2];In=Jn*(Qn*On+(Qn*Mn+ +g[Mm>>2]*Hn))-Nn*(+g[Om>>2]*Kn+ +g[Qm>>2]*Pn);g[Sm>>2]=In;Hn=+g[Tm>>2];Mn=+g[Vm>>2];Qn=+g[Xm>>2];On=+g[Zm>>2];Jn=Nn*(Hn*Pn+(Hn*In+ +g[Um>>2]*Kn))-Mn*(+g[Wm>>2]*Qn+ +g[Ym>>2]*On);g[_m>>2]=Jn;Kn=+g[an>>2];In=j*+g[$m>>2]+k*+T(+(Mn*(Kn*On+(Kn*Jn+ +g[bn>>2]*Qn))));g[cn>>2]=In;g[dn>>2]=f+ +Vb(+In)*20.0;g[p+(Gn<<2)>>2]=Ln;g[q+(Gn<<2)>>2]=Ln;g[$m>>2]=+g[cn>>2];g[Zm>>2]=+g[Xm>>2];g[Xm>>2]=+g[_m>>2];g[Rm>>2]=+g[Pm>>2];g[Pm>>2]=+g[Sm>>2];g[Jm>>2]=+g[Hm>>2];g[Hm>>2]=+g[Km>>2];g[Am>>2]=+g[Dm>>2];g[ym>>2]=+g[wm>>2];g[wm>>2]=+g[zm>>2];g[qm>>2]=+g[om>>2];g[om>>2]=+g[rm>>2];g[im>>2]=+g[gm>>2];g[gm>>2]=+g[jm>>2];g[am>>2]=+g[_l>>2];g[_l>>2]=+g[bm>>2];g[Ul>>2]=+g[Sl>>2];g[Sl>>2]=+g[Vl>>2];g[Ml>>2]=+g[Kl>>2];g[Kl>>2]=+g[Nl>>2];g[Dl>>2]=+g[Gl>>2];g[Bl>>2]=+g[zl>>2];g[zl>>2]=+g[Cl>>2];g[tl>>2]=+g[rl>>2];g[rl>>2]=+g[ul>>2];g[ll>>2]=+g[jl>>2];g[jl>>2]=+g[ml>>2];g[dl>>2]=+g[bl>>2];g[bl>>2]=+g[el>>2];g[Xk>>2]=+g[Vk>>2];g[Vk>>2]=+g[Yk>>2];g[Pk>>2]=+g[Nk>>2];g[Nk>>2]=+g[Qk>>2];g[Gk>>2]=+g[Jk>>2];g[Ek>>2]=+g[Ck>>2];g[Ck>>2]=+g[Fk>>2];g[wk>>2]=+g[uk>>2];g[uk>>2]=+g[xk>>2];g[ok>>2]=+g[mk>>2];g[mk>>2]=+g[pk>>2];g[gk>>2]=+g[ek>>2];g[ek>>2]=+g[hk>>2];g[_j>>2]=+g[Yj>>2];g[Yj>>2]=+g[$j>>2];g[Sj>>2]=+g[Qj>>2];g[Qj>>2]=+g[Tj>>2];g[Jj>>2]=+g[Mj>>2];g[Hj>>2]=+g[Fj>>2];g[Fj>>2]=+g[Ij>>2];g[zj>>2]=+g[xj>>2];g[xj>>2]=+g[Aj>>2];g[rj>>2]=+g[pj>>2];g[pj>>2]=+g[sj>>2];g[jj>>2]=+g[hj>>2];g[hj>>2]=+g[kj>>2];g[bj>>2]=+g[$i>>2];g[$i>>2]=+g[cj>>2];g[Vi>>2]=+g[Ti>>2];g[Ti>>2]=+g[Wi>>2];g[Mi>>2]=+g[Pi>>2];g[Ki>>2]=+g[Ii>>2];g[Ii>>2]=+g[Li>>2];g[Ci>>2]=+g[Ai>>2];g[Ai>>2]=+g[Di>>2];g[ui>>2]=+g[si>>2];g[si>>2]=+g[vi>>2];g[mi>>2]=+g[ki>>2];g[ki>>2]=+g[ni>>2];g[ei>>2]=+g[ci>>2];g[ci>>2]=+g[fi>>2];g[Yh>>2]=+g[Wh>>2];g[Wh>>2]=+g[Zh>>2];g[Ph>>2]=+g[Sh>>2];g[Nh>>2]=+g[Lh>>2];g[Lh>>2]=+g[Oh>>2];g[Fh>>2]=+g[Dh>>2];g[Dh>>2]=+g[Gh>>2];g[xh>>2]=+g[vh>>2];g[vh>>2]=+g[yh>>2];g[ph>>2]=+g[nh>>2];g[nh>>2]=+g[qh>>2];g[hh>>2]=+g[fh>>2];g[fh>>2]=+g[ih>>2];g[$g>>2]=+g[Zg>>2];g[Zg>>2]=+g[ah>>2];g[Sg>>2]=+g[Vg>>2];g[Qg>>2]=+g[Og>>2];g[Og>>2]=+g[Rg>>2];g[Ig>>2]=+g[Gg>>2];g[Gg>>2]=+g[Jg>>2];g[Ag>>2]=+g[yg>>2];g[yg>>2]=+g[Bg>>2];g[sg>>2]=+g[qg>>2];g[qg>>2]=+g[tg>>2];g[kg>>2]=+g[ig>>2];g[ig>>2]=+g[lg>>2];g[cg>>2]=+g[ag>>2];g[ag>>2]=+g[dg>>2];g[Vf>>2]=+g[Yf>>2];g[Tf>>2]=+g[Rf>>2];g[Rf>>2]=+g[Uf>>2];g[Lf>>2]=+g[Jf>>2];g[Jf>>2]=+g[Mf>>2];g[Df>>2]=+g[Bf>>2];g[Bf>>2]=+g[Ef>>2];g[vf>>2]=+g[tf>>2];g[tf>>2]=+g[wf>>2];g[nf>>2]=+g[lf>>2];g[lf>>2]=+g[of>>2];g[ef>>2]=+g[cf>>2];g[cf>>2]=+g[ff>>2];g[Xe>>2]=+g[_e>>2];g[Ve>>2]=+g[Te>>2];g[Te>>2]=+g[We>>2];g[Ne>>2]=+g[Le>>2];g[Le>>2]=+g[Oe>>2];g[Fe>>2]=+g[De>>2];g[De>>2]=+g[Ge>>2];g[xe>>2]=+g[ve>>2];g[ve>>2]=+g[ye>>2];g[pe>>2]=+g[ne>>2];g[ne>>2]=+g[qe>>2];g[he>>2]=+g[fe>>2];g[fe>>2]=+g[ie>>2];g[_d>>2]=+g[be>>2];g[Yd>>2]=+g[Wd>>2];g[Wd>>2]=+g[Zd>>2];g[Qd>>2]=+g[Od>>2];g[Od>>2]=+g[Rd>>2];g[Id>>2]=+g[Gd>>2];g[Gd>>2]=+g[Jd>>2];g[Ad>>2]=+g[yd>>2];g[yd>>2]=+g[Bd>>2];g[sd>>2]=+g[qd>>2];g[qd>>2]=+g[td>>2];g[kd>>2]=+g[id>>2];g[id>>2]=+g[ld>>2];g[bd>>2]=+g[ed>>2];g[$c>>2]=+g[Zc>>2];g[Zc>>2]=+g[ad>>2];g[Tc>>2]=+g[Rc>>2];g[Rc>>2]=+g[Uc>>2];g[Lc>>2]=+g[Jc>>2];g[Jc>>2]=+g[Mc>>2];g[Dc>>2]=+g[Bc>>2];g[Bc>>2]=+g[Ec>>2];g[vc>>2]=+g[tc>>2];g[tc>>2]=+g[wc>>2];g[nc>>2]=+g[lc>>2];g[lc>>2]=+g[oc>>2];g[ec>>2]=+g[hc>>2];g[cc>>2]=+g[ac>>2];g[ac>>2]=+g[dc>>2];g[Wb>>2]=+g[Tb>>2];g[Tb>>2]=+g[Xb>>2];g[Nb>>2]=+g[Lb>>2];g[Lb>>2]=+g[Ob>>2];g[Fb>>2]=+g[Db>>2];g[Db>>2]=+g[Gb>>2];g[xb>>2]=+g[vb>>2];g[vb>>2]=+g[yb>>2];g[pb>>2]=+g[nb>>2];g[nb>>2]=+g[qb>>2];g[gb>>2]=+g[jb>>2];g[eb>>2]=+g[cb>>2];g[cb>>2]=+g[fb>>2];g[Ya>>2]=+g[Wa>>2];g[Wa>>2]=+g[Za>>2];g[Qa>>2]=+g[Na>>2];g[Na>>2]=+g[Ra>>2];g[Ha>>2]=+g[Fa>>2];g[Fa>>2]=+g[Ia>>2];g[xa>>2]=+g[za>>2];g[za>>2]=+g[Aa>>2];g[ra>>2]=+g[pa>>2];g[pa>>2]=+g[sa>>2];g[ia>>2]=+g[la>>2];g[ga>>2]=+g[ea>>2];Fn=+g[ha>>2];g[ea>>2]=Fn;En=+g[U>>2];g[Z>>2]=En;Dn=+g[_>>2];g[U>>2]=Dn;Cn=+g[L>>2];g[N>>2]=Cn;Bn=+g[O>>2];g[L>>2]=Bn;zn=+g[I>>2];g[G>>2]=zn;An=+g[F>>2];g[H>>2]=An;yn=+g[E>>2];g[D>>2]=yn;xn=+g[C>>2];g[B>>2]=xn;vn=+g[A>>2];g[w>>2]=vn;wn=+g[y>>2];g[x>>2]=wn;un=+g[u>>2];g[t>>2]=un;tn=+g[s>>2];g[r>>2]=tn;a=c[e>>2]|0;c[z>>2]=a;Gn=Gn+1|0}while((Gn|0)!=(b|0));i=d;return}else{tn=en;en=fn;fn=gn;gn=hn;Gn=jn;hn=kn;kn=ln;ln=mn;mn=nn;nn=on;on=pn;pn=qn;qn=rn;rn=sn;jn=0;do{c[e>>2]=1;sn=l+tn*.9990000128746033;g[s>>2]=sn;un=h+m*en;g[u>>2]=un;wn=+g[v>>2]*un;un=+X(+wn);vn=+W(+wn);wn=un*fn+vn*gn;g[y>>2]=wn;g[A>>2]=vn*fn+(0.0-un)*gn+1.0- +(Gn|0);un=sn*wn;wn=n+hn*.9990000128746033;g[C>>2]=wn;sn=o+kn*.9990000128746033;g[E>>2]=sn;vn=+V(10.0,+(wn*2.0))*0.0+sn;sn=vn<1.0?vn:1.0;vn=sn>-1.0?sn:-1.0;sn=vn*(1.0-vn*vn*.3333333432674408);g[F>>2]=sn;g[I>>2]=ln*.9950000047683716+sn-mn;sn=+g[J>>2];vn=un-sn*(+g[K>>2]*nn+ +g[M>>2]*on);g[O>>2]=vn;wn=+g[P>>2];xn=+g[R>>2];yn=sn*(wn*on+(+g[Q>>2]*nn+wn*vn))-xn*(+g[S>>2]*pn+ +g[Y>>2]*qn);g[_>>2]=yn;vn=+g[$>>2];wn=+g[ca>>2];sn=+g[ga>>2];An=xn*(vn*yn+ +g[aa>>2]*pn+vn*qn)-wn*(+g[da>>2]*rn+ +g[fa>>2]*sn);g[ha>>2]=An;vn=+g[ja>>2];yn=j*+g[ia>>2]+k*+T(+(wn*(vn*sn+(vn*An+ +g[ka>>2]*+g[ea>>2]))));g[la>>2]=yn;g[ma>>2]=f+ +Vb(+yn)*20.0;yn=+g[na>>2];An=+g[pa>>2];vn=+g[ra>>2];sn=un-yn*(+g[oa>>2]*An+ +g[qa>>2]*vn);g[sa>>2]=sn;wn=+g[ta>>2];xn=+g[va>>2];zn=+g[xa>>2];Bn=+g[za>>2];Cn=yn*(wn*sn+ +g[ua>>2]*An+wn*vn)-xn*(+g[wa>>2]*zn+ +g[ya>>2]*Bn);g[Aa>>2]=Cn;vn=+g[Ba>>2];wn=+g[Da>>2];An=+g[Fa>>2];sn=+g[Ha>>2];yn=xn*(vn*Cn+ +g[Ca>>2]*Bn+vn*zn)-wn*(+g[Ea>>2]*An+ +g[Ga>>2]*sn);g[Ia>>2]=yn;zn=+g[Ja>>2];vn=wn*(zn*yn+ +g[Ka>>2]*An+zn*sn);sn=+g[La>>2];zn=+g[Na>>2];An=+g[Qa>>2];yn=vn-sn*(+g[Ma>>2]*zn+ +g[Oa>>2]*An);g[Ra>>2]=yn;wn=+g[Sa>>2];Bn=+g[Ua>>2];Cn=+g[Wa>>2];xn=+g[Ya>>2];Dn=sn*(wn*yn+ +g[Ta>>2]*zn+wn*An)-Bn*(+g[Va>>2]*Cn+ +g[Xa>>2]*xn);g[Za>>2]=Dn;An=+g[_a>>2];wn=+g[ab>>2];zn=+g[cb>>2];yn=+g[eb>>2];sn=Bn*(An*xn+(An*Dn+ +g[$a>>2]*Cn))-wn*(+g[bb>>2]*zn+ +g[db>>2]*yn);g[fb>>2]=sn;Cn=+g[hb>>2];Dn=j*+g[gb>>2]+k*+T(+(wn*(Cn*yn+(Cn*sn+ +g[ib>>2]*zn))));g[jb>>2]=Dn;g[kb>>2]=f+ +Vb(+Dn)*20.0;Dn=+g[lb>>2];zn=+g[nb>>2];sn=+g[pb>>2];Cn=vn-Dn*(+g[mb>>2]*zn+ +g[ob>>2]*sn);g[qb>>2]=Cn;vn=+g[rb>>2];yn=+g[tb>>2];wn=+g[vb>>2];An=+g[xb>>2];xn=Dn*(vn*sn+(vn*Cn+ +g[sb>>2]*zn))-yn*(+g[ub>>2]*wn+ +g[wb>>2]*An);g[yb>>2]=xn;zn=+g[zb>>2];Cn=+g[Bb>>2];vn=+g[Db>>2];sn=+g[Fb>>2];Dn=yn*(zn*xn+ +g[Ab>>2]*wn+zn*An)-Cn*(+g[Cb>>2]*vn+ +g[Eb>>2]*sn);g[Gb>>2]=Dn;An=+g[Hb>>2];zn=Cn*(An*Dn+ +g[Ib>>2]*vn+An*sn);sn=+g[Jb>>2];An=+g[Lb>>2];vn=+g[Nb>>2];Dn=zn-sn*(+g[Kb>>2]*An+ +g[Mb>>2]*vn);g[Ob>>2]=Dn;Cn=+g[Pb>>2];wn=+g[Rb>>2];xn=+g[Tb>>2];yn=+g[Wb>>2];Bn=sn*(Cn*vn+(Cn*Dn+ +g[Qb>>2]*An))-wn*(+g[Sb>>2]*xn+ +g[Ub>>2]*yn);g[Xb>>2]=Bn;An=+g[Yb>>2];Dn=+g[_b>>2];Cn=+g[ac>>2];vn=+g[cc>>2];sn=wn*(An*yn+(An*Bn+ +g[Zb>>2]*xn))-Dn*(+g[$b>>2]*Cn+ +g[bc>>2]*vn);g[dc>>2]=sn;xn=+g[fc>>2];Bn=j*+g[ec>>2]+k*+T(+(Dn*(xn*vn+(xn*sn+ +g[gc>>2]*Cn))));g[hc>>2]=Bn;g[ic>>2]=f+ +Vb(+Bn)*20.0;Bn=+g[jc>>2];Cn=+g[lc>>2];sn=+g[nc>>2];xn=zn-Bn*(+g[kc>>2]*Cn+ +g[mc>>2]*sn);g[oc>>2]=xn;zn=+g[pc>>2];vn=+g[rc>>2];Dn=+g[tc>>2];An=+g[vc>>2];yn=Bn*(zn*sn+(zn*xn+ +g[qc>>2]*Cn))-vn*(+g[sc>>2]*Dn+ +g[uc>>2]*An);g[wc>>2]=yn;Cn=+g[xc>>2];xn=+g[zc>>2];zn=+g[Bc>>2];sn=+g[Dc>>2];Bn=vn*(Cn*yn+ +g[yc>>2]*Dn+Cn*An)-xn*(+g[Ac>>2]*zn+ +g[Cc>>2]*sn);g[Ec>>2]=Bn;An=+g[Fc>>2];Cn=xn*(An*sn+(An*Bn+ +g[Gc>>2]*zn));zn=+g[Hc>>2];Bn=+g[Jc>>2];An=+g[Lc>>2];sn=Cn-zn*(+g[Ic>>2]*Bn+ +g[Kc>>2]*An);g[Mc>>2]=sn;xn=+g[Nc>>2];Dn=+g[Pc>>2];yn=+g[Rc>>2];vn=+g[Tc>>2];wn=zn*(xn*An+(xn*sn+ +g[Oc>>2]*Bn))-Dn*(+g[Qc>>2]*yn+ +g[Sc>>2]*vn);g[Uc>>2]=wn;Bn=+g[Vc>>2];sn=+g[Xc>>2];xn=+g[Zc>>2];An=+g[$c>>2];zn=Dn*(Bn*vn+(Bn*wn+ +g[Wc>>2]*yn))-sn*(+g[Yc>>2]*xn+ +g[_c>>2]*An);g[ad>>2]=zn;yn=+g[cd>>2];wn=j*+g[bd>>2]+k*+T(+(sn*(yn*An+(yn*zn+ +g[dd>>2]*xn))));g[ed>>2]=wn;g[fd>>2]=f+ +Vb(+wn)*20.0;wn=+g[gd>>2];xn=+g[id>>2];zn=+g[kd>>2];yn=Cn-wn*(+g[hd>>2]*xn+ +g[jd>>2]*zn);g[ld>>2]=yn;Cn=+g[md>>2];An=+g[od>>2];sn=+g[qd>>2];Bn=+g[sd>>2];vn=wn*(Cn*zn+(Cn*yn+ +g[nd>>2]*xn))-An*(+g[pd>>2]*sn+ +g[rd>>2]*Bn);g[td>>2]=vn;xn=+g[ud>>2];yn=+g[wd>>2];Cn=+g[yd>>2];zn=+g[Ad>>2];wn=An*(xn*Bn+(xn*vn+ +g[vd>>2]*sn))-yn*(+g[xd>>2]*Cn+ +g[zd>>2]*zn);g[Bd>>2]=wn;sn=+g[Cd>>2];vn=yn*(sn*zn+(sn*wn+ +g[Dd>>2]*Cn));Cn=+g[Ed>>2];wn=+g[Gd>>2];sn=+g[Id>>2];zn=vn-Cn*(+g[Fd>>2]*wn+ +g[Hd>>2]*sn);g[Jd>>2]=zn;yn=+g[Kd>>2];xn=+g[Md>>2];Bn=+g[Od>>2];An=+g[Qd>>2];Dn=Cn*(yn*sn+(yn*zn+ +g[Ld>>2]*wn))-xn*(+g[Nd>>2]*Bn+ +g[Pd>>2]*An);g[Rd>>2]=Dn;wn=+g[Sd>>2];zn=+g[Ud>>2];yn=+g[Wd>>2];sn=+g[Yd>>2];Cn=xn*(wn*An+(wn*Dn+ +g[Td>>2]*Bn))-zn*(+g[Vd>>2]*yn+ +g[Xd>>2]*sn);g[Zd>>2]=Cn;Bn=+g[$d>>2];Dn=j*+g[_d>>2]+k*+T(+(zn*(Bn*sn+(Bn*Cn+ +g[ae>>2]*yn))));g[be>>2]=Dn;g[ce>>2]=f+ +Vb(+Dn)*20.0;Dn=+g[de>>2];yn=+g[fe>>2];Cn=+g[he>>2];Bn=vn-Dn*(+g[ee>>2]*yn+ +g[ge>>2]*Cn);g[ie>>2]=Bn;vn=+g[je>>2];sn=+g[le>>2];zn=+g[ne>>2];wn=+g[pe>>2];An=Dn*(vn*Cn+(vn*Bn+ +g[ke>>2]*yn))-sn*(+g[me>>2]*zn+ +g[oe>>2]*wn);g[qe>>2]=An;yn=+g[re>>2];Bn=+g[te>>2];vn=+g[ve>>2];Cn=+g[xe>>2];Dn=sn*(yn*wn+(yn*An+ +g[se>>2]*zn))-Bn*(+g[ue>>2]*vn+ +g[we>>2]*Cn);g[ye>>2]=Dn;zn=+g[ze>>2];An=Bn*(zn*Cn+(zn*Dn+ +g[Ae>>2]*vn));vn=+g[Be>>2];Dn=+g[De>>2];zn=+g[Fe>>2];Cn=An-vn*(+g[Ce>>2]*Dn+ +g[Ee>>2]*zn);g[Ge>>2]=Cn;Bn=+g[He>>2];yn=+g[Je>>2];wn=+g[Le>>2];sn=+g[Ne>>2];xn=vn*(Bn*zn+(Bn*Cn+ +g[Ie>>2]*Dn))-yn*(+g[Ke>>2]*wn+ +g[Me>>2]*sn);g[Oe>>2]=xn;Dn=+g[Pe>>2];Cn=+g[Re>>2];Bn=+g[Te>>2];zn=+g[Ve>>2];vn=yn*(Dn*sn+(Dn*xn+ +g[Qe>>2]*wn))-Cn*(+g[Se>>2]*Bn+ +g[Ue>>2]*zn);g[We>>2]=vn;wn=+g[Ye>>2];xn=j*+g[Xe>>2]+k*+T(+(Cn*(wn*zn+(wn*vn+ +g[Ze>>2]*Bn))));g[_e>>2]=xn;g[$e>>2]=f+ +Vb(+xn)*20.0;xn=+g[af>>2];Bn=+g[cf>>2];vn=+g[ef>>2];wn=An-xn*(+g[bf>>2]*Bn+ +g[df>>2]*vn);g[ff>>2]=wn;An=+g[gf>>2];zn=+g[jf>>2];Cn=+g[lf>>2];Dn=+g[nf>>2];sn=xn*(An*vn+(An*wn+ +g[hf>>2]*Bn))-zn*(+g[kf>>2]*Cn+ +g[mf>>2]*Dn);g[of>>2]=sn;Bn=+g[pf>>2];wn=+g[rf>>2];An=+g[tf>>2];vn=+g[vf>>2];xn=zn*(Bn*Dn+(Bn*sn+ +g[qf>>2]*Cn))-wn*(+g[sf>>2]*An+ +g[uf>>2]*vn);g[wf>>2]=xn;Cn=+g[xf>>2];sn=wn*(Cn*vn+(Cn*xn+ +g[yf>>2]*An));An=+g[zf>>2];xn=+g[Bf>>2];Cn=+g[Df>>2];vn=sn-An*(+g[Af>>2]*xn+ +g[Cf>>2]*Cn);g[Ef>>2]=vn;wn=+g[Ff>>2];Bn=+g[Hf>>2];Dn=+g[Jf>>2];zn=+g[Lf>>2];yn=An*(wn*Cn+(wn*vn+ +g[Gf>>2]*xn))-Bn*(+g[If>>2]*Dn+ +g[Kf>>2]*zn);g[Mf>>2]=yn;xn=+g[Nf>>2];vn=+g[Pf>>2];wn=+g[Rf>>2];Cn=+g[Tf>>2];An=Bn*(xn*zn+(xn*yn+ +g[Of>>2]*Dn))-vn*(+g[Qf>>2]*wn+ +g[Sf>>2]*Cn);g[Uf>>2]=An;Dn=+g[Wf>>2];yn=j*+g[Vf>>2]+k*+T(+(vn*(Dn*Cn+(Dn*An+ +g[Xf>>2]*wn))));g[Yf>>2]=yn;g[Zf>>2]=f+ +Vb(+yn)*20.0;yn=+g[_f>>2];wn=+g[ag>>2];An=+g[cg>>2];Dn=sn-yn*(+g[$f>>2]*wn+ +g[bg>>2]*An);g[dg>>2]=Dn;sn=+g[eg>>2];Cn=+g[gg>>2];vn=+g[ig>>2];xn=+g[kg>>2];zn=yn*(sn*An+(sn*Dn+ +g[fg>>2]*wn))-Cn*(+g[hg>>2]*vn+ +g[jg>>2]*xn);g[lg>>2]=zn;wn=+g[mg>>2];Dn=+g[og>>2];sn=+g[qg>>2];An=+g[sg>>2];yn=Cn*(wn*xn+(wn*zn+ +g[ng>>2]*vn))-Dn*(+g[pg>>2]*sn+ +g[rg>>2]*An);g[tg>>2]=yn;vn=+g[ug>>2];zn=Dn*(vn*An+(vn*yn+ +g[vg>>2]*sn));sn=+g[wg>>2];yn=+g[yg>>2];vn=+g[Ag>>2];An=zn-sn*(+g[xg>>2]*yn+ +g[zg>>2]*vn);g[Bg>>2]=An;Dn=+g[Cg>>2];wn=+g[Eg>>2];xn=+g[Gg>>2];Cn=+g[Ig>>2];Bn=sn*(Dn*vn+(Dn*An+ +g[Dg>>2]*yn))-wn*(+g[Fg>>2]*xn+ +g[Hg>>2]*Cn);g[Jg>>2]=Bn;yn=+g[Kg>>2];An=+g[Mg>>2];Dn=+g[Og>>2];vn=+g[Qg>>2];sn=wn*(yn*Cn+(yn*Bn+ +g[Lg>>2]*xn))-An*(+g[Ng>>2]*Dn+ +g[Pg>>2]*vn);g[Rg>>2]=sn;xn=+g[Tg>>2];Bn=j*+g[Sg>>2]+k*+T(+(An*(xn*vn+(xn*sn+ +g[Ug>>2]*Dn))));g[Vg>>2]=Bn;g[Wg>>2]=f+ +Vb(+Bn)*20.0;Bn=+g[Xg>>2];Dn=+g[Zg>>2];sn=+g[$g>>2];xn=zn-Bn*(+g[Yg>>2]*Dn+ +g[_g>>2]*sn);g[ah>>2]=xn;zn=+g[bh>>2];vn=+g[dh>>2];An=+g[fh>>2];yn=+g[hh>>2];Cn=Bn*(zn*sn+(zn*xn+ +g[ch>>2]*Dn))-vn*(+g[eh>>2]*An+ +g[gh>>2]*yn);g[ih>>2]=Cn;Dn=+g[jh>>2];xn=+g[lh>>2];zn=+g[nh>>2];sn=+g[ph>>2];Bn=vn*(Dn*yn+(Dn*Cn+ +g[kh>>2]*An))-xn*(+g[mh>>2]*zn+ +g[oh>>2]*sn);g[qh>>2]=Bn;An=+g[rh>>2];Cn=xn*(An*sn+(An*Bn+ +g[sh>>2]*zn));zn=+g[th>>2];Bn=+g[vh>>2];An=+g[xh>>2];sn=Cn-zn*(+g[uh>>2]*Bn+ +g[wh>>2]*An);g[yh>>2]=sn;xn=+g[zh>>2];Dn=+g[Bh>>2];yn=+g[Dh>>2];vn=+g[Fh>>2];wn=zn*(xn*An+(xn*sn+ +g[Ah>>2]*Bn))-Dn*(+g[Ch>>2]*yn+ +g[Eh>>2]*vn);g[Gh>>2]=wn;Bn=+g[Hh>>2];sn=+g[Jh>>2];xn=+g[Lh>>2];An=+g[Nh>>2];zn=Dn*(Bn*vn+(Bn*wn+ +g[Ih>>2]*yn))-sn*(+g[Kh>>2]*xn+ +g[Mh>>2]*An);g[Oh>>2]=zn;yn=+g[Qh>>2];wn=j*+g[Ph>>2]+k*+T(+(sn*(yn*An+(yn*zn+ +g[Rh>>2]*xn))));g[Sh>>2]=wn;g[Th>>2]=f+ +Vb(+wn)*20.0;wn=+g[Uh>>2];xn=+g[Wh>>2];zn=+g[Yh>>2];yn=Cn-wn*(+g[Vh>>2]*xn+ +g[Xh>>2]*zn);g[Zh>>2]=yn;Cn=+g[_h>>2];An=+g[ai>>2];sn=+g[ci>>2];Bn=+g[ei>>2];vn=wn*(Cn*zn+(Cn*yn+ +g[$h>>2]*xn))-An*(+g[bi>>2]*sn+ +g[di>>2]*Bn);g[fi>>2]=vn;xn=+g[gi>>2];yn=+g[ii>>2];Cn=+g[ki>>2];zn=+g[mi>>2];wn=An*(xn*Bn+(xn*vn+ +g[hi>>2]*sn))-yn*(+g[ji>>2]*Cn+ +g[li>>2]*zn);g[ni>>2]=wn;sn=+g[oi>>2];vn=yn*(sn*zn+(sn*wn+ +g[pi>>2]*Cn));Cn=+g[qi>>2];wn=+g[si>>2];sn=+g[ui>>2];zn=vn-Cn*(+g[ri>>2]*wn+ +g[ti>>2]*sn);g[vi>>2]=zn;yn=+g[wi>>2];xn=+g[yi>>2];Bn=+g[Ai>>2];An=+g[Ci>>2];Dn=Cn*(yn*sn+(yn*zn+ +g[xi>>2]*wn))-xn*(+g[zi>>2]*Bn+ +g[Bi>>2]*An);g[Di>>2]=Dn;wn=+g[Ei>>2];zn=+g[Gi>>2];yn=+g[Ii>>2];sn=+g[Ki>>2];Cn=xn*(wn*An+(wn*Dn+ +g[Fi>>2]*Bn))-zn*(+g[Hi>>2]*yn+ +g[Ji>>2]*sn);g[Li>>2]=Cn;Bn=+g[Ni>>2];Dn=j*+g[Mi>>2]+k*+T(+(zn*(Bn*sn+(Bn*Cn+ +g[Oi>>2]*yn))));g[Pi>>2]=Dn;g[Qi>>2]=f+ +Vb(+Dn)*20.0;Dn=+g[Ri>>2];yn=+g[Ti>>2];Cn=+g[Vi>>2];Bn=vn-Dn*(+g[Si>>2]*yn+ +g[Ui>>2]*Cn);g[Wi>>2]=Bn;vn=+g[Xi>>2];sn=+g[Zi>>2];zn=+g[$i>>2];wn=+g[bj>>2];An=Dn*(vn*Cn+(vn*Bn+ +g[Yi>>2]*yn))-sn*(+g[_i>>2]*zn+ +g[aj>>2]*wn);g[cj>>2]=An;yn=+g[dj>>2];Bn=+g[fj>>2];vn=+g[hj>>2];Cn=+g[jj>>2];Dn=sn*(yn*wn+(yn*An+ +g[ej>>2]*zn))-Bn*(+g[gj>>2]*vn+ +g[ij>>2]*Cn);g[kj>>2]=Dn;zn=+g[lj>>2];An=Bn*(zn*Cn+(zn*Dn+ +g[mj>>2]*vn));vn=+g[nj>>2];Dn=+g[pj>>2];zn=+g[rj>>2];Cn=An-vn*(+g[oj>>2]*Dn+ +g[qj>>2]*zn);g[sj>>2]=Cn;Bn=+g[tj>>2];yn=+g[vj>>2];wn=+g[xj>>2];sn=+g[zj>>2];xn=vn*(Bn*zn+(Bn*Cn+ +g[uj>>2]*Dn))-yn*(+g[wj>>2]*wn+ +g[yj>>2]*sn);g[Aj>>2]=xn;Dn=+g[Bj>>2];Cn=+g[Dj>>2];Bn=+g[Fj>>2];zn=+g[Hj>>2];vn=yn*(Dn*sn+(Dn*xn+ +g[Cj>>2]*wn))-Cn*(+g[Ej>>2]*Bn+ +g[Gj>>2]*zn);g[Ij>>2]=vn;wn=+g[Kj>>2];xn=j*+g[Jj>>2]+k*+T(+(Cn*(wn*zn+(wn*vn+ +g[Lj>>2]*Bn))));g[Mj>>2]=xn;g[Nj>>2]=f+ +Vb(+xn)*20.0;xn=+g[Oj>>2];Bn=+g[Qj>>2];vn=+g[Sj>>2];wn=An-xn*(+g[Pj>>2]*Bn+ +g[Rj>>2]*vn);g[Tj>>2]=wn;An=+g[Uj>>2];zn=+g[Wj>>2];Cn=+g[Yj>>2];Dn=+g[_j>>2];sn=xn*(An*vn+(An*wn+ +g[Vj>>2]*Bn))-zn*(+g[Xj>>2]*Cn+ +g[Zj>>2]*Dn);g[$j>>2]=sn;Bn=+g[ak>>2];wn=+g[ck>>2];An=+g[ek>>2];vn=+g[gk>>2];xn=zn*(Bn*Dn+(Bn*sn+ +g[bk>>2]*Cn))-wn*(+g[dk>>2]*An+ +g[fk>>2]*vn);g[hk>>2]=xn;Cn=+g[ik>>2];sn=wn*(Cn*vn+(Cn*xn+ +g[jk>>2]*An));An=+g[kk>>2];xn=+g[mk>>2];Cn=+g[ok>>2];vn=sn-An*(+g[lk>>2]*xn+ +g[nk>>2]*Cn);g[pk>>2]=vn;wn=+g[qk>>2];Bn=+g[sk>>2];Dn=+g[uk>>2];zn=+g[wk>>2];yn=An*(wn*Cn+(wn*vn+ +g[rk>>2]*xn))-Bn*(+g[tk>>2]*Dn+ +g[vk>>2]*zn);g[xk>>2]=yn;xn=+g[yk>>2];vn=+g[Ak>>2];wn=+g[Ck>>2];Cn=+g[Ek>>2];An=Bn*(xn*zn+(xn*yn+ +g[zk>>2]*Dn))-vn*(+g[Bk>>2]*wn+ +g[Dk>>2]*Cn);g[Fk>>2]=An;Dn=+g[Hk>>2];yn=j*+g[Gk>>2]+k*+T(+(vn*(Dn*Cn+(Dn*An+ +g[Ik>>2]*wn))));g[Jk>>2]=yn;g[Kk>>2]=f+ +Vb(+yn)*20.0;yn=+g[Lk>>2];wn=+g[Nk>>2];An=+g[Pk>>2];Dn=sn-yn*(+g[Mk>>2]*wn+ +g[Ok>>2]*An);g[Qk>>2]=Dn;sn=+g[Rk>>2];Cn=+g[Tk>>2];vn=+g[Vk>>2];xn=+g[Xk>>2];zn=yn*(sn*An+(sn*Dn+ +g[Sk>>2]*wn))-Cn*(+g[Uk>>2]*vn+ +g[Wk>>2]*xn);g[Yk>>2]=zn;wn=+g[Zk>>2];Dn=+g[$k>>2];sn=+g[bl>>2];An=+g[dl>>2];yn=Cn*(wn*xn+(wn*zn+ +g[_k>>2]*vn))-Dn*(+g[al>>2]*sn+ +g[cl>>2]*An);g[el>>2]=yn;vn=+g[fl>>2];zn=Dn*(vn*An+(vn*yn+ +g[gl>>2]*sn));sn=+g[hl>>2];yn=+g[jl>>2];vn=+g[ll>>2];An=zn-sn*(+g[il>>2]*yn+ +g[kl>>2]*vn);g[ml>>2]=An;Dn=+g[nl>>2];wn=+g[pl>>2];xn=+g[rl>>2];Cn=+g[tl>>2];Bn=sn*(Dn*vn+(Dn*An+ +g[ol>>2]*yn))-wn*(+g[ql>>2]*xn+ +g[sl>>2]*Cn);g[ul>>2]=Bn;yn=+g[vl>>2];An=+g[xl>>2];Dn=+g[zl>>2];vn=+g[Bl>>2];sn=wn*(yn*Cn+(yn*Bn+ +g[wl>>2]*xn))-An*(+g[yl>>2]*Dn+ +g[Al>>2]*vn);g[Cl>>2]=sn;xn=+g[El>>2];Bn=j*+g[Dl>>2]+k*+T(+(An*(xn*vn+(xn*sn+ +g[Fl>>2]*Dn))));g[Gl>>2]=Bn;g[Hl>>2]=f+ +Vb(+Bn)*20.0;Bn=+g[Il>>2];Dn=+g[Kl>>2];sn=+g[Ml>>2];xn=zn-Bn*(+g[Jl>>2]*Dn+ +g[Ll>>2]*sn);g[Nl>>2]=xn;zn=+g[Ol>>2];vn=+g[Ql>>2];An=+g[Sl>>2];yn=+g[Ul>>2];Cn=Bn*(zn*sn+(zn*xn+ +g[Pl>>2]*Dn))-vn*(+g[Rl>>2]*An+ +g[Tl>>2]*yn);g[Vl>>2]=Cn;Dn=+g[Wl>>2];xn=+g[Yl>>2];zn=+g[_l>>2];sn=+g[am>>2];Bn=vn*(Dn*yn+(Dn*Cn+ +g[Xl>>2]*An))-xn*(+g[Zl>>2]*zn+ +g[$l>>2]*sn);g[bm>>2]=Bn;An=+g[cm>>2];Cn=xn*(An*sn+(An*Bn+ +g[dm>>2]*zn));zn=+g[em>>2];Bn=+g[gm>>2];An=+g[im>>2];sn=Cn-zn*(+g[fm>>2]*Bn+ +g[hm>>2]*An);g[jm>>2]=sn;xn=+g[km>>2];Dn=+g[mm>>2];yn=+g[om>>2];vn=+g[qm>>2];wn=zn*(xn*An+(xn*sn+ +g[lm>>2]*Bn))-Dn*(+g[nm>>2]*yn+ +g[pm>>2]*vn);g[rm>>2]=wn;Bn=+g[sm>>2];sn=+g[um>>2];xn=+g[wm>>2];An=+g[ym>>2];zn=Dn*(Bn*vn+(Bn*wn+ +g[tm>>2]*yn))-sn*(+g[vm>>2]*xn+ +g[xm>>2]*An);g[zm>>2]=zn;yn=+g[Bm>>2];wn=j*+g[Am>>2]+k*+T(+(sn*(yn*An+(yn*zn+ +g[Cm>>2]*xn))));g[Dm>>2]=wn;g[Em>>2]=f+ +Vb(+wn)*20.0;wn=+g[Fm>>2];xn=+g[Hm>>2];zn=+g[Jm>>2];yn=Cn-wn*(+g[Gm>>2]*xn+ +g[Im>>2]*zn);g[Km>>2]=yn;Cn=+g[Lm>>2];An=+g[Nm>>2];sn=+g[Pm>>2];Bn=+g[Rm>>2];vn=wn*(Cn*zn+(Cn*yn+ +g[Mm>>2]*xn))-An*(+g[Om>>2]*sn+ +g[Qm>>2]*Bn);g[Sm>>2]=vn;xn=+g[Tm>>2];yn=+g[Vm>>2];Cn=+g[Xm>>2];zn=+g[Zm>>2];wn=An*(xn*Bn+(xn*vn+ +g[Um>>2]*sn))-yn*(+g[Wm>>2]*Cn+ +g[Ym>>2]*zn);g[_m>>2]=wn;sn=+g[an>>2];vn=j*+g[$m>>2]+k*+T(+(yn*(sn*zn+(sn*wn+ +g[bn>>2]*Cn))));g[cn>>2]=vn;g[dn>>2]=f+ +Vb(+vn)*20.0;g[p+(jn<<2)>>2]=un;g[q+(jn<<2)>>2]=un;g[$m>>2]=+g[cn>>2];g[Zm>>2]=+g[Xm>>2];g[Xm>>2]=+g[_m>>2];g[Rm>>2]=+g[Pm>>2];g[Pm>>2]=+g[Sm>>2];g[Jm>>2]=+g[Hm>>2];g[Hm>>2]=+g[Km>>2];g[Am>>2]=+g[Dm>>2];g[ym>>2]=+g[wm>>2];g[wm>>2]=+g[zm>>2];g[qm>>2]=+g[om>>2];g[om>>2]=+g[rm>>2];g[im>>2]=+g[gm>>2];g[gm>>2]=+g[jm>>2];g[am>>2]=+g[_l>>2];g[_l>>2]=+g[bm>>2];g[Ul>>2]=+g[Sl>>2];g[Sl>>2]=+g[Vl>>2];g[Ml>>2]=+g[Kl>>2];g[Kl>>2]=+g[Nl>>2];g[Dl>>2]=+g[Gl>>2];g[Bl>>2]=+g[zl>>2];g[zl>>2]=+g[Cl>>2];g[tl>>2]=+g[rl>>2];g[rl>>2]=+g[ul>>2];g[ll>>2]=+g[jl>>2];g[jl>>2]=+g[ml>>2];g[dl>>2]=+g[bl>>2];g[bl>>2]=+g[el>>2];g[Xk>>2]=+g[Vk>>2];g[Vk>>2]=+g[Yk>>2];g[Pk>>2]=+g[Nk>>2];g[Nk>>2]=+g[Qk>>2];g[Gk>>2]=+g[Jk>>2];g[Ek>>2]=+g[Ck>>2];g[Ck>>2]=+g[Fk>>2];g[wk>>2]=+g[uk>>2];g[uk>>2]=+g[xk>>2];g[ok>>2]=+g[mk>>2];g[mk>>2]=+g[pk>>2];g[gk>>2]=+g[ek>>2];g[ek>>2]=+g[hk>>2];g[_j>>2]=+g[Yj>>2];g[Yj>>2]=+g[$j>>2];g[Sj>>2]=+g[Qj>>2];g[Qj>>2]=+g[Tj>>2];g[Jj>>2]=+g[Mj>>2];g[Hj>>2]=+g[Fj>>2];g[Fj>>2]=+g[Ij>>2];g[zj>>2]=+g[xj>>2];g[xj>>2]=+g[Aj>>2];g[rj>>2]=+g[pj>>2];g[pj>>2]=+g[sj>>2];g[jj>>2]=+g[hj>>2];g[hj>>2]=+g[kj>>2];g[bj>>2]=+g[$i>>2];g[$i>>2]=+g[cj>>2];g[Vi>>2]=+g[Ti>>2];g[Ti>>2]=+g[Wi>>2];g[Mi>>2]=+g[Pi>>2];g[Ki>>2]=+g[Ii>>2];g[Ii>>2]=+g[Li>>2];g[Ci>>2]=+g[Ai>>2];g[Ai>>2]=+g[Di>>2];g[ui>>2]=+g[si>>2];g[si>>2]=+g[vi>>2];g[mi>>2]=+g[ki>>2];g[ki>>2]=+g[ni>>2];g[ei>>2]=+g[ci>>2];g[ci>>2]=+g[fi>>2];g[Yh>>2]=+g[Wh>>2];g[Wh>>2]=+g[Zh>>2];g[Ph>>2]=+g[Sh>>2];g[Nh>>2]=+g[Lh>>2];g[Lh>>2]=+g[Oh>>2];g[Fh>>2]=+g[Dh>>2];g[Dh>>2]=+g[Gh>>2];g[xh>>2]=+g[vh>>2];g[vh>>2]=+g[yh>>2];g[ph>>2]=+g[nh>>2];g[nh>>2]=+g[qh>>2];g[hh>>2]=+g[fh>>2];g[fh>>2]=+g[ih>>2];g[$g>>2]=+g[Zg>>2];g[Zg>>2]=+g[ah>>2];g[Sg>>2]=+g[Vg>>2];g[Qg>>2]=+g[Og>>2];g[Og>>2]=+g[Rg>>2];g[Ig>>2]=+g[Gg>>2];g[Gg>>2]=+g[Jg>>2];g[Ag>>2]=+g[yg>>2];g[yg>>2]=+g[Bg>>2];g[sg>>2]=+g[qg>>2];g[qg>>2]=+g[tg>>2];g[kg>>2]=+g[ig>>2];g[ig>>2]=+g[lg>>2];g[cg>>2]=+g[ag>>2];g[ag>>2]=+g[dg>>2];g[Vf>>2]=+g[Yf>>2];g[Tf>>2]=+g[Rf>>2];g[Rf>>2]=+g[Uf>>2];g[Lf>>2]=+g[Jf>>2];g[Jf>>2]=+g[Mf>>2];g[Df>>2]=+g[Bf>>2];g[Bf>>2]=+g[Ef>>2];g[vf>>2]=+g[tf>>2];g[tf>>2]=+g[wf>>2];g[nf>>2]=+g[lf>>2];g[lf>>2]=+g[of>>2];g[ef>>2]=+g[cf>>2];g[cf>>2]=+g[ff>>2];g[Xe>>2]=+g[_e>>2];g[Ve>>2]=+g[Te>>2];g[Te>>2]=+g[We>>2];g[Ne>>2]=+g[Le>>2];g[Le>>2]=+g[Oe>>2];g[Fe>>2]=+g[De>>2];g[De>>2]=+g[Ge>>2];g[xe>>2]=+g[ve>>2];g[ve>>2]=+g[ye>>2];g[pe>>2]=+g[ne>>2];g[ne>>2]=+g[qe>>2];g[he>>2]=+g[fe>>2];g[fe>>2]=+g[ie>>2];g[_d>>2]=+g[be>>2];g[Yd>>2]=+g[Wd>>2];g[Wd>>2]=+g[Zd>>2];g[Qd>>2]=+g[Od>>2];g[Od>>2]=+g[Rd>>2];g[Id>>2]=+g[Gd>>2];g[Gd>>2]=+g[Jd>>2];g[Ad>>2]=+g[yd>>2];g[yd>>2]=+g[Bd>>2];g[sd>>2]=+g[qd>>2];g[qd>>2]=+g[td>>2];g[kd>>2]=+g[id>>2];g[id>>2]=+g[ld>>2];g[bd>>2]=+g[ed>>2];g[$c>>2]=+g[Zc>>2];g[Zc>>2]=+g[ad>>2];g[Tc>>2]=+g[Rc>>2];g[Rc>>2]=+g[Uc>>2];g[Lc>>2]=+g[Jc>>2];g[Jc>>2]=+g[Mc>>2];g[Dc>>2]=+g[Bc>>2];g[Bc>>2]=+g[Ec>>2];g[vc>>2]=+g[tc>>2];g[tc>>2]=+g[wc>>2];g[nc>>2]=+g[lc>>2];g[lc>>2]=+g[oc>>2];g[ec>>2]=+g[hc>>2];g[cc>>2]=+g[ac>>2];g[ac>>2]=+g[dc>>2];g[Wb>>2]=+g[Tb>>2];g[Tb>>2]=+g[Xb>>2];g[Nb>>2]=+g[Lb>>2];g[Lb>>2]=+g[Ob>>2];g[Fb>>2]=+g[Db>>2];g[Db>>2]=+g[Gb>>2];g[xb>>2]=+g[vb>>2];g[vb>>2]=+g[yb>>2];g[pb>>2]=+g[nb>>2];g[nb>>2]=+g[qb>>2];g[gb>>2]=+g[jb>>2];g[eb>>2]=+g[cb>>2];g[cb>>2]=+g[fb>>2];g[Ya>>2]=+g[Wa>>2];g[Wa>>2]=+g[Za>>2];g[Qa>>2]=+g[Na>>2];g[Na>>2]=+g[Ra>>2];g[Ha>>2]=+g[Fa>>2];g[Fa>>2]=+g[Ia>>2];g[xa>>2]=+g[za>>2];g[za>>2]=+g[Aa>>2];g[ra>>2]=+g[pa>>2];g[pa>>2]=+g[sa>>2];g[ia>>2]=+g[la>>2];g[ga>>2]=+g[ea>>2];rn=+g[ha>>2];g[ea>>2]=rn;qn=+g[U>>2];g[Z>>2]=qn;pn=+g[_>>2];g[U>>2]=pn;on=+g[L>>2];g[N>>2]=on;nn=+g[O>>2];g[L>>2]=nn;ln=+g[I>>2];g[G>>2]=ln;mn=+g[F>>2];g[H>>2]=mn;kn=+g[E>>2];g[D>>2]=kn;hn=+g[C>>2];g[B>>2]=hn;fn=+g[A>>2];g[w>>2]=fn;gn=+g[y>>2];g[x>>2]=gn;en=+g[u>>2];g[t>>2]=en;tn=+g[s>>2];g[r>>2]=tn;Gn=c[e>>2]|0;c[z>>2]=Gn;jn=jn+1|0}while((jn|0)!=(b|0));i=d;return}}function zd(a,b){a=a|0;b=b|0;var d=0,e=0,f=0.0,h=0.0,j=0.0,k=0,l=0.0,m=0,n=0.0,o=0,p=0.0,q=0,r=0,s=0,t=0,u=0,v=0;d=i;c[a+4>>2]=b;g[a+8>>2]=50.0;e=a+12|0;c[e>>2]=0;c[e+4>>2]=0;e=(b|0)>1?b:1;b=(e|0)<192e3?e:192e3;e=a+20|0;c[e>>2]=b;f=+(b|0);g[a+24>>2]=1.0/f;g[a+28>>2]=.10000000149011612;h=+Y(+(50265.484375/f));b=a+32|0;g[b>>2]=h;j=1.0/h;k=a+36|0;g[k>>2]=j;g[a+40>>2]=1.0/((j+.15748216211795807)/h+.9351401925086975);l=h*h;m=a+44|0;g[m>>2]=l;n=50.06380844116211/l;o=a+48|0;g[o>>2]=n;g[a+52>>2]=n+.9351401925086975;g[a+56>>2]=1.0/((j+.7431304454803467)/h+1.450071096420288);n=11.05205249786377/l;g[a+60>>2]=n;g[a+64>>2]=n+1.450071096420288;g[a+68>>2]=1.0/((j+3.189727306365967)/h+4.076781749725342);p=.0017661728197708726/l;g[a+72>>2]=p;g[a+76>>2]=p+.000407678191550076;g[a+80>>2]=0.0;g[a+84>>2]=-20.0;q=a+88|0;c[q>>2]=0;c[q+4>>2]=0;g[a+96>>2]=6.2831854820251465/f;g[a+100>>2]=.10000000149011612;g[a+104>>2]=49.0;f=1.0/l;q=a+172|0;r=a+108|0;s=r+64|0;do{c[r>>2]=0;r=r+4|0}while((r|0)<(s|0));g[q>>2]=f;g[a+176>>2]=(4.076781749725342-f)*2.0;g[a+180>>2]=(j+-3.189727306365967)/h+4.076781749725342;r=a+184|0;c[r+0>>2]=0;c[r+4>>2]=0;c[r+8>>2]=0;g[a+196>>2]=(.000407678191550076-p)*2.0;g[a+200>>2]=(1.450071096420288-f)*2.0;p=+g[k>>2];h=+g[b>>2];g[a+204>>2]=(p+-.7431304454803467)/h+1.450071096420288;r=a+208|0;c[r+0>>2]=0;c[r+4>>2]=0;c[r+8>>2]=0;g[a+220>>2]=(1.450071096420288-n)*2.0;g[a+224>>2]=(.9351401925086975-f)*2.0;g[a+228>>2]=(p+-.15748216211795807)/h+.9351401925086975;r=a+232|0;c[r+0>>2]=0;c[r+4>>2]=0;c[r+8>>2]=0;g[a+244>>2]=(.9351401925086975- +g[o>>2])*2.0;o=a+248|0;c[o>>2]=0;c[o+4>>2]=0;f=+Y(+(31665.26953125/+(c[e>>2]|0)));o=a+260|0;g[o>>2]=f;n=1.0/f;r=a+264|0;g[r>>2]=n;g[a+268>>2]=1.0/((n+.15748216211795807)/f+.9351401925086975);j=f*f;s=a+272|0;g[s>>2]=j;l=50.06380844116211/j;t=a+276|0;g[t>>2]=l;g[a+280>>2]=l+.9351401925086975;g[a+284>>2]=1.0/((n+.7431304454803467)/f+1.450071096420288);l=11.05205249786377/j;u=a+288|0;g[u>>2]=l;g[a+292>>2]=l+1.450071096420288;g[a+296>>2]=1.0/((n+3.189727306365967)/f+4.076781749725342);f=.0017661728197708726/j;v=a+300|0;g[v>>2]=f;g[a+304>>2]=f+.000407678191550076;g[a+308>>2]=1.0/((p+.16840487718582153)/h+1.0693583488464355);f=+g[q>>2];g[a+312>>2]=f+53.53615188598633;g[a+316>>2]=1.0/((p+.5124786496162415)/h+.6896213889122009);g[a+320>>2]=f+7.621731281280518;h=+g[k>>2];p=+g[b>>2];g[a+324>>2]=1.0/((h+.7824130654335022)/p+.24529150128364563);j=9999999747378752.0e-20/+g[m>>2];g[a+328>>2]=j;g[a+332>>2]=j+.0004332271928433329;g[a+336>>2]=(.24529150128364563-f)*2.0;g[a+340>>2]=(h+-.7824130654335022)/p+.24529150128364563;m=a+344|0;c[m+0>>2]=0;c[m+4>>2]=0;c[m+8>>2]=0;g[a+356>>2]=(.0004332271928433329-j)*2.0;g[a+360>>2]=(h+-.5124786496162415)/p+.6896213889122009;g[a+364>>2]=(.6896213889122009-f)*2.0;m=a+368|0;c[m+0>>2]=0;c[m+4>>2]=0;c[m+8>>2]=0;g[a+380>>2]=(7.621731281280518-f)*2.0;g[a+384>>2]=(1.0693583488464355-f)*2.0;g[a+388>>2]=(h+-.16840487718582153)/p+1.0693583488464355;m=a+392|0;c[m+0>>2]=0;c[m+4>>2]=0;c[m+8>>2]=0;g[a+404>>2]=(53.53615188598633-f)*2.0;f=1.0/+g[s>>2];m=a+408|0;g[m>>2]=f;g[a+412>>2]=(4.076781749725342-f)*2.0;p=+g[r>>2];h=+g[o>>2];g[a+416>>2]=(p+-3.189727306365967)/h+4.076781749725342;b=a+420|0;c[b+0>>2]=0;c[b+4>>2]=0;c[b+8>>2]=0;g[a+432>>2]=(.000407678191550076- +g[v>>2])*2.0;g[a+436>>2]=(1.450071096420288-f)*2.0;g[a+440>>2]=(p+-.7431304454803467)/h+1.450071096420288;v=a+444|0;c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;g[a+456>>2]=(1.450071096420288- +g[u>>2])*2.0;g[a+460>>2]=(.9351401925086975-f)*2.0;g[a+464>>2]=(p+-.15748216211795807)/h+.9351401925086975;u=a+468|0;c[u+0>>2]=0;c[u+4>>2]=0;c[u+8>>2]=0;g[a+480>>2]=(.9351401925086975- +g[t>>2])*2.0;t=a+484|0;c[t>>2]=0;c[t+4>>2]=0;h=+Y(+(19947.869140625/+(c[e>>2]|0)));t=a+496|0;g[t>>2]=h;p=1.0/h;u=a+500|0;g[u>>2]=p;g[a+504>>2]=1.0/((p+.15748216211795807)/h+.9351401925086975);f=h*h;v=a+508|0;g[v>>2]=f;j=50.06380844116211/f;b=a+512|0;g[b>>2]=j;g[a+516>>2]=j+.9351401925086975;g[a+520>>2]=1.0/((p+.7431304454803467)/h+1.450071096420288);j=11.05205249786377/f;k=a+524|0;g[k>>2]=j;g[a+528>>2]=j+1.450071096420288;g[a+532>>2]=1.0/((p+3.189727306365967)/h+4.076781749725342);h=.0017661728197708726/f;q=a+536|0;g[q>>2]=h;g[a+540>>2]=h+.000407678191550076;h=+g[r>>2];f=+g[o>>2];g[a+544>>2]=1.0/((h+.16840487718582153)/f+1.0693583488464355);p=+g[m>>2];g[a+548>>2]=p+53.53615188598633;g[a+552>>2]=1.0/((h+.5124786496162415)/f+.6896213889122009);g[a+556>>2]=p+7.621731281280518;g[a+560>>2]=1.0/((h+.7824130654335022)/f+.24529150128364563);j=9999999747378752.0e-20/+g[s>>2];g[a+564>>2]=j;g[a+568>>2]=j+.0004332271928433329;g[a+572>>2]=(.24529150128364563-p)*2.0;g[a+576>>2]=(h+-.7824130654335022)/f+.24529150128364563;s=a+580|0;c[s+0>>2]=0;c[s+4>>2]=0;c[s+8>>2]=0;g[a+592>>2]=(.0004332271928433329-j)*2.0;g[a+596>>2]=(.6896213889122009-p)*2.0;g[a+600>>2]=(h+-.5124786496162415)/f+.6896213889122009;s=a+604|0;c[s+0>>2]=0;c[s+4>>2]=0;c[s+8>>2]=0;g[a+616>>2]=(7.621731281280518-p)*2.0;g[a+620>>2]=(1.0693583488464355-p)*2.0;g[a+624>>2]=(h+-.16840487718582153)/f+1.0693583488464355;s=a+628|0;c[s+0>>2]=0;c[s+4>>2]=0;c[s+8>>2]=0;g[a+640>>2]=(53.53615188598633-p)*2.0;p=1.0/+g[v>>2];s=a+644|0;g[s>>2]=p;g[a+648>>2]=(4.076781749725342-p)*2.0;f=+g[u>>2];h=+g[t>>2];g[a+652>>2]=(f+-3.189727306365967)/h+4.076781749725342;m=a+656|0;c[m+0>>2]=0;c[m+4>>2]=0;c[m+8>>2]=0;g[a+668>>2]=(.000407678191550076- +g[q>>2])*2.0;g[a+672>>2]=(1.450071096420288-p)*2.0;g[a+676>>2]=(f+-.7431304454803467)/h+1.450071096420288;q=a+680|0;c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;g[a+692>>2]=(1.450071096420288- +g[k>>2])*2.0;g[a+696>>2]=(.9351401925086975-p)*2.0;g[a+700>>2]=(f+-.15748216211795807)/h+.9351401925086975;k=a+704|0;c[k+0>>2]=0;c[k+4>>2]=0;c[k+8>>2]=0;g[a+716>>2]=(.9351401925086975- +g[b>>2])*2.0;b=a+720|0;c[b>>2]=0;c[b+4>>2]=0;h=+Y(+(12566.37109375/+(c[e>>2]|0)));b=a+732|0;g[b>>2]=h;f=1.0/h;k=a+736|0;g[k>>2]=f;g[a+740>>2]=1.0/((f+.15748216211795807)/h+.9351401925086975);p=h*h;q=a+744|0;g[q>>2]=p;j=50.06380844116211/p;m=a+748|0;g[m>>2]=j;g[a+752>>2]=j+.9351401925086975;g[a+756>>2]=1.0/((f+.7431304454803467)/h+1.450071096420288);j=11.05205249786377/p;o=a+760|0;g[o>>2]=j;g[a+764>>2]=j+1.450071096420288;g[a+768>>2]=1.0/((f+3.189727306365967)/h+4.076781749725342);h=.0017661728197708726/p;r=a+772|0;g[r>>2]=h;g[a+776>>2]=h+.000407678191550076;h=+g[u>>2];p=+g[t>>2];g[a+780>>2]=1.0/((h+.16840487718582153)/p+1.0693583488464355);f=+g[s>>2];g[a+784>>2]=f+53.53615188598633;g[a+788>>2]=1.0/((h+.5124786496162415)/p+.6896213889122009);g[a+792>>2]=f+7.621731281280518;g[a+796>>2]=1.0/((h+.7824130654335022)/p+.24529150128364563);j=9999999747378752.0e-20/+g[v>>2];g[a+800>>2]=j;g[a+804>>2]=j+.0004332271928433329;g[a+808>>2]=(.24529150128364563-f)*2.0;g[a+812>>2]=(h+-.7824130654335022)/p+.24529150128364563;v=a+816|0;c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;g[a+828>>2]=(.0004332271928433329-j)*2.0;g[a+832>>2]=(.6896213889122009-f)*2.0;g[a+836>>2]=(h+-.5124786496162415)/p+.6896213889122009;v=a+840|0;c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;g[a+852>>2]=(7.621731281280518-f)*2.0;g[a+856>>2]=(1.0693583488464355-f)*2.0;g[a+860>>2]=(h+-.16840487718582153)/p+1.0693583488464355;v=a+864|0;c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;g[a+876>>2]=(53.53615188598633-f)*2.0;f=1.0/+g[q>>2];v=a+880|0;g[v>>2]=f;g[a+884>>2]=(4.076781749725342-f)*2.0;p=+g[k>>2];h=+g[b>>2];g[a+888>>2]=(p+-3.189727306365967)/h+4.076781749725342;s=a+892|0;c[s+0>>2]=0;c[s+4>>2]=0;c[s+8>>2]=0;g[a+904>>2]=(.000407678191550076- +g[r>>2])*2.0;g[a+908>>2]=(1.450071096420288-f)*2.0;g[a+912>>2]=(p+-.7431304454803467)/h+1.450071096420288;r=a+916|0;c[r+0>>2]=0;c[r+4>>2]=0;c[r+8>>2]=0;g[a+928>>2]=(1.450071096420288- +g[o>>2])*2.0;g[a+932>>2]=(.9351401925086975-f)*2.0;g[a+936>>2]=(p+-.15748216211795807)/h+.9351401925086975;o=a+940|0;c[o+0>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;g[a+952>>2]=(.9351401925086975- +g[m>>2])*2.0;m=a+956|0;c[m>>2]=0;c[m+4>>2]=0;h=+Y(+(7916.3173828125/+(c[e>>2]|0)));m=a+968|0;g[m>>2]=h;p=1.0/h;o=a+972|0;g[o>>2]=p;g[a+976>>2]=1.0/((p+.15748216211795807)/h+.9351401925086975);f=h*h;r=a+980|0;g[r>>2]=f;j=50.06380844116211/f;s=a+984|0;g[s>>2]=j;g[a+988>>2]=j+.9351401925086975;g[a+992>>2]=1.0/((p+.7431304454803467)/h+1.450071096420288);j=11.05205249786377/f;t=a+996|0;g[t>>2]=j;g[a+1e3>>2]=j+1.450071096420288;g[a+1004>>2]=1.0/((p+3.189727306365967)/h+4.076781749725342);h=.0017661728197708726/f;u=a+1008|0;g[u>>2]=h;g[a+1012>>2]=h+.000407678191550076;h=+g[k>>2];f=+g[b>>2];g[a+1016>>2]=1.0/((h+.16840487718582153)/f+1.0693583488464355);p=+g[v>>2];g[a+1020>>2]=p+53.53615188598633;g[a+1024>>2]=1.0/((h+.5124786496162415)/f+.6896213889122009);g[a+1028>>2]=p+7.621731281280518;g[a+1032>>2]=1.0/((h+.7824130654335022)/f+.24529150128364563);j=9999999747378752.0e-20/+g[q>>2];g[a+1036>>2]=j;g[a+1040>>2]=j+.0004332271928433329;g[a+1044>>2]=(.24529150128364563-p)*2.0;g[a+1048>>2]=(h+-.7824130654335022)/f+.24529150128364563;q=a+1052|0;c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;g[a+1064>>2]=(.0004332271928433329-j)*2.0;g[a+1068>>2]=(.6896213889122009-p)*2.0;g[a+1072>>2]=(h+-.5124786496162415)/f+.6896213889122009;q=a+1076|0;c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;g[a+1088>>2]=(7.621731281280518-p)*2.0;g[a+1092>>2]=(1.0693583488464355-p)*2.0;g[a+1096>>2]=(h+-.16840487718582153)/f+1.0693583488464355;q=a+1100|0;c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;g[a+1112>>2]=(53.53615188598633-p)*2.0;p=1.0/+g[r>>2];q=a+1116|0;g[q>>2]=p;g[a+1120>>2]=(4.076781749725342-p)*2.0;f=+g[o>>2];h=+g[m>>2];g[a+1124>>2]=(f+-3.189727306365967)/h+4.076781749725342;v=a+1128|0;c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;g[a+1140>>2]=(.000407678191550076- +g[u>>2])*2.0;g[a+1144>>2]=(1.450071096420288-p)*2.0;g[a+1148>>2]=(f+-.7431304454803467)/h+1.450071096420288;u=a+1152|0;c[u+0>>2]=0;c[u+4>>2]=0;c[u+8>>2]=0;g[a+1164>>2]=(1.450071096420288- +g[t>>2])*2.0;g[a+1168>>2]=(.9351401925086975-p)*2.0;g[a+1172>>2]=(f+-.15748216211795807)/h+.9351401925086975;t=a+1176|0;c[t+0>>2]=0;c[t+4>>2]=0;c[t+8>>2]=0;g[a+1188>>2]=(.9351401925086975- +g[s>>2])*2.0;s=a+1192|0;c[s>>2]=0;c[s+4>>2]=0;h=+Y(+(4986.96728515625/+(c[e>>2]|0)));s=a+1204|0;g[s>>2]=h;f=1.0/h;t=a+1208|0;g[t>>2]=f;g[a+1212>>2]=1.0/((f+.15748216211795807)/h+.9351401925086975);p=h*h;u=a+1216|0;g[u>>2]=p;j=50.06380844116211/p;v=a+1220|0;g[v>>2]=j;g[a+1224>>2]=j+.9351401925086975;g[a+1228>>2]=1.0/((f+.7431304454803467)/h+1.450071096420288);j=11.05205249786377/p;b=a+1232|0;g[b>>2]=j;g[a+1236>>2]=j+1.450071096420288;g[a+1240>>2]=1.0/((f+3.189727306365967)/h+4.076781749725342);h=.0017661728197708726/p;k=a+1244|0;g[k>>2]=h;g[a+1248>>2]=h+.000407678191550076;h=+g[o>>2];p=+g[m>>2];g[a+1252>>2]=1.0/((h+.16840487718582153)/p+1.0693583488464355);f=+g[q>>2];g[a+1256>>2]=f+53.53615188598633;g[a+1260>>2]=1.0/((h+.5124786496162415)/p+.6896213889122009);g[a+1264>>2]=f+7.621731281280518;g[a+1268>>2]=1.0/((h+.7824130654335022)/p+.24529150128364563);j=9999999747378752.0e-20/+g[r>>2];g[a+1272>>2]=j;g[a+1276>>2]=j+.0004332271928433329;g[a+1280>>2]=(.24529150128364563-f)*2.0;g[a+1284>>2]=(h+-.7824130654335022)/p+.24529150128364563;r=a+1288|0;c[r+0>>2]=0;c[r+4>>2]=0;c[r+8>>2]=0;g[a+1300>>2]=(.0004332271928433329-j)*2.0;g[a+1304>>2]=(.6896213889122009-f)*2.0;g[a+1308>>2]=(h+-.5124786496162415)/p+.6896213889122009;r=a+1312|0;c[r+0>>2]=0;c[r+4>>2]=0;c[r+8>>2]=0;g[a+1324>>2]=(7.621731281280518-f)*2.0;g[a+1328>>2]=(1.0693583488464355-f)*2.0;g[a+1332>>2]=(h+-.16840487718582153)/p+1.0693583488464355;r=a+1336|0;c[r+0>>2]=0;c[r+4>>2]=0;c[r+8>>2]=0;g[a+1348>>2]=(53.53615188598633-f)*2.0;f=1.0/+g[u>>2];r=a+1352|0;g[r>>2]=f;g[a+1356>>2]=(4.076781749725342-f)*2.0;p=+g[t>>2];h=+g[s>>2];g[a+1360>>2]=(p+-3.189727306365967)/h+4.076781749725342;q=a+1364|0;c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;g[a+1376>>2]=(.000407678191550076- +g[k>>2])*2.0;g[a+1380>>2]=(1.450071096420288-f)*2.0;g[a+1384>>2]=(p+-.7431304454803467)/h+1.450071096420288;k=a+1388|0;c[k+0>>2]=0;c[k+4>>2]=0;c[k+8>>2]=0;g[a+1400>>2]=(1.450071096420288- +g[b>>2])*2.0;g[a+1404>>2]=(.9351401925086975-f)*2.0;g[a+1408>>2]=(p+-.15748216211795807)/h+.9351401925086975;b=a+1412|0;c[b+0>>2]=0;c[b+4>>2]=0;c[b+8>>2]=0;g[a+1424>>2]=(.9351401925086975- +g[v>>2])*2.0;v=a+1428|0;c[v>>2]=0;c[v+4>>2]=0;h=+Y(+(3141.5927734375/+(c[e>>2]|0)));v=a+1440|0;g[v>>2]=h;p=1.0/h;b=a+1444|0;g[b>>2]=p;g[a+1448>>2]=1.0/((p+.15748216211795807)/h+.9351401925086975);f=h*h;k=a+1452|0;g[k>>2]=f;j=50.06380844116211/f;q=a+1456|0;g[q>>2]=j;g[a+1460>>2]=j+.9351401925086975;g[a+1464>>2]=1.0/((p+.7431304454803467)/h+1.450071096420288);j=11.05205249786377/f;m=a+1468|0;g[m>>2]=j;g[a+1472>>2]=j+1.450071096420288;g[a+1476>>2]=1.0/((p+3.189727306365967)/h+4.076781749725342);h=.0017661728197708726/f;o=a+1480|0;g[o>>2]=h;g[a+1484>>2]=h+.000407678191550076;h=+g[t>>2];f=+g[s>>2];g[a+1488>>2]=1.0/((h+.16840487718582153)/f+1.0693583488464355);p=+g[r>>2];g[a+1492>>2]=p+53.53615188598633;g[a+1496>>2]=1.0/((h+.5124786496162415)/f+.6896213889122009);g[a+1500>>2]=p+7.621731281280518;g[a+1504>>2]=1.0/((h+.7824130654335022)/f+.24529150128364563);j=9999999747378752.0e-20/+g[u>>2];g[a+1508>>2]=j;g[a+1512>>2]=j+.0004332271928433329;g[a+1516>>2]=(.24529150128364563-p)*2.0;g[a+1520>>2]=(h+-.7824130654335022)/f+.24529150128364563;u=a+1524|0;c[u+0>>2]=0;c[u+4>>2]=0;c[u+8>>2]=0;g[a+1536>>2]=(.0004332271928433329-j)*2.0;g[a+1540>>2]=(.6896213889122009-p)*2.0;g[a+1544>>2]=(h+-.5124786496162415)/f+.6896213889122009;u=a+1548|0;c[u+0>>2]=0;c[u+4>>2]=0;c[u+8>>2]=0;g[a+1560>>2]=(7.621731281280518-p)*2.0;g[a+1564>>2]=(1.0693583488464355-p)*2.0;g[a+1568>>2]=(h+-.16840487718582153)/f+1.0693583488464355;u=a+1572|0;c[u+0>>2]=0;c[u+4>>2]=0;c[u+8>>2]=0;g[a+1584>>2]=(53.53615188598633-p)*2.0;p=1.0/+g[k>>2];u=a+1588|0;g[u>>2]=p;g[a+1592>>2]=(4.076781749725342-p)*2.0;f=+g[b>>2];h=+g[v>>2];g[a+1596>>2]=(f+-3.189727306365967)/h+4.076781749725342;r=a+1600|0;c[r+0>>2]=0;c[r+4>>2]=0;c[r+8>>2]=0;g[a+1612>>2]=(.000407678191550076- +g[o>>2])*2.0;g[a+1616>>2]=(1.450071096420288-p)*2.0;g[a+1620>>2]=(f+-.7431304454803467)/h+1.450071096420288;o=a+1624|0;c[o+0>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;g[a+1636>>2]=(1.450071096420288- +g[m>>2])*2.0;g[a+1640>>2]=(.9351401925086975-p)*2.0;g[a+1644>>2]=(f+-.15748216211795807)/h+.9351401925086975;m=a+1648|0;c[m+0>>2]=0;c[m+4>>2]=0;c[m+8>>2]=0;g[a+1660>>2]=(.9351401925086975- +g[q>>2])*2.0;q=a+1664|0;c[q>>2]=0;c[q+4>>2]=0;h=+Y(+(1979.079345703125/+(c[e>>2]|0)));q=a+1676|0;g[q>>2]=h;f=1.0/h;m=a+1680|0;g[m>>2]=f;g[a+1684>>2]=1.0/((f+.15748216211795807)/h+.9351401925086975);p=h*h;o=a+1688|0;g[o>>2]=p;j=50.06380844116211/p;r=a+1692|0;g[r>>2]=j;g[a+1696>>2]=j+.9351401925086975;g[a+1700>>2]=1.0/((f+.7431304454803467)/h+1.450071096420288);j=11.05205249786377/p;s=a+1704|0;g[s>>2]=j;g[a+1708>>2]=j+1.450071096420288;g[a+1712>>2]=1.0/((f+3.189727306365967)/h+4.076781749725342);h=.0017661728197708726/p;t=a+1716|0;g[t>>2]=h;g[a+1720>>2]=h+.000407678191550076;h=+g[b>>2];p=+g[v>>2];g[a+1724>>2]=1.0/((h+.16840487718582153)/p+1.0693583488464355);f=+g[u>>2];g[a+1728>>2]=f+53.53615188598633;g[a+1732>>2]=1.0/((h+.5124786496162415)/p+.6896213889122009);g[a+1736>>2]=f+7.621731281280518;g[a+1740>>2]=1.0/((h+.7824130654335022)/p+.24529150128364563);j=9999999747378752.0e-20/+g[k>>2];g[a+1744>>2]=j;g[a+1748>>2]=j+.0004332271928433329;g[a+1752>>2]=(.24529150128364563-f)*2.0;g[a+1756>>2]=(h+-.7824130654335022)/p+.24529150128364563;k=a+1760|0;c[k+0>>2]=0;c[k+4>>2]=0;c[k+8>>2]=0;g[a+1772>>2]=(.0004332271928433329-j)*2.0;g[a+1776>>2]=(.6896213889122009-f)*2.0;g[a+1780>>2]=(h+-.5124786496162415)/p+.6896213889122009;k=a+1784|0;c[k+0>>2]=0;c[k+4>>2]=0;c[k+8>>2]=0;g[a+1796>>2]=(7.621731281280518-f)*2.0;g[a+1800>>2]=(1.0693583488464355-f)*2.0;g[a+1804>>2]=(h+-.16840487718582153)/p+1.0693583488464355;k=a+1808|0;c[k+0>>2]=0;c[k+4>>2]=0;c[k+8>>2]=0;g[a+1820>>2]=(53.53615188598633-f)*2.0;f=1.0/+g[o>>2];k=a+1824|0;g[k>>2]=f;g[a+1828>>2]=(4.076781749725342-f)*2.0;p=+g[m>>2];h=+g[q>>2];g[a+1832>>2]=(p+-3.189727306365967)/h+4.076781749725342;u=a+1836|0;c[u+0>>2]=0;c[u+4>>2]=0;c[u+8>>2]=0;g[a+1848>>2]=(.000407678191550076- +g[t>>2])*2.0;g[a+1852>>2]=(1.450071096420288-f)*2.0;g[a+1856>>2]=(p+-.7431304454803467)/h+1.450071096420288;t=a+1860|0;c[t+0>>2]=0;c[t+4>>2]=0;c[t+8>>2]=0;g[a+1872>>2]=(1.450071096420288- +g[s>>2])*2.0;g[a+1876>>2]=(.9351401925086975-f)*2.0;g[a+1880>>2]=(p+-.15748216211795807)/h+.9351401925086975;s=a+1884|0;c[s+0>>2]=0;c[s+4>>2]=0;c[s+8>>2]=0;g[a+1896>>2]=(.9351401925086975- +g[r>>2])*2.0;r=a+1900|0;c[r>>2]=0;c[r+4>>2]=0;h=+Y(+(1246.7418212890625/+(c[e>>2]|0)));r=a+1912|0;g[r>>2]=h;p=1.0/h;s=a+1916|0;g[s>>2]=p;g[a+1920>>2]=1.0/((p+.15748216211795807)/h+.9351401925086975);f=h*h;t=a+1924|0;g[t>>2]=f;j=50.06380844116211/f;u=a+1928|0;g[u>>2]=j;g[a+1932>>2]=j+.9351401925086975;g[a+1936>>2]=1.0/((p+.7431304454803467)/h+1.450071096420288);j=11.05205249786377/f;v=a+1940|0;g[v>>2]=j;g[a+1944>>2]=j+1.450071096420288;g[a+1948>>2]=1.0/((p+3.189727306365967)/h+4.076781749725342);h=.0017661728197708726/f;b=a+1952|0;g[b>>2]=h;g[a+1956>>2]=h+.000407678191550076;h=+g[m>>2];f=+g[q>>2];g[a+1960>>2]=1.0/((h+.16840487718582153)/f+1.0693583488464355);p=+g[k>>2];g[a+1964>>2]=p+53.53615188598633;g[a+1968>>2]=1.0/((h+.5124786496162415)/f+.6896213889122009);g[a+1972>>2]=p+7.621731281280518;g[a+1976>>2]=1.0/((h+.7824130654335022)/f+.24529150128364563);j=9999999747378752.0e-20/+g[o>>2];g[a+1980>>2]=j;g[a+1984>>2]=j+.0004332271928433329;g[a+1988>>2]=(.24529150128364563-p)*2.0;g[a+1992>>2]=(h+-.7824130654335022)/f+.24529150128364563;o=a+1996|0;c[o+0>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;g[a+2008>>2]=(.0004332271928433329-j)*2.0;g[a+2012>>2]=(.6896213889122009-p)*2.0;g[a+2016>>2]=(h+-.5124786496162415)/f+.6896213889122009;o=a+2020|0;c[o+0>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;g[a+2032>>2]=(7.621731281280518-p)*2.0;g[a+2036>>2]=(1.0693583488464355-p)*2.0;g[a+2040>>2]=(h+-.16840487718582153)/f+1.0693583488464355;o=a+2044|0;c[o+0>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;g[a+2056>>2]=(53.53615188598633-p)*2.0;p=1.0/+g[t>>2];o=a+2060|0;g[o>>2]=p;g[a+2064>>2]=(4.076781749725342-p)*2.0;f=+g[s>>2];h=+g[r>>2];g[a+2068>>2]=(f+-3.189727306365967)/h+4.076781749725342;k=a+2072|0;c[k+0>>2]=0;c[k+4>>2]=0;c[k+8>>2]=0;g[a+2084>>2]=(.000407678191550076- +g[b>>2])*2.0;g[a+2088>>2]=(1.450071096420288-p)*2.0;g[a+2092>>2]=(f+-.7431304454803467)/h+1.450071096420288;b=a+2096|0;c[b+0>>2]=0;c[b+4>>2]=0;c[b+8>>2]=0;g[a+2108>>2]=(1.450071096420288- +g[v>>2])*2.0;g[a+2112>>2]=(.9351401925086975-p)*2.0;g[a+2116>>2]=(f+-.15748216211795807)/h+.9351401925086975;v=a+2120|0;c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;g[a+2132>>2]=(.9351401925086975- +g[u>>2])*2.0;u=a+2136|0;c[u>>2]=0;c[u+4>>2]=0;h=+Y(+(785.398193359375/+(c[e>>2]|0)));u=a+2148|0;g[u>>2]=h;f=1.0/h;v=a+2152|0;g[v>>2]=f;g[a+2156>>2]=1.0/((f+.15748216211795807)/h+.9351401925086975);p=h*h;b=a+2160|0;g[b>>2]=p;j=50.06380844116211/p;k=a+2164|0;g[k>>2]=j;g[a+2168>>2]=j+.9351401925086975;g[a+2172>>2]=1.0/((f+.7431304454803467)/h+1.450071096420288);j=11.05205249786377/p;q=a+2176|0;g[q>>2]=j;g[a+2180>>2]=j+1.450071096420288;g[a+2184>>2]=1.0/((f+3.189727306365967)/h+4.076781749725342);h=.0017661728197708726/p;m=a+2188|0;g[m>>2]=h;g[a+2192>>2]=h+.000407678191550076;h=+g[s>>2];p=+g[r>>2];g[a+2196>>2]=1.0/((h+.16840487718582153)/p+1.0693583488464355);f=+g[o>>2];g[a+2200>>2]=f+53.53615188598633;g[a+2204>>2]=1.0/((h+.5124786496162415)/p+.6896213889122009);g[a+2208>>2]=f+7.621731281280518;g[a+2212>>2]=1.0/((h+.7824130654335022)/p+.24529150128364563);j=9999999747378752.0e-20/+g[t>>2];g[a+2216>>2]=j;g[a+2220>>2]=j+.0004332271928433329;g[a+2224>>2]=(.24529150128364563-f)*2.0;g[a+2228>>2]=(h+-.7824130654335022)/p+.24529150128364563;t=a+2232|0;c[t+0>>2]=0;c[t+4>>2]=0;c[t+8>>2]=0;g[a+2244>>2]=(.0004332271928433329-j)*2.0;g[a+2248>>2]=(.6896213889122009-f)*2.0;g[a+2252>>2]=(h+-.5124786496162415)/p+.6896213889122009;t=a+2256|0;c[t+0>>2]=0;c[t+4>>2]=0;c[t+8>>2]=0;g[a+2268>>2]=(7.621731281280518-f)*2.0;g[a+2272>>2]=(1.0693583488464355-f)*2.0;g[a+2276>>2]=(h+-.16840487718582153)/p+1.0693583488464355;t=a+2280|0;c[t+0>>2]=0;c[t+4>>2]=0;c[t+8>>2]=0;g[a+2292>>2]=(53.53615188598633-f)*2.0;f=1.0/+g[b>>2];t=a+2296|0;g[t>>2]=f;g[a+2300>>2]=(4.076781749725342-f)*2.0;p=+g[v>>2];h=+g[u>>2];g[a+2304>>2]=(p+-3.189727306365967)/h+4.076781749725342;o=a+2308|0;c[o+0>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;g[a+2320>>2]=(.000407678191550076- +g[m>>2])*2.0;g[a+2324>>2]=(1.450071096420288-f)*2.0;g[a+2328>>2]=(p+-.7431304454803467)/h+1.450071096420288;m=a+2332|0;c[m+0>>2]=0;c[m+4>>2]=0;c[m+8>>2]=0;g[a+2344>>2]=(1.450071096420288- +g[q>>2])*2.0;g[a+2348>>2]=(.9351401925086975-f)*2.0;g[a+2352>>2]=(p+-.15748216211795807)/h+.9351401925086975;q=a+2356|0;c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;g[a+2368>>2]=(.9351401925086975- +g[k>>2])*2.0;k=a+2372|0;c[k>>2]=0;c[k+4>>2]=0;h=+Y(+(494.76983642578125/+(c[e>>2]|0)));k=a+2384|0;g[k>>2]=h;p=1.0/h;q=a+2388|0;g[q>>2]=p;g[a+2392>>2]=1.0/((p+.15748216211795807)/h+.9351401925086975);f=h*h;m=a+2396|0;g[m>>2]=f;j=50.06380844116211/f;o=a+2400|0;g[o>>2]=j;g[a+2404>>2]=j+.9351401925086975;g[a+2408>>2]=1.0/((p+.7431304454803467)/h+1.450071096420288);j=11.05205249786377/f;r=a+2412|0;g[r>>2]=j;g[a+2416>>2]=j+1.450071096420288;g[a+2420>>2]=1.0/((p+3.189727306365967)/h+4.076781749725342);h=.0017661728197708726/f;s=a+2424|0;g[s>>2]=h;g[a+2428>>2]=h+.000407678191550076;h=+g[v>>2];f=+g[u>>2];g[a+2432>>2]=1.0/((h+.16840487718582153)/f+1.0693583488464355);p=+g[t>>2];g[a+2436>>2]=p+53.53615188598633;g[a+2440>>2]=1.0/((h+.5124786496162415)/f+.6896213889122009);g[a+2444>>2]=p+7.621731281280518;g[a+2448>>2]=1.0/((h+.7824130654335022)/f+.24529150128364563);j=9999999747378752.0e-20/+g[b>>2];g[a+2452>>2]=j;g[a+2456>>2]=j+.0004332271928433329;g[a+2460>>2]=(.24529150128364563-p)*2.0;g[a+2464>>2]=(h+-.7824130654335022)/f+.24529150128364563;b=a+2468|0;c[b+0>>2]=0;c[b+4>>2]=0;c[b+8>>2]=0;g[a+2480>>2]=(.0004332271928433329-j)*2.0;g[a+2484>>2]=(.6896213889122009-p)*2.0;g[a+2488>>2]=(h+-.5124786496162415)/f+.6896213889122009;b=a+2492|0;c[b+0>>2]=0;c[b+4>>2]=0;c[b+8>>2]=0;g[a+2504>>2]=(7.621731281280518-p)*2.0;g[a+2508>>2]=(1.0693583488464355-p)*2.0;g[a+2512>>2]=(h+-.16840487718582153)/f+1.0693583488464355;b=a+2516|0;c[b+0>>2]=0;c[b+4>>2]=0;c[b+8>>2]=0;g[a+2528>>2]=(53.53615188598633-p)*2.0;p=1.0/+g[m>>2];b=a+2532|0;g[b>>2]=p;g[a+2536>>2]=(4.076781749725342-p)*2.0;f=+g[q>>2];h=+g[k>>2];g[a+2540>>2]=(f+-3.189727306365967)/h+4.076781749725342;t=a+2544|0;c[t+0>>2]=0;c[t+4>>2]=0;c[t+8>>2]=0;g[a+2556>>2]=(.000407678191550076- +g[s>>2])*2.0;g[a+2560>>2]=(1.450071096420288-p)*2.0;g[a+2564>>2]=(f+-.7431304454803467)/h+1.450071096420288;s=a+2568|0;c[s+0>>2]=0;c[s+4>>2]=0;c[s+8>>2]=0;g[a+2580>>2]=(1.450071096420288- +g[r>>2])*2.0;g[a+2584>>2]=(.9351401925086975-p)*2.0;g[a+2588>>2]=(f+-.15748216211795807)/h+.9351401925086975;r=a+2592|0;c[r+0>>2]=0;c[r+4>>2]=0;c[r+8>>2]=0;g[a+2604>>2]=(.9351401925086975- +g[o>>2])*2.0;o=a+2608|0;c[o>>2]=0;c[o+4>>2]=0;h=+Y(+(311.6854553222656/+(c[e>>2]|0)));o=a+2620|0;g[o>>2]=h;f=1.0/h;r=a+2624|0;g[r>>2]=f;g[a+2628>>2]=1.0/((f+.15748216211795807)/h+.9351401925086975);p=h*h;s=a+2632|0;g[s>>2]=p;j=50.06380844116211/p;t=a+2636|0;g[t>>2]=j;g[a+2640>>2]=j+.9351401925086975;g[a+2644>>2]=1.0/((f+.7431304454803467)/h+1.450071096420288);j=11.05205249786377/p;u=a+2648|0;g[u>>2]=j;g[a+2652>>2]=j+1.450071096420288;g[a+2656>>2]=1.0/((f+3.189727306365967)/h+4.076781749725342);h=.0017661728197708726/p;v=a+2660|0;g[v>>2]=h;g[a+2664>>2]=h+.000407678191550076;h=+g[q>>2];p=+g[k>>2];g[a+2668>>2]=1.0/((h+.16840487718582153)/p+1.0693583488464355);f=+g[b>>2];g[a+2672>>2]=f+53.53615188598633;g[a+2676>>2]=1.0/((h+.5124786496162415)/p+.6896213889122009);g[a+2680>>2]=f+7.621731281280518;g[a+2684>>2]=1.0/((h+.7824130654335022)/p+.24529150128364563);j=9999999747378752.0e-20/+g[m>>2];g[a+2688>>2]=j;g[a+2692>>2]=j+.0004332271928433329;g[a+2696>>2]=(.24529150128364563-f)*2.0;g[a+2700>>2]=(h+-.7824130654335022)/p+.24529150128364563;m=a+2704|0;c[m+0>>2]=0;c[m+4>>2]=0;c[m+8>>2]=0;g[a+2716>>2]=(.0004332271928433329-j)*2.0;g[a+2720>>2]=(.6896213889122009-f)*2.0;g[a+2724>>2]=(h+-.5124786496162415)/p+.6896213889122009;m=a+2728|0;c[m+0>>2]=0;c[m+4>>2]=0;c[m+8>>2]=0;g[a+2740>>2]=(7.621731281280518-f)*2.0;g[a+2744>>2]=(1.0693583488464355-f)*2.0;g[a+2748>>2]=(h+-.16840487718582153)/p+1.0693583488464355;m=a+2752|0;c[m+0>>2]=0;c[m+4>>2]=0;c[m+8>>2]=0;g[a+2764>>2]=(53.53615188598633-f)*2.0;f=1.0/+g[s>>2];m=a+2768|0;g[m>>2]=f;g[a+2772>>2]=(4.076781749725342-f)*2.0;p=+g[r>>2];h=+g[o>>2];g[a+2776>>2]=(p+-3.189727306365967)/h+4.076781749725342;b=a+2780|0;c[b+0>>2]=0;c[b+4>>2]=0;c[b+8>>2]=0;g[a+2792>>2]=(.000407678191550076- +g[v>>2])*2.0;g[a+2796>>2]=(1.450071096420288-f)*2.0;g[a+2800>>2]=(p+-.7431304454803467)/h+1.450071096420288;v=a+2804|0;c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;g[a+2816>>2]=(1.450071096420288- +g[u>>2])*2.0;g[a+2820>>2]=(.9351401925086975-f)*2.0;g[a+2824>>2]=(p+-.15748216211795807)/h+.9351401925086975;u=a+2828|0;c[u+0>>2]=0;c[u+4>>2]=0;c[u+8>>2]=0;g[a+2840>>2]=(.9351401925086975- +g[t>>2])*2.0;t=a+2844|0;c[t>>2]=0;c[t+4>>2]=0;h=+Y(+(196.34954833984375/+(c[e>>2]|0)));t=a+2856|0;g[t>>2]=h;p=1.0/h;u=a+2860|0;g[u>>2]=p;g[a+2864>>2]=1.0/((p+.15748216211795807)/h+.9351401925086975);f=h*h;v=a+2868|0;g[v>>2]=f;j=50.06380844116211/f;b=a+2872|0;g[b>>2]=j;g[a+2876>>2]=j+.9351401925086975;g[a+2880>>2]=1.0/((p+.7431304454803467)/h+1.450071096420288);j=11.05205249786377/f;k=a+2884|0;g[k>>2]=j;g[a+2888>>2]=j+1.450071096420288;g[a+2892>>2]=1.0/((p+3.189727306365967)/h+4.076781749725342);h=.0017661728197708726/f;q=a+2896|0;g[q>>2]=h;g[a+2900>>2]=h+.000407678191550076;h=+g[r>>2];f=+g[o>>2];g[a+2904>>2]=1.0/((h+.16840487718582153)/f+1.0693583488464355);p=+g[m>>2];g[a+2908>>2]=p+53.53615188598633;g[a+2912>>2]=1.0/((h+.5124786496162415)/f+.6896213889122009);g[a+2916>>2]=p+7.621731281280518;g[a+2920>>2]=1.0/((h+.7824130654335022)/f+.24529150128364563);j=9999999747378752.0e-20/+g[s>>2];g[a+2924>>2]=j;g[a+2928>>2]=j+.0004332271928433329;g[a+2932>>2]=(.24529150128364563-p)*2.0;g[a+2936>>2]=(h+-.7824130654335022)/f+.24529150128364563;s=a+2940|0;c[s+0>>2]=0;c[s+4>>2]=0;c[s+8>>2]=0;g[a+2952>>2]=(.0004332271928433329-j)*2.0;g[a+2956>>2]=(.6896213889122009-p)*2.0;g[a+2960>>2]=(h+-.5124786496162415)/f+.6896213889122009;s=a+2964|0;c[s+0>>2]=0;c[s+4>>2]=0;c[s+8>>2]=0;g[a+2976>>2]=(7.621731281280518-p)*2.0;g[a+2980>>2]=(1.0693583488464355-p)*2.0;g[a+2984>>2]=(h+-.16840487718582153)/f+1.0693583488464355;s=a+2988|0;c[s+0>>2]=0;c[s+4>>2]=0;c[s+8>>2]=0;g[a+3e3>>2]=(53.53615188598633-p)*2.0;p=1.0/+g[v>>2];s=a+3004|0;g[s>>2]=p;g[a+3008>>2]=(4.076781749725342-p)*2.0;f=+g[u>>2];h=+g[t>>2];g[a+3012>>2]=(f+-3.189727306365967)/h+4.076781749725342;m=a+3016|0;c[m+0>>2]=0;c[m+4>>2]=0;c[m+8>>2]=0;g[a+3028>>2]=(.000407678191550076- +g[q>>2])*2.0;g[a+3032>>2]=(1.450071096420288-p)*2.0;g[a+3036>>2]=(f+-.7431304454803467)/h+1.450071096420288;q=a+3040|0;c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;g[a+3052>>2]=(1.450071096420288- +g[k>>2])*2.0;g[a+3056>>2]=(.9351401925086975-p)*2.0;g[a+3060>>2]=(f+-.15748216211795807)/h+.9351401925086975;k=a+3064|0;c[k+0>>2]=0;c[k+4>>2]=0;c[k+8>>2]=0;g[a+3076>>2]=(.9351401925086975- +g[b>>2])*2.0;b=a+3080|0;c[b>>2]=0;c[b+4>>2]=0;h=+Y(+(123.69245910644531/+(c[e>>2]|0)));e=a+3092|0;g[e>>2]=h;f=1.0/h;b=a+3096|0;g[b>>2]=f;g[a+3100>>2]=1.0/((f+.15748216211795807)/h+.9351401925086975);p=h*h;k=a+3104|0;g[k>>2]=p;j=50.06380844116211/p;q=a+3108|0;g[q>>2]=j;g[a+3112>>2]=j+.9351401925086975;g[a+3116>>2]=1.0/((f+.7431304454803467)/h+1.450071096420288);j=11.05205249786377/p;m=a+3120|0;g[m>>2]=j;g[a+3124>>2]=j+1.450071096420288;g[a+3128>>2]=1.0/((f+3.189727306365967)/h+4.076781749725342);h=.0017661728197708726/p;o=a+3132|0;g[o>>2]=h;g[a+3136>>2]=h+.000407678191550076;h=+g[u>>2];p=+g[t>>2];g[a+3140>>2]=1.0/((h+.16840487718582153)/p+1.0693583488464355);f=+g[s>>2];g[a+3144>>2]=f+53.53615188598633;g[a+3148>>2]=1.0/((h+.5124786496162415)/p+.6896213889122009);g[a+3152>>2]=f+7.621731281280518;g[a+3156>>2]=1.0/((h+.7824130654335022)/p+.24529150128364563);j=9999999747378752.0e-20/+g[v>>2];g[a+3160>>2]=j;g[a+3164>>2]=j+.0004332271928433329;g[a+3168>>2]=(.24529150128364563-f)*2.0;g[a+3172>>2]=(h+-.7824130654335022)/p+.24529150128364563;v=a+3176|0;c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;g[a+3188>>2]=(.0004332271928433329-j)*2.0;g[a+3192>>2]=(.6896213889122009-f)*2.0;g[a+3196>>2]=(h+-.5124786496162415)/p+.6896213889122009;v=a+3200|0;c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;g[a+3212>>2]=(7.621731281280518-f)*2.0;g[a+3216>>2]=(1.0693583488464355-f)*2.0;g[a+3220>>2]=(h+-.16840487718582153)/p+1.0693583488464355;v=a+3224|0;c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;g[a+3236>>2]=(53.53615188598633-f)*2.0;f=+g[k>>2];p=1.0/f;k=a+3240|0;g[k>>2]=p;g[a+3244>>2]=(4.076781749725342-p)*2.0;h=+g[b>>2];j=+g[e>>2];g[a+3248>>2]=(h+-3.189727306365967)/j+4.076781749725342;v=a+3252|0;c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;g[a+3264>>2]=(.000407678191550076- +g[o>>2])*2.0;g[a+3268>>2]=(1.450071096420288-p)*2.0;g[a+3272>>2]=(h+-.7431304454803467)/j+1.450071096420288;o=a+3276|0;c[o+0>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;g[a+3288>>2]=(1.450071096420288- +g[m>>2])*2.0;g[a+3292>>2]=(.9351401925086975-p)*2.0;g[a+3296>>2]=(h+-.15748216211795807)/j+.9351401925086975;m=a+3300|0;c[m+0>>2]=0;c[m+4>>2]=0;c[m+8>>2]=0;g[a+3312>>2]=(.9351401925086975- +g[q>>2])*2.0;q=a+3316|0;c[q>>2]=0;c[q+4>>2]=0;g[a+3328>>2]=1.0/((h+.16840487718582153)/j+1.0693583488464355);g[a+3332>>2]=p+53.53615188598633;g[a+3336>>2]=1.0/((h+.5124786496162415)/j+.6896213889122009);g[a+3340>>2]=p+7.621731281280518;g[a+3344>>2]=1.0/((h+.7824130654335022)/j+.24529150128364563);n=9999999747378752.0e-20/f;g[a+3348>>2]=n;g[a+3352>>2]=n+.0004332271928433329;g[a+3356>>2]=(.24529150128364563-p)*2.0;g[a+3360>>2]=(h+-.7824130654335022)/j+.24529150128364563;q=a+3364|0;c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;g[a+3376>>2]=(.0004332271928433329-n)*2.0;n=+g[k>>2];g[a+3380>>2]=(.6896213889122009-n)*2.0;j=+g[b>>2];h=+g[e>>2];g[a+3384>>2]=(j+-.5124786496162415)/h+.6896213889122009;e=a+3388|0;c[e+0>>2]=0;c[e+4>>2]=0;c[e+8>>2]=0;g[a+3400>>2]=(7.621731281280518-n)*2.0;g[a+3404>>2]=(1.0693583488464355-n)*2.0;g[a+3408>>2]=(j+-.16840487718582153)/h+1.0693583488464355;e=a+3412|0;c[e+0>>2]=0;c[e+4>>2]=0;c[e+8>>2]=0;g[a+3424>>2]=(53.53615188598633-n)*2.0;e=a+3428|0;c[e>>2]=0;c[e+4>>2]=0;i=d;return}function Ad(a){a=a|0;Na(a|0)|0;Ga()}function Bd(b){b=b|0;var d=0,e=0,f=0,g=0,h=0;b=i;i=i+16|0;d=b;e=c[r>>2]|0;Xd(1976,e,2032);c[316]=3404;c[1272>>2]=3424;c[1268>>2]=0;_e(1272|0,1976);c[1344>>2]=0;c[1348>>2]=-1;f=c[s>>2]|0;c[520]=3272;ck(2084|0);c[2088>>2]=0;c[2092>>2]=0;c[2096>>2]=0;c[2100>>2]=0;c[2104>>2]=0;c[2108>>2]=0;c[520]=2592;c[2112>>2]=f;dk(d,2084|0);g=fk(d,6064)|0;ek(d);c[2116>>2]=g;c[2120>>2]=2040;a[2124|0]=(sc[c[(c[g>>2]|0)+28>>2]&127](g)|0)&1;c[338]=3484;c[1356>>2]=3504;_e(1356|0,2080);c[1428>>2]=0;c[1432>>2]=-1;g=c[q>>2]|0;c[532]=3272;ck(2132|0);c[2136>>2]=0;c[2140>>2]=0;c[2144>>2]=0;c[2148>>2]=0;c[2152>>2]=0;c[2156>>2]=0;c[532]=2592;c[2160>>2]=g;dk(d,2132|0);h=fk(d,6064)|0;ek(d);c[2164>>2]=h;c[2168>>2]=2048;a[2172|0]=(sc[c[(c[h>>2]|0)+28>>2]&127](h)|0)&1;c[360]=3484;c[1444>>2]=3504;_e(1444|0,2128);c[1516>>2]=0;c[1520>>2]=-1;h=c[(c[(c[360]|0)+ -12>>2]|0)+1464>>2]|0;c[382]=3484;c[1532>>2]=3504;_e(1532|0,h);c[1604>>2]=0;c[1608>>2]=-1;c[(c[(c[316]|0)+ -12>>2]|0)+1336>>2]=1352;h=(c[(c[360]|0)+ -12>>2]|0)+1444|0;c[h>>2]=c[h>>2]|8192;c[(c[(c[360]|0)+ -12>>2]|0)+1512>>2]=1352;Jd(2176,e,2056|0);c[404]=3444;c[1624>>2]=3464;c[1620>>2]=0;_e(1624|0,2176);c[1696>>2]=0;c[1700>>2]=-1;c[558]=3336;ck(2236|0);c[2240>>2]=0;c[2244>>2]=0;c[2248>>2]=0;c[2252>>2]=0;c[2256>>2]=0;c[2260>>2]=0;c[558]=2336;c[2264>>2]=f;dk(d,2236|0);f=fk(d,6072)|0;ek(d);c[2268>>2]=f;c[2272>>2]=2064;a[2276|0]=(sc[c[(c[f>>2]|0)+28>>2]&127](f)|0)&1;c[426]=3524;c[1708>>2]=3544;_e(1708|0,2232);c[1780>>2]=0;c[1784>>2]=-1;c[570]=3336;ck(2284|0);c[2288>>2]=0;c[2292>>2]=0;c[2296>>2]=0;c[2300>>2]=0;c[2304>>2]=0;c[2308>>2]=0;c[570]=2336;c[2312>>2]=g;dk(d,2284|0);g=fk(d,6072)|0;ek(d);c[2316>>2]=g;c[2320>>2]=2072;a[2324|0]=(sc[c[(c[g>>2]|0)+28>>2]&127](g)|0)&1;c[448]=3524;c[1796>>2]=3544;_e(1796|0,2280);c[1868>>2]=0;c[1872>>2]=-1;g=c[(c[(c[448]|0)+ -12>>2]|0)+1816>>2]|0;c[470]=3524;c[1884>>2]=3544;_e(1884|0,g);c[1956>>2]=0;c[1960>>2]=-1;c[(c[(c[404]|0)+ -12>>2]|0)+1688>>2]=1704;g=(c[(c[448]|0)+ -12>>2]|0)+1796|0;c[g>>2]=c[g>>2]|8192;c[(c[(c[448]|0)+ -12>>2]|0)+1864>>2]=1704;i=b;return}function Cd(a){a=a|0;a=i;Gf(1352)|0;Gf(1528)|0;Lf(1704)|0;Lf(1880)|0;i=a;return}function Dd(a){a=a|0;var b=0;b=i;c[a>>2]=3336;ek(a+4|0);i=b;return}function Ed(a){a=a|0;var b=0;b=i;c[a>>2]=3336;ek(a+4|0);Ym(a);i=b;return}function Fd(b,d){b=b|0;d=d|0;var e=0,f=0;e=i;sc[c[(c[b>>2]|0)+24>>2]&127](b)|0;f=fk(d,6072)|0;c[b+36>>2]=f;a[b+44|0]=(sc[c[(c[f>>2]|0)+28>>2]&127](f)|0)&1;i=e;return}function Gd(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0;b=i;i=i+16|0;d=b+8|0;e=b;f=a+36|0;g=a+40|0;h=d+8|0;j=d;k=a+32|0;while(1){a=c[f>>2]|0;l=Cc[c[(c[a>>2]|0)+20>>2]&15](a,c[g>>2]|0,d,h,e)|0;a=(c[e>>2]|0)-j|0;if((qb(d|0,1,a|0,c[k>>2]|0)|0)!=(a|0)){m=-1;n=5;break}if((l|0)==2){m=-1;n=5;break}else if((l|0)!=1){n=4;break}}if((n|0)==4){m=((Tb(c[k>>2]|0)|0)!=0)<<31>>31;i=b;return m|0}else if((n|0)==5){i=b;return m|0}return 0}function Hd(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0;f=i;a:do{if((a[b+44|0]|0)==0){if((e|0)>0){g=d;h=0;while(1){if((Bc[c[(c[b>>2]|0)+52>>2]&15](b,c[g>>2]|0)|0)==-1){j=h;break a}k=h+1|0;if((k|0)<(e|0)){g=g+4|0;h=k}else{j=k;break}}}else{j=0}}else{j=qb(d|0,4,e|0,c[b+32>>2]|0)|0}}while(0);i=f;return j|0}function Id(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;e=i;i=i+32|0;f=e+16|0;g=e+8|0;h=e+4|0;j=e;k=(d|0)==-1;a:do{if(!k){c[g>>2]=d;if((a[b+44|0]|0)!=0){if((qb(g|0,4,1,c[b+32>>2]|0)|0)==1){break}else{l=-1}i=e;return l|0}c[h>>2]=f;m=g+4|0;n=b+36|0;o=b+40|0;p=f+8|0;q=f;r=b+32|0;s=g;while(1){t=c[n>>2]|0;u=xc[c[(c[t>>2]|0)+12>>2]&15](t,c[o>>2]|0,s,m,j,f,p,h)|0;if((c[j>>2]|0)==(s|0)){l=-1;v=12;break}if((u|0)==3){v=7;break}t=(u|0)==1;if(!(u>>>0<2)){l=-1;v=12;break}u=(c[h>>2]|0)-q|0;if((qb(f|0,1,u|0,c[r>>2]|0)|0)!=(u|0)){l=-1;v=12;break}if(t){s=t?c[j>>2]|0:s}else{break a}}if((v|0)==7){if((qb(s|0,1,1,c[r>>2]|0)|0)==1){break}else{l=-1}i=e;return l|0}else if((v|0)==12){i=e;return l|0}}}while(0);l=k?0:d;i=e;return l|0}function Jd(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0;f=i;i=i+16|0;g=f;c[b>>2]=3336;h=b+4|0;ck(h);j=b+8|0;c[j+0>>2]=0;c[j+4>>2]=0;c[j+8>>2]=0;c[j+12>>2]=0;c[j+16>>2]=0;c[j+20>>2]=0;c[b>>2]=2448;c[b+32>>2]=d;c[b+40>>2]=e;c[b+48>>2]=-1;a[b+52|0]=0;dk(g,h);h=fk(g,6072)|0;e=b+36|0;c[e>>2]=h;d=b+44|0;c[d>>2]=sc[c[(c[h>>2]|0)+24>>2]&127](h)|0;h=c[e>>2]|0;a[b+53|0]=(sc[c[(c[h>>2]|0)+28>>2]&127](h)|0)&1;if((c[d>>2]|0)>8){pj(2544)}else{ek(g);i=f;return}}function Kd(a){a=a|0;var b=0;b=i;c[a>>2]=3336;ek(a+4|0);i=b;return}function Ld(a){a=a|0;var b=0;b=i;c[a>>2]=3336;ek(a+4|0);Ym(a);i=b;return}function Md(b,d){b=b|0;d=d|0;var e=0,f=0,g=0;e=i;f=fk(d,6072)|0;d=b+36|0;c[d>>2]=f;g=b+44|0;c[g>>2]=sc[c[(c[f>>2]|0)+24>>2]&127](f)|0;f=c[d>>2]|0;a[b+53|0]=(sc[c[(c[f>>2]|0)+28>>2]&127](f)|0)&1;if((c[g>>2]|0)>8){pj(2544)}else{i=e;return}}function Nd(a){a=a|0;var b=0,c=0;b=i;c=Qd(a,0)|0;i=b;return c|0}function Od(a){a=a|0;var b=0,c=0;b=i;c=Qd(a,1)|0;i=b;return c|0}function Pd(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;e=i;i=i+32|0;f=e+16|0;g=e+8|0;h=e+4|0;j=e;k=b+52|0;l=(a[k]|0)!=0;if((d|0)==-1){if(l){m=-1;i=e;return m|0}n=c[b+48>>2]|0;a[k]=(n|0)!=-1|0;m=n;i=e;return m|0}n=b+48|0;a:do{if(l){c[h>>2]=c[n>>2];o=c[b+36>>2]|0;p=xc[c[(c[o>>2]|0)+12>>2]&15](o,c[b+40>>2]|0,h,h+4|0,j,f,f+8|0,g)|0;if((p|0)==1|(p|0)==2){m=-1;i=e;return m|0}else if((p|0)==3){a[f]=c[n>>2];c[g>>2]=f+1}p=b+32|0;while(1){o=c[g>>2]|0;if(!(o>>>0>f>>>0)){break a}q=o+ -1|0;c[g>>2]=q;if((Sb(a[q]|0,c[p>>2]|0)|0)==-1){m=-1;break}}i=e;return m|0}}while(0);c[n>>2]=d;a[k]=1;m=d;i=e;return m|0}function Qd(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0;e=i;i=i+32|0;f=e+16|0;g=e+8|0;h=e+4|0;j=e;k=b+52|0;if((a[k]|0)!=0){l=b+48|0;m=c[l>>2]|0;if(!d){n=m;i=e;return n|0}c[l>>2]=-1;a[k]=0;n=m;i=e;return n|0}m=c[b+44>>2]|0;k=(m|0)>1?m:1;a:do{if((k|0)>0){m=b+32|0;l=0;while(1){o=Lb(c[m>>2]|0)|0;if((o|0)==-1){n=-1;break}a[f+l|0]=o;l=l+1|0;if((l|0)>=(k|0)){break a}}i=e;return n|0}}while(0);b:do{if((a[b+53|0]|0)==0){l=b+40|0;m=b+36|0;o=g+4|0;p=b+32|0;q=k;while(1){r=c[l>>2]|0;s=r;t=c[s>>2]|0;u=c[s+4>>2]|0;s=c[m>>2]|0;v=f+q|0;w=xc[c[(c[s>>2]|0)+16>>2]&15](s,r,f,v,h,g,o,j)|0;if((w|0)==2){n=-1;x=22;break}else if((w|0)==3){x=14;break}else if((w|0)!=1){y=q;break b}w=c[l>>2]|0;c[w>>2]=t;c[w+4>>2]=u;if((q|0)==8){n=-1;x=22;break}u=Lb(c[p>>2]|0)|0;if((u|0)==-1){n=-1;x=22;break}a[v]=u;q=q+1|0}if((x|0)==14){c[g>>2]=a[f]|0;y=q;break}else if((x|0)==22){i=e;return n|0}}else{c[g>>2]=a[f]|0;y=k}}while(0);if(d){d=c[g>>2]|0;c[b+48>>2]=d;n=d;i=e;return n|0}d=b+32|0;b=y;while(1){if((b|0)<=0){break}y=b+ -1|0;if((Sb(a[f+y|0]|0,c[d>>2]|0)|0)==-1){n=-1;x=22;break}else{b=y}}if((x|0)==22){i=e;return n|0}n=c[g>>2]|0;i=e;return n|0}function Rd(a){a=a|0;var b=0;b=i;c[a>>2]=3272;ek(a+4|0);i=b;return}function Sd(a){a=a|0;var b=0;b=i;c[a>>2]=3272;ek(a+4|0);Ym(a);i=b;return}function Td(b,d){b=b|0;d=d|0;var e=0,f=0;e=i;sc[c[(c[b>>2]|0)+24>>2]&127](b)|0;f=fk(d,6064)|0;c[b+36>>2]=f;a[b+44|0]=(sc[c[(c[f>>2]|0)+28>>2]&127](f)|0)&1;i=e;return}function Ud(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0;b=i;i=i+16|0;d=b+8|0;e=b;f=a+36|0;g=a+40|0;h=d+8|0;j=d;k=a+32|0;while(1){a=c[f>>2]|0;l=Cc[c[(c[a>>2]|0)+20>>2]&15](a,c[g>>2]|0,d,h,e)|0;a=(c[e>>2]|0)-j|0;if((qb(d|0,1,a|0,c[k>>2]|0)|0)!=(a|0)){m=-1;n=5;break}if((l|0)==2){m=-1;n=5;break}else if((l|0)!=1){n=4;break}}if((n|0)==4){m=((Tb(c[k>>2]|0)|0)!=0)<<31>>31;i=b;return m|0}else if((n|0)==5){i=b;return m|0}return 0}function Vd(b,e,f){b=b|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0;g=i;if((a[b+44|0]|0)!=0){h=qb(e|0,1,f|0,c[b+32>>2]|0)|0;i=g;return h|0}if((f|0)>0){j=e;k=0}else{h=0;i=g;return h|0}while(1){if((Bc[c[(c[b>>2]|0)+52>>2]&15](b,d[j]|0)|0)==-1){h=k;l=6;break}e=k+1|0;if((e|0)<(f|0)){j=j+1|0;k=e}else{h=e;l=6;break}}if((l|0)==6){i=g;return h|0}return 0}function Wd(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;e=i;i=i+32|0;f=e+16|0;g=e+8|0;h=e+4|0;j=e;k=(d|0)==-1;a:do{if(!k){a[g]=d;if((a[b+44|0]|0)!=0){if((qb(g|0,1,1,c[b+32>>2]|0)|0)==1){break}else{l=-1}i=e;return l|0}c[h>>2]=f;m=g+1|0;n=b+36|0;o=b+40|0;p=f+8|0;q=f;r=b+32|0;s=g;while(1){t=c[n>>2]|0;u=xc[c[(c[t>>2]|0)+12>>2]&15](t,c[o>>2]|0,s,m,j,f,p,h)|0;if((c[j>>2]|0)==(s|0)){l=-1;v=12;break}if((u|0)==3){v=7;break}t=(u|0)==1;if(!(u>>>0<2)){l=-1;v=12;break}u=(c[h>>2]|0)-q|0;if((qb(f|0,1,u|0,c[r>>2]|0)|0)!=(u|0)){l=-1;v=12;break}if(t){s=t?c[j>>2]|0:s}else{break a}}if((v|0)==7){if((qb(s|0,1,1,c[r>>2]|0)|0)==1){break}else{l=-1}i=e;return l|0}else if((v|0)==12){i=e;return l|0}}}while(0);l=k?0:d;i=e;return l|0}function Xd(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0;f=i;i=i+16|0;g=f;c[b>>2]=3272;h=b+4|0;ck(h);j=b+8|0;c[j+0>>2]=0;c[j+4>>2]=0;c[j+8>>2]=0;c[j+12>>2]=0;c[j+16>>2]=0;c[j+20>>2]=0;c[b>>2]=2704;c[b+32>>2]=d;c[b+40>>2]=e;c[b+48>>2]=-1;a[b+52|0]=0;dk(g,h);h=fk(g,6064)|0;e=b+36|0;c[e>>2]=h;d=b+44|0;c[d>>2]=sc[c[(c[h>>2]|0)+24>>2]&127](h)|0;h=c[e>>2]|0;a[b+53|0]=(sc[c[(c[h>>2]|0)+28>>2]&127](h)|0)&1;if((c[d>>2]|0)>8){pj(2544)}else{ek(g);i=f;return}}function Yd(a){a=a|0;var b=0;b=i;c[a>>2]=3272;ek(a+4|0);i=b;return}function Zd(a){a=a|0;var b=0;b=i;c[a>>2]=3272;ek(a+4|0);Ym(a);i=b;return}function _d(b,d){b=b|0;d=d|0;var e=0,f=0,g=0;e=i;f=fk(d,6064)|0;d=b+36|0;c[d>>2]=f;g=b+44|0;c[g>>2]=sc[c[(c[f>>2]|0)+24>>2]&127](f)|0;f=c[d>>2]|0;a[b+53|0]=(sc[c[(c[f>>2]|0)+28>>2]&127](f)|0)&1;if((c[g>>2]|0)>8){pj(2544)}else{i=e;return}}function $d(a){a=a|0;var b=0,c=0;b=i;c=ce(a,0)|0;i=b;return c|0}function ae(a){a=a|0;var b=0,c=0;b=i;c=ce(a,1)|0;i=b;return c|0}function be(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;e=i;i=i+32|0;f=e+16|0;g=e+4|0;h=e+8|0;j=e;k=b+52|0;l=(a[k]|0)!=0;if((d|0)==-1){if(l){m=-1;i=e;return m|0}n=c[b+48>>2]|0;a[k]=(n|0)!=-1|0;m=n;i=e;return m|0}n=b+48|0;a:do{if(l){a[h]=c[n>>2];o=c[b+36>>2]|0;p=xc[c[(c[o>>2]|0)+12>>2]&15](o,c[b+40>>2]|0,h,h+1|0,j,f,f+8|0,g)|0;if((p|0)==3){a[f]=c[n>>2];c[g>>2]=f+1}else if((p|0)==1|(p|0)==2){m=-1;i=e;return m|0}p=b+32|0;while(1){o=c[g>>2]|0;if(!(o>>>0>f>>>0)){break a}q=o+ -1|0;c[g>>2]=q;if((Sb(a[q]|0,c[p>>2]|0)|0)==-1){m=-1;break}}i=e;return m|0}}while(0);c[n>>2]=d;a[k]=1;m=d;i=e;return m|0}function ce(b,e){b=b|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0;f=i;i=i+32|0;g=f+16|0;h=f+8|0;j=f+4|0;k=f;l=b+52|0;if((a[l]|0)!=0){m=b+48|0;n=c[m>>2]|0;if(!e){o=n;i=f;return o|0}c[m>>2]=-1;a[l]=0;o=n;i=f;return o|0}n=c[b+44>>2]|0;l=(n|0)>1?n:1;a:do{if((l|0)>0){n=b+32|0;m=0;while(1){p=Lb(c[n>>2]|0)|0;if((p|0)==-1){o=-1;break}a[g+m|0]=p;m=m+1|0;if((m|0)>=(l|0)){break a}}i=f;return o|0}}while(0);b:do{if((a[b+53|0]|0)==0){m=b+40|0;n=b+36|0;p=h+1|0;q=b+32|0;r=l;while(1){s=c[m>>2]|0;t=s;u=c[t>>2]|0;v=c[t+4>>2]|0;t=c[n>>2]|0;w=g+r|0;x=xc[c[(c[t>>2]|0)+16>>2]&15](t,s,g,w,j,h,p,k)|0;if((x|0)==2){o=-1;y=23;break}else if((x|0)==3){y=14;break}else if((x|0)!=1){z=r;break b}x=c[m>>2]|0;c[x>>2]=u;c[x+4>>2]=v;if((r|0)==8){o=-1;y=23;break}v=Lb(c[q>>2]|0)|0;if((v|0)==-1){o=-1;y=23;break}a[w]=v;r=r+1|0}if((y|0)==14){a[h]=a[g]|0;z=r;break}else if((y|0)==23){i=f;return o|0}}else{a[h]=a[g]|0;z=l}}while(0);do{if(!e){l=b+32|0;k=z;while(1){if((k|0)<=0){y=21;break}j=k+ -1|0;if((Sb(d[g+j|0]|0,c[l>>2]|0)|0)==-1){o=-1;y=23;break}else{k=j}}if((y|0)==21){A=a[h]|0;break}else if((y|0)==23){i=f;return o|0}}else{k=a[h]|0;c[b+48>>2]=k&255;A=k}}while(0);o=A&255;i=f;return o|0}function de(){var a=0;a=i;Bd(0);ic(116,1968,p|0)|0;i=a;return}function ee(a){a=a|0;return}function fe(a){a=a|0;var b=0;b=a+4|0;c[b>>2]=(c[b>>2]|0)+1;return}function ge(a){a=a|0;var b=0,d=0,e=0,f=0;b=i;d=a+4|0;e=c[d>>2]|0;c[d>>2]=e+ -1;if((e|0)!=0){f=0;i=b;return f|0}pc[c[(c[a>>2]|0)+8>>2]&255](a);f=1;i=b;return f|0}function he(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0;d=i;c[a>>2]=2848;e=qn(b|0)|0;f=Xm(e+13|0)|0;c[f+4>>2]=e;c[f>>2]=e;g=f+12|0;c[a+4>>2]=g;c[f+8>>2]=0;sn(g|0,b|0,e+1|0)|0;i=d;return}function ie(a){a=a|0;var b=0,d=0,e=0,f=0;b=i;c[a>>2]=2848;d=a+4|0;e=(c[d>>2]|0)+ -4|0;f=c[e>>2]|0;c[e>>2]=f+ -1;if((f+ -1|0)<0){Zm((c[d>>2]|0)+ -12|0)}Xa(a|0);Ym(a);i=b;return}function je(a){a=a|0;var b=0,d=0,e=0,f=0;b=i;c[a>>2]=2848;d=a+4|0;e=(c[d>>2]|0)+ -4|0;f=c[e>>2]|0;c[e>>2]=f+ -1;if((f+ -1|0)>=0){Xa(a|0);i=b;return}Zm((c[d>>2]|0)+ -12|0);Xa(a|0);i=b;return}function ke(a){a=a|0;return c[a+4>>2]|0}function le(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0;e=i;c[b>>2]=2872;if((a[d]&1)==0){f=d+1|0}else{f=c[d+8>>2]|0}d=qn(f|0)|0;g=Xm(d+13|0)|0;c[g+4>>2]=d;c[g>>2]=d;h=g+12|0;c[b+4>>2]=h;c[g+8>>2]=0;sn(h|0,f|0,d+1|0)|0;i=e;return}function me(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0;d=i;c[a>>2]=2872;e=qn(b|0)|0;f=Xm(e+13|0)|0;c[f+4>>2]=e;c[f>>2]=e;g=f+12|0;c[a+4>>2]=g;c[f+8>>2]=0;sn(g|0,b|0,e+1|0)|0;i=d;return}function ne(a){a=a|0;var b=0,d=0,e=0,f=0;b=i;c[a>>2]=2872;d=a+4|0;e=(c[d>>2]|0)+ -4|0;f=c[e>>2]|0;c[e>>2]=f+ -1;if((f+ -1|0)<0){Zm((c[d>>2]|0)+ -12|0)}Xa(a|0);Ym(a);i=b;return}function oe(a){a=a|0;var b=0,d=0,e=0,f=0;b=i;c[a>>2]=2872;d=a+4|0;e=(c[d>>2]|0)+ -4|0;f=c[e>>2]|0;c[e>>2]=f+ -1;if((f+ -1|0)>=0){Xa(a|0);i=b;return}Zm((c[d>>2]|0)+ -12|0);Xa(a|0);i=b;return}function pe(a){a=a|0;return c[a+4>>2]|0}function qe(a){a=a|0;var b=0,d=0,e=0,f=0;b=i;c[a>>2]=2848;d=a+4|0;e=(c[d>>2]|0)+ -4|0;f=c[e>>2]|0;c[e>>2]=f+ -1;if((f+ -1|0)<0){Zm((c[d>>2]|0)+ -12|0)}Xa(a|0);Ym(a);i=b;return}function re(a){a=a|0;return}function se(a,b,d){a=a|0;b=b|0;d=d|0;c[a>>2]=d;c[a+4>>2]=b;return}function te(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0;e=i;i=i+16|0;f=e;uc[c[(c[a>>2]|0)+12>>2]&7](f,a,b);if((c[f+4>>2]|0)!=(c[d+4>>2]|0)){g=0;i=e;return g|0}g=(c[f>>2]|0)==(c[d>>2]|0);i=e;return g|0}function ue(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0;e=i;if((c[b+4>>2]|0)!=(a|0)){f=0;i=e;return f|0}f=(c[b>>2]|0)==(d|0);i=e;return f|0}function ve(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0;d=i;f=gc(e|0)|0;e=qn(f|0)|0;if(e>>>0>4294967279){Be(0)}if(e>>>0<11){a[b]=e<<1;g=b+1|0;sn(g|0,f|0,e|0)|0;h=g+e|0;a[h]=0;i=d;return}else{j=e+16&-16;k=Wm(j)|0;c[b+8>>2]=k;c[b>>2]=j|1;c[b+4>>2]=e;g=k;sn(g|0,f|0,e|0)|0;h=g+e|0;a[h]=0;i=d;return}}function we(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0;f=i;i=i+16|0;g=f;h=c[d>>2]|0;if((h|0)!=0){j=a[e]|0;if((j&1)==0){k=(j&255)>>>1}else{k=c[e+4>>2]|0}if((k|0)==0){l=h}else{Le(e,3024,2)|0;l=c[d>>2]|0}h=c[d+4>>2]|0;uc[c[(c[h>>2]|0)+24>>2]&7](g,h,l);l=a[g]|0;if((l&1)==0){m=g+1|0;n=(l&255)>>>1}else{m=c[g+8>>2]|0;n=c[g+4>>2]|0}Le(e,m,n)|0;if(!((a[g]&1)==0)){Ym(c[g+8>>2]|0)}}c[b+0>>2]=c[e+0>>2];c[b+4>>2]=c[e+4>>2];c[b+8>>2]=c[e+8>>2];c[e+0>>2]=0;c[e+4>>2]=0;c[e+8>>2]=0;i=f;return}function xe(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0;f=i;i=i+32|0;g=f+12|0;h=f;j=qn(e|0)|0;if(j>>>0>4294967279){Be(0)}if(j>>>0<11){a[h]=j<<1;k=h+1|0}else{l=j+16&-16;m=Wm(l)|0;c[h+8>>2]=m;c[h>>2]=l|1;c[h+4>>2]=j;k=m}sn(k|0,e|0,j|0)|0;a[k+j|0]=0;we(g,d,h);le(b,g);if(!((a[g]&1)==0)){Ym(c[g+8>>2]|0)}if(!((a[h]&1)==0)){Ym(c[h+8>>2]|0)}c[b>>2]=3040;h=d;d=c[h+4>>2]|0;g=b+8|0;c[g>>2]=c[h>>2];c[g+4>>2]=d;i=f;return}function ye(a){a=a|0;var b=0;b=i;oe(a);Ym(a);i=b;return}function ze(a){a=a|0;var b=0;b=i;oe(a);i=b;return}function Ae(a,b,d){a=a|0;b=b|0;d=d|0;var e=0;e=i;sb(3176)|0;if((c[a>>2]|0)==1){do{Qb(3200,3176)|0}while((c[a>>2]|0)==1)}if((c[a>>2]|0)==0){c[a>>2]=1;$b(3176)|0;pc[d&255](b);sb(3176)|0;c[a>>2]=-1;$b(3176)|0;Jb(3200)|0;i=e;return}else{$b(3176)|0;i=e;return}}function Be(a){a=a|0;a=xb(8)|0;he(a,3248);c[a>>2]=2928;ec(a|0,2968,14)}function Ce(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0;e=i;if((a[d]&1)==0){c[b+0>>2]=c[d+0>>2];c[b+4>>2]=c[d+4>>2];c[b+8>>2]=c[d+8>>2];i=e;return}f=c[d+8>>2]|0;g=c[d+4>>2]|0;if(g>>>0>4294967279){Be(0)}if(g>>>0<11){a[b]=g<<1;h=b+1|0}else{d=g+16&-16;j=Wm(d)|0;c[b+8>>2]=j;c[b>>2]=d|1;c[b+4>>2]=g;h=j}sn(h|0,f|0,g|0)|0;a[h+g|0]=0;i=e;return}function De(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0;f=i;if(e>>>0>4294967279){Be(0)}if(e>>>0<11){a[b]=e<<1;g=b+1|0}else{h=e+16&-16;j=Wm(h)|0;c[b+8>>2]=j;c[b>>2]=h|1;c[b+4>>2]=e;g=j}sn(g|0,d|0,e|0)|0;a[g+e|0]=0;i=f;return}function Ee(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0;f=i;if(d>>>0>4294967279){Be(0)}if(d>>>0<11){a[b]=d<<1;g=b+1|0}else{h=d+16&-16;j=Wm(h)|0;c[b+8>>2]=j;c[b>>2]=h|1;c[b+4>>2]=d;g=j}rn(g|0,e|0,d|0)|0;a[g+d|0]=0;i=f;return}function Fe(b){b=b|0;var d=0;d=i;if((a[b]&1)==0){i=d;return}Ym(c[b+8>>2]|0);i=d;return}function Ge(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0;e=i;f=qn(d|0)|0;g=a[b]|0;if((g&1)==0){h=g;j=10}else{g=c[b>>2]|0;h=g&255;j=(g&-2)+ -1|0}g=(h&1)==0;if(j>>>0<f>>>0){if(g){k=(h&255)>>>1}else{k=c[b+4>>2]|0}Me(b,j,f-j|0,k,0,k,f,d);i=e;return b|0}if(g){l=b+1|0}else{l=c[b+8>>2]|0}un(l|0,d|0,f|0)|0;a[l+f|0]=0;if((a[b]&1)==0){a[b]=f<<1;i=e;return b|0}else{c[b+4>>2]=f;i=e;return b|0}return 0}function He(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0;f=i;g=a[b]|0;h=(g&1)==0;if(h){j=(g&255)>>>1}else{j=c[b+4>>2]|0}if(j>>>0<d>>>0){Ie(b,d-j|0,e)|0;i=f;return}if(h){a[b+d+1|0]=0;a[b]=d<<1;i=f;return}else{a[(c[b+8>>2]|0)+d|0]=0;c[b+4>>2]=d;i=f;return}}function Ie(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0;f=i;if((d|0)==0){i=f;return b|0}g=a[b]|0;if((g&1)==0){h=10;j=g}else{g=c[b>>2]|0;h=(g&-2)+ -1|0;j=g&255}if((j&1)==0){k=(j&255)>>>1}else{k=c[b+4>>2]|0}if((h-k|0)>>>0<d>>>0){Ne(b,h,d-h+k|0,k,k,0,0);l=a[b]|0}else{l=j}if((l&1)==0){m=b+1|0}else{m=c[b+8>>2]|0}rn(m+k|0,e|0,d|0)|0;e=k+d|0;if((a[b]&1)==0){a[b]=e<<1}else{c[b+4>>2]=e}a[m+e|0]=0;i=f;return b|0}function Je(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;e=i;if(d>>>0>4294967279){Be(0)}f=a[b]|0;if((f&1)==0){g=10;h=f}else{f=c[b>>2]|0;g=(f&-2)+ -1|0;h=f&255}if((h&1)==0){j=(h&255)>>>1}else{j=c[b+4>>2]|0}f=j>>>0>d>>>0?j:d;if(f>>>0<11){k=10}else{k=(f+16&-16)+ -1|0}if((k|0)==(g|0)){i=e;return}do{if((k|0)!=10){f=k+1|0;if(k>>>0>g>>>0){l=Wm(f)|0}else{l=Wm(f)|0}if((h&1)==0){m=l;n=1;o=b+1|0;p=0;break}else{m=l;n=1;o=c[b+8>>2]|0;p=1;break}}else{m=b+1|0;n=0;o=c[b+8>>2]|0;p=1}}while(0);if((h&1)==0){q=(h&255)>>>1}else{q=c[b+4>>2]|0}sn(m|0,o|0,q+1|0)|0;if(p){Ym(o)}if(n){c[b>>2]=k+1|1;c[b+4>>2]=j;c[b+8>>2]=m;i=e;return}else{a[b]=j<<1;i=e;return}}function Ke(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;e=i;f=a[b]|0;g=(f&1)!=0;if(g){h=(c[b>>2]&-2)+ -1|0;j=c[b+4>>2]|0}else{h=10;j=(f&255)>>>1}if((j|0)==(h|0)){Ne(b,h,1,h,h,0,0);if((a[b]&1)==0){k=7}else{k=8}}else{if(g){k=8}else{k=7}}if((k|0)==7){a[b]=(j<<1)+2;l=b+1|0;m=j+1|0;n=l+j|0;a[n]=d;o=l+m|0;a[o]=0;i=e;return}else if((k|0)==8){k=c[b+8>>2]|0;g=j+1|0;c[b+4>>2]=g;l=k;m=g;n=l+j|0;a[n]=d;o=l+m|0;a[o]=0;i=e;return}}function Le(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0;f=i;g=a[b]|0;if((g&1)==0){h=10;j=g}else{g=c[b>>2]|0;h=(g&-2)+ -1|0;j=g&255}if((j&1)==0){k=(j&255)>>>1}else{k=c[b+4>>2]|0}if((h-k|0)>>>0<e>>>0){Me(b,h,e-h+k|0,k,k,0,e,d);i=f;return b|0}if((e|0)==0){i=f;return b|0}if((j&1)==0){l=b+1|0}else{l=c[b+8>>2]|0}sn(l+k|0,d|0,e|0)|0;d=k+e|0;if((a[b]&1)==0){a[b]=d<<1}else{c[b+4>>2]=d}a[l+d|0]=0;i=f;return b|0}function Me(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0;l=i;if((-18-d|0)>>>0<e>>>0){Be(0)}if((a[b]&1)==0){m=b+1|0}else{m=c[b+8>>2]|0}if(d>>>0<2147483623){n=e+d|0;e=d<<1;o=n>>>0<e>>>0?e:n;if(o>>>0<11){p=11}else{p=o+16&-16}}else{p=-17}o=Wm(p)|0;if((g|0)!=0){sn(o|0,m|0,g|0)|0}if((j|0)!=0){sn(o+g|0,k|0,j|0)|0}k=f-h|0;if((k|0)!=(g|0)){sn(o+(j+g)|0,m+(h+g)|0,k-g|0)|0}if((d|0)==10){q=b+8|0;c[q>>2]=o;r=p|1;c[b>>2]=r;s=k+j|0;t=b+4|0;c[t>>2]=s;u=o+s|0;a[u]=0;i=l;return}Ym(m);q=b+8|0;c[q>>2]=o;r=p|1;c[b>>2]=r;s=k+j|0;t=b+4|0;c[t>>2]=s;u=o+s|0;a[u]=0;i=l;return}function Ne(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0;k=i;if((-17-d|0)>>>0<e>>>0){Be(0)}if((a[b]&1)==0){l=b+1|0}else{l=c[b+8>>2]|0}if(d>>>0<2147483623){m=e+d|0;e=d<<1;n=m>>>0<e>>>0?e:m;if(n>>>0<11){o=11}else{o=n+16&-16}}else{o=-17}n=Wm(o)|0;if((g|0)!=0){sn(n|0,l|0,g|0)|0}m=f-h|0;if((m|0)!=(g|0)){sn(n+(j+g)|0,l+(h+g)|0,m-g|0)|0}if((d|0)==10){p=b+8|0;c[p>>2]=n;q=o|1;c[b>>2]=q;i=k;return}Ym(l);p=b+8|0;c[p>>2]=n;q=o|1;c[b>>2]=q;i=k;return}function Oe(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0;f=i;if(e>>>0>1073741807){Be(0)}if(e>>>0<2){a[b]=e<<1;g=b+4|0}else{h=e+4&-4;j=Wm(h<<2)|0;c[b+8>>2]=j;c[b>>2]=h|1;c[b+4>>2]=e;g=j}sm(g,d,e)|0;c[g+(e<<2)>>2]=0;i=f;return}function Pe(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0;f=i;if(d>>>0>1073741807){Be(0)}if(d>>>0<2){a[b]=d<<1;g=b+4|0}else{h=d+4&-4;j=Wm(h<<2)|0;c[b+8>>2]=j;c[b>>2]=h|1;c[b+4>>2]=d;g=j}um(g,e,d)|0;c[g+(d<<2)>>2]=0;i=f;return}function Qe(b){b=b|0;var d=0;d=i;if((a[b]&1)==0){i=d;return}Ym(c[b+8>>2]|0);i=d;return}function Re(a,b){a=a|0;b=b|0;var c=0,d=0;c=i;d=Se(a,b,rm(b)|0)|0;i=c;return d|0}function Se(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0;f=i;g=a[b]|0;if((g&1)==0){h=1;j=g}else{g=c[b>>2]|0;h=(g&-2)+ -1|0;j=g&255}g=(j&1)==0;if(h>>>0<e>>>0){if(g){k=(j&255)>>>1}else{k=c[b+4>>2]|0}Ve(b,h,e-h|0,k,0,k,e,d);i=f;return b|0}if(g){l=b+4|0}else{l=c[b+8>>2]|0}tm(l,d,e)|0;c[l+(e<<2)>>2]=0;if((a[b]&1)==0){a[b]=e<<1;i=f;return b|0}else{c[b+4>>2]=e;i=f;return b|0}return 0}function Te(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;e=i;if(d>>>0>1073741807){Be(0)}f=a[b]|0;if((f&1)==0){g=1;h=f}else{f=c[b>>2]|0;g=(f&-2)+ -1|0;h=f&255}if((h&1)==0){j=(h&255)>>>1}else{j=c[b+4>>2]|0}f=j>>>0>d>>>0?j:d;if(f>>>0<2){k=1}else{k=(f+4&-4)+ -1|0}if((k|0)==(g|0)){i=e;return}do{if((k|0)!=1){f=(k<<2)+4|0;if(k>>>0>g>>>0){l=Wm(f)|0}else{l=Wm(f)|0}if((h&1)==0){m=l;n=1;o=b+4|0;p=0;break}else{m=l;n=1;o=c[b+8>>2]|0;p=1;break}}else{m=b+4|0;n=0;o=c[b+8>>2]|0;p=1}}while(0);if((h&1)==0){q=(h&255)>>>1}else{q=c[b+4>>2]|0}sm(m,o,q+1|0)|0;if(p){Ym(o)}if(n){c[b>>2]=k+1|1;c[b+4>>2]=j;c[b+8>>2]=m;i=e;return}else{a[b]=j<<1;i=e;return}}function Ue(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;e=i;f=a[b]|0;g=(f&1)!=0;if(g){h=(c[b>>2]&-2)+ -1|0;j=c[b+4>>2]|0}else{h=1;j=(f&255)>>>1}if((j|0)==(h|0)){We(b,h,1,h,h,0,0);if((a[b]&1)==0){k=7}else{k=8}}else{if(g){k=8}else{k=7}}if((k|0)==7){a[b]=(j<<1)+2;l=b+4|0;m=j+1|0;n=l+(j<<2)|0;c[n>>2]=d;o=l+(m<<2)|0;c[o>>2]=0;i=e;return}else if((k|0)==8){k=c[b+8>>2]|0;g=j+1|0;c[b+4>>2]=g;l=k;m=g;n=l+(j<<2)|0;c[n>>2]=d;o=l+(m<<2)|0;c[o>>2]=0;i=e;return}}function Ve(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0;l=i;if((1073741806-d|0)>>>0<e>>>0){Be(0)}if((a[b]&1)==0){m=b+4|0}else{m=c[b+8>>2]|0}if(d>>>0<536870887){n=e+d|0;e=d<<1;o=n>>>0<e>>>0?e:n;if(o>>>0<2){p=2}else{p=o+4&-4}}else{p=1073741807}o=Wm(p<<2)|0;if((g|0)!=0){sm(o,m,g)|0}if((j|0)!=0){sm(o+(g<<2)|0,k,j)|0}k=f-h|0;if((k|0)!=(g|0)){sm(o+(j+g<<2)|0,m+(h+g<<2)|0,k-g|0)|0}if((d|0)==1){q=b+8|0;c[q>>2]=o;r=p|1;c[b>>2]=r;s=k+j|0;t=b+4|0;c[t>>2]=s;u=o+(s<<2)|0;c[u>>2]=0;i=l;return}Ym(m);q=b+8|0;c[q>>2]=o;r=p|1;c[b>>2]=r;s=k+j|0;t=b+4|0;c[t>>2]=s;u=o+(s<<2)|0;c[u>>2]=0;i=l;return}function We(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0;k=i;if((1073741807-d|0)>>>0<e>>>0){Be(0)}if((a[b]&1)==0){l=b+4|0}else{l=c[b+8>>2]|0}if(d>>>0<536870887){m=e+d|0;e=d<<1;n=m>>>0<e>>>0?e:m;if(n>>>0<2){o=2}else{o=n+4&-4}}else{o=1073741807}n=Wm(o<<2)|0;if((g|0)!=0){sm(n,l,g)|0}m=f-h|0;if((m|0)!=(g|0)){sm(n+(j+g<<2)|0,l+(h+g<<2)|0,m-g|0)|0}if((d|0)==1){p=b+8|0;c[p>>2]=n;q=o|1;c[b>>2]=q;i=k;return}Ym(l);p=b+8|0;c[p>>2]=n;q=o|1;c[b>>2]=q;i=k;return}function Xe(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0;e=i;i=i+16|0;f=e+8|0;g=e;h=(c[b+24>>2]|0)==0;if(h){c[b+16>>2]=d|1}else{c[b+16>>2]=d}if(((h&1|d)&c[b+20>>2]|0)==0){i=e;return}e=xb(16)|0;if((a[3616]|0)==0?(Ha(3616)|0)!=0:0){c[902]=4312;ic(45,3608,p|0)|0;db(3616)}b=g;c[b>>2]=1;c[b+4>>2]=3608;c[f+0>>2]=c[g+0>>2];c[f+4>>2]=c[g+4>>2];xe(e,f,3664);c[e>>2]=3632;ec(e|0,3712,41)}function Ye(a){a=a|0;var b=0,d=0,e=0,f=0,g=0;b=i;c[a>>2]=3656;d=c[a+40>>2]|0;e=a+32|0;f=a+36|0;if((d|0)!=0){g=d;do{g=g+ -1|0;uc[c[(c[e>>2]|0)+(g<<2)>>2]&7](0,a,c[(c[f>>2]|0)+(g<<2)>>2]|0)}while((g|0)!=0)}ek(a+28|0);Sm(c[e>>2]|0);Sm(c[f>>2]|0);Sm(c[a+48>>2]|0);Sm(c[a+60>>2]|0);i=b;return}function Ze(a,b){a=a|0;b=b|0;var c=0;c=i;dk(a,b+28|0);i=c;return}function _e(a,b){a=a|0;b=b|0;var d=0,e=0;d=i;c[a+24>>2]=b;c[a+16>>2]=(b|0)==0;c[a+20>>2]=0;c[a+4>>2]=4098;c[a+12>>2]=0;c[a+8>>2]=6;b=a+28|0;e=a+32|0;a=e+40|0;do{c[e>>2]=0;e=e+4|0}while((e|0)<(a|0));ck(b);i=d;return}function $e(a){a=a|0;var b=0;b=i;c[a>>2]=3272;ek(a+4|0);Ym(a);i=b;return}function af(a){a=a|0;var b=0;b=i;c[a>>2]=3272;ek(a+4|0);i=b;return}function bf(a,b){a=a|0;b=b|0;return}function cf(a,b,c){a=a|0;b=b|0;c=c|0;return a|0}function df(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;g=a;c[g>>2]=0;c[g+4>>2]=0;g=a+8|0;c[g>>2]=-1;c[g+4>>2]=-1;return}function ef(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;e=a;c[e>>2]=0;c[e+4>>2]=0;e=a+8|0;c[e>>2]=-1;c[e+4>>2]=-1;return}function ff(a){a=a|0;return 0}function gf(a){a=a|0;return 0}function hf(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0;f=i;if((e|0)<=0){g=0;i=f;return g|0}h=b+12|0;j=b+16|0;k=d;d=0;while(1){l=c[h>>2]|0;if(l>>>0<(c[j>>2]|0)>>>0){c[h>>2]=l+1;m=a[l]|0}else{l=sc[c[(c[b>>2]|0)+40>>2]&127](b)|0;if((l|0)==-1){g=d;n=8;break}m=l&255}a[k]=m;l=d+1|0;if((l|0)<(e|0)){k=k+1|0;d=l}else{g=l;n=8;break}}if((n|0)==8){i=f;return g|0}return 0}function jf(a){a=a|0;return-1}function kf(a){a=a|0;var b=0,e=0,f=0;b=i;if((sc[c[(c[a>>2]|0)+36>>2]&127](a)|0)==-1){e=-1;i=b;return e|0}f=a+12|0;a=c[f>>2]|0;c[f>>2]=a+1;e=d[a]|0;i=b;return e|0}function lf(a,b){a=a|0;b=b|0;return-1}function mf(b,e,f){b=b|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;g=i;if((f|0)<=0){h=0;i=g;return h|0}j=b+24|0;k=b+28|0;l=e;e=0;while(1){m=c[j>>2]|0;if(!(m>>>0<(c[k>>2]|0)>>>0)){if((Bc[c[(c[b>>2]|0)+52>>2]&15](b,d[l]|0)|0)==-1){h=e;n=7;break}}else{o=a[l]|0;c[j>>2]=m+1;a[m]=o}o=e+1|0;if((o|0)<(f|0)){l=l+1|0;e=o}else{h=o;n=7;break}}if((n|0)==7){i=g;return h|0}return 0}function nf(a,b){a=a|0;b=b|0;return-1}function of(a){a=a|0;var b=0;b=i;c[a>>2]=3336;ek(a+4|0);Ym(a);i=b;return}function pf(a){a=a|0;var b=0;b=i;c[a>>2]=3336;ek(a+4|0);i=b;return}function qf(a,b){a=a|0;b=b|0;return}function rf(a,b,c){a=a|0;b=b|0;c=c|0;return a|0}function sf(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;g=a;c[g>>2]=0;c[g+4>>2]=0;g=a+8|0;c[g>>2]=-1;c[g+4>>2]=-1;return}function tf(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;e=a;c[e>>2]=0;c[e+4>>2]=0;e=a+8|0;c[e>>2]=-1;c[e+4>>2]=-1;return}function uf(a){a=a|0;return 0}function vf(a){a=a|0;return 0}function wf(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0;e=i;if((d|0)<=0){f=0;i=e;return f|0}g=a+12|0;h=a+16|0;j=b;b=0;while(1){k=c[g>>2]|0;if(!(k>>>0<(c[h>>2]|0)>>>0)){l=sc[c[(c[a>>2]|0)+40>>2]&127](a)|0;if((l|0)==-1){f=b;m=8;break}else{n=l}}else{c[g>>2]=k+4;n=c[k>>2]|0}c[j>>2]=n;k=b+1|0;if((k|0)>=(d|0)){f=k;m=8;break}j=j+4|0;b=k}if((m|0)==8){i=e;return f|0}return 0}function xf(a){a=a|0;return-1}function yf(a){a=a|0;var b=0,d=0,e=0;b=i;if((sc[c[(c[a>>2]|0)+36>>2]&127](a)|0)==-1){d=-1;i=b;return d|0}e=a+12|0;a=c[e>>2]|0;c[e>>2]=a+4;d=c[a>>2]|0;i=b;return d|0}function zf(a,b){a=a|0;b=b|0;return-1}function Af(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0;e=i;if((d|0)<=0){f=0;i=e;return f|0}g=a+24|0;h=a+28|0;j=b;b=0;while(1){k=c[g>>2]|0;if(!(k>>>0<(c[h>>2]|0)>>>0)){if((Bc[c[(c[a>>2]|0)+52>>2]&15](a,c[j>>2]|0)|0)==-1){f=b;l=8;break}}else{m=c[j>>2]|0;c[g>>2]=k+4;c[k>>2]=m}m=b+1|0;if((m|0)>=(d|0)){f=m;l=8;break}j=j+4|0;b=m}if((l|0)==8){i=e;return f|0}return 0}function Bf(a,b){a=a|0;b=b|0;return-1}function Cf(a){a=a|0;var b=0;b=i;Ye(a+8|0);Ym(a);i=b;return}function Df(a){a=a|0;var b=0;b=i;Ye(a+8|0);i=b;return}function Ef(a){a=a|0;var b=0,d=0;b=i;d=c[(c[a>>2]|0)+ -12>>2]|0;Ye(a+(d+8)|0);Ym(a+d|0);i=b;return}function Ff(a){a=a|0;var b=0;b=i;Ye(a+((c[(c[a>>2]|0)+ -12>>2]|0)+8)|0);i=b;return}function Gf(b){b=b|0;var d=0,e=0,f=0,g=0,h=0;d=i;i=i+16|0;e=d;f=c[(c[b>>2]|0)+ -12>>2]|0;if((c[b+(f+24)>>2]|0)==0){i=d;return b|0}a[e]=0;c[e+4>>2]=b;if((c[b+(f+16)>>2]|0)==0){g=c[b+(f+72)>>2]|0;if((g|0)==0){h=f}else{Gf(g)|0;h=c[(c[b>>2]|0)+ -12>>2]|0}a[e]=1;g=c[b+(h+24)>>2]|0;if((sc[c[(c[g>>2]|0)+24>>2]&127](g)|0)==-1){g=c[(c[b>>2]|0)+ -12>>2]|0;Xe(b+g|0,c[b+(g+16)>>2]|1)}}Qf(e);i=d;return b|0}function Hf(a){a=a|0;var b=0;b=i;Ye(a+8|0);Ym(a);i=b;return}function If(a){a=a|0;var b=0;b=i;Ye(a+8|0);i=b;return}function Jf(a){a=a|0;var b=0,d=0;b=i;d=c[(c[a>>2]|0)+ -12>>2]|0;Ye(a+(d+8)|0);Ym(a+d|0);i=b;return}function Kf(a){a=a|0;var b=0;b=i;Ye(a+((c[(c[a>>2]|0)+ -12>>2]|0)+8)|0);i=b;return}function Lf(b){b=b|0;var d=0,e=0,f=0,g=0,h=0;d=i;i=i+16|0;e=d;f=c[(c[b>>2]|0)+ -12>>2]|0;if((c[b+(f+24)>>2]|0)==0){i=d;return b|0}a[e]=0;c[e+4>>2]=b;if((c[b+(f+16)>>2]|0)==0){g=c[b+(f+72)>>2]|0;if((g|0)==0){h=f}else{Lf(g)|0;h=c[(c[b>>2]|0)+ -12>>2]|0}a[e]=1;g=c[b+(h+24)>>2]|0;if((sc[c[(c[g>>2]|0)+24>>2]&127](g)|0)==-1){g=c[(c[b>>2]|0)+ -12>>2]|0;Xe(b+g|0,c[b+(g+16)>>2]|1)}}Vf(e);i=d;return b|0}function Mf(a){a=a|0;var b=0;b=i;Ye(a+4|0);Ym(a);i=b;return}function Nf(a){a=a|0;var b=0;b=i;Ye(a+4|0);i=b;return}function Of(a){a=a|0;var b=0,d=0;b=i;d=c[(c[a>>2]|0)+ -12>>2]|0;Ye(a+(d+4)|0);Ym(a+d|0);i=b;return}function Pf(a){a=a|0;var b=0;b=i;Ye(a+((c[(c[a>>2]|0)+ -12>>2]|0)+4)|0);i=b;return}function Qf(a){a=a|0;var b=0,d=0,e=0;b=i;d=a+4|0;a=c[d>>2]|0;e=c[(c[a>>2]|0)+ -12>>2]|0;if((c[a+(e+24)>>2]|0)==0){i=b;return}if((c[a+(e+16)>>2]|0)!=0){i=b;return}if((c[a+(e+4)>>2]&8192|0)==0){i=b;return}if(Ja()|0){i=b;return}e=c[d>>2]|0;a=c[e+((c[(c[e>>2]|0)+ -12>>2]|0)+24)>>2]|0;if(!((sc[c[(c[a>>2]|0)+24>>2]&127](a)|0)==-1)){i=b;return}a=c[d>>2]|0;d=c[(c[a>>2]|0)+ -12>>2]|0;Xe(a+d|0,c[a+(d+16)>>2]|1);i=b;return}function Rf(a){a=a|0;var b=0;b=i;Ye(a+4|0);Ym(a);i=b;return}function Sf(a){a=a|0;var b=0;b=i;Ye(a+4|0);i=b;return}function Tf(a){a=a|0;var b=0,d=0;b=i;d=c[(c[a>>2]|0)+ -12>>2]|0;Ye(a+(d+4)|0);Ym(a+d|0);i=b;return}function Uf(a){a=a|0;var b=0;b=i;Ye(a+((c[(c[a>>2]|0)+ -12>>2]|0)+4)|0);i=b;return}function Vf(a){a=a|0;var b=0,d=0,e=0;b=i;d=a+4|0;a=c[d>>2]|0;e=c[(c[a>>2]|0)+ -12>>2]|0;if((c[a+(e+24)>>2]|0)==0){i=b;return}if((c[a+(e+16)>>2]|0)!=0){i=b;return}if((c[a+(e+4)>>2]&8192|0)==0){i=b;return}if(Ja()|0){i=b;return}e=c[d>>2]|0;a=c[e+((c[(c[e>>2]|0)+ -12>>2]|0)+24)>>2]|0;if(!((sc[c[(c[a>>2]|0)+24>>2]&127](a)|0)==-1)){i=b;return}a=c[d>>2]|0;d=c[(c[a>>2]|0)+ -12>>2]|0;Xe(a+d|0,c[a+(d+16)>>2]|1);i=b;return}function Wf(a){a=a|0;return 3552}function Xf(a,b,c){a=a|0;b=b|0;c=c|0;var d=0;d=i;if((c|0)==1){De(a,3568,35);i=d;return}else{ve(a,b,c);i=d;return}}function Yf(a){a=a|0;return}function Zf(a){a=a|0;var b=0;b=i;ze(a);Ym(a);i=b;return}function _f(a){a=a|0;var b=0;b=i;ze(a);i=b;return}function $f(a){a=a|0;var b=0;b=i;Ye(a);Ym(a);i=b;return}function ag(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function bg(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function cg(a){a=a|0;return}function dg(a){a=a|0;return}function eg(b,c,d,e,f){b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0;b=i;a:do{if((e|0)==(f|0)){g=c;h=6}else{j=e;k=c;while(1){if((k|0)==(d|0)){l=-1;break a}m=a[k]|0;n=a[j]|0;if(m<<24>>24<n<<24>>24){l=-1;break a}if(n<<24>>24<m<<24>>24){l=1;break a}m=k+1|0;n=j+1|0;if((n|0)==(f|0)){g=m;h=6;break}else{j=n;k=m}}}}while(0);if((h|0)==6){l=(g|0)!=(d|0)|0}i=b;return l|0}function fg(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;d=i;g=e;h=f-g|0;if(h>>>0>4294967279){Be(b)}if(h>>>0<11){a[b]=h<<1;j=b+1|0}else{k=h+16&-16;l=Wm(k)|0;c[b+8>>2]=l;c[b>>2]=k|1;c[b+4>>2]=h;j=l}if((e|0)==(f|0)){m=j;a[m]=0;i=d;return}else{n=e;o=j}while(1){a[o]=a[n]|0;n=n+1|0;if((n|0)==(f|0)){break}else{o=o+1|0}}m=j+(f+(0-g))|0;a[m]=0;i=d;return}function gg(b,c,d){b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0,j=0;b=i;if((c|0)==(d|0)){e=0;i=b;return e|0}else{f=0;g=c}while(1){c=(a[g]|0)+(f<<4)|0;h=c&-268435456;j=(h>>>24|h)^c;c=g+1|0;if((c|0)==(d|0)){e=j;break}else{f=j;g=c}}i=b;return e|0}function hg(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function ig(a){a=a|0;return}function jg(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0;a=i;a:do{if((e|0)==(f|0)){g=b;h=6}else{j=e;k=b;while(1){if((k|0)==(d|0)){l=-1;break a}m=c[k>>2]|0;n=c[j>>2]|0;if((m|0)<(n|0)){l=-1;break a}if((n|0)<(m|0)){l=1;break a}m=k+4|0;n=j+4|0;if((n|0)==(f|0)){g=m;h=6;break}else{j=n;k=m}}}}while(0);if((h|0)==6){l=(g|0)!=(d|0)|0}i=a;return l|0}function kg(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0;d=i;g=e;h=f-g|0;j=h>>2;if(j>>>0>1073741807){Be(b)}if(j>>>0<2){a[b]=h>>>1;k=b+4|0}else{h=j+4&-4;l=Wm(h<<2)|0;c[b+8>>2]=l;c[b>>2]=h|1;c[b+4>>2]=j;k=l}if((e|0)==(f|0)){m=k;c[m>>2]=0;i=d;return}l=f+ -4+(0-g)|0;g=e;e=k;while(1){c[e>>2]=c[g>>2];g=g+4|0;if((g|0)==(f|0)){break}else{e=e+4|0}}m=k+((l>>>2)+1<<2)|0;c[m>>2]=0;i=d;return}function lg(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0;a=i;if((b|0)==(d|0)){e=0;i=a;return e|0}else{f=0;g=b}while(1){b=(c[g>>2]|0)+(f<<4)|0;h=b&-268435456;j=(h>>>24|h)^b;b=g+4|0;if((b|0)==(d|0)){e=j;break}else{f=j;g=b}}i=a;return e|0}function mg(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function ng(a){a=a|0;return}function og(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;k=i;i=i+80|0;l=k;m=k+24|0;n=k+28|0;o=k+32|0;p=k+16|0;q=k+12|0;r=k+20|0;s=k+36|0;t=k+40|0;u=k+64|0;if((c[g+4>>2]&1|0)==0){c[n>>2]=-1;v=c[(c[d>>2]|0)+16>>2]|0;c[p>>2]=c[e>>2];c[q>>2]=c[f>>2];c[m+0>>2]=c[p+0>>2];c[l+0>>2]=c[q+0>>2];nc[v&63](o,d,m,l,g,h,n);m=c[o>>2]|0;c[e>>2]=m;o=c[n>>2]|0;if((o|0)==0){a[j]=0}else if((o|0)==1){a[j]=1}else{a[j]=1;c[h>>2]=4}c[b>>2]=m;i=k;return}Ze(r,g);m=c[r>>2]|0;if(!((c[1500]|0)==-1)){c[l>>2]=6e3;c[l+4>>2]=117;c[l+8>>2]=0;Ae(6e3,l,118)}o=(c[6004>>2]|0)+ -1|0;n=c[m+8>>2]|0;if(!((c[m+12>>2]|0)-n>>2>>>0>o>>>0)){w=xb(4)|0;wm(w);ec(w|0,13960,106)}m=c[n+(o<<2)>>2]|0;if((m|0)==0){w=xb(4)|0;wm(w);ec(w|0,13960,106)}ge(c[r>>2]|0)|0;Ze(s,g);g=c[s>>2]|0;if(!((c[1536]|0)==-1)){c[l>>2]=6144;c[l+4>>2]=117;c[l+8>>2]=0;Ae(6144,l,118)}r=(c[6148>>2]|0)+ -1|0;w=c[g+8>>2]|0;if(!((c[g+12>>2]|0)-w>>2>>>0>r>>>0)){x=xb(4)|0;wm(x);ec(x|0,13960,106)}g=c[w+(r<<2)>>2]|0;if((g|0)==0){x=xb(4)|0;wm(x);ec(x|0,13960,106)}ge(c[s>>2]|0)|0;qc[c[(c[g>>2]|0)+24>>2]&63](t,g);qc[c[(c[g>>2]|0)+28>>2]&63](t+12|0,g);c[u>>2]=c[f>>2];f=t+24|0;c[l+0>>2]=c[u+0>>2];a[j]=(pg(e,l,t,f,m,h,1)|0)==(t|0)|0;c[b>>2]=c[e>>2];Fe(t+12|0);Fe(t);i=k;return}function pg(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0;l=i;i=i+112|0;m=l;n=(g-f|0)/12|0;if(n>>>0>100){o=Rm(n)|0;if((o|0)==0){bn()}else{p=o;q=o}}else{p=0;q=m}m=(f|0)==(g|0);if(m){r=0;s=n}else{o=f;t=0;u=n;n=q;while(1){v=a[o]|0;if((v&1)==0){w=(v&255)>>>1}else{w=c[o+4>>2]|0}if((w|0)==0){a[n]=2;x=t+1|0;y=u+ -1|0}else{a[n]=1;x=t;y=u}v=o+12|0;if((v|0)==(g|0)){r=x;s=y;break}else{o=v;t=x;u=y;n=n+1|0}}}n=0;y=r;r=s;a:while(1){s=c[b>>2]|0;do{if((s|0)!=0){if((c[s+12>>2]|0)==(c[s+16>>2]|0)){if((sc[c[(c[s>>2]|0)+36>>2]&127](s)|0)==-1){c[b>>2]=0;z=0;break}else{z=c[b>>2]|0;break}}else{z=s}}else{z=0}}while(0);s=(z|0)==0;u=c[e>>2]|0;if((u|0)!=0){if((c[u+12>>2]|0)==(c[u+16>>2]|0)?(sc[c[(c[u>>2]|0)+36>>2]&127](u)|0)==-1:0){c[e>>2]=0;A=0}else{A=u}}else{A=0}B=(A|0)==0;C=c[b>>2]|0;if(!((s^B)&(r|0)!=0)){break}s=c[C+12>>2]|0;if((s|0)==(c[C+16>>2]|0)){D=sc[c[(c[C>>2]|0)+36>>2]&127](C)|0}else{D=d[s]|0}s=D&255;if(k){E=s}else{E=Bc[c[(c[h>>2]|0)+12>>2]&15](h,s)|0}s=n+1|0;if(m){n=s;continue}b:do{if(k){u=0;x=f;t=y;o=r;w=q;while(1){do{if((a[w]|0)==1){v=a[x]|0;F=(v&1)==0;if(F){G=x+1|0}else{G=c[x+8>>2]|0}if(!(E<<24>>24==(a[G+n|0]|0))){a[w]=0;H=u;I=t;J=o+ -1|0;break}if(F){K=(v&255)>>>1}else{K=c[x+4>>2]|0}if((K|0)==(s|0)){a[w]=2;H=1;I=t+1|0;J=o+ -1|0}else{H=1;I=t;J=o}}else{H=u;I=t;J=o}}while(0);v=x+12|0;if((v|0)==(g|0)){L=H;M=I;N=J;break b}u=H;x=v;t=I;o=J;w=w+1|0}}else{w=0;o=f;t=y;x=r;u=q;while(1){do{if((a[u]|0)==1){if((a[o]&1)==0){O=o+1|0}else{O=c[o+8>>2]|0}if(!(E<<24>>24==(Bc[c[(c[h>>2]|0)+12>>2]&15](h,a[O+n|0]|0)|0)<<24>>24)){a[u]=0;P=w;Q=t;R=x+ -1|0;break}v=a[o]|0;if((v&1)==0){S=(v&255)>>>1}else{S=c[o+4>>2]|0}if((S|0)==(s|0)){a[u]=2;P=1;Q=t+1|0;R=x+ -1|0}else{P=1;Q=t;R=x}}else{P=w;Q=t;R=x}}while(0);v=o+12|0;if((v|0)==(g|0)){L=P;M=Q;N=R;break b}w=P;o=v;t=Q;x=R;u=u+1|0}}}while(0);if(!L){n=s;y=M;r=N;continue}u=c[b>>2]|0;x=u+12|0;t=c[x>>2]|0;if((t|0)==(c[u+16>>2]|0)){sc[c[(c[u>>2]|0)+40>>2]&127](u)|0}else{c[x>>2]=t+1}if((N+M|0)>>>0<2){n=s;y=M;r=N;continue}else{T=f;U=M;V=q}while(1){if((a[V]|0)==2){t=a[T]|0;if((t&1)==0){W=(t&255)>>>1}else{W=c[T+4>>2]|0}if((W|0)!=(s|0)){a[V]=0;X=U+ -1|0}else{X=U}}else{X=U}t=T+12|0;if((t|0)==(g|0)){n=s;y=X;r=N;continue a}else{T=t;U=X;V=V+1|0}}}do{if((C|0)!=0){if((c[C+12>>2]|0)==(c[C+16>>2]|0)){if((sc[c[(c[C>>2]|0)+36>>2]&127](C)|0)==-1){c[b>>2]=0;Y=0;break}else{Y=c[b>>2]|0;break}}else{Y=C}}else{Y=0}}while(0);C=(Y|0)==0;do{if(!B){if((c[A+12>>2]|0)!=(c[A+16>>2]|0)){if(C){break}else{Z=80;break}}if(!((sc[c[(c[A>>2]|0)+36>>2]&127](A)|0)==-1)){if(C){break}else{Z=80;break}}else{c[e>>2]=0;Z=78;break}}else{Z=78}}while(0);if((Z|0)==78?C:0){Z=80}if((Z|0)==80){c[j>>2]=c[j>>2]|2}c:do{if(!m){if((a[q]|0)==2){_=f}else{C=f;e=q;while(1){A=C+12|0;B=e+1|0;if((A|0)==(g|0)){Z=85;break c}if((a[B]|0)==2){_=A;break}else{C=A;e=B}}}}else{Z=85}}while(0);if((Z|0)==85){c[j>>2]=c[j>>2]|4;_=g}if((p|0)==0){i=l;return _|0}Sm(p);i=l;return _|0}function qg(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;l=b+4|0;m=b;c[l>>2]=c[d>>2];c[m>>2]=c[e>>2];c[k+0>>2]=c[l+0>>2];c[j+0>>2]=c[m+0>>2];rg(a,0,k,j,f,g,h);i=b;return}function rg(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0;e=i;i=i+224|0;l=e+198|0;m=e+196|0;n=e+16|0;o=e+4|0;p=e+192|0;q=e+32|0;r=e;s=e+28|0;t=c[h+4>>2]&74;if((t|0)==0){u=0}else if((t|0)==64){u=8}else if((t|0)==8){u=16}else{u=10}hh(n,h,l,m);c[o+0>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;He(o,10,0);if((a[o]&1)==0){h=o+1|0;v=h;w=o+8|0;x=h}else{h=o+8|0;v=o+1|0;w=h;x=c[h>>2]|0}c[p>>2]=x;c[r>>2]=q;c[s>>2]=0;h=o+4|0;t=a[m]|0;m=c[f>>2]|0;y=x;a:while(1){if((m|0)!=0){if((c[m+12>>2]|0)==(c[m+16>>2]|0)?(sc[c[(c[m>>2]|0)+36>>2]&127](m)|0)==-1:0){c[f>>2]=0;z=0}else{z=m}}else{z=0}x=(z|0)==0;A=c[g>>2]|0;do{if((A|0)!=0){if((c[A+12>>2]|0)!=(c[A+16>>2]|0)){if(x){B=A;break}else{C=A;D=y;break a}}if(!((sc[c[(c[A>>2]|0)+36>>2]&127](A)|0)==-1)){if(x){B=A;break}else{C=A;D=y;break a}}else{c[g>>2]=0;E=18;break}}else{E=18}}while(0);if((E|0)==18){E=0;if(x){C=0;D=y;break}else{B=0}}A=a[o]|0;F=(A&1)==0;if(F){G=(A&255)>>>1}else{G=c[h>>2]|0}if(((c[p>>2]|0)-y|0)==(G|0)){if(F){H=(A&255)>>>1;I=(A&255)>>>1}else{A=c[h>>2]|0;H=A;I=A}He(o,H<<1,0);if((a[o]&1)==0){J=10}else{J=(c[o>>2]&-2)+ -1|0}He(o,J,0);if((a[o]&1)==0){K=v}else{K=c[w>>2]|0}c[p>>2]=K+I;L=K}else{L=y}A=z+12|0;F=c[A>>2]|0;M=z+16|0;if((F|0)==(c[M>>2]|0)){N=sc[c[(c[z>>2]|0)+36>>2]&127](z)|0}else{N=d[F]|0}if((Jg(N&255,u,L,p,s,t,n,q,r,l)|0)!=0){C=B;D=L;break}F=c[A>>2]|0;if((F|0)==(c[M>>2]|0)){sc[c[(c[z>>2]|0)+40>>2]&127](z)|0;m=z;y=L;continue}else{c[A>>2]=F+1;m=z;y=L;continue}}L=a[n]|0;if((L&1)==0){O=(L&255)>>>1}else{O=c[n+4>>2]|0}if((O|0)!=0?(O=c[r>>2]|0,(O-q|0)<160):0){L=c[s>>2]|0;c[r>>2]=O+4;c[O>>2]=L}c[k>>2]=am(D,c[p>>2]|0,j,u)|0;tj(n,q,c[r>>2]|0,j);if((z|0)!=0){if((c[z+12>>2]|0)==(c[z+16>>2]|0)?(sc[c[(c[z>>2]|0)+36>>2]&127](z)|0)==-1:0){c[f>>2]=0;P=0}else{P=z}}else{P=0}z=(P|0)==0;do{if((C|0)!=0){if((c[C+12>>2]|0)!=(c[C+16>>2]|0)){if(!z){break}c[b>>2]=P;Fe(o);Fe(n);i=e;return}if((sc[c[(c[C>>2]|0)+36>>2]&127](C)|0)==-1){c[g>>2]=0;E=54;break}if(z^(C|0)==0){c[b>>2]=P;Fe(o);Fe(n);i=e;return}}else{E=54}}while(0);if((E|0)==54?!z:0){c[b>>2]=P;Fe(o);Fe(n);i=e;return}c[j>>2]=c[j>>2]|2;c[b>>2]=P;Fe(o);Fe(n);i=e;return}function sg(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;l=b+4|0;m=b;c[l>>2]=c[d>>2];c[m>>2]=c[e>>2];c[k+0>>2]=c[l+0>>2];c[j+0>>2]=c[m+0>>2];tg(a,0,k,j,f,g,h);i=b;return}



function mi(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0;g=i;h=c[a>>2]|0;do{if((h|0)!=0){j=c[h+12>>2]|0;if((j|0)==(c[h+16>>2]|0)){k=sc[c[(c[h>>2]|0)+36>>2]&127](h)|0}else{k=c[j>>2]|0}if((k|0)==-1){c[a>>2]=0;l=1;break}else{l=(c[a>>2]|0)==0;break}}else{l=1}}while(0);k=c[b>>2]|0;do{if((k|0)!=0){h=c[k+12>>2]|0;if((h|0)==(c[k+16>>2]|0)){m=sc[c[(c[k>>2]|0)+36>>2]&127](k)|0}else{m=c[h>>2]|0}if(!((m|0)==-1)){if(l){n=k;break}else{o=16;break}}else{c[b>>2]=0;o=14;break}}else{o=14}}while(0);if((o|0)==14){if(l){o=16}else{n=0}}if((o|0)==16){c[d>>2]=c[d>>2]|6;p=0;i=g;return p|0}l=c[a>>2]|0;k=c[l+12>>2]|0;if((k|0)==(c[l+16>>2]|0)){q=sc[c[(c[l>>2]|0)+36>>2]&127](l)|0}else{q=c[k>>2]|0}if(!(kc[c[(c[e>>2]|0)+12>>2]&31](e,2048,q)|0)){c[d>>2]=c[d>>2]|4;p=0;i=g;return p|0}k=(kc[c[(c[e>>2]|0)+52>>2]&31](e,q,0)|0)<<24>>24;q=c[a>>2]|0;l=q+12|0;m=c[l>>2]|0;if((m|0)==(c[q+16>>2]|0)){sc[c[(c[q>>2]|0)+40>>2]&127](q)|0;r=f;s=n;t=n;u=k}else{c[l>>2]=m+4;r=f;s=n;t=n;u=k}while(1){v=u+ -48|0;k=r+ -1|0;n=c[a>>2]|0;do{if((n|0)!=0){f=c[n+12>>2]|0;if((f|0)==(c[n+16>>2]|0)){w=sc[c[(c[n>>2]|0)+36>>2]&127](n)|0}else{w=c[f>>2]|0}if((w|0)==-1){c[a>>2]=0;x=1;break}else{x=(c[a>>2]|0)==0;break}}else{x=1}}while(0);do{if((t|0)!=0){n=c[t+12>>2]|0;if((n|0)==(c[t+16>>2]|0)){y=sc[c[(c[t>>2]|0)+36>>2]&127](t)|0}else{y=c[n>>2]|0}if((y|0)==-1){c[b>>2]=0;z=0;A=0;B=1;break}else{z=s;A=s;B=(s|0)==0;break}}else{z=s;A=0;B=1}}while(0);C=c[a>>2]|0;if(!((x^B)&(k|0)>0)){break}n=c[C+12>>2]|0;if((n|0)==(c[C+16>>2]|0)){D=sc[c[(c[C>>2]|0)+36>>2]&127](C)|0}else{D=c[n>>2]|0}if(!(kc[c[(c[e>>2]|0)+12>>2]&31](e,2048,D)|0)){p=v;o=63;break}n=((kc[c[(c[e>>2]|0)+52>>2]&31](e,D,0)|0)<<24>>24)+(v*10|0)|0;f=c[a>>2]|0;m=f+12|0;l=c[m>>2]|0;if((l|0)==(c[f+16>>2]|0)){sc[c[(c[f>>2]|0)+40>>2]&127](f)|0;r=k;s=z;t=A;u=n;continue}else{c[m>>2]=l+4;r=k;s=z;t=A;u=n;continue}}if((o|0)==63){i=g;return p|0}do{if((C|0)!=0){u=c[C+12>>2]|0;if((u|0)==(c[C+16>>2]|0)){E=sc[c[(c[C>>2]|0)+36>>2]&127](C)|0}else{E=c[u>>2]|0}if((E|0)==-1){c[a>>2]=0;F=1;break}else{F=(c[a>>2]|0)==0;break}}else{F=1}}while(0);do{if((z|0)!=0){a=c[z+12>>2]|0;if((a|0)==(c[z+16>>2]|0)){G=sc[c[(c[z>>2]|0)+36>>2]&127](z)|0}else{G=c[a>>2]|0}if((G|0)==-1){c[b>>2]=0;o=60;break}if(F){p=v;i=g;return p|0}}else{o=60}}while(0);if((o|0)==60?!F:0){p=v;i=g;return p|0}c[d>>2]=c[d>>2]|2;p=v;i=g;return p|0}function ni(b){b=b|0;var d=0,e=0,f=0;d=i;e=b+8|0;f=c[e>>2]|0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}if((f|0)==(c[1472]|0)){Ym(b);i=d;return}kb(c[e>>2]|0);Ym(b);i=d;return}function oi(b){b=b|0;var d=0,e=0;d=i;e=b+8|0;b=c[e>>2]|0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}if((b|0)==(c[1472]|0)){i=d;return}kb(c[e>>2]|0);i=d;return}function pi(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0;g=i;i=i+112|0;f=g+100|0;l=g;a[f]=37;m=f+1|0;a[m]=j;n=f+2|0;a[n]=k;a[f+3|0]=0;if(!(k<<24>>24==0)){a[m]=k;a[n]=j}j=Ub(l|0,100,f|0,h|0,c[d+8>>2]|0)|0;d=l+j|0;h=c[e>>2]|0;if((j|0)==0){o=h;c[b>>2]=o;i=g;return}else{p=l;q=h;r=h}while(1){h=a[p]|0;do{if((q|0)!=0){l=q+24|0;j=c[l>>2]|0;if((j|0)==(c[q+28>>2]|0)){e=(Bc[c[(c[q>>2]|0)+52>>2]&15](q,h&255)|0)==-1;s=e?0:r;t=e?0:q;break}else{c[l>>2]=j+1;a[j]=h;s=r;t=q;break}}else{s=r;t=0}}while(0);h=p+1|0;if((h|0)==(d|0)){o=s;break}else{p=h;q=t;r=s}}c[b>>2]=o;i=g;return}function qi(b){b=b|0;var d=0,e=0,f=0;d=i;e=b+8|0;f=c[e>>2]|0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}if((f|0)==(c[1472]|0)){Ym(b);i=d;return}kb(c[e>>2]|0);Ym(b);i=d;return}function ri(b){b=b|0;var d=0,e=0;d=i;e=b+8|0;b=c[e>>2]|0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}if((b|0)==(c[1472]|0)){i=d;return}kb(c[e>>2]|0);i=d;return}function si(a,b,d,e,f,g,h,j){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;f=i;i=i+416|0;e=f+8|0;k=f;c[k>>2]=e+400;ti(b+8|0,e,k,g,h,j);j=c[k>>2]|0;k=c[d>>2]|0;if((e|0)==(j|0)){l=k;c[a>>2]=l;i=f;return}else{m=e;n=k;o=k}while(1){k=c[m>>2]|0;if((o|0)==0){p=n;q=0}else{e=o+24|0;d=c[e>>2]|0;if((d|0)==(c[o+28>>2]|0)){r=Bc[c[(c[o>>2]|0)+52>>2]&15](o,k)|0}else{c[e>>2]=d+4;c[d>>2]=k;r=k}k=(r|0)==-1;p=k?0:n;q=k?0:o}k=m+4|0;if((k|0)==(j|0)){l=p;break}else{m=k;n=p;o=q}}c[a>>2]=l;i=f;return}function ti(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0;j=i;i=i+128|0;k=j+112|0;l=j+12|0;m=j;n=j+8|0;a[k]=37;o=k+1|0;a[o]=g;p=k+2|0;a[p]=h;a[k+3|0]=0;if(!(h<<24>>24==0)){a[o]=h;a[p]=g}Ub(l|0,100,k|0,f|0,c[b>>2]|0)|0;f=m;c[f>>2]=0;c[f+4>>2]=0;c[n>>2]=l;l=(c[e>>2]|0)-d>>2;f=Bb(c[b>>2]|0)|0;b=mm(d,n,l,m)|0;if((f|0)!=0){Bb(f|0)|0}if((b|0)==-1){pj(6880)}else{c[e>>2]=d+(b<<2);i=j;return}}function ui(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function vi(a){a=a|0;return}function wi(a){a=a|0;return 127}function xi(a){a=a|0;return 127}function yi(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function zi(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function Ai(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function Bi(a,b){a=a|0;b=b|0;b=i;Ee(a,1,45);i=b;return}function Ci(a){a=a|0;return 0}function Di(b,c){b=b|0;c=c|0;a[b]=67109634;a[b+1|0]=262147;a[b+2|0]=1024;a[b+3|0]=4;return}function Ei(b,c){b=b|0;c=c|0;a[b]=67109634;a[b+1|0]=262147;a[b+2|0]=1024;a[b+3|0]=4;return}function Fi(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function Gi(a){a=a|0;return}function Hi(a){a=a|0;return 127}function Ii(a){a=a|0;return 127}function Ji(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function Ki(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function Li(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function Mi(a,b){a=a|0;b=b|0;b=i;Ee(a,1,45);i=b;return}function Ni(a){a=a|0;return 0}function Oi(b,c){b=b|0;c=c|0;a[b]=67109634;a[b+1|0]=262147;a[b+2|0]=1024;a[b+3|0]=4;return}function Pi(b,c){b=b|0;c=c|0;a[b]=67109634;a[b+1|0]=262147;a[b+2|0]=1024;a[b+3|0]=4;return}function Qi(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function Ri(a){a=a|0;return}function Si(a){a=a|0;return 2147483647}function Ti(a){a=a|0;return 2147483647}function Ui(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function Vi(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function Wi(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function Xi(a,b){a=a|0;b=b|0;b=i;Pe(a,1,45);i=b;return}function Yi(a){a=a|0;return 0}function Zi(b,c){b=b|0;c=c|0;a[b]=67109634;a[b+1|0]=262147;a[b+2|0]=1024;a[b+3|0]=4;return}function _i(b,c){b=b|0;c=c|0;a[b]=67109634;a[b+1|0]=262147;a[b+2|0]=1024;a[b+3|0]=4;return}function $i(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function aj(a){a=a|0;return}function bj(a){a=a|0;return 2147483647}function cj(a){a=a|0;return 2147483647}function dj(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function ej(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function fj(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function gj(a,b){a=a|0;b=b|0;b=i;Pe(a,1,45);i=b;return}function hj(a){a=a|0;return 0}function ij(b,c){b=b|0;c=c|0;a[b]=67109634;a[b+1|0]=262147;a[b+2|0]=1024;a[b+3|0]=4;return}function jj(b,c){b=b|0;c=c|0;a[b]=67109634;a[b+1|0]=262147;a[b+2|0]=1024;a[b+3|0]=4;return}function kj(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function lj(a){a=a|0;return}function mj(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0;d=i;i=i+256|0;l=d;m=d+144|0;n=d+16|0;o=d+12|0;p=d+28|0;q=d+244|0;r=d+24|0;s=d+132|0;t=d+32|0;c[n>>2]=m;u=n+4|0;c[u>>2]=119;v=m+100|0;Ze(p,h);m=c[p>>2]|0;if(!((c[1500]|0)==-1)){c[l>>2]=6e3;c[l+4>>2]=117;c[l+8>>2]=0;Ae(6e3,l,118)}w=(c[6004>>2]|0)+ -1|0;x=c[m+8>>2]|0;if(!((c[m+12>>2]|0)-x>>2>>>0>w>>>0)){y=xb(4)|0;wm(y);ec(y|0,13960,106)}m=c[x+(w<<2)>>2]|0;if((m|0)==0){y=xb(4)|0;wm(y);ec(y|0,13960,106)}a[q]=0;c[r>>2]=c[f>>2];y=c[h+4>>2]|0;c[l+0>>2]=c[r+0>>2];if(oj(e,l,g,p,y,j,q,m,n,o,v)|0){yc[c[(c[m>>2]|0)+32>>2]&7](m,5616,5626|0,s)|0;m=c[o>>2]|0;v=c[n>>2]|0;y=m-v|0;if((y|0)>98){g=Rm(y+2|0)|0;if((g|0)==0){bn()}else{z=g;A=g}}else{z=0;A=t}if((a[q]|0)==0){B=A}else{a[A]=45;B=A+1|0}if(v>>>0<m>>>0){m=s+10|0;A=s;q=B;g=v;while(1){v=a[g]|0;y=s;while(1){r=y+1|0;if((a[y]|0)==v<<24>>24){C=y;break}if((r|0)==(m|0)){C=m;break}else{y=r}}a[q]=a[5616+(C-A)|0]|0;y=g+1|0;v=q+1|0;if(y>>>0<(c[o>>2]|0)>>>0){q=v;g=y}else{D=v;break}}}else{D=B}a[D]=0;c[l>>2]=k;if((Ia(t|0,5632,l|0)|0)!=1){l=xb(8)|0;me(l,5640);ec(l|0,3008,16)}if((z|0)!=0){Sm(z)}}z=c[e>>2]|0;if((z|0)!=0){if((c[z+12>>2]|0)==(c[z+16>>2]|0)?(sc[c[(c[z>>2]|0)+36>>2]&127](z)|0)==-1:0){c[e>>2]=0;E=0}else{E=z}}else{E=0}z=(E|0)==0;e=c[f>>2]|0;do{if((e|0)!=0){if((c[e+12>>2]|0)!=(c[e+16>>2]|0)){if(z){break}else{F=33;break}}if(!((sc[c[(c[e>>2]|0)+36>>2]&127](e)|0)==-1)){if(z){break}else{F=33;break}}else{c[f>>2]=0;F=31;break}}else{F=31}}while(0);if((F|0)==31?z:0){F=33}if((F|0)==33){c[j>>2]=c[j>>2]|2}c[b>>2]=E;ge(c[p>>2]|0)|0;p=c[n>>2]|0;c[n>>2]=0;if((p|0)==0){i=d;return}pc[c[u>>2]&255](p);i=d;return}function nj(a){a=a|0;return}function oj(e,f,g,h,j,k,l,m,n,o,p){e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;p=p|0;var q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0,la=0,ma=0,na=0,oa=0,pa=0,qa=0,ra=0,sa=0,ta=0,ua=0,va=0,wa=0,xa=0,ya=0,za=0,Aa=0,Ba=0,Ca=0,Da=0,Ea=0,Fa=0,Ga=0,Ha=0,Ia=0,Ja=0,Ka=0,La=0,Ma=0,Na=0,Oa=0,Pa=0,Qa=0,Ra=0,Sa=0,Ta=0,Ua=0,Va=0,Wa=0,Xa=0,Ya=0,Za=0,_a=0,$a=0,ab=0,bb=0,cb=0,db=0,eb=0,fb=0,gb=0,hb=0,ib=0,jb=0,kb=0,lb=0,mb=0,nb=0,ob=0,pb=0,qb=0,rb=0,sb=0,tb=0,ub=0,vb=0,wb=0,xb=0,yb=0,zb=0,Ab=0,Bb=0,Cb=0,Db=0,Eb=0,Fb=0,Gb=0,Hb=0,Ib=0,Jb=0,Kb=0,Lb=0,Mb=0,Nb=0,Ob=0,Pb=0,Qb=0,Rb=0,Sb=0,Tb=0,Ub=0,Vb=0,Wb=0,Xb=0,Yb=0,Zb=0,_b=0,$b=0,ac=0,bc=0,cc=0,dc=0,ec=0,fc=0,gc=0,hc=0,ic=0,jc=0,kc=0;q=i;i=i+480|0;r=q;s=q+428|0;t=q+472|0;u=q+473|0;v=q+448|0;w=q+460|0;x=q+416|0;y=q+436|0;z=q+400|0;A=q+432|0;B=q+412|0;c[s>>2]=0;c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;c[w+0>>2]=0;c[w+4>>2]=0;c[w+8>>2]=0;c[x+0>>2]=0;c[x+4>>2]=0;c[x+8>>2]=0;c[y+0>>2]=0;c[y+4>>2]=0;c[y+8>>2]=0;c[z+0>>2]=0;c[z+4>>2]=0;c[z+8>>2]=0;sj(g,h,s,t,u,v,w,x,y,A);c[o>>2]=c[n>>2];h=m+8|0;m=y+1|0;g=y+4|0;C=y+8|0;D=x+1|0;E=x+4|0;F=x+8|0;G=(j&512|0)!=0;j=w+1|0;H=w+8|0;I=w+4|0;J=z+1|0;K=z+8|0;L=z+4|0;M=s+3|0;N=n+4|0;O=v+4|0;P=r+400|0;Q=r;R=r;r=p;p=0;S=0;T=119;a:while(1){U=c[e>>2]|0;do{if((U|0)!=0){if((c[U+12>>2]|0)==(c[U+16>>2]|0)){if((sc[c[(c[U>>2]|0)+36>>2]&127](U)|0)==-1){c[e>>2]=0;V=0;break}else{V=c[e>>2]|0;break}}else{V=U}}else{V=0}}while(0);U=(V|0)==0;W=c[f>>2]|0;do{if((W|0)!=0){if((c[W+12>>2]|0)!=(c[W+16>>2]|0)){if(U){X=W;break}else{Y=R;Z=Q;_=S;$=T;aa=269;break a}}if(!((sc[c[(c[W>>2]|0)+36>>2]&127](W)|0)==-1)){if(U){X=W;break}else{Y=R;Z=Q;_=S;$=T;aa=269;break a}}else{c[f>>2]=0;aa=12;break}}else{aa=12}}while(0);if((aa|0)==12){aa=0;if(U){Y=R;Z=Q;_=S;$=T;aa=269;break}else{X=0}}b:do{switch(a[s+p|0]|0){case 1:{if((p|0)==3){Y=R;Z=Q;_=S;$=T;aa=269;break a}W=c[e>>2]|0;ba=c[W+12>>2]|0;if((ba|0)==(c[W+16>>2]|0)){ca=sc[c[(c[W>>2]|0)+36>>2]&127](W)|0}else{ca=d[ba]|0}if(!((ca&255)<<24>>24>-1)){aa=25;break a}if((b[(c[h>>2]|0)+(ca<<24>>24<<1)>>1]&8192)==0){aa=25;break a}ba=c[e>>2]|0;W=ba+12|0;da=c[W>>2]|0;if((da|0)==(c[ba+16>>2]|0)){ea=sc[c[(c[ba>>2]|0)+40>>2]&127](ba)|0}else{c[W>>2]=da+1;ea=d[da]|0}Ke(z,ea&255);aa=26;break};case 0:{aa=26;break};case 3:{da=a[x]|0;W=(da&1)==0;if(W){fa=(da&255)>>>1}else{fa=c[E>>2]|0}ba=a[y]|0;ga=(ba&1)==0;if(ga){ha=(ba&255)>>>1}else{ha=c[g>>2]|0}if((fa|0)==(0-ha|0)){ia=r;ja=R;ka=Q;la=P;ma=S;na=T}else{if(W){oa=(da&255)>>>1}else{oa=c[E>>2]|0}if((oa|0)!=0){if(ga){pa=(ba&255)>>>1}else{pa=c[g>>2]|0}if((pa|0)!=0){ga=c[e>>2]|0;qa=c[ga+12>>2]|0;ra=c[ga+16>>2]|0;if((qa|0)==(ra|0)){sa=sc[c[(c[ga>>2]|0)+36>>2]&127](ga)|0;ta=c[e>>2]|0;ua=sa;va=a[x]|0;wa=ta;xa=c[ta+12>>2]|0;ya=c[ta+16>>2]|0}else{ua=d[qa]|0;va=da;wa=ga;xa=qa;ya=ra}ra=wa+12|0;qa=(xa|0)==(ya|0);if((ua&255)<<24>>24==(a[(va&1)==0?D:c[F>>2]|0]|0)){if(qa){sc[c[(c[wa>>2]|0)+40>>2]&127](wa)|0}else{c[ra>>2]=xa+1}ra=a[x]|0;if((ra&1)==0){za=(ra&255)>>>1}else{za=c[E>>2]|0}ia=r;ja=R;ka=Q;la=P;ma=za>>>0>1?x:S;na=T;break b}if(qa){Aa=sc[c[(c[wa>>2]|0)+36>>2]&127](wa)|0}else{Aa=d[xa]|0}if(!((Aa&255)<<24>>24==(a[(a[y]&1)==0?m:c[C>>2]|0]|0))){aa=112;break a}qa=c[e>>2]|0;ra=qa+12|0;ga=c[ra>>2]|0;if((ga|0)==(c[qa+16>>2]|0)){sc[c[(c[qa>>2]|0)+40>>2]&127](qa)|0}else{c[ra>>2]=ga+1}a[l]=1;ga=a[y]|0;if((ga&1)==0){Ba=(ga&255)>>>1}else{Ba=c[g>>2]|0}ia=r;ja=R;ka=Q;la=P;ma=Ba>>>0>1?y:S;na=T;break b}}if(W){Ca=(da&255)>>>1}else{Ca=c[E>>2]|0}W=c[e>>2]|0;ga=c[W+12>>2]|0;ra=(ga|0)==(c[W+16>>2]|0);if((Ca|0)==0){if(ra){qa=sc[c[(c[W>>2]|0)+36>>2]&127](W)|0;Da=qa;Ea=a[y]|0}else{Da=d[ga]|0;Ea=ba}if(!((Da&255)<<24>>24==(a[(Ea&1)==0?m:c[C>>2]|0]|0))){ia=r;ja=R;ka=Q;la=P;ma=S;na=T;break b}ba=c[e>>2]|0;qa=ba+12|0;ta=c[qa>>2]|0;if((ta|0)==(c[ba+16>>2]|0)){sc[c[(c[ba>>2]|0)+40>>2]&127](ba)|0}else{c[qa>>2]=ta+1}a[l]=1;ta=a[y]|0;if((ta&1)==0){Fa=(ta&255)>>>1}else{Fa=c[g>>2]|0}ia=r;ja=R;ka=Q;la=P;ma=Fa>>>0>1?y:S;na=T;break b}if(ra){ra=sc[c[(c[W>>2]|0)+36>>2]&127](W)|0;Ga=ra;Ha=a[x]|0}else{Ga=d[ga]|0;Ha=da}if(!((Ga&255)<<24>>24==(a[(Ha&1)==0?D:c[F>>2]|0]|0))){a[l]=1;ia=r;ja=R;ka=Q;la=P;ma=S;na=T;break b}da=c[e>>2]|0;ga=da+12|0;ra=c[ga>>2]|0;if((ra|0)==(c[da+16>>2]|0)){sc[c[(c[da>>2]|0)+40>>2]&127](da)|0}else{c[ga>>2]=ra+1}ra=a[x]|0;if((ra&1)==0){Ia=(ra&255)>>>1}else{Ia=c[E>>2]|0}ia=r;ja=R;ka=Q;la=P;ma=Ia>>>0>1?x:S;na=T}break};case 2:{if(!((S|0)!=0|p>>>0<2)){if((p|0)==2){Ja=(a[M]|0)!=0}else{Ja=0}if(!(G|Ja)){ia=r;ja=R;ka=Q;la=P;ma=0;na=T;break b}}ra=a[w]|0;ga=(ra&1)==0;da=ga?j:c[H>>2]|0;c:do{if((p|0)!=0?(d[s+(p+ -1)|0]|0)<2:0){W=da+(ga?(ra&255)>>>1:c[I>>2]|0)|0;ta=da;while(1){if((ta|0)==(W|0)){Ka=W;break}qa=a[ta]|0;if(!(qa<<24>>24>-1)){Ka=ta;break}if((b[(c[h>>2]|0)+(qa<<24>>24<<1)>>1]&8192)==0){Ka=ta;break}else{ta=ta+1|0}}ta=Ka-da|0;W=a[z]|0;qa=(W&1)==0;if(qa){La=(W&255)>>>1}else{La=c[L>>2]|0}if(!(ta>>>0>La>>>0)){if(qa){qa=(W&255)>>>1;Ma=J;Na=qa;Oa=z+(qa-ta)+1|0}else{qa=c[K>>2]|0;W=c[L>>2]|0;Ma=qa;Na=W;Oa=qa+(W-ta)|0}ta=Ma+Na|0;if((Oa|0)==(ta|0)){Pa=X;Qa=ra;Ra=Ka;Sa=X}else{W=Oa;qa=da;while(1){if((a[W]|0)!=(a[qa]|0)){Pa=X;Qa=ra;Ra=da;Sa=X;break c}ba=W+1|0;if((ba|0)==(ta|0)){Pa=X;Qa=ra;Ra=Ka;Sa=X;break}else{W=ba;qa=qa+1|0}}}}else{Pa=X;Qa=ra;Ra=da;Sa=X}}else{Pa=X;Qa=ra;Ra=da;Sa=X}}while(0);d:while(1){if((Qa&1)==0){Ta=j;Ua=(Qa&255)>>>1}else{Ta=c[H>>2]|0;Ua=c[I>>2]|0}if((Ra|0)==(Ta+Ua|0)){break}da=c[e>>2]|0;do{if((da|0)!=0){if((c[da+12>>2]|0)==(c[da+16>>2]|0)){if((sc[c[(c[da>>2]|0)+36>>2]&127](da)|0)==-1){c[e>>2]=0;Va=0;break}else{Va=c[e>>2]|0;break}}else{Va=da}}else{Va=0}}while(0);da=(Va|0)==0;do{if((Sa|0)!=0){if((c[Sa+12>>2]|0)!=(c[Sa+16>>2]|0)){if(da){Wa=Pa;Xa=Sa;break}else{break d}}if(!((sc[c[(c[Sa>>2]|0)+36>>2]&127](Sa)|0)==-1)){if(da^(Pa|0)==0){Wa=Pa;Xa=Pa;break}else{break d}}else{c[f>>2]=0;Ya=0;aa=147;break}}else{Ya=Pa;aa=147}}while(0);if((aa|0)==147){aa=0;if(da){break}else{Wa=Ya;Xa=0}}ra=c[e>>2]|0;ga=c[ra+12>>2]|0;if((ga|0)==(c[ra+16>>2]|0)){Za=sc[c[(c[ra>>2]|0)+36>>2]&127](ra)|0}else{Za=d[ga]|0}if(!((Za&255)<<24>>24==(a[Ra]|0))){break}ga=c[e>>2]|0;ra=ga+12|0;qa=c[ra>>2]|0;if((qa|0)==(c[ga+16>>2]|0)){sc[c[(c[ga>>2]|0)+40>>2]&127](ga)|0}else{c[ra>>2]=qa+1}Pa=Wa;Qa=a[w]|0;Ra=Ra+1|0;Sa=Xa}if(G){qa=a[w]|0;if((qa&1)==0){_a=j;$a=(qa&255)>>>1}else{_a=c[H>>2]|0;$a=c[I>>2]|0}if((Ra|0)!=(_a+$a|0)){aa=162;break a}else{ia=r;ja=R;ka=Q;la=P;ma=S;na=T}}else{ia=r;ja=R;ka=Q;la=P;ma=S;na=T}break};case 4:{qa=r;ra=Q;ga=P;W=R;ta=0;ba=T;e:while(1){sa=c[e>>2]|0;do{if((sa|0)!=0){if((c[sa+12>>2]|0)==(c[sa+16>>2]|0)){if((sc[c[(c[sa>>2]|0)+36>>2]&127](sa)|0)==-1){c[e>>2]=0;ab=0;break}else{ab=c[e>>2]|0;break}}else{ab=sa}}else{ab=0}}while(0);sa=(ab|0)==0;da=c[f>>2]|0;do{if((da|0)!=0){if((c[da+12>>2]|0)!=(c[da+16>>2]|0)){if(sa){break}else{break e}}if(!((sc[c[(c[da>>2]|0)+36>>2]&127](da)|0)==-1)){if(sa){break}else{break e}}else{c[f>>2]=0;aa=173;break}}else{aa=173}}while(0);if((aa|0)==173?(aa=0,sa):0){break}da=c[e>>2]|0;bb=c[da+12>>2]|0;if((bb|0)==(c[da+16>>2]|0)){cb=sc[c[(c[da>>2]|0)+36>>2]&127](da)|0}else{cb=d[bb]|0}bb=cb&255;if(bb<<24>>24>-1?!((b[(c[h>>2]|0)+(cb<<24>>24<<1)>>1]&2048)==0):0){da=c[o>>2]|0;if((da|0)==(qa|0)){db=(c[N>>2]|0)!=119;eb=c[n>>2]|0;fb=qa-eb|0;gb=fb>>>0<2147483647?fb<<1:-1;hb=Tm(db?eb:0,gb)|0;if((hb|0)==0){aa=182;break a}if(!db){db=c[n>>2]|0;c[n>>2]=hb;if((db|0)==0){ib=hb}else{pc[c[N>>2]&255](db);ib=c[n>>2]|0}}else{c[n>>2]=hb;ib=hb}c[N>>2]=120;hb=ib+fb|0;c[o>>2]=hb;jb=hb;kb=(c[n>>2]|0)+gb|0}else{jb=da;kb=qa}c[o>>2]=jb+1;a[jb]=bb;lb=kb;mb=W;nb=ra;ob=ga;pb=ta+1|0;qb=ba}else{da=a[v]|0;if((da&1)==0){rb=(da&255)>>>1}else{rb=c[O>>2]|0}if((rb|0)==0|(ta|0)==0){break}if(!(bb<<24>>24==(a[u]|0))){break}if((ra|0)==(ga|0)){bb=ra-W|0;da=bb>>>0<2147483647?bb<<1:-1;if((ba|0)==119){sb=0}else{sb=W}gb=Tm(sb,da)|0;if((gb|0)==0){aa=198;break a}tb=gb+(bb>>2<<2)|0;ub=gb;vb=gb+(da>>>2<<2)|0;wb=120}else{tb=ra;ub=W;vb=ga;wb=ba}c[tb>>2]=ta;lb=qa;mb=ub;nb=tb+4|0;ob=vb;pb=0;qb=wb}da=c[e>>2]|0;gb=da+12|0;bb=c[gb>>2]|0;if((bb|0)==(c[da+16>>2]|0)){sc[c[(c[da>>2]|0)+40>>2]&127](da)|0;qa=lb;ra=nb;ga=ob;W=mb;ta=pb;ba=qb;continue}else{c[gb>>2]=bb+1;qa=lb;ra=nb;ga=ob;W=mb;ta=pb;ba=qb;continue}}if((W|0)==(ra|0)|(ta|0)==0){xb=W;yb=ra;zb=ga;Ab=ba}else{if((ra|0)==(ga|0)){bb=ra-W|0;gb=bb>>>0<2147483647?bb<<1:-1;if((ba|0)==119){Bb=0}else{Bb=W}da=Tm(Bb,gb)|0;if((da|0)==0){aa=209;break a}Cb=da+(bb>>2<<2)|0;Db=da;Eb=da+(gb>>>2<<2)|0;Fb=120}else{Cb=ra;Db=W;Eb=ga;Fb=ba}c[Cb>>2]=ta;xb=Db;yb=Cb+4|0;zb=Eb;Ab=Fb}gb=c[A>>2]|0;if((gb|0)>0){da=c[e>>2]|0;do{if((da|0)!=0){if((c[da+12>>2]|0)==(c[da+16>>2]|0)){if((sc[c[(c[da>>2]|0)+36>>2]&127](da)|0)==-1){c[e>>2]=0;Gb=0;break}else{Gb=c[e>>2]|0;break}}else{Gb=da}}else{Gb=0}}while(0);da=(Gb|0)==0;ta=c[f>>2]|0;do{if((ta|0)!=0){if((c[ta+12>>2]|0)!=(c[ta+16>>2]|0)){if(da){Hb=ta;break}else{aa=229;break a}}if(!((sc[c[(c[ta>>2]|0)+36>>2]&127](ta)|0)==-1)){if(da){Hb=ta;break}else{aa=229;break a}}else{c[f>>2]=0;aa=223;break}}else{aa=223}}while(0);if((aa|0)==223){aa=0;if(da){aa=229;break a}else{Hb=0}}ta=c[e>>2]|0;ba=c[ta+12>>2]|0;if((ba|0)==(c[ta+16>>2]|0)){Ib=sc[c[(c[ta>>2]|0)+36>>2]&127](ta)|0}else{Ib=d[ba]|0}if(!((Ib&255)<<24>>24==(a[t]|0))){aa=229;break a}ba=c[e>>2]|0;ta=ba+12|0;ga=c[ta>>2]|0;if((ga|0)==(c[ba+16>>2]|0)){sc[c[(c[ba>>2]|0)+40>>2]&127](ba)|0;Jb=Hb;Kb=Hb;Lb=qa;Mb=gb}else{c[ta>>2]=ga+1;Jb=Hb;Kb=Hb;Lb=qa;Mb=gb}while(1){ga=c[e>>2]|0;do{if((ga|0)!=0){if((c[ga+12>>2]|0)==(c[ga+16>>2]|0)){if((sc[c[(c[ga>>2]|0)+36>>2]&127](ga)|0)==-1){c[e>>2]=0;Nb=0;break}else{Nb=c[e>>2]|0;break}}else{Nb=ga}}else{Nb=0}}while(0);ga=(Nb|0)==0;do{if((Kb|0)!=0){if((c[Kb+12>>2]|0)!=(c[Kb+16>>2]|0)){if(ga){Ob=Jb;Pb=Kb;break}else{aa=250;break a}}if(!((sc[c[(c[Kb>>2]|0)+36>>2]&127](Kb)|0)==-1)){if(ga^(Jb|0)==0){Ob=Jb;Pb=Jb;break}else{aa=250;break a}}else{c[f>>2]=0;Qb=0;aa=243;break}}else{Qb=Jb;aa=243}}while(0);if((aa|0)==243){aa=0;if(ga){aa=250;break a}else{Ob=Qb;Pb=0}}sa=c[e>>2]|0;ta=c[sa+12>>2]|0;if((ta|0)==(c[sa+16>>2]|0)){Rb=sc[c[(c[sa>>2]|0)+36>>2]&127](sa)|0}else{Rb=d[ta]|0}if(!((Rb&255)<<24>>24>-1)){aa=250;break a}if((b[(c[h>>2]|0)+(Rb<<24>>24<<1)>>1]&2048)==0){aa=250;break a}ta=c[o>>2]|0;if((ta|0)==(Lb|0)){sa=(c[N>>2]|0)!=119;ba=c[n>>2]|0;W=Lb-ba|0;ra=W>>>0<2147483647?W<<1:-1;bb=Tm(sa?ba:0,ra)|0;if((bb|0)==0){aa=253;break a}if(!sa){sa=c[n>>2]|0;c[n>>2]=bb;if((sa|0)==0){Sb=bb}else{pc[c[N>>2]&255](sa);Sb=c[n>>2]|0}}else{c[n>>2]=bb;Sb=bb}c[N>>2]=120;bb=Sb+W|0;c[o>>2]=bb;Tb=bb;Ub=(c[n>>2]|0)+ra|0}else{Tb=ta;Ub=Lb}ta=c[e>>2]|0;ra=c[ta+12>>2]|0;if((ra|0)==(c[ta+16>>2]|0)){bb=sc[c[(c[ta>>2]|0)+36>>2]&127](ta)|0;Vb=bb;Wb=c[o>>2]|0}else{Vb=d[ra]|0;Wb=Tb}c[o>>2]=Wb+1;a[Wb]=Vb;ra=Mb+ -1|0;c[A>>2]=ra;bb=c[e>>2]|0;ta=bb+12|0;W=c[ta>>2]|0;if((W|0)==(c[bb+16>>2]|0)){sc[c[(c[bb>>2]|0)+40>>2]&127](bb)|0}else{c[ta>>2]=W+1}if((ra|0)>0){Jb=Ob;Kb=Pb;Lb=Ub;Mb=ra}else{Xb=Ub;break}}}else{Xb=qa}if((c[o>>2]|0)==(c[n>>2]|0)){aa=267;break a}else{ia=Xb;ja=xb;ka=yb;la=zb;ma=S;na=Ab}break};default:{ia=r;ja=R;ka=Q;la=P;ma=S;na=T}}}while(0);f:do{if((aa|0)==26){aa=0;if((p|0)==3){Y=R;Z=Q;_=S;$=T;aa=269;break a}else{Yb=X;Zb=X}while(1){U=c[e>>2]|0;do{if((U|0)!=0){if((c[U+12>>2]|0)==(c[U+16>>2]|0)){if((sc[c[(c[U>>2]|0)+36>>2]&127](U)|0)==-1){c[e>>2]=0;_b=0;break}else{_b=c[e>>2]|0;break}}else{_b=U}}else{_b=0}}while(0);U=(_b|0)==0;do{if((Zb|0)!=0){if((c[Zb+12>>2]|0)!=(c[Zb+16>>2]|0)){if(U){$b=Yb;ac=Zb;break}else{ia=r;ja=R;ka=Q;la=P;ma=S;na=T;break f}}if(!((sc[c[(c[Zb>>2]|0)+36>>2]&127](Zb)|0)==-1)){if(U^(Yb|0)==0){$b=Yb;ac=Yb;break}else{ia=r;ja=R;ka=Q;la=P;ma=S;na=T;break f}}else{c[f>>2]=0;bc=0;aa=37;break}}else{bc=Yb;aa=37}}while(0);if((aa|0)==37){aa=0;if(U){ia=r;ja=R;ka=Q;la=P;ma=S;na=T;break f}else{$b=bc;ac=0}}ga=c[e>>2]|0;gb=c[ga+12>>2]|0;if((gb|0)==(c[ga+16>>2]|0)){cc=sc[c[(c[ga>>2]|0)+36>>2]&127](ga)|0}else{cc=d[gb]|0}if(!((cc&255)<<24>>24>-1)){ia=r;ja=R;ka=Q;la=P;ma=S;na=T;break f}if((b[(c[h>>2]|0)+(cc<<24>>24<<1)>>1]&8192)==0){ia=r;ja=R;ka=Q;la=P;ma=S;na=T;break f}gb=c[e>>2]|0;ga=gb+12|0;da=c[ga>>2]|0;if((da|0)==(c[gb+16>>2]|0)){dc=sc[c[(c[gb>>2]|0)+40>>2]&127](gb)|0}else{c[ga>>2]=da+1;dc=d[da]|0}Ke(z,dc&255);Yb=$b;Zb=ac}}}while(0);qa=p+1|0;if(qa>>>0<4){P=la;Q=ka;R=ja;r=ia;p=qa;S=ma;T=na}else{Y=ja;Z=ka;_=ma;$=na;aa=269;break}}g:do{if((aa|0)==25){c[k>>2]=c[k>>2]|4;ec=0;fc=R;gc=T}else if((aa|0)==112){c[k>>2]=c[k>>2]|4;ec=0;fc=R;gc=T}else if((aa|0)==162){c[k>>2]=c[k>>2]|4;ec=0;fc=R;gc=T}else if((aa|0)==182){bn()}else if((aa|0)==198){bn()}else if((aa|0)==209){bn()}else if((aa|0)==229){c[k>>2]=c[k>>2]|4;ec=0;fc=xb;gc=Ab}else if((aa|0)==250){c[k>>2]=c[k>>2]|4;ec=0;fc=xb;gc=Ab}else if((aa|0)==253){bn()}else if((aa|0)==267){c[k>>2]=c[k>>2]|4;ec=0;fc=xb;gc=Ab}else if((aa|0)==269){h:do{if((_|0)!=0){na=_+1|0;ma=_+8|0;ka=_+4|0;ja=1;i:while(1){S=a[_]|0;if((S&1)==0){hc=(S&255)>>>1}else{hc=c[ka>>2]|0}if(!(ja>>>0<hc>>>0)){break h}S=c[e>>2]|0;do{if((S|0)!=0){if((c[S+12>>2]|0)==(c[S+16>>2]|0)){if((sc[c[(c[S>>2]|0)+36>>2]&127](S)|0)==-1){c[e>>2]=0;ic=0;break}else{ic=c[e>>2]|0;break}}else{ic=S}}else{ic=0}}while(0);S=(ic|0)==0;U=c[f>>2]|0;do{if((U|0)!=0){if((c[U+12>>2]|0)!=(c[U+16>>2]|0)){if(S){break}else{break i}}if(!((sc[c[(c[U>>2]|0)+36>>2]&127](U)|0)==-1)){if(S){break}else{break i}}else{c[f>>2]=0;aa=285;break}}else{aa=285}}while(0);if((aa|0)==285?(aa=0,S):0){break}U=c[e>>2]|0;p=c[U+12>>2]|0;if((p|0)==(c[U+16>>2]|0)){jc=sc[c[(c[U>>2]|0)+36>>2]&127](U)|0}else{jc=d[p]|0}if((a[_]&1)==0){kc=na}else{kc=c[ma>>2]|0}if(!((jc&255)<<24>>24==(a[kc+ja|0]|0))){break}p=ja+1|0;U=c[e>>2]|0;ia=U+12|0;r=c[ia>>2]|0;if((r|0)==(c[U+16>>2]|0)){sc[c[(c[U>>2]|0)+40>>2]&127](U)|0;ja=p;continue}else{c[ia>>2]=r+1;ja=p;continue}}c[k>>2]=c[k>>2]|4;ec=0;fc=Y;gc=$;break g}}while(0);if((Y|0)!=(Z|0)){c[B>>2]=0;tj(v,Y,Z,B);if((c[B>>2]|0)==0){ec=1;fc=Y;gc=$}else{c[k>>2]=c[k>>2]|4;ec=0;fc=Y;gc=$}}else{ec=1;fc=Z;gc=$}}}while(0);Fe(z);Fe(y);Fe(x);Fe(w);Fe(v);if((fc|0)==0){i=q;return ec|0}pc[gc&255](fc);i=q;return ec|0}function pj(a){a=a|0;var b=0;b=xb(8)|0;me(b,a);ec(b|0,3008,16)}function qj(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0;d=i;i=i+144|0;l=d;m=d+36|0;n=d+16|0;o=d+32|0;p=d+28|0;q=d+136|0;r=d+24|0;c[n>>2]=m;s=n+4|0;c[s>>2]=119;t=m+100|0;Ze(p,h);m=c[p>>2]|0;if(!((c[1500]|0)==-1)){c[l>>2]=6e3;c[l+4>>2]=117;c[l+8>>2]=0;Ae(6e3,l,118)}u=(c[6004>>2]|0)+ -1|0;v=c[m+8>>2]|0;if(!((c[m+12>>2]|0)-v>>2>>>0>u>>>0)){w=xb(4)|0;wm(w);ec(w|0,13960,106)}m=c[v+(u<<2)>>2]|0;if((m|0)==0){w=xb(4)|0;wm(w);ec(w|0,13960,106)}a[q]=0;w=c[f>>2]|0;c[r>>2]=w;u=c[h+4>>2]|0;c[l+0>>2]=c[r+0>>2];if(oj(e,l,g,p,u,j,q,m,n,o,t)|0){if((a[k]&1)==0){a[k+1|0]=0;a[k]=0}else{a[c[k+8>>2]|0]=0;c[k+4>>2]=0}if((a[q]|0)!=0){Ke(k,Bc[c[(c[m>>2]|0)+28>>2]&15](m,45)|0)}q=Bc[c[(c[m>>2]|0)+28>>2]&15](m,48)|0;m=c[n>>2]|0;t=c[o>>2]|0;o=t+ -1|0;a:do{if(m>>>0<o>>>0){u=m;while(1){g=u+1|0;if(!((a[u]|0)==q<<24>>24)){x=u;break a}if(g>>>0<o>>>0){u=g}else{x=g;break}}}else{x=m}}while(0);rj(k,x,t)|0}t=c[e>>2]|0;if((t|0)!=0){if((c[t+12>>2]|0)==(c[t+16>>2]|0)?(sc[c[(c[t>>2]|0)+36>>2]&127](t)|0)==-1:0){c[e>>2]=0;y=0}else{y=t}}else{y=0}t=(y|0)==0;do{if((w|0)!=0){if((c[w+12>>2]|0)!=(c[w+16>>2]|0)){if(t){break}else{z=27;break}}if(!((sc[c[(c[w>>2]|0)+36>>2]&127](w)|0)==-1)){if(t^(w|0)==0){break}else{z=27;break}}else{c[f>>2]=0;z=25;break}}else{z=25}}while(0);if((z|0)==25?t:0){z=27}if((z|0)==27){c[j>>2]=c[j>>2]|2}c[b>>2]=y;ge(c[p>>2]|0)|0;p=c[n>>2]|0;c[n>>2]=0;if((p|0)==0){i=d;return}pc[c[s>>2]&255](p);i=d;return}function rj(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0;f=i;g=d;h=a[b]|0;if((h&1)==0){j=10;k=(h&255)>>>1;l=h}else{h=c[b>>2]|0;j=(h&-2)+ -1|0;k=c[b+4>>2]|0;l=h&255}h=e-g|0;if((e|0)==(d|0)){i=f;return b|0}if((j-k|0)>>>0<h>>>0){Ne(b,j,k+h-j|0,k,k,0,0);m=a[b]|0}else{m=l}if((m&1)==0){n=b+1|0}else{n=c[b+8>>2]|0}m=e+(k-g)|0;g=d;d=n+k|0;while(1){a[d]=a[g]|0;g=g+1|0;if((g|0)==(e|0)){break}else{d=d+1|0}}a[n+m|0]=0;m=k+h|0;if((a[b]&1)==0){a[b]=m<<1;i=f;return b|0}else{c[b+4>>2]=m;i=f;return b|0}return 0}function sj(b,d,e,f,g,h,j,k,l,m){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;n=i;i=i+128|0;o=n;p=n+24|0;q=n+44|0;r=n+32|0;s=n+56|0;t=n+12|0;u=n+28|0;v=n+68|0;w=n+80|0;x=n+92|0;y=n+104|0;if(b){b=c[d>>2]|0;if(!((c[1360]|0)==-1)){c[o>>2]=5440;c[o+4>>2]=117;c[o+8>>2]=0;Ae(5440,o,118)}z=(c[5444>>2]|0)+ -1|0;A=c[b+8>>2]|0;if(!((c[b+12>>2]|0)-A>>2>>>0>z>>>0)){B=xb(4)|0;wm(B);ec(B|0,13960,106)}b=c[A+(z<<2)>>2]|0;if((b|0)==0){B=xb(4)|0;wm(B);ec(B|0,13960,106)}qc[c[(c[b>>2]|0)+44>>2]&63](p,b);B=c[p>>2]|0;a[e]=B;a[e+1|0]=B>>8;a[e+2|0]=B>>16;a[e+3|0]=B>>24;qc[c[(c[b>>2]|0)+32>>2]&63](q,b);if((a[l]&1)==0){a[l+1|0]=0;a[l]=0}else{a[c[l+8>>2]|0]=0;c[l+4>>2]=0}Je(l,0);c[l+0>>2]=c[q+0>>2];c[l+4>>2]=c[q+4>>2];c[l+8>>2]=c[q+8>>2];c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;Fe(q);qc[c[(c[b>>2]|0)+28>>2]&63](r,b);if((a[k]&1)==0){a[k+1|0]=0;a[k]=0}else{a[c[k+8>>2]|0]=0;c[k+4>>2]=0}Je(k,0);c[k+0>>2]=c[r+0>>2];c[k+4>>2]=c[r+4>>2];c[k+8>>2]=c[r+8>>2];c[r+0>>2]=0;c[r+4>>2]=0;c[r+8>>2]=0;Fe(r);a[f]=sc[c[(c[b>>2]|0)+12>>2]&127](b)|0;a[g]=sc[c[(c[b>>2]|0)+16>>2]&127](b)|0;qc[c[(c[b>>2]|0)+20>>2]&63](s,b);if((a[h]&1)==0){a[h+1|0]=0;a[h]=0}else{a[c[h+8>>2]|0]=0;c[h+4>>2]=0}Je(h,0);c[h+0>>2]=c[s+0>>2];c[h+4>>2]=c[s+4>>2];c[h+8>>2]=c[s+8>>2];c[s+0>>2]=0;c[s+4>>2]=0;c[s+8>>2]=0;Fe(s);qc[c[(c[b>>2]|0)+24>>2]&63](t,b);if((a[j]&1)==0){a[j+1|0]=0;a[j]=0}else{a[c[j+8>>2]|0]=0;c[j+4>>2]=0}Je(j,0);c[j+0>>2]=c[t+0>>2];c[j+4>>2]=c[t+4>>2];c[j+8>>2]=c[t+8>>2];c[t+0>>2]=0;c[t+4>>2]=0;c[t+8>>2]=0;Fe(t);C=sc[c[(c[b>>2]|0)+36>>2]&127](b)|0;c[m>>2]=C;i=n;return}else{b=c[d>>2]|0;if(!((c[1344]|0)==-1)){c[o>>2]=5376;c[o+4>>2]=117;c[o+8>>2]=0;Ae(5376,o,118)}o=(c[5380>>2]|0)+ -1|0;d=c[b+8>>2]|0;if(!((c[b+12>>2]|0)-d>>2>>>0>o>>>0)){D=xb(4)|0;wm(D);ec(D|0,13960,106)}b=c[d+(o<<2)>>2]|0;if((b|0)==0){D=xb(4)|0;wm(D);ec(D|0,13960,106)}qc[c[(c[b>>2]|0)+44>>2]&63](u,b);D=c[u>>2]|0;a[e]=D;a[e+1|0]=D>>8;a[e+2|0]=D>>16;a[e+3|0]=D>>24;qc[c[(c[b>>2]|0)+32>>2]&63](v,b);if((a[l]&1)==0){a[l+1|0]=0;a[l]=0}else{a[c[l+8>>2]|0]=0;c[l+4>>2]=0}Je(l,0);c[l+0>>2]=c[v+0>>2];c[l+4>>2]=c[v+4>>2];c[l+8>>2]=c[v+8>>2];c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;Fe(v);qc[c[(c[b>>2]|0)+28>>2]&63](w,b);if((a[k]&1)==0){a[k+1|0]=0;a[k]=0}else{a[c[k+8>>2]|0]=0;c[k+4>>2]=0}Je(k,0);c[k+0>>2]=c[w+0>>2];c[k+4>>2]=c[w+4>>2];c[k+8>>2]=c[w+8>>2];c[w+0>>2]=0;c[w+4>>2]=0;c[w+8>>2]=0;Fe(w);a[f]=sc[c[(c[b>>2]|0)+12>>2]&127](b)|0;a[g]=sc[c[(c[b>>2]|0)+16>>2]&127](b)|0;qc[c[(c[b>>2]|0)+20>>2]&63](x,b);if((a[h]&1)==0){a[h+1|0]=0;a[h]=0}else{a[c[h+8>>2]|0]=0;c[h+4>>2]=0}Je(h,0);c[h+0>>2]=c[x+0>>2];c[h+4>>2]=c[x+4>>2];c[h+8>>2]=c[x+8>>2];c[x+0>>2]=0;c[x+4>>2]=0;c[x+8>>2]=0;Fe(x);qc[c[(c[b>>2]|0)+24>>2]&63](y,b);if((a[j]&1)==0){a[j+1|0]=0;a[j]=0}else{a[c[j+8>>2]|0]=0;c[j+4>>2]=0}Je(j,0);c[j+0>>2]=c[y+0>>2];c[j+4>>2]=c[y+4>>2];c[j+8>>2]=c[y+8>>2];c[y+0>>2]=0;c[y+4>>2]=0;c[y+8>>2]=0;Fe(y);C=sc[c[(c[b>>2]|0)+36>>2]&127](b)|0;c[m>>2]=C;i=n;return}}function tj(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;g=i;h=a[b]|0;if((h&1)==0){j=(h&255)>>>1}else{j=c[b+4>>2]|0}if((j|0)==0){i=g;return}if((d|0)!=(e|0)?(j=e+ -4|0,j>>>0>d>>>0):0){k=d;l=j;do{j=c[k>>2]|0;c[k>>2]=c[l>>2];c[l>>2]=j;k=k+4|0;l=l+ -4|0}while(k>>>0<l>>>0);m=a[b]|0}else{m=h}if((m&1)==0){n=b+1|0;o=(m&255)>>>1}else{n=c[b+8>>2]|0;o=c[b+4>>2]|0}b=e+ -4|0;e=a[n]|0;m=e<<24>>24<1|e<<24>>24==127;a:do{if(b>>>0>d>>>0){h=n+o|0;l=e;k=n;j=d;p=m;while(1){if(!p?(l<<24>>24|0)!=(c[j>>2]|0):0){break}q=(h-k|0)>1?k+1|0:k;r=j+4|0;s=a[q]|0;t=s<<24>>24<1|s<<24>>24==127;if(r>>>0<b>>>0){l=s;k=q;j=r;p=t}else{u=s;v=t;break a}}c[f>>2]=4;i=g;return}else{u=e;v=m}}while(0);if(v){i=g;return}v=c[b>>2]|0;if(!(u<<24>>24>>>0<v>>>0|(v|0)==0)){i=g;return}c[f>>2]=4;i=g;return}function uj(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function vj(a){a=a|0;return}function wj(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0;d=i;i=i+592|0;l=d;m=d+72|0;n=d+64|0;o=d+56|0;p=d+476|0;q=d+580|0;r=d+472|0;s=d+16|0;t=d+480|0;c[n>>2]=m;u=n+4|0;c[u>>2]=119;v=m+400|0;Ze(p,h);m=c[p>>2]|0;if(!((c[1498]|0)==-1)){c[l>>2]=5992;c[l+4>>2]=117;c[l+8>>2]=0;Ae(5992,l,118)}w=(c[5996>>2]|0)+ -1|0;x=c[m+8>>2]|0;if(!((c[m+12>>2]|0)-x>>2>>>0>w>>>0)){y=xb(4)|0;wm(y);ec(y|0,13960,106)}m=c[x+(w<<2)>>2]|0;if((m|0)==0){y=xb(4)|0;wm(y);ec(y|0,13960,106)}a[q]=0;c[r>>2]=c[f>>2];y=c[h+4>>2]|0;c[l+0>>2]=c[r+0>>2];if(xj(e,l,g,p,y,j,q,m,n,o,v)|0){yc[c[(c[m>>2]|0)+48>>2]&7](m,5696,5706|0,s)|0;m=c[o>>2]|0;v=c[n>>2]|0;y=m-v|0;if((y|0)>392){g=Rm((y>>2)+2|0)|0;if((g|0)==0){bn()}else{z=g;A=g}}else{z=0;A=t}if((a[q]|0)==0){B=A}else{a[A]=45;B=A+1|0}if(v>>>0<m>>>0){m=s+40|0;A=s;q=B;g=v;while(1){v=c[g>>2]|0;y=s;while(1){r=y+4|0;if((c[y>>2]|0)==(v|0)){C=y;break}if((r|0)==(m|0)){C=m;break}else{y=r}}a[q]=a[5696+(C-A>>2)|0]|0;y=g+4|0;v=q+1|0;if(y>>>0<(c[o>>2]|0)>>>0){q=v;g=y}else{D=v;break}}}else{D=B}a[D]=0;c[l>>2]=k;if((Ia(t|0,5632,l|0)|0)!=1){l=xb(8)|0;me(l,5640);ec(l|0,3008,16)}if((z|0)!=0){Sm(z)}}z=c[e>>2]|0;do{if((z|0)!=0){l=c[z+12>>2]|0;if((l|0)==(c[z+16>>2]|0)){E=sc[c[(c[z>>2]|0)+36>>2]&127](z)|0}else{E=c[l>>2]|0}if((E|0)==-1){c[e>>2]=0;F=1;break}else{F=(c[e>>2]|0)==0;break}}else{F=1}}while(0);E=c[f>>2]|0;do{if((E|0)!=0){z=c[E+12>>2]|0;if((z|0)==(c[E+16>>2]|0)){G=sc[c[(c[E>>2]|0)+36>>2]&127](E)|0}else{G=c[z>>2]|0}if(!((G|0)==-1)){if(F){break}else{H=37;break}}else{c[f>>2]=0;H=35;break}}else{H=35}}while(0);if((H|0)==35?F:0){H=37}if((H|0)==37){c[j>>2]=c[j>>2]|2}c[b>>2]=c[e>>2];ge(c[p>>2]|0)|0;p=c[n>>2]|0;c[n>>2]=0;if((p|0)==0){i=d;return}pc[c[u>>2]&255](p);i=d;return}function xj(b,e,f,g,h,j,k,l,m,n,o){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;var p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0,la=0,ma=0,na=0,oa=0,pa=0,qa=0,ra=0,sa=0,ta=0,ua=0,va=0,wa=0,xa=0,ya=0,za=0,Aa=0,Ba=0,Ca=0,Da=0,Ea=0,Fa=0,Ga=0,Ha=0,Ia=0,Ja=0,Ka=0,La=0,Ma=0,Na=0,Oa=0,Pa=0,Qa=0,Ra=0,Sa=0,Ta=0,Ua=0,Va=0,Wa=0,Xa=0,Ya=0,Za=0,_a=0,$a=0,ab=0,bb=0,cb=0,db=0,eb=0,fb=0,gb=0,hb=0,ib=0,jb=0,kb=0,lb=0,mb=0,nb=0,ob=0,pb=0,qb=0,rb=0,sb=0,tb=0,ub=0,vb=0,wb=0,xb=0,yb=0,zb=0,Ab=0,Bb=0,Cb=0,Db=0,Eb=0,Fb=0,Gb=0,Hb=0,Ib=0,Jb=0,Kb=0,Lb=0,Mb=0,Nb=0,Ob=0,Pb=0,Qb=0,Rb=0,Sb=0,Tb=0,Ub=0,Vb=0,Wb=0,Xb=0,Yb=0,Zb=0,_b=0,$b=0,ac=0,bc=0,cc=0,dc=0,ec=0,fc=0,gc=0,hc=0,ic=0,jc=0,lc=0,mc=0,nc=0,oc=0,qc=0,rc=0,tc=0,uc=0,vc=0,wc=0;p=i;i=i+496|0;q=p+72|0;r=p+24|0;s=p;t=p+52|0;u=p+56|0;v=p+472|0;w=p+12|0;x=p+40|0;y=p+28|0;z=p+8|0;A=p+4|0;c[r>>2]=0;c[u+0>>2]=0;c[u+4>>2]=0;c[u+8>>2]=0;c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;c[w+0>>2]=0;c[w+4>>2]=0;c[w+8>>2]=0;c[x+0>>2]=0;c[x+4>>2]=0;c[x+8>>2]=0;c[y+0>>2]=0;c[y+4>>2]=0;c[y+8>>2]=0;Aj(f,g,r,s,t,u,v,w,x,z);c[n>>2]=c[m>>2];g=x+4|0;f=x+8|0;B=w+4|0;C=w+8|0;D=(h&512|0)!=0;h=v+4|0;E=v+8|0;F=y+4|0;G=y+8|0;H=r+3|0;I=m+4|0;J=u+4|0;K=q+400|0;L=q;M=q;q=o;o=0;N=0;O=119;a:while(1){P=c[b>>2]|0;do{if((P|0)!=0){Q=c[P+12>>2]|0;if((Q|0)==(c[P+16>>2]|0)){R=sc[c[(c[P>>2]|0)+36>>2]&127](P)|0}else{R=c[Q>>2]|0}if((R|0)==-1){c[b>>2]=0;S=1;break}else{S=(c[b>>2]|0)==0;break}}else{S=1}}while(0);P=c[e>>2]|0;do{if((P|0)!=0){Q=c[P+12>>2]|0;if((Q|0)==(c[P+16>>2]|0)){T=sc[c[(c[P>>2]|0)+36>>2]&127](P)|0}else{T=c[Q>>2]|0}if(!((T|0)==-1)){if(S){U=P;break}else{V=M;W=L;X=N;Y=O;Z=292;break a}}else{c[e>>2]=0;Z=15;break}}else{Z=15}}while(0);if((Z|0)==15){Z=0;if(S){V=M;W=L;X=N;Y=O;Z=292;break}else{U=0}}b:do{switch(a[r+o|0]|0){case 1:{if((o|0)==3){V=M;W=L;X=N;Y=O;Z=292;break a}P=c[b>>2]|0;Q=c[P+12>>2]|0;if((Q|0)==(c[P+16>>2]|0)){_=sc[c[(c[P>>2]|0)+36>>2]&127](P)|0}else{_=c[Q>>2]|0}if(!(kc[c[(c[l>>2]|0)+12>>2]&31](l,8192,_)|0)){Z=27;break a}Q=c[b>>2]|0;P=Q+12|0;$=c[P>>2]|0;if(($|0)==(c[Q+16>>2]|0)){aa=sc[c[(c[Q>>2]|0)+40>>2]&127](Q)|0}else{c[P>>2]=$+4;aa=c[$>>2]|0}Ue(y,aa);Z=28;break};case 0:{Z=28;break};case 3:{$=a[w]|0;P=($&1)==0;if(P){ba=($&255)>>>1}else{ba=c[B>>2]|0}Q=a[x]|0;ca=(Q&1)==0;if(ca){da=(Q&255)>>>1}else{da=c[g>>2]|0}if((ba|0)==(0-da|0)){ea=q;fa=M;ga=L;ha=K;ia=N;ja=O}else{if(P){ka=($&255)>>>1}else{ka=c[B>>2]|0}if((ka|0)!=0){if(ca){la=(Q&255)>>>1}else{la=c[g>>2]|0}if((la|0)!=0){ca=c[b>>2]|0;ma=c[ca+12>>2]|0;if((ma|0)==(c[ca+16>>2]|0)){na=sc[c[(c[ca>>2]|0)+36>>2]&127](ca)|0;oa=na;pa=a[w]|0}else{oa=c[ma>>2]|0;pa=$}ma=c[b>>2]|0;na=ma+12|0;ca=c[na>>2]|0;qa=(ca|0)==(c[ma+16>>2]|0);if((oa|0)==(c[((pa&1)==0?B:c[C>>2]|0)>>2]|0)){if(qa){sc[c[(c[ma>>2]|0)+40>>2]&127](ma)|0}else{c[na>>2]=ca+4}na=a[w]|0;if((na&1)==0){ra=(na&255)>>>1}else{ra=c[B>>2]|0}ea=q;fa=M;ga=L;ha=K;ia=ra>>>0>1?w:N;ja=O;break b}if(qa){sa=sc[c[(c[ma>>2]|0)+36>>2]&127](ma)|0}else{sa=c[ca>>2]|0}if((sa|0)!=(c[((a[x]&1)==0?g:c[f>>2]|0)>>2]|0)){Z=116;break a}ca=c[b>>2]|0;ma=ca+12|0;qa=c[ma>>2]|0;if((qa|0)==(c[ca+16>>2]|0)){sc[c[(c[ca>>2]|0)+40>>2]&127](ca)|0}else{c[ma>>2]=qa+4}a[k]=1;qa=a[x]|0;if((qa&1)==0){ta=(qa&255)>>>1}else{ta=c[g>>2]|0}ea=q;fa=M;ga=L;ha=K;ia=ta>>>0>1?x:N;ja=O;break b}}if(P){ua=($&255)>>>1}else{ua=c[B>>2]|0}P=c[b>>2]|0;qa=c[P+12>>2]|0;ma=(qa|0)==(c[P+16>>2]|0);if((ua|0)==0){if(ma){ca=sc[c[(c[P>>2]|0)+36>>2]&127](P)|0;va=ca;wa=a[x]|0}else{va=c[qa>>2]|0;wa=Q}if((va|0)!=(c[((wa&1)==0?g:c[f>>2]|0)>>2]|0)){ea=q;fa=M;ga=L;ha=K;ia=N;ja=O;break b}Q=c[b>>2]|0;ca=Q+12|0;na=c[ca>>2]|0;if((na|0)==(c[Q+16>>2]|0)){sc[c[(c[Q>>2]|0)+40>>2]&127](Q)|0}else{c[ca>>2]=na+4}a[k]=1;na=a[x]|0;if((na&1)==0){xa=(na&255)>>>1}else{xa=c[g>>2]|0}ea=q;fa=M;ga=L;ha=K;ia=xa>>>0>1?x:N;ja=O;break b}if(ma){ma=sc[c[(c[P>>2]|0)+36>>2]&127](P)|0;ya=ma;za=a[w]|0}else{ya=c[qa>>2]|0;za=$}if((ya|0)!=(c[((za&1)==0?B:c[C>>2]|0)>>2]|0)){a[k]=1;ea=q;fa=M;ga=L;ha=K;ia=N;ja=O;break b}$=c[b>>2]|0;qa=$+12|0;ma=c[qa>>2]|0;if((ma|0)==(c[$+16>>2]|0)){sc[c[(c[$>>2]|0)+40>>2]&127]($)|0}else{c[qa>>2]=ma+4}ma=a[w]|0;if((ma&1)==0){Aa=(ma&255)>>>1}else{Aa=c[B>>2]|0}ea=q;fa=M;ga=L;ha=K;ia=Aa>>>0>1?w:N;ja=O}break};case 4:{ma=q;qa=L;$=K;P=M;na=0;ca=O;c:while(1){Q=c[b>>2]|0;do{if((Q|0)!=0){Ba=c[Q+12>>2]|0;if((Ba|0)==(c[Q+16>>2]|0)){Ca=sc[c[(c[Q>>2]|0)+36>>2]&127](Q)|0}else{Ca=c[Ba>>2]|0}if((Ca|0)==-1){c[b>>2]=0;Da=1;break}else{Da=(c[b>>2]|0)==0;break}}else{Da=1}}while(0);Q=c[e>>2]|0;do{if((Q|0)!=0){Ba=c[Q+12>>2]|0;if((Ba|0)==(c[Q+16>>2]|0)){Ea=sc[c[(c[Q>>2]|0)+36>>2]&127](Q)|0}else{Ea=c[Ba>>2]|0}if(!((Ea|0)==-1)){if(Da){break}else{break c}}else{c[e>>2]=0;Z=188;break}}else{Z=188}}while(0);if((Z|0)==188?(Z=0,Da):0){break}Q=c[b>>2]|0;Ba=c[Q+12>>2]|0;if((Ba|0)==(c[Q+16>>2]|0)){Fa=sc[c[(c[Q>>2]|0)+36>>2]&127](Q)|0}else{Fa=c[Ba>>2]|0}if(kc[c[(c[l>>2]|0)+12>>2]&31](l,2048,Fa)|0){Ba=c[n>>2]|0;if((Ba|0)==(ma|0)){Q=(c[I>>2]|0)!=119;Ga=c[m>>2]|0;Ha=ma-Ga|0;Ia=Ha>>>0<2147483647?Ha<<1:-1;Ja=Ha>>2;if(Q){Ka=Ga}else{Ka=0}Ga=Tm(Ka,Ia)|0;if((Ga|0)==0){Z=198;break a}if(!Q){Q=c[m>>2]|0;c[m>>2]=Ga;if((Q|0)==0){La=Ga}else{pc[c[I>>2]&255](Q);La=c[m>>2]|0}}else{c[m>>2]=Ga;La=Ga}c[I>>2]=120;Ga=La+(Ja<<2)|0;c[n>>2]=Ga;Ma=Ga;Na=(c[m>>2]|0)+(Ia>>>2<<2)|0}else{Ma=Ba;Na=ma}c[n>>2]=Ma+4;c[Ma>>2]=Fa;Oa=Na;Pa=P;Qa=qa;Ra=$;Sa=na+1|0;Ta=ca}else{Ba=a[u]|0;if((Ba&1)==0){Ua=(Ba&255)>>>1}else{Ua=c[J>>2]|0}if((Ua|0)==0|(na|0)==0){break}if((Fa|0)!=(c[t>>2]|0)){break}if((qa|0)==($|0)){Ba=qa-P|0;Ia=Ba>>>0<2147483647?Ba<<1:-1;if((ca|0)!=119){Va=P}else{Va=0}Ga=Tm(Va,Ia)|0;if((Ga|0)==0){Z=214;break a}Wa=Ga+(Ba>>2<<2)|0;Xa=Ga;Ya=Ga+(Ia>>>2<<2)|0;Za=120}else{Wa=qa;Xa=P;Ya=$;Za=ca}c[Wa>>2]=na;Oa=ma;Pa=Xa;Qa=Wa+4|0;Ra=Ya;Sa=0;Ta=Za}Ia=c[b>>2]|0;Ga=Ia+12|0;Ba=c[Ga>>2]|0;if((Ba|0)==(c[Ia+16>>2]|0)){sc[c[(c[Ia>>2]|0)+40>>2]&127](Ia)|0;ma=Oa;qa=Qa;$=Ra;P=Pa;na=Sa;ca=Ta;continue}else{c[Ga>>2]=Ba+4;ma=Oa;qa=Qa;$=Ra;P=Pa;na=Sa;ca=Ta;continue}}if((P|0)==(qa|0)|(na|0)==0){_a=P;$a=qa;ab=$;bb=ca}else{if((qa|0)==($|0)){Ba=qa-P|0;Ga=Ba>>>0<2147483647?Ba<<1:-1;if((ca|0)!=119){cb=P}else{cb=0}Ia=Tm(cb,Ga)|0;if((Ia|0)==0){Z=225;break a}db=Ia+(Ba>>2<<2)|0;eb=Ia;fb=Ia+(Ga>>>2<<2)|0;gb=120}else{db=qa;eb=P;fb=$;gb=ca}c[db>>2]=na;_a=eb;$a=db+4|0;ab=fb;bb=gb}Ga=c[z>>2]|0;if((Ga|0)>0){Ia=c[b>>2]|0;do{if((Ia|0)!=0){Ba=c[Ia+12>>2]|0;if((Ba|0)==(c[Ia+16>>2]|0)){hb=sc[c[(c[Ia>>2]|0)+36>>2]&127](Ia)|0}else{hb=c[Ba>>2]|0}if((hb|0)==-1){c[b>>2]=0;ib=1;break}else{ib=(c[b>>2]|0)==0;break}}else{ib=1}}while(0);Ia=c[e>>2]|0;do{if((Ia|0)!=0){na=c[Ia+12>>2]|0;if((na|0)==(c[Ia+16>>2]|0)){jb=sc[c[(c[Ia>>2]|0)+36>>2]&127](Ia)|0}else{jb=c[na>>2]|0}if(!((jb|0)==-1)){if(ib){kb=Ia;break}else{Z=248;break a}}else{c[e>>2]=0;Z=242;break}}else{Z=242}}while(0);if((Z|0)==242){Z=0;if(ib){Z=248;break a}else{kb=0}}Ia=c[b>>2]|0;na=c[Ia+12>>2]|0;if((na|0)==(c[Ia+16>>2]|0)){lb=sc[c[(c[Ia>>2]|0)+36>>2]&127](Ia)|0}else{lb=c[na>>2]|0}if((lb|0)!=(c[s>>2]|0)){Z=248;break a}na=c[b>>2]|0;Ia=na+12|0;ca=c[Ia>>2]|0;if((ca|0)==(c[na+16>>2]|0)){sc[c[(c[na>>2]|0)+40>>2]&127](na)|0;mb=kb;nb=kb;ob=ma;pb=Ga}else{c[Ia>>2]=ca+4;mb=kb;nb=kb;ob=ma;pb=Ga}while(1){ca=c[b>>2]|0;do{if((ca|0)!=0){Ia=c[ca+12>>2]|0;if((Ia|0)==(c[ca+16>>2]|0)){qb=sc[c[(c[ca>>2]|0)+36>>2]&127](ca)|0}else{qb=c[Ia>>2]|0}if((qb|0)==-1){c[b>>2]=0;rb=1;break}else{rb=(c[b>>2]|0)==0;break}}else{rb=1}}while(0);do{if((nb|0)!=0){ca=c[nb+12>>2]|0;if((ca|0)==(c[nb+16>>2]|0)){sb=sc[c[(c[nb>>2]|0)+36>>2]&127](nb)|0}else{sb=c[ca>>2]|0}if(!((sb|0)==-1)){if(rb^(mb|0)==0){tb=mb;ub=mb;break}else{Z=271;break a}}else{c[e>>2]=0;vb=0;Z=265;break}}else{vb=mb;Z=265}}while(0);if((Z|0)==265){Z=0;if(rb){Z=271;break a}else{tb=vb;ub=0}}ca=c[b>>2]|0;Ia=c[ca+12>>2]|0;if((Ia|0)==(c[ca+16>>2]|0)){wb=sc[c[(c[ca>>2]|0)+36>>2]&127](ca)|0}else{wb=c[Ia>>2]|0}if(!(kc[c[(c[l>>2]|0)+12>>2]&31](l,2048,wb)|0)){Z=271;break a}Ia=c[n>>2]|0;if((Ia|0)==(ob|0)){ca=(c[I>>2]|0)!=119;na=c[m>>2]|0;$=ob-na|0;P=$>>>0<2147483647?$<<1:-1;qa=$>>2;if(ca){xb=na}else{xb=0}na=Tm(xb,P)|0;if((na|0)==0){Z=276;break a}if(!ca){ca=c[m>>2]|0;c[m>>2]=na;if((ca|0)==0){yb=na}else{pc[c[I>>2]&255](ca);yb=c[m>>2]|0}}else{c[m>>2]=na;yb=na}c[I>>2]=120;na=yb+(qa<<2)|0;c[n>>2]=na;zb=na;Ab=(c[m>>2]|0)+(P>>>2<<2)|0}else{zb=Ia;Ab=ob}Ia=c[b>>2]|0;P=c[Ia+12>>2]|0;if((P|0)==(c[Ia+16>>2]|0)){na=sc[c[(c[Ia>>2]|0)+36>>2]&127](Ia)|0;Bb=na;Cb=c[n>>2]|0}else{Bb=c[P>>2]|0;Cb=zb}c[n>>2]=Cb+4;c[Cb>>2]=Bb;P=pb+ -1|0;c[z>>2]=P;na=c[b>>2]|0;Ia=na+12|0;qa=c[Ia>>2]|0;if((qa|0)==(c[na+16>>2]|0)){sc[c[(c[na>>2]|0)+40>>2]&127](na)|0}else{c[Ia>>2]=qa+4}if((P|0)>0){mb=tb;nb=ub;ob=Ab;pb=P}else{Db=Ab;break}}}else{Db=ma}if((c[n>>2]|0)==(c[m>>2]|0)){Z=290;break a}else{ea=Db;fa=_a;ga=$a;ha=ab;ia=N;ja=bb}break};case 2:{if(!((N|0)!=0|o>>>0<2)){if((o|0)==2){Eb=(a[H]|0)!=0}else{Eb=0}if(!(D|Eb)){ea=q;fa=M;ga=L;ha=K;ia=0;ja=O;break b}}Ga=a[v]|0;P=(Ga&1)==0?h:c[E>>2]|0;d:do{if((o|0)!=0?(d[r+(o+ -1)|0]|0)<2:0){qa=Ga;Ia=P;while(1){if((qa&1)==0){Fb=h;Gb=(qa&255)>>>1}else{Fb=c[E>>2]|0;Gb=c[h>>2]|0}if((Ia|0)==(Fb+(Gb<<2)|0)){Hb=qa;break}if(!(kc[c[(c[l>>2]|0)+12>>2]&31](l,8192,c[Ia>>2]|0)|0)){Z=129;break}qa=a[v]|0;Ia=Ia+4|0}if((Z|0)==129){Z=0;Hb=a[v]|0}qa=(Hb&1)==0;na=Ia-(qa?h:c[E>>2]|0)>>2;ca=a[y]|0;$=(ca&1)==0;if($){Ib=(ca&255)>>>1}else{Ib=c[F>>2]|0}e:do{if(!(na>>>0>Ib>>>0)){if($){Jb=F;Kb=(ca&255)>>>1;Lb=F+(((ca&255)>>>1)-na<<2)|0}else{Ba=c[G>>2]|0;Ja=c[F>>2]|0;Jb=Ba;Kb=Ja;Lb=Ba+(Ja-na<<2)|0}Ja=Jb+(Kb<<2)|0;if((Lb|0)==(Ja|0)){Mb=U;Nb=Hb;Ob=Ia;Pb=U;break d}else{Qb=Lb;Rb=qa?h:c[E>>2]|0}while(1){if((c[Qb>>2]|0)!=(c[Rb>>2]|0)){break e}Ba=Qb+4|0;if((Ba|0)==(Ja|0)){Mb=U;Nb=Hb;Ob=Ia;Pb=U;break d}Qb=Ba;Rb=Rb+4|0}}}while(0);Mb=U;Nb=Hb;Ob=qa?h:c[E>>2]|0;Pb=U}else{Mb=U;Nb=Ga;Ob=P;Pb=U}}while(0);f:while(1){if((Nb&1)==0){Sb=h;Tb=(Nb&255)>>>1}else{Sb=c[E>>2]|0;Tb=c[h>>2]|0}if((Ob|0)==(Sb+(Tb<<2)|0)){break}P=c[b>>2]|0;do{if((P|0)!=0){Ga=c[P+12>>2]|0;if((Ga|0)==(c[P+16>>2]|0)){Ub=sc[c[(c[P>>2]|0)+36>>2]&127](P)|0}else{Ub=c[Ga>>2]|0}if((Ub|0)==-1){c[b>>2]=0;Vb=1;break}else{Vb=(c[b>>2]|0)==0;break}}else{Vb=1}}while(0);do{if((Pb|0)!=0){P=c[Pb+12>>2]|0;if((P|0)==(c[Pb+16>>2]|0)){Wb=sc[c[(c[Pb>>2]|0)+36>>2]&127](Pb)|0}else{Wb=c[P>>2]|0}if(!((Wb|0)==-1)){if(Vb^(Mb|0)==0){Xb=Mb;Yb=Mb;break}else{break f}}else{c[e>>2]=0;Zb=0;Z=159;break}}else{Zb=Mb;Z=159}}while(0);if((Z|0)==159){Z=0;if(Vb){break}else{Xb=Zb;Yb=0}}P=c[b>>2]|0;qa=c[P+12>>2]|0;if((qa|0)==(c[P+16>>2]|0)){_b=sc[c[(c[P>>2]|0)+36>>2]&127](P)|0}else{_b=c[qa>>2]|0}if((_b|0)!=(c[Ob>>2]|0)){break}qa=c[b>>2]|0;P=qa+12|0;Ga=c[P>>2]|0;if((Ga|0)==(c[qa+16>>2]|0)){sc[c[(c[qa>>2]|0)+40>>2]&127](qa)|0}else{c[P>>2]=Ga+4}Mb=Xb;Nb=a[v]|0;Ob=Ob+4|0;Pb=Yb}if(D){Ga=a[v]|0;if((Ga&1)==0){$b=h;ac=(Ga&255)>>>1}else{$b=c[E>>2]|0;ac=c[h>>2]|0}if((Ob|0)!=($b+(ac<<2)|0)){Z=174;break a}else{ea=q;fa=M;ga=L;ha=K;ia=N;ja=O}}else{ea=q;fa=M;ga=L;ha=K;ia=N;ja=O}break};default:{ea=q;fa=M;ga=L;ha=K;ia=N;ja=O}}}while(0);g:do{if((Z|0)==28){Z=0;if((o|0)==3){V=M;W=L;X=N;Y=O;Z=292;break a}else{bc=U;cc=U}while(1){Ga=c[b>>2]|0;do{if((Ga|0)!=0){P=c[Ga+12>>2]|0;if((P|0)==(c[Ga+16>>2]|0)){dc=sc[c[(c[Ga>>2]|0)+36>>2]&127](Ga)|0}else{dc=c[P>>2]|0}if((dc|0)==-1){c[b>>2]=0;ec=1;break}else{ec=(c[b>>2]|0)==0;break}}else{ec=1}}while(0);do{if((cc|0)!=0){Ga=c[cc+12>>2]|0;if((Ga|0)==(c[cc+16>>2]|0)){fc=sc[c[(c[cc>>2]|0)+36>>2]&127](cc)|0}else{fc=c[Ga>>2]|0}if(!((fc|0)==-1)){if(ec^(bc|0)==0){gc=bc;hc=bc;break}else{ea=q;fa=M;ga=L;ha=K;ia=N;ja=O;break g}}else{c[e>>2]=0;ic=0;Z=42;break}}else{ic=bc;Z=42}}while(0);if((Z|0)==42){Z=0;if(ec){ea=q;fa=M;ga=L;ha=K;ia=N;ja=O;break g}else{gc=ic;hc=0}}Ga=c[b>>2]|0;P=c[Ga+12>>2]|0;if((P|0)==(c[Ga+16>>2]|0)){jc=sc[c[(c[Ga>>2]|0)+36>>2]&127](Ga)|0}else{jc=c[P>>2]|0}if(!(kc[c[(c[l>>2]|0)+12>>2]&31](l,8192,jc)|0)){ea=q;fa=M;ga=L;ha=K;ia=N;ja=O;break g}P=c[b>>2]|0;Ga=P+12|0;qa=c[Ga>>2]|0;if((qa|0)==(c[P+16>>2]|0)){lc=sc[c[(c[P>>2]|0)+40>>2]&127](P)|0}else{c[Ga>>2]=qa+4;lc=c[qa>>2]|0}Ue(y,lc);bc=gc;cc=hc}}}while(0);qa=o+1|0;if(qa>>>0<4){K=ha;L=ga;M=fa;q=ea;o=qa;N=ia;O=ja}else{V=fa;W=ga;X=ia;Y=ja;Z=292;break}}h:do{if((Z|0)==27){c[j>>2]=c[j>>2]|4;mc=0;nc=M;oc=O}else if((Z|0)==116){c[j>>2]=c[j>>2]|4;mc=0;nc=M;oc=O}else if((Z|0)==174){c[j>>2]=c[j>>2]|4;mc=0;nc=M;oc=O}else if((Z|0)==198){bn()}else if((Z|0)==214){bn()}else if((Z|0)==225){bn()}else if((Z|0)==248){c[j>>2]=c[j>>2]|4;mc=0;nc=_a;oc=bb}else if((Z|0)==271){c[j>>2]=c[j>>2]|4;mc=0;nc=_a;oc=bb}else if((Z|0)==276){bn()}else if((Z|0)==290){c[j>>2]=c[j>>2]|4;mc=0;nc=_a;oc=bb}else if((Z|0)==292){i:do{if((X|0)!=0){ja=X+4|0;ia=X+8|0;ga=1;j:while(1){fa=a[X]|0;if((fa&1)==0){qc=(fa&255)>>>1}else{qc=c[ja>>2]|0}if(!(ga>>>0<qc>>>0)){break i}fa=c[b>>2]|0;do{if((fa|0)!=0){N=c[fa+12>>2]|0;if((N|0)==(c[fa+16>>2]|0)){rc=sc[c[(c[fa>>2]|0)+36>>2]&127](fa)|0}else{rc=c[N>>2]|0}if((rc|0)==-1){c[b>>2]=0;tc=1;break}else{tc=(c[b>>2]|0)==0;break}}else{tc=1}}while(0);fa=c[e>>2]|0;do{if((fa|0)!=0){N=c[fa+12>>2]|0;if((N|0)==(c[fa+16>>2]|0)){uc=sc[c[(c[fa>>2]|0)+36>>2]&127](fa)|0}else{uc=c[N>>2]|0}if(!((uc|0)==-1)){if(tc){break}else{break j}}else{c[e>>2]=0;Z=311;break}}else{Z=311}}while(0);if((Z|0)==311?(Z=0,tc):0){break}fa=c[b>>2]|0;N=c[fa+12>>2]|0;if((N|0)==(c[fa+16>>2]|0)){vc=sc[c[(c[fa>>2]|0)+36>>2]&127](fa)|0}else{vc=c[N>>2]|0}if((a[X]&1)==0){wc=ja}else{wc=c[ia>>2]|0}if((vc|0)!=(c[wc+(ga<<2)>>2]|0)){break}N=ga+1|0;fa=c[b>>2]|0;o=fa+12|0;ea=c[o>>2]|0;if((ea|0)==(c[fa+16>>2]|0)){sc[c[(c[fa>>2]|0)+40>>2]&127](fa)|0;ga=N;continue}else{c[o>>2]=ea+4;ga=N;continue}}c[j>>2]=c[j>>2]|4;mc=0;nc=V;oc=Y;break h}}while(0);if((V|0)!=(W|0)){c[A>>2]=0;tj(u,V,W,A);if((c[A>>2]|0)==0){mc=1;nc=V;oc=Y}else{c[j>>2]=c[j>>2]|4;mc=0;nc=V;oc=Y}}else{mc=1;nc=W;oc=Y}}}while(0);Qe(y);Qe(x);Qe(w);Qe(v);Fe(u);if((nc|0)==0){i=p;return mc|0}pc[oc&255](nc);i=p;return mc|0}function yj(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0;d=i;i=i+448|0;l=d;m=d+24|0;n=d+16|0;o=d+428|0;p=d+12|0;q=d+432|0;r=d+424|0;c[n>>2]=m;s=n+4|0;c[s>>2]=119;t=m+400|0;Ze(p,h);m=c[p>>2]|0;if(!((c[1498]|0)==-1)){c[l>>2]=5992;c[l+4>>2]=117;c[l+8>>2]=0;Ae(5992,l,118)}u=(c[5996>>2]|0)+ -1|0;v=c[m+8>>2]|0;if(!((c[m+12>>2]|0)-v>>2>>>0>u>>>0)){w=xb(4)|0;wm(w);ec(w|0,13960,106)}m=c[v+(u<<2)>>2]|0;if((m|0)==0){w=xb(4)|0;wm(w);ec(w|0,13960,106)}a[q]=0;w=c[f>>2]|0;c[r>>2]=w;u=c[h+4>>2]|0;c[l+0>>2]=c[r+0>>2];if(xj(e,l,g,p,u,j,q,m,n,o,t)|0){if((a[k]&1)==0){c[k+4>>2]=0;a[k]=0}else{c[c[k+8>>2]>>2]=0;c[k+4>>2]=0}if((a[q]|0)!=0){Ue(k,Bc[c[(c[m>>2]|0)+44>>2]&15](m,45)|0)}q=Bc[c[(c[m>>2]|0)+44>>2]&15](m,48)|0;m=c[n>>2]|0;t=c[o>>2]|0;o=t+ -4|0;a:do{if(m>>>0<o>>>0){u=m;while(1){g=u+4|0;if((c[u>>2]|0)!=(q|0)){x=u;break a}if(g>>>0<o>>>0){u=g}else{x=g;break}}}else{x=m}}while(0);zj(k,x,t)|0}t=c[e>>2]|0;do{if((t|0)!=0){x=c[t+12>>2]|0;if((x|0)==(c[t+16>>2]|0)){y=sc[c[(c[t>>2]|0)+36>>2]&127](t)|0}else{y=c[x>>2]|0}if((y|0)==-1){c[e>>2]=0;z=1;break}else{z=(c[e>>2]|0)==0;break}}else{z=1}}while(0);do{if((w|0)!=0){y=c[w+12>>2]|0;if((y|0)==(c[w+16>>2]|0)){A=sc[c[(c[w>>2]|0)+36>>2]&127](w)|0}else{A=c[y>>2]|0}if(!((A|0)==-1)){if(z){break}else{B=31;break}}else{c[f>>2]=0;B=29;break}}else{B=29}}while(0);if((B|0)==29?z:0){B=31}if((B|0)==31){c[j>>2]=c[j>>2]|2}c[b>>2]=c[e>>2];ge(c[p>>2]|0)|0;p=c[n>>2]|0;c[n>>2]=0;if((p|0)==0){i=d;return}pc[c[s>>2]&255](p);i=d;return}function zj(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;f=i;g=d;h=a[b]|0;if((h&1)==0){j=1;k=(h&255)>>>1;l=h}else{h=c[b>>2]|0;j=(h&-2)+ -1|0;k=c[b+4>>2]|0;l=h&255}h=e-g>>2;if((h|0)==0){i=f;return b|0}if((j-k|0)>>>0<h>>>0){We(b,j,k+h-j|0,k,k,0,0);m=a[b]|0}else{m=l}if((m&1)==0){n=b+4|0}else{n=c[b+8>>2]|0}m=n+(k<<2)|0;if((d|0)==(e|0)){o=m}else{l=k+((e+ -4+(0-g)|0)>>>2)+1|0;g=d;d=m;while(1){c[d>>2]=c[g>>2];g=g+4|0;if((g|0)==(e|0)){break}else{d=d+4|0}}o=n+(l<<2)|0}c[o>>2]=0;o=k+h|0;if((a[b]&1)==0){a[b]=o<<1;i=f;return b|0}else{c[b+4>>2]=o;i=f;return b|0}return 0}function Aj(b,d,e,f,g,h,j,k,l,m){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;n=i;i=i+128|0;o=n;p=n+24|0;q=n+44|0;r=n+32|0;s=n+56|0;t=n+12|0;u=n+28|0;v=n+68|0;w=n+80|0;x=n+92|0;y=n+104|0;if(b){b=c[d>>2]|0;if(!((c[1392]|0)==-1)){c[o>>2]=5568;c[o+4>>2]=117;c[o+8>>2]=0;Ae(5568,o,118)}z=(c[5572>>2]|0)+ -1|0;A=c[b+8>>2]|0;if(!((c[b+12>>2]|0)-A>>2>>>0>z>>>0)){B=xb(4)|0;wm(B);ec(B|0,13960,106)}b=c[A+(z<<2)>>2]|0;if((b|0)==0){B=xb(4)|0;wm(B);ec(B|0,13960,106)}qc[c[(c[b>>2]|0)+44>>2]&63](p,b);B=c[p>>2]|0;a[e]=B;a[e+1|0]=B>>8;a[e+2|0]=B>>16;a[e+3|0]=B>>24;qc[c[(c[b>>2]|0)+32>>2]&63](q,b);if((a[l]&1)==0){c[l+4>>2]=0;a[l]=0}else{c[c[l+8>>2]>>2]=0;c[l+4>>2]=0}Te(l,0);c[l+0>>2]=c[q+0>>2];c[l+4>>2]=c[q+4>>2];c[l+8>>2]=c[q+8>>2];c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;Qe(q);qc[c[(c[b>>2]|0)+28>>2]&63](r,b);if((a[k]&1)==0){c[k+4>>2]=0;a[k]=0}else{c[c[k+8>>2]>>2]=0;c[k+4>>2]=0}Te(k,0);c[k+0>>2]=c[r+0>>2];c[k+4>>2]=c[r+4>>2];c[k+8>>2]=c[r+8>>2];c[r+0>>2]=0;c[r+4>>2]=0;c[r+8>>2]=0;Qe(r);c[f>>2]=sc[c[(c[b>>2]|0)+12>>2]&127](b)|0;c[g>>2]=sc[c[(c[b>>2]|0)+16>>2]&127](b)|0;qc[c[(c[b>>2]|0)+20>>2]&63](s,b);if((a[h]&1)==0){a[h+1|0]=0;a[h]=0}else{a[c[h+8>>2]|0]=0;c[h+4>>2]=0}Je(h,0);c[h+0>>2]=c[s+0>>2];c[h+4>>2]=c[s+4>>2];c[h+8>>2]=c[s+8>>2];c[s+0>>2]=0;c[s+4>>2]=0;c[s+8>>2]=0;Fe(s);qc[c[(c[b>>2]|0)+24>>2]&63](t,b);if((a[j]&1)==0){c[j+4>>2]=0;a[j]=0}else{c[c[j+8>>2]>>2]=0;c[j+4>>2]=0}Te(j,0);c[j+0>>2]=c[t+0>>2];c[j+4>>2]=c[t+4>>2];c[j+8>>2]=c[t+8>>2];c[t+0>>2]=0;c[t+4>>2]=0;c[t+8>>2]=0;Qe(t);C=sc[c[(c[b>>2]|0)+36>>2]&127](b)|0;c[m>>2]=C;i=n;return}else{b=c[d>>2]|0;if(!((c[1376]|0)==-1)){c[o>>2]=5504;c[o+4>>2]=117;c[o+8>>2]=0;Ae(5504,o,118)}o=(c[5508>>2]|0)+ -1|0;d=c[b+8>>2]|0;if(!((c[b+12>>2]|0)-d>>2>>>0>o>>>0)){D=xb(4)|0;wm(D);ec(D|0,13960,106)}b=c[d+(o<<2)>>2]|0;if((b|0)==0){D=xb(4)|0;wm(D);ec(D|0,13960,106)}qc[c[(c[b>>2]|0)+44>>2]&63](u,b);D=c[u>>2]|0;a[e]=D;a[e+1|0]=D>>8;a[e+2|0]=D>>16;a[e+3|0]=D>>24;qc[c[(c[b>>2]|0)+32>>2]&63](v,b);if((a[l]&1)==0){c[l+4>>2]=0;a[l]=0}else{c[c[l+8>>2]>>2]=0;c[l+4>>2]=0}Te(l,0);c[l+0>>2]=c[v+0>>2];c[l+4>>2]=c[v+4>>2];c[l+8>>2]=c[v+8>>2];c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;Qe(v);qc[c[(c[b>>2]|0)+28>>2]&63](w,b);if((a[k]&1)==0){c[k+4>>2]=0;a[k]=0}else{c[c[k+8>>2]>>2]=0;c[k+4>>2]=0}Te(k,0);c[k+0>>2]=c[w+0>>2];c[k+4>>2]=c[w+4>>2];c[k+8>>2]=c[w+8>>2];c[w+0>>2]=0;c[w+4>>2]=0;c[w+8>>2]=0;Qe(w);c[f>>2]=sc[c[(c[b>>2]|0)+12>>2]&127](b)|0;c[g>>2]=sc[c[(c[b>>2]|0)+16>>2]&127](b)|0;qc[c[(c[b>>2]|0)+20>>2]&63](x,b);if((a[h]&1)==0){a[h+1|0]=0;a[h]=0}else{a[c[h+8>>2]|0]=0;c[h+4>>2]=0}Je(h,0);c[h+0>>2]=c[x+0>>2];c[h+4>>2]=c[x+4>>2];c[h+8>>2]=c[x+8>>2];c[x+0>>2]=0;c[x+4>>2]=0;c[x+8>>2]=0;Fe(x);qc[c[(c[b>>2]|0)+24>>2]&63](y,b);if((a[j]&1)==0){c[j+4>>2]=0;a[j]=0}else{c[c[j+8>>2]>>2]=0;c[j+4>>2]=0}Te(j,0);c[j+0>>2]=c[y+0>>2];c[j+4>>2]=c[y+4>>2];c[j+8>>2]=c[y+8>>2];c[y+0>>2]=0;c[y+4>>2]=0;c[y+8>>2]=0;Qe(y);C=sc[c[(c[b>>2]|0)+36>>2]&127](b)|0;c[m>>2]=C;i=n;return}}function Bj(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function Cj(a){a=a|0;return}function Dj(b,d,e,f,g,j,l){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;j=j|0;l=+l;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0;d=i;i=i+384|0;m=d;n=d+76|0;o=d+44|0;p=d+176|0;q=d+40|0;r=d+68|0;s=d+276|0;t=d+380|0;u=d+56|0;v=d+24|0;w=d+12|0;x=d+52|0;y=d+280|0;z=d+36|0;A=d+48|0;B=d+72|0;c[o>>2]=n;h[k>>3]=l;c[m>>2]=c[k>>2];c[m+4>>2]=c[k+4>>2];C=Cb(n|0,100,5752,m|0)|0;if(C>>>0>99){if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}n=c[1472]|0;h[k>>3]=l;c[m>>2]=c[k>>2];c[m+4>>2]=c[k+4>>2];D=yh(o,n,5752,m)|0;n=c[o>>2]|0;if((n|0)==0){bn()}E=Rm(D)|0;if((E|0)==0){bn()}else{F=E;G=n;H=E;I=D}}else{F=0;G=0;H=p;I=C}Ze(q,g);C=c[q>>2]|0;if(!((c[1500]|0)==-1)){c[m>>2]=6e3;c[m+4>>2]=117;c[m+8>>2]=0;Ae(6e3,m,118)}p=(c[6004>>2]|0)+ -1|0;D=c[C+8>>2]|0;if(!((c[C+12>>2]|0)-D>>2>>>0>p>>>0)){J=xb(4)|0;wm(J);ec(J|0,13960,106)}C=c[D+(p<<2)>>2]|0;if((C|0)==0){J=xb(4)|0;wm(J);ec(J|0,13960,106)}J=c[o>>2]|0;yc[c[(c[C>>2]|0)+32>>2]&7](C,J,J+I|0,H)|0;if((I|0)==0){K=0}else{K=(a[c[o>>2]|0]|0)==45}c[r>>2]=0;c[u+0>>2]=0;c[u+4>>2]=0;c[u+8>>2]=0;c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;c[w+0>>2]=0;c[w+4>>2]=0;c[w+8>>2]=0;Ej(f,K,q,r,s,t,u,v,w,x);f=c[x>>2]|0;if((I|0)>(f|0)){x=a[w]|0;if((x&1)==0){L=(x&255)>>>1}else{L=c[w+4>>2]|0}x=a[v]|0;if((x&1)==0){M=(x&255)>>>1}else{M=c[v+4>>2]|0}N=L+(I-f<<1|1)+M|0}else{M=a[w]|0;if((M&1)==0){O=(M&255)>>>1}else{O=c[w+4>>2]|0}M=a[v]|0;if((M&1)==0){P=(M&255)>>>1}else{P=c[v+4>>2]|0}N=O+2+P|0}P=N+f|0;if(P>>>0>100){N=Rm(P)|0;if((N|0)==0){bn()}else{Q=N;R=N}}else{Q=0;R=y}Fj(R,z,A,c[g+4>>2]|0,H,H+I|0,C,K,r,a[s]|0,a[t]|0,u,v,w,f);c[B>>2]=c[e>>2];e=c[z>>2]|0;z=c[A>>2]|0;c[m+0>>2]=c[B+0>>2];th(b,m,R,e,z,g,j);if((Q|0)!=0){Sm(Q)}Fe(w);Fe(v);Fe(u);ge(c[q>>2]|0)|0;if((F|0)!=0){Sm(F)}if((G|0)==0){i=d;return}Sm(G);i=d;return}function Ej(b,d,e,f,g,h,j,k,l,m){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0;n=i;i=i+128|0;o=n;p=n+12|0;q=n+40|0;r=n+52|0;s=n+56|0;t=n+16|0;u=n+28|0;v=n+68|0;w=n+72|0;x=n+84|0;y=n+88|0;z=n+100|0;A=n+112|0;B=c[e>>2]|0;if(b){if(!((c[1360]|0)==-1)){c[o>>2]=5440;c[o+4>>2]=117;c[o+8>>2]=0;Ae(5440,o,118)}b=(c[5444>>2]|0)+ -1|0;e=c[B+8>>2]|0;if(!((c[B+12>>2]|0)-e>>2>>>0>b>>>0)){C=xb(4)|0;wm(C);ec(C|0,13960,106)}D=c[e+(b<<2)>>2]|0;if((D|0)==0){C=xb(4)|0;wm(C);ec(C|0,13960,106)}C=c[D>>2]|0;if(d){qc[c[C+44>>2]&63](p,D);b=c[p>>2]|0;a[f]=b;a[f+1|0]=b>>8;a[f+2|0]=b>>16;a[f+3|0]=b>>24;qc[c[(c[D>>2]|0)+32>>2]&63](q,D);if((a[l]&1)==0){a[l+1|0]=0;a[l]=0}else{a[c[l+8>>2]|0]=0;c[l+4>>2]=0}Je(l,0);c[l+0>>2]=c[q+0>>2];c[l+4>>2]=c[q+4>>2];c[l+8>>2]=c[q+8>>2];c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;Fe(q)}else{qc[c[C+40>>2]&63](r,D);C=c[r>>2]|0;a[f]=C;a[f+1|0]=C>>8;a[f+2|0]=C>>16;a[f+3|0]=C>>24;qc[c[(c[D>>2]|0)+28>>2]&63](s,D);if((a[l]&1)==0){a[l+1|0]=0;a[l]=0}else{a[c[l+8>>2]|0]=0;c[l+4>>2]=0}Je(l,0);c[l+0>>2]=c[s+0>>2];c[l+4>>2]=c[s+4>>2];c[l+8>>2]=c[s+8>>2];c[s+0>>2]=0;c[s+4>>2]=0;c[s+8>>2]=0;Fe(s)}a[g]=sc[c[(c[D>>2]|0)+12>>2]&127](D)|0;a[h]=sc[c[(c[D>>2]|0)+16>>2]&127](D)|0;qc[c[(c[D>>2]|0)+20>>2]&63](t,D);if((a[j]&1)==0){a[j+1|0]=0;a[j]=0}else{a[c[j+8>>2]|0]=0;c[j+4>>2]=0}Je(j,0);c[j+0>>2]=c[t+0>>2];c[j+4>>2]=c[t+4>>2];c[j+8>>2]=c[t+8>>2];c[t+0>>2]=0;c[t+4>>2]=0;c[t+8>>2]=0;Fe(t);qc[c[(c[D>>2]|0)+24>>2]&63](u,D);if((a[k]&1)==0){a[k+1|0]=0;a[k]=0}else{a[c[k+8>>2]|0]=0;c[k+4>>2]=0}Je(k,0);c[k+0>>2]=c[u+0>>2];c[k+4>>2]=c[u+4>>2];c[k+8>>2]=c[u+8>>2];c[u+0>>2]=0;c[u+4>>2]=0;c[u+8>>2]=0;Fe(u);E=sc[c[(c[D>>2]|0)+36>>2]&127](D)|0;c[m>>2]=E;i=n;return}else{if(!((c[1344]|0)==-1)){c[o>>2]=5376;c[o+4>>2]=117;c[o+8>>2]=0;Ae(5376,o,118)}o=(c[5380>>2]|0)+ -1|0;D=c[B+8>>2]|0;if(!((c[B+12>>2]|0)-D>>2>>>0>o>>>0)){F=xb(4)|0;wm(F);ec(F|0,13960,106)}B=c[D+(o<<2)>>2]|0;if((B|0)==0){F=xb(4)|0;wm(F);ec(F|0,13960,106)}F=c[B>>2]|0;if(d){qc[c[F+44>>2]&63](v,B);d=c[v>>2]|0;a[f]=d;a[f+1|0]=d>>8;a[f+2|0]=d>>16;a[f+3|0]=d>>24;qc[c[(c[B>>2]|0)+32>>2]&63](w,B);if((a[l]&1)==0){a[l+1|0]=0;a[l]=0}else{a[c[l+8>>2]|0]=0;c[l+4>>2]=0}Je(l,0);c[l+0>>2]=c[w+0>>2];c[l+4>>2]=c[w+4>>2];c[l+8>>2]=c[w+8>>2];c[w+0>>2]=0;c[w+4>>2]=0;c[w+8>>2]=0;Fe(w)}else{qc[c[F+40>>2]&63](x,B);F=c[x>>2]|0;a[f]=F;a[f+1|0]=F>>8;a[f+2|0]=F>>16;a[f+3|0]=F>>24;qc[c[(c[B>>2]|0)+28>>2]&63](y,B);if((a[l]&1)==0){a[l+1|0]=0;a[l]=0}else{a[c[l+8>>2]|0]=0;c[l+4>>2]=0}Je(l,0);c[l+0>>2]=c[y+0>>2];c[l+4>>2]=c[y+4>>2];c[l+8>>2]=c[y+8>>2];c[y+0>>2]=0;c[y+4>>2]=0;c[y+8>>2]=0;Fe(y)}a[g]=sc[c[(c[B>>2]|0)+12>>2]&127](B)|0;a[h]=sc[c[(c[B>>2]|0)+16>>2]&127](B)|0;qc[c[(c[B>>2]|0)+20>>2]&63](z,B);if((a[j]&1)==0){a[j+1|0]=0;a[j]=0}else{a[c[j+8>>2]|0]=0;c[j+4>>2]=0}Je(j,0);c[j+0>>2]=c[z+0>>2];c[j+4>>2]=c[z+4>>2];c[j+8>>2]=c[z+8>>2];c[z+0>>2]=0;c[z+4>>2]=0;c[z+8>>2]=0;Fe(z);qc[c[(c[B>>2]|0)+24>>2]&63](A,B);if((a[k]&1)==0){a[k+1|0]=0;a[k]=0}else{a[c[k+8>>2]|0]=0;c[k+4>>2]=0}Je(k,0);c[k+0>>2]=c[A+0>>2];c[k+4>>2]=c[A+4>>2];c[k+8>>2]=c[A+8>>2];c[A+0>>2]=0;c[A+4>>2]=0;c[A+8>>2]=0;Fe(A);E=sc[c[(c[B>>2]|0)+36>>2]&127](B)|0;c[m>>2]=E;i=n;return}}function Fj(d,e,f,g,h,j,k,l,m,n,o,p,q,r,s){d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;p=p|0;q=q|0;r=r|0;s=s|0;var t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0,la=0,ma=0,na=0,oa=0,pa=0,qa=0,ra=0,sa=0,ta=0,ua=0,va=0;t=i;c[f>>2]=d;u=r+1|0;v=r+8|0;w=r+4|0;x=(g&512|0)==0;y=q+1|0;z=q+8|0;A=q+4|0;B=(s|0)>0;C=p+1|0;D=p+8|0;E=p+4|0;F=k+8|0;G=0-s|0;H=h;h=0;while(1){switch(a[m+h|0]|0){case 3:{I=a[r]|0;J=(I&1)==0;if(J){K=(I&255)>>>1}else{K=c[w>>2]|0}if((K|0)==0){L=H}else{if(J){M=u}else{M=c[v>>2]|0}J=a[M]|0;I=c[f>>2]|0;c[f>>2]=I+1;a[I]=J;L=H}break};case 0:{c[e>>2]=c[f>>2];L=H;break};case 4:{J=c[f>>2]|0;I=l?H+1|0:H;a:do{if(I>>>0<j>>>0){N=I;while(1){O=a[N]|0;if(!(O<<24>>24>-1)){P=N;break a}Q=N+1|0;if((b[(c[F>>2]|0)+(O<<24>>24<<1)>>1]&2048)==0){P=N;break a}if(Q>>>0<j>>>0){N=Q}else{P=Q;break}}}else{P=I}}while(0);N=P;if(B){if(P>>>0>I>>>0){Q=I+(0-N)|0;N=Q>>>0<G>>>0?G:Q;Q=N+s|0;O=J;R=P;S=s;while(1){T=R+ -1|0;U=a[T]|0;c[f>>2]=O+1;a[O]=U;U=S+ -1|0;V=(U|0)>0;if(!(T>>>0>I>>>0&V)){break}O=c[f>>2]|0;R=T;S=U}S=P+N|0;if(V){W=S;X=Q;Y=32}else{Z=0;_=S;$=Q}}else{W=P;X=s;Y=32}if((Y|0)==32){Y=0;Z=Bc[c[(c[k>>2]|0)+28>>2]&15](k,48)|0;_=W;$=X}S=c[f>>2]|0;c[f>>2]=S+1;if(($|0)>0){R=S;O=$;while(1){a[R]=Z;U=O+ -1|0;T=c[f>>2]|0;c[f>>2]=T+1;if((U|0)>0){R=T;O=U}else{aa=T;break}}}else{aa=S}a[aa]=n;ba=_}else{ba=P}if((ba|0)==(I|0)){O=Bc[c[(c[k>>2]|0)+28>>2]&15](k,48)|0;R=c[f>>2]|0;c[f>>2]=R+1;a[R]=O}else{O=a[p]|0;R=(O&1)==0;if(R){ca=(O&255)>>>1}else{ca=c[E>>2]|0}if((ca|0)==0){da=ba;ea=-1;fa=0;ga=0}else{if(R){ha=C}else{ha=c[D>>2]|0}da=ba;ea=a[ha]|0;fa=0;ga=0}while(1){if((ga|0)==(ea|0)){R=c[f>>2]|0;c[f>>2]=R+1;a[R]=o;R=fa+1|0;O=a[p]|0;Q=(O&1)==0;if(Q){ia=(O&255)>>>1}else{ia=c[E>>2]|0}if(R>>>0<ia>>>0){if(Q){ja=C}else{ja=c[D>>2]|0}if((a[ja+R|0]|0)==127){ka=-1;la=R;ma=0}else{if(Q){na=C}else{na=c[D>>2]|0}ka=a[na+R|0]|0;la=R;ma=0}}else{ka=ea;la=R;ma=0}}else{ka=ea;la=fa;ma=ga}da=da+ -1|0;R=a[da]|0;Q=c[f>>2]|0;c[f>>2]=Q+1;a[Q]=R;if((da|0)==(I|0)){break}else{ea=ka;fa=la;ga=ma+1|0}}}S=c[f>>2]|0;if((J|0)!=(S|0)?(R=S+ -1|0,R>>>0>J>>>0):0){S=J;Q=R;while(1){R=a[S]|0;a[S]=a[Q]|0;a[Q]=R;R=S+1|0;O=Q+ -1|0;if(R>>>0<O>>>0){S=R;Q=O}else{L=I;break}}}else{L=I}break};case 1:{c[e>>2]=c[f>>2];Q=Bc[c[(c[k>>2]|0)+28>>2]&15](k,32)|0;S=c[f>>2]|0;c[f>>2]=S+1;a[S]=Q;L=H;break};case 2:{Q=a[q]|0;S=(Q&1)==0;if(S){oa=(Q&255)>>>1}else{oa=c[A>>2]|0}if((oa|0)==0|x){L=H}else{if(S){pa=y;qa=(Q&255)>>>1}else{pa=c[z>>2]|0;qa=c[A>>2]|0}Q=pa+qa|0;S=c[f>>2]|0;if((pa|0)==(Q|0)){ra=S}else{J=S;S=pa;while(1){a[J]=a[S]|0;O=S+1|0;R=J+1|0;if((O|0)==(Q|0)){ra=R;break}else{J=R;S=O}}}c[f>>2]=ra;L=H}break};default:{L=H}}h=h+1|0;if((h|0)==4){break}else{H=L}}L=a[r]|0;r=(L&1)==0;if(r){sa=(L&255)>>>1}else{sa=c[w>>2]|0}if(sa>>>0>1){if(r){ta=u;ua=(L&255)>>>1}else{ta=c[v>>2]|0;ua=c[w>>2]|0}w=ta+1|0;v=ta+ua|0;ua=c[f>>2]|0;if((w|0)==(v|0)){va=ua}else{ta=ua;ua=w;while(1){a[ta]=a[ua]|0;w=ua+1|0;L=ta+1|0;if((w|0)==(v|0)){va=L;break}else{ta=L;ua=w}}}c[f>>2]=va}va=g&176;if((va|0)==32){c[e>>2]=c[f>>2];i=t;return}else if((va|0)==16){i=t;return}else{c[e>>2]=d;i=t;return}}function Gj(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0;d=i;i=i+176|0;k=d;l=d+40|0;m=d+24|0;n=d+72|0;o=d+73|0;p=d+12|0;q=d+28|0;r=d+48|0;s=d+44|0;t=d+76|0;u=d+60|0;v=d+64|0;w=d+68|0;Ze(l,g);x=c[l>>2]|0;if(!((c[1500]|0)==-1)){c[k>>2]=6e3;c[k+4>>2]=117;c[k+8>>2]=0;Ae(6e3,k,118)}y=(c[6004>>2]|0)+ -1|0;z=c[x+8>>2]|0;if(!((c[x+12>>2]|0)-z>>2>>>0>y>>>0)){A=xb(4)|0;wm(A);ec(A|0,13960,106)}x=c[z+(y<<2)>>2]|0;if((x|0)==0){A=xb(4)|0;wm(A);ec(A|0,13960,106)}A=a[j]|0;y=(A&1)==0;if(y){B=(A&255)>>>1}else{B=c[j+4>>2]|0}if((B|0)==0){C=0}else{if(y){D=j+1|0}else{D=c[j+8>>2]|0}y=a[D]|0;C=y<<24>>24==(Bc[c[(c[x>>2]|0)+28>>2]&15](x,45)|0)<<24>>24}c[m>>2]=0;c[p+0>>2]=0;c[p+4>>2]=0;c[p+8>>2]=0;c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;c[r+0>>2]=0;c[r+4>>2]=0;c[r+8>>2]=0;Ej(f,C,l,m,n,o,p,q,r,s);f=a[j]|0;y=(f&1)==0;if(y){E=(f&255)>>>1}else{E=c[j+4>>2]|0}D=c[s>>2]|0;if((E|0)>(D|0)){if(y){F=(f&255)>>>1}else{F=c[j+4>>2]|0}y=a[r]|0;if((y&1)==0){G=(y&255)>>>1}else{G=c[r+4>>2]|0}y=a[q]|0;if((y&1)==0){H=(y&255)>>>1}else{H=c[q+4>>2]|0}I=G+(F-D<<1|1)+H|0}else{H=a[r]|0;if((H&1)==0){J=(H&255)>>>1}else{J=c[r+4>>2]|0}H=a[q]|0;if((H&1)==0){K=(H&255)>>>1}else{K=c[q+4>>2]|0}I=J+2+K|0}K=I+D|0;if(K>>>0>100){I=Rm(K)|0;if((I|0)==0){bn()}else{L=I;M=I}}else{L=0;M=t}if((f&1)==0){N=j+1|0;O=(f&255)>>>1}else{N=c[j+8>>2]|0;O=c[j+4>>2]|0}Fj(M,u,v,c[g+4>>2]|0,N,N+O|0,x,C,m,a[n]|0,a[o]|0,p,q,r,D);c[w>>2]=c[e>>2];e=c[u>>2]|0;u=c[v>>2]|0;c[k+0>>2]=c[w+0>>2];th(b,k,M,e,u,g,h);if((L|0)==0){Fe(r);Fe(q);Fe(p);P=c[l>>2]|0;ge(P)|0;i=d;return}Sm(L);Fe(r);Fe(q);Fe(p);P=c[l>>2]|0;ge(P)|0;i=d;return}function Hj(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function Ij(a){a=a|0;return}function Jj(b,d,e,f,g,j,l){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;j=j|0;l=+l;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0;d=i;i=i+992|0;m=d;n=d+888|0;o=d+424|0;p=d+16|0;q=d+428|0;r=d+416|0;s=d+420|0;t=d+880|0;u=d+440|0;v=d+452|0;w=d+464|0;x=d+476|0;y=d+480|0;z=d+432|0;A=d+436|0;B=d+884|0;c[o>>2]=n;h[k>>3]=l;c[m>>2]=c[k>>2];c[m+4>>2]=c[k+4>>2];C=Cb(n|0,100,5752,m|0)|0;if(C>>>0>99){if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}n=c[1472]|0;h[k>>3]=l;c[m>>2]=c[k>>2];c[m+4>>2]=c[k+4>>2];D=yh(o,n,5752,m)|0;n=c[o>>2]|0;if((n|0)==0){bn()}E=Rm(D<<2)|0;if((E|0)==0){bn()}else{F=E;G=n;H=E;I=D}}else{F=0;G=0;H=p;I=C}Ze(q,g);C=c[q>>2]|0;if(!((c[1498]|0)==-1)){c[m>>2]=5992;c[m+4>>2]=117;c[m+8>>2]=0;Ae(5992,m,118)}p=(c[5996>>2]|0)+ -1|0;D=c[C+8>>2]|0;if(!((c[C+12>>2]|0)-D>>2>>>0>p>>>0)){J=xb(4)|0;wm(J);ec(J|0,13960,106)}C=c[D+(p<<2)>>2]|0;if((C|0)==0){J=xb(4)|0;wm(J);ec(J|0,13960,106)}J=c[o>>2]|0;yc[c[(c[C>>2]|0)+48>>2]&7](C,J,J+I|0,H)|0;if((I|0)==0){K=0}else{K=(a[c[o>>2]|0]|0)==45}c[r>>2]=0;c[u+0>>2]=0;c[u+4>>2]=0;c[u+8>>2]=0;c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;c[w+0>>2]=0;c[w+4>>2]=0;c[w+8>>2]=0;Kj(f,K,q,r,s,t,u,v,w,x);f=c[x>>2]|0;if((I|0)>(f|0)){x=a[w]|0;if((x&1)==0){L=(x&255)>>>1}else{L=c[w+4>>2]|0}x=a[v]|0;if((x&1)==0){M=(x&255)>>>1}else{M=c[v+4>>2]|0}N=L+(I-f<<1|1)+M|0}else{M=a[w]|0;if((M&1)==0){O=(M&255)>>>1}else{O=c[w+4>>2]|0}M=a[v]|0;if((M&1)==0){P=(M&255)>>>1}else{P=c[v+4>>2]|0}N=O+2+P|0}P=N+f|0;if(P>>>0>100){N=Rm(P<<2)|0;if((N|0)==0){bn()}else{Q=N;R=N}}else{Q=0;R=y}Lj(R,z,A,c[g+4>>2]|0,H,H+(I<<2)|0,C,K,r,c[s>>2]|0,c[t>>2]|0,u,v,w,f);c[B>>2]=c[e>>2];e=c[z>>2]|0;z=c[A>>2]|0;c[m+0>>2]=c[B+0>>2];Hh(b,m,R,e,z,g,j);if((Q|0)!=0){Sm(Q)}Qe(w);Qe(v);Fe(u);ge(c[q>>2]|0)|0;if((F|0)!=0){Sm(F)}if((G|0)==0){i=d;return}Sm(G);i=d;return}function Kj(b,d,e,f,g,h,j,k,l,m){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0;n=i;i=i+128|0;o=n;p=n+12|0;q=n+40|0;r=n+52|0;s=n+56|0;t=n+16|0;u=n+28|0;v=n+68|0;w=n+72|0;x=n+84|0;y=n+88|0;z=n+100|0;A=n+112|0;B=c[e>>2]|0;if(b){if(!((c[1392]|0)==-1)){c[o>>2]=5568;c[o+4>>2]=117;c[o+8>>2]=0;Ae(5568,o,118)}b=(c[5572>>2]|0)+ -1|0;e=c[B+8>>2]|0;if(!((c[B+12>>2]|0)-e>>2>>>0>b>>>0)){C=xb(4)|0;wm(C);ec(C|0,13960,106)}D=c[e+(b<<2)>>2]|0;if((D|0)==0){C=xb(4)|0;wm(C);ec(C|0,13960,106)}C=c[D>>2]|0;if(d){qc[c[C+44>>2]&63](p,D);b=c[p>>2]|0;a[f]=b;a[f+1|0]=b>>8;a[f+2|0]=b>>16;a[f+3|0]=b>>24;qc[c[(c[D>>2]|0)+32>>2]&63](q,D);if((a[l]&1)==0){c[l+4>>2]=0;a[l]=0}else{c[c[l+8>>2]>>2]=0;c[l+4>>2]=0}Te(l,0);c[l+0>>2]=c[q+0>>2];c[l+4>>2]=c[q+4>>2];c[l+8>>2]=c[q+8>>2];c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;Qe(q)}else{qc[c[C+40>>2]&63](r,D);C=c[r>>2]|0;a[f]=C;a[f+1|0]=C>>8;a[f+2|0]=C>>16;a[f+3|0]=C>>24;qc[c[(c[D>>2]|0)+28>>2]&63](s,D);if((a[l]&1)==0){c[l+4>>2]=0;a[l]=0}else{c[c[l+8>>2]>>2]=0;c[l+4>>2]=0}Te(l,0);c[l+0>>2]=c[s+0>>2];c[l+4>>2]=c[s+4>>2];c[l+8>>2]=c[s+8>>2];c[s+0>>2]=0;c[s+4>>2]=0;c[s+8>>2]=0;Qe(s)}c[g>>2]=sc[c[(c[D>>2]|0)+12>>2]&127](D)|0;c[h>>2]=sc[c[(c[D>>2]|0)+16>>2]&127](D)|0;qc[c[(c[D>>2]|0)+20>>2]&63](t,D);if((a[j]&1)==0){a[j+1|0]=0;a[j]=0}else{a[c[j+8>>2]|0]=0;c[j+4>>2]=0}Je(j,0);c[j+0>>2]=c[t+0>>2];c[j+4>>2]=c[t+4>>2];c[j+8>>2]=c[t+8>>2];c[t+0>>2]=0;c[t+4>>2]=0;c[t+8>>2]=0;Fe(t);qc[c[(c[D>>2]|0)+24>>2]&63](u,D);if((a[k]&1)==0){c[k+4>>2]=0;a[k]=0}else{c[c[k+8>>2]>>2]=0;c[k+4>>2]=0}Te(k,0);c[k+0>>2]=c[u+0>>2];c[k+4>>2]=c[u+4>>2];c[k+8>>2]=c[u+8>>2];c[u+0>>2]=0;c[u+4>>2]=0;c[u+8>>2]=0;Qe(u);E=sc[c[(c[D>>2]|0)+36>>2]&127](D)|0;c[m>>2]=E;i=n;return}else{if(!((c[1376]|0)==-1)){c[o>>2]=5504;c[o+4>>2]=117;c[o+8>>2]=0;Ae(5504,o,118)}o=(c[5508>>2]|0)+ -1|0;D=c[B+8>>2]|0;if(!((c[B+12>>2]|0)-D>>2>>>0>o>>>0)){F=xb(4)|0;wm(F);ec(F|0,13960,106)}B=c[D+(o<<2)>>2]|0;if((B|0)==0){F=xb(4)|0;wm(F);ec(F|0,13960,106)}F=c[B>>2]|0;if(d){qc[c[F+44>>2]&63](v,B);d=c[v>>2]|0;a[f]=d;a[f+1|0]=d>>8;a[f+2|0]=d>>16;a[f+3|0]=d>>24;qc[c[(c[B>>2]|0)+32>>2]&63](w,B);if((a[l]&1)==0){c[l+4>>2]=0;a[l]=0}else{c[c[l+8>>2]>>2]=0;c[l+4>>2]=0}Te(l,0);c[l+0>>2]=c[w+0>>2];c[l+4>>2]=c[w+4>>2];c[l+8>>2]=c[w+8>>2];c[w+0>>2]=0;c[w+4>>2]=0;c[w+8>>2]=0;Qe(w)}else{qc[c[F+40>>2]&63](x,B);F=c[x>>2]|0;a[f]=F;a[f+1|0]=F>>8;a[f+2|0]=F>>16;a[f+3|0]=F>>24;qc[c[(c[B>>2]|0)+28>>2]&63](y,B);if((a[l]&1)==0){c[l+4>>2]=0;a[l]=0}else{c[c[l+8>>2]>>2]=0;c[l+4>>2]=0}Te(l,0);c[l+0>>2]=c[y+0>>2];c[l+4>>2]=c[y+4>>2];c[l+8>>2]=c[y+8>>2];c[y+0>>2]=0;c[y+4>>2]=0;c[y+8>>2]=0;Qe(y)}c[g>>2]=sc[c[(c[B>>2]|0)+12>>2]&127](B)|0;c[h>>2]=sc[c[(c[B>>2]|0)+16>>2]&127](B)|0;qc[c[(c[B>>2]|0)+20>>2]&63](z,B);if((a[j]&1)==0){a[j+1|0]=0;a[j]=0}else{a[c[j+8>>2]|0]=0;c[j+4>>2]=0}Je(j,0);c[j+0>>2]=c[z+0>>2];c[j+4>>2]=c[z+4>>2];c[j+8>>2]=c[z+8>>2];c[z+0>>2]=0;c[z+4>>2]=0;c[z+8>>2]=0;Fe(z);qc[c[(c[B>>2]|0)+24>>2]&63](A,B);if((a[k]&1)==0){c[k+4>>2]=0;a[k]=0}else{c[c[k+8>>2]>>2]=0;c[k+4>>2]=0}Te(k,0);c[k+0>>2]=c[A+0>>2];c[k+4>>2]=c[A+4>>2];c[k+8>>2]=c[A+8>>2];c[A+0>>2]=0;c[A+4>>2]=0;c[A+8>>2]=0;Qe(A);E=sc[c[(c[B>>2]|0)+36>>2]&127](B)|0;c[m>>2]=E;i=n;return}}function Lj(b,d,e,f,g,h,j,k,l,m,n,o,p,q,r){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;p=p|0;q=q|0;r=r|0;var s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0,la=0,ma=0,na=0,oa=0,pa=0,qa=0,ra=0,sa=0;s=i;c[e>>2]=b;t=q+4|0;u=q+8|0;v=(f&512|0)==0;w=p+4|0;x=p+8|0;y=(r|0)>0;z=o+1|0;A=o+8|0;B=o+4|0;C=g;g=0;while(1){switch(a[l+g|0]|0){case 3:{D=a[q]|0;E=(D&1)==0;if(E){F=(D&255)>>>1}else{F=c[t>>2]|0}if((F|0)==0){G=C}else{if(E){H=t}else{H=c[u>>2]|0}E=c[H>>2]|0;D=c[e>>2]|0;c[e>>2]=D+4;c[D>>2]=E;G=C}break};case 2:{E=a[p]|0;D=(E&1)==0;if(D){I=(E&255)>>>1}else{I=c[w>>2]|0}if((I|0)==0|v){G=C}else{if(D){J=w;K=(E&255)>>>1}else{J=c[x>>2]|0;K=c[w>>2]|0}E=J+(K<<2)|0;D=c[e>>2]|0;if((J|0)==(E|0)){L=D}else{M=(J+(K+ -1<<2)+(0-J)|0)>>>2;N=D;O=J;while(1){c[N>>2]=c[O>>2];P=O+4|0;if((P|0)==(E|0)){break}N=N+4|0;O=P}L=D+(M+1<<2)|0}c[e>>2]=L;G=C}break};case 4:{O=c[e>>2]|0;N=k?C+4|0:C;a:do{if(N>>>0<h>>>0){E=N;while(1){P=E+4|0;if(!(kc[c[(c[j>>2]|0)+12>>2]&31](j,2048,c[E>>2]|0)|0)){Q=E;break a}if(P>>>0<h>>>0){E=P}else{Q=P;break}}}else{Q=N}}while(0);if(y){if(Q>>>0>N>>>0){M=c[e>>2]|0;D=Q;E=r;while(1){R=D+ -4|0;S=M+4|0;c[M>>2]=c[R>>2];T=E+ -1|0;U=(T|0)>0;if(R>>>0>N>>>0&U){M=S;D=R;E=T}else{break}}c[e>>2]=S;if(U){V=R;W=T;X=34}else{E=c[e>>2]|0;c[e>>2]=E+4;Y=E;Z=R}}else{V=Q;W=r;X=34}if((X|0)==34){X=0;E=Bc[c[(c[j>>2]|0)+44>>2]&15](j,48)|0;D=c[e>>2]|0;M=D+4|0;c[e>>2]=M;if((W|0)>0){P=D;_=M;M=W;while(1){c[P>>2]=E;M=M+ -1|0;if((M|0)<=0){break}else{$=_;_=_+4|0;P=$}}c[e>>2]=D+(W+1<<2);Y=D+(W<<2)|0;Z=V}else{Y=D;Z=V}}c[Y>>2]=m;aa=Z}else{aa=Q}if((aa|0)==(N|0)){P=Bc[c[(c[j>>2]|0)+44>>2]&15](j,48)|0;_=c[e>>2]|0;M=_+4|0;c[e>>2]=M;c[_>>2]=P;ba=M}else{M=a[o]|0;P=(M&1)==0;if(P){ca=(M&255)>>>1}else{ca=c[B>>2]|0}if((ca|0)==0){da=aa;ea=-1;fa=0;ga=0}else{if(P){ha=z}else{ha=c[A>>2]|0}da=aa;ea=a[ha]|0;fa=0;ga=0}while(1){P=c[e>>2]|0;if((ga|0)==(ea|0)){M=P+4|0;c[e>>2]=M;c[P>>2]=n;_=fa+1|0;E=a[o]|0;$=(E&1)==0;if($){ia=(E&255)>>>1}else{ia=c[B>>2]|0}if(_>>>0<ia>>>0){if($){ja=z}else{ja=c[A>>2]|0}if((a[ja+_|0]|0)==127){ka=M;la=-1;ma=_;na=0}else{if($){oa=z}else{oa=c[A>>2]|0}ka=M;la=a[oa+_|0]|0;ma=_;na=0}}else{ka=M;la=ea;ma=_;na=0}}else{ka=P;la=ea;ma=fa;na=ga}P=da+ -4|0;_=c[P>>2]|0;M=ka+4|0;c[e>>2]=M;c[ka>>2]=_;if((P|0)==(N|0)){ba=M;break}else{da=P;ea=la;fa=ma;ga=na+1|0}}}if((O|0)!=(ba|0)?(D=ba+ -4|0,D>>>0>O>>>0):0){P=O;M=D;while(1){D=c[P>>2]|0;c[P>>2]=c[M>>2];c[M>>2]=D;D=P+4|0;_=M+ -4|0;if(D>>>0<_>>>0){P=D;M=_}else{G=N;break}}}else{G=N}break};case 0:{c[d>>2]=c[e>>2];G=C;break};case 1:{c[d>>2]=c[e>>2];M=Bc[c[(c[j>>2]|0)+44>>2]&15](j,32)|0;P=c[e>>2]|0;c[e>>2]=P+4;c[P>>2]=M;G=C;break};default:{G=C}}g=g+1|0;if((g|0)==4){break}else{C=G}}G=a[q]|0;q=(G&1)==0;if(q){pa=(G&255)>>>1}else{pa=c[t>>2]|0}if(pa>>>0>1){if(q){qa=t;ra=(G&255)>>>1}else{qa=c[u>>2]|0;ra=c[t>>2]|0}t=qa+4|0;u=qa+(ra<<2)|0;G=c[e>>2]|0;if((t|0)==(u|0)){sa=G}else{q=(qa+(ra+ -1<<2)+(0-t)|0)>>>2;ra=G;qa=t;while(1){c[ra>>2]=c[qa>>2];qa=qa+4|0;if((qa|0)==(u|0)){break}else{ra=ra+4|0}}sa=G+(q+1<<2)|0}c[e>>2]=sa}sa=f&176;if((sa|0)==32){c[d>>2]=c[e>>2];i=s;return}else if((sa|0)==16){i=s;return}else{c[d>>2]=b;i=s;return}}function Mj(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0;d=i;i=i+496|0;k=d;l=d+12|0;m=d+40|0;n=d+44|0;o=d+48|0;p=d+16|0;q=d+28|0;r=d+52|0;s=d+64|0;t=d+72|0;u=d+472|0;v=d+476|0;w=d+480|0;Ze(l,g);x=c[l>>2]|0;if(!((c[1498]|0)==-1)){c[k>>2]=5992;c[k+4>>2]=117;c[k+8>>2]=0;Ae(5992,k,118)}y=(c[5996>>2]|0)+ -1|0;z=c[x+8>>2]|0;if(!((c[x+12>>2]|0)-z>>2>>>0>y>>>0)){A=xb(4)|0;wm(A);ec(A|0,13960,106)}x=c[z+(y<<2)>>2]|0;if((x|0)==0){A=xb(4)|0;wm(A);ec(A|0,13960,106)}A=a[j]|0;y=(A&1)==0;if(y){B=(A&255)>>>1}else{B=c[j+4>>2]|0}if((B|0)==0){C=0}else{if(y){D=j+4|0}else{D=c[j+8>>2]|0}y=c[D>>2]|0;C=(y|0)==(Bc[c[(c[x>>2]|0)+44>>2]&15](x,45)|0)}c[m>>2]=0;c[p+0>>2]=0;c[p+4>>2]=0;c[p+8>>2]=0;c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;c[r+0>>2]=0;c[r+4>>2]=0;c[r+8>>2]=0;Kj(f,C,l,m,n,o,p,q,r,s);f=a[j]|0;y=(f&1)==0;if(y){E=(f&255)>>>1}else{E=c[j+4>>2]|0}D=c[s>>2]|0;if((E|0)>(D|0)){if(y){F=(f&255)>>>1}else{F=c[j+4>>2]|0}y=a[r]|0;if((y&1)==0){G=(y&255)>>>1}else{G=c[r+4>>2]|0}y=a[q]|0;if((y&1)==0){H=(y&255)>>>1}else{H=c[q+4>>2]|0}I=G+(F-D<<1|1)+H|0}else{H=a[r]|0;if((H&1)==0){J=(H&255)>>>1}else{J=c[r+4>>2]|0}H=a[q]|0;if((H&1)==0){K=(H&255)>>>1}else{K=c[q+4>>2]|0}I=J+2+K|0}K=I+D|0;if(K>>>0>100){I=Rm(K<<2)|0;if((I|0)==0){bn()}else{L=I;M=I}}else{L=0;M=t}if((f&1)==0){N=j+4|0;O=(f&255)>>>1}else{N=c[j+8>>2]|0;O=c[j+4>>2]|0}Lj(M,u,v,c[g+4>>2]|0,N,N+(O<<2)|0,x,C,m,c[n>>2]|0,c[o>>2]|0,p,q,r,D);c[w>>2]=c[e>>2];e=c[u>>2]|0;u=c[v>>2]|0;c[k+0>>2]=c[w+0>>2];Hh(b,k,M,e,u,g,h);if((L|0)==0){Qe(r);Qe(q);Fe(p);P=c[l>>2]|0;ge(P)|0;i=d;return}Sm(L);Qe(r);Qe(q);Fe(p);P=c[l>>2]|0;ge(P)|0;i=d;return}function Nj(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function Oj(a){a=a|0;return}function Pj(b,d,e){b=b|0;d=d|0;e=e|0;var f=0;e=i;if((a[d]&1)==0){f=d+1|0}else{f=c[d+8>>2]|0}d=tb(f|0,1)|0;i=e;return d>>>((d|0)!=(-1|0)|0)|0}function Qj(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0;d=i;i=i+16|0;j=d;c[j+0>>2]=0;c[j+4>>2]=0;c[j+8>>2]=0;k=a[h]|0;if((k&1)==0){l=h+1|0;m=(k&255)>>>1;n=h+1|0}else{k=c[h+8>>2]|0;l=k;m=c[h+4>>2]|0;n=k}k=l+m|0;if(n>>>0<k>>>0){m=n;do{Ke(j,a[m]|0);m=m+1|0}while((m|0)!=(k|0));k=(e|0)==-1?-1:e<<1;if((a[j]&1)==0){o=k;p=9}else{q=k;r=c[j+8>>2]|0}}else{o=(e|0)==-1?-1:e<<1;p=9}if((p|0)==9){q=o;r=j+1|0}o=Wb(q|0,f|0,g|0,r|0)|0;c[b+0>>2]=0;c[b+4>>2]=0;c[b+8>>2]=0;r=qn(o|0)|0;g=o+r|0;if((r|0)>0){s=o}else{Fe(j);i=d;return}do{Ke(b,a[s]|0);s=s+1|0}while((s|0)!=(g|0));Fe(j);i=d;return}function Rj(a,b){a=a|0;b=b|0;a=i;_a(((b|0)==-1?-1:b<<1)|0)|0;i=a;return}function Sj(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function Tj(a){a=a|0;return}function Uj(b,d,e){b=b|0;d=d|0;e=e|0;var f=0;e=i;if((a[d]&1)==0){f=d+1|0}else{f=c[d+8>>2]|0}d=tb(f|0,1)|0;i=e;return d>>>((d|0)!=(-1|0)|0)|0}function Vj(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0;d=i;i=i+176|0;j=d;k=d+40|0;l=d+168|0;m=d+172|0;n=d+16|0;o=d+8|0;p=d+32|0;c[n+0>>2]=0;c[n+4>>2]=0;c[n+8>>2]=0;c[o+4>>2]=0;c[o>>2]=7656;q=a[h]|0;if((q&1)==0){r=h+4|0;s=(q&255)>>>1;t=h+4|0}else{q=c[h+8>>2]|0;r=q;s=c[h+4>>2]|0;t=q}q=r+(s<<2)|0;s=j;c[s>>2]=0;c[s+4>>2]=0;a:do{if(t>>>0<q>>>0){s=k+32|0;r=t;h=7656|0;while(1){c[m>>2]=r;u=(xc[c[h+12>>2]&15](o,j,r,q,m,k,s,l)|0)==2;v=c[m>>2]|0;if(u|(v|0)==(r|0)){break}if(k>>>0<(c[l>>2]|0)>>>0){u=k;do{Ke(n,a[u]|0);u=u+1|0}while(u>>>0<(c[l>>2]|0)>>>0);w=c[m>>2]|0}else{w=v}if(!(w>>>0<q>>>0)){break a}r=w;h=c[o>>2]|0}pj(6880)}}while(0);if((a[n]&1)==0){x=n+1|0}else{x=c[n+8>>2]|0}o=Wb(((e|0)==-1?-1:e<<1)|0,f|0,g|0,x|0)|0;c[b+0>>2]=0;c[b+4>>2]=0;c[b+8>>2]=0;c[p+4>>2]=0;c[p>>2]=7760;x=qn(o|0)|0;g=o+x|0;f=j;c[f>>2]=0;c[f+4>>2]=0;if((x|0)<=0){Fe(n);i=d;return}x=g;f=k+128|0;e=o;o=7760|0;while(1){c[m>>2]=e;w=(xc[c[o+16>>2]&15](p,j,e,(x-e|0)>32?e+32|0:g,m,k,f,l)|0)==2;q=c[m>>2]|0;if(w|(q|0)==(e|0)){y=20;break}if(k>>>0<(c[l>>2]|0)>>>0){w=k;do{Ue(b,c[w>>2]|0);w=w+4|0}while(w>>>0<(c[l>>2]|0)>>>0);z=c[m>>2]|0}else{z=q}if(!(z>>>0<g>>>0)){y=25;break}e=z;o=c[p>>2]|0}if((y|0)==20){pj(6880)}else if((y|0)==25){Fe(n);i=d;return}}function Wj(a,b){a=a|0;b=b|0;a=i;_a(((b|0)==-1?-1:b<<1)|0)|0;i=a;return}function Xj(b){b=b|0;var d=0,e=0;d=i;c[b>>2]=6088;e=b+8|0;b=c[e>>2]|0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}if((b|0)==(c[1472]|0)){i=d;return}kb(c[e>>2]|0);i=d;return}function Yj(a){a=a|0;a=xb(8)|0;he(a,5880);c[a>>2]=2928;ec(a|0,2968,14)}function Zj(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0;e=i;i=i+16|0;f=e;c[b+4>>2]=d+ -1;c[b>>2]=5920;d=b+8|0;g=b+12|0;h=b+136|0;j=b+24|0;a[h]=1;c[g>>2]=j;c[d>>2]=j;c[b+16>>2]=h;h=28;k=j;do{if((k|0)==0){l=0}else{c[k>>2]=0;l=c[g>>2]|0}k=l+4|0;c[g>>2]=k;h=h+ -1|0}while((h|0)!=0);De(b+144|0,5904,1);h=c[d>>2]|0;d=c[g>>2]|0;if((d|0)!=(h|0)){c[g>>2]=d+(~((d+ -4+(0-h)|0)>>>2)<<2)}c[10812>>2]=0;c[2702]=4400;if(!((c[1106]|0)==-1)){c[f>>2]=4424;c[f+4>>2]=117;c[f+8>>2]=0;Ae(4424,f,118)}_j(b,10808,(c[4428>>2]|0)+ -1|0);c[10804>>2]=0;c[2700]=4440;if(!((c[1116]|0)==-1)){c[f>>2]=4464;c[f+4>>2]=117;c[f+8>>2]=0;Ae(4464,f,118)}_j(b,10800,(c[4468>>2]|0)+ -1|0);c[10788>>2]=0;c[2696]=6016;c[10792>>2]=0;a[10796|0]=0;c[10792>>2]=c[(vb()|0)>>2];if(!((c[1500]|0)==-1)){c[f>>2]=6e3;c[f+4>>2]=117;c[f+8>>2]=0;Ae(6e3,f,118)}_j(b,10784,(c[6004>>2]|0)+ -1|0);c[10780>>2]=0;c[2694]=6976;if(!((c[1498]|0)==-1)){c[f>>2]=5992;c[f+4>>2]=117;c[f+8>>2]=0;Ae(5992,f,118)}_j(b,10776,(c[5996>>2]|0)+ -1|0);c[10772>>2]=0;c[2692]=7192;if(!((c[1516]|0)==-1)){c[f>>2]=6064;c[f+4>>2]=117;c[f+8>>2]=0;Ae(6064,f,118)}_j(b,10768,(c[6068>>2]|0)+ -1|0);c[10756>>2]=0;c[2688]=6088;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}c[10760>>2]=c[1472];if(!((c[1518]|0)==-1)){c[f>>2]=6072;c[f+4>>2]=117;c[f+8>>2]=0;Ae(6072,f,118)}_j(b,10752,(c[6076>>2]|0)+ -1|0);c[10748>>2]=0;c[2686]=7416;if(!((c[1532]|0)==-1)){c[f>>2]=6128;c[f+4>>2]=117;c[f+8>>2]=0;Ae(6128,f,118)}_j(b,10744,(c[6132>>2]|0)+ -1|0);c[10740>>2]=0;c[2684]=7536;if(!((c[1534]|0)==-1)){c[f>>2]=6136;c[f+4>>2]=117;c[f+8>>2]=0;Ae(6136,f,118)}_j(b,10736,(c[6140>>2]|0)+ -1|0);c[10716>>2]=0;c[2678]=6168;a[10720|0]=46;a[10721|0]=44;c[10724>>2]=0;c[10728>>2]=0;c[10732>>2]=0;if(!((c[1536]|0)==-1)){c[f>>2]=6144;c[f+4>>2]=117;c[f+8>>2]=0;Ae(6144,f,118)}_j(b,10712,(c[6148>>2]|0)+ -1|0);c[10684>>2]=0;c[2670]=6208;c[10688>>2]=46;c[10692>>2]=44;c[10696>>2]=0;c[10700>>2]=0;c[10704>>2]=0;if(!((c[1538]|0)==-1)){c[f>>2]=6152;c[f+4>>2]=117;c[f+8>>2]=0;Ae(6152,f,118)}_j(b,10680,(c[6156>>2]|0)+ -1|0);c[10676>>2]=0;c[2668]=4480;if(!((c[1134]|0)==-1)){c[f>>2]=4536;c[f+4>>2]=117;c[f+8>>2]=0;Ae(4536,f,118)}_j(b,10672,(c[4540>>2]|0)+ -1|0);c[10668>>2]=0;c[2666]=4600;if(!((c[1164]|0)==-1)){c[f>>2]=4656;c[f+4>>2]=117;c[f+8>>2]=0;Ae(4656,f,118)}_j(b,10664,(c[4660>>2]|0)+ -1|0);c[10660>>2]=0;c[2664]=4672;if(!((c[1180]|0)==-1)){c[f>>2]=4720;c[f+4>>2]=117;c[f+8>>2]=0;Ae(4720,f,118)}_j(b,10656,(c[4724>>2]|0)+ -1|0);c[10652>>2]=0;c[2662]=4736;if(!((c[1196]|0)==-1)){c[f>>2]=4784;c[f+4>>2]=117;c[f+8>>2]=0;Ae(4784,f,118)}_j(b,10648,(c[4788>>2]|0)+ -1|0);c[10644>>2]=0;c[2660]=5328;if(!((c[1344]|0)==-1)){c[f>>2]=5376;c[f+4>>2]=117;c[f+8>>2]=0;Ae(5376,f,118)}_j(b,10640,(c[5380>>2]|0)+ -1|0);c[10636>>2]=0;c[2658]=5392;if(!((c[1360]|0)==-1)){c[f>>2]=5440;c[f+4>>2]=117;c[f+8>>2]=0;Ae(5440,f,118)}_j(b,10632,(c[5444>>2]|0)+ -1|0);c[10628>>2]=0;c[2656]=5456;if(!((c[1376]|0)==-1)){c[f>>2]=5504;c[f+4>>2]=117;c[f+8>>2]=0;Ae(5504,f,118)}_j(b,10624,(c[5508>>2]|0)+ -1|0);c[10620>>2]=0;c[2654]=5520;if(!((c[1392]|0)==-1)){c[f>>2]=5568;c[f+4>>2]=117;c[f+8>>2]=0;Ae(5568,f,118)}_j(b,10616,(c[5572>>2]|0)+ -1|0);c[10612>>2]=0;c[2652]=5584;if(!((c[1402]|0)==-1)){c[f>>2]=5608;c[f+4>>2]=117;c[f+8>>2]=0;Ae(5608,f,118)}_j(b,10608,(c[5612>>2]|0)+ -1|0);c[10604>>2]=0;c[2650]=5664;if(!((c[1422]|0)==-1)){c[f>>2]=5688;c[f+4>>2]=117;c[f+8>>2]=0;Ae(5688,f,118)}_j(b,10600,(c[5692>>2]|0)+ -1|0);c[10596>>2]=0;c[2648]=5720;if(!((c[1436]|0)==-1)){c[f>>2]=5744;c[f+4>>2]=117;c[f+8>>2]=0;Ae(5744,f,118)}_j(b,10592,(c[5748>>2]|0)+ -1|0);c[10588>>2]=0;c[2646]=5768;if(!((c[1448]|0)==-1)){c[f>>2]=5792;c[f+4>>2]=117;c[f+8>>2]=0;Ae(5792,f,118)}_j(b,10584,(c[5796>>2]|0)+ -1|0);c[10572>>2]=0;c[2642]=4816;c[10576>>2]=4864;if(!((c[1224]|0)==-1)){c[f>>2]=4896;c[f+4>>2]=117;c[f+8>>2]=0;Ae(4896,f,118)}_j(b,10568,(c[4900>>2]|0)+ -1|0);c[10556>>2]=0;c[2638]=4968;c[10560>>2]=5016;if(!((c[1262]|0)==-1)){c[f>>2]=5048;c[f+4>>2]=117;c[f+8>>2]=0;Ae(5048,f,118)}_j(b,10552,(c[5052>>2]|0)+ -1|0);c[10540>>2]=0;c[2634]=6912;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}c[10544>>2]=c[1472];c[2634]=5264;if(!((c[1320]|0)==-1)){c[f>>2]=5280;c[f+4>>2]=117;c[f+8>>2]=0;Ae(5280,f,118)}_j(b,10536,(c[5284>>2]|0)+ -1|0);c[10524>>2]=0;c[2630]=6912;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}c[10528>>2]=c[1472];c[2630]=5296;if(!((c[1328]|0)==-1)){c[f>>2]=5312;c[f+4>>2]=117;c[f+8>>2]=0;Ae(5312,f,118)}_j(b,10520,(c[5316>>2]|0)+ -1|0);c[10516>>2]=0;c[2628]=5808;if(!((c[1458]|0)==-1)){c[f>>2]=5832;c[f+4>>2]=117;c[f+8>>2]=0;Ae(5832,f,118)}_j(b,10512,(c[5836>>2]|0)+ -1|0);c[10508>>2]=0;c[2626]=5848;if((c[1468]|0)==-1){m=c[5876>>2]|0;n=m+ -1|0;_j(b,10504,n);i=e;return}c[f>>2]=5872;c[f+4>>2]=117;c[f+8>>2]=0;Ae(5872,f,118);m=c[5876>>2]|0;n=m+ -1|0;_j(b,10504,n);i=e;return}function _j(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;e=i;fe(b);f=a+8|0;g=a+12|0;a=c[g>>2]|0;h=c[f>>2]|0;j=a-h>>2;do{if(!(j>>>0>d>>>0)){k=d+1|0;if(j>>>0<k>>>0){cm(f,k-j|0);l=c[f>>2]|0;break}if(j>>>0>k>>>0?(m=h+(k<<2)|0,(a|0)!=(m|0)):0){c[g>>2]=a+(~((a+ -4+(0-m)|0)>>>2)<<2);l=h}else{l=h}}else{l=h}}while(0);h=c[l+(d<<2)>>2]|0;if((h|0)==0){n=l;o=n+(d<<2)|0;c[o>>2]=b;i=e;return}ge(h)|0;n=c[f>>2]|0;o=n+(d<<2)|0;c[o>>2]=b;i=e;return}function $j(a){a=a|0;var b=0;b=i;ak(a);Ym(a);i=b;return}function ak(b){b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0;d=i;c[b>>2]=5920;e=b+12|0;f=c[e>>2]|0;g=b+8|0;h=c[g>>2]|0;if((f|0)!=(h|0)){j=f;f=h;h=0;while(1){k=c[f+(h<<2)>>2]|0;if((k|0)==0){l=j;m=f}else{ge(k)|0;l=c[e>>2]|0;m=c[g>>2]|0}h=h+1|0;if(!(h>>>0<l-m>>2>>>0)){break}else{j=l;f=m}}}Fe(b+144|0);m=c[g>>2]|0;if((m|0)==0){i=d;return}g=c[e>>2]|0;if((g|0)!=(m|0)){c[e>>2]=g+(~((g+ -4+(0-m)|0)>>>2)<<2)}if((b+24|0)==(m|0)){a[b+136|0]=0;i=d;return}else{Ym(m);i=d;return}}function bk(){var b=0,d=0,e=0;b=i;if((a[5976]|0)!=0){d=c[1492]|0;i=b;return d|0}if((Ha(5976)|0)==0){d=c[1492]|0;i=b;return d|0}if((a[5952]|0)==0?(Ha(5952)|0)!=0:0){Zj(10344,1);c[1484]=10344;c[1486]=5936;db(5952)}e=c[c[1486]>>2]|0;c[1490]=e;fe(e);c[1492]=5960;db(5976);d=c[1492]|0;i=b;return d|0}function ck(a){a=a|0;var b=0,d=0;b=i;d=c[(bk()|0)>>2]|0;c[a>>2]=d;fe(d);i=b;return}function dk(a,b){a=a|0;b=b|0;var d=0,e=0;d=i;e=c[b>>2]|0;c[a>>2]=e;fe(e);i=d;return}function ek(a){a=a|0;var b=0;b=i;ge(c[a>>2]|0)|0;i=b;return}function fk(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0;d=i;i=i+16|0;e=d;f=c[a>>2]|0;if(!((c[b>>2]|0)==-1)){c[e>>2]=b;c[e+4>>2]=117;c[e+8>>2]=0;Ae(b,e,118)}e=(c[b+4>>2]|0)+ -1|0;b=c[f+8>>2]|0;if(!((c[f+12>>2]|0)-b>>2>>>0>e>>>0)){g=xb(4)|0;wm(g);ec(g|0,13960,106)}f=c[b+(e<<2)>>2]|0;if((f|0)==0){g=xb(4)|0;wm(g);ec(g|0,13960,106)}else{i=d;return f|0}return 0}function gk(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function hk(a){a=a|0;var b=0;b=i;if((a|0)==0){i=b;return}pc[c[(c[a>>2]|0)+4>>2]&255](a);i=b;return}function ik(a){a=a|0;var b=0;b=c[1496]|0;c[1496]=b+1;c[a+4>>2]=b+1;return}function jk(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function kk(a,d,e){a=a|0;d=d|0;e=e|0;var f=0;a=i;if(!(e>>>0<128)){f=0;i=a;return f|0}f=(b[(c[(vb()|0)>>2]|0)+(e<<1)>>1]&d)<<16>>16!=0;i=a;return f|0}function lk(a,d,e,f){a=a|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0;a=i;if((d|0)==(e|0)){g=d;i=a;return g|0}else{h=d;j=f}while(1){f=c[h>>2]|0;if(f>>>0<128){k=b[(c[(vb()|0)>>2]|0)+(f<<1)>>1]|0}else{k=0}b[j>>1]=k;f=h+4|0;if((f|0)==(e|0)){g=e;break}else{h=f;j=j+2|0}}i=a;return g|0}function mk(a,d,e,f){a=a|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0;a=i;a:do{if((e|0)==(f|0)){g=e}else{h=e;while(1){j=c[h>>2]|0;if(j>>>0<128?!((b[(c[(vb()|0)>>2]|0)+(j<<1)>>1]&d)<<16>>16==0):0){g=h;break a}j=h+4|0;if((j|0)==(f|0)){g=f;break}else{h=j}}}}while(0);i=a;return g|0}function nk(a,d,e,f){a=a|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0;a=i;a:do{if((e|0)==(f|0)){g=e}else{h=e;while(1){j=c[h>>2]|0;if(!(j>>>0<128)){g=h;break a}k=h+4|0;if((b[(c[(vb()|0)>>2]|0)+(j<<1)>>1]&d)<<16>>16==0){g=h;break a}if((k|0)==(f|0)){g=f;break}else{h=k}}}}while(0);i=a;return g|0}function ok(a,b){a=a|0;b=b|0;var d=0;a=i;if(!(b>>>0<128)){d=b;i=a;return d|0}d=c[(c[(Ka()|0)>>2]|0)+(b<<2)>>2]|0;i=a;return d|0}function pk(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0;a=i;if((b|0)==(d|0)){e=b;i=a;return e|0}else{f=b}while(1){b=c[f>>2]|0;if(b>>>0<128){g=c[(c[(Ka()|0)>>2]|0)+(b<<2)>>2]|0}else{g=b}c[f>>2]=g;b=f+4|0;if((b|0)==(d|0)){e=d;break}else{f=b}}i=a;return e|0}function qk(a,b){a=a|0;b=b|0;var d=0;a=i;if(!(b>>>0<128)){d=b;i=a;return d|0}d=c[(c[(_b()|0)>>2]|0)+(b<<2)>>2]|0;i=a;return d|0}function rk(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0;a=i;if((b|0)==(d|0)){e=b;i=a;return e|0}else{f=b}while(1){b=c[f>>2]|0;if(b>>>0<128){g=c[(c[(_b()|0)>>2]|0)+(b<<2)>>2]|0}else{g=b}c[f>>2]=g;b=f+4|0;if((b|0)==(d|0)){e=d;break}else{f=b}}i=a;return e|0}function sk(a,b){a=a|0;b=b|0;return b<<24>>24|0}function tk(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0;b=i;if((d|0)==(e|0)){g=d;i=b;return g|0}else{h=d;j=f}while(1){c[j>>2]=a[h]|0;f=h+1|0;if((f|0)==(e|0)){g=e;break}else{h=f;j=j+4|0}}i=b;return g|0}function uk(a,b,c){a=a|0;b=b|0;c=c|0;return(b>>>0<128?b&255:c)|0}function vk(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0;b=i;if((d|0)==(e|0)){h=d;i=b;return h|0}j=((e+ -4+(0-d)|0)>>>2)+1|0;k=d;l=g;while(1){g=c[k>>2]|0;a[l]=g>>>0<128?g&255:f;k=k+4|0;if((k|0)==(e|0)){break}else{l=l+1|0}}h=d+(j<<2)|0;i=b;return h|0}function wk(b){b=b|0;var d=0,e=0;d=i;c[b>>2]=6016;e=c[b+8>>2]|0;if((e|0)!=0?(a[b+12|0]|0)!=0:0){Zm(e)}Ym(b);i=d;return}function xk(b){b=b|0;var d=0,e=0;d=i;c[b>>2]=6016;e=c[b+8>>2]|0;if((e|0)!=0?(a[b+12|0]|0)!=0:0){Zm(e)}i=d;return}function yk(a,b){a=a|0;b=b|0;var d=0;a=i;if(!(b<<24>>24>-1)){d=b;i=a;return d|0}d=c[(c[(Ka()|0)>>2]|0)+((b&255)<<2)>>2]&255;i=a;return d|0}function zk(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;b=i;if((d|0)==(e|0)){f=d;i=b;return f|0}else{g=d}while(1){d=a[g]|0;if(d<<24>>24>-1){h=c[(c[(Ka()|0)>>2]|0)+(d<<24>>24<<2)>>2]&255}else{h=d}a[g]=h;d=g+1|0;if((d|0)==(e|0)){f=e;break}else{g=d}}i=b;return f|0}function Ak(a,b){a=a|0;b=b|0;var d=0;a=i;if(!(b<<24>>24>-1)){d=b;i=a;return d|0}d=c[(c[(_b()|0)>>2]|0)+(b<<24>>24<<2)>>2]&255;i=a;return d|0}function Bk(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;b=i;if((d|0)==(e|0)){f=d;i=b;return f|0}else{g=d}while(1){d=a[g]|0;if(d<<24>>24>-1){h=c[(c[(_b()|0)>>2]|0)+(d<<24>>24<<2)>>2]&255}else{h=d}a[g]=h;d=g+1|0;if((d|0)==(e|0)){f=e;break}else{g=d}}i=b;return f|0}function Ck(a,b){a=a|0;b=b|0;return b|0}function Dk(b,c,d,e){b=b|0;c=c|0;d=d|0;e=e|0;var f=0,g=0;b=i;if((c|0)==(d|0)){f=c}else{g=c;c=e;while(1){a[c]=a[g]|0;e=g+1|0;if((e|0)==(d|0)){f=d;break}else{g=e;c=c+1|0}}}i=b;return f|0}function Ek(a,b,c){a=a|0;b=b|0;c=c|0;return(b<<24>>24>-1?b:c)|0}function Fk(b,c,d,e,f){b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0;b=i;if((c|0)==(d|0)){g=c;i=b;return g|0}else{h=c;j=f}while(1){f=a[h]|0;a[j]=f<<24>>24>-1?f:e;f=h+1|0;if((f|0)==(d|0)){g=d;break}else{h=f;j=j+1|0}}i=b;return g|0}function Gk(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function Hk(a,b,d,e,f,g,h,i){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;c[f>>2]=d;c[i>>2]=g;return 3}function Ik(a,b,d,e,f,g,h,i){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;c[f>>2]=d;c[i>>2]=g;return 3}function Jk(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;c[f>>2]=d;return 3}function Kk(a){a=a|0;return 1}function Lk(a){a=a|0;return 1}function Mk(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;b=d-c|0;return(b>>>0<e>>>0?b:e)|0}function Nk(a){a=a|0;return 1}function Ok(a){a=a|0;var b=0;b=i;Xj(a);Ym(a);i=b;return}function Pk(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0;l=i;i=i+16|0;m=l;n=l+8|0;o=(e|0)==(f|0);a:do{if(!o){p=e;while(1){q=p+4|0;if((c[p>>2]|0)==0){r=p;break}if((q|0)==(f|0)){r=f;break}else{p=q}}c[k>>2]=h;c[g>>2]=e;if(!(o|(h|0)==(j|0))){p=j;q=b+8|0;s=e;t=h;u=r;while(1){v=d;w=c[v+4>>2]|0;x=m;c[x>>2]=c[v>>2];c[x+4>>2]=w;w=Bb(c[q>>2]|0)|0;x=pm(t,g,u-s>>2,p-t|0,d)|0;if((w|0)!=0){Bb(w|0)|0}if((x|0)==-1){y=10;break}else if((x|0)==0){z=1;y=33;break}w=(c[k>>2]|0)+x|0;c[k>>2]=w;if((w|0)==(j|0)){y=31;break}if((u|0)==(f|0)){A=c[g>>2]|0;B=w;C=f}else{w=Bb(c[q>>2]|0)|0;x=om(n,0,d)|0;if((w|0)!=0){Bb(w|0)|0}if((x|0)==-1){z=2;y=33;break}w=c[k>>2]|0;if(x>>>0>(p-w|0)>>>0){z=1;y=33;break}b:do{if((x|0)!=0){v=w;D=x;E=n;while(1){F=a[E]|0;c[k>>2]=v+1;a[v]=F;F=D+ -1|0;if((F|0)==0){break b}v=c[k>>2]|0;D=F;E=E+1|0}}}while(0);x=(c[g>>2]|0)+4|0;c[g>>2]=x;c:do{if((x|0)==(f|0)){G=f}else{w=x;while(1){E=w+4|0;if((c[w>>2]|0)==0){G=w;break c}if((E|0)==(f|0)){G=f;break}else{w=E}}}}while(0);A=x;B=c[k>>2]|0;C=G}if((A|0)==(f|0)|(B|0)==(j|0)){H=A;break a}else{s=A;t=B;u=C}}if((y|0)==10){c[k>>2]=t;d:do{if((s|0)==(c[g>>2]|0)){I=s}else{u=s;p=t;while(1){w=c[u>>2]|0;E=Bb(c[q>>2]|0)|0;D=om(p,w,m)|0;if((E|0)!=0){Bb(E|0)|0}if((D|0)==-1){I=u;break d}E=(c[k>>2]|0)+D|0;c[k>>2]=E;D=u+4|0;if((D|0)==(c[g>>2]|0)){I=D;break}else{u=D;p=E}}}}while(0);c[g>>2]=I;z=2;i=l;return z|0}else if((y|0)==31){H=c[g>>2]|0;break}else if((y|0)==33){i=l;return z|0}}else{H=e}}else{c[k>>2]=h;c[g>>2]=e;H=e}}while(0);z=(H|0)!=(f|0)|0;i=l;return z|0}function Qk(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0;l=i;i=i+16|0;m=l;n=(e|0)==(f|0);a:do{if(!n){o=e;while(1){p=o+1|0;if((a[o]|0)==0){q=o;break}if((p|0)==(f|0)){q=f;break}else{o=p}}c[k>>2]=h;c[g>>2]=e;if(!(n|(h|0)==(j|0))){o=j;p=b+8|0;r=e;s=h;t=q;while(1){u=d;v=c[u+4>>2]|0;w=m;c[w>>2]=c[u>>2];c[w+4>>2]=v;x=t;v=Bb(c[p>>2]|0)|0;w=lm(s,g,x-r|0,o-s>>2,d)|0;if((v|0)!=0){Bb(v|0)|0}if((w|0)==-1){y=10;break}else if((w|0)==0){z=2;y=32;break}v=(c[k>>2]|0)+(w<<2)|0;c[k>>2]=v;if((v|0)==(j|0)){y=30;break}w=c[g>>2]|0;if((t|0)==(f|0)){A=w;B=v;C=f}else{u=Bb(c[p>>2]|0)|0;D=km(v,w,1,d)|0;if((u|0)!=0){Bb(u|0)|0}if((D|0)!=0){z=2;y=32;break}c[k>>2]=(c[k>>2]|0)+4;D=(c[g>>2]|0)+1|0;c[g>>2]=D;b:do{if((D|0)==(f|0)){E=f}else{u=D;while(1){w=u+1|0;if((a[u]|0)==0){E=u;break b}if((w|0)==(f|0)){E=f;break}else{u=w}}}}while(0);A=D;B=c[k>>2]|0;C=E}if((A|0)==(f|0)|(B|0)==(j|0)){F=A;break a}else{r=A;s=B;t=C}}if((y|0)==10){c[k>>2]=s;c:do{if((r|0)!=(c[g>>2]|0)){t=r;o=s;while(1){u=Bb(c[p>>2]|0)|0;w=km(o,t,x-t|0,m)|0;if((u|0)!=0){Bb(u|0)|0}if((w|0)==0){G=t+1|0}else if((w|0)==-1){y=15;break}else if((w|0)==-2){y=16;break}else{G=t+w|0}w=(c[k>>2]|0)+4|0;c[k>>2]=w;if((G|0)==(c[g>>2]|0)){H=G;break c}else{t=G;o=w}}if((y|0)==15){c[g>>2]=t;z=2;i=l;return z|0}else if((y|0)==16){c[g>>2]=t;z=1;i=l;return z|0}}else{H=r}}while(0);c[g>>2]=H;z=(H|0)!=(f|0)|0;i=l;return z|0}else if((y|0)==30){F=c[g>>2]|0;break}else if((y|0)==32){i=l;return z|0}}else{F=e}}else{c[k>>2]=h;c[g>>2]=e;F=e}}while(0);z=(F|0)!=(f|0)|0;i=l;return z|0}function Rk(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0;h=i;i=i+16|0;j=h;c[g>>2]=e;e=Bb(c[b+8>>2]|0)|0;b=om(j,0,d)|0;if((e|0)!=0){Bb(e|0)|0}if((b|0)==0|(b|0)==-1){k=2;i=h;return k|0}e=b+ -1|0;b=c[g>>2]|0;if(e>>>0>(f-b|0)>>>0){k=1;i=h;return k|0}if((e|0)==0){k=0;i=h;return k|0}else{l=b;m=e;n=j}while(1){j=a[n]|0;c[g>>2]=l+1;a[l]=j;j=m+ -1|0;if((j|0)==0){k=0;break}l=c[g>>2]|0;m=j;n=n+1|0}i=h;return k|0}function Sk(a){a=a|0;var b=0,d=0,e=0,f=0;b=i;d=a+8|0;a=Bb(c[d>>2]|0)|0;e=nm(0,0,4)|0;if((a|0)!=0){Bb(a|0)|0}if((e|0)==0){e=c[d>>2]|0;if((e|0)!=0){d=Bb(e|0)|0;if((d|0)==0){f=0}else{Bb(d|0)|0;f=0}}else{f=1}}else{f=-1}i=b;return f|0}function Tk(a){a=a|0;return 0}function Uk(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;g=i;if((f|0)==0|(d|0)==(e|0)){h=0;i=g;return h|0}j=e;k=a+8|0;a=d;d=0;l=0;while(1){m=Bb(c[k>>2]|0)|0;n=jm(a,j-a|0,b)|0;if((m|0)!=0){Bb(m|0)|0}if((n|0)==-2|(n|0)==-1){h=d;o=9;break}else if((n|0)==0){p=a+1|0;q=1}else{p=a+n|0;q=n}n=q+d|0;m=l+1|0;if(m>>>0>=f>>>0|(p|0)==(e|0)){h=n;o=9;break}else{a=p;d=n;l=m}}if((o|0)==9){i=g;return h|0}return 0}function Vk(a){a=a|0;var b=0,d=0,e=0;b=i;d=c[a+8>>2]|0;if((d|0)!=0){a=Bb(d|0)|0;if((a|0)==0){e=4}else{Bb(a|0)|0;e=4}}else{e=1}i=b;return e|0}function Wk(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function Xk(a,b,d,e,f,g,h,j){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0;b=i;i=i+16|0;a=b+4|0;k=b;c[a>>2]=d;c[k>>2]=g;l=Yk(d,e,a,g,h,k,1114111,0)|0;c[f>>2]=d+((c[a>>2]|0)-d>>1<<1);c[j>>2]=g+((c[k>>2]|0)-g);i=b;return l|0}function Yk(d,f,g,h,j,k,l,m){d=d|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0;n=i;c[g>>2]=d;c[k>>2]=h;do{if((m&2|0)!=0){if((j-h|0)<3){o=1;i=n;return o|0}else{c[k>>2]=h+1;a[h]=-17;d=c[k>>2]|0;c[k>>2]=d+1;a[d]=-69;d=c[k>>2]|0;c[k>>2]=d+1;a[d]=-65;break}}}while(0);h=f;m=c[g>>2]|0;if(!(m>>>0<f>>>0)){o=0;i=n;return o|0}d=j;j=m;a:while(1){m=b[j>>1]|0;p=m&65535;if(p>>>0>l>>>0){o=2;q=26;break}do{if((m&65535)<128){r=c[k>>2]|0;if((d-r|0)<1){o=1;q=26;break a}c[k>>2]=r+1;a[r]=m}else{if((m&65535)<2048){r=c[k>>2]|0;if((d-r|0)<2){o=1;q=26;break a}c[k>>2]=r+1;a[r]=p>>>6|192;r=c[k>>2]|0;c[k>>2]=r+1;a[r]=p&63|128;break}if((m&65535)<55296){r=c[k>>2]|0;if((d-r|0)<3){o=1;q=26;break a}c[k>>2]=r+1;a[r]=p>>>12|224;r=c[k>>2]|0;c[k>>2]=r+1;a[r]=p>>>6&63|128;r=c[k>>2]|0;c[k>>2]=r+1;a[r]=p&63|128;break}if(!((m&65535)<56320)){if((m&65535)<57344){o=2;q=26;break a}r=c[k>>2]|0;if((d-r|0)<3){o=1;q=26;break a}c[k>>2]=r+1;a[r]=p>>>12|224;r=c[k>>2]|0;c[k>>2]=r+1;a[r]=p>>>6&63|128;r=c[k>>2]|0;c[k>>2]=r+1;a[r]=p&63|128;break}if((h-j|0)<4){o=1;q=26;break a}r=j+2|0;s=e[r>>1]|0;if((s&64512|0)!=56320){o=2;q=26;break a}if((d-(c[k>>2]|0)|0)<4){o=1;q=26;break a}t=p&960;if(((t<<10)+65536|p<<10&64512|s&1023)>>>0>l>>>0){o=2;q=26;break a}c[g>>2]=r;r=(t>>>6)+1|0;t=c[k>>2]|0;c[k>>2]=t+1;a[t]=r>>>2|240;t=c[k>>2]|0;c[k>>2]=t+1;a[t]=p>>>2&15|r<<4&48|128;r=c[k>>2]|0;c[k>>2]=r+1;a[r]=p<<4&48|s>>>6&15|128;r=c[k>>2]|0;c[k>>2]=r+1;a[r]=s&63|128}}while(0);p=(c[g>>2]|0)+2|0;c[g>>2]=p;if(p>>>0<f>>>0){j=p}else{o=0;q=26;break}}if((q|0)==26){i=n;return o|0}return 0}function Zk(a,b,d,e,f,g,h,j){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0;b=i;i=i+16|0;a=b+4|0;k=b;c[a>>2]=d;c[k>>2]=g;l=_k(d,e,a,g,h,k,1114111,0)|0;c[f>>2]=d+((c[a>>2]|0)-d);c[j>>2]=g+((c[k>>2]|0)-g>>1<<1);i=b;return l|0}function _k(e,f,g,h,j,k,l,m){e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0;n=i;c[g>>2]=e;c[k>>2]=h;h=c[g>>2]|0;if(((((m&4|0)!=0?(f-h|0)>2:0)?(a[h]|0)==-17:0)?(a[h+1|0]|0)==-69:0)?(a[h+2|0]|0)==-65:0){m=h+3|0;c[g>>2]=m;o=m}else{o=h}a:do{if(o>>>0<f>>>0){h=f;m=j;e=c[k>>2]|0;p=o;b:while(1){if(!(e>>>0<j>>>0)){q=p;break a}r=a[p]|0;s=r&255;if(s>>>0>l>>>0){t=2;u=41;break}do{if(r<<24>>24>-1){b[e>>1]=r&255;c[g>>2]=p+1}else{if((r&255)<194){t=2;u=41;break b}if((r&255)<224){if((h-p|0)<2){t=1;u=41;break b}v=d[p+1|0]|0;if((v&192|0)!=128){t=2;u=41;break b}w=v&63|s<<6&1984;if(w>>>0>l>>>0){t=2;u=41;break b}b[e>>1]=w;c[g>>2]=p+2;break}if((r&255)<240){if((h-p|0)<3){t=1;u=41;break b}w=a[p+1|0]|0;v=a[p+2|0]|0;if((s|0)==237){if(!((w&-32)<<24>>24==-128)){t=2;u=41;break b}}else if((s|0)==224){if(!((w&-32)<<24>>24==-96)){t=2;u=41;break b}}else{if(!((w&-64)<<24>>24==-128)){t=2;u=41;break b}}x=v&255;if((x&192|0)!=128){t=2;u=41;break b}v=(w&255)<<6&4032|s<<12|x&63;if((v&65535)>>>0>l>>>0){t=2;u=41;break b}b[e>>1]=v;c[g>>2]=p+3;break}if(!((r&255)<245)){t=2;u=41;break b}if((h-p|0)<4){t=1;u=41;break b}v=a[p+1|0]|0;x=a[p+2|0]|0;w=a[p+3|0]|0;if((s|0)==240){if(!((v+112<<24>>24&255)<48)){t=2;u=41;break b}}else if((s|0)==244){if(!((v&-16)<<24>>24==-128)){t=2;u=41;break b}}else{if(!((v&-64)<<24>>24==-128)){t=2;u=41;break b}}y=x&255;if((y&192|0)!=128){t=2;u=41;break b}x=w&255;if((x&192|0)!=128){t=2;u=41;break b}if((m-e|0)<4){t=1;u=41;break b}w=s&7;z=v&255;v=y<<6;A=x&63;if((z<<12&258048|w<<18|v&4032|A)>>>0>l>>>0){t=2;u=41;break b}b[e>>1]=z<<2&60|y>>>4&3|((z>>>4&3|w<<2)<<6)+16320|55296;w=e+2|0;c[k>>2]=w;b[w>>1]=A|v&960|56320;c[g>>2]=(c[g>>2]|0)+4}}while(0);s=(c[k>>2]|0)+2|0;c[k>>2]=s;r=c[g>>2]|0;if(r>>>0<f>>>0){e=s;p=r}else{q=r;break a}}if((u|0)==41){i=n;return t|0}}else{q=o}}while(0);t=q>>>0<f>>>0|0;i=n;return t|0}function $k(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;c[f>>2]=d;return 3}function al(a){a=a|0;return 0}function bl(a){a=a|0;return 0}function cl(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;b=i;a=dl(c,d,e,1114111,0)|0;i=b;return a|0}function dl(b,c,e,f,g){b=b|0;c=c|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0;h=i;if((((g&4|0)!=0?(c-b|0)>2:0)?(a[b]|0)==-17:0)?(a[b+1|0]|0)==-69:0){j=(a[b+2|0]|0)==-65?b+3|0:b}else{j=b}a:do{if(j>>>0<c>>>0&(e|0)!=0){g=c;k=j;l=0;b:while(1){m=a[k]|0;n=m&255;if(n>>>0>f>>>0){o=k;break a}do{if(m<<24>>24>-1){p=k+1|0;q=l}else{if((m&255)<194){o=k;break a}if((m&255)<224){if((g-k|0)<2){o=k;break a}r=d[k+1|0]|0;if((r&192|0)!=128){o=k;break a}if((r&63|n<<6&1984)>>>0>f>>>0){o=k;break a}p=k+2|0;q=l;break}if((m&255)<240){s=k;if((g-s|0)<3){o=k;break a}r=a[k+1|0]|0;t=a[k+2|0]|0;if((n|0)==224){if(!((r&-32)<<24>>24==-96)){u=21;break b}}else if((n|0)==237){if(!((r&-32)<<24>>24==-128)){u=23;break b}}else{if(!((r&-64)<<24>>24==-128)){u=25;break b}}v=t&255;if((v&192|0)!=128){o=k;break a}if(((r&255)<<6&4032|n<<12&61440|v&63)>>>0>f>>>0){o=k;break a}p=k+3|0;q=l;break}if(!((m&255)<245)){o=k;break a}w=k;if((g-w|0)<4){o=k;break a}if((e-l|0)>>>0<2){o=k;break a}v=a[k+1|0]|0;r=a[k+2|0]|0;t=a[k+3|0]|0;if((n|0)==240){if(!((v+112<<24>>24&255)<48)){u=34;break b}}else if((n|0)==244){if(!((v&-16)<<24>>24==-128)){u=36;break b}}else{if(!((v&-64)<<24>>24==-128)){u=38;break b}}x=r&255;if((x&192|0)!=128){o=k;break a}r=t&255;if((r&192|0)!=128){o=k;break a}if(((v&255)<<12&258048|n<<18&1835008|x<<6&4032|r&63)>>>0>f>>>0){o=k;break a}p=k+4|0;q=l+1|0}}while(0);n=q+1|0;if(p>>>0<c>>>0&n>>>0<e>>>0){k=p;l=n}else{o=p;break a}}if((u|0)==21){y=s-b|0;i=h;return y|0}else if((u|0)==23){y=s-b|0;i=h;return y|0}else if((u|0)==25){y=s-b|0;i=h;return y|0}else if((u|0)==34){y=w-b|0;i=h;return y|0}else if((u|0)==36){y=w-b|0;i=h;return y|0}else if((u|0)==38){y=w-b|0;i=h;return y|0}}else{o=j}}while(0);y=o-b|0;i=h;return y|0}function el(a){a=a|0;return 4}function fl(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function gl(a,b,d,e,f,g,h,j){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0;b=i;i=i+16|0;a=b+4|0;k=b;c[a>>2]=d;c[k>>2]=g;l=hl(d,e,a,g,h,k,1114111,0)|0;c[f>>2]=d+((c[a>>2]|0)-d>>2<<2);c[j>>2]=g+((c[k>>2]|0)-g);i=b;return l|0}function hl(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0;l=i;c[e>>2]=b;c[h>>2]=f;do{if((k&2|0)!=0){if((g-f|0)<3){m=1;i=l;return m|0}else{c[h>>2]=f+1;a[f]=-17;b=c[h>>2]|0;c[h>>2]=b+1;a[b]=-69;b=c[h>>2]|0;c[h>>2]=b+1;a[b]=-65;break}}}while(0);f=c[e>>2]|0;if(!(f>>>0<d>>>0)){m=0;i=l;return m|0}k=g;g=f;a:while(1){f=c[g>>2]|0;if((f&-2048|0)==55296|f>>>0>j>>>0){m=2;n=19;break}do{if(!(f>>>0<128)){if(f>>>0<2048){b=c[h>>2]|0;if((k-b|0)<2){m=1;n=19;break a}c[h>>2]=b+1;a[b]=f>>>6|192;b=c[h>>2]|0;c[h>>2]=b+1;a[b]=f&63|128;break}b=c[h>>2]|0;o=k-b|0;if(f>>>0<65536){if((o|0)<3){m=1;n=19;break a}c[h>>2]=b+1;a[b]=f>>>12|224;p=c[h>>2]|0;c[h>>2]=p+1;a[p]=f>>>6&63|128;p=c[h>>2]|0;c[h>>2]=p+1;a[p]=f&63|128;break}else{if((o|0)<4){m=1;n=19;break a}c[h>>2]=b+1;a[b]=f>>>18|240;b=c[h>>2]|0;c[h>>2]=b+1;a[b]=f>>>12&63|128;b=c[h>>2]|0;c[h>>2]=b+1;a[b]=f>>>6&63|128;b=c[h>>2]|0;c[h>>2]=b+1;a[b]=f&63|128;break}}else{b=c[h>>2]|0;if((k-b|0)<1){m=1;n=19;break a}c[h>>2]=b+1;a[b]=f}}while(0);f=(c[e>>2]|0)+4|0;c[e>>2]=f;if(f>>>0<d>>>0){g=f}else{m=0;n=19;break}}if((n|0)==19){i=l;return m|0}return 0}function il(a,b,d,e,f,g,h,j){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0;b=i;i=i+16|0;a=b+4|0;k=b;c[a>>2]=d;c[k>>2]=g;l=jl(d,e,a,g,h,k,1114111,0)|0;c[f>>2]=d+((c[a>>2]|0)-d);c[j>>2]=g+((c[k>>2]|0)-g>>2<<2);i=b;return l|0}function jl(b,e,f,g,h,j,k,l){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;m=i;c[f>>2]=b;c[j>>2]=g;g=c[f>>2]|0;if(((((l&4|0)!=0?(e-g|0)>2:0)?(a[g]|0)==-17:0)?(a[g+1|0]|0)==-69:0)?(a[g+2|0]|0)==-65:0){l=g+3|0;c[f>>2]=l;n=l}else{n=g}a:do{if(n>>>0<e>>>0){g=e;l=c[j>>2]|0;b=n;while(1){if(!(l>>>0<h>>>0)){o=b;p=39;break a}q=a[b]|0;r=q&255;do{if(q<<24>>24>-1){if(r>>>0>k>>>0){s=2;break a}c[l>>2]=r;c[f>>2]=b+1}else{if((q&255)<194){s=2;break a}if((q&255)<224){if((g-b|0)<2){s=1;break a}t=d[b+1|0]|0;if((t&192|0)!=128){s=2;break a}u=t&63|r<<6&1984;if(u>>>0>k>>>0){s=2;break a}c[l>>2]=u;c[f>>2]=b+2;break}if((q&255)<240){if((g-b|0)<3){s=1;break a}u=a[b+1|0]|0;t=a[b+2|0]|0;if((r|0)==237){if(!((u&-32)<<24>>24==-128)){s=2;break a}}else if((r|0)==224){if(!((u&-32)<<24>>24==-96)){s=2;break a}}else{if(!((u&-64)<<24>>24==-128)){s=2;break a}}v=t&255;if((v&192|0)!=128){s=2;break a}t=(u&255)<<6&4032|r<<12&61440|v&63;if(t>>>0>k>>>0){s=2;break a}c[l>>2]=t;c[f>>2]=b+3;break}if(!((q&255)<245)){s=2;break a}if((g-b|0)<4){s=1;break a}t=a[b+1|0]|0;v=a[b+2|0]|0;u=a[b+3|0]|0;if((r|0)==244){if(!((t&-16)<<24>>24==-128)){s=2;break a}}else if((r|0)==240){if(!((t+112<<24>>24&255)<48)){s=2;break a}}else{if(!((t&-64)<<24>>24==-128)){s=2;break a}}w=v&255;if((w&192|0)!=128){s=2;break a}v=u&255;if((v&192|0)!=128){s=2;break a}u=(t&255)<<12&258048|r<<18&1835008|w<<6&4032|v&63;if(u>>>0>k>>>0){s=2;break a}c[l>>2]=u;c[f>>2]=b+4}}while(0);r=(c[j>>2]|0)+4|0;c[j>>2]=r;q=c[f>>2]|0;if(q>>>0<e>>>0){l=r;b=q}else{o=q;p=39;break}}}else{o=n;p=39}}while(0);if((p|0)==39){s=o>>>0<e>>>0|0}i=m;return s|0}function kl(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;c[f>>2]=d;return 3}function ll(a){a=a|0;return 0}function ml(a){a=a|0;return 0}function nl(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;b=i;a=ol(c,d,e,1114111,0)|0;i=b;return a|0}function ol(b,c,e,f,g){b=b|0;c=c|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;h=i;if((((g&4|0)!=0?(c-b|0)>2:0)?(a[b]|0)==-17:0)?(a[b+1|0]|0)==-69:0){j=(a[b+2|0]|0)==-65?b+3|0:b}else{j=b}a:do{if(j>>>0<c>>>0&(e|0)!=0){g=c;k=j;l=1;b:while(1){m=a[k]|0;n=m&255;do{if(m<<24>>24>-1){if(n>>>0>f>>>0){o=k;break a}p=k+1|0}else{if((m&255)<194){o=k;break a}if((m&255)<224){if((g-k|0)<2){o=k;break a}q=d[k+1|0]|0;if((q&192|0)!=128){o=k;break a}if((q&63|n<<6&1984)>>>0>f>>>0){o=k;break a}p=k+2|0;break}if((m&255)<240){r=k;if((g-r|0)<3){o=k;break a}q=a[k+1|0]|0;s=a[k+2|0]|0;if((n|0)==237){if(!((q&-32)<<24>>24==-128)){t=23;break b}}else if((n|0)==224){if(!((q&-32)<<24>>24==-96)){t=21;break b}}else{if(!((q&-64)<<24>>24==-128)){t=25;break b}}u=s&255;if((u&192|0)!=128){o=k;break a}if(((q&255)<<6&4032|n<<12&61440|u&63)>>>0>f>>>0){o=k;break a}p=k+3|0;break}if(!((m&255)<245)){o=k;break a}v=k;if((g-v|0)<4){o=k;break a}u=a[k+1|0]|0;q=a[k+2|0]|0;s=a[k+3|0]|0;if((n|0)==244){if(!((u&-16)<<24>>24==-128)){t=35;break b}}else if((n|0)==240){if(!((u+112<<24>>24&255)<48)){t=33;break b}}else{if(!((u&-64)<<24>>24==-128)){t=37;break b}}w=q&255;if((w&192|0)!=128){o=k;break a}q=s&255;if((q&192|0)!=128){o=k;break a}if(((u&255)<<12&258048|n<<18&1835008|w<<6&4032|q&63)>>>0>f>>>0){o=k;break a}p=k+4|0}}while(0);if(!(p>>>0<c>>>0&l>>>0<e>>>0)){o=p;break a}k=p;l=l+1|0}if((t|0)==21){x=r-b|0;i=h;return x|0}else if((t|0)==23){x=r-b|0;i=h;return x|0}else if((t|0)==25){x=r-b|0;i=h;return x|0}else if((t|0)==33){x=v-b|0;i=h;return x|0}else if((t|0)==35){x=v-b|0;i=h;return x|0}else if((t|0)==37){x=v-b|0;i=h;return x|0}}else{o=j}}while(0);x=o-b|0;i=h;return x|0}function pl(a){a=a|0;return 4}function ql(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function rl(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function sl(a){a=a|0;var b=0;b=i;c[a>>2]=6168;Fe(a+12|0);Ym(a);i=b;return}function tl(a){a=a|0;var b=0;b=i;c[a>>2]=6168;Fe(a+12|0);i=b;return}function ul(a){a=a|0;var b=0;b=i;c[a>>2]=6208;Fe(a+16|0);Ym(a);i=b;return}function vl(a){a=a|0;var b=0;b=i;c[a>>2]=6208;Fe(a+16|0);i=b;return}function wl(b){b=b|0;return a[b+8|0]|0}function xl(a){a=a|0;return c[a+8>>2]|0}function yl(b){b=b|0;return a[b+9|0]|0}function zl(a){a=a|0;return c[a+12>>2]|0}function Al(a,b){a=a|0;b=b|0;var c=0;c=i;Ce(a,b+12|0);i=c;return}function Bl(a,b){a=a|0;b=b|0;var c=0;c=i;Ce(a,b+16|0);i=c;return}function Cl(a,b){a=a|0;b=b|0;b=i;De(a,6240,4);i=b;return}function Dl(a,b){a=a|0;b=b|0;b=i;Oe(a,6248,rm(6248)|0);i=b;return}function El(a,b){a=a|0;b=b|0;b=i;De(a,6272,5);i=b;return}function Fl(a,b){a=a|0;b=b|0;b=i;Oe(a,6280,rm(6280)|0);i=b;return}function Gl(b){b=b|0;var d=0;b=i;if((a[6312]|0)!=0){d=c[1576]|0;i=b;return d|0}if((Ha(6312)|0)==0){d=c[1576]|0;i=b;return d|0}if((a[13512]|0)==0?(Ha(13512)|0)!=0:0){rn(13344,0,168)|0;ic(121,0,p|0)|0;db(13512)}Ge(13344,13520)|0;Ge(13356|0,13528)|0;Ge(13368|0,13536)|0;Ge(13380|0,13544)|0;Ge(13392|0,13560)|0;Ge(13404|0,13576)|0;Ge(13416|0,13584)|0;Ge(13428|0,13600)|0;Ge(13440|0,13608)|0;Ge(13452|0,13616)|0;Ge(13464|0,13624)|0;Ge(13476|0,13632)|0;Ge(13488|0,13640)|0;Ge(13500|0,13648)|0;c[1576]=13344;db(6312);d=c[1576]|0;i=b;return d|0}function Hl(b){b=b|0;var d=0;b=i;if((a[6328]|0)!=0){d=c[1580]|0;i=b;return d|0}if((Ha(6328)|0)==0){d=c[1580]|0;i=b;return d|0}if((a[12976]|0)==0?(Ha(12976)|0)!=0:0){rn(12808,0,168)|0;ic(122,0,p|0)|0;db(12976)}Re(12808,12984)|0;Re(12820|0,13016)|0;Re(12832|0,13048)|0;Re(12844|0,13080)|0;Re(12856|0,13120)|0;Re(12868|0,13160)|0;Re(12880|0,13192)|0;Re(12892|0,13232)|0;Re(12904|0,13248)|0;Re(12916|0,13264)|0;Re(12928|0,13280)|0;Re(12940|0,13296)|0;Re(12952|0,13312)|0;Re(12964|0,13328)|0;c[1580]=12808;db(6328);d=c[1580]|0;i=b;return d|0}function Il(b){b=b|0;var d=0;b=i;if((a[6344]|0)!=0){d=c[1584]|0;i=b;return d|0}if((Ha(6344)|0)==0){d=c[1584]|0;i=b;return d|0}if((a[12584]|0)==0?(Ha(12584)|0)!=0:0){rn(12296,0,288)|0;ic(123,0,p|0)|0;db(12584)}Ge(12296,12592)|0;Ge(12308|0,12600)|0;Ge(12320|0,12616)|0;Ge(12332|0,12624)|0;Ge(12344|0,12632)|0;Ge(12356|0,12640)|0;Ge(12368|0,12648)|0;Ge(12380|0,12656)|0;Ge(12392|0,12664)|0;Ge(12404|0,12680)|0;Ge(12416|0,12688)|0;Ge(12428|0,12704)|0;Ge(12440|0,12720)|0;Ge(12452|0,12728)|0;Ge(12464|0,12736)|0;Ge(12476|0,12744)|0;Ge(12488|0,12632)|0;Ge(12500|0,12752)|0;Ge(12512|0,12760)|0;Ge(12524|0,12768)|0;Ge(12536|0,12776)|0;Ge(12548|0,12784)|0;Ge(12560|0,12792)|0;Ge(12572|0,12800)|0;c[1584]=12296;db(6344);d=c[1584]|0;i=b;return d|0}function Jl(b){b=b|0;var d=0;b=i;if((a[6360]|0)!=0){d=c[1588]|0;i=b;return d|0}if((Ha(6360)|0)==0){d=c[1588]|0;i=b;return d|0}if((a[11744]|0)==0?(Ha(11744)|0)!=0:0){rn(11456,0,288)|0;ic(124,0,p|0)|0;db(11744)}Re(11456,11752)|0;Re(11468|0,11784)|0;Re(11480|0,11824)|0;Re(11492|0,11848)|0;Re(11504|0,12168)|0;Re(11516|0,11872)|0;Re(11528|0,11896)|0;Re(11540|0,11920)|0;Re(11552|0,11952)|0;Re(11564|0,11992)|0;Re(11576|0,12024)|0;Re(11588|0,12064)|0;Re(11600|0,12104)|0;Re(11612|0,12120)|0;Re(11624|0,12136)|0;Re(11636|0,12152)|0;Re(11648|0,12168)|0;Re(11660|0,12184)|0;Re(11672|0,12200)|0;Re(11684|0,12216)|0;Re(11696|0,12232)|0;Re(11708|0,12248)|0;Re(11720|0,12264)|0;Re(11732|0,12280)|0;c[1588]=11456;db(6360);d=c[1588]|0;i=b;return d|0}function Kl(b){b=b|0;var d=0;b=i;if((a[6376]|0)!=0){d=c[1592]|0;i=b;return d|0}if((Ha(6376)|0)==0){d=c[1592]|0;i=b;return d|0}if((a[11432]|0)==0?(Ha(11432)|0)!=0:0){rn(11144,0,288)|0;ic(125,0,p|0)|0;db(11432)}Ge(11144,11440)|0;Ge(11156|0,11448)|0;c[1592]=11144;db(6376);d=c[1592]|0;i=b;return d|0}function Ll(b){b=b|0;var d=0;b=i;if((a[6392]|0)!=0){d=c[1596]|0;i=b;return d|0}if((Ha(6392)|0)==0){d=c[1596]|0;i=b;return d|0}if((a[11104]|0)==0?(Ha(11104)|0)!=0:0){rn(10816,0,288)|0;ic(126,0,p|0)|0;db(11104)}Re(10816,11112)|0;Re(10828|0,11128)|0;c[1596]=10816;db(6392);d=c[1596]|0;i=b;return d|0}function Ml(b){b=b|0;b=i;if((a[6416]|0)==0?(Ha(6416)|0)!=0:0){De(6400,6424,8);ic(127,6400,p|0)|0;db(6416)}i=b;return 6400}function Nl(b){b=b|0;b=i;if((a[6456]|0)!=0){i=b;return 6440}if((Ha(6456)|0)==0){i=b;return 6440}Oe(6440,6464,rm(6464)|0);ic(128,6440,p|0)|0;db(6456);i=b;return 6440}function Ol(b){b=b|0;b=i;if((a[6520]|0)==0?(Ha(6520)|0)!=0:0){De(6504,6528,8);ic(127,6504,p|0)|0;db(6520)}i=b;return 6504}function Pl(b){b=b|0;b=i;if((a[6560]|0)!=0){i=b;return 6544}if((Ha(6560)|0)==0){i=b;return 6544}Oe(6544,6568,rm(6568)|0);ic(128,6544,p|0)|0;db(6560);i=b;return 6544}function Ql(b){b=b|0;b=i;if((a[6624]|0)==0?(Ha(6624)|0)!=0:0){De(6608,6632,20);ic(127,6608,p|0)|0;db(6624)}i=b;return 6608}function Rl(b){b=b|0;b=i;if((a[6672]|0)!=0){i=b;return 6656}if((Ha(6672)|0)==0){i=b;return 6656}Oe(6656,6680,rm(6680)|0);ic(128,6656,p|0)|0;db(6672);i=b;return 6656}function Sl(b){b=b|0;b=i;if((a[6784]|0)==0?(Ha(6784)|0)!=0:0){De(6768,6792,11);ic(127,6768,p|0)|0;db(6784)}i=b;return 6768}function Tl(b){b=b|0;b=i;if((a[6824]|0)!=0){i=b;return 6808}if((Ha(6824)|0)==0){i=b;return 6808}Oe(6808,6832,rm(6832)|0);ic(128,6808,p|0)|0;db(6824);i=b;return 6808}function Ul(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0.0,j=0,k=0,l=0.0;f=i;i=i+16|0;g=f;if((b|0)==(d|0)){c[e>>2]=4;h=0.0;i=f;return+h}j=cc()|0;k=c[j>>2]|0;c[j>>2]=0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}l=+ln(b,g,c[1472]|0);b=c[j>>2]|0;if((b|0)==0){c[j>>2]=k}if((c[g>>2]|0)!=(d|0)){c[e>>2]=4;h=0.0;i=f;return+h}if((b|0)!=34){h=l;i=f;return+h}c[e>>2]=4;h=l;i=f;return+h}function Vl(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0.0,j=0,k=0,l=0.0;f=i;i=i+16|0;g=f;if((b|0)==(d|0)){c[e>>2]=4;h=0.0;i=f;return+h}j=cc()|0;k=c[j>>2]|0;c[j>>2]=0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}l=+ln(b,g,c[1472]|0);b=c[j>>2]|0;if((b|0)==0){c[j>>2]=k}if((c[g>>2]|0)!=(d|0)){c[e>>2]=4;h=0.0;i=f;return+h}if((b|0)!=34){h=l;i=f;return+h}c[e>>2]=4;h=l;i=f;return+h}function Wl(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0.0,j=0,k=0,l=0.0;f=i;i=i+16|0;g=f;if((b|0)==(d|0)){c[e>>2]=4;h=0.0;i=f;return+h}j=cc()|0;k=c[j>>2]|0;c[j>>2]=0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}l=+ln(b,g,c[1472]|0);b=c[j>>2]|0;if((b|0)==0){c[j>>2]=k}if((c[g>>2]|0)!=(d|0)){c[e>>2]=4;h=0.0;i=f;return+h}if((b|0)==34){c[e>>2]=4}h=l;i=f;return+h}function Xl(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;g=i;i=i+16|0;h=g;do{if((b|0)!=(d|0)){if((a[b]|0)==45){c[e>>2]=4;j=0;k=0;break}l=cc()|0;m=c[l>>2]|0;c[l>>2]=0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}n=ob(b|0,h|0,f|0,c[1472]|0)|0;o=c[l>>2]|0;if((o|0)==0){c[l>>2]=m}if((c[h>>2]|0)!=(d|0)){c[e>>2]=4;j=0;k=0;break}if((o|0)==34){c[e>>2]=4;j=-1;k=-1}else{j=I;k=n}}else{c[e>>2]=4;j=0;k=0}}while(0);I=j;i=g;return k|0}function Yl(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0;g=i;i=i+16|0;h=g;if((b|0)==(d|0)){c[e>>2]=4;j=0;i=g;return j|0}if((a[b]|0)==45){c[e>>2]=4;j=0;i=g;return j|0}k=cc()|0;l=c[k>>2]|0;c[k>>2]=0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}m=ob(b|0,h|0,f|0,c[1472]|0)|0;f=I;b=c[k>>2]|0;if((b|0)==0){c[k>>2]=l}if((c[h>>2]|0)!=(d|0)){c[e>>2]=4;j=0;i=g;return j|0}if((b|0)==34|(f>>>0>0|(f|0)==0&m>>>0>4294967295)){c[e>>2]=4;j=-1;i=g;return j|0}else{j=m;i=g;return j|0}return 0}function Zl(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0;g=i;i=i+16|0;h=g;if((b|0)==(d|0)){c[e>>2]=4;j=0;i=g;return j|0}if((a[b]|0)==45){c[e>>2]=4;j=0;i=g;return j|0}k=cc()|0;l=c[k>>2]|0;c[k>>2]=0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}m=ob(b|0,h|0,f|0,c[1472]|0)|0;f=I;b=c[k>>2]|0;if((b|0)==0){c[k>>2]=l}if((c[h>>2]|0)!=(d|0)){c[e>>2]=4;j=0;i=g;return j|0}if((b|0)==34|(f>>>0>0|(f|0)==0&m>>>0>4294967295)){c[e>>2]=4;j=-1;i=g;return j|0}else{j=m;i=g;return j|0}return 0}function _l(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0;g=i;i=i+16|0;h=g;if((b|0)==(d|0)){c[e>>2]=4;j=0;i=g;return j|0}if((a[b]|0)==45){c[e>>2]=4;j=0;i=g;return j|0}k=cc()|0;l=c[k>>2]|0;c[k>>2]=0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}m=ob(b|0,h|0,f|0,c[1472]|0)|0;f=I;b=c[k>>2]|0;if((b|0)==0){c[k>>2]=l}if((c[h>>2]|0)!=(d|0)){c[e>>2]=4;j=0;i=g;return j|0}if((b|0)==34|(f>>>0>0|(f|0)==0&m>>>0>65535)){c[e>>2]=4;j=-1;i=g;return j|0}else{j=m&65535;i=g;return j|0}return 0}function $l(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0;g=i;i=i+16|0;h=g;if((b|0)==(d|0)){c[e>>2]=4;j=0;k=0;I=j;i=g;return k|0}l=cc()|0;m=c[l>>2]|0;c[l>>2]=0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}n=Yb(b|0,h|0,f|0,c[1472]|0)|0;f=I;b=c[l>>2]|0;if((b|0)==0){c[l>>2]=m}if((c[h>>2]|0)!=(d|0)){c[e>>2]=4;j=0;k=0;I=j;i=g;return k|0}if((b|0)==34){c[e>>2]=4;e=(f|0)>0|(f|0)==0&n>>>0>0;I=e?2147483647:-2147483648;i=g;return(e?-1:0)|0}else{j=f;k=n;I=j;i=g;return k|0}return 0}function am(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0;g=i;i=i+16|0;h=g;if((b|0)==(d|0)){c[e>>2]=4;j=0;i=g;return j|0}k=cc()|0;l=c[k>>2]|0;c[k>>2]=0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}m=Yb(b|0,h|0,f|0,c[1472]|0)|0;f=I;b=c[k>>2]|0;if((b|0)==0){c[k>>2]=l}if((c[h>>2]|0)!=(d|0)){c[e>>2]=4;j=0;i=g;return j|0}do{if((b|0)==34){c[e>>2]=4;if((f|0)>0|(f|0)==0&m>>>0>0){j=2147483647;i=g;return j|0}}else{if((f|0)<-1|(f|0)==-1&m>>>0<2147483648){c[e>>2]=4;break}if((f|0)>0|(f|0)==0&m>>>0>2147483647){c[e>>2]=4;j=2147483647;i=g;return j|0}else{j=m;i=g;return j|0}}}while(0);j=-2147483648;i=g;return j|0}function bm(a){a=a|0;var b=0,e=0,f=0,g=0,h=0;b=i;e=a+4|0;f=d[e]|d[e+1|0]<<8|d[e+2|0]<<16|d[e+3|0]<<24;g=e+4|0;e=d[g]|d[g+1|0]<<8|d[g+2|0]<<16|d[g+3|0]<<24;g=(c[a>>2]|0)+(e>>1)|0;if((e&1|0)==0){h=f;pc[h&255](g);i=b;return}else{h=c[(c[g>>2]|0)+f>>2]|0;pc[h&255](g);i=b;return}}function cm(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0;e=i;f=b+8|0;g=b+4|0;h=c[g>>2]|0;j=c[f>>2]|0;k=h;if(!(j-k>>2>>>0<d>>>0)){l=d;m=h;do{if((m|0)==0){n=0}else{c[m>>2]=0;n=c[g>>2]|0}m=n+4|0;c[g>>2]=m;l=l+ -1|0}while((l|0)!=0);i=e;return}l=b+16|0;m=c[b>>2]|0;n=k-m>>2;k=n+d|0;if(k>>>0>1073741823){Yj(0)}h=j-m|0;if(h>>2>>>0<536870911){m=h>>1;h=m>>>0<k>>>0?k:m;if((h|0)!=0){m=b+128|0;if((a[m]|0)==0&h>>>0<29){a[m]=1;o=h;p=l}else{q=h;r=11}}else{o=0;p=0}}else{q=1073741823;r=11}if((r|0)==11){o=q;p=Wm(q<<2)|0}q=d;d=p+(n<<2)|0;do{if((d|0)==0){s=0}else{c[d>>2]=0;s=d}d=s+4|0;q=q+ -1|0}while((q|0)!=0);q=c[b>>2]|0;s=(c[g>>2]|0)-q|0;r=p+(n-(s>>2)<<2)|0;sn(r|0,q|0,s|0)|0;c[b>>2]=r;c[g>>2]=d;c[f>>2]=p+(o<<2);if((q|0)==0){i=e;return}if((l|0)==(q|0)){a[b+128|0]=0;i=e;return}else{Ym(q);i=e;return}}function dm(a){a=a|0;a=i;Qe(11092|0);Qe(11080|0);Qe(11068|0);Qe(11056|0);Qe(11044|0);Qe(11032|0);Qe(11020|0);Qe(11008|0);Qe(10996|0);Qe(10984|0);Qe(10972|0);Qe(10960|0);Qe(10948|0);Qe(10936|0);Qe(10924|0);Qe(10912|0);Qe(10900|0);Qe(10888|0);Qe(10876|0);Qe(10864|0);Qe(10852|0);Qe(10840|0);Qe(10828|0);Qe(10816);i=a;return}function em(a){a=a|0;a=i;Fe(11420|0);Fe(11408|0);Fe(11396|0);Fe(11384|0);Fe(11372|0);Fe(11360|0);Fe(11348|0);Fe(11336|0);Fe(11324|0);Fe(11312|0);Fe(11300|0);Fe(11288|0);Fe(11276|0);Fe(11264|0);Fe(11252|0);Fe(11240|0);Fe(11228|0);Fe(11216|0);Fe(11204|0);Fe(11192|0);Fe(11180|0);Fe(11168|0);Fe(11156|0);Fe(11144);i=a;return}function fm(a){a=a|0;a=i;Qe(11732|0);Qe(11720|0);Qe(11708|0);Qe(11696|0);Qe(11684|0);Qe(11672|0);Qe(11660|0);Qe(11648|0);Qe(11636|0);Qe(11624|0);Qe(11612|0);Qe(11600|0);Qe(11588|0);Qe(11576|0);Qe(11564|0);Qe(11552|0);Qe(11540|0);Qe(11528|0);Qe(11516|0);Qe(11504|0);Qe(11492|0);Qe(11480|0);Qe(11468|0);Qe(11456);i=a;return}function gm(a){a=a|0;a=i;Fe(12572|0);Fe(12560|0);Fe(12548|0);Fe(12536|0);Fe(12524|0);Fe(12512|0);Fe(12500|0);Fe(12488|0);Fe(12476|0);Fe(12464|0);Fe(12452|0);Fe(12440|0);Fe(12428|0);Fe(12416|0);Fe(12404|0);Fe(12392|0);Fe(12380|0);Fe(12368|0);Fe(12356|0);Fe(12344|0);Fe(12332|0);Fe(12320|0);Fe(12308|0);Fe(12296);i=a;return}function hm(a){a=a|0;a=i;Qe(12964|0);Qe(12952|0);Qe(12940|0);Qe(12928|0);Qe(12916|0);Qe(12904|0);Qe(12892|0);Qe(12880|0);Qe(12868|0);Qe(12856|0);Qe(12844|0);Qe(12832|0);Qe(12820|0);Qe(12808);i=a;return}function im(a){a=a|0;a=i;Fe(13500|0);Fe(13488|0);Fe(13476|0);Fe(13464|0);Fe(13452|0);Fe(13440|0);Fe(13428|0);Fe(13416|0);Fe(13404|0);Fe(13392|0);Fe(13380|0);Fe(13368|0);Fe(13356|0);Fe(13344);i=a;return}function jm(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0;d=i;e=km(0,a,b,(c|0)!=0?c:13864)|0;i=d;return e|0}function km(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;g=i;i=i+16|0;h=g;c[h>>2]=b;j=(f|0)==0?13872:f;f=c[j>>2]|0;a:do{if((d|0)==0){if((f|0)==0){k=0;i=g;return k|0}}else{if((b|0)==0){c[h>>2]=h;l=h}else{l=b}if((e|0)==0){k=-2;i=g;return k|0}do{if((f|0)==0){m=a[d]|0;n=m&255;if(m<<24>>24>-1){c[l>>2]=n;k=m<<24>>24!=0|0;i=g;return k|0}else{m=n+ -194|0;if(m>>>0>50){break a}o=e+ -1|0;p=c[13656+(m<<2)>>2]|0;q=d+1|0;break}}else{o=e;p=f;q=d}}while(0);b:do{if((o|0)==0){r=p}else{m=a[q]|0;n=(m&255)>>>3;if((n+ -16|n+(p>>26))>>>0>7){break a}else{s=o;t=m;u=p;v=q}while(1){v=v+1|0;u=(t&255)+ -128|u<<6;s=s+ -1|0;if((u|0)>=0){break}if((s|0)==0){r=u;break b}t=a[v]|0;if(((t&255)+ -128|0)>>>0>63){break a}}c[j>>2]=0;c[l>>2]=u;k=e-s|0;i=g;return k|0}}while(0);c[j>>2]=r;k=-2;i=g;return k|0}}while(0);c[j>>2]=0;c[(cc()|0)>>2]=84;k=-1;i=g;return k|0}function lm(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;g=i;i=i+1040|0;h=g+8|0;j=g;k=c[b>>2]|0;c[j>>2]=k;l=(a|0)!=0;m=l?e:256;e=l?a:h;a:do{if((k|0)==0|(m|0)==0){n=d;o=m;p=k;q=0;r=e}else{a=d;s=m;t=k;u=0;v=e;while(1){w=a>>>2;x=w>>>0>=s>>>0;if(!(x|a>>>0>131)){n=a;o=s;p=t;q=u;r=v;break a}y=x?s:w;z=a-y|0;w=mm(v,j,y,f)|0;if((w|0)==-1){break}if((v|0)==(h|0)){A=s;B=h}else{A=s-w|0;B=v+(w<<2)|0}y=w+u|0;w=c[j>>2]|0;if((w|0)==0|(A|0)==0){n=z;o=A;p=w;q=y;r=B;break a}else{a=z;s=A;t=w;u=y;v=B}}n=z;o=0;p=c[j>>2]|0;q=-1;r=v}}while(0);b:do{if((p|0)!=0?!((o|0)==0|(n|0)==0):0){z=n;B=o;A=p;h=q;e=r;while(1){C=km(e,A,z,f)|0;if((C+2|0)>>>0<3){break}k=(c[j>>2]|0)+C|0;c[j>>2]=k;m=B+ -1|0;d=h+1|0;if((m|0)==0|(z|0)==(C|0)){D=d;break b}else{z=z-C|0;B=m;A=k;h=d;e=e+4|0}}if((C|0)==-1){D=-1;break}else if((C|0)==0){c[j>>2]=0;D=h;break}else{c[f>>2]=0;D=h;break}}else{D=q}}while(0);if(!l){i=g;return D|0}c[b>>2]=c[j>>2];i=g;return D|0}function mm(b,e,f,g){b=b|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0;h=i;j=c[e>>2]|0;if((g|0)!=0?(k=c[g>>2]|0,(k|0)!=0):0){if((b|0)==0){l=f;m=k;n=j;o=16}else{c[g>>2]=0;p=b;q=f;r=k;s=j;o=36}}else{if((b|0)==0){t=f;u=j;o=7}else{v=b;w=f;x=j;o=6}}a:while(1){if((o|0)==6){o=0;if((w|0)==0){y=f;o=53;break}else{z=v;A=w;B=x}while(1){j=a[B]|0;do{if(((j&255)+ -1|0)>>>0<127?(B&3|0)==0&A>>>0>3:0){k=z;g=A;C=B;while(1){D=c[C>>2]|0;if(((D+ -16843009|D)&-2139062144|0)!=0){o=30;break}c[k>>2]=D&255;c[k+4>>2]=d[C+1|0]|0;c[k+8>>2]=d[C+2|0]|0;E=C+4|0;F=k+16|0;c[k+12>>2]=d[C+3|0]|0;G=g+ -4|0;if(G>>>0>3){k=F;g=G;C=E}else{o=31;break}}if((o|0)==30){o=0;H=k;I=g;J=D&255;K=C;break}else if((o|0)==31){o=0;H=F;I=G;J=a[E]|0;K=E;break}}else{H=z;I=A;J=j;K=B}}while(0);L=J&255;if(!((L+ -1|0)>>>0<127)){break}c[H>>2]=L;j=I+ -1|0;if((j|0)==0){y=f;o=53;break a}else{z=H+4|0;A=j;B=K+1|0}}j=L+ -194|0;if(j>>>0>50){M=H;N=I;O=K;o=47;break}p=H;q=I;r=c[13656+(j<<2)>>2]|0;s=K+1|0;o=36;continue}else if((o|0)==7){o=0;j=a[u]|0;if(((j&255)+ -1|0)>>>0<127?(u&3|0)==0:0){P=c[u>>2]|0;if(((P+ -16843009|P)&-2139062144|0)==0){Q=t;R=u;while(1){S=R+4|0;T=Q+ -4|0;U=c[S>>2]|0;if(((U+ -16843009|U)&-2139062144|0)==0){Q=T;R=S}else{V=T;W=U;X=S;break}}}else{V=t;W=P;X=u}Y=V;Z=W&255;_=X}else{Y=t;Z=j;_=u}R=Z&255;if((R+ -1|0)>>>0<127){t=Y+ -1|0;u=_+1|0;o=7;continue}Q=R+ -194|0;if(Q>>>0>50){M=b;N=Y;O=_;o=47;break}l=Y;m=c[13656+(Q<<2)>>2]|0;n=_+1|0;o=16;continue}else if((o|0)==16){o=0;Q=(d[n]|0)>>>3;if((Q+ -16|Q+(m>>26))>>>0>7){o=17;break}Q=n+1|0;if((m&33554432|0)!=0){if(((d[Q]|0)+ -128|0)>>>0>63){o=20;break}R=n+2|0;if((m&524288|0)==0){$=R}else{if(((d[R]|0)+ -128|0)>>>0>63){o=23;break}$=n+3|0}}else{$=Q}t=l+ -1|0;u=$;o=7;continue}else if((o|0)==36){o=0;Q=d[s]|0;R=Q>>>3;if((R+ -16|R+(r>>26))>>>0>7){o=37;break}R=s+1|0;aa=Q+ -128|r<<6;if((aa|0)<0){Q=(d[R]|0)+ -128|0;if(Q>>>0>63){o=40;break}S=s+2|0;ba=Q|aa<<6;if((ba|0)<0){Q=(d[S]|0)+ -128|0;if(Q>>>0>63){o=43;break}ca=Q|ba<<6;da=s+3|0}else{ca=ba;da=S}}else{ca=aa;da=R}c[p>>2]=ca;v=p+4|0;w=q+ -1|0;x=da;o=6;continue}}if((o|0)==17){ea=b;fa=l;ga=m;ha=n+ -1|0;o=46}else if((o|0)==20){ea=b;fa=l;ga=m;ha=n+ -1|0;o=46}else if((o|0)==23){ea=b;fa=l;ga=m;ha=n+ -1|0;o=46}else if((o|0)==37){ea=p;fa=q;ga=r;ha=s+ -1|0;o=46}else if((o|0)==40){ea=p;fa=q;ga=aa;ha=s+ -1|0;o=46}else if((o|0)==43){ea=p;fa=q;ga=ba;ha=s+ -1|0;o=46}else if((o|0)==53){i=h;return y|0}if((o|0)==46){if((ga|0)==0){M=ea;N=fa;O=ha;o=47}else{ia=ea;ja=ha}}if((o|0)==47){if((a[O]|0)==0){if((M|0)!=0){c[M>>2]=0;c[e>>2]=0}y=f-N|0;i=h;return y|0}else{ia=M;ja=O}}c[(cc()|0)>>2]=84;if((ia|0)==0){y=-1;i=h;return y|0}c[e>>2]=ja;y=-1;i=h;return y|0}function nm(b,e,f){b=b|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0;g=i;i=i+16|0;h=g;c[h>>2]=b;if((e|0)==0){j=0;i=g;return j|0}do{if((f|0)!=0){if((b|0)==0){c[h>>2]=h;k=h}else{k=b}l=a[e]|0;m=l&255;if(l<<24>>24>-1){c[k>>2]=m;j=l<<24>>24!=0|0;i=g;return j|0}l=m+ -194|0;if(!(l>>>0>50)){m=e+1|0;n=c[13656+(l<<2)>>2]|0;if(f>>>0<4?(n&-2147483648>>>((f*6|0)+ -6|0)|0)!=0:0){break}l=d[m]|0;m=l>>>3;if(!((m+ -16|m+(n>>26))>>>0>7)){m=l+ -128|n<<6;if((m|0)>=0){c[k>>2]=m;j=2;i=g;return j|0}n=(d[e+2|0]|0)+ -128|0;if(!(n>>>0>63)){l=n|m<<6;if((l|0)>=0){c[k>>2]=l;j=3;i=g;return j|0}m=(d[e+3|0]|0)+ -128|0;if(!(m>>>0>63)){c[k>>2]=m|l<<6;j=4;i=g;return j|0}}}}}}while(0);c[(cc()|0)>>2]=84;j=-1;i=g;return j|0}function om(b,d,e){b=b|0;d=d|0;e=e|0;var f=0;e=i;if((b|0)==0){f=1;i=e;return f|0}if(d>>>0<128){a[b]=d;f=1;i=e;return f|0}if(d>>>0<2048){a[b]=d>>>6|192;a[b+1|0]=d&63|128;f=2;i=e;return f|0}if(d>>>0<55296|(d+ -57344|0)>>>0<8192){a[b]=d>>>12|224;a[b+1|0]=d>>>6&63|128;a[b+2|0]=d&63|128;f=3;i=e;return f|0}if((d+ -65536|0)>>>0<1048576){a[b]=d>>>18|240;a[b+1|0]=d>>>12&63|128;a[b+2|0]=d>>>6&63|128;a[b+3|0]=d&63|128;f=4;i=e;return f|0}else{c[(cc()|0)>>2]=84;f=-1;i=e;return f|0}return 0}function pm(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0;f=i;i=i+272|0;g=f+8|0;h=f;j=c[b>>2]|0;c[h>>2]=j;k=(a|0)!=0;l=k?e:256;e=k?a:g;a:do{if((j|0)==0|(l|0)==0){m=d;n=l;o=j;p=0;q=e}else{a=d;r=l;s=j;t=0;u=e;while(1){v=a>>>0>=r>>>0;if(!(v|a>>>0>32)){m=a;n=r;o=s;p=t;q=u;break a}w=v?r:a;x=a-w|0;v=qm(u,h,w,0)|0;if((v|0)==-1){break}if((u|0)==(g|0)){y=r;z=g}else{y=r-v|0;z=u+v|0}w=v+t|0;v=c[h>>2]|0;if((v|0)==0|(y|0)==0){m=x;n=y;o=v;p=w;q=z;break a}else{a=x;r=y;s=v;t=w;u=z}}m=x;n=0;o=c[h>>2]|0;p=-1;q=u}}while(0);b:do{if((o|0)!=0?!((n|0)==0|(m|0)==0):0){x=m;z=n;y=o;g=p;e=q;while(1){A=om(e,c[y>>2]|0,0)|0;if((A+1|0)>>>0<2){break}j=(c[h>>2]|0)+4|0;c[h>>2]=j;l=x+ -1|0;d=g+1|0;if((z|0)==(A|0)|(l|0)==0){B=d;break b}else{x=l;z=z-A|0;y=j;g=d;e=e+A|0}}if((A|0)==0){c[h>>2]=0;B=g}else{B=-1}}else{B=p}}while(0);if(!k){i=f;return B|0}c[b>>2]=c[h>>2];i=f;return B|0}function qm(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0;f=i;i=i+16|0;g=f;if((b|0)==0){h=c[d>>2]|0;j=c[h>>2]|0;if((j|0)==0){k=0;i=f;return k|0}else{l=0;m=j;n=h}while(1){if(m>>>0>127){h=om(g,m,0)|0;if((h|0)==-1){k=-1;o=26;break}else{p=h}}else{p=1}h=p+l|0;j=n+4|0;q=c[j>>2]|0;if((q|0)==0){k=h;o=26;break}else{l=h;m=q;n=j}}if((o|0)==26){i=f;return k|0}}a:do{if(e>>>0>3){n=b;m=e;l=c[d>>2]|0;while(1){p=c[l>>2]|0;if((p|0)==0){r=n;s=m;break a}if(p>>>0>127){j=om(n,p,0)|0;if((j|0)==-1){k=-1;break}t=n+j|0;u=m-j|0;v=l}else{a[n]=p;t=n+1|0;u=m+ -1|0;v=c[d>>2]|0}p=v+4|0;c[d>>2]=p;if(u>>>0>3){n=t;m=u;l=p}else{r=t;s=u;break a}}i=f;return k|0}else{r=b;s=e}}while(0);b:do{if((s|0)!=0){b=r;u=s;t=c[d>>2]|0;while(1){v=c[t>>2]|0;if((v|0)==0){o=24;break}if(v>>>0>127){l=om(g,v,0)|0;if((l|0)==-1){k=-1;o=26;break}if(l>>>0>u>>>0){o=20;break}om(b,c[t>>2]|0,0)|0;w=b+l|0;x=u-l|0;y=t}else{a[b]=v;w=b+1|0;x=u+ -1|0;y=c[d>>2]|0}v=y+4|0;c[d>>2]=v;if((x|0)==0){z=0;break b}else{b=w;u=x;t=v}}if((o|0)==20){k=e-u|0;i=f;return k|0}else if((o|0)==24){a[b]=0;z=u;break}else if((o|0)==26){i=f;return k|0}}else{z=0}}while(0);c[d>>2]=0;k=e-z|0;i=f;return k|0}function rm(a){a=a|0;var b=0,d=0;b=i;d=a;while(1){if((c[d>>2]|0)==0){break}else{d=d+4|0}}i=b;return d-a>>2|0}function sm(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0;e=i;if((d|0)==0){i=e;return a|0}else{f=d;g=b;h=a}while(1){f=f+ -1|0;c[h>>2]=c[g>>2];if((f|0)==0){break}else{g=g+4|0;h=h+4|0}}i=e;return a|0}function tm(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0;e=i;f=(d|0)==0;if(a-b>>2>>>0<d>>>0){if(!f){g=d;do{g=g+ -1|0;c[a+(g<<2)>>2]=c[b+(g<<2)>>2]}while((g|0)!=0)}}else{if(!f){f=b;b=a;g=d;while(1){g=g+ -1|0;c[b>>2]=c[f>>2];if((g|0)==0){break}else{f=f+4|0;b=b+4|0}}}}i=e;return a|0}function um(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0;e=i;if((d|0)!=0){f=d;d=a;while(1){f=f+ -1|0;c[d>>2]=b;if((f|0)==0){break}else{d=d+4|0}}}i=e;return a|0}function vm(a){a=a|0;return}function wm(a){a=a|0;c[a>>2]=13888;return}function xm(a){a=a|0;var b=0;b=i;Xa(a|0);Ym(a);i=b;return}function ym(a){a=a|0;var b=0;b=i;Xa(a|0);i=b;return}function zm(a){a=a|0;return 13904}function Am(a){a=a|0;return}function Bm(a){a=a|0;return}function Cm(a){a=a|0;return}function Dm(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function Em(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function Fm(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function Gm(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0;e=i;i=i+64|0;f=e;if((a|0)==(b|0)){g=1;i=e;return g|0}if((b|0)==0){g=0;i=e;return g|0}h=Km(b,14016,14072,0)|0;if((h|0)==0){g=0;i=e;return g|0}b=f+0|0;j=b+56|0;do{c[b>>2]=0;b=b+4|0}while((b|0)<(j|0));c[f>>2]=h;c[f+8>>2]=a;c[f+12>>2]=-1;c[f+48>>2]=1;Dc[c[(c[h>>2]|0)+28>>2]&15](h,f,c[d>>2]|0,1);if((c[f+24>>2]|0)!=1){g=0;i=e;return g|0}c[d>>2]=c[f+16>>2];g=1;i=e;return g|0}function Hm(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0;g=i;if((c[d+8>>2]|0)!=(b|0)){i=g;return}b=d+16|0;h=c[b>>2]|0;if((h|0)==0){c[b>>2]=e;c[d+24>>2]=f;c[d+36>>2]=1;i=g;return}if((h|0)!=(e|0)){e=d+36|0;c[e>>2]=(c[e>>2]|0)+1;c[d+24>>2]=2;a[d+54|0]=1;i=g;return}e=d+24|0;if((c[e>>2]|0)!=2){i=g;return}c[e>>2]=f;i=g;return}function Im(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0;g=i;if((b|0)!=(c[d+8>>2]|0)){h=c[b+8>>2]|0;Dc[c[(c[h>>2]|0)+28>>2]&15](h,d,e,f);i=g;return}h=d+16|0;b=c[h>>2]|0;if((b|0)==0){c[h>>2]=e;c[d+24>>2]=f;c[d+36>>2]=1;i=g;return}if((b|0)!=(e|0)){e=d+36|0;c[e>>2]=(c[e>>2]|0)+1;c[d+24>>2]=2;a[d+54|0]=1;i=g;return}e=d+24|0;if((c[e>>2]|0)!=2){i=g;return}c[e>>2]=f;i=g;return}function Jm(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;g=i;if((b|0)==(c[d+8>>2]|0)){h=d+16|0;j=c[h>>2]|0;if((j|0)==0){c[h>>2]=e;c[d+24>>2]=f;c[d+36>>2]=1;i=g;return}if((j|0)!=(e|0)){j=d+36|0;c[j>>2]=(c[j>>2]|0)+1;c[d+24>>2]=2;a[d+54|0]=1;i=g;return}j=d+24|0;if((c[j>>2]|0)!=2){i=g;return}c[j>>2]=f;i=g;return}j=c[b+12>>2]|0;h=b+(j<<3)+16|0;k=c[b+20>>2]|0;l=k>>8;if((k&1|0)==0){m=l}else{m=c[(c[e>>2]|0)+l>>2]|0}l=c[b+16>>2]|0;Dc[c[(c[l>>2]|0)+28>>2]&15](l,d,e+m|0,(k&2|0)!=0?f:2);if((j|0)<=1){i=g;return}j=d+54|0;k=b+24|0;while(1){b=c[k+4>>2]|0;m=b>>8;if((b&1|0)==0){n=m}else{n=c[(c[e>>2]|0)+m>>2]|0}m=c[k>>2]|0;Dc[c[(c[m>>2]|0)+28>>2]&15](m,d,e+n|0,(b&2|0)!=0?f:2);if((a[j]|0)!=0){o=16;break}b=k+8|0;if(b>>>0<h>>>0){k=b}else{o=16;break}}if((o|0)==16){i=g;return}}function Km(d,e,f,g){d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;h=i;i=i+64|0;j=h;k=c[d>>2]|0;l=d+(c[k+ -8>>2]|0)|0;m=c[k+ -4>>2]|0;c[j>>2]=f;c[j+4>>2]=d;c[j+8>>2]=e;c[j+12>>2]=g;g=j+16|0;e=j+20|0;d=j+24|0;k=j+28|0;n=j+32|0;o=j+40|0;p=(m|0)==(f|0);f=g+0|0;q=f+36|0;do{c[f>>2]=0;f=f+4|0}while((f|0)<(q|0));b[g+36>>1]=0;a[g+38|0]=0;if(p){c[j+48>>2]=1;lc[c[(c[m>>2]|0)+20>>2]&15](m,j,l,l,1,0);r=(c[d>>2]|0)==1?l:0;i=h;return r|0}Ac[c[(c[m>>2]|0)+24>>2]&3](m,j,l,1,0);l=c[j+36>>2]|0;if((l|0)==0){if((c[o>>2]|0)!=1){r=0;i=h;return r|0}if((c[k>>2]|0)!=1){r=0;i=h;return r|0}r=(c[n>>2]|0)==1?c[e>>2]|0:0;i=h;return r|0}else if((l|0)==1){if((c[d>>2]|0)!=1){if((c[o>>2]|0)!=0){r=0;i=h;return r|0}if((c[k>>2]|0)!=1){r=0;i=h;return r|0}if((c[n>>2]|0)!=1){r=0;i=h;return r|0}}r=c[g>>2]|0;i=h;return r|0}else{r=0;i=h;return r|0}return 0}function Lm(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0;h=i;if((b|0)==(c[d+8>>2]|0)){if((c[d+4>>2]|0)!=(e|0)){i=h;return}j=d+28|0;if((c[j>>2]|0)==1){i=h;return}c[j>>2]=f;i=h;return}if((b|0)==(c[d>>2]|0)){if((c[d+16>>2]|0)!=(e|0)?(j=d+20|0,(c[j>>2]|0)!=(e|0)):0){c[d+32>>2]=f;k=d+44|0;if((c[k>>2]|0)==4){i=h;return}l=c[b+12>>2]|0;m=b+(l<<3)+16|0;a:do{if((l|0)>0){n=d+52|0;o=d+53|0;p=d+54|0;q=b+8|0;r=d+24|0;s=0;t=0;u=b+16|0;b:while(1){a[n]=0;a[o]=0;v=c[u+4>>2]|0;w=v>>8;if((v&1|0)==0){x=w}else{x=c[(c[e>>2]|0)+w>>2]|0}w=c[u>>2]|0;lc[c[(c[w>>2]|0)+20>>2]&15](w,d,e,e+x|0,2-(v>>>1&1)|0,g);if((a[p]|0)!=0){y=s;z=t;break}do{if((a[o]|0)!=0){if((a[n]|0)==0){if((c[q>>2]&1|0)==0){y=s;z=1;break b}else{A=s;B=1;break}}if((c[r>>2]|0)==1){C=27;break a}if((c[q>>2]&2|0)==0){C=27;break a}else{A=1;B=1}}else{A=s;B=t}}while(0);v=u+8|0;if(v>>>0<m>>>0){s=A;t=B;u=v}else{y=A;z=B;break}}if(y){D=z;C=26}else{E=z;C=23}}else{E=0;C=23}}while(0);if((C|0)==23){c[j>>2]=e;j=d+40|0;c[j>>2]=(c[j>>2]|0)+1;if((c[d+36>>2]|0)==1?(c[d+24>>2]|0)==2:0){a[d+54|0]=1;if(E){C=27}else{C=28}}else{D=E;C=26}}if((C|0)==26){if(D){C=27}else{C=28}}if((C|0)==27){c[k>>2]=3;i=h;return}else if((C|0)==28){c[k>>2]=4;i=h;return}}if((f|0)!=1){i=h;return}c[d+32>>2]=1;i=h;return}k=c[b+12>>2]|0;D=b+(k<<3)+16|0;E=c[b+20>>2]|0;j=E>>8;if((E&1|0)==0){F=j}else{F=c[(c[e>>2]|0)+j>>2]|0}j=c[b+16>>2]|0;Ac[c[(c[j>>2]|0)+24>>2]&3](j,d,e+F|0,(E&2|0)!=0?f:2,g);E=b+24|0;if((k|0)<=1){i=h;return}k=c[b+8>>2]|0;if((k&2|0)==0?(b=d+36|0,(c[b>>2]|0)!=1):0){if((k&1|0)==0){k=d+54|0;F=E;while(1){if((a[k]|0)!=0){C=53;break}if((c[b>>2]|0)==1){C=53;break}j=c[F+4>>2]|0;z=j>>8;if((j&1|0)==0){G=z}else{G=c[(c[e>>2]|0)+z>>2]|0}z=c[F>>2]|0;Ac[c[(c[z>>2]|0)+24>>2]&3](z,d,e+G|0,(j&2|0)!=0?f:2,g);j=F+8|0;if(j>>>0<D>>>0){F=j}else{C=53;break}}if((C|0)==53){i=h;return}}F=d+24|0;G=d+54|0;k=E;while(1){if((a[G]|0)!=0){C=53;break}if((c[b>>2]|0)==1?(c[F>>2]|0)==1:0){C=53;break}j=c[k+4>>2]|0;z=j>>8;if((j&1|0)==0){H=z}else{H=c[(c[e>>2]|0)+z>>2]|0}z=c[k>>2]|0;Ac[c[(c[z>>2]|0)+24>>2]&3](z,d,e+H|0,(j&2|0)!=0?f:2,g);j=k+8|0;if(j>>>0<D>>>0){k=j}else{C=53;break}}if((C|0)==53){i=h;return}}k=d+54|0;H=E;while(1){if((a[k]|0)!=0){C=53;break}E=c[H+4>>2]|0;F=E>>8;if((E&1|0)==0){I=F}else{I=c[(c[e>>2]|0)+F>>2]|0}F=c[H>>2]|0;Ac[c[(c[F>>2]|0)+24>>2]&3](F,d,e+I|0,(E&2|0)!=0?f:2,g);E=H+8|0;if(E>>>0<D>>>0){H=E}else{C=53;break}}if((C|0)==53){i=h;return}}



function tg(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0;e=i;i=i+224|0;l=e+198|0;m=e+196|0;n=e+16|0;o=e+4|0;p=e+192|0;q=e+32|0;r=e;s=e+28|0;t=c[h+4>>2]&74;if((t|0)==0){u=0}else if((t|0)==64){u=8}else if((t|0)==8){u=16}else{u=10}hh(n,h,l,m);c[o+0>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;He(o,10,0);if((a[o]&1)==0){h=o+1|0;v=h;w=o+8|0;x=h}else{h=o+8|0;v=o+1|0;w=h;x=c[h>>2]|0}c[p>>2]=x;c[r>>2]=q;c[s>>2]=0;h=o+4|0;t=a[m]|0;m=c[f>>2]|0;y=x;a:while(1){if((m|0)!=0){if((c[m+12>>2]|0)==(c[m+16>>2]|0)?(sc[c[(c[m>>2]|0)+36>>2]&127](m)|0)==-1:0){c[f>>2]=0;z=0}else{z=m}}else{z=0}x=(z|0)==0;A=c[g>>2]|0;do{if((A|0)!=0){if((c[A+12>>2]|0)!=(c[A+16>>2]|0)){if(x){B=A;break}else{C=A;D=y;break a}}if(!((sc[c[(c[A>>2]|0)+36>>2]&127](A)|0)==-1)){if(x){B=A;break}else{C=A;D=y;break a}}else{c[g>>2]=0;E=18;break}}else{E=18}}while(0);if((E|0)==18){E=0;if(x){C=0;D=y;break}else{B=0}}A=a[o]|0;F=(A&1)==0;if(F){G=(A&255)>>>1}else{G=c[h>>2]|0}if(((c[p>>2]|0)-y|0)==(G|0)){if(F){H=(A&255)>>>1;J=(A&255)>>>1}else{A=c[h>>2]|0;H=A;J=A}He(o,H<<1,0);if((a[o]&1)==0){K=10}else{K=(c[o>>2]&-2)+ -1|0}He(o,K,0);if((a[o]&1)==0){L=v}else{L=c[w>>2]|0}c[p>>2]=L+J;M=L}else{M=y}A=z+12|0;F=c[A>>2]|0;N=z+16|0;if((F|0)==(c[N>>2]|0)){O=sc[c[(c[z>>2]|0)+36>>2]&127](z)|0}else{O=d[F]|0}if((Jg(O&255,u,M,p,s,t,n,q,r,l)|0)!=0){C=B;D=M;break}F=c[A>>2]|0;if((F|0)==(c[N>>2]|0)){sc[c[(c[z>>2]|0)+40>>2]&127](z)|0;m=z;y=M;continue}else{c[A>>2]=F+1;m=z;y=M;continue}}M=a[n]|0;if((M&1)==0){P=(M&255)>>>1}else{P=c[n+4>>2]|0}if((P|0)!=0?(P=c[r>>2]|0,(P-q|0)<160):0){M=c[s>>2]|0;c[r>>2]=P+4;c[P>>2]=M}M=$l(D,c[p>>2]|0,j,u)|0;u=k;c[u>>2]=M;c[u+4>>2]=I;tj(n,q,c[r>>2]|0,j);if((z|0)!=0){if((c[z+12>>2]|0)==(c[z+16>>2]|0)?(sc[c[(c[z>>2]|0)+36>>2]&127](z)|0)==-1:0){c[f>>2]=0;Q=0}else{Q=z}}else{Q=0}z=(Q|0)==0;do{if((C|0)!=0){if((c[C+12>>2]|0)!=(c[C+16>>2]|0)){if(!z){break}c[b>>2]=Q;Fe(o);Fe(n);i=e;return}if((sc[c[(c[C>>2]|0)+36>>2]&127](C)|0)==-1){c[g>>2]=0;E=54;break}if(z^(C|0)==0){c[b>>2]=Q;Fe(o);Fe(n);i=e;return}}else{E=54}}while(0);if((E|0)==54?!z:0){c[b>>2]=Q;Fe(o);Fe(n);i=e;return}c[j>>2]=c[j>>2]|2;c[b>>2]=Q;Fe(o);Fe(n);i=e;return}function ug(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;l=b+4|0;m=b;c[l>>2]=c[d>>2];c[m>>2]=c[e>>2];c[k+0>>2]=c[l+0>>2];c[j+0>>2]=c[m+0>>2];vg(a,0,k,j,f,g,h);i=b;return}function vg(e,f,g,h,j,k,l){e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0;f=i;i=i+224|0;m=f+198|0;n=f+196|0;o=f+16|0;p=f+4|0;q=f+192|0;r=f+32|0;s=f;t=f+28|0;u=c[j+4>>2]&74;if((u|0)==0){v=0}else if((u|0)==64){v=8}else if((u|0)==8){v=16}else{v=10}hh(o,j,m,n);c[p+0>>2]=0;c[p+4>>2]=0;c[p+8>>2]=0;He(p,10,0);if((a[p]&1)==0){j=p+1|0;w=j;x=p+8|0;y=j}else{j=p+8|0;w=p+1|0;x=j;y=c[j>>2]|0}c[q>>2]=y;c[s>>2]=r;c[t>>2]=0;j=p+4|0;u=a[n]|0;n=c[g>>2]|0;z=y;a:while(1){if((n|0)!=0){if((c[n+12>>2]|0)==(c[n+16>>2]|0)?(sc[c[(c[n>>2]|0)+36>>2]&127](n)|0)==-1:0){c[g>>2]=0;A=0}else{A=n}}else{A=0}y=(A|0)==0;B=c[h>>2]|0;do{if((B|0)!=0){if((c[B+12>>2]|0)!=(c[B+16>>2]|0)){if(y){C=B;break}else{D=B;E=z;break a}}if(!((sc[c[(c[B>>2]|0)+36>>2]&127](B)|0)==-1)){if(y){C=B;break}else{D=B;E=z;break a}}else{c[h>>2]=0;F=18;break}}else{F=18}}while(0);if((F|0)==18){F=0;if(y){D=0;E=z;break}else{C=0}}B=a[p]|0;G=(B&1)==0;if(G){H=(B&255)>>>1}else{H=c[j>>2]|0}if(((c[q>>2]|0)-z|0)==(H|0)){if(G){I=(B&255)>>>1;J=(B&255)>>>1}else{B=c[j>>2]|0;I=B;J=B}He(p,I<<1,0);if((a[p]&1)==0){K=10}else{K=(c[p>>2]&-2)+ -1|0}He(p,K,0);if((a[p]&1)==0){L=w}else{L=c[x>>2]|0}c[q>>2]=L+J;M=L}else{M=z}B=A+12|0;G=c[B>>2]|0;N=A+16|0;if((G|0)==(c[N>>2]|0)){O=sc[c[(c[A>>2]|0)+36>>2]&127](A)|0}else{O=d[G]|0}if((Jg(O&255,v,M,q,t,u,o,r,s,m)|0)!=0){D=C;E=M;break}G=c[B>>2]|0;if((G|0)==(c[N>>2]|0)){sc[c[(c[A>>2]|0)+40>>2]&127](A)|0;n=A;z=M;continue}else{c[B>>2]=G+1;n=A;z=M;continue}}M=a[o]|0;if((M&1)==0){P=(M&255)>>>1}else{P=c[o+4>>2]|0}if((P|0)!=0?(P=c[s>>2]|0,(P-r|0)<160):0){M=c[t>>2]|0;c[s>>2]=P+4;c[P>>2]=M}b[l>>1]=_l(E,c[q>>2]|0,k,v)|0;tj(o,r,c[s>>2]|0,k);if((A|0)!=0){if((c[A+12>>2]|0)==(c[A+16>>2]|0)?(sc[c[(c[A>>2]|0)+36>>2]&127](A)|0)==-1:0){c[g>>2]=0;Q=0}else{Q=A}}else{Q=0}A=(Q|0)==0;do{if((D|0)!=0){if((c[D+12>>2]|0)!=(c[D+16>>2]|0)){if(!A){break}c[e>>2]=Q;Fe(p);Fe(o);i=f;return}if((sc[c[(c[D>>2]|0)+36>>2]&127](D)|0)==-1){c[h>>2]=0;F=54;break}if(A^(D|0)==0){c[e>>2]=Q;Fe(p);Fe(o);i=f;return}}else{F=54}}while(0);if((F|0)==54?!A:0){c[e>>2]=Q;Fe(p);Fe(o);i=f;return}c[k>>2]=c[k>>2]|2;c[e>>2]=Q;Fe(p);Fe(o);i=f;return}function wg(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;l=b+4|0;m=b;c[l>>2]=c[d>>2];c[m>>2]=c[e>>2];c[k+0>>2]=c[l+0>>2];c[j+0>>2]=c[m+0>>2];xg(a,0,k,j,f,g,h);i=b;return}function xg(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0;e=i;i=i+224|0;l=e+198|0;m=e+196|0;n=e+16|0;o=e+4|0;p=e+192|0;q=e+32|0;r=e;s=e+28|0;t=c[h+4>>2]&74;if((t|0)==0){u=0}else if((t|0)==64){u=8}else if((t|0)==8){u=16}else{u=10}hh(n,h,l,m);c[o+0>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;He(o,10,0);if((a[o]&1)==0){h=o+1|0;v=h;w=o+8|0;x=h}else{h=o+8|0;v=o+1|0;w=h;x=c[h>>2]|0}c[p>>2]=x;c[r>>2]=q;c[s>>2]=0;h=o+4|0;t=a[m]|0;m=c[f>>2]|0;y=x;a:while(1){if((m|0)!=0){if((c[m+12>>2]|0)==(c[m+16>>2]|0)?(sc[c[(c[m>>2]|0)+36>>2]&127](m)|0)==-1:0){c[f>>2]=0;z=0}else{z=m}}else{z=0}x=(z|0)==0;A=c[g>>2]|0;do{if((A|0)!=0){if((c[A+12>>2]|0)!=(c[A+16>>2]|0)){if(x){B=A;break}else{C=A;D=y;break a}}if(!((sc[c[(c[A>>2]|0)+36>>2]&127](A)|0)==-1)){if(x){B=A;break}else{C=A;D=y;break a}}else{c[g>>2]=0;E=18;break}}else{E=18}}while(0);if((E|0)==18){E=0;if(x){C=0;D=y;break}else{B=0}}A=a[o]|0;F=(A&1)==0;if(F){G=(A&255)>>>1}else{G=c[h>>2]|0}if(((c[p>>2]|0)-y|0)==(G|0)){if(F){H=(A&255)>>>1;I=(A&255)>>>1}else{A=c[h>>2]|0;H=A;I=A}He(o,H<<1,0);if((a[o]&1)==0){J=10}else{J=(c[o>>2]&-2)+ -1|0}He(o,J,0);if((a[o]&1)==0){K=v}else{K=c[w>>2]|0}c[p>>2]=K+I;L=K}else{L=y}A=z+12|0;F=c[A>>2]|0;M=z+16|0;if((F|0)==(c[M>>2]|0)){N=sc[c[(c[z>>2]|0)+36>>2]&127](z)|0}else{N=d[F]|0}if((Jg(N&255,u,L,p,s,t,n,q,r,l)|0)!=0){C=B;D=L;break}F=c[A>>2]|0;if((F|0)==(c[M>>2]|0)){sc[c[(c[z>>2]|0)+40>>2]&127](z)|0;m=z;y=L;continue}else{c[A>>2]=F+1;m=z;y=L;continue}}L=a[n]|0;if((L&1)==0){O=(L&255)>>>1}else{O=c[n+4>>2]|0}if((O|0)!=0?(O=c[r>>2]|0,(O-q|0)<160):0){L=c[s>>2]|0;c[r>>2]=O+4;c[O>>2]=L}c[k>>2]=Zl(D,c[p>>2]|0,j,u)|0;tj(n,q,c[r>>2]|0,j);if((z|0)!=0){if((c[z+12>>2]|0)==(c[z+16>>2]|0)?(sc[c[(c[z>>2]|0)+36>>2]&127](z)|0)==-1:0){c[f>>2]=0;P=0}else{P=z}}else{P=0}z=(P|0)==0;do{if((C|0)!=0){if((c[C+12>>2]|0)!=(c[C+16>>2]|0)){if(!z){break}c[b>>2]=P;Fe(o);Fe(n);i=e;return}if((sc[c[(c[C>>2]|0)+36>>2]&127](C)|0)==-1){c[g>>2]=0;E=54;break}if(z^(C|0)==0){c[b>>2]=P;Fe(o);Fe(n);i=e;return}}else{E=54}}while(0);if((E|0)==54?!z:0){c[b>>2]=P;Fe(o);Fe(n);i=e;return}c[j>>2]=c[j>>2]|2;c[b>>2]=P;Fe(o);Fe(n);i=e;return}function yg(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;l=b+4|0;m=b;c[l>>2]=c[d>>2];c[m>>2]=c[e>>2];c[k+0>>2]=c[l+0>>2];c[j+0>>2]=c[m+0>>2];zg(a,0,k,j,f,g,h);i=b;return}function zg(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0;e=i;i=i+224|0;l=e+198|0;m=e+196|0;n=e+16|0;o=e+4|0;p=e+192|0;q=e+32|0;r=e;s=e+28|0;t=c[h+4>>2]&74;if((t|0)==0){u=0}else if((t|0)==64){u=8}else if((t|0)==8){u=16}else{u=10}hh(n,h,l,m);c[o+0>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;He(o,10,0);if((a[o]&1)==0){h=o+1|0;v=h;w=o+8|0;x=h}else{h=o+8|0;v=o+1|0;w=h;x=c[h>>2]|0}c[p>>2]=x;c[r>>2]=q;c[s>>2]=0;h=o+4|0;t=a[m]|0;m=c[f>>2]|0;y=x;a:while(1){if((m|0)!=0){if((c[m+12>>2]|0)==(c[m+16>>2]|0)?(sc[c[(c[m>>2]|0)+36>>2]&127](m)|0)==-1:0){c[f>>2]=0;z=0}else{z=m}}else{z=0}x=(z|0)==0;A=c[g>>2]|0;do{if((A|0)!=0){if((c[A+12>>2]|0)!=(c[A+16>>2]|0)){if(x){B=A;break}else{C=A;D=y;break a}}if(!((sc[c[(c[A>>2]|0)+36>>2]&127](A)|0)==-1)){if(x){B=A;break}else{C=A;D=y;break a}}else{c[g>>2]=0;E=18;break}}else{E=18}}while(0);if((E|0)==18){E=0;if(x){C=0;D=y;break}else{B=0}}A=a[o]|0;F=(A&1)==0;if(F){G=(A&255)>>>1}else{G=c[h>>2]|0}if(((c[p>>2]|0)-y|0)==(G|0)){if(F){H=(A&255)>>>1;I=(A&255)>>>1}else{A=c[h>>2]|0;H=A;I=A}He(o,H<<1,0);if((a[o]&1)==0){J=10}else{J=(c[o>>2]&-2)+ -1|0}He(o,J,0);if((a[o]&1)==0){K=v}else{K=c[w>>2]|0}c[p>>2]=K+I;L=K}else{L=y}A=z+12|0;F=c[A>>2]|0;M=z+16|0;if((F|0)==(c[M>>2]|0)){N=sc[c[(c[z>>2]|0)+36>>2]&127](z)|0}else{N=d[F]|0}if((Jg(N&255,u,L,p,s,t,n,q,r,l)|0)!=0){C=B;D=L;break}F=c[A>>2]|0;if((F|0)==(c[M>>2]|0)){sc[c[(c[z>>2]|0)+40>>2]&127](z)|0;m=z;y=L;continue}else{c[A>>2]=F+1;m=z;y=L;continue}}L=a[n]|0;if((L&1)==0){O=(L&255)>>>1}else{O=c[n+4>>2]|0}if((O|0)!=0?(O=c[r>>2]|0,(O-q|0)<160):0){L=c[s>>2]|0;c[r>>2]=O+4;c[O>>2]=L}c[k>>2]=Yl(D,c[p>>2]|0,j,u)|0;tj(n,q,c[r>>2]|0,j);if((z|0)!=0){if((c[z+12>>2]|0)==(c[z+16>>2]|0)?(sc[c[(c[z>>2]|0)+36>>2]&127](z)|0)==-1:0){c[f>>2]=0;P=0}else{P=z}}else{P=0}z=(P|0)==0;do{if((C|0)!=0){if((c[C+12>>2]|0)!=(c[C+16>>2]|0)){if(!z){break}c[b>>2]=P;Fe(o);Fe(n);i=e;return}if((sc[c[(c[C>>2]|0)+36>>2]&127](C)|0)==-1){c[g>>2]=0;E=54;break}if(z^(C|0)==0){c[b>>2]=P;Fe(o);Fe(n);i=e;return}}else{E=54}}while(0);if((E|0)==54?!z:0){c[b>>2]=P;Fe(o);Fe(n);i=e;return}c[j>>2]=c[j>>2]|2;c[b>>2]=P;Fe(o);Fe(n);i=e;return}function Ag(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;l=b+4|0;m=b;c[l>>2]=c[d>>2];c[m>>2]=c[e>>2];c[k+0>>2]=c[l+0>>2];c[j+0>>2]=c[m+0>>2];Bg(a,0,k,j,f,g,h);i=b;return}function Bg(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0;e=i;i=i+224|0;l=e+198|0;m=e+196|0;n=e+16|0;o=e+4|0;p=e+192|0;q=e+32|0;r=e;s=e+28|0;t=c[h+4>>2]&74;if((t|0)==0){u=0}else if((t|0)==64){u=8}else if((t|0)==8){u=16}else{u=10}hh(n,h,l,m);c[o+0>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;He(o,10,0);if((a[o]&1)==0){h=o+1|0;v=h;w=o+8|0;x=h}else{h=o+8|0;v=o+1|0;w=h;x=c[h>>2]|0}c[p>>2]=x;c[r>>2]=q;c[s>>2]=0;h=o+4|0;t=a[m]|0;m=c[f>>2]|0;y=x;a:while(1){if((m|0)!=0){if((c[m+12>>2]|0)==(c[m+16>>2]|0)?(sc[c[(c[m>>2]|0)+36>>2]&127](m)|0)==-1:0){c[f>>2]=0;z=0}else{z=m}}else{z=0}x=(z|0)==0;A=c[g>>2]|0;do{if((A|0)!=0){if((c[A+12>>2]|0)!=(c[A+16>>2]|0)){if(x){B=A;break}else{C=A;D=y;break a}}if(!((sc[c[(c[A>>2]|0)+36>>2]&127](A)|0)==-1)){if(x){B=A;break}else{C=A;D=y;break a}}else{c[g>>2]=0;E=18;break}}else{E=18}}while(0);if((E|0)==18){E=0;if(x){C=0;D=y;break}else{B=0}}A=a[o]|0;F=(A&1)==0;if(F){G=(A&255)>>>1}else{G=c[h>>2]|0}if(((c[p>>2]|0)-y|0)==(G|0)){if(F){H=(A&255)>>>1;J=(A&255)>>>1}else{A=c[h>>2]|0;H=A;J=A}He(o,H<<1,0);if((a[o]&1)==0){K=10}else{K=(c[o>>2]&-2)+ -1|0}He(o,K,0);if((a[o]&1)==0){L=v}else{L=c[w>>2]|0}c[p>>2]=L+J;M=L}else{M=y}A=z+12|0;F=c[A>>2]|0;N=z+16|0;if((F|0)==(c[N>>2]|0)){O=sc[c[(c[z>>2]|0)+36>>2]&127](z)|0}else{O=d[F]|0}if((Jg(O&255,u,M,p,s,t,n,q,r,l)|0)!=0){C=B;D=M;break}F=c[A>>2]|0;if((F|0)==(c[N>>2]|0)){sc[c[(c[z>>2]|0)+40>>2]&127](z)|0;m=z;y=M;continue}else{c[A>>2]=F+1;m=z;y=M;continue}}M=a[n]|0;if((M&1)==0){P=(M&255)>>>1}else{P=c[n+4>>2]|0}if((P|0)!=0?(P=c[r>>2]|0,(P-q|0)<160):0){M=c[s>>2]|0;c[r>>2]=P+4;c[P>>2]=M}M=Xl(D,c[p>>2]|0,j,u)|0;u=k;c[u>>2]=M;c[u+4>>2]=I;tj(n,q,c[r>>2]|0,j);if((z|0)!=0){if((c[z+12>>2]|0)==(c[z+16>>2]|0)?(sc[c[(c[z>>2]|0)+36>>2]&127](z)|0)==-1:0){c[f>>2]=0;Q=0}else{Q=z}}else{Q=0}z=(Q|0)==0;do{if((C|0)!=0){if((c[C+12>>2]|0)!=(c[C+16>>2]|0)){if(!z){break}c[b>>2]=Q;Fe(o);Fe(n);i=e;return}if((sc[c[(c[C>>2]|0)+36>>2]&127](C)|0)==-1){c[g>>2]=0;E=54;break}if(z^(C|0)==0){c[b>>2]=Q;Fe(o);Fe(n);i=e;return}}else{E=54}}while(0);if((E|0)==54?!z:0){c[b>>2]=Q;Fe(o);Fe(n);i=e;return}c[j>>2]=c[j>>2]|2;c[b>>2]=Q;Fe(o);Fe(n);i=e;return}function Cg(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;l=b+4|0;m=b;c[l>>2]=c[d>>2];c[m>>2]=c[e>>2];c[k+0>>2]=c[l+0>>2];c[j+0>>2]=c[m+0>>2];Dg(a,0,k,j,f,g,h);i=b;return}function Dg(b,e,f,h,j,k,l){b=b|0;e=e|0;f=f|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0;e=i;i=i+256|0;m=e+208|0;n=e+200|0;o=e+240|0;p=e;q=e+188|0;r=e+184|0;s=e+16|0;t=e+176|0;u=e+180|0;v=e+241|0;w=e+242|0;ih(p,j,m,n,o);c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;He(q,10,0);if((a[q]&1)==0){j=q+1|0;x=j;y=q+8|0;z=j}else{j=q+8|0;x=q+1|0;y=j;z=c[j>>2]|0}c[r>>2]=z;c[t>>2]=s;c[u>>2]=0;a[v]=1;a[w]=69;j=q+4|0;A=a[n]|0;n=a[o]|0;o=c[f>>2]|0;B=z;a:while(1){if((o|0)!=0){if((c[o+12>>2]|0)==(c[o+16>>2]|0)?(sc[c[(c[o>>2]|0)+36>>2]&127](o)|0)==-1:0){c[f>>2]=0;C=0}else{C=o}}else{C=0}z=(C|0)==0;D=c[h>>2]|0;do{if((D|0)!=0){if((c[D+12>>2]|0)!=(c[D+16>>2]|0)){if(z){E=D;break}else{F=D;G=B;break a}}if(!((sc[c[(c[D>>2]|0)+36>>2]&127](D)|0)==-1)){if(z){E=D;break}else{F=D;G=B;break a}}else{c[h>>2]=0;H=14;break}}else{H=14}}while(0);if((H|0)==14){H=0;if(z){F=0;G=B;break}else{E=0}}D=a[q]|0;I=(D&1)==0;if(I){J=(D&255)>>>1}else{J=c[j>>2]|0}if(((c[r>>2]|0)-B|0)==(J|0)){if(I){K=(D&255)>>>1;L=(D&255)>>>1}else{D=c[j>>2]|0;K=D;L=D}He(q,K<<1,0);if((a[q]&1)==0){M=10}else{M=(c[q>>2]&-2)+ -1|0}He(q,M,0);if((a[q]&1)==0){N=x}else{N=c[y>>2]|0}c[r>>2]=N+L;O=N}else{O=B}D=C+12|0;I=c[D>>2]|0;P=C+16|0;if((I|0)==(c[P>>2]|0)){Q=sc[c[(c[C>>2]|0)+36>>2]&127](C)|0}else{Q=d[I]|0}if((jh(Q&255,v,w,O,r,A,n,p,s,t,u,m)|0)!=0){F=E;G=O;break}I=c[D>>2]|0;if((I|0)==(c[P>>2]|0)){sc[c[(c[C>>2]|0)+40>>2]&127](C)|0;o=C;B=O;continue}else{c[D>>2]=I+1;o=C;B=O;continue}}O=a[p]|0;if((O&1)==0){R=(O&255)>>>1}else{R=c[p+4>>2]|0}if(((R|0)!=0?(a[v]|0)!=0:0)?(v=c[t>>2]|0,(v-s|0)<160):0){R=c[u>>2]|0;c[t>>2]=v+4;c[v>>2]=R}g[l>>2]=+Wl(G,c[r>>2]|0,k);tj(p,s,c[t>>2]|0,k);if((C|0)!=0){if((c[C+12>>2]|0)==(c[C+16>>2]|0)?(sc[c[(c[C>>2]|0)+36>>2]&127](C)|0)==-1:0){c[f>>2]=0;S=0}else{S=C}}else{S=0}C=(S|0)==0;do{if((F|0)!=0){if((c[F+12>>2]|0)!=(c[F+16>>2]|0)){if(!C){break}c[b>>2]=S;Fe(q);Fe(p);i=e;return}if((sc[c[(c[F>>2]|0)+36>>2]&127](F)|0)==-1){c[h>>2]=0;H=51;break}if(C^(F|0)==0){c[b>>2]=S;Fe(q);Fe(p);i=e;return}}else{H=51}}while(0);if((H|0)==51?!C:0){c[b>>2]=S;Fe(q);Fe(p);i=e;return}c[k>>2]=c[k>>2]|2;c[b>>2]=S;Fe(q);Fe(p);i=e;return}function Eg(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;l=b+4|0;m=b;c[l>>2]=c[d>>2];c[m>>2]=c[e>>2];c[k+0>>2]=c[l+0>>2];c[j+0>>2]=c[m+0>>2];Fg(a,0,k,j,f,g,h);i=b;return}function Fg(b,e,f,g,j,k,l){b=b|0;e=e|0;f=f|0;g=g|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0;e=i;i=i+256|0;m=e+208|0;n=e+200|0;o=e+240|0;p=e;q=e+188|0;r=e+184|0;s=e+16|0;t=e+176|0;u=e+180|0;v=e+241|0;w=e+242|0;ih(p,j,m,n,o);c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;He(q,10,0);if((a[q]&1)==0){j=q+1|0;x=j;y=q+8|0;z=j}else{j=q+8|0;x=q+1|0;y=j;z=c[j>>2]|0}c[r>>2]=z;c[t>>2]=s;c[u>>2]=0;a[v]=1;a[w]=69;j=q+4|0;A=a[n]|0;n=a[o]|0;o=c[f>>2]|0;B=z;a:while(1){if((o|0)!=0){if((c[o+12>>2]|0)==(c[o+16>>2]|0)?(sc[c[(c[o>>2]|0)+36>>2]&127](o)|0)==-1:0){c[f>>2]=0;C=0}else{C=o}}else{C=0}z=(C|0)==0;D=c[g>>2]|0;do{if((D|0)!=0){if((c[D+12>>2]|0)!=(c[D+16>>2]|0)){if(z){E=D;break}else{F=D;G=B;break a}}if(!((sc[c[(c[D>>2]|0)+36>>2]&127](D)|0)==-1)){if(z){E=D;break}else{F=D;G=B;break a}}else{c[g>>2]=0;H=14;break}}else{H=14}}while(0);if((H|0)==14){H=0;if(z){F=0;G=B;break}else{E=0}}D=a[q]|0;I=(D&1)==0;if(I){J=(D&255)>>>1}else{J=c[j>>2]|0}if(((c[r>>2]|0)-B|0)==(J|0)){if(I){K=(D&255)>>>1;L=(D&255)>>>1}else{D=c[j>>2]|0;K=D;L=D}He(q,K<<1,0);if((a[q]&1)==0){M=10}else{M=(c[q>>2]&-2)+ -1|0}He(q,M,0);if((a[q]&1)==0){N=x}else{N=c[y>>2]|0}c[r>>2]=N+L;O=N}else{O=B}D=C+12|0;I=c[D>>2]|0;P=C+16|0;if((I|0)==(c[P>>2]|0)){Q=sc[c[(c[C>>2]|0)+36>>2]&127](C)|0}else{Q=d[I]|0}if((jh(Q&255,v,w,O,r,A,n,p,s,t,u,m)|0)!=0){F=E;G=O;break}I=c[D>>2]|0;if((I|0)==(c[P>>2]|0)){sc[c[(c[C>>2]|0)+40>>2]&127](C)|0;o=C;B=O;continue}else{c[D>>2]=I+1;o=C;B=O;continue}}O=a[p]|0;if((O&1)==0){R=(O&255)>>>1}else{R=c[p+4>>2]|0}if(((R|0)!=0?(a[v]|0)!=0:0)?(v=c[t>>2]|0,(v-s|0)<160):0){R=c[u>>2]|0;c[t>>2]=v+4;c[v>>2]=R}h[l>>3]=+Vl(G,c[r>>2]|0,k);tj(p,s,c[t>>2]|0,k);if((C|0)!=0){if((c[C+12>>2]|0)==(c[C+16>>2]|0)?(sc[c[(c[C>>2]|0)+36>>2]&127](C)|0)==-1:0){c[f>>2]=0;S=0}else{S=C}}else{S=0}C=(S|0)==0;do{if((F|0)!=0){if((c[F+12>>2]|0)!=(c[F+16>>2]|0)){if(!C){break}c[b>>2]=S;Fe(q);Fe(p);i=e;return}if((sc[c[(c[F>>2]|0)+36>>2]&127](F)|0)==-1){c[g>>2]=0;H=51;break}if(C^(F|0)==0){c[b>>2]=S;Fe(q);Fe(p);i=e;return}}else{H=51}}while(0);if((H|0)==51?!C:0){c[b>>2]=S;Fe(q);Fe(p);i=e;return}c[k>>2]=c[k>>2]|2;c[b>>2]=S;Fe(q);Fe(p);i=e;return}function Gg(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;l=b+4|0;m=b;c[l>>2]=c[d>>2];c[m>>2]=c[e>>2];c[k+0>>2]=c[l+0>>2];c[j+0>>2]=c[m+0>>2];Hg(a,0,k,j,f,g,h);i=b;return}function Hg(b,e,f,g,j,k,l){b=b|0;e=e|0;f=f|0;g=g|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0;e=i;i=i+256|0;m=e+208|0;n=e+200|0;o=e+240|0;p=e;q=e+188|0;r=e+184|0;s=e+16|0;t=e+176|0;u=e+180|0;v=e+241|0;w=e+242|0;ih(p,j,m,n,o);c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;He(q,10,0);if((a[q]&1)==0){j=q+1|0;x=j;y=q+8|0;z=j}else{j=q+8|0;x=q+1|0;y=j;z=c[j>>2]|0}c[r>>2]=z;c[t>>2]=s;c[u>>2]=0;a[v]=1;a[w]=69;j=q+4|0;A=a[n]|0;n=a[o]|0;o=c[f>>2]|0;B=z;a:while(1){if((o|0)!=0){if((c[o+12>>2]|0)==(c[o+16>>2]|0)?(sc[c[(c[o>>2]|0)+36>>2]&127](o)|0)==-1:0){c[f>>2]=0;C=0}else{C=o}}else{C=0}z=(C|0)==0;D=c[g>>2]|0;do{if((D|0)!=0){if((c[D+12>>2]|0)!=(c[D+16>>2]|0)){if(z){E=D;break}else{F=D;G=B;break a}}if(!((sc[c[(c[D>>2]|0)+36>>2]&127](D)|0)==-1)){if(z){E=D;break}else{F=D;G=B;break a}}else{c[g>>2]=0;H=14;break}}else{H=14}}while(0);if((H|0)==14){H=0;if(z){F=0;G=B;break}else{E=0}}D=a[q]|0;I=(D&1)==0;if(I){J=(D&255)>>>1}else{J=c[j>>2]|0}if(((c[r>>2]|0)-B|0)==(J|0)){if(I){K=(D&255)>>>1;L=(D&255)>>>1}else{D=c[j>>2]|0;K=D;L=D}He(q,K<<1,0);if((a[q]&1)==0){M=10}else{M=(c[q>>2]&-2)+ -1|0}He(q,M,0);if((a[q]&1)==0){N=x}else{N=c[y>>2]|0}c[r>>2]=N+L;O=N}else{O=B}D=C+12|0;I=c[D>>2]|0;P=C+16|0;if((I|0)==(c[P>>2]|0)){Q=sc[c[(c[C>>2]|0)+36>>2]&127](C)|0}else{Q=d[I]|0}if((jh(Q&255,v,w,O,r,A,n,p,s,t,u,m)|0)!=0){F=E;G=O;break}I=c[D>>2]|0;if((I|0)==(c[P>>2]|0)){sc[c[(c[C>>2]|0)+40>>2]&127](C)|0;o=C;B=O;continue}else{c[D>>2]=I+1;o=C;B=O;continue}}O=a[p]|0;if((O&1)==0){R=(O&255)>>>1}else{R=c[p+4>>2]|0}if(((R|0)!=0?(a[v]|0)!=0:0)?(v=c[t>>2]|0,(v-s|0)<160):0){R=c[u>>2]|0;c[t>>2]=v+4;c[v>>2]=R}h[l>>3]=+Ul(G,c[r>>2]|0,k);tj(p,s,c[t>>2]|0,k);if((C|0)!=0){if((c[C+12>>2]|0)==(c[C+16>>2]|0)?(sc[c[(c[C>>2]|0)+36>>2]&127](C)|0)==-1:0){c[f>>2]=0;S=0}else{S=C}}else{S=0}C=(S|0)==0;do{if((F|0)!=0){if((c[F+12>>2]|0)!=(c[F+16>>2]|0)){if(!C){break}c[b>>2]=S;Fe(q);Fe(p);i=e;return}if((sc[c[(c[F>>2]|0)+36>>2]&127](F)|0)==-1){c[g>>2]=0;H=51;break}if(C^(F|0)==0){c[b>>2]=S;Fe(q);Fe(p);i=e;return}}else{H=51}}while(0);if((H|0)==51?!C:0){c[b>>2]=S;Fe(q);Fe(p);i=e;return}c[k>>2]=c[k>>2]|2;c[b>>2]=S;Fe(q);Fe(p);i=e;return}function Ig(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0;e=i;i=i+240|0;l=e;m=e+204|0;n=e+192|0;o=e+188|0;p=e+176|0;q=e+16|0;c[n+0>>2]=0;c[n+4>>2]=0;c[n+8>>2]=0;Ze(o,h);h=c[o>>2]|0;if(!((c[1500]|0)==-1)){c[l>>2]=6e3;c[l+4>>2]=117;c[l+8>>2]=0;Ae(6e3,l,118)}r=(c[6004>>2]|0)+ -1|0;s=c[h+8>>2]|0;if(!((c[h+12>>2]|0)-s>>2>>>0>r>>>0)){t=xb(4)|0;wm(t);ec(t|0,13960,106)}h=c[s+(r<<2)>>2]|0;if((h|0)==0){t=xb(4)|0;wm(t);ec(t|0,13960,106)}yc[c[(c[h>>2]|0)+32>>2]&7](h,4544,4570|0,m)|0;ge(c[o>>2]|0)|0;c[p+0>>2]=0;c[p+4>>2]=0;c[p+8>>2]=0;He(p,10,0);if((a[p]&1)==0){o=p+1|0;u=o;v=p+8|0;w=o}else{o=p+8|0;u=p+1|0;v=o;w=c[o>>2]|0}o=p+4|0;h=m+24|0;t=m+25|0;r=q;s=m+26|0;x=m;y=n+4|0;z=c[f>>2]|0;A=q;q=0;B=w;C=w;a:while(1){if((z|0)!=0){if((c[z+12>>2]|0)==(c[z+16>>2]|0)?(sc[c[(c[z>>2]|0)+36>>2]&127](z)|0)==-1:0){c[f>>2]=0;D=0}else{D=z}}else{D=0}w=(D|0)==0;E=c[g>>2]|0;do{if((E|0)!=0){if((c[E+12>>2]|0)!=(c[E+16>>2]|0)){if(w){break}else{F=C;break a}}if(!((sc[c[(c[E>>2]|0)+36>>2]&127](E)|0)==-1)){if(w){break}else{F=C;break a}}else{c[g>>2]=0;G=19;break}}else{G=19}}while(0);if((G|0)==19?(G=0,w):0){F=C;break}E=a[p]|0;H=(E&1)==0;if(H){I=(E&255)>>>1}else{I=c[o>>2]|0}if((B-C|0)==(I|0)){if(H){J=(E&255)>>>1;K=(E&255)>>>1}else{E=c[o>>2]|0;J=E;K=E}He(p,J<<1,0);if((a[p]&1)==0){L=10}else{L=(c[p>>2]&-2)+ -1|0}He(p,L,0);if((a[p]&1)==0){M=u}else{M=c[v>>2]|0}N=M+K|0;O=M}else{N=B;O=C}E=c[D+12>>2]|0;if((E|0)==(c[D+16>>2]|0)){P=sc[c[(c[D>>2]|0)+36>>2]&127](D)|0}else{P=d[E]|0}E=P&255;H=(N|0)==(O|0);do{if(H){Q=(a[h]|0)==E<<24>>24;if(!Q?!((a[t]|0)==E<<24>>24):0){G=40;break}a[N]=Q?43:45;R=N+1|0;S=A;T=0}else{G=40}}while(0);do{if((G|0)==40){G=0;w=a[n]|0;if((w&1)==0){U=(w&255)>>>1}else{U=c[y>>2]|0}if((U|0)!=0&E<<24>>24==0){if((A-r|0)>=160){R=N;S=A;T=q;break}c[A>>2]=q;R=N;S=A+4|0;T=0;break}else{V=m}while(1){w=V+1|0;if((a[V]|0)==E<<24>>24){W=V;break}if((w|0)==(s|0)){W=s;break}else{V=w}}w=W-x|0;if((w|0)>23){F=O;break a}if((w|0)<22){a[N]=a[4544+w|0]|0;R=N+1|0;S=A;T=q+1|0;break}if(H){F=N;break a}if((N-O|0)>=3){F=O;break a}if((a[N+ -1|0]|0)!=48){F=O;break a}a[N]=a[4544+w|0]|0;R=N+1|0;S=A;T=0}}while(0);H=c[f>>2]|0;E=H+12|0;w=c[E>>2]|0;if((w|0)==(c[H+16>>2]|0)){sc[c[(c[H>>2]|0)+40>>2]&127](H)|0;z=H;A=S;q=T;B=R;C=O;continue}else{c[E>>2]=w+1;z=H;A=S;q=T;B=R;C=O;continue}}a[F+3|0]=0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}O=c[1472]|0;c[l>>2]=k;if((Kg(F,O,4584,l)|0)!=1){c[j>>2]=4}l=c[f>>2]|0;if((l|0)!=0){if((c[l+12>>2]|0)==(c[l+16>>2]|0)?(sc[c[(c[l>>2]|0)+36>>2]&127](l)|0)==-1:0){c[f>>2]=0;X=0}else{X=l}}else{X=0}l=(X|0)==0;f=c[g>>2]|0;do{if((f|0)!=0){if((c[f+12>>2]|0)!=(c[f+16>>2]|0)){if(!l){break}c[b>>2]=X;Fe(p);Fe(n);i=e;return}if((sc[c[(c[f>>2]|0)+36>>2]&127](f)|0)==-1){c[g>>2]=0;G=72;break}if(l^(f|0)==0){c[b>>2]=X;Fe(p);Fe(n);i=e;return}}else{G=72}}while(0);if((G|0)==72?!l:0){c[b>>2]=X;Fe(p);Fe(n);i=e;return}c[j>>2]=c[j>>2]|2;c[b>>2]=X;Fe(p);Fe(n);i=e;return}function Jg(b,d,e,f,g,h,j,k,l,m){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0;n=i;o=c[f>>2]|0;p=(o|0)==(e|0);do{if(p){q=(a[m+24|0]|0)==b<<24>>24;if(!q?!((a[m+25|0]|0)==b<<24>>24):0){break}c[f>>2]=e+1;a[e]=q?43:45;c[g>>2]=0;r=0;i=n;return r|0}}while(0);q=a[j]|0;if((q&1)==0){s=(q&255)>>>1}else{s=c[j+4>>2]|0}if((s|0)!=0&b<<24>>24==h<<24>>24){h=c[l>>2]|0;if((h-k|0)>=160){r=0;i=n;return r|0}k=c[g>>2]|0;c[l>>2]=h+4;c[h>>2]=k;c[g>>2]=0;r=0;i=n;return r|0}k=m+26|0;h=m;while(1){l=h+1|0;if((a[h]|0)==b<<24>>24){t=h;break}if((l|0)==(k|0)){t=k;break}else{h=l}}h=t-m|0;if((h|0)>23){r=-1;i=n;return r|0}if((d|0)==16){if((h|0)>=22){if(p){r=-1;i=n;return r|0}if((o-e|0)>=3){r=-1;i=n;return r|0}if((a[o+ -1|0]|0)!=48){r=-1;i=n;return r|0}c[g>>2]=0;e=a[4544+h|0]|0;c[f>>2]=o+1;a[o]=e;r=0;i=n;return r|0}}else if((d|0)==10|(d|0)==8?(h|0)>=(d|0):0){r=-1;i=n;return r|0}d=a[4544+h|0]|0;c[f>>2]=o+1;a[o]=d;c[g>>2]=(c[g>>2]|0)+1;r=0;i=n;return r|0}function Kg(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0;f=i;i=i+16|0;g=f;c[g>>2]=e;e=Bb(b|0)|0;b=Fa(a|0,d|0,g|0)|0;if((e|0)==0){i=f;return b|0}Bb(e|0)|0;i=f;return b|0}function Lg(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function Mg(a){a=a|0;return}function Ng(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;k=i;i=i+80|0;l=k;m=k+24|0;n=k+28|0;o=k+32|0;p=k+16|0;q=k+12|0;r=k+20|0;s=k+36|0;t=k+40|0;u=k+64|0;if((c[g+4>>2]&1|0)==0){c[n>>2]=-1;v=c[(c[d>>2]|0)+16>>2]|0;c[p>>2]=c[e>>2];c[q>>2]=c[f>>2];c[m+0>>2]=c[p+0>>2];c[l+0>>2]=c[q+0>>2];nc[v&63](o,d,m,l,g,h,n);m=c[o>>2]|0;c[e>>2]=m;o=c[n>>2]|0;if((o|0)==0){a[j]=0}else if((o|0)==1){a[j]=1}else{a[j]=1;c[h>>2]=4}c[b>>2]=m;i=k;return}Ze(r,g);m=c[r>>2]|0;if(!((c[1498]|0)==-1)){c[l>>2]=5992;c[l+4>>2]=117;c[l+8>>2]=0;Ae(5992,l,118)}o=(c[5996>>2]|0)+ -1|0;n=c[m+8>>2]|0;if(!((c[m+12>>2]|0)-n>>2>>>0>o>>>0)){w=xb(4)|0;wm(w);ec(w|0,13960,106)}m=c[n+(o<<2)>>2]|0;if((m|0)==0){w=xb(4)|0;wm(w);ec(w|0,13960,106)}ge(c[r>>2]|0)|0;Ze(s,g);g=c[s>>2]|0;if(!((c[1538]|0)==-1)){c[l>>2]=6152;c[l+4>>2]=117;c[l+8>>2]=0;Ae(6152,l,118)}r=(c[6156>>2]|0)+ -1|0;w=c[g+8>>2]|0;if(!((c[g+12>>2]|0)-w>>2>>>0>r>>>0)){x=xb(4)|0;wm(x);ec(x|0,13960,106)}g=c[w+(r<<2)>>2]|0;if((g|0)==0){x=xb(4)|0;wm(x);ec(x|0,13960,106)}ge(c[s>>2]|0)|0;qc[c[(c[g>>2]|0)+24>>2]&63](t,g);qc[c[(c[g>>2]|0)+28>>2]&63](t+12|0,g);c[u>>2]=c[f>>2];f=t+24|0;c[l+0>>2]=c[u+0>>2];a[j]=(Og(e,l,t,f,m,h,1)|0)==(t|0)|0;c[b>>2]=c[e>>2];Qe(t+12|0);Qe(t);i=k;return}function Og(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0;k=i;i=i+112|0;l=k;m=(f-e|0)/12|0;if(m>>>0>100){n=Rm(m)|0;if((n|0)==0){bn()}else{o=n;p=n}}else{o=0;p=l}l=(e|0)==(f|0);if(l){q=0;r=m}else{n=e;s=0;t=m;m=p;while(1){u=a[n]|0;if((u&1)==0){v=(u&255)>>>1}else{v=c[n+4>>2]|0}if((v|0)==0){a[m]=2;w=s+1|0;x=t+ -1|0}else{a[m]=1;w=s;x=t}u=n+12|0;if((u|0)==(f|0)){q=w;r=x;break}else{n=u;s=w;t=x;m=m+1|0}}}m=0;x=q;q=r;a:while(1){r=c[b>>2]|0;do{if((r|0)!=0){t=c[r+12>>2]|0;if((t|0)==(c[r+16>>2]|0)){y=sc[c[(c[r>>2]|0)+36>>2]&127](r)|0}else{y=c[t>>2]|0}if((y|0)==-1){c[b>>2]=0;z=1;break}else{z=(c[b>>2]|0)==0;break}}else{z=1}}while(0);r=c[d>>2]|0;if((r|0)!=0){t=c[r+12>>2]|0;if((t|0)==(c[r+16>>2]|0)){A=sc[c[(c[r>>2]|0)+36>>2]&127](r)|0}else{A=c[t>>2]|0}if((A|0)==-1){c[d>>2]=0;B=0;C=1}else{B=r;C=0}}else{B=0;C=1}D=c[b>>2]|0;if(!((z^C)&(q|0)!=0)){break}r=c[D+12>>2]|0;if((r|0)==(c[D+16>>2]|0)){E=sc[c[(c[D>>2]|0)+36>>2]&127](D)|0}else{E=c[r>>2]|0}if(j){F=E}else{F=Bc[c[(c[g>>2]|0)+28>>2]&15](g,E)|0}r=m+1|0;if(l){m=r;continue}b:do{if(j){t=0;w=e;s=x;n=q;v=p;while(1){do{if((a[v]|0)==1){u=a[w]|0;G=(u&1)==0;if(G){H=w+4|0}else{H=c[w+8>>2]|0}if((F|0)!=(c[H+(m<<2)>>2]|0)){a[v]=0;I=t;J=s;K=n+ -1|0;break}if(G){L=(u&255)>>>1}else{L=c[w+4>>2]|0}if((L|0)==(r|0)){a[v]=2;I=1;J=s+1|0;K=n+ -1|0}else{I=1;J=s;K=n}}else{I=t;J=s;K=n}}while(0);u=w+12|0;if((u|0)==(f|0)){M=I;N=J;O=K;break b}t=I;w=u;s=J;n=K;v=v+1|0}}else{v=0;n=e;s=x;w=q;t=p;while(1){do{if((a[t]|0)==1){if((a[n]&1)==0){P=n+4|0}else{P=c[n+8>>2]|0}if((F|0)!=(Bc[c[(c[g>>2]|0)+28>>2]&15](g,c[P+(m<<2)>>2]|0)|0)){a[t]=0;Q=v;R=s;S=w+ -1|0;break}u=a[n]|0;if((u&1)==0){T=(u&255)>>>1}else{T=c[n+4>>2]|0}if((T|0)==(r|0)){a[t]=2;Q=1;R=s+1|0;S=w+ -1|0}else{Q=1;R=s;S=w}}else{Q=v;R=s;S=w}}while(0);u=n+12|0;if((u|0)==(f|0)){M=Q;N=R;O=S;break b}v=Q;n=u;s=R;w=S;t=t+1|0}}}while(0);if(!M){m=r;x=N;q=O;continue}t=c[b>>2]|0;w=t+12|0;s=c[w>>2]|0;if((s|0)==(c[t+16>>2]|0)){sc[c[(c[t>>2]|0)+40>>2]&127](t)|0}else{c[w>>2]=s+4}if((O+N|0)>>>0<2){m=r;x=N;q=O;continue}else{U=e;V=N;W=p}while(1){if((a[W]|0)==2){s=a[U]|0;if((s&1)==0){X=(s&255)>>>1}else{X=c[U+4>>2]|0}if((X|0)!=(r|0)){a[W]=0;Y=V+ -1|0}else{Y=V}}else{Y=V}s=U+12|0;if((s|0)==(f|0)){m=r;x=Y;q=O;continue a}else{U=s;V=Y;W=W+1|0}}}do{if((D|0)!=0){W=c[D+12>>2]|0;if((W|0)==(c[D+16>>2]|0)){Z=sc[c[(c[D>>2]|0)+36>>2]&127](D)|0}else{Z=c[W>>2]|0}if((Z|0)==-1){c[b>>2]=0;_=1;break}else{_=(c[b>>2]|0)==0;break}}else{_=1}}while(0);do{if((B|0)!=0){b=c[B+12>>2]|0;if((b|0)==(c[B+16>>2]|0)){$=sc[c[(c[B>>2]|0)+36>>2]&127](B)|0}else{$=c[b>>2]|0}if(!(($|0)==-1)){if(_){break}else{aa=87;break}}else{c[d>>2]=0;aa=85;break}}else{aa=85}}while(0);if((aa|0)==85?_:0){aa=87}if((aa|0)==87){c[h>>2]=c[h>>2]|2}c:do{if(!l){if((a[p]|0)==2){ba=e}else{_=e;d=p;while(1){$=_+12|0;B=d+1|0;if(($|0)==(f|0)){aa=92;break c}if((a[B]|0)==2){ba=$;break}else{_=$;d=B}}}}else{aa=92}}while(0);if((aa|0)==92){c[h>>2]=c[h>>2]|4;ba=f}if((o|0)==0){i=k;return ba|0}Sm(o);i=k;return ba|0}function Pg(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;l=b+4|0;m=b;c[l>>2]=c[d>>2];c[m>>2]=c[e>>2];c[k+0>>2]=c[l+0>>2];c[j+0>>2]=c[m+0>>2];Qg(a,0,k,j,f,g,h);i=b;return}function Qg(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0;d=i;i=i+304|0;k=d+160|0;l=d+280|0;m=d+264|0;n=d+284|0;o=d+300|0;p=d;q=d+276|0;r=d+296|0;s=c[g+4>>2]&74;if((s|0)==0){t=0}else if((s|0)==8){t=16}else if((s|0)==64){t=8}else{t=10}kh(m,g,k,l);c[n+0>>2]=0;c[n+4>>2]=0;c[n+8>>2]=0;He(n,10,0);if((a[n]&1)==0){g=n+1|0;u=g;v=n+8|0;w=g}else{g=n+8|0;u=n+1|0;v=g;w=c[g>>2]|0}c[o>>2]=w;c[q>>2]=p;c[r>>2]=0;g=n+4|0;s=c[l>>2]|0;l=c[e>>2]|0;x=w;a:while(1){if((l|0)!=0){w=c[l+12>>2]|0;if((w|0)==(c[l+16>>2]|0)){y=sc[c[(c[l>>2]|0)+36>>2]&127](l)|0}else{y=c[w>>2]|0}if((y|0)==-1){c[e>>2]=0;z=1;A=0}else{z=0;A=l}}else{z=1;A=0}w=c[f>>2]|0;do{if((w|0)!=0){B=c[w+12>>2]|0;if((B|0)==(c[w+16>>2]|0)){C=sc[c[(c[w>>2]|0)+36>>2]&127](w)|0}else{C=c[B>>2]|0}if(!((C|0)==-1)){if(z){D=w;break}else{E=w;F=x;break a}}else{c[f>>2]=0;G=21;break}}else{G=21}}while(0);if((G|0)==21){G=0;if(z){E=0;F=x;break}else{D=0}}w=a[n]|0;B=(w&1)==0;if(B){H=(w&255)>>>1}else{H=c[g>>2]|0}if(((c[o>>2]|0)-x|0)==(H|0)){if(B){I=(w&255)>>>1;J=(w&255)>>>1}else{w=c[g>>2]|0;I=w;J=w}He(n,I<<1,0);if((a[n]&1)==0){K=10}else{K=(c[n>>2]&-2)+ -1|0}He(n,K,0);if((a[n]&1)==0){L=u}else{L=c[v>>2]|0}c[o>>2]=L+J;M=L}else{M=x}w=A+12|0;B=c[w>>2]|0;N=A+16|0;if((B|0)==(c[N>>2]|0)){O=sc[c[(c[A>>2]|0)+36>>2]&127](A)|0}else{O=c[B>>2]|0}if((gh(O,t,M,o,r,s,m,p,q,k)|0)!=0){E=D;F=M;break}B=c[w>>2]|0;if((B|0)==(c[N>>2]|0)){sc[c[(c[A>>2]|0)+40>>2]&127](A)|0;l=A;x=M;continue}else{c[w>>2]=B+4;l=A;x=M;continue}}M=a[m]|0;if((M&1)==0){P=(M&255)>>>1}else{P=c[m+4>>2]|0}if((P|0)!=0?(P=c[q>>2]|0,(P-p|0)<160):0){M=c[r>>2]|0;c[q>>2]=P+4;c[P>>2]=M}c[j>>2]=am(F,c[o>>2]|0,h,t)|0;tj(m,p,c[q>>2]|0,h);if((A|0)!=0){q=c[A+12>>2]|0;if((q|0)==(c[A+16>>2]|0)){Q=sc[c[(c[A>>2]|0)+36>>2]&127](A)|0}else{Q=c[q>>2]|0}if((Q|0)==-1){c[e>>2]=0;R=0;S=1}else{R=A;S=0}}else{R=0;S=1}do{if((E|0)!=0){A=c[E+12>>2]|0;if((A|0)==(c[E+16>>2]|0)){T=sc[c[(c[E>>2]|0)+36>>2]&127](E)|0}else{T=c[A>>2]|0}if((T|0)==-1){c[f>>2]=0;G=60;break}if(S){c[b>>2]=R;Fe(n);Fe(m);i=d;return}}else{G=60}}while(0);if((G|0)==60?!S:0){c[b>>2]=R;Fe(n);Fe(m);i=d;return}c[h>>2]=c[h>>2]|2;c[b>>2]=R;Fe(n);Fe(m);i=d;return}function Rg(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;l=b+4|0;m=b;c[l>>2]=c[d>>2];c[m>>2]=c[e>>2];c[k+0>>2]=c[l+0>>2];c[j+0>>2]=c[m+0>>2];Sg(a,0,k,j,f,g,h);i=b;return}function Sg(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0;d=i;i=i+304|0;k=d+160|0;l=d+280|0;m=d+264|0;n=d+284|0;o=d+300|0;p=d;q=d+276|0;r=d+296|0;s=c[g+4>>2]&74;if((s|0)==0){t=0}else if((s|0)==64){t=8}else if((s|0)==8){t=16}else{t=10}kh(m,g,k,l);c[n+0>>2]=0;c[n+4>>2]=0;c[n+8>>2]=0;He(n,10,0);if((a[n]&1)==0){g=n+1|0;u=g;v=n+8|0;w=g}else{g=n+8|0;u=n+1|0;v=g;w=c[g>>2]|0}c[o>>2]=w;c[q>>2]=p;c[r>>2]=0;g=n+4|0;s=c[l>>2]|0;l=c[e>>2]|0;x=w;a:while(1){if((l|0)!=0){w=c[l+12>>2]|0;if((w|0)==(c[l+16>>2]|0)){y=sc[c[(c[l>>2]|0)+36>>2]&127](l)|0}else{y=c[w>>2]|0}if((y|0)==-1){c[e>>2]=0;z=1;A=0}else{z=0;A=l}}else{z=1;A=0}w=c[f>>2]|0;do{if((w|0)!=0){B=c[w+12>>2]|0;if((B|0)==(c[w+16>>2]|0)){C=sc[c[(c[w>>2]|0)+36>>2]&127](w)|0}else{C=c[B>>2]|0}if(!((C|0)==-1)){if(z){D=w;break}else{E=w;F=x;break a}}else{c[f>>2]=0;G=21;break}}else{G=21}}while(0);if((G|0)==21){G=0;if(z){E=0;F=x;break}else{D=0}}w=a[n]|0;B=(w&1)==0;if(B){H=(w&255)>>>1}else{H=c[g>>2]|0}if(((c[o>>2]|0)-x|0)==(H|0)){if(B){J=(w&255)>>>1;K=(w&255)>>>1}else{w=c[g>>2]|0;J=w;K=w}He(n,J<<1,0);if((a[n]&1)==0){L=10}else{L=(c[n>>2]&-2)+ -1|0}He(n,L,0);if((a[n]&1)==0){M=u}else{M=c[v>>2]|0}c[o>>2]=M+K;N=M}else{N=x}w=A+12|0;B=c[w>>2]|0;O=A+16|0;if((B|0)==(c[O>>2]|0)){P=sc[c[(c[A>>2]|0)+36>>2]&127](A)|0}else{P=c[B>>2]|0}if((gh(P,t,N,o,r,s,m,p,q,k)|0)!=0){E=D;F=N;break}B=c[w>>2]|0;if((B|0)==(c[O>>2]|0)){sc[c[(c[A>>2]|0)+40>>2]&127](A)|0;l=A;x=N;continue}else{c[w>>2]=B+4;l=A;x=N;continue}}N=a[m]|0;if((N&1)==0){Q=(N&255)>>>1}else{Q=c[m+4>>2]|0}if((Q|0)!=0?(Q=c[q>>2]|0,(Q-p|0)<160):0){N=c[r>>2]|0;c[q>>2]=Q+4;c[Q>>2]=N}N=$l(F,c[o>>2]|0,h,t)|0;t=j;c[t>>2]=N;c[t+4>>2]=I;tj(m,p,c[q>>2]|0,h);if((A|0)!=0){q=c[A+12>>2]|0;if((q|0)==(c[A+16>>2]|0)){R=sc[c[(c[A>>2]|0)+36>>2]&127](A)|0}else{R=c[q>>2]|0}if((R|0)==-1){c[e>>2]=0;S=0;T=1}else{S=A;T=0}}else{S=0;T=1}do{if((E|0)!=0){A=c[E+12>>2]|0;if((A|0)==(c[E+16>>2]|0)){U=sc[c[(c[E>>2]|0)+36>>2]&127](E)|0}else{U=c[A>>2]|0}if((U|0)==-1){c[f>>2]=0;G=60;break}if(T){c[b>>2]=S;Fe(n);Fe(m);i=d;return}}else{G=60}}while(0);if((G|0)==60?!T:0){c[b>>2]=S;Fe(n);Fe(m);i=d;return}c[h>>2]=c[h>>2]|2;c[b>>2]=S;Fe(n);Fe(m);i=d;return}function Tg(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;l=b+4|0;m=b;c[l>>2]=c[d>>2];c[m>>2]=c[e>>2];c[k+0>>2]=c[l+0>>2];c[j+0>>2]=c[m+0>>2];Ug(a,0,k,j,f,g,h);i=b;return}function Ug(d,e,f,g,h,j,k){d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0;e=i;i=i+304|0;l=e+160|0;m=e+280|0;n=e+264|0;o=e+284|0;p=e+300|0;q=e;r=e+276|0;s=e+296|0;t=c[h+4>>2]&74;if((t|0)==64){u=8}else if((t|0)==0){u=0}else if((t|0)==8){u=16}else{u=10}kh(n,h,l,m);c[o+0>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;He(o,10,0);if((a[o]&1)==0){h=o+1|0;v=h;w=o+8|0;x=h}else{h=o+8|0;v=o+1|0;w=h;x=c[h>>2]|0}c[p>>2]=x;c[r>>2]=q;c[s>>2]=0;h=o+4|0;t=c[m>>2]|0;m=c[f>>2]|0;y=x;a:while(1){if((m|0)!=0){x=c[m+12>>2]|0;if((x|0)==(c[m+16>>2]|0)){z=sc[c[(c[m>>2]|0)+36>>2]&127](m)|0}else{z=c[x>>2]|0}if((z|0)==-1){c[f>>2]=0;A=1;B=0}else{A=0;B=m}}else{A=1;B=0}x=c[g>>2]|0;do{if((x|0)!=0){C=c[x+12>>2]|0;if((C|0)==(c[x+16>>2]|0)){D=sc[c[(c[x>>2]|0)+36>>2]&127](x)|0}else{D=c[C>>2]|0}if(!((D|0)==-1)){if(A){E=x;break}else{F=x;G=y;break a}}else{c[g>>2]=0;H=21;break}}else{H=21}}while(0);if((H|0)==21){H=0;if(A){F=0;G=y;break}else{E=0}}x=a[o]|0;C=(x&1)==0;if(C){I=(x&255)>>>1}else{I=c[h>>2]|0}if(((c[p>>2]|0)-y|0)==(I|0)){if(C){J=(x&255)>>>1;K=(x&255)>>>1}else{x=c[h>>2]|0;J=x;K=x}He(o,J<<1,0);if((a[o]&1)==0){L=10}else{L=(c[o>>2]&-2)+ -1|0}He(o,L,0);if((a[o]&1)==0){M=v}else{M=c[w>>2]|0}c[p>>2]=M+K;N=M}else{N=y}x=B+12|0;C=c[x>>2]|0;O=B+16|0;if((C|0)==(c[O>>2]|0)){P=sc[c[(c[B>>2]|0)+36>>2]&127](B)|0}else{P=c[C>>2]|0}if((gh(P,u,N,p,s,t,n,q,r,l)|0)!=0){F=E;G=N;break}C=c[x>>2]|0;if((C|0)==(c[O>>2]|0)){sc[c[(c[B>>2]|0)+40>>2]&127](B)|0;m=B;y=N;continue}else{c[x>>2]=C+4;m=B;y=N;continue}}N=a[n]|0;if((N&1)==0){Q=(N&255)>>>1}else{Q=c[n+4>>2]|0}if((Q|0)!=0?(Q=c[r>>2]|0,(Q-q|0)<160):0){N=c[s>>2]|0;c[r>>2]=Q+4;c[Q>>2]=N}b[k>>1]=_l(G,c[p>>2]|0,j,u)|0;tj(n,q,c[r>>2]|0,j);if((B|0)!=0){r=c[B+12>>2]|0;if((r|0)==(c[B+16>>2]|0)){R=sc[c[(c[B>>2]|0)+36>>2]&127](B)|0}else{R=c[r>>2]|0}if((R|0)==-1){c[f>>2]=0;S=0;T=1}else{S=B;T=0}}else{S=0;T=1}do{if((F|0)!=0){B=c[F+12>>2]|0;if((B|0)==(c[F+16>>2]|0)){U=sc[c[(c[F>>2]|0)+36>>2]&127](F)|0}else{U=c[B>>2]|0}if((U|0)==-1){c[g>>2]=0;H=60;break}if(T){c[d>>2]=S;Fe(o);Fe(n);i=e;return}}else{H=60}}while(0);if((H|0)==60?!T:0){c[d>>2]=S;Fe(o);Fe(n);i=e;return}c[j>>2]=c[j>>2]|2;c[d>>2]=S;Fe(o);Fe(n);i=e;return}function Vg(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;l=b+4|0;m=b;c[l>>2]=c[d>>2];c[m>>2]=c[e>>2];c[k+0>>2]=c[l+0>>2];c[j+0>>2]=c[m+0>>2];Wg(a,0,k,j,f,g,h);i=b;return}function Wg(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0;d=i;i=i+304|0;k=d+160|0;l=d+280|0;m=d+264|0;n=d+284|0;o=d+300|0;p=d;q=d+276|0;r=d+296|0;s=c[g+4>>2]&74;if((s|0)==8){t=16}else if((s|0)==0){t=0}else if((s|0)==64){t=8}else{t=10}kh(m,g,k,l);c[n+0>>2]=0;c[n+4>>2]=0;c[n+8>>2]=0;He(n,10,0);if((a[n]&1)==0){g=n+1|0;u=g;v=n+8|0;w=g}else{g=n+8|0;u=n+1|0;v=g;w=c[g>>2]|0}c[o>>2]=w;c[q>>2]=p;c[r>>2]=0;g=n+4|0;s=c[l>>2]|0;l=c[e>>2]|0;x=w;a:while(1){if((l|0)!=0){w=c[l+12>>2]|0;if((w|0)==(c[l+16>>2]|0)){y=sc[c[(c[l>>2]|0)+36>>2]&127](l)|0}else{y=c[w>>2]|0}if((y|0)==-1){c[e>>2]=0;z=1;A=0}else{z=0;A=l}}else{z=1;A=0}w=c[f>>2]|0;do{if((w|0)!=0){B=c[w+12>>2]|0;if((B|0)==(c[w+16>>2]|0)){C=sc[c[(c[w>>2]|0)+36>>2]&127](w)|0}else{C=c[B>>2]|0}if(!((C|0)==-1)){if(z){D=w;break}else{E=w;F=x;break a}}else{c[f>>2]=0;G=21;break}}else{G=21}}while(0);if((G|0)==21){G=0;if(z){E=0;F=x;break}else{D=0}}w=a[n]|0;B=(w&1)==0;if(B){H=(w&255)>>>1}else{H=c[g>>2]|0}if(((c[o>>2]|0)-x|0)==(H|0)){if(B){I=(w&255)>>>1;J=(w&255)>>>1}else{w=c[g>>2]|0;I=w;J=w}He(n,I<<1,0);if((a[n]&1)==0){K=10}else{K=(c[n>>2]&-2)+ -1|0}He(n,K,0);if((a[n]&1)==0){L=u}else{L=c[v>>2]|0}c[o>>2]=L+J;M=L}else{M=x}w=A+12|0;B=c[w>>2]|0;N=A+16|0;if((B|0)==(c[N>>2]|0)){O=sc[c[(c[A>>2]|0)+36>>2]&127](A)|0}else{O=c[B>>2]|0}if((gh(O,t,M,o,r,s,m,p,q,k)|0)!=0){E=D;F=M;break}B=c[w>>2]|0;if((B|0)==(c[N>>2]|0)){sc[c[(c[A>>2]|0)+40>>2]&127](A)|0;l=A;x=M;continue}else{c[w>>2]=B+4;l=A;x=M;continue}}M=a[m]|0;if((M&1)==0){P=(M&255)>>>1}else{P=c[m+4>>2]|0}if((P|0)!=0?(P=c[q>>2]|0,(P-p|0)<160):0){M=c[r>>2]|0;c[q>>2]=P+4;c[P>>2]=M}c[j>>2]=Zl(F,c[o>>2]|0,h,t)|0;tj(m,p,c[q>>2]|0,h);if((A|0)!=0){q=c[A+12>>2]|0;if((q|0)==(c[A+16>>2]|0)){Q=sc[c[(c[A>>2]|0)+36>>2]&127](A)|0}else{Q=c[q>>2]|0}if((Q|0)==-1){c[e>>2]=0;R=0;S=1}else{R=A;S=0}}else{R=0;S=1}do{if((E|0)!=0){A=c[E+12>>2]|0;if((A|0)==(c[E+16>>2]|0)){T=sc[c[(c[E>>2]|0)+36>>2]&127](E)|0}else{T=c[A>>2]|0}if((T|0)==-1){c[f>>2]=0;G=60;break}if(S){c[b>>2]=R;Fe(n);Fe(m);i=d;return}}else{G=60}}while(0);if((G|0)==60?!S:0){c[b>>2]=R;Fe(n);Fe(m);i=d;return}c[h>>2]=c[h>>2]|2;c[b>>2]=R;Fe(n);Fe(m);i=d;return}function Xg(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;l=b+4|0;m=b;c[l>>2]=c[d>>2];c[m>>2]=c[e>>2];c[k+0>>2]=c[l+0>>2];c[j+0>>2]=c[m+0>>2];Yg(a,0,k,j,f,g,h);i=b;return}function Yg(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0;d=i;i=i+304|0;k=d+160|0;l=d+280|0;m=d+264|0;n=d+284|0;o=d+300|0;p=d;q=d+276|0;r=d+296|0;s=c[g+4>>2]&74;if((s|0)==0){t=0}else if((s|0)==64){t=8}else if((s|0)==8){t=16}else{t=10}kh(m,g,k,l);c[n+0>>2]=0;c[n+4>>2]=0;c[n+8>>2]=0;He(n,10,0);if((a[n]&1)==0){g=n+1|0;u=g;v=n+8|0;w=g}else{g=n+8|0;u=n+1|0;v=g;w=c[g>>2]|0}c[o>>2]=w;c[q>>2]=p;c[r>>2]=0;g=n+4|0;s=c[l>>2]|0;l=c[e>>2]|0;x=w;a:while(1){if((l|0)!=0){w=c[l+12>>2]|0;if((w|0)==(c[l+16>>2]|0)){y=sc[c[(c[l>>2]|0)+36>>2]&127](l)|0}else{y=c[w>>2]|0}if((y|0)==-1){c[e>>2]=0;z=1;A=0}else{z=0;A=l}}else{z=1;A=0}w=c[f>>2]|0;do{if((w|0)!=0){B=c[w+12>>2]|0;if((B|0)==(c[w+16>>2]|0)){C=sc[c[(c[w>>2]|0)+36>>2]&127](w)|0}else{C=c[B>>2]|0}if(!((C|0)==-1)){if(z){D=w;break}else{E=w;F=x;break a}}else{c[f>>2]=0;G=21;break}}else{G=21}}while(0);if((G|0)==21){G=0;if(z){E=0;F=x;break}else{D=0}}w=a[n]|0;B=(w&1)==0;if(B){H=(w&255)>>>1}else{H=c[g>>2]|0}if(((c[o>>2]|0)-x|0)==(H|0)){if(B){I=(w&255)>>>1;J=(w&255)>>>1}else{w=c[g>>2]|0;I=w;J=w}He(n,I<<1,0);if((a[n]&1)==0){K=10}else{K=(c[n>>2]&-2)+ -1|0}He(n,K,0);if((a[n]&1)==0){L=u}else{L=c[v>>2]|0}c[o>>2]=L+J;M=L}else{M=x}w=A+12|0;B=c[w>>2]|0;N=A+16|0;if((B|0)==(c[N>>2]|0)){O=sc[c[(c[A>>2]|0)+36>>2]&127](A)|0}else{O=c[B>>2]|0}if((gh(O,t,M,o,r,s,m,p,q,k)|0)!=0){E=D;F=M;break}B=c[w>>2]|0;if((B|0)==(c[N>>2]|0)){sc[c[(c[A>>2]|0)+40>>2]&127](A)|0;l=A;x=M;continue}else{c[w>>2]=B+4;l=A;x=M;continue}}M=a[m]|0;if((M&1)==0){P=(M&255)>>>1}else{P=c[m+4>>2]|0}if((P|0)!=0?(P=c[q>>2]|0,(P-p|0)<160):0){M=c[r>>2]|0;c[q>>2]=P+4;c[P>>2]=M}c[j>>2]=Yl(F,c[o>>2]|0,h,t)|0;tj(m,p,c[q>>2]|0,h);if((A|0)!=0){q=c[A+12>>2]|0;if((q|0)==(c[A+16>>2]|0)){Q=sc[c[(c[A>>2]|0)+36>>2]&127](A)|0}else{Q=c[q>>2]|0}if((Q|0)==-1){c[e>>2]=0;R=0;S=1}else{R=A;S=0}}else{R=0;S=1}do{if((E|0)!=0){A=c[E+12>>2]|0;if((A|0)==(c[E+16>>2]|0)){T=sc[c[(c[E>>2]|0)+36>>2]&127](E)|0}else{T=c[A>>2]|0}if((T|0)==-1){c[f>>2]=0;G=60;break}if(S){c[b>>2]=R;Fe(n);Fe(m);i=d;return}}else{G=60}}while(0);if((G|0)==60?!S:0){c[b>>2]=R;Fe(n);Fe(m);i=d;return}c[h>>2]=c[h>>2]|2;c[b>>2]=R;Fe(n);Fe(m);i=d;return}function Zg(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;l=b+4|0;m=b;c[l>>2]=c[d>>2];c[m>>2]=c[e>>2];c[k+0>>2]=c[l+0>>2];c[j+0>>2]=c[m+0>>2];_g(a,0,k,j,f,g,h);i=b;return}function _g(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0;d=i;i=i+304|0;k=d+160|0;l=d+280|0;m=d+264|0;n=d+284|0;o=d+300|0;p=d;q=d+276|0;r=d+296|0;s=c[g+4>>2]&74;if((s|0)==0){t=0}else if((s|0)==8){t=16}else if((s|0)==64){t=8}else{t=10}kh(m,g,k,l);c[n+0>>2]=0;c[n+4>>2]=0;c[n+8>>2]=0;He(n,10,0);if((a[n]&1)==0){g=n+1|0;u=g;v=n+8|0;w=g}else{g=n+8|0;u=n+1|0;v=g;w=c[g>>2]|0}c[o>>2]=w;c[q>>2]=p;c[r>>2]=0;g=n+4|0;s=c[l>>2]|0;l=c[e>>2]|0;x=w;a:while(1){if((l|0)!=0){w=c[l+12>>2]|0;if((w|0)==(c[l+16>>2]|0)){y=sc[c[(c[l>>2]|0)+36>>2]&127](l)|0}else{y=c[w>>2]|0}if((y|0)==-1){c[e>>2]=0;z=1;A=0}else{z=0;A=l}}else{z=1;A=0}w=c[f>>2]|0;do{if((w|0)!=0){B=c[w+12>>2]|0;if((B|0)==(c[w+16>>2]|0)){C=sc[c[(c[w>>2]|0)+36>>2]&127](w)|0}else{C=c[B>>2]|0}if(!((C|0)==-1)){if(z){D=w;break}else{E=w;F=x;break a}}else{c[f>>2]=0;G=21;break}}else{G=21}}while(0);if((G|0)==21){G=0;if(z){E=0;F=x;break}else{D=0}}w=a[n]|0;B=(w&1)==0;if(B){H=(w&255)>>>1}else{H=c[g>>2]|0}if(((c[o>>2]|0)-x|0)==(H|0)){if(B){J=(w&255)>>>1;K=(w&255)>>>1}else{w=c[g>>2]|0;J=w;K=w}He(n,J<<1,0);if((a[n]&1)==0){L=10}else{L=(c[n>>2]&-2)+ -1|0}He(n,L,0);if((a[n]&1)==0){M=u}else{M=c[v>>2]|0}c[o>>2]=M+K;N=M}else{N=x}w=A+12|0;B=c[w>>2]|0;O=A+16|0;if((B|0)==(c[O>>2]|0)){P=sc[c[(c[A>>2]|0)+36>>2]&127](A)|0}else{P=c[B>>2]|0}if((gh(P,t,N,o,r,s,m,p,q,k)|0)!=0){E=D;F=N;break}B=c[w>>2]|0;if((B|0)==(c[O>>2]|0)){sc[c[(c[A>>2]|0)+40>>2]&127](A)|0;l=A;x=N;continue}else{c[w>>2]=B+4;l=A;x=N;continue}}N=a[m]|0;if((N&1)==0){Q=(N&255)>>>1}else{Q=c[m+4>>2]|0}if((Q|0)!=0?(Q=c[q>>2]|0,(Q-p|0)<160):0){N=c[r>>2]|0;c[q>>2]=Q+4;c[Q>>2]=N}N=Xl(F,c[o>>2]|0,h,t)|0;t=j;c[t>>2]=N;c[t+4>>2]=I;tj(m,p,c[q>>2]|0,h);if((A|0)!=0){q=c[A+12>>2]|0;if((q|0)==(c[A+16>>2]|0)){R=sc[c[(c[A>>2]|0)+36>>2]&127](A)|0}else{R=c[q>>2]|0}if((R|0)==-1){c[e>>2]=0;S=0;T=1}else{S=A;T=0}}else{S=0;T=1}do{if((E|0)!=0){A=c[E+12>>2]|0;if((A|0)==(c[E+16>>2]|0)){U=sc[c[(c[E>>2]|0)+36>>2]&127](E)|0}else{U=c[A>>2]|0}if((U|0)==-1){c[f>>2]=0;G=60;break}if(T){c[b>>2]=S;Fe(n);Fe(m);i=d;return}}else{G=60}}while(0);if((G|0)==60?!T:0){c[b>>2]=S;Fe(n);Fe(m);i=d;return}c[h>>2]=c[h>>2]|2;c[b>>2]=S;Fe(n);Fe(m);i=d;return}function $g(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;l=b+4|0;m=b;c[l>>2]=c[d>>2];c[m>>2]=c[e>>2];c[k+0>>2]=c[l+0>>2];c[j+0>>2]=c[m+0>>2];ah(a,0,k,j,f,g,h);i=b;return}function ah(b,d,e,f,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0;d=i;i=i+352|0;l=d+208|0;m=d+184|0;n=d+4|0;o=d+8|0;p=d+196|0;q=d;r=d+24|0;s=d+192|0;t=d+188|0;u=d+337|0;v=d+336|0;lh(o,h,l,m,n);c[p+0>>2]=0;c[p+4>>2]=0;c[p+8>>2]=0;He(p,10,0);if((a[p]&1)==0){h=p+1|0;w=h;x=p+8|0;y=h}else{h=p+8|0;w=p+1|0;x=h;y=c[h>>2]|0}c[q>>2]=y;c[s>>2]=r;c[t>>2]=0;a[u]=1;a[v]=69;h=p+4|0;z=c[m>>2]|0;m=c[n>>2]|0;n=c[e>>2]|0;A=y;a:while(1){if((n|0)!=0){y=c[n+12>>2]|0;if((y|0)==(c[n+16>>2]|0)){B=sc[c[(c[n>>2]|0)+36>>2]&127](n)|0}else{B=c[y>>2]|0}if((B|0)==-1){c[e>>2]=0;C=1;D=0}else{C=0;D=n}}else{C=1;D=0}y=c[f>>2]|0;do{if((y|0)!=0){E=c[y+12>>2]|0;if((E|0)==(c[y+16>>2]|0)){F=sc[c[(c[y>>2]|0)+36>>2]&127](y)|0}else{F=c[E>>2]|0}if(!((F|0)==-1)){if(C){G=y;break}else{H=y;I=A;break a}}else{c[f>>2]=0;J=17;break}}else{J=17}}while(0);if((J|0)==17){J=0;if(C){H=0;I=A;break}else{G=0}}y=a[p]|0;E=(y&1)==0;if(E){K=(y&255)>>>1}else{K=c[h>>2]|0}if(((c[q>>2]|0)-A|0)==(K|0)){if(E){L=(y&255)>>>1;M=(y&255)>>>1}else{y=c[h>>2]|0;L=y;M=y}He(p,L<<1,0);if((a[p]&1)==0){N=10}else{N=(c[p>>2]&-2)+ -1|0}He(p,N,0);if((a[p]&1)==0){O=w}else{O=c[x>>2]|0}c[q>>2]=O+M;P=O}else{P=A}y=D+12|0;E=c[y>>2]|0;Q=D+16|0;if((E|0)==(c[Q>>2]|0)){R=sc[c[(c[D>>2]|0)+36>>2]&127](D)|0}else{R=c[E>>2]|0}if((mh(R,u,v,P,q,z,m,o,r,s,t,l)|0)!=0){H=G;I=P;break}E=c[y>>2]|0;if((E|0)==(c[Q>>2]|0)){sc[c[(c[D>>2]|0)+40>>2]&127](D)|0;n=D;A=P;continue}else{c[y>>2]=E+4;n=D;A=P;continue}}P=a[o]|0;if((P&1)==0){S=(P&255)>>>1}else{S=c[o+4>>2]|0}if(((S|0)!=0?(a[u]|0)!=0:0)?(u=c[s>>2]|0,(u-r|0)<160):0){S=c[t>>2]|0;c[s>>2]=u+4;c[u>>2]=S}g[k>>2]=+Wl(I,c[q>>2]|0,j);tj(o,r,c[s>>2]|0,j);if((D|0)!=0){s=c[D+12>>2]|0;if((s|0)==(c[D+16>>2]|0)){T=sc[c[(c[D>>2]|0)+36>>2]&127](D)|0}else{T=c[s>>2]|0}if((T|0)==-1){c[e>>2]=0;U=0;V=1}else{U=D;V=0}}else{U=0;V=1}do{if((H|0)!=0){D=c[H+12>>2]|0;if((D|0)==(c[H+16>>2]|0)){W=sc[c[(c[H>>2]|0)+36>>2]&127](H)|0}else{W=c[D>>2]|0}if((W|0)==-1){c[f>>2]=0;J=57;break}if(V){c[b>>2]=U;Fe(p);Fe(o);i=d;return}}else{J=57}}while(0);if((J|0)==57?!V:0){c[b>>2]=U;Fe(p);Fe(o);i=d;return}c[j>>2]=c[j>>2]|2;c[b>>2]=U;Fe(p);Fe(o);i=d;return}function bh(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;l=b+4|0;m=b;c[l>>2]=c[d>>2];c[m>>2]=c[e>>2];c[k+0>>2]=c[l+0>>2];c[j+0>>2]=c[m+0>>2];ch(a,0,k,j,f,g,h);i=b;return}function ch(b,d,e,f,g,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0;d=i;i=i+352|0;l=d+208|0;m=d+184|0;n=d+4|0;o=d+8|0;p=d+196|0;q=d;r=d+24|0;s=d+192|0;t=d+188|0;u=d+337|0;v=d+336|0;lh(o,g,l,m,n);c[p+0>>2]=0;c[p+4>>2]=0;c[p+8>>2]=0;He(p,10,0);if((a[p]&1)==0){g=p+1|0;w=g;x=p+8|0;y=g}else{g=p+8|0;w=p+1|0;x=g;y=c[g>>2]|0}c[q>>2]=y;c[s>>2]=r;c[t>>2]=0;a[u]=1;a[v]=69;g=p+4|0;z=c[m>>2]|0;m=c[n>>2]|0;n=c[e>>2]|0;A=y;a:while(1){if((n|0)!=0){y=c[n+12>>2]|0;if((y|0)==(c[n+16>>2]|0)){B=sc[c[(c[n>>2]|0)+36>>2]&127](n)|0}else{B=c[y>>2]|0}if((B|0)==-1){c[e>>2]=0;C=1;D=0}else{C=0;D=n}}else{C=1;D=0}y=c[f>>2]|0;do{if((y|0)!=0){E=c[y+12>>2]|0;if((E|0)==(c[y+16>>2]|0)){F=sc[c[(c[y>>2]|0)+36>>2]&127](y)|0}else{F=c[E>>2]|0}if(!((F|0)==-1)){if(C){G=y;break}else{H=y;I=A;break a}}else{c[f>>2]=0;J=17;break}}else{J=17}}while(0);if((J|0)==17){J=0;if(C){H=0;I=A;break}else{G=0}}y=a[p]|0;E=(y&1)==0;if(E){K=(y&255)>>>1}else{K=c[g>>2]|0}if(((c[q>>2]|0)-A|0)==(K|0)){if(E){L=(y&255)>>>1;M=(y&255)>>>1}else{y=c[g>>2]|0;L=y;M=y}He(p,L<<1,0);if((a[p]&1)==0){N=10}else{N=(c[p>>2]&-2)+ -1|0}He(p,N,0);if((a[p]&1)==0){O=w}else{O=c[x>>2]|0}c[q>>2]=O+M;P=O}else{P=A}y=D+12|0;E=c[y>>2]|0;Q=D+16|0;if((E|0)==(c[Q>>2]|0)){R=sc[c[(c[D>>2]|0)+36>>2]&127](D)|0}else{R=c[E>>2]|0}if((mh(R,u,v,P,q,z,m,o,r,s,t,l)|0)!=0){H=G;I=P;break}E=c[y>>2]|0;if((E|0)==(c[Q>>2]|0)){sc[c[(c[D>>2]|0)+40>>2]&127](D)|0;n=D;A=P;continue}else{c[y>>2]=E+4;n=D;A=P;continue}}P=a[o]|0;if((P&1)==0){S=(P&255)>>>1}else{S=c[o+4>>2]|0}if(((S|0)!=0?(a[u]|0)!=0:0)?(u=c[s>>2]|0,(u-r|0)<160):0){S=c[t>>2]|0;c[s>>2]=u+4;c[u>>2]=S}h[k>>3]=+Vl(I,c[q>>2]|0,j);tj(o,r,c[s>>2]|0,j);if((D|0)!=0){s=c[D+12>>2]|0;if((s|0)==(c[D+16>>2]|0)){T=sc[c[(c[D>>2]|0)+36>>2]&127](D)|0}else{T=c[s>>2]|0}if((T|0)==-1){c[e>>2]=0;U=0;V=1}else{U=D;V=0}}else{U=0;V=1}do{if((H|0)!=0){D=c[H+12>>2]|0;if((D|0)==(c[H+16>>2]|0)){W=sc[c[(c[H>>2]|0)+36>>2]&127](H)|0}else{W=c[D>>2]|0}if((W|0)==-1){c[f>>2]=0;J=57;break}if(V){c[b>>2]=U;Fe(p);Fe(o);i=d;return}}else{J=57}}while(0);if((J|0)==57?!V:0){c[b>>2]=U;Fe(p);Fe(o);i=d;return}c[j>>2]=c[j>>2]|2;c[b>>2]=U;Fe(p);Fe(o);i=d;return}function dh(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;l=b+4|0;m=b;c[l>>2]=c[d>>2];c[m>>2]=c[e>>2];c[k+0>>2]=c[l+0>>2];c[j+0>>2]=c[m+0>>2];eh(a,0,k,j,f,g,h);i=b;return}function eh(b,d,e,f,g,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0;d=i;i=i+352|0;l=d+208|0;m=d+184|0;n=d+4|0;o=d+8|0;p=d+196|0;q=d;r=d+24|0;s=d+192|0;t=d+188|0;u=d+337|0;v=d+336|0;lh(o,g,l,m,n);c[p+0>>2]=0;c[p+4>>2]=0;c[p+8>>2]=0;He(p,10,0);if((a[p]&1)==0){g=p+1|0;w=g;x=p+8|0;y=g}else{g=p+8|0;w=p+1|0;x=g;y=c[g>>2]|0}c[q>>2]=y;c[s>>2]=r;c[t>>2]=0;a[u]=1;a[v]=69;g=p+4|0;z=c[m>>2]|0;m=c[n>>2]|0;n=c[e>>2]|0;A=y;a:while(1){if((n|0)!=0){y=c[n+12>>2]|0;if((y|0)==(c[n+16>>2]|0)){B=sc[c[(c[n>>2]|0)+36>>2]&127](n)|0}else{B=c[y>>2]|0}if((B|0)==-1){c[e>>2]=0;C=1;D=0}else{C=0;D=n}}else{C=1;D=0}y=c[f>>2]|0;do{if((y|0)!=0){E=c[y+12>>2]|0;if((E|0)==(c[y+16>>2]|0)){F=sc[c[(c[y>>2]|0)+36>>2]&127](y)|0}else{F=c[E>>2]|0}if(!((F|0)==-1)){if(C){G=y;break}else{H=y;I=A;break a}}else{c[f>>2]=0;J=17;break}}else{J=17}}while(0);if((J|0)==17){J=0;if(C){H=0;I=A;break}else{G=0}}y=a[p]|0;E=(y&1)==0;if(E){K=(y&255)>>>1}else{K=c[g>>2]|0}if(((c[q>>2]|0)-A|0)==(K|0)){if(E){L=(y&255)>>>1;M=(y&255)>>>1}else{y=c[g>>2]|0;L=y;M=y}He(p,L<<1,0);if((a[p]&1)==0){N=10}else{N=(c[p>>2]&-2)+ -1|0}He(p,N,0);if((a[p]&1)==0){O=w}else{O=c[x>>2]|0}c[q>>2]=O+M;P=O}else{P=A}y=D+12|0;E=c[y>>2]|0;Q=D+16|0;if((E|0)==(c[Q>>2]|0)){R=sc[c[(c[D>>2]|0)+36>>2]&127](D)|0}else{R=c[E>>2]|0}if((mh(R,u,v,P,q,z,m,o,r,s,t,l)|0)!=0){H=G;I=P;break}E=c[y>>2]|0;if((E|0)==(c[Q>>2]|0)){sc[c[(c[D>>2]|0)+40>>2]&127](D)|0;n=D;A=P;continue}else{c[y>>2]=E+4;n=D;A=P;continue}}P=a[o]|0;if((P&1)==0){S=(P&255)>>>1}else{S=c[o+4>>2]|0}if(((S|0)!=0?(a[u]|0)!=0:0)?(u=c[s>>2]|0,(u-r|0)<160):0){S=c[t>>2]|0;c[s>>2]=u+4;c[u>>2]=S}h[k>>3]=+Ul(I,c[q>>2]|0,j);tj(o,r,c[s>>2]|0,j);if((D|0)!=0){s=c[D+12>>2]|0;if((s|0)==(c[D+16>>2]|0)){T=sc[c[(c[D>>2]|0)+36>>2]&127](D)|0}else{T=c[s>>2]|0}if((T|0)==-1){c[e>>2]=0;U=0;V=1}else{U=D;V=0}}else{U=0;V=1}do{if((H|0)!=0){D=c[H+12>>2]|0;if((D|0)==(c[H+16>>2]|0)){W=sc[c[(c[H>>2]|0)+36>>2]&127](H)|0}else{W=c[D>>2]|0}if((W|0)==-1){c[f>>2]=0;J=57;break}if(V){c[b>>2]=U;Fe(p);Fe(o);i=d;return}}else{J=57}}while(0);if((J|0)==57?!V:0){c[b>>2]=U;Fe(p);Fe(o);i=d;return}c[j>>2]=c[j>>2]|2;c[b>>2]=U;Fe(p);Fe(o);i=d;return}function fh(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0;d=i;i=i+320|0;k=d;l=d+208|0;m=d+192|0;n=d+188|0;o=d+176|0;p=d+16|0;c[m+0>>2]=0;c[m+4>>2]=0;c[m+8>>2]=0;Ze(n,g);g=c[n>>2]|0;if(!((c[1498]|0)==-1)){c[k>>2]=5992;c[k+4>>2]=117;c[k+8>>2]=0;Ae(5992,k,118)}q=(c[5996>>2]|0)+ -1|0;r=c[g+8>>2]|0;if(!((c[g+12>>2]|0)-r>>2>>>0>q>>>0)){s=xb(4)|0;wm(s);ec(s|0,13960,106)}g=c[r+(q<<2)>>2]|0;if((g|0)==0){s=xb(4)|0;wm(s);ec(s|0,13960,106)}yc[c[(c[g>>2]|0)+48>>2]&7](g,4544,4570|0,l)|0;ge(c[n>>2]|0)|0;c[o+0>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;He(o,10,0);if((a[o]&1)==0){n=o+1|0;t=n;u=o+8|0;v=n}else{n=o+8|0;t=o+1|0;u=n;v=c[n>>2]|0}n=o+4|0;g=l+96|0;s=l+100|0;q=p;r=l+104|0;w=l;x=m+4|0;y=c[e>>2]|0;z=p;p=0;A=v;B=v;a:while(1){if((y|0)!=0){v=c[y+12>>2]|0;if((v|0)==(c[y+16>>2]|0)){C=sc[c[(c[y>>2]|0)+36>>2]&127](y)|0}else{C=c[v>>2]|0}if((C|0)==-1){c[e>>2]=0;D=1;E=0}else{D=0;E=y}}else{D=1;E=0}v=c[f>>2]|0;do{if((v|0)!=0){F=c[v+12>>2]|0;if((F|0)==(c[v+16>>2]|0)){G=sc[c[(c[v>>2]|0)+36>>2]&127](v)|0}else{G=c[F>>2]|0}if(!((G|0)==-1)){if(D){break}else{H=B;break a}}else{c[f>>2]=0;I=22;break}}else{I=22}}while(0);if((I|0)==22?(I=0,D):0){H=B;break}v=a[o]|0;F=(v&1)==0;if(F){J=(v&255)>>>1}else{J=c[n>>2]|0}if((A-B|0)==(J|0)){if(F){K=(v&255)>>>1;L=(v&255)>>>1}else{v=c[n>>2]|0;K=v;L=v}He(o,K<<1,0);if((a[o]&1)==0){M=10}else{M=(c[o>>2]&-2)+ -1|0}He(o,M,0);if((a[o]&1)==0){N=t}else{N=c[u>>2]|0}O=N+L|0;P=N}else{O=A;P=B}v=c[E+12>>2]|0;if((v|0)==(c[E+16>>2]|0)){Q=sc[c[(c[E>>2]|0)+36>>2]&127](E)|0}else{Q=c[v>>2]|0}v=(O|0)==(P|0);do{if(v){F=(c[g>>2]|0)==(Q|0);if(!F?(c[s>>2]|0)!=(Q|0):0){I=43;break}a[O]=F?43:45;R=O+1|0;S=z;T=0}else{I=43}}while(0);do{if((I|0)==43){I=0;F=a[m]|0;if((F&1)==0){U=(F&255)>>>1}else{U=c[x>>2]|0}if((U|0)!=0&(Q|0)==0){if((z-q|0)>=160){R=O;S=z;T=p;break}c[z>>2]=p;R=O;S=z+4|0;T=0;break}else{V=l}while(1){F=V+4|0;if((c[V>>2]|0)==(Q|0)){W=V;break}if((F|0)==(r|0)){W=r;break}else{V=F}}F=W-w|0;X=F>>2;if((F|0)>92){H=P;break a}if((F|0)<88){a[O]=a[4544+X|0]|0;R=O+1|0;S=z;T=p+1|0;break}if(v){H=O;break a}if((O-P|0)>=3){H=P;break a}if((a[O+ -1|0]|0)!=48){H=P;break a}a[O]=a[4544+X|0]|0;R=O+1|0;S=z;T=0}}while(0);v=c[e>>2]|0;X=v+12|0;F=c[X>>2]|0;if((F|0)==(c[v+16>>2]|0)){sc[c[(c[v>>2]|0)+40>>2]&127](v)|0;y=v;z=S;p=T;A=R;B=P;continue}else{c[X>>2]=F+4;y=v;z=S;p=T;A=R;B=P;continue}}a[H+3|0]=0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}P=c[1472]|0;c[k>>2]=j;if((Kg(H,P,4584,k)|0)!=1){c[h>>2]=4}k=c[e>>2]|0;if((k|0)!=0){P=c[k+12>>2]|0;if((P|0)==(c[k+16>>2]|0)){Y=sc[c[(c[k>>2]|0)+36>>2]&127](k)|0}else{Y=c[P>>2]|0}if((Y|0)==-1){c[e>>2]=0;Z=0;_=1}else{Z=k;_=0}}else{Z=0;_=1}k=c[f>>2]|0;do{if((k|0)!=0){e=c[k+12>>2]|0;if((e|0)==(c[k+16>>2]|0)){$=sc[c[(c[k>>2]|0)+36>>2]&127](k)|0}else{$=c[e>>2]|0}if(($|0)==-1){c[f>>2]=0;I=78;break}if(_){c[b>>2]=Z;Fe(o);Fe(m);i=d;return}}else{I=78}}while(0);if((I|0)==78?!_:0){c[b>>2]=Z;Fe(o);Fe(m);i=d;return}c[h>>2]=c[h>>2]|2;c[b>>2]=Z;Fe(o);Fe(m);i=d;return}function gh(b,d,e,f,g,h,j,k,l,m){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0;n=i;o=c[f>>2]|0;p=(o|0)==(e|0);do{if(p){q=(c[m+96>>2]|0)==(b|0);if(!q?(c[m+100>>2]|0)!=(b|0):0){break}c[f>>2]=e+1;a[e]=q?43:45;c[g>>2]=0;r=0;i=n;return r|0}}while(0);q=a[j]|0;if((q&1)==0){s=(q&255)>>>1}else{s=c[j+4>>2]|0}if((s|0)!=0&(b|0)==(h|0)){h=c[l>>2]|0;if((h-k|0)>=160){r=0;i=n;return r|0}k=c[g>>2]|0;c[l>>2]=h+4;c[h>>2]=k;c[g>>2]=0;r=0;i=n;return r|0}k=m+104|0;h=m;while(1){l=h+4|0;if((c[h>>2]|0)==(b|0)){t=h;break}if((l|0)==(k|0)){t=k;break}else{h=l}}h=t-m|0;m=h>>2;if((h|0)>92){r=-1;i=n;return r|0}if((d|0)==16){if((h|0)>=88){if(p){r=-1;i=n;return r|0}if((o-e|0)>=3){r=-1;i=n;return r|0}if((a[o+ -1|0]|0)!=48){r=-1;i=n;return r|0}c[g>>2]=0;e=a[4544+m|0]|0;c[f>>2]=o+1;a[o]=e;r=0;i=n;return r|0}}else if((d|0)==10|(d|0)==8?(m|0)>=(d|0):0){r=-1;i=n;return r|0}d=a[4544+m|0]|0;c[f>>2]=o+1;a[o]=d;c[g>>2]=(c[g>>2]|0)+1;r=0;i=n;return r|0}function hh(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0;g=i;i=i+16|0;h=g;j=g+12|0;Ze(j,d);d=c[j>>2]|0;if(!((c[1500]|0)==-1)){c[h>>2]=6e3;c[h+4>>2]=117;c[h+8>>2]=0;Ae(6e3,h,118)}k=(c[6004>>2]|0)+ -1|0;l=c[d+8>>2]|0;if(!((c[d+12>>2]|0)-l>>2>>>0>k>>>0)){m=xb(4)|0;wm(m);ec(m|0,13960,106)}d=c[l+(k<<2)>>2]|0;if((d|0)==0){m=xb(4)|0;wm(m);ec(m|0,13960,106)}yc[c[(c[d>>2]|0)+32>>2]&7](d,4544,4570|0,e)|0;e=c[j>>2]|0;if(!((c[1536]|0)==-1)){c[h>>2]=6144;c[h+4>>2]=117;c[h+8>>2]=0;Ae(6144,h,118)}h=(c[6148>>2]|0)+ -1|0;d=c[e+8>>2]|0;if(!((c[e+12>>2]|0)-d>>2>>>0>h>>>0)){n=xb(4)|0;wm(n);ec(n|0,13960,106)}e=c[d+(h<<2)>>2]|0;if((e|0)==0){n=xb(4)|0;wm(n);ec(n|0,13960,106)}else{a[f]=sc[c[(c[e>>2]|0)+16>>2]&127](e)|0;qc[c[(c[e>>2]|0)+20>>2]&63](b,e);ge(c[j>>2]|0)|0;i=g;return}}function ih(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0;h=i;i=i+16|0;j=h;k=h+12|0;Ze(k,d);d=c[k>>2]|0;if(!((c[1500]|0)==-1)){c[j>>2]=6e3;c[j+4>>2]=117;c[j+8>>2]=0;Ae(6e3,j,118)}l=(c[6004>>2]|0)+ -1|0;m=c[d+8>>2]|0;if(!((c[d+12>>2]|0)-m>>2>>>0>l>>>0)){n=xb(4)|0;wm(n);ec(n|0,13960,106)}d=c[m+(l<<2)>>2]|0;if((d|0)==0){n=xb(4)|0;wm(n);ec(n|0,13960,106)}yc[c[(c[d>>2]|0)+32>>2]&7](d,4544,4576|0,e)|0;e=c[k>>2]|0;if(!((c[1536]|0)==-1)){c[j>>2]=6144;c[j+4>>2]=117;c[j+8>>2]=0;Ae(6144,j,118)}j=(c[6148>>2]|0)+ -1|0;d=c[e+8>>2]|0;if(!((c[e+12>>2]|0)-d>>2>>>0>j>>>0)){o=xb(4)|0;wm(o);ec(o|0,13960,106)}e=c[d+(j<<2)>>2]|0;if((e|0)==0){o=xb(4)|0;wm(o);ec(o|0,13960,106)}else{a[f]=sc[c[(c[e>>2]|0)+12>>2]&127](e)|0;a[g]=sc[c[(c[e>>2]|0)+16>>2]&127](e)|0;qc[c[(c[e>>2]|0)+20>>2]&63](b,e);ge(c[k>>2]|0)|0;i=h;return}}function jh(b,d,e,f,g,h,j,k,l,m,n,o){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;var p=0,q=0,r=0,s=0,t=0,u=0;p=i;if(b<<24>>24==h<<24>>24){if((a[d]|0)==0){q=-1;i=p;return q|0}a[d]=0;h=c[g>>2]|0;c[g>>2]=h+1;a[h]=46;h=a[k]|0;if((h&1)==0){r=(h&255)>>>1}else{r=c[k+4>>2]|0}if((r|0)==0){q=0;i=p;return q|0}r=c[m>>2]|0;if((r-l|0)>=160){q=0;i=p;return q|0}h=c[n>>2]|0;c[m>>2]=r+4;c[r>>2]=h;q=0;i=p;return q|0}if(b<<24>>24==j<<24>>24){j=a[k]|0;if((j&1)==0){s=(j&255)>>>1}else{s=c[k+4>>2]|0}if((s|0)!=0){if((a[d]|0)==0){q=-1;i=p;return q|0}s=c[m>>2]|0;if((s-l|0)>=160){q=0;i=p;return q|0}j=c[n>>2]|0;c[m>>2]=s+4;c[s>>2]=j;c[n>>2]=0;q=0;i=p;return q|0}}j=o+32|0;s=o;while(1){h=s+1|0;if((a[s]|0)==b<<24>>24){t=s;break}if((h|0)==(j|0)){t=j;break}else{s=h}}s=t-o|0;if((s|0)>31){q=-1;i=p;return q|0}o=a[4544+s|0]|0;if((s|0)==23|(s|0)==22){a[e]=80;t=c[g>>2]|0;c[g>>2]=t+1;a[t]=o;q=0;i=p;return q|0}else if((s|0)==24|(s|0)==25){t=c[g>>2]|0;if((t|0)!=(f|0)?(a[t+ -1|0]&95|0)!=(a[e]&127|0):0){q=-1;i=p;return q|0}c[g>>2]=t+1;a[t]=o;q=0;i=p;return q|0}else{t=o&95;if((t|0)==(a[e]|0)?(a[e]=t|128,(a[d]|0)!=0):0){a[d]=0;d=a[k]|0;if((d&1)==0){u=(d&255)>>>1}else{u=c[k+4>>2]|0}if((u|0)!=0?(u=c[m>>2]|0,(u-l|0)<160):0){l=c[n>>2]|0;c[m>>2]=u+4;c[u>>2]=l}}l=c[g>>2]|0;c[g>>2]=l+1;a[l]=o;if((s|0)>21){q=0;i=p;return q|0}c[n>>2]=(c[n>>2]|0)+1;q=0;i=p;return q|0}return 0}function kh(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0;f=i;i=i+16|0;g=f;h=f+12|0;Ze(h,b);b=c[h>>2]|0;if(!((c[1498]|0)==-1)){c[g>>2]=5992;c[g+4>>2]=117;c[g+8>>2]=0;Ae(5992,g,118)}j=(c[5996>>2]|0)+ -1|0;k=c[b+8>>2]|0;if(!((c[b+12>>2]|0)-k>>2>>>0>j>>>0)){l=xb(4)|0;wm(l);ec(l|0,13960,106)}b=c[k+(j<<2)>>2]|0;if((b|0)==0){l=xb(4)|0;wm(l);ec(l|0,13960,106)}yc[c[(c[b>>2]|0)+48>>2]&7](b,4544,4570|0,d)|0;d=c[h>>2]|0;if(!((c[1538]|0)==-1)){c[g>>2]=6152;c[g+4>>2]=117;c[g+8>>2]=0;Ae(6152,g,118)}g=(c[6156>>2]|0)+ -1|0;b=c[d+8>>2]|0;if(!((c[d+12>>2]|0)-b>>2>>>0>g>>>0)){m=xb(4)|0;wm(m);ec(m|0,13960,106)}d=c[b+(g<<2)>>2]|0;if((d|0)==0){m=xb(4)|0;wm(m);ec(m|0,13960,106)}else{c[e>>2]=sc[c[(c[d>>2]|0)+16>>2]&127](d)|0;qc[c[(c[d>>2]|0)+20>>2]&63](a,d);ge(c[h>>2]|0)|0;i=f;return}}function lh(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0;g=i;i=i+16|0;h=g;j=g+12|0;Ze(j,b);b=c[j>>2]|0;if(!((c[1498]|0)==-1)){c[h>>2]=5992;c[h+4>>2]=117;c[h+8>>2]=0;Ae(5992,h,118)}k=(c[5996>>2]|0)+ -1|0;l=c[b+8>>2]|0;if(!((c[b+12>>2]|0)-l>>2>>>0>k>>>0)){m=xb(4)|0;wm(m);ec(m|0,13960,106)}b=c[l+(k<<2)>>2]|0;if((b|0)==0){m=xb(4)|0;wm(m);ec(m|0,13960,106)}yc[c[(c[b>>2]|0)+48>>2]&7](b,4544,4576|0,d)|0;d=c[j>>2]|0;if(!((c[1538]|0)==-1)){c[h>>2]=6152;c[h+4>>2]=117;c[h+8>>2]=0;Ae(6152,h,118)}h=(c[6156>>2]|0)+ -1|0;b=c[d+8>>2]|0;if(!((c[d+12>>2]|0)-b>>2>>>0>h>>>0)){n=xb(4)|0;wm(n);ec(n|0,13960,106)}d=c[b+(h<<2)>>2]|0;if((d|0)==0){n=xb(4)|0;wm(n);ec(n|0,13960,106)}else{c[e>>2]=sc[c[(c[d>>2]|0)+12>>2]&127](d)|0;c[f>>2]=sc[c[(c[d>>2]|0)+16>>2]&127](d)|0;qc[c[(c[d>>2]|0)+20>>2]&63](a,d);ge(c[j>>2]|0)|0;i=g;return}}function mh(b,d,e,f,g,h,j,k,l,m,n,o){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;var p=0,q=0,r=0,s=0,t=0,u=0;p=i;if((b|0)==(h|0)){if((a[d]|0)==0){q=-1;i=p;return q|0}a[d]=0;h=c[g>>2]|0;c[g>>2]=h+1;a[h]=46;h=a[k]|0;if((h&1)==0){r=(h&255)>>>1}else{r=c[k+4>>2]|0}if((r|0)==0){q=0;i=p;return q|0}r=c[m>>2]|0;if((r-l|0)>=160){q=0;i=p;return q|0}h=c[n>>2]|0;c[m>>2]=r+4;c[r>>2]=h;q=0;i=p;return q|0}if((b|0)==(j|0)){j=a[k]|0;if((j&1)==0){s=(j&255)>>>1}else{s=c[k+4>>2]|0}if((s|0)!=0){if((a[d]|0)==0){q=-1;i=p;return q|0}s=c[m>>2]|0;if((s-l|0)>=160){q=0;i=p;return q|0}j=c[n>>2]|0;c[m>>2]=s+4;c[s>>2]=j;c[n>>2]=0;q=0;i=p;return q|0}}j=o+128|0;s=o;while(1){h=s+4|0;if((c[s>>2]|0)==(b|0)){t=s;break}if((h|0)==(j|0)){t=j;break}else{s=h}}s=t-o|0;o=s>>2;if((s|0)>124){q=-1;i=p;return q|0}t=a[4544+o|0]|0;if((o|0)==23|(o|0)==22){a[e]=80}else if(!((o|0)==24|(o|0)==25)){o=t&95;if((o|0)==(a[e]|0)?(a[e]=o|128,(a[d]|0)!=0):0){a[d]=0;d=a[k]|0;if((d&1)==0){u=(d&255)>>>1}else{u=c[k+4>>2]|0}if((u|0)!=0?(u=c[m>>2]|0,(u-l|0)<160):0){l=c[n>>2]|0;c[m>>2]=u+4;c[u>>2]=l}}}else{l=c[g>>2]|0;if((l|0)!=(f|0)?(a[l+ -1|0]&95|0)!=(a[e]&127|0):0){q=-1;i=p;return q|0}c[g>>2]=l+1;a[l]=t;q=0;i=p;return q|0}l=c[g>>2]|0;c[g>>2]=l+1;a[l]=t;if((s|0)>84){q=0;i=p;return q|0}c[n>>2]=(c[n>>2]|0)+1;q=0;i=p;return q|0}function nh(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function oh(a){a=a|0;return}function ph(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;j=i;i=i+32|0;k=j;l=j+28|0;m=j+24|0;n=j+12|0;if((c[f+4>>2]&1|0)==0){o=c[(c[d>>2]|0)+24>>2]|0;c[l>>2]=c[e>>2];p=h&1;c[k+0>>2]=c[l+0>>2];lc[o&15](b,d,k,f,g,p);i=j;return}Ze(m,f);f=c[m>>2]|0;if(!((c[1536]|0)==-1)){c[k>>2]=6144;c[k+4>>2]=117;c[k+8>>2]=0;Ae(6144,k,118)}k=(c[6148>>2]|0)+ -1|0;p=c[f+8>>2]|0;if(!((c[f+12>>2]|0)-p>>2>>>0>k>>>0)){q=xb(4)|0;wm(q);ec(q|0,13960,106)}f=c[p+(k<<2)>>2]|0;if((f|0)==0){q=xb(4)|0;wm(q);ec(q|0,13960,106)}ge(c[m>>2]|0)|0;m=c[f>>2]|0;if(h){qc[c[m+24>>2]&63](n,f)}else{qc[c[m+28>>2]&63](n,f)}f=a[n]|0;if((f&1)==0){m=n+1|0;r=m;s=m;t=n+8|0}else{m=n+8|0;r=c[m>>2]|0;s=n+1|0;t=m}m=n+4|0;h=f;f=r;while(1){if((h&1)==0){u=s;v=(h&255)>>>1}else{u=c[t>>2]|0;v=c[m>>2]|0}if((f|0)==(u+v|0)){break}r=a[f]|0;q=c[e>>2]|0;do{if((q|0)!=0){k=q+24|0;p=c[k>>2]|0;if((p|0)!=(c[q+28>>2]|0)){c[k>>2]=p+1;a[p]=r;break}if((Bc[c[(c[q>>2]|0)+52>>2]&15](q,r&255)|0)==-1){c[e>>2]=0}}}while(0);h=a[n]|0;f=f+1|0}c[b>>2]=c[e>>2];Fe(n);i=j;return}function qh(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;d=i;i=i+64|0;j=d;k=d+20|0;l=d+28|0;m=d+40|0;n=d+12|0;o=d+4|0;p=d+8|0;q=d+16|0;a[k+0|0]=a[4792|0]|0;a[k+1|0]=a[4793|0]|0;a[k+2|0]=a[4794|0]|0;a[k+3|0]=a[4795|0]|0;a[k+4|0]=a[4796|0]|0;a[k+5|0]=a[4797|0]|0;r=k+1|0;s=f+4|0;t=c[s>>2]|0;if((t&2048|0)==0){u=r}else{a[r]=43;u=k+2|0}if((t&512|0)==0){v=u}else{a[u]=35;v=u+1|0}a[v]=108;u=v+1|0;v=t&74;do{if((v|0)==8){if((t&16384|0)==0){a[u]=120;break}else{a[u]=88;break}}else if((v|0)==64){a[u]=111}else{a[u]=100}}while(0);if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}u=c[1472]|0;c[j>>2]=h;h=rh(l,12,u,k,j)|0;k=l+h|0;u=c[s>>2]&176;do{if((u|0)==16){s=a[l]|0;if(s<<24>>24==43|s<<24>>24==45){w=l+1|0;break}if((h|0)>1&s<<24>>24==48?(s=a[l+1|0]|0,s<<24>>24==88|s<<24>>24==120):0){w=l+2|0}else{x=20}}else if((u|0)==32){w=k}else{x=20}}while(0);if((x|0)==20){w=l}Ze(p,f);sh(l,w,k,m,n,o,p);ge(c[p>>2]|0)|0;c[q>>2]=c[e>>2];e=c[n>>2]|0;n=c[o>>2]|0;c[j+0>>2]=c[q+0>>2];th(b,j,m,e,n,f,g);i=d;return}function rh(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0;g=i;i=i+16|0;h=g;c[h>>2]=f;f=Bb(d|0)|0;d=nb(a|0,b|0,e|0,h|0)|0;if((f|0)==0){i=g;return d|0}Bb(f|0)|0;i=g;return d|0}function sh(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0;k=i;i=i+32|0;l=k;m=k+12|0;n=c[j>>2]|0;if(!((c[1500]|0)==-1)){c[l>>2]=6e3;c[l+4>>2]=117;c[l+8>>2]=0;Ae(6e3,l,118)}o=(c[6004>>2]|0)+ -1|0;p=c[n+8>>2]|0;if(!((c[n+12>>2]|0)-p>>2>>>0>o>>>0)){q=xb(4)|0;wm(q);ec(q|0,13960,106)}n=c[p+(o<<2)>>2]|0;if((n|0)==0){q=xb(4)|0;wm(q);ec(q|0,13960,106)}q=c[j>>2]|0;if(!((c[1536]|0)==-1)){c[l>>2]=6144;c[l+4>>2]=117;c[l+8>>2]=0;Ae(6144,l,118)}l=(c[6148>>2]|0)+ -1|0;j=c[q+8>>2]|0;if(!((c[q+12>>2]|0)-j>>2>>>0>l>>>0)){r=xb(4)|0;wm(r);ec(r|0,13960,106)}q=c[j+(l<<2)>>2]|0;if((q|0)==0){r=xb(4)|0;wm(r);ec(r|0,13960,106)}qc[c[(c[q>>2]|0)+20>>2]&63](m,q);r=a[m]|0;if((r&1)==0){s=(r&255)>>>1}else{s=c[m+4>>2]|0}if((s|0)!=0){c[h>>2]=f;s=a[b]|0;if(s<<24>>24==43|s<<24>>24==45){r=Bc[c[(c[n>>2]|0)+28>>2]&15](n,s)|0;s=c[h>>2]|0;c[h>>2]=s+1;a[s]=r;t=b+1|0}else{t=b}if(((e-t|0)>1?(a[t]|0)==48:0)?(r=t+1|0,s=a[r]|0,s<<24>>24==88|s<<24>>24==120):0){s=Bc[c[(c[n>>2]|0)+28>>2]&15](n,48)|0;l=c[h>>2]|0;c[h>>2]=l+1;a[l]=s;s=Bc[c[(c[n>>2]|0)+28>>2]&15](n,a[r]|0)|0;r=c[h>>2]|0;c[h>>2]=r+1;a[r]=s;u=t+2|0}else{u=t}if((u|0)!=(e|0)?(t=e+ -1|0,t>>>0>u>>>0):0){s=u;r=t;do{t=a[s]|0;a[s]=a[r]|0;a[r]=t;s=s+1|0;r=r+ -1|0}while(s>>>0<r>>>0)}r=sc[c[(c[q>>2]|0)+16>>2]&127](q)|0;if(u>>>0<e>>>0){q=m+1|0;s=m+4|0;t=m+8|0;l=0;j=0;o=u;while(1){p=(a[m]&1)==0;if((a[(p?q:c[t>>2]|0)+j|0]|0)!=0?(l|0)==(a[(p?q:c[t>>2]|0)+j|0]|0):0){p=c[h>>2]|0;c[h>>2]=p+1;a[p]=r;p=a[m]|0;if((p&1)==0){v=(p&255)>>>1}else{v=c[s>>2]|0}w=0;x=(j>>>0<(v+ -1|0)>>>0)+j|0}else{w=l;x=j}p=Bc[c[(c[n>>2]|0)+28>>2]&15](n,a[o]|0)|0;y=c[h>>2]|0;c[h>>2]=y+1;a[y]=p;o=o+1|0;if(!(o>>>0<e>>>0)){break}else{l=w+1|0;j=x}}}x=f+(u-b)|0;u=c[h>>2]|0;if((x|0)!=(u|0)?(j=u+ -1|0,j>>>0>x>>>0):0){u=x;x=j;do{j=a[u]|0;a[u]=a[x]|0;a[x]=j;u=u+1|0;x=x+ -1|0}while(u>>>0<x>>>0)}}else{yc[c[(c[n>>2]|0)+32>>2]&7](n,b,e,f)|0;c[h>>2]=f+(e-b)}if((d|0)==(e|0)){z=c[h>>2]|0;c[g>>2]=z;Fe(m);i=k;return}else{z=f+(d-b)|0;c[g>>2]=z;Fe(m);i=k;return}}function th(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;k=i;i=i+16|0;l=k;m=c[d>>2]|0;if((m|0)==0){c[b>>2]=0;i=k;return}n=g;g=e;o=n-g|0;p=h+12|0;h=c[p>>2]|0;q=(h|0)>(o|0)?h-o|0:0;o=f;h=o-g|0;if((h|0)>0?(kc[c[(c[m>>2]|0)+48>>2]&31](m,e,h)|0)!=(h|0):0){c[d>>2]=0;c[b>>2]=0;i=k;return}do{if((q|0)>0){Ee(l,q,j);if((a[l]&1)==0){r=l+1|0}else{r=c[l+8>>2]|0}if((kc[c[(c[m>>2]|0)+48>>2]&31](m,r,q)|0)==(q|0)){Fe(l);break}c[d>>2]=0;c[b>>2]=0;Fe(l);i=k;return}}while(0);l=n-o|0;if((l|0)>0?(kc[c[(c[m>>2]|0)+48>>2]&31](m,f,l)|0)!=(l|0):0){c[d>>2]=0;c[b>>2]=0;i=k;return}c[p>>2]=0;c[b>>2]=m;i=k;return}function uh(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0;d=i;i=i+96|0;k=d;l=d+8|0;m=d+32|0;n=d+54|0;o=d+16|0;p=d+24|0;q=d+20|0;r=d+28|0;s=l;c[s>>2]=37;c[s+4>>2]=0;s=l+1|0;t=f+4|0;u=c[t>>2]|0;if((u&2048|0)==0){v=s}else{a[s]=43;v=l+2|0}if((u&512|0)==0){w=v}else{a[v]=35;w=v+1|0}v=w+2|0;a[w]=108;a[w+1|0]=108;w=u&74;do{if((w|0)==64){a[v]=111}else if((w|0)==8){if((u&16384|0)==0){a[v]=120;break}else{a[v]=88;break}}else{a[v]=100}}while(0);if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}v=c[1472]|0;u=k;c[u>>2]=h;c[u+4>>2]=j;j=rh(m,22,v,l,k)|0;l=m+j|0;v=c[t>>2]&176;do{if((v|0)==32){x=l}else if((v|0)==16){t=a[m]|0;if(t<<24>>24==43|t<<24>>24==45){x=m+1|0;break}if((j|0)>1&t<<24>>24==48?(t=a[m+1|0]|0,t<<24>>24==88|t<<24>>24==120):0){x=m+2|0}else{y=20}}else{y=20}}while(0);if((y|0)==20){x=m}Ze(q,f);sh(m,x,l,n,o,p,q);ge(c[q>>2]|0)|0;c[r>>2]=c[e>>2];e=c[o>>2]|0;o=c[p>>2]|0;c[k+0>>2]=c[r+0>>2];th(b,k,n,e,o,f,g);i=d;return}function vh(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;d=i;i=i+64|0;j=d;k=d+20|0;l=d+28|0;m=d+40|0;n=d+12|0;o=d+4|0;p=d+8|0;q=d+16|0;a[k+0|0]=a[4792|0]|0;a[k+1|0]=a[4793|0]|0;a[k+2|0]=a[4794|0]|0;a[k+3|0]=a[4795|0]|0;a[k+4|0]=a[4796|0]|0;a[k+5|0]=a[4797|0]|0;r=k+1|0;s=f+4|0;t=c[s>>2]|0;if((t&2048|0)==0){u=r}else{a[r]=43;u=k+2|0}if((t&512|0)==0){v=u}else{a[u]=35;v=u+1|0}a[v]=108;u=v+1|0;v=t&74;do{if((v|0)==8){if((t&16384|0)==0){a[u]=120;break}else{a[u]=88;break}}else if((v|0)==64){a[u]=111}else{a[u]=117}}while(0);if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}u=c[1472]|0;c[j>>2]=h;h=rh(l,12,u,k,j)|0;k=l+h|0;u=c[s>>2]&176;do{if((u|0)==16){s=a[l]|0;if(s<<24>>24==43|s<<24>>24==45){w=l+1|0;break}if((h|0)>1&s<<24>>24==48?(s=a[l+1|0]|0,s<<24>>24==88|s<<24>>24==120):0){w=l+2|0}else{x=20}}else if((u|0)==32){w=k}else{x=20}}while(0);if((x|0)==20){w=l}Ze(p,f);sh(l,w,k,m,n,o,p);ge(c[p>>2]|0)|0;c[q>>2]=c[e>>2];e=c[n>>2]|0;n=c[o>>2]|0;c[j+0>>2]=c[q+0>>2];th(b,j,m,e,n,f,g);i=d;return}function wh(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0;d=i;i=i+112|0;k=d;l=d+8|0;m=d+32|0;n=d+55|0;o=d+16|0;p=d+24|0;q=d+20|0;r=d+28|0;s=l;c[s>>2]=37;c[s+4>>2]=0;s=l+1|0;t=f+4|0;u=c[t>>2]|0;if((u&2048|0)==0){v=s}else{a[s]=43;v=l+2|0}if((u&512|0)==0){w=v}else{a[v]=35;w=v+1|0}v=w+2|0;a[w]=108;a[w+1|0]=108;w=u&74;do{if((w|0)==8){if((u&16384|0)==0){a[v]=120;break}else{a[v]=88;break}}else if((w|0)==64){a[v]=111}else{a[v]=117}}while(0);if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}v=c[1472]|0;w=k;c[w>>2]=h;c[w+4>>2]=j;j=rh(m,23,v,l,k)|0;l=m+j|0;v=c[t>>2]&176;do{if((v|0)==16){t=a[m]|0;if(t<<24>>24==43|t<<24>>24==45){x=m+1|0;break}if((j|0)>1&t<<24>>24==48?(t=a[m+1|0]|0,t<<24>>24==88|t<<24>>24==120):0){x=m+2|0}else{y=20}}else if((v|0)==32){x=l}else{y=20}}while(0);if((y|0)==20){x=m}Ze(q,f);sh(m,x,l,n,o,p,q);ge(c[q>>2]|0)|0;c[r>>2]=c[e>>2];e=c[o>>2]|0;o=c[p>>2]|0;c[k+0>>2]=c[r+0>>2];th(b,k,n,e,o,f,g);i=d;return}function xh(b,d,e,f,g,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;j=+j;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0;d=i;i=i+144|0;l=d+8|0;m=d;n=d+44|0;o=d+36|0;p=d+74|0;q=d+20|0;r=d+32|0;s=d+28|0;t=d+24|0;u=d+40|0;v=m;c[v>>2]=37;c[v+4>>2]=0;v=m+1|0;w=f+4|0;x=c[w>>2]|0;if((x&2048|0)==0){y=v}else{a[v]=43;y=m+2|0}if((x&1024|0)==0){z=y}else{a[y]=35;z=y+1|0}y=x&260;v=x>>>14;do{if((y|0)==260){if((v&1|0)==0){a[z]=97;A=0;break}else{a[z]=65;A=0;break}}else{a[z]=46;x=z+2|0;a[z+1|0]=42;if((y|0)==256){if((v&1|0)==0){a[x]=101;A=1;break}else{a[x]=69;A=1;break}}else if((y|0)==4){if((v&1|0)==0){a[x]=102;A=1;break}else{a[x]=70;A=1;break}}else{if((v&1|0)==0){a[x]=103;A=1;break}else{a[x]=71;A=1;break}}}}while(0);c[o>>2]=n;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}v=c[1472]|0;if(A){c[l>>2]=c[f+8>>2];y=l+4|0;h[k>>3]=j;c[y>>2]=c[k>>2];c[y+4>>2]=c[k+4>>2];B=rh(n,30,v,m,l)|0}else{h[k>>3]=j;c[l>>2]=c[k>>2];c[l+4>>2]=c[k+4>>2];B=rh(n,30,v,m,l)|0}if((B|0)>29){v=(a[5896]|0)==0;if(A){if(v?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}A=c[1472]|0;c[l>>2]=c[f+8>>2];y=l+4|0;h[k>>3]=j;c[y>>2]=c[k>>2];c[y+4>>2]=c[k+4>>2];C=yh(o,A,m,l)|0}else{if(v?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}v=c[1472]|0;c[l>>2]=c[f+8>>2];A=l+4|0;h[k>>3]=j;c[A>>2]=c[k>>2];c[A+4>>2]=c[k+4>>2];C=yh(o,v,m,l)|0}m=c[o>>2]|0;if((m|0)==0){bn()}else{D=m;E=m;F=C}}else{D=c[o>>2]|0;E=0;F=B}B=D+F|0;o=c[w>>2]&176;do{if((o|0)==16){w=a[D]|0;if(w<<24>>24==43|w<<24>>24==45){G=D+1|0;break}if((F|0)>1&w<<24>>24==48?(w=a[D+1|0]|0,w<<24>>24==88|w<<24>>24==120):0){G=D+2|0}else{H=44}}else if((o|0)==32){G=B}else{H=44}}while(0);if((H|0)==44){G=D}if((D|0)!=(n|0)){H=Rm(F<<1)|0;if((H|0)==0){bn()}else{I=D;J=H;K=H}}else{I=n;J=0;K=p}Ze(s,f);zh(I,G,B,K,q,r,s);ge(c[s>>2]|0)|0;c[u>>2]=c[e>>2];s=c[q>>2]|0;q=c[r>>2]|0;c[l+0>>2]=c[u+0>>2];th(t,l,K,s,q,f,g);g=c[t>>2]|0;c[e>>2]=g;c[b>>2]=g;if((J|0)!=0){Sm(J)}if((E|0)==0){i=d;return}Sm(E);i=d;return}function yh(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0;f=i;i=i+16|0;g=f;c[g>>2]=e;e=Bb(b|0)|0;b=mb(a|0,d|0,g|0)|0;if((e|0)==0){i=f;return b|0}Bb(e|0)|0;i=f;return b|0}function zh(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;k=i;i=i+32|0;l=k;m=k+12|0;n=c[j>>2]|0;if(!((c[1500]|0)==-1)){c[l>>2]=6e3;c[l+4>>2]=117;c[l+8>>2]=0;Ae(6e3,l,118)}o=(c[6004>>2]|0)+ -1|0;p=c[n+8>>2]|0;if(!((c[n+12>>2]|0)-p>>2>>>0>o>>>0)){q=xb(4)|0;wm(q);ec(q|0,13960,106)}n=c[p+(o<<2)>>2]|0;if((n|0)==0){q=xb(4)|0;wm(q);ec(q|0,13960,106)}q=c[j>>2]|0;if(!((c[1536]|0)==-1)){c[l>>2]=6144;c[l+4>>2]=117;c[l+8>>2]=0;Ae(6144,l,118)}l=(c[6148>>2]|0)+ -1|0;j=c[q+8>>2]|0;if(!((c[q+12>>2]|0)-j>>2>>>0>l>>>0)){r=xb(4)|0;wm(r);ec(r|0,13960,106)}q=c[j+(l<<2)>>2]|0;if((q|0)==0){r=xb(4)|0;wm(r);ec(r|0,13960,106)}qc[c[(c[q>>2]|0)+20>>2]&63](m,q);c[h>>2]=f;r=a[b]|0;if(r<<24>>24==43|r<<24>>24==45){l=Bc[c[(c[n>>2]|0)+28>>2]&15](n,r)|0;r=c[h>>2]|0;c[h>>2]=r+1;a[r]=l;s=b+1|0}else{s=b}l=e;a:do{if(((l-s|0)>1?(a[s]|0)==48:0)?(r=s+1|0,j=a[r]|0,j<<24>>24==88|j<<24>>24==120):0){j=Bc[c[(c[n>>2]|0)+28>>2]&15](n,48)|0;o=c[h>>2]|0;c[h>>2]=o+1;a[o]=j;j=s+2|0;o=Bc[c[(c[n>>2]|0)+28>>2]&15](n,a[r]|0)|0;r=c[h>>2]|0;c[h>>2]=r+1;a[r]=o;if(j>>>0<e>>>0){o=j;while(1){r=a[o]|0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}p=o+1|0;if((cb(r<<24>>24|0,c[1472]|0)|0)==0){t=j;u=o;break a}if(p>>>0<e>>>0){o=p}else{t=j;u=p;break}}}else{t=j;u=j}}else{v=14}}while(0);b:do{if((v|0)==14){if(s>>>0<e>>>0){o=s;while(1){p=a[o]|0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}r=o+1|0;if((ib(p<<24>>24|0,c[1472]|0)|0)==0){t=s;u=o;break b}if(r>>>0<e>>>0){o=r}else{t=s;u=r;break}}}else{t=s;u=s}}}while(0);s=a[m]|0;if((s&1)==0){w=(s&255)>>>1}else{w=c[m+4>>2]|0}if((w|0)!=0){if((t|0)!=(u|0)?(w=u+ -1|0,w>>>0>t>>>0):0){s=t;v=w;do{w=a[s]|0;a[s]=a[v]|0;a[v]=w;s=s+1|0;v=v+ -1|0}while(s>>>0<v>>>0)}v=sc[c[(c[q>>2]|0)+16>>2]&127](q)|0;if(t>>>0<u>>>0){s=m+1|0;w=m+4|0;o=m+8|0;j=0;r=0;p=t;while(1){x=(a[m]&1)==0;if((a[(x?s:c[o>>2]|0)+r|0]|0)>0?(j|0)==(a[(x?s:c[o>>2]|0)+r|0]|0):0){x=c[h>>2]|0;c[h>>2]=x+1;a[x]=v;x=a[m]|0;if((x&1)==0){y=(x&255)>>>1}else{y=c[w>>2]|0}z=0;A=(r>>>0<(y+ -1|0)>>>0)+r|0}else{z=j;A=r}x=Bc[c[(c[n>>2]|0)+28>>2]&15](n,a[p]|0)|0;B=c[h>>2]|0;c[h>>2]=B+1;a[B]=x;p=p+1|0;if(!(p>>>0<u>>>0)){break}else{j=z+1|0;r=A}}}A=f+(t-b)|0;r=c[h>>2]|0;if((A|0)!=(r|0)?(z=r+ -1|0,z>>>0>A>>>0):0){r=A;A=z;do{z=a[r]|0;a[r]=a[A]|0;a[A]=z;r=r+1|0;A=A+ -1|0}while(r>>>0<A>>>0)}}else{yc[c[(c[n>>2]|0)+32>>2]&7](n,t,u,c[h>>2]|0)|0;c[h>>2]=(c[h>>2]|0)+(u-t)}c:do{if(u>>>0<e>>>0){t=u;while(1){A=a[t]|0;if(A<<24>>24==46){break}r=Bc[c[(c[n>>2]|0)+28>>2]&15](n,A)|0;A=c[h>>2]|0;c[h>>2]=A+1;a[A]=r;r=t+1|0;if(r>>>0<e>>>0){t=r}else{C=r;break c}}r=sc[c[(c[q>>2]|0)+12>>2]&127](q)|0;A=c[h>>2]|0;c[h>>2]=A+1;a[A]=r;C=t+1|0}else{C=u}}while(0);yc[c[(c[n>>2]|0)+32>>2]&7](n,C,e,c[h>>2]|0)|0;n=(c[h>>2]|0)+(l-C)|0;c[h>>2]=n;if((d|0)==(e|0)){D=n;c[g>>2]=D;Fe(m);i=k;return}D=f+(d-b)|0;c[g>>2]=D;Fe(m);i=k;return}function Ah(b,d,e,f,g,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;j=+j;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0;d=i;i=i+144|0;l=d+8|0;m=d;n=d+44|0;o=d+36|0;p=d+74|0;q=d+20|0;r=d+32|0;s=d+28|0;t=d+24|0;u=d+40|0;v=m;c[v>>2]=37;c[v+4>>2]=0;v=m+1|0;w=f+4|0;x=c[w>>2]|0;if((x&2048|0)==0){y=v}else{a[v]=43;y=m+2|0}if((x&1024|0)==0){z=y}else{a[y]=35;z=y+1|0}y=x&260;v=x>>>14;do{if((y|0)==260){a[z]=76;x=z+1|0;if((v&1|0)==0){a[x]=97;A=0;break}else{a[x]=65;A=0;break}}else{a[z]=46;a[z+1|0]=42;a[z+2|0]=76;x=z+3|0;if((y|0)==256){if((v&1|0)==0){a[x]=101;A=1;break}else{a[x]=69;A=1;break}}else if((y|0)==4){if((v&1|0)==0){a[x]=102;A=1;break}else{a[x]=70;A=1;break}}else{if((v&1|0)==0){a[x]=103;A=1;break}else{a[x]=71;A=1;break}}}}while(0);c[o>>2]=n;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}v=c[1472]|0;if(A){c[l>>2]=c[f+8>>2];y=l+4|0;h[k>>3]=j;c[y>>2]=c[k>>2];c[y+4>>2]=c[k+4>>2];B=rh(n,30,v,m,l)|0}else{h[k>>3]=j;c[l>>2]=c[k>>2];c[l+4>>2]=c[k+4>>2];B=rh(n,30,v,m,l)|0}if((B|0)>29){v=(a[5896]|0)==0;if(A){if(v?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}A=c[1472]|0;c[l>>2]=c[f+8>>2];y=l+4|0;h[k>>3]=j;c[y>>2]=c[k>>2];c[y+4>>2]=c[k+4>>2];C=yh(o,A,m,l)|0}else{if(v?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}v=c[1472]|0;h[k>>3]=j;c[l>>2]=c[k>>2];c[l+4>>2]=c[k+4>>2];C=yh(o,v,m,l)|0}m=c[o>>2]|0;if((m|0)==0){bn()}else{D=m;E=m;F=C}}else{D=c[o>>2]|0;E=0;F=B}B=D+F|0;o=c[w>>2]&176;do{if((o|0)==32){G=B}else if((o|0)==16){w=a[D]|0;if(w<<24>>24==43|w<<24>>24==45){G=D+1|0;break}if((F|0)>1&w<<24>>24==48?(w=a[D+1|0]|0,w<<24>>24==88|w<<24>>24==120):0){G=D+2|0}else{H=44}}else{H=44}}while(0);if((H|0)==44){G=D}if((D|0)!=(n|0)){H=Rm(F<<1)|0;if((H|0)==0){bn()}else{I=D;J=H;K=H}}else{I=n;J=0;K=p}Ze(s,f);zh(I,G,B,K,q,r,s);ge(c[s>>2]|0)|0;c[u>>2]=c[e>>2];s=c[q>>2]|0;q=c[r>>2]|0;c[l+0>>2]=c[u+0>>2];th(t,l,K,s,q,f,g);g=c[t>>2]|0;c[e>>2]=g;c[b>>2]=g;if((J|0)!=0){Sm(J)}if((E|0)==0){i=d;return}Sm(E);i=d;return}function Bh(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;d=i;i=i+96|0;j=d;k=d+80|0;l=d+60|0;m=d+20|0;n=d+16|0;o=d+12|0;a[k+0|0]=a[4800|0]|0;a[k+1|0]=a[4801|0]|0;a[k+2|0]=a[4802|0]|0;a[k+3|0]=a[4803|0]|0;a[k+4|0]=a[4804|0]|0;a[k+5|0]=a[4805|0]|0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}p=c[1472]|0;c[j>>2]=h;h=rh(l,20,p,k,j)|0;k=l+h|0;p=c[f+4>>2]&176;do{if((p|0)==32){q=k}else if((p|0)==16){r=a[l]|0;if(r<<24>>24==43|r<<24>>24==45){q=l+1|0;break}if((h|0)>1&r<<24>>24==48?(r=a[l+1|0]|0,r<<24>>24==88|r<<24>>24==120):0){q=l+2|0}else{s=10}}else{s=10}}while(0);if((s|0)==10){q=l}Ze(n,f);s=c[n>>2]|0;if(!((c[1500]|0)==-1)){c[j>>2]=6e3;c[j+4>>2]=117;c[j+8>>2]=0;Ae(6e3,j,118)}p=(c[6004>>2]|0)+ -1|0;r=c[s+8>>2]|0;if(!((c[s+12>>2]|0)-r>>2>>>0>p>>>0)){t=xb(4)|0;wm(t);ec(t|0,13960,106)}s=c[r+(p<<2)>>2]|0;if((s|0)==0){t=xb(4)|0;wm(t);ec(t|0,13960,106)}ge(c[n>>2]|0)|0;yc[c[(c[s>>2]|0)+32>>2]&7](s,l,k,m)|0;s=m+h|0;if((q|0)==(k|0)){u=s;v=c[e>>2]|0;c[o>>2]=v;c[j+0>>2]=c[o+0>>2];th(b,j,m,u,s,f,g);i=d;return}u=m+(q-l)|0;v=c[e>>2]|0;c[o>>2]=v;c[j+0>>2]=c[o+0>>2];th(b,j,m,u,s,f,g);i=d;return}function Ch(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function Dh(a){a=a|0;return}function Eh(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;j=i;i=i+32|0;k=j;l=j+28|0;m=j+24|0;n=j+12|0;if((c[f+4>>2]&1|0)==0){o=c[(c[d>>2]|0)+24>>2]|0;c[l>>2]=c[e>>2];p=h&1;c[k+0>>2]=c[l+0>>2];lc[o&15](b,d,k,f,g,p);i=j;return}Ze(m,f);f=c[m>>2]|0;if(!((c[1538]|0)==-1)){c[k>>2]=6152;c[k+4>>2]=117;c[k+8>>2]=0;Ae(6152,k,118)}k=(c[6156>>2]|0)+ -1|0;p=c[f+8>>2]|0;if(!((c[f+12>>2]|0)-p>>2>>>0>k>>>0)){q=xb(4)|0;wm(q);ec(q|0,13960,106)}f=c[p+(k<<2)>>2]|0;if((f|0)==0){q=xb(4)|0;wm(q);ec(q|0,13960,106)}ge(c[m>>2]|0)|0;m=c[f>>2]|0;if(h){qc[c[m+24>>2]&63](n,f)}else{qc[c[m+28>>2]&63](n,f)}f=a[n]|0;if((f&1)==0){m=n+4|0;r=m;s=n+8|0;t=m}else{m=n+8|0;r=c[m>>2]|0;s=m;t=n+4|0}m=f;f=r;while(1){if((m&1)==0){u=t;v=(m&255)>>>1}else{u=c[s>>2]|0;v=c[t>>2]|0}if((f|0)==(u+(v<<2)|0)){break}r=c[f>>2]|0;h=c[e>>2]|0;if((h|0)!=0){q=h+24|0;k=c[q>>2]|0;if((k|0)==(c[h+28>>2]|0)){w=Bc[c[(c[h>>2]|0)+52>>2]&15](h,r)|0}else{c[q>>2]=k+4;c[k>>2]=r;w=r}if((w|0)==-1){c[e>>2]=0}}m=a[n]|0;f=f+4|0}c[b>>2]=c[e>>2];Qe(n);i=j;return}function Fh(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;d=i;i=i+128|0;j=d;k=d+104|0;l=d+112|0;m=d+8|0;n=d+4|0;o=d+96|0;p=d+92|0;q=d+100|0;a[k+0|0]=a[4792|0]|0;a[k+1|0]=a[4793|0]|0;a[k+2|0]=a[4794|0]|0;a[k+3|0]=a[4795|0]|0;a[k+4|0]=a[4796|0]|0;a[k+5|0]=a[4797|0]|0;r=k+1|0;s=f+4|0;t=c[s>>2]|0;if((t&2048|0)==0){u=r}else{a[r]=43;u=k+2|0}if((t&512|0)==0){v=u}else{a[u]=35;v=u+1|0}a[v]=108;u=v+1|0;v=t&74;do{if((v|0)==64){a[u]=111}else if((v|0)==8){if((t&16384|0)==0){a[u]=120;break}else{a[u]=88;break}}else{a[u]=100}}while(0);if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}u=c[1472]|0;c[j>>2]=h;h=rh(l,12,u,k,j)|0;k=l+h|0;u=c[s>>2]&176;do{if((u|0)==16){s=a[l]|0;if(s<<24>>24==43|s<<24>>24==45){w=l+1|0;break}if((h|0)>1&s<<24>>24==48?(s=a[l+1|0]|0,s<<24>>24==88|s<<24>>24==120):0){w=l+2|0}else{x=20}}else if((u|0)==32){w=k}else{x=20}}while(0);if((x|0)==20){w=l}Ze(p,f);Gh(l,w,k,m,n,o,p);ge(c[p>>2]|0)|0;c[q>>2]=c[e>>2];e=c[n>>2]|0;n=c[o>>2]|0;c[j+0>>2]=c[q+0>>2];Hh(b,j,m,e,n,f,g);i=d;return}function Gh(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0;k=i;i=i+32|0;l=k;m=k+12|0;n=c[j>>2]|0;if(!((c[1498]|0)==-1)){c[l>>2]=5992;c[l+4>>2]=117;c[l+8>>2]=0;Ae(5992,l,118)}o=(c[5996>>2]|0)+ -1|0;p=c[n+8>>2]|0;if(!((c[n+12>>2]|0)-p>>2>>>0>o>>>0)){q=xb(4)|0;wm(q);ec(q|0,13960,106)}n=c[p+(o<<2)>>2]|0;if((n|0)==0){q=xb(4)|0;wm(q);ec(q|0,13960,106)}q=c[j>>2]|0;if(!((c[1538]|0)==-1)){c[l>>2]=6152;c[l+4>>2]=117;c[l+8>>2]=0;Ae(6152,l,118)}l=(c[6156>>2]|0)+ -1|0;j=c[q+8>>2]|0;if(!((c[q+12>>2]|0)-j>>2>>>0>l>>>0)){r=xb(4)|0;wm(r);ec(r|0,13960,106)}q=c[j+(l<<2)>>2]|0;if((q|0)==0){r=xb(4)|0;wm(r);ec(r|0,13960,106)}qc[c[(c[q>>2]|0)+20>>2]&63](m,q);r=a[m]|0;if((r&1)==0){s=(r&255)>>>1}else{s=c[m+4>>2]|0}if((s|0)!=0){c[h>>2]=f;s=a[b]|0;if(s<<24>>24==43|s<<24>>24==45){r=Bc[c[(c[n>>2]|0)+44>>2]&15](n,s)|0;s=c[h>>2]|0;c[h>>2]=s+4;c[s>>2]=r;t=b+1|0}else{t=b}if(((e-t|0)>1?(a[t]|0)==48:0)?(r=t+1|0,s=a[r]|0,s<<24>>24==88|s<<24>>24==120):0){s=Bc[c[(c[n>>2]|0)+44>>2]&15](n,48)|0;l=c[h>>2]|0;c[h>>2]=l+4;c[l>>2]=s;s=Bc[c[(c[n>>2]|0)+44>>2]&15](n,a[r]|0)|0;r=c[h>>2]|0;c[h>>2]=r+4;c[r>>2]=s;u=t+2|0}else{u=t}if((u|0)!=(e|0)?(t=e+ -1|0,t>>>0>u>>>0):0){s=u;r=t;do{t=a[s]|0;a[s]=a[r]|0;a[r]=t;s=s+1|0;r=r+ -1|0}while(s>>>0<r>>>0)}r=sc[c[(c[q>>2]|0)+16>>2]&127](q)|0;if(u>>>0<e>>>0){q=m+1|0;s=m+4|0;t=m+8|0;l=0;j=0;o=u;while(1){p=(a[m]&1)==0;if((a[(p?q:c[t>>2]|0)+j|0]|0)!=0?(l|0)==(a[(p?q:c[t>>2]|0)+j|0]|0):0){p=c[h>>2]|0;c[h>>2]=p+4;c[p>>2]=r;p=a[m]|0;if((p&1)==0){v=(p&255)>>>1}else{v=c[s>>2]|0}w=0;x=(j>>>0<(v+ -1|0)>>>0)+j|0}else{w=l;x=j}p=Bc[c[(c[n>>2]|0)+44>>2]&15](n,a[o]|0)|0;y=c[h>>2]|0;z=y+4|0;c[h>>2]=z;c[y>>2]=p;p=o+1|0;if(p>>>0<e>>>0){l=w+1|0;j=x;o=p}else{A=z;break}}}else{A=c[h>>2]|0}o=f+(u-b<<2)|0;if((o|0)!=(A|0)?(u=A+ -4|0,u>>>0>o>>>0):0){x=o;o=u;while(1){u=c[x>>2]|0;c[x>>2]=c[o>>2];c[o>>2]=u;u=x+4|0;j=o+ -4|0;if(u>>>0<j>>>0){x=u;o=j}else{B=A;break}}}else{B=A}}else{yc[c[(c[n>>2]|0)+48>>2]&7](n,b,e,f)|0;n=f+(e-b<<2)|0;c[h>>2]=n;B=n}if((d|0)==(e|0)){C=B;c[g>>2]=C;Fe(m);i=k;return}C=f+(d-b<<2)|0;c[g>>2]=C;Fe(m);i=k;return}function Hh(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;k=i;i=i+16|0;l=k;m=c[d>>2]|0;if((m|0)==0){c[b>>2]=0;i=k;return}n=g;g=e;o=n-g>>2;p=h+12|0;h=c[p>>2]|0;q=(h|0)>(o|0)?h-o|0:0;o=f;h=o-g|0;g=h>>2;if((h|0)>0?(kc[c[(c[m>>2]|0)+48>>2]&31](m,e,g)|0)!=(g|0):0){c[d>>2]=0;c[b>>2]=0;i=k;return}do{if((q|0)>0){Pe(l,q,j);if((a[l]&1)==0){r=l+4|0}else{r=c[l+8>>2]|0}if((kc[c[(c[m>>2]|0)+48>>2]&31](m,r,q)|0)==(q|0)){Qe(l);break}c[d>>2]=0;c[b>>2]=0;Qe(l);i=k;return}}while(0);l=n-o|0;o=l>>2;if((l|0)>0?(kc[c[(c[m>>2]|0)+48>>2]&31](m,f,o)|0)!=(o|0):0){c[d>>2]=0;c[b>>2]=0;i=k;return}c[p>>2]=0;c[b>>2]=m;i=k;return}function Ih(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0;d=i;i=i+224|0;k=d;l=d+8|0;m=d+196|0;n=d+24|0;o=d+20|0;p=d+16|0;q=d+188|0;r=d+192|0;s=l;c[s>>2]=37;c[s+4>>2]=0;s=l+1|0;t=f+4|0;u=c[t>>2]|0;if((u&2048|0)==0){v=s}else{a[s]=43;v=l+2|0}if((u&512|0)==0){w=v}else{a[v]=35;w=v+1|0}v=w+2|0;a[w]=108;a[w+1|0]=108;w=u&74;do{if((w|0)==8){if((u&16384|0)==0){a[v]=120;break}else{a[v]=88;break}}else if((w|0)==64){a[v]=111}else{a[v]=100}}while(0);if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}v=c[1472]|0;w=k;c[w>>2]=h;c[w+4>>2]=j;j=rh(m,22,v,l,k)|0;l=m+j|0;v=c[t>>2]&176;do{if((v|0)==32){x=l}else if((v|0)==16){t=a[m]|0;if(t<<24>>24==43|t<<24>>24==45){x=m+1|0;break}if((j|0)>1&t<<24>>24==48?(t=a[m+1|0]|0,t<<24>>24==88|t<<24>>24==120):0){x=m+2|0}else{y=20}}else{y=20}}while(0);if((y|0)==20){x=m}Ze(q,f);Gh(m,x,l,n,o,p,q);ge(c[q>>2]|0)|0;c[r>>2]=c[e>>2];e=c[o>>2]|0;o=c[p>>2]|0;c[k+0>>2]=c[r+0>>2];Hh(b,k,n,e,o,f,g);i=d;return}function Jh(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;d=i;i=i+128|0;j=d;k=d+104|0;l=d+112|0;m=d+8|0;n=d+4|0;o=d+96|0;p=d+92|0;q=d+100|0;a[k+0|0]=a[4792|0]|0;a[k+1|0]=a[4793|0]|0;a[k+2|0]=a[4794|0]|0;a[k+3|0]=a[4795|0]|0;a[k+4|0]=a[4796|0]|0;a[k+5|0]=a[4797|0]|0;r=k+1|0;s=f+4|0;t=c[s>>2]|0;if((t&2048|0)==0){u=r}else{a[r]=43;u=k+2|0}if((t&512|0)==0){v=u}else{a[u]=35;v=u+1|0}a[v]=108;u=v+1|0;v=t&74;do{if((v|0)==8){if((t&16384|0)==0){a[u]=120;break}else{a[u]=88;break}}else if((v|0)==64){a[u]=111}else{a[u]=117}}while(0);if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}u=c[1472]|0;c[j>>2]=h;h=rh(l,12,u,k,j)|0;k=l+h|0;u=c[s>>2]&176;do{if((u|0)==16){s=a[l]|0;if(s<<24>>24==43|s<<24>>24==45){w=l+1|0;break}if((h|0)>1&s<<24>>24==48?(s=a[l+1|0]|0,s<<24>>24==88|s<<24>>24==120):0){w=l+2|0}else{x=20}}else if((u|0)==32){w=k}else{x=20}}while(0);if((x|0)==20){w=l}Ze(p,f);Gh(l,w,k,m,n,o,p);ge(c[p>>2]|0)|0;c[q>>2]=c[e>>2];e=c[n>>2]|0;n=c[o>>2]|0;c[j+0>>2]=c[q+0>>2];Hh(b,j,m,e,n,f,g);i=d;return}function Kh(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0;d=i;i=i+240|0;k=d;l=d+8|0;m=d+204|0;n=d+24|0;o=d+20|0;p=d+16|0;q=d+196|0;r=d+200|0;s=l;c[s>>2]=37;c[s+4>>2]=0;s=l+1|0;t=f+4|0;u=c[t>>2]|0;if((u&2048|0)==0){v=s}else{a[s]=43;v=l+2|0}if((u&512|0)==0){w=v}else{a[v]=35;w=v+1|0}v=w+2|0;a[w]=108;a[w+1|0]=108;w=u&74;do{if((w|0)==8){if((u&16384|0)==0){a[v]=120;break}else{a[v]=88;break}}else if((w|0)==64){a[v]=111}else{a[v]=117}}while(0);if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}v=c[1472]|0;w=k;c[w>>2]=h;c[w+4>>2]=j;j=rh(m,23,v,l,k)|0;l=m+j|0;v=c[t>>2]&176;do{if((v|0)==16){t=a[m]|0;if(t<<24>>24==43|t<<24>>24==45){x=m+1|0;break}if((j|0)>1&t<<24>>24==48?(t=a[m+1|0]|0,t<<24>>24==88|t<<24>>24==120):0){x=m+2|0}else{y=20}}else if((v|0)==32){x=l}else{y=20}}while(0);if((y|0)==20){x=m}Ze(q,f);Gh(m,x,l,n,o,p,q);ge(c[q>>2]|0)|0;c[r>>2]=c[e>>2];e=c[o>>2]|0;o=c[p>>2]|0;c[k+0>>2]=c[r+0>>2];Hh(b,k,n,e,o,f,g);i=d;return}function Lh(b,d,e,f,g,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;j=+j;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0;d=i;i=i+320|0;l=d;m=d+16|0;n=d+276|0;o=d+36|0;p=d+44|0;q=d+24|0;r=d+32|0;s=d+40|0;t=d+28|0;u=d+272|0;v=m;c[v>>2]=37;c[v+4>>2]=0;v=m+1|0;w=f+4|0;x=c[w>>2]|0;if((x&2048|0)==0){y=v}else{a[v]=43;y=m+2|0}if((x&1024|0)==0){z=y}else{a[y]=35;z=y+1|0}y=x&260;v=x>>>14;do{if((y|0)==260){if((v&1|0)==0){a[z]=97;A=0;break}else{a[z]=65;A=0;break}}else{a[z]=46;x=z+2|0;a[z+1|0]=42;if((y|0)==256){if((v&1|0)==0){a[x]=101;A=1;break}else{a[x]=69;A=1;break}}else if((y|0)==4){if((v&1|0)==0){a[x]=102;A=1;break}else{a[x]=70;A=1;break}}else{if((v&1|0)==0){a[x]=103;A=1;break}else{a[x]=71;A=1;break}}}}while(0);c[o>>2]=n;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}v=c[1472]|0;if(A){c[l>>2]=c[f+8>>2];y=l+4|0;h[k>>3]=j;c[y>>2]=c[k>>2];c[y+4>>2]=c[k+4>>2];B=rh(n,30,v,m,l)|0}else{h[k>>3]=j;c[l>>2]=c[k>>2];c[l+4>>2]=c[k+4>>2];B=rh(n,30,v,m,l)|0}if((B|0)>29){v=(a[5896]|0)==0;if(A){if(v?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}A=c[1472]|0;c[l>>2]=c[f+8>>2];y=l+4|0;h[k>>3]=j;c[y>>2]=c[k>>2];c[y+4>>2]=c[k+4>>2];C=yh(o,A,m,l)|0}else{if(v?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}v=c[1472]|0;c[l>>2]=c[f+8>>2];A=l+4|0;h[k>>3]=j;c[A>>2]=c[k>>2];c[A+4>>2]=c[k+4>>2];C=yh(o,v,m,l)|0}m=c[o>>2]|0;if((m|0)==0){bn()}else{D=m;E=m;F=C}}else{D=c[o>>2]|0;E=0;F=B}B=D+F|0;o=c[w>>2]&176;do{if((o|0)==16){w=a[D]|0;if(w<<24>>24==43|w<<24>>24==45){G=D+1|0;break}if((F|0)>1&w<<24>>24==48?(w=a[D+1|0]|0,w<<24>>24==88|w<<24>>24==120):0){G=D+2|0}else{H=44}}else if((o|0)==32){G=B}else{H=44}}while(0);if((H|0)==44){G=D}if((D|0)!=(n|0)){H=Rm(F<<3)|0;if((H|0)==0){bn()}else{I=D;J=H;K=H}}else{I=n;J=0;K=p}Ze(s,f);Mh(I,G,B,K,q,r,s);ge(c[s>>2]|0)|0;c[u>>2]=c[e>>2];s=c[q>>2]|0;q=c[r>>2]|0;c[l+0>>2]=c[u+0>>2];Hh(t,l,K,s,q,f,g);g=c[t>>2]|0;c[e>>2]=g;c[b>>2]=g;if((J|0)!=0){Sm(J)}if((E|0)==0){i=d;return}Sm(E);i=d;return}function Mh(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0;k=i;i=i+32|0;l=k;m=k+12|0;n=c[j>>2]|0;if(!((c[1498]|0)==-1)){c[l>>2]=5992;c[l+4>>2]=117;c[l+8>>2]=0;Ae(5992,l,118)}o=(c[5996>>2]|0)+ -1|0;p=c[n+8>>2]|0;if(!((c[n+12>>2]|0)-p>>2>>>0>o>>>0)){q=xb(4)|0;wm(q);ec(q|0,13960,106)}n=c[p+(o<<2)>>2]|0;if((n|0)==0){q=xb(4)|0;wm(q);ec(q|0,13960,106)}q=c[j>>2]|0;if(!((c[1538]|0)==-1)){c[l>>2]=6152;c[l+4>>2]=117;c[l+8>>2]=0;Ae(6152,l,118)}l=(c[6156>>2]|0)+ -1|0;j=c[q+8>>2]|0;if(!((c[q+12>>2]|0)-j>>2>>>0>l>>>0)){r=xb(4)|0;wm(r);ec(r|0,13960,106)}q=c[j+(l<<2)>>2]|0;if((q|0)==0){r=xb(4)|0;wm(r);ec(r|0,13960,106)}qc[c[(c[q>>2]|0)+20>>2]&63](m,q);c[h>>2]=f;r=a[b]|0;if(r<<24>>24==43|r<<24>>24==45){l=Bc[c[(c[n>>2]|0)+44>>2]&15](n,r)|0;r=c[h>>2]|0;c[h>>2]=r+4;c[r>>2]=l;s=b+1|0}else{s=b}l=e;a:do{if(((l-s|0)>1?(a[s]|0)==48:0)?(r=s+1|0,j=a[r]|0,j<<24>>24==88|j<<24>>24==120):0){j=Bc[c[(c[n>>2]|0)+44>>2]&15](n,48)|0;o=c[h>>2]|0;c[h>>2]=o+4;c[o>>2]=j;j=s+2|0;o=Bc[c[(c[n>>2]|0)+44>>2]&15](n,a[r]|0)|0;r=c[h>>2]|0;c[h>>2]=r+4;c[r>>2]=o;if(j>>>0<e>>>0){o=j;while(1){r=a[o]|0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}p=o+1|0;if((cb(r<<24>>24|0,c[1472]|0)|0)==0){t=j;u=o;break a}if(p>>>0<e>>>0){o=p}else{t=j;u=p;break}}}else{t=j;u=j}}else{v=14}}while(0);b:do{if((v|0)==14){if(s>>>0<e>>>0){o=s;while(1){p=a[o]|0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}r=o+1|0;if((ib(p<<24>>24|0,c[1472]|0)|0)==0){t=s;u=o;break b}if(r>>>0<e>>>0){o=r}else{t=s;u=r;break}}}else{t=s;u=s}}}while(0);s=a[m]|0;if((s&1)==0){w=(s&255)>>>1}else{w=c[m+4>>2]|0}if((w|0)!=0){if((t|0)!=(u|0)?(w=u+ -1|0,w>>>0>t>>>0):0){s=t;v=w;do{w=a[s]|0;a[s]=a[v]|0;a[v]=w;s=s+1|0;v=v+ -1|0}while(s>>>0<v>>>0)}v=sc[c[(c[q>>2]|0)+16>>2]&127](q)|0;if(t>>>0<u>>>0){s=m+1|0;w=m+4|0;o=m+8|0;j=0;r=0;p=t;while(1){x=(a[m]&1)==0;if((a[(x?s:c[o>>2]|0)+r|0]|0)>0?(j|0)==(a[(x?s:c[o>>2]|0)+r|0]|0):0){x=c[h>>2]|0;c[h>>2]=x+4;c[x>>2]=v;x=a[m]|0;if((x&1)==0){y=(x&255)>>>1}else{y=c[w>>2]|0}z=0;A=(r>>>0<(y+ -1|0)>>>0)+r|0}else{z=j;A=r}x=Bc[c[(c[n>>2]|0)+44>>2]&15](n,a[p]|0)|0;B=c[h>>2]|0;C=B+4|0;c[h>>2]=C;c[B>>2]=x;x=p+1|0;if(x>>>0<u>>>0){j=z+1|0;r=A;p=x}else{D=C;break}}}else{D=c[h>>2]|0}p=f+(t-b<<2)|0;if((p|0)!=(D|0)?(A=D+ -4|0,A>>>0>p>>>0):0){r=p;p=A;while(1){A=c[r>>2]|0;c[r>>2]=c[p>>2];c[p>>2]=A;A=r+4|0;z=p+ -4|0;if(A>>>0<z>>>0){r=A;p=z}else{E=D;break}}}else{E=D}}else{yc[c[(c[n>>2]|0)+48>>2]&7](n,t,u,c[h>>2]|0)|0;D=(c[h>>2]|0)+(u-t<<2)|0;c[h>>2]=D;E=D}c:do{if(u>>>0<e>>>0){D=u;while(1){t=a[D]|0;if(t<<24>>24==46){break}p=Bc[c[(c[n>>2]|0)+44>>2]&15](n,t)|0;t=c[h>>2]|0;r=t+4|0;c[h>>2]=r;c[t>>2]=p;p=D+1|0;if(p>>>0<e>>>0){D=p}else{F=r;G=p;break c}}p=sc[c[(c[q>>2]|0)+12>>2]&127](q)|0;r=c[h>>2]|0;t=r+4|0;c[h>>2]=t;c[r>>2]=p;F=t;G=D+1|0}else{F=E;G=u}}while(0);yc[c[(c[n>>2]|0)+48>>2]&7](n,G,e,F)|0;F=(c[h>>2]|0)+(l-G<<2)|0;c[h>>2]=F;if((d|0)==(e|0)){H=F;c[g>>2]=H;Fe(m);i=k;return}H=f+(d-b<<2)|0;c[g>>2]=H;Fe(m);i=k;return}function Nh(b,d,e,f,g,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;j=+j;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0;d=i;i=i+320|0;l=d;m=d+16|0;n=d+276|0;o=d+36|0;p=d+44|0;q=d+24|0;r=d+32|0;s=d+40|0;t=d+28|0;u=d+272|0;v=m;c[v>>2]=37;c[v+4>>2]=0;v=m+1|0;w=f+4|0;x=c[w>>2]|0;if((x&2048|0)==0){y=v}else{a[v]=43;y=m+2|0}if((x&1024|0)==0){z=y}else{a[y]=35;z=y+1|0}y=x&260;v=x>>>14;do{if((y|0)==260){a[z]=76;x=z+1|0;if((v&1|0)==0){a[x]=97;A=0;break}else{a[x]=65;A=0;break}}else{a[z]=46;a[z+1|0]=42;a[z+2|0]=76;x=z+3|0;if((y|0)==256){if((v&1|0)==0){a[x]=101;A=1;break}else{a[x]=69;A=1;break}}else if((y|0)==4){if((v&1|0)==0){a[x]=102;A=1;break}else{a[x]=70;A=1;break}}else{if((v&1|0)==0){a[x]=103;A=1;break}else{a[x]=71;A=1;break}}}}while(0);c[o>>2]=n;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}v=c[1472]|0;if(A){c[l>>2]=c[f+8>>2];y=l+4|0;h[k>>3]=j;c[y>>2]=c[k>>2];c[y+4>>2]=c[k+4>>2];B=rh(n,30,v,m,l)|0}else{h[k>>3]=j;c[l>>2]=c[k>>2];c[l+4>>2]=c[k+4>>2];B=rh(n,30,v,m,l)|0}if((B|0)>29){v=(a[5896]|0)==0;if(A){if(v?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}A=c[1472]|0;c[l>>2]=c[f+8>>2];y=l+4|0;h[k>>3]=j;c[y>>2]=c[k>>2];c[y+4>>2]=c[k+4>>2];C=yh(o,A,m,l)|0}else{if(v?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}v=c[1472]|0;h[k>>3]=j;c[l>>2]=c[k>>2];c[l+4>>2]=c[k+4>>2];C=yh(o,v,m,l)|0}m=c[o>>2]|0;if((m|0)==0){bn()}else{D=m;E=m;F=C}}else{D=c[o>>2]|0;E=0;F=B}B=D+F|0;o=c[w>>2]&176;do{if((o|0)==32){G=B}else if((o|0)==16){w=a[D]|0;if(w<<24>>24==43|w<<24>>24==45){G=D+1|0;break}if((F|0)>1&w<<24>>24==48?(w=a[D+1|0]|0,w<<24>>24==88|w<<24>>24==120):0){G=D+2|0}else{H=44}}else{H=44}}while(0);if((H|0)==44){G=D}if((D|0)!=(n|0)){H=Rm(F<<3)|0;if((H|0)==0){bn()}else{I=D;J=H;K=H}}else{I=n;J=0;K=p}Ze(s,f);Mh(I,G,B,K,q,r,s);ge(c[s>>2]|0)|0;c[u>>2]=c[e>>2];s=c[q>>2]|0;q=c[r>>2]|0;c[l+0>>2]=c[u+0>>2];Hh(t,l,K,s,q,f,g);g=c[t>>2]|0;c[e>>2]=g;c[b>>2]=g;if((J|0)!=0){Sm(J)}if((E|0)==0){i=d;return}Sm(E);i=d;return}function Oh(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;d=i;i=i+208|0;j=d;k=d+188|0;l=d+168|0;m=d+20|0;n=d+16|0;o=d+12|0;a[k+0|0]=a[4800|0]|0;a[k+1|0]=a[4801|0]|0;a[k+2|0]=a[4802|0]|0;a[k+3|0]=a[4803|0]|0;a[k+4|0]=a[4804|0]|0;a[k+5|0]=a[4805|0]|0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}p=c[1472]|0;c[j>>2]=h;h=rh(l,20,p,k,j)|0;k=l+h|0;p=c[f+4>>2]&176;do{if((p|0)==32){q=k}else if((p|0)==16){r=a[l]|0;if(r<<24>>24==43|r<<24>>24==45){q=l+1|0;break}if((h|0)>1&r<<24>>24==48?(r=a[l+1|0]|0,r<<24>>24==88|r<<24>>24==120):0){q=l+2|0}else{s=10}}else{s=10}}while(0);if((s|0)==10){q=l}Ze(n,f);s=c[n>>2]|0;if(!((c[1498]|0)==-1)){c[j>>2]=5992;c[j+4>>2]=117;c[j+8>>2]=0;Ae(5992,j,118)}p=(c[5996>>2]|0)+ -1|0;r=c[s+8>>2]|0;if(!((c[s+12>>2]|0)-r>>2>>>0>p>>>0)){t=xb(4)|0;wm(t);ec(t|0,13960,106)}s=c[r+(p<<2)>>2]|0;if((s|0)==0){t=xb(4)|0;wm(t);ec(t|0,13960,106)}ge(c[n>>2]|0)|0;yc[c[(c[s>>2]|0)+48>>2]&7](s,l,k,m)|0;s=m+(h<<2)|0;if((q|0)==(k|0)){u=s;v=c[e>>2]|0;c[o>>2]=v;c[j+0>>2]=c[o+0>>2];Hh(b,j,m,u,s,f,g);i=d;return}u=m+(q-l<<2)|0;v=c[e>>2]|0;c[o>>2]=v;c[j+0>>2]=c[o+0>>2];Hh(b,j,m,u,s,f,g);i=d;return}function Ph(e,f,g,h,j,k,l,m,n){e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;var o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0;o=i;i=i+32|0;p=o;q=o+28|0;r=o+24|0;s=o+20|0;t=o+16|0;u=o+12|0;Ze(r,j);v=c[r>>2]|0;if(!((c[1500]|0)==-1)){c[p>>2]=6e3;c[p+4>>2]=117;c[p+8>>2]=0;Ae(6e3,p,118)}w=(c[6004>>2]|0)+ -1|0;x=c[v+8>>2]|0;if(!((c[v+12>>2]|0)-x>>2>>>0>w>>>0)){y=xb(4)|0;wm(y);ec(y|0,13960,106)}v=c[x+(w<<2)>>2]|0;if((v|0)==0){y=xb(4)|0;wm(y);ec(y|0,13960,106)}ge(c[r>>2]|0)|0;c[k>>2]=0;a:do{if((m|0)!=(n|0)){r=v+8|0;y=m;w=0;b:while(1){x=w;while(1){if((x|0)!=0){z=65;break a}A=c[g>>2]|0;if((A|0)!=0){if((c[A+12>>2]|0)==(c[A+16>>2]|0)?(sc[c[(c[A>>2]|0)+36>>2]&127](A)|0)==-1:0){c[g>>2]=0;B=0}else{B=A}}else{B=0}A=(B|0)==0;C=c[h>>2]|0;do{if((C|0)!=0){if((c[C+12>>2]|0)==(c[C+16>>2]|0)?(sc[c[(c[C>>2]|0)+36>>2]&127](C)|0)==-1:0){c[h>>2]=0;z=19;break}if(A){D=C}else{z=20;break b}}else{z=19}}while(0);if((z|0)==19){z=0;if(A){z=20;break b}else{D=0}}if((kc[c[(c[v>>2]|0)+36>>2]&31](v,a[y]|0,0)|0)<<24>>24==37){z=22;break}C=a[y]|0;if(C<<24>>24>-1?(E=c[r>>2]|0,!((b[E+(C<<24>>24<<1)>>1]&8192)==0)):0){F=y;z=33;break}G=B+12|0;C=c[G>>2]|0;H=B+16|0;if((C|0)==(c[H>>2]|0)){I=sc[c[(c[B>>2]|0)+36>>2]&127](B)|0}else{I=d[C]|0}C=Bc[c[(c[v>>2]|0)+12>>2]&15](v,I&255)|0;if(C<<24>>24==(Bc[c[(c[v>>2]|0)+12>>2]&15](v,a[y]|0)|0)<<24>>24){z=60;break}c[k>>2]=4;x=4}c:do{if((z|0)==22){z=0;x=y+1|0;if((x|0)==(n|0)){z=23;break b}C=kc[c[(c[v>>2]|0)+36>>2]&31](v,a[x]|0,0)|0;if(C<<24>>24==48|C<<24>>24==69){J=y+2|0;if((J|0)==(n|0)){z=26;break b}K=J;L=kc[c[(c[v>>2]|0)+36>>2]&31](v,a[J]|0,0)|0;M=C}else{K=x;L=C;M=0}C=c[(c[f>>2]|0)+36>>2]|0;c[t>>2]=B;c[u>>2]=D;c[q+0>>2]=c[t+0>>2];c[p+0>>2]=c[u+0>>2];rc[C&3](s,f,q,p,j,k,l,L,M);c[g>>2]=c[s>>2];N=K+1|0}else if((z|0)==33){while(1){z=0;C=F+1|0;if((C|0)==(n|0)){O=n;break}x=a[C]|0;if(!(x<<24>>24>-1)){O=C;break}if((b[E+(x<<24>>24<<1)>>1]&8192)==0){O=C;break}else{F=C;z=33}}A=B;C=D;x=D;while(1){if((A|0)!=0){if((c[A+12>>2]|0)==(c[A+16>>2]|0)?(sc[c[(c[A>>2]|0)+36>>2]&127](A)|0)==-1:0){c[g>>2]=0;P=0}else{P=A}}else{P=0}J=(P|0)==0;do{if((x|0)!=0){if((c[x+12>>2]|0)!=(c[x+16>>2]|0)){if(J){Q=C;R=x;break}else{N=O;break c}}if(!((sc[c[(c[x>>2]|0)+36>>2]&127](x)|0)==-1)){if(J^(C|0)==0){Q=C;R=C;break}else{N=O;break c}}else{c[h>>2]=0;S=0;z=46;break}}else{S=C;z=46}}while(0);if((z|0)==46){z=0;if(J){N=O;break c}else{Q=S;R=0}}T=P+12|0;U=c[T>>2]|0;V=P+16|0;if((U|0)==(c[V>>2]|0)){W=sc[c[(c[P>>2]|0)+36>>2]&127](P)|0}else{W=d[U]|0}if(!((W&255)<<24>>24>-1)){N=O;break c}if((b[(c[r>>2]|0)+(W<<24>>24<<1)>>1]&8192)==0){N=O;break c}U=c[T>>2]|0;if((U|0)==(c[V>>2]|0)){sc[c[(c[P>>2]|0)+40>>2]&127](P)|0;A=P;C=Q;x=R;continue}else{c[T>>2]=U+1;A=P;C=Q;x=R;continue}}}else if((z|0)==60){z=0;x=c[G>>2]|0;if((x|0)==(c[H>>2]|0)){sc[c[(c[B>>2]|0)+40>>2]&127](B)|0}else{c[G>>2]=x+1}N=y+1|0}}while(0);if((N|0)==(n|0)){z=65;break a}y=N;w=c[k>>2]|0}if((z|0)==20){c[k>>2]=4;X=B;break}else if((z|0)==23){c[k>>2]=4;X=B;break}else if((z|0)==26){c[k>>2]=4;X=B;break}}else{z=65}}while(0);if((z|0)==65){X=c[g>>2]|0}if((X|0)!=0){if((c[X+12>>2]|0)==(c[X+16>>2]|0)?(sc[c[(c[X>>2]|0)+36>>2]&127](X)|0)==-1:0){c[g>>2]=0;Y=0}else{Y=X}}else{Y=0}X=(Y|0)==0;g=c[h>>2]|0;do{if((g|0)!=0){if((c[g+12>>2]|0)==(c[g+16>>2]|0)?(sc[c[(c[g>>2]|0)+36>>2]&127](g)|0)==-1:0){c[h>>2]=0;z=75;break}if(X){c[e>>2]=Y;i=o;return}}else{z=75}}while(0);if((z|0)==75?!X:0){c[e>>2]=Y;i=o;return}c[k>>2]=c[k>>2]|2;c[e>>2]=Y;i=o;return}function Qh(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function Rh(a){a=a|0;return}function Sh(a){a=a|0;return 2}function Th(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0;j=i;i=i+16|0;k=j+12|0;l=j+8|0;m=j+4|0;n=j;c[m>>2]=c[d>>2];c[n>>2]=c[e>>2];c[l+0>>2]=c[m+0>>2];c[k+0>>2]=c[n+0>>2];Ph(a,b,l,k,f,g,h,4904,4912|0);i=j;return}function Uh(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0;k=i;i=i+16|0;l=k+12|0;m=k+8|0;n=k+4|0;o=k;p=d+8|0;q=sc[c[(c[p>>2]|0)+20>>2]&127](p)|0;c[n>>2]=c[e>>2];c[o>>2]=c[f>>2];f=a[q]|0;if((f&1)==0){r=q+1|0;s=(f&255)>>>1;t=q+1|0}else{f=c[q+8>>2]|0;r=f;s=c[q+4>>2]|0;t=f}f=r+s|0;c[m+0>>2]=c[n+0>>2];c[l+0>>2]=c[o+0>>2];Ph(b,d,m,l,g,h,j,t,f);i=k;return}function Vh(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;j=i;i=i+32|0;k=j;l=j+16|0;m=j+12|0;Ze(m,f);f=c[m>>2]|0;if(!((c[1500]|0)==-1)){c[k>>2]=6e3;c[k+4>>2]=117;c[k+8>>2]=0;Ae(6e3,k,118)}n=(c[6004>>2]|0)+ -1|0;o=c[f+8>>2]|0;if(!((c[f+12>>2]|0)-o>>2>>>0>n>>>0)){p=xb(4)|0;wm(p);ec(p|0,13960,106)}f=c[o+(n<<2)>>2]|0;if((f|0)==0){p=xb(4)|0;wm(p);ec(p|0,13960,106)}ge(c[m>>2]|0)|0;m=c[e>>2]|0;e=b+8|0;b=sc[c[c[e>>2]>>2]&127](e)|0;c[l>>2]=m;m=b+168|0;c[k+0>>2]=c[l+0>>2];l=(pg(d,k,b,m,f,g,0)|0)-b|0;if((l|0)>=168){q=c[d>>2]|0;c[a>>2]=q;i=j;return}c[h+24>>2]=((l|0)/12|0|0)%7|0;q=c[d>>2]|0;c[a>>2]=q;i=j;return}function Wh(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;j=i;i=i+32|0;k=j;l=j+16|0;m=j+12|0;Ze(m,f);f=c[m>>2]|0;if(!((c[1500]|0)==-1)){c[k>>2]=6e3;c[k+4>>2]=117;c[k+8>>2]=0;Ae(6e3,k,118)}n=(c[6004>>2]|0)+ -1|0;o=c[f+8>>2]|0;if(!((c[f+12>>2]|0)-o>>2>>>0>n>>>0)){p=xb(4)|0;wm(p);ec(p|0,13960,106)}f=c[o+(n<<2)>>2]|0;if((f|0)==0){p=xb(4)|0;wm(p);ec(p|0,13960,106)}ge(c[m>>2]|0)|0;m=c[e>>2]|0;e=b+8|0;b=sc[c[(c[e>>2]|0)+4>>2]&127](e)|0;c[l>>2]=m;m=b+288|0;c[k+0>>2]=c[l+0>>2];l=(pg(d,k,b,m,f,g,0)|0)-b|0;if((l|0)>=288){q=c[d>>2]|0;c[a>>2]=q;i=j;return}c[h+16>>2]=((l|0)/12|0|0)%12|0;q=c[d>>2]|0;c[a>>2]=q;i=j;return}function Xh(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;b=i;i=i+32|0;j=b;k=b+16|0;l=b+12|0;Ze(l,f);f=c[l>>2]|0;if(!((c[1500]|0)==-1)){c[j>>2]=6e3;c[j+4>>2]=117;c[j+8>>2]=0;Ae(6e3,j,118)}m=(c[6004>>2]|0)+ -1|0;n=c[f+8>>2]|0;if(!((c[f+12>>2]|0)-n>>2>>>0>m>>>0)){o=xb(4)|0;wm(o);ec(o|0,13960,106)}f=c[n+(m<<2)>>2]|0;if((f|0)==0){o=xb(4)|0;wm(o);ec(o|0,13960,106)}ge(c[l>>2]|0)|0;l=h+20|0;c[k>>2]=c[e>>2];c[j+0>>2]=c[k+0>>2];k=$h(d,j,g,f,4)|0;if((c[g>>2]&4|0)!=0){p=c[d>>2]|0;c[a>>2]=p;i=b;return}if((k|0)<69){q=k+2e3|0}else{q=(k+ -69|0)>>>0<31?k+1900|0:k}c[l>>2]=q+ -1900;p=c[d>>2]|0;c[a>>2]=p;i=b;return}function Yh(b,d,e,f,g,h,j,k,l){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0;l=i;i=i+176|0;m=l;n=l+12|0;o=l+16|0;p=l+120|0;q=l+24|0;r=l+20|0;s=l+124|0;t=l+116|0;u=l+52|0;v=l+28|0;w=l+32|0;x=l+36|0;y=l+40|0;z=l+44|0;A=l+48|0;B=l+112|0;C=l+108|0;D=l+56|0;E=l+60|0;F=l+64|0;G=l+68|0;H=l+72|0;I=l+76|0;J=l+80|0;K=l+84|0;L=l+88|0;M=l+92|0;N=l+96|0;O=l+100|0;P=l+104|0;Q=l+128|0;R=l+132|0;S=l+136|0;T=l+140|0;U=l+144|0;V=l+148|0;W=l+152|0;X=l+156|0;Y=l+160|0;Z=l+164|0;c[h>>2]=0;Ze(A,g);_=c[A>>2]|0;if(!((c[1500]|0)==-1)){c[m>>2]=6e3;c[m+4>>2]=117;c[m+8>>2]=0;Ae(6e3,m,118)}$=(c[6004>>2]|0)+ -1|0;aa=c[_+8>>2]|0;if(!((c[_+12>>2]|0)-aa>>2>>>0>$>>>0)){ba=xb(4)|0;wm(ba);ec(ba|0,13960,106)}_=c[aa+($<<2)>>2]|0;if((_|0)==0){ba=xb(4)|0;wm(ba);ec(ba|0,13960,106)}ge(c[A>>2]|0)|0;a:do{switch(k<<24>>24|0){case 73:{A=j+8|0;c[v>>2]=c[f>>2];c[m+0>>2]=c[v+0>>2];ba=$h(e,m,h,_,2)|0;$=c[h>>2]|0;if(($&4|0)==0?(ba+ -1|0)>>>0<12:0){c[A>>2]=ba;break a}c[h>>2]=$|4;break};case 68:{c[F>>2]=c[e>>2];c[G>>2]=c[f>>2];c[n+0>>2]=c[F+0>>2];c[m+0>>2]=c[G+0>>2];Ph(E,d,n,m,g,h,j,4912,4920|0);c[e>>2]=c[E>>2];break};case 106:{c[u>>2]=c[f>>2];c[m+0>>2]=c[u+0>>2];$=$h(e,m,h,_,3)|0;ba=c[h>>2]|0;if((ba&4|0)==0&($|0)<366){c[j+28>>2]=$;break a}else{c[h>>2]=ba|4;break a}break};case 70:{c[I>>2]=c[e>>2];c[J>>2]=c[f>>2];c[n+0>>2]=c[I+0>>2];c[m+0>>2]=c[J+0>>2];Ph(H,d,n,m,g,h,j,4920,4928|0);c[e>>2]=c[H>>2];break};case 104:case 66:case 98:{ba=c[f>>2]|0;$=d+8|0;A=sc[c[(c[$>>2]|0)+4>>2]&127]($)|0;c[y>>2]=ba;c[m+0>>2]=c[y+0>>2];ba=(pg(e,m,A,A+288|0,_,h,0)|0)-A|0;if((ba|0)<288){c[j+16>>2]=((ba|0)/12|0|0)%12|0}break};case 101:case 100:{ba=j+12|0;c[x>>2]=c[f>>2];c[m+0>>2]=c[x+0>>2];A=$h(e,m,h,_,2)|0;$=c[h>>2]|0;if(($&4|0)==0?(A+ -1|0)>>>0<31:0){c[ba>>2]=A;break a}c[h>>2]=$|4;break};case 99:{$=d+8|0;A=sc[c[(c[$>>2]|0)+12>>2]&127]($)|0;c[C>>2]=c[e>>2];c[D>>2]=c[f>>2];$=a[A]|0;if(($&1)==0){ca=A+1|0;da=($&255)>>>1;ea=A+1|0}else{$=c[A+8>>2]|0;ca=$;da=c[A+4>>2]|0;ea=$}c[n+0>>2]=c[C+0>>2];c[m+0>>2]=c[D+0>>2];Ph(B,d,n,m,g,h,j,ea,ca+da|0);c[e>>2]=c[B>>2];break};case 72:{c[w>>2]=c[f>>2];c[m+0>>2]=c[w+0>>2];$=$h(e,m,h,_,2)|0;A=c[h>>2]|0;if((A&4|0)==0&($|0)<24){c[j+8>>2]=$;break a}else{c[h>>2]=A|4;break a}break};case 65:case 97:{A=c[f>>2]|0;$=d+8|0;ba=sc[c[c[$>>2]>>2]&127]($)|0;c[z>>2]=A;c[m+0>>2]=c[z+0>>2];A=(pg(e,m,ba,ba+168|0,_,h,0)|0)-ba|0;if((A|0)<168){c[j+24>>2]=((A|0)/12|0|0)%7|0}break};case 114:{c[M>>2]=c[e>>2];c[N>>2]=c[f>>2];c[n+0>>2]=c[M+0>>2];c[m+0>>2]=c[N+0>>2];Ph(L,d,n,m,g,h,j,4928,4939|0);c[e>>2]=c[L>>2];break};case 82:{c[P>>2]=c[e>>2];c[Q>>2]=c[f>>2];c[n+0>>2]=c[P+0>>2];c[m+0>>2]=c[Q+0>>2];Ph(O,d,n,m,g,h,j,4944,4949|0);c[e>>2]=c[O>>2];break};case 120:{A=c[(c[d>>2]|0)+20>>2]|0;c[U>>2]=c[e>>2];c[V>>2]=c[f>>2];c[n+0>>2]=c[U+0>>2];c[m+0>>2]=c[V+0>>2];nc[A&63](b,d,n,m,g,h,j);i=l;return};case 109:{c[t>>2]=c[f>>2];c[m+0>>2]=c[t+0>>2];A=$h(e,m,h,_,2)|0;ba=c[h>>2]|0;if((ba&4|0)==0&(A|0)<13){c[j+16>>2]=A+ -1;break a}else{c[h>>2]=ba|4;break a}break};case 116:case 110:{c[K>>2]=c[f>>2];c[m+0>>2]=c[K+0>>2];Zh(0,e,m,h,_);break};case 112:{ba=j+8|0;A=c[f>>2]|0;$=d+8|0;aa=sc[c[(c[$>>2]|0)+8>>2]&127]($)|0;$=a[aa]|0;if(($&1)==0){fa=($&255)>>>1}else{fa=c[aa+4>>2]|0}$=a[aa+12|0]|0;if(($&1)==0){ga=($&255)>>>1}else{ga=c[aa+16>>2]|0}if((fa|0)==(0-ga|0)){c[h>>2]=c[h>>2]|4;break a}c[r>>2]=A;c[m+0>>2]=c[r+0>>2];A=pg(e,m,aa,aa+24|0,_,h,0)|0;$=A-aa|0;if((A|0)==(aa|0)?(c[ba>>2]|0)==12:0){c[ba>>2]=0;break a}if(($|0)==12?($=c[ba>>2]|0,($|0)<12):0){c[ba>>2]=$+12}break};case 83:{c[q>>2]=c[f>>2];c[m+0>>2]=c[q+0>>2];$=$h(e,m,h,_,2)|0;ba=c[h>>2]|0;if((ba&4|0)==0&($|0)<61){c[j>>2]=$;break a}else{c[h>>2]=ba|4;break a}break};case 84:{c[S>>2]=c[e>>2];c[T>>2]=c[f>>2];c[n+0>>2]=c[S+0>>2];c[m+0>>2]=c[T+0>>2];Ph(R,d,n,m,g,h,j,4952,4960|0);c[e>>2]=c[R>>2];break};case 119:{c[p>>2]=c[f>>2];c[m+0>>2]=c[p+0>>2];ba=$h(e,m,h,_,1)|0;$=c[h>>2]|0;if(($&4|0)==0&(ba|0)<7){c[j+24>>2]=ba;break a}else{c[h>>2]=$|4;break a}break};case 77:{c[s>>2]=c[f>>2];c[m+0>>2]=c[s+0>>2];$=$h(e,m,h,_,2)|0;ba=c[h>>2]|0;if((ba&4|0)==0&($|0)<60){c[j+4>>2]=$;break a}else{c[h>>2]=ba|4;break a}break};case 88:{ba=d+8|0;$=sc[c[(c[ba>>2]|0)+24>>2]&127](ba)|0;c[X>>2]=c[e>>2];c[Y>>2]=c[f>>2];ba=a[$]|0;if((ba&1)==0){ha=$+1|0;ia=(ba&255)>>>1;ja=$+1|0}else{ba=c[$+8>>2]|0;ha=ba;ia=c[$+4>>2]|0;ja=ba}c[n+0>>2]=c[X+0>>2];c[m+0>>2]=c[Y+0>>2];Ph(W,d,n,m,g,h,j,ja,ha+ia|0);c[e>>2]=c[W>>2];break};case 121:{ba=j+20|0;c[o>>2]=c[f>>2];c[m+0>>2]=c[o+0>>2];$=$h(e,m,h,_,4)|0;if((c[h>>2]&4|0)==0){if(($|0)<69){ka=$+2e3|0}else{ka=($+ -69|0)>>>0<31?$+1900|0:$}c[ba>>2]=ka+ -1900}break};case 89:{c[n>>2]=c[f>>2];c[m+0>>2]=c[n+0>>2];ba=$h(e,m,h,_,4)|0;if((c[h>>2]&4|0)==0){c[j+20>>2]=ba+ -1900}break};case 37:{c[Z>>2]=c[f>>2];c[m+0>>2]=c[Z+0>>2];_h(0,e,m,h,_);break};default:{c[h>>2]=c[h>>2]|4}}}while(0);c[b>>2]=c[e>>2];i=l;return}function Zh(a,e,f,g,h){a=a|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0;a=i;j=h+8|0;a:while(1){h=c[e>>2]|0;do{if((h|0)!=0){if((c[h+12>>2]|0)==(c[h+16>>2]|0)){if((sc[c[(c[h>>2]|0)+36>>2]&127](h)|0)==-1){c[e>>2]=0;k=0;break}else{k=c[e>>2]|0;break}}else{k=h}}else{k=0}}while(0);h=(k|0)==0;l=c[f>>2]|0;do{if((l|0)!=0){if((c[l+12>>2]|0)!=(c[l+16>>2]|0)){if(h){m=l;break}else{n=l;break a}}if(!((sc[c[(c[l>>2]|0)+36>>2]&127](l)|0)==-1)){if(h){m=l;break}else{n=l;break a}}else{c[f>>2]=0;o=12;break}}else{o=12}}while(0);if((o|0)==12){o=0;if(h){n=0;break}else{m=0}}l=c[e>>2]|0;p=c[l+12>>2]|0;if((p|0)==(c[l+16>>2]|0)){q=sc[c[(c[l>>2]|0)+36>>2]&127](l)|0}else{q=d[p]|0}if(!((q&255)<<24>>24>-1)){n=m;break}if((b[(c[j>>2]|0)+(q<<24>>24<<1)>>1]&8192)==0){n=m;break}p=c[e>>2]|0;l=p+12|0;r=c[l>>2]|0;if((r|0)==(c[p+16>>2]|0)){sc[c[(c[p>>2]|0)+40>>2]&127](p)|0;continue}else{c[l>>2]=r+1;continue}}m=c[e>>2]|0;do{if((m|0)!=0){if((c[m+12>>2]|0)==(c[m+16>>2]|0)){if((sc[c[(c[m>>2]|0)+36>>2]&127](m)|0)==-1){c[e>>2]=0;s=0;break}else{s=c[e>>2]|0;break}}else{s=m}}else{s=0}}while(0);m=(s|0)==0;do{if((n|0)!=0){if((c[n+12>>2]|0)==(c[n+16>>2]|0)?(sc[c[(c[n>>2]|0)+36>>2]&127](n)|0)==-1:0){c[f>>2]=0;o=32;break}if(m){i=a;return}}else{o=32}}while(0);if((o|0)==32?!m:0){i=a;return}c[g>>2]=c[g>>2]|2;i=a;return}function _h(a,b,e,f,g){a=a|0;b=b|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0;a=i;h=c[b>>2]|0;do{if((h|0)!=0){if((c[h+12>>2]|0)==(c[h+16>>2]|0)){if((sc[c[(c[h>>2]|0)+36>>2]&127](h)|0)==-1){c[b>>2]=0;j=0;break}else{j=c[b>>2]|0;break}}else{j=h}}else{j=0}}while(0);h=(j|0)==0;j=c[e>>2]|0;do{if((j|0)!=0){if((c[j+12>>2]|0)==(c[j+16>>2]|0)?(sc[c[(c[j>>2]|0)+36>>2]&127](j)|0)==-1:0){c[e>>2]=0;k=11;break}if(h){l=j}else{k=12}}else{k=11}}while(0);if((k|0)==11){if(h){k=12}else{l=0}}if((k|0)==12){c[f>>2]=c[f>>2]|6;i=a;return}h=c[b>>2]|0;j=c[h+12>>2]|0;if((j|0)==(c[h+16>>2]|0)){m=sc[c[(c[h>>2]|0)+36>>2]&127](h)|0}else{m=d[j]|0}if(!((kc[c[(c[g>>2]|0)+36>>2]&31](g,m&255,0)|0)<<24>>24==37)){c[f>>2]=c[f>>2]|4;i=a;return}m=c[b>>2]|0;g=m+12|0;j=c[g>>2]|0;if((j|0)==(c[m+16>>2]|0)){sc[c[(c[m>>2]|0)+40>>2]&127](m)|0}else{c[g>>2]=j+1}j=c[b>>2]|0;do{if((j|0)!=0){if((c[j+12>>2]|0)==(c[j+16>>2]|0)){if((sc[c[(c[j>>2]|0)+36>>2]&127](j)|0)==-1){c[b>>2]=0;n=0;break}else{n=c[b>>2]|0;break}}else{n=j}}else{n=0}}while(0);j=(n|0)==0;do{if((l|0)!=0){if((c[l+12>>2]|0)==(c[l+16>>2]|0)?(sc[c[(c[l>>2]|0)+36>>2]&127](l)|0)==-1:0){c[e>>2]=0;k=31;break}if(j){i=a;return}}else{k=31}}while(0);if((k|0)==31?!j:0){i=a;return}c[f>>2]=c[f>>2]|2;i=a;return}function $h(a,e,f,g,h){a=a|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0;j=i;k=c[a>>2]|0;do{if((k|0)!=0){if((c[k+12>>2]|0)==(c[k+16>>2]|0)){if((sc[c[(c[k>>2]|0)+36>>2]&127](k)|0)==-1){c[a>>2]=0;l=0;break}else{l=c[a>>2]|0;break}}else{l=k}}else{l=0}}while(0);k=(l|0)==0;l=c[e>>2]|0;do{if((l|0)!=0){if((c[l+12>>2]|0)==(c[l+16>>2]|0)?(sc[c[(c[l>>2]|0)+36>>2]&127](l)|0)==-1:0){c[e>>2]=0;m=11;break}if(k){n=l}else{m=12}}else{m=11}}while(0);if((m|0)==11){if(k){m=12}else{n=0}}if((m|0)==12){c[f>>2]=c[f>>2]|6;o=0;i=j;return o|0}k=c[a>>2]|0;l=c[k+12>>2]|0;if((l|0)==(c[k+16>>2]|0)){p=sc[c[(c[k>>2]|0)+36>>2]&127](k)|0}else{p=d[l]|0}l=p&255;if(l<<24>>24>-1?(k=g+8|0,!((b[(c[k>>2]|0)+(p<<24>>24<<1)>>1]&2048)==0)):0){p=(kc[c[(c[g>>2]|0)+36>>2]&31](g,l,0)|0)<<24>>24;l=c[a>>2]|0;q=l+12|0;r=c[q>>2]|0;if((r|0)==(c[l+16>>2]|0)){sc[c[(c[l>>2]|0)+40>>2]&127](l)|0;s=h;t=n;u=n;v=p}else{c[q>>2]=r+1;s=h;t=n;u=n;v=p}while(1){w=v+ -48|0;p=s+ -1|0;n=c[a>>2]|0;do{if((n|0)!=0){if((c[n+12>>2]|0)==(c[n+16>>2]|0)){if((sc[c[(c[n>>2]|0)+36>>2]&127](n)|0)==-1){c[a>>2]=0;x=0;break}else{x=c[a>>2]|0;break}}else{x=n}}else{x=0}}while(0);n=(x|0)==0;if((u|0)!=0){if((c[u+12>>2]|0)==(c[u+16>>2]|0)){if((sc[c[(c[u>>2]|0)+36>>2]&127](u)|0)==-1){c[e>>2]=0;y=0;z=0}else{y=t;z=t}}else{y=t;z=u}}else{y=t;z=0}A=c[a>>2]|0;if(!((n^(z|0)==0)&(p|0)>0)){m=40;break}n=c[A+12>>2]|0;if((n|0)==(c[A+16>>2]|0)){B=sc[c[(c[A>>2]|0)+36>>2]&127](A)|0}else{B=d[n]|0}n=B&255;if(!(n<<24>>24>-1)){o=w;m=52;break}if((b[(c[k>>2]|0)+(B<<24>>24<<1)>>1]&2048)==0){o=w;m=52;break}h=((kc[c[(c[g>>2]|0)+36>>2]&31](g,n,0)|0)<<24>>24)+(w*10|0)|0;n=c[a>>2]|0;r=n+12|0;q=c[r>>2]|0;if((q|0)==(c[n+16>>2]|0)){sc[c[(c[n>>2]|0)+40>>2]&127](n)|0;s=p;t=y;u=z;v=h;continue}else{c[r>>2]=q+1;s=p;t=y;u=z;v=h;continue}}if((m|0)==40){do{if((A|0)!=0){if((c[A+12>>2]|0)==(c[A+16>>2]|0)){if((sc[c[(c[A>>2]|0)+36>>2]&127](A)|0)==-1){c[a>>2]=0;C=0;break}else{C=c[a>>2]|0;break}}else{C=A}}else{C=0}}while(0);A=(C|0)==0;do{if((y|0)!=0){if((c[y+12>>2]|0)==(c[y+16>>2]|0)?(sc[c[(c[y>>2]|0)+36>>2]&127](y)|0)==-1:0){c[e>>2]=0;m=50;break}if(A){o=w;i=j;return o|0}}else{m=50}}while(0);if((m|0)==50?!A:0){o=w;i=j;return o|0}c[f>>2]=c[f>>2]|2;o=w;i=j;return o|0}else if((m|0)==52){i=j;return o|0}}c[f>>2]=c[f>>2]|4;o=0;i=j;return o|0}function ai(a,b,d,e,f,g,h,j,k){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0;l=i;i=i+32|0;m=l;n=l+28|0;o=l+24|0;p=l+20|0;q=l+16|0;r=l+12|0;Ze(o,f);s=c[o>>2]|0;if(!((c[1498]|0)==-1)){c[m>>2]=5992;c[m+4>>2]=117;c[m+8>>2]=0;Ae(5992,m,118)}t=(c[5996>>2]|0)+ -1|0;u=c[s+8>>2]|0;if(!((c[s+12>>2]|0)-u>>2>>>0>t>>>0)){v=xb(4)|0;wm(v);ec(v|0,13960,106)}s=c[u+(t<<2)>>2]|0;if((s|0)==0){v=xb(4)|0;wm(v);ec(v|0,13960,106)}ge(c[o>>2]|0)|0;c[g>>2]=0;a:do{if((j|0)!=(k|0)){o=j;v=0;b:while(1){t=v;while(1){if((t|0)!=0){w=69;break a}u=c[d>>2]|0;if((u|0)!=0){x=c[u+12>>2]|0;if((x|0)==(c[u+16>>2]|0)){y=sc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{y=c[x>>2]|0}if((y|0)==-1){c[d>>2]=0;z=1;A=0}else{z=0;A=u}}else{z=1;A=0}u=c[e>>2]|0;do{if((u|0)!=0){x=c[u+12>>2]|0;if((x|0)==(c[u+16>>2]|0)){B=sc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{B=c[x>>2]|0}if(!((B|0)==-1)){if(z){C=u;break}else{w=24;break b}}else{c[e>>2]=0;w=22;break}}else{w=22}}while(0);if((w|0)==22){w=0;if(z){w=24;break b}else{C=0}}if((kc[c[(c[s>>2]|0)+52>>2]&31](s,c[o>>2]|0,0)|0)<<24>>24==37){w=26;break}if(kc[c[(c[s>>2]|0)+12>>2]&31](s,8192,c[o>>2]|0)|0){D=o;w=36;break}E=A+12|0;u=c[E>>2]|0;F=A+16|0;if((u|0)==(c[F>>2]|0)){G=sc[c[(c[A>>2]|0)+36>>2]&127](A)|0}else{G=c[u>>2]|0}u=Bc[c[(c[s>>2]|0)+28>>2]&15](s,G)|0;if((u|0)==(Bc[c[(c[s>>2]|0)+28>>2]&15](s,c[o>>2]|0)|0)){w=64;break}c[g>>2]=4;t=4}c:do{if((w|0)==26){w=0;t=o+4|0;if((t|0)==(k|0)){w=27;break b}u=kc[c[(c[s>>2]|0)+52>>2]&31](s,c[t>>2]|0,0)|0;if(u<<24>>24==48|u<<24>>24==69){x=o+8|0;if((x|0)==(k|0)){w=30;break b}H=x;I=kc[c[(c[s>>2]|0)+52>>2]&31](s,c[x>>2]|0,0)|0;J=u}else{H=t;I=u;J=0}u=c[(c[b>>2]|0)+36>>2]|0;c[q>>2]=A;c[r>>2]=C;c[n+0>>2]=c[q+0>>2];c[m+0>>2]=c[r+0>>2];rc[u&3](p,b,n,m,f,g,h,I,J);c[d>>2]=c[p>>2];K=H+4|0}else if((w|0)==36){while(1){w=0;u=D+4|0;if((u|0)==(k|0)){L=k;break}if(kc[c[(c[s>>2]|0)+12>>2]&31](s,8192,c[u>>2]|0)|0){D=u;w=36}else{L=u;break}}u=A;t=C;x=C;while(1){if((u|0)!=0){M=c[u+12>>2]|0;if((M|0)==(c[u+16>>2]|0)){N=sc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{N=c[M>>2]|0}if((N|0)==-1){c[d>>2]=0;O=1;P=0}else{O=0;P=u}}else{O=1;P=0}do{if((x|0)!=0){M=c[x+12>>2]|0;if((M|0)==(c[x+16>>2]|0)){Q=sc[c[(c[x>>2]|0)+36>>2]&127](x)|0}else{Q=c[M>>2]|0}if(!((Q|0)==-1)){if(O^(t|0)==0){R=t;S=t;break}else{K=L;break c}}else{c[e>>2]=0;T=0;w=51;break}}else{T=t;w=51}}while(0);if((w|0)==51){w=0;if(O){K=L;break c}else{R=T;S=0}}M=P+12|0;U=c[M>>2]|0;V=P+16|0;if((U|0)==(c[V>>2]|0)){W=sc[c[(c[P>>2]|0)+36>>2]&127](P)|0}else{W=c[U>>2]|0}if(!(kc[c[(c[s>>2]|0)+12>>2]&31](s,8192,W)|0)){K=L;break c}U=c[M>>2]|0;if((U|0)==(c[V>>2]|0)){sc[c[(c[P>>2]|0)+40>>2]&127](P)|0;u=P;t=R;x=S;continue}else{c[M>>2]=U+4;u=P;t=R;x=S;continue}}}else if((w|0)==64){w=0;x=c[E>>2]|0;if((x|0)==(c[F>>2]|0)){sc[c[(c[A>>2]|0)+40>>2]&127](A)|0}else{c[E>>2]=x+4}K=o+4|0}}while(0);if((K|0)==(k|0)){w=69;break a}o=K;v=c[g>>2]|0}if((w|0)==24){c[g>>2]=4;X=A;break}else if((w|0)==27){c[g>>2]=4;X=A;break}else if((w|0)==30){c[g>>2]=4;X=A;break}}else{w=69}}while(0);if((w|0)==69){X=c[d>>2]|0}if((X|0)!=0){A=c[X+12>>2]|0;if((A|0)==(c[X+16>>2]|0)){Y=sc[c[(c[X>>2]|0)+36>>2]&127](X)|0}else{Y=c[A>>2]|0}if((Y|0)==-1){c[d>>2]=0;Z=0;_=1}else{Z=X;_=0}}else{Z=0;_=1}X=c[e>>2]|0;do{if((X|0)!=0){d=c[X+12>>2]|0;if((d|0)==(c[X+16>>2]|0)){$=sc[c[(c[X>>2]|0)+36>>2]&127](X)|0}else{$=c[d>>2]|0}if(($|0)==-1){c[e>>2]=0;w=82;break}if(_){c[a>>2]=Z;i=l;return}}else{w=82}}while(0);if((w|0)==82?!_:0){c[a>>2]=Z;i=l;return}c[g>>2]=c[g>>2]|2;c[a>>2]=Z;i=l;return}function bi(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function ci(a){a=a|0;return}function di(a){a=a|0;return 2}function ei(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0;j=i;i=i+16|0;k=j+12|0;l=j+8|0;m=j+4|0;n=j;c[m>>2]=c[d>>2];c[n>>2]=c[e>>2];c[l+0>>2]=c[m+0>>2];c[k+0>>2]=c[n+0>>2];ai(a,b,l,k,f,g,h,5056,5088|0);i=j;return}function fi(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0;k=i;i=i+16|0;l=k+12|0;m=k+8|0;n=k+4|0;o=k;p=d+8|0;q=sc[c[(c[p>>2]|0)+20>>2]&127](p)|0;c[n>>2]=c[e>>2];c[o>>2]=c[f>>2];f=a[q]|0;if((f&1)==0){r=q+4|0;s=(f&255)>>>1;t=q+4|0}else{f=c[q+8>>2]|0;r=f;s=c[q+4>>2]|0;t=f}f=r+(s<<2)|0;c[m+0>>2]=c[n+0>>2];c[l+0>>2]=c[o+0>>2];ai(b,d,m,l,g,h,j,t,f);i=k;return}function gi(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;j=i;i=i+32|0;k=j;l=j+16|0;m=j+12|0;Ze(m,f);f=c[m>>2]|0;if(!((c[1498]|0)==-1)){c[k>>2]=5992;c[k+4>>2]=117;c[k+8>>2]=0;Ae(5992,k,118)}n=(c[5996>>2]|0)+ -1|0;o=c[f+8>>2]|0;if(!((c[f+12>>2]|0)-o>>2>>>0>n>>>0)){p=xb(4)|0;wm(p);ec(p|0,13960,106)}f=c[o+(n<<2)>>2]|0;if((f|0)==0){p=xb(4)|0;wm(p);ec(p|0,13960,106)}ge(c[m>>2]|0)|0;m=c[e>>2]|0;e=b+8|0;b=sc[c[c[e>>2]>>2]&127](e)|0;c[l>>2]=m;m=b+168|0;c[k+0>>2]=c[l+0>>2];l=(Og(d,k,b,m,f,g,0)|0)-b|0;if((l|0)>=168){q=c[d>>2]|0;c[a>>2]=q;i=j;return}c[h+24>>2]=((l|0)/12|0|0)%7|0;q=c[d>>2]|0;c[a>>2]=q;i=j;return}function hi(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;j=i;i=i+32|0;k=j;l=j+16|0;m=j+12|0;Ze(m,f);f=c[m>>2]|0;if(!((c[1498]|0)==-1)){c[k>>2]=5992;c[k+4>>2]=117;c[k+8>>2]=0;Ae(5992,k,118)}n=(c[5996>>2]|0)+ -1|0;o=c[f+8>>2]|0;if(!((c[f+12>>2]|0)-o>>2>>>0>n>>>0)){p=xb(4)|0;wm(p);ec(p|0,13960,106)}f=c[o+(n<<2)>>2]|0;if((f|0)==0){p=xb(4)|0;wm(p);ec(p|0,13960,106)}ge(c[m>>2]|0)|0;m=c[e>>2]|0;e=b+8|0;b=sc[c[(c[e>>2]|0)+4>>2]&127](e)|0;c[l>>2]=m;m=b+288|0;c[k+0>>2]=c[l+0>>2];l=(Og(d,k,b,m,f,g,0)|0)-b|0;if((l|0)>=288){q=c[d>>2]|0;c[a>>2]=q;i=j;return}c[h+16>>2]=((l|0)/12|0|0)%12|0;q=c[d>>2]|0;c[a>>2]=q;i=j;return}function ii(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;b=i;i=i+32|0;j=b;k=b+16|0;l=b+12|0;Ze(l,f);f=c[l>>2]|0;if(!((c[1498]|0)==-1)){c[j>>2]=5992;c[j+4>>2]=117;c[j+8>>2]=0;Ae(5992,j,118)}m=(c[5996>>2]|0)+ -1|0;n=c[f+8>>2]|0;if(!((c[f+12>>2]|0)-n>>2>>>0>m>>>0)){o=xb(4)|0;wm(o);ec(o|0,13960,106)}f=c[n+(m<<2)>>2]|0;if((f|0)==0){o=xb(4)|0;wm(o);ec(o|0,13960,106)}ge(c[l>>2]|0)|0;l=h+20|0;c[k>>2]=c[e>>2];c[j+0>>2]=c[k+0>>2];k=mi(d,j,g,f,4)|0;if((c[g>>2]&4|0)!=0){p=c[d>>2]|0;c[a>>2]=p;i=b;return}if((k|0)<69){q=k+2e3|0}else{q=(k+ -69|0)>>>0<31?k+1900|0:k}c[l>>2]=q+ -1900;p=c[d>>2]|0;c[a>>2]=p;i=b;return}function ji(b,d,e,f,g,h,j,k,l){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0;l=i;i=i+176|0;m=l;n=l+12|0;o=l+16|0;p=l+120|0;q=l+24|0;r=l+20|0;s=l+124|0;t=l+116|0;u=l+52|0;v=l+28|0;w=l+32|0;x=l+36|0;y=l+40|0;z=l+44|0;A=l+48|0;B=l+112|0;C=l+108|0;D=l+56|0;E=l+60|0;F=l+64|0;G=l+68|0;H=l+72|0;I=l+76|0;J=l+80|0;K=l+84|0;L=l+88|0;M=l+92|0;N=l+96|0;O=l+100|0;P=l+104|0;Q=l+128|0;R=l+132|0;S=l+136|0;T=l+140|0;U=l+144|0;V=l+148|0;W=l+152|0;X=l+156|0;Y=l+160|0;Z=l+164|0;c[h>>2]=0;Ze(A,g);_=c[A>>2]|0;if(!((c[1498]|0)==-1)){c[m>>2]=5992;c[m+4>>2]=117;c[m+8>>2]=0;Ae(5992,m,118)}$=(c[5996>>2]|0)+ -1|0;aa=c[_+8>>2]|0;if(!((c[_+12>>2]|0)-aa>>2>>>0>$>>>0)){ba=xb(4)|0;wm(ba);ec(ba|0,13960,106)}_=c[aa+($<<2)>>2]|0;if((_|0)==0){ba=xb(4)|0;wm(ba);ec(ba|0,13960,106)}ge(c[A>>2]|0)|0;a:do{switch(k<<24>>24|0){case 68:{c[F>>2]=c[e>>2];c[G>>2]=c[f>>2];c[n+0>>2]=c[F+0>>2];c[m+0>>2]=c[G+0>>2];ai(E,d,n,m,g,h,j,5088,5120|0);c[e>>2]=c[E>>2];break};case 106:{c[u>>2]=c[f>>2];c[m+0>>2]=c[u+0>>2];A=mi(e,m,h,_,3)|0;ba=c[h>>2]|0;if((ba&4|0)==0&(A|0)<366){c[j+28>>2]=A;break a}else{c[h>>2]=ba|4;break a}break};case 99:{ba=d+8|0;A=sc[c[(c[ba>>2]|0)+12>>2]&127](ba)|0;c[C>>2]=c[e>>2];c[D>>2]=c[f>>2];ba=a[A]|0;if((ba&1)==0){ca=A+4|0;da=(ba&255)>>>1;ea=A+4|0}else{ba=c[A+8>>2]|0;ca=ba;da=c[A+4>>2]|0;ea=ba}c[n+0>>2]=c[C+0>>2];c[m+0>>2]=c[D+0>>2];ai(B,d,n,m,g,h,j,ea,ca+(da<<2)|0);c[e>>2]=c[B>>2];break};case 73:{ba=j+8|0;c[v>>2]=c[f>>2];c[m+0>>2]=c[v+0>>2];A=mi(e,m,h,_,2)|0;$=c[h>>2]|0;if(($&4|0)==0?(A+ -1|0)>>>0<12:0){c[ba>>2]=A;break a}c[h>>2]=$|4;break};case 65:case 97:{$=c[f>>2]|0;A=d+8|0;ba=sc[c[c[A>>2]>>2]&127](A)|0;c[z>>2]=$;c[m+0>>2]=c[z+0>>2];$=(Og(e,m,ba,ba+168|0,_,h,0)|0)-ba|0;if(($|0)<168){c[j+24>>2]=(($|0)/12|0|0)%7|0}break};case 70:{c[I>>2]=c[e>>2];c[J>>2]=c[f>>2];c[n+0>>2]=c[I+0>>2];c[m+0>>2]=c[J+0>>2];ai(H,d,n,m,g,h,j,5120,5152|0);c[e>>2]=c[H>>2];break};case 101:case 100:{$=j+12|0;c[x>>2]=c[f>>2];c[m+0>>2]=c[x+0>>2];ba=mi(e,m,h,_,2)|0;A=c[h>>2]|0;if((A&4|0)==0?(ba+ -1|0)>>>0<31:0){c[$>>2]=ba;break a}c[h>>2]=A|4;break};case 104:case 66:case 98:{A=c[f>>2]|0;ba=d+8|0;$=sc[c[(c[ba>>2]|0)+4>>2]&127](ba)|0;c[y>>2]=A;c[m+0>>2]=c[y+0>>2];A=(Og(e,m,$,$+288|0,_,h,0)|0)-$|0;if((A|0)<288){c[j+16>>2]=((A|0)/12|0|0)%12|0}break};case 72:{c[w>>2]=c[f>>2];c[m+0>>2]=c[w+0>>2];A=mi(e,m,h,_,2)|0;$=c[h>>2]|0;if(($&4|0)==0&(A|0)<24){c[j+8>>2]=A;break a}else{c[h>>2]=$|4;break a}break};case 109:{c[t>>2]=c[f>>2];c[m+0>>2]=c[t+0>>2];$=mi(e,m,h,_,2)|0;A=c[h>>2]|0;if((A&4|0)==0&($|0)<13){c[j+16>>2]=$+ -1;break a}else{c[h>>2]=A|4;break a}break};case 121:{A=j+20|0;c[o>>2]=c[f>>2];c[m+0>>2]=c[o+0>>2];$=mi(e,m,h,_,4)|0;if((c[h>>2]&4|0)==0){if(($|0)<69){fa=$+2e3|0}else{fa=($+ -69|0)>>>0<31?$+1900|0:$}c[A>>2]=fa+ -1900}break};case 77:{c[s>>2]=c[f>>2];c[m+0>>2]=c[s+0>>2];A=mi(e,m,h,_,2)|0;$=c[h>>2]|0;if(($&4|0)==0&(A|0)<60){c[j+4>>2]=A;break a}else{c[h>>2]=$|4;break a}break};case 112:{$=j+8|0;A=c[f>>2]|0;ba=d+8|0;aa=sc[c[(c[ba>>2]|0)+8>>2]&127](ba)|0;ba=a[aa]|0;if((ba&1)==0){ga=(ba&255)>>>1}else{ga=c[aa+4>>2]|0}ba=a[aa+12|0]|0;if((ba&1)==0){ha=(ba&255)>>>1}else{ha=c[aa+16>>2]|0}if((ga|0)==(0-ha|0)){c[h>>2]=c[h>>2]|4;break a}c[r>>2]=A;c[m+0>>2]=c[r+0>>2];A=Og(e,m,aa,aa+24|0,_,h,0)|0;ba=A-aa|0;if((A|0)==(aa|0)?(c[$>>2]|0)==12:0){c[$>>2]=0;break a}if((ba|0)==12?(ba=c[$>>2]|0,(ba|0)<12):0){c[$>>2]=ba+12}break};case 116:case 110:{c[K>>2]=c[f>>2];c[m+0>>2]=c[K+0>>2];ki(0,e,m,h,_);break};case 114:{c[M>>2]=c[e>>2];c[N>>2]=c[f>>2];c[n+0>>2]=c[M+0>>2];c[m+0>>2]=c[N+0>>2];ai(L,d,n,m,g,h,j,5152,5196|0);c[e>>2]=c[L>>2];break};case 82:{c[P>>2]=c[e>>2];c[Q>>2]=c[f>>2];c[n+0>>2]=c[P+0>>2];c[m+0>>2]=c[Q+0>>2];ai(O,d,n,m,g,h,j,5200,5220|0);c[e>>2]=c[O>>2];break};case 83:{c[q>>2]=c[f>>2];c[m+0>>2]=c[q+0>>2];ba=mi(e,m,h,_,2)|0;$=c[h>>2]|0;if(($&4|0)==0&(ba|0)<61){c[j>>2]=ba;break a}else{c[h>>2]=$|4;break a}break};case 84:{c[S>>2]=c[e>>2];c[T>>2]=c[f>>2];c[n+0>>2]=c[S+0>>2];c[m+0>>2]=c[T+0>>2];ai(R,d,n,m,g,h,j,5224,5256|0);c[e>>2]=c[R>>2];break};case 119:{c[p>>2]=c[f>>2];c[m+0>>2]=c[p+0>>2];$=mi(e,m,h,_,1)|0;ba=c[h>>2]|0;if((ba&4|0)==0&($|0)<7){c[j+24>>2]=$;break a}else{c[h>>2]=ba|4;break a}break};case 120:{ba=c[(c[d>>2]|0)+20>>2]|0;c[U>>2]=c[e>>2];c[V>>2]=c[f>>2];c[n+0>>2]=c[U+0>>2];c[m+0>>2]=c[V+0>>2];nc[ba&63](b,d,n,m,g,h,j);i=l;return};case 88:{ba=d+8|0;$=sc[c[(c[ba>>2]|0)+24>>2]&127](ba)|0;c[X>>2]=c[e>>2];c[Y>>2]=c[f>>2];ba=a[$]|0;if((ba&1)==0){ia=$+4|0;ja=(ba&255)>>>1;ka=$+4|0}else{ba=c[$+8>>2]|0;ia=ba;ja=c[$+4>>2]|0;ka=ba}c[n+0>>2]=c[X+0>>2];c[m+0>>2]=c[Y+0>>2];ai(W,d,n,m,g,h,j,ka,ia+(ja<<2)|0);c[e>>2]=c[W>>2];break};case 89:{c[n>>2]=c[f>>2];c[m+0>>2]=c[n+0>>2];ba=mi(e,m,h,_,4)|0;if((c[h>>2]&4|0)==0){c[j+20>>2]=ba+ -1900}break};case 37:{c[Z>>2]=c[f>>2];c[m+0>>2]=c[Z+0>>2];li(0,e,m,h,_);break};default:{c[h>>2]=c[h>>2]|4}}}while(0);c[b>>2]=c[e>>2];i=l;return}function ki(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0;a=i;a:while(1){g=c[b>>2]|0;do{if((g|0)!=0){h=c[g+12>>2]|0;if((h|0)==(c[g+16>>2]|0)){j=sc[c[(c[g>>2]|0)+36>>2]&127](g)|0}else{j=c[h>>2]|0}if((j|0)==-1){c[b>>2]=0;k=1;break}else{k=(c[b>>2]|0)==0;break}}else{k=1}}while(0);g=c[d>>2]|0;do{if((g|0)!=0){h=c[g+12>>2]|0;if((h|0)==(c[g+16>>2]|0)){l=sc[c[(c[g>>2]|0)+36>>2]&127](g)|0}else{l=c[h>>2]|0}if(!((l|0)==-1)){if(k){m=g;break}else{n=g;break a}}else{c[d>>2]=0;o=15;break}}else{o=15}}while(0);if((o|0)==15){o=0;if(k){n=0;break}else{m=0}}g=c[b>>2]|0;h=c[g+12>>2]|0;if((h|0)==(c[g+16>>2]|0)){p=sc[c[(c[g>>2]|0)+36>>2]&127](g)|0}else{p=c[h>>2]|0}if(!(kc[c[(c[f>>2]|0)+12>>2]&31](f,8192,p)|0)){n=m;break}h=c[b>>2]|0;g=h+12|0;q=c[g>>2]|0;if((q|0)==(c[h+16>>2]|0)){sc[c[(c[h>>2]|0)+40>>2]&127](h)|0;continue}else{c[g>>2]=q+4;continue}}m=c[b>>2]|0;do{if((m|0)!=0){p=c[m+12>>2]|0;if((p|0)==(c[m+16>>2]|0)){r=sc[c[(c[m>>2]|0)+36>>2]&127](m)|0}else{r=c[p>>2]|0}if((r|0)==-1){c[b>>2]=0;s=1;break}else{s=(c[b>>2]|0)==0;break}}else{s=1}}while(0);do{if((n|0)!=0){b=c[n+12>>2]|0;if((b|0)==(c[n+16>>2]|0)){t=sc[c[(c[n>>2]|0)+36>>2]&127](n)|0}else{t=c[b>>2]|0}if((t|0)==-1){c[d>>2]=0;o=37;break}if(s){i=a;return}}else{o=37}}while(0);if((o|0)==37?!s:0){i=a;return}c[e>>2]=c[e>>2]|2;i=a;return}function li(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;a=i;g=c[b>>2]|0;do{if((g|0)!=0){h=c[g+12>>2]|0;if((h|0)==(c[g+16>>2]|0)){j=sc[c[(c[g>>2]|0)+36>>2]&127](g)|0}else{j=c[h>>2]|0}if((j|0)==-1){c[b>>2]=0;k=1;break}else{k=(c[b>>2]|0)==0;break}}else{k=1}}while(0);j=c[d>>2]|0;do{if((j|0)!=0){g=c[j+12>>2]|0;if((g|0)==(c[j+16>>2]|0)){l=sc[c[(c[j>>2]|0)+36>>2]&127](j)|0}else{l=c[g>>2]|0}if(!((l|0)==-1)){if(k){m=j;break}else{n=16;break}}else{c[d>>2]=0;n=14;break}}else{n=14}}while(0);if((n|0)==14){if(k){n=16}else{m=0}}if((n|0)==16){c[e>>2]=c[e>>2]|6;i=a;return}k=c[b>>2]|0;j=c[k+12>>2]|0;if((j|0)==(c[k+16>>2]|0)){o=sc[c[(c[k>>2]|0)+36>>2]&127](k)|0}else{o=c[j>>2]|0}if(!((kc[c[(c[f>>2]|0)+52>>2]&31](f,o,0)|0)<<24>>24==37)){c[e>>2]=c[e>>2]|4;i=a;return}o=c[b>>2]|0;f=o+12|0;j=c[f>>2]|0;if((j|0)==(c[o+16>>2]|0)){sc[c[(c[o>>2]|0)+40>>2]&127](o)|0}else{c[f>>2]=j+4}j=c[b>>2]|0;do{if((j|0)!=0){f=c[j+12>>2]|0;if((f|0)==(c[j+16>>2]|0)){p=sc[c[(c[j>>2]|0)+36>>2]&127](j)|0}else{p=c[f>>2]|0}if((p|0)==-1){c[b>>2]=0;q=1;break}else{q=(c[b>>2]|0)==0;break}}else{q=1}}while(0);do{if((m|0)!=0){b=c[m+12>>2]|0;if((b|0)==(c[m+16>>2]|0)){r=sc[c[(c[m>>2]|0)+36>>2]&127](m)|0}else{r=c[b>>2]|0}if((r|0)==-1){c[d>>2]=0;n=38;break}if(q){i=a;return}}else{n=38}}while(0);if((n|0)==38?!q:0){i=a;return}c[e>>2]=c[e>>2]|2;i=a;return}



function Mm(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0;h=i;if((b|0)==(c[d+8>>2]|0)){if((c[d+4>>2]|0)!=(e|0)){i=h;return}j=d+28|0;if((c[j>>2]|0)==1){i=h;return}c[j>>2]=f;i=h;return}if((b|0)!=(c[d>>2]|0)){j=c[b+8>>2]|0;Ac[c[(c[j>>2]|0)+24>>2]&3](j,d,e,f,g);i=h;return}if((c[d+16>>2]|0)!=(e|0)?(j=d+20|0,(c[j>>2]|0)!=(e|0)):0){c[d+32>>2]=f;k=d+44|0;if((c[k>>2]|0)==4){i=h;return}l=d+52|0;a[l]=0;m=d+53|0;a[m]=0;n=c[b+8>>2]|0;lc[c[(c[n>>2]|0)+20>>2]&15](n,d,e,e,1,g);if((a[m]|0)!=0){if((a[l]|0)==0){o=1;p=13}}else{o=0;p=13}do{if((p|0)==13){c[j>>2]=e;l=d+40|0;c[l>>2]=(c[l>>2]|0)+1;if((c[d+36>>2]|0)==1?(c[d+24>>2]|0)==2:0){a[d+54|0]=1;if(o){break}}else{p=16}if((p|0)==16?o:0){break}c[k>>2]=4;i=h;return}}while(0);c[k>>2]=3;i=h;return}if((f|0)!=1){i=h;return}c[d+32>>2]=1;i=h;return}function Nm(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0;g=i;if((c[d+8>>2]|0)==(b|0)){if((c[d+4>>2]|0)!=(e|0)){i=g;return}h=d+28|0;if((c[h>>2]|0)==1){i=g;return}c[h>>2]=f;i=g;return}if((c[d>>2]|0)!=(b|0)){i=g;return}if((c[d+16>>2]|0)!=(e|0)?(b=d+20|0,(c[b>>2]|0)!=(e|0)):0){c[d+32>>2]=f;c[b>>2]=e;e=d+40|0;c[e>>2]=(c[e>>2]|0)+1;if((c[d+36>>2]|0)==1?(c[d+24>>2]|0)==2:0){a[d+54|0]=1}c[d+44>>2]=4;i=g;return}if((f|0)!=1){i=g;return}c[d+32>>2]=1;i=g;return}function Om(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;j=i;if((b|0)!=(c[d+8>>2]|0)){k=d+52|0;l=a[k]|0;m=d+53|0;n=a[m]|0;o=c[b+12>>2]|0;p=b+(o<<3)+16|0;a[k]=0;a[m]=0;q=c[b+20>>2]|0;r=q>>8;if((q&1|0)==0){s=r}else{s=c[(c[f>>2]|0)+r>>2]|0}r=c[b+16>>2]|0;lc[c[(c[r>>2]|0)+20>>2]&15](r,d,e,f+s|0,(q&2|0)!=0?g:2,h);a:do{if((o|0)>1){q=d+24|0;s=b+8|0;r=d+54|0;t=b+24|0;do{if((a[r]|0)!=0){break a}if((a[k]|0)==0){if((a[m]|0)!=0?(c[s>>2]&1|0)==0:0){break a}}else{if((c[q>>2]|0)==1){break a}if((c[s>>2]&2|0)==0){break a}}a[k]=0;a[m]=0;u=c[t+4>>2]|0;v=u>>8;if((u&1|0)==0){w=v}else{w=c[(c[f>>2]|0)+v>>2]|0}v=c[t>>2]|0;lc[c[(c[v>>2]|0)+20>>2]&15](v,d,e,f+w|0,(u&2|0)!=0?g:2,h);t=t+8|0}while(t>>>0<p>>>0)}}while(0);a[k]=l;a[m]=n;i=j;return}a[d+53|0]=1;if((c[d+4>>2]|0)!=(f|0)){i=j;return}a[d+52|0]=1;f=d+16|0;n=c[f>>2]|0;if((n|0)==0){c[f>>2]=e;c[d+24>>2]=g;c[d+36>>2]=1;if(!((c[d+48>>2]|0)==1&(g|0)==1)){i=j;return}a[d+54|0]=1;i=j;return}if((n|0)!=(e|0)){e=d+36|0;c[e>>2]=(c[e>>2]|0)+1;a[d+54|0]=1;i=j;return}e=d+24|0;n=c[e>>2]|0;if((n|0)==2){c[e>>2]=g;x=g}else{x=n}if(!((c[d+48>>2]|0)==1&(x|0)==1)){i=j;return}a[d+54|0]=1;i=j;return}function Pm(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0;j=i;if((b|0)!=(c[d+8>>2]|0)){k=c[b+8>>2]|0;lc[c[(c[k>>2]|0)+20>>2]&15](k,d,e,f,g,h);i=j;return}a[d+53|0]=1;if((c[d+4>>2]|0)!=(f|0)){i=j;return}a[d+52|0]=1;f=d+16|0;h=c[f>>2]|0;if((h|0)==0){c[f>>2]=e;c[d+24>>2]=g;c[d+36>>2]=1;if(!((c[d+48>>2]|0)==1&(g|0)==1)){i=j;return}a[d+54|0]=1;i=j;return}if((h|0)!=(e|0)){e=d+36|0;c[e>>2]=(c[e>>2]|0)+1;a[d+54|0]=1;i=j;return}e=d+24|0;h=c[e>>2]|0;if((h|0)==2){c[e>>2]=g;l=g}else{l=h}if(!((c[d+48>>2]|0)==1&(l|0)==1)){i=j;return}a[d+54|0]=1;i=j;return}function Qm(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0;h=i;if((c[d+8>>2]|0)!=(b|0)){i=h;return}a[d+53|0]=1;if((c[d+4>>2]|0)!=(f|0)){i=h;return}a[d+52|0]=1;f=d+16|0;b=c[f>>2]|0;if((b|0)==0){c[f>>2]=e;c[d+24>>2]=g;c[d+36>>2]=1;if(!((c[d+48>>2]|0)==1&(g|0)==1)){i=h;return}a[d+54|0]=1;i=h;return}if((b|0)!=(e|0)){e=d+36|0;c[e>>2]=(c[e>>2]|0)+1;a[d+54|0]=1;i=h;return}e=d+24|0;b=c[e>>2]|0;if((b|0)==2){c[e>>2]=g;j=g}else{j=b}if(!((c[d+48>>2]|0)==1&(j|0)==1)){i=h;return}a[d+54|0]=1;i=h;return}function Rm(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0,la=0,ma=0,na=0,oa=0,pa=0,qa=0,ra=0,sa=0,ta=0,ua=0,va=0,wa=0,xa=0,ya=0,za=0,Aa=0,Ba=0,Ca=0,Da=0,Ea=0,Fa=0,Ga=0,Ha=0,Ia=0,Ja=0,Ka=0;b=i;do{if(a>>>0<245){if(a>>>0<11){d=16}else{d=a+11&-8}e=d>>>3;f=c[3580]|0;g=f>>>e;if((g&3|0)!=0){h=(g&1^1)+e|0;j=h<<1;k=14360+(j<<2)|0;l=14360+(j+2<<2)|0;j=c[l>>2]|0;m=j+8|0;n=c[m>>2]|0;do{if((k|0)!=(n|0)){if(n>>>0<(c[14336>>2]|0)>>>0){Ob()}o=n+12|0;if((c[o>>2]|0)==(j|0)){c[o>>2]=k;c[l>>2]=n;break}else{Ob()}}else{c[3580]=f&~(1<<h)}}while(0);n=h<<3;c[j+4>>2]=n|3;l=j+(n|4)|0;c[l>>2]=c[l>>2]|1;p=m;i=b;return p|0}if(d>>>0>(c[14328>>2]|0)>>>0){if((g|0)!=0){l=2<<e;n=g<<e&(l|0-l);l=(n&0-n)+ -1|0;n=l>>>12&16;k=l>>>n;l=k>>>5&8;o=k>>>l;k=o>>>2&4;q=o>>>k;o=q>>>1&2;r=q>>>o;q=r>>>1&1;s=(l|n|k|o|q)+(r>>>q)|0;q=s<<1;r=14360+(q<<2)|0;o=14360+(q+2<<2)|0;q=c[o>>2]|0;k=q+8|0;n=c[k>>2]|0;do{if((r|0)!=(n|0)){if(n>>>0<(c[14336>>2]|0)>>>0){Ob()}l=n+12|0;if((c[l>>2]|0)==(q|0)){c[l>>2]=r;c[o>>2]=n;break}else{Ob()}}else{c[3580]=f&~(1<<s)}}while(0);f=s<<3;n=f-d|0;c[q+4>>2]=d|3;o=q+d|0;c[q+(d|4)>>2]=n|1;c[q+f>>2]=n;f=c[14328>>2]|0;if((f|0)!=0){r=c[14340>>2]|0;e=f>>>3;f=e<<1;g=14360+(f<<2)|0;m=c[3580]|0;j=1<<e;if((m&j|0)!=0){e=14360+(f+2<<2)|0;h=c[e>>2]|0;if(h>>>0<(c[14336>>2]|0)>>>0){Ob()}else{t=e;u=h}}else{c[3580]=m|j;t=14360+(f+2<<2)|0;u=g}c[t>>2]=r;c[u+12>>2]=r;c[r+8>>2]=u;c[r+12>>2]=g}c[14328>>2]=n;c[14340>>2]=o;p=k;i=b;return p|0}o=c[14324>>2]|0;if((o|0)!=0){n=(o&0-o)+ -1|0;o=n>>>12&16;g=n>>>o;n=g>>>5&8;r=g>>>n;g=r>>>2&4;f=r>>>g;r=f>>>1&2;j=f>>>r;f=j>>>1&1;m=c[14624+((n|o|g|r|f)+(j>>>f)<<2)>>2]|0;f=(c[m+4>>2]&-8)-d|0;j=m;r=m;while(1){m=c[j+16>>2]|0;if((m|0)==0){g=c[j+20>>2]|0;if((g|0)==0){break}else{v=g}}else{v=m}m=(c[v+4>>2]&-8)-d|0;g=m>>>0<f>>>0;f=g?m:f;j=v;r=g?v:r}j=c[14336>>2]|0;if(r>>>0<j>>>0){Ob()}k=r+d|0;if(!(r>>>0<k>>>0)){Ob()}q=c[r+24>>2]|0;s=c[r+12>>2]|0;do{if((s|0)==(r|0)){g=r+20|0;m=c[g>>2]|0;if((m|0)==0){o=r+16|0;n=c[o>>2]|0;if((n|0)==0){w=0;break}else{x=n;y=o}}else{x=m;y=g}while(1){g=x+20|0;m=c[g>>2]|0;if((m|0)!=0){x=m;y=g;continue}g=x+16|0;m=c[g>>2]|0;if((m|0)==0){break}else{x=m;y=g}}if(y>>>0<j>>>0){Ob()}else{c[y>>2]=0;w=x;break}}else{g=c[r+8>>2]|0;if(g>>>0<j>>>0){Ob()}m=g+12|0;if((c[m>>2]|0)!=(r|0)){Ob()}o=s+8|0;if((c[o>>2]|0)==(r|0)){c[m>>2]=s;c[o>>2]=g;w=s;break}else{Ob()}}}while(0);do{if((q|0)!=0){s=c[r+28>>2]|0;j=14624+(s<<2)|0;if((r|0)==(c[j>>2]|0)){c[j>>2]=w;if((w|0)==0){c[14324>>2]=c[14324>>2]&~(1<<s);break}}else{if(q>>>0<(c[14336>>2]|0)>>>0){Ob()}s=q+16|0;if((c[s>>2]|0)==(r|0)){c[s>>2]=w}else{c[q+20>>2]=w}if((w|0)==0){break}}if(w>>>0<(c[14336>>2]|0)>>>0){Ob()}c[w+24>>2]=q;s=c[r+16>>2]|0;do{if((s|0)!=0){if(s>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[w+16>>2]=s;c[s+24>>2]=w;break}}}while(0);s=c[r+20>>2]|0;if((s|0)!=0){if(s>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[w+20>>2]=s;c[s+24>>2]=w;break}}}}while(0);if(f>>>0<16){q=f+d|0;c[r+4>>2]=q|3;s=r+(q+4)|0;c[s>>2]=c[s>>2]|1}else{c[r+4>>2]=d|3;c[r+(d|4)>>2]=f|1;c[r+(f+d)>>2]=f;s=c[14328>>2]|0;if((s|0)!=0){q=c[14340>>2]|0;j=s>>>3;s=j<<1;g=14360+(s<<2)|0;o=c[3580]|0;m=1<<j;if((o&m|0)!=0){j=14360+(s+2<<2)|0;n=c[j>>2]|0;if(n>>>0<(c[14336>>2]|0)>>>0){Ob()}else{z=j;A=n}}else{c[3580]=o|m;z=14360+(s+2<<2)|0;A=g}c[z>>2]=q;c[A+12>>2]=q;c[q+8>>2]=A;c[q+12>>2]=g}c[14328>>2]=f;c[14340>>2]=k}p=r+8|0;i=b;return p|0}else{B=d}}else{B=d}}else{if(!(a>>>0>4294967231)){g=a+11|0;q=g&-8;s=c[14324>>2]|0;if((s|0)!=0){m=0-q|0;o=g>>>8;if((o|0)!=0){if(q>>>0>16777215){C=31}else{g=(o+1048320|0)>>>16&8;n=o<<g;o=(n+520192|0)>>>16&4;j=n<<o;n=(j+245760|0)>>>16&2;h=14-(o|g|n)+(j<<n>>>15)|0;C=q>>>(h+7|0)&1|h<<1}}else{C=0}h=c[14624+(C<<2)>>2]|0;a:do{if((h|0)==0){D=m;E=0;F=0}else{if((C|0)==31){G=0}else{G=25-(C>>>1)|0}n=m;j=0;g=q<<G;o=h;e=0;while(1){l=c[o+4>>2]&-8;H=l-q|0;if(H>>>0<n>>>0){if((l|0)==(q|0)){D=H;E=o;F=o;break a}else{I=H;J=o}}else{I=n;J=e}H=c[o+20>>2]|0;l=c[o+(g>>>31<<2)+16>>2]|0;K=(H|0)==0|(H|0)==(l|0)?j:H;if((l|0)==0){D=I;E=K;F=J;break}else{n=I;j=K;g=g<<1;o=l;e=J}}}}while(0);if((E|0)==0&(F|0)==0){h=2<<C;m=s&(h|0-h);if((m|0)==0){B=q;break}h=(m&0-m)+ -1|0;m=h>>>12&16;r=h>>>m;h=r>>>5&8;k=r>>>h;r=k>>>2&4;f=k>>>r;k=f>>>1&2;e=f>>>k;f=e>>>1&1;L=c[14624+((h|m|r|k|f)+(e>>>f)<<2)>>2]|0}else{L=E}if((L|0)==0){M=D;N=F}else{f=D;e=L;k=F;while(1){r=(c[e+4>>2]&-8)-q|0;m=r>>>0<f>>>0;h=m?r:f;r=m?e:k;m=c[e+16>>2]|0;if((m|0)!=0){f=h;e=m;k=r;continue}m=c[e+20>>2]|0;if((m|0)==0){M=h;N=r;break}else{f=h;e=m;k=r}}}if((N|0)!=0?M>>>0<((c[14328>>2]|0)-q|0)>>>0:0){k=c[14336>>2]|0;if(N>>>0<k>>>0){Ob()}e=N+q|0;if(!(N>>>0<e>>>0)){Ob()}f=c[N+24>>2]|0;s=c[N+12>>2]|0;do{if((s|0)==(N|0)){r=N+20|0;m=c[r>>2]|0;if((m|0)==0){h=N+16|0;o=c[h>>2]|0;if((o|0)==0){O=0;break}else{P=o;Q=h}}else{P=m;Q=r}while(1){r=P+20|0;m=c[r>>2]|0;if((m|0)!=0){P=m;Q=r;continue}r=P+16|0;m=c[r>>2]|0;if((m|0)==0){break}else{P=m;Q=r}}if(Q>>>0<k>>>0){Ob()}else{c[Q>>2]=0;O=P;break}}else{r=c[N+8>>2]|0;if(r>>>0<k>>>0){Ob()}m=r+12|0;if((c[m>>2]|0)!=(N|0)){Ob()}h=s+8|0;if((c[h>>2]|0)==(N|0)){c[m>>2]=s;c[h>>2]=r;O=s;break}else{Ob()}}}while(0);do{if((f|0)!=0){s=c[N+28>>2]|0;k=14624+(s<<2)|0;if((N|0)==(c[k>>2]|0)){c[k>>2]=O;if((O|0)==0){c[14324>>2]=c[14324>>2]&~(1<<s);break}}else{if(f>>>0<(c[14336>>2]|0)>>>0){Ob()}s=f+16|0;if((c[s>>2]|0)==(N|0)){c[s>>2]=O}else{c[f+20>>2]=O}if((O|0)==0){break}}if(O>>>0<(c[14336>>2]|0)>>>0){Ob()}c[O+24>>2]=f;s=c[N+16>>2]|0;do{if((s|0)!=0){if(s>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[O+16>>2]=s;c[s+24>>2]=O;break}}}while(0);s=c[N+20>>2]|0;if((s|0)!=0){if(s>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[O+20>>2]=s;c[s+24>>2]=O;break}}}}while(0);b:do{if(!(M>>>0<16)){c[N+4>>2]=q|3;c[N+(q|4)>>2]=M|1;c[N+(M+q)>>2]=M;f=M>>>3;if(M>>>0<256){s=f<<1;k=14360+(s<<2)|0;r=c[3580]|0;h=1<<f;if((r&h|0)!=0){f=14360+(s+2<<2)|0;m=c[f>>2]|0;if(m>>>0<(c[14336>>2]|0)>>>0){Ob()}else{R=f;S=m}}else{c[3580]=r|h;R=14360+(s+2<<2)|0;S=k}c[R>>2]=e;c[S+12>>2]=e;c[N+(q+8)>>2]=S;c[N+(q+12)>>2]=k;break}k=M>>>8;if((k|0)!=0){if(M>>>0>16777215){T=31}else{s=(k+1048320|0)>>>16&8;h=k<<s;k=(h+520192|0)>>>16&4;r=h<<k;h=(r+245760|0)>>>16&2;m=14-(k|s|h)+(r<<h>>>15)|0;T=M>>>(m+7|0)&1|m<<1}}else{T=0}m=14624+(T<<2)|0;c[N+(q+28)>>2]=T;c[N+(q+20)>>2]=0;c[N+(q+16)>>2]=0;h=c[14324>>2]|0;r=1<<T;if((h&r|0)==0){c[14324>>2]=h|r;c[m>>2]=e;c[N+(q+24)>>2]=m;c[N+(q+12)>>2]=e;c[N+(q+8)>>2]=e;break}r=c[m>>2]|0;if((T|0)==31){U=0}else{U=25-(T>>>1)|0}c:do{if((c[r+4>>2]&-8|0)!=(M|0)){m=M<<U;h=r;while(1){V=h+(m>>>31<<2)+16|0;s=c[V>>2]|0;if((s|0)==0){break}if((c[s+4>>2]&-8|0)==(M|0)){W=s;break c}else{m=m<<1;h=s}}if(V>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[V>>2]=e;c[N+(q+24)>>2]=h;c[N+(q+12)>>2]=e;c[N+(q+8)>>2]=e;break b}}else{W=r}}while(0);r=W+8|0;m=c[r>>2]|0;s=c[14336>>2]|0;if(W>>>0<s>>>0){Ob()}if(m>>>0<s>>>0){Ob()}else{c[m+12>>2]=e;c[r>>2]=e;c[N+(q+8)>>2]=m;c[N+(q+12)>>2]=W;c[N+(q+24)>>2]=0;break}}else{m=M+q|0;c[N+4>>2]=m|3;r=N+(m+4)|0;c[r>>2]=c[r>>2]|1}}while(0);p=N+8|0;i=b;return p|0}else{B=q}}else{B=q}}else{B=-1}}}while(0);N=c[14328>>2]|0;if(!(B>>>0>N>>>0)){M=N-B|0;W=c[14340>>2]|0;if(M>>>0>15){c[14340>>2]=W+B;c[14328>>2]=M;c[W+(B+4)>>2]=M|1;c[W+N>>2]=M;c[W+4>>2]=B|3}else{c[14328>>2]=0;c[14340>>2]=0;c[W+4>>2]=N|3;M=W+(N+4)|0;c[M>>2]=c[M>>2]|1}p=W+8|0;i=b;return p|0}W=c[14332>>2]|0;if(B>>>0<W>>>0){M=W-B|0;c[14332>>2]=M;W=c[14344>>2]|0;c[14344>>2]=W+B;c[W+(B+4)>>2]=M|1;c[W+4>>2]=B|3;p=W+8|0;i=b;return p|0}do{if((c[3698]|0)==0){W=Qa(30)|0;if((W+ -1&W|0)==0){c[14800>>2]=W;c[14796>>2]=W;c[14804>>2]=-1;c[14808>>2]=-1;c[14812>>2]=0;c[14764>>2]=0;c[3698]=(rb(0)|0)&-16^1431655768;break}else{Ob()}}}while(0);W=B+48|0;M=c[14800>>2]|0;N=B+47|0;V=M+N|0;U=0-M|0;M=V&U;if(!(M>>>0>B>>>0)){p=0;i=b;return p|0}T=c[14760>>2]|0;if((T|0)!=0?(S=c[14752>>2]|0,R=S+M|0,R>>>0<=S>>>0|R>>>0>T>>>0):0){p=0;i=b;return p|0}d:do{if((c[14764>>2]&4|0)==0){T=c[14344>>2]|0;e:do{if((T|0)!=0){R=14768|0;while(1){S=c[R>>2]|0;if(!(S>>>0>T>>>0)?(X=R+4|0,(S+(c[X>>2]|0)|0)>>>0>T>>>0):0){break}S=c[R+8>>2]|0;if((S|0)==0){Y=182;break e}else{R=S}}if((R|0)!=0){S=V-(c[14332>>2]|0)&U;if(S>>>0<2147483647){O=Ma(S|0)|0;P=(O|0)==((c[R>>2]|0)+(c[X>>2]|0)|0);Z=O;_=S;$=P?O:-1;aa=P?S:0;Y=191}else{ba=0}}else{Y=182}}else{Y=182}}while(0);do{if((Y|0)==182){T=Ma(0)|0;if((T|0)!=(-1|0)){q=T;S=c[14796>>2]|0;P=S+ -1|0;if((P&q|0)==0){ca=M}else{ca=M-q+(P+q&0-S)|0}S=c[14752>>2]|0;q=S+ca|0;if(ca>>>0>B>>>0&ca>>>0<2147483647){P=c[14760>>2]|0;if((P|0)!=0?q>>>0<=S>>>0|q>>>0>P>>>0:0){ba=0;break}P=Ma(ca|0)|0;q=(P|0)==(T|0);Z=P;_=ca;$=q?T:-1;aa=q?ca:0;Y=191}else{ba=0}}else{ba=0}}}while(0);f:do{if((Y|0)==191){q=0-_|0;if(($|0)!=(-1|0)){da=$;ea=aa;Y=202;break d}do{if((Z|0)!=(-1|0)&_>>>0<2147483647&_>>>0<W>>>0?(T=c[14800>>2]|0,P=N-_+T&0-T,P>>>0<2147483647):0){if((Ma(P|0)|0)==(-1|0)){Ma(q|0)|0;ba=aa;break f}else{fa=P+_|0;break}}else{fa=_}}while(0);if((Z|0)==(-1|0)){ba=aa}else{da=Z;ea=fa;Y=202;break d}}}while(0);c[14764>>2]=c[14764>>2]|4;ga=ba;Y=199}else{ga=0;Y=199}}while(0);if((((Y|0)==199?M>>>0<2147483647:0)?(ba=Ma(M|0)|0,M=Ma(0)|0,(M|0)!=(-1|0)&(ba|0)!=(-1|0)&ba>>>0<M>>>0):0)?(fa=M-ba|0,M=fa>>>0>(B+40|0)>>>0,M):0){da=ba;ea=M?fa:ga;Y=202}if((Y|0)==202){ga=(c[14752>>2]|0)+ea|0;c[14752>>2]=ga;if(ga>>>0>(c[14756>>2]|0)>>>0){c[14756>>2]=ga}ga=c[14344>>2]|0;g:do{if((ga|0)!=0){fa=14768|0;while(1){ha=c[fa>>2]|0;ia=fa+4|0;ja=c[ia>>2]|0;if((da|0)==(ha+ja|0)){Y=214;break}M=c[fa+8>>2]|0;if((M|0)==0){break}else{fa=M}}if(((Y|0)==214?(c[fa+12>>2]&8|0)==0:0)?ga>>>0>=ha>>>0&ga>>>0<da>>>0:0){c[ia>>2]=ja+ea;M=(c[14332>>2]|0)+ea|0;ba=ga+8|0;if((ba&7|0)==0){ka=0}else{ka=0-ba&7}ba=M-ka|0;c[14344>>2]=ga+ka;c[14332>>2]=ba;c[ga+(ka+4)>>2]=ba|1;c[ga+(M+4)>>2]=40;c[14348>>2]=c[14808>>2];break}if(da>>>0<(c[14336>>2]|0)>>>0){c[14336>>2]=da}M=da+ea|0;ba=14768|0;while(1){if((c[ba>>2]|0)==(M|0)){Y=224;break}Z=c[ba+8>>2]|0;if((Z|0)==0){break}else{ba=Z}}if((Y|0)==224?(c[ba+12>>2]&8|0)==0:0){c[ba>>2]=da;M=ba+4|0;c[M>>2]=(c[M>>2]|0)+ea;M=da+8|0;if((M&7|0)==0){la=0}else{la=0-M&7}M=da+(ea+8)|0;if((M&7|0)==0){ma=0}else{ma=0-M&7}M=da+(ma+ea)|0;fa=la+B|0;Z=da+fa|0;aa=M-(da+la)-B|0;c[da+(la+4)>>2]=B|3;h:do{if((M|0)!=(c[14344>>2]|0)){if((M|0)==(c[14340>>2]|0)){_=(c[14328>>2]|0)+aa|0;c[14328>>2]=_;c[14340>>2]=Z;c[da+(fa+4)>>2]=_|1;c[da+(_+fa)>>2]=_;break}_=ea+4|0;N=c[da+(_+ma)>>2]|0;if((N&3|0)==1){W=N&-8;$=N>>>3;do{if(!(N>>>0<256)){ca=c[da+((ma|24)+ea)>>2]|0;X=c[da+(ea+12+ma)>>2]|0;do{if((X|0)==(M|0)){U=ma|16;V=da+(_+U)|0;q=c[V>>2]|0;if((q|0)==0){R=da+(U+ea)|0;U=c[R>>2]|0;if((U|0)==0){na=0;break}else{oa=U;pa=R}}else{oa=q;pa=V}while(1){V=oa+20|0;q=c[V>>2]|0;if((q|0)!=0){oa=q;pa=V;continue}V=oa+16|0;q=c[V>>2]|0;if((q|0)==0){break}else{oa=q;pa=V}}if(pa>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[pa>>2]=0;na=oa;break}}else{V=c[da+((ma|8)+ea)>>2]|0;if(V>>>0<(c[14336>>2]|0)>>>0){Ob()}q=V+12|0;if((c[q>>2]|0)!=(M|0)){Ob()}R=X+8|0;if((c[R>>2]|0)==(M|0)){c[q>>2]=X;c[R>>2]=V;na=X;break}else{Ob()}}}while(0);if((ca|0)!=0){X=c[da+(ea+28+ma)>>2]|0;h=14624+(X<<2)|0;if((M|0)==(c[h>>2]|0)){c[h>>2]=na;if((na|0)==0){c[14324>>2]=c[14324>>2]&~(1<<X);break}}else{if(ca>>>0<(c[14336>>2]|0)>>>0){Ob()}X=ca+16|0;if((c[X>>2]|0)==(M|0)){c[X>>2]=na}else{c[ca+20>>2]=na}if((na|0)==0){break}}if(na>>>0<(c[14336>>2]|0)>>>0){Ob()}c[na+24>>2]=ca;X=ma|16;h=c[da+(X+ea)>>2]|0;do{if((h|0)!=0){if(h>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[na+16>>2]=h;c[h+24>>2]=na;break}}}while(0);h=c[da+(_+X)>>2]|0;if((h|0)!=0){if(h>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[na+20>>2]=h;c[h+24>>2]=na;break}}}}else{h=c[da+((ma|8)+ea)>>2]|0;ca=c[da+(ea+12+ma)>>2]|0;V=14360+($<<1<<2)|0;if((h|0)!=(V|0)){if(h>>>0<(c[14336>>2]|0)>>>0){Ob()}if((c[h+12>>2]|0)!=(M|0)){Ob()}}if((ca|0)==(h|0)){c[3580]=c[3580]&~(1<<$);break}if((ca|0)!=(V|0)){if(ca>>>0<(c[14336>>2]|0)>>>0){Ob()}V=ca+8|0;if((c[V>>2]|0)==(M|0)){qa=V}else{Ob()}}else{qa=ca+8|0}c[h+12>>2]=ca;c[qa>>2]=h}}while(0);ra=da+((W|ma)+ea)|0;sa=W+aa|0}else{ra=M;sa=aa}$=ra+4|0;c[$>>2]=c[$>>2]&-2;c[da+(fa+4)>>2]=sa|1;c[da+(sa+fa)>>2]=sa;$=sa>>>3;if(sa>>>0<256){_=$<<1;N=14360+(_<<2)|0;h=c[3580]|0;ca=1<<$;if((h&ca|0)!=0){$=14360+(_+2<<2)|0;V=c[$>>2]|0;if(V>>>0<(c[14336>>2]|0)>>>0){Ob()}else{ta=$;ua=V}}else{c[3580]=h|ca;ta=14360+(_+2<<2)|0;ua=N}c[ta>>2]=Z;c[ua+12>>2]=Z;c[da+(fa+8)>>2]=ua;c[da+(fa+12)>>2]=N;break}N=sa>>>8;if((N|0)!=0){if(sa>>>0>16777215){va=31}else{_=(N+1048320|0)>>>16&8;ca=N<<_;N=(ca+520192|0)>>>16&4;h=ca<<N;ca=(h+245760|0)>>>16&2;V=14-(N|_|ca)+(h<<ca>>>15)|0;va=sa>>>(V+7|0)&1|V<<1}}else{va=0}V=14624+(va<<2)|0;c[da+(fa+28)>>2]=va;c[da+(fa+20)>>2]=0;c[da+(fa+16)>>2]=0;ca=c[14324>>2]|0;h=1<<va;if((ca&h|0)==0){c[14324>>2]=ca|h;c[V>>2]=Z;c[da+(fa+24)>>2]=V;c[da+(fa+12)>>2]=Z;c[da+(fa+8)>>2]=Z;break}h=c[V>>2]|0;if((va|0)==31){wa=0}else{wa=25-(va>>>1)|0}i:do{if((c[h+4>>2]&-8|0)!=(sa|0)){V=sa<<wa;ca=h;while(1){xa=ca+(V>>>31<<2)+16|0;_=c[xa>>2]|0;if((_|0)==0){break}if((c[_+4>>2]&-8|0)==(sa|0)){ya=_;break i}else{V=V<<1;ca=_}}if(xa>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[xa>>2]=Z;c[da+(fa+24)>>2]=ca;c[da+(fa+12)>>2]=Z;c[da+(fa+8)>>2]=Z;break h}}else{ya=h}}while(0);h=ya+8|0;W=c[h>>2]|0;V=c[14336>>2]|0;if(ya>>>0<V>>>0){Ob()}if(W>>>0<V>>>0){Ob()}else{c[W+12>>2]=Z;c[h>>2]=Z;c[da+(fa+8)>>2]=W;c[da+(fa+12)>>2]=ya;c[da+(fa+24)>>2]=0;break}}else{W=(c[14332>>2]|0)+aa|0;c[14332>>2]=W;c[14344>>2]=Z;c[da+(fa+4)>>2]=W|1}}while(0);p=da+(la|8)|0;i=b;return p|0}fa=14768|0;while(1){za=c[fa>>2]|0;if(!(za>>>0>ga>>>0)?(Aa=c[fa+4>>2]|0,Ba=za+Aa|0,Ba>>>0>ga>>>0):0){break}fa=c[fa+8>>2]|0}fa=za+(Aa+ -39)|0;if((fa&7|0)==0){Ca=0}else{Ca=0-fa&7}fa=za+(Aa+ -47+Ca)|0;Z=fa>>>0<(ga+16|0)>>>0?ga:fa;fa=Z+8|0;aa=da+8|0;if((aa&7|0)==0){Da=0}else{Da=0-aa&7}aa=ea+ -40-Da|0;c[14344>>2]=da+Da;c[14332>>2]=aa;c[da+(Da+4)>>2]=aa|1;c[da+(ea+ -36)>>2]=40;c[14348>>2]=c[14808>>2];c[Z+4>>2]=27;c[fa+0>>2]=c[14768>>2];c[fa+4>>2]=c[14772>>2];c[fa+8>>2]=c[14776>>2];c[fa+12>>2]=c[14780>>2];c[14768>>2]=da;c[14772>>2]=ea;c[14780>>2]=0;c[14776>>2]=fa;fa=Z+28|0;c[fa>>2]=7;if((Z+32|0)>>>0<Ba>>>0){aa=fa;while(1){fa=aa+4|0;c[fa>>2]=7;if((aa+8|0)>>>0<Ba>>>0){aa=fa}else{break}}}if((Z|0)!=(ga|0)){aa=Z-ga|0;fa=ga+(aa+4)|0;c[fa>>2]=c[fa>>2]&-2;c[ga+4>>2]=aa|1;c[ga+aa>>2]=aa;fa=aa>>>3;if(aa>>>0<256){M=fa<<1;ba=14360+(M<<2)|0;W=c[3580]|0;h=1<<fa;if((W&h|0)!=0){fa=14360+(M+2<<2)|0;V=c[fa>>2]|0;if(V>>>0<(c[14336>>2]|0)>>>0){Ob()}else{Ea=fa;Fa=V}}else{c[3580]=W|h;Ea=14360+(M+2<<2)|0;Fa=ba}c[Ea>>2]=ga;c[Fa+12>>2]=ga;c[ga+8>>2]=Fa;c[ga+12>>2]=ba;break}ba=aa>>>8;if((ba|0)!=0){if(aa>>>0>16777215){Ga=31}else{M=(ba+1048320|0)>>>16&8;h=ba<<M;ba=(h+520192|0)>>>16&4;W=h<<ba;h=(W+245760|0)>>>16&2;V=14-(ba|M|h)+(W<<h>>>15)|0;Ga=aa>>>(V+7|0)&1|V<<1}}else{Ga=0}V=14624+(Ga<<2)|0;c[ga+28>>2]=Ga;c[ga+20>>2]=0;c[ga+16>>2]=0;h=c[14324>>2]|0;W=1<<Ga;if((h&W|0)==0){c[14324>>2]=h|W;c[V>>2]=ga;c[ga+24>>2]=V;c[ga+12>>2]=ga;c[ga+8>>2]=ga;break}W=c[V>>2]|0;if((Ga|0)==31){Ha=0}else{Ha=25-(Ga>>>1)|0}j:do{if((c[W+4>>2]&-8|0)!=(aa|0)){V=aa<<Ha;h=W;while(1){Ia=h+(V>>>31<<2)+16|0;M=c[Ia>>2]|0;if((M|0)==0){break}if((c[M+4>>2]&-8|0)==(aa|0)){Ja=M;break j}else{V=V<<1;h=M}}if(Ia>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[Ia>>2]=ga;c[ga+24>>2]=h;c[ga+12>>2]=ga;c[ga+8>>2]=ga;break g}}else{Ja=W}}while(0);W=Ja+8|0;aa=c[W>>2]|0;Z=c[14336>>2]|0;if(Ja>>>0<Z>>>0){Ob()}if(aa>>>0<Z>>>0){Ob()}else{c[aa+12>>2]=ga;c[W>>2]=ga;c[ga+8>>2]=aa;c[ga+12>>2]=Ja;c[ga+24>>2]=0;break}}}else{aa=c[14336>>2]|0;if((aa|0)==0|da>>>0<aa>>>0){c[14336>>2]=da}c[14768>>2]=da;c[14772>>2]=ea;c[14780>>2]=0;c[14356>>2]=c[3698];c[14352>>2]=-1;aa=0;do{W=aa<<1;Z=14360+(W<<2)|0;c[14360+(W+3<<2)>>2]=Z;c[14360+(W+2<<2)>>2]=Z;aa=aa+1|0}while((aa|0)!=32);aa=da+8|0;if((aa&7|0)==0){Ka=0}else{Ka=0-aa&7}aa=ea+ -40-Ka|0;c[14344>>2]=da+Ka;c[14332>>2]=aa;c[da+(Ka+4)>>2]=aa|1;c[da+(ea+ -36)>>2]=40;c[14348>>2]=c[14808>>2]}}while(0);ea=c[14332>>2]|0;if(ea>>>0>B>>>0){da=ea-B|0;c[14332>>2]=da;ea=c[14344>>2]|0;c[14344>>2]=ea+B;c[ea+(B+4)>>2]=da|1;c[ea+4>>2]=B|3;p=ea+8|0;i=b;return p|0}}c[(cc()|0)>>2]=12;p=0;i=b;return p|0}function Sm(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0;b=i;if((a|0)==0){i=b;return}d=a+ -8|0;e=c[14336>>2]|0;if(d>>>0<e>>>0){Ob()}f=c[a+ -4>>2]|0;g=f&3;if((g|0)==1){Ob()}h=f&-8;j=a+(h+ -8)|0;do{if((f&1|0)==0){k=c[d>>2]|0;if((g|0)==0){i=b;return}l=-8-k|0;m=a+l|0;n=k+h|0;if(m>>>0<e>>>0){Ob()}if((m|0)==(c[14340>>2]|0)){o=a+(h+ -4)|0;if((c[o>>2]&3|0)!=3){p=m;q=n;break}c[14328>>2]=n;c[o>>2]=c[o>>2]&-2;c[a+(l+4)>>2]=n|1;c[j>>2]=n;i=b;return}o=k>>>3;if(k>>>0<256){k=c[a+(l+8)>>2]|0;r=c[a+(l+12)>>2]|0;s=14360+(o<<1<<2)|0;if((k|0)!=(s|0)){if(k>>>0<e>>>0){Ob()}if((c[k+12>>2]|0)!=(m|0)){Ob()}}if((r|0)==(k|0)){c[3580]=c[3580]&~(1<<o);p=m;q=n;break}if((r|0)!=(s|0)){if(r>>>0<e>>>0){Ob()}s=r+8|0;if((c[s>>2]|0)==(m|0)){t=s}else{Ob()}}else{t=r+8|0}c[k+12>>2]=r;c[t>>2]=k;p=m;q=n;break}k=c[a+(l+24)>>2]|0;r=c[a+(l+12)>>2]|0;do{if((r|0)==(m|0)){s=a+(l+20)|0;o=c[s>>2]|0;if((o|0)==0){u=a+(l+16)|0;v=c[u>>2]|0;if((v|0)==0){w=0;break}else{x=v;y=u}}else{x=o;y=s}while(1){s=x+20|0;o=c[s>>2]|0;if((o|0)!=0){x=o;y=s;continue}s=x+16|0;o=c[s>>2]|0;if((o|0)==0){break}else{x=o;y=s}}if(y>>>0<e>>>0){Ob()}else{c[y>>2]=0;w=x;break}}else{s=c[a+(l+8)>>2]|0;if(s>>>0<e>>>0){Ob()}o=s+12|0;if((c[o>>2]|0)!=(m|0)){Ob()}u=r+8|0;if((c[u>>2]|0)==(m|0)){c[o>>2]=r;c[u>>2]=s;w=r;break}else{Ob()}}}while(0);if((k|0)!=0){r=c[a+(l+28)>>2]|0;s=14624+(r<<2)|0;if((m|0)==(c[s>>2]|0)){c[s>>2]=w;if((w|0)==0){c[14324>>2]=c[14324>>2]&~(1<<r);p=m;q=n;break}}else{if(k>>>0<(c[14336>>2]|0)>>>0){Ob()}r=k+16|0;if((c[r>>2]|0)==(m|0)){c[r>>2]=w}else{c[k+20>>2]=w}if((w|0)==0){p=m;q=n;break}}if(w>>>0<(c[14336>>2]|0)>>>0){Ob()}c[w+24>>2]=k;r=c[a+(l+16)>>2]|0;do{if((r|0)!=0){if(r>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[w+16>>2]=r;c[r+24>>2]=w;break}}}while(0);r=c[a+(l+20)>>2]|0;if((r|0)!=0){if(r>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[w+20>>2]=r;c[r+24>>2]=w;p=m;q=n;break}}else{p=m;q=n}}else{p=m;q=n}}else{p=d;q=h}}while(0);if(!(p>>>0<j>>>0)){Ob()}d=a+(h+ -4)|0;w=c[d>>2]|0;if((w&1|0)==0){Ob()}if((w&2|0)==0){if((j|0)==(c[14344>>2]|0)){e=(c[14332>>2]|0)+q|0;c[14332>>2]=e;c[14344>>2]=p;c[p+4>>2]=e|1;if((p|0)!=(c[14340>>2]|0)){i=b;return}c[14340>>2]=0;c[14328>>2]=0;i=b;return}if((j|0)==(c[14340>>2]|0)){e=(c[14328>>2]|0)+q|0;c[14328>>2]=e;c[14340>>2]=p;c[p+4>>2]=e|1;c[p+e>>2]=e;i=b;return}e=(w&-8)+q|0;x=w>>>3;do{if(!(w>>>0<256)){y=c[a+(h+16)>>2]|0;t=c[a+(h|4)>>2]|0;do{if((t|0)==(j|0)){g=a+(h+12)|0;f=c[g>>2]|0;if((f|0)==0){r=a+(h+8)|0;k=c[r>>2]|0;if((k|0)==0){z=0;break}else{A=k;B=r}}else{A=f;B=g}while(1){g=A+20|0;f=c[g>>2]|0;if((f|0)!=0){A=f;B=g;continue}g=A+16|0;f=c[g>>2]|0;if((f|0)==0){break}else{A=f;B=g}}if(B>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[B>>2]=0;z=A;break}}else{g=c[a+h>>2]|0;if(g>>>0<(c[14336>>2]|0)>>>0){Ob()}f=g+12|0;if((c[f>>2]|0)!=(j|0)){Ob()}r=t+8|0;if((c[r>>2]|0)==(j|0)){c[f>>2]=t;c[r>>2]=g;z=t;break}else{Ob()}}}while(0);if((y|0)!=0){t=c[a+(h+20)>>2]|0;n=14624+(t<<2)|0;if((j|0)==(c[n>>2]|0)){c[n>>2]=z;if((z|0)==0){c[14324>>2]=c[14324>>2]&~(1<<t);break}}else{if(y>>>0<(c[14336>>2]|0)>>>0){Ob()}t=y+16|0;if((c[t>>2]|0)==(j|0)){c[t>>2]=z}else{c[y+20>>2]=z}if((z|0)==0){break}}if(z>>>0<(c[14336>>2]|0)>>>0){Ob()}c[z+24>>2]=y;t=c[a+(h+8)>>2]|0;do{if((t|0)!=0){if(t>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[z+16>>2]=t;c[t+24>>2]=z;break}}}while(0);t=c[a+(h+12)>>2]|0;if((t|0)!=0){if(t>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[z+20>>2]=t;c[t+24>>2]=z;break}}}}else{t=c[a+h>>2]|0;y=c[a+(h|4)>>2]|0;n=14360+(x<<1<<2)|0;if((t|0)!=(n|0)){if(t>>>0<(c[14336>>2]|0)>>>0){Ob()}if((c[t+12>>2]|0)!=(j|0)){Ob()}}if((y|0)==(t|0)){c[3580]=c[3580]&~(1<<x);break}if((y|0)!=(n|0)){if(y>>>0<(c[14336>>2]|0)>>>0){Ob()}n=y+8|0;if((c[n>>2]|0)==(j|0)){C=n}else{Ob()}}else{C=y+8|0}c[t+12>>2]=y;c[C>>2]=t}}while(0);c[p+4>>2]=e|1;c[p+e>>2]=e;if((p|0)==(c[14340>>2]|0)){c[14328>>2]=e;i=b;return}else{D=e}}else{c[d>>2]=w&-2;c[p+4>>2]=q|1;c[p+q>>2]=q;D=q}q=D>>>3;if(D>>>0<256){w=q<<1;d=14360+(w<<2)|0;e=c[3580]|0;C=1<<q;if((e&C|0)!=0){q=14360+(w+2<<2)|0;j=c[q>>2]|0;if(j>>>0<(c[14336>>2]|0)>>>0){Ob()}else{E=q;F=j}}else{c[3580]=e|C;E=14360+(w+2<<2)|0;F=d}c[E>>2]=p;c[F+12>>2]=p;c[p+8>>2]=F;c[p+12>>2]=d;i=b;return}d=D>>>8;if((d|0)!=0){if(D>>>0>16777215){G=31}else{F=(d+1048320|0)>>>16&8;E=d<<F;d=(E+520192|0)>>>16&4;w=E<<d;E=(w+245760|0)>>>16&2;C=14-(d|F|E)+(w<<E>>>15)|0;G=D>>>(C+7|0)&1|C<<1}}else{G=0}C=14624+(G<<2)|0;c[p+28>>2]=G;c[p+20>>2]=0;c[p+16>>2]=0;E=c[14324>>2]|0;w=1<<G;a:do{if((E&w|0)!=0){F=c[C>>2]|0;if((G|0)==31){H=0}else{H=25-(G>>>1)|0}b:do{if((c[F+4>>2]&-8|0)!=(D|0)){d=D<<H;e=F;while(1){I=e+(d>>>31<<2)+16|0;j=c[I>>2]|0;if((j|0)==0){break}if((c[j+4>>2]&-8|0)==(D|0)){J=j;break b}else{d=d<<1;e=j}}if(I>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[I>>2]=p;c[p+24>>2]=e;c[p+12>>2]=p;c[p+8>>2]=p;break a}}else{J=F}}while(0);F=J+8|0;d=c[F>>2]|0;j=c[14336>>2]|0;if(J>>>0<j>>>0){Ob()}if(d>>>0<j>>>0){Ob()}else{c[d+12>>2]=p;c[F>>2]=p;c[p+8>>2]=d;c[p+12>>2]=J;c[p+24>>2]=0;break}}else{c[14324>>2]=E|w;c[C>>2]=p;c[p+24>>2]=C;c[p+12>>2]=p;c[p+8>>2]=p}}while(0);p=(c[14352>>2]|0)+ -1|0;c[14352>>2]=p;if((p|0)==0){K=14776|0}else{i=b;return}while(1){p=c[K>>2]|0;if((p|0)==0){break}else{K=p+8|0}}c[14352>>2]=-1;i=b;return}function Tm(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0;d=i;do{if((a|0)!=0){if(b>>>0>4294967231){c[(cc()|0)>>2]=12;e=0;break}if(b>>>0<11){f=16}else{f=b+11&-8}g=Um(a+ -8|0,f)|0;if((g|0)!=0){e=g+8|0;break}g=Rm(b)|0;if((g|0)==0){e=0}else{h=c[a+ -4>>2]|0;j=(h&-8)-((h&3|0)==0?8:4)|0;sn(g|0,a|0,(j>>>0<b>>>0?j:b)|0)|0;Sm(a);e=g}}else{e=Rm(b)|0}}while(0);i=d;return e|0}function Um(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;d=i;e=a+4|0;f=c[e>>2]|0;g=f&-8;h=a+g|0;j=c[14336>>2]|0;if(a>>>0<j>>>0){Ob()}k=f&3;if(!((k|0)!=1&a>>>0<h>>>0)){Ob()}l=a+(g|4)|0;m=c[l>>2]|0;if((m&1|0)==0){Ob()}if((k|0)==0){if(b>>>0<256){n=0;i=d;return n|0}if(!(g>>>0<(b+4|0)>>>0)?!((g-b|0)>>>0>c[14800>>2]<<1>>>0):0){n=a;i=d;return n|0}n=0;i=d;return n|0}if(!(g>>>0<b>>>0)){k=g-b|0;if(!(k>>>0>15)){n=a;i=d;return n|0}c[e>>2]=f&1|b|2;c[a+(b+4)>>2]=k|3;c[l>>2]=c[l>>2]|1;Vm(a+b|0,k);n=a;i=d;return n|0}if((h|0)==(c[14344>>2]|0)){k=(c[14332>>2]|0)+g|0;if(!(k>>>0>b>>>0)){n=0;i=d;return n|0}l=k-b|0;c[e>>2]=f&1|b|2;c[a+(b+4)>>2]=l|1;c[14344>>2]=a+b;c[14332>>2]=l;n=a;i=d;return n|0}if((h|0)==(c[14340>>2]|0)){l=(c[14328>>2]|0)+g|0;if(l>>>0<b>>>0){n=0;i=d;return n|0}k=l-b|0;if(k>>>0>15){c[e>>2]=f&1|b|2;c[a+(b+4)>>2]=k|1;c[a+l>>2]=k;o=a+(l+4)|0;c[o>>2]=c[o>>2]&-2;p=a+b|0;q=k}else{c[e>>2]=f&1|l|2;f=a+(l+4)|0;c[f>>2]=c[f>>2]|1;p=0;q=0}c[14328>>2]=q;c[14340>>2]=p;n=a;i=d;return n|0}if((m&2|0)!=0){n=0;i=d;return n|0}p=(m&-8)+g|0;if(p>>>0<b>>>0){n=0;i=d;return n|0}q=p-b|0;f=m>>>3;do{if(!(m>>>0<256)){l=c[a+(g+24)>>2]|0;k=c[a+(g+12)>>2]|0;do{if((k|0)==(h|0)){o=a+(g+20)|0;r=c[o>>2]|0;if((r|0)==0){s=a+(g+16)|0;t=c[s>>2]|0;if((t|0)==0){u=0;break}else{v=t;w=s}}else{v=r;w=o}while(1){o=v+20|0;r=c[o>>2]|0;if((r|0)!=0){v=r;w=o;continue}o=v+16|0;r=c[o>>2]|0;if((r|0)==0){break}else{v=r;w=o}}if(w>>>0<j>>>0){Ob()}else{c[w>>2]=0;u=v;break}}else{o=c[a+(g+8)>>2]|0;if(o>>>0<j>>>0){Ob()}r=o+12|0;if((c[r>>2]|0)!=(h|0)){Ob()}s=k+8|0;if((c[s>>2]|0)==(h|0)){c[r>>2]=k;c[s>>2]=o;u=k;break}else{Ob()}}}while(0);if((l|0)!=0){k=c[a+(g+28)>>2]|0;o=14624+(k<<2)|0;if((h|0)==(c[o>>2]|0)){c[o>>2]=u;if((u|0)==0){c[14324>>2]=c[14324>>2]&~(1<<k);break}}else{if(l>>>0<(c[14336>>2]|0)>>>0){Ob()}k=l+16|0;if((c[k>>2]|0)==(h|0)){c[k>>2]=u}else{c[l+20>>2]=u}if((u|0)==0){break}}if(u>>>0<(c[14336>>2]|0)>>>0){Ob()}c[u+24>>2]=l;k=c[a+(g+16)>>2]|0;do{if((k|0)!=0){if(k>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[u+16>>2]=k;c[k+24>>2]=u;break}}}while(0);k=c[a+(g+20)>>2]|0;if((k|0)!=0){if(k>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[u+20>>2]=k;c[k+24>>2]=u;break}}}}else{k=c[a+(g+8)>>2]|0;l=c[a+(g+12)>>2]|0;o=14360+(f<<1<<2)|0;if((k|0)!=(o|0)){if(k>>>0<j>>>0){Ob()}if((c[k+12>>2]|0)!=(h|0)){Ob()}}if((l|0)==(k|0)){c[3580]=c[3580]&~(1<<f);break}if((l|0)!=(o|0)){if(l>>>0<j>>>0){Ob()}o=l+8|0;if((c[o>>2]|0)==(h|0)){x=o}else{Ob()}}else{x=l+8|0}c[k+12>>2]=l;c[x>>2]=k}}while(0);if(q>>>0<16){c[e>>2]=p|c[e>>2]&1|2;x=a+(p|4)|0;c[x>>2]=c[x>>2]|1;n=a;i=d;return n|0}else{c[e>>2]=c[e>>2]&1|b|2;c[a+(b+4)>>2]=q|3;e=a+(p|4)|0;c[e>>2]=c[e>>2]|1;Vm(a+b|0,q);n=a;i=d;return n|0}return 0}function Vm(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0;d=i;e=a+b|0;f=c[a+4>>2]|0;do{if((f&1|0)==0){g=c[a>>2]|0;if((f&3|0)==0){i=d;return}h=a+(0-g)|0;j=g+b|0;k=c[14336>>2]|0;if(h>>>0<k>>>0){Ob()}if((h|0)==(c[14340>>2]|0)){l=a+(b+4)|0;if((c[l>>2]&3|0)!=3){m=h;n=j;break}c[14328>>2]=j;c[l>>2]=c[l>>2]&-2;c[a+(4-g)>>2]=j|1;c[e>>2]=j;i=d;return}l=g>>>3;if(g>>>0<256){o=c[a+(8-g)>>2]|0;p=c[a+(12-g)>>2]|0;q=14360+(l<<1<<2)|0;if((o|0)!=(q|0)){if(o>>>0<k>>>0){Ob()}if((c[o+12>>2]|0)!=(h|0)){Ob()}}if((p|0)==(o|0)){c[3580]=c[3580]&~(1<<l);m=h;n=j;break}if((p|0)!=(q|0)){if(p>>>0<k>>>0){Ob()}q=p+8|0;if((c[q>>2]|0)==(h|0)){r=q}else{Ob()}}else{r=p+8|0}c[o+12>>2]=p;c[r>>2]=o;m=h;n=j;break}o=c[a+(24-g)>>2]|0;p=c[a+(12-g)>>2]|0;do{if((p|0)==(h|0)){q=16-g|0;l=a+(q+4)|0;s=c[l>>2]|0;if((s|0)==0){t=a+q|0;q=c[t>>2]|0;if((q|0)==0){u=0;break}else{v=q;w=t}}else{v=s;w=l}while(1){l=v+20|0;s=c[l>>2]|0;if((s|0)!=0){v=s;w=l;continue}l=v+16|0;s=c[l>>2]|0;if((s|0)==0){break}else{v=s;w=l}}if(w>>>0<k>>>0){Ob()}else{c[w>>2]=0;u=v;break}}else{l=c[a+(8-g)>>2]|0;if(l>>>0<k>>>0){Ob()}s=l+12|0;if((c[s>>2]|0)!=(h|0)){Ob()}t=p+8|0;if((c[t>>2]|0)==(h|0)){c[s>>2]=p;c[t>>2]=l;u=p;break}else{Ob()}}}while(0);if((o|0)!=0){p=c[a+(28-g)>>2]|0;k=14624+(p<<2)|0;if((h|0)==(c[k>>2]|0)){c[k>>2]=u;if((u|0)==0){c[14324>>2]=c[14324>>2]&~(1<<p);m=h;n=j;break}}else{if(o>>>0<(c[14336>>2]|0)>>>0){Ob()}p=o+16|0;if((c[p>>2]|0)==(h|0)){c[p>>2]=u}else{c[o+20>>2]=u}if((u|0)==0){m=h;n=j;break}}if(u>>>0<(c[14336>>2]|0)>>>0){Ob()}c[u+24>>2]=o;p=16-g|0;k=c[a+p>>2]|0;do{if((k|0)!=0){if(k>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[u+16>>2]=k;c[k+24>>2]=u;break}}}while(0);k=c[a+(p+4)>>2]|0;if((k|0)!=0){if(k>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[u+20>>2]=k;c[k+24>>2]=u;m=h;n=j;break}}else{m=h;n=j}}else{m=h;n=j}}else{m=a;n=b}}while(0);u=c[14336>>2]|0;if(e>>>0<u>>>0){Ob()}v=a+(b+4)|0;w=c[v>>2]|0;if((w&2|0)==0){if((e|0)==(c[14344>>2]|0)){r=(c[14332>>2]|0)+n|0;c[14332>>2]=r;c[14344>>2]=m;c[m+4>>2]=r|1;if((m|0)!=(c[14340>>2]|0)){i=d;return}c[14340>>2]=0;c[14328>>2]=0;i=d;return}if((e|0)==(c[14340>>2]|0)){r=(c[14328>>2]|0)+n|0;c[14328>>2]=r;c[14340>>2]=m;c[m+4>>2]=r|1;c[m+r>>2]=r;i=d;return}r=(w&-8)+n|0;f=w>>>3;do{if(!(w>>>0<256)){k=c[a+(b+24)>>2]|0;g=c[a+(b+12)>>2]|0;do{if((g|0)==(e|0)){o=a+(b+20)|0;l=c[o>>2]|0;if((l|0)==0){t=a+(b+16)|0;s=c[t>>2]|0;if((s|0)==0){x=0;break}else{y=s;z=t}}else{y=l;z=o}while(1){o=y+20|0;l=c[o>>2]|0;if((l|0)!=0){y=l;z=o;continue}o=y+16|0;l=c[o>>2]|0;if((l|0)==0){break}else{y=l;z=o}}if(z>>>0<u>>>0){Ob()}else{c[z>>2]=0;x=y;break}}else{o=c[a+(b+8)>>2]|0;if(o>>>0<u>>>0){Ob()}l=o+12|0;if((c[l>>2]|0)!=(e|0)){Ob()}t=g+8|0;if((c[t>>2]|0)==(e|0)){c[l>>2]=g;c[t>>2]=o;x=g;break}else{Ob()}}}while(0);if((k|0)!=0){g=c[a+(b+28)>>2]|0;j=14624+(g<<2)|0;if((e|0)==(c[j>>2]|0)){c[j>>2]=x;if((x|0)==0){c[14324>>2]=c[14324>>2]&~(1<<g);break}}else{if(k>>>0<(c[14336>>2]|0)>>>0){Ob()}g=k+16|0;if((c[g>>2]|0)==(e|0)){c[g>>2]=x}else{c[k+20>>2]=x}if((x|0)==0){break}}if(x>>>0<(c[14336>>2]|0)>>>0){Ob()}c[x+24>>2]=k;g=c[a+(b+16)>>2]|0;do{if((g|0)!=0){if(g>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[x+16>>2]=g;c[g+24>>2]=x;break}}}while(0);g=c[a+(b+20)>>2]|0;if((g|0)!=0){if(g>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[x+20>>2]=g;c[g+24>>2]=x;break}}}}else{g=c[a+(b+8)>>2]|0;k=c[a+(b+12)>>2]|0;j=14360+(f<<1<<2)|0;if((g|0)!=(j|0)){if(g>>>0<u>>>0){Ob()}if((c[g+12>>2]|0)!=(e|0)){Ob()}}if((k|0)==(g|0)){c[3580]=c[3580]&~(1<<f);break}if((k|0)!=(j|0)){if(k>>>0<u>>>0){Ob()}j=k+8|0;if((c[j>>2]|0)==(e|0)){A=j}else{Ob()}}else{A=k+8|0}c[g+12>>2]=k;c[A>>2]=g}}while(0);c[m+4>>2]=r|1;c[m+r>>2]=r;if((m|0)==(c[14340>>2]|0)){c[14328>>2]=r;i=d;return}else{B=r}}else{c[v>>2]=w&-2;c[m+4>>2]=n|1;c[m+n>>2]=n;B=n}n=B>>>3;if(B>>>0<256){w=n<<1;v=14360+(w<<2)|0;r=c[3580]|0;A=1<<n;if((r&A|0)!=0){n=14360+(w+2<<2)|0;e=c[n>>2]|0;if(e>>>0<(c[14336>>2]|0)>>>0){Ob()}else{C=n;D=e}}else{c[3580]=r|A;C=14360+(w+2<<2)|0;D=v}c[C>>2]=m;c[D+12>>2]=m;c[m+8>>2]=D;c[m+12>>2]=v;i=d;return}v=B>>>8;if((v|0)!=0){if(B>>>0>16777215){E=31}else{D=(v+1048320|0)>>>16&8;C=v<<D;v=(C+520192|0)>>>16&4;w=C<<v;C=(w+245760|0)>>>16&2;A=14-(v|D|C)+(w<<C>>>15)|0;E=B>>>(A+7|0)&1|A<<1}}else{E=0}A=14624+(E<<2)|0;c[m+28>>2]=E;c[m+20>>2]=0;c[m+16>>2]=0;C=c[14324>>2]|0;w=1<<E;if((C&w|0)==0){c[14324>>2]=C|w;c[A>>2]=m;c[m+24>>2]=A;c[m+12>>2]=m;c[m+8>>2]=m;i=d;return}w=c[A>>2]|0;if((E|0)==31){F=0}else{F=25-(E>>>1)|0}a:do{if((c[w+4>>2]&-8|0)==(B|0)){G=w}else{E=B<<F;A=w;while(1){H=A+(E>>>31<<2)+16|0;C=c[H>>2]|0;if((C|0)==0){break}if((c[C+4>>2]&-8|0)==(B|0)){G=C;break a}else{E=E<<1;A=C}}if(H>>>0<(c[14336>>2]|0)>>>0){Ob()}c[H>>2]=m;c[m+24>>2]=A;c[m+12>>2]=m;c[m+8>>2]=m;i=d;return}}while(0);H=G+8|0;B=c[H>>2]|0;w=c[14336>>2]|0;if(G>>>0<w>>>0){Ob()}if(B>>>0<w>>>0){Ob()}c[B+12>>2]=m;c[H>>2]=m;c[m+8>>2]=B;c[m+12>>2]=G;c[m+24>>2]=0;i=d;return}function Wm(a){a=a|0;var b=0,d=0,e=0,f=0;b=i;d=(a|0)==0?1:a;while(1){e=Rm(d)|0;if((e|0)!=0){f=6;break}a=c[3704]|0;c[3704]=a+0;if((a|0)==0){f=5;break}wc[a&0]()}if((f|0)==5){d=xb(4)|0;c[d>>2]=14832;ec(d|0,14880,114)}else if((f|0)==6){i=b;return e|0}return 0}function Xm(a){a=a|0;var b=0,c=0;b=i;c=Wm(a)|0;i=b;return c|0}function Ym(a){a=a|0;var b=0;b=i;if((a|0)!=0){Sm(a)}i=b;return}function Zm(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function _m(a){a=a|0;var b=0;b=i;Xa(a|0);Ym(a);i=b;return}function $m(a){a=a|0;var b=0;b=i;Xa(a|0);i=b;return}function an(a){a=a|0;return 14848}function bn(){var a=0;a=xb(4)|0;c[a>>2]=14832;ec(a|0,14880,114)}function cn(b,e,f){b=b|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0.0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,J=0,K=0,L=0,M=0,N=0,O=0.0,P=0,Q=0.0,R=0,S=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0.0,ba=0,ca=0.0,da=0,fa=0.0,ga=0,ha=0.0,ia=0,ja=0.0,ka=0,la=0,ma=0,na=0,oa=0,pa=0,qa=0,ra=0.0,sa=0,ta=0.0,ua=0,va=0,wa=0,xa=0,ya=0.0,za=0,Aa=0.0,Ba=0.0,Ca=0,Da=0.0,Ea=0,Fa=0,Ga=0,Ha=0,Ia=0,Ja=0,Ka=0,La=0,Ma=0,Na=0,Oa=0,Pa=0,Qa=0,Ra=0,Sa=0,Ta=0,Ua=0,Va=0,Wa=0,Xa=0,Ya=0,Za=0,_a=0,$a=0,ab=0,bb=0,cb=0,db=0,eb=0,fb=0,gb=0,hb=0,ib=0,jb=0,kb=0,lb=0,mb=0,nb=0,ob=0,pb=0,qb=0,rb=0,sb=0,tb=0,ub=0,vb=0,xb=0,yb=0,zb=0,Ab=0,Bb=0,Cb=0,Db=0,Eb=0,Fb=0,Gb=0,Hb=0,Ib=0,Jb=0,Kb=0,Lb=0,Mb=0,Nb=0,Ob=0,Qb=0,Rb=0,Sb=0,Tb=0,Ub=0,Vb=0,Wb=0,Xb=0,Yb=0,Zb=0,_b=0,$b=0,ac=0,bc=0,ec=0,fc=0,gc=0,hc=0,ic=0,jc=0,kc=0,lc=0,mc=0,nc=0,oc=0,pc=0,qc=0,rc=0.0,sc=0,tc=0,uc=0.0,vc=0.0,wc=0.0,xc=0.0,yc=0.0,zc=0.0,Ac=0,Bc=0,Cc=0.0,Dc=0,Ec=0.0,Fc=0,Gc=0,Hc=0,Ic=0;g=i;i=i+512|0;h=g;if((e|0)==0){j=24;k=-149}else if((e|0)==1){j=53;k=-1074}else if((e|0)==2){j=53;k=-1074}else{l=0.0;i=g;return+l}e=b+4|0;m=b+100|0;do{n=c[e>>2]|0;if(n>>>0<(c[m>>2]|0)>>>0){c[e>>2]=n+1;o=d[n]|0}else{o=fn(b)|0}}while((Pb(o|0)|0)!=0);do{if((o|0)==43|(o|0)==45){n=1-(((o|0)==45)<<1)|0;p=c[e>>2]|0;if(p>>>0<(c[m>>2]|0)>>>0){c[e>>2]=p+1;q=d[p]|0;r=n;break}else{q=fn(b)|0;r=n;break}}else{q=o;r=1}}while(0);o=q;q=0;while(1){if((o|32|0)!=(a[14896+q|0]|0)){s=o;t=q;break}do{if(q>>>0<7){n=c[e>>2]|0;if(n>>>0<(c[m>>2]|0)>>>0){c[e>>2]=n+1;u=d[n]|0;break}else{u=fn(b)|0;break}}else{u=o}}while(0);n=q+1|0;if(n>>>0<8){o=u;q=n}else{s=u;t=n;break}}do{if((t|0)==3){v=23}else if((t|0)!=8){u=(f|0)==0;if(!(t>>>0<4|u)){if((t|0)==8){break}else{v=23;break}}a:do{if((t|0)==0){q=s;o=0;while(1){if((q|32|0)!=(a[14912+o|0]|0)){w=q;z=o;break a}do{if(o>>>0<2){n=c[e>>2]|0;if(n>>>0<(c[m>>2]|0)>>>0){c[e>>2]=n+1;A=d[n]|0;break}else{A=fn(b)|0;break}}else{A=q}}while(0);n=o+1|0;if(n>>>0<3){q=A;o=n}else{w=A;z=n;break}}}else{w=s;z=t}}while(0);if((z|0)==0){do{if((w|0)==48){o=c[e>>2]|0;if(o>>>0<(c[m>>2]|0)>>>0){c[e>>2]=o+1;B=d[o]|0}else{B=fn(b)|0}if((B|32|0)!=120){if((c[m>>2]|0)==0){C=48;break}c[e>>2]=(c[e>>2]|0)+ -1;C=48;break}o=c[e>>2]|0;if(o>>>0<(c[m>>2]|0)>>>0){c[e>>2]=o+1;D=d[o]|0;E=0}else{D=fn(b)|0;E=0}while(1){if((D|0)==46){v=70;break}else if((D|0)!=48){F=0;G=0;H=0;J=0;K=D;L=E;M=0;N=0;O=1.0;P=0;Q=0.0;break}o=c[e>>2]|0;if(o>>>0<(c[m>>2]|0)>>>0){c[e>>2]=o+1;D=d[o]|0;E=1;continue}else{D=fn(b)|0;E=1;continue}}b:do{if((v|0)==70){o=c[e>>2]|0;if(o>>>0<(c[m>>2]|0)>>>0){c[e>>2]=o+1;R=d[o]|0}else{R=fn(b)|0}if((R|0)==48){o=-1;q=-1;while(1){n=c[e>>2]|0;if(n>>>0<(c[m>>2]|0)>>>0){c[e>>2]=n+1;S=d[n]|0}else{S=fn(b)|0}if((S|0)!=48){F=0;G=0;H=o;J=q;K=S;L=1;M=1;N=0;O=1.0;P=0;Q=0.0;break b}n=pn(o|0,q|0,-1,-1)|0;o=n;q=I}}else{F=0;G=0;H=0;J=0;K=R;L=E;M=1;N=0;O=1.0;P=0;Q=0.0}}}while(0);c:while(1){q=K+ -48|0;do{if(!(q>>>0<10)){o=K|32;n=(K|0)==46;if(!((o+ -97|0)>>>0<6|n)){U=K;break c}if(n){if((M|0)==0){V=G;W=F;X=G;Y=F;Z=L;_=1;$=N;aa=O;ba=P;ca=Q;break}else{U=46;break c}}else{da=(K|0)>57?o+ -87|0:q;v=84;break}}else{da=q;v=84}}while(0);if((v|0)==84){v=0;do{if(!((F|0)<0|(F|0)==0&G>>>0<8)){if((F|0)<0|(F|0)==0&G>>>0<14){fa=O*.0625;ga=N;ha=fa;ia=P;ja=Q+fa*+(da|0);break}if((da|0)!=0&(N|0)==0){ga=1;ha=O;ia=P;ja=Q+O*.5}else{ga=N;ha=O;ia=P;ja=Q}}else{ga=N;ha=O;ia=da+(P<<4)|0;ja=Q}}while(0);q=pn(G|0,F|0,1,0)|0;V=H;W=J;X=q;Y=I;Z=1;_=M;$=ga;aa=ha;ba=ia;ca=ja}q=c[e>>2]|0;if(q>>>0<(c[m>>2]|0)>>>0){c[e>>2]=q+1;F=Y;G=X;H=V;J=W;K=d[q]|0;L=Z;M=_;N=$;O=aa;P=ba;Q=ca;continue}else{F=Y;G=X;H=V;J=W;K=fn(b)|0;L=Z;M=_;N=$;O=aa;P=ba;Q=ca;continue}}if((L|0)==0){q=(c[m>>2]|0)==0;if(!q){c[e>>2]=(c[e>>2]|0)+ -1}if(!u){if(!q?(q=c[e>>2]|0,c[e>>2]=q+ -1,(M|0)!=0):0){c[e>>2]=q+ -2}}else{en(b,0)}l=+(r|0)*0.0;i=g;return+l}q=(M|0)==0;o=q?G:H;n=q?F:J;if((F|0)<0|(F|0)==0&G>>>0<8){q=G;p=F;ka=P;while(1){la=ka<<4;ma=pn(q|0,p|0,1,0)|0;na=I;if((na|0)<0|(na|0)==0&ma>>>0<8){q=ma;p=na;ka=la}else{oa=la;break}}}else{oa=P}do{if((U|32|0)==112){ka=dn(b,f)|0;p=I;if((ka|0)==0&(p|0)==-2147483648){if(u){en(b,0);l=0.0;i=g;return+l}else{if((c[m>>2]|0)==0){pa=0;qa=0;break}c[e>>2]=(c[e>>2]|0)+ -1;pa=0;qa=0;break}}else{pa=ka;qa=p}}else{if((c[m>>2]|0)==0){pa=0;qa=0}else{c[e>>2]=(c[e>>2]|0)+ -1;pa=0;qa=0}}}while(0);p=tn(o|0,n|0,2)|0;ka=pn(p|0,I|0,-32,-1)|0;p=pn(ka|0,I|0,pa|0,qa|0)|0;ka=I;if((oa|0)==0){l=+(r|0)*0.0;i=g;return+l}if((ka|0)>0|(ka|0)==0&p>>>0>(0-k|0)>>>0){c[(cc()|0)>>2]=34;l=+(r|0)*1.7976931348623157e+308*1.7976931348623157e+308;i=g;return+l}q=k+ -106|0;la=((q|0)<0)<<31>>31;if((ka|0)<(la|0)|(ka|0)==(la|0)&p>>>0<q>>>0){c[(cc()|0)>>2]=34;l=+(r|0)*2.2250738585072014e-308*2.2250738585072014e-308;i=g;return+l}if((oa|0)>-1){q=p;la=ka;na=oa;fa=Q;while(1){ma=na<<1;if(!(fa>=.5)){ra=fa;sa=ma}else{ra=fa+-1.0;sa=ma|1}ta=fa+ra;ma=pn(q|0,la|0,-1,-1)|0;ua=I;if((sa|0)>-1){q=ma;la=ua;na=sa;fa=ta}else{va=ma;wa=ua;xa=sa;ya=ta;break}}}else{va=p;wa=ka;xa=oa;ya=Q}na=on(32,0,k|0,((k|0)<0)<<31>>31|0)|0;la=pn(va|0,wa|0,na|0,I|0)|0;na=I;if(0>(na|0)|0==(na|0)&j>>>0>la>>>0){za=(la|0)<0?0:la}else{za=j}if((za|0)<53){fa=+(r|0);ta=+dc(+(+gn(1.0,84-za|0)),+fa);if((za|0)<32&ya!=0.0){la=xa&1;Aa=fa;Ba=ta;Ca=(la^1)+xa|0;Da=(la|0)==0?0.0:ya}else{Aa=fa;Ba=ta;Ca=xa;Da=ya}}else{Aa=+(r|0);Ba=0.0;Ca=xa;Da=ya}ta=Aa*Da+(Ba+Aa*+(Ca>>>0))-Ba;if(!(ta!=0.0)){c[(cc()|0)>>2]=34}l=+hn(ta,va);i=g;return+l}else{C=w}}while(0);la=k+j|0;na=0-la|0;q=C;n=0;while(1){if((q|0)==46){v=139;break}else if((q|0)!=48){Ea=q;Fa=0;Ga=0;Ha=n;Ia=0;break}o=c[e>>2]|0;if(o>>>0<(c[m>>2]|0)>>>0){c[e>>2]=o+1;q=d[o]|0;n=1;continue}else{q=fn(b)|0;n=1;continue}}d:do{if((v|0)==139){q=c[e>>2]|0;if(q>>>0<(c[m>>2]|0)>>>0){c[e>>2]=q+1;Ja=d[q]|0}else{Ja=fn(b)|0}if((Ja|0)==48){q=-1;o=-1;while(1){ua=c[e>>2]|0;if(ua>>>0<(c[m>>2]|0)>>>0){c[e>>2]=ua+1;Ka=d[ua]|0}else{Ka=fn(b)|0}if((Ka|0)!=48){Ea=Ka;Fa=q;Ga=o;Ha=1;Ia=1;break d}ua=pn(q|0,o|0,-1,-1)|0;q=ua;o=I}}else{Ea=Ja;Fa=0;Ga=0;Ha=n;Ia=1}}}while(0);c[h>>2]=0;n=Ea+ -48|0;o=(Ea|0)==46;e:do{if(n>>>0<10|o){q=h+496|0;ka=Ea;p=0;ua=0;ma=o;La=n;Ma=Fa;Na=Ga;Oa=Ha;Pa=Ia;Qa=0;Ra=0;Sa=0;while(1){do{if(ma){if((Pa|0)==0){Ta=p;Ua=ua;Va=p;Wa=ua;Xa=Oa;Ya=1;Za=Qa;_a=Ra;$a=Sa}else{ab=ka;bb=Ma;cb=Na;db=p;eb=ua;fb=Oa;gb=Qa;hb=Ra;ib=Sa;break e}}else{jb=pn(p|0,ua|0,1,0)|0;kb=I;lb=(ka|0)!=48;if((Ra|0)>=125){if(!lb){Ta=Ma;Ua=Na;Va=jb;Wa=kb;Xa=Oa;Ya=Pa;Za=Qa;_a=Ra;$a=Sa;break}c[q>>2]=c[q>>2]|1;Ta=Ma;Ua=Na;Va=jb;Wa=kb;Xa=Oa;Ya=Pa;Za=Qa;_a=Ra;$a=Sa;break}mb=h+(Ra<<2)|0;if((Qa|0)==0){nb=La}else{nb=ka+ -48+((c[mb>>2]|0)*10|0)|0}c[mb>>2]=nb;mb=Qa+1|0;ob=(mb|0)==9;Ta=Ma;Ua=Na;Va=jb;Wa=kb;Xa=1;Ya=Pa;Za=ob?0:mb;_a=(ob&1)+Ra|0;$a=lb?jb:Sa}}while(0);jb=c[e>>2]|0;if(jb>>>0<(c[m>>2]|0)>>>0){c[e>>2]=jb+1;pb=d[jb]|0}else{pb=fn(b)|0}jb=pb+ -48|0;lb=(pb|0)==46;if(jb>>>0<10|lb){ka=pb;p=Va;ua=Wa;ma=lb;La=jb;Ma=Ta;Na=Ua;Oa=Xa;Pa=Ya;Qa=Za;Ra=_a;Sa=$a}else{qb=pb;rb=Va;sb=Ta;tb=Wa;ub=Ua;vb=Xa;xb=Ya;yb=Za;zb=_a;Ab=$a;v=162;break}}}else{qb=Ea;rb=0;sb=Fa;tb=0;ub=Ga;vb=Ha;xb=Ia;yb=0;zb=0;Ab=0;v=162}}while(0);if((v|0)==162){n=(xb|0)==0;ab=qb;bb=n?rb:sb;cb=n?tb:ub;db=rb;eb=tb;fb=vb;gb=yb;hb=zb;ib=Ab}n=(fb|0)!=0;if(n?(ab|32|0)==101:0){o=dn(b,f)|0;Sa=I;do{if((o|0)==0&(Sa|0)==-2147483648){if(u){en(b,0);l=0.0;i=g;return+l}else{if((c[m>>2]|0)==0){Bb=0;Cb=0;break}c[e>>2]=(c[e>>2]|0)+ -1;Bb=0;Cb=0;break}}else{Bb=o;Cb=Sa}}while(0);Sa=pn(Bb|0,Cb|0,bb|0,cb|0)|0;Db=Sa;Eb=I}else{if((ab|0)>-1?(c[m>>2]|0)!=0:0){c[e>>2]=(c[e>>2]|0)+ -1;Db=bb;Eb=cb}else{Db=bb;Eb=cb}}if(!n){c[(cc()|0)>>2]=22;en(b,0);l=0.0;i=g;return+l}Sa=c[h>>2]|0;if((Sa|0)==0){l=+(r|0)*0.0;i=g;return+l}do{if((Db|0)==(db|0)&(Eb|0)==(eb|0)&((eb|0)<0|(eb|0)==0&db>>>0<10)){if(!(j>>>0>30)?(Sa>>>j|0)!=0:0){break}l=+(r|0)*+(Sa>>>0);i=g;return+l}}while(0);Sa=(k|0)/-2|0;n=((Sa|0)<0)<<31>>31;if((Eb|0)>(n|0)|(Eb|0)==(n|0)&Db>>>0>Sa>>>0){c[(cc()|0)>>2]=34;l=+(r|0)*1.7976931348623157e+308*1.7976931348623157e+308;i=g;return+l}Sa=k+ -106|0;n=((Sa|0)<0)<<31>>31;if((Eb|0)<(n|0)|(Eb|0)==(n|0)&Db>>>0<Sa>>>0){c[(cc()|0)>>2]=34;l=+(r|0)*2.2250738585072014e-308*2.2250738585072014e-308;i=g;return+l}if((gb|0)==0){Fb=hb}else{if((gb|0)<9){Sa=h+(hb<<2)|0;n=c[Sa>>2]|0;o=gb;do{n=n*10|0;o=o+1|0}while((o|0)!=9);c[Sa>>2]=n}Fb=hb+1|0}do{if((ib|0)<9?(ib|0)<=(Db|0)&(Db|0)<18:0){if((Db|0)==9){l=+(r|0)*+((c[h>>2]|0)>>>0);i=g;return+l}if((Db|0)<9){l=+(r|0)*+((c[h>>2]|0)>>>0)/+(c[14928+(8-Db<<2)>>2]|0);i=g;return+l}o=j+27+(ea(Db,-3)|0)|0;Ra=c[h>>2]|0;if((o|0)<=30?(Ra>>>o|0)!=0:0){break}l=+(r|0)*+(Ra>>>0)*+(c[14928+(Db+ -10<<2)>>2]|0);i=g;return+l}}while(0);n=(Db|0)%9|0;if((n|0)==0){Gb=0;Hb=0;Ib=Db;Jb=Fb}else{Sa=(Db|0)>-1?n:n+9|0;n=c[14928+(8-Sa<<2)>>2]|0;if((Fb|0)!=0){Ra=1e9/(n|0)|0;o=0;Qa=0;Pa=0;Oa=Db;while(1){Na=h+(Pa<<2)|0;Ma=c[Na>>2]|0;La=((Ma>>>0)/(n>>>0)|0)+Qa|0;c[Na>>2]=La;Kb=ea((Ma>>>0)%(n>>>0)|0,Ra)|0;Ma=Pa+1|0;if((Pa|0)==(o|0)&(La|0)==0){Lb=Ma&127;Mb=Oa+ -9|0}else{Lb=o;Mb=Oa}if((Ma|0)==(Fb|0)){break}else{o=Lb;Qa=Kb;Pa=Ma;Oa=Mb}}if((Kb|0)==0){Nb=Lb;Ob=Mb;Qb=Fb}else{c[h+(Fb<<2)>>2]=Kb;Nb=Lb;Ob=Mb;Qb=Fb+1|0}}else{Nb=0;Ob=Db;Qb=0}Gb=Nb;Hb=0;Ib=9-Sa+Ob|0;Jb=Qb}f:while(1){Oa=h+(Gb<<2)|0;if((Ib|0)<18){Pa=Hb;Qa=Jb;while(1){o=0;Ra=Qa+127|0;n=Qa;while(1){Ma=Ra&127;La=h+(Ma<<2)|0;Na=tn(c[La>>2]|0,0,29)|0;ma=pn(Na|0,I|0,o|0,0)|0;Na=I;if(Na>>>0>0|(Na|0)==0&ma>>>0>1e9){ua=En(ma|0,Na|0,1e9,0)|0;p=Fn(ma|0,Na|0,1e9,0)|0;Rb=p;Sb=ua}else{Rb=ma;Sb=0}c[La>>2]=Rb;La=(Ma|0)==(Gb|0);if((Ma|0)!=(n+127&127|0)|La){Tb=n}else{Tb=(Rb|0)==0?Ma:n}if(La){break}else{o=Sb;Ra=Ma+ -1|0;n=Tb}}n=Pa+ -29|0;if((Sb|0)==0){Pa=n;Qa=Tb}else{Ub=n;Vb=Sb;Wb=Tb;break}}}else{if((Ib|0)==18){Xb=Hb;Yb=Jb}else{Zb=Gb;_b=Hb;$b=Ib;ac=Jb;break}while(1){if(!((c[Oa>>2]|0)>>>0<9007199)){Zb=Gb;_b=Xb;$b=18;ac=Yb;break f}Qa=0;Pa=Yb+127|0;n=Yb;while(1){Ra=Pa&127;o=h+(Ra<<2)|0;Ma=tn(c[o>>2]|0,0,29)|0;La=pn(Ma|0,I|0,Qa|0,0)|0;Ma=I;if(Ma>>>0>0|(Ma|0)==0&La>>>0>1e9){ma=En(La|0,Ma|0,1e9,0)|0;ua=Fn(La|0,Ma|0,1e9,0)|0;bc=ua;ec=ma}else{bc=La;ec=0}c[o>>2]=bc;o=(Ra|0)==(Gb|0);if((Ra|0)!=(n+127&127|0)|o){fc=n}else{fc=(bc|0)==0?Ra:n}if(o){break}else{Qa=ec;Pa=Ra+ -1|0;n=fc}}n=Xb+ -29|0;if((ec|0)==0){Xb=n;Yb=fc}else{Ub=n;Vb=ec;Wb=fc;break}}}Oa=Gb+127&127;if((Oa|0)==(Wb|0)){n=Wb+127&127;Pa=h+((Wb+126&127)<<2)|0;c[Pa>>2]=c[Pa>>2]|c[h+(n<<2)>>2];gc=n}else{gc=Wb}c[h+(Oa<<2)>>2]=Vb;Gb=Oa;Hb=Ub;Ib=Ib+9|0;Jb=gc}g:while(1){hc=ac+1&127;Sa=h+((ac+127&127)<<2)|0;Oa=Zb;n=_b;Pa=$b;while(1){Qa=(Pa|0)==18;Ra=(Pa|0)>27?9:1;ic=Oa;jc=n;while(1){o=0;while(1){La=o+ic&127;if((La|0)==(ac|0)){kc=2;break}ma=c[h+(La<<2)>>2]|0;La=c[14920+(o<<2)>>2]|0;if(ma>>>0<La>>>0){kc=2;break}ua=o+1|0;if(ma>>>0>La>>>0){kc=o;break}if((ua|0)<2){o=ua}else{kc=ua;break}}if((kc|0)==2&Qa){break g}lc=Ra+jc|0;if((ic|0)==(ac|0)){ic=ac;jc=lc}else{break}}Qa=(1<<Ra)+ -1|0;o=1e9>>>Ra;mc=ic;nc=0;ua=ic;oc=Pa;do{La=h+(ua<<2)|0;ma=c[La>>2]|0;Ma=(ma>>>Ra)+nc|0;c[La>>2]=Ma;nc=ea(ma&Qa,o)|0;ma=(ua|0)==(mc|0)&(Ma|0)==0;ua=ua+1&127;oc=ma?oc+ -9|0:oc;mc=ma?ua:mc}while((ua|0)!=(ac|0));if((nc|0)==0){Oa=mc;n=lc;Pa=oc;continue}if((hc|0)!=(mc|0)){break}c[Sa>>2]=c[Sa>>2]|1;Oa=mc;n=lc;Pa=oc}c[h+(ac<<2)>>2]=nc;Zb=mc;_b=lc;$b=oc;ac=hc}Pa=ic&127;if((Pa|0)==(ac|0)){c[h+(hc+ -1<<2)>>2]=0;pc=hc}else{pc=ac}ta=+((c[h+(Pa<<2)>>2]|0)>>>0);Pa=ic+1&127;if((Pa|0)==(pc|0)){n=pc+1&127;c[h+(n+ -1<<2)>>2]=0;qc=n}else{qc=pc}fa=+(r|0);rc=fa*(ta*1.0e9+ +((c[h+(Pa<<2)>>2]|0)>>>0));Pa=jc+53|0;n=Pa-k|0;if((n|0)<(j|0)){sc=(n|0)<0?0:n;tc=1}else{sc=j;tc=0}if((sc|0)<53){ta=+dc(+(+gn(1.0,105-sc|0)),+rc);uc=+wb(+rc,+(+gn(1.0,53-sc|0)));vc=ta;wc=uc;xc=ta+(rc-uc)}else{vc=0.0;wc=0.0;xc=rc}Oa=ic+2&127;if((Oa|0)!=(qc|0)){Sa=c[h+(Oa<<2)>>2]|0;do{if(!(Sa>>>0<5e8)){if(Sa>>>0>5e8){yc=fa*.75+wc;break}if((ic+3&127|0)==(qc|0)){yc=fa*.5+wc;break}else{yc=fa*.75+wc;break}}else{if((Sa|0)==0?(ic+3&127|0)==(qc|0):0){yc=wc;break}yc=fa*.25+wc}}while(0);if((53-sc|0)>1?!(+wb(+yc,1.0)!=0.0):0){zc=yc+1.0}else{zc=yc}}else{zc=wc}fa=xc+zc-vc;do{if((Pa&2147483647|0)>(-2-la|0)){if(!(+T(+fa)>=9007199254740992.0)){Ac=tc;Bc=jc;Cc=fa}else{Ac=(tc|0)!=0&(sc|0)==(n|0)?0:tc;Bc=jc+1|0;Cc=fa*.5}if((Bc+50|0)<=(na|0)?!((Ac|0)!=0&zc!=0.0):0){Dc=Bc;Ec=Cc;break}c[(cc()|0)>>2]=34;Dc=Bc;Ec=Cc}else{Dc=jc;Ec=fa}}while(0);l=+hn(Ec,Dc);i=g;return+l}else if((z|0)==3){na=c[e>>2]|0;if(na>>>0<(c[m>>2]|0)>>>0){c[e>>2]=na+1;Fc=d[na]|0}else{Fc=fn(b)|0}if((Fc|0)==40){Gc=1}else{if((c[m>>2]|0)==0){l=x;i=g;return+l}c[e>>2]=(c[e>>2]|0)+ -1;l=x;i=g;return+l}while(1){na=c[e>>2]|0;if(na>>>0<(c[m>>2]|0)>>>0){c[e>>2]=na+1;Hc=d[na]|0}else{Hc=fn(b)|0}if(!((Hc+ -48|0)>>>0<10|(Hc+ -65|0)>>>0<26)?!((Hc+ -97|0)>>>0<26|(Hc|0)==95):0){break}Gc=Gc+1|0}if((Hc|0)==41){l=x;i=g;return+l}na=(c[m>>2]|0)==0;if(!na){c[e>>2]=(c[e>>2]|0)+ -1}if(u){c[(cc()|0)>>2]=22;en(b,0);l=0.0;i=g;return+l}if((Gc|0)==0|na){l=x;i=g;return+l}else{Ic=Gc}while(1){na=Ic+ -1|0;c[e>>2]=(c[e>>2]|0)+ -1;if((na|0)==0){l=x;break}else{Ic=na}}i=g;return+l}else{if((c[m>>2]|0)!=0){c[e>>2]=(c[e>>2]|0)+ -1}c[(cc()|0)>>2]=22;en(b,0);l=0.0;i=g;return+l}}}while(0);if((v|0)==23){v=(c[m>>2]|0)==0;if(!v){c[e>>2]=(c[e>>2]|0)+ -1}if(!(t>>>0<4|(f|0)==0|v)){v=t;do{c[e>>2]=(c[e>>2]|0)+ -1;v=v+ -1|0}while(v>>>0>3)}}l=+(r|0)*y;i=g;return+l}function dn(a,b){a=a|0;b=b|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0;e=i;f=a+4|0;g=c[f>>2]|0;h=a+100|0;if(g>>>0<(c[h>>2]|0)>>>0){c[f>>2]=g+1;j=d[g]|0}else{j=fn(a)|0}if((j|0)==43|(j|0)==45){g=(j|0)==45|0;k=c[f>>2]|0;if(k>>>0<(c[h>>2]|0)>>>0){c[f>>2]=k+1;l=d[k]|0}else{l=fn(a)|0}if(!((l+ -48|0)>>>0<10|(b|0)==0)?(c[h>>2]|0)!=0:0){c[f>>2]=(c[f>>2]|0)+ -1;m=l;n=g}else{m=l;n=g}}else{m=j;n=0}if((m+ -48|0)>>>0>9){if((c[h>>2]|0)==0){o=-2147483648;p=0;I=o;i=e;return p|0}c[f>>2]=(c[f>>2]|0)+ -1;o=-2147483648;p=0;I=o;i=e;return p|0}else{q=m;r=0}while(1){s=q+ -48+r|0;m=c[f>>2]|0;if(m>>>0<(c[h>>2]|0)>>>0){c[f>>2]=m+1;t=d[m]|0}else{t=fn(a)|0}if(!((t+ -48|0)>>>0<10&(s|0)<214748364)){break}q=t;r=s*10|0}r=((s|0)<0)<<31>>31;if((t+ -48|0)>>>0<10){q=s;m=r;j=t;while(1){g=Dn(q|0,m|0,10,0)|0;l=I;b=pn(j|0,((j|0)<0)<<31>>31|0,-48,-1)|0;k=pn(b|0,I|0,g|0,l|0)|0;l=I;g=c[f>>2]|0;if(g>>>0<(c[h>>2]|0)>>>0){c[f>>2]=g+1;u=d[g]|0}else{u=fn(a)|0}if((u+ -48|0)>>>0<10&((l|0)<21474836|(l|0)==21474836&k>>>0<2061584302)){q=k;m=l;j=u}else{v=k;w=l;x=u;break}}}else{v=s;w=r;x=t}if((x+ -48|0)>>>0<10){do{x=c[f>>2]|0;if(x>>>0<(c[h>>2]|0)>>>0){c[f>>2]=x+1;y=d[x]|0}else{y=fn(a)|0}}while((y+ -48|0)>>>0<10)}if((c[h>>2]|0)!=0){c[f>>2]=(c[f>>2]|0)+ -1}f=(n|0)!=0;n=on(0,0,v|0,w|0)|0;o=f?I:w;p=f?n:v;I=o;i=e;return p|0}function en(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0;d=i;c[a+104>>2]=b;e=c[a+8>>2]|0;f=c[a+4>>2]|0;g=e-f|0;c[a+108>>2]=g;if((b|0)!=0&(g|0)>(b|0)){c[a+100>>2]=f+b;i=d;return}else{c[a+100>>2]=e;i=d;return}}function fn(b){b=b|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0;e=i;f=b+104|0;g=c[f>>2]|0;if(!((g|0)!=0?(c[b+108>>2]|0)>=(g|0):0)){h=3}if((h|0)==3?(h=kn(b)|0,(h|0)>=0):0){g=c[f>>2]|0;f=c[b+8>>2]|0;if((g|0)!=0?(j=c[b+4>>2]|0,k=g-(c[b+108>>2]|0)+ -1|0,(f-j|0)>(k|0)):0){c[b+100>>2]=j+k}else{c[b+100>>2]=f}k=c[b+4>>2]|0;if((f|0)!=0){j=b+108|0;c[j>>2]=f+1-k+(c[j>>2]|0)}j=k+ -1|0;if((d[j]|0|0)==(h|0)){l=h;i=e;return l|0}a[j]=h;l=h;i=e;return l|0}c[b+100>>2]=0;l=-1;i=e;return l|0}function gn(a,b){a=+a;b=b|0;var d=0,e=0.0,f=0,g=0,j=0,l=0.0;d=i;if((b|0)>1023){e=a*8.98846567431158e+307;f=b+ -1023|0;if((f|0)>1023){g=b+ -2046|0;j=(g|0)>1023?1023:g;l=e*8.98846567431158e+307}else{j=f;l=e}}else{if((b|0)<-1022){e=a*2.2250738585072014e-308;f=b+1022|0;if((f|0)<-1022){g=b+2044|0;j=(g|0)<-1022?-1022:g;l=e*2.2250738585072014e-308}else{j=f;l=e}}else{j=b;l=a}}b=tn(j+1023|0,0,52)|0;j=I;c[k>>2]=b;c[k+4>>2]=j;a=l*+h[k>>3];i=d;return+a}function hn(a,b){a=+a;b=b|0;var c=0,d=0.0;c=i;d=+gn(a,b);i=c;return+d}function jn(b){b=b|0;var d=0,e=0,f=0,g=0,h=0;d=i;e=b+74|0;f=a[e]|0;a[e]=f+255|f;f=b+20|0;e=b+44|0;if((c[f>>2]|0)>>>0>(c[e>>2]|0)>>>0){kc[c[b+36>>2]&31](b,0,0)|0}c[b+16>>2]=0;c[b+28>>2]=0;c[f>>2]=0;f=c[b>>2]|0;if((f&20|0)==0){g=c[e>>2]|0;c[b+8>>2]=g;c[b+4>>2]=g;h=0;i=d;return h|0}if((f&4|0)==0){h=-1;i=d;return h|0}c[b>>2]=f|32;h=-1;i=d;return h|0}function kn(a){a=a|0;var b=0,e=0,f=0;b=i;i=i+16|0;e=b;if((c[a+8>>2]|0)==0?(jn(a)|0)!=0:0){f=-1}else{if((kc[c[a+32>>2]&31](a,e,1)|0)==1){f=d[e]|0}else{f=-1}}i=b;return f|0}function ln(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0.0,j=0,k=0;d=i;i=i+112|0;e=d;f=e+0|0;g=f+112|0;do{c[f>>2]=0;f=f+4|0}while((f|0)<(g|0));f=e+4|0;c[f>>2]=a;g=e+8|0;c[g>>2]=-1;c[e+44>>2]=a;c[e+76>>2]=-1;en(e,0);h=+cn(e,2,1);j=(c[f>>2]|0)-(c[g>>2]|0)+(c[e+108>>2]|0)|0;if((b|0)==0){i=d;return+h}if((j|0)==0){k=a}else{k=a+j|0}c[b>>2]=k;i=d;return+h}function mn(b,c,d){b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0;e=i;a:do{if((d|0)==0){f=0}else{g=d;h=b;j=c;while(1){k=a[h]|0;l=a[j]|0;if(!(k<<24>>24==l<<24>>24)){break}m=g+ -1|0;if((m|0)==0){f=0;break a}else{g=m;h=h+1|0;j=j+1|0}}f=(k&255)-(l&255)|0}}while(0);i=e;return f|0}function nn(){c[728]=o;c[754]=o;c[3492]=o;c[3722]=o}function on(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0;e=b-d>>>0;e=b-d-(c>>>0>a>>>0|0)>>>0;return(I=e,a-c>>>0|0)|0}function pn(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0;e=a+c>>>0;return(I=b+d+(e>>>0<a>>>0|0)>>>0,e|0)|0}function qn(b){b=b|0;var c=0;c=b;while(a[c]|0){c=c+1|0}return c-b|0}function rn(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0;f=b+e|0;if((e|0)>=20){d=d&255;g=b&3;h=d|d<<8|d<<16|d<<24;i=f&~3;if(g){g=b+4-g|0;while((b|0)<(g|0)){a[b]=d;b=b+1|0}}while((b|0)<(i|0)){c[b>>2]=h;b=b+4|0}}while((b|0)<(f|0)){a[b]=d;b=b+1|0}return b-e|0}function sn(b,d,e){b=b|0;d=d|0;e=e|0;var f=0;if((e|0)>=4096)return Oa(b|0,d|0,e|0)|0;f=b|0;if((b&3)==(d&3)){while(b&3){if((e|0)==0)return f|0;a[b]=a[d]|0;b=b+1|0;d=d+1|0;e=e-1|0}while((e|0)>=4){c[b>>2]=c[d>>2];b=b+4|0;d=d+4|0;e=e-4|0}}while((e|0)>0){a[b]=a[d]|0;b=b+1|0;d=d+1|0;e=e-1|0}return f|0}function tn(a,b,c){a=a|0;b=b|0;c=c|0;if((c|0)<32){I=b<<c|(a&(1<<c)-1<<32-c)>>>32-c;return a<<c}I=a<<c-32;return 0}function un(b,c,d){b=b|0;c=c|0;d=d|0;var e=0;if((c|0)<(b|0)&(b|0)<(c+d|0)){e=b;c=c+d|0;b=b+d|0;while((d|0)>0){b=b-1|0;c=c-1|0;d=d-1|0;a[b]=a[c]|0}b=e}else{sn(b,c,d)|0}return b|0}function vn(b,c){b=b|0;c=c|0;var d=0;do{a[b+d|0]=a[c+d|0];d=d+1|0}while(a[c+(d-1)|0]|0);return b|0}function wn(a,b,c){a=a|0;b=b|0;c=c|0;if((c|0)<32){I=b>>>c;return a>>>c|(b&(1<<c)-1)<<32-c}I=0;return b>>>c-32|0}function xn(a,b,c){a=a|0;b=b|0;c=c|0;if((c|0)<32){I=b>>c;return a>>>c|(b&(1<<c)-1)<<32-c}I=(b|0)<0?-1:0;return b>>c-32|0}function yn(b){b=b|0;var c=0;c=a[n+(b>>>24)|0]|0;if((c|0)<8)return c|0;c=a[n+(b>>16&255)|0]|0;if((c|0)<8)return c+8|0;c=a[n+(b>>8&255)|0]|0;if((c|0)<8)return c+16|0;return(a[n+(b&255)|0]|0)+24|0}function zn(b){b=b|0;var c=0;c=a[m+(b&255)|0]|0;if((c|0)<8)return c|0;c=a[m+(b>>8&255)|0]|0;if((c|0)<8)return c+8|0;c=a[m+(b>>16&255)|0]|0;if((c|0)<8)return c+16|0;return(a[m+(b>>>24)|0]|0)+24|0}function An(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0;c=a&65535;d=b&65535;e=ea(d,c)|0;f=a>>>16;a=(e>>>16)+(ea(d,f)|0)|0;d=b>>>16;b=ea(d,c)|0;return(I=(a>>>16)+(ea(d,f)|0)+(((a&65535)+b|0)>>>16)|0,a+b<<16|e&65535|0)|0}function Bn(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0,i=0;e=b>>31|((b|0)<0?-1:0)<<1;f=((b|0)<0?-1:0)>>31|((b|0)<0?-1:0)<<1;g=d>>31|((d|0)<0?-1:0)<<1;h=((d|0)<0?-1:0)>>31|((d|0)<0?-1:0)<<1;i=on(e^a,f^b,e,f)|0;b=I;a=g^e;e=h^f;f=on((Gn(i,b,on(g^c,h^d,g,h)|0,I,0)|0)^a,I^e,a,e)|0;return f|0}function Cn(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0;f=i;i=i+8|0;g=f|0;h=b>>31|((b|0)<0?-1:0)<<1;j=((b|0)<0?-1:0)>>31|((b|0)<0?-1:0)<<1;k=e>>31|((e|0)<0?-1:0)<<1;l=((e|0)<0?-1:0)>>31|((e|0)<0?-1:0)<<1;m=on(h^a,j^b,h,j)|0;b=I;Gn(m,b,on(k^d,l^e,k,l)|0,I,g)|0;l=on(c[g>>2]^h,c[g+4>>2]^j,h,j)|0;j=I;i=f;return(I=j,l)|0}function Dn(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0;e=a;a=c;c=An(e,a)|0;f=I;return(I=(ea(b,a)|0)+(ea(d,e)|0)+f|f&0,c|0|0)|0}function En(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0;e=Gn(a,b,c,d,0)|0;return e|0}function Fn(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0;f=i;i=i+8|0;g=f|0;Gn(a,b,d,e,g)|0;i=f;return(I=c[g+4>>2]|0,c[g>>2]|0)|0}function Gn(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,J=0,K=0,L=0,M=0;g=a;h=b;i=h;j=d;k=e;l=k;if((i|0)==0){m=(f|0)!=0;if((l|0)==0){if(m){c[f>>2]=(g>>>0)%(j>>>0);c[f+4>>2]=0}n=0;o=(g>>>0)/(j>>>0)>>>0;return(I=n,o)|0}else{if(!m){n=0;o=0;return(I=n,o)|0}c[f>>2]=a|0;c[f+4>>2]=b&0;n=0;o=0;return(I=n,o)|0}}m=(l|0)==0;do{if((j|0)!=0){if(!m){p=(yn(l|0)|0)-(yn(i|0)|0)|0;if(p>>>0<=31){q=p+1|0;r=31-p|0;s=p-31>>31;t=q;u=g>>>(q>>>0)&s|i<<r;v=i>>>(q>>>0)&s;w=0;x=g<<r;break}if((f|0)==0){n=0;o=0;return(I=n,o)|0}c[f>>2]=a|0;c[f+4>>2]=h|b&0;n=0;o=0;return(I=n,o)|0}r=j-1|0;if((r&j|0)!=0){s=(yn(j|0)|0)+33-(yn(i|0)|0)|0;q=64-s|0;p=32-s|0;y=p>>31;z=s-32|0;A=z>>31;t=s;u=p-1>>31&i>>>(z>>>0)|(i<<p|g>>>(s>>>0))&A;v=A&i>>>(s>>>0);w=g<<q&y;x=(i<<q|g>>>(z>>>0))&y|g<<p&s-33>>31;break}if((f|0)!=0){c[f>>2]=r&g;c[f+4>>2]=0}if((j|0)==1){n=h|b&0;o=a|0|0;return(I=n,o)|0}else{r=zn(j|0)|0;n=i>>>(r>>>0)|0;o=i<<32-r|g>>>(r>>>0)|0;return(I=n,o)|0}}else{if(m){if((f|0)!=0){c[f>>2]=(i>>>0)%(j>>>0);c[f+4>>2]=0}n=0;o=(i>>>0)/(j>>>0)>>>0;return(I=n,o)|0}if((g|0)==0){if((f|0)!=0){c[f>>2]=0;c[f+4>>2]=(i>>>0)%(l>>>0)}n=0;o=(i>>>0)/(l>>>0)>>>0;return(I=n,o)|0}r=l-1|0;if((r&l|0)==0){if((f|0)!=0){c[f>>2]=a|0;c[f+4>>2]=r&i|b&0}n=0;o=i>>>((zn(l|0)|0)>>>0);return(I=n,o)|0}r=(yn(l|0)|0)-(yn(i|0)|0)|0;if(r>>>0<=30){s=r+1|0;p=31-r|0;t=s;u=i<<p|g>>>(s>>>0);v=i>>>(s>>>0);w=0;x=g<<p;break}if((f|0)==0){n=0;o=0;return(I=n,o)|0}c[f>>2]=a|0;c[f+4>>2]=h|b&0;n=0;o=0;return(I=n,o)|0}}while(0);if((t|0)==0){B=x;C=w;D=v;E=u;F=0;G=0}else{b=d|0|0;d=k|e&0;e=pn(b,d,-1,-1)|0;k=I;h=x;x=w;w=v;v=u;u=t;t=0;while(1){H=x>>>31|h<<1;J=t|x<<1;a=v<<1|h>>>31|0;g=v>>>31|w<<1|0;on(e,k,a,g)|0;i=I;l=i>>31|((i|0)<0?-1:0)<<1;K=l&1;L=on(a,g,l&b,(((i|0)<0?-1:0)>>31|((i|0)<0?-1:0)<<1)&d)|0;M=I;i=u-1|0;if((i|0)==0){break}else{h=H;x=J;w=M;v=L;u=i;t=K}}B=H;C=J;D=M;E=L;F=0;G=K}K=C;C=0;if((f|0)!=0){c[f>>2]=E;c[f+4>>2]=D}n=(K|0)>>>31|(B|C)<<1|(C<<1|K>>>31)&0|F;o=(K<<1|0>>>31)&-2|G;return(I=n,o)|0}function Hn(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;return kc[a&31](b|0,c|0,d|0)|0}function In(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;lc[a&15](b|0,c|0,d|0,e|0,f|0,g|0)}function Jn(a,b,c,d,e,f,g,h){a=a|0;b=b|0;c=c|0;d=d|0;e=+e;f=+f;g=+g;h=+h;mc[a&3](b|0,c|0,d|0,+e,+f,+g,+h)}function Kn(a,b,c,d,e,f,g,h){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;nc[a&63](b|0,c|0,d|0,e|0,f|0,g|0,h|0)}function Ln(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=+e;f=+f;oc[a&3](b|0,c|0,d|0,+e,+f)}function Mn(a,b){a=a|0;b=b|0;pc[a&255](b|0)}function Nn(a,b,c){a=a|0;b=b|0;c=c|0;qc[a&63](b|0,c|0)}function On(a,b,c,d,e,f,g,h,i,j){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;rc[a&3](b|0,c|0,d|0,e|0,f|0,g|0,h|0,i|0,j|0)}function Pn(a,b){a=a|0;b=b|0;return sc[a&127](b|0)|0}function Qn(a,b,c,d,e,f,g,h){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=+h;tc[a&3](b|0,c|0,d|0,e|0,f|0,g|0,+h)}function Rn(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;uc[a&7](b|0,c|0,d|0)}function Sn(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=+g;vc[a&7](b|0,c|0,d|0,e|0,f|0,+g)}function Tn(a){a=a|0;wc[a&0]()}function Un(a,b,c,d,e,f,g,h,i){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;return xc[a&15](b|0,c|0,d|0,e|0,f|0,g|0,h|0,i|0)|0}function Vn(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return yc[a&7](b|0,c|0,d|0,e|0)|0}function Wn(a,b,c,d,e,f,g,h,i){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;zc[a&7](b|0,c|0,d|0,e|0,f|0,g|0,h|0,i|0)}function Xn(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;Ac[a&3](b|0,c|0,d|0,e|0,f|0)}function Yn(a,b,c){a=a|0;b=b|0;c=c|0;return Bc[a&15](b|0,c|0)|0}function Zn(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return Cc[a&15](b|0,c|0,d|0,e|0,f|0)|0}function _n(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;Dc[a&15](b|0,c|0,d|0,e|0)}function $n(a,b,c){a=a|0;b=b|0;c=c|0;fa(0);return 0}function ao(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;fa(1)}function bo(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=+d;e=+e;f=+f;g=+g;fa(2)}function co(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;fa(3)}function eo(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=+d;e=+e;fa(4)}function fo(a){a=a|0;fa(5)}function go(a,b){a=a|0;b=b|0;fa(6)}function ho(a,b,c,d,e,f,g,h,i){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;fa(7)}function io(a){a=a|0;fa(8);return 0}function jo(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=+g;fa(9)}function ko(a,b,c){a=a|0;b=b|0;c=c|0;fa(10)}function lo(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=+f;fa(11)}function mo(){fa(12)}function no(a,b,c,d,e,f,g,h){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;fa(13);return 0}function oo(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;fa(14);return 0}function po(a,b,c,d,e,f,g,h){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;fa(15)}function qo(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;fa(16)}function ro(a,b){a=a|0;b=b|0;fa(17);return 0}function so(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;fa(18);return 0}function to(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;fa(19)}




// EMSCRIPTEN_END_FUNCS
var kc=[$n,rf,wf,Hd,Af,cf,hf,Vd,mf,te,ue,gg,lg,Pj,Uj,zk,Bk,Ek,kk,pk,rk,uk,Gm,$n,$n,$n,$n,$n,$n,$n,$n,$n];var lc=[ao,sf,df,ph,qh,vh,Bh,Eh,Fh,Jh,Oh,Qj,Vj,Qm,Pm,Om];var mc=[bo,hd,id,jd];var nc=[co,og,qg,sg,ug,wg,yg,Ag,Cg,Eg,Gg,Ig,Ng,Pg,Rg,Tg,Vg,Xg,Zg,$g,bh,dh,fh,uh,wh,Ih,Kh,Th,Uh,Vh,Wh,Xh,ei,fi,gi,hi,ii,Gj,Mj,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co];var oc=[eo,kd,ld,eo];var pc=[fo,$c,ad,ed,sd,td,Dd,Ed,Kd,Ld,Rd,Sd,Yd,Zd,je,ie,oe,ne,qe,ze,ye,af,$e,pf,of,Df,Cf,Ff,Ef,If,Hf,Kf,Jf,Nf,Mf,Pf,Of,Sf,Rf,Uf,Tf,_f,Zf,Ye,$f,Yf,ag,cg,bg,hk,ig,hg,ng,mg,Mg,Lg,oh,nh,Dh,Ch,Rh,Qh,ci,bi,oi,ni,ri,qi,vi,ui,Gi,Fi,Ri,Qi,aj,$i,lj,kj,vj,uj,Cj,Bj,Ij,Hj,Oj,Nj,Tj,Sj,ak,$j,xk,wk,Xj,Ok,tl,sl,vl,ul,dg,gk,jk,Gk,Wk,fl,ql,rl,ym,xm,Am,Dm,Bm,Cm,Em,Fm,$m,_m,Cd,ik,bm,nj,Sm,im,hm,gm,fm,em,dm,Fe,Qe,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo,fo];var qc=[go,bd,cd,dd,wd,xd,zd,Fd,Md,Td,_d,bf,qf,yi,zi,Ai,Bi,Di,Ei,Ji,Ki,Li,Mi,Oi,Pi,Ui,Vi,Wi,Xi,Zi,_i,dj,ej,fj,gj,ij,jj,Rj,Wj,Al,Cl,El,Bl,Dl,Fl,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go];var rc=[ho,Yh,ji,ho];var sc=[io,ud,vd,Gd,vf,xf,yf,uf,Nd,Od,Ud,gf,jf,kf,ff,$d,ae,ke,pe,Wf,Sh,Gl,Il,Kl,Ql,Sl,Ml,Ol,di,Hl,Jl,Ll,Rl,Tl,Nl,Pl,wi,xi,Ci,Hi,Ii,Ni,Si,Ti,Yi,bj,cj,hj,Sk,Tk,Vk,wl,yl,xl,zl,Kk,Lk,Nk,al,bl,el,ll,ml,pl,zm,an,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io,io];var tc=[jo,Dj,Jj,jo];var uc=[ko,fd,gd,se,Xf,ko,ko,ko];var vc=[lo,xh,Ah,Lh,Nh,lo,lo,lo];var wc=[mo];var xc=[no,Pk,Qk,Hk,Ik,Xk,Zk,gl,il,no,no,no,no,no,no,no];var yc=[oo,Dk,lk,mk,nk,tk,oo,oo];var zc=[po,pi,si,mj,qj,wj,yj,po];var Ac=[qo,Nm,Mm,Lm];var Bc=[ro,zf,Id,Pd,Bf,lf,Wd,be,nf,yk,Ak,Ck,ok,qk,sk,ro];var Cc=[so,eg,jg,Fk,Rk,Uk,vk,Jk,Mk,$k,cl,kl,nl,so,so,so];var Dc=[to,md,yd,tf,ef,fg,kg,Hm,Im,Jm,to,to,to,to,to,to];return{_i64Add:pn,_i64Subtract:on,_free:Sm,_OSC_getNumInputs:Yc,_OSC_destructor:_c,_OSC_getNextParam:Wc,_OSC_getNumOutputs:Zc,_realloc:Tm,_OSC_getNumParams:Vc,_strlen:qn,_OSC_compute:Xc,_memset:rn,_malloc:Rm,_OSC_constructor:Uc,_memcpy:sn,_memmove:un,_strcpy:vn,_bitshift64Shl:tn,__GLOBAL__I_a:de,runPostSets:nn,stackAlloc:Ec,stackSave:Fc,stackRestore:Gc,setThrew:Hc,setTempRet0:Kc,setTempRet1:Lc,setTempRet2:Mc,setTempRet3:Nc,setTempRet4:Oc,setTempRet5:Pc,setTempRet6:Qc,setTempRet7:Rc,setTempRet8:Sc,setTempRet9:Tc,dynCall_iiii:Hn,dynCall_viiiiii:In,dynCall_viiidddd:Jn,dynCall_viiiiiii:Kn,dynCall_viiidd:Ln,dynCall_vi:Mn,dynCall_vii:Nn,dynCall_viiiiiiiii:On,dynCall_ii:Pn,dynCall_viiiiiid:Qn,dynCall_viii:Rn,dynCall_viiiiid:Sn,dynCall_v:Tn,dynCall_iiiiiiiii:Un,dynCall_iiiii:Vn,dynCall_viiiiiiii:Wn,dynCall_viiiii:Xn,dynCall_iii:Yn,dynCall_iiiiii:Zn,dynCall_viiii:_n}})


// EMSCRIPTEN_END_ASM
({ "Math": Math, "Int8Array": Int8Array, "Int16Array": Int16Array, "Int32Array": Int32Array, "Uint8Array": Uint8Array, "Uint16Array": Uint16Array, "Uint32Array": Uint32Array, "Float32Array": Float32Array, "Float64Array": Float64Array }, { "abort": abort, "assert": assert, "asmPrintInt": asmPrintInt, "asmPrintFloat": asmPrintFloat, "min": Math_min, "invoke_iiii": invoke_iiii, "invoke_viiiiii": invoke_viiiiii, "invoke_viiidddd": invoke_viiidddd, "invoke_viiiiiii": invoke_viiiiiii, "invoke_viiidd": invoke_viiidd, "invoke_vi": invoke_vi, "invoke_vii": invoke_vii, "invoke_viiiiiiiii": invoke_viiiiiiiii, "invoke_ii": invoke_ii, "invoke_viiiiiid": invoke_viiiiiid, "invoke_viii": invoke_viii, "invoke_viiiiid": invoke_viiiiid, "invoke_v": invoke_v, "invoke_iiiiiiiii": invoke_iiiiiiiii, "invoke_iiiii": invoke_iiiii, "invoke_viiiiiiii": invoke_viiiiiiii, "invoke_viiiii": invoke_viiiii, "invoke_iii": invoke_iii, "invoke_iiiiii": invoke_iiiiii, "invoke_viiii": invoke_viiii, "_fabs": _fabs, "_vsscanf": _vsscanf, "__ZSt9terminatev": __ZSt9terminatev, "___cxa_guard_acquire": ___cxa_guard_acquire, "_sscanf": _sscanf, "__ZSt18uncaught_exceptionv": __ZSt18uncaught_exceptionv, "___ctype_toupper_loc": ___ctype_toupper_loc, "__addDays": __addDays, "_sbrk": _sbrk, "___cxa_begin_catch": ___cxa_begin_catch, "_emscripten_memcpy_big": _emscripten_memcpy_big, "_exp2": _exp2, "_sysconf": _sysconf, "_tanf": _tanf, "_fileno": _fileno, "_fread": _fread, "_write": _write, "__isLeapYear": __isLeapYear, "_expf": _expf, "__ZNSt9exceptionD2Ev": __ZNSt9exceptionD2Ev, "___cxa_does_inherit": ___cxa_does_inherit, "__exit": __exit, "_catclose": _catclose, "_send": _send, "___cxa_is_number_type": ___cxa_is_number_type, "___cxa_find_matching_catch": ___cxa_find_matching_catch, "_isxdigit_l": _isxdigit_l, "___cxa_guard_release": ___cxa_guard_release, "_strerror_r": _strerror_r, "___setErrNo": ___setErrNo, "_llvm_pow_f32": _llvm_pow_f32, "_newlocale": _newlocale, "_isdigit_l": _isdigit_l, "___resumeException": ___resumeException, "_freelocale": _freelocale, "_sprintf": _sprintf, "_vasprintf": _vasprintf, "_vsnprintf": _vsnprintf, "_strtoull_l": _strtoull_l, "_read": _read, "_fwrite": _fwrite, "_time": _time, "_pthread_mutex_lock": _pthread_mutex_lock, "_catopen": _catopen, "_exit": _exit, "___ctype_b_loc": ___ctype_b_loc, "_fmod": _fmod, "___cxa_allocate_exception": ___cxa_allocate_exception, "_strtoll": _strtoll, "_pwrite": _pwrite, "_fabsf": _fabsf, "_uselocale": _uselocale, "_snprintf": _snprintf, "__scanString": __scanString, "_strtoull": _strtoull, "_strftime": _strftime, "_sinf": _sinf, "_isxdigit": _isxdigit, "__reallyNegative": __reallyNegative, "_pthread_cond_broadcast": _pthread_cond_broadcast, "_recv": _recv, "_fgetc": _fgetc, "__parseInt64": __parseInt64, "__getFloat": __getFloat, "_abort": _abort, "_isspace": _isspace, "_pthread_cond_wait": _pthread_cond_wait, "_cosf": _cosf, "_ungetc": _ungetc, "_fflush": _fflush, "_strftime_l": _strftime_l, "_log10": _log10, "_catgets": _catgets, "_asprintf": _asprintf, "_strtoll_l": _strtoll_l, "__arraySum": __arraySum, "___ctype_tolower_loc": ___ctype_tolower_loc, "_pthread_mutex_unlock": _pthread_mutex_unlock, "_pread": _pread, "_mkport": _mkport, "___errno_location": ___errno_location, "_copysign": _copysign, "___cxa_throw": ___cxa_throw, "_isdigit": _isdigit, "_strerror": _strerror, "__formatString": __formatString, "_atexit": _atexit, "STACKTOP": STACKTOP, "STACK_MAX": STACK_MAX, "tempDoublePtr": tempDoublePtr, "ABORT": ABORT, "cttz_i8": cttz_i8, "ctlz_i8": ctlz_i8, "NaN": NaN, "Infinity": Infinity, "__ZTISt9exception": __ZTISt9exception, "___dso_handle": ___dso_handle, "_stderr": _stderr, "_stdin": _stdin, "_stdout": _stdout }, buffer);
var _i64Add = Module["_i64Add"] = asm["_i64Add"];
var _i64Subtract = Module["_i64Subtract"] = asm["_i64Subtract"];
var _free = Module["_free"] = asm["_free"];
var _OSC_getNumInputs = Module["_OSC_getNumInputs"] = asm["_OSC_getNumInputs"];
var _OSC_destructor = Module["_OSC_destructor"] = asm["_OSC_destructor"];
var _OSC_getNextParam = Module["_OSC_getNextParam"] = asm["_OSC_getNextParam"];
var _OSC_getNumOutputs = Module["_OSC_getNumOutputs"] = asm["_OSC_getNumOutputs"];
var _realloc = Module["_realloc"] = asm["_realloc"];
var _OSC_getNumParams = Module["_OSC_getNumParams"] = asm["_OSC_getNumParams"];
var _strlen = Module["_strlen"] = asm["_strlen"];
var _OSC_compute = Module["_OSC_compute"] = asm["_OSC_compute"];
var _memset = Module["_memset"] = asm["_memset"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var _OSC_constructor = Module["_OSC_constructor"] = asm["_OSC_constructor"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var _memmove = Module["_memmove"] = asm["_memmove"];
var _strcpy = Module["_strcpy"] = asm["_strcpy"];
var _bitshift64Shl = Module["_bitshift64Shl"] = asm["_bitshift64Shl"];
var __GLOBAL__I_a = Module["__GLOBAL__I_a"] = asm["__GLOBAL__I_a"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];
var dynCall_iiii = Module["dynCall_iiii"] = asm["dynCall_iiii"];
var dynCall_viiiiii = Module["dynCall_viiiiii"] = asm["dynCall_viiiiii"];
var dynCall_viiidddd = Module["dynCall_viiidddd"] = asm["dynCall_viiidddd"];
var dynCall_viiiiiii = Module["dynCall_viiiiiii"] = asm["dynCall_viiiiiii"];
var dynCall_viiidd = Module["dynCall_viiidd"] = asm["dynCall_viiidd"];
var dynCall_vi = Module["dynCall_vi"] = asm["dynCall_vi"];
var dynCall_vii = Module["dynCall_vii"] = asm["dynCall_vii"];
var dynCall_viiiiiiiii = Module["dynCall_viiiiiiiii"] = asm["dynCall_viiiiiiiii"];
var dynCall_ii = Module["dynCall_ii"] = asm["dynCall_ii"];
var dynCall_viiiiiid = Module["dynCall_viiiiiid"] = asm["dynCall_viiiiiid"];
var dynCall_viii = Module["dynCall_viii"] = asm["dynCall_viii"];
var dynCall_viiiiid = Module["dynCall_viiiiid"] = asm["dynCall_viiiiid"];
var dynCall_v = Module["dynCall_v"] = asm["dynCall_v"];
var dynCall_iiiiiiiii = Module["dynCall_iiiiiiiii"] = asm["dynCall_iiiiiiiii"];
var dynCall_iiiii = Module["dynCall_iiiii"] = asm["dynCall_iiiii"];
var dynCall_viiiiiiii = Module["dynCall_viiiiiiii"] = asm["dynCall_viiiiiiii"];
var dynCall_viiiii = Module["dynCall_viiiii"] = asm["dynCall_viiiii"];
var dynCall_iii = Module["dynCall_iii"] = asm["dynCall_iii"];
var dynCall_iiiiii = Module["dynCall_iiiiii"] = asm["dynCall_iiiiii"];
var dynCall_viiii = Module["dynCall_viiii"] = asm["dynCall_viiii"];

Runtime.stackAlloc = function(size) { return asm['stackAlloc'](size) };
Runtime.stackSave = function() { return asm['stackSave']() };
Runtime.stackRestore = function(top) { asm['stackRestore'](top) };


// TODO: strip out parts of this we do not need

//======= begin closure i64 code =======

// Copyright 2009 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Defines a Long class for representing a 64-bit two's-complement
 * integer value, which faithfully simulates the behavior of a Java "long". This
 * implementation is derived from LongLib in GWT.
 *
 */

var i64Math = (function() { // Emscripten wrapper
  var goog = { math: {} };


  /**
   * Constructs a 64-bit two's-complement integer, given its low and high 32-bit
   * values as *signed* integers.  See the from* functions below for more
   * convenient ways of constructing Longs.
   *
   * The internal representation of a long is the two given signed, 32-bit values.
   * We use 32-bit pieces because these are the size of integers on which
   * Javascript performs bit-operations.  For operations like addition and
   * multiplication, we split each number into 16-bit pieces, which can easily be
   * multiplied within Javascript's floating-point representation without overflow
   * or change in sign.
   *
   * In the algorithms below, we frequently reduce the negative case to the
   * positive case by negating the input(s) and then post-processing the result.
   * Note that we must ALWAYS check specially whether those values are MIN_VALUE
   * (-2^63) because -MIN_VALUE == MIN_VALUE (since 2^63 cannot be represented as
   * a positive number, it overflows back into a negative).  Not handling this
   * case would often result in infinite recursion.
   *
   * @param {number} low  The low (signed) 32 bits of the long.
   * @param {number} high  The high (signed) 32 bits of the long.
   * @constructor
   */
  goog.math.Long = function(low, high) {
    /**
     * @type {number}
     * @private
     */
    this.low_ = low | 0;  // force into 32 signed bits.

    /**
     * @type {number}
     * @private
     */
    this.high_ = high | 0;  // force into 32 signed bits.
  };


  // NOTE: Common constant values ZERO, ONE, NEG_ONE, etc. are defined below the
  // from* methods on which they depend.


  /**
   * A cache of the Long representations of small integer values.
   * @type {!Object}
   * @private
   */
  goog.math.Long.IntCache_ = {};


  /**
   * Returns a Long representing the given (32-bit) integer value.
   * @param {number} value The 32-bit integer in question.
   * @return {!goog.math.Long} The corresponding Long value.
   */
  goog.math.Long.fromInt = function(value) {
    if (-128 <= value && value < 128) {
      var cachedObj = goog.math.Long.IntCache_[value];
      if (cachedObj) {
        return cachedObj;
      }
    }

    var obj = new goog.math.Long(value | 0, value < 0 ? -1 : 0);
    if (-128 <= value && value < 128) {
      goog.math.Long.IntCache_[value] = obj;
    }
    return obj;
  };


  /**
   * Returns a Long representing the given value, provided that it is a finite
   * number.  Otherwise, zero is returned.
   * @param {number} value The number in question.
   * @return {!goog.math.Long} The corresponding Long value.
   */
  goog.math.Long.fromNumber = function(value) {
    if (isNaN(value) || !isFinite(value)) {
      return goog.math.Long.ZERO;
    } else if (value <= -goog.math.Long.TWO_PWR_63_DBL_) {
      return goog.math.Long.MIN_VALUE;
    } else if (value + 1 >= goog.math.Long.TWO_PWR_63_DBL_) {
      return goog.math.Long.MAX_VALUE;
    } else if (value < 0) {
      return goog.math.Long.fromNumber(-value).negate();
    } else {
      return new goog.math.Long(
          (value % goog.math.Long.TWO_PWR_32_DBL_) | 0,
          (value / goog.math.Long.TWO_PWR_32_DBL_) | 0);
    }
  };


  /**
   * Returns a Long representing the 64-bit integer that comes by concatenating
   * the given high and low bits.  Each is assumed to use 32 bits.
   * @param {number} lowBits The low 32-bits.
   * @param {number} highBits The high 32-bits.
   * @return {!goog.math.Long} The corresponding Long value.
   */
  goog.math.Long.fromBits = function(lowBits, highBits) {
    return new goog.math.Long(lowBits, highBits);
  };


  /**
   * Returns a Long representation of the given string, written using the given
   * radix.
   * @param {string} str The textual representation of the Long.
   * @param {number=} opt_radix The radix in which the text is written.
   * @return {!goog.math.Long} The corresponding Long value.
   */
  goog.math.Long.fromString = function(str, opt_radix) {
    if (str.length == 0) {
      throw Error('number format error: empty string');
    }

    var radix = opt_radix || 10;
    if (radix < 2 || 36 < radix) {
      throw Error('radix out of range: ' + radix);
    }

    if (str.charAt(0) == '-') {
      return goog.math.Long.fromString(str.substring(1), radix).negate();
    } else if (str.indexOf('-') >= 0) {
      throw Error('number format error: interior "-" character: ' + str);
    }

    // Do several (8) digits each time through the loop, so as to
    // minimize the calls to the very expensive emulated div.
    var radixToPower = goog.math.Long.fromNumber(Math.pow(radix, 8));

    var result = goog.math.Long.ZERO;
    for (var i = 0; i < str.length; i += 8) {
      var size = Math.min(8, str.length - i);
      var value = parseInt(str.substring(i, i + size), radix);
      if (size < 8) {
        var power = goog.math.Long.fromNumber(Math.pow(radix, size));
        result = result.multiply(power).add(goog.math.Long.fromNumber(value));
      } else {
        result = result.multiply(radixToPower);
        result = result.add(goog.math.Long.fromNumber(value));
      }
    }
    return result;
  };


  // NOTE: the compiler should inline these constant values below and then remove
  // these variables, so there should be no runtime penalty for these.


  /**
   * Number used repeated below in calculations.  This must appear before the
   * first call to any from* function below.
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_16_DBL_ = 1 << 16;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_24_DBL_ = 1 << 24;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_32_DBL_ =
      goog.math.Long.TWO_PWR_16_DBL_ * goog.math.Long.TWO_PWR_16_DBL_;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_31_DBL_ =
      goog.math.Long.TWO_PWR_32_DBL_ / 2;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_48_DBL_ =
      goog.math.Long.TWO_PWR_32_DBL_ * goog.math.Long.TWO_PWR_16_DBL_;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_64_DBL_ =
      goog.math.Long.TWO_PWR_32_DBL_ * goog.math.Long.TWO_PWR_32_DBL_;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_63_DBL_ =
      goog.math.Long.TWO_PWR_64_DBL_ / 2;


  /** @type {!goog.math.Long} */
  goog.math.Long.ZERO = goog.math.Long.fromInt(0);


  /** @type {!goog.math.Long} */
  goog.math.Long.ONE = goog.math.Long.fromInt(1);


  /** @type {!goog.math.Long} */
  goog.math.Long.NEG_ONE = goog.math.Long.fromInt(-1);


  /** @type {!goog.math.Long} */
  goog.math.Long.MAX_VALUE =
      goog.math.Long.fromBits(0xFFFFFFFF | 0, 0x7FFFFFFF | 0);


  /** @type {!goog.math.Long} */
  goog.math.Long.MIN_VALUE = goog.math.Long.fromBits(0, 0x80000000 | 0);


  /**
   * @type {!goog.math.Long}
   * @private
   */
  goog.math.Long.TWO_PWR_24_ = goog.math.Long.fromInt(1 << 24);


  /** @return {number} The value, assuming it is a 32-bit integer. */
  goog.math.Long.prototype.toInt = function() {
    return this.low_;
  };


  /** @return {number} The closest floating-point representation to this value. */
  goog.math.Long.prototype.toNumber = function() {
    return this.high_ * goog.math.Long.TWO_PWR_32_DBL_ +
           this.getLowBitsUnsigned();
  };


  /**
   * @param {number=} opt_radix The radix in which the text should be written.
   * @return {string} The textual representation of this value.
   */
  goog.math.Long.prototype.toString = function(opt_radix) {
    var radix = opt_radix || 10;
    if (radix < 2 || 36 < radix) {
      throw Error('radix out of range: ' + radix);
    }

    if (this.isZero()) {
      return '0';
    }

    if (this.isNegative()) {
      if (this.equals(goog.math.Long.MIN_VALUE)) {
        // We need to change the Long value before it can be negated, so we remove
        // the bottom-most digit in this base and then recurse to do the rest.
        var radixLong = goog.math.Long.fromNumber(radix);
        var div = this.div(radixLong);
        var rem = div.multiply(radixLong).subtract(this);
        return div.toString(radix) + rem.toInt().toString(radix);
      } else {
        return '-' + this.negate().toString(radix);
      }
    }

    // Do several (6) digits each time through the loop, so as to
    // minimize the calls to the very expensive emulated div.
    var radixToPower = goog.math.Long.fromNumber(Math.pow(radix, 6));

    var rem = this;
    var result = '';
    while (true) {
      var remDiv = rem.div(radixToPower);
      var intval = rem.subtract(remDiv.multiply(radixToPower)).toInt();
      var digits = intval.toString(radix);

      rem = remDiv;
      if (rem.isZero()) {
        return digits + result;
      } else {
        while (digits.length < 6) {
          digits = '0' + digits;
        }
        result = '' + digits + result;
      }
    }
  };


  /** @return {number} The high 32-bits as a signed value. */
  goog.math.Long.prototype.getHighBits = function() {
    return this.high_;
  };


  /** @return {number} The low 32-bits as a signed value. */
  goog.math.Long.prototype.getLowBits = function() {
    return this.low_;
  };


  /** @return {number} The low 32-bits as an unsigned value. */
  goog.math.Long.prototype.getLowBitsUnsigned = function() {
    return (this.low_ >= 0) ?
        this.low_ : goog.math.Long.TWO_PWR_32_DBL_ + this.low_;
  };


  /**
   * @return {number} Returns the number of bits needed to represent the absolute
   *     value of this Long.
   */
  goog.math.Long.prototype.getNumBitsAbs = function() {
    if (this.isNegative()) {
      if (this.equals(goog.math.Long.MIN_VALUE)) {
        return 64;
      } else {
        return this.negate().getNumBitsAbs();
      }
    } else {
      var val = this.high_ != 0 ? this.high_ : this.low_;
      for (var bit = 31; bit > 0; bit--) {
        if ((val & (1 << bit)) != 0) {
          break;
        }
      }
      return this.high_ != 0 ? bit + 33 : bit + 1;
    }
  };


  /** @return {boolean} Whether this value is zero. */
  goog.math.Long.prototype.isZero = function() {
    return this.high_ == 0 && this.low_ == 0;
  };


  /** @return {boolean} Whether this value is negative. */
  goog.math.Long.prototype.isNegative = function() {
    return this.high_ < 0;
  };


  /** @return {boolean} Whether this value is odd. */
  goog.math.Long.prototype.isOdd = function() {
    return (this.low_ & 1) == 1;
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long equals the other.
   */
  goog.math.Long.prototype.equals = function(other) {
    return (this.high_ == other.high_) && (this.low_ == other.low_);
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long does not equal the other.
   */
  goog.math.Long.prototype.notEquals = function(other) {
    return (this.high_ != other.high_) || (this.low_ != other.low_);
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long is less than the other.
   */
  goog.math.Long.prototype.lessThan = function(other) {
    return this.compare(other) < 0;
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long is less than or equal to the other.
   */
  goog.math.Long.prototype.lessThanOrEqual = function(other) {
    return this.compare(other) <= 0;
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long is greater than the other.
   */
  goog.math.Long.prototype.greaterThan = function(other) {
    return this.compare(other) > 0;
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long is greater than or equal to the other.
   */
  goog.math.Long.prototype.greaterThanOrEqual = function(other) {
    return this.compare(other) >= 0;
  };


  /**
   * Compares this Long with the given one.
   * @param {goog.math.Long} other Long to compare against.
   * @return {number} 0 if they are the same, 1 if the this is greater, and -1
   *     if the given one is greater.
   */
  goog.math.Long.prototype.compare = function(other) {
    if (this.equals(other)) {
      return 0;
    }

    var thisNeg = this.isNegative();
    var otherNeg = other.isNegative();
    if (thisNeg && !otherNeg) {
      return -1;
    }
    if (!thisNeg && otherNeg) {
      return 1;
    }

    // at this point, the signs are the same, so subtraction will not overflow
    if (this.subtract(other).isNegative()) {
      return -1;
    } else {
      return 1;
    }
  };


  /** @return {!goog.math.Long} The negation of this value. */
  goog.math.Long.prototype.negate = function() {
    if (this.equals(goog.math.Long.MIN_VALUE)) {
      return goog.math.Long.MIN_VALUE;
    } else {
      return this.not().add(goog.math.Long.ONE);
    }
  };


  /**
   * Returns the sum of this and the given Long.
   * @param {goog.math.Long} other Long to add to this one.
   * @return {!goog.math.Long} The sum of this and the given Long.
   */
  goog.math.Long.prototype.add = function(other) {
    // Divide each number into 4 chunks of 16 bits, and then sum the chunks.

    var a48 = this.high_ >>> 16;
    var a32 = this.high_ & 0xFFFF;
    var a16 = this.low_ >>> 16;
    var a00 = this.low_ & 0xFFFF;

    var b48 = other.high_ >>> 16;
    var b32 = other.high_ & 0xFFFF;
    var b16 = other.low_ >>> 16;
    var b00 = other.low_ & 0xFFFF;

    var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
    c00 += a00 + b00;
    c16 += c00 >>> 16;
    c00 &= 0xFFFF;
    c16 += a16 + b16;
    c32 += c16 >>> 16;
    c16 &= 0xFFFF;
    c32 += a32 + b32;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c48 += a48 + b48;
    c48 &= 0xFFFF;
    return goog.math.Long.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
  };


  /**
   * Returns the difference of this and the given Long.
   * @param {goog.math.Long} other Long to subtract from this.
   * @return {!goog.math.Long} The difference of this and the given Long.
   */
  goog.math.Long.prototype.subtract = function(other) {
    return this.add(other.negate());
  };


  /**
   * Returns the product of this and the given long.
   * @param {goog.math.Long} other Long to multiply with this.
   * @return {!goog.math.Long} The product of this and the other.
   */
  goog.math.Long.prototype.multiply = function(other) {
    if (this.isZero()) {
      return goog.math.Long.ZERO;
    } else if (other.isZero()) {
      return goog.math.Long.ZERO;
    }

    if (this.equals(goog.math.Long.MIN_VALUE)) {
      return other.isOdd() ? goog.math.Long.MIN_VALUE : goog.math.Long.ZERO;
    } else if (other.equals(goog.math.Long.MIN_VALUE)) {
      return this.isOdd() ? goog.math.Long.MIN_VALUE : goog.math.Long.ZERO;
    }

    if (this.isNegative()) {
      if (other.isNegative()) {
        return this.negate().multiply(other.negate());
      } else {
        return this.negate().multiply(other).negate();
      }
    } else if (other.isNegative()) {
      return this.multiply(other.negate()).negate();
    }

    // If both longs are small, use float multiplication
    if (this.lessThan(goog.math.Long.TWO_PWR_24_) &&
        other.lessThan(goog.math.Long.TWO_PWR_24_)) {
      return goog.math.Long.fromNumber(this.toNumber() * other.toNumber());
    }

    // Divide each long into 4 chunks of 16 bits, and then add up 4x4 products.
    // We can skip products that would overflow.

    var a48 = this.high_ >>> 16;
    var a32 = this.high_ & 0xFFFF;
    var a16 = this.low_ >>> 16;
    var a00 = this.low_ & 0xFFFF;

    var b48 = other.high_ >>> 16;
    var b32 = other.high_ & 0xFFFF;
    var b16 = other.low_ >>> 16;
    var b00 = other.low_ & 0xFFFF;

    var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
    c00 += a00 * b00;
    c16 += c00 >>> 16;
    c00 &= 0xFFFF;
    c16 += a16 * b00;
    c32 += c16 >>> 16;
    c16 &= 0xFFFF;
    c16 += a00 * b16;
    c32 += c16 >>> 16;
    c16 &= 0xFFFF;
    c32 += a32 * b00;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c32 += a16 * b16;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c32 += a00 * b32;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48;
    c48 &= 0xFFFF;
    return goog.math.Long.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
  };


  /**
   * Returns this Long divided by the given one.
   * @param {goog.math.Long} other Long by which to divide.
   * @return {!goog.math.Long} This Long divided by the given one.
   */
  goog.math.Long.prototype.div = function(other) {
    if (other.isZero()) {
      throw Error('division by zero');
    } else if (this.isZero()) {
      return goog.math.Long.ZERO;
    }

    if (this.equals(goog.math.Long.MIN_VALUE)) {
      if (other.equals(goog.math.Long.ONE) ||
          other.equals(goog.math.Long.NEG_ONE)) {
        return goog.math.Long.MIN_VALUE;  // recall that -MIN_VALUE == MIN_VALUE
      } else if (other.equals(goog.math.Long.MIN_VALUE)) {
        return goog.math.Long.ONE;
      } else {
        // At this point, we have |other| >= 2, so |this/other| < |MIN_VALUE|.
        var halfThis = this.shiftRight(1);
        var approx = halfThis.div(other).shiftLeft(1);
        if (approx.equals(goog.math.Long.ZERO)) {
          return other.isNegative() ? goog.math.Long.ONE : goog.math.Long.NEG_ONE;
        } else {
          var rem = this.subtract(other.multiply(approx));
          var result = approx.add(rem.div(other));
          return result;
        }
      }
    } else if (other.equals(goog.math.Long.MIN_VALUE)) {
      return goog.math.Long.ZERO;
    }

    if (this.isNegative()) {
      if (other.isNegative()) {
        return this.negate().div(other.negate());
      } else {
        return this.negate().div(other).negate();
      }
    } else if (other.isNegative()) {
      return this.div(other.negate()).negate();
    }

    // Repeat the following until the remainder is less than other:  find a
    // floating-point that approximates remainder / other *from below*, add this
    // into the result, and subtract it from the remainder.  It is critical that
    // the approximate value is less than or equal to the real value so that the
    // remainder never becomes negative.
    var res = goog.math.Long.ZERO;
    var rem = this;
    while (rem.greaterThanOrEqual(other)) {
      // Approximate the result of division. This may be a little greater or
      // smaller than the actual value.
      var approx = Math.max(1, Math.floor(rem.toNumber() / other.toNumber()));

      // We will tweak the approximate result by changing it in the 48-th digit or
      // the smallest non-fractional digit, whichever is larger.
      var log2 = Math.ceil(Math.log(approx) / Math.LN2);
      var delta = (log2 <= 48) ? 1 : Math.pow(2, log2 - 48);

      // Decrease the approximation until it is smaller than the remainder.  Note
      // that if it is too large, the product overflows and is negative.
      var approxRes = goog.math.Long.fromNumber(approx);
      var approxRem = approxRes.multiply(other);
      while (approxRem.isNegative() || approxRem.greaterThan(rem)) {
        approx -= delta;
        approxRes = goog.math.Long.fromNumber(approx);
        approxRem = approxRes.multiply(other);
      }

      // We know the answer can't be zero... and actually, zero would cause
      // infinite recursion since we would make no progress.
      if (approxRes.isZero()) {
        approxRes = goog.math.Long.ONE;
      }

      res = res.add(approxRes);
      rem = rem.subtract(approxRem);
    }
    return res;
  };


  /**
   * Returns this Long modulo the given one.
   * @param {goog.math.Long} other Long by which to mod.
   * @return {!goog.math.Long} This Long modulo the given one.
   */
  goog.math.Long.prototype.modulo = function(other) {
    return this.subtract(this.div(other).multiply(other));
  };


  /** @return {!goog.math.Long} The bitwise-NOT of this value. */
  goog.math.Long.prototype.not = function() {
    return goog.math.Long.fromBits(~this.low_, ~this.high_);
  };


  /**
   * Returns the bitwise-AND of this Long and the given one.
   * @param {goog.math.Long} other The Long with which to AND.
   * @return {!goog.math.Long} The bitwise-AND of this and the other.
   */
  goog.math.Long.prototype.and = function(other) {
    return goog.math.Long.fromBits(this.low_ & other.low_,
                                   this.high_ & other.high_);
  };


  /**
   * Returns the bitwise-OR of this Long and the given one.
   * @param {goog.math.Long} other The Long with which to OR.
   * @return {!goog.math.Long} The bitwise-OR of this and the other.
   */
  goog.math.Long.prototype.or = function(other) {
    return goog.math.Long.fromBits(this.low_ | other.low_,
                                   this.high_ | other.high_);
  };


  /**
   * Returns the bitwise-XOR of this Long and the given one.
   * @param {goog.math.Long} other The Long with which to XOR.
   * @return {!goog.math.Long} The bitwise-XOR of this and the other.
   */
  goog.math.Long.prototype.xor = function(other) {
    return goog.math.Long.fromBits(this.low_ ^ other.low_,
                                   this.high_ ^ other.high_);
  };


  /**
   * Returns this Long with bits shifted to the left by the given amount.
   * @param {number} numBits The number of bits by which to shift.
   * @return {!goog.math.Long} This shifted to the left by the given amount.
   */
  goog.math.Long.prototype.shiftLeft = function(numBits) {
    numBits &= 63;
    if (numBits == 0) {
      return this;
    } else {
      var low = this.low_;
      if (numBits < 32) {
        var high = this.high_;
        return goog.math.Long.fromBits(
            low << numBits,
            (high << numBits) | (low >>> (32 - numBits)));
      } else {
        return goog.math.Long.fromBits(0, low << (numBits - 32));
      }
    }
  };


  /**
   * Returns this Long with bits shifted to the right by the given amount.
   * @param {number} numBits The number of bits by which to shift.
   * @return {!goog.math.Long} This shifted to the right by the given amount.
   */
  goog.math.Long.prototype.shiftRight = function(numBits) {
    numBits &= 63;
    if (numBits == 0) {
      return this;
    } else {
      var high = this.high_;
      if (numBits < 32) {
        var low = this.low_;
        return goog.math.Long.fromBits(
            (low >>> numBits) | (high << (32 - numBits)),
            high >> numBits);
      } else {
        return goog.math.Long.fromBits(
            high >> (numBits - 32),
            high >= 0 ? 0 : -1);
      }
    }
  };


  /**
   * Returns this Long with bits shifted to the right by the given amount, with
   * the new top bits matching the current sign bit.
   * @param {number} numBits The number of bits by which to shift.
   * @return {!goog.math.Long} This shifted to the right by the given amount, with
   *     zeros placed into the new leading bits.
   */
  goog.math.Long.prototype.shiftRightUnsigned = function(numBits) {
    numBits &= 63;
    if (numBits == 0) {
      return this;
    } else {
      var high = this.high_;
      if (numBits < 32) {
        var low = this.low_;
        return goog.math.Long.fromBits(
            (low >>> numBits) | (high << (32 - numBits)),
            high >>> numBits);
      } else if (numBits == 32) {
        return goog.math.Long.fromBits(high, 0);
      } else {
        return goog.math.Long.fromBits(high >>> (numBits - 32), 0);
      }
    }
  };

  //======= begin jsbn =======

  var navigator = { appName: 'Modern Browser' }; // polyfill a little

  // Copyright (c) 2005  Tom Wu
  // All Rights Reserved.
  // http://www-cs-students.stanford.edu/~tjw/jsbn/

  /*
   * Copyright (c) 2003-2005  Tom Wu
   * All Rights Reserved.
   *
   * Permission is hereby granted, free of charge, to any person obtaining
   * a copy of this software and associated documentation files (the
   * "Software"), to deal in the Software without restriction, including
   * without limitation the rights to use, copy, modify, merge, publish,
   * distribute, sublicense, and/or sell copies of the Software, and to
   * permit persons to whom the Software is furnished to do so, subject to
   * the following conditions:
   *
   * The above copyright notice and this permission notice shall be
   * included in all copies or substantial portions of the Software.
   *
   * THE SOFTWARE IS PROVIDED "AS-IS" AND WITHOUT WARRANTY OF ANY KIND, 
   * EXPRESS, IMPLIED OR OTHERWISE, INCLUDING WITHOUT LIMITATION, ANY 
   * WARRANTY OF MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE.  
   *
   * IN NO EVENT SHALL TOM WU BE LIABLE FOR ANY SPECIAL, INCIDENTAL,
   * INDIRECT OR CONSEQUENTIAL DAMAGES OF ANY KIND, OR ANY DAMAGES WHATSOEVER
   * RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER OR NOT ADVISED OF
   * THE POSSIBILITY OF DAMAGE, AND ON ANY THEORY OF LIABILITY, ARISING OUT
   * OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
   *
   * In addition, the following condition applies:
   *
   * All redistributions must retain an intact copy of this copyright notice
   * and disclaimer.
   */

  // Basic JavaScript BN library - subset useful for RSA encryption.

  // Bits per digit
  var dbits;

  // JavaScript engine analysis
  var canary = 0xdeadbeefcafe;
  var j_lm = ((canary&0xffffff)==0xefcafe);

  // (public) Constructor
  function BigInteger(a,b,c) {
    if(a != null)
      if("number" == typeof a) this.fromNumber(a,b,c);
      else if(b == null && "string" != typeof a) this.fromString(a,256);
      else this.fromString(a,b);
  }

  // return new, unset BigInteger
  function nbi() { return new BigInteger(null); }

  // am: Compute w_j += (x*this_i), propagate carries,
  // c is initial carry, returns final carry.
  // c < 3*dvalue, x < 2*dvalue, this_i < dvalue
  // We need to select the fastest one that works in this environment.

  // am1: use a single mult and divide to get the high bits,
  // max digit bits should be 26 because
  // max internal value = 2*dvalue^2-2*dvalue (< 2^53)
  function am1(i,x,w,j,c,n) {
    while(--n >= 0) {
      var v = x*this[i++]+w[j]+c;
      c = Math.floor(v/0x4000000);
      w[j++] = v&0x3ffffff;
    }
    return c;
  }
  // am2 avoids a big mult-and-extract completely.
  // Max digit bits should be <= 30 because we do bitwise ops
  // on values up to 2*hdvalue^2-hdvalue-1 (< 2^31)
  function am2(i,x,w,j,c,n) {
    var xl = x&0x7fff, xh = x>>15;
    while(--n >= 0) {
      var l = this[i]&0x7fff;
      var h = this[i++]>>15;
      var m = xh*l+h*xl;
      l = xl*l+((m&0x7fff)<<15)+w[j]+(c&0x3fffffff);
      c = (l>>>30)+(m>>>15)+xh*h+(c>>>30);
      w[j++] = l&0x3fffffff;
    }
    return c;
  }
  // Alternately, set max digit bits to 28 since some
  // browsers slow down when dealing with 32-bit numbers.
  function am3(i,x,w,j,c,n) {
    var xl = x&0x3fff, xh = x>>14;
    while(--n >= 0) {
      var l = this[i]&0x3fff;
      var h = this[i++]>>14;
      var m = xh*l+h*xl;
      l = xl*l+((m&0x3fff)<<14)+w[j]+c;
      c = (l>>28)+(m>>14)+xh*h;
      w[j++] = l&0xfffffff;
    }
    return c;
  }
  if(j_lm && (navigator.appName == "Microsoft Internet Explorer")) {
    BigInteger.prototype.am = am2;
    dbits = 30;
  }
  else if(j_lm && (navigator.appName != "Netscape")) {
    BigInteger.prototype.am = am1;
    dbits = 26;
  }
  else { // Mozilla/Netscape seems to prefer am3
    BigInteger.prototype.am = am3;
    dbits = 28;
  }

  BigInteger.prototype.DB = dbits;
  BigInteger.prototype.DM = ((1<<dbits)-1);
  BigInteger.prototype.DV = (1<<dbits);

  var BI_FP = 52;
  BigInteger.prototype.FV = Math.pow(2,BI_FP);
  BigInteger.prototype.F1 = BI_FP-dbits;
  BigInteger.prototype.F2 = 2*dbits-BI_FP;

  // Digit conversions
  var BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";
  var BI_RC = new Array();
  var rr,vv;
  rr = "0".charCodeAt(0);
  for(vv = 0; vv <= 9; ++vv) BI_RC[rr++] = vv;
  rr = "a".charCodeAt(0);
  for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
  rr = "A".charCodeAt(0);
  for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;

  function int2char(n) { return BI_RM.charAt(n); }
  function intAt(s,i) {
    var c = BI_RC[s.charCodeAt(i)];
    return (c==null)?-1:c;
  }

  // (protected) copy this to r
  function bnpCopyTo(r) {
    for(var i = this.t-1; i >= 0; --i) r[i] = this[i];
    r.t = this.t;
    r.s = this.s;
  }

  // (protected) set from integer value x, -DV <= x < DV
  function bnpFromInt(x) {
    this.t = 1;
    this.s = (x<0)?-1:0;
    if(x > 0) this[0] = x;
    else if(x < -1) this[0] = x+DV;
    else this.t = 0;
  }

  // return bigint initialized to value
  function nbv(i) { var r = nbi(); r.fromInt(i); return r; }

  // (protected) set from string and radix
  function bnpFromString(s,b) {
    var k;
    if(b == 16) k = 4;
    else if(b == 8) k = 3;
    else if(b == 256) k = 8; // byte array
    else if(b == 2) k = 1;
    else if(b == 32) k = 5;
    else if(b == 4) k = 2;
    else { this.fromRadix(s,b); return; }
    this.t = 0;
    this.s = 0;
    var i = s.length, mi = false, sh = 0;
    while(--i >= 0) {
      var x = (k==8)?s[i]&0xff:intAt(s,i);
      if(x < 0) {
        if(s.charAt(i) == "-") mi = true;
        continue;
      }
      mi = false;
      if(sh == 0)
        this[this.t++] = x;
      else if(sh+k > this.DB) {
        this[this.t-1] |= (x&((1<<(this.DB-sh))-1))<<sh;
        this[this.t++] = (x>>(this.DB-sh));
      }
      else
        this[this.t-1] |= x<<sh;
      sh += k;
      if(sh >= this.DB) sh -= this.DB;
    }
    if(k == 8 && (s[0]&0x80) != 0) {
      this.s = -1;
      if(sh > 0) this[this.t-1] |= ((1<<(this.DB-sh))-1)<<sh;
    }
    this.clamp();
    if(mi) BigInteger.ZERO.subTo(this,this);
  }

  // (protected) clamp off excess high words
  function bnpClamp() {
    var c = this.s&this.DM;
    while(this.t > 0 && this[this.t-1] == c) --this.t;
  }

  // (public) return string representation in given radix
  function bnToString(b) {
    if(this.s < 0) return "-"+this.negate().toString(b);
    var k;
    if(b == 16) k = 4;
    else if(b == 8) k = 3;
    else if(b == 2) k = 1;
    else if(b == 32) k = 5;
    else if(b == 4) k = 2;
    else return this.toRadix(b);
    var km = (1<<k)-1, d, m = false, r = "", i = this.t;
    var p = this.DB-(i*this.DB)%k;
    if(i-- > 0) {
      if(p < this.DB && (d = this[i]>>p) > 0) { m = true; r = int2char(d); }
      while(i >= 0) {
        if(p < k) {
          d = (this[i]&((1<<p)-1))<<(k-p);
          d |= this[--i]>>(p+=this.DB-k);
        }
        else {
          d = (this[i]>>(p-=k))&km;
          if(p <= 0) { p += this.DB; --i; }
        }
        if(d > 0) m = true;
        if(m) r += int2char(d);
      }
    }
    return m?r:"0";
  }

  // (public) -this
  function bnNegate() { var r = nbi(); BigInteger.ZERO.subTo(this,r); return r; }

  // (public) |this|
  function bnAbs() { return (this.s<0)?this.negate():this; }

  // (public) return + if this > a, - if this < a, 0 if equal
  function bnCompareTo(a) {
    var r = this.s-a.s;
    if(r != 0) return r;
    var i = this.t;
    r = i-a.t;
    if(r != 0) return (this.s<0)?-r:r;
    while(--i >= 0) if((r=this[i]-a[i]) != 0) return r;
    return 0;
  }

  // returns bit length of the integer x
  function nbits(x) {
    var r = 1, t;
    if((t=x>>>16) != 0) { x = t; r += 16; }
    if((t=x>>8) != 0) { x = t; r += 8; }
    if((t=x>>4) != 0) { x = t; r += 4; }
    if((t=x>>2) != 0) { x = t; r += 2; }
    if((t=x>>1) != 0) { x = t; r += 1; }
    return r;
  }

  // (public) return the number of bits in "this"
  function bnBitLength() {
    if(this.t <= 0) return 0;
    return this.DB*(this.t-1)+nbits(this[this.t-1]^(this.s&this.DM));
  }

  // (protected) r = this << n*DB
  function bnpDLShiftTo(n,r) {
    var i;
    for(i = this.t-1; i >= 0; --i) r[i+n] = this[i];
    for(i = n-1; i >= 0; --i) r[i] = 0;
    r.t = this.t+n;
    r.s = this.s;
  }

  // (protected) r = this >> n*DB
  function bnpDRShiftTo(n,r) {
    for(var i = n; i < this.t; ++i) r[i-n] = this[i];
    r.t = Math.max(this.t-n,0);
    r.s = this.s;
  }

  // (protected) r = this << n
  function bnpLShiftTo(n,r) {
    var bs = n%this.DB;
    var cbs = this.DB-bs;
    var bm = (1<<cbs)-1;
    var ds = Math.floor(n/this.DB), c = (this.s<<bs)&this.DM, i;
    for(i = this.t-1; i >= 0; --i) {
      r[i+ds+1] = (this[i]>>cbs)|c;
      c = (this[i]&bm)<<bs;
    }
    for(i = ds-1; i >= 0; --i) r[i] = 0;
    r[ds] = c;
    r.t = this.t+ds+1;
    r.s = this.s;
    r.clamp();
  }

  // (protected) r = this >> n
  function bnpRShiftTo(n,r) {
    r.s = this.s;
    var ds = Math.floor(n/this.DB);
    if(ds >= this.t) { r.t = 0; return; }
    var bs = n%this.DB;
    var cbs = this.DB-bs;
    var bm = (1<<bs)-1;
    r[0] = this[ds]>>bs;
    for(var i = ds+1; i < this.t; ++i) {
      r[i-ds-1] |= (this[i]&bm)<<cbs;
      r[i-ds] = this[i]>>bs;
    }
    if(bs > 0) r[this.t-ds-1] |= (this.s&bm)<<cbs;
    r.t = this.t-ds;
    r.clamp();
  }

  // (protected) r = this - a
  function bnpSubTo(a,r) {
    var i = 0, c = 0, m = Math.min(a.t,this.t);
    while(i < m) {
      c += this[i]-a[i];
      r[i++] = c&this.DM;
      c >>= this.DB;
    }
    if(a.t < this.t) {
      c -= a.s;
      while(i < this.t) {
        c += this[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      c += this.s;
    }
    else {
      c += this.s;
      while(i < a.t) {
        c -= a[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      c -= a.s;
    }
    r.s = (c<0)?-1:0;
    if(c < -1) r[i++] = this.DV+c;
    else if(c > 0) r[i++] = c;
    r.t = i;
    r.clamp();
  }

  // (protected) r = this * a, r != this,a (HAC 14.12)
  // "this" should be the larger one if appropriate.
  function bnpMultiplyTo(a,r) {
    var x = this.abs(), y = a.abs();
    var i = x.t;
    r.t = i+y.t;
    while(--i >= 0) r[i] = 0;
    for(i = 0; i < y.t; ++i) r[i+x.t] = x.am(0,y[i],r,i,0,x.t);
    r.s = 0;
    r.clamp();
    if(this.s != a.s) BigInteger.ZERO.subTo(r,r);
  }

  // (protected) r = this^2, r != this (HAC 14.16)
  function bnpSquareTo(r) {
    var x = this.abs();
    var i = r.t = 2*x.t;
    while(--i >= 0) r[i] = 0;
    for(i = 0; i < x.t-1; ++i) {
      var c = x.am(i,x[i],r,2*i,0,1);
      if((r[i+x.t]+=x.am(i+1,2*x[i],r,2*i+1,c,x.t-i-1)) >= x.DV) {
        r[i+x.t] -= x.DV;
        r[i+x.t+1] = 1;
      }
    }
    if(r.t > 0) r[r.t-1] += x.am(i,x[i],r,2*i,0,1);
    r.s = 0;
    r.clamp();
  }

  // (protected) divide this by m, quotient and remainder to q, r (HAC 14.20)
  // r != q, this != m.  q or r may be null.
  function bnpDivRemTo(m,q,r) {
    var pm = m.abs();
    if(pm.t <= 0) return;
    var pt = this.abs();
    if(pt.t < pm.t) {
      if(q != null) q.fromInt(0);
      if(r != null) this.copyTo(r);
      return;
    }
    if(r == null) r = nbi();
    var y = nbi(), ts = this.s, ms = m.s;
    var nsh = this.DB-nbits(pm[pm.t-1]);	// normalize modulus
    if(nsh > 0) { pm.lShiftTo(nsh,y); pt.lShiftTo(nsh,r); }
    else { pm.copyTo(y); pt.copyTo(r); }
    var ys = y.t;
    var y0 = y[ys-1];
    if(y0 == 0) return;
    var yt = y0*(1<<this.F1)+((ys>1)?y[ys-2]>>this.F2:0);
    var d1 = this.FV/yt, d2 = (1<<this.F1)/yt, e = 1<<this.F2;
    var i = r.t, j = i-ys, t = (q==null)?nbi():q;
    y.dlShiftTo(j,t);
    if(r.compareTo(t) >= 0) {
      r[r.t++] = 1;
      r.subTo(t,r);
    }
    BigInteger.ONE.dlShiftTo(ys,t);
    t.subTo(y,y);	// "negative" y so we can replace sub with am later
    while(y.t < ys) y[y.t++] = 0;
    while(--j >= 0) {
      // Estimate quotient digit
      var qd = (r[--i]==y0)?this.DM:Math.floor(r[i]*d1+(r[i-1]+e)*d2);
      if((r[i]+=y.am(0,qd,r,j,0,ys)) < qd) {	// Try it out
        y.dlShiftTo(j,t);
        r.subTo(t,r);
        while(r[i] < --qd) r.subTo(t,r);
      }
    }
    if(q != null) {
      r.drShiftTo(ys,q);
      if(ts != ms) BigInteger.ZERO.subTo(q,q);
    }
    r.t = ys;
    r.clamp();
    if(nsh > 0) r.rShiftTo(nsh,r);	// Denormalize remainder
    if(ts < 0) BigInteger.ZERO.subTo(r,r);
  }

  // (public) this mod a
  function bnMod(a) {
    var r = nbi();
    this.abs().divRemTo(a,null,r);
    if(this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) a.subTo(r,r);
    return r;
  }

  // Modular reduction using "classic" algorithm
  function Classic(m) { this.m = m; }
  function cConvert(x) {
    if(x.s < 0 || x.compareTo(this.m) >= 0) return x.mod(this.m);
    else return x;
  }
  function cRevert(x) { return x; }
  function cReduce(x) { x.divRemTo(this.m,null,x); }
  function cMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }
  function cSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

  Classic.prototype.convert = cConvert;
  Classic.prototype.revert = cRevert;
  Classic.prototype.reduce = cReduce;
  Classic.prototype.mulTo = cMulTo;
  Classic.prototype.sqrTo = cSqrTo;

  // (protected) return "-1/this % 2^DB"; useful for Mont. reduction
  // justification:
  //         xy == 1 (mod m)
  //         xy =  1+km
  //   xy(2-xy) = (1+km)(1-km)
  // x[y(2-xy)] = 1-k^2m^2
  // x[y(2-xy)] == 1 (mod m^2)
  // if y is 1/x mod m, then y(2-xy) is 1/x mod m^2
  // should reduce x and y(2-xy) by m^2 at each step to keep size bounded.
  // JS multiply "overflows" differently from C/C++, so care is needed here.
  function bnpInvDigit() {
    if(this.t < 1) return 0;
    var x = this[0];
    if((x&1) == 0) return 0;
    var y = x&3;		// y == 1/x mod 2^2
    y = (y*(2-(x&0xf)*y))&0xf;	// y == 1/x mod 2^4
    y = (y*(2-(x&0xff)*y))&0xff;	// y == 1/x mod 2^8
    y = (y*(2-(((x&0xffff)*y)&0xffff)))&0xffff;	// y == 1/x mod 2^16
    // last step - calculate inverse mod DV directly;
    // assumes 16 < DB <= 32 and assumes ability to handle 48-bit ints
    y = (y*(2-x*y%this.DV))%this.DV;		// y == 1/x mod 2^dbits
    // we really want the negative inverse, and -DV < y < DV
    return (y>0)?this.DV-y:-y;
  }

  // Montgomery reduction
  function Montgomery(m) {
    this.m = m;
    this.mp = m.invDigit();
    this.mpl = this.mp&0x7fff;
    this.mph = this.mp>>15;
    this.um = (1<<(m.DB-15))-1;
    this.mt2 = 2*m.t;
  }

  // xR mod m
  function montConvert(x) {
    var r = nbi();
    x.abs().dlShiftTo(this.m.t,r);
    r.divRemTo(this.m,null,r);
    if(x.s < 0 && r.compareTo(BigInteger.ZERO) > 0) this.m.subTo(r,r);
    return r;
  }

  // x/R mod m
  function montRevert(x) {
    var r = nbi();
    x.copyTo(r);
    this.reduce(r);
    return r;
  }

  // x = x/R mod m (HAC 14.32)
  function montReduce(x) {
    while(x.t <= this.mt2)	// pad x so am has enough room later
      x[x.t++] = 0;
    for(var i = 0; i < this.m.t; ++i) {
      // faster way of calculating u0 = x[i]*mp mod DV
      var j = x[i]&0x7fff;
      var u0 = (j*this.mpl+(((j*this.mph+(x[i]>>15)*this.mpl)&this.um)<<15))&x.DM;
      // use am to combine the multiply-shift-add into one call
      j = i+this.m.t;
      x[j] += this.m.am(0,u0,x,i,0,this.m.t);
      // propagate carry
      while(x[j] >= x.DV) { x[j] -= x.DV; x[++j]++; }
    }
    x.clamp();
    x.drShiftTo(this.m.t,x);
    if(x.compareTo(this.m) >= 0) x.subTo(this.m,x);
  }

  // r = "x^2/R mod m"; x != r
  function montSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

  // r = "xy/R mod m"; x,y != r
  function montMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }

  Montgomery.prototype.convert = montConvert;
  Montgomery.prototype.revert = montRevert;
  Montgomery.prototype.reduce = montReduce;
  Montgomery.prototype.mulTo = montMulTo;
  Montgomery.prototype.sqrTo = montSqrTo;

  // (protected) true iff this is even
  function bnpIsEven() { return ((this.t>0)?(this[0]&1):this.s) == 0; }

  // (protected) this^e, e < 2^32, doing sqr and mul with "r" (HAC 14.79)
  function bnpExp(e,z) {
    if(e > 0xffffffff || e < 1) return BigInteger.ONE;
    var r = nbi(), r2 = nbi(), g = z.convert(this), i = nbits(e)-1;
    g.copyTo(r);
    while(--i >= 0) {
      z.sqrTo(r,r2);
      if((e&(1<<i)) > 0) z.mulTo(r2,g,r);
      else { var t = r; r = r2; r2 = t; }
    }
    return z.revert(r);
  }

  // (public) this^e % m, 0 <= e < 2^32
  function bnModPowInt(e,m) {
    var z;
    if(e < 256 || m.isEven()) z = new Classic(m); else z = new Montgomery(m);
    return this.exp(e,z);
  }

  // protected
  BigInteger.prototype.copyTo = bnpCopyTo;
  BigInteger.prototype.fromInt = bnpFromInt;
  BigInteger.prototype.fromString = bnpFromString;
  BigInteger.prototype.clamp = bnpClamp;
  BigInteger.prototype.dlShiftTo = bnpDLShiftTo;
  BigInteger.prototype.drShiftTo = bnpDRShiftTo;
  BigInteger.prototype.lShiftTo = bnpLShiftTo;
  BigInteger.prototype.rShiftTo = bnpRShiftTo;
  BigInteger.prototype.subTo = bnpSubTo;
  BigInteger.prototype.multiplyTo = bnpMultiplyTo;
  BigInteger.prototype.squareTo = bnpSquareTo;
  BigInteger.prototype.divRemTo = bnpDivRemTo;
  BigInteger.prototype.invDigit = bnpInvDigit;
  BigInteger.prototype.isEven = bnpIsEven;
  BigInteger.prototype.exp = bnpExp;

  // public
  BigInteger.prototype.toString = bnToString;
  BigInteger.prototype.negate = bnNegate;
  BigInteger.prototype.abs = bnAbs;
  BigInteger.prototype.compareTo = bnCompareTo;
  BigInteger.prototype.bitLength = bnBitLength;
  BigInteger.prototype.mod = bnMod;
  BigInteger.prototype.modPowInt = bnModPowInt;

  // "constants"
  BigInteger.ZERO = nbv(0);
  BigInteger.ONE = nbv(1);

  // jsbn2 stuff

  // (protected) convert from radix string
  function bnpFromRadix(s,b) {
    this.fromInt(0);
    if(b == null) b = 10;
    var cs = this.chunkSize(b);
    var d = Math.pow(b,cs), mi = false, j = 0, w = 0;
    for(var i = 0; i < s.length; ++i) {
      var x = intAt(s,i);
      if(x < 0) {
        if(s.charAt(i) == "-" && this.signum() == 0) mi = true;
        continue;
      }
      w = b*w+x;
      if(++j >= cs) {
        this.dMultiply(d);
        this.dAddOffset(w,0);
        j = 0;
        w = 0;
      }
    }
    if(j > 0) {
      this.dMultiply(Math.pow(b,j));
      this.dAddOffset(w,0);
    }
    if(mi) BigInteger.ZERO.subTo(this,this);
  }

  // (protected) return x s.t. r^x < DV
  function bnpChunkSize(r) { return Math.floor(Math.LN2*this.DB/Math.log(r)); }

  // (public) 0 if this == 0, 1 if this > 0
  function bnSigNum() {
    if(this.s < 0) return -1;
    else if(this.t <= 0 || (this.t == 1 && this[0] <= 0)) return 0;
    else return 1;
  }

  // (protected) this *= n, this >= 0, 1 < n < DV
  function bnpDMultiply(n) {
    this[this.t] = this.am(0,n-1,this,0,0,this.t);
    ++this.t;
    this.clamp();
  }

  // (protected) this += n << w words, this >= 0
  function bnpDAddOffset(n,w) {
    if(n == 0) return;
    while(this.t <= w) this[this.t++] = 0;
    this[w] += n;
    while(this[w] >= this.DV) {
      this[w] -= this.DV;
      if(++w >= this.t) this[this.t++] = 0;
      ++this[w];
    }
  }

  // (protected) convert to radix string
  function bnpToRadix(b) {
    if(b == null) b = 10;
    if(this.signum() == 0 || b < 2 || b > 36) return "0";
    var cs = this.chunkSize(b);
    var a = Math.pow(b,cs);
    var d = nbv(a), y = nbi(), z = nbi(), r = "";
    this.divRemTo(d,y,z);
    while(y.signum() > 0) {
      r = (a+z.intValue()).toString(b).substr(1) + r;
      y.divRemTo(d,y,z);
    }
    return z.intValue().toString(b) + r;
  }

  // (public) return value as integer
  function bnIntValue() {
    if(this.s < 0) {
      if(this.t == 1) return this[0]-this.DV;
      else if(this.t == 0) return -1;
    }
    else if(this.t == 1) return this[0];
    else if(this.t == 0) return 0;
    // assumes 16 < DB < 32
    return ((this[1]&((1<<(32-this.DB))-1))<<this.DB)|this[0];
  }

  // (protected) r = this + a
  function bnpAddTo(a,r) {
    var i = 0, c = 0, m = Math.min(a.t,this.t);
    while(i < m) {
      c += this[i]+a[i];
      r[i++] = c&this.DM;
      c >>= this.DB;
    }
    if(a.t < this.t) {
      c += a.s;
      while(i < this.t) {
        c += this[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      c += this.s;
    }
    else {
      c += this.s;
      while(i < a.t) {
        c += a[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      c += a.s;
    }
    r.s = (c<0)?-1:0;
    if(c > 0) r[i++] = c;
    else if(c < -1) r[i++] = this.DV+c;
    r.t = i;
    r.clamp();
  }

  BigInteger.prototype.fromRadix = bnpFromRadix;
  BigInteger.prototype.chunkSize = bnpChunkSize;
  BigInteger.prototype.signum = bnSigNum;
  BigInteger.prototype.dMultiply = bnpDMultiply;
  BigInteger.prototype.dAddOffset = bnpDAddOffset;
  BigInteger.prototype.toRadix = bnpToRadix;
  BigInteger.prototype.intValue = bnIntValue;
  BigInteger.prototype.addTo = bnpAddTo;

  //======= end jsbn =======

  // Emscripten wrapper
  var Wrapper = {
    abs: function(l, h) {
      var x = new goog.math.Long(l, h);
      var ret;
      if (x.isNegative()) {
        ret = x.negate();
      } else {
        ret = x;
      }
      HEAP32[tempDoublePtr>>2] = ret.low_;
      HEAP32[tempDoublePtr+4>>2] = ret.high_;
    },
    ensureTemps: function() {
      if (Wrapper.ensuredTemps) return;
      Wrapper.ensuredTemps = true;
      Wrapper.two32 = new BigInteger();
      Wrapper.two32.fromString('4294967296', 10);
      Wrapper.two64 = new BigInteger();
      Wrapper.two64.fromString('18446744073709551616', 10);
      Wrapper.temp1 = new BigInteger();
      Wrapper.temp2 = new BigInteger();
    },
    lh2bignum: function(l, h) {
      var a = new BigInteger();
      a.fromString(h.toString(), 10);
      var b = new BigInteger();
      a.multiplyTo(Wrapper.two32, b);
      var c = new BigInteger();
      c.fromString(l.toString(), 10);
      var d = new BigInteger();
      c.addTo(b, d);
      return d;
    },
    stringify: function(l, h, unsigned) {
      var ret = new goog.math.Long(l, h).toString();
      if (unsigned && ret[0] == '-') {
        // unsign slowly using jsbn bignums
        Wrapper.ensureTemps();
        var bignum = new BigInteger();
        bignum.fromString(ret, 10);
        ret = new BigInteger();
        Wrapper.two64.addTo(bignum, ret);
        ret = ret.toString(10);
      }
      return ret;
    },
    fromString: function(str, base, min, max, unsigned) {
      Wrapper.ensureTemps();
      var bignum = new BigInteger();
      bignum.fromString(str, base);
      var bigmin = new BigInteger();
      bigmin.fromString(min, 10);
      var bigmax = new BigInteger();
      bigmax.fromString(max, 10);
      if (unsigned && bignum.compareTo(BigInteger.ZERO) < 0) {
        var temp = new BigInteger();
        bignum.addTo(Wrapper.two64, temp);
        bignum = temp;
      }
      var error = false;
      if (bignum.compareTo(bigmin) < 0) {
        bignum = bigmin;
        error = true;
      } else if (bignum.compareTo(bigmax) > 0) {
        bignum = bigmax;
        error = true;
      }
      var ret = goog.math.Long.fromString(bignum.toString()); // min-max checks should have clamped this to a range goog.math.Long can handle well
      HEAP32[tempDoublePtr>>2] = ret.low_;
      HEAP32[tempDoublePtr+4>>2] = ret.high_;
      if (error) throw 'range error';
    }
  };
  return Wrapper;
})();

//======= end closure i64 code =======



// === Auto-generated postamble setup entry stuff ===

if (memoryInitializer) {
  if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
    var data = Module['readBinary'](memoryInitializer);
    HEAPU8.set(data, STATIC_BASE);
  } else {
    addRunDependency('memory initializer');
    Browser.asyncLoad(memoryInitializer, function(data) {
      HEAPU8.set(data, STATIC_BASE);
      removeRunDependency('memory initializer');
    }, function(data) {
      throw 'could not load memory initializer ' + memoryInitializer;
    });
  }
}

function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
};
ExitStatus.prototype = new Error();
ExitStatus.prototype.constructor = ExitStatus;

var initialStackTop;
var preloadStartTime = null;
var calledMain = false;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!Module['calledRun'] && shouldRunNow) run();
  if (!Module['calledRun']) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
}

Module['callMain'] = Module.callMain = function callMain(args) {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on __ATMAIN__)');
  assert(__ATPRERUN__.length == 0, 'cannot call main when preRun functions remain to be called');

  args = args || [];

  ensureInitRuntime();

  var argc = args.length+1;
  function pad() {
    for (var i = 0; i < 4-1; i++) {
      argv.push(0);
    }
  }
  var argv = [allocate(intArrayFromString("/bin/this.program"), 'i8', ALLOC_NORMAL) ];
  pad();
  for (var i = 0; i < argc-1; i = i + 1) {
    argv.push(allocate(intArrayFromString(args[i]), 'i8', ALLOC_NORMAL));
    pad();
  }
  argv.push(0);
  argv = allocate(argv, 'i32', ALLOC_NORMAL);

  initialStackTop = STACKTOP;

  try {

    var ret = Module['_main'](argc, argv, 0);


    // if we're not running an evented main loop, it's time to exit
    if (!Module['noExitRuntime']) {
      exit(ret);
    }
  }
  catch(e) {
    if (e instanceof ExitStatus) {
      // exit() throws this once it's done to make sure execution
      // has been stopped completely
      return;
    } else if (e == 'SimulateInfiniteLoop') {
      // running an evented main loop, don't immediately exit
      Module['noExitRuntime'] = true;
      return;
    } else {
      if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
      throw e;
    }
  } finally {
    calledMain = true;
  }
}




function run(args) {
  args = args || Module['arguments'];

  if (preloadStartTime === null) preloadStartTime = Date.now();

  if (runDependencies > 0) {
    Module.printErr('run() called, but dependencies remain, so not running');
    return;
  }

  preRun();

  if (runDependencies > 0) return; // a preRun added a dependency, run will be called later
  if (Module['calledRun']) return; // run may have just been called through dependencies being fulfilled just in this very frame

  function doRun() {
    if (Module['calledRun']) return; // run may have just been called while the async setStatus time below was happening
    Module['calledRun'] = true;

    ensureInitRuntime();

    preMain();

    if (ENVIRONMENT_IS_WEB && preloadStartTime !== null) {
      Module.printErr('pre-main prep time: ' + (Date.now() - preloadStartTime) + ' ms');
    }

    if (Module['_main'] && shouldRunNow) {
      Module['callMain'](args);
    }

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      if (!ABORT) doRun();
    }, 1);
  } else {
    doRun();
  }
}
Module['run'] = Module.run = run;

function exit(status) {
  ABORT = true;
  EXITSTATUS = status;
  STACKTOP = initialStackTop;

  // exit the runtime
  exitRuntime();

  // TODO We should handle this differently based on environment.
  // In the browser, the best we can do is throw an exception
  // to halt execution, but in node we could process.exit and
  // I'd imagine SM shell would have something equivalent.
  // This would let us set a proper exit status (which
  // would be great for checking test exit statuses).
  // https://github.com/kripken/emscripten/issues/1371

  // throw an exception to halt the current execution
  throw new ExitStatus(status);
}
Module['exit'] = Module.exit = exit;

function abort(text) {
  if (text) {
    Module.print(text);
    Module.printErr(text);
  }

  ABORT = true;
  EXITSTATUS = 1;

  var extra = '\nIf this abort() is unexpected, build with -s ASSERTIONS=1 which can give more information.';

  throw 'abort() at ' + stackTrace() + extra;
}
Module['abort'] = Module.abort = abort;

// {{PRE_RUN_ADDITIONS}}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}

// shouldRunNow refers to calling main(), not run().
var shouldRunNow = true;
if (Module['noInitialRun']) {
  shouldRunNow = false;
}


run();

// {{POST_RUN_ADDITIONS}}






// {{MODULE_ADDITIONS}}







  // This should be made to only make a new context if one does not exist

  if (!faust.context)
  {
    faust.context = new AudioContext();
  }

  var OSC_constructor = Module.cwrap('OSC_constructor', 'number', 'number');
  var OSC_destructor = Module.cwrap('OSC_destructor', null, ['number']);
  var OSC_compute = Module.cwrap('OSC_compute', ['number'], ['number', 'number', 'number', 'number']);
  var OSC_getNumInputs = Module.cwrap('OSC_getNumInputs', 'number', 'number');
  var OSC_getNumOutputs = Module.cwrap('OSC_getNumOutputs', 'number', 'number');
  var OSC_getNumParams = Module.cwrap('OSC_getNumParams', 'number', 'number');
  var OSC_getNextParam = Module.cwrap('OSC_getNextParam', 'number', ['number', 'number']);

  faust.cubicDistortion = function () {
    var that = {};
    
    that.model = {
      playing: false
    };

    that.ptr = OSC_constructor(faust.context.sampleRate);

    // Bind to C++ Member Functions

    that.getNumInputs = function () {
      return OSC_getNumInputs(that.ptr);
    };

    that.getNumOutputs = function () {
      return OSC_getNumOutputs(that.ptr);
    };

    that.compute = function (e) {
      var cubicDistortionOutChans = HEAP32.subarray(that.outs >> 2, (that.outs + that.numOut * that.ptrsize) >> 2);
      var cubicDistortionInChans = HEAP32.subarray(that.ins >> 2, (that.ins + that.ins * that.ptrsize) >> 2);
      var i, j;
      for (i = 0; i < that.numIn; i++)
      {
        var input = e.inputBuffer.getChannelData(i);
        var cubicDistortionInput = HEAPF32.subarray(cubicDistortionInChans[i] >> 2, (cubicDistortionInChans[i] + that.vectorsize * that.ptrsize) >> 2);

        for (j = 0; j < input.length; j++) {
          cubicDistortionInput[j] = input[j];
        }
      }

      OSC_compute(that.ptr, that.vectorsize, that.ins, that.outs);

      for (i = 0; i < that.numOut; i++)
      {
        var output = e.outputBuffer.getChannelData(i);
        var cubicDistortionOutput = HEAPF32.subarray(cubicDistortionOutChans[i] >> 2, (cubicDistortionOutChans[i] + that.vectorsize * that.ptrsize) >> 2);

        for (j = 0; j < output.length; j++) {
          output[j] = cubicDistortionOutput[j];
        }
      }
      return that;
    };

    that.destroy = function () {
      OSC_destructor(that.ptr);
      return that;
    };

    // Connect to another node
    that.connect = function (node) {
      if (node.scriptProcessor)
      {
        that.scriptProcessor.connect(node.scriptProcessor);
      }
      else {
        that.scriptProcessor.connect(node);
      }
      return that;
    };

    // Bind to Web Audio

    that.play = function () {
      that.scriptProcessor.connect(faust.context.destination);
      that.model.playing = true;
      return that;
    };

    that.pause = function () {
      that.scriptProcessor.disconnect(faust.context.destination);
      that.model.playing = false;
      return that;
    };

    that.toggle = function() {
      if (that.model.playing) {
        that.pause()
      }
      else {
        that.play();
      }
      return that;
    }

    that.setupModel = function () {
      var i;
      var numParams = OSC_getNumParams(that.ptr);
      for (i = 0; i < numParams; i++) {
        //TODO keyptr is allocated on stack, but is it properly freed?
        var keyPtr = allocate(intArrayFromString(''), 'i8', ALLOC_STACK);
        var valPtr = OSC_getNextParam(that.ptr, keyPtr);
        var key = Pointer_stringify(keyPtr);
        that.model[key] = valPtr;
      }
      return that;
    };

    that.update = function (key, val) {
      HEAPF32[that.model[key] >> 2] = val;
      return that;
    };

    that.init = function () {
      var i;
      that.ptrsize = 4; //assuming poitner in emscripten are 32bits
      that.vectorsize = 2048;
      that.samplesize = 4;

      // Get input / output counts
      that.numIn = that.getNumInputs();
      that.numOut = that.getNumOutputs();

      // Setup web audio context
      that.scriptProcessor = faust.context.createScriptProcessor(that.vectorsize, that.numIn, that.numOut);
      that.scriptProcessor.onaudioprocess = that.compute;

      // TODO the below calls to malloc are not yet being freed, potential memory leak
      // allocate memory for input / output arrays
      that.ins = Module._malloc(that.ptrsize * that.numIn);

      // assign to our array of pointer elements an array of 32bit floats, one for each channel. currently we assume pointers are 32bits
      for (i = 0; i < that.numIn; i++) { 
        // assign memory at that.ins[i] to a new ptr value. maybe there's an easier way, but this is clearer to me than any typedarray magic beyond the presumably TypedArray HEAP32
        HEAP32[(that.ins >> 2) + i] = Module._malloc(that.vectorsize * that.samplesize); 
      }

      //ptrsize, change to eight or use Runtime.QUANTUM? or what?
      that.outs = Module._malloc(that.ptrsize * that.numOut); 

      // assign to our array of pointer elements an array of 64bit floats, one for each channel. currently we assume pointers are 32bits
      for (i = 0; i < that.numOut; i++) { 
        // assign memory at that.ins[i] to a new ptr value. maybe there's an easier way, but this is clearer to me than any typedarray magic beyond the presumably TypedArray HEAP32
        HEAP32[(that.outs >> 2) + i] = Module._malloc(that.vectorsize * that.samplesize);
      }
      that.setupModel();
      return that;
    };

    that.init();

    return that;
  };
}());
