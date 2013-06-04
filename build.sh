#!/bin/bash

# Adapted From https://gist.github.com/camupod/5640386 
faust -a minimal.cpp -i -cn Noise  dsp/noise.dsp -o cpp/noise-emscripten.cpp
cat cpp/noise-emscripten-wrapper.cpp >> cpp/noise-emscripten.cpp
~/github/emscripten/emcc cpp/noise-emscripten.cpp -o js/noise-emscripten.js \
-s EXPORTED_FUNCTIONS="['_NOISE_constructor','_NOISE_destructor','_NOISE_compute', '_NOISE_getNumInputs', '_NOISE_getNumOutputs']"
cat js/wrapper.js >> js/noise-emscripten.js