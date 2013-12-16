// Adapted From https://gist.github.com/camupod/5640386
// compile using "C" linkage to avoid name obfuscation
extern "C" {
    // float** fInChannel;
    // float** fOutChannel;
    int numInputs;
    int numOutputs;
    //constructor
    void *DSP_constructor(int samplingFreq, int bufferSize) {
        // Make a new noise object
        Noise* n = new Noise();
        // Init it with samplingFreq supplied... should we give a sample size here too?
        n->init(samplingFreq);

        return n;
    }
    
    int DSP_compute(Noise *n, int count, FAUSTFLOAT** inputs, FAUSTFLOAT** outputs) {
        n->compute(count, inputs, outputs);
        return 1;
    }
    
    int DSP_getNumInputs(Noise *n){
        return n->getNumInputs();
    }
    
    int DSP_getNumOutputs(Noise *n){
        return n->getNumOutputs();
    }

    void DSP_destructor(Noise *n) {
        delete n;
    }
}

// Number of channels gotten from getNumInputs / getNumOutputs

// fOutChannel[i] = (float*)ioData->mBuffers[i].mData;