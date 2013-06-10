// Note: Some Emscripten settings will significantly limit the speed of the generated code.
// Note: Some Emscripten settings may limit the speed of the generated code.
try {
  this['Module'] = Module;
} catch(e) {
  this['Module'] = Module = {};
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
  Module['print'] = function(x) {
    process['stdout'].write(x + '\n');
  };
  Module['printErr'] = function(x) {
    process['stderr'].write(x + '\n');
  };
  var nodeFS = require('fs');
  var nodePath = require('path');
  Module['read'] = function(filename, binary) {
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
  Module['readBinary'] = function(filename) { return Module['read'](filename, true) };
  Module['load'] = function(f) {
    globalEval(read(f));
  };
  if (!Module['arguments']) {
    Module['arguments'] = process['argv'].slice(2);
  }
}
if (ENVIRONMENT_IS_SHELL) {
  Module['print'] = print;
  if (typeof printErr != 'undefined') Module['printErr'] = printErr; // not present in v8 or older sm
  Module['read'] = read;
  Module['readBinary'] = function(f) {
    return read(f, 'binary');
  };
  if (!Module['arguments']) {
    if (typeof scriptArgs != 'undefined') {
      Module['arguments'] = scriptArgs;
    } else if (typeof arguments != 'undefined') {
      Module['arguments'] = arguments;
    }
  }
}
if (ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER) {
  if (!Module['print']) {
    Module['print'] = function(x) {
      console.log(x);
    };
  }
  if (!Module['printErr']) {
    Module['printErr'] = function(x) {
      console.log(x);
    };
  }
}
if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  Module['read'] = function(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    return xhr.responseText;
  };
  if (!Module['arguments']) {
    if (typeof arguments != 'undefined') {
      Module['arguments'] = arguments;
    }
  }
}
if (ENVIRONMENT_IS_WORKER) {
  // We can do very little here...
  var TRY_USE_DUMP = false;
  if (!Module['print']) {
    Module['print'] = (TRY_USE_DUMP && (typeof(dump) !== "undefined") ? (function(x) {
      dump(x);
    }) : (function(x) {
      // self.postMessage(x); // enable this if you want stdout to be sent as messages
    }));
  }
  Module['load'] = importScripts;
}
if (!ENVIRONMENT_IS_WORKER && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_SHELL) {
  // Unreachable because SHELL is dependant on the others
  throw 'Unknown runtime environment. Where are we?';
}
function globalEval(x) {
  eval.call(null, x);
}
if (!Module['load'] == 'undefined' && Module['read']) {
  Module['load'] = function(f) {
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
if (!Module['preRun']) Module['preRun'] = [];
if (!Module['postRun']) Module['postRun'] = [];
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
      var logg = log2(quantum);
      return '((((' +target + ')+' + (quantum-1) + ')>>' + logg + ')<<' + logg + ')';
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
  if (/^\[\d+\ x\ (.*)\]/.test(type)) return true; // [15 x ?] blocks. Like structs
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
  getNativeTypeSize: function (type, quantumSize) {
    if (Runtime.QUANTUM_SIZE == 1) return 1;
    var size = {
      '%i1': 1,
      '%i8': 1,
      '%i16': 2,
      '%i32': 4,
      '%i64': 8,
      "%float": 4,
      "%double": 8
    }['%'+type]; // add '%' since float and double confuse Closure compiler as keys, and also spidermonkey as a compiler will remove 's from '_i8' etc
    if (!size) {
      if (type.charAt(type.length-1) == '*') {
        size = Runtime.QUANTUM_SIZE; // A pointer
      } else if (type[0] == 'i') {
        var bits = parseInt(type.substr(1));
        assert(bits % 8 == 0);
        size = bits/8;
      }
    }
    return size;
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
  STACK_ALIGN: 4,
  getAlignSize: function (type, size, vararg) {
    // we align i64s and doubles on 64-bit boundaries, unlike x86
    return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE);
  },
  calculateStructAlignment: function calculateStructAlignment(type) {
    type.flatSize = 0;
    type.alignSize = 0;
    var diffs = [];
    var prev = -1;
    type.flatIndexes = type.fields.map(function(field) {
      var size, alignSize;
      if (Runtime.isNumberType(field) || Runtime.isPointerType(field)) {
        size = Runtime.getNativeTypeSize(field); // pack char; char; in structs, also char[X]s.
        alignSize = Runtime.getAlignSize(field, size);
      } else if (Runtime.isStructType(field)) {
        size = Types.types[field].flatSize;
        alignSize = Runtime.getAlignSize(null, Types.types[field].alignSize);
      } else if (field[0] == 'b') {
        // bN, large number field, like a [N x i8]
        size = field.substr(1)|0;
        alignSize = 1;
      } else {
        throw 'Unclear type in struct: ' + field + ', in ' + type.name_ + ' :: ' + dump(Types.types[type.name_]);
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
    table.push(func);
    table.push(0);
    return ret;
  },
  removeFunction: function (index) {
    var table = FUNCTION_TABLE;
    table[index] = null;
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
      Runtime.funcWrappers[func] = function() {
        return Runtime.dynCall(sig, func, arguments);
      };
    }
    return Runtime.funcWrappers[func];
  },
  UTF8Processor: function () {
    var buffer = [];
    var needed = 0;
    this.processCChar = function (code) {
      code = code & 0xff;
      if (needed) {
        buffer.push(code);
        needed--;
      }
      if (buffer.length == 0) {
        if (code < 128) return String.fromCharCode(code);
        buffer.push(code);
        if (code > 191 && code < 224) {
          needed = 1;
        } else {
          needed = 2;
        }
        return '';
      }
      if (needed > 0) return '';
      var c1 = buffer[0];
      var c2 = buffer[1];
      var c3 = buffer[2];
      var ret;
      if (c1 > 191 && c1 < 224) {
        ret = String.fromCharCode(((c1 & 31) << 6) | (c2 & 63));
      } else {
        ret = String.fromCharCode(((c1 & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
      }
      buffer.length = 0;
      return ret;
    }
    this.processJSString = function(string) {
      string = unescape(encodeURIComponent(string));
      var ret = [];
      for (var i = 0; i < string.length; i++) {
        ret.push(string.charCodeAt(i));
      }
      return ret;
    }
  },
  stackAlloc: function (size) { var ret = STACKTOP;STACKTOP = (STACKTOP + size)|0;STACKTOP = ((((STACKTOP)+3)>>2)<<2);assert((STACKTOP|0) < (STACK_MAX|0)); return ret; },
  staticAlloc: function (size) { var ret = STATICTOP;STATICTOP = (STATICTOP + size)|0;STATICTOP = ((((STATICTOP)+3)>>2)<<2); if (STATICTOP >= TOTAL_MEMORY) enlargeMemory();; return ret; },
  alignMemory: function (size,quantum) { var ret = size = Math.ceil((size)/(quantum ? quantum : 4))*(quantum ? quantum : 4); return ret; },
  makeBigInt: function (low,high,unsigned) { var ret = (unsigned ? (((low)>>>(0))+(((high)>>>(0))*4294967296)) : (((low)>>>(0))+(((high)|(0))*4294967296))); return ret; },
  QUANTUM_SIZE: 4,
  __dummy__: 0
}
//========================================
// Runtime essentials
//========================================
var __THREW__ = 0; // Used in checking for thrown exceptions.
var setjmpId = 1; // Used in setjmp/longjmp
var setjmpLabels = {};
var ABORT = false;
var undef = 0;
// tempInt is used for 32-bit signed values or smaller. tempBigInt is used
// for 32-bit unsigned values or more than 32 bits. TODO: audit all uses of tempInt
var tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD;
var tempI64, tempI64b;
var tempRet0, tempRet1, tempRet2, tempRet3, tempRet4, tempRet5, tempRet6, tempRet7, tempRet8, tempRet9;
function abort(text) {
  Module.print(text + ':\n' + (new Error).stack);
  ABORT = true;
  throw "Assertion: " + text;
}
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
//                   'array' for JavaScript arrays and typed arrays).
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
    var func = globalScope['Module']['_' + ident]; // closure exported function
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
      if (!stack) stack = Runtime.stackSave();
      var ret = Runtime.stackAlloc(value.length+1);
      writeStringToMemory(value, ret);
      return ret;
    } else if (type == 'array') {
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
      case 'i64': (tempI64 = [value>>>0,Math.min(Math.floor((value)/4294967296), 4294967295)>>>0],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': (HEAPF64[(tempDoublePtr)>>3]=value,HEAP32[((ptr)>>2)]=HEAP32[((tempDoublePtr)>>2)],HEAP32[(((ptr)+(4))>>2)]=HEAP32[(((tempDoublePtr)+(4))>>2)]); break;
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
      case 'double': return (HEAP32[((tempDoublePtr)>>2)]=HEAP32[((ptr)>>2)],HEAP32[(((tempDoublePtr)+(4))>>2)]=HEAP32[(((ptr)+(4))>>2)],HEAPF64[(tempDoublePtr)>>3]);
      default: abort('invalid type for setValue: ' + type);
    }
  return null;
}
Module['getValue'] = getValue;
var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_STATIC = 2; // Cannot be freed
var ALLOC_NONE = 3; // Do not allocate
Module['ALLOC_NORMAL'] = ALLOC_NORMAL;
Module['ALLOC_STACK'] = ALLOC_STACK;
Module['ALLOC_STATIC'] = ALLOC_STATIC;
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
    ret = [_malloc, Runtime.stackAlloc, Runtime.staticAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
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
    HEAPU8.set(new Uint8Array(slab), ret);
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
    assert(ptr + i < TOTAL_MEMORY);
    t = HEAPU8[(((ptr)+(i))|0)];
    ret += utf8.processCChar(t);
  }
  return ret;
}
Module['Pointer_stringify'] = Pointer_stringify;
// Memory management
var PAGE_SIZE = 4096;
function alignMemoryPage(x) {
  return ((x+4095)>>12)<<12;
}
var HEAP;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
var STACK_ROOT, STACKTOP, STACK_MAX;
var STATICTOP;
function enlargeMemory() {
  abort('Cannot enlarge memory arrays. Either (1) compile with -s TOTAL_MEMORY=X with X higher than the current value, (2) compile with ALLOW_MEMORY_GROWTH which adjusts the size at runtime but prevents some optimizations, or (3) set Module.TOTAL_MEMORY before the program runs.');
}
var TOTAL_STACK = Module['TOTAL_STACK'] || 5242880;
var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 16777216;
var FAST_MEMORY = Module['FAST_MEMORY'] || 2097152;
// Initialize the runtime's memory
// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(!!Int32Array && !!Float64Array && !!(new Int32Array(1)['subarray']) && !!(new Int32Array(1)['set']),
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
STACK_ROOT = STACKTOP = Runtime.alignMemory(1);
STACK_MAX = TOTAL_STACK; // we lose a little stack here, but TOTAL_STACK is nice and round so use that as the max
var tempDoublePtr = Runtime.alignMemory(allocate(12, 'i8', ALLOC_STACK), 8);
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
STATICTOP = STACK_MAX;
assert(STATICTOP < TOTAL_MEMORY); // Stack must fit in TOTAL_MEMORY; allocations from here on may enlarge TOTAL_MEMORY
var nullString = allocate(intArrayFromString('(null)'), 'i8', ALLOC_STACK);
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
var __ATINIT__ = []; // functions called during startup
var __ATMAIN__ = []; // functions called when main() is to be run
var __ATEXIT__ = []; // functions called during shutdown
var runtimeInitialized = false;
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
    HEAP8[(((buffer)+(i))|0)]=chr
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
if (!Math.imul) Math.imul = function(a, b) {
  var ah  = a >>> 16;
  var al = a & 0xffff;
  var bh  = b >>> 16;
  var bl = b & 0xffff;
  return (al*bl + ((ah*bl + al*bh) << 16))|0;
};
// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// PRE_RUN_ADDITIONS (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyTracking = {};
var calledInit = false, calledRun = false;
var runDependencyWatcher = null;
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
      }, 6000);
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
    // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
    if (!calledRun && shouldRunNow) run();
  }
}
Module['removeRunDependency'] = removeRunDependency;
Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data
function addPreRun(func) {
  if (!Module['preRun']) Module['preRun'] = [];
  else if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
  Module['preRun'].push(func);
}
var awaitingMemoryInitializer = false;
function loadMemoryInitializer(filename) {
  function applyData(data) {
    HEAPU8.set(data, TOTAL_STACK);
    runPostSets();
  }
  // always do this asynchronously, to keep shell and web as similar as possible
  addPreRun(function() {
    if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
      applyData(Module['readBinary'](filename));
    } else {
      Browser.asyncLoad(filename, function(data) {
        applyData(data);
      }, function(data) {
        throw 'could not load memory initializer ' + filename;
      });
    }
  });
  awaitingMemoryInitializer = false;
}
// === Body ===
assert(STATICTOP == STACK_MAX); assert(STACK_MAX == TOTAL_STACK);
STATICTOP += 892;
assert(STATICTOP < TOTAL_MEMORY);
var __ZTVSt9exception;
var __ZTVN10__cxxabiv120__si_class_type_infoE;
var __ZTVN10__cxxabiv117__class_type_infoE;
var __ZTISt9exception;
var __ZN10__cxxabiv117__class_type_infoD1Ev;
var __ZN10__cxxabiv117__class_type_infoD2Ev;
var __ZN10__cxxabiv120__si_class_type_infoD1Ev;
var __ZN10__cxxabiv120__si_class_type_infoD2Ev;
var __ZNSt9bad_allocC1Ev;
var __ZNSt9bad_allocD1Ev;
__ZTVN10__cxxabiv120__si_class_type_infoE=allocate([0,0,0,0,64,3,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_STATIC);
__ZTVN10__cxxabiv117__class_type_infoE=allocate([0,0,0,0,76,3,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_STATIC);
/* memory initializer */ allocate([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,115,116,100,58,58,98,97,100,95,97,108,108,111,99,0,0,110,111,105,115,101,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,52,3,80,0,50,0,0,0,16,0,0,0,26,0,0,0,0,0,0,0,0,0,0,0,100,3,80,0,8,0,0,0,60,0,0,0,48,0,0,0,30,0,0,0,32,0,0,0,6,0,0,0,24,0,0,0,42,0,0,0,40,0,0,0,64,0,0,0,0,0,0,0,0,0,0,0,112,3,80,0,4,0,0,0,20,0,0,0,66,0,0,0,66,0,0,0,66,0,0,0,66,0,0,0,66,0,0,0,0,0,0,0,83,116,57,116,121,112,101,95,105,110,102,111,0,0,0,0,83,116,57,98,97,100,95,97,108,108,111,99,0,0,0,0,78,49,48,95,95,99,120,120,97,98,105,118,49,50,48,95,95,115,105,95,99,108,97,115,115,95,116,121,112,101,95,105,110,102,111,69,0,0,0,0,78,49,48,95,95,99,120,120,97,98,105,118,49,49,55,95,95,99,108,97,115,115,95,116,121,112,101,95,105,110,102,111,69,0,0,0,78,49,48,95,95,99,120,120,97,98,105,118,49,49,54,95,95,115,104,105,109,95,116,121,112,101,95,105,110,102,111,69,0,0,0,0,53,78,111,105,115,101,0,0,51,100,115,112,0,0,0,0,0,0,0,0,140,2,80,0,0,0,0,0,156,2,80,0,0,0,0,0,0,0,0,0,172,2,80,0,76,3,80,0,0,0,0,0,212,2,80,0,88,3,80,0,0,0,0,0,248,2,80,0,44,3,80,0,0,0,0,0,28,3,80,0,112,3,80,0,0,0,0,0,36,3,80,0,0,0,0,0], "i8", ALLOC_NONE, TOTAL_STACK)
function runPostSets() {
HEAP32[(((__ZTVN10__cxxabiv120__si_class_type_infoE)+(8))>>2)]=(54);
HEAP32[(((__ZTVN10__cxxabiv120__si_class_type_infoE)+(12))>>2)]=(58);
HEAP32[(((__ZTVN10__cxxabiv120__si_class_type_infoE)+(16))>>2)]=(44);
HEAP32[(((__ZTVN10__cxxabiv120__si_class_type_infoE)+(20))>>2)]=(62);
HEAP32[(((__ZTVN10__cxxabiv120__si_class_type_infoE)+(24))>>2)]=(36);
HEAP32[(((__ZTVN10__cxxabiv120__si_class_type_infoE)+(28))>>2)]=(38);
HEAP32[(((__ZTVN10__cxxabiv120__si_class_type_infoE)+(32))>>2)]=(28);
HEAP32[(((__ZTVN10__cxxabiv120__si_class_type_infoE)+(36))>>2)]=(68);
HEAP32[(((__ZTVN10__cxxabiv117__class_type_infoE)+(8))>>2)]=(18);
HEAP32[(((__ZTVN10__cxxabiv117__class_type_infoE)+(12))>>2)]=(22);
HEAP32[(((__ZTVN10__cxxabiv117__class_type_infoE)+(16))>>2)]=(44);
HEAP32[(((__ZTVN10__cxxabiv117__class_type_infoE)+(20))>>2)]=(62);
HEAP32[(((__ZTVN10__cxxabiv117__class_type_infoE)+(24))>>2)]=(36);
HEAP32[(((__ZTVN10__cxxabiv117__class_type_infoE)+(28))>>2)]=(10);
HEAP32[(((__ZTVN10__cxxabiv117__class_type_infoE)+(32))>>2)]=(46);
HEAP32[(((__ZTVN10__cxxabiv117__class_type_infoE)+(36))>>2)]=(56);
HEAP32[((5243692)>>2)]=(((__ZTVN10__cxxabiv117__class_type_infoE+8)|0));
HEAP32[((5243700)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5243708)>>2)]=__ZTISt9exception;
HEAP32[((5243712)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5243724)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5243736)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5243748)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((5243760)>>2)]=(((__ZTVN10__cxxabiv117__class_type_infoE+8)|0));
__ZN10__cxxabiv117__class_type_infoD1Ev = 12;
__ZN10__cxxabiv117__class_type_infoD2Ev = (34);
__ZN10__cxxabiv120__si_class_type_infoD1Ev = 2;
__ZN10__cxxabiv120__si_class_type_infoD2Ev = (12);
__ZNSt9bad_allocC1Ev = 14;
__ZNSt9bad_allocD1Ev = 52;
}
if (!awaitingMemoryInitializer) runPostSets();
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
    }var _llvm_memset_p0i8_i32=_memset;
  function ___gxx_personality_v0() {
    }
  function _llvm_umul_with_overflow_i32(x, y) {
      x = x>>>0;
      y = y>>>0;
      return tempRet0 = x*y > 4294967295,(x*y)>>>0;
    }
  function ___cxa_pure_virtual() {
      ABORT = true;
      throw 'Pure virtual function called!';
    }
  function __ZNSt9exceptionD2Ev(){}
  var _llvm_memset_p0i8_i64=_memset;
  var _llvm_expect_i32=undefined;
  function _abort() {
      ABORT = true;
      throw 'abort() at ' + (new Error().stack);
    }
  function ___setErrNo(value) {
      // For convenient setting and returning of errno.
      if (!___setErrNo.ret) ___setErrNo.ret = allocate([0], 'i32', ALLOC_STATIC);
      HEAP32[((___setErrNo.ret)>>2)]=value
      return value;
    }function ___errno_location() {
      return ___setErrNo.ret;
    }var ___errno=___errno_location;
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
  var ERRNO_CODES={E2BIG:7,EACCES:13,EADDRINUSE:98,EADDRNOTAVAIL:99,EAFNOSUPPORT:97,EAGAIN:11,EALREADY:114,EBADF:9,EBADMSG:74,EBUSY:16,ECANCELED:125,ECHILD:10,ECONNABORTED:103,ECONNREFUSED:111,ECONNRESET:104,EDEADLK:35,EDESTADDRREQ:89,EDOM:33,EDQUOT:122,EEXIST:17,EFAULT:14,EFBIG:27,EHOSTUNREACH:113,EIDRM:43,EILSEQ:84,EINPROGRESS:115,EINTR:4,EINVAL:22,EIO:5,EISCONN:106,EISDIR:21,ELOOP:40,EMFILE:24,EMLINK:31,EMSGSIZE:90,EMULTIHOP:72,ENAMETOOLONG:36,ENETDOWN:100,ENETRESET:102,ENETUNREACH:101,ENFILE:23,ENOBUFS:105,ENODATA:61,ENODEV:19,ENOENT:2,ENOEXEC:8,ENOLCK:37,ENOLINK:67,ENOMEM:12,ENOMSG:42,ENOPROTOOPT:92,ENOSPC:28,ENOSR:63,ENOSTR:60,ENOSYS:38,ENOTCONN:107,ENOTDIR:20,ENOTEMPTY:39,ENOTRECOVERABLE:131,ENOTSOCK:88,ENOTSUP:95,ENOTTY:25,ENXIO:6,EOPNOTSUPP:45,EOVERFLOW:75,EOWNERDEAD:130,EPERM:1,EPIPE:32,EPROTO:71,EPROTONOSUPPORT:93,EPROTOTYPE:91,ERANGE:34,EROFS:30,ESPIPE:29,ESRCH:3,ESTALE:116,ETIME:62,ETIMEDOUT:110,ETXTBSY:26,EWOULDBLOCK:11,EXDEV:18};function _sysconf(name) {
      // long sysconf(int name);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/sysconf.html
      switch(name) {
        case 8: return PAGE_SIZE;
        case 54:
        case 56:
        case 21:
        case 61:
        case 63:
        case 22:
        case 67:
        case 23:
        case 24:
        case 25:
        case 26:
        case 27:
        case 69:
        case 28:
        case 101:
        case 70:
        case 71:
        case 29:
        case 30:
        case 199:
        case 75:
        case 76:
        case 32:
        case 43:
        case 44:
        case 80:
        case 46:
        case 47:
        case 45:
        case 48:
        case 49:
        case 42:
        case 82:
        case 33:
        case 7:
        case 108:
        case 109:
        case 107:
        case 112:
        case 119:
        case 121:
          return 200809;
        case 13:
        case 104:
        case 94:
        case 95:
        case 34:
        case 35:
        case 77:
        case 81:
        case 83:
        case 84:
        case 85:
        case 86:
        case 87:
        case 88:
        case 89:
        case 90:
        case 91:
        case 94:
        case 95:
        case 110:
        case 111:
        case 113:
        case 114:
        case 115:
        case 116:
        case 117:
        case 118:
        case 120:
        case 40:
        case 16:
        case 79:
        case 19:
          return -1;
        case 92:
        case 93:
        case 5:
        case 72:
        case 6:
        case 74:
        case 92:
        case 93:
        case 96:
        case 97:
        case 98:
        case 99:
        case 102:
        case 103:
        case 105:
          return 1;
        case 38:
        case 66:
        case 50:
        case 51:
        case 4:
          return 1024;
        case 15:
        case 64:
        case 41:
          return 32;
        case 55:
        case 37:
        case 17:
          return 2147483647;
        case 18:
        case 1:
          return 47839;
        case 59:
        case 57:
          return 99;
        case 68:
        case 58:
          return 2048;
        case 0: return 2097152;
        case 3: return 65536;
        case 14: return 32768;
        case 73: return 32767;
        case 39: return 16384;
        case 60: return 1000;
        case 106: return 700;
        case 52: return 256;
        case 62: return 255;
        case 2: return 100;
        case 65: return 64;
        case 36: return 20;
        case 100: return 16;
        case 20: return 6;
        case 53: return 4;
        case 10: return 1;
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
  function _sbrk(bytes) {
      // Implement a Linux-like 'memory area' for our 'process'.
      // Changes the size of the memory area by |bytes|; returns the
      // address of the previous top ('break') of the memory area
      // We need to make sure no one else allocates unfreeable memory!
      // We must control this entirely. So we don't even need to do
      // unfreeable allocations - the HEAP is ours, from STATICTOP up.
      // TODO: We could in theory slice off the top of the HEAP when
      //       sbrk gets a negative increment in |bytes|...
      var self = _sbrk;
      if (!self.called) {
        STATICTOP = alignMemoryPage(STATICTOP); // make sure we start out aligned
        self.called = true;
        _sbrk.DYNAMIC_START = STATICTOP;
      }
      var ret = STATICTOP;
      if (bytes != 0) Runtime.staticAlloc(bytes);
      return ret;  // Previous break location.
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
  var Browser={mainLoop:{scheduler:null,shouldPause:false,paused:false,queue:[],pause:function () {
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
        if (Browser.initted) return;
        Browser.initted = true;
        try {
          new Blob();
          Browser.hasBlobConstructor = true;
        } catch(e) {
          Browser.hasBlobConstructor = false;
          console.log("warning: no blob constructor, cannot create blobs with mimetypes");
        }
        Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : (typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : (!Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null));
        Browser.URLObject = typeof window != "undefined" ? (window.URL ? window.URL : window.webkitURL) : console.log("warning: cannot create object URLs");
        // Support for plugins that can process preloaded files. You can add more of these to
        // your app by creating and appending to Module.preloadPlugins.
        //
        // Each plugin is asked if it can handle a file based on the file's name. If it can,
        // it is given the file's raw data. When it is done, it calls a callback with the file's
        // (possibly modified) data. For example, a plugin might decompress a file, or it
        // might create some side data structure for use later (like an Image element, etc.).
        function getMimetype(name) {
          return {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'bmp': 'image/bmp',
            'ogg': 'audio/ogg',
            'wav': 'audio/wav',
            'mp3': 'audio/mpeg'
          }[name.substr(name.lastIndexOf('.')+1)];
        }
        if (!Module["preloadPlugins"]) Module["preloadPlugins"] = [];
        var imagePlugin = {};
        imagePlugin['canHandle'] = function(name) {
          return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/.exec(name);
        };
        imagePlugin['handle'] = function(byteArray, name, onload, onerror) {
          var b = null;
          if (Browser.hasBlobConstructor) {
            try {
              b = new Blob([byteArray], { type: getMimetype(name) });
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
          img.onload = function() {
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
          img.onerror = function(event) {
            console.log('Image ' + url + ' could not be decoded');
            if (onerror) onerror();
          };
          img.src = url;
        };
        Module['preloadPlugins'].push(imagePlugin);
        var audioPlugin = {};
        audioPlugin['canHandle'] = function(name) {
          return !Module.noAudioDecoding && name.substr(-4) in { '.ogg': 1, '.wav': 1, '.mp3': 1 };
        };
        audioPlugin['handle'] = function(byteArray, name, onload, onerror) {
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
              var b = new Blob([byteArray], { type: getMimetype(name) });
            } catch(e) {
              return fail();
            }
            var url = Browser.URLObject.createObjectURL(b); // XXX we never revoke this!
            assert(typeof url == 'string', 'createObjectURL must return a url as a string');
            var audio = new Audio();
            audio.addEventListener('canplaythrough', function() { finish(audio) }, false); // use addEventListener due to chromium bug 124926
            audio.onerror = function(event) {
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
            setTimeout(function() {
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
                                 document['webkitExitPointerLock'];
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
      },createContext:function (canvas, useWebGL, setInModule) {
        var ctx;
        try {
          if (useWebGL) {
            ctx = canvas.getContext('experimental-webgl', {
              alpha: false
            });
          } else {
            ctx = canvas.getContext('2d');
          }
          if (!ctx) throw ':(';
        } catch (e) {
          Module.print('Could not create canvas - ' + e);
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
        this.lockPointer = lockPointer;
        this.resizeCanvas = resizeCanvas;
        if (typeof this.lockPointer === 'undefined') this.lockPointer = true;
        if (typeof this.resizeCanvas === 'undefined') this.resizeCanvas = false;
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
        if (!this.fullScreenHandlersInstalled) {
          this.fullScreenHandlersInstalled = true;
          document.addEventListener('fullscreenchange', fullScreenChange, false);
          document.addEventListener('mozfullscreenchange', fullScreenChange, false);
          document.addEventListener('webkitfullscreenchange', fullScreenChange, false);
        }
        canvas.requestFullScreen = canvas['requestFullScreen'] ||
                                   canvas['mozRequestFullScreen'] ||
                                   (canvas['webkitRequestFullScreen'] ? function() { canvas['webkitRequestFullScreen'](Element['ALLOW_KEYBOARD_INPUT']) } : null);
        canvas.requestFullScreen(); 
      },requestAnimationFrame:function (func) {
        if (!window.requestAnimationFrame) {
          window.requestAnimationFrame = window['requestAnimationFrame'] ||
                                         window['mozRequestAnimationFrame'] ||
                                         window['webkitRequestAnimationFrame'] ||
                                         window['msRequestAnimationFrame'] ||
                                         window['oRequestAnimationFrame'] ||
                                         window['setTimeout'];
        }
        window.requestAnimationFrame(func);
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
      },xhrLoad:function (url, onload, onerror) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function() {
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
        var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        flags = flags | 0x00800000; // set SDL_FULLSCREEN flag
        HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        Browser.updateResizeListeners();
      },setWindowedCanvasSize:function () {
        var canvas = Module['canvas'];
        canvas.width = this.windowedWidth;
        canvas.height = this.windowedHeight;
        var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        flags = flags & ~0x00800000; // clear SDL_FULLSCREEN flag
        HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        Browser.updateResizeListeners();
      }};
___setErrNo(0);
_llvm_eh_exception.buf = allocate(12, "void*", ALLOC_STATIC);
Module["requestFullScreen"] = function(lockPointer, resizeCanvas) { Browser.requestFullScreen(lockPointer, resizeCanvas) };
  Module["requestAnimationFrame"] = function(func) { Browser.requestAnimationFrame(func) };
  Module["pauseMainLoop"] = function() { Browser.mainLoop.pause() };
  Module["resumeMainLoop"] = function() { Browser.mainLoop.resume() };
var FUNCTION_TABLE = [0,0,__ZN10__cxxabiv116__shim_type_infoD2Ev,0,__ZN3dspD1Ev,0,__ZN5Noise4initEi,0,__ZN5NoiseD1Ev,0,__ZNK10__cxxabiv117__class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib
,0,__ZN10__cxxabiv116__shim_type_infoD2Ev,0,__ZNSt9bad_allocC2Ev,0,__ZNSt9bad_allocD0Ev,0,__ZN10__cxxabiv116__shim_type_infoD2Ev,0,__ZN3dspD0Ev
,0,__ZN10__cxxabiv117__class_type_infoD0Ev,0,__ZN5Noise7computeEiPPfS1_,0,__ZNKSt9bad_alloc4whatEv,0,__ZNK10__cxxabiv120__si_class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib,0,__ZN5Noise13getNumOutputsEv
,0,__ZN5Noise18buildUserInterfaceEP2UI,0,__ZN10__cxxabiv116__shim_type_infoD2Ev,0,__ZNK10__cxxabiv117__class_type_info9can_catchEPKNS_16__shim_type_infoERPv,0,__ZNK10__cxxabiv120__si_class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib,0,__ZN5Noise13getOutputRateEi
,0,__ZN5Noise12getInputRateEi,0,__ZNK10__cxxabiv116__shim_type_info5noop1Ev,0,__ZNK10__cxxabiv117__class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib,0,__ZN5Noise12getNumInputsEv,0,__ZNSt9bad_allocD2Ev
,0,__ZNSt9bad_allocD2Ev,0,__ZN10__cxxabiv116__shim_type_infoD2Ev,0,__ZNK10__cxxabiv117__class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi,0,__ZN10__cxxabiv120__si_class_type_infoD0Ev,0,__ZN5NoiseD0Ev,0,__ZNK10__cxxabiv116__shim_type_info5noop2Ev,0,__ZN5Noise12instanceInitEi,0,___cxa_pure_virtual,0,__ZNK10__cxxabiv120__si_class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi,0];
// EMSCRIPTEN_START_FUNCS
function __ZN3dspD2Ev($this) {
  var label = 0;
  var $this_addr;
  $this_addr=$this;
  var $this1=$this_addr;
  return;
}
function __ZN5Noise12getNumInputsEv($this) {
  var label = 0;
  var $this_addr;
  $this_addr=$this;
  var $this1=$this_addr;
  return 0;
}
function __ZN5Noise13getNumOutputsEv($this) {
  var label = 0;
  var $this_addr;
  $this_addr=$this;
  var $this1=$this_addr;
  return 1;
}
function __ZN5Noise12getInputRateEi($this, $channel) {
  var label = 0;
  label = 2; 
  while(1) switch(label) {
    case 2: 
      var $this_addr;
      var $channel_addr;
      var $rate;
      $this_addr=$this;
      $channel_addr=$channel;
      var $this1=$this_addr;
      var $0=$channel_addr;
      label = 3; break;
    case 3: 
      $rate=-1;
      label = 4; break;
    case 4: 
      var $1=$rate;
      return $1;
    default: assert(0, "bad label: " + label);
  }
}
function __ZN5Noise13getOutputRateEi($this, $channel) {
  var label = 0;
  label = 2; 
  while(1) switch(label) {
    case 2: 
      var $this_addr;
      var $channel_addr;
      var $rate;
      $this_addr=$this;
      $channel_addr=$channel;
      var $this1=$this_addr;
      var $0=$channel_addr;
      if ((($0)|(0))==0) {
        label = 3; break;
      }
      else {
      label = 4; break;
      }
    case 3: 
      $rate=1;
      label = 5; break;
    case 4: 
      $rate=-1;
      label = 5; break;
    case 5: 
      var $1=$rate;
      return $1;
    default: assert(0, "bad label: " + label);
  }
}
function __ZN5Noise9classInitEi($samplingFreq) {
  var label = 0;
  var $samplingFreq_addr;
  $samplingFreq_addr=$samplingFreq;
  return;
}
function __ZNSt9type_infoD2Ev($this) {
  var label = 0;
  var $this_addr;
  $this_addr=$this;
  var $this1=$this_addr;
  return;
}
function __ZNK10__cxxabiv116__shim_type_info5noop1Ev($this) {
  var label = 0;
  var $this_addr;
  $this_addr=$this;
  var $this1=$this_addr;
  return;
}
function __ZNK10__cxxabiv116__shim_type_info5noop2Ev($this) {
  var label = 0;
  var $this_addr;
  $this_addr=$this;
  var $this1=$this_addr;
  return;
}
function __ZN10__cxxabiv18is_equalEPKSt9type_infoS2_b($x, $y, $0) {
  var label = 0;
  var $x_addr;
  var $y_addr;
  var $_addr;
  $x_addr=$x;
  $y_addr=$y;
  var $frombool=(($0)&(1));
  $_addr=$frombool;
  var $1=$x_addr;
  var $2=$y_addr;
  var $cmp=(($1)|(0))==(($2)|(0));
  return $cmp;
}
function __ZN3dspC2Ev($this) {
  var label = 0;
  var $this_addr;
  $this_addr=$this;
  var $this1=$this_addr;
  var $0=$this1;
  HEAP32[(($0)>>2)]=((5243500)|0);
  return;
}
function __ZN5Noise7computeEiPPfS1_($this, $count, $inputs, $outputs) {
  var label = 0;
  label = 2; 
  while(1) switch(label) {
    case 2: 
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
      label = 3; break;
    case 3: 
      var $2=$i;
      var $3=$count_addr;
      var $cmp=(($2)|(0)) < (($3)|(0));
      if ($cmp) { label = 4; break; } else { label = 6; break; }
    case 4: 
      var $iRec0=(($this1+8)|0);
      var $arrayidx2=(($iRec0+4)|0);
      var $4=HEAP32[(($arrayidx2)>>2)];
      var $mul=Math.imul($4,1103515245);
      var $add=((($mul)+(12345))|0);
      var $iRec03=(($this1+8)|0);
      var $arrayidx4=(($iRec03)|0);
      HEAP32[(($arrayidx4)>>2)]=$add;
      var $iRec05=(($this1+8)|0);
      var $arrayidx6=(($iRec05)|0);
      var $5=HEAP32[(($arrayidx6)>>2)];
      var $conv=(($5)|(0));
      var $mul7=($conv)*(2.3283100447635263e-10);
      var $6=$i;
      var $7=$output0;
      var $arrayidx8=(($7+($6<<2))|0);
      HEAPF32[(($arrayidx8)>>2)]=$mul7;
      var $iRec09=(($this1+8)|0);
      var $arrayidx10=(($iRec09)|0);
      var $8=HEAP32[(($arrayidx10)>>2)];
      var $iRec011=(($this1+8)|0);
      var $arrayidx12=(($iRec011+4)|0);
      HEAP32[(($arrayidx12)>>2)]=$8;
      label = 5; break;
    case 5: 
      var $9=$i;
      var $add13=((($9)+(1))|0);
      $i=$add13;
      label = 3; break;
    case 6: 
      return;
    default: assert(0, "bad label: " + label);
  }
}
function __ZN5Noise12instanceInitEi($this, $samplingFreq) {
  var label = 0;
  label = 2; 
  while(1) switch(label) {
    case 2: 
      var $this_addr;
      var $samplingFreq_addr;
      var $i;
      $this_addr=$this;
      $samplingFreq_addr=$samplingFreq;
      var $this1=$this_addr;
      var $0=$samplingFreq_addr;
      var $1=$this1;
      var $fSamplingFreq=(($1+4)|0);
      HEAP32[(($fSamplingFreq)>>2)]=$0;
      $i=0;
      label = 3; break;
    case 3: 
      var $2=$i;
      var $cmp=(($2)|(0)) < 2;
      if ($cmp) { label = 4; break; } else { label = 6; break; }
    case 4: 
      var $3=$i;
      var $iRec0=(($this1+8)|0);
      var $arrayidx=(($iRec0+($3<<2))|0);
      HEAP32[(($arrayidx)>>2)]=0;
      label = 5; break;
    case 5: 
      var $4=$i;
      var $add=((($4)+(1))|0);
      $i=$add;
      label = 3; break;
    case 6: 
      return;
    default: assert(0, "bad label: " + label);
  }
}
function __ZNK10__cxxabiv117__class_type_info24process_found_base_classEPNS_19__dynamic_cast_infoEPvi($this, $info, $adjustedPtr, $path_below) {
  var label = 0;
  label = 2; 
  while(1) switch(label) {
    case 2: 
      var $this_addr;
      var $info_addr;
      var $adjustedPtr_addr;
      var $path_below_addr;
      $this_addr=$this;
      $info_addr=$info;
      $adjustedPtr_addr=$adjustedPtr;
      $path_below_addr=$path_below;
      var $this1=$this_addr;
      var $0=$info_addr;
      var $dst_ptr_leading_to_static_ptr=(($0+16)|0);
      var $1=HEAP32[(($dst_ptr_leading_to_static_ptr)>>2)];
      var $cmp=(($1)|(0))==0;
      if ($cmp) { label = 3; break; } else { label = 4; break; }
    case 3: 
      var $2=$adjustedPtr_addr;
      var $3=$info_addr;
      var $dst_ptr_leading_to_static_ptr2=(($3+16)|0);
      HEAP32[(($dst_ptr_leading_to_static_ptr2)>>2)]=$2;
      var $4=$path_below_addr;
      var $5=$info_addr;
      var $path_dst_ptr_to_static_ptr=(($5+24)|0);
      HEAP32[(($path_dst_ptr_to_static_ptr)>>2)]=$4;
      var $6=$info_addr;
      var $number_to_static_ptr=(($6+36)|0);
      HEAP32[(($number_to_static_ptr)>>2)]=1;
      label = 10; break;
    case 4: 
      var $7=$info_addr;
      var $dst_ptr_leading_to_static_ptr3=(($7+16)|0);
      var $8=HEAP32[(($dst_ptr_leading_to_static_ptr3)>>2)];
      var $9=$adjustedPtr_addr;
      var $cmp4=(($8)|(0))==(($9)|(0));
      if ($cmp4) { label = 5; break; } else { label = 8; break; }
    case 5: 
      var $10=$info_addr;
      var $path_dst_ptr_to_static_ptr6=(($10+24)|0);
      var $11=HEAP32[(($path_dst_ptr_to_static_ptr6)>>2)];
      var $cmp7=(($11)|(0))==2;
      if ($cmp7) { label = 6; break; } else { label = 7; break; }
    case 6: 
      var $12=$path_below_addr;
      var $13=$info_addr;
      var $path_dst_ptr_to_static_ptr9=(($13+24)|0);
      HEAP32[(($path_dst_ptr_to_static_ptr9)>>2)]=$12;
      label = 7; break;
    case 7: 
      label = 9; break;
    case 8: 
      var $14=$info_addr;
      var $number_to_static_ptr11=(($14+36)|0);
      var $15=HEAP32[(($number_to_static_ptr11)>>2)];
      var $add=((($15)+(1))|0);
      HEAP32[(($number_to_static_ptr11)>>2)]=$add;
      var $16=$info_addr;
      var $path_dst_ptr_to_static_ptr12=(($16+24)|0);
      HEAP32[(($path_dst_ptr_to_static_ptr12)>>2)]=2;
      var $17=$info_addr;
      var $search_done=(($17+54)|0);
      HEAP8[($search_done)]=1;
      label = 9; break;
    case 9: 
      label = 10; break;
    case 10: 
      return;
    default: assert(0, "bad label: " + label);
  }
}
function __ZN5NoiseC1Ev($this) {
  var label = 0;
  var $this_addr;
  $this_addr=$this;
  var $this1=$this_addr;
  __ZN5NoiseC2Ev($this1);
  return;
}
function __ZN5NoiseD1Ev($this) {
  var label = 0;
  var $this_addr;
  $this_addr=$this;
  var $this1=$this_addr;
  __ZN5NoiseD2Ev($this1);
  return;
}
function _NOISE_constructor($samplingFreq, $bufferSize) {
  var label = 0;
  label = 2; 
  while(1) switch(label) {
    case 2: 
      var $samplingFreq_addr;
      var $bufferSize_addr;
      var $n;
      var $exn_slot;
      var $ehselector_slot;
      var $i;
      var $i8;
      $samplingFreq_addr=$samplingFreq;
      $bufferSize_addr=$bufferSize;
      var $call=__Znwj(16);
      var $0=$call;
      var $1=$0;
      HEAP32[(($1)>>2)]=0; HEAP32[((($1)+(4))>>2)]=0; HEAP32[((($1)+(8))>>2)]=0; HEAP32[((($1)+(12))>>2)]=0;
      (function() { try { __THREW__ = 0; return __ZN5NoiseC1Ev($0) } catch(e) { if (typeof e != "number") throw e; if (ABORT) throw e; __THREW__ = 1; return null } })();if (!__THREW__) { label = 3; break; } else { label = 7; break; }
    case 3: 
      $n=$0;
      var $2=$n;
      var $3=$2;
      var $vtable=HEAP32[(($3)>>2)];
      var $vfn=(($vtable+20)|0);
      var $4=HEAP32[(($vfn)>>2)];
      var $5=$samplingFreq_addr;
      FUNCTION_TABLE[$4]($2, $5);
      var $6=$n;
      var $7=$6;
      var $vtable1=HEAP32[(($7)>>2)];
      var $vfn2=(($vtable1+8)|0);
      var $8=HEAP32[(($vfn2)>>2)];
      var $call3=FUNCTION_TABLE[$8]($6);
      HEAP32[((5242884)>>2)]=$call3;
      var $9=$n;
      var $10=$9;
      var $vtable4=HEAP32[(($10)>>2)];
      var $vfn5=(($vtable4+12)|0);
      var $11=HEAP32[(($vfn5)>>2)];
      var $call6=FUNCTION_TABLE[$11]($9);
      HEAP32[((5242880)>>2)]=$call6;
      $i=0;
      label = 4; break;
    case 4: 
      var $12=$i;
      var $13=HEAP32[((5242884)>>2)];
      var $cmp=(($12)|(0)) < (($13)|(0));
      if ($cmp) { label = 5; break; } else { label = 8; break; }
    case 5: 
      var $14=$bufferSize_addr;
      var $15$0=_llvm_umul_with_overflow_i32($14, 4);
      var $15$1=tempRet0;
      var $16=$15$1;
      var $17=$15$0;
      var $18=$16 ? -1 : $17;
      var $call7=__Znaj($18);
      var $19=$call7;
      var $20=$i;
      var $21=HEAP32[((5242916)>>2)];
      var $arrayidx=(($21+($20<<2))|0);
      HEAP32[(($arrayidx)>>2)]=$19;
      label = 6; break;
    case 6: 
      var $22=$i;
      var $inc=((($22)+(1))|0);
      $i=$inc;
      label = 4; break;
    case 7: 
      var $23$0 = ___cxa_find_matching_catch(-1, -1); $23$1 = tempRet0;
      var $24=$23$0;
      $exn_slot=$24;
      var $25=$23$1;
      $ehselector_slot=$25;
      __ZdlPv($call);
      label = 13; break;
    case 8: 
      $i8=0;
      label = 9; break;
    case 9: 
      var $26=$i8;
      var $27=HEAP32[((5242880)>>2)];
      var $cmp10=(($26)|(0)) < (($27)|(0));
      if ($cmp10) { label = 10; break; } else { label = 12; break; }
    case 10: 
      var $28=$bufferSize_addr;
      var $29$0=_llvm_umul_with_overflow_i32($28, 4);
      var $29$1=tempRet0;
      var $30=$29$1;
      var $31=$29$0;
      var $32=$30 ? -1 : $31;
      var $call12=__Znaj($32);
      var $33=$call12;
      var $34=$i8;
      var $35=HEAP32[((5242912)>>2)];
      var $arrayidx13=(($35+($34<<2))|0);
      HEAP32[(($arrayidx13)>>2)]=$33;
      label = 11; break;
    case 11: 
      var $36=$i8;
      var $inc15=((($36)+(1))|0);
      $i8=$inc15;
      label = 9; break;
    case 12: 
      var $37=$n;
      var $38=$37;
      return $38;
    case 13: 
      var $exn=$exn_slot;
      var $sel=$ehselector_slot;
      var $lpad_val$0=$exn;
      var $lpad_val$1=0;
      var $lpad_val17$0=$lpad_val$0;
      var $lpad_val17$1=$sel;
      ___resumeException($lpad_val17$0)
    default: assert(0, "bad label: " + label);
  }
}
Module["_NOISE_constructor"] = _NOISE_constructor;
function _NOISE_compute($n, $count) {
  var label = 0;
  var $n_addr;
  var $count_addr;
  $n_addr=$n;
  $count_addr=$count;
  var $0=$n_addr;
  var $1=$0;
  var $vtable=HEAP32[(($1)>>2)];
  var $vfn=(($vtable+24)|0);
  var $2=HEAP32[(($vfn)>>2)];
  var $3=$count_addr;
  var $4=HEAP32[((5242916)>>2)];
  var $5=HEAP32[((5242912)>>2)];
  FUNCTION_TABLE[$2]($0, $3, $4, $5);
  var $6=HEAP32[((5242912)>>2)];
  var $arrayidx=(($6)|0);
  var $7=HEAP32[(($arrayidx)>>2)];
  return $7;
}
Module["_NOISE_compute"] = _NOISE_compute;
function _NOISE_getNumInputs($n) {
  var label = 0;
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
function _NOISE_getNumOutputs($n) {
  var label = 0;
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
function _NOISE_destructor($n) {
  var label = 0;
  label = 2; 
  while(1) switch(label) {
    case 2: 
      var $n_addr;
      var $i;
      var $i1;
      $n_addr=$n;
      $i=0;
      label = 3; break;
    case 3: 
      var $0=$i;
      var $1=HEAP32[((5242884)>>2)];
      var $cmp=(($0)|(0)) < (($1)|(0));
      if ($cmp) { label = 4; break; } else { label = 8; break; }
    case 4: 
      var $2=$i;
      var $3=HEAP32[((5242916)>>2)];
      var $arrayidx=(($3+($2<<2))|0);
      var $4=HEAP32[(($arrayidx)>>2)];
      var $isnull=(($4)|(0))==0;
      if ($isnull) { label = 6; break; } else { label = 5; break; }
    case 5: 
      var $5=$4;
      __ZdlPv($5);
      label = 6; break;
    case 6: 
      label = 7; break;
    case 7: 
      var $6=$i;
      var $inc=((($6)+(1))|0);
      $i=$inc;
      label = 3; break;
    case 8: 
      $i1=0;
      label = 9; break;
    case 9: 
      var $7=$i1;
      var $8=HEAP32[((5242880)>>2)];
      var $cmp3=(($7)|(0)) < (($8)|(0));
      if ($cmp3) { label = 10; break; } else { label = 14; break; }
    case 10: 
      var $9=$i1;
      var $10=HEAP32[((5242912)>>2)];
      var $arrayidx5=(($10+($9<<2))|0);
      var $11=HEAP32[(($arrayidx5)>>2)];
      var $isnull6=(($11)|(0))==0;
      if ($isnull6) { label = 12; break; } else { label = 11; break; }
    case 11: 
      var $12=$11;
      __ZdlPv($12);
      label = 12; break;
    case 12: 
      label = 13; break;
    case 13: 
      var $13=$i1;
      var $inc10=((($13)+(1))|0);
      $i1=$inc10;
      label = 9; break;
    case 14: 
      var $14=$n_addr;
      var $isnull12=(($14)|(0))==0;
      if ($isnull12) { label = 16; break; } else { label = 15; break; }
    case 15: 
      var $15=$14;
      var $vtable=HEAP32[(($15)>>2)];
      var $vfn=(($vtable+4)|0);
      var $16=HEAP32[(($vfn)>>2)];
      FUNCTION_TABLE[$16]($14);
      label = 16; break;
    case 16: 
      return;
    default: assert(0, "bad label: " + label);
  }
}
Module["_NOISE_destructor"] = _NOISE_destructor;
function __ZN5NoiseD2Ev($this) {
  var label = 0;
  var $this_addr;
  $this_addr=$this;
  var $this1=$this_addr;
  var $0=$this1;
  __ZN3dspD2Ev($0);
  return;
}
function __ZN5NoiseC2Ev($this) {
  var label = 0;
  var $this_addr;
  $this_addr=$this;
  var $this1=$this_addr;
  var $0=$this1;
  __ZN3dspC2Ev($0);
  var $1=$this1;
  HEAP32[(($1)>>2)]=((5243448)|0);
  return;
}
function __ZN5NoiseD0Ev($this) {
  var label = 0;
  label = 2; 
  while(1) switch(label) {
    case 2: 
      var $this_addr;
      var $exn_slot;
      var $ehselector_slot;
      $this_addr=$this;
      var $this1=$this_addr;
      (function() { try { __THREW__ = 0; return __ZN5NoiseD1Ev($this1) } catch(e) { if (typeof e != "number") throw e; if (ABORT) throw e; __THREW__ = 1; return null } })();if (!__THREW__) { label = 3; break; } else { label = 4; break; }
    case 3: 
      var $0=$this1;
      __ZdlPv($0);
      return;
    case 4: 
      var $1$0 = ___cxa_find_matching_catch(-1, -1); $1$1 = tempRet0;
      var $2=$1$0;
      $exn_slot=$2;
      var $3=$1$1;
      $ehselector_slot=$3;
      var $4=$this1;
      __ZdlPv($4);
      label = 5; break;
    case 5: 
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
function __ZN5Noise18buildUserInterfaceEP2UI($this, $interface) {
  var label = 0;
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
  FUNCTION_TABLE[$2]($0, ((5242936)|0));
  var $3=$interface_addr;
  var $4=$3;
  var $vtable2=HEAP32[(($4)>>2)];
  var $vfn3=(($vtable2+20)|0);
  var $5=HEAP32[(($vfn3)>>2)];
  FUNCTION_TABLE[$5]($3);
  return;
}
function __ZN5Noise4initEi($this, $samplingFreq) {
  var label = 0;
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
  FUNCTION_TABLE[$2]($this1, $3);
  return;
}
function __ZN3dspD1Ev($this) {
  var label = 0;
  var $this_addr;
  $this_addr=$this;
  var $this1=$this_addr;
  __ZN3dspD2Ev($this1);
  return;
}
function __ZN3dspD0Ev($this) {
  var label = 0;
  label = 2; 
  while(1) switch(label) {
    case 2: 
      var $this_addr;
      var $exn_slot;
      var $ehselector_slot;
      $this_addr=$this;
      var $this1=$this_addr;
      (function() { try { __THREW__ = 0; return __ZN3dspD1Ev($this1) } catch(e) { if (typeof e != "number") throw e; if (ABORT) throw e; __THREW__ = 1; return null } })();if (!__THREW__) { label = 3; break; } else { label = 4; break; }
    case 3: 
      var $0=$this1;
      __ZdlPv($0);
      return;
    case 4: 
      var $1$0 = ___cxa_find_matching_catch(-1, -1); $1$1 = tempRet0;
      var $2=$1$0;
      $exn_slot=$2;
      var $3=$1$1;
      $ehselector_slot=$3;
      var $4=$this1;
      __ZdlPv($4);
      label = 5; break;
    case 5: 
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
function __ZN10__cxxabiv116__shim_type_infoD2Ev($this) {
  var label = 0;
  var $this_addr;
  $this_addr=$this;
  var $this1=$this_addr;
  var $0=$this1;
  __ZNSt9type_infoD2Ev($0);
  return;
}
function __ZN10__cxxabiv117__class_type_infoD0Ev($this) {
  var label = 0;
  var $this_addr;
  $this_addr=$this;
  var $this1=$this_addr;
  __ZN10__cxxabiv116__shim_type_infoD2Ev($this1);
  var $0=$this1;
  __ZdlPv($0);
  return;
}
function __ZN10__cxxabiv120__si_class_type_infoD0Ev($this) {
  var label = 0;
  var $this_addr;
  $this_addr=$this;
  var $this1=$this_addr;
  __ZN10__cxxabiv116__shim_type_infoD2Ev($this1);
  var $0=$this1;
  __ZdlPv($0);
  return;
}
function __ZNK10__cxxabiv117__class_type_info9can_catchEPKNS_16__shim_type_infoERPv($this, $thrown_type, $adjustedPtr) {
  var label = 0;
  var __stackBase__  = STACKTOP; STACKTOP = (STACKTOP + 56)|0; assert(!(STACKTOP&3)); assert((STACKTOP|0) < (STACK_MAX|0));
  label = 2; 
  while(1) switch(label) {
    case 2: 
      var $retval;
      var $this_addr;
      var $thrown_type_addr;
      var $adjustedPtr_addr;
      var $thrown_class_type;
      var $info=__stackBase__;
      $this_addr=$this;
      $thrown_type_addr=$thrown_type;
      $adjustedPtr_addr=$adjustedPtr;
      var $this1=$this_addr;
      var $0=$this1;
      var $1=$thrown_type_addr;
      var $2=$1;
      var $call=__ZN10__cxxabiv18is_equalEPKSt9type_infoS2_b($0, $2, 0);
      if ($call) { label = 3; break; } else { label = 4; break; }
    case 3: 
      $retval=1;
      label = 12; break;
    case 4: 
      var $3=$thrown_type_addr;
      var $4=(($3)|(0))==0;
      if ($4) { label = 6; break; } else { label = 5; break; }
    case 5: 
      var $5=$3;
      var $6=___dynamic_cast($5, 5243736, 5243724, -1);
      var $7=$6;
      var $8 = $7;label = 7; break;
    case 6: 
      var $8 = 0;label = 7; break;
    case 7: 
      var $8;
      $thrown_class_type=$8;
      var $9=$thrown_class_type;
      var $cmp=(($9)|(0))==0;
      if ($cmp) { label = 8; break; } else { label = 9; break; }
    case 8: 
      $retval=0;
      label = 12; break;
    case 9: 
      var $10=$info;
      _memset($10, 0, 56);
      var $dst_type=(($info)|0);
      var $11=$thrown_class_type;
      HEAP32[(($dst_type)>>2)]=$11;
      var $static_type=(($info+8)|0);
      HEAP32[(($static_type)>>2)]=$this1;
      var $src2dst_offset=(($info+12)|0);
      HEAP32[(($src2dst_offset)>>2)]=-1;
      var $number_of_dst_type=(($info+48)|0);
      HEAP32[(($number_of_dst_type)>>2)]=1;
      var $12=$thrown_class_type;
      var $13=$12;
      var $vtable=HEAP32[(($13)>>2)];
      var $vfn=(($vtable+28)|0);
      var $14=HEAP32[(($vfn)>>2)];
      var $15=$adjustedPtr_addr;
      var $16=HEAP32[(($15)>>2)];
      FUNCTION_TABLE[$14]($12, $info, $16, 1);
      var $path_dst_ptr_to_static_ptr=(($info+24)|0);
      var $17=HEAP32[(($path_dst_ptr_to_static_ptr)>>2)];
      var $cmp4=(($17)|(0))==1;
      if ($cmp4) { label = 10; break; } else { label = 11; break; }
    case 10: 
      var $dst_ptr_leading_to_static_ptr=(($info+16)|0);
      var $18=HEAP32[(($dst_ptr_leading_to_static_ptr)>>2)];
      var $19=$adjustedPtr_addr;
      HEAP32[(($19)>>2)]=$18;
      $retval=1;
      label = 12; break;
    case 11: 
      $retval=0;
      label = 12; break;
    case 12: 
      var $20=$retval;
      STACKTOP = __stackBase__;
      return $20;
    default: assert(0, "bad label: " + label);
  }
}
function __ZNK10__cxxabiv117__class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi($this, $info, $adjustedPtr, $path_below) {
  var label = 0;
  label = 2; 
  while(1) switch(label) {
    case 2: 
      var $this_addr;
      var $info_addr;
      var $adjustedPtr_addr;
      var $path_below_addr;
      $this_addr=$this;
      $info_addr=$info;
      $adjustedPtr_addr=$adjustedPtr;
      $path_below_addr=$path_below;
      var $this1=$this_addr;
      var $0=$this1;
      var $1=$info_addr;
      var $static_type=(($1+8)|0);
      var $2=HEAP32[(($static_type)>>2)];
      var $3=$2;
      var $call=__ZN10__cxxabiv18is_equalEPKSt9type_infoS2_b($0, $3, 0);
      if ($call) { label = 3; break; } else { label = 4; break; }
    case 3: 
      var $4=$info_addr;
      var $5=$adjustedPtr_addr;
      var $6=$path_below_addr;
      __ZNK10__cxxabiv117__class_type_info24process_found_base_classEPNS_19__dynamic_cast_infoEPvi($this1, $4, $5, $6);
      label = 4; break;
    case 4: 
      return;
    default: assert(0, "bad label: " + label);
  }
}
function __ZNK10__cxxabiv120__si_class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi($this, $info, $adjustedPtr, $path_below) {
  var label = 0;
  label = 2; 
  while(1) switch(label) {
    case 2: 
      var $this_addr;
      var $info_addr;
      var $adjustedPtr_addr;
      var $path_below_addr;
      $this_addr=$this;
      $info_addr=$info;
      $adjustedPtr_addr=$adjustedPtr;
      $path_below_addr=$path_below;
      var $this1=$this_addr;
      var $0=$this1;
      var $1=$info_addr;
      var $static_type=(($1+8)|0);
      var $2=HEAP32[(($static_type)>>2)];
      var $3=$2;
      var $call=__ZN10__cxxabiv18is_equalEPKSt9type_infoS2_b($0, $3, 0);
      if ($call) { label = 3; break; } else { label = 4; break; }
    case 3: 
      var $4=$this1;
      var $5=$info_addr;
      var $6=$adjustedPtr_addr;
      var $7=$path_below_addr;
      __ZNK10__cxxabiv117__class_type_info24process_found_base_classEPNS_19__dynamic_cast_infoEPvi($4, $5, $6, $7);
      label = 5; break;
    case 4: 
      var $__base_type=(($this1+8)|0);
      var $8=HEAP32[(($__base_type)>>2)];
      var $9=$8;
      var $vtable=HEAP32[(($9)>>2)];
      var $vfn=(($vtable+28)|0);
      var $10=HEAP32[(($vfn)>>2)];
      var $11=$info_addr;
      var $12=$adjustedPtr_addr;
      var $13=$path_below_addr;
      FUNCTION_TABLE[$10]($8, $11, $12, $13);
      label = 5; break;
    case 5: 
      return;
    default: assert(0, "bad label: " + label);
  }
}
function __ZNK10__cxxabiv117__class_type_info29process_static_type_above_dstEPNS_19__dynamic_cast_infoEPKvS4_i($this, $info, $dst_ptr, $current_ptr, $path_below) {
  var label = 0;
  label = 2; 
  while(1) switch(label) {
    case 2: 
      var $this_addr;
      var $info_addr;
      var $dst_ptr_addr;
      var $current_ptr_addr;
      var $path_below_addr;
      $this_addr=$this;
      $info_addr=$info;
      $dst_ptr_addr=$dst_ptr;
      $current_ptr_addr=$current_ptr;
      $path_below_addr=$path_below;
      var $this1=$this_addr;
      var $0=$info_addr;
      var $found_any_static_type=(($0+53)|0);
      HEAP8[($found_any_static_type)]=1;
      var $1=$current_ptr_addr;
      var $2=$info_addr;
      var $static_ptr=(($2+4)|0);
      var $3=HEAP32[(($static_ptr)>>2)];
      var $cmp=(($1)|(0))==(($3)|(0));
      if ($cmp) { label = 3; break; } else { label = 18; break; }
    case 3: 
      var $4=$info_addr;
      var $found_our_static_ptr=(($4+52)|0);
      HEAP8[($found_our_static_ptr)]=1;
      var $5=$info_addr;
      var $dst_ptr_leading_to_static_ptr=(($5+16)|0);
      var $6=HEAP32[(($dst_ptr_leading_to_static_ptr)>>2)];
      var $cmp2=(($6)|(0))==0;
      if ($cmp2) { label = 4; break; } else { label = 8; break; }
    case 4: 
      var $7=$dst_ptr_addr;
      var $8=$info_addr;
      var $dst_ptr_leading_to_static_ptr4=(($8+16)|0);
      HEAP32[(($dst_ptr_leading_to_static_ptr4)>>2)]=$7;
      var $9=$path_below_addr;
      var $10=$info_addr;
      var $path_dst_ptr_to_static_ptr=(($10+24)|0);
      HEAP32[(($path_dst_ptr_to_static_ptr)>>2)]=$9;
      var $11=$info_addr;
      var $number_to_static_ptr=(($11+36)|0);
      HEAP32[(($number_to_static_ptr)>>2)]=1;
      var $12=$info_addr;
      var $number_of_dst_type=(($12+48)|0);
      var $13=HEAP32[(($number_of_dst_type)>>2)];
      var $cmp5=(($13)|(0))==1;
      if ($cmp5) { label = 5; break; } else { label = 7; break; }
    case 5: 
      var $14=$info_addr;
      var $path_dst_ptr_to_static_ptr6=(($14+24)|0);
      var $15=HEAP32[(($path_dst_ptr_to_static_ptr6)>>2)];
      var $cmp7=(($15)|(0))==1;
      if ($cmp7) { label = 6; break; } else { label = 7; break; }
    case 6: 
      var $16=$info_addr;
      var $search_done=(($16+54)|0);
      HEAP8[($search_done)]=1;
      label = 7; break;
    case 7: 
      label = 17; break;
    case 8: 
      var $17=$info_addr;
      var $dst_ptr_leading_to_static_ptr9=(($17+16)|0);
      var $18=HEAP32[(($dst_ptr_leading_to_static_ptr9)>>2)];
      var $19=$dst_ptr_addr;
      var $cmp10=(($18)|(0))==(($19)|(0));
      if ($cmp10) { label = 9; break; } else { label = 15; break; }
    case 9: 
      var $20=$info_addr;
      var $path_dst_ptr_to_static_ptr12=(($20+24)|0);
      var $21=HEAP32[(($path_dst_ptr_to_static_ptr12)>>2)];
      var $cmp13=(($21)|(0))==2;
      if ($cmp13) { label = 10; break; } else { label = 11; break; }
    case 10: 
      var $22=$path_below_addr;
      var $23=$info_addr;
      var $path_dst_ptr_to_static_ptr15=(($23+24)|0);
      HEAP32[(($path_dst_ptr_to_static_ptr15)>>2)]=$22;
      label = 11; break;
    case 11: 
      var $24=$info_addr;
      var $number_of_dst_type17=(($24+48)|0);
      var $25=HEAP32[(($number_of_dst_type17)>>2)];
      var $cmp18=(($25)|(0))==1;
      if ($cmp18) { label = 12; break; } else { label = 14; break; }
    case 12: 
      var $26=$info_addr;
      var $path_dst_ptr_to_static_ptr20=(($26+24)|0);
      var $27=HEAP32[(($path_dst_ptr_to_static_ptr20)>>2)];
      var $cmp21=(($27)|(0))==1;
      if ($cmp21) { label = 13; break; } else { label = 14; break; }
    case 13: 
      var $28=$info_addr;
      var $search_done23=(($28+54)|0);
      HEAP8[($search_done23)]=1;
      label = 14; break;
    case 14: 
      label = 16; break;
    case 15: 
      var $29=$info_addr;
      var $number_to_static_ptr26=(($29+36)|0);
      var $30=HEAP32[(($number_to_static_ptr26)>>2)];
      var $add=((($30)+(1))|0);
      HEAP32[(($number_to_static_ptr26)>>2)]=$add;
      var $31=$info_addr;
      var $search_done27=(($31+54)|0);
      HEAP8[($search_done27)]=1;
      label = 16; break;
    case 16: 
      label = 17; break;
    case 17: 
      label = 18; break;
    case 18: 
      return;
    default: assert(0, "bad label: " + label);
  }
}
function __ZNK10__cxxabiv117__class_type_info29process_static_type_below_dstEPNS_19__dynamic_cast_infoEPKvi($this, $info, $current_ptr, $path_below) {
  var label = 0;
  label = 2; 
  while(1) switch(label) {
    case 2: 
      var $this_addr;
      var $info_addr;
      var $current_ptr_addr;
      var $path_below_addr;
      $this_addr=$this;
      $info_addr=$info;
      $current_ptr_addr=$current_ptr;
      $path_below_addr=$path_below;
      var $this1=$this_addr;
      var $0=$current_ptr_addr;
      var $1=$info_addr;
      var $static_ptr=(($1+4)|0);
      var $2=HEAP32[(($static_ptr)>>2)];
      var $cmp=(($0)|(0))==(($2)|(0));
      if ($cmp) { label = 3; break; } else { label = 6; break; }
    case 3: 
      var $3=$info_addr;
      var $path_dynamic_ptr_to_static_ptr=(($3+28)|0);
      var $4=HEAP32[(($path_dynamic_ptr_to_static_ptr)>>2)];
      var $cmp2=(($4)|(0))!=1;
      if ($cmp2) { label = 4; break; } else { label = 5; break; }
    case 4: 
      var $5=$path_below_addr;
      var $6=$info_addr;
      var $path_dynamic_ptr_to_static_ptr4=(($6+28)|0);
      HEAP32[(($path_dynamic_ptr_to_static_ptr4)>>2)]=$5;
      label = 5; break;
    case 5: 
      label = 6; break;
    case 6: 
      return;
    default: assert(0, "bad label: " + label);
  }
}
function ___dynamic_cast($static_ptr, $static_type, $dst_type, $src2dst_offset) {
  var label = 0;
  var __stackBase__  = STACKTOP; STACKTOP = (STACKTOP + 56)|0; assert(!(STACKTOP&3)); assert((STACKTOP|0) < (STACK_MAX|0));
  label = 2; 
  while(1) switch(label) {
    case 2: 
      var $static_ptr_addr;
      var $static_type_addr;
      var $dst_type_addr;
      var $src2dst_offset_addr;
      var $vtable;
      var $offset_to_derived;
      var $dynamic_ptr;
      var $dynamic_type;
      var $dst_ptr;
      var $info=__stackBase__;
      $static_ptr_addr=$static_ptr;
      $static_type_addr=$static_type;
      $dst_type_addr=$dst_type;
      $src2dst_offset_addr=$src2dst_offset;
      var $0=$static_ptr_addr;
      var $1=$0;
      var $2=HEAP32[(($1)>>2)];
      $vtable=$2;
      var $3=$vtable;
      var $arrayidx=((($3)-(8))|0);
      var $4=HEAP32[(($arrayidx)>>2)];
      var $5=$4;
      $offset_to_derived=$5;
      var $6=$static_ptr_addr;
      var $7=$offset_to_derived;
      var $add_ptr=(($6+$7)|0);
      $dynamic_ptr=$add_ptr;
      var $8=$vtable;
      var $arrayidx1=((($8)-(4))|0);
      var $9=HEAP32[(($arrayidx1)>>2)];
      var $10=$9;
      $dynamic_type=$10;
      $dst_ptr=0;
      var $dst_type2=(($info)|0);
      var $11=$dst_type_addr;
      HEAP32[(($dst_type2)>>2)]=$11;
      var $static_ptr3=(($info+4)|0);
      var $12=$static_ptr_addr;
      HEAP32[(($static_ptr3)>>2)]=$12;
      var $static_type4=(($info+8)|0);
      var $13=$static_type_addr;
      HEAP32[(($static_type4)>>2)]=$13;
      var $src2dst_offset5=(($info+12)|0);
      var $14=$src2dst_offset_addr;
      HEAP32[(($src2dst_offset5)>>2)]=$14;
      var $dst_ptr_leading_to_static_ptr=(($info+16)|0);
      HEAP32[(($dst_ptr_leading_to_static_ptr)>>2)]=0;
      var $dst_ptr_not_leading_to_static_ptr=(($info+20)|0);
      HEAP32[(($dst_ptr_not_leading_to_static_ptr)>>2)]=0;
      var $path_dst_ptr_to_static_ptr=(($info+24)|0);
      HEAP32[(($path_dst_ptr_to_static_ptr)>>2)]=0;
      var $path_dynamic_ptr_to_static_ptr=(($info+28)|0);
      HEAP32[(($path_dynamic_ptr_to_static_ptr)>>2)]=0;
      var $path_dynamic_ptr_to_dst_ptr=(($info+32)|0);
      HEAP32[(($path_dynamic_ptr_to_dst_ptr)>>2)]=0;
      var $number_to_static_ptr=(($info+36)|0);
      HEAP32[(($number_to_static_ptr)>>2)]=0;
      var $number_to_dst_ptr=(($info+40)|0);
      HEAP32[(($number_to_dst_ptr)>>2)]=0;
      var $is_dst_type_derived_from_static_type=(($info+44)|0);
      HEAP32[(($is_dst_type_derived_from_static_type)>>2)]=0;
      var $number_of_dst_type=(($info+48)|0);
      HEAP32[(($number_of_dst_type)>>2)]=0;
      var $found_our_static_ptr=(($info+52)|0);
      HEAP8[($found_our_static_ptr)]=0;
      var $found_any_static_type=(($info+53)|0);
      HEAP8[($found_any_static_type)]=0;
      var $search_done=(($info+54)|0);
      HEAP8[($search_done)]=0;
      var $15=$dynamic_type;
      var $16=$15;
      var $17=$dst_type_addr;
      var $18=$17;
      var $call=__ZN10__cxxabiv18is_equalEPKSt9type_infoS2_b($16, $18, 0);
      if ($call) { label = 3; break; } else { label = 6; break; }
    case 3: 
      var $number_of_dst_type6=(($info+48)|0);
      HEAP32[(($number_of_dst_type6)>>2)]=1;
      var $19=$dynamic_type;
      var $20=$19;
      var $vtable7=HEAP32[(($20)>>2)];
      var $vfn=(($vtable7+20)|0);
      var $21=HEAP32[(($vfn)>>2)];
      var $22=$dynamic_ptr;
      var $23=$dynamic_ptr;
      FUNCTION_TABLE[$21]($19, $info, $22, $23, 1, 0);
      var $path_dst_ptr_to_static_ptr8=(($info+24)|0);
      var $24=HEAP32[(($path_dst_ptr_to_static_ptr8)>>2)];
      var $cmp=(($24)|(0))==1;
      if ($cmp) { label = 4; break; } else { label = 5; break; }
    case 4: 
      var $25=$dynamic_ptr;
      $dst_ptr=$25;
      label = 5; break;
    case 5: 
      label = 19; break;
    case 6: 
      var $26=$dynamic_type;
      var $27=$26;
      var $vtable10=HEAP32[(($27)>>2)];
      var $vfn11=(($vtable10+24)|0);
      var $28=HEAP32[(($vfn11)>>2)];
      var $29=$dynamic_ptr;
      FUNCTION_TABLE[$28]($26, $info, $29, 1, 0);
      var $number_to_static_ptr12=(($info+36)|0);
      var $30=HEAP32[(($number_to_static_ptr12)>>2)];
      if ((($30)|(0))==0) {
        label = 7; break;
      }
      else if ((($30)|(0))==1) {
        label = 12; break;
      }
      else {
      label = 18; break;
      }
    case 7: 
      var $number_to_dst_ptr13=(($info+40)|0);
      var $31=HEAP32[(($number_to_dst_ptr13)>>2)];
      var $cmp14=(($31)|(0))==1;
      if ($cmp14) { label = 8; break; } else { label = 11; break; }
    case 8: 
      var $path_dynamic_ptr_to_static_ptr15=(($info+28)|0);
      var $32=HEAP32[(($path_dynamic_ptr_to_static_ptr15)>>2)];
      var $cmp16=(($32)|(0))==1;
      if ($cmp16) { label = 9; break; } else { label = 11; break; }
    case 9: 
      var $path_dynamic_ptr_to_dst_ptr18=(($info+32)|0);
      var $33=HEAP32[(($path_dynamic_ptr_to_dst_ptr18)>>2)];
      var $cmp19=(($33)|(0))==1;
      if ($cmp19) { label = 10; break; } else { label = 11; break; }
    case 10: 
      var $dst_ptr_not_leading_to_static_ptr21=(($info+20)|0);
      var $34=HEAP32[(($dst_ptr_not_leading_to_static_ptr21)>>2)];
      $dst_ptr=$34;
      label = 11; break;
    case 11: 
      label = 18; break;
    case 12: 
      var $path_dst_ptr_to_static_ptr24=(($info+24)|0);
      var $35=HEAP32[(($path_dst_ptr_to_static_ptr24)>>2)];
      var $cmp25=(($35)|(0))==1;
      if ($cmp25) { label = 16; break; } else { label = 13; break; }
    case 13: 
      var $number_to_dst_ptr26=(($info+40)|0);
      var $36=HEAP32[(($number_to_dst_ptr26)>>2)];
      var $cmp27=(($36)|(0))==0;
      if ($cmp27) { label = 14; break; } else { label = 17; break; }
    case 14: 
      var $path_dynamic_ptr_to_static_ptr29=(($info+28)|0);
      var $37=HEAP32[(($path_dynamic_ptr_to_static_ptr29)>>2)];
      var $cmp30=(($37)|(0))==1;
      if ($cmp30) { label = 15; break; } else { label = 17; break; }
    case 15: 
      var $path_dynamic_ptr_to_dst_ptr32=(($info+32)|0);
      var $38=HEAP32[(($path_dynamic_ptr_to_dst_ptr32)>>2)];
      var $cmp33=(($38)|(0))==1;
      if ($cmp33) { label = 16; break; } else { label = 17; break; }
    case 16: 
      var $dst_ptr_leading_to_static_ptr35=(($info+16)|0);
      var $39=HEAP32[(($dst_ptr_leading_to_static_ptr35)>>2)];
      $dst_ptr=$39;
      label = 17; break;
    case 17: 
      label = 18; break;
    case 18: 
      label = 19; break;
    case 19: 
      var $40=$dst_ptr;
      STACKTOP = __stackBase__;
      return $40;
    default: assert(0, "bad label: " + label);
  }
}
function __ZNK10__cxxabiv120__si_class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib($this, $info, $current_ptr, $path_below, $use_strcmp) {
  var label = 0;
  label = 2; 
  while(1) switch(label) {
    case 2: 
      var $this_addr;
      var $info_addr;
      var $current_ptr_addr;
      var $path_below_addr;
      var $use_strcmp_addr;
      var $is_dst_type_derived_from_static_type13;
      var $does_dst_type_point_to_our_static_type;
      $this_addr=$this;
      $info_addr=$info;
      $current_ptr_addr=$current_ptr;
      $path_below_addr=$path_below;
      var $frombool=(($use_strcmp)&(1));
      $use_strcmp_addr=$frombool;
      var $this1=$this_addr;
      var $0=$this1;
      var $1=$info_addr;
      var $static_type=(($1+8)|0);
      var $2=HEAP32[(($static_type)>>2)];
      var $3=$2;
      var $4=$use_strcmp_addr;
      var $tobool=(($4) & 1);
      var $call=__ZN10__cxxabiv18is_equalEPKSt9type_infoS2_b($0, $3, $tobool);
      if ($call) { label = 3; break; } else { label = 4; break; }
    case 3: 
      var $5=$this1;
      var $6=$info_addr;
      var $7=$current_ptr_addr;
      var $8=$path_below_addr;
      __ZNK10__cxxabiv117__class_type_info29process_static_type_below_dstEPNS_19__dynamic_cast_infoEPKvi($5, $6, $7, $8);
      label = 28; break;
    case 4: 
      var $9=$this1;
      var $10=$info_addr;
      var $dst_type=(($10)|0);
      var $11=HEAP32[(($dst_type)>>2)];
      var $12=$11;
      var $13=$use_strcmp_addr;
      var $tobool2=(($13) & 1);
      var $call3=__ZN10__cxxabiv18is_equalEPKSt9type_infoS2_b($9, $12, $tobool2);
      if ($call3) { label = 5; break; } else { label = 26; break; }
    case 5: 
      var $14=$current_ptr_addr;
      var $15=$info_addr;
      var $dst_ptr_leading_to_static_ptr=(($15+16)|0);
      var $16=HEAP32[(($dst_ptr_leading_to_static_ptr)>>2)];
      var $cmp=(($14)|(0))==(($16)|(0));
      if ($cmp) { label = 7; break; } else { label = 6; break; }
    case 6: 
      var $17=$current_ptr_addr;
      var $18=$info_addr;
      var $dst_ptr_not_leading_to_static_ptr=(($18+20)|0);
      var $19=HEAP32[(($dst_ptr_not_leading_to_static_ptr)>>2)];
      var $cmp5=(($17)|(0))==(($19)|(0));
      if ($cmp5) { label = 7; break; } else { label = 10; break; }
    case 7: 
      var $20=$path_below_addr;
      var $cmp7=(($20)|(0))==1;
      if ($cmp7) { label = 8; break; } else { label = 9; break; }
    case 8: 
      var $21=$info_addr;
      var $path_dynamic_ptr_to_dst_ptr=(($21+32)|0);
      HEAP32[(($path_dynamic_ptr_to_dst_ptr)>>2)]=1;
      label = 9; break;
    case 9: 
      label = 25; break;
    case 10: 
      var $22=$path_below_addr;
      var $23=$info_addr;
      var $path_dynamic_ptr_to_dst_ptr10=(($23+32)|0);
      HEAP32[(($path_dynamic_ptr_to_dst_ptr10)>>2)]=$22;
      var $24=$info_addr;
      var $is_dst_type_derived_from_static_type=(($24+44)|0);
      var $25=HEAP32[(($is_dst_type_derived_from_static_type)>>2)];
      var $cmp11=(($25)|(0))!=4;
      if ($cmp11) { label = 11; break; } else { label = 24; break; }
    case 11: 
      $is_dst_type_derived_from_static_type13=0;
      $does_dst_type_point_to_our_static_type=0;
      var $26=$info_addr;
      var $found_our_static_ptr=(($26+52)|0);
      HEAP8[($found_our_static_ptr)]=0;
      var $27=$info_addr;
      var $found_any_static_type=(($27+53)|0);
      HEAP8[($found_any_static_type)]=0;
      var $__base_type=(($this1+8)|0);
      var $28=HEAP32[(($__base_type)>>2)];
      var $29=$28;
      var $vtable=HEAP32[(($29)>>2)];
      var $vfn=(($vtable+20)|0);
      var $30=HEAP32[(($vfn)>>2)];
      var $31=$info_addr;
      var $32=$current_ptr_addr;
      var $33=$current_ptr_addr;
      var $34=$use_strcmp_addr;
      var $tobool14=(($34) & 1);
      FUNCTION_TABLE[$30]($28, $31, $32, $33, 1, $tobool14);
      var $35=$info_addr;
      var $found_any_static_type15=(($35+53)|0);
      var $36=HEAP8[($found_any_static_type15)];
      var $tobool16=(($36) & 1);
      if ($tobool16) { label = 12; break; } else { label = 15; break; }
    case 12: 
      $is_dst_type_derived_from_static_type13=1;
      var $37=$info_addr;
      var $found_our_static_ptr18=(($37+52)|0);
      var $38=HEAP8[($found_our_static_ptr18)];
      var $tobool19=(($38) & 1);
      if ($tobool19) { label = 13; break; } else { label = 14; break; }
    case 13: 
      $does_dst_type_point_to_our_static_type=1;
      label = 14; break;
    case 14: 
      label = 15; break;
    case 15: 
      var $39=$does_dst_type_point_to_our_static_type;
      var $tobool23=(($39) & 1);
      if ($tobool23) { label = 20; break; } else { label = 16; break; }
    case 16: 
      var $40=$current_ptr_addr;
      var $41=$info_addr;
      var $dst_ptr_not_leading_to_static_ptr25=(($41+20)|0);
      HEAP32[(($dst_ptr_not_leading_to_static_ptr25)>>2)]=$40;
      var $42=$info_addr;
      var $number_to_dst_ptr=(($42+40)|0);
      var $43=HEAP32[(($number_to_dst_ptr)>>2)];
      var $add=((($43)+(1))|0);
      HEAP32[(($number_to_dst_ptr)>>2)]=$add;
      var $44=$info_addr;
      var $number_to_static_ptr=(($44+36)|0);
      var $45=HEAP32[(($number_to_static_ptr)>>2)];
      var $cmp26=(($45)|(0))==1;
      if ($cmp26) { label = 17; break; } else { label = 19; break; }
    case 17: 
      var $46=$info_addr;
      var $path_dst_ptr_to_static_ptr=(($46+24)|0);
      var $47=HEAP32[(($path_dst_ptr_to_static_ptr)>>2)];
      var $cmp27=(($47)|(0))==2;
      if ($cmp27) { label = 18; break; } else { label = 19; break; }
    case 18: 
      var $48=$info_addr;
      var $search_done=(($48+54)|0);
      HEAP8[($search_done)]=1;
      label = 19; break;
    case 19: 
      label = 20; break;
    case 20: 
      var $49=$is_dst_type_derived_from_static_type13;
      var $tobool31=(($49) & 1);
      if ($tobool31) { label = 21; break; } else { label = 22; break; }
    case 21: 
      var $50=$info_addr;
      var $is_dst_type_derived_from_static_type33=(($50+44)|0);
      HEAP32[(($is_dst_type_derived_from_static_type33)>>2)]=3;
      label = 23; break;
    case 22: 
      var $51=$info_addr;
      var $is_dst_type_derived_from_static_type35=(($51+44)|0);
      HEAP32[(($is_dst_type_derived_from_static_type35)>>2)]=4;
      label = 23; break;
    case 23: 
      label = 24; break;
    case 24: 
      label = 25; break;
    case 25: 
      label = 27; break;
    case 26: 
      var $__base_type40=(($this1+8)|0);
      var $52=HEAP32[(($__base_type40)>>2)];
      var $53=$52;
      var $vtable41=HEAP32[(($53)>>2)];
      var $vfn42=(($vtable41+24)|0);
      var $54=HEAP32[(($vfn42)>>2)];
      var $55=$info_addr;
      var $56=$current_ptr_addr;
      var $57=$path_below_addr;
      var $58=$use_strcmp_addr;
      var $tobool43=(($58) & 1);
      FUNCTION_TABLE[$54]($52, $55, $56, $57, $tobool43);
      label = 27; break;
    case 27: 
      label = 28; break;
    case 28: 
      return;
    default: assert(0, "bad label: " + label);
  }
}
function __ZNK10__cxxabiv117__class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib($this, $info, $current_ptr, $path_below, $use_strcmp) {
  var label = 0;
  label = 2; 
  while(1) switch(label) {
    case 2: 
      var $this_addr;
      var $info_addr;
      var $current_ptr_addr;
      var $path_below_addr;
      var $use_strcmp_addr;
      $this_addr=$this;
      $info_addr=$info;
      $current_ptr_addr=$current_ptr;
      $path_below_addr=$path_below;
      var $frombool=(($use_strcmp)&(1));
      $use_strcmp_addr=$frombool;
      var $this1=$this_addr;
      var $0=$this1;
      var $1=$info_addr;
      var $static_type=(($1+8)|0);
      var $2=HEAP32[(($static_type)>>2)];
      var $3=$2;
      var $4=$use_strcmp_addr;
      var $tobool=(($4) & 1);
      var $call=__ZN10__cxxabiv18is_equalEPKSt9type_infoS2_b($0, $3, $tobool);
      if ($call) { label = 3; break; } else { label = 4; break; }
    case 3: 
      var $5=$info_addr;
      var $6=$current_ptr_addr;
      var $7=$path_below_addr;
      __ZNK10__cxxabiv117__class_type_info29process_static_type_below_dstEPNS_19__dynamic_cast_infoEPKvi($this1, $5, $6, $7);
      label = 16; break;
    case 4: 
      var $8=$this1;
      var $9=$info_addr;
      var $dst_type=(($9)|0);
      var $10=HEAP32[(($dst_type)>>2)];
      var $11=$10;
      var $12=$use_strcmp_addr;
      var $tobool2=(($12) & 1);
      var $call3=__ZN10__cxxabiv18is_equalEPKSt9type_infoS2_b($8, $11, $tobool2);
      if ($call3) { label = 5; break; } else { label = 15; break; }
    case 5: 
      var $13=$current_ptr_addr;
      var $14=$info_addr;
      var $dst_ptr_leading_to_static_ptr=(($14+16)|0);
      var $15=HEAP32[(($dst_ptr_leading_to_static_ptr)>>2)];
      var $cmp=(($13)|(0))==(($15)|(0));
      if ($cmp) { label = 7; break; } else { label = 6; break; }
    case 6: 
      var $16=$current_ptr_addr;
      var $17=$info_addr;
      var $dst_ptr_not_leading_to_static_ptr=(($17+20)|0);
      var $18=HEAP32[(($dst_ptr_not_leading_to_static_ptr)>>2)];
      var $cmp5=(($16)|(0))==(($18)|(0));
      if ($cmp5) { label = 7; break; } else { label = 10; break; }
    case 7: 
      var $19=$path_below_addr;
      var $cmp7=(($19)|(0))==1;
      if ($cmp7) { label = 8; break; } else { label = 9; break; }
    case 8: 
      var $20=$info_addr;
      var $path_dynamic_ptr_to_dst_ptr=(($20+32)|0);
      HEAP32[(($path_dynamic_ptr_to_dst_ptr)>>2)]=1;
      label = 9; break;
    case 9: 
      label = 14; break;
    case 10: 
      var $21=$path_below_addr;
      var $22=$info_addr;
      var $path_dynamic_ptr_to_dst_ptr10=(($22+32)|0);
      HEAP32[(($path_dynamic_ptr_to_dst_ptr10)>>2)]=$21;
      var $23=$current_ptr_addr;
      var $24=$info_addr;
      var $dst_ptr_not_leading_to_static_ptr11=(($24+20)|0);
      HEAP32[(($dst_ptr_not_leading_to_static_ptr11)>>2)]=$23;
      var $25=$info_addr;
      var $number_to_dst_ptr=(($25+40)|0);
      var $26=HEAP32[(($number_to_dst_ptr)>>2)];
      var $add=((($26)+(1))|0);
      HEAP32[(($number_to_dst_ptr)>>2)]=$add;
      var $27=$info_addr;
      var $number_to_static_ptr=(($27+36)|0);
      var $28=HEAP32[(($number_to_static_ptr)>>2)];
      var $cmp12=(($28)|(0))==1;
      if ($cmp12) { label = 11; break; } else { label = 13; break; }
    case 11: 
      var $29=$info_addr;
      var $path_dst_ptr_to_static_ptr=(($29+24)|0);
      var $30=HEAP32[(($path_dst_ptr_to_static_ptr)>>2)];
      var $cmp13=(($30)|(0))==2;
      if ($cmp13) { label = 12; break; } else { label = 13; break; }
    case 12: 
      var $31=$info_addr;
      var $search_done=(($31+54)|0);
      HEAP8[($search_done)]=1;
      label = 13; break;
    case 13: 
      var $32=$info_addr;
      var $is_dst_type_derived_from_static_type=(($32+44)|0);
      HEAP32[(($is_dst_type_derived_from_static_type)>>2)]=4;
      label = 14; break;
    case 14: 
      label = 15; break;
    case 15: 
      label = 16; break;
    case 16: 
      return;
    default: assert(0, "bad label: " + label);
  }
}
function __ZNK10__cxxabiv120__si_class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib($this, $info, $dst_ptr, $current_ptr, $path_below, $use_strcmp) {
  var label = 0;
  label = 2; 
  while(1) switch(label) {
    case 2: 
      var $this_addr;
      var $info_addr;
      var $dst_ptr_addr;
      var $current_ptr_addr;
      var $path_below_addr;
      var $use_strcmp_addr;
      $this_addr=$this;
      $info_addr=$info;
      $dst_ptr_addr=$dst_ptr;
      $current_ptr_addr=$current_ptr;
      $path_below_addr=$path_below;
      var $frombool=(($use_strcmp)&(1));
      $use_strcmp_addr=$frombool;
      var $this1=$this_addr;
      var $0=$this1;
      var $1=$info_addr;
      var $static_type=(($1+8)|0);
      var $2=HEAP32[(($static_type)>>2)];
      var $3=$2;
      var $4=$use_strcmp_addr;
      var $tobool=(($4) & 1);
      var $call=__ZN10__cxxabiv18is_equalEPKSt9type_infoS2_b($0, $3, $tobool);
      if ($call) { label = 3; break; } else { label = 4; break; }
    case 3: 
      var $5=$this1;
      var $6=$info_addr;
      var $7=$dst_ptr_addr;
      var $8=$current_ptr_addr;
      var $9=$path_below_addr;
      __ZNK10__cxxabiv117__class_type_info29process_static_type_above_dstEPNS_19__dynamic_cast_infoEPKvS4_i($5, $6, $7, $8, $9);
      label = 5; break;
    case 4: 
      var $__base_type=(($this1+8)|0);
      var $10=HEAP32[(($__base_type)>>2)];
      var $11=$10;
      var $vtable=HEAP32[(($11)>>2)];
      var $vfn=(($vtable+20)|0);
      var $12=HEAP32[(($vfn)>>2)];
      var $13=$info_addr;
      var $14=$dst_ptr_addr;
      var $15=$current_ptr_addr;
      var $16=$path_below_addr;
      var $17=$use_strcmp_addr;
      var $tobool2=(($17) & 1);
      FUNCTION_TABLE[$12]($10, $13, $14, $15, $16, $tobool2);
      label = 5; break;
    case 5: 
      return;
    default: assert(0, "bad label: " + label);
  }
}
function __ZNK10__cxxabiv117__class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib($this, $info, $dst_ptr, $current_ptr, $path_below, $use_strcmp) {
  var label = 0;
  label = 2; 
  while(1) switch(label) {
    case 2: 
      var $this_addr;
      var $info_addr;
      var $dst_ptr_addr;
      var $current_ptr_addr;
      var $path_below_addr;
      var $use_strcmp_addr;
      $this_addr=$this;
      $info_addr=$info;
      $dst_ptr_addr=$dst_ptr;
      $current_ptr_addr=$current_ptr;
      $path_below_addr=$path_below;
      var $frombool=(($use_strcmp)&(1));
      $use_strcmp_addr=$frombool;
      var $this1=$this_addr;
      var $0=$this1;
      var $1=$info_addr;
      var $static_type=(($1+8)|0);
      var $2=HEAP32[(($static_type)>>2)];
      var $3=$2;
      var $4=$use_strcmp_addr;
      var $tobool=(($4) & 1);
      var $call=__ZN10__cxxabiv18is_equalEPKSt9type_infoS2_b($0, $3, $tobool);
      if ($call) { label = 3; break; } else { label = 4; break; }
    case 3: 
      var $5=$info_addr;
      var $6=$dst_ptr_addr;
      var $7=$current_ptr_addr;
      var $8=$path_below_addr;
      __ZNK10__cxxabiv117__class_type_info29process_static_type_above_dstEPNS_19__dynamic_cast_infoEPKvS4_i($this1, $5, $6, $7, $8);
      label = 4; break;
    case 4: 
      return;
    default: assert(0, "bad label: " + label);
  }
}
function _malloc($bytes) {
  var label = 0;
  label = 2; 
  while(1) switch(label) {
    case 2: 
      var $bytes_addr;
      var $mem;
      var $nb;
      var $idx;
      var $smallbits;
      var $b;
      var $p;
      var $F;
      var $b33;
      var $p34;
      var $r;
      var $rsize;
      var $i;
      var $leftbits;
      var $leastbit;
      var $Y;
      var $K;
      var $N;
      var $F68;
      var $DVS;
      var $DV;
      var $I;
      var $B;
      var $F104;
      var $rsize158;
      var $p160;
      var $r164;
      var $dvs;
      var $rsize186;
      var $p188;
      var $r189;
      $bytes_addr=$bytes;
      var $0=$bytes_addr;
      var $cmp=(($0)>>>(0)) <= 244;
      if ($cmp) { label = 3; break; } else { label = 42; break; }
    case 3: 
      var $1=$bytes_addr;
      var $cmp1=(($1)>>>(0)) < 11;
      if ($cmp1) { label = 4; break; } else { label = 5; break; }
    case 4: 
      var $cond = 16;label = 6; break;
    case 5: 
      var $2=$bytes_addr;
      var $add=((($2)+(4))|0);
      var $add2=((($add)+(7))|0);
      var $and=$add2 & -8;
      var $cond = $and;label = 6; break;
    case 6: 
      var $cond;
      $nb=$cond;
      var $3=$nb;
      var $shr=$3 >>> 3;
      $idx=$shr;
      var $4=HEAP32[((((5242944)|0))>>2)];
      var $5=$idx;
      var $shr3=$4 >>> (($5)>>>(0));
      $smallbits=$shr3;
      var $6=$smallbits;
      var $and4=$6 & 3;
      var $cmp5=(($and4)|(0))!=0;
      if ($cmp5) { label = 7; break; } else { label = 16; break; }
    case 7: 
      var $7=$smallbits;
      var $neg=$7 ^ -1;
      var $and7=$neg & 1;
      var $8=$idx;
      var $add8=((($8)+($and7))|0);
      $idx=$add8;
      var $9=$idx;
      var $shl=$9 << 1;
      var $arrayidx=((((5242984)|0)+($shl<<2))|0);
      var $10=$arrayidx;
      var $11=$10;
      $b=$11;
      var $12=$b;
      var $fd=(($12+8)|0);
      var $13=HEAP32[(($fd)>>2)];
      $p=$13;
      var $14=$p;
      var $fd9=(($14+8)|0);
      var $15=HEAP32[(($fd9)>>2)];
      $F=$15;
      var $16=$b;
      var $17=$F;
      var $cmp10=(($16)|(0))==(($17)|(0));
      if ($cmp10) { label = 8; break; } else { label = 9; break; }
    case 8: 
      var $18=$idx;
      var $shl12=1 << $18;
      var $neg13=$shl12 ^ -1;
      var $19=HEAP32[((((5242944)|0))>>2)];
      var $and14=$19 & $neg13;
      HEAP32[((((5242944)|0))>>2)]=$and14;
      label = 15; break;
    case 9: 
      var $20=$F;
      var $21=$20;
      var $22=HEAP32[((((5242960)|0))>>2)];
      var $cmp15=(($21)>>>(0)) >= (($22)>>>(0));
      if ($cmp15) { label = 10; break; } else { var $26 = 0;label = 11; break; }
    case 10: 
      var $23=$F;
      var $bk=(($23+12)|0);
      var $24=HEAP32[(($bk)>>2)];
      var $25=$p;
      var $cmp16=(($24)|(0))==(($25)|(0));
      var $26 = $cmp16;label = 11; break;
    case 11: 
      var $26;
      var $land_ext=(($26)&(1));
      var $expval=($land_ext);
      var $tobool=(($expval)|(0))!=0;
      if ($tobool) { label = 12; break; } else { label = 13; break; }
    case 12: 
      var $27=$b;
      var $28=$F;
      var $bk18=(($28+12)|0);
      HEAP32[(($bk18)>>2)]=$27;
      var $29=$F;
      var $30=$b;
      var $fd19=(($30+8)|0);
      HEAP32[(($fd19)>>2)]=$29;
      label = 14; break;
    case 13: 
      _abort();
      throw "Reached an unreachable!";
    case 14: 
      label = 15; break;
    case 15: 
      var $31=$idx;
      var $shl22=$31 << 3;
      var $or=$shl22 | 1;
      var $or23=$or | 2;
      var $32=$p;
      var $head=(($32+4)|0);
      HEAP32[(($head)>>2)]=$or23;
      var $33=$p;
      var $34=$33;
      var $35=$idx;
      var $shl24=$35 << 3;
      var $add_ptr=(($34+$shl24)|0);
      var $36=$add_ptr;
      var $head25=(($36+4)|0);
      var $37=HEAP32[(($head25)>>2)];
      var $or26=$37 | 1;
      HEAP32[(($head25)>>2)]=$or26;
      var $38=$p;
      var $39=$38;
      var $add_ptr27=(($39+8)|0);
      $mem=$add_ptr27;
      label = 58; break;
    case 16: 
      var $40=$nb;
      var $41=HEAP32[((((5242952)|0))>>2)];
      var $cmp29=(($40)>>>(0)) > (($41)>>>(0));
      if ($cmp29) { label = 17; break; } else { label = 40; break; }
    case 17: 
      var $42=$smallbits;
      var $cmp31=(($42)|(0))!=0;
      if ($cmp31) { label = 18; break; } else { label = 35; break; }
    case 18: 
      var $43=$smallbits;
      var $44=$idx;
      var $shl35=$43 << $44;
      var $45=$idx;
      var $shl36=1 << $45;
      var $shl37=$shl36 << 1;
      var $46=$idx;
      var $shl38=1 << $46;
      var $shl39=$shl38 << 1;
      var $sub=(((-$shl39))|0);
      var $or40=$shl37 | $sub;
      var $and41=$shl35 & $or40;
      $leftbits=$and41;
      var $47=$leftbits;
      var $48=$leftbits;
      var $sub42=(((-$48))|0);
      var $and43=$47 & $sub42;
      $leastbit=$and43;
      var $49=$leastbit;
      var $sub44=((($49)-(1))|0);
      $Y=$sub44;
      var $50=$Y;
      var $shr45=$50 >>> 12;
      var $and46=$shr45 & 16;
      $K=$and46;
      var $51=$K;
      $N=$51;
      var $52=$K;
      var $53=$Y;
      var $shr47=$53 >>> (($52)>>>(0));
      $Y=$shr47;
      var $54=$Y;
      var $shr48=$54 >>> 5;
      var $and49=$shr48 & 8;
      $K=$and49;
      var $55=$N;
      var $add50=((($55)+($and49))|0);
      $N=$add50;
      var $56=$K;
      var $57=$Y;
      var $shr51=$57 >>> (($56)>>>(0));
      $Y=$shr51;
      var $58=$Y;
      var $shr52=$58 >>> 2;
      var $and53=$shr52 & 4;
      $K=$and53;
      var $59=$N;
      var $add54=((($59)+($and53))|0);
      $N=$add54;
      var $60=$K;
      var $61=$Y;
      var $shr55=$61 >>> (($60)>>>(0));
      $Y=$shr55;
      var $62=$Y;
      var $shr56=$62 >>> 1;
      var $and57=$shr56 & 2;
      $K=$and57;
      var $63=$N;
      var $add58=((($63)+($and57))|0);
      $N=$add58;
      var $64=$K;
      var $65=$Y;
      var $shr59=$65 >>> (($64)>>>(0));
      $Y=$shr59;
      var $66=$Y;
      var $shr60=$66 >>> 1;
      var $and61=$shr60 & 1;
      $K=$and61;
      var $67=$N;
      var $add62=((($67)+($and61))|0);
      $N=$add62;
      var $68=$K;
      var $69=$Y;
      var $shr63=$69 >>> (($68)>>>(0));
      $Y=$shr63;
      var $70=$N;
      var $71=$Y;
      var $add64=((($70)+($71))|0);
      $i=$add64;
      var $72=$i;
      var $shl65=$72 << 1;
      var $arrayidx66=((((5242984)|0)+($shl65<<2))|0);
      var $73=$arrayidx66;
      var $74=$73;
      $b33=$74;
      var $75=$b33;
      var $fd67=(($75+8)|0);
      var $76=HEAP32[(($fd67)>>2)];
      $p34=$76;
      var $77=$p34;
      var $fd69=(($77+8)|0);
      var $78=HEAP32[(($fd69)>>2)];
      $F68=$78;
      var $79=$b33;
      var $80=$F68;
      var $cmp70=(($79)|(0))==(($80)|(0));
      if ($cmp70) { label = 19; break; } else { label = 20; break; }
    case 19: 
      var $81=$i;
      var $shl72=1 << $81;
      var $neg73=$shl72 ^ -1;
      var $82=HEAP32[((((5242944)|0))>>2)];
      var $and74=$82 & $neg73;
      HEAP32[((((5242944)|0))>>2)]=$and74;
      label = 26; break;
    case 20: 
      var $83=$F68;
      var $84=$83;
      var $85=HEAP32[((((5242960)|0))>>2)];
      var $cmp76=(($84)>>>(0)) >= (($85)>>>(0));
      if ($cmp76) { label = 21; break; } else { var $89 = 0;label = 22; break; }
    case 21: 
      var $86=$F68;
      var $bk78=(($86+12)|0);
      var $87=HEAP32[(($bk78)>>2)];
      var $88=$p34;
      var $cmp79=(($87)|(0))==(($88)|(0));
      var $89 = $cmp79;label = 22; break;
    case 22: 
      var $89;
      var $land_ext81=(($89)&(1));
      var $expval82=($land_ext81);
      var $tobool83=(($expval82)|(0))!=0;
      if ($tobool83) { label = 23; break; } else { label = 24; break; }
    case 23: 
      var $90=$b33;
      var $91=$F68;
      var $bk85=(($91+12)|0);
      HEAP32[(($bk85)>>2)]=$90;
      var $92=$F68;
      var $93=$b33;
      var $fd86=(($93+8)|0);
      HEAP32[(($fd86)>>2)]=$92;
      label = 25; break;
    case 24: 
      _abort();
      throw "Reached an unreachable!";
    case 25: 
      label = 26; break;
    case 26: 
      var $94=$i;
      var $shl90=$94 << 3;
      var $95=$nb;
      var $sub91=((($shl90)-($95))|0);
      $rsize=$sub91;
      var $96=$nb;
      var $or92=$96 | 1;
      var $or93=$or92 | 2;
      var $97=$p34;
      var $head94=(($97+4)|0);
      HEAP32[(($head94)>>2)]=$or93;
      var $98=$p34;
      var $99=$98;
      var $100=$nb;
      var $add_ptr95=(($99+$100)|0);
      var $101=$add_ptr95;
      $r=$101;
      var $102=$rsize;
      var $or96=$102 | 1;
      var $103=$r;
      var $head97=(($103+4)|0);
      HEAP32[(($head97)>>2)]=$or96;
      var $104=$rsize;
      var $105=$r;
      var $106=$105;
      var $107=$rsize;
      var $add_ptr98=(($106+$107)|0);
      var $108=$add_ptr98;
      var $prev_foot=(($108)|0);
      HEAP32[(($prev_foot)>>2)]=$104;
      var $109=HEAP32[((((5242952)|0))>>2)];
      $DVS=$109;
      var $110=$DVS;
      var $cmp99=(($110)|(0))!=0;
      if ($cmp99) { label = 27; break; } else { label = 34; break; }
    case 27: 
      var $111=HEAP32[((((5242964)|0))>>2)];
      $DV=$111;
      var $112=$DVS;
      var $shr101=$112 >>> 3;
      $I=$shr101;
      var $113=$I;
      var $shl102=$113 << 1;
      var $arrayidx103=((((5242984)|0)+($shl102<<2))|0);
      var $114=$arrayidx103;
      var $115=$114;
      $B=$115;
      var $116=$B;
      $F104=$116;
      var $117=HEAP32[((((5242944)|0))>>2)];
      var $118=$I;
      var $shl105=1 << $118;
      var $and106=$117 & $shl105;
      var $tobool107=(($and106)|(0))!=0;
      if ($tobool107) { label = 29; break; } else { label = 28; break; }
    case 28: 
      var $119=$I;
      var $shl109=1 << $119;
      var $120=HEAP32[((((5242944)|0))>>2)];
      var $or110=$120 | $shl109;
      HEAP32[((((5242944)|0))>>2)]=$or110;
      label = 33; break;
    case 29: 
      var $121=$B;
      var $fd112=(($121+8)|0);
      var $122=HEAP32[(($fd112)>>2)];
      var $123=$122;
      var $124=HEAP32[((((5242960)|0))>>2)];
      var $cmp113=(($123)>>>(0)) >= (($124)>>>(0));
      var $conv=(($cmp113)&(1));
      var $expval114=($conv);
      var $tobool115=(($expval114)|(0))!=0;
      if ($tobool115) { label = 30; break; } else { label = 31; break; }
    case 30: 
      var $125=$B;
      var $fd117=(($125+8)|0);
      var $126=HEAP32[(($fd117)>>2)];
      $F104=$126;
      label = 32; break;
    case 31: 
      _abort();
      throw "Reached an unreachable!";
    case 32: 
      label = 33; break;
    case 33: 
      var $127=$DV;
      var $128=$B;
      var $fd121=(($128+8)|0);
      HEAP32[(($fd121)>>2)]=$127;
      var $129=$DV;
      var $130=$F104;
      var $bk122=(($130+12)|0);
      HEAP32[(($bk122)>>2)]=$129;
      var $131=$F104;
      var $132=$DV;
      var $fd123=(($132+8)|0);
      HEAP32[(($fd123)>>2)]=$131;
      var $133=$B;
      var $134=$DV;
      var $bk124=(($134+12)|0);
      HEAP32[(($bk124)>>2)]=$133;
      label = 34; break;
    case 34: 
      var $135=$rsize;
      HEAP32[((((5242952)|0))>>2)]=$135;
      var $136=$r;
      HEAP32[((((5242964)|0))>>2)]=$136;
      var $137=$p34;
      var $138=$137;
      var $add_ptr126=(($138+8)|0);
      $mem=$add_ptr126;
      label = 58; break;
    case 35: 
      var $139=HEAP32[((((5242948)|0))>>2)];
      var $cmp128=(($139)|(0))!=0;
      if ($cmp128) { label = 36; break; } else { label = 38; break; }
    case 36: 
      var $140=$nb;
      var $call=_tmalloc_small(5242944, $140);
      $mem=$call;
      var $cmp130=(($call)|(0))!=0;
      if ($cmp130) { label = 37; break; } else { label = 38; break; }
    case 37: 
      label = 58; break;
    case 38: 
      label = 39; break;
    case 39: 
      label = 40; break;
    case 40: 
      label = 41; break;
    case 41: 
      label = 49; break;
    case 42: 
      var $141=$bytes_addr;
      var $cmp138=(($141)>>>(0)) >= 4294967232;
      if ($cmp138) { label = 43; break; } else { label = 44; break; }
    case 43: 
      $nb=-1;
      label = 48; break;
    case 44: 
      var $142=$bytes_addr;
      var $add142=((($142)+(4))|0);
      var $add143=((($add142)+(7))|0);
      var $and144=$add143 & -8;
      $nb=$and144;
      var $143=HEAP32[((((5242948)|0))>>2)];
      var $cmp145=(($143)|(0))!=0;
      if ($cmp145) { label = 45; break; } else { label = 47; break; }
    case 45: 
      var $144=$nb;
      var $call148=_tmalloc_large(5242944, $144);
      $mem=$call148;
      var $cmp149=(($call148)|(0))!=0;
      if ($cmp149) { label = 46; break; } else { label = 47; break; }
    case 46: 
      label = 58; break;
    case 47: 
      label = 48; break;
    case 48: 
      label = 49; break;
    case 49: 
      var $145=$nb;
      var $146=HEAP32[((((5242952)|0))>>2)];
      var $cmp155=(($145)>>>(0)) <= (($146)>>>(0));
      if ($cmp155) { label = 50; break; } else { label = 54; break; }
    case 50: 
      var $147=HEAP32[((((5242952)|0))>>2)];
      var $148=$nb;
      var $sub159=((($147)-($148))|0);
      $rsize158=$sub159;
      var $149=HEAP32[((((5242964)|0))>>2)];
      $p160=$149;
      var $150=$rsize158;
      var $cmp161=(($150)>>>(0)) >= 16;
      if ($cmp161) { label = 51; break; } else { label = 52; break; }
    case 51: 
      var $151=$p160;
      var $152=$151;
      var $153=$nb;
      var $add_ptr165=(($152+$153)|0);
      var $154=$add_ptr165;
      HEAP32[((((5242964)|0))>>2)]=$154;
      $r164=$154;
      var $155=$rsize158;
      HEAP32[((((5242952)|0))>>2)]=$155;
      var $156=$rsize158;
      var $or166=$156 | 1;
      var $157=$r164;
      var $head167=(($157+4)|0);
      HEAP32[(($head167)>>2)]=$or166;
      var $158=$rsize158;
      var $159=$r164;
      var $160=$159;
      var $161=$rsize158;
      var $add_ptr168=(($160+$161)|0);
      var $162=$add_ptr168;
      var $prev_foot169=(($162)|0);
      HEAP32[(($prev_foot169)>>2)]=$158;
      var $163=$nb;
      var $or170=$163 | 1;
      var $or171=$or170 | 2;
      var $164=$p160;
      var $head172=(($164+4)|0);
      HEAP32[(($head172)>>2)]=$or171;
      label = 53; break;
    case 52: 
      var $165=HEAP32[((((5242952)|0))>>2)];
      $dvs=$165;
      HEAP32[((((5242952)|0))>>2)]=0;
      HEAP32[((((5242964)|0))>>2)]=0;
      var $166=$dvs;
      var $or174=$166 | 1;
      var $or175=$or174 | 2;
      var $167=$p160;
      var $head176=(($167+4)|0);
      HEAP32[(($head176)>>2)]=$or175;
      var $168=$p160;
      var $169=$168;
      var $170=$dvs;
      var $add_ptr177=(($169+$170)|0);
      var $171=$add_ptr177;
      var $head178=(($171+4)|0);
      var $172=HEAP32[(($head178)>>2)];
      var $or179=$172 | 1;
      HEAP32[(($head178)>>2)]=$or179;
      label = 53; break;
    case 53: 
      var $173=$p160;
      var $174=$173;
      var $add_ptr181=(($174+8)|0);
      $mem=$add_ptr181;
      label = 58; break;
    case 54: 
      var $175=$nb;
      var $176=HEAP32[((((5242956)|0))>>2)];
      var $cmp183=(($175)>>>(0)) < (($176)>>>(0));
      if ($cmp183) { label = 55; break; } else { label = 56; break; }
    case 55: 
      var $177=$nb;
      var $178=HEAP32[((((5242956)|0))>>2)];
      var $sub187=((($178)-($177))|0);
      HEAP32[((((5242956)|0))>>2)]=$sub187;
      $rsize186=$sub187;
      var $179=HEAP32[((((5242968)|0))>>2)];
      $p188=$179;
      var $180=$p188;
      var $181=$180;
      var $182=$nb;
      var $add_ptr190=(($181+$182)|0);
      var $183=$add_ptr190;
      HEAP32[((((5242968)|0))>>2)]=$183;
      $r189=$183;
      var $184=$rsize186;
      var $or191=$184 | 1;
      var $185=$r189;
      var $head192=(($185+4)|0);
      HEAP32[(($head192)>>2)]=$or191;
      var $186=$nb;
      var $or193=$186 | 1;
      var $or194=$or193 | 2;
      var $187=$p188;
      var $head195=(($187+4)|0);
      HEAP32[(($head195)>>2)]=$or194;
      var $188=$p188;
      var $189=$188;
      var $add_ptr196=(($189+8)|0);
      $mem=$add_ptr196;
      label = 58; break;
    case 56: 
      label = 57; break;
    case 57: 
      var $190=$nb;
      var $call199=_sys_alloc(5242944, $190);
      $mem=$call199;
      label = 58; break;
    case 58: 
      var $191=$mem;
      return $191;
    default: assert(0, "bad label: " + label);
  }
}
function _tmalloc_small($m, $nb) {
  var label = 0;
  label = 2; 
  while(1) switch(label) {
    case 2: 
      var $m_addr;
      var $nb_addr;
      var $t;
      var $v;
      var $rsize;
      var $i;
      var $leastbit;
      var $Y;
      var $K;
      var $N;
      var $trem;
      var $r;
      var $XP;
      var $R;
      var $F;
      var $RP;
      var $CP;
      var $H;
      var $C0;
      var $C1;
      var $DVS;
      var $DV;
      var $I;
      var $B;
      var $F197;
      $m_addr=$m;
      $nb_addr=$nb;
      var $0=$m_addr;
      var $treemap=(($0+4)|0);
      var $1=HEAP32[(($treemap)>>2)];
      var $2=$m_addr;
      var $treemap1=(($2+4)|0);
      var $3=HEAP32[(($treemap1)>>2)];
      var $sub=(((-$3))|0);
      var $and=$1 & $sub;
      $leastbit=$and;
      var $4=$leastbit;
      var $sub2=((($4)-(1))|0);
      $Y=$sub2;
      var $5=$Y;
      var $shr=$5 >>> 12;
      var $and3=$shr & 16;
      $K=$and3;
      var $6=$K;
      $N=$6;
      var $7=$K;
      var $8=$Y;
      var $shr4=$8 >>> (($7)>>>(0));
      $Y=$shr4;
      var $9=$Y;
      var $shr5=$9 >>> 5;
      var $and6=$shr5 & 8;
      $K=$and6;
      var $10=$N;
      var $add=((($10)+($and6))|0);
      $N=$add;
      var $11=$K;
      var $12=$Y;
      var $shr7=$12 >>> (($11)>>>(0));
      $Y=$shr7;
      var $13=$Y;
      var $shr8=$13 >>> 2;
      var $and9=$shr8 & 4;
      $K=$and9;
      var $14=$N;
      var $add10=((($14)+($and9))|0);
      $N=$add10;
      var $15=$K;
      var $16=$Y;
      var $shr11=$16 >>> (($15)>>>(0));
      $Y=$shr11;
      var $17=$Y;
      var $shr12=$17 >>> 1;
      var $and13=$shr12 & 2;
      $K=$and13;
      var $18=$N;
      var $add14=((($18)+($and13))|0);
      $N=$add14;
      var $19=$K;
      var $20=$Y;
      var $shr15=$20 >>> (($19)>>>(0));
      $Y=$shr15;
      var $21=$Y;
      var $shr16=$21 >>> 1;
      var $and17=$shr16 & 1;
      $K=$and17;
      var $22=$N;
      var $add18=((($22)+($and17))|0);
      $N=$add18;
      var $23=$K;
      var $24=$Y;
      var $shr19=$24 >>> (($23)>>>(0));
      $Y=$shr19;
      var $25=$N;
      var $26=$Y;
      var $add20=((($25)+($26))|0);
      $i=$add20;
      var $27=$i;
      var $28=$m_addr;
      var $treebins=(($28+304)|0);
      var $arrayidx=(($treebins+($27<<2))|0);
      var $29=HEAP32[(($arrayidx)>>2)];
      $t=$29;
      $v=$29;
      var $30=$t;
      var $head=(($30+4)|0);
      var $31=HEAP32[(($head)>>2)];
      var $and21=$31 & -8;
      var $32=$nb_addr;
      var $sub22=((($and21)-($32))|0);
      $rsize=$sub22;
      label = 3; break;
    case 3: 
      var $33=$t;
      var $child=(($33+16)|0);
      var $arrayidx23=(($child)|0);
      var $34=HEAP32[(($arrayidx23)>>2)];
      var $cmp=(($34)|(0))!=0;
      if ($cmp) { label = 4; break; } else { label = 5; break; }
    case 4: 
      var $35=$t;
      var $child24=(($35+16)|0);
      var $arrayidx25=(($child24)|0);
      var $36=HEAP32[(($arrayidx25)>>2)];
      var $cond = $36;label = 6; break;
    case 5: 
      var $37=$t;
      var $child26=(($37+16)|0);
      var $arrayidx27=(($child26+4)|0);
      var $38=HEAP32[(($arrayidx27)>>2)];
      var $cond = $38;label = 6; break;
    case 6: 
      var $cond;
      $t=$cond;
      var $cmp28=(($cond)|(0))!=0;
      if ($cmp28) { label = 7; break; } else { label = 10; break; }
    case 7: 
      var $39=$t;
      var $head29=(($39+4)|0);
      var $40=HEAP32[(($head29)>>2)];
      var $and30=$40 & -8;
      var $41=$nb_addr;
      var $sub31=((($and30)-($41))|0);
      $trem=$sub31;
      var $42=$trem;
      var $43=$rsize;
      var $cmp32=(($42)>>>(0)) < (($43)>>>(0));
      if ($cmp32) { label = 8; break; } else { label = 9; break; }
    case 8: 
      var $44=$trem;
      $rsize=$44;
      var $45=$t;
      $v=$45;
      label = 9; break;
    case 9: 
      label = 3; break;
    case 10: 
      var $46=$v;
      var $47=$46;
      var $48=$m_addr;
      var $least_addr=(($48+16)|0);
      var $49=HEAP32[(($least_addr)>>2)];
      var $cmp33=(($47)>>>(0)) >= (($49)>>>(0));
      var $conv=(($cmp33)&(1));
      var $expval=($conv);
      var $tobool=(($expval)|(0))!=0;
      if ($tobool) { label = 11; break; } else { label = 73; break; }
    case 11: 
      var $50=$v;
      var $51=$50;
      var $52=$nb_addr;
      var $add_ptr=(($51+$52)|0);
      var $53=$add_ptr;
      $r=$53;
      var $54=$v;
      var $55=$54;
      var $56=$r;
      var $57=$56;
      var $cmp35=(($55)>>>(0)) < (($57)>>>(0));
      var $conv36=(($cmp35)&(1));
      var $expval37=($conv36);
      var $tobool38=(($expval37)|(0))!=0;
      if ($tobool38) { label = 12; break; } else { label = 72; break; }
    case 12: 
      var $58=$v;
      var $parent=(($58+24)|0);
      var $59=HEAP32[(($parent)>>2)];
      $XP=$59;
      var $60=$v;
      var $bk=(($60+12)|0);
      var $61=HEAP32[(($bk)>>2)];
      var $62=$v;
      var $cmp40=(($61)|(0))!=(($62)|(0));
      if ($cmp40) { label = 13; break; } else { label = 20; break; }
    case 13: 
      var $63=$v;
      var $fd=(($63+8)|0);
      var $64=HEAP32[(($fd)>>2)];
      $F=$64;
      var $65=$v;
      var $bk43=(($65+12)|0);
      var $66=HEAP32[(($bk43)>>2)];
      $R=$66;
      var $67=$F;
      var $68=$67;
      var $69=$m_addr;
      var $least_addr44=(($69+16)|0);
      var $70=HEAP32[(($least_addr44)>>2)];
      var $cmp45=(($68)>>>(0)) >= (($70)>>>(0));
      if ($cmp45) { label = 14; break; } else { var $77 = 0;label = 16; break; }
    case 14: 
      var $71=$F;
      var $bk47=(($71+12)|0);
      var $72=HEAP32[(($bk47)>>2)];
      var $73=$v;
      var $cmp48=(($72)|(0))==(($73)|(0));
      if ($cmp48) { label = 15; break; } else { var $77 = 0;label = 16; break; }
    case 15: 
      var $74=$R;
      var $fd50=(($74+8)|0);
      var $75=HEAP32[(($fd50)>>2)];
      var $76=$v;
      var $cmp51=(($75)|(0))==(($76)|(0));
      var $77 = $cmp51;label = 16; break;
    case 16: 
      var $77;
      var $land_ext=(($77)&(1));
      var $expval53=($land_ext);
      var $tobool54=(($expval53)|(0))!=0;
      if ($tobool54) { label = 17; break; } else { label = 18; break; }
    case 17: 
      var $78=$R;
      var $79=$F;
      var $bk56=(($79+12)|0);
      HEAP32[(($bk56)>>2)]=$78;
      var $80=$F;
      var $81=$R;
      var $fd57=(($81+8)|0);
      HEAP32[(($fd57)>>2)]=$80;
      label = 19; break;
    case 18: 
      _abort();
      throw "Reached an unreachable!";
    case 19: 
      label = 32; break;
    case 20: 
      var $82=$v;
      var $child60=(($82+16)|0);
      var $arrayidx61=(($child60+4)|0);
      $RP=$arrayidx61;
      var $83=HEAP32[(($arrayidx61)>>2)];
      $R=$83;
      var $cmp62=(($83)|(0))!=0;
      if ($cmp62) { label = 22; break; } else { label = 21; break; }
    case 21: 
      var $84=$v;
      var $child64=(($84+16)|0);
      var $arrayidx65=(($child64)|0);
      $RP=$arrayidx65;
      var $85=HEAP32[(($arrayidx65)>>2)];
      $R=$85;
      var $cmp66=(($85)|(0))!=0;
      if ($cmp66) { label = 22; break; } else { label = 31; break; }
    case 22: 
      label = 23; break;
    case 23: 
      var $86=$R;
      var $child70=(($86+16)|0);
      var $arrayidx71=(($child70+4)|0);
      $CP=$arrayidx71;
      var $87=HEAP32[(($arrayidx71)>>2)];
      var $cmp72=(($87)|(0))!=0;
      if ($cmp72) { var $90 = 1;label = 25; break; } else { label = 24; break; }
    case 24: 
      var $88=$R;
      var $child74=(($88+16)|0);
      var $arrayidx75=(($child74)|0);
      $CP=$arrayidx75;
      var $89=HEAP32[(($arrayidx75)>>2)];
      var $cmp76=(($89)|(0))!=0;
      var $90 = $cmp76;label = 25; break;
    case 25: 
      var $90;
      if ($90) { label = 26; break; } else { label = 27; break; }
    case 26: 
      var $91=$CP;
      $RP=$91;
      var $92=HEAP32[(($91)>>2)];
      $R=$92;
      label = 23; break;
    case 27: 
      var $93=$RP;
      var $94=$93;
      var $95=$m_addr;
      var $least_addr80=(($95+16)|0);
      var $96=HEAP32[(($least_addr80)>>2)];
      var $cmp81=(($94)>>>(0)) >= (($96)>>>(0));
      var $conv82=(($cmp81)&(1));
      var $expval83=($conv82);
      var $tobool84=(($expval83)|(0))!=0;
      if ($tobool84) { label = 28; break; } else { label = 29; break; }
    case 28: 
      var $97=$RP;
      HEAP32[(($97)>>2)]=0;
      label = 30; break;
    case 29: 
      _abort();
      throw "Reached an unreachable!";
    case 30: 
      label = 31; break;
    case 31: 
      label = 32; break;
    case 32: 
      var $98=$XP;
      var $cmp90=(($98)|(0))!=0;
      if ($cmp90) { label = 33; break; } else { label = 60; break; }
    case 33: 
      var $99=$v;
      var $index=(($99+28)|0);
      var $100=HEAP32[(($index)>>2)];
      var $101=$m_addr;
      var $treebins93=(($101+304)|0);
      var $arrayidx94=(($treebins93+($100<<2))|0);
      $H=$arrayidx94;
      var $102=$v;
      var $103=$H;
      var $104=HEAP32[(($103)>>2)];
      var $cmp95=(($102)|(0))==(($104)|(0));
      if ($cmp95) { label = 34; break; } else { label = 37; break; }
    case 34: 
      var $105=$R;
      var $106=$H;
      HEAP32[(($106)>>2)]=$105;
      var $cmp98=(($105)|(0))==0;
      if ($cmp98) { label = 35; break; } else { label = 36; break; }
    case 35: 
      var $107=$v;
      var $index101=(($107+28)|0);
      var $108=HEAP32[(($index101)>>2)];
      var $shl=1 << $108;
      var $neg=$shl ^ -1;
      var $109=$m_addr;
      var $treemap102=(($109+4)|0);
      var $110=HEAP32[(($treemap102)>>2)];
      var $and103=$110 & $neg;
      HEAP32[(($treemap102)>>2)]=$and103;
      label = 36; break;
    case 36: 
      label = 44; break;
    case 37: 
      var $111=$XP;
      var $112=$111;
      var $113=$m_addr;
      var $least_addr106=(($113+16)|0);
      var $114=HEAP32[(($least_addr106)>>2)];
      var $cmp107=(($112)>>>(0)) >= (($114)>>>(0));
      var $conv108=(($cmp107)&(1));
      var $expval109=($conv108);
      var $tobool110=(($expval109)|(0))!=0;
      if ($tobool110) { label = 38; break; } else { label = 42; break; }
    case 38: 
      var $115=$XP;
      var $child112=(($115+16)|0);
      var $arrayidx113=(($child112)|0);
      var $116=HEAP32[(($arrayidx113)>>2)];
      var $117=$v;
      var $cmp114=(($116)|(0))==(($117)|(0));
      if ($cmp114) { label = 39; break; } else { label = 40; break; }
    case 39: 
      var $118=$R;
      var $119=$XP;
      var $child117=(($119+16)|0);
      var $arrayidx118=(($child117)|0);
      HEAP32[(($arrayidx118)>>2)]=$118;
      label = 41; break;
    case 40: 
      var $120=$R;
      var $121=$XP;
      var $child120=(($121+16)|0);
      var $arrayidx121=(($child120+4)|0);
      HEAP32[(($arrayidx121)>>2)]=$120;
      label = 41; break;
    case 41: 
      label = 43; break;
    case 42: 
      _abort();
      throw "Reached an unreachable!";
    case 43: 
      label = 44; break;
    case 44: 
      var $122=$R;
      var $cmp126=(($122)|(0))!=0;
      if ($cmp126) { label = 45; break; } else { label = 59; break; }
    case 45: 
      var $123=$R;
      var $124=$123;
      var $125=$m_addr;
      var $least_addr129=(($125+16)|0);
      var $126=HEAP32[(($least_addr129)>>2)];
      var $cmp130=(($124)>>>(0)) >= (($126)>>>(0));
      var $conv131=(($cmp130)&(1));
      var $expval132=($conv131);
      var $tobool133=(($expval132)|(0))!=0;
      if ($tobool133) { label = 46; break; } else { label = 57; break; }
    case 46: 
      var $127=$XP;
      var $128=$R;
      var $parent135=(($128+24)|0);
      HEAP32[(($parent135)>>2)]=$127;
      var $129=$v;
      var $child136=(($129+16)|0);
      var $arrayidx137=(($child136)|0);
      var $130=HEAP32[(($arrayidx137)>>2)];
      $C0=$130;
      var $cmp138=(($130)|(0))!=0;
      if ($cmp138) { label = 47; break; } else { label = 51; break; }
    case 47: 
      var $131=$C0;
      var $132=$131;
      var $133=$m_addr;
      var $least_addr141=(($133+16)|0);
      var $134=HEAP32[(($least_addr141)>>2)];
      var $cmp142=(($132)>>>(0)) >= (($134)>>>(0));
      var $conv143=(($cmp142)&(1));
      var $expval144=($conv143);
      var $tobool145=(($expval144)|(0))!=0;
      if ($tobool145) { label = 48; break; } else { label = 49; break; }
    case 48: 
      var $135=$C0;
      var $136=$R;
      var $child147=(($136+16)|0);
      var $arrayidx148=(($child147)|0);
      HEAP32[(($arrayidx148)>>2)]=$135;
      var $137=$R;
      var $138=$C0;
      var $parent149=(($138+24)|0);
      HEAP32[(($parent149)>>2)]=$137;
      label = 50; break;
    case 49: 
      _abort();
      throw "Reached an unreachable!";
    case 50: 
      label = 51; break;
    case 51: 
      var $139=$v;
      var $child153=(($139+16)|0);
      var $arrayidx154=(($child153+4)|0);
      var $140=HEAP32[(($arrayidx154)>>2)];
      $C1=$140;
      var $cmp155=(($140)|(0))!=0;
      if ($cmp155) { label = 52; break; } else { label = 56; break; }
    case 52: 
      var $141=$C1;
      var $142=$141;
      var $143=$m_addr;
      var $least_addr158=(($143+16)|0);
      var $144=HEAP32[(($least_addr158)>>2)];
      var $cmp159=(($142)>>>(0)) >= (($144)>>>(0));
      var $conv160=(($cmp159)&(1));
      var $expval161=($conv160);
      var $tobool162=(($expval161)|(0))!=0;
      if ($tobool162) { label = 53; break; } else { label = 54; break; }
    case 53: 
      var $145=$C1;
      var $146=$R;
      var $child164=(($146+16)|0);
      var $arrayidx165=(($child164+4)|0);
      HEAP32[(($arrayidx165)>>2)]=$145;
      var $147=$R;
      var $148=$C1;
      var $parent166=(($148+24)|0);
      HEAP32[(($parent166)>>2)]=$147;
      label = 55; break;
    case 54: 
      _abort();
      throw "Reached an unreachable!";
    case 55: 
      label = 56; break;
    case 56: 
      label = 58; break;
    case 57: 
      _abort();
      throw "Reached an unreachable!";
    case 58: 
      label = 59; break;
    case 59: 
      label = 60; break;
    case 60: 
      var $149=$rsize;
      var $cmp174=(($149)>>>(0)) < 16;
      if ($cmp174) { label = 61; break; } else { label = 62; break; }
    case 61: 
      var $150=$rsize;
      var $151=$nb_addr;
      var $add177=((($150)+($151))|0);
      var $or=$add177 | 1;
      var $or178=$or | 2;
      var $152=$v;
      var $head179=(($152+4)|0);
      HEAP32[(($head179)>>2)]=$or178;
      var $153=$v;
      var $154=$153;
      var $155=$rsize;
      var $156=$nb_addr;
      var $add180=((($155)+($156))|0);
      var $add_ptr181=(($154+$add180)|0);
      var $157=$add_ptr181;
      var $head182=(($157+4)|0);
      var $158=HEAP32[(($head182)>>2)];
      var $or183=$158 | 1;
      HEAP32[(($head182)>>2)]=$or183;
      label = 71; break;
    case 62: 
      var $159=$nb_addr;
      var $or185=$159 | 1;
      var $or186=$or185 | 2;
      var $160=$v;
      var $head187=(($160+4)|0);
      HEAP32[(($head187)>>2)]=$or186;
      var $161=$rsize;
      var $or188=$161 | 1;
      var $162=$r;
      var $head189=(($162+4)|0);
      HEAP32[(($head189)>>2)]=$or188;
      var $163=$rsize;
      var $164=$r;
      var $165=$164;
      var $166=$rsize;
      var $add_ptr190=(($165+$166)|0);
      var $167=$add_ptr190;
      var $prev_foot=(($167)|0);
      HEAP32[(($prev_foot)>>2)]=$163;
      var $168=$m_addr;
      var $dvsize=(($168+8)|0);
      var $169=HEAP32[(($dvsize)>>2)];
      $DVS=$169;
      var $170=$DVS;
      var $cmp191=(($170)|(0))!=0;
      if ($cmp191) { label = 63; break; } else { label = 70; break; }
    case 63: 
      var $171=$m_addr;
      var $dv=(($171+20)|0);
      var $172=HEAP32[(($dv)>>2)];
      $DV=$172;
      var $173=$DVS;
      var $shr194=$173 >>> 3;
      $I=$shr194;
      var $174=$I;
      var $shl195=$174 << 1;
      var $175=$m_addr;
      var $smallbins=(($175+40)|0);
      var $arrayidx196=(($smallbins+($shl195<<2))|0);
      var $176=$arrayidx196;
      var $177=$176;
      $B=$177;
      var $178=$B;
      $F197=$178;
      var $179=$m_addr;
      var $smallmap=(($179)|0);
      var $180=HEAP32[(($smallmap)>>2)];
      var $181=$I;
      var $shl198=1 << $181;
      var $and199=$180 & $shl198;
      var $tobool200=(($and199)|(0))!=0;
      if ($tobool200) { label = 65; break; } else { label = 64; break; }
    case 64: 
      var $182=$I;
      var $shl202=1 << $182;
      var $183=$m_addr;
      var $smallmap203=(($183)|0);
      var $184=HEAP32[(($smallmap203)>>2)];
      var $or204=$184 | $shl202;
      HEAP32[(($smallmap203)>>2)]=$or204;
      label = 69; break;
    case 65: 
      var $185=$B;
      var $fd206=(($185+8)|0);
      var $186=HEAP32[(($fd206)>>2)];
      var $187=$186;
      var $188=$m_addr;
      var $least_addr207=(($188+16)|0);
      var $189=HEAP32[(($least_addr207)>>2)];
      var $cmp208=(($187)>>>(0)) >= (($189)>>>(0));
      var $conv209=(($cmp208)&(1));
      var $expval210=($conv209);
      var $tobool211=(($expval210)|(0))!=0;
      if ($tobool211) { label = 66; break; } else { label = 67; break; }
    case 66: 
      var $190=$B;
      var $fd213=(($190+8)|0);
      var $191=HEAP32[(($fd213)>>2)];
      $F197=$191;
      label = 68; break;
    case 67: 
      _abort();
      throw "Reached an unreachable!";
    case 68: 
      label = 69; break;
    case 69: 
      var $192=$DV;
      var $193=$B;
      var $fd217=(($193+8)|0);
      HEAP32[(($fd217)>>2)]=$192;
      var $194=$DV;
      var $195=$F197;
      var $bk218=(($195+12)|0);
      HEAP32[(($bk218)>>2)]=$194;
      var $196=$F197;
      var $197=$DV;
      var $fd219=(($197+8)|0);
      HEAP32[(($fd219)>>2)]=$196;
      var $198=$B;
      var $199=$DV;
      var $bk220=(($199+12)|0);
      HEAP32[(($bk220)>>2)]=$198;
      label = 70; break;
    case 70: 
      var $200=$rsize;
      var $201=$m_addr;
      var $dvsize222=(($201+8)|0);
      HEAP32[(($dvsize222)>>2)]=$200;
      var $202=$r;
      var $203=$m_addr;
      var $dv223=(($203+20)|0);
      HEAP32[(($dv223)>>2)]=$202;
      label = 71; break;
    case 71: 
      var $204=$v;
      var $205=$204;
      var $add_ptr225=(($205+8)|0);
      return $add_ptr225;
    case 72: 
      label = 73; break;
    case 73: 
      _abort();
      throw "Reached an unreachable!";
    default: assert(0, "bad label: " + label);
  }
}
function _tmalloc_large($m, $nb) {
  var label = 0;
  label = 2; 
  while(1) switch(label) {
    case 2: 
      var $retval;
      var $m_addr;
      var $nb_addr;
      var $v;
      var $rsize;
      var $t;
      var $idx;
      var $X;
      var $Y;
      var $N;
      var $K;
      var $sizebits;
      var $rst;
      var $rt;
      var $trem;
      var $leftbits;
      var $i;
      var $leastbit;
      var $Y68;
      var $K70;
      var $N73;
      var $trem97;
      var $r;
      var $XP;
      var $R;
      var $F;
      var $RP;
      var $CP;
      var $H;
      var $C0;
      var $C1;
      var $I;
      var $B;
      var $F289;
      var $TP;
      var $H314;
      var $I315;
      var $X316;
      var $Y326;
      var $N327;
      var $K331;
      var $T;
      var $K372;
      var $C;
      var $F411;
      $m_addr=$m;
      $nb_addr=$nb;
      $v=0;
      var $0=$nb_addr;
      var $sub=(((-$0))|0);
      $rsize=$sub;
      var $1=$nb_addr;
      var $shr=$1 >>> 8;
      $X=$shr;
      var $2=$X;
      var $cmp=(($2)|(0))==0;
      if ($cmp) { label = 3; break; } else { label = 4; break; }
    case 3: 
      $idx=0;
      label = 8; break;
    case 4: 
      var $3=$X;
      var $cmp1=(($3)>>>(0)) > 65535;
      if ($cmp1) { label = 5; break; } else { label = 6; break; }
    case 5: 
      $idx=31;
      label = 7; break;
    case 6: 
      var $4=$X;
      $Y=$4;
      var $5=$Y;
      var $sub4=((($5)-(256))|0);
      var $shr5=$sub4 >>> 16;
      var $and=$shr5 & 8;
      $N=$and;
      var $6=$N;
      var $7=$Y;
      var $shl=$7 << $6;
      $Y=$shl;
      var $sub6=((($shl)-(4096))|0);
      var $shr7=$sub6 >>> 16;
      var $and8=$shr7 & 4;
      $K=$and8;
      var $8=$K;
      var $9=$N;
      var $add=((($9)+($8))|0);
      $N=$add;
      var $10=$K;
      var $11=$Y;
      var $shl9=$11 << $10;
      $Y=$shl9;
      var $sub10=((($shl9)-(16384))|0);
      var $shr11=$sub10 >>> 16;
      var $and12=$shr11 & 2;
      $K=$and12;
      var $12=$N;
      var $add13=((($12)+($and12))|0);
      $N=$add13;
      var $13=$N;
      var $sub14=(((14)-($13))|0);
      var $14=$K;
      var $15=$Y;
      var $shl15=$15 << $14;
      $Y=$shl15;
      var $shr16=$shl15 >>> 15;
      var $add17=((($sub14)+($shr16))|0);
      $K=$add17;
      var $16=$K;
      var $shl18=$16 << 1;
      var $17=$nb_addr;
      var $18=$K;
      var $add19=((($18)+(7))|0);
      var $shr20=$17 >>> (($add19)>>>(0));
      var $and21=$shr20 & 1;
      var $add22=((($shl18)+($and21))|0);
      $idx=$add22;
      label = 7; break;
    case 7: 
      label = 8; break;
    case 8: 
      var $19=$idx;
      var $20=$m_addr;
      var $treebins=(($20+304)|0);
      var $arrayidx=(($treebins+($19<<2))|0);
      var $21=HEAP32[(($arrayidx)>>2)];
      $t=$21;
      var $cmp24=(($21)|(0))!=0;
      if ($cmp24) { label = 9; break; } else { label = 24; break; }
    case 9: 
      var $22=$nb_addr;
      var $23=$idx;
      var $cmp26=(($23)|(0))==31;
      if ($cmp26) { label = 10; break; } else { label = 11; break; }
    case 10: 
      var $cond = 0;label = 12; break;
    case 11: 
      var $24=$idx;
      var $shr27=$24 >>> 1;
      var $add28=((($shr27)+(8))|0);
      var $sub29=((($add28)-(2))|0);
      var $sub30=(((31)-($sub29))|0);
      var $cond = $sub30;label = 12; break;
    case 12: 
      var $cond;
      var $shl31=$22 << $cond;
      $sizebits=$shl31;
      $rst=0;
      label = 13; break;
    case 13: 
      var $25=$t;
      var $head=(($25+4)|0);
      var $26=HEAP32[(($head)>>2)];
      var $and32=$26 & -8;
      var $27=$nb_addr;
      var $sub33=((($and32)-($27))|0);
      $trem=$sub33;
      var $28=$trem;
      var $29=$rsize;
      var $cmp34=(($28)>>>(0)) < (($29)>>>(0));
      if ($cmp34) { label = 14; break; } else { label = 17; break; }
    case 14: 
      var $30=$t;
      $v=$30;
      var $31=$trem;
      $rsize=$31;
      var $cmp36=(($31)|(0))==0;
      if ($cmp36) { label = 15; break; } else { label = 16; break; }
    case 15: 
      label = 23; break;
    case 16: 
      label = 17; break;
    case 17: 
      var $32=$t;
      var $child=(($32+16)|0);
      var $arrayidx40=(($child+4)|0);
      var $33=HEAP32[(($arrayidx40)>>2)];
      $rt=$33;
      var $34=$sizebits;
      var $shr41=$34 >>> 31;
      var $and42=$shr41 & 1;
      var $35=$t;
      var $child43=(($35+16)|0);
      var $arrayidx44=(($child43+($and42<<2))|0);
      var $36=HEAP32[(($arrayidx44)>>2)];
      $t=$36;
      var $37=$rt;
      var $cmp45=(($37)|(0))!=0;
      if ($cmp45) { label = 18; break; } else { label = 20; break; }
    case 18: 
      var $38=$rt;
      var $39=$t;
      var $cmp46=(($38)|(0))!=(($39)|(0));
      if ($cmp46) { label = 19; break; } else { label = 20; break; }
    case 19: 
      var $40=$rt;
      $rst=$40;
      label = 20; break;
    case 20: 
      var $41=$t;
      var $cmp49=(($41)|(0))==0;
      if ($cmp49) { label = 21; break; } else { label = 22; break; }
    case 21: 
      var $42=$rst;
      $t=$42;
      label = 23; break;
    case 22: 
      var $43=$sizebits;
      var $shl52=$43 << 1;
      $sizebits=$shl52;
      label = 13; break;
    case 23: 
      label = 24; break;
    case 24: 
      var $44=$t;
      var $cmp54=(($44)|(0))==0;
      if ($cmp54) { label = 25; break; } else { label = 29; break; }
    case 25: 
      var $45=$v;
      var $cmp56=(($45)|(0))==0;
      if ($cmp56) { label = 26; break; } else { label = 29; break; }
    case 26: 
      var $46=$idx;
      var $shl58=1 << $46;
      var $shl59=$shl58 << 1;
      var $47=$idx;
      var $shl60=1 << $47;
      var $shl61=$shl60 << 1;
      var $sub62=(((-$shl61))|0);
      var $or=$shl59 | $sub62;
      var $48=$m_addr;
      var $treemap=(($48+4)|0);
      var $49=HEAP32[(($treemap)>>2)];
      var $and63=$or & $49;
      $leftbits=$and63;
      var $50=$leftbits;
      var $cmp64=(($50)|(0))!=0;
      if ($cmp64) { label = 27; break; } else { label = 28; break; }
    case 27: 
      var $51=$leftbits;
      var $52=$leftbits;
      var $sub66=(((-$52))|0);
      var $and67=$51 & $sub66;
      $leastbit=$and67;
      var $53=$leastbit;
      var $sub69=((($53)-(1))|0);
      $Y68=$sub69;
      var $54=$Y68;
      var $shr71=$54 >>> 12;
      var $and72=$shr71 & 16;
      $K70=$and72;
      var $55=$K70;
      $N73=$55;
      var $56=$K70;
      var $57=$Y68;
      var $shr74=$57 >>> (($56)>>>(0));
      $Y68=$shr74;
      var $58=$Y68;
      var $shr75=$58 >>> 5;
      var $and76=$shr75 & 8;
      $K70=$and76;
      var $59=$N73;
      var $add77=((($59)+($and76))|0);
      $N73=$add77;
      var $60=$K70;
      var $61=$Y68;
      var $shr78=$61 >>> (($60)>>>(0));
      $Y68=$shr78;
      var $62=$Y68;
      var $shr79=$62 >>> 2;
      var $and80=$shr79 & 4;
      $K70=$and80;
      var $63=$N73;
      var $add81=((($63)+($and80))|0);
      $N73=$add81;
      var $64=$K70;
      var $65=$Y68;
      var $shr82=$65 >>> (($64)>>>(0));
      $Y68=$shr82;
      var $66=$Y68;
      var $shr83=$66 >>> 1;
      var $and84=$shr83 & 2;
      $K70=$and84;
      var $67=$N73;
      var $add85=((($67)+($and84))|0);
      $N73=$add85;
      var $68=$K70;
      var $69=$Y68;
      var $shr86=$69 >>> (($68)>>>(0));
      $Y68=$shr86;
      var $70=$Y68;
      var $shr87=$70 >>> 1;
      var $and88=$shr87 & 1;
      $K70=$and88;
      var $71=$N73;
      var $add89=((($71)+($and88))|0);
      $N73=$add89;
      var $72=$K70;
      var $73=$Y68;
      var $shr90=$73 >>> (($72)>>>(0));
      $Y68=$shr90;
      var $74=$N73;
      var $75=$Y68;
      var $add91=((($74)+($75))|0);
      $i=$add91;
      var $76=$i;
      var $77=$m_addr;
      var $treebins92=(($77+304)|0);
      var $arrayidx93=(($treebins92+($76<<2))|0);
      var $78=HEAP32[(($arrayidx93)>>2)];
      $t=$78;
      label = 28; break;
    case 28: 
      label = 29; break;
    case 29: 
      label = 30; break;
    case 30: 
      var $79=$t;
      var $cmp96=(($79)|(0))!=0;
      if ($cmp96) { label = 31; break; } else { label = 37; break; }
    case 31: 
      var $80=$t;
      var $head98=(($80+4)|0);
      var $81=HEAP32[(($head98)>>2)];
      var $and99=$81 & -8;
      var $82=$nb_addr;
      var $sub100=((($and99)-($82))|0);
      $trem97=$sub100;
      var $83=$trem97;
      var $84=$rsize;
      var $cmp101=(($83)>>>(0)) < (($84)>>>(0));
      if ($cmp101) { label = 32; break; } else { label = 33; break; }
    case 32: 
      var $85=$trem97;
      $rsize=$85;
      var $86=$t;
      $v=$86;
      label = 33; break;
    case 33: 
      var $87=$t;
      var $child104=(($87+16)|0);
      var $arrayidx105=(($child104)|0);
      var $88=HEAP32[(($arrayidx105)>>2)];
      var $cmp106=(($88)|(0))!=0;
      if ($cmp106) { label = 34; break; } else { label = 35; break; }
    case 34: 
      var $89=$t;
      var $child108=(($89+16)|0);
      var $arrayidx109=(($child108)|0);
      var $90=HEAP32[(($arrayidx109)>>2)];
      var $cond114 = $90;label = 36; break;
    case 35: 
      var $91=$t;
      var $child111=(($91+16)|0);
      var $arrayidx112=(($child111+4)|0);
      var $92=HEAP32[(($arrayidx112)>>2)];
      var $cond114 = $92;label = 36; break;
    case 36: 
      var $cond114;
      $t=$cond114;
      label = 30; break;
    case 37: 
      var $93=$v;
      var $cmp115=(($93)|(0))!=0;
      if ($cmp115) { label = 38; break; } else { label = 130; break; }
    case 38: 
      var $94=$rsize;
      var $95=$m_addr;
      var $dvsize=(($95+8)|0);
      var $96=HEAP32[(($dvsize)>>2)];
      var $97=$nb_addr;
      var $sub117=((($96)-($97))|0);
      var $cmp118=(($94)>>>(0)) < (($sub117)>>>(0));
      if ($cmp118) { label = 39; break; } else { label = 130; break; }
    case 39: 
      var $98=$v;
      var $99=$98;
      var $100=$m_addr;
      var $least_addr=(($100+16)|0);
      var $101=HEAP32[(($least_addr)>>2)];
      var $cmp120=(($99)>>>(0)) >= (($101)>>>(0));
      var $conv=(($cmp120)&(1));
      var $expval=($conv);
      var $tobool=(($expval)|(0))!=0;
      if ($tobool) { label = 40; break; } else { label = 129; break; }
    case 40: 
      var $102=$v;
      var $103=$102;
      var $104=$nb_addr;
      var $add_ptr=(($103+$104)|0);
      var $105=$add_ptr;
      $r=$105;
      var $106=$v;
      var $107=$106;
      var $108=$r;
      var $109=$108;
      var $cmp122=(($107)>>>(0)) < (($109)>>>(0));
      var $conv123=(($cmp122)&(1));
      var $expval124=($conv123);
      var $tobool125=(($expval124)|(0))!=0;
      if ($tobool125) { label = 41; break; } else { label = 128; break; }
    case 41: 
      var $110=$v;
      var $parent=(($110+24)|0);
      var $111=HEAP32[(($parent)>>2)];
      $XP=$111;
      var $112=$v;
      var $bk=(($112+12)|0);
      var $113=HEAP32[(($bk)>>2)];
      var $114=$v;
      var $cmp127=(($113)|(0))!=(($114)|(0));
      if ($cmp127) { label = 42; break; } else { label = 49; break; }
    case 42: 
      var $115=$v;
      var $fd=(($115+8)|0);
      var $116=HEAP32[(($fd)>>2)];
      $F=$116;
      var $117=$v;
      var $bk130=(($117+12)|0);
      var $118=HEAP32[(($bk130)>>2)];
      $R=$118;
      var $119=$F;
      var $120=$119;
      var $121=$m_addr;
      var $least_addr131=(($121+16)|0);
      var $122=HEAP32[(($least_addr131)>>2)];
      var $cmp132=(($120)>>>(0)) >= (($122)>>>(0));
      if ($cmp132) { label = 43; break; } else { var $129 = 0;label = 45; break; }
    case 43: 
      var $123=$F;
      var $bk135=(($123+12)|0);
      var $124=HEAP32[(($bk135)>>2)];
      var $125=$v;
      var $cmp136=(($124)|(0))==(($125)|(0));
      if ($cmp136) { label = 44; break; } else { var $129 = 0;label = 45; break; }
    case 44: 
      var $126=$R;
      var $fd138=(($126+8)|0);
      var $127=HEAP32[(($fd138)>>2)];
      var $128=$v;
      var $cmp139=(($127)|(0))==(($128)|(0));
      var $129 = $cmp139;label = 45; break;
    case 45: 
      var $129;
      var $land_ext=(($129)&(1));
      var $expval141=($land_ext);
      var $tobool142=(($expval141)|(0))!=0;
      if ($tobool142) { label = 46; break; } else { label = 47; break; }
    case 46: 
      var $130=$R;
      var $131=$F;
      var $bk144=(($131+12)|0);
      HEAP32[(($bk144)>>2)]=$130;
      var $132=$F;
      var $133=$R;
      var $fd145=(($133+8)|0);
      HEAP32[(($fd145)>>2)]=$132;
      label = 48; break;
    case 47: 
      _abort();
      throw "Reached an unreachable!";
    case 48: 
      label = 61; break;
    case 49: 
      var $134=$v;
      var $child149=(($134+16)|0);
      var $arrayidx150=(($child149+4)|0);
      $RP=$arrayidx150;
      var $135=HEAP32[(($arrayidx150)>>2)];
      $R=$135;
      var $cmp151=(($135)|(0))!=0;
      if ($cmp151) { label = 51; break; } else { label = 50; break; }
    case 50: 
      var $136=$v;
      var $child153=(($136+16)|0);
      var $arrayidx154=(($child153)|0);
      $RP=$arrayidx154;
      var $137=HEAP32[(($arrayidx154)>>2)];
      $R=$137;
      var $cmp155=(($137)|(0))!=0;
      if ($cmp155) { label = 51; break; } else { label = 60; break; }
    case 51: 
      label = 52; break;
    case 52: 
      var $138=$R;
      var $child159=(($138+16)|0);
      var $arrayidx160=(($child159+4)|0);
      $CP=$arrayidx160;
      var $139=HEAP32[(($arrayidx160)>>2)];
      var $cmp161=(($139)|(0))!=0;
      if ($cmp161) { var $142 = 1;label = 54; break; } else { label = 53; break; }
    case 53: 
      var $140=$R;
      var $child163=(($140+16)|0);
      var $arrayidx164=(($child163)|0);
      $CP=$arrayidx164;
      var $141=HEAP32[(($arrayidx164)>>2)];
      var $cmp165=(($141)|(0))!=0;
      var $142 = $cmp165;label = 54; break;
    case 54: 
      var $142;
      if ($142) { label = 55; break; } else { label = 56; break; }
    case 55: 
      var $143=$CP;
      $RP=$143;
      var $144=HEAP32[(($143)>>2)];
      $R=$144;
      label = 52; break;
    case 56: 
      var $145=$RP;
      var $146=$145;
      var $147=$m_addr;
      var $least_addr169=(($147+16)|0);
      var $148=HEAP32[(($least_addr169)>>2)];
      var $cmp170=(($146)>>>(0)) >= (($148)>>>(0));
      var $conv171=(($cmp170)&(1));
      var $expval172=($conv171);
      var $tobool173=(($expval172)|(0))!=0;
      if ($tobool173) { label = 57; break; } else { label = 58; break; }
    case 57: 
      var $149=$RP;
      HEAP32[(($149)>>2)]=0;
      label = 59; break;
    case 58: 
      _abort();
      throw "Reached an unreachable!";
    case 59: 
      label = 60; break;
    case 60: 
      label = 61; break;
    case 61: 
      var $150=$XP;
      var $cmp179=(($150)|(0))!=0;
      if ($cmp179) { label = 62; break; } else { label = 89; break; }
    case 62: 
      var $151=$v;
      var $index=(($151+28)|0);
      var $152=HEAP32[(($index)>>2)];
      var $153=$m_addr;
      var $treebins182=(($153+304)|0);
      var $arrayidx183=(($treebins182+($152<<2))|0);
      $H=$arrayidx183;
      var $154=$v;
      var $155=$H;
      var $156=HEAP32[(($155)>>2)];
      var $cmp184=(($154)|(0))==(($156)|(0));
      if ($cmp184) { label = 63; break; } else { label = 66; break; }
    case 63: 
      var $157=$R;
      var $158=$H;
      HEAP32[(($158)>>2)]=$157;
      var $cmp187=(($157)|(0))==0;
      if ($cmp187) { label = 64; break; } else { label = 65; break; }
    case 64: 
      var $159=$v;
      var $index190=(($159+28)|0);
      var $160=HEAP32[(($index190)>>2)];
      var $shl191=1 << $160;
      var $neg=$shl191 ^ -1;
      var $161=$m_addr;
      var $treemap192=(($161+4)|0);
      var $162=HEAP32[(($treemap192)>>2)];
      var $and193=$162 & $neg;
      HEAP32[(($treemap192)>>2)]=$and193;
      label = 65; break;
    case 65: 
      label = 73; break;
    case 66: 
      var $163=$XP;
      var $164=$163;
      var $165=$m_addr;
      var $least_addr196=(($165+16)|0);
      var $166=HEAP32[(($least_addr196)>>2)];
      var $cmp197=(($164)>>>(0)) >= (($166)>>>(0));
      var $conv198=(($cmp197)&(1));
      var $expval199=($conv198);
      var $tobool200=(($expval199)|(0))!=0;
      if ($tobool200) { label = 67; break; } else { label = 71; break; }
    case 67: 
      var $167=$XP;
      var $child202=(($167+16)|0);
      var $arrayidx203=(($child202)|0);
      var $168=HEAP32[(($arrayidx203)>>2)];
      var $169=$v;
      var $cmp204=(($168)|(0))==(($169)|(0));
      if ($cmp204) { label = 68; break; } else { label = 69; break; }
    case 68: 
      var $170=$R;
      var $171=$XP;
      var $child207=(($171+16)|0);
      var $arrayidx208=(($child207)|0);
      HEAP32[(($arrayidx208)>>2)]=$170;
      label = 70; break;
    case 69: 
      var $172=$R;
      var $173=$XP;
      var $child210=(($173+16)|0);
      var $arrayidx211=(($child210+4)|0);
      HEAP32[(($arrayidx211)>>2)]=$172;
      label = 70; break;
    case 70: 
      label = 72; break;
    case 71: 
      _abort();
      throw "Reached an unreachable!";
    case 72: 
      label = 73; break;
    case 73: 
      var $174=$R;
      var $cmp216=(($174)|(0))!=0;
      if ($cmp216) { label = 74; break; } else { label = 88; break; }
    case 74: 
      var $175=$R;
      var $176=$175;
      var $177=$m_addr;
      var $least_addr219=(($177+16)|0);
      var $178=HEAP32[(($least_addr219)>>2)];
      var $cmp220=(($176)>>>(0)) >= (($178)>>>(0));
      var $conv221=(($cmp220)&(1));
      var $expval222=($conv221);
      var $tobool223=(($expval222)|(0))!=0;
      if ($tobool223) { label = 75; break; } else { label = 86; break; }
    case 75: 
      var $179=$XP;
      var $180=$R;
      var $parent225=(($180+24)|0);
      HEAP32[(($parent225)>>2)]=$179;
      var $181=$v;
      var $child226=(($181+16)|0);
      var $arrayidx227=(($child226)|0);
      var $182=HEAP32[(($arrayidx227)>>2)];
      $C0=$182;
      var $cmp228=(($182)|(0))!=0;
      if ($cmp228) { label = 76; break; } else { label = 80; break; }
    case 76: 
      var $183=$C0;
      var $184=$183;
      var $185=$m_addr;
      var $least_addr231=(($185+16)|0);
      var $186=HEAP32[(($least_addr231)>>2)];
      var $cmp232=(($184)>>>(0)) >= (($186)>>>(0));
      var $conv233=(($cmp232)&(1));
      var $expval234=($conv233);
      var $tobool235=(($expval234)|(0))!=0;
      if ($tobool235) { label = 77; break; } else { label = 78; break; }
    case 77: 
      var $187=$C0;
      var $188=$R;
      var $child237=(($188+16)|0);
      var $arrayidx238=(($child237)|0);
      HEAP32[(($arrayidx238)>>2)]=$187;
      var $189=$R;
      var $190=$C0;
      var $parent239=(($190+24)|0);
      HEAP32[(($parent239)>>2)]=$189;
      label = 79; break;
    case 78: 
      _abort();
      throw "Reached an unreachable!";
    case 79: 
      label = 80; break;
    case 80: 
      var $191=$v;
      var $child243=(($191+16)|0);
      var $arrayidx244=(($child243+4)|0);
      var $192=HEAP32[(($arrayidx244)>>2)];
      $C1=$192;
      var $cmp245=(($192)|(0))!=0;
      if ($cmp245) { label = 81; break; } else { label = 85; break; }
    case 81: 
      var $193=$C1;
      var $194=$193;
      var $195=$m_addr;
      var $least_addr248=(($195+16)|0);
      var $196=HEAP32[(($least_addr248)>>2)];
      var $cmp249=(($194)>>>(0)) >= (($196)>>>(0));
      var $conv250=(($cmp249)&(1));
      var $expval251=($conv250);
      var $tobool252=(($expval251)|(0))!=0;
      if ($tobool252) { label = 82; break; } else { label = 83; break; }
    case 82: 
      var $197=$C1;
      var $198=$R;
      var $child254=(($198+16)|0);
      var $arrayidx255=(($child254+4)|0);
      HEAP32[(($arrayidx255)>>2)]=$197;
      var $199=$R;
      var $200=$C1;
      var $parent256=(($200+24)|0);
      HEAP32[(($parent256)>>2)]=$199;
      label = 84; break;
    case 83: 
      _abort();
      throw "Reached an unreachable!";
    case 84: 
      label = 85; break;
    case 85: 
      label = 87; break;
    case 86: 
      _abort();
      throw "Reached an unreachable!";
    case 87: 
      label = 88; break;
    case 88: 
      label = 89; break;
    case 89: 
      var $201=$rsize;
      var $cmp264=(($201)>>>(0)) < 16;
      if ($cmp264) { label = 90; break; } else { label = 91; break; }
    case 90: 
      var $202=$rsize;
      var $203=$nb_addr;
      var $add267=((($202)+($203))|0);
      var $or268=$add267 | 1;
      var $or269=$or268 | 2;
      var $204=$v;
      var $head270=(($204+4)|0);
      HEAP32[(($head270)>>2)]=$or269;
      var $205=$v;
      var $206=$205;
      var $207=$rsize;
      var $208=$nb_addr;
      var $add271=((($207)+($208))|0);
      var $add_ptr272=(($206+$add271)|0);
      var $209=$add_ptr272;
      var $head273=(($209+4)|0);
      var $210=HEAP32[(($head273)>>2)];
      var $or274=$210 | 1;
      HEAP32[(($head273)>>2)]=$or274;
      label = 127; break;
    case 91: 
      var $211=$nb_addr;
      var $or276=$211 | 1;
      var $or277=$or276 | 2;
      var $212=$v;
      var $head278=(($212+4)|0);
      HEAP32[(($head278)>>2)]=$or277;
      var $213=$rsize;
      var $or279=$213 | 1;
      var $214=$r;
      var $head280=(($214+4)|0);
      HEAP32[(($head280)>>2)]=$or279;
      var $215=$rsize;
      var $216=$r;
      var $217=$216;
      var $218=$rsize;
      var $add_ptr281=(($217+$218)|0);
      var $219=$add_ptr281;
      var $prev_foot=(($219)|0);
      HEAP32[(($prev_foot)>>2)]=$215;
      var $220=$rsize;
      var $shr282=$220 >>> 3;
      var $cmp283=(($shr282)>>>(0)) < 32;
      if ($cmp283) { label = 92; break; } else { label = 99; break; }
    case 92: 
      var $221=$rsize;
      var $shr286=$221 >>> 3;
      $I=$shr286;
      var $222=$I;
      var $shl287=$222 << 1;
      var $223=$m_addr;
      var $smallbins=(($223+40)|0);
      var $arrayidx288=(($smallbins+($shl287<<2))|0);
      var $224=$arrayidx288;
      var $225=$224;
      $B=$225;
      var $226=$B;
      $F289=$226;
      var $227=$m_addr;
      var $smallmap=(($227)|0);
      var $228=HEAP32[(($smallmap)>>2)];
      var $229=$I;
      var $shl290=1 << $229;
      var $and291=$228 & $shl290;
      var $tobool292=(($and291)|(0))!=0;
      if ($tobool292) { label = 94; break; } else { label = 93; break; }
    case 93: 
      var $230=$I;
      var $shl294=1 << $230;
      var $231=$m_addr;
      var $smallmap295=(($231)|0);
      var $232=HEAP32[(($smallmap295)>>2)];
      var $or296=$232 | $shl294;
      HEAP32[(($smallmap295)>>2)]=$or296;
      label = 98; break;
    case 94: 
      var $233=$B;
      var $fd298=(($233+8)|0);
      var $234=HEAP32[(($fd298)>>2)];
      var $235=$234;
      var $236=$m_addr;
      var $least_addr299=(($236+16)|0);
      var $237=HEAP32[(($least_addr299)>>2)];
      var $cmp300=(($235)>>>(0)) >= (($237)>>>(0));
      var $conv301=(($cmp300)&(1));
      var $expval302=($conv301);
      var $tobool303=(($expval302)|(0))!=0;
      if ($tobool303) { label = 95; break; } else { label = 96; break; }
    case 95: 
      var $238=$B;
      var $fd305=(($238+8)|0);
      var $239=HEAP32[(($fd305)>>2)];
      $F289=$239;
      label = 97; break;
    case 96: 
      _abort();
      throw "Reached an unreachable!";
    case 97: 
      label = 98; break;
    case 98: 
      var $240=$r;
      var $241=$B;
      var $fd309=(($241+8)|0);
      HEAP32[(($fd309)>>2)]=$240;
      var $242=$r;
      var $243=$F289;
      var $bk310=(($243+12)|0);
      HEAP32[(($bk310)>>2)]=$242;
      var $244=$F289;
      var $245=$r;
      var $fd311=(($245+8)|0);
      HEAP32[(($fd311)>>2)]=$244;
      var $246=$B;
      var $247=$r;
      var $bk312=(($247+12)|0);
      HEAP32[(($bk312)>>2)]=$246;
      label = 126; break;
    case 99: 
      var $248=$r;
      var $249=$248;
      $TP=$249;
      var $250=$rsize;
      var $shr317=$250 >>> 8;
      $X316=$shr317;
      var $251=$X316;
      var $cmp318=(($251)|(0))==0;
      if ($cmp318) { label = 100; break; } else { label = 101; break; }
    case 100: 
      $I315=0;
      label = 105; break;
    case 101: 
      var $252=$X316;
      var $cmp322=(($252)>>>(0)) > 65535;
      if ($cmp322) { label = 102; break; } else { label = 103; break; }
    case 102: 
      $I315=31;
      label = 104; break;
    case 103: 
      var $253=$X316;
      $Y326=$253;
      var $254=$Y326;
      var $sub328=((($254)-(256))|0);
      var $shr329=$sub328 >>> 16;
      var $and330=$shr329 & 8;
      $N327=$and330;
      var $255=$N327;
      var $256=$Y326;
      var $shl332=$256 << $255;
      $Y326=$shl332;
      var $sub333=((($shl332)-(4096))|0);
      var $shr334=$sub333 >>> 16;
      var $and335=$shr334 & 4;
      $K331=$and335;
      var $257=$K331;
      var $258=$N327;
      var $add336=((($258)+($257))|0);
      $N327=$add336;
      var $259=$K331;
      var $260=$Y326;
      var $shl337=$260 << $259;
      $Y326=$shl337;
      var $sub338=((($shl337)-(16384))|0);
      var $shr339=$sub338 >>> 16;
      var $and340=$shr339 & 2;
      $K331=$and340;
      var $261=$N327;
      var $add341=((($261)+($and340))|0);
      $N327=$add341;
      var $262=$N327;
      var $sub342=(((14)-($262))|0);
      var $263=$K331;
      var $264=$Y326;
      var $shl343=$264 << $263;
      $Y326=$shl343;
      var $shr344=$shl343 >>> 15;
      var $add345=((($sub342)+($shr344))|0);
      $K331=$add345;
      var $265=$K331;
      var $shl346=$265 << 1;
      var $266=$rsize;
      var $267=$K331;
      var $add347=((($267)+(7))|0);
      var $shr348=$266 >>> (($add347)>>>(0));
      var $and349=$shr348 & 1;
      var $add350=((($shl346)+($and349))|0);
      $I315=$add350;
      label = 104; break;
    case 104: 
      label = 105; break;
    case 105: 
      var $268=$I315;
      var $269=$m_addr;
      var $treebins353=(($269+304)|0);
      var $arrayidx354=(($treebins353+($268<<2))|0);
      $H314=$arrayidx354;
      var $270=$I315;
      var $271=$TP;
      var $index355=(($271+28)|0);
      HEAP32[(($index355)>>2)]=$270;
      var $272=$TP;
      var $child356=(($272+16)|0);
      var $arrayidx357=(($child356+4)|0);
      HEAP32[(($arrayidx357)>>2)]=0;
      var $273=$TP;
      var $child358=(($273+16)|0);
      var $arrayidx359=(($child358)|0);
      HEAP32[(($arrayidx359)>>2)]=0;
      var $274=$m_addr;
      var $treemap360=(($274+4)|0);
      var $275=HEAP32[(($treemap360)>>2)];
      var $276=$I315;
      var $shl361=1 << $276;
      var $and362=$275 & $shl361;
      var $tobool363=(($and362)|(0))!=0;
      if ($tobool363) { label = 107; break; } else { label = 106; break; }
    case 106: 
      var $277=$I315;
      var $shl365=1 << $277;
      var $278=$m_addr;
      var $treemap366=(($278+4)|0);
      var $279=HEAP32[(($treemap366)>>2)];
      var $or367=$279 | $shl365;
      HEAP32[(($treemap366)>>2)]=$or367;
      var $280=$TP;
      var $281=$H314;
      HEAP32[(($281)>>2)]=$280;
      var $282=$H314;
      var $283=$282;
      var $284=$TP;
      var $parent368=(($284+24)|0);
      HEAP32[(($parent368)>>2)]=$283;
      var $285=$TP;
      var $286=$TP;
      var $bk369=(($286+12)|0);
      HEAP32[(($bk369)>>2)]=$285;
      var $287=$TP;
      var $fd370=(($287+8)|0);
      HEAP32[(($fd370)>>2)]=$285;
      label = 125; break;
    case 107: 
      var $288=$H314;
      var $289=HEAP32[(($288)>>2)];
      $T=$289;
      var $290=$rsize;
      var $291=$I315;
      var $cmp373=(($291)|(0))==31;
      if ($cmp373) { label = 108; break; } else { label = 109; break; }
    case 108: 
      var $cond382 = 0;label = 110; break;
    case 109: 
      var $292=$I315;
      var $shr377=$292 >>> 1;
      var $add378=((($shr377)+(8))|0);
      var $sub379=((($add378)-(2))|0);
      var $sub380=(((31)-($sub379))|0);
      var $cond382 = $sub380;label = 110; break;
    case 110: 
      var $cond382;
      var $shl383=$290 << $cond382;
      $K372=$shl383;
      label = 111; break;
    case 111: 
      var $293=$T;
      var $head385=(($293+4)|0);
      var $294=HEAP32[(($head385)>>2)];
      var $and386=$294 & -8;
      var $295=$rsize;
      var $cmp387=(($and386)|(0))!=(($295)|(0));
      if ($cmp387) { label = 112; break; } else { label = 118; break; }
    case 112: 
      var $296=$K372;
      var $shr390=$296 >>> 31;
      var $and391=$shr390 & 1;
      var $297=$T;
      var $child392=(($297+16)|0);
      var $arrayidx393=(($child392+($and391<<2))|0);
      $C=$arrayidx393;
      var $298=$K372;
      var $shl394=$298 << 1;
      $K372=$shl394;
      var $299=$C;
      var $300=HEAP32[(($299)>>2)];
      var $cmp395=(($300)|(0))!=0;
      if ($cmp395) { label = 113; break; } else { label = 114; break; }
    case 113: 
      var $301=$C;
      var $302=HEAP32[(($301)>>2)];
      $T=$302;
      label = 117; break;
    case 114: 
      var $303=$C;
      var $304=$303;
      var $305=$m_addr;
      var $least_addr399=(($305+16)|0);
      var $306=HEAP32[(($least_addr399)>>2)];
      var $cmp400=(($304)>>>(0)) >= (($306)>>>(0));
      var $conv401=(($cmp400)&(1));
      var $expval402=($conv401);
      var $tobool403=(($expval402)|(0))!=0;
      if ($tobool403) { label = 115; break; } else { label = 116; break; }
    case 115: 
      var $307=$TP;
      var $308=$C;
      HEAP32[(($308)>>2)]=$307;
      var $309=$T;
      var $310=$TP;
      var $parent405=(($310+24)|0);
      HEAP32[(($parent405)>>2)]=$309;
      var $311=$TP;
      var $312=$TP;
      var $bk406=(($312+12)|0);
      HEAP32[(($bk406)>>2)]=$311;
      var $313=$TP;
      var $fd407=(($313+8)|0);
      HEAP32[(($fd407)>>2)]=$311;
      label = 124; break;
    case 116: 
      _abort();
      throw "Reached an unreachable!";
    case 117: 
      label = 123; break;
    case 118: 
      var $314=$T;
      var $fd412=(($314+8)|0);
      var $315=HEAP32[(($fd412)>>2)];
      $F411=$315;
      var $316=$T;
      var $317=$316;
      var $318=$m_addr;
      var $least_addr413=(($318+16)|0);
      var $319=HEAP32[(($least_addr413)>>2)];
      var $cmp414=(($317)>>>(0)) >= (($319)>>>(0));
      if ($cmp414) { label = 119; break; } else { var $324 = 0;label = 120; break; }
    case 119: 
      var $320=$F411;
      var $321=$320;
      var $322=$m_addr;
      var $least_addr417=(($322+16)|0);
      var $323=HEAP32[(($least_addr417)>>2)];
      var $cmp418=(($321)>>>(0)) >= (($323)>>>(0));
      var $324 = $cmp418;label = 120; break;
    case 120: 
      var $324;
      var $land_ext421=(($324)&(1));
      var $expval422=($land_ext421);
      var $tobool423=(($expval422)|(0))!=0;
      if ($tobool423) { label = 121; break; } else { label = 122; break; }
    case 121: 
      var $325=$TP;
      var $326=$F411;
      var $bk425=(($326+12)|0);
      HEAP32[(($bk425)>>2)]=$325;
      var $327=$T;
      var $fd426=(($327+8)|0);
      HEAP32[(($fd426)>>2)]=$325;
      var $328=$F411;
      var $329=$TP;
      var $fd427=(($329+8)|0);
      HEAP32[(($fd427)>>2)]=$328;
      var $330=$T;
      var $331=$TP;
      var $bk428=(($331+12)|0);
      HEAP32[(($bk428)>>2)]=$330;
      var $332=$TP;
      var $parent429=(($332+24)|0);
      HEAP32[(($parent429)>>2)]=0;
      label = 124; break;
    case 122: 
      _abort();
      throw "Reached an unreachable!";
    case 123: 
      label = 111; break;
    case 124: 
      label = 125; break;
    case 125: 
      label = 126; break;
    case 126: 
      label = 127; break;
    case 127: 
      var $333=$v;
      var $334=$333;
      var $add_ptr436=(($334+8)|0);
      $retval=$add_ptr436;
      label = 131; break;
    case 128: 
      label = 129; break;
    case 129: 
      _abort();
      throw "Reached an unreachable!";
    case 130: 
      $retval=0;
      label = 131; break;
    case 131: 
      var $335=$retval;
      return $335;
    default: assert(0, "bad label: " + label);
  }
}
function _sys_alloc($m, $nb) {
  var label = 0;
  label = 2; 
  while(1) switch(label) {
    case 2: 
      var $retval;
      var $m_addr;
      var $nb_addr;
      var $tbase;
      var $tsize;
      var $mmap_flag;
      var $asize;
      var $mem;
      var $fp;
      var $br;
      var $ssize;
      var $ss;
      var $base;
      var $fp37;
      var $esize;
      var $end;
      var $br126;
      var $end127;
      var $ssize136;
      var $mn;
      var $sp;
      var $oldbase;
      var $rsize;
      var $p;
      var $r;
      $m_addr=$m;
      $nb_addr=$nb;
      $tbase=-1;
      $tsize=0;
      $mmap_flag=0;
      var $0=HEAP32[((((5242888)|0))>>2)];
      var $cmp=(($0)|(0))!=0;
      if ($cmp) { var $1 = 1;label = 4; break; } else { label = 3; break; }
    case 3: 
      var $call=_init_mparams();
      var $tobool=(($call)|(0))!=0;
      var $1 = $tobool;label = 4; break;
    case 4: 
      var $1;
      var $lor_ext=(($1)&(1));
      var $2=$m_addr;
      var $mflags=(($2+444)|0);
      var $3=HEAP32[(($mflags)>>2)];
      var $and=$3 & 0;
      var $tobool1=(($and)|(0))!=0;
      if ($tobool1) { label = 5; break; } else { label = 10; break; }
    case 5: 
      var $4=$nb_addr;
      var $5=HEAP32[((((5242900)|0))>>2)];
      var $cmp2=(($4)>>>(0)) >= (($5)>>>(0));
      if ($cmp2) { label = 6; break; } else { label = 10; break; }
    case 6: 
      var $6=$m_addr;
      var $topsize=(($6+12)|0);
      var $7=HEAP32[(($topsize)>>2)];
      var $cmp4=(($7)|(0))!=0;
      if ($cmp4) { label = 7; break; } else { label = 10; break; }
    case 7: 
      var $8=$m_addr;
      var $9=$nb_addr;
      var $call5=_mmap_alloc($8, $9);
      $mem=$call5;
      var $10=$mem;
      var $cmp6=(($10)|(0))!=0;
      if ($cmp6) { label = 8; break; } else { label = 9; break; }
    case 8: 
      var $11=$mem;
      $retval=$11;
      label = 104; break;
    case 9: 
      label = 10; break;
    case 10: 
      var $12=$nb_addr;
      var $add=((($12)+(48))|0);
      var $13=HEAP32[((((5242896)|0))>>2)];
      var $sub=((($13)-(1))|0);
      var $add9=((($add)+($sub))|0);
      var $14=HEAP32[((((5242896)|0))>>2)];
      var $sub10=((($14)-(1))|0);
      var $neg=$sub10 ^ -1;
      var $and11=$add9 & $neg;
      $asize=$and11;
      var $15=$asize;
      var $16=$nb_addr;
      var $cmp12=(($15)>>>(0)) <= (($16)>>>(0));
      if ($cmp12) { label = 11; break; } else { label = 12; break; }
    case 11: 
      $retval=0;
      label = 104; break;
    case 12: 
      var $17=$m_addr;
      var $footprint_limit=(($17+440)|0);
      var $18=HEAP32[(($footprint_limit)>>2)];
      var $cmp15=(($18)|(0))!=0;
      if ($cmp15) { label = 13; break; } else { label = 17; break; }
    case 13: 
      var $19=$m_addr;
      var $footprint=(($19+432)|0);
      var $20=HEAP32[(($footprint)>>2)];
      var $21=$asize;
      var $add17=((($20)+($21))|0);
      $fp=$add17;
      var $22=$fp;
      var $23=$m_addr;
      var $footprint18=(($23+432)|0);
      var $24=HEAP32[(($footprint18)>>2)];
      var $cmp19=(($22)>>>(0)) <= (($24)>>>(0));
      if ($cmp19) { label = 15; break; } else { label = 14; break; }
    case 14: 
      var $25=$fp;
      var $26=$m_addr;
      var $footprint_limit20=(($26+440)|0);
      var $27=HEAP32[(($footprint_limit20)>>2)];
      var $cmp21=(($25)>>>(0)) > (($27)>>>(0));
      if ($cmp21) { label = 15; break; } else { label = 16; break; }
    case 15: 
      $retval=0;
      label = 104; break;
    case 16: 
      label = 17; break;
    case 17: 
      var $28=$m_addr;
      var $mflags25=(($28+444)|0);
      var $29=HEAP32[(($mflags25)>>2)];
      var $and26=$29 & 4;
      var $tobool27=(($and26)|(0))!=0;
      if ($tobool27) { label = 54; break; } else { label = 18; break; }
    case 18: 
      $br=-1;
      var $30=$asize;
      $ssize=$30;
      var $31=$m_addr;
      var $top=(($31+24)|0);
      var $32=HEAP32[(($top)>>2)];
      var $cmp29=(($32)|(0))==0;
      if ($cmp29) { label = 19; break; } else { label = 20; break; }
    case 19: 
      var $cond = 0;label = 21; break;
    case 20: 
      var $33=$m_addr;
      var $34=$m_addr;
      var $top30=(($34+24)|0);
      var $35=HEAP32[(($top30)>>2)];
      var $36=$35;
      var $call31=_segment_holding($33, $36);
      var $cond = $call31;label = 21; break;
    case 21: 
      var $cond;
      $ss=$cond;
      var $37=$ss;
      var $cmp32=(($37)|(0))==0;
      if ($cmp32) { label = 22; break; } else { label = 34; break; }
    case 22: 
      var $call34=_sbrk(0);
      $base=$call34;
      var $38=$base;
      var $cmp35=(($38)|(0))!=-1;
      if ($cmp35) { label = 23; break; } else { label = 33; break; }
    case 23: 
      var $39=$base;
      var $40=$39;
      var $41=HEAP32[((((5242892)|0))>>2)];
      var $sub38=((($41)-(1))|0);
      var $and39=$40 & $sub38;
      var $cmp40=(($and39)|(0))==0;
      if ($cmp40) { label = 25; break; } else { label = 24; break; }
    case 24: 
      var $42=$base;
      var $43=$42;
      var $44=HEAP32[((((5242892)|0))>>2)];
      var $sub42=((($44)-(1))|0);
      var $add43=((($43)+($sub42))|0);
      var $45=HEAP32[((((5242892)|0))>>2)];
      var $sub44=((($45)-(1))|0);
      var $neg45=$sub44 ^ -1;
      var $and46=$add43 & $neg45;
      var $46=$base;
      var $47=$46;
      var $sub47=((($and46)-($47))|0);
      var $48=$ssize;
      var $add48=((($48)+($sub47))|0);
      $ssize=$add48;
      label = 25; break;
    case 25: 
      var $49=$m_addr;
      var $footprint50=(($49+432)|0);
      var $50=HEAP32[(($footprint50)>>2)];
      var $51=$ssize;
      var $add51=((($50)+($51))|0);
      $fp37=$add51;
      var $52=$ssize;
      var $53=$nb_addr;
      var $cmp52=(($52)>>>(0)) > (($53)>>>(0));
      if ($cmp52) { label = 26; break; } else { label = 32; break; }
    case 26: 
      var $54=$ssize;
      var $cmp54=(($54)>>>(0)) < 2147483647;
      if ($cmp54) { label = 27; break; } else { label = 32; break; }
    case 27: 
      var $55=$m_addr;
      var $footprint_limit56=(($55+440)|0);
      var $56=HEAP32[(($footprint_limit56)>>2)];
      var $cmp57=(($56)|(0))==0;
      if ($cmp57) { label = 30; break; } else { label = 28; break; }
    case 28: 
      var $57=$fp37;
      var $58=$m_addr;
      var $footprint59=(($58+432)|0);
      var $59=HEAP32[(($footprint59)>>2)];
      var $cmp60=(($57)>>>(0)) > (($59)>>>(0));
      if ($cmp60) { label = 29; break; } else { label = 32; break; }
    case 29: 
      var $60=$fp37;
      var $61=$m_addr;
      var $footprint_limit62=(($61+440)|0);
      var $62=HEAP32[(($footprint_limit62)>>2)];
      var $cmp63=(($60)>>>(0)) <= (($62)>>>(0));
      if ($cmp63) { label = 30; break; } else { label = 32; break; }
    case 30: 
      var $63=$ssize;
      var $call65=_sbrk($63);
      $br=$call65;
      var $64=$base;
      var $cmp66=(($call65)|(0))==(($64)|(0));
      if ($cmp66) { label = 31; break; } else { label = 32; break; }
    case 31: 
      var $65=$base;
      $tbase=$65;
      var $66=$ssize;
      $tsize=$66;
      label = 32; break;
    case 32: 
      label = 33; break;
    case 33: 
      label = 38; break;
    case 34: 
      var $67=$nb_addr;
      var $68=$m_addr;
      var $topsize70=(($68+12)|0);
      var $69=HEAP32[(($topsize70)>>2)];
      var $sub71=((($67)-($69))|0);
      var $add72=((($sub71)+(48))|0);
      var $70=HEAP32[((((5242896)|0))>>2)];
      var $sub73=((($70)-(1))|0);
      var $add74=((($add72)+($sub73))|0);
      var $71=HEAP32[((((5242896)|0))>>2)];
      var $sub75=((($71)-(1))|0);
      var $neg76=$sub75 ^ -1;
      var $and77=$add74 & $neg76;
      $ssize=$and77;
      var $72=$ssize;
      var $cmp78=(($72)>>>(0)) < 2147483647;
      if ($cmp78) { label = 35; break; } else { label = 37; break; }
    case 35: 
      var $73=$ssize;
      var $call80=_sbrk($73);
      $br=$call80;
      var $74=$ss;
      var $base81=(($74)|0);
      var $75=HEAP32[(($base81)>>2)];
      var $76=$ss;
      var $size=(($76+4)|0);
      var $77=HEAP32[(($size)>>2)];
      var $add_ptr=(($75+$77)|0);
      var $cmp82=(($call80)|(0))==(($add_ptr)|(0));
      if ($cmp82) { label = 36; break; } else { label = 37; break; }
    case 36: 
      var $78=$br;
      $tbase=$78;
      var $79=$ssize;
      $tsize=$79;
      label = 37; break;
    case 37: 
      label = 38; break;
    case 38: 
      var $80=$tbase;
      var $cmp86=(($80)|(0))==-1;
      if ($cmp86) { label = 39; break; } else { label = 53; break; }
    case 39: 
      var $81=$br;
      var $cmp88=(($81)|(0))!=-1;
      if ($cmp88) { label = 40; break; } else { label = 49; break; }
    case 40: 
      var $82=$ssize;
      var $cmp90=(($82)>>>(0)) < 2147483647;
      if ($cmp90) { label = 41; break; } else { label = 48; break; }
    case 41: 
      var $83=$ssize;
      var $84=$nb_addr;
      var $add92=((($84)+(48))|0);
      var $cmp93=(($83)>>>(0)) < (($add92)>>>(0));
      if ($cmp93) { label = 42; break; } else { label = 48; break; }
    case 42: 
      var $85=$nb_addr;
      var $add95=((($85)+(48))|0);
      var $86=$ssize;
      var $sub96=((($add95)-($86))|0);
      var $87=HEAP32[((((5242896)|0))>>2)];
      var $sub97=((($87)-(1))|0);
      var $add98=((($sub96)+($sub97))|0);
      var $88=HEAP32[((((5242896)|0))>>2)];
      var $sub99=((($88)-(1))|0);
      var $neg100=$sub99 ^ -1;
      var $and101=$add98 & $neg100;
      $esize=$and101;
      var $89=$esize;
      var $cmp102=(($89)>>>(0)) < 2147483647;
      if ($cmp102) { label = 43; break; } else { label = 47; break; }
    case 43: 
      var $90=$esize;
      var $call104=_sbrk($90);
      $end=$call104;
      var $91=$end;
      var $cmp105=(($91)|(0))!=-1;
      if ($cmp105) { label = 44; break; } else { label = 45; break; }
    case 44: 
      var $92=$esize;
      var $93=$ssize;
      var $add107=((($93)+($92))|0);
      $ssize=$add107;
      label = 46; break;
    case 45: 
      var $94=$ssize;
      var $sub109=(((-$94))|0);
      var $call110=_sbrk($sub109);
      $br=-1;
      label = 46; break;
    case 46: 
      label = 47; break;
    case 47: 
      label = 48; break;
    case 48: 
      label = 49; break;
    case 49: 
      var $95=$br;
      var $cmp115=(($95)|(0))!=-1;
      if ($cmp115) { label = 50; break; } else { label = 51; break; }
    case 50: 
      var $96=$br;
      $tbase=$96;
      var $97=$ssize;
      $tsize=$97;
      label = 52; break;
    case 51: 
      var $98=$m_addr;
      var $mflags118=(($98+444)|0);
      var $99=HEAP32[(($mflags118)>>2)];
      var $or=$99 | 4;
      HEAP32[(($mflags118)>>2)]=$or;
      label = 52; break;
    case 52: 
      label = 53; break;
    case 53: 
      label = 54; break;
    case 54: 
      var $100=$tbase;
      var $cmp122=(($100)|(0))==-1;
      if ($cmp122) { label = 55; break; } else { label = 64; break; }
    case 55: 
      var $101=$asize;
      var $cmp124=(($101)>>>(0)) < 2147483647;
      if ($cmp124) { label = 56; break; } else { label = 63; break; }
    case 56: 
      $br126=-1;
      $end127=-1;
      var $102=$asize;
      var $call128=_sbrk($102);
      $br126=$call128;
      var $call129=_sbrk(0);
      $end127=$call129;
      var $103=$br126;
      var $cmp130=(($103)|(0))!=-1;
      if ($cmp130) { label = 57; break; } else { label = 62; break; }
    case 57: 
      var $104=$end127;
      var $cmp132=(($104)|(0))!=-1;
      if ($cmp132) { label = 58; break; } else { label = 62; break; }
    case 58: 
      var $105=$br126;
      var $106=$end127;
      var $cmp134=(($105)>>>(0)) < (($106)>>>(0));
      if ($cmp134) { label = 59; break; } else { label = 62; break; }
    case 59: 
      var $107=$end127;
      var $108=$br126;
      var $sub_ptr_lhs_cast=$107;
      var $sub_ptr_rhs_cast=$108;
      var $sub_ptr_sub=((($sub_ptr_lhs_cast)-($sub_ptr_rhs_cast))|0);
      $ssize136=$sub_ptr_sub;
      var $109=$ssize136;
      var $110=$nb_addr;
      var $add137=((($110)+(40))|0);
      var $cmp138=(($109)>>>(0)) > (($add137)>>>(0));
      if ($cmp138) { label = 60; break; } else { label = 61; break; }
    case 60: 
      var $111=$br126;
      $tbase=$111;
      var $112=$ssize136;
      $tsize=$112;
      label = 61; break;
    case 61: 
      label = 62; break;
    case 62: 
      label = 63; break;
    case 63: 
      label = 64; break;
    case 64: 
      var $113=$tbase;
      var $cmp144=(($113)|(0))!=-1;
      if ($cmp144) { label = 65; break; } else { label = 103; break; }
    case 65: 
      var $114=$tsize;
      var $115=$m_addr;
      var $footprint146=(($115+432)|0);
      var $116=HEAP32[(($footprint146)>>2)];
      var $add147=((($116)+($114))|0);
      HEAP32[(($footprint146)>>2)]=$add147;
      var $117=$m_addr;
      var $max_footprint=(($117+436)|0);
      var $118=HEAP32[(($max_footprint)>>2)];
      var $cmp148=(($add147)>>>(0)) > (($118)>>>(0));
      if ($cmp148) { label = 66; break; } else { label = 67; break; }
    case 66: 
      var $119=$m_addr;
      var $footprint150=(($119+432)|0);
      var $120=HEAP32[(($footprint150)>>2)];
      var $121=$m_addr;
      var $max_footprint151=(($121+436)|0);
      HEAP32[(($max_footprint151)>>2)]=$120;
      label = 67; break;
    case 67: 
      var $122=$m_addr;
      var $top153=(($122+24)|0);
      var $123=HEAP32[(($top153)>>2)];
      var $cmp154=(($123)|(0))!=0;
      if ($cmp154) { label = 75; break; } else { label = 68; break; }
    case 68: 
      var $124=$m_addr;
      var $least_addr=(($124+16)|0);
      var $125=HEAP32[(($least_addr)>>2)];
      var $cmp156=(($125)|(0))==0;
      if ($cmp156) { label = 70; break; } else { label = 69; break; }
    case 69: 
      var $126=$tbase;
      var $127=$m_addr;
      var $least_addr158=(($127+16)|0);
      var $128=HEAP32[(($least_addr158)>>2)];
      var $cmp159=(($126)>>>(0)) < (($128)>>>(0));
      if ($cmp159) { label = 70; break; } else { label = 71; break; }
    case 70: 
      var $129=$tbase;
      var $130=$m_addr;
      var $least_addr161=(($130+16)|0);
      HEAP32[(($least_addr161)>>2)]=$129;
      label = 71; break;
    case 71: 
      var $131=$tbase;
      var $132=$m_addr;
      var $seg=(($132+448)|0);
      var $base163=(($seg)|0);
      HEAP32[(($base163)>>2)]=$131;
      var $133=$tsize;
      var $134=$m_addr;
      var $seg164=(($134+448)|0);
      var $size165=(($seg164+4)|0);
      HEAP32[(($size165)>>2)]=$133;
      var $135=$mmap_flag;
      var $136=$m_addr;
      var $seg166=(($136+448)|0);
      var $sflags=(($seg166+12)|0);
      HEAP32[(($sflags)>>2)]=$135;
      var $137=HEAP32[((((5242888)|0))>>2)];
      var $138=$m_addr;
      var $magic=(($138+36)|0);
      HEAP32[(($magic)>>2)]=$137;
      var $139=$m_addr;
      var $release_checks=(($139+32)|0);
      HEAP32[(($release_checks)>>2)]=-1;
      var $140=$m_addr;
      _init_bins($140);
      var $141=$m_addr;
      var $cmp167=(($141)|(0))==5242944;
      if ($cmp167) { label = 72; break; } else { label = 73; break; }
    case 72: 
      var $142=$m_addr;
      var $143=$tbase;
      var $144=$143;
      var $145=$tsize;
      var $sub169=((($145)-(40))|0);
      _init_top($142, $144, $sub169);
      label = 74; break;
    case 73: 
      var $146=$m_addr;
      var $147=$146;
      var $add_ptr171=((($147)-(8))|0);
      var $148=$add_ptr171;
      var $149=$148;
      var $150=$m_addr;
      var $151=$150;
      var $add_ptr172=((($151)-(8))|0);
      var $152=$add_ptr172;
      var $head=(($152+4)|0);
      var $153=HEAP32[(($head)>>2)];
      var $and173=$153 & -8;
      var $add_ptr174=(($149+$and173)|0);
      var $154=$add_ptr174;
      $mn=$154;
      var $155=$m_addr;
      var $156=$mn;
      var $157=$tbase;
      var $158=$tsize;
      var $add_ptr175=(($157+$158)|0);
      var $159=$mn;
      var $160=$159;
      var $sub_ptr_lhs_cast176=$add_ptr175;
      var $sub_ptr_rhs_cast177=$160;
      var $sub_ptr_sub178=((($sub_ptr_lhs_cast176)-($sub_ptr_rhs_cast177))|0);
      var $sub179=((($sub_ptr_sub178)-(40))|0);
      _init_top($155, $156, $sub179);
      label = 74; break;
    case 74: 
      label = 100; break;
    case 75: 
      var $161=$m_addr;
      var $seg182=(($161+448)|0);
      $sp=$seg182;
      label = 76; break;
    case 76: 
      var $162=$sp;
      var $cmp183=(($162)|(0))!=0;
      if ($cmp183) { label = 77; break; } else { var $168 = 0;label = 78; break; }
    case 77: 
      var $163=$tbase;
      var $164=$sp;
      var $base184=(($164)|0);
      var $165=HEAP32[(($base184)>>2)];
      var $166=$sp;
      var $size185=(($166+4)|0);
      var $167=HEAP32[(($size185)>>2)];
      var $add_ptr186=(($165+$167)|0);
      var $cmp187=(($163)|(0))!=(($add_ptr186)|(0));
      var $168 = $cmp187;label = 78; break;
    case 78: 
      var $168;
      if ($168) { label = 79; break; } else { label = 80; break; }
    case 79: 
      var $169=$sp;
      var $next=(($169+8)|0);
      var $170=HEAP32[(($next)>>2)];
      $sp=$170;
      label = 76; break;
    case 80: 
      var $171=$sp;
      var $cmp188=(($171)|(0))!=0;
      if ($cmp188) { label = 81; break; } else { label = 86; break; }
    case 81: 
      var $172=$sp;
      var $sflags190=(($172+12)|0);
      var $173=HEAP32[(($sflags190)>>2)];
      var $and191=$173 & 8;
      var $tobool192=(($and191)|(0))!=0;
      if ($tobool192) { label = 86; break; } else { label = 82; break; }
    case 82: 
      var $174=$sp;
      var $sflags194=(($174+12)|0);
      var $175=HEAP32[(($sflags194)>>2)];
      var $and195=$175 & 0;
      var $176=$mmap_flag;
      var $cmp196=(($and195)|(0))==(($176)|(0));
      if ($cmp196) { label = 83; break; } else { label = 86; break; }
    case 83: 
      var $177=$m_addr;
      var $top198=(($177+24)|0);
      var $178=HEAP32[(($top198)>>2)];
      var $179=$178;
      var $180=$sp;
      var $base199=(($180)|0);
      var $181=HEAP32[(($base199)>>2)];
      var $cmp200=(($179)>>>(0)) >= (($181)>>>(0));
      if ($cmp200) { label = 84; break; } else { label = 86; break; }
    case 84: 
      var $182=$m_addr;
      var $top202=(($182+24)|0);
      var $183=HEAP32[(($top202)>>2)];
      var $184=$183;
      var $185=$sp;
      var $base203=(($185)|0);
      var $186=HEAP32[(($base203)>>2)];
      var $187=$sp;
      var $size204=(($187+4)|0);
      var $188=HEAP32[(($size204)>>2)];
      var $add_ptr205=(($186+$188)|0);
      var $cmp206=(($184)>>>(0)) < (($add_ptr205)>>>(0));
      if ($cmp206) { label = 85; break; } else { label = 86; break; }
    case 85: 
      var $189=$tsize;
      var $190=$sp;
      var $size208=(($190+4)|0);
      var $191=HEAP32[(($size208)>>2)];
      var $add209=((($191)+($189))|0);
      HEAP32[(($size208)>>2)]=$add209;
      var $192=$m_addr;
      var $193=$m_addr;
      var $top210=(($193+24)|0);
      var $194=HEAP32[(($top210)>>2)];
      var $195=$m_addr;
      var $topsize211=(($195+12)|0);
      var $196=HEAP32[(($topsize211)>>2)];
      var $197=$tsize;
      var $add212=((($196)+($197))|0);
      _init_top($192, $194, $add212);
      label = 99; break;
    case 86: 
      var $198=$tbase;
      var $199=$m_addr;
      var $least_addr214=(($199+16)|0);
      var $200=HEAP32[(($least_addr214)>>2)];
      var $cmp215=(($198)>>>(0)) < (($200)>>>(0));
      if ($cmp215) { label = 87; break; } else { label = 88; break; }
    case 87: 
      var $201=$tbase;
      var $202=$m_addr;
      var $least_addr217=(($202+16)|0);
      HEAP32[(($least_addr217)>>2)]=$201;
      label = 88; break;
    case 88: 
      var $203=$m_addr;
      var $seg219=(($203+448)|0);
      $sp=$seg219;
      label = 89; break;
    case 89: 
      var $204=$sp;
      var $cmp221=(($204)|(0))!=0;
      if ($cmp221) { label = 90; break; } else { var $209 = 0;label = 91; break; }
    case 90: 
      var $205=$sp;
      var $base223=(($205)|0);
      var $206=HEAP32[(($base223)>>2)];
      var $207=$tbase;
      var $208=$tsize;
      var $add_ptr224=(($207+$208)|0);
      var $cmp225=(($206)|(0))!=(($add_ptr224)|(0));
      var $209 = $cmp225;label = 91; break;
    case 91: 
      var $209;
      if ($209) { label = 92; break; } else { label = 93; break; }
    case 92: 
      var $210=$sp;
      var $next228=(($210+8)|0);
      var $211=HEAP32[(($next228)>>2)];
      $sp=$211;
      label = 89; break;
    case 93: 
      var $212=$sp;
      var $cmp230=(($212)|(0))!=0;
      if ($cmp230) { label = 94; break; } else { label = 97; break; }
    case 94: 
      var $213=$sp;
      var $sflags232=(($213+12)|0);
      var $214=HEAP32[(($sflags232)>>2)];
      var $and233=$214 & 8;
      var $tobool234=(($and233)|(0))!=0;
      if ($tobool234) { label = 97; break; } else { label = 95; break; }
    case 95: 
      var $215=$sp;
      var $sflags236=(($215+12)|0);
      var $216=HEAP32[(($sflags236)>>2)];
      var $and237=$216 & 0;
      var $217=$mmap_flag;
      var $cmp238=(($and237)|(0))==(($217)|(0));
      if ($cmp238) { label = 96; break; } else { label = 97; break; }
    case 96: 
      var $218=$sp;
      var $base240=(($218)|0);
      var $219=HEAP32[(($base240)>>2)];
      $oldbase=$219;
      var $220=$tbase;
      var $221=$sp;
      var $base241=(($221)|0);
      HEAP32[(($base241)>>2)]=$220;
      var $222=$tsize;
      var $223=$sp;
      var $size242=(($223+4)|0);
      var $224=HEAP32[(($size242)>>2)];
      var $add243=((($224)+($222))|0);
      HEAP32[(($size242)>>2)]=$add243;
      var $225=$m_addr;
      var $226=$tbase;
      var $227=$oldbase;
      var $228=$nb_addr;
      var $call244=_prepend_alloc($225, $226, $227, $228);
      $retval=$call244;
      label = 104; break;
    case 97: 
      var $229=$m_addr;
      var $230=$tbase;
      var $231=$tsize;
      var $232=$mmap_flag;
      _add_segment($229, $230, $231, $232);
      label = 98; break;
    case 98: 
      label = 99; break;
    case 99: 
      label = 100; break;
    case 100: 
      var $233=$nb_addr;
      var $234=$m_addr;
      var $topsize249=(($234+12)|0);
      var $235=HEAP32[(($topsize249)>>2)];
      var $cmp250=(($233)>>>(0)) < (($235)>>>(0));
      if ($cmp250) { label = 101; break; } else { label = 102; break; }
    case 101: 
      var $236=$nb_addr;
      var $237=$m_addr;
      var $topsize252=(($237+12)|0);
      var $238=HEAP32[(($topsize252)>>2)];
      var $sub253=((($238)-($236))|0);
      HEAP32[(($topsize252)>>2)]=$sub253;
      $rsize=$sub253;
      var $239=$m_addr;
      var $top254=(($239+24)|0);
      var $240=HEAP32[(($top254)>>2)];
      $p=$240;
      var $241=$p;
      var $242=$241;
      var $243=$nb_addr;
      var $add_ptr255=(($242+$243)|0);
      var $244=$add_ptr255;
      var $245=$m_addr;
      var $top256=(($245+24)|0);
      HEAP32[(($top256)>>2)]=$244;
      $r=$244;
      var $246=$rsize;
      var $or257=$246 | 1;
      var $247=$r;
      var $head258=(($247+4)|0);
      HEAP32[(($head258)>>2)]=$or257;
      var $248=$nb_addr;
      var $or259=$248 | 1;
      var $or260=$or259 | 2;
      var $249=$p;
      var $head261=(($249+4)|0);
      HEAP32[(($head261)>>2)]=$or260;
      var $250=$p;
      var $251=$250;
      var $add_ptr262=(($251+8)|0);
      $retval=$add_ptr262;
      label = 104; break;
    case 102: 
      label = 103; break;
    case 103: 
      var $call265=___errno_location();
      HEAP32[(($call265)>>2)]=12;
      $retval=0;
      label = 104; break;
    case 104: 
      var $252=$retval;
      return $252;
    default: assert(0, "bad label: " + label);
  }
}
function _free($mem) {
  var label = 0;
  label = 2; 
  while(1) switch(label) {
    case 2: 
      var $mem_addr;
      var $p;
      var $psize;
      var $next;
      var $prevsize;
      var $prev;
      var $F;
      var $B;
      var $I;
      var $TP;
      var $XP;
      var $R;
      var $F77;
      var $RP;
      var $CP;
      var $H;
      var $C0;
      var $C1;
      var $tsize;
      var $dsize;
      var $nsize;
      var $F271;
      var $B273;
      var $I275;
      var $TP328;
      var $XP329;
      var $R331;
      var $F336;
      var $RP359;
      var $CP370;
      var $H397;
      var $C0439;
      var $C1440;
      var $I501;
      var $B503;
      var $F506;
      var $tp;
      var $H529;
      var $I530;
      var $X;
      var $Y;
      var $N;
      var $K;
      var $T;
      var $K579;
      var $C;
      var $F612;
      $mem_addr=$mem;
      var $0=$mem_addr;
      var $cmp=(($0)|(0))!=0;
      if ($cmp) { label = 3; break; } else { label = 215; break; }
    case 3: 
      var $1=$mem_addr;
      var $add_ptr=((($1)-(8))|0);
      var $2=$add_ptr;
      $p=$2;
      var $3=$p;
      var $4=$3;
      var $5=HEAP32[((((5242960)|0))>>2)];
      var $cmp1=(($4)>>>(0)) >= (($5)>>>(0));
      if ($cmp1) { label = 4; break; } else { var $8 = 0;label = 5; break; }
    case 4: 
      var $6=$p;
      var $head=(($6+4)|0);
      var $7=HEAP32[(($head)>>2)];
      var $and=$7 & 3;
      var $cmp2=(($and)|(0))!=1;
      var $8 = $cmp2;label = 5; break;
    case 5: 
      var $8;
      var $land_ext=(($8)&(1));
      var $expval=($land_ext);
      var $tobool=(($expval)|(0))!=0;
      if ($tobool) { label = 6; break; } else { label = 212; break; }
    case 6: 
      var $9=$p;
      var $head4=(($9+4)|0);
      var $10=HEAP32[(($head4)>>2)];
      var $and5=$10 & -8;
      $psize=$and5;
      var $11=$p;
      var $12=$11;
      var $13=$psize;
      var $add_ptr6=(($12+$13)|0);
      var $14=$add_ptr6;
      $next=$14;
      var $15=$p;
      var $head7=(($15+4)|0);
      var $16=HEAP32[(($head7)>>2)];
      var $and8=$16 & 1;
      var $tobool9=(($and8)|(0))!=0;
      if ($tobool9) { label = 87; break; } else { label = 7; break; }
    case 7: 
      var $17=$p;
      var $prev_foot=(($17)|0);
      var $18=HEAP32[(($prev_foot)>>2)];
      $prevsize=$18;
      var $19=$p;
      var $head11=(($19+4)|0);
      var $20=HEAP32[(($head11)>>2)];
      var $and12=$20 & 3;
      var $cmp13=(($and12)|(0))==0;
      if ($cmp13) { label = 8; break; } else { label = 9; break; }
    case 8: 
      var $21=$prevsize;
      var $add=((($21)+(16))|0);
      var $22=$psize;
      var $add15=((($22)+($add))|0);
      $psize=$add15;
      label = 214; break;
    case 9: 
      var $23=$p;
      var $24=$23;
      var $25=$prevsize;
      var $idx_neg=(((-$25))|0);
      var $add_ptr16=(($24+$idx_neg)|0);
      var $26=$add_ptr16;
      $prev=$26;
      var $27=$prevsize;
      var $28=$psize;
      var $add17=((($28)+($27))|0);
      $psize=$add17;
      var $29=$prev;
      $p=$29;
      var $30=$prev;
      var $31=$30;
      var $32=HEAP32[((((5242960)|0))>>2)];
      var $cmp18=(($31)>>>(0)) >= (($32)>>>(0));
      var $conv=(($cmp18)&(1));
      var $expval19=($conv);
      var $tobool20=(($expval19)|(0))!=0;
      if ($tobool20) { label = 10; break; } else { label = 84; break; }
    case 10: 
      var $33=$p;
      var $34=HEAP32[((((5242964)|0))>>2)];
      var $cmp22=(($33)|(0))!=(($34)|(0));
      if ($cmp22) { label = 11; break; } else { label = 80; break; }
    case 11: 
      var $35=$prevsize;
      var $shr=$35 >>> 3;
      var $cmp25=(($shr)>>>(0)) < 32;
      if ($cmp25) { label = 12; break; } else { label = 30; break; }
    case 12: 
      var $36=$p;
      var $fd=(($36+8)|0);
      var $37=HEAP32[(($fd)>>2)];
      $F=$37;
      var $38=$p;
      var $bk=(($38+12)|0);
      var $39=HEAP32[(($bk)>>2)];
      $B=$39;
      var $40=$prevsize;
      var $shr28=$40 >>> 3;
      $I=$shr28;
      var $41=$F;
      var $42=$I;
      var $shl=$42 << 1;
      var $arrayidx=((((5242984)|0)+($shl<<2))|0);
      var $43=$arrayidx;
      var $44=$43;
      var $cmp29=(($41)|(0))==(($44)|(0));
      if ($cmp29) { var $52 = 1;label = 16; break; } else { label = 13; break; }
    case 13: 
      var $45=$F;
      var $46=$45;
      var $47=HEAP32[((((5242960)|0))>>2)];
      var $cmp31=(($46)>>>(0)) >= (($47)>>>(0));
      if ($cmp31) { label = 14; break; } else { var $51 = 0;label = 15; break; }
    case 14: 
      var $48=$F;
      var $bk34=(($48+12)|0);
      var $49=HEAP32[(($bk34)>>2)];
      var $50=$p;
      var $cmp35=(($49)|(0))==(($50)|(0));
      var $51 = $cmp35;label = 15; break;
    case 15: 
      var $51;
      var $52 = $51;label = 16; break;
    case 16: 
      var $52;
      var $lor_ext=(($52)&(1));
      var $expval39=($lor_ext);
      var $tobool40=(($expval39)|(0))!=0;
      if ($tobool40) { label = 17; break; } else { label = 28; break; }
    case 17: 
      var $53=$B;
      var $54=$F;
      var $cmp42=(($53)|(0))==(($54)|(0));
      if ($cmp42) { label = 18; break; } else { label = 19; break; }
    case 18: 
      var $55=$I;
      var $shl45=1 << $55;
      var $neg=$shl45 ^ -1;
      var $56=HEAP32[((((5242944)|0))>>2)];
      var $and46=$56 & $neg;
      HEAP32[((((5242944)|0))>>2)]=$and46;
      label = 27; break;
    case 19: 
      var $57=$B;
      var $58=$I;
      var $shl48=$58 << 1;
      var $arrayidx49=((((5242984)|0)+($shl48<<2))|0);
      var $59=$arrayidx49;
      var $60=$59;
      var $cmp50=(($57)|(0))==(($60)|(0));
      if ($cmp50) { var $68 = 1;label = 23; break; } else { label = 20; break; }
    case 20: 
      var $61=$B;
      var $62=$61;
      var $63=HEAP32[((((5242960)|0))>>2)];
      var $cmp53=(($62)>>>(0)) >= (($63)>>>(0));
      if ($cmp53) { label = 21; break; } else { var $67 = 0;label = 22; break; }
    case 21: 
      var $64=$B;
      var $fd56=(($64+8)|0);
      var $65=HEAP32[(($fd56)>>2)];
      var $66=$p;
      var $cmp57=(($65)|(0))==(($66)|(0));
      var $67 = $cmp57;label = 22; break;
    case 22: 
      var $67;
      var $68 = $67;label = 23; break;
    case 23: 
      var $68;
      var $lor_ext62=(($68)&(1));
      var $expval63=($lor_ext62);
      var $tobool64=(($expval63)|(0))!=0;
      if ($tobool64) { label = 24; break; } else { label = 25; break; }
    case 24: 
      var $69=$B;
      var $70=$F;
      var $bk66=(($70+12)|0);
      HEAP32[(($bk66)>>2)]=$69;
      var $71=$F;
      var $72=$B;
      var $fd67=(($72+8)|0);
      HEAP32[(($fd67)>>2)]=$71;
      label = 26; break;
    case 25: 
      _abort();
      throw "Reached an unreachable!";
    case 26: 
      label = 27; break;
    case 27: 
      label = 29; break;
    case 28: 
      _abort();
      throw "Reached an unreachable!";
    case 29: 
      label = 79; break;
    case 30: 
      var $73=$p;
      var $74=$73;
      $TP=$74;
      var $75=$TP;
      var $parent=(($75+24)|0);
      var $76=HEAP32[(($parent)>>2)];
      $XP=$76;
      var $77=$TP;
      var $bk73=(($77+12)|0);
      var $78=HEAP32[(($bk73)>>2)];
      var $79=$TP;
      var $cmp74=(($78)|(0))!=(($79)|(0));
      if ($cmp74) { label = 31; break; } else { label = 38; break; }
    case 31: 
      var $80=$TP;
      var $fd78=(($80+8)|0);
      var $81=HEAP32[(($fd78)>>2)];
      $F77=$81;
      var $82=$TP;
      var $bk79=(($82+12)|0);
      var $83=HEAP32[(($bk79)>>2)];
      $R=$83;
      var $84=$F77;
      var $85=$84;
      var $86=HEAP32[((((5242960)|0))>>2)];
      var $cmp80=(($85)>>>(0)) >= (($86)>>>(0));
      if ($cmp80) { label = 32; break; } else { var $93 = 0;label = 34; break; }
    case 32: 
      var $87=$F77;
      var $bk82=(($87+12)|0);
      var $88=HEAP32[(($bk82)>>2)];
      var $89=$TP;
      var $cmp83=(($88)|(0))==(($89)|(0));
      if ($cmp83) { label = 33; break; } else { var $93 = 0;label = 34; break; }
    case 33: 
      var $90=$R;
      var $fd86=(($90+8)|0);
      var $91=HEAP32[(($fd86)>>2)];
      var $92=$TP;
      var $cmp87=(($91)|(0))==(($92)|(0));
      var $93 = $cmp87;label = 34; break;
    case 34: 
      var $93;
      var $land_ext90=(($93)&(1));
      var $expval91=($land_ext90);
      var $tobool92=(($expval91)|(0))!=0;
      if ($tobool92) { label = 35; break; } else { label = 36; break; }
    case 35: 
      var $94=$R;
      var $95=$F77;
      var $bk94=(($95+12)|0);
      HEAP32[(($bk94)>>2)]=$94;
      var $96=$F77;
      var $97=$R;
      var $fd95=(($97+8)|0);
      HEAP32[(($fd95)>>2)]=$96;
      label = 37; break;
    case 36: 
      _abort();
      throw "Reached an unreachable!";
    case 37: 
      label = 50; break;
    case 38: 
      var $98=$TP;
      var $child=(($98+16)|0);
      var $arrayidx99=(($child+4)|0);
      $RP=$arrayidx99;
      var $99=HEAP32[(($arrayidx99)>>2)];
      $R=$99;
      var $cmp100=(($99)|(0))!=0;
      if ($cmp100) { label = 40; break; } else { label = 39; break; }
    case 39: 
      var $100=$TP;
      var $child102=(($100+16)|0);
      var $arrayidx103=(($child102)|0);
      $RP=$arrayidx103;
      var $101=HEAP32[(($arrayidx103)>>2)];
      $R=$101;
      var $cmp104=(($101)|(0))!=0;
      if ($cmp104) { label = 40; break; } else { label = 49; break; }
    case 40: 
      label = 41; break;
    case 41: 
      var $102=$R;
      var $child107=(($102+16)|0);
      var $arrayidx108=(($child107+4)|0);
      $CP=$arrayidx108;
      var $103=HEAP32[(($arrayidx108)>>2)];
      var $cmp109=(($103)|(0))!=0;
      if ($cmp109) { var $106 = 1;label = 43; break; } else { label = 42; break; }
    case 42: 
      var $104=$R;
      var $child112=(($104+16)|0);
      var $arrayidx113=(($child112)|0);
      $CP=$arrayidx113;
      var $105=HEAP32[(($arrayidx113)>>2)];
      var $cmp114=(($105)|(0))!=0;
      var $106 = $cmp114;label = 43; break;
    case 43: 
      var $106;
      if ($106) { label = 44; break; } else { label = 45; break; }
    case 44: 
      var $107=$CP;
      $RP=$107;
      var $108=HEAP32[(($107)>>2)];
      $R=$108;
      label = 41; break;
    case 45: 
      var $109=$RP;
      var $110=$109;
      var $111=HEAP32[((((5242960)|0))>>2)];
      var $cmp118=(($110)>>>(0)) >= (($111)>>>(0));
      var $conv119=(($cmp118)&(1));
      var $expval120=($conv119);
      var $tobool121=(($expval120)|(0))!=0;
      if ($tobool121) { label = 46; break; } else { label = 47; break; }
    case 46: 
      var $112=$RP;
      HEAP32[(($112)>>2)]=0;
      label = 48; break;
    case 47: 
      _abort();
      throw "Reached an unreachable!";
    case 48: 
      label = 49; break;
    case 49: 
      label = 50; break;
    case 50: 
      var $113=$XP;
      var $cmp127=(($113)|(0))!=0;
      if ($cmp127) { label = 51; break; } else { label = 78; break; }
    case 51: 
      var $114=$TP;
      var $index=(($114+28)|0);
      var $115=HEAP32[(($index)>>2)];
      var $arrayidx130=((((5243248)|0)+($115<<2))|0);
      $H=$arrayidx130;
      var $116=$TP;
      var $117=$H;
      var $118=HEAP32[(($117)>>2)];
      var $cmp131=(($116)|(0))==(($118)|(0));
      if ($cmp131) { label = 52; break; } else { label = 55; break; }
    case 52: 
      var $119=$R;
      var $120=$H;
      HEAP32[(($120)>>2)]=$119;
      var $cmp134=(($119)|(0))==0;
      if ($cmp134) { label = 53; break; } else { label = 54; break; }
    case 53: 
      var $121=$TP;
      var $index137=(($121+28)|0);
      var $122=HEAP32[(($index137)>>2)];
      var $shl138=1 << $122;
      var $neg139=$shl138 ^ -1;
      var $123=HEAP32[((((5242948)|0))>>2)];
      var $and140=$123 & $neg139;
      HEAP32[((((5242948)|0))>>2)]=$and140;
      label = 54; break;
    case 54: 
      label = 62; break;
    case 55: 
      var $124=$XP;
      var $125=$124;
      var $126=HEAP32[((((5242960)|0))>>2)];
      var $cmp143=(($125)>>>(0)) >= (($126)>>>(0));
      var $conv144=(($cmp143)&(1));
      var $expval145=($conv144);
      var $tobool146=(($expval145)|(0))!=0;
      if ($tobool146) { label = 56; break; } else { label = 60; break; }
    case 56: 
      var $127=$XP;
      var $child148=(($127+16)|0);
      var $arrayidx149=(($child148)|0);
      var $128=HEAP32[(($arrayidx149)>>2)];
      var $129=$TP;
      var $cmp150=(($128)|(0))==(($129)|(0));
      if ($cmp150) { label = 57; break; } else { label = 58; break; }
    case 57: 
      var $130=$R;
      var $131=$XP;
      var $child153=(($131+16)|0);
      var $arrayidx154=(($child153)|0);
      HEAP32[(($arrayidx154)>>2)]=$130;
      label = 59; break;
    case 58: 
      var $132=$R;
      var $133=$XP;
      var $child156=(($133+16)|0);
      var $arrayidx157=(($child156+4)|0);
      HEAP32[(($arrayidx157)>>2)]=$132;
      label = 59; break;
    case 59: 
      label = 61; break;
    case 60: 
      _abort();
      throw "Reached an unreachable!";
    case 61: 
      label = 62; break;
    case 62: 
      var $134=$R;
      var $cmp162=(($134)|(0))!=0;
      if ($cmp162) { label = 63; break; } else { label = 77; break; }
    case 63: 
      var $135=$R;
      var $136=$135;
      var $137=HEAP32[((((5242960)|0))>>2)];
      var $cmp165=(($136)>>>(0)) >= (($137)>>>(0));
      var $conv166=(($cmp165)&(1));
      var $expval167=($conv166);
      var $tobool168=(($expval167)|(0))!=0;
      if ($tobool168) { label = 64; break; } else { label = 75; break; }
    case 64: 
      var $138=$XP;
      var $139=$R;
      var $parent170=(($139+24)|0);
      HEAP32[(($parent170)>>2)]=$138;
      var $140=$TP;
      var $child171=(($140+16)|0);
      var $arrayidx172=(($child171)|0);
      var $141=HEAP32[(($arrayidx172)>>2)];
      $C0=$141;
      var $cmp173=(($141)|(0))!=0;
      if ($cmp173) { label = 65; break; } else { label = 69; break; }
    case 65: 
      var $142=$C0;
      var $143=$142;
      var $144=HEAP32[((((5242960)|0))>>2)];
      var $cmp176=(($143)>>>(0)) >= (($144)>>>(0));
      var $conv177=(($cmp176)&(1));
      var $expval178=($conv177);
      var $tobool179=(($expval178)|(0))!=0;
      if ($tobool179) { label = 66; break; } else { label = 67; break; }
    case 66: 
      var $145=$C0;
      var $146=$R;
      var $child181=(($146+16)|0);
      var $arrayidx182=(($child181)|0);
      HEAP32[(($arrayidx182)>>2)]=$145;
      var $147=$R;
      var $148=$C0;
      var $parent183=(($148+24)|0);
      HEAP32[(($parent183)>>2)]=$147;
      label = 68; break;
    case 67: 
      _abort();
      throw "Reached an unreachable!";
    case 68: 
      label = 69; break;
    case 69: 
      var $149=$TP;
      var $child187=(($149+16)|0);
      var $arrayidx188=(($child187+4)|0);
      var $150=HEAP32[(($arrayidx188)>>2)];
      $C1=$150;
      var $cmp189=(($150)|(0))!=0;
      if ($cmp189) { label = 70; break; } else { label = 74; break; }
    case 70: 
      var $151=$C1;
      var $152=$151;
      var $153=HEAP32[((((5242960)|0))>>2)];
      var $cmp192=(($152)>>>(0)) >= (($153)>>>(0));
      var $conv193=(($cmp192)&(1));
      var $expval194=($conv193);
      var $tobool195=(($expval194)|(0))!=0;
      if ($tobool195) { label = 71; break; } else { label = 72; break; }
    case 71: 
      var $154=$C1;
      var $155=$R;
      var $child197=(($155+16)|0);
      var $arrayidx198=(($child197+4)|0);
      HEAP32[(($arrayidx198)>>2)]=$154;
      var $156=$R;
      var $157=$C1;
      var $parent199=(($157+24)|0);
      HEAP32[(($parent199)>>2)]=$156;
      label = 73; break;
    case 72: 
      _abort();
      throw "Reached an unreachable!";
    case 73: 
      label = 74; break;
    case 74: 
      label = 76; break;
    case 75: 
      _abort();
      throw "Reached an unreachable!";
    case 76: 
      label = 77; break;
    case 77: 
      label = 78; break;
    case 78: 
      label = 79; break;
    case 79: 
      label = 83; break;
    case 80: 
      var $158=$next;
      var $head209=(($158+4)|0);
      var $159=HEAP32[(($head209)>>2)];
      var $and210=$159 & 3;
      var $cmp211=(($and210)|(0))==3;
      if ($cmp211) { label = 81; break; } else { label = 82; break; }
    case 81: 
      var $160=$psize;
      HEAP32[((((5242952)|0))>>2)]=$160;
      var $161=$next;
      var $head214=(($161+4)|0);
      var $162=HEAP32[(($head214)>>2)];
      var $and215=$162 & -2;
      HEAP32[(($head214)>>2)]=$and215;
      var $163=$psize;
      var $or=$163 | 1;
      var $164=$p;
      var $head216=(($164+4)|0);
      HEAP32[(($head216)>>2)]=$or;
      var $165=$psize;
      var $166=$p;
      var $167=$166;
      var $168=$psize;
      var $add_ptr217=(($167+$168)|0);
      var $169=$add_ptr217;
      var $prev_foot218=(($169)|0);
      HEAP32[(($prev_foot218)>>2)]=$165;
      label = 214; break;
    case 82: 
      label = 83; break;
    case 83: 
      label = 85; break;
    case 84: 
      label = 213; break;
    case 85: 
      label = 86; break;
    case 86: 
      label = 87; break;
    case 87: 
      var $170=$p;
      var $171=$170;
      var $172=$next;
      var $173=$172;
      var $cmp225=(($171)>>>(0)) < (($173)>>>(0));
      if ($cmp225) { label = 88; break; } else { var $176 = 0;label = 89; break; }
    case 88: 
      var $174=$next;
      var $head228=(($174+4)|0);
      var $175=HEAP32[(($head228)>>2)];
      var $and229=$175 & 1;
      var $tobool230=(($and229)|(0))!=0;
      var $176 = $tobool230;label = 89; break;
    case 89: 
      var $176;
      var $land_ext232=(($176)&(1));
      var $expval233=($land_ext232);
      var $tobool234=(($expval233)|(0))!=0;
      if ($tobool234) { label = 90; break; } else { label = 211; break; }
    case 90: 
      var $177=$next;
      var $head236=(($177+4)|0);
      var $178=HEAP32[(($head236)>>2)];
      var $and237=$178 & 2;
      var $tobool238=(($and237)|(0))!=0;
      if ($tobool238) { label = 172; break; } else { label = 91; break; }
    case 91: 
      var $179=$next;
      var $180=HEAP32[((((5242968)|0))>>2)];
      var $cmp240=(($179)|(0))==(($180)|(0));
      if ($cmp240) { label = 92; break; } else { label = 97; break; }
    case 92: 
      var $181=$psize;
      var $182=HEAP32[((((5242956)|0))>>2)];
      var $add243=((($182)+($181))|0);
      HEAP32[((((5242956)|0))>>2)]=$add243;
      $tsize=$add243;
      var $183=$p;
      HEAP32[((((5242968)|0))>>2)]=$183;
      var $184=$tsize;
      var $or244=$184 | 1;
      var $185=$p;
      var $head245=(($185+4)|0);
      HEAP32[(($head245)>>2)]=$or244;
      var $186=$p;
      var $187=HEAP32[((((5242964)|0))>>2)];
      var $cmp246=(($186)|(0))==(($187)|(0));
      if ($cmp246) { label = 93; break; } else { label = 94; break; }
    case 93: 
      HEAP32[((((5242964)|0))>>2)]=0;
      HEAP32[((((5242952)|0))>>2)]=0;
      label = 94; break;
    case 94: 
      var $188=$tsize;
      var $189=HEAP32[((((5242972)|0))>>2)];
      var $cmp250=(($188)>>>(0)) > (($189)>>>(0));
      if ($cmp250) { label = 95; break; } else { label = 96; break; }
    case 95: 
      var $call=_sys_trim(5242944, 0);
      label = 96; break;
    case 96: 
      label = 214; break;
    case 97: 
      var $190=$next;
      var $191=HEAP32[((((5242964)|0))>>2)];
      var $cmp255=(($190)|(0))==(($191)|(0));
      if ($cmp255) { label = 98; break; } else { label = 99; break; }
    case 98: 
      var $192=$psize;
      var $193=HEAP32[((((5242952)|0))>>2)];
      var $add258=((($193)+($192))|0);
      HEAP32[((((5242952)|0))>>2)]=$add258;
      $dsize=$add258;
      var $194=$p;
      HEAP32[((((5242964)|0))>>2)]=$194;
      var $195=$dsize;
      var $or259=$195 | 1;
      var $196=$p;
      var $head260=(($196+4)|0);
      HEAP32[(($head260)>>2)]=$or259;
      var $197=$dsize;
      var $198=$p;
      var $199=$198;
      var $200=$dsize;
      var $add_ptr261=(($199+$200)|0);
      var $201=$add_ptr261;
      var $prev_foot262=(($201)|0);
      HEAP32[(($prev_foot262)>>2)]=$197;
      label = 214; break;
    case 99: 
      var $202=$next;
      var $head264=(($202+4)|0);
      var $203=HEAP32[(($head264)>>2)];
      var $and265=$203 & -8;
      $nsize=$and265;
      var $204=$nsize;
      var $205=$psize;
      var $add266=((($205)+($204))|0);
      $psize=$add266;
      var $206=$nsize;
      var $shr267=$206 >>> 3;
      var $cmp268=(($shr267)>>>(0)) < 32;
      if ($cmp268) { label = 100; break; } else { label = 118; break; }
    case 100: 
      var $207=$next;
      var $fd272=(($207+8)|0);
      var $208=HEAP32[(($fd272)>>2)];
      $F271=$208;
      var $209=$next;
      var $bk274=(($209+12)|0);
      var $210=HEAP32[(($bk274)>>2)];
      $B273=$210;
      var $211=$nsize;
      var $shr276=$211 >>> 3;
      $I275=$shr276;
      var $212=$F271;
      var $213=$I275;
      var $shl277=$213 << 1;
      var $arrayidx278=((((5242984)|0)+($shl277<<2))|0);
      var $214=$arrayidx278;
      var $215=$214;
      var $cmp279=(($212)|(0))==(($215)|(0));
      if ($cmp279) { var $223 = 1;label = 104; break; } else { label = 101; break; }
    case 101: 
      var $216=$F271;
      var $217=$216;
      var $218=HEAP32[((((5242960)|0))>>2)];
      var $cmp282=(($217)>>>(0)) >= (($218)>>>(0));
      if ($cmp282) { label = 102; break; } else { var $222 = 0;label = 103; break; }
    case 102: 
      var $219=$F271;
      var $bk285=(($219+12)|0);
      var $220=HEAP32[(($bk285)>>2)];
      var $221=$next;
      var $cmp286=(($220)|(0))==(($221)|(0));
      var $222 = $cmp286;label = 103; break;
    case 103: 
      var $222;
      var $223 = $222;label = 104; break;
    case 104: 
      var $223;
      var $lor_ext291=(($223)&(1));
      var $expval292=($lor_ext291);
      var $tobool293=(($expval292)|(0))!=0;
      if ($tobool293) { label = 105; break; } else { label = 116; break; }
    case 105: 
      var $224=$B273;
      var $225=$F271;
      var $cmp295=(($224)|(0))==(($225)|(0));
      if ($cmp295) { label = 106; break; } else { label = 107; break; }
    case 106: 
      var $226=$I275;
      var $shl298=1 << $226;
      var $neg299=$shl298 ^ -1;
      var $227=HEAP32[((((5242944)|0))>>2)];
      var $and300=$227 & $neg299;
      HEAP32[((((5242944)|0))>>2)]=$and300;
      label = 115; break;
    case 107: 
      var $228=$B273;
      var $229=$I275;
      var $shl302=$229 << 1;
      var $arrayidx303=((((5242984)|0)+($shl302<<2))|0);
      var $230=$arrayidx303;
      var $231=$230;
      var $cmp304=(($228)|(0))==(($231)|(0));
      if ($cmp304) { var $239 = 1;label = 111; break; } else { label = 108; break; }
    case 108: 
      var $232=$B273;
      var $233=$232;
      var $234=HEAP32[((((5242960)|0))>>2)];
      var $cmp307=(($233)>>>(0)) >= (($234)>>>(0));
      if ($cmp307) { label = 109; break; } else { var $238 = 0;label = 110; break; }
    case 109: 
      var $235=$B273;
      var $fd310=(($235+8)|0);
      var $236=HEAP32[(($fd310)>>2)];
      var $237=$next;
      var $cmp311=(($236)|(0))==(($237)|(0));
      var $238 = $cmp311;label = 110; break;
    case 110: 
      var $238;
      var $239 = $238;label = 111; break;
    case 111: 
      var $239;
      var $lor_ext316=(($239)&(1));
      var $expval317=($lor_ext316);
      var $tobool318=(($expval317)|(0))!=0;
      if ($tobool318) { label = 112; break; } else { label = 113; break; }
    case 112: 
      var $240=$B273;
      var $241=$F271;
      var $bk320=(($241+12)|0);
      HEAP32[(($bk320)>>2)]=$240;
      var $242=$F271;
      var $243=$B273;
      var $fd321=(($243+8)|0);
      HEAP32[(($fd321)>>2)]=$242;
      label = 114; break;
    case 113: 
      _abort();
      throw "Reached an unreachable!";
    case 114: 
      label = 115; break;
    case 115: 
      label = 117; break;
    case 116: 
      _abort();
      throw "Reached an unreachable!";
    case 117: 
      label = 167; break;
    case 118: 
      var $244=$next;
      var $245=$244;
      $TP328=$245;
      var $246=$TP328;
      var $parent330=(($246+24)|0);
      var $247=HEAP32[(($parent330)>>2)];
      $XP329=$247;
      var $248=$TP328;
      var $bk332=(($248+12)|0);
      var $249=HEAP32[(($bk332)>>2)];
      var $250=$TP328;
      var $cmp333=(($249)|(0))!=(($250)|(0));
      if ($cmp333) { label = 119; break; } else { label = 126; break; }
    case 119: 
      var $251=$TP328;
      var $fd337=(($251+8)|0);
      var $252=HEAP32[(($fd337)>>2)];
      $F336=$252;
      var $253=$TP328;
      var $bk338=(($253+12)|0);
      var $254=HEAP32[(($bk338)>>2)];
      $R331=$254;
      var $255=$F336;
      var $256=$255;
      var $257=HEAP32[((((5242960)|0))>>2)];
      var $cmp339=(($256)>>>(0)) >= (($257)>>>(0));
      if ($cmp339) { label = 120; break; } else { var $264 = 0;label = 122; break; }
    case 120: 
      var $258=$F336;
      var $bk342=(($258+12)|0);
      var $259=HEAP32[(($bk342)>>2)];
      var $260=$TP328;
      var $cmp343=(($259)|(0))==(($260)|(0));
      if ($cmp343) { label = 121; break; } else { var $264 = 0;label = 122; break; }
    case 121: 
      var $261=$R331;
      var $fd346=(($261+8)|0);
      var $262=HEAP32[(($fd346)>>2)];
      var $263=$TP328;
      var $cmp347=(($262)|(0))==(($263)|(0));
      var $264 = $cmp347;label = 122; break;
    case 122: 
      var $264;
      var $land_ext350=(($264)&(1));
      var $expval351=($land_ext350);
      var $tobool352=(($expval351)|(0))!=0;
      if ($tobool352) { label = 123; break; } else { label = 124; break; }
    case 123: 
      var $265=$R331;
      var $266=$F336;
      var $bk354=(($266+12)|0);
      HEAP32[(($bk354)>>2)]=$265;
      var $267=$F336;
      var $268=$R331;
      var $fd355=(($268+8)|0);
      HEAP32[(($fd355)>>2)]=$267;
      label = 125; break;
    case 124: 
      _abort();
      throw "Reached an unreachable!";
    case 125: 
      label = 138; break;
    case 126: 
      var $269=$TP328;
      var $child360=(($269+16)|0);
      var $arrayidx361=(($child360+4)|0);
      $RP359=$arrayidx361;
      var $270=HEAP32[(($arrayidx361)>>2)];
      $R331=$270;
      var $cmp362=(($270)|(0))!=0;
      if ($cmp362) { label = 128; break; } else { label = 127; break; }
    case 127: 
      var $271=$TP328;
      var $child365=(($271+16)|0);
      var $arrayidx366=(($child365)|0);
      $RP359=$arrayidx366;
      var $272=HEAP32[(($arrayidx366)>>2)];
      $R331=$272;
      var $cmp367=(($272)|(0))!=0;
      if ($cmp367) { label = 128; break; } else { label = 137; break; }
    case 128: 
      label = 129; break;
    case 129: 
      var $273=$R331;
      var $child372=(($273+16)|0);
      var $arrayidx373=(($child372+4)|0);
      $CP370=$arrayidx373;
      var $274=HEAP32[(($arrayidx373)>>2)];
      var $cmp374=(($274)|(0))!=0;
      if ($cmp374) { var $277 = 1;label = 131; break; } else { label = 130; break; }
    case 130: 
      var $275=$R331;
      var $child377=(($275+16)|0);
      var $arrayidx378=(($child377)|0);
      $CP370=$arrayidx378;
      var $276=HEAP32[(($arrayidx378)>>2)];
      var $cmp379=(($276)|(0))!=0;
      var $277 = $cmp379;label = 131; break;
    case 131: 
      var $277;
      if ($277) { label = 132; break; } else { label = 133; break; }
    case 132: 
      var $278=$CP370;
      $RP359=$278;
      var $279=HEAP32[(($278)>>2)];
      $R331=$279;
      label = 129; break;
    case 133: 
      var $280=$RP359;
      var $281=$280;
      var $282=HEAP32[((((5242960)|0))>>2)];
      var $cmp385=(($281)>>>(0)) >= (($282)>>>(0));
      var $conv386=(($cmp385)&(1));
      var $expval387=($conv386);
      var $tobool388=(($expval387)|(0))!=0;
      if ($tobool388) { label = 134; break; } else { label = 135; break; }
    case 134: 
      var $283=$RP359;
      HEAP32[(($283)>>2)]=0;
      label = 136; break;
    case 135: 
      _abort();
      throw "Reached an unreachable!";
    case 136: 
      label = 137; break;
    case 137: 
      label = 138; break;
    case 138: 
      var $284=$XP329;
      var $cmp394=(($284)|(0))!=0;
      if ($cmp394) { label = 139; break; } else { label = 166; break; }
    case 139: 
      var $285=$TP328;
      var $index398=(($285+28)|0);
      var $286=HEAP32[(($index398)>>2)];
      var $arrayidx399=((((5243248)|0)+($286<<2))|0);
      $H397=$arrayidx399;
      var $287=$TP328;
      var $288=$H397;
      var $289=HEAP32[(($288)>>2)];
      var $cmp400=(($287)|(0))==(($289)|(0));
      if ($cmp400) { label = 140; break; } else { label = 143; break; }
    case 140: 
      var $290=$R331;
      var $291=$H397;
      HEAP32[(($291)>>2)]=$290;
      var $cmp403=(($290)|(0))==0;
      if ($cmp403) { label = 141; break; } else { label = 142; break; }
    case 141: 
      var $292=$TP328;
      var $index406=(($292+28)|0);
      var $293=HEAP32[(($index406)>>2)];
      var $shl407=1 << $293;
      var $neg408=$shl407 ^ -1;
      var $294=HEAP32[((((5242948)|0))>>2)];
      var $and409=$294 & $neg408;
      HEAP32[((((5242948)|0))>>2)]=$and409;
      label = 142; break;
    case 142: 
      label = 150; break;
    case 143: 
      var $295=$XP329;
      var $296=$295;
      var $297=HEAP32[((((5242960)|0))>>2)];
      var $cmp412=(($296)>>>(0)) >= (($297)>>>(0));
      var $conv413=(($cmp412)&(1));
      var $expval414=($conv413);
      var $tobool415=(($expval414)|(0))!=0;
      if ($tobool415) { label = 144; break; } else { label = 148; break; }
    case 144: 
      var $298=$XP329;
      var $child417=(($298+16)|0);
      var $arrayidx418=(($child417)|0);
      var $299=HEAP32[(($arrayidx418)>>2)];
      var $300=$TP328;
      var $cmp419=(($299)|(0))==(($300)|(0));
      if ($cmp419) { label = 145; break; } else { label = 146; break; }
    case 145: 
      var $301=$R331;
      var $302=$XP329;
      var $child422=(($302+16)|0);
      var $arrayidx423=(($child422)|0);
      HEAP32[(($arrayidx423)>>2)]=$301;
      label = 147; break;
    case 146: 
      var $303=$R331;
      var $304=$XP329;
      var $child425=(($304+16)|0);
      var $arrayidx426=(($child425+4)|0);
      HEAP32[(($arrayidx426)>>2)]=$303;
      label = 147; break;
    case 147: 
      label = 149; break;
    case 148: 
      _abort();
      throw "Reached an unreachable!";
    case 149: 
      label = 150; break;
    case 150: 
      var $305=$R331;
      var $cmp431=(($305)|(0))!=0;
      if ($cmp431) { label = 151; break; } else { label = 165; break; }
    case 151: 
      var $306=$R331;
      var $307=$306;
      var $308=HEAP32[((((5242960)|0))>>2)];
      var $cmp434=(($307)>>>(0)) >= (($308)>>>(0));
      var $conv435=(($cmp434)&(1));
      var $expval436=($conv435);
      var $tobool437=(($expval436)|(0))!=0;
      if ($tobool437) { label = 152; break; } else { label = 163; break; }
    case 152: 
      var $309=$XP329;
      var $310=$R331;
      var $parent441=(($310+24)|0);
      HEAP32[(($parent441)>>2)]=$309;
      var $311=$TP328;
      var $child442=(($311+16)|0);
      var $arrayidx443=(($child442)|0);
      var $312=HEAP32[(($arrayidx443)>>2)];
      $C0439=$312;
      var $cmp444=(($312)|(0))!=0;
      if ($cmp444) { label = 153; break; } else { label = 157; break; }
    case 153: 
      var $313=$C0439;
      var $314=$313;
      var $315=HEAP32[((((5242960)|0))>>2)];
      var $cmp447=(($314)>>>(0)) >= (($315)>>>(0));
      var $conv448=(($cmp447)&(1));
      var $expval449=($conv448);
      var $tobool450=(($expval449)|(0))!=0;
      if ($tobool450) { label = 154; break; } else { label = 155; break; }
    case 154: 
      var $316=$C0439;
      var $317=$R331;
      var $child452=(($317+16)|0);
      var $arrayidx453=(($child452)|0);
      HEAP32[(($arrayidx453)>>2)]=$316;
      var $318=$R331;
      var $319=$C0439;
      var $parent454=(($319+24)|0);
      HEAP32[(($parent454)>>2)]=$318;
      label = 156; break;
    case 155: 
      _abort();
      throw "Reached an unreachable!";
    case 156: 
      label = 157; break;
    case 157: 
      var $320=$TP328;
      var $child458=(($320+16)|0);
      var $arrayidx459=(($child458+4)|0);
      var $321=HEAP32[(($arrayidx459)>>2)];
      $C1440=$321;
      var $cmp460=(($321)|(0))!=0;
      if ($cmp460) { label = 158; break; } else { label = 162; break; }
    case 158: 
      var $322=$C1440;
      var $323=$322;
      var $324=HEAP32[((((5242960)|0))>>2)];
      var $cmp463=(($323)>>>(0)) >= (($324)>>>(0));
      var $conv464=(($cmp463)&(1));
      var $expval465=($conv464);
      var $tobool466=(($expval465)|(0))!=0;
      if ($tobool466) { label = 159; break; } else { label = 160; break; }
    case 159: 
      var $325=$C1440;
      var $326=$R331;
      var $child468=(($326+16)|0);
      var $arrayidx469=(($child468+4)|0);
      HEAP32[(($arrayidx469)>>2)]=$325;
      var $327=$R331;
      var $328=$C1440;
      var $parent470=(($328+24)|0);
      HEAP32[(($parent470)>>2)]=$327;
      label = 161; break;
    case 160: 
      _abort();
      throw "Reached an unreachable!";
    case 161: 
      label = 162; break;
    case 162: 
      label = 164; break;
    case 163: 
      _abort();
      throw "Reached an unreachable!";
    case 164: 
      label = 165; break;
    case 165: 
      label = 166; break;
    case 166: 
      label = 167; break;
    case 167: 
      var $329=$psize;
      var $or479=$329 | 1;
      var $330=$p;
      var $head480=(($330+4)|0);
      HEAP32[(($head480)>>2)]=$or479;
      var $331=$psize;
      var $332=$p;
      var $333=$332;
      var $334=$psize;
      var $add_ptr481=(($333+$334)|0);
      var $335=$add_ptr481;
      var $prev_foot482=(($335)|0);
      HEAP32[(($prev_foot482)>>2)]=$331;
      var $336=$p;
      var $337=HEAP32[((((5242964)|0))>>2)];
      var $cmp483=(($336)|(0))==(($337)|(0));
      if ($cmp483) { label = 168; break; } else { label = 169; break; }
    case 168: 
      var $338=$psize;
      HEAP32[((((5242952)|0))>>2)]=$338;
      label = 214; break;
    case 169: 
      label = 170; break;
    case 170: 
      label = 171; break;
    case 171: 
      label = 173; break;
    case 172: 
      var $339=$next;
      var $head490=(($339+4)|0);
      var $340=HEAP32[(($head490)>>2)];
      var $and491=$340 & -2;
      HEAP32[(($head490)>>2)]=$and491;
      var $341=$psize;
      var $or492=$341 | 1;
      var $342=$p;
      var $head493=(($342+4)|0);
      HEAP32[(($head493)>>2)]=$or492;
      var $343=$psize;
      var $344=$p;
      var $345=$344;
      var $346=$psize;
      var $add_ptr494=(($345+$346)|0);
      var $347=$add_ptr494;
      var $prev_foot495=(($347)|0);
      HEAP32[(($prev_foot495)>>2)]=$343;
      label = 173; break;
    case 173: 
      var $348=$psize;
      var $shr497=$348 >>> 3;
      var $cmp498=(($shr497)>>>(0)) < 32;
      if ($cmp498) { label = 174; break; } else { label = 181; break; }
    case 174: 
      var $349=$psize;
      var $shr502=$349 >>> 3;
      $I501=$shr502;
      var $350=$I501;
      var $shl504=$350 << 1;
      var $arrayidx505=((((5242984)|0)+($shl504<<2))|0);
      var $351=$arrayidx505;
      var $352=$351;
      $B503=$352;
      var $353=$B503;
      $F506=$353;
      var $354=HEAP32[((((5242944)|0))>>2)];
      var $355=$I501;
      var $shl507=1 << $355;
      var $and508=$354 & $shl507;
      var $tobool509=(($and508)|(0))!=0;
      if ($tobool509) { label = 176; break; } else { label = 175; break; }
    case 175: 
      var $356=$I501;
      var $shl511=1 << $356;
      var $357=HEAP32[((((5242944)|0))>>2)];
      var $or512=$357 | $shl511;
      HEAP32[((((5242944)|0))>>2)]=$or512;
      label = 180; break;
    case 176: 
      var $358=$B503;
      var $fd514=(($358+8)|0);
      var $359=HEAP32[(($fd514)>>2)];
      var $360=$359;
      var $361=HEAP32[((((5242960)|0))>>2)];
      var $cmp515=(($360)>>>(0)) >= (($361)>>>(0));
      var $conv516=(($cmp515)&(1));
      var $expval517=($conv516);
      var $tobool518=(($expval517)|(0))!=0;
      if ($tobool518) { label = 177; break; } else { label = 178; break; }
    case 177: 
      var $362=$B503;
      var $fd520=(($362+8)|0);
      var $363=HEAP32[(($fd520)>>2)];
      $F506=$363;
      label = 179; break;
    case 178: 
      _abort();
      throw "Reached an unreachable!";
    case 179: 
      label = 180; break;
    case 180: 
      var $364=$p;
      var $365=$B503;
      var $fd524=(($365+8)|0);
      HEAP32[(($fd524)>>2)]=$364;
      var $366=$p;
      var $367=$F506;
      var $bk525=(($367+12)|0);
      HEAP32[(($bk525)>>2)]=$366;
      var $368=$F506;
      var $369=$p;
      var $fd526=(($369+8)|0);
      HEAP32[(($fd526)>>2)]=$368;
      var $370=$B503;
      var $371=$p;
      var $bk527=(($371+12)|0);
      HEAP32[(($bk527)>>2)]=$370;
      label = 210; break;
    case 181: 
      var $372=$p;
      var $373=$372;
      $tp=$373;
      var $374=$psize;
      var $shr531=$374 >>> 8;
      $X=$shr531;
      var $375=$X;
      var $cmp532=(($375)|(0))==0;
      if ($cmp532) { label = 182; break; } else { label = 183; break; }
    case 182: 
      $I530=0;
      label = 187; break;
    case 183: 
      var $376=$X;
      var $cmp536=(($376)>>>(0)) > 65535;
      if ($cmp536) { label = 184; break; } else { label = 185; break; }
    case 184: 
      $I530=31;
      label = 186; break;
    case 185: 
      var $377=$X;
      $Y=$377;
      var $378=$Y;
      var $sub=((($378)-(256))|0);
      var $shr540=$sub >>> 16;
      var $and541=$shr540 & 8;
      $N=$and541;
      var $379=$N;
      var $380=$Y;
      var $shl542=$380 << $379;
      $Y=$shl542;
      var $sub543=((($shl542)-(4096))|0);
      var $shr544=$sub543 >>> 16;
      var $and545=$shr544 & 4;
      $K=$and545;
      var $381=$K;
      var $382=$N;
      var $add546=((($382)+($381))|0);
      $N=$add546;
      var $383=$K;
      var $384=$Y;
      var $shl547=$384 << $383;
      $Y=$shl547;
      var $sub548=((($shl547)-(16384))|0);
      var $shr549=$sub548 >>> 16;
      var $and550=$shr549 & 2;
      $K=$and550;
      var $385=$N;
      var $add551=((($385)+($and550))|0);
      $N=$add551;
      var $386=$N;
      var $sub552=(((14)-($386))|0);
      var $387=$K;
      var $388=$Y;
      var $shl553=$388 << $387;
      $Y=$shl553;
      var $shr554=$shl553 >>> 15;
      var $add555=((($sub552)+($shr554))|0);
      $K=$add555;
      var $389=$K;
      var $shl556=$389 << 1;
      var $390=$psize;
      var $391=$K;
      var $add557=((($391)+(7))|0);
      var $shr558=$390 >>> (($add557)>>>(0));
      var $and559=$shr558 & 1;
      var $add560=((($shl556)+($and559))|0);
      $I530=$add560;
      label = 186; break;
    case 186: 
      label = 187; break;
    case 187: 
      var $392=$I530;
      var $arrayidx563=((((5243248)|0)+($392<<2))|0);
      $H529=$arrayidx563;
      var $393=$I530;
      var $394=$tp;
      var $index564=(($394+28)|0);
      HEAP32[(($index564)>>2)]=$393;
      var $395=$tp;
      var $child565=(($395+16)|0);
      var $arrayidx566=(($child565+4)|0);
      HEAP32[(($arrayidx566)>>2)]=0;
      var $396=$tp;
      var $child567=(($396+16)|0);
      var $arrayidx568=(($child567)|0);
      HEAP32[(($arrayidx568)>>2)]=0;
      var $397=HEAP32[((((5242948)|0))>>2)];
      var $398=$I530;
      var $shl569=1 << $398;
      var $and570=$397 & $shl569;
      var $tobool571=(($and570)|(0))!=0;
      if ($tobool571) { label = 189; break; } else { label = 188; break; }
    case 188: 
      var $399=$I530;
      var $shl573=1 << $399;
      var $400=HEAP32[((((5242948)|0))>>2)];
      var $or574=$400 | $shl573;
      HEAP32[((((5242948)|0))>>2)]=$or574;
      var $401=$tp;
      var $402=$H529;
      HEAP32[(($402)>>2)]=$401;
      var $403=$H529;
      var $404=$403;
      var $405=$tp;
      var $parent575=(($405+24)|0);
      HEAP32[(($parent575)>>2)]=$404;
      var $406=$tp;
      var $407=$tp;
      var $bk576=(($407+12)|0);
      HEAP32[(($bk576)>>2)]=$406;
      var $408=$tp;
      var $fd577=(($408+8)|0);
      HEAP32[(($fd577)>>2)]=$406;
      label = 207; break;
    case 189: 
      var $409=$H529;
      var $410=HEAP32[(($409)>>2)];
      $T=$410;
      var $411=$psize;
      var $412=$I530;
      var $cmp580=(($412)|(0))==31;
      if ($cmp580) { label = 190; break; } else { label = 191; break; }
    case 190: 
      var $cond = 0;label = 192; break;
    case 191: 
      var $413=$I530;
      var $shr582=$413 >>> 1;
      var $add583=((($shr582)+(8))|0);
      var $sub584=((($add583)-(2))|0);
      var $sub585=(((31)-($sub584))|0);
      var $cond = $sub585;label = 192; break;
    case 192: 
      var $cond;
      var $shl586=$411 << $cond;
      $K579=$shl586;
      label = 193; break;
    case 193: 
      var $414=$T;
      var $head587=(($414+4)|0);
      var $415=HEAP32[(($head587)>>2)];
      var $and588=$415 & -8;
      var $416=$psize;
      var $cmp589=(($and588)|(0))!=(($416)|(0));
      if ($cmp589) { label = 194; break; } else { label = 200; break; }
    case 194: 
      var $417=$K579;
      var $shr592=$417 >>> 31;
      var $and593=$shr592 & 1;
      var $418=$T;
      var $child594=(($418+16)|0);
      var $arrayidx595=(($child594+($and593<<2))|0);
      $C=$arrayidx595;
      var $419=$K579;
      var $shl596=$419 << 1;
      $K579=$shl596;
      var $420=$C;
      var $421=HEAP32[(($420)>>2)];
      var $cmp597=(($421)|(0))!=0;
      if ($cmp597) { label = 195; break; } else { label = 196; break; }
    case 195: 
      var $422=$C;
      var $423=HEAP32[(($422)>>2)];
      $T=$423;
      label = 199; break;
    case 196: 
      var $424=$C;
      var $425=$424;
      var $426=HEAP32[((((5242960)|0))>>2)];
      var $cmp601=(($425)>>>(0)) >= (($426)>>>(0));
      var $conv602=(($cmp601)&(1));
      var $expval603=($conv602);
      var $tobool604=(($expval603)|(0))!=0;
      if ($tobool604) { label = 197; break; } else { label = 198; break; }
    case 197: 
      var $427=$tp;
      var $428=$C;
      HEAP32[(($428)>>2)]=$427;
      var $429=$T;
      var $430=$tp;
      var $parent606=(($430+24)|0);
      HEAP32[(($parent606)>>2)]=$429;
      var $431=$tp;
      var $432=$tp;
      var $bk607=(($432+12)|0);
      HEAP32[(($bk607)>>2)]=$431;
      var $433=$tp;
      var $fd608=(($433+8)|0);
      HEAP32[(($fd608)>>2)]=$431;
      label = 206; break;
    case 198: 
      _abort();
      throw "Reached an unreachable!";
    case 199: 
      label = 205; break;
    case 200: 
      var $434=$T;
      var $fd613=(($434+8)|0);
      var $435=HEAP32[(($fd613)>>2)];
      $F612=$435;
      var $436=$T;
      var $437=$436;
      var $438=HEAP32[((((5242960)|0))>>2)];
      var $cmp614=(($437)>>>(0)) >= (($438)>>>(0));
      if ($cmp614) { label = 201; break; } else { var $442 = 0;label = 202; break; }
    case 201: 
      var $439=$F612;
      var $440=$439;
      var $441=HEAP32[((((5242960)|0))>>2)];
      var $cmp617=(($440)>>>(0)) >= (($441)>>>(0));
      var $442 = $cmp617;label = 202; break;
    case 202: 
      var $442;
      var $land_ext620=(($442)&(1));
      var $expval621=($land_ext620);
      var $tobool622=(($expval621)|(0))!=0;
      if ($tobool622) { label = 203; break; } else { label = 204; break; }
    case 203: 
      var $443=$tp;
      var $444=$F612;
      var $bk624=(($444+12)|0);
      HEAP32[(($bk624)>>2)]=$443;
      var $445=$T;
      var $fd625=(($445+8)|0);
      HEAP32[(($fd625)>>2)]=$443;
      var $446=$F612;
      var $447=$tp;
      var $fd626=(($447+8)|0);
      HEAP32[(($fd626)>>2)]=$446;
      var $448=$T;
      var $449=$tp;
      var $bk627=(($449+12)|0);
      HEAP32[(($bk627)>>2)]=$448;
      var $450=$tp;
      var $parent628=(($450+24)|0);
      HEAP32[(($parent628)>>2)]=0;
      label = 206; break;
    case 204: 
      _abort();
      throw "Reached an unreachable!";
    case 205: 
      label = 193; break;
    case 206: 
      label = 207; break;
    case 207: 
      var $451=HEAP32[((((5242976)|0))>>2)];
      var $dec=((($451)-(1))|0);
      HEAP32[((((5242976)|0))>>2)]=$dec;
      var $cmp632=(($dec)|(0))==0;
      if ($cmp632) { label = 208; break; } else { label = 209; break; }
    case 208: 
      var $call635=_release_unused_segments(5242944);
      label = 209; break;
    case 209: 
      label = 210; break;
    case 210: 
      label = 214; break;
    case 211: 
      label = 212; break;
    case 212: 
      label = 213; break;
    case 213: 
      _abort();
      throw "Reached an unreachable!";
    case 214: 
      label = 215; break;
    case 215: 
      return;
    default: assert(0, "bad label: " + label);
  }
}
function _sys_trim($m, $pad) {
  var label = 0;
  label = 2; 
  while(1) switch(label) {
    case 2: 
      var $m_addr;
      var $pad_addr;
      var $released;
      var $unit;
      var $extra;
      var $sp;
      var $old_br;
      var $rel_br;
      var $new_br;
      $m_addr=$m;
      $pad_addr=$pad;
      $released=0;
      var $0=HEAP32[((((5242888)|0))>>2)];
      var $cmp=(($0)|(0))!=0;
      if ($cmp) { var $1 = 1;label = 4; break; } else { label = 3; break; }
    case 3: 
      var $call=_init_mparams();
      var $tobool=(($call)|(0))!=0;
      var $1 = $tobool;label = 4; break;
    case 4: 
      var $1;
      var $lor_ext=(($1)&(1));
      var $2=$pad_addr;
      var $cmp1=(($2)>>>(0)) < 4294967232;
      if ($cmp1) { label = 5; break; } else { label = 26; break; }
    case 5: 
      var $3=$m_addr;
      var $top=(($3+24)|0);
      var $4=HEAP32[(($top)>>2)];
      var $cmp2=(($4)|(0))!=0;
      if ($cmp2) { label = 6; break; } else { label = 26; break; }
    case 6: 
      var $5=$pad_addr;
      var $add=((($5)+(40))|0);
      $pad_addr=$add;
      var $6=$m_addr;
      var $topsize=(($6+12)|0);
      var $7=HEAP32[(($topsize)>>2)];
      var $8=$pad_addr;
      var $cmp3=(($7)>>>(0)) > (($8)>>>(0));
      if ($cmp3) { label = 7; break; } else { label = 22; break; }
    case 7: 
      var $9=HEAP32[((((5242896)|0))>>2)];
      $unit=$9;
      var $10=$m_addr;
      var $topsize5=(($10+12)|0);
      var $11=HEAP32[(($topsize5)>>2)];
      var $12=$pad_addr;
      var $sub=((($11)-($12))|0);
      var $13=$unit;
      var $sub6=((($13)-(1))|0);
      var $add7=((($sub)+($sub6))|0);
      var $14=$unit;
      var $div=Math.floor(((($add7)>>>(0)))/((($14)>>>(0))));
      var $sub8=((($div)-(1))|0);
      var $15=$unit;
      var $mul=Math.imul($sub8,$15);
      $extra=$mul;
      var $16=$m_addr;
      var $17=$m_addr;
      var $top9=(($17+24)|0);
      var $18=HEAP32[(($top9)>>2)];
      var $19=$18;
      var $call10=_segment_holding($16, $19);
      $sp=$call10;
      var $20=$sp;
      var $sflags=(($20+12)|0);
      var $21=HEAP32[(($sflags)>>2)];
      var $and=$21 & 8;
      var $tobool11=(($and)|(0))!=0;
      if ($tobool11) { label = 19; break; } else { label = 8; break; }
    case 8: 
      var $22=$sp;
      var $sflags13=(($22+12)|0);
      var $23=HEAP32[(($sflags13)>>2)];
      var $and14=$23 & 0;
      var $tobool15=(($and14)|(0))!=0;
      if ($tobool15) { label = 9; break; } else { label = 10; break; }
    case 9: 
      label = 18; break;
    case 10: 
      var $24=$extra;
      var $cmp17=(($24)>>>(0)) >= 2147483647;
      if ($cmp17) { label = 11; break; } else { label = 12; break; }
    case 11: 
      var $25=$unit;
      var $sub19=(((-2147483648)-($25))|0);
      $extra=$sub19;
      label = 12; break;
    case 12: 
      var $call20=_sbrk(0);
      $old_br=$call20;
      var $26=$old_br;
      var $27=$sp;
      var $base=(($27)|0);
      var $28=HEAP32[(($base)>>2)];
      var $29=$sp;
      var $size=(($29+4)|0);
      var $30=HEAP32[(($size)>>2)];
      var $add_ptr=(($28+$30)|0);
      var $cmp21=(($26)|(0))==(($add_ptr)|(0));
      if ($cmp21) { label = 13; break; } else { label = 17; break; }
    case 13: 
      var $31=$extra;
      var $sub23=(((-$31))|0);
      var $call24=_sbrk($sub23);
      $rel_br=$call24;
      var $call25=_sbrk(0);
      $new_br=$call25;
      var $32=$rel_br;
      var $cmp26=(($32)|(0))!=-1;
      if ($cmp26) { label = 14; break; } else { label = 16; break; }
    case 14: 
      var $33=$new_br;
      var $34=$old_br;
      var $cmp28=(($33)>>>(0)) < (($34)>>>(0));
      if ($cmp28) { label = 15; break; } else { label = 16; break; }
    case 15: 
      var $35=$old_br;
      var $36=$new_br;
      var $sub_ptr_lhs_cast=$35;
      var $sub_ptr_rhs_cast=$36;
      var $sub_ptr_sub=((($sub_ptr_lhs_cast)-($sub_ptr_rhs_cast))|0);
      $released=$sub_ptr_sub;
      label = 16; break;
    case 16: 
      label = 17; break;
    case 17: 
      label = 18; break;
    case 18: 
      label = 19; break;
    case 19: 
      var $37=$released;
      var $cmp34=(($37)|(0))!=0;
      if ($cmp34) { label = 20; break; } else { label = 21; break; }
    case 20: 
      var $38=$released;
      var $39=$sp;
      var $size36=(($39+4)|0);
      var $40=HEAP32[(($size36)>>2)];
      var $sub37=((($40)-($38))|0);
      HEAP32[(($size36)>>2)]=$sub37;
      var $41=$released;
      var $42=$m_addr;
      var $footprint=(($42+432)|0);
      var $43=HEAP32[(($footprint)>>2)];
      var $sub38=((($43)-($41))|0);
      HEAP32[(($footprint)>>2)]=$sub38;
      var $44=$m_addr;
      var $45=$m_addr;
      var $top39=(($45+24)|0);
      var $46=HEAP32[(($top39)>>2)];
      var $47=$m_addr;
      var $topsize40=(($47+12)|0);
      var $48=HEAP32[(($topsize40)>>2)];
      var $49=$released;
      var $sub41=((($48)-($49))|0);
      _init_top($44, $46, $sub41);
      label = 21; break;
    case 21: 
      label = 22; break;
    case 22: 
      var $50=$released;
      var $cmp44=(($50)|(0))==0;
      if ($cmp44) { label = 23; break; } else { label = 25; break; }
    case 23: 
      var $51=$m_addr;
      var $topsize46=(($51+12)|0);
      var $52=HEAP32[(($topsize46)>>2)];
      var $53=$m_addr;
      var $trim_check=(($53+28)|0);
      var $54=HEAP32[(($trim_check)>>2)];
      var $cmp47=(($52)>>>(0)) > (($54)>>>(0));
      if ($cmp47) { label = 24; break; } else { label = 25; break; }
    case 24: 
      var $55=$m_addr;
      var $trim_check49=(($55+28)|0);
      HEAP32[(($trim_check49)>>2)]=-1;
      label = 25; break;
    case 25: 
      label = 26; break;
    case 26: 
      var $56=$released;
      var $cmp52=(($56)|(0))!=0;
      var $cond=$cmp52 ? 1 : 0;
      return $cond;
    default: assert(0, "bad label: " + label);
  }
}
function _segment_holding($m, $addr) {
  var label = 0;
  label = 2; 
  while(1) switch(label) {
    case 2: 
      var $retval;
      var $m_addr;
      var $addr_addr;
      var $sp;
      $m_addr=$m;
      $addr_addr=$addr;
      var $0=$m_addr;
      var $seg=(($0+448)|0);
      $sp=$seg;
      label = 3; break;
    case 3: 
      var $1=$addr_addr;
      var $2=$sp;
      var $base=(($2)|0);
      var $3=HEAP32[(($base)>>2)];
      var $cmp=(($1)>>>(0)) >= (($3)>>>(0));
      if ($cmp) { label = 4; break; } else { label = 6; break; }
    case 4: 
      var $4=$addr_addr;
      var $5=$sp;
      var $base1=(($5)|0);
      var $6=HEAP32[(($base1)>>2)];
      var $7=$sp;
      var $size=(($7+4)|0);
      var $8=HEAP32[(($size)>>2)];
      var $add_ptr=(($6+$8)|0);
      var $cmp2=(($4)>>>(0)) < (($add_ptr)>>>(0));
      if ($cmp2) { label = 5; break; } else { label = 6; break; }
    case 5: 
      var $9=$sp;
      $retval=$9;
      label = 9; break;
    case 6: 
      var $10=$sp;
      var $next=(($10+8)|0);
      var $11=HEAP32[(($next)>>2)];
      $sp=$11;
      var $cmp3=(($11)|(0))==0;
      if ($cmp3) { label = 7; break; } else { label = 8; break; }
    case 7: 
      $retval=0;
      label = 9; break;
    case 8: 
      label = 3; break;
    case 9: 
      var $12=$retval;
      return $12;
    default: assert(0, "bad label: " + label);
  }
}
function _release_unused_segments($m) {
  var label = 0;
  label = 2; 
  while(1) switch(label) {
    case 2: 
      var $m_addr;
      var $released;
      var $nsegs;
      var $pred;
      var $sp;
      var $base;
      var $size;
      var $next3;
      var $p;
      var $psize;
      var $tp;
      var $XP;
      var $R;
      var $F;
      var $RP;
      var $CP;
      var $H;
      var $C0;
      var $C1;
      var $H147;
      var $I;
      var $X;
      var $Y;
      var $N;
      var $K;
      var $T;
      var $K197;
      var $C;
      var $F235;
      $m_addr=$m;
      $released=0;
      $nsegs=0;
      var $0=$m_addr;
      var $seg=(($0+448)|0);
      $pred=$seg;
      var $1=$pred;
      var $next=(($1+8)|0);
      var $2=HEAP32[(($next)>>2)];
      $sp=$2;
      label = 3; break;
    case 3: 
      var $3=$sp;
      var $cmp=(($3)|(0))!=0;
      if ($cmp) { label = 4; break; } else { label = 91; break; }
    case 4: 
      var $4=$sp;
      var $base1=(($4)|0);
      var $5=HEAP32[(($base1)>>2)];
      $base=$5;
      var $6=$sp;
      var $size2=(($6+4)|0);
      var $7=HEAP32[(($size2)>>2)];
      $size=$7;
      var $8=$sp;
      var $next4=(($8+8)|0);
      var $9=HEAP32[(($next4)>>2)];
      $next3=$9;
      var $10=$nsegs;
      var $inc=((($10)+(1))|0);
      $nsegs=$inc;
      var $11=$sp;
      var $sflags=(($11+12)|0);
      var $12=HEAP32[(($sflags)>>2)];
      var $and=$12 & 0;
      var $tobool=(($and)|(0))!=0;
      if ($tobool) { label = 5; break; } else { label = 90; break; }
    case 5: 
      var $13=$sp;
      var $sflags5=(($13+12)|0);
      var $14=HEAP32[(($sflags5)>>2)];
      var $and6=$14 & 8;
      var $tobool7=(($and6)|(0))!=0;
      if ($tobool7) { label = 90; break; } else { label = 6; break; }
    case 6: 
      var $15=$base;
      var $16=$base;
      var $add_ptr=(($16+8)|0);
      var $17=$add_ptr;
      var $and8=$17 & 7;
      var $cmp9=(($and8)|(0))==0;
      if ($cmp9) { label = 7; break; } else { label = 8; break; }
    case 7: 
      var $cond = 0;label = 9; break;
    case 8: 
      var $18=$base;
      var $add_ptr10=(($18+8)|0);
      var $19=$add_ptr10;
      var $and11=$19 & 7;
      var $sub=(((8)-($and11))|0);
      var $and12=$sub & 7;
      var $cond = $and12;label = 9; break;
    case 9: 
      var $cond;
      var $add_ptr13=(($15+$cond)|0);
      var $20=$add_ptr13;
      $p=$20;
      var $21=$p;
      var $head=(($21+4)|0);
      var $22=HEAP32[(($head)>>2)];
      var $and14=$22 & -8;
      $psize=$and14;
      var $23=$p;
      var $head15=(($23+4)|0);
      var $24=HEAP32[(($head15)>>2)];
      var $and16=$24 & 3;
      var $cmp17=(($and16)|(0))!=1;
      if ($cmp17) { label = 89; break; } else { label = 10; break; }
    case 10: 
      var $25=$p;
      var $26=$25;
      var $27=$psize;
      var $add_ptr19=(($26+$27)|0);
      var $28=$base;
      var $29=$size;
      var $add_ptr20=(($28+$29)|0);
      var $add_ptr21=((($add_ptr20)-(40))|0);
      var $cmp22=(($add_ptr19)>>>(0)) >= (($add_ptr21)>>>(0));
      if ($cmp22) { label = 11; break; } else { label = 89; break; }
    case 11: 
      var $30=$p;
      var $31=$30;
      $tp=$31;
      var $32=$p;
      var $33=$m_addr;
      var $dv=(($33+20)|0);
      var $34=HEAP32[(($dv)>>2)];
      var $cmp24=(($32)|(0))==(($34)|(0));
      if ($cmp24) { label = 12; break; } else { label = 13; break; }
    case 12: 
      var $35=$m_addr;
      var $dv26=(($35+20)|0);
      HEAP32[(($dv26)>>2)]=0;
      var $36=$m_addr;
      var $dvsize=(($36+8)|0);
      HEAP32[(($dvsize)>>2)]=0;
      label = 62; break;
    case 13: 
      var $37=$tp;
      var $parent=(($37+24)|0);
      var $38=HEAP32[(($parent)>>2)];
      $XP=$38;
      var $39=$tp;
      var $bk=(($39+12)|0);
      var $40=HEAP32[(($bk)>>2)];
      var $41=$tp;
      var $cmp27=(($40)|(0))!=(($41)|(0));
      if ($cmp27) { label = 14; break; } else { label = 21; break; }
    case 14: 
      var $42=$tp;
      var $fd=(($42+8)|0);
      var $43=HEAP32[(($fd)>>2)];
      $F=$43;
      var $44=$tp;
      var $bk29=(($44+12)|0);
      var $45=HEAP32[(($bk29)>>2)];
      $R=$45;
      var $46=$F;
      var $47=$46;
      var $48=$m_addr;
      var $least_addr=(($48+16)|0);
      var $49=HEAP32[(($least_addr)>>2)];
      var $cmp30=(($47)>>>(0)) >= (($49)>>>(0));
      if ($cmp30) { label = 15; break; } else { var $56 = 0;label = 17; break; }
    case 15: 
      var $50=$F;
      var $bk32=(($50+12)|0);
      var $51=HEAP32[(($bk32)>>2)];
      var $52=$tp;
      var $cmp33=(($51)|(0))==(($52)|(0));
      if ($cmp33) { label = 16; break; } else { var $56 = 0;label = 17; break; }
    case 16: 
      var $53=$R;
      var $fd34=(($53+8)|0);
      var $54=HEAP32[(($fd34)>>2)];
      var $55=$tp;
      var $cmp35=(($54)|(0))==(($55)|(0));
      var $56 = $cmp35;label = 17; break;
    case 17: 
      var $56;
      var $land_ext=(($56)&(1));
      var $expval=($land_ext);
      var $tobool36=(($expval)|(0))!=0;
      if ($tobool36) { label = 18; break; } else { label = 19; break; }
    case 18: 
      var $57=$R;
      var $58=$F;
      var $bk38=(($58+12)|0);
      HEAP32[(($bk38)>>2)]=$57;
      var $59=$F;
      var $60=$R;
      var $fd39=(($60+8)|0);
      HEAP32[(($fd39)>>2)]=$59;
      label = 20; break;
    case 19: 
      _abort();
      throw "Reached an unreachable!";
    case 20: 
      label = 33; break;
    case 21: 
      var $61=$tp;
      var $child=(($61+16)|0);
      var $arrayidx=(($child+4)|0);
      $RP=$arrayidx;
      var $62=HEAP32[(($arrayidx)>>2)];
      $R=$62;
      var $cmp42=(($62)|(0))!=0;
      if ($cmp42) { label = 23; break; } else { label = 22; break; }
    case 22: 
      var $63=$tp;
      var $child43=(($63+16)|0);
      var $arrayidx44=(($child43)|0);
      $RP=$arrayidx44;
      var $64=HEAP32[(($arrayidx44)>>2)];
      $R=$64;
      var $cmp45=(($64)|(0))!=0;
      if ($cmp45) { label = 23; break; } else { label = 32; break; }
    case 23: 
      label = 24; break;
    case 24: 
      var $65=$R;
      var $child48=(($65+16)|0);
      var $arrayidx49=(($child48+4)|0);
      $CP=$arrayidx49;
      var $66=HEAP32[(($arrayidx49)>>2)];
      var $cmp50=(($66)|(0))!=0;
      if ($cmp50) { var $69 = 1;label = 26; break; } else { label = 25; break; }
    case 25: 
      var $67=$R;
      var $child51=(($67+16)|0);
      var $arrayidx52=(($child51)|0);
      $CP=$arrayidx52;
      var $68=HEAP32[(($arrayidx52)>>2)];
      var $cmp53=(($68)|(0))!=0;
      var $69 = $cmp53;label = 26; break;
    case 26: 
      var $69;
      if ($69) { label = 27; break; } else { label = 28; break; }
    case 27: 
      var $70=$CP;
      $RP=$70;
      var $71=HEAP32[(($70)>>2)];
      $R=$71;
      label = 24; break;
    case 28: 
      var $72=$RP;
      var $73=$72;
      var $74=$m_addr;
      var $least_addr55=(($74+16)|0);
      var $75=HEAP32[(($least_addr55)>>2)];
      var $cmp56=(($73)>>>(0)) >= (($75)>>>(0));
      var $conv=(($cmp56)&(1));
      var $expval57=($conv);
      var $tobool58=(($expval57)|(0))!=0;
      if ($tobool58) { label = 29; break; } else { label = 30; break; }
    case 29: 
      var $76=$RP;
      HEAP32[(($76)>>2)]=0;
      label = 31; break;
    case 30: 
      _abort();
      throw "Reached an unreachable!";
    case 31: 
      label = 32; break;
    case 32: 
      label = 33; break;
    case 33: 
      var $77=$XP;
      var $cmp64=(($77)|(0))!=0;
      if ($cmp64) { label = 34; break; } else { label = 61; break; }
    case 34: 
      var $78=$tp;
      var $index=(($78+28)|0);
      var $79=HEAP32[(($index)>>2)];
      var $80=$m_addr;
      var $treebins=(($80+304)|0);
      var $arrayidx67=(($treebins+($79<<2))|0);
      $H=$arrayidx67;
      var $81=$tp;
      var $82=$H;
      var $83=HEAP32[(($82)>>2)];
      var $cmp68=(($81)|(0))==(($83)|(0));
      if ($cmp68) { label = 35; break; } else { label = 38; break; }
    case 35: 
      var $84=$R;
      var $85=$H;
      HEAP32[(($85)>>2)]=$84;
      var $cmp71=(($84)|(0))==0;
      if ($cmp71) { label = 36; break; } else { label = 37; break; }
    case 36: 
      var $86=$tp;
      var $index74=(($86+28)|0);
      var $87=HEAP32[(($index74)>>2)];
      var $shl=1 << $87;
      var $neg=$shl ^ -1;
      var $88=$m_addr;
      var $treemap=(($88+4)|0);
      var $89=HEAP32[(($treemap)>>2)];
      var $and75=$89 & $neg;
      HEAP32[(($treemap)>>2)]=$and75;
      label = 37; break;
    case 37: 
      label = 45; break;
    case 38: 
      var $90=$XP;
      var $91=$90;
      var $92=$m_addr;
      var $least_addr78=(($92+16)|0);
      var $93=HEAP32[(($least_addr78)>>2)];
      var $cmp79=(($91)>>>(0)) >= (($93)>>>(0));
      var $conv80=(($cmp79)&(1));
      var $expval81=($conv80);
      var $tobool82=(($expval81)|(0))!=0;
      if ($tobool82) { label = 39; break; } else { label = 43; break; }
    case 39: 
      var $94=$XP;
      var $child84=(($94+16)|0);
      var $arrayidx85=(($child84)|0);
      var $95=HEAP32[(($arrayidx85)>>2)];
      var $96=$tp;
      var $cmp86=(($95)|(0))==(($96)|(0));
      if ($cmp86) { label = 40; break; } else { label = 41; break; }
    case 40: 
      var $97=$R;
      var $98=$XP;
      var $child89=(($98+16)|0);
      var $arrayidx90=(($child89)|0);
      HEAP32[(($arrayidx90)>>2)]=$97;
      label = 42; break;
    case 41: 
      var $99=$R;
      var $100=$XP;
      var $child92=(($100+16)|0);
      var $arrayidx93=(($child92+4)|0);
      HEAP32[(($arrayidx93)>>2)]=$99;
      label = 42; break;
    case 42: 
      label = 44; break;
    case 43: 
      _abort();
      throw "Reached an unreachable!";
    case 44: 
      label = 45; break;
    case 45: 
      var $101=$R;
      var $cmp98=(($101)|(0))!=0;
      if ($cmp98) { label = 46; break; } else { label = 60; break; }
    case 46: 
      var $102=$R;
      var $103=$102;
      var $104=$m_addr;
      var $least_addr101=(($104+16)|0);
      var $105=HEAP32[(($least_addr101)>>2)];
      var $cmp102=(($103)>>>(0)) >= (($105)>>>(0));
      var $conv103=(($cmp102)&(1));
      var $expval104=($conv103);
      var $tobool105=(($expval104)|(0))!=0;
      if ($tobool105) { label = 47; break; } else { label = 58; break; }
    case 47: 
      var $106=$XP;
      var $107=$R;
      var $parent107=(($107+24)|0);
      HEAP32[(($parent107)>>2)]=$106;
      var $108=$tp;
      var $child108=(($108+16)|0);
      var $arrayidx109=(($child108)|0);
      var $109=HEAP32[(($arrayidx109)>>2)];
      $C0=$109;
      var $cmp110=(($109)|(0))!=0;
      if ($cmp110) { label = 48; break; } else { label = 52; break; }
    case 48: 
      var $110=$C0;
      var $111=$110;
      var $112=$m_addr;
      var $least_addr113=(($112+16)|0);
      var $113=HEAP32[(($least_addr113)>>2)];
      var $cmp114=(($111)>>>(0)) >= (($113)>>>(0));
      var $conv115=(($cmp114)&(1));
      var $expval116=($conv115);
      var $tobool117=(($expval116)|(0))!=0;
      if ($tobool117) { label = 49; break; } else { label = 50; break; }
    case 49: 
      var $114=$C0;
      var $115=$R;
      var $child119=(($115+16)|0);
      var $arrayidx120=(($child119)|0);
      HEAP32[(($arrayidx120)>>2)]=$114;
      var $116=$R;
      var $117=$C0;
      var $parent121=(($117+24)|0);
      HEAP32[(($parent121)>>2)]=$116;
      label = 51; break;
    case 50: 
      _abort();
      throw "Reached an unreachable!";
    case 51: 
      label = 52; break;
    case 52: 
      var $118=$tp;
      var $child125=(($118+16)|0);
      var $arrayidx126=(($child125+4)|0);
      var $119=HEAP32[(($arrayidx126)>>2)];
      $C1=$119;
      var $cmp127=(($119)|(0))!=0;
      if ($cmp127) { label = 53; break; } else { label = 57; break; }
    case 53: 
      var $120=$C1;
      var $121=$120;
      var $122=$m_addr;
      var $least_addr130=(($122+16)|0);
      var $123=HEAP32[(($least_addr130)>>2)];
      var $cmp131=(($121)>>>(0)) >= (($123)>>>(0));
      var $conv132=(($cmp131)&(1));
      var $expval133=($conv132);
      var $tobool134=(($expval133)|(0))!=0;
      if ($tobool134) { label = 54; break; } else { label = 55; break; }
    case 54: 
      var $124=$C1;
      var $125=$R;
      var $child136=(($125+16)|0);
      var $arrayidx137=(($child136+4)|0);
      HEAP32[(($arrayidx137)>>2)]=$124;
      var $126=$R;
      var $127=$C1;
      var $parent138=(($127+24)|0);
      HEAP32[(($parent138)>>2)]=$126;
      label = 56; break;
    case 55: 
      _abort();
      throw "Reached an unreachable!";
    case 56: 
      label = 57; break;
    case 57: 
      label = 59; break;
    case 58: 
      _abort();
      throw "Reached an unreachable!";
    case 59: 
      label = 60; break;
    case 60: 
      label = 61; break;
    case 61: 
      label = 62; break;
    case 62: 
      var $128=$psize;
      var $shr=$128 >>> 8;
      $X=$shr;
      var $129=$X;
      var $cmp148=(($129)|(0))==0;
      if ($cmp148) { label = 63; break; } else { label = 64; break; }
    case 63: 
      $I=0;
      label = 68; break;
    case 64: 
      var $130=$X;
      var $cmp152=(($130)>>>(0)) > 65535;
      if ($cmp152) { label = 65; break; } else { label = 66; break; }
    case 65: 
      $I=31;
      label = 67; break;
    case 66: 
      var $131=$X;
      $Y=$131;
      var $132=$Y;
      var $sub156=((($132)-(256))|0);
      var $shr157=$sub156 >>> 16;
      var $and158=$shr157 & 8;
      $N=$and158;
      var $133=$N;
      var $134=$Y;
      var $shl159=$134 << $133;
      $Y=$shl159;
      var $sub160=((($shl159)-(4096))|0);
      var $shr161=$sub160 >>> 16;
      var $and162=$shr161 & 4;
      $K=$and162;
      var $135=$K;
      var $136=$N;
      var $add=((($136)+($135))|0);
      $N=$add;
      var $137=$K;
      var $138=$Y;
      var $shl163=$138 << $137;
      $Y=$shl163;
      var $sub164=((($shl163)-(16384))|0);
      var $shr165=$sub164 >>> 16;
      var $and166=$shr165 & 2;
      $K=$and166;
      var $139=$N;
      var $add167=((($139)+($and166))|0);
      $N=$add167;
      var $140=$N;
      var $sub168=(((14)-($140))|0);
      var $141=$K;
      var $142=$Y;
      var $shl169=$142 << $141;
      $Y=$shl169;
      var $shr170=$shl169 >>> 15;
      var $add171=((($sub168)+($shr170))|0);
      $K=$add171;
      var $143=$K;
      var $shl172=$143 << 1;
      var $144=$psize;
      var $145=$K;
      var $add173=((($145)+(7))|0);
      var $shr174=$144 >>> (($add173)>>>(0));
      var $and175=$shr174 & 1;
      var $add176=((($shl172)+($and175))|0);
      $I=$add176;
      label = 67; break;
    case 67: 
      label = 68; break;
    case 68: 
      var $146=$I;
      var $147=$m_addr;
      var $treebins179=(($147+304)|0);
      var $arrayidx180=(($treebins179+($146<<2))|0);
      $H147=$arrayidx180;
      var $148=$I;
      var $149=$tp;
      var $index181=(($149+28)|0);
      HEAP32[(($index181)>>2)]=$148;
      var $150=$tp;
      var $child182=(($150+16)|0);
      var $arrayidx183=(($child182+4)|0);
      HEAP32[(($arrayidx183)>>2)]=0;
      var $151=$tp;
      var $child184=(($151+16)|0);
      var $arrayidx185=(($child184)|0);
      HEAP32[(($arrayidx185)>>2)]=0;
      var $152=$m_addr;
      var $treemap186=(($152+4)|0);
      var $153=HEAP32[(($treemap186)>>2)];
      var $154=$I;
      var $shl187=1 << $154;
      var $and188=$153 & $shl187;
      var $tobool189=(($and188)|(0))!=0;
      if ($tobool189) { label = 70; break; } else { label = 69; break; }
    case 69: 
      var $155=$I;
      var $shl191=1 << $155;
      var $156=$m_addr;
      var $treemap192=(($156+4)|0);
      var $157=HEAP32[(($treemap192)>>2)];
      var $or=$157 | $shl191;
      HEAP32[(($treemap192)>>2)]=$or;
      var $158=$tp;
      var $159=$H147;
      HEAP32[(($159)>>2)]=$158;
      var $160=$H147;
      var $161=$160;
      var $162=$tp;
      var $parent193=(($162+24)|0);
      HEAP32[(($parent193)>>2)]=$161;
      var $163=$tp;
      var $164=$tp;
      var $bk194=(($164+12)|0);
      HEAP32[(($bk194)>>2)]=$163;
      var $165=$tp;
      var $fd195=(($165+8)|0);
      HEAP32[(($fd195)>>2)]=$163;
      label = 88; break;
    case 70: 
      var $166=$H147;
      var $167=HEAP32[(($166)>>2)];
      $T=$167;
      var $168=$psize;
      var $169=$I;
      var $cmp198=(($169)|(0))==31;
      if ($cmp198) { label = 71; break; } else { label = 72; break; }
    case 71: 
      var $cond207 = 0;label = 73; break;
    case 72: 
      var $170=$I;
      var $shr202=$170 >>> 1;
      var $add203=((($shr202)+(8))|0);
      var $sub204=((($add203)-(2))|0);
      var $sub205=(((31)-($sub204))|0);
      var $cond207 = $sub205;label = 73; break;
    case 73: 
      var $cond207;
      var $shl208=$168 << $cond207;
      $K197=$shl208;
      label = 74; break;
    case 74: 
      var $171=$T;
      var $head209=(($171+4)|0);
      var $172=HEAP32[(($head209)>>2)];
      var $and210=$172 & -8;
      var $173=$psize;
      var $cmp211=(($and210)|(0))!=(($173)|(0));
      if ($cmp211) { label = 75; break; } else { label = 81; break; }
    case 75: 
      var $174=$K197;
      var $shr214=$174 >>> 31;
      var $and215=$shr214 & 1;
      var $175=$T;
      var $child216=(($175+16)|0);
      var $arrayidx217=(($child216+($and215<<2))|0);
      $C=$arrayidx217;
      var $176=$K197;
      var $shl218=$176 << 1;
      $K197=$shl218;
      var $177=$C;
      var $178=HEAP32[(($177)>>2)];
      var $cmp219=(($178)|(0))!=0;
      if ($cmp219) { label = 76; break; } else { label = 77; break; }
    case 76: 
      var $179=$C;
      var $180=HEAP32[(($179)>>2)];
      $T=$180;
      label = 80; break;
    case 77: 
      var $181=$C;
      var $182=$181;
      var $183=$m_addr;
      var $least_addr223=(($183+16)|0);
      var $184=HEAP32[(($least_addr223)>>2)];
      var $cmp224=(($182)>>>(0)) >= (($184)>>>(0));
      var $conv225=(($cmp224)&(1));
      var $expval226=($conv225);
      var $tobool227=(($expval226)|(0))!=0;
      if ($tobool227) { label = 78; break; } else { label = 79; break; }
    case 78: 
      var $185=$tp;
      var $186=$C;
      HEAP32[(($186)>>2)]=$185;
      var $187=$T;
      var $188=$tp;
      var $parent229=(($188+24)|0);
      HEAP32[(($parent229)>>2)]=$187;
      var $189=$tp;
      var $190=$tp;
      var $bk230=(($190+12)|0);
      HEAP32[(($bk230)>>2)]=$189;
      var $191=$tp;
      var $fd231=(($191+8)|0);
      HEAP32[(($fd231)>>2)]=$189;
      label = 87; break;
    case 79: 
      _abort();
      throw "Reached an unreachable!";
    case 80: 
      label = 86; break;
    case 81: 
      var $192=$T;
      var $fd236=(($192+8)|0);
      var $193=HEAP32[(($fd236)>>2)];
      $F235=$193;
      var $194=$T;
      var $195=$194;
      var $196=$m_addr;
      var $least_addr237=(($196+16)|0);
      var $197=HEAP32[(($least_addr237)>>2)];
      var $cmp238=(($195)>>>(0)) >= (($197)>>>(0));
      if ($cmp238) { label = 82; break; } else { var $202 = 0;label = 83; break; }
    case 82: 
      var $198=$F235;
      var $199=$198;
      var $200=$m_addr;
      var $least_addr241=(($200+16)|0);
      var $201=HEAP32[(($least_addr241)>>2)];
      var $cmp242=(($199)>>>(0)) >= (($201)>>>(0));
      var $202 = $cmp242;label = 83; break;
    case 83: 
      var $202;
      var $land_ext245=(($202)&(1));
      var $expval246=($land_ext245);
      var $tobool247=(($expval246)|(0))!=0;
      if ($tobool247) { label = 84; break; } else { label = 85; break; }
    case 84: 
      var $203=$tp;
      var $204=$F235;
      var $bk249=(($204+12)|0);
      HEAP32[(($bk249)>>2)]=$203;
      var $205=$T;
      var $fd250=(($205+8)|0);
      HEAP32[(($fd250)>>2)]=$203;
      var $206=$F235;
      var $207=$tp;
      var $fd251=(($207+8)|0);
      HEAP32[(($fd251)>>2)]=$206;
      var $208=$T;
      var $209=$tp;
      var $bk252=(($209+12)|0);
      HEAP32[(($bk252)>>2)]=$208;
      var $210=$tp;
      var $parent253=(($210+24)|0);
      HEAP32[(($parent253)>>2)]=0;
      label = 87; break;
    case 85: 
      _abort();
      throw "Reached an unreachable!";
    case 86: 
      label = 74; break;
    case 87: 
      label = 88; break;
    case 88: 
      label = 89; break;
    case 89: 
      label = 90; break;
    case 90: 
      var $211=$sp;
      $pred=$211;
      var $212=$next3;
      $sp=$212;
      label = 3; break;
    case 91: 
      var $213=$nsegs;
      var $cmp260=(($213)>>>(0)) > 4294967295;
      if ($cmp260) { label = 92; break; } else { label = 93; break; }
    case 92: 
      var $214=$nsegs;
      var $cond265 = $214;label = 94; break;
    case 93: 
      var $cond265 = -1;label = 94; break;
    case 94: 
      var $cond265;
      var $215=$m_addr;
      var $release_checks=(($215+32)|0);
      HEAP32[(($release_checks)>>2)]=$cond265;
      var $216=$released;
      return $216;
    default: assert(0, "bad label: " + label);
  }
}
function _init_mparams() {
  var label = 0;
  label = 2; 
  while(1) switch(label) {
    case 2: 
      var $magic;
      var $psize;
      var $gsize;
      var $0=HEAP32[((((5242888)|0))>>2)];
      var $cmp=(($0)|(0))==0;
      if ($cmp) { label = 3; break; } else { label = 7; break; }
    case 3: 
      var $call=_sysconf(8);
      $psize=$call;
      var $1=$psize;
      $gsize=$1;
      var $2=$gsize;
      var $3=$gsize;
      var $sub=((($3)-(1))|0);
      var $and=$2 & $sub;
      var $cmp1=(($and)|(0))!=0;
      if ($cmp1) { label = 5; break; } else { label = 4; break; }
    case 4: 
      var $4=$psize;
      var $5=$psize;
      var $sub2=((($5)-(1))|0);
      var $and3=$4 & $sub2;
      var $cmp4=(($and3)|(0))!=0;
      if ($cmp4) { label = 5; break; } else { label = 6; break; }
    case 5: 
      _abort();
      throw "Reached an unreachable!";
    case 6: 
      var $6=$gsize;
      HEAP32[((((5242896)|0))>>2)]=$6;
      var $7=$psize;
      HEAP32[((((5242892)|0))>>2)]=$7;
      HEAP32[((((5242900)|0))>>2)]=-1;
      HEAP32[((((5242904)|0))>>2)]=2097152;
      HEAP32[((((5242908)|0))>>2)]=0;
      var $8=HEAP32[((((5242908)|0))>>2)];
      HEAP32[((((5243388)|0))>>2)]=$8;
      var $call6=_time(0);
      var $xor=$call6 ^ 1431655765;
      $magic=$xor;
      var $9=$magic;
      var $or=$9 | 8;
      $magic=$or;
      var $10=$magic;
      var $and7=$10 & -8;
      $magic=$and7;
      var $11=$magic;
      HEAP32[((((5242888)|0))>>2)]=$11;
      label = 7; break;
    case 7: 
      return 1;
    default: assert(0, "bad label: " + label);
  }
}
function _init_top($m, $p, $psize) {
  var label = 0;
  label = 2; 
  while(1) switch(label) {
    case 2: 
      var $m_addr;
      var $p_addr;
      var $psize_addr;
      var $offset;
      $m_addr=$m;
      $p_addr=$p;
      $psize_addr=$psize;
      var $0=$p_addr;
      var $1=$0;
      var $add_ptr=(($1+8)|0);
      var $2=$add_ptr;
      var $and=$2 & 7;
      var $cmp=(($and)|(0))==0;
      if ($cmp) { label = 3; break; } else { label = 4; break; }
    case 3: 
      var $cond = 0;label = 5; break;
    case 4: 
      var $3=$p_addr;
      var $4=$3;
      var $add_ptr1=(($4+8)|0);
      var $5=$add_ptr1;
      var $and2=$5 & 7;
      var $sub=(((8)-($and2))|0);
      var $and3=$sub & 7;
      var $cond = $and3;label = 5; break;
    case 5: 
      var $cond;
      $offset=$cond;
      var $6=$p_addr;
      var $7=$6;
      var $8=$offset;
      var $add_ptr4=(($7+$8)|0);
      var $9=$add_ptr4;
      $p_addr=$9;
      var $10=$offset;
      var $11=$psize_addr;
      var $sub5=((($11)-($10))|0);
      $psize_addr=$sub5;
      var $12=$p_addr;
      var $13=$m_addr;
      var $top=(($13+24)|0);
      HEAP32[(($top)>>2)]=$12;
      var $14=$psize_addr;
      var $15=$m_addr;
      var $topsize=(($15+12)|0);
      HEAP32[(($topsize)>>2)]=$14;
      var $16=$psize_addr;
      var $or=$16 | 1;
      var $17=$p_addr;
      var $head=(($17+4)|0);
      HEAP32[(($head)>>2)]=$or;
      var $18=$p_addr;
      var $19=$18;
      var $20=$psize_addr;
      var $add_ptr6=(($19+$20)|0);
      var $21=$add_ptr6;
      var $head7=(($21+4)|0);
      HEAP32[(($head7)>>2)]=40;
      var $22=HEAP32[((((5242904)|0))>>2)];
      var $23=$m_addr;
      var $trim_check=(($23+28)|0);
      HEAP32[(($trim_check)>>2)]=$22;
      return;
    default: assert(0, "bad label: " + label);
  }
}
function _mmap_alloc($m, $nb) {
  var label = 0;
  label = 2; 
  while(1) switch(label) {
    case 2: 
      var $retval;
      var $m_addr;
      var $nb_addr;
      var $mmsize;
      var $fp;
      var $mm;
      var $offset;
      var $psize;
      var $p;
      $m_addr=$m;
      $nb_addr=$nb;
      var $0=$nb_addr;
      var $add=((($0)+(24))|0);
      var $add1=((($add)+(7))|0);
      var $1=HEAP32[((((5242892)|0))>>2)];
      var $sub=((($1)-(1))|0);
      var $add2=((($add1)+($sub))|0);
      var $2=HEAP32[((((5242892)|0))>>2)];
      var $sub3=((($2)-(1))|0);
      var $neg=$sub3 ^ -1;
      var $and=$add2 & $neg;
      $mmsize=$and;
      var $3=$m_addr;
      var $footprint_limit=(($3+440)|0);
      var $4=HEAP32[(($footprint_limit)>>2)];
      var $cmp=(($4)|(0))!=0;
      if ($cmp) { label = 3; break; } else { label = 7; break; }
    case 3: 
      var $5=$m_addr;
      var $footprint=(($5+432)|0);
      var $6=HEAP32[(($footprint)>>2)];
      var $7=$mmsize;
      var $add4=((($6)+($7))|0);
      $fp=$add4;
      var $8=$fp;
      var $9=$m_addr;
      var $footprint5=(($9+432)|0);
      var $10=HEAP32[(($footprint5)>>2)];
      var $cmp6=(($8)>>>(0)) <= (($10)>>>(0));
      if ($cmp6) { label = 5; break; } else { label = 4; break; }
    case 4: 
      var $11=$fp;
      var $12=$m_addr;
      var $footprint_limit7=(($12+440)|0);
      var $13=HEAP32[(($footprint_limit7)>>2)];
      var $cmp8=(($11)>>>(0)) > (($13)>>>(0));
      if ($cmp8) { label = 5; break; } else { label = 6; break; }
    case 5: 
      $retval=0;
      label = 20; break;
    case 6: 
      label = 7; break;
    case 7: 
      var $14=$mmsize;
      var $15=$nb_addr;
      var $cmp11=(($14)>>>(0)) > (($15)>>>(0));
      if ($cmp11) { label = 8; break; } else { label = 19; break; }
    case 8: 
      $mm=-1;
      var $16=$mm;
      var $cmp13=(($16)|(0))!=-1;
      if ($cmp13) { label = 9; break; } else { label = 18; break; }
    case 9: 
      var $17=$mm;
      var $add_ptr=(($17+8)|0);
      var $18=$add_ptr;
      var $and15=$18 & 7;
      var $cmp16=(($and15)|(0))==0;
      if ($cmp16) { label = 10; break; } else { label = 11; break; }
    case 10: 
      var $cond = 0;label = 12; break;
    case 11: 
      var $19=$mm;
      var $add_ptr17=(($19+8)|0);
      var $20=$add_ptr17;
      var $and18=$20 & 7;
      var $sub19=(((8)-($and18))|0);
      var $and20=$sub19 & 7;
      var $cond = $and20;label = 12; break;
    case 12: 
      var $cond;
      $offset=$cond;
      var $21=$mmsize;
      var $22=$offset;
      var $sub21=((($21)-($22))|0);
      var $sub22=((($sub21)-(16))|0);
      $psize=$sub22;
      var $23=$mm;
      var $24=$offset;
      var $add_ptr23=(($23+$24)|0);
      var $25=$add_ptr23;
      $p=$25;
      var $26=$offset;
      var $27=$p;
      var $prev_foot=(($27)|0);
      HEAP32[(($prev_foot)>>2)]=$26;
      var $28=$psize;
      var $29=$p;
      var $head=(($29+4)|0);
      HEAP32[(($head)>>2)]=$28;
      var $30=$p;
      var $31=$30;
      var $32=$psize;
      var $add_ptr24=(($31+$32)|0);
      var $33=$add_ptr24;
      var $head25=(($33+4)|0);
      HEAP32[(($head25)>>2)]=7;
      var $34=$p;
      var $35=$34;
      var $36=$psize;
      var $add26=((($36)+(4))|0);
      var $add_ptr27=(($35+$add26)|0);
      var $37=$add_ptr27;
      var $head28=(($37+4)|0);
      HEAP32[(($head28)>>2)]=0;
      var $38=$m_addr;
      var $least_addr=(($38+16)|0);
      var $39=HEAP32[(($least_addr)>>2)];
      var $cmp29=(($39)|(0))==0;
      if ($cmp29) { label = 14; break; } else { label = 13; break; }
    case 13: 
      var $40=$mm;
      var $41=$m_addr;
      var $least_addr31=(($41+16)|0);
      var $42=HEAP32[(($least_addr31)>>2)];
      var $cmp32=(($40)>>>(0)) < (($42)>>>(0));
      if ($cmp32) { label = 14; break; } else { label = 15; break; }
    case 14: 
      var $43=$mm;
      var $44=$m_addr;
      var $least_addr34=(($44+16)|0);
      HEAP32[(($least_addr34)>>2)]=$43;
      label = 15; break;
    case 15: 
      var $45=$mmsize;
      var $46=$m_addr;
      var $footprint36=(($46+432)|0);
      var $47=HEAP32[(($footprint36)>>2)];
      var $add37=((($47)+($45))|0);
      HEAP32[(($footprint36)>>2)]=$add37;
      var $48=$m_addr;
      var $max_footprint=(($48+436)|0);
      var $49=HEAP32[(($max_footprint)>>2)];
      var $cmp38=(($add37)>>>(0)) > (($49)>>>(0));
      if ($cmp38) { label = 16; break; } else { label = 17; break; }
    case 16: 
      var $50=$m_addr;
      var $footprint40=(($50+432)|0);
      var $51=HEAP32[(($footprint40)>>2)];
      var $52=$m_addr;
      var $max_footprint41=(($52+436)|0);
      HEAP32[(($max_footprint41)>>2)]=$51;
      label = 17; break;
    case 17: 
      var $53=$p;
      var $54=$53;
      var $add_ptr43=(($54+8)|0);
      $retval=$add_ptr43;
      label = 20; break;
    case 18: 
      label = 19; break;
    case 19: 
      $retval=0;
      label = 20; break;
    case 20: 
      var $55=$retval;
      return $55;
    default: assert(0, "bad label: " + label);
  }
}
function _init_bins($m) {
  var label = 0;
  label = 2; 
  while(1) switch(label) {
    case 2: 
      var $m_addr;
      var $i;
      var $bin;
      $m_addr=$m;
      $i=0;
      label = 3; break;
    case 3: 
      var $0=$i;
      var $cmp=(($0)>>>(0)) < 32;
      if ($cmp) { label = 4; break; } else { label = 6; break; }
    case 4: 
      var $1=$i;
      var $shl=$1 << 1;
      var $2=$m_addr;
      var $smallbins=(($2+40)|0);
      var $arrayidx=(($smallbins+($shl<<2))|0);
      var $3=$arrayidx;
      var $4=$3;
      $bin=$4;
      var $5=$bin;
      var $6=$bin;
      var $bk=(($6+12)|0);
      HEAP32[(($bk)>>2)]=$5;
      var $7=$bin;
      var $fd=(($7+8)|0);
      HEAP32[(($fd)>>2)]=$5;
      label = 5; break;
    case 5: 
      var $8=$i;
      var $inc=((($8)+(1))|0);
      $i=$inc;
      label = 3; break;
    case 6: 
      return;
    default: assert(0, "bad label: " + label);
  }
}
function _prepend_alloc($m, $newbase, $oldbase, $nb) {
  var label = 0;
  label = 2; 
  while(1) switch(label) {
    case 2: 
      var $m_addr;
      var $newbase_addr;
      var $oldbase_addr;
      var $nb_addr;
      var $p;
      var $oldfirst;
      var $psize;
      var $q;
      var $qsize;
      var $tsize;
      var $dsize;
      var $nsize;
      var $F;
      var $B;
      var $I;
      var $TP;
      var $XP;
      var $R;
      var $F77;
      var $RP;
      var $CP;
      var $H;
      var $C0;
      var $C1;
      var $I218;
      var $B220;
      var $F224;
      var $TP250;
      var $H251;
      var $I252;
      var $X;
      var $Y;
      var $N;
      var $K;
      var $T;
      var $K305;
      var $C;
      var $F343;
      $m_addr=$m;
      $newbase_addr=$newbase;
      $oldbase_addr=$oldbase;
      $nb_addr=$nb;
      var $0=$newbase_addr;
      var $1=$newbase_addr;
      var $add_ptr=(($1+8)|0);
      var $2=$add_ptr;
      var $and=$2 & 7;
      var $cmp=(($and)|(0))==0;
      if ($cmp) { label = 3; break; } else { label = 4; break; }
    case 3: 
      var $cond = 0;label = 5; break;
    case 4: 
      var $3=$newbase_addr;
      var $add_ptr1=(($3+8)|0);
      var $4=$add_ptr1;
      var $and2=$4 & 7;
      var $sub=(((8)-($and2))|0);
      var $and3=$sub & 7;
      var $cond = $and3;label = 5; break;
    case 5: 
      var $cond;
      var $add_ptr4=(($0+$cond)|0);
      var $5=$add_ptr4;
      $p=$5;
      var $6=$oldbase_addr;
      var $7=$oldbase_addr;
      var $add_ptr5=(($7+8)|0);
      var $8=$add_ptr5;
      var $and6=$8 & 7;
      var $cmp7=(($and6)|(0))==0;
      if ($cmp7) { label = 6; break; } else { label = 7; break; }
    case 6: 
      var $cond15 = 0;label = 8; break;
    case 7: 
      var $9=$oldbase_addr;
      var $add_ptr10=(($9+8)|0);
      var $10=$add_ptr10;
      var $and11=$10 & 7;
      var $sub12=(((8)-($and11))|0);
      var $and13=$sub12 & 7;
      var $cond15 = $and13;label = 8; break;
    case 8: 
      var $cond15;
      var $add_ptr16=(($6+$cond15)|0);
      var $11=$add_ptr16;
      $oldfirst=$11;
      var $12=$oldfirst;
      var $13=$12;
      var $14=$p;
      var $15=$14;
      var $sub_ptr_lhs_cast=$13;
      var $sub_ptr_rhs_cast=$15;
      var $sub_ptr_sub=((($sub_ptr_lhs_cast)-($sub_ptr_rhs_cast))|0);
      $psize=$sub_ptr_sub;
      var $16=$p;
      var $17=$16;
      var $18=$nb_addr;
      var $add_ptr17=(($17+$18)|0);
      var $19=$add_ptr17;
      $q=$19;
      var $20=$psize;
      var $21=$nb_addr;
      var $sub18=((($20)-($21))|0);
      $qsize=$sub18;
      var $22=$nb_addr;
      var $or=$22 | 1;
      var $or19=$or | 2;
      var $23=$p;
      var $head=(($23+4)|0);
      HEAP32[(($head)>>2)]=$or19;
      var $24=$oldfirst;
      var $25=$m_addr;
      var $top=(($25+24)|0);
      var $26=HEAP32[(($top)>>2)];
      var $cmp20=(($24)|(0))==(($26)|(0));
      if ($cmp20) { label = 9; break; } else { label = 10; break; }
    case 9: 
      var $27=$qsize;
      var $28=$m_addr;
      var $topsize=(($28+12)|0);
      var $29=HEAP32[(($topsize)>>2)];
      var $add=((($29)+($27))|0);
      HEAP32[(($topsize)>>2)]=$add;
      $tsize=$add;
      var $30=$q;
      var $31=$m_addr;
      var $top21=(($31+24)|0);
      HEAP32[(($top21)>>2)]=$30;
      var $32=$tsize;
      var $or22=$32 | 1;
      var $33=$q;
      var $head23=(($33+4)|0);
      HEAP32[(($head23)>>2)]=$or22;
      label = 119; break;
    case 10: 
      var $34=$oldfirst;
      var $35=$m_addr;
      var $dv=(($35+20)|0);
      var $36=HEAP32[(($dv)>>2)];
      var $cmp24=(($34)|(0))==(($36)|(0));
      if ($cmp24) { label = 11; break; } else { label = 12; break; }
    case 11: 
      var $37=$qsize;
      var $38=$m_addr;
      var $dvsize=(($38+8)|0);
      var $39=HEAP32[(($dvsize)>>2)];
      var $add26=((($39)+($37))|0);
      HEAP32[(($dvsize)>>2)]=$add26;
      $dsize=$add26;
      var $40=$q;
      var $41=$m_addr;
      var $dv27=(($41+20)|0);
      HEAP32[(($dv27)>>2)]=$40;
      var $42=$dsize;
      var $or28=$42 | 1;
      var $43=$q;
      var $head29=(($43+4)|0);
      HEAP32[(($head29)>>2)]=$or28;
      var $44=$dsize;
      var $45=$q;
      var $46=$45;
      var $47=$dsize;
      var $add_ptr30=(($46+$47)|0);
      var $48=$add_ptr30;
      var $prev_foot=(($48)|0);
      HEAP32[(($prev_foot)>>2)]=$44;
      label = 118; break;
    case 12: 
      var $49=$oldfirst;
      var $head32=(($49+4)|0);
      var $50=HEAP32[(($head32)>>2)];
      var $and33=$50 & 3;
      var $cmp34=(($and33)|(0))!=1;
      if ($cmp34) { label = 82; break; } else { label = 13; break; }
    case 13: 
      var $51=$oldfirst;
      var $head36=(($51+4)|0);
      var $52=HEAP32[(($head36)>>2)];
      var $and37=$52 & -8;
      $nsize=$and37;
      var $53=$nsize;
      var $shr=$53 >>> 3;
      var $cmp38=(($shr)>>>(0)) < 32;
      if ($cmp38) { label = 14; break; } else { label = 32; break; }
    case 14: 
      var $54=$oldfirst;
      var $fd=(($54+8)|0);
      var $55=HEAP32[(($fd)>>2)];
      $F=$55;
      var $56=$oldfirst;
      var $bk=(($56+12)|0);
      var $57=HEAP32[(($bk)>>2)];
      $B=$57;
      var $58=$nsize;
      var $shr40=$58 >>> 3;
      $I=$shr40;
      var $59=$F;
      var $60=$I;
      var $shl=$60 << 1;
      var $61=$m_addr;
      var $smallbins=(($61+40)|0);
      var $arrayidx=(($smallbins+($shl<<2))|0);
      var $62=$arrayidx;
      var $63=$62;
      var $cmp41=(($59)|(0))==(($63)|(0));
      if ($cmp41) { var $72 = 1;label = 18; break; } else { label = 15; break; }
    case 15: 
      var $64=$F;
      var $65=$64;
      var $66=$m_addr;
      var $least_addr=(($66+16)|0);
      var $67=HEAP32[(($least_addr)>>2)];
      var $cmp42=(($65)>>>(0)) >= (($67)>>>(0));
      if ($cmp42) { label = 16; break; } else { var $71 = 0;label = 17; break; }
    case 16: 
      var $68=$F;
      var $bk43=(($68+12)|0);
      var $69=HEAP32[(($bk43)>>2)];
      var $70=$oldfirst;
      var $cmp44=(($69)|(0))==(($70)|(0));
      var $71 = $cmp44;label = 17; break;
    case 17: 
      var $71;
      var $72 = $71;label = 18; break;
    case 18: 
      var $72;
      var $lor_ext=(($72)&(1));
      var $expval=($lor_ext);
      var $tobool=(($expval)|(0))!=0;
      if ($tobool) { label = 19; break; } else { label = 30; break; }
    case 19: 
      var $73=$B;
      var $74=$F;
      var $cmp46=(($73)|(0))==(($74)|(0));
      if ($cmp46) { label = 20; break; } else { label = 21; break; }
    case 20: 
      var $75=$I;
      var $shl48=1 << $75;
      var $neg=$shl48 ^ -1;
      var $76=$m_addr;
      var $smallmap=(($76)|0);
      var $77=HEAP32[(($smallmap)>>2)];
      var $and49=$77 & $neg;
      HEAP32[(($smallmap)>>2)]=$and49;
      label = 29; break;
    case 21: 
      var $78=$B;
      var $79=$I;
      var $shl51=$79 << 1;
      var $80=$m_addr;
      var $smallbins52=(($80+40)|0);
      var $arrayidx53=(($smallbins52+($shl51<<2))|0);
      var $81=$arrayidx53;
      var $82=$81;
      var $cmp54=(($78)|(0))==(($82)|(0));
      if ($cmp54) { var $91 = 1;label = 25; break; } else { label = 22; break; }
    case 22: 
      var $83=$B;
      var $84=$83;
      var $85=$m_addr;
      var $least_addr56=(($85+16)|0);
      var $86=HEAP32[(($least_addr56)>>2)];
      var $cmp57=(($84)>>>(0)) >= (($86)>>>(0));
      if ($cmp57) { label = 23; break; } else { var $90 = 0;label = 24; break; }
    case 23: 
      var $87=$B;
      var $fd59=(($87+8)|0);
      var $88=HEAP32[(($fd59)>>2)];
      var $89=$oldfirst;
      var $cmp60=(($88)|(0))==(($89)|(0));
      var $90 = $cmp60;label = 24; break;
    case 24: 
      var $90;
      var $91 = $90;label = 25; break;
    case 25: 
      var $91;
      var $lor_ext63=(($91)&(1));
      var $expval64=($lor_ext63);
      var $tobool65=(($expval64)|(0))!=0;
      if ($tobool65) { label = 26; break; } else { label = 27; break; }
    case 26: 
      var $92=$B;
      var $93=$F;
      var $bk67=(($93+12)|0);
      HEAP32[(($bk67)>>2)]=$92;
      var $94=$F;
      var $95=$B;
      var $fd68=(($95+8)|0);
      HEAP32[(($fd68)>>2)]=$94;
      label = 28; break;
    case 27: 
      _abort();
      throw "Reached an unreachable!";
    case 28: 
      label = 29; break;
    case 29: 
      label = 31; break;
    case 30: 
      _abort();
      throw "Reached an unreachable!";
    case 31: 
      label = 81; break;
    case 32: 
      var $96=$oldfirst;
      var $97=$96;
      $TP=$97;
      var $98=$TP;
      var $parent=(($98+24)|0);
      var $99=HEAP32[(($parent)>>2)];
      $XP=$99;
      var $100=$TP;
      var $bk74=(($100+12)|0);
      var $101=HEAP32[(($bk74)>>2)];
      var $102=$TP;
      var $cmp75=(($101)|(0))!=(($102)|(0));
      if ($cmp75) { label = 33; break; } else { label = 40; break; }
    case 33: 
      var $103=$TP;
      var $fd78=(($103+8)|0);
      var $104=HEAP32[(($fd78)>>2)];
      $F77=$104;
      var $105=$TP;
      var $bk79=(($105+12)|0);
      var $106=HEAP32[(($bk79)>>2)];
      $R=$106;
      var $107=$F77;
      var $108=$107;
      var $109=$m_addr;
      var $least_addr80=(($109+16)|0);
      var $110=HEAP32[(($least_addr80)>>2)];
      var $cmp81=(($108)>>>(0)) >= (($110)>>>(0));
      if ($cmp81) { label = 34; break; } else { var $117 = 0;label = 36; break; }
    case 34: 
      var $111=$F77;
      var $bk82=(($111+12)|0);
      var $112=HEAP32[(($bk82)>>2)];
      var $113=$TP;
      var $cmp83=(($112)|(0))==(($113)|(0));
      if ($cmp83) { label = 35; break; } else { var $117 = 0;label = 36; break; }
    case 35: 
      var $114=$R;
      var $fd85=(($114+8)|0);
      var $115=HEAP32[(($fd85)>>2)];
      var $116=$TP;
      var $cmp86=(($115)|(0))==(($116)|(0));
      var $117 = $cmp86;label = 36; break;
    case 36: 
      var $117;
      var $land_ext=(($117)&(1));
      var $expval88=($land_ext);
      var $tobool89=(($expval88)|(0))!=0;
      if ($tobool89) { label = 37; break; } else { label = 38; break; }
    case 37: 
      var $118=$R;
      var $119=$F77;
      var $bk91=(($119+12)|0);
      HEAP32[(($bk91)>>2)]=$118;
      var $120=$F77;
      var $121=$R;
      var $fd92=(($121+8)|0);
      HEAP32[(($fd92)>>2)]=$120;
      label = 39; break;
    case 38: 
      _abort();
      throw "Reached an unreachable!";
    case 39: 
      label = 52; break;
    case 40: 
      var $122=$TP;
      var $child=(($122+16)|0);
      var $arrayidx96=(($child+4)|0);
      $RP=$arrayidx96;
      var $123=HEAP32[(($arrayidx96)>>2)];
      $R=$123;
      var $cmp97=(($123)|(0))!=0;
      if ($cmp97) { label = 42; break; } else { label = 41; break; }
    case 41: 
      var $124=$TP;
      var $child98=(($124+16)|0);
      var $arrayidx99=(($child98)|0);
      $RP=$arrayidx99;
      var $125=HEAP32[(($arrayidx99)>>2)];
      $R=$125;
      var $cmp100=(($125)|(0))!=0;
      if ($cmp100) { label = 42; break; } else { label = 51; break; }
    case 42: 
      label = 43; break;
    case 43: 
      var $126=$R;
      var $child102=(($126+16)|0);
      var $arrayidx103=(($child102+4)|0);
      $CP=$arrayidx103;
      var $127=HEAP32[(($arrayidx103)>>2)];
      var $cmp104=(($127)|(0))!=0;
      if ($cmp104) { var $130 = 1;label = 45; break; } else { label = 44; break; }
    case 44: 
      var $128=$R;
      var $child106=(($128+16)|0);
      var $arrayidx107=(($child106)|0);
      $CP=$arrayidx107;
      var $129=HEAP32[(($arrayidx107)>>2)];
      var $cmp108=(($129)|(0))!=0;
      var $130 = $cmp108;label = 45; break;
    case 45: 
      var $130;
      if ($130) { label = 46; break; } else { label = 47; break; }
    case 46: 
      var $131=$CP;
      $RP=$131;
      var $132=HEAP32[(($131)>>2)];
      $R=$132;
      label = 43; break;
    case 47: 
      var $133=$RP;
      var $134=$133;
      var $135=$m_addr;
      var $least_addr111=(($135+16)|0);
      var $136=HEAP32[(($least_addr111)>>2)];
      var $cmp112=(($134)>>>(0)) >= (($136)>>>(0));
      var $conv=(($cmp112)&(1));
      var $expval113=($conv);
      var $tobool114=(($expval113)|(0))!=0;
      if ($tobool114) { label = 48; break; } else { label = 49; break; }
    case 48: 
      var $137=$RP;
      HEAP32[(($137)>>2)]=0;
      label = 50; break;
    case 49: 
      _abort();
      throw "Reached an unreachable!";
    case 50: 
      label = 51; break;
    case 51: 
      label = 52; break;
    case 52: 
      var $138=$XP;
      var $cmp120=(($138)|(0))!=0;
      if ($cmp120) { label = 53; break; } else { label = 80; break; }
    case 53: 
      var $139=$TP;
      var $index=(($139+28)|0);
      var $140=HEAP32[(($index)>>2)];
      var $141=$m_addr;
      var $treebins=(($141+304)|0);
      var $arrayidx123=(($treebins+($140<<2))|0);
      $H=$arrayidx123;
      var $142=$TP;
      var $143=$H;
      var $144=HEAP32[(($143)>>2)];
      var $cmp124=(($142)|(0))==(($144)|(0));
      if ($cmp124) { label = 54; break; } else { label = 57; break; }
    case 54: 
      var $145=$R;
      var $146=$H;
      HEAP32[(($146)>>2)]=$145;
      var $cmp127=(($145)|(0))==0;
      if ($cmp127) { label = 55; break; } else { label = 56; break; }
    case 55: 
      var $147=$TP;
      var $index130=(($147+28)|0);
      var $148=HEAP32[(($index130)>>2)];
      var $shl131=1 << $148;
      var $neg132=$shl131 ^ -1;
      var $149=$m_addr;
      var $treemap=(($149+4)|0);
      var $150=HEAP32[(($treemap)>>2)];
      var $and133=$150 & $neg132;
      HEAP32[(($treemap)>>2)]=$and133;
      label = 56; break;
    case 56: 
      label = 64; break;
    case 57: 
      var $151=$XP;
      var $152=$151;
      var $153=$m_addr;
      var $least_addr136=(($153+16)|0);
      var $154=HEAP32[(($least_addr136)>>2)];
      var $cmp137=(($152)>>>(0)) >= (($154)>>>(0));
      var $conv138=(($cmp137)&(1));
      var $expval139=($conv138);
      var $tobool140=(($expval139)|(0))!=0;
      if ($tobool140) { label = 58; break; } else { label = 62; break; }
    case 58: 
      var $155=$XP;
      var $child142=(($155+16)|0);
      var $arrayidx143=(($child142)|0);
      var $156=HEAP32[(($arrayidx143)>>2)];
      var $157=$TP;
      var $cmp144=(($156)|(0))==(($157)|(0));
      if ($cmp144) { label = 59; break; } else { label = 60; break; }
    case 59: 
      var $158=$R;
      var $159=$XP;
      var $child147=(($159+16)|0);
      var $arrayidx148=(($child147)|0);
      HEAP32[(($arrayidx148)>>2)]=$158;
      label = 61; break;
    case 60: 
      var $160=$R;
      var $161=$XP;
      var $child150=(($161+16)|0);
      var $arrayidx151=(($child150+4)|0);
      HEAP32[(($arrayidx151)>>2)]=$160;
      label = 61; break;
    case 61: 
      label = 63; break;
    case 62: 
      _abort();
      throw "Reached an unreachable!";
    case 63: 
      label = 64; break;
    case 64: 
      var $162=$R;
      var $cmp156=(($162)|(0))!=0;
      if ($cmp156) { label = 65; break; } else { label = 79; break; }
    case 65: 
      var $163=$R;
      var $164=$163;
      var $165=$m_addr;
      var $least_addr159=(($165+16)|0);
      var $166=HEAP32[(($least_addr159)>>2)];
      var $cmp160=(($164)>>>(0)) >= (($166)>>>(0));
      var $conv161=(($cmp160)&(1));
      var $expval162=($conv161);
      var $tobool163=(($expval162)|(0))!=0;
      if ($tobool163) { label = 66; break; } else { label = 77; break; }
    case 66: 
      var $167=$XP;
      var $168=$R;
      var $parent165=(($168+24)|0);
      HEAP32[(($parent165)>>2)]=$167;
      var $169=$TP;
      var $child166=(($169+16)|0);
      var $arrayidx167=(($child166)|0);
      var $170=HEAP32[(($arrayidx167)>>2)];
      $C0=$170;
      var $cmp168=(($170)|(0))!=0;
      if ($cmp168) { label = 67; break; } else { label = 71; break; }
    case 67: 
      var $171=$C0;
      var $172=$171;
      var $173=$m_addr;
      var $least_addr171=(($173+16)|0);
      var $174=HEAP32[(($least_addr171)>>2)];
      var $cmp172=(($172)>>>(0)) >= (($174)>>>(0));
      var $conv173=(($cmp172)&(1));
      var $expval174=($conv173);
      var $tobool175=(($expval174)|(0))!=0;
      if ($tobool175) { label = 68; break; } else { label = 69; break; }
    case 68: 
      var $175=$C0;
      var $176=$R;
      var $child177=(($176+16)|0);
      var $arrayidx178=(($child177)|0);
      HEAP32[(($arrayidx178)>>2)]=$175;
      var $177=$R;
      var $178=$C0;
      var $parent179=(($178+24)|0);
      HEAP32[(($parent179)>>2)]=$177;
      label = 70; break;
    case 69: 
      _abort();
      throw "Reached an unreachable!";
    case 70: 
      label = 71; break;
    case 71: 
      var $179=$TP;
      var $child183=(($179+16)|0);
      var $arrayidx184=(($child183+4)|0);
      var $180=HEAP32[(($arrayidx184)>>2)];
      $C1=$180;
      var $cmp185=(($180)|(0))!=0;
      if ($cmp185) { label = 72; break; } else { label = 76; break; }
    case 72: 
      var $181=$C1;
      var $182=$181;
      var $183=$m_addr;
      var $least_addr188=(($183+16)|0);
      var $184=HEAP32[(($least_addr188)>>2)];
      var $cmp189=(($182)>>>(0)) >= (($184)>>>(0));
      var $conv190=(($cmp189)&(1));
      var $expval191=($conv190);
      var $tobool192=(($expval191)|(0))!=0;
      if ($tobool192) { label = 73; break; } else { label = 74; break; }
    case 73: 
      var $185=$C1;
      var $186=$R;
      var $child194=(($186+16)|0);
      var $arrayidx195=(($child194+4)|0);
      HEAP32[(($arrayidx195)>>2)]=$185;
      var $187=$R;
      var $188=$C1;
      var $parent196=(($188+24)|0);
      HEAP32[(($parent196)>>2)]=$187;
      label = 75; break;
    case 74: 
      _abort();
      throw "Reached an unreachable!";
    case 75: 
      label = 76; break;
    case 76: 
      label = 78; break;
    case 77: 
      _abort();
      throw "Reached an unreachable!";
    case 78: 
      label = 79; break;
    case 79: 
      label = 80; break;
    case 80: 
      label = 81; break;
    case 81: 
      var $189=$oldfirst;
      var $190=$189;
      var $191=$nsize;
      var $add_ptr205=(($190+$191)|0);
      var $192=$add_ptr205;
      $oldfirst=$192;
      var $193=$nsize;
      var $194=$qsize;
      var $add206=((($194)+($193))|0);
      $qsize=$add206;
      label = 82; break;
    case 82: 
      var $195=$oldfirst;
      var $head208=(($195+4)|0);
      var $196=HEAP32[(($head208)>>2)];
      var $and209=$196 & -2;
      HEAP32[(($head208)>>2)]=$and209;
      var $197=$qsize;
      var $or210=$197 | 1;
      var $198=$q;
      var $head211=(($198+4)|0);
      HEAP32[(($head211)>>2)]=$or210;
      var $199=$qsize;
      var $200=$q;
      var $201=$200;
      var $202=$qsize;
      var $add_ptr212=(($201+$202)|0);
      var $203=$add_ptr212;
      var $prev_foot213=(($203)|0);
      HEAP32[(($prev_foot213)>>2)]=$199;
      var $204=$qsize;
      var $shr214=$204 >>> 3;
      var $cmp215=(($shr214)>>>(0)) < 32;
      if ($cmp215) { label = 83; break; } else { label = 90; break; }
    case 83: 
      var $205=$qsize;
      var $shr219=$205 >>> 3;
      $I218=$shr219;
      var $206=$I218;
      var $shl221=$206 << 1;
      var $207=$m_addr;
      var $smallbins222=(($207+40)|0);
      var $arrayidx223=(($smallbins222+($shl221<<2))|0);
      var $208=$arrayidx223;
      var $209=$208;
      $B220=$209;
      var $210=$B220;
      $F224=$210;
      var $211=$m_addr;
      var $smallmap225=(($211)|0);
      var $212=HEAP32[(($smallmap225)>>2)];
      var $213=$I218;
      var $shl226=1 << $213;
      var $and227=$212 & $shl226;
      var $tobool228=(($and227)|(0))!=0;
      if ($tobool228) { label = 85; break; } else { label = 84; break; }
    case 84: 
      var $214=$I218;
      var $shl230=1 << $214;
      var $215=$m_addr;
      var $smallmap231=(($215)|0);
      var $216=HEAP32[(($smallmap231)>>2)];
      var $or232=$216 | $shl230;
      HEAP32[(($smallmap231)>>2)]=$or232;
      label = 89; break;
    case 85: 
      var $217=$B220;
      var $fd234=(($217+8)|0);
      var $218=HEAP32[(($fd234)>>2)];
      var $219=$218;
      var $220=$m_addr;
      var $least_addr235=(($220+16)|0);
      var $221=HEAP32[(($least_addr235)>>2)];
      var $cmp236=(($219)>>>(0)) >= (($221)>>>(0));
      var $conv237=(($cmp236)&(1));
      var $expval238=($conv237);
      var $tobool239=(($expval238)|(0))!=0;
      if ($tobool239) { label = 86; break; } else { label = 87; break; }
    case 86: 
      var $222=$B220;
      var $fd241=(($222+8)|0);
      var $223=HEAP32[(($fd241)>>2)];
      $F224=$223;
      label = 88; break;
    case 87: 
      _abort();
      throw "Reached an unreachable!";
    case 88: 
      label = 89; break;
    case 89: 
      var $224=$q;
      var $225=$B220;
      var $fd245=(($225+8)|0);
      HEAP32[(($fd245)>>2)]=$224;
      var $226=$q;
      var $227=$F224;
      var $bk246=(($227+12)|0);
      HEAP32[(($bk246)>>2)]=$226;
      var $228=$F224;
      var $229=$q;
      var $fd247=(($229+8)|0);
      HEAP32[(($fd247)>>2)]=$228;
      var $230=$B220;
      var $231=$q;
      var $bk248=(($231+12)|0);
      HEAP32[(($bk248)>>2)]=$230;
      label = 117; break;
    case 90: 
      var $232=$q;
      var $233=$232;
      $TP250=$233;
      var $234=$qsize;
      var $shr253=$234 >>> 8;
      $X=$shr253;
      var $235=$X;
      var $cmp254=(($235)|(0))==0;
      if ($cmp254) { label = 91; break; } else { label = 92; break; }
    case 91: 
      $I252=0;
      label = 96; break;
    case 92: 
      var $236=$X;
      var $cmp258=(($236)>>>(0)) > 65535;
      if ($cmp258) { label = 93; break; } else { label = 94; break; }
    case 93: 
      $I252=31;
      label = 95; break;
    case 94: 
      var $237=$X;
      $Y=$237;
      var $238=$Y;
      var $sub262=((($238)-(256))|0);
      var $shr263=$sub262 >>> 16;
      var $and264=$shr263 & 8;
      $N=$and264;
      var $239=$N;
      var $240=$Y;
      var $shl265=$240 << $239;
      $Y=$shl265;
      var $sub266=((($shl265)-(4096))|0);
      var $shr267=$sub266 >>> 16;
      var $and268=$shr267 & 4;
      $K=$and268;
      var $241=$K;
      var $242=$N;
      var $add269=((($242)+($241))|0);
      $N=$add269;
      var $243=$K;
      var $244=$Y;
      var $shl270=$244 << $243;
      $Y=$shl270;
      var $sub271=((($shl270)-(16384))|0);
      var $shr272=$sub271 >>> 16;
      var $and273=$shr272 & 2;
      $K=$and273;
      var $245=$N;
      var $add274=((($245)+($and273))|0);
      $N=$add274;
      var $246=$N;
      var $sub275=(((14)-($246))|0);
      var $247=$K;
      var $248=$Y;
      var $shl276=$248 << $247;
      $Y=$shl276;
      var $shr277=$shl276 >>> 15;
      var $add278=((($sub275)+($shr277))|0);
      $K=$add278;
      var $249=$K;
      var $shl279=$249 << 1;
      var $250=$qsize;
      var $251=$K;
      var $add280=((($251)+(7))|0);
      var $shr281=$250 >>> (($add280)>>>(0));
      var $and282=$shr281 & 1;
      var $add283=((($shl279)+($and282))|0);
      $I252=$add283;
      label = 95; break;
    case 95: 
      label = 96; break;
    case 96: 
      var $252=$I252;
      var $253=$m_addr;
      var $treebins286=(($253+304)|0);
      var $arrayidx287=(($treebins286+($252<<2))|0);
      $H251=$arrayidx287;
      var $254=$I252;
      var $255=$TP250;
      var $index288=(($255+28)|0);
      HEAP32[(($index288)>>2)]=$254;
      var $256=$TP250;
      var $child289=(($256+16)|0);
      var $arrayidx290=(($child289+4)|0);
      HEAP32[(($arrayidx290)>>2)]=0;
      var $257=$TP250;
      var $child291=(($257+16)|0);
      var $arrayidx292=(($child291)|0);
      HEAP32[(($arrayidx292)>>2)]=0;
      var $258=$m_addr;
      var $treemap293=(($258+4)|0);
      var $259=HEAP32[(($treemap293)>>2)];
      var $260=$I252;
      var $shl294=1 << $260;
      var $and295=$259 & $shl294;
      var $tobool296=(($and295)|(0))!=0;
      if ($tobool296) { label = 98; break; } else { label = 97; break; }
    case 97: 
      var $261=$I252;
      var $shl298=1 << $261;
      var $262=$m_addr;
      var $treemap299=(($262+4)|0);
      var $263=HEAP32[(($treemap299)>>2)];
      var $or300=$263 | $shl298;
      HEAP32[(($treemap299)>>2)]=$or300;
      var $264=$TP250;
      var $265=$H251;
      HEAP32[(($265)>>2)]=$264;
      var $266=$H251;
      var $267=$266;
      var $268=$TP250;
      var $parent301=(($268+24)|0);
      HEAP32[(($parent301)>>2)]=$267;
      var $269=$TP250;
      var $270=$TP250;
      var $bk302=(($270+12)|0);
      HEAP32[(($bk302)>>2)]=$269;
      var $271=$TP250;
      var $fd303=(($271+8)|0);
      HEAP32[(($fd303)>>2)]=$269;
      label = 116; break;
    case 98: 
      var $272=$H251;
      var $273=HEAP32[(($272)>>2)];
      $T=$273;
      var $274=$qsize;
      var $275=$I252;
      var $cmp306=(($275)|(0))==31;
      if ($cmp306) { label = 99; break; } else { label = 100; break; }
    case 99: 
      var $cond315 = 0;label = 101; break;
    case 100: 
      var $276=$I252;
      var $shr310=$276 >>> 1;
      var $add311=((($shr310)+(8))|0);
      var $sub312=((($add311)-(2))|0);
      var $sub313=(((31)-($sub312))|0);
      var $cond315 = $sub313;label = 101; break;
    case 101: 
      var $cond315;
      var $shl316=$274 << $cond315;
      $K305=$shl316;
      label = 102; break;
    case 102: 
      var $277=$T;
      var $head317=(($277+4)|0);
      var $278=HEAP32[(($head317)>>2)];
      var $and318=$278 & -8;
      var $279=$qsize;
      var $cmp319=(($and318)|(0))!=(($279)|(0));
      if ($cmp319) { label = 103; break; } else { label = 109; break; }
    case 103: 
      var $280=$K305;
      var $shr322=$280 >>> 31;
      var $and323=$shr322 & 1;
      var $281=$T;
      var $child324=(($281+16)|0);
      var $arrayidx325=(($child324+($and323<<2))|0);
      $C=$arrayidx325;
      var $282=$K305;
      var $shl326=$282 << 1;
      $K305=$shl326;
      var $283=$C;
      var $284=HEAP32[(($283)>>2)];
      var $cmp327=(($284)|(0))!=0;
      if ($cmp327) { label = 104; break; } else { label = 105; break; }
    case 104: 
      var $285=$C;
      var $286=HEAP32[(($285)>>2)];
      $T=$286;
      label = 108; break;
    case 105: 
      var $287=$C;
      var $288=$287;
      var $289=$m_addr;
      var $least_addr331=(($289+16)|0);
      var $290=HEAP32[(($least_addr331)>>2)];
      var $cmp332=(($288)>>>(0)) >= (($290)>>>(0));
      var $conv333=(($cmp332)&(1));
      var $expval334=($conv333);
      var $tobool335=(($expval334)|(0))!=0;
      if ($tobool335) { label = 106; break; } else { label = 107; break; }
    case 106: 
      var $291=$TP250;
      var $292=$C;
      HEAP32[(($292)>>2)]=$291;
      var $293=$T;
      var $294=$TP250;
      var $parent337=(($294+24)|0);
      HEAP32[(($parent337)>>2)]=$293;
      var $295=$TP250;
      var $296=$TP250;
      var $bk338=(($296+12)|0);
      HEAP32[(($bk338)>>2)]=$295;
      var $297=$TP250;
      var $fd339=(($297+8)|0);
      HEAP32[(($fd339)>>2)]=$295;
      label = 115; break;
    case 107: 
      _abort();
      throw "Reached an unreachable!";
    case 108: 
      label = 114; break;
    case 109: 
      var $298=$T;
      var $fd344=(($298+8)|0);
      var $299=HEAP32[(($fd344)>>2)];
      $F343=$299;
      var $300=$T;
      var $301=$300;
      var $302=$m_addr;
      var $least_addr345=(($302+16)|0);
      var $303=HEAP32[(($least_addr345)>>2)];
      var $cmp346=(($301)>>>(0)) >= (($303)>>>(0));
      if ($cmp346) { label = 110; break; } else { var $308 = 0;label = 111; break; }
    case 110: 
      var $304=$F343;
      var $305=$304;
      var $306=$m_addr;
      var $least_addr349=(($306+16)|0);
      var $307=HEAP32[(($least_addr349)>>2)];
      var $cmp350=(($305)>>>(0)) >= (($307)>>>(0));
      var $308 = $cmp350;label = 111; break;
    case 111: 
      var $308;
      var $land_ext353=(($308)&(1));
      var $expval354=($land_ext353);
      var $tobool355=(($expval354)|(0))!=0;
      if ($tobool355) { label = 112; break; } else { label = 113; break; }
    case 112: 
      var $309=$TP250;
      var $310=$F343;
      var $bk357=(($310+12)|0);
      HEAP32[(($bk357)>>2)]=$309;
      var $311=$T;
      var $fd358=(($311+8)|0);
      HEAP32[(($fd358)>>2)]=$309;
      var $312=$F343;
      var $313=$TP250;
      var $fd359=(($313+8)|0);
      HEAP32[(($fd359)>>2)]=$312;
      var $314=$T;
      var $315=$TP250;
      var $bk360=(($315+12)|0);
      HEAP32[(($bk360)>>2)]=$314;
      var $316=$TP250;
      var $parent361=(($316+24)|0);
      HEAP32[(($parent361)>>2)]=0;
      label = 115; break;
    case 113: 
      _abort();
      throw "Reached an unreachable!";
    case 114: 
      label = 102; break;
    case 115: 
      label = 116; break;
    case 116: 
      label = 117; break;
    case 117: 
      label = 118; break;
    case 118: 
      label = 119; break;
    case 119: 
      var $317=$p;
      var $318=$317;
      var $add_ptr368=(($318+8)|0);
      return $add_ptr368;
    default: assert(0, "bad label: " + label);
  }
}
function __ZNKSt9bad_alloc4whatEv($this) {
  var label = 0;
  var $this_addr;
  $this_addr=$this;
  var $this1=$this_addr;
  return ((5242920)|0);
}
function __ZSt15get_new_handlerv() {
  var label = 0;
  var $0=(tempValue=HEAP32[((5243768)>>2)],HEAP32[((5243768)>>2)]=tempValue+0,tempValue);
  var $1=$0;
  return $1;
}
function __ZNSt9bad_allocC2Ev($this) {
  var label = 0;
  var $this_addr_i;
  var $this_addr;
  $this_addr=$this;
  var $this1=$this_addr;
  var $0=$this1;
  $this_addr_i=$0;
  var $this1_i=$this_addr_i;
  var $1=$this1_i;
  HEAP32[(($1)>>2)]=((__ZTVSt9exception+8)|0);
  var $2=$this1;
  HEAP32[(($2)>>2)]=((5243424)|0);
  return;
}
function __ZdlPv($ptr) {
  var label = 0;
  label = 2; 
  while(1) switch(label) {
    case 2: 
      var $ptr_addr;
      $ptr_addr=$ptr;
      var $0=$ptr_addr;
      var $tobool=(($0)|(0))!=0;
      if ($tobool) { label = 3; break; } else { label = 4; break; }
    case 3: 
      var $1=$ptr_addr;
      _free($1);
      label = 4; break;
    case 4: 
      return;
    default: assert(0, "bad label: " + label);
  }
}
function __ZNSt9bad_allocD0Ev($this) {
  var label = 0;
  var $this_addr;
  $this_addr=$this;
  var $this1=$this_addr;
  __ZNSt9bad_allocD2Ev($this1);
  var $0=$this1;
  __ZdlPv($0);
  return;
}
function __ZNSt9bad_allocD2Ev($this) {
  var label = 0;
  var $this_addr;
  $this_addr=$this;
  var $this1=$this_addr;
  var $0=$this1;
  return;
}
function _add_segment($m, $tbase, $tsize, $mmapped) {
  var label = 0;
  label = 2; 
  while(1) switch(label) {
    case 2: 
      var $m_addr;
      var $tbase_addr;
      var $tsize_addr;
      var $mmapped_addr;
      var $old_top;
      var $oldsp;
      var $old_end;
      var $ssize;
      var $rawsp;
      var $offset;
      var $asp;
      var $csp;
      var $sp;
      var $ss;
      var $tnext;
      var $p;
      var $nfences;
      var $nextp;
      var $q;
      var $psize;
      var $tn;
      var $I;
      var $B;
      var $F;
      var $TP;
      var $H;
      var $I57;
      var $X;
      var $Y;
      var $N;
      var $K;
      var $T;
      var $K105;
      var $C;
      var $F144;
      $m_addr=$m;
      $tbase_addr=$tbase;
      $tsize_addr=$tsize;
      $mmapped_addr=$mmapped;
      var $0=$m_addr;
      var $top=(($0+24)|0);
      var $1=HEAP32[(($top)>>2)];
      var $2=$1;
      $old_top=$2;
      var $3=$m_addr;
      var $4=$old_top;
      var $call=_segment_holding($3, $4);
      $oldsp=$call;
      var $5=$oldsp;
      var $base=(($5)|0);
      var $6=HEAP32[(($base)>>2)];
      var $7=$oldsp;
      var $size=(($7+4)|0);
      var $8=HEAP32[(($size)>>2)];
      var $add_ptr=(($6+$8)|0);
      $old_end=$add_ptr;
      $ssize=24;
      var $9=$old_end;
      var $10=$ssize;
      var $add=((($10)+(16))|0);
      var $add1=((($add)+(7))|0);
      var $idx_neg=(((-$add1))|0);
      var $add_ptr2=(($9+$idx_neg)|0);
      $rawsp=$add_ptr2;
      var $11=$rawsp;
      var $add_ptr3=(($11+8)|0);
      var $12=$add_ptr3;
      var $and=$12 & 7;
      var $cmp=(($and)|(0))==0;
      if ($cmp) { label = 3; break; } else { label = 4; break; }
    case 3: 
      var $cond = 0;label = 5; break;
    case 4: 
      var $13=$rawsp;
      var $add_ptr4=(($13+8)|0);
      var $14=$add_ptr4;
      var $and5=$14 & 7;
      var $sub=(((8)-($and5))|0);
      var $and6=$sub & 7;
      var $cond = $and6;label = 5; break;
    case 5: 
      var $cond;
      $offset=$cond;
      var $15=$rawsp;
      var $16=$offset;
      var $add_ptr7=(($15+$16)|0);
      $asp=$add_ptr7;
      var $17=$asp;
      var $18=$old_top;
      var $add_ptr8=(($18+16)|0);
      var $cmp9=(($17)>>>(0)) < (($add_ptr8)>>>(0));
      if ($cmp9) { label = 6; break; } else { label = 7; break; }
    case 6: 
      var $19=$old_top;
      var $cond13 = $19;label = 8; break;
    case 7: 
      var $20=$asp;
      var $cond13 = $20;label = 8; break;
    case 8: 
      var $cond13;
      $csp=$cond13;
      var $21=$csp;
      var $22=$21;
      $sp=$22;
      var $23=$sp;
      var $24=$23;
      var $add_ptr14=(($24+8)|0);
      var $25=$add_ptr14;
      $ss=$25;
      var $26=$sp;
      var $27=$26;
      var $28=$ssize;
      var $add_ptr15=(($27+$28)|0);
      var $29=$add_ptr15;
      $tnext=$29;
      var $30=$tnext;
      $p=$30;
      $nfences=0;
      var $31=$m_addr;
      var $32=$tbase_addr;
      var $33=$32;
      var $34=$tsize_addr;
      var $sub16=((($34)-(40))|0);
      _init_top($31, $33, $sub16);
      var $35=$ssize;
      var $or=$35 | 1;
      var $or17=$or | 2;
      var $36=$sp;
      var $head=(($36+4)|0);
      HEAP32[(($head)>>2)]=$or17;
      var $37=$ss;
      var $38=$m_addr;
      var $seg=(($38+448)|0);
      var $39=$37;
      var $40=$seg;
      assert(16 % 1 === 0);HEAP32[(($39)>>2)]=HEAP32[(($40)>>2)];HEAP32[((($39)+(4))>>2)]=HEAP32[((($40)+(4))>>2)];HEAP32[((($39)+(8))>>2)]=HEAP32[((($40)+(8))>>2)];HEAP32[((($39)+(12))>>2)]=HEAP32[((($40)+(12))>>2)];
      var $41=$tbase_addr;
      var $42=$m_addr;
      var $seg18=(($42+448)|0);
      var $base19=(($seg18)|0);
      HEAP32[(($base19)>>2)]=$41;
      var $43=$tsize_addr;
      var $44=$m_addr;
      var $seg20=(($44+448)|0);
      var $size21=(($seg20+4)|0);
      HEAP32[(($size21)>>2)]=$43;
      var $45=$mmapped_addr;
      var $46=$m_addr;
      var $seg22=(($46+448)|0);
      var $sflags=(($seg22+12)|0);
      HEAP32[(($sflags)>>2)]=$45;
      var $47=$ss;
      var $48=$m_addr;
      var $seg23=(($48+448)|0);
      var $next=(($seg23+8)|0);
      HEAP32[(($next)>>2)]=$47;
      label = 9; break;
    case 9: 
      var $49=$p;
      var $50=$49;
      var $add_ptr24=(($50+4)|0);
      var $51=$add_ptr24;
      $nextp=$51;
      var $52=$p;
      var $head25=(($52+4)|0);
      HEAP32[(($head25)>>2)]=7;
      var $53=$nfences;
      var $inc=((($53)+(1))|0);
      $nfences=$inc;
      var $54=$nextp;
      var $head26=(($54+4)|0);
      var $55=$head26;
      var $56=$old_end;
      var $cmp27=(($55)>>>(0)) < (($56)>>>(0));
      if ($cmp27) { label = 10; break; } else { label = 11; break; }
    case 10: 
      var $57=$nextp;
      $p=$57;
      label = 12; break;
    case 11: 
      label = 13; break;
    case 12: 
      label = 9; break;
    case 13: 
      var $58=$csp;
      var $59=$old_top;
      var $cmp28=(($58)|(0))!=(($59)|(0));
      if ($cmp28) { label = 14; break; } else { label = 50; break; }
    case 14: 
      var $60=$old_top;
      var $61=$60;
      $q=$61;
      var $62=$csp;
      var $63=$old_top;
      var $sub_ptr_lhs_cast=$62;
      var $sub_ptr_rhs_cast=$63;
      var $sub_ptr_sub=((($sub_ptr_lhs_cast)-($sub_ptr_rhs_cast))|0);
      $psize=$sub_ptr_sub;
      var $64=$q;
      var $65=$64;
      var $66=$psize;
      var $add_ptr30=(($65+$66)|0);
      var $67=$add_ptr30;
      $tn=$67;
      var $68=$tn;
      var $head31=(($68+4)|0);
      var $69=HEAP32[(($head31)>>2)];
      var $and32=$69 & -2;
      HEAP32[(($head31)>>2)]=$and32;
      var $70=$psize;
      var $or33=$70 | 1;
      var $71=$q;
      var $head34=(($71+4)|0);
      HEAP32[(($head34)>>2)]=$or33;
      var $72=$psize;
      var $73=$q;
      var $74=$73;
      var $75=$psize;
      var $add_ptr35=(($74+$75)|0);
      var $76=$add_ptr35;
      var $prev_foot=(($76)|0);
      HEAP32[(($prev_foot)>>2)]=$72;
      var $77=$psize;
      var $shr=$77 >>> 3;
      var $cmp36=(($shr)>>>(0)) < 32;
      if ($cmp36) { label = 15; break; } else { label = 22; break; }
    case 15: 
      var $78=$psize;
      var $shr38=$78 >>> 3;
      $I=$shr38;
      var $79=$I;
      var $shl=$79 << 1;
      var $80=$m_addr;
      var $smallbins=(($80+40)|0);
      var $arrayidx=(($smallbins+($shl<<2))|0);
      var $81=$arrayidx;
      var $82=$81;
      $B=$82;
      var $83=$B;
      $F=$83;
      var $84=$m_addr;
      var $smallmap=(($84)|0);
      var $85=HEAP32[(($smallmap)>>2)];
      var $86=$I;
      var $shl39=1 << $86;
      var $and40=$85 & $shl39;
      var $tobool=(($and40)|(0))!=0;
      if ($tobool) { label = 17; break; } else { label = 16; break; }
    case 16: 
      var $87=$I;
      var $shl42=1 << $87;
      var $88=$m_addr;
      var $smallmap43=(($88)|0);
      var $89=HEAP32[(($smallmap43)>>2)];
      var $or44=$89 | $shl42;
      HEAP32[(($smallmap43)>>2)]=$or44;
      label = 21; break;
    case 17: 
      var $90=$B;
      var $fd=(($90+8)|0);
      var $91=HEAP32[(($fd)>>2)];
      var $92=$91;
      var $93=$m_addr;
      var $least_addr=(($93+16)|0);
      var $94=HEAP32[(($least_addr)>>2)];
      var $cmp46=(($92)>>>(0)) >= (($94)>>>(0));
      var $conv=(($cmp46)&(1));
      var $expval=($conv);
      var $tobool47=(($expval)|(0))!=0;
      if ($tobool47) { label = 18; break; } else { label = 19; break; }
    case 18: 
      var $95=$B;
      var $fd49=(($95+8)|0);
      var $96=HEAP32[(($fd49)>>2)];
      $F=$96;
      label = 20; break;
    case 19: 
      _abort();
      throw "Reached an unreachable!";
    case 20: 
      label = 21; break;
    case 21: 
      var $97=$q;
      var $98=$B;
      var $fd53=(($98+8)|0);
      HEAP32[(($fd53)>>2)]=$97;
      var $99=$q;
      var $100=$F;
      var $bk=(($100+12)|0);
      HEAP32[(($bk)>>2)]=$99;
      var $101=$F;
      var $102=$q;
      var $fd54=(($102+8)|0);
      HEAP32[(($fd54)>>2)]=$101;
      var $103=$B;
      var $104=$q;
      var $bk55=(($104+12)|0);
      HEAP32[(($bk55)>>2)]=$103;
      label = 49; break;
    case 22: 
      var $105=$q;
      var $106=$105;
      $TP=$106;
      var $107=$psize;
      var $shr58=$107 >>> 8;
      $X=$shr58;
      var $108=$X;
      var $cmp59=(($108)|(0))==0;
      if ($cmp59) { label = 23; break; } else { label = 24; break; }
    case 23: 
      $I57=0;
      label = 28; break;
    case 24: 
      var $109=$X;
      var $cmp63=(($109)>>>(0)) > 65535;
      if ($cmp63) { label = 25; break; } else { label = 26; break; }
    case 25: 
      $I57=31;
      label = 27; break;
    case 26: 
      var $110=$X;
      $Y=$110;
      var $111=$Y;
      var $sub67=((($111)-(256))|0);
      var $shr68=$sub67 >>> 16;
      var $and69=$shr68 & 8;
      $N=$and69;
      var $112=$N;
      var $113=$Y;
      var $shl70=$113 << $112;
      $Y=$shl70;
      var $sub71=((($shl70)-(4096))|0);
      var $shr72=$sub71 >>> 16;
      var $and73=$shr72 & 4;
      $K=$and73;
      var $114=$K;
      var $115=$N;
      var $add74=((($115)+($114))|0);
      $N=$add74;
      var $116=$K;
      var $117=$Y;
      var $shl75=$117 << $116;
      $Y=$shl75;
      var $sub76=((($shl75)-(16384))|0);
      var $shr77=$sub76 >>> 16;
      var $and78=$shr77 & 2;
      $K=$and78;
      var $118=$N;
      var $add79=((($118)+($and78))|0);
      $N=$add79;
      var $119=$N;
      var $sub80=(((14)-($119))|0);
      var $120=$K;
      var $121=$Y;
      var $shl81=$121 << $120;
      $Y=$shl81;
      var $shr82=$shl81 >>> 15;
      var $add83=((($sub80)+($shr82))|0);
      $K=$add83;
      var $122=$K;
      var $shl84=$122 << 1;
      var $123=$psize;
      var $124=$K;
      var $add85=((($124)+(7))|0);
      var $shr86=$123 >>> (($add85)>>>(0));
      var $and87=$shr86 & 1;
      var $add88=((($shl84)+($and87))|0);
      $I57=$add88;
      label = 27; break;
    case 27: 
      label = 28; break;
    case 28: 
      var $125=$I57;
      var $126=$m_addr;
      var $treebins=(($126+304)|0);
      var $arrayidx91=(($treebins+($125<<2))|0);
      $H=$arrayidx91;
      var $127=$I57;
      var $128=$TP;
      var $index=(($128+28)|0);
      HEAP32[(($index)>>2)]=$127;
      var $129=$TP;
      var $child=(($129+16)|0);
      var $arrayidx92=(($child+4)|0);
      HEAP32[(($arrayidx92)>>2)]=0;
      var $130=$TP;
      var $child93=(($130+16)|0);
      var $arrayidx94=(($child93)|0);
      HEAP32[(($arrayidx94)>>2)]=0;
      var $131=$m_addr;
      var $treemap=(($131+4)|0);
      var $132=HEAP32[(($treemap)>>2)];
      var $133=$I57;
      var $shl95=1 << $133;
      var $and96=$132 & $shl95;
      var $tobool97=(($and96)|(0))!=0;
      if ($tobool97) { label = 30; break; } else { label = 29; break; }
    case 29: 
      var $134=$I57;
      var $shl99=1 << $134;
      var $135=$m_addr;
      var $treemap100=(($135+4)|0);
      var $136=HEAP32[(($treemap100)>>2)];
      var $or101=$136 | $shl99;
      HEAP32[(($treemap100)>>2)]=$or101;
      var $137=$TP;
      var $138=$H;
      HEAP32[(($138)>>2)]=$137;
      var $139=$H;
      var $140=$139;
      var $141=$TP;
      var $parent=(($141+24)|0);
      HEAP32[(($parent)>>2)]=$140;
      var $142=$TP;
      var $143=$TP;
      var $bk102=(($143+12)|0);
      HEAP32[(($bk102)>>2)]=$142;
      var $144=$TP;
      var $fd103=(($144+8)|0);
      HEAP32[(($fd103)>>2)]=$142;
      label = 48; break;
    case 30: 
      var $145=$H;
      var $146=HEAP32[(($145)>>2)];
      $T=$146;
      var $147=$psize;
      var $148=$I57;
      var $cmp106=(($148)|(0))==31;
      if ($cmp106) { label = 31; break; } else { label = 32; break; }
    case 31: 
      var $cond115 = 0;label = 33; break;
    case 32: 
      var $149=$I57;
      var $shr110=$149 >>> 1;
      var $add111=((($shr110)+(8))|0);
      var $sub112=((($add111)-(2))|0);
      var $sub113=(((31)-($sub112))|0);
      var $cond115 = $sub113;label = 33; break;
    case 33: 
      var $cond115;
      var $shl116=$147 << $cond115;
      $K105=$shl116;
      label = 34; break;
    case 34: 
      var $150=$T;
      var $head118=(($150+4)|0);
      var $151=HEAP32[(($head118)>>2)];
      var $and119=$151 & -8;
      var $152=$psize;
      var $cmp120=(($and119)|(0))!=(($152)|(0));
      if ($cmp120) { label = 35; break; } else { label = 41; break; }
    case 35: 
      var $153=$K105;
      var $shr123=$153 >>> 31;
      var $and124=$shr123 & 1;
      var $154=$T;
      var $child125=(($154+16)|0);
      var $arrayidx126=(($child125+($and124<<2))|0);
      $C=$arrayidx126;
      var $155=$K105;
      var $shl127=$155 << 1;
      $K105=$shl127;
      var $156=$C;
      var $157=HEAP32[(($156)>>2)];
      var $cmp128=(($157)|(0))!=0;
      if ($cmp128) { label = 36; break; } else { label = 37; break; }
    case 36: 
      var $158=$C;
      var $159=HEAP32[(($158)>>2)];
      $T=$159;
      label = 40; break;
    case 37: 
      var $160=$C;
      var $161=$160;
      var $162=$m_addr;
      var $least_addr132=(($162+16)|0);
      var $163=HEAP32[(($least_addr132)>>2)];
      var $cmp133=(($161)>>>(0)) >= (($163)>>>(0));
      var $conv134=(($cmp133)&(1));
      var $expval135=($conv134);
      var $tobool136=(($expval135)|(0))!=0;
      if ($tobool136) { label = 38; break; } else { label = 39; break; }
    case 38: 
      var $164=$TP;
      var $165=$C;
      HEAP32[(($165)>>2)]=$164;
      var $166=$T;
      var $167=$TP;
      var $parent138=(($167+24)|0);
      HEAP32[(($parent138)>>2)]=$166;
      var $168=$TP;
      var $169=$TP;
      var $bk139=(($169+12)|0);
      HEAP32[(($bk139)>>2)]=$168;
      var $170=$TP;
      var $fd140=(($170+8)|0);
      HEAP32[(($fd140)>>2)]=$168;
      label = 47; break;
    case 39: 
      _abort();
      throw "Reached an unreachable!";
    case 40: 
      label = 46; break;
    case 41: 
      var $171=$T;
      var $fd145=(($171+8)|0);
      var $172=HEAP32[(($fd145)>>2)];
      $F144=$172;
      var $173=$T;
      var $174=$173;
      var $175=$m_addr;
      var $least_addr146=(($175+16)|0);
      var $176=HEAP32[(($least_addr146)>>2)];
      var $cmp147=(($174)>>>(0)) >= (($176)>>>(0));
      if ($cmp147) { label = 42; break; } else { var $181 = 0;label = 43; break; }
    case 42: 
      var $177=$F144;
      var $178=$177;
      var $179=$m_addr;
      var $least_addr149=(($179+16)|0);
      var $180=HEAP32[(($least_addr149)>>2)];
      var $cmp150=(($178)>>>(0)) >= (($180)>>>(0));
      var $181 = $cmp150;label = 43; break;
    case 43: 
      var $181;
      var $land_ext=(($181)&(1));
      var $expval152=($land_ext);
      var $tobool153=(($expval152)|(0))!=0;
      if ($tobool153) { label = 44; break; } else { label = 45; break; }
    case 44: 
      var $182=$TP;
      var $183=$F144;
      var $bk155=(($183+12)|0);
      HEAP32[(($bk155)>>2)]=$182;
      var $184=$T;
      var $fd156=(($184+8)|0);
      HEAP32[(($fd156)>>2)]=$182;
      var $185=$F144;
      var $186=$TP;
      var $fd157=(($186+8)|0);
      HEAP32[(($fd157)>>2)]=$185;
      var $187=$T;
      var $188=$TP;
      var $bk158=(($188+12)|0);
      HEAP32[(($bk158)>>2)]=$187;
      var $189=$TP;
      var $parent159=(($189+24)|0);
      HEAP32[(($parent159)>>2)]=0;
      label = 47; break;
    case 45: 
      _abort();
      throw "Reached an unreachable!";
    case 46: 
      label = 34; break;
    case 47: 
      label = 48; break;
    case 48: 
      label = 49; break;
    case 49: 
      label = 50; break;
    case 50: 
      return;
    default: assert(0, "bad label: " + label);
  }
}
function __Znwj($size) {
  var label = 0;
  label = 2; 
  while(1) switch(label) {
    case 2: 
      var $size_addr;
      var $p;
      var $nh;
      var $exn_slot;
      var $ehselector_slot;
      $size_addr=$size;
      var $0=$size_addr;
      var $cmp=(($0)|(0))==0;
      if ($cmp) { label = 3; break; } else { label = 4; break; }
    case 3: 
      $size_addr=1;
      label = 4; break;
    case 4: 
      label = 5; break;
    case 5: 
      var $1=$size_addr;
      var $call=_malloc($1);
      $p=$call;
      var $cmp1=(($call)|(0))==0;
      if ($cmp1) { label = 6; break; } else { label = 14; break; }
    case 6: 
      var $call2=__ZSt15get_new_handlerv();
      $nh=$call2;
      var $2=$nh;
      var $tobool=(($2)|(0))!=0;
      if ($tobool) { label = 7; break; } else { label = 12; break; }
    case 7: 
      var $3=$nh;
      (function() { try { __THREW__ = 0; return FUNCTION_TABLE[$3]() } catch(e) { if (typeof e != "number") throw e; if (ABORT) throw e; __THREW__ = 1; return null } })();if (!__THREW__) { label = 8; break; } else { label = 9; break; }
    case 8: 
      label = 13; break;
    case 9: 
      var $4$0 = ___cxa_find_matching_catch(-1, -1); $4$1 = tempRet0;
      var $5=$4$0;
      $exn_slot=$5;
      var $6=$4$1;
      $ehselector_slot=$6;
      label = 10; break;
    case 10: 
      var $sel=$ehselector_slot;
      var $ehspec_fails=(($sel)|(0)) < 0;
      if ($ehspec_fails) { label = 11; break; } else { label = 15; break; }
    case 11: 
      var $exn=$exn_slot;
      ___cxa_call_unexpected($exn);
      throw "Reached an unreachable!";
    case 12: 
      var $exception=___cxa_allocate_exception(4);
      var $7=$exception;
      __ZNSt9bad_allocC2Ev($7);
      (function() { try { __THREW__ = 0; return ___cxa_throw($exception, 5243700, (50)) } catch(e) { if (typeof e != "number") throw e; if (ABORT) throw e; __THREW__ = 1; return null } })();if (!__THREW__) { label = 16; break; } else { label = 9; break; }
    case 13: 
      label = 5; break;
    case 14: 
      var $8=$p;
      return $8;
    case 15: 
      var $exn5=$exn_slot;
      var $sel6=$ehselector_slot;
      var $lpad_val$0=$exn5;
      var $lpad_val$1=0;
      var $lpad_val7$0=$lpad_val$0;
      var $lpad_val7$1=$sel6;
      ___resumeException($lpad_val7$0)
    case 16: 
      throw "Reached an unreachable!";
    default: assert(0, "bad label: " + label);
  }
}
function __Znaj($size) {
  var label = 0;
  label = 2; 
  while(1) switch(label) {
    case 2: 
      var $size_addr;
      var $exn_slot;
      var $ehselector_slot;
      $size_addr=$size;
      var $0=$size_addr;
      var $call = (function() { try { __THREW__ = 0; return __Znwj($0) } catch(e) { if (typeof e != "number") throw e; if (ABORT) throw e; __THREW__ = 1; return null } })();if (!__THREW__) { label = 3; break; } else { label = 4; break; }
    case 3: 
      return $call;
    case 4: 
      var $1$0 = ___cxa_find_matching_catch(-1, -1); $1$1 = tempRet0;
      var $2=$1$0;
      $exn_slot=$2;
      var $3=$1$1;
      $ehselector_slot=$3;
      label = 5; break;
    case 5: 
      var $sel=$ehselector_slot;
      var $ehspec_fails=(($sel)|(0)) < 0;
      if ($ehspec_fails) { label = 6; break; } else { label = 7; break; }
    case 6: 
      var $exn=$exn_slot;
      ___cxa_call_unexpected($exn);
      throw "Reached an unreachable!";
    case 7: 
      var $exn1=$exn_slot;
      var $sel2=$ehselector_slot;
      var $lpad_val$0=$exn1;
      var $lpad_val$1=0;
      var $lpad_val3$0=$lpad_val$0;
      var $lpad_val3$1=$sel2;
      ___resumeException($lpad_val3$0)
    default: assert(0, "bad label: " + label);
  }
}
// EMSCRIPTEN_END_FUNCS
// EMSCRIPTEN_END_FUNCS
// Warning: printing of i64 values may be slightly rounded! No deep i64 math used, so precise i64 code not included
var i64Math = null;
// === Auto-generated postamble setup entry stuff ===
Module.callMain = function callMain(args) {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on __ATMAIN__)');
  assert(!Module['preRun'] || Module['preRun'].length == 0, 'cannot call main when preRun functions remain to be called');
  args = args || [];
  ensureInitRuntime();
  var argc = args.length+1;
  function pad() {
    for (var i = 0; i < 4-1; i++) {
      argv.push(0);
    }
  }
  var argv = [allocate(intArrayFromString("/bin/this.program"), 'i8', ALLOC_STATIC) ];
  pad();
  for (var i = 0; i < argc-1; i = i + 1) {
    argv.push(allocate(intArrayFromString(args[i]), 'i8', ALLOC_STATIC));
    pad();
  }
  argv.push(0);
  argv = allocate(argv, 'i32', ALLOC_STATIC);
  var ret;
  var initialStackTop = STACKTOP;
  try {
    ret = Module['_main'](argc, argv, 0);
  }
  catch(e) {
    if (e.name == 'ExitStatus') {
      return e.status;
    } else if (e == 'SimulateInfiniteLoop') {
      Module['noExitRuntime'] = true;
    } else {
      throw e;
    }
  } finally {
    STACKTOP = initialStackTop;
  }
  return ret;
}
function run(args) {
  args = args || Module['arguments'];
  if (runDependencies > 0) {
    Module.printErr('run() called, but dependencies remain, so not running');
    return 0;
  }
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    var toRun = Module['preRun'];
    Module['preRun'] = [];
    for (var i = toRun.length-1; i >= 0; i--) {
      toRun[i]();
    }
    if (runDependencies > 0) {
      // a preRun added a dependency, run will be called later
      return 0;
    }
  }
  function doRun() {
    ensureInitRuntime();
    preMain();
    var ret = 0;
    calledRun = true;
    if (Module['_main'] && shouldRunNow) {
      ret = Module.callMain(args);
      if (!Module['noExitRuntime']) {
        exitRuntime();
      }
    }
    if (Module['postRun']) {
      if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
      while (Module['postRun'].length > 0) {
        Module['postRun'].pop()();
      }
    }
    return ret;
  }
  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
    return 0;
  } else {
    return doRun();
  }
}
Module['run'] = Module.run = run;
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
/*global webkitAudioContext, Module, HEAPF32*/

// Adapted From https://gist.github.com/camupod/5640386

var faust = faust || {};

(function () {

    // This should be made to only make a new context if one does not exist
    faust.context = new webkitAudioContext();

    var NOISE_constructor = Module.cwrap('NOISE_constructor', 'number', 'number');
    var NOISE_destructor = Module.cwrap('NOISE_destructor', null, ['number']);
    var NOISE_compute = Module.cwrap('NOISE_compute', ['number'], ['number', 'number']);
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

        that.compute = function (count) {
            var ptr = NOISE_compute(that.ptr, count);
            return HEAPF32.subarray(ptr>>2, (ptr+count*4)>>2);
        };

        that.destroy = function () {
            NOISE_destructor(that.ptr);
        };

        // Bind to Web Audio

        that.play = function () {
            that.jsNode.connect(faust.context.destination);
        };

        that.pause = function () {
            that.jsNode.disconnect(faust.context.destination);
        };

        that.generateSamples = function (e) {
            var output = e.outputBuffer.getChannelData(0);
            var noiseOutput = that.compute(output.length);
            
            // Is there a better way to do this?
            // Seems rather harsh to have to replace each sample in the buffer
            // One at a time
            for (var i = 0; i < output.length; i++) {
                output[i] = noiseOutput[i];
            }
        };

        that.init = function () {
            that.jsNode = faust.context.createJavaScriptNode(1024, 1, 1);
            that.jsNode.onaudioprocess = that.generateSamples;
        };

        that.init();

        return that;
    };
}());

var noise = faust.noise();
noise.play();