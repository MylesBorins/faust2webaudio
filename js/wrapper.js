/*global webkitAudioContext, Module, HEAPF32*/

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
            var output = e.outputBuffer.getChannelData(0);
            NOISE_compute(that.ptr, that.vectorsize, that.ins, that.outs);
            var noiseOutput = HEAPF32.subarray(that.outs>>2, (that.outs+1024*4)>>2);

            for (var i = 0; i < output.length; i++) {
                output[i] = noiseOutput[i];
            }
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

        that.init = function () {
            that.ptrsize = 4; //assuming poitner in emscripten are 32bits
            that.vectorsize = 1024;
            that.samplesize = 8;
            that.numIn = that.getNumInputs();
            that.numOut = that.getNumOutputs();
            
            that.jsNode = faust.context.createJavaScriptNode(that.vectorsize, 1, 1);
            that.jsNode.onaudioprocess = that.compute;
            
            that.ins = Module._malloc(that.ptrsize*that.numIn);
            
            for (i=0;i<that.numIn;i++) { // assing to our array of pointer elements an array of 64bit floats, one for each channel. currently we assume pointers are 32bits
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

var noise = faust.noise();
noise.play();