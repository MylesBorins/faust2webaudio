// Adapted From https://gist.github.com/camupod/5640386
//compile using "C" linkage to avoid name obfuscation

extern "C" {
    //constructor
    void *NOISE_constructor(int samplingFreq) {
        Noise* n = new Noise();
        n->init(samplingFreq);
        return n;
    }
    
    FAUSTFLOAT **NOISE_compute(Noise *n, int count) {
        FAUSTFLOAT** input = 0;
        FAUSTFLOAT** output;
        
        n->compute(count, input, output);
        
        return output;
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

// float** fInChannel;
// float** fOutChannel;

// Number of channels gotten from getNumInputs / getNumOutputs

// fOutChannel[i] = (float*)ioData->mBuffers[i].mData;