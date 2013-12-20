//-----------------------------------------------------
// author: "Grame"
// copyright: "(c) GRAME 2006"
// license: "BSD"
// name: "freeverb"
// version: "1.0"
//
// Code generated with Faust 2.0.a11 (http://faust.grame.fr)
//-----------------------------------------------------

#ifndef  __Freeverb_H__
#define  __Freeverb_H__
/************************************************************************
 ************************************************************************
    FAUST Architecture File
	Copyright (C) 2003-2011 GRAME, Centre National de Creation Musicale
    ---------------------------------------------------------------------

	This is sample code. This file is provided as an example of fminimal
	FAUST architecture file. Redistribution and use in source and binary
	forms, with or without modification, in part or in full are permitted.
	In particular you can create a derived work of this FAUST architecture
	and distribute that work under terms of your choice.

	This sample code is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 ************************************************************************
 ************************************************************************/

#include <cmath>

#ifndef FAUST_UI_H
#define FAUST_UI_H

#ifndef FAUSTFLOAT
#define FAUSTFLOAT float
#endif

/*******************************************************************************
 * UI : Faust User Interface
 * This abstract class contains only the method that the faust compiler can
 * generate to describe a DSP interface.
 ******************************************************************************/

class UI
{

 public:

	UI() {}

	virtual ~UI() {}

    // -- widget's layouts

    virtual void openTabBox(const char* label) = 0;
    virtual void openHorizontalBox(const char* label) = 0;
    virtual void openVerticalBox(const char* label) = 0;
    virtual void closeBox() = 0;

    // -- active widgets

    virtual void addButton(const char* label, FAUSTFLOAT* zone) = 0;
    virtual void addCheckButton(const char* label, FAUSTFLOAT* zone) = 0;
    virtual void addVerticalSlider(const char* label, FAUSTFLOAT* zone, FAUSTFLOAT init, FAUSTFLOAT fmin, FAUSTFLOAT fmax, FAUSTFLOAT step) = 0;
    virtual void addHorizontalSlider(const char* label, FAUSTFLOAT* zone, FAUSTFLOAT init, FAUSTFLOAT fmin, FAUSTFLOAT fmax, FAUSTFLOAT step) = 0;
    virtual void addNumEntry(const char* label, FAUSTFLOAT* zone, FAUSTFLOAT init, FAUSTFLOAT fmin, FAUSTFLOAT fmax, FAUSTFLOAT step) = 0;

    // -- passive widgets

    virtual void addHorizontalBargraph(const char* label, FAUSTFLOAT* zone, FAUSTFLOAT fmin, FAUSTFLOAT fmax) = 0;
    virtual void addVerticalBargraph(const char* label, FAUSTFLOAT* zone, FAUSTFLOAT fmin, FAUSTFLOAT fmax) = 0;

	// -- metadata declarations

    virtual void declare(FAUSTFLOAT* zone, const char* key, const char* val) {}
};

#endif
/************************************************************************
	IMPORTANT NOTE : this file contains two clearly delimited sections :
	the ARCHITECTURE section (in two parts) and the USER section. Each section
	is governed by its own copyright and license. Please check individually
	each section for license and copyright information.
*************************************************************************/

/*******************BEGIN ARCHITECTURE SECTION (part 1/2)****************/

/************************************************************************
    FAUST Architecture File
	Copyright (C) 2003-2011 GRAME, Centre National de Creation Musicale
    ---------------------------------------------------------------------
    This Architecture section is free software; you can redistribute it
    and/or modify it under the terms of the GNU General Public License
	as published by the Free Software Foundation; either version 3 of
	the License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
	along with this program; If not, see <http://www.gnu.org/licenses/>.

	EXCEPTION : As a special exception, you may create a larger work
	that contains this FAUST architecture section and distribute
	that work under terms of your choice, so long as this FAUST
	architecture section is not modified.


 ************************************************************************
 ************************************************************************/
 
/******************************************************************************
*******************************************************************************

								FAUST DSP

*******************************************************************************
*******************************************************************************/

#ifndef __dsp__
#define __dsp__

#ifndef FAUSTFLOAT
#define FAUSTFLOAT float
#endif

class UI;

//----------------------------------------------------------------
//  signal processor definition
//----------------------------------------------------------------

