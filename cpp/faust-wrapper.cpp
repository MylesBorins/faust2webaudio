// Adapted From https://gist.github.com/camupod/5640386
// compile using "C" linkage to avoid name obfuscation
#include <emscripten.h>

extern "C" {
    //constructor
    void *DSP_constructor(int samplingFreq) {
        
        // Make a new dsp object
        Dsp* n = new Dsp();
        // Init it with samplingFreq supplied... should we give a sample size here too?
        n->init(samplingFreq);

        return n;
    }
    
    int DSP_compute(Dsp *n, int count, FAUSTFLOAT** inputs, FAUSTFLOAT** outputs) {
        n->compute(count, inputs, outputs);
        return 1;
    }
    
    int DSP_getNumInputs(Dsp *n){
        return n->getNumInputs();
    }
    
    int DSP_getNumOutputs(Dsp *n){
        return n->getNumOutputs();
    }

    void DSP_destructor(Dsp *n) {
        delete n;
    }
}

// EM_ASM(
//     
// );