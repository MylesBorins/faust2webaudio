//-----------------------------------------------------
//
// Code generated with Faust 2.0.a11 (http://faust.grame.fr)
//-----------------------------------------------------

#ifndef  __ReverbDesigner_H__
#define  __ReverbDesigner_H__
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

float powf(float dummy0, float dummy1);
float logf(float dummy0);
float floorf(float dummy0);
float expf(float dummy0);
float tanf(float dummy0);
#ifndef __faustpower2_f__
#define __faustpower2_f__
float faustpower2_f(float value) {
	return (value * value);
	
}
#endif

#ifndef FAUSTCLASS 
#define FAUSTCLASS ReverbDesigner
#endif

class ReverbDesigner : public dsp {
	
  public:
	
	float fRec15[3];
	float fVec66[8192];
	float fRec14[3];
	float fVec65[8192];
	float fRec13[3];
	float fVec64[8192];
	float fRec12[3];
	float fVec63[8192];
	float fRec11[3];
	float fVec62[8192];
	float fRec10[3];
	float fVec61[8192];
	float fRec9[3];
	float fVec60[8192];
	float fRec8[3];
	float fVec59[8192];
	float fRec7[3];
	float fVec58[8192];
	float fRec6[3];
	float fVec57[8192];
	float fRec5[3];
	float fVec56[8192];
	float fRec4[3];
	float fVec55[8192];
	float fRec3[3];
	float fVec54[8192];
	float fRec2[3];
	float fVec53[8192];
	float fRec1[3];
	float fVec52[8192];
	float fVec51[2];
	float fRec0[3];
	float fVec50[8192];
	float fRec368[3];
	float fRec369[2];
	float fRec364[3];
	float fRec365[2];
	float fVec49[2];
	float fRec366[3];
	float fRec367[2];
	float fRec359[3];
	float fRec360[3];
	float fRec361[2];
	float fVec48[2];
	float fRec362[3];
	float fRec363[2];
	float fRec353[3];
	float fRec354[3];
	float fRec355[3];
	float fRec356[2];
	float fVec47[2];
	float fRec357[3];
	float fRec358[2];
	float fRec348[3];
	float fRec349[3];
	float fRec350[3];
	float fRec351[3];
	float fRec352[2];
	float fRec346[3];
	float fRec347[2];
	float fRec342[3];
	float fRec343[2];
	float fVec46[2];
	float fRec344[3];
	float fRec345[2];
	float fRec337[3];
	float fRec338[3];
	float fRec339[2];
	float fVec45[2];
	float fRec340[3];
	float fRec341[2];
	float fRec331[3];
	float fRec332[3];
	float fRec333[3];
	float fRec334[2];
	float fVec44[2];
	float fRec335[3];
	float fRec336[2];
	float fRec326[3];
	float fRec327[3];
	float fRec328[3];
	float fRec329[3];
	float fRec330[2];
	float fRec324[3];
	float fRec325[2];
	float fRec320[3];
	float fRec321[2];
	float fVec43[2];
	float fRec322[3];
	float fRec323[2];
	float fRec315[3];
	float fRec316[3];
	float fRec317[2];
	float fVec42[2];
	float fRec318[3];
	float fRec319[2];
	float fRec309[3];
	float fRec310[3];
	float fRec311[3];
	float fRec312[2];
	float fVec41[2];
	float fRec313[3];
	float fRec314[2];
	float fRec304[3];
	float fRec305[3];
	float fRec306[3];
	float fRec307[3];
	float fRec308[2];
	float fRec302[3];
	float fRec303[2];
	float fRec298[3];
	float fRec299[2];
	float fVec40[2];
	float fRec300[3];
	float fRec301[2];
	float fRec293[3];
	float fRec294[3];
	float fRec295[2];
	float fVec39[2];
	float fRec296[3];
	float fRec297[2];
	float fRec287[3];
	float fRec288[3];
	float fRec289[3];
	float fRec290[2];
	float fVec38[2];
	float fRec291[3];
	float fRec292[2];
	float fRec282[3];
	float fRec283[3];
	float fRec284[3];
	float fRec285[3];
	float fRec286[2];
	float fRec280[3];
	float fRec281[2];
	float fRec276[3];
	float fRec277[2];
	float fVec37[2];
	float fRec278[3];
	float fRec279[2];
	float fRec271[3];
	float fRec272[3];
	float fRec273[2];
	float fVec36[2];
	float fRec274[3];
	float fRec275[2];
	float fRec265[3];
	float fRec266[3];
	float fRec267[3];
	float fRec268[2];
	float fVec35[2];
	float fRec269[3];
	float fRec270[2];
	float fRec260[3];
	float fRec261[3];
	float fRec262[3];
	float fRec263[3];
	float fRec264[2];
	float fRec258[3];
	float fRec259[2];
	float fRec254[3];
	float fRec255[2];
	float fVec34[2];
	float fRec256[3];
	float fRec257[2];
	float fRec249[3];
	float fRec250[3];
	float fRec251[2];
	float fVec33[2];
	float fRec252[3];
	float fRec253[2];
	float fRec243[3];
	float fRec244[3];
	float fRec245[3];
	float fRec246[2];
	float fVec32[2];
	float fRec247[3];
	float fRec248[2];
	float fRec238[3];
	float fRec239[3];
	float fRec240[3];
	float fRec241[3];
	float fRec242[2];
	float fRec236[3];
	float fRec237[2];
	float fRec232[3];
	float fRec233[2];
	float fVec31[2];
	float fRec234[3];
	float fRec235[2];
	float fRec227[3];
	float fRec228[3];
	float fRec229[2];
	float fVec30[2];
	float fRec230[3];
	float fRec231[2];
	float fRec221[3];
	float fRec222[3];
	float fRec223[3];
	float fRec224[2];
	float fVec29[2];
	float fRec225[3];
	float fRec226[2];
	float fRec216[3];
	float fRec217[3];
	float fRec218[3];
	float fRec219[3];
	float fRec220[2];
	float fRec214[3];
	float fRec215[2];
	float fRec210[3];
	float fRec211[2];
	float fVec28[2];
	float fRec212[3];
	float fRec213[2];
	float fRec205[3];
	float fRec206[3];
	float fRec207[2];
	float fVec27[2];
	float fRec208[3];
	float fRec209[2];
	float fRec199[3];
	float fRec200[3];
	float fRec201[3];
	float fRec202[2];
	float fVec26[2];
	float fRec203[3];
	float fRec204[2];
	float fRec194[3];
	float fRec195[3];
	float fRec196[3];
	float fRec197[3];
	float fRec198[2];
	float fRec192[3];
	float fRec193[2];
	float fRec188[3];
	float fRec189[2];
	float fVec25[2];
	float fRec190[3];
	float fRec191[2];
	float fRec183[3];
	float fRec184[3];
	float fRec185[2];
	float fVec24[2];
	float fRec186[3];
	float fRec187[2];
	float fRec177[3];
	float fRec178[3];
	float fRec179[3];
	float fRec180[2];
	float fVec23[2];
	float fRec181[3];
	float fRec182[2];
	float fRec172[3];
	float fRec173[3];
	float fRec174[3];
	float fRec175[3];
	float fRec176[2];
	float fRec170[3];
	float fRec171[2];
	float fRec166[3];
	float fRec167[2];
	float fVec22[2];
	float fRec168[3];
	float fRec169[2];
	float fRec161[3];
	float fRec162[3];
	float fRec163[2];
	float fVec21[2];
	float fRec164[3];
	float fRec165[2];
	float fRec155[3];
	float fRec156[3];
	float fRec157[3];
	float fRec158[2];
	float fVec20[2];
	float fRec159[3];
	float fRec160[2];
	float fRec150[3];
	float fRec151[3];
	float fRec152[3];
	float fRec153[3];
	float fRec154[2];
	float fRec148[3];
	float fRec149[2];
	float fRec144[3];
	float fRec145[2];
	float fVec19[2];
	float fRec146[3];
	float fRec147[2];
	float fRec139[3];
	float fRec140[3];
	float fRec141[2];
	float fVec18[2];
	float fRec142[3];
	float fRec143[2];
	float fRec133[3];
	float fRec134[3];
	float fRec135[3];
	float fRec136[2];
	float fVec17[2];
	float fRec137[3];
	float fRec138[2];
	float fRec128[3];
	float fRec129[3];
	float fRec130[3];
	float fRec131[3];
	float fRec132[2];
	float fRec126[3];
	float fRec127[2];
	float fRec122[3];
	float fRec123[2];
	float fVec16[2];
	float fRec124[3];
	float fRec125[2];
	float fRec117[3];
	float fRec118[3];
	float fRec119[2];
	float fVec15[2];
	float fRec120[3];
	float fRec121[2];
	float fRec111[3];
	float fRec112[3];
	float fRec113[3];
	float fRec114[2];
	float fVec14[2];
	float fRec115[3];
	float fRec116[2];
	float fRec106[3];
	float fRec107[3];
	float fRec108[3];
	float fRec109[3];
	float fRec110[2];
	float fRec104[3];
	float fRec105[2];
	float fRec100[3];
	float fRec101[2];
	float fVec13[2];
	float fRec102[3];
	float fRec103[2];
	float fRec95[3];
	float fRec96[3];
	float fRec97[2];
	float fVec12[2];
	float fRec98[3];
	float fRec99[2];
	float fRec89[3];
	float fRec90[3];
	float fRec91[3];
	float fRec92[2];
	float fVec11[2];
	float fRec93[3];
	float fRec94[2];
	float fRec84[3];
	float fRec85[3];
	float fRec86[3];
	float fRec87[3];
	float fRec88[2];
	float fRec82[3];
	float fRec83[2];
	float fRec78[3];
	float fRec79[2];
	float fVec10[2];
	float fRec80[3];
	float fRec81[2];
	float fRec73[3];
	float fRec74[3];
	float fRec75[2];
	float fVec9[2];
	float fRec76[3];
	float fRec77[2];
	float fRec67[3];
	float fRec68[3];
	float fRec69[3];
	float fRec70[2];
	float fVec8[2];
	float fRec71[3];
	float fRec72[2];
	float fRec62[3];
	float fRec63[3];
	float fRec64[3];
	float fRec65[3];
	float fRec66[2];
	float fRec60[3];
	float fRec61[2];
	float fRec56[3];
	float fRec57[2];
	float fVec7[2];
	float fRec58[3];
	float fRec59[2];
	float fRec51[3];
	float fRec52[3];
	float fRec53[2];
	float fVec6[2];
	float fRec54[3];
	float fRec55[2];
	float fRec45[3];
	float fRec46[3];
	float fRec47[3];
	float fRec48[2];
	float fVec5[2];
	float fRec49[3];
	float fRec50[2];
	float fRec40[3];
	float fRec41[3];
	float fRec42[3];
	float fRec43[3];
	float fRec44[2];
	float fRec38[3];
	float fRec39[2];
	float fRec34[3];
	float fRec35[2];
	float fVec4[2];
	float fRec36[3];
	float fRec37[2];
	float fRec29[3];
	float fRec30[3];
	float fRec31[2];
	float fVec3[2];
	float fRec32[3];
	float fRec33[2];
	float fRec23[3];
	float fRec24[3];
	float fRec25[3];
	float fRec26[2];
	float fVec2[2];
	float fRec27[3];
	float fRec28[2];
	float fRec18[3];
	float fRec19[3];
	float fRec20[3];
	float fRec21[3];
	float fRec22[2];
	float fVec1[2];
	float fVec0[2];
	float fRec16[4];
	int iRec17[2];
	FAUSTFLOAT fhslider0;
	FAUSTFLOAT fcheckbox0;
	FAUSTFLOAT fbutton0;
	FAUSTFLOAT fbutton1;
	FAUSTFLOAT fcheckbox1;
	FAUSTFLOAT fbutton2;
	int fSamplingFreq;
	int iConst0;
	float fConst1;
	float fConst2;
	FAUSTFLOAT fhslider1;
	FAUSTFLOAT fhslider2;
	FAUSTFLOAT fvslider0;
	float fConst3;
	FAUSTFLOAT fhslider3;
	FAUSTFLOAT fhslider4;
	FAUSTFLOAT fhslider5;
	FAUSTFLOAT fhslider6;
	FAUSTFLOAT fvslider1;
	FAUSTFLOAT fvslider2;
	FAUSTFLOAT fvslider3;
	FAUSTFLOAT fvslider4;
	int IOTA;
	FAUSTFLOAT fbutton3;
	
  public:
	
