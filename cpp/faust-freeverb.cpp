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
	float fRec46[2];
	float fVec19[2048];
	float fRec47[2];
	float fRec44[2];
	float fVec18[2048];
	float fRec45[2];
	float fRec42[2];
	float fVec17[2048];
	float fRec43[2];
	float fRec40[2];
	float fVec16[2048];
	float fRec41[2];
	float fRec38[2];
	float fVec15[2048];
	float fRec39[2];
	float fRec36[2];
	float fVec14[2048];
	float fRec37[2];
	float fRec34[2];
	float fVec13[2048];
	float fRec35[2];
	float fRec32[2];
	float fVec12[2048];
	float fRec33[2];
	float fRec0[2];
	float fVec11[256];
	float fRec2[2];
	float fVec10[512];
	float fRec4[2];
	float fVec9[512];
	float fRec6[2];
	float fVec8[1024];
	float fRec22[2];
	float fVec7[2048];
	float fRec23[2];
	float fRec20[2];
	float fVec6[2048];
	float fRec21[2];
	float fRec18[2];
	float fVec5[2048];
	float fRec19[2];
	float fRec16[2];
	float fVec4[2048];
	float fRec17[2];
	float fRec14[2];
	float fVec3[2048];
	float fRec15[2];
	float fRec12[2];
	float fVec2[2048];
	float fRec13[2];
	float fRec10[2];
	float fVec1[2048];
	float fRec11[2];
	float fRec8[2];
	float fVec0[2048];
	float fRec9[2];
	FAUSTFLOAT fhslider0;
	FAUSTFLOAT fhslider1;
	FAUSTFLOAT fhslider2;
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
		fhslider0 = FAUSTFLOAT(0.3333);
		fhslider1 = FAUSTFLOAT(0.5);
		fhslider2 = FAUSTFLOAT(0.5);
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec9[i] = 0.f;
			
		}
		IOTA = 0;
		for (int i = 0; (i < 2048); i = (i + 1)) {
			fVec0[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec8[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec11[i] = 0.f;
			
		}
		for (int i = 0; (i < 2048); i = (i + 1)) {
			fVec1[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec10[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec13[i] = 0.f;
			
		}
		for (int i = 0; (i < 2048); i = (i + 1)) {
			fVec2[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec12[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec15[i] = 0.f;
			
		}
		for (int i = 0; (i < 2048); i = (i + 1)) {
			fVec3[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec14[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec17[i] = 0.f;
			
		}
		for (int i = 0; (i < 2048); i = (i + 1)) {
			fVec4[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec16[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec19[i] = 0.f;
			
		}
		for (int i = 0; (i < 2048); i = (i + 1)) {
			fVec5[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec18[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec21[i] = 0.f;
			
		}
		for (int i = 0; (i < 2048); i = (i + 1)) {
			fVec6[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec20[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec23[i] = 0.f;
			
		}
		for (int i = 0; (i < 2048); i = (i + 1)) {
			fVec7[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec22[i] = 0.f;
			
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
			fRec33[i] = 0.f;
			
		}
		for (int i = 0; (i < 2048); i = (i + 1)) {
			fVec12[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec32[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec35[i] = 0.f;
			
		}
		for (int i = 0; (i < 2048); i = (i + 1)) {
			fVec13[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec34[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec37[i] = 0.f;
			
		}
		for (int i = 0; (i < 2048); i = (i + 1)) {
			fVec14[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec36[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec39[i] = 0.f;
			
		}
		for (int i = 0; (i < 2048); i = (i + 1)) {
			fVec15[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec38[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec41[i] = 0.f;
			
		}
		for (int i = 0; (i < 2048); i = (i + 1)) {
			fVec16[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec40[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec43[i] = 0.f;
			
		}
		for (int i = 0; (i < 2048); i = (i + 1)) {
			fVec17[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec42[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec45[i] = 0.f;
			
		}
		for (int i = 0; (i < 2048); i = (i + 1)) {
			fVec18[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec44[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec47[i] = 0.f;
			
		}
		for (int i = 0; (i < 2048); i = (i + 1)) {
			fVec19[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec46[i] = 0.f;
			
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
		interface->openVerticalBox("Freeverb");
		interface->addHorizontalSlider("Damp", &fhslider2, 0.5f, 0.f, 1.f, 0.025f);
		interface->addHorizontalSlider("RoomSize", &fhslider1, 0.5f, 0.f, 1.f, 0.025f);
		interface->addHorizontalSlider("Wet", &fhslider0, 0.3333f, 0.f, 1.f, 0.025f);
		interface->closeBox();
		
	}
	
	virtual void compute(int count, FAUSTFLOAT** inputs, FAUSTFLOAT** outputs) {
		FAUSTFLOAT* input0 = inputs[0];
		FAUSTFLOAT* input1 = inputs[1];
		FAUSTFLOAT* output0 = outputs[0];
		FAUSTFLOAT* output1 = outputs[1];
		float fSlow0 = float(fhslider0);
		float fSlow1 = (0.7f + (0.28f * float(fhslider1)));
		float fSlow2 = (0.4f * float(fhslider2));
		float fSlow3 = (1.f - fSlow2);
		float fSlow4 = (1.f - fSlow0);
		for (int i = 0; (i < count); i = (i + 1)) {
			fRec9[0] = ((fSlow2 * fRec9[1]) + (fSlow3 * fRec8[1]));
			float fTemp0 = float(input0[i]);
			float fTemp1 = float(input1[i]);
			float fTemp2 = (0.015f * (fTemp0 + fTemp1));
			fVec0[(IOTA & 2047)] = ((fSlow1 * fRec9[0]) + fTemp2);
			fRec8[0] = fVec0[((IOTA - 1116) & 2047)];
			fRec11[0] = ((fSlow2 * fRec11[1]) + (fSlow3 * fRec10[1]));
			fVec1[(IOTA & 2047)] = (fTemp2 + (fSlow1 * fRec11[0]));
			fRec10[0] = fVec1[((IOTA - 1188) & 2047)];
			fRec13[0] = ((fSlow2 * fRec13[1]) + (fSlow3 * fRec12[1]));
			fVec2[(IOTA & 2047)] = (fTemp2 + (fSlow1 * fRec13[0]));
			fRec12[0] = fVec2[((IOTA - 1277) & 2047)];
			fRec15[0] = ((fSlow2 * fRec15[1]) + (fSlow3 * fRec14[1]));
			fVec3[(IOTA & 2047)] = (fTemp2 + (fSlow1 * fRec15[0]));
			fRec14[0] = fVec3[((IOTA - 1356) & 2047)];
			fRec17[0] = ((fSlow2 * fRec17[1]) + (fSlow3 * fRec16[1]));
			fVec4[(IOTA & 2047)] = (fTemp2 + (fSlow1 * fRec17[0]));
			fRec16[0] = fVec4[((IOTA - 1422) & 2047)];
			fRec19[0] = ((fSlow2 * fRec19[1]) + (fSlow3 * fRec18[1]));
			fVec5[(IOTA & 2047)] = (fTemp2 + (fSlow1 * fRec19[0]));
			fRec18[0] = fVec5[((IOTA - 1491) & 2047)];
			fRec21[0] = ((fSlow2 * fRec21[1]) + (fSlow3 * fRec20[1]));
			fVec6[(IOTA & 2047)] = (fTemp2 + (fSlow1 * fRec21[0]));
			fRec20[0] = fVec6[((IOTA - 1557) & 2047)];
			fRec23[0] = ((fSlow2 * fRec23[1]) + (fSlow3 * fRec22[1]));
			fVec7[(IOTA & 2047)] = (fTemp2 + (fSlow1 * fRec23[0]));
			fRec22[0] = fVec7[((IOTA - 1617) & 2047)];
			float fTemp3 = (((((((fRec8[0] + fRec10[0]) + fRec12[0]) + fRec14[0]) + fRec16[0]) + fRec18[0]) + fRec20[0]) + fRec22[0]);
			fVec8[(IOTA & 1023)] = (fTemp3 + (0.5f * fRec6[1]));
			fRec6[0] = fVec8[((IOTA - 556) & 1023)];
			float fRec7 = (0.f - (fTemp3 - fRec6[1]));
			fVec9[(IOTA & 511)] = (fRec7 + (0.5f * fRec4[1]));
			fRec4[0] = fVec9[((IOTA - 441) & 511)];
			float fRec5 = (fRec4[1] - fRec7);
			fVec10[(IOTA & 511)] = (fRec5 + (0.5f * fRec2[1]));
			fRec2[0] = fVec10[((IOTA - 341) & 511)];
			float fRec3 = (fRec2[1] - fRec5);
			fVec11[(IOTA & 255)] = (fRec3 + (0.5f * fRec0[1]));
			fRec0[0] = fVec11[((IOTA - 225) & 255)];
			float fRec1 = (fRec0[1] - fRec3);
			output0[i] = FAUSTFLOAT(((fSlow0 * fRec1) + (fSlow4 * fTemp0)));
			fRec33[0] = ((fSlow2 * fRec33[1]) + (fSlow3 * fRec32[1]));
			fVec12[(IOTA & 2047)] = (fTemp2 + (fSlow1 * fRec33[0]));
			fRec32[0] = fVec12[((IOTA - 1139) & 2047)];
			fRec35[0] = ((fSlow2 * fRec35[1]) + (fSlow3 * fRec34[1]));
			fVec13[(IOTA & 2047)] = (fTemp2 + (fSlow1 * fRec35[0]));
			fRec34[0] = fVec13[((IOTA - 1211) & 2047)];
			fRec37[0] = ((fSlow2 * fRec37[1]) + (fSlow3 * fRec36[1]));
			fVec14[(IOTA & 2047)] = (fTemp2 + (fSlow1 * fRec37[0]));
			fRec36[0] = fVec14[((IOTA - 1300) & 2047)];
			fRec39[0] = ((fSlow2 * fRec39[1]) + (fSlow3 * fRec38[1]));
			fVec15[(IOTA & 2047)] = (fTemp2 + (fSlow1 * fRec39[0]));
			fRec38[0] = fVec15[((IOTA - 1379) & 2047)];
			fRec41[0] = ((fSlow2 * fRec41[1]) + (fSlow3 * fRec40[1]));
			fVec16[(IOTA & 2047)] = (fTemp2 + (fSlow1 * fRec41[0]));
			fRec40[0] = fVec16[((IOTA - 1445) & 2047)];
			fRec43[0] = ((fSlow2 * fRec43[1]) + (fSlow3 * fRec42[1]));
			fVec17[(IOTA & 2047)] = (fTemp2 + (fSlow1 * fRec43[0]));
			fRec42[0] = fVec17[((IOTA - 1514) & 2047)];
			fRec45[0] = ((fSlow2 * fRec45[1]) + (fSlow3 * fRec44[1]));
			fVec18[(IOTA & 2047)] = (fTemp2 + (fSlow1 * fRec45[0]));
			fRec44[0] = fVec18[((IOTA - 1580) & 2047)];
			fRec47[0] = ((fSlow2 * fRec47[1]) + (fSlow3 * fRec46[1]));
			fVec19[(IOTA & 2047)] = (fTemp2 + (fSlow1 * fRec47[0]));
			fRec46[0] = fVec19[((IOTA - 1640) & 2047)];
			float fTemp4 = (((((((fRec32[0] + fRec34[0]) + fRec36[0]) + fRec38[0]) + fRec40[0]) + fRec42[0]) + fRec44[0]) + fRec46[0]);
			fVec20[(IOTA & 1023)] = (fTemp4 + (0.5f * fRec30[1]));
			fRec30[0] = fVec20[((IOTA - 579) & 1023)];
			float fRec31 = (0.f - (fTemp4 - fRec30[1]));
			fVec21[(IOTA & 511)] = (fRec31 + (0.5f * fRec28[1]));
			fRec28[0] = fVec21[((IOTA - 464) & 511)];
			float fRec29 = (fRec28[1] - fRec31);
			fVec22[(IOTA & 511)] = (fRec29 + (0.5f * fRec26[1]));
			fRec26[0] = fVec22[((IOTA - 364) & 511)];
			float fRec27 = (fRec26[1] - fRec29);
			fVec23[(IOTA & 255)] = (fRec27 + (0.5f * fRec24[1]));
			fRec24[0] = fVec23[((IOTA - 248) & 255)];
			float fRec25 = (fRec24[1] - fRec27);
			output1[i] = FAUSTFLOAT(((fSlow0 * fRec25) + (fSlow4 * fTemp1)));
			fRec9[1] = fRec9[0];
			IOTA = (IOTA + 1);
			fRec8[1] = fRec8[0];
			fRec11[1] = fRec11[0];
			fRec10[1] = fRec10[0];
			fRec13[1] = fRec13[0];
			fRec12[1] = fRec12[0];
			fRec15[1] = fRec15[0];
			fRec14[1] = fRec14[0];
			fRec17[1] = fRec17[0];
			fRec16[1] = fRec16[0];
			fRec19[1] = fRec19[0];
			fRec18[1] = fRec18[0];
			fRec21[1] = fRec21[0];
			fRec20[1] = fRec20[0];
			fRec23[1] = fRec23[0];
			fRec22[1] = fRec22[0];
			fRec6[1] = fRec6[0];
			fRec4[1] = fRec4[0];
			fRec2[1] = fRec2[0];
			fRec0[1] = fRec0[0];
			fRec33[1] = fRec33[0];
			fRec32[1] = fRec32[0];
			fRec35[1] = fRec35[0];
			fRec34[1] = fRec34[0];
			fRec37[1] = fRec37[0];
			fRec36[1] = fRec36[0];
			fRec39[1] = fRec39[0];
			fRec38[1] = fRec38[0];
			fRec41[1] = fRec41[0];
			fRec40[1] = fRec40[0];
			fRec43[1] = fRec43[0];
			fRec42[1] = fRec42[0];
			fRec45[1] = fRec45[0];
			fRec44[1] = fRec44[0];
			fRec47[1] = fRec47[0];
			fRec46[1] = fRec46[0];
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
	FAUST_ADDHORIZONTALSLIDER("Freeverb/Damp", fhslider2, 0.5f, 0.0f, 1.0f, 0.025f);
	FAUST_ADDHORIZONTALSLIDER("Freeverb/RoomSize", fhslider1, 0.5f, 0.0f, 1.0f, 0.025f);
	FAUST_ADDHORIZONTALSLIDER("Freeverb/Wet", fhslider0, 0.3333f, 0.0f, 1.0f, 0.025f);
#endif

int main(int argc, char *argv[])
{
	Freeverb DSP;
}


#endif
// Adapted From https://gist.github.com/camupod/5640386
// compile using "C" linkage to avoid name obfuscation
#include <emscripten.h>
#include <map>
#include <string>

extern "C" {
    typedef std::map<std::string, FAUSTFLOAT*> UImap;
    class JSUI : public UI
    {

     public:
        JSUI() {};
        ~JSUI() {};
        
    public:
        UImap uiMap;
        UImap::iterator iter;
    public:
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
        
        void insertMap(const char* label, FAUSTFLOAT* zone)
        {
            uiMap.insert( std::pair<std::string, FAUSTFLOAT*>(label, zone));
        }

        void addButton(const char* label, FAUSTFLOAT* zone)
        {
            insertMap(label, zone);
        };
        void addCheckButton(const char* label, FAUSTFLOAT* zone)
        {
            insertMap(label, zone);
        };
        void addVerticalSlider(const char* label, FAUSTFLOAT* zone, FAUSTFLOAT init, FAUSTFLOAT fmin, FAUSTFLOAT fmax, FAUSTFLOAT step)
        {
            insertMap(label, zone);
        };
        void addHorizontalSlider(const char* label, FAUSTFLOAT* zone, FAUSTFLOAT init, FAUSTFLOAT fmin, FAUSTFLOAT fmax, FAUSTFLOAT step)
        {
            insertMap(label, zone);
        };
        void addNumEntry(const char* label, FAUSTFLOAT* zone, FAUSTFLOAT init, FAUSTFLOAT fmin, FAUSTFLOAT fmax, FAUSTFLOAT step)
        {
            insertMap(label, zone);
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
    
    class Freeverb_wrap : public Freeverb
    {
    public:
        JSUI *ui;
    };
    
    //constructor
    void *FREEVERB_constructor(int samplingFreq) {
        
        // Make a new freeverb object
        Freeverb_wrap* n = new Freeverb_wrap();
        n->ui = new JSUI();
        // Init it with samplingFreq supplied... should we give a sample size here too?
        n->init(samplingFreq);
        n->buildUserInterface(n->ui);
        n->ui->iter = n->ui->uiMap.begin();

        return n;
    }

    int FREEVERB_getNumParams(Freeverb_wrap *n)
    {
        return n->ui->uiMap.size();
    }
    
    FAUSTFLOAT* FREEVERB_getNextParam(Freeverb_wrap *n, char *key)
    {
        FAUSTFLOAT* valPtr = n->ui->iter->second;
        strcpy(key, n->ui->iter->first.c_str());
        n->ui->iter++;
        if (n->ui->iter == n->ui->uiMap.end())
        {
            n->ui->iter = n->ui->uiMap.begin();
        }
        return valPtr;
    }
    
    int FREEVERB_compute(Freeverb_wrap *n, int count, FAUSTFLOAT** inputs, FAUSTFLOAT** outputs) {
        n->compute(count, inputs, outputs);
        return 1;
    }
    
    int FREEVERB_getNumInputs(Freeverb_wrap *n){
        return n->getNumInputs();
    }
    
    int FREEVERB_getNumOutputs(Freeverb_wrap *n){
        return n->getNumOutputs();
    }

    void FREEVERB_destructor(Freeverb_wrap *n) {
        delete n;
    }
}
