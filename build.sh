#!/bin/bash
# tputcolors

# Adapted From https://gist.github.com/camupod/5640386
echo 'Compiling From Faust -> CPP'
faust -a minimal.cpp -i -uim -cn Noise  dsp/noise.dsp -o cpp/noise-emscripten.cpp
echo " $(tput setaf 2)Complete$(tput sgr0)"
echo "Wrapping dat cpp"
cat cpp/noise-emscripten-wrapper.cpp >> cpp/noise-emscripten.cpp
echo " $(tput setaf 2)Complete$(tput sgr0)"
echo "Using emscripten to compile to JavaScript"
emcc cpp/noise-emscripten.cpp -o js/noise-emscripten.js \
-s EXPORTED_FUNCTIONS="['_NOISE_constructor','_NOISE_destructor','_NOISE_compute', '_NOISE_getNumInputs', '_NOISE_getNumOutputs']"
echo " $(tput setaf 2)Complete$(tput sgr0)"
echo "Wrapping js"
cat js/wrapper.js >> js/noise-emscripten.js
echo " $(tput setaf 2)Complete$(tput sgr0)"