	void static metadata(Meta* m) { 
		m->declare("effect.lib/author", "Julius O. Smith (jos at ccrma.stanford.edu)");
		m->declare("effect.lib/copyright", "Julius O. Smith III");
		m->declare("effect.lib/exciter_author", "Priyanka Shekar (pshekar@ccrma.stanford.edu)");
		m->declare("effect.lib/exciter_copyright", "Copyright (c) 2013 Priyanka Shekar");
		m->declare("effect.lib/exciter_license", "MIT License (MIT)");
		m->declare("effect.lib/exciter_name", "Harmonic Exciter");
		m->declare("effect.lib/exciter_version", "1.0");
		m->declare("effect.lib/license", "STK-4.3");
		m->declare("effect.lib/name", "Faust Audio Effect Library");
		m->declare("effect.lib/version", "1.33");
		m->declare("filter.lib/author", "Julius O. Smith (jos at ccrma.stanford.edu)");
		m->declare("filter.lib/copyright", "Julius O. Smith III");
		m->declare("filter.lib/license", "STK-4.3");
		m->declare("filter.lib/name", "Faust Filter Library");
		m->declare("filter.lib/reference", "https://ccrma.stanford.edu/~jos/filters/");
		m->declare("filter.lib/version", "1.29");
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
		m->declare("oscillator.lib/author", "Julius O. Smith (jos at ccrma.stanford.edu)");
		m->declare("oscillator.lib/copyright", "Julius O. Smith III");
		m->declare("oscillator.lib/license", "STK-4.3");
		m->declare("oscillator.lib/name", "Faust Oscillator Library");
		m->declare("oscillator.lib/version", "1.11");
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
		fhslider0 = FAUSTFLOAT(-40.);
		fcheckbox0 = FAUSTFLOAT(0.);
		for (int i = 0; (i < 2); i = (i + 1)) {
			iRec17[i] = 0;
			
		}
		for (int i = 0; (i < 4); i = (i + 1)) {
			fRec16[i] = 0.f;
			
		}
		fbutton0 = FAUSTFLOAT(0.);
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec0[i] = 0.f;
			
		}
		fbutton1 = FAUSTFLOAT(0.);
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec1[i] = 0.f;
			
		}
		fcheckbox1 = FAUSTFLOAT(0.);
		fbutton2 = FAUSTFLOAT(0.);
		iConst0 = fmin(192000, fmax(1, fSamplingFreq));
		fConst1 = (1.f / float(iConst0));
		fConst2 = (0.00291545f * float(iConst0));
		fhslider1 = FAUSTFLOAT(46.);
		fhslider2 = FAUSTFLOAT(63.);
		fvslider0 = FAUSTFLOAT(2.7);
		fConst3 = (3.14159f / float(iConst0));
		fhslider3 = FAUSTFLOAT(4000.);
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec22[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec21[i] = 0.f;
			
		}
		fhslider4 = FAUSTFLOAT(2000.);
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec20[i] = 0.f;
			
		}
		fhslider5 = FAUSTFLOAT(1000.);
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec19[i] = 0.f;
			
		}
		fhslider6 = FAUSTFLOAT(500.);
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec18[i] = 0.f;
			
		}
		fvslider1 = FAUSTFLOAT(3.8);
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec28[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec27[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec2[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec26[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec25[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec24[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec23[i] = 0.f;
			
		}
		fvslider2 = FAUSTFLOAT(5.);
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec33[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec32[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec3[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec31[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec30[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec29[i] = 0.f;
			
		}
		fvslider3 = FAUSTFLOAT(8.4);
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec37[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec36[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec4[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec35[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec34[i] = 0.f;
			
		}
		fvslider4 = FAUSTFLOAT(6.5);
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec39[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec38[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec44[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec43[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec42[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec41[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec40[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec50[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec49[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec5[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec48[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec47[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec46[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec45[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec55[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec54[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec6[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec53[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec52[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec51[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec59[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec58[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec7[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec57[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec56[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec61[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec60[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec66[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec65[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec64[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec63[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec62[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec72[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec71[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec8[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec70[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec69[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec68[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec67[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec77[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec76[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec9[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec75[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec74[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec73[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec81[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec80[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec10[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec79[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec78[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec83[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec82[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec88[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec87[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec86[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec85[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec84[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec94[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec93[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec11[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec92[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec91[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec90[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec89[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec99[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec98[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec12[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec97[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec96[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec95[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec103[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec102[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec13[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec101[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec100[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec105[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec104[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec110[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec109[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec108[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec107[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec106[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec116[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec115[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec14[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec114[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec113[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec112[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec111[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec121[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec120[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec15[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec119[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec118[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec117[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec125[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec124[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec16[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec123[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec122[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec127[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec126[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec132[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec131[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec130[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec129[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec128[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec138[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec137[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec17[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec136[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec135[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec134[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec133[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec143[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec142[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec18[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec141[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec140[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec139[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec147[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec146[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec19[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec145[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec144[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec149[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec148[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec154[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec153[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec152[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec151[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec150[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec160[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec159[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec20[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec158[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec157[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec156[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec155[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec165[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec164[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec21[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec163[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec162[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec161[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec169[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec168[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec22[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec167[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec166[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec171[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec170[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec176[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec175[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec174[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec173[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec172[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec182[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec181[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec23[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec180[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec179[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec178[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec177[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec187[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec186[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec24[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec185[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec184[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec183[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec191[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec190[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec25[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec189[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec188[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec193[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec192[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec198[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec197[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec196[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec195[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec194[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec204[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec203[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec26[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec202[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec201[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec200[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec199[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec209[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec208[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec27[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec207[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec206[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec205[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec213[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec212[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec28[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec211[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec210[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec215[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec214[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec220[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec219[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec218[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec217[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec216[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec226[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec225[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec29[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec224[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec223[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec222[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec221[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec231[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec230[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec30[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec229[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec228[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec227[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec235[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec234[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec31[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec233[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec232[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec237[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec236[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec242[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec241[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec240[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec239[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec238[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec248[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec247[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec32[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec246[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec245[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec244[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec243[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec253[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec252[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec33[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec251[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec250[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec249[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec257[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec256[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec34[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec255[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec254[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec259[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec258[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec264[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec263[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec262[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec261[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec260[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec270[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec269[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec35[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec268[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec267[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec266[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec265[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec275[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec274[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec36[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec273[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec272[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec271[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec279[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec278[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec37[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec277[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec276[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec281[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec280[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec286[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec285[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec284[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec283[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec282[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec292[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec291[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec38[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec290[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec289[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec288[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec287[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec297[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec296[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec39[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec295[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec294[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec293[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec301[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec300[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec40[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec299[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec298[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec303[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec302[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec308[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec307[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec306[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec305[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec304[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec314[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec313[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec41[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec312[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec311[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec310[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec309[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec319[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec318[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec42[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec317[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec316[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec315[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec323[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec322[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec43[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec321[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec320[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec325[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec324[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec330[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec329[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec328[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec327[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec326[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec336[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec335[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec44[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec334[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec333[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec332[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec331[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec341[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec340[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec45[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec339[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec338[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec337[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec345[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec344[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec46[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec343[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec342[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec347[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec346[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec352[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec351[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec350[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec349[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec348[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec358[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec357[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec47[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec356[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec355[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec354[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec353[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec363[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec362[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec48[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec361[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec360[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec359[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec367[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec366[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec49[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec365[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec364[i] = 0.f;
			
		}
		for (int i = 0; (i < 2); i = (i + 1)) {
			fRec369[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec368[i] = 0.f;
			
		}
		IOTA = 0;
		for (int i = 0; (i < 8192); i = (i + 1)) {
			fVec50[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec0[i] = 0.f;
			
		}
		fbutton3 = FAUSTFLOAT(0.);
		for (int i = 0; (i < 2); i = (i + 1)) {
			fVec51[i] = 0.f;
			
		}
		for (int i = 0; (i < 8192); i = (i + 1)) {
			fVec52[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec1[i] = 0.f;
			
		}
		for (int i = 0; (i < 8192); i = (i + 1)) {
			fVec53[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec2[i] = 0.f;
			
		}
		for (int i = 0; (i < 8192); i = (i + 1)) {
			fVec54[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec3[i] = 0.f;
			
		}
		for (int i = 0; (i < 8192); i = (i + 1)) {
			fVec55[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec4[i] = 0.f;
			
		}
		for (int i = 0; (i < 8192); i = (i + 1)) {
			fVec56[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec5[i] = 0.f;
			
		}
		for (int i = 0; (i < 8192); i = (i + 1)) {
			fVec57[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec6[i] = 0.f;
			
		}
		for (int i = 0; (i < 8192); i = (i + 1)) {
			fVec58[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec7[i] = 0.f;
			
		}
		for (int i = 0; (i < 8192); i = (i + 1)) {
			fVec59[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec8[i] = 0.f;
			
		}
		for (int i = 0; (i < 8192); i = (i + 1)) {
			fVec60[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec9[i] = 0.f;
			
		}
		for (int i = 0; (i < 8192); i = (i + 1)) {
			fVec61[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec10[i] = 0.f;
			
		}
		for (int i = 0; (i < 8192); i = (i + 1)) {
			fVec62[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec11[i] = 0.f;
			
		}
		for (int i = 0; (i < 8192); i = (i + 1)) {
			fVec63[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec12[i] = 0.f;
			
		}
		for (int i = 0; (i < 8192); i = (i + 1)) {
			fVec64[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec13[i] = 0.f;
			
		}
		for (int i = 0; (i < 8192); i = (i + 1)) {
			fVec65[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec14[i] = 0.f;
			
		}
		for (int i = 0; (i < 8192); i = (i + 1)) {
			fVec66[i] = 0.f;
			
		}
		for (int i = 0; (i < 3); i = (i + 1)) {
			fRec15[i] = 0.f;
			
		}
		
	}
	
	virtual void init(int samplingFreq) {
		classInit(samplingFreq);
		instanceInit(samplingFreq);
	}
	
	virtual void buildUserInterface(UI* interface) {
		interface->openVerticalBox("reverbDesigner");
		interface->declare(0, "tooltip", "See Faust's effect.lib for documentation and references");
		interface->openVerticalBox("FEEDBACK DELAY NETWORK (FDN) REVERBERATOR, ORDER 16");
		interface->declare(0, "1", "");
		interface->openVerticalBox("Band Crossover Frequencies");
		interface->declare(&fhslider6, "0", "");
		interface->declare(&fhslider6, "tooltip", "Each delay-line signal is split into frequency-bands for separate decay-time control in each band");
		interface->declare(&fhslider6, "unit", "Hz");
		interface->addHorizontalSlider("Band 0 upper edge in Hz", &fhslider6, 500.f, 100.f, 10000.f, 1.f);
		interface->declare(&fhslider5, "1", "");
		interface->declare(&fhslider5, "tooltip", "Each delay-line signal is split into frequency-bands for separate decay-time control in each band");
		interface->declare(&fhslider5, "unit", "Hz");
		interface->addHorizontalSlider("Band 1 upper edge in Hz", &fhslider5, 1000.f, 100.f, 10000.f, 1.f);
		interface->declare(&fhslider4, "2", "");
		interface->declare(&fhslider4, "tooltip", "Each delay-line signal is split into frequency-bands for separate decay-time control in each band");
		interface->declare(&fhslider4, "unit", "Hz");
		interface->addHorizontalSlider("Band 2 upper edge in Hz", &fhslider4, 2000.f, 100.f, 10000.f, 1.f);
		interface->declare(&fhslider3, "3", "");
		interface->declare(&fhslider3, "tooltip", "Each delay-line signal is split into frequency-bands for separate decay-time control in each band");
		interface->declare(&fhslider3, "unit", "Hz");
		interface->addHorizontalSlider("Band 3 upper edge in Hz", &fhslider3, 4000.f, 100.f, 10000.f, 1.f);
		interface->closeBox();
		interface->declare(0, "2", "");
		interface->openHorizontalBox("Band Decay Times (T60)");
		interface->declare(&fvslider3, "0", "");
		interface->declare(&fvslider3, "tooltip", "T60 is the 60dB decay-time in seconds. For concert halls, an overall reverberation time (T60) near 1.9 seconds is typical [Beranek 2004]. Here we may set T60 independently in each frequency band.  In real rooms, higher frequency bands generally decay faster due to absorption and scattering.");
		interface->declare(&fvslider3, "unit", "s");
		interface->addVerticalSlider("0", &fvslider3, 8.4f, 0.1f, 10.f, 0.1f);
		interface->declare(&fvslider4, "1", "");
		interface->declare(&fvslider4, "tooltip", "T60 is the 60dB decay-time in seconds. For concert halls, an overall reverberation time (T60) near 1.9 seconds is typical [Beranek 2004]. Here we may set T60 independently in each frequency band.  In real rooms, higher frequency bands generally decay faster due to absorption and scattering.");
		interface->declare(&fvslider4, "unit", "s");
		interface->addVerticalSlider("1", &fvslider4, 6.5f, 0.1f, 10.f, 0.1f);
		interface->declare(&fvslider2, "2", "");
		interface->declare(&fvslider2, "tooltip", "T60 is the 60dB decay-time in seconds. For concert halls, an overall reverberation time (T60) near 1.9 seconds is typical [Beranek 2004]. Here we may set T60 independently in each frequency band.  In real rooms, higher frequency bands generally decay faster due to absorption and scattering.");
		interface->declare(&fvslider2, "unit", "s");
		interface->addVerticalSlider("2", &fvslider2, 5.f, 0.1f, 10.f, 0.1f);
		interface->declare(&fvslider1, "3", "");
		interface->declare(&fvslider1, "tooltip", "T60 is the 60dB decay-time in seconds. For concert halls, an overall reverberation time (T60) near 1.9 seconds is typical [Beranek 2004]. Here we may set T60 independently in each frequency band.  In real rooms, higher frequency bands generally decay faster due to absorption and scattering.");
		interface->declare(&fvslider1, "unit", "s");
		interface->addVerticalSlider("3", &fvslider1, 3.8f, 0.1f, 10.f, 0.1f);
		interface->declare(&fvslider0, "4", "");
		interface->declare(&fvslider0, "tooltip", "T60 is the 60dB decay-time in seconds. For concert halls, an overall reverberation time (T60) near 1.9 seconds is typical [Beranek 2004]. Here we may set T60 independently in each frequency band.  In real rooms, higher frequency bands generally decay faster due to absorption and scattering.");
		interface->declare(&fvslider0, "unit", "s");
		interface->addVerticalSlider("4", &fvslider0, 2.7f, 0.1f, 10.f, 0.1f);
		interface->closeBox();
		interface->declare(0, "3", "");
		interface->openVerticalBox("Room Dimensions");
		interface->declare(&fhslider1, "1", "");
		interface->declare(&fhslider1, "tooltip", "This length (in meters) deterfmines the shortest delay-line used in the FDN reverberator.     	      Think of it as the shortest wall-to-wall separation in the room.");
		interface->declare(&fhslider1, "unit", "m");
		interface->addHorizontalSlider("fmin acoustic ray length", &fhslider1, 46.f, 0.1f, 63.f, 0.1f);
		interface->declare(&fhslider2, "2", "");
		interface->declare(&fhslider2, "tooltip", "This length (in meters) deterfmines the longest delay-line used in the FDN reverberator.     	      Think of it as the largest wall-to-wall separation in the room.");
		interface->declare(&fhslider2, "unit", "m");
		interface->addHorizontalSlider("fmax acoustic ray length", &fhslider2, 63.f, 0.1f, 63.f, 0.1f);
		interface->closeBox();
		interface->declare(0, "4", "");
		interface->openHorizontalBox("Input Controls");
		interface->declare(0, "1", "");
		interface->openVerticalBox("Input Config");
		interface->declare(&fcheckbox1, "1", "");
		interface->declare(&fcheckbox1, "tooltip", "When this is checked, the stereo external audio inputs are disabled (good for hearing the impulse response or pink-noise response alone)");
		interface->addCheckButton("Mute Ext Inputs",&fcheckbox1);
		interface->declare(&fcheckbox0, "2", "");
		interface->declare(&fcheckbox0, "tooltip", "Pink Noise (or 1/f noise) is Constant-Q Noise (useful for adjusting the EQ sections)");
		interface->addCheckButton("Pink Noise",&fcheckbox0);
		interface->closeBox();
		interface->declare(0, "2", "");
		interface->openHorizontalBox("Impulse Selection");
		interface->declare(&fbutton1, "1", "");
		interface->declare(&fbutton1, "tooltip", "Send impulse into LEFT channel");
		interface->addButton("Left",&fbutton1);
		interface->declare(&fbutton0, "2", "");
		interface->declare(&fbutton0, "tooltip", "Send impulse into LEFT and RIGHT channels");
		interface->addButton("Center",&fbutton0);
		interface->declare(&fbutton3, "3", "");
		interface->declare(&fbutton3, "tooltip", "Send impulse into RIGHT channel");
		interface->addButton("Right",&fbutton3);
		interface->closeBox();
		interface->declare(0, "3", "");
		interface->openVerticalBox("Reverb State");
		interface->declare(&fbutton2, "1", "");
		interface->declare(&fbutton2, "tooltip", "Hold down 'Quench' to clear the reverberator");
		interface->addButton("Quench",&fbutton2);
		interface->closeBox();
		interface->closeBox();
		interface->closeBox();
		interface->declare(&fhslider0, "3", "");
		interface->declare(&fhslider0, "tooltip", "Output scale factor");
		interface->declare(&fhslider0, "unit", "dB");
		interface->addHorizontalSlider("Output Level (dB)", &fhslider0, -40.f, -70.f, 20.f, 0.1f);
		interface->closeBox();
		
	}
	
	virtual void compute(int count, FAUSTFLOAT** inputs, FAUSTFLOAT** outputs) {
		FAUSTFLOAT* input0 = inputs[0];
		FAUSTFLOAT* input1 = inputs[1];
		FAUSTFLOAT* output0 = outputs[0];
		FAUSTFLOAT* output1 = outputs[1];
		float fSlow0 = powf(10.f, (0.05f * float(fhslider0)));
		float fSlow1 = (0.1f * float(fcheckbox0));
		float fSlow2 = float(fbutton0);
		float fSlow3 = float(fbutton1);
		float fSlow4 = (1.f - float(fcheckbox1));
		float fSlow5 = (1.f - (0.5f * float(fbutton2)));
		float fSlow6 = (0.25f * fSlow5);
		float fSlow7 = float(fhslider1);
		float fSlow8 = (float(fhslider2) / fSlow7);
		float fSlow9 = powf(2.f, floorf((0.5f + (1.4427f * logf((fConst2 * (fSlow7 * powf(fSlow8, 0.f))))))));
		float fSlow10 = (0.f - (6.90776f * fSlow9));
		float fSlow11 = float(fvslider0);
		float fSlow12 = expf((fConst1 * (fSlow10 / fSlow11)));
		float fSlow13 = tanf((fConst3 * float(fhslider3)));
		float fSlow14 = (1.f / fSlow13);
		float fSlow15 = (1.f + ((fSlow14 + 1.f) / fSlow13));
		float fSlow16 = (1.f / fSlow15);
		float fSlow17 = (1.f / faustpower2_f(fSlow13));
		float fSlow18 = (1.f + fSlow14);
		float fSlow19 = (0.f - ((1.f - fSlow14) / fSlow18));
		float fSlow20 = (1.f / fSlow18);
		float fSlow21 = (0.f - fSlow14);
		float fSlow22 = (1.f + ((fSlow14 - 1.f) / fSlow13));
		float fSlow23 = (2.f * (1.f - fSlow17));
		float fSlow24 = (2.f * (0.f - fSlow17));
		float fSlow25 = tanf((fConst3 * float(fhslider4)));
		float fSlow26 = (1.f / fSlow25);
		float fSlow27 = (1.f / (1.f + ((1.f + fSlow26) / fSlow25)));
		float fSlow28 = (1.f + ((fSlow26 - 1.f) / fSlow25));
		float fSlow29 = (1.f / faustpower2_f(fSlow25));
		float fSlow30 = (2.f * (1.f - fSlow29));
		float fSlow31 = tanf((fConst3 * float(fhslider5)));
		float fSlow32 = (1.f / fSlow31);
		float fSlow33 = (1.f / (1.f + ((1.f + fSlow32) / fSlow31)));
		float fSlow34 = (1.f + ((fSlow32 - 1.f) / fSlow31));
		float fSlow35 = (1.f / faustpower2_f(fSlow31));
		float fSlow36 = (2.f * (1.f - fSlow35));
		float fSlow37 = tanf((fConst3 * float(fhslider6)));
		float fSlow38 = (1.f / fSlow37);
		float fSlow39 = (1.f / (1.f + ((1.f + fSlow38) / fSlow37)));
		float fSlow40 = (1.f + ((fSlow38 - 1.f) / fSlow37));
		float fSlow41 = (1.f / faustpower2_f(fSlow37));
		float fSlow42 = (2.f * (1.f - fSlow41));
		float fSlow43 = float(fvslider1);
		float fSlow44 = expf((fConst1 * (fSlow10 / fSlow43)));
		float fSlow45 = (1.f + ((1.f + fSlow26) / fSlow25));
		float fSlow46 = (1.f / fSlow45);
		float fSlow47 = (1.f + fSlow26);
		float fSlow48 = (0.f - ((1.f - fSlow26) / fSlow47));
		float fSlow49 = (1.f / fSlow47);
		float fSlow50 = (1.f / (fSlow15 * fSlow25));
		float fSlow51 = (0.f - fSlow26);
		float fSlow52 = (1.f + ((fSlow26 - 1.f) / fSlow25));
		float fSlow53 = (2.f * (0.f - fSlow29));
		float fSlow54 = float(fvslider2);
		float fSlow55 = expf((fConst1 * (fSlow10 / fSlow54)));
		float fSlow56 = (1.f + ((1.f + fSlow32) / fSlow31));
		float fSlow57 = (1.f / fSlow56);
		float fSlow58 = (1.f + fSlow32);
		float fSlow59 = (0.f - ((1.f - fSlow32) / fSlow58));
		float fSlow60 = (1.f / fSlow58);
		float fSlow61 = (1.f / (fSlow45 * fSlow31));
		float fSlow62 = (0.f - fSlow32);
		float fSlow63 = (1.f + ((fSlow32 - 1.f) / fSlow31));
		float fSlow64 = (2.f * (0.f - fSlow35));
		float fSlow65 = (1.f / (1.f + ((1.f + fSlow38) / fSlow37)));
		float fSlow66 = float(fvslider3);
		float fSlow67 = expf((fConst1 * (fSlow10 / fSlow66)));
		float fSlow68 = (1.f + fSlow38);
		float fSlow69 = (0.f - ((1.f - fSlow38) / fSlow68));
		float fSlow70 = (1.f / fSlow68);
		float fSlow71 = (1.f + ((fSlow38 - 1.f) / fSlow37));
		float fSlow72 = float(fvslider4);
		float fSlow73 = expf((fConst1 * (fSlow10 / fSlow72)));
		float fSlow74 = (1.f / (fSlow56 * fSlow37));
		float fSlow75 = (0.f - fSlow38);
		float fSlow76 = (2.f * (0.f - fSlow41));
		float fSlow77 = powf(23.f, floorf((0.5f + (0.318929f * logf((fConst2 * (fSlow7 * powf(fSlow8, 0.533333f))))))));
		float fSlow78 = (0.f - (6.90776f * fSlow77));
		float fSlow79 = expf((fConst1 * (fSlow78 / fSlow11)));
		float fSlow80 = expf((fConst1 * (fSlow78 / fSlow43)));
		float fSlow81 = expf((fConst1 * (fSlow78 / fSlow54)));
		float fSlow82 = expf((fConst1 * (fSlow78 / fSlow66)));
		float fSlow83 = expf((fConst1 * (fSlow78 / fSlow72)));
		float fSlow84 = powf(11.f, floorf((0.5f + (0.417032f * logf((fConst2 * (fSlow7 * powf(fSlow8, 0.266667f))))))));
		float fSlow85 = (0.f - (6.90776f * fSlow84));
		float fSlow86 = expf((fConst1 * (fSlow85 / fSlow11)));
		float fSlow87 = expf((fConst1 * (fSlow85 / fSlow43)));
		float fSlow88 = expf((fConst1 * (fSlow85 / fSlow54)));
		float fSlow89 = expf((fConst1 * (fSlow85 / fSlow66)));
		float fSlow90 = expf((fConst1 * (fSlow85 / fSlow72)));
		float fSlow91 = powf(41.f, floorf((0.5f + (0.269283f * logf((fConst2 * (fSlow7 * powf(fSlow8, 0.8f))))))));
		float fSlow92 = (0.f - (6.90776f * fSlow91));
		float fSlow93 = expf((fConst1 * (fSlow92 / fSlow11)));
		float fSlow94 = expf((fConst1 * (fSlow92 / fSlow43)));
		float fSlow95 = expf((fConst1 * (fSlow92 / fSlow54)));
		float fSlow96 = expf((fConst1 * (fSlow92 / fSlow66)));
		float fSlow97 = expf((fConst1 * (fSlow92 / fSlow72)));
		float fSlow98 = powf(5.f, floorf((0.5f + (0.621335f * logf((fConst2 * (fSlow7 * powf(fSlow8, 0.133333f))))))));
		float fSlow99 = (0.f - (6.90776f * fSlow98));
		float fSlow100 = expf((fConst1 * (fSlow99 / fSlow11)));
		float fSlow101 = expf((fConst1 * (fSlow99 / fSlow43)));
		float fSlow102 = expf((fConst1 * (fSlow99 / fSlow54)));
		float fSlow103 = expf((fConst1 * (fSlow99 / fSlow66)));
		float fSlow104 = expf((fConst1 * (fSlow99 / fSlow72)));
		float fSlow105 = powf(31.f, floorf((0.5f + (0.291207f * logf((fConst2 * (fSlow7 * powf(fSlow8, 0.666667f))))))));
		float fSlow106 = (0.f - (6.90776f * fSlow105));
		float fSlow107 = expf((fConst1 * (fSlow106 / fSlow11)));
		float fSlow108 = expf((fConst1 * (fSlow106 / fSlow43)));
		float fSlow109 = expf((fConst1 * (fSlow106 / fSlow54)));
		float fSlow110 = expf((fConst1 * (fSlow106 / fSlow66)));
		float fSlow111 = expf((fConst1 * (fSlow106 / fSlow72)));
		float fSlow112 = powf(17.f, floorf((0.5f + (0.352956f * logf((fConst2 * (fSlow7 * powf(fSlow8, 0.4f))))))));
		float fSlow113 = (0.f - (6.90776f * fSlow112));
		float fSlow114 = expf((fConst1 * (fSlow113 / fSlow11)));
		float fSlow115 = expf((fConst1 * (fSlow113 / fSlow43)));
		float fSlow116 = expf((fConst1 * (fSlow113 / fSlow54)));
		float fSlow117 = expf((fConst1 * (fSlow113 / fSlow66)));
		float fSlow118 = expf((fConst1 * (fSlow113 / fSlow72)));
		float fSlow119 = powf(47.f, floorf((0.5f + (0.25973f * logf((fConst2 * (fSlow7 * powf(fSlow8, 0.933333f))))))));
		float fSlow120 = (0.f - (6.90776f * fSlow119));
		float fSlow121 = expf((fConst1 * (fSlow120 / fSlow11)));
		float fSlow122 = expf((fConst1 * (fSlow120 / fSlow43)));
		float fSlow123 = expf((fConst1 * (fSlow120 / fSlow54)));
		float fSlow124 = expf((fConst1 * (fSlow120 / fSlow66)));
		float fSlow125 = expf((fConst1 * (fSlow120 / fSlow72)));
		float fSlow126 = powf(3.f, floorf((0.5f + (0.910239f * logf((fConst2 * (fSlow7 * powf(fSlow8, 0.0666667f))))))));
		float fSlow127 = (0.f - (6.90776f * fSlow126));
		float fSlow128 = expf((fConst1 * (fSlow127 / fSlow11)));
		float fSlow129 = expf((fConst1 * (fSlow127 / fSlow43)));
		float fSlow130 = expf((fConst1 * (fSlow127 / fSlow54)));
		float fSlow131 = expf((fConst1 * (fSlow127 / fSlow66)));
		float fSlow132 = expf((fConst1 * (fSlow127 / fSlow72)));
		float fSlow133 = powf(29.f, floorf((0.5f + (0.296974f * logf((fConst2 * (fSlow7 * powf(fSlow8, 0.6f))))))));
		float fSlow134 = (0.f - (6.90776f * fSlow133));
		float fSlow135 = expf((fConst1 * (fSlow134 / fSlow11)));
		float fSlow136 = expf((fConst1 * (fSlow134 / fSlow43)));
		float fSlow137 = expf((fConst1 * (fSlow134 / fSlow54)));
		float fSlow138 = expf((fConst1 * (fSlow134 / fSlow66)));
		float fSlow139 = expf((fConst1 * (fSlow134 / fSlow72)));
		float fSlow140 = powf(13.f, floorf((0.5f + (0.389871f * logf((fConst2 * (fSlow7 * powf(fSlow8, 0.333333f))))))));
		float fSlow141 = (0.f - (6.90776f * fSlow140));
		float fSlow142 = expf((fConst1 * (fSlow141 / fSlow11)));
		float fSlow143 = expf((fConst1 * (fSlow141 / fSlow43)));
		float fSlow144 = expf((fConst1 * (fSlow141 / fSlow54)));
		float fSlow145 = expf((fConst1 * (fSlow141 / fSlow66)));
		float fSlow146 = expf((fConst1 * (fSlow141 / fSlow72)));
		float fSlow147 = powf(43.f, floorf((0.5f + (0.265873f * logf((fConst2 * (fSlow7 * powf(fSlow8, 0.866667f))))))));
		float fSlow148 = (0.f - (6.90776f * fSlow147));
		float fSlow149 = expf((fConst1 * (fSlow148 / fSlow11)));
		float fSlow150 = expf((fConst1 * (fSlow148 / fSlow43)));
		float fSlow151 = expf((fConst1 * (fSlow148 / fSlow54)));
		float fSlow152 = expf((fConst1 * (fSlow148 / fSlow66)));
		float fSlow153 = expf((fConst1 * (fSlow148 / fSlow72)));
		float fSlow154 = powf(7.f, floorf((0.5f + (0.513898f * logf((fConst2 * (fSlow7 * powf(fSlow8, 0.2f))))))));
		float fSlow155 = (0.f - (6.90776f * fSlow154));
		float fSlow156 = expf((fConst1 * (fSlow155 / fSlow11)));
		float fSlow157 = expf((fConst1 * (fSlow155 / fSlow43)));
		float fSlow158 = expf((fConst1 * (fSlow155 / fSlow54)));
		float fSlow159 = expf((fConst1 * (fSlow155 / fSlow66)));
		float fSlow160 = expf((fConst1 * (fSlow155 / fSlow72)));
		float fSlow161 = powf(37.f, floorf((0.5f + (0.276938f * logf((fConst2 * (fSlow7 * powf(fSlow8, 0.733333f))))))));
		float fSlow162 = (0.f - (6.90776f * fSlow161));
		float fSlow163 = expf((fConst1 * (fSlow162 / fSlow11)));
		float fSlow164 = expf((fConst1 * (fSlow162 / fSlow43)));
		float fSlow165 = expf((fConst1 * (fSlow162 / fSlow54)));
		float fSlow166 = expf((fConst1 * (fSlow162 / fSlow66)));
		float fSlow167 = expf((fConst1 * (fSlow162 / fSlow72)));
		float fSlow168 = powf(19.f, floorf((0.5f + (0.339623f * logf((fConst2 * (fSlow7 * powf(fSlow8, 0.466667f))))))));
		float fSlow169 = (0.f - (6.90776f * fSlow168));
		float fSlow170 = expf((fConst1 * (fSlow169 / fSlow11)));
		float fSlow171 = expf((fConst1 * (fSlow169 / fSlow43)));
		float fSlow172 = expf((fConst1 * (fSlow169 / fSlow54)));
		float fSlow173 = expf((fConst1 * (fSlow169 / fSlow66)));
		float fSlow174 = expf((fConst1 * (fSlow169 / fSlow72)));
		float fSlow175 = powf(53.f, floorf((0.5f + (0.251871f * logf((fConst2 * (fSlow7 * powf(fSlow8, 1.f))))))));
		float fSlow176 = (0.f - (6.90776f * fSlow175));
		float fSlow177 = expf((fConst1 * (fSlow176 / fSlow11)));
		float fSlow178 = expf((fConst1 * (fSlow176 / fSlow43)));
		float fSlow179 = expf((fConst1 * (fSlow176 / fSlow54)));
		float fSlow180 = expf((fConst1 * (fSlow176 / fSlow66)));
		float fSlow181 = expf((fConst1 * (fSlow176 / fSlow72)));
		int iSlow182 = int((int((fSlow9 - 1.f)) & 8191));
		float fSlow183 = float(fbutton3);
		int iSlow184 = int((int((fSlow126 - 1.f)) & 8191));
		int iSlow185 = int((int((fSlow98 - 1.f)) & 8191));
		int iSlow186 = int((int((fSlow154 - 1.f)) & 8191));
		int iSlow187 = int((int((fSlow84 - 1.f)) & 8191));
		int iSlow188 = int((int((fSlow140 - 1.f)) & 8191));
		int iSlow189 = int((int((fSlow112 - 1.f)) & 8191));
		int iSlow190 = int((int((fSlow168 - 1.f)) & 8191));
		int iSlow191 = int((int((fSlow77 - 1.f)) & 8191));
		int iSlow192 = int((int((fSlow133 - 1.f)) & 8191));
		int iSlow193 = int((int((fSlow105 - 1.f)) & 8191));
		int iSlow194 = int((int((fSlow161 - 1.f)) & 8191));
		int iSlow195 = int((int((fSlow91 - 1.f)) & 8191));
		int iSlow196 = int((int((fSlow147 - 1.f)) & 8191));
		int iSlow197 = int((int((fSlow119 - 1.f)) & 8191));
		int iSlow198 = int((int((fSlow175 - 1.f)) & 8191));
		for (int i = 0; (i < count); i = (i + 1)) {
			iRec17[0] = (12345 + (1103515245 * iRec17[1]));
			fRec16[0] = (((0.522189f * fRec16[3]) + ((4.65661e-10f * float(iRec17[0])) + (2.49496f * fRec16[1]))) - (2.01727f * fRec16[2]));
			float fTemp0 = (fSlow1 * (((0.049922f * fRec16[0]) + (0.0506127f * fRec16[2])) - ((0.0959935f * fRec16[1]) + (0.00440879f * fRec16[3]))));
			fVec0[0] = fSlow2;
			int iTemp1 = int(((fSlow2 - fVec0[1]) > 0.f));
			fVec1[0] = fSlow3;
			int iTemp2 = int(((fSlow3 - fVec1[1]) > 0.f));
			float fTemp3 = (fSlow4 * float(input0[i]));
			fRec22[0] = ((fSlow19 * fRec22[1]) + (fSlow20 * ((fSlow14 * fRec0[1]) + (fSlow21 * fRec0[2]))));
			fRec21[0] = (fRec22[0] - (fSlow16 * ((fSlow22 * fRec21[2]) + (fSlow23 * fRec21[1]))));
			float fTemp4 = (fSlow30 * fRec20[1]);
			fRec20[0] = ((fSlow16 * (((fSlow17 * fRec21[0]) + (fSlow24 * fRec21[1])) + (fSlow17 * fRec21[2]))) - (fSlow27 * ((fSlow28 * fRec20[2]) + fTemp4)));
			float fTemp5 = (fSlow36 * fRec19[1]);
			fRec19[0] = ((fRec20[2] + (fSlow27 * (fTemp4 + (fSlow28 * fRec20[0])))) - (fSlow33 * ((fSlow34 * fRec19[2]) + fTemp5)));
			float fTemp6 = (fSlow42 * fRec18[1]);
			fRec18[0] = ((fRec19[2] + (fSlow33 * (fTemp5 + (fSlow34 * fRec19[0])))) - (fSlow39 * ((fSlow40 * fRec18[2]) + fTemp6)));
			fRec28[0] = ((fSlow19 * fRec28[1]) + (fSlow20 * (fRec0[1] + fRec0[2])));
			fRec27[0] = (fRec28[0] - (fSlow16 * ((fSlow22 * fRec27[2]) + (fSlow23 * fRec27[1]))));
			float fTemp7 = (fRec27[2] + (fRec27[0] + (2.f * fRec27[1])));
			float fTemp8 = (fSlow16 * fTemp7);
			fVec2[0] = fTemp8;
			fRec26[0] = ((fSlow48 * fRec26[1]) + (fSlow49 * ((fSlow50 * fTemp7) + (fSlow51 * fVec2[1]))));
			fRec25[0] = (fRec26[0] - (fSlow46 * ((fSlow30 * fRec25[1]) + (fSlow52 * fRec25[2]))));
			float fTemp9 = (fSlow36 * fRec24[1]);
			fRec24[0] = ((fSlow46 * (((fSlow29 * fRec25[0]) + (fSlow53 * fRec25[1])) + (fSlow29 * fRec25[2]))) - (fSlow33 * ((fSlow34 * fRec24[2]) + fTemp9)));
			float fTemp10 = (fSlow42 * fRec23[1]);
			fRec23[0] = ((fRec24[2] + (fSlow33 * (fTemp9 + (fSlow34 * fRec24[0])))) - (fSlow39 * ((fSlow40 * fRec23[2]) + fTemp10)));
			fRec33[0] = ((fSlow48 * fRec33[1]) + (fSlow49 * (fTemp8 + fVec2[1])));
			fRec32[0] = (fRec33[0] - (fSlow46 * ((fSlow52 * fRec32[2]) + (fSlow30 * fRec32[1]))));
			float fTemp11 = (fRec32[2] + (fRec32[0] + (2.f * fRec32[1])));
			float fTemp12 = (fSlow46 * fTemp11);
			fVec3[0] = fTemp12;
			fRec31[0] = ((fSlow59 * fRec31[1]) + (fSlow60 * ((fSlow61 * fTemp11) + (fSlow62 * fVec3[1]))));
			fRec30[0] = (fRec31[0] - (fSlow57 * ((fSlow36 * fRec30[1]) + (fSlow63 * fRec30[2]))));
			float fTemp13 = (fSlow42 * fRec29[1]);
			fRec29[0] = ((fSlow57 * (((fSlow35 * fRec30[0]) + (fSlow64 * fRec30[1])) + (fSlow35 * fRec30[2]))) - (fSlow39 * ((fSlow40 * fRec29[2]) + fTemp13)));
			fRec37[0] = ((fSlow59 * fRec37[1]) + (fSlow60 * (fTemp12 + fVec3[1])));
			fRec36[0] = (fRec37[0] - (fSlow57 * ((fSlow63 * fRec36[2]) + (fSlow36 * fRec36[1]))));
			float fTemp14 = (fRec36[2] + (fRec36[0] + (2.f * fRec36[1])));
			float fTemp15 = (fSlow57 * fTemp14);
			fVec4[0] = fTemp15;
			fRec35[0] = ((fSlow69 * fRec35[1]) + (fSlow70 * (fTemp15 + fVec4[1])));
			fRec34[0] = (fRec35[0] - (fSlow65 * ((fSlow71 * fRec34[2]) + (fSlow42 * fRec34[1]))));
			fRec39[0] = ((fSlow69 * fRec39[1]) + (fSlow70 * ((fSlow74 * fTemp14) + (fSlow75 * fVec4[1]))));
			fRec38[0] = (fRec39[0] - (fSlow65 * ((fSlow42 * fRec38[1]) + (fSlow71 * fRec38[2]))));
			float fTemp16 = ((((fSlow12 * (fRec18[2] + (fSlow39 * (fTemp6 + (fSlow40 * fRec18[0]))))) + (fSlow44 * (fRec23[2] + (fSlow39 * (fTemp10 + (fSlow40 * fRec23[0])))))) + (fSlow55 * (fRec29[2] + (fSlow39 * (fTemp13 + (fSlow40 * fRec29[0])))))) + (fSlow65 * ((fSlow67 * (fRec34[2] + (fRec34[0] + (2.f * fRec34[1])))) + (fSlow73 * (((fSlow41 * fRec38[0]) + (fSlow76 * fRec38[1])) + (fSlow41 * fRec38[2]))))));
			fRec44[0] = ((fSlow19 * fRec44[1]) + (fSlow20 * ((fSlow14 * fRec8[1]) + (fSlow21 * fRec8[2]))));
			fRec43[0] = (fRec44[0] - (fSlow16 * ((fSlow22 * fRec43[2]) + (fSlow23 * fRec43[1]))));
			float fTemp17 = (fSlow30 * fRec42[1]);
			fRec42[0] = ((fSlow16 * (((fSlow17 * fRec43[0]) + (fSlow24 * fRec43[1])) + (fSlow17 * fRec43[2]))) - (fSlow27 * ((fSlow28 * fRec42[2]) + fTemp17)));
			float fTemp18 = (fSlow36 * fRec41[1]);
			fRec41[0] = ((fRec42[2] + (fSlow27 * (fTemp17 + (fSlow28 * fRec42[0])))) - (fSlow33 * ((fSlow34 * fRec41[2]) + fTemp18)));
			float fTemp19 = (fSlow42 * fRec40[1]);
			fRec40[0] = ((fRec41[2] + (fSlow33 * (fTemp18 + (fSlow34 * fRec41[0])))) - (fSlow39 * ((fSlow40 * fRec40[2]) + fTemp19)));
			fRec50[0] = ((fSlow19 * fRec50[1]) + (fSlow20 * (fRec8[1] + fRec8[2])));
			fRec49[0] = (fRec50[0] - (fSlow16 * ((fSlow22 * fRec49[2]) + (fSlow23 * fRec49[1]))));
			float fTemp20 = (fRec49[2] + (fRec49[0] + (2.f * fRec49[1])));
			float fTemp21 = (fSlow16 * fTemp20);
			fVec5[0] = fTemp21;
			fRec48[0] = ((fSlow48 * fRec48[1]) + (fSlow49 * ((fSlow51 * fVec5[1]) + (fSlow50 * fTemp20))));
			fRec47[0] = (fRec48[0] - (fSlow46 * ((fSlow52 * fRec47[2]) + (fSlow30 * fRec47[1]))));
			float fTemp22 = (fSlow36 * fRec46[1]);
			fRec46[0] = ((fSlow46 * (((fSlow29 * fRec47[0]) + (fSlow53 * fRec47[1])) + (fSlow29 * fRec47[2]))) - (fSlow33 * ((fSlow34 * fRec46[2]) + fTemp22)));
			float fTemp23 = (fSlow42 * fRec45[1]);
			fRec45[0] = ((fRec46[2] + (fSlow33 * (fTemp22 + (fSlow34 * fRec46[0])))) - (fSlow39 * ((fSlow40 * fRec45[2]) + fTemp23)));
			fRec55[0] = ((fSlow48 * fRec55[1]) + (fSlow49 * (fVec5[1] + fTemp21)));
			fRec54[0] = (fRec55[0] - (fSlow46 * ((fSlow52 * fRec54[2]) + (fSlow30 * fRec54[1]))));
			float fTemp24 = (fRec54[2] + (fRec54[0] + (2.f * fRec54[1])));
			float fTemp25 = (fSlow46 * fTemp24);
			fVec6[0] = fTemp25;
			fRec53[0] = ((fSlow59 * fRec53[1]) + (fSlow60 * ((fSlow62 * fVec6[1]) + (fSlow61 * fTemp24))));
			fRec52[0] = (fRec53[0] - (fSlow57 * ((fSlow63 * fRec52[2]) + (fSlow36 * fRec52[1]))));
			float fTemp26 = (fSlow42 * fRec51[1]);
			fRec51[0] = ((fSlow57 * (((fSlow35 * fRec52[0]) + (fSlow64 * fRec52[1])) + (fSlow35 * fRec52[2]))) - (fSlow39 * ((fSlow40 * fRec51[2]) + fTemp26)));
			fRec59[0] = ((fSlow59 * fRec59[1]) + (fSlow60 * (fVec6[1] + fTemp25)));
			fRec58[0] = (fRec59[0] - (fSlow57 * ((fSlow63 * fRec58[2]) + (fSlow36 * fRec58[1]))));
			float fTemp27 = (fRec58[2] + (fRec58[0] + (2.f * fRec58[1])));
			float fTemp28 = (fSlow57 * fTemp27);
			fVec7[0] = fTemp28;
			fRec57[0] = ((fSlow69 * fRec57[1]) + (fSlow70 * (fVec7[1] + fTemp28)));
			fRec56[0] = (fRec57[0] - (fSlow65 * ((fSlow71 * fRec56[2]) + (fSlow42 * fRec56[1]))));
			fRec61[0] = ((fSlow69 * fRec61[1]) + (fSlow70 * ((fSlow75 * fVec7[1]) + (fSlow74 * fTemp27))));
			fRec60[0] = (fRec61[0] - (fSlow65 * ((fSlow71 * fRec60[2]) + (fSlow42 * fRec60[1]))));
			float fTemp29 = ((((fSlow79 * (fRec40[2] + (fSlow39 * (fTemp19 + (fSlow40 * fRec40[0]))))) + (fSlow80 * (fRec45[2] + (fSlow39 * (fTemp23 + (fSlow40 * fRec45[0])))))) + (fSlow81 * (fRec51[2] + (fSlow39 * (fTemp26 + (fSlow40 * fRec51[0])))))) + (fSlow65 * ((fSlow82 * (fRec56[2] + (fRec56[0] + (2.f * fRec56[1])))) + (fSlow83 * (((fSlow41 * fRec60[0]) + (fSlow76 * fRec60[1])) + (fSlow41 * fRec60[2]))))));
			float fTemp30 = (fTemp16 + fTemp29);
			fRec66[0] = ((fSlow19 * fRec66[1]) + (fSlow20 * ((fSlow14 * fRec4[1]) + (fSlow21 * fRec4[2]))));
			fRec65[0] = (fRec66[0] - (fSlow16 * ((fSlow22 * fRec65[2]) + (fSlow23 * fRec65[1]))));
			float fTemp31 = (fSlow30 * fRec64[1]);
			fRec64[0] = ((fSlow16 * (((fSlow17 * fRec65[0]) + (fSlow24 * fRec65[1])) + (fSlow17 * fRec65[2]))) - (fSlow27 * ((fSlow28 * fRec64[2]) + fTemp31)));
			float fTemp32 = (fSlow36 * fRec63[1]);
			fRec63[0] = ((fRec64[2] + (fSlow27 * (fTemp31 + (fSlow28 * fRec64[0])))) - (fSlow33 * ((fSlow34 * fRec63[2]) + fTemp32)));
			float fTemp33 = (fSlow42 * fRec62[1]);
			fRec62[0] = ((fRec63[2] + (fSlow33 * (fTemp32 + (fSlow34 * fRec63[0])))) - (fSlow39 * ((fSlow40 * fRec62[2]) + fTemp33)));
			fRec72[0] = ((fSlow19 * fRec72[1]) + (fSlow20 * (fRec4[1] + fRec4[2])));
			fRec71[0] = (fRec72[0] - (fSlow16 * ((fSlow22 * fRec71[2]) + (fSlow23 * fRec71[1]))));
			float fTemp34 = (fRec71[2] + (fRec71[0] + (2.f * fRec71[1])));
			float fTemp35 = (fSlow16 * fTemp34);
			fVec8[0] = fTemp35;
			fRec70[0] = ((fSlow48 * fRec70[1]) + (fSlow49 * ((fSlow51 * fVec8[1]) + (fSlow50 * fTemp34))));
			fRec69[0] = (fRec70[0] - (fSlow46 * ((fSlow52 * fRec69[2]) + (fSlow30 * fRec69[1]))));
			float fTemp36 = (fSlow36 * fRec68[1]);
			fRec68[0] = ((fSlow46 * (((fSlow29 * fRec69[0]) + (fSlow53 * fRec69[1])) + (fSlow29 * fRec69[2]))) - (fSlow33 * ((fSlow34 * fRec68[2]) + fTemp36)));
			float fTemp37 = (fSlow42 * fRec67[1]);
			fRec67[0] = ((fRec68[2] + (fSlow33 * (fTemp36 + (fSlow34 * fRec68[0])))) - (fSlow39 * ((fSlow40 * fRec67[2]) + fTemp37)));
			fRec77[0] = ((fSlow48 * fRec77[1]) + (fSlow49 * (fVec8[1] + fTemp35)));
			fRec76[0] = (fRec77[0] - (fSlow46 * ((fSlow52 * fRec76[2]) + (fSlow30 * fRec76[1]))));
			float fTemp38 = (fRec76[2] + (fRec76[0] + (2.f * fRec76[1])));
			float fTemp39 = (fSlow46 * fTemp38);
			fVec9[0] = fTemp39;
			fRec75[0] = ((fSlow59 * fRec75[1]) + (fSlow60 * ((fSlow62 * fVec9[1]) + (fSlow61 * fTemp38))));
			fRec74[0] = (fRec75[0] - (fSlow57 * ((fSlow63 * fRec74[2]) + (fSlow36 * fRec74[1]))));
			float fTemp40 = (fSlow42 * fRec73[1]);
			fRec73[0] = ((fSlow57 * (((fSlow35 * fRec74[0]) + (fSlow64 * fRec74[1])) + (fSlow35 * fRec74[2]))) - (fSlow39 * ((fSlow40 * fRec73[2]) + fTemp40)));
			fRec81[0] = ((fSlow59 * fRec81[1]) + (fSlow60 * (fVec9[1] + fTemp39)));
			fRec80[0] = (fRec81[0] - (fSlow57 * ((fSlow63 * fRec80[2]) + (fSlow36 * fRec80[1]))));
			float fTemp41 = (fRec80[2] + (fRec80[0] + (2.f * fRec80[1])));
			float fTemp42 = (fSlow57 * fTemp41);
			fVec10[0] = fTemp42;
			fRec79[0] = ((fSlow69 * fRec79[1]) + (fSlow70 * (fVec10[1] + fTemp42)));
			fRec78[0] = (fRec79[0] - (fSlow65 * ((fSlow71 * fRec78[2]) + (fSlow42 * fRec78[1]))));
			fRec83[0] = ((fSlow69 * fRec83[1]) + (fSlow70 * ((fSlow75 * fVec10[1]) + (fSlow74 * fTemp41))));
			fRec82[0] = (fRec83[0] - (fSlow65 * ((fSlow71 * fRec82[2]) + (fSlow42 * fRec82[1]))));
			float fTemp43 = ((((fSlow86 * (fRec62[2] + (fSlow39 * (fTemp33 + (fSlow40 * fRec62[0]))))) + (fSlow87 * (fRec67[2] + (fSlow39 * (fTemp37 + (fSlow40 * fRec67[0])))))) + (fSlow88 * (fRec73[2] + (fSlow39 * (fTemp40 + (fSlow40 * fRec73[0])))))) + (fSlow65 * ((fSlow89 * (fRec78[2] + (fRec78[0] + (2.f * fRec78[1])))) + (fSlow90 * (((fSlow41 * fRec82[0]) + (fSlow76 * fRec82[1])) + (fSlow41 * fRec82[2]))))));
			fRec88[0] = ((fSlow19 * fRec88[1]) + (fSlow20 * ((fSlow14 * fRec12[1]) + (fSlow21 * fRec12[2]))));
			fRec87[0] = (fRec88[0] - (fSlow16 * ((fSlow22 * fRec87[2]) + (fSlow23 * fRec87[1]))));
			float fTemp44 = (fSlow30 * fRec86[1]);
			fRec86[0] = ((fSlow16 * (((fSlow17 * fRec87[0]) + (fSlow24 * fRec87[1])) + (fSlow17 * fRec87[2]))) - (fSlow27 * ((fSlow28 * fRec86[2]) + fTemp44)));
			float fTemp45 = (fSlow36 * fRec85[1]);
			fRec85[0] = ((fRec86[2] + (fSlow27 * (fTemp44 + (fSlow28 * fRec86[0])))) - (fSlow33 * ((fSlow34 * fRec85[2]) + fTemp45)));
			float fTemp46 = (fSlow42 * fRec84[1]);
			fRec84[0] = ((fRec85[2] + (fSlow33 * (fTemp45 + (fSlow34 * fRec85[0])))) - (fSlow39 * ((fSlow40 * fRec84[2]) + fTemp46)));
			fRec94[0] = ((fSlow19 * fRec94[1]) + (fSlow20 * (fRec12[1] + fRec12[2])));
			fRec93[0] = (fRec94[0] - (fSlow16 * ((fSlow22 * fRec93[2]) + (fSlow23 * fRec93[1]))));
			float fTemp47 = (fRec93[2] + (fRec93[0] + (2.f * fRec93[1])));
			float fTemp48 = (fSlow16 * fTemp47);
			fVec11[0] = fTemp48;
			fRec92[0] = ((fSlow48 * fRec92[1]) + (fSlow49 * ((fSlow51 * fVec11[1]) + (fSlow50 * fTemp47))));
			fRec91[0] = (fRec92[0] - (fSlow46 * ((fSlow52 * fRec91[2]) + (fSlow30 * fRec91[1]))));
			float fTemp49 = (fSlow36 * fRec90[1]);
			fRec90[0] = ((fSlow46 * (((fSlow29 * fRec91[0]) + (fSlow53 * fRec91[1])) + (fSlow29 * fRec91[2]))) - (fSlow33 * ((fSlow34 * fRec90[2]) + fTemp49)));
			float fTemp50 = (fSlow42 * fRec89[1]);
			fRec89[0] = ((fRec90[2] + (fSlow33 * (fTemp49 + (fSlow34 * fRec90[0])))) - (fSlow39 * ((fSlow40 * fRec89[2]) + fTemp50)));
			fRec99[0] = ((fSlow48 * fRec99[1]) + (fSlow49 * (fVec11[1] + fTemp48)));
			fRec98[0] = (fRec99[0] - (fSlow46 * ((fSlow52 * fRec98[2]) + (fSlow30 * fRec98[1]))));
			float fTemp51 = (fRec98[2] + (fRec98[0] + (2.f * fRec98[1])));
			float fTemp52 = (fSlow46 * fTemp51);
			fVec12[0] = fTemp52;
			fRec97[0] = ((fSlow59 * fRec97[1]) + (fSlow60 * ((fSlow62 * fVec12[1]) + (fSlow61 * fTemp51))));
			fRec96[0] = (fRec97[0] - (fSlow57 * ((fSlow63 * fRec96[2]) + (fSlow36 * fRec96[1]))));
			float fTemp53 = (fSlow42 * fRec95[1]);
			fRec95[0] = ((fSlow57 * (((fSlow35 * fRec96[0]) + (fSlow64 * fRec96[1])) + (fSlow35 * fRec96[2]))) - (fSlow39 * ((fSlow40 * fRec95[2]) + fTemp53)));
			fRec103[0] = ((fSlow59 * fRec103[1]) + (fSlow60 * (fVec12[1] + fTemp52)));
			fRec102[0] = (fRec103[0] - (fSlow57 * ((fSlow63 * fRec102[2]) + (fSlow36 * fRec102[1]))));
			float fTemp54 = (fRec102[2] + (fRec102[0] + (2.f * fRec102[1])));
			float fTemp55 = (fSlow57 * fTemp54);
			fVec13[0] = fTemp55;
			fRec101[0] = ((fSlow69 * fRec101[1]) + (fSlow70 * (fVec13[1] + fTemp55)));
			fRec100[0] = (fRec101[0] - (fSlow65 * ((fSlow71 * fRec100[2]) + (fSlow42 * fRec100[1]))));
			fRec105[0] = ((fSlow69 * fRec105[1]) + (fSlow70 * ((fSlow75 * fVec13[1]) + (fSlow74 * fTemp54))));
			fRec104[0] = (fRec105[0] - (fSlow65 * ((fSlow71 * fRec104[2]) + (fSlow42 * fRec104[1]))));
			float fTemp56 = ((((fSlow93 * (fRec84[2] + (fSlow39 * (fTemp46 + (fSlow40 * fRec84[0]))))) + (fSlow94 * (fRec89[2] + (fSlow39 * (fTemp50 + (fSlow40 * fRec89[0])))))) + (fSlow95 * (fRec95[2] + (fSlow39 * (fTemp53 + (fSlow40 * fRec95[0])))))) + (fSlow65 * ((fSlow96 * (fRec100[2] + (fRec100[0] + (2.f * fRec100[1])))) + (fSlow97 * (((fSlow41 * fRec104[0]) + (fSlow76 * fRec104[1])) + (fSlow41 * fRec104[2]))))));
			float fTemp57 = (fTemp43 + fTemp56);
			float fTemp58 = (fTemp30 + fTemp57);
			fRec110[0] = ((fSlow19 * fRec110[1]) + (fSlow20 * ((fSlow14 * fRec2[1]) + (fSlow21 * fRec2[2]))));
			fRec109[0] = (fRec110[0] - (fSlow16 * ((fSlow22 * fRec109[2]) + (fSlow23 * fRec109[1]))));
			float fTemp59 = (fSlow30 * fRec108[1]);
			fRec108[0] = ((fSlow16 * (((fSlow17 * fRec109[0]) + (fSlow24 * fRec109[1])) + (fSlow17 * fRec109[2]))) - (fSlow27 * ((fSlow28 * fRec108[2]) + fTemp59)));
			float fTemp60 = (fSlow36 * fRec107[1]);
			fRec107[0] = ((fRec108[2] + (fSlow27 * (fTemp59 + (fSlow28 * fRec108[0])))) - (fSlow33 * ((fSlow34 * fRec107[2]) + fTemp60)));
			float fTemp61 = (fSlow42 * fRec106[1]);
			fRec106[0] = ((fRec107[2] + (fSlow33 * (fTemp60 + (fSlow34 * fRec107[0])))) - (fSlow39 * ((fSlow40 * fRec106[2]) + fTemp61)));
			fRec116[0] = ((fSlow19 * fRec116[1]) + (fSlow20 * (fRec2[1] + fRec2[2])));
			fRec115[0] = (fRec116[0] - (fSlow16 * ((fSlow22 * fRec115[2]) + (fSlow23 * fRec115[1]))));
			float fTemp62 = (fRec115[2] + (fRec115[0] + (2.f * fRec115[1])));
			float fTemp63 = (fSlow16 * fTemp62);
			fVec14[0] = fTemp63;
			fRec114[0] = ((fSlow48 * fRec114[1]) + (fSlow49 * ((fSlow51 * fVec14[1]) + (fSlow50 * fTemp62))));
			fRec113[0] = (fRec114[0] - (fSlow46 * ((fSlow52 * fRec113[2]) + (fSlow30 * fRec113[1]))));
			float fTemp64 = (fSlow36 * fRec112[1]);
			fRec112[0] = ((fSlow46 * (((fSlow29 * fRec113[0]) + (fSlow53 * fRec113[1])) + (fSlow29 * fRec113[2]))) - (fSlow33 * ((fSlow34 * fRec112[2]) + fTemp64)));
			float fTemp65 = (fSlow42 * fRec111[1]);
			fRec111[0] = ((fRec112[2] + (fSlow33 * (fTemp64 + (fSlow34 * fRec112[0])))) - (fSlow39 * ((fSlow40 * fRec111[2]) + fTemp65)));
			fRec121[0] = ((fSlow48 * fRec121[1]) + (fSlow49 * (fVec14[1] + fTemp63)));
			fRec120[0] = (fRec121[0] - (fSlow46 * ((fSlow52 * fRec120[2]) + (fSlow30 * fRec120[1]))));
			float fTemp66 = (fRec120[2] + (fRec120[0] + (2.f * fRec120[1])));
			float fTemp67 = (fSlow46 * fTemp66);
			fVec15[0] = fTemp67;
			fRec119[0] = ((fSlow59 * fRec119[1]) + (fSlow60 * ((fSlow62 * fVec15[1]) + (fSlow61 * fTemp66))));
			fRec118[0] = (fRec119[0] - (fSlow57 * ((fSlow63 * fRec118[2]) + (fSlow36 * fRec118[1]))));
			float fTemp68 = (fSlow42 * fRec117[1]);
			fRec117[0] = ((fSlow57 * (((fSlow35 * fRec118[0]) + (fSlow64 * fRec118[1])) + (fSlow35 * fRec118[2]))) - (fSlow39 * ((fSlow40 * fRec117[2]) + fTemp68)));
			fRec125[0] = ((fSlow59 * fRec125[1]) + (fSlow60 * (fVec15[1] + fTemp67)));
			fRec124[0] = (fRec125[0] - (fSlow57 * ((fSlow63 * fRec124[2]) + (fSlow36 * fRec124[1]))));
			float fTemp69 = (fRec124[2] + (fRec124[0] + (2.f * fRec124[1])));
			float fTemp70 = (fSlow57 * fTemp69);
			fVec16[0] = fTemp70;
			fRec123[0] = ((fSlow69 * fRec123[1]) + (fSlow70 * (fVec16[1] + fTemp70)));
			fRec122[0] = (fRec123[0] - (fSlow65 * ((fSlow71 * fRec122[2]) + (fSlow42 * fRec122[1]))));
			fRec127[0] = ((fSlow69 * fRec127[1]) + (fSlow70 * ((fSlow75 * fVec16[1]) + (fSlow74 * fTemp69))));
			fRec126[0] = (fRec127[0] - (fSlow65 * ((fSlow71 * fRec126[2]) + (fSlow42 * fRec126[1]))));
			float fTemp71 = ((((fSlow100 * (fRec106[2] + (fSlow39 * (fTemp61 + (fSlow40 * fRec106[0]))))) + (fSlow101 * (fRec111[2] + (fSlow39 * (fTemp65 + (fSlow40 * fRec111[0])))))) + (fSlow102 * (fRec117[2] + (fSlow39 * (fTemp68 + (fSlow40 * fRec117[0])))))) + (fSlow65 * ((fSlow103 * (fRec122[2] + (fRec122[0] + (2.f * fRec122[1])))) + (fSlow104 * (((fSlow41 * fRec126[0]) + (fSlow76 * fRec126[1])) + (fSlow41 * fRec126[2]))))));
			fRec132[0] = ((fSlow19 * fRec132[1]) + (fSlow20 * ((fSlow14 * fRec10[1]) + (fSlow21 * fRec10[2]))));
			fRec131[0] = (fRec132[0] - (fSlow16 * ((fSlow22 * fRec131[2]) + (fSlow23 * fRec131[1]))));
			float fTemp72 = (fSlow30 * fRec130[1]);
			fRec130[0] = ((fSlow16 * (((fSlow17 * fRec131[0]) + (fSlow24 * fRec131[1])) + (fSlow17 * fRec131[2]))) - (fSlow27 * ((fSlow28 * fRec130[2]) + fTemp72)));
			float fTemp73 = (fSlow36 * fRec129[1]);
			fRec129[0] = ((fRec130[2] + (fSlow27 * (fTemp72 + (fSlow28 * fRec130[0])))) - (fSlow33 * ((fSlow34 * fRec129[2]) + fTemp73)));
			float fTemp74 = (fSlow42 * fRec128[1]);
			fRec128[0] = ((fRec129[2] + (fSlow33 * (fTemp73 + (fSlow34 * fRec129[0])))) - (fSlow39 * ((fSlow40 * fRec128[2]) + fTemp74)));
			fRec138[0] = ((fSlow19 * fRec138[1]) + (fSlow20 * (fRec10[1] + fRec10[2])));
			fRec137[0] = (fRec138[0] - (fSlow16 * ((fSlow22 * fRec137[2]) + (fSlow23 * fRec137[1]))));
			float fTemp75 = (fRec137[2] + (fRec137[0] + (2.f * fRec137[1])));
			float fTemp76 = (fSlow16 * fTemp75);
			fVec17[0] = fTemp76;
			fRec136[0] = ((fSlow48 * fRec136[1]) + (fSlow49 * ((fSlow51 * fVec17[1]) + (fSlow50 * fTemp75))));
			fRec135[0] = (fRec136[0] - (fSlow46 * ((fSlow52 * fRec135[2]) + (fSlow30 * fRec135[1]))));
			float fTemp77 = (fSlow36 * fRec134[1]);
			fRec134[0] = ((fSlow46 * (((fSlow29 * fRec135[0]) + (fSlow53 * fRec135[1])) + (fSlow29 * fRec135[2]))) - (fSlow33 * ((fSlow34 * fRec134[2]) + fTemp77)));
			float fTemp78 = (fSlow42 * fRec133[1]);
			fRec133[0] = ((fRec134[2] + (fSlow33 * (fTemp77 + (fSlow34 * fRec134[0])))) - (fSlow39 * ((fSlow40 * fRec133[2]) + fTemp78)));
			fRec143[0] = ((fSlow48 * fRec143[1]) + (fSlow49 * (fVec17[1] + fTemp76)));
			fRec142[0] = (fRec143[0] - (fSlow46 * ((fSlow52 * fRec142[2]) + (fSlow30 * fRec142[1]))));
			float fTemp79 = (fRec142[2] + (fRec142[0] + (2.f * fRec142[1])));
			float fTemp80 = (fSlow46 * fTemp79);
			fVec18[0] = fTemp80;
			fRec141[0] = ((fSlow59 * fRec141[1]) + (fSlow60 * ((fSlow62 * fVec18[1]) + (fSlow61 * fTemp79))));
			fRec140[0] = (fRec141[0] - (fSlow57 * ((fSlow63 * fRec140[2]) + (fSlow36 * fRec140[1]))));
			float fTemp81 = (fSlow42 * fRec139[1]);
			fRec139[0] = ((fSlow57 * (((fSlow35 * fRec140[0]) + (fSlow64 * fRec140[1])) + (fSlow35 * fRec140[2]))) - (fSlow39 * ((fSlow40 * fRec139[2]) + fTemp81)));
			fRec147[0] = ((fSlow59 * fRec147[1]) + (fSlow60 * (fVec18[1] + fTemp80)));
			fRec146[0] = (fRec147[0] - (fSlow57 * ((fSlow63 * fRec146[2]) + (fSlow36 * fRec146[1]))));
			float fTemp82 = (fRec146[2] + (fRec146[0] + (2.f * fRec146[1])));
			float fTemp83 = (fSlow57 * fTemp82);
			fVec19[0] = fTemp83;
			fRec145[0] = ((fSlow69 * fRec145[1]) + (fSlow70 * (fVec19[1] + fTemp83)));
			fRec144[0] = (fRec145[0] - (fSlow65 * ((fSlow71 * fRec144[2]) + (fSlow42 * fRec144[1]))));
			fRec149[0] = ((fSlow69 * fRec149[1]) + (fSlow70 * ((fSlow75 * fVec19[1]) + (fSlow74 * fTemp82))));
			fRec148[0] = (fRec149[0] - (fSlow65 * ((fSlow71 * fRec148[2]) + (fSlow42 * fRec148[1]))));
			float fTemp84 = ((((fSlow107 * (fRec128[2] + (fSlow39 * (fTemp74 + (fSlow40 * fRec128[0]))))) + (fSlow108 * (fRec133[2] + (fSlow39 * (fTemp78 + (fSlow40 * fRec133[0])))))) + (fSlow109 * (fRec139[2] + (fSlow39 * (fTemp81 + (fSlow40 * fRec139[0])))))) + (fSlow65 * ((fSlow110 * (fRec144[2] + (fRec144[0] + (2.f * fRec144[1])))) + (fSlow111 * (((fSlow41 * fRec148[0]) + (fSlow76 * fRec148[1])) + (fSlow41 * fRec148[2]))))));
			float fTemp85 = (fTemp71 + fTemp84);
			fRec154[0] = ((fSlow19 * fRec154[1]) + (fSlow20 * ((fSlow14 * fRec6[1]) + (fSlow21 * fRec6[2]))));
			fRec153[0] = (fRec154[0] - (fSlow16 * ((fSlow22 * fRec153[2]) + (fSlow23 * fRec153[1]))));
			float fTemp86 = (fSlow30 * fRec152[1]);
			fRec152[0] = ((fSlow16 * (((fSlow17 * fRec153[0]) + (fSlow24 * fRec153[1])) + (fSlow17 * fRec153[2]))) - (fSlow27 * ((fSlow28 * fRec152[2]) + fTemp86)));
			float fTemp87 = (fSlow36 * fRec151[1]);
			fRec151[0] = ((fRec152[2] + (fSlow27 * (fTemp86 + (fSlow28 * fRec152[0])))) - (fSlow33 * ((fSlow34 * fRec151[2]) + fTemp87)));
			float fTemp88 = (fSlow42 * fRec150[1]);
			fRec150[0] = ((fRec151[2] + (fSlow33 * (fTemp87 + (fSlow34 * fRec151[0])))) - (fSlow39 * ((fSlow40 * fRec150[2]) + fTemp88)));
			fRec160[0] = ((fSlow19 * fRec160[1]) + (fSlow20 * (fRec6[1] + fRec6[2])));
			fRec159[0] = (fRec160[0] - (fSlow16 * ((fSlow22 * fRec159[2]) + (fSlow23 * fRec159[1]))));
			float fTemp89 = (fRec159[2] + (fRec159[0] + (2.f * fRec159[1])));
			float fTemp90 = (fSlow16 * fTemp89);
			fVec20[0] = fTemp90;
			fRec158[0] = ((fSlow48 * fRec158[1]) + (fSlow49 * ((fSlow51 * fVec20[1]) + (fSlow50 * fTemp89))));
			fRec157[0] = (fRec158[0] - (fSlow46 * ((fSlow52 * fRec157[2]) + (fSlow30 * fRec157[1]))));
			float fTemp91 = (fSlow36 * fRec156[1]);
			fRec156[0] = ((fSlow46 * (((fSlow29 * fRec157[0]) + (fSlow53 * fRec157[1])) + (fSlow29 * fRec157[2]))) - (fSlow33 * ((fSlow34 * fRec156[2]) + fTemp91)));
			float fTemp92 = (fSlow42 * fRec155[1]);
			fRec155[0] = ((fRec156[2] + (fSlow33 * (fTemp91 + (fSlow34 * fRec156[0])))) - (fSlow39 * ((fSlow40 * fRec155[2]) + fTemp92)));
			fRec165[0] = ((fSlow48 * fRec165[1]) + (fSlow49 * (fVec20[1] + fTemp90)));
			fRec164[0] = (fRec165[0] - (fSlow46 * ((fSlow52 * fRec164[2]) + (fSlow30 * fRec164[1]))));
			float fTemp93 = (fRec164[2] + (fRec164[0] + (2.f * fRec164[1])));
			float fTemp94 = (fSlow46 * fTemp93);
			fVec21[0] = fTemp94;
			fRec163[0] = ((fSlow59 * fRec163[1]) + (fSlow60 * ((fSlow62 * fVec21[1]) + (fSlow61 * fTemp93))));
			fRec162[0] = (fRec163[0] - (fSlow57 * ((fSlow63 * fRec162[2]) + (fSlow36 * fRec162[1]))));
			float fTemp95 = (fSlow42 * fRec161[1]);
			fRec161[0] = ((fSlow57 * (((fSlow35 * fRec162[0]) + (fSlow64 * fRec162[1])) + (fSlow35 * fRec162[2]))) - (fSlow39 * ((fSlow40 * fRec161[2]) + fTemp95)));
			fRec169[0] = ((fSlow59 * fRec169[1]) + (fSlow60 * (fVec21[1] + fTemp94)));
			fRec168[0] = (fRec169[0] - (fSlow57 * ((fSlow63 * fRec168[2]) + (fSlow36 * fRec168[1]))));
			float fTemp96 = (fRec168[2] + (fRec168[0] + (2.f * fRec168[1])));
			float fTemp97 = (fSlow57 * fTemp96);
			fVec22[0] = fTemp97;
			fRec167[0] = ((fSlow69 * fRec167[1]) + (fSlow70 * (fVec22[1] + fTemp97)));
			fRec166[0] = (fRec167[0] - (fSlow65 * ((fSlow71 * fRec166[2]) + (fSlow42 * fRec166[1]))));
			fRec171[0] = ((fSlow69 * fRec171[1]) + (fSlow70 * ((fSlow75 * fVec22[1]) + (fSlow74 * fTemp96))));
			fRec170[0] = (fRec171[0] - (fSlow65 * ((fSlow71 * fRec170[2]) + (fSlow42 * fRec170[1]))));
			float fTemp98 = ((((fSlow114 * (fRec150[2] + (fSlow39 * (fTemp88 + (fSlow40 * fRec150[0]))))) + (fSlow115 * (fRec155[2] + (fSlow39 * (fTemp92 + (fSlow40 * fRec155[0])))))) + (fSlow116 * (fRec161[2] + (fSlow39 * (fTemp95 + (fSlow40 * fRec161[0])))))) + (fSlow65 * ((fSlow117 * (fRec166[2] + (fRec166[0] + (2.f * fRec166[1])))) + (fSlow118 * (((fSlow41 * fRec170[0]) + (fSlow76 * fRec170[1])) + (fSlow41 * fRec170[2]))))));
			fRec176[0] = ((fSlow19 * fRec176[1]) + (fSlow20 * ((fSlow14 * fRec14[1]) + (fSlow21 * fRec14[2]))));
			fRec175[0] = (fRec176[0] - (fSlow16 * ((fSlow22 * fRec175[2]) + (fSlow23 * fRec175[1]))));
			float fTemp99 = (fSlow30 * fRec174[1]);
			fRec174[0] = ((fSlow16 * (((fSlow17 * fRec175[0]) + (fSlow24 * fRec175[1])) + (fSlow17 * fRec175[2]))) - (fSlow27 * ((fSlow28 * fRec174[2]) + fTemp99)));
			float fTemp100 = (fSlow36 * fRec173[1]);
			fRec173[0] = ((fRec174[2] + (fSlow27 * (fTemp99 + (fSlow28 * fRec174[0])))) - (fSlow33 * ((fSlow34 * fRec173[2]) + fTemp100)));
			float fTemp101 = (fSlow42 * fRec172[1]);
			fRec172[0] = ((fRec173[2] + (fSlow33 * (fTemp100 + (fSlow34 * fRec173[0])))) - (fSlow39 * ((fSlow40 * fRec172[2]) + fTemp101)));
			fRec182[0] = ((fSlow19 * fRec182[1]) + (fSlow20 * (fRec14[1] + fRec14[2])));
			fRec181[0] = (fRec182[0] - (fSlow16 * ((fSlow22 * fRec181[2]) + (fSlow23 * fRec181[1]))));
			float fTemp102 = (fRec181[2] + (fRec181[0] + (2.f * fRec181[1])));
			float fTemp103 = (fSlow16 * fTemp102);
			fVec23[0] = fTemp103;
			fRec180[0] = ((fSlow48 * fRec180[1]) + (fSlow49 * ((fSlow51 * fVec23[1]) + (fSlow50 * fTemp102))));
			fRec179[0] = (fRec180[0] - (fSlow46 * ((fSlow52 * fRec179[2]) + (fSlow30 * fRec179[1]))));
			float fTemp104 = (fSlow36 * fRec178[1]);
			fRec178[0] = ((fSlow46 * (((fSlow29 * fRec179[0]) + (fSlow53 * fRec179[1])) + (fSlow29 * fRec179[2]))) - (fSlow33 * ((fSlow34 * fRec178[2]) + fTemp104)));
			float fTemp105 = (fSlow42 * fRec177[1]);
			fRec177[0] = ((fRec178[2] + (fSlow33 * (fTemp104 + (fSlow34 * fRec178[0])))) - (fSlow39 * ((fSlow40 * fRec177[2]) + fTemp105)));
			fRec187[0] = ((fSlow48 * fRec187[1]) + (fSlow49 * (fVec23[1] + fTemp103)));
			fRec186[0] = (fRec187[0] - (fSlow46 * ((fSlow52 * fRec186[2]) + (fSlow30 * fRec186[1]))));
			float fTemp106 = (fRec186[2] + (fRec186[0] + (2.f * fRec186[1])));
			float fTemp107 = (fSlow46 * fTemp106);
			fVec24[0] = fTemp107;
			fRec185[0] = ((fSlow59 * fRec185[1]) + (fSlow60 * ((fSlow62 * fVec24[1]) + (fSlow61 * fTemp106))));
			fRec184[0] = (fRec185[0] - (fSlow57 * ((fSlow63 * fRec184[2]) + (fSlow36 * fRec184[1]))));
			float fTemp108 = (fSlow42 * fRec183[1]);
			fRec183[0] = ((fSlow57 * (((fSlow35 * fRec184[0]) + (fSlow64 * fRec184[1])) + (fSlow35 * fRec184[2]))) - (fSlow39 * ((fSlow40 * fRec183[2]) + fTemp108)));
			fRec191[0] = ((fSlow59 * fRec191[1]) + (fSlow60 * (fVec24[1] + fTemp107)));
			fRec190[0] = (fRec191[0] - (fSlow57 * ((fSlow63 * fRec190[2]) + (fSlow36 * fRec190[1]))));
			float fTemp109 = (fRec190[2] + (fRec190[0] + (2.f * fRec190[1])));
			float fTemp110 = (fSlow57 * fTemp109);
			fVec25[0] = fTemp110;
			fRec189[0] = ((fSlow69 * fRec189[1]) + (fSlow70 * (fVec25[1] + fTemp110)));
			fRec188[0] = (fRec189[0] - (fSlow65 * ((fSlow71 * fRec188[2]) + (fSlow42 * fRec188[1]))));
			fRec193[0] = ((fSlow69 * fRec193[1]) + (fSlow70 * ((fSlow75 * fVec25[1]) + (fSlow74 * fTemp109))));
			fRec192[0] = (fRec193[0] - (fSlow65 * ((fSlow71 * fRec192[2]) + (fSlow42 * fRec192[1]))));
			float fTemp111 = ((((fSlow121 * (fRec172[2] + (fSlow39 * (fTemp101 + (fSlow40 * fRec172[0]))))) + (fSlow122 * (fRec177[2] + (fSlow39 * (fTemp105 + (fSlow40 * fRec177[0])))))) + (fSlow123 * (fRec183[2] + (fSlow39 * (fTemp108 + (fSlow40 * fRec183[0])))))) + (fSlow65 * ((fSlow124 * (fRec188[2] + (fRec188[0] + (2.f * fRec188[1])))) + (fSlow125 * (((fSlow41 * fRec192[0]) + (fSlow76 * fRec192[1])) + (fSlow41 * fRec192[2]))))));
			float fTemp112 = (fTemp98 + fTemp111);
			float fTemp113 = (fTemp85 + fTemp112);
			float fTemp114 = (fTemp58 + fTemp113);
			fRec198[0] = ((fSlow19 * fRec198[1]) + (fSlow20 * ((fSlow14 * fRec1[1]) + (fSlow21 * fRec1[2]))));
			fRec197[0] = (fRec198[0] - (fSlow16 * ((fSlow22 * fRec197[2]) + (fSlow23 * fRec197[1]))));
			float fTemp115 = (fSlow30 * fRec196[1]);
			fRec196[0] = ((fSlow16 * (((fSlow17 * fRec197[0]) + (fSlow24 * fRec197[1])) + (fSlow17 * fRec197[2]))) - (fSlow27 * ((fSlow28 * fRec196[2]) + fTemp115)));
			float fTemp116 = (fSlow36 * fRec195[1]);
			fRec195[0] = ((fRec196[2] + (fSlow27 * (fTemp115 + (fSlow28 * fRec196[0])))) - (fSlow33 * ((fSlow34 * fRec195[2]) + fTemp116)));
			float fTemp117 = (fSlow42 * fRec194[1]);
			fRec194[0] = ((fRec195[2] + (fSlow33 * (fTemp116 + (fSlow34 * fRec195[0])))) - (fSlow39 * ((fSlow40 * fRec194[2]) + fTemp117)));
			fRec204[0] = ((fSlow19 * fRec204[1]) + (fSlow20 * (fRec1[1] + fRec1[2])));
			fRec203[0] = (fRec204[0] - (fSlow16 * ((fSlow22 * fRec203[2]) + (fSlow23 * fRec203[1]))));
			float fTemp118 = (fRec203[2] + (fRec203[0] + (2.f * fRec203[1])));
			float fTemp119 = (fSlow16 * fTemp118);
			fVec26[0] = fTemp119;
			fRec202[0] = ((fSlow48 * fRec202[1]) + (fSlow49 * ((fSlow51 * fVec26[1]) + (fSlow50 * fTemp118))));
			fRec201[0] = (fRec202[0] - (fSlow46 * ((fSlow52 * fRec201[2]) + (fSlow30 * fRec201[1]))));
			float fTemp120 = (fSlow36 * fRec200[1]);
			fRec200[0] = ((fSlow46 * (((fSlow29 * fRec201[0]) + (fSlow53 * fRec201[1])) + (fSlow29 * fRec201[2]))) - (fSlow33 * ((fSlow34 * fRec200[2]) + fTemp120)));
			float fTemp121 = (fSlow42 * fRec199[1]);
			fRec199[0] = ((fRec200[2] + (fSlow33 * (fTemp120 + (fSlow34 * fRec200[0])))) - (fSlow39 * ((fSlow40 * fRec199[2]) + fTemp121)));
			fRec209[0] = ((fSlow48 * fRec209[1]) + (fSlow49 * (fVec26[1] + fTemp119)));
			fRec208[0] = (fRec209[0] - (fSlow46 * ((fSlow52 * fRec208[2]) + (fSlow30 * fRec208[1]))));
			float fTemp122 = (fRec208[2] + (fRec208[0] + (2.f * fRec208[1])));
			float fTemp123 = (fSlow46 * fTemp122);
			fVec27[0] = fTemp123;
			fRec207[0] = ((fSlow59 * fRec207[1]) + (fSlow60 * ((fSlow62 * fVec27[1]) + (fSlow61 * fTemp122))));
			fRec206[0] = (fRec207[0] - (fSlow57 * ((fSlow63 * fRec206[2]) + (fSlow36 * fRec206[1]))));
			float fTemp124 = (fSlow42 * fRec205[1]);
			fRec205[0] = ((fSlow57 * (((fSlow35 * fRec206[0]) + (fSlow64 * fRec206[1])) + (fSlow35 * fRec206[2]))) - (fSlow39 * ((fSlow40 * fRec205[2]) + fTemp124)));
			fRec213[0] = ((fSlow59 * fRec213[1]) + (fSlow60 * (fVec27[1] + fTemp123)));
			fRec212[0] = (fRec213[0] - (fSlow57 * ((fSlow63 * fRec212[2]) + (fSlow36 * fRec212[1]))));
			float fTemp125 = (fRec212[2] + (fRec212[0] + (2.f * fRec212[1])));
			float fTemp126 = (fSlow57 * fTemp125);
			fVec28[0] = fTemp126;
			fRec211[0] = ((fSlow69 * fRec211[1]) + (fSlow70 * (fVec28[1] + fTemp126)));
			fRec210[0] = (fRec211[0] - (fSlow65 * ((fSlow71 * fRec210[2]) + (fSlow42 * fRec210[1]))));
			fRec215[0] = ((fSlow69 * fRec215[1]) + (fSlow70 * ((fSlow75 * fVec28[1]) + (fSlow74 * fTemp125))));
			fRec214[0] = (fRec215[0] - (fSlow65 * ((fSlow71 * fRec214[2]) + (fSlow42 * fRec214[1]))));
			float fTemp127 = ((((fSlow128 * (fRec194[2] + (fSlow39 * (fTemp117 + (fSlow40 * fRec194[0]))))) + (fSlow129 * (fRec199[2] + (fSlow39 * (fTemp121 + (fSlow40 * fRec199[0])))))) + (fSlow130 * (fRec205[2] + (fSlow39 * (fTemp124 + (fSlow40 * fRec205[0])))))) + (fSlow65 * ((fSlow131 * (fRec210[2] + (fRec210[0] + (2.f * fRec210[1])))) + (fSlow132 * (((fSlow41 * fRec214[0]) + (fSlow76 * fRec214[1])) + (fSlow41 * fRec214[2]))))));
			fRec220[0] = ((fSlow19 * fRec220[1]) + (fSlow20 * ((fSlow14 * fRec9[1]) + (fSlow21 * fRec9[2]))));
			fRec219[0] = (fRec220[0] - (fSlow16 * ((fSlow22 * fRec219[2]) + (fSlow23 * fRec219[1]))));
			float fTemp128 = (fSlow30 * fRec218[1]);
			fRec218[0] = ((fSlow16 * (((fSlow17 * fRec219[0]) + (fSlow24 * fRec219[1])) + (fSlow17 * fRec219[2]))) - (fSlow27 * ((fSlow28 * fRec218[2]) + fTemp128)));
			float fTemp129 = (fSlow36 * fRec217[1]);
			fRec217[0] = ((fRec218[2] + (fSlow27 * (fTemp128 + (fSlow28 * fRec218[0])))) - (fSlow33 * ((fSlow34 * fRec217[2]) + fTemp129)));
			float fTemp130 = (fSlow42 * fRec216[1]);
			fRec216[0] = ((fRec217[2] + (fSlow33 * (fTemp129 + (fSlow34 * fRec217[0])))) - (fSlow39 * ((fSlow40 * fRec216[2]) + fTemp130)));
			fRec226[0] = ((fSlow19 * fRec226[1]) + (fSlow20 * (fRec9[1] + fRec9[2])));
			fRec225[0] = (fRec226[0] - (fSlow16 * ((fSlow22 * fRec225[2]) + (fSlow23 * fRec225[1]))));
			float fTemp131 = (fRec225[2] + (fRec225[0] + (2.f * fRec225[1])));
			float fTemp132 = (fSlow16 * fTemp131);
			fVec29[0] = fTemp132;
			fRec224[0] = ((fSlow48 * fRec224[1]) + (fSlow49 * ((fSlow51 * fVec29[1]) + (fSlow50 * fTemp131))));
			fRec223[0] = (fRec224[0] - (fSlow46 * ((fSlow52 * fRec223[2]) + (fSlow30 * fRec223[1]))));
			float fTemp133 = (fSlow36 * fRec222[1]);
			fRec222[0] = ((fSlow46 * (((fSlow29 * fRec223[0]) + (fSlow53 * fRec223[1])) + (fSlow29 * fRec223[2]))) - (fSlow33 * ((fSlow34 * fRec222[2]) + fTemp133)));
			float fTemp134 = (fSlow42 * fRec221[1]);
			fRec221[0] = ((fRec222[2] + (fSlow33 * (fTemp133 + (fSlow34 * fRec222[0])))) - (fSlow39 * ((fSlow40 * fRec221[2]) + fTemp134)));
			fRec231[0] = ((fSlow48 * fRec231[1]) + (fSlow49 * (fVec29[1] + fTemp132)));
			fRec230[0] = (fRec231[0] - (fSlow46 * ((fSlow52 * fRec230[2]) + (fSlow30 * fRec230[1]))));
			float fTemp135 = (fRec230[2] + (fRec230[0] + (2.f * fRec230[1])));
			float fTemp136 = (fSlow46 * fTemp135);
			fVec30[0] = fTemp136;
			fRec229[0] = ((fSlow59 * fRec229[1]) + (fSlow60 * ((fSlow62 * fVec30[1]) + (fSlow61 * fTemp135))));
			fRec228[0] = (fRec229[0] - (fSlow57 * ((fSlow63 * fRec228[2]) + (fSlow36 * fRec228[1]))));
			float fTemp137 = (fSlow42 * fRec227[1]);
			fRec227[0] = ((fSlow57 * (((fSlow35 * fRec228[0]) + (fSlow64 * fRec228[1])) + (fSlow35 * fRec228[2]))) - (fSlow39 * ((fSlow40 * fRec227[2]) + fTemp137)));
			fRec235[0] = ((fSlow59 * fRec235[1]) + (fSlow60 * (fVec30[1] + fTemp136)));
			fRec234[0] = (fRec235[0] - (fSlow57 * ((fSlow63 * fRec234[2]) + (fSlow36 * fRec234[1]))));
			float fTemp138 = (fRec234[2] + (fRec234[0] + (2.f * fRec234[1])));
			float fTemp139 = (fSlow57 * fTemp138);
			fVec31[0] = fTemp139;
			fRec233[0] = ((fSlow69 * fRec233[1]) + (fSlow70 * (fVec31[1] + fTemp139)));
			fRec232[0] = (fRec233[0] - (fSlow65 * ((fSlow71 * fRec232[2]) + (fSlow42 * fRec232[1]))));
			fRec237[0] = ((fSlow69 * fRec237[1]) + (fSlow70 * ((fSlow75 * fVec31[1]) + (fSlow74 * fTemp138))));
			fRec236[0] = (fRec237[0] - (fSlow65 * ((fSlow71 * fRec236[2]) + (fSlow42 * fRec236[1]))));
			float fTemp140 = ((((fSlow135 * (fRec216[2] + (fSlow39 * (fTemp130 + (fSlow40 * fRec216[0]))))) + (fSlow136 * (fRec221[2] + (fSlow39 * (fTemp134 + (fSlow40 * fRec221[0])))))) + (fSlow137 * (fRec227[2] + (fSlow39 * (fTemp137 + (fSlow40 * fRec227[0])))))) + (fSlow65 * ((fSlow138 * (fRec232[2] + (fRec232[0] + (2.f * fRec232[1])))) + (fSlow139 * (((fSlow41 * fRec236[0]) + (fSlow76 * fRec236[1])) + (fSlow41 * fRec236[2]))))));
			float fTemp141 = (fTemp127 + fTemp140);
			fRec242[0] = ((fSlow19 * fRec242[1]) + (fSlow20 * ((fSlow14 * fRec5[1]) + (fSlow21 * fRec5[2]))));
			fRec241[0] = (fRec242[0] - (fSlow16 * ((fSlow22 * fRec241[2]) + (fSlow23 * fRec241[1]))));
			float fTemp142 = (fSlow30 * fRec240[1]);
			fRec240[0] = ((fSlow16 * (((fSlow17 * fRec241[0]) + (fSlow24 * fRec241[1])) + (fSlow17 * fRec241[2]))) - (fSlow27 * ((fSlow28 * fRec240[2]) + fTemp142)));
			float fTemp143 = (fSlow36 * fRec239[1]);
			fRec239[0] = ((fRec240[2] + (fSlow27 * (fTemp142 + (fSlow28 * fRec240[0])))) - (fSlow33 * ((fSlow34 * fRec239[2]) + fTemp143)));
			float fTemp144 = (fSlow42 * fRec238[1]);
			fRec238[0] = ((fRec239[2] + (fSlow33 * (fTemp143 + (fSlow34 * fRec239[0])))) - (fSlow39 * ((fSlow40 * fRec238[2]) + fTemp144)));
			fRec248[0] = ((fSlow19 * fRec248[1]) + (fSlow20 * (fRec5[1] + fRec5[2])));
			fRec247[0] = (fRec248[0] - (fSlow16 * ((fSlow22 * fRec247[2]) + (fSlow23 * fRec247[1]))));
			float fTemp145 = (fRec247[2] + (fRec247[0] + (2.f * fRec247[1])));
			float fTemp146 = (fSlow16 * fTemp145);
			fVec32[0] = fTemp146;
			fRec246[0] = ((fSlow48 * fRec246[1]) + (fSlow49 * ((fSlow51 * fVec32[1]) + (fSlow50 * fTemp145))));
			fRec245[0] = (fRec246[0] - (fSlow46 * ((fSlow52 * fRec245[2]) + (fSlow30 * fRec245[1]))));
			float fTemp147 = (fSlow36 * fRec244[1]);
			fRec244[0] = ((fSlow46 * (((fSlow29 * fRec245[0]) + (fSlow53 * fRec245[1])) + (fSlow29 * fRec245[2]))) - (fSlow33 * ((fSlow34 * fRec244[2]) + fTemp147)));
			float fTemp148 = (fSlow42 * fRec243[1]);
			fRec243[0] = ((fRec244[2] + (fSlow33 * (fTemp147 + (fSlow34 * fRec244[0])))) - (fSlow39 * ((fSlow40 * fRec243[2]) + fTemp148)));
			fRec253[0] = ((fSlow48 * fRec253[1]) + (fSlow49 * (fVec32[1] + fTemp146)));
			fRec252[0] = (fRec253[0] - (fSlow46 * ((fSlow52 * fRec252[2]) + (fSlow30 * fRec252[1]))));
			float fTemp149 = (fRec252[2] + (fRec252[0] + (2.f * fRec252[1])));
			float fTemp150 = (fSlow46 * fTemp149);
			fVec33[0] = fTemp150;
			fRec251[0] = ((fSlow59 * fRec251[1]) + (fSlow60 * ((fSlow62 * fVec33[1]) + (fSlow61 * fTemp149))));
			fRec250[0] = (fRec251[0] - (fSlow57 * ((fSlow63 * fRec250[2]) + (fSlow36 * fRec250[1]))));
			float fTemp151 = (fSlow42 * fRec249[1]);
			fRec249[0] = ((fSlow57 * (((fSlow35 * fRec250[0]) + (fSlow64 * fRec250[1])) + (fSlow35 * fRec250[2]))) - (fSlow39 * ((fSlow40 * fRec249[2]) + fTemp151)));
			fRec257[0] = ((fSlow59 * fRec257[1]) + (fSlow60 * (fVec33[1] + fTemp150)));
			fRec256[0] = (fRec257[0] - (fSlow57 * ((fSlow63 * fRec256[2]) + (fSlow36 * fRec256[1]))));
			float fTemp152 = (fRec256[2] + (fRec256[0] + (2.f * fRec256[1])));
			float fTemp153 = (fSlow57 * fTemp152);
			fVec34[0] = fTemp153;
			fRec255[0] = ((fSlow69 * fRec255[1]) + (fSlow70 * (fVec34[1] + fTemp153)));
			fRec254[0] = (fRec255[0] - (fSlow65 * ((fSlow71 * fRec254[2]) + (fSlow42 * fRec254[1]))));
			fRec259[0] = ((fSlow69 * fRec259[1]) + (fSlow70 * ((fSlow75 * fVec34[1]) + (fSlow74 * fTemp152))));
			fRec258[0] = (fRec259[0] - (fSlow65 * ((fSlow71 * fRec258[2]) + (fSlow42 * fRec258[1]))));
			float fTemp154 = ((((fSlow142 * (fRec238[2] + (fSlow39 * (fTemp144 + (fSlow40 * fRec238[0]))))) + (fSlow143 * (fRec243[2] + (fSlow39 * (fTemp148 + (fSlow40 * fRec243[0])))))) + (fSlow144 * (fRec249[2] + (fSlow39 * (fTemp151 + (fSlow40 * fRec249[0])))))) + (fSlow65 * ((fSlow145 * (fRec254[2] + (fRec254[0] + (2.f * fRec254[1])))) + (fSlow146 * (((fSlow41 * fRec258[0]) + (fSlow76 * fRec258[1])) + (fSlow41 * fRec258[2]))))));
			fRec264[0] = ((fSlow19 * fRec264[1]) + (fSlow20 * ((fSlow14 * fRec13[1]) + (fSlow21 * fRec13[2]))));
			fRec263[0] = (fRec264[0] - (fSlow16 * ((fSlow22 * fRec263[2]) + (fSlow23 * fRec263[1]))));
			float fTemp155 = (fSlow30 * fRec262[1]);
			fRec262[0] = ((fSlow16 * (((fSlow17 * fRec263[0]) + (fSlow24 * fRec263[1])) + (fSlow17 * fRec263[2]))) - (fSlow27 * ((fSlow28 * fRec262[2]) + fTemp155)));
			float fTemp156 = (fSlow36 * fRec261[1]);
			fRec261[0] = ((fRec262[2] + (fSlow27 * (fTemp155 + (fSlow28 * fRec262[0])))) - (fSlow33 * ((fSlow34 * fRec261[2]) + fTemp156)));
			float fTemp157 = (fSlow42 * fRec260[1]);
			fRec260[0] = ((fRec261[2] + (fSlow33 * (fTemp156 + (fSlow34 * fRec261[0])))) - (fSlow39 * ((fSlow40 * fRec260[2]) + fTemp157)));
			fRec270[0] = ((fSlow19 * fRec270[1]) + (fSlow20 * (fRec13[1] + fRec13[2])));
			fRec269[0] = (fRec270[0] - (fSlow16 * ((fSlow22 * fRec269[2]) + (fSlow23 * fRec269[1]))));
			float fTemp158 = (fRec269[2] + (fRec269[0] + (2.f * fRec269[1])));
			float fTemp159 = (fSlow16 * fTemp158);
			fVec35[0] = fTemp159;
			fRec268[0] = ((fSlow48 * fRec268[1]) + (fSlow49 * ((fSlow51 * fVec35[1]) + (fSlow50 * fTemp158))));
			fRec267[0] = (fRec268[0] - (fSlow46 * ((fSlow52 * fRec267[2]) + (fSlow30 * fRec267[1]))));
			float fTemp160 = (fSlow36 * fRec266[1]);
			fRec266[0] = ((fSlow46 * (((fSlow29 * fRec267[0]) + (fSlow53 * fRec267[1])) + (fSlow29 * fRec267[2]))) - (fSlow33 * ((fSlow34 * fRec266[2]) + fTemp160)));
			float fTemp161 = (fSlow42 * fRec265[1]);
			fRec265[0] = ((fRec266[2] + (fSlow33 * (fTemp160 + (fSlow34 * fRec266[0])))) - (fSlow39 * ((fSlow40 * fRec265[2]) + fTemp161)));
			fRec275[0] = ((fSlow48 * fRec275[1]) + (fSlow49 * (fVec35[1] + fTemp159)));
			fRec274[0] = (fRec275[0] - (fSlow46 * ((fSlow52 * fRec274[2]) + (fSlow30 * fRec274[1]))));
			float fTemp162 = (fRec274[2] + (fRec274[0] + (2.f * fRec274[1])));
			float fTemp163 = (fSlow46 * fTemp162);
			fVec36[0] = fTemp163;
			fRec273[0] = ((fSlow59 * fRec273[1]) + (fSlow60 * ((fSlow62 * fVec36[1]) + (fSlow61 * fTemp162))));
			fRec272[0] = (fRec273[0] - (fSlow57 * ((fSlow63 * fRec272[2]) + (fSlow36 * fRec272[1]))));
			float fTemp164 = (fSlow42 * fRec271[1]);
			fRec271[0] = ((fSlow57 * (((fSlow35 * fRec272[0]) + (fSlow64 * fRec272[1])) + (fSlow35 * fRec272[2]))) - (fSlow39 * ((fSlow40 * fRec271[2]) + fTemp164)));
			fRec279[0] = ((fSlow59 * fRec279[1]) + (fSlow60 * (fVec36[1] + fTemp163)));
			fRec278[0] = (fRec279[0] - (fSlow57 * ((fSlow63 * fRec278[2]) + (fSlow36 * fRec278[1]))));
			float fTemp165 = (fRec278[2] + (fRec278[0] + (2.f * fRec278[1])));
			float fTemp166 = (fSlow57 * fTemp165);
			fVec37[0] = fTemp166;
			fRec277[0] = ((fSlow69 * fRec277[1]) + (fSlow70 * (fVec37[1] + fTemp166)));
			fRec276[0] = (fRec277[0] - (fSlow65 * ((fSlow71 * fRec276[2]) + (fSlow42 * fRec276[1]))));
			fRec281[0] = ((fSlow69 * fRec281[1]) + (fSlow70 * ((fSlow75 * fVec37[1]) + (fSlow74 * fTemp165))));
			fRec280[0] = (fRec281[0] - (fSlow65 * ((fSlow71 * fRec280[2]) + (fSlow42 * fRec280[1]))));
			float fTemp167 = ((((fSlow149 * (fRec260[2] + (fSlow39 * (fTemp157 + (fSlow40 * fRec260[0]))))) + (fSlow150 * (fRec265[2] + (fSlow39 * (fTemp161 + (fSlow40 * fRec265[0])))))) + (fSlow151 * (fRec271[2] + (fSlow39 * (fTemp164 + (fSlow40 * fRec271[0])))))) + (fSlow65 * ((fSlow152 * (fRec276[2] + (fRec276[0] + (2.f * fRec276[1])))) + (fSlow153 * (((fSlow41 * fRec280[0]) + (fSlow76 * fRec280[1])) + (fSlow41 * fRec280[2]))))));
			float fTemp168 = (fTemp154 + fTemp167);
			float fTemp169 = (fTemp141 + fTemp168);
			fRec286[0] = ((fSlow19 * fRec286[1]) + (fSlow20 * ((fSlow14 * fRec3[1]) + (fSlow21 * fRec3[2]))));
			fRec285[0] = (fRec286[0] - (fSlow16 * ((fSlow22 * fRec285[2]) + (fSlow23 * fRec285[1]))));
			float fTemp170 = (fSlow30 * fRec284[1]);
			fRec284[0] = ((fSlow16 * (((fSlow17 * fRec285[0]) + (fSlow24 * fRec285[1])) + (fSlow17 * fRec285[2]))) - (fSlow27 * ((fSlow28 * fRec284[2]) + fTemp170)));
			float fTemp171 = (fSlow36 * fRec283[1]);
			fRec283[0] = ((fRec284[2] + (fSlow27 * (fTemp170 + (fSlow28 * fRec284[0])))) - (fSlow33 * ((fSlow34 * fRec283[2]) + fTemp171)));
			float fTemp172 = (fSlow42 * fRec282[1]);
			fRec282[0] = ((fRec283[2] + (fSlow33 * (fTemp171 + (fSlow34 * fRec283[0])))) - (fSlow39 * ((fSlow40 * fRec282[2]) + fTemp172)));
			fRec292[0] = ((fSlow19 * fRec292[1]) + (fSlow20 * (fRec3[1] + fRec3[2])));
			fRec291[0] = (fRec292[0] - (fSlow16 * ((fSlow22 * fRec291[2]) + (fSlow23 * fRec291[1]))));
			float fTemp173 = (fRec291[2] + (fRec291[0] + (2.f * fRec291[1])));
			float fTemp174 = (fSlow16 * fTemp173);
			fVec38[0] = fTemp174;
			fRec290[0] = ((fSlow48 * fRec290[1]) + (fSlow49 * ((fSlow51 * fVec38[1]) + (fSlow50 * fTemp173))));
			fRec289[0] = (fRec290[0] - (fSlow46 * ((fSlow52 * fRec289[2]) + (fSlow30 * fRec289[1]))));
			float fTemp175 = (fSlow36 * fRec288[1]);
			fRec288[0] = ((fSlow46 * (((fSlow29 * fRec289[0]) + (fSlow53 * fRec289[1])) + (fSlow29 * fRec289[2]))) - (fSlow33 * ((fSlow34 * fRec288[2]) + fTemp175)));
			float fTemp176 = (fSlow42 * fRec287[1]);
			fRec287[0] = ((fRec288[2] + (fSlow33 * (fTemp175 + (fSlow34 * fRec288[0])))) - (fSlow39 * ((fSlow40 * fRec287[2]) + fTemp176)));
			fRec297[0] = ((fSlow48 * fRec297[1]) + (fSlow49 * (fVec38[1] + fTemp174)));
			fRec296[0] = (fRec297[0] - (fSlow46 * ((fSlow52 * fRec296[2]) + (fSlow30 * fRec296[1]))));
			float fTemp177 = (fRec296[2] + (fRec296[0] + (2.f * fRec296[1])));
			float fTemp178 = (fSlow46 * fTemp177);
			fVec39[0] = fTemp178;
			fRec295[0] = ((fSlow59 * fRec295[1]) + (fSlow60 * ((fSlow62 * fVec39[1]) + (fSlow61 * fTemp177))));
			fRec294[0] = (fRec295[0] - (fSlow57 * ((fSlow63 * fRec294[2]) + (fSlow36 * fRec294[1]))));
			float fTemp179 = (fSlow42 * fRec293[1]);
			fRec293[0] = ((fSlow57 * (((fSlow35 * fRec294[0]) + (fSlow64 * fRec294[1])) + (fSlow35 * fRec294[2]))) - (fSlow39 * ((fSlow40 * fRec293[2]) + fTemp179)));
			fRec301[0] = ((fSlow59 * fRec301[1]) + (fSlow60 * (fVec39[1] + fTemp178)));
			fRec300[0] = (fRec301[0] - (fSlow57 * ((fSlow63 * fRec300[2]) + (fSlow36 * fRec300[1]))));
			float fTemp180 = (fRec300[2] + (fRec300[0] + (2.f * fRec300[1])));
			float fTemp181 = (fSlow57 * fTemp180);
			fVec40[0] = fTemp181;
			fRec299[0] = ((fSlow69 * fRec299[1]) + (fSlow70 * (fVec40[1] + fTemp181)));
			fRec298[0] = (fRec299[0] - (fSlow65 * ((fSlow71 * fRec298[2]) + (fSlow42 * fRec298[1]))));
			fRec303[0] = ((fSlow69 * fRec303[1]) + (fSlow70 * ((fSlow75 * fVec40[1]) + (fSlow74 * fTemp180))));
			fRec302[0] = (fRec303[0] - (fSlow65 * ((fSlow71 * fRec302[2]) + (fSlow42 * fRec302[1]))));
			float fTemp182 = ((((fSlow156 * (fRec282[2] + (fSlow39 * (fTemp172 + (fSlow40 * fRec282[0]))))) + (fSlow157 * (fRec287[2] + (fSlow39 * (fTemp176 + (fSlow40 * fRec287[0])))))) + (fSlow158 * (fRec293[2] + (fSlow39 * (fTemp179 + (fSlow40 * fRec293[0])))))) + (fSlow65 * ((fSlow159 * (fRec298[2] + (fRec298[0] + (2.f * fRec298[1])))) + (fSlow160 * (((fSlow41 * fRec302[0]) + (fSlow76 * fRec302[1])) + (fSlow41 * fRec302[2]))))));
			fRec308[0] = ((fSlow19 * fRec308[1]) + (fSlow20 * ((fSlow14 * fRec11[1]) + (fSlow21 * fRec11[2]))));
			fRec307[0] = (fRec308[0] - (fSlow16 * ((fSlow22 * fRec307[2]) + (fSlow23 * fRec307[1]))));
			float fTemp183 = (fSlow30 * fRec306[1]);
			fRec306[0] = ((fSlow16 * (((fSlow17 * fRec307[0]) + (fSlow24 * fRec307[1])) + (fSlow17 * fRec307[2]))) - (fSlow27 * ((fSlow28 * fRec306[2]) + fTemp183)));
			float fTemp184 = (fSlow36 * fRec305[1]);
			fRec305[0] = ((fRec306[2] + (fSlow27 * (fTemp183 + (fSlow28 * fRec306[0])))) - (fSlow33 * ((fSlow34 * fRec305[2]) + fTemp184)));
			float fTemp185 = (fSlow42 * fRec304[1]);
			fRec304[0] = ((fRec305[2] + (fSlow33 * (fTemp184 + (fSlow34 * fRec305[0])))) - (fSlow39 * ((fSlow40 * fRec304[2]) + fTemp185)));
			fRec314[0] = ((fSlow19 * fRec314[1]) + (fSlow20 * (fRec11[1] + fRec11[2])));
			fRec313[0] = (fRec314[0] - (fSlow16 * ((fSlow22 * fRec313[2]) + (fSlow23 * fRec313[1]))));
			float fTemp186 = (fRec313[2] + (fRec313[0] + (2.f * fRec313[1])));
			float fTemp187 = (fSlow16 * fTemp186);
			fVec41[0] = fTemp187;
			fRec312[0] = ((fSlow48 * fRec312[1]) + (fSlow49 * ((fSlow51 * fVec41[1]) + (fSlow50 * fTemp186))));
			fRec311[0] = (fRec312[0] - (fSlow46 * ((fSlow52 * fRec311[2]) + (fSlow30 * fRec311[1]))));
			float fTemp188 = (fSlow36 * fRec310[1]);
			fRec310[0] = ((fSlow46 * (((fSlow29 * fRec311[0]) + (fSlow53 * fRec311[1])) + (fSlow29 * fRec311[2]))) - (fSlow33 * ((fSlow34 * fRec310[2]) + fTemp188)));
			float fTemp189 = (fSlow42 * fRec309[1]);
			fRec309[0] = ((fRec310[2] + (fSlow33 * (fTemp188 + (fSlow34 * fRec310[0])))) - (fSlow39 * ((fSlow40 * fRec309[2]) + fTemp189)));
			fRec319[0] = ((fSlow48 * fRec319[1]) + (fSlow49 * (fVec41[1] + fTemp187)));
			fRec318[0] = (fRec319[0] - (fSlow46 * ((fSlow52 * fRec318[2]) + (fSlow30 * fRec318[1]))));
			float fTemp190 = (fRec318[2] + (fRec318[0] + (2.f * fRec318[1])));
			float fTemp191 = (fSlow46 * fTemp190);
			fVec42[0] = fTemp191;
			fRec317[0] = ((fSlow59 * fRec317[1]) + (fSlow60 * ((fSlow62 * fVec42[1]) + (fSlow61 * fTemp190))));
			fRec316[0] = (fRec317[0] - (fSlow57 * ((fSlow63 * fRec316[2]) + (fSlow36 * fRec316[1]))));
			float fTemp192 = (fSlow42 * fRec315[1]);
			fRec315[0] = ((fSlow57 * (((fSlow35 * fRec316[0]) + (fSlow64 * fRec316[1])) + (fSlow35 * fRec316[2]))) - (fSlow39 * ((fSlow40 * fRec315[2]) + fTemp192)));
			fRec323[0] = ((fSlow59 * fRec323[1]) + (fSlow60 * (fVec42[1] + fTemp191)));
			fRec322[0] = (fRec323[0] - (fSlow57 * ((fSlow63 * fRec322[2]) + (fSlow36 * fRec322[1]))));
			float fTemp193 = (fRec322[2] + (fRec322[0] + (2.f * fRec322[1])));
			float fTemp194 = (fSlow57 * fTemp193);
			fVec43[0] = fTemp194;
			fRec321[0] = ((fSlow69 * fRec321[1]) + (fSlow70 * (fVec43[1] + fTemp194)));
			fRec320[0] = (fRec321[0] - (fSlow65 * ((fSlow71 * fRec320[2]) + (fSlow42 * fRec320[1]))));
			fRec325[0] = ((fSlow69 * fRec325[1]) + (fSlow70 * ((fSlow75 * fVec43[1]) + (fSlow74 * fTemp193))));
			fRec324[0] = (fRec325[0] - (fSlow65 * ((fSlow71 * fRec324[2]) + (fSlow42 * fRec324[1]))));
			float fTemp195 = ((((fSlow163 * (fRec304[2] + (fSlow39 * (fTemp185 + (fSlow40 * fRec304[0]))))) + (fSlow164 * (fRec309[2] + (fSlow39 * (fTemp189 + (fSlow40 * fRec309[0])))))) + (fSlow165 * (fRec315[2] + (fSlow39 * (fTemp192 + (fSlow40 * fRec315[0])))))) + (fSlow65 * ((fSlow166 * (fRec320[2] + (fRec320[0] + (2.f * fRec320[1])))) + (fSlow167 * (((fSlow41 * fRec324[0]) + (fSlow76 * fRec324[1])) + (fSlow41 * fRec324[2]))))));
			float fTemp196 = (fTemp182 + fTemp195);
			fRec330[0] = ((fSlow19 * fRec330[1]) + (fSlow20 * ((fSlow14 * fRec7[1]) + (fSlow21 * fRec7[2]))));
			fRec329[0] = (fRec330[0] - (fSlow16 * ((fSlow22 * fRec329[2]) + (fSlow23 * fRec329[1]))));
			float fTemp197 = (fSlow30 * fRec328[1]);
			fRec328[0] = ((fSlow16 * (((fSlow17 * fRec329[0]) + (fSlow24 * fRec329[1])) + (fSlow17 * fRec329[2]))) - (fSlow27 * ((fSlow28 * fRec328[2]) + fTemp197)));
			float fTemp198 = (fSlow36 * fRec327[1]);
			fRec327[0] = ((fRec328[2] + (fSlow27 * (fTemp197 + (fSlow28 * fRec328[0])))) - (fSlow33 * ((fSlow34 * fRec327[2]) + fTemp198)));
			float fTemp199 = (fSlow42 * fRec326[1]);
			fRec326[0] = ((fRec327[2] + (fSlow33 * (fTemp198 + (fSlow34 * fRec327[0])))) - (fSlow39 * ((fSlow40 * fRec326[2]) + fTemp199)));
			fRec336[0] = ((fSlow19 * fRec336[1]) + (fSlow20 * (fRec7[1] + fRec7[2])));
			fRec335[0] = (fRec336[0] - (fSlow16 * ((fSlow22 * fRec335[2]) + (fSlow23 * fRec335[1]))));
			float fTemp200 = (fRec335[2] + (fRec335[0] + (2.f * fRec335[1])));
			float fTemp201 = (fSlow16 * fTemp200);
			fVec44[0] = fTemp201;
			fRec334[0] = ((fSlow48 * fRec334[1]) + (fSlow49 * ((fSlow51 * fVec44[1]) + (fSlow50 * fTemp200))));
			fRec333[0] = (fRec334[0] - (fSlow46 * ((fSlow52 * fRec333[2]) + (fSlow30 * fRec333[1]))));
			float fTemp202 = (fSlow36 * fRec332[1]);
			fRec332[0] = ((fSlow46 * (((fSlow29 * fRec333[0]) + (fSlow53 * fRec333[1])) + (fSlow29 * fRec333[2]))) - (fSlow33 * ((fSlow34 * fRec332[2]) + fTemp202)));
			float fTemp203 = (fSlow42 * fRec331[1]);
			fRec331[0] = ((fRec332[2] + (fSlow33 * (fTemp202 + (fSlow34 * fRec332[0])))) - (fSlow39 * ((fSlow40 * fRec331[2]) + fTemp203)));
			fRec341[0] = ((fSlow48 * fRec341[1]) + (fSlow49 * (fVec44[1] + fTemp201)));
			fRec340[0] = (fRec341[0] - (fSlow46 * ((fSlow52 * fRec340[2]) + (fSlow30 * fRec340[1]))));
			float fTemp204 = (fRec340[2] + (fRec340[0] + (2.f * fRec340[1])));
			float fTemp205 = (fSlow46 * fTemp204);
			fVec45[0] = fTemp205;
			fRec339[0] = ((fSlow59 * fRec339[1]) + (fSlow60 * ((fSlow62 * fVec45[1]) + (fSlow61 * fTemp204))));
			fRec338[0] = (fRec339[0] - (fSlow57 * ((fSlow63 * fRec338[2]) + (fSlow36 * fRec338[1]))));
			float fTemp206 = (fSlow42 * fRec337[1]);
			fRec337[0] = ((fSlow57 * (((fSlow35 * fRec338[0]) + (fSlow64 * fRec338[1])) + (fSlow35 * fRec338[2]))) - (fSlow39 * ((fSlow40 * fRec337[2]) + fTemp206)));
			fRec345[0] = ((fSlow59 * fRec345[1]) + (fSlow60 * (fVec45[1] + fTemp205)));
			fRec344[0] = (fRec345[0] - (fSlow57 * ((fSlow63 * fRec344[2]) + (fSlow36 * fRec344[1]))));
			float fTemp207 = (fRec344[2] + (fRec344[0] + (2.f * fRec344[1])));
			float fTemp208 = (fSlow57 * fTemp207);
			fVec46[0] = fTemp208;
			fRec343[0] = ((fSlow69 * fRec343[1]) + (fSlow70 * (fVec46[1] + fTemp208)));
			fRec342[0] = (fRec343[0] - (fSlow65 * ((fSlow71 * fRec342[2]) + (fSlow42 * fRec342[1]))));
			fRec347[0] = ((fSlow69 * fRec347[1]) + (fSlow70 * ((fSlow75 * fVec46[1]) + (fSlow74 * fTemp207))));
			fRec346[0] = (fRec347[0] - (fSlow65 * ((fSlow71 * fRec346[2]) + (fSlow42 * fRec346[1]))));
			float fTemp209 = ((((fSlow170 * (fRec326[2] + (fSlow39 * (fTemp199 + (fSlow40 * fRec326[0]))))) + (fSlow171 * (fRec331[2] + (fSlow39 * (fTemp203 + (fSlow40 * fRec331[0])))))) + (fSlow172 * (fRec337[2] + (fSlow39 * (fTemp206 + (fSlow40 * fRec337[0])))))) + (fSlow65 * ((fSlow173 * (fRec342[2] + (fRec342[0] + (2.f * fRec342[1])))) + (fSlow174 * (((fSlow41 * fRec346[0]) + (fSlow76 * fRec346[1])) + (fSlow41 * fRec346[2]))))));
			fRec352[0] = ((fSlow19 * fRec352[1]) + (fSlow20 * ((fSlow14 * fRec15[1]) + (fSlow21 * fRec15[2]))));
			fRec351[0] = (fRec352[0] - (fSlow16 * ((fSlow22 * fRec351[2]) + (fSlow23 * fRec351[1]))));
			float fTemp210 = (fSlow30 * fRec350[1]);
			fRec350[0] = ((fSlow16 * (((fSlow17 * fRec351[0]) + (fSlow24 * fRec351[1])) + (fSlow17 * fRec351[2]))) - (fSlow27 * ((fSlow28 * fRec350[2]) + fTemp210)));
			float fTemp211 = (fSlow36 * fRec349[1]);
			fRec349[0] = ((fRec350[2] + (fSlow27 * (fTemp210 + (fSlow28 * fRec350[0])))) - (fSlow33 * ((fSlow34 * fRec349[2]) + fTemp211)));
			float fTemp212 = (fSlow42 * fRec348[1]);
			fRec348[0] = ((fRec349[2] + (fSlow33 * (fTemp211 + (fSlow34 * fRec349[0])))) - (fSlow39 * ((fSlow40 * fRec348[2]) + fTemp212)));
			fRec358[0] = ((fSlow19 * fRec358[1]) + (fSlow20 * (fRec15[1] + fRec15[2])));
			fRec357[0] = (fRec358[0] - (fSlow16 * ((fSlow22 * fRec357[2]) + (fSlow23 * fRec357[1]))));
			float fTemp213 = (fRec357[2] + (fRec357[0] + (2.f * fRec357[1])));
			float fTemp214 = (fSlow16 * fTemp213);
			fVec47[0] = fTemp214;
			fRec356[0] = ((fSlow48 * fRec356[1]) + (fSlow49 * ((fSlow51 * fVec47[1]) + (fSlow50 * fTemp213))));
			fRec355[0] = (fRec356[0] - (fSlow46 * ((fSlow52 * fRec355[2]) + (fSlow30 * fRec355[1]))));
			float fTemp215 = (fSlow36 * fRec354[1]);
			fRec354[0] = ((fSlow46 * (((fSlow29 * fRec355[0]) + (fSlow53 * fRec355[1])) + (fSlow29 * fRec355[2]))) - (fSlow33 * ((fSlow34 * fRec354[2]) + fTemp215)));
			float fTemp216 = (fSlow42 * fRec353[1]);
			fRec353[0] = ((fRec354[2] + (fSlow33 * (fTemp215 + (fSlow34 * fRec354[0])))) - (fSlow39 * ((fSlow40 * fRec353[2]) + fTemp216)));
			fRec363[0] = ((fSlow48 * fRec363[1]) + (fSlow49 * (fVec47[1] + fTemp214)));
			fRec362[0] = (fRec363[0] - (fSlow46 * ((fSlow52 * fRec362[2]) + (fSlow30 * fRec362[1]))));
			float fTemp217 = (fRec362[2] + (fRec362[0] + (2.f * fRec362[1])));
			float fTemp218 = (fSlow46 * fTemp217);
			fVec48[0] = fTemp218;
			fRec361[0] = ((fSlow59 * fRec361[1]) + (fSlow60 * ((fSlow62 * fVec48[1]) + (fSlow61 * fTemp217))));
			fRec360[0] = (fRec361[0] - (fSlow57 * ((fSlow63 * fRec360[2]) + (fSlow36 * fRec360[1]))));
			float fTemp219 = (fSlow42 * fRec359[1]);
			fRec359[0] = ((fSlow57 * (((fSlow35 * fRec360[0]) + (fSlow64 * fRec360[1])) + (fSlow35 * fRec360[2]))) - (fSlow39 * ((fSlow40 * fRec359[2]) + fTemp219)));
			fRec367[0] = ((fSlow59 * fRec367[1]) + (fSlow60 * (fVec48[1] + fTemp218)));
			fRec366[0] = (fRec367[0] - (fSlow57 * ((fSlow63 * fRec366[2]) + (fSlow36 * fRec366[1]))));
			float fTemp220 = (fRec366[2] + (fRec366[0] + (2.f * fRec366[1])));
			float fTemp221 = (fSlow57 * fTemp220);
			fVec49[0] = fTemp221;
			fRec365[0] = ((fSlow69 * fRec365[1]) + (fSlow70 * (fVec49[1] + fTemp221)));
			fRec364[0] = (fRec365[0] - (fSlow65 * ((fSlow71 * fRec364[2]) + (fSlow42 * fRec364[1]))));
			fRec369[0] = ((fSlow69 * fRec369[1]) + (fSlow70 * ((fSlow75 * fVec49[1]) + (fSlow74 * fTemp220))));
			fRec368[0] = (fRec369[0] - (fSlow65 * ((fSlow71 * fRec368[2]) + (fSlow42 * fRec368[1]))));
			float fTemp222 = ((((fSlow177 * (fRec348[2] + (fSlow39 * (fTemp212 + (fSlow40 * fRec348[0]))))) + (fSlow178 * (fRec353[2] + (fSlow39 * (fTemp216 + (fSlow40 * fRec353[0])))))) + (fSlow179 * (fRec359[2] + (fSlow39 * (fTemp219 + (fSlow40 * fRec359[0])))))) + (fSlow65 * ((fSlow180 * (fRec364[2] + (fRec364[0] + (2.f * fRec364[1])))) + (fSlow181 * (((fSlow41 * fRec368[0]) + (fSlow76 * fRec368[1])) + (fSlow41 * fRec368[2]))))));
			float fTemp223 = (fTemp209 + fTemp222);
			float fTemp224 = (fTemp196 + fTemp223);
			float fTemp225 = (fTemp169 + fTemp224);
			fVec50[(IOTA & 8191)] = (fTemp0 + (float(iTemp1) + (float(iTemp2) + (fTemp3 + (fSlow6 * (fTemp114 + fTemp225))))));
			fRec0[0] = fVec50[((IOTA - iSlow182) & 8191)];
			fVec51[0] = fSlow183;
			int iTemp226 = int(((fSlow183 - fVec51[1]) > 0.f));
			float fTemp227 = (fSlow4 * float(input1[i]));
			float fTemp228 = (float(iTemp1) + fTemp0);
			fVec52[(IOTA & 8191)] = (float(iTemp226) + (fTemp227 + ((fSlow5 * ((0.25f * fTemp114) - (0.25f * fTemp225))) + fTemp228)));
			fRec1[0] = fVec52[((IOTA - iSlow184) & 8191)];
			float fTemp229 = ((float(iTemp1) + (fTemp3 + float(iTemp2))) + fTemp0);
			float fTemp230 = ((0.25f * fTemp58) - (0.25f * fTemp113));
			float fTemp231 = ((0.25f * fTemp169) - (0.25f * fTemp224));
			fVec53[(IOTA & 8191)] = (fTemp229 + (fSlow5 * (fTemp230 + fTemp231)));
			fRec2[0] = fVec53[((IOTA - iSlow185) & 8191)];
			float fTemp232 = (float(iTemp226) + (fTemp227 + fTemp228));
			fVec54[(IOTA & 8191)] = (fTemp232 + (fSlow5 * (fTemp230 - fTemp231)));
			fRec3[0] = fVec54[((IOTA - iSlow186) & 8191)];
			float fTemp233 = ((0.25f * fTemp30) - (0.25f * fTemp57));
			float fTemp234 = ((0.25f * fTemp85) - (0.25f * fTemp112));
			float fTemp235 = (fTemp233 + fTemp234);
			float fTemp236 = ((0.25f * fTemp141) - (0.25f * fTemp168));
			float fTemp237 = ((0.25f * fTemp196) - (0.25f * fTemp223));
			float fTemp238 = (fTemp236 + fTemp237);
			fVec55[(IOTA & 8191)] = (fTemp229 + (fSlow5 * (fTemp235 + fTemp238)));
			fRec4[0] = fVec55[((IOTA - iSlow187) & 8191)];
			fVec56[(IOTA & 8191)] = (fTemp232 + (fSlow5 * (fTemp235 - fTemp238)));
			fRec5[0] = fVec56[((IOTA - iSlow188) & 8191)];
			float fTemp239 = (fTemp233 - fTemp234);
			float fTemp240 = (fTemp236 - fTemp237);
			fVec57[(IOTA & 8191)] = (fTemp229 + (fSlow5 * (fTemp239 + fTemp240)));
			fRec6[0] = fVec57[((IOTA - iSlow189) & 8191)];
			fVec58[(IOTA & 8191)] = (fTemp232 + (fSlow5 * (fTemp239 - fTemp240)));
			fRec7[0] = fVec58[((IOTA - iSlow190) & 8191)];
			float fTemp241 = ((0.25f * fTemp16) - (0.25f * fTemp29));
			float fTemp242 = ((0.25f * fTemp43) - (0.25f * fTemp56));
			float fTemp243 = (fTemp241 + fTemp242);
			float fTemp244 = ((0.25f * fTemp71) - (0.25f * fTemp84));
			float fTemp245 = ((0.25f * fTemp98) - (0.25f * fTemp111));
			float fTemp246 = (fTemp244 + fTemp245);
			float fTemp247 = (fTemp243 + fTemp246);
			float fTemp248 = ((0.25f * fTemp127) - (0.25f * fTemp140));
			float fTemp249 = ((0.25f * fTemp154) - (0.25f * fTemp167));
			float fTemp250 = (fTemp248 + fTemp249);
			float fTemp251 = ((0.25f * fTemp182) - (0.25f * fTemp195));
			float fTemp252 = ((0.25f * fTemp209) - (0.25f * fTemp222));
			float fTemp253 = (fTemp251 + fTemp252);
			float fTemp254 = (fTemp250 + fTemp253);
			fVec59[(IOTA & 8191)] = (fTemp229 + (fSlow5 * (fTemp247 + fTemp254)));
			fRec8[0] = fVec59[((IOTA - iSlow191) & 8191)];
			fVec60[(IOTA & 8191)] = (fTemp232 + (fSlow5 * (fTemp247 - fTemp254)));
			fRec9[0] = fVec60[((IOTA - iSlow192) & 8191)];
			float fTemp255 = (fTemp243 - fTemp246);
			float fTemp256 = (fTemp250 - fTemp253);
			fVec61[(IOTA & 8191)] = (fTemp229 + (fSlow5 * (fTemp255 + fTemp256)));
			fRec10[0] = fVec61[((IOTA - iSlow193) & 8191)];
			fVec62[(IOTA & 8191)] = (fTemp232 + (fSlow5 * (fTemp255 - fTemp256)));
			fRec11[0] = fVec62[((IOTA - iSlow194) & 8191)];
			float fTemp257 = (fTemp241 - fTemp242);
			float fTemp258 = (fTemp244 - fTemp245);
			float fTemp259 = (fTemp257 + fTemp258);
			float fTemp260 = (fTemp248 - fTemp249);
			float fTemp261 = (fTemp251 - fTemp252);
			float fTemp262 = (fTemp260 + fTemp261);
			fVec63[(IOTA & 8191)] = (fTemp229 + (fSlow5 * (fTemp259 + fTemp262)));
			fRec12[0] = fVec63[((IOTA - iSlow195) & 8191)];
			fVec64[(IOTA & 8191)] = (fTemp232 + (fSlow5 * (fTemp259 - fTemp262)));
			fRec13[0] = fVec64[((IOTA - iSlow196) & 8191)];
			float fTemp263 = (fTemp257 - fTemp258);
			float fTemp264 = (fTemp260 - fTemp261);
			fVec65[(IOTA & 8191)] = (fTemp229 + (fSlow5 * (fTemp263 + fTemp264)));
			fRec14[0] = fVec65[((IOTA - iSlow197) & 8191)];
			fVec66[(IOTA & 8191)] = (fTemp232 + (fSlow5 * (fTemp263 - fTemp264)));
			fRec15[0] = fVec66[((IOTA - iSlow198) & 8191)];
			output0[i] = FAUSTFLOAT((fSlow0 * (((((((fRec0[0] + fRec2[0]) + fRec4[0]) + fRec6[0]) + fRec8[0]) + fRec10[0]) + fRec12[0]) + fRec14[0])));
			output1[i] = FAUSTFLOAT((fSlow0 * (((((((fRec1[0] + fRec3[0]) + fRec5[0]) + fRec7[0]) + fRec9[0]) + fRec11[0]) + fRec13[0]) + fRec15[0])));
			iRec17[1] = iRec17[0];
			for (int j = 3; (j > 0); j = (j - 1)) {
				fRec16[j] = fRec16[(j - 1)];
				
			}
			fVec0[1] = fVec0[0];
			fVec1[1] = fVec1[0];
			fRec22[1] = fRec22[0];
			fRec21[2] = fRec21[1];
			fRec21[1] = fRec21[0];
			fRec20[2] = fRec20[1];
			fRec20[1] = fRec20[0];
			fRec19[2] = fRec19[1];
			fRec19[1] = fRec19[0];
			fRec18[2] = fRec18[1];
			fRec18[1] = fRec18[0];
			fRec28[1] = fRec28[0];
			fRec27[2] = fRec27[1];
			fRec27[1] = fRec27[0];
			fVec2[1] = fVec2[0];
			fRec26[1] = fRec26[0];
			fRec25[2] = fRec25[1];
			fRec25[1] = fRec25[0];
			fRec24[2] = fRec24[1];
			fRec24[1] = fRec24[0];
			fRec23[2] = fRec23[1];
			fRec23[1] = fRec23[0];
			fRec33[1] = fRec33[0];
			fRec32[2] = fRec32[1];
			fRec32[1] = fRec32[0];
			fVec3[1] = fVec3[0];
			fRec31[1] = fRec31[0];
			fRec30[2] = fRec30[1];
			fRec30[1] = fRec30[0];
			fRec29[2] = fRec29[1];
			fRec29[1] = fRec29[0];
			fRec37[1] = fRec37[0];
			fRec36[2] = fRec36[1];
			fRec36[1] = fRec36[0];
			fVec4[1] = fVec4[0];
			fRec35[1] = fRec35[0];
			fRec34[2] = fRec34[1];
			fRec34[1] = fRec34[0];
			fRec39[1] = fRec39[0];
			fRec38[2] = fRec38[1];
			fRec38[1] = fRec38[0];
			fRec44[1] = fRec44[0];
			fRec43[2] = fRec43[1];
			fRec43[1] = fRec43[0];
			fRec42[2] = fRec42[1];
			fRec42[1] = fRec42[0];
			fRec41[2] = fRec41[1];
			fRec41[1] = fRec41[0];
			fRec40[2] = fRec40[1];
			fRec40[1] = fRec40[0];
			fRec50[1] = fRec50[0];
			fRec49[2] = fRec49[1];
			fRec49[1] = fRec49[0];
			fVec5[1] = fVec5[0];
			fRec48[1] = fRec48[0];
			fRec47[2] = fRec47[1];
			fRec47[1] = fRec47[0];
			fRec46[2] = fRec46[1];
			fRec46[1] = fRec46[0];
			fRec45[2] = fRec45[1];
			fRec45[1] = fRec45[0];
			fRec55[1] = fRec55[0];
			fRec54[2] = fRec54[1];
			fRec54[1] = fRec54[0];
			fVec6[1] = fVec6[0];
			fRec53[1] = fRec53[0];
			fRec52[2] = fRec52[1];
			fRec52[1] = fRec52[0];
			fRec51[2] = fRec51[1];
			fRec51[1] = fRec51[0];
			fRec59[1] = fRec59[0];
			fRec58[2] = fRec58[1];
			fRec58[1] = fRec58[0];
			fVec7[1] = fVec7[0];
			fRec57[1] = fRec57[0];
			fRec56[2] = fRec56[1];
			fRec56[1] = fRec56[0];
			fRec61[1] = fRec61[0];
			fRec60[2] = fRec60[1];
			fRec60[1] = fRec60[0];
			fRec66[1] = fRec66[0];
			fRec65[2] = fRec65[1];
			fRec65[1] = fRec65[0];
			fRec64[2] = fRec64[1];
			fRec64[1] = fRec64[0];
			fRec63[2] = fRec63[1];
			fRec63[1] = fRec63[0];
			fRec62[2] = fRec62[1];
			fRec62[1] = fRec62[0];
			fRec72[1] = fRec72[0];
			fRec71[2] = fRec71[1];
			fRec71[1] = fRec71[0];
			fVec8[1] = fVec8[0];
			fRec70[1] = fRec70[0];
			fRec69[2] = fRec69[1];
			fRec69[1] = fRec69[0];
			fRec68[2] = fRec68[1];
			fRec68[1] = fRec68[0];
			fRec67[2] = fRec67[1];
			fRec67[1] = fRec67[0];
			fRec77[1] = fRec77[0];
			fRec76[2] = fRec76[1];
			fRec76[1] = fRec76[0];
			fVec9[1] = fVec9[0];
			fRec75[1] = fRec75[0];
			fRec74[2] = fRec74[1];
			fRec74[1] = fRec74[0];
			fRec73[2] = fRec73[1];
			fRec73[1] = fRec73[0];
			fRec81[1] = fRec81[0];
			fRec80[2] = fRec80[1];
			fRec80[1] = fRec80[0];
			fVec10[1] = fVec10[0];
			fRec79[1] = fRec79[0];
			fRec78[2] = fRec78[1];
			fRec78[1] = fRec78[0];
			fRec83[1] = fRec83[0];
			fRec82[2] = fRec82[1];
			fRec82[1] = fRec82[0];
			fRec88[1] = fRec88[0];
			fRec87[2] = fRec87[1];
			fRec87[1] = fRec87[0];
			fRec86[2] = fRec86[1];
			fRec86[1] = fRec86[0];
			fRec85[2] = fRec85[1];
			fRec85[1] = fRec85[0];
			fRec84[2] = fRec84[1];
			fRec84[1] = fRec84[0];
			fRec94[1] = fRec94[0];
			fRec93[2] = fRec93[1];
			fRec93[1] = fRec93[0];
			fVec11[1] = fVec11[0];
			fRec92[1] = fRec92[0];
			fRec91[2] = fRec91[1];
			fRec91[1] = fRec91[0];
			fRec90[2] = fRec90[1];
			fRec90[1] = fRec90[0];
			fRec89[2] = fRec89[1];
			fRec89[1] = fRec89[0];
			fRec99[1] = fRec99[0];
			fRec98[2] = fRec98[1];
			fRec98[1] = fRec98[0];
			fVec12[1] = fVec12[0];
			fRec97[1] = fRec97[0];
			fRec96[2] = fRec96[1];
			fRec96[1] = fRec96[0];
			fRec95[2] = fRec95[1];
			fRec95[1] = fRec95[0];
			fRec103[1] = fRec103[0];
			fRec102[2] = fRec102[1];
			fRec102[1] = fRec102[0];
			fVec13[1] = fVec13[0];
			fRec101[1] = fRec101[0];
			fRec100[2] = fRec100[1];
			fRec100[1] = fRec100[0];
			fRec105[1] = fRec105[0];
			fRec104[2] = fRec104[1];
			fRec104[1] = fRec104[0];
			fRec110[1] = fRec110[0];
			fRec109[2] = fRec109[1];
			fRec109[1] = fRec109[0];
			fRec108[2] = fRec108[1];
			fRec108[1] = fRec108[0];
			fRec107[2] = fRec107[1];
			fRec107[1] = fRec107[0];
			fRec106[2] = fRec106[1];
			fRec106[1] = fRec106[0];
			fRec116[1] = fRec116[0];
			fRec115[2] = fRec115[1];
			fRec115[1] = fRec115[0];
			fVec14[1] = fVec14[0];
			fRec114[1] = fRec114[0];
			fRec113[2] = fRec113[1];
			fRec113[1] = fRec113[0];
			fRec112[2] = fRec112[1];
			fRec112[1] = fRec112[0];
			fRec111[2] = fRec111[1];
			fRec111[1] = fRec111[0];
			fRec121[1] = fRec121[0];
			fRec120[2] = fRec120[1];
			fRec120[1] = fRec120[0];
			fVec15[1] = fVec15[0];
			fRec119[1] = fRec119[0];
			fRec118[2] = fRec118[1];
			fRec118[1] = fRec118[0];
			fRec117[2] = fRec117[1];
			fRec117[1] = fRec117[0];
			fRec125[1] = fRec125[0];
			fRec124[2] = fRec124[1];
			fRec124[1] = fRec124[0];
			fVec16[1] = fVec16[0];
			fRec123[1] = fRec123[0];
			fRec122[2] = fRec122[1];
			fRec122[1] = fRec122[0];
			fRec127[1] = fRec127[0];
			fRec126[2] = fRec126[1];
			fRec126[1] = fRec126[0];
			fRec132[1] = fRec132[0];
			fRec131[2] = fRec131[1];
			fRec131[1] = fRec131[0];
			fRec130[2] = fRec130[1];
			fRec130[1] = fRec130[0];
			fRec129[2] = fRec129[1];
			fRec129[1] = fRec129[0];
			fRec128[2] = fRec128[1];
			fRec128[1] = fRec128[0];
			fRec138[1] = fRec138[0];
			fRec137[2] = fRec137[1];
			fRec137[1] = fRec137[0];
			fVec17[1] = fVec17[0];
			fRec136[1] = fRec136[0];
			fRec135[2] = fRec135[1];
			fRec135[1] = fRec135[0];
			fRec134[2] = fRec134[1];
			fRec134[1] = fRec134[0];
			fRec133[2] = fRec133[1];
			fRec133[1] = fRec133[0];
			fRec143[1] = fRec143[0];
			fRec142[2] = fRec142[1];
			fRec142[1] = fRec142[0];
			fVec18[1] = fVec18[0];
			fRec141[1] = fRec141[0];
			fRec140[2] = fRec140[1];
			fRec140[1] = fRec140[0];
			fRec139[2] = fRec139[1];
			fRec139[1] = fRec139[0];
			fRec147[1] = fRec147[0];
			fRec146[2] = fRec146[1];
			fRec146[1] = fRec146[0];
			fVec19[1] = fVec19[0];
			fRec145[1] = fRec145[0];
			fRec144[2] = fRec144[1];
			fRec144[1] = fRec144[0];
			fRec149[1] = fRec149[0];
			fRec148[2] = fRec148[1];
			fRec148[1] = fRec148[0];
			fRec154[1] = fRec154[0];
			fRec153[2] = fRec153[1];
			fRec153[1] = fRec153[0];
			fRec152[2] = fRec152[1];
			fRec152[1] = fRec152[0];
			fRec151[2] = fRec151[1];
			fRec151[1] = fRec151[0];
			fRec150[2] = fRec150[1];
			fRec150[1] = fRec150[0];
			fRec160[1] = fRec160[0];
			fRec159[2] = fRec159[1];
			fRec159[1] = fRec159[0];
			fVec20[1] = fVec20[0];
			fRec158[1] = fRec158[0];
			fRec157[2] = fRec157[1];
			fRec157[1] = fRec157[0];
			fRec156[2] = fRec156[1];
			fRec156[1] = fRec156[0];
			fRec155[2] = fRec155[1];
			fRec155[1] = fRec155[0];
			fRec165[1] = fRec165[0];
			fRec164[2] = fRec164[1];
			fRec164[1] = fRec164[0];
			fVec21[1] = fVec21[0];
			fRec163[1] = fRec163[0];
			fRec162[2] = fRec162[1];
			fRec162[1] = fRec162[0];
			fRec161[2] = fRec161[1];
			fRec161[1] = fRec161[0];
			fRec169[1] = fRec169[0];
			fRec168[2] = fRec168[1];
			fRec168[1] = fRec168[0];
			fVec22[1] = fVec22[0];
			fRec167[1] = fRec167[0];
			fRec166[2] = fRec166[1];
			fRec166[1] = fRec166[0];
			fRec171[1] = fRec171[0];
			fRec170[2] = fRec170[1];
			fRec170[1] = fRec170[0];
			fRec176[1] = fRec176[0];
			fRec175[2] = fRec175[1];
			fRec175[1] = fRec175[0];
			fRec174[2] = fRec174[1];
			fRec174[1] = fRec174[0];
			fRec173[2] = fRec173[1];
			fRec173[1] = fRec173[0];
			fRec172[2] = fRec172[1];
			fRec172[1] = fRec172[0];
			fRec182[1] = fRec182[0];
			fRec181[2] = fRec181[1];
			fRec181[1] = fRec181[0];
			fVec23[1] = fVec23[0];
			fRec180[1] = fRec180[0];
			fRec179[2] = fRec179[1];
			fRec179[1] = fRec179[0];
			fRec178[2] = fRec178[1];
			fRec178[1] = fRec178[0];
			fRec177[2] = fRec177[1];
			fRec177[1] = fRec177[0];
			fRec187[1] = fRec187[0];
			fRec186[2] = fRec186[1];
			fRec186[1] = fRec186[0];
			fVec24[1] = fVec24[0];
			fRec185[1] = fRec185[0];
			fRec184[2] = fRec184[1];
			fRec184[1] = fRec184[0];
			fRec183[2] = fRec183[1];
			fRec183[1] = fRec183[0];
			fRec191[1] = fRec191[0];
			fRec190[2] = fRec190[1];
			fRec190[1] = fRec190[0];
			fVec25[1] = fVec25[0];
			fRec189[1] = fRec189[0];
			fRec188[2] = fRec188[1];
			fRec188[1] = fRec188[0];
			fRec193[1] = fRec193[0];
			fRec192[2] = fRec192[1];
			fRec192[1] = fRec192[0];
			fRec198[1] = fRec198[0];
			fRec197[2] = fRec197[1];
			fRec197[1] = fRec197[0];
			fRec196[2] = fRec196[1];
			fRec196[1] = fRec196[0];
			fRec195[2] = fRec195[1];
			fRec195[1] = fRec195[0];
			fRec194[2] = fRec194[1];
			fRec194[1] = fRec194[0];
			fRec204[1] = fRec204[0];
			fRec203[2] = fRec203[1];
			fRec203[1] = fRec203[0];
			fVec26[1] = fVec26[0];
			fRec202[1] = fRec202[0];
			fRec201[2] = fRec201[1];
			fRec201[1] = fRec201[0];
			fRec200[2] = fRec200[1];
			fRec200[1] = fRec200[0];
			fRec199[2] = fRec199[1];
			fRec199[1] = fRec199[0];
			fRec209[1] = fRec209[0];
			fRec208[2] = fRec208[1];
			fRec208[1] = fRec208[0];
			fVec27[1] = fVec27[0];
			fRec207[1] = fRec207[0];
			fRec206[2] = fRec206[1];
			fRec206[1] = fRec206[0];
			fRec205[2] = fRec205[1];
			fRec205[1] = fRec205[0];
			fRec213[1] = fRec213[0];
			fRec212[2] = fRec212[1];
			fRec212[1] = fRec212[0];
			fVec28[1] = fVec28[0];
			fRec211[1] = fRec211[0];
			fRec210[2] = fRec210[1];
			fRec210[1] = fRec210[0];
			fRec215[1] = fRec215[0];
			fRec214[2] = fRec214[1];
			fRec214[1] = fRec214[0];
			fRec220[1] = fRec220[0];
			fRec219[2] = fRec219[1];
			fRec219[1] = fRec219[0];
			fRec218[2] = fRec218[1];
			fRec218[1] = fRec218[0];
			fRec217[2] = fRec217[1];
			fRec217[1] = fRec217[0];
			fRec216[2] = fRec216[1];
			fRec216[1] = fRec216[0];
			fRec226[1] = fRec226[0];
			fRec225[2] = fRec225[1];
			fRec225[1] = fRec225[0];
			fVec29[1] = fVec29[0];
			fRec224[1] = fRec224[0];
			fRec223[2] = fRec223[1];
			fRec223[1] = fRec223[0];
			fRec222[2] = fRec222[1];
			fRec222[1] = fRec222[0];
			fRec221[2] = fRec221[1];
			fRec221[1] = fRec221[0];
			fRec231[1] = fRec231[0];
			fRec230[2] = fRec230[1];
			fRec230[1] = fRec230[0];
			fVec30[1] = fVec30[0];
			fRec229[1] = fRec229[0];
			fRec228[2] = fRec228[1];
			fRec228[1] = fRec228[0];
			fRec227[2] = fRec227[1];
			fRec227[1] = fRec227[0];
			fRec235[1] = fRec235[0];
			fRec234[2] = fRec234[1];
			fRec234[1] = fRec234[0];
			fVec31[1] = fVec31[0];
			fRec233[1] = fRec233[0];
			fRec232[2] = fRec232[1];
			fRec232[1] = fRec232[0];
			fRec237[1] = fRec237[0];
			fRec236[2] = fRec236[1];
			fRec236[1] = fRec236[0];
			fRec242[1] = fRec242[0];
			fRec241[2] = fRec241[1];
			fRec241[1] = fRec241[0];
			fRec240[2] = fRec240[1];
			fRec240[1] = fRec240[0];
			fRec239[2] = fRec239[1];
			fRec239[1] = fRec239[0];
			fRec238[2] = fRec238[1];
			fRec238[1] = fRec238[0];
			fRec248[1] = fRec248[0];
			fRec247[2] = fRec247[1];
			fRec247[1] = fRec247[0];
			fVec32[1] = fVec32[0];
			fRec246[1] = fRec246[0];
			fRec245[2] = fRec245[1];
			fRec245[1] = fRec245[0];
			fRec244[2] = fRec244[1];
			fRec244[1] = fRec244[0];
			fRec243[2] = fRec243[1];
			fRec243[1] = fRec243[0];
			fRec253[1] = fRec253[0];
			fRec252[2] = fRec252[1];
			fRec252[1] = fRec252[0];
			fVec33[1] = fVec33[0];
			fRec251[1] = fRec251[0];
			fRec250[2] = fRec250[1];
			fRec250[1] = fRec250[0];
			fRec249[2] = fRec249[1];
			fRec249[1] = fRec249[0];
			fRec257[1] = fRec257[0];
			fRec256[2] = fRec256[1];
			fRec256[1] = fRec256[0];
			fVec34[1] = fVec34[0];
			fRec255[1] = fRec255[0];
			fRec254[2] = fRec254[1];
			fRec254[1] = fRec254[0];
			fRec259[1] = fRec259[0];
			fRec258[2] = fRec258[1];
			fRec258[1] = fRec258[0];
			fRec264[1] = fRec264[0];
			fRec263[2] = fRec263[1];
			fRec263[1] = fRec263[0];
			fRec262[2] = fRec262[1];
			fRec262[1] = fRec262[0];
			fRec261[2] = fRec261[1];
			fRec261[1] = fRec261[0];
			fRec260[2] = fRec260[1];
			fRec260[1] = fRec260[0];
			fRec270[1] = fRec270[0];
			fRec269[2] = fRec269[1];
			fRec269[1] = fRec269[0];
			fVec35[1] = fVec35[0];
			fRec268[1] = fRec268[0];
			fRec267[2] = fRec267[1];
			fRec267[1] = fRec267[0];
			fRec266[2] = fRec266[1];
			fRec266[1] = fRec266[0];
			fRec265[2] = fRec265[1];
			fRec265[1] = fRec265[0];
			fRec275[1] = fRec275[0];
			fRec274[2] = fRec274[1];
			fRec274[1] = fRec274[0];
			fVec36[1] = fVec36[0];
			fRec273[1] = fRec273[0];
			fRec272[2] = fRec272[1];
			fRec272[1] = fRec272[0];
			fRec271[2] = fRec271[1];
			fRec271[1] = fRec271[0];
			fRec279[1] = fRec279[0];
			fRec278[2] = fRec278[1];
			fRec278[1] = fRec278[0];
			fVec37[1] = fVec37[0];
			fRec277[1] = fRec277[0];
			fRec276[2] = fRec276[1];
			fRec276[1] = fRec276[0];
			fRec281[1] = fRec281[0];
			fRec280[2] = fRec280[1];
			fRec280[1] = fRec280[0];
			fRec286[1] = fRec286[0];
			fRec285[2] = fRec285[1];
			fRec285[1] = fRec285[0];
			fRec284[2] = fRec284[1];
			fRec284[1] = fRec284[0];
			fRec283[2] = fRec283[1];
			fRec283[1] = fRec283[0];
			fRec282[2] = fRec282[1];
			fRec282[1] = fRec282[0];
			fRec292[1] = fRec292[0];
			fRec291[2] = fRec291[1];
			fRec291[1] = fRec291[0];
			fVec38[1] = fVec38[0];
			fRec290[1] = fRec290[0];
			fRec289[2] = fRec289[1];
			fRec289[1] = fRec289[0];
			fRec288[2] = fRec288[1];
			fRec288[1] = fRec288[0];
			fRec287[2] = fRec287[1];
			fRec287[1] = fRec287[0];
			fRec297[1] = fRec297[0];
			fRec296[2] = fRec296[1];
			fRec296[1] = fRec296[0];
			fVec39[1] = fVec39[0];
			fRec295[1] = fRec295[0];
			fRec294[2] = fRec294[1];
			fRec294[1] = fRec294[0];
			fRec293[2] = fRec293[1];
			fRec293[1] = fRec293[0];
			fRec301[1] = fRec301[0];
			fRec300[2] = fRec300[1];
			fRec300[1] = fRec300[0];
			fVec40[1] = fVec40[0];
			fRec299[1] = fRec299[0];
			fRec298[2] = fRec298[1];
			fRec298[1] = fRec298[0];
			fRec303[1] = fRec303[0];
			fRec302[2] = fRec302[1];
			fRec302[1] = fRec302[0];
			fRec308[1] = fRec308[0];
			fRec307[2] = fRec307[1];
			fRec307[1] = fRec307[0];
			fRec306[2] = fRec306[1];
			fRec306[1] = fRec306[0];
			fRec305[2] = fRec305[1];
			fRec305[1] = fRec305[0];
			fRec304[2] = fRec304[1];
			fRec304[1] = fRec304[0];
			fRec314[1] = fRec314[0];
			fRec313[2] = fRec313[1];
			fRec313[1] = fRec313[0];
			fVec41[1] = fVec41[0];
			fRec312[1] = fRec312[0];
			fRec311[2] = fRec311[1];
			fRec311[1] = fRec311[0];
			fRec310[2] = fRec310[1];
			fRec310[1] = fRec310[0];
			fRec309[2] = fRec309[1];
			fRec309[1] = fRec309[0];
			fRec319[1] = fRec319[0];
			fRec318[2] = fRec318[1];
			fRec318[1] = fRec318[0];
			fVec42[1] = fVec42[0];
			fRec317[1] = fRec317[0];
			fRec316[2] = fRec316[1];
			fRec316[1] = fRec316[0];
			fRec315[2] = fRec315[1];
			fRec315[1] = fRec315[0];
			fRec323[1] = fRec323[0];
			fRec322[2] = fRec322[1];
			fRec322[1] = fRec322[0];
			fVec43[1] = fVec43[0];
			fRec321[1] = fRec321[0];
			fRec320[2] = fRec320[1];
			fRec320[1] = fRec320[0];
			fRec325[1] = fRec325[0];
			fRec324[2] = fRec324[1];
			fRec324[1] = fRec324[0];
			fRec330[1] = fRec330[0];
			fRec329[2] = fRec329[1];
			fRec329[1] = fRec329[0];
			fRec328[2] = fRec328[1];
			fRec328[1] = fRec328[0];
			fRec327[2] = fRec327[1];
			fRec327[1] = fRec327[0];
			fRec326[2] = fRec326[1];
			fRec326[1] = fRec326[0];
			fRec336[1] = fRec336[0];
			fRec335[2] = fRec335[1];
			fRec335[1] = fRec335[0];
			fVec44[1] = fVec44[0];
			fRec334[1] = fRec334[0];
			fRec333[2] = fRec333[1];
			fRec333[1] = fRec333[0];
			fRec332[2] = fRec332[1];
			fRec332[1] = fRec332[0];
			fRec331[2] = fRec331[1];
			fRec331[1] = fRec331[0];
			fRec341[1] = fRec341[0];
			fRec340[2] = fRec340[1];
			fRec340[1] = fRec340[0];
			fVec45[1] = fVec45[0];
			fRec339[1] = fRec339[0];
			fRec338[2] = fRec338[1];
			fRec338[1] = fRec338[0];
			fRec337[2] = fRec337[1];
			fRec337[1] = fRec337[0];
			fRec345[1] = fRec345[0];
			fRec344[2] = fRec344[1];
			fRec344[1] = fRec344[0];
			fVec46[1] = fVec46[0];
			fRec343[1] = fRec343[0];
			fRec342[2] = fRec342[1];
			fRec342[1] = fRec342[0];
			fRec347[1] = fRec347[0];
			fRec346[2] = fRec346[1];
			fRec346[1] = fRec346[0];
			fRec352[1] = fRec352[0];
			fRec351[2] = fRec351[1];
			fRec351[1] = fRec351[0];
			fRec350[2] = fRec350[1];
			fRec350[1] = fRec350[0];
			fRec349[2] = fRec349[1];
			fRec349[1] = fRec349[0];
			fRec348[2] = fRec348[1];
			fRec348[1] = fRec348[0];
			fRec358[1] = fRec358[0];
			fRec357[2] = fRec357[1];
			fRec357[1] = fRec357[0];
			fVec47[1] = fVec47[0];
			fRec356[1] = fRec356[0];
			fRec355[2] = fRec355[1];
			fRec355[1] = fRec355[0];
			fRec354[2] = fRec354[1];
			fRec354[1] = fRec354[0];
			fRec353[2] = fRec353[1];
			fRec353[1] = fRec353[0];
			fRec363[1] = fRec363[0];
			fRec362[2] = fRec362[1];
			fRec362[1] = fRec362[0];
			fVec48[1] = fVec48[0];
			fRec361[1] = fRec361[0];
			fRec360[2] = fRec360[1];
			fRec360[1] = fRec360[0];
			fRec359[2] = fRec359[1];
			fRec359[1] = fRec359[0];
			fRec367[1] = fRec367[0];
			fRec366[2] = fRec366[1];
			fRec366[1] = fRec366[0];
			fVec49[1] = fVec49[0];
			fRec365[1] = fRec365[0];
			fRec364[2] = fRec364[1];
			fRec364[1] = fRec364[0];
			fRec369[1] = fRec369[0];
			fRec368[2] = fRec368[1];
			fRec368[1] = fRec368[0];
			IOTA = (IOTA + 1);
			fRec0[2] = fRec0[1];
			fRec0[1] = fRec0[0];
			fVec51[1] = fVec51[0];
			fRec1[2] = fRec1[1];
			fRec1[1] = fRec1[0];
			fRec2[2] = fRec2[1];
			fRec2[1] = fRec2[0];
			fRec3[2] = fRec3[1];
			fRec3[1] = fRec3[0];
			fRec4[2] = fRec4[1];
			fRec4[1] = fRec4[0];
			fRec5[2] = fRec5[1];
			fRec5[1] = fRec5[0];
			fRec6[2] = fRec6[1];
			fRec6[1] = fRec6[0];
			fRec7[2] = fRec7[1];
			fRec7[1] = fRec7[0];
			fRec8[2] = fRec8[1];
			fRec8[1] = fRec8[0];
			fRec9[2] = fRec9[1];
			fRec9[1] = fRec9[0];
			fRec10[2] = fRec10[1];
			fRec10[1] = fRec10[0];
			fRec11[2] = fRec11[1];
			fRec11[1] = fRec11[0];
			fRec12[2] = fRec12[1];
			fRec12[1] = fRec12[0];
			fRec13[2] = fRec13[1];
			fRec13[1] = fRec13[0];
			fRec14[2] = fRec14[1];
			fRec14[1] = fRec14[0];
			fRec15[2] = fRec15[1];
			fRec15[1] = fRec15[0];
			
		}
		
	}

	
};


#ifdef FAUST_UIMACROS
	#define FAUST_INPUTS 2
	#define FAUST_OUTPUTS 2
	#define FAUST_ACTIVES 0
	#define FAUST_PASSIVES 0
	FAUST_ADDHORIZONTALSLIDER("reverbDesigner/FEEDBACK DELAY NETWORK (FDN) REVERBERATOR, ORDER 16     [tooltip: See Faust's effect.lib for documentation and references]/[1] Band Crossover Frequencies/Band 0 upper edge in Hz", fhslider6, 5e+02f, 1e+02f, 1e+04f, 1.0f);
	FAUST_ADDHORIZONTALSLIDER("reverbDesigner/FEEDBACK DELAY NETWORK (FDN) REVERBERATOR, ORDER 16     [tooltip: See Faust's effect.lib for documentation and references]/[1] Band Crossover Frequencies/Band 1 upper edge in Hz", fhslider5, 1e+03f, 1e+02f, 1e+04f, 1.0f);
	FAUST_ADDHORIZONTALSLIDER("reverbDesigner/FEEDBACK DELAY NETWORK (FDN) REVERBERATOR, ORDER 16     [tooltip: See Faust's effect.lib for documentation and references]/[1] Band Crossover Frequencies/Band 2 upper edge in Hz", fhslider4, 2e+03f, 1e+02f, 1e+04f, 1.0f);
	FAUST_ADDHORIZONTALSLIDER("reverbDesigner/FEEDBACK DELAY NETWORK (FDN) REVERBERATOR, ORDER 16     [tooltip: See Faust's effect.lib for documentation and references]/[1] Band Crossover Frequencies/Band 3 upper edge in Hz", fhslider3, 4e+03f, 1e+02f, 1e+04f, 1.0f);
	FAUST_ADDVERTICALSLIDER("reverbDesigner/FEEDBACK DELAY NETWORK (FDN) REVERBERATOR, ORDER 16     [tooltip: See Faust's effect.lib for documentation and references]/[2] Band Decay Times (T60)/0", fvslider3, 8.4f, 0.1f, 1e+01f, 0.1f);
	FAUST_ADDVERTICALSLIDER("reverbDesigner/FEEDBACK DELAY NETWORK (FDN) REVERBERATOR, ORDER 16     [tooltip: See Faust's effect.lib for documentation and references]/[2] Band Decay Times (T60)/1", fvslider4, 6.5f, 0.1f, 1e+01f, 0.1f);
	FAUST_ADDVERTICALSLIDER("reverbDesigner/FEEDBACK DELAY NETWORK (FDN) REVERBERATOR, ORDER 16     [tooltip: See Faust's effect.lib for documentation and references]/[2] Band Decay Times (T60)/2", fvslider2, 5.0f, 0.1f, 1e+01f, 0.1f);
	FAUST_ADDVERTICALSLIDER("reverbDesigner/FEEDBACK DELAY NETWORK (FDN) REVERBERATOR, ORDER 16     [tooltip: See Faust's effect.lib for documentation and references]/[2] Band Decay Times (T60)/3", fvslider1, 3.8f, 0.1f, 1e+01f, 0.1f);
	FAUST_ADDVERTICALSLIDER("reverbDesigner/FEEDBACK DELAY NETWORK (FDN) REVERBERATOR, ORDER 16     [tooltip: See Faust's effect.lib for documentation and references]/[2] Band Decay Times (T60)/4", fvslider0, 2.7f, 0.1f, 1e+01f, 0.1f);
	FAUST_ADDHORIZONTALSLIDER("reverbDesigner/FEEDBACK DELAY NETWORK (FDN) REVERBERATOR, ORDER 16     [tooltip: See Faust's effect.lib for documentation and references]/[3] Room Dimensions/fmin acoustic ray length", fhslider1, 46.0f, 0.1f, 63.0f, 0.1f);
	FAUST_ADDHORIZONTALSLIDER("reverbDesigner/FEEDBACK DELAY NETWORK (FDN) REVERBERATOR, ORDER 16     [tooltip: See Faust's effect.lib for documentation and references]/[3] Room Dimensions/fmax acoustic ray length", fhslider2, 63.0f, 0.1f, 63.0f, 0.1f);
	FAUST_ADDCHECKBOX("reverbDesigner/FEEDBACK DELAY NETWORK (FDN) REVERBERATOR, ORDER 16     [tooltip: See Faust's effect.lib for documentation and references]/[4] Input Controls/[1] Input Config/Mute Ext Inputs", fcheckbox1);
	FAUST_ADDCHECKBOX("reverbDesigner/FEEDBACK DELAY NETWORK (FDN) REVERBERATOR, ORDER 16     [tooltip: See Faust's effect.lib for documentation and references]/[4] Input Controls/[1] Input Config/Pink Noise", fcheckbox0);
	FAUST_ADDBUTTON("reverbDesigner/FEEDBACK DELAY NETWORK (FDN) REVERBERATOR, ORDER 16     [tooltip: See Faust's effect.lib for documentation and references]/[4] Input Controls/[2] Impulse Selection/Left", fbutton1);
	FAUST_ADDBUTTON("reverbDesigner/FEEDBACK DELAY NETWORK (FDN) REVERBERATOR, ORDER 16     [tooltip: See Faust's effect.lib for documentation and references]/[4] Input Controls/[2] Impulse Selection/Center", fbutton0);
	FAUST_ADDBUTTON("reverbDesigner/FEEDBACK DELAY NETWORK (FDN) REVERBERATOR, ORDER 16     [tooltip: See Faust's effect.lib for documentation and references]/[4] Input Controls/[2] Impulse Selection/Right", fbutton3);
	FAUST_ADDBUTTON("reverbDesigner/FEEDBACK DELAY NETWORK (FDN) REVERBERATOR, ORDER 16     [tooltip: See Faust's effect.lib for documentation and references]/[4] Input Controls/[3] Reverb State/Quench", fbutton2);
	FAUST_ADDHORIZONTALSLIDER("reverbDesigner/Output Level (dB)", fhslider0, -4e+01f, -7e+01f, 2e+01f, 0.1f);
#endif

int main(int argc, char *argv[])
{
	ReverbDesigner DSP;
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
    
    class ReverbDesigner_wrap : public ReverbDesigner
    {
    public:
        JSUI *ui;
    };
    
    //constructor
    void *REVERBDESIGNER_constructor(int samplingFreq) {
        
        // Make a new reverbDesigner object
        ReverbDesigner_wrap* n = new ReverbDesigner_wrap();
        n->ui = new JSUI();
        // Init it with samplingFreq supplied... should we give a sample size here too?
        n->init(samplingFreq);
        n->buildUserInterface(n->ui);
        n->ui->iter = n->ui->uiMap.begin();

        return n;
    }

    int REVERBDESIGNER_getNumParams(ReverbDesigner_wrap *n)
    {
        return n->ui->uiMap.size();
    }
    
    FAUSTFLOAT* REVERBDESIGNER_getNextParam(ReverbDesigner_wrap *n, char *key)
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
    
    int REVERBDESIGNER_compute(ReverbDesigner_wrap *n, int count, FAUSTFLOAT** inputs, FAUSTFLOAT** outputs) {
        n->compute(count, inputs, outputs);
        return 1;
    }
    
    int REVERBDESIGNER_getNumInputs(ReverbDesigner_wrap *n){
        return n->getNumInputs();
    }
    
    int REVERBDESIGNER_getNumOutputs(ReverbDesigner_wrap *n){
        return n->getNumOutputs();
    }

    void REVERBDESIGNER_destructor(ReverbDesigner_wrap *n) {
        delete n;
    }
}
