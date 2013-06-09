// Adapted From https://gist.github.com/camupod/5640386
// compile using "C" linkage to avoid name obfuscation

extern "C" {
    float** fInChannel;
    float** fOutChannel;
    int numInputs;
    int numOutputs;
    //constructor
    void *NOISE_constructor(int samplingFreq) {
        // Make a new noise object
        Noise* n = new Noise();
        // Init it with samplingFreq supplied... should we give a sample size here too?
        n->init(samplingFreq);
        
        // Lets get this once so we don't need to keep calculating every call to compute
        numInputs = n->getNumInputs();
        numOutputs = n->getNumOutputs();
        return n;
    }
    
    FAUSTFLOAT NOISE_compute(Noise *n, int count) {
        
        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // THERE IS CURRENTLY A SUPER NASTY MEMORY LEAK HERE
        // For now just trying to get it to work but
        // I am creating all these float arrays and
        // Not dealing with the memory afterwards
        
        int numInputs = n->getNumInputs();
        int numOutputs = n->getNumOutputs();
        
        for (int i = 0; i < numInputs; i++) {
            fInChannel[i] = new float[count];
        }
        for (int i = 0; i < numOutputs; i++) {
            fOutChannel[i] = new float[count];
        }
        
        n->compute(count, fInChannel, fOutChannel);
        
        float temp[count];
        for (int i; i < count; i++) {
            temp[i] = fOutChannel[0][i];
        }
        
        return temp[22];
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