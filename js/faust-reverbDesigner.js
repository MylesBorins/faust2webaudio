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
window.AudioContext = window.AudioContext || window.webkitAudioContext || undefined;

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
var __ZTVN10__cxxabiv117__class_type_infoE = 14824;
var __ZTVN10__cxxabiv120__si_class_type_infoE = 14864;




STATIC_BASE = 8;

STATICTOP = STATIC_BASE + Runtime.alignMemory(15691);
/* global initializers */ __ATINIT__.push({ func: function() { __GLOBAL__I_a() } });


/* memory initializer */ allocate([0,0,0,0,96,0,0,0,1,0,0,0,2,0,0,0,1,0,0,0,2,0,0,0,3,0,0,0,3,0,0,0,1,0,0,0,2,0,0,0,1,0,0,0,2,0,0,0,3,0,0,0,1,0,0,0,2,0,0,0,1,0,0,0,52,74,83,85,73,0,0,0,50,85,73,0,0,0,0,0,240,57,0,0,80,0,0,0,24,58,0,0,72,0,0,0,88,0,0,0,0,0,0,0,0,0,0,0,232,0,0,0,4,0,0,0,5,0,0,0,1,0,0,0,2,0,0,0,4,0,0,0,5,0,0,0,2,0,0,0,6,0,0,0,49,57,82,101,118,101,114,98,68,101,115,105,103,110,101,114,95,119,114,97,112,0,0,0,49,52,82,101,118,101,114,98,68,101,115,105,103,110,101,114,0,0,0,0,0,0,0,0,51,100,115,112,0,0,0,0,240,57,0,0,200,0,0,0,24,58,0,0,176,0,0,0,208,0,0,0,0,0,0,0,24,58,0,0,152,0,0,0,216,0,0,0,0,0,0,0,114,101,118,101,114,98,68,101,115,105,103,110,101,114,0,0,116,111,111,108,116,105,112,0,83,101,101,32,70,97,117,115,116,39,115,32,101,102,102,101,99,116,46,108,105,98,32,102,111,114,32,100,111,99,117,109,101,110,116,97,116,105,111,110,32,97,110,100,32,114,101,102,101,114,101,110,99,101,115,0,70,69,69,68,66,65,67,75,32,68,69,76,65,89,32,78,69,84,87,79,82,75,32,40,70,68,78,41,32,82,69,86,69,82,66,69,82,65,84,79,82,44,32,79,82,68,69,82,32,49,54,0,0,0,0,0,49,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,66,97,110,100,32,67,114,111,115,115,111,118,101,114,32,70,114,101,113,117,101,110,99,105,101,115,0,0,0,0,0,0,48,0,0,0,0,0,0,0,69,97,99,104,32,100,101,108,97,121,45,108,105,110,101,32,115,105,103,110,97,108,32,105,115,32,115,112,108,105,116,32,105,110,116,111,32,102,114,101,113,117,101,110,99,121,45,98,97,110,100,115,32,102,111,114,32,115,101,112,97,114,97,116,101,32,100,101,99,97,121,45,116,105,109,101,32,99,111,110,116,114,111,108,32,105,110,32,101,97,99,104,32,98,97,110,100,0,0,0,0,0,0,0,117,110,105,116,0,0,0,0,72,122,0,0,0,0,0,0,66,97,110,100,32,48,32,117,112,112,101,114,32,101,100,103,101,32,105,110,32,72,122,0,66,97,110,100,32,49,32,117,112,112,101,114,32,101,100,103,101,32,105,110,32,72,122,0,50,0,0,0,0,0,0,0,66,97,110,100,32,50,32,117,112,112,101,114,32,101,100,103,101,32,105,110,32,72,122,0,51,0,0,0,0,0,0,0,66,97,110,100,32,51,32,117,112,112,101,114,32,101,100,103,101,32,105,110,32,72,122,0,66,97,110,100,32,68,101,99,97,121,32,84,105,109,101,115,32,40,84,54,48,41,0,0,84,54,48,32,105,115,32,116,104,101,32,54,48,100,66,32,100,101,99,97,121,45,116,105,109,101,32,105,110,32,115,101,99,111,110,100,115,46,32,70,111,114,32,99,111,110,99,101,114,116,32,104,97,108,108,115,44,32,97,110,32,111,118,101,114,97,108,108,32,114,101,118,101,114,98,101,114,97,116,105,111,110,32,116,105,109,101,32,40,84,54,48,41,32,110,101,97,114,32,49,46,57,32,115,101,99,111,110,100,115,32,105,115,32,116,121,112,105,99,97,108,32,91,66,101,114,97,110,101,107,32,50,48,48,52,93,46,32,72,101,114,101,32,119,101,32,109,97,121,32,115,101,116,32,84,54,48,32,105,110,100,101,112,101,110,100,101,110,116,108,121,32,105,110,32,101,97,99,104,32,102,114,101,113,117,101,110,99,121,32,98,97,110,100,46,32,32,73,110,32,114,101,97,108,32,114,111,111,109,115,44,32,104,105,103,104,101,114,32,102,114,101,113,117,101,110,99,121,32,98,97,110,100,115,32,103,101,110,101,114,97,108,108,121,32,100,101,99,97,121,32,102,97,115,116,101,114,32,100,117,101,32,116,111,32,97,98,115,111,114,112,116,105,111,110,32,97,110,100,32,115,99,97,116,116,101,114,105,110,103,46,0,0,0,0,0,115,0,0,0,0,0,0,0,52,0,0,0,0,0,0,0,82,111,111,109,32,68,105,109,101,110,115,105,111,110,115,0,84,104,105,115,32,108,101,110,103,116,104,32,40,105,110,32,109,101,116,101,114,115,41,32,100,101,116,101,114,109,105,110,101,115,32,116,104,101,32,115,104,111,114,116,101,115,116,32,100,101,108,97,121,45,108,105,110,101,32,117,115,101,100,32,105,110,32,116,104,101,32,70,68,78,32,114,101,118,101,114,98,101,114,97,116,111,114,46,32,32,32,32,32,9,32,32,32,32,32,32,84,104,105,110,107,32,111,102,32,105,116,32,97,115,32,116,104,101,32,115,104,111,114,116,101,115,116,32,119,97,108,108,45,116,111,45,119,97,108,108,32,115,101,112,97,114,97,116,105,111,110,32,105,110,32,116,104,101,32,114,111,111,109,46,0,0,0,0,109,0,0,0,0,0,0,0,109,105,110,32,97,99,111,117,115,116,105,99,32,114,97,121,32,108,101,110,103,116,104,0,84,104,105,115,32,108,101,110,103,116,104,32,40,105,110,32,109,101,116,101,114,115,41,32,100,101,116,101,114,109,105,110,101,115,32,116,104,101,32,108,111,110,103,101,115,116,32,100,101,108,97,121,45,108,105,110,101,32,117,115,101,100,32,105,110,32,116,104,101,32,70,68,78,32,114,101,118,101,114,98,101,114,97,116,111,114,46,32,32,32,32,32,9,32,32,32,32,32,32,84,104,105,110,107,32,111,102,32,105,116,32,97,115,32,116,104,101,32,108,97,114,103,101,115,116,32,119,97,108,108,45,116,111,45,119,97,108,108,32,115,101,112,97,114,97,116,105,111,110,32,105,110,32,116,104,101,32,114,111,111,109,46,0,0,0,0,0,0,109,97,120,32,97,99,111,117,115,116,105,99,32,114,97,121,32,108,101,110,103,116,104,0,73,110,112,117,116,32,67,111,110,116,114,111,108,115,0,0,73,110,112,117,116,32,67,111,110,102,105,103,0,0,0,0,87,104,101,110,32,116,104,105,115,32,105,115,32,99,104,101,99,107,101,100,44,32,116,104,101,32,115,116,101,114,101,111,32,101,120,116,101,114,110,97,108,32,97,117,100,105,111,32,105,110,112,117,116,115,32,97,114,101,32,100,105,115,97,98,108,101,100,32,40,103,111,111,100,32,102,111,114,32,104,101,97,114,105,110,103,32,116,104,101,32,105,109,112,117,108,115,101,32,114,101,115,112,111,110,115,101,32,111,114,32,112,105,110,107,45,110,111,105,115,101,32,114,101,115,112,111,110,115,101,32,97,108,111,110,101,41,0,0,0,0,0,0,0,0,77,117,116,101,32,69,120,116,32,73,110,112,117,116,115,0,80,105,110,107,32,78,111,105,115,101,32,40,111,114,32,49,47,102,32,110,111,105,115,101,41,32,105,115,32,67,111,110,115,116,97,110,116,45,81,32,78,111,105,115,101,32,40,117,115,101,102,117,108,32,102,111,114,32,97,100,106,117,115,116,105,110,103,32,116,104,101,32,69,81,32,115,101,99,116,105,111,110,115,41,0,0,0,0,80,105,110,107,32,78,111,105,115,101,0,0,0,0,0,0,73,109,112,117,108,115,101,32,83,101,108,101,99,116,105,111,110,0,0,0,0,0,0,0,83,101,110,100,32,105,109,112,117,108,115,101,32,105,110,116,111,32,76,69,70,84,32,99,104,97,110,110,101,108,0,0,76,101,102,116,0,0,0,0,83,101,110,100,32,105,109,112,117,108,115,101,32,105,110,116,111,32,76,69,70,84,32,97,110,100,32,82,73,71,72,84,32,99,104,97,110,110,101,108,115,0,0,0,0,0,0,0,67,101,110,116,101,114,0,0,83,101,110,100,32,105,109,112,117,108,115,101,32,105,110,116,111,32,82,73,71,72,84,32,99,104,97,110,110,101,108,0,82,105,103,104,116,0,0,0,82,101,118,101,114,98,32,83,116,97,116,101,0,0,0,0,72,111,108,100,32,100,111,119,110,32,39,81,117,101,110,99,104,39,32,116,111,32,99,108,101,97,114,32,116,104,101,32,114,101,118,101,114,98,101,114,97,116,111,114,0,0,0,0,81,117,101,110,99,104,0,0,79,117,116,112,117,116,32,115,99,97,108,101,32,102,97,99,116,111,114,0,0,0,0,0,100,66,0,0,0,0,0,0,79,117,116,112,117,116,32,76,101,118,101,108,32,40,100,66,41], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE);
/* memory initializer */ allocate([88,12,0,0,6,0,0,0,7,0,0,0,7,0,0,0,1,0,0,0,1,0,0,0,3,0,0,0,3,0,0,0,4,0,0,0,2,0,0,0,5,0,0,0,6,0,0,0,1,0,0,0,3,0,0,0,2,0,0,0,78,83,116,51,95,95,49,49,49,95,95,115,116,100,111,117,116,98,117,102,73,119,69,69,0,0,0,0,0,0,0,0,24,58,0,0,56,12,0,0,136,18,0,0,0,0,0,0,0,0,0,0,192,12,0,0,8,0,0,0,9,0,0,0,8,0,0,0,1,0,0,0,1,0,0,0,3,0,0,0,7,0,0,0,4,0,0,0,2,0,0,0,8,0,0,0,9,0,0,0,3,0,0,0,4,0,0,0,4,0,0,0,78,83,116,51,95,95,49,49,48,95,95,115,116,100,105,110,98,117,102,73,119,69,69,0,24,58,0,0,168,12,0,0,136,18,0,0,0,0,0,0,117,110,115,117,112,112,111,114,116,101,100,32,108,111,99,97,108,101,32,102,111,114,32,115,116,97,110,100,97,114,100,32,105,110,112,117,116,0,0,0,0,0,0,0,88,13,0,0,10,0,0,0,11,0,0,0,9,0,0,0,5,0,0,0,2,0,0,0,4,0,0,0,10,0,0,0,11,0,0,0,6,0,0,0,12,0,0,0,13,0,0,0,5,0,0,0,7,0,0,0,6,0,0,0,78,83,116,51,95,95,49,49,49,95,95,115,116,100,111,117,116,98,117,102,73,99,69,69,0,0,0,0,0,0,0,0,24,58,0,0,56,13,0,0,72,18,0,0,0,0,0,0,0,0,0,0,192,13,0,0,12,0,0,0,13,0,0,0,10,0,0,0,5,0,0,0,2,0,0,0,4,0,0,0,14,0,0,0,11,0,0,0,6,0,0,0,15,0,0,0,16,0,0,0,7,0,0,0,8,0,0,0,8,0,0,0,78,83,116,51,95,95,49,49,48,95,95,115,116,100,105,110,98,117,102,73,99,69,69,0,24,58,0,0,168,13,0,0,72,18,0,0,0,0,0,0,78,83,116,51,95,95,49,49,52,95,95,115,104,97,114,101,100,95,99,111,117,110,116,69,0,0,0,0,0,0,0,0,240,57,0,0,208,13,0,0,0,0,0,0,56,14,0,0,14,0,0,0,15,0,0,0,17,0,0,0,0,0,0,0,0,0,0,0,160,14,0,0,16,0,0,0,17,0,0,0,18,0,0,0,0,0,0,0,83,116,49,49,108,111,103,105,99,95,101,114,114,111,114,0,24,58,0,0,40,14,0,0,0,0,0,0,0,0,0,0,0,0,0,0,120,14,0,0,14,0,0,0,18,0,0,0,17,0,0,0,0,0,0,0,83,116,49,50,108,101,110,103,116,104,95,101,114,114,111,114,0,0,0,0,0,0,0,0,24,58,0,0,96,14,0,0,56,14,0,0,0,0,0,0,83,116,49,51,114,117,110,116,105,109,101,95,101,114,114,111,114,0,0,0,0,0,0,0,24,58,0,0,136,14,0,0,0,0,0,0,0,0,0,0,58,32,0,0,0,0,0,0,0,0,0,0,232,14,0,0,19,0,0,0,20,0,0,0,18,0,0,0,0,0,0,0,78,83,116,51,95,95,49,49,50,115,121,115,116,101,109,95,101,114,114,111,114,69,0,0,24,58,0,0,208,14,0,0,160,14,0,0,0,0,0,0,78,83,116,51,95,95,49,49,52,101,114,114,111,114,95,99,97,116,101,103,111,114,121,69,0,0,0,0,0,0,0,0,240,57,0,0,248,14,0,0,78,83,116,51,95,95,49,49,50,95,95,100,111,95,109,101,115,115,97,103,101,69,0,0,24,58,0,0,32,15,0,0,24,15,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,98,97,115,105,99,95,115,116,114,105,110,103,0,0,0,0,0,0,0,0,72,18,0,0,21,0,0,0,22,0,0,0,11,0,0,0,5,0,0,0,2,0,0,0,4,0,0,0,14,0,0,0,11,0,0,0,6,0,0,0,12,0,0,0,13,0,0,0,5,0,0,0,8,0,0,0,8,0,0,0,0,0,0,0,136,18,0,0,23,0,0,0,24,0,0,0,12,0,0,0,1,0,0,0,1,0,0,0,3,0,0,0,7,0,0,0,4,0,0,0,2,0,0,0,5,0,0,0,6,0,0,0,1,0,0,0,4,0,0,0,4,0,0,0,8,0,0,0,0,0,0,0,192,18,0,0,25,0,0,0,26,0,0,0,248,255,255,255,248,255,255,255,192,18,0,0,27,0,0,0,28,0,0,0,8,0,0,0,0,0,0,0,8,19,0,0,29,0,0,0,30,0,0,0,248,255,255,255,248,255,255,255,8,19,0,0,31,0,0,0,32,0,0,0,4,0,0,0,0,0,0,0,80,19,0,0,33,0,0,0,34,0,0,0,252,255,255,255,252,255,255,255,80,19,0,0,35,0,0,0,36,0,0,0,4,0,0,0,0,0,0,0,152,19,0,0,37,0,0,0,38,0,0,0,252,255,255,255,252,255,255,255,152,19,0,0,39,0,0,0,40,0,0,0,105,111,115,116,114,101,97,109,0,0,0,0,0,0,0,0,117,110,115,112,101,99,105,102,105,101,100,32,105,111,115,116,114,101,97,109,95,99,97,116,101,103,111,114,121,32,101,114,114,111,114,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,96,17,0,0,41,0,0,0,42,0,0,0,18,0,0,0,0,0,0,0,0,0,0,0,136,17,0,0,43,0,0,0,44,0,0,0,105,111,115,95,98,97,115,101,58,58,99,108,101,97,114,0,78,83,116,51,95,95,49,56,105,111,115,95,98,97,115,101,55,102,97,105,108,117,114,101,69,0,0,0,0,0,0,0,24,58,0,0,64,17,0,0,232,14,0,0,0,0,0,0,78,83,116,51,95,95,49,56,105,111,115,95,98,97,115,101,69,0,0,0,0,0,0,0,240,57,0,0,112,17,0,0,78,83,116,51,95,95,49,57,98,97,115,105,99,95,105,111,115,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,0,0,0,0,0,0,0,24,58,0,0,144,17,0,0,136,17,0,0,0,0,0,0,78,83,116,51,95,95,49,57,98,97,115,105,99,95,105,111,115,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,0,0,0,0,0,0,0,24,58,0,0,208,17,0,0,136,17,0,0,0,0,0,0,78,83,116,51,95,95,49,49,53,98,97,115,105,99,95,115,116,114,101,97,109,98,117,102,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,0,0,0,0,0,0,0,0,240,57,0,0,16,18,0,0,78,83,116,51,95,95,49,49,53,98,97,115,105,99,95,115,116,114,101,97,109,98,117,102,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,0,0,0,0,0,0,0,0,240,57,0,0,80,18,0,0,78,83,116,51,95,95,49,49,51,98,97,115,105,99,95,105,115,116,114,101,97,109,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,0,0,120,58,0,0,144,18,0,0,0,0,0,0,1,0,0,0,192,17,0,0,3,244,255,255,78,83,116,51,95,95,49,49,51,98,97,115,105,99,95,105,115,116,114,101,97,109,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,0,0,120,58,0,0,216,18,0,0,0,0,0,0,1,0,0,0,0,18,0,0,3,244,255,255,78,83,116,51,95,95,49,49,51,98,97,115,105,99,95,111,115,116,114,101,97,109,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,0,0,120,58,0,0,32,19,0,0,0,0,0,0,1,0,0,0,192,17,0,0,3,244,255,255,78,83,116,51,95,95,49,49,51,98,97,115,105,99,95,111,115,116,114,101,97,109,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,0,0,120,58,0,0,104,19,0,0,0,0,0,0,1,0,0,0,0,18,0,0,3,244,255,255,0,0,0,0,248,19,0,0,45,0,0,0,46,0,0,0,19,0,0,0,3,0,0,0,9,0,0,0,10,0,0,0,4,0,0,0,0,0,0,0,78,83,116,51,95,95,49,49,57,95,95,105,111,115,116,114,101,97,109,95,99,97,116,101,103,111,114,121,69,0,0,0,24,58,0,0,216,19,0,0,56,15,0,0,0,0,0,0,0,0,0,0,32,34,0,0,47,0,0,0,48,0,0,0,49,0,0,0,1,0,0,0,5,0,0,0,11,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,72,34,0,0,50,0,0,0,51,0,0,0,49,0,0,0,2,0,0,0,6,0,0,0,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,248,38,0,0,52,0,0,0,53,0,0,0,49,0,0,0,1,0,0,0,2,0,0,0,3,0,0,0,4,0,0,0,5,0,0,0,6,0,0,0,7,0,0,0,8,0,0,0,9,0,0,0,10,0,0,0,11,0,0,0,0,0,0,0,0,0,0,0,48,49,50,51,52,53,54,55,56,57,97,98,99,100,101,102,65,66,67,68,69,70,120,88,43,45,112,80,105,73,110,78,0,0,0,0,0,0,0,0,37,112,0,0,0,0,0,0,0,0,0,0,144,39,0,0,54,0,0,0,55,0,0,0,49,0,0,0,12,0,0,0,13,0,0,0,14,0,0,0,15,0,0,0,16,0,0,0,17,0,0,0,18,0,0,0,19,0,0,0,20,0,0,0,21,0,0,0,22,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,80,40,0,0,56,0,0,0,57,0,0,0,49,0,0,0,3,0,0,0,4,0,0,0,23,0,0,0,5,0,0,0,24,0,0,0,1,0,0,0,2,0,0,0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,232,40,0,0,58,0,0,0,59,0,0,0,49,0,0,0,7,0,0,0,8,0,0,0,25,0,0,0,9,0,0,0,26,0,0,0,3,0,0,0,4,0,0,0,10,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,0,0,0,0,0,0,0,37,112,0,0,0,0,0,0,0,0,0,0,16,36,0,0,60,0,0,0,61,0,0,0,49,0,0,0,20,0,0,0,27,0,0,0,28,0,0,0,29,0,0,0,30,0,0,0,31,0,0,0,1,0,0,0,248,255,255,255,16,36,0,0,21,0,0,0,22,0,0,0,23,0,0,0,24,0,0,0,25,0,0,0,26,0,0,0,27,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,72,58,37,77,58,37,83,37,109,47,37,100,47,37,121,37,89,45,37,109,45,37,100,37,73,58,37,77,58,37,83,32,37,112,0,0,0,0,0,37,72,58,37,77,0,0,0,37,72,58,37,77,58,37,83,0,0,0,0,176,36,0,0,62,0,0,0,63,0,0,0,49,0,0,0,28,0,0,0,32,0,0,0,33,0,0,0,34,0,0,0,35,0,0,0,36,0,0,0,2,0,0,0,248,255,255,255,176,36,0,0,29,0,0,0,30,0,0,0,31,0,0,0,32,0,0,0,33,0,0,0,34,0,0,0,35,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,0,0,0,72,0,0,0,58,0,0,0,37,0,0,0,77,0,0,0,58,0,0,0,37,0,0,0,83,0,0,0,37,0,0,0,109,0,0,0,47,0,0,0,37,0,0,0,100,0,0,0,47,0,0,0,37,0,0,0,121,0,0,0,37,0,0,0,89,0,0,0,45,0,0,0,37,0,0,0,109,0,0,0,45,0,0,0,37,0,0,0,100,0,0,0,37,0,0,0,73,0,0,0,58,0,0,0,37,0,0,0,77,0,0,0,58,0,0,0,37,0,0,0,83,0,0,0,32,0,0,0,37,0,0,0,112,0,0,0,0,0,0,0,37,0,0,0,72,0,0,0,58,0,0,0,37,0,0,0,77,0,0,0,0,0,0,0,37,0,0,0,72,0,0,0,58,0,0,0,37,0,0,0,77,0,0,0,58,0,0,0,37,0,0,0,83,0,0,0,0,0,0,0,64,37,0,0,64,0,0,0,65,0,0,0,49,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,168,37,0,0,66,0,0,0,67,0,0,0,49,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,152,34,0,0,68,0,0,0,69,0,0,0,49,0,0,0,36,0,0,0,37,0,0,0,13,0,0,0,14,0,0,0,15,0,0,0,16,0,0,0,38,0,0,0,17,0,0,0,18,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,216,34,0,0,70,0,0,0,71,0,0,0,49,0,0,0,39,0,0,0,40,0,0,0,19,0,0,0,20,0,0,0,21,0,0,0,22,0,0,0,41,0,0,0,23,0,0,0,24,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,24,35,0,0,72,0,0,0,73,0,0,0,49,0,0,0,42,0,0,0,43,0,0,0,25,0,0,0,26,0,0,0,27,0,0,0,28,0,0,0,44,0,0,0,29,0,0,0,30,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,88,35,0,0,74,0,0,0,75,0,0,0,49,0,0,0,45,0,0,0,46,0,0,0,31,0,0,0,32,0,0,0,33,0,0,0,34,0,0,0,47,0,0,0,35,0,0,0,36,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,120,41,0,0,76,0,0,0,77,0,0,0,49,0,0,0,3,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,48,49,50,51,52,53,54,55,56,57,0,0,0,0,0,0,37,76,102,0,0,0,0,0,109,111,110,101,121,95,103,101,116,32,101,114,114,111,114,0,0,0,0,0,8,42,0,0,78,0,0,0,79,0,0,0,49,0,0,0,5,0,0,0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,48,49,50,51,52,53,54,55,56,57,0,0,0,0,0,0,0,0,0,0,152,42,0,0,80,0,0,0,81,0,0,0,49,0,0,0,1,0,0,0,37,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,46,48,76,102,0,0,0,0,0,0,0,40,43,0,0,82,0,0,0,83,0,0,0,49,0,0,0,2,0,0,0,38,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,38,0,0,84,0,0,0,85,0,0,0,49,0,0,0,13,0,0,0,11,0,0,0,37,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,56,38,0,0,86,0,0,0,87,0,0,0,49,0,0,0,14,0,0,0,12,0,0,0,38,0,0,0,0,0,0,0,0,0,0,0,118,101,99,116,111,114,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,67,0,0,0,0,0,0,0,0,0,0,0,248,33,0,0,88,0,0,0,89,0,0,0,49,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,208,30,0,0,90,0,0,0,91,0,0,0,49,0,0,0,9,0,0,0,15,0,0,0,10,0,0,0,16,0,0,0,11,0,0,0,1,0,0,0,17,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,176,31,0,0,92,0,0,0,93,0,0,0,49,0,0,0,1,0,0,0,2,0,0,0,4,0,0,0,48,0,0,0,49,0,0,0,5,0,0,0,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,168,33,0,0,94,0,0,0,95,0,0,0,49,0,0,0,51,0,0,0,52,0,0,0,39,0,0,0,40,0,0,0,41,0,0,0,0,0,0,0,208,33,0,0,96,0,0,0,97,0,0,0,49,0,0,0,53,0,0,0,54,0,0,0,42,0,0,0,43,0,0,0,44,0,0,0,116,114,117,101,0,0,0,0,116,0,0,0,114,0,0,0,117,0,0,0,101,0,0,0,0,0,0,0,0,0,0,0,102,97,108,115,101,0,0,0,102,0,0,0,97,0,0,0,108,0,0,0,115,0,0,0,101,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,109,47,37,100,47,37,121,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,0,0,0,109,0,0,0,47,0,0,0,37,0,0,0,100,0,0,0,47,0,0,0,37,0,0,0,121,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,72,58,37,77,58,37,83,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,0,0,0,72,0,0,0,58,0,0,0,37,0,0,0,77,0,0,0,58,0,0,0,37,0,0,0,83,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,97,32,37,98,32,37,100,32,37,72,58,37,77,58,37,83,32,37,89,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,0,0,0,97,0,0,0,32,0,0,0,37,0,0,0,98,0,0,0,32,0,0,0,37,0,0,0,100,0,0,0,32,0,0,0,37,0,0,0,72,0,0,0,58,0,0,0,37,0,0,0,77,0,0,0,58,0,0,0,37,0,0,0,83,0,0,0,32,0,0,0,37,0,0,0,89,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,73,58,37,77,58,37,83,32,37,112,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,0,0,0,73,0,0,0,58,0,0,0,37,0,0,0,77,0,0,0,58,0,0,0,37,0,0,0,83,0,0,0,32,0,0,0,37,0,0,0,112,0,0,0,0,0,0,0,108,111,99,97,108,101,32,110,111,116,32,115,117,112,112,111,114,116,101,100,0,0,0,0,0,0,0,0,8,30,0,0,98,0,0,0,99,0,0,0,49,0,0,0,0,0,0,0,78,83,116,51,95,95,49,54,108,111,99,97,108,101,53,102,97,99,101,116,69,0,0,0,24,58,0,0,240,29,0,0,240,13,0,0,0,0,0,0,0,0,0,0,152,30,0,0,98,0,0,0,100,0,0,0,49,0,0,0,18,0,0,0,2,0,0,0,3,0,0,0,4,0,0,0,12,0,0,0,19,0,0,0,13,0,0,0,20,0,0,0,14,0,0,0,5,0,0,0,21,0,0,0,6,0,0,0,0,0,0,0,78,83,116,51,95,95,49,53,99,116,121,112,101,73,119,69,69,0,0,0,0,0,0,0,78,83,116,51,95,95,49,49,48,99,116,121,112,101,95,98,97,115,101,69,0,0,0,0,240,57,0,0,120,30,0,0,120,58,0,0,96,30,0,0,0,0,0,0,2,0,0,0,8,30,0,0,2,0,0,0,144,30,0,0,2,0,0,0,78,83,116,51,95,95,49,53,99,116,121,112,101,73,99,69,69,0,0,0,0,0,0,0,120,58,0,0,184,30,0,0,0,0,0,0,2,0,0,0,8,30,0,0,2,0,0,0,144,30,0,0,2,0,0,0,0,0,0,0,104,31,0,0,98,0,0,0,101,0,0,0,49,0,0,0,3,0,0,0,4,0,0,0,7,0,0,0,55,0,0,0,56,0,0,0,8,0,0,0,57,0,0,0,78,83,116,51,95,95,49,55,99,111,100,101,99,118,116,73,99,99,49,49,95,95,109,98,115,116,97,116,101,95,116,69,69,0,0,0,0,0,0,0,78,83,116,51,95,95,49,49,50,99,111,100,101,99,118,116,95,98,97,115,101,69,0,0,240,57,0,0,72,31,0,0,120,58,0,0,32,31,0,0,0,0,0,0,2,0,0,0,8,30,0,0,2,0,0,0,96,31,0,0,2,0,0,0,78,83,116,51,95,95,49,55,99,111,100,101,99,118,116,73,119,99,49,49,95,95,109,98,115,116,97,116,101,95,116,69,69,0,0,0,0,0,0,0,120,58,0,0,136,31,0,0,0,0,0,0,2,0,0,0,8,30,0,0,2,0,0,0,96,31,0,0,2,0,0,0,0,0,0,0,40,32,0,0,98,0,0,0,102,0,0,0,49,0,0,0,5,0,0,0,6,0,0,0,9,0,0,0,58,0,0,0,59,0,0,0,10,0,0,0,60,0,0,0,78,83,116,51,95,95,49,55,99,111,100,101,99,118,116,73,68,115,99,49,49,95,95,109,98,115,116,97,116,101,95,116,69,69,0,0,0,0,0,0,120,58,0,0,0,32,0,0,0,0,0,0,2,0,0,0,8,30,0,0,2,0,0,0,96,31,0,0,2,0,0,0,0,0,0,0,160,32,0,0,98,0,0,0,103,0,0,0,49,0,0,0,7,0,0,0,8,0,0,0,11,0,0,0,61,0,0,0,62,0,0,0,12,0,0,0,63,0,0,0,78,83,116,51,95,95,49,55,99,111,100,101,99,118,116,73,68,105,99,49,49,95,95,109,98,115,116,97,116,101,95,116,69,69,0,0,0,0,0,0,120,58,0,0,120,32,0,0,0,0,0,0,2,0,0,0,8,30,0,0,2,0,0,0,96,31,0,0,2,0,0,0,0,0,0,0,24,33,0,0,98,0,0,0,104,0,0,0,49,0,0,0,7,0,0,0,8,0,0,0,11,0,0,0,61,0,0,0,62,0,0,0,12,0,0,0,63,0,0,0,78,83,116,51,95,95,49,49,54,95,95,110,97,114,114,111,119,95,116,111,95,117,116,102,56,73,76,106,51,50,69,69,69,0,0,0,0,0,0,0,24,58,0,0,240,32,0,0,160,32,0,0,0,0,0,0,0,0,0,0,128,33,0,0,98,0,0,0,105,0,0,0,49,0,0,0,7,0,0,0,8,0,0,0,11,0,0,0,61,0,0,0,62,0,0,0,12,0,0,0,63,0,0,0,78,83,116,51,95,95,49,49,55,95,95,119,105,100,101,110,95,102,114,111,109,95,117,116,102,56,73,76,106,51,50,69,69,69,0,0,0,0,0,0,24,58,0,0,88,33,0,0,160,32,0,0,0,0,0,0,78,83,116,51,95,95,49,56,110,117,109,112,117,110,99,116,73,99,69,69,0,0,0,0,24,58,0,0,144,33,0,0,8,30,0,0,0,0,0,0,78,83,116,51,95,95,49,56,110,117,109,112,117,110,99,116,73,119,69,69,0,0,0,0,24,58,0,0,184,33,0,0,8,30,0,0,0,0,0,0,78,83,116,51,95,95,49,54,108,111,99,97,108,101,53,95,95,105,109,112,69,0,0,0,24,58,0,0,224,33,0,0,8,30,0,0,0,0,0,0,78,83,116,51,95,95,49,55,99,111,108,108,97,116,101,73,99,69,69,0,0,0,0,0,24,58,0,0,8,34,0,0,8,30,0,0,0,0,0,0,78,83,116,51,95,95,49,55,99,111,108,108,97,116,101,73,119,69,69,0,0,0,0,0,24,58,0,0,48,34,0,0,8,30,0,0,0,0,0,0,78,83,116,51,95,95,49,49,48,109,111,110,101,121,112,117,110,99,116,73,99,76,98,48,69,69,69,0,0,0,0,0,78,83,116,51,95,95,49,49,48,109,111,110,101,121,95,98,97,115,101,69,0,0,0,0,240,57,0,0,120,34,0,0,120,58,0,0,88,34,0,0,0,0,0,0,2,0,0,0,8,30,0,0,2,0,0,0,144,34,0,0,2,0,0,0,78,83,116,51,95,95,49,49,48,109,111,110,101,121,112,117,110,99,116,73,99,76,98,49,69,69,69,0,0,0,0,0,120,58,0,0,184,34,0,0,0,0,0,0,2,0,0,0,8,30,0,0,2,0,0,0,144,34,0,0,2,0,0,0,78,83,116,51,95,95,49,49,48,109,111,110,101,121,112,117,110,99,116,73,119,76,98,48,69,69,69,0,0,0,0,0,120,58,0,0,248,34,0,0,0,0,0,0,2,0,0,0,8,30,0,0,2,0,0,0,144,34,0,0,2,0,0,0,78,83,116,51,95,95,49,49,48,109,111,110,101,121,112,117,110,99,116,73,119,76,98,49,69,69,69,0,0,0,0,0,120,58,0,0,56,35,0,0,0,0,0,0,2,0,0,0,8,30,0,0,2,0,0,0,144,34,0,0,2,0,0,0,78,83,116,51,95,95,49,56,116,105,109,101,95,103,101,116,73,99,78,83,95,49,57,105,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,69,69,0,0,0,0,78,83,116,51,95,95,49,57,116,105,109,101,95,98,97,115,101,69,0,0,0,0,0,0,240,57,0,0,192,35,0,0,78,83,116,51,95,95,49,50,48,95,95,116,105,109,101,95,103,101,116,95,99,95,115,116,111,114,97,103,101,73,99,69,69,0,0,0,0,0,0,0,240,57,0,0,224,35,0,0,120,58,0,0,120,35,0,0,0,0,0,0,3,0,0,0,8,30,0,0,2,0,0,0,216,35,0,0,2,0,0,0,8,36,0,0,0,8,0,0,78,83,116,51,95,95,49,56,116,105,109,101,95,103,101,116,73,119,78,83,95,49,57,105,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,69,69,0,0,0,0,78,83,116,51,95,95,49,50,48,95,95,116,105,109,101,95,103,101,116,95,99,95,115,116,111,114,97,103,101,73,119,69,69,0,0,0,0,0,0,0,240,57,0,0,128,36,0,0,120,58,0,0,56,36,0,0,0,0,0,0,3,0,0,0,8,30,0,0,2,0,0,0,216,35,0,0,2,0,0,0,168,36,0,0,0,8,0,0,78,83,116,51,95,95,49,56,116,105,109,101,95,112,117,116,73,99,78,83,95,49,57,111,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,69,69,0,0,0,0,78,83,116,51,95,95,49,49,48,95,95,116,105,109,101,95,112,117,116,69,0,0,0,0,240,57,0,0,32,37,0,0,120,58,0,0,216,36,0,0,0,0,0,0,2,0,0,0,8,30,0,0,2,0,0,0,56,37,0,0,0,8,0,0,78,83,116,51,95,95,49,56,116,105,109,101,95,112,117,116,73,119,78,83,95,49,57,111,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,69,69,0,0,0,0,120,58,0,0,96,37,0,0,0,0,0,0,2,0,0,0,8,30,0,0,2,0,0,0,56,37,0,0,0,8,0,0,78,83,116,51,95,95,49,56,109,101,115,115,97,103,101,115,73,99,69,69,0,0,0,0,78,83,116,51,95,95,49,49,51,109,101,115,115,97,103,101,115,95,98,97,115,101,69,0,240,57,0,0,224,37,0,0,120,58,0,0,200,37,0,0,0,0,0,0,2,0,0,0,8,30,0,0,2,0,0,0,248,37,0,0,2,0,0,0,78,83,116,51,95,95,49,56,109,101,115,115,97,103,101,115,73,119,69,69,0,0,0,0,120,58,0,0,32,38,0,0,0,0,0,0,2,0,0,0,8,30,0,0,2,0,0,0,248,37,0,0,2,0,0,0,78,83,116,51,95,95,49,55,110,117,109,95,103,101,116,73,99,78,83,95,49,57,105,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,69,69,0,0,0,0,0,78,83,116,51,95,95,49,57,95,95,110,117,109,95,103,101,116,73,99,69,69,0,0,0,78,83,116,51,95,95,49,49,52,95,95,110,117,109,95,103,101,116,95,98,97,115,101,69,0,0,0,0,0,0,0,0,240,57,0,0,184,38,0,0,120,58,0,0,160,38,0,0,0,0,0,0,1,0,0,0,216,38,0,0,0,0,0,0,120,58,0,0,88,38,0,0,0,0,0,0,2,0,0,0,8,30,0,0,2,0,0,0,224,38,0,0,0,0,0,0,78,83,116,51,95,95,49,55,110,117,109,95,103,101,116,73,119,78,83,95,49,57,105,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,69,69,0,0,0,0,0,78,83,116,51,95,95,49,57,95,95,110,117,109,95,103,101,116,73,119,69,69,0,0,0,120,58,0,0,96,39,0,0,0,0,0,0,1,0,0,0,216,38,0,0,0,0,0,0,120,58,0,0,24,39,0,0,0,0,0,0,2,0,0,0,8,30,0,0,2,0,0,0,120,39,0,0,0,0,0,0,78,83,116,51,95,95,49,55,110,117,109,95,112,117,116,73,99,78,83,95,49,57,111,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,69,69,0,0,0,0,0,78,83,116,51,95,95,49,57,95,95,110,117,109,95,112,117,116,73,99,69,69,0,0,0,78,83,116,51,95,95,49,49,52,95,95,110,117,109,95,112,117,116,95,98,97,115,101,69,0,0,0,0,0,0,0,0,240,57,0,0,16,40,0,0,120,58,0,0,248,39,0,0,0,0,0,0,1,0,0,0,48,40,0,0,0,0,0,0,120,58,0,0,176,39,0,0,0,0,0,0,2,0,0,0,8,30,0,0,2,0,0,0,56,40,0,0,0,0,0,0,78,83,116,51,95,95,49,55,110,117,109,95,112,117,116,73,119,78,83,95,49,57,111,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,69,69,0,0,0,0,0,78,83,116,51,95,95,49,57,95,95,110,117,109,95,112,117,116,73,119,69,69,0,0,0,120,58,0,0,184,40,0,0,0,0,0,0,1,0,0,0,48,40,0,0,0,0,0,0,120,58,0,0,112,40,0,0,0,0,0,0,2,0,0,0,8,30,0,0,2,0,0,0,208,40,0,0,0,0,0,0,78,83,116,51,95,95,49,57,109,111,110,101,121,95,103,101,116,73,99,78,83,95,49,57,105,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,69,69,0,0,0,78,83,116,51,95,95,49,49,49,95,95,109,111,110,101,121,95,103,101,116,73,99,69,69,0,0,0,0,0,0,0,0,240,57,0,0,80,41,0,0,120,58,0,0,8,41,0,0,0,0,0,0,2,0,0,0,8,30,0,0,2,0,0,0,112,41,0,0,0,0,0,0,78,83,116,51,95,95,49,57,109,111,110,101,121,95,103,101,116,73,119,78,83,95,49,57,105,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,69,69,0,0,0,78,83,116,51,95,95,49,49,49,95,95,109,111,110,101,121,95,103,101,116,73,119,69,69,0,0,0,0,0,0,0,0,240,57,0,0,224,41,0,0,120,58,0,0,152,41,0,0,0,0,0,0,2,0,0,0,8,30,0,0,2,0,0,0,0,42,0,0,0,0,0,0,78,83,116,51,95,95,49,57,109,111,110,101,121,95,112,117,116,73,99,78,83,95,49,57,111,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,69,69,0,0,0,78,83,116,51,95,95,49,49,49,95,95,109,111,110,101,121,95,112,117,116,73,99,69,69,0,0,0,0,0,0,0,0,240,57,0,0,112,42,0,0,120,58,0,0,40,42,0,0,0,0,0,0,2,0,0,0,8,30,0,0,2,0,0,0,144,42,0,0,0,0,0,0,78,83,116,51,95,95,49,57,109,111,110,101,121,95,112,117,116,73,119,78,83,95,49,57,111,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,69,69,0,0,0,78,83,116,51,95,95,49,49,49,95,95,109,111,110,101,121,95,112,117,116,73,119,69,69,0,0,0,0,0,0,0,0,240,57,0,0,0,43,0,0,120,58,0,0,184,42,0,0,0,0,0,0,2,0,0,0,8,30,0,0,2,0,0,0,32,43,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,65,0,0,0,77,0,0,0,0,0,0,0,0,0,0,0,80,0,0,0,77,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,65,77,0,0,0,0,0,0,80,77,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,74,0,0,0,97,0,0,0,110,0,0,0,117,0,0,0,97,0,0,0,114,0,0,0,121,0,0,0,0,0,0,0,70,0,0,0,101,0,0,0,98,0,0,0,114,0,0,0,117,0,0,0,97,0,0,0,114,0,0,0,121,0,0,0,0,0,0,0,0,0,0,0,77,0,0,0,97,0,0,0,114,0,0,0,99,0,0,0,104,0,0,0,0,0,0,0,65,0,0,0,112,0,0,0,114,0,0,0,105,0,0,0,108,0,0,0,0,0,0,0,74,0,0,0,117,0,0,0,110,0,0,0,101,0,0,0,0,0,0,0,0,0,0,0,74,0,0,0,117,0,0,0,108,0,0,0,121,0,0,0,0,0,0,0,0,0,0,0,65,0,0,0,117,0,0,0,103,0,0,0,117,0,0,0,115,0,0,0,116,0,0,0,0,0,0,0,0,0,0,0,83,0,0,0,101,0,0,0,112,0,0,0,116,0,0,0,101,0,0,0,109,0,0,0,98,0,0,0,101,0,0,0,114,0,0,0,0,0,0,0,79,0,0,0,99,0,0,0,116,0,0,0,111,0,0,0,98,0,0,0,101,0,0,0,114,0,0,0,0,0,0,0,78,0,0,0,111,0,0,0,118,0,0,0,101,0,0,0,109,0,0,0,98,0,0,0,101,0,0,0,114,0,0,0,0,0,0,0,0,0,0,0,68,0,0,0,101,0,0,0,99,0,0,0,101,0,0,0,109,0,0,0,98,0,0,0,101,0,0,0,114,0,0,0,0,0,0,0,0,0,0,0,74,0,0,0,97,0,0,0,110,0,0,0,0,0,0,0,70,0,0,0,101,0,0,0,98,0,0,0,0,0,0,0,77,0,0,0,97,0,0,0,114,0,0,0,0,0,0,0,65,0,0,0,112,0,0,0,114,0,0,0,0,0,0,0,77,0,0,0,97,0,0,0,121,0,0,0,0,0,0,0,74,0,0,0,117,0,0,0,110,0,0,0,0,0,0,0,74,0,0,0,117,0,0,0,108,0,0,0,0,0,0,0,65,0,0,0,117,0,0,0,103,0,0,0,0,0,0,0,83,0,0,0,101,0,0,0,112,0,0,0,0,0,0,0,79,0,0,0,99,0,0,0,116,0,0,0,0,0,0,0,78,0,0,0,111,0,0,0,118,0,0,0,0,0,0,0,68,0,0,0,101,0,0,0,99], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+3060);
/* memory initializer */ allocate([74,97,110,117,97,114,121,0,70,101,98,114,117,97,114,121,0,0,0,0,0,0,0,0,77,97,114,99,104,0,0,0,65,112,114,105,108,0,0,0,77,97,121,0,0,0,0,0,74,117,110,101,0,0,0,0,74,117,108,121,0,0,0,0,65,117,103,117,115,116,0,0,83,101,112,116,101,109,98,101,114,0,0,0,0,0,0,0,79,99,116,111,98,101,114,0,78,111,118,101,109,98,101,114,0,0,0,0,0,0,0,0,68,101,99,101,109,98,101,114,0,0,0,0,0,0,0,0,74,97,110,0,0,0,0,0,70,101,98,0,0,0,0,0,77,97,114,0,0,0,0,0,65,112,114,0,0,0,0,0,74,117,110,0,0,0,0,0,74,117,108,0,0,0,0,0,65,117,103,0,0,0,0,0,83,101,112,0,0,0,0,0,79,99,116,0,0,0,0,0,78,111,118,0,0,0,0,0,68,101,99,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,83,0,0,0,117,0,0,0,110,0,0,0,100,0,0,0,97,0,0,0,121,0,0,0,0,0,0,0,0,0,0,0,77,0,0,0,111,0,0,0,110,0,0,0,100,0,0,0,97,0,0,0,121,0,0,0,0,0,0,0,0,0,0,0,84,0,0,0,117,0,0,0,101,0,0,0,115,0,0,0,100,0,0,0,97,0,0,0,121,0,0,0,0,0,0,0,87,0,0,0,101,0,0,0,100,0,0,0,110,0,0,0,101,0,0,0,115,0,0,0,100,0,0,0,97,0,0,0,121,0,0,0,0,0,0,0,84,0,0,0,104,0,0,0,117,0,0,0,114,0,0,0,115,0,0,0,100,0,0,0,97,0,0,0,121,0,0,0,0,0,0,0,0,0,0,0,70,0,0,0,114,0,0,0,105,0,0,0,100,0,0,0,97,0,0,0,121,0,0,0,0,0,0,0,0,0,0,0,83,0,0,0,97,0,0,0,116,0,0,0,117,0,0,0,114,0,0,0,100,0,0,0,97,0,0,0,121,0,0,0,0,0,0,0,0,0,0,0,83,0,0,0,117,0,0,0,110,0,0,0,0,0,0,0,77,0,0,0,111,0,0,0,110,0,0,0,0,0,0,0,84,0,0,0,117,0,0,0,101,0,0,0,0,0,0,0,87,0,0,0,101,0,0,0,100,0,0,0,0,0,0,0,84,0,0,0,104,0,0,0,117,0,0,0,0,0,0,0,70,0,0,0,114,0,0,0,105,0,0,0,0,0,0,0,83,0,0,0,97,0,0,0,116,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,83,117,110,100,97,121,0,0,77,111,110,100,97,121,0,0,84,117,101,115,100,97,121,0,87,101,100,110,101,115,100,97,121,0,0,0,0,0,0,0,84,104,117,114,115,100,97,121,0,0,0,0,0,0,0,0,70,114,105,100,97,121,0,0,83,97,116,117,114,100,97,121,0,0,0,0,0,0,0,0,83,117,110,0,0,0,0,0,77,111,110,0,0,0,0,0,84,117,101,0,0,0,0,0,87,101,100,0,0,0,0,0,84,104,117,0,0,0,0,0,70,114,105,0,0,0,0,0,83,97,116,0,0,0,0,0,2,0,0,192,3,0,0,192,4,0,0,192,5,0,0,192,6,0,0,192,7,0,0,192,8,0,0,192,9,0,0,192,10,0,0,192,11,0,0,192,12,0,0,192,13,0,0,192,14,0,0,192,15,0,0,192,16,0,0,192,17,0,0,192,18,0,0,192,19,0,0,192,20,0,0,192,21,0,0,192,22,0,0,192,23,0,0,192,24,0,0,192,25,0,0,192,26,0,0,192,27,0,0,192,28,0,0,192,29,0,0,192,30,0,0,192,31,0,0,192,0,0,0,179,1,0,0,195,2,0,0,195,3,0,0,195,4,0,0,195,5,0,0,195,6,0,0,195,7,0,0,195,8,0,0,195,9,0,0,195,10,0,0,195,11,0,0,195,12,0,0,195,13,0,0,211,14,0,0,195,15,0,0,195,0,0,12,187,1,0,12,195,2,0,12,195,3,0,12,195,4,0,12,211,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,104,57,0,0,106,0,0,0,107,0,0,0,64,0,0,0,0,0,0,0,115,116,100,58,58,98,97,100,95,99,97,115,116,0,0,0,83,116,57,116,121,112,101,95,105,110,102,111,0,0,0,0,240,57,0,0,64,57,0,0,83,116,56,98,97,100,95,99,97,115,116,0,0,0,0,0,24,58,0,0,88,57,0,0,0,0,0,0,0,0,0,0,78,49,48,95,95,99,120,120,97,98,105,118,49,49,54,95,95,115,104,105,109,95,116,121,112,101,95,105,110,102,111,69,0,0,0,0,0,0,0,0,24,58,0,0,120,57,0,0,80,57,0,0,0,0,0,0,78,49,48,95,95,99,120,120,97,98,105,118,49,49,55,95,95,99,108,97,115,115,95,116,121,112,101,95,105,110,102,111,69,0,0,0,0,0,0,0,24,58,0,0,176,57,0,0,160,57,0,0,0,0,0,0,0,0,0,0,216,57,0,0,108,0,0,0,109,0,0,0,110,0,0,0,111,0,0,0,22,0,0,0,13,0,0,0,1,0,0,0,7,0,0,0,0,0,0,0,96,58,0,0,108,0,0,0,112,0,0,0,110,0,0,0,111,0,0,0,22,0,0,0,14,0,0,0,2,0,0,0,8,0,0,0,78,49,48,95,95,99,120,120,97,98,105,118,49,50,48,95,95,115,105,95,99,108,97,115,115,95,116,121,112,101,95,105,110,102,111,69,0,0,0,0,24,58,0,0,56,58,0,0,216,57,0,0,0,0,0,0,0,0,0,0,192,58,0,0,108,0,0,0,113,0,0,0,110,0,0,0,111,0,0,0,22,0,0,0,15,0,0,0,3,0,0,0,9,0,0,0,78,49,48,95,95,99,120,120,97,98,105,118,49,50,49,95,95,118,109,105,95,99,108,97,115,115,95,116,121,112,101,95,105,110,102,111,69,0,0,0,24,58,0,0,152,58,0,0,216,57,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,61,0,0,114,0,0,0,115,0,0,0,65,0,0,0,0,0,0,0,115,116,100,58,58,98,97,100,95,97,108,108,111,99,0,0,83,116,57,98,97,100,95,97,108,108,111,99,0,0,0,0,24,58,0,0,240,60,0,0,0,0,0,0,0,0,0,0,105,110,102,105,110,105,116,121,0,0,0,0,0,0,0,0,110,97,110,0,0,0,0,0,95,112,137,0,255,9,47,15,10,0,0,0,100,0,0,0,232,3,0,0,16,39,0,0,160,134,1,0,64,66,15,0,128,150,152,0,0,225,245,5], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+13320);




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

  var _floorf=Math_floor;

  
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

   
  Module["_i64Add"] = _i64Add;

  
  
  
  
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

  function _pthread_cond_broadcast() {
      return 0;
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


  
  function _malloc(bytes) {
      /* Over-allocate to make sure it is byte-aligned by 8.
       * This will leak memory, but this is only the dummy
       * implementation (replaced by dlmalloc normally) so
       * not an issue.
       */
      var ptr = Runtime.dynamicAlloc(bytes + 8);
      return (ptr+8) & 0xFFFFFFF8;
    }
  Module["_malloc"] = _malloc;function _newlocale(mask, locale, base) {
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
    }function _snprintf(s, n, format, varargs) {
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

   
  Module["_memset"] = _memset;

  
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

  var _logf=Math_log;

  
  
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

   
  Module["_bitshift64Shl"] = _bitshift64Shl;


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
var asm=(function(global,env,buffer){"use asm";var a=new global.Int8Array(buffer);var b=new global.Int16Array(buffer);var c=new global.Int32Array(buffer);var d=new global.Uint8Array(buffer);var e=new global.Uint16Array(buffer);var f=new global.Uint32Array(buffer);var g=new global.Float32Array(buffer);var h=new global.Float64Array(buffer);var i=env.STACKTOP|0;var j=env.STACK_MAX|0;var k=env.tempDoublePtr|0;var l=env.ABORT|0;var m=env.cttz_i8|0;var n=env.ctlz_i8|0;var o=env.__ZTISt9exception|0;var p=env.___dso_handle|0;var q=env._stderr|0;var r=env._stdin|0;var s=env._stdout|0;var t=0;var u=0;var v=0;var w=0;var x=+env.NaN,y=+env.Infinity;var z=0,A=0,B=0,C=0,D=0.0,E=0,F=0,G=0,H=0.0;var I=0;var J=0;var K=0;var L=0;var M=0;var N=0;var O=0;var P=0;var Q=0;var R=0;var S=global.Math.floor;var T=global.Math.abs;var U=global.Math.sqrt;var V=global.Math.pow;var W=global.Math.cos;var X=global.Math.sin;var Y=global.Math.tan;var Z=global.Math.acos;var _=global.Math.asin;var $=global.Math.atan;var aa=global.Math.atan2;var ba=global.Math.exp;var ca=global.Math.log;var da=global.Math.ceil;var ea=global.Math.imul;var fa=env.abort;var ga=env.assert;var ha=env.asmPrintInt;var ia=env.asmPrintFloat;var ja=env.min;var ka=env.invoke_iiii;var la=env.invoke_viiiiii;var ma=env.invoke_viiidddd;var na=env.invoke_viiiiiii;var oa=env.invoke_viiidd;var pa=env.invoke_vi;var qa=env.invoke_vii;var ra=env.invoke_viiiiiiiii;var sa=env.invoke_ii;var ta=env.invoke_viiiiiid;var ua=env.invoke_viii;var va=env.invoke_viiiiid;var wa=env.invoke_v;var xa=env.invoke_iiiiiiiii;var ya=env.invoke_iiiii;var za=env.invoke_viiiiiiii;var Aa=env.invoke_viiiii;var Ba=env.invoke_iii;var Ca=env.invoke_iiiiii;var Da=env.invoke_viiii;var Ea=env._fabs;var Fa=env._pthread_cond_wait;var Ga=env._freelocale;var Ha=env.__formatString;var Ia=env._asprintf;var Ja=env._vsnprintf;var Ka=env._send;var La=env._strtoll_l;var Ma=env._vsscanf;var Na=env.___ctype_b_loc;var Oa=env.__ZSt9terminatev;var Pa=env._fmod;var Qa=env.___cxa_guard_acquire;var Ra=env._isspace;var Sa=env.___setErrNo;var Ta=env.___cxa_is_number_type;var Ua=env._atexit;var Va=env._copysign;var Wa=env._ungetc;var Xa=env._logf;var Ya=env.___cxa_allocate_exception;var Za=env.__ZSt18uncaught_exceptionv;var _a=env._isxdigit_l;var $a=env.___ctype_toupper_loc;var ab=env._fflush;var bb=env.___cxa_guard_release;var cb=env.__addDays;var db=env.___errno_location;var eb=env._strtoll;var fb=env._strerror_r;var gb=env._strftime_l;var hb=env._catgets;var ib=env._sscanf;var jb=env._sbrk;var kb=env._uselocale;var lb=env._llvm_pow_f32;var mb=env._newlocale;var nb=env._snprintf;var ob=env.___cxa_begin_catch;var pb=env._emscripten_memcpy_big;var qb=env._fileno;var rb=env.___resumeException;var sb=env.___cxa_find_matching_catch;var tb=env.__exit;var ub=env._strtoull;var vb=env._isdigit_l;var wb=env._strftime;var xb=env._tanf;var yb=env.__arraySum;var zb=env.___cxa_throw;var Ab=env.___ctype_tolower_loc;var Bb=env._exp2;var Cb=env._pthread_mutex_unlock;var Db=env._fread;var Eb=env._pthread_cond_broadcast;var Fb=env._isxdigit;var Gb=env._sprintf;var Hb=env._floorf;var Ib=env.__reallyNegative;var Jb=env._vasprintf;var Kb=env._write;var Lb=env.__isLeapYear;var Mb=env.__scanString;var Nb=env._recv;var Ob=env._expf;var Pb=env.__ZNSt9exceptionD2Ev;var Qb=env._fgetc;var Rb=env._strtoull_l;var Sb=env._mkport;var Tb=env.___cxa_does_inherit;var Ub=env._sysconf;var Vb=env._read;var Wb=env.__parseInt64;var Xb=env._abort;var Yb=env._catclose;var Zb=env._fwrite;var _b=env._time;var $b=env._pthread_mutex_lock;var ac=env._strerror;var bc=env._pread;var cc=env._pwrite;var dc=env._catopen;var ec=env._exit;var fc=env._isdigit;var gc=env.__getFloat;var hc=0.0;
// EMSCRIPTEN_START_FUNCS
function xg(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0;e=i;i=i+224|0;l=e+198|0;m=e+196|0;n=e+16|0;o=e+4|0;p=e+192|0;q=e+32|0;r=e;s=e+28|0;t=c[h+4>>2]&74;if((t|0)==0){u=0}else if((t|0)==64){u=8}else if((t|0)==8){u=16}else{u=10}fh(n,h,l,m);c[o+0>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;Fe(o,10,0);if((a[o]&1)==0){h=o+1|0;v=h;w=o+8|0;x=h}else{h=o+8|0;v=o+1|0;w=h;x=c[h>>2]|0}c[p>>2]=x;c[r>>2]=q;c[s>>2]=0;h=o+4|0;t=a[m]|0;m=c[f>>2]|0;y=x;a:while(1){if((m|0)!=0){if((c[m+12>>2]|0)==(c[m+16>>2]|0)?(qc[c[(c[m>>2]|0)+36>>2]&127](m)|0)==-1:0){c[f>>2]=0;z=0}else{z=m}}else{z=0}x=(z|0)==0;A=c[g>>2]|0;do{if((A|0)!=0){if((c[A+12>>2]|0)!=(c[A+16>>2]|0)){if(x){B=A;break}else{C=A;D=y;break a}}if(!((qc[c[(c[A>>2]|0)+36>>2]&127](A)|0)==-1)){if(x){B=A;break}else{C=A;D=y;break a}}else{c[g>>2]=0;E=18;break}}else{E=18}}while(0);if((E|0)==18){E=0;if(x){C=0;D=y;break}else{B=0}}A=a[o]|0;F=(A&1)==0;if(F){G=(A&255)>>>1}else{G=c[h>>2]|0}if(((c[p>>2]|0)-y|0)==(G|0)){if(F){H=(A&255)>>>1;I=(A&255)>>>1}else{A=c[h>>2]|0;H=A;I=A}Fe(o,H<<1,0);if((a[o]&1)==0){J=10}else{J=(c[o>>2]&-2)+ -1|0}Fe(o,J,0);if((a[o]&1)==0){K=v}else{K=c[w>>2]|0}c[p>>2]=K+I;L=K}else{L=y}A=z+12|0;F=c[A>>2]|0;M=z+16|0;if((F|0)==(c[M>>2]|0)){N=qc[c[(c[z>>2]|0)+36>>2]&127](z)|0}else{N=d[F]|0}if((Hg(N&255,u,L,p,s,t,n,q,r,l)|0)!=0){C=B;D=L;break}F=c[A>>2]|0;if((F|0)==(c[M>>2]|0)){qc[c[(c[z>>2]|0)+40>>2]&127](z)|0;m=z;y=L;continue}else{c[A>>2]=F+1;m=z;y=L;continue}}L=a[n]|0;if((L&1)==0){O=(L&255)>>>1}else{O=c[n+4>>2]|0}if((O|0)!=0?(O=c[r>>2]|0,(O-q|0)<160):0){L=c[s>>2]|0;c[r>>2]=O+4;c[O>>2]=L}c[k>>2]=Wl(D,c[p>>2]|0,j,u)|0;rj(n,q,c[r>>2]|0,j);if((z|0)!=0){if((c[z+12>>2]|0)==(c[z+16>>2]|0)?(qc[c[(c[z>>2]|0)+36>>2]&127](z)|0)==-1:0){c[f>>2]=0;P=0}else{P=z}}else{P=0}z=(P|0)==0;do{if((C|0)!=0){if((c[C+12>>2]|0)!=(c[C+16>>2]|0)){if(!z){break}c[b>>2]=P;De(o);De(n);i=e;return}if((qc[c[(c[C>>2]|0)+36>>2]&127](C)|0)==-1){c[g>>2]=0;E=54;break}if(z^(C|0)==0){c[b>>2]=P;De(o);De(n);i=e;return}}else{E=54}}while(0);if((E|0)==54?!z:0){c[b>>2]=P;De(o);De(n);i=e;return}c[j>>2]=c[j>>2]|2;c[b>>2]=P;De(o);De(n);i=e;return}function yg(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;l=b+4|0;m=b;c[l>>2]=c[d>>2];c[m>>2]=c[e>>2];c[k+0>>2]=c[l+0>>2];c[j+0>>2]=c[m+0>>2];zg(a,0,k,j,f,g,h);i=b;return}function zg(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0;e=i;i=i+224|0;l=e+198|0;m=e+196|0;n=e+16|0;o=e+4|0;p=e+192|0;q=e+32|0;r=e;s=e+28|0;t=c[h+4>>2]&74;if((t|0)==8){u=16}else if((t|0)==64){u=8}else if((t|0)==0){u=0}else{u=10}fh(n,h,l,m);c[o+0>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;Fe(o,10,0);if((a[o]&1)==0){h=o+1|0;v=h;w=o+8|0;x=h}else{h=o+8|0;v=o+1|0;w=h;x=c[h>>2]|0}c[p>>2]=x;c[r>>2]=q;c[s>>2]=0;h=o+4|0;t=a[m]|0;m=c[f>>2]|0;y=x;a:while(1){if((m|0)!=0){if((c[m+12>>2]|0)==(c[m+16>>2]|0)?(qc[c[(c[m>>2]|0)+36>>2]&127](m)|0)==-1:0){c[f>>2]=0;z=0}else{z=m}}else{z=0}x=(z|0)==0;A=c[g>>2]|0;do{if((A|0)!=0){if((c[A+12>>2]|0)!=(c[A+16>>2]|0)){if(x){B=A;break}else{C=A;D=y;break a}}if(!((qc[c[(c[A>>2]|0)+36>>2]&127](A)|0)==-1)){if(x){B=A;break}else{C=A;D=y;break a}}else{c[g>>2]=0;E=18;break}}else{E=18}}while(0);if((E|0)==18){E=0;if(x){C=0;D=y;break}else{B=0}}A=a[o]|0;F=(A&1)==0;if(F){G=(A&255)>>>1}else{G=c[h>>2]|0}if(((c[p>>2]|0)-y|0)==(G|0)){if(F){H=(A&255)>>>1;J=(A&255)>>>1}else{A=c[h>>2]|0;H=A;J=A}Fe(o,H<<1,0);if((a[o]&1)==0){K=10}else{K=(c[o>>2]&-2)+ -1|0}Fe(o,K,0);if((a[o]&1)==0){L=v}else{L=c[w>>2]|0}c[p>>2]=L+J;M=L}else{M=y}A=z+12|0;F=c[A>>2]|0;N=z+16|0;if((F|0)==(c[N>>2]|0)){O=qc[c[(c[z>>2]|0)+36>>2]&127](z)|0}else{O=d[F]|0}if((Hg(O&255,u,M,p,s,t,n,q,r,l)|0)!=0){C=B;D=M;break}F=c[A>>2]|0;if((F|0)==(c[N>>2]|0)){qc[c[(c[z>>2]|0)+40>>2]&127](z)|0;m=z;y=M;continue}else{c[A>>2]=F+1;m=z;y=M;continue}}M=a[n]|0;if((M&1)==0){P=(M&255)>>>1}else{P=c[n+4>>2]|0}if((P|0)!=0?(P=c[r>>2]|0,(P-q|0)<160):0){M=c[s>>2]|0;c[r>>2]=P+4;c[P>>2]=M}M=Vl(D,c[p>>2]|0,j,u)|0;u=k;c[u>>2]=M;c[u+4>>2]=I;rj(n,q,c[r>>2]|0,j);if((z|0)!=0){if((c[z+12>>2]|0)==(c[z+16>>2]|0)?(qc[c[(c[z>>2]|0)+36>>2]&127](z)|0)==-1:0){c[f>>2]=0;Q=0}else{Q=z}}else{Q=0}z=(Q|0)==0;do{if((C|0)!=0){if((c[C+12>>2]|0)!=(c[C+16>>2]|0)){if(!z){break}c[b>>2]=Q;De(o);De(n);i=e;return}if((qc[c[(c[C>>2]|0)+36>>2]&127](C)|0)==-1){c[g>>2]=0;E=54;break}if(z^(C|0)==0){c[b>>2]=Q;De(o);De(n);i=e;return}}else{E=54}}while(0);if((E|0)==54?!z:0){c[b>>2]=Q;De(o);De(n);i=e;return}c[j>>2]=c[j>>2]|2;c[b>>2]=Q;De(o);De(n);i=e;return}function Ag(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;l=b+4|0;m=b;c[l>>2]=c[d>>2];c[m>>2]=c[e>>2];c[k+0>>2]=c[l+0>>2];c[j+0>>2]=c[m+0>>2];Bg(a,0,k,j,f,g,h);i=b;return}function Bg(b,e,f,h,j,k,l){b=b|0;e=e|0;f=f|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0;e=i;i=i+256|0;m=e+208|0;n=e+200|0;o=e+240|0;p=e;q=e+188|0;r=e+184|0;s=e+16|0;t=e+176|0;u=e+180|0;v=e+241|0;w=e+242|0;gh(p,j,m,n,o);c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;Fe(q,10,0);if((a[q]&1)==0){j=q+1|0;x=j;y=q+8|0;z=j}else{j=q+8|0;x=q+1|0;y=j;z=c[j>>2]|0}c[r>>2]=z;c[t>>2]=s;c[u>>2]=0;a[v]=1;a[w]=69;j=q+4|0;A=a[n]|0;n=a[o]|0;o=c[f>>2]|0;B=z;a:while(1){if((o|0)!=0){if((c[o+12>>2]|0)==(c[o+16>>2]|0)?(qc[c[(c[o>>2]|0)+36>>2]&127](o)|0)==-1:0){c[f>>2]=0;C=0}else{C=o}}else{C=0}z=(C|0)==0;D=c[h>>2]|0;do{if((D|0)!=0){if((c[D+12>>2]|0)!=(c[D+16>>2]|0)){if(z){E=D;break}else{F=D;G=B;break a}}if(!((qc[c[(c[D>>2]|0)+36>>2]&127](D)|0)==-1)){if(z){E=D;break}else{F=D;G=B;break a}}else{c[h>>2]=0;H=14;break}}else{H=14}}while(0);if((H|0)==14){H=0;if(z){F=0;G=B;break}else{E=0}}D=a[q]|0;I=(D&1)==0;if(I){J=(D&255)>>>1}else{J=c[j>>2]|0}if(((c[r>>2]|0)-B|0)==(J|0)){if(I){K=(D&255)>>>1;L=(D&255)>>>1}else{D=c[j>>2]|0;K=D;L=D}Fe(q,K<<1,0);if((a[q]&1)==0){M=10}else{M=(c[q>>2]&-2)+ -1|0}Fe(q,M,0);if((a[q]&1)==0){N=x}else{N=c[y>>2]|0}c[r>>2]=N+L;O=N}else{O=B}D=C+12|0;I=c[D>>2]|0;P=C+16|0;if((I|0)==(c[P>>2]|0)){Q=qc[c[(c[C>>2]|0)+36>>2]&127](C)|0}else{Q=d[I]|0}if((hh(Q&255,v,w,O,r,A,n,p,s,t,u,m)|0)!=0){F=E;G=O;break}I=c[D>>2]|0;if((I|0)==(c[P>>2]|0)){qc[c[(c[C>>2]|0)+40>>2]&127](C)|0;o=C;B=O;continue}else{c[D>>2]=I+1;o=C;B=O;continue}}O=a[p]|0;if((O&1)==0){R=(O&255)>>>1}else{R=c[p+4>>2]|0}if(((R|0)!=0?(a[v]|0)!=0:0)?(v=c[t>>2]|0,(v-s|0)<160):0){R=c[u>>2]|0;c[t>>2]=v+4;c[v>>2]=R}g[l>>2]=+Ul(G,c[r>>2]|0,k);rj(p,s,c[t>>2]|0,k);if((C|0)!=0){if((c[C+12>>2]|0)==(c[C+16>>2]|0)?(qc[c[(c[C>>2]|0)+36>>2]&127](C)|0)==-1:0){c[f>>2]=0;S=0}else{S=C}}else{S=0}C=(S|0)==0;do{if((F|0)!=0){if((c[F+12>>2]|0)!=(c[F+16>>2]|0)){if(!C){break}c[b>>2]=S;De(q);De(p);i=e;return}if((qc[c[(c[F>>2]|0)+36>>2]&127](F)|0)==-1){c[h>>2]=0;H=51;break}if(C^(F|0)==0){c[b>>2]=S;De(q);De(p);i=e;return}}else{H=51}}while(0);if((H|0)==51?!C:0){c[b>>2]=S;De(q);De(p);i=e;return}c[k>>2]=c[k>>2]|2;c[b>>2]=S;De(q);De(p);i=e;return}function Cg(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;l=b+4|0;m=b;c[l>>2]=c[d>>2];c[m>>2]=c[e>>2];c[k+0>>2]=c[l+0>>2];c[j+0>>2]=c[m+0>>2];Dg(a,0,k,j,f,g,h);i=b;return}function Dg(b,e,f,g,j,k,l){b=b|0;e=e|0;f=f|0;g=g|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0;e=i;i=i+256|0;m=e+208|0;n=e+200|0;o=e+240|0;p=e;q=e+188|0;r=e+184|0;s=e+16|0;t=e+176|0;u=e+180|0;v=e+241|0;w=e+242|0;gh(p,j,m,n,o);c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;Fe(q,10,0);if((a[q]&1)==0){j=q+1|0;x=j;y=q+8|0;z=j}else{j=q+8|0;x=q+1|0;y=j;z=c[j>>2]|0}c[r>>2]=z;c[t>>2]=s;c[u>>2]=0;a[v]=1;a[w]=69;j=q+4|0;A=a[n]|0;n=a[o]|0;o=c[f>>2]|0;B=z;a:while(1){if((o|0)!=0){if((c[o+12>>2]|0)==(c[o+16>>2]|0)?(qc[c[(c[o>>2]|0)+36>>2]&127](o)|0)==-1:0){c[f>>2]=0;C=0}else{C=o}}else{C=0}z=(C|0)==0;D=c[g>>2]|0;do{if((D|0)!=0){if((c[D+12>>2]|0)!=(c[D+16>>2]|0)){if(z){E=D;break}else{F=D;G=B;break a}}if(!((qc[c[(c[D>>2]|0)+36>>2]&127](D)|0)==-1)){if(z){E=D;break}else{F=D;G=B;break a}}else{c[g>>2]=0;H=14;break}}else{H=14}}while(0);if((H|0)==14){H=0;if(z){F=0;G=B;break}else{E=0}}D=a[q]|0;I=(D&1)==0;if(I){J=(D&255)>>>1}else{J=c[j>>2]|0}if(((c[r>>2]|0)-B|0)==(J|0)){if(I){K=(D&255)>>>1;L=(D&255)>>>1}else{D=c[j>>2]|0;K=D;L=D}Fe(q,K<<1,0);if((a[q]&1)==0){M=10}else{M=(c[q>>2]&-2)+ -1|0}Fe(q,M,0);if((a[q]&1)==0){N=x}else{N=c[y>>2]|0}c[r>>2]=N+L;O=N}else{O=B}D=C+12|0;I=c[D>>2]|0;P=C+16|0;if((I|0)==(c[P>>2]|0)){Q=qc[c[(c[C>>2]|0)+36>>2]&127](C)|0}else{Q=d[I]|0}if((hh(Q&255,v,w,O,r,A,n,p,s,t,u,m)|0)!=0){F=E;G=O;break}I=c[D>>2]|0;if((I|0)==(c[P>>2]|0)){qc[c[(c[C>>2]|0)+40>>2]&127](C)|0;o=C;B=O;continue}else{c[D>>2]=I+1;o=C;B=O;continue}}O=a[p]|0;if((O&1)==0){R=(O&255)>>>1}else{R=c[p+4>>2]|0}if(((R|0)!=0?(a[v]|0)!=0:0)?(v=c[t>>2]|0,(v-s|0)<160):0){R=c[u>>2]|0;c[t>>2]=v+4;c[v>>2]=R}h[l>>3]=+Tl(G,c[r>>2]|0,k);rj(p,s,c[t>>2]|0,k);if((C|0)!=0){if((c[C+12>>2]|0)==(c[C+16>>2]|0)?(qc[c[(c[C>>2]|0)+36>>2]&127](C)|0)==-1:0){c[f>>2]=0;S=0}else{S=C}}else{S=0}C=(S|0)==0;do{if((F|0)!=0){if((c[F+12>>2]|0)!=(c[F+16>>2]|0)){if(!C){break}c[b>>2]=S;De(q);De(p);i=e;return}if((qc[c[(c[F>>2]|0)+36>>2]&127](F)|0)==-1){c[g>>2]=0;H=51;break}if(C^(F|0)==0){c[b>>2]=S;De(q);De(p);i=e;return}}else{H=51}}while(0);if((H|0)==51?!C:0){c[b>>2]=S;De(q);De(p);i=e;return}c[k>>2]=c[k>>2]|2;c[b>>2]=S;De(q);De(p);i=e;return}function Eg(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;l=b+4|0;m=b;c[l>>2]=c[d>>2];c[m>>2]=c[e>>2];c[k+0>>2]=c[l+0>>2];c[j+0>>2]=c[m+0>>2];Fg(a,0,k,j,f,g,h);i=b;return}function Fg(b,e,f,g,j,k,l){b=b|0;e=e|0;f=f|0;g=g|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0;e=i;i=i+256|0;m=e+208|0;n=e+200|0;o=e+240|0;p=e;q=e+188|0;r=e+184|0;s=e+16|0;t=e+176|0;u=e+180|0;v=e+241|0;w=e+242|0;gh(p,j,m,n,o);c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;Fe(q,10,0);if((a[q]&1)==0){j=q+1|0;x=j;y=q+8|0;z=j}else{j=q+8|0;x=q+1|0;y=j;z=c[j>>2]|0}c[r>>2]=z;c[t>>2]=s;c[u>>2]=0;a[v]=1;a[w]=69;j=q+4|0;A=a[n]|0;n=a[o]|0;o=c[f>>2]|0;B=z;a:while(1){if((o|0)!=0){if((c[o+12>>2]|0)==(c[o+16>>2]|0)?(qc[c[(c[o>>2]|0)+36>>2]&127](o)|0)==-1:0){c[f>>2]=0;C=0}else{C=o}}else{C=0}z=(C|0)==0;D=c[g>>2]|0;do{if((D|0)!=0){if((c[D+12>>2]|0)!=(c[D+16>>2]|0)){if(z){E=D;break}else{F=D;G=B;break a}}if(!((qc[c[(c[D>>2]|0)+36>>2]&127](D)|0)==-1)){if(z){E=D;break}else{F=D;G=B;break a}}else{c[g>>2]=0;H=14;break}}else{H=14}}while(0);if((H|0)==14){H=0;if(z){F=0;G=B;break}else{E=0}}D=a[q]|0;I=(D&1)==0;if(I){J=(D&255)>>>1}else{J=c[j>>2]|0}if(((c[r>>2]|0)-B|0)==(J|0)){if(I){K=(D&255)>>>1;L=(D&255)>>>1}else{D=c[j>>2]|0;K=D;L=D}Fe(q,K<<1,0);if((a[q]&1)==0){M=10}else{M=(c[q>>2]&-2)+ -1|0}Fe(q,M,0);if((a[q]&1)==0){N=x}else{N=c[y>>2]|0}c[r>>2]=N+L;O=N}else{O=B}D=C+12|0;I=c[D>>2]|0;P=C+16|0;if((I|0)==(c[P>>2]|0)){Q=qc[c[(c[C>>2]|0)+36>>2]&127](C)|0}else{Q=d[I]|0}if((hh(Q&255,v,w,O,r,A,n,p,s,t,u,m)|0)!=0){F=E;G=O;break}I=c[D>>2]|0;if((I|0)==(c[P>>2]|0)){qc[c[(c[C>>2]|0)+40>>2]&127](C)|0;o=C;B=O;continue}else{c[D>>2]=I+1;o=C;B=O;continue}}O=a[p]|0;if((O&1)==0){R=(O&255)>>>1}else{R=c[p+4>>2]|0}if(((R|0)!=0?(a[v]|0)!=0:0)?(v=c[t>>2]|0,(v-s|0)<160):0){R=c[u>>2]|0;c[t>>2]=v+4;c[v>>2]=R}h[l>>3]=+Sl(G,c[r>>2]|0,k);rj(p,s,c[t>>2]|0,k);if((C|0)!=0){if((c[C+12>>2]|0)==(c[C+16>>2]|0)?(qc[c[(c[C>>2]|0)+36>>2]&127](C)|0)==-1:0){c[f>>2]=0;S=0}else{S=C}}else{S=0}C=(S|0)==0;do{if((F|0)!=0){if((c[F+12>>2]|0)!=(c[F+16>>2]|0)){if(!C){break}c[b>>2]=S;De(q);De(p);i=e;return}if((qc[c[(c[F>>2]|0)+36>>2]&127](F)|0)==-1){c[g>>2]=0;H=51;break}if(C^(F|0)==0){c[b>>2]=S;De(q);De(p);i=e;return}}else{H=51}}while(0);if((H|0)==51?!C:0){c[b>>2]=S;De(q);De(p);i=e;return}c[k>>2]=c[k>>2]|2;c[b>>2]=S;De(q);De(p);i=e;return}function Gg(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0;e=i;i=i+240|0;l=e;m=e+204|0;n=e+192|0;o=e+188|0;p=e+176|0;q=e+16|0;c[n+0>>2]=0;c[n+4>>2]=0;c[n+8>>2]=0;Xe(o,h);h=c[o>>2]|0;if(!((c[1684]|0)==-1)){c[l>>2]=6736;c[l+4>>2]=117;c[l+8>>2]=0;ye(6736,l,118)}r=(c[6740>>2]|0)+ -1|0;s=c[h+8>>2]|0;if(!((c[h+12>>2]|0)-s>>2>>>0>r>>>0)){t=Ya(4)|0;um(t);zb(t|0,14696,106)}h=c[s+(r<<2)>>2]|0;if((h|0)==0){t=Ya(4)|0;um(t);zb(t|0,14696,106)}wc[c[(c[h>>2]|0)+32>>2]&7](h,5280,5306|0,m)|0;ee(c[o>>2]|0)|0;c[p+0>>2]=0;c[p+4>>2]=0;c[p+8>>2]=0;Fe(p,10,0);if((a[p]&1)==0){o=p+1|0;u=o;v=p+8|0;w=o}else{o=p+8|0;u=p+1|0;v=o;w=c[o>>2]|0}o=p+4|0;h=m+24|0;t=m+25|0;r=q;s=m+26|0;x=m;y=n+4|0;z=c[f>>2]|0;A=q;q=0;B=w;C=w;a:while(1){if((z|0)!=0){if((c[z+12>>2]|0)==(c[z+16>>2]|0)?(qc[c[(c[z>>2]|0)+36>>2]&127](z)|0)==-1:0){c[f>>2]=0;D=0}else{D=z}}else{D=0}w=(D|0)==0;E=c[g>>2]|0;do{if((E|0)!=0){if((c[E+12>>2]|0)!=(c[E+16>>2]|0)){if(w){break}else{F=C;break a}}if(!((qc[c[(c[E>>2]|0)+36>>2]&127](E)|0)==-1)){if(w){break}else{F=C;break a}}else{c[g>>2]=0;G=19;break}}else{G=19}}while(0);if((G|0)==19?(G=0,w):0){F=C;break}E=a[p]|0;H=(E&1)==0;if(H){I=(E&255)>>>1}else{I=c[o>>2]|0}if((B-C|0)==(I|0)){if(H){J=(E&255)>>>1;K=(E&255)>>>1}else{E=c[o>>2]|0;J=E;K=E}Fe(p,J<<1,0);if((a[p]&1)==0){L=10}else{L=(c[p>>2]&-2)+ -1|0}Fe(p,L,0);if((a[p]&1)==0){M=u}else{M=c[v>>2]|0}N=M+K|0;O=M}else{N=B;O=C}E=c[D+12>>2]|0;if((E|0)==(c[D+16>>2]|0)){P=qc[c[(c[D>>2]|0)+36>>2]&127](D)|0}else{P=d[E]|0}E=P&255;H=(N|0)==(O|0);do{if(H){Q=(a[h]|0)==E<<24>>24;if(!Q?!((a[t]|0)==E<<24>>24):0){G=40;break}a[N]=Q?43:45;R=N+1|0;S=A;T=0}else{G=40}}while(0);do{if((G|0)==40){G=0;w=a[n]|0;if((w&1)==0){U=(w&255)>>>1}else{U=c[y>>2]|0}if((U|0)!=0&E<<24>>24==0){if((A-r|0)>=160){R=N;S=A;T=q;break}c[A>>2]=q;R=N;S=A+4|0;T=0;break}else{V=m}while(1){w=V+1|0;if((a[V]|0)==E<<24>>24){W=V;break}if((w|0)==(s|0)){W=s;break}else{V=w}}w=W-x|0;if((w|0)>23){F=O;break a}if((w|0)<22){a[N]=a[5280+w|0]|0;R=N+1|0;S=A;T=q+1|0;break}if(H){F=N;break a}if((N-O|0)>=3){F=O;break a}if((a[N+ -1|0]|0)!=48){F=O;break a}a[N]=a[5280+w|0]|0;R=N+1|0;S=A;T=0}}while(0);H=c[f>>2]|0;E=H+12|0;w=c[E>>2]|0;if((w|0)==(c[H+16>>2]|0)){qc[c[(c[H>>2]|0)+40>>2]&127](H)|0;z=H;A=S;q=T;B=R;C=O;continue}else{c[E>>2]=w+1;z=H;A=S;q=T;B=R;C=O;continue}}a[F+3|0]=0;if((a[6632]|0)==0?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}O=c[1656]|0;c[l>>2]=k;if((Ig(F,O,5320,l)|0)!=1){c[j>>2]=4}l=c[f>>2]|0;if((l|0)!=0){if((c[l+12>>2]|0)==(c[l+16>>2]|0)?(qc[c[(c[l>>2]|0)+36>>2]&127](l)|0)==-1:0){c[f>>2]=0;X=0}else{X=l}}else{X=0}l=(X|0)==0;f=c[g>>2]|0;do{if((f|0)!=0){if((c[f+12>>2]|0)!=(c[f+16>>2]|0)){if(!l){break}c[b>>2]=X;De(p);De(n);i=e;return}if((qc[c[(c[f>>2]|0)+36>>2]&127](f)|0)==-1){c[g>>2]=0;G=72;break}if(l^(f|0)==0){c[b>>2]=X;De(p);De(n);i=e;return}}else{G=72}}while(0);if((G|0)==72?!l:0){c[b>>2]=X;De(p);De(n);i=e;return}c[j>>2]=c[j>>2]|2;c[b>>2]=X;De(p);De(n);i=e;return}function Hg(b,d,e,f,g,h,j,k,l,m){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0;n=i;o=c[f>>2]|0;p=(o|0)==(e|0);do{if(p){q=(a[m+24|0]|0)==b<<24>>24;if(!q?!((a[m+25|0]|0)==b<<24>>24):0){break}c[f>>2]=e+1;a[e]=q?43:45;c[g>>2]=0;r=0;i=n;return r|0}}while(0);q=a[j]|0;if((q&1)==0){s=(q&255)>>>1}else{s=c[j+4>>2]|0}if((s|0)!=0&b<<24>>24==h<<24>>24){h=c[l>>2]|0;if((h-k|0)>=160){r=0;i=n;return r|0}k=c[g>>2]|0;c[l>>2]=h+4;c[h>>2]=k;c[g>>2]=0;r=0;i=n;return r|0}k=m+26|0;h=m;while(1){l=h+1|0;if((a[h]|0)==b<<24>>24){t=h;break}if((l|0)==(k|0)){t=k;break}else{h=l}}h=t-m|0;if((h|0)>23){r=-1;i=n;return r|0}if((d|0)==10|(d|0)==8){if((h|0)>=(d|0)){r=-1;i=n;return r|0}}else if((d|0)==16?(h|0)>=22:0){if(p){r=-1;i=n;return r|0}if((o-e|0)>=3){r=-1;i=n;return r|0}if((a[o+ -1|0]|0)!=48){r=-1;i=n;return r|0}c[g>>2]=0;e=a[5280+h|0]|0;c[f>>2]=o+1;a[o]=e;r=0;i=n;return r|0}e=a[5280+h|0]|0;c[f>>2]=o+1;a[o]=e;c[g>>2]=(c[g>>2]|0)+1;r=0;i=n;return r|0}function Ig(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0;f=i;i=i+16|0;g=f;c[g>>2]=e;e=kb(b|0)|0;b=Ma(a|0,d|0,g|0)|0;if((e|0)==0){i=f;return b|0}kb(e|0)|0;i=f;return b|0}function Jg(a){a=a|0;var b=0;b=i;Wm(a);i=b;return}function Kg(a){a=a|0;return}function Lg(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;k=i;i=i+80|0;l=k;m=k+24|0;n=k+28|0;o=k+32|0;p=k+16|0;q=k+12|0;r=k+20|0;s=k+36|0;t=k+40|0;u=k+64|0;if((c[g+4>>2]&1|0)==0){c[n>>2]=-1;v=c[(c[d>>2]|0)+16>>2]|0;c[p>>2]=c[e>>2];c[q>>2]=c[f>>2];c[m+0>>2]=c[p+0>>2];c[l+0>>2]=c[q+0>>2];lc[v&63](o,d,m,l,g,h,n);m=c[o>>2]|0;c[e>>2]=m;o=c[n>>2]|0;if((o|0)==0){a[j]=0}else if((o|0)==1){a[j]=1}else{a[j]=1;c[h>>2]=4}c[b>>2]=m;i=k;return}Xe(r,g);m=c[r>>2]|0;if(!((c[1682]|0)==-1)){c[l>>2]=6728;c[l+4>>2]=117;c[l+8>>2]=0;ye(6728,l,118)}o=(c[6732>>2]|0)+ -1|0;n=c[m+8>>2]|0;if(!((c[m+12>>2]|0)-n>>2>>>0>o>>>0)){w=Ya(4)|0;um(w);zb(w|0,14696,106)}m=c[n+(o<<2)>>2]|0;if((m|0)==0){w=Ya(4)|0;um(w);zb(w|0,14696,106)}ee(c[r>>2]|0)|0;Xe(s,g);g=c[s>>2]|0;if(!((c[1722]|0)==-1)){c[l>>2]=6888;c[l+4>>2]=117;c[l+8>>2]=0;ye(6888,l,118)}r=(c[6892>>2]|0)+ -1|0;w=c[g+8>>2]|0;if(!((c[g+12>>2]|0)-w>>2>>>0>r>>>0)){x=Ya(4)|0;um(x);zb(x|0,14696,106)}g=c[w+(r<<2)>>2]|0;if((g|0)==0){x=Ya(4)|0;um(x);zb(x|0,14696,106)}ee(c[s>>2]|0)|0;oc[c[(c[g>>2]|0)+24>>2]&63](t,g);oc[c[(c[g>>2]|0)+28>>2]&63](t+12|0,g);c[u>>2]=c[f>>2];f=t+24|0;c[l+0>>2]=c[u+0>>2];a[j]=(Mg(e,l,t,f,m,h,1)|0)==(t|0)|0;c[b>>2]=c[e>>2];Oe(t+12|0);Oe(t);i=k;return}function Mg(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0;k=i;i=i+112|0;l=k;m=(f-e|0)/12|0;if(m>>>0>100){n=Pm(m)|0;if((n|0)==0){$m()}else{o=n;p=n}}else{o=0;p=l}l=(e|0)==(f|0);if(l){q=0;r=m}else{n=e;s=0;t=m;m=p;while(1){u=a[n]|0;if((u&1)==0){v=(u&255)>>>1}else{v=c[n+4>>2]|0}if((v|0)==0){a[m]=2;w=s+1|0;x=t+ -1|0}else{a[m]=1;w=s;x=t}u=n+12|0;if((u|0)==(f|0)){q=w;r=x;break}else{n=u;s=w;t=x;m=m+1|0}}}m=0;x=q;q=r;a:while(1){r=c[b>>2]|0;do{if((r|0)!=0){t=c[r+12>>2]|0;if((t|0)==(c[r+16>>2]|0)){y=qc[c[(c[r>>2]|0)+36>>2]&127](r)|0}else{y=c[t>>2]|0}if((y|0)==-1){c[b>>2]=0;z=1;break}else{z=(c[b>>2]|0)==0;break}}else{z=1}}while(0);r=c[d>>2]|0;if((r|0)!=0){t=c[r+12>>2]|0;if((t|0)==(c[r+16>>2]|0)){A=qc[c[(c[r>>2]|0)+36>>2]&127](r)|0}else{A=c[t>>2]|0}if((A|0)==-1){c[d>>2]=0;B=0;C=1}else{B=r;C=0}}else{B=0;C=1}D=c[b>>2]|0;if(!((z^C)&(q|0)!=0)){break}r=c[D+12>>2]|0;if((r|0)==(c[D+16>>2]|0)){E=qc[c[(c[D>>2]|0)+36>>2]&127](D)|0}else{E=c[r>>2]|0}if(j){F=E}else{F=zc[c[(c[g>>2]|0)+28>>2]&15](g,E)|0}r=m+1|0;if(l){m=r;continue}b:do{if(j){t=0;w=e;s=x;n=q;v=p;while(1){do{if((a[v]|0)==1){u=a[w]|0;G=(u&1)==0;if(G){H=w+4|0}else{H=c[w+8>>2]|0}if((F|0)!=(c[H+(m<<2)>>2]|0)){a[v]=0;I=t;J=s;K=n+ -1|0;break}if(G){L=(u&255)>>>1}else{L=c[w+4>>2]|0}if((L|0)==(r|0)){a[v]=2;I=1;J=s+1|0;K=n+ -1|0}else{I=1;J=s;K=n}}else{I=t;J=s;K=n}}while(0);u=w+12|0;if((u|0)==(f|0)){M=I;N=J;O=K;break b}t=I;w=u;s=J;n=K;v=v+1|0}}else{v=0;n=e;s=x;w=q;t=p;while(1){do{if((a[t]|0)==1){if((a[n]&1)==0){P=n+4|0}else{P=c[n+8>>2]|0}if((F|0)!=(zc[c[(c[g>>2]|0)+28>>2]&15](g,c[P+(m<<2)>>2]|0)|0)){a[t]=0;Q=v;R=s;S=w+ -1|0;break}u=a[n]|0;if((u&1)==0){T=(u&255)>>>1}else{T=c[n+4>>2]|0}if((T|0)==(r|0)){a[t]=2;Q=1;R=s+1|0;S=w+ -1|0}else{Q=1;R=s;S=w}}else{Q=v;R=s;S=w}}while(0);u=n+12|0;if((u|0)==(f|0)){M=Q;N=R;O=S;break b}v=Q;n=u;s=R;w=S;t=t+1|0}}}while(0);if(!M){m=r;x=N;q=O;continue}t=c[b>>2]|0;w=t+12|0;s=c[w>>2]|0;if((s|0)==(c[t+16>>2]|0)){qc[c[(c[t>>2]|0)+40>>2]&127](t)|0}else{c[w>>2]=s+4}if((O+N|0)>>>0<2){m=r;x=N;q=O;continue}else{U=e;V=N;W=p}while(1){if((a[W]|0)==2){s=a[U]|0;if((s&1)==0){X=(s&255)>>>1}else{X=c[U+4>>2]|0}if((X|0)!=(r|0)){a[W]=0;Y=V+ -1|0}else{Y=V}}else{Y=V}s=U+12|0;if((s|0)==(f|0)){m=r;x=Y;q=O;continue a}else{U=s;V=Y;W=W+1|0}}}do{if((D|0)!=0){W=c[D+12>>2]|0;if((W|0)==(c[D+16>>2]|0)){Z=qc[c[(c[D>>2]|0)+36>>2]&127](D)|0}else{Z=c[W>>2]|0}if((Z|0)==-1){c[b>>2]=0;_=1;break}else{_=(c[b>>2]|0)==0;break}}else{_=1}}while(0);do{if((B|0)!=0){b=c[B+12>>2]|0;if((b|0)==(c[B+16>>2]|0)){$=qc[c[(c[B>>2]|0)+36>>2]&127](B)|0}else{$=c[b>>2]|0}if(!(($|0)==-1)){if(_){break}else{aa=87;break}}else{c[d>>2]=0;aa=85;break}}else{aa=85}}while(0);if((aa|0)==85?_:0){aa=87}if((aa|0)==87){c[h>>2]=c[h>>2]|2}c:do{if(!l){if((a[p]|0)==2){ba=e}else{_=e;d=p;while(1){$=_+12|0;B=d+1|0;if(($|0)==(f|0)){aa=92;break c}if((a[B]|0)==2){ba=$;break}else{_=$;d=B}}}}else{aa=92}}while(0);if((aa|0)==92){c[h>>2]=c[h>>2]|4;ba=f}if((o|0)==0){i=k;return ba|0}Qm(o);i=k;return ba|0}function Ng(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;l=b+4|0;m=b;c[l>>2]=c[d>>2];c[m>>2]=c[e>>2];c[k+0>>2]=c[l+0>>2];c[j+0>>2]=c[m+0>>2];Og(a,0,k,j,f,g,h);i=b;return}function Og(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0;d=i;i=i+304|0;k=d+160|0;l=d+280|0;m=d+264|0;n=d+284|0;o=d+300|0;p=d;q=d+276|0;r=d+296|0;s=c[g+4>>2]&74;if((s|0)==64){t=8}else if((s|0)==8){t=16}else if((s|0)==0){t=0}else{t=10}ih(m,g,k,l);c[n+0>>2]=0;c[n+4>>2]=0;c[n+8>>2]=0;Fe(n,10,0);if((a[n]&1)==0){g=n+1|0;u=g;v=n+8|0;w=g}else{g=n+8|0;u=n+1|0;v=g;w=c[g>>2]|0}c[o>>2]=w;c[q>>2]=p;c[r>>2]=0;g=n+4|0;s=c[l>>2]|0;l=c[e>>2]|0;x=w;a:while(1){if((l|0)!=0){w=c[l+12>>2]|0;if((w|0)==(c[l+16>>2]|0)){y=qc[c[(c[l>>2]|0)+36>>2]&127](l)|0}else{y=c[w>>2]|0}if((y|0)==-1){c[e>>2]=0;z=1;A=0}else{z=0;A=l}}else{z=1;A=0}w=c[f>>2]|0;do{if((w|0)!=0){B=c[w+12>>2]|0;if((B|0)==(c[w+16>>2]|0)){C=qc[c[(c[w>>2]|0)+36>>2]&127](w)|0}else{C=c[B>>2]|0}if(!((C|0)==-1)){if(z){D=w;break}else{E=w;F=x;break a}}else{c[f>>2]=0;G=21;break}}else{G=21}}while(0);if((G|0)==21){G=0;if(z){E=0;F=x;break}else{D=0}}w=a[n]|0;B=(w&1)==0;if(B){H=(w&255)>>>1}else{H=c[g>>2]|0}if(((c[o>>2]|0)-x|0)==(H|0)){if(B){I=(w&255)>>>1;J=(w&255)>>>1}else{w=c[g>>2]|0;I=w;J=w}Fe(n,I<<1,0);if((a[n]&1)==0){K=10}else{K=(c[n>>2]&-2)+ -1|0}Fe(n,K,0);if((a[n]&1)==0){L=u}else{L=c[v>>2]|0}c[o>>2]=L+J;M=L}else{M=x}w=A+12|0;B=c[w>>2]|0;N=A+16|0;if((B|0)==(c[N>>2]|0)){O=qc[c[(c[A>>2]|0)+36>>2]&127](A)|0}else{O=c[B>>2]|0}if((eh(O,t,M,o,r,s,m,p,q,k)|0)!=0){E=D;F=M;break}B=c[w>>2]|0;if((B|0)==(c[N>>2]|0)){qc[c[(c[A>>2]|0)+40>>2]&127](A)|0;l=A;x=M;continue}else{c[w>>2]=B+4;l=A;x=M;continue}}M=a[m]|0;if((M&1)==0){P=(M&255)>>>1}else{P=c[m+4>>2]|0}if((P|0)!=0?(P=c[q>>2]|0,(P-p|0)<160):0){M=c[r>>2]|0;c[q>>2]=P+4;c[P>>2]=M}c[j>>2]=_l(F,c[o>>2]|0,h,t)|0;rj(m,p,c[q>>2]|0,h);if((A|0)!=0){q=c[A+12>>2]|0;if((q|0)==(c[A+16>>2]|0)){Q=qc[c[(c[A>>2]|0)+36>>2]&127](A)|0}else{Q=c[q>>2]|0}if((Q|0)==-1){c[e>>2]=0;R=0;S=1}else{R=A;S=0}}else{R=0;S=1}do{if((E|0)!=0){A=c[E+12>>2]|0;if((A|0)==(c[E+16>>2]|0)){T=qc[c[(c[E>>2]|0)+36>>2]&127](E)|0}else{T=c[A>>2]|0}if((T|0)==-1){c[f>>2]=0;G=60;break}if(S){c[b>>2]=R;De(n);De(m);i=d;return}}else{G=60}}while(0);if((G|0)==60?!S:0){c[b>>2]=R;De(n);De(m);i=d;return}c[h>>2]=c[h>>2]|2;c[b>>2]=R;De(n);De(m);i=d;return}function Pg(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;l=b+4|0;m=b;c[l>>2]=c[d>>2];c[m>>2]=c[e>>2];c[k+0>>2]=c[l+0>>2];c[j+0>>2]=c[m+0>>2];Qg(a,0,k,j,f,g,h);i=b;return}function Qg(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0;d=i;i=i+304|0;k=d+160|0;l=d+280|0;m=d+264|0;n=d+284|0;o=d+300|0;p=d;q=d+276|0;r=d+296|0;s=c[g+4>>2]&74;if((s|0)==0){t=0}else if((s|0)==8){t=16}else if((s|0)==64){t=8}else{t=10}ih(m,g,k,l);c[n+0>>2]=0;c[n+4>>2]=0;c[n+8>>2]=0;Fe(n,10,0);if((a[n]&1)==0){g=n+1|0;u=g;v=n+8|0;w=g}else{g=n+8|0;u=n+1|0;v=g;w=c[g>>2]|0}c[o>>2]=w;c[q>>2]=p;c[r>>2]=0;g=n+4|0;s=c[l>>2]|0;l=c[e>>2]|0;x=w;a:while(1){if((l|0)!=0){w=c[l+12>>2]|0;if((w|0)==(c[l+16>>2]|0)){y=qc[c[(c[l>>2]|0)+36>>2]&127](l)|0}else{y=c[w>>2]|0}if((y|0)==-1){c[e>>2]=0;z=1;A=0}else{z=0;A=l}}else{z=1;A=0}w=c[f>>2]|0;do{if((w|0)!=0){B=c[w+12>>2]|0;if((B|0)==(c[w+16>>2]|0)){C=qc[c[(c[w>>2]|0)+36>>2]&127](w)|0}else{C=c[B>>2]|0}if(!((C|0)==-1)){if(z){D=w;break}else{E=w;F=x;break a}}else{c[f>>2]=0;G=21;break}}else{G=21}}while(0);if((G|0)==21){G=0;if(z){E=0;F=x;break}else{D=0}}w=a[n]|0;B=(w&1)==0;if(B){H=(w&255)>>>1}else{H=c[g>>2]|0}if(((c[o>>2]|0)-x|0)==(H|0)){if(B){J=(w&255)>>>1;K=(w&255)>>>1}else{w=c[g>>2]|0;J=w;K=w}Fe(n,J<<1,0);if((a[n]&1)==0){L=10}else{L=(c[n>>2]&-2)+ -1|0}Fe(n,L,0);if((a[n]&1)==0){M=u}else{M=c[v>>2]|0}c[o>>2]=M+K;N=M}else{N=x}w=A+12|0;B=c[w>>2]|0;O=A+16|0;if((B|0)==(c[O>>2]|0)){P=qc[c[(c[A>>2]|0)+36>>2]&127](A)|0}else{P=c[B>>2]|0}if((eh(P,t,N,o,r,s,m,p,q,k)|0)!=0){E=D;F=N;break}B=c[w>>2]|0;if((B|0)==(c[O>>2]|0)){qc[c[(c[A>>2]|0)+40>>2]&127](A)|0;l=A;x=N;continue}else{c[w>>2]=B+4;l=A;x=N;continue}}N=a[m]|0;if((N&1)==0){Q=(N&255)>>>1}else{Q=c[m+4>>2]|0}if((Q|0)!=0?(Q=c[q>>2]|0,(Q-p|0)<160):0){N=c[r>>2]|0;c[q>>2]=Q+4;c[Q>>2]=N}N=Zl(F,c[o>>2]|0,h,t)|0;t=j;c[t>>2]=N;c[t+4>>2]=I;rj(m,p,c[q>>2]|0,h);if((A|0)!=0){q=c[A+12>>2]|0;if((q|0)==(c[A+16>>2]|0)){R=qc[c[(c[A>>2]|0)+36>>2]&127](A)|0}else{R=c[q>>2]|0}if((R|0)==-1){c[e>>2]=0;S=0;T=1}else{S=A;T=0}}else{S=0;T=1}do{if((E|0)!=0){A=c[E+12>>2]|0;if((A|0)==(c[E+16>>2]|0)){U=qc[c[(c[E>>2]|0)+36>>2]&127](E)|0}else{U=c[A>>2]|0}if((U|0)==-1){c[f>>2]=0;G=60;break}if(T){c[b>>2]=S;De(n);De(m);i=d;return}}else{G=60}}while(0);if((G|0)==60?!T:0){c[b>>2]=S;De(n);De(m);i=d;return}c[h>>2]=c[h>>2]|2;c[b>>2]=S;De(n);De(m);i=d;return}function Rg(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;l=b+4|0;m=b;c[l>>2]=c[d>>2];c[m>>2]=c[e>>2];c[k+0>>2]=c[l+0>>2];c[j+0>>2]=c[m+0>>2];Sg(a,0,k,j,f,g,h);i=b;return}function Sg(d,e,f,g,h,j,k){d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0;e=i;i=i+304|0;l=e+160|0;m=e+280|0;n=e+264|0;o=e+284|0;p=e+300|0;q=e;r=e+276|0;s=e+296|0;t=c[h+4>>2]&74;if((t|0)==8){u=16}else if((t|0)==0){u=0}else if((t|0)==64){u=8}else{u=10}ih(n,h,l,m);c[o+0>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;Fe(o,10,0);if((a[o]&1)==0){h=o+1|0;v=h;w=o+8|0;x=h}else{h=o+8|0;v=o+1|0;w=h;x=c[h>>2]|0}c[p>>2]=x;c[r>>2]=q;c[s>>2]=0;h=o+4|0;t=c[m>>2]|0;m=c[f>>2]|0;y=x;a:while(1){if((m|0)!=0){x=c[m+12>>2]|0;if((x|0)==(c[m+16>>2]|0)){z=qc[c[(c[m>>2]|0)+36>>2]&127](m)|0}else{z=c[x>>2]|0}if((z|0)==-1){c[f>>2]=0;A=1;B=0}else{A=0;B=m}}else{A=1;B=0}x=c[g>>2]|0;do{if((x|0)!=0){C=c[x+12>>2]|0;if((C|0)==(c[x+16>>2]|0)){D=qc[c[(c[x>>2]|0)+36>>2]&127](x)|0}else{D=c[C>>2]|0}if(!((D|0)==-1)){if(A){E=x;break}else{F=x;G=y;break a}}else{c[g>>2]=0;H=21;break}}else{H=21}}while(0);if((H|0)==21){H=0;if(A){F=0;G=y;break}else{E=0}}x=a[o]|0;C=(x&1)==0;if(C){I=(x&255)>>>1}else{I=c[h>>2]|0}if(((c[p>>2]|0)-y|0)==(I|0)){if(C){J=(x&255)>>>1;K=(x&255)>>>1}else{x=c[h>>2]|0;J=x;K=x}Fe(o,J<<1,0);if((a[o]&1)==0){L=10}else{L=(c[o>>2]&-2)+ -1|0}Fe(o,L,0);if((a[o]&1)==0){M=v}else{M=c[w>>2]|0}c[p>>2]=M+K;N=M}else{N=y}x=B+12|0;C=c[x>>2]|0;O=B+16|0;if((C|0)==(c[O>>2]|0)){P=qc[c[(c[B>>2]|0)+36>>2]&127](B)|0}else{P=c[C>>2]|0}if((eh(P,u,N,p,s,t,n,q,r,l)|0)!=0){F=E;G=N;break}C=c[x>>2]|0;if((C|0)==(c[O>>2]|0)){qc[c[(c[B>>2]|0)+40>>2]&127](B)|0;m=B;y=N;continue}else{c[x>>2]=C+4;m=B;y=N;continue}}N=a[n]|0;if((N&1)==0){Q=(N&255)>>>1}else{Q=c[n+4>>2]|0}if((Q|0)!=0?(Q=c[r>>2]|0,(Q-q|0)<160):0){N=c[s>>2]|0;c[r>>2]=Q+4;c[Q>>2]=N}b[k>>1]=Yl(G,c[p>>2]|0,j,u)|0;rj(n,q,c[r>>2]|0,j);if((B|0)!=0){r=c[B+12>>2]|0;if((r|0)==(c[B+16>>2]|0)){R=qc[c[(c[B>>2]|0)+36>>2]&127](B)|0}else{R=c[r>>2]|0}if((R|0)==-1){c[f>>2]=0;S=0;T=1}else{S=B;T=0}}else{S=0;T=1}do{if((F|0)!=0){B=c[F+12>>2]|0;if((B|0)==(c[F+16>>2]|0)){U=qc[c[(c[F>>2]|0)+36>>2]&127](F)|0}else{U=c[B>>2]|0}if((U|0)==-1){c[g>>2]=0;H=60;break}if(T){c[d>>2]=S;De(o);De(n);i=e;return}}else{H=60}}while(0);if((H|0)==60?!T:0){c[d>>2]=S;De(o);De(n);i=e;return}c[j>>2]=c[j>>2]|2;c[d>>2]=S;De(o);De(n);i=e;return}function Tg(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;l=b+4|0;m=b;c[l>>2]=c[d>>2];c[m>>2]=c[e>>2];c[k+0>>2]=c[l+0>>2];c[j+0>>2]=c[m+0>>2];Ug(a,0,k,j,f,g,h);i=b;return}function Ug(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0;d=i;i=i+304|0;k=d+160|0;l=d+280|0;m=d+264|0;n=d+284|0;o=d+300|0;p=d;q=d+276|0;r=d+296|0;s=c[g+4>>2]&74;if((s|0)==0){t=0}else if((s|0)==8){t=16}else if((s|0)==64){t=8}else{t=10}ih(m,g,k,l);c[n+0>>2]=0;c[n+4>>2]=0;c[n+8>>2]=0;Fe(n,10,0);if((a[n]&1)==0){g=n+1|0;u=g;v=n+8|0;w=g}else{g=n+8|0;u=n+1|0;v=g;w=c[g>>2]|0}c[o>>2]=w;c[q>>2]=p;c[r>>2]=0;g=n+4|0;s=c[l>>2]|0;l=c[e>>2]|0;x=w;a:while(1){if((l|0)!=0){w=c[l+12>>2]|0;if((w|0)==(c[l+16>>2]|0)){y=qc[c[(c[l>>2]|0)+36>>2]&127](l)|0}else{y=c[w>>2]|0}if((y|0)==-1){c[e>>2]=0;z=1;A=0}else{z=0;A=l}}else{z=1;A=0}w=c[f>>2]|0;do{if((w|0)!=0){B=c[w+12>>2]|0;if((B|0)==(c[w+16>>2]|0)){C=qc[c[(c[w>>2]|0)+36>>2]&127](w)|0}else{C=c[B>>2]|0}if(!((C|0)==-1)){if(z){D=w;break}else{E=w;F=x;break a}}else{c[f>>2]=0;G=21;break}}else{G=21}}while(0);if((G|0)==21){G=0;if(z){E=0;F=x;break}else{D=0}}w=a[n]|0;B=(w&1)==0;if(B){H=(w&255)>>>1}else{H=c[g>>2]|0}if(((c[o>>2]|0)-x|0)==(H|0)){if(B){I=(w&255)>>>1;J=(w&255)>>>1}else{w=c[g>>2]|0;I=w;J=w}Fe(n,I<<1,0);if((a[n]&1)==0){K=10}else{K=(c[n>>2]&-2)+ -1|0}Fe(n,K,0);if((a[n]&1)==0){L=u}else{L=c[v>>2]|0}c[o>>2]=L+J;M=L}else{M=x}w=A+12|0;B=c[w>>2]|0;N=A+16|0;if((B|0)==(c[N>>2]|0)){O=qc[c[(c[A>>2]|0)+36>>2]&127](A)|0}else{O=c[B>>2]|0}if((eh(O,t,M,o,r,s,m,p,q,k)|0)!=0){E=D;F=M;break}B=c[w>>2]|0;if((B|0)==(c[N>>2]|0)){qc[c[(c[A>>2]|0)+40>>2]&127](A)|0;l=A;x=M;continue}else{c[w>>2]=B+4;l=A;x=M;continue}}M=a[m]|0;if((M&1)==0){P=(M&255)>>>1}else{P=c[m+4>>2]|0}if((P|0)!=0?(P=c[q>>2]|0,(P-p|0)<160):0){M=c[r>>2]|0;c[q>>2]=P+4;c[P>>2]=M}c[j>>2]=Xl(F,c[o>>2]|0,h,t)|0;rj(m,p,c[q>>2]|0,h);if((A|0)!=0){q=c[A+12>>2]|0;if((q|0)==(c[A+16>>2]|0)){Q=qc[c[(c[A>>2]|0)+36>>2]&127](A)|0}else{Q=c[q>>2]|0}if((Q|0)==-1){c[e>>2]=0;R=0;S=1}else{R=A;S=0}}else{R=0;S=1}do{if((E|0)!=0){A=c[E+12>>2]|0;if((A|0)==(c[E+16>>2]|0)){T=qc[c[(c[E>>2]|0)+36>>2]&127](E)|0}else{T=c[A>>2]|0}if((T|0)==-1){c[f>>2]=0;G=60;break}if(S){c[b>>2]=R;De(n);De(m);i=d;return}}else{G=60}}while(0);if((G|0)==60?!S:0){c[b>>2]=R;De(n);De(m);i=d;return}c[h>>2]=c[h>>2]|2;c[b>>2]=R;De(n);De(m);i=d;return}function Vg(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;l=b+4|0;m=b;c[l>>2]=c[d>>2];c[m>>2]=c[e>>2];c[k+0>>2]=c[l+0>>2];c[j+0>>2]=c[m+0>>2];Wg(a,0,k,j,f,g,h);i=b;return}function Wg(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0;d=i;i=i+304|0;k=d+160|0;l=d+280|0;m=d+264|0;n=d+284|0;o=d+300|0;p=d;q=d+276|0;r=d+296|0;s=c[g+4>>2]&74;if((s|0)==8){t=16}else if((s|0)==0){t=0}else if((s|0)==64){t=8}else{t=10}ih(m,g,k,l);c[n+0>>2]=0;c[n+4>>2]=0;c[n+8>>2]=0;Fe(n,10,0);if((a[n]&1)==0){g=n+1|0;u=g;v=n+8|0;w=g}else{g=n+8|0;u=n+1|0;v=g;w=c[g>>2]|0}c[o>>2]=w;c[q>>2]=p;c[r>>2]=0;g=n+4|0;s=c[l>>2]|0;l=c[e>>2]|0;x=w;a:while(1){if((l|0)!=0){w=c[l+12>>2]|0;if((w|0)==(c[l+16>>2]|0)){y=qc[c[(c[l>>2]|0)+36>>2]&127](l)|0}else{y=c[w>>2]|0}if((y|0)==-1){c[e>>2]=0;z=1;A=0}else{z=0;A=l}}else{z=1;A=0}w=c[f>>2]|0;do{if((w|0)!=0){B=c[w+12>>2]|0;if((B|0)==(c[w+16>>2]|0)){C=qc[c[(c[w>>2]|0)+36>>2]&127](w)|0}else{C=c[B>>2]|0}if(!((C|0)==-1)){if(z){D=w;break}else{E=w;F=x;break a}}else{c[f>>2]=0;G=21;break}}else{G=21}}while(0);if((G|0)==21){G=0;if(z){E=0;F=x;break}else{D=0}}w=a[n]|0;B=(w&1)==0;if(B){H=(w&255)>>>1}else{H=c[g>>2]|0}if(((c[o>>2]|0)-x|0)==(H|0)){if(B){I=(w&255)>>>1;J=(w&255)>>>1}else{w=c[g>>2]|0;I=w;J=w}Fe(n,I<<1,0);if((a[n]&1)==0){K=10}else{K=(c[n>>2]&-2)+ -1|0}Fe(n,K,0);if((a[n]&1)==0){L=u}else{L=c[v>>2]|0}c[o>>2]=L+J;M=L}else{M=x}w=A+12|0;B=c[w>>2]|0;N=A+16|0;if((B|0)==(c[N>>2]|0)){O=qc[c[(c[A>>2]|0)+36>>2]&127](A)|0}else{O=c[B>>2]|0}if((eh(O,t,M,o,r,s,m,p,q,k)|0)!=0){E=D;F=M;break}B=c[w>>2]|0;if((B|0)==(c[N>>2]|0)){qc[c[(c[A>>2]|0)+40>>2]&127](A)|0;l=A;x=M;continue}else{c[w>>2]=B+4;l=A;x=M;continue}}M=a[m]|0;if((M&1)==0){P=(M&255)>>>1}else{P=c[m+4>>2]|0}if((P|0)!=0?(P=c[q>>2]|0,(P-p|0)<160):0){M=c[r>>2]|0;c[q>>2]=P+4;c[P>>2]=M}c[j>>2]=Wl(F,c[o>>2]|0,h,t)|0;rj(m,p,c[q>>2]|0,h);if((A|0)!=0){q=c[A+12>>2]|0;if((q|0)==(c[A+16>>2]|0)){Q=qc[c[(c[A>>2]|0)+36>>2]&127](A)|0}else{Q=c[q>>2]|0}if((Q|0)==-1){c[e>>2]=0;R=0;S=1}else{R=A;S=0}}else{R=0;S=1}do{if((E|0)!=0){A=c[E+12>>2]|0;if((A|0)==(c[E+16>>2]|0)){T=qc[c[(c[E>>2]|0)+36>>2]&127](E)|0}else{T=c[A>>2]|0}if((T|0)==-1){c[f>>2]=0;G=60;break}if(S){c[b>>2]=R;De(n);De(m);i=d;return}}else{G=60}}while(0);if((G|0)==60?!S:0){c[b>>2]=R;De(n);De(m);i=d;return}c[h>>2]=c[h>>2]|2;c[b>>2]=R;De(n);De(m);i=d;return}function Xg(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;l=b+4|0;m=b;c[l>>2]=c[d>>2];c[m>>2]=c[e>>2];c[k+0>>2]=c[l+0>>2];c[j+0>>2]=c[m+0>>2];Yg(a,0,k,j,f,g,h);i=b;return}function Yg(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0;d=i;i=i+304|0;k=d+160|0;l=d+280|0;m=d+264|0;n=d+284|0;o=d+300|0;p=d;q=d+276|0;r=d+296|0;s=c[g+4>>2]&74;if((s|0)==0){t=0}else if((s|0)==8){t=16}else if((s|0)==64){t=8}else{t=10}ih(m,g,k,l);c[n+0>>2]=0;c[n+4>>2]=0;c[n+8>>2]=0;Fe(n,10,0);if((a[n]&1)==0){g=n+1|0;u=g;v=n+8|0;w=g}else{g=n+8|0;u=n+1|0;v=g;w=c[g>>2]|0}c[o>>2]=w;c[q>>2]=p;c[r>>2]=0;g=n+4|0;s=c[l>>2]|0;l=c[e>>2]|0;x=w;a:while(1){if((l|0)!=0){w=c[l+12>>2]|0;if((w|0)==(c[l+16>>2]|0)){y=qc[c[(c[l>>2]|0)+36>>2]&127](l)|0}else{y=c[w>>2]|0}if((y|0)==-1){c[e>>2]=0;z=1;A=0}else{z=0;A=l}}else{z=1;A=0}w=c[f>>2]|0;do{if((w|0)!=0){B=c[w+12>>2]|0;if((B|0)==(c[w+16>>2]|0)){C=qc[c[(c[w>>2]|0)+36>>2]&127](w)|0}else{C=c[B>>2]|0}if(!((C|0)==-1)){if(z){D=w;break}else{E=w;F=x;break a}}else{c[f>>2]=0;G=21;break}}else{G=21}}while(0);if((G|0)==21){G=0;if(z){E=0;F=x;break}else{D=0}}w=a[n]|0;B=(w&1)==0;if(B){H=(w&255)>>>1}else{H=c[g>>2]|0}if(((c[o>>2]|0)-x|0)==(H|0)){if(B){J=(w&255)>>>1;K=(w&255)>>>1}else{w=c[g>>2]|0;J=w;K=w}Fe(n,J<<1,0);if((a[n]&1)==0){L=10}else{L=(c[n>>2]&-2)+ -1|0}Fe(n,L,0);if((a[n]&1)==0){M=u}else{M=c[v>>2]|0}c[o>>2]=M+K;N=M}else{N=x}w=A+12|0;B=c[w>>2]|0;O=A+16|0;if((B|0)==(c[O>>2]|0)){P=qc[c[(c[A>>2]|0)+36>>2]&127](A)|0}else{P=c[B>>2]|0}if((eh(P,t,N,o,r,s,m,p,q,k)|0)!=0){E=D;F=N;break}B=c[w>>2]|0;if((B|0)==(c[O>>2]|0)){qc[c[(c[A>>2]|0)+40>>2]&127](A)|0;l=A;x=N;continue}else{c[w>>2]=B+4;l=A;x=N;continue}}N=a[m]|0;if((N&1)==0){Q=(N&255)>>>1}else{Q=c[m+4>>2]|0}if((Q|0)!=0?(Q=c[q>>2]|0,(Q-p|0)<160):0){N=c[r>>2]|0;c[q>>2]=Q+4;c[Q>>2]=N}N=Vl(F,c[o>>2]|0,h,t)|0;t=j;c[t>>2]=N;c[t+4>>2]=I;rj(m,p,c[q>>2]|0,h);if((A|0)!=0){q=c[A+12>>2]|0;if((q|0)==(c[A+16>>2]|0)){R=qc[c[(c[A>>2]|0)+36>>2]&127](A)|0}else{R=c[q>>2]|0}if((R|0)==-1){c[e>>2]=0;S=0;T=1}else{S=A;T=0}}else{S=0;T=1}do{if((E|0)!=0){A=c[E+12>>2]|0;if((A|0)==(c[E+16>>2]|0)){U=qc[c[(c[E>>2]|0)+36>>2]&127](E)|0}else{U=c[A>>2]|0}if((U|0)==-1){c[f>>2]=0;G=60;break}if(T){c[b>>2]=S;De(n);De(m);i=d;return}}else{G=60}}while(0);if((G|0)==60?!T:0){c[b>>2]=S;De(n);De(m);i=d;return}c[h>>2]=c[h>>2]|2;c[b>>2]=S;De(n);De(m);i=d;return}function Zg(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;l=b+4|0;m=b;c[l>>2]=c[d>>2];c[m>>2]=c[e>>2];c[k+0>>2]=c[l+0>>2];c[j+0>>2]=c[m+0>>2];_g(a,0,k,j,f,g,h);i=b;return}function _g(b,d,e,f,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0;d=i;i=i+352|0;l=d+208|0;m=d+184|0;n=d+4|0;o=d+8|0;p=d+196|0;q=d;r=d+24|0;s=d+192|0;t=d+188|0;u=d+337|0;v=d+336|0;jh(o,h,l,m,n);c[p+0>>2]=0;c[p+4>>2]=0;c[p+8>>2]=0;Fe(p,10,0);if((a[p]&1)==0){h=p+1|0;w=h;x=p+8|0;y=h}else{h=p+8|0;w=p+1|0;x=h;y=c[h>>2]|0}c[q>>2]=y;c[s>>2]=r;c[t>>2]=0;a[u]=1;a[v]=69;h=p+4|0;z=c[m>>2]|0;m=c[n>>2]|0;n=c[e>>2]|0;A=y;a:while(1){if((n|0)!=0){y=c[n+12>>2]|0;if((y|0)==(c[n+16>>2]|0)){B=qc[c[(c[n>>2]|0)+36>>2]&127](n)|0}else{B=c[y>>2]|0}if((B|0)==-1){c[e>>2]=0;C=1;D=0}else{C=0;D=n}}else{C=1;D=0}y=c[f>>2]|0;do{if((y|0)!=0){E=c[y+12>>2]|0;if((E|0)==(c[y+16>>2]|0)){F=qc[c[(c[y>>2]|0)+36>>2]&127](y)|0}else{F=c[E>>2]|0}if(!((F|0)==-1)){if(C){G=y;break}else{H=y;I=A;break a}}else{c[f>>2]=0;J=17;break}}else{J=17}}while(0);if((J|0)==17){J=0;if(C){H=0;I=A;break}else{G=0}}y=a[p]|0;E=(y&1)==0;if(E){K=(y&255)>>>1}else{K=c[h>>2]|0}if(((c[q>>2]|0)-A|0)==(K|0)){if(E){L=(y&255)>>>1;M=(y&255)>>>1}else{y=c[h>>2]|0;L=y;M=y}Fe(p,L<<1,0);if((a[p]&1)==0){N=10}else{N=(c[p>>2]&-2)+ -1|0}Fe(p,N,0);if((a[p]&1)==0){O=w}else{O=c[x>>2]|0}c[q>>2]=O+M;P=O}else{P=A}y=D+12|0;E=c[y>>2]|0;Q=D+16|0;if((E|0)==(c[Q>>2]|0)){R=qc[c[(c[D>>2]|0)+36>>2]&127](D)|0}else{R=c[E>>2]|0}if((kh(R,u,v,P,q,z,m,o,r,s,t,l)|0)!=0){H=G;I=P;break}E=c[y>>2]|0;if((E|0)==(c[Q>>2]|0)){qc[c[(c[D>>2]|0)+40>>2]&127](D)|0;n=D;A=P;continue}else{c[y>>2]=E+4;n=D;A=P;continue}}P=a[o]|0;if((P&1)==0){S=(P&255)>>>1}else{S=c[o+4>>2]|0}if(((S|0)!=0?(a[u]|0)!=0:0)?(u=c[s>>2]|0,(u-r|0)<160):0){S=c[t>>2]|0;c[s>>2]=u+4;c[u>>2]=S}g[k>>2]=+Ul(I,c[q>>2]|0,j);rj(o,r,c[s>>2]|0,j);if((D|0)!=0){s=c[D+12>>2]|0;if((s|0)==(c[D+16>>2]|0)){T=qc[c[(c[D>>2]|0)+36>>2]&127](D)|0}else{T=c[s>>2]|0}if((T|0)==-1){c[e>>2]=0;U=0;V=1}else{U=D;V=0}}else{U=0;V=1}do{if((H|0)!=0){D=c[H+12>>2]|0;if((D|0)==(c[H+16>>2]|0)){W=qc[c[(c[H>>2]|0)+36>>2]&127](H)|0}else{W=c[D>>2]|0}if((W|0)==-1){c[f>>2]=0;J=57;break}if(V){c[b>>2]=U;De(p);De(o);i=d;return}}else{J=57}}while(0);if((J|0)==57?!V:0){c[b>>2]=U;De(p);De(o);i=d;return}c[j>>2]=c[j>>2]|2;c[b>>2]=U;De(p);De(o);i=d;return}function $g(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;l=b+4|0;m=b;c[l>>2]=c[d>>2];c[m>>2]=c[e>>2];c[k+0>>2]=c[l+0>>2];c[j+0>>2]=c[m+0>>2];ah(a,0,k,j,f,g,h);i=b;return}function ah(b,d,e,f,g,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0;d=i;i=i+352|0;l=d+208|0;m=d+184|0;n=d+4|0;o=d+8|0;p=d+196|0;q=d;r=d+24|0;s=d+192|0;t=d+188|0;u=d+337|0;v=d+336|0;jh(o,g,l,m,n);c[p+0>>2]=0;c[p+4>>2]=0;c[p+8>>2]=0;Fe(p,10,0);if((a[p]&1)==0){g=p+1|0;w=g;x=p+8|0;y=g}else{g=p+8|0;w=p+1|0;x=g;y=c[g>>2]|0}c[q>>2]=y;c[s>>2]=r;c[t>>2]=0;a[u]=1;a[v]=69;g=p+4|0;z=c[m>>2]|0;m=c[n>>2]|0;n=c[e>>2]|0;A=y;a:while(1){if((n|0)!=0){y=c[n+12>>2]|0;if((y|0)==(c[n+16>>2]|0)){B=qc[c[(c[n>>2]|0)+36>>2]&127](n)|0}else{B=c[y>>2]|0}if((B|0)==-1){c[e>>2]=0;C=1;D=0}else{C=0;D=n}}else{C=1;D=0}y=c[f>>2]|0;do{if((y|0)!=0){E=c[y+12>>2]|0;if((E|0)==(c[y+16>>2]|0)){F=qc[c[(c[y>>2]|0)+36>>2]&127](y)|0}else{F=c[E>>2]|0}if(!((F|0)==-1)){if(C){G=y;break}else{H=y;I=A;break a}}else{c[f>>2]=0;J=17;break}}else{J=17}}while(0);if((J|0)==17){J=0;if(C){H=0;I=A;break}else{G=0}}y=a[p]|0;E=(y&1)==0;if(E){K=(y&255)>>>1}else{K=c[g>>2]|0}if(((c[q>>2]|0)-A|0)==(K|0)){if(E){L=(y&255)>>>1;M=(y&255)>>>1}else{y=c[g>>2]|0;L=y;M=y}Fe(p,L<<1,0);if((a[p]&1)==0){N=10}else{N=(c[p>>2]&-2)+ -1|0}Fe(p,N,0);if((a[p]&1)==0){O=w}else{O=c[x>>2]|0}c[q>>2]=O+M;P=O}else{P=A}y=D+12|0;E=c[y>>2]|0;Q=D+16|0;if((E|0)==(c[Q>>2]|0)){R=qc[c[(c[D>>2]|0)+36>>2]&127](D)|0}else{R=c[E>>2]|0}if((kh(R,u,v,P,q,z,m,o,r,s,t,l)|0)!=0){H=G;I=P;break}E=c[y>>2]|0;if((E|0)==(c[Q>>2]|0)){qc[c[(c[D>>2]|0)+40>>2]&127](D)|0;n=D;A=P;continue}else{c[y>>2]=E+4;n=D;A=P;continue}}P=a[o]|0;if((P&1)==0){S=(P&255)>>>1}else{S=c[o+4>>2]|0}if(((S|0)!=0?(a[u]|0)!=0:0)?(u=c[s>>2]|0,(u-r|0)<160):0){S=c[t>>2]|0;c[s>>2]=u+4;c[u>>2]=S}h[k>>3]=+Tl(I,c[q>>2]|0,j);rj(o,r,c[s>>2]|0,j);if((D|0)!=0){s=c[D+12>>2]|0;if((s|0)==(c[D+16>>2]|0)){T=qc[c[(c[D>>2]|0)+36>>2]&127](D)|0}else{T=c[s>>2]|0}if((T|0)==-1){c[e>>2]=0;U=0;V=1}else{U=D;V=0}}else{U=0;V=1}do{if((H|0)!=0){D=c[H+12>>2]|0;if((D|0)==(c[H+16>>2]|0)){W=qc[c[(c[H>>2]|0)+36>>2]&127](H)|0}else{W=c[D>>2]|0}if((W|0)==-1){c[f>>2]=0;J=57;break}if(V){c[b>>2]=U;De(p);De(o);i=d;return}}else{J=57}}while(0);if((J|0)==57?!V:0){c[b>>2]=U;De(p);De(o);i=d;return}c[j>>2]=c[j>>2]|2;c[b>>2]=U;De(p);De(o);i=d;return}function bh(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;l=b+4|0;m=b;c[l>>2]=c[d>>2];c[m>>2]=c[e>>2];c[k+0>>2]=c[l+0>>2];c[j+0>>2]=c[m+0>>2];ch(a,0,k,j,f,g,h);i=b;return}function ch(b,d,e,f,g,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0;d=i;i=i+352|0;l=d+208|0;m=d+184|0;n=d+4|0;o=d+8|0;p=d+196|0;q=d;r=d+24|0;s=d+192|0;t=d+188|0;u=d+337|0;v=d+336|0;jh(o,g,l,m,n);c[p+0>>2]=0;c[p+4>>2]=0;c[p+8>>2]=0;Fe(p,10,0);if((a[p]&1)==0){g=p+1|0;w=g;x=p+8|0;y=g}else{g=p+8|0;w=p+1|0;x=g;y=c[g>>2]|0}c[q>>2]=y;c[s>>2]=r;c[t>>2]=0;a[u]=1;a[v]=69;g=p+4|0;z=c[m>>2]|0;m=c[n>>2]|0;n=c[e>>2]|0;A=y;a:while(1){if((n|0)!=0){y=c[n+12>>2]|0;if((y|0)==(c[n+16>>2]|0)){B=qc[c[(c[n>>2]|0)+36>>2]&127](n)|0}else{B=c[y>>2]|0}if((B|0)==-1){c[e>>2]=0;C=1;D=0}else{C=0;D=n}}else{C=1;D=0}y=c[f>>2]|0;do{if((y|0)!=0){E=c[y+12>>2]|0;if((E|0)==(c[y+16>>2]|0)){F=qc[c[(c[y>>2]|0)+36>>2]&127](y)|0}else{F=c[E>>2]|0}if(!((F|0)==-1)){if(C){G=y;break}else{H=y;I=A;break a}}else{c[f>>2]=0;J=17;break}}else{J=17}}while(0);if((J|0)==17){J=0;if(C){H=0;I=A;break}else{G=0}}y=a[p]|0;E=(y&1)==0;if(E){K=(y&255)>>>1}else{K=c[g>>2]|0}if(((c[q>>2]|0)-A|0)==(K|0)){if(E){L=(y&255)>>>1;M=(y&255)>>>1}else{y=c[g>>2]|0;L=y;M=y}Fe(p,L<<1,0);if((a[p]&1)==0){N=10}else{N=(c[p>>2]&-2)+ -1|0}Fe(p,N,0);if((a[p]&1)==0){O=w}else{O=c[x>>2]|0}c[q>>2]=O+M;P=O}else{P=A}y=D+12|0;E=c[y>>2]|0;Q=D+16|0;if((E|0)==(c[Q>>2]|0)){R=qc[c[(c[D>>2]|0)+36>>2]&127](D)|0}else{R=c[E>>2]|0}if((kh(R,u,v,P,q,z,m,o,r,s,t,l)|0)!=0){H=G;I=P;break}E=c[y>>2]|0;if((E|0)==(c[Q>>2]|0)){qc[c[(c[D>>2]|0)+40>>2]&127](D)|0;n=D;A=P;continue}else{c[y>>2]=E+4;n=D;A=P;continue}}P=a[o]|0;if((P&1)==0){S=(P&255)>>>1}else{S=c[o+4>>2]|0}if(((S|0)!=0?(a[u]|0)!=0:0)?(u=c[s>>2]|0,(u-r|0)<160):0){S=c[t>>2]|0;c[s>>2]=u+4;c[u>>2]=S}h[k>>3]=+Sl(I,c[q>>2]|0,j);rj(o,r,c[s>>2]|0,j);if((D|0)!=0){s=c[D+12>>2]|0;if((s|0)==(c[D+16>>2]|0)){T=qc[c[(c[D>>2]|0)+36>>2]&127](D)|0}else{T=c[s>>2]|0}if((T|0)==-1){c[e>>2]=0;U=0;V=1}else{U=D;V=0}}else{U=0;V=1}do{if((H|0)!=0){D=c[H+12>>2]|0;if((D|0)==(c[H+16>>2]|0)){W=qc[c[(c[H>>2]|0)+36>>2]&127](H)|0}else{W=c[D>>2]|0}if((W|0)==-1){c[f>>2]=0;J=57;break}if(V){c[b>>2]=U;De(p);De(o);i=d;return}}else{J=57}}while(0);if((J|0)==57?!V:0){c[b>>2]=U;De(p);De(o);i=d;return}c[j>>2]=c[j>>2]|2;c[b>>2]=U;De(p);De(o);i=d;return}function dh(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0;d=i;i=i+320|0;k=d;l=d+208|0;m=d+192|0;n=d+188|0;o=d+176|0;p=d+16|0;c[m+0>>2]=0;c[m+4>>2]=0;c[m+8>>2]=0;Xe(n,g);g=c[n>>2]|0;if(!((c[1682]|0)==-1)){c[k>>2]=6728;c[k+4>>2]=117;c[k+8>>2]=0;ye(6728,k,118)}q=(c[6732>>2]|0)+ -1|0;r=c[g+8>>2]|0;if(!((c[g+12>>2]|0)-r>>2>>>0>q>>>0)){s=Ya(4)|0;um(s);zb(s|0,14696,106)}g=c[r+(q<<2)>>2]|0;if((g|0)==0){s=Ya(4)|0;um(s);zb(s|0,14696,106)}wc[c[(c[g>>2]|0)+48>>2]&7](g,5280,5306|0,l)|0;ee(c[n>>2]|0)|0;c[o+0>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;Fe(o,10,0);if((a[o]&1)==0){n=o+1|0;t=n;u=o+8|0;v=n}else{n=o+8|0;t=o+1|0;u=n;v=c[n>>2]|0}n=o+4|0;g=l+96|0;s=l+100|0;q=p;r=l+104|0;w=l;x=m+4|0;y=c[e>>2]|0;z=p;p=0;A=v;B=v;a:while(1){if((y|0)!=0){v=c[y+12>>2]|0;if((v|0)==(c[y+16>>2]|0)){C=qc[c[(c[y>>2]|0)+36>>2]&127](y)|0}else{C=c[v>>2]|0}if((C|0)==-1){c[e>>2]=0;D=1;E=0}else{D=0;E=y}}else{D=1;E=0}v=c[f>>2]|0;do{if((v|0)!=0){F=c[v+12>>2]|0;if((F|0)==(c[v+16>>2]|0)){G=qc[c[(c[v>>2]|0)+36>>2]&127](v)|0}else{G=c[F>>2]|0}if(!((G|0)==-1)){if(D){break}else{H=B;break a}}else{c[f>>2]=0;I=22;break}}else{I=22}}while(0);if((I|0)==22?(I=0,D):0){H=B;break}v=a[o]|0;F=(v&1)==0;if(F){J=(v&255)>>>1}else{J=c[n>>2]|0}if((A-B|0)==(J|0)){if(F){K=(v&255)>>>1;L=(v&255)>>>1}else{v=c[n>>2]|0;K=v;L=v}Fe(o,K<<1,0);if((a[o]&1)==0){M=10}else{M=(c[o>>2]&-2)+ -1|0}Fe(o,M,0);if((a[o]&1)==0){N=t}else{N=c[u>>2]|0}O=N+L|0;P=N}else{O=A;P=B}v=c[E+12>>2]|0;if((v|0)==(c[E+16>>2]|0)){Q=qc[c[(c[E>>2]|0)+36>>2]&127](E)|0}else{Q=c[v>>2]|0}v=(O|0)==(P|0);do{if(v){F=(c[g>>2]|0)==(Q|0);if(!F?(c[s>>2]|0)!=(Q|0):0){I=43;break}a[O]=F?43:45;R=O+1|0;S=z;T=0}else{I=43}}while(0);do{if((I|0)==43){I=0;F=a[m]|0;if((F&1)==0){U=(F&255)>>>1}else{U=c[x>>2]|0}if((U|0)!=0&(Q|0)==0){if((z-q|0)>=160){R=O;S=z;T=p;break}c[z>>2]=p;R=O;S=z+4|0;T=0;break}else{V=l}while(1){F=V+4|0;if((c[V>>2]|0)==(Q|0)){W=V;break}if((F|0)==(r|0)){W=r;break}else{V=F}}F=W-w|0;X=F>>2;if((F|0)>92){H=P;break a}if((F|0)<88){a[O]=a[5280+X|0]|0;R=O+1|0;S=z;T=p+1|0;break}if(v){H=O;break a}if((O-P|0)>=3){H=P;break a}if((a[O+ -1|0]|0)!=48){H=P;break a}a[O]=a[5280+X|0]|0;R=O+1|0;S=z;T=0}}while(0);v=c[e>>2]|0;X=v+12|0;F=c[X>>2]|0;if((F|0)==(c[v+16>>2]|0)){qc[c[(c[v>>2]|0)+40>>2]&127](v)|0;y=v;z=S;p=T;A=R;B=P;continue}else{c[X>>2]=F+4;y=v;z=S;p=T;A=R;B=P;continue}}a[H+3|0]=0;if((a[6632]|0)==0?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}P=c[1656]|0;c[k>>2]=j;if((Ig(H,P,5320,k)|0)!=1){c[h>>2]=4}k=c[e>>2]|0;if((k|0)!=0){P=c[k+12>>2]|0;if((P|0)==(c[k+16>>2]|0)){Y=qc[c[(c[k>>2]|0)+36>>2]&127](k)|0}else{Y=c[P>>2]|0}if((Y|0)==-1){c[e>>2]=0;Z=0;_=1}else{Z=k;_=0}}else{Z=0;_=1}k=c[f>>2]|0;do{if((k|0)!=0){e=c[k+12>>2]|0;if((e|0)==(c[k+16>>2]|0)){$=qc[c[(c[k>>2]|0)+36>>2]&127](k)|0}else{$=c[e>>2]|0}if(($|0)==-1){c[f>>2]=0;I=78;break}if(_){c[b>>2]=Z;De(o);De(m);i=d;return}}else{I=78}}while(0);if((I|0)==78?!_:0){c[b>>2]=Z;De(o);De(m);i=d;return}c[h>>2]=c[h>>2]|2;c[b>>2]=Z;De(o);De(m);i=d;return}function eh(b,d,e,f,g,h,j,k,l,m){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0;n=i;o=c[f>>2]|0;p=(o|0)==(e|0);do{if(p){q=(c[m+96>>2]|0)==(b|0);if(!q?(c[m+100>>2]|0)!=(b|0):0){break}c[f>>2]=e+1;a[e]=q?43:45;c[g>>2]=0;r=0;i=n;return r|0}}while(0);q=a[j]|0;if((q&1)==0){s=(q&255)>>>1}else{s=c[j+4>>2]|0}if((s|0)!=0&(b|0)==(h|0)){h=c[l>>2]|0;if((h-k|0)>=160){r=0;i=n;return r|0}k=c[g>>2]|0;c[l>>2]=h+4;c[h>>2]=k;c[g>>2]=0;r=0;i=n;return r|0}k=m+104|0;h=m;while(1){l=h+4|0;if((c[h>>2]|0)==(b|0)){t=h;break}if((l|0)==(k|0)){t=k;break}else{h=l}}h=t-m|0;m=h>>2;if((h|0)>92){r=-1;i=n;return r|0}if((d|0)==16){if((h|0)>=88){if(p){r=-1;i=n;return r|0}if((o-e|0)>=3){r=-1;i=n;return r|0}if((a[o+ -1|0]|0)!=48){r=-1;i=n;return r|0}c[g>>2]=0;e=a[5280+m|0]|0;c[f>>2]=o+1;a[o]=e;r=0;i=n;return r|0}}else if((d|0)==10|(d|0)==8?(m|0)>=(d|0):0){r=-1;i=n;return r|0}d=a[5280+m|0]|0;c[f>>2]=o+1;a[o]=d;c[g>>2]=(c[g>>2]|0)+1;r=0;i=n;return r|0}function fh(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0;g=i;i=i+16|0;h=g;j=g+12|0;Xe(j,d);d=c[j>>2]|0;if(!((c[1684]|0)==-1)){c[h>>2]=6736;c[h+4>>2]=117;c[h+8>>2]=0;ye(6736,h,118)}k=(c[6740>>2]|0)+ -1|0;l=c[d+8>>2]|0;if(!((c[d+12>>2]|0)-l>>2>>>0>k>>>0)){m=Ya(4)|0;um(m);zb(m|0,14696,106)}d=c[l+(k<<2)>>2]|0;if((d|0)==0){m=Ya(4)|0;um(m);zb(m|0,14696,106)}wc[c[(c[d>>2]|0)+32>>2]&7](d,5280,5306|0,e)|0;e=c[j>>2]|0;if(!((c[1720]|0)==-1)){c[h>>2]=6880;c[h+4>>2]=117;c[h+8>>2]=0;ye(6880,h,118)}h=(c[6884>>2]|0)+ -1|0;d=c[e+8>>2]|0;if(!((c[e+12>>2]|0)-d>>2>>>0>h>>>0)){n=Ya(4)|0;um(n);zb(n|0,14696,106)}e=c[d+(h<<2)>>2]|0;if((e|0)==0){n=Ya(4)|0;um(n);zb(n|0,14696,106)}else{a[f]=qc[c[(c[e>>2]|0)+16>>2]&127](e)|0;oc[c[(c[e>>2]|0)+20>>2]&63](b,e);ee(c[j>>2]|0)|0;i=g;return}}function gh(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0;h=i;i=i+16|0;j=h;k=h+12|0;Xe(k,d);d=c[k>>2]|0;if(!((c[1684]|0)==-1)){c[j>>2]=6736;c[j+4>>2]=117;c[j+8>>2]=0;ye(6736,j,118)}l=(c[6740>>2]|0)+ -1|0;m=c[d+8>>2]|0;if(!((c[d+12>>2]|0)-m>>2>>>0>l>>>0)){n=Ya(4)|0;um(n);zb(n|0,14696,106)}d=c[m+(l<<2)>>2]|0;if((d|0)==0){n=Ya(4)|0;um(n);zb(n|0,14696,106)}wc[c[(c[d>>2]|0)+32>>2]&7](d,5280,5312|0,e)|0;e=c[k>>2]|0;if(!((c[1720]|0)==-1)){c[j>>2]=6880;c[j+4>>2]=117;c[j+8>>2]=0;ye(6880,j,118)}j=(c[6884>>2]|0)+ -1|0;d=c[e+8>>2]|0;if(!((c[e+12>>2]|0)-d>>2>>>0>j>>>0)){o=Ya(4)|0;um(o);zb(o|0,14696,106)}e=c[d+(j<<2)>>2]|0;if((e|0)==0){o=Ya(4)|0;um(o);zb(o|0,14696,106)}else{a[f]=qc[c[(c[e>>2]|0)+12>>2]&127](e)|0;a[g]=qc[c[(c[e>>2]|0)+16>>2]&127](e)|0;oc[c[(c[e>>2]|0)+20>>2]&63](b,e);ee(c[k>>2]|0)|0;i=h;return}}function hh(b,d,e,f,g,h,j,k,l,m,n,o){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;var p=0,q=0,r=0,s=0,t=0,u=0;p=i;if(b<<24>>24==h<<24>>24){if((a[d]|0)==0){q=-1;i=p;return q|0}a[d]=0;h=c[g>>2]|0;c[g>>2]=h+1;a[h]=46;h=a[k]|0;if((h&1)==0){r=(h&255)>>>1}else{r=c[k+4>>2]|0}if((r|0)==0){q=0;i=p;return q|0}r=c[m>>2]|0;if((r-l|0)>=160){q=0;i=p;return q|0}h=c[n>>2]|0;c[m>>2]=r+4;c[r>>2]=h;q=0;i=p;return q|0}if(b<<24>>24==j<<24>>24){j=a[k]|0;if((j&1)==0){s=(j&255)>>>1}else{s=c[k+4>>2]|0}if((s|0)!=0){if((a[d]|0)==0){q=-1;i=p;return q|0}s=c[m>>2]|0;if((s-l|0)>=160){q=0;i=p;return q|0}j=c[n>>2]|0;c[m>>2]=s+4;c[s>>2]=j;c[n>>2]=0;q=0;i=p;return q|0}}j=o+32|0;s=o;while(1){h=s+1|0;if((a[s]|0)==b<<24>>24){t=s;break}if((h|0)==(j|0)){t=j;break}else{s=h}}s=t-o|0;if((s|0)>31){q=-1;i=p;return q|0}o=a[5280+s|0]|0;if((s|0)==24|(s|0)==25){t=c[g>>2]|0;if((t|0)!=(f|0)?(a[t+ -1|0]&95|0)!=(a[e]&127|0):0){q=-1;i=p;return q|0}c[g>>2]=t+1;a[t]=o;q=0;i=p;return q|0}else if((s|0)==23|(s|0)==22){a[e]=80;t=c[g>>2]|0;c[g>>2]=t+1;a[t]=o;q=0;i=p;return q|0}else{t=o&95;if((t|0)==(a[e]|0)?(a[e]=t|128,(a[d]|0)!=0):0){a[d]=0;d=a[k]|0;if((d&1)==0){u=(d&255)>>>1}else{u=c[k+4>>2]|0}if((u|0)!=0?(u=c[m>>2]|0,(u-l|0)<160):0){l=c[n>>2]|0;c[m>>2]=u+4;c[u>>2]=l}}l=c[g>>2]|0;c[g>>2]=l+1;a[l]=o;if((s|0)>21){q=0;i=p;return q|0}c[n>>2]=(c[n>>2]|0)+1;q=0;i=p;return q|0}return 0}function ih(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0;f=i;i=i+16|0;g=f;h=f+12|0;Xe(h,b);b=c[h>>2]|0;if(!((c[1682]|0)==-1)){c[g>>2]=6728;c[g+4>>2]=117;c[g+8>>2]=0;ye(6728,g,118)}j=(c[6732>>2]|0)+ -1|0;k=c[b+8>>2]|0;if(!((c[b+12>>2]|0)-k>>2>>>0>j>>>0)){l=Ya(4)|0;um(l);zb(l|0,14696,106)}b=c[k+(j<<2)>>2]|0;if((b|0)==0){l=Ya(4)|0;um(l);zb(l|0,14696,106)}wc[c[(c[b>>2]|0)+48>>2]&7](b,5280,5306|0,d)|0;d=c[h>>2]|0;if(!((c[1722]|0)==-1)){c[g>>2]=6888;c[g+4>>2]=117;c[g+8>>2]=0;ye(6888,g,118)}g=(c[6892>>2]|0)+ -1|0;b=c[d+8>>2]|0;if(!((c[d+12>>2]|0)-b>>2>>>0>g>>>0)){m=Ya(4)|0;um(m);zb(m|0,14696,106)}d=c[b+(g<<2)>>2]|0;if((d|0)==0){m=Ya(4)|0;um(m);zb(m|0,14696,106)}else{c[e>>2]=qc[c[(c[d>>2]|0)+16>>2]&127](d)|0;oc[c[(c[d>>2]|0)+20>>2]&63](a,d);ee(c[h>>2]|0)|0;i=f;return}}function jh(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0;g=i;i=i+16|0;h=g;j=g+12|0;Xe(j,b);b=c[j>>2]|0;if(!((c[1682]|0)==-1)){c[h>>2]=6728;c[h+4>>2]=117;c[h+8>>2]=0;ye(6728,h,118)}k=(c[6732>>2]|0)+ -1|0;l=c[b+8>>2]|0;if(!((c[b+12>>2]|0)-l>>2>>>0>k>>>0)){m=Ya(4)|0;um(m);zb(m|0,14696,106)}b=c[l+(k<<2)>>2]|0;if((b|0)==0){m=Ya(4)|0;um(m);zb(m|0,14696,106)}wc[c[(c[b>>2]|0)+48>>2]&7](b,5280,5312|0,d)|0;d=c[j>>2]|0;if(!((c[1722]|0)==-1)){c[h>>2]=6888;c[h+4>>2]=117;c[h+8>>2]=0;ye(6888,h,118)}h=(c[6892>>2]|0)+ -1|0;b=c[d+8>>2]|0;if(!((c[d+12>>2]|0)-b>>2>>>0>h>>>0)){n=Ya(4)|0;um(n);zb(n|0,14696,106)}d=c[b+(h<<2)>>2]|0;if((d|0)==0){n=Ya(4)|0;um(n);zb(n|0,14696,106)}else{c[e>>2]=qc[c[(c[d>>2]|0)+12>>2]&127](d)|0;c[f>>2]=qc[c[(c[d>>2]|0)+16>>2]&127](d)|0;oc[c[(c[d>>2]|0)+20>>2]&63](a,d);ee(c[j>>2]|0)|0;i=g;return}}function kh(b,d,e,f,g,h,j,k,l,m,n,o){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;var p=0,q=0,r=0,s=0,t=0,u=0;p=i;if((b|0)==(h|0)){if((a[d]|0)==0){q=-1;i=p;return q|0}a[d]=0;h=c[g>>2]|0;c[g>>2]=h+1;a[h]=46;h=a[k]|0;if((h&1)==0){r=(h&255)>>>1}else{r=c[k+4>>2]|0}if((r|0)==0){q=0;i=p;return q|0}r=c[m>>2]|0;if((r-l|0)>=160){q=0;i=p;return q|0}h=c[n>>2]|0;c[m>>2]=r+4;c[r>>2]=h;q=0;i=p;return q|0}if((b|0)==(j|0)){j=a[k]|0;if((j&1)==0){s=(j&255)>>>1}else{s=c[k+4>>2]|0}if((s|0)!=0){if((a[d]|0)==0){q=-1;i=p;return q|0}s=c[m>>2]|0;if((s-l|0)>=160){q=0;i=p;return q|0}j=c[n>>2]|0;c[m>>2]=s+4;c[s>>2]=j;c[n>>2]=0;q=0;i=p;return q|0}}j=o+128|0;s=o;while(1){h=s+4|0;if((c[s>>2]|0)==(b|0)){t=s;break}if((h|0)==(j|0)){t=j;break}else{s=h}}s=t-o|0;o=s>>2;if((s|0)>124){q=-1;i=p;return q|0}t=a[5280+o|0]|0;if((o|0)==23|(o|0)==22){a[e]=80}else if(!((o|0)==24|(o|0)==25)){o=t&95;if((o|0)==(a[e]|0)?(a[e]=o|128,(a[d]|0)!=0):0){a[d]=0;d=a[k]|0;if((d&1)==0){u=(d&255)>>>1}else{u=c[k+4>>2]|0}if((u|0)!=0?(u=c[m>>2]|0,(u-l|0)<160):0){l=c[n>>2]|0;c[m>>2]=u+4;c[u>>2]=l}}}else{l=c[g>>2]|0;if((l|0)!=(f|0)?(a[l+ -1|0]&95|0)!=(a[e]&127|0):0){q=-1;i=p;return q|0}c[g>>2]=l+1;a[l]=t;q=0;i=p;return q|0}l=c[g>>2]|0;c[g>>2]=l+1;a[l]=t;if((s|0)>84){q=0;i=p;return q|0}c[n>>2]=(c[n>>2]|0)+1;q=0;i=p;return q|0}function lh(a){a=a|0;var b=0;b=i;Wm(a);i=b;return}function mh(a){a=a|0;return}function nh(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;j=i;i=i+32|0;k=j;l=j+28|0;m=j+24|0;n=j+12|0;if((c[f+4>>2]&1|0)==0){o=c[(c[d>>2]|0)+24>>2]|0;c[l>>2]=c[e>>2];p=h&1;c[k+0>>2]=c[l+0>>2];jc[o&15](b,d,k,f,g,p);i=j;return}Xe(m,f);f=c[m>>2]|0;if(!((c[1720]|0)==-1)){c[k>>2]=6880;c[k+4>>2]=117;c[k+8>>2]=0;ye(6880,k,118)}k=(c[6884>>2]|0)+ -1|0;p=c[f+8>>2]|0;if(!((c[f+12>>2]|0)-p>>2>>>0>k>>>0)){q=Ya(4)|0;um(q);zb(q|0,14696,106)}f=c[p+(k<<2)>>2]|0;if((f|0)==0){q=Ya(4)|0;um(q);zb(q|0,14696,106)}ee(c[m>>2]|0)|0;m=c[f>>2]|0;if(h){oc[c[m+24>>2]&63](n,f)}else{oc[c[m+28>>2]&63](n,f)}f=a[n]|0;if((f&1)==0){m=n+1|0;r=m;s=m;t=n+8|0}else{m=n+8|0;r=c[m>>2]|0;s=n+1|0;t=m}m=n+4|0;h=f;f=r;while(1){if((h&1)==0){u=s;v=(h&255)>>>1}else{u=c[t>>2]|0;v=c[m>>2]|0}if((f|0)==(u+v|0)){break}r=a[f]|0;q=c[e>>2]|0;do{if((q|0)!=0){k=q+24|0;p=c[k>>2]|0;if((p|0)!=(c[q+28>>2]|0)){c[k>>2]=p+1;a[p]=r;break}if((zc[c[(c[q>>2]|0)+52>>2]&15](q,r&255)|0)==-1){c[e>>2]=0}}}while(0);h=a[n]|0;f=f+1|0}c[b>>2]=c[e>>2];De(n);i=j;return}function oh(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;d=i;i=i+64|0;j=d;k=d+20|0;l=d+28|0;m=d+40|0;n=d+12|0;o=d+4|0;p=d+8|0;q=d+16|0;a[k+0|0]=a[5528|0]|0;a[k+1|0]=a[5529|0]|0;a[k+2|0]=a[5530|0]|0;a[k+3|0]=a[5531|0]|0;a[k+4|0]=a[5532|0]|0;a[k+5|0]=a[5533|0]|0;r=k+1|0;s=f+4|0;t=c[s>>2]|0;if((t&2048|0)==0){u=r}else{a[r]=43;u=k+2|0}if((t&512|0)==0){v=u}else{a[u]=35;v=u+1|0}a[v]=108;u=v+1|0;v=t&74;do{if((v|0)==8){if((t&16384|0)==0){a[u]=120;break}else{a[u]=88;break}}else if((v|0)==64){a[u]=111}else{a[u]=100}}while(0);if((a[6632]|0)==0?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}u=c[1656]|0;c[j>>2]=h;h=ph(l,12,u,k,j)|0;k=l+h|0;u=c[s>>2]&176;do{if((u|0)==16){s=a[l]|0;if(s<<24>>24==43|s<<24>>24==45){w=l+1|0;break}if((h|0)>1&s<<24>>24==48?(s=a[l+1|0]|0,s<<24>>24==88|s<<24>>24==120):0){w=l+2|0}else{x=20}}else if((u|0)==32){w=k}else{x=20}}while(0);if((x|0)==20){w=l}Xe(p,f);qh(l,w,k,m,n,o,p);ee(c[p>>2]|0)|0;c[q>>2]=c[e>>2];e=c[n>>2]|0;n=c[o>>2]|0;c[j+0>>2]=c[q+0>>2];rh(b,j,m,e,n,f,g);i=d;return}function ph(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0;g=i;i=i+16|0;h=g;c[h>>2]=f;f=kb(d|0)|0;d=Ja(a|0,b|0,e|0,h|0)|0;if((f|0)==0){i=g;return d|0}kb(f|0)|0;i=g;return d|0}function qh(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0;k=i;i=i+32|0;l=k;m=k+12|0;n=c[j>>2]|0;if(!((c[1684]|0)==-1)){c[l>>2]=6736;c[l+4>>2]=117;c[l+8>>2]=0;ye(6736,l,118)}o=(c[6740>>2]|0)+ -1|0;p=c[n+8>>2]|0;if(!((c[n+12>>2]|0)-p>>2>>>0>o>>>0)){q=Ya(4)|0;um(q);zb(q|0,14696,106)}n=c[p+(o<<2)>>2]|0;if((n|0)==0){q=Ya(4)|0;um(q);zb(q|0,14696,106)}q=c[j>>2]|0;if(!((c[1720]|0)==-1)){c[l>>2]=6880;c[l+4>>2]=117;c[l+8>>2]=0;ye(6880,l,118)}l=(c[6884>>2]|0)+ -1|0;j=c[q+8>>2]|0;if(!((c[q+12>>2]|0)-j>>2>>>0>l>>>0)){r=Ya(4)|0;um(r);zb(r|0,14696,106)}q=c[j+(l<<2)>>2]|0;if((q|0)==0){r=Ya(4)|0;um(r);zb(r|0,14696,106)}oc[c[(c[q>>2]|0)+20>>2]&63](m,q);r=a[m]|0;if((r&1)==0){s=(r&255)>>>1}else{s=c[m+4>>2]|0}if((s|0)!=0){c[h>>2]=f;s=a[b]|0;if(s<<24>>24==43|s<<24>>24==45){r=zc[c[(c[n>>2]|0)+28>>2]&15](n,s)|0;s=c[h>>2]|0;c[h>>2]=s+1;a[s]=r;t=b+1|0}else{t=b}if(((e-t|0)>1?(a[t]|0)==48:0)?(r=t+1|0,s=a[r]|0,s<<24>>24==88|s<<24>>24==120):0){s=zc[c[(c[n>>2]|0)+28>>2]&15](n,48)|0;l=c[h>>2]|0;c[h>>2]=l+1;a[l]=s;s=zc[c[(c[n>>2]|0)+28>>2]&15](n,a[r]|0)|0;r=c[h>>2]|0;c[h>>2]=r+1;a[r]=s;u=t+2|0}else{u=t}if((u|0)!=(e|0)?(t=e+ -1|0,t>>>0>u>>>0):0){s=u;r=t;do{t=a[s]|0;a[s]=a[r]|0;a[r]=t;s=s+1|0;r=r+ -1|0}while(s>>>0<r>>>0)}r=qc[c[(c[q>>2]|0)+16>>2]&127](q)|0;if(u>>>0<e>>>0){q=m+1|0;s=m+4|0;t=m+8|0;l=0;j=0;o=u;while(1){p=(a[m]&1)==0;if((a[(p?q:c[t>>2]|0)+j|0]|0)!=0?(l|0)==(a[(p?q:c[t>>2]|0)+j|0]|0):0){p=c[h>>2]|0;c[h>>2]=p+1;a[p]=r;p=a[m]|0;if((p&1)==0){v=(p&255)>>>1}else{v=c[s>>2]|0}w=0;x=(j>>>0<(v+ -1|0)>>>0)+j|0}else{w=l;x=j}p=zc[c[(c[n>>2]|0)+28>>2]&15](n,a[o]|0)|0;y=c[h>>2]|0;c[h>>2]=y+1;a[y]=p;o=o+1|0;if(!(o>>>0<e>>>0)){break}else{l=w+1|0;j=x}}}x=f+(u-b)|0;u=c[h>>2]|0;if((x|0)!=(u|0)?(j=u+ -1|0,j>>>0>x>>>0):0){u=x;x=j;do{j=a[u]|0;a[u]=a[x]|0;a[x]=j;u=u+1|0;x=x+ -1|0}while(u>>>0<x>>>0)}}else{wc[c[(c[n>>2]|0)+32>>2]&7](n,b,e,f)|0;c[h>>2]=f+(e-b)}if((d|0)==(e|0)){z=c[h>>2]|0;c[g>>2]=z;De(m);i=k;return}else{z=f+(d-b)|0;c[g>>2]=z;De(m);i=k;return}}function rh(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;k=i;i=i+16|0;l=k;m=c[d>>2]|0;if((m|0)==0){c[b>>2]=0;i=k;return}n=g;g=e;o=n-g|0;p=h+12|0;h=c[p>>2]|0;q=(h|0)>(o|0)?h-o|0:0;o=f;h=o-g|0;if((h|0)>0?(ic[c[(c[m>>2]|0)+48>>2]&31](m,e,h)|0)!=(h|0):0){c[d>>2]=0;c[b>>2]=0;i=k;return}do{if((q|0)>0){Ce(l,q,j);if((a[l]&1)==0){r=l+1|0}else{r=c[l+8>>2]|0}if((ic[c[(c[m>>2]|0)+48>>2]&31](m,r,q)|0)==(q|0)){De(l);break}c[d>>2]=0;c[b>>2]=0;De(l);i=k;return}}while(0);l=n-o|0;if((l|0)>0?(ic[c[(c[m>>2]|0)+48>>2]&31](m,f,l)|0)!=(l|0):0){c[d>>2]=0;c[b>>2]=0;i=k;return}c[p>>2]=0;c[b>>2]=m;i=k;return}function sh(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0;d=i;i=i+96|0;k=d;l=d+8|0;m=d+32|0;n=d+54|0;o=d+16|0;p=d+24|0;q=d+20|0;r=d+28|0;s=l;c[s>>2]=37;c[s+4>>2]=0;s=l+1|0;t=f+4|0;u=c[t>>2]|0;if((u&2048|0)==0){v=s}else{a[s]=43;v=l+2|0}if((u&512|0)==0){w=v}else{a[v]=35;w=v+1|0}v=w+2|0;a[w]=108;a[w+1|0]=108;w=u&74;do{if((w|0)==8){if((u&16384|0)==0){a[v]=120;break}else{a[v]=88;break}}else if((w|0)==64){a[v]=111}else{a[v]=100}}while(0);if((a[6632]|0)==0?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}v=c[1656]|0;w=k;c[w>>2]=h;c[w+4>>2]=j;j=ph(m,22,v,l,k)|0;l=m+j|0;v=c[t>>2]&176;do{if((v|0)==16){t=a[m]|0;if(t<<24>>24==43|t<<24>>24==45){x=m+1|0;break}if((j|0)>1&t<<24>>24==48?(t=a[m+1|0]|0,t<<24>>24==88|t<<24>>24==120):0){x=m+2|0}else{y=20}}else if((v|0)==32){x=l}else{y=20}}while(0);if((y|0)==20){x=m}Xe(q,f);qh(m,x,l,n,o,p,q);ee(c[q>>2]|0)|0;c[r>>2]=c[e>>2];e=c[o>>2]|0;o=c[p>>2]|0;c[k+0>>2]=c[r+0>>2];rh(b,k,n,e,o,f,g);i=d;return}function th(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;d=i;i=i+64|0;j=d;k=d+20|0;l=d+28|0;m=d+40|0;n=d+12|0;o=d+4|0;p=d+8|0;q=d+16|0;a[k+0|0]=a[5528|0]|0;a[k+1|0]=a[5529|0]|0;a[k+2|0]=a[5530|0]|0;a[k+3|0]=a[5531|0]|0;a[k+4|0]=a[5532|0]|0;a[k+5|0]=a[5533|0]|0;r=k+1|0;s=f+4|0;t=c[s>>2]|0;if((t&2048|0)==0){u=r}else{a[r]=43;u=k+2|0}if((t&512|0)==0){v=u}else{a[u]=35;v=u+1|0}a[v]=108;u=v+1|0;v=t&74;do{if((v|0)==8){if((t&16384|0)==0){a[u]=120;break}else{a[u]=88;break}}else if((v|0)==64){a[u]=111}else{a[u]=117}}while(0);if((a[6632]|0)==0?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}u=c[1656]|0;c[j>>2]=h;h=ph(l,12,u,k,j)|0;k=l+h|0;u=c[s>>2]&176;do{if((u|0)==32){w=k}else if((u|0)==16){s=a[l]|0;if(s<<24>>24==43|s<<24>>24==45){w=l+1|0;break}if((h|0)>1&s<<24>>24==48?(s=a[l+1|0]|0,s<<24>>24==88|s<<24>>24==120):0){w=l+2|0}else{x=20}}else{x=20}}while(0);if((x|0)==20){w=l}Xe(p,f);qh(l,w,k,m,n,o,p);ee(c[p>>2]|0)|0;c[q>>2]=c[e>>2];e=c[n>>2]|0;n=c[o>>2]|0;c[j+0>>2]=c[q+0>>2];rh(b,j,m,e,n,f,g);i=d;return}function uh(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0;d=i;i=i+112|0;k=d;l=d+8|0;m=d+32|0;n=d+55|0;o=d+16|0;p=d+24|0;q=d+20|0;r=d+28|0;s=l;c[s>>2]=37;c[s+4>>2]=0;s=l+1|0;t=f+4|0;u=c[t>>2]|0;if((u&2048|0)==0){v=s}else{a[s]=43;v=l+2|0}if((u&512|0)==0){w=v}else{a[v]=35;w=v+1|0}v=w+2|0;a[w]=108;a[w+1|0]=108;w=u&74;do{if((w|0)==8){if((u&16384|0)==0){a[v]=120;break}else{a[v]=88;break}}else if((w|0)==64){a[v]=111}else{a[v]=117}}while(0);if((a[6632]|0)==0?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}v=c[1656]|0;w=k;c[w>>2]=h;c[w+4>>2]=j;j=ph(m,23,v,l,k)|0;l=m+j|0;v=c[t>>2]&176;do{if((v|0)==16){t=a[m]|0;if(t<<24>>24==43|t<<24>>24==45){x=m+1|0;break}if((j|0)>1&t<<24>>24==48?(t=a[m+1|0]|0,t<<24>>24==88|t<<24>>24==120):0){x=m+2|0}else{y=20}}else if((v|0)==32){x=l}else{y=20}}while(0);if((y|0)==20){x=m}Xe(q,f);qh(m,x,l,n,o,p,q);ee(c[q>>2]|0)|0;c[r>>2]=c[e>>2];e=c[o>>2]|0;o=c[p>>2]|0;c[k+0>>2]=c[r+0>>2];rh(b,k,n,e,o,f,g);i=d;return}function vh(b,d,e,f,g,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;j=+j;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0;d=i;i=i+144|0;l=d+8|0;m=d;n=d+44|0;o=d+36|0;p=d+74|0;q=d+20|0;r=d+32|0;s=d+28|0;t=d+24|0;u=d+40|0;v=m;c[v>>2]=37;c[v+4>>2]=0;v=m+1|0;w=f+4|0;x=c[w>>2]|0;if((x&2048|0)==0){y=v}else{a[v]=43;y=m+2|0}if((x&1024|0)==0){z=y}else{a[y]=35;z=y+1|0}y=x&260;v=x>>>14;do{if((y|0)==260){if((v&1|0)==0){a[z]=97;A=0;break}else{a[z]=65;A=0;break}}else{a[z]=46;x=z+2|0;a[z+1|0]=42;if((y|0)==4){if((v&1|0)==0){a[x]=102;A=1;break}else{a[x]=70;A=1;break}}else if((y|0)==256){if((v&1|0)==0){a[x]=101;A=1;break}else{a[x]=69;A=1;break}}else{if((v&1|0)==0){a[x]=103;A=1;break}else{a[x]=71;A=1;break}}}}while(0);c[o>>2]=n;if((a[6632]|0)==0?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}v=c[1656]|0;if(A){c[l>>2]=c[f+8>>2];y=l+4|0;h[k>>3]=j;c[y>>2]=c[k>>2];c[y+4>>2]=c[k+4>>2];B=ph(n,30,v,m,l)|0}else{h[k>>3]=j;c[l>>2]=c[k>>2];c[l+4>>2]=c[k+4>>2];B=ph(n,30,v,m,l)|0}if((B|0)>29){v=(a[6632]|0)==0;if(A){if(v?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}A=c[1656]|0;c[l>>2]=c[f+8>>2];y=l+4|0;h[k>>3]=j;c[y>>2]=c[k>>2];c[y+4>>2]=c[k+4>>2];C=wh(o,A,m,l)|0}else{if(v?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}v=c[1656]|0;c[l>>2]=c[f+8>>2];A=l+4|0;h[k>>3]=j;c[A>>2]=c[k>>2];c[A+4>>2]=c[k+4>>2];C=wh(o,v,m,l)|0}m=c[o>>2]|0;if((m|0)==0){$m()}else{D=m;E=m;F=C}}else{D=c[o>>2]|0;E=0;F=B}B=D+F|0;o=c[w>>2]&176;do{if((o|0)==32){G=B}else if((o|0)==16){w=a[D]|0;if(w<<24>>24==43|w<<24>>24==45){G=D+1|0;break}if((F|0)>1&w<<24>>24==48?(w=a[D+1|0]|0,w<<24>>24==88|w<<24>>24==120):0){G=D+2|0}else{H=44}}else{H=44}}while(0);if((H|0)==44){G=D}if((D|0)!=(n|0)){H=Pm(F<<1)|0;if((H|0)==0){$m()}else{I=D;J=H;K=H}}else{I=n;J=0;K=p}Xe(s,f);xh(I,G,B,K,q,r,s);ee(c[s>>2]|0)|0;c[u>>2]=c[e>>2];s=c[q>>2]|0;q=c[r>>2]|0;c[l+0>>2]=c[u+0>>2];rh(t,l,K,s,q,f,g);g=c[t>>2]|0;c[e>>2]=g;c[b>>2]=g;if((J|0)!=0){Qm(J)}if((E|0)==0){i=d;return}Qm(E);i=d;return}function wh(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0;f=i;i=i+16|0;g=f;c[g>>2]=e;e=kb(b|0)|0;b=Jb(a|0,d|0,g|0)|0;if((e|0)==0){i=f;return b|0}kb(e|0)|0;i=f;return b|0}function xh(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;k=i;i=i+32|0;l=k;m=k+12|0;n=c[j>>2]|0;if(!((c[1684]|0)==-1)){c[l>>2]=6736;c[l+4>>2]=117;c[l+8>>2]=0;ye(6736,l,118)}o=(c[6740>>2]|0)+ -1|0;p=c[n+8>>2]|0;if(!((c[n+12>>2]|0)-p>>2>>>0>o>>>0)){q=Ya(4)|0;um(q);zb(q|0,14696,106)}n=c[p+(o<<2)>>2]|0;if((n|0)==0){q=Ya(4)|0;um(q);zb(q|0,14696,106)}q=c[j>>2]|0;if(!((c[1720]|0)==-1)){c[l>>2]=6880;c[l+4>>2]=117;c[l+8>>2]=0;ye(6880,l,118)}l=(c[6884>>2]|0)+ -1|0;j=c[q+8>>2]|0;if(!((c[q+12>>2]|0)-j>>2>>>0>l>>>0)){r=Ya(4)|0;um(r);zb(r|0,14696,106)}q=c[j+(l<<2)>>2]|0;if((q|0)==0){r=Ya(4)|0;um(r);zb(r|0,14696,106)}oc[c[(c[q>>2]|0)+20>>2]&63](m,q);c[h>>2]=f;r=a[b]|0;if(r<<24>>24==43|r<<24>>24==45){l=zc[c[(c[n>>2]|0)+28>>2]&15](n,r)|0;r=c[h>>2]|0;c[h>>2]=r+1;a[r]=l;s=b+1|0}else{s=b}l=e;a:do{if(((l-s|0)>1?(a[s]|0)==48:0)?(r=s+1|0,j=a[r]|0,j<<24>>24==88|j<<24>>24==120):0){j=zc[c[(c[n>>2]|0)+28>>2]&15](n,48)|0;o=c[h>>2]|0;c[h>>2]=o+1;a[o]=j;j=s+2|0;o=zc[c[(c[n>>2]|0)+28>>2]&15](n,a[r]|0)|0;r=c[h>>2]|0;c[h>>2]=r+1;a[r]=o;if(j>>>0<e>>>0){o=j;while(1){r=a[o]|0;if((a[6632]|0)==0?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}p=o+1|0;if((_a(r<<24>>24|0,c[1656]|0)|0)==0){t=j;u=o;break a}if(p>>>0<e>>>0){o=p}else{t=j;u=p;break}}}else{t=j;u=j}}else{v=14}}while(0);b:do{if((v|0)==14){if(s>>>0<e>>>0){o=s;while(1){p=a[o]|0;if((a[6632]|0)==0?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}r=o+1|0;if((vb(p<<24>>24|0,c[1656]|0)|0)==0){t=s;u=o;break b}if(r>>>0<e>>>0){o=r}else{t=s;u=r;break}}}else{t=s;u=s}}}while(0);s=a[m]|0;if((s&1)==0){w=(s&255)>>>1}else{w=c[m+4>>2]|0}if((w|0)!=0){if((t|0)!=(u|0)?(w=u+ -1|0,w>>>0>t>>>0):0){s=t;v=w;do{w=a[s]|0;a[s]=a[v]|0;a[v]=w;s=s+1|0;v=v+ -1|0}while(s>>>0<v>>>0)}v=qc[c[(c[q>>2]|0)+16>>2]&127](q)|0;if(t>>>0<u>>>0){s=m+1|0;w=m+4|0;o=m+8|0;j=0;r=0;p=t;while(1){x=(a[m]&1)==0;if((a[(x?s:c[o>>2]|0)+r|0]|0)>0?(j|0)==(a[(x?s:c[o>>2]|0)+r|0]|0):0){x=c[h>>2]|0;c[h>>2]=x+1;a[x]=v;x=a[m]|0;if((x&1)==0){y=(x&255)>>>1}else{y=c[w>>2]|0}z=0;A=(r>>>0<(y+ -1|0)>>>0)+r|0}else{z=j;A=r}x=zc[c[(c[n>>2]|0)+28>>2]&15](n,a[p]|0)|0;B=c[h>>2]|0;c[h>>2]=B+1;a[B]=x;p=p+1|0;if(!(p>>>0<u>>>0)){break}else{j=z+1|0;r=A}}}A=f+(t-b)|0;r=c[h>>2]|0;if((A|0)!=(r|0)?(z=r+ -1|0,z>>>0>A>>>0):0){r=A;A=z;do{z=a[r]|0;a[r]=a[A]|0;a[A]=z;r=r+1|0;A=A+ -1|0}while(r>>>0<A>>>0)}}else{wc[c[(c[n>>2]|0)+32>>2]&7](n,t,u,c[h>>2]|0)|0;c[h>>2]=(c[h>>2]|0)+(u-t)}c:do{if(u>>>0<e>>>0){t=u;while(1){A=a[t]|0;if(A<<24>>24==46){break}r=zc[c[(c[n>>2]|0)+28>>2]&15](n,A)|0;A=c[h>>2]|0;c[h>>2]=A+1;a[A]=r;r=t+1|0;if(r>>>0<e>>>0){t=r}else{C=r;break c}}r=qc[c[(c[q>>2]|0)+12>>2]&127](q)|0;A=c[h>>2]|0;c[h>>2]=A+1;a[A]=r;C=t+1|0}else{C=u}}while(0);wc[c[(c[n>>2]|0)+32>>2]&7](n,C,e,c[h>>2]|0)|0;n=(c[h>>2]|0)+(l-C)|0;c[h>>2]=n;if((d|0)==(e|0)){D=n;c[g>>2]=D;De(m);i=k;return}D=f+(d-b)|0;c[g>>2]=D;De(m);i=k;return}function yh(b,d,e,f,g,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;j=+j;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0;d=i;i=i+144|0;l=d+8|0;m=d;n=d+44|0;o=d+36|0;p=d+74|0;q=d+20|0;r=d+32|0;s=d+28|0;t=d+24|0;u=d+40|0;v=m;c[v>>2]=37;c[v+4>>2]=0;v=m+1|0;w=f+4|0;x=c[w>>2]|0;if((x&2048|0)==0){y=v}else{a[v]=43;y=m+2|0}if((x&1024|0)==0){z=y}else{a[y]=35;z=y+1|0}y=x&260;v=x>>>14;do{if((y|0)==260){a[z]=76;x=z+1|0;if((v&1|0)==0){a[x]=97;A=0;break}else{a[x]=65;A=0;break}}else{a[z]=46;a[z+1|0]=42;a[z+2|0]=76;x=z+3|0;if((y|0)==4){if((v&1|0)==0){a[x]=102;A=1;break}else{a[x]=70;A=1;break}}else if((y|0)==256){if((v&1|0)==0){a[x]=101;A=1;break}else{a[x]=69;A=1;break}}else{if((v&1|0)==0){a[x]=103;A=1;break}else{a[x]=71;A=1;break}}}}while(0);c[o>>2]=n;if((a[6632]|0)==0?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}v=c[1656]|0;if(A){c[l>>2]=c[f+8>>2];y=l+4|0;h[k>>3]=j;c[y>>2]=c[k>>2];c[y+4>>2]=c[k+4>>2];B=ph(n,30,v,m,l)|0}else{h[k>>3]=j;c[l>>2]=c[k>>2];c[l+4>>2]=c[k+4>>2];B=ph(n,30,v,m,l)|0}if((B|0)>29){v=(a[6632]|0)==0;if(A){if(v?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}A=c[1656]|0;c[l>>2]=c[f+8>>2];y=l+4|0;h[k>>3]=j;c[y>>2]=c[k>>2];c[y+4>>2]=c[k+4>>2];C=wh(o,A,m,l)|0}else{if(v?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}v=c[1656]|0;h[k>>3]=j;c[l>>2]=c[k>>2];c[l+4>>2]=c[k+4>>2];C=wh(o,v,m,l)|0}m=c[o>>2]|0;if((m|0)==0){$m()}else{D=m;E=m;F=C}}else{D=c[o>>2]|0;E=0;F=B}B=D+F|0;o=c[w>>2]&176;do{if((o|0)==32){G=B}else if((o|0)==16){w=a[D]|0;if(w<<24>>24==43|w<<24>>24==45){G=D+1|0;break}if((F|0)>1&w<<24>>24==48?(w=a[D+1|0]|0,w<<24>>24==88|w<<24>>24==120):0){G=D+2|0}else{H=44}}else{H=44}}while(0);if((H|0)==44){G=D}if((D|0)!=(n|0)){H=Pm(F<<1)|0;if((H|0)==0){$m()}else{I=D;J=H;K=H}}else{I=n;J=0;K=p}Xe(s,f);xh(I,G,B,K,q,r,s);ee(c[s>>2]|0)|0;c[u>>2]=c[e>>2];s=c[q>>2]|0;q=c[r>>2]|0;c[l+0>>2]=c[u+0>>2];rh(t,l,K,s,q,f,g);g=c[t>>2]|0;c[e>>2]=g;c[b>>2]=g;if((J|0)!=0){Qm(J)}if((E|0)==0){i=d;return}Qm(E);i=d;return}function zh(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;d=i;i=i+96|0;j=d;k=d+80|0;l=d+60|0;m=d+20|0;n=d+16|0;o=d+12|0;a[k+0|0]=a[5536|0]|0;a[k+1|0]=a[5537|0]|0;a[k+2|0]=a[5538|0]|0;a[k+3|0]=a[5539|0]|0;a[k+4|0]=a[5540|0]|0;a[k+5|0]=a[5541|0]|0;if((a[6632]|0)==0?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}p=c[1656]|0;c[j>>2]=h;h=ph(l,20,p,k,j)|0;k=l+h|0;p=c[f+4>>2]&176;do{if((p|0)==16){q=a[l]|0;if(q<<24>>24==43|q<<24>>24==45){r=l+1|0;break}if((h|0)>1&q<<24>>24==48?(q=a[l+1|0]|0,q<<24>>24==88|q<<24>>24==120):0){r=l+2|0}else{s=10}}else if((p|0)==32){r=k}else{s=10}}while(0);if((s|0)==10){r=l}Xe(n,f);s=c[n>>2]|0;if(!((c[1684]|0)==-1)){c[j>>2]=6736;c[j+4>>2]=117;c[j+8>>2]=0;ye(6736,j,118)}p=(c[6740>>2]|0)+ -1|0;q=c[s+8>>2]|0;if(!((c[s+12>>2]|0)-q>>2>>>0>p>>>0)){t=Ya(4)|0;um(t);zb(t|0,14696,106)}s=c[q+(p<<2)>>2]|0;if((s|0)==0){t=Ya(4)|0;um(t);zb(t|0,14696,106)}ee(c[n>>2]|0)|0;wc[c[(c[s>>2]|0)+32>>2]&7](s,l,k,m)|0;s=m+h|0;if((r|0)==(k|0)){u=s;v=c[e>>2]|0;c[o>>2]=v;c[j+0>>2]=c[o+0>>2];rh(b,j,m,u,s,f,g);i=d;return}u=m+(r-l)|0;v=c[e>>2]|0;c[o>>2]=v;c[j+0>>2]=c[o+0>>2];rh(b,j,m,u,s,f,g);i=d;return}function Ah(a){a=a|0;var b=0;b=i;Wm(a);i=b;return}function Bh(a){a=a|0;return}function Ch(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;j=i;i=i+32|0;k=j;l=j+28|0;m=j+24|0;n=j+12|0;if((c[f+4>>2]&1|0)==0){o=c[(c[d>>2]|0)+24>>2]|0;c[l>>2]=c[e>>2];p=h&1;c[k+0>>2]=c[l+0>>2];jc[o&15](b,d,k,f,g,p);i=j;return}Xe(m,f);f=c[m>>2]|0;if(!((c[1722]|0)==-1)){c[k>>2]=6888;c[k+4>>2]=117;c[k+8>>2]=0;ye(6888,k,118)}k=(c[6892>>2]|0)+ -1|0;p=c[f+8>>2]|0;if(!((c[f+12>>2]|0)-p>>2>>>0>k>>>0)){q=Ya(4)|0;um(q);zb(q|0,14696,106)}f=c[p+(k<<2)>>2]|0;if((f|0)==0){q=Ya(4)|0;um(q);zb(q|0,14696,106)}ee(c[m>>2]|0)|0;m=c[f>>2]|0;if(h){oc[c[m+24>>2]&63](n,f)}else{oc[c[m+28>>2]&63](n,f)}f=a[n]|0;if((f&1)==0){m=n+4|0;r=m;s=n+8|0;t=m}else{m=n+8|0;r=c[m>>2]|0;s=m;t=n+4|0}m=f;f=r;while(1){if((m&1)==0){u=t;v=(m&255)>>>1}else{u=c[s>>2]|0;v=c[t>>2]|0}if((f|0)==(u+(v<<2)|0)){break}r=c[f>>2]|0;h=c[e>>2]|0;if((h|0)!=0){q=h+24|0;k=c[q>>2]|0;if((k|0)==(c[h+28>>2]|0)){w=zc[c[(c[h>>2]|0)+52>>2]&15](h,r)|0}else{c[q>>2]=k+4;c[k>>2]=r;w=r}if((w|0)==-1){c[e>>2]=0}}m=a[n]|0;f=f+4|0}c[b>>2]=c[e>>2];Oe(n);i=j;return}function Dh(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;d=i;i=i+128|0;j=d;k=d+104|0;l=d+112|0;m=d+8|0;n=d+4|0;o=d+96|0;p=d+92|0;q=d+100|0;a[k+0|0]=a[5528|0]|0;a[k+1|0]=a[5529|0]|0;a[k+2|0]=a[5530|0]|0;a[k+3|0]=a[5531|0]|0;a[k+4|0]=a[5532|0]|0;a[k+5|0]=a[5533|0]|0;r=k+1|0;s=f+4|0;t=c[s>>2]|0;if((t&2048|0)==0){u=r}else{a[r]=43;u=k+2|0}if((t&512|0)==0){v=u}else{a[u]=35;v=u+1|0}a[v]=108;u=v+1|0;v=t&74;do{if((v|0)==8){if((t&16384|0)==0){a[u]=120;break}else{a[u]=88;break}}else if((v|0)==64){a[u]=111}else{a[u]=100}}while(0);if((a[6632]|0)==0?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}u=c[1656]|0;c[j>>2]=h;h=ph(l,12,u,k,j)|0;k=l+h|0;u=c[s>>2]&176;do{if((u|0)==32){w=k}else if((u|0)==16){s=a[l]|0;if(s<<24>>24==43|s<<24>>24==45){w=l+1|0;break}if((h|0)>1&s<<24>>24==48?(s=a[l+1|0]|0,s<<24>>24==88|s<<24>>24==120):0){w=l+2|0}else{x=20}}else{x=20}}while(0);if((x|0)==20){w=l}Xe(p,f);Eh(l,w,k,m,n,o,p);ee(c[p>>2]|0)|0;c[q>>2]=c[e>>2];e=c[n>>2]|0;n=c[o>>2]|0;c[j+0>>2]=c[q+0>>2];Fh(b,j,m,e,n,f,g);i=d;return}function Eh(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0;k=i;i=i+32|0;l=k;m=k+12|0;n=c[j>>2]|0;if(!((c[1682]|0)==-1)){c[l>>2]=6728;c[l+4>>2]=117;c[l+8>>2]=0;ye(6728,l,118)}o=(c[6732>>2]|0)+ -1|0;p=c[n+8>>2]|0;if(!((c[n+12>>2]|0)-p>>2>>>0>o>>>0)){q=Ya(4)|0;um(q);zb(q|0,14696,106)}n=c[p+(o<<2)>>2]|0;if((n|0)==0){q=Ya(4)|0;um(q);zb(q|0,14696,106)}q=c[j>>2]|0;if(!((c[1722]|0)==-1)){c[l>>2]=6888;c[l+4>>2]=117;c[l+8>>2]=0;ye(6888,l,118)}l=(c[6892>>2]|0)+ -1|0;j=c[q+8>>2]|0;if(!((c[q+12>>2]|0)-j>>2>>>0>l>>>0)){r=Ya(4)|0;um(r);zb(r|0,14696,106)}q=c[j+(l<<2)>>2]|0;if((q|0)==0){r=Ya(4)|0;um(r);zb(r|0,14696,106)}oc[c[(c[q>>2]|0)+20>>2]&63](m,q);r=a[m]|0;if((r&1)==0){s=(r&255)>>>1}else{s=c[m+4>>2]|0}if((s|0)!=0){c[h>>2]=f;s=a[b]|0;if(s<<24>>24==43|s<<24>>24==45){r=zc[c[(c[n>>2]|0)+44>>2]&15](n,s)|0;s=c[h>>2]|0;c[h>>2]=s+4;c[s>>2]=r;t=b+1|0}else{t=b}if(((e-t|0)>1?(a[t]|0)==48:0)?(r=t+1|0,s=a[r]|0,s<<24>>24==88|s<<24>>24==120):0){s=zc[c[(c[n>>2]|0)+44>>2]&15](n,48)|0;l=c[h>>2]|0;c[h>>2]=l+4;c[l>>2]=s;s=zc[c[(c[n>>2]|0)+44>>2]&15](n,a[r]|0)|0;r=c[h>>2]|0;c[h>>2]=r+4;c[r>>2]=s;u=t+2|0}else{u=t}if((u|0)!=(e|0)?(t=e+ -1|0,t>>>0>u>>>0):0){s=u;r=t;do{t=a[s]|0;a[s]=a[r]|0;a[r]=t;s=s+1|0;r=r+ -1|0}while(s>>>0<r>>>0)}r=qc[c[(c[q>>2]|0)+16>>2]&127](q)|0;if(u>>>0<e>>>0){q=m+1|0;s=m+4|0;t=m+8|0;l=0;j=0;o=u;while(1){p=(a[m]&1)==0;if((a[(p?q:c[t>>2]|0)+j|0]|0)!=0?(l|0)==(a[(p?q:c[t>>2]|0)+j|0]|0):0){p=c[h>>2]|0;c[h>>2]=p+4;c[p>>2]=r;p=a[m]|0;if((p&1)==0){v=(p&255)>>>1}else{v=c[s>>2]|0}w=0;x=(j>>>0<(v+ -1|0)>>>0)+j|0}else{w=l;x=j}p=zc[c[(c[n>>2]|0)+44>>2]&15](n,a[o]|0)|0;y=c[h>>2]|0;z=y+4|0;c[h>>2]=z;c[y>>2]=p;p=o+1|0;if(p>>>0<e>>>0){l=w+1|0;j=x;o=p}else{A=z;break}}}else{A=c[h>>2]|0}o=f+(u-b<<2)|0;if((o|0)!=(A|0)?(u=A+ -4|0,u>>>0>o>>>0):0){x=o;o=u;while(1){u=c[x>>2]|0;c[x>>2]=c[o>>2];c[o>>2]=u;u=x+4|0;j=o+ -4|0;if(u>>>0<j>>>0){x=u;o=j}else{B=A;break}}}else{B=A}}else{wc[c[(c[n>>2]|0)+48>>2]&7](n,b,e,f)|0;n=f+(e-b<<2)|0;c[h>>2]=n;B=n}if((d|0)==(e|0)){C=B;c[g>>2]=C;De(m);i=k;return}C=f+(d-b<<2)|0;c[g>>2]=C;De(m);i=k;return}function Fh(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;k=i;i=i+16|0;l=k;m=c[d>>2]|0;if((m|0)==0){c[b>>2]=0;i=k;return}n=g;g=e;o=n-g>>2;p=h+12|0;h=c[p>>2]|0;q=(h|0)>(o|0)?h-o|0:0;o=f;h=o-g|0;g=h>>2;if((h|0)>0?(ic[c[(c[m>>2]|0)+48>>2]&31](m,e,g)|0)!=(g|0):0){c[d>>2]=0;c[b>>2]=0;i=k;return}do{if((q|0)>0){Ne(l,q,j);if((a[l]&1)==0){r=l+4|0}else{r=c[l+8>>2]|0}if((ic[c[(c[m>>2]|0)+48>>2]&31](m,r,q)|0)==(q|0)){Oe(l);break}c[d>>2]=0;c[b>>2]=0;Oe(l);i=k;return}}while(0);l=n-o|0;o=l>>2;if((l|0)>0?(ic[c[(c[m>>2]|0)+48>>2]&31](m,f,o)|0)!=(o|0):0){c[d>>2]=0;c[b>>2]=0;i=k;return}c[p>>2]=0;c[b>>2]=m;i=k;return}function Gh(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0;d=i;i=i+224|0;k=d;l=d+8|0;m=d+196|0;n=d+24|0;o=d+20|0;p=d+16|0;q=d+188|0;r=d+192|0;s=l;c[s>>2]=37;c[s+4>>2]=0;s=l+1|0;t=f+4|0;u=c[t>>2]|0;if((u&2048|0)==0){v=s}else{a[s]=43;v=l+2|0}if((u&512|0)==0){w=v}else{a[v]=35;w=v+1|0}v=w+2|0;a[w]=108;a[w+1|0]=108;w=u&74;do{if((w|0)==64){a[v]=111}else if((w|0)==8){if((u&16384|0)==0){a[v]=120;break}else{a[v]=88;break}}else{a[v]=100}}while(0);if((a[6632]|0)==0?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}v=c[1656]|0;u=k;c[u>>2]=h;c[u+4>>2]=j;j=ph(m,22,v,l,k)|0;l=m+j|0;v=c[t>>2]&176;do{if((v|0)==32){x=l}else if((v|0)==16){t=a[m]|0;if(t<<24>>24==43|t<<24>>24==45){x=m+1|0;break}if((j|0)>1&t<<24>>24==48?(t=a[m+1|0]|0,t<<24>>24==88|t<<24>>24==120):0){x=m+2|0}else{y=20}}else{y=20}}while(0);if((y|0)==20){x=m}Xe(q,f);Eh(m,x,l,n,o,p,q);ee(c[q>>2]|0)|0;c[r>>2]=c[e>>2];e=c[o>>2]|0;o=c[p>>2]|0;c[k+0>>2]=c[r+0>>2];Fh(b,k,n,e,o,f,g);i=d;return}function Hh(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;d=i;i=i+128|0;j=d;k=d+104|0;l=d+112|0;m=d+8|0;n=d+4|0;o=d+96|0;p=d+92|0;q=d+100|0;a[k+0|0]=a[5528|0]|0;a[k+1|0]=a[5529|0]|0;a[k+2|0]=a[5530|0]|0;a[k+3|0]=a[5531|0]|0;a[k+4|0]=a[5532|0]|0;a[k+5|0]=a[5533|0]|0;r=k+1|0;s=f+4|0;t=c[s>>2]|0;if((t&2048|0)==0){u=r}else{a[r]=43;u=k+2|0}if((t&512|0)==0){v=u}else{a[u]=35;v=u+1|0}a[v]=108;u=v+1|0;v=t&74;do{if((v|0)==8){if((t&16384|0)==0){a[u]=120;break}else{a[u]=88;break}}else if((v|0)==64){a[u]=111}else{a[u]=117}}while(0);if((a[6632]|0)==0?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}u=c[1656]|0;c[j>>2]=h;h=ph(l,12,u,k,j)|0;k=l+h|0;u=c[s>>2]&176;do{if((u|0)==32){w=k}else if((u|0)==16){s=a[l]|0;if(s<<24>>24==43|s<<24>>24==45){w=l+1|0;break}if((h|0)>1&s<<24>>24==48?(s=a[l+1|0]|0,s<<24>>24==88|s<<24>>24==120):0){w=l+2|0}else{x=20}}else{x=20}}while(0);if((x|0)==20){w=l}Xe(p,f);Eh(l,w,k,m,n,o,p);ee(c[p>>2]|0)|0;c[q>>2]=c[e>>2];e=c[n>>2]|0;n=c[o>>2]|0;c[j+0>>2]=c[q+0>>2];Fh(b,j,m,e,n,f,g);i=d;return}function Ih(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0;d=i;i=i+240|0;k=d;l=d+8|0;m=d+204|0;n=d+24|0;o=d+20|0;p=d+16|0;q=d+196|0;r=d+200|0;s=l;c[s>>2]=37;c[s+4>>2]=0;s=l+1|0;t=f+4|0;u=c[t>>2]|0;if((u&2048|0)==0){v=s}else{a[s]=43;v=l+2|0}if((u&512|0)==0){w=v}else{a[v]=35;w=v+1|0}v=w+2|0;a[w]=108;a[w+1|0]=108;w=u&74;do{if((w|0)==64){a[v]=111}else if((w|0)==8){if((u&16384|0)==0){a[v]=120;break}else{a[v]=88;break}}else{a[v]=117}}while(0);if((a[6632]|0)==0?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}v=c[1656]|0;u=k;c[u>>2]=h;c[u+4>>2]=j;j=ph(m,23,v,l,k)|0;l=m+j|0;v=c[t>>2]&176;do{if((v|0)==16){t=a[m]|0;if(t<<24>>24==43|t<<24>>24==45){x=m+1|0;break}if((j|0)>1&t<<24>>24==48?(t=a[m+1|0]|0,t<<24>>24==88|t<<24>>24==120):0){x=m+2|0}else{y=20}}else if((v|0)==32){x=l}else{y=20}}while(0);if((y|0)==20){x=m}Xe(q,f);Eh(m,x,l,n,o,p,q);ee(c[q>>2]|0)|0;c[r>>2]=c[e>>2];e=c[o>>2]|0;o=c[p>>2]|0;c[k+0>>2]=c[r+0>>2];Fh(b,k,n,e,o,f,g);i=d;return}function Jh(b,d,e,f,g,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;j=+j;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0;d=i;i=i+320|0;l=d;m=d+16|0;n=d+276|0;o=d+36|0;p=d+44|0;q=d+24|0;r=d+32|0;s=d+40|0;t=d+28|0;u=d+272|0;v=m;c[v>>2]=37;c[v+4>>2]=0;v=m+1|0;w=f+4|0;x=c[w>>2]|0;if((x&2048|0)==0){y=v}else{a[v]=43;y=m+2|0}if((x&1024|0)==0){z=y}else{a[y]=35;z=y+1|0}y=x&260;v=x>>>14;do{if((y|0)==260){if((v&1|0)==0){a[z]=97;A=0;break}else{a[z]=65;A=0;break}}else{a[z]=46;x=z+2|0;a[z+1|0]=42;if((y|0)==4){if((v&1|0)==0){a[x]=102;A=1;break}else{a[x]=70;A=1;break}}else if((y|0)==256){if((v&1|0)==0){a[x]=101;A=1;break}else{a[x]=69;A=1;break}}else{if((v&1|0)==0){a[x]=103;A=1;break}else{a[x]=71;A=1;break}}}}while(0);c[o>>2]=n;if((a[6632]|0)==0?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}v=c[1656]|0;if(A){c[l>>2]=c[f+8>>2];y=l+4|0;h[k>>3]=j;c[y>>2]=c[k>>2];c[y+4>>2]=c[k+4>>2];B=ph(n,30,v,m,l)|0}else{h[k>>3]=j;c[l>>2]=c[k>>2];c[l+4>>2]=c[k+4>>2];B=ph(n,30,v,m,l)|0}if((B|0)>29){v=(a[6632]|0)==0;if(A){if(v?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}A=c[1656]|0;c[l>>2]=c[f+8>>2];y=l+4|0;h[k>>3]=j;c[y>>2]=c[k>>2];c[y+4>>2]=c[k+4>>2];C=wh(o,A,m,l)|0}else{if(v?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}v=c[1656]|0;c[l>>2]=c[f+8>>2];A=l+4|0;h[k>>3]=j;c[A>>2]=c[k>>2];c[A+4>>2]=c[k+4>>2];C=wh(o,v,m,l)|0}m=c[o>>2]|0;if((m|0)==0){$m()}else{D=m;E=m;F=C}}else{D=c[o>>2]|0;E=0;F=B}B=D+F|0;o=c[w>>2]&176;do{if((o|0)==32){G=B}else if((o|0)==16){w=a[D]|0;if(w<<24>>24==43|w<<24>>24==45){G=D+1|0;break}if((F|0)>1&w<<24>>24==48?(w=a[D+1|0]|0,w<<24>>24==88|w<<24>>24==120):0){G=D+2|0}else{H=44}}else{H=44}}while(0);if((H|0)==44){G=D}if((D|0)!=(n|0)){H=Pm(F<<3)|0;if((H|0)==0){$m()}else{I=D;J=H;K=H}}else{I=n;J=0;K=p}Xe(s,f);Kh(I,G,B,K,q,r,s);ee(c[s>>2]|0)|0;c[u>>2]=c[e>>2];s=c[q>>2]|0;q=c[r>>2]|0;c[l+0>>2]=c[u+0>>2];Fh(t,l,K,s,q,f,g);g=c[t>>2]|0;c[e>>2]=g;c[b>>2]=g;if((J|0)!=0){Qm(J)}if((E|0)==0){i=d;return}Qm(E);i=d;return}function Kh(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0;k=i;i=i+32|0;l=k;m=k+12|0;n=c[j>>2]|0;if(!((c[1682]|0)==-1)){c[l>>2]=6728;c[l+4>>2]=117;c[l+8>>2]=0;ye(6728,l,118)}o=(c[6732>>2]|0)+ -1|0;p=c[n+8>>2]|0;if(!((c[n+12>>2]|0)-p>>2>>>0>o>>>0)){q=Ya(4)|0;um(q);zb(q|0,14696,106)}n=c[p+(o<<2)>>2]|0;if((n|0)==0){q=Ya(4)|0;um(q);zb(q|0,14696,106)}q=c[j>>2]|0;if(!((c[1722]|0)==-1)){c[l>>2]=6888;c[l+4>>2]=117;c[l+8>>2]=0;ye(6888,l,118)}l=(c[6892>>2]|0)+ -1|0;j=c[q+8>>2]|0;if(!((c[q+12>>2]|0)-j>>2>>>0>l>>>0)){r=Ya(4)|0;um(r);zb(r|0,14696,106)}q=c[j+(l<<2)>>2]|0;if((q|0)==0){r=Ya(4)|0;um(r);zb(r|0,14696,106)}oc[c[(c[q>>2]|0)+20>>2]&63](m,q);c[h>>2]=f;r=a[b]|0;if(r<<24>>24==43|r<<24>>24==45){l=zc[c[(c[n>>2]|0)+44>>2]&15](n,r)|0;r=c[h>>2]|0;c[h>>2]=r+4;c[r>>2]=l;s=b+1|0}else{s=b}l=e;a:do{if(((l-s|0)>1?(a[s]|0)==48:0)?(r=s+1|0,j=a[r]|0,j<<24>>24==88|j<<24>>24==120):0){j=zc[c[(c[n>>2]|0)+44>>2]&15](n,48)|0;o=c[h>>2]|0;c[h>>2]=o+4;c[o>>2]=j;j=s+2|0;o=zc[c[(c[n>>2]|0)+44>>2]&15](n,a[r]|0)|0;r=c[h>>2]|0;c[h>>2]=r+4;c[r>>2]=o;if(j>>>0<e>>>0){o=j;while(1){r=a[o]|0;if((a[6632]|0)==0?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}p=o+1|0;if((_a(r<<24>>24|0,c[1656]|0)|0)==0){t=j;u=o;break a}if(p>>>0<e>>>0){o=p}else{t=j;u=p;break}}}else{t=j;u=j}}else{v=14}}while(0);b:do{if((v|0)==14){if(s>>>0<e>>>0){o=s;while(1){p=a[o]|0;if((a[6632]|0)==0?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}r=o+1|0;if((vb(p<<24>>24|0,c[1656]|0)|0)==0){t=s;u=o;break b}if(r>>>0<e>>>0){o=r}else{t=s;u=r;break}}}else{t=s;u=s}}}while(0);s=a[m]|0;if((s&1)==0){w=(s&255)>>>1}else{w=c[m+4>>2]|0}if((w|0)!=0){if((t|0)!=(u|0)?(w=u+ -1|0,w>>>0>t>>>0):0){s=t;v=w;do{w=a[s]|0;a[s]=a[v]|0;a[v]=w;s=s+1|0;v=v+ -1|0}while(s>>>0<v>>>0)}v=qc[c[(c[q>>2]|0)+16>>2]&127](q)|0;if(t>>>0<u>>>0){s=m+1|0;w=m+4|0;o=m+8|0;j=0;r=0;p=t;while(1){x=(a[m]&1)==0;if((a[(x?s:c[o>>2]|0)+r|0]|0)>0?(j|0)==(a[(x?s:c[o>>2]|0)+r|0]|0):0){x=c[h>>2]|0;c[h>>2]=x+4;c[x>>2]=v;x=a[m]|0;if((x&1)==0){y=(x&255)>>>1}else{y=c[w>>2]|0}z=0;A=(r>>>0<(y+ -1|0)>>>0)+r|0}else{z=j;A=r}x=zc[c[(c[n>>2]|0)+44>>2]&15](n,a[p]|0)|0;B=c[h>>2]|0;C=B+4|0;c[h>>2]=C;c[B>>2]=x;x=p+1|0;if(x>>>0<u>>>0){j=z+1|0;r=A;p=x}else{D=C;break}}}else{D=c[h>>2]|0}p=f+(t-b<<2)|0;if((p|0)!=(D|0)?(A=D+ -4|0,A>>>0>p>>>0):0){r=p;p=A;while(1){A=c[r>>2]|0;c[r>>2]=c[p>>2];c[p>>2]=A;A=r+4|0;z=p+ -4|0;if(A>>>0<z>>>0){r=A;p=z}else{E=D;break}}}else{E=D}}else{wc[c[(c[n>>2]|0)+48>>2]&7](n,t,u,c[h>>2]|0)|0;D=(c[h>>2]|0)+(u-t<<2)|0;c[h>>2]=D;E=D}c:do{if(u>>>0<e>>>0){D=u;while(1){t=a[D]|0;if(t<<24>>24==46){break}p=zc[c[(c[n>>2]|0)+44>>2]&15](n,t)|0;t=c[h>>2]|0;r=t+4|0;c[h>>2]=r;c[t>>2]=p;p=D+1|0;if(p>>>0<e>>>0){D=p}else{F=r;G=p;break c}}p=qc[c[(c[q>>2]|0)+12>>2]&127](q)|0;r=c[h>>2]|0;t=r+4|0;c[h>>2]=t;c[r>>2]=p;F=t;G=D+1|0}else{F=E;G=u}}while(0);wc[c[(c[n>>2]|0)+48>>2]&7](n,G,e,F)|0;F=(c[h>>2]|0)+(l-G<<2)|0;c[h>>2]=F;if((d|0)==(e|0)){H=F;c[g>>2]=H;De(m);i=k;return}H=f+(d-b<<2)|0;c[g>>2]=H;De(m);i=k;return}function Lh(b,d,e,f,g,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;j=+j;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0;d=i;i=i+320|0;l=d;m=d+16|0;n=d+276|0;o=d+36|0;p=d+44|0;q=d+24|0;r=d+32|0;s=d+40|0;t=d+28|0;u=d+272|0;v=m;c[v>>2]=37;c[v+4>>2]=0;v=m+1|0;w=f+4|0;x=c[w>>2]|0;if((x&2048|0)==0){y=v}else{a[v]=43;y=m+2|0}if((x&1024|0)==0){z=y}else{a[y]=35;z=y+1|0}y=x&260;v=x>>>14;do{if((y|0)==260){a[z]=76;x=z+1|0;if((v&1|0)==0){a[x]=97;A=0;break}else{a[x]=65;A=0;break}}else{a[z]=46;a[z+1|0]=42;a[z+2|0]=76;x=z+3|0;if((y|0)==4){if((v&1|0)==0){a[x]=102;A=1;break}else{a[x]=70;A=1;break}}else if((y|0)==256){if((v&1|0)==0){a[x]=101;A=1;break}else{a[x]=69;A=1;break}}else{if((v&1|0)==0){a[x]=103;A=1;break}else{a[x]=71;A=1;break}}}}while(0);c[o>>2]=n;if((a[6632]|0)==0?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}v=c[1656]|0;if(A){c[l>>2]=c[f+8>>2];y=l+4|0;h[k>>3]=j;c[y>>2]=c[k>>2];c[y+4>>2]=c[k+4>>2];B=ph(n,30,v,m,l)|0}else{h[k>>3]=j;c[l>>2]=c[k>>2];c[l+4>>2]=c[k+4>>2];B=ph(n,30,v,m,l)|0}if((B|0)>29){v=(a[6632]|0)==0;if(A){if(v?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}A=c[1656]|0;c[l>>2]=c[f+8>>2];y=l+4|0;h[k>>3]=j;c[y>>2]=c[k>>2];c[y+4>>2]=c[k+4>>2];C=wh(o,A,m,l)|0}else{if(v?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}v=c[1656]|0;h[k>>3]=j;c[l>>2]=c[k>>2];c[l+4>>2]=c[k+4>>2];C=wh(o,v,m,l)|0}m=c[o>>2]|0;if((m|0)==0){$m()}else{D=m;E=m;F=C}}else{D=c[o>>2]|0;E=0;F=B}B=D+F|0;o=c[w>>2]&176;do{if((o|0)==16){w=a[D]|0;if(w<<24>>24==43|w<<24>>24==45){G=D+1|0;break}if((F|0)>1&w<<24>>24==48?(w=a[D+1|0]|0,w<<24>>24==88|w<<24>>24==120):0){G=D+2|0}else{H=44}}else if((o|0)==32){G=B}else{H=44}}while(0);if((H|0)==44){G=D}if((D|0)!=(n|0)){H=Pm(F<<3)|0;if((H|0)==0){$m()}else{I=D;J=H;K=H}}else{I=n;J=0;K=p}Xe(s,f);Kh(I,G,B,K,q,r,s);ee(c[s>>2]|0)|0;c[u>>2]=c[e>>2];s=c[q>>2]|0;q=c[r>>2]|0;c[l+0>>2]=c[u+0>>2];Fh(t,l,K,s,q,f,g);g=c[t>>2]|0;c[e>>2]=g;c[b>>2]=g;if((J|0)!=0){Qm(J)}if((E|0)==0){i=d;return}Qm(E);i=d;return}function Mh(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;d=i;i=i+208|0;j=d;k=d+188|0;l=d+168|0;m=d+20|0;n=d+16|0;o=d+12|0;a[k+0|0]=a[5536|0]|0;a[k+1|0]=a[5537|0]|0;a[k+2|0]=a[5538|0]|0;a[k+3|0]=a[5539|0]|0;a[k+4|0]=a[5540|0]|0;a[k+5|0]=a[5541|0]|0;if((a[6632]|0)==0?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}p=c[1656]|0;c[j>>2]=h;h=ph(l,20,p,k,j)|0;k=l+h|0;p=c[f+4>>2]&176;do{if((p|0)==16){q=a[l]|0;if(q<<24>>24==43|q<<24>>24==45){r=l+1|0;break}if((h|0)>1&q<<24>>24==48?(q=a[l+1|0]|0,q<<24>>24==88|q<<24>>24==120):0){r=l+2|0}else{s=10}}else if((p|0)==32){r=k}else{s=10}}while(0);if((s|0)==10){r=l}Xe(n,f);s=c[n>>2]|0;if(!((c[1682]|0)==-1)){c[j>>2]=6728;c[j+4>>2]=117;c[j+8>>2]=0;ye(6728,j,118)}p=(c[6732>>2]|0)+ -1|0;q=c[s+8>>2]|0;if(!((c[s+12>>2]|0)-q>>2>>>0>p>>>0)){t=Ya(4)|0;um(t);zb(t|0,14696,106)}s=c[q+(p<<2)>>2]|0;if((s|0)==0){t=Ya(4)|0;um(t);zb(t|0,14696,106)}ee(c[n>>2]|0)|0;wc[c[(c[s>>2]|0)+48>>2]&7](s,l,k,m)|0;s=m+(h<<2)|0;if((r|0)==(k|0)){u=s;v=c[e>>2]|0;c[o>>2]=v;c[j+0>>2]=c[o+0>>2];Fh(b,j,m,u,s,f,g);i=d;return}u=m+(r-l<<2)|0;v=c[e>>2]|0;c[o>>2]=v;c[j+0>>2]=c[o+0>>2];Fh(b,j,m,u,s,f,g);i=d;return}function Nh(e,f,g,h,j,k,l,m,n){e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;var o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0;o=i;i=i+32|0;p=o;q=o+28|0;r=o+24|0;s=o+20|0;t=o+16|0;u=o+12|0;Xe(r,j);v=c[r>>2]|0;if(!((c[1684]|0)==-1)){c[p>>2]=6736;c[p+4>>2]=117;c[p+8>>2]=0;ye(6736,p,118)}w=(c[6740>>2]|0)+ -1|0;x=c[v+8>>2]|0;if(!((c[v+12>>2]|0)-x>>2>>>0>w>>>0)){y=Ya(4)|0;um(y);zb(y|0,14696,106)}v=c[x+(w<<2)>>2]|0;if((v|0)==0){y=Ya(4)|0;um(y);zb(y|0,14696,106)}ee(c[r>>2]|0)|0;c[k>>2]=0;a:do{if((m|0)!=(n|0)){r=v+8|0;y=m;w=0;b:while(1){x=w;while(1){if((x|0)!=0){z=65;break a}A=c[g>>2]|0;if((A|0)!=0){if((c[A+12>>2]|0)==(c[A+16>>2]|0)?(qc[c[(c[A>>2]|0)+36>>2]&127](A)|0)==-1:0){c[g>>2]=0;B=0}else{B=A}}else{B=0}A=(B|0)==0;C=c[h>>2]|0;do{if((C|0)!=0){if((c[C+12>>2]|0)==(c[C+16>>2]|0)?(qc[c[(c[C>>2]|0)+36>>2]&127](C)|0)==-1:0){c[h>>2]=0;z=19;break}if(A){D=C}else{z=20;break b}}else{z=19}}while(0);if((z|0)==19){z=0;if(A){z=20;break b}else{D=0}}if((ic[c[(c[v>>2]|0)+36>>2]&31](v,a[y]|0,0)|0)<<24>>24==37){z=22;break}C=a[y]|0;if(C<<24>>24>-1?(E=c[r>>2]|0,!((b[E+(C<<24>>24<<1)>>1]&8192)==0)):0){F=y;z=33;break}G=B+12|0;C=c[G>>2]|0;H=B+16|0;if((C|0)==(c[H>>2]|0)){I=qc[c[(c[B>>2]|0)+36>>2]&127](B)|0}else{I=d[C]|0}C=zc[c[(c[v>>2]|0)+12>>2]&15](v,I&255)|0;if(C<<24>>24==(zc[c[(c[v>>2]|0)+12>>2]&15](v,a[y]|0)|0)<<24>>24){z=60;break}c[k>>2]=4;x=4}c:do{if((z|0)==22){z=0;x=y+1|0;if((x|0)==(n|0)){z=23;break b}C=ic[c[(c[v>>2]|0)+36>>2]&31](v,a[x]|0,0)|0;if(C<<24>>24==48|C<<24>>24==69){J=y+2|0;if((J|0)==(n|0)){z=26;break b}K=J;L=ic[c[(c[v>>2]|0)+36>>2]&31](v,a[J]|0,0)|0;M=C}else{K=x;L=C;M=0}C=c[(c[f>>2]|0)+36>>2]|0;c[t>>2]=B;c[u>>2]=D;c[q+0>>2]=c[t+0>>2];c[p+0>>2]=c[u+0>>2];pc[C&3](s,f,q,p,j,k,l,L,M);c[g>>2]=c[s>>2];N=K+1|0}else if((z|0)==33){while(1){z=0;C=F+1|0;if((C|0)==(n|0)){O=n;break}x=a[C]|0;if(!(x<<24>>24>-1)){O=C;break}if((b[E+(x<<24>>24<<1)>>1]&8192)==0){O=C;break}else{F=C;z=33}}A=B;C=D;x=D;while(1){if((A|0)!=0){if((c[A+12>>2]|0)==(c[A+16>>2]|0)?(qc[c[(c[A>>2]|0)+36>>2]&127](A)|0)==-1:0){c[g>>2]=0;P=0}else{P=A}}else{P=0}J=(P|0)==0;do{if((x|0)!=0){if((c[x+12>>2]|0)!=(c[x+16>>2]|0)){if(J){Q=C;R=x;break}else{N=O;break c}}if(!((qc[c[(c[x>>2]|0)+36>>2]&127](x)|0)==-1)){if(J^(C|0)==0){Q=C;R=C;break}else{N=O;break c}}else{c[h>>2]=0;S=0;z=46;break}}else{S=C;z=46}}while(0);if((z|0)==46){z=0;if(J){N=O;break c}else{Q=S;R=0}}T=P+12|0;U=c[T>>2]|0;V=P+16|0;if((U|0)==(c[V>>2]|0)){W=qc[c[(c[P>>2]|0)+36>>2]&127](P)|0}else{W=d[U]|0}if(!((W&255)<<24>>24>-1)){N=O;break c}if((b[(c[r>>2]|0)+(W<<24>>24<<1)>>1]&8192)==0){N=O;break c}U=c[T>>2]|0;if((U|0)==(c[V>>2]|0)){qc[c[(c[P>>2]|0)+40>>2]&127](P)|0;A=P;C=Q;x=R;continue}else{c[T>>2]=U+1;A=P;C=Q;x=R;continue}}}else if((z|0)==60){z=0;x=c[G>>2]|0;if((x|0)==(c[H>>2]|0)){qc[c[(c[B>>2]|0)+40>>2]&127](B)|0}else{c[G>>2]=x+1}N=y+1|0}}while(0);if((N|0)==(n|0)){z=65;break a}y=N;w=c[k>>2]|0}if((z|0)==20){c[k>>2]=4;X=B;break}else if((z|0)==23){c[k>>2]=4;X=B;break}else if((z|0)==26){c[k>>2]=4;X=B;break}}else{z=65}}while(0);if((z|0)==65){X=c[g>>2]|0}if((X|0)!=0){if((c[X+12>>2]|0)==(c[X+16>>2]|0)?(qc[c[(c[X>>2]|0)+36>>2]&127](X)|0)==-1:0){c[g>>2]=0;Y=0}else{Y=X}}else{Y=0}X=(Y|0)==0;g=c[h>>2]|0;do{if((g|0)!=0){if((c[g+12>>2]|0)==(c[g+16>>2]|0)?(qc[c[(c[g>>2]|0)+36>>2]&127](g)|0)==-1:0){c[h>>2]=0;z=75;break}if(X){c[e>>2]=Y;i=o;return}}else{z=75}}while(0);if((z|0)==75?!X:0){c[e>>2]=Y;i=o;return}c[k>>2]=c[k>>2]|2;c[e>>2]=Y;i=o;return}function Oh(a){a=a|0;var b=0;b=i;Wm(a);i=b;return}function Ph(a){a=a|0;return}function Qh(a){a=a|0;return 2}function Rh(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0;j=i;i=i+16|0;k=j+12|0;l=j+8|0;m=j+4|0;n=j;c[m>>2]=c[d>>2];c[n>>2]=c[e>>2];c[l+0>>2]=c[m+0>>2];c[k+0>>2]=c[n+0>>2];Nh(a,b,l,k,f,g,h,5640,5648|0);i=j;return}function Sh(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0;k=i;i=i+16|0;l=k+12|0;m=k+8|0;n=k+4|0;o=k;p=d+8|0;q=qc[c[(c[p>>2]|0)+20>>2]&127](p)|0;c[n>>2]=c[e>>2];c[o>>2]=c[f>>2];f=a[q]|0;if((f&1)==0){r=q+1|0;s=(f&255)>>>1;t=q+1|0}else{f=c[q+8>>2]|0;r=f;s=c[q+4>>2]|0;t=f}f=r+s|0;c[m+0>>2]=c[n+0>>2];c[l+0>>2]=c[o+0>>2];Nh(b,d,m,l,g,h,j,t,f);i=k;return}function Th(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;j=i;i=i+32|0;k=j;l=j+16|0;m=j+12|0;Xe(m,f);f=c[m>>2]|0;if(!((c[1684]|0)==-1)){c[k>>2]=6736;c[k+4>>2]=117;c[k+8>>2]=0;ye(6736,k,118)}n=(c[6740>>2]|0)+ -1|0;o=c[f+8>>2]|0;if(!((c[f+12>>2]|0)-o>>2>>>0>n>>>0)){p=Ya(4)|0;um(p);zb(p|0,14696,106)}f=c[o+(n<<2)>>2]|0;if((f|0)==0){p=Ya(4)|0;um(p);zb(p|0,14696,106)}ee(c[m>>2]|0)|0;m=c[e>>2]|0;e=b+8|0;b=qc[c[c[e>>2]>>2]&127](e)|0;c[l>>2]=m;m=b+168|0;c[k+0>>2]=c[l+0>>2];l=(ng(d,k,b,m,f,g,0)|0)-b|0;if((l|0)>=168){q=c[d>>2]|0;c[a>>2]=q;i=j;return}c[h+24>>2]=((l|0)/12|0|0)%7|0;q=c[d>>2]|0;c[a>>2]=q;i=j;return}function Uh(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;j=i;i=i+32|0;k=j;l=j+16|0;m=j+12|0;Xe(m,f);f=c[m>>2]|0;if(!((c[1684]|0)==-1)){c[k>>2]=6736;c[k+4>>2]=117;c[k+8>>2]=0;ye(6736,k,118)}n=(c[6740>>2]|0)+ -1|0;o=c[f+8>>2]|0;if(!((c[f+12>>2]|0)-o>>2>>>0>n>>>0)){p=Ya(4)|0;um(p);zb(p|0,14696,106)}f=c[o+(n<<2)>>2]|0;if((f|0)==0){p=Ya(4)|0;um(p);zb(p|0,14696,106)}ee(c[m>>2]|0)|0;m=c[e>>2]|0;e=b+8|0;b=qc[c[(c[e>>2]|0)+4>>2]&127](e)|0;c[l>>2]=m;m=b+288|0;c[k+0>>2]=c[l+0>>2];l=(ng(d,k,b,m,f,g,0)|0)-b|0;if((l|0)>=288){q=c[d>>2]|0;c[a>>2]=q;i=j;return}c[h+16>>2]=((l|0)/12|0|0)%12|0;q=c[d>>2]|0;c[a>>2]=q;i=j;return}function Vh(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;b=i;i=i+32|0;j=b;k=b+16|0;l=b+12|0;Xe(l,f);f=c[l>>2]|0;if(!((c[1684]|0)==-1)){c[j>>2]=6736;c[j+4>>2]=117;c[j+8>>2]=0;ye(6736,j,118)}m=(c[6740>>2]|0)+ -1|0;n=c[f+8>>2]|0;if(!((c[f+12>>2]|0)-n>>2>>>0>m>>>0)){o=Ya(4)|0;um(o);zb(o|0,14696,106)}f=c[n+(m<<2)>>2]|0;if((f|0)==0){o=Ya(4)|0;um(o);zb(o|0,14696,106)}ee(c[l>>2]|0)|0;l=h+20|0;c[k>>2]=c[e>>2];c[j+0>>2]=c[k+0>>2];k=Zh(d,j,g,f,4)|0;if((c[g>>2]&4|0)!=0){p=c[d>>2]|0;c[a>>2]=p;i=b;return}if((k|0)<69){q=k+2e3|0}else{q=(k+ -69|0)>>>0<31?k+1900|0:k}c[l>>2]=q+ -1900;p=c[d>>2]|0;c[a>>2]=p;i=b;return}function Wh(b,d,e,f,g,h,j,k,l){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0;l=i;i=i+176|0;m=l;n=l+12|0;o=l+16|0;p=l+120|0;q=l+24|0;r=l+20|0;s=l+124|0;t=l+116|0;u=l+52|0;v=l+28|0;w=l+32|0;x=l+36|0;y=l+40|0;z=l+44|0;A=l+48|0;B=l+112|0;C=l+108|0;D=l+56|0;E=l+60|0;F=l+64|0;G=l+68|0;H=l+72|0;I=l+76|0;J=l+80|0;K=l+84|0;L=l+88|0;M=l+92|0;N=l+96|0;O=l+100|0;P=l+104|0;Q=l+128|0;R=l+132|0;S=l+136|0;T=l+140|0;U=l+144|0;V=l+148|0;W=l+152|0;X=l+156|0;Y=l+160|0;Z=l+164|0;c[h>>2]=0;Xe(A,g);_=c[A>>2]|0;if(!((c[1684]|0)==-1)){c[m>>2]=6736;c[m+4>>2]=117;c[m+8>>2]=0;ye(6736,m,118)}$=(c[6740>>2]|0)+ -1|0;aa=c[_+8>>2]|0;if(!((c[_+12>>2]|0)-aa>>2>>>0>$>>>0)){ba=Ya(4)|0;um(ba);zb(ba|0,14696,106)}_=c[aa+($<<2)>>2]|0;if((_|0)==0){ba=Ya(4)|0;um(ba);zb(ba|0,14696,106)}ee(c[A>>2]|0)|0;a:do{switch(k<<24>>24|0){case 65:case 97:{A=c[f>>2]|0;ba=d+8|0;$=qc[c[c[ba>>2]>>2]&127](ba)|0;c[z>>2]=A;c[m+0>>2]=c[z+0>>2];A=(ng(e,m,$,$+168|0,_,h,0)|0)-$|0;if((A|0)<168){c[j+24>>2]=((A|0)/12|0|0)%7|0}break};case 104:case 66:case 98:{A=c[f>>2]|0;$=d+8|0;ba=qc[c[(c[$>>2]|0)+4>>2]&127]($)|0;c[y>>2]=A;c[m+0>>2]=c[y+0>>2];A=(ng(e,m,ba,ba+288|0,_,h,0)|0)-ba|0;if((A|0)<288){c[j+16>>2]=((A|0)/12|0|0)%12|0}break};case 77:{c[s>>2]=c[f>>2];c[m+0>>2]=c[s+0>>2];A=Zh(e,m,h,_,2)|0;ba=c[h>>2]|0;if((ba&4|0)==0&(A|0)<60){c[j+4>>2]=A;break a}else{c[h>>2]=ba|4;break a}break};case 109:{c[t>>2]=c[f>>2];c[m+0>>2]=c[t+0>>2];ba=Zh(e,m,h,_,2)|0;A=c[h>>2]|0;if((A&4|0)==0&(ba|0)<13){c[j+16>>2]=ba+ -1;break a}else{c[h>>2]=A|4;break a}break};case 72:{c[w>>2]=c[f>>2];c[m+0>>2]=c[w+0>>2];A=Zh(e,m,h,_,2)|0;ba=c[h>>2]|0;if((ba&4|0)==0&(A|0)<24){c[j+8>>2]=A;break a}else{c[h>>2]=ba|4;break a}break};case 101:case 100:{ba=j+12|0;c[x>>2]=c[f>>2];c[m+0>>2]=c[x+0>>2];A=Zh(e,m,h,_,2)|0;$=c[h>>2]|0;if(($&4|0)==0?(A+ -1|0)>>>0<31:0){c[ba>>2]=A;break a}c[h>>2]=$|4;break};case 73:{$=j+8|0;c[v>>2]=c[f>>2];c[m+0>>2]=c[v+0>>2];A=Zh(e,m,h,_,2)|0;ba=c[h>>2]|0;if((ba&4|0)==0?(A+ -1|0)>>>0<12:0){c[$>>2]=A;break a}c[h>>2]=ba|4;break};case 99:{ba=d+8|0;A=qc[c[(c[ba>>2]|0)+12>>2]&127](ba)|0;c[C>>2]=c[e>>2];c[D>>2]=c[f>>2];ba=a[A]|0;if((ba&1)==0){ca=A+1|0;da=(ba&255)>>>1;ea=A+1|0}else{ba=c[A+8>>2]|0;ca=ba;da=c[A+4>>2]|0;ea=ba}c[n+0>>2]=c[C+0>>2];c[m+0>>2]=c[D+0>>2];Nh(B,d,n,m,g,h,j,ea,ca+da|0);c[e>>2]=c[B>>2];break};case 68:{c[F>>2]=c[e>>2];c[G>>2]=c[f>>2];c[n+0>>2]=c[F+0>>2];c[m+0>>2]=c[G+0>>2];Nh(E,d,n,m,g,h,j,5648,5656|0);c[e>>2]=c[E>>2];break};case 70:{c[I>>2]=c[e>>2];c[J>>2]=c[f>>2];c[n+0>>2]=c[I+0>>2];c[m+0>>2]=c[J+0>>2];Nh(H,d,n,m,g,h,j,5656,5664|0);c[e>>2]=c[H>>2];break};case 106:{c[u>>2]=c[f>>2];c[m+0>>2]=c[u+0>>2];ba=Zh(e,m,h,_,3)|0;A=c[h>>2]|0;if((A&4|0)==0&(ba|0)<366){c[j+28>>2]=ba;break a}else{c[h>>2]=A|4;break a}break};case 119:{c[p>>2]=c[f>>2];c[m+0>>2]=c[p+0>>2];A=Zh(e,m,h,_,1)|0;ba=c[h>>2]|0;if((ba&4|0)==0&(A|0)<7){c[j+24>>2]=A;break a}else{c[h>>2]=ba|4;break a}break};case 116:case 110:{c[K>>2]=c[f>>2];c[m+0>>2]=c[K+0>>2];Xh(0,e,m,h,_);break};case 82:{c[P>>2]=c[e>>2];c[Q>>2]=c[f>>2];c[n+0>>2]=c[P+0>>2];c[m+0>>2]=c[Q+0>>2];Nh(O,d,n,m,g,h,j,5680,5685|0);c[e>>2]=c[O>>2];break};case 114:{c[M>>2]=c[e>>2];c[N>>2]=c[f>>2];c[n+0>>2]=c[M+0>>2];c[m+0>>2]=c[N+0>>2];Nh(L,d,n,m,g,h,j,5664,5675|0);c[e>>2]=c[L>>2];break};case 120:{ba=c[(c[d>>2]|0)+20>>2]|0;c[U>>2]=c[e>>2];c[V>>2]=c[f>>2];c[n+0>>2]=c[U+0>>2];c[m+0>>2]=c[V+0>>2];lc[ba&63](b,d,n,m,g,h,j);i=l;return};case 88:{ba=d+8|0;A=qc[c[(c[ba>>2]|0)+24>>2]&127](ba)|0;c[X>>2]=c[e>>2];c[Y>>2]=c[f>>2];ba=a[A]|0;if((ba&1)==0){fa=A+1|0;ga=(ba&255)>>>1;ha=A+1|0}else{ba=c[A+8>>2]|0;fa=ba;ga=c[A+4>>2]|0;ha=ba}c[n+0>>2]=c[X+0>>2];c[m+0>>2]=c[Y+0>>2];Nh(W,d,n,m,g,h,j,ha,fa+ga|0);c[e>>2]=c[W>>2];break};case 121:{ba=j+20|0;c[o>>2]=c[f>>2];c[m+0>>2]=c[o+0>>2];A=Zh(e,m,h,_,4)|0;if((c[h>>2]&4|0)==0){if((A|0)<69){ia=A+2e3|0}else{ia=(A+ -69|0)>>>0<31?A+1900|0:A}c[ba>>2]=ia+ -1900}break};case 83:{c[q>>2]=c[f>>2];c[m+0>>2]=c[q+0>>2];ba=Zh(e,m,h,_,2)|0;A=c[h>>2]|0;if((A&4|0)==0&(ba|0)<61){c[j>>2]=ba;break a}else{c[h>>2]=A|4;break a}break};case 84:{c[S>>2]=c[e>>2];c[T>>2]=c[f>>2];c[n+0>>2]=c[S+0>>2];c[m+0>>2]=c[T+0>>2];Nh(R,d,n,m,g,h,j,5688,5696|0);c[e>>2]=c[R>>2];break};case 112:{A=j+8|0;ba=c[f>>2]|0;$=d+8|0;aa=qc[c[(c[$>>2]|0)+8>>2]&127]($)|0;$=a[aa]|0;if(($&1)==0){ja=($&255)>>>1}else{ja=c[aa+4>>2]|0}$=a[aa+12|0]|0;if(($&1)==0){ka=($&255)>>>1}else{ka=c[aa+16>>2]|0}if((ja|0)==(0-ka|0)){c[h>>2]=c[h>>2]|4;break a}c[r>>2]=ba;c[m+0>>2]=c[r+0>>2];ba=ng(e,m,aa,aa+24|0,_,h,0)|0;$=ba-aa|0;if((ba|0)==(aa|0)?(c[A>>2]|0)==12:0){c[A>>2]=0;break a}if(($|0)==12?($=c[A>>2]|0,($|0)<12):0){c[A>>2]=$+12}break};case 89:{c[n>>2]=c[f>>2];c[m+0>>2]=c[n+0>>2];$=Zh(e,m,h,_,4)|0;if((c[h>>2]&4|0)==0){c[j+20>>2]=$+ -1900}break};case 37:{c[Z>>2]=c[f>>2];c[m+0>>2]=c[Z+0>>2];Yh(0,e,m,h,_);break};default:{c[h>>2]=c[h>>2]|4}}}while(0);c[b>>2]=c[e>>2];i=l;return}function Xh(a,e,f,g,h){a=a|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0;a=i;j=h+8|0;a:while(1){h=c[e>>2]|0;do{if((h|0)!=0){if((c[h+12>>2]|0)==(c[h+16>>2]|0)){if((qc[c[(c[h>>2]|0)+36>>2]&127](h)|0)==-1){c[e>>2]=0;k=0;break}else{k=c[e>>2]|0;break}}else{k=h}}else{k=0}}while(0);h=(k|0)==0;l=c[f>>2]|0;do{if((l|0)!=0){if((c[l+12>>2]|0)!=(c[l+16>>2]|0)){if(h){m=l;break}else{n=l;break a}}if(!((qc[c[(c[l>>2]|0)+36>>2]&127](l)|0)==-1)){if(h){m=l;break}else{n=l;break a}}else{c[f>>2]=0;o=12;break}}else{o=12}}while(0);if((o|0)==12){o=0;if(h){n=0;break}else{m=0}}l=c[e>>2]|0;p=c[l+12>>2]|0;if((p|0)==(c[l+16>>2]|0)){q=qc[c[(c[l>>2]|0)+36>>2]&127](l)|0}else{q=d[p]|0}if(!((q&255)<<24>>24>-1)){n=m;break}if((b[(c[j>>2]|0)+(q<<24>>24<<1)>>1]&8192)==0){n=m;break}p=c[e>>2]|0;l=p+12|0;r=c[l>>2]|0;if((r|0)==(c[p+16>>2]|0)){qc[c[(c[p>>2]|0)+40>>2]&127](p)|0;continue}else{c[l>>2]=r+1;continue}}m=c[e>>2]|0;do{if((m|0)!=0){if((c[m+12>>2]|0)==(c[m+16>>2]|0)){if((qc[c[(c[m>>2]|0)+36>>2]&127](m)|0)==-1){c[e>>2]=0;s=0;break}else{s=c[e>>2]|0;break}}else{s=m}}else{s=0}}while(0);m=(s|0)==0;do{if((n|0)!=0){if((c[n+12>>2]|0)==(c[n+16>>2]|0)?(qc[c[(c[n>>2]|0)+36>>2]&127](n)|0)==-1:0){c[f>>2]=0;o=32;break}if(m){i=a;return}}else{o=32}}while(0);if((o|0)==32?!m:0){i=a;return}c[g>>2]=c[g>>2]|2;i=a;return}function Yh(a,b,e,f,g){a=a|0;b=b|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0;a=i;h=c[b>>2]|0;do{if((h|0)!=0){if((c[h+12>>2]|0)==(c[h+16>>2]|0)){if((qc[c[(c[h>>2]|0)+36>>2]&127](h)|0)==-1){c[b>>2]=0;j=0;break}else{j=c[b>>2]|0;break}}else{j=h}}else{j=0}}while(0);h=(j|0)==0;j=c[e>>2]|0;do{if((j|0)!=0){if((c[j+12>>2]|0)==(c[j+16>>2]|0)?(qc[c[(c[j>>2]|0)+36>>2]&127](j)|0)==-1:0){c[e>>2]=0;k=11;break}if(h){l=j}else{k=12}}else{k=11}}while(0);if((k|0)==11){if(h){k=12}else{l=0}}if((k|0)==12){c[f>>2]=c[f>>2]|6;i=a;return}h=c[b>>2]|0;j=c[h+12>>2]|0;if((j|0)==(c[h+16>>2]|0)){m=qc[c[(c[h>>2]|0)+36>>2]&127](h)|0}else{m=d[j]|0}if(!((ic[c[(c[g>>2]|0)+36>>2]&31](g,m&255,0)|0)<<24>>24==37)){c[f>>2]=c[f>>2]|4;i=a;return}m=c[b>>2]|0;g=m+12|0;j=c[g>>2]|0;if((j|0)==(c[m+16>>2]|0)){qc[c[(c[m>>2]|0)+40>>2]&127](m)|0}else{c[g>>2]=j+1}j=c[b>>2]|0;do{if((j|0)!=0){if((c[j+12>>2]|0)==(c[j+16>>2]|0)){if((qc[c[(c[j>>2]|0)+36>>2]&127](j)|0)==-1){c[b>>2]=0;n=0;break}else{n=c[b>>2]|0;break}}else{n=j}}else{n=0}}while(0);j=(n|0)==0;do{if((l|0)!=0){if((c[l+12>>2]|0)==(c[l+16>>2]|0)?(qc[c[(c[l>>2]|0)+36>>2]&127](l)|0)==-1:0){c[e>>2]=0;k=31;break}if(j){i=a;return}}else{k=31}}while(0);if((k|0)==31?!j:0){i=a;return}c[f>>2]=c[f>>2]|2;i=a;return}function Zh(a,e,f,g,h){a=a|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0;j=i;k=c[a>>2]|0;do{if((k|0)!=0){if((c[k+12>>2]|0)==(c[k+16>>2]|0)){if((qc[c[(c[k>>2]|0)+36>>2]&127](k)|0)==-1){c[a>>2]=0;l=0;break}else{l=c[a>>2]|0;break}}else{l=k}}else{l=0}}while(0);k=(l|0)==0;l=c[e>>2]|0;do{if((l|0)!=0){if((c[l+12>>2]|0)==(c[l+16>>2]|0)?(qc[c[(c[l>>2]|0)+36>>2]&127](l)|0)==-1:0){c[e>>2]=0;m=11;break}if(k){n=l}else{m=12}}else{m=11}}while(0);if((m|0)==11){if(k){m=12}else{n=0}}if((m|0)==12){c[f>>2]=c[f>>2]|6;o=0;i=j;return o|0}k=c[a>>2]|0;l=c[k+12>>2]|0;if((l|0)==(c[k+16>>2]|0)){p=qc[c[(c[k>>2]|0)+36>>2]&127](k)|0}else{p=d[l]|0}l=p&255;if(l<<24>>24>-1?(k=g+8|0,!((b[(c[k>>2]|0)+(p<<24>>24<<1)>>1]&2048)==0)):0){p=(ic[c[(c[g>>2]|0)+36>>2]&31](g,l,0)|0)<<24>>24;l=c[a>>2]|0;q=l+12|0;r=c[q>>2]|0;if((r|0)==(c[l+16>>2]|0)){qc[c[(c[l>>2]|0)+40>>2]&127](l)|0;s=h;t=n;u=n;v=p}else{c[q>>2]=r+1;s=h;t=n;u=n;v=p}while(1){w=v+ -48|0;p=s+ -1|0;n=c[a>>2]|0;do{if((n|0)!=0){if((c[n+12>>2]|0)==(c[n+16>>2]|0)){if((qc[c[(c[n>>2]|0)+36>>2]&127](n)|0)==-1){c[a>>2]=0;x=0;break}else{x=c[a>>2]|0;break}}else{x=n}}else{x=0}}while(0);n=(x|0)==0;if((u|0)!=0){if((c[u+12>>2]|0)==(c[u+16>>2]|0)){if((qc[c[(c[u>>2]|0)+36>>2]&127](u)|0)==-1){c[e>>2]=0;y=0;z=0}else{y=t;z=t}}else{y=t;z=u}}else{y=t;z=0}A=c[a>>2]|0;if(!((n^(z|0)==0)&(p|0)>0)){m=40;break}n=c[A+12>>2]|0;if((n|0)==(c[A+16>>2]|0)){B=qc[c[(c[A>>2]|0)+36>>2]&127](A)|0}else{B=d[n]|0}n=B&255;if(!(n<<24>>24>-1)){o=w;m=52;break}if((b[(c[k>>2]|0)+(B<<24>>24<<1)>>1]&2048)==0){o=w;m=52;break}h=((ic[c[(c[g>>2]|0)+36>>2]&31](g,n,0)|0)<<24>>24)+(w*10|0)|0;n=c[a>>2]|0;r=n+12|0;q=c[r>>2]|0;if((q|0)==(c[n+16>>2]|0)){qc[c[(c[n>>2]|0)+40>>2]&127](n)|0;s=p;t=y;u=z;v=h;continue}else{c[r>>2]=q+1;s=p;t=y;u=z;v=h;continue}}if((m|0)==40){do{if((A|0)!=0){if((c[A+12>>2]|0)==(c[A+16>>2]|0)){if((qc[c[(c[A>>2]|0)+36>>2]&127](A)|0)==-1){c[a>>2]=0;C=0;break}else{C=c[a>>2]|0;break}}else{C=A}}else{C=0}}while(0);A=(C|0)==0;do{if((y|0)!=0){if((c[y+12>>2]|0)==(c[y+16>>2]|0)?(qc[c[(c[y>>2]|0)+36>>2]&127](y)|0)==-1:0){c[e>>2]=0;m=50;break}if(A){o=w;i=j;return o|0}}else{m=50}}while(0);if((m|0)==50?!A:0){o=w;i=j;return o|0}c[f>>2]=c[f>>2]|2;o=w;i=j;return o|0}else if((m|0)==52){i=j;return o|0}}c[f>>2]=c[f>>2]|4;o=0;i=j;return o|0}function _h(a,b,d,e,f,g,h,j,k){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0;l=i;i=i+32|0;m=l;n=l+28|0;o=l+24|0;p=l+20|0;q=l+16|0;r=l+12|0;Xe(o,f);s=c[o>>2]|0;if(!((c[1682]|0)==-1)){c[m>>2]=6728;c[m+4>>2]=117;c[m+8>>2]=0;ye(6728,m,118)}t=(c[6732>>2]|0)+ -1|0;u=c[s+8>>2]|0;if(!((c[s+12>>2]|0)-u>>2>>>0>t>>>0)){v=Ya(4)|0;um(v);zb(v|0,14696,106)}s=c[u+(t<<2)>>2]|0;if((s|0)==0){v=Ya(4)|0;um(v);zb(v|0,14696,106)}ee(c[o>>2]|0)|0;c[g>>2]=0;a:do{if((j|0)!=(k|0)){o=j;v=0;b:while(1){t=v;while(1){if((t|0)!=0){w=69;break a}u=c[d>>2]|0;if((u|0)!=0){x=c[u+12>>2]|0;if((x|0)==(c[u+16>>2]|0)){y=qc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{y=c[x>>2]|0}if((y|0)==-1){c[d>>2]=0;z=1;A=0}else{z=0;A=u}}else{z=1;A=0}u=c[e>>2]|0;do{if((u|0)!=0){x=c[u+12>>2]|0;if((x|0)==(c[u+16>>2]|0)){B=qc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{B=c[x>>2]|0}if(!((B|0)==-1)){if(z){C=u;break}else{w=24;break b}}else{c[e>>2]=0;w=22;break}}else{w=22}}while(0);if((w|0)==22){w=0;if(z){w=24;break b}else{C=0}}if((ic[c[(c[s>>2]|0)+52>>2]&31](s,c[o>>2]|0,0)|0)<<24>>24==37){w=26;break}if(ic[c[(c[s>>2]|0)+12>>2]&31](s,8192,c[o>>2]|0)|0){D=o;w=36;break}E=A+12|0;u=c[E>>2]|0;F=A+16|0;if((u|0)==(c[F>>2]|0)){G=qc[c[(c[A>>2]|0)+36>>2]&127](A)|0}else{G=c[u>>2]|0}u=zc[c[(c[s>>2]|0)+28>>2]&15](s,G)|0;if((u|0)==(zc[c[(c[s>>2]|0)+28>>2]&15](s,c[o>>2]|0)|0)){w=64;break}c[g>>2]=4;t=4}c:do{if((w|0)==26){w=0;t=o+4|0;if((t|0)==(k|0)){w=27;break b}u=ic[c[(c[s>>2]|0)+52>>2]&31](s,c[t>>2]|0,0)|0;if(u<<24>>24==48|u<<24>>24==69){x=o+8|0;if((x|0)==(k|0)){w=30;break b}H=x;I=ic[c[(c[s>>2]|0)+52>>2]&31](s,c[x>>2]|0,0)|0;J=u}else{H=t;I=u;J=0}u=c[(c[b>>2]|0)+36>>2]|0;c[q>>2]=A;c[r>>2]=C;c[n+0>>2]=c[q+0>>2];c[m+0>>2]=c[r+0>>2];pc[u&3](p,b,n,m,f,g,h,I,J);c[d>>2]=c[p>>2];K=H+4|0}else if((w|0)==36){while(1){w=0;u=D+4|0;if((u|0)==(k|0)){L=k;break}if(ic[c[(c[s>>2]|0)+12>>2]&31](s,8192,c[u>>2]|0)|0){D=u;w=36}else{L=u;break}}u=A;t=C;x=C;while(1){if((u|0)!=0){M=c[u+12>>2]|0;if((M|0)==(c[u+16>>2]|0)){N=qc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{N=c[M>>2]|0}if((N|0)==-1){c[d>>2]=0;O=1;P=0}else{O=0;P=u}}else{O=1;P=0}do{if((x|0)!=0){M=c[x+12>>2]|0;if((M|0)==(c[x+16>>2]|0)){Q=qc[c[(c[x>>2]|0)+36>>2]&127](x)|0}else{Q=c[M>>2]|0}if(!((Q|0)==-1)){if(O^(t|0)==0){R=t;S=t;break}else{K=L;break c}}else{c[e>>2]=0;T=0;w=51;break}}else{T=t;w=51}}while(0);if((w|0)==51){w=0;if(O){K=L;break c}else{R=T;S=0}}M=P+12|0;U=c[M>>2]|0;V=P+16|0;if((U|0)==(c[V>>2]|0)){W=qc[c[(c[P>>2]|0)+36>>2]&127](P)|0}else{W=c[U>>2]|0}if(!(ic[c[(c[s>>2]|0)+12>>2]&31](s,8192,W)|0)){K=L;break c}U=c[M>>2]|0;if((U|0)==(c[V>>2]|0)){qc[c[(c[P>>2]|0)+40>>2]&127](P)|0;u=P;t=R;x=S;continue}else{c[M>>2]=U+4;u=P;t=R;x=S;continue}}}else if((w|0)==64){w=0;x=c[E>>2]|0;if((x|0)==(c[F>>2]|0)){qc[c[(c[A>>2]|0)+40>>2]&127](A)|0}else{c[E>>2]=x+4}K=o+4|0}}while(0);if((K|0)==(k|0)){w=69;break a}o=K;v=c[g>>2]|0}if((w|0)==24){c[g>>2]=4;X=A;break}else if((w|0)==27){c[g>>2]=4;X=A;break}else if((w|0)==30){c[g>>2]=4;X=A;break}}else{w=69}}while(0);if((w|0)==69){X=c[d>>2]|0}if((X|0)!=0){A=c[X+12>>2]|0;if((A|0)==(c[X+16>>2]|0)){Y=qc[c[(c[X>>2]|0)+36>>2]&127](X)|0}else{Y=c[A>>2]|0}if((Y|0)==-1){c[d>>2]=0;Z=0;_=1}else{Z=X;_=0}}else{Z=0;_=1}X=c[e>>2]|0;do{if((X|0)!=0){d=c[X+12>>2]|0;if((d|0)==(c[X+16>>2]|0)){$=qc[c[(c[X>>2]|0)+36>>2]&127](X)|0}else{$=c[d>>2]|0}if(($|0)==-1){c[e>>2]=0;w=82;break}if(_){c[a>>2]=Z;i=l;return}}else{w=82}}while(0);if((w|0)==82?!_:0){c[a>>2]=Z;i=l;return}c[g>>2]=c[g>>2]|2;c[a>>2]=Z;i=l;return}function $h(a){a=a|0;var b=0;b=i;Wm(a);i=b;return}function ai(a){a=a|0;return}function bi(a){a=a|0;return 2}function ci(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0;j=i;i=i+16|0;k=j+12|0;l=j+8|0;m=j+4|0;n=j;c[m>>2]=c[d>>2];c[n>>2]=c[e>>2];c[l+0>>2]=c[m+0>>2];c[k+0>>2]=c[n+0>>2];_h(a,b,l,k,f,g,h,5792,5824|0);i=j;return}function di(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0;k=i;i=i+16|0;l=k+12|0;m=k+8|0;n=k+4|0;o=k;p=d+8|0;q=qc[c[(c[p>>2]|0)+20>>2]&127](p)|0;c[n>>2]=c[e>>2];c[o>>2]=c[f>>2];f=a[q]|0;if((f&1)==0){r=q+4|0;s=(f&255)>>>1;t=q+4|0}else{f=c[q+8>>2]|0;r=f;s=c[q+4>>2]|0;t=f}f=r+(s<<2)|0;c[m+0>>2]=c[n+0>>2];c[l+0>>2]=c[o+0>>2];_h(b,d,m,l,g,h,j,t,f);i=k;return}function ei(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;j=i;i=i+32|0;k=j;l=j+16|0;m=j+12|0;Xe(m,f);f=c[m>>2]|0;if(!((c[1682]|0)==-1)){c[k>>2]=6728;c[k+4>>2]=117;c[k+8>>2]=0;ye(6728,k,118)}n=(c[6732>>2]|0)+ -1|0;o=c[f+8>>2]|0;if(!((c[f+12>>2]|0)-o>>2>>>0>n>>>0)){p=Ya(4)|0;um(p);zb(p|0,14696,106)}f=c[o+(n<<2)>>2]|0;if((f|0)==0){p=Ya(4)|0;um(p);zb(p|0,14696,106)}ee(c[m>>2]|0)|0;m=c[e>>2]|0;e=b+8|0;b=qc[c[c[e>>2]>>2]&127](e)|0;c[l>>2]=m;m=b+168|0;c[k+0>>2]=c[l+0>>2];l=(Mg(d,k,b,m,f,g,0)|0)-b|0;if((l|0)>=168){q=c[d>>2]|0;c[a>>2]=q;i=j;return}c[h+24>>2]=((l|0)/12|0|0)%7|0;q=c[d>>2]|0;c[a>>2]=q;i=j;return}function fi(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;j=i;i=i+32|0;k=j;l=j+16|0;m=j+12|0;Xe(m,f);f=c[m>>2]|0;if(!((c[1682]|0)==-1)){c[k>>2]=6728;c[k+4>>2]=117;c[k+8>>2]=0;ye(6728,k,118)}n=(c[6732>>2]|0)+ -1|0;o=c[f+8>>2]|0;if(!((c[f+12>>2]|0)-o>>2>>>0>n>>>0)){p=Ya(4)|0;um(p);zb(p|0,14696,106)}f=c[o+(n<<2)>>2]|0;if((f|0)==0){p=Ya(4)|0;um(p);zb(p|0,14696,106)}ee(c[m>>2]|0)|0;m=c[e>>2]|0;e=b+8|0;b=qc[c[(c[e>>2]|0)+4>>2]&127](e)|0;c[l>>2]=m;m=b+288|0;c[k+0>>2]=c[l+0>>2];l=(Mg(d,k,b,m,f,g,0)|0)-b|0;if((l|0)>=288){q=c[d>>2]|0;c[a>>2]=q;i=j;return}c[h+16>>2]=((l|0)/12|0|0)%12|0;q=c[d>>2]|0;c[a>>2]=q;i=j;return}function gi(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;b=i;i=i+32|0;j=b;k=b+16|0;l=b+12|0;Xe(l,f);f=c[l>>2]|0;if(!((c[1682]|0)==-1)){c[j>>2]=6728;c[j+4>>2]=117;c[j+8>>2]=0;ye(6728,j,118)}m=(c[6732>>2]|0)+ -1|0;n=c[f+8>>2]|0;if(!((c[f+12>>2]|0)-n>>2>>>0>m>>>0)){o=Ya(4)|0;um(o);zb(o|0,14696,106)}f=c[n+(m<<2)>>2]|0;if((f|0)==0){o=Ya(4)|0;um(o);zb(o|0,14696,106)}ee(c[l>>2]|0)|0;l=h+20|0;c[k>>2]=c[e>>2];c[j+0>>2]=c[k+0>>2];k=ki(d,j,g,f,4)|0;if((c[g>>2]&4|0)!=0){p=c[d>>2]|0;c[a>>2]=p;i=b;return}if((k|0)<69){q=k+2e3|0}else{q=(k+ -69|0)>>>0<31?k+1900|0:k}c[l>>2]=q+ -1900;p=c[d>>2]|0;c[a>>2]=p;i=b;return}function hi(b,d,e,f,g,h,j,k,l){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0;l=i;i=i+176|0;m=l;n=l+12|0;o=l+16|0;p=l+120|0;q=l+24|0;r=l+20|0;s=l+124|0;t=l+116|0;u=l+52|0;v=l+28|0;w=l+32|0;x=l+36|0;y=l+40|0;z=l+44|0;A=l+48|0;B=l+112|0;C=l+108|0;D=l+56|0;E=l+60|0;F=l+64|0;G=l+68|0;H=l+72|0;I=l+76|0;J=l+80|0;K=l+84|0;L=l+88|0;M=l+92|0;N=l+96|0;O=l+100|0;P=l+104|0;Q=l+128|0;R=l+132|0;S=l+136|0;T=l+140|0;U=l+144|0;V=l+148|0;W=l+152|0;X=l+156|0;Y=l+160|0;Z=l+164|0;c[h>>2]=0;Xe(A,g);_=c[A>>2]|0;if(!((c[1682]|0)==-1)){c[m>>2]=6728;c[m+4>>2]=117;c[m+8>>2]=0;ye(6728,m,118)}$=(c[6732>>2]|0)+ -1|0;aa=c[_+8>>2]|0;if(!((c[_+12>>2]|0)-aa>>2>>>0>$>>>0)){ba=Ya(4)|0;um(ba);zb(ba|0,14696,106)}_=c[aa+($<<2)>>2]|0;if((_|0)==0){ba=Ya(4)|0;um(ba);zb(ba|0,14696,106)}ee(c[A>>2]|0)|0;a:do{switch(k<<24>>24|0){case 101:case 100:{A=j+12|0;c[x>>2]=c[f>>2];c[m+0>>2]=c[x+0>>2];ba=ki(e,m,h,_,2)|0;$=c[h>>2]|0;if(($&4|0)==0?(ba+ -1|0)>>>0<31:0){c[A>>2]=ba;break a}c[h>>2]=$|4;break};case 99:{$=d+8|0;ba=qc[c[(c[$>>2]|0)+12>>2]&127]($)|0;c[C>>2]=c[e>>2];c[D>>2]=c[f>>2];$=a[ba]|0;if(($&1)==0){ca=ba+4|0;da=($&255)>>>1;ea=ba+4|0}else{$=c[ba+8>>2]|0;ca=$;da=c[ba+4>>2]|0;ea=$}c[n+0>>2]=c[C+0>>2];c[m+0>>2]=c[D+0>>2];_h(B,d,n,m,g,h,j,ea,ca+(da<<2)|0);c[e>>2]=c[B>>2];break};case 70:{c[I>>2]=c[e>>2];c[J>>2]=c[f>>2];c[n+0>>2]=c[I+0>>2];c[m+0>>2]=c[J+0>>2];_h(H,d,n,m,g,h,j,5856,5888|0);c[e>>2]=c[H>>2];break};case 104:case 66:case 98:{$=c[f>>2]|0;ba=d+8|0;A=qc[c[(c[ba>>2]|0)+4>>2]&127](ba)|0;c[y>>2]=$;c[m+0>>2]=c[y+0>>2];$=(Mg(e,m,A,A+288|0,_,h,0)|0)-A|0;if(($|0)<288){c[j+16>>2]=(($|0)/12|0|0)%12|0}break};case 68:{c[F>>2]=c[e>>2];c[G>>2]=c[f>>2];c[n+0>>2]=c[F+0>>2];c[m+0>>2]=c[G+0>>2];_h(E,d,n,m,g,h,j,5824,5856|0);c[e>>2]=c[E>>2];break};case 77:{c[s>>2]=c[f>>2];c[m+0>>2]=c[s+0>>2];$=ki(e,m,h,_,2)|0;A=c[h>>2]|0;if((A&4|0)==0&($|0)<60){c[j+4>>2]=$;break a}else{c[h>>2]=A|4;break a}break};case 65:case 97:{A=c[f>>2]|0;$=d+8|0;ba=qc[c[c[$>>2]>>2]&127]($)|0;c[z>>2]=A;c[m+0>>2]=c[z+0>>2];A=(Mg(e,m,ba,ba+168|0,_,h,0)|0)-ba|0;if((A|0)<168){c[j+24>>2]=((A|0)/12|0|0)%7|0}break};case 112:{A=j+8|0;ba=c[f>>2]|0;$=d+8|0;aa=qc[c[(c[$>>2]|0)+8>>2]&127]($)|0;$=a[aa]|0;if(($&1)==0){fa=($&255)>>>1}else{fa=c[aa+4>>2]|0}$=a[aa+12|0]|0;if(($&1)==0){ga=($&255)>>>1}else{ga=c[aa+16>>2]|0}if((fa|0)==(0-ga|0)){c[h>>2]=c[h>>2]|4;break a}c[r>>2]=ba;c[m+0>>2]=c[r+0>>2];ba=Mg(e,m,aa,aa+24|0,_,h,0)|0;$=ba-aa|0;if((ba|0)==(aa|0)?(c[A>>2]|0)==12:0){c[A>>2]=0;break a}if(($|0)==12?($=c[A>>2]|0,($|0)<12):0){c[A>>2]=$+12}break};case 73:{$=j+8|0;c[v>>2]=c[f>>2];c[m+0>>2]=c[v+0>>2];A=ki(e,m,h,_,2)|0;aa=c[h>>2]|0;if((aa&4|0)==0?(A+ -1|0)>>>0<12:0){c[$>>2]=A;break a}c[h>>2]=aa|4;break};case 72:{c[w>>2]=c[f>>2];c[m+0>>2]=c[w+0>>2];aa=ki(e,m,h,_,2)|0;A=c[h>>2]|0;if((A&4|0)==0&(aa|0)<24){c[j+8>>2]=aa;break a}else{c[h>>2]=A|4;break a}break};case 106:{c[u>>2]=c[f>>2];c[m+0>>2]=c[u+0>>2];A=ki(e,m,h,_,3)|0;aa=c[h>>2]|0;if((aa&4|0)==0&(A|0)<366){c[j+28>>2]=A;break a}else{c[h>>2]=aa|4;break a}break};case 114:{c[M>>2]=c[e>>2];c[N>>2]=c[f>>2];c[n+0>>2]=c[M+0>>2];c[m+0>>2]=c[N+0>>2];_h(L,d,n,m,g,h,j,5888,5932|0);c[e>>2]=c[L>>2];break};case 121:{aa=j+20|0;c[o>>2]=c[f>>2];c[m+0>>2]=c[o+0>>2];A=ki(e,m,h,_,4)|0;if((c[h>>2]&4|0)==0){if((A|0)<69){ha=A+2e3|0}else{ha=(A+ -69|0)>>>0<31?A+1900|0:A}c[aa>>2]=ha+ -1900}break};case 83:{c[q>>2]=c[f>>2];c[m+0>>2]=c[q+0>>2];aa=ki(e,m,h,_,2)|0;A=c[h>>2]|0;if((A&4|0)==0&(aa|0)<61){c[j>>2]=aa;break a}else{c[h>>2]=A|4;break a}break};case 84:{c[S>>2]=c[e>>2];c[T>>2]=c[f>>2];c[n+0>>2]=c[S+0>>2];c[m+0>>2]=c[T+0>>2];_h(R,d,n,m,g,h,j,5960,5992|0);c[e>>2]=c[R>>2];break};case 119:{c[p>>2]=c[f>>2];c[m+0>>2]=c[p+0>>2];A=ki(e,m,h,_,1)|0;aa=c[h>>2]|0;if((aa&4|0)==0&(A|0)<7){c[j+24>>2]=A;break a}else{c[h>>2]=aa|4;break a}break};case 88:{aa=d+8|0;A=qc[c[(c[aa>>2]|0)+24>>2]&127](aa)|0;c[X>>2]=c[e>>2];c[Y>>2]=c[f>>2];aa=a[A]|0;if((aa&1)==0){ia=A+4|0;ja=(aa&255)>>>1;ka=A+4|0}else{aa=c[A+8>>2]|0;ia=aa;ja=c[A+4>>2]|0;ka=aa}c[n+0>>2]=c[X+0>>2];c[m+0>>2]=c[Y+0>>2];_h(W,d,n,m,g,h,j,ka,ia+(ja<<2)|0);c[e>>2]=c[W>>2];break};case 109:{c[t>>2]=c[f>>2];c[m+0>>2]=c[t+0>>2];aa=ki(e,m,h,_,2)|0;A=c[h>>2]|0;if((A&4|0)==0&(aa|0)<13){c[j+16>>2]=aa+ -1;break a}else{c[h>>2]=A|4;break a}break};case 120:{A=c[(c[d>>2]|0)+20>>2]|0;c[U>>2]=c[e>>2];c[V>>2]=c[f>>2];c[n+0>>2]=c[U+0>>2];c[m+0>>2]=c[V+0>>2];lc[A&63](b,d,n,m,g,h,j);i=l;return};case 116:case 110:{c[K>>2]=c[f>>2];c[m+0>>2]=c[K+0>>2];ii(0,e,m,h,_);break};case 89:{c[n>>2]=c[f>>2];c[m+0>>2]=c[n+0>>2];A=ki(e,m,h,_,4)|0;if((c[h>>2]&4|0)==0){c[j+20>>2]=A+ -1900}break};case 37:{c[Z>>2]=c[f>>2];c[m+0>>2]=c[Z+0>>2];ji(0,e,m,h,_);break};case 82:{c[P>>2]=c[e>>2];c[Q>>2]=c[f>>2];c[n+0>>2]=c[P+0>>2];c[m+0>>2]=c[Q+0>>2];_h(O,d,n,m,g,h,j,5936,5956|0);c[e>>2]=c[O>>2];break};default:{c[h>>2]=c[h>>2]|4}}}while(0);c[b>>2]=c[e>>2];i=l;return}function ii(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0;a=i;a:while(1){g=c[b>>2]|0;do{if((g|0)!=0){h=c[g+12>>2]|0;if((h|0)==(c[g+16>>2]|0)){j=qc[c[(c[g>>2]|0)+36>>2]&127](g)|0}else{j=c[h>>2]|0}if((j|0)==-1){c[b>>2]=0;k=1;break}else{k=(c[b>>2]|0)==0;break}}else{k=1}}while(0);g=c[d>>2]|0;do{if((g|0)!=0){h=c[g+12>>2]|0;if((h|0)==(c[g+16>>2]|0)){l=qc[c[(c[g>>2]|0)+36>>2]&127](g)|0}else{l=c[h>>2]|0}if(!((l|0)==-1)){if(k){m=g;break}else{n=g;break a}}else{c[d>>2]=0;o=15;break}}else{o=15}}while(0);if((o|0)==15){o=0;if(k){n=0;break}else{m=0}}g=c[b>>2]|0;h=c[g+12>>2]|0;if((h|0)==(c[g+16>>2]|0)){p=qc[c[(c[g>>2]|0)+36>>2]&127](g)|0}else{p=c[h>>2]|0}if(!(ic[c[(c[f>>2]|0)+12>>2]&31](f,8192,p)|0)){n=m;break}h=c[b>>2]|0;g=h+12|0;q=c[g>>2]|0;if((q|0)==(c[h+16>>2]|0)){qc[c[(c[h>>2]|0)+40>>2]&127](h)|0;continue}else{c[g>>2]=q+4;continue}}m=c[b>>2]|0;do{if((m|0)!=0){p=c[m+12>>2]|0;if((p|0)==(c[m+16>>2]|0)){r=qc[c[(c[m>>2]|0)+36>>2]&127](m)|0}else{r=c[p>>2]|0}if((r|0)==-1){c[b>>2]=0;s=1;break}else{s=(c[b>>2]|0)==0;break}}else{s=1}}while(0);do{if((n|0)!=0){b=c[n+12>>2]|0;if((b|0)==(c[n+16>>2]|0)){t=qc[c[(c[n>>2]|0)+36>>2]&127](n)|0}else{t=c[b>>2]|0}if((t|0)==-1){c[d>>2]=0;o=37;break}if(s){i=a;return}}else{o=37}}while(0);if((o|0)==37?!s:0){i=a;return}c[e>>2]=c[e>>2]|2;i=a;return}function ji(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;a=i;g=c[b>>2]|0;do{if((g|0)!=0){h=c[g+12>>2]|0;if((h|0)==(c[g+16>>2]|0)){j=qc[c[(c[g>>2]|0)+36>>2]&127](g)|0}else{j=c[h>>2]|0}if((j|0)==-1){c[b>>2]=0;k=1;break}else{k=(c[b>>2]|0)==0;break}}else{k=1}}while(0);j=c[d>>2]|0;do{if((j|0)!=0){g=c[j+12>>2]|0;if((g|0)==(c[j+16>>2]|0)){l=qc[c[(c[j>>2]|0)+36>>2]&127](j)|0}else{l=c[g>>2]|0}if(!((l|0)==-1)){if(k){m=j;break}else{n=16;break}}else{c[d>>2]=0;n=14;break}}else{n=14}}while(0);if((n|0)==14){if(k){n=16}else{m=0}}if((n|0)==16){c[e>>2]=c[e>>2]|6;i=a;return}k=c[b>>2]|0;j=c[k+12>>2]|0;if((j|0)==(c[k+16>>2]|0)){o=qc[c[(c[k>>2]|0)+36>>2]&127](k)|0}else{o=c[j>>2]|0}if(!((ic[c[(c[f>>2]|0)+52>>2]&31](f,o,0)|0)<<24>>24==37)){c[e>>2]=c[e>>2]|4;i=a;return}o=c[b>>2]|0;f=o+12|0;j=c[f>>2]|0;if((j|0)==(c[o+16>>2]|0)){qc[c[(c[o>>2]|0)+40>>2]&127](o)|0}else{c[f>>2]=j+4}j=c[b>>2]|0;do{if((j|0)!=0){f=c[j+12>>2]|0;if((f|0)==(c[j+16>>2]|0)){p=qc[c[(c[j>>2]|0)+36>>2]&127](j)|0}else{p=c[f>>2]|0}if((p|0)==-1){c[b>>2]=0;q=1;break}else{q=(c[b>>2]|0)==0;break}}else{q=1}}while(0);do{if((m|0)!=0){b=c[m+12>>2]|0;if((b|0)==(c[m+16>>2]|0)){r=qc[c[(c[m>>2]|0)+36>>2]&127](m)|0}else{r=c[b>>2]|0}if((r|0)==-1){c[d>>2]=0;n=38;break}if(q){i=a;return}}else{n=38}}while(0);if((n|0)==38?!q:0){i=a;return}c[e>>2]=c[e>>2]|2;i=a;return}function ki(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0;g=i;h=c[a>>2]|0;do{if((h|0)!=0){j=c[h+12>>2]|0;if((j|0)==(c[h+16>>2]|0)){k=qc[c[(c[h>>2]|0)+36>>2]&127](h)|0}else{k=c[j>>2]|0}if((k|0)==-1){c[a>>2]=0;l=1;break}else{l=(c[a>>2]|0)==0;break}}else{l=1}}while(0);k=c[b>>2]|0;do{if((k|0)!=0){h=c[k+12>>2]|0;if((h|0)==(c[k+16>>2]|0)){m=qc[c[(c[k>>2]|0)+36>>2]&127](k)|0}else{m=c[h>>2]|0}if(!((m|0)==-1)){if(l){n=k;break}else{o=16;break}}else{c[b>>2]=0;o=14;break}}else{o=14}}while(0);if((o|0)==14){if(l){o=16}else{n=0}}if((o|0)==16){c[d>>2]=c[d>>2]|6;p=0;i=g;return p|0}l=c[a>>2]|0;k=c[l+12>>2]|0;if((k|0)==(c[l+16>>2]|0)){q=qc[c[(c[l>>2]|0)+36>>2]&127](l)|0}else{q=c[k>>2]|0}if(!(ic[c[(c[e>>2]|0)+12>>2]&31](e,2048,q)|0)){c[d>>2]=c[d>>2]|4;p=0;i=g;return p|0}k=(ic[c[(c[e>>2]|0)+52>>2]&31](e,q,0)|0)<<24>>24;q=c[a>>2]|0;l=q+12|0;m=c[l>>2]|0;if((m|0)==(c[q+16>>2]|0)){qc[c[(c[q>>2]|0)+40>>2]&127](q)|0;r=f;s=n;t=n;u=k}else{c[l>>2]=m+4;r=f;s=n;t=n;u=k}while(1){v=u+ -48|0;k=r+ -1|0;n=c[a>>2]|0;do{if((n|0)!=0){f=c[n+12>>2]|0;if((f|0)==(c[n+16>>2]|0)){w=qc[c[(c[n>>2]|0)+36>>2]&127](n)|0}else{w=c[f>>2]|0}if((w|0)==-1){c[a>>2]=0;x=1;break}else{x=(c[a>>2]|0)==0;break}}else{x=1}}while(0);do{if((t|0)!=0){n=c[t+12>>2]|0;if((n|0)==(c[t+16>>2]|0)){y=qc[c[(c[t>>2]|0)+36>>2]&127](t)|0}else{y=c[n>>2]|0}if((y|0)==-1){c[b>>2]=0;z=0;A=0;B=1;break}else{z=s;A=s;B=(s|0)==0;break}}else{z=s;A=0;B=1}}while(0);C=c[a>>2]|0;if(!((x^B)&(k|0)>0)){break}n=c[C+12>>2]|0;if((n|0)==(c[C+16>>2]|0)){D=qc[c[(c[C>>2]|0)+36>>2]&127](C)|0}else{D=c[n>>2]|0}if(!(ic[c[(c[e>>2]|0)+12>>2]&31](e,2048,D)|0)){p=v;o=63;break}n=((ic[c[(c[e>>2]|0)+52>>2]&31](e,D,0)|0)<<24>>24)+(v*10|0)|0;f=c[a>>2]|0;m=f+12|0;l=c[m>>2]|0;if((l|0)==(c[f+16>>2]|0)){qc[c[(c[f>>2]|0)+40>>2]&127](f)|0;r=k;s=z;t=A;u=n;continue}else{c[m>>2]=l+4;r=k;s=z;t=A;u=n;continue}}if((o|0)==63){i=g;return p|0}do{if((C|0)!=0){u=c[C+12>>2]|0;if((u|0)==(c[C+16>>2]|0)){E=qc[c[(c[C>>2]|0)+36>>2]&127](C)|0}else{E=c[u>>2]|0}if((E|0)==-1){c[a>>2]=0;F=1;break}else{F=(c[a>>2]|0)==0;break}}else{F=1}}while(0);do{if((z|0)!=0){a=c[z+12>>2]|0;if((a|0)==(c[z+16>>2]|0)){G=qc[c[(c[z>>2]|0)+36>>2]&127](z)|0}else{G=c[a>>2]|0}if((G|0)==-1){c[b>>2]=0;o=60;break}if(F){p=v;i=g;return p|0}}else{o=60}}while(0);if((o|0)==60?!F:0){p=v;i=g;return p|0}c[d>>2]=c[d>>2]|2;p=v;i=g;return p|0}function li(b){b=b|0;var d=0,e=0,f=0;d=i;e=b+8|0;f=c[e>>2]|0;if((a[6632]|0)==0?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}if((f|0)==(c[1656]|0)){Wm(b);i=d;return}Ga(c[e>>2]|0);Wm(b);i=d;return}function mi(b){b=b|0;var d=0,e=0;d=i;e=b+8|0;b=c[e>>2]|0;if((a[6632]|0)==0?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}if((b|0)==(c[1656]|0)){i=d;return}Ga(c[e>>2]|0);i=d;return}function ni(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0;g=i;i=i+112|0;f=g+100|0;l=g;a[f]=37;m=f+1|0;a[m]=j;n=f+2|0;a[n]=k;a[f+3|0]=0;if(!(k<<24>>24==0)){a[m]=k;a[n]=j}j=gb(l|0,100,f|0,h|0,c[d+8>>2]|0)|0;d=l+j|0;h=c[e>>2]|0;if((j|0)==0){o=h;c[b>>2]=o;i=g;return}else{p=l;q=h;r=h}while(1){h=a[p]|0;do{if((q|0)!=0){l=q+24|0;j=c[l>>2]|0;if((j|0)==(c[q+28>>2]|0)){e=(zc[c[(c[q>>2]|0)+52>>2]&15](q,h&255)|0)==-1;s=e?0:r;t=e?0:q;break}else{c[l>>2]=j+1;a[j]=h;s=r;t=q;break}}else{s=r;t=0}}while(0);h=p+1|0;if((h|0)==(d|0)){o=s;break}else{p=h;q=t;r=s}}c[b>>2]=o;i=g;return}function oi(b){b=b|0;var d=0,e=0,f=0;d=i;e=b+8|0;f=c[e>>2]|0;if((a[6632]|0)==0?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}if((f|0)==(c[1656]|0)){Wm(b);i=d;return}Ga(c[e>>2]|0);Wm(b);i=d;return}function pi(b){b=b|0;var d=0,e=0;d=i;e=b+8|0;b=c[e>>2]|0;if((a[6632]|0)==0?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}if((b|0)==(c[1656]|0)){i=d;return}Ga(c[e>>2]|0);i=d;return}function qi(a,b,d,e,f,g,h,j){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;f=i;i=i+416|0;e=f+8|0;k=f;c[k>>2]=e+400;ri(b+8|0,e,k,g,h,j);j=c[k>>2]|0;k=c[d>>2]|0;if((e|0)==(j|0)){l=k;c[a>>2]=l;i=f;return}else{m=e;n=k;o=k}while(1){k=c[m>>2]|0;if((o|0)==0){p=n;q=0}else{e=o+24|0;d=c[e>>2]|0;if((d|0)==(c[o+28>>2]|0)){r=zc[c[(c[o>>2]|0)+52>>2]&15](o,k)|0}else{c[e>>2]=d+4;c[d>>2]=k;r=k}k=(r|0)==-1;p=k?0:n;q=k?0:o}k=m+4|0;if((k|0)==(j|0)){l=p;break}else{m=k;n=p;o=q}}c[a>>2]=l;i=f;return}function ri(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0;j=i;i=i+128|0;k=j+112|0;l=j+12|0;m=j;n=j+8|0;a[k]=37;o=k+1|0;a[o]=g;p=k+2|0;a[p]=h;a[k+3|0]=0;if(!(h<<24>>24==0)){a[o]=h;a[p]=g}gb(l|0,100,k|0,f|0,c[b>>2]|0)|0;f=m;c[f>>2]=0;c[f+4>>2]=0;c[n>>2]=l;l=(c[e>>2]|0)-d>>2;f=kb(c[b>>2]|0)|0;b=km(d,n,l,m)|0;if((f|0)!=0){kb(f|0)|0}if((b|0)==-1){nj(7616)}else{c[e>>2]=d+(b<<2);i=j;return}}function si(a){a=a|0;var b=0;b=i;Wm(a);i=b;return}function ti(a){a=a|0;return}function ui(a){a=a|0;return 127}function vi(a){a=a|0;return 127}function wi(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function xi(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function yi(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function zi(a,b){a=a|0;b=b|0;b=i;Ce(a,1,45);i=b;return}function Ai(a){a=a|0;return 0}function Bi(b,c){b=b|0;c=c|0;a[b]=67109634;a[b+1|0]=262147;a[b+2|0]=1024;a[b+3|0]=4;return}function Ci(b,c){b=b|0;c=c|0;a[b]=67109634;a[b+1|0]=262147;a[b+2|0]=1024;a[b+3|0]=4;return}function Di(a){a=a|0;var b=0;b=i;Wm(a);i=b;return}function Ei(a){a=a|0;return}function Fi(a){a=a|0;return 127}function Gi(a){a=a|0;return 127}function Hi(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function Ii(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function Ji(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function Ki(a,b){a=a|0;b=b|0;b=i;Ce(a,1,45);i=b;return}function Li(a){a=a|0;return 0}function Mi(b,c){b=b|0;c=c|0;a[b]=67109634;a[b+1|0]=262147;a[b+2|0]=1024;a[b+3|0]=4;return}function Ni(b,c){b=b|0;c=c|0;a[b]=67109634;a[b+1|0]=262147;a[b+2|0]=1024;a[b+3|0]=4;return}function Oi(a){a=a|0;var b=0;b=i;Wm(a);i=b;return}function Pi(a){a=a|0;return}function Qi(a){a=a|0;return 2147483647}function Ri(a){a=a|0;return 2147483647}function Si(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function Ti(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function Ui(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function Vi(a,b){a=a|0;b=b|0;b=i;Ne(a,1,45);i=b;return}function Wi(a){a=a|0;return 0}function Xi(b,c){b=b|0;c=c|0;a[b]=67109634;a[b+1|0]=262147;a[b+2|0]=1024;a[b+3|0]=4;return}function Yi(b,c){b=b|0;c=c|0;a[b]=67109634;a[b+1|0]=262147;a[b+2|0]=1024;a[b+3|0]=4;return}function Zi(a){a=a|0;var b=0;b=i;Wm(a);i=b;return}function _i(a){a=a|0;return}function $i(a){a=a|0;return 2147483647}function aj(a){a=a|0;return 2147483647}function bj(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function cj(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function dj(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function ej(a,b){a=a|0;b=b|0;b=i;Ne(a,1,45);i=b;return}function fj(a){a=a|0;return 0}function gj(b,c){b=b|0;c=c|0;a[b]=67109634;a[b+1|0]=262147;a[b+2|0]=1024;a[b+3|0]=4;return}function hj(b,c){b=b|0;c=c|0;a[b]=67109634;a[b+1|0]=262147;a[b+2|0]=1024;a[b+3|0]=4;return}function ij(a){a=a|0;var b=0;b=i;Wm(a);i=b;return}function jj(a){a=a|0;return}function kj(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0;d=i;i=i+256|0;l=d;m=d+144|0;n=d+16|0;o=d+12|0;p=d+28|0;q=d+244|0;r=d+24|0;s=d+132|0;t=d+32|0;c[n>>2]=m;u=n+4|0;c[u>>2]=119;v=m+100|0;Xe(p,h);m=c[p>>2]|0;if(!((c[1684]|0)==-1)){c[l>>2]=6736;c[l+4>>2]=117;c[l+8>>2]=0;ye(6736,l,118)}w=(c[6740>>2]|0)+ -1|0;x=c[m+8>>2]|0;if(!((c[m+12>>2]|0)-x>>2>>>0>w>>>0)){y=Ya(4)|0;um(y);zb(y|0,14696,106)}m=c[x+(w<<2)>>2]|0;if((m|0)==0){y=Ya(4)|0;um(y);zb(y|0,14696,106)}a[q]=0;c[r>>2]=c[f>>2];y=c[h+4>>2]|0;c[l+0>>2]=c[r+0>>2];if(mj(e,l,g,p,y,j,q,m,n,o,v)|0){wc[c[(c[m>>2]|0)+32>>2]&7](m,6352,6362|0,s)|0;m=c[o>>2]|0;v=c[n>>2]|0;y=m-v|0;if((y|0)>98){g=Pm(y+2|0)|0;if((g|0)==0){$m()}else{z=g;A=g}}else{z=0;A=t}if((a[q]|0)==0){B=A}else{a[A]=45;B=A+1|0}if(v>>>0<m>>>0){m=s+10|0;A=s;q=B;g=v;while(1){v=a[g]|0;y=s;while(1){r=y+1|0;if((a[y]|0)==v<<24>>24){C=y;break}if((r|0)==(m|0)){C=m;break}else{y=r}}a[q]=a[6352+(C-A)|0]|0;y=g+1|0;v=q+1|0;if(y>>>0<(c[o>>2]|0)>>>0){q=v;g=y}else{D=v;break}}}else{D=B}a[D]=0;c[l>>2]=k;if((ib(t|0,6368,l|0)|0)!=1){l=Ya(8)|0;ke(l,6376);zb(l|0,3744,16)}if((z|0)!=0){Qm(z)}}z=c[e>>2]|0;if((z|0)!=0){if((c[z+12>>2]|0)==(c[z+16>>2]|0)?(qc[c[(c[z>>2]|0)+36>>2]&127](z)|0)==-1:0){c[e>>2]=0;E=0}else{E=z}}else{E=0}z=(E|0)==0;e=c[f>>2]|0;do{if((e|0)!=0){if((c[e+12>>2]|0)!=(c[e+16>>2]|0)){if(z){break}else{F=33;break}}if(!((qc[c[(c[e>>2]|0)+36>>2]&127](e)|0)==-1)){if(z){break}else{F=33;break}}else{c[f>>2]=0;F=31;break}}else{F=31}}while(0);if((F|0)==31?z:0){F=33}if((F|0)==33){c[j>>2]=c[j>>2]|2}c[b>>2]=E;ee(c[p>>2]|0)|0;p=c[n>>2]|0;c[n>>2]=0;if((p|0)==0){i=d;return}nc[c[u>>2]&255](p);i=d;return}function lj(a){a=a|0;return}



function Cc(a){a=a|0;var b=0;b=i;i=i+a|0;i=i+7&-8;return b|0}function Dc(){return i|0}function Ec(a){a=a|0;i=a}function Fc(a,b){a=a|0;b=b|0;if((t|0)==0){t=a;u=b}}function Gc(b){b=b|0;a[k]=a[b];a[k+1|0]=a[b+1|0];a[k+2|0]=a[b+2|0];a[k+3|0]=a[b+3|0]}function Hc(b){b=b|0;a[k]=a[b];a[k+1|0]=a[b+1|0];a[k+2|0]=a[b+2|0];a[k+3|0]=a[b+3|0];a[k+4|0]=a[b+4|0];a[k+5|0]=a[b+5|0];a[k+6|0]=a[b+6|0];a[k+7|0]=a[b+7|0]}function Ic(a){a=a|0;I=a}function Jc(a){a=a|0;J=a}function Kc(a){a=a|0;K=a}function Lc(a){a=a|0;L=a}function Mc(a){a=a|0;M=a}function Nc(a){a=a|0;N=a}function Oc(a){a=a|0;O=a}function Pc(a){a=a|0;P=a}function Qc(a){a=a|0;Q=a}function Rc(a){a=a|0;R=a}function Sc(a){a=a|0;var b=0,d=0,e=0,f=0;b=i;d=Um(528728)|0;rn(d|0,0,528724)|0;c[d>>2]=120;e=Um(20)|0;c[e>>2]=16;f=e+8|0;c[f>>2]=0;c[e+12>>2]=0;c[e+4>>2]=f;f=d+528724|0;c[f>>2]=e;xd(d,a);oc[c[(c[d>>2]|0)+16>>2]&63](d,c[f>>2]|0);a=c[f>>2]|0;c[a+16>>2]=c[a+4>>2];i=b;return d|0}function Tc(a){a=a|0;return c[(c[a+528724>>2]|0)+12>>2]|0}function Uc(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0;e=i;f=b+528724|0;b=c[(c[f>>2]|0)+16>>2]|0;g=c[b+28>>2]|0;h=b+16|0;if((a[h]&1)==0){j=h+1|0}else{j=c[b+24>>2]|0}tn(d|0,j|0)|0;j=(c[f>>2]|0)+16|0;d=c[j>>2]|0;b=c[d+4>>2]|0;if((b|0)==0){h=d;while(1){d=c[h+8>>2]|0;if((c[d>>2]|0)==(h|0)){k=d;break}else{h=d}}}else{h=b;while(1){b=c[h>>2]|0;if((b|0)==0){k=h;break}else{h=b}}}c[j>>2]=k;k=c[f>>2]|0;f=k+16|0;if((c[f>>2]|0)!=(k+8|0)){i=e;return g|0}c[f>>2]=c[k+4>>2];i=e;return g|0}function Vc(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0;f=i;Bc[c[(c[a>>2]|0)+24>>2]&15](a,b,d,e);i=f;return 1}function Wc(a){a=a|0;var b=0,d=0;b=i;d=qc[c[(c[a>>2]|0)+8>>2]&127](a)|0;i=b;return d|0}function Xc(a){a=a|0;var b=0,d=0;b=i;d=qc[c[(c[a>>2]|0)+12>>2]&127](a)|0;i=b;return d|0}function Yc(a){a=a|0;var b=0;b=i;if((a|0)==0){i=b;return}nc[c[(c[a>>2]|0)+4>>2]&255](a);i=b;return}function Zc(a){a=a|0;var b=0;b=i;c[a>>2]=16;pd(a+4|0,c[a+8>>2]|0);i=b;return}function _c(a){a=a|0;var b=0;b=i;c[a>>2]=16;pd(a+4|0,c[a+8>>2]|0);Wm(a);i=b;return}function $c(a,b){a=a|0;b=b|0;return}function ad(a,b){a=a|0;b=b|0;return}function bd(a,b){a=a|0;b=b|0;return}function cd(a){a=a|0;return}function dd(a,b,c){a=a|0;b=b|0;c=c|0;var d=0;d=i;ld(a,b,c);i=d;return}function ed(a,b,c){a=a|0;b=b|0;c=c|0;var d=0;d=i;ld(a,b,c);i=d;return}function fd(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=+d;e=+e;f=+f;g=+g;var h=0;h=i;ld(a,b,c);i=h;return}function gd(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=+d;e=+e;f=+f;g=+g;var h=0;h=i;ld(a,b,c);i=h;return}function hd(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=+d;e=+e;f=+f;g=+g;var h=0;h=i;ld(a,b,c);i=h;return}function id(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=+d;e=+e;return}function jd(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=+d;e=+e;return}function kd(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;return}function ld(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;f=i;i=i+80|0;g=f+64|0;h=f+48|0;j=f+32|0;k=f+16|0;l=f;m=qn(d|0)|0;if(m>>>0>4294967279){ze(0)}if(m>>>0<11){n=m<<1&255;a[l]=n;o=l;p=n;q=l+1|0}else{n=m+16&-16;r=Um(n)|0;c[l+8>>2]=r;s=n|1;c[l>>2]=s;c[l+4>>2]=m;o=l;p=s&255;q=r}on(q|0,d|0,m|0)|0;a[q+m|0]=0;if((p&1)==0){c[k+0>>2]=c[o+0>>2];c[k+4>>2]=c[o+4>>2];c[k+8>>2]=c[o+8>>2];t=k;u=a[k]|0}else{o=c[l+8>>2]|0;m=c[l+4>>2]|0;if(m>>>0>4294967279){ze(0)}if(m>>>0<11){q=m<<1&255;a[k]=q;v=k;w=q;x=k+1|0}else{q=m+16&-16;d=Um(q)|0;c[k+8>>2]=d;r=q|1;c[k>>2]=r;c[k+4>>2]=m;v=k;w=r&255;x=d}on(x|0,o|0,m|0)|0;a[x+m|0]=0;t=v;u=w}c[k+12>>2]=e;if((u&1)==0){c[j+0>>2]=c[t+0>>2];c[j+4>>2]=c[t+4>>2];c[j+8>>2]=c[t+8>>2];y=j;z=a[j]|0}else{u=c[k+8>>2]|0;w=c[k+4>>2]|0;if(w>>>0>4294967279){ze(0)}if(w>>>0<11){v=w<<1&255;a[j]=v;A=j;B=v;C=j+1|0}else{v=w+16&-16;m=Um(v)|0;c[j+8>>2]=m;x=v|1;c[j>>2]=x;c[j+4>>2]=w;A=j;B=x&255;C=m}on(C|0,u|0,w|0)|0;a[C+w|0]=0;y=A;z=B}c[j+12>>2]=e;B=b+4|0;if((z&1)==0){c[h+0>>2]=c[y+0>>2];c[h+4>>2]=c[y+4>>2];c[h+8>>2]=c[y+8>>2]}else{z=c[j+8>>2]|0;b=c[j+4>>2]|0;if(b>>>0>4294967279){ze(0)}if(b>>>0<11){a[h]=b<<1;D=h+1|0}else{A=b+16&-16;w=Um(A)|0;c[h+8>>2]=w;c[h>>2]=A|1;c[h+4>>2]=b;D=w}on(D|0,z|0,b|0)|0;a[D+b|0]=0}c[h+12>>2]=e;md(g,B,h);if(!((a[h]&1)==0)){Wm(c[h+8>>2]|0)}if(!((a[y]&1)==0)){Wm(c[j+8>>2]|0)}if(!((a[t]&1)==0)){Wm(c[k+8>>2]|0)}if((p&1)==0){i=f;return}Wm(c[l+8>>2]|0);i=f;return}function md(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0;f=i;i=i+16|0;g=f;h=nd(d,g,e)|0;j=c[h>>2]|0;if((j|0)!=0){k=0;l=j;c[b>>2]=l;m=b+4|0;a[m]=k;i=f;return}j=Um(32)|0;n=j+16|0;if((a[e]&1)==0){c[n+0>>2]=c[e+0>>2];c[n+4>>2]=c[e+4>>2];c[n+8>>2]=c[e+8>>2]}else{o=c[e+8>>2]|0;p=c[e+4>>2]|0;if(p>>>0>4294967279){ze(0)}if(p>>>0<11){a[n]=p<<1;q=j+17|0}else{r=p+16&-16;s=Um(r)|0;c[j+24>>2]=s;c[n>>2]=r|1;c[j+20>>2]=p;q=s}on(q|0,o|0,p|0)|0;a[q+p|0]=0}c[j+28>>2]=c[e+12>>2];e=c[g>>2]|0;c[j>>2]=0;c[j+4>>2]=0;c[j+8>>2]=e;c[h>>2]=j;e=c[c[d>>2]>>2]|0;if((e|0)==0){t=j}else{c[d>>2]=e;t=c[h>>2]|0}od(c[d+4>>2]|0,t);t=d+8|0;c[t>>2]=(c[t>>2]|0)+1;k=1;l=j;c[b>>2]=l;m=b+4|0;a[m]=k;i=f;return}function nd(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0;f=i;g=c[b+4>>2]|0;if((g|0)==0){h=b+4|0;c[d>>2]=h;j=h;i=f;return j|0}h=a[e]|0;b=(h&255)>>>1;k=e+1|0;l=e+8|0;m=e+4|0;a:do{if((h&1)==0){e=g;while(1){n=e+16|0;o=a[n]|0;p=(o&1)==0;if(p){q=(o&255)>>>1;r=n+1|0}else{q=c[e+20>>2]|0;r=c[e+24>>2]|0}s=q>>>0<b>>>0;t=kn(k,r,s?q:b)|0;if((t|0)==0){u=b>>>0<q>>>0?-1:s&1}else{u=t}if((u|0)<0){t=c[e>>2]|0;if((t|0)==0){v=e;w=e;x=24;break}else{e=t;continue}}if(p){y=(o&255)>>>1;z=n+1|0}else{y=c[e+20>>2]|0;z=c[e+24>>2]|0}n=b>>>0<y>>>0;o=kn(z,k,n?b:y)|0;if((o|0)==0){A=y>>>0<b>>>0?-1:n&1}else{A=o}if((A|0)>=0){B=e;x=33;break a}o=e+4|0;n=c[o>>2]|0;if((n|0)==0){C=o;D=e;x=32;break}else{e=n}}}else{e=g;while(1){n=e+16|0;o=c[m>>2]|0;p=a[n]|0;t=(p&1)==0;if(t){E=(p&255)>>>1;F=n+1|0}else{E=c[e+20>>2]|0;F=c[e+24>>2]|0}s=E>>>0<o>>>0;G=kn(c[l>>2]|0,F,s?E:o)|0;if((G|0)==0){H=o>>>0<E>>>0?-1:s&1}else{H=G}if((H|0)<0){G=c[e>>2]|0;if((G|0)==0){v=e;w=e;x=24;break}else{e=G;continue}}if(t){I=(p&255)>>>1;J=n+1|0}else{I=c[e+20>>2]|0;J=c[e+24>>2]|0}n=c[m>>2]|0;p=n>>>0<I>>>0;t=kn(J,c[l>>2]|0,p?n:I)|0;if((t|0)==0){K=I>>>0<n>>>0?-1:p&1}else{K=t}if((K|0)>=0){B=e;x=33;break a}t=e+4|0;p=c[t>>2]|0;if((p|0)==0){C=t;D=e;x=32;break}else{e=p}}}}while(0);if((x|0)==24){c[d>>2]=w;j=v;i=f;return j|0}else if((x|0)==32){c[d>>2]=D;j=C;i=f;return j|0}else if((x|0)==33){c[d>>2]=B;j=d;i=f;return j|0}return 0}function od(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;e=i;f=(d|0)==(b|0);a[d+12|0]=f&1;if(f){i=e;return}else{g=d}while(1){h=g+8|0;j=c[h>>2]|0;d=j+12|0;if((a[d]|0)!=0){k=37;break}l=j+8|0;m=c[l>>2]|0;f=c[m>>2]|0;if((f|0)==(j|0)){n=c[m+4>>2]|0;if((n|0)==0){k=7;break}o=n+12|0;if((a[o]|0)!=0){k=7;break}a[d]=1;a[m+12|0]=(m|0)==(b|0)|0;a[o]=1}else{if((f|0)==0){k=24;break}o=f+12|0;if((a[o]|0)!=0){k=24;break}a[d]=1;a[m+12|0]=(m|0)==(b|0)|0;a[o]=1}if((m|0)==(b|0)){k=37;break}else{g=m}}if((k|0)==7){if((c[j>>2]|0)==(g|0)){p=j;q=m;r=j}else{b=j+4|0;o=c[b>>2]|0;d=c[o>>2]|0;c[b>>2]=d;if((d|0)==0){s=m}else{c[d+8>>2]=j;s=c[l>>2]|0}d=o+8|0;c[d>>2]=s;s=c[l>>2]|0;if((c[s>>2]|0)==(j|0)){c[s>>2]=o}else{c[s+4>>2]=o}c[o>>2]=j;c[l>>2]=o;s=c[d>>2]|0;p=o;q=s;r=c[s>>2]|0}a[p+12|0]=1;a[q+12|0]=0;p=r+4|0;s=c[p>>2]|0;c[q>>2]=s;if((s|0)!=0){c[s+8>>2]=q}s=q+8|0;c[r+8>>2]=c[s>>2];o=c[s>>2]|0;if((c[o>>2]|0)==(q|0)){c[o>>2]=r}else{c[o+4>>2]=r}c[p>>2]=q;c[s>>2]=r;i=e;return}else if((k|0)==24){if((c[j>>2]|0)==(g|0)){r=g+4|0;s=c[r>>2]|0;c[j>>2]=s;if((s|0)==0){t=m}else{c[s+8>>2]=j;t=c[l>>2]|0}c[h>>2]=t;t=c[l>>2]|0;if((c[t>>2]|0)==(j|0)){c[t>>2]=g}else{c[t+4>>2]=g}c[r>>2]=j;c[l>>2]=g;u=g;v=c[h>>2]|0}else{u=j;v=m}a[u+12|0]=1;a[v+12|0]=0;u=v+4|0;m=c[u>>2]|0;j=c[m>>2]|0;c[u>>2]=j;if((j|0)!=0){c[j+8>>2]=v}j=v+8|0;c[m+8>>2]=c[j>>2];u=c[j>>2]|0;if((c[u>>2]|0)==(v|0)){c[u>>2]=m}else{c[u+4>>2]=m}c[m>>2]=v;c[j>>2]=m;i=e;return}else if((k|0)==37){i=e;return}}function pd(b,d){b=b|0;d=d|0;var e=0;e=i;if((d|0)==0){i=e;return}pd(b,c[d>>2]|0);pd(b,c[d+4>>2]|0);if(!((a[d+16|0]&1)==0)){Wm(c[d+24>>2]|0)}Wm(d);i=e;return}function qd(a){a=a|0;return}function rd(a){a=a|0;var b=0;b=i;Wm(a);i=b;return}function sd(a){a=a|0;return 2}function td(a){a=a|0;return 2}function ud(a,b){a=a|0;b=b|0;var d=0,e=0;d=i;oc[c[(c[b>>2]|0)+16>>2]&63](b,248);Bc[c[(c[b>>2]|0)+52>>2]&15](b,0,264,272);oc[c[(c[b>>2]|0)+16>>2]&63](b,328);Bc[c[(c[b>>2]|0)+52>>2]&15](b,0,384,392);oc[c[(c[b>>2]|0)+16>>2]&63](b,400);e=a+156|0;Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,432,392);Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,440);Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,544,552);kc[c[(c[b>>2]|0)+36>>2]&3](b,560,e,500.0,100.0,1.0e4,1.0);e=a+140|0;Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,392);Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,440);Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,544,552);kc[c[(c[b>>2]|0)+36>>2]&3](b,584,e,1.0e3,100.0,1.0e4,1.0);e=a+124|0;Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,608,392);Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,440);Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,544,552);kc[c[(c[b>>2]|0)+36>>2]&3](b,616,e,2.0e3,100.0,1.0e4,1.0);e=a+100|0;Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,640,392);Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,440);Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,544,552);kc[c[(c[b>>2]|0)+36>>2]&3](b,648,e,4.0e3,100.0,1.0e4,1.0);nc[c[(c[b>>2]|0)+20>>2]&255](b);Bc[c[(c[b>>2]|0)+52>>2]&15](b,0,608,392);oc[c[(c[b>>2]|0)+12>>2]&63](b,672);e=a+364|0;Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,432,392);Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,696);Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,544,992);kc[c[(c[b>>2]|0)+32>>2]&3](b,432,e,8.399999618530273,.10000000149011612,10.0,.10000000149011612);e=a+312|0;Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,392);Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,696);Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,544,992);kc[c[(c[b>>2]|0)+32>>2]&3](b,384,e,6.5,.10000000149011612,10.0,.10000000149011612);e=a+248|0;Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,608,392);Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,696);Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,544,992);kc[c[(c[b>>2]|0)+32>>2]&3](b,608,e,5.0,.10000000149011612,10.0,.10000000149011612);e=a+172|0;Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,640,392);Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,696);Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,544,992);kc[c[(c[b>>2]|0)+32>>2]&3](b,640,e,3.799999952316284,.10000000149011612,10.0,.10000000149011612);e=a+92|0;Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,1e3,392);Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,696);Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,544,992);kc[c[(c[b>>2]|0)+32>>2]&3](b,1e3,e,2.700000047683716,.10000000149011612,10.0,.10000000149011612);nc[c[(c[b>>2]|0)+20>>2]&255](b);Bc[c[(c[b>>2]|0)+52>>2]&15](b,0,640,392);oc[c[(c[b>>2]|0)+16>>2]&63](b,1008);e=a+84|0;Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,392);Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1024);Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,544,1192);kc[c[(c[b>>2]|0)+36>>2]&3](b,1200,e,46.0,.10000000149011612,63.0,.10000000149011612);e=a+88|0;Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,608,392);Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1224);Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,544,1192);kc[c[(c[b>>2]|0)+36>>2]&3](b,1392,e,63.0,.10000000149011612,63.0,.10000000149011612);nc[c[(c[b>>2]|0)+20>>2]&255](b);Bc[c[(c[b>>2]|0)+52>>2]&15](b,0,1e3,392);oc[c[(c[b>>2]|0)+12>>2]&63](b,1416);Bc[c[(c[b>>2]|0)+52>>2]&15](b,0,384,392);oc[c[(c[b>>2]|0)+16>>2]&63](b,1432);e=a+52|0;Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,392);Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1448);sc[c[(c[b>>2]|0)+28>>2]&7](b,1592,e);e=a+12|0;Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,608,392);Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1608);sc[c[(c[b>>2]|0)+28>>2]&7](b,1696,e);nc[c[(c[b>>2]|0)+20>>2]&255](b);Bc[c[(c[b>>2]|0)+52>>2]&15](b,0,608,392);oc[c[(c[b>>2]|0)+12>>2]&63](b,1712);e=a+56|0;Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,392);Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1736);sc[c[(c[b>>2]|0)+24>>2]&7](b,1768,e);e=a+40|0;Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,608,392);Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1776);sc[c[(c[b>>2]|0)+24>>2]&7](b,1824,e);e=a+37012|0;Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,640,392);Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1832);sc[c[(c[b>>2]|0)+24>>2]&7](b,1864,e);nc[c[(c[b>>2]|0)+20>>2]&255](b);Bc[c[(c[b>>2]|0)+52>>2]&15](b,0,640,392);oc[c[(c[b>>2]|0)+16>>2]&63](b,1872);e=a+68|0;Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,392);Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1888);sc[c[(c[b>>2]|0)+24>>2]&7](b,1936,e);nc[c[(c[b>>2]|0)+20>>2]&255](b);nc[c[(c[b>>2]|0)+20>>2]&255](b);nc[c[(c[b>>2]|0)+20>>2]&255](b);e=a+8|0;Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,640,392);Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1944);Bc[c[(c[b>>2]|0)+52>>2]&15](b,e,544,1968);kc[c[(c[b>>2]|0)+36>>2]&3](b,1976,e,-40.0,-70.0,20.0,.10000000149011612);nc[c[(c[b>>2]|0)+20>>2]&255](b);i=d;return}function vd(a,b){a=a|0;b=b|0;var d=0;d=i;oc[c[(c[a>>2]|0)+28>>2]&63](a,b);i=d;return}function wd(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,h=0.0,j=0.0,k=0.0,l=0.0,m=0.0,n=0.0,o=0.0,p=0.0,q=0.0,r=0.0,s=0.0,t=0.0,u=0.0,v=0.0,w=0.0,x=0.0,y=0.0,z=0.0,A=0.0,B=0.0,C=0.0,D=0.0,E=0.0,F=0.0,G=0.0,H=0.0,I=0.0,J=0.0,K=0.0,L=0.0,M=0.0,N=0.0,O=0.0,P=0.0,Q=0.0,R=0.0,T=0.0,U=0.0,W=0.0,X=0.0,Z=0.0,_=0.0,$=0.0,aa=0.0,da=0.0,fa=0.0,ga=0.0,ha=0.0,ia=0.0,ja=0.0,ka=0.0,la=0.0,ma=0.0,na=0.0,oa=0.0,pa=0.0,qa=0.0,ra=0.0,sa=0.0,ta=0.0,ua=0.0,va=0.0,wa=0.0,xa=0.0,ya=0.0,za=0.0,Aa=0.0,Ba=0.0,Ca=0.0,Da=0.0,Ea=0.0,Fa=0.0,Ga=0.0,Ha=0.0,Ia=0.0,Ja=0.0,Ka=0.0,La=0.0,Ma=0.0,Na=0.0,Oa=0.0,Pa=0.0,Qa=0.0,Ra=0.0,Sa=0.0,Ta=0.0,Ua=0.0,Va=0.0,Wa=0.0,Xa=0.0,Ya=0.0,Za=0.0,_a=0.0,$a=0.0,ab=0.0,bb=0.0,cb=0.0,db=0.0,eb=0.0,fb=0.0,gb=0.0,hb=0.0,ib=0.0,jb=0.0,kb=0.0,lb=0.0,mb=0.0,nb=0.0,ob=0.0,pb=0.0,qb=0.0,rb=0.0,sb=0.0,tb=0.0,ub=0.0,vb=0.0,wb=0.0,xb=0.0,yb=0.0,zb=0.0,Ab=0.0,Cb=0.0,Db=0.0,Eb=0.0,Fb=0.0,Gb=0.0,Hb=0.0,Ib=0.0,Jb=0.0,Kb=0.0,Lb=0.0,Mb=0.0,Nb=0.0,Ob=0.0,Pb=0.0,Qb=0.0,Rb=0.0,Sb=0.0,Tb=0.0,Ub=0.0,Vb=0.0,Wb=0.0,Xb=0.0,Yb=0,Zb=0,_b=0,$b=0,ac=0,bc=0,cc=0,dc=0,ec=0,fc=0,gc=0,hc=0,ic=0,jc=0,kc=0,lc=0,mc=0,nc=0,oc=0,pc=0,qc=0,rc=0,sc=0,tc=0,uc=0,vc=0,wc=0,xc=0,yc=0,zc=0,Ac=0,Bc=0,Cc=0,Dc=0,Ec=0,Fc=0,Gc=0,Hc=0,Ic=0,Jc=0,Kc=0,Lc=0,Mc=0,Nc=0,Oc=0,Pc=0,Qc=0,Rc=0,Sc=0,Tc=0,Uc=0,Vc=0,Wc=0,Xc=0,Yc=0,Zc=0,_c=0,$c=0,ad=0,bd=0,cd=0,dd=0,ed=0,fd=0,gd=0,hd=0,id=0,jd=0,kd=0,ld=0,md=0,nd=0,od=0,pd=0,qd=0,rd=0,sd=0,td=0,ud=0,vd=0,wd=0,xd=0,yd=0,zd=0,Ad=0,Bd=0,Cd=0,Dd=0,Ed=0,Fd=0,Gd=0,Hd=0,Id=0,Jd=0,Kd=0,Ld=0,Md=0,Nd=0,Od=0,Pd=0,Qd=0,Rd=0,Sd=0,Td=0,Ud=0,Vd=0,Wd=0,Xd=0,Yd=0,Zd=0,_d=0,$d=0,ae=0,be=0,ce=0,de=0,ee=0,fe=0,ge=0,he=0,ie=0,je=0,ke=0,le=0,me=0,ne=0,oe=0,pe=0,qe=0,re=0,se=0,te=0,ue=0,ve=0,we=0,xe=0,ye=0,ze=0,Ae=0,Be=0,Ce=0,De=0,Ee=0,Fe=0,Ge=0,He=0,Ie=0,Je=0,Ke=0,Le=0,Me=0,Ne=0,Oe=0,Pe=0,Qe=0,Re=0,Se=0,Te=0,Ue=0,Ve=0,We=0,Xe=0,Ye=0,Ze=0,_e=0,$e=0,af=0,bf=0,cf=0,df=0,ef=0,ff=0,gf=0,hf=0,jf=0,kf=0,lf=0,mf=0,nf=0,of=0,pf=0,qf=0,rf=0,sf=0,tf=0,uf=0,vf=0,wf=0,xf=0,yf=0,zf=0,Af=0,Bf=0,Cf=0,Df=0,Ef=0,Ff=0,Gf=0,Hf=0,If=0,Jf=0,Kf=0,Lf=0,Mf=0,Nf=0,Of=0,Pf=0,Qf=0,Rf=0,Sf=0,Tf=0,Uf=0,Vf=0,Wf=0,Xf=0,Yf=0,Zf=0,_f=0,$f=0,ag=0,bg=0,cg=0,dg=0,eg=0,fg=0,gg=0,hg=0,ig=0,jg=0,kg=0,lg=0,mg=0,ng=0,og=0,pg=0,qg=0,rg=0,sg=0,tg=0,ug=0,vg=0,wg=0,xg=0,yg=0,zg=0,Ag=0,Bg=0,Cg=0,Dg=0,Eg=0,Fg=0,Gg=0,Hg=0,Ig=0,Jg=0,Kg=0,Lg=0,Mg=0,Ng=0,Og=0,Pg=0,Qg=0,Rg=0,Sg=0,Tg=0,Ug=0,Vg=0,Wg=0,Xg=0,Yg=0,Zg=0,_g=0,$g=0,ah=0,bh=0,ch=0,dh=0,eh=0,fh=0,gh=0,hh=0,ih=0,jh=0,kh=0,lh=0,mh=0,nh=0,oh=0,ph=0,qh=0,rh=0,sh=0,th=0,uh=0,vh=0,wh=0,xh=0,yh=0,zh=0,Ah=0,Bh=0,Ch=0,Dh=0,Eh=0,Fh=0,Gh=0,Hh=0,Ih=0,Jh=0,Kh=0,Lh=0,Mh=0,Nh=0,Oh=0,Ph=0,Qh=0,Rh=0,Sh=0,Th=0,Uh=0,Vh=0,Wh=0,Xh=0,Yh=0,Zh=0,_h=0,$h=0,ai=0,bi=0,ci=0,di=0,ei=0,fi=0,gi=0,hi=0,ii=0,ji=0,ki=0,li=0,mi=0,ni=0,oi=0,pi=0,qi=0,ri=0,si=0,ti=0,ui=0,vi=0,wi=0,xi=0,yi=0,zi=0,Ai=0,Bi=0,Ci=0,Di=0,Ei=0,Fi=0,Gi=0,Hi=0,Ii=0,Ji=0,Ki=0,Li=0,Mi=0,Ni=0,Oi=0,Pi=0,Qi=0,Ri=0,Si=0,Ti=0,Ui=0,Vi=0,Wi=0,Xi=0,Yi=0,Zi=0,_i=0,$i=0,aj=0,bj=0,cj=0,dj=0,ej=0,fj=0,gj=0,hj=0,ij=0,jj=0,kj=0,lj=0,mj=0,nj=0,oj=0,pj=0,qj=0,rj=0,sj=0,tj=0,uj=0,vj=0,wj=0,xj=0,yj=0,zj=0,Aj=0,Bj=0,Cj=0,Dj=0,Ej=0,Fj=0,Gj=0,Hj=0,Ij=0,Jj=0,Kj=0,Lj=0,Mj=0,Nj=0,Oj=0,Pj=0,Qj=0,Rj=0,Sj=0,Tj=0,Uj=0,Vj=0,Wj=0,Xj=0,Yj=0,Zj=0,_j=0,$j=0,ak=0,bk=0,ck=0,dk=0,ek=0,fk=0,gk=0,hk=0,ik=0,jk=0,kk=0,lk=0,mk=0,nk=0,ok=0,pk=0,qk=0,rk=0,sk=0,tk=0,uk=0,vk=0,wk=0,xk=0,yk=0,zk=0,Ak=0,Bk=0,Ck=0,Dk=0,Ek=0,Fk=0,Gk=0,Hk=0,Ik=0,Jk=0,Kk=0,Lk=0,Mk=0,Nk=0,Ok=0,Pk=0,Qk=0,Rk=0,Sk=0,Tk=0,Uk=0,Vk=0,Wk=0,Xk=0,Yk=0,Zk=0,_k=0,$k=0,al=0,bl=0,cl=0,dl=0,el=0,fl=0,gl=0,hl=0,il=0,jl=0,kl=0,ll=0,ml=0,nl=0,ol=0,pl=0,ql=0,rl=0,sl=0,tl=0,ul=0,vl=0,wl=0,xl=0,yl=0,zl=0,Al=0,Bl=0,Cl=0,Dl=0,El=0,Fl=0,Gl=0,Hl=0,Il=0,Jl=0,Kl=0,Ll=0,Ml=0,Nl=0,Ol=0,Pl=0,Ql=0,Rl=0,Sl=0,Tl=0,Ul=0,Vl=0,Wl=0,Xl=0,Yl=0,Zl=0,_l=0,$l=0,am=0,bm=0,cm=0,dm=0,em=0,fm=0,gm=0,hm=0,im=0,jm=0,km=0,lm=0,mm=0,nm=0,om=0,pm=0,qm=0,rm=0,sm=0,tm=0,um=0,vm=0,wm=0,xm=0,ym=0,zm=0,Am=0,Bm=0,Cm=0,Dm=0,Em=0,Fm=0,Gm=0,Hm=0,Im=0,Jm=0,Km=0,Lm=0,Mm=0,Nm=0,Om=0,Pm=0,Qm=0,Rm=0,Sm=0,Tm=0,Um=0,Vm=0,Wm=0,Xm=0,Ym=0,Zm=0,_m=0,$m=0,an=0,bn=0,cn=0,dn=0,en=0,fn=0,gn=0,hn=0,jn=0,kn=0,ln=0,mn=0,nn=0,on=0,pn=0,qn=0,rn=0,sn=0,tn=0,un=0,vn=0,wn=0,xn=0,yn=0,zn=0,An=0,Bn=0,Cn=0,Dn=0,En=0,Fn=0,Gn=0,Hn=0,In=0,Jn=0,Kn=0,Ln=0,Mn=0,Nn=0,On=0,Pn=0,Qn=0,Rn=0,Sn=0,Tn=0,Un=0,Vn=0,Wn=0,Xn=0,Yn=0,Zn=0,_n=0,$n=0,ao=0,bo=0,co=0,eo=0,fo=0,go=0,ho=0,io=0,jo=0,ko=0,lo=0,mo=0,no=0,oo=0,po=0,qo=0,ro=0,so=0,to=0,uo=0,vo=0,wo=0,xo=0,yo=0,zo=0,Ao=0,Bo=0,Co=0,Do=0,Eo=0,Fo=0,Go=0,Ho=0,Io=0,Jo=0,Ko=0,Lo=0,Mo=0,No=0,Oo=0,Po=0,Qo=0,Ro=0,So=0,To=0,Uo=0,Vo=0,Wo=0,Xo=0,Yo=0,Zo=0,_o=0,$o=0,ap=0,bp=0,cp=0,dp=0,ep=0,fp=0,gp=0,hp=0,ip=0,jp=0,kp=0,lp=0,mp=0,np=0,op=0,pp=0,qp=0,rp=0,sp=0,tp=0,up=0,vp=0,wp=0,xp=0,yp=0,zp=0,Ap=0,Bp=0,Cp=0,Dp=0,Ep=0,Fp=0,Gp=0,Hp=0,Ip=0,Jp=0,Kp=0,Lp=0,Mp=0,Np=0,Op=0,Pp=0,Qp=0,Rp=0,Sp=0,Tp=0,Up=0,Vp=0,Wp=0,Xp=0,Yp=0,Zp=0,_p=0,$p=0,aq=0,bq=0,cq=0,dq=0,eq=0,fq=0,gq=0,hq=0,iq=0,jq=0,kq=0,lq=0,mq=0,nq=0,oq=0,pq=0,qq=0,rq=0,sq=0,tq=0,uq=0,vq=0,wq=0,xq=0,yq=0,zq=0,Aq=0,Bq=0,Cq=0,Dq=0,Eq=0,Fq=0,Gq=0,Hq=0,Iq=0,Jq=0,Kq=0,Lq=0,Mq=0,Nq=0,Oq=0,Pq=0,Qq=0,Rq=0,Sq=0,Tq=0,Uq=0,Vq=0,Wq=0,Xq=0,Yq=0,Zq=0,_q=0,$q=0,ar=0,br=0,cr=0,dr=0,er=0,fr=0,gr=0,hr=0,ir=0,jr=0,kr=0,lr=0,mr=0,nr=0,or=0,pr=0,qr=0,rr=0,sr=0,tr=0,ur=0,vr=0,wr=0,xr=0,yr=0,zr=0,Ar=0,Br=0,Cr=0,Dr=0,Er=0,Fr=0,Gr=0,Hr=0,Ir=0,Jr=0,Kr=0,Lr=0,Mr=0,Nr=0,Or=0,Pr=0,Qr=0,Rr=0,Sr=0,Tr=0,Ur=0,Vr=0,Wr=0,Xr=0,Yr=0,Zr=0,_r=0,$r=0,as=0,bs=0,cs=0,ds=0,es=0,fs=0,gs=0,hs=0,is=0,js=0,ks=0,ls=0,ms=0,ns=0,os=0,ps=0,qs=0,rs=0,ss=0,ts=0,us=0,vs=0,ws=0,xs=0,ys=0,zs=0,As=0,Bs=0,Cs=0,Ds=0,Es=0,Fs=0,Gs=0,Hs=0,Is=0,Js=0,Ks=0,Ls=0,Ms=0,Ns=0,Os=0,Ps=0,Qs=0,Rs=0,Ss=0,Ts=0,Us=0,Vs=0,Ws=0,Xs=0,Ys=0,Zs=0,_s=0,$s=0,at=0,bt=0,ct=0,dt=0,et=0,ft=0,gt=0,ht=0,it=0,jt=0,kt=0,lt=0,mt=0,nt=0,ot=0,pt=0,qt=0,rt=0,st=0,tt=0,ut=0,vt=0,wt=0,xt=0,yt=0,zt=0,At=0,Bt=0,Ct=0,Dt=0,Et=0,Ft=0,Gt=0,Ht=0,It=0,Jt=0,Kt=0,Lt=0,Mt=0,Nt=0,Ot=0,Pt=0,Qt=0,Rt=0,St=0,Tt=0,Ut=0,Vt=0,Wt=0,Xt=0,Yt=0,Zt=0,_t=0,$t=0,au=0,bu=0,cu=0,du=0,eu=0,fu=0,gu=0,hu=0,iu=0,ju=0,ku=0,lu=0,mu=0,nu=0,ou=0,pu=0,qu=0,ru=0,su=0,tu=0,uu=0,vu=0,wu=0,xu=0,yu=0,zu=0,Au=0,Bu=0,Cu=0,Du=0,Eu=0,Fu=0,Gu=0,Hu=0,Iu=0,Ju=0,Ku=0,Lu=0,Mu=0,Nu=0,Ou=0,Pu=0,Qu=0,Ru=0,Su=0,Tu=0,Uu=0,Vu=0,Wu=0,Xu=0,Yu=0,Zu=0,_u=0,$u=0,av=0,bv=0,cv=0,dv=0,ev=0,fv=0,gv=0,hv=0,iv=0,jv=0,kv=0,lv=0,mv=0,nv=0,ov=0,pv=0,qv=0,rv=0,sv=0,tv=0,uv=0,vv=0,wv=0,xv=0,yv=0,zv=0,Av=0,Bv=0,Cv=0,Dv=0,Ev=0,Fv=0,Gv=0,Hv=0,Iv=0,Jv=0,Kv=0,Lv=0,Mv=0,Nv=0,Ov=0,Pv=0,Qv=0,Rv=0,Sv=0,Tv=0,Uv=0,Vv=0,Wv=0,Xv=0,Yv=0,Zv=0,_v=0,$v=0,aw=0,bw=0,cw=0,dw=0,ew=0,fw=0,gw=0,hw=0,iw=0,jw=0,kw=0,lw=0,mw=0,nw=0,ow=0,pw=0,qw=0,rw=0,sw=0,tw=0,uw=0,vw=0,ww=0,xw=0,yw=0,zw=0.0,Aw=0.0,Bw=0.0,Cw=0.0,Dw=0.0,Ew=0.0,Fw=0.0,Gw=0.0,Hw=0.0,Iw=0.0,Jw=0.0,Kw=0.0,Lw=0.0,Mw=0.0,Nw=0.0,Ow=0.0,Pw=0.0,Qw=0.0,Rw=0.0,Sw=0.0,Tw=0.0,Uw=0.0,Vw=0.0,Ww=0.0,Xw=0.0,Yw=0.0,Zw=0.0,_w=0.0,$w=0.0,ax=0.0,bx=0.0,cx=0.0,dx=0.0,ex=0.0,fx=0.0,gx=0.0;f=i;h=+V(10.0,+(+g[a+8>>2]*.05000000074505806));j=+g[a+12>>2]*.10000000149011612;k=+g[a+40>>2];l=1.0- +g[a+52>>2];m=+g[a+56>>2];n=1.0- +g[a+68>>2]*.5;o=n*.25;p=+g[a+84>>2];q=+g[a+88>>2]/p;r=+g[a+80>>2];s=+Bb(+(+S(+(+ca(+(p*r))*1.4426950216293335+.5))));t=0.0-s*6.907755374908447;u=+g[a+92>>2];v=+g[a+76>>2];w=+ba(+(v*(t/u)));x=+g[a+96>>2];y=+Y(+(x*+g[a+100>>2]));z=1.0/y;A=z+1.0;B=A/y+1.0;C=1.0/B;D=1.0/(y*y);E=0.0-(1.0-z)/A;F=1.0/A;A=0.0-z;G=(z+-1.0)/y+1.0;y=(1.0-D)*2.0;H=(0.0-D)*2.0;I=+Y(+(x*+g[a+124>>2]));J=1.0/I;K=J+1.0;L=K/I+1.0;M=1.0/L;N=1.0/(I*I);O=(1.0-N)*2.0;P=(J+-1.0)/I+1.0;Q=+Y(+(x*+g[a+140>>2]));R=1.0/Q;T=R+1.0;U=T/Q+1.0;W=1.0/U;X=(R+-1.0)/Q+1.0;Z=1.0/(Q*Q);_=(1.0-Z)*2.0;$=+Y(+(x*+g[a+156>>2]));x=1.0/$;aa=x+1.0;da=1.0/(aa/$+1.0);fa=1.0/($*$);ga=(1.0-fa)*2.0;ha=(x+-1.0)/$+1.0;ia=+g[a+172>>2];ja=+ba(+(v*(t/ia)));ka=0.0-(1.0-J)/K;la=1.0/K;K=0.0-J;J=1.0/(B*I);I=(0.0-N)*2.0;B=+g[a+248>>2];ma=+ba(+(v*(t/B)));na=0.0-(1.0-R)/T;oa=1.0/T;T=0.0-R;R=1.0/(L*Q);Q=(0.0-Z)*2.0;L=+g[a+312>>2];pa=+ba(+(v*(t/L)));qa=0.0-(1.0-x)/aa;ra=1.0/aa;aa=0.0-x;x=1.0/(U*$);$=(0.0-fa)*2.0;U=+g[a+364>>2];sa=+ba(+(v*(t/U)));t=+V(23.0,+(+S(+(+ca(+(r*p*+V(+q,.5333333611488342)))*.318928986787796+.5))));ta=0.0-t*6.907755374908447;ua=+ba(+(v*(ta/u)));va=+ba(+(v*(ta/ia)));wa=+ba(+(v*(ta/B)));xa=+ba(+(v*(ta/L)));ya=+ba(+(v*(ta/U)));ta=+V(11.0,+(+S(+(+ca(+(r*p*+V(+q,.2666666805744171)))*.417032390832901+.5))));za=0.0-ta*6.907755374908447;Aa=+ba(+(v*(za/u)));Ba=+ba(+(v*(za/ia)));Ca=+ba(+(v*(za/B)));Da=+ba(+(v*(za/L)));Ea=+ba(+(v*(za/U)));za=+V(41.0,+(+S(+(+ca(+(r*p*+V(+q,.800000011920929)))*.2692825198173523+.5))));Fa=0.0-za*6.907755374908447;Ga=+ba(+(v*(Fa/u)));Ha=+ba(+(v*(Fa/ia)));Ia=+ba(+(v*(Fa/B)));Ja=+ba(+(v*(Fa/L)));Ka=+ba(+(v*(Fa/U)));Fa=+V(5.0,+(+S(+(+ca(+(r*p*+V(+q,.13333334028720856)))*.6213349103927612+.5))));La=0.0-Fa*6.907755374908447;Ma=+ba(+(v*(La/u)));Na=+ba(+(v*(La/ia)));Oa=+ba(+(v*(La/B)));Pa=+ba(+(v*(La/L)));Qa=+ba(+(v*(La/U)));La=+V(31.0,+(+S(+(+ca(+(r*p*+V(+q,.6666666865348816)))*.2912066876888275+.5))));Ra=0.0-La*6.907755374908447;Sa=+ba(+(v*(Ra/u)));Ta=+ba(+(v*(Ra/ia)));Ua=+ba(+(v*(Ra/B)));Va=+ba(+(v*(Ra/L)));Wa=+ba(+(v*(Ra/U)));Ra=+V(17.0,+(+S(+(+ca(+(r*p*+V(+q,.4000000059604645)))*.3529561161994934+.5))));Xa=0.0-Ra*6.907755374908447;Ya=+ba(+(v*(Xa/u)));Za=+ba(+(v*(Xa/ia)));_a=+ba(+(v*(Xa/B)));$a=+ba(+(v*(Xa/L)));ab=+ba(+(v*(Xa/U)));Xa=+V(47.0,+(+S(+(+ca(+(r*p*+V(+q,.9333333373069763)))*.2597303092479706+.5))));bb=0.0-Xa*6.907755374908447;cb=+ba(+(v*(bb/u)));db=+ba(+(v*(bb/ia)));eb=+ba(+(v*(bb/B)));fb=+ba(+(v*(bb/L)));gb=+ba(+(v*(bb/U)));bb=+V(3.0,+(+S(+(+ca(+(r*p*+V(+q,.06666667014360428)))*.9102392196655273+.5))));hb=0.0-bb*6.907755374908447;ib=+ba(+(v*(hb/u)));jb=+ba(+(v*(hb/ia)));kb=+ba(+(v*(hb/B)));lb=+ba(+(v*(hb/L)));mb=+ba(+(v*(hb/U)));hb=+V(29.0,+(+S(+(+ca(+(r*p*+V(+q,.6000000238418579)))*.29697421193122864+.5))));nb=0.0-hb*6.907755374908447;ob=+ba(+(v*(nb/u)));pb=+ba(+(v*(nb/ia)));qb=+ba(+(v*(nb/B)));rb=+ba(+(v*(nb/L)));sb=+ba(+(v*(nb/U)));nb=+V(13.0,+(+S(+(+ca(+(r*p*+V(+q,.3333333432674408)))*.3898712396621704+.5))));tb=0.0-nb*6.907755374908447;ub=+ba(+(v*(tb/u)));vb=+ba(+(v*(tb/ia)));wb=+ba(+(v*(tb/B)));xb=+ba(+(v*(tb/L)));yb=+ba(+(v*(tb/U)));tb=+V(43.0,+(+S(+(+ca(+(r*p*+V(+q,.8666666746139526)))*.265872597694397+.5))));zb=0.0-tb*6.907755374908447;Ab=+ba(+(v*(zb/u)));Cb=+ba(+(v*(zb/ia)));Db=+ba(+(v*(zb/B)));Eb=+ba(+(v*(zb/L)));Fb=+ba(+(v*(zb/U)));zb=+V(7.0,+(+S(+(+ca(+(r*p*+V(+q,.20000000298023224)))*.5138983130455017+.5))));Gb=0.0-zb*6.907755374908447;Hb=+ba(+(v*(Gb/u)));Ib=+ba(+(v*(Gb/ia)));Jb=+ba(+(v*(Gb/B)));Kb=+ba(+(v*(Gb/L)));Lb=+ba(+(v*(Gb/U)));Gb=+V(37.0,+(+S(+(+ca(+(r*p*+V(+q,.7333333492279053)))*.27693790197372437+.5))));Mb=0.0-Gb*6.907755374908447;Nb=+ba(+(v*(Mb/u)));Ob=+ba(+(v*(Mb/ia)));Pb=+ba(+(v*(Mb/B)));Qb=+ba(+(v*(Mb/L)));Rb=+ba(+(v*(Mb/U)));Mb=+V(19.0,+(+S(+(+ca(+(r*p*+V(+q,.46666666865348816)))*.33962327241897583+.5))));Sb=0.0-Mb*6.907755374908447;Tb=+ba(+(v*(Sb/u)));Ub=+ba(+(v*(Sb/ia)));Vb=+ba(+(v*(Sb/B)));Wb=+ba(+(v*(Sb/L)));Xb=+ba(+(v*(Sb/U)));Sb=+V(53.0,+(+S(+(+ca(+(r*p*q))*.25187066197395325+.5))));q=0.0-Sb*6.907755374908447;p=+ba(+(v*(q/u)));u=+ba(+(v*(q/ia)));ia=+ba(+(v*(q/B)));B=+ba(+(v*(q/L)));L=+ba(+(v*(q/U)));Yb=~~(s+-1.0);s=+g[a+37012>>2];Zb=~~(bb+-1.0);_b=~~(Fa+-1.0);$b=~~(zb+-1.0);ac=~~(ta+-1.0);bc=~~(nb+-1.0);cc=~~(Ra+-1.0);dc=~~(Mb+-1.0);ec=~~(t+-1.0);fc=~~(hb+-1.0);gc=~~(La+-1.0);hc=~~(Gb+-1.0);ic=~~(za+-1.0);jc=~~(tb+-1.0);kc=~~(Xa+-1.0);lc=~~(Sb+-1.0);mc=c[d>>2]|0;nc=c[d+4>>2]|0;d=c[e>>2]|0;oc=c[e+4>>2]|0;if((b|0)<=0){i=f;return}e=a+20|0;pc=a+16|0;qc=a+36|0;rc=a+28|0;sc=a+32|0;tc=a+24|0;uc=a+44|0;vc=a+48|0;wc=a+60|0;xc=a+64|0;yc=a+108|0;zc=a+37004|0;Ac=a+37008|0;Bc=a+104|0;Cc=a+120|0;Dc=a+116|0;Ec=a+112|0;Fc=a+132|0;Gc=a+136|0;Hc=a+128|0;Ic=a+148|0;Jc=a+152|0;Kc=a+144|0;Lc=a+164|0;Mc=a+168|0;Nc=a+160|0;Oc=a+180|0;Pc=a+176|0;Qc=a+192|0;Rc=a+188|0;Sc=a+184|0;Tc=a+196|0;Uc=a+208|0;Vc=a+200|0;Wc=a+204|0;Xc=a+220|0;Yc=a+216|0;Zc=a+212|0;_c=a+228|0;$c=a+232|0;ad=a+224|0;bd=a+240|0;cd=a+244|0;dd=a+236|0;ed=a+256|0;fd=a+252|0;gd=a+268|0;hd=a+264|0;id=a+260|0;jd=a+272|0;kd=a+284|0;ld=a+276|0;md=a+280|0;nd=a+296|0;od=a+292|0;pd=a+288|0;qd=a+304|0;rd=a+308|0;sd=a+300|0;td=a+320|0;ud=a+316|0;vd=a+332|0;wd=a+328|0;xd=a+324|0;yd=a+336|0;zd=a+348|0;Ad=a+340|0;Bd=a+344|0;Cd=a+360|0;Dd=a+356|0;Ed=a+352|0;Fd=a+372|0;Gd=a+368|0;Hd=a+384|0;Id=a+380|0;Jd=a+376|0;Kd=a+392|0;Ld=a+299256|0;Md=a+299260|0;Nd=a+388|0;Od=a+404|0;Pd=a+400|0;Qd=a+396|0;Rd=a+412|0;Sd=a+416|0;Td=a+408|0;Ud=a+424|0;Vd=a+428|0;Wd=a+420|0;Xd=a+436|0;Yd=a+440|0;Zd=a+432|0;_d=a+448|0;$d=a+444|0;ae=a+460|0;be=a+456|0;ce=a+452|0;de=a+464|0;ee=a+476|0;fe=a+468|0;ge=a+472|0;he=a+488|0;ie=a+484|0;je=a+480|0;ke=a+496|0;le=a+500|0;me=a+492|0;ne=a+508|0;oe=a+512|0;pe=a+504|0;qe=a+520|0;re=a+516|0;se=a+532|0;te=a+528|0;ue=a+524|0;ve=a+536|0;we=a+548|0;xe=a+540|0;ye=a+544|0;ze=a+560|0;Ae=a+556|0;Be=a+552|0;Ce=a+568|0;De=a+572|0;Ee=a+564|0;Fe=a+580|0;Ge=a+576|0;He=a+592|0;Ie=a+588|0;Je=a+584|0;Ke=a+596|0;Le=a+608|0;Me=a+600|0;Ne=a+604|0;Oe=a+620|0;Pe=a+616|0;Qe=a+612|0;Re=a+628|0;Se=a+624|0;Te=a+640|0;Ue=a+636|0;Ve=a+632|0;We=a+648|0;Xe=a+168136|0;Ye=a+168140|0;Ze=a+644|0;_e=a+660|0;$e=a+656|0;af=a+652|0;bf=a+668|0;cf=a+672|0;df=a+664|0;ef=a+680|0;ff=a+684|0;gf=a+676|0;hf=a+692|0;jf=a+696|0;kf=a+688|0;lf=a+704|0;mf=a+700|0;nf=a+716|0;of=a+712|0;pf=a+708|0;qf=a+720|0;rf=a+732|0;sf=a+724|0;tf=a+728|0;uf=a+744|0;vf=a+740|0;wf=a+736|0;xf=a+752|0;yf=a+756|0;zf=a+748|0;Af=a+764|0;Bf=a+768|0;Cf=a+760|0;Df=a+776|0;Ef=a+772|0;Ff=a+788|0;Gf=a+784|0;Hf=a+780|0;If=a+792|0;Jf=a+804|0;Kf=a+796|0;Lf=a+800|0;Mf=a+816|0;Nf=a+812|0;Of=a+808|0;Pf=a+824|0;Qf=a+828|0;Rf=a+820|0;Sf=a+836|0;Tf=a+832|0;Uf=a+848|0;Vf=a+844|0;Wf=a+840|0;Xf=a+852|0;Yf=a+864|0;Zf=a+856|0;_f=a+860|0;$f=a+876|0;ag=a+872|0;bg=a+868|0;cg=a+884|0;dg=a+880|0;eg=a+896|0;fg=a+892|0;gg=a+888|0;hg=a+904|0;ig=a+430376|0;jg=a+430380|0;kg=a+900|0;lg=a+916|0;mg=a+912|0;ng=a+908|0;og=a+924|0;pg=a+928|0;qg=a+920|0;rg=a+936|0;sg=a+940|0;tg=a+932|0;ug=a+948|0;vg=a+952|0;wg=a+944|0;xg=a+960|0;yg=a+956|0;zg=a+972|0;Ag=a+968|0;Bg=a+964|0;Cg=a+976|0;Dg=a+988|0;Eg=a+980|0;Fg=a+984|0;Gg=a+1e3|0;Hg=a+996|0;Ig=a+992|0;Jg=a+1008|0;Kg=a+1012|0;Lg=a+1004|0;Mg=a+1020|0;Ng=a+1024|0;Og=a+1016|0;Pg=a+1032|0;Qg=a+1028|0;Rg=a+1044|0;Sg=a+1040|0;Tg=a+1036|0;Ug=a+1048|0;Vg=a+1060|0;Wg=a+1052|0;Xg=a+1056|0;Yg=a+1072|0;Zg=a+1068|0;_g=a+1064|0;$g=a+1080|0;ah=a+1084|0;bh=a+1076|0;ch=a+1092|0;dh=a+1088|0;eh=a+1104|0;fh=a+1100|0;gh=a+1096|0;hh=a+1108|0;ih=a+1120|0;jh=a+1112|0;kh=a+1116|0;lh=a+1132|0;mh=a+1128|0;nh=a+1124|0;oh=a+1140|0;ph=a+1136|0;qh=a+1152|0;rh=a+1148|0;sh=a+1144|0;th=a+1160|0;uh=a+102576|0;vh=a+102580|0;wh=a+1156|0;xh=a+1172|0;yh=a+1168|0;zh=a+1164|0;Ah=a+1180|0;Bh=a+1184|0;Ch=a+1176|0;Dh=a+1192|0;Eh=a+1196|0;Fh=a+1188|0;Gh=a+1204|0;Hh=a+1208|0;Ih=a+1200|0;Jh=a+1216|0;Kh=a+1212|0;Lh=a+1228|0;Mh=a+1224|0;Nh=a+1220|0;Oh=a+1232|0;Ph=a+1244|0;Qh=a+1236|0;Rh=a+1240|0;Sh=a+1256|0;Th=a+1252|0;Uh=a+1248|0;Vh=a+1264|0;Wh=a+1268|0;Xh=a+1260|0;Yh=a+1276|0;Zh=a+1280|0;_h=a+1272|0;$h=a+1288|0;ai=a+1284|0;bi=a+1300|0;ci=a+1296|0;di=a+1292|0;ei=a+1304|0;fi=a+1316|0;gi=a+1308|0;hi=a+1312|0;ii=a+1328|0;ji=a+1324|0;ki=a+1320|0;li=a+1336|0;mi=a+1340|0;ni=a+1332|0;oi=a+1348|0;pi=a+1344|0;qi=a+1360|0;ri=a+1356|0;si=a+1352|0;ti=a+1364|0;ui=a+1376|0;vi=a+1368|0;wi=a+1372|0;xi=a+1388|0;yi=a+1384|0;zi=a+1380|0;Ai=a+1396|0;Bi=a+1392|0;Ci=a+1408|0;Di=a+1404|0;Ei=a+1400|0;Fi=a+1416|0;Gi=a+364816|0;Hi=a+364820|0;Ii=a+1412|0;Ji=a+1428|0;Ki=a+1424|0;Li=a+1420|0;Mi=a+1436|0;Ni=a+1440|0;Oi=a+1432|0;Pi=a+1448|0;Qi=a+1452|0;Ri=a+1444|0;Si=a+1460|0;Ti=a+1464|0;Ui=a+1456|0;Vi=a+1472|0;Wi=a+1468|0;Xi=a+1484|0;Yi=a+1480|0;Zi=a+1476|0;_i=a+1488|0;$i=a+1500|0;aj=a+1492|0;bj=a+1496|0;cj=a+1512|0;dj=a+1508|0;ej=a+1504|0;fj=a+1520|0;gj=a+1524|0;hj=a+1516|0;ij=a+1532|0;jj=a+1536|0;kj=a+1528|0;lj=a+1544|0;mj=a+1540|0;nj=a+1556|0;oj=a+1552|0;pj=a+1548|0;qj=a+1560|0;rj=a+1572|0;sj=a+1564|0;tj=a+1568|0;uj=a+1584|0;vj=a+1580|0;wj=a+1576|0;xj=a+1592|0;yj=a+1596|0;zj=a+1588|0;Aj=a+1604|0;Bj=a+1600|0;Cj=a+1616|0;Dj=a+1612|0;Ej=a+1608|0;Fj=a+1620|0;Gj=a+1632|0;Hj=a+1624|0;Ij=a+1628|0;Jj=a+1644|0;Kj=a+1640|0;Lj=a+1636|0;Mj=a+1652|0;Nj=a+1648|0;Oj=a+1664|0;Pj=a+1660|0;Qj=a+1656|0;Rj=a+1672|0;Sj=a+233696|0;Tj=a+233700|0;Uj=a+1668|0;Vj=a+1684|0;Wj=a+1680|0;Xj=a+1676|0;Yj=a+1692|0;Zj=a+1696|0;_j=a+1688|0;$j=a+1704|0;ak=a+1708|0;bk=a+1700|0;ck=a+1716|0;dk=a+1720|0;ek=a+1712|0;fk=a+1728|0;gk=a+1724|0;hk=a+1740|0;ik=a+1736|0;jk=a+1732|0;kk=a+1744|0;lk=a+1756|0;mk=a+1748|0;nk=a+1752|0;ok=a+1768|0;pk=a+1764|0;qk=a+1760|0;rk=a+1776|0;sk=a+1780|0;tk=a+1772|0;uk=a+1788|0;vk=a+1792|0;wk=a+1784|0;xk=a+1800|0;yk=a+1796|0;zk=a+1812|0;Ak=a+1808|0;Bk=a+1804|0;Ck=a+1816|0;Dk=a+1828|0;Ek=a+1820|0;Fk=a+1824|0;Gk=a+1840|0;Hk=a+1836|0;Ik=a+1832|0;Jk=a+1848|0;Kk=a+1852|0;Lk=a+1844|0;Mk=a+1860|0;Nk=a+1856|0;Ok=a+1872|0;Pk=a+1868|0;Qk=a+1864|0;Rk=a+1876|0;Sk=a+1888|0;Tk=a+1880|0;Uk=a+1884|0;Vk=a+1900|0;Wk=a+1896|0;Xk=a+1892|0;Yk=a+1908|0;Zk=a+1904|0;_k=a+1920|0;$k=a+1916|0;al=a+1912|0;bl=a+1928|0;cl=a+495936|0;dl=a+495940|0;el=a+1924|0;fl=a+1940|0;gl=a+1936|0;hl=a+1932|0;il=a+1948|0;jl=a+1952|0;kl=a+1944|0;ll=a+1960|0;ml=a+1964|0;nl=a+1956|0;ol=a+1972|0;pl=a+1976|0;ql=a+1968|0;rl=a+1984|0;sl=a+1980|0;tl=a+1996|0;ul=a+1992|0;vl=a+1988|0;wl=a+2e3|0;xl=a+2012|0;yl=a+2004|0;zl=a+2008|0;Al=a+2024|0;Bl=a+2020|0;Cl=a+2016|0;Dl=a+2032|0;El=a+2036|0;Fl=a+2028|0;Gl=a+2044|0;Hl=a+2048|0;Il=a+2040|0;Jl=a+2056|0;Kl=a+2052|0;Ll=a+2068|0;Ml=a+2064|0;Nl=a+2060|0;Ol=a+2072|0;Pl=a+2084|0;Ql=a+2076|0;Rl=a+2080|0;Sl=a+2096|0;Tl=a+2092|0;Ul=a+2088|0;Vl=a+2104|0;Wl=a+2108|0;Xl=a+2100|0;Yl=a+2116|0;Zl=a+2112|0;_l=a+2128|0;$l=a+2124|0;am=a+2120|0;bm=a+2132|0;cm=a+2144|0;dm=a+2136|0;em=a+2140|0;fm=a+2156|0;gm=a+2152|0;hm=a+2148|0;im=a+2164|0;jm=a+2160|0;km=a+2176|0;lm=a+2172|0;mm=a+2168|0;nm=a+2184|0;om=a+69796|0;pm=a+69800|0;qm=a+2180|0;rm=a+2196|0;sm=a+2192|0;tm=a+2188|0;um=a+2204|0;vm=a+2208|0;wm=a+2200|0;xm=a+2216|0;ym=a+2220|0;zm=a+2212|0;Am=a+2228|0;Bm=a+2232|0;Cm=a+2224|0;Dm=a+2240|0;Em=a+2236|0;Fm=a+2252|0;Gm=a+2248|0;Hm=a+2244|0;Im=a+2256|0;Jm=a+2268|0;Km=a+2260|0;Lm=a+2264|0;Mm=a+2280|0;Nm=a+2276|0;Om=a+2272|0;Pm=a+2288|0;Qm=a+2292|0;Rm=a+2284|0;Sm=a+2300|0;Tm=a+2304|0;Um=a+2296|0;Vm=a+2312|0;Wm=a+2308|0;Xm=a+2324|0;Ym=a+2320|0;Zm=a+2316|0;_m=a+2328|0;$m=a+2340|0;an=a+2332|0;bn=a+2336|0;cn=a+2352|0;dn=a+2348|0;en=a+2344|0;fn=a+2360|0;gn=a+2364|0;hn=a+2356|0;jn=a+2372|0;kn=a+2368|0;ln=a+2384|0;mn=a+2380|0;nn=a+2376|0;on=a+2388|0;pn=a+2400|0;qn=a+2392|0;rn=a+2396|0;sn=a+2412|0;tn=a+2408|0;un=a+2404|0;vn=a+2420|0;wn=a+2416|0;xn=a+2432|0;yn=a+2428|0;zn=a+2424|0;An=a+2440|0;Bn=a+332036|0;Cn=a+332040|0;Dn=a+2436|0;En=a+2452|0;Fn=a+2448|0;Gn=a+2444|0;Hn=a+2460|0;In=a+2464|0;Jn=a+2456|0;Kn=a+2472|0;Ln=a+2476|0;Mn=a+2468|0;Nn=a+2484|0;On=a+2488|0;Pn=a+2480|0;Qn=a+2496|0;Rn=a+2492|0;Sn=a+2508|0;Tn=a+2504|0;Un=a+2500|0;Vn=a+2512|0;Wn=a+2524|0;Xn=a+2516|0;Yn=a+2520|0;Zn=a+2536|0;_n=a+2532|0;$n=a+2528|0;ao=a+2544|0;bo=a+2548|0;co=a+2540|0;eo=a+2556|0;fo=a+2560|0;go=a+2552|0;ho=a+2568|0;io=a+2564|0;jo=a+2580|0;ko=a+2576|0;lo=a+2572|0;mo=a+2584|0;no=a+2596|0;oo=a+2588|0;po=a+2592|0;qo=a+2608|0;ro=a+2604|0;so=a+2600|0;to=a+2616|0;uo=a+2620|0;vo=a+2612|0;wo=a+2628|0;xo=a+2624|0;yo=a+2640|0;zo=a+2636|0;Ao=a+2632|0;Bo=a+2644|0;Co=a+2656|0;Do=a+2648|0;Eo=a+2652|0;Fo=a+2668|0;Go=a+2664|0;Ho=a+2660|0;Io=a+2676|0;Jo=a+2672|0;Ko=a+2688|0;Lo=a+2684|0;Mo=a+2680|0;No=a+2696|0;Oo=a+200916|0;Po=a+200920|0;Qo=a+2692|0;Ro=a+2708|0;So=a+2704|0;To=a+2700|0;Uo=a+2716|0;Vo=a+2720|0;Wo=a+2712|0;Xo=a+2728|0;Yo=a+2732|0;Zo=a+2724|0;_o=a+2740|0;$o=a+2744|0;ap=a+2736|0;bp=a+2752|0;cp=a+2748|0;dp=a+2764|0;ep=a+2760|0;fp=a+2756|0;gp=a+2768|0;hp=a+2780|0;ip=a+2772|0;jp=a+2776|0;kp=a+2792|0;lp=a+2788|0;mp=a+2784|0;np=a+2800|0;op=a+2804|0;pp=a+2796|0;qp=a+2812|0;rp=a+2816|0;sp=a+2808|0;tp=a+2824|0;up=a+2820|0;vp=a+2836|0;wp=a+2832|0;xp=a+2828|0;yp=a+2840|0;zp=a+2852|0;Ap=a+2844|0;Bp=a+2848|0;Cp=a+2864|0;Dp=a+2860|0;Ep=a+2856|0;Fp=a+2872|0;Gp=a+2876|0;Hp=a+2868|0;Ip=a+2884|0;Jp=a+2880|0;Kp=a+2896|0;Lp=a+2892|0;Mp=a+2888|0;Np=a+2900|0;Op=a+2912|0;Pp=a+2904|0;Qp=a+2908|0;Rp=a+2924|0;Sp=a+2920|0;Tp=a+2916|0;Up=a+2932|0;Vp=a+2928|0;Wp=a+2944|0;Xp=a+2940|0;Yp=a+2936|0;Zp=a+2952|0;_p=a+463156|0;$p=a+463160|0;aq=a+2948|0;bq=a+2964|0;cq=a+2960|0;dq=a+2956|0;eq=a+2972|0;fq=a+2976|0;gq=a+2968|0;hq=a+2984|0;iq=a+2988|0;jq=a+2980|0;kq=a+2996|0;lq=a+3e3|0;mq=a+2992|0;nq=a+3008|0;oq=a+3004|0;pq=a+3020|0;qq=a+3016|0;rq=a+3012|0;sq=a+3024|0;tq=a+3036|0;uq=a+3028|0;vq=a+3032|0;wq=a+3048|0;xq=a+3044|0;yq=a+3040|0;zq=a+3056|0;Aq=a+3060|0;Bq=a+3052|0;Cq=a+3068|0;Dq=a+3072|0;Eq=a+3064|0;Fq=a+3080|0;Gq=a+3076|0;Hq=a+3092|0;Iq=a+3088|0;Jq=a+3084|0;Kq=a+3096|0;Lq=a+3108|0;Mq=a+3100|0;Nq=a+3104|0;Oq=a+3120|0;Pq=a+3116|0;Qq=a+3112|0;Rq=a+3128|0;Sq=a+3132|0;Tq=a+3124|0;Uq=a+3140|0;Vq=a+3136|0;Wq=a+3152|0;Xq=a+3148|0;Yq=a+3144|0;Zq=a+3156|0;_q=a+3168|0;$q=a+3160|0;ar=a+3164|0;br=a+3180|0;cr=a+3176|0;dr=a+3172|0;er=a+3188|0;fr=a+3184|0;gr=a+3200|0;hr=a+3196|0;ir=a+3192|0;jr=a+3208|0;kr=a+135356|0;lr=a+135360|0;mr=a+3204|0;nr=a+3220|0;or=a+3216|0;pr=a+3212|0;qr=a+3228|0;rr=a+3232|0;sr=a+3224|0;tr=a+3240|0;ur=a+3244|0;vr=a+3236|0;wr=a+3252|0;xr=a+3256|0;yr=a+3248|0;zr=a+3264|0;Ar=a+3260|0;Br=a+3276|0;Cr=a+3272|0;Dr=a+3268|0;Er=a+3280|0;Fr=a+3292|0;Gr=a+3284|0;Hr=a+3288|0;Ir=a+3304|0;Jr=a+3300|0;Kr=a+3296|0;Lr=a+3312|0;Mr=a+3316|0;Nr=a+3308|0;Or=a+3324|0;Pr=a+3328|0;Qr=a+3320|0;Rr=a+3336|0;Sr=a+3332|0;Tr=a+3348|0;Ur=a+3344|0;Vr=a+3340|0;Wr=a+3352|0;Xr=a+3364|0;Yr=a+3356|0;Zr=a+3360|0;_r=a+3376|0;$r=a+3372|0;as=a+3368|0;bs=a+3384|0;cs=a+3388|0;ds=a+3380|0;es=a+3396|0;fs=a+3392|0;gs=a+3408|0;hs=a+3404|0;is=a+3400|0;js=a+3412|0;ks=a+3424|0;ls=a+3416|0;ms=a+3420|0;ns=a+3436|0;os=a+3432|0;ps=a+3428|0;qs=a+3444|0;rs=a+3440|0;ss=a+3456|0;ts=a+3452|0;us=a+3448|0;vs=a+3464|0;ws=a+397596|0;xs=a+397600|0;ys=a+3460|0;zs=a+3476|0;As=a+3472|0;Bs=a+3468|0;Cs=a+3484|0;Ds=a+3488|0;Es=a+3480|0;Fs=a+3496|0;Gs=a+3500|0;Hs=a+3492|0;Is=a+3508|0;Js=a+3512|0;Ks=a+3504|0;Ls=a+3520|0;Ms=a+3516|0;Ns=a+3532|0;Os=a+3528|0;Ps=a+3524|0;Qs=a+3536|0;Rs=a+3548|0;Ss=a+3540|0;Ts=a+3544|0;Us=a+3560|0;Vs=a+3556|0;Ws=a+3552|0;Xs=a+3568|0;Ys=a+3572|0;Zs=a+3564|0;_s=a+3580|0;$s=a+3584|0;at=a+3576|0;bt=a+3592|0;ct=a+3588|0;dt=a+3604|0;et=a+3600|0;ft=a+3596|0;gt=a+3608|0;ht=a+3620|0;it=a+3612|0;jt=a+3616|0;kt=a+3632|0;lt=a+3628|0;mt=a+3624|0;nt=a+3640|0;ot=a+3644|0;pt=a+3636|0;qt=a+3652|0;rt=a+3648|0;st=a+3664|0;tt=a+3660|0;ut=a+3656|0;vt=a+3668|0;wt=a+3680|0;xt=a+3672|0;yt=a+3676|0;zt=a+3692|0;At=a+3688|0;Bt=a+3684|0;Ct=a+3700|0;Dt=a+3696|0;Et=a+3712|0;Ft=a+3708|0;Gt=a+3704|0;Ht=a+3720|0;It=a+266476|0;Jt=a+266480|0;Kt=a+3716|0;Lt=a+3732|0;Mt=a+3728|0;Nt=a+3724|0;Ot=a+3740|0;Pt=a+3744|0;Qt=a+3736|0;Rt=a+3752|0;St=a+3756|0;Tt=a+3748|0;Ut=a+3764|0;Vt=a+3768|0;Wt=a+3760|0;Xt=a+3776|0;Yt=a+3772|0;Zt=a+3788|0;_t=a+3784|0;$t=a+3780|0;au=a+3792|0;bu=a+3804|0;cu=a+3796|0;du=a+3800|0;eu=a+3816|0;fu=a+3812|0;gu=a+3808|0;hu=a+3824|0;iu=a+3828|0;ju=a+3820|0;ku=a+3836|0;lu=a+3840|0;mu=a+3832|0;nu=a+3848|0;ou=a+3844|0;pu=a+3860|0;qu=a+3856|0;ru=a+3852|0;su=a+3864|0;tu=a+3876|0;uu=a+3868|0;vu=a+3872|0;wu=a+3888|0;xu=a+3884|0;yu=a+3880|0;zu=a+3896|0;Au=a+3900|0;Bu=a+3892|0;Cu=a+3908|0;Du=a+3904|0;Eu=a+3920|0;Fu=a+3916|0;Gu=a+3912|0;Hu=a+3924|0;Iu=a+3936|0;Ju=a+3928|0;Ku=a+3932|0;Lu=a+3948|0;Mu=a+3944|0;Nu=a+3940|0;Ou=a+3956|0;Pu=a+3952|0;Qu=a+3968|0;Ru=a+3964|0;Su=a+3960|0;Tu=a+3976|0;Uu=a+528716|0;Vu=a+528720|0;Wu=a+3972|0;Xu=a+3988|0;Yu=a+3984|0;Zu=a+3980|0;_u=a+3996|0;$u=a+4e3|0;av=a+3992|0;bv=a+4008|0;cv=a+4012|0;dv=a+4004|0;ev=a+4020|0;fv=a+4024|0;gv=a+4016|0;hv=a+4032|0;iv=a+4028|0;jv=a+4044|0;kv=a+4040|0;lv=a+4036|0;mv=a+4048|0;nv=a+4060|0;ov=a+4052|0;pv=a+4056|0;qv=a+4072|0;rv=a+4068|0;sv=a+4064|0;tv=a+4080|0;uv=a+4084|0;vv=a+4076|0;wv=a+4092|0;xv=a+4096|0;yv=a+4088|0;zv=a+4104|0;Av=a+4100|0;Bv=a+4116|0;Cv=a+4112|0;Dv=a+4108|0;Ev=a+4120|0;Fv=a+4132|0;Gv=a+4124|0;Hv=a+4128|0;Iv=a+4144|0;Jv=a+4140|0;Kv=a+4136|0;Lv=a+4152|0;Mv=a+4156|0;Nv=a+4148|0;Ov=a+4164|0;Pv=a+4160|0;Qv=a+4176|0;Rv=a+4172|0;Sv=a+4168|0;Tv=a+4180|0;Uv=a+4192|0;Vv=a+4184|0;Wv=a+4188|0;Xv=a+4204|0;Yv=a+4200|0;Zv=a+4196|0;_v=a+4212|0;$v=a+4208|0;aw=a+4224|0;bw=a+4220|0;cw=a+4216|0;dw=a+4228|0;ew=a+37e3|0;fw=a+37016|0;gw=a+37020|0;hw=a+69792|0;iw=a+102572|0;jw=a+135352|0;kw=a+168132|0;lw=a+200912|0;mw=a+233692|0;nw=a+266472|0;ow=a+299252|0;pw=a+332032|0;qw=a+364812|0;rw=a+397592|0;sw=a+430372|0;tw=a+463152|0;uw=a+495932|0;vw=a+528712|0;ww=c[e>>2]|0;Sb=+g[qc>>2];Xa=+g[rc>>2];tb=+g[sc>>2];za=+g[vc>>2];Gb=+g[xc>>2];La=+g[yc>>2];hb=+g[Cc>>2];t=+g[Dc>>2];Mb=+g[Fc>>2];Ra=+g[Gc>>2];nb=+g[Ic>>2];ta=+g[Jc>>2];zb=+g[Lc>>2];Fa=+g[Mc>>2];bb=+g[Oc>>2];xw=0;do{yw=(ea(ww,1103515245)|0)+12345|0;c[pc>>2]=yw;U=Sb*.5221893787384033+(Xa*2.4949560165405273+ +(yw|0)*4.656612873077393e-10)-tb*2.017265796661377;g[tc>>2]=U;q=j*(tb*.05061269924044609+U*.04992203414440155-(Xa*.0959935337305069+Sb*.0044087860733270645));g[uc>>2]=k;U=l*+g[mc+(xw<<2)>>2];g[wc>>2]=m;v=+g[zc>>2];r=+g[Ac>>2];zw=E*La+F*(z*v+A*r);g[Bc>>2]=zw;Aw=zw-C*(G*hb+y*t);g[Ec>>2]=Aw;zw=O*Mb;Bw=C*(D*hb+(H*t+D*Aw))-M*(zw+P*Ra);g[Hc>>2]=Bw;Aw=_*nb;Cw=Ra+M*(zw+P*Bw)-W*(Aw+X*ta);g[Kc>>2]=Cw;Bw=ga*zb;g[Nc>>2]=ta+W*(Aw+X*Cw)-da*(Bw+ha*Fa);Cw=E*bb+F*(v+r);g[Pc>>2]=Cw;r=+g[Qc>>2];v=+g[Rc>>2];Aw=Cw-C*(G*r+y*v);g[Sc>>2]=Aw;Cw=r+(v*2.0+Aw);Aw=C*Cw;g[Tc>>2]=Aw;v=+g[Vc>>2];r=ka*+g[Uc>>2]+la*(K*v+J*Cw);g[Wc>>2]=r;Cw=+g[Xc>>2];zw=+g[Yc>>2];Dw=r-M*(P*Cw+O*zw);g[Zc>>2]=Dw;r=_*+g[_c>>2];Ew=+g[$c>>2];Fw=M*(N*Cw+(I*zw+N*Dw))-W*(r+X*Ew);g[ad>>2]=Fw;Dw=ga*+g[bd>>2];g[dd>>2]=Ew+W*(r+X*Fw)-da*(Dw+ha*+g[cd>>2]);Fw=ka*+g[ed>>2]+la*(Aw+v);g[fd>>2]=Fw;v=+g[gd>>2];Aw=+g[hd>>2];r=Fw-M*(P*v+O*Aw);g[id>>2]=r;Fw=v+(Aw*2.0+r);r=M*Fw;g[jd>>2]=r;Aw=+g[ld>>2];v=na*+g[kd>>2]+oa*(T*Aw+R*Fw);g[md>>2]=v;Fw=+g[nd>>2];Ew=+g[od>>2];zw=v-W*(X*Fw+_*Ew);g[pd>>2]=zw;v=ga*+g[qd>>2];Cw=+g[rd>>2];Gw=W*(Z*Fw+(Q*Ew+Z*zw))-da*(v+ha*Cw);g[sd>>2]=Gw;zw=na*+g[td>>2]+oa*(r+Aw);g[ud>>2]=zw;Aw=+g[vd>>2];r=+g[wd>>2];Ew=zw-W*(X*Aw+_*r);g[xd>>2]=Ew;zw=Aw+(r*2.0+Ew);Ew=W*zw;g[yd>>2]=Ew;r=+g[Ad>>2];Aw=qa*+g[zd>>2]+ra*(aa*r+x*zw);g[Bd>>2]=Aw;zw=+g[Cd>>2];Fw=+g[Dd>>2];Hw=Aw-da*(ha*zw+ga*Fw);g[Ed>>2]=Hw;Aw=qa*+g[Fd>>2]+ra*(Ew+r);g[Gd>>2]=Aw;r=+g[Hd>>2];Ew=+g[Id>>2];Iw=Aw-da*(ha*r+ga*Ew);g[Jd>>2]=Iw;Aw=w*(+g[Mc>>2]+da*(Bw+ha*+g[Nc>>2]))+ja*(+g[cd>>2]+da*(Dw+ha*+g[dd>>2]))+ma*(Cw+da*(v+ha*Gw))+da*(pa*(fa*Hw+$*Fw+fa*zw)+sa*(r+(Iw+Ew*2.0)));Ew=+g[Ld>>2];Iw=+g[Md>>2];r=E*+g[Kd>>2]+F*(z*Ew+A*Iw);g[Nd>>2]=r;zw=+g[Od>>2];Fw=+g[Pd>>2];Hw=r-C*(G*zw+y*Fw);g[Qd>>2]=Hw;r=O*+g[Rd>>2];Gw=+g[Sd>>2];v=C*(D*zw+(H*Fw+D*Hw))-M*(r+P*Gw);g[Td>>2]=v;Hw=_*+g[Ud>>2];Fw=+g[Vd>>2];zw=Gw+M*(r+P*v)-W*(Hw+X*Fw);g[Wd>>2]=zw;v=ga*+g[Xd>>2];g[Zd>>2]=Fw+W*(Hw+X*zw)-da*(v+ha*+g[Yd>>2]);zw=E*+g[_d>>2]+F*(Ew+Iw);g[$d>>2]=zw;Iw=+g[ae>>2];Ew=+g[be>>2];Hw=zw-C*(G*Iw+y*Ew);g[ce>>2]=Hw;zw=Iw+(Ew*2.0+Hw);Hw=C*zw;g[de>>2]=Hw;Ew=+g[fe>>2];Iw=ka*+g[ee>>2]+la*(K*Ew+J*zw);g[ge>>2]=Iw;zw=+g[he>>2];Fw=+g[ie>>2];r=Iw-M*(P*zw+O*Fw);g[je>>2]=r;Iw=_*+g[ke>>2];Gw=+g[le>>2];Cw=M*(N*zw+(I*Fw+N*r))-W*(Iw+X*Gw);g[me>>2]=Cw;r=ga*+g[ne>>2];g[pe>>2]=Gw+W*(Iw+X*Cw)-da*(r+ha*+g[oe>>2]);Cw=ka*+g[qe>>2]+la*(Hw+Ew);g[re>>2]=Cw;Ew=+g[se>>2];Hw=+g[te>>2];Iw=Cw-M*(P*Ew+O*Hw);g[ue>>2]=Iw;Cw=Ew+(Hw*2.0+Iw);Iw=M*Cw;g[ve>>2]=Iw;Hw=+g[xe>>2];Ew=na*+g[we>>2]+oa*(T*Hw+R*Cw);g[ye>>2]=Ew;Cw=+g[ze>>2];Gw=+g[Ae>>2];Fw=Ew-W*(X*Cw+_*Gw);g[Be>>2]=Fw;Ew=ga*+g[Ce>>2];zw=+g[De>>2];Dw=W*(Z*Cw+(Q*Gw+Z*Fw))-da*(Ew+ha*zw);g[Ee>>2]=Dw;Fw=na*+g[Fe>>2]+oa*(Iw+Hw);g[Ge>>2]=Fw;Hw=+g[He>>2];Iw=+g[Ie>>2];Gw=Fw-W*(X*Hw+_*Iw);g[Je>>2]=Gw;Fw=Hw+(Iw*2.0+Gw);Gw=W*Fw;g[Ke>>2]=Gw;Iw=+g[Me>>2];Hw=qa*+g[Le>>2]+ra*(aa*Iw+x*Fw);g[Ne>>2]=Hw;Fw=+g[Oe>>2];Cw=+g[Pe>>2];Bw=Hw-da*(ha*Fw+ga*Cw);g[Qe>>2]=Bw;Hw=qa*+g[Re>>2]+ra*(Gw+Iw);g[Se>>2]=Hw;Iw=+g[Te>>2];Gw=+g[Ue>>2];Jw=Hw-da*(ha*Iw+ga*Gw);g[Ve>>2]=Jw;Hw=ua*(+g[Yd>>2]+da*(v+ha*+g[Zd>>2]))+va*(+g[oe>>2]+da*(r+ha*+g[pe>>2]))+wa*(zw+da*(Ew+ha*Dw))+da*(xa*(fa*Bw+$*Cw+fa*Fw)+ya*(Iw+(Jw+Gw*2.0)));Gw=Aw+Hw;Jw=+g[Xe>>2];Iw=+g[Ye>>2];Fw=E*+g[We>>2]+F*(z*Jw+A*Iw);g[Ze>>2]=Fw;Cw=+g[_e>>2];Bw=+g[$e>>2];Dw=Fw-C*(G*Cw+y*Bw);g[af>>2]=Dw;Fw=O*+g[bf>>2];Ew=+g[cf>>2];zw=C*(D*Cw+(H*Bw+D*Dw))-M*(Fw+P*Ew);g[df>>2]=zw;Dw=_*+g[ef>>2];Bw=+g[ff>>2];Cw=Ew+M*(Fw+P*zw)-W*(Dw+X*Bw);g[gf>>2]=Cw;zw=ga*+g[hf>>2];g[kf>>2]=Bw+W*(Dw+X*Cw)-da*(zw+ha*+g[jf>>2]);Cw=E*+g[lf>>2]+F*(Jw+Iw);g[mf>>2]=Cw;Iw=+g[nf>>2];Jw=+g[of>>2];Dw=Cw-C*(G*Iw+y*Jw);g[pf>>2]=Dw;Cw=Iw+(Jw*2.0+Dw);Dw=C*Cw;g[qf>>2]=Dw;Jw=+g[sf>>2];Iw=ka*+g[rf>>2]+la*(K*Jw+J*Cw);g[tf>>2]=Iw;Cw=+g[uf>>2];Bw=+g[vf>>2];Fw=Iw-M*(P*Cw+O*Bw);g[wf>>2]=Fw;Iw=_*+g[xf>>2];Ew=+g[yf>>2];r=M*(N*Cw+(I*Bw+N*Fw))-W*(Iw+X*Ew);g[zf>>2]=r;Fw=ga*+g[Af>>2];g[Cf>>2]=Ew+W*(Iw+X*r)-da*(Fw+ha*+g[Bf>>2]);r=ka*+g[Df>>2]+la*(Dw+Jw);g[Ef>>2]=r;Jw=+g[Ff>>2];Dw=+g[Gf>>2];Iw=r-M*(P*Jw+O*Dw);g[Hf>>2]=Iw;r=Jw+(Dw*2.0+Iw);Iw=M*r;g[If>>2]=Iw;Dw=+g[Kf>>2];Jw=na*+g[Jf>>2]+oa*(T*Dw+R*r);g[Lf>>2]=Jw;r=+g[Mf>>2];Ew=+g[Nf>>2];Bw=Jw-W*(X*r+_*Ew);g[Of>>2]=Bw;Jw=ga*+g[Pf>>2];Cw=+g[Qf>>2];v=W*(Z*r+(Q*Ew+Z*Bw))-da*(Jw+ha*Cw);g[Rf>>2]=v;Bw=na*+g[Sf>>2]+oa*(Iw+Dw);g[Tf>>2]=Bw;Dw=+g[Uf>>2];Iw=+g[Vf>>2];Ew=Bw-W*(X*Dw+_*Iw);g[Wf>>2]=Ew;Bw=Dw+(Iw*2.0+Ew);Ew=W*Bw;g[Xf>>2]=Ew;Iw=+g[Zf>>2];Dw=qa*+g[Yf>>2]+ra*(aa*Iw+x*Bw);g[_f>>2]=Dw;Bw=+g[$f>>2];r=+g[ag>>2];Kw=Dw-da*(ha*Bw+ga*r);g[bg>>2]=Kw;Dw=qa*+g[cg>>2]+ra*(Ew+Iw);g[dg>>2]=Dw;Iw=+g[eg>>2];Ew=+g[fg>>2];Lw=Dw-da*(ha*Iw+ga*Ew);g[gg>>2]=Lw;Dw=Aa*(+g[jf>>2]+da*(zw+ha*+g[kf>>2]))+Ba*(+g[Bf>>2]+da*(Fw+ha*+g[Cf>>2]))+Ca*(Cw+da*(Jw+ha*v))+da*(Da*(fa*Kw+$*r+fa*Bw)+Ea*(Iw+(Lw+Ew*2.0)));Ew=+g[ig>>2];Lw=+g[jg>>2];Iw=E*+g[hg>>2]+F*(z*Ew+A*Lw);g[kg>>2]=Iw;Bw=+g[lg>>2];r=+g[mg>>2];Kw=Iw-C*(G*Bw+y*r);g[ng>>2]=Kw;Iw=O*+g[og>>2];v=+g[pg>>2];Jw=C*(D*Bw+(H*r+D*Kw))-M*(Iw+P*v);g[qg>>2]=Jw;Kw=_*+g[rg>>2];r=+g[sg>>2];Bw=v+M*(Iw+P*Jw)-W*(Kw+X*r);g[tg>>2]=Bw;Jw=ga*+g[ug>>2];g[wg>>2]=r+W*(Kw+X*Bw)-da*(Jw+ha*+g[vg>>2]);Bw=E*+g[xg>>2]+F*(Ew+Lw);g[yg>>2]=Bw;Lw=+g[zg>>2];Ew=+g[Ag>>2];Kw=Bw-C*(G*Lw+y*Ew);g[Bg>>2]=Kw;Bw=Lw+(Ew*2.0+Kw);Kw=C*Bw;g[Cg>>2]=Kw;Ew=+g[Eg>>2];Lw=ka*+g[Dg>>2]+la*(K*Ew+J*Bw);g[Fg>>2]=Lw;Bw=+g[Gg>>2];r=+g[Hg>>2];Iw=Lw-M*(P*Bw+O*r);g[Ig>>2]=Iw;Lw=_*+g[Jg>>2];v=+g[Kg>>2];Cw=M*(N*Bw+(I*r+N*Iw))-W*(Lw+X*v);g[Lg>>2]=Cw;Iw=ga*+g[Mg>>2];g[Og>>2]=v+W*(Lw+X*Cw)-da*(Iw+ha*+g[Ng>>2]);Cw=ka*+g[Pg>>2]+la*(Kw+Ew);g[Qg>>2]=Cw;Ew=+g[Rg>>2];Kw=+g[Sg>>2];Lw=Cw-M*(P*Ew+O*Kw);g[Tg>>2]=Lw;Cw=Ew+(Kw*2.0+Lw);Lw=M*Cw;g[Ug>>2]=Lw;Kw=+g[Wg>>2];Ew=na*+g[Vg>>2]+oa*(T*Kw+R*Cw);g[Xg>>2]=Ew;Cw=+g[Yg>>2];v=+g[Zg>>2];r=Ew-W*(X*Cw+_*v);g[_g>>2]=r;Ew=ga*+g[$g>>2];Bw=+g[ah>>2];Fw=W*(Z*Cw+(Q*v+Z*r))-da*(Ew+ha*Bw);g[bh>>2]=Fw;r=na*+g[ch>>2]+oa*(Lw+Kw);g[dh>>2]=r;Kw=+g[eh>>2];Lw=+g[fh>>2];v=r-W*(X*Kw+_*Lw);g[gh>>2]=v;r=Kw+(Lw*2.0+v);v=W*r;g[hh>>2]=v;Lw=+g[jh>>2];Kw=qa*+g[ih>>2]+ra*(aa*Lw+x*r);g[kh>>2]=Kw;r=+g[lh>>2];Cw=+g[mh>>2];zw=Kw-da*(ha*r+ga*Cw);g[nh>>2]=zw;Kw=qa*+g[oh>>2]+ra*(v+Lw);g[ph>>2]=Kw;Lw=+g[qh>>2];v=+g[rh>>2];Mw=Kw-da*(ha*Lw+ga*v);g[sh>>2]=Mw;Kw=Ga*(+g[vg>>2]+da*(Jw+ha*+g[wg>>2]))+Ha*(+g[Ng>>2]+da*(Iw+ha*+g[Og>>2]))+Ia*(Bw+da*(Ew+ha*Fw))+da*(Ja*(fa*zw+$*Cw+fa*r)+Ka*(Lw+(Mw+v*2.0)));v=Dw+Kw;Mw=Gw+v;Lw=+g[uh>>2];r=+g[vh>>2];Cw=E*+g[th>>2]+F*(z*Lw+A*r);g[wh>>2]=Cw;zw=+g[xh>>2];Fw=+g[yh>>2];Ew=Cw-C*(G*zw+y*Fw);g[zh>>2]=Ew;Cw=O*+g[Ah>>2];Bw=+g[Bh>>2];Iw=C*(D*zw+(H*Fw+D*Ew))-M*(Cw+P*Bw);g[Ch>>2]=Iw;Ew=_*+g[Dh>>2];Fw=+g[Eh>>2];zw=Bw+M*(Cw+P*Iw)-W*(Ew+X*Fw);g[Fh>>2]=zw;Iw=ga*+g[Gh>>2];g[Ih>>2]=Fw+W*(Ew+X*zw)-da*(Iw+ha*+g[Hh>>2]);zw=E*+g[Jh>>2]+F*(Lw+r);g[Kh>>2]=zw;r=+g[Lh>>2];Lw=+g[Mh>>2];Ew=zw-C*(G*r+y*Lw);g[Nh>>2]=Ew;zw=r+(Lw*2.0+Ew);Ew=C*zw;g[Oh>>2]=Ew;Lw=+g[Qh>>2];r=ka*+g[Ph>>2]+la*(K*Lw+J*zw);g[Rh>>2]=r;zw=+g[Sh>>2];Fw=+g[Th>>2];Cw=r-M*(P*zw+O*Fw);g[Uh>>2]=Cw;r=_*+g[Vh>>2];Bw=+g[Wh>>2];Jw=M*(N*zw+(I*Fw+N*Cw))-W*(r+X*Bw);g[Xh>>2]=Jw;Cw=ga*+g[Yh>>2];g[_h>>2]=Bw+W*(r+X*Jw)-da*(Cw+ha*+g[Zh>>2]);Jw=ka*+g[$h>>2]+la*(Ew+Lw);g[ai>>2]=Jw;Lw=+g[bi>>2];Ew=+g[ci>>2];r=Jw-M*(P*Lw+O*Ew);g[di>>2]=r;Jw=Lw+(Ew*2.0+r);r=M*Jw;g[ei>>2]=r;Ew=+g[gi>>2];Lw=na*+g[fi>>2]+oa*(T*Ew+R*Jw);g[hi>>2]=Lw;Jw=+g[ii>>2];Bw=+g[ji>>2];Fw=Lw-W*(X*Jw+_*Bw);g[ki>>2]=Fw;Lw=ga*+g[li>>2];zw=+g[mi>>2];Nw=W*(Z*Jw+(Q*Bw+Z*Fw))-da*(Lw+ha*zw);g[ni>>2]=Nw;Fw=na*+g[oi>>2]+oa*(r+Ew);g[pi>>2]=Fw;Ew=+g[qi>>2];r=+g[ri>>2];Bw=Fw-W*(X*Ew+_*r);g[si>>2]=Bw;Fw=Ew+(r*2.0+Bw);Bw=W*Fw;g[ti>>2]=Bw;r=+g[vi>>2];Ew=qa*+g[ui>>2]+ra*(aa*r+x*Fw);g[wi>>2]=Ew;Fw=+g[xi>>2];Jw=+g[yi>>2];Ow=Ew-da*(ha*Fw+ga*Jw);g[zi>>2]=Ow;Ew=qa*+g[Ai>>2]+ra*(Bw+r);g[Bi>>2]=Ew;r=+g[Ci>>2];Bw=+g[Di>>2];Pw=Ew-da*(ha*r+ga*Bw);g[Ei>>2]=Pw;Ew=Ma*(+g[Hh>>2]+da*(Iw+ha*+g[Ih>>2]))+Na*(+g[Zh>>2]+da*(Cw+ha*+g[_h>>2]))+Oa*(zw+da*(Lw+ha*Nw))+da*(Pa*(fa*Ow+$*Jw+fa*Fw)+Qa*(r+(Pw+Bw*2.0)));Bw=+g[Gi>>2];Pw=+g[Hi>>2];r=E*+g[Fi>>2]+F*(z*Bw+A*Pw);g[Ii>>2]=r;Fw=+g[Ji>>2];Jw=+g[Ki>>2];Ow=r-C*(G*Fw+y*Jw);g[Li>>2]=Ow;r=O*+g[Mi>>2];Nw=+g[Ni>>2];Lw=C*(D*Fw+(H*Jw+D*Ow))-M*(r+P*Nw);g[Oi>>2]=Lw;Ow=_*+g[Pi>>2];Jw=+g[Qi>>2];Fw=Nw+M*(r+P*Lw)-W*(Ow+X*Jw);g[Ri>>2]=Fw;Lw=ga*+g[Si>>2];g[Ui>>2]=Jw+W*(Ow+X*Fw)-da*(Lw+ha*+g[Ti>>2]);Fw=E*+g[Vi>>2]+F*(Bw+Pw);g[Wi>>2]=Fw;Pw=+g[Xi>>2];Bw=+g[Yi>>2];Ow=Fw-C*(G*Pw+y*Bw);g[Zi>>2]=Ow;Fw=Pw+(Bw*2.0+Ow);Ow=C*Fw;g[_i>>2]=Ow;Bw=+g[aj>>2];Pw=ka*+g[$i>>2]+la*(K*Bw+J*Fw);g[bj>>2]=Pw;Fw=+g[cj>>2];Jw=+g[dj>>2];r=Pw-M*(P*Fw+O*Jw);g[ej>>2]=r;Pw=_*+g[fj>>2];Nw=+g[gj>>2];zw=M*(N*Fw+(I*Jw+N*r))-W*(Pw+X*Nw);g[hj>>2]=zw;r=ga*+g[ij>>2];g[kj>>2]=Nw+W*(Pw+X*zw)-da*(r+ha*+g[jj>>2]);zw=ka*+g[lj>>2]+la*(Ow+Bw);g[mj>>2]=zw;Bw=+g[nj>>2];Ow=+g[oj>>2];Pw=zw-M*(P*Bw+O*Ow);g[pj>>2]=Pw;zw=Bw+(Ow*2.0+Pw);Pw=M*zw;g[qj>>2]=Pw;Ow=+g[sj>>2];Bw=na*+g[rj>>2]+oa*(T*Ow+R*zw);g[tj>>2]=Bw;zw=+g[uj>>2];Nw=+g[vj>>2];Jw=Bw-W*(X*zw+_*Nw);g[wj>>2]=Jw;Bw=ga*+g[xj>>2];Fw=+g[yj>>2];Cw=W*(Z*zw+(Q*Nw+Z*Jw))-da*(Bw+ha*Fw);g[zj>>2]=Cw;Jw=na*+g[Aj>>2]+oa*(Pw+Ow);g[Bj>>2]=Jw;Ow=+g[Cj>>2];Pw=+g[Dj>>2];Nw=Jw-W*(X*Ow+_*Pw);g[Ej>>2]=Nw;Jw=Ow+(Pw*2.0+Nw);Nw=W*Jw;g[Fj>>2]=Nw;Pw=+g[Hj>>2];Ow=qa*+g[Gj>>2]+ra*(aa*Pw+x*Jw);g[Ij>>2]=Ow;Jw=+g[Jj>>2];zw=+g[Kj>>2];Iw=Ow-da*(ha*Jw+ga*zw);g[Lj>>2]=Iw;Ow=qa*+g[Mj>>2]+ra*(Nw+Pw);g[Nj>>2]=Ow;Pw=+g[Oj>>2];Nw=+g[Pj>>2];Qw=Ow-da*(ha*Pw+ga*Nw);g[Qj>>2]=Qw;Ow=Sa*(+g[Ti>>2]+da*(Lw+ha*+g[Ui>>2]))+Ta*(+g[jj>>2]+da*(r+ha*+g[kj>>2]))+Ua*(Fw+da*(Bw+ha*Cw))+da*(Va*(fa*Iw+$*zw+fa*Jw)+Wa*(Pw+(Qw+Nw*2.0)));Nw=Ew+Ow;Qw=+g[Sj>>2];Pw=+g[Tj>>2];Jw=E*+g[Rj>>2]+F*(z*Qw+A*Pw);g[Uj>>2]=Jw;zw=+g[Vj>>2];Iw=+g[Wj>>2];Cw=Jw-C*(G*zw+y*Iw);g[Xj>>2]=Cw;Jw=O*+g[Yj>>2];Bw=+g[Zj>>2];Fw=C*(D*zw+(H*Iw+D*Cw))-M*(Jw+P*Bw);g[_j>>2]=Fw;Cw=_*+g[$j>>2];Iw=+g[ak>>2];zw=Bw+M*(Jw+P*Fw)-W*(Cw+X*Iw);g[bk>>2]=zw;Fw=ga*+g[ck>>2];g[ek>>2]=Iw+W*(Cw+X*zw)-da*(Fw+ha*+g[dk>>2]);zw=E*+g[fk>>2]+F*(Qw+Pw);g[gk>>2]=zw;Pw=+g[hk>>2];Qw=+g[ik>>2];Cw=zw-C*(G*Pw+y*Qw);g[jk>>2]=Cw;zw=Pw+(Qw*2.0+Cw);Cw=C*zw;g[kk>>2]=Cw;Qw=+g[mk>>2];Pw=ka*+g[lk>>2]+la*(K*Qw+J*zw);g[nk>>2]=Pw;zw=+g[ok>>2];Iw=+g[pk>>2];Jw=Pw-M*(P*zw+O*Iw);g[qk>>2]=Jw;Pw=_*+g[rk>>2];Bw=+g[sk>>2];r=M*(N*zw+(I*Iw+N*Jw))-W*(Pw+X*Bw);g[tk>>2]=r;Jw=ga*+g[uk>>2];g[wk>>2]=Bw+W*(Pw+X*r)-da*(Jw+ha*+g[vk>>2]);r=ka*+g[xk>>2]+la*(Cw+Qw);g[yk>>2]=r;Qw=+g[zk>>2];Cw=+g[Ak>>2];Pw=r-M*(P*Qw+O*Cw);g[Bk>>2]=Pw;r=Qw+(Cw*2.0+Pw);Pw=M*r;g[Ck>>2]=Pw;Cw=+g[Ek>>2];Qw=na*+g[Dk>>2]+oa*(T*Cw+R*r);g[Fk>>2]=Qw;r=+g[Gk>>2];Bw=+g[Hk>>2];Iw=Qw-W*(X*r+_*Bw);g[Ik>>2]=Iw;Qw=ga*+g[Jk>>2];zw=+g[Kk>>2];Lw=W*(Z*r+(Q*Bw+Z*Iw))-da*(Qw+ha*zw);g[Lk>>2]=Lw;Iw=na*+g[Mk>>2]+oa*(Pw+Cw);g[Nk>>2]=Iw;Cw=+g[Ok>>2];Pw=+g[Pk>>2];Bw=Iw-W*(X*Cw+_*Pw);g[Qk>>2]=Bw;Iw=Cw+(Pw*2.0+Bw);Bw=W*Iw;g[Rk>>2]=Bw;Pw=+g[Tk>>2];Cw=qa*+g[Sk>>2]+ra*(aa*Pw+x*Iw);g[Uk>>2]=Cw;Iw=+g[Vk>>2];r=+g[Wk>>2];Rw=Cw-da*(ha*Iw+ga*r);g[Xk>>2]=Rw;Cw=qa*+g[Yk>>2]+ra*(Bw+Pw);g[Zk>>2]=Cw;Pw=+g[_k>>2];Bw=+g[$k>>2];Sw=Cw-da*(ha*Pw+ga*Bw);g[al>>2]=Sw;Cw=Ya*(+g[dk>>2]+da*(Fw+ha*+g[ek>>2]))+Za*(+g[vk>>2]+da*(Jw+ha*+g[wk>>2]))+_a*(zw+da*(Qw+ha*Lw))+da*($a*(fa*Rw+$*r+fa*Iw)+ab*(Pw+(Sw+Bw*2.0)));Bw=+g[cl>>2];Sw=+g[dl>>2];Pw=E*+g[bl>>2]+F*(z*Bw+A*Sw);g[el>>2]=Pw;Iw=+g[fl>>2];r=+g[gl>>2];Rw=Pw-C*(G*Iw+y*r);g[hl>>2]=Rw;Pw=O*+g[il>>2];Lw=+g[jl>>2];Qw=C*(D*Iw+(H*r+D*Rw))-M*(Pw+P*Lw);g[kl>>2]=Qw;Rw=_*+g[ll>>2];r=+g[ml>>2];Iw=Lw+M*(Pw+P*Qw)-W*(Rw+X*r);g[nl>>2]=Iw;Qw=ga*+g[ol>>2];g[ql>>2]=r+W*(Rw+X*Iw)-da*(Qw+ha*+g[pl>>2]);Iw=E*+g[rl>>2]+F*(Bw+Sw);g[sl>>2]=Iw;Sw=+g[tl>>2];Bw=+g[ul>>2];Rw=Iw-C*(G*Sw+y*Bw);g[vl>>2]=Rw;Iw=Sw+(Bw*2.0+Rw);Rw=C*Iw;g[wl>>2]=Rw;Bw=+g[yl>>2];Sw=ka*+g[xl>>2]+la*(K*Bw+J*Iw);g[zl>>2]=Sw;Iw=+g[Al>>2];r=+g[Bl>>2];Pw=Sw-M*(P*Iw+O*r);g[Cl>>2]=Pw;Sw=_*+g[Dl>>2];Lw=+g[El>>2];zw=M*(N*Iw+(I*r+N*Pw))-W*(Sw+X*Lw);g[Fl>>2]=zw;Pw=ga*+g[Gl>>2];g[Il>>2]=Lw+W*(Sw+X*zw)-da*(Pw+ha*+g[Hl>>2]);zw=ka*+g[Jl>>2]+la*(Rw+Bw);g[Kl>>2]=zw;Bw=+g[Ll>>2];Rw=+g[Ml>>2];Sw=zw-M*(P*Bw+O*Rw);g[Nl>>2]=Sw;zw=Bw+(Rw*2.0+Sw);Sw=M*zw;g[Ol>>2]=Sw;Rw=+g[Ql>>2];Bw=na*+g[Pl>>2]+oa*(T*Rw+R*zw);g[Rl>>2]=Bw;zw=+g[Sl>>2];Lw=+g[Tl>>2];r=Bw-W*(X*zw+_*Lw);g[Ul>>2]=r;Bw=ga*+g[Vl>>2];Iw=+g[Wl>>2];Jw=W*(Z*zw+(Q*Lw+Z*r))-da*(Bw+ha*Iw);g[Xl>>2]=Jw;r=na*+g[Yl>>2]+oa*(Sw+Rw);g[Zl>>2]=r;Rw=+g[_l>>2];Sw=+g[$l>>2];Lw=r-W*(X*Rw+_*Sw);g[am>>2]=Lw;r=Rw+(Sw*2.0+Lw);Lw=W*r;g[bm>>2]=Lw;Sw=+g[dm>>2];Rw=qa*+g[cm>>2]+ra*(aa*Sw+x*r);g[em>>2]=Rw;r=+g[fm>>2];zw=+g[gm>>2];Fw=Rw-da*(ha*r+ga*zw);g[hm>>2]=Fw;Rw=qa*+g[im>>2]+ra*(Lw+Sw);g[jm>>2]=Rw;Sw=+g[km>>2];Lw=+g[lm>>2];Tw=Rw-da*(ha*Sw+ga*Lw);g[mm>>2]=Tw;Rw=cb*(+g[pl>>2]+da*(Qw+ha*+g[ql>>2]))+db*(+g[Hl>>2]+da*(Pw+ha*+g[Il>>2]))+eb*(Iw+da*(Bw+ha*Jw))+da*(fb*(fa*Fw+$*zw+fa*r)+gb*(Sw+(Tw+Lw*2.0)));Lw=Cw+Rw;Tw=Nw+Lw;Sw=Mw+Tw;r=+g[om>>2];zw=+g[pm>>2];Fw=E*+g[nm>>2]+F*(z*r+A*zw);g[qm>>2]=Fw;Jw=+g[rm>>2];Bw=+g[sm>>2];Iw=Fw-C*(G*Jw+y*Bw);g[tm>>2]=Iw;Fw=O*+g[um>>2];Pw=+g[vm>>2];Qw=C*(D*Jw+(H*Bw+D*Iw))-M*(Fw+P*Pw);g[wm>>2]=Qw;Iw=_*+g[xm>>2];Bw=+g[ym>>2];Jw=Pw+M*(Fw+P*Qw)-W*(Iw+X*Bw);g[zm>>2]=Jw;Qw=ga*+g[Am>>2];g[Cm>>2]=Bw+W*(Iw+X*Jw)-da*(Qw+ha*+g[Bm>>2]);Jw=E*+g[Dm>>2]+F*(r+zw);g[Em>>2]=Jw;zw=+g[Fm>>2];r=+g[Gm>>2];Iw=Jw-C*(G*zw+y*r);g[Hm>>2]=Iw;Jw=zw+(r*2.0+Iw);Iw=C*Jw;g[Im>>2]=Iw;r=+g[Km>>2];zw=ka*+g[Jm>>2]+la*(K*r+J*Jw);g[Lm>>2]=zw;Jw=+g[Mm>>2];Bw=+g[Nm>>2];Fw=zw-M*(P*Jw+O*Bw);g[Om>>2]=Fw;zw=_*+g[Pm>>2];Pw=+g[Qm>>2];Uw=M*(N*Jw+(I*Bw+N*Fw))-W*(zw+X*Pw);g[Rm>>2]=Uw;Fw=ga*+g[Sm>>2];g[Um>>2]=Pw+W*(zw+X*Uw)-da*(Fw+ha*+g[Tm>>2]);Uw=ka*+g[Vm>>2]+la*(Iw+r);g[Wm>>2]=Uw;r=+g[Xm>>2];Iw=+g[Ym>>2];zw=Uw-M*(P*r+O*Iw);g[Zm>>2]=zw;Uw=r+(Iw*2.0+zw);zw=M*Uw;g[_m>>2]=zw;Iw=+g[an>>2];r=na*+g[$m>>2]+oa*(T*Iw+R*Uw);g[bn>>2]=r;Uw=+g[cn>>2];Pw=+g[dn>>2];Bw=r-W*(X*Uw+_*Pw);g[en>>2]=Bw;r=ga*+g[fn>>2];Jw=+g[gn>>2];Vw=W*(Z*Uw+(Q*Pw+Z*Bw))-da*(r+ha*Jw);g[hn>>2]=Vw;Bw=na*+g[jn>>2]+oa*(zw+Iw);g[kn>>2]=Bw;Iw=+g[ln>>2];zw=+g[mn>>2];Pw=Bw-W*(X*Iw+_*zw);g[nn>>2]=Pw;Bw=Iw+(zw*2.0+Pw);Pw=W*Bw;g[on>>2]=Pw;zw=+g[qn>>2];Iw=qa*+g[pn>>2]+ra*(aa*zw+x*Bw);g[rn>>2]=Iw;Bw=+g[sn>>2];Uw=+g[tn>>2];Ww=Iw-da*(ha*Bw+ga*Uw);g[un>>2]=Ww;Iw=qa*+g[vn>>2]+ra*(Pw+zw);g[wn>>2]=Iw;zw=+g[xn>>2];Pw=+g[yn>>2];Xw=Iw-da*(ha*zw+ga*Pw);g[zn>>2]=Xw;Iw=ib*(+g[Bm>>2]+da*(Qw+ha*+g[Cm>>2]))+jb*(+g[Tm>>2]+da*(Fw+ha*+g[Um>>2]))+kb*(Jw+da*(r+ha*Vw))+da*(lb*(fa*Ww+$*Uw+fa*Bw)+mb*(zw+(Xw+Pw*2.0)));Pw=+g[Bn>>2];Xw=+g[Cn>>2];zw=E*+g[An>>2]+F*(z*Pw+A*Xw);g[Dn>>2]=zw;Bw=+g[En>>2];Uw=+g[Fn>>2];Ww=zw-C*(G*Bw+y*Uw);g[Gn>>2]=Ww;zw=O*+g[Hn>>2];Vw=+g[In>>2];r=C*(D*Bw+(H*Uw+D*Ww))-M*(zw+P*Vw);g[Jn>>2]=r;Ww=_*+g[Kn>>2];Uw=+g[Ln>>2];Bw=Vw+M*(zw+P*r)-W*(Ww+X*Uw);g[Mn>>2]=Bw;r=ga*+g[Nn>>2];g[Pn>>2]=Uw+W*(Ww+X*Bw)-da*(r+ha*+g[On>>2]);Bw=E*+g[Qn>>2]+F*(Pw+Xw);g[Rn>>2]=Bw;Xw=+g[Sn>>2];Pw=+g[Tn>>2];Ww=Bw-C*(G*Xw+y*Pw);g[Un>>2]=Ww;Bw=Xw+(Pw*2.0+Ww);Ww=C*Bw;g[Vn>>2]=Ww;Pw=+g[Xn>>2];Xw=ka*+g[Wn>>2]+la*(K*Pw+J*Bw);g[Yn>>2]=Xw;Bw=+g[Zn>>2];Uw=+g[_n>>2];zw=Xw-M*(P*Bw+O*Uw);g[$n>>2]=zw;Xw=_*+g[ao>>2];Vw=+g[bo>>2];Jw=M*(N*Bw+(I*Uw+N*zw))-W*(Xw+X*Vw);g[co>>2]=Jw;zw=ga*+g[eo>>2];g[go>>2]=Vw+W*(Xw+X*Jw)-da*(zw+ha*+g[fo>>2]);Jw=ka*+g[ho>>2]+la*(Ww+Pw);g[io>>2]=Jw;Pw=+g[jo>>2];Ww=+g[ko>>2];Xw=Jw-M*(P*Pw+O*Ww);g[lo>>2]=Xw;Jw=Pw+(Ww*2.0+Xw);Xw=M*Jw;g[mo>>2]=Xw;Ww=+g[oo>>2];Pw=na*+g[no>>2]+oa*(T*Ww+R*Jw);g[po>>2]=Pw;Jw=+g[qo>>2];Vw=+g[ro>>2];Uw=Pw-W*(X*Jw+_*Vw);g[so>>2]=Uw;Pw=ga*+g[to>>2];Bw=+g[uo>>2];Fw=W*(Z*Jw+(Q*Vw+Z*Uw))-da*(Pw+ha*Bw);g[vo>>2]=Fw;Uw=na*+g[wo>>2]+oa*(Xw+Ww);g[xo>>2]=Uw;Ww=+g[yo>>2];Xw=+g[zo>>2];Vw=Uw-W*(X*Ww+_*Xw);g[Ao>>2]=Vw;Uw=Ww+(Xw*2.0+Vw);Vw=W*Uw;g[Bo>>2]=Vw;Xw=+g[Do>>2];Ww=qa*+g[Co>>2]+ra*(aa*Xw+x*Uw);g[Eo>>2]=Ww;Uw=+g[Fo>>2];Jw=+g[Go>>2];Qw=Ww-da*(ha*Uw+ga*Jw);g[Ho>>2]=Qw;Ww=qa*+g[Io>>2]+ra*(Vw+Xw);g[Jo>>2]=Ww;Xw=+g[Ko>>2];Vw=+g[Lo>>2];Yw=Ww-da*(ha*Xw+ga*Vw);g[Mo>>2]=Yw;Ww=ob*(+g[On>>2]+da*(r+ha*+g[Pn>>2]))+pb*(+g[fo>>2]+da*(zw+ha*+g[go>>2]))+qb*(Bw+da*(Pw+ha*Fw))+da*(rb*(fa*Qw+$*Jw+fa*Uw)+sb*(Xw+(Yw+Vw*2.0)));Vw=Iw+Ww;Yw=+g[Oo>>2];Xw=+g[Po>>2];Uw=E*+g[No>>2]+F*(z*Yw+A*Xw);g[Qo>>2]=Uw;Jw=+g[Ro>>2];Qw=+g[So>>2];Fw=Uw-C*(G*Jw+y*Qw);g[To>>2]=Fw;Uw=O*+g[Uo>>2];Pw=+g[Vo>>2];Bw=C*(D*Jw+(H*Qw+D*Fw))-M*(Uw+P*Pw);g[Wo>>2]=Bw;Fw=_*+g[Xo>>2];Qw=+g[Yo>>2];Jw=Pw+M*(Uw+P*Bw)-W*(Fw+X*Qw);g[Zo>>2]=Jw;Bw=ga*+g[_o>>2];g[ap>>2]=Qw+W*(Fw+X*Jw)-da*(Bw+ha*+g[$o>>2]);Jw=E*+g[bp>>2]+F*(Yw+Xw);g[cp>>2]=Jw;Xw=+g[dp>>2];Yw=+g[ep>>2];Fw=Jw-C*(G*Xw+y*Yw);g[fp>>2]=Fw;Jw=Xw+(Yw*2.0+Fw);Fw=C*Jw;g[gp>>2]=Fw;Yw=+g[ip>>2];Xw=ka*+g[hp>>2]+la*(K*Yw+J*Jw);g[jp>>2]=Xw;Jw=+g[kp>>2];Qw=+g[lp>>2];Uw=Xw-M*(P*Jw+O*Qw);g[mp>>2]=Uw;Xw=_*+g[np>>2];Pw=+g[op>>2];zw=M*(N*Jw+(I*Qw+N*Uw))-W*(Xw+X*Pw);g[pp>>2]=zw;Uw=ga*+g[qp>>2];g[sp>>2]=Pw+W*(Xw+X*zw)-da*(Uw+ha*+g[rp>>2]);zw=ka*+g[tp>>2]+la*(Fw+Yw);g[up>>2]=zw;Yw=+g[vp>>2];Fw=+g[wp>>2];Xw=zw-M*(P*Yw+O*Fw);g[xp>>2]=Xw;zw=Yw+(Fw*2.0+Xw);Xw=M*zw;g[yp>>2]=Xw;Fw=+g[Ap>>2];Yw=na*+g[zp>>2]+oa*(T*Fw+R*zw);g[Bp>>2]=Yw;zw=+g[Cp>>2];Pw=+g[Dp>>2];Qw=Yw-W*(X*zw+_*Pw);g[Ep>>2]=Qw;Yw=ga*+g[Fp>>2];Jw=+g[Gp>>2];r=W*(Z*zw+(Q*Pw+Z*Qw))-da*(Yw+ha*Jw);g[Hp>>2]=r;Qw=na*+g[Ip>>2]+oa*(Xw+Fw);g[Jp>>2]=Qw;Fw=+g[Kp>>2];Xw=+g[Lp>>2];Pw=Qw-W*(X*Fw+_*Xw);g[Mp>>2]=Pw;Qw=Fw+(Xw*2.0+Pw);Pw=W*Qw;g[Np>>2]=Pw;Xw=+g[Pp>>2];Fw=qa*+g[Op>>2]+ra*(aa*Xw+x*Qw);g[Qp>>2]=Fw;Qw=+g[Rp>>2];zw=+g[Sp>>2];Zw=Fw-da*(ha*Qw+ga*zw);g[Tp>>2]=Zw;Fw=qa*+g[Up>>2]+ra*(Pw+Xw);g[Vp>>2]=Fw;Xw=+g[Wp>>2];Pw=+g[Xp>>2];_w=Fw-da*(ha*Xw+ga*Pw);g[Yp>>2]=_w;Fw=ub*(+g[$o>>2]+da*(Bw+ha*+g[ap>>2]))+vb*(+g[rp>>2]+da*(Uw+ha*+g[sp>>2]))+wb*(Jw+da*(Yw+ha*r))+da*(xb*(fa*Zw+$*zw+fa*Qw)+yb*(Xw+(_w+Pw*2.0)));Pw=+g[_p>>2];_w=+g[$p>>2];Xw=E*+g[Zp>>2]+F*(z*Pw+A*_w);g[aq>>2]=Xw;Qw=+g[bq>>2];zw=+g[cq>>2];Zw=Xw-C*(G*Qw+y*zw);g[dq>>2]=Zw;Xw=O*+g[eq>>2];r=+g[fq>>2];Yw=C*(D*Qw+(H*zw+D*Zw))-M*(Xw+P*r);g[gq>>2]=Yw;Zw=_*+g[hq>>2];zw=+g[iq>>2];Qw=r+M*(Xw+P*Yw)-W*(Zw+X*zw);g[jq>>2]=Qw;Yw=ga*+g[kq>>2];g[mq>>2]=zw+W*(Zw+X*Qw)-da*(Yw+ha*+g[lq>>2]);Qw=E*+g[nq>>2]+F*(Pw+_w);g[oq>>2]=Qw;_w=+g[pq>>2];Pw=+g[qq>>2];Zw=Qw-C*(G*_w+y*Pw);g[rq>>2]=Zw;Qw=_w+(Pw*2.0+Zw);Zw=C*Qw;g[sq>>2]=Zw;Pw=+g[uq>>2];_w=ka*+g[tq>>2]+la*(K*Pw+J*Qw);g[vq>>2]=_w;Qw=+g[wq>>2];zw=+g[xq>>2];Xw=_w-M*(P*Qw+O*zw);g[yq>>2]=Xw;_w=_*+g[zq>>2];r=+g[Aq>>2];Jw=M*(N*Qw+(I*zw+N*Xw))-W*(_w+X*r);g[Bq>>2]=Jw;Xw=ga*+g[Cq>>2];g[Eq>>2]=r+W*(_w+X*Jw)-da*(Xw+ha*+g[Dq>>2]);Jw=ka*+g[Fq>>2]+la*(Zw+Pw);g[Gq>>2]=Jw;Pw=+g[Hq>>2];Zw=+g[Iq>>2];_w=Jw-M*(P*Pw+O*Zw);g[Jq>>2]=_w;Jw=Pw+(Zw*2.0+_w);_w=M*Jw;g[Kq>>2]=_w;Zw=+g[Mq>>2];Pw=na*+g[Lq>>2]+oa*(T*Zw+R*Jw);g[Nq>>2]=Pw;Jw=+g[Oq>>2];r=+g[Pq>>2];zw=Pw-W*(X*Jw+_*r);g[Qq>>2]=zw;Pw=ga*+g[Rq>>2];Qw=+g[Sq>>2];Uw=W*(Z*Jw+(Q*r+Z*zw))-da*(Pw+ha*Qw);g[Tq>>2]=Uw;zw=na*+g[Uq>>2]+oa*(_w+Zw);g[Vq>>2]=zw;Zw=+g[Wq>>2];_w=+g[Xq>>2];r=zw-W*(X*Zw+_*_w);g[Yq>>2]=r;zw=Zw+(_w*2.0+r);r=W*zw;g[Zq>>2]=r;_w=+g[$q>>2];Zw=qa*+g[_q>>2]+ra*(aa*_w+x*zw);g[ar>>2]=Zw;zw=+g[br>>2];Jw=+g[cr>>2];Bw=Zw-da*(ha*zw+ga*Jw);g[dr>>2]=Bw;Zw=qa*+g[er>>2]+ra*(r+_w);g[fr>>2]=Zw;_w=+g[gr>>2];r=+g[hr>>2];$w=Zw-da*(ha*_w+ga*r);g[ir>>2]=$w;Zw=Ab*(+g[lq>>2]+da*(Yw+ha*+g[mq>>2]))+Cb*(+g[Dq>>2]+da*(Xw+ha*+g[Eq>>2]))+Db*(Qw+da*(Pw+ha*Uw))+da*(Eb*(fa*Bw+$*Jw+fa*zw)+Fb*(_w+($w+r*2.0)));r=Fw+Zw;$w=Vw+r;_w=+g[kr>>2];zw=+g[lr>>2];Jw=E*+g[jr>>2]+F*(z*_w+A*zw);g[mr>>2]=Jw;Bw=+g[nr>>2];Uw=+g[or>>2];Pw=Jw-C*(G*Bw+y*Uw);g[pr>>2]=Pw;Jw=O*+g[qr>>2];Qw=+g[rr>>2];Xw=C*(D*Bw+(H*Uw+D*Pw))-M*(Jw+P*Qw);g[sr>>2]=Xw;Pw=_*+g[tr>>2];Uw=+g[ur>>2];Bw=Qw+M*(Jw+P*Xw)-W*(Pw+X*Uw);g[vr>>2]=Bw;Xw=ga*+g[wr>>2];g[yr>>2]=Uw+W*(Pw+X*Bw)-da*(Xw+ha*+g[xr>>2]);Bw=E*+g[zr>>2]+F*(_w+zw);g[Ar>>2]=Bw;zw=+g[Br>>2];_w=+g[Cr>>2];Pw=Bw-C*(G*zw+y*_w);g[Dr>>2]=Pw;Bw=zw+(_w*2.0+Pw);Pw=C*Bw;g[Er>>2]=Pw;_w=+g[Gr>>2];zw=ka*+g[Fr>>2]+la*(K*_w+J*Bw);g[Hr>>2]=zw;Bw=+g[Ir>>2];Uw=+g[Jr>>2];Jw=zw-M*(P*Bw+O*Uw);g[Kr>>2]=Jw;zw=_*+g[Lr>>2];Qw=+g[Mr>>2];Yw=M*(N*Bw+(I*Uw+N*Jw))-W*(zw+X*Qw);g[Nr>>2]=Yw;Jw=ga*+g[Or>>2];g[Qr>>2]=Qw+W*(zw+X*Yw)-da*(Jw+ha*+g[Pr>>2]);Yw=ka*+g[Rr>>2]+la*(Pw+_w);g[Sr>>2]=Yw;_w=+g[Tr>>2];Pw=+g[Ur>>2];zw=Yw-M*(P*_w+O*Pw);g[Vr>>2]=zw;Yw=_w+(Pw*2.0+zw);zw=M*Yw;g[Wr>>2]=zw;Pw=+g[Yr>>2];_w=na*+g[Xr>>2]+oa*(T*Pw+R*Yw);g[Zr>>2]=_w;Yw=+g[_r>>2];Qw=+g[$r>>2];Uw=_w-W*(X*Yw+_*Qw);g[as>>2]=Uw;_w=ga*+g[bs>>2];Bw=+g[cs>>2];ax=W*(Z*Yw+(Q*Qw+Z*Uw))-da*(_w+ha*Bw);g[ds>>2]=ax;Uw=na*+g[es>>2]+oa*(zw+Pw);g[fs>>2]=Uw;Pw=+g[gs>>2];zw=+g[hs>>2];Qw=Uw-W*(X*Pw+_*zw);g[is>>2]=Qw;Uw=Pw+(zw*2.0+Qw);Qw=W*Uw;g[js>>2]=Qw;zw=+g[ls>>2];Pw=qa*+g[ks>>2]+ra*(aa*zw+x*Uw);g[ms>>2]=Pw;Uw=+g[ns>>2];Yw=+g[os>>2];bx=Pw-da*(ha*Uw+ga*Yw);g[ps>>2]=bx;Pw=qa*+g[qs>>2]+ra*(Qw+zw);g[rs>>2]=Pw;zw=+g[ss>>2];Qw=+g[ts>>2];cx=Pw-da*(ha*zw+ga*Qw);g[us>>2]=cx;Pw=Hb*(+g[xr>>2]+da*(Xw+ha*+g[yr>>2]))+Ib*(+g[Pr>>2]+da*(Jw+ha*+g[Qr>>2]))+Jb*(Bw+da*(_w+ha*ax))+da*(Kb*(fa*bx+$*Yw+fa*Uw)+Lb*(zw+(cx+Qw*2.0)));Qw=+g[ws>>2];cx=+g[xs>>2];zw=E*+g[vs>>2]+F*(z*Qw+A*cx);g[ys>>2]=zw;Uw=+g[zs>>2];Yw=+g[As>>2];bx=zw-C*(G*Uw+y*Yw);g[Bs>>2]=bx;zw=O*+g[Cs>>2];ax=+g[Ds>>2];_w=C*(D*Uw+(H*Yw+D*bx))-M*(zw+P*ax);g[Es>>2]=_w;bx=_*+g[Fs>>2];Yw=+g[Gs>>2];Uw=ax+M*(zw+P*_w)-W*(bx+X*Yw);g[Hs>>2]=Uw;_w=ga*+g[Is>>2];g[Ks>>2]=Yw+W*(bx+X*Uw)-da*(_w+ha*+g[Js>>2]);Uw=E*+g[Ls>>2]+F*(Qw+cx);g[Ms>>2]=Uw;cx=+g[Ns>>2];Qw=+g[Os>>2];bx=Uw-C*(G*cx+y*Qw);g[Ps>>2]=bx;Uw=cx+(Qw*2.0+bx);bx=C*Uw;g[Qs>>2]=bx;Qw=+g[Ss>>2];cx=ka*+g[Rs>>2]+la*(K*Qw+J*Uw);g[Ts>>2]=cx;Uw=+g[Us>>2];Yw=+g[Vs>>2];zw=cx-M*(P*Uw+O*Yw);g[Ws>>2]=zw;cx=_*+g[Xs>>2];ax=+g[Ys>>2];Bw=M*(N*Uw+(I*Yw+N*zw))-W*(cx+X*ax);g[Zs>>2]=Bw;zw=ga*+g[_s>>2];g[at>>2]=ax+W*(cx+X*Bw)-da*(zw+ha*+g[$s>>2]);Bw=ka*+g[bt>>2]+la*(bx+Qw);g[ct>>2]=Bw;Qw=+g[dt>>2];bx=+g[et>>2];cx=Bw-M*(P*Qw+O*bx);g[ft>>2]=cx;Bw=Qw+(bx*2.0+cx);cx=M*Bw;g[gt>>2]=cx;bx=+g[it>>2];Qw=na*+g[ht>>2]+oa*(T*bx+R*Bw);g[jt>>2]=Qw;Bw=+g[kt>>2];ax=+g[lt>>2];Yw=Qw-W*(X*Bw+_*ax);g[mt>>2]=Yw;Qw=ga*+g[nt>>2];Uw=+g[ot>>2];Jw=W*(Z*Bw+(Q*ax+Z*Yw))-da*(Qw+ha*Uw);g[pt>>2]=Jw;Yw=na*+g[qt>>2]+oa*(cx+bx);g[rt>>2]=Yw;bx=+g[st>>2];cx=+g[tt>>2];ax=Yw-W*(X*bx+_*cx);g[ut>>2]=ax;Yw=bx+(cx*2.0+ax);ax=W*Yw;g[vt>>2]=ax;cx=+g[xt>>2];bx=qa*+g[wt>>2]+ra*(aa*cx+x*Yw);g[yt>>2]=bx;Yw=+g[zt>>2];Bw=+g[At>>2];Xw=bx-da*(ha*Yw+ga*Bw);g[Bt>>2]=Xw;bx=qa*+g[Ct>>2]+ra*(ax+cx);g[Dt>>2]=bx;cx=+g[Et>>2];ax=+g[Ft>>2];dx=bx-da*(ha*cx+ga*ax);g[Gt>>2]=dx;bx=Nb*(+g[Js>>2]+da*(_w+ha*+g[Ks>>2]))+Ob*(+g[$s>>2]+da*(zw+ha*+g[at>>2]))+Pb*(Uw+da*(Qw+ha*Jw))+da*(Qb*(fa*Xw+$*Bw+fa*Yw)+Rb*(cx+(dx+ax*2.0)));ax=Pw+bx;dx=+g[It>>2];cx=+g[Jt>>2];Yw=E*+g[Ht>>2]+F*(z*dx+A*cx);g[Kt>>2]=Yw;Bw=+g[Lt>>2];Xw=+g[Mt>>2];Jw=Yw-C*(G*Bw+y*Xw);g[Nt>>2]=Jw;Yw=O*+g[Ot>>2];Qw=+g[Pt>>2];Uw=C*(D*Bw+(H*Xw+D*Jw))-M*(Yw+P*Qw);g[Qt>>2]=Uw;Jw=_*+g[Rt>>2];Xw=+g[St>>2];Bw=Qw+M*(Yw+P*Uw)-W*(Jw+X*Xw);g[Tt>>2]=Bw;Uw=ga*+g[Ut>>2];g[Wt>>2]=Xw+W*(Jw+X*Bw)-da*(Uw+ha*+g[Vt>>2]);Bw=E*+g[Xt>>2]+F*(dx+cx);g[Yt>>2]=Bw;cx=+g[Zt>>2];dx=+g[_t>>2];Jw=Bw-C*(G*cx+y*dx);g[$t>>2]=Jw;Bw=cx+(dx*2.0+Jw);Jw=C*Bw;g[au>>2]=Jw;dx=+g[cu>>2];cx=ka*+g[bu>>2]+la*(K*dx+J*Bw);g[du>>2]=cx;Bw=+g[eu>>2];Xw=+g[fu>>2];Yw=cx-M*(P*Bw+O*Xw);g[gu>>2]=Yw;cx=_*+g[hu>>2];Qw=+g[iu>>2];zw=M*(N*Bw+(I*Xw+N*Yw))-W*(cx+X*Qw);g[ju>>2]=zw;Yw=ga*+g[ku>>2];g[mu>>2]=Qw+W*(cx+X*zw)-da*(Yw+ha*+g[lu>>2]);zw=ka*+g[nu>>2]+la*(Jw+dx);g[ou>>2]=zw;dx=+g[pu>>2];Jw=+g[qu>>2];cx=zw-M*(P*dx+O*Jw);g[ru>>2]=cx;zw=dx+(Jw*2.0+cx);cx=M*zw;g[su>>2]=cx;Jw=+g[uu>>2];dx=na*+g[tu>>2]+oa*(T*Jw+R*zw);g[vu>>2]=dx;zw=+g[wu>>2];Qw=+g[xu>>2];Xw=dx-W*(X*zw+_*Qw);g[yu>>2]=Xw;dx=ga*+g[zu>>2];Bw=+g[Au>>2];_w=W*(Z*zw+(Q*Qw+Z*Xw))-da*(dx+ha*Bw);g[Bu>>2]=_w;Xw=na*+g[Cu>>2]+oa*(cx+Jw);g[Du>>2]=Xw;Jw=+g[Eu>>2];cx=+g[Fu>>2];Qw=Xw-W*(X*Jw+_*cx);g[Gu>>2]=Qw;Xw=Jw+(cx*2.0+Qw);Qw=W*Xw;g[Hu>>2]=Qw;cx=+g[Ju>>2];Jw=qa*+g[Iu>>2]+ra*(aa*cx+x*Xw);g[Ku>>2]=Jw;Xw=+g[Lu>>2];zw=+g[Mu>>2];ex=Jw-da*(ha*Xw+ga*zw);g[Nu>>2]=ex;Jw=qa*+g[Ou>>2]+ra*(Qw+cx);g[Pu>>2]=Jw;cx=+g[Qu>>2];Qw=+g[Ru>>2];fx=Jw-da*(ha*cx+ga*Qw);g[Su>>2]=fx;Jw=Tb*(+g[Vt>>2]+da*(Uw+ha*+g[Wt>>2]))+Ub*(+g[lu>>2]+da*(Yw+ha*+g[mu>>2]))+Vb*(Bw+da*(dx+ha*_w))+da*(Wb*(fa*ex+$*zw+fa*Xw)+Xb*(cx+(fx+Qw*2.0)));Qw=+g[Uu>>2];fx=+g[Vu>>2];cx=E*+g[Tu>>2]+F*(z*Qw+A*fx);g[Wu>>2]=cx;Xw=+g[Xu>>2];zw=+g[Yu>>2];ex=cx-C*(G*Xw+y*zw);g[Zu>>2]=ex;cx=O*+g[_u>>2];_w=+g[$u>>2];dx=C*(D*Xw+(H*zw+D*ex))-M*(cx+P*_w);g[av>>2]=dx;ex=_*+g[bv>>2];zw=+g[cv>>2];Xw=_w+M*(cx+P*dx)-W*(ex+X*zw);g[dv>>2]=Xw;dx=ga*+g[ev>>2];g[gv>>2]=zw+W*(ex+X*Xw)-da*(dx+ha*+g[fv>>2]);Xw=E*+g[hv>>2]+F*(Qw+fx);g[iv>>2]=Xw;fx=+g[jv>>2];Qw=+g[kv>>2];ex=Xw-C*(G*fx+y*Qw);g[lv>>2]=ex;Xw=fx+(Qw*2.0+ex);ex=C*Xw;g[mv>>2]=ex;Qw=+g[ov>>2];fx=ka*+g[nv>>2]+la*(K*Qw+J*Xw);g[pv>>2]=fx;Xw=+g[qv>>2];zw=+g[rv>>2];cx=fx-M*(P*Xw+O*zw);g[sv>>2]=cx;fx=_*+g[tv>>2];_w=+g[uv>>2];Bw=M*(N*Xw+(I*zw+N*cx))-W*(fx+X*_w);g[vv>>2]=Bw;cx=ga*+g[wv>>2];g[yv>>2]=_w+W*(fx+X*Bw)-da*(cx+ha*+g[xv>>2]);Bw=ka*+g[zv>>2]+la*(ex+Qw);g[Av>>2]=Bw;Qw=+g[Bv>>2];ex=+g[Cv>>2];fx=Bw-M*(P*Qw+O*ex);g[Dv>>2]=fx;Bw=Qw+(ex*2.0+fx);fx=M*Bw;g[Ev>>2]=fx;ex=+g[Gv>>2];Qw=na*+g[Fv>>2]+oa*(T*ex+R*Bw);g[Hv>>2]=Qw;Bw=+g[Iv>>2];_w=+g[Jv>>2];zw=Qw-W*(X*Bw+_*_w);g[Kv>>2]=zw;Qw=ga*+g[Lv>>2];Xw=+g[Mv>>2];Yw=W*(Z*Bw+(Q*_w+Z*zw))-da*(Qw+ha*Xw);g[Nv>>2]=Yw;zw=na*+g[Ov>>2]+oa*(fx+ex);g[Pv>>2]=zw;ex=+g[Qv>>2];fx=+g[Rv>>2];_w=zw-W*(X*ex+_*fx);g[Sv>>2]=_w;zw=ex+(fx*2.0+_w);_w=W*zw;g[Tv>>2]=_w;fx=+g[Vv>>2];ex=qa*+g[Uv>>2]+ra*(aa*fx+x*zw);g[Wv>>2]=ex;zw=+g[Xv>>2];Bw=+g[Yv>>2];Uw=ex-da*(ha*zw+ga*Bw);g[Zv>>2]=Uw;ex=qa*+g[_v>>2]+ra*(_w+fx);g[$v>>2]=ex;fx=+g[aw>>2];_w=+g[bw>>2];gx=ex-da*(ha*fx+ga*_w);g[cw>>2]=gx;ex=p*(+g[fv>>2]+da*(dx+ha*+g[gv>>2]))+u*(+g[xv>>2]+da*(cx+ha*+g[yv>>2]))+ia*(Xw+da*(Qw+ha*Yw))+da*(B*(fa*Uw+$*Bw+fa*zw)+L*(fx+(gx+_w*2.0)));_w=Jw+ex;gx=ax+_w;fx=$w+gx;zw=+(k-za>0.0|0);Bw=+(m-Gb>0.0|0);g[a+((c[dw>>2]&8191)<<2)+4232>>2]=q+(zw+(U+(Bw+o*(Sw+fx))));yw=c[dw>>2]|0;g[ew>>2]=+g[a+((yw-Yb&8191)<<2)+4232>>2];g[fw>>2]=s;Uw=zw+q+l*+g[nc+(xw<<2)>>2];Yw=+(s- +g[gw>>2]>0.0|0);g[a+((yw&8191)<<2)+37024>>2]=Yw+(Uw+n*(Sw*.25-fx*.25));yw=c[dw>>2]|0;g[hw>>2]=+g[a+((yw-Zb&8191)<<2)+37024>>2];fx=q+(zw+(U+Bw));Bw=Mw*.25-Tw*.25;Tw=$w*.25-gx*.25;g[a+((yw&8191)<<2)+69804>>2]=fx+n*(Bw+Tw);yw=c[dw>>2]|0;g[iw>>2]=+g[a+((yw-_b&8191)<<2)+69804>>2];gx=Uw+Yw;g[a+((yw&8191)<<2)+102584>>2]=gx+n*(Bw-Tw);yw=c[dw>>2]|0;g[jw>>2]=+g[a+((yw-$b&8191)<<2)+102584>>2];Tw=Gw*.25-v*.25;v=Nw*.25-Lw*.25;Lw=Tw+v;Nw=Vw*.25-r*.25;r=ax*.25-_w*.25;_w=Nw+r;g[a+((yw&8191)<<2)+135364>>2]=fx+n*(Lw+_w);yw=c[dw>>2]|0;g[kw>>2]=+g[a+((yw-ac&8191)<<2)+135364>>2];g[a+((yw&8191)<<2)+168144>>2]=gx+n*(Lw-_w);yw=c[dw>>2]|0;g[lw>>2]=+g[a+((yw-bc&8191)<<2)+168144>>2];_w=Tw-v;v=Nw-r;g[a+((yw&8191)<<2)+200924>>2]=fx+n*(_w+v);yw=c[dw>>2]|0;g[mw>>2]=+g[a+((yw-cc&8191)<<2)+200924>>2];g[a+((yw&8191)<<2)+233704>>2]=gx+n*(_w-v);yw=c[dw>>2]|0;g[nw>>2]=+g[a+((yw-dc&8191)<<2)+233704>>2];v=Aw*.25-Hw*.25;Hw=Dw*.25-Kw*.25;Kw=v+Hw;Dw=Ew*.25-Ow*.25;Ow=Cw*.25-Rw*.25;Rw=Dw+Ow;Cw=Kw+Rw;Ew=Iw*.25-Ww*.25;Ww=Fw*.25-Zw*.25;Zw=Ew+Ww;Fw=Pw*.25-bx*.25;bx=Jw*.25-ex*.25;ex=Fw+bx;Jw=Zw+ex;g[a+((yw&8191)<<2)+266484>>2]=fx+n*(Cw+Jw);yw=c[dw>>2]|0;g[ow>>2]=+g[a+((yw-ec&8191)<<2)+266484>>2];g[a+((yw&8191)<<2)+299264>>2]=gx+n*(Cw-Jw);yw=c[dw>>2]|0;g[pw>>2]=+g[a+((yw-fc&8191)<<2)+299264>>2];Jw=Kw-Rw;Rw=Zw-ex;g[a+((yw&8191)<<2)+332044>>2]=fx+n*(Jw+Rw);yw=c[dw>>2]|0;g[qw>>2]=+g[a+((yw-gc&8191)<<2)+332044>>2];g[a+((yw&8191)<<2)+364824>>2]=gx+n*(Jw-Rw);yw=c[dw>>2]|0;g[rw>>2]=+g[a+((yw-hc&8191)<<2)+364824>>2];Rw=v-Hw;Hw=Dw-Ow;Ow=Rw+Hw;Dw=Ew-Ww;Ww=Fw-bx;bx=Dw+Ww;g[a+((yw&8191)<<2)+397604>>2]=fx+n*(Ow+bx);yw=c[dw>>2]|0;g[sw>>2]=+g[a+((yw-ic&8191)<<2)+397604>>2];g[a+((yw&8191)<<2)+430384>>2]=gx+n*(Ow-bx);yw=c[dw>>2]|0;g[tw>>2]=+g[a+((yw-jc&8191)<<2)+430384>>2];bx=Rw-Hw;Hw=Dw-Ww;g[a+((yw&8191)<<2)+463164>>2]=fx+n*(bx+Hw);yw=c[dw>>2]|0;g[uw>>2]=+g[a+((yw-kc&8191)<<2)+463164>>2];g[a+((yw&8191)<<2)+495944>>2]=gx+n*(bx-Hw);g[vw>>2]=+g[a+(((c[dw>>2]|0)-lc&8191)<<2)+495944>>2];g[d+(xw<<2)>>2]=h*(+g[ew>>2]+ +g[iw>>2]+ +g[kw>>2]+ +g[mw>>2]+ +g[ow>>2]+ +g[qw>>2]+ +g[sw>>2]+ +g[uw>>2]);g[oc+(xw<<2)>>2]=h*(+g[hw>>2]+ +g[jw>>2]+ +g[lw>>2]+ +g[nw>>2]+ +g[pw>>2]+ +g[rw>>2]+ +g[tw>>2]+ +g[vw>>2]);g[Vu>>2]=+g[Uu>>2];g[Uu>>2]=+g[vw>>2];g[dl>>2]=+g[cl>>2];g[cl>>2]=+g[uw>>2];g[$p>>2]=+g[_p>>2];g[_p>>2]=+g[tw>>2];g[jg>>2]=+g[ig>>2];g[ig>>2]=+g[sw>>2];g[xs>>2]=+g[ws>>2];g[ws>>2]=+g[rw>>2];g[Hi>>2]=+g[Gi>>2];g[Gi>>2]=+g[qw>>2];g[Cn>>2]=+g[Bn>>2];g[Bn>>2]=+g[pw>>2];g[Md>>2]=+g[Ld>>2];g[Ld>>2]=+g[ow>>2];g[Jt>>2]=+g[It>>2];g[It>>2]=+g[nw>>2];g[Tj>>2]=+g[Sj>>2];g[Sj>>2]=+g[mw>>2];g[Po>>2]=+g[Oo>>2];g[Oo>>2]=+g[lw>>2];g[Ye>>2]=+g[Xe>>2];g[Xe>>2]=+g[kw>>2];g[lr>>2]=+g[kr>>2];g[kr>>2]=+g[jw>>2];g[vh>>2]=+g[uh>>2];g[uh>>2]=+g[iw>>2];g[pm>>2]=+g[om>>2];g[om>>2]=+g[hw>>2];g[gw>>2]=+g[fw>>2];g[Ac>>2]=+g[zc>>2];g[zc>>2]=+g[ew>>2];c[dw>>2]=(c[dw>>2]|0)+1;g[aw>>2]=+g[bw>>2];g[bw>>2]=+g[cw>>2];g[_v>>2]=+g[$v>>2];g[Xv>>2]=+g[Yv>>2];g[Yv>>2]=+g[Zv>>2];g[Uv>>2]=+g[Wv>>2];g[Vv>>2]=+g[Tv>>2];g[Qv>>2]=+g[Rv>>2];g[Rv>>2]=+g[Sv>>2];g[Ov>>2]=+g[Pv>>2];g[Mv>>2]=+g[Lv>>2];g[Lv>>2]=+g[Nv>>2];g[Iv>>2]=+g[Jv>>2];g[Jv>>2]=+g[Kv>>2];g[Fv>>2]=+g[Hv>>2];g[Gv>>2]=+g[Ev>>2];g[Bv>>2]=+g[Cv>>2];g[Cv>>2]=+g[Dv>>2];g[zv>>2]=+g[Av>>2];g[xv>>2]=+g[wv>>2];g[wv>>2]=+g[yv>>2];g[uv>>2]=+g[tv>>2];g[tv>>2]=+g[vv>>2];g[qv>>2]=+g[rv>>2];g[rv>>2]=+g[sv>>2];g[nv>>2]=+g[pv>>2];g[ov>>2]=+g[mv>>2];g[jv>>2]=+g[kv>>2];g[kv>>2]=+g[lv>>2];g[hv>>2]=+g[iv>>2];g[fv>>2]=+g[ev>>2];g[ev>>2]=+g[gv>>2];g[cv>>2]=+g[bv>>2];g[bv>>2]=+g[dv>>2];g[$u>>2]=+g[_u>>2];g[_u>>2]=+g[av>>2];g[Xu>>2]=+g[Yu>>2];g[Yu>>2]=+g[Zu>>2];g[Tu>>2]=+g[Wu>>2];g[Qu>>2]=+g[Ru>>2];g[Ru>>2]=+g[Su>>2];g[Ou>>2]=+g[Pu>>2];g[Lu>>2]=+g[Mu>>2];g[Mu>>2]=+g[Nu>>2];g[Iu>>2]=+g[Ku>>2];g[Ju>>2]=+g[Hu>>2];g[Eu>>2]=+g[Fu>>2];g[Fu>>2]=+g[Gu>>2];g[Cu>>2]=+g[Du>>2];g[Au>>2]=+g[zu>>2];g[zu>>2]=+g[Bu>>2];g[wu>>2]=+g[xu>>2];g[xu>>2]=+g[yu>>2];g[tu>>2]=+g[vu>>2];g[uu>>2]=+g[su>>2];g[pu>>2]=+g[qu>>2];g[qu>>2]=+g[ru>>2];g[nu>>2]=+g[ou>>2];g[lu>>2]=+g[ku>>2];g[ku>>2]=+g[mu>>2];g[iu>>2]=+g[hu>>2];g[hu>>2]=+g[ju>>2];g[eu>>2]=+g[fu>>2];g[fu>>2]=+g[gu>>2];g[bu>>2]=+g[du>>2];g[cu>>2]=+g[au>>2];g[Zt>>2]=+g[_t>>2];g[_t>>2]=+g[$t>>2];g[Xt>>2]=+g[Yt>>2];g[Vt>>2]=+g[Ut>>2];g[Ut>>2]=+g[Wt>>2];g[St>>2]=+g[Rt>>2];g[Rt>>2]=+g[Tt>>2];g[Pt>>2]=+g[Ot>>2];g[Ot>>2]=+g[Qt>>2];g[Lt>>2]=+g[Mt>>2];g[Mt>>2]=+g[Nt>>2];g[Ht>>2]=+g[Kt>>2];g[Et>>2]=+g[Ft>>2];g[Ft>>2]=+g[Gt>>2];g[Ct>>2]=+g[Dt>>2];g[zt>>2]=+g[At>>2];g[At>>2]=+g[Bt>>2];g[wt>>2]=+g[yt>>2];g[xt>>2]=+g[vt>>2];g[st>>2]=+g[tt>>2];g[tt>>2]=+g[ut>>2];g[qt>>2]=+g[rt>>2];g[ot>>2]=+g[nt>>2];g[nt>>2]=+g[pt>>2];g[kt>>2]=+g[lt>>2];g[lt>>2]=+g[mt>>2];g[ht>>2]=+g[jt>>2];g[it>>2]=+g[gt>>2];g[dt>>2]=+g[et>>2];g[et>>2]=+g[ft>>2];g[bt>>2]=+g[ct>>2];g[$s>>2]=+g[_s>>2];g[_s>>2]=+g[at>>2];g[Ys>>2]=+g[Xs>>2];g[Xs>>2]=+g[Zs>>2];g[Us>>2]=+g[Vs>>2];g[Vs>>2]=+g[Ws>>2];g[Rs>>2]=+g[Ts>>2];g[Ss>>2]=+g[Qs>>2];g[Ns>>2]=+g[Os>>2];g[Os>>2]=+g[Ps>>2];g[Ls>>2]=+g[Ms>>2];g[Js>>2]=+g[Is>>2];g[Is>>2]=+g[Ks>>2];g[Gs>>2]=+g[Fs>>2];g[Fs>>2]=+g[Hs>>2];g[Ds>>2]=+g[Cs>>2];g[Cs>>2]=+g[Es>>2];g[zs>>2]=+g[As>>2];g[As>>2]=+g[Bs>>2];g[vs>>2]=+g[ys>>2];g[ss>>2]=+g[ts>>2];g[ts>>2]=+g[us>>2];g[qs>>2]=+g[rs>>2];g[ns>>2]=+g[os>>2];g[os>>2]=+g[ps>>2];g[ks>>2]=+g[ms>>2];g[ls>>2]=+g[js>>2];g[gs>>2]=+g[hs>>2];g[hs>>2]=+g[is>>2];g[es>>2]=+g[fs>>2];g[cs>>2]=+g[bs>>2];g[bs>>2]=+g[ds>>2];g[_r>>2]=+g[$r>>2];g[$r>>2]=+g[as>>2];g[Xr>>2]=+g[Zr>>2];g[Yr>>2]=+g[Wr>>2];g[Tr>>2]=+g[Ur>>2];g[Ur>>2]=+g[Vr>>2];g[Rr>>2]=+g[Sr>>2];g[Pr>>2]=+g[Or>>2];g[Or>>2]=+g[Qr>>2];g[Mr>>2]=+g[Lr>>2];g[Lr>>2]=+g[Nr>>2];g[Ir>>2]=+g[Jr>>2];g[Jr>>2]=+g[Kr>>2];g[Fr>>2]=+g[Hr>>2];g[Gr>>2]=+g[Er>>2];g[Br>>2]=+g[Cr>>2];g[Cr>>2]=+g[Dr>>2];g[zr>>2]=+g[Ar>>2];g[xr>>2]=+g[wr>>2];g[wr>>2]=+g[yr>>2];g[ur>>2]=+g[tr>>2];g[tr>>2]=+g[vr>>2];g[rr>>2]=+g[qr>>2];g[qr>>2]=+g[sr>>2];g[nr>>2]=+g[or>>2];g[or>>2]=+g[pr>>2];g[jr>>2]=+g[mr>>2];g[gr>>2]=+g[hr>>2];g[hr>>2]=+g[ir>>2];g[er>>2]=+g[fr>>2];g[br>>2]=+g[cr>>2];g[cr>>2]=+g[dr>>2];g[_q>>2]=+g[ar>>2];g[$q>>2]=+g[Zq>>2];g[Wq>>2]=+g[Xq>>2];g[Xq>>2]=+g[Yq>>2];g[Uq>>2]=+g[Vq>>2];g[Sq>>2]=+g[Rq>>2];g[Rq>>2]=+g[Tq>>2];g[Oq>>2]=+g[Pq>>2];g[Pq>>2]=+g[Qq>>2];g[Lq>>2]=+g[Nq>>2];g[Mq>>2]=+g[Kq>>2];g[Hq>>2]=+g[Iq>>2];g[Iq>>2]=+g[Jq>>2];g[Fq>>2]=+g[Gq>>2];g[Dq>>2]=+g[Cq>>2];g[Cq>>2]=+g[Eq>>2];g[Aq>>2]=+g[zq>>2];g[zq>>2]=+g[Bq>>2];g[wq>>2]=+g[xq>>2];g[xq>>2]=+g[yq>>2];g[tq>>2]=+g[vq>>2];g[uq>>2]=+g[sq>>2];g[pq>>2]=+g[qq>>2];g[qq>>2]=+g[rq>>2];g[nq>>2]=+g[oq>>2];g[lq>>2]=+g[kq>>2];g[kq>>2]=+g[mq>>2];g[iq>>2]=+g[hq>>2];g[hq>>2]=+g[jq>>2];g[fq>>2]=+g[eq>>2];g[eq>>2]=+g[gq>>2];g[bq>>2]=+g[cq>>2];g[cq>>2]=+g[dq>>2];g[Zp>>2]=+g[aq>>2];g[Wp>>2]=+g[Xp>>2];g[Xp>>2]=+g[Yp>>2];g[Up>>2]=+g[Vp>>2];g[Rp>>2]=+g[Sp>>2];g[Sp>>2]=+g[Tp>>2];g[Op>>2]=+g[Qp>>2];g[Pp>>2]=+g[Np>>2];g[Kp>>2]=+g[Lp>>2];g[Lp>>2]=+g[Mp>>2];g[Ip>>2]=+g[Jp>>2];g[Gp>>2]=+g[Fp>>2];g[Fp>>2]=+g[Hp>>2];g[Cp>>2]=+g[Dp>>2];g[Dp>>2]=+g[Ep>>2];g[zp>>2]=+g[Bp>>2];g[Ap>>2]=+g[yp>>2];g[vp>>2]=+g[wp>>2];g[wp>>2]=+g[xp>>2];g[tp>>2]=+g[up>>2];g[rp>>2]=+g[qp>>2];g[qp>>2]=+g[sp>>2];g[op>>2]=+g[np>>2];g[np>>2]=+g[pp>>2];g[kp>>2]=+g[lp>>2];g[lp>>2]=+g[mp>>2];g[hp>>2]=+g[jp>>2];g[ip>>2]=+g[gp>>2];g[dp>>2]=+g[ep>>2];g[ep>>2]=+g[fp>>2];g[bp>>2]=+g[cp>>2];g[$o>>2]=+g[_o>>2];g[_o>>2]=+g[ap>>2];g[Yo>>2]=+g[Xo>>2];g[Xo>>2]=+g[Zo>>2];g[Vo>>2]=+g[Uo>>2];g[Uo>>2]=+g[Wo>>2];g[Ro>>2]=+g[So>>2];g[So>>2]=+g[To>>2];g[No>>2]=+g[Qo>>2];g[Ko>>2]=+g[Lo>>2];g[Lo>>2]=+g[Mo>>2];g[Io>>2]=+g[Jo>>2];g[Fo>>2]=+g[Go>>2];g[Go>>2]=+g[Ho>>2];g[Co>>2]=+g[Eo>>2];g[Do>>2]=+g[Bo>>2];g[yo>>2]=+g[zo>>2];g[zo>>2]=+g[Ao>>2];g[wo>>2]=+g[xo>>2];g[uo>>2]=+g[to>>2];g[to>>2]=+g[vo>>2];g[qo>>2]=+g[ro>>2];g[ro>>2]=+g[so>>2];g[no>>2]=+g[po>>2];g[oo>>2]=+g[mo>>2];g[jo>>2]=+g[ko>>2];g[ko>>2]=+g[lo>>2];g[ho>>2]=+g[io>>2];g[fo>>2]=+g[eo>>2];g[eo>>2]=+g[go>>2];g[bo>>2]=+g[ao>>2];g[ao>>2]=+g[co>>2];g[Zn>>2]=+g[_n>>2];g[_n>>2]=+g[$n>>2];g[Wn>>2]=+g[Yn>>2];g[Xn>>2]=+g[Vn>>2];g[Sn>>2]=+g[Tn>>2];g[Tn>>2]=+g[Un>>2];g[Qn>>2]=+g[Rn>>2];g[On>>2]=+g[Nn>>2];g[Nn>>2]=+g[Pn>>2];g[Ln>>2]=+g[Kn>>2];g[Kn>>2]=+g[Mn>>2];g[In>>2]=+g[Hn>>2];g[Hn>>2]=+g[Jn>>2];g[En>>2]=+g[Fn>>2];g[Fn>>2]=+g[Gn>>2];g[An>>2]=+g[Dn>>2];g[xn>>2]=+g[yn>>2];g[yn>>2]=+g[zn>>2];g[vn>>2]=+g[wn>>2];g[sn>>2]=+g[tn>>2];g[tn>>2]=+g[un>>2];g[pn>>2]=+g[rn>>2];g[qn>>2]=+g[on>>2];g[ln>>2]=+g[mn>>2];g[mn>>2]=+g[nn>>2];g[jn>>2]=+g[kn>>2];g[gn>>2]=+g[fn>>2];g[fn>>2]=+g[hn>>2];g[cn>>2]=+g[dn>>2];g[dn>>2]=+g[en>>2];g[$m>>2]=+g[bn>>2];g[an>>2]=+g[_m>>2];g[Xm>>2]=+g[Ym>>2];g[Ym>>2]=+g[Zm>>2];g[Vm>>2]=+g[Wm>>2];g[Tm>>2]=+g[Sm>>2];g[Sm>>2]=+g[Um>>2];g[Qm>>2]=+g[Pm>>2];g[Pm>>2]=+g[Rm>>2];g[Mm>>2]=+g[Nm>>2];g[Nm>>2]=+g[Om>>2];g[Jm>>2]=+g[Lm>>2];g[Km>>2]=+g[Im>>2];g[Fm>>2]=+g[Gm>>2];g[Gm>>2]=+g[Hm>>2];g[Dm>>2]=+g[Em>>2];g[Bm>>2]=+g[Am>>2];g[Am>>2]=+g[Cm>>2];g[ym>>2]=+g[xm>>2];g[xm>>2]=+g[zm>>2];g[vm>>2]=+g[um>>2];g[um>>2]=+g[wm>>2];g[rm>>2]=+g[sm>>2];g[sm>>2]=+g[tm>>2];g[nm>>2]=+g[qm>>2];g[km>>2]=+g[lm>>2];g[lm>>2]=+g[mm>>2];g[im>>2]=+g[jm>>2];g[fm>>2]=+g[gm>>2];g[gm>>2]=+g[hm>>2];g[cm>>2]=+g[em>>2];g[dm>>2]=+g[bm>>2];g[_l>>2]=+g[$l>>2];g[$l>>2]=+g[am>>2];g[Yl>>2]=+g[Zl>>2];g[Wl>>2]=+g[Vl>>2];g[Vl>>2]=+g[Xl>>2];g[Sl>>2]=+g[Tl>>2];g[Tl>>2]=+g[Ul>>2];g[Pl>>2]=+g[Rl>>2];g[Ql>>2]=+g[Ol>>2];g[Ll>>2]=+g[Ml>>2];g[Ml>>2]=+g[Nl>>2];g[Jl>>2]=+g[Kl>>2];g[Hl>>2]=+g[Gl>>2];g[Gl>>2]=+g[Il>>2];g[El>>2]=+g[Dl>>2];g[Dl>>2]=+g[Fl>>2];g[Al>>2]=+g[Bl>>2];g[Bl>>2]=+g[Cl>>2];g[xl>>2]=+g[zl>>2];g[yl>>2]=+g[wl>>2];g[tl>>2]=+g[ul>>2];g[ul>>2]=+g[vl>>2];g[rl>>2]=+g[sl>>2];g[pl>>2]=+g[ol>>2];g[ol>>2]=+g[ql>>2];g[ml>>2]=+g[ll>>2];g[ll>>2]=+g[nl>>2];g[jl>>2]=+g[il>>2];g[il>>2]=+g[kl>>2];g[fl>>2]=+g[gl>>2];g[gl>>2]=+g[hl>>2];g[bl>>2]=+g[el>>2];g[_k>>2]=+g[$k>>2];g[$k>>2]=+g[al>>2];g[Yk>>2]=+g[Zk>>2];g[Vk>>2]=+g[Wk>>2];g[Wk>>2]=+g[Xk>>2];g[Sk>>2]=+g[Uk>>2];g[Tk>>2]=+g[Rk>>2];g[Ok>>2]=+g[Pk>>2];g[Pk>>2]=+g[Qk>>2];g[Mk>>2]=+g[Nk>>2];g[Kk>>2]=+g[Jk>>2];g[Jk>>2]=+g[Lk>>2];g[Gk>>2]=+g[Hk>>2];g[Hk>>2]=+g[Ik>>2];g[Dk>>2]=+g[Fk>>2];g[Ek>>2]=+g[Ck>>2];g[zk>>2]=+g[Ak>>2];g[Ak>>2]=+g[Bk>>2];g[xk>>2]=+g[yk>>2];g[vk>>2]=+g[uk>>2];g[uk>>2]=+g[wk>>2];g[sk>>2]=+g[rk>>2];g[rk>>2]=+g[tk>>2];g[ok>>2]=+g[pk>>2];g[pk>>2]=+g[qk>>2];g[lk>>2]=+g[nk>>2];g[mk>>2]=+g[kk>>2];g[hk>>2]=+g[ik>>2];g[ik>>2]=+g[jk>>2];g[fk>>2]=+g[gk>>2];g[dk>>2]=+g[ck>>2];g[ck>>2]=+g[ek>>2];g[ak>>2]=+g[$j>>2];g[$j>>2]=+g[bk>>2];g[Zj>>2]=+g[Yj>>2];g[Yj>>2]=+g[_j>>2];g[Vj>>2]=+g[Wj>>2];g[Wj>>2]=+g[Xj>>2];g[Rj>>2]=+g[Uj>>2];g[Oj>>2]=+g[Pj>>2];g[Pj>>2]=+g[Qj>>2];g[Mj>>2]=+g[Nj>>2];g[Jj>>2]=+g[Kj>>2];g[Kj>>2]=+g[Lj>>2];g[Gj>>2]=+g[Ij>>2];g[Hj>>2]=+g[Fj>>2];g[Cj>>2]=+g[Dj>>2];g[Dj>>2]=+g[Ej>>2];g[Aj>>2]=+g[Bj>>2];g[yj>>2]=+g[xj>>2];g[xj>>2]=+g[zj>>2];g[uj>>2]=+g[vj>>2];g[vj>>2]=+g[wj>>2];g[rj>>2]=+g[tj>>2];g[sj>>2]=+g[qj>>2];g[nj>>2]=+g[oj>>2];g[oj>>2]=+g[pj>>2];g[lj>>2]=+g[mj>>2];g[jj>>2]=+g[ij>>2];g[ij>>2]=+g[kj>>2];g[gj>>2]=+g[fj>>2];g[fj>>2]=+g[hj>>2];g[cj>>2]=+g[dj>>2];g[dj>>2]=+g[ej>>2];g[$i>>2]=+g[bj>>2];g[aj>>2]=+g[_i>>2];g[Xi>>2]=+g[Yi>>2];g[Yi>>2]=+g[Zi>>2];g[Vi>>2]=+g[Wi>>2];g[Ti>>2]=+g[Si>>2];g[Si>>2]=+g[Ui>>2];g[Qi>>2]=+g[Pi>>2];g[Pi>>2]=+g[Ri>>2];g[Ni>>2]=+g[Mi>>2];g[Mi>>2]=+g[Oi>>2];g[Ji>>2]=+g[Ki>>2];g[Ki>>2]=+g[Li>>2];g[Fi>>2]=+g[Ii>>2];g[Ci>>2]=+g[Di>>2];g[Di>>2]=+g[Ei>>2];g[Ai>>2]=+g[Bi>>2];g[xi>>2]=+g[yi>>2];g[yi>>2]=+g[zi>>2];g[ui>>2]=+g[wi>>2];g[vi>>2]=+g[ti>>2];g[qi>>2]=+g[ri>>2];g[ri>>2]=+g[si>>2];g[oi>>2]=+g[pi>>2];g[mi>>2]=+g[li>>2];g[li>>2]=+g[ni>>2];g[ii>>2]=+g[ji>>2];g[ji>>2]=+g[ki>>2];g[fi>>2]=+g[hi>>2];g[gi>>2]=+g[ei>>2];g[bi>>2]=+g[ci>>2];g[ci>>2]=+g[di>>2];g[$h>>2]=+g[ai>>2];g[Zh>>2]=+g[Yh>>2];g[Yh>>2]=+g[_h>>2];g[Wh>>2]=+g[Vh>>2];g[Vh>>2]=+g[Xh>>2];g[Sh>>2]=+g[Th>>2];g[Th>>2]=+g[Uh>>2];g[Ph>>2]=+g[Rh>>2];g[Qh>>2]=+g[Oh>>2];g[Lh>>2]=+g[Mh>>2];g[Mh>>2]=+g[Nh>>2];g[Jh>>2]=+g[Kh>>2];g[Hh>>2]=+g[Gh>>2];g[Gh>>2]=+g[Ih>>2];g[Eh>>2]=+g[Dh>>2];g[Dh>>2]=+g[Fh>>2];g[Bh>>2]=+g[Ah>>2];g[Ah>>2]=+g[Ch>>2];g[xh>>2]=+g[yh>>2];g[yh>>2]=+g[zh>>2];g[th>>2]=+g[wh>>2];g[qh>>2]=+g[rh>>2];g[rh>>2]=+g[sh>>2];g[oh>>2]=+g[ph>>2];g[lh>>2]=+g[mh>>2];g[mh>>2]=+g[nh>>2];g[ih>>2]=+g[kh>>2];g[jh>>2]=+g[hh>>2];g[eh>>2]=+g[fh>>2];g[fh>>2]=+g[gh>>2];g[ch>>2]=+g[dh>>2];g[ah>>2]=+g[$g>>2];g[$g>>2]=+g[bh>>2];g[Yg>>2]=+g[Zg>>2];g[Zg>>2]=+g[_g>>2];g[Vg>>2]=+g[Xg>>2];g[Wg>>2]=+g[Ug>>2];g[Rg>>2]=+g[Sg>>2];g[Sg>>2]=+g[Tg>>2];g[Pg>>2]=+g[Qg>>2];g[Ng>>2]=+g[Mg>>2];g[Mg>>2]=+g[Og>>2];g[Kg>>2]=+g[Jg>>2];g[Jg>>2]=+g[Lg>>2];g[Gg>>2]=+g[Hg>>2];g[Hg>>2]=+g[Ig>>2];g[Dg>>2]=+g[Fg>>2];g[Eg>>2]=+g[Cg>>2];g[zg>>2]=+g[Ag>>2];g[Ag>>2]=+g[Bg>>2];g[xg>>2]=+g[yg>>2];g[vg>>2]=+g[ug>>2];g[ug>>2]=+g[wg>>2];g[sg>>2]=+g[rg>>2];g[rg>>2]=+g[tg>>2];g[pg>>2]=+g[og>>2];g[og>>2]=+g[qg>>2];g[lg>>2]=+g[mg>>2];g[mg>>2]=+g[ng>>2];g[hg>>2]=+g[kg>>2];g[eg>>2]=+g[fg>>2];g[fg>>2]=+g[gg>>2];g[cg>>2]=+g[dg>>2];g[$f>>2]=+g[ag>>2];g[ag>>2]=+g[bg>>2];g[Yf>>2]=+g[_f>>2];g[Zf>>2]=+g[Xf>>2];g[Uf>>2]=+g[Vf>>2];g[Vf>>2]=+g[Wf>>2];g[Sf>>2]=+g[Tf>>2];g[Qf>>2]=+g[Pf>>2];g[Pf>>2]=+g[Rf>>2];g[Mf>>2]=+g[Nf>>2];g[Nf>>2]=+g[Of>>2];g[Jf>>2]=+g[Lf>>2];g[Kf>>2]=+g[If>>2];g[Ff>>2]=+g[Gf>>2];g[Gf>>2]=+g[Hf>>2];g[Df>>2]=+g[Ef>>2];g[Bf>>2]=+g[Af>>2];g[Af>>2]=+g[Cf>>2];g[yf>>2]=+g[xf>>2];g[xf>>2]=+g[zf>>2];g[uf>>2]=+g[vf>>2];g[vf>>2]=+g[wf>>2];g[rf>>2]=+g[tf>>2];g[sf>>2]=+g[qf>>2];g[nf>>2]=+g[of>>2];g[of>>2]=+g[pf>>2];g[lf>>2]=+g[mf>>2];g[jf>>2]=+g[hf>>2];g[hf>>2]=+g[kf>>2];g[ff>>2]=+g[ef>>2];g[ef>>2]=+g[gf>>2];g[cf>>2]=+g[bf>>2];g[bf>>2]=+g[df>>2];g[_e>>2]=+g[$e>>2];g[$e>>2]=+g[af>>2];g[We>>2]=+g[Ze>>2];g[Te>>2]=+g[Ue>>2];g[Ue>>2]=+g[Ve>>2];g[Re>>2]=+g[Se>>2];g[Oe>>2]=+g[Pe>>2];g[Pe>>2]=+g[Qe>>2];g[Le>>2]=+g[Ne>>2];g[Me>>2]=+g[Ke>>2];g[He>>2]=+g[Ie>>2];g[Ie>>2]=+g[Je>>2];g[Fe>>2]=+g[Ge>>2];g[De>>2]=+g[Ce>>2];g[Ce>>2]=+g[Ee>>2];g[ze>>2]=+g[Ae>>2];g[Ae>>2]=+g[Be>>2];g[we>>2]=+g[ye>>2];g[xe>>2]=+g[ve>>2];g[se>>2]=+g[te>>2];g[te>>2]=+g[ue>>2];g[qe>>2]=+g[re>>2];g[oe>>2]=+g[ne>>2];g[ne>>2]=+g[pe>>2];g[le>>2]=+g[ke>>2];g[ke>>2]=+g[me>>2];g[he>>2]=+g[ie>>2];g[ie>>2]=+g[je>>2];g[ee>>2]=+g[ge>>2];g[fe>>2]=+g[de>>2];g[ae>>2]=+g[be>>2];g[be>>2]=+g[ce>>2];g[_d>>2]=+g[$d>>2];g[Yd>>2]=+g[Xd>>2];g[Xd>>2]=+g[Zd>>2];g[Vd>>2]=+g[Ud>>2];g[Ud>>2]=+g[Wd>>2];g[Sd>>2]=+g[Rd>>2];g[Rd>>2]=+g[Td>>2];g[Od>>2]=+g[Pd>>2];g[Pd>>2]=+g[Qd>>2];g[Kd>>2]=+g[Nd>>2];g[Hd>>2]=+g[Id>>2];g[Id>>2]=+g[Jd>>2];g[Fd>>2]=+g[Gd>>2];g[Cd>>2]=+g[Dd>>2];g[Dd>>2]=+g[Ed>>2];g[zd>>2]=+g[Bd>>2];g[Ad>>2]=+g[yd>>2];g[vd>>2]=+g[wd>>2];g[wd>>2]=+g[xd>>2];g[td>>2]=+g[ud>>2];g[rd>>2]=+g[qd>>2];g[qd>>2]=+g[sd>>2];g[nd>>2]=+g[od>>2];g[od>>2]=+g[pd>>2];g[kd>>2]=+g[md>>2];g[ld>>2]=+g[jd>>2];g[gd>>2]=+g[hd>>2];g[hd>>2]=+g[id>>2];g[ed>>2]=+g[fd>>2];g[cd>>2]=+g[bd>>2];g[bd>>2]=+g[dd>>2];g[$c>>2]=+g[_c>>2];g[_c>>2]=+g[ad>>2];g[Xc>>2]=+g[Yc>>2];g[Yc>>2]=+g[Zc>>2];g[Uc>>2]=+g[Wc>>2];g[Vc>>2]=+g[Tc>>2];g[Qc>>2]=+g[Rc>>2];g[Rc>>2]=+g[Sc>>2];bb=+g[Pc>>2];g[Oc>>2]=bb;Fa=+g[Lc>>2];g[Mc>>2]=Fa;zb=+g[Nc>>2];g[Lc>>2]=zb;ta=+g[Ic>>2];g[Jc>>2]=ta;nb=+g[Kc>>2];g[Ic>>2]=nb;Ra=+g[Fc>>2];g[Gc>>2]=Ra;Mb=+g[Hc>>2];g[Fc>>2]=Mb;hb=+g[Dc>>2];g[Cc>>2]=hb;t=+g[Ec>>2];g[Dc>>2]=t;La=+g[Bc>>2];g[yc>>2]=La;Gb=+g[wc>>2];g[xc>>2]=Gb;za=+g[uc>>2];g[vc>>2]=za;Sb=+g[sc>>2];g[qc>>2]=Sb;tb=+g[rc>>2];g[sc>>2]=tb;Xa=+g[tc>>2];g[rc>>2]=Xa;ww=c[pc>>2]|0;c[e>>2]=ww;xw=xw+1|0}while((xw|0)!=(b|0));i=f;return}function xd(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,h=0,j=0.0;d=i;c[a+4>>2]=b;g[a+8>>2]=-40.0;e=(b|0)>1?b:1;b=(e|0)<192e3?e:192e3;e=a+72|0;f=a+12|0;h=f+60|0;do{c[f>>2]=0;f=f+4|0}while((f|0)<(h|0));c[e>>2]=b;j=+(b|0);g[a+76>>2]=1.0/j;g[a+80>>2]=j*.0029154520016163588;g[a+84>>2]=46.0;g[a+88>>2]=63.0;g[a+92>>2]=2.700000047683716;g[a+96>>2]=3.1415927410125732/j;g[a+100>>2]=4.0e3;b=a+104|0;e=a+124|0;c[b+0>>2]=0;c[b+4>>2]=0;c[b+8>>2]=0;c[b+12>>2]=0;c[b+16>>2]=0;g[e>>2]=2.0e3;e=a+128|0;c[e+0>>2]=0;c[e+4>>2]=0;c[e+8>>2]=0;g[a+140>>2]=1.0e3;e=a+144|0;c[e+0>>2]=0;c[e+4>>2]=0;c[e+8>>2]=0;g[a+156>>2]=500.0;e=a+160|0;c[e+0>>2]=0;c[e+4>>2]=0;c[e+8>>2]=0;g[a+172>>2]=3.799999952316284;e=a+248|0;f=a+176|0;h=f+72|0;do{c[f>>2]=0;f=f+4|0}while((f|0)<(h|0));g[e>>2]=5.0;e=a+312|0;f=a+252|0;h=f+60|0;do{c[f>>2]=0;f=f+4|0}while((f|0)<(h|0));g[e>>2]=6.5;e=a+364|0;f=a+316|0;h=f+48|0;do{c[f>>2]=0;f=f+4|0}while((f|0)<(h|0));g[e>>2]=8.399999618530273;rn(a+368|0,0,528356)|0;i=d;return}function yd(a){a=a|0;ob(a|0)|0;Oa()}function zd(b){b=b|0;var d=0,e=0,f=0,g=0,h=0;b=i;i=i+16|0;d=b;e=c[r>>2]|0;Vd(2712,e,2768);c[500]=4140;c[2008>>2]=4160;c[2004>>2]=0;Ye(2008|0,2712);c[2080>>2]=0;c[2084>>2]=-1;f=c[s>>2]|0;c[704]=4008;ak(2820|0);c[2824>>2]=0;c[2828>>2]=0;c[2832>>2]=0;c[2836>>2]=0;c[2840>>2]=0;c[2844>>2]=0;c[704]=3328;c[2848>>2]=f;bk(d,2820|0);g=dk(d,6800)|0;ck(d);c[2852>>2]=g;c[2856>>2]=2776;a[2860|0]=(qc[c[(c[g>>2]|0)+28>>2]&127](g)|0)&1;c[522]=4220;c[2092>>2]=4240;Ye(2092|0,2816);c[2164>>2]=0;c[2168>>2]=-1;g=c[q>>2]|0;c[716]=4008;ak(2868|0);c[2872>>2]=0;c[2876>>2]=0;c[2880>>2]=0;c[2884>>2]=0;c[2888>>2]=0;c[2892>>2]=0;c[716]=3328;c[2896>>2]=g;bk(d,2868|0);h=dk(d,6800)|0;ck(d);c[2900>>2]=h;c[2904>>2]=2784;a[2908|0]=(qc[c[(c[h>>2]|0)+28>>2]&127](h)|0)&1;c[544]=4220;c[2180>>2]=4240;Ye(2180|0,2864);c[2252>>2]=0;c[2256>>2]=-1;h=c[(c[(c[544]|0)+ -12>>2]|0)+2200>>2]|0;c[566]=4220;c[2268>>2]=4240;Ye(2268|0,h);c[2340>>2]=0;c[2344>>2]=-1;c[(c[(c[500]|0)+ -12>>2]|0)+2072>>2]=2088;h=(c[(c[544]|0)+ -12>>2]|0)+2180|0;c[h>>2]=c[h>>2]|8192;c[(c[(c[544]|0)+ -12>>2]|0)+2248>>2]=2088;Hd(2912,e,2792|0);c[588]=4180;c[2360>>2]=4200;c[2356>>2]=0;Ye(2360|0,2912);c[2432>>2]=0;c[2436>>2]=-1;c[742]=4072;ak(2972|0);c[2976>>2]=0;c[2980>>2]=0;c[2984>>2]=0;c[2988>>2]=0;c[2992>>2]=0;c[2996>>2]=0;c[742]=3072;c[3e3>>2]=f;bk(d,2972|0);f=dk(d,6808)|0;ck(d);c[3004>>2]=f;c[3008>>2]=2800;a[3012|0]=(qc[c[(c[f>>2]|0)+28>>2]&127](f)|0)&1;c[610]=4260;c[2444>>2]=4280;Ye(2444|0,2968);c[2516>>2]=0;c[2520>>2]=-1;c[754]=4072;ak(3020|0);c[3024>>2]=0;c[3028>>2]=0;c[3032>>2]=0;c[3036>>2]=0;c[3040>>2]=0;c[3044>>2]=0;c[754]=3072;c[3048>>2]=g;bk(d,3020|0);g=dk(d,6808)|0;ck(d);c[3052>>2]=g;c[3056>>2]=2808;a[3060|0]=(qc[c[(c[g>>2]|0)+28>>2]&127](g)|0)&1;c[632]=4260;c[2532>>2]=4280;Ye(2532|0,3016);c[2604>>2]=0;c[2608>>2]=-1;g=c[(c[(c[632]|0)+ -12>>2]|0)+2552>>2]|0;c[654]=4260;c[2620>>2]=4280;Ye(2620|0,g);c[2692>>2]=0;c[2696>>2]=-1;c[(c[(c[588]|0)+ -12>>2]|0)+2424>>2]=2440;g=(c[(c[632]|0)+ -12>>2]|0)+2532|0;c[g>>2]=c[g>>2]|8192;c[(c[(c[632]|0)+ -12>>2]|0)+2600>>2]=2440;i=b;return}function Ad(a){a=a|0;a=i;Ef(2088)|0;Ef(2264)|0;Jf(2440)|0;Jf(2616)|0;i=a;return}function Bd(a){a=a|0;var b=0;b=i;c[a>>2]=4072;ck(a+4|0);i=b;return}function Cd(a){a=a|0;var b=0;b=i;c[a>>2]=4072;ck(a+4|0);Wm(a);i=b;return}function Dd(b,d){b=b|0;d=d|0;var e=0,f=0;e=i;qc[c[(c[b>>2]|0)+24>>2]&127](b)|0;f=dk(d,6808)|0;c[b+36>>2]=f;a[b+44|0]=(qc[c[(c[f>>2]|0)+28>>2]&127](f)|0)&1;i=e;return}function Ed(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0;b=i;i=i+16|0;d=b+8|0;e=b;f=a+36|0;g=a+40|0;h=d+8|0;j=d;k=a+32|0;while(1){a=c[f>>2]|0;l=Ac[c[(c[a>>2]|0)+20>>2]&15](a,c[g>>2]|0,d,h,e)|0;a=(c[e>>2]|0)-j|0;if((Zb(d|0,1,a|0,c[k>>2]|0)|0)!=(a|0)){m=-1;n=5;break}if((l|0)==2){m=-1;n=5;break}else if((l|0)!=1){n=4;break}}if((n|0)==4){m=((ab(c[k>>2]|0)|0)!=0)<<31>>31;i=b;return m|0}else if((n|0)==5){i=b;return m|0}return 0}function Fd(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0;f=i;a:do{if((a[b+44|0]|0)==0){if((e|0)>0){g=d;h=0;while(1){if((zc[c[(c[b>>2]|0)+52>>2]&15](b,c[g>>2]|0)|0)==-1){j=h;break a}k=h+1|0;if((k|0)<(e|0)){g=g+4|0;h=k}else{j=k;break}}}else{j=0}}else{j=Zb(d|0,4,e|0,c[b+32>>2]|0)|0}}while(0);i=f;return j|0}function Gd(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;e=i;i=i+32|0;f=e+16|0;g=e+8|0;h=e+4|0;j=e;k=(d|0)==-1;a:do{if(!k){c[g>>2]=d;if((a[b+44|0]|0)!=0){if((Zb(g|0,4,1,c[b+32>>2]|0)|0)==1){break}else{l=-1}i=e;return l|0}c[h>>2]=f;m=g+4|0;n=b+36|0;o=b+40|0;p=f+8|0;q=f;r=b+32|0;s=g;while(1){t=c[n>>2]|0;u=vc[c[(c[t>>2]|0)+12>>2]&15](t,c[o>>2]|0,s,m,j,f,p,h)|0;if((c[j>>2]|0)==(s|0)){l=-1;v=12;break}if((u|0)==3){v=7;break}t=(u|0)==1;if(!(u>>>0<2)){l=-1;v=12;break}u=(c[h>>2]|0)-q|0;if((Zb(f|0,1,u|0,c[r>>2]|0)|0)!=(u|0)){l=-1;v=12;break}if(t){s=t?c[j>>2]|0:s}else{break a}}if((v|0)==7){if((Zb(s|0,1,1,c[r>>2]|0)|0)==1){break}else{l=-1}i=e;return l|0}else if((v|0)==12){i=e;return l|0}}}while(0);l=k?0:d;i=e;return l|0}function Hd(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0;f=i;i=i+16|0;g=f;c[b>>2]=4072;h=b+4|0;ak(h);j=b+8|0;c[j+0>>2]=0;c[j+4>>2]=0;c[j+8>>2]=0;c[j+12>>2]=0;c[j+16>>2]=0;c[j+20>>2]=0;c[b>>2]=3184;c[b+32>>2]=d;c[b+40>>2]=e;c[b+48>>2]=-1;a[b+52|0]=0;bk(g,h);h=dk(g,6808)|0;e=b+36|0;c[e>>2]=h;d=b+44|0;c[d>>2]=qc[c[(c[h>>2]|0)+24>>2]&127](h)|0;h=c[e>>2]|0;a[b+53|0]=(qc[c[(c[h>>2]|0)+28>>2]&127](h)|0)&1;if((c[d>>2]|0)>8){nj(3280)}else{ck(g);i=f;return}}function Id(a){a=a|0;var b=0;b=i;c[a>>2]=4072;ck(a+4|0);i=b;return}function Jd(a){a=a|0;var b=0;b=i;c[a>>2]=4072;ck(a+4|0);Wm(a);i=b;return}function Kd(b,d){b=b|0;d=d|0;var e=0,f=0,g=0;e=i;f=dk(d,6808)|0;d=b+36|0;c[d>>2]=f;g=b+44|0;c[g>>2]=qc[c[(c[f>>2]|0)+24>>2]&127](f)|0;f=c[d>>2]|0;a[b+53|0]=(qc[c[(c[f>>2]|0)+28>>2]&127](f)|0)&1;if((c[g>>2]|0)>8){nj(3280)}else{i=e;return}}function Ld(a){a=a|0;var b=0,c=0;b=i;c=Od(a,0)|0;i=b;return c|0}function Md(a){a=a|0;var b=0,c=0;b=i;c=Od(a,1)|0;i=b;return c|0}function Nd(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;e=i;i=i+32|0;f=e+16|0;g=e+8|0;h=e+4|0;j=e;k=b+52|0;l=(a[k]|0)!=0;if((d|0)==-1){if(l){m=-1;i=e;return m|0}n=c[b+48>>2]|0;a[k]=(n|0)!=-1|0;m=n;i=e;return m|0}n=b+48|0;a:do{if(l){c[h>>2]=c[n>>2];o=c[b+36>>2]|0;p=vc[c[(c[o>>2]|0)+12>>2]&15](o,c[b+40>>2]|0,h,h+4|0,j,f,f+8|0,g)|0;if((p|0)==1|(p|0)==2){m=-1;i=e;return m|0}else if((p|0)==3){a[f]=c[n>>2];c[g>>2]=f+1}p=b+32|0;while(1){o=c[g>>2]|0;if(!(o>>>0>f>>>0)){break a}q=o+ -1|0;c[g>>2]=q;if((Wa(a[q]|0,c[p>>2]|0)|0)==-1){m=-1;break}}i=e;return m|0}}while(0);c[n>>2]=d;a[k]=1;m=d;i=e;return m|0}function Od(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0;e=i;i=i+32|0;f=e+16|0;g=e+8|0;h=e+4|0;j=e;k=b+52|0;if((a[k]|0)!=0){l=b+48|0;m=c[l>>2]|0;if(!d){n=m;i=e;return n|0}c[l>>2]=-1;a[k]=0;n=m;i=e;return n|0}m=c[b+44>>2]|0;k=(m|0)>1?m:1;a:do{if((k|0)>0){m=b+32|0;l=0;while(1){o=Qb(c[m>>2]|0)|0;if((o|0)==-1){n=-1;break}a[f+l|0]=o;l=l+1|0;if((l|0)>=(k|0)){break a}}i=e;return n|0}}while(0);b:do{if((a[b+53|0]|0)==0){l=b+40|0;m=b+36|0;o=g+4|0;p=b+32|0;q=k;while(1){r=c[l>>2]|0;s=r;t=c[s>>2]|0;u=c[s+4>>2]|0;s=c[m>>2]|0;v=f+q|0;w=vc[c[(c[s>>2]|0)+16>>2]&15](s,r,f,v,h,g,o,j)|0;if((w|0)==3){x=14;break}else if((w|0)==2){n=-1;x=22;break}else if((w|0)!=1){y=q;break b}w=c[l>>2]|0;c[w>>2]=t;c[w+4>>2]=u;if((q|0)==8){n=-1;x=22;break}u=Qb(c[p>>2]|0)|0;if((u|0)==-1){n=-1;x=22;break}a[v]=u;q=q+1|0}if((x|0)==14){c[g>>2]=a[f]|0;y=q;break}else if((x|0)==22){i=e;return n|0}}else{c[g>>2]=a[f]|0;y=k}}while(0);if(d){d=c[g>>2]|0;c[b+48>>2]=d;n=d;i=e;return n|0}d=b+32|0;b=y;while(1){if((b|0)<=0){break}y=b+ -1|0;if((Wa(a[f+y|0]|0,c[d>>2]|0)|0)==-1){n=-1;x=22;break}else{b=y}}if((x|0)==22){i=e;return n|0}n=c[g>>2]|0;i=e;return n|0}function Pd(a){a=a|0;var b=0;b=i;c[a>>2]=4008;ck(a+4|0);i=b;return}function Qd(a){a=a|0;var b=0;b=i;c[a>>2]=4008;ck(a+4|0);Wm(a);i=b;return}function Rd(b,d){b=b|0;d=d|0;var e=0,f=0;e=i;qc[c[(c[b>>2]|0)+24>>2]&127](b)|0;f=dk(d,6800)|0;c[b+36>>2]=f;a[b+44|0]=(qc[c[(c[f>>2]|0)+28>>2]&127](f)|0)&1;i=e;return}function Sd(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0;b=i;i=i+16|0;d=b+8|0;e=b;f=a+36|0;g=a+40|0;h=d+8|0;j=d;k=a+32|0;while(1){a=c[f>>2]|0;l=Ac[c[(c[a>>2]|0)+20>>2]&15](a,c[g>>2]|0,d,h,e)|0;a=(c[e>>2]|0)-j|0;if((Zb(d|0,1,a|0,c[k>>2]|0)|0)!=(a|0)){m=-1;n=5;break}if((l|0)==2){m=-1;n=5;break}else if((l|0)!=1){n=4;break}}if((n|0)==4){m=((ab(c[k>>2]|0)|0)!=0)<<31>>31;i=b;return m|0}else if((n|0)==5){i=b;return m|0}return 0}function Td(b,e,f){b=b|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0;g=i;if((a[b+44|0]|0)!=0){h=Zb(e|0,1,f|0,c[b+32>>2]|0)|0;i=g;return h|0}if((f|0)>0){j=e;k=0}else{h=0;i=g;return h|0}while(1){if((zc[c[(c[b>>2]|0)+52>>2]&15](b,d[j]|0)|0)==-1){h=k;l=6;break}e=k+1|0;if((e|0)<(f|0)){j=j+1|0;k=e}else{h=e;l=6;break}}if((l|0)==6){i=g;return h|0}return 0}function Ud(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;e=i;i=i+32|0;f=e+16|0;g=e+8|0;h=e+4|0;j=e;k=(d|0)==-1;a:do{if(!k){a[g]=d;if((a[b+44|0]|0)!=0){if((Zb(g|0,1,1,c[b+32>>2]|0)|0)==1){break}else{l=-1}i=e;return l|0}c[h>>2]=f;m=g+1|0;n=b+36|0;o=b+40|0;p=f+8|0;q=f;r=b+32|0;s=g;while(1){t=c[n>>2]|0;u=vc[c[(c[t>>2]|0)+12>>2]&15](t,c[o>>2]|0,s,m,j,f,p,h)|0;if((c[j>>2]|0)==(s|0)){l=-1;v=12;break}if((u|0)==3){v=7;break}t=(u|0)==1;if(!(u>>>0<2)){l=-1;v=12;break}u=(c[h>>2]|0)-q|0;if((Zb(f|0,1,u|0,c[r>>2]|0)|0)!=(u|0)){l=-1;v=12;break}if(t){s=t?c[j>>2]|0:s}else{break a}}if((v|0)==7){if((Zb(s|0,1,1,c[r>>2]|0)|0)==1){break}else{l=-1}i=e;return l|0}else if((v|0)==12){i=e;return l|0}}}while(0);l=k?0:d;i=e;return l|0}function Vd(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0;f=i;i=i+16|0;g=f;c[b>>2]=4008;h=b+4|0;ak(h);j=b+8|0;c[j+0>>2]=0;c[j+4>>2]=0;c[j+8>>2]=0;c[j+12>>2]=0;c[j+16>>2]=0;c[j+20>>2]=0;c[b>>2]=3440;c[b+32>>2]=d;c[b+40>>2]=e;c[b+48>>2]=-1;a[b+52|0]=0;bk(g,h);h=dk(g,6800)|0;e=b+36|0;c[e>>2]=h;d=b+44|0;c[d>>2]=qc[c[(c[h>>2]|0)+24>>2]&127](h)|0;h=c[e>>2]|0;a[b+53|0]=(qc[c[(c[h>>2]|0)+28>>2]&127](h)|0)&1;if((c[d>>2]|0)>8){nj(3280)}else{ck(g);i=f;return}}function Wd(a){a=a|0;var b=0;b=i;c[a>>2]=4008;ck(a+4|0);i=b;return}function Xd(a){a=a|0;var b=0;b=i;c[a>>2]=4008;ck(a+4|0);Wm(a);i=b;return}function Yd(b,d){b=b|0;d=d|0;var e=0,f=0,g=0;e=i;f=dk(d,6800)|0;d=b+36|0;c[d>>2]=f;g=b+44|0;c[g>>2]=qc[c[(c[f>>2]|0)+24>>2]&127](f)|0;f=c[d>>2]|0;a[b+53|0]=(qc[c[(c[f>>2]|0)+28>>2]&127](f)|0)&1;if((c[g>>2]|0)>8){nj(3280)}else{i=e;return}}function Zd(a){a=a|0;var b=0,c=0;b=i;c=ae(a,0)|0;i=b;return c|0}function _d(a){a=a|0;var b=0,c=0;b=i;c=ae(a,1)|0;i=b;return c|0}function $d(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;e=i;i=i+32|0;f=e+16|0;g=e+4|0;h=e+8|0;j=e;k=b+52|0;l=(a[k]|0)!=0;if((d|0)==-1){if(l){m=-1;i=e;return m|0}n=c[b+48>>2]|0;a[k]=(n|0)!=-1|0;m=n;i=e;return m|0}n=b+48|0;a:do{if(l){a[h]=c[n>>2];o=c[b+36>>2]|0;p=vc[c[(c[o>>2]|0)+12>>2]&15](o,c[b+40>>2]|0,h,h+1|0,j,f,f+8|0,g)|0;if((p|0)==3){a[f]=c[n>>2];c[g>>2]=f+1}else if((p|0)==1|(p|0)==2){m=-1;i=e;return m|0}p=b+32|0;while(1){o=c[g>>2]|0;if(!(o>>>0>f>>>0)){break a}q=o+ -1|0;c[g>>2]=q;if((Wa(a[q]|0,c[p>>2]|0)|0)==-1){m=-1;break}}i=e;return m|0}}while(0);c[n>>2]=d;a[k]=1;m=d;i=e;return m|0}function ae(b,e){b=b|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0;f=i;i=i+32|0;g=f+16|0;h=f+8|0;j=f+4|0;k=f;l=b+52|0;if((a[l]|0)!=0){m=b+48|0;n=c[m>>2]|0;if(!e){o=n;i=f;return o|0}c[m>>2]=-1;a[l]=0;o=n;i=f;return o|0}n=c[b+44>>2]|0;l=(n|0)>1?n:1;a:do{if((l|0)>0){n=b+32|0;m=0;while(1){p=Qb(c[n>>2]|0)|0;if((p|0)==-1){o=-1;break}a[g+m|0]=p;m=m+1|0;if((m|0)>=(l|0)){break a}}i=f;return o|0}}while(0);b:do{if((a[b+53|0]|0)==0){m=b+40|0;n=b+36|0;p=h+1|0;q=b+32|0;r=l;while(1){s=c[m>>2]|0;t=s;u=c[t>>2]|0;v=c[t+4>>2]|0;t=c[n>>2]|0;w=g+r|0;x=vc[c[(c[t>>2]|0)+16>>2]&15](t,s,g,w,j,h,p,k)|0;if((x|0)==2){o=-1;y=23;break}else if((x|0)==3){y=14;break}else if((x|0)!=1){z=r;break b}x=c[m>>2]|0;c[x>>2]=u;c[x+4>>2]=v;if((r|0)==8){o=-1;y=23;break}v=Qb(c[q>>2]|0)|0;if((v|0)==-1){o=-1;y=23;break}a[w]=v;r=r+1|0}if((y|0)==14){a[h]=a[g]|0;z=r;break}else if((y|0)==23){i=f;return o|0}}else{a[h]=a[g]|0;z=l}}while(0);do{if(!e){l=b+32|0;k=z;while(1){if((k|0)<=0){y=21;break}j=k+ -1|0;if((Wa(d[g+j|0]|0,c[l>>2]|0)|0)==-1){o=-1;y=23;break}else{k=j}}if((y|0)==21){A=a[h]|0;break}else if((y|0)==23){i=f;return o|0}}else{k=a[h]|0;c[b+48>>2]=k&255;A=k}}while(0);o=A&255;i=f;return o|0}function be(){var a=0;a=i;zd(0);Ua(116,2704,p|0)|0;i=a;return}function ce(a){a=a|0;return}function de(a){a=a|0;var b=0;b=a+4|0;c[b>>2]=(c[b>>2]|0)+1;return}function ee(a){a=a|0;var b=0,d=0,e=0,f=0;b=i;d=a+4|0;e=c[d>>2]|0;c[d>>2]=e+ -1;if((e|0)!=0){f=0;i=b;return f|0}nc[c[(c[a>>2]|0)+8>>2]&255](a);f=1;i=b;return f|0}function fe(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0;d=i;c[a>>2]=3584;e=qn(b|0)|0;f=Vm(e+13|0)|0;c[f+4>>2]=e;c[f>>2]=e;g=f+12|0;c[a+4>>2]=g;c[f+8>>2]=0;on(g|0,b|0,e+1|0)|0;i=d;return}function ge(a){a=a|0;var b=0,d=0,e=0,f=0;b=i;c[a>>2]=3584;d=a+4|0;e=(c[d>>2]|0)+ -4|0;f=c[e>>2]|0;c[e>>2]=f+ -1;if((f+ -1|0)<0){Xm((c[d>>2]|0)+ -12|0)}Pb(a|0);Wm(a);i=b;return}function he(a){a=a|0;var b=0,d=0,e=0,f=0;b=i;c[a>>2]=3584;d=a+4|0;e=(c[d>>2]|0)+ -4|0;f=c[e>>2]|0;c[e>>2]=f+ -1;if((f+ -1|0)>=0){Pb(a|0);i=b;return}Xm((c[d>>2]|0)+ -12|0);Pb(a|0);i=b;return}function ie(a){a=a|0;return c[a+4>>2]|0}function je(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0;e=i;c[b>>2]=3608;if((a[d]&1)==0){f=d+1|0}else{f=c[d+8>>2]|0}d=qn(f|0)|0;g=Vm(d+13|0)|0;c[g+4>>2]=d;c[g>>2]=d;h=g+12|0;c[b+4>>2]=h;c[g+8>>2]=0;on(h|0,f|0,d+1|0)|0;i=e;return}function ke(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0;d=i;c[a>>2]=3608;e=qn(b|0)|0;f=Vm(e+13|0)|0;c[f+4>>2]=e;c[f>>2]=e;g=f+12|0;c[a+4>>2]=g;c[f+8>>2]=0;on(g|0,b|0,e+1|0)|0;i=d;return}function le(a){a=a|0;var b=0,d=0,e=0,f=0;b=i;c[a>>2]=3608;d=a+4|0;e=(c[d>>2]|0)+ -4|0;f=c[e>>2]|0;c[e>>2]=f+ -1;if((f+ -1|0)<0){Xm((c[d>>2]|0)+ -12|0)}Pb(a|0);Wm(a);i=b;return}function me(a){a=a|0;var b=0,d=0,e=0,f=0;b=i;c[a>>2]=3608;d=a+4|0;e=(c[d>>2]|0)+ -4|0;f=c[e>>2]|0;c[e>>2]=f+ -1;if((f+ -1|0)>=0){Pb(a|0);i=b;return}Xm((c[d>>2]|0)+ -12|0);Pb(a|0);i=b;return}function ne(a){a=a|0;return c[a+4>>2]|0}function oe(a){a=a|0;var b=0,d=0,e=0,f=0;b=i;c[a>>2]=3584;d=a+4|0;e=(c[d>>2]|0)+ -4|0;f=c[e>>2]|0;c[e>>2]=f+ -1;if((f+ -1|0)<0){Xm((c[d>>2]|0)+ -12|0)}Pb(a|0);Wm(a);i=b;return}function pe(a){a=a|0;return}function qe(a,b,d){a=a|0;b=b|0;d=d|0;c[a>>2]=d;c[a+4>>2]=b;return}function re(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0;e=i;i=i+16|0;f=e;sc[c[(c[a>>2]|0)+12>>2]&7](f,a,b);if((c[f+4>>2]|0)!=(c[d+4>>2]|0)){g=0;i=e;return g|0}g=(c[f>>2]|0)==(c[d>>2]|0);i=e;return g|0}function se(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0;e=i;if((c[b+4>>2]|0)!=(a|0)){f=0;i=e;return f|0}f=(c[b>>2]|0)==(d|0);i=e;return f|0}function te(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0;d=i;f=ac(e|0)|0;e=qn(f|0)|0;if(e>>>0>4294967279){ze(0)}if(e>>>0<11){a[b]=e<<1;g=b+1|0;on(g|0,f|0,e|0)|0;h=g+e|0;a[h]=0;i=d;return}else{j=e+16&-16;k=Um(j)|0;c[b+8>>2]=k;c[b>>2]=j|1;c[b+4>>2]=e;g=k;on(g|0,f|0,e|0)|0;h=g+e|0;a[h]=0;i=d;return}}function ue(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0;f=i;i=i+16|0;g=f;h=c[d>>2]|0;if((h|0)!=0){j=a[e]|0;if((j&1)==0){k=(j&255)>>>1}else{k=c[e+4>>2]|0}if((k|0)==0){l=h}else{Je(e,3760,2)|0;l=c[d>>2]|0}h=c[d+4>>2]|0;sc[c[(c[h>>2]|0)+24>>2]&7](g,h,l);l=a[g]|0;if((l&1)==0){m=g+1|0;n=(l&255)>>>1}else{m=c[g+8>>2]|0;n=c[g+4>>2]|0}Je(e,m,n)|0;if(!((a[g]&1)==0)){Wm(c[g+8>>2]|0)}}c[b+0>>2]=c[e+0>>2];c[b+4>>2]=c[e+4>>2];c[b+8>>2]=c[e+8>>2];c[e+0>>2]=0;c[e+4>>2]=0;c[e+8>>2]=0;i=f;return}function ve(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0;f=i;i=i+32|0;g=f+12|0;h=f;j=qn(e|0)|0;if(j>>>0>4294967279){ze(0)}if(j>>>0<11){a[h]=j<<1;k=h+1|0}else{l=j+16&-16;m=Um(l)|0;c[h+8>>2]=m;c[h>>2]=l|1;c[h+4>>2]=j;k=m}on(k|0,e|0,j|0)|0;a[k+j|0]=0;ue(g,d,h);je(b,g);if(!((a[g]&1)==0)){Wm(c[g+8>>2]|0)}if(!((a[h]&1)==0)){Wm(c[h+8>>2]|0)}c[b>>2]=3776;h=d;d=c[h+4>>2]|0;g=b+8|0;c[g>>2]=c[h>>2];c[g+4>>2]=d;i=f;return}function we(a){a=a|0;var b=0;b=i;me(a);Wm(a);i=b;return}function xe(a){a=a|0;var b=0;b=i;me(a);i=b;return}function ye(a,b,d){a=a|0;b=b|0;d=d|0;var e=0;e=i;$b(3912)|0;if((c[a>>2]|0)==1){do{Fa(3936,3912)|0}while((c[a>>2]|0)==1)}if((c[a>>2]|0)==0){c[a>>2]=1;Cb(3912)|0;nc[d&255](b);$b(3912)|0;c[a>>2]=-1;Cb(3912)|0;Eb(3936)|0;i=e;return}else{Cb(3912)|0;i=e;return}}function ze(a){a=a|0;a=Ya(8)|0;fe(a,3984);c[a>>2]=3664;zb(a|0,3704,14)}function Ae(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0;e=i;if((a[d]&1)==0){c[b+0>>2]=c[d+0>>2];c[b+4>>2]=c[d+4>>2];c[b+8>>2]=c[d+8>>2];i=e;return}f=c[d+8>>2]|0;g=c[d+4>>2]|0;if(g>>>0>4294967279){ze(0)}if(g>>>0<11){a[b]=g<<1;h=b+1|0}else{d=g+16&-16;j=Um(d)|0;c[b+8>>2]=j;c[b>>2]=d|1;c[b+4>>2]=g;h=j}on(h|0,f|0,g|0)|0;a[h+g|0]=0;i=e;return}function Be(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0;f=i;if(e>>>0>4294967279){ze(0)}if(e>>>0<11){a[b]=e<<1;g=b+1|0}else{h=e+16&-16;j=Um(h)|0;c[b+8>>2]=j;c[b>>2]=h|1;c[b+4>>2]=e;g=j}on(g|0,d|0,e|0)|0;a[g+e|0]=0;i=f;return}function Ce(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0;f=i;if(d>>>0>4294967279){ze(0)}if(d>>>0<11){a[b]=d<<1;g=b+1|0}else{h=d+16&-16;j=Um(h)|0;c[b+8>>2]=j;c[b>>2]=h|1;c[b+4>>2]=d;g=j}rn(g|0,e|0,d|0)|0;a[g+d|0]=0;i=f;return}function De(b){b=b|0;var d=0;d=i;if((a[b]&1)==0){i=d;return}Wm(c[b+8>>2]|0);i=d;return}function Ee(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0;e=i;f=qn(d|0)|0;g=a[b]|0;if((g&1)==0){h=g;j=10}else{g=c[b>>2]|0;h=g&255;j=(g&-2)+ -1|0}g=(h&1)==0;if(j>>>0<f>>>0){if(g){k=(h&255)>>>1}else{k=c[b+4>>2]|0}Ke(b,j,f-j|0,k,0,k,f,d);i=e;return b|0}if(g){l=b+1|0}else{l=c[b+8>>2]|0}pn(l|0,d|0,f|0)|0;a[l+f|0]=0;if((a[b]&1)==0){a[b]=f<<1;i=e;return b|0}else{c[b+4>>2]=f;i=e;return b|0}return 0}function Fe(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0;f=i;g=a[b]|0;h=(g&1)==0;if(h){j=(g&255)>>>1}else{j=c[b+4>>2]|0}if(j>>>0<d>>>0){Ge(b,d-j|0,e)|0;i=f;return}if(h){a[b+d+1|0]=0;a[b]=d<<1;i=f;return}else{a[(c[b+8>>2]|0)+d|0]=0;c[b+4>>2]=d;i=f;return}}function Ge(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0;f=i;if((d|0)==0){i=f;return b|0}g=a[b]|0;if((g&1)==0){h=10;j=g}else{g=c[b>>2]|0;h=(g&-2)+ -1|0;j=g&255}if((j&1)==0){k=(j&255)>>>1}else{k=c[b+4>>2]|0}if((h-k|0)>>>0<d>>>0){Le(b,h,d-h+k|0,k,k,0,0);l=a[b]|0}else{l=j}if((l&1)==0){m=b+1|0}else{m=c[b+8>>2]|0}rn(m+k|0,e|0,d|0)|0;e=k+d|0;if((a[b]&1)==0){a[b]=e<<1}else{c[b+4>>2]=e}a[m+e|0]=0;i=f;return b|0}function He(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;e=i;if(d>>>0>4294967279){ze(0)}f=a[b]|0;if((f&1)==0){g=10;h=f}else{f=c[b>>2]|0;g=(f&-2)+ -1|0;h=f&255}if((h&1)==0){j=(h&255)>>>1}else{j=c[b+4>>2]|0}f=j>>>0>d>>>0?j:d;if(f>>>0<11){k=10}else{k=(f+16&-16)+ -1|0}if((k|0)==(g|0)){i=e;return}do{if((k|0)!=10){f=k+1|0;if(k>>>0>g>>>0){l=Um(f)|0}else{l=Um(f)|0}if((h&1)==0){m=l;n=1;o=b+1|0;p=0;break}else{m=l;n=1;o=c[b+8>>2]|0;p=1;break}}else{m=b+1|0;n=0;o=c[b+8>>2]|0;p=1}}while(0);if((h&1)==0){q=(h&255)>>>1}else{q=c[b+4>>2]|0}on(m|0,o|0,q+1|0)|0;if(p){Wm(o)}if(n){c[b>>2]=k+1|1;c[b+4>>2]=j;c[b+8>>2]=m;i=e;return}else{a[b]=j<<1;i=e;return}}function Ie(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;e=i;f=a[b]|0;g=(f&1)!=0;if(g){h=(c[b>>2]&-2)+ -1|0;j=c[b+4>>2]|0}else{h=10;j=(f&255)>>>1}if((j|0)==(h|0)){Le(b,h,1,h,h,0,0);if((a[b]&1)==0){k=7}else{k=8}}else{if(g){k=8}else{k=7}}if((k|0)==7){a[b]=(j<<1)+2;l=b+1|0;m=j+1|0;n=l+j|0;a[n]=d;o=l+m|0;a[o]=0;i=e;return}else if((k|0)==8){k=c[b+8>>2]|0;g=j+1|0;c[b+4>>2]=g;l=k;m=g;n=l+j|0;a[n]=d;o=l+m|0;a[o]=0;i=e;return}}function Je(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0;f=i;g=a[b]|0;if((g&1)==0){h=10;j=g}else{g=c[b>>2]|0;h=(g&-2)+ -1|0;j=g&255}if((j&1)==0){k=(j&255)>>>1}else{k=c[b+4>>2]|0}if((h-k|0)>>>0<e>>>0){Ke(b,h,e-h+k|0,k,k,0,e,d);i=f;return b|0}if((e|0)==0){i=f;return b|0}if((j&1)==0){l=b+1|0}else{l=c[b+8>>2]|0}on(l+k|0,d|0,e|0)|0;d=k+e|0;if((a[b]&1)==0){a[b]=d<<1}else{c[b+4>>2]=d}a[l+d|0]=0;i=f;return b|0}function Ke(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0;l=i;if((-18-d|0)>>>0<e>>>0){ze(0)}if((a[b]&1)==0){m=b+1|0}else{m=c[b+8>>2]|0}if(d>>>0<2147483623){n=e+d|0;e=d<<1;o=n>>>0<e>>>0?e:n;if(o>>>0<11){p=11}else{p=o+16&-16}}else{p=-17}o=Um(p)|0;if((g|0)!=0){on(o|0,m|0,g|0)|0}if((j|0)!=0){on(o+g|0,k|0,j|0)|0}k=f-h|0;if((k|0)!=(g|0)){on(o+(j+g)|0,m+(h+g)|0,k-g|0)|0}if((d|0)==10){q=b+8|0;c[q>>2]=o;r=p|1;c[b>>2]=r;s=k+j|0;t=b+4|0;c[t>>2]=s;u=o+s|0;a[u]=0;i=l;return}Wm(m);q=b+8|0;c[q>>2]=o;r=p|1;c[b>>2]=r;s=k+j|0;t=b+4|0;c[t>>2]=s;u=o+s|0;a[u]=0;i=l;return}function Le(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0;k=i;if((-17-d|0)>>>0<e>>>0){ze(0)}if((a[b]&1)==0){l=b+1|0}else{l=c[b+8>>2]|0}if(d>>>0<2147483623){m=e+d|0;e=d<<1;n=m>>>0<e>>>0?e:m;if(n>>>0<11){o=11}else{o=n+16&-16}}else{o=-17}n=Um(o)|0;if((g|0)!=0){on(n|0,l|0,g|0)|0}m=f-h|0;if((m|0)!=(g|0)){on(n+(j+g)|0,l+(h+g)|0,m-g|0)|0}if((d|0)==10){p=b+8|0;c[p>>2]=n;q=o|1;c[b>>2]=q;i=k;return}Wm(l);p=b+8|0;c[p>>2]=n;q=o|1;c[b>>2]=q;i=k;return}function Me(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0;f=i;if(e>>>0>1073741807){ze(0)}if(e>>>0<2){a[b]=e<<1;g=b+4|0}else{h=e+4&-4;j=Um(h<<2)|0;c[b+8>>2]=j;c[b>>2]=h|1;c[b+4>>2]=e;g=j}qm(g,d,e)|0;c[g+(e<<2)>>2]=0;i=f;return}function Ne(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0;f=i;if(d>>>0>1073741807){ze(0)}if(d>>>0<2){a[b]=d<<1;g=b+4|0}else{h=d+4&-4;j=Um(h<<2)|0;c[b+8>>2]=j;c[b>>2]=h|1;c[b+4>>2]=d;g=j}sm(g,e,d)|0;c[g+(d<<2)>>2]=0;i=f;return}function Oe(b){b=b|0;var d=0;d=i;if((a[b]&1)==0){i=d;return}Wm(c[b+8>>2]|0);i=d;return}function Pe(a,b){a=a|0;b=b|0;var c=0,d=0;c=i;d=Qe(a,b,pm(b)|0)|0;i=c;return d|0}function Qe(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0;f=i;g=a[b]|0;if((g&1)==0){h=1;j=g}else{g=c[b>>2]|0;h=(g&-2)+ -1|0;j=g&255}g=(j&1)==0;if(h>>>0<e>>>0){if(g){k=(j&255)>>>1}else{k=c[b+4>>2]|0}Te(b,h,e-h|0,k,0,k,e,d);i=f;return b|0}if(g){l=b+4|0}else{l=c[b+8>>2]|0}rm(l,d,e)|0;c[l+(e<<2)>>2]=0;if((a[b]&1)==0){a[b]=e<<1;i=f;return b|0}else{c[b+4>>2]=e;i=f;return b|0}return 0}function Re(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;e=i;if(d>>>0>1073741807){ze(0)}f=a[b]|0;if((f&1)==0){g=1;h=f}else{f=c[b>>2]|0;g=(f&-2)+ -1|0;h=f&255}if((h&1)==0){j=(h&255)>>>1}else{j=c[b+4>>2]|0}f=j>>>0>d>>>0?j:d;if(f>>>0<2){k=1}else{k=(f+4&-4)+ -1|0}if((k|0)==(g|0)){i=e;return}do{if((k|0)!=1){f=(k<<2)+4|0;if(k>>>0>g>>>0){l=Um(f)|0}else{l=Um(f)|0}if((h&1)==0){m=l;n=1;o=b+4|0;p=0;break}else{m=l;n=1;o=c[b+8>>2]|0;p=1;break}}else{m=b+4|0;n=0;o=c[b+8>>2]|0;p=1}}while(0);if((h&1)==0){q=(h&255)>>>1}else{q=c[b+4>>2]|0}qm(m,o,q+1|0)|0;if(p){Wm(o)}if(n){c[b>>2]=k+1|1;c[b+4>>2]=j;c[b+8>>2]=m;i=e;return}else{a[b]=j<<1;i=e;return}}function Se(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;e=i;f=a[b]|0;g=(f&1)!=0;if(g){h=(c[b>>2]&-2)+ -1|0;j=c[b+4>>2]|0}else{h=1;j=(f&255)>>>1}if((j|0)==(h|0)){Ue(b,h,1,h,h,0,0);if((a[b]&1)==0){k=7}else{k=8}}else{if(g){k=8}else{k=7}}if((k|0)==7){a[b]=(j<<1)+2;l=b+4|0;m=j+1|0;n=l+(j<<2)|0;c[n>>2]=d;o=l+(m<<2)|0;c[o>>2]=0;i=e;return}else if((k|0)==8){k=c[b+8>>2]|0;g=j+1|0;c[b+4>>2]=g;l=k;m=g;n=l+(j<<2)|0;c[n>>2]=d;o=l+(m<<2)|0;c[o>>2]=0;i=e;return}}function Te(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0;l=i;if((1073741806-d|0)>>>0<e>>>0){ze(0)}if((a[b]&1)==0){m=b+4|0}else{m=c[b+8>>2]|0}if(d>>>0<536870887){n=e+d|0;e=d<<1;o=n>>>0<e>>>0?e:n;if(o>>>0<2){p=2}else{p=o+4&-4}}else{p=1073741807}o=Um(p<<2)|0;if((g|0)!=0){qm(o,m,g)|0}if((j|0)!=0){qm(o+(g<<2)|0,k,j)|0}k=f-h|0;if((k|0)!=(g|0)){qm(o+(j+g<<2)|0,m+(h+g<<2)|0,k-g|0)|0}if((d|0)==1){q=b+8|0;c[q>>2]=o;r=p|1;c[b>>2]=r;s=k+j|0;t=b+4|0;c[t>>2]=s;u=o+(s<<2)|0;c[u>>2]=0;i=l;return}Wm(m);q=b+8|0;c[q>>2]=o;r=p|1;c[b>>2]=r;s=k+j|0;t=b+4|0;c[t>>2]=s;u=o+(s<<2)|0;c[u>>2]=0;i=l;return}function Ue(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0;k=i;if((1073741807-d|0)>>>0<e>>>0){ze(0)}if((a[b]&1)==0){l=b+4|0}else{l=c[b+8>>2]|0}if(d>>>0<536870887){m=e+d|0;e=d<<1;n=m>>>0<e>>>0?e:m;if(n>>>0<2){o=2}else{o=n+4&-4}}else{o=1073741807}n=Um(o<<2)|0;if((g|0)!=0){qm(n,l,g)|0}m=f-h|0;if((m|0)!=(g|0)){qm(n+(j+g<<2)|0,l+(h+g<<2)|0,m-g|0)|0}if((d|0)==1){p=b+8|0;c[p>>2]=n;q=o|1;c[b>>2]=q;i=k;return}Wm(l);p=b+8|0;c[p>>2]=n;q=o|1;c[b>>2]=q;i=k;return}function Ve(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0;e=i;i=i+16|0;f=e+8|0;g=e;h=(c[b+24>>2]|0)==0;if(h){c[b+16>>2]=d|1}else{c[b+16>>2]=d}if(((h&1|d)&c[b+20>>2]|0)==0){i=e;return}e=Ya(16)|0;if((a[4352]|0)==0?(Qa(4352)|0)!=0:0){c[1086]=5048;Ua(45,4344,p|0)|0;bb(4352)}b=g;c[b>>2]=1;c[b+4>>2]=4344;c[f+0>>2]=c[g+0>>2];c[f+4>>2]=c[g+4>>2];ve(e,f,4400);c[e>>2]=4368;zb(e|0,4448,41)}function We(a){a=a|0;var b=0,d=0,e=0,f=0,g=0;b=i;c[a>>2]=4392;d=c[a+40>>2]|0;e=a+32|0;f=a+36|0;if((d|0)!=0){g=d;do{g=g+ -1|0;sc[c[(c[e>>2]|0)+(g<<2)>>2]&7](0,a,c[(c[f>>2]|0)+(g<<2)>>2]|0)}while((g|0)!=0)}ck(a+28|0);Qm(c[e>>2]|0);Qm(c[f>>2]|0);Qm(c[a+48>>2]|0);Qm(c[a+60>>2]|0);i=b;return}function Xe(a,b){a=a|0;b=b|0;var c=0;c=i;bk(a,b+28|0);i=c;return}function Ye(a,b){a=a|0;b=b|0;var d=0,e=0;d=i;c[a+24>>2]=b;c[a+16>>2]=(b|0)==0;c[a+20>>2]=0;c[a+4>>2]=4098;c[a+12>>2]=0;c[a+8>>2]=6;b=a+28|0;e=a+32|0;a=e+40|0;do{c[e>>2]=0;e=e+4|0}while((e|0)<(a|0));ak(b);i=d;return}function Ze(a){a=a|0;var b=0;b=i;c[a>>2]=4008;ck(a+4|0);Wm(a);i=b;return}function _e(a){a=a|0;var b=0;b=i;c[a>>2]=4008;ck(a+4|0);i=b;return}function $e(a,b){a=a|0;b=b|0;return}function af(a,b,c){a=a|0;b=b|0;c=c|0;return a|0}function bf(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;g=a;c[g>>2]=0;c[g+4>>2]=0;g=a+8|0;c[g>>2]=-1;c[g+4>>2]=-1;return}function cf(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;e=a;c[e>>2]=0;c[e+4>>2]=0;e=a+8|0;c[e>>2]=-1;c[e+4>>2]=-1;return}function df(a){a=a|0;return 0}function ef(a){a=a|0;return 0}function ff(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0;f=i;if((e|0)<=0){g=0;i=f;return g|0}h=b+12|0;j=b+16|0;k=d;d=0;while(1){l=c[h>>2]|0;if(l>>>0<(c[j>>2]|0)>>>0){c[h>>2]=l+1;m=a[l]|0}else{l=qc[c[(c[b>>2]|0)+40>>2]&127](b)|0;if((l|0)==-1){g=d;n=8;break}m=l&255}a[k]=m;l=d+1|0;if((l|0)<(e|0)){k=k+1|0;d=l}else{g=l;n=8;break}}if((n|0)==8){i=f;return g|0}return 0}function gf(a){a=a|0;return-1}function hf(a){a=a|0;var b=0,e=0,f=0;b=i;if((qc[c[(c[a>>2]|0)+36>>2]&127](a)|0)==-1){e=-1;i=b;return e|0}f=a+12|0;a=c[f>>2]|0;c[f>>2]=a+1;e=d[a]|0;i=b;return e|0}function jf(a,b){a=a|0;b=b|0;return-1}function kf(b,e,f){b=b|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;g=i;if((f|0)<=0){h=0;i=g;return h|0}j=b+24|0;k=b+28|0;l=e;e=0;while(1){m=c[j>>2]|0;if(!(m>>>0<(c[k>>2]|0)>>>0)){if((zc[c[(c[b>>2]|0)+52>>2]&15](b,d[l]|0)|0)==-1){h=e;n=7;break}}else{o=a[l]|0;c[j>>2]=m+1;a[m]=o}o=e+1|0;if((o|0)<(f|0)){l=l+1|0;e=o}else{h=o;n=7;break}}if((n|0)==7){i=g;return h|0}return 0}function lf(a,b){a=a|0;b=b|0;return-1}function mf(a){a=a|0;var b=0;b=i;c[a>>2]=4072;ck(a+4|0);Wm(a);i=b;return}function nf(a){a=a|0;var b=0;b=i;c[a>>2]=4072;ck(a+4|0);i=b;return}function of(a,b){a=a|0;b=b|0;return}function pf(a,b,c){a=a|0;b=b|0;c=c|0;return a|0}function qf(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;g=a;c[g>>2]=0;c[g+4>>2]=0;g=a+8|0;c[g>>2]=-1;c[g+4>>2]=-1;return}function rf(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;e=a;c[e>>2]=0;c[e+4>>2]=0;e=a+8|0;c[e>>2]=-1;c[e+4>>2]=-1;return}function sf(a){a=a|0;return 0}function tf(a){a=a|0;return 0}function uf(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0;e=i;if((d|0)<=0){f=0;i=e;return f|0}g=a+12|0;h=a+16|0;j=b;b=0;while(1){k=c[g>>2]|0;if(!(k>>>0<(c[h>>2]|0)>>>0)){l=qc[c[(c[a>>2]|0)+40>>2]&127](a)|0;if((l|0)==-1){f=b;m=8;break}else{n=l}}else{c[g>>2]=k+4;n=c[k>>2]|0}c[j>>2]=n;k=b+1|0;if((k|0)>=(d|0)){f=k;m=8;break}j=j+4|0;b=k}if((m|0)==8){i=e;return f|0}return 0}function vf(a){a=a|0;return-1}function wf(a){a=a|0;var b=0,d=0,e=0;b=i;if((qc[c[(c[a>>2]|0)+36>>2]&127](a)|0)==-1){d=-1;i=b;return d|0}e=a+12|0;a=c[e>>2]|0;c[e>>2]=a+4;d=c[a>>2]|0;i=b;return d|0}function xf(a,b){a=a|0;b=b|0;return-1}function yf(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0;e=i;if((d|0)<=0){f=0;i=e;return f|0}g=a+24|0;h=a+28|0;j=b;b=0;while(1){k=c[g>>2]|0;if(!(k>>>0<(c[h>>2]|0)>>>0)){if((zc[c[(c[a>>2]|0)+52>>2]&15](a,c[j>>2]|0)|0)==-1){f=b;l=8;break}}else{m=c[j>>2]|0;c[g>>2]=k+4;c[k>>2]=m}m=b+1|0;if((m|0)>=(d|0)){f=m;l=8;break}j=j+4|0;b=m}if((l|0)==8){i=e;return f|0}return 0}function zf(a,b){a=a|0;b=b|0;return-1}function Af(a){a=a|0;var b=0;b=i;We(a+8|0);Wm(a);i=b;return}function Bf(a){a=a|0;var b=0;b=i;We(a+8|0);i=b;return}function Cf(a){a=a|0;var b=0,d=0;b=i;d=c[(c[a>>2]|0)+ -12>>2]|0;We(a+(d+8)|0);Wm(a+d|0);i=b;return}function Df(a){a=a|0;var b=0;b=i;We(a+((c[(c[a>>2]|0)+ -12>>2]|0)+8)|0);i=b;return}function Ef(b){b=b|0;var d=0,e=0,f=0,g=0,h=0;d=i;i=i+16|0;e=d;f=c[(c[b>>2]|0)+ -12>>2]|0;if((c[b+(f+24)>>2]|0)==0){i=d;return b|0}a[e]=0;c[e+4>>2]=b;if((c[b+(f+16)>>2]|0)==0){g=c[b+(f+72)>>2]|0;if((g|0)==0){h=f}else{Ef(g)|0;h=c[(c[b>>2]|0)+ -12>>2]|0}a[e]=1;g=c[b+(h+24)>>2]|0;if((qc[c[(c[g>>2]|0)+24>>2]&127](g)|0)==-1){g=c[(c[b>>2]|0)+ -12>>2]|0;Ve(b+g|0,c[b+(g+16)>>2]|1)}}Of(e);i=d;return b|0}function Ff(a){a=a|0;var b=0;b=i;We(a+8|0);Wm(a);i=b;return}function Gf(a){a=a|0;var b=0;b=i;We(a+8|0);i=b;return}function Hf(a){a=a|0;var b=0,d=0;b=i;d=c[(c[a>>2]|0)+ -12>>2]|0;We(a+(d+8)|0);Wm(a+d|0);i=b;return}function If(a){a=a|0;var b=0;b=i;We(a+((c[(c[a>>2]|0)+ -12>>2]|0)+8)|0);i=b;return}function Jf(b){b=b|0;var d=0,e=0,f=0,g=0,h=0;d=i;i=i+16|0;e=d;f=c[(c[b>>2]|0)+ -12>>2]|0;if((c[b+(f+24)>>2]|0)==0){i=d;return b|0}a[e]=0;c[e+4>>2]=b;if((c[b+(f+16)>>2]|0)==0){g=c[b+(f+72)>>2]|0;if((g|0)==0){h=f}else{Jf(g)|0;h=c[(c[b>>2]|0)+ -12>>2]|0}a[e]=1;g=c[b+(h+24)>>2]|0;if((qc[c[(c[g>>2]|0)+24>>2]&127](g)|0)==-1){g=c[(c[b>>2]|0)+ -12>>2]|0;Ve(b+g|0,c[b+(g+16)>>2]|1)}}Tf(e);i=d;return b|0}function Kf(a){a=a|0;var b=0;b=i;We(a+4|0);Wm(a);i=b;return}function Lf(a){a=a|0;var b=0;b=i;We(a+4|0);i=b;return}function Mf(a){a=a|0;var b=0,d=0;b=i;d=c[(c[a>>2]|0)+ -12>>2]|0;We(a+(d+4)|0);Wm(a+d|0);i=b;return}function Nf(a){a=a|0;var b=0;b=i;We(a+((c[(c[a>>2]|0)+ -12>>2]|0)+4)|0);i=b;return}function Of(a){a=a|0;var b=0,d=0,e=0;b=i;d=a+4|0;a=c[d>>2]|0;e=c[(c[a>>2]|0)+ -12>>2]|0;if((c[a+(e+24)>>2]|0)==0){i=b;return}if((c[a+(e+16)>>2]|0)!=0){i=b;return}if((c[a+(e+4)>>2]&8192|0)==0){i=b;return}if(Za()|0){i=b;return}e=c[d>>2]|0;a=c[e+((c[(c[e>>2]|0)+ -12>>2]|0)+24)>>2]|0;if(!((qc[c[(c[a>>2]|0)+24>>2]&127](a)|0)==-1)){i=b;return}a=c[d>>2]|0;d=c[(c[a>>2]|0)+ -12>>2]|0;Ve(a+d|0,c[a+(d+16)>>2]|1);i=b;return}function Pf(a){a=a|0;var b=0;b=i;We(a+4|0);Wm(a);i=b;return}function Qf(a){a=a|0;var b=0;b=i;We(a+4|0);i=b;return}function Rf(a){a=a|0;var b=0,d=0;b=i;d=c[(c[a>>2]|0)+ -12>>2]|0;We(a+(d+4)|0);Wm(a+d|0);i=b;return}function Sf(a){a=a|0;var b=0;b=i;We(a+((c[(c[a>>2]|0)+ -12>>2]|0)+4)|0);i=b;return}function Tf(a){a=a|0;var b=0,d=0,e=0;b=i;d=a+4|0;a=c[d>>2]|0;e=c[(c[a>>2]|0)+ -12>>2]|0;if((c[a+(e+24)>>2]|0)==0){i=b;return}if((c[a+(e+16)>>2]|0)!=0){i=b;return}if((c[a+(e+4)>>2]&8192|0)==0){i=b;return}if(Za()|0){i=b;return}e=c[d>>2]|0;a=c[e+((c[(c[e>>2]|0)+ -12>>2]|0)+24)>>2]|0;if(!((qc[c[(c[a>>2]|0)+24>>2]&127](a)|0)==-1)){i=b;return}a=c[d>>2]|0;d=c[(c[a>>2]|0)+ -12>>2]|0;Ve(a+d|0,c[a+(d+16)>>2]|1);i=b;return}function Uf(a){a=a|0;return 4288}function Vf(a,b,c){a=a|0;b=b|0;c=c|0;var d=0;d=i;if((c|0)==1){Be(a,4304,35);i=d;return}else{te(a,b,c);i=d;return}}function Wf(a){a=a|0;return}function Xf(a){a=a|0;var b=0;b=i;xe(a);Wm(a);i=b;return}function Yf(a){a=a|0;var b=0;b=i;xe(a);i=b;return}function Zf(a){a=a|0;var b=0;b=i;We(a);Wm(a);i=b;return}function _f(a){a=a|0;var b=0;b=i;Wm(a);i=b;return}function $f(a){a=a|0;var b=0;b=i;Wm(a);i=b;return}function ag(a){a=a|0;return}function bg(a){a=a|0;return}function cg(b,c,d,e,f){b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0;b=i;a:do{if((e|0)==(f|0)){g=c;h=6}else{j=e;k=c;while(1){if((k|0)==(d|0)){l=-1;break a}m=a[k]|0;n=a[j]|0;if(m<<24>>24<n<<24>>24){l=-1;break a}if(n<<24>>24<m<<24>>24){l=1;break a}m=k+1|0;n=j+1|0;if((n|0)==(f|0)){g=m;h=6;break}else{j=n;k=m}}}}while(0);if((h|0)==6){l=(g|0)!=(d|0)|0}i=b;return l|0}function dg(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;d=i;g=e;h=f-g|0;if(h>>>0>4294967279){ze(b)}if(h>>>0<11){a[b]=h<<1;j=b+1|0}else{k=h+16&-16;l=Um(k)|0;c[b+8>>2]=l;c[b>>2]=k|1;c[b+4>>2]=h;j=l}if((e|0)==(f|0)){m=j;a[m]=0;i=d;return}else{n=e;o=j}while(1){a[o]=a[n]|0;n=n+1|0;if((n|0)==(f|0)){break}else{o=o+1|0}}m=j+(f+(0-g))|0;a[m]=0;i=d;return}function eg(b,c,d){b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0,j=0;b=i;if((c|0)==(d|0)){e=0;i=b;return e|0}else{f=0;g=c}while(1){c=(a[g]|0)+(f<<4)|0;h=c&-268435456;j=(h>>>24|h)^c;c=g+1|0;if((c|0)==(d|0)){e=j;break}else{f=j;g=c}}i=b;return e|0}function fg(a){a=a|0;var b=0;b=i;Wm(a);i=b;return}function gg(a){a=a|0;return}function hg(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0;a=i;a:do{if((e|0)==(f|0)){g=b;h=6}else{j=e;k=b;while(1){if((k|0)==(d|0)){l=-1;break a}m=c[k>>2]|0;n=c[j>>2]|0;if((m|0)<(n|0)){l=-1;break a}if((n|0)<(m|0)){l=1;break a}m=k+4|0;n=j+4|0;if((n|0)==(f|0)){g=m;h=6;break}else{j=n;k=m}}}}while(0);if((h|0)==6){l=(g|0)!=(d|0)|0}i=a;return l|0}function ig(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0;d=i;g=e;h=f-g|0;j=h>>2;if(j>>>0>1073741807){ze(b)}if(j>>>0<2){a[b]=h>>>1;k=b+4|0}else{h=j+4&-4;l=Um(h<<2)|0;c[b+8>>2]=l;c[b>>2]=h|1;c[b+4>>2]=j;k=l}if((e|0)==(f|0)){m=k;c[m>>2]=0;i=d;return}l=f+ -4+(0-g)|0;g=e;e=k;while(1){c[e>>2]=c[g>>2];g=g+4|0;if((g|0)==(f|0)){break}else{e=e+4|0}}m=k+((l>>>2)+1<<2)|0;c[m>>2]=0;i=d;return}function jg(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0;a=i;if((b|0)==(d|0)){e=0;i=a;return e|0}else{f=0;g=b}while(1){b=(c[g>>2]|0)+(f<<4)|0;h=b&-268435456;j=(h>>>24|h)^b;b=g+4|0;if((b|0)==(d|0)){e=j;break}else{f=j;g=b}}i=a;return e|0}function kg(a){a=a|0;var b=0;b=i;Wm(a);i=b;return}function lg(a){a=a|0;return}function mg(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;k=i;i=i+80|0;l=k;m=k+24|0;n=k+28|0;o=k+32|0;p=k+16|0;q=k+12|0;r=k+20|0;s=k+36|0;t=k+40|0;u=k+64|0;if((c[g+4>>2]&1|0)==0){c[n>>2]=-1;v=c[(c[d>>2]|0)+16>>2]|0;c[p>>2]=c[e>>2];c[q>>2]=c[f>>2];c[m+0>>2]=c[p+0>>2];c[l+0>>2]=c[q+0>>2];lc[v&63](o,d,m,l,g,h,n);m=c[o>>2]|0;c[e>>2]=m;o=c[n>>2]|0;if((o|0)==1){a[j]=1}else if((o|0)==0){a[j]=0}else{a[j]=1;c[h>>2]=4}c[b>>2]=m;i=k;return}Xe(r,g);m=c[r>>2]|0;if(!((c[1684]|0)==-1)){c[l>>2]=6736;c[l+4>>2]=117;c[l+8>>2]=0;ye(6736,l,118)}o=(c[6740>>2]|0)+ -1|0;n=c[m+8>>2]|0;if(!((c[m+12>>2]|0)-n>>2>>>0>o>>>0)){w=Ya(4)|0;um(w);zb(w|0,14696,106)}m=c[n+(o<<2)>>2]|0;if((m|0)==0){w=Ya(4)|0;um(w);zb(w|0,14696,106)}ee(c[r>>2]|0)|0;Xe(s,g);g=c[s>>2]|0;if(!((c[1720]|0)==-1)){c[l>>2]=6880;c[l+4>>2]=117;c[l+8>>2]=0;ye(6880,l,118)}r=(c[6884>>2]|0)+ -1|0;w=c[g+8>>2]|0;if(!((c[g+12>>2]|0)-w>>2>>>0>r>>>0)){x=Ya(4)|0;um(x);zb(x|0,14696,106)}g=c[w+(r<<2)>>2]|0;if((g|0)==0){x=Ya(4)|0;um(x);zb(x|0,14696,106)}ee(c[s>>2]|0)|0;oc[c[(c[g>>2]|0)+24>>2]&63](t,g);oc[c[(c[g>>2]|0)+28>>2]&63](t+12|0,g);c[u>>2]=c[f>>2];f=t+24|0;c[l+0>>2]=c[u+0>>2];a[j]=(ng(e,l,t,f,m,h,1)|0)==(t|0)|0;c[b>>2]=c[e>>2];De(t+12|0);De(t);i=k;return}function ng(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0;l=i;i=i+112|0;m=l;n=(g-f|0)/12|0;if(n>>>0>100){o=Pm(n)|0;if((o|0)==0){$m()}else{p=o;q=o}}else{p=0;q=m}m=(f|0)==(g|0);if(m){r=0;s=n}else{o=f;t=0;u=n;n=q;while(1){v=a[o]|0;if((v&1)==0){w=(v&255)>>>1}else{w=c[o+4>>2]|0}if((w|0)==0){a[n]=2;x=t+1|0;y=u+ -1|0}else{a[n]=1;x=t;y=u}v=o+12|0;if((v|0)==(g|0)){r=x;s=y;break}else{o=v;t=x;u=y;n=n+1|0}}}n=0;y=r;r=s;a:while(1){s=c[b>>2]|0;do{if((s|0)!=0){if((c[s+12>>2]|0)==(c[s+16>>2]|0)){if((qc[c[(c[s>>2]|0)+36>>2]&127](s)|0)==-1){c[b>>2]=0;z=0;break}else{z=c[b>>2]|0;break}}else{z=s}}else{z=0}}while(0);s=(z|0)==0;u=c[e>>2]|0;if((u|0)!=0){if((c[u+12>>2]|0)==(c[u+16>>2]|0)?(qc[c[(c[u>>2]|0)+36>>2]&127](u)|0)==-1:0){c[e>>2]=0;A=0}else{A=u}}else{A=0}B=(A|0)==0;C=c[b>>2]|0;if(!((s^B)&(r|0)!=0)){break}s=c[C+12>>2]|0;if((s|0)==(c[C+16>>2]|0)){D=qc[c[(c[C>>2]|0)+36>>2]&127](C)|0}else{D=d[s]|0}s=D&255;if(k){E=s}else{E=zc[c[(c[h>>2]|0)+12>>2]&15](h,s)|0}s=n+1|0;if(m){n=s;continue}b:do{if(k){u=0;x=f;t=y;o=r;w=q;while(1){do{if((a[w]|0)==1){v=a[x]|0;F=(v&1)==0;if(F){G=x+1|0}else{G=c[x+8>>2]|0}if(!(E<<24>>24==(a[G+n|0]|0))){a[w]=0;H=u;I=t;J=o+ -1|0;break}if(F){K=(v&255)>>>1}else{K=c[x+4>>2]|0}if((K|0)==(s|0)){a[w]=2;H=1;I=t+1|0;J=o+ -1|0}else{H=1;I=t;J=o}}else{H=u;I=t;J=o}}while(0);v=x+12|0;if((v|0)==(g|0)){L=H;M=I;N=J;break b}u=H;x=v;t=I;o=J;w=w+1|0}}else{w=0;o=f;t=y;x=r;u=q;while(1){do{if((a[u]|0)==1){if((a[o]&1)==0){O=o+1|0}else{O=c[o+8>>2]|0}if(!(E<<24>>24==(zc[c[(c[h>>2]|0)+12>>2]&15](h,a[O+n|0]|0)|0)<<24>>24)){a[u]=0;P=w;Q=t;R=x+ -1|0;break}v=a[o]|0;if((v&1)==0){S=(v&255)>>>1}else{S=c[o+4>>2]|0}if((S|0)==(s|0)){a[u]=2;P=1;Q=t+1|0;R=x+ -1|0}else{P=1;Q=t;R=x}}else{P=w;Q=t;R=x}}while(0);v=o+12|0;if((v|0)==(g|0)){L=P;M=Q;N=R;break b}w=P;o=v;t=Q;x=R;u=u+1|0}}}while(0);if(!L){n=s;y=M;r=N;continue}u=c[b>>2]|0;x=u+12|0;t=c[x>>2]|0;if((t|0)==(c[u+16>>2]|0)){qc[c[(c[u>>2]|0)+40>>2]&127](u)|0}else{c[x>>2]=t+1}if((N+M|0)>>>0<2){n=s;y=M;r=N;continue}else{T=f;U=M;V=q}while(1){if((a[V]|0)==2){t=a[T]|0;if((t&1)==0){W=(t&255)>>>1}else{W=c[T+4>>2]|0}if((W|0)!=(s|0)){a[V]=0;X=U+ -1|0}else{X=U}}else{X=U}t=T+12|0;if((t|0)==(g|0)){n=s;y=X;r=N;continue a}else{T=t;U=X;V=V+1|0}}}do{if((C|0)!=0){if((c[C+12>>2]|0)==(c[C+16>>2]|0)){if((qc[c[(c[C>>2]|0)+36>>2]&127](C)|0)==-1){c[b>>2]=0;Y=0;break}else{Y=c[b>>2]|0;break}}else{Y=C}}else{Y=0}}while(0);C=(Y|0)==0;do{if(!B){if((c[A+12>>2]|0)!=(c[A+16>>2]|0)){if(C){break}else{Z=80;break}}if(!((qc[c[(c[A>>2]|0)+36>>2]&127](A)|0)==-1)){if(C){break}else{Z=80;break}}else{c[e>>2]=0;Z=78;break}}else{Z=78}}while(0);if((Z|0)==78?C:0){Z=80}if((Z|0)==80){c[j>>2]=c[j>>2]|2}c:do{if(!m){if((a[q]|0)==2){_=f}else{C=f;e=q;while(1){A=C+12|0;B=e+1|0;if((A|0)==(g|0)){Z=85;break c}if((a[B]|0)==2){_=A;break}else{C=A;e=B}}}}else{Z=85}}while(0);if((Z|0)==85){c[j>>2]=c[j>>2]|4;_=g}if((p|0)==0){i=l;return _|0}Qm(p);i=l;return _|0}function og(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;l=b+4|0;m=b;c[l>>2]=c[d>>2];c[m>>2]=c[e>>2];c[k+0>>2]=c[l+0>>2];c[j+0>>2]=c[m+0>>2];pg(a,0,k,j,f,g,h);i=b;return}function pg(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0;e=i;i=i+224|0;l=e+198|0;m=e+196|0;n=e+16|0;o=e+4|0;p=e+192|0;q=e+32|0;r=e;s=e+28|0;t=c[h+4>>2]&74;if((t|0)==0){u=0}else if((t|0)==64){u=8}else if((t|0)==8){u=16}else{u=10}fh(n,h,l,m);c[o+0>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;Fe(o,10,0);if((a[o]&1)==0){h=o+1|0;v=h;w=o+8|0;x=h}else{h=o+8|0;v=o+1|0;w=h;x=c[h>>2]|0}c[p>>2]=x;c[r>>2]=q;c[s>>2]=0;h=o+4|0;t=a[m]|0;m=c[f>>2]|0;y=x;a:while(1){if((m|0)!=0){if((c[m+12>>2]|0)==(c[m+16>>2]|0)?(qc[c[(c[m>>2]|0)+36>>2]&127](m)|0)==-1:0){c[f>>2]=0;z=0}else{z=m}}else{z=0}x=(z|0)==0;A=c[g>>2]|0;do{if((A|0)!=0){if((c[A+12>>2]|0)!=(c[A+16>>2]|0)){if(x){B=A;break}else{C=A;D=y;break a}}if(!((qc[c[(c[A>>2]|0)+36>>2]&127](A)|0)==-1)){if(x){B=A;break}else{C=A;D=y;break a}}else{c[g>>2]=0;E=18;break}}else{E=18}}while(0);if((E|0)==18){E=0;if(x){C=0;D=y;break}else{B=0}}A=a[o]|0;F=(A&1)==0;if(F){G=(A&255)>>>1}else{G=c[h>>2]|0}if(((c[p>>2]|0)-y|0)==(G|0)){if(F){H=(A&255)>>>1;I=(A&255)>>>1}else{A=c[h>>2]|0;H=A;I=A}Fe(o,H<<1,0);if((a[o]&1)==0){J=10}else{J=(c[o>>2]&-2)+ -1|0}Fe(o,J,0);if((a[o]&1)==0){K=v}else{K=c[w>>2]|0}c[p>>2]=K+I;L=K}else{L=y}A=z+12|0;F=c[A>>2]|0;M=z+16|0;if((F|0)==(c[M>>2]|0)){N=qc[c[(c[z>>2]|0)+36>>2]&127](z)|0}else{N=d[F]|0}if((Hg(N&255,u,L,p,s,t,n,q,r,l)|0)!=0){C=B;D=L;break}F=c[A>>2]|0;if((F|0)==(c[M>>2]|0)){qc[c[(c[z>>2]|0)+40>>2]&127](z)|0;m=z;y=L;continue}else{c[A>>2]=F+1;m=z;y=L;continue}}L=a[n]|0;if((L&1)==0){O=(L&255)>>>1}else{O=c[n+4>>2]|0}if((O|0)!=0?(O=c[r>>2]|0,(O-q|0)<160):0){L=c[s>>2]|0;c[r>>2]=O+4;c[O>>2]=L}c[k>>2]=_l(D,c[p>>2]|0,j,u)|0;rj(n,q,c[r>>2]|0,j);if((z|0)!=0){if((c[z+12>>2]|0)==(c[z+16>>2]|0)?(qc[c[(c[z>>2]|0)+36>>2]&127](z)|0)==-1:0){c[f>>2]=0;P=0}else{P=z}}else{P=0}z=(P|0)==0;do{if((C|0)!=0){if((c[C+12>>2]|0)!=(c[C+16>>2]|0)){if(!z){break}c[b>>2]=P;De(o);De(n);i=e;return}if((qc[c[(c[C>>2]|0)+36>>2]&127](C)|0)==-1){c[g>>2]=0;E=54;break}if(z^(C|0)==0){c[b>>2]=P;De(o);De(n);i=e;return}}else{E=54}}while(0);if((E|0)==54?!z:0){c[b>>2]=P;De(o);De(n);i=e;return}c[j>>2]=c[j>>2]|2;c[b>>2]=P;De(o);De(n);i=e;return}function qg(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;l=b+4|0;m=b;c[l>>2]=c[d>>2];c[m>>2]=c[e>>2];c[k+0>>2]=c[l+0>>2];c[j+0>>2]=c[m+0>>2];rg(a,0,k,j,f,g,h);i=b;return}function rg(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0;e=i;i=i+224|0;l=e+198|0;m=e+196|0;n=e+16|0;o=e+4|0;p=e+192|0;q=e+32|0;r=e;s=e+28|0;t=c[h+4>>2]&74;if((t|0)==8){u=16}else if((t|0)==64){u=8}else if((t|0)==0){u=0}else{u=10}fh(n,h,l,m);c[o+0>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;Fe(o,10,0);if((a[o]&1)==0){h=o+1|0;v=h;w=o+8|0;x=h}else{h=o+8|0;v=o+1|0;w=h;x=c[h>>2]|0}c[p>>2]=x;c[r>>2]=q;c[s>>2]=0;h=o+4|0;t=a[m]|0;m=c[f>>2]|0;y=x;a:while(1){if((m|0)!=0){if((c[m+12>>2]|0)==(c[m+16>>2]|0)?(qc[c[(c[m>>2]|0)+36>>2]&127](m)|0)==-1:0){c[f>>2]=0;z=0}else{z=m}}else{z=0}x=(z|0)==0;A=c[g>>2]|0;do{if((A|0)!=0){if((c[A+12>>2]|0)!=(c[A+16>>2]|0)){if(x){B=A;break}else{C=A;D=y;break a}}if(!((qc[c[(c[A>>2]|0)+36>>2]&127](A)|0)==-1)){if(x){B=A;break}else{C=A;D=y;break a}}else{c[g>>2]=0;E=18;break}}else{E=18}}while(0);if((E|0)==18){E=0;if(x){C=0;D=y;break}else{B=0}}A=a[o]|0;F=(A&1)==0;if(F){G=(A&255)>>>1}else{G=c[h>>2]|0}if(((c[p>>2]|0)-y|0)==(G|0)){if(F){H=(A&255)>>>1;J=(A&255)>>>1}else{A=c[h>>2]|0;H=A;J=A}Fe(o,H<<1,0);if((a[o]&1)==0){K=10}else{K=(c[o>>2]&-2)+ -1|0}Fe(o,K,0);if((a[o]&1)==0){L=v}else{L=c[w>>2]|0}c[p>>2]=L+J;M=L}else{M=y}A=z+12|0;F=c[A>>2]|0;N=z+16|0;if((F|0)==(c[N>>2]|0)){O=qc[c[(c[z>>2]|0)+36>>2]&127](z)|0}else{O=d[F]|0}if((Hg(O&255,u,M,p,s,t,n,q,r,l)|0)!=0){C=B;D=M;break}F=c[A>>2]|0;if((F|0)==(c[N>>2]|0)){qc[c[(c[z>>2]|0)+40>>2]&127](z)|0;m=z;y=M;continue}else{c[A>>2]=F+1;m=z;y=M;continue}}M=a[n]|0;if((M&1)==0){P=(M&255)>>>1}else{P=c[n+4>>2]|0}if((P|0)!=0?(P=c[r>>2]|0,(P-q|0)<160):0){M=c[s>>2]|0;c[r>>2]=P+4;c[P>>2]=M}M=Zl(D,c[p>>2]|0,j,u)|0;u=k;c[u>>2]=M;c[u+4>>2]=I;rj(n,q,c[r>>2]|0,j);if((z|0)!=0){if((c[z+12>>2]|0)==(c[z+16>>2]|0)?(qc[c[(c[z>>2]|0)+36>>2]&127](z)|0)==-1:0){c[f>>2]=0;Q=0}else{Q=z}}else{Q=0}z=(Q|0)==0;do{if((C|0)!=0){if((c[C+12>>2]|0)!=(c[C+16>>2]|0)){if(!z){break}c[b>>2]=Q;De(o);De(n);i=e;return}if((qc[c[(c[C>>2]|0)+36>>2]&127](C)|0)==-1){c[g>>2]=0;E=54;break}if(z^(C|0)==0){c[b>>2]=Q;De(o);De(n);i=e;return}}else{E=54}}while(0);if((E|0)==54?!z:0){c[b>>2]=Q;De(o);De(n);i=e;return}c[j>>2]=c[j>>2]|2;c[b>>2]=Q;De(o);De(n);i=e;return}function sg(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;l=b+4|0;m=b;c[l>>2]=c[d>>2];c[m>>2]=c[e>>2];c[k+0>>2]=c[l+0>>2];c[j+0>>2]=c[m+0>>2];tg(a,0,k,j,f,g,h);i=b;return}function tg(e,f,g,h,j,k,l){e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0;f=i;i=i+224|0;m=f+198|0;n=f+196|0;o=f+16|0;p=f+4|0;q=f+192|0;r=f+32|0;s=f;t=f+28|0;u=c[j+4>>2]&74;if((u|0)==8){v=16}else if((u|0)==0){v=0}else if((u|0)==64){v=8}else{v=10}fh(o,j,m,n);c[p+0>>2]=0;c[p+4>>2]=0;c[p+8>>2]=0;Fe(p,10,0);if((a[p]&1)==0){j=p+1|0;w=j;x=p+8|0;y=j}else{j=p+8|0;w=p+1|0;x=j;y=c[j>>2]|0}c[q>>2]=y;c[s>>2]=r;c[t>>2]=0;j=p+4|0;u=a[n]|0;n=c[g>>2]|0;z=y;a:while(1){if((n|0)!=0){if((c[n+12>>2]|0)==(c[n+16>>2]|0)?(qc[c[(c[n>>2]|0)+36>>2]&127](n)|0)==-1:0){c[g>>2]=0;A=0}else{A=n}}else{A=0}y=(A|0)==0;B=c[h>>2]|0;do{if((B|0)!=0){if((c[B+12>>2]|0)!=(c[B+16>>2]|0)){if(y){C=B;break}else{D=B;E=z;break a}}if(!((qc[c[(c[B>>2]|0)+36>>2]&127](B)|0)==-1)){if(y){C=B;break}else{D=B;E=z;break a}}else{c[h>>2]=0;F=18;break}}else{F=18}}while(0);if((F|0)==18){F=0;if(y){D=0;E=z;break}else{C=0}}B=a[p]|0;G=(B&1)==0;if(G){H=(B&255)>>>1}else{H=c[j>>2]|0}if(((c[q>>2]|0)-z|0)==(H|0)){if(G){I=(B&255)>>>1;J=(B&255)>>>1}else{B=c[j>>2]|0;I=B;J=B}Fe(p,I<<1,0);if((a[p]&1)==0){K=10}else{K=(c[p>>2]&-2)+ -1|0}Fe(p,K,0);if((a[p]&1)==0){L=w}else{L=c[x>>2]|0}c[q>>2]=L+J;M=L}else{M=z}B=A+12|0;G=c[B>>2]|0;N=A+16|0;if((G|0)==(c[N>>2]|0)){O=qc[c[(c[A>>2]|0)+36>>2]&127](A)|0}else{O=d[G]|0}if((Hg(O&255,v,M,q,t,u,o,r,s,m)|0)!=0){D=C;E=M;break}G=c[B>>2]|0;if((G|0)==(c[N>>2]|0)){qc[c[(c[A>>2]|0)+40>>2]&127](A)|0;n=A;z=M;continue}else{c[B>>2]=G+1;n=A;z=M;continue}}M=a[o]|0;if((M&1)==0){P=(M&255)>>>1}else{P=c[o+4>>2]|0}if((P|0)!=0?(P=c[s>>2]|0,(P-r|0)<160):0){M=c[t>>2]|0;c[s>>2]=P+4;c[P>>2]=M}b[l>>1]=Yl(E,c[q>>2]|0,k,v)|0;rj(o,r,c[s>>2]|0,k);if((A|0)!=0){if((c[A+12>>2]|0)==(c[A+16>>2]|0)?(qc[c[(c[A>>2]|0)+36>>2]&127](A)|0)==-1:0){c[g>>2]=0;Q=0}else{Q=A}}else{Q=0}A=(Q|0)==0;do{if((D|0)!=0){if((c[D+12>>2]|0)!=(c[D+16>>2]|0)){if(!A){break}c[e>>2]=Q;De(p);De(o);i=f;return}if((qc[c[(c[D>>2]|0)+36>>2]&127](D)|0)==-1){c[h>>2]=0;F=54;break}if(A^(D|0)==0){c[e>>2]=Q;De(p);De(o);i=f;return}}else{F=54}}while(0);if((F|0)==54?!A:0){c[e>>2]=Q;De(p);De(o);i=f;return}c[k>>2]=c[k>>2]|2;c[e>>2]=Q;De(p);De(o);i=f;return}function ug(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;l=b+4|0;m=b;c[l>>2]=c[d>>2];c[m>>2]=c[e>>2];c[k+0>>2]=c[l+0>>2];c[j+0>>2]=c[m+0>>2];vg(a,0,k,j,f,g,h);i=b;return}function vg(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0;e=i;i=i+224|0;l=e+198|0;m=e+196|0;n=e+16|0;o=e+4|0;p=e+192|0;q=e+32|0;r=e;s=e+28|0;t=c[h+4>>2]&74;if((t|0)==64){u=8}else if((t|0)==8){u=16}else if((t|0)==0){u=0}else{u=10}fh(n,h,l,m);c[o+0>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;Fe(o,10,0);if((a[o]&1)==0){h=o+1|0;v=h;w=o+8|0;x=h}else{h=o+8|0;v=o+1|0;w=h;x=c[h>>2]|0}c[p>>2]=x;c[r>>2]=q;c[s>>2]=0;h=o+4|0;t=a[m]|0;m=c[f>>2]|0;y=x;a:while(1){if((m|0)!=0){if((c[m+12>>2]|0)==(c[m+16>>2]|0)?(qc[c[(c[m>>2]|0)+36>>2]&127](m)|0)==-1:0){c[f>>2]=0;z=0}else{z=m}}else{z=0}x=(z|0)==0;A=c[g>>2]|0;do{if((A|0)!=0){if((c[A+12>>2]|0)!=(c[A+16>>2]|0)){if(x){B=A;break}else{C=A;D=y;break a}}if(!((qc[c[(c[A>>2]|0)+36>>2]&127](A)|0)==-1)){if(x){B=A;break}else{C=A;D=y;break a}}else{c[g>>2]=0;E=18;break}}else{E=18}}while(0);if((E|0)==18){E=0;if(x){C=0;D=y;break}else{B=0}}A=a[o]|0;F=(A&1)==0;if(F){G=(A&255)>>>1}else{G=c[h>>2]|0}if(((c[p>>2]|0)-y|0)==(G|0)){if(F){H=(A&255)>>>1;I=(A&255)>>>1}else{A=c[h>>2]|0;H=A;I=A}Fe(o,H<<1,0);if((a[o]&1)==0){J=10}else{J=(c[o>>2]&-2)+ -1|0}Fe(o,J,0);if((a[o]&1)==0){K=v}else{K=c[w>>2]|0}c[p>>2]=K+I;L=K}else{L=y}A=z+12|0;F=c[A>>2]|0;M=z+16|0;if((F|0)==(c[M>>2]|0)){N=qc[c[(c[z>>2]|0)+36>>2]&127](z)|0}else{N=d[F]|0}if((Hg(N&255,u,L,p,s,t,n,q,r,l)|0)!=0){C=B;D=L;break}F=c[A>>2]|0;if((F|0)==(c[M>>2]|0)){qc[c[(c[z>>2]|0)+40>>2]&127](z)|0;m=z;y=L;continue}else{c[A>>2]=F+1;m=z;y=L;continue}}L=a[n]|0;if((L&1)==0){O=(L&255)>>>1}else{O=c[n+4>>2]|0}if((O|0)!=0?(O=c[r>>2]|0,(O-q|0)<160):0){L=c[s>>2]|0;c[r>>2]=O+4;c[O>>2]=L}c[k>>2]=Xl(D,c[p>>2]|0,j,u)|0;rj(n,q,c[r>>2]|0,j);if((z|0)!=0){if((c[z+12>>2]|0)==(c[z+16>>2]|0)?(qc[c[(c[z>>2]|0)+36>>2]&127](z)|0)==-1:0){c[f>>2]=0;P=0}else{P=z}}else{P=0}z=(P|0)==0;do{if((C|0)!=0){if((c[C+12>>2]|0)!=(c[C+16>>2]|0)){if(!z){break}c[b>>2]=P;De(o);De(n);i=e;return}if((qc[c[(c[C>>2]|0)+36>>2]&127](C)|0)==-1){c[g>>2]=0;E=54;break}if(z^(C|0)==0){c[b>>2]=P;De(o);De(n);i=e;return}}else{E=54}}while(0);if((E|0)==54?!z:0){c[b>>2]=P;De(o);De(n);i=e;return}c[j>>2]=c[j>>2]|2;c[b>>2]=P;De(o);De(n);i=e;return}function wg(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;l=b+4|0;m=b;c[l>>2]=c[d>>2];c[m>>2]=c[e>>2];c[k+0>>2]=c[l+0>>2];c[j+0>>2]=c[m+0>>2];xg(a,0,k,j,f,g,h);i=b;return}



function mj(e,f,g,h,j,k,l,m,n,o,p){e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;p=p|0;var q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0,la=0,ma=0,na=0,oa=0,pa=0,qa=0,ra=0,sa=0,ta=0,ua=0,va=0,wa=0,xa=0,ya=0,za=0,Aa=0,Ba=0,Ca=0,Da=0,Ea=0,Fa=0,Ga=0,Ha=0,Ia=0,Ja=0,Ka=0,La=0,Ma=0,Na=0,Oa=0,Pa=0,Qa=0,Ra=0,Sa=0,Ta=0,Ua=0,Va=0,Wa=0,Xa=0,Ya=0,Za=0,_a=0,$a=0,ab=0,bb=0,cb=0,db=0,eb=0,fb=0,gb=0,hb=0,ib=0,jb=0,kb=0,lb=0,mb=0,nb=0,ob=0,pb=0,qb=0,rb=0,sb=0,tb=0,ub=0,vb=0,wb=0,xb=0,yb=0,zb=0,Ab=0,Bb=0,Cb=0,Db=0,Eb=0,Fb=0,Gb=0,Hb=0,Ib=0,Jb=0,Kb=0,Lb=0,Mb=0,Nb=0,Ob=0,Pb=0,Qb=0,Rb=0,Sb=0,Tb=0,Ub=0,Vb=0,Wb=0,Xb=0,Yb=0,Zb=0,_b=0,$b=0,ac=0,bc=0,cc=0,dc=0,ec=0,fc=0,gc=0,hc=0,ic=0,jc=0,kc=0;q=i;i=i+480|0;r=q;s=q+428|0;t=q+472|0;u=q+473|0;v=q+448|0;w=q+460|0;x=q+416|0;y=q+436|0;z=q+400|0;A=q+432|0;B=q+412|0;c[s>>2]=0;c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;c[w+0>>2]=0;c[w+4>>2]=0;c[w+8>>2]=0;c[x+0>>2]=0;c[x+4>>2]=0;c[x+8>>2]=0;c[y+0>>2]=0;c[y+4>>2]=0;c[y+8>>2]=0;c[z+0>>2]=0;c[z+4>>2]=0;c[z+8>>2]=0;qj(g,h,s,t,u,v,w,x,y,A);c[o>>2]=c[n>>2];h=m+8|0;m=y+1|0;g=y+4|0;C=y+8|0;D=x+1|0;E=x+4|0;F=x+8|0;G=(j&512|0)!=0;j=w+1|0;H=w+8|0;I=w+4|0;J=z+1|0;K=z+8|0;L=z+4|0;M=s+3|0;N=n+4|0;O=v+4|0;P=r+400|0;Q=r;R=r;r=p;p=0;S=0;T=119;a:while(1){U=c[e>>2]|0;do{if((U|0)!=0){if((c[U+12>>2]|0)==(c[U+16>>2]|0)){if((qc[c[(c[U>>2]|0)+36>>2]&127](U)|0)==-1){c[e>>2]=0;V=0;break}else{V=c[e>>2]|0;break}}else{V=U}}else{V=0}}while(0);U=(V|0)==0;W=c[f>>2]|0;do{if((W|0)!=0){if((c[W+12>>2]|0)!=(c[W+16>>2]|0)){if(U){X=W;break}else{Y=R;Z=Q;_=S;$=T;aa=269;break a}}if(!((qc[c[(c[W>>2]|0)+36>>2]&127](W)|0)==-1)){if(U){X=W;break}else{Y=R;Z=Q;_=S;$=T;aa=269;break a}}else{c[f>>2]=0;aa=12;break}}else{aa=12}}while(0);if((aa|0)==12){aa=0;if(U){Y=R;Z=Q;_=S;$=T;aa=269;break}else{X=0}}b:do{switch(a[s+p|0]|0){case 1:{if((p|0)==3){Y=R;Z=Q;_=S;$=T;aa=269;break a}W=c[e>>2]|0;ba=c[W+12>>2]|0;if((ba|0)==(c[W+16>>2]|0)){ca=qc[c[(c[W>>2]|0)+36>>2]&127](W)|0}else{ca=d[ba]|0}if(!((ca&255)<<24>>24>-1)){aa=25;break a}if((b[(c[h>>2]|0)+(ca<<24>>24<<1)>>1]&8192)==0){aa=25;break a}ba=c[e>>2]|0;W=ba+12|0;da=c[W>>2]|0;if((da|0)==(c[ba+16>>2]|0)){ea=qc[c[(c[ba>>2]|0)+40>>2]&127](ba)|0}else{c[W>>2]=da+1;ea=d[da]|0}Ie(z,ea&255);aa=26;break};case 0:{aa=26;break};case 3:{da=a[x]|0;W=(da&1)==0;if(W){fa=(da&255)>>>1}else{fa=c[E>>2]|0}ba=a[y]|0;ga=(ba&1)==0;if(ga){ha=(ba&255)>>>1}else{ha=c[g>>2]|0}if((fa|0)==(0-ha|0)){ia=r;ja=R;ka=Q;la=P;ma=S;na=T}else{if(W){oa=(da&255)>>>1}else{oa=c[E>>2]|0}if((oa|0)!=0){if(ga){pa=(ba&255)>>>1}else{pa=c[g>>2]|0}if((pa|0)!=0){ga=c[e>>2]|0;qa=c[ga+12>>2]|0;ra=c[ga+16>>2]|0;if((qa|0)==(ra|0)){sa=qc[c[(c[ga>>2]|0)+36>>2]&127](ga)|0;ta=c[e>>2]|0;ua=sa;va=a[x]|0;wa=ta;xa=c[ta+12>>2]|0;ya=c[ta+16>>2]|0}else{ua=d[qa]|0;va=da;wa=ga;xa=qa;ya=ra}ra=wa+12|0;qa=(xa|0)==(ya|0);if((ua&255)<<24>>24==(a[(va&1)==0?D:c[F>>2]|0]|0)){if(qa){qc[c[(c[wa>>2]|0)+40>>2]&127](wa)|0}else{c[ra>>2]=xa+1}ra=a[x]|0;if((ra&1)==0){za=(ra&255)>>>1}else{za=c[E>>2]|0}ia=r;ja=R;ka=Q;la=P;ma=za>>>0>1?x:S;na=T;break b}if(qa){Aa=qc[c[(c[wa>>2]|0)+36>>2]&127](wa)|0}else{Aa=d[xa]|0}if(!((Aa&255)<<24>>24==(a[(a[y]&1)==0?m:c[C>>2]|0]|0))){aa=112;break a}qa=c[e>>2]|0;ra=qa+12|0;ga=c[ra>>2]|0;if((ga|0)==(c[qa+16>>2]|0)){qc[c[(c[qa>>2]|0)+40>>2]&127](qa)|0}else{c[ra>>2]=ga+1}a[l]=1;ga=a[y]|0;if((ga&1)==0){Ba=(ga&255)>>>1}else{Ba=c[g>>2]|0}ia=r;ja=R;ka=Q;la=P;ma=Ba>>>0>1?y:S;na=T;break b}}if(W){Ca=(da&255)>>>1}else{Ca=c[E>>2]|0}W=c[e>>2]|0;ga=c[W+12>>2]|0;ra=(ga|0)==(c[W+16>>2]|0);if((Ca|0)==0){if(ra){qa=qc[c[(c[W>>2]|0)+36>>2]&127](W)|0;Da=qa;Ea=a[y]|0}else{Da=d[ga]|0;Ea=ba}if(!((Da&255)<<24>>24==(a[(Ea&1)==0?m:c[C>>2]|0]|0))){ia=r;ja=R;ka=Q;la=P;ma=S;na=T;break b}ba=c[e>>2]|0;qa=ba+12|0;ta=c[qa>>2]|0;if((ta|0)==(c[ba+16>>2]|0)){qc[c[(c[ba>>2]|0)+40>>2]&127](ba)|0}else{c[qa>>2]=ta+1}a[l]=1;ta=a[y]|0;if((ta&1)==0){Fa=(ta&255)>>>1}else{Fa=c[g>>2]|0}ia=r;ja=R;ka=Q;la=P;ma=Fa>>>0>1?y:S;na=T;break b}if(ra){ra=qc[c[(c[W>>2]|0)+36>>2]&127](W)|0;Ga=ra;Ha=a[x]|0}else{Ga=d[ga]|0;Ha=da}if(!((Ga&255)<<24>>24==(a[(Ha&1)==0?D:c[F>>2]|0]|0))){a[l]=1;ia=r;ja=R;ka=Q;la=P;ma=S;na=T;break b}da=c[e>>2]|0;ga=da+12|0;ra=c[ga>>2]|0;if((ra|0)==(c[da+16>>2]|0)){qc[c[(c[da>>2]|0)+40>>2]&127](da)|0}else{c[ga>>2]=ra+1}ra=a[x]|0;if((ra&1)==0){Ia=(ra&255)>>>1}else{Ia=c[E>>2]|0}ia=r;ja=R;ka=Q;la=P;ma=Ia>>>0>1?x:S;na=T}break};case 2:{if(!((S|0)!=0|p>>>0<2)){if((p|0)==2){Ja=(a[M]|0)!=0}else{Ja=0}if(!(G|Ja)){ia=r;ja=R;ka=Q;la=P;ma=0;na=T;break b}}ra=a[w]|0;ga=(ra&1)==0;da=ga?j:c[H>>2]|0;c:do{if((p|0)!=0?(d[s+(p+ -1)|0]|0)<2:0){W=da+(ga?(ra&255)>>>1:c[I>>2]|0)|0;ta=da;while(1){if((ta|0)==(W|0)){Ka=W;break}qa=a[ta]|0;if(!(qa<<24>>24>-1)){Ka=ta;break}if((b[(c[h>>2]|0)+(qa<<24>>24<<1)>>1]&8192)==0){Ka=ta;break}else{ta=ta+1|0}}ta=Ka-da|0;W=a[z]|0;qa=(W&1)==0;if(qa){La=(W&255)>>>1}else{La=c[L>>2]|0}if(!(ta>>>0>La>>>0)){if(qa){qa=(W&255)>>>1;Ma=J;Na=qa;Oa=z+(qa-ta)+1|0}else{qa=c[K>>2]|0;W=c[L>>2]|0;Ma=qa;Na=W;Oa=qa+(W-ta)|0}ta=Ma+Na|0;if((Oa|0)==(ta|0)){Pa=X;Qa=ra;Ra=Ka;Sa=X}else{W=Oa;qa=da;while(1){if((a[W]|0)!=(a[qa]|0)){Pa=X;Qa=ra;Ra=da;Sa=X;break c}ba=W+1|0;if((ba|0)==(ta|0)){Pa=X;Qa=ra;Ra=Ka;Sa=X;break}else{W=ba;qa=qa+1|0}}}}else{Pa=X;Qa=ra;Ra=da;Sa=X}}else{Pa=X;Qa=ra;Ra=da;Sa=X}}while(0);d:while(1){if((Qa&1)==0){Ta=j;Ua=(Qa&255)>>>1}else{Ta=c[H>>2]|0;Ua=c[I>>2]|0}if((Ra|0)==(Ta+Ua|0)){break}da=c[e>>2]|0;do{if((da|0)!=0){if((c[da+12>>2]|0)==(c[da+16>>2]|0)){if((qc[c[(c[da>>2]|0)+36>>2]&127](da)|0)==-1){c[e>>2]=0;Va=0;break}else{Va=c[e>>2]|0;break}}else{Va=da}}else{Va=0}}while(0);da=(Va|0)==0;do{if((Sa|0)!=0){if((c[Sa+12>>2]|0)!=(c[Sa+16>>2]|0)){if(da){Wa=Pa;Xa=Sa;break}else{break d}}if(!((qc[c[(c[Sa>>2]|0)+36>>2]&127](Sa)|0)==-1)){if(da^(Pa|0)==0){Wa=Pa;Xa=Pa;break}else{break d}}else{c[f>>2]=0;Ya=0;aa=147;break}}else{Ya=Pa;aa=147}}while(0);if((aa|0)==147){aa=0;if(da){break}else{Wa=Ya;Xa=0}}ra=c[e>>2]|0;ga=c[ra+12>>2]|0;if((ga|0)==(c[ra+16>>2]|0)){Za=qc[c[(c[ra>>2]|0)+36>>2]&127](ra)|0}else{Za=d[ga]|0}if(!((Za&255)<<24>>24==(a[Ra]|0))){break}ga=c[e>>2]|0;ra=ga+12|0;qa=c[ra>>2]|0;if((qa|0)==(c[ga+16>>2]|0)){qc[c[(c[ga>>2]|0)+40>>2]&127](ga)|0}else{c[ra>>2]=qa+1}Pa=Wa;Qa=a[w]|0;Ra=Ra+1|0;Sa=Xa}if(G){qa=a[w]|0;if((qa&1)==0){_a=j;$a=(qa&255)>>>1}else{_a=c[H>>2]|0;$a=c[I>>2]|0}if((Ra|0)!=(_a+$a|0)){aa=162;break a}else{ia=r;ja=R;ka=Q;la=P;ma=S;na=T}}else{ia=r;ja=R;ka=Q;la=P;ma=S;na=T}break};case 4:{qa=r;ra=Q;ga=P;W=R;ta=0;ba=T;e:while(1){sa=c[e>>2]|0;do{if((sa|0)!=0){if((c[sa+12>>2]|0)==(c[sa+16>>2]|0)){if((qc[c[(c[sa>>2]|0)+36>>2]&127](sa)|0)==-1){c[e>>2]=0;ab=0;break}else{ab=c[e>>2]|0;break}}else{ab=sa}}else{ab=0}}while(0);sa=(ab|0)==0;da=c[f>>2]|0;do{if((da|0)!=0){if((c[da+12>>2]|0)!=(c[da+16>>2]|0)){if(sa){break}else{break e}}if(!((qc[c[(c[da>>2]|0)+36>>2]&127](da)|0)==-1)){if(sa){break}else{break e}}else{c[f>>2]=0;aa=173;break}}else{aa=173}}while(0);if((aa|0)==173?(aa=0,sa):0){break}da=c[e>>2]|0;bb=c[da+12>>2]|0;if((bb|0)==(c[da+16>>2]|0)){cb=qc[c[(c[da>>2]|0)+36>>2]&127](da)|0}else{cb=d[bb]|0}bb=cb&255;if(bb<<24>>24>-1?!((b[(c[h>>2]|0)+(cb<<24>>24<<1)>>1]&2048)==0):0){da=c[o>>2]|0;if((da|0)==(qa|0)){db=(c[N>>2]|0)!=119;eb=c[n>>2]|0;fb=qa-eb|0;gb=fb>>>0<2147483647?fb<<1:-1;hb=Rm(db?eb:0,gb)|0;if((hb|0)==0){aa=182;break a}if(!db){db=c[n>>2]|0;c[n>>2]=hb;if((db|0)==0){ib=hb}else{nc[c[N>>2]&255](db);ib=c[n>>2]|0}}else{c[n>>2]=hb;ib=hb}c[N>>2]=120;hb=ib+fb|0;c[o>>2]=hb;jb=hb;kb=(c[n>>2]|0)+gb|0}else{jb=da;kb=qa}c[o>>2]=jb+1;a[jb]=bb;lb=kb;mb=W;nb=ra;ob=ga;pb=ta+1|0;qb=ba}else{da=a[v]|0;if((da&1)==0){rb=(da&255)>>>1}else{rb=c[O>>2]|0}if((rb|0)==0|(ta|0)==0){break}if(!(bb<<24>>24==(a[u]|0))){break}if((ra|0)==(ga|0)){bb=ra-W|0;da=bb>>>0<2147483647?bb<<1:-1;if((ba|0)==119){sb=0}else{sb=W}gb=Rm(sb,da)|0;if((gb|0)==0){aa=198;break a}tb=gb+(bb>>2<<2)|0;ub=gb;vb=gb+(da>>>2<<2)|0;wb=120}else{tb=ra;ub=W;vb=ga;wb=ba}c[tb>>2]=ta;lb=qa;mb=ub;nb=tb+4|0;ob=vb;pb=0;qb=wb}da=c[e>>2]|0;gb=da+12|0;bb=c[gb>>2]|0;if((bb|0)==(c[da+16>>2]|0)){qc[c[(c[da>>2]|0)+40>>2]&127](da)|0;qa=lb;ra=nb;ga=ob;W=mb;ta=pb;ba=qb;continue}else{c[gb>>2]=bb+1;qa=lb;ra=nb;ga=ob;W=mb;ta=pb;ba=qb;continue}}if((W|0)==(ra|0)|(ta|0)==0){xb=W;yb=ra;zb=ga;Ab=ba}else{if((ra|0)==(ga|0)){bb=ra-W|0;gb=bb>>>0<2147483647?bb<<1:-1;if((ba|0)==119){Bb=0}else{Bb=W}da=Rm(Bb,gb)|0;if((da|0)==0){aa=209;break a}Cb=da+(bb>>2<<2)|0;Db=da;Eb=da+(gb>>>2<<2)|0;Fb=120}else{Cb=ra;Db=W;Eb=ga;Fb=ba}c[Cb>>2]=ta;xb=Db;yb=Cb+4|0;zb=Eb;Ab=Fb}gb=c[A>>2]|0;if((gb|0)>0){da=c[e>>2]|0;do{if((da|0)!=0){if((c[da+12>>2]|0)==(c[da+16>>2]|0)){if((qc[c[(c[da>>2]|0)+36>>2]&127](da)|0)==-1){c[e>>2]=0;Gb=0;break}else{Gb=c[e>>2]|0;break}}else{Gb=da}}else{Gb=0}}while(0);da=(Gb|0)==0;ta=c[f>>2]|0;do{if((ta|0)!=0){if((c[ta+12>>2]|0)!=(c[ta+16>>2]|0)){if(da){Hb=ta;break}else{aa=229;break a}}if(!((qc[c[(c[ta>>2]|0)+36>>2]&127](ta)|0)==-1)){if(da){Hb=ta;break}else{aa=229;break a}}else{c[f>>2]=0;aa=223;break}}else{aa=223}}while(0);if((aa|0)==223){aa=0;if(da){aa=229;break a}else{Hb=0}}ta=c[e>>2]|0;ba=c[ta+12>>2]|0;if((ba|0)==(c[ta+16>>2]|0)){Ib=qc[c[(c[ta>>2]|0)+36>>2]&127](ta)|0}else{Ib=d[ba]|0}if(!((Ib&255)<<24>>24==(a[t]|0))){aa=229;break a}ba=c[e>>2]|0;ta=ba+12|0;ga=c[ta>>2]|0;if((ga|0)==(c[ba+16>>2]|0)){qc[c[(c[ba>>2]|0)+40>>2]&127](ba)|0;Jb=Hb;Kb=Hb;Lb=qa;Mb=gb}else{c[ta>>2]=ga+1;Jb=Hb;Kb=Hb;Lb=qa;Mb=gb}while(1){ga=c[e>>2]|0;do{if((ga|0)!=0){if((c[ga+12>>2]|0)==(c[ga+16>>2]|0)){if((qc[c[(c[ga>>2]|0)+36>>2]&127](ga)|0)==-1){c[e>>2]=0;Nb=0;break}else{Nb=c[e>>2]|0;break}}else{Nb=ga}}else{Nb=0}}while(0);ga=(Nb|0)==0;do{if((Kb|0)!=0){if((c[Kb+12>>2]|0)!=(c[Kb+16>>2]|0)){if(ga){Ob=Jb;Pb=Kb;break}else{aa=250;break a}}if(!((qc[c[(c[Kb>>2]|0)+36>>2]&127](Kb)|0)==-1)){if(ga^(Jb|0)==0){Ob=Jb;Pb=Jb;break}else{aa=250;break a}}else{c[f>>2]=0;Qb=0;aa=243;break}}else{Qb=Jb;aa=243}}while(0);if((aa|0)==243){aa=0;if(ga){aa=250;break a}else{Ob=Qb;Pb=0}}sa=c[e>>2]|0;ta=c[sa+12>>2]|0;if((ta|0)==(c[sa+16>>2]|0)){Rb=qc[c[(c[sa>>2]|0)+36>>2]&127](sa)|0}else{Rb=d[ta]|0}if(!((Rb&255)<<24>>24>-1)){aa=250;break a}if((b[(c[h>>2]|0)+(Rb<<24>>24<<1)>>1]&2048)==0){aa=250;break a}ta=c[o>>2]|0;if((ta|0)==(Lb|0)){sa=(c[N>>2]|0)!=119;ba=c[n>>2]|0;W=Lb-ba|0;ra=W>>>0<2147483647?W<<1:-1;bb=Rm(sa?ba:0,ra)|0;if((bb|0)==0){aa=253;break a}if(!sa){sa=c[n>>2]|0;c[n>>2]=bb;if((sa|0)==0){Sb=bb}else{nc[c[N>>2]&255](sa);Sb=c[n>>2]|0}}else{c[n>>2]=bb;Sb=bb}c[N>>2]=120;bb=Sb+W|0;c[o>>2]=bb;Tb=bb;Ub=(c[n>>2]|0)+ra|0}else{Tb=ta;Ub=Lb}ta=c[e>>2]|0;ra=c[ta+12>>2]|0;if((ra|0)==(c[ta+16>>2]|0)){bb=qc[c[(c[ta>>2]|0)+36>>2]&127](ta)|0;Vb=bb;Wb=c[o>>2]|0}else{Vb=d[ra]|0;Wb=Tb}c[o>>2]=Wb+1;a[Wb]=Vb;ra=Mb+ -1|0;c[A>>2]=ra;bb=c[e>>2]|0;ta=bb+12|0;W=c[ta>>2]|0;if((W|0)==(c[bb+16>>2]|0)){qc[c[(c[bb>>2]|0)+40>>2]&127](bb)|0}else{c[ta>>2]=W+1}if((ra|0)>0){Jb=Ob;Kb=Pb;Lb=Ub;Mb=ra}else{Xb=Ub;break}}}else{Xb=qa}if((c[o>>2]|0)==(c[n>>2]|0)){aa=267;break a}else{ia=Xb;ja=xb;ka=yb;la=zb;ma=S;na=Ab}break};default:{ia=r;ja=R;ka=Q;la=P;ma=S;na=T}}}while(0);f:do{if((aa|0)==26){aa=0;if((p|0)==3){Y=R;Z=Q;_=S;$=T;aa=269;break a}else{Yb=X;Zb=X}while(1){U=c[e>>2]|0;do{if((U|0)!=0){if((c[U+12>>2]|0)==(c[U+16>>2]|0)){if((qc[c[(c[U>>2]|0)+36>>2]&127](U)|0)==-1){c[e>>2]=0;_b=0;break}else{_b=c[e>>2]|0;break}}else{_b=U}}else{_b=0}}while(0);U=(_b|0)==0;do{if((Zb|0)!=0){if((c[Zb+12>>2]|0)!=(c[Zb+16>>2]|0)){if(U){$b=Yb;ac=Zb;break}else{ia=r;ja=R;ka=Q;la=P;ma=S;na=T;break f}}if(!((qc[c[(c[Zb>>2]|0)+36>>2]&127](Zb)|0)==-1)){if(U^(Yb|0)==0){$b=Yb;ac=Yb;break}else{ia=r;ja=R;ka=Q;la=P;ma=S;na=T;break f}}else{c[f>>2]=0;bc=0;aa=37;break}}else{bc=Yb;aa=37}}while(0);if((aa|0)==37){aa=0;if(U){ia=r;ja=R;ka=Q;la=P;ma=S;na=T;break f}else{$b=bc;ac=0}}ga=c[e>>2]|0;gb=c[ga+12>>2]|0;if((gb|0)==(c[ga+16>>2]|0)){cc=qc[c[(c[ga>>2]|0)+36>>2]&127](ga)|0}else{cc=d[gb]|0}if(!((cc&255)<<24>>24>-1)){ia=r;ja=R;ka=Q;la=P;ma=S;na=T;break f}if((b[(c[h>>2]|0)+(cc<<24>>24<<1)>>1]&8192)==0){ia=r;ja=R;ka=Q;la=P;ma=S;na=T;break f}gb=c[e>>2]|0;ga=gb+12|0;da=c[ga>>2]|0;if((da|0)==(c[gb+16>>2]|0)){dc=qc[c[(c[gb>>2]|0)+40>>2]&127](gb)|0}else{c[ga>>2]=da+1;dc=d[da]|0}Ie(z,dc&255);Yb=$b;Zb=ac}}}while(0);qa=p+1|0;if(qa>>>0<4){P=la;Q=ka;R=ja;r=ia;p=qa;S=ma;T=na}else{Y=ja;Z=ka;_=ma;$=na;aa=269;break}}g:do{if((aa|0)==25){c[k>>2]=c[k>>2]|4;ec=0;fc=R;gc=T}else if((aa|0)==112){c[k>>2]=c[k>>2]|4;ec=0;fc=R;gc=T}else if((aa|0)==162){c[k>>2]=c[k>>2]|4;ec=0;fc=R;gc=T}else if((aa|0)==182){$m()}else if((aa|0)==198){$m()}else if((aa|0)==209){$m()}else if((aa|0)==229){c[k>>2]=c[k>>2]|4;ec=0;fc=xb;gc=Ab}else if((aa|0)==250){c[k>>2]=c[k>>2]|4;ec=0;fc=xb;gc=Ab}else if((aa|0)==253){$m()}else if((aa|0)==267){c[k>>2]=c[k>>2]|4;ec=0;fc=xb;gc=Ab}else if((aa|0)==269){h:do{if((_|0)!=0){na=_+1|0;ma=_+8|0;ka=_+4|0;ja=1;i:while(1){S=a[_]|0;if((S&1)==0){hc=(S&255)>>>1}else{hc=c[ka>>2]|0}if(!(ja>>>0<hc>>>0)){break h}S=c[e>>2]|0;do{if((S|0)!=0){if((c[S+12>>2]|0)==(c[S+16>>2]|0)){if((qc[c[(c[S>>2]|0)+36>>2]&127](S)|0)==-1){c[e>>2]=0;ic=0;break}else{ic=c[e>>2]|0;break}}else{ic=S}}else{ic=0}}while(0);S=(ic|0)==0;U=c[f>>2]|0;do{if((U|0)!=0){if((c[U+12>>2]|0)!=(c[U+16>>2]|0)){if(S){break}else{break i}}if(!((qc[c[(c[U>>2]|0)+36>>2]&127](U)|0)==-1)){if(S){break}else{break i}}else{c[f>>2]=0;aa=285;break}}else{aa=285}}while(0);if((aa|0)==285?(aa=0,S):0){break}U=c[e>>2]|0;p=c[U+12>>2]|0;if((p|0)==(c[U+16>>2]|0)){jc=qc[c[(c[U>>2]|0)+36>>2]&127](U)|0}else{jc=d[p]|0}if((a[_]&1)==0){kc=na}else{kc=c[ma>>2]|0}if(!((jc&255)<<24>>24==(a[kc+ja|0]|0))){break}p=ja+1|0;U=c[e>>2]|0;ia=U+12|0;r=c[ia>>2]|0;if((r|0)==(c[U+16>>2]|0)){qc[c[(c[U>>2]|0)+40>>2]&127](U)|0;ja=p;continue}else{c[ia>>2]=r+1;ja=p;continue}}c[k>>2]=c[k>>2]|4;ec=0;fc=Y;gc=$;break g}}while(0);if((Y|0)!=(Z|0)){c[B>>2]=0;rj(v,Y,Z,B);if((c[B>>2]|0)==0){ec=1;fc=Y;gc=$}else{c[k>>2]=c[k>>2]|4;ec=0;fc=Y;gc=$}}else{ec=1;fc=Z;gc=$}}}while(0);De(z);De(y);De(x);De(w);De(v);if((fc|0)==0){i=q;return ec|0}nc[gc&255](fc);i=q;return ec|0}function nj(a){a=a|0;var b=0;b=Ya(8)|0;ke(b,a);zb(b|0,3744,16)}function oj(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0;d=i;i=i+144|0;l=d;m=d+36|0;n=d+16|0;o=d+32|0;p=d+28|0;q=d+136|0;r=d+24|0;c[n>>2]=m;s=n+4|0;c[s>>2]=119;t=m+100|0;Xe(p,h);m=c[p>>2]|0;if(!((c[1684]|0)==-1)){c[l>>2]=6736;c[l+4>>2]=117;c[l+8>>2]=0;ye(6736,l,118)}u=(c[6740>>2]|0)+ -1|0;v=c[m+8>>2]|0;if(!((c[m+12>>2]|0)-v>>2>>>0>u>>>0)){w=Ya(4)|0;um(w);zb(w|0,14696,106)}m=c[v+(u<<2)>>2]|0;if((m|0)==0){w=Ya(4)|0;um(w);zb(w|0,14696,106)}a[q]=0;w=c[f>>2]|0;c[r>>2]=w;u=c[h+4>>2]|0;c[l+0>>2]=c[r+0>>2];if(mj(e,l,g,p,u,j,q,m,n,o,t)|0){if((a[k]&1)==0){a[k+1|0]=0;a[k]=0}else{a[c[k+8>>2]|0]=0;c[k+4>>2]=0}if((a[q]|0)!=0){Ie(k,zc[c[(c[m>>2]|0)+28>>2]&15](m,45)|0)}q=zc[c[(c[m>>2]|0)+28>>2]&15](m,48)|0;m=c[n>>2]|0;t=c[o>>2]|0;o=t+ -1|0;a:do{if(m>>>0<o>>>0){u=m;while(1){g=u+1|0;if(!((a[u]|0)==q<<24>>24)){x=u;break a}if(g>>>0<o>>>0){u=g}else{x=g;break}}}else{x=m}}while(0);pj(k,x,t)|0}t=c[e>>2]|0;if((t|0)!=0){if((c[t+12>>2]|0)==(c[t+16>>2]|0)?(qc[c[(c[t>>2]|0)+36>>2]&127](t)|0)==-1:0){c[e>>2]=0;y=0}else{y=t}}else{y=0}t=(y|0)==0;do{if((w|0)!=0){if((c[w+12>>2]|0)!=(c[w+16>>2]|0)){if(t){break}else{z=27;break}}if(!((qc[c[(c[w>>2]|0)+36>>2]&127](w)|0)==-1)){if(t^(w|0)==0){break}else{z=27;break}}else{c[f>>2]=0;z=25;break}}else{z=25}}while(0);if((z|0)==25?t:0){z=27}if((z|0)==27){c[j>>2]=c[j>>2]|2}c[b>>2]=y;ee(c[p>>2]|0)|0;p=c[n>>2]|0;c[n>>2]=0;if((p|0)==0){i=d;return}nc[c[s>>2]&255](p);i=d;return}function pj(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0;f=i;g=d;h=a[b]|0;if((h&1)==0){j=10;k=(h&255)>>>1;l=h}else{h=c[b>>2]|0;j=(h&-2)+ -1|0;k=c[b+4>>2]|0;l=h&255}h=e-g|0;if((e|0)==(d|0)){i=f;return b|0}if((j-k|0)>>>0<h>>>0){Le(b,j,k+h-j|0,k,k,0,0);m=a[b]|0}else{m=l}if((m&1)==0){n=b+1|0}else{n=c[b+8>>2]|0}m=e+(k-g)|0;g=d;d=n+k|0;while(1){a[d]=a[g]|0;g=g+1|0;if((g|0)==(e|0)){break}else{d=d+1|0}}a[n+m|0]=0;m=k+h|0;if((a[b]&1)==0){a[b]=m<<1;i=f;return b|0}else{c[b+4>>2]=m;i=f;return b|0}return 0}function qj(b,d,e,f,g,h,j,k,l,m){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;n=i;i=i+128|0;o=n;p=n+24|0;q=n+44|0;r=n+32|0;s=n+56|0;t=n+12|0;u=n+28|0;v=n+68|0;w=n+80|0;x=n+92|0;y=n+104|0;if(b){b=c[d>>2]|0;if(!((c[1544]|0)==-1)){c[o>>2]=6176;c[o+4>>2]=117;c[o+8>>2]=0;ye(6176,o,118)}z=(c[6180>>2]|0)+ -1|0;A=c[b+8>>2]|0;if(!((c[b+12>>2]|0)-A>>2>>>0>z>>>0)){B=Ya(4)|0;um(B);zb(B|0,14696,106)}b=c[A+(z<<2)>>2]|0;if((b|0)==0){B=Ya(4)|0;um(B);zb(B|0,14696,106)}oc[c[(c[b>>2]|0)+44>>2]&63](p,b);B=c[p>>2]|0;a[e]=B;a[e+1|0]=B>>8;a[e+2|0]=B>>16;a[e+3|0]=B>>24;oc[c[(c[b>>2]|0)+32>>2]&63](q,b);if((a[l]&1)==0){a[l+1|0]=0;a[l]=0}else{a[c[l+8>>2]|0]=0;c[l+4>>2]=0}He(l,0);c[l+0>>2]=c[q+0>>2];c[l+4>>2]=c[q+4>>2];c[l+8>>2]=c[q+8>>2];c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;De(q);oc[c[(c[b>>2]|0)+28>>2]&63](r,b);if((a[k]&1)==0){a[k+1|0]=0;a[k]=0}else{a[c[k+8>>2]|0]=0;c[k+4>>2]=0}He(k,0);c[k+0>>2]=c[r+0>>2];c[k+4>>2]=c[r+4>>2];c[k+8>>2]=c[r+8>>2];c[r+0>>2]=0;c[r+4>>2]=0;c[r+8>>2]=0;De(r);a[f]=qc[c[(c[b>>2]|0)+12>>2]&127](b)|0;a[g]=qc[c[(c[b>>2]|0)+16>>2]&127](b)|0;oc[c[(c[b>>2]|0)+20>>2]&63](s,b);if((a[h]&1)==0){a[h+1|0]=0;a[h]=0}else{a[c[h+8>>2]|0]=0;c[h+4>>2]=0}He(h,0);c[h+0>>2]=c[s+0>>2];c[h+4>>2]=c[s+4>>2];c[h+8>>2]=c[s+8>>2];c[s+0>>2]=0;c[s+4>>2]=0;c[s+8>>2]=0;De(s);oc[c[(c[b>>2]|0)+24>>2]&63](t,b);if((a[j]&1)==0){a[j+1|0]=0;a[j]=0}else{a[c[j+8>>2]|0]=0;c[j+4>>2]=0}He(j,0);c[j+0>>2]=c[t+0>>2];c[j+4>>2]=c[t+4>>2];c[j+8>>2]=c[t+8>>2];c[t+0>>2]=0;c[t+4>>2]=0;c[t+8>>2]=0;De(t);C=qc[c[(c[b>>2]|0)+36>>2]&127](b)|0;c[m>>2]=C;i=n;return}else{b=c[d>>2]|0;if(!((c[1528]|0)==-1)){c[o>>2]=6112;c[o+4>>2]=117;c[o+8>>2]=0;ye(6112,o,118)}o=(c[6116>>2]|0)+ -1|0;d=c[b+8>>2]|0;if(!((c[b+12>>2]|0)-d>>2>>>0>o>>>0)){D=Ya(4)|0;um(D);zb(D|0,14696,106)}b=c[d+(o<<2)>>2]|0;if((b|0)==0){D=Ya(4)|0;um(D);zb(D|0,14696,106)}oc[c[(c[b>>2]|0)+44>>2]&63](u,b);D=c[u>>2]|0;a[e]=D;a[e+1|0]=D>>8;a[e+2|0]=D>>16;a[e+3|0]=D>>24;oc[c[(c[b>>2]|0)+32>>2]&63](v,b);if((a[l]&1)==0){a[l+1|0]=0;a[l]=0}else{a[c[l+8>>2]|0]=0;c[l+4>>2]=0}He(l,0);c[l+0>>2]=c[v+0>>2];c[l+4>>2]=c[v+4>>2];c[l+8>>2]=c[v+8>>2];c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;De(v);oc[c[(c[b>>2]|0)+28>>2]&63](w,b);if((a[k]&1)==0){a[k+1|0]=0;a[k]=0}else{a[c[k+8>>2]|0]=0;c[k+4>>2]=0}He(k,0);c[k+0>>2]=c[w+0>>2];c[k+4>>2]=c[w+4>>2];c[k+8>>2]=c[w+8>>2];c[w+0>>2]=0;c[w+4>>2]=0;c[w+8>>2]=0;De(w);a[f]=qc[c[(c[b>>2]|0)+12>>2]&127](b)|0;a[g]=qc[c[(c[b>>2]|0)+16>>2]&127](b)|0;oc[c[(c[b>>2]|0)+20>>2]&63](x,b);if((a[h]&1)==0){a[h+1|0]=0;a[h]=0}else{a[c[h+8>>2]|0]=0;c[h+4>>2]=0}He(h,0);c[h+0>>2]=c[x+0>>2];c[h+4>>2]=c[x+4>>2];c[h+8>>2]=c[x+8>>2];c[x+0>>2]=0;c[x+4>>2]=0;c[x+8>>2]=0;De(x);oc[c[(c[b>>2]|0)+24>>2]&63](y,b);if((a[j]&1)==0){a[j+1|0]=0;a[j]=0}else{a[c[j+8>>2]|0]=0;c[j+4>>2]=0}He(j,0);c[j+0>>2]=c[y+0>>2];c[j+4>>2]=c[y+4>>2];c[j+8>>2]=c[y+8>>2];c[y+0>>2]=0;c[y+4>>2]=0;c[y+8>>2]=0;De(y);C=qc[c[(c[b>>2]|0)+36>>2]&127](b)|0;c[m>>2]=C;i=n;return}}function rj(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;g=i;h=a[b]|0;if((h&1)==0){j=(h&255)>>>1}else{j=c[b+4>>2]|0}if((j|0)==0){i=g;return}if((d|0)!=(e|0)?(j=e+ -4|0,j>>>0>d>>>0):0){k=d;l=j;do{j=c[k>>2]|0;c[k>>2]=c[l>>2];c[l>>2]=j;k=k+4|0;l=l+ -4|0}while(k>>>0<l>>>0);m=a[b]|0}else{m=h}if((m&1)==0){n=b+1|0;o=(m&255)>>>1}else{n=c[b+8>>2]|0;o=c[b+4>>2]|0}b=e+ -4|0;e=a[n]|0;m=e<<24>>24<1|e<<24>>24==127;a:do{if(b>>>0>d>>>0){h=n+o|0;l=e;k=n;j=d;p=m;while(1){if(!p?(l<<24>>24|0)!=(c[j>>2]|0):0){break}q=(h-k|0)>1?k+1|0:k;r=j+4|0;s=a[q]|0;t=s<<24>>24<1|s<<24>>24==127;if(r>>>0<b>>>0){l=s;k=q;j=r;p=t}else{u=s;v=t;break a}}c[f>>2]=4;i=g;return}else{u=e;v=m}}while(0);if(v){i=g;return}v=c[b>>2]|0;if(!(u<<24>>24>>>0<v>>>0|(v|0)==0)){i=g;return}c[f>>2]=4;i=g;return}function sj(a){a=a|0;var b=0;b=i;Wm(a);i=b;return}function tj(a){a=a|0;return}function uj(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0;d=i;i=i+592|0;l=d;m=d+72|0;n=d+64|0;o=d+56|0;p=d+476|0;q=d+580|0;r=d+472|0;s=d+16|0;t=d+480|0;c[n>>2]=m;u=n+4|0;c[u>>2]=119;v=m+400|0;Xe(p,h);m=c[p>>2]|0;if(!((c[1682]|0)==-1)){c[l>>2]=6728;c[l+4>>2]=117;c[l+8>>2]=0;ye(6728,l,118)}w=(c[6732>>2]|0)+ -1|0;x=c[m+8>>2]|0;if(!((c[m+12>>2]|0)-x>>2>>>0>w>>>0)){y=Ya(4)|0;um(y);zb(y|0,14696,106)}m=c[x+(w<<2)>>2]|0;if((m|0)==0){y=Ya(4)|0;um(y);zb(y|0,14696,106)}a[q]=0;c[r>>2]=c[f>>2];y=c[h+4>>2]|0;c[l+0>>2]=c[r+0>>2];if(vj(e,l,g,p,y,j,q,m,n,o,v)|0){wc[c[(c[m>>2]|0)+48>>2]&7](m,6432,6442|0,s)|0;m=c[o>>2]|0;v=c[n>>2]|0;y=m-v|0;if((y|0)>392){g=Pm((y>>2)+2|0)|0;if((g|0)==0){$m()}else{z=g;A=g}}else{z=0;A=t}if((a[q]|0)==0){B=A}else{a[A]=45;B=A+1|0}if(v>>>0<m>>>0){m=s+40|0;A=s;q=B;g=v;while(1){v=c[g>>2]|0;y=s;while(1){r=y+4|0;if((c[y>>2]|0)==(v|0)){C=y;break}if((r|0)==(m|0)){C=m;break}else{y=r}}a[q]=a[6432+(C-A>>2)|0]|0;y=g+4|0;v=q+1|0;if(y>>>0<(c[o>>2]|0)>>>0){q=v;g=y}else{D=v;break}}}else{D=B}a[D]=0;c[l>>2]=k;if((ib(t|0,6368,l|0)|0)!=1){l=Ya(8)|0;ke(l,6376);zb(l|0,3744,16)}if((z|0)!=0){Qm(z)}}z=c[e>>2]|0;do{if((z|0)!=0){l=c[z+12>>2]|0;if((l|0)==(c[z+16>>2]|0)){E=qc[c[(c[z>>2]|0)+36>>2]&127](z)|0}else{E=c[l>>2]|0}if((E|0)==-1){c[e>>2]=0;F=1;break}else{F=(c[e>>2]|0)==0;break}}else{F=1}}while(0);E=c[f>>2]|0;do{if((E|0)!=0){z=c[E+12>>2]|0;if((z|0)==(c[E+16>>2]|0)){G=qc[c[(c[E>>2]|0)+36>>2]&127](E)|0}else{G=c[z>>2]|0}if(!((G|0)==-1)){if(F){break}else{H=37;break}}else{c[f>>2]=0;H=35;break}}else{H=35}}while(0);if((H|0)==35?F:0){H=37}if((H|0)==37){c[j>>2]=c[j>>2]|2}c[b>>2]=c[e>>2];ee(c[p>>2]|0)|0;p=c[n>>2]|0;c[n>>2]=0;if((p|0)==0){i=d;return}nc[c[u>>2]&255](p);i=d;return}function vj(b,e,f,g,h,j,k,l,m,n,o){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;var p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0,la=0,ma=0,na=0,oa=0,pa=0,qa=0,ra=0,sa=0,ta=0,ua=0,va=0,wa=0,xa=0,ya=0,za=0,Aa=0,Ba=0,Ca=0,Da=0,Ea=0,Fa=0,Ga=0,Ha=0,Ia=0,Ja=0,Ka=0,La=0,Ma=0,Na=0,Oa=0,Pa=0,Qa=0,Ra=0,Sa=0,Ta=0,Ua=0,Va=0,Wa=0,Xa=0,Ya=0,Za=0,_a=0,$a=0,ab=0,bb=0,cb=0,db=0,eb=0,fb=0,gb=0,hb=0,ib=0,jb=0,kb=0,lb=0,mb=0,nb=0,ob=0,pb=0,qb=0,rb=0,sb=0,tb=0,ub=0,vb=0,wb=0,xb=0,yb=0,zb=0,Ab=0,Bb=0,Cb=0,Db=0,Eb=0,Fb=0,Gb=0,Hb=0,Ib=0,Jb=0,Kb=0,Lb=0,Mb=0,Nb=0,Ob=0,Pb=0,Qb=0,Rb=0,Sb=0,Tb=0,Ub=0,Vb=0,Wb=0,Xb=0,Yb=0,Zb=0,_b=0,$b=0,ac=0,bc=0,cc=0,dc=0,ec=0,fc=0,gc=0,hc=0,jc=0,kc=0,lc=0,mc=0,oc=0,pc=0,rc=0,sc=0,tc=0,uc=0,vc=0,wc=0;p=i;i=i+496|0;q=p+72|0;r=p+24|0;s=p;t=p+52|0;u=p+56|0;v=p+472|0;w=p+12|0;x=p+40|0;y=p+28|0;z=p+8|0;A=p+4|0;c[r>>2]=0;c[u+0>>2]=0;c[u+4>>2]=0;c[u+8>>2]=0;c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;c[w+0>>2]=0;c[w+4>>2]=0;c[w+8>>2]=0;c[x+0>>2]=0;c[x+4>>2]=0;c[x+8>>2]=0;c[y+0>>2]=0;c[y+4>>2]=0;c[y+8>>2]=0;yj(f,g,r,s,t,u,v,w,x,z);c[n>>2]=c[m>>2];g=x+4|0;f=x+8|0;B=w+4|0;C=w+8|0;D=(h&512|0)!=0;h=v+4|0;E=v+8|0;F=y+4|0;G=y+8|0;H=r+3|0;I=m+4|0;J=u+4|0;K=q+400|0;L=q;M=q;q=o;o=0;N=0;O=119;a:while(1){P=c[b>>2]|0;do{if((P|0)!=0){Q=c[P+12>>2]|0;if((Q|0)==(c[P+16>>2]|0)){R=qc[c[(c[P>>2]|0)+36>>2]&127](P)|0}else{R=c[Q>>2]|0}if((R|0)==-1){c[b>>2]=0;S=1;break}else{S=(c[b>>2]|0)==0;break}}else{S=1}}while(0);P=c[e>>2]|0;do{if((P|0)!=0){Q=c[P+12>>2]|0;if((Q|0)==(c[P+16>>2]|0)){T=qc[c[(c[P>>2]|0)+36>>2]&127](P)|0}else{T=c[Q>>2]|0}if(!((T|0)==-1)){if(S){U=P;break}else{V=M;W=L;X=N;Y=O;Z=292;break a}}else{c[e>>2]=0;Z=15;break}}else{Z=15}}while(0);if((Z|0)==15){Z=0;if(S){V=M;W=L;X=N;Y=O;Z=292;break}else{U=0}}b:do{switch(a[r+o|0]|0){case 1:{if((o|0)==3){V=M;W=L;X=N;Y=O;Z=292;break a}P=c[b>>2]|0;Q=c[P+12>>2]|0;if((Q|0)==(c[P+16>>2]|0)){_=qc[c[(c[P>>2]|0)+36>>2]&127](P)|0}else{_=c[Q>>2]|0}if(!(ic[c[(c[l>>2]|0)+12>>2]&31](l,8192,_)|0)){Z=27;break a}Q=c[b>>2]|0;P=Q+12|0;$=c[P>>2]|0;if(($|0)==(c[Q+16>>2]|0)){aa=qc[c[(c[Q>>2]|0)+40>>2]&127](Q)|0}else{c[P>>2]=$+4;aa=c[$>>2]|0}Se(y,aa);Z=28;break};case 0:{Z=28;break};case 3:{$=a[w]|0;P=($&1)==0;if(P){ba=($&255)>>>1}else{ba=c[B>>2]|0}Q=a[x]|0;ca=(Q&1)==0;if(ca){da=(Q&255)>>>1}else{da=c[g>>2]|0}if((ba|0)==(0-da|0)){ea=q;fa=M;ga=L;ha=K;ia=N;ja=O}else{if(P){ka=($&255)>>>1}else{ka=c[B>>2]|0}if((ka|0)!=0){if(ca){la=(Q&255)>>>1}else{la=c[g>>2]|0}if((la|0)!=0){ca=c[b>>2]|0;ma=c[ca+12>>2]|0;if((ma|0)==(c[ca+16>>2]|0)){na=qc[c[(c[ca>>2]|0)+36>>2]&127](ca)|0;oa=na;pa=a[w]|0}else{oa=c[ma>>2]|0;pa=$}ma=c[b>>2]|0;na=ma+12|0;ca=c[na>>2]|0;qa=(ca|0)==(c[ma+16>>2]|0);if((oa|0)==(c[((pa&1)==0?B:c[C>>2]|0)>>2]|0)){if(qa){qc[c[(c[ma>>2]|0)+40>>2]&127](ma)|0}else{c[na>>2]=ca+4}na=a[w]|0;if((na&1)==0){ra=(na&255)>>>1}else{ra=c[B>>2]|0}ea=q;fa=M;ga=L;ha=K;ia=ra>>>0>1?w:N;ja=O;break b}if(qa){sa=qc[c[(c[ma>>2]|0)+36>>2]&127](ma)|0}else{sa=c[ca>>2]|0}if((sa|0)!=(c[((a[x]&1)==0?g:c[f>>2]|0)>>2]|0)){Z=116;break a}ca=c[b>>2]|0;ma=ca+12|0;qa=c[ma>>2]|0;if((qa|0)==(c[ca+16>>2]|0)){qc[c[(c[ca>>2]|0)+40>>2]&127](ca)|0}else{c[ma>>2]=qa+4}a[k]=1;qa=a[x]|0;if((qa&1)==0){ta=(qa&255)>>>1}else{ta=c[g>>2]|0}ea=q;fa=M;ga=L;ha=K;ia=ta>>>0>1?x:N;ja=O;break b}}if(P){ua=($&255)>>>1}else{ua=c[B>>2]|0}P=c[b>>2]|0;qa=c[P+12>>2]|0;ma=(qa|0)==(c[P+16>>2]|0);if((ua|0)==0){if(ma){ca=qc[c[(c[P>>2]|0)+36>>2]&127](P)|0;va=ca;wa=a[x]|0}else{va=c[qa>>2]|0;wa=Q}if((va|0)!=(c[((wa&1)==0?g:c[f>>2]|0)>>2]|0)){ea=q;fa=M;ga=L;ha=K;ia=N;ja=O;break b}Q=c[b>>2]|0;ca=Q+12|0;na=c[ca>>2]|0;if((na|0)==(c[Q+16>>2]|0)){qc[c[(c[Q>>2]|0)+40>>2]&127](Q)|0}else{c[ca>>2]=na+4}a[k]=1;na=a[x]|0;if((na&1)==0){xa=(na&255)>>>1}else{xa=c[g>>2]|0}ea=q;fa=M;ga=L;ha=K;ia=xa>>>0>1?x:N;ja=O;break b}if(ma){ma=qc[c[(c[P>>2]|0)+36>>2]&127](P)|0;ya=ma;za=a[w]|0}else{ya=c[qa>>2]|0;za=$}if((ya|0)!=(c[((za&1)==0?B:c[C>>2]|0)>>2]|0)){a[k]=1;ea=q;fa=M;ga=L;ha=K;ia=N;ja=O;break b}$=c[b>>2]|0;qa=$+12|0;ma=c[qa>>2]|0;if((ma|0)==(c[$+16>>2]|0)){qc[c[(c[$>>2]|0)+40>>2]&127]($)|0}else{c[qa>>2]=ma+4}ma=a[w]|0;if((ma&1)==0){Aa=(ma&255)>>>1}else{Aa=c[B>>2]|0}ea=q;fa=M;ga=L;ha=K;ia=Aa>>>0>1?w:N;ja=O}break};case 2:{if(!((N|0)!=0|o>>>0<2)){if((o|0)==2){Ba=(a[H]|0)!=0}else{Ba=0}if(!(D|Ba)){ea=q;fa=M;ga=L;ha=K;ia=0;ja=O;break b}}ma=a[v]|0;qa=(ma&1)==0?h:c[E>>2]|0;c:do{if((o|0)!=0?(d[r+(o+ -1)|0]|0)<2:0){$=ma;P=qa;while(1){if(($&1)==0){Ca=h;Da=($&255)>>>1}else{Ca=c[E>>2]|0;Da=c[h>>2]|0}if((P|0)==(Ca+(Da<<2)|0)){Ea=$;break}if(!(ic[c[(c[l>>2]|0)+12>>2]&31](l,8192,c[P>>2]|0)|0)){Z=129;break}$=a[v]|0;P=P+4|0}if((Z|0)==129){Z=0;Ea=a[v]|0}$=(Ea&1)==0;na=P-($?h:c[E>>2]|0)>>2;ca=a[y]|0;Q=(ca&1)==0;if(Q){Fa=(ca&255)>>>1}else{Fa=c[F>>2]|0}d:do{if(!(na>>>0>Fa>>>0)){if(Q){Ga=F;Ha=(ca&255)>>>1;Ia=F+(((ca&255)>>>1)-na<<2)|0}else{Ja=c[G>>2]|0;Ka=c[F>>2]|0;Ga=Ja;Ha=Ka;Ia=Ja+(Ka-na<<2)|0}Ka=Ga+(Ha<<2)|0;if((Ia|0)==(Ka|0)){La=U;Ma=Ea;Na=P;Oa=U;break c}else{Pa=Ia;Qa=$?h:c[E>>2]|0}while(1){if((c[Pa>>2]|0)!=(c[Qa>>2]|0)){break d}Ja=Pa+4|0;if((Ja|0)==(Ka|0)){La=U;Ma=Ea;Na=P;Oa=U;break c}Pa=Ja;Qa=Qa+4|0}}}while(0);La=U;Ma=Ea;Na=$?h:c[E>>2]|0;Oa=U}else{La=U;Ma=ma;Na=qa;Oa=U}}while(0);e:while(1){if((Ma&1)==0){Ra=h;Sa=(Ma&255)>>>1}else{Ra=c[E>>2]|0;Sa=c[h>>2]|0}if((Na|0)==(Ra+(Sa<<2)|0)){break}qa=c[b>>2]|0;do{if((qa|0)!=0){ma=c[qa+12>>2]|0;if((ma|0)==(c[qa+16>>2]|0)){Ta=qc[c[(c[qa>>2]|0)+36>>2]&127](qa)|0}else{Ta=c[ma>>2]|0}if((Ta|0)==-1){c[b>>2]=0;Ua=1;break}else{Ua=(c[b>>2]|0)==0;break}}else{Ua=1}}while(0);do{if((Oa|0)!=0){qa=c[Oa+12>>2]|0;if((qa|0)==(c[Oa+16>>2]|0)){Va=qc[c[(c[Oa>>2]|0)+36>>2]&127](Oa)|0}else{Va=c[qa>>2]|0}if(!((Va|0)==-1)){if(Ua^(La|0)==0){Wa=La;Xa=La;break}else{break e}}else{c[e>>2]=0;Ya=0;Z=159;break}}else{Ya=La;Z=159}}while(0);if((Z|0)==159){Z=0;if(Ua){break}else{Wa=Ya;Xa=0}}qa=c[b>>2]|0;$=c[qa+12>>2]|0;if(($|0)==(c[qa+16>>2]|0)){Za=qc[c[(c[qa>>2]|0)+36>>2]&127](qa)|0}else{Za=c[$>>2]|0}if((Za|0)!=(c[Na>>2]|0)){break}$=c[b>>2]|0;qa=$+12|0;ma=c[qa>>2]|0;if((ma|0)==(c[$+16>>2]|0)){qc[c[(c[$>>2]|0)+40>>2]&127]($)|0}else{c[qa>>2]=ma+4}La=Wa;Ma=a[v]|0;Na=Na+4|0;Oa=Xa}if(D){ma=a[v]|0;if((ma&1)==0){_a=h;$a=(ma&255)>>>1}else{_a=c[E>>2]|0;$a=c[h>>2]|0}if((Na|0)!=(_a+($a<<2)|0)){Z=174;break a}else{ea=q;fa=M;ga=L;ha=K;ia=N;ja=O}}else{ea=q;fa=M;ga=L;ha=K;ia=N;ja=O}break};case 4:{ma=q;qa=L;$=K;P=M;na=0;ca=O;f:while(1){Q=c[b>>2]|0;do{if((Q|0)!=0){Ka=c[Q+12>>2]|0;if((Ka|0)==(c[Q+16>>2]|0)){ab=qc[c[(c[Q>>2]|0)+36>>2]&127](Q)|0}else{ab=c[Ka>>2]|0}if((ab|0)==-1){c[b>>2]=0;bb=1;break}else{bb=(c[b>>2]|0)==0;break}}else{bb=1}}while(0);Q=c[e>>2]|0;do{if((Q|0)!=0){Ka=c[Q+12>>2]|0;if((Ka|0)==(c[Q+16>>2]|0)){cb=qc[c[(c[Q>>2]|0)+36>>2]&127](Q)|0}else{cb=c[Ka>>2]|0}if(!((cb|0)==-1)){if(bb){break}else{break f}}else{c[e>>2]=0;Z=188;break}}else{Z=188}}while(0);if((Z|0)==188?(Z=0,bb):0){break}Q=c[b>>2]|0;Ka=c[Q+12>>2]|0;if((Ka|0)==(c[Q+16>>2]|0)){db=qc[c[(c[Q>>2]|0)+36>>2]&127](Q)|0}else{db=c[Ka>>2]|0}if(ic[c[(c[l>>2]|0)+12>>2]&31](l,2048,db)|0){Ka=c[n>>2]|0;if((Ka|0)==(ma|0)){Q=(c[I>>2]|0)!=119;Ja=c[m>>2]|0;eb=ma-Ja|0;fb=eb>>>0<2147483647?eb<<1:-1;gb=eb>>2;if(Q){hb=Ja}else{hb=0}Ja=Rm(hb,fb)|0;if((Ja|0)==0){Z=198;break a}if(!Q){Q=c[m>>2]|0;c[m>>2]=Ja;if((Q|0)==0){ib=Ja}else{nc[c[I>>2]&255](Q);ib=c[m>>2]|0}}else{c[m>>2]=Ja;ib=Ja}c[I>>2]=120;Ja=ib+(gb<<2)|0;c[n>>2]=Ja;jb=Ja;kb=(c[m>>2]|0)+(fb>>>2<<2)|0}else{jb=Ka;kb=ma}c[n>>2]=jb+4;c[jb>>2]=db;lb=kb;mb=P;nb=qa;ob=$;pb=na+1|0;qb=ca}else{Ka=a[u]|0;if((Ka&1)==0){rb=(Ka&255)>>>1}else{rb=c[J>>2]|0}if((rb|0)==0|(na|0)==0){break}if((db|0)!=(c[t>>2]|0)){break}if((qa|0)==($|0)){Ka=qa-P|0;fb=Ka>>>0<2147483647?Ka<<1:-1;if((ca|0)!=119){sb=P}else{sb=0}Ja=Rm(sb,fb)|0;if((Ja|0)==0){Z=214;break a}tb=Ja+(Ka>>2<<2)|0;ub=Ja;vb=Ja+(fb>>>2<<2)|0;wb=120}else{tb=qa;ub=P;vb=$;wb=ca}c[tb>>2]=na;lb=ma;mb=ub;nb=tb+4|0;ob=vb;pb=0;qb=wb}fb=c[b>>2]|0;Ja=fb+12|0;Ka=c[Ja>>2]|0;if((Ka|0)==(c[fb+16>>2]|0)){qc[c[(c[fb>>2]|0)+40>>2]&127](fb)|0;ma=lb;qa=nb;$=ob;P=mb;na=pb;ca=qb;continue}else{c[Ja>>2]=Ka+4;ma=lb;qa=nb;$=ob;P=mb;na=pb;ca=qb;continue}}if((P|0)==(qa|0)|(na|0)==0){xb=P;yb=qa;zb=$;Ab=ca}else{if((qa|0)==($|0)){Ka=qa-P|0;Ja=Ka>>>0<2147483647?Ka<<1:-1;if((ca|0)!=119){Bb=P}else{Bb=0}fb=Rm(Bb,Ja)|0;if((fb|0)==0){Z=225;break a}Cb=fb+(Ka>>2<<2)|0;Db=fb;Eb=fb+(Ja>>>2<<2)|0;Fb=120}else{Cb=qa;Db=P;Eb=$;Fb=ca}c[Cb>>2]=na;xb=Db;yb=Cb+4|0;zb=Eb;Ab=Fb}Ja=c[z>>2]|0;if((Ja|0)>0){fb=c[b>>2]|0;do{if((fb|0)!=0){Ka=c[fb+12>>2]|0;if((Ka|0)==(c[fb+16>>2]|0)){Gb=qc[c[(c[fb>>2]|0)+36>>2]&127](fb)|0}else{Gb=c[Ka>>2]|0}if((Gb|0)==-1){c[b>>2]=0;Hb=1;break}else{Hb=(c[b>>2]|0)==0;break}}else{Hb=1}}while(0);fb=c[e>>2]|0;do{if((fb|0)!=0){na=c[fb+12>>2]|0;if((na|0)==(c[fb+16>>2]|0)){Ib=qc[c[(c[fb>>2]|0)+36>>2]&127](fb)|0}else{Ib=c[na>>2]|0}if(!((Ib|0)==-1)){if(Hb){Jb=fb;break}else{Z=248;break a}}else{c[e>>2]=0;Z=242;break}}else{Z=242}}while(0);if((Z|0)==242){Z=0;if(Hb){Z=248;break a}else{Jb=0}}fb=c[b>>2]|0;na=c[fb+12>>2]|0;if((na|0)==(c[fb+16>>2]|0)){Kb=qc[c[(c[fb>>2]|0)+36>>2]&127](fb)|0}else{Kb=c[na>>2]|0}if((Kb|0)!=(c[s>>2]|0)){Z=248;break a}na=c[b>>2]|0;fb=na+12|0;ca=c[fb>>2]|0;if((ca|0)==(c[na+16>>2]|0)){qc[c[(c[na>>2]|0)+40>>2]&127](na)|0;Lb=Jb;Mb=Jb;Nb=ma;Ob=Ja}else{c[fb>>2]=ca+4;Lb=Jb;Mb=Jb;Nb=ma;Ob=Ja}while(1){ca=c[b>>2]|0;do{if((ca|0)!=0){fb=c[ca+12>>2]|0;if((fb|0)==(c[ca+16>>2]|0)){Pb=qc[c[(c[ca>>2]|0)+36>>2]&127](ca)|0}else{Pb=c[fb>>2]|0}if((Pb|0)==-1){c[b>>2]=0;Qb=1;break}else{Qb=(c[b>>2]|0)==0;break}}else{Qb=1}}while(0);do{if((Mb|0)!=0){ca=c[Mb+12>>2]|0;if((ca|0)==(c[Mb+16>>2]|0)){Rb=qc[c[(c[Mb>>2]|0)+36>>2]&127](Mb)|0}else{Rb=c[ca>>2]|0}if(!((Rb|0)==-1)){if(Qb^(Lb|0)==0){Sb=Lb;Tb=Lb;break}else{Z=271;break a}}else{c[e>>2]=0;Ub=0;Z=265;break}}else{Ub=Lb;Z=265}}while(0);if((Z|0)==265){Z=0;if(Qb){Z=271;break a}else{Sb=Ub;Tb=0}}ca=c[b>>2]|0;fb=c[ca+12>>2]|0;if((fb|0)==(c[ca+16>>2]|0)){Vb=qc[c[(c[ca>>2]|0)+36>>2]&127](ca)|0}else{Vb=c[fb>>2]|0}if(!(ic[c[(c[l>>2]|0)+12>>2]&31](l,2048,Vb)|0)){Z=271;break a}fb=c[n>>2]|0;if((fb|0)==(Nb|0)){ca=(c[I>>2]|0)!=119;na=c[m>>2]|0;$=Nb-na|0;P=$>>>0<2147483647?$<<1:-1;qa=$>>2;if(ca){Wb=na}else{Wb=0}na=Rm(Wb,P)|0;if((na|0)==0){Z=276;break a}if(!ca){ca=c[m>>2]|0;c[m>>2]=na;if((ca|0)==0){Xb=na}else{nc[c[I>>2]&255](ca);Xb=c[m>>2]|0}}else{c[m>>2]=na;Xb=na}c[I>>2]=120;na=Xb+(qa<<2)|0;c[n>>2]=na;Yb=na;Zb=(c[m>>2]|0)+(P>>>2<<2)|0}else{Yb=fb;Zb=Nb}fb=c[b>>2]|0;P=c[fb+12>>2]|0;if((P|0)==(c[fb+16>>2]|0)){na=qc[c[(c[fb>>2]|0)+36>>2]&127](fb)|0;_b=na;$b=c[n>>2]|0}else{_b=c[P>>2]|0;$b=Yb}c[n>>2]=$b+4;c[$b>>2]=_b;P=Ob+ -1|0;c[z>>2]=P;na=c[b>>2]|0;fb=na+12|0;qa=c[fb>>2]|0;if((qa|0)==(c[na+16>>2]|0)){qc[c[(c[na>>2]|0)+40>>2]&127](na)|0}else{c[fb>>2]=qa+4}if((P|0)>0){Lb=Sb;Mb=Tb;Nb=Zb;Ob=P}else{ac=Zb;break}}}else{ac=ma}if((c[n>>2]|0)==(c[m>>2]|0)){Z=290;break a}else{ea=ac;fa=xb;ga=yb;ha=zb;ia=N;ja=Ab}break};default:{ea=q;fa=M;ga=L;ha=K;ia=N;ja=O}}}while(0);g:do{if((Z|0)==28){Z=0;if((o|0)==3){V=M;W=L;X=N;Y=O;Z=292;break a}else{bc=U;cc=U}while(1){Ja=c[b>>2]|0;do{if((Ja|0)!=0){P=c[Ja+12>>2]|0;if((P|0)==(c[Ja+16>>2]|0)){dc=qc[c[(c[Ja>>2]|0)+36>>2]&127](Ja)|0}else{dc=c[P>>2]|0}if((dc|0)==-1){c[b>>2]=0;ec=1;break}else{ec=(c[b>>2]|0)==0;break}}else{ec=1}}while(0);do{if((cc|0)!=0){Ja=c[cc+12>>2]|0;if((Ja|0)==(c[cc+16>>2]|0)){fc=qc[c[(c[cc>>2]|0)+36>>2]&127](cc)|0}else{fc=c[Ja>>2]|0}if(!((fc|0)==-1)){if(ec^(bc|0)==0){gc=bc;hc=bc;break}else{ea=q;fa=M;ga=L;ha=K;ia=N;ja=O;break g}}else{c[e>>2]=0;jc=0;Z=42;break}}else{jc=bc;Z=42}}while(0);if((Z|0)==42){Z=0;if(ec){ea=q;fa=M;ga=L;ha=K;ia=N;ja=O;break g}else{gc=jc;hc=0}}Ja=c[b>>2]|0;P=c[Ja+12>>2]|0;if((P|0)==(c[Ja+16>>2]|0)){kc=qc[c[(c[Ja>>2]|0)+36>>2]&127](Ja)|0}else{kc=c[P>>2]|0}if(!(ic[c[(c[l>>2]|0)+12>>2]&31](l,8192,kc)|0)){ea=q;fa=M;ga=L;ha=K;ia=N;ja=O;break g}P=c[b>>2]|0;Ja=P+12|0;qa=c[Ja>>2]|0;if((qa|0)==(c[P+16>>2]|0)){lc=qc[c[(c[P>>2]|0)+40>>2]&127](P)|0}else{c[Ja>>2]=qa+4;lc=c[qa>>2]|0}Se(y,lc);bc=gc;cc=hc}}}while(0);ma=o+1|0;if(ma>>>0<4){K=ha;L=ga;M=fa;q=ea;o=ma;N=ia;O=ja}else{V=fa;W=ga;X=ia;Y=ja;Z=292;break}}h:do{if((Z|0)==27){c[j>>2]=c[j>>2]|4;mc=0;oc=M;pc=O}else if((Z|0)==116){c[j>>2]=c[j>>2]|4;mc=0;oc=M;pc=O}else if((Z|0)==174){c[j>>2]=c[j>>2]|4;mc=0;oc=M;pc=O}else if((Z|0)==198){$m()}else if((Z|0)==214){$m()}else if((Z|0)==225){$m()}else if((Z|0)==248){c[j>>2]=c[j>>2]|4;mc=0;oc=xb;pc=Ab}else if((Z|0)==271){c[j>>2]=c[j>>2]|4;mc=0;oc=xb;pc=Ab}else if((Z|0)==276){$m()}else if((Z|0)==290){c[j>>2]=c[j>>2]|4;mc=0;oc=xb;pc=Ab}else if((Z|0)==292){i:do{if((X|0)!=0){ja=X+4|0;ia=X+8|0;ga=1;j:while(1){fa=a[X]|0;if((fa&1)==0){rc=(fa&255)>>>1}else{rc=c[ja>>2]|0}if(!(ga>>>0<rc>>>0)){break i}fa=c[b>>2]|0;do{if((fa|0)!=0){N=c[fa+12>>2]|0;if((N|0)==(c[fa+16>>2]|0)){sc=qc[c[(c[fa>>2]|0)+36>>2]&127](fa)|0}else{sc=c[N>>2]|0}if((sc|0)==-1){c[b>>2]=0;tc=1;break}else{tc=(c[b>>2]|0)==0;break}}else{tc=1}}while(0);fa=c[e>>2]|0;do{if((fa|0)!=0){N=c[fa+12>>2]|0;if((N|0)==(c[fa+16>>2]|0)){uc=qc[c[(c[fa>>2]|0)+36>>2]&127](fa)|0}else{uc=c[N>>2]|0}if(!((uc|0)==-1)){if(tc){break}else{break j}}else{c[e>>2]=0;Z=311;break}}else{Z=311}}while(0);if((Z|0)==311?(Z=0,tc):0){break}fa=c[b>>2]|0;N=c[fa+12>>2]|0;if((N|0)==(c[fa+16>>2]|0)){vc=qc[c[(c[fa>>2]|0)+36>>2]&127](fa)|0}else{vc=c[N>>2]|0}if((a[X]&1)==0){wc=ja}else{wc=c[ia>>2]|0}if((vc|0)!=(c[wc+(ga<<2)>>2]|0)){break}N=ga+1|0;fa=c[b>>2]|0;o=fa+12|0;ea=c[o>>2]|0;if((ea|0)==(c[fa+16>>2]|0)){qc[c[(c[fa>>2]|0)+40>>2]&127](fa)|0;ga=N;continue}else{c[o>>2]=ea+4;ga=N;continue}}c[j>>2]=c[j>>2]|4;mc=0;oc=V;pc=Y;break h}}while(0);if((V|0)!=(W|0)){c[A>>2]=0;rj(u,V,W,A);if((c[A>>2]|0)==0){mc=1;oc=V;pc=Y}else{c[j>>2]=c[j>>2]|4;mc=0;oc=V;pc=Y}}else{mc=1;oc=W;pc=Y}}}while(0);Oe(y);Oe(x);Oe(w);Oe(v);De(u);if((oc|0)==0){i=p;return mc|0}nc[pc&255](oc);i=p;return mc|0}function wj(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0;d=i;i=i+448|0;l=d;m=d+24|0;n=d+16|0;o=d+428|0;p=d+12|0;q=d+432|0;r=d+424|0;c[n>>2]=m;s=n+4|0;c[s>>2]=119;t=m+400|0;Xe(p,h);m=c[p>>2]|0;if(!((c[1682]|0)==-1)){c[l>>2]=6728;c[l+4>>2]=117;c[l+8>>2]=0;ye(6728,l,118)}u=(c[6732>>2]|0)+ -1|0;v=c[m+8>>2]|0;if(!((c[m+12>>2]|0)-v>>2>>>0>u>>>0)){w=Ya(4)|0;um(w);zb(w|0,14696,106)}m=c[v+(u<<2)>>2]|0;if((m|0)==0){w=Ya(4)|0;um(w);zb(w|0,14696,106)}a[q]=0;w=c[f>>2]|0;c[r>>2]=w;u=c[h+4>>2]|0;c[l+0>>2]=c[r+0>>2];if(vj(e,l,g,p,u,j,q,m,n,o,t)|0){if((a[k]&1)==0){c[k+4>>2]=0;a[k]=0}else{c[c[k+8>>2]>>2]=0;c[k+4>>2]=0}if((a[q]|0)!=0){Se(k,zc[c[(c[m>>2]|0)+44>>2]&15](m,45)|0)}q=zc[c[(c[m>>2]|0)+44>>2]&15](m,48)|0;m=c[n>>2]|0;t=c[o>>2]|0;o=t+ -4|0;a:do{if(m>>>0<o>>>0){u=m;while(1){g=u+4|0;if((c[u>>2]|0)!=(q|0)){x=u;break a}if(g>>>0<o>>>0){u=g}else{x=g;break}}}else{x=m}}while(0);xj(k,x,t)|0}t=c[e>>2]|0;do{if((t|0)!=0){x=c[t+12>>2]|0;if((x|0)==(c[t+16>>2]|0)){y=qc[c[(c[t>>2]|0)+36>>2]&127](t)|0}else{y=c[x>>2]|0}if((y|0)==-1){c[e>>2]=0;z=1;break}else{z=(c[e>>2]|0)==0;break}}else{z=1}}while(0);do{if((w|0)!=0){y=c[w+12>>2]|0;if((y|0)==(c[w+16>>2]|0)){A=qc[c[(c[w>>2]|0)+36>>2]&127](w)|0}else{A=c[y>>2]|0}if(!((A|0)==-1)){if(z){break}else{B=31;break}}else{c[f>>2]=0;B=29;break}}else{B=29}}while(0);if((B|0)==29?z:0){B=31}if((B|0)==31){c[j>>2]=c[j>>2]|2}c[b>>2]=c[e>>2];ee(c[p>>2]|0)|0;p=c[n>>2]|0;c[n>>2]=0;if((p|0)==0){i=d;return}nc[c[s>>2]&255](p);i=d;return}function xj(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;f=i;g=d;h=a[b]|0;if((h&1)==0){j=1;k=(h&255)>>>1;l=h}else{h=c[b>>2]|0;j=(h&-2)+ -1|0;k=c[b+4>>2]|0;l=h&255}h=e-g>>2;if((h|0)==0){i=f;return b|0}if((j-k|0)>>>0<h>>>0){Ue(b,j,k+h-j|0,k,k,0,0);m=a[b]|0}else{m=l}if((m&1)==0){n=b+4|0}else{n=c[b+8>>2]|0}m=n+(k<<2)|0;if((d|0)==(e|0)){o=m}else{l=k+((e+ -4+(0-g)|0)>>>2)+1|0;g=d;d=m;while(1){c[d>>2]=c[g>>2];g=g+4|0;if((g|0)==(e|0)){break}else{d=d+4|0}}o=n+(l<<2)|0}c[o>>2]=0;o=k+h|0;if((a[b]&1)==0){a[b]=o<<1;i=f;return b|0}else{c[b+4>>2]=o;i=f;return b|0}return 0}function yj(b,d,e,f,g,h,j,k,l,m){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;n=i;i=i+128|0;o=n;p=n+24|0;q=n+44|0;r=n+32|0;s=n+56|0;t=n+12|0;u=n+28|0;v=n+68|0;w=n+80|0;x=n+92|0;y=n+104|0;if(b){b=c[d>>2]|0;if(!((c[1576]|0)==-1)){c[o>>2]=6304;c[o+4>>2]=117;c[o+8>>2]=0;ye(6304,o,118)}z=(c[6308>>2]|0)+ -1|0;A=c[b+8>>2]|0;if(!((c[b+12>>2]|0)-A>>2>>>0>z>>>0)){B=Ya(4)|0;um(B);zb(B|0,14696,106)}b=c[A+(z<<2)>>2]|0;if((b|0)==0){B=Ya(4)|0;um(B);zb(B|0,14696,106)}oc[c[(c[b>>2]|0)+44>>2]&63](p,b);B=c[p>>2]|0;a[e]=B;a[e+1|0]=B>>8;a[e+2|0]=B>>16;a[e+3|0]=B>>24;oc[c[(c[b>>2]|0)+32>>2]&63](q,b);if((a[l]&1)==0){c[l+4>>2]=0;a[l]=0}else{c[c[l+8>>2]>>2]=0;c[l+4>>2]=0}Re(l,0);c[l+0>>2]=c[q+0>>2];c[l+4>>2]=c[q+4>>2];c[l+8>>2]=c[q+8>>2];c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;Oe(q);oc[c[(c[b>>2]|0)+28>>2]&63](r,b);if((a[k]&1)==0){c[k+4>>2]=0;a[k]=0}else{c[c[k+8>>2]>>2]=0;c[k+4>>2]=0}Re(k,0);c[k+0>>2]=c[r+0>>2];c[k+4>>2]=c[r+4>>2];c[k+8>>2]=c[r+8>>2];c[r+0>>2]=0;c[r+4>>2]=0;c[r+8>>2]=0;Oe(r);c[f>>2]=qc[c[(c[b>>2]|0)+12>>2]&127](b)|0;c[g>>2]=qc[c[(c[b>>2]|0)+16>>2]&127](b)|0;oc[c[(c[b>>2]|0)+20>>2]&63](s,b);if((a[h]&1)==0){a[h+1|0]=0;a[h]=0}else{a[c[h+8>>2]|0]=0;c[h+4>>2]=0}He(h,0);c[h+0>>2]=c[s+0>>2];c[h+4>>2]=c[s+4>>2];c[h+8>>2]=c[s+8>>2];c[s+0>>2]=0;c[s+4>>2]=0;c[s+8>>2]=0;De(s);oc[c[(c[b>>2]|0)+24>>2]&63](t,b);if((a[j]&1)==0){c[j+4>>2]=0;a[j]=0}else{c[c[j+8>>2]>>2]=0;c[j+4>>2]=0}Re(j,0);c[j+0>>2]=c[t+0>>2];c[j+4>>2]=c[t+4>>2];c[j+8>>2]=c[t+8>>2];c[t+0>>2]=0;c[t+4>>2]=0;c[t+8>>2]=0;Oe(t);C=qc[c[(c[b>>2]|0)+36>>2]&127](b)|0;c[m>>2]=C;i=n;return}else{b=c[d>>2]|0;if(!((c[1560]|0)==-1)){c[o>>2]=6240;c[o+4>>2]=117;c[o+8>>2]=0;ye(6240,o,118)}o=(c[6244>>2]|0)+ -1|0;d=c[b+8>>2]|0;if(!((c[b+12>>2]|0)-d>>2>>>0>o>>>0)){D=Ya(4)|0;um(D);zb(D|0,14696,106)}b=c[d+(o<<2)>>2]|0;if((b|0)==0){D=Ya(4)|0;um(D);zb(D|0,14696,106)}oc[c[(c[b>>2]|0)+44>>2]&63](u,b);D=c[u>>2]|0;a[e]=D;a[e+1|0]=D>>8;a[e+2|0]=D>>16;a[e+3|0]=D>>24;oc[c[(c[b>>2]|0)+32>>2]&63](v,b);if((a[l]&1)==0){c[l+4>>2]=0;a[l]=0}else{c[c[l+8>>2]>>2]=0;c[l+4>>2]=0}Re(l,0);c[l+0>>2]=c[v+0>>2];c[l+4>>2]=c[v+4>>2];c[l+8>>2]=c[v+8>>2];c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;Oe(v);oc[c[(c[b>>2]|0)+28>>2]&63](w,b);if((a[k]&1)==0){c[k+4>>2]=0;a[k]=0}else{c[c[k+8>>2]>>2]=0;c[k+4>>2]=0}Re(k,0);c[k+0>>2]=c[w+0>>2];c[k+4>>2]=c[w+4>>2];c[k+8>>2]=c[w+8>>2];c[w+0>>2]=0;c[w+4>>2]=0;c[w+8>>2]=0;Oe(w);c[f>>2]=qc[c[(c[b>>2]|0)+12>>2]&127](b)|0;c[g>>2]=qc[c[(c[b>>2]|0)+16>>2]&127](b)|0;oc[c[(c[b>>2]|0)+20>>2]&63](x,b);if((a[h]&1)==0){a[h+1|0]=0;a[h]=0}else{a[c[h+8>>2]|0]=0;c[h+4>>2]=0}He(h,0);c[h+0>>2]=c[x+0>>2];c[h+4>>2]=c[x+4>>2];c[h+8>>2]=c[x+8>>2];c[x+0>>2]=0;c[x+4>>2]=0;c[x+8>>2]=0;De(x);oc[c[(c[b>>2]|0)+24>>2]&63](y,b);if((a[j]&1)==0){c[j+4>>2]=0;a[j]=0}else{c[c[j+8>>2]>>2]=0;c[j+4>>2]=0}Re(j,0);c[j+0>>2]=c[y+0>>2];c[j+4>>2]=c[y+4>>2];c[j+8>>2]=c[y+8>>2];c[y+0>>2]=0;c[y+4>>2]=0;c[y+8>>2]=0;Oe(y);C=qc[c[(c[b>>2]|0)+36>>2]&127](b)|0;c[m>>2]=C;i=n;return}}function zj(a){a=a|0;var b=0;b=i;Wm(a);i=b;return}function Aj(a){a=a|0;return}function Bj(b,d,e,f,g,j,l){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;j=j|0;l=+l;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0;d=i;i=i+384|0;m=d;n=d+76|0;o=d+44|0;p=d+176|0;q=d+40|0;r=d+68|0;s=d+276|0;t=d+380|0;u=d+56|0;v=d+24|0;w=d+12|0;x=d+52|0;y=d+280|0;z=d+36|0;A=d+48|0;B=d+72|0;c[o>>2]=n;h[k>>3]=l;c[m>>2]=c[k>>2];c[m+4>>2]=c[k+4>>2];C=nb(n|0,100,6488,m|0)|0;if(C>>>0>99){if((a[6632]|0)==0?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}n=c[1656]|0;h[k>>3]=l;c[m>>2]=c[k>>2];c[m+4>>2]=c[k+4>>2];D=wh(o,n,6488,m)|0;n=c[o>>2]|0;if((n|0)==0){$m()}E=Pm(D)|0;if((E|0)==0){$m()}else{F=E;G=n;H=E;I=D}}else{F=0;G=0;H=p;I=C}Xe(q,g);C=c[q>>2]|0;if(!((c[1684]|0)==-1)){c[m>>2]=6736;c[m+4>>2]=117;c[m+8>>2]=0;ye(6736,m,118)}p=(c[6740>>2]|0)+ -1|0;D=c[C+8>>2]|0;if(!((c[C+12>>2]|0)-D>>2>>>0>p>>>0)){J=Ya(4)|0;um(J);zb(J|0,14696,106)}C=c[D+(p<<2)>>2]|0;if((C|0)==0){J=Ya(4)|0;um(J);zb(J|0,14696,106)}J=c[o>>2]|0;wc[c[(c[C>>2]|0)+32>>2]&7](C,J,J+I|0,H)|0;if((I|0)==0){K=0}else{K=(a[c[o>>2]|0]|0)==45}c[r>>2]=0;c[u+0>>2]=0;c[u+4>>2]=0;c[u+8>>2]=0;c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;c[w+0>>2]=0;c[w+4>>2]=0;c[w+8>>2]=0;Cj(f,K,q,r,s,t,u,v,w,x);f=c[x>>2]|0;if((I|0)>(f|0)){x=a[w]|0;if((x&1)==0){L=(x&255)>>>1}else{L=c[w+4>>2]|0}x=a[v]|0;if((x&1)==0){M=(x&255)>>>1}else{M=c[v+4>>2]|0}N=L+(I-f<<1|1)+M|0}else{M=a[w]|0;if((M&1)==0){O=(M&255)>>>1}else{O=c[w+4>>2]|0}M=a[v]|0;if((M&1)==0){P=(M&255)>>>1}else{P=c[v+4>>2]|0}N=O+2+P|0}P=N+f|0;if(P>>>0>100){N=Pm(P)|0;if((N|0)==0){$m()}else{Q=N;R=N}}else{Q=0;R=y}Dj(R,z,A,c[g+4>>2]|0,H,H+I|0,C,K,r,a[s]|0,a[t]|0,u,v,w,f);c[B>>2]=c[e>>2];e=c[z>>2]|0;z=c[A>>2]|0;c[m+0>>2]=c[B+0>>2];rh(b,m,R,e,z,g,j);if((Q|0)!=0){Qm(Q)}De(w);De(v);De(u);ee(c[q>>2]|0)|0;if((F|0)!=0){Qm(F)}if((G|0)==0){i=d;return}Qm(G);i=d;return}function Cj(b,d,e,f,g,h,j,k,l,m){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0;n=i;i=i+128|0;o=n;p=n+12|0;q=n+40|0;r=n+52|0;s=n+56|0;t=n+16|0;u=n+28|0;v=n+68|0;w=n+72|0;x=n+84|0;y=n+88|0;z=n+100|0;A=n+112|0;B=c[e>>2]|0;if(b){if(!((c[1544]|0)==-1)){c[o>>2]=6176;c[o+4>>2]=117;c[o+8>>2]=0;ye(6176,o,118)}b=(c[6180>>2]|0)+ -1|0;e=c[B+8>>2]|0;if(!((c[B+12>>2]|0)-e>>2>>>0>b>>>0)){C=Ya(4)|0;um(C);zb(C|0,14696,106)}D=c[e+(b<<2)>>2]|0;if((D|0)==0){C=Ya(4)|0;um(C);zb(C|0,14696,106)}C=c[D>>2]|0;if(d){oc[c[C+44>>2]&63](p,D);b=c[p>>2]|0;a[f]=b;a[f+1|0]=b>>8;a[f+2|0]=b>>16;a[f+3|0]=b>>24;oc[c[(c[D>>2]|0)+32>>2]&63](q,D);if((a[l]&1)==0){a[l+1|0]=0;a[l]=0}else{a[c[l+8>>2]|0]=0;c[l+4>>2]=0}He(l,0);c[l+0>>2]=c[q+0>>2];c[l+4>>2]=c[q+4>>2];c[l+8>>2]=c[q+8>>2];c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;De(q)}else{oc[c[C+40>>2]&63](r,D);C=c[r>>2]|0;a[f]=C;a[f+1|0]=C>>8;a[f+2|0]=C>>16;a[f+3|0]=C>>24;oc[c[(c[D>>2]|0)+28>>2]&63](s,D);if((a[l]&1)==0){a[l+1|0]=0;a[l]=0}else{a[c[l+8>>2]|0]=0;c[l+4>>2]=0}He(l,0);c[l+0>>2]=c[s+0>>2];c[l+4>>2]=c[s+4>>2];c[l+8>>2]=c[s+8>>2];c[s+0>>2]=0;c[s+4>>2]=0;c[s+8>>2]=0;De(s)}a[g]=qc[c[(c[D>>2]|0)+12>>2]&127](D)|0;a[h]=qc[c[(c[D>>2]|0)+16>>2]&127](D)|0;oc[c[(c[D>>2]|0)+20>>2]&63](t,D);if((a[j]&1)==0){a[j+1|0]=0;a[j]=0}else{a[c[j+8>>2]|0]=0;c[j+4>>2]=0}He(j,0);c[j+0>>2]=c[t+0>>2];c[j+4>>2]=c[t+4>>2];c[j+8>>2]=c[t+8>>2];c[t+0>>2]=0;c[t+4>>2]=0;c[t+8>>2]=0;De(t);oc[c[(c[D>>2]|0)+24>>2]&63](u,D);if((a[k]&1)==0){a[k+1|0]=0;a[k]=0}else{a[c[k+8>>2]|0]=0;c[k+4>>2]=0}He(k,0);c[k+0>>2]=c[u+0>>2];c[k+4>>2]=c[u+4>>2];c[k+8>>2]=c[u+8>>2];c[u+0>>2]=0;c[u+4>>2]=0;c[u+8>>2]=0;De(u);E=qc[c[(c[D>>2]|0)+36>>2]&127](D)|0;c[m>>2]=E;i=n;return}else{if(!((c[1528]|0)==-1)){c[o>>2]=6112;c[o+4>>2]=117;c[o+8>>2]=0;ye(6112,o,118)}o=(c[6116>>2]|0)+ -1|0;D=c[B+8>>2]|0;if(!((c[B+12>>2]|0)-D>>2>>>0>o>>>0)){F=Ya(4)|0;um(F);zb(F|0,14696,106)}B=c[D+(o<<2)>>2]|0;if((B|0)==0){F=Ya(4)|0;um(F);zb(F|0,14696,106)}F=c[B>>2]|0;if(d){oc[c[F+44>>2]&63](v,B);d=c[v>>2]|0;a[f]=d;a[f+1|0]=d>>8;a[f+2|0]=d>>16;a[f+3|0]=d>>24;oc[c[(c[B>>2]|0)+32>>2]&63](w,B);if((a[l]&1)==0){a[l+1|0]=0;a[l]=0}else{a[c[l+8>>2]|0]=0;c[l+4>>2]=0}He(l,0);c[l+0>>2]=c[w+0>>2];c[l+4>>2]=c[w+4>>2];c[l+8>>2]=c[w+8>>2];c[w+0>>2]=0;c[w+4>>2]=0;c[w+8>>2]=0;De(w)}else{oc[c[F+40>>2]&63](x,B);F=c[x>>2]|0;a[f]=F;a[f+1|0]=F>>8;a[f+2|0]=F>>16;a[f+3|0]=F>>24;oc[c[(c[B>>2]|0)+28>>2]&63](y,B);if((a[l]&1)==0){a[l+1|0]=0;a[l]=0}else{a[c[l+8>>2]|0]=0;c[l+4>>2]=0}He(l,0);c[l+0>>2]=c[y+0>>2];c[l+4>>2]=c[y+4>>2];c[l+8>>2]=c[y+8>>2];c[y+0>>2]=0;c[y+4>>2]=0;c[y+8>>2]=0;De(y)}a[g]=qc[c[(c[B>>2]|0)+12>>2]&127](B)|0;a[h]=qc[c[(c[B>>2]|0)+16>>2]&127](B)|0;oc[c[(c[B>>2]|0)+20>>2]&63](z,B);if((a[j]&1)==0){a[j+1|0]=0;a[j]=0}else{a[c[j+8>>2]|0]=0;c[j+4>>2]=0}He(j,0);c[j+0>>2]=c[z+0>>2];c[j+4>>2]=c[z+4>>2];c[j+8>>2]=c[z+8>>2];c[z+0>>2]=0;c[z+4>>2]=0;c[z+8>>2]=0;De(z);oc[c[(c[B>>2]|0)+24>>2]&63](A,B);if((a[k]&1)==0){a[k+1|0]=0;a[k]=0}else{a[c[k+8>>2]|0]=0;c[k+4>>2]=0}He(k,0);c[k+0>>2]=c[A+0>>2];c[k+4>>2]=c[A+4>>2];c[k+8>>2]=c[A+8>>2];c[A+0>>2]=0;c[A+4>>2]=0;c[A+8>>2]=0;De(A);E=qc[c[(c[B>>2]|0)+36>>2]&127](B)|0;c[m>>2]=E;i=n;return}}function Dj(d,e,f,g,h,j,k,l,m,n,o,p,q,r,s){d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;p=p|0;q=q|0;r=r|0;s=s|0;var t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0,la=0,ma=0,na=0,oa=0,pa=0,qa=0,ra=0,sa=0,ta=0,ua=0,va=0;t=i;c[f>>2]=d;u=r+1|0;v=r+8|0;w=r+4|0;x=(g&512|0)==0;y=q+1|0;z=q+8|0;A=q+4|0;B=(s|0)>0;C=p+1|0;D=p+8|0;E=p+4|0;F=k+8|0;G=0-s|0;H=h;h=0;while(1){switch(a[m+h|0]|0){case 4:{I=c[f>>2]|0;J=l?H+1|0:H;a:do{if(J>>>0<j>>>0){K=J;while(1){L=a[K]|0;if(!(L<<24>>24>-1)){M=K;break a}N=K+1|0;if((b[(c[F>>2]|0)+(L<<24>>24<<1)>>1]&2048)==0){M=K;break a}if(N>>>0<j>>>0){K=N}else{M=N;break}}}else{M=J}}while(0);K=M;if(B){if(M>>>0>J>>>0){N=J+(0-K)|0;K=N>>>0<G>>>0?G:N;N=K+s|0;L=I;O=M;P=s;while(1){Q=O+ -1|0;R=a[Q]|0;c[f>>2]=L+1;a[L]=R;R=P+ -1|0;S=(R|0)>0;if(!(Q>>>0>J>>>0&S)){break}L=c[f>>2]|0;O=Q;P=R}P=M+K|0;if(S){T=P;U=N;V=32}else{W=0;X=P;Y=N}}else{T=M;U=s;V=32}if((V|0)==32){V=0;W=zc[c[(c[k>>2]|0)+28>>2]&15](k,48)|0;X=T;Y=U}P=c[f>>2]|0;c[f>>2]=P+1;if((Y|0)>0){O=P;L=Y;while(1){a[O]=W;R=L+ -1|0;Q=c[f>>2]|0;c[f>>2]=Q+1;if((R|0)>0){O=Q;L=R}else{Z=Q;break}}}else{Z=P}a[Z]=n;_=X}else{_=M}if((_|0)==(J|0)){L=zc[c[(c[k>>2]|0)+28>>2]&15](k,48)|0;O=c[f>>2]|0;c[f>>2]=O+1;a[O]=L}else{L=a[p]|0;O=(L&1)==0;if(O){$=(L&255)>>>1}else{$=c[E>>2]|0}if(($|0)==0){aa=_;ba=-1;ca=0;da=0}else{if(O){ea=C}else{ea=c[D>>2]|0}aa=_;ba=a[ea]|0;ca=0;da=0}while(1){if((da|0)==(ba|0)){O=c[f>>2]|0;c[f>>2]=O+1;a[O]=o;O=ca+1|0;L=a[p]|0;N=(L&1)==0;if(N){fa=(L&255)>>>1}else{fa=c[E>>2]|0}if(O>>>0<fa>>>0){if(N){ga=C}else{ga=c[D>>2]|0}if((a[ga+O|0]|0)==127){ha=-1;ia=O;ja=0}else{if(N){ka=C}else{ka=c[D>>2]|0}ha=a[ka+O|0]|0;ia=O;ja=0}}else{ha=ba;ia=O;ja=0}}else{ha=ba;ia=ca;ja=da}aa=aa+ -1|0;O=a[aa]|0;N=c[f>>2]|0;c[f>>2]=N+1;a[N]=O;if((aa|0)==(J|0)){break}else{ba=ha;ca=ia;da=ja+1|0}}}P=c[f>>2]|0;if((I|0)!=(P|0)?(O=P+ -1|0,O>>>0>I>>>0):0){P=I;N=O;while(1){O=a[P]|0;a[P]=a[N]|0;a[N]=O;O=P+1|0;L=N+ -1|0;if(O>>>0<L>>>0){P=O;N=L}else{la=J;break}}}else{la=J}break};case 3:{N=a[r]|0;P=(N&1)==0;if(P){ma=(N&255)>>>1}else{ma=c[w>>2]|0}if((ma|0)==0){la=H}else{if(P){na=u}else{na=c[v>>2]|0}P=a[na]|0;N=c[f>>2]|0;c[f>>2]=N+1;a[N]=P;la=H}break};case 1:{c[e>>2]=c[f>>2];P=zc[c[(c[k>>2]|0)+28>>2]&15](k,32)|0;N=c[f>>2]|0;c[f>>2]=N+1;a[N]=P;la=H;break};case 2:{P=a[q]|0;N=(P&1)==0;if(N){oa=(P&255)>>>1}else{oa=c[A>>2]|0}if((oa|0)==0|x){la=H}else{if(N){pa=y;qa=(P&255)>>>1}else{pa=c[z>>2]|0;qa=c[A>>2]|0}P=pa+qa|0;N=c[f>>2]|0;if((pa|0)==(P|0)){ra=N}else{I=N;N=pa;while(1){a[I]=a[N]|0;L=N+1|0;O=I+1|0;if((L|0)==(P|0)){ra=O;break}else{I=O;N=L}}}c[f>>2]=ra;la=H}break};case 0:{c[e>>2]=c[f>>2];la=H;break};default:{la=H}}h=h+1|0;if((h|0)==4){break}else{H=la}}la=a[r]|0;r=(la&1)==0;if(r){sa=(la&255)>>>1}else{sa=c[w>>2]|0}if(sa>>>0>1){if(r){ta=u;ua=(la&255)>>>1}else{ta=c[v>>2]|0;ua=c[w>>2]|0}w=ta+1|0;v=ta+ua|0;ua=c[f>>2]|0;if((w|0)==(v|0)){va=ua}else{ta=ua;ua=w;while(1){a[ta]=a[ua]|0;w=ua+1|0;la=ta+1|0;if((w|0)==(v|0)){va=la;break}else{ta=la;ua=w}}}c[f>>2]=va}va=g&176;if((va|0)==32){c[e>>2]=c[f>>2];i=t;return}else if((va|0)==16){i=t;return}else{c[e>>2]=d;i=t;return}}function Ej(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0;d=i;i=i+176|0;k=d;l=d+40|0;m=d+24|0;n=d+72|0;o=d+73|0;p=d+12|0;q=d+28|0;r=d+48|0;s=d+44|0;t=d+76|0;u=d+60|0;v=d+64|0;w=d+68|0;Xe(l,g);x=c[l>>2]|0;if(!((c[1684]|0)==-1)){c[k>>2]=6736;c[k+4>>2]=117;c[k+8>>2]=0;ye(6736,k,118)}y=(c[6740>>2]|0)+ -1|0;z=c[x+8>>2]|0;if(!((c[x+12>>2]|0)-z>>2>>>0>y>>>0)){A=Ya(4)|0;um(A);zb(A|0,14696,106)}x=c[z+(y<<2)>>2]|0;if((x|0)==0){A=Ya(4)|0;um(A);zb(A|0,14696,106)}A=a[j]|0;y=(A&1)==0;if(y){B=(A&255)>>>1}else{B=c[j+4>>2]|0}if((B|0)==0){C=0}else{if(y){D=j+1|0}else{D=c[j+8>>2]|0}y=a[D]|0;C=y<<24>>24==(zc[c[(c[x>>2]|0)+28>>2]&15](x,45)|0)<<24>>24}c[m>>2]=0;c[p+0>>2]=0;c[p+4>>2]=0;c[p+8>>2]=0;c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;c[r+0>>2]=0;c[r+4>>2]=0;c[r+8>>2]=0;Cj(f,C,l,m,n,o,p,q,r,s);f=a[j]|0;y=(f&1)==0;if(y){E=(f&255)>>>1}else{E=c[j+4>>2]|0}D=c[s>>2]|0;if((E|0)>(D|0)){if(y){F=(f&255)>>>1}else{F=c[j+4>>2]|0}y=a[r]|0;if((y&1)==0){G=(y&255)>>>1}else{G=c[r+4>>2]|0}y=a[q]|0;if((y&1)==0){H=(y&255)>>>1}else{H=c[q+4>>2]|0}I=G+(F-D<<1|1)+H|0}else{H=a[r]|0;if((H&1)==0){J=(H&255)>>>1}else{J=c[r+4>>2]|0}H=a[q]|0;if((H&1)==0){K=(H&255)>>>1}else{K=c[q+4>>2]|0}I=J+2+K|0}K=I+D|0;if(K>>>0>100){I=Pm(K)|0;if((I|0)==0){$m()}else{L=I;M=I}}else{L=0;M=t}if((f&1)==0){N=j+1|0;O=(f&255)>>>1}else{N=c[j+8>>2]|0;O=c[j+4>>2]|0}Dj(M,u,v,c[g+4>>2]|0,N,N+O|0,x,C,m,a[n]|0,a[o]|0,p,q,r,D);c[w>>2]=c[e>>2];e=c[u>>2]|0;u=c[v>>2]|0;c[k+0>>2]=c[w+0>>2];rh(b,k,M,e,u,g,h);if((L|0)==0){De(r);De(q);De(p);P=c[l>>2]|0;ee(P)|0;i=d;return}Qm(L);De(r);De(q);De(p);P=c[l>>2]|0;ee(P)|0;i=d;return}function Fj(a){a=a|0;var b=0;b=i;Wm(a);i=b;return}function Gj(a){a=a|0;return}function Hj(b,d,e,f,g,j,l){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;j=j|0;l=+l;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0;d=i;i=i+992|0;m=d;n=d+888|0;o=d+424|0;p=d+16|0;q=d+428|0;r=d+416|0;s=d+420|0;t=d+880|0;u=d+440|0;v=d+452|0;w=d+464|0;x=d+476|0;y=d+480|0;z=d+432|0;A=d+436|0;B=d+884|0;c[o>>2]=n;h[k>>3]=l;c[m>>2]=c[k>>2];c[m+4>>2]=c[k+4>>2];C=nb(n|0,100,6488,m|0)|0;if(C>>>0>99){if((a[6632]|0)==0?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}n=c[1656]|0;h[k>>3]=l;c[m>>2]=c[k>>2];c[m+4>>2]=c[k+4>>2];D=wh(o,n,6488,m)|0;n=c[o>>2]|0;if((n|0)==0){$m()}E=Pm(D<<2)|0;if((E|0)==0){$m()}else{F=E;G=n;H=E;I=D}}else{F=0;G=0;H=p;I=C}Xe(q,g);C=c[q>>2]|0;if(!((c[1682]|0)==-1)){c[m>>2]=6728;c[m+4>>2]=117;c[m+8>>2]=0;ye(6728,m,118)}p=(c[6732>>2]|0)+ -1|0;D=c[C+8>>2]|0;if(!((c[C+12>>2]|0)-D>>2>>>0>p>>>0)){J=Ya(4)|0;um(J);zb(J|0,14696,106)}C=c[D+(p<<2)>>2]|0;if((C|0)==0){J=Ya(4)|0;um(J);zb(J|0,14696,106)}J=c[o>>2]|0;wc[c[(c[C>>2]|0)+48>>2]&7](C,J,J+I|0,H)|0;if((I|0)==0){K=0}else{K=(a[c[o>>2]|0]|0)==45}c[r>>2]=0;c[u+0>>2]=0;c[u+4>>2]=0;c[u+8>>2]=0;c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;c[w+0>>2]=0;c[w+4>>2]=0;c[w+8>>2]=0;Ij(f,K,q,r,s,t,u,v,w,x);f=c[x>>2]|0;if((I|0)>(f|0)){x=a[w]|0;if((x&1)==0){L=(x&255)>>>1}else{L=c[w+4>>2]|0}x=a[v]|0;if((x&1)==0){M=(x&255)>>>1}else{M=c[v+4>>2]|0}N=L+(I-f<<1|1)+M|0}else{M=a[w]|0;if((M&1)==0){O=(M&255)>>>1}else{O=c[w+4>>2]|0}M=a[v]|0;if((M&1)==0){P=(M&255)>>>1}else{P=c[v+4>>2]|0}N=O+2+P|0}P=N+f|0;if(P>>>0>100){N=Pm(P<<2)|0;if((N|0)==0){$m()}else{Q=N;R=N}}else{Q=0;R=y}Jj(R,z,A,c[g+4>>2]|0,H,H+(I<<2)|0,C,K,r,c[s>>2]|0,c[t>>2]|0,u,v,w,f);c[B>>2]=c[e>>2];e=c[z>>2]|0;z=c[A>>2]|0;c[m+0>>2]=c[B+0>>2];Fh(b,m,R,e,z,g,j);if((Q|0)!=0){Qm(Q)}Oe(w);Oe(v);De(u);ee(c[q>>2]|0)|0;if((F|0)!=0){Qm(F)}if((G|0)==0){i=d;return}Qm(G);i=d;return}function Ij(b,d,e,f,g,h,j,k,l,m){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0;n=i;i=i+128|0;o=n;p=n+12|0;q=n+40|0;r=n+52|0;s=n+56|0;t=n+16|0;u=n+28|0;v=n+68|0;w=n+72|0;x=n+84|0;y=n+88|0;z=n+100|0;A=n+112|0;B=c[e>>2]|0;if(b){if(!((c[1576]|0)==-1)){c[o>>2]=6304;c[o+4>>2]=117;c[o+8>>2]=0;ye(6304,o,118)}b=(c[6308>>2]|0)+ -1|0;e=c[B+8>>2]|0;if(!((c[B+12>>2]|0)-e>>2>>>0>b>>>0)){C=Ya(4)|0;um(C);zb(C|0,14696,106)}D=c[e+(b<<2)>>2]|0;if((D|0)==0){C=Ya(4)|0;um(C);zb(C|0,14696,106)}C=c[D>>2]|0;if(d){oc[c[C+44>>2]&63](p,D);b=c[p>>2]|0;a[f]=b;a[f+1|0]=b>>8;a[f+2|0]=b>>16;a[f+3|0]=b>>24;oc[c[(c[D>>2]|0)+32>>2]&63](q,D);if((a[l]&1)==0){c[l+4>>2]=0;a[l]=0}else{c[c[l+8>>2]>>2]=0;c[l+4>>2]=0}Re(l,0);c[l+0>>2]=c[q+0>>2];c[l+4>>2]=c[q+4>>2];c[l+8>>2]=c[q+8>>2];c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;Oe(q)}else{oc[c[C+40>>2]&63](r,D);C=c[r>>2]|0;a[f]=C;a[f+1|0]=C>>8;a[f+2|0]=C>>16;a[f+3|0]=C>>24;oc[c[(c[D>>2]|0)+28>>2]&63](s,D);if((a[l]&1)==0){c[l+4>>2]=0;a[l]=0}else{c[c[l+8>>2]>>2]=0;c[l+4>>2]=0}Re(l,0);c[l+0>>2]=c[s+0>>2];c[l+4>>2]=c[s+4>>2];c[l+8>>2]=c[s+8>>2];c[s+0>>2]=0;c[s+4>>2]=0;c[s+8>>2]=0;Oe(s)}c[g>>2]=qc[c[(c[D>>2]|0)+12>>2]&127](D)|0;c[h>>2]=qc[c[(c[D>>2]|0)+16>>2]&127](D)|0;oc[c[(c[D>>2]|0)+20>>2]&63](t,D);if((a[j]&1)==0){a[j+1|0]=0;a[j]=0}else{a[c[j+8>>2]|0]=0;c[j+4>>2]=0}He(j,0);c[j+0>>2]=c[t+0>>2];c[j+4>>2]=c[t+4>>2];c[j+8>>2]=c[t+8>>2];c[t+0>>2]=0;c[t+4>>2]=0;c[t+8>>2]=0;De(t);oc[c[(c[D>>2]|0)+24>>2]&63](u,D);if((a[k]&1)==0){c[k+4>>2]=0;a[k]=0}else{c[c[k+8>>2]>>2]=0;c[k+4>>2]=0}Re(k,0);c[k+0>>2]=c[u+0>>2];c[k+4>>2]=c[u+4>>2];c[k+8>>2]=c[u+8>>2];c[u+0>>2]=0;c[u+4>>2]=0;c[u+8>>2]=0;Oe(u);E=qc[c[(c[D>>2]|0)+36>>2]&127](D)|0;c[m>>2]=E;i=n;return}else{if(!((c[1560]|0)==-1)){c[o>>2]=6240;c[o+4>>2]=117;c[o+8>>2]=0;ye(6240,o,118)}o=(c[6244>>2]|0)+ -1|0;D=c[B+8>>2]|0;if(!((c[B+12>>2]|0)-D>>2>>>0>o>>>0)){F=Ya(4)|0;um(F);zb(F|0,14696,106)}B=c[D+(o<<2)>>2]|0;if((B|0)==0){F=Ya(4)|0;um(F);zb(F|0,14696,106)}F=c[B>>2]|0;if(d){oc[c[F+44>>2]&63](v,B);d=c[v>>2]|0;a[f]=d;a[f+1|0]=d>>8;a[f+2|0]=d>>16;a[f+3|0]=d>>24;oc[c[(c[B>>2]|0)+32>>2]&63](w,B);if((a[l]&1)==0){c[l+4>>2]=0;a[l]=0}else{c[c[l+8>>2]>>2]=0;c[l+4>>2]=0}Re(l,0);c[l+0>>2]=c[w+0>>2];c[l+4>>2]=c[w+4>>2];c[l+8>>2]=c[w+8>>2];c[w+0>>2]=0;c[w+4>>2]=0;c[w+8>>2]=0;Oe(w)}else{oc[c[F+40>>2]&63](x,B);F=c[x>>2]|0;a[f]=F;a[f+1|0]=F>>8;a[f+2|0]=F>>16;a[f+3|0]=F>>24;oc[c[(c[B>>2]|0)+28>>2]&63](y,B);if((a[l]&1)==0){c[l+4>>2]=0;a[l]=0}else{c[c[l+8>>2]>>2]=0;c[l+4>>2]=0}Re(l,0);c[l+0>>2]=c[y+0>>2];c[l+4>>2]=c[y+4>>2];c[l+8>>2]=c[y+8>>2];c[y+0>>2]=0;c[y+4>>2]=0;c[y+8>>2]=0;Oe(y)}c[g>>2]=qc[c[(c[B>>2]|0)+12>>2]&127](B)|0;c[h>>2]=qc[c[(c[B>>2]|0)+16>>2]&127](B)|0;oc[c[(c[B>>2]|0)+20>>2]&63](z,B);if((a[j]&1)==0){a[j+1|0]=0;a[j]=0}else{a[c[j+8>>2]|0]=0;c[j+4>>2]=0}He(j,0);c[j+0>>2]=c[z+0>>2];c[j+4>>2]=c[z+4>>2];c[j+8>>2]=c[z+8>>2];c[z+0>>2]=0;c[z+4>>2]=0;c[z+8>>2]=0;De(z);oc[c[(c[B>>2]|0)+24>>2]&63](A,B);if((a[k]&1)==0){c[k+4>>2]=0;a[k]=0}else{c[c[k+8>>2]>>2]=0;c[k+4>>2]=0}Re(k,0);c[k+0>>2]=c[A+0>>2];c[k+4>>2]=c[A+4>>2];c[k+8>>2]=c[A+8>>2];c[A+0>>2]=0;c[A+4>>2]=0;c[A+8>>2]=0;Oe(A);E=qc[c[(c[B>>2]|0)+36>>2]&127](B)|0;c[m>>2]=E;i=n;return}}function Jj(b,d,e,f,g,h,j,k,l,m,n,o,p,q,r){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;p=p|0;q=q|0;r=r|0;var s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0,la=0,ma=0,na=0,oa=0,pa=0,qa=0,ra=0,sa=0;s=i;c[e>>2]=b;t=q+4|0;u=q+8|0;v=(f&512|0)==0;w=p+4|0;x=p+8|0;y=(r|0)>0;z=o+1|0;A=o+8|0;B=o+4|0;C=g;g=0;while(1){switch(a[l+g|0]|0){case 3:{D=a[q]|0;E=(D&1)==0;if(E){F=(D&255)>>>1}else{F=c[t>>2]|0}if((F|0)==0){G=C}else{if(E){H=t}else{H=c[u>>2]|0}E=c[H>>2]|0;D=c[e>>2]|0;c[e>>2]=D+4;c[D>>2]=E;G=C}break};case 4:{E=c[e>>2]|0;D=k?C+4|0:C;a:do{if(D>>>0<h>>>0){I=D;while(1){J=I+4|0;if(!(ic[c[(c[j>>2]|0)+12>>2]&31](j,2048,c[I>>2]|0)|0)){K=I;break a}if(J>>>0<h>>>0){I=J}else{K=J;break}}}else{K=D}}while(0);if(y){if(K>>>0>D>>>0){I=c[e>>2]|0;J=K;L=r;while(1){M=J+ -4|0;N=I+4|0;c[I>>2]=c[M>>2];O=L+ -1|0;P=(O|0)>0;if(M>>>0>D>>>0&P){I=N;J=M;L=O}else{break}}c[e>>2]=N;if(P){Q=M;R=O;S=34}else{L=c[e>>2]|0;c[e>>2]=L+4;T=L;U=M}}else{Q=K;R=r;S=34}if((S|0)==34){S=0;L=zc[c[(c[j>>2]|0)+44>>2]&15](j,48)|0;J=c[e>>2]|0;I=J+4|0;c[e>>2]=I;if((R|0)>0){V=J;W=I;I=R;while(1){c[V>>2]=L;I=I+ -1|0;if((I|0)<=0){break}else{X=W;W=W+4|0;V=X}}c[e>>2]=J+(R+1<<2);T=J+(R<<2)|0;U=Q}else{T=J;U=Q}}c[T>>2]=m;Y=U}else{Y=K}if((Y|0)==(D|0)){V=zc[c[(c[j>>2]|0)+44>>2]&15](j,48)|0;W=c[e>>2]|0;I=W+4|0;c[e>>2]=I;c[W>>2]=V;Z=I}else{I=a[o]|0;V=(I&1)==0;if(V){_=(I&255)>>>1}else{_=c[B>>2]|0}if((_|0)==0){$=Y;aa=-1;ba=0;ca=0}else{if(V){da=z}else{da=c[A>>2]|0}$=Y;aa=a[da]|0;ba=0;ca=0}while(1){V=c[e>>2]|0;if((ca|0)==(aa|0)){I=V+4|0;c[e>>2]=I;c[V>>2]=n;W=ba+1|0;L=a[o]|0;X=(L&1)==0;if(X){ea=(L&255)>>>1}else{ea=c[B>>2]|0}if(W>>>0<ea>>>0){if(X){fa=z}else{fa=c[A>>2]|0}if((a[fa+W|0]|0)==127){ga=I;ha=-1;ia=W;ja=0}else{if(X){ka=z}else{ka=c[A>>2]|0}ga=I;ha=a[ka+W|0]|0;ia=W;ja=0}}else{ga=I;ha=aa;ia=W;ja=0}}else{ga=V;ha=aa;ia=ba;ja=ca}V=$+ -4|0;W=c[V>>2]|0;I=ga+4|0;c[e>>2]=I;c[ga>>2]=W;if((V|0)==(D|0)){Z=I;break}else{$=V;aa=ha;ba=ia;ca=ja+1|0}}}if((E|0)!=(Z|0)?(J=Z+ -4|0,J>>>0>E>>>0):0){V=E;I=J;while(1){J=c[V>>2]|0;c[V>>2]=c[I>>2];c[I>>2]=J;J=V+4|0;W=I+ -4|0;if(J>>>0<W>>>0){V=J;I=W}else{G=D;break}}}else{G=D}break};case 1:{c[d>>2]=c[e>>2];I=zc[c[(c[j>>2]|0)+44>>2]&15](j,32)|0;V=c[e>>2]|0;c[e>>2]=V+4;c[V>>2]=I;G=C;break};case 0:{c[d>>2]=c[e>>2];G=C;break};case 2:{I=a[p]|0;V=(I&1)==0;if(V){la=(I&255)>>>1}else{la=c[w>>2]|0}if((la|0)==0|v){G=C}else{if(V){ma=w;na=(I&255)>>>1}else{ma=c[x>>2]|0;na=c[w>>2]|0}I=ma+(na<<2)|0;V=c[e>>2]|0;if((ma|0)==(I|0)){oa=V}else{E=(ma+(na+ -1<<2)+(0-ma)|0)>>>2;W=V;J=ma;while(1){c[W>>2]=c[J>>2];X=J+4|0;if((X|0)==(I|0)){break}W=W+4|0;J=X}oa=V+(E+1<<2)|0}c[e>>2]=oa;G=C}break};default:{G=C}}g=g+1|0;if((g|0)==4){break}else{C=G}}G=a[q]|0;q=(G&1)==0;if(q){pa=(G&255)>>>1}else{pa=c[t>>2]|0}if(pa>>>0>1){if(q){qa=t;ra=(G&255)>>>1}else{qa=c[u>>2]|0;ra=c[t>>2]|0}t=qa+4|0;u=qa+(ra<<2)|0;G=c[e>>2]|0;if((t|0)==(u|0)){sa=G}else{q=(qa+(ra+ -1<<2)+(0-t)|0)>>>2;ra=G;qa=t;while(1){c[ra>>2]=c[qa>>2];qa=qa+4|0;if((qa|0)==(u|0)){break}else{ra=ra+4|0}}sa=G+(q+1<<2)|0}c[e>>2]=sa}sa=f&176;if((sa|0)==32){c[d>>2]=c[e>>2];i=s;return}else if((sa|0)==16){i=s;return}else{c[d>>2]=b;i=s;return}}function Kj(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0;d=i;i=i+496|0;k=d;l=d+12|0;m=d+40|0;n=d+44|0;o=d+48|0;p=d+16|0;q=d+28|0;r=d+52|0;s=d+64|0;t=d+72|0;u=d+472|0;v=d+476|0;w=d+480|0;Xe(l,g);x=c[l>>2]|0;if(!((c[1682]|0)==-1)){c[k>>2]=6728;c[k+4>>2]=117;c[k+8>>2]=0;ye(6728,k,118)}y=(c[6732>>2]|0)+ -1|0;z=c[x+8>>2]|0;if(!((c[x+12>>2]|0)-z>>2>>>0>y>>>0)){A=Ya(4)|0;um(A);zb(A|0,14696,106)}x=c[z+(y<<2)>>2]|0;if((x|0)==0){A=Ya(4)|0;um(A);zb(A|0,14696,106)}A=a[j]|0;y=(A&1)==0;if(y){B=(A&255)>>>1}else{B=c[j+4>>2]|0}if((B|0)==0){C=0}else{if(y){D=j+4|0}else{D=c[j+8>>2]|0}y=c[D>>2]|0;C=(y|0)==(zc[c[(c[x>>2]|0)+44>>2]&15](x,45)|0)}c[m>>2]=0;c[p+0>>2]=0;c[p+4>>2]=0;c[p+8>>2]=0;c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;c[r+0>>2]=0;c[r+4>>2]=0;c[r+8>>2]=0;Ij(f,C,l,m,n,o,p,q,r,s);f=a[j]|0;y=(f&1)==0;if(y){E=(f&255)>>>1}else{E=c[j+4>>2]|0}D=c[s>>2]|0;if((E|0)>(D|0)){if(y){F=(f&255)>>>1}else{F=c[j+4>>2]|0}y=a[r]|0;if((y&1)==0){G=(y&255)>>>1}else{G=c[r+4>>2]|0}y=a[q]|0;if((y&1)==0){H=(y&255)>>>1}else{H=c[q+4>>2]|0}I=G+(F-D<<1|1)+H|0}else{H=a[r]|0;if((H&1)==0){J=(H&255)>>>1}else{J=c[r+4>>2]|0}H=a[q]|0;if((H&1)==0){K=(H&255)>>>1}else{K=c[q+4>>2]|0}I=J+2+K|0}K=I+D|0;if(K>>>0>100){I=Pm(K<<2)|0;if((I|0)==0){$m()}else{L=I;M=I}}else{L=0;M=t}if((f&1)==0){N=j+4|0;O=(f&255)>>>1}else{N=c[j+8>>2]|0;O=c[j+4>>2]|0}Jj(M,u,v,c[g+4>>2]|0,N,N+(O<<2)|0,x,C,m,c[n>>2]|0,c[o>>2]|0,p,q,r,D);c[w>>2]=c[e>>2];e=c[u>>2]|0;u=c[v>>2]|0;c[k+0>>2]=c[w+0>>2];Fh(b,k,M,e,u,g,h);if((L|0)==0){Oe(r);Oe(q);De(p);P=c[l>>2]|0;ee(P)|0;i=d;return}Qm(L);Oe(r);Oe(q);De(p);P=c[l>>2]|0;ee(P)|0;i=d;return}function Lj(a){a=a|0;var b=0;b=i;Wm(a);i=b;return}function Mj(a){a=a|0;return}function Nj(b,d,e){b=b|0;d=d|0;e=e|0;var f=0;e=i;if((a[d]&1)==0){f=d+1|0}else{f=c[d+8>>2]|0}d=dc(f|0,1)|0;i=e;return d>>>((d|0)!=(-1|0)|0)|0}function Oj(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0;d=i;i=i+16|0;j=d;c[j+0>>2]=0;c[j+4>>2]=0;c[j+8>>2]=0;k=a[h]|0;if((k&1)==0){l=h+1|0;m=(k&255)>>>1;n=h+1|0}else{k=c[h+8>>2]|0;l=k;m=c[h+4>>2]|0;n=k}k=l+m|0;if(n>>>0<k>>>0){m=n;do{Ie(j,a[m]|0);m=m+1|0}while((m|0)!=(k|0));k=(e|0)==-1?-1:e<<1;if((a[j]&1)==0){o=k;p=9}else{q=k;r=c[j+8>>2]|0}}else{o=(e|0)==-1?-1:e<<1;p=9}if((p|0)==9){q=o;r=j+1|0}o=hb(q|0,f|0,g|0,r|0)|0;c[b+0>>2]=0;c[b+4>>2]=0;c[b+8>>2]=0;r=qn(o|0)|0;g=o+r|0;if((r|0)>0){s=o}else{De(j);i=d;return}do{Ie(b,a[s]|0);s=s+1|0}while((s|0)!=(g|0));De(j);i=d;return}function Pj(a,b){a=a|0;b=b|0;a=i;Yb(((b|0)==-1?-1:b<<1)|0)|0;i=a;return}function Qj(a){a=a|0;var b=0;b=i;Wm(a);i=b;return}function Rj(a){a=a|0;return}function Sj(b,d,e){b=b|0;d=d|0;e=e|0;var f=0;e=i;if((a[d]&1)==0){f=d+1|0}else{f=c[d+8>>2]|0}d=dc(f|0,1)|0;i=e;return d>>>((d|0)!=(-1|0)|0)|0}function Tj(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0;d=i;i=i+176|0;j=d;k=d+40|0;l=d+168|0;m=d+172|0;n=d+16|0;o=d+8|0;p=d+32|0;c[n+0>>2]=0;c[n+4>>2]=0;c[n+8>>2]=0;c[o+4>>2]=0;c[o>>2]=8392;q=a[h]|0;if((q&1)==0){r=h+4|0;s=(q&255)>>>1;t=h+4|0}else{q=c[h+8>>2]|0;r=q;s=c[h+4>>2]|0;t=q}q=r+(s<<2)|0;s=j;c[s>>2]=0;c[s+4>>2]=0;a:do{if(t>>>0<q>>>0){s=k+32|0;r=t;h=8392|0;while(1){c[m>>2]=r;u=(vc[c[h+12>>2]&15](o,j,r,q,m,k,s,l)|0)==2;v=c[m>>2]|0;if(u|(v|0)==(r|0)){break}if(k>>>0<(c[l>>2]|0)>>>0){u=k;do{Ie(n,a[u]|0);u=u+1|0}while(u>>>0<(c[l>>2]|0)>>>0);w=c[m>>2]|0}else{w=v}if(!(w>>>0<q>>>0)){break a}r=w;h=c[o>>2]|0}nj(7616)}}while(0);if((a[n]&1)==0){x=n+1|0}else{x=c[n+8>>2]|0}o=hb(((e|0)==-1?-1:e<<1)|0,f|0,g|0,x|0)|0;c[b+0>>2]=0;c[b+4>>2]=0;c[b+8>>2]=0;c[p+4>>2]=0;c[p>>2]=8496;x=qn(o|0)|0;g=o+x|0;f=j;c[f>>2]=0;c[f+4>>2]=0;if((x|0)<=0){De(n);i=d;return}x=g;f=k+128|0;e=o;o=8496|0;while(1){c[m>>2]=e;w=(vc[c[o+16>>2]&15](p,j,e,(x-e|0)>32?e+32|0:g,m,k,f,l)|0)==2;q=c[m>>2]|0;if(w|(q|0)==(e|0)){y=20;break}if(k>>>0<(c[l>>2]|0)>>>0){w=k;do{Se(b,c[w>>2]|0);w=w+4|0}while(w>>>0<(c[l>>2]|0)>>>0);z=c[m>>2]|0}else{z=q}if(!(z>>>0<g>>>0)){y=25;break}e=z;o=c[p>>2]|0}if((y|0)==20){nj(7616)}else if((y|0)==25){De(n);i=d;return}}function Uj(a,b){a=a|0;b=b|0;a=i;Yb(((b|0)==-1?-1:b<<1)|0)|0;i=a;return}function Vj(b){b=b|0;var d=0,e=0;d=i;c[b>>2]=6824;e=b+8|0;b=c[e>>2]|0;if((a[6632]|0)==0?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}if((b|0)==(c[1656]|0)){i=d;return}Ga(c[e>>2]|0);i=d;return}function Wj(a){a=a|0;a=Ya(8)|0;fe(a,6616);c[a>>2]=3664;zb(a|0,3704,14)}function Xj(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0;e=i;i=i+16|0;f=e;c[b+4>>2]=d+ -1;c[b>>2]=6656;d=b+8|0;g=b+12|0;h=b+136|0;j=b+24|0;a[h]=1;c[g>>2]=j;c[d>>2]=j;c[b+16>>2]=h;h=28;k=j;do{if((k|0)==0){l=0}else{c[k>>2]=0;l=c[g>>2]|0}k=l+4|0;c[g>>2]=k;h=h+ -1|0}while((h|0)!=0);Be(b+144|0,6640,1);h=c[d>>2]|0;d=c[g>>2]|0;if((d|0)!=(h|0)){c[g>>2]=d+(~((d+ -4+(0-h)|0)>>>2)<<2)}c[11548>>2]=0;c[2886]=5136;if(!((c[1290]|0)==-1)){c[f>>2]=5160;c[f+4>>2]=117;c[f+8>>2]=0;ye(5160,f,118)}Yj(b,11544,(c[5164>>2]|0)+ -1|0);c[11540>>2]=0;c[2884]=5176;if(!((c[1300]|0)==-1)){c[f>>2]=5200;c[f+4>>2]=117;c[f+8>>2]=0;ye(5200,f,118)}Yj(b,11536,(c[5204>>2]|0)+ -1|0);c[11524>>2]=0;c[2880]=6752;c[11528>>2]=0;a[11532|0]=0;c[11528>>2]=c[(Na()|0)>>2];if(!((c[1684]|0)==-1)){c[f>>2]=6736;c[f+4>>2]=117;c[f+8>>2]=0;ye(6736,f,118)}Yj(b,11520,(c[6740>>2]|0)+ -1|0);c[11516>>2]=0;c[2878]=7712;if(!((c[1682]|0)==-1)){c[f>>2]=6728;c[f+4>>2]=117;c[f+8>>2]=0;ye(6728,f,118)}Yj(b,11512,(c[6732>>2]|0)+ -1|0);c[11508>>2]=0;c[2876]=7928;if(!((c[1700]|0)==-1)){c[f>>2]=6800;c[f+4>>2]=117;c[f+8>>2]=0;ye(6800,f,118)}Yj(b,11504,(c[6804>>2]|0)+ -1|0);c[11492>>2]=0;c[2872]=6824;if((a[6632]|0)==0?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}c[11496>>2]=c[1656];if(!((c[1702]|0)==-1)){c[f>>2]=6808;c[f+4>>2]=117;c[f+8>>2]=0;ye(6808,f,118)}Yj(b,11488,(c[6812>>2]|0)+ -1|0);c[11484>>2]=0;c[2870]=8152;if(!((c[1716]|0)==-1)){c[f>>2]=6864;c[f+4>>2]=117;c[f+8>>2]=0;ye(6864,f,118)}Yj(b,11480,(c[6868>>2]|0)+ -1|0);c[11476>>2]=0;c[2868]=8272;if(!((c[1718]|0)==-1)){c[f>>2]=6872;c[f+4>>2]=117;c[f+8>>2]=0;ye(6872,f,118)}Yj(b,11472,(c[6876>>2]|0)+ -1|0);c[11452>>2]=0;c[2862]=6904;a[11456|0]=46;a[11457|0]=44;c[11460>>2]=0;c[11464>>2]=0;c[11468>>2]=0;if(!((c[1720]|0)==-1)){c[f>>2]=6880;c[f+4>>2]=117;c[f+8>>2]=0;ye(6880,f,118)}Yj(b,11448,(c[6884>>2]|0)+ -1|0);c[11420>>2]=0;c[2854]=6944;c[11424>>2]=46;c[11428>>2]=44;c[11432>>2]=0;c[11436>>2]=0;c[11440>>2]=0;if(!((c[1722]|0)==-1)){c[f>>2]=6888;c[f+4>>2]=117;c[f+8>>2]=0;ye(6888,f,118)}Yj(b,11416,(c[6892>>2]|0)+ -1|0);c[11412>>2]=0;c[2852]=5216;if(!((c[1318]|0)==-1)){c[f>>2]=5272;c[f+4>>2]=117;c[f+8>>2]=0;ye(5272,f,118)}Yj(b,11408,(c[5276>>2]|0)+ -1|0);c[11404>>2]=0;c[2850]=5336;if(!((c[1348]|0)==-1)){c[f>>2]=5392;c[f+4>>2]=117;c[f+8>>2]=0;ye(5392,f,118)}Yj(b,11400,(c[5396>>2]|0)+ -1|0);c[11396>>2]=0;c[2848]=5408;if(!((c[1364]|0)==-1)){c[f>>2]=5456;c[f+4>>2]=117;c[f+8>>2]=0;ye(5456,f,118)}Yj(b,11392,(c[5460>>2]|0)+ -1|0);c[11388>>2]=0;c[2846]=5472;if(!((c[1380]|0)==-1)){c[f>>2]=5520;c[f+4>>2]=117;c[f+8>>2]=0;ye(5520,f,118)}Yj(b,11384,(c[5524>>2]|0)+ -1|0);c[11380>>2]=0;c[2844]=6064;if(!((c[1528]|0)==-1)){c[f>>2]=6112;c[f+4>>2]=117;c[f+8>>2]=0;ye(6112,f,118)}Yj(b,11376,(c[6116>>2]|0)+ -1|0);c[11372>>2]=0;c[2842]=6128;if(!((c[1544]|0)==-1)){c[f>>2]=6176;c[f+4>>2]=117;c[f+8>>2]=0;ye(6176,f,118)}Yj(b,11368,(c[6180>>2]|0)+ -1|0);c[11364>>2]=0;c[2840]=6192;if(!((c[1560]|0)==-1)){c[f>>2]=6240;c[f+4>>2]=117;c[f+8>>2]=0;ye(6240,f,118)}Yj(b,11360,(c[6244>>2]|0)+ -1|0);c[11356>>2]=0;c[2838]=6256;if(!((c[1576]|0)==-1)){c[f>>2]=6304;c[f+4>>2]=117;c[f+8>>2]=0;ye(6304,f,118)}Yj(b,11352,(c[6308>>2]|0)+ -1|0);c[11348>>2]=0;c[2836]=6320;if(!((c[1586]|0)==-1)){c[f>>2]=6344;c[f+4>>2]=117;c[f+8>>2]=0;ye(6344,f,118)}Yj(b,11344,(c[6348>>2]|0)+ -1|0);c[11340>>2]=0;c[2834]=6400;if(!((c[1606]|0)==-1)){c[f>>2]=6424;c[f+4>>2]=117;c[f+8>>2]=0;ye(6424,f,118)}Yj(b,11336,(c[6428>>2]|0)+ -1|0);c[11332>>2]=0;c[2832]=6456;if(!((c[1620]|0)==-1)){c[f>>2]=6480;c[f+4>>2]=117;c[f+8>>2]=0;ye(6480,f,118)}Yj(b,11328,(c[6484>>2]|0)+ -1|0);c[11324>>2]=0;c[2830]=6504;if(!((c[1632]|0)==-1)){c[f>>2]=6528;c[f+4>>2]=117;c[f+8>>2]=0;ye(6528,f,118)}Yj(b,11320,(c[6532>>2]|0)+ -1|0);c[11308>>2]=0;c[2826]=5552;c[11312>>2]=5600;if(!((c[1408]|0)==-1)){c[f>>2]=5632;c[f+4>>2]=117;c[f+8>>2]=0;ye(5632,f,118)}Yj(b,11304,(c[5636>>2]|0)+ -1|0);c[11292>>2]=0;c[2822]=5704;c[11296>>2]=5752;if(!((c[1446]|0)==-1)){c[f>>2]=5784;c[f+4>>2]=117;c[f+8>>2]=0;ye(5784,f,118)}Yj(b,11288,(c[5788>>2]|0)+ -1|0);c[11276>>2]=0;c[2818]=7648;if((a[6632]|0)==0?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}c[11280>>2]=c[1656];c[2818]=6e3;if(!((c[1504]|0)==-1)){c[f>>2]=6016;c[f+4>>2]=117;c[f+8>>2]=0;ye(6016,f,118)}Yj(b,11272,(c[6020>>2]|0)+ -1|0);c[11260>>2]=0;c[2814]=7648;if((a[6632]|0)==0?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}c[11264>>2]=c[1656];c[2814]=6032;if(!((c[1512]|0)==-1)){c[f>>2]=6048;c[f+4>>2]=117;c[f+8>>2]=0;ye(6048,f,118)}Yj(b,11256,(c[6052>>2]|0)+ -1|0);c[11252>>2]=0;c[2812]=6544;if(!((c[1642]|0)==-1)){c[f>>2]=6568;c[f+4>>2]=117;c[f+8>>2]=0;ye(6568,f,118)}Yj(b,11248,(c[6572>>2]|0)+ -1|0);c[11244>>2]=0;c[2810]=6584;if((c[1652]|0)==-1){m=c[6612>>2]|0;n=m+ -1|0;Yj(b,11240,n);i=e;return}c[f>>2]=6608;c[f+4>>2]=117;c[f+8>>2]=0;ye(6608,f,118);m=c[6612>>2]|0;n=m+ -1|0;Yj(b,11240,n);i=e;return}function Yj(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;e=i;de(b);f=a+8|0;g=a+12|0;a=c[g>>2]|0;h=c[f>>2]|0;j=a-h>>2;do{if(!(j>>>0>d>>>0)){k=d+1|0;if(j>>>0<k>>>0){am(f,k-j|0);l=c[f>>2]|0;break}if(j>>>0>k>>>0?(m=h+(k<<2)|0,(a|0)!=(m|0)):0){c[g>>2]=a+(~((a+ -4+(0-m)|0)>>>2)<<2);l=h}else{l=h}}else{l=h}}while(0);h=c[l+(d<<2)>>2]|0;if((h|0)==0){n=l;o=n+(d<<2)|0;c[o>>2]=b;i=e;return}ee(h)|0;n=c[f>>2]|0;o=n+(d<<2)|0;c[o>>2]=b;i=e;return}function Zj(a){a=a|0;var b=0;b=i;_j(a);Wm(a);i=b;return}function _j(b){b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0;d=i;c[b>>2]=6656;e=b+12|0;f=c[e>>2]|0;g=b+8|0;h=c[g>>2]|0;if((f|0)!=(h|0)){j=f;f=h;h=0;while(1){k=c[f+(h<<2)>>2]|0;if((k|0)==0){l=j;m=f}else{ee(k)|0;l=c[e>>2]|0;m=c[g>>2]|0}h=h+1|0;if(!(h>>>0<l-m>>2>>>0)){break}else{j=l;f=m}}}De(b+144|0);m=c[g>>2]|0;if((m|0)==0){i=d;return}g=c[e>>2]|0;if((g|0)!=(m|0)){c[e>>2]=g+(~((g+ -4+(0-m)|0)>>>2)<<2)}if((b+24|0)==(m|0)){a[b+136|0]=0;i=d;return}else{Wm(m);i=d;return}}function $j(){var b=0,d=0,e=0;b=i;if((a[6712]|0)!=0){d=c[1676]|0;i=b;return d|0}if((Qa(6712)|0)==0){d=c[1676]|0;i=b;return d|0}if((a[6688]|0)==0?(Qa(6688)|0)!=0:0){Xj(11080,1);c[1668]=11080;c[1670]=6672;bb(6688)}e=c[c[1670]>>2]|0;c[1674]=e;de(e);c[1676]=6696;bb(6712);d=c[1676]|0;i=b;return d|0}function ak(a){a=a|0;var b=0,d=0;b=i;d=c[($j()|0)>>2]|0;c[a>>2]=d;de(d);i=b;return}function bk(a,b){a=a|0;b=b|0;var d=0,e=0;d=i;e=c[b>>2]|0;c[a>>2]=e;de(e);i=d;return}function ck(a){a=a|0;var b=0;b=i;ee(c[a>>2]|0)|0;i=b;return}function dk(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0;d=i;i=i+16|0;e=d;f=c[a>>2]|0;if(!((c[b>>2]|0)==-1)){c[e>>2]=b;c[e+4>>2]=117;c[e+8>>2]=0;ye(b,e,118)}e=(c[b+4>>2]|0)+ -1|0;b=c[f+8>>2]|0;if(!((c[f+12>>2]|0)-b>>2>>>0>e>>>0)){g=Ya(4)|0;um(g);zb(g|0,14696,106)}f=c[b+(e<<2)>>2]|0;if((f|0)==0){g=Ya(4)|0;um(g);zb(g|0,14696,106)}else{i=d;return f|0}return 0}function ek(a){a=a|0;var b=0;b=i;Wm(a);i=b;return}function fk(a){a=a|0;var b=0;b=i;if((a|0)==0){i=b;return}nc[c[(c[a>>2]|0)+4>>2]&255](a);i=b;return}function gk(a){a=a|0;var b=0;b=c[1680]|0;c[1680]=b+1;c[a+4>>2]=b+1;return}function hk(a){a=a|0;var b=0;b=i;Wm(a);i=b;return}function ik(a,d,e){a=a|0;d=d|0;e=e|0;var f=0;a=i;if(!(e>>>0<128)){f=0;i=a;return f|0}f=(b[(c[(Na()|0)>>2]|0)+(e<<1)>>1]&d)<<16>>16!=0;i=a;return f|0}function jk(a,d,e,f){a=a|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0;a=i;if((d|0)==(e|0)){g=d;i=a;return g|0}else{h=d;j=f}while(1){f=c[h>>2]|0;if(f>>>0<128){k=b[(c[(Na()|0)>>2]|0)+(f<<1)>>1]|0}else{k=0}b[j>>1]=k;f=h+4|0;if((f|0)==(e|0)){g=e;break}else{h=f;j=j+2|0}}i=a;return g|0}function kk(a,d,e,f){a=a|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0;a=i;a:do{if((e|0)==(f|0)){g=e}else{h=e;while(1){j=c[h>>2]|0;if(j>>>0<128?!((b[(c[(Na()|0)>>2]|0)+(j<<1)>>1]&d)<<16>>16==0):0){g=h;break a}j=h+4|0;if((j|0)==(f|0)){g=f;break}else{h=j}}}}while(0);i=a;return g|0}function lk(a,d,e,f){a=a|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0;a=i;a:do{if((e|0)==(f|0)){g=e}else{h=e;while(1){j=c[h>>2]|0;if(!(j>>>0<128)){g=h;break a}k=h+4|0;if((b[(c[(Na()|0)>>2]|0)+(j<<1)>>1]&d)<<16>>16==0){g=h;break a}if((k|0)==(f|0)){g=f;break}else{h=k}}}}while(0);i=a;return g|0}function mk(a,b){a=a|0;b=b|0;var d=0;a=i;if(!(b>>>0<128)){d=b;i=a;return d|0}d=c[(c[($a()|0)>>2]|0)+(b<<2)>>2]|0;i=a;return d|0}function nk(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0;a=i;if((b|0)==(d|0)){e=b;i=a;return e|0}else{f=b}while(1){b=c[f>>2]|0;if(b>>>0<128){g=c[(c[($a()|0)>>2]|0)+(b<<2)>>2]|0}else{g=b}c[f>>2]=g;b=f+4|0;if((b|0)==(d|0)){e=d;break}else{f=b}}i=a;return e|0}function ok(a,b){a=a|0;b=b|0;var d=0;a=i;if(!(b>>>0<128)){d=b;i=a;return d|0}d=c[(c[(Ab()|0)>>2]|0)+(b<<2)>>2]|0;i=a;return d|0}function pk(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0;a=i;if((b|0)==(d|0)){e=b;i=a;return e|0}else{f=b}while(1){b=c[f>>2]|0;if(b>>>0<128){g=c[(c[(Ab()|0)>>2]|0)+(b<<2)>>2]|0}else{g=b}c[f>>2]=g;b=f+4|0;if((b|0)==(d|0)){e=d;break}else{f=b}}i=a;return e|0}function qk(a,b){a=a|0;b=b|0;return b<<24>>24|0}function rk(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0;b=i;if((d|0)==(e|0)){g=d;i=b;return g|0}else{h=d;j=f}while(1){c[j>>2]=a[h]|0;f=h+1|0;if((f|0)==(e|0)){g=e;break}else{h=f;j=j+4|0}}i=b;return g|0}function sk(a,b,c){a=a|0;b=b|0;c=c|0;return(b>>>0<128?b&255:c)|0}function tk(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0;b=i;if((d|0)==(e|0)){h=d;i=b;return h|0}j=((e+ -4+(0-d)|0)>>>2)+1|0;k=d;l=g;while(1){g=c[k>>2]|0;a[l]=g>>>0<128?g&255:f;k=k+4|0;if((k|0)==(e|0)){break}else{l=l+1|0}}h=d+(j<<2)|0;i=b;return h|0}function uk(b){b=b|0;var d=0,e=0;d=i;c[b>>2]=6752;e=c[b+8>>2]|0;if((e|0)!=0?(a[b+12|0]|0)!=0:0){Xm(e)}Wm(b);i=d;return}function vk(b){b=b|0;var d=0,e=0;d=i;c[b>>2]=6752;e=c[b+8>>2]|0;if((e|0)!=0?(a[b+12|0]|0)!=0:0){Xm(e)}i=d;return}function wk(a,b){a=a|0;b=b|0;var d=0;a=i;if(!(b<<24>>24>-1)){d=b;i=a;return d|0}d=c[(c[($a()|0)>>2]|0)+((b&255)<<2)>>2]&255;i=a;return d|0}function xk(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;b=i;if((d|0)==(e|0)){f=d;i=b;return f|0}else{g=d}while(1){d=a[g]|0;if(d<<24>>24>-1){h=c[(c[($a()|0)>>2]|0)+(d<<24>>24<<2)>>2]&255}else{h=d}a[g]=h;d=g+1|0;if((d|0)==(e|0)){f=e;break}else{g=d}}i=b;return f|0}function yk(a,b){a=a|0;b=b|0;var d=0;a=i;if(!(b<<24>>24>-1)){d=b;i=a;return d|0}d=c[(c[(Ab()|0)>>2]|0)+(b<<24>>24<<2)>>2]&255;i=a;return d|0}function zk(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;b=i;if((d|0)==(e|0)){f=d;i=b;return f|0}else{g=d}while(1){d=a[g]|0;if(d<<24>>24>-1){h=c[(c[(Ab()|0)>>2]|0)+(d<<24>>24<<2)>>2]&255}else{h=d}a[g]=h;d=g+1|0;if((d|0)==(e|0)){f=e;break}else{g=d}}i=b;return f|0}function Ak(a,b){a=a|0;b=b|0;return b|0}function Bk(b,c,d,e){b=b|0;c=c|0;d=d|0;e=e|0;var f=0,g=0;b=i;if((c|0)==(d|0)){f=c}else{g=c;c=e;while(1){a[c]=a[g]|0;e=g+1|0;if((e|0)==(d|0)){f=d;break}else{g=e;c=c+1|0}}}i=b;return f|0}function Ck(a,b,c){a=a|0;b=b|0;c=c|0;return(b<<24>>24>-1?b:c)|0}function Dk(b,c,d,e,f){b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0;b=i;if((c|0)==(d|0)){g=c;i=b;return g|0}else{h=c;j=f}while(1){f=a[h]|0;a[j]=f<<24>>24>-1?f:e;f=h+1|0;if((f|0)==(d|0)){g=d;break}else{h=f;j=j+1|0}}i=b;return g|0}function Ek(a){a=a|0;var b=0;b=i;Wm(a);i=b;return}function Fk(a,b,d,e,f,g,h,i){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;c[f>>2]=d;c[i>>2]=g;return 3}function Gk(a,b,d,e,f,g,h,i){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;c[f>>2]=d;c[i>>2]=g;return 3}function Hk(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;c[f>>2]=d;return 3}function Ik(a){a=a|0;return 1}function Jk(a){a=a|0;return 1}function Kk(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;b=d-c|0;return(b>>>0<e>>>0?b:e)|0}function Lk(a){a=a|0;return 1}function Mk(a){a=a|0;var b=0;b=i;Vj(a);Wm(a);i=b;return}function Nk(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0;l=i;i=i+16|0;m=l;n=l+8|0;o=(e|0)==(f|0);a:do{if(!o){p=e;while(1){q=p+4|0;if((c[p>>2]|0)==0){r=p;break}if((q|0)==(f|0)){r=f;break}else{p=q}}c[k>>2]=h;c[g>>2]=e;if(!(o|(h|0)==(j|0))){p=j;q=b+8|0;s=e;t=h;u=r;while(1){v=d;w=c[v+4>>2]|0;x=m;c[x>>2]=c[v>>2];c[x+4>>2]=w;w=kb(c[q>>2]|0)|0;x=nm(t,g,u-s>>2,p-t|0,d)|0;if((w|0)!=0){kb(w|0)|0}if((x|0)==-1){y=10;break}else if((x|0)==0){z=1;y=33;break}w=(c[k>>2]|0)+x|0;c[k>>2]=w;if((w|0)==(j|0)){y=31;break}if((u|0)==(f|0)){A=c[g>>2]|0;B=w;C=f}else{w=kb(c[q>>2]|0)|0;x=mm(n,0,d)|0;if((w|0)!=0){kb(w|0)|0}if((x|0)==-1){z=2;y=33;break}w=c[k>>2]|0;if(x>>>0>(p-w|0)>>>0){z=1;y=33;break}b:do{if((x|0)!=0){v=w;D=x;E=n;while(1){F=a[E]|0;c[k>>2]=v+1;a[v]=F;F=D+ -1|0;if((F|0)==0){break b}v=c[k>>2]|0;D=F;E=E+1|0}}}while(0);x=(c[g>>2]|0)+4|0;c[g>>2]=x;c:do{if((x|0)==(f|0)){G=f}else{w=x;while(1){E=w+4|0;if((c[w>>2]|0)==0){G=w;break c}if((E|0)==(f|0)){G=f;break}else{w=E}}}}while(0);A=x;B=c[k>>2]|0;C=G}if((A|0)==(f|0)|(B|0)==(j|0)){H=A;break a}else{s=A;t=B;u=C}}if((y|0)==10){c[k>>2]=t;d:do{if((s|0)==(c[g>>2]|0)){I=s}else{u=s;p=t;while(1){w=c[u>>2]|0;E=kb(c[q>>2]|0)|0;D=mm(p,w,m)|0;if((E|0)!=0){kb(E|0)|0}if((D|0)==-1){I=u;break d}E=(c[k>>2]|0)+D|0;c[k>>2]=E;D=u+4|0;if((D|0)==(c[g>>2]|0)){I=D;break}else{u=D;p=E}}}}while(0);c[g>>2]=I;z=2;i=l;return z|0}else if((y|0)==31){H=c[g>>2]|0;break}else if((y|0)==33){i=l;return z|0}}else{H=e}}else{c[k>>2]=h;c[g>>2]=e;H=e}}while(0);z=(H|0)!=(f|0)|0;i=l;return z|0}function Ok(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0;l=i;i=i+16|0;m=l;n=(e|0)==(f|0);a:do{if(!n){o=e;while(1){p=o+1|0;if((a[o]|0)==0){q=o;break}if((p|0)==(f|0)){q=f;break}else{o=p}}c[k>>2]=h;c[g>>2]=e;if(!(n|(h|0)==(j|0))){o=j;p=b+8|0;r=e;s=h;t=q;while(1){u=d;v=c[u+4>>2]|0;w=m;c[w>>2]=c[u>>2];c[w+4>>2]=v;x=t;v=kb(c[p>>2]|0)|0;w=jm(s,g,x-r|0,o-s>>2,d)|0;if((v|0)!=0){kb(v|0)|0}if((w|0)==-1){y=10;break}else if((w|0)==0){z=2;y=32;break}v=(c[k>>2]|0)+(w<<2)|0;c[k>>2]=v;if((v|0)==(j|0)){y=30;break}w=c[g>>2]|0;if((t|0)==(f|0)){A=w;B=v;C=f}else{u=kb(c[p>>2]|0)|0;D=im(v,w,1,d)|0;if((u|0)!=0){kb(u|0)|0}if((D|0)!=0){z=2;y=32;break}c[k>>2]=(c[k>>2]|0)+4;D=(c[g>>2]|0)+1|0;c[g>>2]=D;b:do{if((D|0)==(f|0)){E=f}else{u=D;while(1){w=u+1|0;if((a[u]|0)==0){E=u;break b}if((w|0)==(f|0)){E=f;break}else{u=w}}}}while(0);A=D;B=c[k>>2]|0;C=E}if((A|0)==(f|0)|(B|0)==(j|0)){F=A;break a}else{r=A;s=B;t=C}}if((y|0)==10){c[k>>2]=s;c:do{if((r|0)!=(c[g>>2]|0)){t=r;o=s;while(1){u=kb(c[p>>2]|0)|0;w=im(o,t,x-t|0,m)|0;if((u|0)!=0){kb(u|0)|0}if((w|0)==-2){y=16;break}else if((w|0)==0){G=t+1|0}else if((w|0)==-1){y=15;break}else{G=t+w|0}w=(c[k>>2]|0)+4|0;c[k>>2]=w;if((G|0)==(c[g>>2]|0)){H=G;break c}else{t=G;o=w}}if((y|0)==15){c[g>>2]=t;z=2;i=l;return z|0}else if((y|0)==16){c[g>>2]=t;z=1;i=l;return z|0}}else{H=r}}while(0);c[g>>2]=H;z=(H|0)!=(f|0)|0;i=l;return z|0}else if((y|0)==30){F=c[g>>2]|0;break}else if((y|0)==32){i=l;return z|0}}else{F=e}}else{c[k>>2]=h;c[g>>2]=e;F=e}}while(0);z=(F|0)!=(f|0)|0;i=l;return z|0}function Pk(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0;h=i;i=i+16|0;j=h;c[g>>2]=e;e=kb(c[b+8>>2]|0)|0;b=mm(j,0,d)|0;if((e|0)!=0){kb(e|0)|0}if((b|0)==0|(b|0)==-1){k=2;i=h;return k|0}e=b+ -1|0;b=c[g>>2]|0;if(e>>>0>(f-b|0)>>>0){k=1;i=h;return k|0}if((e|0)==0){k=0;i=h;return k|0}else{l=b;m=e;n=j}while(1){j=a[n]|0;c[g>>2]=l+1;a[l]=j;j=m+ -1|0;if((j|0)==0){k=0;break}l=c[g>>2]|0;m=j;n=n+1|0}i=h;return k|0}function Qk(a){a=a|0;var b=0,d=0,e=0,f=0;b=i;d=a+8|0;a=kb(c[d>>2]|0)|0;e=lm(0,0,4)|0;if((a|0)!=0){kb(a|0)|0}if((e|0)==0){e=c[d>>2]|0;if((e|0)!=0){d=kb(e|0)|0;if((d|0)==0){f=0}else{kb(d|0)|0;f=0}}else{f=1}}else{f=-1}i=b;return f|0}function Rk(a){a=a|0;return 0}function Sk(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;g=i;if((f|0)==0|(d|0)==(e|0)){h=0;i=g;return h|0}j=e;k=a+8|0;a=d;d=0;l=0;while(1){m=kb(c[k>>2]|0)|0;n=hm(a,j-a|0,b)|0;if((m|0)!=0){kb(m|0)|0}if((n|0)==-2|(n|0)==-1){h=d;o=9;break}else if((n|0)==0){p=a+1|0;q=1}else{p=a+n|0;q=n}n=q+d|0;m=l+1|0;if(m>>>0>=f>>>0|(p|0)==(e|0)){h=n;o=9;break}else{a=p;d=n;l=m}}if((o|0)==9){i=g;return h|0}return 0}function Tk(a){a=a|0;var b=0,d=0,e=0;b=i;d=c[a+8>>2]|0;if((d|0)!=0){a=kb(d|0)|0;if((a|0)==0){e=4}else{kb(a|0)|0;e=4}}else{e=1}i=b;return e|0}function Uk(a){a=a|0;var b=0;b=i;Wm(a);i=b;return}function Vk(a,b,d,e,f,g,h,j){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0;b=i;i=i+16|0;a=b+4|0;k=b;c[a>>2]=d;c[k>>2]=g;l=Wk(d,e,a,g,h,k,1114111,0)|0;c[f>>2]=d+((c[a>>2]|0)-d>>1<<1);c[j>>2]=g+((c[k>>2]|0)-g);i=b;return l|0}function Wk(d,f,g,h,j,k,l,m){d=d|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0;n=i;c[g>>2]=d;c[k>>2]=h;do{if((m&2|0)!=0){if((j-h|0)<3){o=1;i=n;return o|0}else{c[k>>2]=h+1;a[h]=-17;d=c[k>>2]|0;c[k>>2]=d+1;a[d]=-69;d=c[k>>2]|0;c[k>>2]=d+1;a[d]=-65;break}}}while(0);h=f;m=c[g>>2]|0;if(!(m>>>0<f>>>0)){o=0;i=n;return o|0}d=j;j=m;a:while(1){m=b[j>>1]|0;p=m&65535;if(p>>>0>l>>>0){o=2;q=26;break}do{if((m&65535)<128){r=c[k>>2]|0;if((d-r|0)<1){o=1;q=26;break a}c[k>>2]=r+1;a[r]=m}else{if((m&65535)<2048){r=c[k>>2]|0;if((d-r|0)<2){o=1;q=26;break a}c[k>>2]=r+1;a[r]=p>>>6|192;r=c[k>>2]|0;c[k>>2]=r+1;a[r]=p&63|128;break}if((m&65535)<55296){r=c[k>>2]|0;if((d-r|0)<3){o=1;q=26;break a}c[k>>2]=r+1;a[r]=p>>>12|224;r=c[k>>2]|0;c[k>>2]=r+1;a[r]=p>>>6&63|128;r=c[k>>2]|0;c[k>>2]=r+1;a[r]=p&63|128;break}if(!((m&65535)<56320)){if((m&65535)<57344){o=2;q=26;break a}r=c[k>>2]|0;if((d-r|0)<3){o=1;q=26;break a}c[k>>2]=r+1;a[r]=p>>>12|224;r=c[k>>2]|0;c[k>>2]=r+1;a[r]=p>>>6&63|128;r=c[k>>2]|0;c[k>>2]=r+1;a[r]=p&63|128;break}if((h-j|0)<4){o=1;q=26;break a}r=j+2|0;s=e[r>>1]|0;if((s&64512|0)!=56320){o=2;q=26;break a}if((d-(c[k>>2]|0)|0)<4){o=1;q=26;break a}t=p&960;if(((t<<10)+65536|p<<10&64512|s&1023)>>>0>l>>>0){o=2;q=26;break a}c[g>>2]=r;r=(t>>>6)+1|0;t=c[k>>2]|0;c[k>>2]=t+1;a[t]=r>>>2|240;t=c[k>>2]|0;c[k>>2]=t+1;a[t]=p>>>2&15|r<<4&48|128;r=c[k>>2]|0;c[k>>2]=r+1;a[r]=p<<4&48|s>>>6&15|128;r=c[k>>2]|0;c[k>>2]=r+1;a[r]=s&63|128}}while(0);p=(c[g>>2]|0)+2|0;c[g>>2]=p;if(p>>>0<f>>>0){j=p}else{o=0;q=26;break}}if((q|0)==26){i=n;return o|0}return 0}function Xk(a,b,d,e,f,g,h,j){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0;b=i;i=i+16|0;a=b+4|0;k=b;c[a>>2]=d;c[k>>2]=g;l=Yk(d,e,a,g,h,k,1114111,0)|0;c[f>>2]=d+((c[a>>2]|0)-d);c[j>>2]=g+((c[k>>2]|0)-g>>1<<1);i=b;return l|0}function Yk(e,f,g,h,j,k,l,m){e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0;n=i;c[g>>2]=e;c[k>>2]=h;h=c[g>>2]|0;if(((((m&4|0)!=0?(f-h|0)>2:0)?(a[h]|0)==-17:0)?(a[h+1|0]|0)==-69:0)?(a[h+2|0]|0)==-65:0){m=h+3|0;c[g>>2]=m;o=m}else{o=h}a:do{if(o>>>0<f>>>0){h=f;m=j;e=c[k>>2]|0;p=o;b:while(1){if(!(e>>>0<j>>>0)){q=p;break a}r=a[p]|0;s=r&255;if(s>>>0>l>>>0){t=2;u=41;break}do{if(r<<24>>24>-1){b[e>>1]=r&255;c[g>>2]=p+1}else{if((r&255)<194){t=2;u=41;break b}if((r&255)<224){if((h-p|0)<2){t=1;u=41;break b}v=d[p+1|0]|0;if((v&192|0)!=128){t=2;u=41;break b}w=v&63|s<<6&1984;if(w>>>0>l>>>0){t=2;u=41;break b}b[e>>1]=w;c[g>>2]=p+2;break}if((r&255)<240){if((h-p|0)<3){t=1;u=41;break b}w=a[p+1|0]|0;v=a[p+2|0]|0;if((s|0)==224){if(!((w&-32)<<24>>24==-96)){t=2;u=41;break b}}else if((s|0)==237){if(!((w&-32)<<24>>24==-128)){t=2;u=41;break b}}else{if(!((w&-64)<<24>>24==-128)){t=2;u=41;break b}}x=v&255;if((x&192|0)!=128){t=2;u=41;break b}v=(w&255)<<6&4032|s<<12|x&63;if((v&65535)>>>0>l>>>0){t=2;u=41;break b}b[e>>1]=v;c[g>>2]=p+3;break}if(!((r&255)<245)){t=2;u=41;break b}if((h-p|0)<4){t=1;u=41;break b}v=a[p+1|0]|0;x=a[p+2|0]|0;w=a[p+3|0]|0;if((s|0)==240){if(!((v+112<<24>>24&255)<48)){t=2;u=41;break b}}else if((s|0)==244){if(!((v&-16)<<24>>24==-128)){t=2;u=41;break b}}else{if(!((v&-64)<<24>>24==-128)){t=2;u=41;break b}}y=x&255;if((y&192|0)!=128){t=2;u=41;break b}x=w&255;if((x&192|0)!=128){t=2;u=41;break b}if((m-e|0)<4){t=1;u=41;break b}w=s&7;z=v&255;v=y<<6;A=x&63;if((z<<12&258048|w<<18|v&4032|A)>>>0>l>>>0){t=2;u=41;break b}b[e>>1]=z<<2&60|y>>>4&3|((z>>>4&3|w<<2)<<6)+16320|55296;w=e+2|0;c[k>>2]=w;b[w>>1]=A|v&960|56320;c[g>>2]=(c[g>>2]|0)+4}}while(0);s=(c[k>>2]|0)+2|0;c[k>>2]=s;r=c[g>>2]|0;if(r>>>0<f>>>0){e=s;p=r}else{q=r;break a}}if((u|0)==41){i=n;return t|0}}else{q=o}}while(0);t=q>>>0<f>>>0|0;i=n;return t|0}function Zk(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;c[f>>2]=d;return 3}function _k(a){a=a|0;return 0}function $k(a){a=a|0;return 0}function al(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;b=i;a=bl(c,d,e,1114111,0)|0;i=b;return a|0}function bl(b,c,e,f,g){b=b|0;c=c|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0;h=i;if((((g&4|0)!=0?(c-b|0)>2:0)?(a[b]|0)==-17:0)?(a[b+1|0]|0)==-69:0){j=(a[b+2|0]|0)==-65?b+3|0:b}else{j=b}a:do{if(j>>>0<c>>>0&(e|0)!=0){g=c;k=j;l=0;b:while(1){m=a[k]|0;n=m&255;if(n>>>0>f>>>0){o=k;break a}do{if(m<<24>>24>-1){p=k+1|0;q=l}else{if((m&255)<194){o=k;break a}if((m&255)<224){if((g-k|0)<2){o=k;break a}r=d[k+1|0]|0;if((r&192|0)!=128){o=k;break a}if((r&63|n<<6&1984)>>>0>f>>>0){o=k;break a}p=k+2|0;q=l;break}if((m&255)<240){s=k;if((g-s|0)<3){o=k;break a}r=a[k+1|0]|0;t=a[k+2|0]|0;if((n|0)==237){if(!((r&-32)<<24>>24==-128)){u=23;break b}}else if((n|0)==224){if(!((r&-32)<<24>>24==-96)){u=21;break b}}else{if(!((r&-64)<<24>>24==-128)){u=25;break b}}v=t&255;if((v&192|0)!=128){o=k;break a}if(((r&255)<<6&4032|n<<12&61440|v&63)>>>0>f>>>0){o=k;break a}p=k+3|0;q=l;break}if(!((m&255)<245)){o=k;break a}w=k;if((g-w|0)<4){o=k;break a}if((e-l|0)>>>0<2){o=k;break a}v=a[k+1|0]|0;r=a[k+2|0]|0;t=a[k+3|0]|0;if((n|0)==240){if(!((v+112<<24>>24&255)<48)){u=34;break b}}else if((n|0)==244){if(!((v&-16)<<24>>24==-128)){u=36;break b}}else{if(!((v&-64)<<24>>24==-128)){u=38;break b}}x=r&255;if((x&192|0)!=128){o=k;break a}r=t&255;if((r&192|0)!=128){o=k;break a}if(((v&255)<<12&258048|n<<18&1835008|x<<6&4032|r&63)>>>0>f>>>0){o=k;break a}p=k+4|0;q=l+1|0}}while(0);n=q+1|0;if(p>>>0<c>>>0&n>>>0<e>>>0){k=p;l=n}else{o=p;break a}}if((u|0)==21){y=s-b|0;i=h;return y|0}else if((u|0)==23){y=s-b|0;i=h;return y|0}else if((u|0)==25){y=s-b|0;i=h;return y|0}else if((u|0)==34){y=w-b|0;i=h;return y|0}else if((u|0)==36){y=w-b|0;i=h;return y|0}else if((u|0)==38){y=w-b|0;i=h;return y|0}}else{o=j}}while(0);y=o-b|0;i=h;return y|0}function cl(a){a=a|0;return 4}function dl(a){a=a|0;var b=0;b=i;Wm(a);i=b;return}function el(a,b,d,e,f,g,h,j){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0;b=i;i=i+16|0;a=b+4|0;k=b;c[a>>2]=d;c[k>>2]=g;l=fl(d,e,a,g,h,k,1114111,0)|0;c[f>>2]=d+((c[a>>2]|0)-d>>2<<2);c[j>>2]=g+((c[k>>2]|0)-g);i=b;return l|0}function fl(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0;l=i;c[e>>2]=b;c[h>>2]=f;do{if((k&2|0)!=0){if((g-f|0)<3){m=1;i=l;return m|0}else{c[h>>2]=f+1;a[f]=-17;b=c[h>>2]|0;c[h>>2]=b+1;a[b]=-69;b=c[h>>2]|0;c[h>>2]=b+1;a[b]=-65;break}}}while(0);f=c[e>>2]|0;if(!(f>>>0<d>>>0)){m=0;i=l;return m|0}k=g;g=f;a:while(1){f=c[g>>2]|0;if((f&-2048|0)==55296|f>>>0>j>>>0){m=2;n=19;break}do{if(!(f>>>0<128)){if(f>>>0<2048){b=c[h>>2]|0;if((k-b|0)<2){m=1;n=19;break a}c[h>>2]=b+1;a[b]=f>>>6|192;b=c[h>>2]|0;c[h>>2]=b+1;a[b]=f&63|128;break}b=c[h>>2]|0;o=k-b|0;if(f>>>0<65536){if((o|0)<3){m=1;n=19;break a}c[h>>2]=b+1;a[b]=f>>>12|224;p=c[h>>2]|0;c[h>>2]=p+1;a[p]=f>>>6&63|128;p=c[h>>2]|0;c[h>>2]=p+1;a[p]=f&63|128;break}else{if((o|0)<4){m=1;n=19;break a}c[h>>2]=b+1;a[b]=f>>>18|240;b=c[h>>2]|0;c[h>>2]=b+1;a[b]=f>>>12&63|128;b=c[h>>2]|0;c[h>>2]=b+1;a[b]=f>>>6&63|128;b=c[h>>2]|0;c[h>>2]=b+1;a[b]=f&63|128;break}}else{b=c[h>>2]|0;if((k-b|0)<1){m=1;n=19;break a}c[h>>2]=b+1;a[b]=f}}while(0);f=(c[e>>2]|0)+4|0;c[e>>2]=f;if(f>>>0<d>>>0){g=f}else{m=0;n=19;break}}if((n|0)==19){i=l;return m|0}return 0}function gl(a,b,d,e,f,g,h,j){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0;b=i;i=i+16|0;a=b+4|0;k=b;c[a>>2]=d;c[k>>2]=g;l=hl(d,e,a,g,h,k,1114111,0)|0;c[f>>2]=d+((c[a>>2]|0)-d);c[j>>2]=g+((c[k>>2]|0)-g>>2<<2);i=b;return l|0}function hl(b,e,f,g,h,j,k,l){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;m=i;c[f>>2]=b;c[j>>2]=g;g=c[f>>2]|0;if(((((l&4|0)!=0?(e-g|0)>2:0)?(a[g]|0)==-17:0)?(a[g+1|0]|0)==-69:0)?(a[g+2|0]|0)==-65:0){l=g+3|0;c[f>>2]=l;n=l}else{n=g}a:do{if(n>>>0<e>>>0){g=e;l=c[j>>2]|0;b=n;while(1){if(!(l>>>0<h>>>0)){o=b;p=39;break a}q=a[b]|0;r=q&255;do{if(q<<24>>24>-1){if(r>>>0>k>>>0){s=2;break a}c[l>>2]=r;c[f>>2]=b+1}else{if((q&255)<194){s=2;break a}if((q&255)<224){if((g-b|0)<2){s=1;break a}t=d[b+1|0]|0;if((t&192|0)!=128){s=2;break a}u=t&63|r<<6&1984;if(u>>>0>k>>>0){s=2;break a}c[l>>2]=u;c[f>>2]=b+2;break}if((q&255)<240){if((g-b|0)<3){s=1;break a}u=a[b+1|0]|0;t=a[b+2|0]|0;if((r|0)==237){if(!((u&-32)<<24>>24==-128)){s=2;break a}}else if((r|0)==224){if(!((u&-32)<<24>>24==-96)){s=2;break a}}else{if(!((u&-64)<<24>>24==-128)){s=2;break a}}v=t&255;if((v&192|0)!=128){s=2;break a}t=(u&255)<<6&4032|r<<12&61440|v&63;if(t>>>0>k>>>0){s=2;break a}c[l>>2]=t;c[f>>2]=b+3;break}if(!((q&255)<245)){s=2;break a}if((g-b|0)<4){s=1;break a}t=a[b+1|0]|0;v=a[b+2|0]|0;u=a[b+3|0]|0;if((r|0)==240){if(!((t+112<<24>>24&255)<48)){s=2;break a}}else if((r|0)==244){if(!((t&-16)<<24>>24==-128)){s=2;break a}}else{if(!((t&-64)<<24>>24==-128)){s=2;break a}}w=v&255;if((w&192|0)!=128){s=2;break a}v=u&255;if((v&192|0)!=128){s=2;break a}u=(t&255)<<12&258048|r<<18&1835008|w<<6&4032|v&63;if(u>>>0>k>>>0){s=2;break a}c[l>>2]=u;c[f>>2]=b+4}}while(0);r=(c[j>>2]|0)+4|0;c[j>>2]=r;q=c[f>>2]|0;if(q>>>0<e>>>0){l=r;b=q}else{o=q;p=39;break}}}else{o=n;p=39}}while(0);if((p|0)==39){s=o>>>0<e>>>0|0}i=m;return s|0}function il(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;c[f>>2]=d;return 3}function jl(a){a=a|0;return 0}function kl(a){a=a|0;return 0}function ll(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;b=i;a=ml(c,d,e,1114111,0)|0;i=b;return a|0}function ml(b,c,e,f,g){b=b|0;c=c|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;h=i;if((((g&4|0)!=0?(c-b|0)>2:0)?(a[b]|0)==-17:0)?(a[b+1|0]|0)==-69:0){j=(a[b+2|0]|0)==-65?b+3|0:b}else{j=b}a:do{if(j>>>0<c>>>0&(e|0)!=0){g=c;k=j;l=1;b:while(1){m=a[k]|0;n=m&255;do{if(m<<24>>24>-1){if(n>>>0>f>>>0){o=k;break a}p=k+1|0}else{if((m&255)<194){o=k;break a}if((m&255)<224){if((g-k|0)<2){o=k;break a}q=d[k+1|0]|0;if((q&192|0)!=128){o=k;break a}if((q&63|n<<6&1984)>>>0>f>>>0){o=k;break a}p=k+2|0;break}if((m&255)<240){r=k;if((g-r|0)<3){o=k;break a}q=a[k+1|0]|0;s=a[k+2|0]|0;if((n|0)==237){if(!((q&-32)<<24>>24==-128)){t=23;break b}}else if((n|0)==224){if(!((q&-32)<<24>>24==-96)){t=21;break b}}else{if(!((q&-64)<<24>>24==-128)){t=25;break b}}u=s&255;if((u&192|0)!=128){o=k;break a}if(((q&255)<<6&4032|n<<12&61440|u&63)>>>0>f>>>0){o=k;break a}p=k+3|0;break}if(!((m&255)<245)){o=k;break a}v=k;if((g-v|0)<4){o=k;break a}u=a[k+1|0]|0;q=a[k+2|0]|0;s=a[k+3|0]|0;if((n|0)==240){if(!((u+112<<24>>24&255)<48)){t=33;break b}}else if((n|0)==244){if(!((u&-16)<<24>>24==-128)){t=35;break b}}else{if(!((u&-64)<<24>>24==-128)){t=37;break b}}w=q&255;if((w&192|0)!=128){o=k;break a}q=s&255;if((q&192|0)!=128){o=k;break a}if(((u&255)<<12&258048|n<<18&1835008|w<<6&4032|q&63)>>>0>f>>>0){o=k;break a}p=k+4|0}}while(0);if(!(p>>>0<c>>>0&l>>>0<e>>>0)){o=p;break a}k=p;l=l+1|0}if((t|0)==21){x=r-b|0;i=h;return x|0}else if((t|0)==23){x=r-b|0;i=h;return x|0}else if((t|0)==25){x=r-b|0;i=h;return x|0}else if((t|0)==33){x=v-b|0;i=h;return x|0}else if((t|0)==35){x=v-b|0;i=h;return x|0}else if((t|0)==37){x=v-b|0;i=h;return x|0}}else{o=j}}while(0);x=o-b|0;i=h;return x|0}function nl(a){a=a|0;return 4}function ol(a){a=a|0;var b=0;b=i;Wm(a);i=b;return}function pl(a){a=a|0;var b=0;b=i;Wm(a);i=b;return}function ql(a){a=a|0;var b=0;b=i;c[a>>2]=6904;De(a+12|0);Wm(a);i=b;return}function rl(a){a=a|0;var b=0;b=i;c[a>>2]=6904;De(a+12|0);i=b;return}function sl(a){a=a|0;var b=0;b=i;c[a>>2]=6944;De(a+16|0);Wm(a);i=b;return}function tl(a){a=a|0;var b=0;b=i;c[a>>2]=6944;De(a+16|0);i=b;return}function ul(b){b=b|0;return a[b+8|0]|0}function vl(a){a=a|0;return c[a+8>>2]|0}function wl(b){b=b|0;return a[b+9|0]|0}function xl(a){a=a|0;return c[a+12>>2]|0}function yl(a,b){a=a|0;b=b|0;var c=0;c=i;Ae(a,b+12|0);i=c;return}function zl(a,b){a=a|0;b=b|0;var c=0;c=i;Ae(a,b+16|0);i=c;return}function Al(a,b){a=a|0;b=b|0;b=i;Be(a,6976,4);i=b;return}function Bl(a,b){a=a|0;b=b|0;b=i;Me(a,6984,pm(6984)|0);i=b;return}function Cl(a,b){a=a|0;b=b|0;b=i;Be(a,7008,5);i=b;return}function Dl(a,b){a=a|0;b=b|0;b=i;Me(a,7016,pm(7016)|0);i=b;return}function El(b){b=b|0;var d=0;b=i;if((a[7048]|0)!=0){d=c[1760]|0;i=b;return d|0}if((Qa(7048)|0)==0){d=c[1760]|0;i=b;return d|0}if((a[14248]|0)==0?(Qa(14248)|0)!=0:0){rn(14080,0,168)|0;Ua(121,0,p|0)|0;bb(14248)}Ee(14080,14256)|0;Ee(14092|0,14264)|0;Ee(14104|0,14272)|0;Ee(14116|0,14280)|0;Ee(14128|0,14296)|0;Ee(14140|0,14312)|0;Ee(14152|0,14320)|0;Ee(14164|0,14336)|0;Ee(14176|0,14344)|0;Ee(14188|0,14352)|0;Ee(14200|0,14360)|0;Ee(14212|0,14368)|0;Ee(14224|0,14376)|0;Ee(14236|0,14384)|0;c[1760]=14080;bb(7048);d=c[1760]|0;i=b;return d|0}function Fl(b){b=b|0;var d=0;b=i;if((a[7064]|0)!=0){d=c[1764]|0;i=b;return d|0}if((Qa(7064)|0)==0){d=c[1764]|0;i=b;return d|0}if((a[13712]|0)==0?(Qa(13712)|0)!=0:0){rn(13544,0,168)|0;Ua(122,0,p|0)|0;bb(13712)}Pe(13544,13720)|0;Pe(13556|0,13752)|0;Pe(13568|0,13784)|0;Pe(13580|0,13816)|0;Pe(13592|0,13856)|0;Pe(13604|0,13896)|0;Pe(13616|0,13928)|0;Pe(13628|0,13968)|0;Pe(13640|0,13984)|0;Pe(13652|0,14e3)|0;Pe(13664|0,14016)|0;Pe(13676|0,14032)|0;Pe(13688|0,14048)|0;Pe(13700|0,14064)|0;c[1764]=13544;bb(7064);d=c[1764]|0;i=b;return d|0}function Gl(b){b=b|0;var d=0;b=i;if((a[7080]|0)!=0){d=c[1768]|0;i=b;return d|0}if((Qa(7080)|0)==0){d=c[1768]|0;i=b;return d|0}if((a[13320]|0)==0?(Qa(13320)|0)!=0:0){rn(13032,0,288)|0;Ua(123,0,p|0)|0;bb(13320)}Ee(13032,13328)|0;Ee(13044|0,13336)|0;Ee(13056|0,13352)|0;Ee(13068|0,13360)|0;Ee(13080|0,13368)|0;Ee(13092|0,13376)|0;Ee(13104|0,13384)|0;Ee(13116|0,13392)|0;Ee(13128|0,13400)|0;Ee(13140|0,13416)|0;Ee(13152|0,13424)|0;Ee(13164|0,13440)|0;Ee(13176|0,13456)|0;Ee(13188|0,13464)|0;Ee(13200|0,13472)|0;Ee(13212|0,13480)|0;Ee(13224|0,13368)|0;Ee(13236|0,13488)|0;Ee(13248|0,13496)|0;Ee(13260|0,13504)|0;Ee(13272|0,13512)|0;Ee(13284|0,13520)|0;Ee(13296|0,13528)|0;Ee(13308|0,13536)|0;c[1768]=13032;bb(7080);d=c[1768]|0;i=b;return d|0}function Hl(b){b=b|0;var d=0;b=i;if((a[7096]|0)!=0){d=c[1772]|0;i=b;return d|0}if((Qa(7096)|0)==0){d=c[1772]|0;i=b;return d|0}if((a[12480]|0)==0?(Qa(12480)|0)!=0:0){rn(12192,0,288)|0;Ua(124,0,p|0)|0;bb(12480)}Pe(12192,12488)|0;Pe(12204|0,12520)|0;Pe(12216|0,12560)|0;Pe(12228|0,12584)|0;Pe(12240|0,12904)|0;Pe(12252|0,12608)|0;Pe(12264|0,12632)|0;Pe(12276|0,12656)|0;Pe(12288|0,12688)|0;Pe(12300|0,12728)|0;Pe(12312|0,12760)|0;Pe(12324|0,12800)|0;Pe(12336|0,12840)|0;Pe(12348|0,12856)|0;Pe(12360|0,12872)|0;Pe(12372|0,12888)|0;Pe(12384|0,12904)|0;Pe(12396|0,12920)|0;Pe(12408|0,12936)|0;Pe(12420|0,12952)|0;Pe(12432|0,12968)|0;Pe(12444|0,12984)|0;Pe(12456|0,13e3)|0;Pe(12468|0,13016)|0;c[1772]=12192;bb(7096);d=c[1772]|0;i=b;return d|0}function Il(b){b=b|0;var d=0;b=i;if((a[7112]|0)!=0){d=c[1776]|0;i=b;return d|0}if((Qa(7112)|0)==0){d=c[1776]|0;i=b;return d|0}if((a[12168]|0)==0?(Qa(12168)|0)!=0:0){rn(11880,0,288)|0;Ua(125,0,p|0)|0;bb(12168)}Ee(11880,12176)|0;Ee(11892|0,12184)|0;c[1776]=11880;bb(7112);d=c[1776]|0;i=b;return d|0}function Jl(b){b=b|0;var d=0;b=i;if((a[7128]|0)!=0){d=c[1780]|0;i=b;return d|0}if((Qa(7128)|0)==0){d=c[1780]|0;i=b;return d|0}if((a[11840]|0)==0?(Qa(11840)|0)!=0:0){rn(11552,0,288)|0;Ua(126,0,p|0)|0;bb(11840)}Pe(11552,11848)|0;Pe(11564|0,11864)|0;c[1780]=11552;bb(7128);d=c[1780]|0;i=b;return d|0}function Kl(b){b=b|0;b=i;if((a[7152]|0)==0?(Qa(7152)|0)!=0:0){Be(7136,7160,8);Ua(127,7136,p|0)|0;bb(7152)}i=b;return 7136}function Ll(b){b=b|0;b=i;if((a[7192]|0)!=0){i=b;return 7176}if((Qa(7192)|0)==0){i=b;return 7176}Me(7176,7200,pm(7200)|0);Ua(128,7176,p|0)|0;bb(7192);i=b;return 7176}function Ml(b){b=b|0;b=i;if((a[7256]|0)==0?(Qa(7256)|0)!=0:0){Be(7240,7264,8);Ua(127,7240,p|0)|0;bb(7256)}i=b;return 7240}function Nl(b){b=b|0;b=i;if((a[7296]|0)!=0){i=b;return 7280}if((Qa(7296)|0)==0){i=b;return 7280}Me(7280,7304,pm(7304)|0);Ua(128,7280,p|0)|0;bb(7296);i=b;return 7280}function Ol(b){b=b|0;b=i;if((a[7360]|0)==0?(Qa(7360)|0)!=0:0){Be(7344,7368,20);Ua(127,7344,p|0)|0;bb(7360)}i=b;return 7344}function Pl(b){b=b|0;b=i;if((a[7408]|0)!=0){i=b;return 7392}if((Qa(7408)|0)==0){i=b;return 7392}Me(7392,7416,pm(7416)|0);Ua(128,7392,p|0)|0;bb(7408);i=b;return 7392}function Ql(b){b=b|0;b=i;if((a[7520]|0)==0?(Qa(7520)|0)!=0:0){Be(7504,7528,11);Ua(127,7504,p|0)|0;bb(7520)}i=b;return 7504}function Rl(b){b=b|0;b=i;if((a[7560]|0)!=0){i=b;return 7544}if((Qa(7560)|0)==0){i=b;return 7544}Me(7544,7568,pm(7568)|0);Ua(128,7544,p|0)|0;bb(7560);i=b;return 7544}function Sl(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0.0,j=0,k=0,l=0.0;f=i;i=i+16|0;g=f;if((b|0)==(d|0)){c[e>>2]=4;h=0.0;i=f;return+h}j=db()|0;k=c[j>>2]|0;c[j>>2]=0;if((a[6632]|0)==0?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}l=+jn(b,g,c[1656]|0);b=c[j>>2]|0;if((b|0)==0){c[j>>2]=k}if((c[g>>2]|0)!=(d|0)){c[e>>2]=4;h=0.0;i=f;return+h}if((b|0)!=34){h=l;i=f;return+h}c[e>>2]=4;h=l;i=f;return+h}function Tl(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0.0,j=0,k=0,l=0.0;f=i;i=i+16|0;g=f;if((b|0)==(d|0)){c[e>>2]=4;h=0.0;i=f;return+h}j=db()|0;k=c[j>>2]|0;c[j>>2]=0;if((a[6632]|0)==0?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}l=+jn(b,g,c[1656]|0);b=c[j>>2]|0;if((b|0)==0){c[j>>2]=k}if((c[g>>2]|0)!=(d|0)){c[e>>2]=4;h=0.0;i=f;return+h}if((b|0)!=34){h=l;i=f;return+h}c[e>>2]=4;h=l;i=f;return+h}function Ul(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0.0,j=0,k=0,l=0.0;f=i;i=i+16|0;g=f;if((b|0)==(d|0)){c[e>>2]=4;h=0.0;i=f;return+h}j=db()|0;k=c[j>>2]|0;c[j>>2]=0;if((a[6632]|0)==0?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}l=+jn(b,g,c[1656]|0);b=c[j>>2]|0;if((b|0)==0){c[j>>2]=k}if((c[g>>2]|0)!=(d|0)){c[e>>2]=4;h=0.0;i=f;return+h}if((b|0)==34){c[e>>2]=4}h=l;i=f;return+h}function Vl(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;g=i;i=i+16|0;h=g;do{if((b|0)!=(d|0)){if((a[b]|0)==45){c[e>>2]=4;j=0;k=0;break}l=db()|0;m=c[l>>2]|0;c[l>>2]=0;if((a[6632]|0)==0?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}n=Rb(b|0,h|0,f|0,c[1656]|0)|0;o=c[l>>2]|0;if((o|0)==0){c[l>>2]=m}if((c[h>>2]|0)!=(d|0)){c[e>>2]=4;j=0;k=0;break}if((o|0)==34){c[e>>2]=4;j=-1;k=-1}else{j=I;k=n}}else{c[e>>2]=4;j=0;k=0}}while(0);I=j;i=g;return k|0}function Wl(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0;g=i;i=i+16|0;h=g;if((b|0)==(d|0)){c[e>>2]=4;j=0;i=g;return j|0}if((a[b]|0)==45){c[e>>2]=4;j=0;i=g;return j|0}k=db()|0;l=c[k>>2]|0;c[k>>2]=0;if((a[6632]|0)==0?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}m=Rb(b|0,h|0,f|0,c[1656]|0)|0;f=I;b=c[k>>2]|0;if((b|0)==0){c[k>>2]=l}if((c[h>>2]|0)!=(d|0)){c[e>>2]=4;j=0;i=g;return j|0}if((b|0)==34|(f>>>0>0|(f|0)==0&m>>>0>4294967295)){c[e>>2]=4;j=-1;i=g;return j|0}else{j=m;i=g;return j|0}return 0}function Xl(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0;g=i;i=i+16|0;h=g;if((b|0)==(d|0)){c[e>>2]=4;j=0;i=g;return j|0}if((a[b]|0)==45){c[e>>2]=4;j=0;i=g;return j|0}k=db()|0;l=c[k>>2]|0;c[k>>2]=0;if((a[6632]|0)==0?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}m=Rb(b|0,h|0,f|0,c[1656]|0)|0;f=I;b=c[k>>2]|0;if((b|0)==0){c[k>>2]=l}if((c[h>>2]|0)!=(d|0)){c[e>>2]=4;j=0;i=g;return j|0}if((b|0)==34|(f>>>0>0|(f|0)==0&m>>>0>4294967295)){c[e>>2]=4;j=-1;i=g;return j|0}else{j=m;i=g;return j|0}return 0}function Yl(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0;g=i;i=i+16|0;h=g;if((b|0)==(d|0)){c[e>>2]=4;j=0;i=g;return j|0}if((a[b]|0)==45){c[e>>2]=4;j=0;i=g;return j|0}k=db()|0;l=c[k>>2]|0;c[k>>2]=0;if((a[6632]|0)==0?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}m=Rb(b|0,h|0,f|0,c[1656]|0)|0;f=I;b=c[k>>2]|0;if((b|0)==0){c[k>>2]=l}if((c[h>>2]|0)!=(d|0)){c[e>>2]=4;j=0;i=g;return j|0}if((b|0)==34|(f>>>0>0|(f|0)==0&m>>>0>65535)){c[e>>2]=4;j=-1;i=g;return j|0}else{j=m&65535;i=g;return j|0}return 0}function Zl(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0;g=i;i=i+16|0;h=g;if((b|0)==(d|0)){c[e>>2]=4;j=0;k=0;I=j;i=g;return k|0}l=db()|0;m=c[l>>2]|0;c[l>>2]=0;if((a[6632]|0)==0?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}n=La(b|0,h|0,f|0,c[1656]|0)|0;f=I;b=c[l>>2]|0;if((b|0)==0){c[l>>2]=m}if((c[h>>2]|0)!=(d|0)){c[e>>2]=4;j=0;k=0;I=j;i=g;return k|0}if((b|0)==34){c[e>>2]=4;e=(f|0)>0|(f|0)==0&n>>>0>0;I=e?2147483647:-2147483648;i=g;return(e?-1:0)|0}else{j=f;k=n;I=j;i=g;return k|0}return 0}function _l(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0;g=i;i=i+16|0;h=g;if((b|0)==(d|0)){c[e>>2]=4;j=0;i=g;return j|0}k=db()|0;l=c[k>>2]|0;c[k>>2]=0;if((a[6632]|0)==0?(Qa(6632)|0)!=0:0){c[1656]=mb(2147483647,6640,0)|0;bb(6632)}m=La(b|0,h|0,f|0,c[1656]|0)|0;f=I;b=c[k>>2]|0;if((b|0)==0){c[k>>2]=l}if((c[h>>2]|0)!=(d|0)){c[e>>2]=4;j=0;i=g;return j|0}do{if((b|0)==34){c[e>>2]=4;if((f|0)>0|(f|0)==0&m>>>0>0){j=2147483647;i=g;return j|0}}else{if((f|0)<-1|(f|0)==-1&m>>>0<2147483648){c[e>>2]=4;break}if((f|0)>0|(f|0)==0&m>>>0>2147483647){c[e>>2]=4;j=2147483647;i=g;return j|0}else{j=m;i=g;return j|0}}}while(0);j=-2147483648;i=g;return j|0}function $l(a){a=a|0;var b=0,e=0,f=0,g=0,h=0;b=i;e=a+4|0;f=d[e]|d[e+1|0]<<8|d[e+2|0]<<16|d[e+3|0]<<24;g=e+4|0;e=d[g]|d[g+1|0]<<8|d[g+2|0]<<16|d[g+3|0]<<24;g=(c[a>>2]|0)+(e>>1)|0;if((e&1|0)==0){h=f;nc[h&255](g);i=b;return}else{h=c[(c[g>>2]|0)+f>>2]|0;nc[h&255](g);i=b;return}}function am(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0;e=i;f=b+8|0;g=b+4|0;h=c[g>>2]|0;j=c[f>>2]|0;k=h;if(!(j-k>>2>>>0<d>>>0)){l=d;m=h;do{if((m|0)==0){n=0}else{c[m>>2]=0;n=c[g>>2]|0}m=n+4|0;c[g>>2]=m;l=l+ -1|0}while((l|0)!=0);i=e;return}l=b+16|0;m=c[b>>2]|0;n=k-m>>2;k=n+d|0;if(k>>>0>1073741823){Wj(0)}h=j-m|0;if(h>>2>>>0<536870911){m=h>>1;h=m>>>0<k>>>0?k:m;if((h|0)!=0){m=b+128|0;if((a[m]|0)==0&h>>>0<29){a[m]=1;o=h;p=l}else{q=h;r=11}}else{o=0;p=0}}else{q=1073741823;r=11}if((r|0)==11){o=q;p=Um(q<<2)|0}q=d;d=p+(n<<2)|0;do{if((d|0)==0){s=0}else{c[d>>2]=0;s=d}d=s+4|0;q=q+ -1|0}while((q|0)!=0);q=c[b>>2]|0;s=(c[g>>2]|0)-q|0;r=p+(n-(s>>2)<<2)|0;on(r|0,q|0,s|0)|0;c[b>>2]=r;c[g>>2]=d;c[f>>2]=p+(o<<2);if((q|0)==0){i=e;return}if((l|0)==(q|0)){a[b+128|0]=0;i=e;return}else{Wm(q);i=e;return}}function bm(a){a=a|0;a=i;Oe(11828|0);Oe(11816|0);Oe(11804|0);Oe(11792|0);Oe(11780|0);Oe(11768|0);Oe(11756|0);Oe(11744|0);Oe(11732|0);Oe(11720|0);Oe(11708|0);Oe(11696|0);Oe(11684|0);Oe(11672|0);Oe(11660|0);Oe(11648|0);Oe(11636|0);Oe(11624|0);Oe(11612|0);Oe(11600|0);Oe(11588|0);Oe(11576|0);Oe(11564|0);Oe(11552);i=a;return}function cm(a){a=a|0;a=i;De(12156|0);De(12144|0);De(12132|0);De(12120|0);De(12108|0);De(12096|0);De(12084|0);De(12072|0);De(12060|0);De(12048|0);De(12036|0);De(12024|0);De(12012|0);De(12e3|0);De(11988|0);De(11976|0);De(11964|0);De(11952|0);De(11940|0);De(11928|0);De(11916|0);De(11904|0);De(11892|0);De(11880);i=a;return}function dm(a){a=a|0;a=i;Oe(12468|0);Oe(12456|0);Oe(12444|0);Oe(12432|0);Oe(12420|0);Oe(12408|0);Oe(12396|0);Oe(12384|0);Oe(12372|0);Oe(12360|0);Oe(12348|0);Oe(12336|0);Oe(12324|0);Oe(12312|0);Oe(12300|0);Oe(12288|0);Oe(12276|0);Oe(12264|0);Oe(12252|0);Oe(12240|0);Oe(12228|0);Oe(12216|0);Oe(12204|0);Oe(12192);i=a;return}function em(a){a=a|0;a=i;De(13308|0);De(13296|0);De(13284|0);De(13272|0);De(13260|0);De(13248|0);De(13236|0);De(13224|0);De(13212|0);De(13200|0);De(13188|0);De(13176|0);De(13164|0);De(13152|0);De(13140|0);De(13128|0);De(13116|0);De(13104|0);De(13092|0);De(13080|0);De(13068|0);De(13056|0);De(13044|0);De(13032);i=a;return}function fm(a){a=a|0;a=i;Oe(13700|0);Oe(13688|0);Oe(13676|0);Oe(13664|0);Oe(13652|0);Oe(13640|0);Oe(13628|0);Oe(13616|0);Oe(13604|0);Oe(13592|0);Oe(13580|0);Oe(13568|0);Oe(13556|0);Oe(13544);i=a;return}function gm(a){a=a|0;a=i;De(14236|0);De(14224|0);De(14212|0);De(14200|0);De(14188|0);De(14176|0);De(14164|0);De(14152|0);De(14140|0);De(14128|0);De(14116|0);De(14104|0);De(14092|0);De(14080);i=a;return}function hm(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0;d=i;e=im(0,a,b,(c|0)!=0?c:14600)|0;i=d;return e|0}function im(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;g=i;i=i+16|0;h=g;c[h>>2]=b;j=(f|0)==0?14608:f;f=c[j>>2]|0;a:do{if((d|0)==0){if((f|0)==0){k=0;i=g;return k|0}}else{if((b|0)==0){c[h>>2]=h;l=h}else{l=b}if((e|0)==0){k=-2;i=g;return k|0}do{if((f|0)==0){m=a[d]|0;n=m&255;if(m<<24>>24>-1){c[l>>2]=n;k=m<<24>>24!=0|0;i=g;return k|0}else{m=n+ -194|0;if(m>>>0>50){break a}o=e+ -1|0;p=c[14392+(m<<2)>>2]|0;q=d+1|0;break}}else{o=e;p=f;q=d}}while(0);b:do{if((o|0)==0){r=p}else{m=a[q]|0;n=(m&255)>>>3;if((n+ -16|n+(p>>26))>>>0>7){break a}else{s=o;t=m;u=p;v=q}while(1){v=v+1|0;u=(t&255)+ -128|u<<6;s=s+ -1|0;if((u|0)>=0){break}if((s|0)==0){r=u;break b}t=a[v]|0;if(((t&255)+ -128|0)>>>0>63){break a}}c[j>>2]=0;c[l>>2]=u;k=e-s|0;i=g;return k|0}}while(0);c[j>>2]=r;k=-2;i=g;return k|0}}while(0);c[j>>2]=0;c[(db()|0)>>2]=84;k=-1;i=g;return k|0}function jm(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;g=i;i=i+1040|0;h=g+8|0;j=g;k=c[b>>2]|0;c[j>>2]=k;l=(a|0)!=0;m=l?e:256;e=l?a:h;a:do{if((k|0)==0|(m|0)==0){n=d;o=m;p=k;q=0;r=e}else{a=d;s=m;t=k;u=0;v=e;while(1){w=a>>>2;x=w>>>0>=s>>>0;if(!(x|a>>>0>131)){n=a;o=s;p=t;q=u;r=v;break a}y=x?s:w;z=a-y|0;w=km(v,j,y,f)|0;if((w|0)==-1){break}if((v|0)==(h|0)){A=s;B=h}else{A=s-w|0;B=v+(w<<2)|0}y=w+u|0;w=c[j>>2]|0;if((w|0)==0|(A|0)==0){n=z;o=A;p=w;q=y;r=B;break a}else{a=z;s=A;t=w;u=y;v=B}}n=z;o=0;p=c[j>>2]|0;q=-1;r=v}}while(0);b:do{if((p|0)!=0?!((o|0)==0|(n|0)==0):0){z=n;B=o;A=p;h=q;e=r;while(1){C=im(e,A,z,f)|0;if((C+2|0)>>>0<3){break}k=(c[j>>2]|0)+C|0;c[j>>2]=k;m=B+ -1|0;d=h+1|0;if((m|0)==0|(z|0)==(C|0)){D=d;break b}else{z=z-C|0;B=m;A=k;h=d;e=e+4|0}}if((C|0)==0){c[j>>2]=0;D=h;break}else if((C|0)==-1){D=-1;break}else{c[f>>2]=0;D=h;break}}else{D=q}}while(0);if(!l){i=g;return D|0}c[b>>2]=c[j>>2];i=g;return D|0}function km(b,e,f,g){b=b|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0;h=i;j=c[e>>2]|0;if((g|0)!=0?(k=c[g>>2]|0,(k|0)!=0):0){if((b|0)==0){l=f;m=k;n=j;o=16}else{c[g>>2]=0;p=b;q=f;r=k;s=j;o=36}}else{if((b|0)==0){t=f;u=j;o=7}else{v=b;w=f;x=j;o=6}}a:while(1){if((o|0)==6){o=0;if((w|0)==0){y=f;o=53;break}else{z=v;A=w;B=x}while(1){j=a[B]|0;do{if(((j&255)+ -1|0)>>>0<127?(B&3|0)==0&A>>>0>3:0){k=z;g=A;C=B;while(1){D=c[C>>2]|0;if(((D+ -16843009|D)&-2139062144|0)!=0){o=30;break}c[k>>2]=D&255;c[k+4>>2]=d[C+1|0]|0;c[k+8>>2]=d[C+2|0]|0;E=C+4|0;F=k+16|0;c[k+12>>2]=d[C+3|0]|0;G=g+ -4|0;if(G>>>0>3){k=F;g=G;C=E}else{o=31;break}}if((o|0)==30){o=0;H=k;I=g;J=D&255;K=C;break}else if((o|0)==31){o=0;H=F;I=G;J=a[E]|0;K=E;break}}else{H=z;I=A;J=j;K=B}}while(0);L=J&255;if(!((L+ -1|0)>>>0<127)){break}c[H>>2]=L;j=I+ -1|0;if((j|0)==0){y=f;o=53;break a}else{z=H+4|0;A=j;B=K+1|0}}j=L+ -194|0;if(j>>>0>50){M=H;N=I;O=K;o=47;break}p=H;q=I;r=c[14392+(j<<2)>>2]|0;s=K+1|0;o=36;continue}else if((o|0)==7){o=0;j=a[u]|0;if(((j&255)+ -1|0)>>>0<127?(u&3|0)==0:0){P=c[u>>2]|0;if(((P+ -16843009|P)&-2139062144|0)==0){Q=t;R=u;while(1){S=R+4|0;T=Q+ -4|0;U=c[S>>2]|0;if(((U+ -16843009|U)&-2139062144|0)==0){Q=T;R=S}else{V=T;W=U;X=S;break}}}else{V=t;W=P;X=u}Y=V;Z=W&255;_=X}else{Y=t;Z=j;_=u}R=Z&255;if((R+ -1|0)>>>0<127){t=Y+ -1|0;u=_+1|0;o=7;continue}Q=R+ -194|0;if(Q>>>0>50){M=b;N=Y;O=_;o=47;break}l=Y;m=c[14392+(Q<<2)>>2]|0;n=_+1|0;o=16;continue}else if((o|0)==16){o=0;Q=(d[n]|0)>>>3;if((Q+ -16|Q+(m>>26))>>>0>7){o=17;break}Q=n+1|0;if((m&33554432|0)!=0){if(((d[Q]|0)+ -128|0)>>>0>63){o=20;break}R=n+2|0;if((m&524288|0)==0){$=R}else{if(((d[R]|0)+ -128|0)>>>0>63){o=23;break}$=n+3|0}}else{$=Q}t=l+ -1|0;u=$;o=7;continue}else if((o|0)==36){o=0;Q=d[s]|0;R=Q>>>3;if((R+ -16|R+(r>>26))>>>0>7){o=37;break}R=s+1|0;aa=Q+ -128|r<<6;if((aa|0)<0){Q=(d[R]|0)+ -128|0;if(Q>>>0>63){o=40;break}S=s+2|0;ba=Q|aa<<6;if((ba|0)<0){Q=(d[S]|0)+ -128|0;if(Q>>>0>63){o=43;break}ca=Q|ba<<6;da=s+3|0}else{ca=ba;da=S}}else{ca=aa;da=R}c[p>>2]=ca;v=p+4|0;w=q+ -1|0;x=da;o=6;continue}}if((o|0)==17){ea=b;fa=l;ga=m;ha=n+ -1|0;o=46}else if((o|0)==20){ea=b;fa=l;ga=m;ha=n+ -1|0;o=46}else if((o|0)==23){ea=b;fa=l;ga=m;ha=n+ -1|0;o=46}else if((o|0)==37){ea=p;fa=q;ga=r;ha=s+ -1|0;o=46}else if((o|0)==40){ea=p;fa=q;ga=aa;ha=s+ -1|0;o=46}else if((o|0)==43){ea=p;fa=q;ga=ba;ha=s+ -1|0;o=46}else if((o|0)==53){i=h;return y|0}if((o|0)==46){if((ga|0)==0){M=ea;N=fa;O=ha;o=47}else{ia=ea;ja=ha}}if((o|0)==47){if((a[O]|0)==0){if((M|0)!=0){c[M>>2]=0;c[e>>2]=0}y=f-N|0;i=h;return y|0}else{ia=M;ja=O}}c[(db()|0)>>2]=84;if((ia|0)==0){y=-1;i=h;return y|0}c[e>>2]=ja;y=-1;i=h;return y|0}function lm(b,e,f){b=b|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0;g=i;i=i+16|0;h=g;c[h>>2]=b;if((e|0)==0){j=0;i=g;return j|0}do{if((f|0)!=0){if((b|0)==0){c[h>>2]=h;k=h}else{k=b}l=a[e]|0;m=l&255;if(l<<24>>24>-1){c[k>>2]=m;j=l<<24>>24!=0|0;i=g;return j|0}l=m+ -194|0;if(!(l>>>0>50)){m=e+1|0;n=c[14392+(l<<2)>>2]|0;if(f>>>0<4?(n&-2147483648>>>((f*6|0)+ -6|0)|0)!=0:0){break}l=d[m]|0;m=l>>>3;if(!((m+ -16|m+(n>>26))>>>0>7)){m=l+ -128|n<<6;if((m|0)>=0){c[k>>2]=m;j=2;i=g;return j|0}n=(d[e+2|0]|0)+ -128|0;if(!(n>>>0>63)){l=n|m<<6;if((l|0)>=0){c[k>>2]=l;j=3;i=g;return j|0}m=(d[e+3|0]|0)+ -128|0;if(!(m>>>0>63)){c[k>>2]=m|l<<6;j=4;i=g;return j|0}}}}}}while(0);c[(db()|0)>>2]=84;j=-1;i=g;return j|0}function mm(b,d,e){b=b|0;d=d|0;e=e|0;var f=0;e=i;if((b|0)==0){f=1;i=e;return f|0}if(d>>>0<128){a[b]=d;f=1;i=e;return f|0}if(d>>>0<2048){a[b]=d>>>6|192;a[b+1|0]=d&63|128;f=2;i=e;return f|0}if(d>>>0<55296|(d+ -57344|0)>>>0<8192){a[b]=d>>>12|224;a[b+1|0]=d>>>6&63|128;a[b+2|0]=d&63|128;f=3;i=e;return f|0}if((d+ -65536|0)>>>0<1048576){a[b]=d>>>18|240;a[b+1|0]=d>>>12&63|128;a[b+2|0]=d>>>6&63|128;a[b+3|0]=d&63|128;f=4;i=e;return f|0}else{c[(db()|0)>>2]=84;f=-1;i=e;return f|0}return 0}function nm(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0;f=i;i=i+272|0;g=f+8|0;h=f;j=c[b>>2]|0;c[h>>2]=j;k=(a|0)!=0;l=k?e:256;e=k?a:g;a:do{if((j|0)==0|(l|0)==0){m=d;n=l;o=j;p=0;q=e}else{a=d;r=l;s=j;t=0;u=e;while(1){v=a>>>0>=r>>>0;if(!(v|a>>>0>32)){m=a;n=r;o=s;p=t;q=u;break a}w=v?r:a;x=a-w|0;v=om(u,h,w,0)|0;if((v|0)==-1){break}if((u|0)==(g|0)){y=r;z=g}else{y=r-v|0;z=u+v|0}w=v+t|0;v=c[h>>2]|0;if((v|0)==0|(y|0)==0){m=x;n=y;o=v;p=w;q=z;break a}else{a=x;r=y;s=v;t=w;u=z}}m=x;n=0;o=c[h>>2]|0;p=-1;q=u}}while(0);b:do{if((o|0)!=0?!((n|0)==0|(m|0)==0):0){x=m;z=n;y=o;g=p;e=q;while(1){A=mm(e,c[y>>2]|0,0)|0;if((A+1|0)>>>0<2){break}j=(c[h>>2]|0)+4|0;c[h>>2]=j;l=x+ -1|0;d=g+1|0;if((z|0)==(A|0)|(l|0)==0){B=d;break b}else{x=l;z=z-A|0;y=j;g=d;e=e+A|0}}if((A|0)==0){c[h>>2]=0;B=g}else{B=-1}}else{B=p}}while(0);if(!k){i=f;return B|0}c[b>>2]=c[h>>2];i=f;return B|0}function om(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0;f=i;i=i+16|0;g=f;if((b|0)==0){h=c[d>>2]|0;j=c[h>>2]|0;if((j|0)==0){k=0;i=f;return k|0}else{l=0;m=j;n=h}while(1){if(m>>>0>127){h=mm(g,m,0)|0;if((h|0)==-1){k=-1;o=26;break}else{p=h}}else{p=1}h=p+l|0;j=n+4|0;q=c[j>>2]|0;if((q|0)==0){k=h;o=26;break}else{l=h;m=q;n=j}}if((o|0)==26){i=f;return k|0}}a:do{if(e>>>0>3){n=b;m=e;l=c[d>>2]|0;while(1){p=c[l>>2]|0;if((p|0)==0){r=n;s=m;break a}if(p>>>0>127){j=mm(n,p,0)|0;if((j|0)==-1){k=-1;break}t=n+j|0;u=m-j|0;v=l}else{a[n]=p;t=n+1|0;u=m+ -1|0;v=c[d>>2]|0}p=v+4|0;c[d>>2]=p;if(u>>>0>3){n=t;m=u;l=p}else{r=t;s=u;break a}}i=f;return k|0}else{r=b;s=e}}while(0);b:do{if((s|0)!=0){b=r;u=s;t=c[d>>2]|0;while(1){v=c[t>>2]|0;if((v|0)==0){o=24;break}if(v>>>0>127){l=mm(g,v,0)|0;if((l|0)==-1){k=-1;o=26;break}if(l>>>0>u>>>0){o=20;break}mm(b,c[t>>2]|0,0)|0;w=b+l|0;x=u-l|0;y=t}else{a[b]=v;w=b+1|0;x=u+ -1|0;y=c[d>>2]|0}v=y+4|0;c[d>>2]=v;if((x|0)==0){z=0;break b}else{b=w;u=x;t=v}}if((o|0)==20){k=e-u|0;i=f;return k|0}else if((o|0)==24){a[b]=0;z=u;break}else if((o|0)==26){i=f;return k|0}}else{z=0}}while(0);c[d>>2]=0;k=e-z|0;i=f;return k|0}function pm(a){a=a|0;var b=0,d=0;b=i;d=a;while(1){if((c[d>>2]|0)==0){break}else{d=d+4|0}}i=b;return d-a>>2|0}function qm(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0;e=i;if((d|0)==0){i=e;return a|0}else{f=d;g=b;h=a}while(1){f=f+ -1|0;c[h>>2]=c[g>>2];if((f|0)==0){break}else{g=g+4|0;h=h+4|0}}i=e;return a|0}function rm(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0;e=i;f=(d|0)==0;if(a-b>>2>>>0<d>>>0){if(!f){g=d;do{g=g+ -1|0;c[a+(g<<2)>>2]=c[b+(g<<2)>>2]}while((g|0)!=0)}}else{if(!f){f=b;b=a;g=d;while(1){g=g+ -1|0;c[b>>2]=c[f>>2];if((g|0)==0){break}else{f=f+4|0;b=b+4|0}}}}i=e;return a|0}function sm(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0;e=i;if((d|0)!=0){f=d;d=a;while(1){f=f+ -1|0;c[d>>2]=b;if((f|0)==0){break}else{d=d+4|0}}}i=e;return a|0}function tm(a){a=a|0;return}function um(a){a=a|0;c[a>>2]=14624;return}function vm(a){a=a|0;var b=0;b=i;Pb(a|0);Wm(a);i=b;return}function wm(a){a=a|0;var b=0;b=i;Pb(a|0);i=b;return}function xm(a){a=a|0;return 14640}function ym(a){a=a|0;return}function zm(a){a=a|0;return}function Am(a){a=a|0;return}function Bm(a){a=a|0;var b=0;b=i;Wm(a);i=b;return}function Cm(a){a=a|0;var b=0;b=i;Wm(a);i=b;return}function Dm(a){a=a|0;var b=0;b=i;Wm(a);i=b;return}function Em(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0;e=i;i=i+64|0;f=e;if((a|0)==(b|0)){g=1;i=e;return g|0}if((b|0)==0){g=0;i=e;return g|0}h=Im(b,14752,14808,0)|0;if((h|0)==0){g=0;i=e;return g|0}b=f+0|0;j=b+56|0;do{c[b>>2]=0;b=b+4|0}while((b|0)<(j|0));c[f>>2]=h;c[f+8>>2]=a;c[f+12>>2]=-1;c[f+48>>2]=1;Bc[c[(c[h>>2]|0)+28>>2]&15](h,f,c[d>>2]|0,1);if((c[f+24>>2]|0)!=1){g=0;i=e;return g|0}c[d>>2]=c[f+16>>2];g=1;i=e;return g|0}function Fm(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0;g=i;if((c[d+8>>2]|0)!=(b|0)){i=g;return}b=d+16|0;h=c[b>>2]|0;if((h|0)==0){c[b>>2]=e;c[d+24>>2]=f;c[d+36>>2]=1;i=g;return}if((h|0)!=(e|0)){e=d+36|0;c[e>>2]=(c[e>>2]|0)+1;c[d+24>>2]=2;a[d+54|0]=1;i=g;return}e=d+24|0;if((c[e>>2]|0)!=2){i=g;return}c[e>>2]=f;i=g;return}function Gm(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0;g=i;if((b|0)!=(c[d+8>>2]|0)){h=c[b+8>>2]|0;Bc[c[(c[h>>2]|0)+28>>2]&15](h,d,e,f);i=g;return}h=d+16|0;b=c[h>>2]|0;if((b|0)==0){c[h>>2]=e;c[d+24>>2]=f;c[d+36>>2]=1;i=g;return}if((b|0)!=(e|0)){e=d+36|0;c[e>>2]=(c[e>>2]|0)+1;c[d+24>>2]=2;a[d+54|0]=1;i=g;return}e=d+24|0;if((c[e>>2]|0)!=2){i=g;return}c[e>>2]=f;i=g;return}function Hm(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;g=i;if((b|0)==(c[d+8>>2]|0)){h=d+16|0;j=c[h>>2]|0;if((j|0)==0){c[h>>2]=e;c[d+24>>2]=f;c[d+36>>2]=1;i=g;return}if((j|0)!=(e|0)){j=d+36|0;c[j>>2]=(c[j>>2]|0)+1;c[d+24>>2]=2;a[d+54|0]=1;i=g;return}j=d+24|0;if((c[j>>2]|0)!=2){i=g;return}c[j>>2]=f;i=g;return}j=c[b+12>>2]|0;h=b+(j<<3)+16|0;k=c[b+20>>2]|0;l=k>>8;if((k&1|0)==0){m=l}else{m=c[(c[e>>2]|0)+l>>2]|0}l=c[b+16>>2]|0;Bc[c[(c[l>>2]|0)+28>>2]&15](l,d,e+m|0,(k&2|0)!=0?f:2);if((j|0)<=1){i=g;return}j=d+54|0;k=b+24|0;while(1){b=c[k+4>>2]|0;m=b>>8;if((b&1|0)==0){n=m}else{n=c[(c[e>>2]|0)+m>>2]|0}m=c[k>>2]|0;Bc[c[(c[m>>2]|0)+28>>2]&15](m,d,e+n|0,(b&2|0)!=0?f:2);if((a[j]|0)!=0){o=16;break}b=k+8|0;if(b>>>0<h>>>0){k=b}else{o=16;break}}if((o|0)==16){i=g;return}}function Im(d,e,f,g){d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;h=i;i=i+64|0;j=h;k=c[d>>2]|0;l=d+(c[k+ -8>>2]|0)|0;m=c[k+ -4>>2]|0;c[j>>2]=f;c[j+4>>2]=d;c[j+8>>2]=e;c[j+12>>2]=g;g=j+16|0;e=j+20|0;d=j+24|0;k=j+28|0;n=j+32|0;o=j+40|0;p=(m|0)==(f|0);f=g+0|0;q=f+36|0;do{c[f>>2]=0;f=f+4|0}while((f|0)<(q|0));b[g+36>>1]=0;a[g+38|0]=0;if(p){c[j+48>>2]=1;jc[c[(c[m>>2]|0)+20>>2]&15](m,j,l,l,1,0);r=(c[d>>2]|0)==1?l:0;i=h;return r|0}yc[c[(c[m>>2]|0)+24>>2]&3](m,j,l,1,0);l=c[j+36>>2]|0;if((l|0)==0){if((c[o>>2]|0)!=1){r=0;i=h;return r|0}if((c[k>>2]|0)!=1){r=0;i=h;return r|0}r=(c[n>>2]|0)==1?c[e>>2]|0:0;i=h;return r|0}else if((l|0)==1){if((c[d>>2]|0)!=1){if((c[o>>2]|0)!=0){r=0;i=h;return r|0}if((c[k>>2]|0)!=1){r=0;i=h;return r|0}if((c[n>>2]|0)!=1){r=0;i=h;return r|0}}r=c[g>>2]|0;i=h;return r|0}else{r=0;i=h;return r|0}return 0}function Jm(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0;h=i;if((b|0)==(c[d+8>>2]|0)){if((c[d+4>>2]|0)!=(e|0)){i=h;return}j=d+28|0;if((c[j>>2]|0)==1){i=h;return}c[j>>2]=f;i=h;return}if((b|0)==(c[d>>2]|0)){if((c[d+16>>2]|0)!=(e|0)?(j=d+20|0,(c[j>>2]|0)!=(e|0)):0){c[d+32>>2]=f;k=d+44|0;if((c[k>>2]|0)==4){i=h;return}l=c[b+12>>2]|0;m=b+(l<<3)+16|0;a:do{if((l|0)>0){n=d+52|0;o=d+53|0;p=d+54|0;q=b+8|0;r=d+24|0;s=0;t=0;u=b+16|0;b:while(1){a[n]=0;a[o]=0;v=c[u+4>>2]|0;w=v>>8;if((v&1|0)==0){x=w}else{x=c[(c[e>>2]|0)+w>>2]|0}w=c[u>>2]|0;jc[c[(c[w>>2]|0)+20>>2]&15](w,d,e,e+x|0,2-(v>>>1&1)|0,g);if((a[p]|0)!=0){y=s;z=t;break}do{if((a[o]|0)!=0){if((a[n]|0)==0){if((c[q>>2]&1|0)==0){y=s;z=1;break b}else{A=s;B=1;break}}if((c[r>>2]|0)==1){C=27;break a}if((c[q>>2]&2|0)==0){C=27;break a}else{A=1;B=1}}else{A=s;B=t}}while(0);v=u+8|0;if(v>>>0<m>>>0){s=A;t=B;u=v}else{y=A;z=B;break}}if(y){D=z;C=26}else{E=z;C=23}}else{E=0;C=23}}while(0);if((C|0)==23){c[j>>2]=e;j=d+40|0;c[j>>2]=(c[j>>2]|0)+1;if((c[d+36>>2]|0)==1?(c[d+24>>2]|0)==2:0){a[d+54|0]=1;if(E){C=27}else{C=28}}else{D=E;C=26}}if((C|0)==26){if(D){C=27}else{C=28}}if((C|0)==27){c[k>>2]=3;i=h;return}else if((C|0)==28){c[k>>2]=4;i=h;return}}if((f|0)!=1){i=h;return}c[d+32>>2]=1;i=h;return}k=c[b+12>>2]|0;D=b+(k<<3)+16|0;E=c[b+20>>2]|0;j=E>>8;if((E&1|0)==0){F=j}else{F=c[(c[e>>2]|0)+j>>2]|0}j=c[b+16>>2]|0;yc[c[(c[j>>2]|0)+24>>2]&3](j,d,e+F|0,(E&2|0)!=0?f:2,g);E=b+24|0;if((k|0)<=1){i=h;return}k=c[b+8>>2]|0;if((k&2|0)==0?(b=d+36|0,(c[b>>2]|0)!=1):0){if((k&1|0)==0){k=d+54|0;F=E;while(1){if((a[k]|0)!=0){C=53;break}if((c[b>>2]|0)==1){C=53;break}j=c[F+4>>2]|0;z=j>>8;if((j&1|0)==0){G=z}else{G=c[(c[e>>2]|0)+z>>2]|0}z=c[F>>2]|0;yc[c[(c[z>>2]|0)+24>>2]&3](z,d,e+G|0,(j&2|0)!=0?f:2,g);j=F+8|0;if(j>>>0<D>>>0){F=j}else{C=53;break}}if((C|0)==53){i=h;return}}F=d+24|0;G=d+54|0;k=E;while(1){if((a[G]|0)!=0){C=53;break}if((c[b>>2]|0)==1?(c[F>>2]|0)==1:0){C=53;break}j=c[k+4>>2]|0;z=j>>8;if((j&1|0)==0){H=z}else{H=c[(c[e>>2]|0)+z>>2]|0}z=c[k>>2]|0;yc[c[(c[z>>2]|0)+24>>2]&3](z,d,e+H|0,(j&2|0)!=0?f:2,g);j=k+8|0;if(j>>>0<D>>>0){k=j}else{C=53;break}}if((C|0)==53){i=h;return}}k=d+54|0;H=E;while(1){if((a[k]|0)!=0){C=53;break}E=c[H+4>>2]|0;F=E>>8;if((E&1|0)==0){I=F}else{I=c[(c[e>>2]|0)+F>>2]|0}F=c[H>>2]|0;yc[c[(c[F>>2]|0)+24>>2]&3](F,d,e+I|0,(E&2|0)!=0?f:2,g);E=H+8|0;if(E>>>0<D>>>0){H=E}else{C=53;break}}if((C|0)==53){i=h;return}}function Km(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0;h=i;if((b|0)==(c[d+8>>2]|0)){if((c[d+4>>2]|0)!=(e|0)){i=h;return}j=d+28|0;if((c[j>>2]|0)==1){i=h;return}c[j>>2]=f;i=h;return}if((b|0)!=(c[d>>2]|0)){j=c[b+8>>2]|0;yc[c[(c[j>>2]|0)+24>>2]&3](j,d,e,f,g);i=h;return}if((c[d+16>>2]|0)!=(e|0)?(j=d+20|0,(c[j>>2]|0)!=(e|0)):0){c[d+32>>2]=f;k=d+44|0;if((c[k>>2]|0)==4){i=h;return}l=d+52|0;a[l]=0;m=d+53|0;a[m]=0;n=c[b+8>>2]|0;jc[c[(c[n>>2]|0)+20>>2]&15](n,d,e,e,1,g);if((a[m]|0)!=0){if((a[l]|0)==0){o=1;p=13}}else{o=0;p=13}do{if((p|0)==13){c[j>>2]=e;l=d+40|0;c[l>>2]=(c[l>>2]|0)+1;if((c[d+36>>2]|0)==1?(c[d+24>>2]|0)==2:0){a[d+54|0]=1;if(o){break}}else{p=16}if((p|0)==16?o:0){break}c[k>>2]=4;i=h;return}}while(0);c[k>>2]=3;i=h;return}if((f|0)!=1){i=h;return}c[d+32>>2]=1;i=h;return}function Lm(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0;g=i;if((c[d+8>>2]|0)==(b|0)){if((c[d+4>>2]|0)!=(e|0)){i=g;return}h=d+28|0;if((c[h>>2]|0)==1){i=g;return}c[h>>2]=f;i=g;return}if((c[d>>2]|0)!=(b|0)){i=g;return}if((c[d+16>>2]|0)!=(e|0)?(b=d+20|0,(c[b>>2]|0)!=(e|0)):0){c[d+32>>2]=f;c[b>>2]=e;e=d+40|0;c[e>>2]=(c[e>>2]|0)+1;if((c[d+36>>2]|0)==1?(c[d+24>>2]|0)==2:0){a[d+54|0]=1}c[d+44>>2]=4;i=g;return}if((f|0)!=1){i=g;return}c[d+32>>2]=1;i=g;return}function Mm(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;j=i;if((b|0)!=(c[d+8>>2]|0)){k=d+52|0;l=a[k]|0;m=d+53|0;n=a[m]|0;o=c[b+12>>2]|0;p=b+(o<<3)+16|0;a[k]=0;a[m]=0;q=c[b+20>>2]|0;r=q>>8;if((q&1|0)==0){s=r}else{s=c[(c[f>>2]|0)+r>>2]|0}r=c[b+16>>2]|0;jc[c[(c[r>>2]|0)+20>>2]&15](r,d,e,f+s|0,(q&2|0)!=0?g:2,h);a:do{if((o|0)>1){q=d+24|0;s=b+8|0;r=d+54|0;t=b+24|0;do{if((a[r]|0)!=0){break a}if((a[k]|0)==0){if((a[m]|0)!=0?(c[s>>2]&1|0)==0:0){break a}}else{if((c[q>>2]|0)==1){break a}if((c[s>>2]&2|0)==0){break a}}a[k]=0;a[m]=0;u=c[t+4>>2]|0;v=u>>8;if((u&1|0)==0){w=v}else{w=c[(c[f>>2]|0)+v>>2]|0}v=c[t>>2]|0;jc[c[(c[v>>2]|0)+20>>2]&15](v,d,e,f+w|0,(u&2|0)!=0?g:2,h);t=t+8|0}while(t>>>0<p>>>0)}}while(0);a[k]=l;a[m]=n;i=j;return}a[d+53|0]=1;if((c[d+4>>2]|0)!=(f|0)){i=j;return}a[d+52|0]=1;f=d+16|0;n=c[f>>2]|0;if((n|0)==0){c[f>>2]=e;c[d+24>>2]=g;c[d+36>>2]=1;if(!((c[d+48>>2]|0)==1&(g|0)==1)){i=j;return}a[d+54|0]=1;i=j;return}if((n|0)!=(e|0)){e=d+36|0;c[e>>2]=(c[e>>2]|0)+1;a[d+54|0]=1;i=j;return}e=d+24|0;n=c[e>>2]|0;if((n|0)==2){c[e>>2]=g;x=g}else{x=n}if(!((c[d+48>>2]|0)==1&(x|0)==1)){i=j;return}a[d+54|0]=1;i=j;return}function Nm(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0;j=i;if((b|0)!=(c[d+8>>2]|0)){k=c[b+8>>2]|0;jc[c[(c[k>>2]|0)+20>>2]&15](k,d,e,f,g,h);i=j;return}a[d+53|0]=1;if((c[d+4>>2]|0)!=(f|0)){i=j;return}a[d+52|0]=1;f=d+16|0;h=c[f>>2]|0;if((h|0)==0){c[f>>2]=e;c[d+24>>2]=g;c[d+36>>2]=1;if(!((c[d+48>>2]|0)==1&(g|0)==1)){i=j;return}a[d+54|0]=1;i=j;return}if((h|0)!=(e|0)){e=d+36|0;c[e>>2]=(c[e>>2]|0)+1;a[d+54|0]=1;i=j;return}e=d+24|0;h=c[e>>2]|0;if((h|0)==2){c[e>>2]=g;l=g}else{l=h}if(!((c[d+48>>2]|0)==1&(l|0)==1)){i=j;return}a[d+54|0]=1;i=j;return}function Om(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0;h=i;if((c[d+8>>2]|0)!=(b|0)){i=h;return}a[d+53|0]=1;if((c[d+4>>2]|0)!=(f|0)){i=h;return}a[d+52|0]=1;f=d+16|0;b=c[f>>2]|0;if((b|0)==0){c[f>>2]=e;c[d+24>>2]=g;c[d+36>>2]=1;if(!((c[d+48>>2]|0)==1&(g|0)==1)){i=h;return}a[d+54|0]=1;i=h;return}if((b|0)!=(e|0)){e=d+36|0;c[e>>2]=(c[e>>2]|0)+1;a[d+54|0]=1;i=h;return}e=d+24|0;b=c[e>>2]|0;if((b|0)==2){c[e>>2]=g;j=g}else{j=b}if(!((c[d+48>>2]|0)==1&(j|0)==1)){i=h;return}a[d+54|0]=1;i=h;return}



function Pm(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0,la=0,ma=0,na=0,oa=0,pa=0,qa=0,ra=0,sa=0,ta=0,ua=0,va=0,wa=0,xa=0,ya=0,za=0,Aa=0,Ba=0,Ca=0,Da=0,Ea=0,Fa=0,Ga=0,Ha=0,Ia=0,Ja=0,Ka=0;b=i;do{if(a>>>0<245){if(a>>>0<11){d=16}else{d=a+11&-8}e=d>>>3;f=c[3764]|0;g=f>>>e;if((g&3|0)!=0){h=(g&1^1)+e|0;j=h<<1;k=15096+(j<<2)|0;l=15096+(j+2<<2)|0;j=c[l>>2]|0;m=j+8|0;n=c[m>>2]|0;do{if((k|0)!=(n|0)){if(n>>>0<(c[15072>>2]|0)>>>0){Xb()}o=n+12|0;if((c[o>>2]|0)==(j|0)){c[o>>2]=k;c[l>>2]=n;break}else{Xb()}}else{c[3764]=f&~(1<<h)}}while(0);n=h<<3;c[j+4>>2]=n|3;l=j+(n|4)|0;c[l>>2]=c[l>>2]|1;p=m;i=b;return p|0}if(d>>>0>(c[15064>>2]|0)>>>0){if((g|0)!=0){l=2<<e;n=g<<e&(l|0-l);l=(n&0-n)+ -1|0;n=l>>>12&16;k=l>>>n;l=k>>>5&8;o=k>>>l;k=o>>>2&4;q=o>>>k;o=q>>>1&2;r=q>>>o;q=r>>>1&1;s=(l|n|k|o|q)+(r>>>q)|0;q=s<<1;r=15096+(q<<2)|0;o=15096+(q+2<<2)|0;q=c[o>>2]|0;k=q+8|0;n=c[k>>2]|0;do{if((r|0)!=(n|0)){if(n>>>0<(c[15072>>2]|0)>>>0){Xb()}l=n+12|0;if((c[l>>2]|0)==(q|0)){c[l>>2]=r;c[o>>2]=n;break}else{Xb()}}else{c[3764]=f&~(1<<s)}}while(0);f=s<<3;n=f-d|0;c[q+4>>2]=d|3;o=q+d|0;c[q+(d|4)>>2]=n|1;c[q+f>>2]=n;f=c[15064>>2]|0;if((f|0)!=0){r=c[15076>>2]|0;e=f>>>3;f=e<<1;g=15096+(f<<2)|0;m=c[3764]|0;j=1<<e;if((m&j|0)!=0){e=15096+(f+2<<2)|0;h=c[e>>2]|0;if(h>>>0<(c[15072>>2]|0)>>>0){Xb()}else{t=e;u=h}}else{c[3764]=m|j;t=15096+(f+2<<2)|0;u=g}c[t>>2]=r;c[u+12>>2]=r;c[r+8>>2]=u;c[r+12>>2]=g}c[15064>>2]=n;c[15076>>2]=o;p=k;i=b;return p|0}o=c[15060>>2]|0;if((o|0)!=0){n=(o&0-o)+ -1|0;o=n>>>12&16;g=n>>>o;n=g>>>5&8;r=g>>>n;g=r>>>2&4;f=r>>>g;r=f>>>1&2;j=f>>>r;f=j>>>1&1;m=c[15360+((n|o|g|r|f)+(j>>>f)<<2)>>2]|0;f=(c[m+4>>2]&-8)-d|0;j=m;r=m;while(1){m=c[j+16>>2]|0;if((m|0)==0){g=c[j+20>>2]|0;if((g|0)==0){break}else{v=g}}else{v=m}m=(c[v+4>>2]&-8)-d|0;g=m>>>0<f>>>0;f=g?m:f;j=v;r=g?v:r}j=c[15072>>2]|0;if(r>>>0<j>>>0){Xb()}k=r+d|0;if(!(r>>>0<k>>>0)){Xb()}q=c[r+24>>2]|0;s=c[r+12>>2]|0;do{if((s|0)==(r|0)){g=r+20|0;m=c[g>>2]|0;if((m|0)==0){o=r+16|0;n=c[o>>2]|0;if((n|0)==0){w=0;break}else{x=n;y=o}}else{x=m;y=g}while(1){g=x+20|0;m=c[g>>2]|0;if((m|0)!=0){x=m;y=g;continue}g=x+16|0;m=c[g>>2]|0;if((m|0)==0){break}else{x=m;y=g}}if(y>>>0<j>>>0){Xb()}else{c[y>>2]=0;w=x;break}}else{g=c[r+8>>2]|0;if(g>>>0<j>>>0){Xb()}m=g+12|0;if((c[m>>2]|0)!=(r|0)){Xb()}o=s+8|0;if((c[o>>2]|0)==(r|0)){c[m>>2]=s;c[o>>2]=g;w=s;break}else{Xb()}}}while(0);do{if((q|0)!=0){s=c[r+28>>2]|0;j=15360+(s<<2)|0;if((r|0)==(c[j>>2]|0)){c[j>>2]=w;if((w|0)==0){c[15060>>2]=c[15060>>2]&~(1<<s);break}}else{if(q>>>0<(c[15072>>2]|0)>>>0){Xb()}s=q+16|0;if((c[s>>2]|0)==(r|0)){c[s>>2]=w}else{c[q+20>>2]=w}if((w|0)==0){break}}if(w>>>0<(c[15072>>2]|0)>>>0){Xb()}c[w+24>>2]=q;s=c[r+16>>2]|0;do{if((s|0)!=0){if(s>>>0<(c[15072>>2]|0)>>>0){Xb()}else{c[w+16>>2]=s;c[s+24>>2]=w;break}}}while(0);s=c[r+20>>2]|0;if((s|0)!=0){if(s>>>0<(c[15072>>2]|0)>>>0){Xb()}else{c[w+20>>2]=s;c[s+24>>2]=w;break}}}}while(0);if(f>>>0<16){q=f+d|0;c[r+4>>2]=q|3;s=r+(q+4)|0;c[s>>2]=c[s>>2]|1}else{c[r+4>>2]=d|3;c[r+(d|4)>>2]=f|1;c[r+(f+d)>>2]=f;s=c[15064>>2]|0;if((s|0)!=0){q=c[15076>>2]|0;j=s>>>3;s=j<<1;g=15096+(s<<2)|0;o=c[3764]|0;m=1<<j;if((o&m|0)!=0){j=15096+(s+2<<2)|0;n=c[j>>2]|0;if(n>>>0<(c[15072>>2]|0)>>>0){Xb()}else{z=j;A=n}}else{c[3764]=o|m;z=15096+(s+2<<2)|0;A=g}c[z>>2]=q;c[A+12>>2]=q;c[q+8>>2]=A;c[q+12>>2]=g}c[15064>>2]=f;c[15076>>2]=k}p=r+8|0;i=b;return p|0}else{B=d}}else{B=d}}else{if(!(a>>>0>4294967231)){g=a+11|0;q=g&-8;s=c[15060>>2]|0;if((s|0)!=0){m=0-q|0;o=g>>>8;if((o|0)!=0){if(q>>>0>16777215){C=31}else{g=(o+1048320|0)>>>16&8;n=o<<g;o=(n+520192|0)>>>16&4;j=n<<o;n=(j+245760|0)>>>16&2;h=14-(o|g|n)+(j<<n>>>15)|0;C=q>>>(h+7|0)&1|h<<1}}else{C=0}h=c[15360+(C<<2)>>2]|0;a:do{if((h|0)==0){D=m;E=0;F=0}else{if((C|0)==31){G=0}else{G=25-(C>>>1)|0}n=m;j=0;g=q<<G;o=h;e=0;while(1){l=c[o+4>>2]&-8;H=l-q|0;if(H>>>0<n>>>0){if((l|0)==(q|0)){D=H;E=o;F=o;break a}else{I=H;J=o}}else{I=n;J=e}H=c[o+20>>2]|0;l=c[o+(g>>>31<<2)+16>>2]|0;K=(H|0)==0|(H|0)==(l|0)?j:H;if((l|0)==0){D=I;E=K;F=J;break}else{n=I;j=K;g=g<<1;o=l;e=J}}}}while(0);if((E|0)==0&(F|0)==0){h=2<<C;m=s&(h|0-h);if((m|0)==0){B=q;break}h=(m&0-m)+ -1|0;m=h>>>12&16;r=h>>>m;h=r>>>5&8;k=r>>>h;r=k>>>2&4;f=k>>>r;k=f>>>1&2;e=f>>>k;f=e>>>1&1;L=c[15360+((h|m|r|k|f)+(e>>>f)<<2)>>2]|0}else{L=E}if((L|0)==0){M=D;N=F}else{f=D;e=L;k=F;while(1){r=(c[e+4>>2]&-8)-q|0;m=r>>>0<f>>>0;h=m?r:f;r=m?e:k;m=c[e+16>>2]|0;if((m|0)!=0){f=h;e=m;k=r;continue}m=c[e+20>>2]|0;if((m|0)==0){M=h;N=r;break}else{f=h;e=m;k=r}}}if((N|0)!=0?M>>>0<((c[15064>>2]|0)-q|0)>>>0:0){k=c[15072>>2]|0;if(N>>>0<k>>>0){Xb()}e=N+q|0;if(!(N>>>0<e>>>0)){Xb()}f=c[N+24>>2]|0;s=c[N+12>>2]|0;do{if((s|0)==(N|0)){r=N+20|0;m=c[r>>2]|0;if((m|0)==0){h=N+16|0;o=c[h>>2]|0;if((o|0)==0){O=0;break}else{P=o;Q=h}}else{P=m;Q=r}while(1){r=P+20|0;m=c[r>>2]|0;if((m|0)!=0){P=m;Q=r;continue}r=P+16|0;m=c[r>>2]|0;if((m|0)==0){break}else{P=m;Q=r}}if(Q>>>0<k>>>0){Xb()}else{c[Q>>2]=0;O=P;break}}else{r=c[N+8>>2]|0;if(r>>>0<k>>>0){Xb()}m=r+12|0;if((c[m>>2]|0)!=(N|0)){Xb()}h=s+8|0;if((c[h>>2]|0)==(N|0)){c[m>>2]=s;c[h>>2]=r;O=s;break}else{Xb()}}}while(0);do{if((f|0)!=0){s=c[N+28>>2]|0;k=15360+(s<<2)|0;if((N|0)==(c[k>>2]|0)){c[k>>2]=O;if((O|0)==0){c[15060>>2]=c[15060>>2]&~(1<<s);break}}else{if(f>>>0<(c[15072>>2]|0)>>>0){Xb()}s=f+16|0;if((c[s>>2]|0)==(N|0)){c[s>>2]=O}else{c[f+20>>2]=O}if((O|0)==0){break}}if(O>>>0<(c[15072>>2]|0)>>>0){Xb()}c[O+24>>2]=f;s=c[N+16>>2]|0;do{if((s|0)!=0){if(s>>>0<(c[15072>>2]|0)>>>0){Xb()}else{c[O+16>>2]=s;c[s+24>>2]=O;break}}}while(0);s=c[N+20>>2]|0;if((s|0)!=0){if(s>>>0<(c[15072>>2]|0)>>>0){Xb()}else{c[O+20>>2]=s;c[s+24>>2]=O;break}}}}while(0);b:do{if(!(M>>>0<16)){c[N+4>>2]=q|3;c[N+(q|4)>>2]=M|1;c[N+(M+q)>>2]=M;f=M>>>3;if(M>>>0<256){s=f<<1;k=15096+(s<<2)|0;r=c[3764]|0;h=1<<f;if((r&h|0)!=0){f=15096+(s+2<<2)|0;m=c[f>>2]|0;if(m>>>0<(c[15072>>2]|0)>>>0){Xb()}else{R=f;S=m}}else{c[3764]=r|h;R=15096+(s+2<<2)|0;S=k}c[R>>2]=e;c[S+12>>2]=e;c[N+(q+8)>>2]=S;c[N+(q+12)>>2]=k;break}k=M>>>8;if((k|0)!=0){if(M>>>0>16777215){T=31}else{s=(k+1048320|0)>>>16&8;h=k<<s;k=(h+520192|0)>>>16&4;r=h<<k;h=(r+245760|0)>>>16&2;m=14-(k|s|h)+(r<<h>>>15)|0;T=M>>>(m+7|0)&1|m<<1}}else{T=0}m=15360+(T<<2)|0;c[N+(q+28)>>2]=T;c[N+(q+20)>>2]=0;c[N+(q+16)>>2]=0;h=c[15060>>2]|0;r=1<<T;if((h&r|0)==0){c[15060>>2]=h|r;c[m>>2]=e;c[N+(q+24)>>2]=m;c[N+(q+12)>>2]=e;c[N+(q+8)>>2]=e;break}r=c[m>>2]|0;if((T|0)==31){U=0}else{U=25-(T>>>1)|0}c:do{if((c[r+4>>2]&-8|0)!=(M|0)){m=M<<U;h=r;while(1){V=h+(m>>>31<<2)+16|0;s=c[V>>2]|0;if((s|0)==0){break}if((c[s+4>>2]&-8|0)==(M|0)){W=s;break c}else{m=m<<1;h=s}}if(V>>>0<(c[15072>>2]|0)>>>0){Xb()}else{c[V>>2]=e;c[N+(q+24)>>2]=h;c[N+(q+12)>>2]=e;c[N+(q+8)>>2]=e;break b}}else{W=r}}while(0);r=W+8|0;m=c[r>>2]|0;s=c[15072>>2]|0;if(W>>>0<s>>>0){Xb()}if(m>>>0<s>>>0){Xb()}else{c[m+12>>2]=e;c[r>>2]=e;c[N+(q+8)>>2]=m;c[N+(q+12)>>2]=W;c[N+(q+24)>>2]=0;break}}else{m=M+q|0;c[N+4>>2]=m|3;r=N+(m+4)|0;c[r>>2]=c[r>>2]|1}}while(0);p=N+8|0;i=b;return p|0}else{B=q}}else{B=q}}else{B=-1}}}while(0);N=c[15064>>2]|0;if(!(B>>>0>N>>>0)){M=N-B|0;W=c[15076>>2]|0;if(M>>>0>15){c[15076>>2]=W+B;c[15064>>2]=M;c[W+(B+4)>>2]=M|1;c[W+N>>2]=M;c[W+4>>2]=B|3}else{c[15064>>2]=0;c[15076>>2]=0;c[W+4>>2]=N|3;M=W+(N+4)|0;c[M>>2]=c[M>>2]|1}p=W+8|0;i=b;return p|0}W=c[15068>>2]|0;if(B>>>0<W>>>0){M=W-B|0;c[15068>>2]=M;W=c[15080>>2]|0;c[15080>>2]=W+B;c[W+(B+4)>>2]=M|1;c[W+4>>2]=B|3;p=W+8|0;i=b;return p|0}do{if((c[3882]|0)==0){W=Ub(30)|0;if((W+ -1&W|0)==0){c[15536>>2]=W;c[15532>>2]=W;c[15540>>2]=-1;c[15544>>2]=-1;c[15548>>2]=0;c[15500>>2]=0;c[3882]=(_b(0)|0)&-16^1431655768;break}else{Xb()}}}while(0);W=B+48|0;M=c[15536>>2]|0;N=B+47|0;V=M+N|0;U=0-M|0;M=V&U;if(!(M>>>0>B>>>0)){p=0;i=b;return p|0}T=c[15496>>2]|0;if((T|0)!=0?(S=c[15488>>2]|0,R=S+M|0,R>>>0<=S>>>0|R>>>0>T>>>0):0){p=0;i=b;return p|0}d:do{if((c[15500>>2]&4|0)==0){T=c[15080>>2]|0;e:do{if((T|0)!=0){R=15504|0;while(1){S=c[R>>2]|0;if(!(S>>>0>T>>>0)?(X=R+4|0,(S+(c[X>>2]|0)|0)>>>0>T>>>0):0){break}S=c[R+8>>2]|0;if((S|0)==0){Y=182;break e}else{R=S}}if((R|0)!=0){S=V-(c[15068>>2]|0)&U;if(S>>>0<2147483647){O=jb(S|0)|0;P=(O|0)==((c[R>>2]|0)+(c[X>>2]|0)|0);Z=O;_=S;$=P?O:-1;aa=P?S:0;Y=191}else{ba=0}}else{Y=182}}else{Y=182}}while(0);do{if((Y|0)==182){T=jb(0)|0;if((T|0)!=(-1|0)){q=T;S=c[15532>>2]|0;P=S+ -1|0;if((P&q|0)==0){ca=M}else{ca=M-q+(P+q&0-S)|0}S=c[15488>>2]|0;q=S+ca|0;if(ca>>>0>B>>>0&ca>>>0<2147483647){P=c[15496>>2]|0;if((P|0)!=0?q>>>0<=S>>>0|q>>>0>P>>>0:0){ba=0;break}P=jb(ca|0)|0;q=(P|0)==(T|0);Z=P;_=ca;$=q?T:-1;aa=q?ca:0;Y=191}else{ba=0}}else{ba=0}}}while(0);f:do{if((Y|0)==191){q=0-_|0;if(($|0)!=(-1|0)){da=$;ea=aa;Y=202;break d}do{if((Z|0)!=(-1|0)&_>>>0<2147483647&_>>>0<W>>>0?(T=c[15536>>2]|0,P=N-_+T&0-T,P>>>0<2147483647):0){if((jb(P|0)|0)==(-1|0)){jb(q|0)|0;ba=aa;break f}else{fa=P+_|0;break}}else{fa=_}}while(0);if((Z|0)==(-1|0)){ba=aa}else{da=Z;ea=fa;Y=202;break d}}}while(0);c[15500>>2]=c[15500>>2]|4;ga=ba;Y=199}else{ga=0;Y=199}}while(0);if((((Y|0)==199?M>>>0<2147483647:0)?(ba=jb(M|0)|0,M=jb(0)|0,(M|0)!=(-1|0)&(ba|0)!=(-1|0)&ba>>>0<M>>>0):0)?(fa=M-ba|0,M=fa>>>0>(B+40|0)>>>0,M):0){da=ba;ea=M?fa:ga;Y=202}if((Y|0)==202){ga=(c[15488>>2]|0)+ea|0;c[15488>>2]=ga;if(ga>>>0>(c[15492>>2]|0)>>>0){c[15492>>2]=ga}ga=c[15080>>2]|0;g:do{if((ga|0)!=0){fa=15504|0;while(1){ha=c[fa>>2]|0;ia=fa+4|0;ja=c[ia>>2]|0;if((da|0)==(ha+ja|0)){Y=214;break}M=c[fa+8>>2]|0;if((M|0)==0){break}else{fa=M}}if(((Y|0)==214?(c[fa+12>>2]&8|0)==0:0)?ga>>>0>=ha>>>0&ga>>>0<da>>>0:0){c[ia>>2]=ja+ea;M=(c[15068>>2]|0)+ea|0;ba=ga+8|0;if((ba&7|0)==0){ka=0}else{ka=0-ba&7}ba=M-ka|0;c[15080>>2]=ga+ka;c[15068>>2]=ba;c[ga+(ka+4)>>2]=ba|1;c[ga+(M+4)>>2]=40;c[15084>>2]=c[15544>>2];break}if(da>>>0<(c[15072>>2]|0)>>>0){c[15072>>2]=da}M=da+ea|0;ba=15504|0;while(1){if((c[ba>>2]|0)==(M|0)){Y=224;break}Z=c[ba+8>>2]|0;if((Z|0)==0){break}else{ba=Z}}if((Y|0)==224?(c[ba+12>>2]&8|0)==0:0){c[ba>>2]=da;M=ba+4|0;c[M>>2]=(c[M>>2]|0)+ea;M=da+8|0;if((M&7|0)==0){la=0}else{la=0-M&7}M=da+(ea+8)|0;if((M&7|0)==0){ma=0}else{ma=0-M&7}M=da+(ma+ea)|0;fa=la+B|0;Z=da+fa|0;aa=M-(da+la)-B|0;c[da+(la+4)>>2]=B|3;h:do{if((M|0)!=(c[15080>>2]|0)){if((M|0)==(c[15076>>2]|0)){_=(c[15064>>2]|0)+aa|0;c[15064>>2]=_;c[15076>>2]=Z;c[da+(fa+4)>>2]=_|1;c[da+(_+fa)>>2]=_;break}_=ea+4|0;N=c[da+(_+ma)>>2]|0;if((N&3|0)==1){W=N&-8;$=N>>>3;do{if(!(N>>>0<256)){ca=c[da+((ma|24)+ea)>>2]|0;X=c[da+(ea+12+ma)>>2]|0;do{if((X|0)==(M|0)){U=ma|16;V=da+(_+U)|0;q=c[V>>2]|0;if((q|0)==0){R=da+(U+ea)|0;U=c[R>>2]|0;if((U|0)==0){na=0;break}else{oa=U;pa=R}}else{oa=q;pa=V}while(1){V=oa+20|0;q=c[V>>2]|0;if((q|0)!=0){oa=q;pa=V;continue}V=oa+16|0;q=c[V>>2]|0;if((q|0)==0){break}else{oa=q;pa=V}}if(pa>>>0<(c[15072>>2]|0)>>>0){Xb()}else{c[pa>>2]=0;na=oa;break}}else{V=c[da+((ma|8)+ea)>>2]|0;if(V>>>0<(c[15072>>2]|0)>>>0){Xb()}q=V+12|0;if((c[q>>2]|0)!=(M|0)){Xb()}R=X+8|0;if((c[R>>2]|0)==(M|0)){c[q>>2]=X;c[R>>2]=V;na=X;break}else{Xb()}}}while(0);if((ca|0)!=0){X=c[da+(ea+28+ma)>>2]|0;h=15360+(X<<2)|0;if((M|0)==(c[h>>2]|0)){c[h>>2]=na;if((na|0)==0){c[15060>>2]=c[15060>>2]&~(1<<X);break}}else{if(ca>>>0<(c[15072>>2]|0)>>>0){Xb()}X=ca+16|0;if((c[X>>2]|0)==(M|0)){c[X>>2]=na}else{c[ca+20>>2]=na}if((na|0)==0){break}}if(na>>>0<(c[15072>>2]|0)>>>0){Xb()}c[na+24>>2]=ca;X=ma|16;h=c[da+(X+ea)>>2]|0;do{if((h|0)!=0){if(h>>>0<(c[15072>>2]|0)>>>0){Xb()}else{c[na+16>>2]=h;c[h+24>>2]=na;break}}}while(0);h=c[da+(_+X)>>2]|0;if((h|0)!=0){if(h>>>0<(c[15072>>2]|0)>>>0){Xb()}else{c[na+20>>2]=h;c[h+24>>2]=na;break}}}}else{h=c[da+((ma|8)+ea)>>2]|0;ca=c[da+(ea+12+ma)>>2]|0;V=15096+($<<1<<2)|0;if((h|0)!=(V|0)){if(h>>>0<(c[15072>>2]|0)>>>0){Xb()}if((c[h+12>>2]|0)!=(M|0)){Xb()}}if((ca|0)==(h|0)){c[3764]=c[3764]&~(1<<$);break}if((ca|0)!=(V|0)){if(ca>>>0<(c[15072>>2]|0)>>>0){Xb()}V=ca+8|0;if((c[V>>2]|0)==(M|0)){qa=V}else{Xb()}}else{qa=ca+8|0}c[h+12>>2]=ca;c[qa>>2]=h}}while(0);ra=da+((W|ma)+ea)|0;sa=W+aa|0}else{ra=M;sa=aa}$=ra+4|0;c[$>>2]=c[$>>2]&-2;c[da+(fa+4)>>2]=sa|1;c[da+(sa+fa)>>2]=sa;$=sa>>>3;if(sa>>>0<256){_=$<<1;N=15096+(_<<2)|0;h=c[3764]|0;ca=1<<$;if((h&ca|0)!=0){$=15096+(_+2<<2)|0;V=c[$>>2]|0;if(V>>>0<(c[15072>>2]|0)>>>0){Xb()}else{ta=$;ua=V}}else{c[3764]=h|ca;ta=15096+(_+2<<2)|0;ua=N}c[ta>>2]=Z;c[ua+12>>2]=Z;c[da+(fa+8)>>2]=ua;c[da+(fa+12)>>2]=N;break}N=sa>>>8;if((N|0)!=0){if(sa>>>0>16777215){va=31}else{_=(N+1048320|0)>>>16&8;ca=N<<_;N=(ca+520192|0)>>>16&4;h=ca<<N;ca=(h+245760|0)>>>16&2;V=14-(N|_|ca)+(h<<ca>>>15)|0;va=sa>>>(V+7|0)&1|V<<1}}else{va=0}V=15360+(va<<2)|0;c[da+(fa+28)>>2]=va;c[da+(fa+20)>>2]=0;c[da+(fa+16)>>2]=0;ca=c[15060>>2]|0;h=1<<va;if((ca&h|0)==0){c[15060>>2]=ca|h;c[V>>2]=Z;c[da+(fa+24)>>2]=V;c[da+(fa+12)>>2]=Z;c[da+(fa+8)>>2]=Z;break}h=c[V>>2]|0;if((va|0)==31){wa=0}else{wa=25-(va>>>1)|0}i:do{if((c[h+4>>2]&-8|0)!=(sa|0)){V=sa<<wa;ca=h;while(1){xa=ca+(V>>>31<<2)+16|0;_=c[xa>>2]|0;if((_|0)==0){break}if((c[_+4>>2]&-8|0)==(sa|0)){ya=_;break i}else{V=V<<1;ca=_}}if(xa>>>0<(c[15072>>2]|0)>>>0){Xb()}else{c[xa>>2]=Z;c[da+(fa+24)>>2]=ca;c[da+(fa+12)>>2]=Z;c[da+(fa+8)>>2]=Z;break h}}else{ya=h}}while(0);h=ya+8|0;W=c[h>>2]|0;V=c[15072>>2]|0;if(ya>>>0<V>>>0){Xb()}if(W>>>0<V>>>0){Xb()}else{c[W+12>>2]=Z;c[h>>2]=Z;c[da+(fa+8)>>2]=W;c[da+(fa+12)>>2]=ya;c[da+(fa+24)>>2]=0;break}}else{W=(c[15068>>2]|0)+aa|0;c[15068>>2]=W;c[15080>>2]=Z;c[da+(fa+4)>>2]=W|1}}while(0);p=da+(la|8)|0;i=b;return p|0}fa=15504|0;while(1){za=c[fa>>2]|0;if(!(za>>>0>ga>>>0)?(Aa=c[fa+4>>2]|0,Ba=za+Aa|0,Ba>>>0>ga>>>0):0){break}fa=c[fa+8>>2]|0}fa=za+(Aa+ -39)|0;if((fa&7|0)==0){Ca=0}else{Ca=0-fa&7}fa=za+(Aa+ -47+Ca)|0;Z=fa>>>0<(ga+16|0)>>>0?ga:fa;fa=Z+8|0;aa=da+8|0;if((aa&7|0)==0){Da=0}else{Da=0-aa&7}aa=ea+ -40-Da|0;c[15080>>2]=da+Da;c[15068>>2]=aa;c[da+(Da+4)>>2]=aa|1;c[da+(ea+ -36)>>2]=40;c[15084>>2]=c[15544>>2];c[Z+4>>2]=27;c[fa+0>>2]=c[15504>>2];c[fa+4>>2]=c[15508>>2];c[fa+8>>2]=c[15512>>2];c[fa+12>>2]=c[15516>>2];c[15504>>2]=da;c[15508>>2]=ea;c[15516>>2]=0;c[15512>>2]=fa;fa=Z+28|0;c[fa>>2]=7;if((Z+32|0)>>>0<Ba>>>0){aa=fa;while(1){fa=aa+4|0;c[fa>>2]=7;if((aa+8|0)>>>0<Ba>>>0){aa=fa}else{break}}}if((Z|0)!=(ga|0)){aa=Z-ga|0;fa=ga+(aa+4)|0;c[fa>>2]=c[fa>>2]&-2;c[ga+4>>2]=aa|1;c[ga+aa>>2]=aa;fa=aa>>>3;if(aa>>>0<256){M=fa<<1;ba=15096+(M<<2)|0;W=c[3764]|0;h=1<<fa;if((W&h|0)!=0){fa=15096+(M+2<<2)|0;V=c[fa>>2]|0;if(V>>>0<(c[15072>>2]|0)>>>0){Xb()}else{Ea=fa;Fa=V}}else{c[3764]=W|h;Ea=15096+(M+2<<2)|0;Fa=ba}c[Ea>>2]=ga;c[Fa+12>>2]=ga;c[ga+8>>2]=Fa;c[ga+12>>2]=ba;break}ba=aa>>>8;if((ba|0)!=0){if(aa>>>0>16777215){Ga=31}else{M=(ba+1048320|0)>>>16&8;h=ba<<M;ba=(h+520192|0)>>>16&4;W=h<<ba;h=(W+245760|0)>>>16&2;V=14-(ba|M|h)+(W<<h>>>15)|0;Ga=aa>>>(V+7|0)&1|V<<1}}else{Ga=0}V=15360+(Ga<<2)|0;c[ga+28>>2]=Ga;c[ga+20>>2]=0;c[ga+16>>2]=0;h=c[15060>>2]|0;W=1<<Ga;if((h&W|0)==0){c[15060>>2]=h|W;c[V>>2]=ga;c[ga+24>>2]=V;c[ga+12>>2]=ga;c[ga+8>>2]=ga;break}W=c[V>>2]|0;if((Ga|0)==31){Ha=0}else{Ha=25-(Ga>>>1)|0}j:do{if((c[W+4>>2]&-8|0)!=(aa|0)){V=aa<<Ha;h=W;while(1){Ia=h+(V>>>31<<2)+16|0;M=c[Ia>>2]|0;if((M|0)==0){break}if((c[M+4>>2]&-8|0)==(aa|0)){Ja=M;break j}else{V=V<<1;h=M}}if(Ia>>>0<(c[15072>>2]|0)>>>0){Xb()}else{c[Ia>>2]=ga;c[ga+24>>2]=h;c[ga+12>>2]=ga;c[ga+8>>2]=ga;break g}}else{Ja=W}}while(0);W=Ja+8|0;aa=c[W>>2]|0;Z=c[15072>>2]|0;if(Ja>>>0<Z>>>0){Xb()}if(aa>>>0<Z>>>0){Xb()}else{c[aa+12>>2]=ga;c[W>>2]=ga;c[ga+8>>2]=aa;c[ga+12>>2]=Ja;c[ga+24>>2]=0;break}}}else{aa=c[15072>>2]|0;if((aa|0)==0|da>>>0<aa>>>0){c[15072>>2]=da}c[15504>>2]=da;c[15508>>2]=ea;c[15516>>2]=0;c[15092>>2]=c[3882];c[15088>>2]=-1;aa=0;do{W=aa<<1;Z=15096+(W<<2)|0;c[15096+(W+3<<2)>>2]=Z;c[15096+(W+2<<2)>>2]=Z;aa=aa+1|0}while((aa|0)!=32);aa=da+8|0;if((aa&7|0)==0){Ka=0}else{Ka=0-aa&7}aa=ea+ -40-Ka|0;c[15080>>2]=da+Ka;c[15068>>2]=aa;c[da+(Ka+4)>>2]=aa|1;c[da+(ea+ -36)>>2]=40;c[15084>>2]=c[15544>>2]}}while(0);ea=c[15068>>2]|0;if(ea>>>0>B>>>0){da=ea-B|0;c[15068>>2]=da;ea=c[15080>>2]|0;c[15080>>2]=ea+B;c[ea+(B+4)>>2]=da|1;c[ea+4>>2]=B|3;p=ea+8|0;i=b;return p|0}}c[(db()|0)>>2]=12;p=0;i=b;return p|0}function Qm(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0;b=i;if((a|0)==0){i=b;return}d=a+ -8|0;e=c[15072>>2]|0;if(d>>>0<e>>>0){Xb()}f=c[a+ -4>>2]|0;g=f&3;if((g|0)==1){Xb()}h=f&-8;j=a+(h+ -8)|0;do{if((f&1|0)==0){k=c[d>>2]|0;if((g|0)==0){i=b;return}l=-8-k|0;m=a+l|0;n=k+h|0;if(m>>>0<e>>>0){Xb()}if((m|0)==(c[15076>>2]|0)){o=a+(h+ -4)|0;if((c[o>>2]&3|0)!=3){p=m;q=n;break}c[15064>>2]=n;c[o>>2]=c[o>>2]&-2;c[a+(l+4)>>2]=n|1;c[j>>2]=n;i=b;return}o=k>>>3;if(k>>>0<256){k=c[a+(l+8)>>2]|0;r=c[a+(l+12)>>2]|0;s=15096+(o<<1<<2)|0;if((k|0)!=(s|0)){if(k>>>0<e>>>0){Xb()}if((c[k+12>>2]|0)!=(m|0)){Xb()}}if((r|0)==(k|0)){c[3764]=c[3764]&~(1<<o);p=m;q=n;break}if((r|0)!=(s|0)){if(r>>>0<e>>>0){Xb()}s=r+8|0;if((c[s>>2]|0)==(m|0)){t=s}else{Xb()}}else{t=r+8|0}c[k+12>>2]=r;c[t>>2]=k;p=m;q=n;break}k=c[a+(l+24)>>2]|0;r=c[a+(l+12)>>2]|0;do{if((r|0)==(m|0)){s=a+(l+20)|0;o=c[s>>2]|0;if((o|0)==0){u=a+(l+16)|0;v=c[u>>2]|0;if((v|0)==0){w=0;break}else{x=v;y=u}}else{x=o;y=s}while(1){s=x+20|0;o=c[s>>2]|0;if((o|0)!=0){x=o;y=s;continue}s=x+16|0;o=c[s>>2]|0;if((o|0)==0){break}else{x=o;y=s}}if(y>>>0<e>>>0){Xb()}else{c[y>>2]=0;w=x;break}}else{s=c[a+(l+8)>>2]|0;if(s>>>0<e>>>0){Xb()}o=s+12|0;if((c[o>>2]|0)!=(m|0)){Xb()}u=r+8|0;if((c[u>>2]|0)==(m|0)){c[o>>2]=r;c[u>>2]=s;w=r;break}else{Xb()}}}while(0);if((k|0)!=0){r=c[a+(l+28)>>2]|0;s=15360+(r<<2)|0;if((m|0)==(c[s>>2]|0)){c[s>>2]=w;if((w|0)==0){c[15060>>2]=c[15060>>2]&~(1<<r);p=m;q=n;break}}else{if(k>>>0<(c[15072>>2]|0)>>>0){Xb()}r=k+16|0;if((c[r>>2]|0)==(m|0)){c[r>>2]=w}else{c[k+20>>2]=w}if((w|0)==0){p=m;q=n;break}}if(w>>>0<(c[15072>>2]|0)>>>0){Xb()}c[w+24>>2]=k;r=c[a+(l+16)>>2]|0;do{if((r|0)!=0){if(r>>>0<(c[15072>>2]|0)>>>0){Xb()}else{c[w+16>>2]=r;c[r+24>>2]=w;break}}}while(0);r=c[a+(l+20)>>2]|0;if((r|0)!=0){if(r>>>0<(c[15072>>2]|0)>>>0){Xb()}else{c[w+20>>2]=r;c[r+24>>2]=w;p=m;q=n;break}}else{p=m;q=n}}else{p=m;q=n}}else{p=d;q=h}}while(0);if(!(p>>>0<j>>>0)){Xb()}d=a+(h+ -4)|0;w=c[d>>2]|0;if((w&1|0)==0){Xb()}if((w&2|0)==0){if((j|0)==(c[15080>>2]|0)){e=(c[15068>>2]|0)+q|0;c[15068>>2]=e;c[15080>>2]=p;c[p+4>>2]=e|1;if((p|0)!=(c[15076>>2]|0)){i=b;return}c[15076>>2]=0;c[15064>>2]=0;i=b;return}if((j|0)==(c[15076>>2]|0)){e=(c[15064>>2]|0)+q|0;c[15064>>2]=e;c[15076>>2]=p;c[p+4>>2]=e|1;c[p+e>>2]=e;i=b;return}e=(w&-8)+q|0;x=w>>>3;do{if(!(w>>>0<256)){y=c[a+(h+16)>>2]|0;t=c[a+(h|4)>>2]|0;do{if((t|0)==(j|0)){g=a+(h+12)|0;f=c[g>>2]|0;if((f|0)==0){r=a+(h+8)|0;k=c[r>>2]|0;if((k|0)==0){z=0;break}else{A=k;B=r}}else{A=f;B=g}while(1){g=A+20|0;f=c[g>>2]|0;if((f|0)!=0){A=f;B=g;continue}g=A+16|0;f=c[g>>2]|0;if((f|0)==0){break}else{A=f;B=g}}if(B>>>0<(c[15072>>2]|0)>>>0){Xb()}else{c[B>>2]=0;z=A;break}}else{g=c[a+h>>2]|0;if(g>>>0<(c[15072>>2]|0)>>>0){Xb()}f=g+12|0;if((c[f>>2]|0)!=(j|0)){Xb()}r=t+8|0;if((c[r>>2]|0)==(j|0)){c[f>>2]=t;c[r>>2]=g;z=t;break}else{Xb()}}}while(0);if((y|0)!=0){t=c[a+(h+20)>>2]|0;n=15360+(t<<2)|0;if((j|0)==(c[n>>2]|0)){c[n>>2]=z;if((z|0)==0){c[15060>>2]=c[15060>>2]&~(1<<t);break}}else{if(y>>>0<(c[15072>>2]|0)>>>0){Xb()}t=y+16|0;if((c[t>>2]|0)==(j|0)){c[t>>2]=z}else{c[y+20>>2]=z}if((z|0)==0){break}}if(z>>>0<(c[15072>>2]|0)>>>0){Xb()}c[z+24>>2]=y;t=c[a+(h+8)>>2]|0;do{if((t|0)!=0){if(t>>>0<(c[15072>>2]|0)>>>0){Xb()}else{c[z+16>>2]=t;c[t+24>>2]=z;break}}}while(0);t=c[a+(h+12)>>2]|0;if((t|0)!=0){if(t>>>0<(c[15072>>2]|0)>>>0){Xb()}else{c[z+20>>2]=t;c[t+24>>2]=z;break}}}}else{t=c[a+h>>2]|0;y=c[a+(h|4)>>2]|0;n=15096+(x<<1<<2)|0;if((t|0)!=(n|0)){if(t>>>0<(c[15072>>2]|0)>>>0){Xb()}if((c[t+12>>2]|0)!=(j|0)){Xb()}}if((y|0)==(t|0)){c[3764]=c[3764]&~(1<<x);break}if((y|0)!=(n|0)){if(y>>>0<(c[15072>>2]|0)>>>0){Xb()}n=y+8|0;if((c[n>>2]|0)==(j|0)){C=n}else{Xb()}}else{C=y+8|0}c[t+12>>2]=y;c[C>>2]=t}}while(0);c[p+4>>2]=e|1;c[p+e>>2]=e;if((p|0)==(c[15076>>2]|0)){c[15064>>2]=e;i=b;return}else{D=e}}else{c[d>>2]=w&-2;c[p+4>>2]=q|1;c[p+q>>2]=q;D=q}q=D>>>3;if(D>>>0<256){w=q<<1;d=15096+(w<<2)|0;e=c[3764]|0;C=1<<q;if((e&C|0)!=0){q=15096+(w+2<<2)|0;j=c[q>>2]|0;if(j>>>0<(c[15072>>2]|0)>>>0){Xb()}else{E=q;F=j}}else{c[3764]=e|C;E=15096+(w+2<<2)|0;F=d}c[E>>2]=p;c[F+12>>2]=p;c[p+8>>2]=F;c[p+12>>2]=d;i=b;return}d=D>>>8;if((d|0)!=0){if(D>>>0>16777215){G=31}else{F=(d+1048320|0)>>>16&8;E=d<<F;d=(E+520192|0)>>>16&4;w=E<<d;E=(w+245760|0)>>>16&2;C=14-(d|F|E)+(w<<E>>>15)|0;G=D>>>(C+7|0)&1|C<<1}}else{G=0}C=15360+(G<<2)|0;c[p+28>>2]=G;c[p+20>>2]=0;c[p+16>>2]=0;E=c[15060>>2]|0;w=1<<G;a:do{if((E&w|0)!=0){F=c[C>>2]|0;if((G|0)==31){H=0}else{H=25-(G>>>1)|0}b:do{if((c[F+4>>2]&-8|0)!=(D|0)){d=D<<H;e=F;while(1){I=e+(d>>>31<<2)+16|0;j=c[I>>2]|0;if((j|0)==0){break}if((c[j+4>>2]&-8|0)==(D|0)){J=j;break b}else{d=d<<1;e=j}}if(I>>>0<(c[15072>>2]|0)>>>0){Xb()}else{c[I>>2]=p;c[p+24>>2]=e;c[p+12>>2]=p;c[p+8>>2]=p;break a}}else{J=F}}while(0);F=J+8|0;d=c[F>>2]|0;j=c[15072>>2]|0;if(J>>>0<j>>>0){Xb()}if(d>>>0<j>>>0){Xb()}else{c[d+12>>2]=p;c[F>>2]=p;c[p+8>>2]=d;c[p+12>>2]=J;c[p+24>>2]=0;break}}else{c[15060>>2]=E|w;c[C>>2]=p;c[p+24>>2]=C;c[p+12>>2]=p;c[p+8>>2]=p}}while(0);p=(c[15088>>2]|0)+ -1|0;c[15088>>2]=p;if((p|0)==0){K=15512|0}else{i=b;return}while(1){p=c[K>>2]|0;if((p|0)==0){break}else{K=p+8|0}}c[15088>>2]=-1;i=b;return}function Rm(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0;d=i;do{if((a|0)!=0){if(b>>>0>4294967231){c[(db()|0)>>2]=12;e=0;break}if(b>>>0<11){f=16}else{f=b+11&-8}g=Sm(a+ -8|0,f)|0;if((g|0)!=0){e=g+8|0;break}g=Pm(b)|0;if((g|0)==0){e=0}else{h=c[a+ -4>>2]|0;j=(h&-8)-((h&3|0)==0?8:4)|0;on(g|0,a|0,(j>>>0<b>>>0?j:b)|0)|0;Qm(a);e=g}}else{e=Pm(b)|0}}while(0);i=d;return e|0}function Sm(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;d=i;e=a+4|0;f=c[e>>2]|0;g=f&-8;h=a+g|0;j=c[15072>>2]|0;if(a>>>0<j>>>0){Xb()}k=f&3;if(!((k|0)!=1&a>>>0<h>>>0)){Xb()}l=a+(g|4)|0;m=c[l>>2]|0;if((m&1|0)==0){Xb()}if((k|0)==0){if(b>>>0<256){n=0;i=d;return n|0}if(!(g>>>0<(b+4|0)>>>0)?!((g-b|0)>>>0>c[15536>>2]<<1>>>0):0){n=a;i=d;return n|0}n=0;i=d;return n|0}if(!(g>>>0<b>>>0)){k=g-b|0;if(!(k>>>0>15)){n=a;i=d;return n|0}c[e>>2]=f&1|b|2;c[a+(b+4)>>2]=k|3;c[l>>2]=c[l>>2]|1;Tm(a+b|0,k);n=a;i=d;return n|0}if((h|0)==(c[15080>>2]|0)){k=(c[15068>>2]|0)+g|0;if(!(k>>>0>b>>>0)){n=0;i=d;return n|0}l=k-b|0;c[e>>2]=f&1|b|2;c[a+(b+4)>>2]=l|1;c[15080>>2]=a+b;c[15068>>2]=l;n=a;i=d;return n|0}if((h|0)==(c[15076>>2]|0)){l=(c[15064>>2]|0)+g|0;if(l>>>0<b>>>0){n=0;i=d;return n|0}k=l-b|0;if(k>>>0>15){c[e>>2]=f&1|b|2;c[a+(b+4)>>2]=k|1;c[a+l>>2]=k;o=a+(l+4)|0;c[o>>2]=c[o>>2]&-2;p=a+b|0;q=k}else{c[e>>2]=f&1|l|2;f=a+(l+4)|0;c[f>>2]=c[f>>2]|1;p=0;q=0}c[15064>>2]=q;c[15076>>2]=p;n=a;i=d;return n|0}if((m&2|0)!=0){n=0;i=d;return n|0}p=(m&-8)+g|0;if(p>>>0<b>>>0){n=0;i=d;return n|0}q=p-b|0;f=m>>>3;do{if(!(m>>>0<256)){l=c[a+(g+24)>>2]|0;k=c[a+(g+12)>>2]|0;do{if((k|0)==(h|0)){o=a+(g+20)|0;r=c[o>>2]|0;if((r|0)==0){s=a+(g+16)|0;t=c[s>>2]|0;if((t|0)==0){u=0;break}else{v=t;w=s}}else{v=r;w=o}while(1){o=v+20|0;r=c[o>>2]|0;if((r|0)!=0){v=r;w=o;continue}o=v+16|0;r=c[o>>2]|0;if((r|0)==0){break}else{v=r;w=o}}if(w>>>0<j>>>0){Xb()}else{c[w>>2]=0;u=v;break}}else{o=c[a+(g+8)>>2]|0;if(o>>>0<j>>>0){Xb()}r=o+12|0;if((c[r>>2]|0)!=(h|0)){Xb()}s=k+8|0;if((c[s>>2]|0)==(h|0)){c[r>>2]=k;c[s>>2]=o;u=k;break}else{Xb()}}}while(0);if((l|0)!=0){k=c[a+(g+28)>>2]|0;o=15360+(k<<2)|0;if((h|0)==(c[o>>2]|0)){c[o>>2]=u;if((u|0)==0){c[15060>>2]=c[15060>>2]&~(1<<k);break}}else{if(l>>>0<(c[15072>>2]|0)>>>0){Xb()}k=l+16|0;if((c[k>>2]|0)==(h|0)){c[k>>2]=u}else{c[l+20>>2]=u}if((u|0)==0){break}}if(u>>>0<(c[15072>>2]|0)>>>0){Xb()}c[u+24>>2]=l;k=c[a+(g+16)>>2]|0;do{if((k|0)!=0){if(k>>>0<(c[15072>>2]|0)>>>0){Xb()}else{c[u+16>>2]=k;c[k+24>>2]=u;break}}}while(0);k=c[a+(g+20)>>2]|0;if((k|0)!=0){if(k>>>0<(c[15072>>2]|0)>>>0){Xb()}else{c[u+20>>2]=k;c[k+24>>2]=u;break}}}}else{k=c[a+(g+8)>>2]|0;l=c[a+(g+12)>>2]|0;o=15096+(f<<1<<2)|0;if((k|0)!=(o|0)){if(k>>>0<j>>>0){Xb()}if((c[k+12>>2]|0)!=(h|0)){Xb()}}if((l|0)==(k|0)){c[3764]=c[3764]&~(1<<f);break}if((l|0)!=(o|0)){if(l>>>0<j>>>0){Xb()}o=l+8|0;if((c[o>>2]|0)==(h|0)){x=o}else{Xb()}}else{x=l+8|0}c[k+12>>2]=l;c[x>>2]=k}}while(0);if(q>>>0<16){c[e>>2]=p|c[e>>2]&1|2;x=a+(p|4)|0;c[x>>2]=c[x>>2]|1;n=a;i=d;return n|0}else{c[e>>2]=c[e>>2]&1|b|2;c[a+(b+4)>>2]=q|3;e=a+(p|4)|0;c[e>>2]=c[e>>2]|1;Tm(a+b|0,q);n=a;i=d;return n|0}return 0}function Tm(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0;d=i;e=a+b|0;f=c[a+4>>2]|0;do{if((f&1|0)==0){g=c[a>>2]|0;if((f&3|0)==0){i=d;return}h=a+(0-g)|0;j=g+b|0;k=c[15072>>2]|0;if(h>>>0<k>>>0){Xb()}if((h|0)==(c[15076>>2]|0)){l=a+(b+4)|0;if((c[l>>2]&3|0)!=3){m=h;n=j;break}c[15064>>2]=j;c[l>>2]=c[l>>2]&-2;c[a+(4-g)>>2]=j|1;c[e>>2]=j;i=d;return}l=g>>>3;if(g>>>0<256){o=c[a+(8-g)>>2]|0;p=c[a+(12-g)>>2]|0;q=15096+(l<<1<<2)|0;if((o|0)!=(q|0)){if(o>>>0<k>>>0){Xb()}if((c[o+12>>2]|0)!=(h|0)){Xb()}}if((p|0)==(o|0)){c[3764]=c[3764]&~(1<<l);m=h;n=j;break}if((p|0)!=(q|0)){if(p>>>0<k>>>0){Xb()}q=p+8|0;if((c[q>>2]|0)==(h|0)){r=q}else{Xb()}}else{r=p+8|0}c[o+12>>2]=p;c[r>>2]=o;m=h;n=j;break}o=c[a+(24-g)>>2]|0;p=c[a+(12-g)>>2]|0;do{if((p|0)==(h|0)){q=16-g|0;l=a+(q+4)|0;s=c[l>>2]|0;if((s|0)==0){t=a+q|0;q=c[t>>2]|0;if((q|0)==0){u=0;break}else{v=q;w=t}}else{v=s;w=l}while(1){l=v+20|0;s=c[l>>2]|0;if((s|0)!=0){v=s;w=l;continue}l=v+16|0;s=c[l>>2]|0;if((s|0)==0){break}else{v=s;w=l}}if(w>>>0<k>>>0){Xb()}else{c[w>>2]=0;u=v;break}}else{l=c[a+(8-g)>>2]|0;if(l>>>0<k>>>0){Xb()}s=l+12|0;if((c[s>>2]|0)!=(h|0)){Xb()}t=p+8|0;if((c[t>>2]|0)==(h|0)){c[s>>2]=p;c[t>>2]=l;u=p;break}else{Xb()}}}while(0);if((o|0)!=0){p=c[a+(28-g)>>2]|0;k=15360+(p<<2)|0;if((h|0)==(c[k>>2]|0)){c[k>>2]=u;if((u|0)==0){c[15060>>2]=c[15060>>2]&~(1<<p);m=h;n=j;break}}else{if(o>>>0<(c[15072>>2]|0)>>>0){Xb()}p=o+16|0;if((c[p>>2]|0)==(h|0)){c[p>>2]=u}else{c[o+20>>2]=u}if((u|0)==0){m=h;n=j;break}}if(u>>>0<(c[15072>>2]|0)>>>0){Xb()}c[u+24>>2]=o;p=16-g|0;k=c[a+p>>2]|0;do{if((k|0)!=0){if(k>>>0<(c[15072>>2]|0)>>>0){Xb()}else{c[u+16>>2]=k;c[k+24>>2]=u;break}}}while(0);k=c[a+(p+4)>>2]|0;if((k|0)!=0){if(k>>>0<(c[15072>>2]|0)>>>0){Xb()}else{c[u+20>>2]=k;c[k+24>>2]=u;m=h;n=j;break}}else{m=h;n=j}}else{m=h;n=j}}else{m=a;n=b}}while(0);u=c[15072>>2]|0;if(e>>>0<u>>>0){Xb()}v=a+(b+4)|0;w=c[v>>2]|0;if((w&2|0)==0){if((e|0)==(c[15080>>2]|0)){r=(c[15068>>2]|0)+n|0;c[15068>>2]=r;c[15080>>2]=m;c[m+4>>2]=r|1;if((m|0)!=(c[15076>>2]|0)){i=d;return}c[15076>>2]=0;c[15064>>2]=0;i=d;return}if((e|0)==(c[15076>>2]|0)){r=(c[15064>>2]|0)+n|0;c[15064>>2]=r;c[15076>>2]=m;c[m+4>>2]=r|1;c[m+r>>2]=r;i=d;return}r=(w&-8)+n|0;f=w>>>3;do{if(!(w>>>0<256)){k=c[a+(b+24)>>2]|0;g=c[a+(b+12)>>2]|0;do{if((g|0)==(e|0)){o=a+(b+20)|0;l=c[o>>2]|0;if((l|0)==0){t=a+(b+16)|0;s=c[t>>2]|0;if((s|0)==0){x=0;break}else{y=s;z=t}}else{y=l;z=o}while(1){o=y+20|0;l=c[o>>2]|0;if((l|0)!=0){y=l;z=o;continue}o=y+16|0;l=c[o>>2]|0;if((l|0)==0){break}else{y=l;z=o}}if(z>>>0<u>>>0){Xb()}else{c[z>>2]=0;x=y;break}}else{o=c[a+(b+8)>>2]|0;if(o>>>0<u>>>0){Xb()}l=o+12|0;if((c[l>>2]|0)!=(e|0)){Xb()}t=g+8|0;if((c[t>>2]|0)==(e|0)){c[l>>2]=g;c[t>>2]=o;x=g;break}else{Xb()}}}while(0);if((k|0)!=0){g=c[a+(b+28)>>2]|0;j=15360+(g<<2)|0;if((e|0)==(c[j>>2]|0)){c[j>>2]=x;if((x|0)==0){c[15060>>2]=c[15060>>2]&~(1<<g);break}}else{if(k>>>0<(c[15072>>2]|0)>>>0){Xb()}g=k+16|0;if((c[g>>2]|0)==(e|0)){c[g>>2]=x}else{c[k+20>>2]=x}if((x|0)==0){break}}if(x>>>0<(c[15072>>2]|0)>>>0){Xb()}c[x+24>>2]=k;g=c[a+(b+16)>>2]|0;do{if((g|0)!=0){if(g>>>0<(c[15072>>2]|0)>>>0){Xb()}else{c[x+16>>2]=g;c[g+24>>2]=x;break}}}while(0);g=c[a+(b+20)>>2]|0;if((g|0)!=0){if(g>>>0<(c[15072>>2]|0)>>>0){Xb()}else{c[x+20>>2]=g;c[g+24>>2]=x;break}}}}else{g=c[a+(b+8)>>2]|0;k=c[a+(b+12)>>2]|0;j=15096+(f<<1<<2)|0;if((g|0)!=(j|0)){if(g>>>0<u>>>0){Xb()}if((c[g+12>>2]|0)!=(e|0)){Xb()}}if((k|0)==(g|0)){c[3764]=c[3764]&~(1<<f);break}if((k|0)!=(j|0)){if(k>>>0<u>>>0){Xb()}j=k+8|0;if((c[j>>2]|0)==(e|0)){A=j}else{Xb()}}else{A=k+8|0}c[g+12>>2]=k;c[A>>2]=g}}while(0);c[m+4>>2]=r|1;c[m+r>>2]=r;if((m|0)==(c[15076>>2]|0)){c[15064>>2]=r;i=d;return}else{B=r}}else{c[v>>2]=w&-2;c[m+4>>2]=n|1;c[m+n>>2]=n;B=n}n=B>>>3;if(B>>>0<256){w=n<<1;v=15096+(w<<2)|0;r=c[3764]|0;A=1<<n;if((r&A|0)!=0){n=15096+(w+2<<2)|0;e=c[n>>2]|0;if(e>>>0<(c[15072>>2]|0)>>>0){Xb()}else{C=n;D=e}}else{c[3764]=r|A;C=15096+(w+2<<2)|0;D=v}c[C>>2]=m;c[D+12>>2]=m;c[m+8>>2]=D;c[m+12>>2]=v;i=d;return}v=B>>>8;if((v|0)!=0){if(B>>>0>16777215){E=31}else{D=(v+1048320|0)>>>16&8;C=v<<D;v=(C+520192|0)>>>16&4;w=C<<v;C=(w+245760|0)>>>16&2;A=14-(v|D|C)+(w<<C>>>15)|0;E=B>>>(A+7|0)&1|A<<1}}else{E=0}A=15360+(E<<2)|0;c[m+28>>2]=E;c[m+20>>2]=0;c[m+16>>2]=0;C=c[15060>>2]|0;w=1<<E;if((C&w|0)==0){c[15060>>2]=C|w;c[A>>2]=m;c[m+24>>2]=A;c[m+12>>2]=m;c[m+8>>2]=m;i=d;return}w=c[A>>2]|0;if((E|0)==31){F=0}else{F=25-(E>>>1)|0}a:do{if((c[w+4>>2]&-8|0)==(B|0)){G=w}else{E=B<<F;A=w;while(1){H=A+(E>>>31<<2)+16|0;C=c[H>>2]|0;if((C|0)==0){break}if((c[C+4>>2]&-8|0)==(B|0)){G=C;break a}else{E=E<<1;A=C}}if(H>>>0<(c[15072>>2]|0)>>>0){Xb()}c[H>>2]=m;c[m+24>>2]=A;c[m+12>>2]=m;c[m+8>>2]=m;i=d;return}}while(0);H=G+8|0;B=c[H>>2]|0;w=c[15072>>2]|0;if(G>>>0<w>>>0){Xb()}if(B>>>0<w>>>0){Xb()}c[B+12>>2]=m;c[H>>2]=m;c[m+8>>2]=B;c[m+12>>2]=G;c[m+24>>2]=0;i=d;return}function Um(a){a=a|0;var b=0,d=0,e=0,f=0;b=i;d=(a|0)==0?1:a;while(1){e=Pm(d)|0;if((e|0)!=0){f=6;break}a=c[3888]|0;c[3888]=a+0;if((a|0)==0){f=5;break}uc[a&0]()}if((f|0)==5){d=Ya(4)|0;c[d>>2]=15568;zb(d|0,15616,114)}else if((f|0)==6){i=b;return e|0}return 0}function Vm(a){a=a|0;var b=0,c=0;b=i;c=Um(a)|0;i=b;return c|0}function Wm(a){a=a|0;var b=0;b=i;if((a|0)!=0){Qm(a)}i=b;return}function Xm(a){a=a|0;var b=0;b=i;Wm(a);i=b;return}function Ym(a){a=a|0;var b=0;b=i;Pb(a|0);Wm(a);i=b;return}function Zm(a){a=a|0;var b=0;b=i;Pb(a|0);i=b;return}function _m(a){a=a|0;return 15584}function $m(){var a=0;a=Ya(4)|0;c[a>>2]=15568;zb(a|0,15616,114)}function an(b,e,f){b=b|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0.0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0.0,U=0,V=0.0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,fa=0.0,ga=0,ha=0.0,ia=0,ja=0.0,ka=0,la=0.0,ma=0,na=0.0,oa=0,pa=0,qa=0,ra=0,sa=0,ta=0,ua=0,va=0.0,wa=0,xa=0.0,ya=0,za=0,Aa=0,Ba=0,Ca=0.0,Da=0,Ea=0.0,Fa=0.0,Ga=0,Ha=0.0,Ia=0,Ja=0,Ka=0,La=0,Ma=0,Na=0,Oa=0,Qa=0,Sa=0,Ta=0,Ua=0,Wa=0,Xa=0,Ya=0,Za=0,_a=0,$a=0,ab=0,bb=0,cb=0,eb=0,fb=0,gb=0,hb=0,ib=0,jb=0,kb=0,lb=0,mb=0,nb=0,ob=0,pb=0,qb=0,rb=0,sb=0,tb=0,ub=0,vb=0,wb=0,xb=0,yb=0,zb=0,Ab=0,Bb=0,Cb=0,Db=0,Eb=0,Fb=0,Gb=0,Hb=0,Ib=0,Jb=0,Kb=0,Lb=0,Mb=0,Nb=0,Ob=0,Pb=0,Qb=0,Rb=0,Sb=0,Tb=0,Ub=0,Vb=0,Wb=0,Xb=0,Yb=0,Zb=0,_b=0,$b=0,ac=0,bc=0,cc=0,dc=0,ec=0,fc=0,gc=0,hc=0,ic=0,jc=0,kc=0,lc=0,mc=0,nc=0,oc=0,pc=0,qc=0,rc=0,sc=0,tc=0,uc=0,vc=0.0,wc=0,xc=0,yc=0.0,zc=0.0,Ac=0.0,Bc=0.0,Cc=0.0,Dc=0.0,Ec=0,Fc=0,Gc=0.0,Hc=0,Ic=0.0;g=i;i=i+512|0;h=g;if((e|0)==1){j=53;k=-1074}else if((e|0)==2){j=53;k=-1074}else if((e|0)==0){j=24;k=-149}else{l=0.0;i=g;return+l}e=b+4|0;m=b+100|0;do{n=c[e>>2]|0;if(n>>>0<(c[m>>2]|0)>>>0){c[e>>2]=n+1;o=d[n]|0}else{o=dn(b)|0}}while((Ra(o|0)|0)!=0);do{if((o|0)==43|(o|0)==45){n=1-(((o|0)==45)<<1)|0;p=c[e>>2]|0;if(p>>>0<(c[m>>2]|0)>>>0){c[e>>2]=p+1;q=d[p]|0;r=n;break}else{q=dn(b)|0;r=n;break}}else{q=o;r=1}}while(0);o=q;q=0;while(1){if((o|32|0)!=(a[15632+q|0]|0)){s=o;t=q;break}do{if(q>>>0<7){n=c[e>>2]|0;if(n>>>0<(c[m>>2]|0)>>>0){c[e>>2]=n+1;u=d[n]|0;break}else{u=dn(b)|0;break}}else{u=o}}while(0);n=q+1|0;if(n>>>0<8){o=u;q=n}else{s=u;t=n;break}}do{if((t|0)==3){v=23}else if((t|0)!=8){u=(f|0)==0;if(!(t>>>0<4|u)){if((t|0)==8){break}else{v=23;break}}a:do{if((t|0)==0){q=s;o=0;while(1){if((q|32|0)!=(a[15648+o|0]|0)){w=q;z=o;break a}do{if(o>>>0<2){n=c[e>>2]|0;if(n>>>0<(c[m>>2]|0)>>>0){c[e>>2]=n+1;A=d[n]|0;break}else{A=dn(b)|0;break}}else{A=q}}while(0);n=o+1|0;if(n>>>0<3){q=A;o=n}else{w=A;z=n;break}}}else{w=s;z=t}}while(0);if((z|0)==3){o=c[e>>2]|0;if(o>>>0<(c[m>>2]|0)>>>0){c[e>>2]=o+1;B=d[o]|0}else{B=dn(b)|0}if((B|0)==40){C=1}else{if((c[m>>2]|0)==0){l=x;i=g;return+l}c[e>>2]=(c[e>>2]|0)+ -1;l=x;i=g;return+l}while(1){o=c[e>>2]|0;if(o>>>0<(c[m>>2]|0)>>>0){c[e>>2]=o+1;D=d[o]|0}else{D=dn(b)|0}if(!((D+ -48|0)>>>0<10|(D+ -65|0)>>>0<26)?!((D+ -97|0)>>>0<26|(D|0)==95):0){break}C=C+1|0}if((D|0)==41){l=x;i=g;return+l}o=(c[m>>2]|0)==0;if(!o){c[e>>2]=(c[e>>2]|0)+ -1}if(u){c[(db()|0)>>2]=22;cn(b,0);l=0.0;i=g;return+l}if((C|0)==0|o){l=x;i=g;return+l}else{E=C}while(1){o=E+ -1|0;c[e>>2]=(c[e>>2]|0)+ -1;if((o|0)==0){l=x;break}else{E=o}}i=g;return+l}else if((z|0)==0){do{if((w|0)==48){o=c[e>>2]|0;if(o>>>0<(c[m>>2]|0)>>>0){c[e>>2]=o+1;F=d[o]|0}else{F=dn(b)|0}if((F|32|0)!=120){if((c[m>>2]|0)==0){G=48;break}c[e>>2]=(c[e>>2]|0)+ -1;G=48;break}o=c[e>>2]|0;if(o>>>0<(c[m>>2]|0)>>>0){c[e>>2]=o+1;H=d[o]|0;J=0}else{H=dn(b)|0;J=0}while(1){if((H|0)==46){v=70;break}else if((H|0)!=48){K=0;L=0;M=0;N=0;O=H;P=J;Q=0;R=0;S=1.0;U=0;V=0.0;break}o=c[e>>2]|0;if(o>>>0<(c[m>>2]|0)>>>0){c[e>>2]=o+1;H=d[o]|0;J=1;continue}else{H=dn(b)|0;J=1;continue}}b:do{if((v|0)==70){o=c[e>>2]|0;if(o>>>0<(c[m>>2]|0)>>>0){c[e>>2]=o+1;W=d[o]|0}else{W=dn(b)|0}if((W|0)==48){o=-1;q=-1;while(1){n=c[e>>2]|0;if(n>>>0<(c[m>>2]|0)>>>0){c[e>>2]=n+1;X=d[n]|0}else{X=dn(b)|0}if((X|0)!=48){K=0;L=0;M=o;N=q;O=X;P=1;Q=1;R=0;S=1.0;U=0;V=0.0;break b}n=nn(o|0,q|0,-1,-1)|0;o=n;q=I}}else{K=0;L=0;M=0;N=0;O=W;P=J;Q=1;R=0;S=1.0;U=0;V=0.0}}}while(0);c:while(1){q=O+ -48|0;do{if(!(q>>>0<10)){o=O|32;n=(O|0)==46;if(!((o+ -97|0)>>>0<6|n)){Y=O;break c}if(n){if((Q|0)==0){Z=L;_=K;$=L;aa=K;ba=P;ca=1;da=R;fa=S;ga=U;ha=V;break}else{Y=46;break c}}else{ia=(O|0)>57?o+ -87|0:q;v=84;break}}else{ia=q;v=84}}while(0);if((v|0)==84){v=0;do{if(!((K|0)<0|(K|0)==0&L>>>0<8)){if((K|0)<0|(K|0)==0&L>>>0<14){ja=S*.0625;ka=R;la=ja;ma=U;na=V+ja*+(ia|0);break}if((ia|0)!=0&(R|0)==0){ka=1;la=S;ma=U;na=V+S*.5}else{ka=R;la=S;ma=U;na=V}}else{ka=R;la=S;ma=ia+(U<<4)|0;na=V}}while(0);q=nn(L|0,K|0,1,0)|0;Z=M;_=N;$=q;aa=I;ba=1;ca=Q;da=ka;fa=la;ga=ma;ha=na}q=c[e>>2]|0;if(q>>>0<(c[m>>2]|0)>>>0){c[e>>2]=q+1;K=aa;L=$;M=Z;N=_;O=d[q]|0;P=ba;Q=ca;R=da;S=fa;U=ga;V=ha;continue}else{K=aa;L=$;M=Z;N=_;O=dn(b)|0;P=ba;Q=ca;R=da;S=fa;U=ga;V=ha;continue}}if((P|0)==0){q=(c[m>>2]|0)==0;if(!q){c[e>>2]=(c[e>>2]|0)+ -1}if(!u){if(!q?(q=c[e>>2]|0,c[e>>2]=q+ -1,(Q|0)!=0):0){c[e>>2]=q+ -2}}else{cn(b,0)}l=+(r|0)*0.0;i=g;return+l}q=(Q|0)==0;o=q?L:M;n=q?K:N;if((K|0)<0|(K|0)==0&L>>>0<8){q=L;p=K;oa=U;while(1){pa=oa<<4;qa=nn(q|0,p|0,1,0)|0;ra=I;if((ra|0)<0|(ra|0)==0&qa>>>0<8){q=qa;p=ra;oa=pa}else{sa=pa;break}}}else{sa=U}do{if((Y|32|0)==112){oa=bn(b,f)|0;p=I;if((oa|0)==0&(p|0)==-2147483648){if(u){cn(b,0);l=0.0;i=g;return+l}else{if((c[m>>2]|0)==0){ta=0;ua=0;break}c[e>>2]=(c[e>>2]|0)+ -1;ta=0;ua=0;break}}else{ta=oa;ua=p}}else{if((c[m>>2]|0)==0){ta=0;ua=0}else{c[e>>2]=(c[e>>2]|0)+ -1;ta=0;ua=0}}}while(0);p=sn(o|0,n|0,2)|0;oa=nn(p|0,I|0,-32,-1)|0;p=nn(oa|0,I|0,ta|0,ua|0)|0;oa=I;if((sa|0)==0){l=+(r|0)*0.0;i=g;return+l}if((oa|0)>0|(oa|0)==0&p>>>0>(0-k|0)>>>0){c[(db()|0)>>2]=34;l=+(r|0)*1.7976931348623157e+308*1.7976931348623157e+308;i=g;return+l}q=k+ -106|0;pa=((q|0)<0)<<31>>31;if((oa|0)<(pa|0)|(oa|0)==(pa|0)&p>>>0<q>>>0){c[(db()|0)>>2]=34;l=+(r|0)*2.2250738585072014e-308*2.2250738585072014e-308;i=g;return+l}if((sa|0)>-1){q=p;pa=oa;ra=sa;ja=V;while(1){qa=ra<<1;if(!(ja>=.5)){va=ja;wa=qa}else{va=ja+-1.0;wa=qa|1}xa=ja+va;qa=nn(q|0,pa|0,-1,-1)|0;ya=I;if((wa|0)>-1){q=qa;pa=ya;ra=wa;ja=xa}else{za=qa;Aa=ya;Ba=wa;Ca=xa;break}}}else{za=p;Aa=oa;Ba=sa;Ca=V}ra=mn(32,0,k|0,((k|0)<0)<<31>>31|0)|0;pa=nn(za|0,Aa|0,ra|0,I|0)|0;ra=I;if(0>(ra|0)|0==(ra|0)&j>>>0>pa>>>0){Da=(pa|0)<0?0:pa}else{Da=j}if((Da|0)<53){ja=+(r|0);xa=+Va(+(+en(1.0,84-Da|0)),+ja);if((Da|0)<32&Ca!=0.0){pa=Ba&1;Ea=ja;Fa=xa;Ga=(pa^1)+Ba|0;Ha=(pa|0)==0?0.0:Ca}else{Ea=ja;Fa=xa;Ga=Ba;Ha=Ca}}else{Ea=+(r|0);Fa=0.0;Ga=Ba;Ha=Ca}xa=Ea*Ha+(Fa+Ea*+(Ga>>>0))-Fa;if(!(xa!=0.0)){c[(db()|0)>>2]=34}l=+fn(xa,za);i=g;return+l}else{G=w}}while(0);pa=k+j|0;ra=0-pa|0;q=G;n=0;while(1){if((q|0)==46){v=139;break}else if((q|0)!=48){Ia=q;Ja=0;Ka=0;La=n;Ma=0;break}o=c[e>>2]|0;if(o>>>0<(c[m>>2]|0)>>>0){c[e>>2]=o+1;q=d[o]|0;n=1;continue}else{q=dn(b)|0;n=1;continue}}d:do{if((v|0)==139){q=c[e>>2]|0;if(q>>>0<(c[m>>2]|0)>>>0){c[e>>2]=q+1;Na=d[q]|0}else{Na=dn(b)|0}if((Na|0)==48){q=-1;o=-1;while(1){ya=c[e>>2]|0;if(ya>>>0<(c[m>>2]|0)>>>0){c[e>>2]=ya+1;Oa=d[ya]|0}else{Oa=dn(b)|0}if((Oa|0)!=48){Ia=Oa;Ja=q;Ka=o;La=1;Ma=1;break d}ya=nn(q|0,o|0,-1,-1)|0;q=ya;o=I}}else{Ia=Na;Ja=0;Ka=0;La=n;Ma=1}}}while(0);c[h>>2]=0;n=Ia+ -48|0;o=(Ia|0)==46;e:do{if(n>>>0<10|o){q=h+496|0;oa=Ia;p=0;ya=0;qa=o;Qa=n;Sa=Ja;Ta=Ka;Ua=La;Wa=Ma;Xa=0;Ya=0;Za=0;while(1){do{if(qa){if((Wa|0)==0){_a=p;$a=ya;ab=p;bb=ya;cb=Ua;eb=1;fb=Xa;gb=Ya;hb=Za}else{ib=oa;jb=Sa;kb=Ta;lb=p;mb=ya;nb=Ua;ob=Xa;pb=Ya;qb=Za;break e}}else{rb=nn(p|0,ya|0,1,0)|0;sb=I;tb=(oa|0)!=48;if((Ya|0)>=125){if(!tb){_a=Sa;$a=Ta;ab=rb;bb=sb;cb=Ua;eb=Wa;fb=Xa;gb=Ya;hb=Za;break}c[q>>2]=c[q>>2]|1;_a=Sa;$a=Ta;ab=rb;bb=sb;cb=Ua;eb=Wa;fb=Xa;gb=Ya;hb=Za;break}ub=h+(Ya<<2)|0;if((Xa|0)==0){vb=Qa}else{vb=oa+ -48+((c[ub>>2]|0)*10|0)|0}c[ub>>2]=vb;ub=Xa+1|0;wb=(ub|0)==9;_a=Sa;$a=Ta;ab=rb;bb=sb;cb=1;eb=Wa;fb=wb?0:ub;gb=(wb&1)+Ya|0;hb=tb?rb:Za}}while(0);rb=c[e>>2]|0;if(rb>>>0<(c[m>>2]|0)>>>0){c[e>>2]=rb+1;xb=d[rb]|0}else{xb=dn(b)|0}rb=xb+ -48|0;tb=(xb|0)==46;if(rb>>>0<10|tb){oa=xb;p=ab;ya=bb;qa=tb;Qa=rb;Sa=_a;Ta=$a;Ua=cb;Wa=eb;Xa=fb;Ya=gb;Za=hb}else{yb=xb;zb=ab;Ab=_a;Bb=bb;Cb=$a;Db=cb;Eb=eb;Fb=fb;Gb=gb;Hb=hb;v=162;break}}}else{yb=Ia;zb=0;Ab=Ja;Bb=0;Cb=Ka;Db=La;Eb=Ma;Fb=0;Gb=0;Hb=0;v=162}}while(0);if((v|0)==162){n=(Eb|0)==0;ib=yb;jb=n?zb:Ab;kb=n?Bb:Cb;lb=zb;mb=Bb;nb=Db;ob=Fb;pb=Gb;qb=Hb}n=(nb|0)!=0;if(n?(ib|32|0)==101:0){o=bn(b,f)|0;Za=I;do{if((o|0)==0&(Za|0)==-2147483648){if(u){cn(b,0);l=0.0;i=g;return+l}else{if((c[m>>2]|0)==0){Ib=0;Jb=0;break}c[e>>2]=(c[e>>2]|0)+ -1;Ib=0;Jb=0;break}}else{Ib=o;Jb=Za}}while(0);Za=nn(Ib|0,Jb|0,jb|0,kb|0)|0;Kb=Za;Lb=I}else{if((ib|0)>-1?(c[m>>2]|0)!=0:0){c[e>>2]=(c[e>>2]|0)+ -1;Kb=jb;Lb=kb}else{Kb=jb;Lb=kb}}if(!n){c[(db()|0)>>2]=22;cn(b,0);l=0.0;i=g;return+l}Za=c[h>>2]|0;if((Za|0)==0){l=+(r|0)*0.0;i=g;return+l}do{if((Kb|0)==(lb|0)&(Lb|0)==(mb|0)&((mb|0)<0|(mb|0)==0&lb>>>0<10)){if(!(j>>>0>30)?(Za>>>j|0)!=0:0){break}l=+(r|0)*+(Za>>>0);i=g;return+l}}while(0);Za=(k|0)/-2|0;n=((Za|0)<0)<<31>>31;if((Lb|0)>(n|0)|(Lb|0)==(n|0)&Kb>>>0>Za>>>0){c[(db()|0)>>2]=34;l=+(r|0)*1.7976931348623157e+308*1.7976931348623157e+308;i=g;return+l}Za=k+ -106|0;n=((Za|0)<0)<<31>>31;if((Lb|0)<(n|0)|(Lb|0)==(n|0)&Kb>>>0<Za>>>0){c[(db()|0)>>2]=34;l=+(r|0)*2.2250738585072014e-308*2.2250738585072014e-308;i=g;return+l}if((ob|0)==0){Mb=pb}else{if((ob|0)<9){Za=h+(pb<<2)|0;n=c[Za>>2]|0;o=ob;do{n=n*10|0;o=o+1|0}while((o|0)!=9);c[Za>>2]=n}Mb=pb+1|0}do{if((qb|0)<9?(qb|0)<=(Kb|0)&(Kb|0)<18:0){if((Kb|0)==9){l=+(r|0)*+((c[h>>2]|0)>>>0);i=g;return+l}if((Kb|0)<9){l=+(r|0)*+((c[h>>2]|0)>>>0)/+(c[15664+(8-Kb<<2)>>2]|0);i=g;return+l}o=j+27+(ea(Kb,-3)|0)|0;u=c[h>>2]|0;if((o|0)<=30?(u>>>o|0)!=0:0){break}l=+(r|0)*+(u>>>0)*+(c[15664+(Kb+ -10<<2)>>2]|0);i=g;return+l}}while(0);n=(Kb|0)%9|0;if((n|0)==0){Nb=0;Ob=0;Pb=Kb;Qb=Mb}else{Za=(Kb|0)>-1?n:n+9|0;n=c[15664+(8-Za<<2)>>2]|0;if((Mb|0)!=0){u=1e9/(n|0)|0;o=0;Ya=0;Xa=0;Wa=Kb;while(1){Ua=h+(Xa<<2)|0;Ta=c[Ua>>2]|0;Sa=((Ta>>>0)/(n>>>0)|0)+Ya|0;c[Ua>>2]=Sa;Rb=ea((Ta>>>0)%(n>>>0)|0,u)|0;Ta=Xa+1|0;if((Xa|0)==(o|0)&(Sa|0)==0){Sb=Ta&127;Tb=Wa+ -9|0}else{Sb=o;Tb=Wa}if((Ta|0)==(Mb|0)){break}else{o=Sb;Ya=Rb;Xa=Ta;Wa=Tb}}if((Rb|0)==0){Ub=Sb;Vb=Tb;Wb=Mb}else{c[h+(Mb<<2)>>2]=Rb;Ub=Sb;Vb=Tb;Wb=Mb+1|0}}else{Ub=0;Vb=Kb;Wb=0}Nb=Ub;Ob=0;Pb=9-Za+Vb|0;Qb=Wb}f:while(1){Wa=h+(Nb<<2)|0;if((Pb|0)<18){Xa=Ob;Ya=Qb;while(1){o=0;u=Ya+127|0;n=Ya;while(1){Ta=u&127;Sa=h+(Ta<<2)|0;Ua=sn(c[Sa>>2]|0,0,29)|0;Qa=nn(Ua|0,I|0,o|0,0)|0;Ua=I;if(Ua>>>0>0|(Ua|0)==0&Qa>>>0>1e9){qa=Cn(Qa|0,Ua|0,1e9,0)|0;ya=Dn(Qa|0,Ua|0,1e9,0)|0;Xb=ya;Yb=qa}else{Xb=Qa;Yb=0}c[Sa>>2]=Xb;Sa=(Ta|0)==(Nb|0);if((Ta|0)!=(n+127&127|0)|Sa){Zb=n}else{Zb=(Xb|0)==0?Ta:n}if(Sa){break}else{o=Yb;u=Ta+ -1|0;n=Zb}}n=Xa+ -29|0;if((Yb|0)==0){Xa=n;Ya=Zb}else{_b=n;$b=Yb;ac=Zb;break}}}else{if((Pb|0)==18){bc=Ob;cc=Qb}else{dc=Nb;ec=Ob;fc=Pb;gc=Qb;break}while(1){if(!((c[Wa>>2]|0)>>>0<9007199)){dc=Nb;ec=bc;fc=18;gc=cc;break f}Ya=0;Xa=cc+127|0;n=cc;while(1){u=Xa&127;o=h+(u<<2)|0;Ta=sn(c[o>>2]|0,0,29)|0;Sa=nn(Ta|0,I|0,Ya|0,0)|0;Ta=I;if(Ta>>>0>0|(Ta|0)==0&Sa>>>0>1e9){Qa=Cn(Sa|0,Ta|0,1e9,0)|0;qa=Dn(Sa|0,Ta|0,1e9,0)|0;hc=qa;ic=Qa}else{hc=Sa;ic=0}c[o>>2]=hc;o=(u|0)==(Nb|0);if((u|0)!=(n+127&127|0)|o){jc=n}else{jc=(hc|0)==0?u:n}if(o){break}else{Ya=ic;Xa=u+ -1|0;n=jc}}n=bc+ -29|0;if((ic|0)==0){bc=n;cc=jc}else{_b=n;$b=ic;ac=jc;break}}}Wa=Nb+127&127;if((Wa|0)==(ac|0)){n=ac+127&127;Xa=h+((ac+126&127)<<2)|0;c[Xa>>2]=c[Xa>>2]|c[h+(n<<2)>>2];kc=n}else{kc=ac}c[h+(Wa<<2)>>2]=$b;Nb=Wa;Ob=_b;Pb=Pb+9|0;Qb=kc}g:while(1){lc=gc+1&127;Za=h+((gc+127&127)<<2)|0;Wa=dc;n=ec;Xa=fc;while(1){Ya=(Xa|0)==18;u=(Xa|0)>27?9:1;mc=Wa;nc=n;while(1){o=0;while(1){Sa=o+mc&127;if((Sa|0)==(gc|0)){oc=2;break}Qa=c[h+(Sa<<2)>>2]|0;Sa=c[15656+(o<<2)>>2]|0;if(Qa>>>0<Sa>>>0){oc=2;break}qa=o+1|0;if(Qa>>>0>Sa>>>0){oc=o;break}if((qa|0)<2){o=qa}else{oc=qa;break}}if((oc|0)==2&Ya){break g}pc=u+nc|0;if((mc|0)==(gc|0)){mc=gc;nc=pc}else{break}}Ya=(1<<u)+ -1|0;o=1e9>>>u;qc=mc;rc=0;qa=mc;sc=Xa;do{Sa=h+(qa<<2)|0;Qa=c[Sa>>2]|0;Ta=(Qa>>>u)+rc|0;c[Sa>>2]=Ta;rc=ea(Qa&Ya,o)|0;Qa=(qa|0)==(qc|0)&(Ta|0)==0;qa=qa+1&127;sc=Qa?sc+ -9|0:sc;qc=Qa?qa:qc}while((qa|0)!=(gc|0));if((rc|0)==0){Wa=qc;n=pc;Xa=sc;continue}if((lc|0)!=(qc|0)){break}c[Za>>2]=c[Za>>2]|1;Wa=qc;n=pc;Xa=sc}c[h+(gc<<2)>>2]=rc;dc=qc;ec=pc;fc=sc;gc=lc}Xa=mc&127;if((Xa|0)==(gc|0)){c[h+(lc+ -1<<2)>>2]=0;tc=lc}else{tc=gc}xa=+((c[h+(Xa<<2)>>2]|0)>>>0);Xa=mc+1&127;if((Xa|0)==(tc|0)){n=tc+1&127;c[h+(n+ -1<<2)>>2]=0;uc=n}else{uc=tc}ja=+(r|0);vc=ja*(xa*1.0e9+ +((c[h+(Xa<<2)>>2]|0)>>>0));Xa=nc+53|0;n=Xa-k|0;if((n|0)<(j|0)){wc=(n|0)<0?0:n;xc=1}else{wc=j;xc=0}if((wc|0)<53){xa=+Va(+(+en(1.0,105-wc|0)),+vc);yc=+Pa(+vc,+(+en(1.0,53-wc|0)));zc=xa;Ac=yc;Bc=xa+(vc-yc)}else{zc=0.0;Ac=0.0;Bc=vc}Wa=mc+2&127;if((Wa|0)!=(uc|0)){Za=c[h+(Wa<<2)>>2]|0;do{if(!(Za>>>0<5e8)){if(Za>>>0>5e8){Cc=ja*.75+Ac;break}if((mc+3&127|0)==(uc|0)){Cc=ja*.5+Ac;break}else{Cc=ja*.75+Ac;break}}else{if((Za|0)==0?(mc+3&127|0)==(uc|0):0){Cc=Ac;break}Cc=ja*.25+Ac}}while(0);if((53-wc|0)>1?!(+Pa(+Cc,1.0)!=0.0):0){Dc=Cc+1.0}else{Dc=Cc}}else{Dc=Ac}ja=Bc+Dc-zc;do{if((Xa&2147483647|0)>(-2-pa|0)){if(!(+T(+ja)>=9007199254740992.0)){Ec=xc;Fc=nc;Gc=ja}else{Ec=(xc|0)!=0&(wc|0)==(n|0)?0:xc;Fc=nc+1|0;Gc=ja*.5}if((Fc+50|0)<=(ra|0)?!((Ec|0)!=0&Dc!=0.0):0){Hc=Fc;Ic=Gc;break}c[(db()|0)>>2]=34;Hc=Fc;Ic=Gc}else{Hc=nc;Ic=ja}}while(0);l=+fn(Ic,Hc);i=g;return+l}else{if((c[m>>2]|0)!=0){c[e>>2]=(c[e>>2]|0)+ -1}c[(db()|0)>>2]=22;cn(b,0);l=0.0;i=g;return+l}}}while(0);if((v|0)==23){v=(c[m>>2]|0)==0;if(!v){c[e>>2]=(c[e>>2]|0)+ -1}if(!(t>>>0<4|(f|0)==0|v)){v=t;do{c[e>>2]=(c[e>>2]|0)+ -1;v=v+ -1|0}while(v>>>0>3)}}l=+(r|0)*y;i=g;return+l}function bn(a,b){a=a|0;b=b|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0;e=i;f=a+4|0;g=c[f>>2]|0;h=a+100|0;if(g>>>0<(c[h>>2]|0)>>>0){c[f>>2]=g+1;j=d[g]|0}else{j=dn(a)|0}if((j|0)==43|(j|0)==45){g=(j|0)==45|0;k=c[f>>2]|0;if(k>>>0<(c[h>>2]|0)>>>0){c[f>>2]=k+1;l=d[k]|0}else{l=dn(a)|0}if(!((l+ -48|0)>>>0<10|(b|0)==0)?(c[h>>2]|0)!=0:0){c[f>>2]=(c[f>>2]|0)+ -1;m=l;n=g}else{m=l;n=g}}else{m=j;n=0}if((m+ -48|0)>>>0>9){if((c[h>>2]|0)==0){o=-2147483648;p=0;I=o;i=e;return p|0}c[f>>2]=(c[f>>2]|0)+ -1;o=-2147483648;p=0;I=o;i=e;return p|0}else{q=m;r=0}while(1){s=q+ -48+r|0;m=c[f>>2]|0;if(m>>>0<(c[h>>2]|0)>>>0){c[f>>2]=m+1;t=d[m]|0}else{t=dn(a)|0}if(!((t+ -48|0)>>>0<10&(s|0)<214748364)){break}q=t;r=s*10|0}r=((s|0)<0)<<31>>31;if((t+ -48|0)>>>0<10){q=s;m=r;j=t;while(1){g=Bn(q|0,m|0,10,0)|0;l=I;b=nn(j|0,((j|0)<0)<<31>>31|0,-48,-1)|0;k=nn(b|0,I|0,g|0,l|0)|0;l=I;g=c[f>>2]|0;if(g>>>0<(c[h>>2]|0)>>>0){c[f>>2]=g+1;u=d[g]|0}else{u=dn(a)|0}if((u+ -48|0)>>>0<10&((l|0)<21474836|(l|0)==21474836&k>>>0<2061584302)){q=k;m=l;j=u}else{v=k;w=l;x=u;break}}}else{v=s;w=r;x=t}if((x+ -48|0)>>>0<10){do{x=c[f>>2]|0;if(x>>>0<(c[h>>2]|0)>>>0){c[f>>2]=x+1;y=d[x]|0}else{y=dn(a)|0}}while((y+ -48|0)>>>0<10)}if((c[h>>2]|0)!=0){c[f>>2]=(c[f>>2]|0)+ -1}f=(n|0)!=0;n=mn(0,0,v|0,w|0)|0;o=f?I:w;p=f?n:v;I=o;i=e;return p|0}function cn(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0;d=i;c[a+104>>2]=b;e=c[a+8>>2]|0;f=c[a+4>>2]|0;g=e-f|0;c[a+108>>2]=g;if((b|0)!=0&(g|0)>(b|0)){c[a+100>>2]=f+b;i=d;return}else{c[a+100>>2]=e;i=d;return}}function dn(b){b=b|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0;e=i;f=b+104|0;g=c[f>>2]|0;if(!((g|0)!=0?(c[b+108>>2]|0)>=(g|0):0)){h=3}if((h|0)==3?(h=hn(b)|0,(h|0)>=0):0){g=c[f>>2]|0;f=c[b+8>>2]|0;if((g|0)!=0?(j=c[b+4>>2]|0,k=g-(c[b+108>>2]|0)+ -1|0,(f-j|0)>(k|0)):0){c[b+100>>2]=j+k}else{c[b+100>>2]=f}k=c[b+4>>2]|0;if((f|0)!=0){j=b+108|0;c[j>>2]=f+1-k+(c[j>>2]|0)}j=k+ -1|0;if((d[j]|0|0)==(h|0)){l=h;i=e;return l|0}a[j]=h;l=h;i=e;return l|0}c[b+100>>2]=0;l=-1;i=e;return l|0}function en(a,b){a=+a;b=b|0;var d=0,e=0.0,f=0,g=0,j=0,l=0.0;d=i;if((b|0)>1023){e=a*8.98846567431158e+307;f=b+ -1023|0;if((f|0)>1023){g=b+ -2046|0;j=(g|0)>1023?1023:g;l=e*8.98846567431158e+307}else{j=f;l=e}}else{if((b|0)<-1022){e=a*2.2250738585072014e-308;f=b+1022|0;if((f|0)<-1022){g=b+2044|0;j=(g|0)<-1022?-1022:g;l=e*2.2250738585072014e-308}else{j=f;l=e}}else{j=b;l=a}}b=sn(j+1023|0,0,52)|0;j=I;c[k>>2]=b;c[k+4>>2]=j;a=l*+h[k>>3];i=d;return+a}function fn(a,b){a=+a;b=b|0;var c=0,d=0.0;c=i;d=+en(a,b);i=c;return+d}function gn(b){b=b|0;var d=0,e=0,f=0,g=0,h=0;d=i;e=b+74|0;f=a[e]|0;a[e]=f+255|f;f=b+20|0;e=b+44|0;if((c[f>>2]|0)>>>0>(c[e>>2]|0)>>>0){ic[c[b+36>>2]&31](b,0,0)|0}c[b+16>>2]=0;c[b+28>>2]=0;c[f>>2]=0;f=c[b>>2]|0;if((f&20|0)==0){g=c[e>>2]|0;c[b+8>>2]=g;c[b+4>>2]=g;h=0;i=d;return h|0}if((f&4|0)==0){h=-1;i=d;return h|0}c[b>>2]=f|32;h=-1;i=d;return h|0}function hn(a){a=a|0;var b=0,e=0,f=0;b=i;i=i+16|0;e=b;if((c[a+8>>2]|0)==0?(gn(a)|0)!=0:0){f=-1}else{if((ic[c[a+32>>2]&31](a,e,1)|0)==1){f=d[e]|0}else{f=-1}}i=b;return f|0}function jn(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0.0,j=0,k=0;d=i;i=i+112|0;e=d;f=e+0|0;g=f+112|0;do{c[f>>2]=0;f=f+4|0}while((f|0)<(g|0));f=e+4|0;c[f>>2]=a;g=e+8|0;c[g>>2]=-1;c[e+44>>2]=a;c[e+76>>2]=-1;cn(e,0);h=+an(e,2,1);j=(c[f>>2]|0)-(c[g>>2]|0)+(c[e+108>>2]|0)|0;if((b|0)==0){i=d;return+h}if((j|0)==0){k=a}else{k=a+j|0}c[b>>2]=k;i=d;return+h}function kn(b,c,d){b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0;e=i;a:do{if((d|0)==0){f=0}else{g=d;h=b;j=c;while(1){k=a[h]|0;l=a[j]|0;if(!(k<<24>>24==l<<24>>24)){break}m=g+ -1|0;if((m|0)==0){f=0;break a}else{g=m;h=h+1|0;j=j+1|0}}f=(k&255)-(l&255)|0}}while(0);i=e;return f|0}function ln(){c[912]=o;c[938]=o;c[3676]=o;c[3906]=o}function mn(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0;e=b-d>>>0;e=b-d-(c>>>0>a>>>0|0)>>>0;return(I=e,a-c>>>0|0)|0}function nn(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0;e=a+c>>>0;return(I=b+d+(e>>>0<a>>>0|0)>>>0,e|0)|0}function on(b,d,e){b=b|0;d=d|0;e=e|0;var f=0;if((e|0)>=4096)return pb(b|0,d|0,e|0)|0;f=b|0;if((b&3)==(d&3)){while(b&3){if((e|0)==0)return f|0;a[b]=a[d]|0;b=b+1|0;d=d+1|0;e=e-1|0}while((e|0)>=4){c[b>>2]=c[d>>2];b=b+4|0;d=d+4|0;e=e-4|0}}while((e|0)>0){a[b]=a[d]|0;b=b+1|0;d=d+1|0;e=e-1|0}return f|0}function pn(b,c,d){b=b|0;c=c|0;d=d|0;var e=0;if((c|0)<(b|0)&(b|0)<(c+d|0)){e=b;c=c+d|0;b=b+d|0;while((d|0)>0){b=b-1|0;c=c-1|0;d=d-1|0;a[b]=a[c]|0}b=e}else{on(b,c,d)|0}return b|0}function qn(b){b=b|0;var c=0;c=b;while(a[c]|0){c=c+1|0}return c-b|0}function rn(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0;f=b+e|0;if((e|0)>=20){d=d&255;g=b&3;h=d|d<<8|d<<16|d<<24;i=f&~3;if(g){g=b+4-g|0;while((b|0)<(g|0)){a[b]=d;b=b+1|0}}while((b|0)<(i|0)){c[b>>2]=h;b=b+4|0}}while((b|0)<(f|0)){a[b]=d;b=b+1|0}return b-e|0}function sn(a,b,c){a=a|0;b=b|0;c=c|0;if((c|0)<32){I=b<<c|(a&(1<<c)-1<<32-c)>>>32-c;return a<<c}I=a<<c-32;return 0}function tn(b,c){b=b|0;c=c|0;var d=0;do{a[b+d|0]=a[c+d|0];d=d+1|0}while(a[c+(d-1)|0]|0);return b|0}function un(a,b,c){a=a|0;b=b|0;c=c|0;if((c|0)<32){I=b>>>c;return a>>>c|(b&(1<<c)-1)<<32-c}I=0;return b>>>c-32|0}function vn(a,b,c){a=a|0;b=b|0;c=c|0;if((c|0)<32){I=b>>c;return a>>>c|(b&(1<<c)-1)<<32-c}I=(b|0)<0?-1:0;return b>>c-32|0}function wn(b){b=b|0;var c=0;c=a[n+(b>>>24)|0]|0;if((c|0)<8)return c|0;c=a[n+(b>>16&255)|0]|0;if((c|0)<8)return c+8|0;c=a[n+(b>>8&255)|0]|0;if((c|0)<8)return c+16|0;return(a[n+(b&255)|0]|0)+24|0}function xn(b){b=b|0;var c=0;c=a[m+(b&255)|0]|0;if((c|0)<8)return c|0;c=a[m+(b>>8&255)|0]|0;if((c|0)<8)return c+8|0;c=a[m+(b>>16&255)|0]|0;if((c|0)<8)return c+16|0;return(a[m+(b>>>24)|0]|0)+24|0}function yn(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0;c=a&65535;d=b&65535;e=ea(d,c)|0;f=a>>>16;a=(e>>>16)+(ea(d,f)|0)|0;d=b>>>16;b=ea(d,c)|0;return(I=(a>>>16)+(ea(d,f)|0)+(((a&65535)+b|0)>>>16)|0,a+b<<16|e&65535|0)|0}function zn(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0,i=0;e=b>>31|((b|0)<0?-1:0)<<1;f=((b|0)<0?-1:0)>>31|((b|0)<0?-1:0)<<1;g=d>>31|((d|0)<0?-1:0)<<1;h=((d|0)<0?-1:0)>>31|((d|0)<0?-1:0)<<1;i=mn(e^a,f^b,e,f)|0;b=I;a=g^e;e=h^f;f=mn((En(i,b,mn(g^c,h^d,g,h)|0,I,0)|0)^a,I^e,a,e)|0;return f|0}function An(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0;f=i;i=i+8|0;g=f|0;h=b>>31|((b|0)<0?-1:0)<<1;j=((b|0)<0?-1:0)>>31|((b|0)<0?-1:0)<<1;k=e>>31|((e|0)<0?-1:0)<<1;l=((e|0)<0?-1:0)>>31|((e|0)<0?-1:0)<<1;m=mn(h^a,j^b,h,j)|0;b=I;En(m,b,mn(k^d,l^e,k,l)|0,I,g)|0;l=mn(c[g>>2]^h,c[g+4>>2]^j,h,j)|0;j=I;i=f;return(I=j,l)|0}function Bn(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0;e=a;a=c;c=yn(e,a)|0;f=I;return(I=(ea(b,a)|0)+(ea(d,e)|0)+f|f&0,c|0|0)|0}function Cn(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0;e=En(a,b,c,d,0)|0;return e|0}function Dn(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0;f=i;i=i+8|0;g=f|0;En(a,b,d,e,g)|0;i=f;return(I=c[g+4>>2]|0,c[g>>2]|0)|0}function En(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,J=0,K=0,L=0,M=0;g=a;h=b;i=h;j=d;k=e;l=k;if((i|0)==0){m=(f|0)!=0;if((l|0)==0){if(m){c[f>>2]=(g>>>0)%(j>>>0);c[f+4>>2]=0}n=0;o=(g>>>0)/(j>>>0)>>>0;return(I=n,o)|0}else{if(!m){n=0;o=0;return(I=n,o)|0}c[f>>2]=a|0;c[f+4>>2]=b&0;n=0;o=0;return(I=n,o)|0}}m=(l|0)==0;do{if((j|0)!=0){if(!m){p=(wn(l|0)|0)-(wn(i|0)|0)|0;if(p>>>0<=31){q=p+1|0;r=31-p|0;s=p-31>>31;t=q;u=g>>>(q>>>0)&s|i<<r;v=i>>>(q>>>0)&s;w=0;x=g<<r;break}if((f|0)==0){n=0;o=0;return(I=n,o)|0}c[f>>2]=a|0;c[f+4>>2]=h|b&0;n=0;o=0;return(I=n,o)|0}r=j-1|0;if((r&j|0)!=0){s=(wn(j|0)|0)+33-(wn(i|0)|0)|0;q=64-s|0;p=32-s|0;y=p>>31;z=s-32|0;A=z>>31;t=s;u=p-1>>31&i>>>(z>>>0)|(i<<p|g>>>(s>>>0))&A;v=A&i>>>(s>>>0);w=g<<q&y;x=(i<<q|g>>>(z>>>0))&y|g<<p&s-33>>31;break}if((f|0)!=0){c[f>>2]=r&g;c[f+4>>2]=0}if((j|0)==1){n=h|b&0;o=a|0|0;return(I=n,o)|0}else{r=xn(j|0)|0;n=i>>>(r>>>0)|0;o=i<<32-r|g>>>(r>>>0)|0;return(I=n,o)|0}}else{if(m){if((f|0)!=0){c[f>>2]=(i>>>0)%(j>>>0);c[f+4>>2]=0}n=0;o=(i>>>0)/(j>>>0)>>>0;return(I=n,o)|0}if((g|0)==0){if((f|0)!=0){c[f>>2]=0;c[f+4>>2]=(i>>>0)%(l>>>0)}n=0;o=(i>>>0)/(l>>>0)>>>0;return(I=n,o)|0}r=l-1|0;if((r&l|0)==0){if((f|0)!=0){c[f>>2]=a|0;c[f+4>>2]=r&i|b&0}n=0;o=i>>>((xn(l|0)|0)>>>0);return(I=n,o)|0}r=(wn(l|0)|0)-(wn(i|0)|0)|0;if(r>>>0<=30){s=r+1|0;p=31-r|0;t=s;u=i<<p|g>>>(s>>>0);v=i>>>(s>>>0);w=0;x=g<<p;break}if((f|0)==0){n=0;o=0;return(I=n,o)|0}c[f>>2]=a|0;c[f+4>>2]=h|b&0;n=0;o=0;return(I=n,o)|0}}while(0);if((t|0)==0){B=x;C=w;D=v;E=u;F=0;G=0}else{b=d|0|0;d=k|e&0;e=nn(b,d,-1,-1)|0;k=I;h=x;x=w;w=v;v=u;u=t;t=0;while(1){H=x>>>31|h<<1;J=t|x<<1;a=v<<1|h>>>31|0;g=v>>>31|w<<1|0;mn(e,k,a,g)|0;i=I;l=i>>31|((i|0)<0?-1:0)<<1;K=l&1;L=mn(a,g,l&b,(((i|0)<0?-1:0)>>31|((i|0)<0?-1:0)<<1)&d)|0;M=I;i=u-1|0;if((i|0)==0){break}else{h=H;x=J;w=M;v=L;u=i;t=K}}B=H;C=J;D=M;E=L;F=0;G=K}K=C;C=0;if((f|0)!=0){c[f>>2]=E;c[f+4>>2]=D}n=(K|0)>>>31|(B|C)<<1|(C<<1|K>>>31)&0|F;o=(K<<1|0>>>31)&-2|G;return(I=n,o)|0}function Fn(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;return ic[a&31](b|0,c|0,d|0)|0}function Gn(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;jc[a&15](b|0,c|0,d|0,e|0,f|0,g|0)}function Hn(a,b,c,d,e,f,g,h){a=a|0;b=b|0;c=c|0;d=d|0;e=+e;f=+f;g=+g;h=+h;kc[a&3](b|0,c|0,d|0,+e,+f,+g,+h)}function In(a,b,c,d,e,f,g,h){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;lc[a&63](b|0,c|0,d|0,e|0,f|0,g|0,h|0)}function Jn(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=+e;f=+f;mc[a&3](b|0,c|0,d|0,+e,+f)}function Kn(a,b){a=a|0;b=b|0;nc[a&255](b|0)}function Ln(a,b,c){a=a|0;b=b|0;c=c|0;oc[a&63](b|0,c|0)}function Mn(a,b,c,d,e,f,g,h,i,j){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;pc[a&3](b|0,c|0,d|0,e|0,f|0,g|0,h|0,i|0,j|0)}function Nn(a,b){a=a|0;b=b|0;return qc[a&127](b|0)|0}function On(a,b,c,d,e,f,g,h){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=+h;rc[a&3](b|0,c|0,d|0,e|0,f|0,g|0,+h)}function Pn(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;sc[a&7](b|0,c|0,d|0)}function Qn(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=+g;tc[a&7](b|0,c|0,d|0,e|0,f|0,+g)}function Rn(a){a=a|0;uc[a&0]()}function Sn(a,b,c,d,e,f,g,h,i){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;return vc[a&15](b|0,c|0,d|0,e|0,f|0,g|0,h|0,i|0)|0}function Tn(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return wc[a&7](b|0,c|0,d|0,e|0)|0}function Un(a,b,c,d,e,f,g,h,i){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;xc[a&7](b|0,c|0,d|0,e|0,f|0,g|0,h|0,i|0)}function Vn(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;yc[a&3](b|0,c|0,d|0,e|0,f|0)}function Wn(a,b,c){a=a|0;b=b|0;c=c|0;return zc[a&15](b|0,c|0)|0}function Xn(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return Ac[a&15](b|0,c|0,d|0,e|0,f|0)|0}function Yn(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;Bc[a&15](b|0,c|0,d|0,e|0)}function Zn(a,b,c){a=a|0;b=b|0;c=c|0;fa(0);return 0}function _n(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;fa(1)}function $n(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=+d;e=+e;f=+f;g=+g;fa(2)}function ao(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;fa(3)}function bo(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=+d;e=+e;fa(4)}function co(a){a=a|0;fa(5)}function eo(a,b){a=a|0;b=b|0;fa(6)}function fo(a,b,c,d,e,f,g,h,i){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;fa(7)}function go(a){a=a|0;fa(8);return 0}function ho(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=+g;fa(9)}function io(a,b,c){a=a|0;b=b|0;c=c|0;fa(10)}function jo(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=+f;fa(11)}function ko(){fa(12)}function lo(a,b,c,d,e,f,g,h){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;fa(13);return 0}function mo(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;fa(14);return 0}function no(a,b,c,d,e,f,g,h){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;fa(15)}function oo(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;fa(16)}function po(a,b){a=a|0;b=b|0;fa(17);return 0}function qo(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;fa(18);return 0}function ro(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;fa(19)}




// EMSCRIPTEN_END_FUNCS
var ic=[Zn,pf,uf,Fd,yf,af,ff,Td,kf,re,se,eg,jg,Nj,Sj,xk,zk,Ck,ik,nk,pk,sk,Em,Zn,Zn,Zn,Zn,Zn,Zn,Zn,Zn,Zn];var jc=[_n,qf,bf,nh,oh,th,zh,Ch,Dh,Hh,Mh,Oj,Tj,Om,Nm,Mm];var kc=[$n,fd,gd,hd];var lc=[ao,mg,og,qg,sg,ug,wg,yg,Ag,Cg,Eg,Gg,Lg,Ng,Pg,Rg,Tg,Vg,Xg,Zg,$g,bh,dh,sh,uh,Gh,Ih,Rh,Sh,Th,Uh,Vh,ci,di,ei,fi,gi,Ej,Kj,ao,ao,ao,ao,ao,ao,ao,ao,ao,ao,ao,ao,ao,ao,ao,ao,ao,ao,ao,ao,ao,ao,ao,ao,ao];var mc=[bo,id,jd,bo];var nc=[co,Zc,_c,cd,qd,rd,Bd,Cd,Id,Jd,Pd,Qd,Wd,Xd,he,ge,me,le,oe,xe,we,_e,Ze,nf,mf,Bf,Af,Df,Cf,Gf,Ff,If,Hf,Lf,Kf,Nf,Mf,Qf,Pf,Sf,Rf,Yf,Xf,We,Zf,Wf,_f,ag,$f,fk,gg,fg,lg,kg,Kg,Jg,mh,lh,Bh,Ah,Ph,Oh,ai,$h,mi,li,pi,oi,ti,si,Ei,Di,Pi,Oi,_i,Zi,jj,ij,tj,sj,Aj,zj,Gj,Fj,Mj,Lj,Rj,Qj,_j,Zj,vk,uk,Vj,Mk,rl,ql,tl,sl,bg,ek,hk,Ek,Uk,dl,ol,pl,wm,vm,ym,Bm,zm,Am,Cm,Dm,Zm,Ym,Ad,gk,$l,lj,Qm,gm,fm,em,dm,cm,bm,De,Oe,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co,co];var oc=[eo,$c,ad,bd,ud,vd,xd,Dd,Kd,Rd,Yd,$e,of,wi,xi,yi,zi,Bi,Ci,Hi,Ii,Ji,Ki,Mi,Ni,Si,Ti,Ui,Vi,Xi,Yi,bj,cj,dj,ej,gj,hj,Pj,Uj,yl,Al,Cl,zl,Bl,Dl,eo,eo,eo,eo,eo,eo,eo,eo,eo,eo,eo,eo,eo,eo,eo,eo,eo,eo,eo];var pc=[fo,Wh,hi,fo];var qc=[go,sd,td,Ed,tf,vf,wf,sf,Ld,Md,Sd,ef,gf,hf,df,Zd,_d,ie,ne,Uf,Qh,El,Gl,Il,Ol,Ql,Kl,Ml,bi,Fl,Hl,Jl,Pl,Rl,Ll,Nl,ui,vi,Ai,Fi,Gi,Li,Qi,Ri,Wi,$i,aj,fj,Qk,Rk,Tk,ul,wl,vl,xl,Ik,Jk,Lk,_k,$k,cl,jl,kl,nl,xm,_m,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go,go];var rc=[ho,Bj,Hj,ho];var sc=[io,dd,ed,qe,Vf,io,io,io];var tc=[jo,vh,yh,Jh,Lh,jo,jo,jo];var uc=[ko];var vc=[lo,Nk,Ok,Fk,Gk,Vk,Xk,el,gl,lo,lo,lo,lo,lo,lo,lo];var wc=[mo,Bk,jk,kk,lk,rk,mo,mo];var xc=[no,ni,qi,kj,oj,uj,wj,no];var yc=[oo,Lm,Km,Jm];var zc=[po,xf,Gd,Nd,zf,jf,Ud,$d,lf,wk,yk,Ak,mk,ok,qk,po];var Ac=[qo,cg,hg,Dk,Pk,Sk,tk,Hk,Kk,Zk,al,il,ll,qo,qo,qo];var Bc=[ro,kd,wd,rf,cf,dg,ig,Fm,Gm,Hm,ro,ro,ro,ro,ro,ro];return{_REVERBDESIGNER_getNumInputs:Wc,_i64Subtract:mn,_free:Qm,_memset:rn,_realloc:Rm,_i64Add:nn,_REVERBDESIGNER_getNumParams:Tc,_REVERBDESIGNER_destructor:Yc,_REVERBDESIGNER_getNextParam:Uc,_REVERBDESIGNER_compute:Vc,_malloc:Pm,_REVERBDESIGNER_constructor:Sc,_memcpy:on,_strlen:qn,_memmove:pn,_strcpy:tn,_REVERBDESIGNER_getNumOutputs:Xc,_bitshift64Shl:sn,__GLOBAL__I_a:be,runPostSets:ln,stackAlloc:Cc,stackSave:Dc,stackRestore:Ec,setThrew:Fc,setTempRet0:Ic,setTempRet1:Jc,setTempRet2:Kc,setTempRet3:Lc,setTempRet4:Mc,setTempRet5:Nc,setTempRet6:Oc,setTempRet7:Pc,setTempRet8:Qc,setTempRet9:Rc,dynCall_iiii:Fn,dynCall_viiiiii:Gn,dynCall_viiidddd:Hn,dynCall_viiiiiii:In,dynCall_viiidd:Jn,dynCall_vi:Kn,dynCall_vii:Ln,dynCall_viiiiiiiii:Mn,dynCall_ii:Nn,dynCall_viiiiiid:On,dynCall_viii:Pn,dynCall_viiiiid:Qn,dynCall_v:Rn,dynCall_iiiiiiiii:Sn,dynCall_iiiii:Tn,dynCall_viiiiiiii:Un,dynCall_viiiii:Vn,dynCall_iii:Wn,dynCall_iiiiii:Xn,dynCall_viiii:Yn}})


// EMSCRIPTEN_END_ASM
({ "Math": Math, "Int8Array": Int8Array, "Int16Array": Int16Array, "Int32Array": Int32Array, "Uint8Array": Uint8Array, "Uint16Array": Uint16Array, "Uint32Array": Uint32Array, "Float32Array": Float32Array, "Float64Array": Float64Array }, { "abort": abort, "assert": assert, "asmPrintInt": asmPrintInt, "asmPrintFloat": asmPrintFloat, "min": Math_min, "invoke_iiii": invoke_iiii, "invoke_viiiiii": invoke_viiiiii, "invoke_viiidddd": invoke_viiidddd, "invoke_viiiiiii": invoke_viiiiiii, "invoke_viiidd": invoke_viiidd, "invoke_vi": invoke_vi, "invoke_vii": invoke_vii, "invoke_viiiiiiiii": invoke_viiiiiiiii, "invoke_ii": invoke_ii, "invoke_viiiiiid": invoke_viiiiiid, "invoke_viii": invoke_viii, "invoke_viiiiid": invoke_viiiiid, "invoke_v": invoke_v, "invoke_iiiiiiiii": invoke_iiiiiiiii, "invoke_iiiii": invoke_iiiii, "invoke_viiiiiiii": invoke_viiiiiiii, "invoke_viiiii": invoke_viiiii, "invoke_iii": invoke_iii, "invoke_iiiiii": invoke_iiiiii, "invoke_viiii": invoke_viiii, "_fabs": _fabs, "_pthread_cond_wait": _pthread_cond_wait, "_freelocale": _freelocale, "__formatString": __formatString, "_asprintf": _asprintf, "_vsnprintf": _vsnprintf, "_send": _send, "_strtoll_l": _strtoll_l, "_vsscanf": _vsscanf, "___ctype_b_loc": ___ctype_b_loc, "__ZSt9terminatev": __ZSt9terminatev, "_fmod": _fmod, "___cxa_guard_acquire": ___cxa_guard_acquire, "_isspace": _isspace, "___setErrNo": ___setErrNo, "___cxa_is_number_type": ___cxa_is_number_type, "_atexit": _atexit, "_copysign": _copysign, "_ungetc": _ungetc, "_logf": _logf, "___cxa_allocate_exception": ___cxa_allocate_exception, "__ZSt18uncaught_exceptionv": __ZSt18uncaught_exceptionv, "_isxdigit_l": _isxdigit_l, "___ctype_toupper_loc": ___ctype_toupper_loc, "_fflush": _fflush, "___cxa_guard_release": ___cxa_guard_release, "__addDays": __addDays, "___errno_location": ___errno_location, "_strtoll": _strtoll, "_strerror_r": _strerror_r, "_strftime_l": _strftime_l, "_catgets": _catgets, "_sscanf": _sscanf, "_sbrk": _sbrk, "_uselocale": _uselocale, "_llvm_pow_f32": _llvm_pow_f32, "_newlocale": _newlocale, "_snprintf": _snprintf, "___cxa_begin_catch": ___cxa_begin_catch, "_emscripten_memcpy_big": _emscripten_memcpy_big, "_fileno": _fileno, "___resumeException": ___resumeException, "___cxa_find_matching_catch": ___cxa_find_matching_catch, "__exit": __exit, "_strtoull": _strtoull, "_isdigit_l": _isdigit_l, "_strftime": _strftime, "_tanf": _tanf, "__arraySum": __arraySum, "___cxa_throw": ___cxa_throw, "___ctype_tolower_loc": ___ctype_tolower_loc, "_exp2": _exp2, "_pthread_mutex_unlock": _pthread_mutex_unlock, "_fread": _fread, "_pthread_cond_broadcast": _pthread_cond_broadcast, "_isxdigit": _isxdigit, "_sprintf": _sprintf, "_floorf": _floorf, "__reallyNegative": __reallyNegative, "_vasprintf": _vasprintf, "_write": _write, "__isLeapYear": __isLeapYear, "__scanString": __scanString, "_recv": _recv, "_expf": _expf, "__ZNSt9exceptionD2Ev": __ZNSt9exceptionD2Ev, "_fgetc": _fgetc, "_strtoull_l": _strtoull_l, "_mkport": _mkport, "___cxa_does_inherit": ___cxa_does_inherit, "_sysconf": _sysconf, "_read": _read, "__parseInt64": __parseInt64, "_abort": _abort, "_catclose": _catclose, "_fwrite": _fwrite, "_time": _time, "_pthread_mutex_lock": _pthread_mutex_lock, "_strerror": _strerror, "_pread": _pread, "_pwrite": _pwrite, "_catopen": _catopen, "_exit": _exit, "_isdigit": _isdigit, "__getFloat": __getFloat, "STACKTOP": STACKTOP, "STACK_MAX": STACK_MAX, "tempDoublePtr": tempDoublePtr, "ABORT": ABORT, "cttz_i8": cttz_i8, "ctlz_i8": ctlz_i8, "NaN": NaN, "Infinity": Infinity, "__ZTISt9exception": __ZTISt9exception, "___dso_handle": ___dso_handle, "_stderr": _stderr, "_stdin": _stdin, "_stdout": _stdout }, buffer);
var _REVERBDESIGNER_getNumInputs = Module["_REVERBDESIGNER_getNumInputs"] = asm["_REVERBDESIGNER_getNumInputs"];
var _i64Subtract = Module["_i64Subtract"] = asm["_i64Subtract"];
var _free = Module["_free"] = asm["_free"];
var _memset = Module["_memset"] = asm["_memset"];
var _realloc = Module["_realloc"] = asm["_realloc"];
var _i64Add = Module["_i64Add"] = asm["_i64Add"];
var _REVERBDESIGNER_getNumParams = Module["_REVERBDESIGNER_getNumParams"] = asm["_REVERBDESIGNER_getNumParams"];
var _REVERBDESIGNER_destructor = Module["_REVERBDESIGNER_destructor"] = asm["_REVERBDESIGNER_destructor"];
var _REVERBDESIGNER_getNextParam = Module["_REVERBDESIGNER_getNextParam"] = asm["_REVERBDESIGNER_getNextParam"];
var _REVERBDESIGNER_compute = Module["_REVERBDESIGNER_compute"] = asm["_REVERBDESIGNER_compute"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var _REVERBDESIGNER_constructor = Module["_REVERBDESIGNER_constructor"] = asm["_REVERBDESIGNER_constructor"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var _strlen = Module["_strlen"] = asm["_strlen"];
var _memmove = Module["_memmove"] = asm["_memmove"];
var _strcpy = Module["_strcpy"] = asm["_strcpy"];
var _REVERBDESIGNER_getNumOutputs = Module["_REVERBDESIGNER_getNumOutputs"] = asm["_REVERBDESIGNER_getNumOutputs"];
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

  var REVERBDESIGNER_constructor = Module.cwrap('REVERBDESIGNER_constructor', 'number', 'number');
  var REVERBDESIGNER_destructor = Module.cwrap('REVERBDESIGNER_destructor', null, ['number']);
  var REVERBDESIGNER_compute = Module.cwrap('REVERBDESIGNER_compute', ['number'], ['number', 'number', 'number', 'number']);
  var REVERBDESIGNER_getNumInputs = Module.cwrap('REVERBDESIGNER_getNumInputs', 'number', 'number');
  var REVERBDESIGNER_getNumOutputs = Module.cwrap('REVERBDESIGNER_getNumOutputs', 'number', 'number');
  var REVERBDESIGNER_getNumParams = Module.cwrap('REVERBDESIGNER_getNumParams', 'number', 'number');
  var REVERBDESIGNER_getNextParam = Module.cwrap('REVERBDESIGNER_getNextParam', 'number', ['number', 'number']);

  faust.reverbDesigner = function () {
    var that = {};
    
    that.model = {
      playing: false
    };

    that.ptr = REVERBDESIGNER_constructor(faust.context.sampleRate);

    // Bind to C++ Member Functions

    that.getNumInputs = function () {
      return REVERBDESIGNER_getNumInputs(that.ptr);
    };

    that.getNumOutputs = function () {
      return REVERBDESIGNER_getNumOutputs(that.ptr);
    };

    that.compute = function (e) {
      var reverbDesignerOutChans = HEAP32.subarray(that.outs >> 2, (that.outs + that.numOut * that.ptrsize) >> 2);
      var reverbDesignerInChans = HEAP32.subarray(that.ins >> 2, (that.ins + that.ins * that.ptrsize) >> 2);
      var i, j;
      for (i = 0; i < that.numIn; i++)
      {
        var input = e.inputBuffer.getChannelData(i);
        var reverbDesignerInput = HEAPF32.subarray(reverbDesignerInChans[i] >> 2, (reverbDesignerInChans[i] + that.vectorsize * that.ptrsize) >> 2);

        for (j = 0; j < input.length; j++) {
          reverbDesignerInput[j] = input[j];
        }
      }

      REVERBDESIGNER_compute(that.ptr, that.vectorsize, that.ins, that.outs);

      for (i = 0; i < that.numOut; i++)
      {
        var output = e.outputBuffer.getChannelData(i);
        var reverbDesignerOutput = HEAPF32.subarray(reverbDesignerOutChans[i] >> 2, (reverbDesignerOutChans[i] + that.vectorsize * that.ptrsize) >> 2);

        for (j = 0; j < output.length; j++) {
          output[j] = reverbDesignerOutput[j];
        }
      }
      return that;
    };

    that.destroy = function () {
      REVERBDESIGNER_destructor(that.ptr);
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
      var numParams = REVERBDESIGNER_getNumParams(that.ptr);
      for (i = 0; i < numParams; i++) {
        //TODO keyptr is allocated on stack, but is it properly freed?
        var keyPtr = allocate(intArrayFromString(''), 'i8', ALLOC_STACK);
        var valPtr = REVERBDESIGNER_getNextParam(that.ptr, keyPtr);
        var key = Pointer_stringify(keyPtr);
        that.model[key] = {
          value: HEAPF32[valPtr >> 2],
          pointer: valPtr
        };
      }
      return that;
    };

    that.update = function (key, val) {
      that.model[key].value = val;
      HEAPF32[that.model[key].pointer >> 2] = val;
      return that;
    };

    that.init = function () {
      var i;
      that.ptrsize = 4; //assuming pointer in emscripten are 32bits
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
