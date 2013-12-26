
  // This should be made to only make a new context if one does not exist

  if (!faust.context)
  {
    faust.context = new webkitAudioContext();
  }

  var DSP_constructor = Module.cwrap('DSP_constructor', 'number', 'number');
  var DSP_destructor = Module.cwrap('DSP_destructor', null, ['number']);
  var DSP_compute = Module.cwrap('DSP_compute', ['number'], ['number', 'number', 'number', 'number']);
  var DSP_getNumInputs = Module.cwrap('DSP_getNumInputs', 'number', 'number');
  var DSP_getNumOutputs = Module.cwrap('DSP_getNumOutputs', 'number', 'number');
  var DSP_getNumParams = Module.cwrap('DSP_getNumParams', 'number', 'number');
  var DSP_getNextParam = Module.cwrap('DSP_getNextParam', 'number', ['number', 'number']);

  faust.dsp = function () {
    var that = {};
    
    that.model = {
    };

    that.ptr = DSP_constructor(faust.context.sampleRate);

    // Bind to C++ Member Functions

    that.getNumInputs = function () {
      return DSP_getNumInputs(that.ptr);
    };

    that.getNumOutputs = function () {
      return DSP_getNumOutputs(that.ptr);
    };
    
    that.compute = function (e) {
      var dspOutChans = HEAP32.subarray(that.outs >> 2, (that.outs + that.numOut * that.ptrsize) >> 2);
      var dspInChans = HEAP32.subarray(that.ins >> 2, (that.ins + that.ins * that.ptrsize) >> 2);
      var i, j;
      for (i = 0; i < that.numIn; i++)
      {
        var input = e.inputBuffer.getChannelData(i);
        var dspInput = HEAPF32.subarray(dspInChans[i] >> 2, (dspInChans[i] + that.vectorsize * that.ptrsize) >> 2);
        
        for (j = 0; j < input.length; j++) {
          dspInput[j] = input[j];
        }
      }
      
      DSP_compute(that.ptr, that.vectorsize, that.ins, that.outs);
      
      for (i = 0; i < that.numOut; i++)
      {
        var output = e.outputBuffer.getChannelData(i);
        var dspOutput = HEAPF32.subarray(dspOutChans[i] >> 2, (dspOutChans[i] + that.vectorsize * that.ptrsize) >> 2);
        
        for (j = 0; j < output.length; j++) {
          output[j] = dspOutput[j];
        }
      }
    };

    that.destroy = function () {
      DSP_destructor(that.ptr);
    };
    
    // Connect to another node
    that.connect = function (node) {
      if (node.jsNode)
      {
        that.jsNode.connect(node.jsNode);
      }
      else {
        that.jsNode.connect(node);
      }
      
    };

    // Bind to Web Audio

    that.play = function () {
      that.jsNode.connect(faust.context.destination);
    };

    that.pause = function () {
      that.jsNode.disconnect(faust.context.destination);
    };

    that.setupModel = function () {
      var i;
      var numParams = DSP_getNumParams(that.ptr);
      for (i = 0; i < numParams; i++) {
        //TODO keyptr is allocated on stack, but is it properly freed?
        var keyPtr = allocate(intArrayFromString(''), 'i8', ALLOC_STACK);
        var valPtr = DSP_getNextParam(that.ptr, keyPtr);
        var key = Pointer_stringify(keyPtr);
        that.model[key] = valPtr;
      }
    };
    
    that.update = function (key, val) {
      HEAPF32[that.model[key] >> 2] = val;
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
      that.jsNode = faust.context.createJavaScriptNode(that.vectorsize, that.numIn, that.numOut);
      that.jsNode.onaudioprocess = that.compute;
      
      // TODO the below calls to malloc are not yet being freed, potential memory leak
      // allocate memory for input / output arrays
      that.ins = Module._malloc(that.ptrsize * that.numIn);
      
      for (i = 0; i < that.numIn; i++) { // assing to our array of pointer elements an array of 32bit floats, one for each channel. currently we assume pointers are 32bits
        HEAP32[(that.ins >> 2) + i] = Module._malloc(that.vectorsize * that.samplesize); // assign memory at that.ins[i] to a new ptr value. maybe there's an easier way, but this is clearer to me than any typedarray magic beyond the presumably TypedArray HEAP32
      }
      
      that.outs = Module._malloc(that.ptrsize * that.numOut); //ptrsize, change to eight or use Runtime.QUANTUM? or what?
      for (i = 0; i < that.numOut; i++) { // assing to our array of pointer elements an array of 64bit floats, one for each channel. currently we assume pointers are 32bits
        HEAP32[(that.outs >> 2) + i] = Module._malloc(that.vectorsize * that.samplesize); // assign memory at that.ins[i] to a new ptr value. maybe there's an easier way, but this is clearer to me than any typedarray magic beyond the presumably TypedArray HEAP32
      }
      that.setupModel();
    };

    that.init();
    

    return that;
  };
}());