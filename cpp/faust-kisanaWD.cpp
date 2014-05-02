//-----------------------------------------------------
// name: "Kisana"
// author: "Yann Orlarey"
//
// Code generated with Faust 0.9.67 (http://faust.grame.fr)
//-----------------------------------------------------
/* link with  */
#include <math.h>
#ifndef FAUSTPOWER
#define FAUSTPOWER
#include <cmath>
template <int N> inline float faustpower(float x)          { return powf(x,N); } 
template <int N> inline double faustpower(double x)        { return pow(x,N); }
template <int N> inline int faustpower(int x)              { return faustpower<N/2>(x) * faustpower<N-N/2>(x); } 
template <> 	 inline int faustpower<0>(int x)            { return 1; }
template <> 	 inline int faustpower<1>(int x)            { return x; }
#endif
/************************************************************************
 ************************************************************************
    FAUST Architecture File
	Copyright (C) 2003-2011 GRAME, Centre National de Creation Musicale
    ---------------------------------------------------------------------

	This is sample code. This file is provided as an example of minimal
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

#ifndef FAUST_GUI_H
#define FAUST_GUI_H

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
    virtual void addVerticalSlider(const char* label, FAUSTFLOAT* zone, FAUSTFLOAT init, FAUSTFLOAT min, FAUSTFLOAT max, FAUSTFLOAT step) = 0;
    virtual void addHorizontalSlider(const char* label, FAUSTFLOAT* zone, FAUSTFLOAT init, FAUSTFLOAT min, FAUSTFLOAT max, FAUSTFLOAT step) = 0;
    virtual void addNumEntry(const char* label, FAUSTFLOAT* zone, FAUSTFLOAT init, FAUSTFLOAT min, FAUSTFLOAT max, FAUSTFLOAT step) = 0;

    // -- passive widgets

    virtual void addHorizontalBargraph(const char* label, FAUSTFLOAT* zone, FAUSTFLOAT min, FAUSTFLOAT max) = 0;
    virtual void addVerticalBargraph(const char* label, FAUSTFLOAT* zone, FAUSTFLOAT min, FAUSTFLOAT max) = 0;

	// -- metadata declarations

    virtual void declare(FAUSTFLOAT*, const char*, const char*) {}
};

#endif
#include <list>
#include <map>

/*******************************************************************************
 * GUI : Abstract Graphic User Interface
 * Provides additional macchanismes to synchronize widgets and zones. Widgets
 * should both reflect the value of a zone and allow to change this value.
 ******************************************************************************/

class uiItem;
typedef void (*uiCallback)(FAUSTFLOAT val, void* data);

class clist : public std::list<uiItem*>
{
    public:
    
        virtual ~clist();
        
};

class GUI : public UI
{
    
	typedef std::map<FAUSTFLOAT*, clist*> zmap;
	
 private:
 	static std::list<GUI*>	fGuiList;
	zmap                    fZoneMap;
	bool                    fStopped;
	
 public:
		
    GUI() : fStopped(false) 
    {	
		fGuiList.push_back(this);
	}
	
    virtual ~GUI() 
    {   
        // delete all 
        zmap::iterator g;
        for (g = fZoneMap.begin(); g != fZoneMap.end(); g++) {
            delete (*g).second;
        }
        // suppress 'this' in static fGuiList
        fGuiList.remove(this);
    }

	// -- registerZone(z,c) : zone management
	
	void registerZone(FAUSTFLOAT* z, uiItem* c)
	{
		if (fZoneMap.find(z) == fZoneMap.end()) fZoneMap[z] = new clist();
		fZoneMap[z]->push_back(c);
	} 	

	void updateAllZones();
	
	void updateZone(FAUSTFLOAT* z);
	
	static void updateAllGuis()
	{
		std::list<GUI*>::iterator g;
		for (g = fGuiList.begin(); g != fGuiList.end(); g++) {
			(*g)->updateAllZones();
		}
	}
    void addCallback(FAUSTFLOAT* zone, uiCallback foo, void* data);
    virtual void show() {};	
    virtual void run() {};
	
	void stop()		{ fStopped = true; }
	bool stopped() 	{ return fStopped; }

    virtual void declare(FAUSTFLOAT* , const char* , const char* ) {}
};

/**
 * User Interface Item: abstract definition
 */

class uiItem
{
  protected :
		  
	GUI*            fGUI;
	FAUSTFLOAT*		fZone;
	FAUSTFLOAT		fCache;
	
	uiItem (GUI* ui, FAUSTFLOAT* zone) : fGUI(ui), fZone(zone), fCache(-123456.654321) 
	{ 
 		ui->registerZone(zone, this); 
 	}
	
  public :
  
	virtual ~uiItem() 
    {}
	
	void modifyZone(FAUSTFLOAT v) 	
	{ 
		fCache = v;
		if (*fZone != v) {
			*fZone = v;
			fGUI->updateZone(fZone);
		}
	}
		  	
	FAUSTFLOAT		cache()			{ return fCache; }
	virtual void 	reflectZone() 	= 0;	
};

/**
 * Callback Item
 */

struct uiCallbackItem : public uiItem
{
	uiCallback	fCallback;
	void*		fData;
	
	uiCallbackItem(GUI* ui, FAUSTFLOAT* zone, uiCallback foo, void* data) 
			: uiItem(ui, zone), fCallback(foo), fData(data) {}
	
	virtual void 	reflectZone() {		
		FAUSTFLOAT 	v = *fZone;
		fCache = v; 
		fCallback(v, fData);	
	}
};

// en cours d'installation de call back. a finir!!!!!

/**
 * Update all user items reflecting zone z
 */

inline void GUI::updateZone(FAUSTFLOAT* z)
{
	FAUSTFLOAT 	v = *z;
	clist* 	l = fZoneMap[z];
	for (clist::iterator c = l->begin(); c != l->end(); c++) {
		if ((*c)->cache() != v) (*c)->reflectZone();
	}
}

/**
 * Update all user items not up to date
 */

inline void GUI::updateAllZones()
{
	for (zmap::iterator m = fZoneMap.begin(); m != fZoneMap.end(); m++) {
		FAUSTFLOAT* 	z = m->first;
		clist*	l = m->second;
		FAUSTFLOAT	v = *z;
		for (clist::iterator c = l->begin(); c != l->end(); c++) {
			if ((*c)->cache() != v) (*c)->reflectZone();
		}
	}
}

inline void GUI::addCallback(FAUSTFLOAT* zone, uiCallback foo, void* data) 
{ 
	new uiCallbackItem(this, zone, foo, data); 
};

inline clist::~clist() 
{
    std::list<uiItem*>::iterator it;
    for (it = begin(); it != end(); it++) {
        delete (*it);
    }
}

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
 protected:
	int fSamplingFreq;
 public:
	dsp() {}
	virtual ~dsp() {}

	virtual int getNumInputs() 										= 0;
	virtual int getNumOutputs() 									= 0;
	virtual void buildUserInterface(UI* ui_interface) 				= 0;
	virtual void init(int samplingRate) 							= 0;
 	virtual void compute(int len, FAUSTFLOAT** inputs, FAUSTFLOAT** outputs) 	= 0;
};

// On Intel set FZ (Flush to Zero) and DAZ (Denormals Are Zero)
// flags to avoid costly denormals
#ifdef __SSE__
    #include <xmmintrin.h>
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
 
#ifndef __misc__
#define __misc__

#include <algorithm>
#include <map>
#include <string.h>
#include <stdlib.h>

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


using std::max;
using std::min;

struct XXXX_Meta : std::map<const char*, const char*>
{
    void declare(const char* key, const char* value) { (*this)[key]=value; }
};

struct MY_Meta : Meta, std::map<const char*, const char*>
{
    void declare(const char* key, const char* value) { (*this)[key]=value; }
};

inline int	lsr(int x, int n)	{ return int(((unsigned int)x) >> n); }
inline int 	int2pow2(int x)		{ int r=0; while ((1<<r)<x) r++; return r; }

long lopt(char *argv[], const char *name, long def)
{
	int	i;
	for (i = 0; argv[i]; i++) if (!strcmp(argv[i], name)) return atoi(argv[i+1]);
	return def;
}

bool isopt(char *argv[], const char *name)
{
	int	i;
	for (i = 0; argv[i]; i++) if (!strcmp(argv[i], name)) return true;
	return false;
}

const char* lopts(char *argv[], const char *name, const char* def)
{
	int	i;
	for (i = 0; argv[i]; i++) if (!strcmp(argv[i], name)) return argv[i+1];
	return def;
}
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

typedef long double quad;

#ifndef FAUSTCLASS 
#define FAUSTCLASS Noise
#endif

class Noise : public dsp {
  public:
	class SIG0 {
	  private:
		int 	fSamplingFreq;
	  public:
		int getNumInputs() 	{ return 0; }
		int getNumOutputs() 	{ return 1; }
		void init(int samplingFreq) {
			fSamplingFreq = samplingFreq;
		}
		void fill (int count, float output[]) {
			for (int i=0; i<count; i++) {
				output[i] = 0.0f;
			}
		}
	};


