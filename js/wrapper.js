// Adapted From https://gist.github.com/camupod/5640386

var faust = faust || {};

(function() {
    
    faust.context = new webkitAudioContext();
    
    var NOISE_constructor = Module.cwrap('NOISE_constructor', 'number', 'number');
    var NOISE_destructor = Module.cwrap('NOISE_destructor', null, ['number']);
    var NOISE_compute = Module.cwrap('NOISE_compute', ['number'], ['number', 'number']);
    var NOISE_getNumInputs = Module.cwrap('NOISE_getNumInputs', 'number', []);
    var NOISE_getNumOutputs = Module.cwrap('NOISE_getNumOutputs', 'number', []);
    
    faust.noise = function () {
        that = {};
        
        that.ptr = NOISE_constructor(faust.context.sampleRate);
        
        that.getNumInputs = function () {
            return NOISE_getNumInputs(that.ptr);
        }

        that.getNumOutputs = function () {
            return NOISE_getNumOutputs(that.ptr);
        }

        that.compute = function (count) {
            return NOISE_compute(that.ptr, count);
        }

        that.destroy = function () {
            NOISE_destructor(that.ptr);
        }
        
        return that;
    }
}())

noise = faust.noise();