// Adapted From https://gist.github.com/camupod/5640386
// compile using "C" linkage to avoid name obfuscation
#include <emscripten.h>

extern "C" {
    extern void addHS(const char* label, FAUSTFLOAT* zone);
    
    class JSUI : public UI
    {

     public:

    	JSUI() {};

    	~JSUI() {};

        // -- widget's layouts

        void openTabBox(const char* label)
        {
            
        };
        void openHorizontalBox(const char* label)
        {

        };
        void openVerticalBox(const char* label)
        {
            
        };
        void closeBox()
        {
            
        };

        // -- active widgets

        void addButton(const char* label, FAUSTFLOAT* zone)
        {
            
        };
        void addCheckButton(const char* label, FAUSTFLOAT* zone)
        {
            
        };
        void addVerticalSlider(const char* label, FAUSTFLOAT* zone, FAUSTFLOAT init, FAUSTFLOAT fmin, FAUSTFLOAT fmax, FAUSTFLOAT step)
        {
            
        };
        void addHorizontalSlider(const char* label, FAUSTFLOAT* zone, FAUSTFLOAT init, FAUSTFLOAT fmin, FAUSTFLOAT fmax, FAUSTFLOAT step)
        {
            addHS(label, zone);
        };
        void addNumEntry(const char* label, FAUSTFLOAT* zone, FAUSTFLOAT init, FAUSTFLOAT fmin, FAUSTFLOAT fmax, FAUSTFLOAT step)
        {
            
        };

        // -- passive widgets

        void addHorizontalBargraph(const char* label, FAUSTFLOAT* zone, FAUSTFLOAT fmin, FAUSTFLOAT fmax)
        {
        };
        void addVerticalBargraph(const char* label, FAUSTFLOAT* zone, FAUSTFLOAT fmin, FAUSTFLOAT fmax)
        {
        };

    	// -- metadata declarations

        void declare(FAUSTFLOAT* zone, const char* key, const char* val)
        {
            
        };
    };
    
    //constructor
    void *DSP_constructor(int samplingFreq) {
        
        // Make a new dsp object
        Dsp* n = new Dsp();
        JSUI* ui = new JSUI();
        // Init it with samplingFreq supplied... should we give a sample size here too?
        n->init(samplingFreq);
        n->buildUserInterface(ui);

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