	FAUSTFLOAT 	fslider0;
	int 	iConst0;
	float 	fConst1;
	float 	ftbl0[16];
	int 	iConst2;
	int 	iRec2[2];
	int 	iVec0[2];
	FAUSTFLOAT 	fslider1;
	float 	fVec1[2];
	float 	fRec3[2];
	int 	iRec4[2];
	float 	fConst3;
	float 	fRec1[2];
	float 	fRec5[2];
	float 	fRec6[2];
	FAUSTFLOAT 	fslider2;
	float 	fRec16[2];
	float 	ftbl1[16];
	FAUSTFLOAT 	fslider3;
	float 	fVec2[2];
	float 	fRec18[2];
	int 	iRec19[2];
	float 	ftbl2[16];
	FAUSTFLOAT 	fslider4;
	int 	iVec3[2];
	int 	iRec21[2];
	int 	iVec4[2];
	float 	fRec20[2];
	float 	ftbl3[16];
	FAUSTFLOAT 	fslider5;
	int 	iVec5[2];
	int 	iRec22[2];
	int 	IOTA;
	float 	fVec6[256];
	float 	fRec17[3];
	float 	ftbl4[16];
	FAUSTFLOAT 	fslider6;
	int 	iVec7[2];
	int 	iRec25[2];
	int 	iVec8[2];
	float 	fRec24[2];
	float 	fVec9[512];
	float 	fRec23[3];
	int 	iVec10[2];
	float 	fRec27[2];
	float 	fVec11[512];
	float 	fRec26[3];
	int 	iVec12[2];
	float 	fRec29[2];
	float 	fVec13[512];
	float 	fRec28[3];
	int 	iVec14[2];
	float 	fRec31[2];
	float 	fVec15[256];
	float 	fRec30[3];
	int 	iVec16[2];
	float 	fRec33[2];
	float 	fVec17[256];
	float 	fRec32[3];
	int 	iVec18[2];
	float 	fRec35[2];
	float 	fVec19[256];
	float 	fRec34[3];
	int 	iVec20[2];
	float 	fRec37[2];
	float 	fVec21[256];
	float 	fRec36[3];
	int 	iVec22[2];
	float 	fRec39[2];
	float 	fVec23[256];
	float 	fRec38[3];
	int 	iVec24[2];
	float 	fRec41[2];
	float 	fVec25[128];
	float 	fRec40[3];
	int 	iVec26[2];
	float 	fRec43[2];
	float 	fVec27[128];
	float 	fRec42[3];
	int 	iVec28[2];
	float 	fRec45[2];
	float 	fVec29[128];
	float 	fRec44[3];
	int 	iVec30[2];
	float 	fRec47[2];
	float 	fVec31[256];
	float 	fRec46[3];
	int 	iVec32[2];
	float 	fRec49[2];
	float 	fVec33[256];
	float 	fRec48[3];
	int 	iVec34[2];
	float 	fRec51[2];
	float 	fVec35[128];
	float 	fRec50[3];
	int 	iVec36[2];
	float 	fRec53[2];
	float 	fVec37[128];
	float 	fRec52[3];
	int 	iVec38[2];
	float 	fRec55[2];
	float 	fVec39[128];
	float 	fRec54[3];
	int 	iVec40[2];
	float 	fRec57[2];
	float 	fVec41[128];
	float 	fRec56[3];
	int 	iVec42[2];
	float 	fRec59[2];
	float 	fVec43[128];
	float 	fRec58[3];
	int 	iVec44[2];
	float 	fRec61[2];
	float 	fVec45[64];
	float 	fRec60[3];
	int 	iVec46[2];
	float 	fRec63[2];
	float 	fVec47[64];
	float 	fRec62[3];
	int 	iVec48[2];
	float 	fRec65[2];
	float 	fVec49[64];
	float 	fRec64[3];
	float 	ftbl5[16];
	FAUSTFLOAT 	fslider7;
	int 	iVec50[2];
	int 	iRec68[2];
	int 	iVec51[2];
	float 	fRec67[2];
	float 	fVec52[128];
	float 	fRec66[3];
	int 	iVec53[2];
	float 	fRec70[2];
	float 	fVec54[128];
	float 	fRec69[3];
	int 	iVec55[2];
	float 	fRec72[2];
	float 	fVec56[128];
	float 	fRec71[3];
	int 	iVec57[2];
	float 	fRec74[2];
	float 	fVec58[64];
	float 	fRec73[3];
	int 	iVec59[2];
	float 	fRec76[2];
	float 	fVec60[64];
	float 	fRec75[3];
	int 	iVec61[2];
	float 	fRec78[2];
	float 	fVec62[64];
	float 	fRec77[3];
	int 	iVec63[2];
	float 	fRec80[2];
	float 	fVec64[64];
	float 	fRec79[3];
	int 	iVec65[2];
	float 	fRec82[2];
	float 	fVec66[64];
	float 	fRec81[3];
	int 	iVec67[2];
	float 	fRec84[2];
	float 	fVec68[32];
	float 	fRec83[3];
	int 	iVec69[2];
	float 	fRec86[2];
	float 	fVec70[32];
	float 	fRec85[3];
	int 	iVec71[2];
	float 	fRec88[2];
	float 	fVec72[32];
	float 	fRec87[3];
	float 	fVec73[2048];
	float 	fRec15[2];
	float 	fRec90[2];
	float 	fVec74[2048];
	float 	fRec89[2];
	float 	fRec92[2];
	float 	fVec75[2048];
	float 	fRec91[2];
	float 	fRec94[2];
	float 	fVec76[2048];
	float 	fRec93[2];
	float 	fRec96[2];
	float 	fVec77[2048];
	float 	fRec95[2];
	float 	fRec98[2];
	float 	fVec78[2048];
	float 	fRec97[2];
	float 	fRec100[2];
	float 	fVec79[2048];
	float 	fRec99[2];
	float 	fRec102[2];
	float 	fVec80[2048];
	float 	fRec101[2];
	float 	fVec81[1024];
	float 	fRec13[2];
	float 	fVec82[512];
	float 	fRec11[2];
	float 	fVec83[512];
	float 	fRec9[2];
	float 	fVec84[256];
	float 	fRec7[2];
	float 	fRec0[3];
	float 	fRec113[2];
	float 	fVec85[2048];
	float 	fRec112[2];
	float 	fRec115[2];
	float 	fVec86[2048];
	float 	fRec114[2];
	float 	fRec117[2];
	float 	fVec87[2048];
	float 	fRec116[2];
	float 	fRec119[2];
	float 	fVec88[2048];
	float 	fRec118[2];
	float 	fRec121[2];
	float 	fVec89[2048];
	float 	fRec120[2];
	float 	fRec123[2];
	float 	fVec90[2048];
	float 	fRec122[2];
	float 	fRec125[2];
	float 	fVec91[2048];
	float 	fRec124[2];
	float 	fRec127[2];
	float 	fVec92[2048];
	float 	fRec126[2];
	float 	fVec93[1024];
	float 	fRec110[2];
	float 	fVec94[512];
	float 	fRec108[2];
	float 	fVec95[512];
	float 	fRec106[2];
	float 	fVec96[256];
	float 	fRec104[2];
	float 	fRec103[3];
  public:
	static void metadata(Meta* m) 	{ 
		m->declare("name", "Kisana");
		m->declare("author", "Yann Orlarey");
		m->declare("effect.lib/name", "Faust Audio Effect Library");
		m->declare("effect.lib/author", "Julius O. Smith (jos at ccrma.stanford.edu)");
		m->declare("effect.lib/copyright", "Julius O. Smith III");
		m->declare("effect.lib/version", "1.33");
		m->declare("effect.lib/license", "STK-4.3");
		m->declare("effect.lib/exciter_name", "Harmonic Exciter");
		m->declare("effect.lib/exciter_author", "Priyanka Shekar (pshekar@ccrma.stanford.edu)");
		m->declare("effect.lib/exciter_copyright", "Copyright (c) 2013 Priyanka Shekar");
		m->declare("effect.lib/exciter_version", "1.0");
		m->declare("effect.lib/exciter_license", "MIT License (MIT)");
		m->declare("filter.lib/name", "Faust Filter Library");
		m->declare("filter.lib/author", "Julius O. Smith (jos at ccrma.stanford.edu)");
		m->declare("filter.lib/copyright", "Julius O. Smith III");
		m->declare("filter.lib/version", "1.29");
		m->declare("filter.lib/license", "STK-4.3");
		m->declare("filter.lib/reference", "https://ccrma.stanford.edu/~jos/filters/");
		m->declare("music.lib/name", "Music Library");
		m->declare("music.lib/author", "GRAME");
		m->declare("music.lib/copyright", "GRAME");
		m->declare("music.lib/version", "1.0");
		m->declare("music.lib/license", "LGPL with exception");
		m->declare("math.lib/name", "Math Library");
		m->declare("math.lib/author", "GRAME");
		m->declare("math.lib/copyright", "GRAME");
		m->declare("math.lib/version", "1.0");
		m->declare("math.lib/license", "LGPL with exception");
	}

