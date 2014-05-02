#faust2webaudio

Primarily written by Myles Borins  
During the Spring 2013 offering of Music 420b
He continued hacking on it for quite some time though...
...the latest changes were added in April / May of 2014 leading up to LAC.

A Special thanks to Julius Smith, Stéphane Letz, Yann Orlarey, and Colin Clark.

##about

This project utilizes that latest version of Faust (0.9.67) and the emscripten sdk (with fast-comp).

Once that compilation process is working the faust functions will be used to generate sound with the web audio api.

##TODO
Currently there are a couple of issues with this compiler that need to be done

* Implement generic build script
* Solve issue involving linking so each ugen does not need to have a complete instance of the emscripten vm
that.setupModel and that.init
* Implement method to attach ugens to variables in the model to allow for more advanced signal flow (This might be able to be done directly with web audio API)
* Improve 

##Licensing

faust2webaudio is distributed under the terms the MIT or GPL2 Licenses. 
Choose the license that best suits your project. The text of the MIT and GPL 
licenses are at the root directory.