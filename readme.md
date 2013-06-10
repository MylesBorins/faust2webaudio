#faust2webaudio

Primarily written by Myles Borins  
During the Spring 2013 offering of Music 420b  
A Special thanks to Julius Smith, Stéphane Letz, Yann Orlarey, and Colin Clark.

##about

So this is a test for right now of compiling noise.dsp to a c++ file that will compile with emscripten to asm.js.

Once that compilation process is working the faust functions will be used to generate sound with the web audio api.

Flocking Unit Generators and Synth Def's should also be able to be generated from the same source

NOTE: The faust2 branch requires llvm 3.1 to compile, but emscripten requires llvm 3.2.  Both of these need to be compiled as universal architectures.  I highly suggest using homebrew to install these if you are on OSX.  The current script for llvm 3.2 will compile correctly, but you will need to use a custom version of the llvm 3.1 script that can be found in the versions Tap.  I plan to document the compilation process in the near future, but feel free to contact me if you would like a bit more of an involved explanation (I lost quite a bit of my life to sorting that part out).

##Licensing

faust2webaudio is distributed under the terms the MIT or GPL2 Licenses. 
Choose the license that best suits your project. The text of the MIT and GPL 
licenses are at the root directory.