class dsp {

 public:
	dsp() {}
	virtual ~dsp() {}

	virtual int getNumInputs() 										= 0;
	virtual int getNumOutputs() 									= 0;
	virtual void buildUserInterface(UI* interface) 					= 0;
	virtual void init(int samplingRate) 							= 0;
 	virtual void compute(int len, FAUSTFLOAT** inputs, FAUSTFLOAT** outputs) 	= 0;
};

// On Intel set FZ (Flush to Zero) and DAZ (Denormals Are Zero)
// flags to avoid costly denormals
#ifdef __SSE__
    #include <xmfmintrin.h>
    #ifdef __SSE2__
        #define AVOIDDENORMALS _mm_setcsr(_mm_getcsr() | 0x8040)
    #else
        #define AVOIDDENORMALS _mm_setcsr(_mm_getcsr() | 0x8000)
    #endif
#else
    #define AVOIDDENORMALS
#endif

#endif
/************************************************************************
 ************************************************************************
    FAUST Architecture File
	Copyright (C) 2003-2011 GRAME, Centre National de Creation Musicale
    ---------------------------------------------------------------------
    This Architecture section is free software; you can redistribute it
    and/or modify it under the terms of the GNU General Public License
	as published by the Free Software Foundation; either version 3 of
	the License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
	along with this program; If not, see <http://www.gnu.org/licenses/>.

 ************************************************************************
 ************************************************************************/
 
#ifndef __meta__
#define __meta__

struct Meta
{
    virtual void declare(const char* key, const char* value) = 0;
};

#endif


/******************************************************************************
*******************************************************************************

							       VECTOR INTRINSICS

*******************************************************************************
*******************************************************************************/


/******************************************************************************
*******************************************************************************

			ABSTRACT USER INTERFACE

*******************************************************************************
*******************************************************************************/

//----------------------------------------------------------------------------
//  FAUST generated signal processor
//----------------------------------------------------------------------------

#ifndef FAUSTFLOAT
#define FAUSTFLOAT float
#endif  



#ifndef FAUSTCLASS 
#define FAUSTCLASS Freeverb
#endif

class Freeverb : public dsp {
	
  public:
	
	float fRec24[2];
	float fVec23[256];
	float fRec26[2];
	float fVec22[512];
	float fRec28[2];
	float fVec21[512];
	float fRec30[2];
	float fVec20[1024];
	float fVec19[2048];
	int iRec47[2];
	float fVec18[2048];
	int iRec45[2];
	float fVec17[2048];
	int iRec43[2];
	float fVec16[2048];
	int iRec41[2];
	float fVec15[2048];
	int iRec39[2];
	float fVec14[2048];
	int iRec37[2];
	float fVec13[2048];
	int iRec35[2];
	float fVec12[2048];
	int iRec33[2];
	float fRec0[2];
	float fVec11[256];
	float fRec2[2];
	float fVec10[512];
	float fRec4[2];
	float fVec9[512];
	float fRec6[2];
	float fVec8[1024];
	float fVec7[2048];
	int iRec23[2];
	float fVec6[2048];
	int iRec21[2];
	float fVec5[2048];
	int iRec19[2];
	float fVec4[2048];
	int iRec17[2];
	float fVec3[2048];
	int iRec15[2];
	float fVec2[2048];
	int iRec13[2];
	float fVec1[2048];
	int iRec11[2];
	float fVec0[2048];
	int iRec9[2];
	int IOTA;
	int fSamplingFreq;
	
  public:
	
	void static metadata(Meta* m) { 
		m->declare("author", "Grame");
		m->declare("copyright", "(c) GRAME 2006");
		m->declare("license", "BSD");
		m->declare("name", "freeverb");
		m->declare("reference", "https://ccrma.stanford.edu/~jos/pasp/Freeverb.html");
		m->declare("version", "1.0");
	}

