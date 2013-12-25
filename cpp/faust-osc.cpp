//-----------------------------------------------------
// author: "Grame"
// copyright: "(c)GRAME 2009"
// license: "BSD"
// name: "osc"
// version: "1.0"
//
// Code generated with Faust 2.0.a11 (http://faust.grame.fr)
//-----------------------------------------------------

#ifndef  __Osc_H__
#define  __Osc_H__
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

#include <math.h>

float sinf(float dummy0);

class OscSIG0 {
	
  public:
	
	int iRec1[2];
	
  public:
	
	int getNumInputs() {
		return 0;
		
	}
	int getNumOutputs() {
		return 1;
		
	}
	int getInputRate(int channel) {
		int rate;
		switch (channel) {
			default: {
				rate = -1;
				break;
			}
			
		}
		return rate;
		
	}
	int getOutputRate(int channel) {
		int rate;
		switch (channel) {
			case 0: {
				rate = 0;
				break;
			}
			default: {
				rate = -1;
				break;
			}
			
		}
		return rate;
		
	}
	
	void instanceInitOscSIG0(int samplingFreq) {
		for (int i = 0; (i < 2); i = (i + 1)) {
			iRec1[i] = 0;
			
		}
		
	}
	
	void fillOscSIG0(int count, float* output) {
		for (int i = 0; (i < count); i = (i + 1)) {
			iRec1[0] = (1 + iRec1[1]);
			output[i] = sinf((9.58738e-05f * float((iRec1[0] - 1))));
			iRec1[1] = iRec1[0];
			
		}
		
	}
};

OscSIG0* newOscSIG0() {return (OscSIG0*) new OscSIG0(); }
void deleteOscSIG0(OscSIG0* dsp) {delete dsp; }

float powf(float dummy0, float dummy1);
static float ftbl0OscSIG0[65536];
float floorf(float dummy0);

#ifndef FAUSTCLASS 
#define FAUSTCLASS Osc
#endif

class Osc : public dsp {
	
  public:
	
	float fRec2[2];
	float fRec0[2];
	FAUSTFLOAT fhslider0;
	int fSamplingFreq;
	float fConst0;
	FAUSTFLOAT fhslider1;
	
  public:
	
	void static metadata(Meta* m) { 
		m->declare("author", "Grame");
		m->declare("copyright", "(c)GRAME 2009");
		m->declare("license", "BSD");
		m->declare("math.lib/author", "GRAME");
		m->declare("math.lib/copyright", "GRAME");
		m->declare("math.lib/license", "LGPL with exception");
		m->declare("math.lib/name", "Math Library");
		m->declare("math.lib/version", "1.0");
		m->declare("music.lib/author", "GRAME");
		m->declare("music.lib/copyright", "GRAME");
		m->declare("music.lib/license", "LGPL with exception");
		m->declare("music.lib/name", "Music Library");
		m->declare("music.lib/version", "1.0");
		m->declare("name", "osc");
		m->declare("version", "1.0");
	}

	virtual int getNumInputs() {
		return 0;
		
	}
	virtual int getNumOutputs() {
		return 1;
		
	}
	virtual int getInputRate(int channel) {
		int rate;
		switch (channel) {
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
			default: {
				rate = -1;
				break;
			}
			
		}
		return rate;
		
	}
	
	static void classInit(int samplingFreq) {
		OscSIG0* sig0 = newOscSIG0();
		sig0->instanceInitOscSIG0(samplingFreq);
		sig0->fillOscSIG0(65536, ftbl0OscSIG0);
		deleteOscSIG0(sig0);
		
	}
	
	virtual void instanceInit(int samplingFreq) {
		fSamplingFreq = samplingFreq;
		fhslider0 = FAUSTFLOAT(0.);
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec0[i] = 0.f;
			
		}
		fConst0 = (1.f / float(fmin(192000, fmax(1, fSamplingFreq))));
		fhslider1 = FAUSTFLOAT(220.);
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec2[i] = 0.f;
			
		}
		
	}
	
	virtual void init(int samplingFreq) {
		classInit(samplingFreq);
		instanceInit(samplingFreq);
	}
	
	virtual void buildUserInterface(UI* interface) {
		interface->openVerticalBox("Oscillator");
		interface->declare(&fhslider1, "unit", "Hz");
		interface->addHorizontalSlider("freq", &fhslider1, 220.f, 20.f, 24000.f, 1.f);
		interface->declare(&fhslider0, "unit", "dB");
		interface->addHorizontalSlider("volume", &fhslider0, 0.f, -96.f, 0.f, 0.1f);
		interface->closeBox();
		
	}
	
	virtual void compute(int count, FAUSTFLOAT** inputs, FAUSTFLOAT** outputs) {
		FAUSTFLOAT* output0 = outputs[0];
		float fSlow0 = (0.001f * powf(10.f, (0.05f * float(fhslider0))));
		float fSlow1 = (fConst0 * float(fhslider1));
		for (int i = 0; (i < count); i = (i + 1)) {
			fRec0[0] = ((0.999f * fRec0[1]) + fSlow0);
			float fTemp0 = (fRec2[1] + fSlow1);
			fRec2[0] = (fTemp0 - floorf(fTemp0));
			output0[i] = FAUSTFLOAT((fRec0[0] * ftbl0OscSIG0[int((65536.f * fRec2[0]))]));
			fRec0[1] = fRec0[0];
			fRec2[1] = fRec2[0];
			
		}
		
	}

	
};


#ifdef FAUST_UIMACROS
	#define FAUST_INPUTS 0
	#define FAUST_OUTPUTS 1
	#define FAUST_ACTIVES 0
	#define FAUST_PASSIVES 0
	FAUST_ADDHORIZONTALSLIDER("Oscillator/freq", fhslider1, 2.2e+02f, 2e+01f, 2.4e+04f, 1.0f);
	FAUST_ADDHORIZONTALSLIDER("Oscillator/volume", fhslider0, 0.0f, -96.0f, 0.0f, 0.1f);
#endif

int main(int argc, char *argv[])
{
	Osc DSP;
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
    
    class Osc_wrap : public Osc
    {
    public:
        JSUI *ui;
    };
    
    //constructor
    void *OSC_constructor(int samplingFreq) {
        
        // Make a new osc object
        Osc_wrap* n = new Osc_wrap();
        n->ui = new JSUI();
        // Init it with samplingFreq supplied... should we give a sample size here too?
        n->init(samplingFreq);
        n->buildUserInterface(n->ui);
        n->ui->iter = n->ui->uiMap.begin();

        return n;
    }

    int OSC_getNumParams(Osc_wrap *n)
    {
        return n->ui->uiMap.size();
    }
    
    FAUSTFLOAT* OSC_getNextParam(Osc_wrap *n, char *key)
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
    
    int OSC_compute(Osc_wrap *n, int count, FAUSTFLOAT** inputs, FAUSTFLOAT** outputs) {
        n->compute(count, inputs, outputs);
        return 1;
    }
    
    int OSC_getNumInputs(Osc_wrap *n){
        return n->getNumInputs();
    }
    
    int OSC_getNumOutputs(Osc_wrap *n){
        return n->getNumOutputs();
    }

    void OSC_destructor(Osc_wrap *n) {
        delete n;
    }
}
