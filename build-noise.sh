#!/bin/bash
# tputcolors

# Adapted From https://gist.github.com/camupod/5640386
echo 'Compiling From Faust -> CPP'
faust -a minimal.cpp -i -uim -cn Noise  dsp/noise.dsp -o cpp/faust-noise.cpp
echo " $(tput setaf 2)Complete$(tput sgr0)"
echo "Wrapping dat cpp"
sed -e "s/DSP/NOISE/g" -e "s/Dsp/Noise/g" -e "s/dsp/noise/g" cpp/faust-wrapper.cpp >> cpp/faust-noise.cpp
echo " $(tput setaf 2)Complete$(tput sgr0)"
echo "Using emscripten to compile to JavaScript"
emcc cpp/faust-noise.cpp -o js/faust-noise-temp.js \
-s EXPORTED_FUNCTIONS="['_NOISE_constructor','_NOISE_destructor','_NOISE_compute', '_NOISE_getNumInputs', '_NOISE_getNumOutputs']"
echo " $(tput setaf 2)Complete$(tput sgr0)"
echo "Wrapping js"
cat js/header.js > js/faust-noise.js
cat js/faust-noise-temp.js >> js/faust-noise.js
rm js/faust-noise-temp.js
sed -e "s/DSP/NOISE/g" -e "s/dsp/noise/g" js/wrapper.js >> js/faust-noise.js
echo " $(tput setaf 2)Complete$(tput sgr0)"