//-----------------------------------------------------
// name: "Noise"
// version: "1.1"
// author: "Grame"
// license: "BSD"
// copyright: "(c)GRAME 2009"
//
// Code generated with Faust 0.9.59 (http://faust.grame.fr)
//-----------------------------------------------------
/* link with  */
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


#include <libgen.h>
#include <stdlib.h>
#include <iostream>

#include "faust/gui/FUI.h"
#include "faust/gui/faustqt.h"
#include "faust/misc.h"
#include "faust/audio/coreaudio-dsp.h"

#ifdef OSCCTRL
#include "faust/gui/OSCUI.h"
#endif

#ifdef HTTPCTRL
#include "faust/gui/httpdUI.h"
#endif

/**************************BEGIN USER SECTION **************************/

/******************************************************************************
*******************************************************************************

							       VECTOR INTRINSICS

*******************************************************************************
*******************************************************************************/


#ifndef FAUSTFLOAT
#define FAUSTFLOAT float
#endif  

typedef long double quad;

#ifndef FAUSTCLASS 
#define FAUSTCLASS mydsp
#endif

class mydsp : public dsp {
  private:
	FAUSTFLOAT 	fslider0;
	int 	iRec0[2];
  public:
	static void metadata(Meta* m) 	{ 
		m->declare("name", "Noise");
		m->declare("version", "1.1");
		m->declare("author", "Grame");
		m->declare("license", "BSD");
		m->declare("copyright", "(c)GRAME 2009");
	}

	virtual int getNumInputs() 	{ return 0; }
	virtual int getNumOutputs() 	{ return 1; }
	static void classInit(int samplingFreq) {
	}
	virtual void instanceInit(int samplingFreq) {
		fSamplingFreq = samplingFreq;
		fslider0 = 0.0f;
		for (int i=0; i<2; i++) iRec0[i] = 0;
	}
	virtual void init(int samplingFreq) {
		classInit(samplingFreq);
		instanceInit(samplingFreq);
	}
	virtual void buildUserInterface(UI* interface) {
		interface->openVerticalBox("noise");
		interface->declare(&fslider0, "style", "knob");
		interface->addVerticalSlider("Volume", &fslider0, 0.0f, 0.0f, 1.0f, 0.1f);
		interface->closeBox();
	}
	virtual void compute (int count, FAUSTFLOAT** input, FAUSTFLOAT** output) {
		float 	fSlow0 = (4.656612875245797e-10f * fslider0);
		FAUSTFLOAT* output0 = output[0];
		for (int i=0; i<count; i++) {
			iRec0[0] = (12345 + (1103515245 * iRec0[1]));
			output0[i] = (FAUSTFLOAT)(fSlow0 * iRec0[0]);
			// post processing
			iRec0[1] = iRec0[0];
		}
	}
};



/***************************END USER SECTION ***************************/

/*******************BEGIN ARCHITECTURE SECTION (part 2/2)***************/

mydsp	DSP;

list<GUI*>               GUI::fGuiList;

/******************************************************************************
*******************************************************************************

                                MAIN PLAY THREAD

*******************************************************************************
*******************************************************************************/

int main(int argc, char *argv[])
{
	char name[256];
	char rcfilename[256];
	char* home = getenv("HOME");

	snprintf(name, 255, "%s", basename(argv[0]));
	snprintf(rcfilename, 255, "%s/.%src", home, basename(argv[0]));

    long srate = (long)lopt(argv, "--frequency", 44100);
    int	fpb = lopt(argv, "--buffer", 512);

	GUI* interface = new QTGUI(argc, argv);
	DSP.buildUserInterface(interface);
	FUI* finterface	= new FUI();
	DSP.buildUserInterface(finterface);

#ifdef HTTPCTRL
	httpdUI*	httpdinterface = new httpdUI(name, argc, argv);
	DSP.buildUserInterface(httpdinterface);
#endif

#ifdef OSCCTRL
	GUI*	oscinterface = new OSCUI(name, argc, argv);
	DSP.buildUserInterface(oscinterface);
#endif

	coreaudio audio(srate, fpb);
	audio.init(name, &DSP);
	finterface->recallState(rcfilename);
	audio.start();

#ifdef HTTPCTRL
	httpdinterface->run();
#endif

#ifdef OSCCTRL
	oscinterface->run();
#endif
	interface->run();

	audio.stop();
	finterface->saveState(rcfilename);
  	return 0;
}


/********************END ARCHITECTURE SECTION (part 2/2)****************/