	virtual int getNumInputs() 	{ return 0; }
	virtual int getNumOutputs() 	{ return 2; }
	static void classInit(int samplingFreq) {
	}
	virtual void instanceInit(int samplingFreq) {
		fSamplingFreq = samplingFreq;
		fslider0 = -2e+01f;
		iConst0 = min(192000, max(1, fSamplingFreq));
		fConst1 = (1413.7166941154069f / float(iConst0));
		SIG0 sig0;
		sig0.init(samplingFreq);
		sig0.fill(16,ftbl0);
		iConst2 = int((0.16666666666666666f * iConst0));
		for (int i=0; i<2; i++) iRec2[i] = 0;
		for (int i=0; i<2; i++) iVec0[i] = 0;
		fslider1 = 0.8f;
		for (int i=0; i<2; i++) fVec1[i] = 0;
		for (int i=0; i<2; i++) fRec3[i] = 0;
		for (int i=0; i<2; i++) iRec4[i] = 0;
		fConst3 = (2827.4333882308138f / float(iConst0));
		for (int i=0; i<2; i++) fRec1[i] = 0;
		for (int i=0; i<2; i++) fRec5[i] = 0;
		for (int i=0; i<2; i++) fRec6[i] = 0;
		fslider2 = 0.3333f;
		for (int i=0; i<2; i++) fRec16[i] = 0;
		sig0.init(samplingFreq);
		sig0.fill(16,ftbl1);
		fslider3 = 0.0f;
		for (int i=0; i<2; i++) fVec2[i] = 0;
		for (int i=0; i<2; i++) fRec18[i] = 0;
		for (int i=0; i<2; i++) iRec19[i] = 0;
		sig0.init(samplingFreq);
		sig0.fill(16,ftbl2);
		fslider4 = 0.0f;
		for (int i=0; i<2; i++) iVec3[i] = 0;
		for (int i=0; i<2; i++) iRec21[i] = 0;
		for (int i=0; i<2; i++) iVec4[i] = 0;
		for (int i=0; i<2; i++) fRec20[i] = 0;
		sig0.init(samplingFreq);
		sig0.fill(16,ftbl3);
		fslider5 = 0.0f;
		for (int i=0; i<2; i++) iVec5[i] = 0;
		for (int i=0; i<2; i++) iRec22[i] = 0;
		IOTA = 0;
		for (int i=0; i<256; i++) fVec6[i] = 0;
		for (int i=0; i<3; i++) fRec17[i] = 0;
		sig0.init(samplingFreq);
		sig0.fill(16,ftbl4);
		fslider6 = 0.0f;
		for (int i=0; i<2; i++) iVec7[i] = 0;
		for (int i=0; i<2; i++) iRec25[i] = 0;
		for (int i=0; i<2; i++) iVec8[i] = 0;
		for (int i=0; i<2; i++) fRec24[i] = 0;
		for (int i=0; i<512; i++) fVec9[i] = 0;
		for (int i=0; i<3; i++) fRec23[i] = 0;
		for (int i=0; i<2; i++) iVec10[i] = 0;
		for (int i=0; i<2; i++) fRec27[i] = 0;
		for (int i=0; i<512; i++) fVec11[i] = 0;
		for (int i=0; i<3; i++) fRec26[i] = 0;
		for (int i=0; i<2; i++) iVec12[i] = 0;
		for (int i=0; i<2; i++) fRec29[i] = 0;
		for (int i=0; i<512; i++) fVec13[i] = 0;
		for (int i=0; i<3; i++) fRec28[i] = 0;
		for (int i=0; i<2; i++) iVec14[i] = 0;
		for (int i=0; i<2; i++) fRec31[i] = 0;
		for (int i=0; i<256; i++) fVec15[i] = 0;
		for (int i=0; i<3; i++) fRec30[i] = 0;
		for (int i=0; i<2; i++) iVec16[i] = 0;
		for (int i=0; i<2; i++) fRec33[i] = 0;
		for (int i=0; i<256; i++) fVec17[i] = 0;
		for (int i=0; i<3; i++) fRec32[i] = 0;
		for (int i=0; i<2; i++) iVec18[i] = 0;
		for (int i=0; i<2; i++) fRec35[i] = 0;
		for (int i=0; i<256; i++) fVec19[i] = 0;
		for (int i=0; i<3; i++) fRec34[i] = 0;
		for (int i=0; i<2; i++) iVec20[i] = 0;
		for (int i=0; i<2; i++) fRec37[i] = 0;
		for (int i=0; i<256; i++) fVec21[i] = 0;
		for (int i=0; i<3; i++) fRec36[i] = 0;
		for (int i=0; i<2; i++) iVec22[i] = 0;
		for (int i=0; i<2; i++) fRec39[i] = 0;
		for (int i=0; i<256; i++) fVec23[i] = 0;
		for (int i=0; i<3; i++) fRec38[i] = 0;
		for (int i=0; i<2; i++) iVec24[i] = 0;
		for (int i=0; i<2; i++) fRec41[i] = 0;
		for (int i=0; i<128; i++) fVec25[i] = 0;
		for (int i=0; i<3; i++) fRec40[i] = 0;
		for (int i=0; i<2; i++) iVec26[i] = 0;
		for (int i=0; i<2; i++) fRec43[i] = 0;
		for (int i=0; i<128; i++) fVec27[i] = 0;
		for (int i=0; i<3; i++) fRec42[i] = 0;
		for (int i=0; i<2; i++) iVec28[i] = 0;
		for (int i=0; i<2; i++) fRec45[i] = 0;
		for (int i=0; i<128; i++) fVec29[i] = 0;
		for (int i=0; i<3; i++) fRec44[i] = 0;
		for (int i=0; i<2; i++) iVec30[i] = 0;
		for (int i=0; i<2; i++) fRec47[i] = 0;
		for (int i=0; i<256; i++) fVec31[i] = 0;
		for (int i=0; i<3; i++) fRec46[i] = 0;
		for (int i=0; i<2; i++) iVec32[i] = 0;
		for (int i=0; i<2; i++) fRec49[i] = 0;
		for (int i=0; i<256; i++) fVec33[i] = 0;
		for (int i=0; i<3; i++) fRec48[i] = 0;
		for (int i=0; i<2; i++) iVec34[i] = 0;
		for (int i=0; i<2; i++) fRec51[i] = 0;
		for (int i=0; i<128; i++) fVec35[i] = 0;
		for (int i=0; i<3; i++) fRec50[i] = 0;
		for (int i=0; i<2; i++) iVec36[i] = 0;
		for (int i=0; i<2; i++) fRec53[i] = 0;
		for (int i=0; i<128; i++) fVec37[i] = 0;
		for (int i=0; i<3; i++) fRec52[i] = 0;
		for (int i=0; i<2; i++) iVec38[i] = 0;
		for (int i=0; i<2; i++) fRec55[i] = 0;
		for (int i=0; i<128; i++) fVec39[i] = 0;
		for (int i=0; i<3; i++) fRec54[i] = 0;
		for (int i=0; i<2; i++) iVec40[i] = 0;
		for (int i=0; i<2; i++) fRec57[i] = 0;
		for (int i=0; i<128; i++) fVec41[i] = 0;
		for (int i=0; i<3; i++) fRec56[i] = 0;
		for (int i=0; i<2; i++) iVec42[i] = 0;
		for (int i=0; i<2; i++) fRec59[i] = 0;
		for (int i=0; i<128; i++) fVec43[i] = 0;
		for (int i=0; i<3; i++) fRec58[i] = 0;
		for (int i=0; i<2; i++) iVec44[i] = 0;
		for (int i=0; i<2; i++) fRec61[i] = 0;
		for (int i=0; i<64; i++) fVec45[i] = 0;
		for (int i=0; i<3; i++) fRec60[i] = 0;
		for (int i=0; i<2; i++) iVec46[i] = 0;
		for (int i=0; i<2; i++) fRec63[i] = 0;
		for (int i=0; i<64; i++) fVec47[i] = 0;
		for (int i=0; i<3; i++) fRec62[i] = 0;
		for (int i=0; i<2; i++) iVec48[i] = 0;
		for (int i=0; i<2; i++) fRec65[i] = 0;
		for (int i=0; i<64; i++) fVec49[i] = 0;
		for (int i=0; i<3; i++) fRec64[i] = 0;
		sig0.init(samplingFreq);
		sig0.fill(16,ftbl5);
		fslider7 = 0.0f;
		for (int i=0; i<2; i++) iVec50[i] = 0;
		for (int i=0; i<2; i++) iRec68[i] = 0;
		for (int i=0; i<2; i++) iVec51[i] = 0;
		for (int i=0; i<2; i++) fRec67[i] = 0;
		for (int i=0; i<128; i++) fVec52[i] = 0;
		for (int i=0; i<3; i++) fRec66[i] = 0;
		for (int i=0; i<2; i++) iVec53[i] = 0;
		for (int i=0; i<2; i++) fRec70[i] = 0;
		for (int i=0; i<128; i++) fVec54[i] = 0;
		for (int i=0; i<3; i++) fRec69[i] = 0;
		for (int i=0; i<2; i++) iVec55[i] = 0;
		for (int i=0; i<2; i++) fRec72[i] = 0;
		for (int i=0; i<128; i++) fVec56[i] = 0;
		for (int i=0; i<3; i++) fRec71[i] = 0;
		for (int i=0; i<2; i++) iVec57[i] = 0;
		for (int i=0; i<2; i++) fRec74[i] = 0;
		for (int i=0; i<64; i++) fVec58[i] = 0;
		for (int i=0; i<3; i++) fRec73[i] = 0;
		for (int i=0; i<2; i++) iVec59[i] = 0;
		for (int i=0; i<2; i++) fRec76[i] = 0;
		for (int i=0; i<64; i++) fVec60[i] = 0;
		for (int i=0; i<3; i++) fRec75[i] = 0;
		for (int i=0; i<2; i++) iVec61[i] = 0;
		for (int i=0; i<2; i++) fRec78[i] = 0;
		for (int i=0; i<64; i++) fVec62[i] = 0;
		for (int i=0; i<3; i++) fRec77[i] = 0;
		for (int i=0; i<2; i++) iVec63[i] = 0;
		for (int i=0; i<2; i++) fRec80[i] = 0;
		for (int i=0; i<64; i++) fVec64[i] = 0;
		for (int i=0; i<3; i++) fRec79[i] = 0;
		for (int i=0; i<2; i++) iVec65[i] = 0;
		for (int i=0; i<2; i++) fRec82[i] = 0;
		for (int i=0; i<64; i++) fVec66[i] = 0;
		for (int i=0; i<3; i++) fRec81[i] = 0;
		for (int i=0; i<2; i++) iVec67[i] = 0;
		for (int i=0; i<2; i++) fRec84[i] = 0;
		for (int i=0; i<32; i++) fVec68[i] = 0;
		for (int i=0; i<3; i++) fRec83[i] = 0;
		for (int i=0; i<2; i++) iVec69[i] = 0;
		for (int i=0; i<2; i++) fRec86[i] = 0;
		for (int i=0; i<32; i++) fVec70[i] = 0;
		for (int i=0; i<3; i++) fRec85[i] = 0;
		for (int i=0; i<2; i++) iVec71[i] = 0;
		for (int i=0; i<2; i++) fRec88[i] = 0;
		for (int i=0; i<32; i++) fVec72[i] = 0;
		for (int i=0; i<3; i++) fRec87[i] = 0;
		for (int i=0; i<2048; i++) fVec73[i] = 0;
		for (int i=0; i<2; i++) fRec15[i] = 0;
		for (int i=0; i<2; i++) fRec90[i] = 0;
		for (int i=0; i<2048; i++) fVec74[i] = 0;
		for (int i=0; i<2; i++) fRec89[i] = 0;
		for (int i=0; i<2; i++) fRec92[i] = 0;
		for (int i=0; i<2048; i++) fVec75[i] = 0;
		for (int i=0; i<2; i++) fRec91[i] = 0;
		for (int i=0; i<2; i++) fRec94[i] = 0;
		for (int i=0; i<2048; i++) fVec76[i] = 0;
		for (int i=0; i<2; i++) fRec93[i] = 0;
		for (int i=0; i<2; i++) fRec96[i] = 0;
		for (int i=0; i<2048; i++) fVec77[i] = 0;
		for (int i=0; i<2; i++) fRec95[i] = 0;
		for (int i=0; i<2; i++) fRec98[i] = 0;
		for (int i=0; i<2048; i++) fVec78[i] = 0;
		for (int i=0; i<2; i++) fRec97[i] = 0;
		for (int i=0; i<2; i++) fRec100[i] = 0;
		for (int i=0; i<2048; i++) fVec79[i] = 0;
		for (int i=0; i<2; i++) fRec99[i] = 0;
		for (int i=0; i<2; i++) fRec102[i] = 0;
		for (int i=0; i<2048; i++) fVec80[i] = 0;
		for (int i=0; i<2; i++) fRec101[i] = 0;
		for (int i=0; i<1024; i++) fVec81[i] = 0;
		for (int i=0; i<2; i++) fRec13[i] = 0;
		for (int i=0; i<512; i++) fVec82[i] = 0;
		for (int i=0; i<2; i++) fRec11[i] = 0;
		for (int i=0; i<512; i++) fVec83[i] = 0;
		for (int i=0; i<2; i++) fRec9[i] = 0;
		for (int i=0; i<256; i++) fVec84[i] = 0;
		for (int i=0; i<2; i++) fRec7[i] = 0;
		for (int i=0; i<3; i++) fRec0[i] = 0;
		for (int i=0; i<2; i++) fRec113[i] = 0;
		for (int i=0; i<2048; i++) fVec85[i] = 0;
		for (int i=0; i<2; i++) fRec112[i] = 0;
		for (int i=0; i<2; i++) fRec115[i] = 0;
		for (int i=0; i<2048; i++) fVec86[i] = 0;
		for (int i=0; i<2; i++) fRec114[i] = 0;
		for (int i=0; i<2; i++) fRec117[i] = 0;
		for (int i=0; i<2048; i++) fVec87[i] = 0;
		for (int i=0; i<2; i++) fRec116[i] = 0;
		for (int i=0; i<2; i++) fRec119[i] = 0;
		for (int i=0; i<2048; i++) fVec88[i] = 0;
		for (int i=0; i<2; i++) fRec118[i] = 0;
		for (int i=0; i<2; i++) fRec121[i] = 0;
		for (int i=0; i<2048; i++) fVec89[i] = 0;
		for (int i=0; i<2; i++) fRec120[i] = 0;
		for (int i=0; i<2; i++) fRec123[i] = 0;
		for (int i=0; i<2048; i++) fVec90[i] = 0;
		for (int i=0; i<2; i++) fRec122[i] = 0;
		for (int i=0; i<2; i++) fRec125[i] = 0;
		for (int i=0; i<2048; i++) fVec91[i] = 0;
		for (int i=0; i<2; i++) fRec124[i] = 0;
		for (int i=0; i<2; i++) fRec127[i] = 0;
		for (int i=0; i<2048; i++) fVec92[i] = 0;
		for (int i=0; i<2; i++) fRec126[i] = 0;
		for (int i=0; i<1024; i++) fVec93[i] = 0;
		for (int i=0; i<2; i++) fRec110[i] = 0;
		for (int i=0; i<512; i++) fVec94[i] = 0;
		for (int i=0; i<2; i++) fRec108[i] = 0;
		for (int i=0; i<512; i++) fVec95[i] = 0;
		for (int i=0; i<2; i++) fRec106[i] = 0;
		for (int i=0; i<256; i++) fVec96[i] = 0;
		for (int i=0; i<2; i++) fRec104[i] = 0;
		for (int i=0; i<3; i++) fRec103[i] = 0;
	}
	virtual void init(int samplingFreq) {
		classInit(samplingFreq);
		instanceInit(samplingFreq);
	}
	virtual void buildUserInterface(UI* interface) {
		interface->openVerticalBox("kisanaWD");
		interface->openHorizontalBox("Loops");
		interface->openVerticalBox("loop");
		interface->addVerticalSlider("level", &fslider5, 0.0f, 0.0f, 6.0f, 1.0f);
		interface->closeBox();
		interface->openVerticalBox("loop48");
		interface->declare(&fslider6, "1", "");
		interface->addVerticalSlider("note", &fslider6, 0.0f, 0.0f, 11.0f, 1.0f);
		interface->closeBox();
		interface->openVerticalBox("loop60");
		interface->declare(&fslider4, "1", "");
		interface->addVerticalSlider("note", &fslider4, 0.0f, 0.0f, 11.0f, 1.0f);
		interface->closeBox();
		interface->openVerticalBox("loop72");
		interface->declare(&fslider7, "1", "");
		interface->addVerticalSlider("note", &fslider7, 0.0f, 0.0f, 11.0f, 1.0f);
		interface->closeBox();
		interface->closeBox();
		interface->addHorizontalSlider("Reverb", &fslider2, 0.3333f, 0.0f, 1.0f, 0.025f);
		interface->declare(&fslider1, "1", "");
		interface->addHorizontalSlider("WahWah", &fslider1, 0.8f, 0.0f, 1.0f, 0.01f);
		interface->declare(&fslider0, "1", "");
		interface->addHorizontalSlider("master", &fslider0, -2e+01f, -6e+01f, 0.0f, 0.01f);
		interface->declare(&fslider3, "2", "");
		interface->addHorizontalSlider("timbre", &fslider3, 0.0f, 0.0f, 1.0f, 0.01f);
		interface->closeBox();
	}
	virtual void compute (int count, FAUSTFLOAT** input, FAUSTFLOAT** output) {
		float 	fSlow0 = powf(10,(0.05f * float(fslider0)));
		float 	fSlow1 = float(fslider1);
		int 	iSlow2 = (fSlow1 <= 0.0f);
		float 	fSlow3 = float(fslider2);
		float 	fSlow4 = float(fslider3);
		int 	iSlow5 = (fSlow4 <= 0.0f);
		int 	iSlow6 = int(float(fslider4));
		int 	iSlow7 = (iSlow6 <= 0.0f);
		int 	iSlow8 = int(float(fslider5));
		int 	iSlow9 = (iSlow8 <= 0.0f);
		int 	iSlow10 = int(float(fslider6));
		int 	iSlow11 = (iSlow10 <= 0.0f);
		int 	iSlow12 = int(float(fslider7));
		int 	iSlow13 = (iSlow12 <= 0.0f);
		float 	fSlow14 = (1 - fSlow3);
		FAUSTFLOAT* output0 = output[0];
		FAUSTFLOAT* output1 = output[1];
		for (int i=0; i<count; i++) {
			iRec2[0] = ((1 + iRec2[1]) % iConst2);
			int iTemp0 = int((iRec2[0] == 0));
			iVec0[0] = iTemp0;
			int iTemp1 = int(iVec0[1]);
			fVec1[0] = fSlow1;
			fRec3[0] = ((iTemp1)?0:(fabsf((fSlow1 - fVec1[1])) + fRec3[1]));
			iRec4[0] = ((iVec0[0] + iRec4[1]) % 15);
			ftbl0[((int((iVec0[0] & ((fRec3[0] > 0) | iSlow2))))?iRec4[0]:15)] = fSlow1;
			float fTemp2 = ftbl0[iRec4[0]];
			float fTemp3 = powf(2.0f,(2.3f * fTemp2));
			float fTemp4 = (1 - (fConst1 * (fTemp3 / powf(2.0f,(1.0f + (2.0f * (1.0f - fTemp2)))))));
			fRec1[0] = ((0.999f * fRec1[1]) + (0.0010000000000000009f * (0 - (2.0f * (fTemp4 * cosf((fConst3 * fTemp3)))))));
			fRec5[0] = ((0.999f * fRec5[1]) + (0.0010000000000000009f * faustpower<2>(fTemp4)));
			fRec6[0] = ((0.999f * fRec6[1]) + (0.0001000000000000001f * powf(4.0f,fTemp2)));
			fRec16[0] = ((0.30000000000000004f * fRec16[1]) + (0.7f * fRec15[1]));
			fVec2[0] = fSlow4;
			fRec18[0] = ((iTemp1)?0:(fRec18[1] + fabsf((fSlow4 - fVec2[1]))));
			ftbl1[((int((iVec0[0] & ((fRec18[0] > 0) | iSlow5))))?iRec4[0]:15)] = fSlow4;
			float fTemp5 = ftbl1[iRec4[0]];
			float fTemp6 = (1 + fTemp5);
			float fTemp7 = (1 - fTemp5);
			iRec19[0] = (12345 + (1103515245 * iRec19[1]));
			iVec3[0] = iSlow6;
			iRec21[0] = ((iTemp1)?0:(iRec21[1] + abs((iSlow6 - iVec3[1]))));
			ftbl2[((int((iVec0[0] & ((iRec21[0] > 0) | iSlow7))))?iRec4[0]:15)] = iSlow6;
			float fTemp8 = ftbl2[iRec4[0]];
			int iTemp9 = (fabsf((fTemp8 - 1)) < 0.5f);
			iVec4[0] = iTemp9;
			fRec20[0] = ((fRec20[1] + ((iVec4[0] - iVec4[1]) > 0.0f)) - (0.00593255250114736f * (fRec20[1] > 0.0f)));
			iVec5[0] = iSlow8;
			iRec22[0] = ((iTemp1)?0:(iRec22[1] + abs((iSlow8 - iVec5[1]))));
			ftbl3[((int((iVec0[0] & ((iRec22[0] > 0) | iSlow9))))?iRec4[0]:15)] = iSlow8;
			float fTemp10 = powf(10,(0.05f * (ftbl3[iRec4[0]] - 6)));
			fVec6[IOTA&255] = ((0.4967104672162962f * ((fTemp6 * fRec17[1]) + (fTemp7 * fRec17[2]))) + (4.656612875245797e-10f * ((iRec19[0] * (fRec20[0] > 0.0f)) * fTemp10)));
			fRec17[0] = fVec6[(IOTA-167)&255];
			iVec7[0] = iSlow10;
			iRec25[0] = ((iTemp1)?0:(iRec25[1] + abs((iSlow10 - iVec7[1]))));
			ftbl4[((int((iVec0[0] & ((iRec25[0] > 0) | iSlow11))))?iRec4[0]:15)] = iSlow10;
			float fTemp11 = ftbl4[iRec4[0]];
			int iTemp12 = (fabsf((fTemp11 - 1)) < 0.5f);
			iVec8[0] = iTemp12;
			fRec24[0] = ((fRec24[1] + ((iVec8[0] - iVec8[1]) > 0.0f)) - (0.00296627625057368f * (fRec24[1] > 0.0f)));
			fVec9[IOTA&511] = ((0.4934425764844625f * ((fRec23[1] * fTemp6) + (fRec23[2] * fTemp7))) + (4.656612875245797e-10f * ((iRec19[0] * (fRec24[0] > 0.0f)) * fTemp10)));
			fRec23[0] = fVec9[(IOTA-336)&511];
			int iTemp13 = (fabsf((fTemp11 - 2)) < 0.5f);
			iVec10[0] = iTemp13;
			fRec27[0] = ((fRec27[1] + ((iVec10[0] - iVec10[1]) > 0.0f)) - (0.0033295325160703805f * (fRec27[1] > 0.0f)));
			fVec11[IOTA&511] = ((0.4941537998866976f * ((fTemp6 * fRec26[1]) + (fTemp7 * fRec26[2]))) + (4.656612875245797e-10f * ((iRec19[0] * (fRec27[0] > 0.0f)) * fTemp10)));
			fRec26[0] = fVec11[(IOTA-299)&511];
			int iTemp14 = (fabsf((fTemp11 - 3)) < 0.5f);
			iVec12[0] = iTemp14;
			fRec29[0] = ((fRec29[1] + ((iVec12[0] - iVec12[1]) > 0.0f)) - (0.00373727388790102f * (fRec29[1] > 0.0f)));
			fVec13[IOTA&511] = ((0.4947882913184981f * ((fTemp6 * fRec28[1]) + (fTemp7 * fRec28[2]))) + (4.656612875245797e-10f * ((iRec19[0] * (fRec29[0] > 0.0f)) * fTemp10)));
			fRec28[0] = fVec13[(IOTA-266)&511];
			int iTemp15 = (fabsf((fTemp11 - 4)) < 0.5f);
			iVec14[0] = iTemp15;
			fRec31[0] = ((fRec31[1] + ((iVec14[0] - iVec14[1]) > 0.0f)) - (0.004444392698205774f * (fRec31[1] > 0.0f)));
			fVec15[IOTA&255] = ((0.49561384415280396f * ((fTemp6 * fRec30[1]) + (fTemp7 * fRec30[2]))) + (4.656612875245797e-10f * ((iRec19[0] * (fRec31[0] > 0.0f)) * fTemp10)));
			fRec30[0] = fVec15[(IOTA-224)&255];
			int iTemp16 = (fabsf((fTemp11 - 5)) < 0.5f);
			iVec16[0] = iTemp16;
			fRec33[0] = ((fRec33[1] + ((iVec16[0] - iVec16[1]) > 0.0f)) - (0.004988662131519274f * (fRec33[1] > 0.0f)));
			fVec17[IOTA&255] = ((0.49609050335141536f * ((fTemp6 * fRec32[1]) + (fTemp7 * fRec32[2]))) + (4.656612875245797e-10f * ((iRec19[0] * (fRec33[0] > 0.0f)) * fTemp10)));
			fRec32[0] = fVec17[(IOTA-199)&255];
			int iTemp17 = (fabsf((fTemp11 - 6)) < 0.5f);
			iVec18[0] = iTemp17;
			fRec35[0] = ((fRec35[1] + ((iVec18[0] - iVec18[1]) > 0.0f)) - (0.00593255250114736f * (fRec35[1] > 0.0f)));
			fVec19[IOTA&255] = ((0.4967104672162962f * ((fTemp6 * fRec34[1]) + (fTemp7 * fRec34[2]))) + (4.656612875245797e-10f * ((iRec19[0] * (fRec35[0] > 0.0f)) * fTemp10)));
			fRec34[0] = fVec19[(IOTA-167)&255];
			int iTemp18 = (fabsf((fTemp11 - 7)) < 0.5f);
			iVec20[0] = iTemp18;
			fRec37[0] = ((fRec37[1] + ((iVec20[0] - iVec20[1]) > 0.0f)) - (0.006659065032140761f * (fRec37[1] > 0.0f)));
			fVec21[IOTA&255] = ((0.49706830510841143f * ((fTemp6 * fRec36[1]) + (fTemp7 * fRec36[2]))) + (4.656612875245797e-10f * ((iRec19[0] * (fRec37[0] > 0.0f)) * fTemp10)));
			fRec36[0] = fVec21[(IOTA-149)&255];
			int iTemp19 = (fabsf((fTemp11 - 8)) < 0.5f);
			iVec22[0] = iTemp19;
			fRec39[0] = ((fRec39[1] + ((iVec22[0] - iVec22[1]) > 0.0f)) - (0.00747454777580204f * (fRec39[1] > 0.0f)));
			fVec23[IOTA&255] = ((0.49738731956016835f * ((fTemp6 * fRec38[1]) + (fTemp7 * fRec38[2]))) + (4.656612875245797e-10f * ((iRec19[0] * (fRec39[0] > 0.0f)) * fTemp10)));
			fRec38[0] = fVec23[(IOTA-132)&255];
			int iTemp20 = (fabsf((fTemp11 - 9)) < 0.5f);
			iVec24[0] = iTemp20;
			fRec41[0] = ((fRec41[1] + ((iVec24[0] - iVec24[1]) > 0.0f)) - (0.008888785396411547f * (fRec41[1] > 0.0f)));
			fVec25[IOTA&127] = ((0.4978020912736325f * ((fTemp6 * fRec40[1]) + (fTemp7 * fRec40[2]))) + (4.656612875245797e-10f * ((iRec19[0] * (fRec41[0] > 0.0f)) * fTemp10)));
			fRec40[0] = fVec25[(IOTA-111)&127];
			int iTemp21 = (fabsf((fTemp11 - 10)) < 0.5f);
			iVec26[0] = iTemp21;
			fRec43[0] = ((fRec43[1] + ((iVec26[0] - iVec26[1]) > 0.0f)) - (0.009977324263038548f * (fRec43[1] > 0.0f)));
			fVec27[IOTA&127] = ((0.4980414156229456f * ((fTemp6 * fRec42[1]) + (fTemp7 * fRec42[2]))) + (4.656612875245797e-10f * ((iRec19[0] * (fRec43[0] > 0.0f)) * fTemp10)));
			fRec42[0] = fVec27[(IOTA-99)&127];
			int iTemp22 = (fabsf((fTemp11 - 11)) < 0.5f);
			iVec28[0] = iTemp22;
			fRec45[0] = ((fRec45[1] + ((iVec28[0] - iVec28[1]) > 0.0f)) - (0.01186510500229472f * (fRec45[1] > 0.0f)));
			fVec29[IOTA&127] = ((0.498352519415873f * ((fTemp6 * fRec44[1]) + (fTemp7 * fRec44[2]))) + (4.656612875245797e-10f * ((iRec19[0] * (fRec45[0] > 0.0f)) * fTemp10)));
			fRec44[0] = fVec29[(IOTA-83)&127];
			int iTemp23 = (fabsf((fTemp8 - 2)) < 0.5f);
			iVec30[0] = iTemp23;
			fRec47[0] = ((fRec47[1] + ((iVec30[0] - iVec30[1]) > 0.0f)) - (0.006659065032140761f * (fRec47[1] > 0.0f)));
			fVec31[IOTA&255] = ((0.49706830510841143f * ((fTemp6 * fRec46[1]) + (fTemp7 * fRec46[2]))) + (4.656612875245797e-10f * ((iRec19[0] * (fRec47[0] > 0.0f)) * fTemp10)));
			fRec46[0] = fVec31[(IOTA-149)&255];
			int iTemp24 = (fabsf((fTemp8 - 3)) < 0.5f);
			iVec32[0] = iTemp24;
			fRec49[0] = ((fRec49[1] + ((iVec32[0] - iVec32[1]) > 0.0f)) - (0.00747454777580204f * (fRec49[1] > 0.0f)));
			fVec33[IOTA&255] = ((0.49738731956016835f * ((fTemp6 * fRec48[1]) + (fTemp7 * fRec48[2]))) + (4.656612875245797e-10f * ((iRec19[0] * (fRec49[0] > 0.0f)) * fTemp10)));
			fRec48[0] = fVec33[(IOTA-132)&255];
			int iTemp25 = (fabsf((fTemp8 - 4)) < 0.5f);
			iVec34[0] = iTemp25;
			fRec51[0] = ((fRec51[1] + ((iVec34[0] - iVec34[1]) > 0.0f)) - (0.008888785396411547f * (fRec51[1] > 0.0f)));
			fVec35[IOTA&127] = ((0.4978020912736325f * ((fTemp6 * fRec50[1]) + (fTemp7 * fRec50[2]))) + (4.656612875245797e-10f * ((iRec19[0] * (fRec51[0] > 0.0f)) * fTemp10)));
			fRec50[0] = fVec35[(IOTA-111)&127];
			int iTemp26 = (fabsf((fTemp8 - 5)) < 0.5f);
			iVec36[0] = iTemp26;
			fRec53[0] = ((fRec53[1] + ((iVec36[0] - iVec36[1]) > 0.0f)) - (0.009977324263038548f * (fRec53[1] > 0.0f)));
			fVec37[IOTA&127] = ((0.4980414156229456f * ((fTemp6 * fRec52[1]) + (fTemp7 * fRec52[2]))) + (4.656612875245797e-10f * ((iRec19[0] * (fRec53[0] > 0.0f)) * fTemp10)));
			fRec52[0] = fVec37[(IOTA-99)&127];
			int iTemp27 = (fabsf((fTemp8 - 6)) < 0.5f);
			iVec38[0] = iTemp27;
			fRec55[0] = ((fRec55[1] + ((iVec38[0] - iVec38[1]) > 0.0f)) - (0.01186510500229472f * (fRec55[1] > 0.0f)));
			fVec39[IOTA&127] = ((0.498352519415873f * ((fTemp6 * fRec54[1]) + (fTemp7 * fRec54[2]))) + (4.656612875245797e-10f * ((iRec19[0] * (fRec55[0] > 0.0f)) * fTemp10)));
			fRec54[0] = fVec39[(IOTA-83)&127];
			int iTemp28 = (fabsf((fTemp8 - 7)) < 0.5f);
			iVec40[0] = iTemp28;
			fRec57[0] = ((fRec57[1] + ((iVec40[0] - iVec40[1]) > 0.0f)) - (0.013318130064281522f * (fRec57[1] > 0.0f)));
			fVec41[IOTA&127] = ((0.49853199752293303f * ((fTemp6 * fRec56[1]) + (fTemp7 * fRec56[2]))) + (4.656612875245797e-10f * ((iRec19[0] * (fRec57[0] > 0.0f)) * fTemp10)));
			fRec56[0] = fVec41[(IOTA-74)&127];
			int iTemp29 = (fabsf((fTemp8 - 8)) < 0.5f);
			iVec42[0] = iTemp29;
			fRec59[0] = ((fRec59[1] + ((iVec42[0] - iVec42[1]) > 0.0f)) - (0.01494909555160408f * (fRec59[1] > 0.0f)));
			fVec43[IOTA&127] = ((0.49869194878209555f * ((fTemp6 * fRec58[1]) + (fTemp7 * fRec58[2]))) + (4.656612875245797e-10f * ((iRec19[0] * (fRec59[0] > 0.0f)) * fTemp10)));
			fRec58[0] = fVec43[(IOTA-65)&127];
			int iTemp30 = (fabsf((fTemp8 - 9)) < 0.5f);
			iVec44[0] = iTemp30;
			fRec61[0] = ((fRec61[1] + ((iVec44[0] - iVec44[1]) > 0.0f)) - (0.017777570792823095f * (fRec61[1] > 0.0f)));
			fVec45[IOTA&63] = ((0.4988998352743928f * ((fTemp6 * fRec60[1]) + (fTemp7 * fRec60[2]))) + (4.656612875245797e-10f * ((iRec19[0] * (fRec61[0] > 0.0f)) * fTemp10)));
			fRec60[0] = fVec45[(IOTA-55)&63];
			int iTemp31 = (fabsf((fTemp8 - 10)) < 0.5f);
			iVec46[0] = iTemp31;
			fRec63[0] = ((fRec63[1] + ((iVec46[0] - iVec46[1]) > 0.0f)) - (0.019954648526077097f * (fRec63[1] > 0.0f)));
			fVec47[IOTA&63] = ((0.4990197469153629f * ((fTemp6 * fRec62[1]) + (fTemp7 * fRec62[2]))) + (4.656612875245797e-10f * ((iRec19[0] * (fRec63[0] > 0.0f)) * fTemp10)));
			fRec62[0] = fVec47[(IOTA-49)&63];
			int iTemp32 = (fabsf((fTemp8 - 11)) < 0.5f);
			iVec48[0] = iTemp32;
			fRec65[0] = ((fRec65[1] + ((iVec48[0] - iVec48[1]) > 0.0f)) - (0.02373021000458944f * (fRec65[1] > 0.0f)));
			fVec49[IOTA&63] = ((0.4991755800396655f * ((fTemp6 * fRec64[1]) + (fTemp7 * fRec64[2]))) + (4.656612875245797e-10f * ((iRec19[0] * (fRec65[0] > 0.0f)) * fTemp10)));
			fRec64[0] = fVec49[(IOTA-41)&63];
			iVec50[0] = iSlow12;
			iRec68[0] = ((iTemp1)?0:(iRec68[1] + abs((iSlow12 - iVec50[1]))));
			ftbl5[((int((iVec0[0] & ((iRec68[0] > 0) | iSlow13))))?iRec4[0]:15)] = iSlow12;
			float fTemp33 = ftbl5[iRec4[0]];
			int iTemp34 = (fabsf((fTemp33 - 1)) < 0.5f);
			iVec51[0] = iTemp34;
			fRec67[0] = ((fRec67[1] + ((iVec51[0] - iVec51[1]) > 0.0f)) - (0.01186510500229472f * (fRec67[1] > 0.0f)));
			fVec52[IOTA&127] = ((0.498352519415873f * ((fTemp7 * fRec66[2]) + (fTemp6 * fRec66[1]))) + (4.656612875245797e-10f * ((iRec19[0] * (fRec67[0] > 0.0f)) * fTemp10)));
			fRec66[0] = fVec52[(IOTA-83)&127];
			int iTemp35 = (fabsf((fTemp33 - 2)) < 0.5f);
			iVec53[0] = iTemp35;
			fRec70[0] = ((fRec70[1] + ((iVec53[0] - iVec53[1]) > 0.0f)) - (0.013318130064281522f * (fRec70[1] > 0.0f)));
			fVec54[IOTA&127] = ((0.49853199752293303f * ((fTemp6 * fRec69[1]) + (fTemp7 * fRec69[2]))) + (4.656612875245797e-10f * ((iRec19[0] * (fRec70[0] > 0.0f)) * fTemp10)));
			fRec69[0] = fVec54[(IOTA-74)&127];
			int iTemp36 = (fabsf((fTemp33 - 3)) < 0.5f);
			iVec55[0] = iTemp36;
			fRec72[0] = ((fRec72[1] + ((iVec55[0] - iVec55[1]) > 0.0f)) - (0.01494909555160408f * (fRec72[1] > 0.0f)));
			fVec56[IOTA&127] = ((0.49869194878209555f * ((fTemp6 * fRec71[1]) + (fTemp7 * fRec71[2]))) + (4.656612875245797e-10f * ((iRec19[0] * (fRec72[0] > 0.0f)) * fTemp10)));
			fRec71[0] = fVec56[(IOTA-65)&127];
			int iTemp37 = (fabsf((fTemp33 - 4)) < 0.5f);
			iVec57[0] = iTemp37;
			fRec74[0] = ((fRec74[1] + ((iVec57[0] - iVec57[1]) > 0.0f)) - (0.017777570792823095f * (fRec74[1] > 0.0f)));
			fVec58[IOTA&63] = ((0.4988998352743928f * ((fTemp6 * fRec73[1]) + (fTemp7 * fRec73[2]))) + (4.656612875245797e-10f * ((iRec19[0] * (fRec74[0] > 0.0f)) * fTemp10)));
			fRec73[0] = fVec58[(IOTA-55)&63];
			int iTemp38 = (fabsf((fTemp33 - 5)) < 0.5f);
			iVec59[0] = iTemp38;
			fRec76[0] = ((fRec76[1] + ((iVec59[0] - iVec59[1]) > 0.0f)) - (0.019954648526077097f * (fRec76[1] > 0.0f)));
			fVec60[IOTA&63] = ((0.4990197469153629f * ((fTemp6 * fRec75[1]) + (fTemp7 * fRec75[2]))) + (4.656612875245797e-10f * ((iRec19[0] * (fRec76[0] > 0.0f)) * fTemp10)));
			fRec75[0] = fVec60[(IOTA-49)&63];
			int iTemp39 = (fabsf((fTemp33 - 6)) < 0.5f);
			iVec61[0] = iTemp39;
			fRec78[0] = ((fRec78[1] + ((iVec61[0] - iVec61[1]) > 0.0f)) - (0.02373021000458944f * (fRec78[1] > 0.0f)));
			fVec62[IOTA&63] = ((0.4991755800396655f * ((fTemp6 * fRec77[1]) + (fTemp7 * fRec77[2]))) + (4.656612875245797e-10f * ((iRec19[0] * (fRec78[0] > 0.0f)) * fTemp10)));
			fRec77[0] = fVec62[(IOTA-41)&63];
			float fTemp40 = (0.7071067811865476f * fRec77[0]);
			int iTemp41 = (fabsf((fTemp33 - 7)) < 0.5f);
			iVec63[0] = iTemp41;
			fRec80[0] = ((fRec80[1] + ((iVec63[0] - iVec63[1]) > 0.0f)) - (0.026636260128563044f * (fRec80[1] > 0.0f)));
			fVec64[IOTA&63] = ((0.4992654592112963f * ((fTemp6 * fRec79[1]) + (fTemp7 * fRec79[2]))) + (4.656612875245797e-10f * ((iRec19[0] * (fRec80[0] > 0.0f)) * fTemp10)));
			fRec79[0] = fVec64[(IOTA-36)&63];
			int iTemp42 = (fabsf((fTemp33 - 8)) < 0.5f);
			iVec65[0] = iTemp42;
			fRec82[0] = ((fRec82[1] + ((iVec65[0] - iVec65[1]) > 0.0f)) - (0.02989819110320816f * (fRec82[1] > 0.0f)));
			fVec66[IOTA&63] = ((0.4993455460811158f * ((fTemp6 * fRec81[1]) + (fTemp7 * fRec81[2]))) + (4.656612875245797e-10f * ((iRec19[0] * (fRec82[0] > 0.0f)) * fTemp10)));
			fRec81[0] = fVec66[(IOTA-32)&63];
			int iTemp43 = (fabsf((fTemp33 - 9)) < 0.5f);
			iVec67[0] = iTemp43;
			fRec84[0] = ((fRec84[1] + ((iVec67[0] - iVec67[1]) > 0.0f)) - (0.03555514158564619f * (fRec84[1] > 0.0f)));
			fVec68[IOTA&31] = ((0.4994496147132325f * ((fTemp6 * fRec83[1]) + (fTemp7 * fRec83[2]))) + (4.656612875245797e-10f * ((iRec19[0] * (fRec84[0] > 0.0f)) * fTemp10)));
			fRec83[0] = fVec68[(IOTA-27)&31];
			int iTemp44 = (fabsf((fTemp33 - 10)) < 0.5f);
			iVec69[0] = iTemp44;
			fRec86[0] = ((fRec86[1] + ((iVec69[0] - iVec69[1]) > 0.0f)) - (0.039909297052154194f * (fRec86[1] > 0.0f)));
			fVec70[IOTA&31] = ((0.49950963299788465f * ((fTemp6 * fRec85[1]) + (fTemp7 * fRec85[2]))) + (4.656612875245797e-10f * ((iRec19[0] * (fRec86[0] > 0.0f)) * fTemp10)));
			fRec85[0] = fVec70[(IOTA-24)&31];
			int iTemp45 = (fabsf((fTemp33 - 11)) < 0.5f);
			iVec71[0] = iTemp45;
			fRec88[0] = ((fRec88[1] + ((iVec71[0] - iVec71[1]) > 0.0f)) - (0.04746042000917888f * (fRec88[1] > 0.0f)));
			fVec72[IOTA&31] = ((0.4995876199625375f * ((fTemp6 * fRec87[1]) + (fTemp7 * fRec87[2]))) + (4.656612875245797e-10f * ((iRec19[0] * (fRec88[0] > 0.0f)) * fTemp10)));
			fRec87[0] = fVec72[(IOTA-20)&31];
			float fTemp46 = ((0.9770084209183945f * (((((((((((fRec17[0] + ((((((((((fRec23[0] + (0.9511897312113419f * fRec26[0])) + (0.8997354108424374f * fRec28[0])) + (0.8451542547285166f * fRec30[0])) + (0.786795792469443f * fRec32[0])) + (0.7237468644557459f * fRec34[0])) + (0.6546536707079771f * fRec36[0])) + (0.5773502691896257f * fRec38[0])) + (0.4879500364742666f * fRec40[0])) + (0.3779644730092272f * fRec42[0])) + (0.21821789023599225f * fRec44[0]))) + (0.9511897312113419f * fRec46[0])) + (0.8997354108424374f * fRec48[0])) + (0.8451542547285166f * fRec50[0])) + (0.786795792469443f * fRec52[0])) + (0.7237468644557459f * fRec54[0])) + (0.6546536707079771f * fRec56[0])) + (0.5773502691896257f * fRec58[0])) + (0.4879500364742666f * fRec60[0])) + (0.3779644730092272f * fRec62[0])) + (0.21821789023599225f * fRec64[0]))) + (1.5f * (((((((((((0.9770084209183945f * fRec66[0]) + (0.9293203772845852f * fRec69[0])) + (0.8790490729915326f * fRec71[0])) + (0.8257228238447705f * fRec73[0])) + (0.7687061147858073f * fRec75[0])) + fTemp40) + (0.6396021490668313f * fRec79[0])) + (0.5640760748177662f * fRec81[0])) + (0.4767312946227962f * fRec83[0])) + (0.3692744729379982f * fRec85[0])) + (0.21320071635561033f * fRec87[0]))));
			float fTemp47 = ((0.21320071635561044f * (((((((((((fRec17[0] + ((((((((((fRec23[0] + (1.7320508075688772f * fRec26[0])) + (2.23606797749979f * fRec28[0])) + (2.6457513110645907f * fRec30[0])) + (3.0f * fRec32[0])) + (3.3166247903554f * fRec34[0])) + (3.605551275463989f * fRec36[0])) + (3.872983346207417f * fRec38[0])) + (4.123105625617661f * fRec40[0])) + (4.358898943540674f * fRec42[0])) + (4.58257569495584f * fRec44[0]))) + (1.7320508075688772f * fRec46[0])) + (2.23606797749979f * fRec48[0])) + (2.6457513110645907f * fRec50[0])) + (3.0f * fRec52[0])) + (3.3166247903554f * fRec54[0])) + (3.605551275463989f * fRec56[0])) + (3.872983346207417f * fRec58[0])) + (4.123105625617661f * fRec60[0])) + (4.358898943540674f * fRec62[0])) + (4.58257569495584f * fRec64[0]))) + (1.5f * ((((0.8790490729915326f * fRec83[0]) + ((0.8257228238447705f * fRec81[0]) + ((0.7687061147858074f * fRec79[0]) + (fTemp40 + (((0.5640760748177662f * fRec73[0]) + ((0.4767312946227962f * fRec71[0]) + ((0.3692744729379982f * fRec69[0]) + (0.21320071635561044f * fRec66[0])))) + (0.6396021490668313f * fRec75[0])))))) + (0.9293203772845852f * fRec85[0])) + (0.9770084209183945f * fRec87[0]))));
			float fTemp48 = (0.015f * (fTemp46 + fTemp47));
			fVec73[IOTA&2047] = ((0.9239999999999999f * fRec16[0]) + fTemp48);
			fRec15[0] = fVec73[(IOTA-1116)&2047];
			fRec90[0] = ((0.30000000000000004f * fRec90[1]) + (0.7f * fRec89[1]));
			fVec74[IOTA&2047] = (fTemp48 + (0.9239999999999999f * fRec90[0]));
			fRec89[0] = fVec74[(IOTA-1188)&2047];
			fRec92[0] = ((0.30000000000000004f * fRec92[1]) + (0.7f * fRec91[1]));
			fVec75[IOTA&2047] = (fTemp48 + (0.9239999999999999f * fRec92[0]));
			fRec91[0] = fVec75[(IOTA-1277)&2047];
			fRec94[0] = ((0.30000000000000004f * fRec94[1]) + (0.7f * fRec93[1]));
			fVec76[IOTA&2047] = (fTemp48 + (0.9239999999999999f * fRec94[0]));
			fRec93[0] = fVec76[(IOTA-1356)&2047];
			fRec96[0] = ((0.30000000000000004f * fRec96[1]) + (0.7f * fRec95[1]));
			fVec77[IOTA&2047] = (fTemp48 + (0.9239999999999999f * fRec96[0]));
			fRec95[0] = fVec77[(IOTA-1422)&2047];
			fRec98[0] = ((0.30000000000000004f * fRec98[1]) + (0.7f * fRec97[1]));
			fVec78[IOTA&2047] = (fTemp48 + (0.9239999999999999f * fRec98[0]));
			fRec97[0] = fVec78[(IOTA-1491)&2047];
			fRec100[0] = ((0.30000000000000004f * fRec100[1]) + (0.7f * fRec99[1]));
			fVec79[IOTA&2047] = (fTemp48 + (0.9239999999999999f * fRec100[0]));
			fRec99[0] = fVec79[(IOTA-1557)&2047];
			fRec102[0] = ((0.30000000000000004f * fRec102[1]) + (0.7f * fRec101[1]));
			fVec80[IOTA&2047] = (fTemp48 + (0.9239999999999999f * fRec102[0]));
			fRec101[0] = fVec80[(IOTA-1617)&2047];
			float fTemp49 = (((((((fRec15[0] + fRec89[0]) + fRec91[0]) + fRec93[0]) + fRec95[0]) + fRec97[0]) + fRec99[0]) + fRec101[0]);
			fVec81[IOTA&1023] = (fTemp49 + (0.5f * fRec13[1]));
			fRec13[0] = fVec81[(IOTA-556)&1023];
			float 	fRec14 = (0 - (fTemp49 - fRec13[1]));
			fVec82[IOTA&511] = (fRec14 + (0.5f * fRec11[1]));
			fRec11[0] = fVec82[(IOTA-441)&511];
			float 	fRec12 = (fRec11[1] - fRec14);
			fVec83[IOTA&511] = (fRec12 + (0.5f * fRec9[1]));
			fRec9[0] = fVec83[(IOTA-341)&511];
			float 	fRec10 = (fRec9[1] - fRec12);
			fVec84[IOTA&255] = (fRec10 + (0.5f * fRec7[1]));
			fRec7[0] = fVec84[(IOTA-225)&255];
			float 	fRec8 = (fRec7[1] - fRec10);
			fRec0[0] = (0 - (((fRec1[0] * fRec0[1]) + (fRec5[0] * fRec0[2])) - (fRec6[0] * ((fSlow3 * fRec8) + (fSlow14 * fTemp46)))));
			output0[i] = (FAUSTFLOAT)(fSlow0 * (fRec0[0] - fRec0[1]));
			fRec113[0] = ((0.30000000000000004f * fRec113[1]) + (0.7f * fRec112[1]));
			fVec85[IOTA&2047] = (fTemp48 + (0.9239999999999999f * fRec113[0]));
			fRec112[0] = fVec85[(IOTA-1139)&2047];
			fRec115[0] = ((0.30000000000000004f * fRec115[1]) + (0.7f * fRec114[1]));
			fVec86[IOTA&2047] = (fTemp48 + (0.9239999999999999f * fRec115[0]));
			fRec114[0] = fVec86[(IOTA-1211)&2047];
			fRec117[0] = ((0.30000000000000004f * fRec117[1]) + (0.7f * fRec116[1]));
			fVec87[IOTA&2047] = (fTemp48 + (0.9239999999999999f * fRec117[0]));
			fRec116[0] = fVec87[(IOTA-1300)&2047];
			fRec119[0] = ((0.30000000000000004f * fRec119[1]) + (0.7f * fRec118[1]));
			fVec88[IOTA&2047] = (fTemp48 + (0.9239999999999999f * fRec119[0]));
			fRec118[0] = fVec88[(IOTA-1379)&2047];
			fRec121[0] = ((0.30000000000000004f * fRec121[1]) + (0.7f * fRec120[1]));
			fVec89[IOTA&2047] = (fTemp48 + (0.9239999999999999f * fRec121[0]));
			fRec120[0] = fVec89[(IOTA-1445)&2047];
			fRec123[0] = ((0.30000000000000004f * fRec123[1]) + (0.7f * fRec122[1]));
			fVec90[IOTA&2047] = (fTemp48 + (0.9239999999999999f * fRec123[0]));
			fRec122[0] = fVec90[(IOTA-1514)&2047];
			fRec125[0] = ((0.30000000000000004f * fRec125[1]) + (0.7f * fRec124[1]));
			fVec91[IOTA&2047] = (fTemp48 + (0.9239999999999999f * fRec125[0]));
			fRec124[0] = fVec91[(IOTA-1580)&2047];
			fRec127[0] = ((0.30000000000000004f * fRec127[1]) + (0.7f * fRec126[1]));
			fVec92[IOTA&2047] = (fTemp48 + (0.9239999999999999f * fRec127[0]));
			fRec126[0] = fVec92[(IOTA-1640)&2047];
			float fTemp50 = (((((((fRec112[0] + fRec114[0]) + fRec116[0]) + fRec118[0]) + fRec120[0]) + fRec122[0]) + fRec124[0]) + fRec126[0]);
			fVec93[IOTA&1023] = (fTemp50 + (0.5f * fRec110[1]));
			fRec110[0] = fVec93[(IOTA-579)&1023];
			float 	fRec111 = (0 - (fTemp50 - fRec110[1]));
			fVec94[IOTA&511] = (fRec111 + (0.5f * fRec108[1]));
			fRec108[0] = fVec94[(IOTA-464)&511];
			float 	fRec109 = (fRec108[1] - fRec111);
			fVec95[IOTA&511] = (fRec109 + (0.5f * fRec106[1]));
			fRec106[0] = fVec95[(IOTA-364)&511];
			float 	fRec107 = (fRec106[1] - fRec109);
			fVec96[IOTA&255] = (fRec107 + (0.5f * fRec104[1]));
			fRec104[0] = fVec96[(IOTA-248)&255];
			float 	fRec105 = (fRec104[1] - fRec107);
			fRec103[0] = (0 - (((fRec1[0] * fRec103[1]) + (fRec5[0] * fRec103[2])) - (fRec6[0] * ((fSlow3 * fRec105) + (fSlow14 * fTemp47)))));
			output1[i] = (FAUSTFLOAT)(fSlow0 * (fRec103[0] - fRec103[1]));
			// post processing
			fRec103[2] = fRec103[1]; fRec103[1] = fRec103[0];
			fRec104[1] = fRec104[0];
			fRec106[1] = fRec106[0];
			fRec108[1] = fRec108[0];
			fRec110[1] = fRec110[0];
			fRec126[1] = fRec126[0];
			fRec127[1] = fRec127[0];
			fRec124[1] = fRec124[0];
			fRec125[1] = fRec125[0];
			fRec122[1] = fRec122[0];
			fRec123[1] = fRec123[0];
			fRec120[1] = fRec120[0];
			fRec121[1] = fRec121[0];
			fRec118[1] = fRec118[0];
			fRec119[1] = fRec119[0];
			fRec116[1] = fRec116[0];
			fRec117[1] = fRec117[0];
			fRec114[1] = fRec114[0];
			fRec115[1] = fRec115[0];
			fRec112[1] = fRec112[0];
			fRec113[1] = fRec113[0];
			fRec0[2] = fRec0[1]; fRec0[1] = fRec0[0];
			fRec7[1] = fRec7[0];
			fRec9[1] = fRec9[0];
			fRec11[1] = fRec11[0];
			fRec13[1] = fRec13[0];
			fRec101[1] = fRec101[0];
			fRec102[1] = fRec102[0];
			fRec99[1] = fRec99[0];
			fRec100[1] = fRec100[0];
			fRec97[1] = fRec97[0];
			fRec98[1] = fRec98[0];
			fRec95[1] = fRec95[0];
			fRec96[1] = fRec96[0];
			fRec93[1] = fRec93[0];
			fRec94[1] = fRec94[0];
			fRec91[1] = fRec91[0];
			fRec92[1] = fRec92[0];
			fRec89[1] = fRec89[0];
			fRec90[1] = fRec90[0];
			fRec15[1] = fRec15[0];
			fRec87[2] = fRec87[1]; fRec87[1] = fRec87[0];
			fRec88[1] = fRec88[0];
			iVec71[1] = iVec71[0];
			fRec85[2] = fRec85[1]; fRec85[1] = fRec85[0];
			fRec86[1] = fRec86[0];
			iVec69[1] = iVec69[0];
			fRec83[2] = fRec83[1]; fRec83[1] = fRec83[0];
			fRec84[1] = fRec84[0];
			iVec67[1] = iVec67[0];
			fRec81[2] = fRec81[1]; fRec81[1] = fRec81[0];
			fRec82[1] = fRec82[0];
			iVec65[1] = iVec65[0];
			fRec79[2] = fRec79[1]; fRec79[1] = fRec79[0];
			fRec80[1] = fRec80[0];
			iVec63[1] = iVec63[0];
			fRec77[2] = fRec77[1]; fRec77[1] = fRec77[0];
			fRec78[1] = fRec78[0];
			iVec61[1] = iVec61[0];
			fRec75[2] = fRec75[1]; fRec75[1] = fRec75[0];
			fRec76[1] = fRec76[0];
			iVec59[1] = iVec59[0];
			fRec73[2] = fRec73[1]; fRec73[1] = fRec73[0];
			fRec74[1] = fRec74[0];
			iVec57[1] = iVec57[0];
			fRec71[2] = fRec71[1]; fRec71[1] = fRec71[0];
			fRec72[1] = fRec72[0];
			iVec55[1] = iVec55[0];
			fRec69[2] = fRec69[1]; fRec69[1] = fRec69[0];
			fRec70[1] = fRec70[0];
			iVec53[1] = iVec53[0];
			fRec66[2] = fRec66[1]; fRec66[1] = fRec66[0];
			fRec67[1] = fRec67[0];
			iVec51[1] = iVec51[0];
			iRec68[1] = iRec68[0];
			iVec50[1] = iVec50[0];
			fRec64[2] = fRec64[1]; fRec64[1] = fRec64[0];
			fRec65[1] = fRec65[0];
			iVec48[1] = iVec48[0];
			fRec62[2] = fRec62[1]; fRec62[1] = fRec62[0];
			fRec63[1] = fRec63[0];
			iVec46[1] = iVec46[0];
			fRec60[2] = fRec60[1]; fRec60[1] = fRec60[0];
			fRec61[1] = fRec61[0];
			iVec44[1] = iVec44[0];
			fRec58[2] = fRec58[1]; fRec58[1] = fRec58[0];
			fRec59[1] = fRec59[0];
			iVec42[1] = iVec42[0];
			fRec56[2] = fRec56[1]; fRec56[1] = fRec56[0];
			fRec57[1] = fRec57[0];
			iVec40[1] = iVec40[0];
			fRec54[2] = fRec54[1]; fRec54[1] = fRec54[0];
			fRec55[1] = fRec55[0];
			iVec38[1] = iVec38[0];
			fRec52[2] = fRec52[1]; fRec52[1] = fRec52[0];
			fRec53[1] = fRec53[0];
			iVec36[1] = iVec36[0];
			fRec50[2] = fRec50[1]; fRec50[1] = fRec50[0];
			fRec51[1] = fRec51[0];
			iVec34[1] = iVec34[0];
			fRec48[2] = fRec48[1]; fRec48[1] = fRec48[0];
			fRec49[1] = fRec49[0];
			iVec32[1] = iVec32[0];
			fRec46[2] = fRec46[1]; fRec46[1] = fRec46[0];
			fRec47[1] = fRec47[0];
			iVec30[1] = iVec30[0];
			fRec44[2] = fRec44[1]; fRec44[1] = fRec44[0];
			fRec45[1] = fRec45[0];
			iVec28[1] = iVec28[0];
			fRec42[2] = fRec42[1]; fRec42[1] = fRec42[0];
			fRec43[1] = fRec43[0];
			iVec26[1] = iVec26[0];
			fRec40[2] = fRec40[1]; fRec40[1] = fRec40[0];
			fRec41[1] = fRec41[0];
			iVec24[1] = iVec24[0];
			fRec38[2] = fRec38[1]; fRec38[1] = fRec38[0];
			fRec39[1] = fRec39[0];
			iVec22[1] = iVec22[0];
			fRec36[2] = fRec36[1]; fRec36[1] = fRec36[0];
			fRec37[1] = fRec37[0];
			iVec20[1] = iVec20[0];
			fRec34[2] = fRec34[1]; fRec34[1] = fRec34[0];
			fRec35[1] = fRec35[0];
			iVec18[1] = iVec18[0];
			fRec32[2] = fRec32[1]; fRec32[1] = fRec32[0];
			fRec33[1] = fRec33[0];
			iVec16[1] = iVec16[0];
			fRec30[2] = fRec30[1]; fRec30[1] = fRec30[0];
			fRec31[1] = fRec31[0];
			iVec14[1] = iVec14[0];
			fRec28[2] = fRec28[1]; fRec28[1] = fRec28[0];
			fRec29[1] = fRec29[0];
			iVec12[1] = iVec12[0];
			fRec26[2] = fRec26[1]; fRec26[1] = fRec26[0];
			fRec27[1] = fRec27[0];
			iVec10[1] = iVec10[0];
			fRec23[2] = fRec23[1]; fRec23[1] = fRec23[0];
			fRec24[1] = fRec24[0];
			iVec8[1] = iVec8[0];
			iRec25[1] = iRec25[0];
			iVec7[1] = iVec7[0];
			fRec17[2] = fRec17[1]; fRec17[1] = fRec17[0];
			IOTA = IOTA+1;
			iRec22[1] = iRec22[0];
			iVec5[1] = iVec5[0];
			fRec20[1] = fRec20[0];
			iVec4[1] = iVec4[0];
			iRec21[1] = iRec21[0];
			iVec3[1] = iVec3[0];
			iRec19[1] = iRec19[0];
			fRec18[1] = fRec18[0];
			fVec2[1] = fVec2[0];
			fRec16[1] = fRec16[0];
			fRec6[1] = fRec6[0];
			fRec5[1] = fRec5[0];
			fRec1[1] = fRec1[0];
			iRec4[1] = iRec4[0];
			fRec3[1] = fRec3[0];
			fVec1[1] = fVec1[0];
			iVec0[1] = iVec0[0];
			iRec2[1] = iRec2[0];
		}
	}
};


