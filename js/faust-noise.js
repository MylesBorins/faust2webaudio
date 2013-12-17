/*
faust2webaduio

Primarily written by Myles Borins
During the Spring 2013 offering of Music 420b
A Special thanks 

faust2webaudio is distributed under the terms the MIT or GPL2 Licenses. 
Choose the license that best suits your project. The text of the MIT and GPL 
licenses are at the root directory. 

*/
// Note: Some Emscripten settings will significantly limit the speed of the generated code.
// Note: Some Emscripten settings may limit the speed of the generated code.
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
if (!Module) Module = eval('(function() { try { return Module || {} } catch(e) { return {} } })()');
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
  Module['print'] = function print(x) {
    process['stdout'].write(x + '\n');
  };
  Module['printErr'] = function printErr(x) {
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
  Module['print'] = print;
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
    Module['print'] = function print(x) {
      console.log(x);
    };
    Module['printErr'] = function printErr(x) {
      console.log(x);
    };
  } else {
    // Probably a worker, and without console.log. We can do very little here...
    var TRY_USE_DUMP = false;
    Module['print'] = (TRY_USE_DUMP && (typeof(dump) !== "undefined") ? (function(x) {
      dump(x);
    }) : (function(x) {
      // self.postMessage(x); // enable this if you want stdout to be sent as messages
    }));
  }
  if (ENVIRONMENT_IS_WEB) {
    this['Module'] = Module;
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
  if (/<?{ ?[^}]* ?}>?/.test(type)) return true; // { i32, i8 } etc. - anonymous struct types
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
    if (vararg) return 8;
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
    if (type.name_[0] === '[') {
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
      assert(args.length == sig.length-1);
      return FUNCTION_TABLE[ptr].apply(null, args);
    } else {
      assert(sig.length == 1);
      return FUNCTION_TABLE[ptr]();
    }
  },
  addFunction: function (func) {
    var table = FUNCTION_TABLE;
    var ret = table.length;
    assert(ret % 2 === 0);
    table.push(func);
    for (var i = 0; i < 2-1; i++) table.push(0);
    return ret;
  },
  removeFunction: function (index) {
    var table = FUNCTION_TABLE;
    table[index] = null;
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
    return Runtime.asmConstCache[code] = eval('(function(' + args.join(',') + '){ ' + Pointer_stringify(code) + ' })'); // new Function does not allow upvars in node
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
      string = unescape(encodeURIComponent(string));
      var ret = [];
      for (var i = 0; i < string.length; i++) {
        ret.push(string.charCodeAt(i));
      }
      return ret;
    }
  },
  stackAlloc: function (size) { var ret = STACKTOP;STACKTOP = (STACKTOP + size)|0;STACKTOP = (((STACKTOP)+7)&-8);(assert((STACKTOP|0) < (STACK_MAX|0))|0); return ret; },
  staticAlloc: function (size) { var ret = STATICTOP;STATICTOP = (STATICTOP + (assert(!staticSealed),size))|0;STATICTOP = (((STATICTOP)+7)&-8); return ret; },
  dynamicAlloc: function (size) { var ret = DYNAMICTOP;DYNAMICTOP = (DYNAMICTOP + (assert(DYNAMICTOP > 0),size))|0;DYNAMICTOP = (((DYNAMICTOP)+7)&-8); if (DYNAMICTOP >= TOTAL_MEMORY) enlargeMemory();; return ret; },
  alignMemory: function (size,quantum) { var ret = size = Math.ceil((size)/(quantum ? quantum : 8))*(quantum ? quantum : 8); return ret; },
  makeBigInt: function (low,high,unsigned) { var ret = (unsigned ? ((low>>>0)+((high>>>0)*4294967296)) : ((low>>>0)+((high|0)*4294967296))); return ret; },
  GLOBAL_BASE: 8,
  QUANTUM_SIZE: 4,
  __dummy__: 0
}
//========================================
// Runtime essentials
//========================================
var __THREW__ = 0; // Used in checking for thrown exceptions.
var setjmpId = 1; // Used in setjmp/longjmp
var setjmpLabels = {};
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
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,Math_abs(tempDouble) >= 1 ? (tempDouble > 0 ? Math_min(Math_floor((tempDouble)/4294967296), 4294967295)>>>0 : (~~(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296)))>>>0) : 0)],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
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
    assert(type, 'Must know what type to store in allocate!');
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
    assert(ptr + i < TOTAL_MEMORY);
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
    assert(ptr + i < TOTAL_MEMORY);
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
  try {
    if (typeof func === 'number') func = Pointer_stringify(func);
    if (func[0] !== '_') return func;
    if (func[1] !== '_') return func; // C function
    if (func[2] !== 'Z') return func;
    switch (func[3]) {
      case 'n': return 'operator new()';
      case 'd': return 'operator delete()';
    }
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
    function dump(x) {
      //return;
      if (x) Module.print(x);
      Module.print(func);
      var pre = '';
      for (var a = 0; a < i; a++) pre += ' ';
      Module.print (pre + '^');
    }
    var subs = [];
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
    var first = true;
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
      return rawList ? list : ret + flushList();
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
// Initialize the runtime's memory
// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(typeof Int32Array !== 'undefined' && typeof Float64Array !== 'undefined' && !!(new Int32Array(1)['subarray']) && !!(new Int32Array(1)['set']),
       'Cannot fallback to non-typed array case: Code is too specialized');
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
        assert(false, 'Character code ' + chr + ' (' + String.fromCharCode(chr) + ')  at offset ' + i + ' not in 0x00-0xFF.');
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
    assert(str.charCodeAt(i) === str.charCodeAt(i)&0xff);
    HEAP8[(((buffer)+(i))|0)]=str.charCodeAt(i);
  }
  if (!dontAddNull) HEAP8[(((buffer)+(str.length))|0)]=0;
}
Module['writeAsciiToMemory'] = writeAsciiToMemory;
function unSign(value, bits, ignore, sig) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore, sig) {
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
if (!Math['imul']) Math['imul'] = function imul(a, b) {
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
var runDependencyTracking = {};
function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(!runDependencyTracking[id]);
    runDependencyTracking[id] = 1;
    if (runDependencyWatcher === null && typeof setInterval !== 'undefined') {
      // Check for missing dependencies every few seconds
      runDependencyWatcher = setInterval(function() {
        var shown = false;
        for (var dep in runDependencyTracking) {
          if (!shown) {
            shown = true;
            Module.printErr('still waiting on run dependencies:');
          }
          Module.printErr('dependency: ' + dep);
        }
        if (shown) {
          Module.printErr('(end of list)');
        }
      }, 10000);
    }
  } else {
    Module.printErr('warning: run dependency added without ID');
  }
}
Module['addRunDependency'] = addRunDependency;
function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(runDependencyTracking[id]);
    delete runDependencyTracking[id];
  } else {
    Module.printErr('warning: run dependency removed without ID');
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
STATIC_BASE = 8;
STATICTOP = STATIC_BASE + 952;
/* global initializers */ __ATINIT__.push({ func: function() { runPostSets() } });
var __ZTVN10__cxxabiv120__si_class_type_infoE;
__ZTVN10__cxxabiv120__si_class_type_infoE=allocate([0,0,0,0,128,1,0,0,26,0,0,0,46,0,0,0,36,0,0,0,50,0,0,0,42,0,0,0,8,0,0,0,20,0,0,0,56,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_STATIC);
var __ZTVN10__cxxabiv117__class_type_infoE;
__ZTVN10__cxxabiv117__class_type_infoE=allocate([0,0,0,0,144,1,0,0,26,0,0,0,14,0,0,0,36,0,0,0,50,0,0,0,42,0,0,0,30,0,0,0,38,0,0,0,44,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_STATIC);
/* memory initializer */ allocate([115,116,100,58,58,98,97,100,95,97,108,108,111,99,0,0,110,111,105,115,101,0,0,0,0,0,0,0,112,1,0,0,28,0,0,0,10,0,0,0,18,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,176,1,0,0,6,0,0,0,48,0,0,0,40,0,0,0,22,0,0,0,24,0,0,0,4,0,0,0,16,0,0,0,34,0,0,0,32,0,0,0,52,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,192,1,0,0,2,0,0,0,12,0,0,0,54,0,0,0,54,0,0,0,54,0,0,0,54,0,0,0,54,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,83,116,57,116,121,112,101,95,105,110,102,111,0,0,0,0,83,116,57,101,120,99,101,112,116,105,111,110,0,0,0,0,83,116,57,98,97,100,95,97,108,108,111,99,0,0,0,0,78,49,48,95,95,99,120,120,97,98,105,118,49,50,48,95,95,115,105,95,99,108,97,115,115,95,116,121,112,101,95,105,110,102,111,69,0,0,0,0,78,49,48,95,95,99,120,120,97,98,105,118,49,49,55,95,95,99,108,97,115,115,95,116,121,112,101,95,105,110,102,111,69,0,0,0,0,0,0,0,78,49,48,95,95,99,120,120,97,98,105,118,49,49,54,95,95,115,104,105,109,95,116,121,112,101,95,105,110,102,111,69,0,0,0,0,0,0,0,0,53,78,111,105,115,101,0,0,51,100,115,112,0,0,0,0,0,0,0,0,168,0,0,0,0,0,0,0,184,0,0,0,0,0,0,0,200,0,0,0,104,1,0,0,0,0,0,0,0,0,0,0,216,0,0,0,144,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,160,1,0,0,0,0,0,0,0,0,0,0,40,1,0,0,96,1,0,0,0,0,0,0,0,0,0,0,80,1,0,0,192,1,0,0,0,0,0,0,0,0,0,0,88,1,0,0], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE)
function runPostSets() {
HEAP32[((352 )>>2)]=(((__ZTVN10__cxxabiv117__class_type_infoE+8)|0));
HEAP32[((360 )>>2)]=(((__ZTVN10__cxxabiv117__class_type_infoE+8)|0));
HEAP32[((368 )>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((384 )>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((400 )>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((416 )>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((432 )>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((448 )>>2)]=(((__ZTVN10__cxxabiv117__class_type_infoE+8)|0));
}
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
  function _memset(ptr, value, num) {
      ptr = ptr|0; value = value|0; num = num|0;
      var stop = 0, value4 = 0, stop4 = 0, unaligned = 0;
      stop = (ptr + num)|0;
      if ((num|0) >= 20) {
        // This is unaligned, but quite large, so work hard to get to aligned settings
        value = value & 0xff;
        unaligned = ptr & 3;
        value4 = value | (value << 8) | (value << 16) | (value << 24);
        stop4 = stop & ~3;
        if (unaligned) {
          unaligned = (ptr + 4 - unaligned)|0;
          while ((ptr|0) < (unaligned|0)) { // no need to check for stop, since we have large num
            HEAP8[(ptr)]=value;
            ptr = (ptr+1)|0;
          }
        }
        while ((ptr|0) < (stop4|0)) {
          HEAP32[((ptr)>>2)]=value4;
          ptr = (ptr+4)|0;
        }
      }
      while ((ptr|0) < (stop|0)) {
        HEAP8[(ptr)]=value;
        ptr = (ptr+1)|0;
      }
      return (ptr-num)|0;
    }var _llvm_memset_p0i8_i32=_memset;
  function ___gxx_personality_v0() {
    }
  function ___cxa_pure_virtual() {
      ABORT = true;
      throw 'Pure virtual function called!';
    }
  var _llvm_memset_p0i8_i64=_memset;
  function _abort() {
      Module['abort']();
    }
  var ___errno_state=0;function ___setErrNo(value) {
      // For convenient setting and returning of errno.
      HEAP32[((___errno_state)>>2)]=value
      return value;
    }function ___errno_location() {
      return ___errno_state;
    }
  function _memcpy(dest, src, num) {
      dest = dest|0; src = src|0; num = num|0;
      var ret = 0;
      ret = dest|0;
      if ((dest&3) == (src&3)) {
        while (dest & 3) {
          if ((num|0) == 0) return ret|0;
          HEAP8[(dest)]=HEAP8[(src)];
          dest = (dest+1)|0;
          src = (src+1)|0;
          num = (num-1)|0;
        }
        while ((num|0) >= 4) {
          HEAP32[((dest)>>2)]=HEAP32[((src)>>2)];
          dest = (dest+4)|0;
          src = (src+4)|0;
          num = (num-4)|0;
        }
      }
      while ((num|0) > 0) {
        HEAP8[(dest)]=HEAP8[(src)];
        dest = (dest+1)|0;
        src = (src+1)|0;
        num = (num-1)|0;
      }
      return ret|0;
    }var _llvm_memcpy_p0i8_p0i8_i32=_memcpy;
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
  var ERRNO_CODES={EPERM:1,ENOENT:2,ESRCH:3,EINTR:4,EIO:5,ENXIO:6,E2BIG:7,ENOEXEC:8,EBADF:9,ECHILD:10,EAGAIN:11,EWOULDBLOCK:11,ENOMEM:12,EACCES:13,EFAULT:14,ENOTBLK:15,EBUSY:16,EEXIST:17,EXDEV:18,ENODEV:19,ENOTDIR:20,EISDIR:21,EINVAL:22,ENFILE:23,EMFILE:24,ENOTTY:25,ETXTBSY:26,EFBIG:27,ENOSPC:28,ESPIPE:29,EROFS:30,EMLINK:31,EPIPE:32,EDOM:33,ERANGE:34,ENOMSG:42,EIDRM:43,ECHRNG:44,EL2NSYNC:45,EL3HLT:46,EL3RST:47,ELNRNG:48,EUNATCH:49,ENOCSI:50,EL2HLT:51,EDEADLK:35,ENOLCK:37,EBADE:52,EBADR:53,EXFULL:54,ENOANO:55,EBADRQC:56,EBADSLT:57,EDEADLOCK:35,EBFONT:59,ENOSTR:60,ENODATA:61,ETIME:62,ENOSR:63,ENONET:64,ENOPKG:65,EREMOTE:66,ENOLINK:67,EADV:68,ESRMNT:69,ECOMM:70,EPROTO:71,EMULTIHOP:72,EDOTDOT:73,EBADMSG:74,ENOTUNIQ:76,EBADFD:77,EREMCHG:78,ELIBACC:79,ELIBBAD:80,ELIBSCN:81,ELIBMAX:82,ELIBEXEC:83,ENOSYS:38,ENOTEMPTY:39,ENAMETOOLONG:36,ELOOP:40,EOPNOTSUPP:95,EPFNOSUPPORT:96,ECONNRESET:104,ENOBUFS:105,EAFNOSUPPORT:97,EPROTOTYPE:91,ENOTSOCK:88,ENOPROTOOPT:92,ESHUTDOWN:108,ECONNREFUSED:111,EADDRINUSE:98,ECONNABORTED:103,ENETUNREACH:101,ENETDOWN:100,ETIMEDOUT:110,EHOSTDOWN:112,EHOSTUNREACH:113,EINPROGRESS:115,EALREADY:114,EDESTADDRREQ:89,EMSGSIZE:90,EPROTONOSUPPORT:93,ESOCKTNOSUPPORT:94,EADDRNOTAVAIL:99,ENETRESET:102,EISCONN:106,ENOTCONN:107,ETOOMANYREFS:109,EUSERS:87,EDQUOT:122,ESTALE:116,ENOTSUP:95,ENOMEDIUM:123,EILSEQ:84,EOVERFLOW:75,ECANCELED:125,ENOTRECOVERABLE:131,EOWNERDEAD:130,ESTRPIPE:86};function _sysconf(name) {
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
  function _time(ptr) {
      var ret = Math.floor(Date.now()/1000);
      if (ptr) {
        HEAP32[((ptr)>>2)]=ret
      }
      return ret;
    }
  function ___cxa_allocate_exception(size) {
      return _malloc(size);
    }
  function _llvm_eh_exception() {
      return HEAP32[((_llvm_eh_exception.buf)>>2)];
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
  function ___resumeException(ptr) {
      if (HEAP32[((_llvm_eh_exception.buf)>>2)] == 0) HEAP32[((_llvm_eh_exception.buf)>>2)]=ptr;
      throw ptr;;
    }function ___cxa_find_matching_catch(thrown, throwntype) {
      if (thrown == -1) thrown = HEAP32[((_llvm_eh_exception.buf)>>2)];
      if (throwntype == -1) throwntype = HEAP32[(((_llvm_eh_exception.buf)+(4))>>2)];
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
          return tempRet0 = typeArray[i],thrown;
      }
      // Shouldn't happen unless we have bogus data in typeArray
      // or encounter a type for which emscripten doesn't have suitable
      // typeinfo defined. Best-efforts match just in case.
      return tempRet0 = throwntype,thrown;
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
      HEAP32[((_llvm_eh_exception.buf)>>2)]=ptr
      HEAP32[(((_llvm_eh_exception.buf)+(4))>>2)]=type
      HEAP32[(((_llvm_eh_exception.buf)+(8))>>2)]=destructor
      if (!("uncaught_exception" in __ZSt18uncaught_exceptionv)) {
        __ZSt18uncaught_exceptionv.uncaught_exception = 1;
      } else {
        __ZSt18uncaught_exceptionv.uncaught_exception++;
      }
      throw ptr;;
    }
  function ___cxa_call_unexpected(exception) {
      Module.printErr('Unexpected exception thrown, this is not properly supported - aborting');
      ABORT = true;
      throw exception;
    }
  function _strlen(ptr) {
      ptr = ptr|0;
      var curr = 0;
      curr = ptr;
      while (HEAP8[(curr)]) {
        curr = (curr + 1)|0;
      }
      return (curr - ptr)|0;
    }
  var ERRNO_MESSAGES={0:"Success",1:"Not super-user",2:"No such file or directory",3:"No such process",4:"Interrupted system call",5:"I/O error",6:"No such device or address",7:"Arg list too long",8:"Exec format error",9:"Bad file number",10:"No children",11:"No more processes",12:"Not enough core",13:"Permission denied",14:"Bad address",15:"Block device required",16:"Mount device busy",17:"File exists",18:"Cross-device link",19:"No such device",20:"Not a directory",21:"Is a directory",22:"Invalid argument",23:"Too many open files in system",24:"Too many open files",25:"Not a typewriter",26:"Text file busy",27:"File too large",28:"No space left on device",29:"Illegal seek",30:"Read only file system",31:"Too many links",32:"Broken pipe",33:"Math arg out of domain of func",34:"Math result not representable",35:"File locking deadlock error",36:"File or path name too long",37:"No record locks available",38:"Function not implemented",39:"Directory not empty",40:"Too many symbolic links",42:"No message of desired type",43:"Identifier removed",44:"Channel number out of range",45:"Level 2 not synchronized",46:"Level 3 halted",47:"Level 3 reset",48:"Link number out of range",49:"Protocol driver not attached",50:"No CSI structure available",51:"Level 2 halted",52:"Invalid exchange",53:"Invalid request descriptor",54:"Exchange full",55:"No anode",56:"Invalid request code",57:"Invalid slot",59:"Bad font file fmt",60:"Device not a stream",61:"No data (for no delay io)",62:"Timer expired",63:"Out of streams resources",64:"Machine is not on the network",65:"Package not installed",66:"The object is remote",67:"The link has been severed",68:"Advertise error",69:"Srmount error",70:"Communication error on send",71:"Protocol error",72:"Multihop attempted",73:"Cross mount point (not really error)",74:"Trying to read unreadable message",75:"Value too large for defined data type",76:"Given log. name not unique",77:"f.d. invalid for this operation",78:"Remote address changed",79:"Can   access a needed shared lib",80:"Accessing a corrupted shared lib",81:".lib section in a.out corrupted",82:"Attempting to link in too many libs",83:"Attempting to exec a shared library",84:"Illegal byte sequence",86:"Streams pipe error",87:"Too many users",88:"Socket operation on non-socket",89:"Destination address required",90:"Message too long",91:"Protocol wrong type for socket",92:"Protocol not available",93:"Unknown protocol",94:"Socket type not supported",95:"Not supported",96:"Protocol family not supported",97:"Address family not supported by protocol family",98:"Address already in use",99:"Address not available",100:"Network interface is not configured",101:"Network is unreachable",102:"Connection reset by network",103:"Connection aborted",104:"Connection reset by peer",105:"No buffer space available",106:"Socket is already connected",107:"Socket is not connected",108:"Can't send after socket shutdown",109:"Too many references",110:"Connection timed out",111:"Connection refused",112:"Host is down",113:"Host is unreachable",114:"Socket already connected",115:"Connection already in progress",116:"Stale file handle",122:"Quota exceeded",123:"No medium (in tape drive)",125:"Operation canceled",130:"Previous owner died",131:"State not recoverable"};
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
        return MEMFS.createNode(null, '/', 16384 | 0777, 0);
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
          var node = MEMFS.createNode(parent, newname, 0777 | 40960, 0);
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
            assert(buffer.length);
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
      },DB_VERSION:20,DB_STORE_NAME:"FILE_DATA",mount:function (mount) {
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
      },reconcile:function (src, dst, callback) {
        var total = 0;
        var create = {};
        for (var key in src.files) {
          if (!src.files.hasOwnProperty(key)) continue;
          var e = src.files[key];
          var e2 = dst.files[key];
          if (!e2 || e.timestamp > e2.timestamp) {
            create[key] = e;
            total++;
          }
        }
        var remove = {};
        for (var key in dst.files) {
          if (!dst.files.hasOwnProperty(key)) continue;
          var e = dst.files[key];
          var e2 = src.files[key];
          if (!e2) {
            remove[key] = e;
            total++;
          }
        }
        if (!total) {
          // early out
          return callback(null);
        }
        var completed = 0;
        function done(err) {
          if (err) return callback(err);
          if (++completed >= total) {
            return callback(null);
          }
        };
        // create a single transaction to handle and IDB reads / writes we'll need to do
        var db = src.type === 'remote' ? src.db : dst.db;
        var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readwrite');
        transaction.onerror = function transaction_onerror() { callback(this.error); };
        var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
        for (var path in create) {
          if (!create.hasOwnProperty(path)) continue;
          var entry = create[path];
          if (dst.type === 'local') {
            // save file to local
            try {
              if (FS.isDir(entry.mode)) {
                FS.mkdir(path, entry.mode);
              } else if (FS.isFile(entry.mode)) {
                var stream = FS.open(path, 'w+', 0666);
                FS.write(stream, entry.contents, 0, entry.contents.length, 0, true /* canOwn */);
                FS.close(stream);
              }
              done(null);
            } catch (e) {
              return done(e);
            }
          } else {
            // save file to IDB
            var req = store.put(entry, path);
            req.onsuccess = function req_onsuccess() { done(null); };
            req.onerror = function req_onerror() { done(this.error); };
          }
        }
        for (var path in remove) {
          if (!remove.hasOwnProperty(path)) continue;
          var entry = remove[path];
          if (dst.type === 'local') {
            // delete file from local
            try {
              if (FS.isDir(entry.mode)) {
                // TODO recursive delete?
                FS.rmdir(path);
              } else if (FS.isFile(entry.mode)) {
                FS.unlink(path);
              }
              done(null);
            } catch (e) {
              return done(e);
            }
          } else {
            // delete file from IDB
            var req = store.delete(path);
            req.onsuccess = function req_onsuccess() { done(null); };
            req.onerror = function req_onerror() { done(this.error); };
          }
        }
      },getLocalSet:function (mount, callback) {
        var files = {};
        function isRealDir(p) {
          return p !== '.' && p !== '..';
        };
        function toAbsolute(root) {
          return function(p) {
            return PATH.join2(root, p);
          }
        };
        var check = FS.readdir(mount.mountpoint)
          .filter(isRealDir)
          .map(toAbsolute(mount.mountpoint));
        while (check.length) {
          var path = check.pop();
          var stat, node;
          try {
            var lookup = FS.lookupPath(path);
            node = lookup.node;
            stat = FS.stat(path);
          } catch (e) {
            return callback(e);
          }
          if (FS.isDir(stat.mode)) {
            check.push.apply(check, FS.readdir(path)
              .filter(isRealDir)
              .map(toAbsolute(path)));
            files[path] = { mode: stat.mode, timestamp: stat.mtime };
          } else if (FS.isFile(stat.mode)) {
            files[path] = { contents: node.contents, mode: stat.mode, timestamp: stat.mtime };
          } else {
            return callback(new Error('node type not supported'));
          }
        }
        return callback(null, { type: 'local', files: files });
      },getDB:function (name, callback) {
        // look it up in the cache
        var db = IDBFS.dbs[name];
        if (db) {
          return callback(null, db);
        }
        var req;
        try {
          req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        req.onupgradeneeded = function req_onupgradeneeded() {
          db = req.result;
          db.createObjectStore(IDBFS.DB_STORE_NAME);
        };
        req.onsuccess = function req_onsuccess() {
          db = req.result;
          // add to the cache
          IDBFS.dbs[name] = db;
          callback(null, db);
        };
        req.onerror = function req_onerror() {
          callback(this.error);
        };
      },getRemoteSet:function (mount, callback) {
        var files = {};
        IDBFS.getDB(mount.mountpoint, function(err, db) {
          if (err) return callback(err);
          var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readonly');
          transaction.onerror = function transaction_onerror() { callback(this.error); };
          var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
          store.openCursor().onsuccess = function store_openCursor_onsuccess(event) {
            var cursor = event.target.result;
            if (!cursor) {
              return callback(null, { type: 'remote', db: db, files: files });
            }
            files[cursor.key] = cursor.value;
            cursor.continue();
          };
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
  var _stderr=allocate(1, "i32*", ALLOC_STATIC);
  function _fflush(stream) {
      // int fflush(FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fflush.html
      // we don't currently perform any user-space buffering of data
    }var FS={root:null,mounts:[],devices:[null],streams:[null],nextInode:1,nameTable:null,currentPath:"/",initialized:false,ignorePermissions:true,ErrnoError:null,genericErrors:{},handleFSError:function (e) {
        if (!(e instanceof FS.ErrnoError)) throw e + ' : ' + stackTrace();
        return ___setErrNo(e.errno);
      },lookupPath:function (path, opts) {
        path = PATH.resolve(FS.cwd(), path);
        opts = opts || { recurse_count: 0 };
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
            current = current.mount.root;
          }
          // follow symlinks
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
            this.id = FS.nextInode++;
            this.name = name;
            this.mode = mode;
            this.node_ops = {};
            this.stream_ops = {};
            this.rdev = rdev;
            this.parent = null;
            this.mount = null;
            if (!parent) {
              parent = this;  // root node sets parent to itself
            }
            this.parent = parent;
            this.mount = parent.mount;
            FS.hashAddNode(this);
          };
          // compatibility
          var readMode = 292 | 73;
          var writeMode = 146;
          FS.FSNode.prototype = {};
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
        return new FS.FSNode(parent, name, mode, rdev);
      },destroyNode:function (node) {
        FS.hashRemoveNode(node);
      },isRoot:function (node) {
        return node === node.parent;
      },isMountpoint:function (node) {
        return node.mounted;
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
        fd_start = fd_start || 1;
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
        if (stream.__proto__) {
          // reuse the object
          stream.__proto__ = FS.FSStream.prototype;
        } else {
          var newStream = new FS.FSStream();
          for (var p in stream) {
            newStream[p] = stream[p];
          }
          stream = newStream;
        }
        var fd = FS.nextfd(fd_start, fd_end);
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream;
      },closeStream:function (fd) {
        FS.streams[fd] = null;
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
      },syncfs:function (populate, callback) {
        if (typeof(populate) === 'function') {
          callback = populate;
          populate = false;
        }
        var completed = 0;
        var total = FS.mounts.length;
        function done(err) {
          if (err) {
            return callback(err);
          }
          if (++completed >= total) {
            callback(null);
          }
        };
        // sync all mounts
        for (var i = 0; i < FS.mounts.length; i++) {
          var mount = FS.mounts[i];
          if (!mount.type.syncfs) {
            done(null);
            continue;
          }
          mount.type.syncfs(mount, populate, done);
        }
      },mount:function (type, opts, mountpoint) {
        var lookup;
        if (mountpoint) {
          lookup = FS.lookupPath(mountpoint, { follow: false });
          mountpoint = lookup.path;  // use the absolute path
        }
        var mount = {
          type: type,
          opts: opts,
          mountpoint: mountpoint,
          root: null
        };
        // create a root node for the fs
        var root = type.mount(mount);
        root.mount = mount;
        mount.root = root;
        // assign the mount info to the mountpoint's node
        if (lookup) {
          lookup.node.mount = mount;
          lookup.node.mounted = true;
          // compatibility update FS.root if we mount to /
          if (mountpoint === '/') {
            FS.root = mount.root;
          }
        }
        // add to our cached list of mounts
        FS.mounts.push(mount);
        return root;
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
        mode = mode !== undefined ? mode : 0666;
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0);
      },mkdir:function (path, mode) {
        mode = mode !== undefined ? mode : 0777;
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0);
      },mkdev:function (path, mode, dev) {
        if (typeof(dev) === 'undefined') {
          dev = mode;
          mode = 0666;
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
        var lookup = FS.lookupPath(path, { follow: false });
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
        mode = typeof mode === 'undefined' ? 0666 : mode;
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
          throw new FS.errnoError(ERRNO_CODES.ENODEV);
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
        } else {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        FS.close(stream);
        return ret;
      },writeFile:function (path, data, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'w';
        opts.encoding = opts.encoding || 'utf8';
        var stream = FS.open(path, opts.flags, opts.mode);
        if (opts.encoding === 'utf8') {
          var utf8 = new Runtime.UTF8Processor();
          var buf = new Uint8Array(utf8.processJSString(data));
          FS.write(stream, buf, 0, buf.length, 0);
        } else if (opts.encoding === 'binary') {
          FS.write(stream, data, 0, data.length, 0);
        } else {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
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
        HEAP32[((_stdin)>>2)]=stdin.fd;
        assert(stdin.fd === 1, 'invalid handle for stdin (' + stdin.fd + ')');
        var stdout = FS.open('/dev/stdout', 'w');
        HEAP32[((_stdout)>>2)]=stdout.fd;
        assert(stdout.fd === 2, 'invalid handle for stdout (' + stdout.fd + ')');
        var stderr = FS.open('/dev/stderr', 'w');
        HEAP32[((_stderr)>>2)]=stderr.fd;
        assert(stderr.fd === 3, 'invalid handle for stderr (' + stderr.fd + ')');
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
          this.stack = stackTrace();
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
        FS.root = FS.createNode(null, '/', 16384 | 0777, 0);
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
        if (typeof XMLHttpRequest !== 'undefined') {
          if (!ENVIRONMENT_IS_WORKER) throw 'Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc';
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
      }};var PATH={splitPath:function (filename) {
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
      }};var Browser={mainLoop:{scheduler:null,shouldPause:false,paused:false,queue:[],pause:function () {
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
          assert(typeof url == 'string', 'createObjectURL must return a url as a string');
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
            assert(typeof url == 'string', 'createObjectURL must return a url as a string');
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
        canvas.requestPointerLock = canvas['requestPointerLock'] ||
                                    canvas['mozRequestPointerLock'] ||
                                    canvas['webkitRequestPointerLock'];
        canvas.exitPointerLock = document['exitPointerLock'] ||
                                 document['mozExitPointerLock'] ||
                                 document['webkitExitPointerLock'] ||
                                 function(){}; // no-op if function does not exist
        canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
        function pointerLockChange() {
          Browser.pointerLock = document['pointerLockElement'] === canvas ||
                                document['mozPointerLockElement'] === canvas ||
                                document['webkitPointerLockElement'] === canvas;
        }
        document.addEventListener('pointerlockchange', pointerLockChange, false);
        document.addEventListener('mozpointerlockchange', pointerLockChange, false);
        document.addEventListener('webkitpointerlockchange', pointerLockChange, false);
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
            var errorInfo = '?';
            function onContextCreationError(event) {
              errorInfo = event.statusMessage || errorInfo;
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
          Module.ctx = ctx;
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
          if ((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
               document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
               document['fullScreenElement'] || document['fullscreenElement']) === canvas) {
            canvas.cancelFullScreen = document['cancelFullScreen'] ||
                                      document['mozCancelFullScreen'] ||
                                      document['webkitCancelFullScreen'];
            canvas.cancelFullScreen = canvas.cancelFullScreen.bind(document);
            if (Browser.lockPointer) canvas.requestPointerLock();
            Browser.isFullScreen = true;
            if (Browser.resizeCanvas) Browser.setFullScreenCanvasSize();
          } else if (Browser.resizeCanvas){
            Browser.setWindowedCanvasSize();
          }
          if (Module['onFullScreen']) Module['onFullScreen'](Browser.isFullScreen);
        }
        if (!Browser.fullScreenHandlersInstalled) {
          Browser.fullScreenHandlersInstalled = true;
          document.addEventListener('fullscreenchange', fullScreenChange, false);
          document.addEventListener('mozfullscreenchange', fullScreenChange, false);
          document.addEventListener('webkitfullscreenchange', fullScreenChange, false);
        }
        canvas.requestFullScreen = canvas['requestFullScreen'] ||
                                   canvas['mozRequestFullScreen'] ||
                                   (canvas['webkitRequestFullScreen'] ? function() { canvas['webkitRequestFullScreen'](Element['ALLOW_KEYBOARD_INPUT']) } : null);
        canvas.requestFullScreen();
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
      },mouseX:0,mouseY:0,mouseMovementX:0,mouseMovementY:0,calculateMouseEvent:function (event) { // event should be mousemove, mousedown or mouseup
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
          var x, y;
          if (event.type == 'touchstart' ||
              event.type == 'touchend' ||
              event.type == 'touchmove') {
            var t = event.touches.item(0);
            if (t) {
              x = t.pageX - (window.scrollX + rect.left);
              y = t.pageY - (window.scrollY + rect.top);
            } else {
              return;
            }
          } else {
            x = event.pageX - (window.scrollX + rect.left);
            y = event.pageY - (window.scrollY + rect.top);
          }
          // the canvas might be CSS-scaled compared to its backbuffer;
          // SDL-using content will want mouse coordinates in terms
          // of backbuffer units.
          var cw = Module["canvas"].width;
          var ch = Module["canvas"].height;
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
        canvas.width = width;
        canvas.height = height;
        if (!noUpdates) Browser.updateResizeListeners();
      },windowedWidth:0,windowedHeight:0,setFullScreenCanvasSize:function () {
        var canvas = Module['canvas'];
        this.windowedWidth = canvas.width;
        this.windowedHeight = canvas.height;
        canvas.width = screen.width;
        canvas.height = screen.height;
        // check if SDL is available   
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags | 0x00800000; // set SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },setWindowedCanvasSize:function () {
        var canvas = Module['canvas'];
        canvas.width = this.windowedWidth;
        canvas.height = this.windowedHeight;
        // check if SDL is available       
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags & ~0x00800000; // clear SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      }};
___errno_state = Runtime.staticAlloc(4); HEAP32[((___errno_state)>>2)]=0;
_llvm_eh_exception.buf = allocate(12, "void*", ALLOC_STATIC);
Module["requestFullScreen"] = function Module_requestFullScreen(lockPointer, resizeCanvas) { Browser.requestFullScreen(lockPointer, resizeCanvas) };
  Module["requestAnimationFrame"] = function Module_requestAnimationFrame(func) { Browser.requestAnimationFrame(func) };
  Module["setCanvasSize"] = function Module_setCanvasSize(width, height, noUpdates) { Browser.setCanvasSize(width, height, noUpdates) };
  Module["pauseMainLoop"] = function Module_pauseMainLoop() { Browser.mainLoop.pause() };
  Module["resumeMainLoop"] = function Module_resumeMainLoop() { Browser.mainLoop.resume() };
  Module["getUserMedia"] = function Module_getUserMedia() { Browser.getUserMedia() }
FS.staticInit();__ATINIT__.unshift({ func: function() { if (!Module["noFSInit"] && !FS.init.initialized) FS.init() } });__ATMAIN__.push({ func: function() { FS.ignorePermissions = false } });__ATEXIT__.push({ func: function() { FS.quit() } });Module["FS_createFolder"] = FS.createFolder;Module["FS_createPath"] = FS.createPath;Module["FS_createDataFile"] = FS.createDataFile;Module["FS_createPreloadedFile"] = FS.createPreloadedFile;Module["FS_createLazyFile"] = FS.createLazyFile;Module["FS_createLink"] = FS.createLink;Module["FS_createDevice"] = FS.createDevice;
__ATINIT__.unshift({ func: function() { TTY.init() } });__ATEXIT__.push({ func: function() { TTY.shutdown() } });TTY.utf8 = new Runtime.UTF8Processor();
if (ENVIRONMENT_IS_NODE) { var fs = require("fs"); NODEFS.staticInit(); }
STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);
staticSealed = true; // seal the static portion of memory
STACK_MAX = STACK_BASE + 5242880;
DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);
assert(DYNAMIC_BASE < TOTAL_MEMORY); // Stack must fit in TOTAL_MEMORY; allocations from here on may enlarge TOTAL_MEMORY
var FUNCTION_TABLE = [0,0,__ZN3dspD1Ev,0,__ZN5Noise4initEi,0,__ZN5NoiseD1Ev,0,__ZNK10__cxxabiv120__si_class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib,0,__ZNSt9bad_allocD0Ev,0,__ZN3dspD0Ev,0,__ZN10__cxxabiv117__class_type_infoD0Ev,0,__ZN5Noise7computeEiPPfS1_,0,__ZNKSt9bad_alloc4whatEv,0,__ZNK10__cxxabiv120__si_class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib,0,__ZN5Noise13getNumOutputsEv,0,__ZN5Noise18buildUserInterfaceEP2UI,0,__ZN10__cxxabiv116__shim_type_infoD2Ev,0,__ZNSt9bad_allocD2Ev,0,__ZNK10__cxxabiv117__class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib,0,__ZN5Noise13getOutputRateEi,0,__ZN5Noise12getInputRateEi,0,__ZNK10__cxxabiv116__shim_type_info5noop1Ev,0,__ZNK10__cxxabiv117__class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib,0,__ZN5Noise12getNumInputsEv,0,__ZNK10__cxxabiv117__class_type_info9can_catchEPKNS_16__shim_type_infoERPv,0,__ZNK10__cxxabiv117__class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi,0,__ZN10__cxxabiv120__si_class_type_infoD0Ev,0,__ZN5NoiseD0Ev,0,__ZNK10__cxxabiv116__shim_type_info5noop2Ev,0,__ZN5Noise12instanceInitEi,0,___cxa_pure_virtual,0,__ZNK10__cxxabiv120__si_class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi,0];
// EMSCRIPTEN_START_FUNCS
function __ZN5NoiseC1Ev($this){
 var label=0;
 var $this_addr;
 $this_addr=$this;
 var $this1=$this_addr;
 __ZN5NoiseC2Ev($this1);
 return;
}
function __ZN5NoiseD1Ev($this){
 var label=0;
 var $this_addr;
 $this_addr=$this;
 var $this1=$this_addr;
 __ZN5NoiseD2Ev($this1);
 return;
}
function _NOISE_constructor($samplingFreq){
 var label=0;
 label = 1; 
 while(1)switch(label){
 case 1: 
 var $samplingFreq_addr;
 var $n;
 var $exn_slot;
 var $ehselector_slot;
 $samplingFreq_addr=$samplingFreq;
 var $call=__Znwj(16);
 var $0=$call;
 var $1=$0;
 HEAP32[(($1)>>2)]=0; HEAP32[((($1)+(4))>>2)]=0; HEAP32[((($1)+(8))>>2)]=0; HEAP32[((($1)+(12))>>2)]=0;
 (function() { try { __THREW__ = 0; return __ZN5NoiseC1Ev($0) } catch(e) { if (typeof e != "number") throw e; if (ABORT) throw e; __THREW__ = 1; return null } })();if (!__THREW__) { label=2;break; } else { label=3;break; }
 case 2: 
 $n=$0;
 var $2=$n;
 var $3=$2;
 var $vtable=HEAP32[(($3)>>2)];
 var $vfn=(($vtable+20)|0);
 var $4=HEAP32[(($vfn)>>2)];
 var $5=$samplingFreq_addr;
 FUNCTION_TABLE[$4]($2,$5);
 var $6=$n;
 var $7=$6;
 return $7;
 case 3: 
 var $8$0 = ___cxa_find_matching_catch(-1, -1); var $8$1 = tempRet0;
 var $9=$8$0;
 $exn_slot=$9;
 var $10=$8$1;
 $ehselector_slot=$10;
 __ZdlPv($call);
 label=4;break;
 case 4: 
 var $exn=$exn_slot;
 var $sel=$ehselector_slot;
 var $lpad_val$0=$exn;
 var $lpad_val$1=0;
 var $lpad_val1$0=$lpad_val$0;
 var $lpad_val1$1=$sel;
 ___resumeException($lpad_val1$0)
  default: assert(0, "bad label: " + label);
 }
}
Module["_NOISE_constructor"] = _NOISE_constructor;
function _NOISE_compute($n,$count,$inputs,$outputs){
 var label=0;
 var $n_addr;
 var $count_addr;
 var $inputs_addr;
 var $outputs_addr;
 $n_addr=$n;
 $count_addr=$count;
 $inputs_addr=$inputs;
 $outputs_addr=$outputs;
 var $0=$n_addr;
 var $1=$0;
 var $vtable=HEAP32[(($1)>>2)];
 var $vfn=(($vtable+24)|0);
 var $2=HEAP32[(($vfn)>>2)];
 var $3=$count_addr;
 var $4=$inputs_addr;
 var $5=$outputs_addr;
 FUNCTION_TABLE[$2]($0,$3,$4,$5);
 return 1;
}
Module["_NOISE_compute"] = _NOISE_compute;
function _NOISE_getNumInputs($n){
 var label=0;
 var $n_addr;
 $n_addr=$n;
 var $0=$n_addr;
 var $1=$0;
 var $vtable=HEAP32[(($1)>>2)];
 var $vfn=(($vtable+8)|0);
 var $2=HEAP32[(($vfn)>>2)];
 var $call=FUNCTION_TABLE[$2]($0);
 return $call;
}
Module["_NOISE_getNumInputs"] = _NOISE_getNumInputs;
function _NOISE_getNumOutputs($n){
 var label=0;
 var $n_addr;
 $n_addr=$n;
 var $0=$n_addr;
 var $1=$0;
 var $vtable=HEAP32[(($1)>>2)];
 var $vfn=(($vtable+12)|0);
 var $2=HEAP32[(($vfn)>>2)];
 var $call=FUNCTION_TABLE[$2]($0);
 return $call;
}
Module["_NOISE_getNumOutputs"] = _NOISE_getNumOutputs;
function _NOISE_destructor($n){
 var label=0;
 label = 1; 
 while(1)switch(label){
 case 1: 
 var $n_addr;
 $n_addr=$n;
 var $0=$n_addr;
 var $isnull=($0|0)==0;
 if($isnull){label=3;break;}else{label=2;break;}
 case 2: 
 var $1=$0;
 var $vtable=HEAP32[(($1)>>2)];
 var $vfn=(($vtable+4)|0);
 var $2=HEAP32[(($vfn)>>2)];
 FUNCTION_TABLE[$2]($0);
 label=3;break;
 case 3: 
 return;
  default: assert(0, "bad label: " + label);
 }
}
Module["_NOISE_destructor"] = _NOISE_destructor;
function __ZN5NoiseD2Ev($this){
 var label=0;
 var $this_addr;
 $this_addr=$this;
 var $this1=$this_addr;
 var $0=$this1;
 __ZN3dspD2Ev($0);
 return;
}
function __ZN3dspD2Ev($this){
 var label=0;
 var $this_addr;
 $this_addr=$this;
 var $this1=$this_addr;
 return;
}
function __ZN5NoiseC2Ev($this){
 var label=0;
 var $this_addr;
 $this_addr=$this;
 var $this1=$this_addr;
 var $0=$this1;
 __ZN3dspC2Ev($0);
 var $1=$this1;
 HEAP32[(($1)>>2)]=72;
 return;
}
function __ZN3dspC2Ev($this){
 var label=0;
 var $this_addr;
 $this_addr=$this;
 var $this1=$this_addr;
 var $0=$this1;
 HEAP32[(($0)>>2)]=128;
 return;
}
function __ZN5NoiseD0Ev($this){
 var label=0;
 label = 1; 
 while(1)switch(label){
 case 1: 
 var $this_addr;
 var $exn_slot;
 var $ehselector_slot;
 $this_addr=$this;
 var $this1=$this_addr;
 (function() { try { __THREW__ = 0; return __ZN5NoiseD1Ev($this1) } catch(e) { if (typeof e != "number") throw e; if (ABORT) throw e; __THREW__ = 1; return null } })();if (!__THREW__) { label=2;break; } else { label=3;break; }
 case 2: 
 var $0=$this1;
 __ZdlPv($0);
 return;
 case 3: 
 var $1$0 = ___cxa_find_matching_catch(-1, -1); var $1$1 = tempRet0;
 var $2=$1$0;
 $exn_slot=$2;
 var $3=$1$1;
 $ehselector_slot=$3;
 var $4=$this1;
 __ZdlPv($4);
 label=4;break;
 case 4: 
 var $exn=$exn_slot;
 var $sel=$ehselector_slot;
 var $lpad_val$0=$exn;
 var $lpad_val$1=0;
 var $lpad_val2$0=$lpad_val$0;
 var $lpad_val2$1=$sel;
 ___resumeException($lpad_val2$0)
  default: assert(0, "bad label: " + label);
 }
}
function __ZN5Noise12getNumInputsEv($this){
 var label=0;
 var $this_addr;
 $this_addr=$this;
 var $this1=$this_addr;
 return 0;
}
function __ZN5Noise13getNumOutputsEv($this){
 var label=0;
 var $this_addr;
 $this_addr=$this;
 var $this1=$this_addr;
 return 1;
}
function __ZN5Noise18buildUserInterfaceEP2UI($this,$interface){
 var label=0;
 var $this_addr;
 var $interface_addr;
 $this_addr=$this;
 $interface_addr=$interface;
 var $this1=$this_addr;
 var $0=$interface_addr;
 var $1=$0;
 var $vtable=HEAP32[(($1)>>2)];
 var $vfn=(($vtable+16)|0);
 var $2=HEAP32[(($vfn)>>2)];
 FUNCTION_TABLE[$2]($0,24);
 var $3=$interface_addr;
 var $4=$3;
 var $vtable2=HEAP32[(($4)>>2)];
 var $vfn3=(($vtable2+20)|0);
 var $5=HEAP32[(($vfn3)>>2)];
 FUNCTION_TABLE[$5]($3);
 return;
}
function __ZN5Noise4initEi($this,$samplingFreq){
 var label=0;
 var $this_addr;
 var $samplingFreq_addr;
 $this_addr=$this;
 $samplingFreq_addr=$samplingFreq;
 var $this1=$this_addr;
 var $0=$samplingFreq_addr;
 __ZN5Noise9classInitEi($0);
 var $1=$this1;
 var $vtable=HEAP32[(($1)>>2)];
 var $vfn=(($vtable+36)|0);
 var $2=HEAP32[(($vfn)>>2)];
 var $3=$samplingFreq_addr;
 FUNCTION_TABLE[$2]($this1,$3);
 return;
}
function __ZN5Noise7computeEiPPfS1_($this,$count,$inputs,$outputs){
 var label=0;
 label = 1; 
 while(1)switch(label){
 case 1: 
 var $this_addr;
 var $count_addr;
 var $inputs_addr;
 var $outputs_addr;
 var $output0;
 var $i;
 $this_addr=$this;
 $count_addr=$count;
 $inputs_addr=$inputs;
 $outputs_addr=$outputs;
 var $this1=$this_addr;
 var $0=$outputs_addr;
 var $arrayidx=(($0)|0);
 var $1=HEAP32[(($arrayidx)>>2)];
 $output0=$1;
 $i=0;
 label=2;break;
 case 2: 
 var $2=$i;
 var $3=$count_addr;
 var $cmp=($2|0)<($3|0);
 if($cmp){label=3;break;}else{label=5;break;}
 case 3: 
 var $iRec0=(($this1+4)|0);
 var $arrayidx2=(($iRec0+4)|0);
 var $4=HEAP32[(($arrayidx2)>>2)];
 var $mul=(Math_imul($4,1103515245)|0);
 var $add=((($mul)+(12345))|0);
 var $iRec03=(($this1+4)|0);
 var $arrayidx4=(($iRec03)|0);
 HEAP32[(($arrayidx4)>>2)]=$add;
 var $iRec05=(($this1+4)|0);
 var $arrayidx6=(($iRec05)|0);
 var $5=HEAP32[(($arrayidx6)>>2)];
 var $conv=($5|0);
 var $mul7=((2.3283100447635263e-10))*($conv);
 var $6=$i;
 var $7=$output0;
 var $arrayidx8=(($7+($6<<2))|0);
 HEAPF32[(($arrayidx8)>>2)]=$mul7;
 var $iRec09=(($this1+4)|0);
 var $arrayidx10=(($iRec09)|0);
 var $8=HEAP32[(($arrayidx10)>>2)];
 var $iRec011=(($this1+4)|0);
 var $arrayidx12=(($iRec011+4)|0);
 HEAP32[(($arrayidx12)>>2)]=$8;
 label=4;break;
 case 4: 
 var $9=$i;
 var $add13=((($9)+(1))|0);
 $i=$add13;
 label=2;break;
 case 5: 
 return;
  default: assert(0, "bad label: " + label);
 }
}
function __ZN5Noise12getInputRateEi($this,$channel){
 var label=0;
 label = 1; 
 while(1)switch(label){
 case 1: 
 var $this_addr;
 var $channel_addr;
 var $rate;
 $this_addr=$this;
 $channel_addr=$channel;
 var $this1=$this_addr;
 var $0=$channel_addr;
 label=2;break;
 case 2: 
 $rate=-1;
 label=3;break;
 case 3: 
 var $1=$rate;
 return $1;
  default: assert(0, "bad label: " + label);
 }
}
function __ZN5Noise13getOutputRateEi($this,$channel){
 var label=0;
 label = 1; 
 while(1)switch(label){
 case 1: 
 var $this_addr;
 var $channel_addr;
 var $rate;
 $this_addr=$this;
 $channel_addr=$channel;
 var $this1=$this_addr;
 var $0=$channel_addr;
 if(($0|0)==0){ label=2;break;}else{label=3;break;}
 case 2: 
 $rate=1;
 label=4;break;
 case 3: 
 $rate=-1;
 label=4;break;
 case 4: 
 var $1=$rate;
 return $1;
  default: assert(0, "bad label: " + label);
 }
}
function __ZN5Noise12instanceInitEi($this,$samplingFreq){
 var label=0;
 label = 1; 
 while(1)switch(label){
 case 1: 
 var $this_addr;
 var $samplingFreq_addr;
 var $i;
 $this_addr=$this;
 $samplingFreq_addr=$samplingFreq;
 var $this1=$this_addr;
 var $0=$samplingFreq_addr;
 var $fSamplingFreq=(($this1+12)|0);
 HEAP32[(($fSamplingFreq)>>2)]=$0;
 $i=0;
 label=2;break;
 case 2: 
 var $1=$i;
 var $cmp=($1|0)<2;
 if($cmp){label=3;break;}else{label=5;break;}
 case 3: 
 var $2=$i;
 var $iRec0=(($this1+4)|0);
 var $arrayidx=(($iRec0+($2<<2))|0);
 HEAP32[(($arrayidx)>>2)]=0;
 label=4;break;
 case 4: 
 var $3=$i;
 var $add=((($3)+(1))|0);
 $i=$add;
 label=2;break;
 case 5: 
 return;
  default: assert(0, "bad label: " + label);
 }
}
function __ZN5Noise9classInitEi($samplingFreq){
 var label=0;
 var $samplingFreq_addr;
 $samplingFreq_addr=$samplingFreq;
 return;
}
function __ZN3dspD1Ev($this){
 var label=0;
 var $this_addr;
 $this_addr=$this;
 var $this1=$this_addr;
 __ZN3dspD2Ev($this1);
 return;
}
function __ZN3dspD0Ev($this){
 var label=0;
 label = 1; 
 while(1)switch(label){
 case 1: 
 var $this_addr;
 var $exn_slot;
 var $ehselector_slot;
 $this_addr=$this;
 var $this1=$this_addr;
 (function() { try { __THREW__ = 0; return __ZN3dspD1Ev($this1) } catch(e) { if (typeof e != "number") throw e; if (ABORT) throw e; __THREW__ = 1; return null } })();if (!__THREW__) { label=2;break; } else { label=3;break; }
 case 2: 
 var $0=$this1;
 __ZdlPv($0);
 return;
 case 3: 
 var $1$0 = ___cxa_find_matching_catch(-1, -1); var $1$1 = tempRet0;
 var $2=$1$0;
 $exn_slot=$2;
 var $3=$1$1;
 $ehselector_slot=$3;
 var $4=$this1;
 __ZdlPv($4);
 label=4;break;
 case 4: 
 var $exn=$exn_slot;
 var $sel=$ehselector_slot;
 var $lpad_val$0=$exn;
 var $lpad_val$1=0;
 var $lpad_val2$0=$lpad_val$0;
 var $lpad_val2$1=$sel;
 ___resumeException($lpad_val2$0)
  default: assert(0, "bad label: " + label);
 }
}
function __ZNSt9type_infoD2Ev($this){
 var label=0;
 return;
}
function __ZN10__cxxabiv116__shim_type_infoD2Ev($this){
 var label=0;
 var $0=(($this)|0);
 __ZNSt9type_infoD2Ev($0);
 return;
}
function __ZNK10__cxxabiv116__shim_type_info5noop1Ev($this){
 var label=0;
 return;
}
function __ZNK10__cxxabiv116__shim_type_info5noop2Ev($this){
 var label=0;
 return;
}
function __ZN10__cxxabiv117__class_type_infoD0Ev($this){
 var label=0;
 var $0=(($this)|0);
 __ZNSt9type_infoD2Ev($0);
 var $1=$this;
 __ZdlPv($1);
 return;
}
function __ZN10__cxxabiv120__si_class_type_infoD0Ev($this){
 var label=0;
 var $0=(($this)|0);
 __ZNSt9type_infoD2Ev($0);
 var $1=$this;
 __ZdlPv($1);
 return;
}
function __ZNK10__cxxabiv117__class_type_info9can_catchEPKNS_16__shim_type_infoERPv($this,$thrown_type,$adjustedPtr){
 var label=0;
 var sp=STACKTOP;STACKTOP=(STACKTOP+56)|0; (assert((STACKTOP|0) < (STACK_MAX|0))|0);
 label = 1; 
 while(1)switch(label){
 case 1: 
 var $info=sp;
 var $0=(($this)|0);
 var $1=(($thrown_type)|0);
 var $cmp_i=($0|0)==($1|0);
 if($cmp_i){var $retval_0=1;label=6;break;}else{label=2;break;}
 case 2: 
 var $2=($thrown_type|0)==0;
 if($2){var $retval_0=0;label=6;break;}else{label=3;break;}
 case 3: 
 var $3=$thrown_type;
 var $4=___dynamic_cast($3,416,400,-1);
 var $5=$4;
 var $cmp=($4|0)==0;
 if($cmp){var $retval_0=0;label=6;break;}else{label=4;break;}
 case 4: 
 var $6=$info;
 _memset($6, 0, 56)|0;
 var $dst_type=(($info)|0);
 HEAP32[(($dst_type)>>2)]=$5;
 var $static_type=(($info+8)|0);
 HEAP32[(($static_type)>>2)]=$this;
 var $src2dst_offset=(($info+12)|0);
 HEAP32[(($src2dst_offset)>>2)]=-1;
 var $number_of_dst_type=(($info+48)|0);
 HEAP32[(($number_of_dst_type)>>2)]=1;
 var $7=$4;
 var $vtable=HEAP32[(($7)>>2)];
 var $vfn=(($vtable+28)|0);
 var $8=HEAP32[(($vfn)>>2)];
 var $9=HEAP32[(($adjustedPtr)>>2)];
 FUNCTION_TABLE[$8]($5,$info,$9,1);
 var $path_dst_ptr_to_static_ptr=(($info+24)|0);
 var $10=HEAP32[(($path_dst_ptr_to_static_ptr)>>2)];
 var $cmp4=($10|0)==1;
 if($cmp4){label=5;break;}else{var $retval_0=0;label=6;break;}
 case 5: 
 var $dst_ptr_leading_to_static_ptr=(($info+16)|0);
 var $11=HEAP32[(($dst_ptr_leading_to_static_ptr)>>2)];
 HEAP32[(($adjustedPtr)>>2)]=$11;
 var $retval_0=1;label=6;break;
 case 6: 
 var $retval_0;
 STACKTOP=sp;return $retval_0;
  default: assert(0, "bad label: " + label);
 }
}
function __ZNK10__cxxabiv117__class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi($this,$info,$adjustedPtr,$path_below){
 var label=0;
 label = 1; 
 while(1)switch(label){
 case 1: 
 var $static_type=(($info+8)|0);
 var $0=HEAP32[(($static_type)>>2)];
 var $cmp_i=($0|0)==($this|0);
 if($cmp_i){label=2;break;}else{label=8;break;}
 case 2: 
 var $dst_ptr_leading_to_static_ptr_i=(($info+16)|0);
 var $1=HEAP32[(($dst_ptr_leading_to_static_ptr_i)>>2)];
 var $cmp_i2=($1|0)==0;
 if($cmp_i2){label=3;break;}else{label=4;break;}
 case 3: 
 HEAP32[(($dst_ptr_leading_to_static_ptr_i)>>2)]=$adjustedPtr;
 var $path_dst_ptr_to_static_ptr_i=(($info+24)|0);
 HEAP32[(($path_dst_ptr_to_static_ptr_i)>>2)]=$path_below;
 var $number_to_static_ptr_i=(($info+36)|0);
 HEAP32[(($number_to_static_ptr_i)>>2)]=1;
 label=8;break;
 case 4: 
 var $cmp4_i=($1|0)==($adjustedPtr|0);
 if($cmp4_i){label=5;break;}else{label=7;break;}
 case 5: 
 var $path_dst_ptr_to_static_ptr6_i=(($info+24)|0);
 var $2=HEAP32[(($path_dst_ptr_to_static_ptr6_i)>>2)];
 var $cmp7_i=($2|0)==2;
 if($cmp7_i){label=6;break;}else{label=8;break;}
 case 6: 
 HEAP32[(($path_dst_ptr_to_static_ptr6_i)>>2)]=$path_below;
 label=8;break;
 case 7: 
 var $number_to_static_ptr11_i=(($info+36)|0);
 var $3=HEAP32[(($number_to_static_ptr11_i)>>2)];
 var $add_i=((($3)+(1))|0);
 HEAP32[(($number_to_static_ptr11_i)>>2)]=$add_i;
 var $path_dst_ptr_to_static_ptr12_i=(($info+24)|0);
 HEAP32[(($path_dst_ptr_to_static_ptr12_i)>>2)]=2;
 var $search_done_i=(($info+54)|0);
 HEAP8[($search_done_i)]=1;
 label=8;break;
 case 8: 
 return;
  default: assert(0, "bad label: " + label);
 }
}
function __ZNK10__cxxabiv120__si_class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi($this,$info,$adjustedPtr,$path_below){
 var label=0;
 label = 1; 
 while(1)switch(label){
 case 1: 
 var $0=(($this)|0);
 var $static_type=(($info+8)|0);
 var $1=HEAP32[(($static_type)>>2)];
 var $2=(($1)|0);
 var $cmp_i=($0|0)==($2|0);
 if($cmp_i){label=2;break;}else{label=8;break;}
 case 2: 
 var $dst_ptr_leading_to_static_ptr_i=(($info+16)|0);
 var $3=HEAP32[(($dst_ptr_leading_to_static_ptr_i)>>2)];
 var $cmp_i5=($3|0)==0;
 if($cmp_i5){label=3;break;}else{label=4;break;}
 case 3: 
 HEAP32[(($dst_ptr_leading_to_static_ptr_i)>>2)]=$adjustedPtr;
 var $path_dst_ptr_to_static_ptr_i=(($info+24)|0);
 HEAP32[(($path_dst_ptr_to_static_ptr_i)>>2)]=$path_below;
 var $number_to_static_ptr_i=(($info+36)|0);
 HEAP32[(($number_to_static_ptr_i)>>2)]=1;
 label=9;break;
 case 4: 
 var $cmp4_i=($3|0)==($adjustedPtr|0);
 if($cmp4_i){label=5;break;}else{label=7;break;}
 case 5: 
 var $path_dst_ptr_to_static_ptr6_i=(($info+24)|0);
 var $4=HEAP32[(($path_dst_ptr_to_static_ptr6_i)>>2)];
 var $cmp7_i=($4|0)==2;
 if($cmp7_i){label=6;break;}else{label=9;break;}
 case 6: 
 HEAP32[(($path_dst_ptr_to_static_ptr6_i)>>2)]=$path_below;
 label=9;break;
 case 7: 
 var $number_to_static_ptr11_i=(($info+36)|0);
 var $5=HEAP32[(($number_to_static_ptr11_i)>>2)];
 var $add_i=((($5)+(1))|0);
 HEAP32[(($number_to_static_ptr11_i)>>2)]=$add_i;
 var $path_dst_ptr_to_static_ptr12_i=(($info+24)|0);
 HEAP32[(($path_dst_ptr_to_static_ptr12_i)>>2)]=2;
 var $search_done_i=(($info+54)|0);
 HEAP8[($search_done_i)]=1;
 label=9;break;
 case 8: 
 var $__base_type=(($this+8)|0);
 var $6=HEAP32[(($__base_type)>>2)];
 var $7=$6;
 var $vtable=HEAP32[(($7)>>2)];
 var $vfn=(($vtable+28)|0);
 var $8=HEAP32[(($vfn)>>2)];
 FUNCTION_TABLE[$8]($6,$info,$adjustedPtr,$path_below);
 label=9;break;
 case 9: 
 return;
  default: assert(0, "bad label: " + label);
 }
}
function ___dynamic_cast($static_ptr,$static_type,$dst_type,$src2dst_offset){
 var label=0;
 var sp=STACKTOP;STACKTOP=(STACKTOP+56)|0; (assert((STACKTOP|0) < (STACK_MAX|0))|0);
 label = 1; 
 while(1)switch(label){
 case 1: 
 var $info=sp;
 var $0=$static_ptr;
 var $1=HEAP32[(($0)>>2)];
 var $arrayidx=((($1)-(8))|0);
 var $2=HEAP32[(($arrayidx)>>2)];
 var $3=$2;
 var $add_ptr=(($static_ptr+$3)|0);
 var $arrayidx1=((($1)-(4))|0);
 var $4=HEAP32[(($arrayidx1)>>2)];
 var $5=$4;
 var $dst_type2=(($info)|0);
 HEAP32[(($dst_type2)>>2)]=$dst_type;
 var $static_ptr3=(($info+4)|0);
 HEAP32[(($static_ptr3)>>2)]=$static_ptr;
 var $static_type4=(($info+8)|0);
 HEAP32[(($static_type4)>>2)]=$static_type;
 var $src2dst_offset5=(($info+12)|0);
 HEAP32[(($src2dst_offset5)>>2)]=$src2dst_offset;
 var $dst_ptr_leading_to_static_ptr=(($info+16)|0);
 var $dst_ptr_not_leading_to_static_ptr=(($info+20)|0);
 var $path_dst_ptr_to_static_ptr=(($info+24)|0);
 var $path_dynamic_ptr_to_static_ptr=(($info+28)|0);
 var $path_dynamic_ptr_to_dst_ptr=(($info+32)|0);
 var $number_to_dst_ptr=(($info+40)|0);
 var $6=$4;
 var $7=(($dst_type)|0);
 var $cmp_i=($6|0)==($7|0);
 var $8=$dst_ptr_leading_to_static_ptr;
 _memset($8, 0, 39)|0;
 if($cmp_i){label=2;break;}else{label=3;break;}
 case 2: 
 var $number_of_dst_type=(($info+48)|0);
 HEAP32[(($number_of_dst_type)>>2)]=1;
 var $9=$4;
 var $vtable7=HEAP32[(($9)>>2)];
 var $vfn=(($vtable7+20)|0);
 var $10=HEAP32[(($vfn)>>2)];
 FUNCTION_TABLE[$10]($5,$info,$add_ptr,$add_ptr,1,0);
 var $11=HEAP32[(($path_dst_ptr_to_static_ptr)>>2)];
 var $cmp=($11|0)==1;
 var $add_ptr_=($cmp?$add_ptr:0);
 STACKTOP=sp;return $add_ptr_;
 case 3: 
 var $number_to_static_ptr=(($info+36)|0);
 var $12=$4;
 var $vtable10=HEAP32[(($12)>>2)];
 var $vfn11=(($vtable10+24)|0);
 var $13=HEAP32[(($vfn11)>>2)];
 FUNCTION_TABLE[$13]($5,$info,$add_ptr,1,0);
 var $14=HEAP32[(($number_to_static_ptr)>>2)];
 if(($14|0)==0){ label=4;break;}else if(($14|0)==1){ label=7;break;}else{var $dst_ptr_0=0;label=12;break;}
 case 4: 
 var $15=HEAP32[(($number_to_dst_ptr)>>2)];
 var $cmp14=($15|0)==1;
 if($cmp14){label=5;break;}else{var $dst_ptr_0=0;label=12;break;}
 case 5: 
 var $16=HEAP32[(($path_dynamic_ptr_to_static_ptr)>>2)];
 var $cmp16=($16|0)==1;
 if($cmp16){label=6;break;}else{var $dst_ptr_0=0;label=12;break;}
 case 6: 
 var $17=HEAP32[(($path_dynamic_ptr_to_dst_ptr)>>2)];
 var $cmp19=($17|0)==1;
 var $18=HEAP32[(($dst_ptr_not_leading_to_static_ptr)>>2)];
 var $_=($cmp19?$18:0);
 var $dst_ptr_0=$_;label=12;break;
 case 7: 
 var $19=HEAP32[(($path_dst_ptr_to_static_ptr)>>2)];
 var $cmp25=($19|0)==1;
 if($cmp25){label=11;break;}else{label=8;break;}
 case 8: 
 var $20=HEAP32[(($number_to_dst_ptr)>>2)];
 var $cmp27=($20|0)==0;
 if($cmp27){label=9;break;}else{var $dst_ptr_0=0;label=12;break;}
 case 9: 
 var $21=HEAP32[(($path_dynamic_ptr_to_static_ptr)>>2)];
 var $cmp30=($21|0)==1;
 if($cmp30){label=10;break;}else{var $dst_ptr_0=0;label=12;break;}
 case 10: 
 var $22=HEAP32[(($path_dynamic_ptr_to_dst_ptr)>>2)];
 var $cmp33=($22|0)==1;
 if($cmp33){label=11;break;}else{var $dst_ptr_0=0;label=12;break;}
 case 11: 
 var $23=HEAP32[(($dst_ptr_leading_to_static_ptr)>>2)];
 var $dst_ptr_0=$23;label=12;break;
 case 12: 
 var $dst_ptr_0;
 STACKTOP=sp;return $dst_ptr_0;
  default: assert(0, "bad label: " + label);
 }
}
function __ZNK10__cxxabiv120__si_class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib($this,$info,$current_ptr,$path_below,$use_strcmp){
 var label=0;
 label = 1; 
 while(1)switch(label){
 case 1: 
 var $0=(($this)|0);
 var $static_type=(($info+8)|0);
 var $1=HEAP32[(($static_type)>>2)];
 var $2=(($1)|0);
 var $cmp_i=($0|0)==($2|0);
 if($cmp_i){label=2;break;}else{label=5;break;}
 case 2: 
 var $static_ptr_i=(($info+4)|0);
 var $3=HEAP32[(($static_ptr_i)>>2)];
 var $cmp_i32=($3|0)==($current_ptr|0);
 if($cmp_i32){label=3;break;}else{label=20;break;}
 case 3: 
 var $path_dynamic_ptr_to_static_ptr_i=(($info+28)|0);
 var $4=HEAP32[(($path_dynamic_ptr_to_static_ptr_i)>>2)];
 var $cmp2_i=($4|0)==1;
 if($cmp2_i){label=20;break;}else{label=4;break;}
 case 4: 
 HEAP32[(($path_dynamic_ptr_to_static_ptr_i)>>2)]=$path_below;
 label=20;break;
 case 5: 
 var $dst_type=(($info)|0);
 var $5=HEAP32[(($dst_type)>>2)];
 var $6=(($5)|0);
 var $cmp_i33=($0|0)==($6|0);
 if($cmp_i33){label=6;break;}else{label=19;break;}
 case 6: 
 var $dst_ptr_leading_to_static_ptr=(($info+16)|0);
 var $7=HEAP32[(($dst_ptr_leading_to_static_ptr)>>2)];
 var $cmp=($7|0)==($current_ptr|0);
 if($cmp){label=8;break;}else{label=7;break;}
 case 7: 
 var $dst_ptr_not_leading_to_static_ptr=(($info+20)|0);
 var $8=HEAP32[(($dst_ptr_not_leading_to_static_ptr)>>2)];
 var $cmp5=($8|0)==($current_ptr|0);
 if($cmp5){label=8;break;}else{label=10;break;}
 case 8: 
 var $cmp7=($path_below|0)==1;
 if($cmp7){label=9;break;}else{label=20;break;}
 case 9: 
 var $path_dynamic_ptr_to_dst_ptr=(($info+32)|0);
 HEAP32[(($path_dynamic_ptr_to_dst_ptr)>>2)]=1;
 label=20;break;
 case 10: 
 var $path_dynamic_ptr_to_dst_ptr10=(($info+32)|0);
 HEAP32[(($path_dynamic_ptr_to_dst_ptr10)>>2)]=$path_below;
 var $is_dst_type_derived_from_static_type=(($info+44)|0);
 var $9=HEAP32[(($is_dst_type_derived_from_static_type)>>2)];
 var $cmp11=($9|0)==4;
 if($cmp11){label=20;break;}else{label=11;break;}
 case 11: 
 var $found_our_static_ptr=(($info+52)|0);
 HEAP8[($found_our_static_ptr)]=0;
 var $found_any_static_type=(($info+53)|0);
 HEAP8[($found_any_static_type)]=0;
 var $__base_type=(($this+8)|0);
 var $10=HEAP32[(($__base_type)>>2)];
 var $11=$10;
 var $vtable=HEAP32[(($11)>>2)];
 var $vfn=(($vtable+20)|0);
 var $12=HEAP32[(($vfn)>>2)];
 FUNCTION_TABLE[$12]($10,$info,$current_ptr,$current_ptr,1,$use_strcmp);
 var $13=HEAP8[($found_any_static_type)];
 var $14=$13&1;
 var $tobool16=(($14<<24)>>24)==0;
 if($tobool16){var $is_dst_type_derived_from_static_type13_0_off034=0;label=13;break;}else{label=12;break;}
 case 12: 
 var $15=HEAP8[($found_our_static_ptr)];
 var $16=$15&1;
 var $not_tobool19=(($16<<24)>>24)==0;
 if($not_tobool19){var $is_dst_type_derived_from_static_type13_0_off034=1;label=13;break;}else{label=17;break;}
 case 13: 
 var $is_dst_type_derived_from_static_type13_0_off034;
 HEAP32[(($dst_ptr_not_leading_to_static_ptr)>>2)]=$current_ptr;
 var $number_to_dst_ptr=(($info+40)|0);
 var $17=HEAP32[(($number_to_dst_ptr)>>2)];
 var $add=((($17)+(1))|0);
 HEAP32[(($number_to_dst_ptr)>>2)]=$add;
 var $number_to_static_ptr=(($info+36)|0);
 var $18=HEAP32[(($number_to_static_ptr)>>2)];
 var $cmp26=($18|0)==1;
 if($cmp26){label=14;break;}else{label=16;break;}
 case 14: 
 var $path_dst_ptr_to_static_ptr=(($info+24)|0);
 var $19=HEAP32[(($path_dst_ptr_to_static_ptr)>>2)];
 var $cmp27=($19|0)==2;
 if($cmp27){label=15;break;}else{label=16;break;}
 case 15: 
 var $search_done=(($info+54)|0);
 HEAP8[($search_done)]=1;
 if($is_dst_type_derived_from_static_type13_0_off034){label=17;break;}else{label=18;break;}
 case 16: 
 if($is_dst_type_derived_from_static_type13_0_off034){label=17;break;}else{label=18;break;}
 case 17: 
 HEAP32[(($is_dst_type_derived_from_static_type)>>2)]=3;
 label=20;break;
 case 18: 
 HEAP32[(($is_dst_type_derived_from_static_type)>>2)]=4;
 label=20;break;
 case 19: 
 var $__base_type40=(($this+8)|0);
 var $20=HEAP32[(($__base_type40)>>2)];
 var $21=$20;
 var $vtable41=HEAP32[(($21)>>2)];
 var $vfn42=(($vtable41+24)|0);
 var $22=HEAP32[(($vfn42)>>2)];
 FUNCTION_TABLE[$22]($20,$info,$current_ptr,$path_below,$use_strcmp);
 label=20;break;
 case 20: 
 return;
  default: assert(0, "bad label: " + label);
 }
}
function __ZNK10__cxxabiv117__class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib($this,$info,$current_ptr,$path_below,$use_strcmp){
 var label=0;
 label = 1; 
 while(1)switch(label){
 case 1: 
 var $static_type=(($info+8)|0);
 var $0=HEAP32[(($static_type)>>2)];
 var $cmp_i=($0|0)==($this|0);
 if($cmp_i){label=2;break;}else{label=5;break;}
 case 2: 
 var $static_ptr_i=(($info+4)|0);
 var $1=HEAP32[(($static_ptr_i)>>2)];
 var $cmp_i20=($1|0)==($current_ptr|0);
 if($cmp_i20){label=3;break;}else{label=14;break;}
 case 3: 
 var $path_dynamic_ptr_to_static_ptr_i=(($info+28)|0);
 var $2=HEAP32[(($path_dynamic_ptr_to_static_ptr_i)>>2)];
 var $cmp2_i=($2|0)==1;
 if($cmp2_i){label=14;break;}else{label=4;break;}
 case 4: 
 HEAP32[(($path_dynamic_ptr_to_static_ptr_i)>>2)]=$path_below;
 label=14;break;
 case 5: 
 var $dst_type=(($info)|0);
 var $3=HEAP32[(($dst_type)>>2)];
 var $cmp_i19=($3|0)==($this|0);
 if($cmp_i19){label=6;break;}else{label=14;break;}
 case 6: 
 var $dst_ptr_leading_to_static_ptr=(($info+16)|0);
 var $4=HEAP32[(($dst_ptr_leading_to_static_ptr)>>2)];
 var $cmp=($4|0)==($current_ptr|0);
 if($cmp){label=8;break;}else{label=7;break;}
 case 7: 
 var $dst_ptr_not_leading_to_static_ptr=(($info+20)|0);
 var $5=HEAP32[(($dst_ptr_not_leading_to_static_ptr)>>2)];
 var $cmp5=($5|0)==($current_ptr|0);
 if($cmp5){label=8;break;}else{label=10;break;}
 case 8: 
 var $cmp7=($path_below|0)==1;
 if($cmp7){label=9;break;}else{label=14;break;}
 case 9: 
 var $path_dynamic_ptr_to_dst_ptr=(($info+32)|0);
 HEAP32[(($path_dynamic_ptr_to_dst_ptr)>>2)]=1;
 label=14;break;
 case 10: 
 var $path_dynamic_ptr_to_dst_ptr10=(($info+32)|0);
 HEAP32[(($path_dynamic_ptr_to_dst_ptr10)>>2)]=$path_below;
 HEAP32[(($dst_ptr_not_leading_to_static_ptr)>>2)]=$current_ptr;
 var $number_to_dst_ptr=(($info+40)|0);
 var $6=HEAP32[(($number_to_dst_ptr)>>2)];
 var $add=((($6)+(1))|0);
 HEAP32[(($number_to_dst_ptr)>>2)]=$add;
 var $number_to_static_ptr=(($info+36)|0);
 var $7=HEAP32[(($number_to_static_ptr)>>2)];
 var $cmp12=($7|0)==1;
 if($cmp12){label=11;break;}else{label=13;break;}
 case 11: 
 var $path_dst_ptr_to_static_ptr=(($info+24)|0);
 var $8=HEAP32[(($path_dst_ptr_to_static_ptr)>>2)];
 var $cmp13=($8|0)==2;
 if($cmp13){label=12;break;}else{label=13;break;}
 case 12: 
 var $search_done=(($info+54)|0);
 HEAP8[($search_done)]=1;
 label=13;break;
 case 13: 
 var $is_dst_type_derived_from_static_type=(($info+44)|0);
 HEAP32[(($is_dst_type_derived_from_static_type)>>2)]=4;
 label=14;break;
 case 14: 
 return;
  default: assert(0, "bad label: " + label);
 }
}
function __ZNK10__cxxabiv120__si_class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib($this,$info,$dst_ptr,$current_ptr,$path_below,$use_strcmp){
 var label=0;
 label = 1; 
 while(1)switch(label){
 case 1: 
 var $0=(($this)|0);
 var $static_type=(($info+8)|0);
 var $1=HEAP32[(($static_type)>>2)];
 var $2=(($1)|0);
 var $cmp_i=($0|0)==($2|0);
 if($cmp_i){label=2;break;}else{label=12;break;}
 case 2: 
 var $found_any_static_type_i=(($info+53)|0);
 HEAP8[($found_any_static_type_i)]=1;
 var $static_ptr_i=(($info+4)|0);
 var $3=HEAP32[(($static_ptr_i)>>2)];
 var $cmp_i7=($3|0)==($current_ptr|0);
 if($cmp_i7){label=3;break;}else{label=13;break;}
 case 3: 
 var $found_our_static_ptr_i=(($info+52)|0);
 HEAP8[($found_our_static_ptr_i)]=1;
 var $dst_ptr_leading_to_static_ptr_i=(($info+16)|0);
 var $4=HEAP32[(($dst_ptr_leading_to_static_ptr_i)>>2)];
 var $cmp2_i=($4|0)==0;
 if($cmp2_i){label=4;break;}else{label=6;break;}
 case 4: 
 HEAP32[(($dst_ptr_leading_to_static_ptr_i)>>2)]=$dst_ptr;
 var $path_dst_ptr_to_static_ptr_i=(($info+24)|0);
 HEAP32[(($path_dst_ptr_to_static_ptr_i)>>2)]=$path_below;
 var $number_to_static_ptr_i=(($info+36)|0);
 HEAP32[(($number_to_static_ptr_i)>>2)]=1;
 var $number_of_dst_type_i=(($info+48)|0);
 var $5=HEAP32[(($number_of_dst_type_i)>>2)];
 var $cmp5_i=($5|0)==1;
 var $cmp7_i=($path_below|0)==1;
 var $or_cond_i=$cmp5_i&$cmp7_i;
 if($or_cond_i){label=5;break;}else{label=13;break;}
 case 5: 
 var $search_done_i=(($info+54)|0);
 HEAP8[($search_done_i)]=1;
 label=13;break;
 case 6: 
 var $cmp10_i=($4|0)==($dst_ptr|0);
 if($cmp10_i){label=7;break;}else{label=11;break;}
 case 7: 
 var $path_dst_ptr_to_static_ptr12_i=(($info+24)|0);
 var $6=HEAP32[(($path_dst_ptr_to_static_ptr12_i)>>2)];
 var $cmp13_i=($6|0)==2;
 if($cmp13_i){label=8;break;}else{var $7=$6;label=9;break;}
 case 8: 
 HEAP32[(($path_dst_ptr_to_static_ptr12_i)>>2)]=$path_below;
 var $7=$path_below;label=9;break;
 case 9: 
 var $7;
 var $number_of_dst_type17_i=(($info+48)|0);
 var $8=HEAP32[(($number_of_dst_type17_i)>>2)];
 var $cmp18_i=($8|0)==1;
 var $cmp21_i=($7|0)==1;
 var $or_cond19_i=$cmp18_i&$cmp21_i;
 if($or_cond19_i){label=10;break;}else{label=13;break;}
 case 10: 
 var $search_done23_i=(($info+54)|0);
 HEAP8[($search_done23_i)]=1;
 label=13;break;
 case 11: 
 var $number_to_static_ptr26_i=(($info+36)|0);
 var $9=HEAP32[(($number_to_static_ptr26_i)>>2)];
 var $add_i=((($9)+(1))|0);
 HEAP32[(($number_to_static_ptr26_i)>>2)]=$add_i;
 var $search_done27_i=(($info+54)|0);
 HEAP8[($search_done27_i)]=1;
 label=13;break;
 case 12: 
 var $__base_type=(($this+8)|0);
 var $10=HEAP32[(($__base_type)>>2)];
 var $11=$10;
 var $vtable=HEAP32[(($11)>>2)];
 var $vfn=(($vtable+20)|0);
 var $12=HEAP32[(($vfn)>>2)];
 FUNCTION_TABLE[$12]($10,$info,$dst_ptr,$current_ptr,$path_below,$use_strcmp);
 label=13;break;
 case 13: 
 return;
  default: assert(0, "bad label: " + label);
 }
}
function __ZNK10__cxxabiv117__class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib($this,$info,$dst_ptr,$current_ptr,$path_below,$use_strcmp){
 var label=0;
 label = 1; 
 while(1)switch(label){
 case 1: 
 var $static_type=(($info+8)|0);
 var $0=HEAP32[(($static_type)>>2)];
 var $cmp_i=($0|0)==($this|0);
 if($cmp_i){label=2;break;}else{label=12;break;}
 case 2: 
 var $found_any_static_type_i=(($info+53)|0);
 HEAP8[($found_any_static_type_i)]=1;
 var $static_ptr_i=(($info+4)|0);
 var $1=HEAP32[(($static_ptr_i)>>2)];
 var $cmp_i2=($1|0)==($current_ptr|0);
 if($cmp_i2){label=3;break;}else{label=12;break;}
 case 3: 
 var $found_our_static_ptr_i=(($info+52)|0);
 HEAP8[($found_our_static_ptr_i)]=1;
 var $dst_ptr_leading_to_static_ptr_i=(($info+16)|0);
 var $2=HEAP32[(($dst_ptr_leading_to_static_ptr_i)>>2)];
 var $cmp2_i=($2|0)==0;
 if($cmp2_i){label=4;break;}else{label=6;break;}
 case 4: 
 HEAP32[(($dst_ptr_leading_to_static_ptr_i)>>2)]=$dst_ptr;
 var $path_dst_ptr_to_static_ptr_i=(($info+24)|0);
 HEAP32[(($path_dst_ptr_to_static_ptr_i)>>2)]=$path_below;
 var $number_to_static_ptr_i=(($info+36)|0);
 HEAP32[(($number_to_static_ptr_i)>>2)]=1;
 var $number_of_dst_type_i=(($info+48)|0);
 var $3=HEAP32[(($number_of_dst_type_i)>>2)];
 var $cmp5_i=($3|0)==1;
 var $cmp7_i=($path_below|0)==1;
 var $or_cond_i=$cmp5_i&$cmp7_i;
 if($or_cond_i){label=5;break;}else{label=12;break;}
 case 5: 
 var $search_done_i=(($info+54)|0);
 HEAP8[($search_done_i)]=1;
 label=12;break;
 case 6: 
 var $cmp10_i=($2|0)==($dst_ptr|0);
 if($cmp10_i){label=7;break;}else{label=11;break;}
 case 7: 
 var $path_dst_ptr_to_static_ptr12_i=(($info+24)|0);
 var $4=HEAP32[(($path_dst_ptr_to_static_ptr12_i)>>2)];
 var $cmp13_i=($4|0)==2;
 if($cmp13_i){label=8;break;}else{var $5=$4;label=9;break;}
 case 8: 
 HEAP32[(($path_dst_ptr_to_static_ptr12_i)>>2)]=$path_below;
 var $5=$path_below;label=9;break;
 case 9: 
 var $5;
 var $number_of_dst_type17_i=(($info+48)|0);
 var $6=HEAP32[(($number_of_dst_type17_i)>>2)];
 var $cmp18_i=($6|0)==1;
 var $cmp21_i=($5|0)==1;
 var $or_cond19_i=$cmp18_i&$cmp21_i;
 if($or_cond19_i){label=10;break;}else{label=12;break;}
 case 10: 
 var $search_done23_i=(($info+54)|0);
 HEAP8[($search_done23_i)]=1;
 label=12;break;
 case 11: 
 var $number_to_static_ptr26_i=(($info+36)|0);
 var $7=HEAP32[(($number_to_static_ptr26_i)>>2)];
 var $add_i=((($7)+(1))|0);
 HEAP32[(($number_to_static_ptr26_i)>>2)]=$add_i;
 var $search_done27_i=(($info+54)|0);
 HEAP8[($search_done27_i)]=1;
 label=12;break;
 case 12: 
 return;
  default: assert(0, "bad label: " + label);
 }
}
function _malloc($bytes){
 var label=0;
 label = 1; 
 while(1)switch(label){
 case 1: 
 var $cmp=($bytes>>>0)<245;
 if($cmp){label=2;break;}else{label=78;break;}
 case 2: 
 var $cmp1=($bytes>>>0)<11;
 if($cmp1){var $cond=16;label=4;break;}else{label=3;break;}
 case 3: 
 var $add2=((($bytes)+(11))|0);
 var $and=$add2&-8;
 var $cond=$and;label=4;break;
 case 4: 
 var $cond;
 var $shr=$cond>>>3;
 var $0=HEAP32[((480)>>2)];
 var $shr3=$0>>>($shr>>>0);
 var $and4=$shr3&3;
 var $cmp5=($and4|0)==0;
 if($cmp5){label=12;break;}else{label=5;break;}
 case 5: 
 var $neg=$shr3&1;
 var $and7=$neg^1;
 var $add8=((($and7)+($shr))|0);
 var $shl=$add8<<1;
 var $arrayidx=((520+($shl<<2))|0);
 var $1=$arrayidx;
 var $arrayidx_sum=((($shl)+(2))|0);
 var $2=((520+($arrayidx_sum<<2))|0);
 var $3=HEAP32[(($2)>>2)];
 var $fd9=(($3+8)|0);
 var $4=HEAP32[(($fd9)>>2)];
 var $cmp10=($1|0)==($4|0);
 if($cmp10){label=6;break;}else{label=7;break;}
 case 6: 
 var $shl12=1<<$add8;
 var $neg13=$shl12^-1;
 var $and14=$0&$neg13;
 HEAP32[((480)>>2)]=$and14;
 label=11;break;
 case 7: 
 var $5=$4;
 var $6=HEAP32[((496)>>2)];
 var $cmp15=($5>>>0)<($6>>>0);
 if($cmp15){label=10;break;}else{label=8;break;}
 case 8: 
 var $bk=(($4+12)|0);
 var $7=HEAP32[(($bk)>>2)];
 var $cmp16=($7|0)==($3|0);
 if($cmp16){label=9;break;}else{label=10;break;}
 case 9: 
 HEAP32[(($bk)>>2)]=$1;
 HEAP32[(($2)>>2)]=$4;
 label=11;break;
 case 10: 
 _abort();
 throw "Reached an unreachable!";
 case 11: 
 var $shl22=$add8<<3;
 var $or23=$shl22|3;
 var $head=(($3+4)|0);
 HEAP32[(($head)>>2)]=$or23;
 var $8=$3;
 var $add_ptr_sum106=$shl22|4;
 var $head25=(($8+$add_ptr_sum106)|0);
 var $9=$head25;
 var $10=HEAP32[(($9)>>2)];
 var $or26=$10|1;
 HEAP32[(($9)>>2)]=$or26;
 var $11=$fd9;
 var $mem_0=$11;label=341;break;
 case 12: 
 var $12=HEAP32[((488)>>2)];
 var $cmp29=($cond>>>0)>($12>>>0);
 if($cmp29){label=13;break;}else{var $nb_0=$cond;label=160;break;}
 case 13: 
 var $cmp31=($shr3|0)==0;
 if($cmp31){label=27;break;}else{label=14;break;}
 case 14: 
 var $shl35=$shr3<<$shr;
 var $shl37=2<<$shr;
 var $sub=(((-$shl37))|0);
 var $or40=$shl37|$sub;
 var $and41=$shl35&$or40;
 var $sub42=(((-$and41))|0);
 var $and43=$and41&$sub42;
 var $sub44=((($and43)-(1))|0);
 var $shr45=$sub44>>>12;
 var $and46=$shr45&16;
 var $shr47=$sub44>>>($and46>>>0);
 var $shr48=$shr47>>>5;
 var $and49=$shr48&8;
 var $add50=$and49|$and46;
 var $shr51=$shr47>>>($and49>>>0);
 var $shr52=$shr51>>>2;
 var $and53=$shr52&4;
 var $add54=$add50|$and53;
 var $shr55=$shr51>>>($and53>>>0);
 var $shr56=$shr55>>>1;
 var $and57=$shr56&2;
 var $add58=$add54|$and57;
 var $shr59=$shr55>>>($and57>>>0);
 var $shr60=$shr59>>>1;
 var $and61=$shr60&1;
 var $add62=$add58|$and61;
 var $shr63=$shr59>>>($and61>>>0);
 var $add64=((($add62)+($shr63))|0);
 var $shl65=$add64<<1;
 var $arrayidx66=((520+($shl65<<2))|0);
 var $13=$arrayidx66;
 var $arrayidx66_sum=((($shl65)+(2))|0);
 var $14=((520+($arrayidx66_sum<<2))|0);
 var $15=HEAP32[(($14)>>2)];
 var $fd69=(($15+8)|0);
 var $16=HEAP32[(($fd69)>>2)];
 var $cmp70=($13|0)==($16|0);
 if($cmp70){label=15;break;}else{label=16;break;}
 case 15: 
 var $shl72=1<<$add64;
 var $neg73=$shl72^-1;
 var $and74=$0&$neg73;
 HEAP32[((480)>>2)]=$and74;
 label=20;break;
 case 16: 
 var $17=$16;
 var $18=HEAP32[((496)>>2)];
 var $cmp76=($17>>>0)<($18>>>0);
 if($cmp76){label=19;break;}else{label=17;break;}
 case 17: 
 var $bk78=(($16+12)|0);
 var $19=HEAP32[(($bk78)>>2)];
 var $cmp79=($19|0)==($15|0);
 if($cmp79){label=18;break;}else{label=19;break;}
 case 18: 
 HEAP32[(($bk78)>>2)]=$13;
 HEAP32[(($14)>>2)]=$16;
 label=20;break;
 case 19: 
 _abort();
 throw "Reached an unreachable!";
 case 20: 
 var $shl90=$add64<<3;
 var $sub91=((($shl90)-($cond))|0);
 var $or93=$cond|3;
 var $head94=(($15+4)|0);
 HEAP32[(($head94)>>2)]=$or93;
 var $20=$15;
 var $add_ptr95=(($20+$cond)|0);
 var $21=$add_ptr95;
 var $or96=$sub91|1;
 var $add_ptr95_sum103=$cond|4;
 var $head97=(($20+$add_ptr95_sum103)|0);
 var $22=$head97;
 HEAP32[(($22)>>2)]=$or96;
 var $add_ptr98=(($20+$shl90)|0);
 var $prev_foot=$add_ptr98;
 HEAP32[(($prev_foot)>>2)]=$sub91;
 var $23=HEAP32[((488)>>2)];
 var $cmp99=($23|0)==0;
 if($cmp99){label=26;break;}else{label=21;break;}
 case 21: 
 var $24=HEAP32[((500)>>2)];
 var $shr101=$23>>>3;
 var $shl102=$shr101<<1;
 var $arrayidx103=((520+($shl102<<2))|0);
 var $25=$arrayidx103;
 var $26=HEAP32[((480)>>2)];
 var $shl105=1<<$shr101;
 var $and106=$26&$shl105;
 var $tobool107=($and106|0)==0;
 if($tobool107){label=22;break;}else{label=23;break;}
 case 22: 
 var $or110=$26|$shl105;
 HEAP32[((480)>>2)]=$or110;
 var $arrayidx103_sum_pre=((($shl102)+(2))|0);
 var $_pre=((520+($arrayidx103_sum_pre<<2))|0);
 var $F104_0=$25;var $_pre_phi=$_pre;label=25;break;
 case 23: 
 var $arrayidx103_sum104=((($shl102)+(2))|0);
 var $27=((520+($arrayidx103_sum104<<2))|0);
 var $28=HEAP32[(($27)>>2)];
 var $29=$28;
 var $30=HEAP32[((496)>>2)];
 var $cmp113=($29>>>0)<($30>>>0);
 if($cmp113){label=24;break;}else{var $F104_0=$28;var $_pre_phi=$27;label=25;break;}
 case 24: 
 _abort();
 throw "Reached an unreachable!";
 case 25: 
 var $_pre_phi;
 var $F104_0;
 HEAP32[(($_pre_phi)>>2)]=$24;
 var $bk122=(($F104_0+12)|0);
 HEAP32[(($bk122)>>2)]=$24;
 var $fd123=(($24+8)|0);
 HEAP32[(($fd123)>>2)]=$F104_0;
 var $bk124=(($24+12)|0);
 HEAP32[(($bk124)>>2)]=$25;
 label=26;break;
 case 26: 
 HEAP32[((488)>>2)]=$sub91;
 HEAP32[((500)>>2)]=$21;
 var $31=$fd69;
 var $mem_0=$31;label=341;break;
 case 27: 
 var $32=HEAP32[((484)>>2)];
 var $cmp128=($32|0)==0;
 if($cmp128){var $nb_0=$cond;label=160;break;}else{label=28;break;}
 case 28: 
 var $sub_i=(((-$32))|0);
 var $and_i=$32&$sub_i;
 var $sub2_i=((($and_i)-(1))|0);
 var $shr_i=$sub2_i>>>12;
 var $and3_i=$shr_i&16;
 var $shr4_i=$sub2_i>>>($and3_i>>>0);
 var $shr5_i=$shr4_i>>>5;
 var $and6_i=$shr5_i&8;
 var $add_i=$and6_i|$and3_i;
 var $shr7_i=$shr4_i>>>($and6_i>>>0);
 var $shr8_i=$shr7_i>>>2;
 var $and9_i=$shr8_i&4;
 var $add10_i=$add_i|$and9_i;
 var $shr11_i=$shr7_i>>>($and9_i>>>0);
 var $shr12_i=$shr11_i>>>1;
 var $and13_i=$shr12_i&2;
 var $add14_i=$add10_i|$and13_i;
 var $shr15_i=$shr11_i>>>($and13_i>>>0);
 var $shr16_i=$shr15_i>>>1;
 var $and17_i=$shr16_i&1;
 var $add18_i=$add14_i|$and17_i;
 var $shr19_i=$shr15_i>>>($and17_i>>>0);
 var $add20_i=((($add18_i)+($shr19_i))|0);
 var $arrayidx_i=((784+($add20_i<<2))|0);
 var $33=HEAP32[(($arrayidx_i)>>2)];
 var $head_i=(($33+4)|0);
 var $34=HEAP32[(($head_i)>>2)];
 var $and21_i=$34&-8;
 var $sub22_i=((($and21_i)-($cond))|0);
 var $t_0_i=$33;var $v_0_i=$33;var $rsize_0_i=$sub22_i;label=29;break;
 case 29: 
 var $rsize_0_i;
 var $v_0_i;
 var $t_0_i;
 var $arrayidx23_i=(($t_0_i+16)|0);
 var $35=HEAP32[(($arrayidx23_i)>>2)];
 var $cmp_i=($35|0)==0;
 if($cmp_i){label=30;break;}else{var $cond7_i=$35;label=31;break;}
 case 30: 
 var $arrayidx27_i=(($t_0_i+20)|0);
 var $36=HEAP32[(($arrayidx27_i)>>2)];
 var $cmp28_i=($36|0)==0;
 if($cmp28_i){label=32;break;}else{var $cond7_i=$36;label=31;break;}
 case 31: 
 var $cond7_i;
 var $head29_i=(($cond7_i+4)|0);
 var $37=HEAP32[(($head29_i)>>2)];
 var $and30_i=$37&-8;
 var $sub31_i=((($and30_i)-($cond))|0);
 var $cmp32_i=($sub31_i>>>0)<($rsize_0_i>>>0);
 var $sub31_rsize_0_i=($cmp32_i?$sub31_i:$rsize_0_i);
 var $cond_v_0_i=($cmp32_i?$cond7_i:$v_0_i);
 var $t_0_i=$cond7_i;var $v_0_i=$cond_v_0_i;var $rsize_0_i=$sub31_rsize_0_i;label=29;break;
 case 32: 
 var $38=$v_0_i;
 var $39=HEAP32[((496)>>2)];
 var $cmp33_i=($38>>>0)<($39>>>0);
 if($cmp33_i){label=76;break;}else{label=33;break;}
 case 33: 
 var $add_ptr_i=(($38+$cond)|0);
 var $40=$add_ptr_i;
 var $cmp35_i=($38>>>0)<($add_ptr_i>>>0);
 if($cmp35_i){label=34;break;}else{label=76;break;}
 case 34: 
 var $parent_i=(($v_0_i+24)|0);
 var $41=HEAP32[(($parent_i)>>2)];
 var $bk_i=(($v_0_i+12)|0);
 var $42=HEAP32[(($bk_i)>>2)];
 var $cmp40_i=($42|0)==($v_0_i|0);
 if($cmp40_i){label=40;break;}else{label=35;break;}
 case 35: 
 var $fd_i=(($v_0_i+8)|0);
 var $43=HEAP32[(($fd_i)>>2)];
 var $44=$43;
 var $cmp45_i=($44>>>0)<($39>>>0);
 if($cmp45_i){label=39;break;}else{label=36;break;}
 case 36: 
 var $bk47_i=(($43+12)|0);
 var $45=HEAP32[(($bk47_i)>>2)];
 var $cmp48_i=($45|0)==($v_0_i|0);
 if($cmp48_i){label=37;break;}else{label=39;break;}
 case 37: 
 var $fd50_i=(($42+8)|0);
 var $46=HEAP32[(($fd50_i)>>2)];
 var $cmp51_i=($46|0)==($v_0_i|0);
 if($cmp51_i){label=38;break;}else{label=39;break;}
 case 38: 
 HEAP32[(($bk47_i)>>2)]=$42;
 HEAP32[(($fd50_i)>>2)]=$43;
 var $R_1_i=$42;label=47;break;
 case 39: 
 _abort();
 throw "Reached an unreachable!";
 case 40: 
 var $arrayidx61_i=(($v_0_i+20)|0);
 var $47=HEAP32[(($arrayidx61_i)>>2)];
 var $cmp62_i=($47|0)==0;
 if($cmp62_i){label=41;break;}else{var $R_0_i=$47;var $RP_0_i=$arrayidx61_i;label=42;break;}
 case 41: 
 var $arrayidx65_i=(($v_0_i+16)|0);
 var $48=HEAP32[(($arrayidx65_i)>>2)];
 var $cmp66_i=($48|0)==0;
 if($cmp66_i){var $R_1_i=0;label=47;break;}else{var $R_0_i=$48;var $RP_0_i=$arrayidx65_i;label=42;break;}
 case 42: 
 var $RP_0_i;
 var $R_0_i;
 var $arrayidx71_i=(($R_0_i+20)|0);
 var $49=HEAP32[(($arrayidx71_i)>>2)];
 var $cmp72_i=($49|0)==0;
 if($cmp72_i){label=43;break;}else{var $R_0_i=$49;var $RP_0_i=$arrayidx71_i;label=42;break;}
 case 43: 
 var $arrayidx75_i=(($R_0_i+16)|0);
 var $50=HEAP32[(($arrayidx75_i)>>2)];
 var $cmp76_i=($50|0)==0;
 if($cmp76_i){label=44;break;}else{var $R_0_i=$50;var $RP_0_i=$arrayidx75_i;label=42;break;}
 case 44: 
 var $51=$RP_0_i;
 var $cmp81_i=($51>>>0)<($39>>>0);
 if($cmp81_i){label=46;break;}else{label=45;break;}
 case 45: 
 HEAP32[(($RP_0_i)>>2)]=0;
 var $R_1_i=$R_0_i;label=47;break;
 case 46: 
 _abort();
 throw "Reached an unreachable!";
 case 47: 
 var $R_1_i;
 var $cmp90_i=($41|0)==0;
 if($cmp90_i){label=67;break;}else{label=48;break;}
 case 48: 
 var $index_i=(($v_0_i+28)|0);
 var $52=HEAP32[(($index_i)>>2)];
 var $arrayidx94_i=((784+($52<<2))|0);
 var $53=HEAP32[(($arrayidx94_i)>>2)];
 var $cmp95_i=($v_0_i|0)==($53|0);
 if($cmp95_i){label=49;break;}else{label=51;break;}
 case 49: 
 HEAP32[(($arrayidx94_i)>>2)]=$R_1_i;
 var $cond5_i=($R_1_i|0)==0;
 if($cond5_i){label=50;break;}else{label=57;break;}
 case 50: 
 var $54=HEAP32[(($index_i)>>2)];
 var $shl_i=1<<$54;
 var $neg_i=$shl_i^-1;
 var $55=HEAP32[((484)>>2)];
 var $and103_i=$55&$neg_i;
 HEAP32[((484)>>2)]=$and103_i;
 label=67;break;
 case 51: 
 var $56=$41;
 var $57=HEAP32[((496)>>2)];
 var $cmp107_i=($56>>>0)<($57>>>0);
 if($cmp107_i){label=55;break;}else{label=52;break;}
 case 52: 
 var $arrayidx113_i=(($41+16)|0);
 var $58=HEAP32[(($arrayidx113_i)>>2)];
 var $cmp114_i=($58|0)==($v_0_i|0);
 if($cmp114_i){label=53;break;}else{label=54;break;}
 case 53: 
 HEAP32[(($arrayidx113_i)>>2)]=$R_1_i;
 label=56;break;
 case 54: 
 var $arrayidx121_i=(($41+20)|0);
 HEAP32[(($arrayidx121_i)>>2)]=$R_1_i;
 label=56;break;
 case 55: 
 _abort();
 throw "Reached an unreachable!";
 case 56: 
 var $cmp126_i=($R_1_i|0)==0;
 if($cmp126_i){label=67;break;}else{label=57;break;}
 case 57: 
 var $59=$R_1_i;
 var $60=HEAP32[((496)>>2)];
 var $cmp130_i=($59>>>0)<($60>>>0);
 if($cmp130_i){label=66;break;}else{label=58;break;}
 case 58: 
 var $parent135_i=(($R_1_i+24)|0);
 HEAP32[(($parent135_i)>>2)]=$41;
 var $arrayidx137_i=(($v_0_i+16)|0);
 var $61=HEAP32[(($arrayidx137_i)>>2)];
 var $cmp138_i=($61|0)==0;
 if($cmp138_i){label=62;break;}else{label=59;break;}
 case 59: 
 var $62=$61;
 var $63=HEAP32[((496)>>2)];
 var $cmp142_i=($62>>>0)<($63>>>0);
 if($cmp142_i){label=61;break;}else{label=60;break;}
 case 60: 
 var $arrayidx148_i=(($R_1_i+16)|0);
 HEAP32[(($arrayidx148_i)>>2)]=$61;
 var $parent149_i=(($61+24)|0);
 HEAP32[(($parent149_i)>>2)]=$R_1_i;
 label=62;break;
 case 61: 
 _abort();
 throw "Reached an unreachable!";
 case 62: 
 var $arrayidx154_i=(($v_0_i+20)|0);
 var $64=HEAP32[(($arrayidx154_i)>>2)];
 var $cmp155_i=($64|0)==0;
 if($cmp155_i){label=67;break;}else{label=63;break;}
 case 63: 
 var $65=$64;
 var $66=HEAP32[((496)>>2)];
 var $cmp159_i=($65>>>0)<($66>>>0);
 if($cmp159_i){label=65;break;}else{label=64;break;}
 case 64: 
 var $arrayidx165_i=(($R_1_i+20)|0);
 HEAP32[(($arrayidx165_i)>>2)]=$64;
 var $parent166_i=(($64+24)|0);
 HEAP32[(($parent166_i)>>2)]=$R_1_i;
 label=67;break;
 case 65: 
 _abort();
 throw "Reached an unreachable!";
 case 66: 
 _abort();
 throw "Reached an unreachable!";
 case 67: 
 var $cmp174_i=($rsize_0_i>>>0)<16;
 if($cmp174_i){label=68;break;}else{label=69;break;}
 case 68: 
 var $add177_i=((($rsize_0_i)+($cond))|0);
 var $or178_i=$add177_i|3;
 var $head179_i=(($v_0_i+4)|0);
 HEAP32[(($head179_i)>>2)]=$or178_i;
 var $add_ptr181_sum_i=((($add177_i)+(4))|0);
 var $head182_i=(($38+$add_ptr181_sum_i)|0);
 var $67=$head182_i;
 var $68=HEAP32[(($67)>>2)];
 var $or183_i=$68|1;
 HEAP32[(($67)>>2)]=$or183_i;
 label=77;break;
 case 69: 
 var $or186_i=$cond|3;
 var $head187_i=(($v_0_i+4)|0);
 HEAP32[(($head187_i)>>2)]=$or186_i;
 var $or188_i=$rsize_0_i|1;
 var $add_ptr_sum_i175=$cond|4;
 var $head189_i=(($38+$add_ptr_sum_i175)|0);
 var $69=$head189_i;
 HEAP32[(($69)>>2)]=$or188_i;
 var $add_ptr_sum1_i=((($rsize_0_i)+($cond))|0);
 var $add_ptr190_i=(($38+$add_ptr_sum1_i)|0);
 var $prev_foot_i=$add_ptr190_i;
 HEAP32[(($prev_foot_i)>>2)]=$rsize_0_i;
 var $70=HEAP32[((488)>>2)];
 var $cmp191_i=($70|0)==0;
 if($cmp191_i){label=75;break;}else{label=70;break;}
 case 70: 
 var $71=HEAP32[((500)>>2)];
 var $shr194_i=$70>>>3;
 var $shl195_i=$shr194_i<<1;
 var $arrayidx196_i=((520+($shl195_i<<2))|0);
 var $72=$arrayidx196_i;
 var $73=HEAP32[((480)>>2)];
 var $shl198_i=1<<$shr194_i;
 var $and199_i=$73&$shl198_i;
 var $tobool200_i=($and199_i|0)==0;
 if($tobool200_i){label=71;break;}else{label=72;break;}
 case 71: 
 var $or204_i=$73|$shl198_i;
 HEAP32[((480)>>2)]=$or204_i;
 var $arrayidx196_sum_pre_i=((($shl195_i)+(2))|0);
 var $_pre_i=((520+($arrayidx196_sum_pre_i<<2))|0);
 var $F197_0_i=$72;var $_pre_phi_i=$_pre_i;label=74;break;
 case 72: 
 var $arrayidx196_sum2_i=((($shl195_i)+(2))|0);
 var $74=((520+($arrayidx196_sum2_i<<2))|0);
 var $75=HEAP32[(($74)>>2)];
 var $76=$75;
 var $77=HEAP32[((496)>>2)];
 var $cmp208_i=($76>>>0)<($77>>>0);
 if($cmp208_i){label=73;break;}else{var $F197_0_i=$75;var $_pre_phi_i=$74;label=74;break;}
 case 73: 
 _abort();
 throw "Reached an unreachable!";
 case 74: 
 var $_pre_phi_i;
 var $F197_0_i;
 HEAP32[(($_pre_phi_i)>>2)]=$71;
 var $bk218_i=(($F197_0_i+12)|0);
 HEAP32[(($bk218_i)>>2)]=$71;
 var $fd219_i=(($71+8)|0);
 HEAP32[(($fd219_i)>>2)]=$F197_0_i;
 var $bk220_i=(($71+12)|0);
 HEAP32[(($bk220_i)>>2)]=$72;
 label=75;break;
 case 75: 
 HEAP32[((488)>>2)]=$rsize_0_i;
 HEAP32[((500)>>2)]=$40;
 label=77;break;
 case 76: 
 _abort();
 throw "Reached an unreachable!";
 case 77: 
 var $add_ptr225_i=(($v_0_i+8)|0);
 var $78=$add_ptr225_i;
 var $cmp130=($add_ptr225_i|0)==0;
 if($cmp130){var $nb_0=$cond;label=160;break;}else{var $mem_0=$78;label=341;break;}
 case 78: 
 var $cmp138=($bytes>>>0)>4294967231;
 if($cmp138){var $nb_0=-1;label=160;break;}else{label=79;break;}
 case 79: 
 var $add143=((($bytes)+(11))|0);
 var $and144=$add143&-8;
 var $79=HEAP32[((484)>>2)];
 var $cmp145=($79|0)==0;
 if($cmp145){var $nb_0=$and144;label=160;break;}else{label=80;break;}
 case 80: 
 var $sub_i107=(((-$and144))|0);
 var $shr_i108=$add143>>>8;
 var $cmp_i109=($shr_i108|0)==0;
 if($cmp_i109){var $idx_0_i=0;label=83;break;}else{label=81;break;}
 case 81: 
 var $cmp1_i=($and144>>>0)>16777215;
 if($cmp1_i){var $idx_0_i=31;label=83;break;}else{label=82;break;}
 case 82: 
 var $sub4_i=((($shr_i108)+(1048320))|0);
 var $shr5_i111=$sub4_i>>>16;
 var $and_i112=$shr5_i111&8;
 var $shl_i113=$shr_i108<<$and_i112;
 var $sub6_i=((($shl_i113)+(520192))|0);
 var $shr7_i114=$sub6_i>>>16;
 var $and8_i=$shr7_i114&4;
 var $add_i115=$and8_i|$and_i112;
 var $shl9_i=$shl_i113<<$and8_i;
 var $sub10_i=((($shl9_i)+(245760))|0);
 var $shr11_i116=$sub10_i>>>16;
 var $and12_i=$shr11_i116&2;
 var $add13_i=$add_i115|$and12_i;
 var $sub14_i=(((14)-($add13_i))|0);
 var $shl15_i=$shl9_i<<$and12_i;
 var $shr16_i117=$shl15_i>>>15;
 var $add17_i=((($sub14_i)+($shr16_i117))|0);
 var $shl18_i=$add17_i<<1;
 var $add19_i=((($add17_i)+(7))|0);
 var $shr20_i=$and144>>>($add19_i>>>0);
 var $and21_i118=$shr20_i&1;
 var $add22_i=$and21_i118|$shl18_i;
 var $idx_0_i=$add22_i;label=83;break;
 case 83: 
 var $idx_0_i;
 var $arrayidx_i119=((784+($idx_0_i<<2))|0);
 var $80=HEAP32[(($arrayidx_i119)>>2)];
 var $cmp24_i=($80|0)==0;
 if($cmp24_i){var $v_2_i=0;var $rsize_2_i=$sub_i107;var $t_1_i=0;label=90;break;}else{label=84;break;}
 case 84: 
 var $cmp26_i=($idx_0_i|0)==31;
 if($cmp26_i){var $cond_i=0;label=86;break;}else{label=85;break;}
 case 85: 
 var $shr27_i=$idx_0_i>>>1;
 var $sub30_i=(((25)-($shr27_i))|0);
 var $cond_i=$sub30_i;label=86;break;
 case 86: 
 var $cond_i;
 var $shl31_i=$and144<<$cond_i;
 var $v_0_i123=0;var $rsize_0_i122=$sub_i107;var $t_0_i121=$80;var $sizebits_0_i=$shl31_i;var $rst_0_i=0;label=87;break;
 case 87: 
 var $rst_0_i;
 var $sizebits_0_i;
 var $t_0_i121;
 var $rsize_0_i122;
 var $v_0_i123;
 var $head_i124=(($t_0_i121+4)|0);
 var $81=HEAP32[(($head_i124)>>2)];
 var $and32_i=$81&-8;
 var $sub33_i=((($and32_i)-($and144))|0);
 var $cmp34_i=($sub33_i>>>0)<($rsize_0_i122>>>0);
 if($cmp34_i){label=88;break;}else{var $v_1_i=$v_0_i123;var $rsize_1_i=$rsize_0_i122;label=89;break;}
 case 88: 
 var $cmp36_i=($and32_i|0)==($and144|0);
 if($cmp36_i){var $v_2_i=$t_0_i121;var $rsize_2_i=$sub33_i;var $t_1_i=$t_0_i121;label=90;break;}else{var $v_1_i=$t_0_i121;var $rsize_1_i=$sub33_i;label=89;break;}
 case 89: 
 var $rsize_1_i;
 var $v_1_i;
 var $arrayidx40_i=(($t_0_i121+20)|0);
 var $82=HEAP32[(($arrayidx40_i)>>2)];
 var $shr41_i=$sizebits_0_i>>>31;
 var $arrayidx44_i=(($t_0_i121+16+($shr41_i<<2))|0);
 var $83=HEAP32[(($arrayidx44_i)>>2)];
 var $cmp45_i125=($82|0)==0;
 var $cmp46_i=($82|0)==($83|0);
 var $or_cond_i=$cmp45_i125|$cmp46_i;
 var $rst_1_i=($or_cond_i?$rst_0_i:$82);
 var $cmp49_i=($83|0)==0;
 var $shl52_i=$sizebits_0_i<<1;
 if($cmp49_i){var $v_2_i=$v_1_i;var $rsize_2_i=$rsize_1_i;var $t_1_i=$rst_1_i;label=90;break;}else{var $v_0_i123=$v_1_i;var $rsize_0_i122=$rsize_1_i;var $t_0_i121=$83;var $sizebits_0_i=$shl52_i;var $rst_0_i=$rst_1_i;label=87;break;}
 case 90: 
 var $t_1_i;
 var $rsize_2_i;
 var $v_2_i;
 var $cmp54_i=($t_1_i|0)==0;
 var $cmp56_i=($v_2_i|0)==0;
 var $or_cond18_i=$cmp54_i&$cmp56_i;
 if($or_cond18_i){label=91;break;}else{var $t_2_ph_i=$t_1_i;label=93;break;}
 case 91: 
 var $shl59_i=2<<$idx_0_i;
 var $sub62_i=(((-$shl59_i))|0);
 var $or_i=$shl59_i|$sub62_i;
 var $and63_i=$79&$or_i;
 var $cmp64_i=($and63_i|0)==0;
 if($cmp64_i){var $nb_0=$and144;label=160;break;}else{label=92;break;}
 case 92: 
 var $sub66_i=(((-$and63_i))|0);
 var $and67_i=$and63_i&$sub66_i;
 var $sub69_i=((($and67_i)-(1))|0);
 var $shr71_i=$sub69_i>>>12;
 var $and72_i=$shr71_i&16;
 var $shr74_i=$sub69_i>>>($and72_i>>>0);
 var $shr75_i=$shr74_i>>>5;
 var $and76_i=$shr75_i&8;
 var $add77_i=$and76_i|$and72_i;
 var $shr78_i=$shr74_i>>>($and76_i>>>0);
 var $shr79_i=$shr78_i>>>2;
 var $and80_i=$shr79_i&4;
 var $add81_i=$add77_i|$and80_i;
 var $shr82_i=$shr78_i>>>($and80_i>>>0);
 var $shr83_i=$shr82_i>>>1;
 var $and84_i=$shr83_i&2;
 var $add85_i=$add81_i|$and84_i;
 var $shr86_i=$shr82_i>>>($and84_i>>>0);
 var $shr87_i=$shr86_i>>>1;
 var $and88_i=$shr87_i&1;
 var $add89_i=$add85_i|$and88_i;
 var $shr90_i=$shr86_i>>>($and88_i>>>0);
 var $add91_i=((($add89_i)+($shr90_i))|0);
 var $arrayidx93_i=((784+($add91_i<<2))|0);
 var $84=HEAP32[(($arrayidx93_i)>>2)];
 var $t_2_ph_i=$84;label=93;break;
 case 93: 
 var $t_2_ph_i;
 var $cmp9623_i=($t_2_ph_i|0)==0;
 if($cmp9623_i){var $rsize_3_lcssa_i=$rsize_2_i;var $v_3_lcssa_i=$v_2_i;label=96;break;}else{var $t_224_i=$t_2_ph_i;var $rsize_325_i=$rsize_2_i;var $v_326_i=$v_2_i;label=94;break;}
 case 94: 
 var $v_326_i;
 var $rsize_325_i;
 var $t_224_i;
 var $head98_i=(($t_224_i+4)|0);
 var $85=HEAP32[(($head98_i)>>2)];
 var $and99_i=$85&-8;
 var $sub100_i=((($and99_i)-($and144))|0);
 var $cmp101_i=($sub100_i>>>0)<($rsize_325_i>>>0);
 var $sub100_rsize_3_i=($cmp101_i?$sub100_i:$rsize_325_i);
 var $t_2_v_3_i=($cmp101_i?$t_224_i:$v_326_i);
 var $arrayidx105_i=(($t_224_i+16)|0);
 var $86=HEAP32[(($arrayidx105_i)>>2)];
 var $cmp106_i=($86|0)==0;
 if($cmp106_i){label=95;break;}else{var $t_224_i=$86;var $rsize_325_i=$sub100_rsize_3_i;var $v_326_i=$t_2_v_3_i;label=94;break;}
 case 95: 
 var $arrayidx112_i=(($t_224_i+20)|0);
 var $87=HEAP32[(($arrayidx112_i)>>2)];
 var $cmp96_i=($87|0)==0;
 if($cmp96_i){var $rsize_3_lcssa_i=$sub100_rsize_3_i;var $v_3_lcssa_i=$t_2_v_3_i;label=96;break;}else{var $t_224_i=$87;var $rsize_325_i=$sub100_rsize_3_i;var $v_326_i=$t_2_v_3_i;label=94;break;}
 case 96: 
 var $v_3_lcssa_i;
 var $rsize_3_lcssa_i;
 var $cmp115_i=($v_3_lcssa_i|0)==0;
 if($cmp115_i){var $nb_0=$and144;label=160;break;}else{label=97;break;}
 case 97: 
 var $88=HEAP32[((488)>>2)];
 var $sub117_i=((($88)-($and144))|0);
 var $cmp118_i=($rsize_3_lcssa_i>>>0)<($sub117_i>>>0);
 if($cmp118_i){label=98;break;}else{var $nb_0=$and144;label=160;break;}
 case 98: 
 var $89=$v_3_lcssa_i;
 var $90=HEAP32[((496)>>2)];
 var $cmp120_i=($89>>>0)<($90>>>0);
 if($cmp120_i){label=158;break;}else{label=99;break;}
 case 99: 
 var $add_ptr_i128=(($89+$and144)|0);
 var $91=$add_ptr_i128;
 var $cmp122_i=($89>>>0)<($add_ptr_i128>>>0);
 if($cmp122_i){label=100;break;}else{label=158;break;}
 case 100: 
 var $parent_i129=(($v_3_lcssa_i+24)|0);
 var $92=HEAP32[(($parent_i129)>>2)];
 var $bk_i130=(($v_3_lcssa_i+12)|0);
 var $93=HEAP32[(($bk_i130)>>2)];
 var $cmp127_i=($93|0)==($v_3_lcssa_i|0);
 if($cmp127_i){label=106;break;}else{label=101;break;}
 case 101: 
 var $fd_i131=(($v_3_lcssa_i+8)|0);
 var $94=HEAP32[(($fd_i131)>>2)];
 var $95=$94;
 var $cmp132_i=($95>>>0)<($90>>>0);
 if($cmp132_i){label=105;break;}else{label=102;break;}
 case 102: 
 var $bk135_i=(($94+12)|0);
 var $96=HEAP32[(($bk135_i)>>2)];
 var $cmp136_i=($96|0)==($v_3_lcssa_i|0);
 if($cmp136_i){label=103;break;}else{label=105;break;}
 case 103: 
 var $fd138_i=(($93+8)|0);
 var $97=HEAP32[(($fd138_i)>>2)];
 var $cmp139_i=($97|0)==($v_3_lcssa_i|0);
 if($cmp139_i){label=104;break;}else{label=105;break;}
 case 104: 
 HEAP32[(($bk135_i)>>2)]=$93;
 HEAP32[(($fd138_i)>>2)]=$94;
 var $R_1_i139=$93;label=113;break;
 case 105: 
 _abort();
 throw "Reached an unreachable!";
 case 106: 
 var $arrayidx150_i=(($v_3_lcssa_i+20)|0);
 var $98=HEAP32[(($arrayidx150_i)>>2)];
 var $cmp151_i=($98|0)==0;
 if($cmp151_i){label=107;break;}else{var $R_0_i137=$98;var $RP_0_i136=$arrayidx150_i;label=108;break;}
 case 107: 
 var $arrayidx154_i133=(($v_3_lcssa_i+16)|0);
 var $99=HEAP32[(($arrayidx154_i133)>>2)];
 var $cmp155_i134=($99|0)==0;
 if($cmp155_i134){var $R_1_i139=0;label=113;break;}else{var $R_0_i137=$99;var $RP_0_i136=$arrayidx154_i133;label=108;break;}
 case 108: 
 var $RP_0_i136;
 var $R_0_i137;
 var $arrayidx160_i=(($R_0_i137+20)|0);
 var $100=HEAP32[(($arrayidx160_i)>>2)];
 var $cmp161_i=($100|0)==0;
 if($cmp161_i){label=109;break;}else{var $R_0_i137=$100;var $RP_0_i136=$arrayidx160_i;label=108;break;}
 case 109: 
 var $arrayidx164_i=(($R_0_i137+16)|0);
 var $101=HEAP32[(($arrayidx164_i)>>2)];
 var $cmp165_i=($101|0)==0;
 if($cmp165_i){label=110;break;}else{var $R_0_i137=$101;var $RP_0_i136=$arrayidx164_i;label=108;break;}
 case 110: 
 var $102=$RP_0_i136;
 var $cmp170_i=($102>>>0)<($90>>>0);
 if($cmp170_i){label=112;break;}else{label=111;break;}
 case 111: 
 HEAP32[(($RP_0_i136)>>2)]=0;
 var $R_1_i139=$R_0_i137;label=113;break;
 case 112: 
 _abort();
 throw "Reached an unreachable!";
 case 113: 
 var $R_1_i139;
 var $cmp179_i=($92|0)==0;
 if($cmp179_i){label=133;break;}else{label=114;break;}
 case 114: 
 var $index_i140=(($v_3_lcssa_i+28)|0);
 var $103=HEAP32[(($index_i140)>>2)];
 var $arrayidx183_i=((784+($103<<2))|0);
 var $104=HEAP32[(($arrayidx183_i)>>2)];
 var $cmp184_i=($v_3_lcssa_i|0)==($104|0);
 if($cmp184_i){label=115;break;}else{label=117;break;}
 case 115: 
 HEAP32[(($arrayidx183_i)>>2)]=$R_1_i139;
 var $cond20_i=($R_1_i139|0)==0;
 if($cond20_i){label=116;break;}else{label=123;break;}
 case 116: 
 var $105=HEAP32[(($index_i140)>>2)];
 var $shl191_i=1<<$105;
 var $neg_i141=$shl191_i^-1;
 var $106=HEAP32[((484)>>2)];
 var $and193_i=$106&$neg_i141;
 HEAP32[((484)>>2)]=$and193_i;
 label=133;break;
 case 117: 
 var $107=$92;
 var $108=HEAP32[((496)>>2)];
 var $cmp197_i=($107>>>0)<($108>>>0);
 if($cmp197_i){label=121;break;}else{label=118;break;}
 case 118: 
 var $arrayidx203_i=(($92+16)|0);
 var $109=HEAP32[(($arrayidx203_i)>>2)];
 var $cmp204_i=($109|0)==($v_3_lcssa_i|0);
 if($cmp204_i){label=119;break;}else{label=120;break;}
 case 119: 
 HEAP32[(($arrayidx203_i)>>2)]=$R_1_i139;
 label=122;break;
 case 120: 
 var $arrayidx211_i=(($92+20)|0);
 HEAP32[(($arrayidx211_i)>>2)]=$R_1_i139;
 label=122;break;
 case 121: 
 _abort();
 throw "Reached an unreachable!";
 case 122: 
 var $cmp216_i=($R_1_i139|0)==0;
 if($cmp216_i){label=133;break;}else{label=123;break;}
 case 123: 
 var $110=$R_1_i139;
 var $111=HEAP32[((496)>>2)];
 var $cmp220_i=($110>>>0)<($111>>>0);
 if($cmp220_i){label=132;break;}else{label=124;break;}
 case 124: 
 var $parent225_i=(($R_1_i139+24)|0);
 HEAP32[(($parent225_i)>>2)]=$92;
 var $arrayidx227_i=(($v_3_lcssa_i+16)|0);
 var $112=HEAP32[(($arrayidx227_i)>>2)];
 var $cmp228_i=($112|0)==0;
 if($cmp228_i){label=128;break;}else{label=125;break;}
 case 125: 
 var $113=$112;
 var $114=HEAP32[((496)>>2)];
 var $cmp232_i=($113>>>0)<($114>>>0);
 if($cmp232_i){label=127;break;}else{label=126;break;}
 case 126: 
 var $arrayidx238_i=(($R_1_i139+16)|0);
 HEAP32[(($arrayidx238_i)>>2)]=$112;
 var $parent239_i=(($112+24)|0);
 HEAP32[(($parent239_i)>>2)]=$R_1_i139;
 label=128;break;
 case 127: 
 _abort();
 throw "Reached an unreachable!";
 case 128: 
 var $arrayidx244_i=(($v_3_lcssa_i+20)|0);
 var $115=HEAP32[(($arrayidx244_i)>>2)];
 var $cmp245_i=($115|0)==0;
 if($cmp245_i){label=133;break;}else{label=129;break;}
 case 129: 
 var $116=$115;
 var $117=HEAP32[((496)>>2)];
 var $cmp249_i=($116>>>0)<($117>>>0);
 if($cmp249_i){label=131;break;}else{label=130;break;}
 case 130: 
 var $arrayidx255_i=(($R_1_i139+20)|0);
 HEAP32[(($arrayidx255_i)>>2)]=$115;
 var $parent256_i=(($115+24)|0);
 HEAP32[(($parent256_i)>>2)]=$R_1_i139;
 label=133;break;
 case 131: 
 _abort();
 throw "Reached an unreachable!";
 case 132: 
 _abort();
 throw "Reached an unreachable!";
 case 133: 
 var $cmp264_i=($rsize_3_lcssa_i>>>0)<16;
 if($cmp264_i){label=134;break;}else{label=135;break;}
 case 134: 
 var $add267_i=((($rsize_3_lcssa_i)+($and144))|0);
 var $or269_i=$add267_i|3;
 var $head270_i=(($v_3_lcssa_i+4)|0);
 HEAP32[(($head270_i)>>2)]=$or269_i;
 var $add_ptr272_sum_i=((($add267_i)+(4))|0);
 var $head273_i=(($89+$add_ptr272_sum_i)|0);
 var $118=$head273_i;
 var $119=HEAP32[(($118)>>2)];
 var $or274_i=$119|1;
 HEAP32[(($118)>>2)]=$or274_i;
 label=159;break;
 case 135: 
 var $or277_i=$and144|3;
 var $head278_i=(($v_3_lcssa_i+4)|0);
 HEAP32[(($head278_i)>>2)]=$or277_i;
 var $or279_i=$rsize_3_lcssa_i|1;
 var $add_ptr_sum_i143174=$and144|4;
 var $head280_i=(($89+$add_ptr_sum_i143174)|0);
 var $120=$head280_i;
 HEAP32[(($120)>>2)]=$or279_i;
 var $add_ptr_sum1_i144=((($rsize_3_lcssa_i)+($and144))|0);
 var $add_ptr281_i=(($89+$add_ptr_sum1_i144)|0);
 var $prev_foot_i145=$add_ptr281_i;
 HEAP32[(($prev_foot_i145)>>2)]=$rsize_3_lcssa_i;
 var $shr282_i=$rsize_3_lcssa_i>>>3;
 var $cmp283_i=($rsize_3_lcssa_i>>>0)<256;
 if($cmp283_i){label=136;break;}else{label=141;break;}
 case 136: 
 var $shl287_i=$shr282_i<<1;
 var $arrayidx288_i=((520+($shl287_i<<2))|0);
 var $121=$arrayidx288_i;
 var $122=HEAP32[((480)>>2)];
 var $shl290_i=1<<$shr282_i;
 var $and291_i=$122&$shl290_i;
 var $tobool292_i=($and291_i|0)==0;
 if($tobool292_i){label=137;break;}else{label=138;break;}
 case 137: 
 var $or296_i=$122|$shl290_i;
 HEAP32[((480)>>2)]=$or296_i;
 var $arrayidx288_sum_pre_i=((($shl287_i)+(2))|0);
 var $_pre_i146=((520+($arrayidx288_sum_pre_i<<2))|0);
 var $F289_0_i=$121;var $_pre_phi_i147=$_pre_i146;label=140;break;
 case 138: 
 var $arrayidx288_sum16_i=((($shl287_i)+(2))|0);
 var $123=((520+($arrayidx288_sum16_i<<2))|0);
 var $124=HEAP32[(($123)>>2)];
 var $125=$124;
 var $126=HEAP32[((496)>>2)];
 var $cmp300_i=($125>>>0)<($126>>>0);
 if($cmp300_i){label=139;break;}else{var $F289_0_i=$124;var $_pre_phi_i147=$123;label=140;break;}
 case 139: 
 _abort();
 throw "Reached an unreachable!";
 case 140: 
 var $_pre_phi_i147;
 var $F289_0_i;
 HEAP32[(($_pre_phi_i147)>>2)]=$91;
 var $bk310_i=(($F289_0_i+12)|0);
 HEAP32[(($bk310_i)>>2)]=$91;
 var $add_ptr_sum14_i=((($and144)+(8))|0);
 var $fd311_i=(($89+$add_ptr_sum14_i)|0);
 var $127=$fd311_i;
 HEAP32[(($127)>>2)]=$F289_0_i;
 var $add_ptr_sum15_i=((($and144)+(12))|0);
 var $bk312_i=(($89+$add_ptr_sum15_i)|0);
 var $128=$bk312_i;
 HEAP32[(($128)>>2)]=$121;
 label=159;break;
 case 141: 
 var $129=$add_ptr_i128;
 var $shr317_i=$rsize_3_lcssa_i>>>8;
 var $cmp318_i=($shr317_i|0)==0;
 if($cmp318_i){var $I315_0_i=0;label=144;break;}else{label=142;break;}
 case 142: 
 var $cmp322_i=($rsize_3_lcssa_i>>>0)>16777215;
 if($cmp322_i){var $I315_0_i=31;label=144;break;}else{label=143;break;}
 case 143: 
 var $sub328_i=((($shr317_i)+(1048320))|0);
 var $shr329_i=$sub328_i>>>16;
 var $and330_i=$shr329_i&8;
 var $shl332_i=$shr317_i<<$and330_i;
 var $sub333_i=((($shl332_i)+(520192))|0);
 var $shr334_i=$sub333_i>>>16;
 var $and335_i=$shr334_i&4;
 var $add336_i=$and335_i|$and330_i;
 var $shl337_i=$shl332_i<<$and335_i;
 var $sub338_i=((($shl337_i)+(245760))|0);
 var $shr339_i=$sub338_i>>>16;
 var $and340_i=$shr339_i&2;
 var $add341_i=$add336_i|$and340_i;
 var $sub342_i=(((14)-($add341_i))|0);
 var $shl343_i=$shl337_i<<$and340_i;
 var $shr344_i=$shl343_i>>>15;
 var $add345_i=((($sub342_i)+($shr344_i))|0);
 var $shl346_i=$add345_i<<1;
 var $add347_i=((($add345_i)+(7))|0);
 var $shr348_i=$rsize_3_lcssa_i>>>($add347_i>>>0);
 var $and349_i=$shr348_i&1;
 var $add350_i=$and349_i|$shl346_i;
 var $I315_0_i=$add350_i;label=144;break;
 case 144: 
 var $I315_0_i;
 var $arrayidx354_i=((784+($I315_0_i<<2))|0);
 var $add_ptr_sum2_i=((($and144)+(28))|0);
 var $index355_i=(($89+$add_ptr_sum2_i)|0);
 var $130=$index355_i;
 HEAP32[(($130)>>2)]=$I315_0_i;
 var $add_ptr_sum3_i=((($and144)+(16))|0);
 var $child356_i=(($89+$add_ptr_sum3_i)|0);
 var $child356_sum_i=((($and144)+(20))|0);
 var $arrayidx357_i=(($89+$child356_sum_i)|0);
 var $131=$arrayidx357_i;
 HEAP32[(($131)>>2)]=0;
 var $arrayidx359_i=$child356_i;
 HEAP32[(($arrayidx359_i)>>2)]=0;
 var $132=HEAP32[((484)>>2)];
 var $shl361_i=1<<$I315_0_i;
 var $and362_i=$132&$shl361_i;
 var $tobool363_i=($and362_i|0)==0;
 if($tobool363_i){label=145;break;}else{label=146;break;}
 case 145: 
 var $or367_i=$132|$shl361_i;
 HEAP32[((484)>>2)]=$or367_i;
 HEAP32[(($arrayidx354_i)>>2)]=$129;
 var $133=$arrayidx354_i;
 var $add_ptr_sum4_i=((($and144)+(24))|0);
 var $parent368_i=(($89+$add_ptr_sum4_i)|0);
 var $134=$parent368_i;
 HEAP32[(($134)>>2)]=$133;
 var $add_ptr_sum5_i=((($and144)+(12))|0);
 var $bk369_i=(($89+$add_ptr_sum5_i)|0);
 var $135=$bk369_i;
 HEAP32[(($135)>>2)]=$129;
 var $add_ptr_sum6_i=((($and144)+(8))|0);
 var $fd370_i=(($89+$add_ptr_sum6_i)|0);
 var $136=$fd370_i;
 HEAP32[(($136)>>2)]=$129;
 label=159;break;
 case 146: 
 var $137=HEAP32[(($arrayidx354_i)>>2)];
 var $cmp373_i=($I315_0_i|0)==31;
 if($cmp373_i){var $cond382_i=0;label=148;break;}else{label=147;break;}
 case 147: 
 var $shr377_i=$I315_0_i>>>1;
 var $sub380_i=(((25)-($shr377_i))|0);
 var $cond382_i=$sub380_i;label=148;break;
 case 148: 
 var $cond382_i;
 var $shl383_i=$rsize_3_lcssa_i<<$cond382_i;
 var $K372_0_i=$shl383_i;var $T_0_i=$137;label=149;break;
 case 149: 
 var $T_0_i;
 var $K372_0_i;
 var $head385_i=(($T_0_i+4)|0);
 var $138=HEAP32[(($head385_i)>>2)];
 var $and386_i=$138&-8;
 var $cmp387_i=($and386_i|0)==($rsize_3_lcssa_i|0);
 if($cmp387_i){label=154;break;}else{label=150;break;}
 case 150: 
 var $shr390_i=$K372_0_i>>>31;
 var $arrayidx393_i=(($T_0_i+16+($shr390_i<<2))|0);
 var $139=HEAP32[(($arrayidx393_i)>>2)];
 var $cmp395_i=($139|0)==0;
 var $shl394_i=$K372_0_i<<1;
 if($cmp395_i){label=151;break;}else{var $K372_0_i=$shl394_i;var $T_0_i=$139;label=149;break;}
 case 151: 
 var $140=$arrayidx393_i;
 var $141=HEAP32[((496)>>2)];
 var $cmp400_i=($140>>>0)<($141>>>0);
 if($cmp400_i){label=153;break;}else{label=152;break;}
 case 152: 
 HEAP32[(($arrayidx393_i)>>2)]=$129;
 var $add_ptr_sum11_i=((($and144)+(24))|0);
 var $parent405_i=(($89+$add_ptr_sum11_i)|0);
 var $142=$parent405_i;
 HEAP32[(($142)>>2)]=$T_0_i;
 var $add_ptr_sum12_i=((($and144)+(12))|0);
 var $bk406_i=(($89+$add_ptr_sum12_i)|0);
 var $143=$bk406_i;
 HEAP32[(($143)>>2)]=$129;
 var $add_ptr_sum13_i=((($and144)+(8))|0);
 var $fd407_i=(($89+$add_ptr_sum13_i)|0);
 var $144=$fd407_i;
 HEAP32[(($144)>>2)]=$129;
 label=159;break;
 case 153: 
 _abort();
 throw "Reached an unreachable!";
 case 154: 
 var $fd412_i=(($T_0_i+8)|0);
 var $145=HEAP32[(($fd412_i)>>2)];
 var $146=$T_0_i;
 var $147=HEAP32[((496)>>2)];
 var $cmp414_i=($146>>>0)<($147>>>0);
 if($cmp414_i){label=157;break;}else{label=155;break;}
 case 155: 
 var $148=$145;
 var $cmp418_i=($148>>>0)<($147>>>0);
 if($cmp418_i){label=157;break;}else{label=156;break;}
 case 156: 
 var $bk425_i=(($145+12)|0);
 HEAP32[(($bk425_i)>>2)]=$129;
 HEAP32[(($fd412_i)>>2)]=$129;
 var $add_ptr_sum8_i=((($and144)+(8))|0);
 var $fd427_i=(($89+$add_ptr_sum8_i)|0);
 var $149=$fd427_i;
 HEAP32[(($149)>>2)]=$145;
 var $add_ptr_sum9_i=((($and144)+(12))|0);
 var $bk428_i=(($89+$add_ptr_sum9_i)|0);
 var $150=$bk428_i;
 HEAP32[(($150)>>2)]=$T_0_i;
 var $add_ptr_sum10_i=((($and144)+(24))|0);
 var $parent429_i=(($89+$add_ptr_sum10_i)|0);
 var $151=$parent429_i;
 HEAP32[(($151)>>2)]=0;
 label=159;break;
 case 157: 
 _abort();
 throw "Reached an unreachable!";
 case 158: 
 _abort();
 throw "Reached an unreachable!";
 case 159: 
 var $add_ptr436_i=(($v_3_lcssa_i+8)|0);
 var $152=$add_ptr436_i;
 var $cmp149=($add_ptr436_i|0)==0;
 if($cmp149){var $nb_0=$and144;label=160;break;}else{var $mem_0=$152;label=341;break;}
 case 160: 
 var $nb_0;
 var $153=HEAP32[((488)>>2)];
 var $cmp155=($nb_0>>>0)>($153>>>0);
 if($cmp155){label=165;break;}else{label=161;break;}
 case 161: 
 var $sub159=((($153)-($nb_0))|0);
 var $154=HEAP32[((500)>>2)];
 var $cmp161=($sub159>>>0)>15;
 if($cmp161){label=162;break;}else{label=163;break;}
 case 162: 
 var $155=$154;
 var $add_ptr165=(($155+$nb_0)|0);
 var $156=$add_ptr165;
 HEAP32[((500)>>2)]=$156;
 HEAP32[((488)>>2)]=$sub159;
 var $or166=$sub159|1;
 var $add_ptr165_sum=((($nb_0)+(4))|0);
 var $head167=(($155+$add_ptr165_sum)|0);
 var $157=$head167;
 HEAP32[(($157)>>2)]=$or166;
 var $add_ptr168=(($155+$153)|0);
 var $prev_foot169=$add_ptr168;
 HEAP32[(($prev_foot169)>>2)]=$sub159;
 var $or171=$nb_0|3;
 var $head172=(($154+4)|0);
 HEAP32[(($head172)>>2)]=$or171;
 label=164;break;
 case 163: 
 HEAP32[((488)>>2)]=0;
 HEAP32[((500)>>2)]=0;
 var $or175=$153|3;
 var $head176=(($154+4)|0);
 HEAP32[(($head176)>>2)]=$or175;
 var $158=$154;
 var $add_ptr177_sum=((($153)+(4))|0);
 var $head178=(($158+$add_ptr177_sum)|0);
 var $159=$head178;
 var $160=HEAP32[(($159)>>2)];
 var $or179=$160|1;
 HEAP32[(($159)>>2)]=$or179;
 label=164;break;
 case 164: 
 var $add_ptr181=(($154+8)|0);
 var $161=$add_ptr181;
 var $mem_0=$161;label=341;break;
 case 165: 
 var $162=HEAP32[((492)>>2)];
 var $cmp183=($nb_0>>>0)<($162>>>0);
 if($cmp183){label=166;break;}else{label=167;break;}
 case 166: 
 var $sub187=((($162)-($nb_0))|0);
 HEAP32[((492)>>2)]=$sub187;
 var $163=HEAP32[((504)>>2)];
 var $164=$163;
 var $add_ptr190=(($164+$nb_0)|0);
 var $165=$add_ptr190;
 HEAP32[((504)>>2)]=$165;
 var $or191=$sub187|1;
 var $add_ptr190_sum=((($nb_0)+(4))|0);
 var $head192=(($164+$add_ptr190_sum)|0);
 var $166=$head192;
 HEAP32[(($166)>>2)]=$or191;
 var $or194=$nb_0|3;
 var $head195=(($163+4)|0);
 HEAP32[(($head195)>>2)]=$or194;
 var $add_ptr196=(($163+8)|0);
 var $167=$add_ptr196;
 var $mem_0=$167;label=341;break;
 case 167: 
 var $168=HEAP32[((456)>>2)];
 var $cmp_i148=($168|0)==0;
 if($cmp_i148){label=168;break;}else{label=171;break;}
 case 168: 
 var $call_i_i=_sysconf(30);
 var $sub_i_i=((($call_i_i)-(1))|0);
 var $and_i_i=$sub_i_i&$call_i_i;
 var $cmp1_i_i=($and_i_i|0)==0;
 if($cmp1_i_i){label=170;break;}else{label=169;break;}
 case 169: 
 _abort();
 throw "Reached an unreachable!";
 case 170: 
 HEAP32[((464)>>2)]=$call_i_i;
 HEAP32[((460)>>2)]=$call_i_i;
 HEAP32[((468)>>2)]=-1;
 HEAP32[((472)>>2)]=-1;
 HEAP32[((476)>>2)]=0;
 HEAP32[((924)>>2)]=0;
 var $call6_i_i=_time(0);
 var $xor_i_i=$call6_i_i&-16;
 var $and7_i_i=$xor_i_i^1431655768;
 HEAP32[((456)>>2)]=$and7_i_i;
 label=171;break;
 case 171: 
 var $add_i149=((($nb_0)+(48))|0);
 var $169=HEAP32[((464)>>2)];
 var $sub_i150=((($nb_0)+(47))|0);
 var $add9_i=((($169)+($sub_i150))|0);
 var $neg_i151=(((-$169))|0);
 var $and11_i=$add9_i&$neg_i151;
 var $cmp12_i=($and11_i>>>0)>($nb_0>>>0);
 if($cmp12_i){label=172;break;}else{var $mem_0=0;label=341;break;}
 case 172: 
 var $170=HEAP32[((920)>>2)];
 var $cmp15_i=($170|0)==0;
 if($cmp15_i){label=174;break;}else{label=173;break;}
 case 173: 
 var $171=HEAP32[((912)>>2)];
 var $add17_i152=((($171)+($and11_i))|0);
 var $cmp19_i=($add17_i152>>>0)<=($171>>>0);
 var $cmp21_i=($add17_i152>>>0)>($170>>>0);
 var $or_cond1_i=$cmp19_i|$cmp21_i;
 if($or_cond1_i){var $mem_0=0;label=341;break;}else{label=174;break;}
 case 174: 
 var $172=HEAP32[((924)>>2)];
 var $and26_i=$172&4;
 var $tobool27_i=($and26_i|0)==0;
 if($tobool27_i){label=175;break;}else{var $tsize_1_i=0;label=198;break;}
 case 175: 
 var $173=HEAP32[((504)>>2)];
 var $cmp29_i=($173|0)==0;
 if($cmp29_i){label=181;break;}else{label=176;break;}
 case 176: 
 var $174=$173;
 var $sp_0_i_i=928;label=177;break;
 case 177: 
 var $sp_0_i_i;
 var $base_i_i=(($sp_0_i_i)|0);
 var $175=HEAP32[(($base_i_i)>>2)];
 var $cmp_i9_i=($175>>>0)>($174>>>0);
 if($cmp_i9_i){label=179;break;}else{label=178;break;}
 case 178: 
 var $size_i_i=(($sp_0_i_i+4)|0);
 var $176=HEAP32[(($size_i_i)>>2)];
 var $add_ptr_i_i=(($175+$176)|0);
 var $cmp2_i_i=($add_ptr_i_i>>>0)>($174>>>0);
 if($cmp2_i_i){label=180;break;}else{label=179;break;}
 case 179: 
 var $next_i_i=(($sp_0_i_i+8)|0);
 var $177=HEAP32[(($next_i_i)>>2)];
 var $cmp3_i_i=($177|0)==0;
 if($cmp3_i_i){label=181;break;}else{var $sp_0_i_i=$177;label=177;break;}
 case 180: 
 var $cmp32_i154=($sp_0_i_i|0)==0;
 if($cmp32_i154){label=181;break;}else{label=188;break;}
 case 181: 
 var $call34_i=_sbrk(0);
 var $cmp35_i156=($call34_i|0)==-1;
 if($cmp35_i156){var $tsize_0758385_i=0;label=197;break;}else{label=182;break;}
 case 182: 
 var $178=$call34_i;
 var $179=HEAP32[((460)>>2)];
 var $sub38_i=((($179)-(1))|0);
 var $and39_i=$sub38_i&$178;
 var $cmp40_i157=($and39_i|0)==0;
 if($cmp40_i157){var $ssize_0_i=$and11_i;label=184;break;}else{label=183;break;}
 case 183: 
 var $add43_i=((($sub38_i)+($178))|0);
 var $neg45_i=(((-$179))|0);
 var $and46_i=$add43_i&$neg45_i;
 var $sub47_i=((($and11_i)-($178))|0);
 var $add48_i=((($sub47_i)+($and46_i))|0);
 var $ssize_0_i=$add48_i;label=184;break;
 case 184: 
 var $ssize_0_i;
 var $180=HEAP32[((912)>>2)];
 var $add51_i=((($180)+($ssize_0_i))|0);
 var $cmp52_i=($ssize_0_i>>>0)>($nb_0>>>0);
 var $cmp54_i158=($ssize_0_i>>>0)<2147483647;
 var $or_cond_i159=$cmp52_i&$cmp54_i158;
 if($or_cond_i159){label=185;break;}else{var $tsize_0758385_i=0;label=197;break;}
 case 185: 
 var $181=HEAP32[((920)>>2)];
 var $cmp57_i=($181|0)==0;
 if($cmp57_i){label=187;break;}else{label=186;break;}
 case 186: 
 var $cmp60_i=($add51_i>>>0)<=($180>>>0);
 var $cmp63_i=($add51_i>>>0)>($181>>>0);
 var $or_cond2_i=$cmp60_i|$cmp63_i;
 if($or_cond2_i){var $tsize_0758385_i=0;label=197;break;}else{label=187;break;}
 case 187: 
 var $call65_i=_sbrk($ssize_0_i);
 var $cmp66_i160=($call65_i|0)==($call34_i|0);
 var $ssize_0__i=($cmp66_i160?$ssize_0_i:0);
 var $call34__i=($cmp66_i160?$call34_i:-1);
 var $tbase_0_i=$call34__i;var $tsize_0_i=$ssize_0__i;var $br_0_i=$call65_i;var $ssize_1_i=$ssize_0_i;label=190;break;
 case 188: 
 var $182=HEAP32[((492)>>2)];
 var $add74_i=((($add9_i)-($182))|0);
 var $and77_i=$add74_i&$neg_i151;
 var $cmp78_i=($and77_i>>>0)<2147483647;
 if($cmp78_i){label=189;break;}else{var $tsize_0758385_i=0;label=197;break;}
 case 189: 
 var $call80_i=_sbrk($and77_i);
 var $183=HEAP32[(($base_i_i)>>2)];
 var $184=HEAP32[(($size_i_i)>>2)];
 var $add_ptr_i162=(($183+$184)|0);
 var $cmp82_i=($call80_i|0)==($add_ptr_i162|0);
 var $and77__i=($cmp82_i?$and77_i:0);
 var $call80__i=($cmp82_i?$call80_i:-1);
 var $tbase_0_i=$call80__i;var $tsize_0_i=$and77__i;var $br_0_i=$call80_i;var $ssize_1_i=$and77_i;label=190;break;
 case 190: 
 var $ssize_1_i;
 var $br_0_i;
 var $tsize_0_i;
 var $tbase_0_i;
 var $sub109_i=(((-$ssize_1_i))|0);
 var $cmp86_i=($tbase_0_i|0)==-1;
 if($cmp86_i){label=191;break;}else{var $tsize_291_i=$tsize_0_i;var $tbase_292_i=$tbase_0_i;label=201;break;}
 case 191: 
 var $cmp88_i=($br_0_i|0)!=-1;
 var $cmp90_i163=($ssize_1_i>>>0)<2147483647;
 var $or_cond3_i=$cmp88_i&$cmp90_i163;
 var $cmp93_i=($ssize_1_i>>>0)<($add_i149>>>0);
 var $or_cond4_i=$or_cond3_i&$cmp93_i;
 if($or_cond4_i){label=192;break;}else{var $ssize_2_i=$ssize_1_i;label=196;break;}
 case 192: 
 var $185=HEAP32[((464)>>2)];
 var $sub96_i=((($sub_i150)-($ssize_1_i))|0);
 var $add98_i=((($sub96_i)+($185))|0);
 var $neg100_i=(((-$185))|0);
 var $and101_i=$add98_i&$neg100_i;
 var $cmp102_i=($and101_i>>>0)<2147483647;
 if($cmp102_i){label=193;break;}else{var $ssize_2_i=$ssize_1_i;label=196;break;}
 case 193: 
 var $call104_i=_sbrk($and101_i);
 var $cmp105_i=($call104_i|0)==-1;
 if($cmp105_i){label=195;break;}else{label=194;break;}
 case 194: 
 var $add107_i=((($and101_i)+($ssize_1_i))|0);
 var $ssize_2_i=$add107_i;label=196;break;
 case 195: 
 var $call110_i=_sbrk($sub109_i);
 var $tsize_0758385_i=$tsize_0_i;label=197;break;
 case 196: 
 var $ssize_2_i;
 var $cmp115_i164=($br_0_i|0)==-1;
 if($cmp115_i164){var $tsize_0758385_i=$tsize_0_i;label=197;break;}else{var $tsize_291_i=$ssize_2_i;var $tbase_292_i=$br_0_i;label=201;break;}
 case 197: 
 var $tsize_0758385_i;
 var $186=HEAP32[((924)>>2)];
 var $or_i165=$186|4;
 HEAP32[((924)>>2)]=$or_i165;
 var $tsize_1_i=$tsize_0758385_i;label=198;break;
 case 198: 
 var $tsize_1_i;
 var $cmp124_i=($and11_i>>>0)<2147483647;
 if($cmp124_i){label=199;break;}else{label=340;break;}
 case 199: 
 var $call128_i=_sbrk($and11_i);
 var $call129_i=_sbrk(0);
 var $notlhs_i=($call128_i|0)!=-1;
 var $notrhs_i=($call129_i|0)!=-1;
 var $or_cond6_not_i=$notrhs_i&$notlhs_i;
 var $cmp134_i=($call128_i>>>0)<($call129_i>>>0);
 var $or_cond7_i=$or_cond6_not_i&$cmp134_i;
 if($or_cond7_i){label=200;break;}else{label=340;break;}
 case 200: 
 var $sub_ptr_lhs_cast_i=$call129_i;
 var $sub_ptr_rhs_cast_i=$call128_i;
 var $sub_ptr_sub_i=((($sub_ptr_lhs_cast_i)-($sub_ptr_rhs_cast_i))|0);
 var $add137_i=((($nb_0)+(40))|0);
 var $cmp138_i166=($sub_ptr_sub_i>>>0)>($add137_i>>>0);
 var $sub_ptr_sub_tsize_1_i=($cmp138_i166?$sub_ptr_sub_i:$tsize_1_i);
 var $call128_tbase_1_i=($cmp138_i166?$call128_i:-1);
 var $cmp144_i=($call128_tbase_1_i|0)==-1;
 if($cmp144_i){label=340;break;}else{var $tsize_291_i=$sub_ptr_sub_tsize_1_i;var $tbase_292_i=$call128_tbase_1_i;label=201;break;}
 case 201: 
 var $tbase_292_i;
 var $tsize_291_i;
 var $187=HEAP32[((912)>>2)];
 var $add147_i=((($187)+($tsize_291_i))|0);
 HEAP32[((912)>>2)]=$add147_i;
 var $188=HEAP32[((916)>>2)];
 var $cmp148_i=($add147_i>>>0)>($188>>>0);
 if($cmp148_i){label=202;break;}else{label=203;break;}
 case 202: 
 HEAP32[((916)>>2)]=$add147_i;
 label=203;break;
 case 203: 
 var $189=HEAP32[((504)>>2)];
 var $cmp154_i=($189|0)==0;
 if($cmp154_i){label=204;break;}else{var $sp_0105_i=928;label=211;break;}
 case 204: 
 var $190=HEAP32[((496)>>2)];
 var $cmp156_i=($190|0)==0;
 var $cmp159_i168=($tbase_292_i>>>0)<($190>>>0);
 var $or_cond8_i=$cmp156_i|$cmp159_i168;
 if($or_cond8_i){label=205;break;}else{label=206;break;}
 case 205: 
 HEAP32[((496)>>2)]=$tbase_292_i;
 label=206;break;
 case 206: 
 HEAP32[((928)>>2)]=$tbase_292_i;
 HEAP32[((932)>>2)]=$tsize_291_i;
 HEAP32[((940)>>2)]=0;
 var $191=HEAP32[((456)>>2)];
 HEAP32[((516)>>2)]=$191;
 HEAP32[((512)>>2)]=-1;
 var $i_02_i_i=0;label=207;break;
 case 207: 
 var $i_02_i_i;
 var $shl_i_i=$i_02_i_i<<1;
 var $arrayidx_i_i=((520+($shl_i_i<<2))|0);
 var $192=$arrayidx_i_i;
 var $arrayidx_sum_i_i=((($shl_i_i)+(3))|0);
 var $193=((520+($arrayidx_sum_i_i<<2))|0);
 HEAP32[(($193)>>2)]=$192;
 var $arrayidx_sum1_i_i=((($shl_i_i)+(2))|0);
 var $194=((520+($arrayidx_sum1_i_i<<2))|0);
 HEAP32[(($194)>>2)]=$192;
 var $inc_i_i=((($i_02_i_i)+(1))|0);
 var $cmp_i11_i=($inc_i_i>>>0)<32;
 if($cmp_i11_i){var $i_02_i_i=$inc_i_i;label=207;break;}else{label=208;break;}
 case 208: 
 var $sub169_i=((($tsize_291_i)-(40))|0);
 var $add_ptr_i12_i=(($tbase_292_i+8)|0);
 var $195=$add_ptr_i12_i;
 var $and_i13_i=$195&7;
 var $cmp_i14_i=($and_i13_i|0)==0;
 if($cmp_i14_i){var $cond_i_i=0;label=210;break;}else{label=209;break;}
 case 209: 
 var $196=(((-$195))|0);
 var $and3_i_i=$196&7;
 var $cond_i_i=$and3_i_i;label=210;break;
 case 210: 
 var $cond_i_i;
 var $add_ptr4_i_i=(($tbase_292_i+$cond_i_i)|0);
 var $197=$add_ptr4_i_i;
 var $sub5_i_i=((($sub169_i)-($cond_i_i))|0);
 HEAP32[((504)>>2)]=$197;
 HEAP32[((492)>>2)]=$sub5_i_i;
 var $or_i_i=$sub5_i_i|1;
 var $add_ptr4_sum_i_i=((($cond_i_i)+(4))|0);
 var $head_i_i=(($tbase_292_i+$add_ptr4_sum_i_i)|0);
 var $198=$head_i_i;
 HEAP32[(($198)>>2)]=$or_i_i;
 var $add_ptr6_sum_i_i=((($tsize_291_i)-(36))|0);
 var $head7_i_i=(($tbase_292_i+$add_ptr6_sum_i_i)|0);
 var $199=$head7_i_i;
 HEAP32[(($199)>>2)]=40;
 var $200=HEAP32[((472)>>2)];
 HEAP32[((508)>>2)]=$200;
 label=338;break;
 case 211: 
 var $sp_0105_i;
 var $base184_i=(($sp_0105_i)|0);
 var $201=HEAP32[(($base184_i)>>2)];
 var $size185_i=(($sp_0105_i+4)|0);
 var $202=HEAP32[(($size185_i)>>2)];
 var $add_ptr186_i=(($201+$202)|0);
 var $cmp187_i=($tbase_292_i|0)==($add_ptr186_i|0);
 if($cmp187_i){label=213;break;}else{label=212;break;}
 case 212: 
 var $next_i=(($sp_0105_i+8)|0);
 var $203=HEAP32[(($next_i)>>2)];
 var $cmp183_i=($203|0)==0;
 if($cmp183_i){label=218;break;}else{var $sp_0105_i=$203;label=211;break;}
 case 213: 
 var $sflags190_i=(($sp_0105_i+12)|0);
 var $204=HEAP32[(($sflags190_i)>>2)];
 var $and191_i=$204&8;
 var $tobool192_i=($and191_i|0)==0;
 if($tobool192_i){label=214;break;}else{label=218;break;}
 case 214: 
 var $205=$189;
 var $cmp200_i=($205>>>0)>=($201>>>0);
 var $cmp206_i=($205>>>0)<($tbase_292_i>>>0);
 var $or_cond94_i=$cmp200_i&$cmp206_i;
 if($or_cond94_i){label=215;break;}else{label=218;break;}
 case 215: 
 var $add209_i=((($202)+($tsize_291_i))|0);
 HEAP32[(($size185_i)>>2)]=$add209_i;
 var $206=HEAP32[((504)>>2)];
 var $207=HEAP32[((492)>>2)];
 var $add212_i=((($207)+($tsize_291_i))|0);
 var $208=$206;
 var $add_ptr_i23_i=(($206+8)|0);
 var $209=$add_ptr_i23_i;
 var $and_i24_i=$209&7;
 var $cmp_i25_i=($and_i24_i|0)==0;
 if($cmp_i25_i){var $cond_i28_i=0;label=217;break;}else{label=216;break;}
 case 216: 
 var $210=(((-$209))|0);
 var $and3_i26_i=$210&7;
 var $cond_i28_i=$and3_i26_i;label=217;break;
 case 217: 
 var $cond_i28_i;
 var $add_ptr4_i29_i=(($208+$cond_i28_i)|0);
 var $211=$add_ptr4_i29_i;
 var $sub5_i30_i=((($add212_i)-($cond_i28_i))|0);
 HEAP32[((504)>>2)]=$211;
 HEAP32[((492)>>2)]=$sub5_i30_i;
 var $or_i31_i=$sub5_i30_i|1;
 var $add_ptr4_sum_i32_i=((($cond_i28_i)+(4))|0);
 var $head_i33_i=(($208+$add_ptr4_sum_i32_i)|0);
 var $212=$head_i33_i;
 HEAP32[(($212)>>2)]=$or_i31_i;
 var $add_ptr6_sum_i34_i=((($add212_i)+(4))|0);
 var $head7_i35_i=(($208+$add_ptr6_sum_i34_i)|0);
 var $213=$head7_i35_i;
 HEAP32[(($213)>>2)]=40;
 var $214=HEAP32[((472)>>2)];
 HEAP32[((508)>>2)]=$214;
 label=338;break;
 case 218: 
 var $215=HEAP32[((496)>>2)];
 var $cmp215_i=($tbase_292_i>>>0)<($215>>>0);
 if($cmp215_i){label=219;break;}else{label=220;break;}
 case 219: 
 HEAP32[((496)>>2)]=$tbase_292_i;
 label=220;break;
 case 220: 
 var $add_ptr224_i=(($tbase_292_i+$tsize_291_i)|0);
 var $sp_1101_i=928;label=221;break;
 case 221: 
 var $sp_1101_i;
 var $base223_i=(($sp_1101_i)|0);
 var $216=HEAP32[(($base223_i)>>2)];
 var $cmp225_i=($216|0)==($add_ptr224_i|0);
 if($cmp225_i){label=223;break;}else{label=222;break;}
 case 222: 
 var $next228_i=(($sp_1101_i+8)|0);
 var $217=HEAP32[(($next228_i)>>2)];
 var $cmp221_i=($217|0)==0;
 if($cmp221_i){label=304;break;}else{var $sp_1101_i=$217;label=221;break;}
 case 223: 
 var $sflags232_i=(($sp_1101_i+12)|0);
 var $218=HEAP32[(($sflags232_i)>>2)];
 var $and233_i=$218&8;
 var $tobool234_i=($and233_i|0)==0;
 if($tobool234_i){label=224;break;}else{label=304;break;}
 case 224: 
 HEAP32[(($base223_i)>>2)]=$tbase_292_i;
 var $size242_i=(($sp_1101_i+4)|0);
 var $219=HEAP32[(($size242_i)>>2)];
 var $add243_i=((($219)+($tsize_291_i))|0);
 HEAP32[(($size242_i)>>2)]=$add243_i;
 var $add_ptr_i38_i=(($tbase_292_i+8)|0);
 var $220=$add_ptr_i38_i;
 var $and_i39_i=$220&7;
 var $cmp_i40_i=($and_i39_i|0)==0;
 if($cmp_i40_i){var $cond_i43_i=0;label=226;break;}else{label=225;break;}
 case 225: 
 var $221=(((-$220))|0);
 var $and3_i41_i=$221&7;
 var $cond_i43_i=$and3_i41_i;label=226;break;
 case 226: 
 var $cond_i43_i;
 var $add_ptr4_i44_i=(($tbase_292_i+$cond_i43_i)|0);
 var $add_ptr224_sum_i=((($tsize_291_i)+(8))|0);
 var $add_ptr5_i_i=(($tbase_292_i+$add_ptr224_sum_i)|0);
 var $222=$add_ptr5_i_i;
 var $and6_i45_i=$222&7;
 var $cmp7_i_i=($and6_i45_i|0)==0;
 if($cmp7_i_i){var $cond15_i_i=0;label=228;break;}else{label=227;break;}
 case 227: 
 var $223=(((-$222))|0);
 var $and13_i_i=$223&7;
 var $cond15_i_i=$and13_i_i;label=228;break;
 case 228: 
 var $cond15_i_i;
 var $add_ptr224_sum122_i=((($cond15_i_i)+($tsize_291_i))|0);
 var $add_ptr16_i_i=(($tbase_292_i+$add_ptr224_sum122_i)|0);
 var $224=$add_ptr16_i_i;
 var $sub_ptr_lhs_cast_i47_i=$add_ptr16_i_i;
 var $sub_ptr_rhs_cast_i48_i=$add_ptr4_i44_i;
 var $sub_ptr_sub_i49_i=((($sub_ptr_lhs_cast_i47_i)-($sub_ptr_rhs_cast_i48_i))|0);
 var $add_ptr4_sum_i50_i=((($cond_i43_i)+($nb_0))|0);
 var $add_ptr17_i_i=(($tbase_292_i+$add_ptr4_sum_i50_i)|0);
 var $225=$add_ptr17_i_i;
 var $sub18_i_i=((($sub_ptr_sub_i49_i)-($nb_0))|0);
 var $or19_i_i=$nb_0|3;
 var $add_ptr4_sum1_i_i=((($cond_i43_i)+(4))|0);
 var $head_i51_i=(($tbase_292_i+$add_ptr4_sum1_i_i)|0);
 var $226=$head_i51_i;
 HEAP32[(($226)>>2)]=$or19_i_i;
 var $227=HEAP32[((504)>>2)];
 var $cmp20_i_i=($224|0)==($227|0);
 if($cmp20_i_i){label=229;break;}else{label=230;break;}
 case 229: 
 var $228=HEAP32[((492)>>2)];
 var $add_i_i=((($228)+($sub18_i_i))|0);
 HEAP32[((492)>>2)]=$add_i_i;
 HEAP32[((504)>>2)]=$225;
 var $or22_i_i=$add_i_i|1;
 var $add_ptr17_sum39_i_i=((($add_ptr4_sum_i50_i)+(4))|0);
 var $head23_i_i=(($tbase_292_i+$add_ptr17_sum39_i_i)|0);
 var $229=$head23_i_i;
 HEAP32[(($229)>>2)]=$or22_i_i;
 label=303;break;
 case 230: 
 var $230=HEAP32[((500)>>2)];
 var $cmp24_i_i=($224|0)==($230|0);
 if($cmp24_i_i){label=231;break;}else{label=232;break;}
 case 231: 
 var $231=HEAP32[((488)>>2)];
 var $add26_i_i=((($231)+($sub18_i_i))|0);
 HEAP32[((488)>>2)]=$add26_i_i;
 HEAP32[((500)>>2)]=$225;
 var $or28_i_i=$add26_i_i|1;
 var $add_ptr17_sum37_i_i=((($add_ptr4_sum_i50_i)+(4))|0);
 var $head29_i_i=(($tbase_292_i+$add_ptr17_sum37_i_i)|0);
 var $232=$head29_i_i;
 HEAP32[(($232)>>2)]=$or28_i_i;
 var $add_ptr17_sum38_i_i=((($add26_i_i)+($add_ptr4_sum_i50_i))|0);
 var $add_ptr30_i53_i=(($tbase_292_i+$add_ptr17_sum38_i_i)|0);
 var $prev_foot_i54_i=$add_ptr30_i53_i;
 HEAP32[(($prev_foot_i54_i)>>2)]=$add26_i_i;
 label=303;break;
 case 232: 
 var $add_ptr16_sum_i_i=((($tsize_291_i)+(4))|0);
 var $add_ptr224_sum123_i=((($add_ptr16_sum_i_i)+($cond15_i_i))|0);
 var $head32_i_i=(($tbase_292_i+$add_ptr224_sum123_i)|0);
 var $233=$head32_i_i;
 var $234=HEAP32[(($233)>>2)];
 var $and33_i_i=$234&3;
 var $cmp34_i_i=($and33_i_i|0)==1;
 if($cmp34_i_i){label=233;break;}else{var $oldfirst_0_i_i=$224;var $qsize_0_i_i=$sub18_i_i;label=280;break;}
 case 233: 
 var $and37_i_i=$234&-8;
 var $shr_i55_i=$234>>>3;
 var $cmp38_i_i=($234>>>0)<256;
 if($cmp38_i_i){label=234;break;}else{label=246;break;}
 case 234: 
 var $add_ptr16_sum3233_i_i=$cond15_i_i|8;
 var $add_ptr224_sum133_i=((($add_ptr16_sum3233_i_i)+($tsize_291_i))|0);
 var $fd_i_i=(($tbase_292_i+$add_ptr224_sum133_i)|0);
 var $235=$fd_i_i;
 var $236=HEAP32[(($235)>>2)];
 var $add_ptr16_sum34_i_i=((($tsize_291_i)+(12))|0);
 var $add_ptr224_sum134_i=((($add_ptr16_sum34_i_i)+($cond15_i_i))|0);
 var $bk_i56_i=(($tbase_292_i+$add_ptr224_sum134_i)|0);
 var $237=$bk_i56_i;
 var $238=HEAP32[(($237)>>2)];
 var $shl_i57_i=$shr_i55_i<<1;
 var $arrayidx_i58_i=((520+($shl_i57_i<<2))|0);
 var $239=$arrayidx_i58_i;
 var $cmp41_i_i=($236|0)==($239|0);
 if($cmp41_i_i){label=237;break;}else{label=235;break;}
 case 235: 
 var $240=$236;
 var $241=HEAP32[((496)>>2)];
 var $cmp42_i_i=($240>>>0)<($241>>>0);
 if($cmp42_i_i){label=245;break;}else{label=236;break;}
 case 236: 
 var $bk43_i_i=(($236+12)|0);
 var $242=HEAP32[(($bk43_i_i)>>2)];
 var $cmp44_i_i=($242|0)==($224|0);
 if($cmp44_i_i){label=237;break;}else{label=245;break;}
 case 237: 
 var $cmp46_i60_i=($238|0)==($236|0);
 if($cmp46_i60_i){label=238;break;}else{label=239;break;}
 case 238: 
 var $shl48_i_i=1<<$shr_i55_i;
 var $neg_i_i=$shl48_i_i^-1;
 var $243=HEAP32[((480)>>2)];
 var $and49_i_i=$243&$neg_i_i;
 HEAP32[((480)>>2)]=$and49_i_i;
 label=279;break;
 case 239: 
 var $cmp54_i_i=($238|0)==($239|0);
 if($cmp54_i_i){label=240;break;}else{label=241;break;}
 case 240: 
 var $fd68_pre_i_i=(($238+8)|0);
 var $fd68_pre_phi_i_i=$fd68_pre_i_i;label=243;break;
 case 241: 
 var $244=$238;
 var $245=HEAP32[((496)>>2)];
 var $cmp57_i_i=($244>>>0)<($245>>>0);
 if($cmp57_i_i){label=244;break;}else{label=242;break;}
 case 242: 
 var $fd59_i_i=(($238+8)|0);
 var $246=HEAP32[(($fd59_i_i)>>2)];
 var $cmp60_i_i=($246|0)==($224|0);
 if($cmp60_i_i){var $fd68_pre_phi_i_i=$fd59_i_i;label=243;break;}else{label=244;break;}
 case 243: 
 var $fd68_pre_phi_i_i;
 var $bk67_i_i=(($236+12)|0);
 HEAP32[(($bk67_i_i)>>2)]=$238;
 HEAP32[(($fd68_pre_phi_i_i)>>2)]=$236;
 label=279;break;
 case 244: 
 _abort();
 throw "Reached an unreachable!";
 case 245: 
 _abort();
 throw "Reached an unreachable!";
 case 246: 
 var $247=$add_ptr16_i_i;
 var $add_ptr16_sum23_i_i=$cond15_i_i|24;
 var $add_ptr224_sum124_i=((($add_ptr16_sum23_i_i)+($tsize_291_i))|0);
 var $parent_i62_i=(($tbase_292_i+$add_ptr224_sum124_i)|0);
 var $248=$parent_i62_i;
 var $249=HEAP32[(($248)>>2)];
 var $add_ptr16_sum4_i_i=((($tsize_291_i)+(12))|0);
 var $add_ptr224_sum125_i=((($add_ptr16_sum4_i_i)+($cond15_i_i))|0);
 var $bk74_i_i=(($tbase_292_i+$add_ptr224_sum125_i)|0);
 var $250=$bk74_i_i;
 var $251=HEAP32[(($250)>>2)];
 var $cmp75_i_i=($251|0)==($247|0);
 if($cmp75_i_i){label=252;break;}else{label=247;break;}
 case 247: 
 var $add_ptr16_sum2930_i_i=$cond15_i_i|8;
 var $add_ptr224_sum126_i=((($add_ptr16_sum2930_i_i)+($tsize_291_i))|0);
 var $fd78_i_i=(($tbase_292_i+$add_ptr224_sum126_i)|0);
 var $252=$fd78_i_i;
 var $253=HEAP32[(($252)>>2)];
 var $254=$253;
 var $255=HEAP32[((496)>>2)];
 var $cmp81_i_i=($254>>>0)<($255>>>0);
 if($cmp81_i_i){label=251;break;}else{label=248;break;}
 case 248: 
 var $bk82_i_i=(($253+12)|0);
 var $256=HEAP32[(($bk82_i_i)>>2)];
 var $cmp83_i_i=($256|0)==($247|0);
 if($cmp83_i_i){label=249;break;}else{label=251;break;}
 case 249: 
 var $fd85_i_i=(($251+8)|0);
 var $257=HEAP32[(($fd85_i_i)>>2)];
 var $cmp86_i_i=($257|0)==($247|0);
 if($cmp86_i_i){label=250;break;}else{label=251;break;}
 case 250: 
 HEAP32[(($bk82_i_i)>>2)]=$251;
 HEAP32[(($fd85_i_i)>>2)]=$253;
 var $R_1_i_i=$251;label=259;break;
 case 251: 
 _abort();
 throw "Reached an unreachable!";
 case 252: 
 var $add_ptr16_sum56_i_i=$cond15_i_i|16;
 var $add_ptr224_sum131_i=((($add_ptr16_sum_i_i)+($add_ptr16_sum56_i_i))|0);
 var $arrayidx96_i_i=(($tbase_292_i+$add_ptr224_sum131_i)|0);
 var $258=$arrayidx96_i_i;
 var $259=HEAP32[(($258)>>2)];
 var $cmp97_i_i=($259|0)==0;
 if($cmp97_i_i){label=253;break;}else{var $R_0_i_i=$259;var $RP_0_i_i=$258;label=254;break;}
 case 253: 
 var $add_ptr224_sum132_i=((($add_ptr16_sum56_i_i)+($tsize_291_i))|0);
 var $child_i_i=(($tbase_292_i+$add_ptr224_sum132_i)|0);
 var $arrayidx99_i_i=$child_i_i;
 var $260=HEAP32[(($arrayidx99_i_i)>>2)];
 var $cmp100_i_i=($260|0)==0;
 if($cmp100_i_i){var $R_1_i_i=0;label=259;break;}else{var $R_0_i_i=$260;var $RP_0_i_i=$arrayidx99_i_i;label=254;break;}
 case 254: 
 var $RP_0_i_i;
 var $R_0_i_i;
 var $arrayidx103_i_i=(($R_0_i_i+20)|0);
 var $261=HEAP32[(($arrayidx103_i_i)>>2)];
 var $cmp104_i_i=($261|0)==0;
 if($cmp104_i_i){label=255;break;}else{var $R_0_i_i=$261;var $RP_0_i_i=$arrayidx103_i_i;label=254;break;}
 case 255: 
 var $arrayidx107_i_i=(($R_0_i_i+16)|0);
 var $262=HEAP32[(($arrayidx107_i_i)>>2)];
 var $cmp108_i_i=($262|0)==0;
 if($cmp108_i_i){label=256;break;}else{var $R_0_i_i=$262;var $RP_0_i_i=$arrayidx107_i_i;label=254;break;}
 case 256: 
 var $263=$RP_0_i_i;
 var $264=HEAP32[((496)>>2)];
 var $cmp112_i_i=($263>>>0)<($264>>>0);
 if($cmp112_i_i){label=258;break;}else{label=257;break;}
 case 257: 
 HEAP32[(($RP_0_i_i)>>2)]=0;
 var $R_1_i_i=$R_0_i_i;label=259;break;
 case 258: 
 _abort();
 throw "Reached an unreachable!";
 case 259: 
 var $R_1_i_i;
 var $cmp120_i64_i=($249|0)==0;
 if($cmp120_i64_i){label=279;break;}else{label=260;break;}
 case 260: 
 var $add_ptr16_sum26_i_i=((($tsize_291_i)+(28))|0);
 var $add_ptr224_sum127_i=((($add_ptr16_sum26_i_i)+($cond15_i_i))|0);
 var $index_i65_i=(($tbase_292_i+$add_ptr224_sum127_i)|0);
 var $265=$index_i65_i;
 var $266=HEAP32[(($265)>>2)];
 var $arrayidx123_i_i=((784+($266<<2))|0);
 var $267=HEAP32[(($arrayidx123_i_i)>>2)];
 var $cmp124_i_i=($247|0)==($267|0);
 if($cmp124_i_i){label=261;break;}else{label=263;break;}
 case 261: 
 HEAP32[(($arrayidx123_i_i)>>2)]=$R_1_i_i;
 var $cond41_i_i=($R_1_i_i|0)==0;
 if($cond41_i_i){label=262;break;}else{label=269;break;}
 case 262: 
 var $268=HEAP32[(($265)>>2)];
 var $shl131_i_i=1<<$268;
 var $neg132_i_i=$shl131_i_i^-1;
 var $269=HEAP32[((484)>>2)];
 var $and133_i_i=$269&$neg132_i_i;
 HEAP32[((484)>>2)]=$and133_i_i;
 label=279;break;
 case 263: 
 var $270=$249;
 var $271=HEAP32[((496)>>2)];
 var $cmp137_i_i=($270>>>0)<($271>>>0);
 if($cmp137_i_i){label=267;break;}else{label=264;break;}
 case 264: 
 var $arrayidx143_i_i=(($249+16)|0);
 var $272=HEAP32[(($arrayidx143_i_i)>>2)];
 var $cmp144_i_i=($272|0)==($247|0);
 if($cmp144_i_i){label=265;break;}else{label=266;break;}
 case 265: 
 HEAP32[(($arrayidx143_i_i)>>2)]=$R_1_i_i;
 label=268;break;
 case 266: 
 var $arrayidx151_i_i=(($249+20)|0);
 HEAP32[(($arrayidx151_i_i)>>2)]=$R_1_i_i;
 label=268;break;
 case 267: 
 _abort();
 throw "Reached an unreachable!";
 case 268: 
 var $cmp156_i_i=($R_1_i_i|0)==0;
 if($cmp156_i_i){label=279;break;}else{label=269;break;}
 case 269: 
 var $273=$R_1_i_i;
 var $274=HEAP32[((496)>>2)];
 var $cmp160_i_i=($273>>>0)<($274>>>0);
 if($cmp160_i_i){label=278;break;}else{label=270;break;}
 case 270: 
 var $parent165_i_i=(($R_1_i_i+24)|0);
 HEAP32[(($parent165_i_i)>>2)]=$249;
 var $add_ptr16_sum2728_i_i=$cond15_i_i|16;
 var $add_ptr224_sum128_i=((($add_ptr16_sum2728_i_i)+($tsize_291_i))|0);
 var $child166_i_i=(($tbase_292_i+$add_ptr224_sum128_i)|0);
 var $arrayidx167_i_i=$child166_i_i;
 var $275=HEAP32[(($arrayidx167_i_i)>>2)];
 var $cmp168_i_i=($275|0)==0;
 if($cmp168_i_i){label=274;break;}else{label=271;break;}
 case 271: 
 var $276=$275;
 var $277=HEAP32[((496)>>2)];
 var $cmp172_i_i=($276>>>0)<($277>>>0);
 if($cmp172_i_i){label=273;break;}else{label=272;break;}
 case 272: 
 var $arrayidx178_i_i=(($R_1_i_i+16)|0);
 HEAP32[(($arrayidx178_i_i)>>2)]=$275;
 var $parent179_i_i=(($275+24)|0);
 HEAP32[(($parent179_i_i)>>2)]=$R_1_i_i;
 label=274;break;
 case 273: 
 _abort();
 throw "Reached an unreachable!";
 case 274: 
 var $add_ptr224_sum129_i=((($add_ptr16_sum_i_i)+($add_ptr16_sum2728_i_i))|0);
 var $arrayidx184_i_i=(($tbase_292_i+$add_ptr224_sum129_i)|0);
 var $278=$arrayidx184_i_i;
 var $279=HEAP32[(($278)>>2)];
 var $cmp185_i_i=($279|0)==0;
 if($cmp185_i_i){label=279;break;}else{label=275;break;}
 case 275: 
 var $280=$279;
 var $281=HEAP32[((496)>>2)];
 var $cmp189_i_i=($280>>>0)<($281>>>0);
 if($cmp189_i_i){label=277;break;}else{label=276;break;}
 case 276: 
 var $arrayidx195_i_i=(($R_1_i_i+20)|0);
 HEAP32[(($arrayidx195_i_i)>>2)]=$279;
 var $parent196_i_i=(($279+24)|0);
 HEAP32[(($parent196_i_i)>>2)]=$R_1_i_i;
 label=279;break;
 case 277: 
 _abort();
 throw "Reached an unreachable!";
 case 278: 
 _abort();
 throw "Reached an unreachable!";
 case 279: 
 var $add_ptr16_sum7_i_i=$and37_i_i|$cond15_i_i;
 var $add_ptr224_sum130_i=((($add_ptr16_sum7_i_i)+($tsize_291_i))|0);
 var $add_ptr205_i_i=(($tbase_292_i+$add_ptr224_sum130_i)|0);
 var $282=$add_ptr205_i_i;
 var $add206_i_i=((($and37_i_i)+($sub18_i_i))|0);
 var $oldfirst_0_i_i=$282;var $qsize_0_i_i=$add206_i_i;label=280;break;
 case 280: 
 var $qsize_0_i_i;
 var $oldfirst_0_i_i;
 var $head208_i_i=(($oldfirst_0_i_i+4)|0);
 var $283=HEAP32[(($head208_i_i)>>2)];
 var $and209_i_i=$283&-2;
 HEAP32[(($head208_i_i)>>2)]=$and209_i_i;
 var $or210_i_i=$qsize_0_i_i|1;
 var $add_ptr17_sum_i_i=((($add_ptr4_sum_i50_i)+(4))|0);
 var $head211_i_i=(($tbase_292_i+$add_ptr17_sum_i_i)|0);
 var $284=$head211_i_i;
 HEAP32[(($284)>>2)]=$or210_i_i;
 var $add_ptr17_sum8_i_i=((($qsize_0_i_i)+($add_ptr4_sum_i50_i))|0);
 var $add_ptr212_i_i=(($tbase_292_i+$add_ptr17_sum8_i_i)|0);
 var $prev_foot213_i_i=$add_ptr212_i_i;
 HEAP32[(($prev_foot213_i_i)>>2)]=$qsize_0_i_i;
 var $shr214_i_i=$qsize_0_i_i>>>3;
 var $cmp215_i_i=($qsize_0_i_i>>>0)<256;
 if($cmp215_i_i){label=281;break;}else{label=286;break;}
 case 281: 
 var $shl221_i_i=$shr214_i_i<<1;
 var $arrayidx223_i_i=((520+($shl221_i_i<<2))|0);
 var $285=$arrayidx223_i_i;
 var $286=HEAP32[((480)>>2)];
 var $shl226_i_i=1<<$shr214_i_i;
 var $and227_i_i=$286&$shl226_i_i;
 var $tobool228_i_i=($and227_i_i|0)==0;
 if($tobool228_i_i){label=282;break;}else{label=283;break;}
 case 282: 
 var $or232_i_i=$286|$shl226_i_i;
 HEAP32[((480)>>2)]=$or232_i_i;
 var $arrayidx223_sum_pre_i_i=((($shl221_i_i)+(2))|0);
 var $_pre_i67_i=((520+($arrayidx223_sum_pre_i_i<<2))|0);
 var $F224_0_i_i=$285;var $_pre_phi_i68_i=$_pre_i67_i;label=285;break;
 case 283: 
 var $arrayidx223_sum25_i_i=((($shl221_i_i)+(2))|0);
 var $287=((520+($arrayidx223_sum25_i_i<<2))|0);
 var $288=HEAP32[(($287)>>2)];
 var $289=$288;
 var $290=HEAP32[((496)>>2)];
 var $cmp236_i_i=($289>>>0)<($290>>>0);
 if($cmp236_i_i){label=284;break;}else{var $F224_0_i_i=$288;var $_pre_phi_i68_i=$287;label=285;break;}
 case 284: 
 _abort();
 throw "Reached an unreachable!";
 case 285: 
 var $_pre_phi_i68_i;
 var $F224_0_i_i;
 HEAP32[(($_pre_phi_i68_i)>>2)]=$225;
 var $bk246_i_i=(($F224_0_i_i+12)|0);
 HEAP32[(($bk246_i_i)>>2)]=$225;
 var $add_ptr17_sum23_i_i=((($add_ptr4_sum_i50_i)+(8))|0);
 var $fd247_i_i=(($tbase_292_i+$add_ptr17_sum23_i_i)|0);
 var $291=$fd247_i_i;
 HEAP32[(($291)>>2)]=$F224_0_i_i;
 var $add_ptr17_sum24_i_i=((($add_ptr4_sum_i50_i)+(12))|0);
 var $bk248_i_i=(($tbase_292_i+$add_ptr17_sum24_i_i)|0);
 var $292=$bk248_i_i;
 HEAP32[(($292)>>2)]=$285;
 label=303;break;
 case 286: 
 var $293=$add_ptr17_i_i;
 var $shr253_i_i=$qsize_0_i_i>>>8;
 var $cmp254_i_i=($shr253_i_i|0)==0;
 if($cmp254_i_i){var $I252_0_i_i=0;label=289;break;}else{label=287;break;}
 case 287: 
 var $cmp258_i_i=($qsize_0_i_i>>>0)>16777215;
 if($cmp258_i_i){var $I252_0_i_i=31;label=289;break;}else{label=288;break;}
 case 288: 
 var $sub262_i_i=((($shr253_i_i)+(1048320))|0);
 var $shr263_i_i=$sub262_i_i>>>16;
 var $and264_i_i=$shr263_i_i&8;
 var $shl265_i_i=$shr253_i_i<<$and264_i_i;
 var $sub266_i_i=((($shl265_i_i)+(520192))|0);
 var $shr267_i_i=$sub266_i_i>>>16;
 var $and268_i_i=$shr267_i_i&4;
 var $add269_i_i=$and268_i_i|$and264_i_i;
 var $shl270_i_i=$shl265_i_i<<$and268_i_i;
 var $sub271_i_i=((($shl270_i_i)+(245760))|0);
 var $shr272_i_i=$sub271_i_i>>>16;
 var $and273_i_i=$shr272_i_i&2;
 var $add274_i_i=$add269_i_i|$and273_i_i;
 var $sub275_i_i=(((14)-($add274_i_i))|0);
 var $shl276_i_i=$shl270_i_i<<$and273_i_i;
 var $shr277_i_i=$shl276_i_i>>>15;
 var $add278_i_i=((($sub275_i_i)+($shr277_i_i))|0);
 var $shl279_i_i=$add278_i_i<<1;
 var $add280_i_i=((($add278_i_i)+(7))|0);
 var $shr281_i_i=$qsize_0_i_i>>>($add280_i_i>>>0);
 var $and282_i_i=$shr281_i_i&1;
 var $add283_i_i=$and282_i_i|$shl279_i_i;
 var $I252_0_i_i=$add283_i_i;label=289;break;
 case 289: 
 var $I252_0_i_i;
 var $arrayidx287_i_i=((784+($I252_0_i_i<<2))|0);
 var $add_ptr17_sum9_i_i=((($add_ptr4_sum_i50_i)+(28))|0);
 var $index288_i_i=(($tbase_292_i+$add_ptr17_sum9_i_i)|0);
 var $294=$index288_i_i;
 HEAP32[(($294)>>2)]=$I252_0_i_i;
 var $add_ptr17_sum10_i_i=((($add_ptr4_sum_i50_i)+(16))|0);
 var $child289_i_i=(($tbase_292_i+$add_ptr17_sum10_i_i)|0);
 var $child289_sum_i_i=((($add_ptr4_sum_i50_i)+(20))|0);
 var $arrayidx290_i_i=(($tbase_292_i+$child289_sum_i_i)|0);
 var $295=$arrayidx290_i_i;
 HEAP32[(($295)>>2)]=0;
 var $arrayidx292_i_i=$child289_i_i;
 HEAP32[(($arrayidx292_i_i)>>2)]=0;
 var $296=HEAP32[((484)>>2)];
 var $shl294_i_i=1<<$I252_0_i_i;
 var $and295_i_i=$296&$shl294_i_i;
 var $tobool296_i_i=($and295_i_i|0)==0;
 if($tobool296_i_i){label=290;break;}else{label=291;break;}
 case 290: 
 var $or300_i_i=$296|$shl294_i_i;
 HEAP32[((484)>>2)]=$or300_i_i;
 HEAP32[(($arrayidx287_i_i)>>2)]=$293;
 var $297=$arrayidx287_i_i;
 var $add_ptr17_sum11_i_i=((($add_ptr4_sum_i50_i)+(24))|0);
 var $parent301_i_i=(($tbase_292_i+$add_ptr17_sum11_i_i)|0);
 var $298=$parent301_i_i;
 HEAP32[(($298)>>2)]=$297;
 var $add_ptr17_sum12_i_i=((($add_ptr4_sum_i50_i)+(12))|0);
 var $bk302_i_i=(($tbase_292_i+$add_ptr17_sum12_i_i)|0);
 var $299=$bk302_i_i;
 HEAP32[(($299)>>2)]=$293;
 var $add_ptr17_sum13_i_i=((($add_ptr4_sum_i50_i)+(8))|0);
 var $fd303_i_i=(($tbase_292_i+$add_ptr17_sum13_i_i)|0);
 var $300=$fd303_i_i;
 HEAP32[(($300)>>2)]=$293;
 label=303;break;
 case 291: 
 var $301=HEAP32[(($arrayidx287_i_i)>>2)];
 var $cmp306_i_i=($I252_0_i_i|0)==31;
 if($cmp306_i_i){var $cond315_i_i=0;label=293;break;}else{label=292;break;}
 case 292: 
 var $shr310_i_i=$I252_0_i_i>>>1;
 var $sub313_i_i=(((25)-($shr310_i_i))|0);
 var $cond315_i_i=$sub313_i_i;label=293;break;
 case 293: 
 var $cond315_i_i;
 var $shl316_i_i=$qsize_0_i_i<<$cond315_i_i;
 var $K305_0_i_i=$shl316_i_i;var $T_0_i69_i=$301;label=294;break;
 case 294: 
 var $T_0_i69_i;
 var $K305_0_i_i;
 var $head317_i_i=(($T_0_i69_i+4)|0);
 var $302=HEAP32[(($head317_i_i)>>2)];
 var $and318_i_i=$302&-8;
 var $cmp319_i_i=($and318_i_i|0)==($qsize_0_i_i|0);
 if($cmp319_i_i){label=299;break;}else{label=295;break;}
 case 295: 
 var $shr322_i_i=$K305_0_i_i>>>31;
 var $arrayidx325_i_i=(($T_0_i69_i+16+($shr322_i_i<<2))|0);
 var $303=HEAP32[(($arrayidx325_i_i)>>2)];
 var $cmp327_i_i=($303|0)==0;
 var $shl326_i_i=$K305_0_i_i<<1;
 if($cmp327_i_i){label=296;break;}else{var $K305_0_i_i=$shl326_i_i;var $T_0_i69_i=$303;label=294;break;}
 case 296: 
 var $304=$arrayidx325_i_i;
 var $305=HEAP32[((496)>>2)];
 var $cmp332_i_i=($304>>>0)<($305>>>0);
 if($cmp332_i_i){label=298;break;}else{label=297;break;}
 case 297: 
 HEAP32[(($arrayidx325_i_i)>>2)]=$293;
 var $add_ptr17_sum20_i_i=((($add_ptr4_sum_i50_i)+(24))|0);
 var $parent337_i_i=(($tbase_292_i+$add_ptr17_sum20_i_i)|0);
 var $306=$parent337_i_i;
 HEAP32[(($306)>>2)]=$T_0_i69_i;
 var $add_ptr17_sum21_i_i=((($add_ptr4_sum_i50_i)+(12))|0);
 var $bk338_i_i=(($tbase_292_i+$add_ptr17_sum21_i_i)|0);
 var $307=$bk338_i_i;
 HEAP32[(($307)>>2)]=$293;
 var $add_ptr17_sum22_i_i=((($add_ptr4_sum_i50_i)+(8))|0);
 var $fd339_i_i=(($tbase_292_i+$add_ptr17_sum22_i_i)|0);
 var $308=$fd339_i_i;
 HEAP32[(($308)>>2)]=$293;
 label=303;break;
 case 298: 
 _abort();
 throw "Reached an unreachable!";
 case 299: 
 var $fd344_i_i=(($T_0_i69_i+8)|0);
 var $309=HEAP32[(($fd344_i_i)>>2)];
 var $310=$T_0_i69_i;
 var $311=HEAP32[((496)>>2)];
 var $cmp346_i_i=($310>>>0)<($311>>>0);
 if($cmp346_i_i){label=302;break;}else{label=300;break;}
 case 300: 
 var $312=$309;
 var $cmp350_i_i=($312>>>0)<($311>>>0);
 if($cmp350_i_i){label=302;break;}else{label=301;break;}
 case 301: 
 var $bk357_i_i=(($309+12)|0);
 HEAP32[(($bk357_i_i)>>2)]=$293;
 HEAP32[(($fd344_i_i)>>2)]=$293;
 var $add_ptr17_sum17_i_i=((($add_ptr4_sum_i50_i)+(8))|0);
 var $fd359_i_i=(($tbase_292_i+$add_ptr17_sum17_i_i)|0);
 var $313=$fd359_i_i;
 HEAP32[(($313)>>2)]=$309;
 var $add_ptr17_sum18_i_i=((($add_ptr4_sum_i50_i)+(12))|0);
 var $bk360_i_i=(($tbase_292_i+$add_ptr17_sum18_i_i)|0);
 var $314=$bk360_i_i;
 HEAP32[(($314)>>2)]=$T_0_i69_i;
 var $add_ptr17_sum19_i_i=((($add_ptr4_sum_i50_i)+(24))|0);
 var $parent361_i_i=(($tbase_292_i+$add_ptr17_sum19_i_i)|0);
 var $315=$parent361_i_i;
 HEAP32[(($315)>>2)]=0;
 label=303;break;
 case 302: 
 _abort();
 throw "Reached an unreachable!";
 case 303: 
 var $add_ptr4_sum1415_i_i=$cond_i43_i|8;
 var $add_ptr368_i_i=(($tbase_292_i+$add_ptr4_sum1415_i_i)|0);
 var $mem_0=$add_ptr368_i_i;label=341;break;
 case 304: 
 var $316=$189;
 var $sp_0_i_i_i=928;label=305;break;
 case 305: 
 var $sp_0_i_i_i;
 var $base_i_i_i=(($sp_0_i_i_i)|0);
 var $317=HEAP32[(($base_i_i_i)>>2)];
 var $cmp_i_i_i=($317>>>0)>($316>>>0);
 if($cmp_i_i_i){label=307;break;}else{label=306;break;}
 case 306: 
 var $size_i_i_i=(($sp_0_i_i_i+4)|0);
 var $318=HEAP32[(($size_i_i_i)>>2)];
 var $add_ptr_i_i_i=(($317+$318)|0);
 var $cmp2_i_i_i=($add_ptr_i_i_i>>>0)>($316>>>0);
 if($cmp2_i_i_i){label=308;break;}else{label=307;break;}
 case 307: 
 var $next_i_i_i=(($sp_0_i_i_i+8)|0);
 var $319=HEAP32[(($next_i_i_i)>>2)];
 var $sp_0_i_i_i=$319;label=305;break;
 case 308: 
 var $add_ptr_sum_i_i=((($318)-(47))|0);
 var $add_ptr2_sum_i_i=((($318)-(39))|0);
 var $add_ptr3_i_i=(($317+$add_ptr2_sum_i_i)|0);
 var $320=$add_ptr3_i_i;
 var $and_i15_i=$320&7;
 var $cmp_i16_i=($and_i15_i|0)==0;
 if($cmp_i16_i){var $cond_i18_i=0;label=310;break;}else{label=309;break;}
 case 309: 
 var $321=(((-$320))|0);
 var $and6_i_i=$321&7;
 var $cond_i18_i=$and6_i_i;label=310;break;
 case 310: 
 var $cond_i18_i;
 var $add_ptr2_sum1_i_i=((($add_ptr_sum_i_i)+($cond_i18_i))|0);
 var $add_ptr7_i_i=(($317+$add_ptr2_sum1_i_i)|0);
 var $add_ptr82_i_i=(($189+16)|0);
 var $add_ptr8_i_i=$add_ptr82_i_i;
 var $cmp9_i_i=($add_ptr7_i_i>>>0)<($add_ptr8_i_i>>>0);
 var $cond13_i_i=($cmp9_i_i?$316:$add_ptr7_i_i);
 var $add_ptr14_i_i=(($cond13_i_i+8)|0);
 var $322=$add_ptr14_i_i;
 var $sub16_i_i=((($tsize_291_i)-(40))|0);
 var $add_ptr_i11_i_i=(($tbase_292_i+8)|0);
 var $323=$add_ptr_i11_i_i;
 var $and_i_i_i=$323&7;
 var $cmp_i12_i_i=($and_i_i_i|0)==0;
 if($cmp_i12_i_i){var $cond_i_i_i=0;label=312;break;}else{label=311;break;}
 case 311: 
 var $324=(((-$323))|0);
 var $and3_i_i_i=$324&7;
 var $cond_i_i_i=$and3_i_i_i;label=312;break;
 case 312: 
 var $cond_i_i_i;
 var $add_ptr4_i_i_i=(($tbase_292_i+$cond_i_i_i)|0);
 var $325=$add_ptr4_i_i_i;
 var $sub5_i_i_i=((($sub16_i_i)-($cond_i_i_i))|0);
 HEAP32[((504)>>2)]=$325;
 HEAP32[((492)>>2)]=$sub5_i_i_i;
 var $or_i_i_i=$sub5_i_i_i|1;
 var $add_ptr4_sum_i_i_i=((($cond_i_i_i)+(4))|0);
 var $head_i_i_i=(($tbase_292_i+$add_ptr4_sum_i_i_i)|0);
 var $326=$head_i_i_i;
 HEAP32[(($326)>>2)]=$or_i_i_i;
 var $add_ptr6_sum_i_i_i=((($tsize_291_i)-(36))|0);
 var $head7_i_i_i=(($tbase_292_i+$add_ptr6_sum_i_i_i)|0);
 var $327=$head7_i_i_i;
 HEAP32[(($327)>>2)]=40;
 var $328=HEAP32[((472)>>2)];
 HEAP32[((508)>>2)]=$328;
 var $head_i19_i=(($cond13_i_i+4)|0);
 var $329=$head_i19_i;
 HEAP32[(($329)>>2)]=27;
 assert(16 % 1 === 0);HEAP32[(($add_ptr14_i_i)>>2)]=HEAP32[((928)>>2)];HEAP32[((($add_ptr14_i_i)+(4))>>2)]=HEAP32[((932)>>2)];HEAP32[((($add_ptr14_i_i)+(8))>>2)]=HEAP32[((936)>>2)];HEAP32[((($add_ptr14_i_i)+(12))>>2)]=HEAP32[((940)>>2)];
 HEAP32[((928)>>2)]=$tbase_292_i;
 HEAP32[((932)>>2)]=$tsize_291_i;
 HEAP32[((940)>>2)]=0;
 HEAP32[((936)>>2)]=$322;
 var $add_ptr2414_i_i=(($cond13_i_i+28)|0);
 var $330=$add_ptr2414_i_i;
 HEAP32[(($330)>>2)]=7;
 var $331=(($cond13_i_i+32)|0);
 var $cmp2715_i_i=($331>>>0)<($add_ptr_i_i_i>>>0);
 if($cmp2715_i_i){var $add_ptr2416_i_i=$330;label=313;break;}else{label=314;break;}
 case 313: 
 var $add_ptr2416_i_i;
 var $332=(($add_ptr2416_i_i+4)|0);
 HEAP32[(($332)>>2)]=7;
 var $333=(($add_ptr2416_i_i+8)|0);
 var $334=$333;
 var $cmp27_i_i=($334>>>0)<($add_ptr_i_i_i>>>0);
 if($cmp27_i_i){var $add_ptr2416_i_i=$332;label=313;break;}else{label=314;break;}
 case 314: 
 var $cmp28_i_i=($cond13_i_i|0)==($316|0);
 if($cmp28_i_i){label=338;break;}else{label=315;break;}
 case 315: 
 var $sub_ptr_lhs_cast_i_i=$cond13_i_i;
 var $sub_ptr_rhs_cast_i_i=$189;
 var $sub_ptr_sub_i_i=((($sub_ptr_lhs_cast_i_i)-($sub_ptr_rhs_cast_i_i))|0);
 var $add_ptr30_i_i=(($316+$sub_ptr_sub_i_i)|0);
 var $add_ptr30_sum_i_i=((($sub_ptr_sub_i_i)+(4))|0);
 var $head31_i_i=(($316+$add_ptr30_sum_i_i)|0);
 var $335=$head31_i_i;
 var $336=HEAP32[(($335)>>2)];
 var $and32_i_i=$336&-2;
 HEAP32[(($335)>>2)]=$and32_i_i;
 var $or33_i_i=$sub_ptr_sub_i_i|1;
 var $head34_i_i=(($189+4)|0);
 HEAP32[(($head34_i_i)>>2)]=$or33_i_i;
 var $prev_foot_i_i=$add_ptr30_i_i;
 HEAP32[(($prev_foot_i_i)>>2)]=$sub_ptr_sub_i_i;
 var $shr_i_i=$sub_ptr_sub_i_i>>>3;
 var $cmp36_i_i=($sub_ptr_sub_i_i>>>0)<256;
 if($cmp36_i_i){label=316;break;}else{label=321;break;}
 case 316: 
 var $shl_i21_i=$shr_i_i<<1;
 var $arrayidx_i22_i=((520+($shl_i21_i<<2))|0);
 var $337=$arrayidx_i22_i;
 var $338=HEAP32[((480)>>2)];
 var $shl39_i_i=1<<$shr_i_i;
 var $and40_i_i=$338&$shl39_i_i;
 var $tobool_i_i=($and40_i_i|0)==0;
 if($tobool_i_i){label=317;break;}else{label=318;break;}
 case 317: 
 var $or44_i_i=$338|$shl39_i_i;
 HEAP32[((480)>>2)]=$or44_i_i;
 var $arrayidx_sum_pre_i_i=((($shl_i21_i)+(2))|0);
 var $_pre_i_i=((520+($arrayidx_sum_pre_i_i<<2))|0);
 var $F_0_i_i=$337;var $_pre_phi_i_i=$_pre_i_i;label=320;break;
 case 318: 
 var $arrayidx_sum10_i_i=((($shl_i21_i)+(2))|0);
 var $339=((520+($arrayidx_sum10_i_i<<2))|0);
 var $340=HEAP32[(($339)>>2)];
 var $341=$340;
 var $342=HEAP32[((496)>>2)];
 var $cmp46_i_i=($341>>>0)<($342>>>0);
 if($cmp46_i_i){label=319;break;}else{var $F_0_i_i=$340;var $_pre_phi_i_i=$339;label=320;break;}
 case 319: 
 _abort();
 throw "Reached an unreachable!";
 case 320: 
 var $_pre_phi_i_i;
 var $F_0_i_i;
 HEAP32[(($_pre_phi_i_i)>>2)]=$189;
 var $bk_i_i=(($F_0_i_i+12)|0);
 HEAP32[(($bk_i_i)>>2)]=$189;
 var $fd54_i_i=(($189+8)|0);
 HEAP32[(($fd54_i_i)>>2)]=$F_0_i_i;
 var $bk55_i_i=(($189+12)|0);
 HEAP32[(($bk55_i_i)>>2)]=$337;
 label=338;break;
 case 321: 
 var $343=$189;
 var $shr58_i_i=$sub_ptr_sub_i_i>>>8;
 var $cmp59_i_i=($shr58_i_i|0)==0;
 if($cmp59_i_i){var $I57_0_i_i=0;label=324;break;}else{label=322;break;}
 case 322: 
 var $cmp63_i_i=($sub_ptr_sub_i_i>>>0)>16777215;
 if($cmp63_i_i){var $I57_0_i_i=31;label=324;break;}else{label=323;break;}
 case 323: 
 var $sub67_i_i=((($shr58_i_i)+(1048320))|0);
 var $shr68_i_i=$sub67_i_i>>>16;
 var $and69_i_i=$shr68_i_i&8;
 var $shl70_i_i=$shr58_i_i<<$and69_i_i;
 var $sub71_i_i=((($shl70_i_i)+(520192))|0);
 var $shr72_i_i=$sub71_i_i>>>16;
 var $and73_i_i=$shr72_i_i&4;
 var $add74_i_i=$and73_i_i|$and69_i_i;
 var $shl75_i_i=$shl70_i_i<<$and73_i_i;
 var $sub76_i_i=((($shl75_i_i)+(245760))|0);
 var $shr77_i_i=$sub76_i_i>>>16;
 var $and78_i_i=$shr77_i_i&2;
 var $add79_i_i=$add74_i_i|$and78_i_i;
 var $sub80_i_i=(((14)-($add79_i_i))|0);
 var $shl81_i_i=$shl75_i_i<<$and78_i_i;
 var $shr82_i_i=$shl81_i_i>>>15;
 var $add83_i_i=((($sub80_i_i)+($shr82_i_i))|0);
 var $shl84_i_i=$add83_i_i<<1;
 var $add85_i_i=((($add83_i_i)+(7))|0);
 var $shr86_i_i=$sub_ptr_sub_i_i>>>($add85_i_i>>>0);
 var $and87_i_i=$shr86_i_i&1;
 var $add88_i_i=$and87_i_i|$shl84_i_i;
 var $I57_0_i_i=$add88_i_i;label=324;break;
 case 324: 
 var $I57_0_i_i;
 var $arrayidx91_i_i=((784+($I57_0_i_i<<2))|0);
 var $index_i_i=(($189+28)|0);
 var $I57_0_c_i_i=$I57_0_i_i;
 HEAP32[(($index_i_i)>>2)]=$I57_0_c_i_i;
 var $arrayidx92_i_i=(($189+20)|0);
 HEAP32[(($arrayidx92_i_i)>>2)]=0;
 var $344=(($189+16)|0);
 HEAP32[(($344)>>2)]=0;
 var $345=HEAP32[((484)>>2)];
 var $shl95_i_i=1<<$I57_0_i_i;
 var $and96_i_i=$345&$shl95_i_i;
 var $tobool97_i_i=($and96_i_i|0)==0;
 if($tobool97_i_i){label=325;break;}else{label=326;break;}
 case 325: 
 var $or101_i_i=$345|$shl95_i_i;
 HEAP32[((484)>>2)]=$or101_i_i;
 HEAP32[(($arrayidx91_i_i)>>2)]=$343;
 var $parent_i_i=(($189+24)|0);
 var $_c_i_i=$arrayidx91_i_i;
 HEAP32[(($parent_i_i)>>2)]=$_c_i_i;
 var $bk102_i_i=(($189+12)|0);
 HEAP32[(($bk102_i_i)>>2)]=$189;
 var $fd103_i_i=(($189+8)|0);
 HEAP32[(($fd103_i_i)>>2)]=$189;
 label=338;break;
 case 326: 
 var $346=HEAP32[(($arrayidx91_i_i)>>2)];
 var $cmp106_i_i=($I57_0_i_i|0)==31;
 if($cmp106_i_i){var $cond115_i_i=0;label=328;break;}else{label=327;break;}
 case 327: 
 var $shr110_i_i=$I57_0_i_i>>>1;
 var $sub113_i_i=(((25)-($shr110_i_i))|0);
 var $cond115_i_i=$sub113_i_i;label=328;break;
 case 328: 
 var $cond115_i_i;
 var $shl116_i_i=$sub_ptr_sub_i_i<<$cond115_i_i;
 var $K105_0_i_i=$shl116_i_i;var $T_0_i_i=$346;label=329;break;
 case 329: 
 var $T_0_i_i;
 var $K105_0_i_i;
 var $head118_i_i=(($T_0_i_i+4)|0);
 var $347=HEAP32[(($head118_i_i)>>2)];
 var $and119_i_i=$347&-8;
 var $cmp120_i_i=($and119_i_i|0)==($sub_ptr_sub_i_i|0);
 if($cmp120_i_i){label=334;break;}else{label=330;break;}
 case 330: 
 var $shr123_i_i=$K105_0_i_i>>>31;
 var $arrayidx126_i_i=(($T_0_i_i+16+($shr123_i_i<<2))|0);
 var $348=HEAP32[(($arrayidx126_i_i)>>2)];
 var $cmp128_i_i=($348|0)==0;
 var $shl127_i_i=$K105_0_i_i<<1;
 if($cmp128_i_i){label=331;break;}else{var $K105_0_i_i=$shl127_i_i;var $T_0_i_i=$348;label=329;break;}
 case 331: 
 var $349=$arrayidx126_i_i;
 var $350=HEAP32[((496)>>2)];
 var $cmp133_i_i=($349>>>0)<($350>>>0);
 if($cmp133_i_i){label=333;break;}else{label=332;break;}
 case 332: 
 HEAP32[(($arrayidx126_i_i)>>2)]=$343;
 var $parent138_i_i=(($189+24)|0);
 var $T_0_c7_i_i=$T_0_i_i;
 HEAP32[(($parent138_i_i)>>2)]=$T_0_c7_i_i;
 var $bk139_i_i=(($189+12)|0);
 HEAP32[(($bk139_i_i)>>2)]=$189;
 var $fd140_i_i=(($189+8)|0);
 HEAP32[(($fd140_i_i)>>2)]=$189;
 label=338;break;
 case 333: 
 _abort();
 throw "Reached an unreachable!";
 case 334: 
 var $fd145_i_i=(($T_0_i_i+8)|0);
 var $351=HEAP32[(($fd145_i_i)>>2)];
 var $352=$T_0_i_i;
 var $353=HEAP32[((496)>>2)];
 var $cmp147_i_i=($352>>>0)<($353>>>0);
 if($cmp147_i_i){label=337;break;}else{label=335;break;}
 case 335: 
 var $354=$351;
 var $cmp150_i_i=($354>>>0)<($353>>>0);
 if($cmp150_i_i){label=337;break;}else{label=336;break;}
 case 336: 
 var $bk155_i_i=(($351+12)|0);
 HEAP32[(($bk155_i_i)>>2)]=$343;
 HEAP32[(($fd145_i_i)>>2)]=$343;
 var $fd157_i_i=(($189+8)|0);
 var $_c6_i_i=$351;
 HEAP32[(($fd157_i_i)>>2)]=$_c6_i_i;
 var $bk158_i_i=(($189+12)|0);
 var $T_0_c_i_i=$T_0_i_i;
 HEAP32[(($bk158_i_i)>>2)]=$T_0_c_i_i;
 var $parent159_i_i=(($189+24)|0);
 HEAP32[(($parent159_i_i)>>2)]=0;
 label=338;break;
 case 337: 
 _abort();
 throw "Reached an unreachable!";
 case 338: 
 var $355=HEAP32[((492)>>2)];
 var $cmp250_i=($355>>>0)>($nb_0>>>0);
 if($cmp250_i){label=339;break;}else{label=340;break;}
 case 339: 
 var $sub253_i=((($355)-($nb_0))|0);
 HEAP32[((492)>>2)]=$sub253_i;
 var $356=HEAP32[((504)>>2)];
 var $357=$356;
 var $add_ptr255_i=(($357+$nb_0)|0);
 var $358=$add_ptr255_i;
 HEAP32[((504)>>2)]=$358;
 var $or257_i=$sub253_i|1;
 var $add_ptr255_sum_i=((($nb_0)+(4))|0);
 var $head258_i=(($357+$add_ptr255_sum_i)|0);
 var $359=$head258_i;
 HEAP32[(($359)>>2)]=$or257_i;
 var $or260_i=$nb_0|3;
 var $head261_i=(($356+4)|0);
 HEAP32[(($head261_i)>>2)]=$or260_i;
 var $add_ptr262_i=(($356+8)|0);
 var $360=$add_ptr262_i;
 var $mem_0=$360;label=341;break;
 case 340: 
 var $call265_i=___errno_location();
 HEAP32[(($call265_i)>>2)]=12;
 var $mem_0=0;label=341;break;
 case 341: 
 var $mem_0;
 return $mem_0;
  default: assert(0, "bad label: " + label);
 }
}
Module["_malloc"] = _malloc;
function _free($mem){
 var label=0;
 label = 1; 
 while(1)switch(label){
 case 1: 
 var $cmp=($mem|0)==0;
 if($cmp){label=140;break;}else{label=2;break;}
 case 2: 
 var $add_ptr=((($mem)-(8))|0);
 var $0=$add_ptr;
 var $1=HEAP32[((496)>>2)];
 var $cmp1=($add_ptr>>>0)<($1>>>0);
 if($cmp1){label=139;break;}else{label=3;break;}
 case 3: 
 var $head=((($mem)-(4))|0);
 var $2=$head;
 var $3=HEAP32[(($2)>>2)];
 var $and=$3&3;
 var $cmp2=($and|0)==1;
 if($cmp2){label=139;break;}else{label=4;break;}
 case 4: 
 var $and5=$3&-8;
 var $add_ptr_sum=((($and5)-(8))|0);
 var $add_ptr6=(($mem+$add_ptr_sum)|0);
 var $4=$add_ptr6;
 var $and8=$3&1;
 var $tobool9=($and8|0)==0;
 if($tobool9){label=5;break;}else{var $p_0=$0;var $psize_0=$and5;label=56;break;}
 case 5: 
 var $prev_foot=$add_ptr;
 var $5=HEAP32[(($prev_foot)>>2)];
 var $cmp13=($and|0)==0;
 if($cmp13){label=140;break;}else{label=6;break;}
 case 6: 
 var $add_ptr_sum231=(((-8)-($5))|0);
 var $add_ptr16=(($mem+$add_ptr_sum231)|0);
 var $6=$add_ptr16;
 var $add17=((($5)+($and5))|0);
 var $cmp18=($add_ptr16>>>0)<($1>>>0);
 if($cmp18){label=139;break;}else{label=7;break;}
 case 7: 
 var $7=HEAP32[((500)>>2)];
 var $cmp22=($6|0)==($7|0);
 if($cmp22){label=54;break;}else{label=8;break;}
 case 8: 
 var $shr=$5>>>3;
 var $cmp25=($5>>>0)<256;
 if($cmp25){label=9;break;}else{label=21;break;}
 case 9: 
 var $add_ptr16_sum268=((($add_ptr_sum231)+(8))|0);
 var $fd=(($mem+$add_ptr16_sum268)|0);
 var $8=$fd;
 var $9=HEAP32[(($8)>>2)];
 var $add_ptr16_sum269=((($add_ptr_sum231)+(12))|0);
 var $bk=(($mem+$add_ptr16_sum269)|0);
 var $10=$bk;
 var $11=HEAP32[(($10)>>2)];
 var $shl=$shr<<1;
 var $arrayidx=((520+($shl<<2))|0);
 var $12=$arrayidx;
 var $cmp29=($9|0)==($12|0);
 if($cmp29){label=12;break;}else{label=10;break;}
 case 10: 
 var $13=$9;
 var $cmp31=($13>>>0)<($1>>>0);
 if($cmp31){label=20;break;}else{label=11;break;}
 case 11: 
 var $bk34=(($9+12)|0);
 var $14=HEAP32[(($bk34)>>2)];
 var $cmp35=($14|0)==($6|0);
 if($cmp35){label=12;break;}else{label=20;break;}
 case 12: 
 var $cmp42=($11|0)==($9|0);
 if($cmp42){label=13;break;}else{label=14;break;}
 case 13: 
 var $shl45=1<<$shr;
 var $neg=$shl45^-1;
 var $15=HEAP32[((480)>>2)];
 var $and46=$15&$neg;
 HEAP32[((480)>>2)]=$and46;
 var $p_0=$6;var $psize_0=$add17;label=56;break;
 case 14: 
 var $cmp50=($11|0)==($12|0);
 if($cmp50){label=15;break;}else{label=16;break;}
 case 15: 
 var $fd67_pre=(($11+8)|0);
 var $fd67_pre_phi=$fd67_pre;label=18;break;
 case 16: 
 var $16=$11;
 var $cmp53=($16>>>0)<($1>>>0);
 if($cmp53){label=19;break;}else{label=17;break;}
 case 17: 
 var $fd56=(($11+8)|0);
 var $17=HEAP32[(($fd56)>>2)];
 var $cmp57=($17|0)==($6|0);
 if($cmp57){var $fd67_pre_phi=$fd56;label=18;break;}else{label=19;break;}
 case 18: 
 var $fd67_pre_phi;
 var $bk66=(($9+12)|0);
 HEAP32[(($bk66)>>2)]=$11;
 HEAP32[(($fd67_pre_phi)>>2)]=$9;
 var $p_0=$6;var $psize_0=$add17;label=56;break;
 case 19: 
 _abort();
 throw "Reached an unreachable!";
 case 20: 
 _abort();
 throw "Reached an unreachable!";
 case 21: 
 var $18=$add_ptr16;
 var $add_ptr16_sum260=((($add_ptr_sum231)+(24))|0);
 var $parent=(($mem+$add_ptr16_sum260)|0);
 var $19=$parent;
 var $20=HEAP32[(($19)>>2)];
 var $add_ptr16_sum261=((($add_ptr_sum231)+(12))|0);
 var $bk73=(($mem+$add_ptr16_sum261)|0);
 var $21=$bk73;
 var $22=HEAP32[(($21)>>2)];
 var $cmp74=($22|0)==($18|0);
 if($cmp74){label=27;break;}else{label=22;break;}
 case 22: 
 var $add_ptr16_sum265=((($add_ptr_sum231)+(8))|0);
 var $fd78=(($mem+$add_ptr16_sum265)|0);
 var $23=$fd78;
 var $24=HEAP32[(($23)>>2)];
 var $25=$24;
 var $cmp80=($25>>>0)<($1>>>0);
 if($cmp80){label=26;break;}else{label=23;break;}
 case 23: 
 var $bk82=(($24+12)|0);
 var $26=HEAP32[(($bk82)>>2)];
 var $cmp83=($26|0)==($18|0);
 if($cmp83){label=24;break;}else{label=26;break;}
 case 24: 
 var $fd86=(($22+8)|0);
 var $27=HEAP32[(($fd86)>>2)];
 var $cmp87=($27|0)==($18|0);
 if($cmp87){label=25;break;}else{label=26;break;}
 case 25: 
 HEAP32[(($bk82)>>2)]=$22;
 HEAP32[(($fd86)>>2)]=$24;
 var $R_1=$22;label=34;break;
 case 26: 
 _abort();
 throw "Reached an unreachable!";
 case 27: 
 var $child_sum=((($add_ptr_sum231)+(20))|0);
 var $arrayidx99=(($mem+$child_sum)|0);
 var $28=$arrayidx99;
 var $29=HEAP32[(($28)>>2)];
 var $cmp100=($29|0)==0;
 if($cmp100){label=28;break;}else{var $R_0=$29;var $RP_0=$28;label=29;break;}
 case 28: 
 var $add_ptr16_sum262=((($add_ptr_sum231)+(16))|0);
 var $child=(($mem+$add_ptr16_sum262)|0);
 var $arrayidx103=$child;
 var $30=HEAP32[(($arrayidx103)>>2)];
 var $cmp104=($30|0)==0;
 if($cmp104){var $R_1=0;label=34;break;}else{var $R_0=$30;var $RP_0=$arrayidx103;label=29;break;}
 case 29: 
 var $RP_0;
 var $R_0;
 var $arrayidx108=(($R_0+20)|0);
 var $31=HEAP32[(($arrayidx108)>>2)];
 var $cmp109=($31|0)==0;
 if($cmp109){label=30;break;}else{var $R_0=$31;var $RP_0=$arrayidx108;label=29;break;}
 case 30: 
 var $arrayidx113=(($R_0+16)|0);
 var $32=HEAP32[(($arrayidx113)>>2)];
 var $cmp114=($32|0)==0;
 if($cmp114){label=31;break;}else{var $R_0=$32;var $RP_0=$arrayidx113;label=29;break;}
 case 31: 
 var $33=$RP_0;
 var $cmp118=($33>>>0)<($1>>>0);
 if($cmp118){label=33;break;}else{label=32;break;}
 case 32: 
 HEAP32[(($RP_0)>>2)]=0;
 var $R_1=$R_0;label=34;break;
 case 33: 
 _abort();
 throw "Reached an unreachable!";
 case 34: 
 var $R_1;
 var $cmp127=($20|0)==0;
 if($cmp127){var $p_0=$6;var $psize_0=$add17;label=56;break;}else{label=35;break;}
 case 35: 
 var $add_ptr16_sum263=((($add_ptr_sum231)+(28))|0);
 var $index=(($mem+$add_ptr16_sum263)|0);
 var $34=$index;
 var $35=HEAP32[(($34)>>2)];
 var $arrayidx130=((784+($35<<2))|0);
 var $36=HEAP32[(($arrayidx130)>>2)];
 var $cmp131=($18|0)==($36|0);
 if($cmp131){label=36;break;}else{label=38;break;}
 case 36: 
 HEAP32[(($arrayidx130)>>2)]=$R_1;
 var $cond278=($R_1|0)==0;
 if($cond278){label=37;break;}else{label=44;break;}
 case 37: 
 var $37=HEAP32[(($34)>>2)];
 var $shl138=1<<$37;
 var $neg139=$shl138^-1;
 var $38=HEAP32[((484)>>2)];
 var $and140=$38&$neg139;
 HEAP32[((484)>>2)]=$and140;
 var $p_0=$6;var $psize_0=$add17;label=56;break;
 case 38: 
 var $39=$20;
 var $40=HEAP32[((496)>>2)];
 var $cmp143=($39>>>0)<($40>>>0);
 if($cmp143){label=42;break;}else{label=39;break;}
 case 39: 
 var $arrayidx149=(($20+16)|0);
 var $41=HEAP32[(($arrayidx149)>>2)];
 var $cmp150=($41|0)==($18|0);
 if($cmp150){label=40;break;}else{label=41;break;}
 case 40: 
 HEAP32[(($arrayidx149)>>2)]=$R_1;
 label=43;break;
 case 41: 
 var $arrayidx157=(($20+20)|0);
 HEAP32[(($arrayidx157)>>2)]=$R_1;
 label=43;break;
 case 42: 
 _abort();
 throw "Reached an unreachable!";
 case 43: 
 var $cmp162=($R_1|0)==0;
 if($cmp162){var $p_0=$6;var $psize_0=$add17;label=56;break;}else{label=44;break;}
 case 44: 
 var $42=$R_1;
 var $43=HEAP32[((496)>>2)];
 var $cmp165=($42>>>0)<($43>>>0);
 if($cmp165){label=53;break;}else{label=45;break;}
 case 45: 
 var $parent170=(($R_1+24)|0);
 HEAP32[(($parent170)>>2)]=$20;
 var $add_ptr16_sum264=((($add_ptr_sum231)+(16))|0);
 var $child171=(($mem+$add_ptr16_sum264)|0);
 var $arrayidx172=$child171;
 var $44=HEAP32[(($arrayidx172)>>2)];
 var $cmp173=($44|0)==0;
 if($cmp173){label=49;break;}else{label=46;break;}
 case 46: 
 var $45=$44;
 var $46=HEAP32[((496)>>2)];
 var $cmp176=($45>>>0)<($46>>>0);
 if($cmp176){label=48;break;}else{label=47;break;}
 case 47: 
 var $arrayidx182=(($R_1+16)|0);
 HEAP32[(($arrayidx182)>>2)]=$44;
 var $parent183=(($44+24)|0);
 HEAP32[(($parent183)>>2)]=$R_1;
 label=49;break;
 case 48: 
 _abort();
 throw "Reached an unreachable!";
 case 49: 
 var $child171_sum=((($add_ptr_sum231)+(20))|0);
 var $arrayidx188=(($mem+$child171_sum)|0);
 var $47=$arrayidx188;
 var $48=HEAP32[(($47)>>2)];
 var $cmp189=($48|0)==0;
 if($cmp189){var $p_0=$6;var $psize_0=$add17;label=56;break;}else{label=50;break;}
 case 50: 
 var $49=$48;
 var $50=HEAP32[((496)>>2)];
 var $cmp192=($49>>>0)<($50>>>0);
 if($cmp192){label=52;break;}else{label=51;break;}
 case 51: 
 var $arrayidx198=(($R_1+20)|0);
 HEAP32[(($arrayidx198)>>2)]=$48;
 var $parent199=(($48+24)|0);
 HEAP32[(($parent199)>>2)]=$R_1;
 var $p_0=$6;var $psize_0=$add17;label=56;break;
 case 52: 
 _abort();
 throw "Reached an unreachable!";
 case 53: 
 _abort();
 throw "Reached an unreachable!";
 case 54: 
 var $add_ptr6_sum=((($and5)-(4))|0);
 var $head209=(($mem+$add_ptr6_sum)|0);
 var $51=$head209;
 var $52=HEAP32[(($51)>>2)];
 var $and210=$52&3;
 var $cmp211=($and210|0)==3;
 if($cmp211){label=55;break;}else{var $p_0=$6;var $psize_0=$add17;label=56;break;}
 case 55: 
 HEAP32[((488)>>2)]=$add17;
 var $53=HEAP32[(($51)>>2)];
 var $and215=$53&-2;
 HEAP32[(($51)>>2)]=$and215;
 var $or=$add17|1;
 var $add_ptr16_sum=((($add_ptr_sum231)+(4))|0);
 var $head216=(($mem+$add_ptr16_sum)|0);
 var $54=$head216;
 HEAP32[(($54)>>2)]=$or;
 var $prev_foot218=$add_ptr6;
 HEAP32[(($prev_foot218)>>2)]=$add17;
 label=140;break;
 case 56: 
 var $psize_0;
 var $p_0;
 var $55=$p_0;
 var $cmp225=($55>>>0)<($add_ptr6>>>0);
 if($cmp225){label=57;break;}else{label=139;break;}
 case 57: 
 var $add_ptr6_sum258=((($and5)-(4))|0);
 var $head228=(($mem+$add_ptr6_sum258)|0);
 var $56=$head228;
 var $57=HEAP32[(($56)>>2)];
 var $and229=$57&1;
 var $phitmp=($and229|0)==0;
 if($phitmp){label=139;break;}else{label=58;break;}
 case 58: 
 var $and237=$57&2;
 var $tobool238=($and237|0)==0;
 if($tobool238){label=59;break;}else{label=112;break;}
 case 59: 
 var $58=HEAP32[((504)>>2)];
 var $cmp240=($4|0)==($58|0);
 if($cmp240){label=60;break;}else{label=62;break;}
 case 60: 
 var $59=HEAP32[((492)>>2)];
 var $add243=((($59)+($psize_0))|0);
 HEAP32[((492)>>2)]=$add243;
 HEAP32[((504)>>2)]=$p_0;
 var $or244=$add243|1;
 var $head245=(($p_0+4)|0);
 HEAP32[(($head245)>>2)]=$or244;
 var $60=HEAP32[((500)>>2)];
 var $cmp246=($p_0|0)==($60|0);
 if($cmp246){label=61;break;}else{label=140;break;}
 case 61: 
 HEAP32[((500)>>2)]=0;
 HEAP32[((488)>>2)]=0;
 label=140;break;
 case 62: 
 var $61=HEAP32[((500)>>2)];
 var $cmp251=($4|0)==($61|0);
 if($cmp251){label=63;break;}else{label=64;break;}
 case 63: 
 var $62=HEAP32[((488)>>2)];
 var $add254=((($62)+($psize_0))|0);
 HEAP32[((488)>>2)]=$add254;
 HEAP32[((500)>>2)]=$p_0;
 var $or255=$add254|1;
 var $head256=(($p_0+4)|0);
 HEAP32[(($head256)>>2)]=$or255;
 var $add_ptr257=(($55+$add254)|0);
 var $prev_foot258=$add_ptr257;
 HEAP32[(($prev_foot258)>>2)]=$add254;
 label=140;break;
 case 64: 
 var $and261=$57&-8;
 var $add262=((($and261)+($psize_0))|0);
 var $shr263=$57>>>3;
 var $cmp264=($57>>>0)<256;
 if($cmp264){label=65;break;}else{label=77;break;}
 case 65: 
 var $fd268=(($mem+$and5)|0);
 var $63=$fd268;
 var $64=HEAP32[(($63)>>2)];
 var $add_ptr6_sum252253=$and5|4;
 var $bk270=(($mem+$add_ptr6_sum252253)|0);
 var $65=$bk270;
 var $66=HEAP32[(($65)>>2)];
 var $shl273=$shr263<<1;
 var $arrayidx274=((520+($shl273<<2))|0);
 var $67=$arrayidx274;
 var $cmp275=($64|0)==($67|0);
 if($cmp275){label=68;break;}else{label=66;break;}
 case 66: 
 var $68=$64;
 var $69=HEAP32[((496)>>2)];
 var $cmp278=($68>>>0)<($69>>>0);
 if($cmp278){label=76;break;}else{label=67;break;}
 case 67: 
 var $bk281=(($64+12)|0);
 var $70=HEAP32[(($bk281)>>2)];
 var $cmp282=($70|0)==($4|0);
 if($cmp282){label=68;break;}else{label=76;break;}
 case 68: 
 var $cmp291=($66|0)==($64|0);
 if($cmp291){label=69;break;}else{label=70;break;}
 case 69: 
 var $shl294=1<<$shr263;
 var $neg295=$shl294^-1;
 var $71=HEAP32[((480)>>2)];
 var $and296=$71&$neg295;
 HEAP32[((480)>>2)]=$and296;
 label=110;break;
 case 70: 
 var $cmp300=($66|0)==($67|0);
 if($cmp300){label=71;break;}else{label=72;break;}
 case 71: 
 var $fd317_pre=(($66+8)|0);
 var $fd317_pre_phi=$fd317_pre;label=74;break;
 case 72: 
 var $72=$66;
 var $73=HEAP32[((496)>>2)];
 var $cmp303=($72>>>0)<($73>>>0);
 if($cmp303){label=75;break;}else{label=73;break;}
 case 73: 
 var $fd306=(($66+8)|0);
 var $74=HEAP32[(($fd306)>>2)];
 var $cmp307=($74|0)==($4|0);
 if($cmp307){var $fd317_pre_phi=$fd306;label=74;break;}else{label=75;break;}
 case 74: 
 var $fd317_pre_phi;
 var $bk316=(($64+12)|0);
 HEAP32[(($bk316)>>2)]=$66;
 HEAP32[(($fd317_pre_phi)>>2)]=$64;
 label=110;break;
 case 75: 
 _abort();
 throw "Reached an unreachable!";
 case 76: 
 _abort();
 throw "Reached an unreachable!";
 case 77: 
 var $75=$add_ptr6;
 var $add_ptr6_sum233=((($and5)+(16))|0);
 var $parent326=(($mem+$add_ptr6_sum233)|0);
 var $76=$parent326;
 var $77=HEAP32[(($76)>>2)];
 var $add_ptr6_sum234235=$and5|4;
 var $bk328=(($mem+$add_ptr6_sum234235)|0);
 var $78=$bk328;
 var $79=HEAP32[(($78)>>2)];
 var $cmp329=($79|0)==($75|0);
 if($cmp329){label=83;break;}else{label=78;break;}
 case 78: 
 var $fd333=(($mem+$and5)|0);
 var $80=$fd333;
 var $81=HEAP32[(($80)>>2)];
 var $82=$81;
 var $83=HEAP32[((496)>>2)];
 var $cmp335=($82>>>0)<($83>>>0);
 if($cmp335){label=82;break;}else{label=79;break;}
 case 79: 
 var $bk338=(($81+12)|0);
 var $84=HEAP32[(($bk338)>>2)];
 var $cmp339=($84|0)==($75|0);
 if($cmp339){label=80;break;}else{label=82;break;}
 case 80: 
 var $fd342=(($79+8)|0);
 var $85=HEAP32[(($fd342)>>2)];
 var $cmp343=($85|0)==($75|0);
 if($cmp343){label=81;break;}else{label=82;break;}
 case 81: 
 HEAP32[(($bk338)>>2)]=$79;
 HEAP32[(($fd342)>>2)]=$81;
 var $R327_1=$79;label=90;break;
 case 82: 
 _abort();
 throw "Reached an unreachable!";
 case 83: 
 var $child356_sum=((($and5)+(12))|0);
 var $arrayidx357=(($mem+$child356_sum)|0);
 var $86=$arrayidx357;
 var $87=HEAP32[(($86)>>2)];
 var $cmp358=($87|0)==0;
 if($cmp358){label=84;break;}else{var $R327_0=$87;var $RP355_0=$86;label=85;break;}
 case 84: 
 var $add_ptr6_sum236=((($and5)+(8))|0);
 var $child356=(($mem+$add_ptr6_sum236)|0);
 var $arrayidx362=$child356;
 var $88=HEAP32[(($arrayidx362)>>2)];
 var $cmp363=($88|0)==0;
 if($cmp363){var $R327_1=0;label=90;break;}else{var $R327_0=$88;var $RP355_0=$arrayidx362;label=85;break;}
 case 85: 
 var $RP355_0;
 var $R327_0;
 var $arrayidx369=(($R327_0+20)|0);
 var $89=HEAP32[(($arrayidx369)>>2)];
 var $cmp370=($89|0)==0;
 if($cmp370){label=86;break;}else{var $R327_0=$89;var $RP355_0=$arrayidx369;label=85;break;}
 case 86: 
 var $arrayidx374=(($R327_0+16)|0);
 var $90=HEAP32[(($arrayidx374)>>2)];
 var $cmp375=($90|0)==0;
 if($cmp375){label=87;break;}else{var $R327_0=$90;var $RP355_0=$arrayidx374;label=85;break;}
 case 87: 
 var $91=$RP355_0;
 var $92=HEAP32[((496)>>2)];
 var $cmp381=($91>>>0)<($92>>>0);
 if($cmp381){label=89;break;}else{label=88;break;}
 case 88: 
 HEAP32[(($RP355_0)>>2)]=0;
 var $R327_1=$R327_0;label=90;break;
 case 89: 
 _abort();
 throw "Reached an unreachable!";
 case 90: 
 var $R327_1;
 var $cmp390=($77|0)==0;
 if($cmp390){label=110;break;}else{label=91;break;}
 case 91: 
 var $add_ptr6_sum246=((($and5)+(20))|0);
 var $index394=(($mem+$add_ptr6_sum246)|0);
 var $93=$index394;
 var $94=HEAP32[(($93)>>2)];
 var $arrayidx395=((784+($94<<2))|0);
 var $95=HEAP32[(($arrayidx395)>>2)];
 var $cmp396=($75|0)==($95|0);
 if($cmp396){label=92;break;}else{label=94;break;}
 case 92: 
 HEAP32[(($arrayidx395)>>2)]=$R327_1;
 var $cond279=($R327_1|0)==0;
 if($cond279){label=93;break;}else{label=100;break;}
 case 93: 
 var $96=HEAP32[(($93)>>2)];
 var $shl403=1<<$96;
 var $neg404=$shl403^-1;
 var $97=HEAP32[((484)>>2)];
 var $and405=$97&$neg404;
 HEAP32[((484)>>2)]=$and405;
 label=110;break;
 case 94: 
 var $98=$77;
 var $99=HEAP32[((496)>>2)];
 var $cmp408=($98>>>0)<($99>>>0);
 if($cmp408){label=98;break;}else{label=95;break;}
 case 95: 
 var $arrayidx414=(($77+16)|0);
 var $100=HEAP32[(($arrayidx414)>>2)];
 var $cmp415=($100|0)==($75|0);
 if($cmp415){label=96;break;}else{label=97;break;}
 case 96: 
 HEAP32[(($arrayidx414)>>2)]=$R327_1;
 label=99;break;
 case 97: 
 var $arrayidx422=(($77+20)|0);
 HEAP32[(($arrayidx422)>>2)]=$R327_1;
 label=99;break;
 case 98: 
 _abort();
 throw "Reached an unreachable!";
 case 99: 
 var $cmp427=($R327_1|0)==0;
 if($cmp427){label=110;break;}else{label=100;break;}
 case 100: 
 var $101=$R327_1;
 var $102=HEAP32[((496)>>2)];
 var $cmp430=($101>>>0)<($102>>>0);
 if($cmp430){label=109;break;}else{label=101;break;}
 case 101: 
 var $parent437=(($R327_1+24)|0);
 HEAP32[(($parent437)>>2)]=$77;
 var $add_ptr6_sum247=((($and5)+(8))|0);
 var $child438=(($mem+$add_ptr6_sum247)|0);
 var $arrayidx439=$child438;
 var $103=HEAP32[(($arrayidx439)>>2)];
 var $cmp440=($103|0)==0;
 if($cmp440){label=105;break;}else{label=102;break;}
 case 102: 
 var $104=$103;
 var $105=HEAP32[((496)>>2)];
 var $cmp443=($104>>>0)<($105>>>0);
 if($cmp443){label=104;break;}else{label=103;break;}
 case 103: 
 var $arrayidx449=(($R327_1+16)|0);
 HEAP32[(($arrayidx449)>>2)]=$103;
 var $parent450=(($103+24)|0);
 HEAP32[(($parent450)>>2)]=$R327_1;
 label=105;break;
 case 104: 
 _abort();
 throw "Reached an unreachable!";
 case 105: 
 var $child438_sum=((($and5)+(12))|0);
 var $arrayidx455=(($mem+$child438_sum)|0);
 var $106=$arrayidx455;
 var $107=HEAP32[(($106)>>2)];
 var $cmp456=($107|0)==0;
 if($cmp456){label=110;break;}else{label=106;break;}
 case 106: 
 var $108=$107;
 var $109=HEAP32[((496)>>2)];
 var $cmp459=($108>>>0)<($109>>>0);
 if($cmp459){label=108;break;}else{label=107;break;}
 case 107: 
 var $arrayidx465=(($R327_1+20)|0);
 HEAP32[(($arrayidx465)>>2)]=$107;
 var $parent466=(($107+24)|0);
 HEAP32[(($parent466)>>2)]=$R327_1;
 label=110;break;
 case 108: 
 _abort();
 throw "Reached an unreachable!";
 case 109: 
 _abort();
 throw "Reached an unreachable!";
 case 110: 
 var $or475=$add262|1;
 var $head476=(($p_0+4)|0);
 HEAP32[(($head476)>>2)]=$or475;
 var $add_ptr477=(($55+$add262)|0);
 var $prev_foot478=$add_ptr477;
 HEAP32[(($prev_foot478)>>2)]=$add262;
 var $110=HEAP32[((500)>>2)];
 var $cmp479=($p_0|0)==($110|0);
 if($cmp479){label=111;break;}else{var $psize_1=$add262;label=113;break;}
 case 111: 
 HEAP32[((488)>>2)]=$add262;
 label=140;break;
 case 112: 
 var $and487=$57&-2;
 HEAP32[(($56)>>2)]=$and487;
 var $or488=$psize_0|1;
 var $head489=(($p_0+4)|0);
 HEAP32[(($head489)>>2)]=$or488;
 var $add_ptr490=(($55+$psize_0)|0);
 var $prev_foot491=$add_ptr490;
 HEAP32[(($prev_foot491)>>2)]=$psize_0;
 var $psize_1=$psize_0;label=113;break;
 case 113: 
 var $psize_1;
 var $shr493=$psize_1>>>3;
 var $cmp494=($psize_1>>>0)<256;
 if($cmp494){label=114;break;}else{label=119;break;}
 case 114: 
 var $shl500=$shr493<<1;
 var $arrayidx501=((520+($shl500<<2))|0);
 var $111=$arrayidx501;
 var $112=HEAP32[((480)>>2)];
 var $shl503=1<<$shr493;
 var $and504=$112&$shl503;
 var $tobool505=($and504|0)==0;
 if($tobool505){label=115;break;}else{label=116;break;}
 case 115: 
 var $or508=$112|$shl503;
 HEAP32[((480)>>2)]=$or508;
 var $arrayidx501_sum_pre=((($shl500)+(2))|0);
 var $_pre=((520+($arrayidx501_sum_pre<<2))|0);
 var $F502_0=$111;var $_pre_phi=$_pre;label=118;break;
 case 116: 
 var $arrayidx501_sum245=((($shl500)+(2))|0);
 var $113=((520+($arrayidx501_sum245<<2))|0);
 var $114=HEAP32[(($113)>>2)];
 var $115=$114;
 var $116=HEAP32[((496)>>2)];
 var $cmp511=($115>>>0)<($116>>>0);
 if($cmp511){label=117;break;}else{var $F502_0=$114;var $_pre_phi=$113;label=118;break;}
 case 117: 
 _abort();
 throw "Reached an unreachable!";
 case 118: 
 var $_pre_phi;
 var $F502_0;
 HEAP32[(($_pre_phi)>>2)]=$p_0;
 var $bk521=(($F502_0+12)|0);
 HEAP32[(($bk521)>>2)]=$p_0;
 var $fd522=(($p_0+8)|0);
 HEAP32[(($fd522)>>2)]=$F502_0;
 var $bk523=(($p_0+12)|0);
 HEAP32[(($bk523)>>2)]=$111;
 label=140;break;
 case 119: 
 var $117=$p_0;
 var $shr527=$psize_1>>>8;
 var $cmp528=($shr527|0)==0;
 if($cmp528){var $I526_0=0;label=122;break;}else{label=120;break;}
 case 120: 
 var $cmp532=($psize_1>>>0)>16777215;
 if($cmp532){var $I526_0=31;label=122;break;}else{label=121;break;}
 case 121: 
 var $sub=((($shr527)+(1048320))|0);
 var $shr536=$sub>>>16;
 var $and537=$shr536&8;
 var $shl538=$shr527<<$and537;
 var $sub539=((($shl538)+(520192))|0);
 var $shr540=$sub539>>>16;
 var $and541=$shr540&4;
 var $add542=$and541|$and537;
 var $shl543=$shl538<<$and541;
 var $sub544=((($shl543)+(245760))|0);
 var $shr545=$sub544>>>16;
 var $and546=$shr545&2;
 var $add547=$add542|$and546;
 var $sub548=(((14)-($add547))|0);
 var $shl549=$shl543<<$and546;
 var $shr550=$shl549>>>15;
 var $add551=((($sub548)+($shr550))|0);
 var $shl552=$add551<<1;
 var $add553=((($add551)+(7))|0);
 var $shr554=$psize_1>>>($add553>>>0);
 var $and555=$shr554&1;
 var $add556=$and555|$shl552;
 var $I526_0=$add556;label=122;break;
 case 122: 
 var $I526_0;
 var $arrayidx559=((784+($I526_0<<2))|0);
 var $index560=(($p_0+28)|0);
 var $I526_0_c=$I526_0;
 HEAP32[(($index560)>>2)]=$I526_0_c;
 var $arrayidx562=(($p_0+20)|0);
 HEAP32[(($arrayidx562)>>2)]=0;
 var $118=(($p_0+16)|0);
 HEAP32[(($118)>>2)]=0;
 var $119=HEAP32[((484)>>2)];
 var $shl565=1<<$I526_0;
 var $and566=$119&$shl565;
 var $tobool567=($and566|0)==0;
 if($tobool567){label=123;break;}else{label=124;break;}
 case 123: 
 var $or570=$119|$shl565;
 HEAP32[((484)>>2)]=$or570;
 HEAP32[(($arrayidx559)>>2)]=$117;
 var $parent571=(($p_0+24)|0);
 var $_c=$arrayidx559;
 HEAP32[(($parent571)>>2)]=$_c;
 var $bk572=(($p_0+12)|0);
 HEAP32[(($bk572)>>2)]=$p_0;
 var $fd573=(($p_0+8)|0);
 HEAP32[(($fd573)>>2)]=$p_0;
 label=136;break;
 case 124: 
 var $120=HEAP32[(($arrayidx559)>>2)];
 var $cmp576=($I526_0|0)==31;
 if($cmp576){var $cond=0;label=126;break;}else{label=125;break;}
 case 125: 
 var $shr578=$I526_0>>>1;
 var $sub581=(((25)-($shr578))|0);
 var $cond=$sub581;label=126;break;
 case 126: 
 var $cond;
 var $shl582=$psize_1<<$cond;
 var $K575_0=$shl582;var $T_0=$120;label=127;break;
 case 127: 
 var $T_0;
 var $K575_0;
 var $head583=(($T_0+4)|0);
 var $121=HEAP32[(($head583)>>2)];
 var $and584=$121&-8;
 var $cmp585=($and584|0)==($psize_1|0);
 if($cmp585){label=132;break;}else{label=128;break;}
 case 128: 
 var $shr588=$K575_0>>>31;
 var $arrayidx591=(($T_0+16+($shr588<<2))|0);
 var $122=HEAP32[(($arrayidx591)>>2)];
 var $cmp593=($122|0)==0;
 var $shl592=$K575_0<<1;
 if($cmp593){label=129;break;}else{var $K575_0=$shl592;var $T_0=$122;label=127;break;}
 case 129: 
 var $123=$arrayidx591;
 var $124=HEAP32[((496)>>2)];
 var $cmp597=($123>>>0)<($124>>>0);
 if($cmp597){label=131;break;}else{label=130;break;}
 case 130: 
 HEAP32[(($arrayidx591)>>2)]=$117;
 var $parent602=(($p_0+24)|0);
 var $T_0_c242=$T_0;
 HEAP32[(($parent602)>>2)]=$T_0_c242;
 var $bk603=(($p_0+12)|0);
 HEAP32[(($bk603)>>2)]=$p_0;
 var $fd604=(($p_0+8)|0);
 HEAP32[(($fd604)>>2)]=$p_0;
 label=136;break;
 case 131: 
 _abort();
 throw "Reached an unreachable!";
 case 132: 
 var $fd609=(($T_0+8)|0);
 var $125=HEAP32[(($fd609)>>2)];
 var $126=$T_0;
 var $127=HEAP32[((496)>>2)];
 var $cmp610=($126>>>0)<($127>>>0);
 if($cmp610){label=135;break;}else{label=133;break;}
 case 133: 
 var $128=$125;
 var $cmp613=($128>>>0)<($127>>>0);
 if($cmp613){label=135;break;}else{label=134;break;}
 case 134: 
 var $bk620=(($125+12)|0);
 HEAP32[(($bk620)>>2)]=$117;
 HEAP32[(($fd609)>>2)]=$117;
 var $fd622=(($p_0+8)|0);
 var $_c241=$125;
 HEAP32[(($fd622)>>2)]=$_c241;
 var $bk623=(($p_0+12)|0);
 var $T_0_c=$T_0;
 HEAP32[(($bk623)>>2)]=$T_0_c;
 var $parent624=(($p_0+24)|0);
 HEAP32[(($parent624)>>2)]=0;
 label=136;break;
 case 135: 
 _abort();
 throw "Reached an unreachable!";
 case 136: 
 var $129=HEAP32[((512)>>2)];
 var $dec=((($129)-(1))|0);
 HEAP32[((512)>>2)]=$dec;
 var $cmp628=($dec|0)==0;
 if($cmp628){var $sp_0_in_i=936;label=137;break;}else{label=140;break;}
 case 137: 
 var $sp_0_in_i;
 var $sp_0_i=HEAP32[(($sp_0_in_i)>>2)];
 var $cmp_i=($sp_0_i|0)==0;
 var $next4_i=(($sp_0_i+8)|0);
 if($cmp_i){label=138;break;}else{var $sp_0_in_i=$next4_i;label=137;break;}
 case 138: 
 HEAP32[((512)>>2)]=-1;
 label=140;break;
 case 139: 
 _abort();
 throw "Reached an unreachable!";
 case 140: 
 return;
  default: assert(0, "bad label: " + label);
 }
}
Module["_free"] = _free;
function __Znwj($size){
 var label=0;
 label = 1; 
 while(1)switch(label){
 case 1: 
 var $cmp=($size|0)==0;
 var $_size=($cmp?1:$size);
 label=2;break;
 case 2: 
 var $call=_malloc($_size);
 var $cmp1=($call|0)==0;
 if($cmp1){label=3;break;}else{label=10;break;}
 case 3: 
 var $0=(tempValue=HEAP32[((952)>>2)],HEAP32[((952)>>2)]=tempValue+0,tempValue);
 var $tobool=($0|0)==0;
 if($tobool){label=9;break;}else{label=4;break;}
 case 4: 
 var $1=$0;
 (function() { try { __THREW__ = 0; return FUNCTION_TABLE[$1]() } catch(e) { if (typeof e != "number") throw e; if (ABORT) throw e; __THREW__ = 1; return null } })();if (!__THREW__) { label=2;break; } else { label=5;break; }
 case 5: 
 var $lpad_loopexit4$0 = ___cxa_find_matching_catch(-1, -1); var $lpad_loopexit4$1 = tempRet0;
 var $lpad_phi$1=$lpad_loopexit4$1;var $lpad_phi$0=$lpad_loopexit4$0;label=7;break;
 case 6: 
 var $lpad_nonloopexit5$0 = ___cxa_find_matching_catch(-1, -1); var $lpad_nonloopexit5$1 = tempRet0;
 var $lpad_phi$1=$lpad_nonloopexit5$1;var $lpad_phi$0=$lpad_nonloopexit5$0;label=7;break;
 case 7: 
 var $lpad_phi$0;
 var $lpad_phi$1;
 var $2=$lpad_phi$1;
 var $ehspec_fails=($2|0)<0;
 if($ehspec_fails){label=8;break;}else{label=11;break;}
 case 8: 
 var $3=$lpad_phi$0;
 ___cxa_call_unexpected($3);
 throw "Reached an unreachable!";
 case 9: 
 var $exception=___cxa_allocate_exception(4);
 var $4=$exception;
 HEAP32[(($4)>>2)]=40;
 (function() { try { __THREW__ = 0; return ___cxa_throw($exception,368,(28)) } catch(e) { if (typeof e != "number") throw e; if (ABORT) throw e; __THREW__ = 1; return null } })();if (!__THREW__) { label=12;break; } else { label=6;break; }
 case 10: 
 return $call;
 case 11: 
 ___resumeException($lpad_phi$0)
 case 12: 
 throw "Reached an unreachable!";
  default: assert(0, "bad label: " + label);
 }
}
function __ZdlPv($ptr){
 var label=0;
 label = 1; 
 while(1)switch(label){
 case 1: 
 var $tobool=($ptr|0)==0;
 if($tobool){label=3;break;}else{label=2;break;}
 case 2: 
 _free($ptr);
 label=3;break;
 case 3: 
 return;
  default: assert(0, "bad label: " + label);
 }
}
function __ZNSt9bad_allocD0Ev($this){
 var label=0;
 var $0=$this;
 __ZdlPv($0);
 return;
}
function __ZNSt9bad_allocD2Ev($this){
 var label=0;
 return;
}
function __ZNKSt9bad_alloc4whatEv($this){
 var label=0;
 return 8;
}
// EMSCRIPTEN_END_FUNCS
// EMSCRIPTEN_END_FUNCS
// Warning: printing of i64 values may be slightly rounded! No deep i64 math used, so precise i64 code not included
var i64Math = null;
// === Auto-generated postamble setup entry stuff ===
if (memoryInitializer) {
  function applyData(data) {
    HEAPU8.set(data, STATIC_BASE);
  }
  if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
    applyData(Module['readBinary'](memoryInitializer));
  } else {
    addRunDependency('memory initializer');
    Browser.asyncLoad(memoryInitializer, function(data) {
      applyData(data);
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
  if (ENVIRONMENT_IS_WEB && preloadStartTime !== null) {
    Module.printErr('preload time: ' + (Date.now() - preloadStartTime) + ' ms');
  }
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
  if (runDependencies > 0) {
    // a preRun added a dependency, run will be called later
    return;
  }
  function doRun() {
    ensureInitRuntime();
    preMain();
    Module['calledRun'] = true;
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
  throw 'abort() at ' + stackTrace();
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
//@ sourceMappingURL=faust-noise-temp.js.map/*global webkitAudioContext, Module, HEAPF32*/

// Adapted From https://gist.github.com/camupod/5640386

var faust = faust || {};

(function () {

    // This should be made to only make a new context if one does not exist
    if (!faust.context)
    {
      faust.context = new webkitAudioContext();
    }

    var NOISE_constructor = Module.cwrap('NOISE_constructor', 'number', 'number');
    var NOISE_destructor = Module.cwrap('NOISE_destructor', null, ['number']);
    var NOISE_compute = Module.cwrap('NOISE_compute', ['number'], ['number', 'number', 'number', 'number']);
    var NOISE_getNumInputs = Module.cwrap('NOISE_getNumInputs', 'number', []);
    var NOISE_getNumOutputs = Module.cwrap('NOISE_getNumOutputs', 'number', []);

    faust.noise = function () {
        var that = {};

        that.ptr = NOISE_constructor(faust.context.sampleRate);

        // Bind to C++ Member Functions

        that.getNumInputs = function () {
            return NOISE_getNumInputs(that.ptr);
        };

        that.getNumOutputs = function () {
            return NOISE_getNumOutputs(that.ptr);
        };
        
        that.compute = function (e) {
            var noiseOutChans = HEAP32.subarray(that.outs>>2, (that.outs+that.numOut*that.ptrsize)>>2);
            var noiseInChans = HEAP32.subarray(that.ins>>2, (that.ins+that.ins*that.ptrsize)>>2);
            
            for (var i = 0; i < that.numIn; i++)
            {
              var input = e.inputBuffer.getChannelData(i);
              var noiseInput = HEAPF32.subarray(noiseInChans[i]>>2, (noiseInChans[i]+that.vectorsize*that.ptrsize)>>2);
              
              for (var j = 0; j < input.length; j++) {
                  noiseInput[j] = input[j];
              }
            }
            
            NOISE_compute(that.ptr, that.vectorsize, that.ins, that.outs);
            
            for (var i = 0; i < that.numOut; i++)
            {
              var output = e.outputBuffer.getChannelData(i);
              var noiseOutput = HEAPF32.subarray(noiseOutChans[i]>>2, (noiseOutChans[i]+that.vectorsize*that.ptrsize)>>2);
              
              for (var j = 0; j < output.length; j++) {
                  output[j] = noiseOutput[j];
              }
            }
        };

        that.destroy = function () {
            NOISE_destructor(that.ptr);
        };
        
        // Connect to another node
        that.connect = function (node) {
          that.jsNode.connect(node);
        }

        // Bind to Web Audio

        that.play = function () {
            that.jsNode.connect(faust.context.destination);
        };

        that.pause = function () {
            that.jsNode.disconnect(faust.context.destination);
        };

        that.init = function () {
            that.ptrsize = 4; //assuming poitner in emscripten are 32bits
            that.vectorsize = 2048;
            that.samplesize = 4;
            that.numIn = that.getNumInputs();
            that.numOut = that.getNumOutputs();
            
            that.jsNode = faust.context.createJavaScriptNode(that.vectorsize, that.numIn, that.numOut);
            that.jsNode.onaudioprocess = that.compute;
            
            that.ins = Module._malloc(that.ptrsize*that.numIn);
            
            for (i=0;i<that.numIn;i++) { // assing to our array of pointer elements an array of 32bit floats, one for each channel. currently we assume pointers are 32bits
              HEAP32[(that.ins>>2)+i] = Module._malloc(that.vectorsize * that.samplesize); // assign memory at that.ins[i] to a new ptr value. maybe there's an easier way, but this is clearer to me than any typedarray magic beyond the presumably TypedArray HEAP32
            }
            
            that.outs = Module._malloc(that.ptrsize*that.numOut); //ptrsize, change to eight or use Runtime.QUANTUM? or what?             
            for (i=0;i<that.numOut;i++) { // assing to our array of pointer elements an array of 64bit floats, one for each channel. currently we assume pointers are 32bits
              HEAP32[(that.outs>>2)+i] = Module._malloc(that.vectorsize * that.samplesize); // assign memory at that.ins[i] to a new ptr value. maybe there's an easier way, but this is clearer to me than any typedarray magic beyond the presumably TypedArray HEAP32
            }
        };

        that.init();

        return that;
    };
}());
