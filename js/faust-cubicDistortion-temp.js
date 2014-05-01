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
function Ec(a){a=a|0;var b=0;b=i;i=i+a|0;i=i+7&-8;return b|0}function Fc(){return i|0}function Gc(a){a=a|0;i=a}function Hc(a,b){a=a|0;b=b|0;if((t|0)==0){t=a;u=b}}function Ic(b){b=b|0;a[k]=a[b];a[k+1|0]=a[b+1|0];a[k+2|0]=a[b+2|0];a[k+3|0]=a[b+3|0]}function Jc(b){b=b|0;a[k]=a[b];a[k+1|0]=a[b+1|0];a[k+2|0]=a[b+2|0];a[k+3|0]=a[b+3|0];a[k+4|0]=a[b+4|0];a[k+5|0]=a[b+5|0];a[k+6|0]=a[b+6|0];a[k+7|0]=a[b+7|0]}function Kc(a){a=a|0;I=a}function Lc(a){a=a|0;J=a}function Mc(a){a=a|0;K=a}function Nc(a){a=a|0;L=a}function Oc(a){a=a|0;M=a}function Pc(a){a=a|0;N=a}function Qc(a){a=a|0;O=a}function Rc(a){a=a|0;P=a}function Sc(a){a=a|0;Q=a}function Tc(a){a=a|0;R=a}function Uc(a){a=a|0;var b=0,d=0,e=0,f=0;d=i;b=Wm(3444)|0;rn(b|0,0,3440)|0;c[b>>2]=120;f=Wm(20)|0;c[f>>2]=16;e=f+8|0;c[e>>2]=0;c[f+12>>2]=0;c[f+4>>2]=e;e=b+3440|0;c[e>>2]=f;zd(b,a);qc[c[(c[b>>2]|0)+16>>2]&63](b,c[e>>2]|0);a=c[e>>2]|0;c[a+16>>2]=c[a+4>>2];i=d;return b|0}function Vc(a){a=a|0;return c[(c[a+3440>>2]|0)+12>>2]|0}function Wc(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0;e=i;f=b+3440|0;g=c[(c[f>>2]|0)+16>>2]|0;b=c[g+28>>2]|0;h=g+16|0;if((a[h]&1)==0){g=h+1|0}else{g=c[g+24>>2]|0}vn(d|0,g|0)|0;d=(c[f>>2]|0)+16|0;h=c[d>>2]|0;g=c[h+4>>2]|0;if((g|0)==0){while(1){g=c[h+8>>2]|0;if((c[g>>2]|0)==(h|0)){break}else{h=g}}}else{while(1){h=c[g>>2]|0;if((h|0)==0){break}else{g=h}}}c[d>>2]=g;f=c[f>>2]|0;d=f+16|0;if((c[d>>2]|0)!=(f+8|0)){i=e;return b|0}c[d>>2]=c[f+4>>2];i=e;return b|0}function Xc(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0;f=i;Dc[c[(c[a>>2]|0)+24>>2]&15](a,b,d,e);i=f;return 1}function Yc(a){a=a|0;var b=0;b=i;a=sc[c[(c[a>>2]|0)+8>>2]&127](a)|0;i=b;return a|0}function Zc(a){a=a|0;var b=0;b=i;a=sc[c[(c[a>>2]|0)+12>>2]&127](a)|0;i=b;return a|0}function _c(a){a=a|0;var b=0;b=i;if((a|0)==0){i=b;return}pc[c[(c[a>>2]|0)+4>>2]&255](a);i=b;return}function $c(a){a=a|0;var b=0;b=i;c[a>>2]=16;rd(a+4|0,c[a+8>>2]|0);i=b;return}function ad(a){a=a|0;var b=0;b=i;c[a>>2]=16;rd(a+4|0,c[a+8>>2]|0);Ym(a);i=b;return}function bd(a,b){a=a|0;b=b|0;return}function cd(a,b){a=a|0;b=b|0;return}function dd(a,b){a=a|0;b=b|0;return}function ed(a){a=a|0;return}function fd(a,b,c){a=a|0;b=b|0;c=c|0;var d=0;d=i;nd(a,b,c);i=d;return}function gd(a,b,c){a=a|0;b=b|0;c=c|0;var d=0;d=i;nd(a,b,c);i=d;return}function hd(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=+d;e=+e;f=+f;g=+g;var h=0;h=i;nd(a,b,c);i=h;return}function id(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=+d;e=+e;f=+f;g=+g;var h=0;h=i;nd(a,b,c);i=h;return}function jd(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=+d;e=+e;f=+f;g=+g;var h=0;h=i;nd(a,b,c);i=h;return}function kd(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=+d;e=+e;return}function ld(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=+d;e=+e;return}function md(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;return}function nd(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;k=i;i=i+80|0;h=k+64|0;g=k+48|0;l=k+32|0;m=k+16|0;j=k;p=qn(d|0)|0;if(p>>>0>4294967279){Be(0)}if(p>>>0<11){f=p<<1&255;a[j]=f;o=j;n=j+1|0}else{f=p+16&-16;n=Wm(f)|0;c[j+8>>2]=n;f=f|1;c[j>>2]=f;c[j+4>>2]=p;o=j;f=f&255}sn(n|0,d|0,p|0)|0;a[n+p|0]=0;if((f&1)==0){c[m+0>>2]=c[o+0>>2];c[m+4>>2]=c[o+4>>2];c[m+8>>2]=c[o+8>>2];n=m;o=a[m]|0}else{q=c[j+8>>2]|0;p=c[j+4>>2]|0;if(p>>>0>4294967279){Be(0)}if(p>>>0<11){o=p<<1&255;a[m]=o;n=m;d=m+1|0}else{o=p+16&-16;d=Wm(o)|0;c[m+8>>2]=d;o=o|1;c[m>>2]=o;c[m+4>>2]=p;n=m;o=o&255}sn(d|0,q|0,p|0)|0;a[d+p|0]=0}c[m+12>>2]=e;if((o&1)==0){c[l+0>>2]=c[n+0>>2];c[l+4>>2]=c[n+4>>2];c[l+8>>2]=c[n+8>>2];o=l;d=a[l]|0}else{r=c[m+8>>2]|0;q=c[m+4>>2]|0;if(q>>>0>4294967279){Be(0)}if(q>>>0<11){d=q<<1&255;a[l]=d;o=l;p=l+1|0}else{d=q+16&-16;p=Wm(d)|0;c[l+8>>2]=p;d=d|1;c[l>>2]=d;c[l+4>>2]=q;o=l;d=d&255}sn(p|0,r|0,q|0)|0;a[p+q|0]=0}c[l+12>>2]=e;b=b+4|0;if((d&1)==0){c[g+0>>2]=c[o+0>>2];c[g+4>>2]=c[o+4>>2];c[g+8>>2]=c[o+8>>2]}else{p=c[l+8>>2]|0;q=c[l+4>>2]|0;if(q>>>0>4294967279){Be(0)}if(q>>>0<11){a[g]=q<<1;d=g+1|0}else{r=q+16&-16;d=Wm(r)|0;c[g+8>>2]=d;c[g>>2]=r|1;c[g+4>>2]=q}sn(d|0,p|0,q|0)|0;a[d+q|0]=0}c[g+12>>2]=e;od(h,b,g);if(!((a[g]&1)==0)){Ym(c[g+8>>2]|0)}if(!((a[o]&1)==0)){Ym(c[l+8>>2]|0)}if(!((a[n]&1)==0)){Ym(c[m+8>>2]|0)}if((f&1)==0){i=k;return}Ym(c[j+8>>2]|0);i=k;return}function od(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;f=i;i=i+16|0;j=f;g=pd(d,j,e)|0;h=c[g>>2]|0;if((h|0)!=0){l=0;m=h;c[b>>2]=m;m=b+4|0;a[m]=l;i=f;return}h=Wm(32)|0;m=h+16|0;if((a[e]&1)==0){c[m+0>>2]=c[e+0>>2];c[m+4>>2]=c[e+4>>2];c[m+8>>2]=c[e+8>>2]}else{k=c[e+8>>2]|0;l=c[e+4>>2]|0;if(l>>>0>4294967279){Be(0)}if(l>>>0<11){a[m]=l<<1;m=h+17|0}else{o=l+16&-16;n=Wm(o)|0;c[h+24>>2]=n;c[m>>2]=o|1;c[h+20>>2]=l;m=n}sn(m|0,k|0,l|0)|0;a[m+l|0]=0}c[h+28>>2]=c[e+12>>2];j=c[j>>2]|0;c[h>>2]=0;c[h+4>>2]=0;c[h+8>>2]=j;c[g>>2]=h;j=c[c[d>>2]>>2]|0;if((j|0)==0){g=h}else{c[d>>2]=j;g=c[g>>2]|0}qd(c[d+4>>2]|0,g);n=d+8|0;c[n>>2]=(c[n>>2]|0)+1;n=1;o=h;c[b>>2]=o;o=b+4|0;a[o]=n;i=f;return}function pd(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;f=i;g=c[b+4>>2]|0;if((g|0)==0){o=b+4|0;c[d>>2]=o;i=f;return o|0}o=a[e]|0;h=(o&255)>>>1;j=e+1|0;b=e+8|0;e=e+4|0;a:do{if((o&1)==0){while(1){b=g+16|0;e=a[b]|0;k=(e&1)==0;if(k){m=(e&255)>>>1;n=b+1|0}else{m=c[g+20>>2]|0;n=c[g+24>>2]|0}l=m>>>0<h>>>0;n=mn(j,n,l?m:h)|0;if((n|0)==0){n=h>>>0<m>>>0?-1:l&1}if((n|0)<0){b=c[g>>2]|0;if((b|0)==0){e=g;b=24;break}else{g=b;continue}}if(k){e=(e&255)>>>1;k=b+1|0}else{e=c[g+20>>2]|0;k=c[g+24>>2]|0}b=h>>>0<e>>>0;k=mn(k,j,b?h:e)|0;if((k|0)==0){k=e>>>0<h>>>0?-1:b&1}if((k|0)>=0){b=33;break a}e=g+4|0;b=c[e>>2]|0;if((b|0)==0){b=32;break}else{g=b}}}else{while(1){h=g+16|0;m=c[e>>2]|0;k=a[h]|0;j=(k&1)==0;if(j){l=(k&255)>>>1;o=h+1|0}else{l=c[g+20>>2]|0;o=c[g+24>>2]|0}n=l>>>0<m>>>0;o=mn(c[b>>2]|0,o,n?l:m)|0;if((o|0)==0){o=m>>>0<l>>>0?-1:n&1}if((o|0)<0){h=c[g>>2]|0;if((h|0)==0){e=g;b=24;break}else{g=h;continue}}if(j){j=(k&255)>>>1;l=h+1|0}else{j=c[g+20>>2]|0;l=c[g+24>>2]|0}k=c[e>>2]|0;h=k>>>0<j>>>0;l=mn(l,c[b>>2]|0,h?k:j)|0;if((l|0)==0){l=j>>>0<k>>>0?-1:h&1}if((l|0)>=0){b=33;break a}h=g+4|0;j=c[h>>2]|0;if((j|0)==0){e=h;b=32;break}else{g=j}}}}while(0);if((b|0)==24){c[d>>2]=g;o=e;i=f;return o|0}else if((b|0)==32){c[d>>2]=g;o=e;i=f;return o|0}else if((b|0)==33){c[d>>2]=g;o=d;i=f;return o|0}return 0}function qd(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0;e=i;l=(d|0)==(b|0);a[d+12|0]=l&1;if(l){i=e;return}while(1){j=d+8|0;f=c[j>>2]|0;k=f+12|0;if((a[k]|0)!=0){b=37;break}g=f+8|0;h=c[g>>2]|0;l=c[h>>2]|0;if((l|0)==(f|0)){j=c[h+4>>2]|0;if((j|0)==0){b=7;break}j=j+12|0;if((a[j]|0)!=0){b=7;break}a[k]=1;a[h+12|0]=(h|0)==(b|0)|0;a[j]=1}else{if((l|0)==0){b=24;break}l=l+12|0;if((a[l]|0)!=0){b=24;break}a[k]=1;a[h+12|0]=(h|0)==(b|0)|0;a[l]=1}if((h|0)==(b|0)){b=37;break}else{d=h}}if((b|0)==7){if((c[f>>2]|0)==(d|0)){d=f}else{l=f+4|0;d=c[l>>2]|0;j=c[d>>2]|0;c[l>>2]=j;if((j|0)!=0){c[j+8>>2]=f;h=c[g>>2]|0}j=d+8|0;c[j>>2]=h;h=c[g>>2]|0;if((c[h>>2]|0)==(f|0)){c[h>>2]=d}else{c[h+4>>2]=d}c[d>>2]=f;c[g>>2]=d;f=c[j>>2]|0;h=f;f=c[f>>2]|0}a[d+12|0]=1;a[h+12|0]=0;g=f+4|0;d=c[g>>2]|0;c[h>>2]=d;if((d|0)!=0){c[d+8>>2]=h}d=h+8|0;c[f+8>>2]=c[d>>2];j=c[d>>2]|0;if((c[j>>2]|0)==(h|0)){c[j>>2]=f}else{c[j+4>>2]=f}c[g>>2]=h;c[d>>2]=f;i=e;return}else if((b|0)==24){if((c[f>>2]|0)==(d|0)){b=d+4|0;k=c[b>>2]|0;c[f>>2]=k;if((k|0)!=0){c[k+8>>2]=f;h=c[g>>2]|0}c[j>>2]=h;h=c[g>>2]|0;if((c[h>>2]|0)==(f|0)){c[h>>2]=d}else{c[h+4>>2]=d}c[b>>2]=f;c[g>>2]=d;f=d;h=c[j>>2]|0}a[f+12|0]=1;a[h+12|0]=0;l=h+4|0;f=c[l>>2]|0;g=c[f>>2]|0;c[l>>2]=g;if((g|0)!=0){c[g+8>>2]=h}g=h+8|0;c[f+8>>2]=c[g>>2];d=c[g>>2]|0;if((c[d>>2]|0)==(h|0)){c[d>>2]=f}else{c[d+4>>2]=f}c[f>>2]=h;c[g>>2]=f;i=e;return}else if((b|0)==37){i=e;return}}function rd(b,d){b=b|0;d=d|0;var e=0;e=i;if((d|0)==0){i=e;return}rd(b,c[d>>2]|0);rd(b,c[d+4>>2]|0);if(!((a[d+16|0]&1)==0)){Ym(c[d+24>>2]|0)}Ym(d);i=e;return}function sd(a){a=a|0;return}function td(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function ud(a){a=a|0;return 0}function vd(a){a=a|0;return 2}function wd(a,b){a=a|0;b=b|0;var d=0,e=0;d=i;qc[c[(c[b>>2]|0)+16>>2]&63](b,224);Dc[c[(c[b>>2]|0)+52>>2]&15](b,0,240,248);qc[c[(c[b>>2]|0)+16>>2]&63](b,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,0,256,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,0,264,272);qc[c[(c[b>>2]|0)+16>>2]&63](b,320);e=a+84|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,240,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,352);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,392);mc[c[(c[b>>2]|0)+36>>2]&3](b,400,e,-20.0,-120.0,10.0,.10000000149011612);e=a+104|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,416,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,424);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,488);mc[c[(c[b>>2]|0)+36>>2]&3](b,496,e,49.0,1.0,88.0,.009999999776482582);e=a+100|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,512,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,520);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,576);mc[c[(c[b>>2]|0)+36>>2]&3](b,584,e,.10000000149011612,0.0,1.0,.0010000000474974513);pc[c[(c[b>>2]|0)+20>>2]&255](b);pc[c[(c[b>>2]|0)+20>>2]&255](b);Dc[c[(c[b>>2]|0)+52>>2]&15](b,0,416,248);qc[c[(c[b>>2]|0)+16>>2]&63](b,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,0,264,600);qc[c[(c[b>>2]|0)+16>>2]&63](b,688);e=a+80|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,256,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,720);uc[c[(c[b>>2]|0)+28>>2]&7](b,776,e);e=a+132|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,240,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,784);mc[c[(c[b>>2]|0)+36>>2]&3](b,808,e,0.0,0.0,1.0,.009999999776482582);e=a+144|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,416,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,816);mc[c[(c[b>>2]|0)+36>>2]&3](b,848,e,0.0,0.0,1.0,.009999999776482582);pc[c[(c[b>>2]|0)+20>>2]&255](b);pc[c[(c[b>>2]|0)+20>>2]&255](b);Dc[c[(c[b>>2]|0)+52>>2]&15](b,0,512,248);qc[c[(c[b>>2]|0)+16>>2]&63](b,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,0,256,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,0,264,856);qc[c[(c[b>>2]|0)+12>>2]&63](b,912);e=a+3436|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,256,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1e3);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,392);oc[c[(c[b>>2]|0)+48>>2]&3](b,248,e,-50.0,10.0);e=a+3324|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,240,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1e3);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,392);oc[c[(c[b>>2]|0)+48>>2]&3](b,248,e,-50.0,10.0);e=a+3088|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,416,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1e3);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,392);oc[c[(c[b>>2]|0)+48>>2]&3](b,248,e,-50.0,10.0);e=a+2852|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,512,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1e3);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,392);oc[c[(c[b>>2]|0)+48>>2]&3](b,248,e,-50.0,10.0);e=a+2616|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,1032,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1e3);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,392);oc[c[(c[b>>2]|0)+48>>2]&3](b,248,e,-50.0,10.0);e=a+2380|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,1040,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1e3);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,392);oc[c[(c[b>>2]|0)+48>>2]&3](b,248,e,-50.0,10.0);e=a+2144|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,1048,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1e3);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,392);oc[c[(c[b>>2]|0)+48>>2]&3](b,248,e,-50.0,10.0);e=a+1908|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,1056,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1e3);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,392);oc[c[(c[b>>2]|0)+48>>2]&3](b,248,e,-50.0,10.0);e=a+1672|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,1064,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1e3);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,392);oc[c[(c[b>>2]|0)+48>>2]&3](b,248,e,-50.0,10.0);e=a+1436|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,1072,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1e3);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,392);oc[c[(c[b>>2]|0)+48>>2]&3](b,248,e,-50.0,10.0);e=a+1200|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,1080,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1e3);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,392);oc[c[(c[b>>2]|0)+48>>2]&3](b,248,e,-50.0,10.0);e=a+964|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,1088,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1e3);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,392);oc[c[(c[b>>2]|0)+48>>2]&3](b,248,e,-50.0,10.0);e=a+728|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,1096,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1e3);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,392);oc[c[(c[b>>2]|0)+48>>2]&3](b,248,e,-50.0,10.0);e=a+492|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,1104,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1e3);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,392);oc[c[(c[b>>2]|0)+48>>2]&3](b,248,e,-50.0,10.0);e=a+256|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,1112,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1e3);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,392);oc[c[(c[b>>2]|0)+48>>2]&3](b,248,e,-50.0,10.0);pc[c[(c[b>>2]|0)+20>>2]&255](b);Dc[c[(c[b>>2]|0)+52>>2]&15](b,0,240,248);qc[c[(c[b>>2]|0)+12>>2]&63](b,1120);e=a+28|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,256,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,264,1152);Dc[c[(c[b>>2]|0)+52>>2]&15](b,e,384,576);mc[c[(c[b>>2]|0)+36>>2]&3](b,1192,e,.10000000149011612,0.0,1.0,.009999999776482582);a=a+8|0;Dc[c[(c[b>>2]|0)+52>>2]&15](b,a,240,248);Dc[c[(c[b>>2]|0)+52>>2]&15](b,a,264,1216);Dc[c[(c[b>>2]|0)+52>>2]&15](b,a,384,392);mc[c[(c[b>>2]|0)+36>>2]&3](b,1248,a,50.0,0.0,100.0,1.0);pc[c[(c[b>>2]|0)+20>>2]&255](b);pc[c[(c[b>>2]|0)+20>>2]&255](b);pc[c[(c[b>>2]|0)+20>>2]&255](b);i=d;return}function xd(a,b){a=a|0;b=b|0;var d=0;d=i;qc[c[(c[a>>2]|0)+28>>2]&63](a,b);i=d;return}function yd(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0.0,h=0.0,j=0,k=0.0,l=0.0,m=0.0,n=0.0,o=0.0,p=0.0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,U=0,Y=0,Z=0,_=0,$=0,aa=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0,la=0,ma=0,na=0,oa=0,pa=0,qa=0,ra=0,sa=0,ta=0,ua=0,va=0,wa=0,xa=0,ya=0,za=0,Aa=0,Ba=0,Ca=0,Da=0,Ea=0,Fa=0,Ga=0,Ha=0,Ia=0,Ja=0,Ka=0,La=0,Ma=0,Na=0,Oa=0,Qa=0,Ra=0,Sa=0,Ta=0,Ua=0,Va=0,Wa=0,Xa=0,Ya=0,Za=0,_a=0,$a=0,ab=0,bb=0,cb=0,db=0,eb=0,fb=0,gb=0,hb=0,ib=0,jb=0,kb=0,lb=0,mb=0,nb=0,ob=0,pb=0,qb=0,rb=0,sb=0,tb=0,ub=0,vb=0,wb=0,xb=0,yb=0,zb=0,Ab=0,Bb=0,Cb=0,Db=0,Eb=0,Fb=0,Gb=0,Hb=0,Ib=0,Jb=0,Kb=0,Lb=0,Mb=0,Nb=0,Ob=0,Pb=0,Qb=0,Rb=0,Sb=0,Tb=0,Ub=0,Wb=0,Xb=0,Yb=0,Zb=0,_b=0,$b=0,ac=0,bc=0,cc=0,dc=0,ec=0,fc=0,gc=0,hc=0,ic=0,jc=0,kc=0,lc=0,mc=0,nc=0,oc=0,pc=0,qc=0,rc=0,sc=0,tc=0,uc=0,vc=0,wc=0,xc=0,yc=0,zc=0,Ac=0,Bc=0,Cc=0,Dc=0,Ec=0,Fc=0,Gc=0,Hc=0,Ic=0,Jc=0,Kc=0,Lc=0,Mc=0,Nc=0,Oc=0,Pc=0,Qc=0,Rc=0,Sc=0,Tc=0,Uc=0,Vc=0,Wc=0,Xc=0,Yc=0,Zc=0,_c=0,$c=0,ad=0,bd=0,cd=0,dd=0,ed=0,fd=0,gd=0,hd=0,id=0,jd=0,kd=0,ld=0,md=0,nd=0,od=0,pd=0,qd=0,rd=0,sd=0,td=0,ud=0,vd=0,wd=0,xd=0,yd=0,zd=0,Ad=0,Bd=0,Cd=0,Dd=0,Ed=0,Fd=0,Gd=0,Hd=0,Id=0,Jd=0,Kd=0,Ld=0,Md=0,Nd=0,Od=0,Pd=0,Qd=0,Rd=0,Sd=0,Td=0,Ud=0,Vd=0,Wd=0,Xd=0,Yd=0,Zd=0,_d=0,$d=0,ae=0,be=0,ce=0,de=0,ee=0,fe=0,ge=0,he=0,ie=0,je=0,ke=0,le=0,me=0,ne=0,oe=0,pe=0,qe=0,re=0,se=0,te=0,ue=0,ve=0,we=0,xe=0,ye=0,ze=0,Ae=0,Be=0,Ce=0,De=0,Ee=0,Fe=0,Ge=0,He=0,Ie=0,Je=0,Ke=0,Le=0,Me=0,Ne=0,Oe=0,Pe=0,Qe=0,Re=0,Se=0,Te=0,Ue=0,Ve=0,We=0,Xe=0,Ye=0,Ze=0,_e=0,$e=0,af=0,bf=0,cf=0,df=0,ef=0,ff=0,gf=0,hf=0,jf=0,kf=0,lf=0,mf=0,nf=0,of=0,pf=0,qf=0,rf=0,sf=0,tf=0,uf=0,vf=0,wf=0,xf=0,yf=0,zf=0,Af=0,Bf=0,Cf=0,Df=0,Ef=0,Ff=0,Gf=0,Hf=0,If=0,Jf=0,Kf=0,Lf=0,Mf=0,Nf=0,Of=0,Pf=0,Qf=0,Rf=0,Sf=0,Tf=0,Uf=0,Vf=0,Wf=0,Xf=0,Yf=0,Zf=0,_f=0,$f=0,ag=0,bg=0,cg=0,dg=0,eg=0,fg=0,gg=0,hg=0,ig=0,jg=0,kg=0,lg=0,mg=0,ng=0,og=0,pg=0,qg=0,rg=0,sg=0,tg=0,ug=0,vg=0,wg=0,xg=0,yg=0,zg=0,Ag=0,Bg=0,Cg=0,Dg=0,Eg=0,Fg=0,Gg=0,Hg=0,Ig=0,Jg=0,Kg=0,Lg=0,Mg=0,Ng=0,Og=0,Pg=0,Qg=0,Rg=0,Sg=0,Tg=0,Ug=0,Vg=0,Wg=0,Xg=0,Yg=0,Zg=0,_g=0,$g=0,ah=0,bh=0,ch=0,dh=0,eh=0,fh=0,gh=0,hh=0,ih=0,jh=0,kh=0,lh=0,mh=0,nh=0,oh=0,ph=0,qh=0,rh=0,sh=0,th=0,uh=0,vh=0,wh=0,xh=0,yh=0,zh=0,Ah=0,Bh=0,Ch=0,Dh=0,Eh=0,Fh=0,Gh=0,Hh=0,Ih=0,Jh=0,Kh=0,Lh=0,Mh=0,Nh=0,Oh=0,Ph=0,Qh=0,Rh=0,Sh=0,Th=0,Uh=0,Vh=0,Wh=0,Xh=0,Yh=0,Zh=0,_h=0,$h=0,ai=0,bi=0,ci=0,di=0,ei=0,fi=0,gi=0,hi=0,ii=0,ji=0,ki=0,li=0,mi=0,ni=0,oi=0,pi=0,qi=0,ri=0,si=0,ti=0,ui=0,vi=0,wi=0,xi=0,yi=0,zi=0,Ai=0,Bi=0,Ci=0,Di=0,Ei=0,Fi=0,Gi=0,Hi=0,Ii=0,Ji=0,Ki=0,Li=0,Mi=0,Ni=0,Oi=0,Pi=0,Qi=0,Ri=0,Si=0,Ti=0,Ui=0,Vi=0,Wi=0,Xi=0,Yi=0,Zi=0,_i=0,$i=0,aj=0,bj=0,cj=0,dj=0,ej=0,fj=0,gj=0,hj=0,ij=0,jj=0,kj=0,lj=0,mj=0,nj=0,oj=0,pj=0,qj=0,rj=0,sj=0,tj=0,uj=0,vj=0,wj=0,xj=0,yj=0,zj=0,Aj=0,Bj=0,Cj=0,Dj=0,Ej=0,Fj=0,Gj=0,Hj=0,Ij=0,Jj=0,Kj=0,Lj=0,Mj=0,Nj=0,Oj=0,Pj=0,Qj=0,Rj=0,Sj=0,Tj=0,Uj=0,Vj=0,Wj=0,Xj=0,Yj=0,Zj=0,_j=0,$j=0,ak=0,bk=0,ck=0,dk=0,ek=0,fk=0,gk=0,hk=0,ik=0,jk=0,kk=0,lk=0,mk=0,nk=0,ok=0,pk=0,qk=0,rk=0,sk=0,tk=0,uk=0,vk=0,wk=0,xk=0,yk=0,zk=0,Ak=0,Bk=0,Ck=0,Dk=0,Ek=0,Fk=0,Gk=0,Hk=0,Ik=0,Jk=0,Kk=0,Lk=0,Mk=0,Nk=0,Ok=0,Pk=0,Qk=0,Rk=0,Sk=0,Tk=0,Uk=0,Vk=0,Wk=0,Xk=0,Yk=0,Zk=0,_k=0,$k=0,al=0,bl=0,cl=0,dl=0,el=0,fl=0,gl=0,hl=0,il=0,jl=0,kl=0,ll=0,ml=0,nl=0,ol=0,pl=0,ql=0,rl=0,sl=0,tl=0,ul=0,vl=0,wl=0,xl=0,yl=0,zl=0,Al=0,Bl=0,Cl=0,Dl=0,El=0,Fl=0,Gl=0,Hl=0,Il=0,Jl=0,Kl=0,Ll=0,Ml=0,Nl=0,Ol=0,Pl=0,Ql=0,Rl=0,Sl=0,Tl=0,Ul=0,Vl=0,Wl=0,Xl=0,Yl=0,Zl=0,_l=0,$l=0,am=0,bm=0,cm=0,dm=0,em=0,fm=0,gm=0,hm=0,im=0,jm=0,km=0,lm=0,mm=0,nm=0,om=0,pm=0,qm=0,rm=0,sm=0,tm=0,um=0,vm=0,wm=0,xm=0,ym=0,zm=0,Am=0,Bm=0,Cm=0,Dm=0,Em=0,Fm=0,Gm=0,Hm=0,Im=0,Jm=0,Km=0,Lm=0,Mm=0,Nm=0,Om=0,Pm=0,Qm=0,Rm=0,Sm=0,Tm=0,Um=0,Vm=0,Wm=0,Xm=0,Ym=0,Zm=0,_m=0,$m=0,an=0,bn=0,cn=0,dn=0,en=0.0,fn=0.0,gn=0.0,hn=0.0,jn=0.0,kn=0.0,ln=0.0,mn=0.0,nn=0.0,on=0.0,pn=0.0,qn=0.0,rn=0.0,sn=0,tn=0.0,un=0.0,vn=0.0,wn=0.0;d=i;h=+g[a+8>>2];m=+g[a+24>>2];k=+ba(+(0.0-m/+g[a+28>>2]));f=1.0-k;p=+V(10.0,+(+g[a+84>>2]*.05000000074505806))*.0010000000474974513;m=+ba(+(0.0-m/+g[a+100>>2]));l=(1.0-m)*+Pa(+((+g[a+104>>2]+-49.0)*.0833333358168602))*440.0;n=+g[a+132>>2]*.0010000000474974513;o=+g[a+144>>2]*.0010000000474974513;j=c[e>>2]|0;Ig=c[e+4>>2]|0;if((b|0)<=0){i=d;return}s=a+12|0;dn=a+92|0;cn=a+88|0;bn=a+112|0;an=a+108|0;q=a+96|0;Zm=a+128|0;$m=a+120|0;_m=a+116|0;r=a+16|0;Ym=a+124|0;Xm=a+140|0;Wm=a+136|0;Vm=a+152|0;Um=a+148|0;t=a+156|0;Sm=a+168|0;Tm=a+160|0;u=a+164|0;v=a+68|0;w=a+176|0;Qm=a+188|0;x=a+180|0;Rm=a+192|0;y=a+184|0;z=a+76|0;B=a+196|0;A=a+56|0;C=a+200|0;Om=a+212|0;D=a+204|0;Pm=a+216|0;E=a+208|0;F=a+64|0;I=a+220|0;G=a+40|0;J=a+224|0;P=a+236|0;K=a+228|0;H=a+240|0;L=a+232|0;N=a+252|0;M=a+52|0;O=a+244|0;Q=a+248|0;R=a+256|0;S=a+324|0;Z=a+336|0;U=a+348|0;_=a+340|0;Y=a+352|0;$=a+344|0;aa=a+332|0;fa=a+356|0;ca=a+316|0;ga=a+360|0;da=a+376|0;ha=a+364|0;ea=a+372|0;ia=a+368|0;ja=a+320|0;na=a+380|0;ka=a+308|0;oa=a+384|0;la=a+396|0;pa=a+388|0;ma=a+400|0;qa=a+392|0;ra=a+312|0;sa=a+404|0;ta=a+296|0;wa=a+412|0;ua=a+424|0;xa=a+416|0;va=a+428|0;ya=a+420|0;za=a+304|0;Da=a+432|0;Aa=a+284|0;Ea=a+436|0;Ba=a+448|0;Fa=a+440|0;Ca=a+452|0;Ga=a+444|0;Ha=a+292|0;La=a+456|0;Ia=a+268|0;Ma=a+460|0;Ja=a+472|0;Na=a+464|0;Ka=a+476|0;Oa=a+468|0;Ra=a+488|0;Qa=a+280|0;Sa=a+480|0;Ta=a+484|0;Ua=a+492|0;Va=a+560|0;Ya=a+572|0;Wa=a+584|0;Za=a+576|0;Xa=a+588|0;_a=a+580|0;$a=a+568|0;db=a+592|0;ab=a+552|0;eb=a+596|0;bb=a+608|0;fb=a+600|0;cb=a+612|0;gb=a+604|0;hb=a+556|0;lb=a+616|0;ib=a+544|0;mb=a+620|0;jb=a+632|0;nb=a+624|0;kb=a+636|0;ob=a+628|0;pb=a+548|0;qb=a+640|0;rb=a+532|0;ub=a+648|0;sb=a+660|0;vb=a+652|0;tb=a+664|0;wb=a+656|0;xb=a+540|0;Bb=a+668|0;yb=a+520|0;Cb=a+672|0;zb=a+684|0;Db=a+676|0;Ab=a+688|0;Eb=a+680|0;Fb=a+528|0;Jb=a+692|0;Gb=a+504|0;Kb=a+696|0;Hb=a+708|0;Lb=a+700|0;Ib=a+712|0;Mb=a+704|0;Ob=a+724|0;Nb=a+516|0;Pb=a+716|0;Qb=a+720|0;Rb=a+728|0;Sb=a+796|0;Wb=a+808|0;Tb=a+820|0;Xb=a+812|0;Ub=a+824|0;Yb=a+816|0;Zb=a+804|0;bc=a+828|0;_b=a+788|0;cc=a+832|0;$b=a+844|0;dc=a+836|0;ac=a+848|0;ec=a+840|0;fc=a+792|0;jc=a+852|0;gc=a+780|0;kc=a+856|0;hc=a+868|0;lc=a+860|0;ic=a+872|0;mc=a+864|0;nc=a+784|0;oc=a+876|0;pc=a+768|0;sc=a+884|0;qc=a+896|0;tc=a+888|0;rc=a+900|0;uc=a+892|0;vc=a+776|0;zc=a+904|0;wc=a+756|0;Ac=a+908|0;xc=a+920|0;Bc=a+912|0;yc=a+924|0;Cc=a+916|0;Dc=a+764|0;Hc=a+928|0;Ec=a+740|0;Ic=a+932|0;Fc=a+944|0;Jc=a+936|0;Gc=a+948|0;Kc=a+940|0;Mc=a+960|0;Lc=a+752|0;Nc=a+952|0;Oc=a+956|0;Pc=a+964|0;Qc=a+1032|0;Tc=a+1044|0;Rc=a+1056|0;Uc=a+1048|0;Sc=a+1060|0;Vc=a+1052|0;Wc=a+1040|0;_c=a+1064|0;Xc=a+1024|0;$c=a+1068|0;Yc=a+1080|0;ad=a+1072|0;Zc=a+1084|0;bd=a+1076|0;cd=a+1028|0;gd=a+1088|0;dd=a+1016|0;hd=a+1092|0;ed=a+1104|0;id=a+1096|0;fd=a+1108|0;jd=a+1100|0;kd=a+1020|0;ld=a+1112|0;md=a+1004|0;pd=a+1120|0;nd=a+1132|0;qd=a+1124|0;od=a+1136|0;rd=a+1128|0;sd=a+1012|0;wd=a+1140|0;td=a+992|0;xd=a+1144|0;ud=a+1156|0;yd=a+1148|0;vd=a+1160|0;zd=a+1152|0;Ad=a+1e3|0;Ed=a+1164|0;Bd=a+976|0;Fd=a+1168|0;Cd=a+1180|0;Gd=a+1172|0;Dd=a+1184|0;Hd=a+1176|0;Jd=a+1196|0;Id=a+988|0;Kd=a+1188|0;Ld=a+1192|0;Md=a+1200|0;Nd=a+1268|0;Qd=a+1280|0;Od=a+1292|0;Rd=a+1284|0;Pd=a+1296|0;Sd=a+1288|0;Td=a+1276|0;Xd=a+1300|0;Ud=a+1260|0;Yd=a+1304|0;Vd=a+1316|0;Zd=a+1308|0;Wd=a+1320|0;_d=a+1312|0;$d=a+1264|0;de=a+1324|0;ae=a+1252|0;ee=a+1328|0;be=a+1340|0;fe=a+1332|0;ce=a+1344|0;ge=a+1336|0;he=a+1256|0;ie=a+1348|0;je=a+1240|0;me=a+1356|0;ke=a+1368|0;ne=a+1360|0;le=a+1372|0;oe=a+1364|0;pe=a+1248|0;te=a+1376|0;qe=a+1228|0;ue=a+1380|0;re=a+1392|0;ve=a+1384|0;se=a+1396|0;we=a+1388|0;xe=a+1236|0;Be=a+1400|0;ye=a+1212|0;Ce=a+1404|0;ze=a+1416|0;De=a+1408|0;Ae=a+1420|0;Ee=a+1412|0;Ge=a+1432|0;Fe=a+1224|0;He=a+1424|0;Ie=a+1428|0;Je=a+1436|0;Ke=a+1504|0;Ne=a+1516|0;Le=a+1528|0;Oe=a+1520|0;Me=a+1532|0;Pe=a+1524|0;Qe=a+1512|0;Ue=a+1536|0;Re=a+1496|0;Ve=a+1540|0;Se=a+1552|0;We=a+1544|0;Te=a+1556|0;Xe=a+1548|0;Ye=a+1500|0;af=a+1560|0;Ze=a+1488|0;bf=a+1564|0;_e=a+1576|0;cf=a+1568|0;$e=a+1580|0;df=a+1572|0;ef=a+1492|0;ff=a+1584|0;gf=a+1476|0;kf=a+1592|0;hf=a+1604|0;lf=a+1596|0;jf=a+1608|0;mf=a+1600|0;nf=a+1484|0;rf=a+1612|0;of=a+1464|0;sf=a+1616|0;pf=a+1628|0;tf=a+1620|0;qf=a+1632|0;uf=a+1624|0;vf=a+1472|0;zf=a+1636|0;wf=a+1448|0;Af=a+1640|0;xf=a+1652|0;Bf=a+1644|0;yf=a+1656|0;Cf=a+1648|0;Ef=a+1668|0;Df=a+1460|0;Ff=a+1660|0;Gf=a+1664|0;Hf=a+1672|0;If=a+1740|0;Lf=a+1752|0;Jf=a+1764|0;Mf=a+1756|0;Kf=a+1768|0;Nf=a+1760|0;Of=a+1748|0;Sf=a+1772|0;Pf=a+1732|0;Tf=a+1776|0;Qf=a+1788|0;Uf=a+1780|0;Rf=a+1792|0;Vf=a+1784|0;Wf=a+1736|0;_f=a+1796|0;Xf=a+1724|0;$f=a+1800|0;Yf=a+1812|0;ag=a+1804|0;Zf=a+1816|0;bg=a+1808|0;cg=a+1728|0;dg=a+1820|0;eg=a+1712|0;hg=a+1828|0;fg=a+1840|0;ig=a+1832|0;gg=a+1844|0;jg=a+1836|0;kg=a+1720|0;og=a+1848|0;lg=a+1700|0;pg=a+1852|0;mg=a+1864|0;qg=a+1856|0;ng=a+1868|0;rg=a+1860|0;sg=a+1708|0;wg=a+1872|0;tg=a+1684|0;xg=a+1876|0;ug=a+1888|0;yg=a+1880|0;vg=a+1892|0;zg=a+1884|0;Bg=a+1904|0;Ag=a+1696|0;Cg=a+1896|0;Dg=a+1900|0;Eg=a+1908|0;Fg=a+1976|0;e=a+1988|0;Gg=a+2e3|0;Jg=a+1992|0;Hg=a+2004|0;Kg=a+1996|0;Lg=a+1984|0;Pg=a+2008|0;Mg=a+1968|0;Qg=a+2012|0;Ng=a+2024|0;Rg=a+2016|0;Og=a+2028|0;Sg=a+2020|0;Tg=a+1972|0;Xg=a+2032|0;Ug=a+1960|0;Yg=a+2036|0;Vg=a+2048|0;Zg=a+2040|0;Wg=a+2052|0;_g=a+2044|0;$g=a+1964|0;ah=a+2056|0;bh=a+1948|0;eh=a+2064|0;ch=a+2076|0;fh=a+2068|0;dh=a+2080|0;gh=a+2072|0;hh=a+1956|0;lh=a+2084|0;ih=a+1936|0;mh=a+2088|0;jh=a+2100|0;nh=a+2092|0;kh=a+2104|0;oh=a+2096|0;ph=a+1944|0;th=a+2108|0;qh=a+1920|0;uh=a+2112|0;rh=a+2124|0;vh=a+2116|0;sh=a+2128|0;wh=a+2120|0;yh=a+2140|0;xh=a+1932|0;zh=a+2132|0;Ah=a+2136|0;Bh=a+2144|0;Ch=a+2212|0;Fh=a+2224|0;Dh=a+2236|0;Gh=a+2228|0;Eh=a+2240|0;Hh=a+2232|0;Ih=a+2220|0;Mh=a+2244|0;Jh=a+2204|0;Nh=a+2248|0;Kh=a+2260|0;Oh=a+2252|0;Lh=a+2264|0;Ph=a+2256|0;Qh=a+2208|0;Uh=a+2268|0;Rh=a+2196|0;Vh=a+2272|0;Sh=a+2284|0;Wh=a+2276|0;Th=a+2288|0;Xh=a+2280|0;Yh=a+2200|0;Zh=a+2292|0;_h=a+2184|0;bi=a+2300|0;$h=a+2312|0;ci=a+2304|0;ai=a+2316|0;di=a+2308|0;ei=a+2192|0;ii=a+2320|0;fi=a+2172|0;ji=a+2324|0;gi=a+2336|0;ki=a+2328|0;hi=a+2340|0;li=a+2332|0;mi=a+2180|0;qi=a+2344|0;ni=a+2156|0;ri=a+2348|0;oi=a+2360|0;si=a+2352|0;pi=a+2364|0;ti=a+2356|0;vi=a+2376|0;ui=a+2168|0;wi=a+2368|0;xi=a+2372|0;yi=a+2380|0;zi=a+2448|0;Ci=a+2460|0;Ai=a+2472|0;Di=a+2464|0;Bi=a+2476|0;Ei=a+2468|0;Fi=a+2456|0;Ji=a+2480|0;Gi=a+2440|0;Ki=a+2484|0;Hi=a+2496|0;Li=a+2488|0;Ii=a+2500|0;Mi=a+2492|0;Ni=a+2444|0;Ri=a+2504|0;Oi=a+2432|0;Si=a+2508|0;Pi=a+2520|0;Ti=a+2512|0;Qi=a+2524|0;Ui=a+2516|0;Vi=a+2436|0;Wi=a+2528|0;Xi=a+2420|0;_i=a+2536|0;Yi=a+2548|0;$i=a+2540|0;Zi=a+2552|0;aj=a+2544|0;bj=a+2428|0;fj=a+2556|0;cj=a+2408|0;gj=a+2560|0;dj=a+2572|0;hj=a+2564|0;ej=a+2576|0;ij=a+2568|0;jj=a+2416|0;nj=a+2580|0;kj=a+2392|0;oj=a+2584|0;lj=a+2596|0;pj=a+2588|0;mj=a+2600|0;qj=a+2592|0;sj=a+2612|0;rj=a+2404|0;tj=a+2604|0;uj=a+2608|0;vj=a+2616|0;wj=a+2684|0;zj=a+2696|0;xj=a+2708|0;Aj=a+2700|0;yj=a+2712|0;Bj=a+2704|0;Cj=a+2692|0;Gj=a+2716|0;Dj=a+2676|0;Hj=a+2720|0;Ej=a+2732|0;Ij=a+2724|0;Fj=a+2736|0;Jj=a+2728|0;Kj=a+2680|0;Oj=a+2740|0;Lj=a+2668|0;Pj=a+2744|0;Mj=a+2756|0;Qj=a+2748|0;Nj=a+2760|0;Rj=a+2752|0;Sj=a+2672|0;Tj=a+2764|0;Uj=a+2656|0;Xj=a+2772|0;Vj=a+2784|0;Yj=a+2776|0;Wj=a+2788|0;Zj=a+2780|0;_j=a+2664|0;ck=a+2792|0;$j=a+2644|0;dk=a+2796|0;ak=a+2808|0;ek=a+2800|0;bk=a+2812|0;fk=a+2804|0;gk=a+2652|0;kk=a+2816|0;hk=a+2628|0;lk=a+2820|0;ik=a+2832|0;mk=a+2824|0;jk=a+2836|0;nk=a+2828|0;pk=a+2848|0;ok=a+2640|0;qk=a+2840|0;rk=a+2844|0;sk=a+2852|0;tk=a+2920|0;wk=a+2932|0;uk=a+2944|0;xk=a+2936|0;vk=a+2948|0;yk=a+2940|0;zk=a+2928|0;Dk=a+2952|0;Ak=a+2912|0;Ek=a+2956|0;Bk=a+2968|0;Fk=a+2960|0;Ck=a+2972|0;Gk=a+2964|0;Hk=a+2916|0;Lk=a+2976|0;Ik=a+2904|0;Mk=a+2980|0;Jk=a+2992|0;Nk=a+2984|0;Kk=a+2996|0;Ok=a+2988|0;Pk=a+2908|0;Qk=a+3e3|0;Rk=a+2892|0;Uk=a+3008|0;Sk=a+3020|0;Vk=a+3012|0;Tk=a+3024|0;Wk=a+3016|0;Xk=a+2900|0;$k=a+3028|0;Yk=a+2880|0;al=a+3032|0;Zk=a+3044|0;bl=a+3036|0;_k=a+3048|0;cl=a+3040|0;dl=a+2888|0;hl=a+3052|0;el=a+2864|0;il=a+3056|0;fl=a+3068|0;jl=a+3060|0;gl=a+3072|0;kl=a+3064|0;ml=a+3084|0;ll=a+2876|0;nl=a+3076|0;ol=a+3080|0;pl=a+3088|0;ql=a+3156|0;tl=a+3168|0;rl=a+3180|0;ul=a+3172|0;sl=a+3184|0;vl=a+3176|0;wl=a+3164|0;Al=a+3188|0;xl=a+3148|0;Bl=a+3192|0;yl=a+3204|0;Cl=a+3196|0;zl=a+3208|0;Dl=a+3200|0;El=a+3152|0;Il=a+3212|0;Fl=a+3140|0;Jl=a+3216|0;Gl=a+3228|0;Kl=a+3220|0;Hl=a+3232|0;Ll=a+3224|0;Ml=a+3144|0;Nl=a+3236|0;Ol=a+3128|0;Rl=a+3244|0;Pl=a+3256|0;Sl=a+3248|0;Ql=a+3260|0;Tl=a+3252|0;Ul=a+3136|0;Yl=a+3264|0;Vl=a+3116|0;Zl=a+3268|0;Wl=a+3280|0;_l=a+3272|0;Xl=a+3284|0;$l=a+3276|0;am=a+3124|0;em=a+3288|0;bm=a+3100|0;fm=a+3292|0;cm=a+3304|0;gm=a+3296|0;dm=a+3308|0;hm=a+3300|0;jm=a+3320|0;im=a+3112|0;km=a+3312|0;lm=a+3316|0;mm=a+3324|0;nm=a+3344|0;qm=a+3356|0;om=a+3368|0;rm=a+3360|0;pm=a+3372|0;sm=a+3364|0;tm=a+3352|0;xm=a+3376|0;um=a+3336|0;ym=a+3380|0;vm=a+3392|0;zm=a+3384|0;wm=a+3396|0;Am=a+3388|0;Bm=a+3340|0;Fm=a+3400|0;Cm=a+3328|0;Gm=a+3404|0;Dm=a+3416|0;Hm=a+3408|0;Em=a+3420|0;Im=a+3412|0;Km=a+3432|0;Jm=a+3332|0;Lm=a+3424|0;Mm=a+3428|0;Nm=a+3436|0;mn=+g[dn>>2];nn=+g[bn>>2];pn=+g[Zm>>2];qn=+g[$m>>2];sn=c[r>>2]|0;rn=+g[Xm>>2];on=+g[Vm>>2];ln=+g[Sm>>2];kn=+g[Tm>>2];jn=+g[Qm>>2];hn=+g[Rm>>2];gn=+g[Om>>2];fn=+g[Pm>>2];en=+g[P>>2];if((~~+g[a+80>>2]|0)==0){a=0;do{c[s>>2]=1;tn=p+mn*.9990000128746033;g[cn>>2]=tn;un=l+m*nn;g[an>>2]=un;un=+g[q>>2]*un;mn=+X(+un);un=+W(+un);nn=mn*pn+un*qn;g[_m>>2]=nn;g[Ym>>2]=un*pn+(0.0-mn)*qn+1.0- +(sn|0);rn=n+rn*.9990000128746033;g[Wm>>2]=rn;mn=o+on*.9990000128746033;g[Um>>2]=mn;mn=tn*nn*+V(10.0,+(rn*2.0))+mn;mn=mn<1.0?mn:1.0;on=mn>-1.0?mn:-1.0;on=on*(1.0-on*on*.3333333432674408);g[t>>2]=on;on=ln*.9950000047683716+on-kn;g[u>>2]=on;wn=+g[v>>2];vn=on-wn*(+g[w>>2]*jn+ +g[x>>2]*hn);g[y>>2]=vn;pn=+g[z>>2];rn=+g[A>>2];vn=wn*(pn*hn+(+g[B>>2]*jn+pn*vn))-rn*(+g[C>>2]*gn+ +g[D>>2]*fn);g[E>>2]=vn;pn=+g[F>>2];wn=+g[G>>2];mn=+g[H>>2];pn=rn*(pn*vn+ +g[I>>2]*gn+pn*fn)-wn*(+g[J>>2]*en+ +g[K>>2]*mn);g[L>>2]=pn;vn=+g[M>>2];pn=k*+g[N>>2]+f*+T(+(wn*(vn*mn+(vn*pn+ +g[O>>2]*+g[P>>2]))));g[Q>>2]=pn;g[R>>2]=h+ +Vb(+pn)*20.0;pn=+g[S>>2];vn=+g[U>>2];mn=+g[Y>>2];wn=on-pn*(+g[Z>>2]*vn+ +g[_>>2]*mn);g[$>>2]=wn;rn=+g[aa>>2];tn=+g[ca>>2];qn=+g[da>>2];un=+g[ea>>2];mn=pn*(rn*wn+ +g[fa>>2]*vn+rn*mn)-tn*(+g[ga>>2]*qn+ +g[ha>>2]*un);g[ia>>2]=mn;rn=+g[ja>>2];vn=+g[ka>>2];wn=+g[la>>2];pn=+g[ma>>2];qn=tn*(rn*mn+ +g[na>>2]*un+rn*qn)-vn*(+g[oa>>2]*wn+ +g[pa>>2]*pn);g[qa>>2]=qn;rn=+g[ra>>2];pn=vn*(rn*qn+ +g[sa>>2]*wn+rn*pn);rn=+g[ta>>2];wn=+g[ua>>2];qn=+g[va>>2];vn=pn-rn*(+g[wa>>2]*wn+ +g[xa>>2]*qn);g[ya>>2]=vn;un=+g[za>>2];mn=+g[Aa>>2];tn=+g[Ba>>2];nn=+g[Ca>>2];qn=rn*(un*vn+ +g[Da>>2]*wn+un*qn)-mn*(+g[Ea>>2]*tn+ +g[Fa>>2]*nn);g[Ga>>2]=qn;un=+g[Ha>>2];wn=+g[Ia>>2];vn=+g[Ja>>2];rn=+g[Ka>>2];tn=mn*(un*nn+(un*qn+ +g[La>>2]*tn))-wn*(+g[Ma>>2]*vn+ +g[Na>>2]*rn);g[Oa>>2]=tn;qn=+g[Qa>>2];vn=k*+g[Ra>>2]+f*+T(+(wn*(qn*rn+(qn*tn+ +g[Sa>>2]*vn))));g[Ta>>2]=vn;g[Ua>>2]=h+ +Vb(+vn)*20.0;vn=+g[Va>>2];tn=+g[Wa>>2];qn=+g[Xa>>2];pn=pn-vn*(+g[Ya>>2]*tn+ +g[Za>>2]*qn);g[_a>>2]=pn;rn=+g[$a>>2];wn=+g[ab>>2];un=+g[bb>>2];nn=+g[cb>>2];tn=vn*(rn*qn+(rn*pn+ +g[db>>2]*tn))-wn*(+g[eb>>2]*un+ +g[fb>>2]*nn);g[gb>>2]=tn;pn=+g[hb>>2];rn=+g[ib>>2];qn=+g[jb>>2];vn=+g[kb>>2];nn=wn*(pn*tn+ +g[lb>>2]*un+pn*nn)-rn*(+g[mb>>2]*qn+ +g[nb>>2]*vn);g[ob>>2]=nn;pn=+g[pb>>2];vn=rn*(pn*nn+ +g[qb>>2]*qn+pn*vn);pn=+g[rb>>2];qn=+g[sb>>2];nn=+g[tb>>2];rn=vn-pn*(+g[ub>>2]*qn+ +g[vb>>2]*nn);g[wb>>2]=rn;un=+g[xb>>2];tn=+g[yb>>2];wn=+g[zb>>2];mn=+g[Ab>>2];qn=pn*(un*nn+(un*rn+ +g[Bb>>2]*qn))-tn*(+g[Cb>>2]*wn+ +g[Db>>2]*mn);g[Eb>>2]=qn;rn=+g[Fb>>2];un=+g[Gb>>2];nn=+g[Hb>>2];pn=+g[Ib>>2];wn=tn*(rn*mn+(rn*qn+ +g[Jb>>2]*wn))-un*(+g[Kb>>2]*nn+ +g[Lb>>2]*pn);g[Mb>>2]=wn;qn=+g[Nb>>2];nn=k*+g[Ob>>2]+f*+T(+(un*(qn*pn+(qn*wn+ +g[Pb>>2]*nn))));g[Qb>>2]=nn;g[Rb>>2]=h+ +Vb(+nn)*20.0;nn=+g[Sb>>2];wn=+g[Tb>>2];qn=+g[Ub>>2];vn=vn-nn*(+g[Wb>>2]*wn+ +g[Xb>>2]*qn);g[Yb>>2]=vn;pn=+g[Zb>>2];un=+g[_b>>2];rn=+g[$b>>2];mn=+g[ac>>2];wn=nn*(pn*qn+(pn*vn+ +g[bc>>2]*wn))-un*(+g[cc>>2]*rn+ +g[dc>>2]*mn);g[ec>>2]=wn;vn=+g[fc>>2];pn=+g[gc>>2];qn=+g[hc>>2];nn=+g[ic>>2];mn=un*(vn*wn+ +g[jc>>2]*rn+vn*mn)-pn*(+g[kc>>2]*qn+ +g[lc>>2]*nn);g[mc>>2]=mn;vn=+g[nc>>2];qn=pn*(vn*nn+(vn*mn+ +g[oc>>2]*qn));mn=+g[pc>>2];vn=+g[qc>>2];nn=+g[rc>>2];pn=qn-mn*(+g[sc>>2]*vn+ +g[tc>>2]*nn);g[uc>>2]=pn;rn=+g[vc>>2];wn=+g[wc>>2];un=+g[xc>>2];tn=+g[yc>>2];vn=mn*(rn*nn+(rn*pn+ +g[zc>>2]*vn))-wn*(+g[Ac>>2]*un+ +g[Bc>>2]*tn);g[Cc>>2]=vn;pn=+g[Dc>>2];rn=+g[Ec>>2];nn=+g[Fc>>2];mn=+g[Gc>>2];un=wn*(pn*tn+(pn*vn+ +g[Hc>>2]*un))-rn*(+g[Ic>>2]*nn+ +g[Jc>>2]*mn);g[Kc>>2]=un;vn=+g[Lc>>2];nn=k*+g[Mc>>2]+f*+T(+(rn*(vn*mn+(vn*un+ +g[Nc>>2]*nn))));g[Oc>>2]=nn;g[Pc>>2]=h+ +Vb(+nn)*20.0;nn=+g[Qc>>2];un=+g[Rc>>2];vn=+g[Sc>>2];qn=qn-nn*(+g[Tc>>2]*un+ +g[Uc>>2]*vn);g[Vc>>2]=qn;mn=+g[Wc>>2];rn=+g[Xc>>2];pn=+g[Yc>>2];tn=+g[Zc>>2];un=nn*(mn*vn+(mn*qn+ +g[_c>>2]*un))-rn*(+g[$c>>2]*pn+ +g[ad>>2]*tn);g[bd>>2]=un;qn=+g[cd>>2];mn=+g[dd>>2];vn=+g[ed>>2];nn=+g[fd>>2];pn=rn*(qn*tn+(qn*un+ +g[gd>>2]*pn))-mn*(+g[hd>>2]*vn+ +g[id>>2]*nn);g[jd>>2]=pn;un=+g[kd>>2];vn=mn*(un*nn+(un*pn+ +g[ld>>2]*vn));pn=+g[md>>2];un=+g[nd>>2];nn=+g[od>>2];mn=vn-pn*(+g[pd>>2]*un+ +g[qd>>2]*nn);g[rd>>2]=mn;qn=+g[sd>>2];tn=+g[td>>2];rn=+g[ud>>2];wn=+g[vd>>2];un=pn*(qn*nn+(qn*mn+ +g[wd>>2]*un))-tn*(+g[xd>>2]*rn+ +g[yd>>2]*wn);g[zd>>2]=un;mn=+g[Ad>>2];qn=+g[Bd>>2];nn=+g[Cd>>2];pn=+g[Dd>>2];rn=tn*(mn*wn+(mn*un+ +g[Ed>>2]*rn))-qn*(+g[Fd>>2]*nn+ +g[Gd>>2]*pn);g[Hd>>2]=rn;un=+g[Id>>2];nn=k*+g[Jd>>2]+f*+T(+(qn*(un*pn+(un*rn+ +g[Kd>>2]*nn))));g[Ld>>2]=nn;g[Md>>2]=h+ +Vb(+nn)*20.0;nn=+g[Nd>>2];rn=+g[Od>>2];un=+g[Pd>>2];vn=vn-nn*(+g[Qd>>2]*rn+ +g[Rd>>2]*un);g[Sd>>2]=vn;pn=+g[Td>>2];qn=+g[Ud>>2];mn=+g[Vd>>2];wn=+g[Wd>>2];rn=nn*(pn*un+(pn*vn+ +g[Xd>>2]*rn))-qn*(+g[Yd>>2]*mn+ +g[Zd>>2]*wn);g[_d>>2]=rn;vn=+g[$d>>2];pn=+g[ae>>2];un=+g[be>>2];nn=+g[ce>>2];mn=qn*(vn*wn+(vn*rn+ +g[de>>2]*mn))-pn*(+g[ee>>2]*un+ +g[fe>>2]*nn);g[ge>>2]=mn;rn=+g[he>>2];un=pn*(rn*nn+(rn*mn+ +g[ie>>2]*un));mn=+g[je>>2];rn=+g[ke>>2];nn=+g[le>>2];pn=un-mn*(+g[me>>2]*rn+ +g[ne>>2]*nn);g[oe>>2]=pn;vn=+g[pe>>2];wn=+g[qe>>2];qn=+g[re>>2];tn=+g[se>>2];rn=mn*(vn*nn+(vn*pn+ +g[te>>2]*rn))-wn*(+g[ue>>2]*qn+ +g[ve>>2]*tn);g[we>>2]=rn;pn=+g[xe>>2];vn=+g[ye>>2];nn=+g[ze>>2];mn=+g[Ae>>2];qn=wn*(pn*tn+(pn*rn+ +g[Be>>2]*qn))-vn*(+g[Ce>>2]*nn+ +g[De>>2]*mn);g[Ee>>2]=qn;rn=+g[Fe>>2];nn=k*+g[Ge>>2]+f*+T(+(vn*(rn*mn+(rn*qn+ +g[He>>2]*nn))));g[Ie>>2]=nn;g[Je>>2]=h+ +Vb(+nn)*20.0;nn=+g[Ke>>2];qn=+g[Le>>2];rn=+g[Me>>2];un=un-nn*(+g[Ne>>2]*qn+ +g[Oe>>2]*rn);g[Pe>>2]=un;mn=+g[Qe>>2];vn=+g[Re>>2];pn=+g[Se>>2];tn=+g[Te>>2];qn=nn*(mn*rn+(mn*un+ +g[Ue>>2]*qn))-vn*(+g[Ve>>2]*pn+ +g[We>>2]*tn);g[Xe>>2]=qn;un=+g[Ye>>2];mn=+g[Ze>>2];rn=+g[_e>>2];nn=+g[$e>>2];pn=vn*(un*tn+(un*qn+ +g[af>>2]*pn))-mn*(+g[bf>>2]*rn+ +g[cf>>2]*nn);g[df>>2]=pn;qn=+g[ef>>2];rn=mn*(qn*nn+(qn*pn+ +g[ff>>2]*rn));pn=+g[gf>>2];qn=+g[hf>>2];nn=+g[jf>>2];mn=rn-pn*(+g[kf>>2]*qn+ +g[lf>>2]*nn);g[mf>>2]=mn;un=+g[nf>>2];tn=+g[of>>2];vn=+g[pf>>2];wn=+g[qf>>2];qn=pn*(un*nn+(un*mn+ +g[rf>>2]*qn))-tn*(+g[sf>>2]*vn+ +g[tf>>2]*wn);g[uf>>2]=qn;mn=+g[vf>>2];un=+g[wf>>2];nn=+g[xf>>2];pn=+g[yf>>2];vn=tn*(mn*wn+(mn*qn+ +g[zf>>2]*vn))-un*(+g[Af>>2]*nn+ +g[Bf>>2]*pn);g[Cf>>2]=vn;qn=+g[Df>>2];nn=k*+g[Ef>>2]+f*+T(+(un*(qn*pn+(qn*vn+ +g[Ff>>2]*nn))));g[Gf>>2]=nn;g[Hf>>2]=h+ +Vb(+nn)*20.0;nn=+g[If>>2];vn=+g[Jf>>2];qn=+g[Kf>>2];rn=rn-nn*(+g[Lf>>2]*vn+ +g[Mf>>2]*qn);g[Nf>>2]=rn;pn=+g[Of>>2];un=+g[Pf>>2];mn=+g[Qf>>2];wn=+g[Rf>>2];vn=nn*(pn*qn+(pn*rn+ +g[Sf>>2]*vn))-un*(+g[Tf>>2]*mn+ +g[Uf>>2]*wn);g[Vf>>2]=vn;rn=+g[Wf>>2];pn=+g[Xf>>2];qn=+g[Yf>>2];nn=+g[Zf>>2];mn=un*(rn*wn+(rn*vn+ +g[_f>>2]*mn))-pn*(+g[$f>>2]*qn+ +g[ag>>2]*nn);g[bg>>2]=mn;vn=+g[cg>>2];qn=pn*(vn*nn+(vn*mn+ +g[dg>>2]*qn));mn=+g[eg>>2];vn=+g[fg>>2];nn=+g[gg>>2];pn=qn-mn*(+g[hg>>2]*vn+ +g[ig>>2]*nn);g[jg>>2]=pn;rn=+g[kg>>2];wn=+g[lg>>2];un=+g[mg>>2];tn=+g[ng>>2];vn=mn*(rn*nn+(rn*pn+ +g[og>>2]*vn))-wn*(+g[pg>>2]*un+ +g[qg>>2]*tn);g[rg>>2]=vn;pn=+g[sg>>2];rn=+g[tg>>2];nn=+g[ug>>2];mn=+g[vg>>2];un=wn*(pn*tn+(pn*vn+ +g[wg>>2]*un))-rn*(+g[xg>>2]*nn+ +g[yg>>2]*mn);g[zg>>2]=un;vn=+g[Ag>>2];nn=k*+g[Bg>>2]+f*+T(+(rn*(vn*mn+(vn*un+ +g[Cg>>2]*nn))));g[Dg>>2]=nn;g[Eg>>2]=h+ +Vb(+nn)*20.0;nn=+g[Fg>>2];un=+g[Gg>>2];vn=+g[Hg>>2];qn=qn-nn*(+g[e>>2]*un+ +g[Jg>>2]*vn);g[Kg>>2]=qn;mn=+g[Lg>>2];rn=+g[Mg>>2];pn=+g[Ng>>2];tn=+g[Og>>2];un=nn*(mn*vn+(mn*qn+ +g[Pg>>2]*un))-rn*(+g[Qg>>2]*pn+ +g[Rg>>2]*tn);g[Sg>>2]=un;qn=+g[Tg>>2];mn=+g[Ug>>2];vn=+g[Vg>>2];nn=+g[Wg>>2];pn=rn*(qn*tn+(qn*un+ +g[Xg>>2]*pn))-mn*(+g[Yg>>2]*vn+ +g[Zg>>2]*nn);g[_g>>2]=pn;un=+g[$g>>2];vn=mn*(un*nn+(un*pn+ +g[ah>>2]*vn));pn=+g[bh>>2];un=+g[ch>>2];nn=+g[dh>>2];mn=vn-pn*(+g[eh>>2]*un+ +g[fh>>2]*nn);g[gh>>2]=mn;qn=+g[hh>>2];tn=+g[ih>>2];rn=+g[jh>>2];wn=+g[kh>>2];un=pn*(qn*nn+(qn*mn+ +g[lh>>2]*un))-tn*(+g[mh>>2]*rn+ +g[nh>>2]*wn);g[oh>>2]=un;mn=+g[ph>>2];qn=+g[qh>>2];nn=+g[rh>>2];pn=+g[sh>>2];rn=tn*(mn*wn+(mn*un+ +g[th>>2]*rn))-qn*(+g[uh>>2]*nn+ +g[vh>>2]*pn);g[wh>>2]=rn;un=+g[xh>>2];nn=k*+g[yh>>2]+f*+T(+(qn*(un*pn+(un*rn+ +g[zh>>2]*nn))));g[Ah>>2]=nn;g[Bh>>2]=h+ +Vb(+nn)*20.0;nn=+g[Ch>>2];rn=+g[Dh>>2];un=+g[Eh>>2];vn=vn-nn*(+g[Fh>>2]*rn+ +g[Gh>>2]*un);g[Hh>>2]=vn;pn=+g[Ih>>2];qn=+g[Jh>>2];mn=+g[Kh>>2];wn=+g[Lh>>2];rn=nn*(pn*un+(pn*vn+ +g[Mh>>2]*rn))-qn*(+g[Nh>>2]*mn+ +g[Oh>>2]*wn);g[Ph>>2]=rn;vn=+g[Qh>>2];pn=+g[Rh>>2];un=+g[Sh>>2];nn=+g[Th>>2];mn=qn*(vn*wn+(vn*rn+ +g[Uh>>2]*mn))-pn*(+g[Vh>>2]*un+ +g[Wh>>2]*nn);g[Xh>>2]=mn;rn=+g[Yh>>2];un=pn*(rn*nn+(rn*mn+ +g[Zh>>2]*un));mn=+g[_h>>2];rn=+g[$h>>2];nn=+g[ai>>2];pn=un-mn*(+g[bi>>2]*rn+ +g[ci>>2]*nn);g[di>>2]=pn;vn=+g[ei>>2];wn=+g[fi>>2];qn=+g[gi>>2];tn=+g[hi>>2];rn=mn*(vn*nn+(vn*pn+ +g[ii>>2]*rn))-wn*(+g[ji>>2]*qn+ +g[ki>>2]*tn);g[li>>2]=rn;pn=+g[mi>>2];vn=+g[ni>>2];nn=+g[oi>>2];mn=+g[pi>>2];qn=wn*(pn*tn+(pn*rn+ +g[qi>>2]*qn))-vn*(+g[ri>>2]*nn+ +g[si>>2]*mn);g[ti>>2]=qn;rn=+g[ui>>2];nn=k*+g[vi>>2]+f*+T(+(vn*(rn*mn+(rn*qn+ +g[wi>>2]*nn))));g[xi>>2]=nn;g[yi>>2]=h+ +Vb(+nn)*20.0;nn=+g[zi>>2];qn=+g[Ai>>2];rn=+g[Bi>>2];un=un-nn*(+g[Ci>>2]*qn+ +g[Di>>2]*rn);g[Ei>>2]=un;mn=+g[Fi>>2];vn=+g[Gi>>2];pn=+g[Hi>>2];tn=+g[Ii>>2];qn=nn*(mn*rn+(mn*un+ +g[Ji>>2]*qn))-vn*(+g[Ki>>2]*pn+ +g[Li>>2]*tn);g[Mi>>2]=qn;un=+g[Ni>>2];mn=+g[Oi>>2];rn=+g[Pi>>2];nn=+g[Qi>>2];pn=vn*(un*tn+(un*qn+ +g[Ri>>2]*pn))-mn*(+g[Si>>2]*rn+ +g[Ti>>2]*nn);g[Ui>>2]=pn;qn=+g[Vi>>2];rn=mn*(qn*nn+(qn*pn+ +g[Wi>>2]*rn));pn=+g[Xi>>2];qn=+g[Yi>>2];nn=+g[Zi>>2];mn=rn-pn*(+g[_i>>2]*qn+ +g[$i>>2]*nn);g[aj>>2]=mn;un=+g[bj>>2];tn=+g[cj>>2];vn=+g[dj>>2];wn=+g[ej>>2];qn=pn*(un*nn+(un*mn+ +g[fj>>2]*qn))-tn*(+g[gj>>2]*vn+ +g[hj>>2]*wn);g[ij>>2]=qn;mn=+g[jj>>2];un=+g[kj>>2];nn=+g[lj>>2];pn=+g[mj>>2];vn=tn*(mn*wn+(mn*qn+ +g[nj>>2]*vn))-un*(+g[oj>>2]*nn+ +g[pj>>2]*pn);g[qj>>2]=vn;qn=+g[rj>>2];nn=k*+g[sj>>2]+f*+T(+(un*(qn*pn+(qn*vn+ +g[tj>>2]*nn))));g[uj>>2]=nn;g[vj>>2]=h+ +Vb(+nn)*20.0;nn=+g[wj>>2];vn=+g[xj>>2];qn=+g[yj>>2];rn=rn-nn*(+g[zj>>2]*vn+ +g[Aj>>2]*qn);g[Bj>>2]=rn;pn=+g[Cj>>2];un=+g[Dj>>2];mn=+g[Ej>>2];wn=+g[Fj>>2];vn=nn*(pn*qn+(pn*rn+ +g[Gj>>2]*vn))-un*(+g[Hj>>2]*mn+ +g[Ij>>2]*wn);g[Jj>>2]=vn;rn=+g[Kj>>2];pn=+g[Lj>>2];qn=+g[Mj>>2];nn=+g[Nj>>2];mn=un*(rn*wn+(rn*vn+ +g[Oj>>2]*mn))-pn*(+g[Pj>>2]*qn+ +g[Qj>>2]*nn);g[Rj>>2]=mn;vn=+g[Sj>>2];qn=pn*(vn*nn+(vn*mn+ +g[Tj>>2]*qn));mn=+g[Uj>>2];vn=+g[Vj>>2];nn=+g[Wj>>2];pn=qn-mn*(+g[Xj>>2]*vn+ +g[Yj>>2]*nn);g[Zj>>2]=pn;rn=+g[_j>>2];wn=+g[$j>>2];un=+g[ak>>2];tn=+g[bk>>2];vn=mn*(rn*nn+(rn*pn+ +g[ck>>2]*vn))-wn*(+g[dk>>2]*un+ +g[ek>>2]*tn);g[fk>>2]=vn;pn=+g[gk>>2];rn=+g[hk>>2];nn=+g[ik>>2];mn=+g[jk>>2];un=wn*(pn*tn+(pn*vn+ +g[kk>>2]*un))-rn*(+g[lk>>2]*nn+ +g[mk>>2]*mn);g[nk>>2]=un;vn=+g[ok>>2];nn=k*+g[pk>>2]+f*+T(+(rn*(vn*mn+(vn*un+ +g[qk>>2]*nn))));g[rk>>2]=nn;g[sk>>2]=h+ +Vb(+nn)*20.0;nn=+g[tk>>2];un=+g[uk>>2];vn=+g[vk>>2];qn=qn-nn*(+g[wk>>2]*un+ +g[xk>>2]*vn);g[yk>>2]=qn;mn=+g[zk>>2];rn=+g[Ak>>2];pn=+g[Bk>>2];tn=+g[Ck>>2];un=nn*(mn*vn+(mn*qn+ +g[Dk>>2]*un))-rn*(+g[Ek>>2]*pn+ +g[Fk>>2]*tn);g[Gk>>2]=un;qn=+g[Hk>>2];mn=+g[Ik>>2];vn=+g[Jk>>2];nn=+g[Kk>>2];pn=rn*(qn*tn+(qn*un+ +g[Lk>>2]*pn))-mn*(+g[Mk>>2]*vn+ +g[Nk>>2]*nn);g[Ok>>2]=pn;un=+g[Pk>>2];vn=mn*(un*nn+(un*pn+ +g[Qk>>2]*vn));pn=+g[Rk>>2];un=+g[Sk>>2];nn=+g[Tk>>2];mn=vn-pn*(+g[Uk>>2]*un+ +g[Vk>>2]*nn);g[Wk>>2]=mn;qn=+g[Xk>>2];tn=+g[Yk>>2];rn=+g[Zk>>2];wn=+g[_k>>2];un=pn*(qn*nn+(qn*mn+ +g[$k>>2]*un))-tn*(+g[al>>2]*rn+ +g[bl>>2]*wn);g[cl>>2]=un;mn=+g[dl>>2];qn=+g[el>>2];nn=+g[fl>>2];pn=+g[gl>>2];rn=tn*(mn*wn+(mn*un+ +g[hl>>2]*rn))-qn*(+g[il>>2]*nn+ +g[jl>>2]*pn);g[kl>>2]=rn;un=+g[ll>>2];nn=k*+g[ml>>2]+f*+T(+(qn*(un*pn+(un*rn+ +g[nl>>2]*nn))));g[ol>>2]=nn;g[pl>>2]=h+ +Vb(+nn)*20.0;nn=+g[ql>>2];rn=+g[rl>>2];un=+g[sl>>2];vn=vn-nn*(+g[tl>>2]*rn+ +g[ul>>2]*un);g[vl>>2]=vn;pn=+g[wl>>2];qn=+g[xl>>2];mn=+g[yl>>2];wn=+g[zl>>2];rn=nn*(pn*un+(pn*vn+ +g[Al>>2]*rn))-qn*(+g[Bl>>2]*mn+ +g[Cl>>2]*wn);g[Dl>>2]=rn;vn=+g[El>>2];pn=+g[Fl>>2];un=+g[Gl>>2];nn=+g[Hl>>2];mn=qn*(vn*wn+(vn*rn+ +g[Il>>2]*mn))-pn*(+g[Jl>>2]*un+ +g[Kl>>2]*nn);g[Ll>>2]=mn;rn=+g[Ml>>2];un=pn*(rn*nn+(rn*mn+ +g[Nl>>2]*un));mn=+g[Ol>>2];rn=+g[Pl>>2];nn=+g[Ql>>2];pn=un-mn*(+g[Rl>>2]*rn+ +g[Sl>>2]*nn);g[Tl>>2]=pn;vn=+g[Ul>>2];wn=+g[Vl>>2];qn=+g[Wl>>2];tn=+g[Xl>>2];rn=mn*(vn*nn+(vn*pn+ +g[Yl>>2]*rn))-wn*(+g[Zl>>2]*qn+ +g[_l>>2]*tn);g[$l>>2]=rn;pn=+g[am>>2];vn=+g[bm>>2];nn=+g[cm>>2];mn=+g[dm>>2];qn=wn*(pn*tn+(pn*rn+ +g[em>>2]*qn))-vn*(+g[fm>>2]*nn+ +g[gm>>2]*mn);g[hm>>2]=qn;rn=+g[im>>2];nn=k*+g[jm>>2]+f*+T(+(vn*(rn*mn+(rn*qn+ +g[km>>2]*nn))));g[lm>>2]=nn;g[mm>>2]=h+ +Vb(+nn)*20.0;nn=+g[nm>>2];qn=+g[om>>2];rn=+g[pm>>2];un=un-nn*(+g[qm>>2]*qn+ +g[rm>>2]*rn);g[sm>>2]=un;mn=+g[tm>>2];vn=+g[um>>2];pn=+g[vm>>2];tn=+g[wm>>2];qn=nn*(mn*rn+(mn*un+ +g[xm>>2]*qn))-vn*(+g[ym>>2]*pn+ +g[zm>>2]*tn);g[Am>>2]=qn;un=+g[Bm>>2];mn=+g[Cm>>2];rn=+g[Dm>>2];nn=+g[Em>>2];pn=vn*(un*tn+(un*qn+ +g[Fm>>2]*pn))-mn*(+g[Gm>>2]*rn+ +g[Hm>>2]*nn);g[Im>>2]=pn;qn=+g[Jm>>2];rn=k*+g[Km>>2]+f*+T(+(mn*(qn*nn+(qn*pn+ +g[Lm>>2]*rn))));g[Mm>>2]=rn;g[Nm>>2]=h+ +Vb(+rn)*20.0;g[j+(a<<2)>>2]=on;g[Ig+(a<<2)>>2]=on;g[Km>>2]=+g[Mm>>2];g[Em>>2]=+g[Dm>>2];g[Dm>>2]=+g[Im>>2];g[wm>>2]=+g[vm>>2];g[vm>>2]=+g[Am>>2];g[pm>>2]=+g[om>>2];g[om>>2]=+g[sm>>2];g[jm>>2]=+g[lm>>2];g[dm>>2]=+g[cm>>2];g[cm>>2]=+g[hm>>2];g[Xl>>2]=+g[Wl>>2];g[Wl>>2]=+g[$l>>2];g[Ql>>2]=+g[Pl>>2];g[Pl>>2]=+g[Tl>>2];g[Hl>>2]=+g[Gl>>2];g[Gl>>2]=+g[Ll>>2];g[zl>>2]=+g[yl>>2];g[yl>>2]=+g[Dl>>2];g[sl>>2]=+g[rl>>2];g[rl>>2]=+g[vl>>2];g[ml>>2]=+g[ol>>2];g[gl>>2]=+g[fl>>2];g[fl>>2]=+g[kl>>2];g[_k>>2]=+g[Zk>>2];g[Zk>>2]=+g[cl>>2];g[Tk>>2]=+g[Sk>>2];g[Sk>>2]=+g[Wk>>2];g[Kk>>2]=+g[Jk>>2];g[Jk>>2]=+g[Ok>>2];g[Ck>>2]=+g[Bk>>2];g[Bk>>2]=+g[Gk>>2];g[vk>>2]=+g[uk>>2];g[uk>>2]=+g[yk>>2];g[pk>>2]=+g[rk>>2];g[jk>>2]=+g[ik>>2];g[ik>>2]=+g[nk>>2];g[bk>>2]=+g[ak>>2];g[ak>>2]=+g[fk>>2];g[Wj>>2]=+g[Vj>>2];g[Vj>>2]=+g[Zj>>2];g[Nj>>2]=+g[Mj>>2];g[Mj>>2]=+g[Rj>>2];g[Fj>>2]=+g[Ej>>2];g[Ej>>2]=+g[Jj>>2];g[yj>>2]=+g[xj>>2];g[xj>>2]=+g[Bj>>2];g[sj>>2]=+g[uj>>2];g[mj>>2]=+g[lj>>2];g[lj>>2]=+g[qj>>2];g[ej>>2]=+g[dj>>2];g[dj>>2]=+g[ij>>2];g[Zi>>2]=+g[Yi>>2];g[Yi>>2]=+g[aj>>2];g[Qi>>2]=+g[Pi>>2];g[Pi>>2]=+g[Ui>>2];g[Ii>>2]=+g[Hi>>2];g[Hi>>2]=+g[Mi>>2];g[Bi>>2]=+g[Ai>>2];g[Ai>>2]=+g[Ei>>2];g[vi>>2]=+g[xi>>2];g[pi>>2]=+g[oi>>2];g[oi>>2]=+g[ti>>2];g[hi>>2]=+g[gi>>2];g[gi>>2]=+g[li>>2];g[ai>>2]=+g[$h>>2];g[$h>>2]=+g[di>>2];g[Th>>2]=+g[Sh>>2];g[Sh>>2]=+g[Xh>>2];g[Lh>>2]=+g[Kh>>2];g[Kh>>2]=+g[Ph>>2];g[Eh>>2]=+g[Dh>>2];g[Dh>>2]=+g[Hh>>2];g[yh>>2]=+g[Ah>>2];g[sh>>2]=+g[rh>>2];g[rh>>2]=+g[wh>>2];g[kh>>2]=+g[jh>>2];g[jh>>2]=+g[oh>>2];g[dh>>2]=+g[ch>>2];g[ch>>2]=+g[gh>>2];g[Wg>>2]=+g[Vg>>2];g[Vg>>2]=+g[_g>>2];g[Og>>2]=+g[Ng>>2];g[Ng>>2]=+g[Sg>>2];g[Hg>>2]=+g[Gg>>2];g[Gg>>2]=+g[Kg>>2];g[Bg>>2]=+g[Dg>>2];g[vg>>2]=+g[ug>>2];g[ug>>2]=+g[zg>>2];g[ng>>2]=+g[mg>>2];g[mg>>2]=+g[rg>>2];g[gg>>2]=+g[fg>>2];g[fg>>2]=+g[jg>>2];g[Zf>>2]=+g[Yf>>2];g[Yf>>2]=+g[bg>>2];g[Rf>>2]=+g[Qf>>2];g[Qf>>2]=+g[Vf>>2];g[Kf>>2]=+g[Jf>>2];g[Jf>>2]=+g[Nf>>2];g[Ef>>2]=+g[Gf>>2];g[yf>>2]=+g[xf>>2];g[xf>>2]=+g[Cf>>2];g[qf>>2]=+g[pf>>2];g[pf>>2]=+g[uf>>2];g[jf>>2]=+g[hf>>2];g[hf>>2]=+g[mf>>2];g[$e>>2]=+g[_e>>2];g[_e>>2]=+g[df>>2];g[Te>>2]=+g[Se>>2];g[Se>>2]=+g[Xe>>2];g[Me>>2]=+g[Le>>2];g[Le>>2]=+g[Pe>>2];g[Ge>>2]=+g[Ie>>2];g[Ae>>2]=+g[ze>>2];g[ze>>2]=+g[Ee>>2];g[se>>2]=+g[re>>2];g[re>>2]=+g[we>>2];g[le>>2]=+g[ke>>2];g[ke>>2]=+g[oe>>2];g[ce>>2]=+g[be>>2];g[be>>2]=+g[ge>>2];g[Wd>>2]=+g[Vd>>2];g[Vd>>2]=+g[_d>>2];g[Pd>>2]=+g[Od>>2];g[Od>>2]=+g[Sd>>2];g[Jd>>2]=+g[Ld>>2];g[Dd>>2]=+g[Cd>>2];g[Cd>>2]=+g[Hd>>2];g[vd>>2]=+g[ud>>2];g[ud>>2]=+g[zd>>2];g[od>>2]=+g[nd>>2];g[nd>>2]=+g[rd>>2];g[fd>>2]=+g[ed>>2];g[ed>>2]=+g[jd>>2];g[Zc>>2]=+g[Yc>>2];g[Yc>>2]=+g[bd>>2];g[Sc>>2]=+g[Rc>>2];g[Rc>>2]=+g[Vc>>2];g[Mc>>2]=+g[Oc>>2];g[Gc>>2]=+g[Fc>>2];g[Fc>>2]=+g[Kc>>2];g[yc>>2]=+g[xc>>2];g[xc>>2]=+g[Cc>>2];g[rc>>2]=+g[qc>>2];g[qc>>2]=+g[uc>>2];g[ic>>2]=+g[hc>>2];g[hc>>2]=+g[mc>>2];g[ac>>2]=+g[$b>>2];g[$b>>2]=+g[ec>>2];g[Ub>>2]=+g[Tb>>2];g[Tb>>2]=+g[Yb>>2];g[Ob>>2]=+g[Qb>>2];g[Ib>>2]=+g[Hb>>2];g[Hb>>2]=+g[Mb>>2];g[Ab>>2]=+g[zb>>2];g[zb>>2]=+g[Eb>>2];g[tb>>2]=+g[sb>>2];g[sb>>2]=+g[wb>>2];g[kb>>2]=+g[jb>>2];g[jb>>2]=+g[ob>>2];g[cb>>2]=+g[bb>>2];g[bb>>2]=+g[gb>>2];g[Xa>>2]=+g[Wa>>2];g[Wa>>2]=+g[_a>>2];g[Ra>>2]=+g[Ta>>2];g[Ka>>2]=+g[Ja>>2];g[Ja>>2]=+g[Oa>>2];g[Ca>>2]=+g[Ba>>2];g[Ba>>2]=+g[Ga>>2];g[va>>2]=+g[ua>>2];g[ua>>2]=+g[ya>>2];g[ma>>2]=+g[la>>2];g[la>>2]=+g[qa>>2];g[da>>2]=+g[ea>>2];g[ea>>2]=+g[ia>>2];g[Y>>2]=+g[U>>2];g[U>>2]=+g[$>>2];g[N>>2]=+g[Q>>2];g[H>>2]=+g[P>>2];en=+g[L>>2];g[P>>2]=en;fn=+g[Om>>2];g[Pm>>2]=fn;gn=+g[E>>2];g[Om>>2]=gn;hn=+g[Qm>>2];g[Rm>>2]=hn;jn=+g[y>>2];g[Qm>>2]=jn;ln=+g[u>>2];g[Sm>>2]=ln;kn=+g[t>>2];g[Tm>>2]=kn;on=+g[Um>>2];g[Vm>>2]=on;rn=+g[Wm>>2];g[Xm>>2]=rn;pn=+g[Ym>>2];g[Zm>>2]=pn;qn=+g[_m>>2];g[$m>>2]=qn;nn=+g[an>>2];g[bn>>2]=nn;mn=+g[cn>>2];g[dn>>2]=mn;sn=c[s>>2]|0;c[r>>2]=sn;a=a+1|0}while((a|0)!=(b|0));i=d;return}else{a=0;do{c[s>>2]=1;wn=p+mn*.9990000128746033;g[cn>>2]=wn;vn=l+m*nn;g[an>>2]=vn;vn=+g[q>>2]*vn;nn=+X(+vn);vn=+W(+vn);mn=nn*pn+vn*qn;g[_m>>2]=mn;g[Ym>>2]=vn*pn+(0.0-nn)*qn+1.0- +(sn|0);mn=wn*mn;wn=n+rn*.9990000128746033;g[Wm>>2]=wn;nn=o+on*.9990000128746033;g[Um>>2]=nn;nn=+V(10.0,+(wn*2.0))*0.0+nn;nn=nn<1.0?nn:1.0;tn=nn>-1.0?nn:-1.0;tn=tn*(1.0-tn*tn*.3333333432674408);g[t>>2]=tn;g[u>>2]=ln*.9950000047683716+tn-kn;tn=+g[v>>2];un=mn-tn*(+g[w>>2]*jn+ +g[x>>2]*hn);g[y>>2]=un;rn=+g[z>>2];on=+g[A>>2];un=tn*(rn*hn+(+g[B>>2]*jn+rn*un))-on*(+g[C>>2]*gn+ +g[D>>2]*fn);g[E>>2]=un;rn=+g[F>>2];tn=+g[G>>2];nn=+g[H>>2];rn=on*(rn*un+ +g[I>>2]*gn+rn*fn)-tn*(+g[J>>2]*en+ +g[K>>2]*nn);g[L>>2]=rn;un=+g[M>>2];rn=k*+g[N>>2]+f*+T(+(tn*(un*nn+(un*rn+ +g[O>>2]*+g[P>>2]))));g[Q>>2]=rn;g[R>>2]=h+ +Vb(+rn)*20.0;rn=+g[S>>2];un=+g[U>>2];nn=+g[Y>>2];tn=mn-rn*(+g[Z>>2]*un+ +g[_>>2]*nn);g[$>>2]=tn;on=+g[aa>>2];vn=+g[ca>>2];pn=+g[da>>2];wn=+g[ea>>2];nn=rn*(on*tn+ +g[fa>>2]*un+on*nn)-vn*(+g[ga>>2]*pn+ +g[ha>>2]*wn);g[ia>>2]=nn;on=+g[ja>>2];un=+g[ka>>2];tn=+g[la>>2];rn=+g[ma>>2];pn=vn*(on*nn+ +g[na>>2]*wn+on*pn)-un*(+g[oa>>2]*tn+ +g[pa>>2]*rn);g[qa>>2]=pn;on=+g[ra>>2];rn=un*(on*pn+ +g[sa>>2]*tn+on*rn);on=+g[ta>>2];tn=+g[ua>>2];pn=+g[va>>2];un=rn-on*(+g[wa>>2]*tn+ +g[xa>>2]*pn);g[ya>>2]=un;wn=+g[za>>2];nn=+g[Aa>>2];vn=+g[Ba>>2];qn=+g[Ca>>2];pn=on*(wn*un+ +g[Da>>2]*tn+wn*pn)-nn*(+g[Ea>>2]*vn+ +g[Fa>>2]*qn);g[Ga>>2]=pn;wn=+g[Ha>>2];tn=+g[Ia>>2];un=+g[Ja>>2];on=+g[Ka>>2];vn=nn*(wn*qn+(wn*pn+ +g[La>>2]*vn))-tn*(+g[Ma>>2]*un+ +g[Na>>2]*on);g[Oa>>2]=vn;pn=+g[Qa>>2];un=k*+g[Ra>>2]+f*+T(+(tn*(pn*on+(pn*vn+ +g[Sa>>2]*un))));g[Ta>>2]=un;g[Ua>>2]=h+ +Vb(+un)*20.0;un=+g[Va>>2];vn=+g[Wa>>2];pn=+g[Xa>>2];rn=rn-un*(+g[Ya>>2]*vn+ +g[Za>>2]*pn);g[_a>>2]=rn;on=+g[$a>>2];tn=+g[ab>>2];wn=+g[bb>>2];qn=+g[cb>>2];vn=un*(on*pn+(on*rn+ +g[db>>2]*vn))-tn*(+g[eb>>2]*wn+ +g[fb>>2]*qn);g[gb>>2]=vn;rn=+g[hb>>2];on=+g[ib>>2];pn=+g[jb>>2];un=+g[kb>>2];qn=tn*(rn*vn+ +g[lb>>2]*wn+rn*qn)-on*(+g[mb>>2]*pn+ +g[nb>>2]*un);g[ob>>2]=qn;rn=+g[pb>>2];un=on*(rn*qn+ +g[qb>>2]*pn+rn*un);rn=+g[rb>>2];pn=+g[sb>>2];qn=+g[tb>>2];on=un-rn*(+g[ub>>2]*pn+ +g[vb>>2]*qn);g[wb>>2]=on;wn=+g[xb>>2];vn=+g[yb>>2];tn=+g[zb>>2];nn=+g[Ab>>2];pn=rn*(wn*qn+(wn*on+ +g[Bb>>2]*pn))-vn*(+g[Cb>>2]*tn+ +g[Db>>2]*nn);g[Eb>>2]=pn;on=+g[Fb>>2];wn=+g[Gb>>2];qn=+g[Hb>>2];rn=+g[Ib>>2];tn=vn*(on*nn+(on*pn+ +g[Jb>>2]*tn))-wn*(+g[Kb>>2]*qn+ +g[Lb>>2]*rn);g[Mb>>2]=tn;pn=+g[Nb>>2];qn=k*+g[Ob>>2]+f*+T(+(wn*(pn*rn+(pn*tn+ +g[Pb>>2]*qn))));g[Qb>>2]=qn;g[Rb>>2]=h+ +Vb(+qn)*20.0;qn=+g[Sb>>2];tn=+g[Tb>>2];pn=+g[Ub>>2];un=un-qn*(+g[Wb>>2]*tn+ +g[Xb>>2]*pn);g[Yb>>2]=un;rn=+g[Zb>>2];wn=+g[_b>>2];on=+g[$b>>2];nn=+g[ac>>2];tn=qn*(rn*pn+(rn*un+ +g[bc>>2]*tn))-wn*(+g[cc>>2]*on+ +g[dc>>2]*nn);g[ec>>2]=tn;un=+g[fc>>2];rn=+g[gc>>2];pn=+g[hc>>2];qn=+g[ic>>2];nn=wn*(un*tn+ +g[jc>>2]*on+un*nn)-rn*(+g[kc>>2]*pn+ +g[lc>>2]*qn);g[mc>>2]=nn;un=+g[nc>>2];pn=rn*(un*qn+(un*nn+ +g[oc>>2]*pn));nn=+g[pc>>2];un=+g[qc>>2];qn=+g[rc>>2];rn=pn-nn*(+g[sc>>2]*un+ +g[tc>>2]*qn);g[uc>>2]=rn;on=+g[vc>>2];tn=+g[wc>>2];wn=+g[xc>>2];vn=+g[yc>>2];un=nn*(on*qn+(on*rn+ +g[zc>>2]*un))-tn*(+g[Ac>>2]*wn+ +g[Bc>>2]*vn);g[Cc>>2]=un;rn=+g[Dc>>2];on=+g[Ec>>2];qn=+g[Fc>>2];nn=+g[Gc>>2];wn=tn*(rn*vn+(rn*un+ +g[Hc>>2]*wn))-on*(+g[Ic>>2]*qn+ +g[Jc>>2]*nn);g[Kc>>2]=wn;un=+g[Lc>>2];qn=k*+g[Mc>>2]+f*+T(+(on*(un*nn+(un*wn+ +g[Nc>>2]*qn))));g[Oc>>2]=qn;g[Pc>>2]=h+ +Vb(+qn)*20.0;qn=+g[Qc>>2];wn=+g[Rc>>2];un=+g[Sc>>2];pn=pn-qn*(+g[Tc>>2]*wn+ +g[Uc>>2]*un);g[Vc>>2]=pn;nn=+g[Wc>>2];on=+g[Xc>>2];rn=+g[Yc>>2];vn=+g[Zc>>2];wn=qn*(nn*un+(nn*pn+ +g[_c>>2]*wn))-on*(+g[$c>>2]*rn+ +g[ad>>2]*vn);g[bd>>2]=wn;pn=+g[cd>>2];nn=+g[dd>>2];un=+g[ed>>2];qn=+g[fd>>2];rn=on*(pn*vn+(pn*wn+ +g[gd>>2]*rn))-nn*(+g[hd>>2]*un+ +g[id>>2]*qn);g[jd>>2]=rn;wn=+g[kd>>2];un=nn*(wn*qn+(wn*rn+ +g[ld>>2]*un));rn=+g[md>>2];wn=+g[nd>>2];qn=+g[od>>2];nn=un-rn*(+g[pd>>2]*wn+ +g[qd>>2]*qn);g[rd>>2]=nn;pn=+g[sd>>2];vn=+g[td>>2];on=+g[ud>>2];tn=+g[vd>>2];wn=rn*(pn*qn+(pn*nn+ +g[wd>>2]*wn))-vn*(+g[xd>>2]*on+ +g[yd>>2]*tn);g[zd>>2]=wn;nn=+g[Ad>>2];pn=+g[Bd>>2];qn=+g[Cd>>2];rn=+g[Dd>>2];on=vn*(nn*tn+(nn*wn+ +g[Ed>>2]*on))-pn*(+g[Fd>>2]*qn+ +g[Gd>>2]*rn);g[Hd>>2]=on;wn=+g[Id>>2];qn=k*+g[Jd>>2]+f*+T(+(pn*(wn*rn+(wn*on+ +g[Kd>>2]*qn))));g[Ld>>2]=qn;g[Md>>2]=h+ +Vb(+qn)*20.0;qn=+g[Nd>>2];on=+g[Od>>2];wn=+g[Pd>>2];un=un-qn*(+g[Qd>>2]*on+ +g[Rd>>2]*wn);g[Sd>>2]=un;rn=+g[Td>>2];pn=+g[Ud>>2];nn=+g[Vd>>2];tn=+g[Wd>>2];on=qn*(rn*wn+(rn*un+ +g[Xd>>2]*on))-pn*(+g[Yd>>2]*nn+ +g[Zd>>2]*tn);g[_d>>2]=on;un=+g[$d>>2];rn=+g[ae>>2];wn=+g[be>>2];qn=+g[ce>>2];nn=pn*(un*tn+(un*on+ +g[de>>2]*nn))-rn*(+g[ee>>2]*wn+ +g[fe>>2]*qn);g[ge>>2]=nn;on=+g[he>>2];wn=rn*(on*qn+(on*nn+ +g[ie>>2]*wn));nn=+g[je>>2];on=+g[ke>>2];qn=+g[le>>2];rn=wn-nn*(+g[me>>2]*on+ +g[ne>>2]*qn);g[oe>>2]=rn;un=+g[pe>>2];tn=+g[qe>>2];pn=+g[re>>2];vn=+g[se>>2];on=nn*(un*qn+(un*rn+ +g[te>>2]*on))-tn*(+g[ue>>2]*pn+ +g[ve>>2]*vn);g[we>>2]=on;rn=+g[xe>>2];un=+g[ye>>2];qn=+g[ze>>2];nn=+g[Ae>>2];pn=tn*(rn*vn+(rn*on+ +g[Be>>2]*pn))-un*(+g[Ce>>2]*qn+ +g[De>>2]*nn);g[Ee>>2]=pn;on=+g[Fe>>2];qn=k*+g[Ge>>2]+f*+T(+(un*(on*nn+(on*pn+ +g[He>>2]*qn))));g[Ie>>2]=qn;g[Je>>2]=h+ +Vb(+qn)*20.0;qn=+g[Ke>>2];pn=+g[Le>>2];on=+g[Me>>2];wn=wn-qn*(+g[Ne>>2]*pn+ +g[Oe>>2]*on);g[Pe>>2]=wn;nn=+g[Qe>>2];un=+g[Re>>2];rn=+g[Se>>2];vn=+g[Te>>2];pn=qn*(nn*on+(nn*wn+ +g[Ue>>2]*pn))-un*(+g[Ve>>2]*rn+ +g[We>>2]*vn);g[Xe>>2]=pn;wn=+g[Ye>>2];nn=+g[Ze>>2];on=+g[_e>>2];qn=+g[$e>>2];rn=un*(wn*vn+(wn*pn+ +g[af>>2]*rn))-nn*(+g[bf>>2]*on+ +g[cf>>2]*qn);g[df>>2]=rn;pn=+g[ef>>2];on=nn*(pn*qn+(pn*rn+ +g[ff>>2]*on));rn=+g[gf>>2];pn=+g[hf>>2];qn=+g[jf>>2];nn=on-rn*(+g[kf>>2]*pn+ +g[lf>>2]*qn);g[mf>>2]=nn;wn=+g[nf>>2];vn=+g[of>>2];un=+g[pf>>2];tn=+g[qf>>2];pn=rn*(wn*qn+(wn*nn+ +g[rf>>2]*pn))-vn*(+g[sf>>2]*un+ +g[tf>>2]*tn);g[uf>>2]=pn;nn=+g[vf>>2];wn=+g[wf>>2];qn=+g[xf>>2];rn=+g[yf>>2];un=vn*(nn*tn+(nn*pn+ +g[zf>>2]*un))-wn*(+g[Af>>2]*qn+ +g[Bf>>2]*rn);g[Cf>>2]=un;pn=+g[Df>>2];qn=k*+g[Ef>>2]+f*+T(+(wn*(pn*rn+(pn*un+ +g[Ff>>2]*qn))));g[Gf>>2]=qn;g[Hf>>2]=h+ +Vb(+qn)*20.0;qn=+g[If>>2];un=+g[Jf>>2];pn=+g[Kf>>2];on=on-qn*(+g[Lf>>2]*un+ +g[Mf>>2]*pn);g[Nf>>2]=on;rn=+g[Of>>2];wn=+g[Pf>>2];nn=+g[Qf>>2];tn=+g[Rf>>2];un=qn*(rn*pn+(rn*on+ +g[Sf>>2]*un))-wn*(+g[Tf>>2]*nn+ +g[Uf>>2]*tn);g[Vf>>2]=un;on=+g[Wf>>2];rn=+g[Xf>>2];pn=+g[Yf>>2];qn=+g[Zf>>2];nn=wn*(on*tn+(on*un+ +g[_f>>2]*nn))-rn*(+g[$f>>2]*pn+ +g[ag>>2]*qn);g[bg>>2]=nn;un=+g[cg>>2];pn=rn*(un*qn+(un*nn+ +g[dg>>2]*pn));nn=+g[eg>>2];un=+g[fg>>2];qn=+g[gg>>2];rn=pn-nn*(+g[hg>>2]*un+ +g[ig>>2]*qn);g[jg>>2]=rn;on=+g[kg>>2];tn=+g[lg>>2];wn=+g[mg>>2];vn=+g[ng>>2];un=nn*(on*qn+(on*rn+ +g[og>>2]*un))-tn*(+g[pg>>2]*wn+ +g[qg>>2]*vn);g[rg>>2]=un;rn=+g[sg>>2];on=+g[tg>>2];qn=+g[ug>>2];nn=+g[vg>>2];wn=tn*(rn*vn+(rn*un+ +g[wg>>2]*wn))-on*(+g[xg>>2]*qn+ +g[yg>>2]*nn);g[zg>>2]=wn;un=+g[Ag>>2];qn=k*+g[Bg>>2]+f*+T(+(on*(un*nn+(un*wn+ +g[Cg>>2]*qn))));g[Dg>>2]=qn;g[Eg>>2]=h+ +Vb(+qn)*20.0;qn=+g[Fg>>2];wn=+g[Gg>>2];un=+g[Hg>>2];pn=pn-qn*(+g[e>>2]*wn+ +g[Jg>>2]*un);g[Kg>>2]=pn;nn=+g[Lg>>2];on=+g[Mg>>2];rn=+g[Ng>>2];vn=+g[Og>>2];wn=qn*(nn*un+(nn*pn+ +g[Pg>>2]*wn))-on*(+g[Qg>>2]*rn+ +g[Rg>>2]*vn);g[Sg>>2]=wn;pn=+g[Tg>>2];nn=+g[Ug>>2];un=+g[Vg>>2];qn=+g[Wg>>2];rn=on*(pn*vn+(pn*wn+ +g[Xg>>2]*rn))-nn*(+g[Yg>>2]*un+ +g[Zg>>2]*qn);g[_g>>2]=rn;wn=+g[$g>>2];un=nn*(wn*qn+(wn*rn+ +g[ah>>2]*un));rn=+g[bh>>2];wn=+g[ch>>2];qn=+g[dh>>2];nn=un-rn*(+g[eh>>2]*wn+ +g[fh>>2]*qn);g[gh>>2]=nn;pn=+g[hh>>2];vn=+g[ih>>2];on=+g[jh>>2];tn=+g[kh>>2];wn=rn*(pn*qn+(pn*nn+ +g[lh>>2]*wn))-vn*(+g[mh>>2]*on+ +g[nh>>2]*tn);g[oh>>2]=wn;nn=+g[ph>>2];pn=+g[qh>>2];qn=+g[rh>>2];rn=+g[sh>>2];on=vn*(nn*tn+(nn*wn+ +g[th>>2]*on))-pn*(+g[uh>>2]*qn+ +g[vh>>2]*rn);g[wh>>2]=on;wn=+g[xh>>2];qn=k*+g[yh>>2]+f*+T(+(pn*(wn*rn+(wn*on+ +g[zh>>2]*qn))));g[Ah>>2]=qn;g[Bh>>2]=h+ +Vb(+qn)*20.0;qn=+g[Ch>>2];on=+g[Dh>>2];wn=+g[Eh>>2];un=un-qn*(+g[Fh>>2]*on+ +g[Gh>>2]*wn);g[Hh>>2]=un;rn=+g[Ih>>2];pn=+g[Jh>>2];nn=+g[Kh>>2];tn=+g[Lh>>2];on=qn*(rn*wn+(rn*un+ +g[Mh>>2]*on))-pn*(+g[Nh>>2]*nn+ +g[Oh>>2]*tn);g[Ph>>2]=on;un=+g[Qh>>2];rn=+g[Rh>>2];wn=+g[Sh>>2];qn=+g[Th>>2];nn=pn*(un*tn+(un*on+ +g[Uh>>2]*nn))-rn*(+g[Vh>>2]*wn+ +g[Wh>>2]*qn);g[Xh>>2]=nn;on=+g[Yh>>2];wn=rn*(on*qn+(on*nn+ +g[Zh>>2]*wn));nn=+g[_h>>2];on=+g[$h>>2];qn=+g[ai>>2];rn=wn-nn*(+g[bi>>2]*on+ +g[ci>>2]*qn);g[di>>2]=rn;un=+g[ei>>2];tn=+g[fi>>2];pn=+g[gi>>2];vn=+g[hi>>2];on=nn*(un*qn+(un*rn+ +g[ii>>2]*on))-tn*(+g[ji>>2]*pn+ +g[ki>>2]*vn);g[li>>2]=on;rn=+g[mi>>2];un=+g[ni>>2];qn=+g[oi>>2];nn=+g[pi>>2];pn=tn*(rn*vn+(rn*on+ +g[qi>>2]*pn))-un*(+g[ri>>2]*qn+ +g[si>>2]*nn);g[ti>>2]=pn;on=+g[ui>>2];qn=k*+g[vi>>2]+f*+T(+(un*(on*nn+(on*pn+ +g[wi>>2]*qn))));g[xi>>2]=qn;g[yi>>2]=h+ +Vb(+qn)*20.0;qn=+g[zi>>2];pn=+g[Ai>>2];on=+g[Bi>>2];wn=wn-qn*(+g[Ci>>2]*pn+ +g[Di>>2]*on);g[Ei>>2]=wn;nn=+g[Fi>>2];un=+g[Gi>>2];rn=+g[Hi>>2];vn=+g[Ii>>2];pn=qn*(nn*on+(nn*wn+ +g[Ji>>2]*pn))-un*(+g[Ki>>2]*rn+ +g[Li>>2]*vn);g[Mi>>2]=pn;wn=+g[Ni>>2];nn=+g[Oi>>2];on=+g[Pi>>2];qn=+g[Qi>>2];rn=un*(wn*vn+(wn*pn+ +g[Ri>>2]*rn))-nn*(+g[Si>>2]*on+ +g[Ti>>2]*qn);g[Ui>>2]=rn;pn=+g[Vi>>2];on=nn*(pn*qn+(pn*rn+ +g[Wi>>2]*on));rn=+g[Xi>>2];pn=+g[Yi>>2];qn=+g[Zi>>2];nn=on-rn*(+g[_i>>2]*pn+ +g[$i>>2]*qn);g[aj>>2]=nn;wn=+g[bj>>2];vn=+g[cj>>2];un=+g[dj>>2];tn=+g[ej>>2];pn=rn*(wn*qn+(wn*nn+ +g[fj>>2]*pn))-vn*(+g[gj>>2]*un+ +g[hj>>2]*tn);g[ij>>2]=pn;nn=+g[jj>>2];wn=+g[kj>>2];qn=+g[lj>>2];rn=+g[mj>>2];un=vn*(nn*tn+(nn*pn+ +g[nj>>2]*un))-wn*(+g[oj>>2]*qn+ +g[pj>>2]*rn);g[qj>>2]=un;pn=+g[rj>>2];qn=k*+g[sj>>2]+f*+T(+(wn*(pn*rn+(pn*un+ +g[tj>>2]*qn))));g[uj>>2]=qn;g[vj>>2]=h+ +Vb(+qn)*20.0;qn=+g[wj>>2];un=+g[xj>>2];pn=+g[yj>>2];on=on-qn*(+g[zj>>2]*un+ +g[Aj>>2]*pn);g[Bj>>2]=on;rn=+g[Cj>>2];wn=+g[Dj>>2];nn=+g[Ej>>2];tn=+g[Fj>>2];un=qn*(rn*pn+(rn*on+ +g[Gj>>2]*un))-wn*(+g[Hj>>2]*nn+ +g[Ij>>2]*tn);g[Jj>>2]=un;on=+g[Kj>>2];rn=+g[Lj>>2];pn=+g[Mj>>2];qn=+g[Nj>>2];nn=wn*(on*tn+(on*un+ +g[Oj>>2]*nn))-rn*(+g[Pj>>2]*pn+ +g[Qj>>2]*qn);g[Rj>>2]=nn;un=+g[Sj>>2];pn=rn*(un*qn+(un*nn+ +g[Tj>>2]*pn));nn=+g[Uj>>2];un=+g[Vj>>2];qn=+g[Wj>>2];rn=pn-nn*(+g[Xj>>2]*un+ +g[Yj>>2]*qn);g[Zj>>2]=rn;on=+g[_j>>2];tn=+g[$j>>2];wn=+g[ak>>2];vn=+g[bk>>2];un=nn*(on*qn+(on*rn+ +g[ck>>2]*un))-tn*(+g[dk>>2]*wn+ +g[ek>>2]*vn);g[fk>>2]=un;rn=+g[gk>>2];on=+g[hk>>2];qn=+g[ik>>2];nn=+g[jk>>2];wn=tn*(rn*vn+(rn*un+ +g[kk>>2]*wn))-on*(+g[lk>>2]*qn+ +g[mk>>2]*nn);g[nk>>2]=wn;un=+g[ok>>2];qn=k*+g[pk>>2]+f*+T(+(on*(un*nn+(un*wn+ +g[qk>>2]*qn))));g[rk>>2]=qn;g[sk>>2]=h+ +Vb(+qn)*20.0;qn=+g[tk>>2];wn=+g[uk>>2];un=+g[vk>>2];pn=pn-qn*(+g[wk>>2]*wn+ +g[xk>>2]*un);g[yk>>2]=pn;nn=+g[zk>>2];on=+g[Ak>>2];rn=+g[Bk>>2];vn=+g[Ck>>2];wn=qn*(nn*un+(nn*pn+ +g[Dk>>2]*wn))-on*(+g[Ek>>2]*rn+ +g[Fk>>2]*vn);g[Gk>>2]=wn;pn=+g[Hk>>2];nn=+g[Ik>>2];un=+g[Jk>>2];qn=+g[Kk>>2];rn=on*(pn*vn+(pn*wn+ +g[Lk>>2]*rn))-nn*(+g[Mk>>2]*un+ +g[Nk>>2]*qn);g[Ok>>2]=rn;wn=+g[Pk>>2];un=nn*(wn*qn+(wn*rn+ +g[Qk>>2]*un));rn=+g[Rk>>2];wn=+g[Sk>>2];qn=+g[Tk>>2];nn=un-rn*(+g[Uk>>2]*wn+ +g[Vk>>2]*qn);g[Wk>>2]=nn;pn=+g[Xk>>2];vn=+g[Yk>>2];on=+g[Zk>>2];tn=+g[_k>>2];wn=rn*(pn*qn+(pn*nn+ +g[$k>>2]*wn))-vn*(+g[al>>2]*on+ +g[bl>>2]*tn);g[cl>>2]=wn;nn=+g[dl>>2];pn=+g[el>>2];qn=+g[fl>>2];rn=+g[gl>>2];on=vn*(nn*tn+(nn*wn+ +g[hl>>2]*on))-pn*(+g[il>>2]*qn+ +g[jl>>2]*rn);g[kl>>2]=on;wn=+g[ll>>2];qn=k*+g[ml>>2]+f*+T(+(pn*(wn*rn+(wn*on+ +g[nl>>2]*qn))));g[ol>>2]=qn;g[pl>>2]=h+ +Vb(+qn)*20.0;qn=+g[ql>>2];on=+g[rl>>2];wn=+g[sl>>2];un=un-qn*(+g[tl>>2]*on+ +g[ul>>2]*wn);g[vl>>2]=un;rn=+g[wl>>2];pn=+g[xl>>2];nn=+g[yl>>2];tn=+g[zl>>2];on=qn*(rn*wn+(rn*un+ +g[Al>>2]*on))-pn*(+g[Bl>>2]*nn+ +g[Cl>>2]*tn);g[Dl>>2]=on;un=+g[El>>2];rn=+g[Fl>>2];wn=+g[Gl>>2];qn=+g[Hl>>2];nn=pn*(un*tn+(un*on+ +g[Il>>2]*nn))-rn*(+g[Jl>>2]*wn+ +g[Kl>>2]*qn);g[Ll>>2]=nn;on=+g[Ml>>2];wn=rn*(on*qn+(on*nn+ +g[Nl>>2]*wn));nn=+g[Ol>>2];on=+g[Pl>>2];qn=+g[Ql>>2];rn=wn-nn*(+g[Rl>>2]*on+ +g[Sl>>2]*qn);g[Tl>>2]=rn;un=+g[Ul>>2];tn=+g[Vl>>2];pn=+g[Wl>>2];vn=+g[Xl>>2];on=nn*(un*qn+(un*rn+ +g[Yl>>2]*on))-tn*(+g[Zl>>2]*pn+ +g[_l>>2]*vn);g[$l>>2]=on;rn=+g[am>>2];un=+g[bm>>2];qn=+g[cm>>2];nn=+g[dm>>2];pn=tn*(rn*vn+(rn*on+ +g[em>>2]*pn))-un*(+g[fm>>2]*qn+ +g[gm>>2]*nn);g[hm>>2]=pn;on=+g[im>>2];qn=k*+g[jm>>2]+f*+T(+(un*(on*nn+(on*pn+ +g[km>>2]*qn))));g[lm>>2]=qn;g[mm>>2]=h+ +Vb(+qn)*20.0;qn=+g[nm>>2];pn=+g[om>>2];on=+g[pm>>2];wn=wn-qn*(+g[qm>>2]*pn+ +g[rm>>2]*on);g[sm>>2]=wn;nn=+g[tm>>2];un=+g[um>>2];rn=+g[vm>>2];vn=+g[wm>>2];pn=qn*(nn*on+(nn*wn+ +g[xm>>2]*pn))-un*(+g[ym>>2]*rn+ +g[zm>>2]*vn);g[Am>>2]=pn;wn=+g[Bm>>2];nn=+g[Cm>>2];on=+g[Dm>>2];qn=+g[Em>>2];rn=un*(wn*vn+(wn*pn+ +g[Fm>>2]*rn))-nn*(+g[Gm>>2]*on+ +g[Hm>>2]*qn);g[Im>>2]=rn;pn=+g[Jm>>2];on=k*+g[Km>>2]+f*+T(+(nn*(pn*qn+(pn*rn+ +g[Lm>>2]*on))));g[Mm>>2]=on;g[Nm>>2]=h+ +Vb(+on)*20.0;g[j+(a<<2)>>2]=mn;g[Ig+(a<<2)>>2]=mn;g[Km>>2]=+g[Mm>>2];g[Em>>2]=+g[Dm>>2];g[Dm>>2]=+g[Im>>2];g[wm>>2]=+g[vm>>2];g[vm>>2]=+g[Am>>2];g[pm>>2]=+g[om>>2];g[om>>2]=+g[sm>>2];g[jm>>2]=+g[lm>>2];g[dm>>2]=+g[cm>>2];g[cm>>2]=+g[hm>>2];g[Xl>>2]=+g[Wl>>2];g[Wl>>2]=+g[$l>>2];g[Ql>>2]=+g[Pl>>2];g[Pl>>2]=+g[Tl>>2];g[Hl>>2]=+g[Gl>>2];g[Gl>>2]=+g[Ll>>2];g[zl>>2]=+g[yl>>2];g[yl>>2]=+g[Dl>>2];g[sl>>2]=+g[rl>>2];g[rl>>2]=+g[vl>>2];g[ml>>2]=+g[ol>>2];g[gl>>2]=+g[fl>>2];g[fl>>2]=+g[kl>>2];g[_k>>2]=+g[Zk>>2];g[Zk>>2]=+g[cl>>2];g[Tk>>2]=+g[Sk>>2];g[Sk>>2]=+g[Wk>>2];g[Kk>>2]=+g[Jk>>2];g[Jk>>2]=+g[Ok>>2];g[Ck>>2]=+g[Bk>>2];g[Bk>>2]=+g[Gk>>2];g[vk>>2]=+g[uk>>2];g[uk>>2]=+g[yk>>2];g[pk>>2]=+g[rk>>2];g[jk>>2]=+g[ik>>2];g[ik>>2]=+g[nk>>2];g[bk>>2]=+g[ak>>2];g[ak>>2]=+g[fk>>2];g[Wj>>2]=+g[Vj>>2];g[Vj>>2]=+g[Zj>>2];g[Nj>>2]=+g[Mj>>2];g[Mj>>2]=+g[Rj>>2];g[Fj>>2]=+g[Ej>>2];g[Ej>>2]=+g[Jj>>2];g[yj>>2]=+g[xj>>2];g[xj>>2]=+g[Bj>>2];g[sj>>2]=+g[uj>>2];g[mj>>2]=+g[lj>>2];g[lj>>2]=+g[qj>>2];g[ej>>2]=+g[dj>>2];g[dj>>2]=+g[ij>>2];g[Zi>>2]=+g[Yi>>2];g[Yi>>2]=+g[aj>>2];g[Qi>>2]=+g[Pi>>2];g[Pi>>2]=+g[Ui>>2];g[Ii>>2]=+g[Hi>>2];g[Hi>>2]=+g[Mi>>2];g[Bi>>2]=+g[Ai>>2];g[Ai>>2]=+g[Ei>>2];g[vi>>2]=+g[xi>>2];g[pi>>2]=+g[oi>>2];g[oi>>2]=+g[ti>>2];g[hi>>2]=+g[gi>>2];g[gi>>2]=+g[li>>2];g[ai>>2]=+g[$h>>2];g[$h>>2]=+g[di>>2];g[Th>>2]=+g[Sh>>2];g[Sh>>2]=+g[Xh>>2];g[Lh>>2]=+g[Kh>>2];g[Kh>>2]=+g[Ph>>2];g[Eh>>2]=+g[Dh>>2];g[Dh>>2]=+g[Hh>>2];g[yh>>2]=+g[Ah>>2];g[sh>>2]=+g[rh>>2];g[rh>>2]=+g[wh>>2];g[kh>>2]=+g[jh>>2];g[jh>>2]=+g[oh>>2];g[dh>>2]=+g[ch>>2];g[ch>>2]=+g[gh>>2];g[Wg>>2]=+g[Vg>>2];g[Vg>>2]=+g[_g>>2];g[Og>>2]=+g[Ng>>2];g[Ng>>2]=+g[Sg>>2];g[Hg>>2]=+g[Gg>>2];g[Gg>>2]=+g[Kg>>2];g[Bg>>2]=+g[Dg>>2];g[vg>>2]=+g[ug>>2];g[ug>>2]=+g[zg>>2];g[ng>>2]=+g[mg>>2];g[mg>>2]=+g[rg>>2];g[gg>>2]=+g[fg>>2];g[fg>>2]=+g[jg>>2];g[Zf>>2]=+g[Yf>>2];g[Yf>>2]=+g[bg>>2];g[Rf>>2]=+g[Qf>>2];g[Qf>>2]=+g[Vf>>2];g[Kf>>2]=+g[Jf>>2];g[Jf>>2]=+g[Nf>>2];g[Ef>>2]=+g[Gf>>2];g[yf>>2]=+g[xf>>2];g[xf>>2]=+g[Cf>>2];g[qf>>2]=+g[pf>>2];g[pf>>2]=+g[uf>>2];g[jf>>2]=+g[hf>>2];g[hf>>2]=+g[mf>>2];g[$e>>2]=+g[_e>>2];g[_e>>2]=+g[df>>2];g[Te>>2]=+g[Se>>2];g[Se>>2]=+g[Xe>>2];g[Me>>2]=+g[Le>>2];g[Le>>2]=+g[Pe>>2];g[Ge>>2]=+g[Ie>>2];g[Ae>>2]=+g[ze>>2];g[ze>>2]=+g[Ee>>2];g[se>>2]=+g[re>>2];g[re>>2]=+g[we>>2];g[le>>2]=+g[ke>>2];g[ke>>2]=+g[oe>>2];g[ce>>2]=+g[be>>2];g[be>>2]=+g[ge>>2];g[Wd>>2]=+g[Vd>>2];g[Vd>>2]=+g[_d>>2];g[Pd>>2]=+g[Od>>2];g[Od>>2]=+g[Sd>>2];g[Jd>>2]=+g[Ld>>2];g[Dd>>2]=+g[Cd>>2];g[Cd>>2]=+g[Hd>>2];g[vd>>2]=+g[ud>>2];g[ud>>2]=+g[zd>>2];g[od>>2]=+g[nd>>2];g[nd>>2]=+g[rd>>2];g[fd>>2]=+g[ed>>2];g[ed>>2]=+g[jd>>2];g[Zc>>2]=+g[Yc>>2];g[Yc>>2]=+g[bd>>2];g[Sc>>2]=+g[Rc>>2];g[Rc>>2]=+g[Vc>>2];g[Mc>>2]=+g[Oc>>2];g[Gc>>2]=+g[Fc>>2];g[Fc>>2]=+g[Kc>>2];g[yc>>2]=+g[xc>>2];g[xc>>2]=+g[Cc>>2];g[rc>>2]=+g[qc>>2];g[qc>>2]=+g[uc>>2];g[ic>>2]=+g[hc>>2];g[hc>>2]=+g[mc>>2];g[ac>>2]=+g[$b>>2];g[$b>>2]=+g[ec>>2];g[Ub>>2]=+g[Tb>>2];g[Tb>>2]=+g[Yb>>2];g[Ob>>2]=+g[Qb>>2];g[Ib>>2]=+g[Hb>>2];g[Hb>>2]=+g[Mb>>2];g[Ab>>2]=+g[zb>>2];g[zb>>2]=+g[Eb>>2];g[tb>>2]=+g[sb>>2];g[sb>>2]=+g[wb>>2];g[kb>>2]=+g[jb>>2];g[jb>>2]=+g[ob>>2];g[cb>>2]=+g[bb>>2];g[bb>>2]=+g[gb>>2];g[Xa>>2]=+g[Wa>>2];g[Wa>>2]=+g[_a>>2];g[Ra>>2]=+g[Ta>>2];g[Ka>>2]=+g[Ja>>2];g[Ja>>2]=+g[Oa>>2];g[Ca>>2]=+g[Ba>>2];g[Ba>>2]=+g[Ga>>2];g[va>>2]=+g[ua>>2];g[ua>>2]=+g[ya>>2];g[ma>>2]=+g[la>>2];g[la>>2]=+g[qa>>2];g[da>>2]=+g[ea>>2];g[ea>>2]=+g[ia>>2];g[Y>>2]=+g[U>>2];g[U>>2]=+g[$>>2];g[N>>2]=+g[Q>>2];g[H>>2]=+g[P>>2];en=+g[L>>2];g[P>>2]=en;fn=+g[Om>>2];g[Pm>>2]=fn;gn=+g[E>>2];g[Om>>2]=gn;hn=+g[Qm>>2];g[Rm>>2]=hn;jn=+g[y>>2];g[Qm>>2]=jn;ln=+g[u>>2];g[Sm>>2]=ln;kn=+g[t>>2];g[Tm>>2]=kn;on=+g[Um>>2];g[Vm>>2]=on;rn=+g[Wm>>2];g[Xm>>2]=rn;pn=+g[Ym>>2];g[Zm>>2]=pn;qn=+g[_m>>2];g[$m>>2]=qn;nn=+g[an>>2];g[bn>>2]=nn;mn=+g[cn>>2];g[dn>>2]=mn;sn=c[s>>2]|0;c[r>>2]=sn;a=a+1|0}while((a|0)!=(b|0));i=d;return}}function zd(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,h=0.0,j=0,k=0.0,l=0,m=0.0,n=0,o=0,p=0.0,q=0,r=0.0,s=0.0,t=0,u=0,v=0,w=0;d=i;c[a+4>>2]=b;g[a+8>>2]=50.0;q=a+12|0;c[q>>2]=0;c[q+4>>2]=0;b=(b|0)>1?b:1;o=(b|0)<192e3?b:192e3;e=a+20|0;c[e>>2]=o;s=+(o|0);g[a+24>>2]=1.0/s;g[a+28>>2]=.10000000149011612;r=+Y(+(50265.484375/s));o=a+32|0;g[o>>2]=r;k=1.0/r;n=a+36|0;g[n>>2]=k;g[a+40>>2]=1.0/((k+.15748216211795807)/r+.9351401925086975);h=r*r;b=a+44|0;g[b>>2]=h;p=50.06380844116211/h;q=a+48|0;g[q>>2]=p;g[a+52>>2]=p+.9351401925086975;g[a+56>>2]=1.0/((k+.7431304454803467)/r+1.450071096420288);p=11.05205249786377/h;g[a+60>>2]=p;g[a+64>>2]=p+1.450071096420288;g[a+68>>2]=1.0/((k+3.189727306365967)/r+4.076781749725342);m=.0017661728197708726/h;g[a+72>>2]=m;g[a+76>>2]=m+.000407678191550076;g[a+80>>2]=0.0;g[a+84>>2]=-20.0;j=a+88|0;c[j>>2]=0;c[j+4>>2]=0;g[a+96>>2]=6.2831854820251465/s;g[a+100>>2]=.10000000149011612;g[a+104>>2]=49.0;h=1.0/h;j=a+172|0;l=a+108|0;f=l+64|0;do{c[l>>2]=0;l=l+4|0}while((l|0)<(f|0));g[j>>2]=h;g[a+176>>2]=(4.076781749725342-h)*2.0;g[a+180>>2]=(k+-3.189727306365967)/r+4.076781749725342;f=a+184|0;c[f+0>>2]=0;c[f+4>>2]=0;c[f+8>>2]=0;g[a+196>>2]=(.000407678191550076-m)*2.0;g[a+200>>2]=(1.450071096420288-h)*2.0;m=+g[n>>2];r=+g[o>>2];g[a+204>>2]=(m+-.7431304454803467)/r+1.450071096420288;f=a+208|0;c[f+0>>2]=0;c[f+4>>2]=0;c[f+8>>2]=0;g[a+220>>2]=(1.450071096420288-p)*2.0;g[a+224>>2]=(.9351401925086975-h)*2.0;g[a+228>>2]=(m+-.15748216211795807)/r+.9351401925086975;f=a+232|0;c[f+0>>2]=0;c[f+4>>2]=0;c[f+8>>2]=0;g[a+244>>2]=(.9351401925086975- +g[q>>2])*2.0;f=a+248|0;c[f>>2]=0;c[f+4>>2]=0;p=+Y(+(31665.26953125/+(c[e>>2]|0)));f=a+260|0;g[f>>2]=p;k=1.0/p;w=a+264|0;g[w>>2]=k;g[a+268>>2]=1.0/((k+.15748216211795807)/p+.9351401925086975);s=p*p;t=a+272|0;g[t>>2]=s;h=50.06380844116211/s;u=a+276|0;g[u>>2]=h;g[a+280>>2]=h+.9351401925086975;g[a+284>>2]=1.0/((k+.7431304454803467)/p+1.450071096420288);h=11.05205249786377/s;v=a+288|0;g[v>>2]=h;g[a+292>>2]=h+1.450071096420288;g[a+296>>2]=1.0/((k+3.189727306365967)/p+4.076781749725342);s=.0017661728197708726/s;q=a+300|0;g[q>>2]=s;g[a+304>>2]=s+.000407678191550076;g[a+308>>2]=1.0/((m+.16840487718582153)/r+1.0693583488464355);s=+g[j>>2];g[a+312>>2]=s+53.53615188598633;g[a+316>>2]=1.0/((m+.5124786496162415)/r+.6896213889122009);g[a+320>>2]=s+7.621731281280518;r=+g[n>>2];m=+g[o>>2];g[a+324>>2]=1.0/((r+.7824130654335022)/m+.24529150128364563);p=9999999747378752.0e-20/+g[b>>2];g[a+328>>2]=p;g[a+332>>2]=p+.0004332271928433329;g[a+336>>2]=(.24529150128364563-s)*2.0;g[a+340>>2]=(r+-.7824130654335022)/m+.24529150128364563;l=a+344|0;c[l+0>>2]=0;c[l+4>>2]=0;c[l+8>>2]=0;g[a+356>>2]=(.0004332271928433329-p)*2.0;g[a+360>>2]=(r+-.5124786496162415)/m+.6896213889122009;g[a+364>>2]=(.6896213889122009-s)*2.0;l=a+368|0;c[l+0>>2]=0;c[l+4>>2]=0;c[l+8>>2]=0;g[a+380>>2]=(7.621731281280518-s)*2.0;g[a+384>>2]=(1.0693583488464355-s)*2.0;g[a+388>>2]=(r+-.16840487718582153)/m+1.0693583488464355;l=a+392|0;c[l+0>>2]=0;c[l+4>>2]=0;c[l+8>>2]=0;g[a+404>>2]=(53.53615188598633-s)*2.0;s=1.0/+g[t>>2];l=a+408|0;g[l>>2]=s;g[a+412>>2]=(4.076781749725342-s)*2.0;m=+g[w>>2];r=+g[f>>2];g[a+416>>2]=(m+-3.189727306365967)/r+4.076781749725342;b=a+420|0;c[b+0>>2]=0;c[b+4>>2]=0;c[b+8>>2]=0;g[a+432>>2]=(.000407678191550076- +g[q>>2])*2.0;g[a+436>>2]=(1.450071096420288-s)*2.0;g[a+440>>2]=(m+-.7431304454803467)/r+1.450071096420288;b=a+444|0;c[b+0>>2]=0;c[b+4>>2]=0;c[b+8>>2]=0;g[a+456>>2]=(1.450071096420288- +g[v>>2])*2.0;g[a+460>>2]=(.9351401925086975-s)*2.0;g[a+464>>2]=(m+-.15748216211795807)/r+.9351401925086975;v=a+468|0;c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;g[a+480>>2]=(.9351401925086975- +g[u>>2])*2.0;u=a+484|0;c[u>>2]=0;c[u+4>>2]=0;r=+Y(+(19947.869140625/+(c[e>>2]|0)));u=a+496|0;g[u>>2]=r;m=1.0/r;v=a+500|0;g[v>>2]=m;g[a+504>>2]=1.0/((m+.15748216211795807)/r+.9351401925086975);s=r*r;b=a+508|0;g[b>>2]=s;p=50.06380844116211/s;q=a+512|0;g[q>>2]=p;g[a+516>>2]=p+.9351401925086975;g[a+520>>2]=1.0/((m+.7431304454803467)/r+1.450071096420288);p=11.05205249786377/s;o=a+524|0;g[o>>2]=p;g[a+528>>2]=p+1.450071096420288;g[a+532>>2]=1.0/((m+3.189727306365967)/r+4.076781749725342);s=.0017661728197708726/s;n=a+536|0;g[n>>2]=s;g[a+540>>2]=s+.000407678191550076;s=+g[w>>2];r=+g[f>>2];g[a+544>>2]=1.0/((s+.16840487718582153)/r+1.0693583488464355);m=+g[l>>2];g[a+548>>2]=m+53.53615188598633;g[a+552>>2]=1.0/((s+.5124786496162415)/r+.6896213889122009);g[a+556>>2]=m+7.621731281280518;g[a+560>>2]=1.0/((s+.7824130654335022)/r+.24529150128364563);p=9999999747378752.0e-20/+g[t>>2];g[a+564>>2]=p;g[a+568>>2]=p+.0004332271928433329;g[a+572>>2]=(.24529150128364563-m)*2.0;g[a+576>>2]=(s+-.7824130654335022)/r+.24529150128364563;t=a+580|0;c[t+0>>2]=0;c[t+4>>2]=0;c[t+8>>2]=0;g[a+592>>2]=(.0004332271928433329-p)*2.0;g[a+596>>2]=(.6896213889122009-m)*2.0;g[a+600>>2]=(s+-.5124786496162415)/r+.6896213889122009;t=a+604|0;c[t+0>>2]=0;c[t+4>>2]=0;c[t+8>>2]=0;g[a+616>>2]=(7.621731281280518-m)*2.0;g[a+620>>2]=(1.0693583488464355-m)*2.0;g[a+624>>2]=(s+-.16840487718582153)/r+1.0693583488464355;t=a+628|0;c[t+0>>2]=0;c[t+4>>2]=0;c[t+8>>2]=0;g[a+640>>2]=(53.53615188598633-m)*2.0;m=1.0/+g[b>>2];t=a+644|0;g[t>>2]=m;g[a+648>>2]=(4.076781749725342-m)*2.0;r=+g[v>>2];s=+g[u>>2];g[a+652>>2]=(r+-3.189727306365967)/s+4.076781749725342;l=a+656|0;c[l+0>>2]=0;c[l+4>>2]=0;c[l+8>>2]=0;g[a+668>>2]=(.000407678191550076- +g[n>>2])*2.0;g[a+672>>2]=(1.450071096420288-m)*2.0;g[a+676>>2]=(r+-.7431304454803467)/s+1.450071096420288;n=a+680|0;c[n+0>>2]=0;c[n+4>>2]=0;c[n+8>>2]=0;g[a+692>>2]=(1.450071096420288- +g[o>>2])*2.0;g[a+696>>2]=(.9351401925086975-m)*2.0;g[a+700>>2]=(r+-.15748216211795807)/s+.9351401925086975;o=a+704|0;c[o+0>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;g[a+716>>2]=(.9351401925086975- +g[q>>2])*2.0;q=a+720|0;c[q>>2]=0;c[q+4>>2]=0;s=+Y(+(12566.37109375/+(c[e>>2]|0)));q=a+732|0;g[q>>2]=s;r=1.0/s;o=a+736|0;g[o>>2]=r;g[a+740>>2]=1.0/((r+.15748216211795807)/s+.9351401925086975);m=s*s;n=a+744|0;g[n>>2]=m;p=50.06380844116211/m;l=a+748|0;g[l>>2]=p;g[a+752>>2]=p+.9351401925086975;g[a+756>>2]=1.0/((r+.7431304454803467)/s+1.450071096420288);p=11.05205249786377/m;j=a+760|0;g[j>>2]=p;g[a+764>>2]=p+1.450071096420288;g[a+768>>2]=1.0/((r+3.189727306365967)/s+4.076781749725342);m=.0017661728197708726/m;f=a+772|0;g[f>>2]=m;g[a+776>>2]=m+.000407678191550076;m=+g[v>>2];s=+g[u>>2];g[a+780>>2]=1.0/((m+.16840487718582153)/s+1.0693583488464355);r=+g[t>>2];g[a+784>>2]=r+53.53615188598633;g[a+788>>2]=1.0/((m+.5124786496162415)/s+.6896213889122009);g[a+792>>2]=r+7.621731281280518;g[a+796>>2]=1.0/((m+.7824130654335022)/s+.24529150128364563);p=9999999747378752.0e-20/+g[b>>2];g[a+800>>2]=p;g[a+804>>2]=p+.0004332271928433329;g[a+808>>2]=(.24529150128364563-r)*2.0;g[a+812>>2]=(m+-.7824130654335022)/s+.24529150128364563;b=a+816|0;c[b+0>>2]=0;c[b+4>>2]=0;c[b+8>>2]=0;g[a+828>>2]=(.0004332271928433329-p)*2.0;g[a+832>>2]=(.6896213889122009-r)*2.0;g[a+836>>2]=(m+-.5124786496162415)/s+.6896213889122009;b=a+840|0;c[b+0>>2]=0;c[b+4>>2]=0;c[b+8>>2]=0;g[a+852>>2]=(7.621731281280518-r)*2.0;g[a+856>>2]=(1.0693583488464355-r)*2.0;g[a+860>>2]=(m+-.16840487718582153)/s+1.0693583488464355;b=a+864|0;c[b+0>>2]=0;c[b+4>>2]=0;c[b+8>>2]=0;g[a+876>>2]=(53.53615188598633-r)*2.0;r=1.0/+g[n>>2];b=a+880|0;g[b>>2]=r;g[a+884>>2]=(4.076781749725342-r)*2.0;s=+g[o>>2];m=+g[q>>2];g[a+888>>2]=(s+-3.189727306365967)/m+4.076781749725342;t=a+892|0;c[t+0>>2]=0;c[t+4>>2]=0;c[t+8>>2]=0;g[a+904>>2]=(.000407678191550076- +g[f>>2])*2.0;g[a+908>>2]=(1.450071096420288-r)*2.0;g[a+912>>2]=(s+-.7431304454803467)/m+1.450071096420288;f=a+916|0;c[f+0>>2]=0;c[f+4>>2]=0;c[f+8>>2]=0;g[a+928>>2]=(1.450071096420288- +g[j>>2])*2.0;g[a+932>>2]=(.9351401925086975-r)*2.0;g[a+936>>2]=(s+-.15748216211795807)/m+.9351401925086975;j=a+940|0;c[j+0>>2]=0;c[j+4>>2]=0;c[j+8>>2]=0;g[a+952>>2]=(.9351401925086975- +g[l>>2])*2.0;l=a+956|0;c[l>>2]=0;c[l+4>>2]=0;m=+Y(+(7916.3173828125/+(c[e>>2]|0)));l=a+968|0;g[l>>2]=m;s=1.0/m;j=a+972|0;g[j>>2]=s;g[a+976>>2]=1.0/((s+.15748216211795807)/m+.9351401925086975);r=m*m;f=a+980|0;g[f>>2]=r;p=50.06380844116211/r;t=a+984|0;g[t>>2]=p;g[a+988>>2]=p+.9351401925086975;g[a+992>>2]=1.0/((s+.7431304454803467)/m+1.450071096420288);p=11.05205249786377/r;u=a+996|0;g[u>>2]=p;g[a+1e3>>2]=p+1.450071096420288;g[a+1004>>2]=1.0/((s+3.189727306365967)/m+4.076781749725342);r=.0017661728197708726/r;v=a+1008|0;g[v>>2]=r;g[a+1012>>2]=r+.000407678191550076;r=+g[o>>2];m=+g[q>>2];g[a+1016>>2]=1.0/((r+.16840487718582153)/m+1.0693583488464355);s=+g[b>>2];g[a+1020>>2]=s+53.53615188598633;g[a+1024>>2]=1.0/((r+.5124786496162415)/m+.6896213889122009);g[a+1028>>2]=s+7.621731281280518;g[a+1032>>2]=1.0/((r+.7824130654335022)/m+.24529150128364563);p=9999999747378752.0e-20/+g[n>>2];g[a+1036>>2]=p;g[a+1040>>2]=p+.0004332271928433329;g[a+1044>>2]=(.24529150128364563-s)*2.0;g[a+1048>>2]=(r+-.7824130654335022)/m+.24529150128364563;n=a+1052|0;c[n+0>>2]=0;c[n+4>>2]=0;c[n+8>>2]=0;g[a+1064>>2]=(.0004332271928433329-p)*2.0;g[a+1068>>2]=(.6896213889122009-s)*2.0;g[a+1072>>2]=(r+-.5124786496162415)/m+.6896213889122009;n=a+1076|0;c[n+0>>2]=0;c[n+4>>2]=0;c[n+8>>2]=0;g[a+1088>>2]=(7.621731281280518-s)*2.0;g[a+1092>>2]=(1.0693583488464355-s)*2.0;g[a+1096>>2]=(r+-.16840487718582153)/m+1.0693583488464355;n=a+1100|0;c[n+0>>2]=0;c[n+4>>2]=0;c[n+8>>2]=0;g[a+1112>>2]=(53.53615188598633-s)*2.0;s=1.0/+g[f>>2];n=a+1116|0;g[n>>2]=s;g[a+1120>>2]=(4.076781749725342-s)*2.0;m=+g[j>>2];r=+g[l>>2];g[a+1124>>2]=(m+-3.189727306365967)/r+4.076781749725342;b=a+1128|0;c[b+0>>2]=0;c[b+4>>2]=0;c[b+8>>2]=0;g[a+1140>>2]=(.000407678191550076- +g[v>>2])*2.0;g[a+1144>>2]=(1.450071096420288-s)*2.0;g[a+1148>>2]=(m+-.7431304454803467)/r+1.450071096420288;v=a+1152|0;c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;g[a+1164>>2]=(1.450071096420288- +g[u>>2])*2.0;g[a+1168>>2]=(.9351401925086975-s)*2.0;g[a+1172>>2]=(m+-.15748216211795807)/r+.9351401925086975;u=a+1176|0;c[u+0>>2]=0;c[u+4>>2]=0;c[u+8>>2]=0;g[a+1188>>2]=(.9351401925086975- +g[t>>2])*2.0;t=a+1192|0;c[t>>2]=0;c[t+4>>2]=0;r=+Y(+(4986.96728515625/+(c[e>>2]|0)));t=a+1204|0;g[t>>2]=r;m=1.0/r;u=a+1208|0;g[u>>2]=m;g[a+1212>>2]=1.0/((m+.15748216211795807)/r+.9351401925086975);s=r*r;v=a+1216|0;g[v>>2]=s;p=50.06380844116211/s;b=a+1220|0;g[b>>2]=p;g[a+1224>>2]=p+.9351401925086975;g[a+1228>>2]=1.0/((m+.7431304454803467)/r+1.450071096420288);p=11.05205249786377/s;q=a+1232|0;g[q>>2]=p;g[a+1236>>2]=p+1.450071096420288;g[a+1240>>2]=1.0/((m+3.189727306365967)/r+4.076781749725342);s=.0017661728197708726/s;o=a+1244|0;g[o>>2]=s;g[a+1248>>2]=s+.000407678191550076;s=+g[j>>2];r=+g[l>>2];g[a+1252>>2]=1.0/((s+.16840487718582153)/r+1.0693583488464355);m=+g[n>>2];g[a+1256>>2]=m+53.53615188598633;g[a+1260>>2]=1.0/((s+.5124786496162415)/r+.6896213889122009);g[a+1264>>2]=m+7.621731281280518;g[a+1268>>2]=1.0/((s+.7824130654335022)/r+.24529150128364563);p=9999999747378752.0e-20/+g[f>>2];g[a+1272>>2]=p;g[a+1276>>2]=p+.0004332271928433329;g[a+1280>>2]=(.24529150128364563-m)*2.0;g[a+1284>>2]=(s+-.7824130654335022)/r+.24529150128364563;f=a+1288|0;c[f+0>>2]=0;c[f+4>>2]=0;c[f+8>>2]=0;g[a+1300>>2]=(.0004332271928433329-p)*2.0;g[a+1304>>2]=(.6896213889122009-m)*2.0;g[a+1308>>2]=(s+-.5124786496162415)/r+.6896213889122009;f=a+1312|0;c[f+0>>2]=0;c[f+4>>2]=0;c[f+8>>2]=0;g[a+1324>>2]=(7.621731281280518-m)*2.0;g[a+1328>>2]=(1.0693583488464355-m)*2.0;g[a+1332>>2]=(s+-.16840487718582153)/r+1.0693583488464355;f=a+1336|0;c[f+0>>2]=0;c[f+4>>2]=0;c[f+8>>2]=0;g[a+1348>>2]=(53.53615188598633-m)*2.0;m=1.0/+g[v>>2];f=a+1352|0;g[f>>2]=m;g[a+1356>>2]=(4.076781749725342-m)*2.0;r=+g[u>>2];s=+g[t>>2];g[a+1360>>2]=(r+-3.189727306365967)/s+4.076781749725342;n=a+1364|0;c[n+0>>2]=0;c[n+4>>2]=0;c[n+8>>2]=0;g[a+1376>>2]=(.000407678191550076- +g[o>>2])*2.0;g[a+1380>>2]=(1.450071096420288-m)*2.0;g[a+1384>>2]=(r+-.7431304454803467)/s+1.450071096420288;o=a+1388|0;c[o+0>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;g[a+1400>>2]=(1.450071096420288- +g[q>>2])*2.0;g[a+1404>>2]=(.9351401925086975-m)*2.0;g[a+1408>>2]=(r+-.15748216211795807)/s+.9351401925086975;q=a+1412|0;c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;g[a+1424>>2]=(.9351401925086975- +g[b>>2])*2.0;b=a+1428|0;c[b>>2]=0;c[b+4>>2]=0;s=+Y(+(3141.5927734375/+(c[e>>2]|0)));b=a+1440|0;g[b>>2]=s;r=1.0/s;q=a+1444|0;g[q>>2]=r;g[a+1448>>2]=1.0/((r+.15748216211795807)/s+.9351401925086975);m=s*s;o=a+1452|0;g[o>>2]=m;p=50.06380844116211/m;n=a+1456|0;g[n>>2]=p;g[a+1460>>2]=p+.9351401925086975;g[a+1464>>2]=1.0/((r+.7431304454803467)/s+1.450071096420288);p=11.05205249786377/m;l=a+1468|0;g[l>>2]=p;g[a+1472>>2]=p+1.450071096420288;g[a+1476>>2]=1.0/((r+3.189727306365967)/s+4.076781749725342);m=.0017661728197708726/m;j=a+1480|0;g[j>>2]=m;g[a+1484>>2]=m+.000407678191550076;m=+g[u>>2];s=+g[t>>2];g[a+1488>>2]=1.0/((m+.16840487718582153)/s+1.0693583488464355);r=+g[f>>2];g[a+1492>>2]=r+53.53615188598633;g[a+1496>>2]=1.0/((m+.5124786496162415)/s+.6896213889122009);g[a+1500>>2]=r+7.621731281280518;g[a+1504>>2]=1.0/((m+.7824130654335022)/s+.24529150128364563);p=9999999747378752.0e-20/+g[v>>2];g[a+1508>>2]=p;g[a+1512>>2]=p+.0004332271928433329;g[a+1516>>2]=(.24529150128364563-r)*2.0;g[a+1520>>2]=(m+-.7824130654335022)/s+.24529150128364563;v=a+1524|0;c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;g[a+1536>>2]=(.0004332271928433329-p)*2.0;g[a+1540>>2]=(.6896213889122009-r)*2.0;g[a+1544>>2]=(m+-.5124786496162415)/s+.6896213889122009;v=a+1548|0;c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;g[a+1560>>2]=(7.621731281280518-r)*2.0;g[a+1564>>2]=(1.0693583488464355-r)*2.0;g[a+1568>>2]=(m+-.16840487718582153)/s+1.0693583488464355;v=a+1572|0;c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;g[a+1584>>2]=(53.53615188598633-r)*2.0;r=1.0/+g[o>>2];v=a+1588|0;g[v>>2]=r;g[a+1592>>2]=(4.076781749725342-r)*2.0;s=+g[q>>2];m=+g[b>>2];g[a+1596>>2]=(s+-3.189727306365967)/m+4.076781749725342;f=a+1600|0;c[f+0>>2]=0;c[f+4>>2]=0;c[f+8>>2]=0;g[a+1612>>2]=(.000407678191550076- +g[j>>2])*2.0;g[a+1616>>2]=(1.450071096420288-r)*2.0;g[a+1620>>2]=(s+-.7431304454803467)/m+1.450071096420288;j=a+1624|0;c[j+0>>2]=0;c[j+4>>2]=0;c[j+8>>2]=0;g[a+1636>>2]=(1.450071096420288- +g[l>>2])*2.0;g[a+1640>>2]=(.9351401925086975-r)*2.0;g[a+1644>>2]=(s+-.15748216211795807)/m+.9351401925086975;l=a+1648|0;c[l+0>>2]=0;c[l+4>>2]=0;c[l+8>>2]=0;g[a+1660>>2]=(.9351401925086975- +g[n>>2])*2.0;n=a+1664|0;c[n>>2]=0;c[n+4>>2]=0;m=+Y(+(1979.079345703125/+(c[e>>2]|0)));n=a+1676|0;g[n>>2]=m;s=1.0/m;l=a+1680|0;g[l>>2]=s;g[a+1684>>2]=1.0/((s+.15748216211795807)/m+.9351401925086975);r=m*m;j=a+1688|0;g[j>>2]=r;p=50.06380844116211/r;f=a+1692|0;g[f>>2]=p;g[a+1696>>2]=p+.9351401925086975;g[a+1700>>2]=1.0/((s+.7431304454803467)/m+1.450071096420288);p=11.05205249786377/r;t=a+1704|0;g[t>>2]=p;g[a+1708>>2]=p+1.450071096420288;g[a+1712>>2]=1.0/((s+3.189727306365967)/m+4.076781749725342);r=.0017661728197708726/r;u=a+1716|0;g[u>>2]=r;g[a+1720>>2]=r+.000407678191550076;r=+g[q>>2];m=+g[b>>2];g[a+1724>>2]=1.0/((r+.16840487718582153)/m+1.0693583488464355);s=+g[v>>2];g[a+1728>>2]=s+53.53615188598633;g[a+1732>>2]=1.0/((r+.5124786496162415)/m+.6896213889122009);g[a+1736>>2]=s+7.621731281280518;g[a+1740>>2]=1.0/((r+.7824130654335022)/m+.24529150128364563);p=9999999747378752.0e-20/+g[o>>2];g[a+1744>>2]=p;g[a+1748>>2]=p+.0004332271928433329;g[a+1752>>2]=(.24529150128364563-s)*2.0;g[a+1756>>2]=(r+-.7824130654335022)/m+.24529150128364563;o=a+1760|0;c[o+0>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;g[a+1772>>2]=(.0004332271928433329-p)*2.0;g[a+1776>>2]=(.6896213889122009-s)*2.0;g[a+1780>>2]=(r+-.5124786496162415)/m+.6896213889122009;o=a+1784|0;c[o+0>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;g[a+1796>>2]=(7.621731281280518-s)*2.0;g[a+1800>>2]=(1.0693583488464355-s)*2.0;g[a+1804>>2]=(r+-.16840487718582153)/m+1.0693583488464355;o=a+1808|0;c[o+0>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;g[a+1820>>2]=(53.53615188598633-s)*2.0;s=1.0/+g[j>>2];o=a+1824|0;g[o>>2]=s;g[a+1828>>2]=(4.076781749725342-s)*2.0;m=+g[l>>2];r=+g[n>>2];g[a+1832>>2]=(m+-3.189727306365967)/r+4.076781749725342;v=a+1836|0;c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;g[a+1848>>2]=(.000407678191550076- +g[u>>2])*2.0;g[a+1852>>2]=(1.450071096420288-s)*2.0;g[a+1856>>2]=(m+-.7431304454803467)/r+1.450071096420288;u=a+1860|0;c[u+0>>2]=0;c[u+4>>2]=0;c[u+8>>2]=0;g[a+1872>>2]=(1.450071096420288- +g[t>>2])*2.0;g[a+1876>>2]=(.9351401925086975-s)*2.0;g[a+1880>>2]=(m+-.15748216211795807)/r+.9351401925086975;t=a+1884|0;c[t+0>>2]=0;c[t+4>>2]=0;c[t+8>>2]=0;g[a+1896>>2]=(.9351401925086975- +g[f>>2])*2.0;f=a+1900|0;c[f>>2]=0;c[f+4>>2]=0;r=+Y(+(1246.7418212890625/+(c[e>>2]|0)));f=a+1912|0;g[f>>2]=r;m=1.0/r;t=a+1916|0;g[t>>2]=m;g[a+1920>>2]=1.0/((m+.15748216211795807)/r+.9351401925086975);s=r*r;u=a+1924|0;g[u>>2]=s;p=50.06380844116211/s;v=a+1928|0;g[v>>2]=p;g[a+1932>>2]=p+.9351401925086975;g[a+1936>>2]=1.0/((m+.7431304454803467)/r+1.450071096420288);p=11.05205249786377/s;b=a+1940|0;g[b>>2]=p;g[a+1944>>2]=p+1.450071096420288;g[a+1948>>2]=1.0/((m+3.189727306365967)/r+4.076781749725342);s=.0017661728197708726/s;q=a+1952|0;g[q>>2]=s;g[a+1956>>2]=s+.000407678191550076;s=+g[l>>2];r=+g[n>>2];g[a+1960>>2]=1.0/((s+.16840487718582153)/r+1.0693583488464355);m=+g[o>>2];g[a+1964>>2]=m+53.53615188598633;g[a+1968>>2]=1.0/((s+.5124786496162415)/r+.6896213889122009);g[a+1972>>2]=m+7.621731281280518;g[a+1976>>2]=1.0/((s+.7824130654335022)/r+.24529150128364563);p=9999999747378752.0e-20/+g[j>>2];g[a+1980>>2]=p;g[a+1984>>2]=p+.0004332271928433329;g[a+1988>>2]=(.24529150128364563-m)*2.0;g[a+1992>>2]=(s+-.7824130654335022)/r+.24529150128364563;j=a+1996|0;c[j+0>>2]=0;c[j+4>>2]=0;c[j+8>>2]=0;g[a+2008>>2]=(.0004332271928433329-p)*2.0;g[a+2012>>2]=(.6896213889122009-m)*2.0;g[a+2016>>2]=(s+-.5124786496162415)/r+.6896213889122009;j=a+2020|0;c[j+0>>2]=0;c[j+4>>2]=0;c[j+8>>2]=0;g[a+2032>>2]=(7.621731281280518-m)*2.0;g[a+2036>>2]=(1.0693583488464355-m)*2.0;g[a+2040>>2]=(s+-.16840487718582153)/r+1.0693583488464355;j=a+2044|0;c[j+0>>2]=0;c[j+4>>2]=0;c[j+8>>2]=0;g[a+2056>>2]=(53.53615188598633-m)*2.0;m=1.0/+g[u>>2];j=a+2060|0;g[j>>2]=m;g[a+2064>>2]=(4.076781749725342-m)*2.0;r=+g[t>>2];s=+g[f>>2];g[a+2068>>2]=(r+-3.189727306365967)/s+4.076781749725342;o=a+2072|0;c[o+0>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;g[a+2084>>2]=(.000407678191550076- +g[q>>2])*2.0;g[a+2088>>2]=(1.450071096420288-m)*2.0;g[a+2092>>2]=(r+-.7431304454803467)/s+1.450071096420288;q=a+2096|0;c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;g[a+2108>>2]=(1.450071096420288- +g[b>>2])*2.0;g[a+2112>>2]=(.9351401925086975-m)*2.0;g[a+2116>>2]=(r+-.15748216211795807)/s+.9351401925086975;b=a+2120|0;c[b+0>>2]=0;c[b+4>>2]=0;c[b+8>>2]=0;g[a+2132>>2]=(.9351401925086975- +g[v>>2])*2.0;v=a+2136|0;c[v>>2]=0;c[v+4>>2]=0;s=+Y(+(785.398193359375/+(c[e>>2]|0)));v=a+2148|0;g[v>>2]=s;r=1.0/s;b=a+2152|0;g[b>>2]=r;g[a+2156>>2]=1.0/((r+.15748216211795807)/s+.9351401925086975);m=s*s;q=a+2160|0;g[q>>2]=m;p=50.06380844116211/m;o=a+2164|0;g[o>>2]=p;g[a+2168>>2]=p+.9351401925086975;g[a+2172>>2]=1.0/((r+.7431304454803467)/s+1.450071096420288);p=11.05205249786377/m;n=a+2176|0;g[n>>2]=p;g[a+2180>>2]=p+1.450071096420288;g[a+2184>>2]=1.0/((r+3.189727306365967)/s+4.076781749725342);m=.0017661728197708726/m;l=a+2188|0;g[l>>2]=m;g[a+2192>>2]=m+.000407678191550076;m=+g[t>>2];s=+g[f>>2];g[a+2196>>2]=1.0/((m+.16840487718582153)/s+1.0693583488464355);r=+g[j>>2];g[a+2200>>2]=r+53.53615188598633;g[a+2204>>2]=1.0/((m+.5124786496162415)/s+.6896213889122009);g[a+2208>>2]=r+7.621731281280518;g[a+2212>>2]=1.0/((m+.7824130654335022)/s+.24529150128364563);p=9999999747378752.0e-20/+g[u>>2];g[a+2216>>2]=p;g[a+2220>>2]=p+.0004332271928433329;g[a+2224>>2]=(.24529150128364563-r)*2.0;g[a+2228>>2]=(m+-.7824130654335022)/s+.24529150128364563;u=a+2232|0;c[u+0>>2]=0;c[u+4>>2]=0;c[u+8>>2]=0;g[a+2244>>2]=(.0004332271928433329-p)*2.0;g[a+2248>>2]=(.6896213889122009-r)*2.0;g[a+2252>>2]=(m+-.5124786496162415)/s+.6896213889122009;u=a+2256|0;c[u+0>>2]=0;c[u+4>>2]=0;c[u+8>>2]=0;g[a+2268>>2]=(7.621731281280518-r)*2.0;g[a+2272>>2]=(1.0693583488464355-r)*2.0;g[a+2276>>2]=(m+-.16840487718582153)/s+1.0693583488464355;u=a+2280|0;c[u+0>>2]=0;c[u+4>>2]=0;c[u+8>>2]=0;g[a+2292>>2]=(53.53615188598633-r)*2.0;r=1.0/+g[q>>2];u=a+2296|0;g[u>>2]=r;g[a+2300>>2]=(4.076781749725342-r)*2.0;s=+g[b>>2];m=+g[v>>2];g[a+2304>>2]=(s+-3.189727306365967)/m+4.076781749725342;j=a+2308|0;c[j+0>>2]=0;c[j+4>>2]=0;c[j+8>>2]=0;g[a+2320>>2]=(.000407678191550076- +g[l>>2])*2.0;g[a+2324>>2]=(1.450071096420288-r)*2.0;g[a+2328>>2]=(s+-.7431304454803467)/m+1.450071096420288;l=a+2332|0;c[l+0>>2]=0;c[l+4>>2]=0;c[l+8>>2]=0;g[a+2344>>2]=(1.450071096420288- +g[n>>2])*2.0;g[a+2348>>2]=(.9351401925086975-r)*2.0;g[a+2352>>2]=(s+-.15748216211795807)/m+.9351401925086975;n=a+2356|0;c[n+0>>2]=0;c[n+4>>2]=0;c[n+8>>2]=0;g[a+2368>>2]=(.9351401925086975- +g[o>>2])*2.0;o=a+2372|0;c[o>>2]=0;c[o+4>>2]=0;m=+Y(+(494.76983642578125/+(c[e>>2]|0)));o=a+2384|0;g[o>>2]=m;s=1.0/m;n=a+2388|0;g[n>>2]=s;g[a+2392>>2]=1.0/((s+.15748216211795807)/m+.9351401925086975);r=m*m;l=a+2396|0;g[l>>2]=r;p=50.06380844116211/r;j=a+2400|0;g[j>>2]=p;g[a+2404>>2]=p+.9351401925086975;g[a+2408>>2]=1.0/((s+.7431304454803467)/m+1.450071096420288);p=11.05205249786377/r;f=a+2412|0;g[f>>2]=p;g[a+2416>>2]=p+1.450071096420288;g[a+2420>>2]=1.0/((s+3.189727306365967)/m+4.076781749725342);r=.0017661728197708726/r;t=a+2424|0;g[t>>2]=r;g[a+2428>>2]=r+.000407678191550076;r=+g[b>>2];m=+g[v>>2];g[a+2432>>2]=1.0/((r+.16840487718582153)/m+1.0693583488464355);s=+g[u>>2];g[a+2436>>2]=s+53.53615188598633;g[a+2440>>2]=1.0/((r+.5124786496162415)/m+.6896213889122009);g[a+2444>>2]=s+7.621731281280518;g[a+2448>>2]=1.0/((r+.7824130654335022)/m+.24529150128364563);p=9999999747378752.0e-20/+g[q>>2];g[a+2452>>2]=p;g[a+2456>>2]=p+.0004332271928433329;g[a+2460>>2]=(.24529150128364563-s)*2.0;g[a+2464>>2]=(r+-.7824130654335022)/m+.24529150128364563;q=a+2468|0;c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;g[a+2480>>2]=(.0004332271928433329-p)*2.0;g[a+2484>>2]=(.6896213889122009-s)*2.0;g[a+2488>>2]=(r+-.5124786496162415)/m+.6896213889122009;q=a+2492|0;c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;g[a+2504>>2]=(7.621731281280518-s)*2.0;g[a+2508>>2]=(1.0693583488464355-s)*2.0;g[a+2512>>2]=(r+-.16840487718582153)/m+1.0693583488464355;q=a+2516|0;c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;g[a+2528>>2]=(53.53615188598633-s)*2.0;s=1.0/+g[l>>2];q=a+2532|0;g[q>>2]=s;g[a+2536>>2]=(4.076781749725342-s)*2.0;m=+g[n>>2];r=+g[o>>2];g[a+2540>>2]=(m+-3.189727306365967)/r+4.076781749725342;u=a+2544|0;c[u+0>>2]=0;c[u+4>>2]=0;c[u+8>>2]=0;g[a+2556>>2]=(.000407678191550076- +g[t>>2])*2.0;g[a+2560>>2]=(1.450071096420288-s)*2.0;g[a+2564>>2]=(m+-.7431304454803467)/r+1.450071096420288;t=a+2568|0;c[t+0>>2]=0;c[t+4>>2]=0;c[t+8>>2]=0;g[a+2580>>2]=(1.450071096420288- +g[f>>2])*2.0;g[a+2584>>2]=(.9351401925086975-s)*2.0;g[a+2588>>2]=(m+-.15748216211795807)/r+.9351401925086975;f=a+2592|0;c[f+0>>2]=0;c[f+4>>2]=0;c[f+8>>2]=0;g[a+2604>>2]=(.9351401925086975- +g[j>>2])*2.0;j=a+2608|0;c[j>>2]=0;c[j+4>>2]=0;r=+Y(+(311.6854553222656/+(c[e>>2]|0)));j=a+2620|0;g[j>>2]=r;m=1.0/r;f=a+2624|0;g[f>>2]=m;g[a+2628>>2]=1.0/((m+.15748216211795807)/r+.9351401925086975);s=r*r;t=a+2632|0;g[t>>2]=s;p=50.06380844116211/s;u=a+2636|0;g[u>>2]=p;g[a+2640>>2]=p+.9351401925086975;g[a+2644>>2]=1.0/((m+.7431304454803467)/r+1.450071096420288);p=11.05205249786377/s;v=a+2648|0;g[v>>2]=p;g[a+2652>>2]=p+1.450071096420288;g[a+2656>>2]=1.0/((m+3.189727306365967)/r+4.076781749725342);s=.0017661728197708726/s;b=a+2660|0;g[b>>2]=s;g[a+2664>>2]=s+.000407678191550076;s=+g[n>>2];r=+g[o>>2];g[a+2668>>2]=1.0/((s+.16840487718582153)/r+1.0693583488464355);m=+g[q>>2];g[a+2672>>2]=m+53.53615188598633;g[a+2676>>2]=1.0/((s+.5124786496162415)/r+.6896213889122009);g[a+2680>>2]=m+7.621731281280518;g[a+2684>>2]=1.0/((s+.7824130654335022)/r+.24529150128364563);p=9999999747378752.0e-20/+g[l>>2];g[a+2688>>2]=p;g[a+2692>>2]=p+.0004332271928433329;g[a+2696>>2]=(.24529150128364563-m)*2.0;g[a+2700>>2]=(s+-.7824130654335022)/r+.24529150128364563;l=a+2704|0;c[l+0>>2]=0;c[l+4>>2]=0;c[l+8>>2]=0;g[a+2716>>2]=(.0004332271928433329-p)*2.0;g[a+2720>>2]=(.6896213889122009-m)*2.0;g[a+2724>>2]=(s+-.5124786496162415)/r+.6896213889122009;l=a+2728|0;c[l+0>>2]=0;c[l+4>>2]=0;c[l+8>>2]=0;g[a+2740>>2]=(7.621731281280518-m)*2.0;g[a+2744>>2]=(1.0693583488464355-m)*2.0;g[a+2748>>2]=(s+-.16840487718582153)/r+1.0693583488464355;l=a+2752|0;c[l+0>>2]=0;c[l+4>>2]=0;c[l+8>>2]=0;g[a+2764>>2]=(53.53615188598633-m)*2.0;m=1.0/+g[t>>2];l=a+2768|0;g[l>>2]=m;g[a+2772>>2]=(4.076781749725342-m)*2.0;r=+g[f>>2];s=+g[j>>2];g[a+2776>>2]=(r+-3.189727306365967)/s+4.076781749725342;q=a+2780|0;c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;g[a+2792>>2]=(.000407678191550076- +g[b>>2])*2.0;g[a+2796>>2]=(1.450071096420288-m)*2.0;g[a+2800>>2]=(r+-.7431304454803467)/s+1.450071096420288;b=a+2804|0;c[b+0>>2]=0;c[b+4>>2]=0;c[b+8>>2]=0;g[a+2816>>2]=(1.450071096420288- +g[v>>2])*2.0;g[a+2820>>2]=(.9351401925086975-m)*2.0;g[a+2824>>2]=(r+-.15748216211795807)/s+.9351401925086975;v=a+2828|0;c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;g[a+2840>>2]=(.9351401925086975- +g[u>>2])*2.0;u=a+2844|0;c[u>>2]=0;c[u+4>>2]=0;s=+Y(+(196.34954833984375/+(c[e>>2]|0)));u=a+2856|0;g[u>>2]=s;r=1.0/s;v=a+2860|0;g[v>>2]=r;g[a+2864>>2]=1.0/((r+.15748216211795807)/s+.9351401925086975);m=s*s;b=a+2868|0;g[b>>2]=m;p=50.06380844116211/m;q=a+2872|0;g[q>>2]=p;g[a+2876>>2]=p+.9351401925086975;g[a+2880>>2]=1.0/((r+.7431304454803467)/s+1.450071096420288);p=11.05205249786377/m;o=a+2884|0;g[o>>2]=p;g[a+2888>>2]=p+1.450071096420288;g[a+2892>>2]=1.0/((r+3.189727306365967)/s+4.076781749725342);m=.0017661728197708726/m;n=a+2896|0;g[n>>2]=m;g[a+2900>>2]=m+.000407678191550076;m=+g[f>>2];s=+g[j>>2];g[a+2904>>2]=1.0/((m+.16840487718582153)/s+1.0693583488464355);r=+g[l>>2];g[a+2908>>2]=r+53.53615188598633;g[a+2912>>2]=1.0/((m+.5124786496162415)/s+.6896213889122009);g[a+2916>>2]=r+7.621731281280518;g[a+2920>>2]=1.0/((m+.7824130654335022)/s+.24529150128364563);p=9999999747378752.0e-20/+g[t>>2];g[a+2924>>2]=p;g[a+2928>>2]=p+.0004332271928433329;g[a+2932>>2]=(.24529150128364563-r)*2.0;g[a+2936>>2]=(m+-.7824130654335022)/s+.24529150128364563;t=a+2940|0;c[t+0>>2]=0;c[t+4>>2]=0;c[t+8>>2]=0;g[a+2952>>2]=(.0004332271928433329-p)*2.0;g[a+2956>>2]=(.6896213889122009-r)*2.0;g[a+2960>>2]=(m+-.5124786496162415)/s+.6896213889122009;t=a+2964|0;c[t+0>>2]=0;c[t+4>>2]=0;c[t+8>>2]=0;g[a+2976>>2]=(7.621731281280518-r)*2.0;g[a+2980>>2]=(1.0693583488464355-r)*2.0;g[a+2984>>2]=(m+-.16840487718582153)/s+1.0693583488464355;t=a+2988|0;c[t+0>>2]=0;c[t+4>>2]=0;c[t+8>>2]=0;g[a+3e3>>2]=(53.53615188598633-r)*2.0;r=1.0/+g[b>>2];t=a+3004|0;g[t>>2]=r;g[a+3008>>2]=(4.076781749725342-r)*2.0;s=+g[v>>2];m=+g[u>>2];g[a+3012>>2]=(s+-3.189727306365967)/m+4.076781749725342;l=a+3016|0;c[l+0>>2]=0;c[l+4>>2]=0;c[l+8>>2]=0;g[a+3028>>2]=(.000407678191550076- +g[n>>2])*2.0;g[a+3032>>2]=(1.450071096420288-r)*2.0;g[a+3036>>2]=(s+-.7431304454803467)/m+1.450071096420288;n=a+3040|0;c[n+0>>2]=0;c[n+4>>2]=0;c[n+8>>2]=0;g[a+3052>>2]=(1.450071096420288- +g[o>>2])*2.0;g[a+3056>>2]=(.9351401925086975-r)*2.0;g[a+3060>>2]=(s+-.15748216211795807)/m+.9351401925086975;o=a+3064|0;c[o+0>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;g[a+3076>>2]=(.9351401925086975- +g[q>>2])*2.0;q=a+3080|0;c[q>>2]=0;c[q+4>>2]=0;m=+Y(+(123.69245910644531/+(c[e>>2]|0)));q=a+3092|0;g[q>>2]=m;s=1.0/m;o=a+3096|0;g[o>>2]=s;g[a+3100>>2]=1.0/((s+.15748216211795807)/m+.9351401925086975);r=m*m;n=a+3104|0;g[n>>2]=r;p=50.06380844116211/r;l=a+3108|0;g[l>>2]=p;g[a+3112>>2]=p+.9351401925086975;g[a+3116>>2]=1.0/((s+.7431304454803467)/m+1.450071096420288);p=11.05205249786377/r;j=a+3120|0;g[j>>2]=p;g[a+3124>>2]=p+1.450071096420288;g[a+3128>>2]=1.0/((s+3.189727306365967)/m+4.076781749725342);r=.0017661728197708726/r;f=a+3132|0;g[f>>2]=r;g[a+3136>>2]=r+.000407678191550076;r=+g[v>>2];m=+g[u>>2];g[a+3140>>2]=1.0/((r+.16840487718582153)/m+1.0693583488464355);s=+g[t>>2];g[a+3144>>2]=s+53.53615188598633;g[a+3148>>2]=1.0/((r+.5124786496162415)/m+.6896213889122009);g[a+3152>>2]=s+7.621731281280518;g[a+3156>>2]=1.0/((r+.7824130654335022)/m+.24529150128364563);p=9999999747378752.0e-20/+g[b>>2];g[a+3160>>2]=p;g[a+3164>>2]=p+.0004332271928433329;g[a+3168>>2]=(.24529150128364563-s)*2.0;g[a+3172>>2]=(r+-.7824130654335022)/m+.24529150128364563;e=a+3176|0;c[e+0>>2]=0;c[e+4>>2]=0;c[e+8>>2]=0;g[a+3188>>2]=(.0004332271928433329-p)*2.0;g[a+3192>>2]=(.6896213889122009-s)*2.0;g[a+3196>>2]=(r+-.5124786496162415)/m+.6896213889122009;e=a+3200|0;c[e+0>>2]=0;c[e+4>>2]=0;c[e+8>>2]=0;g[a+3212>>2]=(7.621731281280518-s)*2.0;g[a+3216>>2]=(1.0693583488464355-s)*2.0;g[a+3220>>2]=(r+-.16840487718582153)/m+1.0693583488464355;e=a+3224|0;c[e+0>>2]=0;c[e+4>>2]=0;c[e+8>>2]=0;g[a+3236>>2]=(53.53615188598633-s)*2.0;s=+g[n>>2];m=1.0/s;n=a+3240|0;g[n>>2]=m;g[a+3244>>2]=(4.076781749725342-m)*2.0;r=+g[o>>2];p=+g[q>>2];g[a+3248>>2]=(r+-3.189727306365967)/p+4.076781749725342;e=a+3252|0;c[e+0>>2]=0;c[e+4>>2]=0;c[e+8>>2]=0;g[a+3264>>2]=(.000407678191550076- +g[f>>2])*2.0;g[a+3268>>2]=(1.450071096420288-m)*2.0;g[a+3272>>2]=(r+-.7431304454803467)/p+1.450071096420288;f=a+3276|0;c[f+0>>2]=0;c[f+4>>2]=0;c[f+8>>2]=0;g[a+3288>>2]=(1.450071096420288- +g[j>>2])*2.0;g[a+3292>>2]=(.9351401925086975-m)*2.0;g[a+3296>>2]=(r+-.15748216211795807)/p+.9351401925086975;j=a+3300|0;c[j+0>>2]=0;c[j+4>>2]=0;c[j+8>>2]=0;g[a+3312>>2]=(.9351401925086975- +g[l>>2])*2.0;l=a+3316|0;c[l>>2]=0;c[l+4>>2]=0;g[a+3328>>2]=1.0/((r+.16840487718582153)/p+1.0693583488464355);g[a+3332>>2]=m+53.53615188598633;g[a+3336>>2]=1.0/((r+.5124786496162415)/p+.6896213889122009);g[a+3340>>2]=m+7.621731281280518;g[a+3344>>2]=1.0/((r+.7824130654335022)/p+.24529150128364563);s=9999999747378752.0e-20/s;g[a+3348>>2]=s;g[a+3352>>2]=s+.0004332271928433329;g[a+3356>>2]=(.24529150128364563-m)*2.0;g[a+3360>>2]=(r+-.7824130654335022)/p+.24529150128364563;l=a+3364|0;c[l+0>>2]=0;c[l+4>>2]=0;c[l+8>>2]=0;g[a+3376>>2]=(.0004332271928433329-s)*2.0;s=+g[n>>2];g[a+3380>>2]=(.6896213889122009-s)*2.0;p=+g[o>>2];r=+g[q>>2];g[a+3384>>2]=(p+-.5124786496162415)/r+.6896213889122009;q=a+3388|0;c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;g[a+3400>>2]=(7.621731281280518-s)*2.0;g[a+3404>>2]=(1.0693583488464355-s)*2.0;g[a+3408>>2]=(p+-.16840487718582153)/r+1.0693583488464355;q=a+3412|0;c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;g[a+3424>>2]=(53.53615188598633-s)*2.0;q=a+3428|0;c[q>>2]=0;c[q+4>>2]=0;i=d;return}function Ad(a){a=a|0;Na(a|0)|0;Ga()}function Bd(b){b=b|0;var d=0,e=0,f=0,g=0,h=0;b=i;i=i+16|0;e=b;g=c[r>>2]|0;Xd(1976,g,2032);c[316]=3404;c[1272>>2]=3424;c[1268>>2]=0;_e(1272|0,1976);c[1344>>2]=0;c[1348>>2]=-1;f=c[s>>2]|0;c[520]=3272;ck(2084|0);c[2088>>2]=0;c[2092>>2]=0;c[2096>>2]=0;c[2100>>2]=0;c[2104>>2]=0;c[2108>>2]=0;c[520]=2592;c[2112>>2]=f;dk(e,2084|0);d=fk(e,6064)|0;ek(e);c[2116>>2]=d;c[2120>>2]=2040;a[2124|0]=(sc[c[(c[d>>2]|0)+28>>2]&127](d)|0)&1;c[338]=3484;c[1356>>2]=3504;_e(1356|0,2080);c[1428>>2]=0;c[1432>>2]=-1;d=c[q>>2]|0;c[532]=3272;ck(2132|0);c[2136>>2]=0;c[2140>>2]=0;c[2144>>2]=0;c[2148>>2]=0;c[2152>>2]=0;c[2156>>2]=0;c[532]=2592;c[2160>>2]=d;dk(e,2132|0);h=fk(e,6064)|0;ek(e);c[2164>>2]=h;c[2168>>2]=2048;a[2172|0]=(sc[c[(c[h>>2]|0)+28>>2]&127](h)|0)&1;c[360]=3484;c[1444>>2]=3504;_e(1444|0,2128);c[1516>>2]=0;c[1520>>2]=-1;h=c[(c[(c[360]|0)+ -12>>2]|0)+1464>>2]|0;c[382]=3484;c[1532>>2]=3504;_e(1532|0,h);c[1604>>2]=0;c[1608>>2]=-1;c[(c[(c[316]|0)+ -12>>2]|0)+1336>>2]=1352;h=(c[(c[360]|0)+ -12>>2]|0)+1444|0;c[h>>2]=c[h>>2]|8192;c[(c[(c[360]|0)+ -12>>2]|0)+1512>>2]=1352;Jd(2176,g,2056|0);c[404]=3444;c[1624>>2]=3464;c[1620>>2]=0;_e(1624|0,2176);c[1696>>2]=0;c[1700>>2]=-1;c[558]=3336;ck(2236|0);c[2240>>2]=0;c[2244>>2]=0;c[2248>>2]=0;c[2252>>2]=0;c[2256>>2]=0;c[2260>>2]=0;c[558]=2336;c[2264>>2]=f;dk(e,2236|0);f=fk(e,6072)|0;ek(e);c[2268>>2]=f;c[2272>>2]=2064;a[2276|0]=(sc[c[(c[f>>2]|0)+28>>2]&127](f)|0)&1;c[426]=3524;c[1708>>2]=3544;_e(1708|0,2232);c[1780>>2]=0;c[1784>>2]=-1;c[570]=3336;ck(2284|0);c[2288>>2]=0;c[2292>>2]=0;c[2296>>2]=0;c[2300>>2]=0;c[2304>>2]=0;c[2308>>2]=0;c[570]=2336;c[2312>>2]=d;dk(e,2284|0);d=fk(e,6072)|0;ek(e);c[2316>>2]=d;c[2320>>2]=2072;a[2324|0]=(sc[c[(c[d>>2]|0)+28>>2]&127](d)|0)&1;c[448]=3524;c[1796>>2]=3544;_e(1796|0,2280);c[1868>>2]=0;c[1872>>2]=-1;d=c[(c[(c[448]|0)+ -12>>2]|0)+1816>>2]|0;c[470]=3524;c[1884>>2]=3544;_e(1884|0,d);c[1956>>2]=0;c[1960>>2]=-1;c[(c[(c[404]|0)+ -12>>2]|0)+1688>>2]=1704;d=(c[(c[448]|0)+ -12>>2]|0)+1796|0;c[d>>2]=c[d>>2]|8192;c[(c[(c[448]|0)+ -12>>2]|0)+1864>>2]=1704;i=b;return}function Cd(a){a=a|0;a=i;Gf(1352)|0;Gf(1528)|0;Lf(1704)|0;Lf(1880)|0;i=a;return}function Dd(a){a=a|0;var b=0;b=i;c[a>>2]=3336;ek(a+4|0);i=b;return}function Ed(a){a=a|0;var b=0;b=i;c[a>>2]=3336;ek(a+4|0);Ym(a);i=b;return}function Fd(b,d){b=b|0;d=d|0;var e=0;e=i;sc[c[(c[b>>2]|0)+24>>2]&127](b)|0;d=fk(d,6072)|0;c[b+36>>2]=d;a[b+44|0]=(sc[c[(c[d>>2]|0)+28>>2]&127](d)|0)&1;i=e;return}function Gd(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0;b=i;i=i+16|0;g=b+8|0;d=b;e=a+36|0;f=a+40|0;h=g+8|0;j=g;a=a+32|0;while(1){k=c[e>>2]|0;k=Cc[c[(c[k>>2]|0)+20>>2]&15](k,c[f>>2]|0,g,h,d)|0;l=(c[d>>2]|0)-j|0;if((qb(g|0,1,l|0,c[a>>2]|0)|0)!=(l|0)){e=-1;d=5;break}if((k|0)==2){e=-1;d=5;break}else if((k|0)!=1){d=4;break}}if((d|0)==4){l=((Tb(c[a>>2]|0)|0)!=0)<<31>>31;i=b;return l|0}else if((d|0)==5){i=b;return e|0}return 0}function Hd(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0;f=i;a:do{if((a[b+44|0]|0)==0){if((e|0)>0){g=0;while(1){if((Bc[c[(c[b>>2]|0)+52>>2]&15](b,c[d>>2]|0)|0)==-1){break a}g=g+1|0;if((g|0)<(e|0)){d=d+4|0}else{break}}}else{g=0}}else{g=qb(d|0,4,e|0,c[b+32>>2]|0)|0}}while(0);i=f;return g|0}function Id(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;e=i;i=i+32|0;j=e+16|0;p=e+8|0;h=e+4|0;k=e;f=(d|0)==-1;a:do{if(!f){c[p>>2]=d;if((a[b+44|0]|0)!=0){if((qb(p|0,4,1,c[b+32>>2]|0)|0)==1){break}else{d=-1}i=e;return d|0}c[h>>2]=j;l=p+4|0;n=b+36|0;o=b+40|0;g=j+8|0;m=j;b=b+32|0;while(1){q=c[n>>2]|0;q=xc[c[(c[q>>2]|0)+12>>2]&15](q,c[o>>2]|0,p,l,k,j,g,h)|0;if((c[k>>2]|0)==(p|0)){d=-1;g=12;break}if((q|0)==3){g=7;break}r=(q|0)==1;if(!(q>>>0<2)){d=-1;g=12;break}q=(c[h>>2]|0)-m|0;if((qb(j|0,1,q|0,c[b>>2]|0)|0)!=(q|0)){d=-1;g=12;break}if(r){p=r?c[k>>2]|0:p}else{break a}}if((g|0)==7){if((qb(p|0,1,1,c[b>>2]|0)|0)==1){break}else{d=-1}i=e;return d|0}else if((g|0)==12){i=e;return d|0}}}while(0);r=f?0:d;i=e;return r|0}function Jd(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0;f=i;i=i+16|0;g=f;c[b>>2]=3336;h=b+4|0;ck(h);j=b+8|0;c[j+0>>2]=0;c[j+4>>2]=0;c[j+8>>2]=0;c[j+12>>2]=0;c[j+16>>2]=0;c[j+20>>2]=0;c[b>>2]=2448;c[b+32>>2]=d;c[b+40>>2]=e;c[b+48>>2]=-1;a[b+52|0]=0;dk(g,h);h=fk(g,6072)|0;e=b+36|0;c[e>>2]=h;d=b+44|0;c[d>>2]=sc[c[(c[h>>2]|0)+24>>2]&127](h)|0;e=c[e>>2]|0;a[b+53|0]=(sc[c[(c[e>>2]|0)+28>>2]&127](e)|0)&1;if((c[d>>2]|0)>8){pj(2544)}else{ek(g);i=f;return}}function Kd(a){a=a|0;var b=0;b=i;c[a>>2]=3336;ek(a+4|0);i=b;return}function Ld(a){a=a|0;var b=0;b=i;c[a>>2]=3336;ek(a+4|0);Ym(a);i=b;return}function Md(b,d){b=b|0;d=d|0;var e=0,f=0,g=0;e=i;g=fk(d,6072)|0;f=b+36|0;c[f>>2]=g;d=b+44|0;c[d>>2]=sc[c[(c[g>>2]|0)+24>>2]&127](g)|0;f=c[f>>2]|0;a[b+53|0]=(sc[c[(c[f>>2]|0)+28>>2]&127](f)|0)&1;if((c[d>>2]|0)>8){pj(2544)}else{i=e;return}}function Nd(a){a=a|0;var b=0;b=i;a=Qd(a,0)|0;i=b;return a|0}function Od(a){a=a|0;var b=0;b=i;a=Qd(a,1)|0;i=b;return a|0}function Pd(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0;e=i;i=i+32|0;j=e+16|0;f=e+8|0;l=e+4|0;k=e;g=b+52|0;m=(a[g]|0)!=0;if((d|0)==-1){if(m){m=-1;i=e;return m|0}m=c[b+48>>2]|0;a[g]=(m|0)!=-1|0;i=e;return m|0}h=b+48|0;a:do{if(m){c[l>>2]=c[h>>2];m=c[b+36>>2]|0;k=xc[c[(c[m>>2]|0)+12>>2]&15](m,c[b+40>>2]|0,l,l+4|0,k,j,j+8|0,f)|0;if((k|0)==1|(k|0)==2){m=-1;i=e;return m|0}else if((k|0)==3){a[j]=c[h>>2];c[f>>2]=j+1}b=b+32|0;while(1){k=c[f>>2]|0;if(!(k>>>0>j>>>0)){break a}m=k+ -1|0;c[f>>2]=m;if((Sb(a[m]|0,c[b>>2]|0)|0)==-1){f=-1;break}}i=e;return f|0}}while(0);c[h>>2]=d;a[g]=1;m=d;i=e;return m|0}function Qd(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;e=i;i=i+32|0;g=e+16|0;j=e+8|0;m=e+4|0;l=e;n=b+52|0;if((a[n]|0)!=0){f=b+48|0;g=c[f>>2]|0;if(!d){v=g;i=e;return v|0}c[f>>2]=-1;a[n]=0;v=g;i=e;return v|0}n=c[b+44>>2]|0;s=(n|0)>1?n:1;a:do{if((s|0)>0){n=b+32|0;o=0;while(1){p=Lb(c[n>>2]|0)|0;if((p|0)==-1){f=-1;break}a[g+o|0]=p;o=o+1|0;if((o|0)>=(s|0)){break a}}i=e;return f|0}}while(0);b:do{if((a[b+53|0]|0)==0){p=b+40|0;o=b+36|0;n=j+4|0;q=b+32|0;while(1){v=c[p>>2]|0;u=v;t=c[u>>2]|0;u=c[u+4>>2]|0;w=c[o>>2]|0;r=g+s|0;v=xc[c[(c[w>>2]|0)+16>>2]&15](w,v,g,r,m,j,n,l)|0;if((v|0)==2){f=-1;h=22;break}else if((v|0)==3){h=14;break}else if((v|0)!=1){k=s;break b}w=c[p>>2]|0;c[w>>2]=t;c[w+4>>2]=u;if((s|0)==8){f=-1;h=22;break}t=Lb(c[q>>2]|0)|0;if((t|0)==-1){f=-1;h=22;break}a[r]=t;s=s+1|0}if((h|0)==14){c[j>>2]=a[g]|0;k=s;break}else if((h|0)==22){i=e;return f|0}}else{c[j>>2]=a[g]|0;k=s}}while(0);if(d){w=c[j>>2]|0;c[b+48>>2]=w;i=e;return w|0}d=b+32|0;while(1){if((k|0)<=0){break}k=k+ -1|0;if((Sb(a[g+k|0]|0,c[d>>2]|0)|0)==-1){f=-1;h=22;break}}if((h|0)==22){i=e;return f|0}w=c[j>>2]|0;i=e;return w|0}function Rd(a){a=a|0;var b=0;b=i;c[a>>2]=3272;ek(a+4|0);i=b;return}function Sd(a){a=a|0;var b=0;b=i;c[a>>2]=3272;ek(a+4|0);Ym(a);i=b;return}function Td(b,d){b=b|0;d=d|0;var e=0;e=i;sc[c[(c[b>>2]|0)+24>>2]&127](b)|0;d=fk(d,6064)|0;c[b+36>>2]=d;a[b+44|0]=(sc[c[(c[d>>2]|0)+28>>2]&127](d)|0)&1;i=e;return}function Ud(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0;b=i;i=i+16|0;g=b+8|0;d=b;e=a+36|0;f=a+40|0;h=g+8|0;j=g;a=a+32|0;while(1){k=c[e>>2]|0;k=Cc[c[(c[k>>2]|0)+20>>2]&15](k,c[f>>2]|0,g,h,d)|0;l=(c[d>>2]|0)-j|0;if((qb(g|0,1,l|0,c[a>>2]|0)|0)!=(l|0)){e=-1;d=5;break}if((k|0)==2){e=-1;d=5;break}else if((k|0)!=1){d=4;break}}if((d|0)==4){l=((Tb(c[a>>2]|0)|0)!=0)<<31>>31;i=b;return l|0}else if((d|0)==5){i=b;return e|0}return 0}function Vd(b,e,f){b=b|0;e=e|0;f=f|0;var g=0,h=0;g=i;if((a[b+44|0]|0)!=0){h=qb(e|0,1,f|0,c[b+32>>2]|0)|0;i=g;return h|0}if((f|0)>0){h=0}else{h=0;i=g;return h|0}while(1){if((Bc[c[(c[b>>2]|0)+52>>2]&15](b,d[e]|0)|0)==-1){f=6;break}h=h+1|0;if((h|0)<(f|0)){e=e+1|0}else{f=6;break}}if((f|0)==6){i=g;return h|0}return 0}function Wd(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;e=i;i=i+32|0;j=e+16|0;p=e+8|0;h=e+4|0;k=e;f=(d|0)==-1;a:do{if(!f){a[p]=d;if((a[b+44|0]|0)!=0){if((qb(p|0,1,1,c[b+32>>2]|0)|0)==1){break}else{d=-1}i=e;return d|0}c[h>>2]=j;l=p+1|0;n=b+36|0;o=b+40|0;g=j+8|0;m=j;b=b+32|0;while(1){q=c[n>>2]|0;q=xc[c[(c[q>>2]|0)+12>>2]&15](q,c[o>>2]|0,p,l,k,j,g,h)|0;if((c[k>>2]|0)==(p|0)){d=-1;g=12;break}if((q|0)==3){g=7;break}r=(q|0)==1;if(!(q>>>0<2)){d=-1;g=12;break}q=(c[h>>2]|0)-m|0;if((qb(j|0,1,q|0,c[b>>2]|0)|0)!=(q|0)){d=-1;g=12;break}if(r){p=r?c[k>>2]|0:p}else{break a}}if((g|0)==7){if((qb(p|0,1,1,c[b>>2]|0)|0)==1){break}else{d=-1}i=e;return d|0}else if((g|0)==12){i=e;return d|0}}}while(0);r=f?0:d;i=e;return r|0}function Xd(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0;f=i;i=i+16|0;g=f;c[b>>2]=3272;h=b+4|0;ck(h);j=b+8|0;c[j+0>>2]=0;c[j+4>>2]=0;c[j+8>>2]=0;c[j+12>>2]=0;c[j+16>>2]=0;c[j+20>>2]=0;c[b>>2]=2704;c[b+32>>2]=d;c[b+40>>2]=e;c[b+48>>2]=-1;a[b+52|0]=0;dk(g,h);h=fk(g,6064)|0;e=b+36|0;c[e>>2]=h;d=b+44|0;c[d>>2]=sc[c[(c[h>>2]|0)+24>>2]&127](h)|0;e=c[e>>2]|0;a[b+53|0]=(sc[c[(c[e>>2]|0)+28>>2]&127](e)|0)&1;if((c[d>>2]|0)>8){pj(2544)}else{ek(g);i=f;return}}function Yd(a){a=a|0;var b=0;b=i;c[a>>2]=3272;ek(a+4|0);i=b;return}function Zd(a){a=a|0;var b=0;b=i;c[a>>2]=3272;ek(a+4|0);Ym(a);i=b;return}function _d(b,d){b=b|0;d=d|0;var e=0,f=0,g=0;e=i;g=fk(d,6064)|0;f=b+36|0;c[f>>2]=g;d=b+44|0;c[d>>2]=sc[c[(c[g>>2]|0)+24>>2]&127](g)|0;f=c[f>>2]|0;a[b+53|0]=(sc[c[(c[f>>2]|0)+28>>2]&127](f)|0)&1;if((c[d>>2]|0)>8){pj(2544)}else{i=e;return}}function $d(a){a=a|0;var b=0;b=i;a=ce(a,0)|0;i=b;return a|0}function ae(a){a=a|0;var b=0;b=i;a=ce(a,1)|0;i=b;return a|0}function be(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0;e=i;i=i+32|0;j=e+16|0;f=e+4|0;l=e+8|0;k=e;g=b+52|0;m=(a[g]|0)!=0;if((d|0)==-1){if(m){m=-1;i=e;return m|0}m=c[b+48>>2]|0;a[g]=(m|0)!=-1|0;i=e;return m|0}h=b+48|0;a:do{if(m){a[l]=c[h>>2];m=c[b+36>>2]|0;k=xc[c[(c[m>>2]|0)+12>>2]&15](m,c[b+40>>2]|0,l,l+1|0,k,j,j+8|0,f)|0;if((k|0)==3){a[j]=c[h>>2];c[f>>2]=j+1}else if((k|0)==1|(k|0)==2){m=-1;i=e;return m|0}b=b+32|0;while(1){k=c[f>>2]|0;if(!(k>>>0>j>>>0)){break a}m=k+ -1|0;c[f>>2]=m;if((Sb(a[m]|0,c[b>>2]|0)|0)==-1){f=-1;break}}i=e;return f|0}}while(0);c[h>>2]=d;a[g]=1;m=d;i=e;return m|0}function ce(b,e){b=b|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;f=i;i=i+32|0;h=f+16|0;k=f+8|0;n=f+4|0;m=f;o=b+52|0;if((a[o]|0)!=0){g=b+48|0;h=c[g>>2]|0;if(!e){w=h;i=f;return w|0}c[g>>2]=-1;a[o]=0;w=h;i=f;return w|0}o=c[b+44>>2]|0;s=(o|0)>1?o:1;a:do{if((s|0)>0){o=b+32|0;p=0;while(1){q=Lb(c[o>>2]|0)|0;if((q|0)==-1){g=-1;break}a[h+p|0]=q;p=p+1|0;if((p|0)>=(s|0)){break a}}i=f;return g|0}}while(0);b:do{if((a[b+53|0]|0)==0){q=b+40|0;p=b+36|0;o=k+1|0;r=b+32|0;while(1){w=c[q>>2]|0;v=w;u=c[v>>2]|0;v=c[v+4>>2]|0;x=c[p>>2]|0;t=h+s|0;w=xc[c[(c[x>>2]|0)+16>>2]&15](x,w,h,t,n,k,o,m)|0;if((w|0)==2){g=-1;m=23;break}else if((w|0)==3){m=14;break}else if((w|0)!=1){l=s;break b}x=c[q>>2]|0;c[x>>2]=u;c[x+4>>2]=v;if((s|0)==8){g=-1;m=23;break}u=Lb(c[r>>2]|0)|0;if((u|0)==-1){g=-1;m=23;break}a[t]=u;s=s+1|0}if((m|0)==14){a[k]=a[h]|0;l=s;break}else if((m|0)==23){i=f;return g|0}}else{a[k]=a[h]|0;l=s}}while(0);do{if(!e){e=b+32|0;while(1){if((l|0)<=0){m=21;break}l=l+ -1|0;if((Sb(d[h+l|0]|0,c[e>>2]|0)|0)==-1){g=-1;m=23;break}}if((m|0)==21){j=a[k]|0;break}else if((m|0)==23){i=f;return g|0}}else{j=a[k]|0;c[b+48>>2]=j&255}}while(0);x=j&255;i=f;return x|0}function de(){var a=0;a=i;Bd(0);ic(116,1968,p|0)|0;i=a;return}function ee(a){a=a|0;return}function fe(a){a=a|0;a=a+4|0;c[a>>2]=(c[a>>2]|0)+1;return}function ge(a){a=a|0;var b=0,d=0,e=0;b=i;e=a+4|0;d=c[e>>2]|0;c[e>>2]=d+ -1;if((d|0)!=0){e=0;i=b;return e|0}pc[c[(c[a>>2]|0)+8>>2]&255](a);e=1;i=b;return e|0}function he(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0;d=i;c[a>>2]=2848;e=qn(b|0)|0;g=Xm(e+13|0)|0;c[g+4>>2]=e;c[g>>2]=e;f=g+12|0;c[a+4>>2]=f;c[g+8>>2]=0;sn(f|0,b|0,e+1|0)|0;i=d;return}function ie(a){a=a|0;var b=0,d=0,e=0,f=0;b=i;c[a>>2]=2848;d=a+4|0;f=(c[d>>2]|0)+ -4|0;e=c[f>>2]|0;c[f>>2]=e+ -1;if((e+ -1|0)<0){Zm((c[d>>2]|0)+ -12|0)}Xa(a|0);Ym(a);i=b;return}function je(a){a=a|0;var b=0,d=0,e=0,f=0;b=i;c[a>>2]=2848;d=a+4|0;f=(c[d>>2]|0)+ -4|0;e=c[f>>2]|0;c[f>>2]=e+ -1;if((e+ -1|0)>=0){Xa(a|0);i=b;return}Zm((c[d>>2]|0)+ -12|0);Xa(a|0);i=b;return}function ke(a){a=a|0;return c[a+4>>2]|0}function le(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0;e=i;c[b>>2]=2872;if((a[d]&1)==0){d=d+1|0}else{d=c[d+8>>2]|0}f=qn(d|0)|0;h=Xm(f+13|0)|0;c[h+4>>2]=f;c[h>>2]=f;g=h+12|0;c[b+4>>2]=g;c[h+8>>2]=0;sn(g|0,d|0,f+1|0)|0;i=e;return}function me(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0;d=i;c[a>>2]=2872;e=qn(b|0)|0;g=Xm(e+13|0)|0;c[g+4>>2]=e;c[g>>2]=e;f=g+12|0;c[a+4>>2]=f;c[g+8>>2]=0;sn(f|0,b|0,e+1|0)|0;i=d;return}function ne(a){a=a|0;var b=0,d=0,e=0,f=0;b=i;c[a>>2]=2872;d=a+4|0;f=(c[d>>2]|0)+ -4|0;e=c[f>>2]|0;c[f>>2]=e+ -1;if((e+ -1|0)<0){Zm((c[d>>2]|0)+ -12|0)}Xa(a|0);Ym(a);i=b;return}function oe(a){a=a|0;var b=0,d=0,e=0,f=0;b=i;c[a>>2]=2872;d=a+4|0;f=(c[d>>2]|0)+ -4|0;e=c[f>>2]|0;c[f>>2]=e+ -1;if((e+ -1|0)>=0){Xa(a|0);i=b;return}Zm((c[d>>2]|0)+ -12|0);Xa(a|0);i=b;return}function pe(a){a=a|0;return c[a+4>>2]|0}function qe(a){a=a|0;var b=0,d=0,e=0,f=0;b=i;c[a>>2]=2848;d=a+4|0;f=(c[d>>2]|0)+ -4|0;e=c[f>>2]|0;c[f>>2]=e+ -1;if((e+ -1|0)<0){Zm((c[d>>2]|0)+ -12|0)}Xa(a|0);Ym(a);i=b;return}function re(a){a=a|0;return}function se(a,b,d){a=a|0;b=b|0;d=d|0;c[a>>2]=d;c[a+4>>2]=b;return}function te(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0;e=i;i=i+16|0;f=e;uc[c[(c[a>>2]|0)+12>>2]&7](f,a,b);if((c[f+4>>2]|0)!=(c[d+4>>2]|0)){a=0;i=e;return a|0}a=(c[f>>2]|0)==(c[d>>2]|0);i=e;return a|0}function ue(a,b,d){a=a|0;b=b|0;d=d|0;var e=0;e=i;if((c[b+4>>2]|0)!=(a|0)){a=0;i=e;return a|0}a=(c[b>>2]|0)==(d|0);i=e;return a|0}function ve(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;d=i;f=gc(e|0)|0;e=qn(f|0)|0;if(e>>>0>4294967279){Be(0)}if(e>>>0<11){a[b]=e<<1;b=b+1|0;sn(b|0,f|0,e|0)|0;f=b+e|0;a[f]=0;i=d;return}else{h=e+16&-16;g=Wm(h)|0;c[b+8>>2]=g;c[b>>2]=h|1;c[b+4>>2]=e;b=g;sn(b|0,f|0,e|0)|0;f=b+e|0;a[f]=0;i=d;return}}function we(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0;g=i;i=i+16|0;f=g;h=c[d>>2]|0;if((h|0)!=0){j=a[e]|0;if((j&1)==0){j=(j&255)>>>1}else{j=c[e+4>>2]|0}if((j|0)!=0){Le(e,3024,2)|0;h=c[d>>2]|0}j=c[d+4>>2]|0;uc[c[(c[j>>2]|0)+24>>2]&7](f,j,h);h=a[f]|0;if((h&1)==0){d=f+1|0;h=(h&255)>>>1}else{d=c[f+8>>2]|0;h=c[f+4>>2]|0}Le(e,d,h)|0;if(!((a[f]&1)==0)){Ym(c[f+8>>2]|0)}}c[b+0>>2]=c[e+0>>2];c[b+4>>2]=c[e+4>>2];c[b+8>>2]=c[e+8>>2];c[e+0>>2]=0;c[e+4>>2]=0;c[e+8>>2]=0;i=g;return}function xe(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0;f=i;i=i+32|0;h=f+12|0;g=f;j=qn(e|0)|0;if(j>>>0>4294967279){Be(0)}if(j>>>0<11){a[g]=j<<1;k=g+1|0}else{l=j+16&-16;k=Wm(l)|0;c[g+8>>2]=k;c[g>>2]=l|1;c[g+4>>2]=j}sn(k|0,e|0,j|0)|0;a[k+j|0]=0;we(h,d,g);le(b,h);if(!((a[h]&1)==0)){Ym(c[h+8>>2]|0)}if(!((a[g]&1)==0)){Ym(c[g+8>>2]|0)}c[b>>2]=3040;e=d;k=c[e+4>>2]|0;l=b+8|0;c[l>>2]=c[e>>2];c[l+4>>2]=k;i=f;return}function ye(a){a=a|0;var b=0;b=i;oe(a);Ym(a);i=b;return}function ze(a){a=a|0;var b=0;b=i;oe(a);i=b;return}function Ae(a,b,d){a=a|0;b=b|0;d=d|0;var e=0;e=i;sb(3176)|0;if((c[a>>2]|0)==1){do{Qb(3200,3176)|0}while((c[a>>2]|0)==1)}if((c[a>>2]|0)==0){c[a>>2]=1;$b(3176)|0;pc[d&255](b);sb(3176)|0;c[a>>2]=-1;$b(3176)|0;Jb(3200)|0;i=e;return}else{$b(3176)|0;i=e;return}}function Be(a){a=a|0;a=xb(8)|0;he(a,3248);c[a>>2]=2928;ec(a|0,2968,14)}function Ce(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0;e=i;if((a[d]&1)==0){c[b+0>>2]=c[d+0>>2];c[b+4>>2]=c[d+4>>2];c[b+8>>2]=c[d+8>>2];i=e;return}f=c[d+8>>2]|0;d=c[d+4>>2]|0;if(d>>>0>4294967279){Be(0)}if(d>>>0<11){a[b]=d<<1;b=b+1|0}else{h=d+16&-16;g=Wm(h)|0;c[b+8>>2]=g;c[b>>2]=h|1;c[b+4>>2]=d;b=g}sn(b|0,f|0,d|0)|0;a[b+d|0]=0;i=e;return}function De(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;f=i;if(e>>>0>4294967279){Be(0)}if(e>>>0<11){a[b]=e<<1;b=b+1|0}else{h=e+16&-16;g=Wm(h)|0;c[b+8>>2]=g;c[b>>2]=h|1;c[b+4>>2]=e;b=g}sn(b|0,d|0,e|0)|0;a[b+e|0]=0;i=f;return}function Ee(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;f=i;if(d>>>0>4294967279){Be(0)}if(d>>>0<11){a[b]=d<<1;b=b+1|0}else{h=d+16&-16;g=Wm(h)|0;c[b+8>>2]=g;c[b>>2]=h|1;c[b+4>>2]=d;b=g}rn(b|0,e|0,d|0)|0;a[b+d|0]=0;i=f;return}function Fe(b){b=b|0;var d=0;d=i;if((a[b]&1)==0){i=d;return}Ym(c[b+8>>2]|0);i=d;return}function Ge(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0;f=i;e=qn(d|0)|0;h=a[b]|0;if((h&1)==0){g=10}else{g=c[b>>2]|0;h=g&255;g=(g&-2)+ -1|0}j=(h&1)==0;if(g>>>0<e>>>0){if(j){h=(h&255)>>>1}else{h=c[b+4>>2]|0}Me(b,g,e-g|0,h,0,h,e,d);i=f;return b|0}if(j){g=b+1|0}else{g=c[b+8>>2]|0}un(g|0,d|0,e|0)|0;a[g+e|0]=0;if((a[b]&1)==0){a[b]=e<<1;i=f;return b|0}else{c[b+4>>2]=e;i=f;return b|0}return 0}function He(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;f=i;h=a[b]|0;g=(h&1)==0;if(g){h=(h&255)>>>1}else{h=c[b+4>>2]|0}if(h>>>0<d>>>0){Ie(b,d-h|0,e)|0;i=f;return}if(g){a[b+d+1|0]=0;a[b]=d<<1;i=f;return}else{a[(c[b+8>>2]|0)+d|0]=0;c[b+4>>2]=d;i=f;return}}function Ie(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0;f=i;if((d|0)==0){i=f;return b|0}j=a[b]|0;if((j&1)==0){h=10}else{j=c[b>>2]|0;h=(j&-2)+ -1|0;j=j&255}if((j&1)==0){g=(j&255)>>>1}else{g=c[b+4>>2]|0}if((h-g|0)>>>0<d>>>0){Ne(b,h,d-h+g|0,g,g,0,0);j=a[b]|0}if((j&1)==0){h=b+1|0}else{h=c[b+8>>2]|0}rn(h+g|0,e|0,d|0)|0;e=g+d|0;if((a[b]&1)==0){a[b]=e<<1}else{c[b+4>>2]=e}a[h+e|0]=0;i=f;return b|0}function Je(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0;e=i;if(d>>>0>4294967279){Be(0)}g=a[b]|0;if((g&1)==0){h=10}else{g=c[b>>2]|0;h=(g&-2)+ -1|0;g=g&255}if((g&1)==0){f=(g&255)>>>1}else{f=c[b+4>>2]|0}d=f>>>0>d>>>0?f:d;if(d>>>0<11){d=10}else{d=(d+16&-16)+ -1|0}if((d|0)==(h|0)){i=e;return}do{if((d|0)!=10){j=d+1|0;if(d>>>0>h>>>0){k=Wm(j)|0}else{k=Wm(j)|0}if((g&1)==0){l=1;j=b+1|0;h=0;break}else{l=1;j=c[b+8>>2]|0;h=1;break}}else{k=b+1|0;l=0;j=c[b+8>>2]|0;h=1}}while(0);if((g&1)==0){g=(g&255)>>>1}else{g=c[b+4>>2]|0}sn(k|0,j|0,g+1|0)|0;if(h){Ym(j)}if(l){c[b>>2]=d+1|1;c[b+4>>2]=f;c[b+8>>2]=k;i=e;return}else{a[b]=f<<1;i=e;return}}function Ke(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0;e=i;g=a[b]|0;f=(g&1)!=0;if(f){h=(c[b>>2]&-2)+ -1|0;g=c[b+4>>2]|0}else{h=10;g=(g&255)>>>1}if((g|0)==(h|0)){Ne(b,h,1,h,h,0,0);if((a[b]&1)==0){f=7}else{f=8}}else{if(f){f=8}else{f=7}}if((f|0)==7){a[b]=(g<<1)+2;f=b+1|0;h=g+1|0;g=f+g|0;a[g]=d;h=f+h|0;a[h]=0;i=e;return}else if((f|0)==8){f=c[b+8>>2]|0;h=g+1|0;c[b+4>>2]=h;g=f+g|0;a[g]=d;h=f+h|0;a[h]=0;i=e;return}}function Le(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0;f=i;j=a[b]|0;if((j&1)==0){g=10}else{j=c[b>>2]|0;g=(j&-2)+ -1|0;j=j&255}if((j&1)==0){h=(j&255)>>>1}else{h=c[b+4>>2]|0}if((g-h|0)>>>0<e>>>0){Me(b,g,e-g+h|0,h,h,0,e,d);i=f;return b|0}if((e|0)==0){i=f;return b|0}if((j&1)==0){g=b+1|0}else{g=c[b+8>>2]|0}sn(g+h|0,d|0,e|0)|0;e=h+e|0;if((a[b]&1)==0){a[b]=e<<1}else{c[b+4>>2]=e}a[g+e|0]=0;i=f;return b|0}function Me(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0;m=i;if((-18-d|0)>>>0<e>>>0){Be(0)}if((a[b]&1)==0){l=b+1|0}else{l=c[b+8>>2]|0}if(d>>>0<2147483623){n=e+d|0;e=d<<1;e=n>>>0<e>>>0?e:n;if(e>>>0<11){e=11}else{e=e+16&-16}}else{e=-17}n=Wm(e)|0;if((g|0)!=0){sn(n|0,l|0,g|0)|0}if((j|0)!=0){sn(n+g|0,k|0,j|0)|0}k=f-h|0;if((k|0)!=(g|0)){sn(n+(j+g)|0,l+(h+g)|0,k-g|0)|0}if((d|0)==10){f=b+8|0;c[f>>2]=n;e=e|1;c[b>>2]=e;e=k+j|0;f=b+4|0;c[f>>2]=e;n=n+e|0;a[n]=0;i=m;return}Ym(l);f=b+8|0;c[f>>2]=n;e=e|1;c[b>>2]=e;e=k+j|0;f=b+4|0;c[f>>2]=e;n=n+e|0;a[n]=0;i=m;return}function Ne(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0;l=i;if((-17-d|0)>>>0<e>>>0){Be(0)}if((a[b]&1)==0){k=b+1|0}else{k=c[b+8>>2]|0}if(d>>>0<2147483623){m=e+d|0;e=d<<1;e=m>>>0<e>>>0?e:m;if(e>>>0<11){e=11}else{e=e+16&-16}}else{e=-17}m=Wm(e)|0;if((g|0)!=0){sn(m|0,k|0,g|0)|0}f=f-h|0;if((f|0)!=(g|0)){sn(m+(j+g)|0,k+(h+g)|0,f-g|0)|0}if((d|0)==10){f=b+8|0;c[f>>2]=m;m=e|1;c[b>>2]=m;i=l;return}Ym(k);f=b+8|0;c[f>>2]=m;m=e|1;c[b>>2]=m;i=l;return}function Oe(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;f=i;if(e>>>0>1073741807){Be(0)}if(e>>>0<2){a[b]=e<<1;b=b+4|0}else{h=e+4&-4;g=Wm(h<<2)|0;c[b+8>>2]=g;c[b>>2]=h|1;c[b+4>>2]=e;b=g}sm(b,d,e)|0;c[b+(e<<2)>>2]=0;i=f;return}function Pe(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;f=i;if(d>>>0>1073741807){Be(0)}if(d>>>0<2){a[b]=d<<1;b=b+4|0}else{h=d+4&-4;g=Wm(h<<2)|0;c[b+8>>2]=g;c[b>>2]=h|1;c[b+4>>2]=d;b=g}um(b,e,d)|0;c[b+(d<<2)>>2]=0;i=f;return}function Qe(b){b=b|0;var d=0;d=i;if((a[b]&1)==0){i=d;return}Ym(c[b+8>>2]|0);i=d;return}function Re(a,b){a=a|0;b=b|0;var c=0;c=i;a=Se(a,b,rm(b)|0)|0;i=c;return a|0}function Se(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0;f=i;h=a[b]|0;if((h&1)==0){g=1}else{h=c[b>>2]|0;g=(h&-2)+ -1|0;h=h&255}j=(h&1)==0;if(g>>>0<e>>>0){if(j){h=(h&255)>>>1}else{h=c[b+4>>2]|0}Ve(b,g,e-g|0,h,0,h,e,d);i=f;return b|0}if(j){g=b+4|0}else{g=c[b+8>>2]|0}tm(g,d,e)|0;c[g+(e<<2)>>2]=0;if((a[b]&1)==0){a[b]=e<<1;i=f;return b|0}else{c[b+4>>2]=e;i=f;return b|0}return 0}function Te(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0;e=i;if(d>>>0>1073741807){Be(0)}g=a[b]|0;if((g&1)==0){h=1}else{g=c[b>>2]|0;h=(g&-2)+ -1|0;g=g&255}if((g&1)==0){f=(g&255)>>>1}else{f=c[b+4>>2]|0}d=f>>>0>d>>>0?f:d;if(d>>>0<2){d=1}else{d=(d+4&-4)+ -1|0}if((d|0)==(h|0)){i=e;return}do{if((d|0)!=1){j=(d<<2)+4|0;if(d>>>0>h>>>0){k=Wm(j)|0}else{k=Wm(j)|0}if((g&1)==0){l=1;j=b+4|0;h=0;break}else{l=1;j=c[b+8>>2]|0;h=1;break}}else{k=b+4|0;l=0;j=c[b+8>>2]|0;h=1}}while(0);if((g&1)==0){g=(g&255)>>>1}else{g=c[b+4>>2]|0}sm(k,j,g+1|0)|0;if(h){Ym(j)}if(l){c[b>>2]=d+1|1;c[b+4>>2]=f;c[b+8>>2]=k;i=e;return}else{a[b]=f<<1;i=e;return}}function Ue(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0;e=i;g=a[b]|0;f=(g&1)!=0;if(f){h=(c[b>>2]&-2)+ -1|0;g=c[b+4>>2]|0}else{h=1;g=(g&255)>>>1}if((g|0)==(h|0)){We(b,h,1,h,h,0,0);if((a[b]&1)==0){f=7}else{f=8}}else{if(f){f=8}else{f=7}}if((f|0)==7){a[b]=(g<<1)+2;f=b+4|0;h=g+1|0;g=f+(g<<2)|0;c[g>>2]=d;h=f+(h<<2)|0;c[h>>2]=0;i=e;return}else if((f|0)==8){f=c[b+8>>2]|0;h=g+1|0;c[b+4>>2]=h;g=f+(g<<2)|0;c[g>>2]=d;h=f+(h<<2)|0;c[h>>2]=0;i=e;return}}function Ve(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0;m=i;if((1073741806-d|0)>>>0<e>>>0){Be(0)}if((a[b]&1)==0){l=b+4|0}else{l=c[b+8>>2]|0}if(d>>>0<536870887){n=e+d|0;e=d<<1;e=n>>>0<e>>>0?e:n;if(e>>>0<2){e=2}else{e=e+4&-4}}else{e=1073741807}n=Wm(e<<2)|0;if((g|0)!=0){sm(n,l,g)|0}if((j|0)!=0){sm(n+(g<<2)|0,k,j)|0}k=f-h|0;if((k|0)!=(g|0)){sm(n+(j+g<<2)|0,l+(h+g<<2)|0,k-g|0)|0}if((d|0)==1){f=b+8|0;c[f>>2]=n;e=e|1;c[b>>2]=e;e=k+j|0;f=b+4|0;c[f>>2]=e;n=n+(e<<2)|0;c[n>>2]=0;i=m;return}Ym(l);f=b+8|0;c[f>>2]=n;e=e|1;c[b>>2]=e;e=k+j|0;f=b+4|0;c[f>>2]=e;n=n+(e<<2)|0;c[n>>2]=0;i=m;return}function We(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0;l=i;if((1073741807-d|0)>>>0<e>>>0){Be(0)}if((a[b]&1)==0){k=b+4|0}else{k=c[b+8>>2]|0}if(d>>>0<536870887){m=e+d|0;e=d<<1;e=m>>>0<e>>>0?e:m;if(e>>>0<2){e=2}else{e=e+4&-4}}else{e=1073741807}m=Wm(e<<2)|0;if((g|0)!=0){sm(m,k,g)|0}f=f-h|0;if((f|0)!=(g|0)){sm(m+(j+g<<2)|0,k+(h+g<<2)|0,f-g|0)|0}if((d|0)==1){f=b+8|0;c[f>>2]=m;m=e|1;c[b>>2]=m;i=l;return}Ym(k);f=b+8|0;c[f>>2]=m;m=e|1;c[b>>2]=m;i=l;return}function Xe(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0;g=i;i=i+16|0;f=g+8|0;e=g;h=(c[b+24>>2]|0)==0;if(h){c[b+16>>2]=d|1}else{c[b+16>>2]=d}if(((h&1|d)&c[b+20>>2]|0)==0){i=g;return}d=xb(16)|0;if((a[3616]|0)==0?(Ha(3616)|0)!=0:0){c[902]=4312;ic(45,3608,p|0)|0;db(3616)}b=e;c[b>>2]=1;c[b+4>>2]=3608;c[f+0>>2]=c[e+0>>2];c[f+4>>2]=c[e+4>>2];xe(d,f,3664);c[d>>2]=3632;ec(d|0,3712,41)}function Ye(a){a=a|0;var b=0,d=0,e=0,f=0;e=i;c[a>>2]=3656;f=c[a+40>>2]|0;b=a+32|0;d=a+36|0;if((f|0)!=0){do{f=f+ -1|0;uc[c[(c[b>>2]|0)+(f<<2)>>2]&7](0,a,c[(c[d>>2]|0)+(f<<2)>>2]|0)}while((f|0)!=0)}ek(a+28|0);Sm(c[b>>2]|0);Sm(c[d>>2]|0);Sm(c[a+48>>2]|0);Sm(c[a+60>>2]|0);i=e;return}function Ze(a,b){a=a|0;b=b|0;var c=0;c=i;dk(a,b+28|0);i=c;return}function _e(a,b){a=a|0;b=b|0;var d=0,e=0;d=i;c[a+24>>2]=b;c[a+16>>2]=(b|0)==0;c[a+20>>2]=0;c[a+4>>2]=4098;c[a+12>>2]=0;c[a+8>>2]=6;b=a+28|0;e=a+32|0;a=e+40|0;do{c[e>>2]=0;e=e+4|0}while((e|0)<(a|0));ck(b);i=d;return}function $e(a){a=a|0;var b=0;b=i;c[a>>2]=3272;ek(a+4|0);Ym(a);i=b;return}function af(a){a=a|0;var b=0;b=i;c[a>>2]=3272;ek(a+4|0);i=b;return}function bf(a,b){a=a|0;b=b|0;return}function cf(a,b,c){a=a|0;b=b|0;c=c|0;return a|0}function df(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;g=a;c[g>>2]=0;c[g+4>>2]=0;g=a+8|0;c[g>>2]=-1;c[g+4>>2]=-1;return}function ef(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;e=a;c[e>>2]=0;c[e+4>>2]=0;e=a+8|0;c[e>>2]=-1;c[e+4>>2]=-1;return}function ff(a){a=a|0;return 0}function gf(a){a=a|0;return 0}function hf(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0;f=i;if((e|0)<=0){k=0;i=f;return k|0}g=b+12|0;h=b+16|0;j=0;while(1){k=c[g>>2]|0;if(k>>>0<(c[h>>2]|0)>>>0){c[g>>2]=k+1;k=a[k]|0}else{k=sc[c[(c[b>>2]|0)+40>>2]&127](b)|0;if((k|0)==-1){e=8;break}k=k&255}a[d]=k;j=j+1|0;if((j|0)<(e|0)){d=d+1|0}else{e=8;break}}if((e|0)==8){i=f;return j|0}return 0}function jf(a){a=a|0;return-1}function kf(a){a=a|0;var b=0,e=0;b=i;if((sc[c[(c[a>>2]|0)+36>>2]&127](a)|0)==-1){a=-1;i=b;return a|0}e=a+12|0;a=c[e>>2]|0;c[e>>2]=a+1;a=d[a]|0;i=b;return a|0}function lf(a,b){a=a|0;b=b|0;return-1}function mf(b,e,f){b=b|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0;g=i;if((f|0)<=0){l=0;i=g;return l|0}j=b+24|0;h=b+28|0;k=0;while(1){l=c[j>>2]|0;if(!(l>>>0<(c[h>>2]|0)>>>0)){if((Bc[c[(c[b>>2]|0)+52>>2]&15](b,d[e]|0)|0)==-1){h=7;break}}else{m=a[e]|0;c[j>>2]=l+1;a[l]=m}k=k+1|0;if((k|0)<(f|0)){e=e+1|0}else{h=7;break}}if((h|0)==7){i=g;return k|0}return 0}function nf(a,b){a=a|0;b=b|0;return-1}function of(a){a=a|0;var b=0;b=i;c[a>>2]=3336;ek(a+4|0);Ym(a);i=b;return}function pf(a){a=a|0;var b=0;b=i;c[a>>2]=3336;ek(a+4|0);i=b;return}function qf(a,b){a=a|0;b=b|0;return}function rf(a,b,c){a=a|0;b=b|0;c=c|0;return a|0}function sf(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;g=a;c[g>>2]=0;c[g+4>>2]=0;g=a+8|0;c[g>>2]=-1;c[g+4>>2]=-1;return}function tf(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;e=a;c[e>>2]=0;c[e+4>>2]=0;e=a+8|0;c[e>>2]=-1;c[e+4>>2]=-1;return}function uf(a){a=a|0;return 0}function vf(a){a=a|0;return 0}function wf(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0;e=i;if((d|0)<=0){j=0;i=e;return j|0}g=a+12|0;f=a+16|0;h=0;while(1){j=c[g>>2]|0;if(!(j>>>0<(c[f>>2]|0)>>>0)){j=sc[c[(c[a>>2]|0)+40>>2]&127](a)|0;if((j|0)==-1){a=8;break}}else{c[g>>2]=j+4;j=c[j>>2]|0}c[b>>2]=j;h=h+1|0;if((h|0)>=(d|0)){a=8;break}b=b+4|0}if((a|0)==8){i=e;return h|0}return 0}function xf(a){a=a|0;return-1}function yf(a){a=a|0;var b=0,d=0;b=i;if((sc[c[(c[a>>2]|0)+36>>2]&127](a)|0)==-1){a=-1;i=b;return a|0}d=a+12|0;a=c[d>>2]|0;c[d>>2]=a+4;a=c[a>>2]|0;i=b;return a|0}function zf(a,b){a=a|0;b=b|0;return-1}function Af(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0;e=i;if((d|0)<=0){j=0;i=e;return j|0}g=a+24|0;f=a+28|0;h=0;while(1){j=c[g>>2]|0;if(!(j>>>0<(c[f>>2]|0)>>>0)){if((Bc[c[(c[a>>2]|0)+52>>2]&15](a,c[b>>2]|0)|0)==-1){f=8;break}}else{k=c[b>>2]|0;c[g>>2]=j+4;c[j>>2]=k}h=h+1|0;if((h|0)>=(d|0)){f=8;break}b=b+4|0}if((f|0)==8){i=e;return h|0}return 0}function Bf(a,b){a=a|0;b=b|0;return-1}function Cf(a){a=a|0;var b=0;b=i;Ye(a+8|0);Ym(a);i=b;return}function Df(a){a=a|0;var b=0;b=i;Ye(a+8|0);i=b;return}function Ef(a){a=a|0;var b=0,d=0;b=i;d=c[(c[a>>2]|0)+ -12>>2]|0;Ye(a+(d+8)|0);Ym(a+d|0);i=b;return}function Ff(a){a=a|0;var b=0;b=i;Ye(a+((c[(c[a>>2]|0)+ -12>>2]|0)+8)|0);i=b;return}function Gf(b){b=b|0;var d=0,e=0,f=0,g=0;d=i;i=i+16|0;e=d;f=c[(c[b>>2]|0)+ -12>>2]|0;if((c[b+(f+24)>>2]|0)==0){i=d;return b|0}a[e]=0;c[e+4>>2]=b;if((c[b+(f+16)>>2]|0)==0){g=c[b+(f+72)>>2]|0;if((g|0)!=0){Gf(g)|0;f=c[(c[b>>2]|0)+ -12>>2]|0}a[e]=1;g=c[b+(f+24)>>2]|0;if((sc[c[(c[g>>2]|0)+24>>2]&127](g)|0)==-1){g=c[(c[b>>2]|0)+ -12>>2]|0;Xe(b+g|0,c[b+(g+16)>>2]|1)}}Qf(e);i=d;return b|0}function Hf(a){a=a|0;var b=0;b=i;Ye(a+8|0);Ym(a);i=b;return}function If(a){a=a|0;var b=0;b=i;Ye(a+8|0);i=b;return}function Jf(a){a=a|0;var b=0,d=0;b=i;d=c[(c[a>>2]|0)+ -12>>2]|0;Ye(a+(d+8)|0);Ym(a+d|0);i=b;return}function Kf(a){a=a|0;var b=0;b=i;Ye(a+((c[(c[a>>2]|0)+ -12>>2]|0)+8)|0);i=b;return}function Lf(b){b=b|0;var d=0,e=0,f=0,g=0;d=i;i=i+16|0;e=d;f=c[(c[b>>2]|0)+ -12>>2]|0;if((c[b+(f+24)>>2]|0)==0){i=d;return b|0}a[e]=0;c[e+4>>2]=b;if((c[b+(f+16)>>2]|0)==0){g=c[b+(f+72)>>2]|0;if((g|0)!=0){Lf(g)|0;f=c[(c[b>>2]|0)+ -12>>2]|0}a[e]=1;g=c[b+(f+24)>>2]|0;if((sc[c[(c[g>>2]|0)+24>>2]&127](g)|0)==-1){g=c[(c[b>>2]|0)+ -12>>2]|0;Xe(b+g|0,c[b+(g+16)>>2]|1)}}Vf(e);i=d;return b|0}function Mf(a){a=a|0;var b=0;b=i;Ye(a+4|0);Ym(a);i=b;return}function Nf(a){a=a|0;var b=0;b=i;Ye(a+4|0);i=b;return}function Of(a){a=a|0;var b=0,d=0;b=i;d=c[(c[a>>2]|0)+ -12>>2]|0;Ye(a+(d+4)|0);Ym(a+d|0);i=b;return}function Pf(a){a=a|0;var b=0;b=i;Ye(a+((c[(c[a>>2]|0)+ -12>>2]|0)+4)|0);i=b;return}function Qf(a){a=a|0;var b=0,d=0,e=0;b=i;a=a+4|0;d=c[a>>2]|0;e=c[(c[d>>2]|0)+ -12>>2]|0;if((c[d+(e+24)>>2]|0)==0){i=b;return}if((c[d+(e+16)>>2]|0)!=0){i=b;return}if((c[d+(e+4)>>2]&8192|0)==0){i=b;return}if(Ja()|0){i=b;return}e=c[a>>2]|0;e=c[e+((c[(c[e>>2]|0)+ -12>>2]|0)+24)>>2]|0;if(!((sc[c[(c[e>>2]|0)+24>>2]&127](e)|0)==-1)){i=b;return}d=c[a>>2]|0;e=c[(c[d>>2]|0)+ -12>>2]|0;Xe(d+e|0,c[d+(e+16)>>2]|1);i=b;return}function Rf(a){a=a|0;var b=0;b=i;Ye(a+4|0);Ym(a);i=b;return}function Sf(a){a=a|0;var b=0;b=i;Ye(a+4|0);i=b;return}function Tf(a){a=a|0;var b=0,d=0;b=i;d=c[(c[a>>2]|0)+ -12>>2]|0;Ye(a+(d+4)|0);Ym(a+d|0);i=b;return}function Uf(a){a=a|0;var b=0;b=i;Ye(a+((c[(c[a>>2]|0)+ -12>>2]|0)+4)|0);i=b;return}function Vf(a){a=a|0;var b=0,d=0,e=0;b=i;a=a+4|0;d=c[a>>2]|0;e=c[(c[d>>2]|0)+ -12>>2]|0;if((c[d+(e+24)>>2]|0)==0){i=b;return}if((c[d+(e+16)>>2]|0)!=0){i=b;return}if((c[d+(e+4)>>2]&8192|0)==0){i=b;return}if(Ja()|0){i=b;return}e=c[a>>2]|0;e=c[e+((c[(c[e>>2]|0)+ -12>>2]|0)+24)>>2]|0;if(!((sc[c[(c[e>>2]|0)+24>>2]&127](e)|0)==-1)){i=b;return}d=c[a>>2]|0;e=c[(c[d>>2]|0)+ -12>>2]|0;Xe(d+e|0,c[d+(e+16)>>2]|1);i=b;return}function Wf(a){a=a|0;return 3552}function Xf(a,b,c){a=a|0;b=b|0;c=c|0;var d=0;d=i;if((c|0)==1){De(a,3568,35);i=d;return}else{ve(a,b,c);i=d;return}}function Yf(a){a=a|0;return}function Zf(a){a=a|0;var b=0;b=i;ze(a);Ym(a);i=b;return}function _f(a){a=a|0;var b=0;b=i;ze(a);i=b;return}function $f(a){a=a|0;var b=0;b=i;Ye(a);Ym(a);i=b;return}function ag(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function bg(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function cg(a){a=a|0;return}function dg(a){a=a|0;return}function eg(b,c,d,e,f){b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0;b=i;a:do{if((e|0)==(f|0)){g=6}else{while(1){if((c|0)==(d|0)){d=-1;break a}j=a[c]|0;h=a[e]|0;if(j<<24>>24<h<<24>>24){d=-1;break a}if(h<<24>>24<j<<24>>24){d=1;break a}c=c+1|0;e=e+1|0;if((e|0)==(f|0)){g=6;break}}}}while(0);if((g|0)==6){d=(c|0)!=(d|0)|0}i=b;return d|0}function fg(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0;d=i;g=e;h=f-g|0;if(h>>>0>4294967279){Be(b)}if(h>>>0<11){a[b]=h<<1;b=b+1|0}else{k=h+16&-16;j=Wm(k)|0;c[b+8>>2]=j;c[b>>2]=k|1;c[b+4>>2]=h;b=j}if((e|0)==(f|0)){k=b;a[k]=0;i=d;return}else{h=b}while(1){a[h]=a[e]|0;e=e+1|0;if((e|0)==(f|0)){break}else{h=h+1|0}}k=b+(f+(0-g))|0;a[k]=0;i=d;return}function gg(b,c,d){b=b|0;c=c|0;d=d|0;var e=0,f=0;b=i;if((c|0)==(d|0)){c=0;i=b;return c|0}else{e=0}do{e=(a[c]|0)+(e<<4)|0;f=e&-268435456;e=(f>>>24|f)^e;c=c+1|0}while((c|0)!=(d|0));i=b;return e|0}function hg(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function ig(a){a=a|0;return}function jg(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0;a=i;a:do{if((e|0)==(f|0)){g=6}else{while(1){if((b|0)==(d|0)){d=-1;break a}j=c[b>>2]|0;h=c[e>>2]|0;if((j|0)<(h|0)){d=-1;break a}if((h|0)<(j|0)){d=1;break a}b=b+4|0;e=e+4|0;if((e|0)==(f|0)){g=6;break}}}}while(0);if((g|0)==6){d=(b|0)!=(d|0)|0}i=a;return d|0}function kg(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0;d=i;g=e;j=f-g|0;h=j>>2;if(h>>>0>1073741807){Be(b)}if(h>>>0<2){a[b]=j>>>1;b=b+4|0}else{k=h+4&-4;j=Wm(k<<2)|0;c[b+8>>2]=j;c[b>>2]=k|1;c[b+4>>2]=h;b=j}if((e|0)==(f|0)){k=b;c[k>>2]=0;i=d;return}g=f+ -4+(0-g)|0;h=b;while(1){c[h>>2]=c[e>>2];e=e+4|0;if((e|0)==(f|0)){break}else{h=h+4|0}}k=b+((g>>>2)+1<<2)|0;c[k>>2]=0;i=d;return}function lg(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0;a=i;if((b|0)==(d|0)){b=0;i=a;return b|0}else{e=0}do{e=(c[b>>2]|0)+(e<<4)|0;f=e&-268435456;e=(f>>>24|f)^e;b=b+4|0}while((b|0)!=(d|0));i=a;return e|0}function mg(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function ng(a){a=a|0;return}function og(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0;k=i;i=i+80|0;l=k;s=k+24|0;q=k+28|0;r=k+32|0;u=k+16|0;t=k+12|0;p=k+20|0;m=k+36|0;n=k+40|0;o=k+64|0;if((c[g+4>>2]&1|0)==0){c[q>>2]=-1;p=c[(c[d>>2]|0)+16>>2]|0;c[u>>2]=c[e>>2];c[t>>2]=c[f>>2];c[s+0>>2]=c[u+0>>2];c[l+0>>2]=c[t+0>>2];nc[p&63](r,d,s,l,g,h,q);l=c[r>>2]|0;c[e>>2]=l;e=c[q>>2]|0;if((e|0)==0){a[j]=0}else if((e|0)==1){a[j]=1}else{a[j]=1;c[h>>2]=4}c[b>>2]=l;i=k;return}Ze(p,g);q=c[p>>2]|0;if(!((c[1500]|0)==-1)){c[l>>2]=6e3;c[l+4>>2]=117;c[l+8>>2]=0;Ae(6e3,l,118)}d=(c[6004>>2]|0)+ -1|0;r=c[q+8>>2]|0;if(!((c[q+12>>2]|0)-r>>2>>>0>d>>>0)){u=xb(4)|0;wm(u);ec(u|0,13960,106)}q=c[r+(d<<2)>>2]|0;if((q|0)==0){u=xb(4)|0;wm(u);ec(u|0,13960,106)}ge(c[p>>2]|0)|0;Ze(m,g);g=c[m>>2]|0;if(!((c[1536]|0)==-1)){c[l>>2]=6144;c[l+4>>2]=117;c[l+8>>2]=0;Ae(6144,l,118)}r=(c[6148>>2]|0)+ -1|0;p=c[g+8>>2]|0;if(!((c[g+12>>2]|0)-p>>2>>>0>r>>>0)){u=xb(4)|0;wm(u);ec(u|0,13960,106)}g=c[p+(r<<2)>>2]|0;if((g|0)==0){u=xb(4)|0;wm(u);ec(u|0,13960,106)}ge(c[m>>2]|0)|0;qc[c[(c[g>>2]|0)+24>>2]&63](n,g);qc[c[(c[g>>2]|0)+28>>2]&63](n+12|0,g);c[o>>2]=c[f>>2];u=n+24|0;c[l+0>>2]=c[o+0>>2];a[j]=(pg(e,l,n,u,q,h,1)|0)==(n|0)|0;c[b>>2]=c[e>>2];Fe(n+12|0);Fe(n);i=k;return}function pg(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0;n=i;i=i+112|0;p=n;u=(g-f|0)/12|0;if(u>>>0>100){p=Rm(u)|0;if((p|0)==0){bn()}else{m=p;o=p}}else{m=0;o=p}p=(f|0)==(g|0);if(p){t=0}else{q=f;t=0;r=o;while(1){s=a[q]|0;if((s&1)==0){s=(s&255)>>>1}else{s=c[q+4>>2]|0}if((s|0)==0){a[r]=2;t=t+1|0;u=u+ -1|0}else{a[r]=1}q=q+12|0;if((q|0)==(g|0)){break}else{r=r+1|0}}}q=0;a:while(1){r=c[b>>2]|0;do{if((r|0)!=0){if((c[r+12>>2]|0)==(c[r+16>>2]|0)){if((sc[c[(c[r>>2]|0)+36>>2]&127](r)|0)==-1){c[b>>2]=0;r=0;break}else{r=c[b>>2]|0;break}}}else{r=0}}while(0);v=(r|0)==0;r=c[e>>2]|0;if((r|0)!=0){if((c[r+12>>2]|0)==(c[r+16>>2]|0)?(sc[c[(c[r>>2]|0)+36>>2]&127](r)|0)==-1:0){c[e>>2]=0;r=0}}else{r=0}s=(r|0)==0;w=c[b>>2]|0;if(!((v^s)&(u|0)!=0)){break}r=c[w+12>>2]|0;if((r|0)==(c[w+16>>2]|0)){r=sc[c[(c[w>>2]|0)+36>>2]&127](w)|0}else{r=d[r]|0}s=r&255;if(!k){s=Bc[c[(c[h>>2]|0)+12>>2]&15](h,s)|0}r=q+1|0;if(p){q=r;continue}b:do{if(k){x=0;v=f;w=o;while(1){do{if((a[w]|0)==1){y=a[v]|0;A=(y&1)==0;if(A){z=v+1|0}else{z=c[v+8>>2]|0}if(!(s<<24>>24==(a[z+q|0]|0))){a[w]=0;u=u+ -1|0;break}if(A){x=(y&255)>>>1}else{x=c[v+4>>2]|0}if((x|0)==(r|0)){a[w]=2;x=1;t=t+1|0;u=u+ -1|0}else{x=1}}}while(0);v=v+12|0;if((v|0)==(g|0)){break b}w=w+1|0}}else{x=0;v=f;w=o;while(1){do{if((a[w]|0)==1){if((a[v]&1)==0){y=v+1|0}else{y=c[v+8>>2]|0}if(!(s<<24>>24==(Bc[c[(c[h>>2]|0)+12>>2]&15](h,a[y+q|0]|0)|0)<<24>>24)){a[w]=0;u=u+ -1|0;break}x=a[v]|0;if((x&1)==0){x=(x&255)>>>1}else{x=c[v+4>>2]|0}if((x|0)==(r|0)){a[w]=2;x=1;t=t+1|0;u=u+ -1|0}else{x=1}}}while(0);v=v+12|0;if((v|0)==(g|0)){break b}w=w+1|0}}}while(0);if(!x){q=r;continue}v=c[b>>2]|0;q=v+12|0;s=c[q>>2]|0;if((s|0)==(c[v+16>>2]|0)){sc[c[(c[v>>2]|0)+40>>2]&127](v)|0}else{c[q>>2]=s+1}if((u+t|0)>>>0<2){q=r;continue}else{s=f;q=o}while(1){if((a[q]|0)==2){v=a[s]|0;if((v&1)==0){v=(v&255)>>>1}else{v=c[s+4>>2]|0}if((v|0)!=(r|0)){a[q]=0;t=t+ -1|0}}s=s+12|0;if((s|0)==(g|0)){q=r;continue a}else{q=q+1|0}}}do{if((w|0)!=0){if((c[w+12>>2]|0)==(c[w+16>>2]|0)){if((sc[c[(c[w>>2]|0)+36>>2]&127](w)|0)==-1){c[b>>2]=0;w=0;break}else{w=c[b>>2]|0;break}}}else{w=0}}while(0);h=(w|0)==0;do{if(!s){if((c[r+12>>2]|0)!=(c[r+16>>2]|0)){if(h){break}else{l=80;break}}if(!((sc[c[(c[r>>2]|0)+36>>2]&127](r)|0)==-1)){if(h){break}else{l=80;break}}else{c[e>>2]=0;l=78;break}}else{l=78}}while(0);if((l|0)==78?h:0){l=80}if((l|0)==80){c[j>>2]=c[j>>2]|2}c:do{if(!p){if((a[o]|0)==2){g=f}else{while(1){f=f+12|0;o=o+1|0;if((f|0)==(g|0)){l=85;break c}if((a[o]|0)==2){g=f;break}}}}else{l=85}}while(0);if((l|0)==85){c[j>>2]=c[j>>2]|4}if((m|0)==0){i=n;return g|0}Sm(m);i=n;return g|0}function qg(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;m=b+4|0;l=b;c[m>>2]=c[d>>2];c[l>>2]=c[e>>2];c[k+0>>2]=c[m+0>>2];c[j+0>>2]=c[l+0>>2];rg(a,0,k,j,f,g,h);i=b;return}function rg(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;n=i;i=i+224|0;u=n+198|0;v=n+196|0;m=n+16|0;e=n+4|0;s=n+192|0;r=n+32|0;q=n;p=n+28|0;t=c[h+4>>2]&74;if((t|0)==0){t=0}else if((t|0)==64){t=8}else if((t|0)==8){t=16}else{t=10}hh(m,h,u,v);c[e+0>>2]=0;c[e+4>>2]=0;c[e+8>>2]=0;He(e,10,0);if((a[e]&1)==0){A=e+1|0;w=A;x=e+8|0}else{A=e+8|0;w=e+1|0;x=A;A=c[A>>2]|0}c[s>>2]=A;c[q>>2]=r;c[p>>2]=0;h=e+4|0;y=a[v]|0;v=c[f>>2]|0;a:while(1){if((v|0)!=0){if((c[v+12>>2]|0)==(c[v+16>>2]|0)?(sc[c[(c[v>>2]|0)+36>>2]&127](v)|0)==-1:0){c[f>>2]=0;v=0}}else{v=0}B=(v|0)==0;z=c[g>>2]|0;do{if((z|0)!=0){if((c[z+12>>2]|0)!=(c[z+16>>2]|0)){if(B){break}else{break a}}if(!((sc[c[(c[z>>2]|0)+36>>2]&127](z)|0)==-1)){if(B){break}else{break a}}else{c[g>>2]=0;l=18;break}}else{l=18}}while(0);if((l|0)==18){l=0;if(B){z=0;break}else{z=0}}B=a[e]|0;C=(B&1)==0;if(C){D=(B&255)>>>1}else{D=c[h>>2]|0}if(((c[s>>2]|0)-A|0)==(D|0)){if(C){A=(B&255)>>>1;B=(B&255)>>>1}else{B=c[h>>2]|0;A=B}He(e,A<<1,0);if((a[e]&1)==0){A=10}else{A=(c[e>>2]&-2)+ -1|0}He(e,A,0);if((a[e]&1)==0){A=w}else{A=c[x>>2]|0}c[s>>2]=A+B}B=v+12|0;D=c[B>>2]|0;C=v+16|0;if((D|0)==(c[C>>2]|0)){D=sc[c[(c[v>>2]|0)+36>>2]&127](v)|0}else{D=d[D]|0}if((Jg(D&255,t,A,s,p,y,m,r,q,u)|0)!=0){break}z=c[B>>2]|0;if((z|0)==(c[C>>2]|0)){sc[c[(c[v>>2]|0)+40>>2]&127](v)|0;continue}else{c[B>>2]=z+1;continue}}u=a[m]|0;if((u&1)==0){u=(u&255)>>>1}else{u=c[m+4>>2]|0}if((u|0)!=0?(o=c[q>>2]|0,(o-r|0)<160):0){D=c[p>>2]|0;c[q>>2]=o+4;c[o>>2]=D}c[k>>2]=am(A,c[s>>2]|0,j,t)|0;tj(m,r,c[q>>2]|0,j);if((v|0)!=0){if((c[v+12>>2]|0)==(c[v+16>>2]|0)?(sc[c[(c[v>>2]|0)+36>>2]&127](v)|0)==-1:0){c[f>>2]=0;v=0}}else{v=0}k=(v|0)==0;do{if((z|0)!=0){if((c[z+12>>2]|0)!=(c[z+16>>2]|0)){if(!k){break}c[b>>2]=v;Fe(e);Fe(m);i=n;return}if((sc[c[(c[z>>2]|0)+36>>2]&127](z)|0)==-1){c[g>>2]=0;l=54;break}if(k^(z|0)==0){c[b>>2]=v;Fe(e);Fe(m);i=n;return}}else{l=54}}while(0);if((l|0)==54?!k:0){c[b>>2]=v;Fe(e);Fe(m);i=n;return}c[j>>2]=c[j>>2]|2;c[b>>2]=v;Fe(e);Fe(m);i=n;return}function sg(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;m=b+4|0;l=b;c[m>>2]=c[d>>2];c[l>>2]=c[e>>2];c[k+0>>2]=c[m+0>>2];c[j+0>>2]=c[l+0>>2];tg(a,0,k,j,f,g,h);i=b;return}



function tg(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;n=i;i=i+224|0;u=n+198|0;v=n+196|0;m=n+16|0;e=n+4|0;s=n+192|0;r=n+32|0;q=n;p=n+28|0;t=c[h+4>>2]&74;if((t|0)==64){t=8}else if((t|0)==8){t=16}else if((t|0)==0){t=0}else{t=10}hh(m,h,u,v);c[e+0>>2]=0;c[e+4>>2]=0;c[e+8>>2]=0;He(e,10,0);if((a[e]&1)==0){A=e+1|0;w=A;x=e+8|0}else{A=e+8|0;w=e+1|0;x=A;A=c[A>>2]|0}c[s>>2]=A;c[q>>2]=r;c[p>>2]=0;h=e+4|0;y=a[v]|0;v=c[f>>2]|0;a:while(1){if((v|0)!=0){if((c[v+12>>2]|0)==(c[v+16>>2]|0)?(sc[c[(c[v>>2]|0)+36>>2]&127](v)|0)==-1:0){c[f>>2]=0;v=0}}else{v=0}B=(v|0)==0;z=c[g>>2]|0;do{if((z|0)!=0){if((c[z+12>>2]|0)!=(c[z+16>>2]|0)){if(B){break}else{break a}}if(!((sc[c[(c[z>>2]|0)+36>>2]&127](z)|0)==-1)){if(B){break}else{break a}}else{c[g>>2]=0;l=18;break}}else{l=18}}while(0);if((l|0)==18){l=0;if(B){z=0;break}else{z=0}}B=a[e]|0;C=(B&1)==0;if(C){D=(B&255)>>>1}else{D=c[h>>2]|0}if(((c[s>>2]|0)-A|0)==(D|0)){if(C){A=(B&255)>>>1;B=(B&255)>>>1}else{B=c[h>>2]|0;A=B}He(e,A<<1,0);if((a[e]&1)==0){A=10}else{A=(c[e>>2]&-2)+ -1|0}He(e,A,0);if((a[e]&1)==0){A=w}else{A=c[x>>2]|0}c[s>>2]=A+B}B=v+12|0;D=c[B>>2]|0;C=v+16|0;if((D|0)==(c[C>>2]|0)){D=sc[c[(c[v>>2]|0)+36>>2]&127](v)|0}else{D=d[D]|0}if((Jg(D&255,t,A,s,p,y,m,r,q,u)|0)!=0){break}z=c[B>>2]|0;if((z|0)==(c[C>>2]|0)){sc[c[(c[v>>2]|0)+40>>2]&127](v)|0;continue}else{c[B>>2]=z+1;continue}}u=a[m]|0;if((u&1)==0){u=(u&255)>>>1}else{u=c[m+4>>2]|0}if((u|0)!=0?(o=c[q>>2]|0,(o-r|0)<160):0){D=c[p>>2]|0;c[q>>2]=o+4;c[o>>2]=D}C=$l(A,c[s>>2]|0,j,t)|0;D=k;c[D>>2]=C;c[D+4>>2]=I;tj(m,r,c[q>>2]|0,j);if((v|0)!=0){if((c[v+12>>2]|0)==(c[v+16>>2]|0)?(sc[c[(c[v>>2]|0)+36>>2]&127](v)|0)==-1:0){c[f>>2]=0;v=0}}else{v=0}k=(v|0)==0;do{if((z|0)!=0){if((c[z+12>>2]|0)!=(c[z+16>>2]|0)){if(!k){break}c[b>>2]=v;Fe(e);Fe(m);i=n;return}if((sc[c[(c[z>>2]|0)+36>>2]&127](z)|0)==-1){c[g>>2]=0;l=54;break}if(k^(z|0)==0){c[b>>2]=v;Fe(e);Fe(m);i=n;return}}else{l=54}}while(0);if((l|0)==54?!k:0){c[b>>2]=v;Fe(e);Fe(m);i=n;return}c[j>>2]=c[j>>2]|2;c[b>>2]=v;Fe(e);Fe(m);i=n;return}function ug(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;m=b+4|0;l=b;c[m>>2]=c[d>>2];c[l>>2]=c[e>>2];c[k+0>>2]=c[m+0>>2];c[j+0>>2]=c[l+0>>2];vg(a,0,k,j,f,g,h);i=b;return}function vg(e,f,g,h,j,k,l){e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0;o=i;i=i+224|0;v=o+198|0;w=o+196|0;n=o+16|0;f=o+4|0;t=o+192|0;s=o+32|0;r=o;q=o+28|0;u=c[j+4>>2]&74;if((u|0)==0){u=0}else if((u|0)==64){u=8}else if((u|0)==8){u=16}else{u=10}hh(n,j,v,w);c[f+0>>2]=0;c[f+4>>2]=0;c[f+8>>2]=0;He(f,10,0);if((a[f]&1)==0){B=f+1|0;x=B;y=f+8|0}else{B=f+8|0;x=f+1|0;y=B;B=c[B>>2]|0}c[t>>2]=B;c[r>>2]=s;c[q>>2]=0;j=f+4|0;z=a[w]|0;w=c[g>>2]|0;a:while(1){if((w|0)!=0){if((c[w+12>>2]|0)==(c[w+16>>2]|0)?(sc[c[(c[w>>2]|0)+36>>2]&127](w)|0)==-1:0){c[g>>2]=0;w=0}}else{w=0}C=(w|0)==0;A=c[h>>2]|0;do{if((A|0)!=0){if((c[A+12>>2]|0)!=(c[A+16>>2]|0)){if(C){break}else{break a}}if(!((sc[c[(c[A>>2]|0)+36>>2]&127](A)|0)==-1)){if(C){break}else{break a}}else{c[h>>2]=0;m=18;break}}else{m=18}}while(0);if((m|0)==18){m=0;if(C){A=0;break}else{A=0}}C=a[f]|0;D=(C&1)==0;if(D){E=(C&255)>>>1}else{E=c[j>>2]|0}if(((c[t>>2]|0)-B|0)==(E|0)){if(D){B=(C&255)>>>1;C=(C&255)>>>1}else{C=c[j>>2]|0;B=C}He(f,B<<1,0);if((a[f]&1)==0){B=10}else{B=(c[f>>2]&-2)+ -1|0}He(f,B,0);if((a[f]&1)==0){B=x}else{B=c[y>>2]|0}c[t>>2]=B+C}C=w+12|0;E=c[C>>2]|0;D=w+16|0;if((E|0)==(c[D>>2]|0)){E=sc[c[(c[w>>2]|0)+36>>2]&127](w)|0}else{E=d[E]|0}if((Jg(E&255,u,B,t,q,z,n,s,r,v)|0)!=0){break}A=c[C>>2]|0;if((A|0)==(c[D>>2]|0)){sc[c[(c[w>>2]|0)+40>>2]&127](w)|0;continue}else{c[C>>2]=A+1;continue}}v=a[n]|0;if((v&1)==0){v=(v&255)>>>1}else{v=c[n+4>>2]|0}if((v|0)!=0?(p=c[r>>2]|0,(p-s|0)<160):0){E=c[q>>2]|0;c[r>>2]=p+4;c[p>>2]=E}b[l>>1]=_l(B,c[t>>2]|0,k,u)|0;tj(n,s,c[r>>2]|0,k);if((w|0)!=0){if((c[w+12>>2]|0)==(c[w+16>>2]|0)?(sc[c[(c[w>>2]|0)+36>>2]&127](w)|0)==-1:0){c[g>>2]=0;w=0}}else{w=0}l=(w|0)==0;do{if((A|0)!=0){if((c[A+12>>2]|0)!=(c[A+16>>2]|0)){if(!l){break}c[e>>2]=w;Fe(f);Fe(n);i=o;return}if((sc[c[(c[A>>2]|0)+36>>2]&127](A)|0)==-1){c[h>>2]=0;m=54;break}if(l^(A|0)==0){c[e>>2]=w;Fe(f);Fe(n);i=o;return}}else{m=54}}while(0);if((m|0)==54?!l:0){c[e>>2]=w;Fe(f);Fe(n);i=o;return}c[k>>2]=c[k>>2]|2;c[e>>2]=w;Fe(f);Fe(n);i=o;return}function wg(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;m=b+4|0;l=b;c[m>>2]=c[d>>2];c[l>>2]=c[e>>2];c[k+0>>2]=c[m+0>>2];c[j+0>>2]=c[l+0>>2];xg(a,0,k,j,f,g,h);i=b;return}function xg(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;n=i;i=i+224|0;u=n+198|0;v=n+196|0;m=n+16|0;e=n+4|0;s=n+192|0;r=n+32|0;q=n;p=n+28|0;t=c[h+4>>2]&74;if((t|0)==64){t=8}else if((t|0)==8){t=16}else if((t|0)==0){t=0}else{t=10}hh(m,h,u,v);c[e+0>>2]=0;c[e+4>>2]=0;c[e+8>>2]=0;He(e,10,0);if((a[e]&1)==0){A=e+1|0;w=A;x=e+8|0}else{A=e+8|0;w=e+1|0;x=A;A=c[A>>2]|0}c[s>>2]=A;c[q>>2]=r;c[p>>2]=0;h=e+4|0;y=a[v]|0;v=c[f>>2]|0;a:while(1){if((v|0)!=0){if((c[v+12>>2]|0)==(c[v+16>>2]|0)?(sc[c[(c[v>>2]|0)+36>>2]&127](v)|0)==-1:0){c[f>>2]=0;v=0}}else{v=0}B=(v|0)==0;z=c[g>>2]|0;do{if((z|0)!=0){if((c[z+12>>2]|0)!=(c[z+16>>2]|0)){if(B){break}else{break a}}if(!((sc[c[(c[z>>2]|0)+36>>2]&127](z)|0)==-1)){if(B){break}else{break a}}else{c[g>>2]=0;l=18;break}}else{l=18}}while(0);if((l|0)==18){l=0;if(B){z=0;break}else{z=0}}B=a[e]|0;C=(B&1)==0;if(C){D=(B&255)>>>1}else{D=c[h>>2]|0}if(((c[s>>2]|0)-A|0)==(D|0)){if(C){A=(B&255)>>>1;B=(B&255)>>>1}else{B=c[h>>2]|0;A=B}He(e,A<<1,0);if((a[e]&1)==0){A=10}else{A=(c[e>>2]&-2)+ -1|0}He(e,A,0);if((a[e]&1)==0){A=w}else{A=c[x>>2]|0}c[s>>2]=A+B}B=v+12|0;D=c[B>>2]|0;C=v+16|0;if((D|0)==(c[C>>2]|0)){D=sc[c[(c[v>>2]|0)+36>>2]&127](v)|0}else{D=d[D]|0}if((Jg(D&255,t,A,s,p,y,m,r,q,u)|0)!=0){break}z=c[B>>2]|0;if((z|0)==(c[C>>2]|0)){sc[c[(c[v>>2]|0)+40>>2]&127](v)|0;continue}else{c[B>>2]=z+1;continue}}u=a[m]|0;if((u&1)==0){u=(u&255)>>>1}else{u=c[m+4>>2]|0}if((u|0)!=0?(o=c[q>>2]|0,(o-r|0)<160):0){D=c[p>>2]|0;c[q>>2]=o+4;c[o>>2]=D}c[k>>2]=Zl(A,c[s>>2]|0,j,t)|0;tj(m,r,c[q>>2]|0,j);if((v|0)!=0){if((c[v+12>>2]|0)==(c[v+16>>2]|0)?(sc[c[(c[v>>2]|0)+36>>2]&127](v)|0)==-1:0){c[f>>2]=0;v=0}}else{v=0}k=(v|0)==0;do{if((z|0)!=0){if((c[z+12>>2]|0)!=(c[z+16>>2]|0)){if(!k){break}c[b>>2]=v;Fe(e);Fe(m);i=n;return}if((sc[c[(c[z>>2]|0)+36>>2]&127](z)|0)==-1){c[g>>2]=0;l=54;break}if(k^(z|0)==0){c[b>>2]=v;Fe(e);Fe(m);i=n;return}}else{l=54}}while(0);if((l|0)==54?!k:0){c[b>>2]=v;Fe(e);Fe(m);i=n;return}c[j>>2]=c[j>>2]|2;c[b>>2]=v;Fe(e);Fe(m);i=n;return}function yg(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;m=b+4|0;l=b;c[m>>2]=c[d>>2];c[l>>2]=c[e>>2];c[k+0>>2]=c[m+0>>2];c[j+0>>2]=c[l+0>>2];zg(a,0,k,j,f,g,h);i=b;return}function zg(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;n=i;i=i+224|0;u=n+198|0;v=n+196|0;m=n+16|0;e=n+4|0;s=n+192|0;r=n+32|0;q=n;p=n+28|0;t=c[h+4>>2]&74;if((t|0)==0){t=0}else if((t|0)==64){t=8}else if((t|0)==8){t=16}else{t=10}hh(m,h,u,v);c[e+0>>2]=0;c[e+4>>2]=0;c[e+8>>2]=0;He(e,10,0);if((a[e]&1)==0){A=e+1|0;w=A;x=e+8|0}else{A=e+8|0;w=e+1|0;x=A;A=c[A>>2]|0}c[s>>2]=A;c[q>>2]=r;c[p>>2]=0;h=e+4|0;y=a[v]|0;v=c[f>>2]|0;a:while(1){if((v|0)!=0){if((c[v+12>>2]|0)==(c[v+16>>2]|0)?(sc[c[(c[v>>2]|0)+36>>2]&127](v)|0)==-1:0){c[f>>2]=0;v=0}}else{v=0}B=(v|0)==0;z=c[g>>2]|0;do{if((z|0)!=0){if((c[z+12>>2]|0)!=(c[z+16>>2]|0)){if(B){break}else{break a}}if(!((sc[c[(c[z>>2]|0)+36>>2]&127](z)|0)==-1)){if(B){break}else{break a}}else{c[g>>2]=0;l=18;break}}else{l=18}}while(0);if((l|0)==18){l=0;if(B){z=0;break}else{z=0}}B=a[e]|0;C=(B&1)==0;if(C){D=(B&255)>>>1}else{D=c[h>>2]|0}if(((c[s>>2]|0)-A|0)==(D|0)){if(C){A=(B&255)>>>1;B=(B&255)>>>1}else{B=c[h>>2]|0;A=B}He(e,A<<1,0);if((a[e]&1)==0){A=10}else{A=(c[e>>2]&-2)+ -1|0}He(e,A,0);if((a[e]&1)==0){A=w}else{A=c[x>>2]|0}c[s>>2]=A+B}B=v+12|0;D=c[B>>2]|0;C=v+16|0;if((D|0)==(c[C>>2]|0)){D=sc[c[(c[v>>2]|0)+36>>2]&127](v)|0}else{D=d[D]|0}if((Jg(D&255,t,A,s,p,y,m,r,q,u)|0)!=0){break}z=c[B>>2]|0;if((z|0)==(c[C>>2]|0)){sc[c[(c[v>>2]|0)+40>>2]&127](v)|0;continue}else{c[B>>2]=z+1;continue}}u=a[m]|0;if((u&1)==0){u=(u&255)>>>1}else{u=c[m+4>>2]|0}if((u|0)!=0?(o=c[q>>2]|0,(o-r|0)<160):0){D=c[p>>2]|0;c[q>>2]=o+4;c[o>>2]=D}c[k>>2]=Yl(A,c[s>>2]|0,j,t)|0;tj(m,r,c[q>>2]|0,j);if((v|0)!=0){if((c[v+12>>2]|0)==(c[v+16>>2]|0)?(sc[c[(c[v>>2]|0)+36>>2]&127](v)|0)==-1:0){c[f>>2]=0;v=0}}else{v=0}k=(v|0)==0;do{if((z|0)!=0){if((c[z+12>>2]|0)!=(c[z+16>>2]|0)){if(!k){break}c[b>>2]=v;Fe(e);Fe(m);i=n;return}if((sc[c[(c[z>>2]|0)+36>>2]&127](z)|0)==-1){c[g>>2]=0;l=54;break}if(k^(z|0)==0){c[b>>2]=v;Fe(e);Fe(m);i=n;return}}else{l=54}}while(0);if((l|0)==54?!k:0){c[b>>2]=v;Fe(e);Fe(m);i=n;return}c[j>>2]=c[j>>2]|2;c[b>>2]=v;Fe(e);Fe(m);i=n;return}function Ag(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;m=b+4|0;l=b;c[m>>2]=c[d>>2];c[l>>2]=c[e>>2];c[k+0>>2]=c[m+0>>2];c[j+0>>2]=c[l+0>>2];Bg(a,0,k,j,f,g,h);i=b;return}function Bg(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;n=i;i=i+224|0;u=n+198|0;v=n+196|0;m=n+16|0;e=n+4|0;s=n+192|0;r=n+32|0;q=n;p=n+28|0;t=c[h+4>>2]&74;if((t|0)==64){t=8}else if((t|0)==8){t=16}else if((t|0)==0){t=0}else{t=10}hh(m,h,u,v);c[e+0>>2]=0;c[e+4>>2]=0;c[e+8>>2]=0;He(e,10,0);if((a[e]&1)==0){A=e+1|0;w=A;x=e+8|0}else{A=e+8|0;w=e+1|0;x=A;A=c[A>>2]|0}c[s>>2]=A;c[q>>2]=r;c[p>>2]=0;h=e+4|0;y=a[v]|0;v=c[f>>2]|0;a:while(1){if((v|0)!=0){if((c[v+12>>2]|0)==(c[v+16>>2]|0)?(sc[c[(c[v>>2]|0)+36>>2]&127](v)|0)==-1:0){c[f>>2]=0;v=0}}else{v=0}B=(v|0)==0;z=c[g>>2]|0;do{if((z|0)!=0){if((c[z+12>>2]|0)!=(c[z+16>>2]|0)){if(B){break}else{break a}}if(!((sc[c[(c[z>>2]|0)+36>>2]&127](z)|0)==-1)){if(B){break}else{break a}}else{c[g>>2]=0;l=18;break}}else{l=18}}while(0);if((l|0)==18){l=0;if(B){z=0;break}else{z=0}}B=a[e]|0;C=(B&1)==0;if(C){D=(B&255)>>>1}else{D=c[h>>2]|0}if(((c[s>>2]|0)-A|0)==(D|0)){if(C){A=(B&255)>>>1;B=(B&255)>>>1}else{B=c[h>>2]|0;A=B}He(e,A<<1,0);if((a[e]&1)==0){A=10}else{A=(c[e>>2]&-2)+ -1|0}He(e,A,0);if((a[e]&1)==0){A=w}else{A=c[x>>2]|0}c[s>>2]=A+B}B=v+12|0;D=c[B>>2]|0;C=v+16|0;if((D|0)==(c[C>>2]|0)){D=sc[c[(c[v>>2]|0)+36>>2]&127](v)|0}else{D=d[D]|0}if((Jg(D&255,t,A,s,p,y,m,r,q,u)|0)!=0){break}z=c[B>>2]|0;if((z|0)==(c[C>>2]|0)){sc[c[(c[v>>2]|0)+40>>2]&127](v)|0;continue}else{c[B>>2]=z+1;continue}}u=a[m]|0;if((u&1)==0){u=(u&255)>>>1}else{u=c[m+4>>2]|0}if((u|0)!=0?(o=c[q>>2]|0,(o-r|0)<160):0){D=c[p>>2]|0;c[q>>2]=o+4;c[o>>2]=D}C=Xl(A,c[s>>2]|0,j,t)|0;D=k;c[D>>2]=C;c[D+4>>2]=I;tj(m,r,c[q>>2]|0,j);if((v|0)!=0){if((c[v+12>>2]|0)==(c[v+16>>2]|0)?(sc[c[(c[v>>2]|0)+36>>2]&127](v)|0)==-1:0){c[f>>2]=0;v=0}}else{v=0}k=(v|0)==0;do{if((z|0)!=0){if((c[z+12>>2]|0)!=(c[z+16>>2]|0)){if(!k){break}c[b>>2]=v;Fe(e);Fe(m);i=n;return}if((sc[c[(c[z>>2]|0)+36>>2]&127](z)|0)==-1){c[g>>2]=0;l=54;break}if(k^(z|0)==0){c[b>>2]=v;Fe(e);Fe(m);i=n;return}}else{l=54}}while(0);if((l|0)==54?!k:0){c[b>>2]=v;Fe(e);Fe(m);i=n;return}c[j>>2]=c[j>>2]|2;c[b>>2]=v;Fe(e);Fe(m);i=n;return}function Cg(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;m=b+4|0;l=b;c[m>>2]=c[d>>2];c[l>>2]=c[e>>2];c[k+0>>2]=c[m+0>>2];c[j+0>>2]=c[l+0>>2];Dg(a,0,k,j,f,g,h);i=b;return}function Dg(b,e,f,h,j,k,l){b=b|0;e=e|0;f=f|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0;o=i;i=i+256|0;w=o+208|0;A=o+200|0;x=o+240|0;n=o;e=o+188|0;r=o+184|0;s=o+16|0;u=o+176|0;t=o+180|0;q=o+241|0;v=o+242|0;ih(n,j,w,A,x);c[e+0>>2]=0;c[e+4>>2]=0;c[e+8>>2]=0;He(e,10,0);if((a[e]&1)==0){D=e+1|0;y=D;z=e+8|0}else{D=e+8|0;y=e+1|0;z=D;D=c[D>>2]|0}c[r>>2]=D;c[u>>2]=s;c[t>>2]=0;a[q]=1;a[v]=69;j=e+4|0;A=a[A]|0;B=a[x]|0;x=c[f>>2]|0;a:while(1){if((x|0)!=0){if((c[x+12>>2]|0)==(c[x+16>>2]|0)?(sc[c[(c[x>>2]|0)+36>>2]&127](x)|0)==-1:0){c[f>>2]=0;x=0}}else{x=0}E=(x|0)==0;C=c[h>>2]|0;do{if((C|0)!=0){if((c[C+12>>2]|0)!=(c[C+16>>2]|0)){if(E){break}else{break a}}if(!((sc[c[(c[C>>2]|0)+36>>2]&127](C)|0)==-1)){if(E){break}else{break a}}else{c[h>>2]=0;m=14;break}}else{m=14}}while(0);if((m|0)==14){m=0;if(E){C=0;break}else{C=0}}E=a[e]|0;G=(E&1)==0;if(G){F=(E&255)>>>1}else{F=c[j>>2]|0}if(((c[r>>2]|0)-D|0)==(F|0)){if(G){D=(E&255)>>>1;E=(E&255)>>>1}else{E=c[j>>2]|0;D=E}He(e,D<<1,0);if((a[e]&1)==0){D=10}else{D=(c[e>>2]&-2)+ -1|0}He(e,D,0);if((a[e]&1)==0){D=y}else{D=c[z>>2]|0}c[r>>2]=D+E}F=x+12|0;G=c[F>>2]|0;E=x+16|0;if((G|0)==(c[E>>2]|0)){G=sc[c[(c[x>>2]|0)+36>>2]&127](x)|0}else{G=d[G]|0}if((jh(G&255,q,v,D,r,A,B,n,s,u,t,w)|0)!=0){break}C=c[F>>2]|0;if((C|0)==(c[E>>2]|0)){sc[c[(c[x>>2]|0)+40>>2]&127](x)|0;continue}else{c[F>>2]=C+1;continue}}v=a[n]|0;if((v&1)==0){v=(v&255)>>>1}else{v=c[n+4>>2]|0}if(((v|0)!=0?(a[q]|0)!=0:0)?(p=c[u>>2]|0,(p-s|0)<160):0){G=c[t>>2]|0;c[u>>2]=p+4;c[p>>2]=G}g[l>>2]=+Wl(D,c[r>>2]|0,k);tj(n,s,c[u>>2]|0,k);if((x|0)!=0){if((c[x+12>>2]|0)==(c[x+16>>2]|0)?(sc[c[(c[x>>2]|0)+36>>2]&127](x)|0)==-1:0){c[f>>2]=0;x=0}}else{x=0}p=(x|0)==0;do{if((C|0)!=0){if((c[C+12>>2]|0)!=(c[C+16>>2]|0)){if(!p){break}c[b>>2]=x;Fe(e);Fe(n);i=o;return}if((sc[c[(c[C>>2]|0)+36>>2]&127](C)|0)==-1){c[h>>2]=0;m=51;break}if(p^(C|0)==0){c[b>>2]=x;Fe(e);Fe(n);i=o;return}}else{m=51}}while(0);if((m|0)==51?!p:0){c[b>>2]=x;Fe(e);Fe(n);i=o;return}c[k>>2]=c[k>>2]|2;c[b>>2]=x;Fe(e);Fe(n);i=o;return}function Eg(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;m=b+4|0;l=b;c[m>>2]=c[d>>2];c[l>>2]=c[e>>2];c[k+0>>2]=c[m+0>>2];c[j+0>>2]=c[l+0>>2];Fg(a,0,k,j,f,g,h);i=b;return}function Fg(b,e,f,g,j,k,l){b=b|0;e=e|0;f=f|0;g=g|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0;o=i;i=i+256|0;w=o+208|0;A=o+200|0;x=o+240|0;n=o;e=o+188|0;r=o+184|0;s=o+16|0;u=o+176|0;t=o+180|0;q=o+241|0;v=o+242|0;ih(n,j,w,A,x);c[e+0>>2]=0;c[e+4>>2]=0;c[e+8>>2]=0;He(e,10,0);if((a[e]&1)==0){D=e+1|0;y=D;z=e+8|0}else{D=e+8|0;y=e+1|0;z=D;D=c[D>>2]|0}c[r>>2]=D;c[u>>2]=s;c[t>>2]=0;a[q]=1;a[v]=69;j=e+4|0;A=a[A]|0;B=a[x]|0;x=c[f>>2]|0;a:while(1){if((x|0)!=0){if((c[x+12>>2]|0)==(c[x+16>>2]|0)?(sc[c[(c[x>>2]|0)+36>>2]&127](x)|0)==-1:0){c[f>>2]=0;x=0}}else{x=0}E=(x|0)==0;C=c[g>>2]|0;do{if((C|0)!=0){if((c[C+12>>2]|0)!=(c[C+16>>2]|0)){if(E){break}else{break a}}if(!((sc[c[(c[C>>2]|0)+36>>2]&127](C)|0)==-1)){if(E){break}else{break a}}else{c[g>>2]=0;m=14;break}}else{m=14}}while(0);if((m|0)==14){m=0;if(E){C=0;break}else{C=0}}E=a[e]|0;G=(E&1)==0;if(G){F=(E&255)>>>1}else{F=c[j>>2]|0}if(((c[r>>2]|0)-D|0)==(F|0)){if(G){D=(E&255)>>>1;E=(E&255)>>>1}else{E=c[j>>2]|0;D=E}He(e,D<<1,0);if((a[e]&1)==0){D=10}else{D=(c[e>>2]&-2)+ -1|0}He(e,D,0);if((a[e]&1)==0){D=y}else{D=c[z>>2]|0}c[r>>2]=D+E}F=x+12|0;G=c[F>>2]|0;E=x+16|0;if((G|0)==(c[E>>2]|0)){G=sc[c[(c[x>>2]|0)+36>>2]&127](x)|0}else{G=d[G]|0}if((jh(G&255,q,v,D,r,A,B,n,s,u,t,w)|0)!=0){break}C=c[F>>2]|0;if((C|0)==(c[E>>2]|0)){sc[c[(c[x>>2]|0)+40>>2]&127](x)|0;continue}else{c[F>>2]=C+1;continue}}v=a[n]|0;if((v&1)==0){v=(v&255)>>>1}else{v=c[n+4>>2]|0}if(((v|0)!=0?(a[q]|0)!=0:0)?(p=c[u>>2]|0,(p-s|0)<160):0){G=c[t>>2]|0;c[u>>2]=p+4;c[p>>2]=G}h[l>>3]=+Vl(D,c[r>>2]|0,k);tj(n,s,c[u>>2]|0,k);if((x|0)!=0){if((c[x+12>>2]|0)==(c[x+16>>2]|0)?(sc[c[(c[x>>2]|0)+36>>2]&127](x)|0)==-1:0){c[f>>2]=0;x=0}}else{x=0}p=(x|0)==0;do{if((C|0)!=0){if((c[C+12>>2]|0)!=(c[C+16>>2]|0)){if(!p){break}c[b>>2]=x;Fe(e);Fe(n);i=o;return}if((sc[c[(c[C>>2]|0)+36>>2]&127](C)|0)==-1){c[g>>2]=0;m=51;break}if(p^(C|0)==0){c[b>>2]=x;Fe(e);Fe(n);i=o;return}}else{m=51}}while(0);if((m|0)==51?!p:0){c[b>>2]=x;Fe(e);Fe(n);i=o;return}c[k>>2]=c[k>>2]|2;c[b>>2]=x;Fe(e);Fe(n);i=o;return}function Gg(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;m=b+4|0;l=b;c[m>>2]=c[d>>2];c[l>>2]=c[e>>2];c[k+0>>2]=c[m+0>>2];c[j+0>>2]=c[l+0>>2];Hg(a,0,k,j,f,g,h);i=b;return}function Hg(b,e,f,g,j,k,l){b=b|0;e=e|0;f=f|0;g=g|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0;o=i;i=i+256|0;w=o+208|0;A=o+200|0;x=o+240|0;n=o;e=o+188|0;r=o+184|0;s=o+16|0;u=o+176|0;t=o+180|0;q=o+241|0;v=o+242|0;ih(n,j,w,A,x);c[e+0>>2]=0;c[e+4>>2]=0;c[e+8>>2]=0;He(e,10,0);if((a[e]&1)==0){D=e+1|0;y=D;z=e+8|0}else{D=e+8|0;y=e+1|0;z=D;D=c[D>>2]|0}c[r>>2]=D;c[u>>2]=s;c[t>>2]=0;a[q]=1;a[v]=69;j=e+4|0;A=a[A]|0;B=a[x]|0;x=c[f>>2]|0;a:while(1){if((x|0)!=0){if((c[x+12>>2]|0)==(c[x+16>>2]|0)?(sc[c[(c[x>>2]|0)+36>>2]&127](x)|0)==-1:0){c[f>>2]=0;x=0}}else{x=0}E=(x|0)==0;C=c[g>>2]|0;do{if((C|0)!=0){if((c[C+12>>2]|0)!=(c[C+16>>2]|0)){if(E){break}else{break a}}if(!((sc[c[(c[C>>2]|0)+36>>2]&127](C)|0)==-1)){if(E){break}else{break a}}else{c[g>>2]=0;m=14;break}}else{m=14}}while(0);if((m|0)==14){m=0;if(E){C=0;break}else{C=0}}E=a[e]|0;G=(E&1)==0;if(G){F=(E&255)>>>1}else{F=c[j>>2]|0}if(((c[r>>2]|0)-D|0)==(F|0)){if(G){D=(E&255)>>>1;E=(E&255)>>>1}else{E=c[j>>2]|0;D=E}He(e,D<<1,0);if((a[e]&1)==0){D=10}else{D=(c[e>>2]&-2)+ -1|0}He(e,D,0);if((a[e]&1)==0){D=y}else{D=c[z>>2]|0}c[r>>2]=D+E}F=x+12|0;G=c[F>>2]|0;E=x+16|0;if((G|0)==(c[E>>2]|0)){G=sc[c[(c[x>>2]|0)+36>>2]&127](x)|0}else{G=d[G]|0}if((jh(G&255,q,v,D,r,A,B,n,s,u,t,w)|0)!=0){break}C=c[F>>2]|0;if((C|0)==(c[E>>2]|0)){sc[c[(c[x>>2]|0)+40>>2]&127](x)|0;continue}else{c[F>>2]=C+1;continue}}v=a[n]|0;if((v&1)==0){v=(v&255)>>>1}else{v=c[n+4>>2]|0}if(((v|0)!=0?(a[q]|0)!=0:0)?(p=c[u>>2]|0,(p-s|0)<160):0){G=c[t>>2]|0;c[u>>2]=p+4;c[p>>2]=G}h[l>>3]=+Ul(D,c[r>>2]|0,k);tj(n,s,c[u>>2]|0,k);if((x|0)!=0){if((c[x+12>>2]|0)==(c[x+16>>2]|0)?(sc[c[(c[x>>2]|0)+36>>2]&127](x)|0)==-1:0){c[f>>2]=0;x=0}}else{x=0}p=(x|0)==0;do{if((C|0)!=0){if((c[C+12>>2]|0)!=(c[C+16>>2]|0)){if(!p){break}c[b>>2]=x;Fe(e);Fe(n);i=o;return}if((sc[c[(c[C>>2]|0)+36>>2]&127](C)|0)==-1){c[g>>2]=0;m=51;break}if(p^(C|0)==0){c[b>>2]=x;Fe(e);Fe(n);i=o;return}}else{m=51}}while(0);if((m|0)==51?!p:0){c[b>>2]=x;Fe(e);Fe(n);i=o;return}c[k>>2]=c[k>>2]|2;c[b>>2]=x;Fe(e);Fe(n);i=o;return}function Ig(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0;e=i;i=i+240|0;o=e;p=e+204|0;m=e+192|0;q=e+188|0;n=e+176|0;y=e+16|0;c[m+0>>2]=0;c[m+4>>2]=0;c[m+8>>2]=0;Ze(q,h);h=c[q>>2]|0;if(!((c[1500]|0)==-1)){c[o>>2]=6e3;c[o+4>>2]=117;c[o+8>>2]=0;Ae(6e3,o,118)}s=(c[6004>>2]|0)+ -1|0;r=c[h+8>>2]|0;if(!((c[h+12>>2]|0)-r>>2>>>0>s>>>0)){F=xb(4)|0;wm(F);ec(F|0,13960,106)}h=c[r+(s<<2)>>2]|0;if((h|0)==0){F=xb(4)|0;wm(F);ec(F|0,13960,106)}yc[c[(c[h>>2]|0)+32>>2]&7](h,4544,4570|0,p)|0;ge(c[q>>2]|0)|0;c[n+0>>2]=0;c[n+4>>2]=0;c[n+8>>2]=0;He(n,10,0);if((a[n]&1)==0){A=n+1|0;w=A;x=n+8|0}else{A=n+8|0;w=n+1|0;x=A;A=c[A>>2]|0}u=n+4|0;v=p+24|0;t=p+25|0;s=y;q=p+26|0;r=p;h=m+4|0;C=c[f>>2]|0;z=0;B=A;a:while(1){if((C|0)!=0){if((c[C+12>>2]|0)==(c[C+16>>2]|0)?(sc[c[(c[C>>2]|0)+36>>2]&127](C)|0)==-1:0){c[f>>2]=0;C=0}}else{C=0}E=(C|0)==0;D=c[g>>2]|0;do{if((D|0)!=0){if((c[D+12>>2]|0)!=(c[D+16>>2]|0)){if(E){break}else{break a}}if(!((sc[c[(c[D>>2]|0)+36>>2]&127](D)|0)==-1)){if(E){break}else{break a}}else{c[g>>2]=0;l=19;break}}else{l=19}}while(0);if((l|0)==19?(l=0,E):0){break}D=a[n]|0;E=(D&1)==0;if(E){F=(D&255)>>>1}else{F=c[u>>2]|0}if((B-A|0)==(F|0)){if(E){A=(D&255)>>>1;B=(D&255)>>>1}else{B=c[u>>2]|0;A=B}He(n,A<<1,0);if((a[n]&1)==0){A=10}else{A=(c[n>>2]&-2)+ -1|0}He(n,A,0);if((a[n]&1)==0){A=w}else{A=c[x>>2]|0}B=A+B|0}D=c[C+12>>2]|0;if((D|0)==(c[C+16>>2]|0)){C=sc[c[(c[C>>2]|0)+36>>2]&127](C)|0}else{C=d[D]|0}D=C&255;C=(B|0)==(A|0);do{if(C){E=(a[v]|0)==D<<24>>24;if(!E?!((a[t]|0)==D<<24>>24):0){l=40;break}a[B]=E?43:45;B=B+1|0;z=0}else{l=40}}while(0);do{if((l|0)==40){l=0;E=a[m]|0;if((E&1)==0){E=(E&255)>>>1}else{E=c[h>>2]|0}if((E|0)!=0&D<<24>>24==0){if((y-s|0)>=160){break}c[y>>2]=z;y=y+4|0;z=0;break}else{F=p}while(1){E=F+1|0;if((a[F]|0)==D<<24>>24){break}if((E|0)==(q|0)){F=q;break}else{F=E}}D=F-r|0;if((D|0)>23){break a}if((D|0)<22){a[B]=a[4544+D|0]|0;B=B+1|0;z=z+1|0;break}if(C){A=B;break a}if((B-A|0)>=3){break a}if((a[B+ -1|0]|0)!=48){break a}a[B]=a[4544+D|0]|0;B=B+1|0;z=0}}while(0);C=c[f>>2]|0;D=C+12|0;E=c[D>>2]|0;if((E|0)==(c[C+16>>2]|0)){sc[c[(c[C>>2]|0)+40>>2]&127](C)|0;continue}else{c[D>>2]=E+1;continue}}a[A+3|0]=0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}F=c[1472]|0;c[o>>2]=k;if((Kg(A,F,4584,o)|0)!=1){c[j>>2]=4}k=c[f>>2]|0;if((k|0)!=0){if((c[k+12>>2]|0)==(c[k+16>>2]|0)?(sc[c[(c[k>>2]|0)+36>>2]&127](k)|0)==-1:0){c[f>>2]=0;f=0}else{f=k}}else{f=0}k=(f|0)==0;o=c[g>>2]|0;do{if((o|0)!=0){if((c[o+12>>2]|0)!=(c[o+16>>2]|0)){if(!k){break}c[b>>2]=f;Fe(n);Fe(m);i=e;return}if((sc[c[(c[o>>2]|0)+36>>2]&127](o)|0)==-1){c[g>>2]=0;l=72;break}if(k^(o|0)==0){c[b>>2]=f;Fe(n);Fe(m);i=e;return}}else{l=72}}while(0);if((l|0)==72?!k:0){c[b>>2]=f;Fe(n);Fe(m);i=e;return}c[j>>2]=c[j>>2]|2;c[b>>2]=f;Fe(n);Fe(m);i=e;return}function Jg(b,d,e,f,g,h,j,k,l,m){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0;n=i;p=c[f>>2]|0;o=(p|0)==(e|0);do{if(o){q=(a[m+24|0]|0)==b<<24>>24;if(!q?!((a[m+25|0]|0)==b<<24>>24):0){break}c[f>>2]=e+1;a[e]=q?43:45;c[g>>2]=0;q=0;i=n;return q|0}}while(0);q=a[j]|0;if((q&1)==0){j=(q&255)>>>1}else{j=c[j+4>>2]|0}if((j|0)!=0&b<<24>>24==h<<24>>24){o=c[l>>2]|0;if((o-k|0)>=160){q=0;i=n;return q|0}q=c[g>>2]|0;c[l>>2]=o+4;c[o>>2]=q;c[g>>2]=0;q=0;i=n;return q|0}l=m+26|0;k=m;while(1){h=k+1|0;if((a[k]|0)==b<<24>>24){break}if((h|0)==(l|0)){k=l;break}else{k=h}}m=k-m|0;if((m|0)>23){q=-1;i=n;return q|0}if((d|0)==10|(d|0)==8){if((m|0)>=(d|0)){q=-1;i=n;return q|0}}else if((d|0)==16?(m|0)>=22:0){if(o){q=-1;i=n;return q|0}if((p-e|0)>=3){q=-1;i=n;return q|0}if((a[p+ -1|0]|0)!=48){q=-1;i=n;return q|0}c[g>>2]=0;q=a[4544+m|0]|0;c[f>>2]=p+1;a[p]=q;q=0;i=n;return q|0}q=a[4544+m|0]|0;c[f>>2]=p+1;a[p]=q;c[g>>2]=(c[g>>2]|0)+1;q=0;i=n;return q|0}function Kg(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0;f=i;i=i+16|0;g=f;c[g>>2]=e;b=Bb(b|0)|0;d=Fa(a|0,d|0,g|0)|0;if((b|0)==0){i=f;return d|0}Bb(b|0)|0;i=f;return d|0}function Lg(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function Mg(a){a=a|0;return}function Ng(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0;k=i;i=i+80|0;l=k;s=k+24|0;q=k+28|0;r=k+32|0;u=k+16|0;t=k+12|0;p=k+20|0;m=k+36|0;n=k+40|0;o=k+64|0;if((c[g+4>>2]&1|0)==0){c[q>>2]=-1;p=c[(c[d>>2]|0)+16>>2]|0;c[u>>2]=c[e>>2];c[t>>2]=c[f>>2];c[s+0>>2]=c[u+0>>2];c[l+0>>2]=c[t+0>>2];nc[p&63](r,d,s,l,g,h,q);l=c[r>>2]|0;c[e>>2]=l;e=c[q>>2]|0;if((e|0)==1){a[j]=1}else if((e|0)==0){a[j]=0}else{a[j]=1;c[h>>2]=4}c[b>>2]=l;i=k;return}Ze(p,g);q=c[p>>2]|0;if(!((c[1498]|0)==-1)){c[l>>2]=5992;c[l+4>>2]=117;c[l+8>>2]=0;Ae(5992,l,118)}d=(c[5996>>2]|0)+ -1|0;r=c[q+8>>2]|0;if(!((c[q+12>>2]|0)-r>>2>>>0>d>>>0)){u=xb(4)|0;wm(u);ec(u|0,13960,106)}q=c[r+(d<<2)>>2]|0;if((q|0)==0){u=xb(4)|0;wm(u);ec(u|0,13960,106)}ge(c[p>>2]|0)|0;Ze(m,g);g=c[m>>2]|0;if(!((c[1538]|0)==-1)){c[l>>2]=6152;c[l+4>>2]=117;c[l+8>>2]=0;Ae(6152,l,118)}r=(c[6156>>2]|0)+ -1|0;p=c[g+8>>2]|0;if(!((c[g+12>>2]|0)-p>>2>>>0>r>>>0)){u=xb(4)|0;wm(u);ec(u|0,13960,106)}g=c[p+(r<<2)>>2]|0;if((g|0)==0){u=xb(4)|0;wm(u);ec(u|0,13960,106)}ge(c[m>>2]|0)|0;qc[c[(c[g>>2]|0)+24>>2]&63](n,g);qc[c[(c[g>>2]|0)+28>>2]&63](n+12|0,g);c[o>>2]=c[f>>2];u=n+24|0;c[l+0>>2]=c[o+0>>2];a[j]=(Og(e,l,n,u,q,h,1)|0)==(n|0)|0;c[b>>2]=c[e>>2];Qe(n+12|0);Qe(n);i=k;return}function Og(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0;k=i;i=i+112|0;o=k;s=(f-e|0)/12|0;if(s>>>0>100){o=Rm(s)|0;if((o|0)==0){bn()}else{m=o;n=o}}else{m=0;n=o}o=(e|0)==(f|0);if(o){t=0}else{p=e;t=0;q=n;while(1){r=a[p]|0;if((r&1)==0){r=(r&255)>>>1}else{r=c[p+4>>2]|0}if((r|0)==0){a[q]=2;t=t+1|0;s=s+ -1|0}else{a[q]=1}p=p+12|0;if((p|0)==(f|0)){break}else{q=q+1|0}}}p=0;a:while(1){r=c[b>>2]|0;do{if((r|0)!=0){q=c[r+12>>2]|0;if((q|0)==(c[r+16>>2]|0)){q=sc[c[(c[r>>2]|0)+36>>2]&127](r)|0}else{q=c[q>>2]|0}if((q|0)==-1){c[b>>2]=0;r=1;break}else{r=(c[b>>2]|0)==0;break}}else{r=1}}while(0);q=c[d>>2]|0;if((q|0)!=0){u=c[q+12>>2]|0;if((u|0)==(c[q+16>>2]|0)){u=sc[c[(c[q>>2]|0)+36>>2]&127](q)|0}else{u=c[u>>2]|0}if((u|0)==-1){c[d>>2]=0;q=0;v=1}else{v=0}}else{q=0;v=1}u=c[b>>2]|0;if(!((r^v)&(s|0)!=0)){break}q=c[u+12>>2]|0;if((q|0)==(c[u+16>>2]|0)){r=sc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{r=c[q>>2]|0}if(!j){r=Bc[c[(c[g>>2]|0)+28>>2]&15](g,r)|0}q=p+1|0;if(o){p=q;continue}b:do{if(j){w=0;u=e;v=n;while(1){do{if((a[v]|0)==1){z=a[u]|0;y=(z&1)==0;if(y){x=u+4|0}else{x=c[u+8>>2]|0}if((r|0)!=(c[x+(p<<2)>>2]|0)){a[v]=0;s=s+ -1|0;break}if(y){w=(z&255)>>>1}else{w=c[u+4>>2]|0}if((w|0)==(q|0)){a[v]=2;w=1;t=t+1|0;s=s+ -1|0}else{w=1}}}while(0);u=u+12|0;if((u|0)==(f|0)){break b}v=v+1|0}}else{w=0;u=e;v=n;while(1){do{if((a[v]|0)==1){if((a[u]&1)==0){x=u+4|0}else{x=c[u+8>>2]|0}if((r|0)!=(Bc[c[(c[g>>2]|0)+28>>2]&15](g,c[x+(p<<2)>>2]|0)|0)){a[v]=0;s=s+ -1|0;break}w=a[u]|0;if((w&1)==0){w=(w&255)>>>1}else{w=c[u+4>>2]|0}if((w|0)==(q|0)){a[v]=2;w=1;t=t+1|0;s=s+ -1|0}else{w=1}}}while(0);u=u+12|0;if((u|0)==(f|0)){break b}v=v+1|0}}}while(0);if(!w){p=q;continue}p=c[b>>2]|0;r=p+12|0;u=c[r>>2]|0;if((u|0)==(c[p+16>>2]|0)){sc[c[(c[p>>2]|0)+40>>2]&127](p)|0}else{c[r>>2]=u+4}if((s+t|0)>>>0<2){p=q;continue}else{r=e;p=n}while(1){if((a[p]|0)==2){u=a[r]|0;if((u&1)==0){u=(u&255)>>>1}else{u=c[r+4>>2]|0}if((u|0)!=(q|0)){a[p]=0;t=t+ -1|0}}r=r+12|0;if((r|0)==(f|0)){p=q;continue a}else{p=p+1|0}}}do{if((u|0)!=0){g=c[u+12>>2]|0;if((g|0)==(c[u+16>>2]|0)){g=sc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{g=c[g>>2]|0}if((g|0)==-1){c[b>>2]=0;b=1;break}else{b=(c[b>>2]|0)==0;break}}else{b=1}}while(0);do{if((q|0)!=0){g=c[q+12>>2]|0;if((g|0)==(c[q+16>>2]|0)){g=sc[c[(c[q>>2]|0)+36>>2]&127](q)|0}else{g=c[g>>2]|0}if(!((g|0)==-1)){if(b){break}else{l=87;break}}else{c[d>>2]=0;l=85;break}}else{l=85}}while(0);if((l|0)==85?b:0){l=87}if((l|0)==87){c[h>>2]=c[h>>2]|2}c:do{if(!o){if((a[n]|0)==2){f=e}else{while(1){e=e+12|0;n=n+1|0;if((e|0)==(f|0)){l=92;break c}if((a[n]|0)==2){f=e;break}}}}else{l=92}}while(0);if((l|0)==92){c[h>>2]=c[h>>2]|4}if((m|0)==0){i=k;return f|0}Sm(m);i=k;return f|0}function Pg(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;m=b+4|0;l=b;c[m>>2]=c[d>>2];c[l>>2]=c[e>>2];c[k+0>>2]=c[m+0>>2];c[j+0>>2]=c[l+0>>2];Qg(a,0,k,j,f,g,h);i=b;return}function Qg(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0;m=i;i=i+304|0;t=m+160|0;u=m+280|0;d=m+264|0;l=m+284|0;p=m+300|0;q=m;o=m+276|0;r=m+296|0;s=c[g+4>>2]&74;if((s|0)==64){s=8}else if((s|0)==8){s=16}else if((s|0)==0){s=0}else{s=10}kh(d,g,t,u);c[l+0>>2]=0;c[l+4>>2]=0;c[l+8>>2]=0;He(l,10,0);if((a[l]&1)==0){z=l+1|0;w=z;v=l+8|0}else{z=l+8|0;w=l+1|0;v=z;z=c[z>>2]|0}c[p>>2]=z;c[o>>2]=q;c[r>>2]=0;g=l+4|0;x=c[u>>2]|0;u=c[e>>2]|0;a:while(1){if((u|0)!=0){y=c[u+12>>2]|0;if((y|0)==(c[u+16>>2]|0)){y=sc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{y=c[y>>2]|0}if((y|0)==-1){c[e>>2]=0;A=1;u=0}else{A=0}}else{A=1;u=0}y=c[f>>2]|0;do{if((y|0)!=0){B=c[y+12>>2]|0;if((B|0)==(c[y+16>>2]|0)){B=sc[c[(c[y>>2]|0)+36>>2]&127](y)|0}else{B=c[B>>2]|0}if(!((B|0)==-1)){if(A){break}else{break a}}else{c[f>>2]=0;k=21;break}}else{k=21}}while(0);if((k|0)==21){k=0;if(A){y=0;break}else{y=0}}A=a[l]|0;B=(A&1)==0;if(B){C=(A&255)>>>1}else{C=c[g>>2]|0}if(((c[p>>2]|0)-z|0)==(C|0)){if(B){z=(A&255)>>>1;A=(A&255)>>>1}else{A=c[g>>2]|0;z=A}He(l,z<<1,0);if((a[l]&1)==0){z=10}else{z=(c[l>>2]&-2)+ -1|0}He(l,z,0);if((a[l]&1)==0){z=w}else{z=c[v>>2]|0}c[p>>2]=z+A}B=u+12|0;C=c[B>>2]|0;A=u+16|0;if((C|0)==(c[A>>2]|0)){C=sc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{C=c[C>>2]|0}if((gh(C,s,z,p,r,x,d,q,o,t)|0)!=0){break}y=c[B>>2]|0;if((y|0)==(c[A>>2]|0)){sc[c[(c[u>>2]|0)+40>>2]&127](u)|0;continue}else{c[B>>2]=y+4;continue}}t=a[d]|0;if((t&1)==0){t=(t&255)>>>1}else{t=c[d+4>>2]|0}if((t|0)!=0?(n=c[o>>2]|0,(n-q|0)<160):0){C=c[r>>2]|0;c[o>>2]=n+4;c[n>>2]=C}c[j>>2]=am(z,c[p>>2]|0,h,s)|0;tj(d,q,c[o>>2]|0,h);if((u|0)!=0){j=c[u+12>>2]|0;if((j|0)==(c[u+16>>2]|0)){j=sc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{j=c[j>>2]|0}if((j|0)==-1){c[e>>2]=0;u=0;e=1}else{e=0}}else{u=0;e=1}do{if((y|0)!=0){j=c[y+12>>2]|0;if((j|0)==(c[y+16>>2]|0)){j=sc[c[(c[y>>2]|0)+36>>2]&127](y)|0}else{j=c[j>>2]|0}if((j|0)==-1){c[f>>2]=0;k=60;break}if(e){c[b>>2]=u;Fe(l);Fe(d);i=m;return}}else{k=60}}while(0);if((k|0)==60?!e:0){c[b>>2]=u;Fe(l);Fe(d);i=m;return}c[h>>2]=c[h>>2]|2;c[b>>2]=u;Fe(l);Fe(d);i=m;return}function Rg(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;m=b+4|0;l=b;c[m>>2]=c[d>>2];c[l>>2]=c[e>>2];c[k+0>>2]=c[m+0>>2];c[j+0>>2]=c[l+0>>2];Sg(a,0,k,j,f,g,h);i=b;return}function Sg(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0;m=i;i=i+304|0;t=m+160|0;u=m+280|0;d=m+264|0;l=m+284|0;p=m+300|0;q=m;o=m+276|0;r=m+296|0;s=c[g+4>>2]&74;if((s|0)==0){s=0}else if((s|0)==64){s=8}else if((s|0)==8){s=16}else{s=10}kh(d,g,t,u);c[l+0>>2]=0;c[l+4>>2]=0;c[l+8>>2]=0;He(l,10,0);if((a[l]&1)==0){z=l+1|0;w=z;v=l+8|0}else{z=l+8|0;w=l+1|0;v=z;z=c[z>>2]|0}c[p>>2]=z;c[o>>2]=q;c[r>>2]=0;g=l+4|0;x=c[u>>2]|0;u=c[e>>2]|0;a:while(1){if((u|0)!=0){y=c[u+12>>2]|0;if((y|0)==(c[u+16>>2]|0)){y=sc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{y=c[y>>2]|0}if((y|0)==-1){c[e>>2]=0;A=1;u=0}else{A=0}}else{A=1;u=0}y=c[f>>2]|0;do{if((y|0)!=0){B=c[y+12>>2]|0;if((B|0)==(c[y+16>>2]|0)){B=sc[c[(c[y>>2]|0)+36>>2]&127](y)|0}else{B=c[B>>2]|0}if(!((B|0)==-1)){if(A){break}else{break a}}else{c[f>>2]=0;k=21;break}}else{k=21}}while(0);if((k|0)==21){k=0;if(A){y=0;break}else{y=0}}A=a[l]|0;B=(A&1)==0;if(B){C=(A&255)>>>1}else{C=c[g>>2]|0}if(((c[p>>2]|0)-z|0)==(C|0)){if(B){z=(A&255)>>>1;A=(A&255)>>>1}else{A=c[g>>2]|0;z=A}He(l,z<<1,0);if((a[l]&1)==0){z=10}else{z=(c[l>>2]&-2)+ -1|0}He(l,z,0);if((a[l]&1)==0){z=w}else{z=c[v>>2]|0}c[p>>2]=z+A}B=u+12|0;C=c[B>>2]|0;A=u+16|0;if((C|0)==(c[A>>2]|0)){C=sc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{C=c[C>>2]|0}if((gh(C,s,z,p,r,x,d,q,o,t)|0)!=0){break}y=c[B>>2]|0;if((y|0)==(c[A>>2]|0)){sc[c[(c[u>>2]|0)+40>>2]&127](u)|0;continue}else{c[B>>2]=y+4;continue}}t=a[d]|0;if((t&1)==0){t=(t&255)>>>1}else{t=c[d+4>>2]|0}if((t|0)!=0?(n=c[o>>2]|0,(n-q|0)<160):0){C=c[r>>2]|0;c[o>>2]=n+4;c[n>>2]=C}B=$l(z,c[p>>2]|0,h,s)|0;C=j;c[C>>2]=B;c[C+4>>2]=I;tj(d,q,c[o>>2]|0,h);if((u|0)!=0){j=c[u+12>>2]|0;if((j|0)==(c[u+16>>2]|0)){j=sc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{j=c[j>>2]|0}if((j|0)==-1){c[e>>2]=0;u=0;e=1}else{e=0}}else{u=0;e=1}do{if((y|0)!=0){j=c[y+12>>2]|0;if((j|0)==(c[y+16>>2]|0)){j=sc[c[(c[y>>2]|0)+36>>2]&127](y)|0}else{j=c[j>>2]|0}if((j|0)==-1){c[f>>2]=0;k=60;break}if(e){c[b>>2]=u;Fe(l);Fe(d);i=m;return}}else{k=60}}while(0);if((k|0)==60?!e:0){c[b>>2]=u;Fe(l);Fe(d);i=m;return}c[h>>2]=c[h>>2]|2;c[b>>2]=u;Fe(l);Fe(d);i=m;return}function Tg(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;m=b+4|0;l=b;c[m>>2]=c[d>>2];c[l>>2]=c[e>>2];c[k+0>>2]=c[m+0>>2];c[j+0>>2]=c[l+0>>2];Ug(a,0,k,j,f,g,h);i=b;return}function Ug(d,e,f,g,h,j,k){d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;n=i;i=i+304|0;u=n+160|0;v=n+280|0;e=n+264|0;m=n+284|0;q=n+300|0;r=n;p=n+276|0;s=n+296|0;t=c[h+4>>2]&74;if((t|0)==0){t=0}else if((t|0)==8){t=16}else if((t|0)==64){t=8}else{t=10}kh(e,h,u,v);c[m+0>>2]=0;c[m+4>>2]=0;c[m+8>>2]=0;He(m,10,0);if((a[m]&1)==0){A=m+1|0;x=A;w=m+8|0}else{A=m+8|0;x=m+1|0;w=A;A=c[A>>2]|0}c[q>>2]=A;c[p>>2]=r;c[s>>2]=0;h=m+4|0;y=c[v>>2]|0;v=c[f>>2]|0;a:while(1){if((v|0)!=0){z=c[v+12>>2]|0;if((z|0)==(c[v+16>>2]|0)){z=sc[c[(c[v>>2]|0)+36>>2]&127](v)|0}else{z=c[z>>2]|0}if((z|0)==-1){c[f>>2]=0;B=1;v=0}else{B=0}}else{B=1;v=0}z=c[g>>2]|0;do{if((z|0)!=0){C=c[z+12>>2]|0;if((C|0)==(c[z+16>>2]|0)){C=sc[c[(c[z>>2]|0)+36>>2]&127](z)|0}else{C=c[C>>2]|0}if(!((C|0)==-1)){if(B){break}else{break a}}else{c[g>>2]=0;l=21;break}}else{l=21}}while(0);if((l|0)==21){l=0;if(B){z=0;break}else{z=0}}B=a[m]|0;C=(B&1)==0;if(C){D=(B&255)>>>1}else{D=c[h>>2]|0}if(((c[q>>2]|0)-A|0)==(D|0)){if(C){A=(B&255)>>>1;B=(B&255)>>>1}else{B=c[h>>2]|0;A=B}He(m,A<<1,0);if((a[m]&1)==0){A=10}else{A=(c[m>>2]&-2)+ -1|0}He(m,A,0);if((a[m]&1)==0){A=x}else{A=c[w>>2]|0}c[q>>2]=A+B}C=v+12|0;D=c[C>>2]|0;B=v+16|0;if((D|0)==(c[B>>2]|0)){D=sc[c[(c[v>>2]|0)+36>>2]&127](v)|0}else{D=c[D>>2]|0}if((gh(D,t,A,q,s,y,e,r,p,u)|0)!=0){break}z=c[C>>2]|0;if((z|0)==(c[B>>2]|0)){sc[c[(c[v>>2]|0)+40>>2]&127](v)|0;continue}else{c[C>>2]=z+4;continue}}u=a[e]|0;if((u&1)==0){u=(u&255)>>>1}else{u=c[e+4>>2]|0}if((u|0)!=0?(o=c[p>>2]|0,(o-r|0)<160):0){D=c[s>>2]|0;c[p>>2]=o+4;c[o>>2]=D}b[k>>1]=_l(A,c[q>>2]|0,j,t)|0;tj(e,r,c[p>>2]|0,j);if((v|0)!=0){k=c[v+12>>2]|0;if((k|0)==(c[v+16>>2]|0)){k=sc[c[(c[v>>2]|0)+36>>2]&127](v)|0}else{k=c[k>>2]|0}if((k|0)==-1){c[f>>2]=0;v=0;f=1}else{f=0}}else{v=0;f=1}do{if((z|0)!=0){k=c[z+12>>2]|0;if((k|0)==(c[z+16>>2]|0)){k=sc[c[(c[z>>2]|0)+36>>2]&127](z)|0}else{k=c[k>>2]|0}if((k|0)==-1){c[g>>2]=0;l=60;break}if(f){c[d>>2]=v;Fe(m);Fe(e);i=n;return}}else{l=60}}while(0);if((l|0)==60?!f:0){c[d>>2]=v;Fe(m);Fe(e);i=n;return}c[j>>2]=c[j>>2]|2;c[d>>2]=v;Fe(m);Fe(e);i=n;return}function Vg(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;m=b+4|0;l=b;c[m>>2]=c[d>>2];c[l>>2]=c[e>>2];c[k+0>>2]=c[m+0>>2];c[j+0>>2]=c[l+0>>2];Wg(a,0,k,j,f,g,h);i=b;return}function Wg(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0;m=i;i=i+304|0;t=m+160|0;u=m+280|0;d=m+264|0;l=m+284|0;p=m+300|0;q=m;o=m+276|0;r=m+296|0;s=c[g+4>>2]&74;if((s|0)==8){s=16}else if((s|0)==0){s=0}else if((s|0)==64){s=8}else{s=10}kh(d,g,t,u);c[l+0>>2]=0;c[l+4>>2]=0;c[l+8>>2]=0;He(l,10,0);if((a[l]&1)==0){z=l+1|0;w=z;v=l+8|0}else{z=l+8|0;w=l+1|0;v=z;z=c[z>>2]|0}c[p>>2]=z;c[o>>2]=q;c[r>>2]=0;g=l+4|0;x=c[u>>2]|0;u=c[e>>2]|0;a:while(1){if((u|0)!=0){y=c[u+12>>2]|0;if((y|0)==(c[u+16>>2]|0)){y=sc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{y=c[y>>2]|0}if((y|0)==-1){c[e>>2]=0;A=1;u=0}else{A=0}}else{A=1;u=0}y=c[f>>2]|0;do{if((y|0)!=0){B=c[y+12>>2]|0;if((B|0)==(c[y+16>>2]|0)){B=sc[c[(c[y>>2]|0)+36>>2]&127](y)|0}else{B=c[B>>2]|0}if(!((B|0)==-1)){if(A){break}else{break a}}else{c[f>>2]=0;k=21;break}}else{k=21}}while(0);if((k|0)==21){k=0;if(A){y=0;break}else{y=0}}A=a[l]|0;B=(A&1)==0;if(B){C=(A&255)>>>1}else{C=c[g>>2]|0}if(((c[p>>2]|0)-z|0)==(C|0)){if(B){z=(A&255)>>>1;A=(A&255)>>>1}else{A=c[g>>2]|0;z=A}He(l,z<<1,0);if((a[l]&1)==0){z=10}else{z=(c[l>>2]&-2)+ -1|0}He(l,z,0);if((a[l]&1)==0){z=w}else{z=c[v>>2]|0}c[p>>2]=z+A}B=u+12|0;C=c[B>>2]|0;A=u+16|0;if((C|0)==(c[A>>2]|0)){C=sc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{C=c[C>>2]|0}if((gh(C,s,z,p,r,x,d,q,o,t)|0)!=0){break}y=c[B>>2]|0;if((y|0)==(c[A>>2]|0)){sc[c[(c[u>>2]|0)+40>>2]&127](u)|0;continue}else{c[B>>2]=y+4;continue}}t=a[d]|0;if((t&1)==0){t=(t&255)>>>1}else{t=c[d+4>>2]|0}if((t|0)!=0?(n=c[o>>2]|0,(n-q|0)<160):0){C=c[r>>2]|0;c[o>>2]=n+4;c[n>>2]=C}c[j>>2]=Zl(z,c[p>>2]|0,h,s)|0;tj(d,q,c[o>>2]|0,h);if((u|0)!=0){j=c[u+12>>2]|0;if((j|0)==(c[u+16>>2]|0)){j=sc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{j=c[j>>2]|0}if((j|0)==-1){c[e>>2]=0;u=0;e=1}else{e=0}}else{u=0;e=1}do{if((y|0)!=0){j=c[y+12>>2]|0;if((j|0)==(c[y+16>>2]|0)){j=sc[c[(c[y>>2]|0)+36>>2]&127](y)|0}else{j=c[j>>2]|0}if((j|0)==-1){c[f>>2]=0;k=60;break}if(e){c[b>>2]=u;Fe(l);Fe(d);i=m;return}}else{k=60}}while(0);if((k|0)==60?!e:0){c[b>>2]=u;Fe(l);Fe(d);i=m;return}c[h>>2]=c[h>>2]|2;c[b>>2]=u;Fe(l);Fe(d);i=m;return}function Xg(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;m=b+4|0;l=b;c[m>>2]=c[d>>2];c[l>>2]=c[e>>2];c[k+0>>2]=c[m+0>>2];c[j+0>>2]=c[l+0>>2];Yg(a,0,k,j,f,g,h);i=b;return}function Yg(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0;m=i;i=i+304|0;t=m+160|0;u=m+280|0;d=m+264|0;l=m+284|0;p=m+300|0;q=m;o=m+276|0;r=m+296|0;s=c[g+4>>2]&74;if((s|0)==0){s=0}else if((s|0)==8){s=16}else if((s|0)==64){s=8}else{s=10}kh(d,g,t,u);c[l+0>>2]=0;c[l+4>>2]=0;c[l+8>>2]=0;He(l,10,0);if((a[l]&1)==0){z=l+1|0;w=z;v=l+8|0}else{z=l+8|0;w=l+1|0;v=z;z=c[z>>2]|0}c[p>>2]=z;c[o>>2]=q;c[r>>2]=0;g=l+4|0;x=c[u>>2]|0;u=c[e>>2]|0;a:while(1){if((u|0)!=0){y=c[u+12>>2]|0;if((y|0)==(c[u+16>>2]|0)){y=sc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{y=c[y>>2]|0}if((y|0)==-1){c[e>>2]=0;A=1;u=0}else{A=0}}else{A=1;u=0}y=c[f>>2]|0;do{if((y|0)!=0){B=c[y+12>>2]|0;if((B|0)==(c[y+16>>2]|0)){B=sc[c[(c[y>>2]|0)+36>>2]&127](y)|0}else{B=c[B>>2]|0}if(!((B|0)==-1)){if(A){break}else{break a}}else{c[f>>2]=0;k=21;break}}else{k=21}}while(0);if((k|0)==21){k=0;if(A){y=0;break}else{y=0}}A=a[l]|0;B=(A&1)==0;if(B){C=(A&255)>>>1}else{C=c[g>>2]|0}if(((c[p>>2]|0)-z|0)==(C|0)){if(B){z=(A&255)>>>1;A=(A&255)>>>1}else{A=c[g>>2]|0;z=A}He(l,z<<1,0);if((a[l]&1)==0){z=10}else{z=(c[l>>2]&-2)+ -1|0}He(l,z,0);if((a[l]&1)==0){z=w}else{z=c[v>>2]|0}c[p>>2]=z+A}B=u+12|0;C=c[B>>2]|0;A=u+16|0;if((C|0)==(c[A>>2]|0)){C=sc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{C=c[C>>2]|0}if((gh(C,s,z,p,r,x,d,q,o,t)|0)!=0){break}y=c[B>>2]|0;if((y|0)==(c[A>>2]|0)){sc[c[(c[u>>2]|0)+40>>2]&127](u)|0;continue}else{c[B>>2]=y+4;continue}}t=a[d]|0;if((t&1)==0){t=(t&255)>>>1}else{t=c[d+4>>2]|0}if((t|0)!=0?(n=c[o>>2]|0,(n-q|0)<160):0){C=c[r>>2]|0;c[o>>2]=n+4;c[n>>2]=C}c[j>>2]=Yl(z,c[p>>2]|0,h,s)|0;tj(d,q,c[o>>2]|0,h);if((u|0)!=0){j=c[u+12>>2]|0;if((j|0)==(c[u+16>>2]|0)){j=sc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{j=c[j>>2]|0}if((j|0)==-1){c[e>>2]=0;u=0;e=1}else{e=0}}else{u=0;e=1}do{if((y|0)!=0){j=c[y+12>>2]|0;if((j|0)==(c[y+16>>2]|0)){j=sc[c[(c[y>>2]|0)+36>>2]&127](y)|0}else{j=c[j>>2]|0}if((j|0)==-1){c[f>>2]=0;k=60;break}if(e){c[b>>2]=u;Fe(l);Fe(d);i=m;return}}else{k=60}}while(0);if((k|0)==60?!e:0){c[b>>2]=u;Fe(l);Fe(d);i=m;return}c[h>>2]=c[h>>2]|2;c[b>>2]=u;Fe(l);Fe(d);i=m;return}function Zg(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;m=b+4|0;l=b;c[m>>2]=c[d>>2];c[l>>2]=c[e>>2];c[k+0>>2]=c[m+0>>2];c[j+0>>2]=c[l+0>>2];_g(a,0,k,j,f,g,h);i=b;return}function _g(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0;m=i;i=i+304|0;t=m+160|0;u=m+280|0;d=m+264|0;l=m+284|0;p=m+300|0;q=m;o=m+276|0;r=m+296|0;s=c[g+4>>2]&74;if((s|0)==8){s=16}else if((s|0)==0){s=0}else if((s|0)==64){s=8}else{s=10}kh(d,g,t,u);c[l+0>>2]=0;c[l+4>>2]=0;c[l+8>>2]=0;He(l,10,0);if((a[l]&1)==0){z=l+1|0;w=z;v=l+8|0}else{z=l+8|0;w=l+1|0;v=z;z=c[z>>2]|0}c[p>>2]=z;c[o>>2]=q;c[r>>2]=0;g=l+4|0;x=c[u>>2]|0;u=c[e>>2]|0;a:while(1){if((u|0)!=0){y=c[u+12>>2]|0;if((y|0)==(c[u+16>>2]|0)){y=sc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{y=c[y>>2]|0}if((y|0)==-1){c[e>>2]=0;A=1;u=0}else{A=0}}else{A=1;u=0}y=c[f>>2]|0;do{if((y|0)!=0){B=c[y+12>>2]|0;if((B|0)==(c[y+16>>2]|0)){B=sc[c[(c[y>>2]|0)+36>>2]&127](y)|0}else{B=c[B>>2]|0}if(!((B|0)==-1)){if(A){break}else{break a}}else{c[f>>2]=0;k=21;break}}else{k=21}}while(0);if((k|0)==21){k=0;if(A){y=0;break}else{y=0}}A=a[l]|0;B=(A&1)==0;if(B){C=(A&255)>>>1}else{C=c[g>>2]|0}if(((c[p>>2]|0)-z|0)==(C|0)){if(B){z=(A&255)>>>1;A=(A&255)>>>1}else{A=c[g>>2]|0;z=A}He(l,z<<1,0);if((a[l]&1)==0){z=10}else{z=(c[l>>2]&-2)+ -1|0}He(l,z,0);if((a[l]&1)==0){z=w}else{z=c[v>>2]|0}c[p>>2]=z+A}B=u+12|0;C=c[B>>2]|0;A=u+16|0;if((C|0)==(c[A>>2]|0)){C=sc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{C=c[C>>2]|0}if((gh(C,s,z,p,r,x,d,q,o,t)|0)!=0){break}y=c[B>>2]|0;if((y|0)==(c[A>>2]|0)){sc[c[(c[u>>2]|0)+40>>2]&127](u)|0;continue}else{c[B>>2]=y+4;continue}}t=a[d]|0;if((t&1)==0){t=(t&255)>>>1}else{t=c[d+4>>2]|0}if((t|0)!=0?(n=c[o>>2]|0,(n-q|0)<160):0){C=c[r>>2]|0;c[o>>2]=n+4;c[n>>2]=C}B=Xl(z,c[p>>2]|0,h,s)|0;C=j;c[C>>2]=B;c[C+4>>2]=I;tj(d,q,c[o>>2]|0,h);if((u|0)!=0){j=c[u+12>>2]|0;if((j|0)==(c[u+16>>2]|0)){j=sc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{j=c[j>>2]|0}if((j|0)==-1){c[e>>2]=0;u=0;e=1}else{e=0}}else{u=0;e=1}do{if((y|0)!=0){j=c[y+12>>2]|0;if((j|0)==(c[y+16>>2]|0)){j=sc[c[(c[y>>2]|0)+36>>2]&127](y)|0}else{j=c[j>>2]|0}if((j|0)==-1){c[f>>2]=0;k=60;break}if(e){c[b>>2]=u;Fe(l);Fe(d);i=m;return}}else{k=60}}while(0);if((k|0)==60?!e:0){c[b>>2]=u;Fe(l);Fe(d);i=m;return}c[h>>2]=c[h>>2]|2;c[b>>2]=u;Fe(l);Fe(d);i=m;return}function $g(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;m=b+4|0;l=b;c[m>>2]=c[d>>2];c[l>>2]=c[e>>2];c[k+0>>2]=c[m+0>>2];c[j+0>>2]=c[l+0>>2];ah(a,0,k,j,f,g,h);i=b;return}function ah(b,d,e,f,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0;d=i;i=i+352|0;u=d+208|0;z=d+184|0;w=d+4|0;m=d+8|0;n=d+196|0;q=d;p=d+24|0;t=d+192|0;s=d+188|0;r=d+337|0;v=d+336|0;lh(m,h,u,z,w);c[n+0>>2]=0;c[n+4>>2]=0;c[n+8>>2]=0;He(n,10,0);if((a[n]&1)==0){C=n+1|0;h=C;x=n+8|0}else{C=n+8|0;h=n+1|0;x=C;C=c[C>>2]|0}c[q>>2]=C;c[t>>2]=p;c[s>>2]=0;a[r]=1;a[v]=69;y=n+4|0;z=c[z>>2]|0;A=c[w>>2]|0;w=c[e>>2]|0;a:while(1){if((w|0)!=0){B=c[w+12>>2]|0;if((B|0)==(c[w+16>>2]|0)){B=sc[c[(c[w>>2]|0)+36>>2]&127](w)|0}else{B=c[B>>2]|0}if((B|0)==-1){c[e>>2]=0;D=1;w=0}else{D=0}}else{D=1;w=0}B=c[f>>2]|0;do{if((B|0)!=0){E=c[B+12>>2]|0;if((E|0)==(c[B+16>>2]|0)){E=sc[c[(c[B>>2]|0)+36>>2]&127](B)|0}else{E=c[E>>2]|0}if(!((E|0)==-1)){if(D){break}else{break a}}else{c[f>>2]=0;l=17;break}}else{l=17}}while(0);if((l|0)==17){l=0;if(D){B=0;break}else{B=0}}D=a[n]|0;F=(D&1)==0;if(F){E=(D&255)>>>1}else{E=c[y>>2]|0}if(((c[q>>2]|0)-C|0)==(E|0)){if(F){C=(D&255)>>>1;D=(D&255)>>>1}else{D=c[y>>2]|0;C=D}He(n,C<<1,0);if((a[n]&1)==0){C=10}else{C=(c[n>>2]&-2)+ -1|0}He(n,C,0);if((a[n]&1)==0){C=h}else{C=c[x>>2]|0}c[q>>2]=C+D}D=w+12|0;F=c[D>>2]|0;E=w+16|0;if((F|0)==(c[E>>2]|0)){F=sc[c[(c[w>>2]|0)+36>>2]&127](w)|0}else{F=c[F>>2]|0}if((mh(F,r,v,C,q,z,A,m,p,t,s,u)|0)!=0){break}B=c[D>>2]|0;if((B|0)==(c[E>>2]|0)){sc[c[(c[w>>2]|0)+40>>2]&127](w)|0;continue}else{c[D>>2]=B+4;continue}}u=a[m]|0;if((u&1)==0){u=(u&255)>>>1}else{u=c[m+4>>2]|0}if(((u|0)!=0?(a[r]|0)!=0:0)?(o=c[t>>2]|0,(o-p|0)<160):0){F=c[s>>2]|0;c[t>>2]=o+4;c[o>>2]=F}g[k>>2]=+Wl(C,c[q>>2]|0,j);tj(m,p,c[t>>2]|0,j);if((w|0)!=0){o=c[w+12>>2]|0;if((o|0)==(c[w+16>>2]|0)){o=sc[c[(c[w>>2]|0)+36>>2]&127](w)|0}else{o=c[o>>2]|0}if((o|0)==-1){c[e>>2]=0;w=0;e=1}else{e=0}}else{w=0;e=1}do{if((B|0)!=0){o=c[B+12>>2]|0;if((o|0)==(c[B+16>>2]|0)){o=sc[c[(c[B>>2]|0)+36>>2]&127](B)|0}else{o=c[o>>2]|0}if((o|0)==-1){c[f>>2]=0;l=57;break}if(e){c[b>>2]=w;Fe(n);Fe(m);i=d;return}}else{l=57}}while(0);if((l|0)==57?!e:0){c[b>>2]=w;Fe(n);Fe(m);i=d;return}c[j>>2]=c[j>>2]|2;c[b>>2]=w;Fe(n);Fe(m);i=d;return}function bh(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;m=b+4|0;l=b;c[m>>2]=c[d>>2];c[l>>2]=c[e>>2];c[k+0>>2]=c[m+0>>2];c[j+0>>2]=c[l+0>>2];ch(a,0,k,j,f,g,h);i=b;return}function ch(b,d,e,f,g,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0;d=i;i=i+352|0;u=d+208|0;z=d+184|0;w=d+4|0;m=d+8|0;n=d+196|0;q=d;p=d+24|0;t=d+192|0;s=d+188|0;r=d+337|0;v=d+336|0;lh(m,g,u,z,w);c[n+0>>2]=0;c[n+4>>2]=0;c[n+8>>2]=0;He(n,10,0);if((a[n]&1)==0){C=n+1|0;g=C;x=n+8|0}else{C=n+8|0;g=n+1|0;x=C;C=c[C>>2]|0}c[q>>2]=C;c[t>>2]=p;c[s>>2]=0;a[r]=1;a[v]=69;y=n+4|0;z=c[z>>2]|0;A=c[w>>2]|0;w=c[e>>2]|0;a:while(1){if((w|0)!=0){B=c[w+12>>2]|0;if((B|0)==(c[w+16>>2]|0)){B=sc[c[(c[w>>2]|0)+36>>2]&127](w)|0}else{B=c[B>>2]|0}if((B|0)==-1){c[e>>2]=0;D=1;w=0}else{D=0}}else{D=1;w=0}B=c[f>>2]|0;do{if((B|0)!=0){E=c[B+12>>2]|0;if((E|0)==(c[B+16>>2]|0)){E=sc[c[(c[B>>2]|0)+36>>2]&127](B)|0}else{E=c[E>>2]|0}if(!((E|0)==-1)){if(D){break}else{break a}}else{c[f>>2]=0;l=17;break}}else{l=17}}while(0);if((l|0)==17){l=0;if(D){B=0;break}else{B=0}}D=a[n]|0;F=(D&1)==0;if(F){E=(D&255)>>>1}else{E=c[y>>2]|0}if(((c[q>>2]|0)-C|0)==(E|0)){if(F){C=(D&255)>>>1;D=(D&255)>>>1}else{D=c[y>>2]|0;C=D}He(n,C<<1,0);if((a[n]&1)==0){C=10}else{C=(c[n>>2]&-2)+ -1|0}He(n,C,0);if((a[n]&1)==0){C=g}else{C=c[x>>2]|0}c[q>>2]=C+D}D=w+12|0;F=c[D>>2]|0;E=w+16|0;if((F|0)==(c[E>>2]|0)){F=sc[c[(c[w>>2]|0)+36>>2]&127](w)|0}else{F=c[F>>2]|0}if((mh(F,r,v,C,q,z,A,m,p,t,s,u)|0)!=0){break}B=c[D>>2]|0;if((B|0)==(c[E>>2]|0)){sc[c[(c[w>>2]|0)+40>>2]&127](w)|0;continue}else{c[D>>2]=B+4;continue}}u=a[m]|0;if((u&1)==0){u=(u&255)>>>1}else{u=c[m+4>>2]|0}if(((u|0)!=0?(a[r]|0)!=0:0)?(o=c[t>>2]|0,(o-p|0)<160):0){F=c[s>>2]|0;c[t>>2]=o+4;c[o>>2]=F}h[k>>3]=+Vl(C,c[q>>2]|0,j);tj(m,p,c[t>>2]|0,j);if((w|0)!=0){o=c[w+12>>2]|0;if((o|0)==(c[w+16>>2]|0)){o=sc[c[(c[w>>2]|0)+36>>2]&127](w)|0}else{o=c[o>>2]|0}if((o|0)==-1){c[e>>2]=0;w=0;e=1}else{e=0}}else{w=0;e=1}do{if((B|0)!=0){o=c[B+12>>2]|0;if((o|0)==(c[B+16>>2]|0)){o=sc[c[(c[B>>2]|0)+36>>2]&127](B)|0}else{o=c[o>>2]|0}if((o|0)==-1){c[f>>2]=0;l=57;break}if(e){c[b>>2]=w;Fe(n);Fe(m);i=d;return}}else{l=57}}while(0);if((l|0)==57?!e:0){c[b>>2]=w;Fe(n);Fe(m);i=d;return}c[j>>2]=c[j>>2]|2;c[b>>2]=w;Fe(n);Fe(m);i=d;return}function dh(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;m=b+4|0;l=b;c[m>>2]=c[d>>2];c[l>>2]=c[e>>2];c[k+0>>2]=c[m+0>>2];c[j+0>>2]=c[l+0>>2];eh(a,0,k,j,f,g,h);i=b;return}function eh(b,d,e,f,g,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0;d=i;i=i+352|0;u=d+208|0;z=d+184|0;w=d+4|0;m=d+8|0;n=d+196|0;q=d;p=d+24|0;t=d+192|0;s=d+188|0;r=d+337|0;v=d+336|0;lh(m,g,u,z,w);c[n+0>>2]=0;c[n+4>>2]=0;c[n+8>>2]=0;He(n,10,0);if((a[n]&1)==0){C=n+1|0;g=C;x=n+8|0}else{C=n+8|0;g=n+1|0;x=C;C=c[C>>2]|0}c[q>>2]=C;c[t>>2]=p;c[s>>2]=0;a[r]=1;a[v]=69;y=n+4|0;z=c[z>>2]|0;A=c[w>>2]|0;w=c[e>>2]|0;a:while(1){if((w|0)!=0){B=c[w+12>>2]|0;if((B|0)==(c[w+16>>2]|0)){B=sc[c[(c[w>>2]|0)+36>>2]&127](w)|0}else{B=c[B>>2]|0}if((B|0)==-1){c[e>>2]=0;D=1;w=0}else{D=0}}else{D=1;w=0}B=c[f>>2]|0;do{if((B|0)!=0){E=c[B+12>>2]|0;if((E|0)==(c[B+16>>2]|0)){E=sc[c[(c[B>>2]|0)+36>>2]&127](B)|0}else{E=c[E>>2]|0}if(!((E|0)==-1)){if(D){break}else{break a}}else{c[f>>2]=0;l=17;break}}else{l=17}}while(0);if((l|0)==17){l=0;if(D){B=0;break}else{B=0}}D=a[n]|0;F=(D&1)==0;if(F){E=(D&255)>>>1}else{E=c[y>>2]|0}if(((c[q>>2]|0)-C|0)==(E|0)){if(F){C=(D&255)>>>1;D=(D&255)>>>1}else{D=c[y>>2]|0;C=D}He(n,C<<1,0);if((a[n]&1)==0){C=10}else{C=(c[n>>2]&-2)+ -1|0}He(n,C,0);if((a[n]&1)==0){C=g}else{C=c[x>>2]|0}c[q>>2]=C+D}D=w+12|0;F=c[D>>2]|0;E=w+16|0;if((F|0)==(c[E>>2]|0)){F=sc[c[(c[w>>2]|0)+36>>2]&127](w)|0}else{F=c[F>>2]|0}if((mh(F,r,v,C,q,z,A,m,p,t,s,u)|0)!=0){break}B=c[D>>2]|0;if((B|0)==(c[E>>2]|0)){sc[c[(c[w>>2]|0)+40>>2]&127](w)|0;continue}else{c[D>>2]=B+4;continue}}u=a[m]|0;if((u&1)==0){u=(u&255)>>>1}else{u=c[m+4>>2]|0}if(((u|0)!=0?(a[r]|0)!=0:0)?(o=c[t>>2]|0,(o-p|0)<160):0){F=c[s>>2]|0;c[t>>2]=o+4;c[o>>2]=F}h[k>>3]=+Ul(C,c[q>>2]|0,j);tj(m,p,c[t>>2]|0,j);if((w|0)!=0){o=c[w+12>>2]|0;if((o|0)==(c[w+16>>2]|0)){o=sc[c[(c[w>>2]|0)+36>>2]&127](w)|0}else{o=c[o>>2]|0}if((o|0)==-1){c[e>>2]=0;w=0;e=1}else{e=0}}else{w=0;e=1}do{if((B|0)!=0){o=c[B+12>>2]|0;if((o|0)==(c[B+16>>2]|0)){o=sc[c[(c[B>>2]|0)+36>>2]&127](B)|0}else{o=c[o>>2]|0}if((o|0)==-1){c[f>>2]=0;l=57;break}if(e){c[b>>2]=w;Fe(n);Fe(m);i=d;return}}else{l=57}}while(0);if((l|0)==57?!e:0){c[b>>2]=w;Fe(n);Fe(m);i=d;return}c[j>>2]=c[j>>2]|2;c[b>>2]=w;Fe(n);Fe(m);i=d;return}function fh(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0;m=i;i=i+320|0;n=m;o=m+208|0;d=m+192|0;p=m+188|0;l=m+176|0;x=m+16|0;c[d+0>>2]=0;c[d+4>>2]=0;c[d+8>>2]=0;Ze(p,g);q=c[p>>2]|0;if(!((c[1498]|0)==-1)){c[n>>2]=5992;c[n+4>>2]=117;c[n+8>>2]=0;Ae(5992,n,118)}r=(c[5996>>2]|0)+ -1|0;g=c[q+8>>2]|0;if(!((c[q+12>>2]|0)-g>>2>>>0>r>>>0)){E=xb(4)|0;wm(E);ec(E|0,13960,106)}g=c[g+(r<<2)>>2]|0;if((g|0)==0){E=xb(4)|0;wm(E);ec(E|0,13960,106)}yc[c[(c[g>>2]|0)+48>>2]&7](g,4544,4570|0,o)|0;ge(c[p>>2]|0)|0;c[l+0>>2]=0;c[l+4>>2]=0;c[l+8>>2]=0;He(l,10,0);if((a[l]&1)==0){z=l+1|0;s=z;t=l+8|0}else{z=l+8|0;s=l+1|0;t=z;z=c[z>>2]|0}w=l+4|0;p=o+96|0;u=o+100|0;v=x;q=o+104|0;r=o;g=d+4|0;A=c[e>>2]|0;y=0;B=z;a:while(1){if((A|0)!=0){C=c[A+12>>2]|0;if((C|0)==(c[A+16>>2]|0)){C=sc[c[(c[A>>2]|0)+36>>2]&127](A)|0}else{C=c[C>>2]|0}if((C|0)==-1){c[e>>2]=0;C=1;A=0}else{C=0}}else{C=1;A=0}D=c[f>>2]|0;do{if((D|0)!=0){E=c[D+12>>2]|0;if((E|0)==(c[D+16>>2]|0)){D=sc[c[(c[D>>2]|0)+36>>2]&127](D)|0}else{D=c[E>>2]|0}if(!((D|0)==-1)){if(C){break}else{break a}}else{c[f>>2]=0;k=22;break}}else{k=22}}while(0);if((k|0)==22?(k=0,C):0){break}C=a[l]|0;D=(C&1)==0;if(D){E=(C&255)>>>1}else{E=c[w>>2]|0}if((B-z|0)==(E|0)){if(D){z=(C&255)>>>1;B=(C&255)>>>1}else{B=c[w>>2]|0;z=B}He(l,z<<1,0);if((a[l]&1)==0){z=10}else{z=(c[l>>2]&-2)+ -1|0}He(l,z,0);if((a[l]&1)==0){z=s}else{z=c[t>>2]|0}B=z+B|0}C=c[A+12>>2]|0;if((C|0)==(c[A+16>>2]|0)){C=sc[c[(c[A>>2]|0)+36>>2]&127](A)|0}else{C=c[C>>2]|0}A=(B|0)==(z|0);do{if(A){D=(c[p>>2]|0)==(C|0);if(!D?(c[u>>2]|0)!=(C|0):0){k=43;break}a[B]=D?43:45;B=B+1|0;y=0}else{k=43}}while(0);do{if((k|0)==43){k=0;D=a[d]|0;if((D&1)==0){D=(D&255)>>>1}else{D=c[g>>2]|0}if((D|0)!=0&(C|0)==0){if((x-v|0)>=160){break}c[x>>2]=y;x=x+4|0;y=0;break}else{D=o}while(1){E=D+4|0;if((c[D>>2]|0)==(C|0)){break}if((E|0)==(q|0)){D=q;break}else{D=E}}C=D-r|0;D=C>>2;if((C|0)>92){break a}if((C|0)<88){a[B]=a[4544+D|0]|0;B=B+1|0;y=y+1|0;break}if(A){z=B;break a}if((B-z|0)>=3){break a}if((a[B+ -1|0]|0)!=48){break a}a[B]=a[4544+D|0]|0;B=B+1|0;y=0}}while(0);A=c[e>>2]|0;C=A+12|0;D=c[C>>2]|0;if((D|0)==(c[A+16>>2]|0)){sc[c[(c[A>>2]|0)+40>>2]&127](A)|0;continue}else{c[C>>2]=D+4;continue}}a[z+3|0]=0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}E=c[1472]|0;c[n>>2]=j;if((Kg(z,E,4584,n)|0)!=1){c[h>>2]=4}j=c[e>>2]|0;if((j|0)!=0){n=c[j+12>>2]|0;if((n|0)==(c[j+16>>2]|0)){n=sc[c[(c[j>>2]|0)+36>>2]&127](j)|0}else{n=c[n>>2]|0}if((n|0)==-1){c[e>>2]=0;e=0;j=1}else{e=j;j=0}}else{e=0;j=1}n=c[f>>2]|0;do{if((n|0)!=0){o=c[n+12>>2]|0;if((o|0)==(c[n+16>>2]|0)){n=sc[c[(c[n>>2]|0)+36>>2]&127](n)|0}else{n=c[o>>2]|0}if((n|0)==-1){c[f>>2]=0;k=78;break}if(j){c[b>>2]=e;Fe(l);Fe(d);i=m;return}}else{k=78}}while(0);if((k|0)==78?!j:0){c[b>>2]=e;Fe(l);Fe(d);i=m;return}c[h>>2]=c[h>>2]|2;c[b>>2]=e;Fe(l);Fe(d);i=m;return}function gh(b,d,e,f,g,h,j,k,l,m){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0;n=i;p=c[f>>2]|0;o=(p|0)==(e|0);do{if(o){q=(c[m+96>>2]|0)==(b|0);if(!q?(c[m+100>>2]|0)!=(b|0):0){break}c[f>>2]=e+1;a[e]=q?43:45;c[g>>2]=0;q=0;i=n;return q|0}}while(0);q=a[j]|0;if((q&1)==0){j=(q&255)>>>1}else{j=c[j+4>>2]|0}if((j|0)!=0&(b|0)==(h|0)){o=c[l>>2]|0;if((o-k|0)>=160){q=0;i=n;return q|0}q=c[g>>2]|0;c[l>>2]=o+4;c[o>>2]=q;c[g>>2]=0;q=0;i=n;return q|0}l=m+104|0;k=m;while(1){h=k+4|0;if((c[k>>2]|0)==(b|0)){break}if((h|0)==(l|0)){k=l;break}else{k=h}}b=k-m|0;m=b>>2;if((b|0)>92){q=-1;i=n;return q|0}if((d|0)==10|(d|0)==8){if((m|0)>=(d|0)){q=-1;i=n;return q|0}}else if((d|0)==16?(b|0)>=88:0){if(o){q=-1;i=n;return q|0}if((p-e|0)>=3){q=-1;i=n;return q|0}if((a[p+ -1|0]|0)!=48){q=-1;i=n;return q|0}c[g>>2]=0;q=a[4544+m|0]|0;c[f>>2]=p+1;a[p]=q;q=0;i=n;return q|0}q=a[4544+m|0]|0;c[f>>2]=p+1;a[p]=q;c[g>>2]=(c[g>>2]|0)+1;q=0;i=n;return q|0}function hh(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0;g=i;i=i+16|0;j=g;h=g+12|0;Ze(h,d);d=c[h>>2]|0;if(!((c[1500]|0)==-1)){c[j>>2]=6e3;c[j+4>>2]=117;c[j+8>>2]=0;Ae(6e3,j,118)}l=(c[6004>>2]|0)+ -1|0;k=c[d+8>>2]|0;if(!((c[d+12>>2]|0)-k>>2>>>0>l>>>0)){l=xb(4)|0;wm(l);ec(l|0,13960,106)}d=c[k+(l<<2)>>2]|0;if((d|0)==0){l=xb(4)|0;wm(l);ec(l|0,13960,106)}yc[c[(c[d>>2]|0)+32>>2]&7](d,4544,4570|0,e)|0;e=c[h>>2]|0;if(!((c[1536]|0)==-1)){c[j>>2]=6144;c[j+4>>2]=117;c[j+8>>2]=0;Ae(6144,j,118)}d=(c[6148>>2]|0)+ -1|0;j=c[e+8>>2]|0;if(!((c[e+12>>2]|0)-j>>2>>>0>d>>>0)){l=xb(4)|0;wm(l);ec(l|0,13960,106)}j=c[j+(d<<2)>>2]|0;if((j|0)==0){l=xb(4)|0;wm(l);ec(l|0,13960,106)}else{a[f]=sc[c[(c[j>>2]|0)+16>>2]&127](j)|0;qc[c[(c[j>>2]|0)+20>>2]&63](b,j);ge(c[h>>2]|0)|0;i=g;return}}function ih(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0;j=i;i=i+16|0;k=j;h=j+12|0;Ze(h,d);d=c[h>>2]|0;if(!((c[1500]|0)==-1)){c[k>>2]=6e3;c[k+4>>2]=117;c[k+8>>2]=0;Ae(6e3,k,118)}m=(c[6004>>2]|0)+ -1|0;l=c[d+8>>2]|0;if(!((c[d+12>>2]|0)-l>>2>>>0>m>>>0)){m=xb(4)|0;wm(m);ec(m|0,13960,106)}d=c[l+(m<<2)>>2]|0;if((d|0)==0){m=xb(4)|0;wm(m);ec(m|0,13960,106)}yc[c[(c[d>>2]|0)+32>>2]&7](d,4544,4576|0,e)|0;e=c[h>>2]|0;if(!((c[1536]|0)==-1)){c[k>>2]=6144;c[k+4>>2]=117;c[k+8>>2]=0;Ae(6144,k,118)}d=(c[6148>>2]|0)+ -1|0;k=c[e+8>>2]|0;if(!((c[e+12>>2]|0)-k>>2>>>0>d>>>0)){m=xb(4)|0;wm(m);ec(m|0,13960,106)}k=c[k+(d<<2)>>2]|0;if((k|0)==0){m=xb(4)|0;wm(m);ec(m|0,13960,106)}else{a[f]=sc[c[(c[k>>2]|0)+12>>2]&127](k)|0;a[g]=sc[c[(c[k>>2]|0)+16>>2]&127](k)|0;qc[c[(c[k>>2]|0)+20>>2]&63](b,k);ge(c[h>>2]|0)|0;i=j;return}}function jh(b,d,e,f,g,h,j,k,l,m,n,o){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;var p=0,q=0,r=0;p=i;if(b<<24>>24==h<<24>>24){if((a[d]|0)==0){r=-1;i=p;return r|0}a[d]=0;r=c[g>>2]|0;c[g>>2]=r+1;a[r]=46;g=a[k]|0;if((g&1)==0){g=(g&255)>>>1}else{g=c[k+4>>2]|0}if((g|0)==0){r=0;i=p;return r|0}g=c[m>>2]|0;if((g-l|0)>=160){r=0;i=p;return r|0}r=c[n>>2]|0;c[m>>2]=g+4;c[g>>2]=r;r=0;i=p;return r|0}if(b<<24>>24==j<<24>>24){j=a[k]|0;if((j&1)==0){j=(j&255)>>>1}else{j=c[k+4>>2]|0}if((j|0)!=0){if((a[d]|0)==0){r=-1;i=p;return r|0}g=c[m>>2]|0;if((g-l|0)>=160){r=0;i=p;return r|0}r=c[n>>2]|0;c[m>>2]=g+4;c[g>>2]=r;c[n>>2]=0;r=0;i=p;return r|0}}r=o+32|0;h=o;while(1){j=h+1|0;if((a[h]|0)==b<<24>>24){break}if((j|0)==(r|0)){h=r;break}else{h=j}}b=h-o|0;if((b|0)>31){r=-1;i=p;return r|0}o=a[4544+b|0]|0;if((b|0)==23|(b|0)==22){a[e]=80;r=c[g>>2]|0;c[g>>2]=r+1;a[r]=o;r=0;i=p;return r|0}else if((b|0)==24|(b|0)==25){n=c[g>>2]|0;if((n|0)!=(f|0)?(a[n+ -1|0]&95|0)!=(a[e]&127|0):0){r=-1;i=p;return r|0}c[g>>2]=n+1;a[n]=o;r=0;i=p;return r|0}else{f=o&95;if((f|0)==(a[e]|0)?(a[e]=f|128,(a[d]|0)!=0):0){a[d]=0;e=a[k]|0;if((e&1)==0){k=(e&255)>>>1}else{k=c[k+4>>2]|0}if((k|0)!=0?(q=c[m>>2]|0,(q-l|0)<160):0){r=c[n>>2]|0;c[m>>2]=q+4;c[q>>2]=r}}r=c[g>>2]|0;c[g>>2]=r+1;a[r]=o;if((b|0)>21){r=0;i=p;return r|0}c[n>>2]=(c[n>>2]|0)+1;r=0;i=p;return r|0}return 0}function kh(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0;f=i;i=i+16|0;h=f;g=f+12|0;Ze(g,b);b=c[g>>2]|0;if(!((c[1498]|0)==-1)){c[h>>2]=5992;c[h+4>>2]=117;c[h+8>>2]=0;Ae(5992,h,118)}k=(c[5996>>2]|0)+ -1|0;j=c[b+8>>2]|0;if(!((c[b+12>>2]|0)-j>>2>>>0>k>>>0)){k=xb(4)|0;wm(k);ec(k|0,13960,106)}b=c[j+(k<<2)>>2]|0;if((b|0)==0){k=xb(4)|0;wm(k);ec(k|0,13960,106)}yc[c[(c[b>>2]|0)+48>>2]&7](b,4544,4570|0,d)|0;d=c[g>>2]|0;if(!((c[1538]|0)==-1)){c[h>>2]=6152;c[h+4>>2]=117;c[h+8>>2]=0;Ae(6152,h,118)}b=(c[6156>>2]|0)+ -1|0;h=c[d+8>>2]|0;if(!((c[d+12>>2]|0)-h>>2>>>0>b>>>0)){k=xb(4)|0;wm(k);ec(k|0,13960,106)}h=c[h+(b<<2)>>2]|0;if((h|0)==0){k=xb(4)|0;wm(k);ec(k|0,13960,106)}else{c[e>>2]=sc[c[(c[h>>2]|0)+16>>2]&127](h)|0;qc[c[(c[h>>2]|0)+20>>2]&63](a,h);ge(c[g>>2]|0)|0;i=f;return}}function lh(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0;h=i;i=i+16|0;j=h;g=h+12|0;Ze(g,b);b=c[g>>2]|0;if(!((c[1498]|0)==-1)){c[j>>2]=5992;c[j+4>>2]=117;c[j+8>>2]=0;Ae(5992,j,118)}l=(c[5996>>2]|0)+ -1|0;k=c[b+8>>2]|0;if(!((c[b+12>>2]|0)-k>>2>>>0>l>>>0)){l=xb(4)|0;wm(l);ec(l|0,13960,106)}b=c[k+(l<<2)>>2]|0;if((b|0)==0){l=xb(4)|0;wm(l);ec(l|0,13960,106)}yc[c[(c[b>>2]|0)+48>>2]&7](b,4544,4576|0,d)|0;d=c[g>>2]|0;if(!((c[1538]|0)==-1)){c[j>>2]=6152;c[j+4>>2]=117;c[j+8>>2]=0;Ae(6152,j,118)}b=(c[6156>>2]|0)+ -1|0;j=c[d+8>>2]|0;if(!((c[d+12>>2]|0)-j>>2>>>0>b>>>0)){l=xb(4)|0;wm(l);ec(l|0,13960,106)}j=c[j+(b<<2)>>2]|0;if((j|0)==0){l=xb(4)|0;wm(l);ec(l|0,13960,106)}else{c[e>>2]=sc[c[(c[j>>2]|0)+12>>2]&127](j)|0;c[f>>2]=sc[c[(c[j>>2]|0)+16>>2]&127](j)|0;qc[c[(c[j>>2]|0)+20>>2]&63](a,j);ge(c[g>>2]|0)|0;i=h;return}}function mh(b,d,e,f,g,h,j,k,l,m,n,o){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;var p=0,q=0,r=0;p=i;if((b|0)==(h|0)){if((a[d]|0)==0){r=-1;i=p;return r|0}a[d]=0;r=c[g>>2]|0;c[g>>2]=r+1;a[r]=46;g=a[k]|0;if((g&1)==0){g=(g&255)>>>1}else{g=c[k+4>>2]|0}if((g|0)==0){r=0;i=p;return r|0}g=c[m>>2]|0;if((g-l|0)>=160){r=0;i=p;return r|0}r=c[n>>2]|0;c[m>>2]=g+4;c[g>>2]=r;r=0;i=p;return r|0}if((b|0)==(j|0)){j=a[k]|0;if((j&1)==0){j=(j&255)>>>1}else{j=c[k+4>>2]|0}if((j|0)!=0){if((a[d]|0)==0){r=-1;i=p;return r|0}g=c[m>>2]|0;if((g-l|0)>=160){r=0;i=p;return r|0}r=c[n>>2]|0;c[m>>2]=g+4;c[g>>2]=r;c[n>>2]=0;r=0;i=p;return r|0}}r=o+128|0;h=o;while(1){j=h+4|0;if((c[h>>2]|0)==(b|0)){break}if((j|0)==(r|0)){h=r;break}else{h=j}}b=h-o|0;j=b>>2;if((b|0)>124){r=-1;i=p;return r|0}o=a[4544+j|0]|0;if((j|0)==24|(j|0)==25){n=c[g>>2]|0;if((n|0)!=(f|0)?(a[n+ -1|0]&95|0)!=(a[e]&127|0):0){r=-1;i=p;return r|0}c[g>>2]=n+1;a[n]=o;r=0;i=p;return r|0}else if(!((j|0)==23|(j|0)==22)){f=o&95;if((f|0)==(a[e]|0)?(a[e]=f|128,(a[d]|0)!=0):0){a[d]=0;e=a[k]|0;if((e&1)==0){k=(e&255)>>>1}else{k=c[k+4>>2]|0}if((k|0)!=0?(q=c[m>>2]|0,(q-l|0)<160):0){r=c[n>>2]|0;c[m>>2]=q+4;c[q>>2]=r}}}else{a[e]=80}r=c[g>>2]|0;c[g>>2]=r+1;a[r]=o;if((b|0)>84){r=0;i=p;return r|0}c[n>>2]=(c[n>>2]|0)+1;r=0;i=p;return r|0}function nh(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function oh(a){a=a|0;return}function ph(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0;k=i;i=i+32|0;m=k;n=k+28|0;l=k+24|0;j=k+12|0;if((c[f+4>>2]&1|0)==0){l=c[(c[d>>2]|0)+24>>2]|0;c[n>>2]=c[e>>2];o=h&1;c[m+0>>2]=c[n+0>>2];lc[l&15](b,d,m,f,g,o);i=k;return}Ze(l,f);d=c[l>>2]|0;if(!((c[1536]|0)==-1)){c[m>>2]=6144;c[m+4>>2]=117;c[m+8>>2]=0;Ae(6144,m,118)}m=(c[6148>>2]|0)+ -1|0;g=c[d+8>>2]|0;if(!((c[d+12>>2]|0)-g>>2>>>0>m>>>0)){o=xb(4)|0;wm(o);ec(o|0,13960,106)}m=c[g+(m<<2)>>2]|0;if((m|0)==0){o=xb(4)|0;wm(o);ec(o|0,13960,106)}ge(c[l>>2]|0)|0;l=c[m>>2]|0;if(h){qc[c[l+24>>2]&63](j,m)}else{qc[c[l+28>>2]&63](j,m)}n=a[j]|0;if((n&1)==0){l=j+1|0;d=l;m=j+8|0}else{m=j+8|0;d=c[m>>2]|0;l=j+1|0}h=j+4|0;while(1){if((n&1)==0){g=l;n=(n&255)>>>1}else{g=c[m>>2]|0;n=c[h>>2]|0}if((d|0)==(g+n|0)){break}f=a[d]|0;n=c[e>>2]|0;do{if((n|0)!=0){g=n+24|0;o=c[g>>2]|0;if((o|0)!=(c[n+28>>2]|0)){c[g>>2]=o+1;a[o]=f;break}if((Bc[c[(c[n>>2]|0)+52>>2]&15](n,f&255)|0)==-1){c[e>>2]=0}}}while(0);n=a[j]|0;d=d+1|0}c[b>>2]=c[e>>2];Fe(j);i=k;return}function qh(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;d=i;i=i+64|0;p=d;s=d+20|0;q=d+28|0;o=d+40|0;l=d+12|0;m=d+4|0;k=d+8|0;n=d+16|0;a[s+0|0]=a[4792|0]|0;a[s+1|0]=a[4793|0]|0;a[s+2|0]=a[4794|0]|0;a[s+3|0]=a[4795|0]|0;a[s+4|0]=a[4796|0]|0;a[s+5|0]=a[4797|0]|0;u=s+1|0;r=f+4|0;t=c[r>>2]|0;if((t&2048|0)!=0){a[u]=43;u=s+2|0}if((t&512|0)!=0){a[u]=35;u=u+1|0}a[u]=108;v=u+1|0;u=t&74;do{if((u|0)==8){if((t&16384|0)==0){a[v]=120;break}else{a[v]=88;break}}else if((u|0)==64){a[v]=111}else{a[v]=100}}while(0);if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}v=c[1472]|0;c[p>>2]=h;s=rh(q,12,v,s,p)|0;h=q+s|0;r=c[r>>2]&176;do{if((r|0)==16){r=a[q]|0;if(r<<24>>24==43|r<<24>>24==45){r=q+1|0;break}if((s|0)>1&r<<24>>24==48?(v=a[q+1|0]|0,v<<24>>24==88|v<<24>>24==120):0){r=q+2|0}else{j=20}}else if((r|0)==32){r=h}else{j=20}}while(0);if((j|0)==20){r=q}Ze(k,f);sh(q,r,h,o,l,m,k);ge(c[k>>2]|0)|0;c[n>>2]=c[e>>2];u=c[l>>2]|0;v=c[m>>2]|0;c[p+0>>2]=c[n+0>>2];th(b,p,o,u,v,f,g);i=d;return}function rh(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0;g=i;i=i+16|0;h=g;c[h>>2]=f;d=Bb(d|0)|0;e=nb(a|0,b|0,e|0,h|0)|0;if((d|0)==0){i=g;return e|0}Bb(d|0)|0;i=g;return e|0}function sh(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;l=i;i=i+32|0;o=l;k=l+12|0;n=c[j>>2]|0;if(!((c[1500]|0)==-1)){c[o>>2]=6e3;c[o+4>>2]=117;c[o+8>>2]=0;Ae(6e3,o,118)}r=(c[6004>>2]|0)+ -1|0;s=c[n+8>>2]|0;if(!((c[n+12>>2]|0)-s>>2>>>0>r>>>0)){v=xb(4)|0;wm(v);ec(v|0,13960,106)}n=c[s+(r<<2)>>2]|0;if((n|0)==0){v=xb(4)|0;wm(v);ec(v|0,13960,106)}j=c[j>>2]|0;if(!((c[1536]|0)==-1)){c[o>>2]=6144;c[o+4>>2]=117;c[o+8>>2]=0;Ae(6144,o,118)}o=(c[6148>>2]|0)+ -1|0;r=c[j+8>>2]|0;if(!((c[j+12>>2]|0)-r>>2>>>0>o>>>0)){v=xb(4)|0;wm(v);ec(v|0,13960,106)}j=c[r+(o<<2)>>2]|0;if((j|0)==0){v=xb(4)|0;wm(v);ec(v|0,13960,106)}qc[c[(c[j>>2]|0)+20>>2]&63](k,j);o=a[k]|0;if((o&1)==0){o=(o&255)>>>1}else{o=c[k+4>>2]|0}if((o|0)!=0){c[h>>2]=f;o=a[b]|0;if(o<<24>>24==43|o<<24>>24==45){v=Bc[c[(c[n>>2]|0)+28>>2]&15](n,o)|0;o=c[h>>2]|0;c[h>>2]=o+1;a[o]=v;o=b+1|0}else{o=b}if(((e-o|0)>1?(a[o]|0)==48:0)?(q=o+1|0,v=a[q]|0,v<<24>>24==88|v<<24>>24==120):0){v=Bc[c[(c[n>>2]|0)+28>>2]&15](n,48)|0;u=c[h>>2]|0;c[h>>2]=u+1;a[u]=v;u=Bc[c[(c[n>>2]|0)+28>>2]&15](n,a[q]|0)|0;v=c[h>>2]|0;c[h>>2]=v+1;a[v]=u;o=o+2|0}if((o|0)!=(e|0)?(p=e+ -1|0,p>>>0>o>>>0):0){q=o;do{v=a[q]|0;a[q]=a[p]|0;a[p]=v;q=q+1|0;p=p+ -1|0}while(q>>>0<p>>>0)}r=sc[c[(c[j>>2]|0)+16>>2]&127](j)|0;if(o>>>0<e>>>0){p=k+1|0;q=k+4|0;j=k+8|0;u=0;t=0;s=o;while(1){v=(a[k]&1)==0;if((a[(v?p:c[j>>2]|0)+t|0]|0)!=0?(u|0)==(a[(v?p:c[j>>2]|0)+t|0]|0):0){u=c[h>>2]|0;c[h>>2]=u+1;a[u]=r;u=a[k]|0;if((u&1)==0){v=(u&255)>>>1}else{v=c[q>>2]|0}u=0;t=(t>>>0<(v+ -1|0)>>>0)+t|0}w=Bc[c[(c[n>>2]|0)+28>>2]&15](n,a[s]|0)|0;v=c[h>>2]|0;c[h>>2]=v+1;a[v]=w;s=s+1|0;if(!(s>>>0<e>>>0)){break}else{u=u+1|0}}}o=f+(o-b)|0;n=c[h>>2]|0;if((o|0)!=(n|0)?(m=n+ -1|0,m>>>0>o>>>0):0){do{w=a[o]|0;a[o]=a[m]|0;a[m]=w;o=o+1|0;m=m+ -1|0}while(o>>>0<m>>>0)}}else{yc[c[(c[n>>2]|0)+32>>2]&7](n,b,e,f)|0;c[h>>2]=f+(e-b)}if((d|0)==(e|0)){w=c[h>>2]|0;c[g>>2]=w;Fe(k);i=l;return}else{w=f+(d-b)|0;c[g>>2]=w;Fe(k);i=l;return}}function th(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0;l=i;i=i+16|0;m=l;k=c[d>>2]|0;if((k|0)==0){c[b>>2]=0;i=l;return}n=e;o=g-n|0;h=h+12|0;p=c[h>>2]|0;p=(p|0)>(o|0)?p-o|0:0;o=f;n=o-n|0;if((n|0)>0?(kc[c[(c[k>>2]|0)+48>>2]&31](k,e,n)|0)!=(n|0):0){c[d>>2]=0;c[b>>2]=0;i=l;return}do{if((p|0)>0){Ee(m,p,j);if((a[m]&1)==0){j=m+1|0}else{j=c[m+8>>2]|0}if((kc[c[(c[k>>2]|0)+48>>2]&31](k,j,p)|0)==(p|0)){Fe(m);break}c[d>>2]=0;c[b>>2]=0;Fe(m);i=l;return}}while(0);m=g-o|0;if((m|0)>0?(kc[c[(c[k>>2]|0)+48>>2]&31](k,f,m)|0)!=(m|0):0){c[d>>2]=0;c[b>>2]=0;i=l;return}c[h>>2]=0;c[b>>2]=k;i=l;return}function uh(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;m=i;i=i+96|0;l=m;t=m+8|0;o=m+32|0;r=m+54|0;p=m+16|0;d=m+24|0;q=m+20|0;n=m+28|0;w=t;c[w>>2]=37;c[w+4>>2]=0;w=t+1|0;s=f+4|0;u=c[s>>2]|0;if((u&2048|0)!=0){a[w]=43;w=t+2|0}if((u&512|0)!=0){a[w]=35;w=w+1|0}v=w+2|0;a[w]=108;a[w+1|0]=108;w=u&74;do{if((w|0)==64){a[v]=111}else if((w|0)==8){if((u&16384|0)==0){a[v]=120;break}else{a[v]=88;break}}else{a[v]=100}}while(0);if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}w=c[1472]|0;v=l;c[v>>2]=h;c[v+4>>2]=j;j=rh(o,22,w,t,l)|0;h=o+j|0;s=c[s>>2]&176;do{if((s|0)==32){s=h}else if((s|0)==16){s=a[o]|0;if(s<<24>>24==43|s<<24>>24==45){s=o+1|0;break}if((j|0)>1&s<<24>>24==48?(w=a[o+1|0]|0,w<<24>>24==88|w<<24>>24==120):0){s=o+2|0}else{k=20}}else{k=20}}while(0);if((k|0)==20){s=o}Ze(q,f);sh(o,s,h,r,p,d,q);ge(c[q>>2]|0)|0;c[n>>2]=c[e>>2];v=c[p>>2]|0;w=c[d>>2]|0;c[l+0>>2]=c[n+0>>2];th(b,l,r,v,w,f,g);i=m;return}function vh(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;d=i;i=i+64|0;p=d;s=d+20|0;q=d+28|0;o=d+40|0;l=d+12|0;m=d+4|0;k=d+8|0;n=d+16|0;a[s+0|0]=a[4792|0]|0;a[s+1|0]=a[4793|0]|0;a[s+2|0]=a[4794|0]|0;a[s+3|0]=a[4795|0]|0;a[s+4|0]=a[4796|0]|0;a[s+5|0]=a[4797|0]|0;u=s+1|0;r=f+4|0;t=c[r>>2]|0;if((t&2048|0)!=0){a[u]=43;u=s+2|0}if((t&512|0)!=0){a[u]=35;u=u+1|0}a[u]=108;v=u+1|0;u=t&74;do{if((u|0)==8){if((t&16384|0)==0){a[v]=120;break}else{a[v]=88;break}}else if((u|0)==64){a[v]=111}else{a[v]=117}}while(0);if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}v=c[1472]|0;c[p>>2]=h;s=rh(q,12,v,s,p)|0;h=q+s|0;r=c[r>>2]&176;do{if((r|0)==16){r=a[q]|0;if(r<<24>>24==43|r<<24>>24==45){r=q+1|0;break}if((s|0)>1&r<<24>>24==48?(v=a[q+1|0]|0,v<<24>>24==88|v<<24>>24==120):0){r=q+2|0}else{j=20}}else if((r|0)==32){r=h}else{j=20}}while(0);if((j|0)==20){r=q}Ze(k,f);sh(q,r,h,o,l,m,k);ge(c[k>>2]|0)|0;c[n>>2]=c[e>>2];u=c[l>>2]|0;v=c[m>>2]|0;c[p+0>>2]=c[n+0>>2];th(b,p,o,u,v,f,g);i=d;return}function wh(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;m=i;i=i+112|0;l=m;t=m+8|0;o=m+32|0;r=m+55|0;p=m+16|0;d=m+24|0;q=m+20|0;n=m+28|0;w=t;c[w>>2]=37;c[w+4>>2]=0;w=t+1|0;s=f+4|0;u=c[s>>2]|0;if((u&2048|0)!=0){a[w]=43;w=t+2|0}if((u&512|0)!=0){a[w]=35;w=w+1|0}v=w+2|0;a[w]=108;a[w+1|0]=108;w=u&74;do{if((w|0)==64){a[v]=111}else if((w|0)==8){if((u&16384|0)==0){a[v]=120;break}else{a[v]=88;break}}else{a[v]=117}}while(0);if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}w=c[1472]|0;v=l;c[v>>2]=h;c[v+4>>2]=j;j=rh(o,23,w,t,l)|0;h=o+j|0;s=c[s>>2]&176;do{if((s|0)==32){s=h}else if((s|0)==16){s=a[o]|0;if(s<<24>>24==43|s<<24>>24==45){s=o+1|0;break}if((j|0)>1&s<<24>>24==48?(w=a[o+1|0]|0,w<<24>>24==88|w<<24>>24==120):0){s=o+2|0}else{k=20}}else{k=20}}while(0);if((k|0)==20){s=o}Ze(q,f);sh(o,s,h,r,p,d,q);ge(c[q>>2]|0)|0;c[n>>2]=c[e>>2];v=c[p>>2]|0;w=c[d>>2]|0;c[l+0>>2]=c[n+0>>2];th(b,l,r,v,w,f,g);i=m;return}function xh(b,d,e,f,g,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;j=+j;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0;v=i;i=i+144|0;d=v+8|0;C=v;y=v+44|0;B=v+36|0;z=v+74|0;r=v+20|0;x=v+32|0;t=v+28|0;u=v+24|0;w=v+40|0;D=C;c[D>>2]=37;c[D+4>>2]=0;D=C+1|0;A=f+4|0;F=c[A>>2]|0;if((F&2048|0)!=0){a[D]=43;D=C+2|0}if((F&1024|0)!=0){a[D]=35;D=D+1|0}E=F&260;F=F>>>14;do{if((E|0)==260){if((F&1|0)==0){a[D]=97;D=0;break}else{a[D]=65;D=0;break}}else{a[D]=46;G=D+2|0;a[D+1|0]=42;if((E|0)==4){if((F&1|0)==0){a[G]=102;D=1;break}else{a[G]=70;D=1;break}}else if((E|0)==256){if((F&1|0)==0){a[G]=101;D=1;break}else{a[G]=69;D=1;break}}else{if((F&1|0)==0){a[G]=103;D=1;break}else{a[G]=71;D=1;break}}}}while(0);c[B>>2]=y;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}E=c[1472]|0;if(D){c[d>>2]=c[f+8>>2];G=d+4|0;h[k>>3]=j;c[G>>2]=c[k>>2];c[G+4>>2]=c[k+4>>2];E=rh(y,30,E,C,d)|0}else{h[k>>3]=j;c[d>>2]=c[k>>2];c[d+4>>2]=c[k+4>>2];E=rh(y,30,E,C,d)|0}if((E|0)>29){E=(a[5896]|0)==0;if(D){if(E?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}G=c[1472]|0;c[d>>2]=c[f+8>>2];F=d+4|0;h[k>>3]=j;c[F>>2]=c[k>>2];c[F+4>>2]=c[k+4>>2];C=yh(B,G,C,d)|0}else{if(E?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}G=c[1472]|0;c[d>>2]=c[f+8>>2];F=d+4|0;h[k>>3]=j;c[F>>2]=c[k>>2];c[F+4>>2]=c[k+4>>2];C=yh(B,G,C,d)|0}B=c[B>>2]|0;if((B|0)==0){bn()}else{l=B;m=B;s=C}}else{l=c[B>>2]|0;m=0;s=E}B=l+s|0;A=c[A>>2]&176;do{if((A|0)==32){A=B}else if((A|0)==16){A=a[l]|0;if(A<<24>>24==43|A<<24>>24==45){A=l+1|0;break}if((s|0)>1&A<<24>>24==48?(G=a[l+1|0]|0,G<<24>>24==88|G<<24>>24==120):0){A=l+2|0}else{q=44}}else{q=44}}while(0);if((q|0)==44){A=l}if((l|0)!=(y|0)){q=Rm(s<<1)|0;if((q|0)==0){bn()}else{p=l;n=q;o=q}}else{p=y;n=0;o=z}Ze(t,f);zh(p,A,B,o,r,x,t);ge(c[t>>2]|0)|0;c[w>>2]=c[e>>2];F=c[r>>2]|0;G=c[x>>2]|0;c[d+0>>2]=c[w+0>>2];th(u,d,o,F,G,f,g);G=c[u>>2]|0;c[e>>2]=G;c[b>>2]=G;if((n|0)!=0){Sm(n)}if((m|0)==0){i=v;return}Sm(m);i=v;return}function yh(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0;f=i;i=i+16|0;g=f;c[g>>2]=e;b=Bb(b|0)|0;d=mb(a|0,d|0,g|0)|0;if((b|0)==0){i=f;return d|0}Bb(b|0)|0;i=f;return d|0}function zh(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0;k=i;i=i+32|0;o=k;l=k+12|0;m=c[j>>2]|0;if(!((c[1500]|0)==-1)){c[o>>2]=6e3;c[o+4>>2]=117;c[o+8>>2]=0;Ae(6e3,o,118)}t=(c[6004>>2]|0)+ -1|0;r=c[m+8>>2]|0;if(!((c[m+12>>2]|0)-r>>2>>>0>t>>>0)){y=xb(4)|0;wm(y);ec(y|0,13960,106)}m=c[r+(t<<2)>>2]|0;if((m|0)==0){y=xb(4)|0;wm(y);ec(y|0,13960,106)}j=c[j>>2]|0;if(!((c[1536]|0)==-1)){c[o>>2]=6144;c[o+4>>2]=117;c[o+8>>2]=0;Ae(6144,o,118)}o=(c[6148>>2]|0)+ -1|0;r=c[j+8>>2]|0;if(!((c[j+12>>2]|0)-r>>2>>>0>o>>>0)){y=xb(4)|0;wm(y);ec(y|0,13960,106)}o=c[r+(o<<2)>>2]|0;if((o|0)==0){y=xb(4)|0;wm(y);ec(y|0,13960,106)}qc[c[(c[o>>2]|0)+20>>2]&63](l,o);c[h>>2]=f;j=a[b]|0;if(j<<24>>24==43|j<<24>>24==45){y=Bc[c[(c[m>>2]|0)+28>>2]&15](m,j)|0;t=c[h>>2]|0;c[h>>2]=t+1;a[t]=y;t=b+1|0}else{t=b}j=e;a:do{if(((j-t|0)>1?(a[t]|0)==48:0)?(p=t+1|0,y=a[p]|0,y<<24>>24==88|y<<24>>24==120):0){y=Bc[c[(c[m>>2]|0)+28>>2]&15](m,48)|0;x=c[h>>2]|0;c[h>>2]=x+1;a[x]=y;t=t+2|0;x=Bc[c[(c[m>>2]|0)+28>>2]&15](m,a[p]|0)|0;y=c[h>>2]|0;c[h>>2]=y+1;a[y]=x;if(t>>>0<e>>>0){r=t;while(1){p=a[r]|0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}u=r+1|0;if((cb(p<<24>>24|0,c[1472]|0)|0)==0){p=t;break a}if(u>>>0<e>>>0){r=u}else{p=t;r=u;break}}}else{p=t;r=t}}else{s=14}}while(0);b:do{if((s|0)==14){if(t>>>0<e>>>0){r=t;while(1){p=a[r]|0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}s=r+1|0;if((ib(p<<24>>24|0,c[1472]|0)|0)==0){p=t;break b}if(s>>>0<e>>>0){r=s}else{p=t;r=s;break}}}else{p=t;r=t}}}while(0);s=a[l]|0;if((s&1)==0){s=(s&255)>>>1}else{s=c[l+4>>2]|0}if((s|0)!=0){if((p|0)!=(r|0)?(q=r+ -1|0,q>>>0>p>>>0):0){s=p;do{y=a[s]|0;a[s]=a[q]|0;a[q]=y;s=s+1|0;q=q+ -1|0}while(s>>>0<q>>>0)}q=sc[c[(c[o>>2]|0)+16>>2]&127](o)|0;if(p>>>0<r>>>0){v=l+1|0;s=l+4|0;t=l+8|0;x=0;w=0;u=p;while(1){y=(a[l]&1)==0;if((a[(y?v:c[t>>2]|0)+w|0]|0)>0?(x|0)==(a[(y?v:c[t>>2]|0)+w|0]|0):0){x=c[h>>2]|0;c[h>>2]=x+1;a[x]=q;x=a[l]|0;if((x&1)==0){y=(x&255)>>>1}else{y=c[s>>2]|0}x=0;w=(w>>>0<(y+ -1|0)>>>0)+w|0}z=Bc[c[(c[m>>2]|0)+28>>2]&15](m,a[u]|0)|0;y=c[h>>2]|0;c[h>>2]=y+1;a[y]=z;u=u+1|0;if(!(u>>>0<r>>>0)){break}else{x=x+1|0}}}q=f+(p-b)|0;p=c[h>>2]|0;if((q|0)!=(p|0)?(n=p+ -1|0,n>>>0>q>>>0):0){do{z=a[q]|0;a[q]=a[n]|0;a[n]=z;q=q+1|0;n=n+ -1|0}while(q>>>0<n>>>0)}}else{yc[c[(c[m>>2]|0)+32>>2]&7](m,p,r,c[h>>2]|0)|0;c[h>>2]=(c[h>>2]|0)+(r-p)}c:do{if(r>>>0<e>>>0){while(1){n=a[r]|0;if(n<<24>>24==46){break}y=Bc[c[(c[m>>2]|0)+28>>2]&15](m,n)|0;z=c[h>>2]|0;c[h>>2]=z+1;a[z]=y;r=r+1|0;if(!(r>>>0<e>>>0)){break c}}y=sc[c[(c[o>>2]|0)+12>>2]&127](o)|0;z=c[h>>2]|0;c[h>>2]=z+1;a[z]=y;r=r+1|0}}while(0);yc[c[(c[m>>2]|0)+32>>2]&7](m,r,e,c[h>>2]|0)|0;m=(c[h>>2]|0)+(j-r)|0;c[h>>2]=m;if((d|0)==(e|0)){z=m;c[g>>2]=z;Fe(l);i=k;return}z=f+(d-b)|0;c[g>>2]=z;Fe(l);i=k;return}function Ah(b,d,e,f,g,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;j=+j;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0;s=i;i=i+144|0;u=s+8|0;C=s;y=s+44|0;B=s+36|0;z=s+74|0;x=s+20|0;q=s+32|0;d=s+28|0;v=s+24|0;t=s+40|0;F=C;c[F>>2]=37;c[F+4>>2]=0;F=C+1|0;A=f+4|0;D=c[A>>2]|0;if((D&2048|0)!=0){a[F]=43;F=C+2|0}if((D&1024|0)!=0){a[F]=35;F=F+1|0}E=D&260;D=D>>>14;do{if((E|0)==260){a[F]=76;E=F+1|0;if((D&1|0)==0){a[E]=97;D=0;break}else{a[E]=65;D=0;break}}else{a[F]=46;a[F+1|0]=42;a[F+2|0]=76;F=F+3|0;if((E|0)==4){if((D&1|0)==0){a[F]=102;D=1;break}else{a[F]=70;D=1;break}}else if((E|0)==256){if((D&1|0)==0){a[F]=101;D=1;break}else{a[F]=69;D=1;break}}else{if((D&1|0)==0){a[F]=103;D=1;break}else{a[F]=71;D=1;break}}}}while(0);c[B>>2]=y;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}E=c[1472]|0;if(D){c[u>>2]=c[f+8>>2];F=u+4|0;h[k>>3]=j;c[F>>2]=c[k>>2];c[F+4>>2]=c[k+4>>2];E=rh(y,30,E,C,u)|0}else{h[k>>3]=j;c[u>>2]=c[k>>2];c[u+4>>2]=c[k+4>>2];E=rh(y,30,E,C,u)|0}if((E|0)>29){E=(a[5896]|0)==0;if(D){if(E?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}F=c[1472]|0;c[u>>2]=c[f+8>>2];E=u+4|0;h[k>>3]=j;c[E>>2]=c[k>>2];c[E+4>>2]=c[k+4>>2];C=yh(B,F,C,u)|0}else{if(E?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}F=c[1472]|0;h[k>>3]=j;c[u>>2]=c[k>>2];c[u+4>>2]=c[k+4>>2];C=yh(B,F,C,u)|0}B=c[B>>2]|0;if((B|0)==0){bn()}else{p=B;m=B;w=C}}else{p=c[B>>2]|0;m=0;w=E}B=p+w|0;A=c[A>>2]&176;do{if((A|0)==16){A=a[p]|0;if(A<<24>>24==43|A<<24>>24==45){A=p+1|0;break}if((w|0)>1&A<<24>>24==48?(F=a[p+1|0]|0,F<<24>>24==88|F<<24>>24==120):0){A=p+2|0}else{r=44}}else if((A|0)==32){A=B}else{r=44}}while(0);if((r|0)==44){A=p}if((p|0)!=(y|0)){r=Rm(w<<1)|0;if((r|0)==0){bn()}else{o=p;n=r;l=r}}else{o=y;n=0;l=z}Ze(d,f);zh(o,A,B,l,x,q,d);ge(c[d>>2]|0)|0;c[t>>2]=c[e>>2];E=c[x>>2]|0;F=c[q>>2]|0;c[u+0>>2]=c[t+0>>2];th(v,u,l,E,F,f,g);F=c[v>>2]|0;c[e>>2]=F;c[b>>2]=F;if((n|0)!=0){Sm(n)}if((m|0)==0){i=s;return}Sm(m);i=s;return}function Bh(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0;j=i;i=i+96|0;l=j;o=j+80|0;m=j+60|0;k=j+20|0;n=j+16|0;d=j+12|0;a[o+0|0]=a[4800|0]|0;a[o+1|0]=a[4801|0]|0;a[o+2|0]=a[4802|0]|0;a[o+3|0]=a[4803|0]|0;a[o+4|0]=a[4804|0]|0;a[o+5|0]=a[4805|0]|0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}q=c[1472]|0;c[l>>2]=h;o=rh(m,20,q,o,l)|0;h=m+o|0;q=c[f+4>>2]&176;do{if((q|0)==32){q=h}else if((q|0)==16){q=a[m]|0;if(q<<24>>24==43|q<<24>>24==45){q=m+1|0;break}if((o|0)>1&q<<24>>24==48?(s=a[m+1|0]|0,s<<24>>24==88|s<<24>>24==120):0){q=m+2|0}else{p=10}}else{p=10}}while(0);if((p|0)==10){q=m}Ze(n,f);r=c[n>>2]|0;if(!((c[1500]|0)==-1)){c[l>>2]=6e3;c[l+4>>2]=117;c[l+8>>2]=0;Ae(6e3,l,118)}p=(c[6004>>2]|0)+ -1|0;s=c[r+8>>2]|0;if(!((c[r+12>>2]|0)-s>>2>>>0>p>>>0)){s=xb(4)|0;wm(s);ec(s|0,13960,106)}p=c[s+(p<<2)>>2]|0;if((p|0)==0){s=xb(4)|0;wm(s);ec(s|0,13960,106)}ge(c[n>>2]|0)|0;yc[c[(c[p>>2]|0)+32>>2]&7](p,m,h,k)|0;n=k+o|0;if((q|0)==(h|0)){s=n;r=c[e>>2]|0;c[d>>2]=r;c[l+0>>2]=c[d+0>>2];th(b,l,k,s,n,f,g);i=j;return}s=k+(q-m)|0;r=c[e>>2]|0;c[d>>2]=r;c[l+0>>2]=c[d+0>>2];th(b,l,k,s,n,f,g);i=j;return}function Ch(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function Dh(a){a=a|0;return}function Eh(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0;k=i;i=i+32|0;m=k;n=k+28|0;l=k+24|0;j=k+12|0;if((c[f+4>>2]&1|0)==0){j=c[(c[d>>2]|0)+24>>2]|0;c[n>>2]=c[e>>2];l=h&1;c[m+0>>2]=c[n+0>>2];lc[j&15](b,d,m,f,g,l);i=k;return}Ze(l,f);g=c[l>>2]|0;if(!((c[1538]|0)==-1)){c[m>>2]=6152;c[m+4>>2]=117;c[m+8>>2]=0;Ae(6152,m,118)}d=(c[6156>>2]|0)+ -1|0;m=c[g+8>>2]|0;if(!((c[g+12>>2]|0)-m>>2>>>0>d>>>0)){f=xb(4)|0;wm(f);ec(f|0,13960,106)}m=c[m+(d<<2)>>2]|0;if((m|0)==0){f=xb(4)|0;wm(f);ec(f|0,13960,106)}ge(c[l>>2]|0)|0;l=c[m>>2]|0;if(h){qc[c[l+24>>2]&63](j,m)}else{qc[c[l+28>>2]&63](j,m)}g=a[j]|0;if((g&1)==0){l=j+4|0;m=l;h=j+8|0}else{h=j+8|0;m=c[h>>2]|0;l=j+4|0}while(1){if((g&1)==0){d=l;g=(g&255)>>>1}else{d=c[h>>2]|0;g=c[l>>2]|0}if((m|0)==(d+(g<<2)|0)){break}f=c[m>>2]|0;g=c[e>>2]|0;if((g|0)!=0){n=g+24|0;d=c[n>>2]|0;if((d|0)==(c[g+28>>2]|0)){f=Bc[c[(c[g>>2]|0)+52>>2]&15](g,f)|0}else{c[n>>2]=d+4;c[d>>2]=f}if((f|0)==-1){c[e>>2]=0}}g=a[j]|0;m=m+4|0}c[b>>2]=c[e>>2];Qe(j);i=k;return}function Fh(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;m=i;i=i+128|0;l=m;s=m+104|0;d=m+112|0;o=m+8|0;q=m+4|0;k=m+96|0;p=m+92|0;n=m+100|0;a[s+0|0]=a[4792|0]|0;a[s+1|0]=a[4793|0]|0;a[s+2|0]=a[4794|0]|0;a[s+3|0]=a[4795|0]|0;a[s+4|0]=a[4796|0]|0;a[s+5|0]=a[4797|0]|0;u=s+1|0;r=f+4|0;t=c[r>>2]|0;if((t&2048|0)!=0){a[u]=43;u=s+2|0}if((t&512|0)!=0){a[u]=35;u=u+1|0}a[u]=108;u=u+1|0;v=t&74;do{if((v|0)==64){a[u]=111}else if((v|0)==8){if((t&16384|0)==0){a[u]=120;break}else{a[u]=88;break}}else{a[u]=100}}while(0);if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}v=c[1472]|0;c[l>>2]=h;s=rh(d,12,v,s,l)|0;h=d+s|0;r=c[r>>2]&176;do{if((r|0)==32){r=h}else if((r|0)==16){r=a[d]|0;if(r<<24>>24==43|r<<24>>24==45){r=d+1|0;break}if((s|0)>1&r<<24>>24==48?(v=a[d+1|0]|0,v<<24>>24==88|v<<24>>24==120):0){r=d+2|0}else{j=20}}else{j=20}}while(0);if((j|0)==20){r=d}Ze(p,f);Gh(d,r,h,o,q,k,p);ge(c[p>>2]|0)|0;c[n>>2]=c[e>>2];u=c[q>>2]|0;v=c[k>>2]|0;c[l+0>>2]=c[n+0>>2];Hh(b,l,o,u,v,f,g);i=m;return}function Gh(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;k=i;i=i+32|0;o=k;l=k+12|0;r=c[j>>2]|0;if(!((c[1498]|0)==-1)){c[o>>2]=5992;c[o+4>>2]=117;c[o+8>>2]=0;Ae(5992,o,118)}s=(c[5996>>2]|0)+ -1|0;n=c[r+8>>2]|0;if(!((c[r+12>>2]|0)-n>>2>>>0>s>>>0)){v=xb(4)|0;wm(v);ec(v|0,13960,106)}n=c[n+(s<<2)>>2]|0;if((n|0)==0){v=xb(4)|0;wm(v);ec(v|0,13960,106)}j=c[j>>2]|0;if(!((c[1538]|0)==-1)){c[o>>2]=6152;c[o+4>>2]=117;c[o+8>>2]=0;Ae(6152,o,118)}r=(c[6156>>2]|0)+ -1|0;o=c[j+8>>2]|0;if(!((c[j+12>>2]|0)-o>>2>>>0>r>>>0)){v=xb(4)|0;wm(v);ec(v|0,13960,106)}j=c[o+(r<<2)>>2]|0;if((j|0)==0){v=xb(4)|0;wm(v);ec(v|0,13960,106)}qc[c[(c[j>>2]|0)+20>>2]&63](l,j);o=a[l]|0;if((o&1)==0){o=(o&255)>>>1}else{o=c[l+4>>2]|0}if((o|0)!=0){c[h>>2]=f;o=a[b]|0;if(o<<24>>24==43|o<<24>>24==45){v=Bc[c[(c[n>>2]|0)+44>>2]&15](n,o)|0;o=c[h>>2]|0;c[h>>2]=o+4;c[o>>2]=v;o=b+1|0}else{o=b}if(((e-o|0)>1?(a[o]|0)==48:0)?(q=o+1|0,v=a[q]|0,v<<24>>24==88|v<<24>>24==120):0){v=Bc[c[(c[n>>2]|0)+44>>2]&15](n,48)|0;u=c[h>>2]|0;c[h>>2]=u+4;c[u>>2]=v;u=Bc[c[(c[n>>2]|0)+44>>2]&15](n,a[q]|0)|0;v=c[h>>2]|0;c[h>>2]=v+4;c[v>>2]=u;o=o+2|0}if((o|0)!=(e|0)?(p=e+ -1|0,p>>>0>o>>>0):0){q=o;do{v=a[q]|0;a[q]=a[p]|0;a[p]=v;q=q+1|0;p=p+ -1|0}while(q>>>0<p>>>0)}p=sc[c[(c[j>>2]|0)+16>>2]&127](j)|0;if(o>>>0<e>>>0){r=l+1|0;q=l+4|0;j=l+8|0;u=0;t=0;s=o;while(1){v=(a[l]&1)==0;if((a[(v?r:c[j>>2]|0)+t|0]|0)!=0?(u|0)==(a[(v?r:c[j>>2]|0)+t|0]|0):0){u=c[h>>2]|0;c[h>>2]=u+4;c[u>>2]=p;u=a[l]|0;if((u&1)==0){v=(u&255)>>>1}else{v=c[q>>2]|0}u=0;t=(t>>>0<(v+ -1|0)>>>0)+t|0}x=Bc[c[(c[n>>2]|0)+44>>2]&15](n,a[s]|0)|0;w=c[h>>2]|0;v=w+4|0;c[h>>2]=v;c[w>>2]=x;s=s+1|0;if(s>>>0<e>>>0){u=u+1|0}else{break}}}else{v=c[h>>2]|0}h=f+(o-b<<2)|0;if((h|0)!=(v|0)?(m=v+ -4|0,m>>>0>h>>>0):0){do{x=c[h>>2]|0;c[h>>2]=c[m>>2];c[m>>2]=x;h=h+4|0;m=m+ -4|0}while(h>>>0<m>>>0)}}else{yc[c[(c[n>>2]|0)+48>>2]&7](n,b,e,f)|0;v=f+(e-b<<2)|0;c[h>>2]=v}if((d|0)==(e|0)){x=v;c[g>>2]=x;Fe(l);i=k;return}x=f+(d-b<<2)|0;c[g>>2]=x;Fe(l);i=k;return}function Hh(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0;l=i;i=i+16|0;m=l;k=c[d>>2]|0;if((k|0)==0){c[b>>2]=0;i=l;return}n=e;o=g-n>>2;h=h+12|0;p=c[h>>2]|0;p=(p|0)>(o|0)?p-o|0:0;o=f;q=o-n|0;n=q>>2;if((q|0)>0?(kc[c[(c[k>>2]|0)+48>>2]&31](k,e,n)|0)!=(n|0):0){c[d>>2]=0;c[b>>2]=0;i=l;return}do{if((p|0)>0){Pe(m,p,j);if((a[m]&1)==0){j=m+4|0}else{j=c[m+8>>2]|0}if((kc[c[(c[k>>2]|0)+48>>2]&31](k,j,p)|0)==(p|0)){Qe(m);break}c[d>>2]=0;c[b>>2]=0;Qe(m);i=l;return}}while(0);q=g-o|0;m=q>>2;if((q|0)>0?(kc[c[(c[k>>2]|0)+48>>2]&31](k,f,m)|0)!=(m|0):0){c[d>>2]=0;c[b>>2]=0;i=l;return}c[h>>2]=0;c[b>>2]=k;i=l;return}function Ih(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;p=i;i=i+224|0;m=p;t=p+8|0;q=p+196|0;l=p+24|0;r=p+20|0;n=p+16|0;d=p+188|0;o=p+192|0;w=t;c[w>>2]=37;c[w+4>>2]=0;w=t+1|0;s=f+4|0;u=c[s>>2]|0;if((u&2048|0)!=0){a[w]=43;w=t+2|0}if((u&512|0)!=0){a[w]=35;w=w+1|0}v=w+2|0;a[w]=108;a[w+1|0]=108;w=u&74;do{if((w|0)==8){if((u&16384|0)==0){a[v]=120;break}else{a[v]=88;break}}else if((w|0)==64){a[v]=111}else{a[v]=100}}while(0);if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}w=c[1472]|0;v=m;c[v>>2]=h;c[v+4>>2]=j;h=rh(q,22,w,t,m)|0;j=q+h|0;s=c[s>>2]&176;do{if((s|0)==16){s=a[q]|0;if(s<<24>>24==43|s<<24>>24==45){s=q+1|0;break}if((h|0)>1&s<<24>>24==48?(w=a[q+1|0]|0,w<<24>>24==88|w<<24>>24==120):0){s=q+2|0}else{k=20}}else if((s|0)==32){s=j}else{k=20}}while(0);if((k|0)==20){s=q}Ze(d,f);Gh(q,s,j,l,r,n,d);ge(c[d>>2]|0)|0;c[o>>2]=c[e>>2];v=c[r>>2]|0;w=c[n>>2]|0;c[m+0>>2]=c[o+0>>2];Hh(b,m,l,v,w,f,g);i=p;return}function Jh(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;d=i;i=i+128|0;p=d;s=d+104|0;q=d+112|0;o=d+8|0;l=d+4|0;m=d+96|0;k=d+92|0;n=d+100|0;a[s+0|0]=a[4792|0]|0;a[s+1|0]=a[4793|0]|0;a[s+2|0]=a[4794|0]|0;a[s+3|0]=a[4795|0]|0;a[s+4|0]=a[4796|0]|0;a[s+5|0]=a[4797|0]|0;u=s+1|0;r=f+4|0;t=c[r>>2]|0;if((t&2048|0)!=0){a[u]=43;u=s+2|0}if((t&512|0)!=0){a[u]=35;u=u+1|0}a[u]=108;v=u+1|0;u=t&74;do{if((u|0)==8){if((t&16384|0)==0){a[v]=120;break}else{a[v]=88;break}}else if((u|0)==64){a[v]=111}else{a[v]=117}}while(0);if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}v=c[1472]|0;c[p>>2]=h;s=rh(q,12,v,s,p)|0;h=q+s|0;r=c[r>>2]&176;do{if((r|0)==16){r=a[q]|0;if(r<<24>>24==43|r<<24>>24==45){r=q+1|0;break}if((s|0)>1&r<<24>>24==48?(v=a[q+1|0]|0,v<<24>>24==88|v<<24>>24==120):0){r=q+2|0}else{j=20}}else if((r|0)==32){r=h}else{j=20}}while(0);if((j|0)==20){r=q}Ze(k,f);Gh(q,r,h,o,l,m,k);ge(c[k>>2]|0)|0;c[n>>2]=c[e>>2];u=c[l>>2]|0;v=c[m>>2]|0;c[p+0>>2]=c[n+0>>2];Hh(b,p,o,u,v,f,g);i=d;return}function Kh(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;p=i;i=i+240|0;m=p;t=p+8|0;q=p+204|0;l=p+24|0;r=p+20|0;n=p+16|0;d=p+196|0;o=p+200|0;w=t;c[w>>2]=37;c[w+4>>2]=0;w=t+1|0;s=f+4|0;u=c[s>>2]|0;if((u&2048|0)!=0){a[w]=43;w=t+2|0}if((u&512|0)!=0){a[w]=35;w=w+1|0}v=w+2|0;a[w]=108;a[w+1|0]=108;w=u&74;do{if((w|0)==8){if((u&16384|0)==0){a[v]=120;break}else{a[v]=88;break}}else if((w|0)==64){a[v]=111}else{a[v]=117}}while(0);if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}w=c[1472]|0;v=m;c[v>>2]=h;c[v+4>>2]=j;h=rh(q,23,w,t,m)|0;j=q+h|0;s=c[s>>2]&176;do{if((s|0)==16){s=a[q]|0;if(s<<24>>24==43|s<<24>>24==45){s=q+1|0;break}if((h|0)>1&s<<24>>24==48?(w=a[q+1|0]|0,w<<24>>24==88|w<<24>>24==120):0){s=q+2|0}else{k=20}}else if((s|0)==32){s=j}else{k=20}}while(0);if((k|0)==20){s=q}Ze(d,f);Gh(q,s,j,l,r,n,d);ge(c[d>>2]|0)|0;c[o>>2]=c[e>>2];v=c[r>>2]|0;w=c[n>>2]|0;c[m+0>>2]=c[o+0>>2];Hh(b,m,l,v,w,f,g);i=p;return}function Lh(b,d,e,f,g,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;j=+j;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0;s=i;i=i+320|0;u=s;C=s+16|0;y=s+276|0;B=s+36|0;z=s+44|0;x=s+24|0;d=s+32|0;q=s+40|0;v=s+28|0;t=s+272|0;E=C;c[E>>2]=37;c[E+4>>2]=0;E=C+1|0;A=f+4|0;F=c[A>>2]|0;if((F&2048|0)!=0){a[E]=43;E=C+2|0}if((F&1024|0)!=0){a[E]=35;E=E+1|0}D=F&260;F=F>>>14;do{if((D|0)==260){if((F&1|0)==0){a[E]=97;D=0;break}else{a[E]=65;D=0;break}}else{a[E]=46;G=E+2|0;a[E+1|0]=42;if((D|0)==4){if((F&1|0)==0){a[G]=102;D=1;break}else{a[G]=70;D=1;break}}else if((D|0)==256){if((F&1|0)==0){a[G]=101;D=1;break}else{a[G]=69;D=1;break}}else{if((F&1|0)==0){a[G]=103;D=1;break}else{a[G]=71;D=1;break}}}}while(0);c[B>>2]=y;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}E=c[1472]|0;if(D){c[u>>2]=c[f+8>>2];G=u+4|0;h[k>>3]=j;c[G>>2]=c[k>>2];c[G+4>>2]=c[k+4>>2];E=rh(y,30,E,C,u)|0}else{h[k>>3]=j;c[u>>2]=c[k>>2];c[u+4>>2]=c[k+4>>2];E=rh(y,30,E,C,u)|0}if((E|0)>29){E=(a[5896]|0)==0;if(D){if(E?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}G=c[1472]|0;c[u>>2]=c[f+8>>2];F=u+4|0;h[k>>3]=j;c[F>>2]=c[k>>2];c[F+4>>2]=c[k+4>>2];C=yh(B,G,C,u)|0}else{if(E?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}G=c[1472]|0;c[u>>2]=c[f+8>>2];F=u+4|0;h[k>>3]=j;c[F>>2]=c[k>>2];c[F+4>>2]=c[k+4>>2];C=yh(B,G,C,u)|0}B=c[B>>2]|0;if((B|0)==0){bn()}else{p=B;m=B;w=C}}else{p=c[B>>2]|0;m=0;w=E}B=p+w|0;A=c[A>>2]&176;do{if((A|0)==16){A=a[p]|0;if(A<<24>>24==43|A<<24>>24==45){A=p+1|0;break}if((w|0)>1&A<<24>>24==48?(G=a[p+1|0]|0,G<<24>>24==88|G<<24>>24==120):0){A=p+2|0}else{r=44}}else if((A|0)==32){A=B}else{r=44}}while(0);if((r|0)==44){A=p}if((p|0)!=(y|0)){r=Rm(w<<3)|0;if((r|0)==0){bn()}else{l=p;n=r;o=r}}else{l=y;n=0;o=z}Ze(q,f);Mh(l,A,B,o,x,d,q);ge(c[q>>2]|0)|0;c[t>>2]=c[e>>2];F=c[x>>2]|0;G=c[d>>2]|0;c[u+0>>2]=c[t+0>>2];Hh(v,u,o,F,G,f,g);G=c[v>>2]|0;c[e>>2]=G;c[b>>2]=G;if((n|0)!=0){Sm(n)}if((m|0)==0){i=s;return}Sm(m);i=s;return}function Mh(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0;k=i;i=i+32|0;n=k;l=k+12|0;q=c[j>>2]|0;if(!((c[1498]|0)==-1)){c[n>>2]=5992;c[n+4>>2]=117;c[n+8>>2]=0;Ae(5992,n,118)}m=(c[5996>>2]|0)+ -1|0;t=c[q+8>>2]|0;if(!((c[q+12>>2]|0)-t>>2>>>0>m>>>0)){y=xb(4)|0;wm(y);ec(y|0,13960,106)}m=c[t+(m<<2)>>2]|0;if((m|0)==0){y=xb(4)|0;wm(y);ec(y|0,13960,106)}j=c[j>>2]|0;if(!((c[1538]|0)==-1)){c[n>>2]=6152;c[n+4>>2]=117;c[n+8>>2]=0;Ae(6152,n,118)}n=(c[6156>>2]|0)+ -1|0;q=c[j+8>>2]|0;if(!((c[j+12>>2]|0)-q>>2>>>0>n>>>0)){y=xb(4)|0;wm(y);ec(y|0,13960,106)}j=c[q+(n<<2)>>2]|0;if((j|0)==0){y=xb(4)|0;wm(y);ec(y|0,13960,106)}qc[c[(c[j>>2]|0)+20>>2]&63](l,j);c[h>>2]=f;n=a[b]|0;if(n<<24>>24==43|n<<24>>24==45){y=Bc[c[(c[m>>2]|0)+44>>2]&15](m,n)|0;t=c[h>>2]|0;c[h>>2]=t+4;c[t>>2]=y;t=b+1|0}else{t=b}n=e;a:do{if(((n-t|0)>1?(a[t]|0)==48:0)?(p=t+1|0,y=a[p]|0,y<<24>>24==88|y<<24>>24==120):0){y=Bc[c[(c[m>>2]|0)+44>>2]&15](m,48)|0;x=c[h>>2]|0;c[h>>2]=x+4;c[x>>2]=y;t=t+2|0;x=Bc[c[(c[m>>2]|0)+44>>2]&15](m,a[p]|0)|0;y=c[h>>2]|0;c[h>>2]=y+4;c[y>>2]=x;if(t>>>0<e>>>0){p=t;while(1){q=a[p]|0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}u=p+1|0;if((cb(q<<24>>24|0,c[1472]|0)|0)==0){q=t;break a}if(u>>>0<e>>>0){p=u}else{q=t;p=u;break}}}else{q=t;p=t}}else{s=14}}while(0);b:do{if((s|0)==14){if(t>>>0<e>>>0){p=t;while(1){q=a[p]|0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}s=p+1|0;if((ib(q<<24>>24|0,c[1472]|0)|0)==0){q=t;break b}if(s>>>0<e>>>0){p=s}else{q=t;p=s;break}}}else{q=t;p=t}}}while(0);s=a[l]|0;if((s&1)==0){s=(s&255)>>>1}else{s=c[l+4>>2]|0}if((s|0)!=0){if((q|0)!=(p|0)?(r=p+ -1|0,r>>>0>q>>>0):0){s=q;do{y=a[s]|0;a[s]=a[r]|0;a[r]=y;s=s+1|0;r=r+ -1|0}while(s>>>0<r>>>0)}u=sc[c[(c[j>>2]|0)+16>>2]&127](j)|0;if(q>>>0<p>>>0){r=l+1|0;t=l+4|0;s=l+8|0;x=0;w=0;v=q;while(1){y=(a[l]&1)==0;if((a[(y?r:c[s>>2]|0)+w|0]|0)>0?(x|0)==(a[(y?r:c[s>>2]|0)+w|0]|0):0){x=c[h>>2]|0;c[h>>2]=x+4;c[x>>2]=u;x=a[l]|0;if((x&1)==0){y=(x&255)>>>1}else{y=c[t>>2]|0}x=0;w=(w>>>0<(y+ -1|0)>>>0)+w|0}A=Bc[c[(c[m>>2]|0)+44>>2]&15](m,a[v]|0)|0;z=c[h>>2]|0;y=z+4|0;c[h>>2]=y;c[z>>2]=A;v=v+1|0;if(v>>>0<p>>>0){x=x+1|0}else{break}}}else{y=c[h>>2]|0}q=f+(q-b<<2)|0;if((q|0)!=(y|0)?(o=y+ -4|0,o>>>0>q>>>0):0){do{A=c[q>>2]|0;c[q>>2]=c[o>>2];c[o>>2]=A;q=q+4|0;o=o+ -4|0}while(q>>>0<o>>>0)}}else{yc[c[(c[m>>2]|0)+48>>2]&7](m,q,p,c[h>>2]|0)|0;y=(c[h>>2]|0)+(p-q<<2)|0;c[h>>2]=y}c:do{if(p>>>0<e>>>0){while(1){o=a[p]|0;if(o<<24>>24==46){break}z=Bc[c[(c[m>>2]|0)+44>>2]&15](m,o)|0;A=c[h>>2]|0;y=A+4|0;c[h>>2]=y;c[A>>2]=z;p=p+1|0;if(!(p>>>0<e>>>0)){break c}}z=sc[c[(c[j>>2]|0)+12>>2]&127](j)|0;A=c[h>>2]|0;y=A+4|0;c[h>>2]=y;c[A>>2]=z;p=p+1|0}}while(0);yc[c[(c[m>>2]|0)+48>>2]&7](m,p,e,y)|0;m=(c[h>>2]|0)+(n-p<<2)|0;c[h>>2]=m;if((d|0)==(e|0)){A=m;c[g>>2]=A;Fe(l);i=k;return}A=f+(d-b<<2)|0;c[g>>2]=A;Fe(l);i=k;return}function Nh(b,d,e,f,g,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;j=+j;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0;s=i;i=i+320|0;u=s;C=s+16|0;y=s+276|0;B=s+36|0;z=s+44|0;q=s+24|0;r=s+32|0;d=s+40|0;v=s+28|0;t=s+272|0;F=C;c[F>>2]=37;c[F+4>>2]=0;F=C+1|0;A=f+4|0;D=c[A>>2]|0;if((D&2048|0)!=0){a[F]=43;F=C+2|0}if((D&1024|0)!=0){a[F]=35;F=F+1|0}E=D&260;D=D>>>14;do{if((E|0)==260){a[F]=76;E=F+1|0;if((D&1|0)==0){a[E]=97;D=0;break}else{a[E]=65;D=0;break}}else{a[F]=46;a[F+1|0]=42;a[F+2|0]=76;F=F+3|0;if((E|0)==256){if((D&1|0)==0){a[F]=101;D=1;break}else{a[F]=69;D=1;break}}else if((E|0)==4){if((D&1|0)==0){a[F]=102;D=1;break}else{a[F]=70;D=1;break}}else{if((D&1|0)==0){a[F]=103;D=1;break}else{a[F]=71;D=1;break}}}}while(0);c[B>>2]=y;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}E=c[1472]|0;if(D){c[u>>2]=c[f+8>>2];F=u+4|0;h[k>>3]=j;c[F>>2]=c[k>>2];c[F+4>>2]=c[k+4>>2];E=rh(y,30,E,C,u)|0}else{h[k>>3]=j;c[u>>2]=c[k>>2];c[u+4>>2]=c[k+4>>2];E=rh(y,30,E,C,u)|0}if((E|0)>29){E=(a[5896]|0)==0;if(D){if(E?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}F=c[1472]|0;c[u>>2]=c[f+8>>2];E=u+4|0;h[k>>3]=j;c[E>>2]=c[k>>2];c[E+4>>2]=c[k+4>>2];C=yh(B,F,C,u)|0}else{if(E?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}F=c[1472]|0;h[k>>3]=j;c[u>>2]=c[k>>2];c[u+4>>2]=c[k+4>>2];C=yh(B,F,C,u)|0}B=c[B>>2]|0;if((B|0)==0){bn()}else{m=B;l=B;w=C}}else{m=c[B>>2]|0;l=0;w=E}B=m+w|0;A=c[A>>2]&176;do{if((A|0)==32){A=B}else if((A|0)==16){A=a[m]|0;if(A<<24>>24==43|A<<24>>24==45){A=m+1|0;break}if((w|0)>1&A<<24>>24==48?(F=a[m+1|0]|0,F<<24>>24==88|F<<24>>24==120):0){A=m+2|0}else{x=44}}else{x=44}}while(0);if((x|0)==44){A=m}if((m|0)!=(y|0)){w=Rm(w<<3)|0;if((w|0)==0){bn()}else{o=m;n=w;p=w}}else{o=y;n=0;p=z}Ze(d,f);Mh(o,A,B,p,q,r,d);ge(c[d>>2]|0)|0;c[t>>2]=c[e>>2];E=c[q>>2]|0;F=c[r>>2]|0;c[u+0>>2]=c[t+0>>2];Hh(v,u,p,E,F,f,g);F=c[v>>2]|0;c[e>>2]=F;c[b>>2]=F;if((n|0)!=0){Sm(n)}if((l|0)==0){i=s;return}Sm(l);i=s;return}function Oh(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0;j=i;i=i+208|0;k=j;o=j+188|0;l=j+168|0;m=j+20|0;n=j+16|0;d=j+12|0;a[o+0|0]=a[4800|0]|0;a[o+1|0]=a[4801|0]|0;a[o+2|0]=a[4802|0]|0;a[o+3|0]=a[4803|0]|0;a[o+4|0]=a[4804|0]|0;a[o+5|0]=a[4805|0]|0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}q=c[1472]|0;c[k>>2]=h;o=rh(l,20,q,o,k)|0;h=l+o|0;q=c[f+4>>2]&176;do{if((q|0)==16){q=a[l]|0;if(q<<24>>24==43|q<<24>>24==45){q=l+1|0;break}if((o|0)>1&q<<24>>24==48?(s=a[l+1|0]|0,s<<24>>24==88|s<<24>>24==120):0){q=l+2|0}else{p=10}}else if((q|0)==32){q=h}else{p=10}}while(0);if((p|0)==10){q=l}Ze(n,f);r=c[n>>2]|0;if(!((c[1498]|0)==-1)){c[k>>2]=5992;c[k+4>>2]=117;c[k+8>>2]=0;Ae(5992,k,118)}p=(c[5996>>2]|0)+ -1|0;s=c[r+8>>2]|0;if(!((c[r+12>>2]|0)-s>>2>>>0>p>>>0)){s=xb(4)|0;wm(s);ec(s|0,13960,106)}p=c[s+(p<<2)>>2]|0;if((p|0)==0){s=xb(4)|0;wm(s);ec(s|0,13960,106)}ge(c[n>>2]|0)|0;yc[c[(c[p>>2]|0)+48>>2]&7](p,l,h,m)|0;n=m+(o<<2)|0;if((q|0)==(h|0)){s=n;r=c[e>>2]|0;c[d>>2]=r;c[k+0>>2]=c[d+0>>2];Hh(b,k,m,s,n,f,g);i=j;return}s=m+(q-l<<2)|0;r=c[e>>2]|0;c[d>>2]=r;c[k+0>>2]=c[d+0>>2];Hh(b,k,m,s,n,f,g);i=j;return}function Ph(e,f,g,h,j,k,l,m,n){e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;var o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;p=i;i=i+32|0;t=p;q=p+28|0;x=p+24|0;r=p+20|0;s=p+16|0;u=p+12|0;Ze(x,j);w=c[x>>2]|0;if(!((c[1500]|0)==-1)){c[t>>2]=6e3;c[t+4>>2]=117;c[t+8>>2]=0;Ae(6e3,t,118)}y=(c[6004>>2]|0)+ -1|0;z=c[w+8>>2]|0;if(!((c[w+12>>2]|0)-z>>2>>>0>y>>>0)){D=xb(4)|0;wm(D);ec(D|0,13960,106)}w=c[z+(y<<2)>>2]|0;if((w|0)==0){D=xb(4)|0;wm(D);ec(D|0,13960,106)}ge(c[x>>2]|0)|0;c[k>>2]=0;a:do{if((m|0)!=(n|0)){x=w+8|0;y=0;b:while(1){while(1){if((y|0)!=0){o=65;break a}y=c[g>>2]|0;if((y|0)!=0){if((c[y+12>>2]|0)==(c[y+16>>2]|0)?(sc[c[(c[y>>2]|0)+36>>2]&127](y)|0)==-1:0){c[g>>2]=0;y=0}}else{y=0}A=(y|0)==0;z=c[h>>2]|0;do{if((z|0)!=0){if((c[z+12>>2]|0)==(c[z+16>>2]|0)?(sc[c[(c[z>>2]|0)+36>>2]&127](z)|0)==-1:0){c[h>>2]=0;o=19;break}if(!A){o=20;break b}}else{o=19}}while(0);if((o|0)==19){o=0;if(A){o=20;break b}else{z=0}}if((kc[c[(c[w>>2]|0)+36>>2]&31](w,a[m]|0,0)|0)<<24>>24==37){o=22;break}A=a[m]|0;if(A<<24>>24>-1?(v=c[x>>2]|0,!((b[v+(A<<24>>24<<1)>>1]&8192)==0)):0){o=33;break}z=y+12|0;B=c[z>>2]|0;A=y+16|0;if((B|0)==(c[A>>2]|0)){B=sc[c[(c[y>>2]|0)+36>>2]&127](y)|0}else{B=d[B]|0}D=Bc[c[(c[w>>2]|0)+12>>2]&15](w,B&255)|0;if(D<<24>>24==(Bc[c[(c[w>>2]|0)+12>>2]&15](w,a[m]|0)|0)<<24>>24){o=60;break}c[k>>2]=4;y=4}c:do{if((o|0)==22){o=0;B=m+1|0;if((B|0)==(n|0)){o=23;break b}A=kc[c[(c[w>>2]|0)+36>>2]&31](w,a[B]|0,0)|0;if(A<<24>>24==48|A<<24>>24==69){B=m+2|0;if((B|0)==(n|0)){o=26;break b}m=B;B=kc[c[(c[w>>2]|0)+36>>2]&31](w,a[B]|0,0)|0}else{m=B;B=A;A=0}D=c[(c[f>>2]|0)+36>>2]|0;c[s>>2]=y;c[u>>2]=z;c[q+0>>2]=c[s+0>>2];c[t+0>>2]=c[u+0>>2];rc[D&3](r,f,q,t,j,k,l,B,A);c[g>>2]=c[r>>2];m=m+1|0}else if((o|0)==33){while(1){o=0;m=m+1|0;if((m|0)==(n|0)){m=n;break}A=a[m]|0;if(!(A<<24>>24>-1)){break}if((b[v+(A<<24>>24<<1)>>1]&8192)==0){break}else{o=33}}B=z;A=z;while(1){if((y|0)!=0){if((c[y+12>>2]|0)==(c[y+16>>2]|0)?(sc[c[(c[y>>2]|0)+36>>2]&127](y)|0)==-1:0){c[g>>2]=0;y=0}}else{y=0}C=(y|0)==0;do{if((A|0)!=0){if((c[A+12>>2]|0)!=(c[A+16>>2]|0)){if(C){z=B;break}else{break c}}if(!((sc[c[(c[A>>2]|0)+36>>2]&127](A)|0)==-1)){if(C^(B|0)==0){z=B;A=B;break}else{break c}}else{c[h>>2]=0;z=0;o=46;break}}else{z=B;o=46}}while(0);if((o|0)==46){o=0;if(C){break c}else{A=0}}C=y+12|0;D=c[C>>2]|0;B=y+16|0;if((D|0)==(c[B>>2]|0)){D=sc[c[(c[y>>2]|0)+36>>2]&127](y)|0}else{D=d[D]|0}if(!((D&255)<<24>>24>-1)){break c}if((b[(c[x>>2]|0)+(D<<24>>24<<1)>>1]&8192)==0){break c}D=c[C>>2]|0;if((D|0)==(c[B>>2]|0)){sc[c[(c[y>>2]|0)+40>>2]&127](y)|0;B=z;continue}else{c[C>>2]=D+1;B=z;continue}}}else if((o|0)==60){o=0;B=c[z>>2]|0;if((B|0)==(c[A>>2]|0)){sc[c[(c[y>>2]|0)+40>>2]&127](y)|0}else{c[z>>2]=B+1}m=m+1|0}}while(0);if((m|0)==(n|0)){o=65;break a}y=c[k>>2]|0}if((o|0)==20){c[k>>2]=4;break}else if((o|0)==23){c[k>>2]=4;break}else if((o|0)==26){c[k>>2]=4;break}}else{o=65}}while(0);if((o|0)==65){y=c[g>>2]|0}if((y|0)!=0){if((c[y+12>>2]|0)==(c[y+16>>2]|0)?(sc[c[(c[y>>2]|0)+36>>2]&127](y)|0)==-1:0){c[g>>2]=0;y=0}}else{y=0}j=(y|0)==0;g=c[h>>2]|0;do{if((g|0)!=0){if((c[g+12>>2]|0)==(c[g+16>>2]|0)?(sc[c[(c[g>>2]|0)+36>>2]&127](g)|0)==-1:0){c[h>>2]=0;o=75;break}if(j){c[e>>2]=y;i=p;return}}else{o=75}}while(0);if((o|0)==75?!j:0){c[e>>2]=y;i=p;return}c[k>>2]=c[k>>2]|2;c[e>>2]=y;i=p;return}function Qh(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function Rh(a){a=a|0;return}function Sh(a){a=a|0;return 2}function Th(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0;j=i;i=i+16|0;k=j+12|0;l=j+8|0;n=j+4|0;m=j;c[n>>2]=c[d>>2];c[m>>2]=c[e>>2];c[l+0>>2]=c[n+0>>2];c[k+0>>2]=c[m+0>>2];Ph(a,b,l,k,f,g,h,4904,4912|0);i=j;return}function Uh(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0;o=i;i=i+16|0;k=o+12|0;l=o+8|0;n=o+4|0;m=o;p=d+8|0;p=sc[c[(c[p>>2]|0)+20>>2]&127](p)|0;c[n>>2]=c[e>>2];c[m>>2]=c[f>>2];e=a[p]|0;if((e&1)==0){f=p+1|0;e=(e&255)>>>1;p=p+1|0}else{q=c[p+8>>2]|0;f=q;e=c[p+4>>2]|0;p=q}q=f+e|0;c[l+0>>2]=c[n+0>>2];c[k+0>>2]=c[m+0>>2];Ph(b,d,l,k,g,h,j,p,q);i=o;return}function Vh(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0;j=i;i=i+32|0;k=j;m=j+16|0;l=j+12|0;Ze(l,f);f=c[l>>2]|0;if(!((c[1500]|0)==-1)){c[k>>2]=6e3;c[k+4>>2]=117;c[k+8>>2]=0;Ae(6e3,k,118)}o=(c[6004>>2]|0)+ -1|0;n=c[f+8>>2]|0;if(!((c[f+12>>2]|0)-n>>2>>>0>o>>>0)){o=xb(4)|0;wm(o);ec(o|0,13960,106)}f=c[n+(o<<2)>>2]|0;if((f|0)==0){o=xb(4)|0;wm(o);ec(o|0,13960,106)}ge(c[l>>2]|0)|0;n=c[e>>2]|0;o=b+8|0;o=sc[c[c[o>>2]>>2]&127](o)|0;c[m>>2]=n;n=o+168|0;c[k+0>>2]=c[m+0>>2];k=(pg(d,k,o,n,f,g,0)|0)-o|0;if((k|0)>=168){o=c[d>>2]|0;c[a>>2]=o;i=j;return}c[h+24>>2]=((k|0)/12|0|0)%7|0;o=c[d>>2]|0;c[a>>2]=o;i=j;return}function Wh(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0;j=i;i=i+32|0;k=j;m=j+16|0;l=j+12|0;Ze(l,f);f=c[l>>2]|0;if(!((c[1500]|0)==-1)){c[k>>2]=6e3;c[k+4>>2]=117;c[k+8>>2]=0;Ae(6e3,k,118)}o=(c[6004>>2]|0)+ -1|0;n=c[f+8>>2]|0;if(!((c[f+12>>2]|0)-n>>2>>>0>o>>>0)){o=xb(4)|0;wm(o);ec(o|0,13960,106)}f=c[n+(o<<2)>>2]|0;if((f|0)==0){o=xb(4)|0;wm(o);ec(o|0,13960,106)}ge(c[l>>2]|0)|0;n=c[e>>2]|0;o=b+8|0;o=sc[c[(c[o>>2]|0)+4>>2]&127](o)|0;c[m>>2]=n;n=o+288|0;c[k+0>>2]=c[m+0>>2];k=(pg(d,k,o,n,f,g,0)|0)-o|0;if((k|0)>=288){o=c[d>>2]|0;c[a>>2]=o;i=j;return}c[h+16>>2]=((k|0)/12|0|0)%12|0;o=c[d>>2]|0;c[a>>2]=o;i=j;return}function Xh(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0;b=i;i=i+32|0;j=b;k=b+16|0;l=b+12|0;Ze(l,f);f=c[l>>2]|0;if(!((c[1500]|0)==-1)){c[j>>2]=6e3;c[j+4>>2]=117;c[j+8>>2]=0;Ae(6e3,j,118)}n=(c[6004>>2]|0)+ -1|0;m=c[f+8>>2]|0;if(!((c[f+12>>2]|0)-m>>2>>>0>n>>>0)){n=xb(4)|0;wm(n);ec(n|0,13960,106)}f=c[m+(n<<2)>>2]|0;if((f|0)==0){n=xb(4)|0;wm(n);ec(n|0,13960,106)}ge(c[l>>2]|0)|0;h=h+20|0;c[k>>2]=c[e>>2];c[j+0>>2]=c[k+0>>2];e=$h(d,j,g,f,4)|0;if((c[g>>2]&4|0)!=0){n=c[d>>2]|0;c[a>>2]=n;i=b;return}if((e|0)<69){g=e+2e3|0}else{g=(e+ -69|0)>>>0<31?e+1900|0:e}c[h>>2]=g+ -1900;n=c[d>>2]|0;c[a>>2]=n;i=b;return}function Yh(b,d,e,f,g,h,j,k,l){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0;l=i;i=i+176|0;m=l;n=l+12|0;y=l+24|0;_=l+64|0;H=l+20|0;q=l+28|0;P=l+124|0;U=l+32|0;T=l+36|0;z=l+40|0;X=l+44|0;x=l+48|0;S=l+52|0;W=l+56|0;R=l+60|0;v=l+16|0;t=l+68|0;u=l+72|0;B=l+76|0;G=l+80|0;A=l+84|0;O=l+88|0;C=l+92|0;N=l+96|0;D=l+100|0;$=l+104|0;E=l+108|0;F=l+112|0;K=l+116|0;I=l+120|0;J=l+128|0;Z=l+132|0;V=l+136|0;Y=l+140|0;L=l+144|0;M=l+148|0;w=l+152|0;r=l+156|0;s=l+160|0;Q=l+164|0;c[h>>2]=0;Ze(R,g);aa=c[R>>2]|0;if(!((c[1500]|0)==-1)){c[m>>2]=6e3;c[m+4>>2]=117;c[m+8>>2]=0;Ae(6e3,m,118)}ba=(c[6004>>2]|0)+ -1|0;p=c[aa+8>>2]|0;if(!((c[aa+12>>2]|0)-p>>2>>>0>ba>>>0)){ba=xb(4)|0;wm(ba);ec(ba|0,13960,106)}p=c[p+(ba<<2)>>2]|0;if((p|0)==0){ba=xb(4)|0;wm(ba);ec(ba|0,13960,106)}ge(c[R>>2]|0)|0;a:do{switch(k<<24>>24|0){case 72:{c[X>>2]=c[f>>2];c[m+0>>2]=c[X+0>>2];m=$h(e,m,h,p,2)|0;d=c[h>>2]|0;if((d&4|0)==0&(m|0)<24){c[j+8>>2]=m;break a}else{c[h>>2]=d|4;break a}};case 65:case 97:{aa=c[f>>2]|0;ba=d+8|0;ba=sc[c[c[ba>>2]>>2]&127](ba)|0;c[W>>2]=aa;c[m+0>>2]=c[W+0>>2];h=(pg(e,m,ba,ba+168|0,p,h,0)|0)-ba|0;if((h|0)<168){c[j+24>>2]=((h|0)/12|0|0)%7|0}break};case 99:{o=d+8|0;o=sc[c[(c[o>>2]|0)+12>>2]&127](o)|0;c[t>>2]=c[e>>2];c[u>>2]=c[f>>2];q=a[o]|0;if((q&1)==0){p=o+1|0;q=(q&255)>>>1;o=o+1|0}else{ba=c[o+8>>2]|0;p=ba;q=c[o+4>>2]|0;o=ba}c[n+0>>2]=c[t+0>>2];c[m+0>>2]=c[u+0>>2];Ph(v,d,n,m,g,h,j,o,p+q|0);c[e>>2]=c[v>>2];break};case 106:{c[T>>2]=c[f>>2];c[m+0>>2]=c[T+0>>2];m=$h(e,m,h,p,3)|0;d=c[h>>2]|0;if((d&4|0)==0&(m|0)<366){c[j+28>>2]=m;break a}else{c[h>>2]=d|4;break a}};case 68:{c[G>>2]=c[e>>2];c[A>>2]=c[f>>2];c[n+0>>2]=c[G+0>>2];c[m+0>>2]=c[A+0>>2];Ph(B,d,n,m,g,h,j,4912,4920|0);c[e>>2]=c[B>>2];break};case 70:{c[C>>2]=c[e>>2];c[N>>2]=c[f>>2];c[n+0>>2]=c[C+0>>2];c[m+0>>2]=c[N+0>>2];Ph(O,d,n,m,g,h,j,4920,4928|0);c[e>>2]=c[O>>2];break};case 77:{c[P>>2]=c[f>>2];c[m+0>>2]=c[P+0>>2];d=$h(e,m,h,p,2)|0;m=c[h>>2]|0;if((m&4|0)==0&(d|0)<60){c[j+4>>2]=d;break a}else{c[h>>2]=m|4;break a}};case 104:case 66:case 98:{aa=c[f>>2]|0;ba=d+8|0;ba=sc[c[(c[ba>>2]|0)+4>>2]&127](ba)|0;c[S>>2]=aa;c[m+0>>2]=c[S+0>>2];h=(pg(e,m,ba,ba+288|0,p,h,0)|0)-ba|0;if((h|0)<288){c[j+16>>2]=((h|0)/12|0|0)%12|0}break};case 101:case 100:{j=j+12|0;c[x>>2]=c[f>>2];c[m+0>>2]=c[x+0>>2];m=$h(e,m,h,p,2)|0;d=c[h>>2]|0;if((d&4|0)==0?(m+ -1|0)>>>0<31:0){c[j>>2]=m;break a}c[h>>2]=d|4;break};case 109:{c[U>>2]=c[f>>2];c[m+0>>2]=c[U+0>>2];m=$h(e,m,h,p,2)|0;d=c[h>>2]|0;if((d&4|0)==0&(m|0)<13){c[j+16>>2]=m+ -1;break a}else{c[h>>2]=d|4;break a}};case 84:{c[V>>2]=c[e>>2];c[Y>>2]=c[f>>2];c[n+0>>2]=c[V+0>>2];c[m+0>>2]=c[Y+0>>2];Ph(Z,d,n,m,g,h,j,4952,4960|0);c[e>>2]=c[Z>>2];break};case 119:{c[_>>2]=c[f>>2];c[m+0>>2]=c[_+0>>2];m=$h(e,m,h,p,1)|0;d=c[h>>2]|0;if((d&4|0)==0&(m|0)<7){c[j+24>>2]=m;break a}else{c[h>>2]=d|4;break a}};case 112:{j=j+8|0;g=c[f>>2]|0;d=d+8|0;d=sc[c[(c[d>>2]|0)+8>>2]&127](d)|0;n=a[d]|0;if((n&1)==0){n=(n&255)>>>1}else{n=c[d+4>>2]|0}f=a[d+12|0]|0;if((f&1)==0){f=(f&255)>>>1}else{f=c[d+16>>2]|0}if((n|0)==(0-f|0)){c[h>>2]=c[h>>2]|4;break a}c[q>>2]=g;c[m+0>>2]=c[q+0>>2];ba=pg(e,m,d,d+24|0,p,h,0)|0;h=ba-d|0;if((ba|0)==(d|0)?(c[j>>2]|0)==12:0){c[j>>2]=0;break a}if((h|0)==12?(o=c[j>>2]|0,(o|0)<12):0){c[j>>2]=o+12}break};case 73:{j=j+8|0;c[z>>2]=c[f>>2];c[m+0>>2]=c[z+0>>2];d=$h(e,m,h,p,2)|0;m=c[h>>2]|0;if((m&4|0)==0?(d+ -1|0)>>>0<12:0){c[j>>2]=d;break a}c[h>>2]=m|4;break};case 121:{j=j+20|0;c[y>>2]=c[f>>2];c[m+0>>2]=c[y+0>>2];m=$h(e,m,h,p,4)|0;if((c[h>>2]&4|0)==0){if((m|0)<69){h=m+2e3|0}else{h=(m+ -69|0)>>>0<31?m+1900|0:m}c[j>>2]=h+ -1900}break};case 116:case 110:{c[D>>2]=c[f>>2];c[m+0>>2]=c[D+0>>2];Zh(0,e,m,h,p);break};case 114:{c[E>>2]=c[e>>2];c[F>>2]=c[f>>2];c[n+0>>2]=c[E+0>>2];c[m+0>>2]=c[F+0>>2];Ph($,d,n,m,g,h,j,4928,4939|0);c[e>>2]=c[$>>2];break};case 83:{c[H>>2]=c[f>>2];c[m+0>>2]=c[H+0>>2];m=$h(e,m,h,p,2)|0;d=c[h>>2]|0;if((d&4|0)==0&(m|0)<61){c[j>>2]=m;break a}else{c[h>>2]=d|4;break a}};case 82:{c[I>>2]=c[e>>2];c[J>>2]=c[f>>2];c[n+0>>2]=c[I+0>>2];c[m+0>>2]=c[J+0>>2];Ph(K,d,n,m,g,h,j,4944,4949|0);c[e>>2]=c[K>>2];break};case 120:{ba=c[(c[d>>2]|0)+20>>2]|0;c[L>>2]=c[e>>2];c[M>>2]=c[f>>2];c[n+0>>2]=c[L+0>>2];c[m+0>>2]=c[M+0>>2];nc[ba&63](b,d,n,m,g,h,j);i=l;return};case 88:{o=d+8|0;o=sc[c[(c[o>>2]|0)+24>>2]&127](o)|0;c[r>>2]=c[e>>2];c[s>>2]=c[f>>2];q=a[o]|0;if((q&1)==0){p=o+1|0;q=(q&255)>>>1;o=o+1|0}else{ba=c[o+8>>2]|0;p=ba;q=c[o+4>>2]|0;o=ba}c[n+0>>2]=c[r+0>>2];c[m+0>>2]=c[s+0>>2];Ph(w,d,n,m,g,h,j,o,p+q|0);c[e>>2]=c[w>>2];break};case 89:{c[n>>2]=c[f>>2];c[m+0>>2]=c[n+0>>2];m=$h(e,m,h,p,4)|0;if((c[h>>2]&4|0)==0){c[j+20>>2]=m+ -1900}break};case 37:{c[Q>>2]=c[f>>2];c[m+0>>2]=c[Q+0>>2];_h(0,e,m,h,p);break};default:{c[h>>2]=c[h>>2]|4}}}while(0);c[b>>2]=c[e>>2];i=l;return}function Zh(a,e,f,g,h){a=a|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;a=i;h=h+8|0;a:while(1){k=c[e>>2]|0;do{if((k|0)!=0){if((c[k+12>>2]|0)==(c[k+16>>2]|0)){if((sc[c[(c[k>>2]|0)+36>>2]&127](k)|0)==-1){c[e>>2]=0;k=0;break}else{k=c[e>>2]|0;break}}}else{k=0}}while(0);l=(k|0)==0;k=c[f>>2]|0;do{if((k|0)!=0){if((c[k+12>>2]|0)!=(c[k+16>>2]|0)){if(l){break}else{break a}}if(!((sc[c[(c[k>>2]|0)+36>>2]&127](k)|0)==-1)){if(l){break}else{break a}}else{c[f>>2]=0;j=12;break}}else{j=12}}while(0);if((j|0)==12){j=0;if(l){k=0;break}else{k=0}}m=c[e>>2]|0;l=c[m+12>>2]|0;if((l|0)==(c[m+16>>2]|0)){l=sc[c[(c[m>>2]|0)+36>>2]&127](m)|0}else{l=d[l]|0}if(!((l&255)<<24>>24>-1)){break}if((b[(c[h>>2]|0)+(l<<24>>24<<1)>>1]&8192)==0){break}k=c[e>>2]|0;m=k+12|0;l=c[m>>2]|0;if((l|0)==(c[k+16>>2]|0)){sc[c[(c[k>>2]|0)+40>>2]&127](k)|0;continue}else{c[m>>2]=l+1;continue}}h=c[e>>2]|0;do{if((h|0)!=0){if((c[h+12>>2]|0)==(c[h+16>>2]|0)){if((sc[c[(c[h>>2]|0)+36>>2]&127](h)|0)==-1){c[e>>2]=0;h=0;break}else{h=c[e>>2]|0;break}}}else{h=0}}while(0);e=(h|0)==0;do{if((k|0)!=0){if((c[k+12>>2]|0)==(c[k+16>>2]|0)?(sc[c[(c[k>>2]|0)+36>>2]&127](k)|0)==-1:0){c[f>>2]=0;j=32;break}if(e){i=a;return}}else{j=32}}while(0);if((j|0)==32?!e:0){i=a;return}c[g>>2]=c[g>>2]|2;i=a;return}function _h(a,b,e,f,g){a=a|0;b=b|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0;a=i;j=c[b>>2]|0;do{if((j|0)!=0){if((c[j+12>>2]|0)==(c[j+16>>2]|0)){if((sc[c[(c[j>>2]|0)+36>>2]&127](j)|0)==-1){c[b>>2]=0;j=0;break}else{j=c[b>>2]|0;break}}}else{j=0}}while(0);k=(j|0)==0;j=c[e>>2]|0;do{if((j|0)!=0){if((c[j+12>>2]|0)==(c[j+16>>2]|0)?(sc[c[(c[j>>2]|0)+36>>2]&127](j)|0)==-1:0){c[e>>2]=0;h=11;break}if(!k){h=12}}else{h=11}}while(0);if((h|0)==11){if(k){h=12}else{j=0}}if((h|0)==12){c[f>>2]=c[f>>2]|6;i=a;return}l=c[b>>2]|0;k=c[l+12>>2]|0;if((k|0)==(c[l+16>>2]|0)){k=sc[c[(c[l>>2]|0)+36>>2]&127](l)|0}else{k=d[k]|0}if(!((kc[c[(c[g>>2]|0)+36>>2]&31](g,k&255,0)|0)<<24>>24==37)){c[f>>2]=c[f>>2]|4;i=a;return}l=c[b>>2]|0;k=l+12|0;g=c[k>>2]|0;if((g|0)==(c[l+16>>2]|0)){sc[c[(c[l>>2]|0)+40>>2]&127](l)|0}else{c[k>>2]=g+1}g=c[b>>2]|0;do{if((g|0)!=0){if((c[g+12>>2]|0)==(c[g+16>>2]|0)){if((sc[c[(c[g>>2]|0)+36>>2]&127](g)|0)==-1){c[b>>2]=0;g=0;break}else{g=c[b>>2]|0;break}}}else{g=0}}while(0);b=(g|0)==0;do{if((j|0)!=0){if((c[j+12>>2]|0)==(c[j+16>>2]|0)?(sc[c[(c[j>>2]|0)+36>>2]&127](j)|0)==-1:0){c[e>>2]=0;h=31;break}if(b){i=a;return}}else{h=31}}while(0);if((h|0)==31?!b:0){i=a;return}c[f>>2]=c[f>>2]|2;i=a;return}function $h(a,e,f,g,h){a=a|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;j=i;l=c[a>>2]|0;do{if((l|0)!=0){if((c[l+12>>2]|0)==(c[l+16>>2]|0)){if((sc[c[(c[l>>2]|0)+36>>2]&127](l)|0)==-1){c[a>>2]=0;l=0;break}else{l=c[a>>2]|0;break}}}else{l=0}}while(0);m=(l|0)==0;l=c[e>>2]|0;do{if((l|0)!=0){if((c[l+12>>2]|0)==(c[l+16>>2]|0)?(sc[c[(c[l>>2]|0)+36>>2]&127](l)|0)==-1:0){c[e>>2]=0;n=11;break}if(!m){n=12}}else{n=11}}while(0);if((n|0)==11){if(m){n=12}else{l=0}}if((n|0)==12){c[f>>2]=c[f>>2]|6;q=0;i=j;return q|0}n=c[a>>2]|0;m=c[n+12>>2]|0;if((m|0)==(c[n+16>>2]|0)){n=sc[c[(c[n>>2]|0)+36>>2]&127](n)|0}else{n=d[m]|0}m=n&255;if(m<<24>>24>-1?(k=g+8|0,!((b[(c[k>>2]|0)+(n<<24>>24<<1)>>1]&2048)==0)):0){m=(kc[c[(c[g>>2]|0)+36>>2]&31](g,m,0)|0)<<24>>24;p=c[a>>2]|0;n=p+12|0;o=c[n>>2]|0;if((o|0)==(c[p+16>>2]|0)){sc[c[(c[p>>2]|0)+40>>2]&127](p)|0;o=l;n=l}else{c[n>>2]=o+1;o=l;n=l}while(1){m=m+ -48|0;h=h+ -1|0;l=c[a>>2]|0;do{if((l|0)!=0){if((c[l+12>>2]|0)==(c[l+16>>2]|0)){if((sc[c[(c[l>>2]|0)+36>>2]&127](l)|0)==-1){c[a>>2]=0;l=0;break}else{l=c[a>>2]|0;break}}}else{l=0}}while(0);p=(l|0)==0;if((n|0)!=0){if((c[n+12>>2]|0)==(c[n+16>>2]|0)){if((sc[c[(c[n>>2]|0)+36>>2]&127](n)|0)==-1){c[e>>2]=0;l=0;n=0}else{l=o;n=o}}else{l=o}}else{l=o;n=0}o=c[a>>2]|0;if(!((p^(n|0)==0)&(h|0)>0)){n=40;break}p=c[o+12>>2]|0;if((p|0)==(c[o+16>>2]|0)){o=sc[c[(c[o>>2]|0)+36>>2]&127](o)|0}else{o=d[p]|0}p=o&255;if(!(p<<24>>24>-1)){n=52;break}if((b[(c[k>>2]|0)+(o<<24>>24<<1)>>1]&2048)==0){n=52;break}m=((kc[c[(c[g>>2]|0)+36>>2]&31](g,p,0)|0)<<24>>24)+(m*10|0)|0;p=c[a>>2]|0;q=p+12|0;o=c[q>>2]|0;if((o|0)==(c[p+16>>2]|0)){sc[c[(c[p>>2]|0)+40>>2]&127](p)|0;o=l;continue}else{c[q>>2]=o+1;o=l;continue}}if((n|0)==40){do{if((o|0)!=0){if((c[o+12>>2]|0)==(c[o+16>>2]|0)){if((sc[c[(c[o>>2]|0)+36>>2]&127](o)|0)==-1){c[a>>2]=0;o=0;break}else{o=c[a>>2]|0;break}}}else{o=0}}while(0);g=(o|0)==0;do{if((l|0)!=0){if((c[l+12>>2]|0)==(c[l+16>>2]|0)?(sc[c[(c[l>>2]|0)+36>>2]&127](l)|0)==-1:0){c[e>>2]=0;n=50;break}if(g){q=m;i=j;return q|0}}else{n=50}}while(0);if((n|0)==50?!g:0){q=m;i=j;return q|0}c[f>>2]=c[f>>2]|2;q=m;i=j;return q|0}else if((n|0)==52){i=j;return m|0}}c[f>>2]=c[f>>2]|4;q=0;i=j;return q|0}function ai(a,b,d,e,f,g,h,j,k){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0;m=i;i=i+32|0;r=m;o=m+28|0;t=m+24|0;p=m+20|0;q=m+16|0;n=m+12|0;Ze(t,f);v=c[t>>2]|0;if(!((c[1498]|0)==-1)){c[r>>2]=5992;c[r+4>>2]=117;c[r+8>>2]=0;Ae(5992,r,118)}s=(c[5996>>2]|0)+ -1|0;u=c[v+8>>2]|0;if(!((c[v+12>>2]|0)-u>>2>>>0>s>>>0)){y=xb(4)|0;wm(y);ec(y|0,13960,106)}s=c[u+(s<<2)>>2]|0;if((s|0)==0){y=xb(4)|0;wm(y);ec(y|0,13960,106)}ge(c[t>>2]|0)|0;c[g>>2]=0;a:do{if((j|0)!=(k|0)){t=0;b:while(1){while(1){if((t|0)!=0){l=69;break a}t=c[d>>2]|0;if((t|0)!=0){u=c[t+12>>2]|0;if((u|0)==(c[t+16>>2]|0)){u=sc[c[(c[t>>2]|0)+36>>2]&127](t)|0}else{u=c[u>>2]|0}if((u|0)==-1){c[d>>2]=0;v=1;t=0}else{v=0}}else{v=1;t=0}u=c[e>>2]|0;do{if((u|0)!=0){w=c[u+12>>2]|0;if((w|0)==(c[u+16>>2]|0)){w=sc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{w=c[w>>2]|0}if(!((w|0)==-1)){if(v){break}else{l=24;break b}}else{c[e>>2]=0;l=22;break}}else{l=22}}while(0);if((l|0)==22){l=0;if(v){l=24;break b}else{u=0}}if((kc[c[(c[s>>2]|0)+52>>2]&31](s,c[j>>2]|0,0)|0)<<24>>24==37){l=26;break}if(kc[c[(c[s>>2]|0)+12>>2]&31](s,8192,c[j>>2]|0)|0){l=36;break}u=t+12|0;w=c[u>>2]|0;v=t+16|0;if((w|0)==(c[v>>2]|0)){w=sc[c[(c[t>>2]|0)+36>>2]&127](t)|0}else{w=c[w>>2]|0}y=Bc[c[(c[s>>2]|0)+28>>2]&15](s,w)|0;if((y|0)==(Bc[c[(c[s>>2]|0)+28>>2]&15](s,c[j>>2]|0)|0)){l=64;break}c[g>>2]=4;t=4}c:do{if((l|0)==26){l=0;w=j+4|0;if((w|0)==(k|0)){l=27;break b}v=kc[c[(c[s>>2]|0)+52>>2]&31](s,c[w>>2]|0,0)|0;if(v<<24>>24==48|v<<24>>24==69){w=j+8|0;if((w|0)==(k|0)){l=30;break b}j=w;w=kc[c[(c[s>>2]|0)+52>>2]&31](s,c[w>>2]|0,0)|0}else{j=w;w=v;v=0}y=c[(c[b>>2]|0)+36>>2]|0;c[q>>2]=t;c[n>>2]=u;c[o+0>>2]=c[q+0>>2];c[r+0>>2]=c[n+0>>2];rc[y&3](p,b,o,r,f,g,h,w,v);c[d>>2]=c[p>>2];j=j+4|0}else if((l|0)==36){while(1){l=0;j=j+4|0;if((j|0)==(k|0)){j=k;break}if(kc[c[(c[s>>2]|0)+12>>2]&31](s,8192,c[j>>2]|0)|0){l=36}else{break}}v=u;while(1){if((t|0)!=0){w=c[t+12>>2]|0;if((w|0)==(c[t+16>>2]|0)){w=sc[c[(c[t>>2]|0)+36>>2]&127](t)|0}else{w=c[w>>2]|0}if((w|0)==-1){c[d>>2]=0;w=1;t=0}else{w=0}}else{w=1;t=0}do{if((u|0)!=0){x=c[u+12>>2]|0;if((x|0)==(c[u+16>>2]|0)){u=sc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{u=c[x>>2]|0}if(!((u|0)==-1)){if(w^(v|0)==0){w=v;u=v;break}else{break c}}else{c[e>>2]=0;v=0;l=51;break}}else{l=51}}while(0);if((l|0)==51){l=0;if(w){break c}else{w=v;u=0}}x=t+12|0;y=c[x>>2]|0;v=t+16|0;if((y|0)==(c[v>>2]|0)){y=sc[c[(c[t>>2]|0)+36>>2]&127](t)|0}else{y=c[y>>2]|0}if(!(kc[c[(c[s>>2]|0)+12>>2]&31](s,8192,y)|0)){break c}y=c[x>>2]|0;if((y|0)==(c[v>>2]|0)){sc[c[(c[t>>2]|0)+40>>2]&127](t)|0;v=w;continue}else{c[x>>2]=y+4;v=w;continue}}}else if((l|0)==64){l=0;w=c[u>>2]|0;if((w|0)==(c[v>>2]|0)){sc[c[(c[t>>2]|0)+40>>2]&127](t)|0}else{c[u>>2]=w+4}j=j+4|0}}while(0);if((j|0)==(k|0)){l=69;break a}t=c[g>>2]|0}if((l|0)==24){c[g>>2]=4;break}else if((l|0)==27){c[g>>2]=4;break}else if((l|0)==30){c[g>>2]=4;break}}else{l=69}}while(0);if((l|0)==69){t=c[d>>2]|0}if((t|0)!=0){f=c[t+12>>2]|0;if((f|0)==(c[t+16>>2]|0)){f=sc[c[(c[t>>2]|0)+36>>2]&127](t)|0}else{f=c[f>>2]|0}if((f|0)==-1){c[d>>2]=0;t=0;d=1}else{d=0}}else{t=0;d=1}f=c[e>>2]|0;do{if((f|0)!=0){n=c[f+12>>2]|0;if((n|0)==(c[f+16>>2]|0)){f=sc[c[(c[f>>2]|0)+36>>2]&127](f)|0}else{f=c[n>>2]|0}if((f|0)==-1){c[e>>2]=0;l=82;break}if(d){c[a>>2]=t;i=m;return}}else{l=82}}while(0);if((l|0)==82?!d:0){c[a>>2]=t;i=m;return}c[g>>2]=c[g>>2]|2;c[a>>2]=t;i=m;return}function bi(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function ci(a){a=a|0;return}function di(a){a=a|0;return 2}function ei(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0;j=i;i=i+16|0;k=j+12|0;l=j+8|0;n=j+4|0;m=j;c[n>>2]=c[d>>2];c[m>>2]=c[e>>2];c[l+0>>2]=c[n+0>>2];c[k+0>>2]=c[m+0>>2];ai(a,b,l,k,f,g,h,5056,5088|0);i=j;return}function fi(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0;o=i;i=i+16|0;k=o+12|0;l=o+8|0;n=o+4|0;m=o;p=d+8|0;p=sc[c[(c[p>>2]|0)+20>>2]&127](p)|0;c[n>>2]=c[e>>2];c[m>>2]=c[f>>2];e=a[p]|0;if((e&1)==0){f=p+4|0;e=(e&255)>>>1;p=p+4|0}else{q=c[p+8>>2]|0;f=q;e=c[p+4>>2]|0;p=q}q=f+(e<<2)|0;c[l+0>>2]=c[n+0>>2];c[k+0>>2]=c[m+0>>2];ai(b,d,l,k,g,h,j,p,q);i=o;return}function gi(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0;j=i;i=i+32|0;k=j;m=j+16|0;l=j+12|0;Ze(l,f);f=c[l>>2]|0;if(!((c[1498]|0)==-1)){c[k>>2]=5992;c[k+4>>2]=117;c[k+8>>2]=0;Ae(5992,k,118)}o=(c[5996>>2]|0)+ -1|0;n=c[f+8>>2]|0;if(!((c[f+12>>2]|0)-n>>2>>>0>o>>>0)){o=xb(4)|0;wm(o);ec(o|0,13960,106)}f=c[n+(o<<2)>>2]|0;if((f|0)==0){o=xb(4)|0;wm(o);ec(o|0,13960,106)}ge(c[l>>2]|0)|0;n=c[e>>2]|0;o=b+8|0;o=sc[c[c[o>>2]>>2]&127](o)|0;c[m>>2]=n;n=o+168|0;c[k+0>>2]=c[m+0>>2];k=(Og(d,k,o,n,f,g,0)|0)-o|0;if((k|0)>=168){o=c[d>>2]|0;c[a>>2]=o;i=j;return}c[h+24>>2]=((k|0)/12|0|0)%7|0;o=c[d>>2]|0;c[a>>2]=o;i=j;return}function hi(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0;j=i;i=i+32|0;k=j;m=j+16|0;l=j+12|0;Ze(l,f);f=c[l>>2]|0;if(!((c[1498]|0)==-1)){c[k>>2]=5992;c[k+4>>2]=117;c[k+8>>2]=0;Ae(5992,k,118)}o=(c[5996>>2]|0)+ -1|0;n=c[f+8>>2]|0;if(!((c[f+12>>2]|0)-n>>2>>>0>o>>>0)){o=xb(4)|0;wm(o);ec(o|0,13960,106)}f=c[n+(o<<2)>>2]|0;if((f|0)==0){o=xb(4)|0;wm(o);ec(o|0,13960,106)}ge(c[l>>2]|0)|0;n=c[e>>2]|0;o=b+8|0;o=sc[c[(c[o>>2]|0)+4>>2]&127](o)|0;c[m>>2]=n;n=o+288|0;c[k+0>>2]=c[m+0>>2];k=(Og(d,k,o,n,f,g,0)|0)-o|0;if((k|0)>=288){o=c[d>>2]|0;c[a>>2]=o;i=j;return}c[h+16>>2]=((k|0)/12|0|0)%12|0;o=c[d>>2]|0;c[a>>2]=o;i=j;return}function ii(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0;b=i;i=i+32|0;j=b;k=b+16|0;l=b+12|0;Ze(l,f);f=c[l>>2]|0;if(!((c[1498]|0)==-1)){c[j>>2]=5992;c[j+4>>2]=117;c[j+8>>2]=0;Ae(5992,j,118)}n=(c[5996>>2]|0)+ -1|0;m=c[f+8>>2]|0;if(!((c[f+12>>2]|0)-m>>2>>>0>n>>>0)){n=xb(4)|0;wm(n);ec(n|0,13960,106)}f=c[m+(n<<2)>>2]|0;if((f|0)==0){n=xb(4)|0;wm(n);ec(n|0,13960,106)}ge(c[l>>2]|0)|0;h=h+20|0;c[k>>2]=c[e>>2];c[j+0>>2]=c[k+0>>2];e=mi(d,j,g,f,4)|0;if((c[g>>2]&4|0)!=0){n=c[d>>2]|0;c[a>>2]=n;i=b;return}if((e|0)<69){g=e+2e3|0}else{g=(e+ -69|0)>>>0<31?e+1900|0:e}c[h>>2]=g+ -1900;n=c[d>>2]|0;c[a>>2]=n;i=b;return}function ji(b,d,e,f,g,h,j,k,l){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0;l=i;i=i+176|0;m=l;n=l+12|0;y=l+24|0;Y=l+64|0;_=l+20|0;q=l+28|0;E=l+124|0;Z=l+32|0;V=l+36|0;z=l+40|0;X=l+44|0;x=l+48|0;S=l+52|0;N=l+56|0;R=l+60|0;r=l+16|0;s=l+68|0;v=l+72|0;U=l+76|0;$=l+80|0;G=l+84|0;M=l+88|0;W=l+92|0;F=l+96|0;T=l+100|0;I=l+104|0;A=l+108|0;H=l+112|0;L=l+116|0;J=l+120|0;K=l+128|0;D=l+132|0;B=l+136|0;C=l+140|0;P=l+144|0;Q=l+148|0;w=l+152|0;t=l+156|0;u=l+160|0;O=l+164|0;c[h>>2]=0;Ze(R,g);aa=c[R>>2]|0;if(!((c[1498]|0)==-1)){c[m>>2]=5992;c[m+4>>2]=117;c[m+8>>2]=0;Ae(5992,m,118)}ba=(c[5996>>2]|0)+ -1|0;p=c[aa+8>>2]|0;if(!((c[aa+12>>2]|0)-p>>2>>>0>ba>>>0)){ba=xb(4)|0;wm(ba);ec(ba|0,13960,106)}p=c[p+(ba<<2)>>2]|0;if((p|0)==0){ba=xb(4)|0;wm(ba);ec(ba|0,13960,106)}ge(c[R>>2]|0)|0;a:do{switch(k<<24>>24|0){case 72:{c[X>>2]=c[f>>2];c[m+0>>2]=c[X+0>>2];m=mi(e,m,h,p,2)|0;d=c[h>>2]|0;if((d&4|0)==0&(m|0)<24){c[j+8>>2]=m;break a}else{c[h>>2]=d|4;break a}};case 99:{p=d+8|0;p=sc[c[(c[p>>2]|0)+12>>2]&127](p)|0;c[s>>2]=c[e>>2];c[v>>2]=c[f>>2];q=a[p]|0;if((q&1)==0){o=p+4|0;q=(q&255)>>>1;p=p+4|0}else{ba=c[p+8>>2]|0;o=ba;q=c[p+4>>2]|0;p=ba}c[n+0>>2]=c[s+0>>2];c[m+0>>2]=c[v+0>>2];ai(r,d,n,m,g,h,j,p,o+(q<<2)|0);c[e>>2]=c[r>>2];break};case 106:{c[V>>2]=c[f>>2];c[m+0>>2]=c[V+0>>2];m=mi(e,m,h,p,3)|0;d=c[h>>2]|0;if((d&4|0)==0&(m|0)<366){c[j+28>>2]=m;break a}else{c[h>>2]=d|4;break a}};case 68:{c[$>>2]=c[e>>2];c[G>>2]=c[f>>2];c[n+0>>2]=c[$+0>>2];c[m+0>>2]=c[G+0>>2];ai(U,d,n,m,g,h,j,5088,5120|0);c[e>>2]=c[U>>2];break};case 101:case 100:{j=j+12|0;c[x>>2]=c[f>>2];c[m+0>>2]=c[x+0>>2];d=mi(e,m,h,p,2)|0;m=c[h>>2]|0;if((m&4|0)==0?(d+ -1|0)>>>0<31:0){c[j>>2]=d;break a}c[h>>2]=m|4;break};case 70:{c[W>>2]=c[e>>2];c[F>>2]=c[f>>2];c[n+0>>2]=c[W+0>>2];c[m+0>>2]=c[F+0>>2];ai(M,d,n,m,g,h,j,5120,5152|0);c[e>>2]=c[M>>2];break};case 65:case 97:{aa=c[f>>2]|0;ba=d+8|0;ba=sc[c[c[ba>>2]>>2]&127](ba)|0;c[N>>2]=aa;c[m+0>>2]=c[N+0>>2];h=(Og(e,m,ba,ba+168|0,p,h,0)|0)-ba|0;if((h|0)<168){c[j+24>>2]=((h|0)/12|0|0)%7|0}break};case 104:case 66:case 98:{aa=c[f>>2]|0;ba=d+8|0;ba=sc[c[(c[ba>>2]|0)+4>>2]&127](ba)|0;c[S>>2]=aa;c[m+0>>2]=c[S+0>>2];h=(Og(e,m,ba,ba+288|0,p,h,0)|0)-ba|0;if((h|0)<288){c[j+16>>2]=((h|0)/12|0|0)%12|0}break};case 116:case 110:{c[T>>2]=c[f>>2];c[m+0>>2]=c[T+0>>2];ki(0,e,m,h,p);break};case 88:{p=d+8|0;p=sc[c[(c[p>>2]|0)+24>>2]&127](p)|0;c[t>>2]=c[e>>2];c[u>>2]=c[f>>2];q=a[p]|0;if((q&1)==0){o=p+4|0;q=(q&255)>>>1;p=p+4|0}else{ba=c[p+8>>2]|0;o=ba;q=c[p+4>>2]|0;p=ba}c[n+0>>2]=c[t+0>>2];c[m+0>>2]=c[u+0>>2];ai(w,d,n,m,g,h,j,p,o+(q<<2)|0);c[e>>2]=c[w>>2];break};case 119:{c[Y>>2]=c[f>>2];c[m+0>>2]=c[Y+0>>2];m=mi(e,m,h,p,1)|0;d=c[h>>2]|0;if((d&4|0)==0&(m|0)<7){c[j+24>>2]=m;break a}else{c[h>>2]=d|4;break a}};case 109:{c[Z>>2]=c[f>>2];c[m+0>>2]=c[Z+0>>2];m=mi(e,m,h,p,2)|0;d=c[h>>2]|0;if((d&4|0)==0&(m|0)<13){c[j+16>>2]=m+ -1;break a}else{c[h>>2]=d|4;break a}};case 83:{c[_>>2]=c[f>>2];c[m+0>>2]=c[_+0>>2];m=mi(e,m,h,p,2)|0;d=c[h>>2]|0;if((d&4|0)==0&(m|0)<61){c[j>>2]=m;break a}else{c[h>>2]=d|4;break a}};case 84:{c[B>>2]=c[e>>2];c[C>>2]=c[f>>2];c[n+0>>2]=c[B+0>>2];c[m+0>>2]=c[C+0>>2];ai(D,d,n,m,g,h,j,5224,5256|0);c[e>>2]=c[D>>2];break};case 77:{c[E>>2]=c[f>>2];c[m+0>>2]=c[E+0>>2];m=mi(e,m,h,p,2)|0;d=c[h>>2]|0;if((d&4|0)==0&(m|0)<60){c[j+4>>2]=m;break a}else{c[h>>2]=d|4;break a}};case 73:{j=j+8|0;c[z>>2]=c[f>>2];c[m+0>>2]=c[z+0>>2];m=mi(e,m,h,p,2)|0;d=c[h>>2]|0;if((d&4|0)==0?(m+ -1|0)>>>0<12:0){c[j>>2]=m;break a}c[h>>2]=d|4;break};case 114:{c[A>>2]=c[e>>2];c[H>>2]=c[f>>2];c[n+0>>2]=c[A+0>>2];c[m+0>>2]=c[H+0>>2];ai(I,d,n,m,g,h,j,5152,5196|0);c[e>>2]=c[I>>2];break};case 82:{c[J>>2]=c[e>>2];c[K>>2]=c[f>>2];c[n+0>>2]=c[J+0>>2];c[m+0>>2]=c[K+0>>2];ai(L,d,n,m,g,h,j,5200,5220|0);c[e>>2]=c[L>>2];break};case 121:{j=j+20|0;c[y>>2]=c[f>>2];c[m+0>>2]=c[y+0>>2];m=mi(e,m,h,p,4)|0;if((c[h>>2]&4|0)==0){if((m|0)<69){h=m+2e3|0}else{h=(m+ -69|0)>>>0<31?m+1900|0:m}c[j>>2]=h+ -1900}break};case 112:{j=j+8|0;g=c[f>>2]|0;d=d+8|0;d=sc[c[(c[d>>2]|0)+8>>2]&127](d)|0;n=a[d]|0;if((n&1)==0){n=(n&255)>>>1}else{n=c[d+4>>2]|0}f=a[d+12|0]|0;if((f&1)==0){f=(f&255)>>>1}else{f=c[d+16>>2]|0}if((n|0)==(0-f|0)){c[h>>2]=c[h>>2]|4;break a}c[q>>2]=g;c[m+0>>2]=c[q+0>>2];ba=Og(e,m,d,d+24|0,p,h,0)|0;h=ba-d|0;if((ba|0)==(d|0)?(c[j>>2]|0)==12:0){c[j>>2]=0;break a}if((h|0)==12?(o=c[j>>2]|0,(o|0)<12):0){c[j>>2]=o+12}break};case 89:{c[n>>2]=c[f>>2];c[m+0>>2]=c[n+0>>2];m=mi(e,m,h,p,4)|0;if((c[h>>2]&4|0)==0){c[j+20>>2]=m+ -1900}break};case 37:{c[O>>2]=c[f>>2];c[m+0>>2]=c[O+0>>2];li(0,e,m,h,p);break};case 120:{ba=c[(c[d>>2]|0)+20>>2]|0;c[P>>2]=c[e>>2];c[Q>>2]=c[f>>2];c[n+0>>2]=c[P+0>>2];c[m+0>>2]=c[Q+0>>2];nc[ba&63](b,d,n,m,g,h,j);i=l;return};default:{c[h>>2]=c[h>>2]|4}}}while(0);c[b>>2]=c[e>>2];i=l;return}function ki(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0;a=i;a:while(1){h=c[b>>2]|0;do{if((h|0)!=0){j=c[h+12>>2]|0;if((j|0)==(c[h+16>>2]|0)){h=sc[c[(c[h>>2]|0)+36>>2]&127](h)|0}else{h=c[j>>2]|0}if((h|0)==-1){c[b>>2]=0;h=1;break}else{h=(c[b>>2]|0)==0;break}}else{h=1}}while(0);j=c[d>>2]|0;do{if((j|0)!=0){k=c[j+12>>2]|0;if((k|0)==(c[j+16>>2]|0)){k=sc[c[(c[j>>2]|0)+36>>2]&127](j)|0}else{k=c[k>>2]|0}if(!((k|0)==-1)){if(h){break}else{f=j;break a}}else{c[d>>2]=0;g=15;break}}else{g=15}}while(0);if((g|0)==15){g=0;if(h){f=0;break}else{j=0}}h=c[b>>2]|0;k=c[h+12>>2]|0;if((k|0)==(c[h+16>>2]|0)){h=sc[c[(c[h>>2]|0)+36>>2]&127](h)|0}else{h=c[k>>2]|0}if(!(kc[c[(c[f>>2]|0)+12>>2]&31](f,8192,h)|0)){f=j;break}h=c[b>>2]|0;j=h+12|0;k=c[j>>2]|0;if((k|0)==(c[h+16>>2]|0)){sc[c[(c[h>>2]|0)+40>>2]&127](h)|0;continue}else{c[j>>2]=k+4;continue}}h=c[b>>2]|0;do{if((h|0)!=0){j=c[h+12>>2]|0;if((j|0)==(c[h+16>>2]|0)){h=sc[c[(c[h>>2]|0)+36>>2]&127](h)|0}else{h=c[j>>2]|0}if((h|0)==-1){c[b>>2]=0;b=1;break}else{b=(c[b>>2]|0)==0;break}}else{b=1}}while(0);do{if((f|0)!=0){h=c[f+12>>2]|0;if((h|0)==(c[f+16>>2]|0)){f=sc[c[(c[f>>2]|0)+36>>2]&127](f)|0}else{f=c[h>>2]|0}if((f|0)==-1){c[d>>2]=0;g=37;break}if(b){i=a;return}}else{g=37}}while(0);if((g|0)==37?!b:0){i=a;return}c[e>>2]=c[e>>2]|2;i=a;return}function li(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0;a=i;j=c[b>>2]|0;do{if((j|0)!=0){h=c[j+12>>2]|0;if((h|0)==(c[j+16>>2]|0)){h=sc[c[(c[j>>2]|0)+36>>2]&127](j)|0}else{h=c[h>>2]|0}if((h|0)==-1){c[b>>2]=0;j=1;break}else{j=(c[b>>2]|0)==0;break}}else{j=1}}while(0);h=c[d>>2]|0;do{if((h|0)!=0){k=c[h+12>>2]|0;if((k|0)==(c[h+16>>2]|0)){k=sc[c[(c[h>>2]|0)+36>>2]&127](h)|0}else{k=c[k>>2]|0}if(!((k|0)==-1)){if(j){break}else{g=16;break}}else{c[d>>2]=0;g=14;break}}else{g=14}}while(0);if((g|0)==14){if(j){g=16}else{h=0}}if((g|0)==16){c[e>>2]=c[e>>2]|6;i=a;return}k=c[b>>2]|0;j=c[k+12>>2]|0;if((j|0)==(c[k+16>>2]|0)){j=sc[c[(c[k>>2]|0)+36>>2]&127](k)|0}else{j=c[j>>2]|0}if(!((kc[c[(c[f>>2]|0)+52>>2]&31](f,j,0)|0)<<24>>24==37)){c[e>>2]=c[e>>2]|4;i=a;return}j=c[b>>2]|0;k=j+12|0;f=c[k>>2]|0;if((f|0)==(c[j+16>>2]|0)){sc[c[(c[j>>2]|0)+40>>2]&127](j)|0}else{c[k>>2]=f+4}f=c[b>>2]|0;do{if((f|0)!=0){j=c[f+12>>2]|0;if((j|0)==(c[f+16>>2]|0)){f=sc[c[(c[f>>2]|0)+36>>2]&127](f)|0}else{f=c[j>>2]|0}if((f|0)==-1){c[b>>2]=0;b=1;break}else{b=(c[b>>2]|0)==0;break}}else{b=1}}while(0);do{if((h|0)!=0){f=c[h+12>>2]|0;if((f|0)==(c[h+16>>2]|0)){f=sc[c[(c[h>>2]|0)+36>>2]&127](h)|0}else{f=c[f>>2]|0}if((f|0)==-1){c[d>>2]=0;g=38;break}if(b){i=a;return}}else{g=38}}while(0);if((g|0)==38?!b:0){i=a;return}c[e>>2]=c[e>>2]|2;i=a;return}



function mi(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;h=i;j=c[a>>2]|0;do{if((j|0)!=0){k=c[j+12>>2]|0;if((k|0)==(c[j+16>>2]|0)){j=sc[c[(c[j>>2]|0)+36>>2]&127](j)|0}else{j=c[k>>2]|0}if((j|0)==-1){c[a>>2]=0;k=1;break}else{k=(c[a>>2]|0)==0;break}}else{k=1}}while(0);j=c[b>>2]|0;do{if((j|0)!=0){l=c[j+12>>2]|0;if((l|0)==(c[j+16>>2]|0)){l=sc[c[(c[j>>2]|0)+36>>2]&127](j)|0}else{l=c[l>>2]|0}if(!((l|0)==-1)){if(k){break}else{g=16;break}}else{c[b>>2]=0;g=14;break}}else{g=14}}while(0);if((g|0)==14){if(k){g=16}else{j=0}}if((g|0)==16){c[d>>2]=c[d>>2]|6;o=0;i=h;return o|0}k=c[a>>2]|0;l=c[k+12>>2]|0;if((l|0)==(c[k+16>>2]|0)){k=sc[c[(c[k>>2]|0)+36>>2]&127](k)|0}else{k=c[l>>2]|0}if(!(kc[c[(c[e>>2]|0)+12>>2]&31](e,2048,k)|0)){c[d>>2]=c[d>>2]|4;o=0;i=h;return o|0}k=(kc[c[(c[e>>2]|0)+52>>2]&31](e,k,0)|0)<<24>>24;m=c[a>>2]|0;l=m+12|0;n=c[l>>2]|0;if((n|0)==(c[m+16>>2]|0)){sc[c[(c[m>>2]|0)+40>>2]&127](m)|0;l=j;m=j;j=k}else{c[l>>2]=n+4;l=j;m=j;j=k}while(1){j=j+ -48|0;f=f+ -1|0;n=c[a>>2]|0;do{if((n|0)!=0){k=c[n+12>>2]|0;if((k|0)==(c[n+16>>2]|0)){k=sc[c[(c[n>>2]|0)+36>>2]&127](n)|0}else{k=c[k>>2]|0}if((k|0)==-1){c[a>>2]=0;n=1;break}else{n=(c[a>>2]|0)==0;break}}else{n=1}}while(0);do{if((m|0)!=0){k=c[m+12>>2]|0;if((k|0)==(c[m+16>>2]|0)){k=sc[c[(c[m>>2]|0)+36>>2]&127](m)|0}else{k=c[k>>2]|0}if((k|0)==-1){c[b>>2]=0;k=0;m=0;o=1;break}else{k=l;m=l;o=(l|0)==0;break}}else{k=l;m=0;o=1}}while(0);l=c[a>>2]|0;if(!((n^o)&(f|0)>0)){break}n=c[l+12>>2]|0;if((n|0)==(c[l+16>>2]|0)){l=sc[c[(c[l>>2]|0)+36>>2]&127](l)|0}else{l=c[n>>2]|0}if(!(kc[c[(c[e>>2]|0)+12>>2]&31](e,2048,l)|0)){g=63;break}j=((kc[c[(c[e>>2]|0)+52>>2]&31](e,l,0)|0)<<24>>24)+(j*10|0)|0;o=c[a>>2]|0;n=o+12|0;l=c[n>>2]|0;if((l|0)==(c[o+16>>2]|0)){sc[c[(c[o>>2]|0)+40>>2]&127](o)|0;l=k;continue}else{c[n>>2]=l+4;l=k;continue}}if((g|0)==63){i=h;return j|0}do{if((l|0)!=0){e=c[l+12>>2]|0;if((e|0)==(c[l+16>>2]|0)){e=sc[c[(c[l>>2]|0)+36>>2]&127](l)|0}else{e=c[e>>2]|0}if((e|0)==-1){c[a>>2]=0;a=1;break}else{a=(c[a>>2]|0)==0;break}}else{a=1}}while(0);do{if((k|0)!=0){e=c[k+12>>2]|0;if((e|0)==(c[k+16>>2]|0)){e=sc[c[(c[k>>2]|0)+36>>2]&127](k)|0}else{e=c[e>>2]|0}if((e|0)==-1){c[b>>2]=0;g=60;break}if(a){o=j;i=h;return o|0}}else{g=60}}while(0);if((g|0)==60?!a:0){o=j;i=h;return o|0}c[d>>2]=c[d>>2]|2;o=j;i=h;return o|0}function ni(b){b=b|0;var d=0,e=0,f=0;d=i;e=b+8|0;f=c[e>>2]|0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}if((f|0)==(c[1472]|0)){Ym(b);i=d;return}kb(c[e>>2]|0);Ym(b);i=d;return}function oi(b){b=b|0;var d=0,e=0;d=i;b=b+8|0;e=c[b>>2]|0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}if((e|0)==(c[1472]|0)){i=d;return}kb(c[b>>2]|0);i=d;return}function pi(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0;f=i;i=i+112|0;n=f+100|0;g=f;a[n]=37;l=n+1|0;a[l]=j;m=n+2|0;a[m]=k;a[n+3|0]=0;if(!(k<<24>>24==0)){a[l]=k;a[m]=j}n=Ub(g|0,100,n|0,h|0,c[d+8>>2]|0)|0;h=g+n|0;j=c[e>>2]|0;if((n|0)==0){n=j;c[b>>2]=n;i=f;return}else{e=g;d=j}do{k=a[e]|0;do{if((d|0)!=0){g=d+24|0;l=c[g>>2]|0;if((l|0)==(c[d+28>>2]|0)){k=(Bc[c[(c[d>>2]|0)+52>>2]&15](d,k&255)|0)==-1;j=k?0:j;d=k?0:d;break}else{c[g>>2]=l+1;a[l]=k;break}}else{d=0}}while(0);e=e+1|0}while((e|0)!=(h|0));c[b>>2]=j;i=f;return}function qi(b){b=b|0;var d=0,e=0,f=0;d=i;e=b+8|0;f=c[e>>2]|0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}if((f|0)==(c[1472]|0)){Ym(b);i=d;return}kb(c[e>>2]|0);Ym(b);i=d;return}function ri(b){b=b|0;var d=0,e=0;d=i;b=b+8|0;e=c[b>>2]|0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}if((e|0)==(c[1472]|0)){i=d;return}kb(c[b>>2]|0);i=d;return}function si(a,b,d,e,f,g,h,j){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0;f=i;i=i+416|0;e=f+8|0;k=f;c[k>>2]=e+400;ti(b+8|0,e,k,g,h,j);h=c[k>>2]|0;g=c[d>>2]|0;if((e|0)==(h|0)){k=g;c[a>>2]=k;i=f;return}else{d=g}do{b=c[e>>2]|0;if((g|0)==0){g=0}else{j=g+24|0;k=c[j>>2]|0;if((k|0)==(c[g+28>>2]|0)){b=Bc[c[(c[g>>2]|0)+52>>2]&15](g,b)|0}else{c[j>>2]=k+4;c[k>>2]=b}b=(b|0)==-1;d=b?0:d;g=b?0:g}e=e+4|0}while((e|0)!=(h|0));c[a>>2]=d;i=f;return}function ti(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0;j=i;i=i+128|0;o=j+112|0;m=j+12|0;k=j;l=j+8|0;a[o]=37;p=o+1|0;a[p]=g;n=o+2|0;a[n]=h;a[o+3|0]=0;if(!(h<<24>>24==0)){a[p]=h;a[n]=g}Ub(m|0,100,o|0,f|0,c[b>>2]|0)|0;g=k;c[g>>2]=0;c[g+4>>2]=0;c[l>>2]=m;g=(c[e>>2]|0)-d>>2;m=Bb(c[b>>2]|0)|0;k=mm(d,l,g,k)|0;if((m|0)!=0){Bb(m|0)|0}if((k|0)==-1){pj(6880)}else{c[e>>2]=d+(k<<2);i=j;return}}function ui(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function vi(a){a=a|0;return}function wi(a){a=a|0;return 127}function xi(a){a=a|0;return 127}function yi(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function zi(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function Ai(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function Bi(a,b){a=a|0;b=b|0;b=i;Ee(a,1,45);i=b;return}function Ci(a){a=a|0;return 0}function Di(b,c){b=b|0;c=c|0;a[b]=67109634;a[b+1|0]=262147;a[b+2|0]=1024;a[b+3|0]=4;return}function Ei(b,c){b=b|0;c=c|0;a[b]=67109634;a[b+1|0]=262147;a[b+2|0]=1024;a[b+3|0]=4;return}function Fi(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function Gi(a){a=a|0;return}function Hi(a){a=a|0;return 127}function Ii(a){a=a|0;return 127}function Ji(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function Ki(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function Li(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function Mi(a,b){a=a|0;b=b|0;b=i;Ee(a,1,45);i=b;return}function Ni(a){a=a|0;return 0}function Oi(b,c){b=b|0;c=c|0;a[b]=67109634;a[b+1|0]=262147;a[b+2|0]=1024;a[b+3|0]=4;return}function Pi(b,c){b=b|0;c=c|0;a[b]=67109634;a[b+1|0]=262147;a[b+2|0]=1024;a[b+3|0]=4;return}function Qi(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function Ri(a){a=a|0;return}function Si(a){a=a|0;return 2147483647}function Ti(a){a=a|0;return 2147483647}function Ui(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function Vi(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function Wi(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function Xi(a,b){a=a|0;b=b|0;b=i;Pe(a,1,45);i=b;return}function Yi(a){a=a|0;return 0}function Zi(b,c){b=b|0;c=c|0;a[b]=67109634;a[b+1|0]=262147;a[b+2|0]=1024;a[b+3|0]=4;return}function _i(b,c){b=b|0;c=c|0;a[b]=67109634;a[b+1|0]=262147;a[b+2|0]=1024;a[b+3|0]=4;return}function $i(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function aj(a){a=a|0;return}function bj(a){a=a|0;return 2147483647}function cj(a){a=a|0;return 2147483647}function dj(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function ej(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function fj(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function gj(a,b){a=a|0;b=b|0;b=i;Pe(a,1,45);i=b;return}function hj(a){a=a|0;return 0}function ij(b,c){b=b|0;c=c|0;a[b]=67109634;a[b+1|0]=262147;a[b+2|0]=1024;a[b+3|0]=4;return}function jj(b,c){b=b|0;c=c|0;a[b]=67109634;a[b+1|0]=262147;a[b+2|0]=1024;a[b+3|0]=4;return}function kj(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function lj(a){a=a|0;return}function mj(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0;l=i;i=i+256|0;r=l;x=l+144|0;d=l+16|0;t=l+12|0;o=l+28|0;v=l+244|0;w=l+24|0;s=l+132|0;q=l+32|0;c[d>>2]=x;n=d+4|0;c[n>>2]=119;x=x+100|0;Ze(o,h);y=c[o>>2]|0;if(!((c[1500]|0)==-1)){c[r>>2]=6e3;c[r+4>>2]=117;c[r+8>>2]=0;Ae(6e3,r,118)}A=(c[6004>>2]|0)+ -1|0;z=c[y+8>>2]|0;if(!((c[y+12>>2]|0)-z>>2>>>0>A>>>0)){A=xb(4)|0;wm(A);ec(A|0,13960,106)}y=c[z+(A<<2)>>2]|0;if((y|0)==0){A=xb(4)|0;wm(A);ec(A|0,13960,106)}a[v]=0;c[w>>2]=c[f>>2];A=c[h+4>>2]|0;c[r+0>>2]=c[w+0>>2];if(oj(e,r,g,o,A,j,v,y,d,t,x)|0){yc[c[(c[y>>2]|0)+32>>2]&7](y,5616,5626|0,s)|0;h=c[t>>2]|0;g=c[d>>2]|0;w=h-g|0;if((w|0)>98){w=Rm(w+2|0)|0;if((w|0)==0){bn()}else{p=w;u=w}}else{p=0;u=q}if((a[v]|0)!=0){a[u]=45;u=u+1|0}if(g>>>0<h>>>0){h=s+10|0;v=s;do{y=a[g]|0;w=s;while(1){x=w+1|0;if((a[w]|0)==y<<24>>24){break}if((x|0)==(h|0)){w=h;break}else{w=x}}a[u]=a[5616+(w-v)|0]|0;g=g+1|0;u=u+1|0}while(g>>>0<(c[t>>2]|0)>>>0)}a[u]=0;c[r>>2]=k;if((Ia(q|0,5632,r|0)|0)!=1){A=xb(8)|0;me(A,5640);ec(A|0,3008,16)}if((p|0)!=0){Sm(p)}}k=c[e>>2]|0;if((k|0)!=0){if((c[k+12>>2]|0)==(c[k+16>>2]|0)?(sc[c[(c[k>>2]|0)+36>>2]&127](k)|0)==-1:0){c[e>>2]=0;e=0}else{e=k}}else{e=0}k=(e|0)==0;p=c[f>>2]|0;do{if((p|0)!=0){if((c[p+12>>2]|0)!=(c[p+16>>2]|0)){if(k){break}else{m=33;break}}if(!((sc[c[(c[p>>2]|0)+36>>2]&127](p)|0)==-1)){if(k){break}else{m=33;break}}else{c[f>>2]=0;m=31;break}}else{m=31}}while(0);if((m|0)==31?k:0){m=33}if((m|0)==33){c[j>>2]=c[j>>2]|2}c[b>>2]=e;ge(c[o>>2]|0)|0;j=c[d>>2]|0;c[d>>2]=0;if((j|0)==0){i=l;return}pc[c[n>>2]&255](j);i=l;return}function nj(a){a=a|0;return}function oj(e,f,g,h,j,k,l,m,n,o,p){e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;p=p|0;var q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0;r=i;i=i+480|0;X=r;E=r+428|0;B=r+472|0;D=r+473|0;v=r+448|0;q=r+460|0;u=r+416|0;t=r+436|0;s=r+400|0;C=r+432|0;w=r+412|0;c[E>>2]=0;c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;c[u+0>>2]=0;c[u+4>>2]=0;c[u+8>>2]=0;c[t+0>>2]=0;c[t+4>>2]=0;c[t+8>>2]=0;c[s+0>>2]=0;c[s+4>>2]=0;c[s+8>>2]=0;sj(g,h,E,B,D,v,q,u,t,C);c[o>>2]=c[n>>2];h=m+8|0;m=t+1|0;I=t+4|0;F=t+8|0;G=u+1|0;g=u+4|0;H=u+8|0;M=(j&512|0)!=0;J=q+1|0;j=q+8|0;N=q+4|0;R=s+1|0;L=s+8|0;K=s+4|0;Q=E+3|0;P=n+4|0;O=v+4|0;V=X+400|0;W=X;T=0;S=0;U=119;a:while(1){Y=c[e>>2]|0;do{if((Y|0)!=0){if((c[Y+12>>2]|0)==(c[Y+16>>2]|0)){if((sc[c[(c[Y>>2]|0)+36>>2]&127](Y)|0)==-1){c[e>>2]=0;Y=0;break}else{Y=c[e>>2]|0;break}}}else{Y=0}}while(0);Z=(Y|0)==0;Y=c[f>>2]|0;do{if((Y|0)!=0){if((c[Y+12>>2]|0)!=(c[Y+16>>2]|0)){if(Z){break}else{z=X;A=U;x=269;break a}}if(!((sc[c[(c[Y>>2]|0)+36>>2]&127](Y)|0)==-1)){if(Z){break}else{z=X;A=U;x=269;break a}}else{c[f>>2]=0;x=12;break}}else{x=12}}while(0);if((x|0)==12){x=0;if(Z){z=X;A=U;x=269;break}else{Y=0}}b:do{switch(a[E+T|0]|0){case 0:{x=26;break};case 1:{if((T|0)==3){z=X;A=U;x=269;break a}Z=c[e>>2]|0;x=c[Z+12>>2]|0;if((x|0)==(c[Z+16>>2]|0)){x=sc[c[(c[Z>>2]|0)+36>>2]&127](Z)|0}else{x=d[x]|0}if(!((x&255)<<24>>24>-1)){x=25;break a}if((b[(c[h>>2]|0)+(x<<24>>24<<1)>>1]&8192)==0){x=25;break a}Z=c[e>>2]|0;x=Z+12|0;_=c[x>>2]|0;if((_|0)==(c[Z+16>>2]|0)){x=sc[c[(c[Z>>2]|0)+40>>2]&127](Z)|0}else{c[x>>2]=_+1;x=d[_]|0}Ke(s,x&255);x=26;break};case 3:{Y=a[u]|0;_=(Y&1)==0;if(_){aa=(Y&255)>>>1}else{aa=c[g>>2]|0}Z=a[t]|0;$=(Z&1)==0;if($){ba=(Z&255)>>>1}else{ba=c[I>>2]|0}if((aa|0)!=(0-ba|0)){if(_){aa=(Y&255)>>>1}else{aa=c[g>>2]|0}if((aa|0)!=0){if($){$=(Z&255)>>>1}else{$=c[I>>2]|0}if(($|0)!=0){_=c[e>>2]|0;aa=c[_+12>>2]|0;$=c[_+16>>2]|0;if((aa|0)==($|0)){Z=sc[c[(c[_>>2]|0)+36>>2]&127](_)|0;$=c[e>>2]|0;Y=a[u]|0;_=$;aa=c[$+12>>2]|0;$=c[$+16>>2]|0}else{Z=d[aa]|0}ba=_+12|0;$=(aa|0)==($|0);if((Z&255)<<24>>24==(a[(Y&1)==0?G:c[H>>2]|0]|0)){if($){sc[c[(c[_>>2]|0)+40>>2]&127](_)|0}else{c[ba>>2]=aa+1}Y=a[u]|0;if((Y&1)==0){Y=(Y&255)>>>1}else{Y=c[g>>2]|0}S=Y>>>0>1?u:S;break b}if($){Y=sc[c[(c[_>>2]|0)+36>>2]&127](_)|0}else{Y=d[aa]|0}if(!((Y&255)<<24>>24==(a[(a[t]&1)==0?m:c[F>>2]|0]|0))){x=112;break a}_=c[e>>2]|0;Y=_+12|0;Z=c[Y>>2]|0;if((Z|0)==(c[_+16>>2]|0)){sc[c[(c[_>>2]|0)+40>>2]&127](_)|0}else{c[Y>>2]=Z+1}a[l]=1;Y=a[t]|0;if((Y&1)==0){Y=(Y&255)>>>1}else{Y=c[I>>2]|0}S=Y>>>0>1?t:S;break b}}if(_){ba=(Y&255)>>>1}else{ba=c[g>>2]|0}aa=c[e>>2]|0;$=c[aa+12>>2]|0;_=($|0)==(c[aa+16>>2]|0);if((ba|0)==0){if(_){Y=sc[c[(c[aa>>2]|0)+36>>2]&127](aa)|0;Z=a[t]|0}else{Y=d[$]|0}if(!((Y&255)<<24>>24==(a[(Z&1)==0?m:c[F>>2]|0]|0))){break b}Y=c[e>>2]|0;Z=Y+12|0;_=c[Z>>2]|0;if((_|0)==(c[Y+16>>2]|0)){sc[c[(c[Y>>2]|0)+40>>2]&127](Y)|0}else{c[Z>>2]=_+1}a[l]=1;Y=a[t]|0;if((Y&1)==0){Y=(Y&255)>>>1}else{Y=c[I>>2]|0}S=Y>>>0>1?t:S;break b}if(_){Z=sc[c[(c[aa>>2]|0)+36>>2]&127](aa)|0;Y=a[u]|0}else{Z=d[$]|0}if(!((Z&255)<<24>>24==(a[(Y&1)==0?G:c[H>>2]|0]|0))){a[l]=1;break b}Y=c[e>>2]|0;Z=Y+12|0;_=c[Z>>2]|0;if((_|0)==(c[Y+16>>2]|0)){sc[c[(c[Y>>2]|0)+40>>2]&127](Y)|0}else{c[Z>>2]=_+1}Y=a[u]|0;if((Y&1)==0){Y=(Y&255)>>>1}else{Y=c[g>>2]|0}S=Y>>>0>1?u:S}break};case 2:{if(!((S|0)!=0|T>>>0<2)){if((T|0)==2){Z=(a[Q]|0)!=0}else{Z=0}if(!(M|Z)){S=0;break b}}_=a[q]|0;$=(_&1)==0;Z=$?J:c[j>>2]|0;c:do{if((T|0)!=0?(d[E+(T+ -1)|0]|0)<2:0){$=Z+($?(_&255)>>>1:c[N>>2]|0)|0;aa=Z;while(1){if((aa|0)==($|0)){break}ba=a[aa]|0;if(!(ba<<24>>24>-1)){$=aa;break}if((b[(c[h>>2]|0)+(ba<<24>>24<<1)>>1]&8192)==0){$=aa;break}else{aa=aa+1|0}}aa=$-Z|0;da=a[s]|0;ca=(da&1)==0;if(ca){ba=(da&255)>>>1}else{ba=c[K>>2]|0}if(!(aa>>>0>ba>>>0)){if(ca){ca=(da&255)>>>1;da=R;ba=ca;ca=s+(ca-aa)+1|0}else{ea=c[L>>2]|0;ca=c[K>>2]|0;da=ea;ba=ca;ca=ea+(ca-aa)|0}aa=da+ba|0;if((ca|0)==(aa|0)){aa=Y;Z=$}else{ba=Z;while(1){if((a[ca]|0)!=(a[ba]|0)){aa=Y;break c}ca=ca+1|0;if((ca|0)==(aa|0)){aa=Y;Z=$;break}else{ba=ba+1|0}}}}else{aa=Y}}else{aa=Y}}while(0);d:while(1){if((_&1)==0){$=J;_=(_&255)>>>1}else{$=c[j>>2]|0;_=c[N>>2]|0}if((Z|0)==($+_|0)){break}_=c[e>>2]|0;do{if((_|0)!=0){if((c[_+12>>2]|0)==(c[_+16>>2]|0)){if((sc[c[(c[_>>2]|0)+36>>2]&127](_)|0)==-1){c[e>>2]=0;_=0;break}else{_=c[e>>2]|0;break}}}else{_=0}}while(0);_=(_|0)==0;do{if((Y|0)!=0){if((c[Y+12>>2]|0)!=(c[Y+16>>2]|0)){if(_){_=aa;break}else{break d}}if(!((sc[c[(c[Y>>2]|0)+36>>2]&127](Y)|0)==-1)){if(_^(aa|0)==0){_=aa;Y=aa;break}else{break d}}else{c[f>>2]=0;aa=0;x=147;break}}else{x=147}}while(0);if((x|0)==147){x=0;if(_){break}else{_=aa;Y=0}}$=c[e>>2]|0;aa=c[$+12>>2]|0;if((aa|0)==(c[$+16>>2]|0)){$=sc[c[(c[$>>2]|0)+36>>2]&127]($)|0}else{$=d[aa]|0}if(!(($&255)<<24>>24==(a[Z]|0))){break}$=c[e>>2]|0;aa=$+12|0;ba=c[aa>>2]|0;if((ba|0)==(c[$+16>>2]|0)){sc[c[(c[$>>2]|0)+40>>2]&127]($)|0}else{c[aa>>2]=ba+1}aa=_;_=a[q]|0;Z=Z+1|0}if(M){_=a[q]|0;if((_&1)==0){Y=J;_=(_&255)>>>1}else{Y=c[j>>2]|0;_=c[N>>2]|0}if((Z|0)!=(Y+_|0)){x=162;break a}}break};case 4:{Y=0;e:while(1){Z=c[e>>2]|0;do{if((Z|0)!=0){if((c[Z+12>>2]|0)==(c[Z+16>>2]|0)){if((sc[c[(c[Z>>2]|0)+36>>2]&127](Z)|0)==-1){c[e>>2]=0;Z=0;break}else{Z=c[e>>2]|0;break}}}else{Z=0}}while(0);Z=(Z|0)==0;_=c[f>>2]|0;do{if((_|0)!=0){if((c[_+12>>2]|0)!=(c[_+16>>2]|0)){if(Z){break}else{break e}}if(!((sc[c[(c[_>>2]|0)+36>>2]&127](_)|0)==-1)){if(Z){break}else{break e}}else{c[f>>2]=0;x=173;break}}else{x=173}}while(0);if((x|0)==173?(x=0,Z):0){break}_=c[e>>2]|0;Z=c[_+12>>2]|0;if((Z|0)==(c[_+16>>2]|0)){_=sc[c[(c[_>>2]|0)+36>>2]&127](_)|0}else{_=d[Z]|0}Z=_&255;if(Z<<24>>24>-1?!((b[(c[h>>2]|0)+(_<<24>>24<<1)>>1]&2048)==0):0){_=c[o>>2]|0;if((_|0)==(p|0)){$=(c[P>>2]|0)!=119;aa=c[n>>2]|0;_=p-aa|0;p=_>>>0<2147483647?_<<1:-1;aa=Tm($?aa:0,p)|0;if((aa|0)==0){x=182;break a}if(!$){$=c[n>>2]|0;c[n>>2]=aa;if(($|0)!=0){pc[c[P>>2]&255]($);aa=c[n>>2]|0}}else{c[n>>2]=aa}c[P>>2]=120;_=aa+_|0;c[o>>2]=_;p=(c[n>>2]|0)+p|0}c[o>>2]=_+1;a[_]=Z;Y=Y+1|0}else{_=a[v]|0;if((_&1)==0){_=(_&255)>>>1}else{_=c[O>>2]|0}if((_|0)==0|(Y|0)==0){break}if(!(Z<<24>>24==(a[D]|0))){break}if((W|0)==(V|0)){W=W-X|0;V=W>>>0<2147483647?W<<1:-1;if((U|0)==119){X=0}U=Tm(X,V)|0;if((U|0)==0){x=198;break a}W=U+(W>>2<<2)|0;X=U;V=U+(V>>>2<<2)|0;U=120}c[W>>2]=Y;W=W+4|0;Y=0}_=c[e>>2]|0;Z=_+12|0;$=c[Z>>2]|0;if(($|0)==(c[_+16>>2]|0)){sc[c[(c[_>>2]|0)+40>>2]&127](_)|0;continue}else{c[Z>>2]=$+1;continue}}if(!((X|0)==(W|0)|(Y|0)==0)){if((W|0)==(V|0)){W=W-X|0;V=W>>>0<2147483647?W<<1:-1;if((U|0)==119){X=0}U=Tm(X,V)|0;if((U|0)==0){x=209;break a}W=U+(W>>2<<2)|0;X=U;V=U+(V>>>2<<2)|0;U=120}c[W>>2]=Y;W=W+4|0}Z=c[C>>2]|0;if((Z|0)>0){Y=c[e>>2]|0;do{if((Y|0)!=0){if((c[Y+12>>2]|0)==(c[Y+16>>2]|0)){if((sc[c[(c[Y>>2]|0)+36>>2]&127](Y)|0)==-1){c[e>>2]=0;Y=0;break}else{Y=c[e>>2]|0;break}}}else{Y=0}}while(0);_=(Y|0)==0;Y=c[f>>2]|0;do{if((Y|0)!=0){if((c[Y+12>>2]|0)!=(c[Y+16>>2]|0)){if(_){break}else{x=229;break a}}if(!((sc[c[(c[Y>>2]|0)+36>>2]&127](Y)|0)==-1)){if(_){break}else{x=229;break a}}else{c[f>>2]=0;x=223;break}}else{x=223}}while(0);if((x|0)==223){x=0;if(_){x=229;break a}else{Y=0}}_=c[e>>2]|0;$=c[_+12>>2]|0;if(($|0)==(c[_+16>>2]|0)){_=sc[c[(c[_>>2]|0)+36>>2]&127](_)|0}else{_=d[$]|0}if(!((_&255)<<24>>24==(a[B]|0))){x=229;break a}$=c[e>>2]|0;_=$+12|0;aa=c[_>>2]|0;if((aa|0)==(c[$+16>>2]|0)){sc[c[(c[$>>2]|0)+40>>2]&127]($)|0;$=Y;_=Y}else{c[_>>2]=aa+1;$=Y;_=Y}while(1){Y=c[e>>2]|0;do{if((Y|0)!=0){if((c[Y+12>>2]|0)==(c[Y+16>>2]|0)){if((sc[c[(c[Y>>2]|0)+36>>2]&127](Y)|0)==-1){c[e>>2]=0;Y=0;break}else{Y=c[e>>2]|0;break}}}else{Y=0}}while(0);aa=(Y|0)==0;do{if((_|0)!=0){if((c[_+12>>2]|0)!=(c[_+16>>2]|0)){if(aa){Y=$;break}else{x=250;break a}}if(!((sc[c[(c[_>>2]|0)+36>>2]&127](_)|0)==-1)){if(aa^($|0)==0){Y=$;_=$;break}else{x=250;break a}}else{c[f>>2]=0;Y=0;x=243;break}}else{Y=$;x=243}}while(0);if((x|0)==243){x=0;if(aa){x=250;break a}else{_=0}}$=c[e>>2]|0;aa=c[$+12>>2]|0;if((aa|0)==(c[$+16>>2]|0)){$=sc[c[(c[$>>2]|0)+36>>2]&127]($)|0}else{$=d[aa]|0}if(!(($&255)<<24>>24>-1)){x=250;break a}if((b[(c[h>>2]|0)+($<<24>>24<<1)>>1]&2048)==0){x=250;break a}$=c[o>>2]|0;if(($|0)==(p|0)){aa=(c[P>>2]|0)!=119;ba=c[n>>2]|0;$=p-ba|0;p=$>>>0<2147483647?$<<1:-1;ba=Tm(aa?ba:0,p)|0;if((ba|0)==0){x=253;break a}if(!aa){aa=c[n>>2]|0;c[n>>2]=ba;if((aa|0)!=0){pc[c[P>>2]&255](aa);ba=c[n>>2]|0}}else{c[n>>2]=ba}c[P>>2]=120;$=ba+$|0;c[o>>2]=$;p=(c[n>>2]|0)+p|0}ba=c[e>>2]|0;aa=c[ba+12>>2]|0;if((aa|0)==(c[ba+16>>2]|0)){aa=sc[c[(c[ba>>2]|0)+36>>2]&127](ba)|0;$=c[o>>2]|0}else{aa=d[aa]|0}c[o>>2]=$+1;a[$]=aa;Z=Z+ -1|0;c[C>>2]=Z;$=c[e>>2]|0;aa=$+12|0;ba=c[aa>>2]|0;if((ba|0)==(c[$+16>>2]|0)){sc[c[(c[$>>2]|0)+40>>2]&127]($)|0}else{c[aa>>2]=ba+1}if((Z|0)>0){$=Y}else{break}}}if((c[o>>2]|0)==(c[n>>2]|0)){x=267;break a}break};default:{}}}while(0);f:do{if((x|0)==26){x=0;if((T|0)==3){z=X;A=U;x=269;break a}else{_=Y;Z=Y}while(1){Y=c[e>>2]|0;do{if((Y|0)!=0){if((c[Y+12>>2]|0)==(c[Y+16>>2]|0)){if((sc[c[(c[Y>>2]|0)+36>>2]&127](Y)|0)==-1){c[e>>2]=0;Y=0;break}else{Y=c[e>>2]|0;break}}}else{Y=0}}while(0);$=(Y|0)==0;do{if((Z|0)!=0){if((c[Z+12>>2]|0)!=(c[Z+16>>2]|0)){if($){Y=_;break}else{break f}}if(!((sc[c[(c[Z>>2]|0)+36>>2]&127](Z)|0)==-1)){if($^(_|0)==0){Y=_;Z=_;break}else{break f}}else{c[f>>2]=0;Y=0;x=37;break}}else{Y=_;x=37}}while(0);if((x|0)==37){x=0;if($){break f}else{Z=0}}$=c[e>>2]|0;_=c[$+12>>2]|0;if((_|0)==(c[$+16>>2]|0)){_=sc[c[(c[$>>2]|0)+36>>2]&127]($)|0}else{_=d[_]|0}if(!((_&255)<<24>>24>-1)){break f}if((b[(c[h>>2]|0)+(_<<24>>24<<1)>>1]&8192)==0){break f}aa=c[e>>2]|0;_=aa+12|0;$=c[_>>2]|0;if(($|0)==(c[aa+16>>2]|0)){_=sc[c[(c[aa>>2]|0)+40>>2]&127](aa)|0}else{c[_>>2]=$+1;_=d[$]|0}Ke(s,_&255);_=Y}}}while(0);T=T+1|0;if(!(T>>>0<4)){z=X;A=U;x=269;break}}g:do{if((x|0)==25){c[k>>2]=c[k>>2]|4;y=0;z=X;A=U}else if((x|0)==112){c[k>>2]=c[k>>2]|4;y=0;z=X;A=U}else if((x|0)==162){c[k>>2]=c[k>>2]|4;y=0;z=X;A=U}else if((x|0)==182){bn()}else if((x|0)==198){bn()}else if((x|0)==209){bn()}else if((x|0)==229){c[k>>2]=c[k>>2]|4;y=0;z=X;A=U}else if((x|0)==250){c[k>>2]=c[k>>2]|4;y=0;z=X;A=U}else if((x|0)==253){bn()}else if((x|0)==267){c[k>>2]=c[k>>2]|4;y=0;z=X;A=U}else if((x|0)==269){h:do{if((S|0)!=0){y=S+1|0;l=S+8|0;B=S+4|0;o=1;i:while(1){n=a[S]|0;if((n&1)==0){n=(n&255)>>>1}else{n=c[B>>2]|0}if(!(o>>>0<n>>>0)){break h}n=c[e>>2]|0;do{if((n|0)!=0){if((c[n+12>>2]|0)==(c[n+16>>2]|0)){if((sc[c[(c[n>>2]|0)+36>>2]&127](n)|0)==-1){c[e>>2]=0;n=0;break}else{n=c[e>>2]|0;break}}}else{n=0}}while(0);C=(n|0)==0;n=c[f>>2]|0;do{if((n|0)!=0){if((c[n+12>>2]|0)!=(c[n+16>>2]|0)){if(C){break}else{break i}}if(!((sc[c[(c[n>>2]|0)+36>>2]&127](n)|0)==-1)){if(C){break}else{break i}}else{c[f>>2]=0;x=285;break}}else{x=285}}while(0);if((x|0)==285?(x=0,C):0){break}C=c[e>>2]|0;n=c[C+12>>2]|0;if((n|0)==(c[C+16>>2]|0)){n=sc[c[(c[C>>2]|0)+36>>2]&127](C)|0}else{n=d[n]|0}if((a[S]&1)==0){C=y}else{C=c[l>>2]|0}if(!((n&255)<<24>>24==(a[C+o|0]|0))){break}o=o+1|0;D=c[e>>2]|0;C=D+12|0;n=c[C>>2]|0;if((n|0)==(c[D+16>>2]|0)){sc[c[(c[D>>2]|0)+40>>2]&127](D)|0;continue}else{c[C>>2]=n+1;continue}}c[k>>2]=c[k>>2]|4;y=0;break g}}while(0);if((z|0)!=(W|0)){c[w>>2]=0;tj(v,z,W,w);if((c[w>>2]|0)==0){y=1}else{c[k>>2]=c[k>>2]|4;y=0}}else{y=1;z=W}}}while(0);Fe(s);Fe(t);Fe(u);Fe(q);Fe(v);if((z|0)==0){i=r;return y|0}pc[A&255](z);i=r;return y|0}function pj(a){a=a|0;var b=0;b=xb(8)|0;me(b,a);ec(b|0,3008,16)}function qj(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;m=i;i=i+144|0;u=m;s=m+36|0;d=m+16|0;q=m+32|0;o=m+28|0;r=m+136|0;t=m+24|0;c[d>>2]=s;n=d+4|0;c[n>>2]=119;s=s+100|0;Ze(o,h);p=c[o>>2]|0;if(!((c[1500]|0)==-1)){c[u>>2]=6e3;c[u+4>>2]=117;c[u+8>>2]=0;Ae(6e3,u,118)}w=(c[6004>>2]|0)+ -1|0;v=c[p+8>>2]|0;if(!((c[p+12>>2]|0)-v>>2>>>0>w>>>0)){w=xb(4)|0;wm(w);ec(w|0,13960,106)}v=c[v+(w<<2)>>2]|0;if((v|0)==0){w=xb(4)|0;wm(w);ec(w|0,13960,106)}a[r]=0;p=c[f>>2]|0;c[t>>2]=p;w=c[h+4>>2]|0;c[u+0>>2]=c[t+0>>2];if(oj(e,u,g,o,w,j,r,v,d,q,s)|0){if((a[k]&1)==0){a[k+1|0]=0;a[k]=0}else{a[c[k+8>>2]|0]=0;c[k+4>>2]=0}if((a[r]|0)!=0){Ke(k,Bc[c[(c[v>>2]|0)+28>>2]&15](v,45)|0)}h=Bc[c[(c[v>>2]|0)+28>>2]&15](v,48)|0;r=c[d>>2]|0;q=c[q>>2]|0;g=q+ -1|0;a:do{if(r>>>0<g>>>0){s=r;while(1){r=s+1|0;if(!((a[s]|0)==h<<24>>24)){r=s;break a}if(r>>>0<g>>>0){s=r}else{break}}}}while(0);rj(k,r,q)|0}k=c[e>>2]|0;if((k|0)!=0){if((c[k+12>>2]|0)==(c[k+16>>2]|0)?(sc[c[(c[k>>2]|0)+36>>2]&127](k)|0)==-1:0){c[e>>2]=0;k=0}}else{k=0}e=(k|0)==0;do{if((p|0)!=0){if((c[p+12>>2]|0)!=(c[p+16>>2]|0)){if(e){break}else{l=27;break}}if(!((sc[c[(c[p>>2]|0)+36>>2]&127](p)|0)==-1)){if(e^(p|0)==0){break}else{l=27;break}}else{c[f>>2]=0;l=25;break}}else{l=25}}while(0);if((l|0)==25?e:0){l=27}if((l|0)==27){c[j>>2]=c[j>>2]|2}c[b>>2]=k;ge(c[o>>2]|0)|0;j=c[d>>2]|0;c[d>>2]=0;if((j|0)==0){i=m;return}pc[c[n>>2]&255](j);i=m;return}function rj(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0;f=i;j=d;l=a[b]|0;if((l&1)==0){k=10;g=(l&255)>>>1}else{l=c[b>>2]|0;k=(l&-2)+ -1|0;g=c[b+4>>2]|0;l=l&255}h=e-j|0;if((e|0)==(d|0)){i=f;return b|0}if((k-g|0)>>>0<h>>>0){Ne(b,k,g+h-k|0,g,g,0,0);l=a[b]|0}if((l&1)==0){k=b+1|0}else{k=c[b+8>>2]|0}j=e+(g-j)|0;l=k+g|0;while(1){a[l]=a[d]|0;d=d+1|0;if((d|0)==(e|0)){break}else{l=l+1|0}}a[k+j|0]=0;e=g+h|0;if((a[b]&1)==0){a[b]=e<<1;i=f;return b|0}else{c[b+4>>2]=e;i=f;return b|0}return 0}function sj(b,d,e,f,g,h,j,k,l,m){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0;n=i;i=i+128|0;y=n;v=n+24|0;w=n+44|0;x=n+32|0;o=n+56|0;u=n+12|0;r=n+28|0;q=n+68|0;t=n+80|0;p=n+92|0;s=n+104|0;if(b){p=c[d>>2]|0;if(!((c[1360]|0)==-1)){c[y>>2]=5440;c[y+4>>2]=117;c[y+8>>2]=0;Ae(5440,y,118)}r=(c[5444>>2]|0)+ -1|0;q=c[p+8>>2]|0;if(!((c[p+12>>2]|0)-q>>2>>>0>r>>>0)){d=xb(4)|0;wm(d);ec(d|0,13960,106)}p=c[q+(r<<2)>>2]|0;if((p|0)==0){d=xb(4)|0;wm(d);ec(d|0,13960,106)}qc[c[(c[p>>2]|0)+44>>2]&63](v,p);d=c[v>>2]|0;a[e]=d;a[e+1|0]=d>>8;a[e+2|0]=d>>16;a[e+3|0]=d>>24;qc[c[(c[p>>2]|0)+32>>2]&63](w,p);if((a[l]&1)==0){a[l+1|0]=0;a[l]=0}else{a[c[l+8>>2]|0]=0;c[l+4>>2]=0}Je(l,0);c[l+0>>2]=c[w+0>>2];c[l+4>>2]=c[w+4>>2];c[l+8>>2]=c[w+8>>2];c[w+0>>2]=0;c[w+4>>2]=0;c[w+8>>2]=0;Fe(w);qc[c[(c[p>>2]|0)+28>>2]&63](x,p);if((a[k]&1)==0){a[k+1|0]=0;a[k]=0}else{a[c[k+8>>2]|0]=0;c[k+4>>2]=0}Je(k,0);c[k+0>>2]=c[x+0>>2];c[k+4>>2]=c[x+4>>2];c[k+8>>2]=c[x+8>>2];c[x+0>>2]=0;c[x+4>>2]=0;c[x+8>>2]=0;Fe(x);a[f]=sc[c[(c[p>>2]|0)+12>>2]&127](p)|0;a[g]=sc[c[(c[p>>2]|0)+16>>2]&127](p)|0;qc[c[(c[p>>2]|0)+20>>2]&63](o,p);if((a[h]&1)==0){a[h+1|0]=0;a[h]=0}else{a[c[h+8>>2]|0]=0;c[h+4>>2]=0}Je(h,0);c[h+0>>2]=c[o+0>>2];c[h+4>>2]=c[o+4>>2];c[h+8>>2]=c[o+8>>2];c[o+0>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;Fe(o);qc[c[(c[p>>2]|0)+24>>2]&63](u,p);if((a[j]&1)==0){a[j+1|0]=0;a[j]=0}else{a[c[j+8>>2]|0]=0;c[j+4>>2]=0}Je(j,0);c[j+0>>2]=c[u+0>>2];c[j+4>>2]=c[u+4>>2];c[j+8>>2]=c[u+8>>2];c[u+0>>2]=0;c[u+4>>2]=0;c[u+8>>2]=0;Fe(u);d=sc[c[(c[p>>2]|0)+36>>2]&127](p)|0;c[m>>2]=d;i=n;return}else{o=c[d>>2]|0;if(!((c[1344]|0)==-1)){c[y>>2]=5376;c[y+4>>2]=117;c[y+8>>2]=0;Ae(5376,y,118)}u=(c[5380>>2]|0)+ -1|0;v=c[o+8>>2]|0;if(!((c[o+12>>2]|0)-v>>2>>>0>u>>>0)){d=xb(4)|0;wm(d);ec(d|0,13960,106)}o=c[v+(u<<2)>>2]|0;if((o|0)==0){d=xb(4)|0;wm(d);ec(d|0,13960,106)}qc[c[(c[o>>2]|0)+44>>2]&63](r,o);d=c[r>>2]|0;a[e]=d;a[e+1|0]=d>>8;a[e+2|0]=d>>16;a[e+3|0]=d>>24;qc[c[(c[o>>2]|0)+32>>2]&63](q,o);if((a[l]&1)==0){a[l+1|0]=0;a[l]=0}else{a[c[l+8>>2]|0]=0;c[l+4>>2]=0}Je(l,0);c[l+0>>2]=c[q+0>>2];c[l+4>>2]=c[q+4>>2];c[l+8>>2]=c[q+8>>2];c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;Fe(q);qc[c[(c[o>>2]|0)+28>>2]&63](t,o);if((a[k]&1)==0){a[k+1|0]=0;a[k]=0}else{a[c[k+8>>2]|0]=0;c[k+4>>2]=0}Je(k,0);c[k+0>>2]=c[t+0>>2];c[k+4>>2]=c[t+4>>2];c[k+8>>2]=c[t+8>>2];c[t+0>>2]=0;c[t+4>>2]=0;c[t+8>>2]=0;Fe(t);a[f]=sc[c[(c[o>>2]|0)+12>>2]&127](o)|0;a[g]=sc[c[(c[o>>2]|0)+16>>2]&127](o)|0;qc[c[(c[o>>2]|0)+20>>2]&63](p,o);if((a[h]&1)==0){a[h+1|0]=0;a[h]=0}else{a[c[h+8>>2]|0]=0;c[h+4>>2]=0}Je(h,0);c[h+0>>2]=c[p+0>>2];c[h+4>>2]=c[p+4>>2];c[h+8>>2]=c[p+8>>2];c[p+0>>2]=0;c[p+4>>2]=0;c[p+8>>2]=0;Fe(p);qc[c[(c[o>>2]|0)+24>>2]&63](s,o);if((a[j]&1)==0){a[j+1|0]=0;a[j]=0}else{a[c[j+8>>2]|0]=0;c[j+4>>2]=0}Je(j,0);c[j+0>>2]=c[s+0>>2];c[j+4>>2]=c[s+4>>2];c[j+8>>2]=c[s+8>>2];c[s+0>>2]=0;c[s+4>>2]=0;c[s+8>>2]=0;Fe(s);d=sc[c[(c[o>>2]|0)+36>>2]&127](o)|0;c[m>>2]=d;i=n;return}}function tj(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0;g=i;k=a[b]|0;if((k&1)==0){j=(k&255)>>>1}else{j=c[b+4>>2]|0}if((j|0)==0){i=g;return}if((d|0)!=(e|0)?(h=e+ -4|0,h>>>0>d>>>0):0){j=d;do{k=c[j>>2]|0;c[j>>2]=c[h>>2];c[h>>2]=k;j=j+4|0;h=h+ -4|0}while(j>>>0<h>>>0);h=a[b]|0}else{h=k}if((h&1)==0){k=b+1|0;b=(h&255)>>>1}else{k=c[b+8>>2]|0;b=c[b+4>>2]|0}e=e+ -4|0;h=a[k]|0;j=h<<24>>24<1|h<<24>>24==127;a:do{if(e>>>0>d>>>0){b=k+b|0;while(1){if(!j?(h<<24>>24|0)!=(c[d>>2]|0):0){break}k=(b-k|0)>1?k+1|0:k;d=d+4|0;h=a[k]|0;j=h<<24>>24<1|h<<24>>24==127;if(!(d>>>0<e>>>0)){break a}}c[f>>2]=4;i=g;return}}while(0);if(j){i=g;return}k=c[e>>2]|0;if(!(h<<24>>24>>>0<k>>>0|(k|0)==0)){i=g;return}c[f>>2]=4;i=g;return}function uj(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function vj(a){a=a|0;return}function wj(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0;l=i;i=i+592|0;r=l;w=l+72|0;d=l+64|0;s=l+56|0;o=l+476|0;v=l+580|0;x=l+472|0;t=l+16|0;q=l+480|0;c[d>>2]=w;n=d+4|0;c[n>>2]=119;w=w+400|0;Ze(o,h);A=c[o>>2]|0;if(!((c[1498]|0)==-1)){c[r>>2]=5992;c[r+4>>2]=117;c[r+8>>2]=0;Ae(5992,r,118)}z=(c[5996>>2]|0)+ -1|0;y=c[A+8>>2]|0;if(!((c[A+12>>2]|0)-y>>2>>>0>z>>>0)){A=xb(4)|0;wm(A);ec(A|0,13960,106)}y=c[y+(z<<2)>>2]|0;if((y|0)==0){A=xb(4)|0;wm(A);ec(A|0,13960,106)}a[v]=0;c[x>>2]=c[f>>2];A=c[h+4>>2]|0;c[r+0>>2]=c[x+0>>2];if(xj(e,r,g,o,A,j,v,y,d,s,w)|0){yc[c[(c[y>>2]|0)+48>>2]&7](y,5696,5706|0,t)|0;g=c[s>>2]|0;h=c[d>>2]|0;w=g-h|0;if((w|0)>392){w=Rm((w>>2)+2|0)|0;if((w|0)==0){bn()}else{p=w;u=w}}else{p=0;u=q}if((a[v]|0)!=0){a[u]=45;u=u+1|0}if(h>>>0<g>>>0){g=t+40|0;v=t;do{y=c[h>>2]|0;w=t;while(1){x=w+4|0;if((c[w>>2]|0)==(y|0)){break}if((x|0)==(g|0)){w=g;break}else{w=x}}a[u]=a[5696+(w-v>>2)|0]|0;h=h+4|0;u=u+1|0}while(h>>>0<(c[s>>2]|0)>>>0)}a[u]=0;c[r>>2]=k;if((Ia(q|0,5632,r|0)|0)!=1){A=xb(8)|0;me(A,5640);ec(A|0,3008,16)}if((p|0)!=0){Sm(p)}}k=c[e>>2]|0;do{if((k|0)!=0){p=c[k+12>>2]|0;if((p|0)==(c[k+16>>2]|0)){k=sc[c[(c[k>>2]|0)+36>>2]&127](k)|0}else{k=c[p>>2]|0}if((k|0)==-1){c[e>>2]=0;k=1;break}else{k=(c[e>>2]|0)==0;break}}else{k=1}}while(0);p=c[f>>2]|0;do{if((p|0)!=0){q=c[p+12>>2]|0;if((q|0)==(c[p+16>>2]|0)){p=sc[c[(c[p>>2]|0)+36>>2]&127](p)|0}else{p=c[q>>2]|0}if(!((p|0)==-1)){if(k){break}else{m=37;break}}else{c[f>>2]=0;m=35;break}}else{m=35}}while(0);if((m|0)==35?k:0){m=37}if((m|0)==37){c[j>>2]=c[j>>2]|2}c[b>>2]=c[e>>2];ge(c[o>>2]|0)|0;f=c[d>>2]|0;c[d>>2]=0;if((f|0)==0){i=l;return}pc[c[n>>2]&255](f);i=l;return}function xj(b,e,f,g,h,j,k,l,m,n,o){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;var p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0;v=i;i=i+496|0;S=v+72|0;z=v+24|0;A=v;D=v+52|0;t=v+56|0;s=v+472|0;r=v+12|0;q=v+40|0;p=v+28|0;C=v+8|0;u=v+4|0;c[z>>2]=0;c[t+0>>2]=0;c[t+4>>2]=0;c[t+8>>2]=0;c[s+0>>2]=0;c[s+4>>2]=0;c[s+8>>2]=0;c[r+0>>2]=0;c[r+4>>2]=0;c[r+8>>2]=0;c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;c[p+0>>2]=0;c[p+4>>2]=0;c[p+8>>2]=0;Aj(f,g,z,A,D,t,s,r,q,C);c[n>>2]=c[m>>2];g=q+4|0;E=q+8|0;f=r+4|0;F=r+8|0;G=(h&512|0)!=0;M=s+4|0;h=s+8|0;J=p+4|0;K=p+8|0;I=z+3|0;H=m+4|0;L=t+4|0;Q=S+400|0;R=S;O=0;N=0;P=119;a:while(1){U=c[b>>2]|0;do{if((U|0)!=0){T=c[U+12>>2]|0;if((T|0)==(c[U+16>>2]|0)){T=sc[c[(c[U>>2]|0)+36>>2]&127](U)|0}else{T=c[T>>2]|0}if((T|0)==-1){c[b>>2]=0;U=1;break}else{U=(c[b>>2]|0)==0;break}}else{U=1}}while(0);T=c[e>>2]|0;do{if((T|0)!=0){V=c[T+12>>2]|0;if((V|0)==(c[T+16>>2]|0)){V=sc[c[(c[T>>2]|0)+36>>2]&127](T)|0}else{V=c[V>>2]|0}if(!((V|0)==-1)){if(U){break}else{y=S;B=P;w=292;break a}}else{c[e>>2]=0;w=15;break}}else{w=15}}while(0);if((w|0)==15){w=0;if(U){y=S;B=P;w=292;break}else{T=0}}b:do{switch(a[z+O|0]|0){case 1:{if((O|0)==3){y=S;B=P;w=292;break a}U=c[b>>2]|0;w=c[U+12>>2]|0;if((w|0)==(c[U+16>>2]|0)){w=sc[c[(c[U>>2]|0)+36>>2]&127](U)|0}else{w=c[w>>2]|0}if(!(kc[c[(c[l>>2]|0)+12>>2]&31](l,8192,w)|0)){w=27;break a}V=c[b>>2]|0;w=V+12|0;U=c[w>>2]|0;if((U|0)==(c[V+16>>2]|0)){w=sc[c[(c[V>>2]|0)+40>>2]&127](V)|0}else{c[w>>2]=U+4;w=c[U>>2]|0}Ue(p,w);w=28;break};case 0:{w=28;break};case 3:{T=a[r]|0;V=(T&1)==0;if(V){Y=(T&255)>>>1}else{Y=c[f>>2]|0}U=a[q]|0;W=(U&1)==0;if(W){X=(U&255)>>>1}else{X=c[g>>2]|0}if((Y|0)!=(0-X|0)){if(V){X=(T&255)>>>1}else{X=c[f>>2]|0}if((X|0)!=0){if(W){W=(U&255)>>>1}else{W=c[g>>2]|0}if((W|0)!=0){V=c[b>>2]|0;U=c[V+12>>2]|0;if((U|0)==(c[V+16>>2]|0)){U=sc[c[(c[V>>2]|0)+36>>2]&127](V)|0;T=a[r]|0}else{U=c[U>>2]|0}V=c[b>>2]|0;X=V+12|0;Y=c[X>>2]|0;W=(Y|0)==(c[V+16>>2]|0);if((U|0)==(c[((T&1)==0?f:c[F>>2]|0)>>2]|0)){if(W){sc[c[(c[V>>2]|0)+40>>2]&127](V)|0}else{c[X>>2]=Y+4}T=a[r]|0;if((T&1)==0){T=(T&255)>>>1}else{T=c[f>>2]|0}N=T>>>0>1?r:N;break b}if(W){T=sc[c[(c[V>>2]|0)+36>>2]&127](V)|0}else{T=c[Y>>2]|0}if((T|0)!=(c[((a[q]&1)==0?g:c[E>>2]|0)>>2]|0)){w=116;break a}V=c[b>>2]|0;U=V+12|0;T=c[U>>2]|0;if((T|0)==(c[V+16>>2]|0)){sc[c[(c[V>>2]|0)+40>>2]&127](V)|0}else{c[U>>2]=T+4}a[k]=1;T=a[q]|0;if((T&1)==0){T=(T&255)>>>1}else{T=c[g>>2]|0}N=T>>>0>1?q:N;break b}}if(V){X=(T&255)>>>1}else{X=c[f>>2]|0}W=c[b>>2]|0;V=c[W+12>>2]|0;Y=(V|0)==(c[W+16>>2]|0);if((X|0)==0){if(Y){T=sc[c[(c[W>>2]|0)+36>>2]&127](W)|0;U=a[q]|0}else{T=c[V>>2]|0}if((T|0)!=(c[((U&1)==0?g:c[E>>2]|0)>>2]|0)){break b}V=c[b>>2]|0;U=V+12|0;T=c[U>>2]|0;if((T|0)==(c[V+16>>2]|0)){sc[c[(c[V>>2]|0)+40>>2]&127](V)|0}else{c[U>>2]=T+4}a[k]=1;T=a[q]|0;if((T&1)==0){T=(T&255)>>>1}else{T=c[g>>2]|0}N=T>>>0>1?q:N;break b}if(Y){U=sc[c[(c[W>>2]|0)+36>>2]&127](W)|0;T=a[r]|0}else{U=c[V>>2]|0}if((U|0)!=(c[((T&1)==0?f:c[F>>2]|0)>>2]|0)){a[k]=1;break b}V=c[b>>2]|0;U=V+12|0;T=c[U>>2]|0;if((T|0)==(c[V+16>>2]|0)){sc[c[(c[V>>2]|0)+40>>2]&127](V)|0}else{c[U>>2]=T+4}T=a[r]|0;if((T&1)==0){T=(T&255)>>>1}else{T=c[f>>2]|0}N=T>>>0>1?r:N}break};case 4:{T=0;c:while(1){V=c[b>>2]|0;do{if((V|0)!=0){U=c[V+12>>2]|0;if((U|0)==(c[V+16>>2]|0)){U=sc[c[(c[V>>2]|0)+36>>2]&127](V)|0}else{U=c[U>>2]|0}if((U|0)==-1){c[b>>2]=0;U=1;break}else{U=(c[b>>2]|0)==0;break}}else{U=1}}while(0);W=c[e>>2]|0;do{if((W|0)!=0){V=c[W+12>>2]|0;if((V|0)==(c[W+16>>2]|0)){V=sc[c[(c[W>>2]|0)+36>>2]&127](W)|0}else{V=c[V>>2]|0}if(!((V|0)==-1)){if(U){break}else{break c}}else{c[e>>2]=0;w=188;break}}else{w=188}}while(0);if((w|0)==188?(w=0,U):0){break}V=c[b>>2]|0;U=c[V+12>>2]|0;if((U|0)==(c[V+16>>2]|0)){U=sc[c[(c[V>>2]|0)+36>>2]&127](V)|0}else{U=c[U>>2]|0}if(kc[c[(c[l>>2]|0)+12>>2]&31](l,2048,U)|0){V=c[n>>2]|0;if((V|0)==(o|0)){W=(c[H>>2]|0)!=119;X=c[m>>2]|0;V=o-X|0;o=V>>>0<2147483647?V<<1:-1;V=V>>2;if(!W){X=0}X=Tm(X,o)|0;if((X|0)==0){w=198;break a}if(!W){W=c[m>>2]|0;c[m>>2]=X;if((W|0)!=0){pc[c[H>>2]&255](W);X=c[m>>2]|0}}else{c[m>>2]=X}c[H>>2]=120;V=X+(V<<2)|0;c[n>>2]=V;o=(c[m>>2]|0)+(o>>>2<<2)|0}c[n>>2]=V+4;c[V>>2]=U;T=T+1|0}else{V=a[t]|0;if((V&1)==0){V=(V&255)>>>1}else{V=c[L>>2]|0}if((V|0)==0|(T|0)==0){break}if((U|0)!=(c[D>>2]|0)){break}if((R|0)==(Q|0)){R=R-S|0;Q=R>>>0<2147483647?R<<1:-1;if((P|0)==119){S=0}P=Tm(S,Q)|0;if((P|0)==0){w=214;break a}R=P+(R>>2<<2)|0;S=P;Q=P+(Q>>>2<<2)|0;P=120}c[R>>2]=T;R=R+4|0;T=0}W=c[b>>2]|0;U=W+12|0;V=c[U>>2]|0;if((V|0)==(c[W+16>>2]|0)){sc[c[(c[W>>2]|0)+40>>2]&127](W)|0;continue}else{c[U>>2]=V+4;continue}}if(!((S|0)==(R|0)|(T|0)==0)){if((R|0)==(Q|0)){R=R-S|0;Q=R>>>0<2147483647?R<<1:-1;if((P|0)==119){S=0}P=Tm(S,Q)|0;if((P|0)==0){w=225;break a}R=P+(R>>2<<2)|0;S=P;Q=P+(Q>>>2<<2)|0;P=120}c[R>>2]=T;R=R+4|0}T=c[C>>2]|0;if((T|0)>0){V=c[b>>2]|0;do{if((V|0)!=0){U=c[V+12>>2]|0;if((U|0)==(c[V+16>>2]|0)){U=sc[c[(c[V>>2]|0)+36>>2]&127](V)|0}else{U=c[U>>2]|0}if((U|0)==-1){c[b>>2]=0;V=1;break}else{V=(c[b>>2]|0)==0;break}}else{V=1}}while(0);U=c[e>>2]|0;do{if((U|0)!=0){W=c[U+12>>2]|0;if((W|0)==(c[U+16>>2]|0)){W=sc[c[(c[U>>2]|0)+36>>2]&127](U)|0}else{W=c[W>>2]|0}if(!((W|0)==-1)){if(V){break}else{w=248;break a}}else{c[e>>2]=0;w=242;break}}else{w=242}}while(0);if((w|0)==242){w=0;if(V){w=248;break a}else{U=0}}V=c[b>>2]|0;W=c[V+12>>2]|0;if((W|0)==(c[V+16>>2]|0)){V=sc[c[(c[V>>2]|0)+36>>2]&127](V)|0}else{V=c[W>>2]|0}if((V|0)!=(c[A>>2]|0)){w=248;break a}X=c[b>>2]|0;W=X+12|0;V=c[W>>2]|0;if((V|0)==(c[X+16>>2]|0)){sc[c[(c[X>>2]|0)+40>>2]&127](X)|0;W=U}else{c[W>>2]=V+4;W=U}while(1){X=c[b>>2]|0;do{if((X|0)!=0){V=c[X+12>>2]|0;if((V|0)==(c[X+16>>2]|0)){V=sc[c[(c[X>>2]|0)+36>>2]&127](X)|0}else{V=c[V>>2]|0}if((V|0)==-1){c[b>>2]=0;X=1;break}else{X=(c[b>>2]|0)==0;break}}else{X=1}}while(0);do{if((U|0)!=0){V=c[U+12>>2]|0;if((V|0)==(c[U+16>>2]|0)){U=sc[c[(c[U>>2]|0)+36>>2]&127](U)|0}else{U=c[V>>2]|0}if(!((U|0)==-1)){if(X^(W|0)==0){V=W;U=W;break}else{w=271;break a}}else{c[e>>2]=0;V=0;w=265;break}}else{V=W;w=265}}while(0);if((w|0)==265){w=0;if(X){w=271;break a}else{U=0}}X=c[b>>2]|0;W=c[X+12>>2]|0;if((W|0)==(c[X+16>>2]|0)){W=sc[c[(c[X>>2]|0)+36>>2]&127](X)|0}else{W=c[W>>2]|0}if(!(kc[c[(c[l>>2]|0)+12>>2]&31](l,2048,W)|0)){w=271;break a}W=c[n>>2]|0;if((W|0)==(o|0)){W=(c[H>>2]|0)!=119;Y=c[m>>2]|0;X=o-Y|0;o=X>>>0<2147483647?X<<1:-1;X=X>>2;if(!W){Y=0}Y=Tm(Y,o)|0;if((Y|0)==0){w=276;break a}if(!W){W=c[m>>2]|0;c[m>>2]=Y;if((W|0)!=0){pc[c[H>>2]&255](W);Y=c[m>>2]|0}}else{c[m>>2]=Y}c[H>>2]=120;W=Y+(X<<2)|0;c[n>>2]=W;o=(c[m>>2]|0)+(o>>>2<<2)|0}X=c[b>>2]|0;Y=c[X+12>>2]|0;if((Y|0)==(c[X+16>>2]|0)){X=sc[c[(c[X>>2]|0)+36>>2]&127](X)|0;W=c[n>>2]|0}else{X=c[Y>>2]|0}c[n>>2]=W+4;c[W>>2]=X;T=T+ -1|0;c[C>>2]=T;Y=c[b>>2]|0;X=Y+12|0;W=c[X>>2]|0;if((W|0)==(c[Y+16>>2]|0)){sc[c[(c[Y>>2]|0)+40>>2]&127](Y)|0}else{c[X>>2]=W+4}if((T|0)>0){W=V}else{break}}}if((c[n>>2]|0)==(c[m>>2]|0)){w=290;break a}break};case 2:{if(!((N|0)!=0|O>>>0<2)){if((O|0)==2){U=(a[I]|0)!=0}else{U=0}if(!(G|U)){N=0;break b}}X=a[s]|0;U=(X&1)==0?M:c[h>>2]|0;d:do{if((O|0)!=0?(d[z+(O+ -1)|0]|0)<2:0){while(1){if((X&1)==0){V=M;W=(X&255)>>>1}else{V=c[h>>2]|0;W=c[M>>2]|0}if((U|0)==(V+(W<<2)|0)){break}if(!(kc[c[(c[l>>2]|0)+12>>2]&31](l,8192,c[U>>2]|0)|0)){w=129;break}X=a[s]|0;U=U+4|0}if((w|0)==129){w=0;X=a[s]|0}W=(X&1)==0;Y=U-(W?M:c[h>>2]|0)>>2;V=a[p]|0;Z=(V&1)==0;if(Z){_=(V&255)>>>1}else{_=c[J>>2]|0}e:do{if(!(Y>>>0>_>>>0)){if(Z){Z=J;_=(V&255)>>>1;Y=J+(((V&255)>>>1)-Y<<2)|0}else{$=c[K>>2]|0;V=c[J>>2]|0;Z=$;_=V;Y=$+(V-Y<<2)|0}V=Z+(_<<2)|0;if((Y|0)==(V|0)){V=T;break d}else{Z=W?M:c[h>>2]|0}while(1){if((c[Y>>2]|0)!=(c[Z>>2]|0)){break e}Y=Y+4|0;if((Y|0)==(V|0)){V=T;break d}Z=Z+4|0}}}while(0);V=T;U=W?M:c[h>>2]|0}else{V=T}}while(0);f:while(1){if((X&1)==0){W=M;X=(X&255)>>>1}else{W=c[h>>2]|0;X=c[M>>2]|0}if((U|0)==(W+(X<<2)|0)){break}X=c[b>>2]|0;do{if((X|0)!=0){W=c[X+12>>2]|0;if((W|0)==(c[X+16>>2]|0)){W=sc[c[(c[X>>2]|0)+36>>2]&127](X)|0}else{W=c[W>>2]|0}if((W|0)==-1){c[b>>2]=0;W=1;break}else{W=(c[b>>2]|0)==0;break}}else{W=1}}while(0);do{if((T|0)!=0){X=c[T+12>>2]|0;if((X|0)==(c[T+16>>2]|0)){T=sc[c[(c[T>>2]|0)+36>>2]&127](T)|0}else{T=c[X>>2]|0}if(!((T|0)==-1)){if(W^(V|0)==0){W=V;T=V;break}else{break f}}else{c[e>>2]=0;V=0;w=159;break}}else{w=159}}while(0);if((w|0)==159){w=0;if(W){break}else{W=V;T=0}}X=c[b>>2]|0;V=c[X+12>>2]|0;if((V|0)==(c[X+16>>2]|0)){V=sc[c[(c[X>>2]|0)+36>>2]&127](X)|0}else{V=c[V>>2]|0}if((V|0)!=(c[U>>2]|0)){break}Y=c[b>>2]|0;X=Y+12|0;V=c[X>>2]|0;if((V|0)==(c[Y+16>>2]|0)){sc[c[(c[Y>>2]|0)+40>>2]&127](Y)|0}else{c[X>>2]=V+4}V=W;X=a[s]|0;U=U+4|0}if(G){V=a[s]|0;if((V&1)==0){T=M;V=(V&255)>>>1}else{T=c[h>>2]|0;V=c[M>>2]|0}if((U|0)!=(T+(V<<2)|0)){w=174;break a}}break};default:{}}}while(0);g:do{if((w|0)==28){w=0;if((O|0)==3){y=S;B=P;w=292;break a}else{U=T}while(1){W=c[b>>2]|0;do{if((W|0)!=0){V=c[W+12>>2]|0;if((V|0)==(c[W+16>>2]|0)){V=sc[c[(c[W>>2]|0)+36>>2]&127](W)|0}else{V=c[V>>2]|0}if((V|0)==-1){c[b>>2]=0;V=1;break}else{V=(c[b>>2]|0)==0;break}}else{V=1}}while(0);do{if((T|0)!=0){W=c[T+12>>2]|0;if((W|0)==(c[T+16>>2]|0)){T=sc[c[(c[T>>2]|0)+36>>2]&127](T)|0}else{T=c[W>>2]|0}if(!((T|0)==-1)){if(V^(U|0)==0){V=U;T=U;break}else{break g}}else{c[e>>2]=0;U=0;w=42;break}}else{w=42}}while(0);if((w|0)==42){w=0;if(V){break g}else{V=U;T=0}}W=c[b>>2]|0;U=c[W+12>>2]|0;if((U|0)==(c[W+16>>2]|0)){U=sc[c[(c[W>>2]|0)+36>>2]&127](W)|0}else{U=c[U>>2]|0}if(!(kc[c[(c[l>>2]|0)+12>>2]&31](l,8192,U)|0)){break g}U=c[b>>2]|0;W=U+12|0;X=c[W>>2]|0;if((X|0)==(c[U+16>>2]|0)){U=sc[c[(c[U>>2]|0)+40>>2]&127](U)|0}else{c[W>>2]=X+4;U=c[X>>2]|0}Ue(p,U);U=V}}}while(0);O=O+1|0;if(!(O>>>0<4)){y=S;B=P;w=292;break}}h:do{if((w|0)==27){c[j>>2]=c[j>>2]|4;x=0;y=S;B=P}else if((w|0)==116){c[j>>2]=c[j>>2]|4;x=0;y=S;B=P}else if((w|0)==174){c[j>>2]=c[j>>2]|4;x=0;y=S;B=P}else if((w|0)==198){bn()}else if((w|0)==214){bn()}else if((w|0)==225){bn()}else if((w|0)==248){c[j>>2]=c[j>>2]|4;x=0;y=S;B=P}else if((w|0)==271){c[j>>2]=c[j>>2]|4;x=0;y=S;B=P}else if((w|0)==276){bn()}else if((w|0)==290){c[j>>2]=c[j>>2]|4;x=0;y=S;B=P}else if((w|0)==292){i:do{if((N|0)!=0){x=N+4|0;n=N+8|0;z=1;j:while(1){A=a[N]|0;if((A&1)==0){A=(A&255)>>>1}else{A=c[x>>2]|0}if(!(z>>>0<A>>>0)){break i}A=c[b>>2]|0;do{if((A|0)!=0){C=c[A+12>>2]|0;if((C|0)==(c[A+16>>2]|0)){A=sc[c[(c[A>>2]|0)+36>>2]&127](A)|0}else{A=c[C>>2]|0}if((A|0)==-1){c[b>>2]=0;A=1;break}else{A=(c[b>>2]|0)==0;break}}else{A=1}}while(0);C=c[e>>2]|0;do{if((C|0)!=0){D=c[C+12>>2]|0;if((D|0)==(c[C+16>>2]|0)){C=sc[c[(c[C>>2]|0)+36>>2]&127](C)|0}else{C=c[D>>2]|0}if(!((C|0)==-1)){if(A){break}else{break j}}else{c[e>>2]=0;w=311;break}}else{w=311}}while(0);if((w|0)==311?(w=0,A):0){break}A=c[b>>2]|0;C=c[A+12>>2]|0;if((C|0)==(c[A+16>>2]|0)){A=sc[c[(c[A>>2]|0)+36>>2]&127](A)|0}else{A=c[C>>2]|0}if((a[N]&1)==0){C=x}else{C=c[n>>2]|0}if((A|0)!=(c[C+(z<<2)>>2]|0)){break}z=z+1|0;A=c[b>>2]|0;D=A+12|0;C=c[D>>2]|0;if((C|0)==(c[A+16>>2]|0)){sc[c[(c[A>>2]|0)+40>>2]&127](A)|0;continue}else{c[D>>2]=C+4;continue}}c[j>>2]=c[j>>2]|4;x=0;break h}}while(0);if((y|0)!=(R|0)){c[u>>2]=0;tj(t,y,R,u);if((c[u>>2]|0)==0){x=1}else{c[j>>2]=c[j>>2]|4;x=0}}else{x=1;y=R}}}while(0);Qe(p);Qe(q);Qe(r);Qe(s);Fe(t);if((y|0)==0){i=v;return x|0}pc[B&255](y);i=v;return x|0}function yj(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;d=i;i=i+448|0;u=d;t=d+24|0;m=d+16|0;q=d+428|0;o=d+12|0;r=d+432|0;s=d+424|0;c[m>>2]=t;n=m+4|0;c[n>>2]=119;t=t+400|0;Ze(o,h);w=c[o>>2]|0;if(!((c[1498]|0)==-1)){c[u>>2]=5992;c[u+4>>2]=117;c[u+8>>2]=0;Ae(5992,u,118)}p=(c[5996>>2]|0)+ -1|0;v=c[w+8>>2]|0;if(!((c[w+12>>2]|0)-v>>2>>>0>p>>>0)){w=xb(4)|0;wm(w);ec(w|0,13960,106)}v=c[v+(p<<2)>>2]|0;if((v|0)==0){w=xb(4)|0;wm(w);ec(w|0,13960,106)}a[r]=0;p=c[f>>2]|0;c[s>>2]=p;w=c[h+4>>2]|0;c[u+0>>2]=c[s+0>>2];if(xj(e,u,g,o,w,j,r,v,m,q,t)|0){if((a[k]&1)==0){c[k+4>>2]=0;a[k]=0}else{c[c[k+8>>2]>>2]=0;c[k+4>>2]=0}if((a[r]|0)!=0){Ue(k,Bc[c[(c[v>>2]|0)+44>>2]&15](v,45)|0)}h=Bc[c[(c[v>>2]|0)+44>>2]&15](v,48)|0;r=c[m>>2]|0;q=c[q>>2]|0;g=q+ -4|0;a:do{if(r>>>0<g>>>0){while(1){s=r+4|0;if((c[r>>2]|0)!=(h|0)){break a}if(s>>>0<g>>>0){r=s}else{r=s;break}}}}while(0);zj(k,r,q)|0}k=c[e>>2]|0;do{if((k|0)!=0){q=c[k+12>>2]|0;if((q|0)==(c[k+16>>2]|0)){k=sc[c[(c[k>>2]|0)+36>>2]&127](k)|0}else{k=c[q>>2]|0}if((k|0)==-1){c[e>>2]=0;k=1;break}else{k=(c[e>>2]|0)==0;break}}else{k=1}}while(0);do{if((p|0)!=0){q=c[p+12>>2]|0;if((q|0)==(c[p+16>>2]|0)){p=sc[c[(c[p>>2]|0)+36>>2]&127](p)|0}else{p=c[q>>2]|0}if(!((p|0)==-1)){if(k){break}else{l=31;break}}else{c[f>>2]=0;l=29;break}}else{l=29}}while(0);if((l|0)==29?k:0){l=31}if((l|0)==31){c[j>>2]=c[j>>2]|2}c[b>>2]=c[e>>2];ge(c[o>>2]|0)|0;l=c[m>>2]|0;c[m>>2]=0;if((l|0)==0){i=d;return}pc[c[n>>2]&255](l);i=d;return}function zj(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0;f=i;j=d;l=a[b]|0;if((l&1)==0){k=1;g=(l&255)>>>1}else{l=c[b>>2]|0;k=(l&-2)+ -1|0;g=c[b+4>>2]|0;l=l&255}h=e-j>>2;if((h|0)==0){i=f;return b|0}if((k-g|0)>>>0<h>>>0){We(b,k,g+h-k|0,g,g,0,0);l=a[b]|0}if((l&1)==0){k=b+4|0}else{k=c[b+8>>2]|0}l=k+(g<<2)|0;if((d|0)!=(e|0)){j=g+((e+ -4+(0-j)|0)>>>2)+1|0;while(1){c[l>>2]=c[d>>2];d=d+4|0;if((d|0)==(e|0)){break}else{l=l+4|0}}l=k+(j<<2)|0}c[l>>2]=0;g=g+h|0;if((a[b]&1)==0){a[b]=g<<1;i=f;return b|0}else{c[b+4>>2]=g;i=f;return b|0}return 0}function Aj(b,d,e,f,g,h,j,k,l,m){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0;n=i;i=i+128|0;y=n;v=n+24|0;w=n+44|0;x=n+32|0;o=n+56|0;u=n+12|0;r=n+28|0;q=n+68|0;t=n+80|0;p=n+92|0;s=n+104|0;if(b){p=c[d>>2]|0;if(!((c[1392]|0)==-1)){c[y>>2]=5568;c[y+4>>2]=117;c[y+8>>2]=0;Ae(5568,y,118)}r=(c[5572>>2]|0)+ -1|0;q=c[p+8>>2]|0;if(!((c[p+12>>2]|0)-q>>2>>>0>r>>>0)){d=xb(4)|0;wm(d);ec(d|0,13960,106)}p=c[q+(r<<2)>>2]|0;if((p|0)==0){d=xb(4)|0;wm(d);ec(d|0,13960,106)}qc[c[(c[p>>2]|0)+44>>2]&63](v,p);d=c[v>>2]|0;a[e]=d;a[e+1|0]=d>>8;a[e+2|0]=d>>16;a[e+3|0]=d>>24;qc[c[(c[p>>2]|0)+32>>2]&63](w,p);if((a[l]&1)==0){c[l+4>>2]=0;a[l]=0}else{c[c[l+8>>2]>>2]=0;c[l+4>>2]=0}Te(l,0);c[l+0>>2]=c[w+0>>2];c[l+4>>2]=c[w+4>>2];c[l+8>>2]=c[w+8>>2];c[w+0>>2]=0;c[w+4>>2]=0;c[w+8>>2]=0;Qe(w);qc[c[(c[p>>2]|0)+28>>2]&63](x,p);if((a[k]&1)==0){c[k+4>>2]=0;a[k]=0}else{c[c[k+8>>2]>>2]=0;c[k+4>>2]=0}Te(k,0);c[k+0>>2]=c[x+0>>2];c[k+4>>2]=c[x+4>>2];c[k+8>>2]=c[x+8>>2];c[x+0>>2]=0;c[x+4>>2]=0;c[x+8>>2]=0;Qe(x);c[f>>2]=sc[c[(c[p>>2]|0)+12>>2]&127](p)|0;c[g>>2]=sc[c[(c[p>>2]|0)+16>>2]&127](p)|0;qc[c[(c[p>>2]|0)+20>>2]&63](o,p);if((a[h]&1)==0){a[h+1|0]=0;a[h]=0}else{a[c[h+8>>2]|0]=0;c[h+4>>2]=0}Je(h,0);c[h+0>>2]=c[o+0>>2];c[h+4>>2]=c[o+4>>2];c[h+8>>2]=c[o+8>>2];c[o+0>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;Fe(o);qc[c[(c[p>>2]|0)+24>>2]&63](u,p);if((a[j]&1)==0){c[j+4>>2]=0;a[j]=0}else{c[c[j+8>>2]>>2]=0;c[j+4>>2]=0}Te(j,0);c[j+0>>2]=c[u+0>>2];c[j+4>>2]=c[u+4>>2];c[j+8>>2]=c[u+8>>2];c[u+0>>2]=0;c[u+4>>2]=0;c[u+8>>2]=0;Qe(u);d=sc[c[(c[p>>2]|0)+36>>2]&127](p)|0;c[m>>2]=d;i=n;return}else{o=c[d>>2]|0;if(!((c[1376]|0)==-1)){c[y>>2]=5504;c[y+4>>2]=117;c[y+8>>2]=0;Ae(5504,y,118)}u=(c[5508>>2]|0)+ -1|0;v=c[o+8>>2]|0;if(!((c[o+12>>2]|0)-v>>2>>>0>u>>>0)){d=xb(4)|0;wm(d);ec(d|0,13960,106)}o=c[v+(u<<2)>>2]|0;if((o|0)==0){d=xb(4)|0;wm(d);ec(d|0,13960,106)}qc[c[(c[o>>2]|0)+44>>2]&63](r,o);d=c[r>>2]|0;a[e]=d;a[e+1|0]=d>>8;a[e+2|0]=d>>16;a[e+3|0]=d>>24;qc[c[(c[o>>2]|0)+32>>2]&63](q,o);if((a[l]&1)==0){c[l+4>>2]=0;a[l]=0}else{c[c[l+8>>2]>>2]=0;c[l+4>>2]=0}Te(l,0);c[l+0>>2]=c[q+0>>2];c[l+4>>2]=c[q+4>>2];c[l+8>>2]=c[q+8>>2];c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;Qe(q);qc[c[(c[o>>2]|0)+28>>2]&63](t,o);if((a[k]&1)==0){c[k+4>>2]=0;a[k]=0}else{c[c[k+8>>2]>>2]=0;c[k+4>>2]=0}Te(k,0);c[k+0>>2]=c[t+0>>2];c[k+4>>2]=c[t+4>>2];c[k+8>>2]=c[t+8>>2];c[t+0>>2]=0;c[t+4>>2]=0;c[t+8>>2]=0;Qe(t);c[f>>2]=sc[c[(c[o>>2]|0)+12>>2]&127](o)|0;c[g>>2]=sc[c[(c[o>>2]|0)+16>>2]&127](o)|0;qc[c[(c[o>>2]|0)+20>>2]&63](p,o);if((a[h]&1)==0){a[h+1|0]=0;a[h]=0}else{a[c[h+8>>2]|0]=0;c[h+4>>2]=0}Je(h,0);c[h+0>>2]=c[p+0>>2];c[h+4>>2]=c[p+4>>2];c[h+8>>2]=c[p+8>>2];c[p+0>>2]=0;c[p+4>>2]=0;c[p+8>>2]=0;Fe(p);qc[c[(c[o>>2]|0)+24>>2]&63](s,o);if((a[j]&1)==0){c[j+4>>2]=0;a[j]=0}else{c[c[j+8>>2]>>2]=0;c[j+4>>2]=0}Te(j,0);c[j+0>>2]=c[s+0>>2];c[j+4>>2]=c[s+4>>2];c[j+8>>2]=c[s+8>>2];c[s+0>>2]=0;c[s+4>>2]=0;c[s+8>>2]=0;Qe(s);d=sc[c[(c[o>>2]|0)+36>>2]&127](o)|0;c[m>>2]=d;i=n;return}}function Bj(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function Cj(a){a=a|0;return}function Dj(b,d,e,f,g,j,l){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;j=j|0;l=+l;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0;t=i;i=i+384|0;u=t;H=t+76|0;F=t+44|0;E=t+176|0;d=t+40|0;y=t+68|0;x=t+276|0;w=t+380|0;C=t+56|0;v=t+24|0;B=t+12|0;G=t+52|0;D=t+280|0;A=t+36|0;z=t+48|0;s=t+72|0;c[F>>2]=H;h[k>>3]=l;c[u>>2]=c[k>>2];c[u+4>>2]=c[k+4>>2];H=Cb(H|0,100,5752,u|0)|0;if(H>>>0>99){if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}H=c[1472]|0;h[k>>3]=l;c[u>>2]=c[k>>2];c[u+4>>2]=c[k+4>>2];H=yh(F,H,5752,u)|0;E=c[F>>2]|0;if((E|0)==0){bn()}I=Rm(H)|0;if((I|0)==0){bn()}else{m=I;n=E;p=I;o=H}}else{m=0;n=0;p=E;o=H}Ze(d,g);I=c[d>>2]|0;if(!((c[1500]|0)==-1)){c[u>>2]=6e3;c[u+4>>2]=117;c[u+8>>2]=0;Ae(6e3,u,118)}H=(c[6004>>2]|0)+ -1|0;E=c[I+8>>2]|0;if(!((c[I+12>>2]|0)-E>>2>>>0>H>>>0)){I=xb(4)|0;wm(I);ec(I|0,13960,106)}E=c[E+(H<<2)>>2]|0;if((E|0)==0){I=xb(4)|0;wm(I);ec(I|0,13960,106)}I=c[F>>2]|0;yc[c[(c[E>>2]|0)+32>>2]&7](E,I,I+o|0,p)|0;if((o|0)==0){F=0}else{F=(a[c[F>>2]|0]|0)==45}c[y>>2]=0;c[C+0>>2]=0;c[C+4>>2]=0;c[C+8>>2]=0;c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;c[B+0>>2]=0;c[B+4>>2]=0;c[B+8>>2]=0;Ej(f,F,d,y,x,w,C,v,B,G);f=c[G>>2]|0;if((o|0)>(f|0)){G=a[B]|0;if((G&1)==0){G=(G&255)>>>1}else{G=c[B+4>>2]|0}H=a[v]|0;if((H&1)==0){H=(H&255)>>>1}else{H=c[v+4>>2]|0}G=G+(o-f<<1|1)+H|0}else{G=a[B]|0;if((G&1)==0){G=(G&255)>>>1}else{G=c[B+4>>2]|0}H=a[v]|0;if((H&1)==0){H=(H&255)>>>1}else{H=c[v+4>>2]|0}G=G+2+H|0}G=G+f|0;if(G>>>0>100){D=Rm(G)|0;if((D|0)==0){bn()}else{r=D;q=D}}else{r=0;q=D}Fj(q,A,z,c[g+4>>2]|0,p,p+o|0,E,F,y,a[x]|0,a[w]|0,C,v,B,f);c[s>>2]=c[e>>2];H=c[A>>2]|0;I=c[z>>2]|0;c[u+0>>2]=c[s+0>>2];th(b,u,q,H,I,g,j);if((r|0)!=0){Sm(r)}Fe(B);Fe(v);Fe(C);ge(c[d>>2]|0)|0;if((m|0)!=0){Sm(m)}if((n|0)==0){i=t;return}Sm(n);i=t;return}function Ej(b,d,e,f,g,h,j,k,l,m){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0;n=i;i=i+128|0;A=n;y=n+12|0;p=n+20|0;w=n+16|0;x=n+56|0;o=n+32|0;z=n+44|0;r=n+68|0;q=n+72|0;t=n+84|0;s=n+88|0;v=n+100|0;u=n+112|0;e=c[e>>2]|0;if(b){if(!((c[1360]|0)==-1)){c[A>>2]=5440;c[A+4>>2]=117;c[A+8>>2]=0;Ae(5440,A,118)}r=(c[5444>>2]|0)+ -1|0;q=c[e+8>>2]|0;if(!((c[e+12>>2]|0)-q>>2>>>0>r>>>0)){b=xb(4)|0;wm(b);ec(b|0,13960,106)}q=c[q+(r<<2)>>2]|0;if((q|0)==0){b=xb(4)|0;wm(b);ec(b|0,13960,106)}r=c[q>>2]|0;if(d){qc[c[r+44>>2]&63](y,q);b=c[y>>2]|0;a[f]=b;a[f+1|0]=b>>8;a[f+2|0]=b>>16;a[f+3|0]=b>>24;qc[c[(c[q>>2]|0)+32>>2]&63](p,q);if((a[l]&1)==0){a[l+1|0]=0;a[l]=0}else{a[c[l+8>>2]|0]=0;c[l+4>>2]=0}Je(l,0);c[l+0>>2]=c[p+0>>2];c[l+4>>2]=c[p+4>>2];c[l+8>>2]=c[p+8>>2];c[p+0>>2]=0;c[p+4>>2]=0;c[p+8>>2]=0;Fe(p)}else{qc[c[r+40>>2]&63](w,q);b=c[w>>2]|0;a[f]=b;a[f+1|0]=b>>8;a[f+2|0]=b>>16;a[f+3|0]=b>>24;qc[c[(c[q>>2]|0)+28>>2]&63](x,q);if((a[l]&1)==0){a[l+1|0]=0;a[l]=0}else{a[c[l+8>>2]|0]=0;c[l+4>>2]=0}Je(l,0);c[l+0>>2]=c[x+0>>2];c[l+4>>2]=c[x+4>>2];c[l+8>>2]=c[x+8>>2];c[x+0>>2]=0;c[x+4>>2]=0;c[x+8>>2]=0;Fe(x)}a[g]=sc[c[(c[q>>2]|0)+12>>2]&127](q)|0;a[h]=sc[c[(c[q>>2]|0)+16>>2]&127](q)|0;qc[c[(c[q>>2]|0)+20>>2]&63](o,q);if((a[j]&1)==0){a[j+1|0]=0;a[j]=0}else{a[c[j+8>>2]|0]=0;c[j+4>>2]=0}Je(j,0);c[j+0>>2]=c[o+0>>2];c[j+4>>2]=c[o+4>>2];c[j+8>>2]=c[o+8>>2];c[o+0>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;Fe(o);qc[c[(c[q>>2]|0)+24>>2]&63](z,q);if((a[k]&1)==0){a[k+1|0]=0;a[k]=0}else{a[c[k+8>>2]|0]=0;c[k+4>>2]=0}Je(k,0);c[k+0>>2]=c[z+0>>2];c[k+4>>2]=c[z+4>>2];c[k+8>>2]=c[z+8>>2];c[z+0>>2]=0;c[z+4>>2]=0;c[z+8>>2]=0;Fe(z);b=sc[c[(c[q>>2]|0)+36>>2]&127](q)|0;c[m>>2]=b;i=n;return}else{if(!((c[1344]|0)==-1)){c[A>>2]=5376;c[A+4>>2]=117;c[A+8>>2]=0;Ae(5376,A,118)}p=(c[5380>>2]|0)+ -1|0;o=c[e+8>>2]|0;if(!((c[e+12>>2]|0)-o>>2>>>0>p>>>0)){b=xb(4)|0;wm(b);ec(b|0,13960,106)}o=c[o+(p<<2)>>2]|0;if((o|0)==0){b=xb(4)|0;wm(b);ec(b|0,13960,106)}p=c[o>>2]|0;if(d){qc[c[p+44>>2]&63](r,o);b=c[r>>2]|0;a[f]=b;a[f+1|0]=b>>8;a[f+2|0]=b>>16;a[f+3|0]=b>>24;qc[c[(c[o>>2]|0)+32>>2]&63](q,o);if((a[l]&1)==0){a[l+1|0]=0;a[l]=0}else{a[c[l+8>>2]|0]=0;c[l+4>>2]=0}Je(l,0);c[l+0>>2]=c[q+0>>2];c[l+4>>2]=c[q+4>>2];c[l+8>>2]=c[q+8>>2];c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;Fe(q)}else{qc[c[p+40>>2]&63](t,o);b=c[t>>2]|0;a[f]=b;a[f+1|0]=b>>8;a[f+2|0]=b>>16;a[f+3|0]=b>>24;qc[c[(c[o>>2]|0)+28>>2]&63](s,o);if((a[l]&1)==0){a[l+1|0]=0;a[l]=0}else{a[c[l+8>>2]|0]=0;c[l+4>>2]=0}Je(l,0);c[l+0>>2]=c[s+0>>2];c[l+4>>2]=c[s+4>>2];c[l+8>>2]=c[s+8>>2];c[s+0>>2]=0;c[s+4>>2]=0;c[s+8>>2]=0;Fe(s)}a[g]=sc[c[(c[o>>2]|0)+12>>2]&127](o)|0;a[h]=sc[c[(c[o>>2]|0)+16>>2]&127](o)|0;qc[c[(c[o>>2]|0)+20>>2]&63](v,o);if((a[j]&1)==0){a[j+1|0]=0;a[j]=0}else{a[c[j+8>>2]|0]=0;c[j+4>>2]=0}Je(j,0);c[j+0>>2]=c[v+0>>2];c[j+4>>2]=c[v+4>>2];c[j+8>>2]=c[v+8>>2];c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;Fe(v);qc[c[(c[o>>2]|0)+24>>2]&63](u,o);if((a[k]&1)==0){a[k+1|0]=0;a[k]=0}else{a[c[k+8>>2]|0]=0;c[k+4>>2]=0}Je(k,0);c[k+0>>2]=c[u+0>>2];c[k+4>>2]=c[u+4>>2];c[k+8>>2]=c[u+8>>2];c[u+0>>2]=0;c[u+4>>2]=0;c[u+8>>2]=0;Fe(u);b=sc[c[(c[o>>2]|0)+36>>2]&127](o)|0;c[m>>2]=b;i=n;return}}function Fj(d,e,f,g,h,j,k,l,m,n,o,p,q,r,s){d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;p=p|0;q=q|0;r=r|0;s=s|0;var t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0;t=i;c[f>>2]=d;v=r+1|0;w=r+8|0;u=r+4|0;G=(g&512|0)==0;B=q+1|0;E=q+8|0;C=q+4|0;z=(s|0)>0;I=p+1|0;x=p+8|0;H=p+4|0;A=k+8|0;y=0-s|0;J=0;do{switch(a[m+J|0]|0){case 2:{K=a[q]|0;M=(K&1)==0;if(M){L=(K&255)>>>1}else{L=c[C>>2]|0}if(!((L|0)==0|G)){if(M){L=B;K=(K&255)>>>1}else{L=c[E>>2]|0;K=c[C>>2]|0}K=L+K|0;M=c[f>>2]|0;if((L|0)!=(K|0)){do{a[M]=a[L]|0;L=L+1|0;M=M+1|0}while((L|0)!=(K|0))}c[f>>2]=M}break};case 3:{L=a[r]|0;K=(L&1)==0;if(K){L=(L&255)>>>1}else{L=c[u>>2]|0}if((L|0)!=0){if(K){K=v}else{K=c[w>>2]|0}P=a[K]|0;Q=c[f>>2]|0;c[f>>2]=Q+1;a[Q]=P}break};case 4:{K=c[f>>2]|0;h=l?h+1|0:h;a:do{if(h>>>0<j>>>0){L=h;while(1){N=a[L]|0;if(!(N<<24>>24>-1)){break a}M=L+1|0;if((b[(c[A>>2]|0)+(N<<24>>24<<1)>>1]&2048)==0){break a}if(M>>>0<j>>>0){L=M}else{L=M;break}}}else{L=h}}while(0);M=L;if(z){if(L>>>0>h>>>0){M=h+(0-M)|0;N=M>>>0<y>>>0?y:M;M=N+s|0;P=K;O=L;Q=s;while(1){O=O+ -1|0;R=a[O]|0;c[f>>2]=P+1;a[P]=R;Q=Q+ -1|0;P=(Q|0)>0;if(!(O>>>0>h>>>0&P)){break}P=c[f>>2]|0}L=L+N|0;if(P){D=32}else{N=0}}else{M=s;D=32}if((D|0)==32){D=0;N=Bc[c[(c[k>>2]|0)+28>>2]&15](k,48)|0}O=c[f>>2]|0;c[f>>2]=O+1;if((M|0)>0){do{a[O]=N;M=M+ -1|0;O=c[f>>2]|0;c[f>>2]=O+1}while((M|0)>0)}a[O]=n}if((L|0)==(h|0)){Q=Bc[c[(c[k>>2]|0)+28>>2]&15](k,48)|0;R=c[f>>2]|0;c[f>>2]=R+1;a[R]=Q}else{N=a[p]|0;M=(N&1)==0;if(M){N=(N&255)>>>1}else{N=c[H>>2]|0}if((N|0)==0){M=-1;N=0;O=0}else{if(M){M=I}else{M=c[x>>2]|0}M=a[M]|0;N=0;O=0}while(1){if((O|0)==(M|0)){P=c[f>>2]|0;c[f>>2]=P+1;a[P]=o;N=N+1|0;P=a[p]|0;O=(P&1)==0;if(O){P=(P&255)>>>1}else{P=c[H>>2]|0}if(N>>>0<P>>>0){if(O){M=I}else{M=c[x>>2]|0}if((a[M+N|0]|0)==127){M=-1;O=0}else{if(O){M=I}else{M=c[x>>2]|0}M=a[M+N|0]|0;O=0}}else{O=0}}L=L+ -1|0;Q=a[L]|0;R=c[f>>2]|0;c[f>>2]=R+1;a[R]=Q;if((L|0)==(h|0)){break}else{O=O+1|0}}}L=c[f>>2]|0;if((K|0)!=(L|0)?(F=L+ -1|0,F>>>0>K>>>0):0){L=F;do{R=a[K]|0;a[K]=a[L]|0;a[L]=R;K=K+1|0;L=L+ -1|0}while(K>>>0<L>>>0)}break};case 0:{c[e>>2]=c[f>>2];break};case 1:{c[e>>2]=c[f>>2];Q=Bc[c[(c[k>>2]|0)+28>>2]&15](k,32)|0;R=c[f>>2]|0;c[f>>2]=R+1;a[R]=Q;break};default:{}}J=J+1|0}while((J|0)!=4);o=a[r]|0;y=(o&1)==0;if(y){x=(o&255)>>>1}else{x=c[u>>2]|0}if(x>>>0>1){if(y){u=(o&255)>>>1}else{v=c[w>>2]|0;u=c[u>>2]|0}w=v+1|0;u=v+u|0;v=c[f>>2]|0;if((w|0)!=(u|0)){do{a[v]=a[w]|0;w=w+1|0;v=v+1|0}while((w|0)!=(u|0))}c[f>>2]=v}g=g&176;if((g|0)==32){c[e>>2]=c[f>>2];i=t;return}else if((g|0)==16){i=t;return}else{c[e>>2]=d;i=t;return}}function Gj(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;q=i;i=i+176|0;n=q;p=q+40|0;v=q+24|0;u=q+72|0;t=q+73|0;s=q+12|0;m=q+28|0;r=q+48|0;A=q+44|0;x=q+76|0;o=q+60|0;d=q+64|0;w=q+68|0;Ze(p,g);y=c[p>>2]|0;if(!((c[1500]|0)==-1)){c[n>>2]=6e3;c[n+4>>2]=117;c[n+8>>2]=0;Ae(6e3,n,118)}B=(c[6004>>2]|0)+ -1|0;z=c[y+8>>2]|0;if(!((c[y+12>>2]|0)-z>>2>>>0>B>>>0)){D=xb(4)|0;wm(D);ec(D|0,13960,106)}y=c[z+(B<<2)>>2]|0;if((y|0)==0){D=xb(4)|0;wm(D);ec(D|0,13960,106)}B=a[j]|0;z=(B&1)==0;if(z){B=(B&255)>>>1}else{B=c[j+4>>2]|0}if((B|0)==0){z=0}else{if(z){z=j+1|0}else{z=c[j+8>>2]|0}z=a[z]|0;z=z<<24>>24==(Bc[c[(c[y>>2]|0)+28>>2]&15](y,45)|0)<<24>>24}c[v>>2]=0;c[s+0>>2]=0;c[s+4>>2]=0;c[s+8>>2]=0;c[m+0>>2]=0;c[m+4>>2]=0;c[m+8>>2]=0;c[r+0>>2]=0;c[r+4>>2]=0;c[r+8>>2]=0;Ej(f,z,p,v,u,t,s,m,r,A);f=a[j]|0;C=(f&1)==0;if(C){B=(f&255)>>>1}else{B=c[j+4>>2]|0}A=c[A>>2]|0;if((B|0)>(A|0)){if(C){B=(f&255)>>>1}else{B=c[j+4>>2]|0}C=a[r]|0;if((C&1)==0){C=(C&255)>>>1}else{C=c[r+4>>2]|0}D=a[m]|0;if((D&1)==0){D=(D&255)>>>1}else{D=c[m+4>>2]|0}B=C+(B-A<<1|1)+D|0}else{B=a[r]|0;if((B&1)==0){B=(B&255)>>>1}else{B=c[r+4>>2]|0}C=a[m]|0;if((C&1)==0){C=(C&255)>>>1}else{C=c[m+4>>2]|0}B=B+2+C|0}B=B+A|0;if(B>>>0>100){x=Rm(B)|0;if((x|0)==0){bn()}else{k=x;l=x}}else{k=0;l=x}if((f&1)==0){x=j+1|0;j=(f&255)>>>1}else{x=c[j+8>>2]|0;j=c[j+4>>2]|0}Fj(l,o,d,c[g+4>>2]|0,x,x+j|0,y,z,v,a[u]|0,a[t]|0,s,m,r,A);c[w>>2]=c[e>>2];C=c[o>>2]|0;D=c[d>>2]|0;c[n+0>>2]=c[w+0>>2];th(b,n,l,C,D,g,h);if((k|0)==0){Fe(r);Fe(m);Fe(s);D=c[p>>2]|0;ge(D)|0;i=q;return}Sm(k);Fe(r);Fe(m);Fe(s);D=c[p>>2]|0;ge(D)|0;i=q;return}function Hj(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function Ij(a){a=a|0;return}function Jj(b,d,e,f,g,j,l){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;j=j|0;l=+l;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0;t=i;i=i+992|0;u=t;H=t+888|0;F=t+420|0;E=t+16|0;d=t+416|0;y=t+424|0;x=t+428|0;w=t+880|0;C=t+440|0;v=t+452|0;B=t+464|0;G=t+476|0;D=t+480|0;A=t+432|0;z=t+436|0;s=t+884|0;c[F>>2]=H;h[k>>3]=l;c[u>>2]=c[k>>2];c[u+4>>2]=c[k+4>>2];H=Cb(H|0,100,5752,u|0)|0;if(H>>>0>99){if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}H=c[1472]|0;h[k>>3]=l;c[u>>2]=c[k>>2];c[u+4>>2]=c[k+4>>2];H=yh(F,H,5752,u)|0;E=c[F>>2]|0;if((E|0)==0){bn()}I=Rm(H<<2)|0;if((I|0)==0){bn()}else{m=I;n=E;p=I;o=H}}else{m=0;n=0;p=E;o=H}Ze(d,g);I=c[d>>2]|0;if(!((c[1498]|0)==-1)){c[u>>2]=5992;c[u+4>>2]=117;c[u+8>>2]=0;Ae(5992,u,118)}H=(c[5996>>2]|0)+ -1|0;E=c[I+8>>2]|0;if(!((c[I+12>>2]|0)-E>>2>>>0>H>>>0)){I=xb(4)|0;wm(I);ec(I|0,13960,106)}E=c[E+(H<<2)>>2]|0;if((E|0)==0){I=xb(4)|0;wm(I);ec(I|0,13960,106)}I=c[F>>2]|0;yc[c[(c[E>>2]|0)+48>>2]&7](E,I,I+o|0,p)|0;if((o|0)==0){F=0}else{F=(a[c[F>>2]|0]|0)==45}c[y>>2]=0;c[C+0>>2]=0;c[C+4>>2]=0;c[C+8>>2]=0;c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;c[B+0>>2]=0;c[B+4>>2]=0;c[B+8>>2]=0;Kj(f,F,d,y,x,w,C,v,B,G);f=c[G>>2]|0;if((o|0)>(f|0)){G=a[B]|0;if((G&1)==0){G=(G&255)>>>1}else{G=c[B+4>>2]|0}H=a[v]|0;if((H&1)==0){H=(H&255)>>>1}else{H=c[v+4>>2]|0}G=G+(o-f<<1|1)+H|0}else{G=a[B]|0;if((G&1)==0){G=(G&255)>>>1}else{G=c[B+4>>2]|0}H=a[v]|0;if((H&1)==0){H=(H&255)>>>1}else{H=c[v+4>>2]|0}G=G+2+H|0}G=G+f|0;if(G>>>0>100){D=Rm(G<<2)|0;if((D|0)==0){bn()}else{r=D;q=D}}else{r=0;q=D}Lj(q,A,z,c[g+4>>2]|0,p,p+(o<<2)|0,E,F,y,c[x>>2]|0,c[w>>2]|0,C,v,B,f);c[s>>2]=c[e>>2];H=c[A>>2]|0;I=c[z>>2]|0;c[u+0>>2]=c[s+0>>2];Hh(b,u,q,H,I,g,j);if((r|0)!=0){Sm(r)}Qe(B);Qe(v);Fe(C);ge(c[d>>2]|0)|0;if((m|0)!=0){Sm(m)}if((n|0)==0){i=t;return}Sm(n);i=t;return}function Kj(b,d,e,f,g,h,j,k,l,m){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0;n=i;i=i+128|0;A=n;y=n+12|0;p=n+20|0;w=n+16|0;x=n+56|0;o=n+32|0;z=n+44|0;r=n+68|0;q=n+72|0;t=n+84|0;s=n+88|0;v=n+100|0;u=n+112|0;e=c[e>>2]|0;if(b){if(!((c[1392]|0)==-1)){c[A>>2]=5568;c[A+4>>2]=117;c[A+8>>2]=0;Ae(5568,A,118)}r=(c[5572>>2]|0)+ -1|0;q=c[e+8>>2]|0;if(!((c[e+12>>2]|0)-q>>2>>>0>r>>>0)){b=xb(4)|0;wm(b);ec(b|0,13960,106)}q=c[q+(r<<2)>>2]|0;if((q|0)==0){b=xb(4)|0;wm(b);ec(b|0,13960,106)}r=c[q>>2]|0;if(d){qc[c[r+44>>2]&63](y,q);b=c[y>>2]|0;a[f]=b;a[f+1|0]=b>>8;a[f+2|0]=b>>16;a[f+3|0]=b>>24;qc[c[(c[q>>2]|0)+32>>2]&63](p,q);if((a[l]&1)==0){c[l+4>>2]=0;a[l]=0}else{c[c[l+8>>2]>>2]=0;c[l+4>>2]=0}Te(l,0);c[l+0>>2]=c[p+0>>2];c[l+4>>2]=c[p+4>>2];c[l+8>>2]=c[p+8>>2];c[p+0>>2]=0;c[p+4>>2]=0;c[p+8>>2]=0;Qe(p)}else{qc[c[r+40>>2]&63](w,q);b=c[w>>2]|0;a[f]=b;a[f+1|0]=b>>8;a[f+2|0]=b>>16;a[f+3|0]=b>>24;qc[c[(c[q>>2]|0)+28>>2]&63](x,q);if((a[l]&1)==0){c[l+4>>2]=0;a[l]=0}else{c[c[l+8>>2]>>2]=0;c[l+4>>2]=0}Te(l,0);c[l+0>>2]=c[x+0>>2];c[l+4>>2]=c[x+4>>2];c[l+8>>2]=c[x+8>>2];c[x+0>>2]=0;c[x+4>>2]=0;c[x+8>>2]=0;Qe(x)}c[g>>2]=sc[c[(c[q>>2]|0)+12>>2]&127](q)|0;c[h>>2]=sc[c[(c[q>>2]|0)+16>>2]&127](q)|0;qc[c[(c[q>>2]|0)+20>>2]&63](o,q);if((a[j]&1)==0){a[j+1|0]=0;a[j]=0}else{a[c[j+8>>2]|0]=0;c[j+4>>2]=0}Je(j,0);c[j+0>>2]=c[o+0>>2];c[j+4>>2]=c[o+4>>2];c[j+8>>2]=c[o+8>>2];c[o+0>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;Fe(o);qc[c[(c[q>>2]|0)+24>>2]&63](z,q);if((a[k]&1)==0){c[k+4>>2]=0;a[k]=0}else{c[c[k+8>>2]>>2]=0;c[k+4>>2]=0}Te(k,0);c[k+0>>2]=c[z+0>>2];c[k+4>>2]=c[z+4>>2];c[k+8>>2]=c[z+8>>2];c[z+0>>2]=0;c[z+4>>2]=0;c[z+8>>2]=0;Qe(z);b=sc[c[(c[q>>2]|0)+36>>2]&127](q)|0;c[m>>2]=b;i=n;return}else{if(!((c[1376]|0)==-1)){c[A>>2]=5504;c[A+4>>2]=117;c[A+8>>2]=0;Ae(5504,A,118)}p=(c[5508>>2]|0)+ -1|0;o=c[e+8>>2]|0;if(!((c[e+12>>2]|0)-o>>2>>>0>p>>>0)){b=xb(4)|0;wm(b);ec(b|0,13960,106)}o=c[o+(p<<2)>>2]|0;if((o|0)==0){b=xb(4)|0;wm(b);ec(b|0,13960,106)}p=c[o>>2]|0;if(d){qc[c[p+44>>2]&63](r,o);b=c[r>>2]|0;a[f]=b;a[f+1|0]=b>>8;a[f+2|0]=b>>16;a[f+3|0]=b>>24;qc[c[(c[o>>2]|0)+32>>2]&63](q,o);if((a[l]&1)==0){c[l+4>>2]=0;a[l]=0}else{c[c[l+8>>2]>>2]=0;c[l+4>>2]=0}Te(l,0);c[l+0>>2]=c[q+0>>2];c[l+4>>2]=c[q+4>>2];c[l+8>>2]=c[q+8>>2];c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;Qe(q)}else{qc[c[p+40>>2]&63](t,o);b=c[t>>2]|0;a[f]=b;a[f+1|0]=b>>8;a[f+2|0]=b>>16;a[f+3|0]=b>>24;qc[c[(c[o>>2]|0)+28>>2]&63](s,o);if((a[l]&1)==0){c[l+4>>2]=0;a[l]=0}else{c[c[l+8>>2]>>2]=0;c[l+4>>2]=0}Te(l,0);c[l+0>>2]=c[s+0>>2];c[l+4>>2]=c[s+4>>2];c[l+8>>2]=c[s+8>>2];c[s+0>>2]=0;c[s+4>>2]=0;c[s+8>>2]=0;Qe(s)}c[g>>2]=sc[c[(c[o>>2]|0)+12>>2]&127](o)|0;c[h>>2]=sc[c[(c[o>>2]|0)+16>>2]&127](o)|0;qc[c[(c[o>>2]|0)+20>>2]&63](v,o);if((a[j]&1)==0){a[j+1|0]=0;a[j]=0}else{a[c[j+8>>2]|0]=0;c[j+4>>2]=0}Je(j,0);c[j+0>>2]=c[v+0>>2];c[j+4>>2]=c[v+4>>2];c[j+8>>2]=c[v+8>>2];c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;Fe(v);qc[c[(c[o>>2]|0)+24>>2]&63](u,o);if((a[k]&1)==0){c[k+4>>2]=0;a[k]=0}else{c[c[k+8>>2]>>2]=0;c[k+4>>2]=0}Te(k,0);c[k+0>>2]=c[u+0>>2];c[k+4>>2]=c[u+4>>2];c[k+8>>2]=c[u+8>>2];c[u+0>>2]=0;c[u+4>>2]=0;c[u+8>>2]=0;Qe(u);b=sc[c[(c[o>>2]|0)+36>>2]&127](o)|0;c[m>>2]=b;i=n;return}}function Lj(b,d,e,f,g,h,j,k,l,m,n,o,p,q,r){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;p=p|0;q=q|0;r=r|0;var s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0;s=i;c[e>>2]=b;t=q+4|0;u=q+8|0;x=(f&512|0)==0;w=p+4|0;A=p+8|0;v=(r|0)>0;C=o+1|0;D=o+8|0;y=o+4|0;E=0;do{switch(a[l+E|0]|0){case 0:{c[d>>2]=c[e>>2];break};case 2:{F=a[p]|0;G=(F&1)==0;if(G){H=(F&255)>>>1}else{H=c[w>>2]|0}if(!((H|0)==0|x)){if(G){I=w;H=(F&255)>>>1}else{I=c[A>>2]|0;H=c[w>>2]|0}F=I+(H<<2)|0;G=c[e>>2]|0;if((I|0)!=(F|0)){J=(I+(H+ -1<<2)+(0-I)|0)>>>2;H=G;while(1){c[H>>2]=c[I>>2];I=I+4|0;if((I|0)==(F|0)){break}H=H+4|0}G=G+(J+1<<2)|0}c[e>>2]=G}break};case 3:{G=a[q]|0;F=(G&1)==0;if(F){G=(G&255)>>>1}else{G=c[t>>2]|0}if((G|0)!=0){if(F){F=t}else{F=c[u>>2]|0}L=c[F>>2]|0;M=c[e>>2]|0;c[e>>2]=M+4;c[M>>2]=L}break};case 1:{c[d>>2]=c[e>>2];L=Bc[c[(c[j>>2]|0)+44>>2]&15](j,32)|0;M=c[e>>2]|0;c[e>>2]=M+4;c[M>>2]=L;break};case 4:{F=c[e>>2]|0;g=k?g+4|0:g;a:do{if(g>>>0<h>>>0){G=g;while(1){H=G+4|0;if(!(kc[c[(c[j>>2]|0)+12>>2]&31](j,2048,c[G>>2]|0)|0)){break a}if(H>>>0<h>>>0){G=H}else{G=H;break}}}else{G=g}}while(0);if(v){if(G>>>0>g>>>0){H=c[e>>2]|0;K=r;while(1){G=G+ -4|0;I=H+4|0;c[H>>2]=c[G>>2];K=K+ -1|0;H=(K|0)>0;if(G>>>0>g>>>0&H){H=I}else{break}}c[e>>2]=I;if(H){z=34}else{I=c[e>>2]|0;c[e>>2]=I+4}}else{K=r;z=34}if((z|0)==34){z=0;J=Bc[c[(c[j>>2]|0)+44>>2]&15](j,48)|0;I=c[e>>2]|0;L=I+4|0;c[e>>2]=L;if((K|0)>0){H=I;M=K;while(1){c[H>>2]=J;M=M+ -1|0;if((M|0)<=0){break}else{H=L;L=L+4|0}}c[e>>2]=I+(K+1<<2);I=I+(K<<2)|0}}c[I>>2]=m}if((G|0)==(g|0)){K=Bc[c[(c[j>>2]|0)+44>>2]&15](j,48)|0;M=c[e>>2]|0;L=M+4|0;c[e>>2]=L;c[M>>2]=K}else{I=a[o]|0;H=(I&1)==0;if(H){I=(I&255)>>>1}else{I=c[y>>2]|0}if((I|0)==0){H=-1;J=0;K=0}else{if(H){H=C}else{H=c[D>>2]|0}H=a[H]|0;J=0;K=0}while(1){I=c[e>>2]|0;if((K|0)==(H|0)){K=I+4|0;c[e>>2]=K;c[I>>2]=n;J=J+1|0;L=a[o]|0;I=(L&1)==0;if(I){L=(L&255)>>>1}else{L=c[y>>2]|0}if(J>>>0<L>>>0){if(I){H=C}else{H=c[D>>2]|0}if((a[H+J|0]|0)==127){I=K;H=-1;K=0}else{if(I){H=C}else{H=c[D>>2]|0}I=K;H=a[H+J|0]|0;K=0}}else{I=K;K=0}}G=G+ -4|0;M=c[G>>2]|0;L=I+4|0;c[e>>2]=L;c[I>>2]=M;if((G|0)==(g|0)){break}else{K=K+1|0}}}if((F|0)!=(L|0)?(B=L+ -4|0,B>>>0>F>>>0):0){G=B;do{M=c[F>>2]|0;c[F>>2]=c[G>>2];c[G>>2]=M;F=F+4|0;G=G+ -4|0}while(F>>>0<G>>>0)}break};default:{}}E=E+1|0}while((E|0)!=4);v=a[q]|0;r=(v&1)==0;if(r){q=(v&255)>>>1}else{q=c[t>>2]|0}if(q>>>0>1){if(r){r=t;q=(v&255)>>>1}else{r=c[u>>2]|0;q=c[t>>2]|0}v=r+4|0;u=r+(q<<2)|0;t=c[e>>2]|0;if((v|0)!=(u|0)){q=(r+(q+ -1<<2)+(0-v)|0)>>>2;r=t;while(1){c[r>>2]=c[v>>2];v=v+4|0;if((v|0)==(u|0)){break}else{r=r+4|0}}t=t+(q+1<<2)|0}c[e>>2]=t}f=f&176;if((f|0)==32){c[d>>2]=c[e>>2];i=s;return}else if((f|0)==16){i=s;return}else{c[d>>2]=b;i=s;return}}function Mj(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;q=i;i=i+496|0;n=q;p=q+12|0;v=q+20|0;u=q+16|0;t=q+48|0;s=q+24|0;m=q+36|0;r=q+52|0;A=q+64|0;x=q+72|0;o=q+472|0;d=q+476|0;w=q+480|0;Ze(p,g);y=c[p>>2]|0;if(!((c[1498]|0)==-1)){c[n>>2]=5992;c[n+4>>2]=117;c[n+8>>2]=0;Ae(5992,n,118)}B=(c[5996>>2]|0)+ -1|0;z=c[y+8>>2]|0;if(!((c[y+12>>2]|0)-z>>2>>>0>B>>>0)){D=xb(4)|0;wm(D);ec(D|0,13960,106)}y=c[z+(B<<2)>>2]|0;if((y|0)==0){D=xb(4)|0;wm(D);ec(D|0,13960,106)}B=a[j]|0;z=(B&1)==0;if(z){B=(B&255)>>>1}else{B=c[j+4>>2]|0}if((B|0)==0){z=0}else{if(z){z=j+4|0}else{z=c[j+8>>2]|0}z=c[z>>2]|0;z=(z|0)==(Bc[c[(c[y>>2]|0)+44>>2]&15](y,45)|0)}c[v>>2]=0;c[s+0>>2]=0;c[s+4>>2]=0;c[s+8>>2]=0;c[m+0>>2]=0;c[m+4>>2]=0;c[m+8>>2]=0;c[r+0>>2]=0;c[r+4>>2]=0;c[r+8>>2]=0;Kj(f,z,p,v,u,t,s,m,r,A);f=a[j]|0;C=(f&1)==0;if(C){B=(f&255)>>>1}else{B=c[j+4>>2]|0}A=c[A>>2]|0;if((B|0)>(A|0)){if(C){B=(f&255)>>>1}else{B=c[j+4>>2]|0}C=a[r]|0;if((C&1)==0){C=(C&255)>>>1}else{C=c[r+4>>2]|0}D=a[m]|0;if((D&1)==0){D=(D&255)>>>1}else{D=c[m+4>>2]|0}B=C+(B-A<<1|1)+D|0}else{B=a[r]|0;if((B&1)==0){B=(B&255)>>>1}else{B=c[r+4>>2]|0}C=a[m]|0;if((C&1)==0){C=(C&255)>>>1}else{C=c[m+4>>2]|0}B=B+2+C|0}B=B+A|0;if(B>>>0>100){x=Rm(B<<2)|0;if((x|0)==0){bn()}else{k=x;l=x}}else{k=0;l=x}if((f&1)==0){x=j+4|0;j=(f&255)>>>1}else{x=c[j+8>>2]|0;j=c[j+4>>2]|0}Lj(l,o,d,c[g+4>>2]|0,x,x+(j<<2)|0,y,z,v,c[u>>2]|0,c[t>>2]|0,s,m,r,A);c[w>>2]=c[e>>2];C=c[o>>2]|0;D=c[d>>2]|0;c[n+0>>2]=c[w+0>>2];Hh(b,n,l,C,D,g,h);if((k|0)==0){Qe(r);Qe(m);Fe(s);D=c[p>>2]|0;ge(D)|0;i=q;return}Sm(k);Qe(r);Qe(m);Fe(s);D=c[p>>2]|0;ge(D)|0;i=q;return}function Nj(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function Oj(a){a=a|0;return}function Pj(b,d,e){b=b|0;d=d|0;e=e|0;b=i;if((a[d]&1)==0){d=d+1|0}else{d=c[d+8>>2]|0}e=tb(d|0,1)|0;i=b;return e>>>((e|0)!=(-1|0)|0)|0}function Qj(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0;d=i;i=i+16|0;j=d;c[j+0>>2]=0;c[j+4>>2]=0;c[j+8>>2]=0;m=a[h]|0;if((m&1)==0){l=h+1|0;m=(m&255)>>>1;h=h+1|0}else{n=c[h+8>>2]|0;l=n;m=c[h+4>>2]|0;h=n}l=l+m|0;if(h>>>0<l>>>0){do{Ke(j,a[h]|0);h=h+1|0}while((h|0)!=(l|0));l=(e|0)==-1?-1:e<<1;if((a[j]&1)==0){k=9}else{e=c[j+8>>2]|0}}else{l=(e|0)==-1?-1:e<<1;k=9}if((k|0)==9){e=j+1|0}g=Wb(l|0,f|0,g|0,e|0)|0;c[b+0>>2]=0;c[b+4>>2]=0;c[b+8>>2]=0;n=qn(g|0)|0;f=g+n|0;if((n|0)<=0){Fe(j);i=d;return}do{Ke(b,a[g]|0);g=g+1|0}while((g|0)!=(f|0));Fe(j);i=d;return}function Rj(a,b){a=a|0;b=b|0;a=i;_a(((b|0)==-1?-1:b<<1)|0)|0;i=a;return}function Sj(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function Tj(a){a=a|0;return}function Uj(b,d,e){b=b|0;d=d|0;e=e|0;b=i;if((a[d]&1)==0){d=d+1|0}else{d=c[d+8>>2]|0}e=tb(d|0,1)|0;i=b;return e>>>((e|0)!=(-1|0)|0)|0}function Vj(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0;j=i;i=i+176|0;o=j;n=j+40|0;m=j+168|0;l=j+172|0;d=j+16|0;p=j+8|0;k=j+32|0;c[d+0>>2]=0;c[d+4>>2]=0;c[d+8>>2]=0;c[p+4>>2]=0;c[p>>2]=7656;r=a[h]|0;if((r&1)==0){q=h+4|0;s=(r&255)>>>1;r=h+4|0}else{r=c[h+8>>2]|0;q=r;s=c[h+4>>2]|0}h=q+(s<<2)|0;s=o;c[s>>2]=0;c[s+4>>2]=0;a:do{if(r>>>0<h>>>0){q=n+32|0;s=7656|0;while(1){c[l>>2]=r;t=(xc[c[s+12>>2]&15](p,o,r,h,l,n,q,m)|0)==2;s=c[l>>2]|0;if(t|(s|0)==(r|0)){break}if(n>>>0<(c[m>>2]|0)>>>0){r=n;do{Ke(d,a[r]|0);r=r+1|0}while(r>>>0<(c[m>>2]|0)>>>0);r=c[l>>2]|0}else{r=s}if(!(r>>>0<h>>>0)){break a}s=c[p>>2]|0}pj(6880)}}while(0);if((a[d]&1)==0){p=d+1|0}else{p=c[d+8>>2]|0}p=Wb(((e|0)==-1?-1:e<<1)|0,f|0,g|0,p|0)|0;c[b+0>>2]=0;c[b+4>>2]=0;c[b+8>>2]=0;c[k+4>>2]=0;c[k>>2]=7760;t=qn(p|0)|0;g=p+t|0;s=o;c[s>>2]=0;c[s+4>>2]=0;if((t|0)<=0){Fe(d);i=j;return}e=g;f=n+128|0;h=7760|0;while(1){c[l>>2]=p;t=(xc[c[h+16>>2]&15](k,o,p,(e-p|0)>32?p+32|0:g,l,n,f,m)|0)==2;h=c[l>>2]|0;if(t|(h|0)==(p|0)){b=20;break}if(n>>>0<(c[m>>2]|0)>>>0){p=n;do{Ue(b,c[p>>2]|0);p=p+4|0}while(p>>>0<(c[m>>2]|0)>>>0);p=c[l>>2]|0}else{p=h}if(!(p>>>0<g>>>0)){b=25;break}h=c[k>>2]|0}if((b|0)==20){pj(6880)}else if((b|0)==25){Fe(d);i=j;return}}function Wj(a,b){a=a|0;b=b|0;a=i;_a(((b|0)==-1?-1:b<<1)|0)|0;i=a;return}function Xj(b){b=b|0;var d=0,e=0;d=i;c[b>>2]=6088;b=b+8|0;e=c[b>>2]|0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}if((e|0)==(c[1472]|0)){i=d;return}kb(c[b>>2]|0);i=d;return}function Yj(a){a=a|0;a=xb(8)|0;he(a,5880);c[a>>2]=2928;ec(a|0,2968,14)}function Zj(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0;f=i;i=i+16|0;e=f;c[b+4>>2]=d+ -1;c[b>>2]=5920;g=b+8|0;d=b+12|0;h=b+136|0;j=b+24|0;a[h]=1;c[d>>2]=j;c[g>>2]=j;c[b+16>>2]=h;h=28;do{if((j|0)==0){j=0}else{c[j>>2]=0;j=c[d>>2]|0}j=j+4|0;c[d>>2]=j;h=h+ -1|0}while((h|0)!=0);De(b+144|0,5904,1);g=c[g>>2]|0;h=c[d>>2]|0;if((h|0)!=(g|0)){c[d>>2]=h+(~((h+ -4+(0-g)|0)>>>2)<<2)}c[10812>>2]=0;c[2702]=4400;if(!((c[1106]|0)==-1)){c[e>>2]=4424;c[e+4>>2]=117;c[e+8>>2]=0;Ae(4424,e,118)}_j(b,10808,(c[4428>>2]|0)+ -1|0);c[10804>>2]=0;c[2700]=4440;if(!((c[1116]|0)==-1)){c[e>>2]=4464;c[e+4>>2]=117;c[e+8>>2]=0;Ae(4464,e,118)}_j(b,10800,(c[4468>>2]|0)+ -1|0);c[10788>>2]=0;c[2696]=6016;c[10792>>2]=0;a[10796|0]=0;c[10792>>2]=c[(vb()|0)>>2];if(!((c[1500]|0)==-1)){c[e>>2]=6e3;c[e+4>>2]=117;c[e+8>>2]=0;Ae(6e3,e,118)}_j(b,10784,(c[6004>>2]|0)+ -1|0);c[10780>>2]=0;c[2694]=6976;if(!((c[1498]|0)==-1)){c[e>>2]=5992;c[e+4>>2]=117;c[e+8>>2]=0;Ae(5992,e,118)}_j(b,10776,(c[5996>>2]|0)+ -1|0);c[10772>>2]=0;c[2692]=7192;if(!((c[1516]|0)==-1)){c[e>>2]=6064;c[e+4>>2]=117;c[e+8>>2]=0;Ae(6064,e,118)}_j(b,10768,(c[6068>>2]|0)+ -1|0);c[10756>>2]=0;c[2688]=6088;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}c[10760>>2]=c[1472];if(!((c[1518]|0)==-1)){c[e>>2]=6072;c[e+4>>2]=117;c[e+8>>2]=0;Ae(6072,e,118)}_j(b,10752,(c[6076>>2]|0)+ -1|0);c[10748>>2]=0;c[2686]=7416;if(!((c[1532]|0)==-1)){c[e>>2]=6128;c[e+4>>2]=117;c[e+8>>2]=0;Ae(6128,e,118)}_j(b,10744,(c[6132>>2]|0)+ -1|0);c[10740>>2]=0;c[2684]=7536;if(!((c[1534]|0)==-1)){c[e>>2]=6136;c[e+4>>2]=117;c[e+8>>2]=0;Ae(6136,e,118)}_j(b,10736,(c[6140>>2]|0)+ -1|0);c[10716>>2]=0;c[2678]=6168;a[10720|0]=46;a[10721|0]=44;c[10724>>2]=0;c[10728>>2]=0;c[10732>>2]=0;if(!((c[1536]|0)==-1)){c[e>>2]=6144;c[e+4>>2]=117;c[e+8>>2]=0;Ae(6144,e,118)}_j(b,10712,(c[6148>>2]|0)+ -1|0);c[10684>>2]=0;c[2670]=6208;c[10688>>2]=46;c[10692>>2]=44;c[10696>>2]=0;c[10700>>2]=0;c[10704>>2]=0;if(!((c[1538]|0)==-1)){c[e>>2]=6152;c[e+4>>2]=117;c[e+8>>2]=0;Ae(6152,e,118)}_j(b,10680,(c[6156>>2]|0)+ -1|0);c[10676>>2]=0;c[2668]=4480;if(!((c[1134]|0)==-1)){c[e>>2]=4536;c[e+4>>2]=117;c[e+8>>2]=0;Ae(4536,e,118)}_j(b,10672,(c[4540>>2]|0)+ -1|0);c[10668>>2]=0;c[2666]=4600;if(!((c[1164]|0)==-1)){c[e>>2]=4656;c[e+4>>2]=117;c[e+8>>2]=0;Ae(4656,e,118)}_j(b,10664,(c[4660>>2]|0)+ -1|0);c[10660>>2]=0;c[2664]=4672;if(!((c[1180]|0)==-1)){c[e>>2]=4720;c[e+4>>2]=117;c[e+8>>2]=0;Ae(4720,e,118)}_j(b,10656,(c[4724>>2]|0)+ -1|0);c[10652>>2]=0;c[2662]=4736;if(!((c[1196]|0)==-1)){c[e>>2]=4784;c[e+4>>2]=117;c[e+8>>2]=0;Ae(4784,e,118)}_j(b,10648,(c[4788>>2]|0)+ -1|0);c[10644>>2]=0;c[2660]=5328;if(!((c[1344]|0)==-1)){c[e>>2]=5376;c[e+4>>2]=117;c[e+8>>2]=0;Ae(5376,e,118)}_j(b,10640,(c[5380>>2]|0)+ -1|0);c[10636>>2]=0;c[2658]=5392;if(!((c[1360]|0)==-1)){c[e>>2]=5440;c[e+4>>2]=117;c[e+8>>2]=0;Ae(5440,e,118)}_j(b,10632,(c[5444>>2]|0)+ -1|0);c[10628>>2]=0;c[2656]=5456;if(!((c[1376]|0)==-1)){c[e>>2]=5504;c[e+4>>2]=117;c[e+8>>2]=0;Ae(5504,e,118)}_j(b,10624,(c[5508>>2]|0)+ -1|0);c[10620>>2]=0;c[2654]=5520;if(!((c[1392]|0)==-1)){c[e>>2]=5568;c[e+4>>2]=117;c[e+8>>2]=0;Ae(5568,e,118)}_j(b,10616,(c[5572>>2]|0)+ -1|0);c[10612>>2]=0;c[2652]=5584;if(!((c[1402]|0)==-1)){c[e>>2]=5608;c[e+4>>2]=117;c[e+8>>2]=0;Ae(5608,e,118)}_j(b,10608,(c[5612>>2]|0)+ -1|0);c[10604>>2]=0;c[2650]=5664;if(!((c[1422]|0)==-1)){c[e>>2]=5688;c[e+4>>2]=117;c[e+8>>2]=0;Ae(5688,e,118)}_j(b,10600,(c[5692>>2]|0)+ -1|0);c[10596>>2]=0;c[2648]=5720;if(!((c[1436]|0)==-1)){c[e>>2]=5744;c[e+4>>2]=117;c[e+8>>2]=0;Ae(5744,e,118)}_j(b,10592,(c[5748>>2]|0)+ -1|0);c[10588>>2]=0;c[2646]=5768;if(!((c[1448]|0)==-1)){c[e>>2]=5792;c[e+4>>2]=117;c[e+8>>2]=0;Ae(5792,e,118)}_j(b,10584,(c[5796>>2]|0)+ -1|0);c[10572>>2]=0;c[2642]=4816;c[10576>>2]=4864;if(!((c[1224]|0)==-1)){c[e>>2]=4896;c[e+4>>2]=117;c[e+8>>2]=0;Ae(4896,e,118)}_j(b,10568,(c[4900>>2]|0)+ -1|0);c[10556>>2]=0;c[2638]=4968;c[10560>>2]=5016;if(!((c[1262]|0)==-1)){c[e>>2]=5048;c[e+4>>2]=117;c[e+8>>2]=0;Ae(5048,e,118)}_j(b,10552,(c[5052>>2]|0)+ -1|0);c[10540>>2]=0;c[2634]=6912;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}c[10544>>2]=c[1472];c[2634]=5264;if(!((c[1320]|0)==-1)){c[e>>2]=5280;c[e+4>>2]=117;c[e+8>>2]=0;Ae(5280,e,118)}_j(b,10536,(c[5284>>2]|0)+ -1|0);c[10524>>2]=0;c[2630]=6912;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}c[10528>>2]=c[1472];c[2630]=5296;if(!((c[1328]|0)==-1)){c[e>>2]=5312;c[e+4>>2]=117;c[e+8>>2]=0;Ae(5312,e,118)}_j(b,10520,(c[5316>>2]|0)+ -1|0);c[10516>>2]=0;c[2628]=5808;if(!((c[1458]|0)==-1)){c[e>>2]=5832;c[e+4>>2]=117;c[e+8>>2]=0;Ae(5832,e,118)}_j(b,10512,(c[5836>>2]|0)+ -1|0);c[10508>>2]=0;c[2626]=5848;if((c[1468]|0)==-1){j=c[5876>>2]|0;j=j+ -1|0;_j(b,10504,j);i=f;return}c[e>>2]=5872;c[e+4>>2]=117;c[e+8>>2]=0;Ae(5872,e,118);j=c[5876>>2]|0;j=j+ -1|0;_j(b,10504,j);i=f;return}function _j(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0;f=i;fe(b);e=a+8|0;a=a+12|0;k=c[a>>2]|0;l=c[e>>2]|0;j=k-l>>2;do{if(!(j>>>0>d>>>0)){h=d+1|0;if(j>>>0<h>>>0){cm(e,h-j|0);l=c[e>>2]|0;break}if(j>>>0>h>>>0?(g=l+(h<<2)|0,(k|0)!=(g|0)):0){c[a>>2]=k+(~((k+ -4+(0-g)|0)>>>2)<<2)}}}while(0);g=c[l+(d<<2)>>2]|0;if((g|0)==0){l=l+(d<<2)|0;c[l>>2]=b;i=f;return}ge(g)|0;l=c[e>>2]|0;l=l+(d<<2)|0;c[l>>2]=b;i=f;return}function $j(a){a=a|0;var b=0;b=i;ak(a);Ym(a);i=b;return}function ak(b){b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0;e=i;c[b>>2]=5920;d=b+12|0;g=c[d>>2]|0;f=b+8|0;j=c[f>>2]|0;if((g|0)!=(j|0)){h=0;do{k=c[j+(h<<2)>>2]|0;if((k|0)!=0){ge(k)|0;g=c[d>>2]|0;j=c[f>>2]|0}h=h+1|0}while(h>>>0<g-j>>2>>>0)}Fe(b+144|0);f=c[f>>2]|0;if((f|0)==0){i=e;return}g=c[d>>2]|0;if((g|0)!=(f|0)){c[d>>2]=g+(~((g+ -4+(0-f)|0)>>>2)<<2)}if((b+24|0)==(f|0)){a[b+136|0]=0;i=e;return}else{Ym(f);i=e;return}}function bk(){var b=0,d=0;b=i;if((a[5976]|0)!=0){d=c[1492]|0;i=b;return d|0}if((Ha(5976)|0)==0){d=c[1492]|0;i=b;return d|0}if((a[5952]|0)==0?(Ha(5952)|0)!=0:0){Zj(10344,1);c[1484]=10344;c[1486]=5936;db(5952)}d=c[c[1486]>>2]|0;c[1490]=d;fe(d);c[1492]=5960;db(5976);d=c[1492]|0;i=b;return d|0}function ck(a){a=a|0;var b=0,d=0;b=i;d=c[(bk()|0)>>2]|0;c[a>>2]=d;fe(d);i=b;return}function dk(a,b){a=a|0;b=b|0;var d=0;d=i;b=c[b>>2]|0;c[a>>2]=b;fe(b);i=d;return}function ek(a){a=a|0;var b=0;b=i;ge(c[a>>2]|0)|0;i=b;return}function fk(a,b){a=a|0;b=b|0;var d=0,e=0;d=i;i=i+16|0;e=d;a=c[a>>2]|0;if(!((c[b>>2]|0)==-1)){c[e>>2]=b;c[e+4>>2]=117;c[e+8>>2]=0;Ae(b,e,118)}e=(c[b+4>>2]|0)+ -1|0;b=c[a+8>>2]|0;if(!((c[a+12>>2]|0)-b>>2>>>0>e>>>0)){e=xb(4)|0;wm(e);ec(e|0,13960,106)}a=c[b+(e<<2)>>2]|0;if((a|0)==0){e=xb(4)|0;wm(e);ec(e|0,13960,106)}else{i=d;return a|0}return 0}function gk(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function hk(a){a=a|0;var b=0;b=i;if((a|0)==0){i=b;return}pc[c[(c[a>>2]|0)+4>>2]&255](a);i=b;return}function ik(a){a=a|0;var b=0;b=c[1496]|0;c[1496]=b+1;c[a+4>>2]=b+1;return}function jk(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function kk(a,d,e){a=a|0;d=d|0;e=e|0;a=i;if(!(e>>>0<128)){d=0;i=a;return d|0}d=(b[(c[(vb()|0)>>2]|0)+(e<<1)>>1]&d)<<16>>16!=0;i=a;return d|0}function lk(a,d,e,f){a=a|0;d=d|0;e=e|0;f=f|0;var g=0;a=i;if((d|0)==(e|0)){g=d;i=a;return g|0}while(1){g=c[d>>2]|0;if(g>>>0<128){g=b[(c[(vb()|0)>>2]|0)+(g<<1)>>1]|0}else{g=0}b[f>>1]=g;d=d+4|0;if((d|0)==(e|0)){break}else{f=f+2|0}}i=a;return e|0}function mk(a,d,e,f){a=a|0;d=d|0;e=e|0;f=f|0;var g=0;a=i;a:do{if((e|0)==(f|0)){f=e}else{do{g=c[e>>2]|0;if(g>>>0<128?!((b[(c[(vb()|0)>>2]|0)+(g<<1)>>1]&d)<<16>>16==0):0){f=e;break a}e=e+4|0}while((e|0)!=(f|0))}}while(0);i=a;return f|0}function nk(a,d,e,f){a=a|0;d=d|0;e=e|0;f=f|0;var g=0,h=0;a=i;a:do{if((e|0)==(f|0)){f=e}else{while(1){g=c[e>>2]|0;if(!(g>>>0<128)){f=e;break a}h=e+4|0;if((b[(c[(vb()|0)>>2]|0)+(g<<1)>>1]&d)<<16>>16==0){f=e;break a}if((h|0)==(f|0)){break}else{e=h}}}}while(0);i=a;return f|0}function ok(a,b){a=a|0;b=b|0;a=i;if(!(b>>>0<128)){i=a;return b|0}b=c[(c[(Ka()|0)>>2]|0)+(b<<2)>>2]|0;i=a;return b|0}function pk(a,b,d){a=a|0;b=b|0;d=d|0;var e=0;a=i;if((b|0)==(d|0)){e=b;i=a;return e|0}do{e=c[b>>2]|0;if(e>>>0<128){e=c[(c[(Ka()|0)>>2]|0)+(e<<2)>>2]|0}c[b>>2]=e;b=b+4|0}while((b|0)!=(d|0));i=a;return d|0}function qk(a,b){a=a|0;b=b|0;a=i;if(!(b>>>0<128)){i=a;return b|0}b=c[(c[(_b()|0)>>2]|0)+(b<<2)>>2]|0;i=a;return b|0}function rk(a,b,d){a=a|0;b=b|0;d=d|0;var e=0;a=i;if((b|0)==(d|0)){e=b;i=a;return e|0}do{e=c[b>>2]|0;if(e>>>0<128){e=c[(c[(_b()|0)>>2]|0)+(e<<2)>>2]|0}c[b>>2]=e;b=b+4|0}while((b|0)!=(d|0));i=a;return d|0}function sk(a,b){a=a|0;b=b|0;return b<<24>>24|0}function tk(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;b=i;if((d|0)==(e|0)){i=b;return d|0}while(1){c[f>>2]=a[d]|0;d=d+1|0;if((d|0)==(e|0)){break}else{f=f+4|0}}i=b;return e|0}function uk(a,b,c){a=a|0;b=b|0;c=c|0;return(b>>>0<128?b&255:c)|0}function vk(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0;b=i;if((d|0)==(e|0)){k=d;i=b;return k|0}h=((e+ -4+(0-d)|0)>>>2)+1|0;j=d;while(1){k=c[j>>2]|0;a[g]=k>>>0<128?k&255:f;j=j+4|0;if((j|0)==(e|0)){break}else{g=g+1|0}}k=d+(h<<2)|0;i=b;return k|0}function wk(b){b=b|0;var d=0,e=0;d=i;c[b>>2]=6016;e=c[b+8>>2]|0;if((e|0)!=0?(a[b+12|0]|0)!=0:0){Zm(e)}Ym(b);i=d;return}function xk(b){b=b|0;var d=0,e=0;d=i;c[b>>2]=6016;e=c[b+8>>2]|0;if((e|0)!=0?(a[b+12|0]|0)!=0:0){Zm(e)}i=d;return}function yk(a,b){a=a|0;b=b|0;a=i;if(!(b<<24>>24>-1)){i=a;return b|0}b=c[(c[(Ka()|0)>>2]|0)+((b&255)<<2)>>2]&255;i=a;return b|0}function zk(b,d,e){b=b|0;d=d|0;e=e|0;var f=0;b=i;if((d|0)==(e|0)){f=d;i=b;return f|0}do{f=a[d]|0;if(f<<24>>24>-1){f=c[(c[(Ka()|0)>>2]|0)+(f<<24>>24<<2)>>2]&255}a[d]=f;d=d+1|0}while((d|0)!=(e|0));i=b;return e|0}function Ak(a,b){a=a|0;b=b|0;a=i;if(!(b<<24>>24>-1)){i=a;return b|0}b=c[(c[(_b()|0)>>2]|0)+(b<<24>>24<<2)>>2]&255;i=a;return b|0}function Bk(b,d,e){b=b|0;d=d|0;e=e|0;var f=0;b=i;if((d|0)==(e|0)){f=d;i=b;return f|0}do{f=a[d]|0;if(f<<24>>24>-1){f=c[(c[(_b()|0)>>2]|0)+(f<<24>>24<<2)>>2]&255}a[d]=f;d=d+1|0}while((d|0)!=(e|0));i=b;return e|0}function Ck(a,b){a=a|0;b=b|0;return b|0}function Dk(b,c,d,e){b=b|0;c=c|0;d=d|0;e=e|0;b=i;if((c|0)==(d|0)){d=c}else{while(1){a[e]=a[c]|0;c=c+1|0;if((c|0)==(d|0)){break}else{e=e+1|0}}}i=b;return d|0}function Ek(a,b,c){a=a|0;b=b|0;c=c|0;return(b<<24>>24>-1?b:c)|0}function Fk(b,c,d,e,f){b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;var g=0;b=i;if((c|0)==(d|0)){g=c;i=b;return g|0}while(1){g=a[c]|0;a[f]=g<<24>>24>-1?g:e;c=c+1|0;if((c|0)==(d|0)){break}else{f=f+1|0}}i=b;return d|0}function Gk(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function Hk(a,b,d,e,f,g,h,i){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;c[f>>2]=d;c[i>>2]=g;return 3}function Ik(a,b,d,e,f,g,h,i){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;c[f>>2]=d;c[i>>2]=g;return 3}function Jk(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;c[f>>2]=d;return 3}function Kk(a){a=a|0;return 1}function Lk(a){a=a|0;return 1}function Mk(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;c=d-c|0;return(c>>>0<e>>>0?c:e)|0}function Nk(a){a=a|0;return 1}function Ok(a){a=a|0;var b=0;b=i;Xj(a);Ym(a);i=b;return}function Pk(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0;l=i;i=i+16|0;m=l;n=l+8|0;o=(e|0)==(f|0);a:do{if(!o){p=e;while(1){q=p+4|0;if((c[p>>2]|0)==0){break}if((q|0)==(f|0)){p=f;break}else{p=q}}c[k>>2]=h;c[g>>2]=e;if(!(o|(h|0)==(j|0))){o=j;b=b+8|0;while(1){s=d;q=c[s+4>>2]|0;r=m;c[r>>2]=c[s>>2];c[r+4>>2]=q;r=Bb(c[b>>2]|0)|0;q=pm(h,g,p-e>>2,o-h|0,d)|0;if((r|0)!=0){Bb(r|0)|0}if((q|0)==-1){d=10;break}else if((q|0)==0){g=1;d=33;break}h=(c[k>>2]|0)+q|0;c[k>>2]=h;if((h|0)==(j|0)){d=31;break}if((p|0)==(f|0)){e=c[g>>2]|0;p=f}else{e=Bb(c[b>>2]|0)|0;h=om(n,0,d)|0;if((e|0)!=0){Bb(e|0)|0}if((h|0)==-1){g=2;d=33;break}e=c[k>>2]|0;if(h>>>0>(o-e|0)>>>0){g=1;d=33;break}b:do{if((h|0)!=0){p=n;while(1){s=a[p]|0;c[k>>2]=e+1;a[e]=s;h=h+ -1|0;if((h|0)==0){break b}e=c[k>>2]|0;p=p+1|0}}}while(0);e=(c[g>>2]|0)+4|0;c[g>>2]=e;c:do{if((e|0)==(f|0)){p=f}else{p=e;while(1){h=p+4|0;if((c[p>>2]|0)==0){break c}if((h|0)==(f|0)){p=f;break}else{p=h}}}}while(0);h=c[k>>2]|0}if((e|0)==(f|0)|(h|0)==(j|0)){break a}}if((d|0)==10){c[k>>2]=h;d:do{if((e|0)!=(c[g>>2]|0)){do{d=c[e>>2]|0;f=Bb(c[b>>2]|0)|0;d=om(h,d,m)|0;if((f|0)!=0){Bb(f|0)|0}if((d|0)==-1){break d}h=(c[k>>2]|0)+d|0;c[k>>2]=h;e=e+4|0}while((e|0)!=(c[g>>2]|0))}}while(0);c[g>>2]=e;s=2;i=l;return s|0}else if((d|0)==31){e=c[g>>2]|0;break}else if((d|0)==33){i=l;return g|0}}}else{c[k>>2]=h;c[g>>2]=e}}while(0);s=(e|0)!=(f|0)|0;i=l;return s|0}function Qk(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0;l=i;i=i+16|0;m=l;n=(e|0)==(f|0);a:do{if(!n){p=e;while(1){o=p+1|0;if((a[p]|0)==0){break}if((o|0)==(f|0)){p=f;break}else{p=o}}c[k>>2]=h;c[g>>2]=e;if(!(n|(h|0)==(j|0))){n=j;b=b+8|0;while(1){q=d;r=c[q+4>>2]|0;o=m;c[o>>2]=c[q>>2];c[o+4>>2]=r;o=p;r=Bb(c[b>>2]|0)|0;q=lm(h,g,o-e|0,n-h>>2,d)|0;if((r|0)!=0){Bb(r|0)|0}if((q|0)==0){f=2;d=32;break}else if((q|0)==-1){d=10;break}h=(c[k>>2]|0)+(q<<2)|0;c[k>>2]=h;if((h|0)==(j|0)){d=30;break}e=c[g>>2]|0;if((p|0)==(f|0)){p=f}else{o=Bb(c[b>>2]|0)|0;e=km(h,e,1,d)|0;if((o|0)!=0){Bb(o|0)|0}if((e|0)!=0){f=2;d=32;break}c[k>>2]=(c[k>>2]|0)+4;e=(c[g>>2]|0)+1|0;c[g>>2]=e;b:do{if((e|0)==(f|0)){p=f}else{p=e;while(1){o=p+1|0;if((a[p]|0)==0){break b}if((o|0)==(f|0)){p=f;break}else{p=o}}}}while(0);h=c[k>>2]|0}if((e|0)==(f|0)|(h|0)==(j|0)){break a}}if((d|0)==10){c[k>>2]=h;c:do{if((e|0)!=(c[g>>2]|0)){while(1){d=Bb(c[b>>2]|0)|0;j=km(h,e,o-e|0,m)|0;if((d|0)!=0){Bb(d|0)|0}if((j|0)==0){e=e+1|0}else if((j|0)==-2){d=16;break}else if((j|0)==-1){d=15;break}else{e=e+j|0}h=(c[k>>2]|0)+4|0;c[k>>2]=h;if((e|0)==(c[g>>2]|0)){break c}}if((d|0)==15){c[g>>2]=e;r=2;i=l;return r|0}else if((d|0)==16){c[g>>2]=e;r=1;i=l;return r|0}}}while(0);c[g>>2]=e;r=(e|0)!=(f|0)|0;i=l;return r|0}else if((d|0)==30){e=c[g>>2]|0;break}else if((d|0)==32){i=l;return f|0}}}else{c[k>>2]=h;c[g>>2]=e}}while(0);r=(e|0)!=(f|0)|0;i=l;return r|0}function Rk(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0;h=i;i=i+16|0;j=h;c[g>>2]=e;b=Bb(c[b+8>>2]|0)|0;d=om(j,0,d)|0;if((b|0)!=0){Bb(b|0)|0}if((d|0)==0|(d|0)==-1){e=2;i=h;return e|0}d=d+ -1|0;b=c[g>>2]|0;if(d>>>0>(f-b|0)>>>0){e=1;i=h;return e|0}if((d|0)==0){e=0;i=h;return e|0}else{f=b}while(1){e=a[j]|0;c[g>>2]=f+1;a[f]=e;d=d+ -1|0;if((d|0)==0){g=0;break}f=c[g>>2]|0;j=j+1|0}i=h;return g|0}function Sk(a){a=a|0;var b=0,d=0,e=0;b=i;a=a+8|0;e=Bb(c[a>>2]|0)|0;d=nm(0,0,4)|0;if((e|0)!=0){Bb(e|0)|0}if((d|0)==0){a=c[a>>2]|0;if((a|0)!=0){a=Bb(a|0)|0;if((a|0)==0){a=0}else{Bb(a|0)|0;a=0}}else{a=1}}else{a=-1}i=b;return a|0}function Tk(a){a=a|0;return 0}function Uk(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0;g=i;if((f|0)==0|(d|0)==(e|0)){m=0;i=g;return m|0}h=e;a=a+8|0;k=0;j=0;while(1){m=Bb(c[a>>2]|0)|0;l=jm(d,h-d|0,b)|0;if((m|0)!=0){Bb(m|0)|0}if((l|0)==0){d=d+1|0;l=1}else if((l|0)==-2|(l|0)==-1){f=9;break}else{d=d+l|0}k=l+k|0;j=j+1|0;if(j>>>0>=f>>>0|(d|0)==(e|0)){f=9;break}}if((f|0)==9){i=g;return k|0}return 0}function Vk(a){a=a|0;var b=0;b=i;a=c[a+8>>2]|0;if((a|0)!=0){a=Bb(a|0)|0;if((a|0)==0){a=4}else{Bb(a|0)|0;a=4}}else{a=1}i=b;return a|0}function Wk(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function Xk(a,b,d,e,f,g,h,j){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0;a=i;i=i+16|0;l=a+4|0;k=a;c[l>>2]=d;c[k>>2]=g;b=Yk(d,e,l,g,h,k,1114111,0)|0;c[f>>2]=d+((c[l>>2]|0)-d>>1<<1);c[j>>2]=g+((c[k>>2]|0)-g);i=a;return b|0}function Yk(d,f,g,h,j,k,l,m){d=d|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0;n=i;c[g>>2]=d;c[k>>2]=h;do{if((m&2|0)!=0){if((j-h|0)<3){p=1;i=n;return p|0}else{c[k>>2]=h+1;a[h]=-17;p=c[k>>2]|0;c[k>>2]=p+1;a[p]=-69;p=c[k>>2]|0;c[k>>2]=p+1;a[p]=-65;break}}}while(0);h=f;o=c[g>>2]|0;if(!(o>>>0<f>>>0)){p=0;i=n;return p|0}a:while(1){d=b[o>>1]|0;m=d&65535;if(m>>>0>l>>>0){l=2;f=26;break}do{if((d&65535)<128){m=c[k>>2]|0;if((j-m|0)<1){l=1;f=26;break a}c[k>>2]=m+1;a[m]=d}else{if((d&65535)<2048){d=c[k>>2]|0;if((j-d|0)<2){l=1;f=26;break a}c[k>>2]=d+1;a[d]=m>>>6|192;p=c[k>>2]|0;c[k>>2]=p+1;a[p]=m&63|128;break}if((d&65535)<55296){d=c[k>>2]|0;if((j-d|0)<3){l=1;f=26;break a}c[k>>2]=d+1;a[d]=m>>>12|224;p=c[k>>2]|0;c[k>>2]=p+1;a[p]=m>>>6&63|128;p=c[k>>2]|0;c[k>>2]=p+1;a[p]=m&63|128;break}if(!((d&65535)<56320)){if((d&65535)<57344){l=2;f=26;break a}d=c[k>>2]|0;if((j-d|0)<3){l=1;f=26;break a}c[k>>2]=d+1;a[d]=m>>>12|224;p=c[k>>2]|0;c[k>>2]=p+1;a[p]=m>>>6&63|128;p=c[k>>2]|0;c[k>>2]=p+1;a[p]=m&63|128;break}if((h-o|0)<4){l=1;f=26;break a}p=o+2|0;d=e[p>>1]|0;if((d&64512|0)!=56320){l=2;f=26;break a}if((j-(c[k>>2]|0)|0)<4){l=1;f=26;break a}o=m&960;if(((o<<10)+65536|m<<10&64512|d&1023)>>>0>l>>>0){l=2;f=26;break a}c[g>>2]=p;o=(o>>>6)+1|0;p=c[k>>2]|0;c[k>>2]=p+1;a[p]=o>>>2|240;p=c[k>>2]|0;c[k>>2]=p+1;a[p]=m>>>2&15|o<<4&48|128;p=c[k>>2]|0;c[k>>2]=p+1;a[p]=m<<4&48|d>>>6&15|128;p=c[k>>2]|0;c[k>>2]=p+1;a[p]=d&63|128}}while(0);o=(c[g>>2]|0)+2|0;c[g>>2]=o;if(!(o>>>0<f>>>0)){l=0;f=26;break}}if((f|0)==26){i=n;return l|0}return 0}function Zk(a,b,d,e,f,g,h,j){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0;a=i;i=i+16|0;l=a+4|0;k=a;c[l>>2]=d;c[k>>2]=g;b=_k(d,e,l,g,h,k,1114111,0)|0;c[f>>2]=d+((c[l>>2]|0)-d);c[j>>2]=g+((c[k>>2]|0)-g>>1<<1);i=a;return b|0}function _k(e,f,g,h,j,k,l,m){e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0;n=i;c[g>>2]=e;c[k>>2]=h;p=c[g>>2]|0;if(((((m&4|0)!=0?(f-p|0)>2:0)?(a[p]|0)==-17:0)?(a[p+1|0]|0)==-69:0)?(a[p+2|0]|0)==-65:0){p=p+3|0;c[g>>2]=p}a:do{if(p>>>0<f>>>0){h=f;m=j;e=c[k>>2]|0;b:while(1){if(!(e>>>0<j>>>0)){break a}q=a[p]|0;o=q&255;if(o>>>0>l>>>0){f=2;l=41;break}do{if(q<<24>>24>-1){b[e>>1]=q&255;c[g>>2]=p+1}else{if((q&255)<194){f=2;l=41;break b}if((q&255)<224){if((h-p|0)<2){f=1;l=41;break b}q=d[p+1|0]|0;if((q&192|0)!=128){f=2;l=41;break b}o=q&63|o<<6&1984;if(o>>>0>l>>>0){f=2;l=41;break b}b[e>>1]=o;c[g>>2]=p+2;break}if((q&255)<240){if((h-p|0)<3){f=1;l=41;break b}q=a[p+1|0]|0;r=a[p+2|0]|0;if((o|0)==237){if(!((q&-32)<<24>>24==-128)){f=2;l=41;break b}}else if((o|0)==224){if(!((q&-32)<<24>>24==-96)){f=2;l=41;break b}}else{if(!((q&-64)<<24>>24==-128)){f=2;l=41;break b}}r=r&255;if((r&192|0)!=128){f=2;l=41;break b}o=(q&255)<<6&4032|o<<12|r&63;if((o&65535)>>>0>l>>>0){f=2;l=41;break b}b[e>>1]=o;c[g>>2]=p+3;break}if(!((q&255)<245)){f=2;l=41;break b}if((h-p|0)<4){f=1;l=41;break b}q=a[p+1|0]|0;r=a[p+2|0]|0;s=a[p+3|0]|0;if((o|0)==240){if(!((q+112<<24>>24&255)<48)){f=2;l=41;break b}}else if((o|0)==244){if(!((q&-16)<<24>>24==-128)){f=2;l=41;break b}}else{if(!((q&-64)<<24>>24==-128)){f=2;l=41;break b}}p=r&255;if((p&192|0)!=128){f=2;l=41;break b}r=s&255;if((r&192|0)!=128){f=2;l=41;break b}if((m-e|0)<4){f=1;l=41;break b}o=o&7;s=q&255;q=p<<6;r=r&63;if((s<<12&258048|o<<18|q&4032|r)>>>0>l>>>0){f=2;l=41;break b}b[e>>1]=s<<2&60|p>>>4&3|((s>>>4&3|o<<2)<<6)+16320|55296;s=e+2|0;c[k>>2]=s;b[s>>1]=r|q&960|56320;c[g>>2]=(c[g>>2]|0)+4}}while(0);e=(c[k>>2]|0)+2|0;c[k>>2]=e;p=c[g>>2]|0;if(!(p>>>0<f>>>0)){break a}}if((l|0)==41){i=n;return f|0}}}while(0);s=p>>>0<f>>>0|0;i=n;return s|0}function $k(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;c[f>>2]=d;return 3}function al(a){a=a|0;return 0}function bl(a){a=a|0;return 0}function cl(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;a=i;b=dl(c,d,e,1114111,0)|0;i=a;return b|0}function dl(b,c,e,f,g){b=b|0;c=c|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0;h=i;if((((g&4|0)!=0?(c-b|0)>2:0)?(a[b]|0)==-17:0)?(a[b+1|0]|0)==-69:0){k=(a[b+2|0]|0)==-65?b+3|0:b}else{k=b}a:do{if(k>>>0<c>>>0&(e|0)!=0){g=c;j=0;b:while(1){m=a[k]|0;l=m&255;if(l>>>0>f>>>0){break a}do{if(m<<24>>24>-1){k=k+1|0}else{if((m&255)<194){break a}if((m&255)<224){if((g-k|0)<2){break a}m=d[k+1|0]|0;if((m&192|0)!=128){break a}if((m&63|l<<6&1984)>>>0>f>>>0){break a}k=k+2|0;break}if((m&255)<240){n=k;if((g-n|0)<3){break a}m=a[k+1|0]|0;o=a[k+2|0]|0;if((l|0)==224){if(!((m&-32)<<24>>24==-96)){c=21;break b}}else if((l|0)==237){if(!((m&-32)<<24>>24==-128)){c=23;break b}}else{if(!((m&-64)<<24>>24==-128)){c=25;break b}}n=o&255;if((n&192|0)!=128){break a}if(((m&255)<<6&4032|l<<12&61440|n&63)>>>0>f>>>0){break a}k=k+3|0;break}if(!((m&255)<245)){break a}o=k;if((g-o|0)<4){break a}if((e-j|0)>>>0<2){break a}m=a[k+1|0]|0;p=a[k+2|0]|0;n=a[k+3|0]|0;if((l|0)==240){if(!((m+112<<24>>24&255)<48)){c=34;break b}}else if((l|0)==244){if(!((m&-16)<<24>>24==-128)){c=36;break b}}else{if(!((m&-64)<<24>>24==-128)){c=38;break b}}o=p&255;if((o&192|0)!=128){break a}n=n&255;if((n&192|0)!=128){break a}if(((m&255)<<12&258048|l<<18&1835008|o<<6&4032|n&63)>>>0>f>>>0){break a}k=k+4|0;j=j+1|0}}while(0);j=j+1|0;if(!(k>>>0<c>>>0&j>>>0<e>>>0)){break a}}if((c|0)==21){p=n-b|0;i=h;return p|0}else if((c|0)==23){p=n-b|0;i=h;return p|0}else if((c|0)==25){p=n-b|0;i=h;return p|0}else if((c|0)==34){p=o-b|0;i=h;return p|0}else if((c|0)==36){p=o-b|0;i=h;return p|0}else if((c|0)==38){p=o-b|0;i=h;return p|0}}}while(0);p=k-b|0;i=h;return p|0}function el(a){a=a|0;return 4}function fl(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function gl(a,b,d,e,f,g,h,j){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0;a=i;i=i+16|0;l=a+4|0;k=a;c[l>>2]=d;c[k>>2]=g;b=hl(d,e,l,g,h,k,1114111,0)|0;c[f>>2]=d+((c[l>>2]|0)-d>>2<<2);c[j>>2]=g+((c[k>>2]|0)-g);i=a;return b|0}function hl(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0;l=i;c[e>>2]=b;c[h>>2]=f;do{if((k&2|0)!=0){if((g-f|0)<3){b=1;i=l;return b|0}else{c[h>>2]=f+1;a[f]=-17;b=c[h>>2]|0;c[h>>2]=b+1;a[b]=-69;b=c[h>>2]|0;c[h>>2]=b+1;a[b]=-65;break}}}while(0);f=c[e>>2]|0;if(!(f>>>0<d>>>0)){b=0;i=l;return b|0}a:while(1){f=c[f>>2]|0;if((f&-2048|0)==55296|f>>>0>j>>>0){j=2;e=19;break}do{if(!(f>>>0<128)){if(f>>>0<2048){k=c[h>>2]|0;if((g-k|0)<2){j=1;e=19;break a}c[h>>2]=k+1;a[k]=f>>>6|192;b=c[h>>2]|0;c[h>>2]=b+1;a[b]=f&63|128;break}k=c[h>>2]|0;b=g-k|0;if(f>>>0<65536){if((b|0)<3){j=1;e=19;break a}c[h>>2]=k+1;a[k]=f>>>12|224;b=c[h>>2]|0;c[h>>2]=b+1;a[b]=f>>>6&63|128;b=c[h>>2]|0;c[h>>2]=b+1;a[b]=f&63|128;break}else{if((b|0)<4){j=1;e=19;break a}c[h>>2]=k+1;a[k]=f>>>18|240;b=c[h>>2]|0;c[h>>2]=b+1;a[b]=f>>>12&63|128;b=c[h>>2]|0;c[h>>2]=b+1;a[b]=f>>>6&63|128;b=c[h>>2]|0;c[h>>2]=b+1;a[b]=f&63|128;break}}else{k=c[h>>2]|0;if((g-k|0)<1){j=1;e=19;break a}c[h>>2]=k+1;a[k]=f}}while(0);f=(c[e>>2]|0)+4|0;c[e>>2]=f;if(!(f>>>0<d>>>0)){j=0;e=19;break}}if((e|0)==19){i=l;return j|0}return 0}function il(a,b,d,e,f,g,h,j){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0;a=i;i=i+16|0;l=a+4|0;k=a;c[l>>2]=d;c[k>>2]=g;b=jl(d,e,l,g,h,k,1114111,0)|0;c[f>>2]=d+((c[l>>2]|0)-d);c[j>>2]=g+((c[k>>2]|0)-g>>2<<2);i=a;return b|0}function jl(b,e,f,g,h,j,k,l){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0;n=i;c[f>>2]=b;c[j>>2]=g;g=c[f>>2]|0;if(((((l&4|0)!=0?(e-g|0)>2:0)?(a[g]|0)==-17:0)?(a[g+1|0]|0)==-69:0)?(a[g+2|0]|0)==-65:0){g=g+3|0;c[f>>2]=g}a:do{if(g>>>0<e>>>0){l=e;b=c[j>>2]|0;while(1){if(!(b>>>0<h>>>0)){m=39;break a}p=a[g]|0;o=p&255;do{if(p<<24>>24>-1){if(o>>>0>k>>>0){e=2;break a}c[b>>2]=o;c[f>>2]=g+1}else{if((p&255)<194){e=2;break a}if((p&255)<224){if((l-g|0)<2){e=1;break a}p=d[g+1|0]|0;if((p&192|0)!=128){e=2;break a}o=p&63|o<<6&1984;if(o>>>0>k>>>0){e=2;break a}c[b>>2]=o;c[f>>2]=g+2;break}if((p&255)<240){if((l-g|0)<3){e=1;break a}p=a[g+1|0]|0;q=a[g+2|0]|0;if((o|0)==237){if(!((p&-32)<<24>>24==-128)){e=2;break a}}else if((o|0)==224){if(!((p&-32)<<24>>24==-96)){e=2;break a}}else{if(!((p&-64)<<24>>24==-128)){e=2;break a}}q=q&255;if((q&192|0)!=128){e=2;break a}o=(p&255)<<6&4032|o<<12&61440|q&63;if(o>>>0>k>>>0){e=2;break a}c[b>>2]=o;c[f>>2]=g+3;break}if(!((p&255)<245)){e=2;break a}if((l-g|0)<4){e=1;break a}p=a[g+1|0]|0;r=a[g+2|0]|0;q=a[g+3|0]|0;if((o|0)==244){if(!((p&-16)<<24>>24==-128)){e=2;break a}}else if((o|0)==240){if(!((p+112<<24>>24&255)<48)){e=2;break a}}else{if(!((p&-64)<<24>>24==-128)){e=2;break a}}r=r&255;if((r&192|0)!=128){e=2;break a}q=q&255;if((q&192|0)!=128){e=2;break a}o=(p&255)<<12&258048|o<<18&1835008|r<<6&4032|q&63;if(o>>>0>k>>>0){e=2;break a}c[b>>2]=o;c[f>>2]=g+4}}while(0);b=(c[j>>2]|0)+4|0;c[j>>2]=b;g=c[f>>2]|0;if(!(g>>>0<e>>>0)){m=39;break}}}else{m=39}}while(0);if((m|0)==39){e=g>>>0<e>>>0|0}i=n;return e|0}function kl(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;c[f>>2]=d;return 3}function ll(a){a=a|0;return 0}function ml(a){a=a|0;return 0}function nl(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;a=i;b=ol(c,d,e,1114111,0)|0;i=a;return b|0}function ol(b,c,e,f,g){b=b|0;c=c|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0;h=i;if((((g&4|0)!=0?(c-b|0)>2:0)?(a[b]|0)==-17:0)?(a[b+1|0]|0)==-69:0){k=(a[b+2|0]|0)==-65?b+3|0:b}else{k=b}a:do{if(k>>>0<c>>>0&(e|0)!=0){g=c;j=1;b:while(1){m=a[k]|0;l=m&255;do{if(m<<24>>24>-1){if(l>>>0>f>>>0){break a}k=k+1|0}else{if((m&255)<194){break a}if((m&255)<224){if((g-k|0)<2){break a}m=d[k+1|0]|0;if((m&192|0)!=128){break a}if((m&63|l<<6&1984)>>>0>f>>>0){break a}k=k+2|0;break}if((m&255)<240){m=k;if((g-m|0)<3){break a}n=a[k+1|0]|0;o=a[k+2|0]|0;if((l|0)==224){if(!((n&-32)<<24>>24==-96)){c=21;break b}}else if((l|0)==237){if(!((n&-32)<<24>>24==-128)){c=23;break b}}else{if(!((n&-64)<<24>>24==-128)){c=25;break b}}m=o&255;if((m&192|0)!=128){break a}if(((n&255)<<6&4032|l<<12&61440|m&63)>>>0>f>>>0){break a}k=k+3|0;break}if(!((m&255)<245)){break a}o=k;if((g-o|0)<4){break a}m=a[k+1|0]|0;p=a[k+2|0]|0;n=a[k+3|0]|0;if((l|0)==240){if(!((m+112<<24>>24&255)<48)){c=33;break b}}else if((l|0)==244){if(!((m&-16)<<24>>24==-128)){c=35;break b}}else{if(!((m&-64)<<24>>24==-128)){c=37;break b}}o=p&255;if((o&192|0)!=128){break a}n=n&255;if((n&192|0)!=128){break a}if(((m&255)<<12&258048|l<<18&1835008|o<<6&4032|n&63)>>>0>f>>>0){break a}k=k+4|0}}while(0);if(!(k>>>0<c>>>0&j>>>0<e>>>0)){break a}j=j+1|0}if((c|0)==21){p=m-b|0;i=h;return p|0}else if((c|0)==23){p=m-b|0;i=h;return p|0}else if((c|0)==25){p=m-b|0;i=h;return p|0}else if((c|0)==33){p=o-b|0;i=h;return p|0}else if((c|0)==35){p=o-b|0;i=h;return p|0}else if((c|0)==37){p=o-b|0;i=h;return p|0}}}while(0);p=k-b|0;i=h;return p|0}function pl(a){a=a|0;return 4}function ql(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function rl(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function sl(a){a=a|0;var b=0;b=i;c[a>>2]=6168;Fe(a+12|0);Ym(a);i=b;return}function tl(a){a=a|0;var b=0;b=i;c[a>>2]=6168;Fe(a+12|0);i=b;return}function ul(a){a=a|0;var b=0;b=i;c[a>>2]=6208;Fe(a+16|0);Ym(a);i=b;return}function vl(a){a=a|0;var b=0;b=i;c[a>>2]=6208;Fe(a+16|0);i=b;return}function wl(b){b=b|0;return a[b+8|0]|0}function xl(a){a=a|0;return c[a+8>>2]|0}function yl(b){b=b|0;return a[b+9|0]|0}function zl(a){a=a|0;return c[a+12>>2]|0}function Al(a,b){a=a|0;b=b|0;var c=0;c=i;Ce(a,b+12|0);i=c;return}function Bl(a,b){a=a|0;b=b|0;var c=0;c=i;Ce(a,b+16|0);i=c;return}function Cl(a,b){a=a|0;b=b|0;b=i;De(a,6240,4);i=b;return}function Dl(a,b){a=a|0;b=b|0;b=i;Oe(a,6248,rm(6248)|0);i=b;return}function El(a,b){a=a|0;b=b|0;b=i;De(a,6272,5);i=b;return}function Fl(a,b){a=a|0;b=b|0;b=i;Oe(a,6280,rm(6280)|0);i=b;return}function Gl(b){b=b|0;var d=0;b=i;if((a[6312]|0)!=0){d=c[1576]|0;i=b;return d|0}if((Ha(6312)|0)==0){d=c[1576]|0;i=b;return d|0}if((a[13512]|0)==0?(Ha(13512)|0)!=0:0){rn(13344,0,168)|0;ic(121,0,p|0)|0;db(13512)}Ge(13344,13520)|0;Ge(13356|0,13528)|0;Ge(13368|0,13536)|0;Ge(13380|0,13544)|0;Ge(13392|0,13560)|0;Ge(13404|0,13576)|0;Ge(13416|0,13584)|0;Ge(13428|0,13600)|0;Ge(13440|0,13608)|0;Ge(13452|0,13616)|0;Ge(13464|0,13624)|0;Ge(13476|0,13632)|0;Ge(13488|0,13640)|0;Ge(13500|0,13648)|0;c[1576]=13344;db(6312);d=c[1576]|0;i=b;return d|0}function Hl(b){b=b|0;var d=0;b=i;if((a[6328]|0)!=0){d=c[1580]|0;i=b;return d|0}if((Ha(6328)|0)==0){d=c[1580]|0;i=b;return d|0}if((a[12976]|0)==0?(Ha(12976)|0)!=0:0){rn(12808,0,168)|0;ic(122,0,p|0)|0;db(12976)}Re(12808,12984)|0;Re(12820|0,13016)|0;Re(12832|0,13048)|0;Re(12844|0,13080)|0;Re(12856|0,13120)|0;Re(12868|0,13160)|0;Re(12880|0,13192)|0;Re(12892|0,13232)|0;Re(12904|0,13248)|0;Re(12916|0,13264)|0;Re(12928|0,13280)|0;Re(12940|0,13296)|0;Re(12952|0,13312)|0;Re(12964|0,13328)|0;c[1580]=12808;db(6328);d=c[1580]|0;i=b;return d|0}function Il(b){b=b|0;var d=0;b=i;if((a[6344]|0)!=0){d=c[1584]|0;i=b;return d|0}if((Ha(6344)|0)==0){d=c[1584]|0;i=b;return d|0}if((a[12584]|0)==0?(Ha(12584)|0)!=0:0){rn(12296,0,288)|0;ic(123,0,p|0)|0;db(12584)}Ge(12296,12592)|0;Ge(12308|0,12600)|0;Ge(12320|0,12616)|0;Ge(12332|0,12624)|0;Ge(12344|0,12632)|0;Ge(12356|0,12640)|0;Ge(12368|0,12648)|0;Ge(12380|0,12656)|0;Ge(12392|0,12664)|0;Ge(12404|0,12680)|0;Ge(12416|0,12688)|0;Ge(12428|0,12704)|0;Ge(12440|0,12720)|0;Ge(12452|0,12728)|0;Ge(12464|0,12736)|0;Ge(12476|0,12744)|0;Ge(12488|0,12632)|0;Ge(12500|0,12752)|0;Ge(12512|0,12760)|0;Ge(12524|0,12768)|0;Ge(12536|0,12776)|0;Ge(12548|0,12784)|0;Ge(12560|0,12792)|0;Ge(12572|0,12800)|0;c[1584]=12296;db(6344);d=c[1584]|0;i=b;return d|0}function Jl(b){b=b|0;var d=0;b=i;if((a[6360]|0)!=0){d=c[1588]|0;i=b;return d|0}if((Ha(6360)|0)==0){d=c[1588]|0;i=b;return d|0}if((a[11744]|0)==0?(Ha(11744)|0)!=0:0){rn(11456,0,288)|0;ic(124,0,p|0)|0;db(11744)}Re(11456,11752)|0;Re(11468|0,11784)|0;Re(11480|0,11824)|0;Re(11492|0,11848)|0;Re(11504|0,12168)|0;Re(11516|0,11872)|0;Re(11528|0,11896)|0;Re(11540|0,11920)|0;Re(11552|0,11952)|0;Re(11564|0,11992)|0;Re(11576|0,12024)|0;Re(11588|0,12064)|0;Re(11600|0,12104)|0;Re(11612|0,12120)|0;Re(11624|0,12136)|0;Re(11636|0,12152)|0;Re(11648|0,12168)|0;Re(11660|0,12184)|0;Re(11672|0,12200)|0;Re(11684|0,12216)|0;Re(11696|0,12232)|0;Re(11708|0,12248)|0;Re(11720|0,12264)|0;Re(11732|0,12280)|0;c[1588]=11456;db(6360);d=c[1588]|0;i=b;return d|0}function Kl(b){b=b|0;var d=0;b=i;if((a[6376]|0)!=0){d=c[1592]|0;i=b;return d|0}if((Ha(6376)|0)==0){d=c[1592]|0;i=b;return d|0}if((a[11432]|0)==0?(Ha(11432)|0)!=0:0){rn(11144,0,288)|0;ic(125,0,p|0)|0;db(11432)}Ge(11144,11440)|0;Ge(11156|0,11448)|0;c[1592]=11144;db(6376);d=c[1592]|0;i=b;return d|0}function Ll(b){b=b|0;var d=0;b=i;if((a[6392]|0)!=0){d=c[1596]|0;i=b;return d|0}if((Ha(6392)|0)==0){d=c[1596]|0;i=b;return d|0}if((a[11104]|0)==0?(Ha(11104)|0)!=0:0){rn(10816,0,288)|0;ic(126,0,p|0)|0;db(11104)}Re(10816,11112)|0;Re(10828|0,11128)|0;c[1596]=10816;db(6392);d=c[1596]|0;i=b;return d|0}function Ml(b){b=b|0;b=i;if((a[6416]|0)==0?(Ha(6416)|0)!=0:0){De(6400,6424,8);ic(127,6400,p|0)|0;db(6416)}i=b;return 6400}function Nl(b){b=b|0;b=i;if((a[6456]|0)!=0){i=b;return 6440}if((Ha(6456)|0)==0){i=b;return 6440}Oe(6440,6464,rm(6464)|0);ic(128,6440,p|0)|0;db(6456);i=b;return 6440}function Ol(b){b=b|0;b=i;if((a[6520]|0)==0?(Ha(6520)|0)!=0:0){De(6504,6528,8);ic(127,6504,p|0)|0;db(6520)}i=b;return 6504}function Pl(b){b=b|0;b=i;if((a[6560]|0)!=0){i=b;return 6544}if((Ha(6560)|0)==0){i=b;return 6544}Oe(6544,6568,rm(6568)|0);ic(128,6544,p|0)|0;db(6560);i=b;return 6544}function Ql(b){b=b|0;b=i;if((a[6624]|0)==0?(Ha(6624)|0)!=0:0){De(6608,6632,20);ic(127,6608,p|0)|0;db(6624)}i=b;return 6608}function Rl(b){b=b|0;b=i;if((a[6672]|0)!=0){i=b;return 6656}if((Ha(6672)|0)==0){i=b;return 6656}Oe(6656,6680,rm(6680)|0);ic(128,6656,p|0)|0;db(6672);i=b;return 6656}function Sl(b){b=b|0;b=i;if((a[6784]|0)==0?(Ha(6784)|0)!=0:0){De(6768,6792,11);ic(127,6768,p|0)|0;db(6784)}i=b;return 6768}function Tl(b){b=b|0;b=i;if((a[6824]|0)!=0){i=b;return 6808}if((Ha(6824)|0)==0){i=b;return 6808}Oe(6808,6832,rm(6832)|0);ic(128,6808,p|0)|0;db(6824);i=b;return 6808}function Ul(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0.0;f=i;i=i+16|0;g=f;if((b|0)==(d|0)){c[e>>2]=4;k=0.0;i=f;return+k}j=cc()|0;h=c[j>>2]|0;c[j>>2]=0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}k=+ln(b,g,c[1472]|0);b=c[j>>2]|0;if((b|0)==0){c[j>>2]=h}if((c[g>>2]|0)!=(d|0)){c[e>>2]=4;k=0.0;i=f;return+k}if((b|0)!=34){i=f;return+k}c[e>>2]=4;i=f;return+k}function Vl(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0.0;f=i;i=i+16|0;g=f;if((b|0)==(d|0)){c[e>>2]=4;k=0.0;i=f;return+k}j=cc()|0;h=c[j>>2]|0;c[j>>2]=0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}k=+ln(b,g,c[1472]|0);b=c[j>>2]|0;if((b|0)==0){c[j>>2]=h}if((c[g>>2]|0)!=(d|0)){c[e>>2]=4;k=0.0;i=f;return+k}if((b|0)!=34){i=f;return+k}c[e>>2]=4;i=f;return+k}function Wl(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0.0;f=i;i=i+16|0;g=f;if((b|0)==(d|0)){c[e>>2]=4;k=0.0;i=f;return+k}j=cc()|0;h=c[j>>2]|0;c[j>>2]=0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}k=+ln(b,g,c[1472]|0);b=c[j>>2]|0;if((b|0)==0){c[j>>2]=h}if((c[g>>2]|0)!=(d|0)){c[e>>2]=4;k=0.0;i=f;return+k}if((b|0)==34){c[e>>2]=4}i=f;return+k}function Xl(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0;g=i;i=i+16|0;h=g;do{if((b|0)!=(d|0)){if((a[b]|0)==45){c[e>>2]=4;e=0;b=0;break}k=cc()|0;j=c[k>>2]|0;c[k>>2]=0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}b=ob(b|0,h|0,f|0,c[1472]|0)|0;f=c[k>>2]|0;if((f|0)==0){c[k>>2]=j}if((c[h>>2]|0)!=(d|0)){c[e>>2]=4;e=0;b=0;break}if((f|0)==34){c[e>>2]=4;e=-1;b=-1}else{e=I}}else{c[e>>2]=4;e=0;b=0}}while(0);I=e;i=g;return b|0}function Yl(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0;h=i;i=i+16|0;g=h;if((b|0)==(d|0)){c[e>>2]=4;l=0;i=h;return l|0}if((a[b]|0)==45){c[e>>2]=4;l=0;i=h;return l|0}k=cc()|0;j=c[k>>2]|0;c[k>>2]=0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}f=ob(b|0,g|0,f|0,c[1472]|0)|0;b=I;l=c[k>>2]|0;if((l|0)==0){c[k>>2]=j}if((c[g>>2]|0)!=(d|0)){c[e>>2]=4;l=0;i=h;return l|0}if((l|0)==34|(b>>>0>0|(b|0)==0&f>>>0>4294967295)){c[e>>2]=4;l=-1;i=h;return l|0}else{l=f;i=h;return l|0}return 0}function Zl(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0;h=i;i=i+16|0;g=h;if((b|0)==(d|0)){c[e>>2]=4;l=0;i=h;return l|0}if((a[b]|0)==45){c[e>>2]=4;l=0;i=h;return l|0}k=cc()|0;j=c[k>>2]|0;c[k>>2]=0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}f=ob(b|0,g|0,f|0,c[1472]|0)|0;b=I;l=c[k>>2]|0;if((l|0)==0){c[k>>2]=j}if((c[g>>2]|0)!=(d|0)){c[e>>2]=4;l=0;i=h;return l|0}if((l|0)==34|(b>>>0>0|(b|0)==0&f>>>0>4294967295)){c[e>>2]=4;l=-1;i=h;return l|0}else{l=f;i=h;return l|0}return 0}function _l(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0;h=i;i=i+16|0;g=h;if((b|0)==(d|0)){c[e>>2]=4;l=0;i=h;return l|0}if((a[b]|0)==45){c[e>>2]=4;l=0;i=h;return l|0}k=cc()|0;j=c[k>>2]|0;c[k>>2]=0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}f=ob(b|0,g|0,f|0,c[1472]|0)|0;b=I;l=c[k>>2]|0;if((l|0)==0){c[k>>2]=j}if((c[g>>2]|0)!=(d|0)){c[e>>2]=4;l=0;i=h;return l|0}if((l|0)==34|(b>>>0>0|(b|0)==0&f>>>0>65535)){c[e>>2]=4;l=-1;i=h;return l|0}else{l=f&65535;i=h;return l|0}return 0}function $l(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0;g=i;i=i+16|0;j=g;if((b|0)==(d|0)){c[e>>2]=4;b=0;l=0;I=b;i=g;return l|0}k=cc()|0;h=c[k>>2]|0;c[k>>2]=0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}b=Yb(b|0,j|0,f|0,c[1472]|0)|0;f=I;l=c[k>>2]|0;if((l|0)==0){c[k>>2]=h}if((c[j>>2]|0)!=(d|0)){c[e>>2]=4;b=0;l=0;I=b;i=g;return l|0}if((l|0)==34){c[e>>2]=4;h=(f|0)>0|(f|0)==0&b>>>0>0;I=h?2147483647:-2147483648;i=g;return(h?-1:0)|0}else{l=b;I=f;i=g;return l|0}return 0}function am(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0;h=i;i=i+16|0;g=h;if((b|0)==(d|0)){c[e>>2]=4;l=0;i=h;return l|0}k=cc()|0;j=c[k>>2]|0;c[k>>2]=0;if((a[5896]|0)==0?(Ha(5896)|0)!=0:0){c[1472]=hb(2147483647,5904,0)|0;db(5896)}b=Yb(b|0,g|0,f|0,c[1472]|0)|0;l=I;f=c[k>>2]|0;if((f|0)==0){c[k>>2]=j}if((c[g>>2]|0)!=(d|0)){c[e>>2]=4;l=0;i=h;return l|0}do{if((f|0)==34){c[e>>2]=4;if((l|0)>0|(l|0)==0&b>>>0>0){l=2147483647;i=h;return l|0}}else{if((l|0)<-1|(l|0)==-1&b>>>0<2147483648){c[e>>2]=4;break}if((l|0)>0|(l|0)==0&b>>>0>2147483647){c[e>>2]=4;l=2147483647;i=h;return l|0}else{l=b;i=h;return l|0}}}while(0);l=-2147483648;i=h;return l|0}function bm(a){a=a|0;var b=0,e=0,f=0;b=i;f=a+4|0;e=d[f]|d[f+1|0]<<8|d[f+2|0]<<16|d[f+3|0]<<24;f=f+4|0;f=d[f]|d[f+1|0]<<8|d[f+2|0]<<16|d[f+3|0]<<24;a=(c[a>>2]|0)+(f>>1)|0;if((f&1|0)==0){f=e;pc[f&255](a);i=b;return}else{f=c[(c[a>>2]|0)+e>>2]|0;pc[f&255](a);i=b;return}}function cm(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;f=i;g=b+8|0;e=b+4|0;h=c[e>>2]|0;m=c[g>>2]|0;j=h;if(!(m-j>>2>>>0<d>>>0)){do{if((h|0)==0){g=0}else{c[h>>2]=0;g=c[e>>2]|0}h=g+4|0;c[e>>2]=h;d=d+ -1|0}while((d|0)!=0);i=f;return}h=b+16|0;n=c[b>>2]|0;j=j-n>>2;l=j+d|0;if(l>>>0>1073741823){Yj(0)}m=m-n|0;if(m>>2>>>0<536870911){m=m>>1;l=m>>>0<l>>>0?l:m;if((l|0)!=0){m=b+128|0;if((a[m]|0)==0&l>>>0<29){a[m]=1;m=h}else{m=l;k=11}}else{l=0;m=0}}else{m=1073741823;k=11}if((k|0)==11){l=m;m=Wm(m<<2)|0}k=m+(j<<2)|0;do{if((k|0)==0){k=0}else{c[k>>2]=0}k=k+4|0;d=d+ -1|0}while((d|0)!=0);d=c[b>>2]|0;o=(c[e>>2]|0)-d|0;n=m+(j-(o>>2)<<2)|0;sn(n|0,d|0,o|0)|0;c[b>>2]=n;c[e>>2]=k;c[g>>2]=m+(l<<2);if((d|0)==0){i=f;return}if((h|0)==(d|0)){a[b+128|0]=0;i=f;return}else{Ym(d);i=f;return}}function dm(a){a=a|0;a=i;Qe(11092|0);Qe(11080|0);Qe(11068|0);Qe(11056|0);Qe(11044|0);Qe(11032|0);Qe(11020|0);Qe(11008|0);Qe(10996|0);Qe(10984|0);Qe(10972|0);Qe(10960|0);Qe(10948|0);Qe(10936|0);Qe(10924|0);Qe(10912|0);Qe(10900|0);Qe(10888|0);Qe(10876|0);Qe(10864|0);Qe(10852|0);Qe(10840|0);Qe(10828|0);Qe(10816);i=a;return}function em(a){a=a|0;a=i;Fe(11420|0);Fe(11408|0);Fe(11396|0);Fe(11384|0);Fe(11372|0);Fe(11360|0);Fe(11348|0);Fe(11336|0);Fe(11324|0);Fe(11312|0);Fe(11300|0);Fe(11288|0);Fe(11276|0);Fe(11264|0);Fe(11252|0);Fe(11240|0);Fe(11228|0);Fe(11216|0);Fe(11204|0);Fe(11192|0);Fe(11180|0);Fe(11168|0);Fe(11156|0);Fe(11144);i=a;return}function fm(a){a=a|0;a=i;Qe(11732|0);Qe(11720|0);Qe(11708|0);Qe(11696|0);Qe(11684|0);Qe(11672|0);Qe(11660|0);Qe(11648|0);Qe(11636|0);Qe(11624|0);Qe(11612|0);Qe(11600|0);Qe(11588|0);Qe(11576|0);Qe(11564|0);Qe(11552|0);Qe(11540|0);Qe(11528|0);Qe(11516|0);Qe(11504|0);Qe(11492|0);Qe(11480|0);Qe(11468|0);Qe(11456);i=a;return}function gm(a){a=a|0;a=i;Fe(12572|0);Fe(12560|0);Fe(12548|0);Fe(12536|0);Fe(12524|0);Fe(12512|0);Fe(12500|0);Fe(12488|0);Fe(12476|0);Fe(12464|0);Fe(12452|0);Fe(12440|0);Fe(12428|0);Fe(12416|0);Fe(12404|0);Fe(12392|0);Fe(12380|0);Fe(12368|0);Fe(12356|0);Fe(12344|0);Fe(12332|0);Fe(12320|0);Fe(12308|0);Fe(12296);i=a;return}function hm(a){a=a|0;a=i;Qe(12964|0);Qe(12952|0);Qe(12940|0);Qe(12928|0);Qe(12916|0);Qe(12904|0);Qe(12892|0);Qe(12880|0);Qe(12868|0);Qe(12856|0);Qe(12844|0);Qe(12832|0);Qe(12820|0);Qe(12808);i=a;return}function im(a){a=a|0;a=i;Fe(13500|0);Fe(13488|0);Fe(13476|0);Fe(13464|0);Fe(13452|0);Fe(13440|0);Fe(13428|0);Fe(13416|0);Fe(13404|0);Fe(13392|0);Fe(13380|0);Fe(13368|0);Fe(13356|0);Fe(13344);i=a;return}function jm(a,b,c){a=a|0;b=b|0;c=c|0;var d=0;d=i;a=km(0,a,b,(c|0)!=0?c:13864)|0;i=d;return a|0}function km(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0;g=i;i=i+16|0;h=g;c[h>>2]=b;f=(f|0)==0?13872:f;j=c[f>>2]|0;a:do{if((d|0)==0){if((j|0)==0){k=0;i=g;return k|0}}else{if((b|0)==0){c[h>>2]=h}else{h=b}if((e|0)==0){k=-2;i=g;return k|0}do{if((j|0)==0){b=a[d]|0;j=b&255;if(b<<24>>24>-1){c[h>>2]=j;k=b<<24>>24!=0|0;i=g;return k|0}else{j=j+ -194|0;if(j>>>0>50){break a}b=e+ -1|0;j=c[13656+(j<<2)>>2]|0;d=d+1|0;break}}else{b=e}}while(0);b:do{if((b|0)!=0){k=a[d]|0;l=(k&255)>>>3;if((l+ -16|l+(j>>26))>>>0>7){break a}while(1){d=d+1|0;j=(k&255)+ -128|j<<6;b=b+ -1|0;if((j|0)>=0){break}if((b|0)==0){break b}k=a[d]|0;if(((k&255)+ -128|0)>>>0>63){break a}}c[f>>2]=0;c[h>>2]=j;l=e-b|0;i=g;return l|0}}while(0);c[f>>2]=j;l=-2;i=g;return l|0}}while(0);c[f>>2]=0;c[(cc()|0)>>2]=84;l=-1;i=g;return l|0}function lm(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;j=i;i=i+1040|0;k=j+8|0;h=j;m=c[b>>2]|0;c[h>>2]=m;g=(a|0)!=0;e=g?e:256;l=g?a:k;a:do{if((m|0)==0|(e|0)==0){k=d;a=0}else{a=0;while(1){n=d>>>2;o=n>>>0>=e>>>0;if(!(o|d>>>0>131)){k=d;break a}m=o?e:n;d=d-m|0;m=mm(l,h,m,f)|0;if((m|0)==-1){break}if((l|0)==(k|0)){l=k}else{e=e-m|0;l=l+(m<<2)|0}a=m+a|0;m=c[h>>2]|0;if((m|0)==0|(e|0)==0){k=d;break a}}k=d;e=0;m=c[h>>2]|0;a=-1}}while(0);b:do{if((m|0)!=0?!((e|0)==0|(k|0)==0):0){while(1){d=km(l,m,k,f)|0;if((d+2|0)>>>0<3){break}m=(c[h>>2]|0)+d|0;c[h>>2]=m;e=e+ -1|0;a=a+1|0;if((e|0)==0|(k|0)==(d|0)){break b}else{k=k-d|0;l=l+4|0}}if((d|0)==-1){a=-1;break}else if((d|0)==0){c[h>>2]=0;break}else{c[f>>2]=0;break}}}while(0);if(!g){i=j;return a|0}c[b>>2]=c[h>>2];i=j;return a|0}function mm(b,e,f,g){b=b|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0;h=i;k=c[e>>2]|0;if((g|0)!=0?(l=c[g>>2]|0,(l|0)!=0):0){if((b|0)==0){j=f;g=16}else{c[g>>2]=0;j=f;g=36}}else{if((b|0)==0){j=f;g=7}else{j=f;g=6}}a:while(1){if((g|0)==6){if((j|0)==0){g=53;break}while(1){m=a[k]|0;do{if(((m&255)+ -1|0)>>>0<127?(k&3|0)==0&j>>>0>3:0){while(1){l=c[k>>2]|0;if(((l+ -16843009|l)&-2139062144|0)!=0){g=30;break}c[b>>2]=l&255;c[b+4>>2]=d[k+1|0]|0;c[b+8>>2]=d[k+2|0]|0;l=k+4|0;m=b+16|0;c[b+12>>2]=d[k+3|0]|0;j=j+ -4|0;if(j>>>0>3){b=m;k=l}else{g=31;break}}if((g|0)==30){m=l&255;break}else if((g|0)==31){b=m;m=a[l]|0;k=l;break}}}while(0);g=m&255;if(!((g+ -1|0)>>>0<127)){break}c[b>>2]=g;j=j+ -1|0;if((j|0)==0){g=53;break a}else{b=b+4|0;k=k+1|0}}g=g+ -194|0;if(g>>>0>50){g=47;break}l=c[13656+(g<<2)>>2]|0;k=k+1|0;g=36;continue}else if((g|0)==7){g=a[k]|0;if(((g&255)+ -1|0)>>>0<127?(k&3|0)==0:0){g=c[k>>2]|0;if(((g+ -16843009|g)&-2139062144|0)==0){do{k=k+4|0;j=j+ -4|0;g=c[k>>2]|0}while(((g+ -16843009|g)&-2139062144|0)==0)}g=g&255}g=g&255;if((g+ -1|0)>>>0<127){j=j+ -1|0;k=k+1|0;g=7;continue}g=g+ -194|0;if(g>>>0>50){g=47;break}l=c[13656+(g<<2)>>2]|0;k=k+1|0;g=16;continue}else if((g|0)==16){m=(d[k]|0)>>>3;if((m+ -16|m+(l>>26))>>>0>7){g=17;break}g=k+1|0;if((l&33554432|0)!=0){if(((d[g]|0)+ -128|0)>>>0>63){g=20;break}g=k+2|0;if((l&524288|0)==0){k=g}else{if(((d[g]|0)+ -128|0)>>>0>63){g=23;break}k=k+3|0}}else{k=g}j=j+ -1|0;g=7;continue}else if((g|0)==36){m=d[k]|0;g=m>>>3;if((g+ -16|g+(l>>26))>>>0>7){g=37;break}g=k+1|0;l=m+ -128|l<<6;if((l|0)<0){m=(d[g]|0)+ -128|0;if(m>>>0>63){g=40;break}g=k+2|0;l=m|l<<6;if((l|0)<0){g=(d[g]|0)+ -128|0;if(g>>>0>63){g=43;break}l=g|l<<6;k=k+3|0}else{k=g}}else{k=g}c[b>>2]=l;b=b+4|0;j=j+ -1|0;g=6;continue}}if((g|0)==17){k=k+ -1|0;g=46}else if((g|0)==20){k=k+ -1|0;g=46}else if((g|0)==23){k=k+ -1|0;g=46}else if((g|0)==37){k=k+ -1|0;g=46}else if((g|0)==40){k=k+ -1|0;g=46}else if((g|0)==43){k=k+ -1|0;g=46}else if((g|0)==53){i=h;return f|0}if((g|0)==46){if((l|0)==0){g=47}}if((g|0)==47){if((a[k]|0)==0){if((b|0)!=0){c[b>>2]=0;c[e>>2]=0}m=f-j|0;i=h;return m|0}}c[(cc()|0)>>2]=84;if((b|0)==0){m=-1;i=h;return m|0}c[e>>2]=k;m=-1;i=h;return m|0}function nm(b,e,f){b=b|0;e=e|0;f=f|0;var g=0,h=0,j=0;g=i;i=i+16|0;h=g;c[h>>2]=b;if((e|0)==0){j=0;i=g;return j|0}do{if((f|0)!=0){if((b|0)==0){c[h>>2]=h}else{h=b}b=a[e]|0;j=b&255;if(b<<24>>24>-1){c[h>>2]=j;j=b<<24>>24!=0|0;i=g;return j|0}j=j+ -194|0;if(!(j>>>0>50)){b=e+1|0;j=c[13656+(j<<2)>>2]|0;if(f>>>0<4?(j&-2147483648>>>((f*6|0)+ -6|0)|0)!=0:0){break}f=d[b]|0;b=f>>>3;if(!((b+ -16|b+(j>>26))>>>0>7)){f=f+ -128|j<<6;if((f|0)>=0){c[h>>2]=f;j=2;i=g;return j|0}b=(d[e+2|0]|0)+ -128|0;if(!(b>>>0>63)){f=b|f<<6;if((f|0)>=0){c[h>>2]=f;j=3;i=g;return j|0}e=(d[e+3|0]|0)+ -128|0;if(!(e>>>0>63)){c[h>>2]=e|f<<6;j=4;i=g;return j|0}}}}}}while(0);c[(cc()|0)>>2]=84;j=-1;i=g;return j|0}function om(b,d,e){b=b|0;d=d|0;e=e|0;e=i;if((b|0)==0){b=1;i=e;return b|0}if(d>>>0<128){a[b]=d;b=1;i=e;return b|0}if(d>>>0<2048){a[b]=d>>>6|192;a[b+1|0]=d&63|128;b=2;i=e;return b|0}if(d>>>0<55296|(d+ -57344|0)>>>0<8192){a[b]=d>>>12|224;a[b+1|0]=d>>>6&63|128;a[b+2|0]=d&63|128;b=3;i=e;return b|0}if((d+ -65536|0)>>>0<1048576){a[b]=d>>>18|240;a[b+1|0]=d>>>12&63|128;a[b+2|0]=d>>>6&63|128;a[b+3|0]=d&63|128;b=4;i=e;return b|0}else{c[(cc()|0)>>2]=84;b=-1;i=e;return b|0}return 0}function pm(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0;h=i;i=i+272|0;j=h+8|0;f=h;l=c[b>>2]|0;c[f>>2]=l;g=(a|0)!=0;e=g?e:256;a=g?a:j;a:do{if((l|0)==0|(e|0)==0){j=d;k=0}else{k=0;while(1){m=d>>>0>=e>>>0;if(!(m|d>>>0>32)){j=d;break a}l=m?e:d;d=d-l|0;l=qm(a,f,l,0)|0;if((l|0)==-1){break}if((a|0)==(j|0)){a=j}else{e=e-l|0;a=a+l|0}k=l+k|0;l=c[f>>2]|0;if((l|0)==0|(e|0)==0){j=d;break a}}j=d;e=0;l=c[f>>2]|0;k=-1}}while(0);b:do{if((l|0)!=0?!((e|0)==0|(j|0)==0):0){while(1){d=om(a,c[l>>2]|0,0)|0;if((d+1|0)>>>0<2){break}l=(c[f>>2]|0)+4|0;c[f>>2]=l;j=j+ -1|0;k=k+1|0;if((e|0)==(d|0)|(j|0)==0){break b}else{e=e-d|0;a=a+d|0}}if((d|0)==0){c[f>>2]=0}else{k=-1}}}while(0);if(!g){i=h;return k|0}c[b>>2]=c[f>>2];i=h;return k|0}function qm(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0;h=i;i=i+16|0;f=h;if((b|0)==0){k=c[d>>2]|0;l=c[k>>2]|0;if((l|0)==0){m=0;i=h;return m|0}else{j=0}while(1){if(l>>>0>127){l=om(f,l,0)|0;if((l|0)==-1){j=-1;l=26;break}}else{l=1}j=l+j|0;k=k+4|0;l=c[k>>2]|0;if((l|0)==0){l=26;break}}if((l|0)==26){i=h;return j|0}}a:do{if(e>>>0>3){k=e;l=c[d>>2]|0;while(1){m=c[l>>2]|0;if((m|0)==0){break a}if(m>>>0>127){m=om(b,m,0)|0;if((m|0)==-1){j=-1;break}b=b+m|0;k=k-m|0}else{a[b]=m;b=b+1|0;k=k+ -1|0;l=c[d>>2]|0}l=l+4|0;c[d>>2]=l;if(!(k>>>0>3)){break a}}i=h;return j|0}else{k=e}}while(0);b:do{if((k|0)!=0){l=c[d>>2]|0;while(1){m=c[l>>2]|0;if((m|0)==0){l=24;break}if(m>>>0>127){m=om(f,m,0)|0;if((m|0)==-1){j=-1;l=26;break}if(m>>>0>k>>>0){l=20;break}om(b,c[l>>2]|0,0)|0;b=b+m|0;k=k-m|0}else{a[b]=m;b=b+1|0;k=k+ -1|0;l=c[d>>2]|0}l=l+4|0;c[d>>2]=l;if((k|0)==0){g=0;break b}}if((l|0)==20){m=e-k|0;i=h;return m|0}else if((l|0)==24){a[b]=0;g=k;break}else if((l|0)==26){i=h;return j|0}}else{g=0}}while(0);c[d>>2]=0;m=e-g|0;i=h;return m|0}function rm(a){a=a|0;var b=0,d=0;b=i;d=a;while(1){if((c[d>>2]|0)==0){break}else{d=d+4|0}}i=b;return d-a>>2|0}function sm(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0;e=i;if((d|0)==0){i=e;return a|0}else{f=a}while(1){d=d+ -1|0;c[f>>2]=c[b>>2];if((d|0)==0){break}else{b=b+4|0;f=f+4|0}}i=e;return a|0}function tm(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0;e=i;f=(d|0)==0;if(a-b>>2>>>0<d>>>0){if(!f){do{d=d+ -1|0;c[a+(d<<2)>>2]=c[b+(d<<2)>>2]}while((d|0)!=0)}}else{if(!f){f=a;while(1){d=d+ -1|0;c[f>>2]=c[b>>2];if((d|0)==0){break}else{b=b+4|0;f=f+4|0}}}}i=e;return a|0}function um(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0;e=i;if((d|0)!=0){f=a;while(1){d=d+ -1|0;c[f>>2]=b;if((d|0)==0){break}else{f=f+4|0}}}i=e;return a|0}function vm(a){a=a|0;return}function wm(a){a=a|0;c[a>>2]=13888;return}function xm(a){a=a|0;var b=0;b=i;Xa(a|0);Ym(a);i=b;return}function ym(a){a=a|0;var b=0;b=i;Xa(a|0);i=b;return}function zm(a){a=a|0;return 13904}function Am(a){a=a|0;return}function Bm(a){a=a|0;return}function Cm(a){a=a|0;return}function Dm(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function Em(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function Fm(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function Gm(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0;e=i;i=i+64|0;f=e;if((a|0)==(b|0)){h=1;i=e;return h|0}if((b|0)==0){h=0;i=e;return h|0}b=Km(b,14016,14072,0)|0;if((b|0)==0){h=0;i=e;return h|0}h=f+0|0;g=h+56|0;do{c[h>>2]=0;h=h+4|0}while((h|0)<(g|0));c[f>>2]=b;c[f+8>>2]=a;c[f+12>>2]=-1;c[f+48>>2]=1;Dc[c[(c[b>>2]|0)+28>>2]&15](b,f,c[d>>2]|0,1);if((c[f+24>>2]|0)!=1){h=0;i=e;return h|0}c[d>>2]=c[f+16>>2];h=1;i=e;return h|0}function Hm(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0;g=i;if((c[d+8>>2]|0)!=(b|0)){i=g;return}b=d+16|0;h=c[b>>2]|0;if((h|0)==0){c[b>>2]=e;c[d+24>>2]=f;c[d+36>>2]=1;i=g;return}if((h|0)!=(e|0)){h=d+36|0;c[h>>2]=(c[h>>2]|0)+1;c[d+24>>2]=2;a[d+54|0]=1;i=g;return}e=d+24|0;if((c[e>>2]|0)!=2){i=g;return}c[e>>2]=f;i=g;return}function Im(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0;g=i;if((b|0)!=(c[d+8>>2]|0)){h=c[b+8>>2]|0;Dc[c[(c[h>>2]|0)+28>>2]&15](h,d,e,f);i=g;return}b=d+16|0;h=c[b>>2]|0;if((h|0)==0){c[b>>2]=e;c[d+24>>2]=f;c[d+36>>2]=1;i=g;return}if((h|0)!=(e|0)){h=d+36|0;c[h>>2]=(c[h>>2]|0)+1;c[d+24>>2]=2;a[d+54|0]=1;i=g;return}e=d+24|0;if((c[e>>2]|0)!=2){i=g;return}c[e>>2]=f;i=g;return}function Jm(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0;g=i;if((b|0)==(c[d+8>>2]|0)){j=d+16|0;h=c[j>>2]|0;if((h|0)==0){c[j>>2]=e;c[d+24>>2]=f;c[d+36>>2]=1;i=g;return}if((h|0)!=(e|0)){l=d+36|0;c[l>>2]=(c[l>>2]|0)+1;c[d+24>>2]=2;a[d+54|0]=1;i=g;return}e=d+24|0;if((c[e>>2]|0)!=2){i=g;return}c[e>>2]=f;i=g;return}k=c[b+12>>2]|0;h=b+(k<<3)+16|0;j=c[b+20>>2]|0;l=j>>8;if((j&1|0)!=0){l=c[(c[e>>2]|0)+l>>2]|0}m=c[b+16>>2]|0;Dc[c[(c[m>>2]|0)+28>>2]&15](m,d,e+l|0,(j&2|0)!=0?f:2);if((k|0)<=1){i=g;return}j=d+54|0;b=b+24|0;while(1){k=c[b+4>>2]|0;l=k>>8;if((k&1|0)!=0){l=c[(c[e>>2]|0)+l>>2]|0}m=c[b>>2]|0;Dc[c[(c[m>>2]|0)+28>>2]&15](m,d,e+l|0,(k&2|0)!=0?f:2);if((a[j]|0)!=0){f=16;break}b=b+8|0;if(!(b>>>0<h>>>0)){f=16;break}}if((f|0)==16){i=g;return}}function Km(d,e,f,g){d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;h=i;i=i+64|0;j=h;k=c[d>>2]|0;l=d+(c[k+ -8>>2]|0)|0;k=c[k+ -4>>2]|0;c[j>>2]=f;c[j+4>>2]=d;c[j+8>>2]=e;c[j+12>>2]=g;n=j+16|0;o=j+20|0;e=j+24|0;m=j+28|0;g=j+32|0;d=j+40|0;p=(k|0)==(f|0);q=n+0|0;f=q+36|0;do{c[q>>2]=0;q=q+4|0}while((q|0)<(f|0));b[n+36>>1]=0;a[n+38|0]=0;if(p){c[j+48>>2]=1;lc[c[(c[k>>2]|0)+20>>2]&15](k,j,l,l,1,0);q=(c[e>>2]|0)==1?l:0;i=h;return q|0}Ac[c[(c[k>>2]|0)+24>>2]&3](k,j,l,1,0);j=c[j+36>>2]|0;if((j|0)==0){if((c[d>>2]|0)!=1){q=0;i=h;return q|0}if((c[m>>2]|0)!=1){q=0;i=h;return q|0}q=(c[g>>2]|0)==1?c[o>>2]|0:0;i=h;return q|0}else if((j|0)==1){if((c[e>>2]|0)!=1){if((c[d>>2]|0)!=0){q=0;i=h;return q|0}if((c[m>>2]|0)!=1){q=0;i=h;return q|0}if((c[g>>2]|0)!=1){q=0;i=h;return q|0}}q=c[n>>2]|0;i=h;return q|0}else{q=0;i=h;return q|0}return 0}function Lm(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;h=i;if((b|0)==(c[d+8>>2]|0)){if((c[d+4>>2]|0)!=(e|0)){i=h;return}d=d+28|0;if((c[d>>2]|0)==1){i=h;return}c[d>>2]=f;i=h;return}if((b|0)==(c[d>>2]|0)){if((c[d+16>>2]|0)!=(e|0)?(m=d+20|0,(c[m>>2]|0)!=(e|0)):0){c[d+32>>2]=f;k=d+44|0;if((c[k>>2]|0)==4){i=h;return}w=c[b+12>>2]|0;q=b+(w<<3)+16|0;a:do{if((w|0)>0){s=d+52|0;t=d+53|0;o=d+54|0;n=b+8|0;r=d+24|0;u=0;p=0;b=b+16|0;b:do{a[s]=0;a[t]=0;v=c[b+4>>2]|0;w=v>>8;if((v&1|0)!=0){w=c[(c[e>>2]|0)+w>>2]|0}x=c[b>>2]|0;lc[c[(c[x>>2]|0)+20>>2]&15](x,d,e,e+w|0,2-(v>>>1&1)|0,g);if((a[o]|0)!=0){break}do{if((a[t]|0)!=0){if((a[s]|0)==0){if((c[n>>2]&1|0)==0){p=1;break b}else{p=1;break}}if((c[r>>2]|0)==1){n=27;break a}if((c[n>>2]&2|0)==0){n=27;break a}else{u=1;p=1}}}while(0);b=b+8|0}while(b>>>0<q>>>0);if(u){l=p;n=26}else{j=p;n=23}}else{j=0;n=23}}while(0);if((n|0)==23){c[m>>2]=e;x=d+40|0;c[x>>2]=(c[x>>2]|0)+1;if((c[d+36>>2]|0)==1?(c[d+24>>2]|0)==2:0){a[d+54|0]=1;if(j){n=27}else{n=28}}else{l=j;n=26}}if((n|0)==26){if(l){n=27}else{n=28}}if((n|0)==27){c[k>>2]=3;i=h;return}else if((n|0)==28){c[k>>2]=4;i=h;return}}if((f|0)!=1){i=h;return}c[d+32>>2]=1;i=h;return}m=c[b+12>>2]|0;j=b+(m<<3)+16|0;l=c[b+20>>2]|0;n=l>>8;if((l&1|0)!=0){n=c[(c[e>>2]|0)+n>>2]|0}x=c[b+16>>2]|0;Ac[c[(c[x>>2]|0)+24>>2]&3](x,d,e+n|0,(l&2|0)!=0?f:2,g);l=b+24|0;if((m|0)<=1){i=h;return}m=c[b+8>>2]|0;if((m&2|0)==0?(k=d+36|0,(c[k>>2]|0)!=1):0){if((m&1|0)==0){m=d+54|0;n=l;while(1){if((a[m]|0)!=0){n=53;break}if((c[k>>2]|0)==1){n=53;break}b=c[n+4>>2]|0;o=b>>8;if((b&1|0)!=0){o=c[(c[e>>2]|0)+o>>2]|0}x=c[n>>2]|0;Ac[c[(c[x>>2]|0)+24>>2]&3](x,d,e+o|0,(b&2|0)!=0?f:2,g);n=n+8|0;if(!(n>>>0<j>>>0)){n=53;break}}if((n|0)==53){i=h;return}}m=d+24|0;n=d+54|0;o=l;while(1){if((a[n]|0)!=0){n=53;break}if((c[k>>2]|0)==1?(c[m>>2]|0)==1:0){n=53;break}b=c[o+4>>2]|0;p=b>>8;if((b&1|0)!=0){p=c[(c[e>>2]|0)+p>>2]|0}x=c[o>>2]|0;Ac[c[(c[x>>2]|0)+24>>2]&3](x,d,e+p|0,(b&2|0)!=0?f:2,g);o=o+8|0;if(!(o>>>0<j>>>0)){n=53;break}}if((n|0)==53){i=h;return}}k=d+54|0;while(1){if((a[k]|0)!=0){n=53;break}m=c[l+4>>2]|0;n=m>>8;if((m&1|0)!=0){n=c[(c[e>>2]|0)+n>>2]|0}x=c[l>>2]|0;Ac[c[(c[x>>2]|0)+24>>2]&3](x,d,e+n|0,(m&2|0)!=0?f:2,g);l=l+8|0;if(!(l>>>0<j>>>0)){n=53;break}}if((n|0)==53){i=h;return}}



function Mm(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0;h=i;if((b|0)==(c[d+8>>2]|0)){if((c[d+4>>2]|0)!=(e|0)){i=h;return}j=d+28|0;if((c[j>>2]|0)==1){i=h;return}c[j>>2]=f;i=h;return}if((b|0)!=(c[d>>2]|0)){l=c[b+8>>2]|0;Ac[c[(c[l>>2]|0)+24>>2]&3](l,d,e,f,g);i=h;return}if((c[d+16>>2]|0)!=(e|0)?(k=d+20|0,(c[k>>2]|0)!=(e|0)):0){c[d+32>>2]=f;f=d+44|0;if((c[f>>2]|0)==4){i=h;return}l=d+52|0;a[l]=0;m=d+53|0;a[m]=0;b=c[b+8>>2]|0;lc[c[(c[b>>2]|0)+20>>2]&15](b,d,e,e,1,g);if((a[m]|0)!=0){if((a[l]|0)==0){b=1;j=13}}else{b=0;j=13}do{if((j|0)==13){c[k>>2]=e;m=d+40|0;c[m>>2]=(c[m>>2]|0)+1;if((c[d+36>>2]|0)==1?(c[d+24>>2]|0)==2:0){a[d+54|0]=1;if(b){break}}else{j=16}if((j|0)==16?b:0){break}c[f>>2]=4;i=h;return}}while(0);c[f>>2]=3;i=h;return}if((f|0)!=1){i=h;return}c[d+32>>2]=1;i=h;return}function Nm(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0;g=i;if((c[d+8>>2]|0)==(b|0)){if((c[d+4>>2]|0)!=(e|0)){i=g;return}d=d+28|0;if((c[d>>2]|0)==1){i=g;return}c[d>>2]=f;i=g;return}if((c[d>>2]|0)!=(b|0)){i=g;return}if((c[d+16>>2]|0)!=(e|0)?(h=d+20|0,(c[h>>2]|0)!=(e|0)):0){c[d+32>>2]=f;c[h>>2]=e;b=d+40|0;c[b>>2]=(c[b>>2]|0)+1;if((c[d+36>>2]|0)==1?(c[d+24>>2]|0)==2:0){a[d+54|0]=1}c[d+44>>2]=4;i=g;return}if((f|0)!=1){i=g;return}c[d+32>>2]=1;i=g;return}function Om(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0;j=i;if((b|0)!=(c[d+8>>2]|0)){m=d+52|0;l=a[m]|0;o=d+53|0;n=a[o]|0;p=c[b+12>>2]|0;k=b+(p<<3)+16|0;a[m]=0;a[o]=0;q=c[b+20>>2]|0;r=q>>8;if((q&1|0)!=0){r=c[(c[f>>2]|0)+r>>2]|0}t=c[b+16>>2]|0;lc[c[(c[t>>2]|0)+20>>2]&15](t,d,e,f+r|0,(q&2|0)!=0?g:2,h);a:do{if((p|0)>1){q=d+24|0;p=b+8|0;r=d+54|0;b=b+24|0;do{if((a[r]|0)!=0){break a}if((a[m]|0)==0){if((a[o]|0)!=0?(c[p>>2]&1|0)==0:0){break a}}else{if((c[q>>2]|0)==1){break a}if((c[p>>2]&2|0)==0){break a}}a[m]=0;a[o]=0;s=c[b+4>>2]|0;t=s>>8;if((s&1|0)!=0){t=c[(c[f>>2]|0)+t>>2]|0}u=c[b>>2]|0;lc[c[(c[u>>2]|0)+20>>2]&15](u,d,e,f+t|0,(s&2|0)!=0?g:2,h);b=b+8|0}while(b>>>0<k>>>0)}}while(0);a[m]=l;a[o]=n;i=j;return}a[d+53|0]=1;if((c[d+4>>2]|0)!=(f|0)){i=j;return}a[d+52|0]=1;h=d+16|0;k=c[h>>2]|0;if((k|0)==0){c[h>>2]=e;c[d+24>>2]=g;c[d+36>>2]=1;if(!((c[d+48>>2]|0)==1&(g|0)==1)){i=j;return}a[d+54|0]=1;i=j;return}if((k|0)!=(e|0)){u=d+36|0;c[u>>2]=(c[u>>2]|0)+1;a[d+54|0]=1;i=j;return}e=d+24|0;h=c[e>>2]|0;if((h|0)==2){c[e>>2]=g}else{g=h}if(!((c[d+48>>2]|0)==1&(g|0)==1)){i=j;return}a[d+54|0]=1;i=j;return}function Pm(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0;j=i;if((b|0)!=(c[d+8>>2]|0)){b=c[b+8>>2]|0;lc[c[(c[b>>2]|0)+20>>2]&15](b,d,e,f,g,h);i=j;return}a[d+53|0]=1;if((c[d+4>>2]|0)!=(f|0)){i=j;return}a[d+52|0]=1;b=d+16|0;f=c[b>>2]|0;if((f|0)==0){c[b>>2]=e;c[d+24>>2]=g;c[d+36>>2]=1;if(!((c[d+48>>2]|0)==1&(g|0)==1)){i=j;return}a[d+54|0]=1;i=j;return}if((f|0)!=(e|0)){h=d+36|0;c[h>>2]=(c[h>>2]|0)+1;a[d+54|0]=1;i=j;return}e=d+24|0;b=c[e>>2]|0;if((b|0)==2){c[e>>2]=g}else{g=b}if(!((c[d+48>>2]|0)==1&(g|0)==1)){i=j;return}a[d+54|0]=1;i=j;return}function Qm(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;h=i;if((c[d+8>>2]|0)!=(b|0)){i=h;return}a[d+53|0]=1;if((c[d+4>>2]|0)!=(f|0)){i=h;return}a[d+52|0]=1;f=d+16|0;b=c[f>>2]|0;if((b|0)==0){c[f>>2]=e;c[d+24>>2]=g;c[d+36>>2]=1;if(!((c[d+48>>2]|0)==1&(g|0)==1)){i=h;return}a[d+54|0]=1;i=h;return}if((b|0)!=(e|0)){b=d+36|0;c[b>>2]=(c[b>>2]|0)+1;a[d+54|0]=1;i=h;return}e=d+24|0;f=c[e>>2]|0;if((f|0)==2){c[e>>2]=g}else{g=f}if(!((c[d+48>>2]|0)==1&(g|0)==1)){i=h;return}a[d+54|0]=1;i=h;return}function Rm(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0;b=i;do{if(a>>>0<245){if(a>>>0<11){a=16}else{a=a+11&-8}v=a>>>3;t=c[3580]|0;w=t>>>v;if((w&3|0)!=0){h=(w&1^1)+v|0;g=h<<1;e=14360+(g<<2)|0;g=14360+(g+2<<2)|0;j=c[g>>2]|0;d=j+8|0;f=c[d>>2]|0;do{if((e|0)!=(f|0)){if(f>>>0<(c[14336>>2]|0)>>>0){Ob()}k=f+12|0;if((c[k>>2]|0)==(j|0)){c[k>>2]=e;c[g>>2]=f;break}else{Ob()}}else{c[3580]=t&~(1<<h)}}while(0);H=h<<3;c[j+4>>2]=H|3;H=j+(H|4)|0;c[H>>2]=c[H>>2]|1;H=d;i=b;return H|0}if(a>>>0>(c[14328>>2]|0)>>>0){if((w|0)!=0){j=2<<v;j=w<<v&(j|0-j);j=(j&0-j)+ -1|0;d=j>>>12&16;j=j>>>d;h=j>>>5&8;j=j>>>h;g=j>>>2&4;j=j>>>g;f=j>>>1&2;j=j>>>f;e=j>>>1&1;e=(h|d|g|f|e)+(j>>>e)|0;j=e<<1;f=14360+(j<<2)|0;j=14360+(j+2<<2)|0;g=c[j>>2]|0;d=g+8|0;h=c[d>>2]|0;do{if((f|0)!=(h|0)){if(h>>>0<(c[14336>>2]|0)>>>0){Ob()}k=h+12|0;if((c[k>>2]|0)==(g|0)){c[k>>2]=f;c[j>>2]=h;break}else{Ob()}}else{c[3580]=t&~(1<<e)}}while(0);h=e<<3;f=h-a|0;c[g+4>>2]=a|3;e=g+a|0;c[g+(a|4)>>2]=f|1;c[g+h>>2]=f;h=c[14328>>2]|0;if((h|0)!=0){g=c[14340>>2]|0;k=h>>>3;l=k<<1;h=14360+(l<<2)|0;j=c[3580]|0;k=1<<k;if((j&k|0)!=0){j=14360+(l+2<<2)|0;k=c[j>>2]|0;if(k>>>0<(c[14336>>2]|0)>>>0){Ob()}else{D=j;C=k}}else{c[3580]=j|k;D=14360+(l+2<<2)|0;C=h}c[D>>2]=g;c[C+12>>2]=g;c[g+8>>2]=C;c[g+12>>2]=h}c[14328>>2]=f;c[14340>>2]=e;H=d;i=b;return H|0}t=c[14324>>2]|0;if((t|0)!=0){d=(t&0-t)+ -1|0;G=d>>>12&16;d=d>>>G;F=d>>>5&8;d=d>>>F;H=d>>>2&4;d=d>>>H;h=d>>>1&2;d=d>>>h;e=d>>>1&1;e=c[14624+((F|G|H|h|e)+(d>>>e)<<2)>>2]|0;d=(c[e+4>>2]&-8)-a|0;h=e;while(1){g=c[h+16>>2]|0;if((g|0)==0){g=c[h+20>>2]|0;if((g|0)==0){break}}h=(c[g+4>>2]&-8)-a|0;f=h>>>0<d>>>0;d=f?h:d;h=g;e=f?g:e}h=c[14336>>2]|0;if(e>>>0<h>>>0){Ob()}f=e+a|0;if(!(e>>>0<f>>>0)){Ob()}g=c[e+24>>2]|0;j=c[e+12>>2]|0;do{if((j|0)==(e|0)){k=e+20|0;j=c[k>>2]|0;if((j|0)==0){k=e+16|0;j=c[k>>2]|0;if((j|0)==0){B=0;break}}while(1){m=j+20|0;l=c[m>>2]|0;if((l|0)!=0){j=l;k=m;continue}m=j+16|0;l=c[m>>2]|0;if((l|0)==0){break}else{j=l;k=m}}if(k>>>0<h>>>0){Ob()}else{c[k>>2]=0;B=j;break}}else{k=c[e+8>>2]|0;if(k>>>0<h>>>0){Ob()}h=k+12|0;if((c[h>>2]|0)!=(e|0)){Ob()}l=j+8|0;if((c[l>>2]|0)==(e|0)){c[h>>2]=j;c[l>>2]=k;B=j;break}else{Ob()}}}while(0);do{if((g|0)!=0){j=c[e+28>>2]|0;h=14624+(j<<2)|0;if((e|0)==(c[h>>2]|0)){c[h>>2]=B;if((B|0)==0){c[14324>>2]=c[14324>>2]&~(1<<j);break}}else{if(g>>>0<(c[14336>>2]|0)>>>0){Ob()}h=g+16|0;if((c[h>>2]|0)==(e|0)){c[h>>2]=B}else{c[g+20>>2]=B}if((B|0)==0){break}}if(B>>>0<(c[14336>>2]|0)>>>0){Ob()}c[B+24>>2]=g;g=c[e+16>>2]|0;do{if((g|0)!=0){if(g>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[B+16>>2]=g;c[g+24>>2]=B;break}}}while(0);g=c[e+20>>2]|0;if((g|0)!=0){if(g>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[B+20>>2]=g;c[g+24>>2]=B;break}}}}while(0);if(d>>>0<16){H=d+a|0;c[e+4>>2]=H|3;H=e+(H+4)|0;c[H>>2]=c[H>>2]|1}else{c[e+4>>2]=a|3;c[e+(a|4)>>2]=d|1;c[e+(d+a)>>2]=d;h=c[14328>>2]|0;if((h|0)!=0){g=c[14340>>2]|0;k=h>>>3;l=k<<1;h=14360+(l<<2)|0;j=c[3580]|0;k=1<<k;if((j&k|0)!=0){j=14360+(l+2<<2)|0;k=c[j>>2]|0;if(k>>>0<(c[14336>>2]|0)>>>0){Ob()}else{A=j;z=k}}else{c[3580]=j|k;A=14360+(l+2<<2)|0;z=h}c[A>>2]=g;c[z+12>>2]=g;c[g+8>>2]=z;c[g+12>>2]=h}c[14328>>2]=d;c[14340>>2]=f}H=e+8|0;i=b;return H|0}}}else{if(!(a>>>0>4294967231)){z=a+11|0;a=z&-8;B=c[14324>>2]|0;if((B|0)!=0){A=0-a|0;z=z>>>8;if((z|0)!=0){if(a>>>0>16777215){C=31}else{G=(z+1048320|0)>>>16&8;H=z<<G;F=(H+520192|0)>>>16&4;H=H<<F;C=(H+245760|0)>>>16&2;C=14-(F|G|C)+(H<<C>>>15)|0;C=a>>>(C+7|0)&1|C<<1}}else{C=0}F=c[14624+(C<<2)>>2]|0;a:do{if((F|0)==0){E=0;z=0}else{if((C|0)==31){z=0}else{z=25-(C>>>1)|0}E=0;D=a<<z;z=0;while(1){H=c[F+4>>2]&-8;G=H-a|0;if(G>>>0<A>>>0){if((H|0)==(a|0)){A=G;E=F;z=F;break a}else{A=G;z=F}}G=c[F+20>>2]|0;F=c[F+(D>>>31<<2)+16>>2]|0;E=(G|0)==0|(G|0)==(F|0)?E:G;if((F|0)==0){break}else{D=D<<1}}}}while(0);if((E|0)==0&(z|0)==0){H=2<<C;B=B&(H|0-H);if((B|0)==0){break}H=(B&0-B)+ -1|0;D=H>>>12&16;H=H>>>D;C=H>>>5&8;H=H>>>C;F=H>>>2&4;H=H>>>F;G=H>>>1&2;H=H>>>G;E=H>>>1&1;E=c[14624+((C|D|F|G|E)+(H>>>E)<<2)>>2]|0}if((E|0)!=0){while(1){C=(c[E+4>>2]&-8)-a|0;B=C>>>0<A>>>0;A=B?C:A;z=B?E:z;B=c[E+16>>2]|0;if((B|0)!=0){E=B;continue}E=c[E+20>>2]|0;if((E|0)==0){break}}}if((z|0)!=0?A>>>0<((c[14328>>2]|0)-a|0)>>>0:0){f=c[14336>>2]|0;if(z>>>0<f>>>0){Ob()}d=z+a|0;if(!(z>>>0<d>>>0)){Ob()}e=c[z+24>>2]|0;h=c[z+12>>2]|0;do{if((h|0)==(z|0)){h=z+20|0;g=c[h>>2]|0;if((g|0)==0){h=z+16|0;g=c[h>>2]|0;if((g|0)==0){x=0;break}}while(1){k=g+20|0;j=c[k>>2]|0;if((j|0)!=0){g=j;h=k;continue}j=g+16|0;k=c[j>>2]|0;if((k|0)==0){break}else{g=k;h=j}}if(h>>>0<f>>>0){Ob()}else{c[h>>2]=0;x=g;break}}else{g=c[z+8>>2]|0;if(g>>>0<f>>>0){Ob()}j=g+12|0;if((c[j>>2]|0)!=(z|0)){Ob()}f=h+8|0;if((c[f>>2]|0)==(z|0)){c[j>>2]=h;c[f>>2]=g;x=h;break}else{Ob()}}}while(0);do{if((e|0)!=0){f=c[z+28>>2]|0;g=14624+(f<<2)|0;if((z|0)==(c[g>>2]|0)){c[g>>2]=x;if((x|0)==0){c[14324>>2]=c[14324>>2]&~(1<<f);break}}else{if(e>>>0<(c[14336>>2]|0)>>>0){Ob()}f=e+16|0;if((c[f>>2]|0)==(z|0)){c[f>>2]=x}else{c[e+20>>2]=x}if((x|0)==0){break}}if(x>>>0<(c[14336>>2]|0)>>>0){Ob()}c[x+24>>2]=e;e=c[z+16>>2]|0;do{if((e|0)!=0){if(e>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[x+16>>2]=e;c[e+24>>2]=x;break}}}while(0);e=c[z+20>>2]|0;if((e|0)!=0){if(e>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[x+20>>2]=e;c[e+24>>2]=x;break}}}}while(0);b:do{if(!(A>>>0<16)){c[z+4>>2]=a|3;c[z+(a|4)>>2]=A|1;c[z+(A+a)>>2]=A;f=A>>>3;if(A>>>0<256){h=f<<1;e=14360+(h<<2)|0;g=c[3580]|0;f=1<<f;if((g&f|0)!=0){g=14360+(h+2<<2)|0;f=c[g>>2]|0;if(f>>>0<(c[14336>>2]|0)>>>0){Ob()}else{w=g;v=f}}else{c[3580]=g|f;w=14360+(h+2<<2)|0;v=e}c[w>>2]=d;c[v+12>>2]=d;c[z+(a+8)>>2]=v;c[z+(a+12)>>2]=e;break}e=A>>>8;if((e|0)!=0){if(A>>>0>16777215){e=31}else{G=(e+1048320|0)>>>16&8;H=e<<G;F=(H+520192|0)>>>16&4;H=H<<F;e=(H+245760|0)>>>16&2;e=14-(F|G|e)+(H<<e>>>15)|0;e=A>>>(e+7|0)&1|e<<1}}else{e=0}h=14624+(e<<2)|0;c[z+(a+28)>>2]=e;c[z+(a+20)>>2]=0;c[z+(a+16)>>2]=0;f=c[14324>>2]|0;g=1<<e;if((f&g|0)==0){c[14324>>2]=f|g;c[h>>2]=d;c[z+(a+24)>>2]=h;c[z+(a+12)>>2]=d;c[z+(a+8)>>2]=d;break}f=c[h>>2]|0;if((e|0)==31){e=0}else{e=25-(e>>>1)|0}c:do{if((c[f+4>>2]&-8|0)!=(A|0)){e=A<<e;while(1){h=f+(e>>>31<<2)+16|0;g=c[h>>2]|0;if((g|0)==0){break}if((c[g+4>>2]&-8|0)==(A|0)){t=g;break c}else{e=e<<1;f=g}}if(h>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[h>>2]=d;c[z+(a+24)>>2]=f;c[z+(a+12)>>2]=d;c[z+(a+8)>>2]=d;break b}}else{t=f}}while(0);f=t+8|0;e=c[f>>2]|0;g=c[14336>>2]|0;if(t>>>0<g>>>0){Ob()}if(e>>>0<g>>>0){Ob()}else{c[e+12>>2]=d;c[f>>2]=d;c[z+(a+8)>>2]=e;c[z+(a+12)>>2]=t;c[z+(a+24)>>2]=0;break}}else{H=A+a|0;c[z+4>>2]=H|3;H=z+(H+4)|0;c[H>>2]=c[H>>2]|1}}while(0);H=z+8|0;i=b;return H|0}}}else{a=-1}}}while(0);t=c[14328>>2]|0;if(!(a>>>0>t>>>0)){e=t-a|0;d=c[14340>>2]|0;if(e>>>0>15){c[14340>>2]=d+a;c[14328>>2]=e;c[d+(a+4)>>2]=e|1;c[d+t>>2]=e;c[d+4>>2]=a|3}else{c[14328>>2]=0;c[14340>>2]=0;c[d+4>>2]=t|3;H=d+(t+4)|0;c[H>>2]=c[H>>2]|1}H=d+8|0;i=b;return H|0}t=c[14332>>2]|0;if(a>>>0<t>>>0){G=t-a|0;c[14332>>2]=G;H=c[14344>>2]|0;c[14344>>2]=H+a;c[H+(a+4)>>2]=G|1;c[H+4>>2]=a|3;H=H+8|0;i=b;return H|0}do{if((c[3698]|0)==0){t=Qa(30)|0;if((t+ -1&t|0)==0){c[14800>>2]=t;c[14796>>2]=t;c[14804>>2]=-1;c[14808>>2]=-1;c[14812>>2]=0;c[14764>>2]=0;c[3698]=(rb(0)|0)&-16^1431655768;break}else{Ob()}}}while(0);v=a+48|0;A=c[14800>>2]|0;w=a+47|0;x=A+w|0;A=0-A|0;t=x&A;if(!(t>>>0>a>>>0)){H=0;i=b;return H|0}z=c[14760>>2]|0;if((z|0)!=0?(G=c[14752>>2]|0,H=G+t|0,H>>>0<=G>>>0|H>>>0>z>>>0):0){H=0;i=b;return H|0}d:do{if((c[14764>>2]&4|0)==0){B=c[14344>>2]|0;e:do{if((B|0)!=0){z=14768|0;while(1){C=c[z>>2]|0;if(!(C>>>0>B>>>0)?(y=z+4|0,(C+(c[y>>2]|0)|0)>>>0>B>>>0):0){break}z=c[z+8>>2]|0;if((z|0)==0){o=182;break e}}if((z|0)!=0){A=x-(c[14332>>2]|0)&A;if(A>>>0<2147483647){o=Ma(A|0)|0;B=(o|0)==((c[z>>2]|0)+(c[y>>2]|0)|0);x=o;z=A;y=B?o:-1;A=B?A:0;o=191}else{A=0}}else{o=182}}else{o=182}}while(0);do{if((o|0)==182){y=Ma(0)|0;if((y|0)!=(-1|0)){z=y;x=c[14796>>2]|0;A=x+ -1|0;if((A&z|0)==0){A=t}else{A=t-z+(A+z&0-x)|0}z=c[14752>>2]|0;B=z+A|0;if(A>>>0>a>>>0&A>>>0<2147483647){x=c[14760>>2]|0;if((x|0)!=0?B>>>0<=z>>>0|B>>>0>x>>>0:0){A=0;break}x=Ma(A|0)|0;o=(x|0)==(y|0);z=A;y=o?y:-1;A=o?A:0;o=191}else{A=0}}else{A=0}}}while(0);f:do{if((o|0)==191){o=0-z|0;if((y|0)!=(-1|0)){s=y;p=A;o=202;break d}do{if((x|0)!=(-1|0)&z>>>0<2147483647&z>>>0<v>>>0?(u=c[14800>>2]|0,u=w-z+u&0-u,u>>>0<2147483647):0){if((Ma(u|0)|0)==(-1|0)){Ma(o|0)|0;break f}else{z=u+z|0;break}}}while(0);if((x|0)!=(-1|0)){s=x;p=z;o=202;break d}}}while(0);c[14764>>2]=c[14764>>2]|4;o=199}else{A=0;o=199}}while(0);if((((o|0)==199?t>>>0<2147483647:0)?(s=Ma(t|0)|0,r=Ma(0)|0,(r|0)!=(-1|0)&(s|0)!=(-1|0)&s>>>0<r>>>0):0)?(q=r-s|0,p=q>>>0>(a+40|0)>>>0,p):0){p=p?q:A;o=202}if((o|0)==202){q=(c[14752>>2]|0)+p|0;c[14752>>2]=q;if(q>>>0>(c[14756>>2]|0)>>>0){c[14756>>2]=q}q=c[14344>>2]|0;g:do{if((q|0)!=0){w=14768|0;while(1){r=c[w>>2]|0;u=w+4|0;v=c[u>>2]|0;if((s|0)==(r+v|0)){o=214;break}t=c[w+8>>2]|0;if((t|0)==0){break}else{w=t}}if(((o|0)==214?(c[w+12>>2]&8|0)==0:0)?q>>>0>=r>>>0&q>>>0<s>>>0:0){c[u>>2]=v+p;d=(c[14332>>2]|0)+p|0;e=q+8|0;if((e&7|0)==0){e=0}else{e=0-e&7}H=d-e|0;c[14344>>2]=q+e;c[14332>>2]=H;c[q+(e+4)>>2]=H|1;c[q+(d+4)>>2]=40;c[14348>>2]=c[14808>>2];break}if(s>>>0<(c[14336>>2]|0)>>>0){c[14336>>2]=s}u=s+p|0;r=14768|0;while(1){if((c[r>>2]|0)==(u|0)){o=224;break}t=c[r+8>>2]|0;if((t|0)==0){break}else{r=t}}if((o|0)==224?(c[r+12>>2]&8|0)==0:0){c[r>>2]=s;h=r+4|0;c[h>>2]=(c[h>>2]|0)+p;h=s+8|0;if((h&7|0)==0){h=0}else{h=0-h&7}j=s+(p+8)|0;if((j&7|0)==0){o=0}else{o=0-j&7}q=s+(o+p)|0;k=h+a|0;j=s+k|0;m=q-(s+h)-a|0;c[s+(h+4)>>2]=a|3;h:do{if((q|0)!=(c[14344>>2]|0)){if((q|0)==(c[14340>>2]|0)){H=(c[14328>>2]|0)+m|0;c[14328>>2]=H;c[14340>>2]=j;c[s+(k+4)>>2]=H|1;c[s+(H+k)>>2]=H;break}a=p+4|0;t=c[s+(a+o)>>2]|0;if((t&3|0)==1){n=t&-8;r=t>>>3;do{if(!(t>>>0<256)){l=c[s+((o|24)+p)>>2]|0;u=c[s+(p+12+o)>>2]|0;do{if((u|0)==(q|0)){u=o|16;t=s+(a+u)|0;r=c[t>>2]|0;if((r|0)==0){t=s+(u+p)|0;r=c[t>>2]|0;if((r|0)==0){g=0;break}}while(1){v=r+20|0;u=c[v>>2]|0;if((u|0)!=0){r=u;t=v;continue}u=r+16|0;v=c[u>>2]|0;if((v|0)==0){break}else{r=v;t=u}}if(t>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[t>>2]=0;g=r;break}}else{t=c[s+((o|8)+p)>>2]|0;if(t>>>0<(c[14336>>2]|0)>>>0){Ob()}r=t+12|0;if((c[r>>2]|0)!=(q|0)){Ob()}v=u+8|0;if((c[v>>2]|0)==(q|0)){c[r>>2]=u;c[v>>2]=t;g=u;break}else{Ob()}}}while(0);if((l|0)!=0){r=c[s+(p+28+o)>>2]|0;t=14624+(r<<2)|0;if((q|0)==(c[t>>2]|0)){c[t>>2]=g;if((g|0)==0){c[14324>>2]=c[14324>>2]&~(1<<r);break}}else{if(l>>>0<(c[14336>>2]|0)>>>0){Ob()}r=l+16|0;if((c[r>>2]|0)==(q|0)){c[r>>2]=g}else{c[l+20>>2]=g}if((g|0)==0){break}}if(g>>>0<(c[14336>>2]|0)>>>0){Ob()}c[g+24>>2]=l;q=o|16;l=c[s+(q+p)>>2]|0;do{if((l|0)!=0){if(l>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[g+16>>2]=l;c[l+24>>2]=g;break}}}while(0);l=c[s+(a+q)>>2]|0;if((l|0)!=0){if(l>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[g+20>>2]=l;c[l+24>>2]=g;break}}}}else{g=c[s+((o|8)+p)>>2]|0;a=c[s+(p+12+o)>>2]|0;t=14360+(r<<1<<2)|0;if((g|0)!=(t|0)){if(g>>>0<(c[14336>>2]|0)>>>0){Ob()}if((c[g+12>>2]|0)!=(q|0)){Ob()}}if((a|0)==(g|0)){c[3580]=c[3580]&~(1<<r);break}if((a|0)!=(t|0)){if(a>>>0<(c[14336>>2]|0)>>>0){Ob()}r=a+8|0;if((c[r>>2]|0)==(q|0)){l=r}else{Ob()}}else{l=a+8|0}c[g+12>>2]=a;c[l>>2]=g}}while(0);q=s+((n|o)+p)|0;m=n+m|0}g=q+4|0;c[g>>2]=c[g>>2]&-2;c[s+(k+4)>>2]=m|1;c[s+(m+k)>>2]=m;g=m>>>3;if(m>>>0<256){m=g<<1;d=14360+(m<<2)|0;l=c[3580]|0;g=1<<g;if((l&g|0)!=0){l=14360+(m+2<<2)|0;g=c[l>>2]|0;if(g>>>0<(c[14336>>2]|0)>>>0){Ob()}else{e=l;f=g}}else{c[3580]=l|g;e=14360+(m+2<<2)|0;f=d}c[e>>2]=j;c[f+12>>2]=j;c[s+(k+8)>>2]=f;c[s+(k+12)>>2]=d;break}e=m>>>8;if((e|0)!=0){if(m>>>0>16777215){e=31}else{G=(e+1048320|0)>>>16&8;H=e<<G;F=(H+520192|0)>>>16&4;H=H<<F;e=(H+245760|0)>>>16&2;e=14-(F|G|e)+(H<<e>>>15)|0;e=m>>>(e+7|0)&1|e<<1}}else{e=0}f=14624+(e<<2)|0;c[s+(k+28)>>2]=e;c[s+(k+20)>>2]=0;c[s+(k+16)>>2]=0;l=c[14324>>2]|0;g=1<<e;if((l&g|0)==0){c[14324>>2]=l|g;c[f>>2]=j;c[s+(k+24)>>2]=f;c[s+(k+12)>>2]=j;c[s+(k+8)>>2]=j;break}f=c[f>>2]|0;if((e|0)==31){e=0}else{e=25-(e>>>1)|0}i:do{if((c[f+4>>2]&-8|0)!=(m|0)){e=m<<e;while(1){g=f+(e>>>31<<2)+16|0;l=c[g>>2]|0;if((l|0)==0){break}if((c[l+4>>2]&-8|0)==(m|0)){d=l;break i}else{e=e<<1;f=l}}if(g>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[g>>2]=j;c[s+(k+24)>>2]=f;c[s+(k+12)>>2]=j;c[s+(k+8)>>2]=j;break h}}else{d=f}}while(0);f=d+8|0;e=c[f>>2]|0;g=c[14336>>2]|0;if(d>>>0<g>>>0){Ob()}if(e>>>0<g>>>0){Ob()}else{c[e+12>>2]=j;c[f>>2]=j;c[s+(k+8)>>2]=e;c[s+(k+12)>>2]=d;c[s+(k+24)>>2]=0;break}}else{H=(c[14332>>2]|0)+m|0;c[14332>>2]=H;c[14344>>2]=j;c[s+(k+4)>>2]=H|1}}while(0);H=s+(h|8)|0;i=b;return H|0}e=14768|0;while(1){d=c[e>>2]|0;if(!(d>>>0>q>>>0)?(n=c[e+4>>2]|0,m=d+n|0,m>>>0>q>>>0):0){break}e=c[e+8>>2]|0}e=d+(n+ -39)|0;if((e&7|0)==0){e=0}else{e=0-e&7}d=d+(n+ -47+e)|0;d=d>>>0<(q+16|0)>>>0?q:d;e=d+8|0;f=s+8|0;if((f&7|0)==0){f=0}else{f=0-f&7}H=p+ -40-f|0;c[14344>>2]=s+f;c[14332>>2]=H;c[s+(f+4)>>2]=H|1;c[s+(p+ -36)>>2]=40;c[14348>>2]=c[14808>>2];c[d+4>>2]=27;c[e+0>>2]=c[14768>>2];c[e+4>>2]=c[14772>>2];c[e+8>>2]=c[14776>>2];c[e+12>>2]=c[14780>>2];c[14768>>2]=s;c[14772>>2]=p;c[14780>>2]=0;c[14776>>2]=e;f=d+28|0;c[f>>2]=7;if((d+32|0)>>>0<m>>>0){while(1){e=f+4|0;c[e>>2]=7;if((f+8|0)>>>0<m>>>0){f=e}else{break}}}if((d|0)!=(q|0)){d=d-q|0;e=q+(d+4)|0;c[e>>2]=c[e>>2]&-2;c[q+4>>2]=d|1;c[q+d>>2]=d;e=d>>>3;if(d>>>0<256){f=e<<1;d=14360+(f<<2)|0;g=c[3580]|0;e=1<<e;if((g&e|0)!=0){f=14360+(f+2<<2)|0;e=c[f>>2]|0;if(e>>>0<(c[14336>>2]|0)>>>0){Ob()}else{j=f;k=e}}else{c[3580]=g|e;j=14360+(f+2<<2)|0;k=d}c[j>>2]=q;c[k+12>>2]=q;c[q+8>>2]=k;c[q+12>>2]=d;break}e=d>>>8;if((e|0)!=0){if(d>>>0>16777215){e=31}else{G=(e+1048320|0)>>>16&8;H=e<<G;F=(H+520192|0)>>>16&4;H=H<<F;e=(H+245760|0)>>>16&2;e=14-(F|G|e)+(H<<e>>>15)|0;e=d>>>(e+7|0)&1|e<<1}}else{e=0}j=14624+(e<<2)|0;c[q+28>>2]=e;c[q+20>>2]=0;c[q+16>>2]=0;f=c[14324>>2]|0;g=1<<e;if((f&g|0)==0){c[14324>>2]=f|g;c[j>>2]=q;c[q+24>>2]=j;c[q+12>>2]=q;c[q+8>>2]=q;break}f=c[j>>2]|0;if((e|0)==31){e=0}else{e=25-(e>>>1)|0}j:do{if((c[f+4>>2]&-8|0)!=(d|0)){e=d<<e;while(1){j=f+(e>>>31<<2)+16|0;g=c[j>>2]|0;if((g|0)==0){break}if((c[g+4>>2]&-8|0)==(d|0)){h=g;break j}else{e=e<<1;f=g}}if(j>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[j>>2]=q;c[q+24>>2]=f;c[q+12>>2]=q;c[q+8>>2]=q;break g}}else{h=f}}while(0);f=h+8|0;e=c[f>>2]|0;d=c[14336>>2]|0;if(h>>>0<d>>>0){Ob()}if(e>>>0<d>>>0){Ob()}else{c[e+12>>2]=q;c[f>>2]=q;c[q+8>>2]=e;c[q+12>>2]=h;c[q+24>>2]=0;break}}}else{H=c[14336>>2]|0;if((H|0)==0|s>>>0<H>>>0){c[14336>>2]=s}c[14768>>2]=s;c[14772>>2]=p;c[14780>>2]=0;c[14356>>2]=c[3698];c[14352>>2]=-1;d=0;do{H=d<<1;G=14360+(H<<2)|0;c[14360+(H+3<<2)>>2]=G;c[14360+(H+2<<2)>>2]=G;d=d+1|0}while((d|0)!=32);d=s+8|0;if((d&7|0)==0){d=0}else{d=0-d&7}H=p+ -40-d|0;c[14344>>2]=s+d;c[14332>>2]=H;c[s+(d+4)>>2]=H|1;c[s+(p+ -36)>>2]=40;c[14348>>2]=c[14808>>2]}}while(0);d=c[14332>>2]|0;if(d>>>0>a>>>0){G=d-a|0;c[14332>>2]=G;H=c[14344>>2]|0;c[14344>>2]=H+a;c[H+(a+4)>>2]=G|1;c[H+4>>2]=a|3;H=H+8|0;i=b;return H|0}}c[(cc()|0)>>2]=12;H=0;i=b;return H|0}function Sm(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;b=i;if((a|0)==0){i=b;return}q=a+ -8|0;r=c[14336>>2]|0;if(q>>>0<r>>>0){Ob()}o=c[a+ -4>>2]|0;n=o&3;if((n|0)==1){Ob()}j=o&-8;h=a+(j+ -8)|0;do{if((o&1|0)==0){u=c[q>>2]|0;if((n|0)==0){i=b;return}q=-8-u|0;o=a+q|0;n=u+j|0;if(o>>>0<r>>>0){Ob()}if((o|0)==(c[14340>>2]|0)){d=a+(j+ -4)|0;if((c[d>>2]&3|0)!=3){d=o;m=n;break}c[14328>>2]=n;c[d>>2]=c[d>>2]&-2;c[a+(q+4)>>2]=n|1;c[h>>2]=n;i=b;return}t=u>>>3;if(u>>>0<256){d=c[a+(q+8)>>2]|0;m=c[a+(q+12)>>2]|0;p=14360+(t<<1<<2)|0;if((d|0)!=(p|0)){if(d>>>0<r>>>0){Ob()}if((c[d+12>>2]|0)!=(o|0)){Ob()}}if((m|0)==(d|0)){c[3580]=c[3580]&~(1<<t);d=o;m=n;break}if((m|0)!=(p|0)){if(m>>>0<r>>>0){Ob()}p=m+8|0;if((c[p>>2]|0)==(o|0)){s=p}else{Ob()}}else{s=m+8|0}c[d+12>>2]=m;c[s>>2]=d;d=o;m=n;break}s=c[a+(q+24)>>2]|0;t=c[a+(q+12)>>2]|0;do{if((t|0)==(o|0)){u=a+(q+20)|0;t=c[u>>2]|0;if((t|0)==0){u=a+(q+16)|0;t=c[u>>2]|0;if((t|0)==0){p=0;break}}while(1){w=t+20|0;v=c[w>>2]|0;if((v|0)!=0){t=v;u=w;continue}v=t+16|0;w=c[v>>2]|0;if((w|0)==0){break}else{t=w;u=v}}if(u>>>0<r>>>0){Ob()}else{c[u>>2]=0;p=t;break}}else{u=c[a+(q+8)>>2]|0;if(u>>>0<r>>>0){Ob()}r=u+12|0;if((c[r>>2]|0)!=(o|0)){Ob()}v=t+8|0;if((c[v>>2]|0)==(o|0)){c[r>>2]=t;c[v>>2]=u;p=t;break}else{Ob()}}}while(0);if((s|0)!=0){t=c[a+(q+28)>>2]|0;r=14624+(t<<2)|0;if((o|0)==(c[r>>2]|0)){c[r>>2]=p;if((p|0)==0){c[14324>>2]=c[14324>>2]&~(1<<t);d=o;m=n;break}}else{if(s>>>0<(c[14336>>2]|0)>>>0){Ob()}r=s+16|0;if((c[r>>2]|0)==(o|0)){c[r>>2]=p}else{c[s+20>>2]=p}if((p|0)==0){d=o;m=n;break}}if(p>>>0<(c[14336>>2]|0)>>>0){Ob()}c[p+24>>2]=s;r=c[a+(q+16)>>2]|0;do{if((r|0)!=0){if(r>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[p+16>>2]=r;c[r+24>>2]=p;break}}}while(0);q=c[a+(q+20)>>2]|0;if((q|0)!=0){if(q>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[p+20>>2]=q;c[q+24>>2]=p;d=o;m=n;break}}else{d=o;m=n}}else{d=o;m=n}}else{d=q;m=j}}while(0);if(!(d>>>0<h>>>0)){Ob()}n=a+(j+ -4)|0;o=c[n>>2]|0;if((o&1|0)==0){Ob()}if((o&2|0)==0){if((h|0)==(c[14344>>2]|0)){w=(c[14332>>2]|0)+m|0;c[14332>>2]=w;c[14344>>2]=d;c[d+4>>2]=w|1;if((d|0)!=(c[14340>>2]|0)){i=b;return}c[14340>>2]=0;c[14328>>2]=0;i=b;return}if((h|0)==(c[14340>>2]|0)){w=(c[14328>>2]|0)+m|0;c[14328>>2]=w;c[14340>>2]=d;c[d+4>>2]=w|1;c[d+w>>2]=w;i=b;return}m=(o&-8)+m|0;n=o>>>3;do{if(!(o>>>0<256)){l=c[a+(j+16)>>2]|0;q=c[a+(j|4)>>2]|0;do{if((q|0)==(h|0)){o=a+(j+12)|0;n=c[o>>2]|0;if((n|0)==0){o=a+(j+8)|0;n=c[o>>2]|0;if((n|0)==0){k=0;break}}while(1){p=n+20|0;q=c[p>>2]|0;if((q|0)!=0){n=q;o=p;continue}p=n+16|0;q=c[p>>2]|0;if((q|0)==0){break}else{n=q;o=p}}if(o>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[o>>2]=0;k=n;break}}else{o=c[a+j>>2]|0;if(o>>>0<(c[14336>>2]|0)>>>0){Ob()}p=o+12|0;if((c[p>>2]|0)!=(h|0)){Ob()}n=q+8|0;if((c[n>>2]|0)==(h|0)){c[p>>2]=q;c[n>>2]=o;k=q;break}else{Ob()}}}while(0);if((l|0)!=0){n=c[a+(j+20)>>2]|0;o=14624+(n<<2)|0;if((h|0)==(c[o>>2]|0)){c[o>>2]=k;if((k|0)==0){c[14324>>2]=c[14324>>2]&~(1<<n);break}}else{if(l>>>0<(c[14336>>2]|0)>>>0){Ob()}n=l+16|0;if((c[n>>2]|0)==(h|0)){c[n>>2]=k}else{c[l+20>>2]=k}if((k|0)==0){break}}if(k>>>0<(c[14336>>2]|0)>>>0){Ob()}c[k+24>>2]=l;h=c[a+(j+8)>>2]|0;do{if((h|0)!=0){if(h>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[k+16>>2]=h;c[h+24>>2]=k;break}}}while(0);h=c[a+(j+12)>>2]|0;if((h|0)!=0){if(h>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[k+20>>2]=h;c[h+24>>2]=k;break}}}}else{k=c[a+j>>2]|0;a=c[a+(j|4)>>2]|0;j=14360+(n<<1<<2)|0;if((k|0)!=(j|0)){if(k>>>0<(c[14336>>2]|0)>>>0){Ob()}if((c[k+12>>2]|0)!=(h|0)){Ob()}}if((a|0)==(k|0)){c[3580]=c[3580]&~(1<<n);break}if((a|0)!=(j|0)){if(a>>>0<(c[14336>>2]|0)>>>0){Ob()}j=a+8|0;if((c[j>>2]|0)==(h|0)){l=j}else{Ob()}}else{l=a+8|0}c[k+12>>2]=a;c[l>>2]=k}}while(0);c[d+4>>2]=m|1;c[d+m>>2]=m;if((d|0)==(c[14340>>2]|0)){c[14328>>2]=m;i=b;return}}else{c[n>>2]=o&-2;c[d+4>>2]=m|1;c[d+m>>2]=m}h=m>>>3;if(m>>>0<256){a=h<<1;e=14360+(a<<2)|0;j=c[3580]|0;h=1<<h;if((j&h|0)!=0){h=14360+(a+2<<2)|0;a=c[h>>2]|0;if(a>>>0<(c[14336>>2]|0)>>>0){Ob()}else{f=h;g=a}}else{c[3580]=j|h;f=14360+(a+2<<2)|0;g=e}c[f>>2]=d;c[g+12>>2]=d;c[d+8>>2]=g;c[d+12>>2]=e;i=b;return}f=m>>>8;if((f|0)!=0){if(m>>>0>16777215){f=31}else{v=(f+1048320|0)>>>16&8;w=f<<v;u=(w+520192|0)>>>16&4;w=w<<u;f=(w+245760|0)>>>16&2;f=14-(u|v|f)+(w<<f>>>15)|0;f=m>>>(f+7|0)&1|f<<1}}else{f=0}g=14624+(f<<2)|0;c[d+28>>2]=f;c[d+20>>2]=0;c[d+16>>2]=0;a=c[14324>>2]|0;h=1<<f;a:do{if((a&h|0)!=0){g=c[g>>2]|0;if((f|0)==31){f=0}else{f=25-(f>>>1)|0}b:do{if((c[g+4>>2]&-8|0)!=(m|0)){f=m<<f;a=g;while(1){h=a+(f>>>31<<2)+16|0;g=c[h>>2]|0;if((g|0)==0){break}if((c[g+4>>2]&-8|0)==(m|0)){e=g;break b}else{f=f<<1;a=g}}if(h>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[h>>2]=d;c[d+24>>2]=a;c[d+12>>2]=d;c[d+8>>2]=d;break a}}else{e=g}}while(0);g=e+8|0;f=c[g>>2]|0;h=c[14336>>2]|0;if(e>>>0<h>>>0){Ob()}if(f>>>0<h>>>0){Ob()}else{c[f+12>>2]=d;c[g>>2]=d;c[d+8>>2]=f;c[d+12>>2]=e;c[d+24>>2]=0;break}}else{c[14324>>2]=a|h;c[g>>2]=d;c[d+24>>2]=g;c[d+12>>2]=d;c[d+8>>2]=d}}while(0);w=(c[14352>>2]|0)+ -1|0;c[14352>>2]=w;if((w|0)==0){d=14776|0}else{i=b;return}while(1){d=c[d>>2]|0;if((d|0)==0){break}else{d=d+8|0}}c[14352>>2]=-1;i=b;return}function Tm(a,b){a=a|0;b=b|0;var d=0,e=0,f=0;d=i;do{if((a|0)!=0){if(b>>>0>4294967231){c[(cc()|0)>>2]=12;e=0;break}if(b>>>0<11){e=16}else{e=b+11&-8}e=Um(a+ -8|0,e)|0;if((e|0)!=0){e=e+8|0;break}e=Rm(b)|0;if((e|0)==0){e=0}else{f=c[a+ -4>>2]|0;f=(f&-8)-((f&3|0)==0?8:4)|0;sn(e|0,a|0,(f>>>0<b>>>0?f:b)|0)|0;Sm(a)}}else{e=Rm(b)|0}}while(0);i=d;return e|0}function Um(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;d=i;e=a+4|0;g=c[e>>2]|0;j=g&-8;f=a+j|0;l=c[14336>>2]|0;if(a>>>0<l>>>0){Ob()}n=g&3;if(!((n|0)!=1&a>>>0<f>>>0)){Ob()}h=a+(j|4)|0;o=c[h>>2]|0;if((o&1|0)==0){Ob()}if((n|0)==0){if(b>>>0<256){q=0;i=d;return q|0}if(!(j>>>0<(b+4|0)>>>0)?!((j-b|0)>>>0>c[14800>>2]<<1>>>0):0){q=a;i=d;return q|0}q=0;i=d;return q|0}if(!(j>>>0<b>>>0)){f=j-b|0;if(!(f>>>0>15)){q=a;i=d;return q|0}c[e>>2]=g&1|b|2;c[a+(b+4)>>2]=f|3;c[h>>2]=c[h>>2]|1;Vm(a+b|0,f);q=a;i=d;return q|0}if((f|0)==(c[14344>>2]|0)){f=(c[14332>>2]|0)+j|0;if(!(f>>>0>b>>>0)){q=0;i=d;return q|0}q=f-b|0;c[e>>2]=g&1|b|2;c[a+(b+4)>>2]=q|1;c[14344>>2]=a+b;c[14332>>2]=q;q=a;i=d;return q|0}if((f|0)==(c[14340>>2]|0)){h=(c[14328>>2]|0)+j|0;if(h>>>0<b>>>0){q=0;i=d;return q|0}f=h-b|0;if(f>>>0>15){c[e>>2]=g&1|b|2;c[a+(b+4)>>2]=f|1;c[a+h>>2]=f;q=a+(h+4)|0;c[q>>2]=c[q>>2]&-2;b=a+b|0}else{c[e>>2]=g&1|h|2;b=a+(h+4)|0;c[b>>2]=c[b>>2]|1;b=0;f=0}c[14328>>2]=f;c[14340>>2]=b;q=a;i=d;return q|0}if((o&2|0)!=0){q=0;i=d;return q|0}h=(o&-8)+j|0;if(h>>>0<b>>>0){q=0;i=d;return q|0}g=h-b|0;n=o>>>3;do{if(!(o>>>0<256)){m=c[a+(j+24)>>2]|0;o=c[a+(j+12)>>2]|0;do{if((o|0)==(f|0)){o=a+(j+20)|0;n=c[o>>2]|0;if((n|0)==0){o=a+(j+16)|0;n=c[o>>2]|0;if((n|0)==0){k=0;break}}while(1){q=n+20|0;p=c[q>>2]|0;if((p|0)!=0){n=p;o=q;continue}q=n+16|0;p=c[q>>2]|0;if((p|0)==0){break}else{n=p;o=q}}if(o>>>0<l>>>0){Ob()}else{c[o>>2]=0;k=n;break}}else{n=c[a+(j+8)>>2]|0;if(n>>>0<l>>>0){Ob()}p=n+12|0;if((c[p>>2]|0)!=(f|0)){Ob()}l=o+8|0;if((c[l>>2]|0)==(f|0)){c[p>>2]=o;c[l>>2]=n;k=o;break}else{Ob()}}}while(0);if((m|0)!=0){l=c[a+(j+28)>>2]|0;n=14624+(l<<2)|0;if((f|0)==(c[n>>2]|0)){c[n>>2]=k;if((k|0)==0){c[14324>>2]=c[14324>>2]&~(1<<l);break}}else{if(m>>>0<(c[14336>>2]|0)>>>0){Ob()}l=m+16|0;if((c[l>>2]|0)==(f|0)){c[l>>2]=k}else{c[m+20>>2]=k}if((k|0)==0){break}}if(k>>>0<(c[14336>>2]|0)>>>0){Ob()}c[k+24>>2]=m;f=c[a+(j+16)>>2]|0;do{if((f|0)!=0){if(f>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[k+16>>2]=f;c[f+24>>2]=k;break}}}while(0);f=c[a+(j+20)>>2]|0;if((f|0)!=0){if(f>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[k+20>>2]=f;c[f+24>>2]=k;break}}}}else{k=c[a+(j+8)>>2]|0;j=c[a+(j+12)>>2]|0;o=14360+(n<<1<<2)|0;if((k|0)!=(o|0)){if(k>>>0<l>>>0){Ob()}if((c[k+12>>2]|0)!=(f|0)){Ob()}}if((j|0)==(k|0)){c[3580]=c[3580]&~(1<<n);break}if((j|0)!=(o|0)){if(j>>>0<l>>>0){Ob()}l=j+8|0;if((c[l>>2]|0)==(f|0)){m=l}else{Ob()}}else{m=j+8|0}c[k+12>>2]=j;c[m>>2]=k}}while(0);if(g>>>0<16){c[e>>2]=h|c[e>>2]&1|2;q=a+(h|4)|0;c[q>>2]=c[q>>2]|1;q=a;i=d;return q|0}else{c[e>>2]=c[e>>2]&1|b|2;c[a+(b+4)>>2]=g|3;q=a+(h|4)|0;c[q>>2]=c[q>>2]|1;Vm(a+b|0,g);q=a;i=d;return q|0}return 0}function Vm(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;d=i;h=a+b|0;l=c[a+4>>2]|0;do{if((l&1|0)==0){p=c[a>>2]|0;if((l&3|0)==0){i=d;return}l=a+(0-p)|0;m=p+b|0;q=c[14336>>2]|0;if(l>>>0<q>>>0){Ob()}if((l|0)==(c[14340>>2]|0)){e=a+(b+4)|0;if((c[e>>2]&3|0)!=3){e=l;n=m;break}c[14328>>2]=m;c[e>>2]=c[e>>2]&-2;c[a+(4-p)>>2]=m|1;c[h>>2]=m;i=d;return}s=p>>>3;if(p>>>0<256){e=c[a+(8-p)>>2]|0;n=c[a+(12-p)>>2]|0;o=14360+(s<<1<<2)|0;if((e|0)!=(o|0)){if(e>>>0<q>>>0){Ob()}if((c[e+12>>2]|0)!=(l|0)){Ob()}}if((n|0)==(e|0)){c[3580]=c[3580]&~(1<<s);e=l;n=m;break}if((n|0)!=(o|0)){if(n>>>0<q>>>0){Ob()}o=n+8|0;if((c[o>>2]|0)==(l|0)){r=o}else{Ob()}}else{r=n+8|0}c[e+12>>2]=n;c[r>>2]=e;e=l;n=m;break}r=c[a+(24-p)>>2]|0;t=c[a+(12-p)>>2]|0;do{if((t|0)==(l|0)){u=16-p|0;t=a+(u+4)|0;s=c[t>>2]|0;if((s|0)==0){t=a+u|0;s=c[t>>2]|0;if((s|0)==0){o=0;break}}while(1){u=s+20|0;v=c[u>>2]|0;if((v|0)!=0){s=v;t=u;continue}v=s+16|0;u=c[v>>2]|0;if((u|0)==0){break}else{s=u;t=v}}if(t>>>0<q>>>0){Ob()}else{c[t>>2]=0;o=s;break}}else{s=c[a+(8-p)>>2]|0;if(s>>>0<q>>>0){Ob()}u=s+12|0;if((c[u>>2]|0)!=(l|0)){Ob()}q=t+8|0;if((c[q>>2]|0)==(l|0)){c[u>>2]=t;c[q>>2]=s;o=t;break}else{Ob()}}}while(0);if((r|0)!=0){q=c[a+(28-p)>>2]|0;s=14624+(q<<2)|0;if((l|0)==(c[s>>2]|0)){c[s>>2]=o;if((o|0)==0){c[14324>>2]=c[14324>>2]&~(1<<q);e=l;n=m;break}}else{if(r>>>0<(c[14336>>2]|0)>>>0){Ob()}q=r+16|0;if((c[q>>2]|0)==(l|0)){c[q>>2]=o}else{c[r+20>>2]=o}if((o|0)==0){e=l;n=m;break}}if(o>>>0<(c[14336>>2]|0)>>>0){Ob()}c[o+24>>2]=r;p=16-p|0;q=c[a+p>>2]|0;do{if((q|0)!=0){if(q>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[o+16>>2]=q;c[q+24>>2]=o;break}}}while(0);p=c[a+(p+4)>>2]|0;if((p|0)!=0){if(p>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[o+20>>2]=p;c[p+24>>2]=o;e=l;n=m;break}}else{e=l;n=m}}else{e=l;n=m}}else{e=a;n=b}}while(0);l=c[14336>>2]|0;if(h>>>0<l>>>0){Ob()}m=a+(b+4)|0;o=c[m>>2]|0;if((o&2|0)==0){if((h|0)==(c[14344>>2]|0)){v=(c[14332>>2]|0)+n|0;c[14332>>2]=v;c[14344>>2]=e;c[e+4>>2]=v|1;if((e|0)!=(c[14340>>2]|0)){i=d;return}c[14340>>2]=0;c[14328>>2]=0;i=d;return}if((h|0)==(c[14340>>2]|0)){v=(c[14328>>2]|0)+n|0;c[14328>>2]=v;c[14340>>2]=e;c[e+4>>2]=v|1;c[e+v>>2]=v;i=d;return}n=(o&-8)+n|0;m=o>>>3;do{if(!(o>>>0<256)){k=c[a+(b+24)>>2]|0;m=c[a+(b+12)>>2]|0;do{if((m|0)==(h|0)){o=a+(b+20)|0;m=c[o>>2]|0;if((m|0)==0){o=a+(b+16)|0;m=c[o>>2]|0;if((m|0)==0){j=0;break}}while(1){q=m+20|0;p=c[q>>2]|0;if((p|0)!=0){m=p;o=q;continue}p=m+16|0;q=c[p>>2]|0;if((q|0)==0){break}else{m=q;o=p}}if(o>>>0<l>>>0){Ob()}else{c[o>>2]=0;j=m;break}}else{o=c[a+(b+8)>>2]|0;if(o>>>0<l>>>0){Ob()}l=o+12|0;if((c[l>>2]|0)!=(h|0)){Ob()}p=m+8|0;if((c[p>>2]|0)==(h|0)){c[l>>2]=m;c[p>>2]=o;j=m;break}else{Ob()}}}while(0);if((k|0)!=0){l=c[a+(b+28)>>2]|0;m=14624+(l<<2)|0;if((h|0)==(c[m>>2]|0)){c[m>>2]=j;if((j|0)==0){c[14324>>2]=c[14324>>2]&~(1<<l);break}}else{if(k>>>0<(c[14336>>2]|0)>>>0){Ob()}l=k+16|0;if((c[l>>2]|0)==(h|0)){c[l>>2]=j}else{c[k+20>>2]=j}if((j|0)==0){break}}if(j>>>0<(c[14336>>2]|0)>>>0){Ob()}c[j+24>>2]=k;h=c[a+(b+16)>>2]|0;do{if((h|0)!=0){if(h>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[j+16>>2]=h;c[h+24>>2]=j;break}}}while(0);h=c[a+(b+20)>>2]|0;if((h|0)!=0){if(h>>>0<(c[14336>>2]|0)>>>0){Ob()}else{c[j+20>>2]=h;c[h+24>>2]=j;break}}}}else{j=c[a+(b+8)>>2]|0;a=c[a+(b+12)>>2]|0;b=14360+(m<<1<<2)|0;if((j|0)!=(b|0)){if(j>>>0<l>>>0){Ob()}if((c[j+12>>2]|0)!=(h|0)){Ob()}}if((a|0)==(j|0)){c[3580]=c[3580]&~(1<<m);break}if((a|0)!=(b|0)){if(a>>>0<l>>>0){Ob()}b=a+8|0;if((c[b>>2]|0)==(h|0)){k=b}else{Ob()}}else{k=a+8|0}c[j+12>>2]=a;c[k>>2]=j}}while(0);c[e+4>>2]=n|1;c[e+n>>2]=n;if((e|0)==(c[14340>>2]|0)){c[14328>>2]=n;i=d;return}}else{c[m>>2]=o&-2;c[e+4>>2]=n|1;c[e+n>>2]=n}a=n>>>3;if(n>>>0<256){b=a<<1;h=14360+(b<<2)|0;j=c[3580]|0;a=1<<a;if((j&a|0)!=0){b=14360+(b+2<<2)|0;a=c[b>>2]|0;if(a>>>0<(c[14336>>2]|0)>>>0){Ob()}else{g=b;f=a}}else{c[3580]=j|a;g=14360+(b+2<<2)|0;f=h}c[g>>2]=e;c[f+12>>2]=e;c[e+8>>2]=f;c[e+12>>2]=h;i=d;return}f=n>>>8;if((f|0)!=0){if(n>>>0>16777215){f=31}else{u=(f+1048320|0)>>>16&8;v=f<<u;t=(v+520192|0)>>>16&4;v=v<<t;f=(v+245760|0)>>>16&2;f=14-(t|u|f)+(v<<f>>>15)|0;f=n>>>(f+7|0)&1|f<<1}}else{f=0}a=14624+(f<<2)|0;c[e+28>>2]=f;c[e+20>>2]=0;c[e+16>>2]=0;h=c[14324>>2]|0;g=1<<f;if((h&g|0)==0){c[14324>>2]=h|g;c[a>>2]=e;c[e+24>>2]=a;c[e+12>>2]=e;c[e+8>>2]=e;i=d;return}g=c[a>>2]|0;if((f|0)==31){f=0}else{f=25-(f>>>1)|0}a:do{if((c[g+4>>2]&-8|0)!=(n|0)){f=n<<f;a=g;while(1){h=a+(f>>>31<<2)+16|0;g=c[h>>2]|0;if((g|0)==0){break}if((c[g+4>>2]&-8|0)==(n|0)){break a}else{f=f<<1;a=g}}if(h>>>0<(c[14336>>2]|0)>>>0){Ob()}c[h>>2]=e;c[e+24>>2]=a;c[e+12>>2]=e;c[e+8>>2]=e;i=d;return}}while(0);f=g+8|0;a=c[f>>2]|0;h=c[14336>>2]|0;if(g>>>0<h>>>0){Ob()}if(a>>>0<h>>>0){Ob()}c[a+12>>2]=e;c[f>>2]=e;c[e+8>>2]=a;c[e+12>>2]=g;c[e+24>>2]=0;i=d;return}function Wm(a){a=a|0;var b=0,d=0;b=i;a=(a|0)==0?1:a;while(1){d=Rm(a)|0;if((d|0)!=0){a=6;break}d=c[3704]|0;c[3704]=d+0;if((d|0)==0){a=5;break}wc[d&0]()}if((a|0)==5){d=xb(4)|0;c[d>>2]=14832;ec(d|0,14880,114)}else if((a|0)==6){i=b;return d|0}return 0}function Xm(a){a=a|0;var b=0;b=i;a=Wm(a)|0;i=b;return a|0}function Ym(a){a=a|0;var b=0;b=i;if((a|0)!=0){Sm(a)}i=b;return}function Zm(a){a=a|0;var b=0;b=i;Ym(a);i=b;return}function _m(a){a=a|0;var b=0;b=i;Xa(a|0);Ym(a);i=b;return}function $m(a){a=a|0;var b=0;b=i;Xa(a|0);i=b;return}function an(a){a=a|0;return 14848}function bn(){var a=0;a=xb(4)|0;c[a>>2]=14832;ec(a|0,14880,114)}function cn(b,e,f){b=b|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0.0,s=0,t=0,u=0,v=0,w=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0.0,J=0,K=0.0,L=0.0,M=0.0,N=0.0;g=i;i=i+512|0;k=g;if((e|0)==0){e=24;h=-149}else if((e|0)==2){e=53;h=-1074}else if((e|0)==1){e=53;h=-1074}else{L=0.0;i=g;return+L}n=b+4|0;o=b+100|0;do{j=c[n>>2]|0;if(j>>>0<(c[o>>2]|0)>>>0){c[n>>2]=j+1;z=d[j]|0}else{z=fn(b)|0}}while((Pb(z|0)|0)!=0);do{if((z|0)==43|(z|0)==45){j=1-(((z|0)==45)<<1)|0;m=c[n>>2]|0;if(m>>>0<(c[o>>2]|0)>>>0){c[n>>2]=m+1;z=d[m]|0;break}else{z=fn(b)|0;break}}else{j=1}}while(0);m=0;do{if((z|32|0)!=(a[14896+m|0]|0)){break}do{if(m>>>0<7){p=c[n>>2]|0;if(p>>>0<(c[o>>2]|0)>>>0){c[n>>2]=p+1;z=d[p]|0;break}else{z=fn(b)|0;break}}}while(0);m=m+1|0}while(m>>>0<8);do{if((m|0)==3){q=23}else if((m|0)!=8){p=(f|0)==0;if(!(m>>>0<4|p)){if((m|0)==8){break}else{q=23;break}}a:do{if((m|0)==0){m=0;do{if((z|32|0)!=(a[14912+m|0]|0)){break a}do{if(m>>>0<2){s=c[n>>2]|0;if(s>>>0<(c[o>>2]|0)>>>0){c[n>>2]=s+1;z=d[s]|0;break}else{z=fn(b)|0;break}}}while(0);m=m+1|0}while(m>>>0<3)}}while(0);if((m|0)==3){e=c[n>>2]|0;if(e>>>0<(c[o>>2]|0)>>>0){c[n>>2]=e+1;e=d[e]|0}else{e=fn(b)|0}if((e|0)==40){e=1}else{if((c[o>>2]|0)==0){L=x;i=g;return+L}c[n>>2]=(c[n>>2]|0)+ -1;L=x;i=g;return+L}while(1){h=c[n>>2]|0;if(h>>>0<(c[o>>2]|0)>>>0){c[n>>2]=h+1;h=d[h]|0}else{h=fn(b)|0}if(!((h+ -48|0)>>>0<10|(h+ -65|0)>>>0<26)?!((h+ -97|0)>>>0<26|(h|0)==95):0){break}e=e+1|0}if((h|0)==41){L=x;i=g;return+L}h=(c[o>>2]|0)==0;if(!h){c[n>>2]=(c[n>>2]|0)+ -1}if(p){c[(cc()|0)>>2]=22;en(b,0);L=0.0;i=g;return+L}if((e|0)==0|h){L=x;i=g;return+L}while(1){e=e+ -1|0;c[n>>2]=(c[n>>2]|0)+ -1;if((e|0)==0){r=x;break}}i=g;return+r}else if((m|0)==0){do{if((z|0)==48){m=c[n>>2]|0;if(m>>>0<(c[o>>2]|0)>>>0){c[n>>2]=m+1;m=d[m]|0}else{m=fn(b)|0}if((m|32|0)!=120){if((c[o>>2]|0)==0){z=48;break}c[n>>2]=(c[n>>2]|0)+ -1;z=48;break}k=c[n>>2]|0;if(k>>>0<(c[o>>2]|0)>>>0){c[n>>2]=k+1;A=d[k]|0;w=0}else{A=fn(b)|0;w=0}while(1){if((A|0)==46){q=70;break}else if((A|0)!=48){k=0;m=0;s=0;t=0;v=0;z=0;H=1.0;u=0;r=0.0;break}k=c[n>>2]|0;if(k>>>0<(c[o>>2]|0)>>>0){c[n>>2]=k+1;A=d[k]|0;w=1;continue}else{A=fn(b)|0;w=1;continue}}b:do{if((q|0)==70){k=c[n>>2]|0;if(k>>>0<(c[o>>2]|0)>>>0){c[n>>2]=k+1;A=d[k]|0}else{A=fn(b)|0}if((A|0)==48){s=-1;t=-1;while(1){k=c[n>>2]|0;if(k>>>0<(c[o>>2]|0)>>>0){c[n>>2]=k+1;A=d[k]|0}else{A=fn(b)|0}if((A|0)!=48){k=0;m=0;w=1;v=1;z=0;H=1.0;u=0;r=0.0;break b}J=pn(s|0,t|0,-1,-1)|0;s=J;t=I}}else{k=0;m=0;s=0;t=0;v=1;z=0;H=1.0;u=0;r=0.0}}}while(0);c:while(1){B=A+ -48|0;do{if(!(B>>>0<10)){C=A|32;D=(A|0)==46;if(!((C+ -97|0)>>>0<6|D)){break c}if(D){if((v|0)==0){s=m;t=k;v=1;break}else{A=46;break c}}else{B=(A|0)>57?C+ -87|0:B;q=84;break}}else{q=84}}while(0);if((q|0)==84){q=0;do{if(!((k|0)<0|(k|0)==0&m>>>0<8)){if((k|0)<0|(k|0)==0&m>>>0<14){L=H*.0625;K=L;r=r+L*+(B|0);break}if((B|0)!=0&(z|0)==0){z=1;K=H;r=r+H*.5}else{K=H}}else{K=H;u=B+(u<<4)|0}}while(0);m=pn(m|0,k|0,1,0)|0;k=I;w=1;H=K}A=c[n>>2]|0;if(A>>>0<(c[o>>2]|0)>>>0){c[n>>2]=A+1;A=d[A]|0;continue}else{A=fn(b)|0;continue}}if((w|0)==0){e=(c[o>>2]|0)==0;if(!e){c[n>>2]=(c[n>>2]|0)+ -1}if(!p){if(!e?(l=c[n>>2]|0,c[n>>2]=l+ -1,(v|0)!=0):0){c[n>>2]=l+ -2}}else{en(b,0)}L=+(j|0)*0.0;i=g;return+L}q=(v|0)==0;l=q?m:s;q=q?k:t;if((k|0)<0|(k|0)==0&m>>>0<8){do{u=u<<4;m=pn(m|0,k|0,1,0)|0;k=I}while((k|0)<0|(k|0)==0&m>>>0<8)}do{if((A|32|0)==112){m=dn(b,f)|0;k=I;if((m|0)==0&(k|0)==-2147483648){if(p){en(b,0);L=0.0;i=g;return+L}else{if((c[o>>2]|0)==0){m=0;k=0;break}c[n>>2]=(c[n>>2]|0)+ -1;m=0;k=0;break}}}else{if((c[o>>2]|0)==0){m=0;k=0}else{c[n>>2]=(c[n>>2]|0)+ -1;m=0;k=0}}}while(0);l=tn(l|0,q|0,2)|0;l=pn(l|0,I|0,-32,-1)|0;k=pn(l|0,I|0,m|0,k|0)|0;l=I;if((u|0)==0){L=+(j|0)*0.0;i=g;return+L}if((l|0)>0|(l|0)==0&k>>>0>(0-h|0)>>>0){c[(cc()|0)>>2]=34;L=+(j|0)*1.7976931348623157e+308*1.7976931348623157e+308;i=g;return+L}J=h+ -106|0;G=((J|0)<0)<<31>>31;if((l|0)<(G|0)|(l|0)==(G|0)&k>>>0<J>>>0){c[(cc()|0)>>2]=34;L=+(j|0)*2.2250738585072014e-308*2.2250738585072014e-308;i=g;return+L}if((u|0)>-1){do{u=u<<1;if(!(r>=.5)){H=r}else{H=r+-1.0;u=u|1}r=r+H;k=pn(k|0,l|0,-1,-1)|0;l=I}while((u|0)>-1)}h=on(32,0,h|0,((h|0)<0)<<31>>31|0)|0;h=pn(k|0,l|0,h|0,I|0)|0;J=I;if(0>(J|0)|0==(J|0)&e>>>0>h>>>0){e=(h|0)<0?0:h}if((e|0)<53){H=+(j|0);K=+dc(+(+gn(1.0,84-e|0)),+H);if((e|0)<32&r!=0.0){J=u&1;u=(J^1)+u|0;r=(J|0)==0?0.0:r}}else{H=+(j|0);K=0.0}r=H*r+(K+H*+(u>>>0))-K;if(!(r!=0.0)){c[(cc()|0)>>2]=34}L=+hn(r,k);i=g;return+L}}while(0);m=h+e|0;l=0-m|0;A=0;while(1){if((z|0)==46){q=139;break}else if((z|0)!=48){D=0;B=0;w=0;break}s=c[n>>2]|0;if(s>>>0<(c[o>>2]|0)>>>0){c[n>>2]=s+1;z=d[s]|0;A=1;continue}else{z=fn(b)|0;A=1;continue}}d:do{if((q|0)==139){s=c[n>>2]|0;if(s>>>0<(c[o>>2]|0)>>>0){c[n>>2]=s+1;z=d[s]|0}else{z=fn(b)|0}if((z|0)==48){D=-1;B=-1;while(1){s=c[n>>2]|0;if(s>>>0<(c[o>>2]|0)>>>0){c[n>>2]=s+1;z=d[s]|0}else{z=fn(b)|0}if((z|0)!=48){A=1;w=1;break d}J=pn(D|0,B|0,-1,-1)|0;D=J;B=I}}else{D=0;B=0;w=1}}}while(0);c[k>>2]=0;F=z+ -48|0;G=(z|0)==46;e:do{if(F>>>0<10|G){s=k+496|0;E=0;C=0;v=0;u=0;t=0;while(1){do{if(G){if((w|0)==0){D=E;B=C;w=1}else{break e}}else{G=pn(E|0,C|0,1,0)|0;C=I;J=(z|0)!=48;if((u|0)>=125){if(!J){E=G;break}c[s>>2]=c[s>>2]|1;E=G;break}A=k+(u<<2)|0;if((v|0)!=0){F=z+ -48+((c[A>>2]|0)*10|0)|0}c[A>>2]=F;v=v+1|0;z=(v|0)==9;E=G;A=1;v=z?0:v;u=(z&1)+u|0;t=J?G:t}}while(0);z=c[n>>2]|0;if(z>>>0<(c[o>>2]|0)>>>0){c[n>>2]=z+1;z=d[z]|0}else{z=fn(b)|0}F=z+ -48|0;G=(z|0)==46;if(!(F>>>0<10|G)){q=162;break}}}else{E=0;C=0;v=0;u=0;t=0;q=162}}while(0);if((q|0)==162){q=(w|0)==0;D=q?E:D;B=q?C:B}q=(A|0)!=0;if(q?(z|32|0)==101:0){s=dn(b,f)|0;f=I;do{if((s|0)==0&(f|0)==-2147483648){if(p){en(b,0);L=0.0;i=g;return+L}else{if((c[o>>2]|0)==0){s=0;f=0;break}c[n>>2]=(c[n>>2]|0)+ -1;s=0;f=0;break}}}while(0);D=pn(s|0,f|0,D|0,B|0)|0;B=I}else{if((z|0)>-1?(c[o>>2]|0)!=0:0){c[n>>2]=(c[n>>2]|0)+ -1}}if(!q){c[(cc()|0)>>2]=22;en(b,0);L=0.0;i=g;return+L}b=c[k>>2]|0;if((b|0)==0){L=+(j|0)*0.0;i=g;return+L}do{if((D|0)==(E|0)&(B|0)==(C|0)&((C|0)<0|(C|0)==0&E>>>0<10)){if(!(e>>>0>30)?(b>>>e|0)!=0:0){break}L=+(j|0)*+(b>>>0);i=g;return+L}}while(0);J=(h|0)/-2|0;G=((J|0)<0)<<31>>31;if((B|0)>(G|0)|(B|0)==(G|0)&D>>>0>J>>>0){c[(cc()|0)>>2]=34;L=+(j|0)*1.7976931348623157e+308*1.7976931348623157e+308;i=g;return+L}J=h+ -106|0;G=((J|0)<0)<<31>>31;if((B|0)<(G|0)|(B|0)==(G|0)&D>>>0<J>>>0){c[(cc()|0)>>2]=34;L=+(j|0)*2.2250738585072014e-308*2.2250738585072014e-308;i=g;return+L}if((v|0)!=0){if((v|0)<9){b=k+(u<<2)|0;n=c[b>>2]|0;do{n=n*10|0;v=v+1|0}while((v|0)!=9);c[b>>2]=n}u=u+1|0}do{if((t|0)<9?(t|0)<=(D|0)&(D|0)<18:0){if((D|0)==9){L=+(j|0)*+((c[k>>2]|0)>>>0);i=g;return+L}if((D|0)<9){L=+(j|0)*+((c[k>>2]|0)>>>0)/+(c[14928+(8-D<<2)>>2]|0);i=g;return+L}b=e+27+(ea(D,-3)|0)|0;n=c[k>>2]|0;if((b|0)<=30?(n>>>b|0)!=0:0){break}L=+(j|0)*+(n>>>0)*+(c[14928+(D+ -10<<2)>>2]|0);i=g;return+L}}while(0);b=(D|0)%9|0;if((b|0)==0){n=0;o=0;b=D}else{b=(D|0)>-1?b:b+9|0;f=c[14928+(8-b<<2)>>2]|0;if((u|0)!=0){o=1e9/(f|0)|0;n=0;s=0;q=0;while(1){G=k+(q<<2)|0;p=c[G>>2]|0;J=((p>>>0)/(f>>>0)|0)+s|0;c[G>>2]=J;s=ea((p>>>0)%(f>>>0)|0,o)|0;p=q+1|0;if((q|0)==(n|0)&(J|0)==0){n=p&127;D=D+ -9|0}if((p|0)==(u|0)){break}else{q=p}}if((s|0)!=0){c[k+(u<<2)>>2]=s;u=u+1|0}}else{n=0;u=0}o=0;b=9-b+D|0}f:while(1){f=k+(n<<2)|0;if((b|0)<18){do{q=0;f=u+127|0;while(1){f=f&127;p=k+(f<<2)|0;s=tn(c[p>>2]|0,0,29)|0;s=pn(s|0,I|0,q|0,0)|0;q=I;if(q>>>0>0|(q|0)==0&s>>>0>1e9){J=En(s|0,q|0,1e9,0)|0;s=Fn(s|0,q|0,1e9,0)|0;q=J}else{q=0}c[p>>2]=s;p=(f|0)==(n|0);if(!((f|0)!=(u+127&127|0)|p)){u=(s|0)==0?f:u}if(p){break}else{f=f+ -1|0}}o=o+ -29|0}while((q|0)==0)}else{if((b|0)!=18){break}do{if(!((c[f>>2]|0)>>>0<9007199)){b=18;break f}q=0;p=u+127|0;while(1){p=p&127;s=k+(p<<2)|0;t=tn(c[s>>2]|0,0,29)|0;t=pn(t|0,I|0,q|0,0)|0;q=I;if(q>>>0>0|(q|0)==0&t>>>0>1e9){J=En(t|0,q|0,1e9,0)|0;t=Fn(t|0,q|0,1e9,0)|0;q=J}else{q=0}c[s>>2]=t;s=(p|0)==(n|0);if(!((p|0)!=(u+127&127|0)|s)){u=(t|0)==0?p:u}if(s){break}else{p=p+ -1|0}}o=o+ -29|0}while((q|0)==0)}n=n+127&127;if((n|0)==(u|0)){J=u+127&127;u=k+((u+126&127)<<2)|0;c[u>>2]=c[u>>2]|c[k+(J<<2)>>2];u=J}c[k+(n<<2)>>2]=q;b=b+9|0}g:while(1){f=u+1&127;p=k+((u+127&127)<<2)|0;while(1){s=(b|0)==18;q=(b|0)>27?9:1;while(1){t=0;while(1){v=t+n&127;if((v|0)==(u|0)){t=2;break}z=c[k+(v<<2)>>2]|0;v=c[14920+(t<<2)>>2]|0;if(z>>>0<v>>>0){t=2;break}w=t+1|0;if(z>>>0>v>>>0){break}if((w|0)<2){t=w}else{t=w;break}}if((t|0)==2&s){break g}o=q+o|0;if((n|0)==(u|0)){n=u}else{break}}v=(1<<q)+ -1|0;w=1e9>>>q;s=n;t=0;do{G=k+(n<<2)|0;J=c[G>>2]|0;z=(J>>>q)+t|0;c[G>>2]=z;t=ea(J&v,w)|0;z=(n|0)==(s|0)&(z|0)==0;n=n+1&127;b=z?b+ -9|0:b;s=z?n:s}while((n|0)!=(u|0));if((t|0)==0){n=s;continue}if((f|0)!=(s|0)){break}c[p>>2]=c[p>>2]|1;n=s}c[k+(u<<2)>>2]=t;n=s;u=f}b=n&127;if((b|0)==(u|0)){c[k+(f+ -1<<2)>>2]=0;u=f}H=+((c[k+(b<<2)>>2]|0)>>>0);b=n+1&127;if((b|0)==(u|0)){u=u+1&127;c[k+(u+ -1<<2)>>2]=0}r=+(j|0);K=r*(H*1.0e9+ +((c[k+(b<<2)>>2]|0)>>>0));j=o+53|0;h=j-h|0;if((h|0)<(e|0)){e=(h|0)<0?0:h;b=1}else{b=0}if((e|0)<53){N=+dc(+(+gn(1.0,105-e|0)),+K);M=+wb(+K,+(+gn(1.0,53-e|0)));H=N;L=M;K=N+(K-M)}else{H=0.0;L=0.0}f=n+2&127;if((f|0)!=(u|0)){k=c[k+(f<<2)>>2]|0;do{if(!(k>>>0<5e8)){if(k>>>0>5e8){L=r*.75+L;break}if((n+3&127|0)==(u|0)){L=r*.5+L;break}else{L=r*.75+L;break}}else{if((k|0)==0?(n+3&127|0)==(u|0):0){break}L=r*.25+L}}while(0);if((53-e|0)>1?!(+wb(+L,1.0)!=0.0):0){L=L+1.0}}r=K+L-H;do{if((j&2147483647|0)>(-2-m|0)){if(+T(+r)>=9007199254740992.0){b=(b|0)!=0&(e|0)==(h|0)?0:b;o=o+1|0;r=r*.5}if((o+50|0)<=(l|0)?!((b|0)!=0&L!=0.0):0){break}c[(cc()|0)>>2]=34}}while(0);N=+hn(r,o);i=g;return+N}else{if((c[o>>2]|0)!=0){c[n>>2]=(c[n>>2]|0)+ -1}c[(cc()|0)>>2]=22;en(b,0);N=0.0;i=g;return+N}}}while(0);if((q|0)==23){e=(c[o>>2]|0)==0;if(!e){c[n>>2]=(c[n>>2]|0)+ -1}if(!(m>>>0<4|(f|0)==0|e)){do{c[n>>2]=(c[n>>2]|0)+ -1;m=m+ -1|0}while(m>>>0>3)}}N=+(j|0)*y;i=g;return+N}function dn(a,b){a=a|0;b=b|0;var e=0,f=0,g=0,h=0,j=0,k=0;e=i;f=a+4|0;h=c[f>>2]|0;g=a+100|0;if(h>>>0<(c[g>>2]|0)>>>0){c[f>>2]=h+1;k=d[h]|0}else{k=fn(a)|0}if((k|0)==43|(k|0)==45){h=(k|0)==45|0;j=c[f>>2]|0;if(j>>>0<(c[g>>2]|0)>>>0){c[f>>2]=j+1;k=d[j]|0}else{k=fn(a)|0}if(!((k+ -48|0)>>>0<10|(b|0)==0)?(c[g>>2]|0)!=0:0){c[f>>2]=(c[f>>2]|0)+ -1}}else{h=0}if((k+ -48|0)>>>0>9){if((c[g>>2]|0)==0){j=-2147483648;k=0;I=j;i=e;return k|0}c[f>>2]=(c[f>>2]|0)+ -1;j=-2147483648;k=0;I=j;i=e;return k|0}else{b=0}while(1){b=k+ -48+b|0;j=c[f>>2]|0;if(j>>>0<(c[g>>2]|0)>>>0){c[f>>2]=j+1;k=d[j]|0}else{k=fn(a)|0}if(!((k+ -48|0)>>>0<10&(b|0)<214748364)){break}b=b*10|0}j=((b|0)<0)<<31>>31;if((k+ -48|0)>>>0<10){do{j=Dn(b|0,j|0,10,0)|0;b=I;k=pn(k|0,((k|0)<0)<<31>>31|0,-48,-1)|0;b=pn(k|0,I|0,j|0,b|0)|0;j=I;k=c[f>>2]|0;if(k>>>0<(c[g>>2]|0)>>>0){c[f>>2]=k+1;k=d[k]|0}else{k=fn(a)|0}}while((k+ -48|0)>>>0<10&((j|0)<21474836|(j|0)==21474836&b>>>0<2061584302))}if((k+ -48|0)>>>0<10){do{k=c[f>>2]|0;if(k>>>0<(c[g>>2]|0)>>>0){c[f>>2]=k+1;k=d[k]|0}else{k=fn(a)|0}}while((k+ -48|0)>>>0<10)}if((c[g>>2]|0)!=0){c[f>>2]=(c[f>>2]|0)+ -1}a=(h|0)!=0;f=on(0,0,b|0,j|0)|0;g=a?I:j;k=a?f:b;I=g;i=e;return k|0}function en(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0;d=i;c[a+104>>2]=b;f=c[a+8>>2]|0;e=c[a+4>>2]|0;g=f-e|0;c[a+108>>2]=g;if((b|0)!=0&(g|0)>(b|0)){c[a+100>>2]=e+b;i=d;return}else{c[a+100>>2]=f;i=d;return}}function fn(b){b=b|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0;f=i;k=b+104|0;j=c[k>>2]|0;if(!((j|0)!=0?(c[b+108>>2]|0)>=(j|0):0)){l=3}if((l|0)==3?(e=kn(b)|0,(e|0)>=0):0){k=c[k>>2]|0;j=c[b+8>>2]|0;if((k|0)!=0?(g=c[b+4>>2]|0,h=k-(c[b+108>>2]|0)+ -1|0,(j-g|0)>(h|0)):0){c[b+100>>2]=g+h}else{c[b+100>>2]=j}g=c[b+4>>2]|0;if((j|0)!=0){l=b+108|0;c[l>>2]=j+1-g+(c[l>>2]|0)}b=g+ -1|0;if((d[b]|0|0)==(e|0)){l=e;i=f;return l|0}a[b]=e;l=e;i=f;return l|0}c[b+100>>2]=0;l=-1;i=f;return l|0}function gn(a,b){a=+a;b=b|0;var d=0,e=0;d=i;if((b|0)>1023){a=a*8.98846567431158e+307;e=b+ -1023|0;if((e|0)>1023){b=b+ -2046|0;b=(b|0)>1023?1023:b;a=a*8.98846567431158e+307}else{b=e}}else{if((b|0)<-1022){a=a*2.2250738585072014e-308;e=b+1022|0;if((e|0)<-1022){b=b+2044|0;b=(b|0)<-1022?-1022:b;a=a*2.2250738585072014e-308}else{b=e}}}b=tn(b+1023|0,0,52)|0;e=I;c[k>>2]=b;c[k+4>>2]=e;a=a*+h[k>>3];i=d;return+a}function hn(a,b){a=+a;b=b|0;var c=0;c=i;a=+gn(a,b);i=c;return+a}function jn(b){b=b|0;var d=0,e=0,f=0;e=i;f=b+74|0;d=a[f]|0;a[f]=d+255|d;f=b+20|0;d=b+44|0;if((c[f>>2]|0)>>>0>(c[d>>2]|0)>>>0){kc[c[b+36>>2]&31](b,0,0)|0}c[b+16>>2]=0;c[b+28>>2]=0;c[f>>2]=0;f=c[b>>2]|0;if((f&20|0)==0){f=c[d>>2]|0;c[b+8>>2]=f;c[b+4>>2]=f;f=0;i=e;return f|0}if((f&4|0)==0){f=-1;i=e;return f|0}c[b>>2]=f|32;f=-1;i=e;return f|0}function kn(a){a=a|0;var b=0,e=0;b=i;i=i+16|0;e=b;if((c[a+8>>2]|0)==0?(jn(a)|0)!=0:0){a=-1}else{if((kc[c[a+32>>2]&31](a,e,1)|0)==1){a=d[e]|0}else{a=-1}}i=b;return a|0}function ln(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0.0,g=0,h=0;d=i;i=i+112|0;e=d;h=e+0|0;g=h+112|0;do{c[h>>2]=0;h=h+4|0}while((h|0)<(g|0));g=e+4|0;c[g>>2]=a;h=e+8|0;c[h>>2]=-1;c[e+44>>2]=a;c[e+76>>2]=-1;en(e,0);f=+cn(e,2,1);e=(c[g>>2]|0)-(c[h>>2]|0)+(c[e+108>>2]|0)|0;if((b|0)==0){i=d;return+f}if((e|0)!=0){a=a+e|0}c[b>>2]=a;i=d;return+f}function mn(b,c,d){b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0;e=i;a:do{if((d|0)==0){b=0}else{while(1){g=a[b]|0;f=a[c]|0;if(!(g<<24>>24==f<<24>>24)){break}d=d+ -1|0;if((d|0)==0){b=0;break a}else{b=b+1|0;c=c+1|0}}b=(g&255)-(f&255)|0}}while(0);i=e;return b|0}function nn(){c[728]=o;c[754]=o;c[3492]=o;c[3722]=o}function on(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;b=b-d-(c>>>0>a>>>0|0)>>>0;return(I=b,a-c>>>0|0)|0}function pn(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;c=a+c>>>0;return(I=b+d+(c>>>0<a>>>0|0)>>>0,c|0)|0}function qn(b){b=b|0;var c=0;c=b;while(a[c]|0){c=c+1|0}return c-b|0}function rn(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0;f=b+e|0;if((e|0)>=20){d=d&255;i=b&3;h=d|d<<8|d<<16|d<<24;g=f&~3;if(i){i=b+4-i|0;while((b|0)<(i|0)){a[b]=d;b=b+1|0}}while((b|0)<(g|0)){c[b>>2]=h;b=b+4|0}}while((b|0)<(f|0)){a[b]=d;b=b+1|0}return b-e|0}function sn(b,d,e){b=b|0;d=d|0;e=e|0;var f=0;if((e|0)>=4096)return Oa(b|0,d|0,e|0)|0;f=b|0;if((b&3)==(d&3)){while(b&3){if((e|0)==0)return f|0;a[b]=a[d]|0;b=b+1|0;d=d+1|0;e=e-1|0}while((e|0)>=4){c[b>>2]=c[d>>2];b=b+4|0;d=d+4|0;e=e-4|0}}while((e|0)>0){a[b]=a[d]|0;b=b+1|0;d=d+1|0;e=e-1|0}return f|0}function tn(a,b,c){a=a|0;b=b|0;c=c|0;if((c|0)<32){I=b<<c|(a&(1<<c)-1<<32-c)>>>32-c;return a<<c}I=a<<c-32;return 0}function un(b,c,d){b=b|0;c=c|0;d=d|0;var e=0;if((c|0)<(b|0)&(b|0)<(c+d|0)){e=b;c=c+d|0;b=b+d|0;while((d|0)>0){b=b-1|0;c=c-1|0;d=d-1|0;a[b]=a[c]|0}b=e}else{sn(b,c,d)|0}return b|0}function vn(b,c){b=b|0;c=c|0;var d=0;do{a[b+d|0]=a[c+d|0];d=d+1|0}while(a[c+(d-1)|0]|0);return b|0}function wn(a,b,c){a=a|0;b=b|0;c=c|0;if((c|0)<32){I=b>>>c;return a>>>c|(b&(1<<c)-1)<<32-c}I=0;return b>>>c-32|0}function xn(a,b,c){a=a|0;b=b|0;c=c|0;if((c|0)<32){I=b>>c;return a>>>c|(b&(1<<c)-1)<<32-c}I=(b|0)<0?-1:0;return b>>c-32|0}function yn(b){b=b|0;var c=0;c=a[n+(b>>>24)|0]|0;if((c|0)<8)return c|0;c=a[n+(b>>16&255)|0]|0;if((c|0)<8)return c+8|0;c=a[n+(b>>8&255)|0]|0;if((c|0)<8)return c+16|0;return(a[n+(b&255)|0]|0)+24|0}function zn(b){b=b|0;var c=0;c=a[m+(b&255)|0]|0;if((c|0)<8)return c|0;c=a[m+(b>>8&255)|0]|0;if((c|0)<8)return c+8|0;c=a[m+(b>>16&255)|0]|0;if((c|0)<8)return c+16|0;return(a[m+(b>>>24)|0]|0)+24|0}function An(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0;f=a&65535;d=b&65535;c=ea(d,f)|0;e=a>>>16;d=(c>>>16)+(ea(d,e)|0)|0;b=b>>>16;a=ea(b,f)|0;return(I=(d>>>16)+(ea(b,e)|0)+(((d&65535)+a|0)>>>16)|0,d+a<<16|c&65535|0)|0}function Bn(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0;e=b>>31|((b|0)<0?-1:0)<<1;f=((b|0)<0?-1:0)>>31|((b|0)<0?-1:0)<<1;g=d>>31|((d|0)<0?-1:0)<<1;h=((d|0)<0?-1:0)>>31|((d|0)<0?-1:0)<<1;a=on(e^a,f^b,e,f)|0;b=I;e=g^e;f=h^f;g=on((Gn(a,b,on(g^c,h^d,g,h)|0,I,0)|0)^e,I^f,e,f)|0;return g|0}function Cn(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0;g=i;i=i+8|0;f=g|0;h=b>>31|((b|0)<0?-1:0)<<1;j=((b|0)<0?-1:0)>>31|((b|0)<0?-1:0)<<1;k=e>>31|((e|0)<0?-1:0)<<1;l=((e|0)<0?-1:0)>>31|((e|0)<0?-1:0)<<1;a=on(h^a,j^b,h,j)|0;b=I;Gn(a,b,on(k^d,l^e,k,l)|0,I,f)|0;k=on(c[f>>2]^h,c[f+4>>2]^j,h,j)|0;j=I;i=g;return(I=j,k)|0}function Dn(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0;e=a;f=c;a=An(e,f)|0;c=I;return(I=(ea(b,f)|0)+(ea(d,e)|0)+c|c&0,a|0|0)|0}function En(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;a=Gn(a,b,c,d,0)|0;return a|0}function Fn(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0;g=i;i=i+8|0;f=g|0;Gn(a,b,d,e,f)|0;i=g;return(I=c[f+4>>2]|0,c[f>>2]|0)|0}function Gn(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0;h=a;j=b;i=j;k=d;g=e;l=g;if((i|0)==0){d=(f|0)!=0;if((l|0)==0){if(d){c[f>>2]=(h>>>0)%(k>>>0);c[f+4>>2]=0}l=0;m=(h>>>0)/(k>>>0)>>>0;return(I=l,m)|0}else{if(!d){l=0;m=0;return(I=l,m)|0}c[f>>2]=a|0;c[f+4>>2]=b&0;l=0;m=0;return(I=l,m)|0}}m=(l|0)==0;do{if((k|0)!=0){if(!m){k=(yn(l|0)|0)-(yn(i|0)|0)|0;if(k>>>0<=31){l=k+1|0;m=31-k|0;b=k-31>>31;j=l;a=h>>>(l>>>0)&b|i<<m;b=i>>>(l>>>0)&b;l=0;i=h<<m;break}if((f|0)==0){l=0;m=0;return(I=l,m)|0}c[f>>2]=a|0;c[f+4>>2]=j|b&0;l=0;m=0;return(I=l,m)|0}l=k-1|0;if((l&k|0)!=0){m=(yn(k|0)|0)+33-(yn(i|0)|0)|0;p=64-m|0;k=32-m|0;n=k>>31;o=m-32|0;b=o>>31;j=m;a=k-1>>31&i>>>(o>>>0)|(i<<k|h>>>(m>>>0))&b;b=b&i>>>(m>>>0);l=h<<p&n;i=(i<<p|h>>>(o>>>0))&n|h<<k&m-33>>31;break}if((f|0)!=0){c[f>>2]=l&h;c[f+4>>2]=0}if((k|0)==1){o=j|b&0;p=a|0|0;return(I=o,p)|0}else{p=zn(k|0)|0;o=i>>>(p>>>0)|0;p=i<<32-p|h>>>(p>>>0)|0;return(I=o,p)|0}}else{if(m){if((f|0)!=0){c[f>>2]=(i>>>0)%(k>>>0);c[f+4>>2]=0}o=0;p=(i>>>0)/(k>>>0)>>>0;return(I=o,p)|0}if((h|0)==0){if((f|0)!=0){c[f>>2]=0;c[f+4>>2]=(i>>>0)%(l>>>0)}o=0;p=(i>>>0)/(l>>>0)>>>0;return(I=o,p)|0}k=l-1|0;if((k&l|0)==0){if((f|0)!=0){c[f>>2]=a|0;c[f+4>>2]=k&i|b&0}o=0;p=i>>>((zn(l|0)|0)>>>0);return(I=o,p)|0}k=(yn(l|0)|0)-(yn(i|0)|0)|0;if(k>>>0<=30){b=k+1|0;p=31-k|0;j=b;a=i<<p|h>>>(b>>>0);b=i>>>(b>>>0);l=0;i=h<<p;break}if((f|0)==0){o=0;p=0;return(I=o,p)|0}c[f>>2]=a|0;c[f+4>>2]=j|b&0;o=0;p=0;return(I=o,p)|0}}while(0);if((j|0)==0){m=a;d=0;a=0}else{d=d|0|0;g=g|e&0;e=pn(d,g,-1,-1)|0;h=I;k=b;m=a;a=0;while(1){b=l>>>31|i<<1;l=a|l<<1;i=m<<1|i>>>31|0;k=m>>>31|k<<1|0;on(e,h,i,k)|0;m=I;p=m>>31|((m|0)<0?-1:0)<<1;a=p&1;m=on(i,k,p&d,(((m|0)<0?-1:0)>>31|((m|0)<0?-1:0)<<1)&g)|0;k=I;j=j-1|0;if((j|0)==0){break}else{i=b}}i=b;b=k;d=0}g=0;if((f|0)!=0){c[f>>2]=m;c[f+4>>2]=b}o=(l|0)>>>31|(i|g)<<1|(g<<1|l>>>31)&0|d;p=(l<<1|0>>>31)&-2|a;return(I=o,p)|0}function Hn(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;return kc[a&31](b|0,c|0,d|0)|0}function In(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;lc[a&15](b|0,c|0,d|0,e|0,f|0,g|0)}function Jn(a,b,c,d,e,f,g,h){a=a|0;b=b|0;c=c|0;d=d|0;e=+e;f=+f;g=+g;h=+h;mc[a&3](b|0,c|0,d|0,+e,+f,+g,+h)}function Kn(a,b,c,d,e,f,g,h){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;nc[a&63](b|0,c|0,d|0,e|0,f|0,g|0,h|0)}function Ln(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=+e;f=+f;oc[a&3](b|0,c|0,d|0,+e,+f)}function Mn(a,b){a=a|0;b=b|0;pc[a&255](b|0)}function Nn(a,b,c){a=a|0;b=b|0;c=c|0;qc[a&63](b|0,c|0)}function On(a,b,c,d,e,f,g,h,i,j){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;rc[a&3](b|0,c|0,d|0,e|0,f|0,g|0,h|0,i|0,j|0)}function Pn(a,b){a=a|0;b=b|0;return sc[a&127](b|0)|0}function Qn(a,b,c,d,e,f,g,h){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=+h;tc[a&3](b|0,c|0,d|0,e|0,f|0,g|0,+h)}function Rn(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;uc[a&7](b|0,c|0,d|0)}function Sn(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=+g;vc[a&7](b|0,c|0,d|0,e|0,f|0,+g)}function Tn(a){a=a|0;wc[a&0]()}function Un(a,b,c,d,e,f,g,h,i){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;return xc[a&15](b|0,c|0,d|0,e|0,f|0,g|0,h|0,i|0)|0}function Vn(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return yc[a&7](b|0,c|0,d|0,e|0)|0}function Wn(a,b,c,d,e,f,g,h,i){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;zc[a&7](b|0,c|0,d|0,e|0,f|0,g|0,h|0,i|0)}function Xn(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;Ac[a&3](b|0,c|0,d|0,e|0,f|0)}function Yn(a,b,c){a=a|0;b=b|0;c=c|0;return Bc[a&15](b|0,c|0)|0}function Zn(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return Cc[a&15](b|0,c|0,d|0,e|0,f|0)|0}function _n(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;Dc[a&15](b|0,c|0,d|0,e|0)}function $n(a,b,c){a=a|0;b=b|0;c=c|0;fa(0);return 0}function ao(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;fa(1)}function bo(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=+d;e=+e;f=+f;g=+g;fa(2)}function co(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;fa(3)}function eo(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=+d;e=+e;fa(4)}function fo(a){a=a|0;fa(5)}function go(a,b){a=a|0;b=b|0;fa(6)}function ho(a,b,c,d,e,f,g,h,i){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;fa(7)}function io(a){a=a|0;fa(8);return 0}function jo(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=+g;fa(9)}function ko(a,b,c){a=a|0;b=b|0;c=c|0;fa(10)}function lo(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=+f;fa(11)}function mo(){fa(12)}function no(a,b,c,d,e,f,g,h){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;fa(13);return 0}function oo(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;fa(14);return 0}function po(a,b,c,d,e,f,g,h){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;fa(15)}function qo(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;fa(16)}function ro(a,b){a=a|0;b=b|0;fa(17);return 0}function so(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;fa(18);return 0}function to(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;fa(19)}




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


