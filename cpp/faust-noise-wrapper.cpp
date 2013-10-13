// Adapted From https://gist.github.com/camupod/5640386
// compile using "C" linkage to avoid name obfuscation
extern "C" {
    // float** fInChannel;
    // float** fOutChannel;
    int numInputs;
    int numOutputs;
    //constructor
    void *NOISE_constructor(int samplingFreq, int bufferSize) {
        // Make a new noise object
        Noise* n = new Noise();
        // Init it with samplingFreq supplied... should we give a sample size here too?
        n->init(samplingFreq);

        return n;
    }
    
    int NOISE_compute(Noise *n, int count, FAUSTFLOAT** inputs, FAUSTFLOAT** outputs) {
        n->compute(count, inputs, outputs);
        return 1;
    }
    
    int NOISE_getNumInputs(Noise *n){
        return n->getNumInputs();
    }
    
    int NOISE_getNumOutputs(Noise *n){
        return n->getNumOutputs();
    }

    void NOISE_destructor(Noise *n) {
        delete n;
    }
}

// Number of channels gotten from getNumInputs / getNumOutputs

// fOutChannel[i] = (float*)ioData->mBuffers[i].mData;