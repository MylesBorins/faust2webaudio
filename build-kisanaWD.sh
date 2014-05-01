#!/bin/bash
# tputcolors

# Adapted From https://gist.github.com/camupod/5640386
set -e
echo 'Compiling From Faust -> CPP'
faust -a minimal.cpp -i -uim -cn Noise  dsp/kisanaWD.dsp -o cpp/faust-kisanaWD.cpp
echo " $(tput setaf 2)Complete$(tput sgr0)"
echo "Wrapping dat cpp"
sed -e "s/DSP/NOISE/g" -e "s/Dsp/Noise/g" -e "s/dsp/kisanaWD/g" cpp/faust-wrapper.cpp >> cpp/faust-kisanaWD.cpp
echo " $(tput setaf 2)Complete$(tput sgr0)"
echo "Using emscripten to compile to JavaScript"
emcc -O2 cpp/faust-kisanaWD.cpp -o js/faust-kisanaWD-temp.js \
-s EXPORTED_FUNCTIONS="['_NOISE_constructor','_NOISE_destructor','_NOISE_compute', '_NOISE_getNumInputs', '_NOISE_getNumOutputs', '_NOISE_getNumParams', '_NOISE_getNextParam']"
echo " $(tput setaf 2)Complete$(tput sgr0)"
echo "Wrapping js"
cat js/header.js > js/faust-kisanaWD.js
cat js/faust-kisanaWD-temp.js >> js/faust-kisanaWD.js
rm js/faust-kisanaWD-temp.js
sed -e "s/DSP/NOISE/g" -e "s/dsp/kisanaWD/g" js/wrapper.js >> js/faust-kisanaWD.js
echo " $(tput setaf 2)Complete$(tput sgr0)"