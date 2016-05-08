#!/bin/bash
# tputcolors

# Adapted From https://gist.github.com/camupod/5640386
set -e
echo 'Compiling From Faust -> CPP'
faust -a minimal.cpp -i -uim -cn Osc  dsp/cubicDistortion.dsp -o cpp/faust-cubicDistortion.cpp
echo " $(tput setaf 2)Complete$(tput sgr0)"
echo "Wrapping dat cpp"
sed -e "s/DSP/OSC/g" -e "s/Dsp/Osc/g" -e "s/dsp/cubicDistortion/g" cpp/faust-wrapper.cpp >> cpp/faust-cubicDistortion.cpp
echo " $(tput setaf 2)Complete$(tput sgr0)"
echo "Using emscripten to compile to JavaScript"
emcc -O2 cpp/faust-cubicDistortion.cpp -o js/faust-cubicDistortion-temp.js \
-s EXPORTED_FUNCTIONS="['_OSC_constructor','_OSC_destructor','_OSC_compute', '_OSC_getNumInputs', '_OSC_getNumOutputs', '_OSC_getNumParams', '_OSC_getNextParam']"
echo " $(tput setaf 2)Complete$(tput sgr0)"
echo "Wrapping js"
cat js/header.js > js/faust-cubicDistortion.js
cat js/faust-cubicDistortion-temp.js >> js/faust-cubicDistortion.js
rm js/faust-cubicDistortion-temp.js
sed -e "s/DSP/OSC/g" -e "s/dsp/cubicDistortion/g" js/wrapper.js >> js/faust-cubicDistortion.js
echo " $(tput setaf 2)Complete$(tput sgr0)"