	virtual int getNumInputs() {
		return 2;
		
	}
	virtual int getNumOutputs() {
		return 2;
		
	}
	virtual int getInputRate(int channel) {
		int rate;
		switch (channel) {
			case 0: {
				rate = 1;
				break;
			}
			case 1: {
				rate = 1;
				break;
			}
			default: {
				rate = -1;
				break;
			}
			
		}
		return rate;
		
	}
	virtual int getOutputRate(int channel) {
		int rate;
		switch (channel) {
			case 0: {
				rate = 1;
				break;
			}
			case 1: {
				rate = 1;
				break;
			}
			default: {
				rate = -1;
				break;
			}
			
		}
		return rate;
		
	}
	
	static void classInit(int samplingFreq) {
		
	}
	
	virtual void instanceInit(int samplingFreq) {
		fSamplingFreq = samplingFreq;
		for (int i = 0; (i < 2); i = (i + 1)) {
			iRec9[i] = 0;
			
		}
		IOTA = 0;
		for (int i = 0; (i < 2048); i = (i + 1)) {
			fVec0[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			iRec11[i] = 0;
			
		}
		for (int i = 0; (i < 2048); i = (i + 1)) {
			fVec1[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			iRec13[i] = 0;
			
		}
		for (int i = 0; (i < 2048); i = (i + 1)) {
			fVec2[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			iRec15[i] = 0;
			
		}
		for (int i = 0; (i < 2048); i = (i + 1)) {
			fVec3[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			iRec17[i] = 0;
			
		}
		for (int i = 0; (i < 2048); i = (i + 1)) {
			fVec4[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			iRec19[i] = 0;
			
		}
		for (int i = 0; (i < 2048); i = (i + 1)) {
			fVec5[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			iRec21[i] = 0;
			
		}
		for (int i = 0; (i < 2048); i = (i + 1)) {
			fVec6[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			iRec23[i] = 0;
			
		}
		for (int i = 0; (i < 2048); i = (i + 1)) {
			fVec7[i] = 0.f;
			
		}
		for (int i = 0; (i < 1024); i = (i + 1)) {
			fVec8[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec6[i] = 0.f;
			
		}
		for (int i = 0; (i < 512); i = (i + 1)) {
			fVec9[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec4[i] = 0.f;
			
		}
		for (int i = 0; (i < 512); i = (i + 1)) {
			fVec10[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec2[i] = 0.f;
			
		}
		for (int i = 0; (i < 256); i = (i + 1)) {
			fVec11[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec0[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			iRec33[i] = 0;
			
		}
		for (int i = 0; (i < 2048); i = (i + 1)) {
			fVec12[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			iRec35[i] = 0;
			
		}
		for (int i = 0; (i < 2048); i = (i + 1)) {
			fVec13[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			iRec37[i] = 0;
			
		}
		for (int i = 0; (i < 2048); i = (i + 1)) {
			fVec14[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			iRec39[i] = 0;
			
		}
		for (int i = 0; (i < 2048); i = (i + 1)) {
			fVec15[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			iRec41[i] = 0;
			
		}
		for (int i = 0; (i < 2048); i = (i + 1)) {
			fVec16[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			iRec43[i] = 0;
			
		}
		for (int i = 0; (i < 2048); i = (i + 1)) {
			fVec17[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			iRec45[i] = 0;
			
		}
		for (int i = 0; (i < 2048); i = (i + 1)) {
			fVec18[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			iRec47[i] = 0;
			
		}
		for (int i = 0; (i < 2048); i = (i + 1)) {
			fVec19[i] = 0.f;
			
		}
		for (int i = 0; (i < 1024); i = (i + 1)) {
			fVec20[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec30[i] = 0.f;
			
		}
		for (int i = 0; (i < 512); i = (i + 1)) {
			fVec21[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec28[i] = 0.f;
			
		}
		for (int i = 0; (i < 512); i = (i + 1)) {
			fVec22[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec26[i] = 0.f;
			
		}
		for (int i = 0; (i < 256); i = (i + 1)) {
			fVec23[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec24[i] = 0.f;
			
		}
		
	}
	
	virtual void init(int samplingFreq) {
		classInit(samplingFreq);
		instanceInit(samplingFreq);
	}
	
	virtual void buildUserInterface(UI* interface) {
		interface->openVerticalBox("freeverb");
		interface->closeBox();
		
	}
	
	virtual void compute(int count, FAUSTFLOAT** inputs, FAUSTFLOAT** outputs) {
		FAUSTFLOAT* input0 = inputs[0];
		FAUSTFLOAT* input1 = inputs[1];
		FAUSTFLOAT* output0 = outputs[0];
		FAUSTFLOAT* output1 = outputs[1];
		for (int i = 0; (i < count); i = (i + 1)) {
			iRec9[0] = iRec9[1];
			float fTemp0 = (0.015f * (float(input0[i]) + float(input1[i])));
			fVec0[(IOTA & 2047)] = (float(iRec9[0]) + fTemp0);
			float fRec8 = fVec0[((IOTA - 1116) & 2047)];
			iRec11[0] = iRec11[1];
			fVec1[(IOTA & 2047)] = (float(iRec11[0]) + fTemp0);
			float fRec10 = fVec1[((IOTA - 1188) & 2047)];
			iRec13[0] = iRec13[1];
			fVec2[(IOTA & 2047)] = (float(iRec13[0]) + fTemp0);
			float fRec12 = fVec2[((IOTA - 1277) & 2047)];
			iRec15[0] = iRec15[1];
			fVec3[(IOTA & 2047)] = (float(iRec15[0]) + fTemp0);
			float fRec14 = fVec3[((IOTA - 1356) & 2047)];
			iRec17[0] = iRec17[1];
			fVec4[(IOTA & 2047)] = (float(iRec17[0]) + fTemp0);
			float fRec16 = fVec4[((IOTA - 1422) & 2047)];
			iRec19[0] = iRec19[1];
			fVec5[(IOTA & 2047)] = (float(iRec19[0]) + fTemp0);
			float fRec18 = fVec5[((IOTA - 1491) & 2047)];
			iRec21[0] = iRec21[1];
			fVec6[(IOTA & 2047)] = (float(iRec21[0]) + fTemp0);
			float fRec20 = fVec6[((IOTA - 1557) & 2047)];
			iRec23[0] = iRec23[1];
			fVec7[(IOTA & 2047)] = (float(iRec23[0]) + fTemp0);
			float fRec22 = fVec7[((IOTA - 1617) & 2047)];
			float fTemp1 = (((((((fRec8 + fRec10) + fRec12) + fRec14) + fRec16) + fRec18) + fRec20) + fRec22);
			fVec8[(IOTA & 1023)] = (fTemp1 + (0.5f * fRec6[1]));
			fRec6[0] = fVec8[((IOTA - 556) & 1023)];
			float fRec7 = (0.f - (fTemp1 - fRec6[1]));
			fVec9[(IOTA & 511)] = (fRec7 + (0.5f * fRec4[1]));
			fRec4[0] = fVec9[((IOTA - 441) & 511)];
			float fRec5 = (fRec4[1] - fRec7);
			fVec10[(IOTA & 511)] = (fRec5 + (0.5f * fRec2[1]));
			fRec2[0] = fVec10[((IOTA - 341) & 511)];
			float fRec3 = (fRec2[1] - fRec5);
			fVec11[(IOTA & 255)] = (fRec3 + (0.5f * fRec0[1]));
			fRec0[0] = fVec11[((IOTA - 225) & 255)];
			float fRec1 = (fRec0[1] - fRec3);
			output0[i] = FAUSTFLOAT(fRec1);
			iRec33[0] = iRec33[1];
			fVec12[(IOTA & 2047)] = (float(iRec33[0]) + fTemp0);
			float fRec32 = fVec12[((IOTA - 1139) & 2047)];
			iRec35[0] = iRec35[1];
			fVec13[(IOTA & 2047)] = (float(iRec35[0]) + fTemp0);
			float fRec34 = fVec13[((IOTA - 1211) & 2047)];
			iRec37[0] = iRec37[1];
			fVec14[(IOTA & 2047)] = (float(iRec37[0]) + fTemp0);
			float fRec36 = fVec14[((IOTA - 1300) & 2047)];
			iRec39[0] = iRec39[1];
			fVec15[(IOTA & 2047)] = (float(iRec39[0]) + fTemp0);
			float fRec38 = fVec15[((IOTA - 1379) & 2047)];
			iRec41[0] = iRec41[1];
			fVec16[(IOTA & 2047)] = (float(iRec41[0]) + fTemp0);
			float fRec40 = fVec16[((IOTA - 1445) & 2047)];
			iRec43[0] = iRec43[1];
			fVec17[(IOTA & 2047)] = (float(iRec43[0]) + fTemp0);
			float fRec42 = fVec17[((IOTA - 1514) & 2047)];
			iRec45[0] = iRec45[1];
			fVec18[(IOTA & 2047)] = (float(iRec45[0]) + fTemp0);
			float fRec44 = fVec18[((IOTA - 1580) & 2047)];
			iRec47[0] = iRec47[1];
			fVec19[(IOTA & 2047)] = (float(iRec47[0]) + fTemp0);
			float fRec46 = fVec19[((IOTA - 1640) & 2047)];
			float fTemp2 = (((((((fRec32 + fRec34) + fRec36) + fRec38) + fRec40) + fRec42) + fRec44) + fRec46);
			fVec20[(IOTA & 1023)] = (fTemp2 + (0.5f * fRec30[1]));
			fRec30[0] = fVec20[((IOTA - 579) & 1023)];
			float fRec31 = (0.f - (fTemp2 - fRec30[1]));
			fVec21[(IOTA & 511)] = (fRec31 + (0.5f * fRec28[1]));
			fRec28[0] = fVec21[((IOTA - 464) & 511)];
			float fRec29 = (fRec28[1] - fRec31);
			fVec22[(IOTA & 511)] = (fRec29 + (0.5f * fRec26[1]));
			fRec26[0] = fVec22[((IOTA - 364) & 511)];
			float fRec27 = (fRec26[1] - fRec29);
			fVec23[(IOTA & 255)] = (fRec27 + (0.5f * fRec24[1]));
			fRec24[0] = fVec23[((IOTA - 248) & 255)];
			float fRec25 = (fRec24[1] - fRec27);
			output1[i] = FAUSTFLOAT(fRec25);
			iRec9[1] = iRec9[0];
			IOTA = (IOTA + 1);
			iRec11[1] = iRec11[0];
			iRec13[1] = iRec13[0];
			iRec15[1] = iRec15[0];
			iRec17[1] = iRec17[0];
			iRec19[1] = iRec19[0];
			iRec21[1] = iRec21[0];
			iRec23[1] = iRec23[0];
			fRec6[1] = fRec6[0];
			fRec4[1] = fRec4[0];
			fRec2[1] = fRec2[0];
			fRec0[1] = fRec0[0];
			iRec33[1] = iRec33[0];
			iRec35[1] = iRec35[0];
			iRec37[1] = iRec37[0];
			iRec39[1] = iRec39[0];
			iRec41[1] = iRec41[0];
			iRec43[1] = iRec43[0];
			iRec45[1] = iRec45[0];
			iRec47[1] = iRec47[0];
			fRec30[1] = fRec30[0];
			fRec28[1] = fRec28[0];
			fRec26[1] = fRec26[0];
			fRec24[1] = fRec24[0];
			
		}
		
	}

	
};


#ifdef FAUST_UIMACROS
	#define FAUST_INPUTS 2
	#define FAUST_OUTPUTS 2
	#define FAUST_ACTIVES 0
	#define FAUST_PASSIVES 0
#endif

int main(int argc, char *argv[])
{
	Freeverb DSP;
}


#endif
// Adapted From https://gist.github.com/camupod/5640386
// compile using "C" linkage to avoid name obfuscation
#include <emscripten.h>

extern "C" {
    //constructor
    void *FREEVERB_constructor(int samplingFreq) {
        
        // Make a new freeverb object
        Freeverb* n = new Freeverb();
        // Init it with samplingFreq supplied... should we give a sample size here too?
        n->init(samplingFreq);

        return n;
    }
    
    int FREEVERB_compute(Freeverb *n, int count, FAUSTFLOAT** inputs, FAUSTFLOAT** outputs) {
        n->compute(count, inputs, outputs);
        return 1;
    }
    
    int FREEVERB_getNumInputs(Freeverb *n){
        return n->getNumInputs();
    }
    
    int FREEVERB_getNumOutputs(Freeverb *n){
        return n->getNumOutputs();
    }

    void FREEVERB_destructor(Freeverb *n) {
        delete n;
    }
}

// EM_ASM(
//     
// );
