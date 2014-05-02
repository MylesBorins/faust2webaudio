#!/bin/bash
# tputcolors

# Adapted From https://gist.github.com/camupod/5640386
set -e
echo 'Compiling From Faust -> CPP'
faust -a minimal.cpp -i -uim -cn ReverbDesigner  dsp/reverbDesigner.dsp -o cpp/faust-reverbDesigner.cpp
echo " $(tput setaf 2)Complete$(tput sgr0)"
echo "Wrapping dat cpp"
sed -e "s/DSP/REVERBDESIGNER/g" -e "s/Dsp/ReverbDesigner/g" -e "s/dsp/reverbDesigner/g" cpp/faust-wrapper.cpp >> cpp/faust-reverbDesigner.cpp
echo " $(tput setaf 2)Complete$(tput sgr0)"
echo "Using emscripten to compile to JavaScript"
emcc -O1 cpp/faust-reverbDesigner.cpp -o js/faust-reverbDesigner-temp.js \
-s EXPORTED_FUNCTIONS="['_REVERBDESIGNER_constructor','_REVERBDESIGNER_destructor','_REVERBDESIGNER_compute', '_REVERBDESIGNER_getNumInputs', '_REVERBDESIGNER_getNumOutputs', '_REVERBDESIGNER_getNumParams', '_REVERBDESIGNER_getNextParam']"
echo " $(tput setaf 2)Complete$(tput sgr0)"
echo "Wrapping js"
cat js/header.js > js/faust-reverbDesigner.js
cat js/faust-reverbDesigner-temp.js >> js/faust-reverbDesigner.js
rm js/faust-reverbDesigner-temp.js
sed -e "s/DSP/REVERBDESIGNER/g" -e "s/dsp/reverbDesigner/g" js/wrapper.js >> js/faust-reverbDesigner.js
echo " $(tput setaf 2)Complete$(tput sgr0)"