// Adapted From https://gist.github.com/camupod/5640386

var faust = faust || {};

(function() {
    var NOISE_constructor = Module.cwrap('NOISE_constructor', 'number', []);
    var NOISE_destructor = Module.cwrap('NOISE_destructor', null, ['number']);
    var NOISE_compute = Module.cwrap('NOISE_compute', ['number'], ['number', 'number']);
    
    faust.noise = function () {
        that = {};
        
        that.ptr = NOISE_constructor();
        
        that.compute = function (count) {
            return NOISE_compute(that.ptr, count);
        }
        
        that.destory = function () {
            NOISE_destructor(that.ptr);
        }
        
        return that;
    }
}())

noise = faust.noise();