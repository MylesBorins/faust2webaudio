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