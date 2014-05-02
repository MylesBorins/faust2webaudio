//-----------------------------------------------------
// name: "Kisana"
// author: "Yann Orlarey"
//
// Code generated with Faust 0.9.67 (http://faust.grame.fr)
//-----------------------------------------------------
/* link with  */
#include <math.h>
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
	float 	ftbl0[16];
	int 	iConst0;
	int 	iRec1[2];
	int 	iVec0[2];
	FAUSTFLOAT 	fslider1;
	float 	fVec1[2];
	float 	fRec2[2];
	int 	iRec3[2];
	int 	iRec4[2];
	float 	ftbl1[16];
	FAUSTFLOAT 	fslider2;
	int 	iVec2[2];
	int 	iRec6[2];
	int 	iVec3[2];
	float 	fRec5[2];
	float 	ftbl2[16];
	FAUSTFLOAT 	fslider3;
	int 	iVec4[2];
	int 	iRec7[2];
	int 	IOTA;
	float 	fVec5[256];
	float 	fRec0[3];
	float 	ftbl3[16];
	FAUSTFLOAT 	fslider4;
	int 	iVec6[2];
	int 	iRec10[2];
	int 	iVec7[2];
	float 	fRec9[2];
	float 	fVec8[512];
	float 	fRec8[3];
	int 	iVec9[2];
	float 	fRec12[2];
	float 	fVec10[512];
	float 	fRec11[3];
	int 	iVec11[2];
	float 	fRec14[2];
	float 	fVec12[512];
	float 	fRec13[3];
	int 	iVec13[2];
	float 	fRec16[2];
	float 	fVec14[256];
	float 	fRec15[3];
	int 	iVec15[2];
	float 	fRec18[2];
	float 	fVec16[256];
	float 	fRec17[3];
	int 	iVec17[2];
	float 	fRec20[2];
	float 	fVec18[256];
	float 	fRec19[3];
	int 	iVec19[2];
	float 	fRec22[2];
	float 	fVec20[256];
	float 	fRec21[3];
	int 	iVec21[2];
	float 	fRec24[2];
	float 	fVec22[256];
	float 	fRec23[3];
	int 	iVec23[2];
	float 	fRec26[2];
	float 	fVec24[128];
	float 	fRec25[3];
	int 	iVec25[2];
	float 	fRec28[2];
	float 	fVec26[128];
	float 	fRec27[3];
	int 	iVec27[2];
	float 	fRec30[2];
	float 	fVec28[128];
	float 	fRec29[3];
	int 	iVec29[2];
	float 	fRec32[2];
	float 	fVec30[256];
	float 	fRec31[3];
	int 	iVec31[2];
	float 	fRec34[2];
	float 	fVec32[256];
	float 	fRec33[3];
	int 	iVec33[2];
	float 	fRec36[2];
	float 	fVec34[128];
	float 	fRec35[3];
	int 	iVec35[2];
	float 	fRec38[2];
	float 	fVec36[128];
	float 	fRec37[3];
	int 	iVec37[2];
	float 	fRec40[2];
	float 	fVec38[128];
	float 	fRec39[3];
	int 	iVec39[2];
	float 	fRec42[2];
	float 	fVec40[128];
	float 	fRec41[3];
	int 	iVec41[2];
	float 	fRec44[2];
	float 	fVec42[128];
	float 	fRec43[3];
	int 	iVec43[2];
	float 	fRec46[2];
	float 	fVec44[64];
	float 	fRec45[3];
	int 	iVec45[2];
	float 	fRec48[2];
	float 	fVec46[64];
	float 	fRec47[3];
	int 	iVec47[2];
	float 	fRec50[2];
	float 	fVec48[64];
	float 	fRec49[3];
	float 	ftbl4[16];
	FAUSTFLOAT 	fslider5;
	int 	iVec49[2];
	int 	iRec53[2];
	int 	iVec50[2];
	float 	fRec52[2];
	float 	fVec51[128];
	float 	fRec51[3];
	int 	iVec52[2];
	float 	fRec55[2];
	float 	fVec53[128];
	float 	fRec54[3];
	int 	iVec54[2];
	float 	fRec57[2];
	float 	fVec55[128];
	float 	fRec56[3];
	int 	iVec56[2];
	float 	fRec59[2];
	float 	fVec57[64];
	float 	fRec58[3];
	int 	iVec58[2];
	float 	fRec61[2];
	float 	fVec59[64];
	float 	fRec60[3];
	int 	iVec60[2];
	float 	fRec63[2];
	float 	fVec61[64];
	float 	fRec62[3];
	int 	iVec62[2];
	float 	fRec65[2];
	float 	fVec63[64];
	float 	fRec64[3];
	int 	iVec64[2];
	float 	fRec67[2];
	float 	fVec65[64];
	float 	fRec66[3];
	int 	iVec66[2];
	float 	fRec69[2];
	float 	fVec67[32];
	float 	fRec68[3];
	int 	iVec68[2];
	float 	fRec71[2];
	float 	fVec69[32];
	float 	fRec70[3];
	int 	iVec70[2];
	float 	fRec73[2];
	float 	fVec71[32];
	float 	fRec72[3];
  public:
	static void metadata(Meta* m) 	{ 
		m->declare("name", "Kisana");
		m->declare("author", "Yann Orlarey");
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
		SIG0 sig0;
		sig0.init(samplingFreq);
		sig0.fill(16,ftbl0);
		iConst0 = int((0.16666666666666666f * min(192000, max(1, fSamplingFreq))));
		for (int i=0; i<2; i++) iRec1[i] = 0;
		for (int i=0; i<2; i++) iVec0[i] = 0;
		fslider1 = 0.0f;
		for (int i=0; i<2; i++) fVec1[i] = 0;
		for (int i=0; i<2; i++) fRec2[i] = 0;
		for (int i=0; i<2; i++) iRec3[i] = 0;
		for (int i=0; i<2; i++) iRec4[i] = 0;
		sig0.init(samplingFreq);
		sig0.fill(16,ftbl1);
		fslider2 = 0.0f;
		for (int i=0; i<2; i++) iVec2[i] = 0;
		for (int i=0; i<2; i++) iRec6[i] = 0;
		for (int i=0; i<2; i++) iVec3[i] = 0;
		for (int i=0; i<2; i++) fRec5[i] = 0;
		sig0.init(samplingFreq);
		sig0.fill(16,ftbl2);
		fslider3 = 0.0f;
		for (int i=0; i<2; i++) iVec4[i] = 0;
		for (int i=0; i<2; i++) iRec7[i] = 0;
		IOTA = 0;
		for (int i=0; i<256; i++) fVec5[i] = 0;
		for (int i=0; i<3; i++) fRec0[i] = 0;
		sig0.init(samplingFreq);
		sig0.fill(16,ftbl3);
		fslider4 = 0.0f;
		for (int i=0; i<2; i++) iVec6[i] = 0;
		for (int i=0; i<2; i++) iRec10[i] = 0;
		for (int i=0; i<2; i++) iVec7[i] = 0;
		for (int i=0; i<2; i++) fRec9[i] = 0;
		for (int i=0; i<512; i++) fVec8[i] = 0;
		for (int i=0; i<3; i++) fRec8[i] = 0;
		for (int i=0; i<2; i++) iVec9[i] = 0;
		for (int i=0; i<2; i++) fRec12[i] = 0;
		for (int i=0; i<512; i++) fVec10[i] = 0;
		for (int i=0; i<3; i++) fRec11[i] = 0;
		for (int i=0; i<2; i++) iVec11[i] = 0;
		for (int i=0; i<2; i++) fRec14[i] = 0;
		for (int i=0; i<512; i++) fVec12[i] = 0;
		for (int i=0; i<3; i++) fRec13[i] = 0;
		for (int i=0; i<2; i++) iVec13[i] = 0;
		for (int i=0; i<2; i++) fRec16[i] = 0;
		for (int i=0; i<256; i++) fVec14[i] = 0;
		for (int i=0; i<3; i++) fRec15[i] = 0;
		for (int i=0; i<2; i++) iVec15[i] = 0;
		for (int i=0; i<2; i++) fRec18[i] = 0;
		for (int i=0; i<256; i++) fVec16[i] = 0;
		for (int i=0; i<3; i++) fRec17[i] = 0;
		for (int i=0; i<2; i++) iVec17[i] = 0;
		for (int i=0; i<2; i++) fRec20[i] = 0;
		for (int i=0; i<256; i++) fVec18[i] = 0;
		for (int i=0; i<3; i++) fRec19[i] = 0;
		for (int i=0; i<2; i++) iVec19[i] = 0;
		for (int i=0; i<2; i++) fRec22[i] = 0;
		for (int i=0; i<256; i++) fVec20[i] = 0;
		for (int i=0; i<3; i++) fRec21[i] = 0;
		for (int i=0; i<2; i++) iVec21[i] = 0;
		for (int i=0; i<2; i++) fRec24[i] = 0;
		for (int i=0; i<256; i++) fVec22[i] = 0;
		for (int i=0; i<3; i++) fRec23[i] = 0;
		for (int i=0; i<2; i++) iVec23[i] = 0;
		for (int i=0; i<2; i++) fRec26[i] = 0;
		for (int i=0; i<128; i++) fVec24[i] = 0;
		for (int i=0; i<3; i++) fRec25[i] = 0;
		for (int i=0; i<2; i++) iVec25[i] = 0;
		for (int i=0; i<2; i++) fRec28[i] = 0;
		for (int i=0; i<128; i++) fVec26[i] = 0;
		for (int i=0; i<3; i++) fRec27[i] = 0;
		for (int i=0; i<2; i++) iVec27[i] = 0;
		for (int i=0; i<2; i++) fRec30[i] = 0;
		for (int i=0; i<128; i++) fVec28[i] = 0;
		for (int i=0; i<3; i++) fRec29[i] = 0;
		for (int i=0; i<2; i++) iVec29[i] = 0;
		for (int i=0; i<2; i++) fRec32[i] = 0;
		for (int i=0; i<256; i++) fVec30[i] = 0;
		for (int i=0; i<3; i++) fRec31[i] = 0;
		for (int i=0; i<2; i++) iVec31[i] = 0;
		for (int i=0; i<2; i++) fRec34[i] = 0;
		for (int i=0; i<256; i++) fVec32[i] = 0;
		for (int i=0; i<3; i++) fRec33[i] = 0;
		for (int i=0; i<2; i++) iVec33[i] = 0;
		for (int i=0; i<2; i++) fRec36[i] = 0;
		for (int i=0; i<128; i++) fVec34[i] = 0;
		for (int i=0; i<3; i++) fRec35[i] = 0;
		for (int i=0; i<2; i++) iVec35[i] = 0;
		for (int i=0; i<2; i++) fRec38[i] = 0;
		for (int i=0; i<128; i++) fVec36[i] = 0;
		for (int i=0; i<3; i++) fRec37[i] = 0;
		for (int i=0; i<2; i++) iVec37[i] = 0;
		for (int i=0; i<2; i++) fRec40[i] = 0;
		for (int i=0; i<128; i++) fVec38[i] = 0;
		for (int i=0; i<3; i++) fRec39[i] = 0;
		for (int i=0; i<2; i++) iVec39[i] = 0;
		for (int i=0; i<2; i++) fRec42[i] = 0;
		for (int i=0; i<128; i++) fVec40[i] = 0;
		for (int i=0; i<3; i++) fRec41[i] = 0;
		for (int i=0; i<2; i++) iVec41[i] = 0;
		for (int i=0; i<2; i++) fRec44[i] = 0;
		for (int i=0; i<128; i++) fVec42[i] = 0;
		for (int i=0; i<3; i++) fRec43[i] = 0;
		for (int i=0; i<2; i++) iVec43[i] = 0;
		for (int i=0; i<2; i++) fRec46[i] = 0;
		for (int i=0; i<64; i++) fVec44[i] = 0;
		for (int i=0; i<3; i++) fRec45[i] = 0;
		for (int i=0; i<2; i++) iVec45[i] = 0;
		for (int i=0; i<2; i++) fRec48[i] = 0;
		for (int i=0; i<64; i++) fVec46[i] = 0;
		for (int i=0; i<3; i++) fRec47[i] = 0;
		for (int i=0; i<2; i++) iVec47[i] = 0;
		for (int i=0; i<2; i++) fRec50[i] = 0;
		for (int i=0; i<64; i++) fVec48[i] = 0;
		for (int i=0; i<3; i++) fRec49[i] = 0;
		sig0.init(samplingFreq);
		sig0.fill(16,ftbl4);
		fslider5 = 0.0f;
		for (int i=0; i<2; i++) iVec49[i] = 0;
		for (int i=0; i<2; i++) iRec53[i] = 0;
		for (int i=0; i<2; i++) iVec50[i] = 0;
		for (int i=0; i<2; i++) fRec52[i] = 0;
		for (int i=0; i<128; i++) fVec51[i] = 0;
		for (int i=0; i<3; i++) fRec51[i] = 0;
		for (int i=0; i<2; i++) iVec52[i] = 0;
		for (int i=0; i<2; i++) fRec55[i] = 0;
		for (int i=0; i<128; i++) fVec53[i] = 0;
		for (int i=0; i<3; i++) fRec54[i] = 0;
		for (int i=0; i<2; i++) iVec54[i] = 0;
		for (int i=0; i<2; i++) fRec57[i] = 0;
		for (int i=0; i<128; i++) fVec55[i] = 0;
		for (int i=0; i<3; i++) fRec56[i] = 0;
		for (int i=0; i<2; i++) iVec56[i] = 0;
		for (int i=0; i<2; i++) fRec59[i] = 0;
		for (int i=0; i<64; i++) fVec57[i] = 0;
		for (int i=0; i<3; i++) fRec58[i] = 0;
		for (int i=0; i<2; i++) iVec58[i] = 0;
		for (int i=0; i<2; i++) fRec61[i] = 0;
		for (int i=0; i<64; i++) fVec59[i] = 0;
		for (int i=0; i<3; i++) fRec60[i] = 0;
		for (int i=0; i<2; i++) iVec60[i] = 0;
		for (int i=0; i<2; i++) fRec63[i] = 0;
		for (int i=0; i<64; i++) fVec61[i] = 0;
		for (int i=0; i<3; i++) fRec62[i] = 0;
		for (int i=0; i<2; i++) iVec62[i] = 0;
		for (int i=0; i<2; i++) fRec65[i] = 0;
		for (int i=0; i<64; i++) fVec63[i] = 0;
		for (int i=0; i<3; i++) fRec64[i] = 0;
		for (int i=0; i<2; i++) iVec64[i] = 0;
		for (int i=0; i<2; i++) fRec67[i] = 0;
		for (int i=0; i<64; i++) fVec65[i] = 0;
		for (int i=0; i<3; i++) fRec66[i] = 0;
		for (int i=0; i<2; i++) iVec66[i] = 0;
		for (int i=0; i<2; i++) fRec69[i] = 0;
		for (int i=0; i<32; i++) fVec67[i] = 0;
		for (int i=0; i<3; i++) fRec68[i] = 0;
		for (int i=0; i<2; i++) iVec68[i] = 0;
		for (int i=0; i<2; i++) fRec71[i] = 0;
		for (int i=0; i<32; i++) fVec69[i] = 0;
		for (int i=0; i<3; i++) fRec70[i] = 0;
		for (int i=0; i<2; i++) iVec70[i] = 0;
		for (int i=0; i<2; i++) fRec73[i] = 0;
		for (int i=0; i<32; i++) fVec71[i] = 0;
		for (int i=0; i<3; i++) fRec72[i] = 0;
	}
	virtual void init(int samplingFreq) {
		classInit(samplingFreq);
		instanceInit(samplingFreq);
	}
	virtual void buildUserInterface(UI* interface) {
		interface->openVerticalBox("kisana");
		interface->openHorizontalBox("Loops");
		interface->openVerticalBox("loop");
		interface->addVerticalSlider("level", &fslider3, 0.0f, 0.0f, 6.0f, 1.0f);
		interface->closeBox();
		interface->openVerticalBox("loop48");
		interface->declare(&fslider4, "1", "");
		interface->addVerticalSlider("note", &fslider4, 0.0f, 0.0f, 11.0f, 1.0f);
		interface->closeBox();
		interface->openVerticalBox("loop60");
		interface->declare(&fslider2, "1", "");
		interface->addVerticalSlider("note", &fslider2, 0.0f, 0.0f, 11.0f, 1.0f);
		interface->closeBox();
		interface->openVerticalBox("loop72");
		interface->declare(&fslider5, "1", "");
		interface->addVerticalSlider("note", &fslider5, 0.0f, 0.0f, 11.0f, 1.0f);
		interface->closeBox();
		interface->closeBox();
		interface->declare(&fslider0, "1", "");
		interface->addHorizontalSlider("master", &fslider0, -2e+01f, -6e+01f, 0.0f, 0.01f);
		interface->declare(&fslider1, "2", "");
		interface->addHorizontalSlider("timbre", &fslider1, 0.0f, 0.0f, 1.0f, 0.01f);
		interface->closeBox();
	}
	virtual void compute (int count, FAUSTFLOAT** input, FAUSTFLOAT** output) {
		float 	fSlow0 = powf(10,(0.05f * float(fslider0)));
		float 	fSlow1 = float(fslider1);
		int 	iSlow2 = (fSlow1 <= 0.0f);
		int 	iSlow3 = int(float(fslider2));
		int 	iSlow4 = (iSlow3 <= 0.0f);
		int 	iSlow5 = int(float(fslider3));
		int 	iSlow6 = (iSlow5 <= 0.0f);
		int 	iSlow7 = int(float(fslider4));
		int 	iSlow8 = (iSlow7 <= 0.0f);
		int 	iSlow9 = int(float(fslider5));
		int 	iSlow10 = (iSlow9 <= 0.0f);
		FAUSTFLOAT* output0 = output[0];
		FAUSTFLOAT* output1 = output[1];
		for (int i=0; i<count; i++) {
			iRec1[0] = ((1 + iRec1[1]) % iConst0);
			int iTemp0 = int((iRec1[0] == 0));
			iVec0[0] = iTemp0;
			int iTemp1 = int(iVec0[1]);
			fVec1[0] = fSlow1;
			fRec2[0] = ((iTemp1)?0:(fRec2[1] + fabsf((fSlow1 - fVec1[1]))));
			iRec3[0] = ((iVec0[0] + iRec3[1]) % 15);
			ftbl0[((int((iVec0[0] & ((fRec2[0] > 0) | iSlow2))))?iRec3[0]:15)] = fSlow1;
			float fTemp2 = ftbl0[iRec3[0]];
			float fTemp3 = (1 + fTemp2);
			float fTemp4 = (1 - fTemp2);
			iRec4[0] = (12345 + (1103515245 * iRec4[1]));
			iVec2[0] = iSlow3;
			iRec6[0] = ((iTemp1)?0:(iRec6[1] + abs((iSlow3 - iVec2[1]))));
			ftbl1[((int((iVec0[0] & ((iRec6[0] > 0) | iSlow4))))?iRec3[0]:15)] = iSlow3;
			float fTemp5 = ftbl1[iRec3[0]];
			int iTemp6 = (fabsf((fTemp5 - 1)) < 0.5f);
			iVec3[0] = iTemp6;
			fRec5[0] = ((fRec5[1] + ((iVec3[0] - iVec3[1]) > 0.0f)) - (0.00593255250114736f * (fRec5[1] > 0.0f)));
			iVec4[0] = iSlow5;
			iRec7[0] = ((iTemp1)?0:(iRec7[1] + abs((iSlow5 - iVec4[1]))));
			ftbl2[((int((iVec0[0] & ((iRec7[0] > 0) | iSlow6))))?iRec3[0]:15)] = iSlow5;
			float fTemp7 = powf(10,(0.05f * (ftbl2[iRec3[0]] - 6)));
			fVec5[IOTA&255] = ((0.4967104672162962f * ((fTemp3 * fRec0[1]) + (fTemp4 * fRec0[2]))) + (4.656612875245797e-10f * ((iRec4[0] * (fRec5[0] > 0.0f)) * fTemp7)));
			fRec0[0] = fVec5[(IOTA-167)&255];
			iVec6[0] = iSlow7;
			iRec10[0] = ((iTemp1)?0:(iRec10[1] + abs((iSlow7 - iVec6[1]))));
			ftbl3[((int((iVec0[0] & ((iRec10[0] > 0) | iSlow8))))?iRec3[0]:15)] = iSlow7;
			float fTemp8 = ftbl3[iRec3[0]];
			int iTemp9 = (fabsf((fTemp8 - 1)) < 0.5f);
			iVec7[0] = iTemp9;
			fRec9[0] = ((fRec9[1] + ((iVec7[0] - iVec7[1]) > 0.0f)) - (0.00296627625057368f * (fRec9[1] > 0.0f)));
			fVec8[IOTA&511] = ((0.4934425764844625f * ((fRec8[1] * fTemp3) + (fRec8[2] * fTemp4))) + (4.656612875245797e-10f * ((iRec4[0] * (fRec9[0] > 0.0f)) * fTemp7)));
			fRec8[0] = fVec8[(IOTA-336)&511];
			int iTemp10 = (fabsf((fTemp8 - 2)) < 0.5f);
			iVec9[0] = iTemp10;
			fRec12[0] = ((fRec12[1] + ((iVec9[0] - iVec9[1]) > 0.0f)) - (0.0033295325160703805f * (fRec12[1] > 0.0f)));
			fVec10[IOTA&511] = ((0.4941537998866976f * ((fTemp3 * fRec11[1]) + (fTemp4 * fRec11[2]))) + (4.656612875245797e-10f * ((iRec4[0] * (fRec12[0] > 0.0f)) * fTemp7)));
			fRec11[0] = fVec10[(IOTA-299)&511];
			int iTemp11 = (fabsf((fTemp8 - 3)) < 0.5f);
			iVec11[0] = iTemp11;
			fRec14[0] = ((fRec14[1] + ((iVec11[0] - iVec11[1]) > 0.0f)) - (0.00373727388790102f * (fRec14[1] > 0.0f)));
			fVec12[IOTA&511] = ((0.4947882913184981f * ((fTemp3 * fRec13[1]) + (fTemp4 * fRec13[2]))) + (4.656612875245797e-10f * ((iRec4[0] * (fRec14[0] > 0.0f)) * fTemp7)));
			fRec13[0] = fVec12[(IOTA-266)&511];
			int iTemp12 = (fabsf((fTemp8 - 4)) < 0.5f);
			iVec13[0] = iTemp12;
			fRec16[0] = ((fRec16[1] + ((iVec13[0] - iVec13[1]) > 0.0f)) - (0.004444392698205774f * (fRec16[1] > 0.0f)));
			fVec14[IOTA&255] = ((0.49561384415280396f * ((fTemp3 * fRec15[1]) + (fTemp4 * fRec15[2]))) + (4.656612875245797e-10f * ((iRec4[0] * (fRec16[0] > 0.0f)) * fTemp7)));
			fRec15[0] = fVec14[(IOTA-224)&255];
			int iTemp13 = (fabsf((fTemp8 - 5)) < 0.5f);
			iVec15[0] = iTemp13;
			fRec18[0] = ((fRec18[1] + ((iVec15[0] - iVec15[1]) > 0.0f)) - (0.004988662131519274f * (fRec18[1] > 0.0f)));
			fVec16[IOTA&255] = ((0.49609050335141536f * ((fTemp3 * fRec17[1]) + (fTemp4 * fRec17[2]))) + (4.656612875245797e-10f * ((iRec4[0] * (fRec18[0] > 0.0f)) * fTemp7)));
			fRec17[0] = fVec16[(IOTA-199)&255];
			int iTemp14 = (fabsf((fTemp8 - 6)) < 0.5f);
			iVec17[0] = iTemp14;
			fRec20[0] = ((fRec20[1] + ((iVec17[0] - iVec17[1]) > 0.0f)) - (0.00593255250114736f * (fRec20[1] > 0.0f)));
			fVec18[IOTA&255] = ((0.4967104672162962f * ((fTemp3 * fRec19[1]) + (fTemp4 * fRec19[2]))) + (4.656612875245797e-10f * ((iRec4[0] * (fRec20[0] > 0.0f)) * fTemp7)));
			fRec19[0] = fVec18[(IOTA-167)&255];
			int iTemp15 = (fabsf((fTemp8 - 7)) < 0.5f);
			iVec19[0] = iTemp15;
			fRec22[0] = ((fRec22[1] + ((iVec19[0] - iVec19[1]) > 0.0f)) - (0.006659065032140761f * (fRec22[1] > 0.0f)));
			fVec20[IOTA&255] = ((0.49706830510841143f * ((fTemp3 * fRec21[1]) + (fTemp4 * fRec21[2]))) + (4.656612875245797e-10f * ((iRec4[0] * (fRec22[0] > 0.0f)) * fTemp7)));
			fRec21[0] = fVec20[(IOTA-149)&255];
			int iTemp16 = (fabsf((fTemp8 - 8)) < 0.5f);
			iVec21[0] = iTemp16;
			fRec24[0] = ((fRec24[1] + ((iVec21[0] - iVec21[1]) > 0.0f)) - (0.00747454777580204f * (fRec24[1] > 0.0f)));
			fVec22[IOTA&255] = ((0.49738731956016835f * ((fTemp3 * fRec23[1]) + (fTemp4 * fRec23[2]))) + (4.656612875245797e-10f * ((iRec4[0] * (fRec24[0] > 0.0f)) * fTemp7)));
			fRec23[0] = fVec22[(IOTA-132)&255];
			int iTemp17 = (fabsf((fTemp8 - 9)) < 0.5f);
			iVec23[0] = iTemp17;
			fRec26[0] = ((fRec26[1] + ((iVec23[0] - iVec23[1]) > 0.0f)) - (0.008888785396411547f * (fRec26[1] > 0.0f)));
			fVec24[IOTA&127] = ((0.4978020912736325f * ((fTemp3 * fRec25[1]) + (fTemp4 * fRec25[2]))) + (4.656612875245797e-10f * ((iRec4[0] * (fRec26[0] > 0.0f)) * fTemp7)));
			fRec25[0] = fVec24[(IOTA-111)&127];
			int iTemp18 = (fabsf((fTemp8 - 10)) < 0.5f);
			iVec25[0] = iTemp18;
			fRec28[0] = ((fRec28[1] + ((iVec25[0] - iVec25[1]) > 0.0f)) - (0.009977324263038548f * (fRec28[1] > 0.0f)));
			fVec26[IOTA&127] = ((0.4980414156229456f * ((fTemp3 * fRec27[1]) + (fTemp4 * fRec27[2]))) + (4.656612875245797e-10f * ((iRec4[0] * (fRec28[0] > 0.0f)) * fTemp7)));
			fRec27[0] = fVec26[(IOTA-99)&127];
			int iTemp19 = (fabsf((fTemp8 - 11)) < 0.5f);
			iVec27[0] = iTemp19;
			fRec30[0] = ((fRec30[1] + ((iVec27[0] - iVec27[1]) > 0.0f)) - (0.01186510500229472f * (fRec30[1] > 0.0f)));
			fVec28[IOTA&127] = ((0.498352519415873f * ((fTemp3 * fRec29[1]) + (fTemp4 * fRec29[2]))) + (4.656612875245797e-10f * ((iRec4[0] * (fRec30[0] > 0.0f)) * fTemp7)));
			fRec29[0] = fVec28[(IOTA-83)&127];
			int iTemp20 = (fabsf((fTemp5 - 2)) < 0.5f);
			iVec29[0] = iTemp20;
			fRec32[0] = ((fRec32[1] + ((iVec29[0] - iVec29[1]) > 0.0f)) - (0.006659065032140761f * (fRec32[1] > 0.0f)));
			fVec30[IOTA&255] = ((0.49706830510841143f * ((fTemp3 * fRec31[1]) + (fTemp4 * fRec31[2]))) + (4.656612875245797e-10f * ((iRec4[0] * (fRec32[0] > 0.0f)) * fTemp7)));
			fRec31[0] = fVec30[(IOTA-149)&255];
			int iTemp21 = (fabsf((fTemp5 - 3)) < 0.5f);
			iVec31[0] = iTemp21;
			fRec34[0] = ((fRec34[1] + ((iVec31[0] - iVec31[1]) > 0.0f)) - (0.00747454777580204f * (fRec34[1] > 0.0f)));
			fVec32[IOTA&255] = ((0.49738731956016835f * ((fTemp3 * fRec33[1]) + (fTemp4 * fRec33[2]))) + (4.656612875245797e-10f * ((iRec4[0] * (fRec34[0] > 0.0f)) * fTemp7)));
			fRec33[0] = fVec32[(IOTA-132)&255];
			int iTemp22 = (fabsf((fTemp5 - 4)) < 0.5f);
			iVec33[0] = iTemp22;
			fRec36[0] = ((fRec36[1] + ((iVec33[0] - iVec33[1]) > 0.0f)) - (0.008888785396411547f * (fRec36[1] > 0.0f)));
			fVec34[IOTA&127] = ((0.4978020912736325f * ((fTemp3 * fRec35[1]) + (fTemp4 * fRec35[2]))) + (4.656612875245797e-10f * ((iRec4[0] * (fRec36[0] > 0.0f)) * fTemp7)));
			fRec35[0] = fVec34[(IOTA-111)&127];
			int iTemp23 = (fabsf((fTemp5 - 5)) < 0.5f);
			iVec35[0] = iTemp23;
			fRec38[0] = ((fRec38[1] + ((iVec35[0] - iVec35[1]) > 0.0f)) - (0.009977324263038548f * (fRec38[1] > 0.0f)));
			fVec36[IOTA&127] = ((0.4980414156229456f * ((fTemp3 * fRec37[1]) + (fTemp4 * fRec37[2]))) + (4.656612875245797e-10f * ((iRec4[0] * (fRec38[0] > 0.0f)) * fTemp7)));
			fRec37[0] = fVec36[(IOTA-99)&127];
			int iTemp24 = (fabsf((fTemp5 - 6)) < 0.5f);
			iVec37[0] = iTemp24;
			fRec40[0] = ((fRec40[1] + ((iVec37[0] - iVec37[1]) > 0.0f)) - (0.01186510500229472f * (fRec40[1] > 0.0f)));
			fVec38[IOTA&127] = ((0.498352519415873f * ((fTemp3 * fRec39[1]) + (fTemp4 * fRec39[2]))) + (4.656612875245797e-10f * ((iRec4[0] * (fRec40[0] > 0.0f)) * fTemp7)));
			fRec39[0] = fVec38[(IOTA-83)&127];
			int iTemp25 = (fabsf((fTemp5 - 7)) < 0.5f);
			iVec39[0] = iTemp25;
			fRec42[0] = ((fRec42[1] + ((iVec39[0] - iVec39[1]) > 0.0f)) - (0.013318130064281522f * (fRec42[1] > 0.0f)));
			fVec40[IOTA&127] = ((0.49853199752293303f * ((fTemp3 * fRec41[1]) + (fTemp4 * fRec41[2]))) + (4.656612875245797e-10f * ((iRec4[0] * (fRec42[0] > 0.0f)) * fTemp7)));
			fRec41[0] = fVec40[(IOTA-74)&127];
			int iTemp26 = (fabsf((fTemp5 - 8)) < 0.5f);
			iVec41[0] = iTemp26;
			fRec44[0] = ((fRec44[1] + ((iVec41[0] - iVec41[1]) > 0.0f)) - (0.01494909555160408f * (fRec44[1] > 0.0f)));
			fVec42[IOTA&127] = ((0.49869194878209555f * ((fTemp3 * fRec43[1]) + (fTemp4 * fRec43[2]))) + (4.656612875245797e-10f * ((iRec4[0] * (fRec44[0] > 0.0f)) * fTemp7)));
			fRec43[0] = fVec42[(IOTA-65)&127];
			int iTemp27 = (fabsf((fTemp5 - 9)) < 0.5f);
			iVec43[0] = iTemp27;
			fRec46[0] = ((fRec46[1] + ((iVec43[0] - iVec43[1]) > 0.0f)) - (0.017777570792823095f * (fRec46[1] > 0.0f)));
			fVec44[IOTA&63] = ((0.4988998352743928f * ((fTemp3 * fRec45[1]) + (fTemp4 * fRec45[2]))) + (4.656612875245797e-10f * ((iRec4[0] * (fRec46[0] > 0.0f)) * fTemp7)));
			fRec45[0] = fVec44[(IOTA-55)&63];
			int iTemp28 = (fabsf((fTemp5 - 10)) < 0.5f);
			iVec45[0] = iTemp28;
			fRec48[0] = ((fRec48[1] + ((iVec45[0] - iVec45[1]) > 0.0f)) - (0.019954648526077097f * (fRec48[1] > 0.0f)));
			fVec46[IOTA&63] = ((0.4990197469153629f * ((fTemp3 * fRec47[1]) + (fTemp4 * fRec47[2]))) + (4.656612875245797e-10f * ((iRec4[0] * (fRec48[0] > 0.0f)) * fTemp7)));
			fRec47[0] = fVec46[(IOTA-49)&63];
			int iTemp29 = (fabsf((fTemp5 - 11)) < 0.5f);
			iVec47[0] = iTemp29;
			fRec50[0] = ((fRec50[1] + ((iVec47[0] - iVec47[1]) > 0.0f)) - (0.02373021000458944f * (fRec50[1] > 0.0f)));
			fVec48[IOTA&63] = ((0.4991755800396655f * ((fTemp3 * fRec49[1]) + (fTemp4 * fRec49[2]))) + (4.656612875245797e-10f * ((iRec4[0] * (fRec50[0] > 0.0f)) * fTemp7)));
			fRec49[0] = fVec48[(IOTA-41)&63];
			iVec49[0] = iSlow9;
			iRec53[0] = ((iTemp1)?0:(iRec53[1] + abs((iSlow9 - iVec49[1]))));
			ftbl4[((int((iVec0[0] & ((iRec53[0] > 0) | iSlow10))))?iRec3[0]:15)] = iSlow9;
			float fTemp30 = ftbl4[iRec3[0]];
			int iTemp31 = (fabsf((fTemp30 - 1)) < 0.5f);
			iVec50[0] = iTemp31;
			fRec52[0] = ((fRec52[1] + ((iVec50[0] - iVec50[1]) > 0.0f)) - (0.01186510500229472f * (fRec52[1] > 0.0f)));
			fVec51[IOTA&127] = ((0.498352519415873f * ((fTemp4 * fRec51[2]) + (fTemp3 * fRec51[1]))) + (4.656612875245797e-10f * ((iRec4[0] * (fRec52[0] > 0.0f)) * fTemp7)));
			fRec51[0] = fVec51[(IOTA-83)&127];
			int iTemp32 = (fabsf((fTemp30 - 2)) < 0.5f);
			iVec52[0] = iTemp32;
			fRec55[0] = ((fRec55[1] + ((iVec52[0] - iVec52[1]) > 0.0f)) - (0.013318130064281522f * (fRec55[1] > 0.0f)));
			fVec53[IOTA&127] = ((0.49853199752293303f * ((fTemp3 * fRec54[1]) + (fTemp4 * fRec54[2]))) + (4.656612875245797e-10f * ((iRec4[0] * (fRec55[0] > 0.0f)) * fTemp7)));
			fRec54[0] = fVec53[(IOTA-74)&127];
			int iTemp33 = (fabsf((fTemp30 - 3)) < 0.5f);
			iVec54[0] = iTemp33;
			fRec57[0] = ((fRec57[1] + ((iVec54[0] - iVec54[1]) > 0.0f)) - (0.01494909555160408f * (fRec57[1] > 0.0f)));
			fVec55[IOTA&127] = ((0.49869194878209555f * ((fTemp3 * fRec56[1]) + (fTemp4 * fRec56[2]))) + (4.656612875245797e-10f * ((iRec4[0] * (fRec57[0] > 0.0f)) * fTemp7)));
			fRec56[0] = fVec55[(IOTA-65)&127];
			int iTemp34 = (fabsf((fTemp30 - 4)) < 0.5f);
			iVec56[0] = iTemp34;
			fRec59[0] = ((fRec59[1] + ((iVec56[0] - iVec56[1]) > 0.0f)) - (0.017777570792823095f * (fRec59[1] > 0.0f)));
			fVec57[IOTA&63] = ((0.4988998352743928f * ((fTemp3 * fRec58[1]) + (fTemp4 * fRec58[2]))) + (4.656612875245797e-10f * ((iRec4[0] * (fRec59[0] > 0.0f)) * fTemp7)));
			fRec58[0] = fVec57[(IOTA-55)&63];
			int iTemp35 = (fabsf((fTemp30 - 5)) < 0.5f);
			iVec58[0] = iTemp35;
			fRec61[0] = ((fRec61[1] + ((iVec58[0] - iVec58[1]) > 0.0f)) - (0.019954648526077097f * (fRec61[1] > 0.0f)));
			fVec59[IOTA&63] = ((0.4990197469153629f * ((fTemp3 * fRec60[1]) + (fTemp4 * fRec60[2]))) + (4.656612875245797e-10f * ((iRec4[0] * (fRec61[0] > 0.0f)) * fTemp7)));
			fRec60[0] = fVec59[(IOTA-49)&63];
			int iTemp36 = (fabsf((fTemp30 - 6)) < 0.5f);
			iVec60[0] = iTemp36;
			fRec63[0] = ((fRec63[1] + ((iVec60[0] - iVec60[1]) > 0.0f)) - (0.02373021000458944f * (fRec63[1] > 0.0f)));
			fVec61[IOTA&63] = ((0.4991755800396655f * ((fTemp3 * fRec62[1]) + (fTemp4 * fRec62[2]))) + (4.656612875245797e-10f * ((iRec4[0] * (fRec63[0] > 0.0f)) * fTemp7)));
			fRec62[0] = fVec61[(IOTA-41)&63];
			float fTemp37 = (0.7071067811865476f * fRec62[0]);
			int iTemp38 = (fabsf((fTemp30 - 7)) < 0.5f);
			iVec62[0] = iTemp38;
			fRec65[0] = ((fRec65[1] + ((iVec62[0] - iVec62[1]) > 0.0f)) - (0.026636260128563044f * (fRec65[1] > 0.0f)));
			fVec63[IOTA&63] = ((0.4992654592112963f * ((fTemp3 * fRec64[1]) + (fTemp4 * fRec64[2]))) + (4.656612875245797e-10f * ((iRec4[0] * (fRec65[0] > 0.0f)) * fTemp7)));
			fRec64[0] = fVec63[(IOTA-36)&63];
			int iTemp39 = (fabsf((fTemp30 - 8)) < 0.5f);
			iVec64[0] = iTemp39;
			fRec67[0] = ((fRec67[1] + ((iVec64[0] - iVec64[1]) > 0.0f)) - (0.02989819110320816f * (fRec67[1] > 0.0f)));
			fVec65[IOTA&63] = ((0.4993455460811158f * ((fTemp3 * fRec66[1]) + (fTemp4 * fRec66[2]))) + (4.656612875245797e-10f * ((iRec4[0] * (fRec67[0] > 0.0f)) * fTemp7)));
			fRec66[0] = fVec65[(IOTA-32)&63];
			int iTemp40 = (fabsf((fTemp30 - 9)) < 0.5f);
			iVec66[0] = iTemp40;
			fRec69[0] = ((fRec69[1] + ((iVec66[0] - iVec66[1]) > 0.0f)) - (0.03555514158564619f * (fRec69[1] > 0.0f)));
			fVec67[IOTA&31] = ((0.4994496147132325f * ((fTemp3 * fRec68[1]) + (fTemp4 * fRec68[2]))) + (4.656612875245797e-10f * ((iRec4[0] * (fRec69[0] > 0.0f)) * fTemp7)));
			fRec68[0] = fVec67[(IOTA-27)&31];
			int iTemp41 = (fabsf((fTemp30 - 10)) < 0.5f);
			iVec68[0] = iTemp41;
			fRec71[0] = ((fRec71[1] + ((iVec68[0] - iVec68[1]) > 0.0f)) - (0.039909297052154194f * (fRec71[1] > 0.0f)));
			fVec69[IOTA&31] = ((0.49950963299788465f * ((fTemp3 * fRec70[1]) + (fTemp4 * fRec70[2]))) + (4.656612875245797e-10f * ((iRec4[0] * (fRec71[0] > 0.0f)) * fTemp7)));
			fRec70[0] = fVec69[(IOTA-24)&31];
			int iTemp42 = (fabsf((fTemp30 - 11)) < 0.5f);
			iVec70[0] = iTemp42;
			fRec73[0] = ((fRec73[1] + ((iVec70[0] - iVec70[1]) > 0.0f)) - (0.04746042000917888f * (fRec73[1] > 0.0f)));
			fVec71[IOTA&31] = ((0.4995876199625375f * ((fTemp3 * fRec72[1]) + (fTemp4 * fRec72[2]))) + (4.656612875245797e-10f * ((iRec4[0] * (fRec73[0] > 0.0f)) * fTemp7)));
			fRec72[0] = fVec71[(IOTA-20)&31];
			output0[i] = (FAUSTFLOAT)(fSlow0 * ((0.9770084209183945f * (((((((((((fRec0[0] + ((((((((((fRec8[0] + (0.9511897312113419f * fRec11[0])) + (0.8997354108424374f * fRec13[0])) + (0.8451542547285166f * fRec15[0])) + (0.786795792469443f * fRec17[0])) + (0.7237468644557459f * fRec19[0])) + (0.6546536707079771f * fRec21[0])) + (0.5773502691896257f * fRec23[0])) + (0.4879500364742666f * fRec25[0])) + (0.3779644730092272f * fRec27[0])) + (0.21821789023599225f * fRec29[0]))) + (0.9511897312113419f * fRec31[0])) + (0.8997354108424374f * fRec33[0])) + (0.8451542547285166f * fRec35[0])) + (0.786795792469443f * fRec37[0])) + (0.7237468644557459f * fRec39[0])) + (0.6546536707079771f * fRec41[0])) + (0.5773502691896257f * fRec43[0])) + (0.4879500364742666f * fRec45[0])) + (0.3779644730092272f * fRec47[0])) + (0.21821789023599225f * fRec49[0]))) + (1.5f * (((((((((((0.9770084209183945f * fRec51[0]) + (0.9293203772845852f * fRec54[0])) + (0.8790490729915326f * fRec56[0])) + (0.8257228238447705f * fRec58[0])) + (0.7687061147858073f * fRec60[0])) + fTemp37) + (0.6396021490668313f * fRec64[0])) + (0.5640760748177662f * fRec66[0])) + (0.4767312946227962f * fRec68[0])) + (0.3692744729379982f * fRec70[0])) + (0.21320071635561033f * fRec72[0])))));
			output1[i] = (FAUSTFLOAT)(fSlow0 * ((0.21320071635561044f * (((((((((((fRec0[0] + ((((((((((fRec8[0] + (1.7320508075688772f * fRec11[0])) + (2.23606797749979f * fRec13[0])) + (2.6457513110645907f * fRec15[0])) + (3.0f * fRec17[0])) + (3.3166247903554f * fRec19[0])) + (3.605551275463989f * fRec21[0])) + (3.872983346207417f * fRec23[0])) + (4.123105625617661f * fRec25[0])) + (4.358898943540674f * fRec27[0])) + (4.58257569495584f * fRec29[0]))) + (1.7320508075688772f * fRec31[0])) + (2.23606797749979f * fRec33[0])) + (2.6457513110645907f * fRec35[0])) + (3.0f * fRec37[0])) + (3.3166247903554f * fRec39[0])) + (3.605551275463989f * fRec41[0])) + (3.872983346207417f * fRec43[0])) + (4.123105625617661f * fRec45[0])) + (4.358898943540674f * fRec47[0])) + (4.58257569495584f * fRec49[0]))) + (1.5f * ((((0.8790490729915326f * fRec68[0]) + ((0.8257228238447705f * fRec66[0]) + ((0.7687061147858074f * fRec64[0]) + (fTemp37 + (((0.5640760748177662f * fRec58[0]) + ((0.4767312946227962f * fRec56[0]) + ((0.3692744729379982f * fRec54[0]) + (0.21320071635561044f * fRec51[0])))) + (0.6396021490668313f * fRec60[0])))))) + (0.9293203772845852f * fRec70[0])) + (0.9770084209183945f * fRec72[0])))));
			// post processing
			fRec72[2] = fRec72[1]; fRec72[1] = fRec72[0];
			fRec73[1] = fRec73[0];
			iVec70[1] = iVec70[0];
			fRec70[2] = fRec70[1]; fRec70[1] = fRec70[0];
			fRec71[1] = fRec71[0];
			iVec68[1] = iVec68[0];
			fRec68[2] = fRec68[1]; fRec68[1] = fRec68[0];
			fRec69[1] = fRec69[0];
			iVec66[1] = iVec66[0];
			fRec66[2] = fRec66[1]; fRec66[1] = fRec66[0];
			fRec67[1] = fRec67[0];
			iVec64[1] = iVec64[0];
			fRec64[2] = fRec64[1]; fRec64[1] = fRec64[0];
			fRec65[1] = fRec65[0];
			iVec62[1] = iVec62[0];
			fRec62[2] = fRec62[1]; fRec62[1] = fRec62[0];
			fRec63[1] = fRec63[0];
			iVec60[1] = iVec60[0];
			fRec60[2] = fRec60[1]; fRec60[1] = fRec60[0];
			fRec61[1] = fRec61[0];
			iVec58[1] = iVec58[0];
			fRec58[2] = fRec58[1]; fRec58[1] = fRec58[0];
			fRec59[1] = fRec59[0];
			iVec56[1] = iVec56[0];
			fRec56[2] = fRec56[1]; fRec56[1] = fRec56[0];
			fRec57[1] = fRec57[0];
			iVec54[1] = iVec54[0];
			fRec54[2] = fRec54[1]; fRec54[1] = fRec54[0];
			fRec55[1] = fRec55[0];
			iVec52[1] = iVec52[0];
			fRec51[2] = fRec51[1]; fRec51[1] = fRec51[0];
			fRec52[1] = fRec52[0];
			iVec50[1] = iVec50[0];
			iRec53[1] = iRec53[0];
			iVec49[1] = iVec49[0];
			fRec49[2] = fRec49[1]; fRec49[1] = fRec49[0];
			fRec50[1] = fRec50[0];
			iVec47[1] = iVec47[0];
			fRec47[2] = fRec47[1]; fRec47[1] = fRec47[0];
			fRec48[1] = fRec48[0];
			iVec45[1] = iVec45[0];
			fRec45[2] = fRec45[1]; fRec45[1] = fRec45[0];
			fRec46[1] = fRec46[0];
			iVec43[1] = iVec43[0];
			fRec43[2] = fRec43[1]; fRec43[1] = fRec43[0];
			fRec44[1] = fRec44[0];
			iVec41[1] = iVec41[0];
			fRec41[2] = fRec41[1]; fRec41[1] = fRec41[0];
			fRec42[1] = fRec42[0];
			iVec39[1] = iVec39[0];
			fRec39[2] = fRec39[1]; fRec39[1] = fRec39[0];
			fRec40[1] = fRec40[0];
			iVec37[1] = iVec37[0];
			fRec37[2] = fRec37[1]; fRec37[1] = fRec37[0];
			fRec38[1] = fRec38[0];
			iVec35[1] = iVec35[0];
			fRec35[2] = fRec35[1]; fRec35[1] = fRec35[0];
			fRec36[1] = fRec36[0];
			iVec33[1] = iVec33[0];
			fRec33[2] = fRec33[1]; fRec33[1] = fRec33[0];
			fRec34[1] = fRec34[0];
			iVec31[1] = iVec31[0];
			fRec31[2] = fRec31[1]; fRec31[1] = fRec31[0];
			fRec32[1] = fRec32[0];
			iVec29[1] = iVec29[0];
			fRec29[2] = fRec29[1]; fRec29[1] = fRec29[0];
			fRec30[1] = fRec30[0];
			iVec27[1] = iVec27[0];
			fRec27[2] = fRec27[1]; fRec27[1] = fRec27[0];
			fRec28[1] = fRec28[0];
			iVec25[1] = iVec25[0];
			fRec25[2] = fRec25[1]; fRec25[1] = fRec25[0];
			fRec26[1] = fRec26[0];
			iVec23[1] = iVec23[0];
			fRec23[2] = fRec23[1]; fRec23[1] = fRec23[0];
			fRec24[1] = fRec24[0];
			iVec21[1] = iVec21[0];
			fRec21[2] = fRec21[1]; fRec21[1] = fRec21[0];
			fRec22[1] = fRec22[0];
			iVec19[1] = iVec19[0];
			fRec19[2] = fRec19[1]; fRec19[1] = fRec19[0];
			fRec20[1] = fRec20[0];
			iVec17[1] = iVec17[0];
			fRec17[2] = fRec17[1]; fRec17[1] = fRec17[0];
			fRec18[1] = fRec18[0];
			iVec15[1] = iVec15[0];
			fRec15[2] = fRec15[1]; fRec15[1] = fRec15[0];
			fRec16[1] = fRec16[0];
			iVec13[1] = iVec13[0];
			fRec13[2] = fRec13[1]; fRec13[1] = fRec13[0];
			fRec14[1] = fRec14[0];
			iVec11[1] = iVec11[0];
			fRec11[2] = fRec11[1]; fRec11[1] = fRec11[0];
			fRec12[1] = fRec12[0];
			iVec9[1] = iVec9[0];
			fRec8[2] = fRec8[1]; fRec8[1] = fRec8[0];
			fRec9[1] = fRec9[0];
			iVec7[1] = iVec7[0];
			iRec10[1] = iRec10[0];
			iVec6[1] = iVec6[0];
			fRec0[2] = fRec0[1]; fRec0[1] = fRec0[0];
			IOTA = IOTA+1;
			iRec7[1] = iRec7[0];
			iVec4[1] = iVec4[0];
			fRec5[1] = fRec5[0];
			iVec3[1] = iVec3[0];
			iRec6[1] = iRec6[0];
			iVec2[1] = iVec2[0];
			iRec4[1] = iRec4[0];
			iRec3[1] = iRec3[0];
			fRec2[1] = fRec2[0];
			fVec1[1] = fVec1[0];
			iVec0[1] = iVec0[0];
			iRec1[1] = iRec1[0];
		}
	}
};


#ifdef FAUST_UIMACROS
	#define FAUST_INPUTS 0
	#define FAUST_OUTPUTS 2
	#define FAUST_ACTIVES 6
	#define FAUST_PASSIVES 0
	FAUST_ADDVERTICALSLIDER("kisana/Loops/loop/level", fslider3, 0.0f, 0.0f, 6.0f, 1.0f);
	FAUST_ADDVERTICALSLIDER("kisana/Loops/loop48/note", fslider4, 0.0f, 0.0f, 11.0f, 1.0f);
	FAUST_ADDVERTICALSLIDER("kisana/Loops/loop60/note", fslider2, 0.0f, 0.0f, 11.0f, 1.0f);
	FAUST_ADDVERTICALSLIDER("kisana/Loops/loop72/note", fslider5, 0.0f, 0.0f, 11.0f, 1.0f);
	FAUST_ADDHORIZONTALSLIDER("kisana/master", fslider0, -2e+01f, -6e+01f, 0.0f, 0.01f);
	FAUST_ADDHORIZONTALSLIDER("kisana/timbre", fslider1, 0.0f, 0.0f, 1.0f, 0.01f);
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
        
        // Make a new kisana object
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