#ifdef FAUST_UIMACROS
	#define FAUST_INPUTS 0
	#define FAUST_OUTPUTS 2
	#define FAUST_ACTIVES 8
	#define FAUST_PASSIVES 0
	FAUST_ADDVERTICALSLIDER("kisanaWD/Loops/loop/level", fslider5, 0.0f, 0.0f, 6.0f, 1.0f);
	FAUST_ADDVERTICALSLIDER("kisanaWD/Loops/loop48/note", fslider6, 0.0f, 0.0f, 11.0f, 1.0f);
	FAUST_ADDVERTICALSLIDER("kisanaWD/Loops/loop60/note", fslider4, 0.0f, 0.0f, 11.0f, 1.0f);
	FAUST_ADDVERTICALSLIDER("kisanaWD/Loops/loop72/note", fslider7, 0.0f, 0.0f, 11.0f, 1.0f);
	FAUST_ADDHORIZONTALSLIDER("kisanaWD/Reverb", fslider2, 0.3333f, 0.0f, 1.0f, 0.025f);
	FAUST_ADDHORIZONTALSLIDER("kisanaWD/WahWah", fslider1, 0.8f, 0.0f, 1.0f, 0.01f);
	FAUST_ADDHORIZONTALSLIDER("kisanaWD/master", fslider0, -2e+01f, -6e+01f, 0.0f, 0.01f);
	FAUST_ADDHORIZONTALSLIDER("kisanaWD/timbre", fslider3, 0.0f, 0.0f, 1.0f, 0.01f);
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
    
    class Noise_wrap : public Noise
    {
    public:
        JSUI *ui;
    };
    
    //constructor
    void *NOISE_constructor(int samplingFreq) {
        
        // Make a new kisanaWD object
        Noise_wrap* n = new Noise_wrap();
        n->ui = new JSUI();
        // Init it with samplingFreq supplied... should we give a sample size here too?
        n->init(samplingFreq);
        n->buildUserInterface(n->ui);
        n->ui->iter = n->ui->uiMap.begin();

        return n;
    }

    int NOISE_getNumParams(Noise_wrap *n)
    {
        return n->ui->uiMap.size();
    }
    
    FAUSTFLOAT* NOISE_getNextParam(Noise_wrap *n, char *key)
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
    
    int NOISE_compute(Noise_wrap *n, int count, FAUSTFLOAT** inputs, FAUSTFLOAT** outputs) {
        n->compute(count, inputs, outputs);
        return 1;
    }
    
    int NOISE_getNumInputs(Noise_wrap *n){
        return n->getNumInputs();
    }
    
    int NOISE_getNumOutputs(Noise_wrap *n){
        return n->getNumOutputs();
    }

    void NOISE_destructor(Noise_wrap *n) {
        delete n;
    }
}
