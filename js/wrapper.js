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
        
        that.compute = function (e) {
            var output = e.outputBuffer.getChannelData(0);
            var ptr = NOISE_compute(that.ptr, 1024);

            for (var i = 0; i < output.length; i++) {
                output[i] = HEAPF32[ptr>>2 + 4 * i];
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
            that.jsNode = faust.context.createJavaScriptNode(1024, 1, 1);
            that.jsNode.onaudioprocess = that.compute;
        };

        that.init();

        return that;
    };
}());

var noise = faust.noise();
noise.play();