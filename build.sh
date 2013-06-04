#!/bin/bash

# Adapted From https://gist.github.com/camupod/5640386 
~/github/emscripten/emcc cpp/noise-emscripten.cpp -o js/noise-emscripten.js \
-s EXPORTED_FUNCTIONS="['_NOISE_constructor','_NOISE_destructor','_NOISE_compute']"
 
cat js/wrapper.js >> js/noise-emscripten.js