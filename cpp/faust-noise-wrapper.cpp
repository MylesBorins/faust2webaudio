// Adapted From https://gist.github.com/camupod/5640386
// compile using "C" linkage to avoid name obfuscation
extern "C" {
    float** fInChannel;
    float** fOutChannel;
    int numInputs;
    int numOutputs;
    //constructor
    void *NOISE_constructor(int samplingFreq, int bufferSize) {
        // Make a new noise object
        Noise* n = new Noise();
        // Init it with samplingFreq supplied... should we give a sample size here too?
        n->init(samplingFreq);
        
        // Lets get this once so we don't need to keep calculating every call to compute
        numInputs = n->getNumInputs();
        numOutputs = n->getNumOutputs();
        
        // This Needs to be dealt with... curently only able to return a single buffer... rather
        // Way too mono...
        // This is due to the Channels not being properly initialized... need to look at how
        // Other architecture fiels do this a bit better
        for (int i = 0; i < numInputs; i++) {
            fInChannel[i] = new float[bufferSize];
        }
        
        for (int i = 0; i < numOutputs; i++) {
            fOutChannel[i] = new float[bufferSize];
        }
        return n;
    }
    
    FAUSTFLOAT *NOISE_compute(Noise *n, int count) {
                                
        n->compute(count, fInChannel, fOutChannel);
        
        // Returning due to problem as mentioend above... 
        return fOutChannel[0];
    }
    
    int NOISE_getNumInputs(Noise *n){
        return n->getNumInputs();
    }
    
    int NOISE_getNumOutputs(Noise *n){
        return n->getNumOutputs();
    }

    void NOISE_destructor(Noise *n) {
        for (int i = 0; i < numInputs; i++) {
            delete fInChannel[i];
        }
        
        for (int i = 0; i < numOutputs; i++) {
            delete fOutChannel[i];
        }
        delete n;
    }
}

// Number of channels gotten from getNumInputs / getNumOutputs

// fOutChannel[i] = (float*)ioData->mBuffers[i].mData;