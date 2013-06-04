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

#ifndef FAUST_FUI_H
#define FAUST_FUI_H

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

#include <string>
#include <map>
#include <set>
#include <vector>
#include <stack>

#include <iostream>
#include <fstream>

using namespace std;

#if 1

/*******************************************************************************
 * FUI : used to save and recall the state of the user interface
 * This class provides essentially two new methods saveState() and recallState()
 * used to save on file and recall from file the state of the user interface.
 * The file is human readble and editable
 ******************************************************************************/

class FUI : public UI
{
	stack<string>		fGroupStack;
	vector<string>		fNameList;
	map<string, FAUSTFLOAT*>	fName2Zone;

 protected:

 	// labels are normalized by replacing white spaces by underscores and by
 	// removing parenthesis
	string normalizeLabel(const char* label)
	{
		string 	s;
		char 	c;

		while ((c=*label++)) {
			if (isspace(c)) 				{ s += '_'; }
			//else if ((c == '(') | (c == ')') ) 	{ }
			else 							{ s += c; }
		}
		return s;
	}

	// add an element by relating its full name and memory zone
	virtual void addElement(const char* label, FAUSTFLOAT* zone)
	{
		string fullname (fGroupStack.top() + '/' + normalizeLabel(label));
		fNameList.push_back(fullname);
		fName2Zone[fullname] = zone;
	}

	// keep track of full group names in a stack
	virtual void pushGroupLabel(const char* label)
	{
		if (fGroupStack.empty()) {
			fGroupStack.push(normalizeLabel(label));
		} else {
			fGroupStack.push(fGroupStack.top() + '/' + normalizeLabel(label));
		}
	}

	virtual void popGroupLabel()
	{
		fGroupStack.pop();
	};

 public:

	FUI() 			{}
	virtual ~FUI() 	{}

	// -- Save and recall methods

	// save the zones values and full names
	virtual void saveState(const char* filename)
	{
		ofstream f(filename);

		for (unsigned int i=0; i<fNameList.size(); i++) {
			string	n = fNameList[i];
			FAUSTFLOAT*	z = fName2Zone[n];
			f << *z << ' ' << n.c_str() << endl;
		}

		f << endl;
		f.close();
	}

	// recall the zones values and full names
	virtual void recallState(const char* filename)
	{
		ifstream f(filename);
		FAUSTFLOAT	v;
		string	n;

		while (f.good()) {
			f >> v >> n;
			if (fName2Zone.count(n)>0) {
				*(fName2Zone[n]) = v;
			} else {
				cerr << "recallState : parameter not found : " << n.c_str() << " with value : " << v << endl;
			}
		}
		f.close();
	}


    // -- widget's layouts (just keep track of group labels)

    virtual void openTabBox(const char* label) 			{ pushGroupLabel(label); }
    virtual void openHorizontalBox(const char* label) 	{ pushGroupLabel(label); }
    virtual void openVerticalBox(const char* label)  	{ pushGroupLabel(label); }
    virtual void closeBox() 							{ popGroupLabel(); };

    // -- active widgets (just add an element)

    virtual void addButton(const char* label, FAUSTFLOAT* zone) 		{ addElement(label, zone); }
    virtual void addCheckButton(const char* label, FAUSTFLOAT* zone) 	{ addElement(label, zone); }
    virtual void addVerticalSlider(const char* label, FAUSTFLOAT* zone, FAUSTFLOAT , FAUSTFLOAT , FAUSTFLOAT , FAUSTFLOAT)
    																{ addElement(label, zone); }
    virtual void addHorizontalSlider(const char* label, FAUSTFLOAT* zone, FAUSTFLOAT , FAUSTFLOAT , FAUSTFLOAT , FAUSTFLOAT)
    																{ addElement(label, zone); }
    virtual void addNumEntry(const char* label, FAUSTFLOAT* zone, FAUSTFLOAT , FAUSTFLOAT , FAUSTFLOAT , FAUSTFLOAT)
    																{ addElement(label, zone); }

    // -- passive widgets (are ignored)

    virtual void addHorizontalBargraph(const char*, FAUSTFLOAT*, FAUSTFLOAT, FAUSTFLOAT) {};
    virtual void addVerticalBargraph(const char*, FAUSTFLOAT*, FAUSTFLOAT, FAUSTFLOAT) {};

	// -- metadata are not used

    virtual void declare(FAUSTFLOAT*, const char*, const char*) {}
};
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
#ifndef __faustqt__
#define __faustqt__

#include <cassert>
#include <cmath>
#include <fstream>
#include <iostream>
#include <list>
#include <map>
#include <set>
#include <vector>
#include <stack>

#include <QApplication>
#include <QCheckBox>
#include <QColormap>
#include <QCommonStyle>
#include <QDial>
#include <QDoubleSpinBox>
#include <QGroupBox>
#include <QHBoxLayout>
#include <QLayout>
#include <QMouseEvent>
#include <QObject>
#include <QPainter>
#include <QProgressBar>
#include <QPushButton>
#include <QRadialGradient>
#include <QSlider>
#include <QStyle>
#include <QStyleOptionSlider>
#include <QTabWidget>
#include <QTimer>
#include <QToolTip>
#include <QVBoxLayout>
#include <QWheelEvent>
#include <QWidget>
#include <QtGui>

#ifndef FAUST_GUI_H
#define FAUST_GUI_H

#include <list>
#include <map>

using namespace std;

/*******************************************************************************
 * GUI : Abstract Graphic User Interface
 * Provides additional macchanismes to synchronize widgets and zones. Widgets
 * should both reflect the value of a zone and allow to change this value.
 ******************************************************************************/

struct uiItem;
typedef void (*uiCallback)(FAUSTFLOAT val, void* data);

class GUI : public UI
{
	typedef list<uiItem*> clist;
	typedef map<FAUSTFLOAT*, clist*> zmap;
	
 private:
 	static list<GUI*>	fGuiList;
	zmap				fZoneMap;
	bool				fStopped;
	
 public:
		
    GUI() : fStopped(false) 
    {	
		fGuiList.push_back(this);
	}
	
    virtual ~GUI() 
    {
		// suppression de this dans fGuiList
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
		list<GUI*>::iterator g;
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
  
	virtual ~uiItem() {}
	
	void modifyZone(FAUSTFLOAT v) 	
	{ 
		fCache = v;
		if (*fZone != v) {
			*fZone = v;
			fGUI->updateZone(fZone);
		}
	}
		  	
	FAUSTFLOAT			cache()			{ return fCache; }
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

#endif

//----------------------------------

// for compatibility
#define minValue minimum
#define maxValue maximum


using namespace std;


//==============================BEGIN QSYNTHKNOB=====================================
//
//   qsynthknob and qsynthDialVokiStyle borrowed from qsynth-0.3.3 by Rui Nuno Capela
//   This widget is based on a design by Thorsten Wilms,
//   implemented by Chris Cannam in Rosegarden,
//   adapted for QSynth by Pedro Lopez-Cabanillas,
//   improved for Qt4 by David Garcia Garzon.
//

#define DIAL_MIN      (0.25 * M_PI)
#define DIAL_MAX      (1.75 * M_PI)
#define DIAL_RANGE    (DIAL_MAX - DIAL_MIN)

class qsynthDialVokiStyle : public QCommonStyle
{
public:
	qsynthDialVokiStyle() {};
	virtual ~qsynthDialVokiStyle() {};

    virtual void drawComplexControl(ComplexControl cc, const QStyleOptionComplex *opt, QPainter *p, const QWidget *widget = 0) const
	{
		if (cc != QStyle::CC_Dial)
		{
			QCommonStyle::drawComplexControl(cc, opt, p, widget);
			return;
		}

		const QStyleOptionSlider *dial = qstyleoption_cast<const QStyleOptionSlider *>(opt);
		if (dial == NULL)
			return;

		double angle = DIAL_MIN // offset
			+ (DIAL_RANGE *
				(double(dial->sliderValue - dial->minimum) /
				(double(dial->maximum - dial->minimum))));
		int degrees = int(angle * 180.0 / M_PI);
		int side = dial->rect.width() < dial->rect.height() ? dial->rect.width() : dial->rect.height();
		int xcenter = dial->rect.width() / 2;
		int ycenter = dial->rect.height() / 2;
		int notchWidth   = 1 + side / 400;
		int pointerWidth = 2 + side / 30;
		int scaleShadowWidth = 1 + side / 100;
		int knobBorderWidth = 0;
		int ns = dial->tickInterval;
		int numTicks = 1 + (dial->maximum + ns - dial->minimum) / ns;
		int indent = int(0.15 * side) + 2;
		int knobWidth = side - 2 * indent;
		int shineFocus = knobWidth / 4;
		int shineCenter = knobWidth / 5;
		int shineExtension = shineCenter * 4;
		int shadowShift = shineCenter * 2;
		int meterWidth = side - 2 * scaleShadowWidth;

		QPalette pal = opt->palette;
		QColor knobColor = pal.mid().color();
		QColor borderColor = knobColor.light();
		QColor meterColor = (dial->state & State_Enabled) ?
                            QColor("orange") : pal.mid().color();
                         // pal.highlight().color() : pal.mid().color();
		QColor background = pal.window().color();

		p->save();
		p->setRenderHint(QPainter::Antialiasing, true);

		// The bright metering bit...

		QConicalGradient meterShadow(xcenter, ycenter, -90);
		meterShadow.setColorAt(0, meterColor.dark());
		meterShadow.setColorAt(0.5, meterColor);
		meterShadow.setColorAt(1.0, meterColor.light().light());
		p->setBrush(meterShadow);
		p->setPen(Qt::transparent);
		p->drawPie(xcenter - meterWidth / 2, ycenter - meterWidth / 2,
			meterWidth, meterWidth, (180 + 45) * 16, -(degrees - 45) * 16);

		// Knob projected shadow
		QRadialGradient projectionGradient(
			xcenter + shineCenter, ycenter + shineCenter,
			shineExtension,	xcenter + shadowShift, ycenter + shadowShift);
		projectionGradient.setColorAt(0, QColor(  0, 0, 0, 100));
		projectionGradient.setColorAt(1, QColor(200, 0, 0,  10));
		QBrush shadowBrush(projectionGradient);
		p->setBrush(shadowBrush);
		p->drawEllipse(xcenter - shadowShift, ycenter - shadowShift,
			knobWidth, knobWidth);

		// Knob body and face...

		QPen pen;
		pen.setColor(knobColor);
		pen.setWidth(knobBorderWidth);
		p->setPen(pen);

		QRadialGradient gradient(
			xcenter - shineCenter, ycenter - shineCenter,
			shineExtension,	xcenter - shineFocus, ycenter - shineFocus);
		gradient.setColorAt(0.2, knobColor.light().light());
		gradient.setColorAt(0.5, knobColor);
		gradient.setColorAt(1.0, knobColor.dark(150));
		QBrush knobBrush(gradient);
		p->setBrush(knobBrush);
		p->drawEllipse(xcenter - knobWidth / 2, ycenter - knobWidth / 2,
			knobWidth, knobWidth);

		// Tick notches...

		p->setBrush(Qt::NoBrush);

		if (dial->subControls & QStyle::SC_DialTickmarks)
		{
			pen.setColor(pal.dark().color());
			pen.setWidth(notchWidth);
			p->setPen(pen);
			double hyp = double(side - scaleShadowWidth) / 2.0;
			double len = hyp / 4;
			for (int i = 0; i < numTicks; ++i) {
				int div = numTicks;
				if (div > 1) --div;
				bool internal = (i != 0 && i != numTicks - 1);
				double angle = DIAL_MIN
					+ (DIAL_MAX - DIAL_MIN) * i / div;
				double dir = (internal ? -1 : len);
				double sinAngle = sin(angle);
				double cosAngle = cos(angle);
				double x0 = xcenter - (hyp - len) * sinAngle;
				double y0 = ycenter + (hyp - len) * cosAngle;
				double x1 = xcenter - (hyp + dir) * sinAngle;
				double y1 = ycenter + (hyp + dir) * cosAngle;
				p->drawLine(QLineF(x0, y0, x1, y1));
			}
		}

		// Shadowing...

		// Knob shadow...
		if (knobBorderWidth > 0) {
			QLinearGradient inShadow(xcenter - side / 4, ycenter - side / 4,
				xcenter + side / 4, ycenter + side / 4);
			inShadow.setColorAt(0.0, borderColor.light());
			inShadow.setColorAt(1.0, borderColor.dark());
			p->setPen(QPen(QBrush(inShadow), knobBorderWidth * 7 / 8));
			p->drawEllipse(xcenter - side / 2 + indent,
				ycenter - side / 2 + indent,
				side - 2 * indent, side - 2 * indent);
		}

		// Scale shadow...
		QLinearGradient outShadow(xcenter - side / 3, ycenter - side / 3,
			xcenter + side / 3, ycenter + side / 3);
		outShadow.setColorAt(0.0, background.dark().dark());
		outShadow.setColorAt(1.0, background.light().light());
		p->setPen(QPen(QBrush(outShadow), scaleShadowWidth));
		p->drawArc(xcenter - side / 2 + scaleShadowWidth / 2,
			ycenter - side / 2 + scaleShadowWidth / 2,
			side - scaleShadowWidth, side - scaleShadowWidth, -45 * 16, 270 * 16);

		// Pointer notch...

		double hyp = double(side) / 2.0;
		double len = hyp - indent - 1;

		double x = xcenter - len * sin(angle);
		double y = ycenter + len * cos(angle);

		QColor pointerColor = pal.dark().color();
		pen.setColor((dial->state & State_Enabled) ? pointerColor.dark(140) : pointerColor);
		pen.setWidth(pointerWidth + 2);
		p->setPen(pen);
		p->drawLine(QLineF(xcenter, ycenter, x, y));
		pen.setColor((dial->state & State_Enabled) ? pointerColor.light() : pointerColor.light(140));
		pen.setWidth(pointerWidth);
		p->setPen(pen);
		p->drawLine(QLineF(xcenter - 1, ycenter - 1, x - 1, y - 1));

		// done
		p->restore();
	}

};

//
//===============================END QSYNTHKNOB======================================


//==============================BEGIN DISPLAYS===================================
//
// This section constains displays, passive QT widgets that displays values in
// different ways, in particular bargraphs
//

/**
 * An abstract widget that display a value in a range
 */
class AbstractDisplay : public QWidget
{
    protected :
    
        FAUSTFLOAT fMin;
        FAUSTFLOAT fMax;
        FAUSTFLOAT fValue;

    public:

        AbstractDisplay(FAUSTFLOAT lo, FAUSTFLOAT hi) : fMin(lo), fMax(hi), fValue(lo)
        {}

        /**
         * set the range of displayed values
         */
        virtual void setRange(FAUSTFLOAT lo, FAUSTFLOAT hi)
        {
            fMin = lo;
            fMax = hi;
        }

        /**
         * set the value to be displayed
         */
        virtual void setValue(FAUSTFLOAT v)
        {
            if (v < fMin)       v = fMin;
            else if (v > fMax)  v = fMax;

            if (v != fValue) {
                fValue = v;
                update();
            }
        }
};

/**
 * Displays dB values using a scale of colors
 */
class dbAbstractDisplay : public AbstractDisplay
{
    protected :

        FAUSTFLOAT      fScaleMin;
        FAUSTFLOAT      fScaleMax;
        vector<int>     fLevel;
        vector<QBrush>  fBrush;


        /**
        * Convert a dB value into a scale between 0 and 1 (following IEC standard ?)
        */
        FAUSTFLOAT dB2Scale(FAUSTFLOAT dB) const
        {
            FAUSTFLOAT fScale = 1.0;

            /*if (dB < -70.0f)
                fScale = 0.0f;
            else*/ if (dB < -60.0)
                fScale = (dB + 70.0) * 0.0025;
            else if (dB < -50.0)
                fScale = (dB + 60.0) * 0.005 + 0.025;
            else if (dB < -40.0)
                fScale = (dB + 50.0) * 0.0075 + 0.075;
            else if (dB < -30.0)
                fScale = (dB + 40.0) * 0.015 + 0.15;
            else if (dB < -20.0)
                fScale = (dB + 30.0) * 0.02 + 0.3;
            else if (dB < -0.001 || dB > 0.001)  /* if (dB < 0.0) */
                fScale = (dB + 20.0f) * 0.025 + 0.5;

            return fScale;
        }

        /**
         * Create the scale of colors used to paint the bargraph in relation to the levels
         * The parameter x indicates the direction of the gradient. x=1 means an horizontal
         * gradient typically used by a vertical bargraph, and x=0 a vertical gradient.
         */
        void initLevelsColors(int x)
        {
            int alpha = 200;
            { // level until -10 dB
                QColor c(40, 160, 40, alpha);
                QLinearGradient g(0,0,x,1-x);
                g.setCoordinateMode(QGradient::ObjectBoundingMode);
                g.setColorAt(0.0,   c.lighter());
                g.setColorAt(0.2,   c);
                g.setColorAt(0.8,   c);
                g.setColorAt(0.9,   c.darker(120));

                fLevel.push_back(-10);
                fBrush.push_back(QBrush(g));
            }

            { // level until -6 dB
                QColor c(160, 220, 20, alpha);
                QLinearGradient g(0,0,x,1-x);
                g.setCoordinateMode(QGradient::ObjectBoundingMode);
                g.setColorAt(0.0,   c.lighter());
                g.setColorAt(0.2,   c);
                g.setColorAt(0.8,   c);
                g.setColorAt(0.9,   c.darker(120));

                fLevel.push_back(-6);
                fBrush.push_back(QBrush(g));
            }

            { // level until -3 dB
                QColor c(220, 220, 20, alpha);
                QLinearGradient g(0,0,x,1-x);
                g.setCoordinateMode(QGradient::ObjectBoundingMode);
                g.setColorAt(0.0,   c.lighter());
                g.setColorAt(0.2,   c);
                g.setColorAt(0.8,   c);
                g.setColorAt(0.9,   c.darker(120));

                fLevel.push_back(-3);
                fBrush.push_back(QBrush(g));
            }

            { // level until -0 dB
                QColor c(240, 160, 20, alpha);
                QLinearGradient g(0,0,x,1-x);
                g.setCoordinateMode(QGradient::ObjectBoundingMode);
                g.setColorAt(0.0,   c.lighter());
                g.setColorAt(0.2,   c);
                g.setColorAt(0.8,   c);
                g.setColorAt(0.9,   c.darker(120));

                fLevel.push_back(0);
                fBrush.push_back(QBrush(g));
            }

            { // until 10 dB (and over because last one)
                QColor c(240,  0, 20, alpha);   // ColorOver
                QLinearGradient g(0,0,x,1-x);
                g.setCoordinateMode(QGradient::ObjectBoundingMode);
                g.setColorAt(0.0,   c.lighter());
                g.setColorAt(0.2,   c);
                g.setColorAt(0.8,   c);
                g.setColorAt(0.9,   c.darker(120));

                fLevel.push_back(+10);
                fBrush.push_back(QBrush(g));
            }

        }

    public:

        dbAbstractDisplay(FAUSTFLOAT lo, FAUSTFLOAT hi) : AbstractDisplay(lo, hi)
        {}

        /**
         * set the range of displayed values
         */
        virtual void setRange(FAUSTFLOAT lo, FAUSTFLOAT hi)
        {
            AbstractDisplay::setRange(lo, hi);
            fScaleMin = dB2Scale(fMin);
            fScaleMax = dB2Scale(fMax);
        }
};

/**
 * Small rectangular LED display which color changes with the level in dB
 */
class dbLED : public dbAbstractDisplay
{
    protected:

        /**
         * Draw the LED using a color depending of its value in dB
         */
        virtual void paintEvent ( QPaintEvent *)
        {
            QPainter painter(this);
            painter.drawRect(rect());

            if (fValue <= fLevel[0]) {

                // interpolate the first color on the alpha channel
                QColor c(40, 160, 40) ;
                FAUSTFLOAT a = (fValue-fMin)/(fLevel[0]-fMin);
                c.setAlphaF(a);
                painter.fillRect(rect(), c);

            } else {

                // find the minimal level > value
                int l = fLevel.size()-1; while (fValue < fLevel[l] && l > 0) l--;
                painter.fillRect(rect(), fBrush[l]);
            }
        }

    public:

        dbLED(FAUSTFLOAT lo, FAUSTFLOAT hi) : dbAbstractDisplay(lo,hi)
        {
            setSizePolicy(QSizePolicy::Fixed, QSizePolicy::Fixed);
            initLevelsColors(1);
       }

        virtual QSize sizeHint () const
        {
            return QSize(16, 8);
        }
};

/**
 * Small rectangular LED display which intensity (alpha channel) changes according to the value
 */
class LED : public AbstractDisplay
{
    QColor  fColor;

    protected:

        /**
         * Draw the LED using a transparency depending of its value
         */
        virtual void paintEvent ( QPaintEvent *)
        {
            QPainter painter(this);
            painter.drawRect(rect());
            // interpolate the first color on the alpha channel
            QColor c = fColor ;
            FAUSTFLOAT a = (fValue-fMin)/(fMax-fMin);
            c.setAlphaF(a);
            painter.fillRect(rect(), c);
        }

    public:

        LED(FAUSTFLOAT lo, FAUSTFLOAT hi) : AbstractDisplay(lo,hi), fColor("yellow")
        {
            setSizePolicy(QSizePolicy::Fixed, QSizePolicy::Fixed);
       }

        virtual QSize sizeHint () const
        {
            return QSize(16, 8);
        }
};

/**
 * A simple bargraph that detect automatically its direction
 */
class linBargraph : public AbstractDisplay
{
    protected :
        QBrush  fBrush;

        /**
         * No scale implemented yet
         */
        void paintScale(QPainter* painter) const
        {
            painter->drawRect(0,0,width(),height());
        }

        /**
         * The length of the rectangle is proportional to the value
         */
        void paintContent (QPainter* painter) const
        {
            int     w = width();
            int     h = height();
            FAUSTFLOAT   v = (fValue-fMin)/(fMax-fMin);

            if (h>w) {
                // draw vertical rectangle
                painter->fillRect(0,(1-v)*h,w, v*h, fBrush);
            } else {
                // draw horizontal rectangle
                painter->fillRect(0, 0, h, v*w, fBrush);
            }

        }

        virtual void paintEvent ( QPaintEvent *)
        {
            QPainter painter(this);
            paintContent(&painter);
            paintScale(&painter);
        }

    public:

        linBargraph(FAUSTFLOAT lo, FAUSTFLOAT hi) : AbstractDisplay(lo,hi)
        {
            // compute the brush that will be used to
            // paint the value
            QColor c(0xffa500);                 // orange
            int x = int(height() < width());    // gradient direction
            QLinearGradient g(0,0,x,1-x);
            g.setCoordinateMode(QGradient::ObjectBoundingMode);
            g.setColorAt(0.0,   c.lighter());
            g.setColorAt(0.2,   c);
            g.setColorAt(0.8,   c);
            g.setColorAt(0.9,   c.darker(120));
            fBrush = QBrush(g);
        }
};

/**
 * A simple vertical bargraph
 */
class linVerticalBargraph : public linBargraph
{
    public:

        linVerticalBargraph(FAUSTFLOAT lo, FAUSTFLOAT hi) : linBargraph(lo,hi)
        {
            setSizePolicy(QSizePolicy::Fixed, QSizePolicy::Preferred);
        }

        virtual QSize sizeHint () const
        {
            return QSize(16, 128);
        }
};

/**
 * A simple horizontal bargraph
 */
class linHorizontalBargraph : public linBargraph
{
    public:

        linHorizontalBargraph(FAUSTFLOAT lo, FAUSTFLOAT hi) : linBargraph(lo,hi)
        {
            setSizePolicy(QSizePolicy::Preferred, QSizePolicy::Fixed);
        }

        virtual QSize sizeHint () const
        {
            return QSize(128, 16);
        }
};

/**
 * A dB Bargraph with a scale of colors
 */
class dbBargraph : public dbAbstractDisplay
{
    QBrush  fBackColor;

    protected :

        // These two abstract methods are implemented
        // according to the vertical or horizontal direction
        // in dbVerticalBargraph and dbHorizontalBargraph
        virtual void paintMark(QPainter* painter, FAUSTFLOAT v) const = 0;
        virtual int paintSegment (QPainter* painter, int pos, FAUSTFLOAT v, const QBrush& b) const = 0;

        /**
         * Draw the logarithmic scale
         */
        void paintScale(QPainter* painter) const
        {
            painter->fillRect(0,0,width(),height(), fBackColor);
            painter->save();
            painter->setPen(QColor(0x6699aa)); //0xffa500));
            for (FAUSTFLOAT v = -10; v > fMin; v -= 10) paintMark(painter, v);
            for (FAUSTFLOAT v = -6; v < fMax; v += 3) paintMark(painter, v);
            painter->restore();
        }

        /**
         * Draw the content using colored segments
         */
        void paintContent (QPainter* painter) const
        {
            int   l = fLevel.size();

            FAUSTFLOAT   p = -1;   // fake value indicates to start from border
            int     n = 0;
            // paint all the full segments < fValue
            for (n=0; (n < l) && (fValue > fLevel[n]); n++) {
                p = paintSegment(painter, p, fLevel[n], fBrush[n]);
            }
            // paint the last segment
            if (n == l) n = n-1;
            p=paintSegment(painter, p, fValue, fBrush[n]);

            painter->drawRect(0,0,width(),height());
       }


        virtual void paintEvent ( QPaintEvent *)
        {
            QPainter painter(this);
            paintScale(&painter);
            paintContent(&painter);
        }

    public:

        dbBargraph(FAUSTFLOAT lo, FAUSTFLOAT hi) : dbAbstractDisplay(lo,hi)
        {

            QFont f = this->font();
            f.setPointSize(6);
            this->setFont(f);

            fBackColor = QBrush(QColor(20,20,20));
        }
};

/**
 * Vertical dB Bargraph
 */
class dbVerticalBargraph : public dbBargraph
{
    protected:
        /**
         * Convert a dB value into a vertical position
         */
        FAUSTFLOAT dB2y(FAUSTFLOAT dB) const
        {
            FAUSTFLOAT s0 = fScaleMin;
            FAUSTFLOAT s1 = fScaleMax;
            FAUSTFLOAT sx = dB2Scale(dB);
            int    h = height();

            return h - h*(s0-sx)/(s0-s1);
        }

        /**
         * Paint a vertical graduation mark
         */
        virtual void paintMark(QPainter* painter, FAUSTFLOAT v) const
        {
            int n = 10;
            int y = dB2y(v);
            QRect r(0,y-n,width()-1,2*n);
            if (v > 0.0) {
                painter->drawText(r, Qt::AlignRight|Qt::AlignVCenter, QString::number(v).prepend('+'));
            } else {
                painter->drawText(r, Qt::AlignRight|Qt::AlignVCenter, QString::number(v));
            }
        }

        /**
         * Paint a color segment
         */
        virtual int paintSegment(QPainter* painter, int pos, FAUSTFLOAT v, const QBrush& b) const
        {
            if (pos == -1) pos = height();
            FAUSTFLOAT y = dB2y(v);
            painter->fillRect(0, y, width(), pos-y+1, b);
            return y;
        }


    public:

        dbVerticalBargraph(FAUSTFLOAT lo, FAUSTFLOAT hi) : dbBargraph(lo,hi)
        {
            setSizePolicy(QSizePolicy::Fixed, QSizePolicy::Preferred);
            initLevelsColors(1);
        }

        virtual QSize sizeHint () const
        {
            return QSize(18, 256);
        }
};

/**
 * Horizontal dB Bargraph
 */
class dbHorizontalBargraph : public dbBargraph
{

    protected:

        /**
         * Convert a dB value into an horizontal position
         */
        FAUSTFLOAT dB2x(FAUSTFLOAT dB) const
        {
            FAUSTFLOAT s0 = fScaleMin;
            FAUSTFLOAT s1 = fScaleMax;
            FAUSTFLOAT sx = dB2Scale(dB);
            int    w = width();

            return w - w*(s1-sx)/(s1-s0);
        }

        /**
         * Paint an horizontal graduation mark
         */
        void paintMark(QPainter* painter, FAUSTFLOAT v) const
        {
            int n = 10;
            int x = dB2x(v);
            QRect r(x-n,0,2*n, height());
            painter->drawText(r, Qt::AlignHCenter|Qt::AlignVCenter, QString::number(v));
        }

        /**
         * Paint a horizontal color segment
         */
        int paintSegment (QPainter* painter, int pos, FAUSTFLOAT v, const QBrush& b) const
        {
            if (pos == -1) pos = 0;
            FAUSTFLOAT x = dB2x(v);
            painter->fillRect(pos, 0, x-pos, height(), b);
            return x;
        }


    public:

        dbHorizontalBargraph(FAUSTFLOAT lo, FAUSTFLOAT hi) : dbBargraph(lo,hi)
        {
            setSizePolicy(QSizePolicy::Preferred, QSizePolicy::Fixed);
            initLevelsColors(0);
        }

        virtual QSize sizeHint () const
        {
            return QSize(256, 18);
        }

};

//
//===============================END DISPLAYS====================================

//============================= BEGIN GROUP LABEL METADATA===========================
// Unlike widget's label, metadata inside group's label are not extracted directly by
// the Faust compiler. Therefore they must be extracted within the architecture file
//-----------------------------------------------------------------------------------
//

/**
 * rmWhiteSpaces(): Remove the leading and trailing white spaces of a string
 * (but not those in the middle of the string)
 */
static string rmWhiteSpaces(const string& s)
{
    size_t i = s.find_first_not_of(" \t");
    size_t j = s.find_last_not_of(" \t");
  	if ( (i != string::npos) && (j != string::npos) ) {
		return s.substr(i, 1+j-i);
	} else {
		return "";
	}
}

/**
 * Extracts metdata from a label : 'vol [unit: dB]' -> 'vol' + metadata(unit=dB)
 */
static void extractMetadata(const string& fulllabel, string& label, map<string, string>& metadata)
{
    enum {kLabel, kEscape1, kEscape2, kEscape3, kKey, kValue};
    int state = kLabel; int deep = 0;
    string key, value;

    for (unsigned int i=0; i < fulllabel.size(); i++) {
        char c = fulllabel[i];
        switch (state) {
            case kLabel :
                assert (deep == 0);
                switch (c) {
                    case '\\' : state = kEscape1; break;
                    case '[' : state = kKey; deep++; break;
                    default : label += c;
                }
                break;

            case kEscape1 :
                label += c;
                state = kLabel;
                break;

            case kEscape2 :
                key += c;
                state = kKey;
                break;

            case kEscape3 :
                value += c;
                state = kValue;
                break;

            case kKey :
                assert (deep > 0);
                switch (c) {
                    case '\\' :  state = kEscape2;
                                break;

                    case '[' :  deep++;
                                key += c;
                                break;

                    case ':' :  if (deep == 1) {
                                    state = kValue;
                                } else {
                                    key += c;
                                }
                                break;
                    case ']' :  deep--;
                                if (deep < 1) {
                                    metadata[rmWhiteSpaces(key)] = "";
                                    state = kLabel;
                                    key="";
                                    value="";
                                } else {
                                    key += c;
                                }
                                break;
                    default :   key += c;
                }
                break;

            case kValue :
                assert (deep > 0);
                switch (c) {
                    case '\\' : state = kEscape3;
                                break;

                    case '[' :  deep++;
                                value += c;
                                break;

                    case ']' :  deep--;
                                if (deep < 1) {
                                    metadata[rmWhiteSpaces(key)]=rmWhiteSpaces(value);
                                    state = kLabel;
                                    key="";
                                    value="";
                                } else {
                                    value += c;
                                }
                                break;
                    default :   value += c;
                }
                break;

            default :
                cerr << "ERROR unrecognized state " << state << endl;
        }
    }
    label = rmWhiteSpaces(label);
}

//
//============================= END GROUP LABEL METADATA===========================


/******************************************************************************
*******************************************************************************

							IMPLEMENTATION OF GUI ITEMS
							   (QT 4.3 for FAUST)

*******************************************************************************
*******************************************************************************/

class uiButton : public QObject, public uiItem
{
    Q_OBJECT

 public :
	QAbstractButton* 	fButton;

	uiButton (GUI* ui, FAUSTFLOAT* zone, QAbstractButton* b) : uiItem(ui, zone), fButton(b) {}


	virtual void reflectZone()
	{
		FAUSTFLOAT v = *fZone;
		fCache = v;
		fButton->setDown( v > 0.0 );
	}

 public slots :
	void pressed()		{ modifyZone(1.0); }
	void released()		{ modifyZone(0.0); }
};

class uiCheckButton : public QObject, public uiItem
{
    Q_OBJECT

 public :
	QCheckBox* 	fCheckBox;

	uiCheckButton (GUI* ui, FAUSTFLOAT* zone, QCheckBox* b) : uiItem(ui, zone), fCheckBox(b) {}

	virtual void reflectZone()
	{
		FAUSTFLOAT v = *fZone;
		fCache = v;
		fCheckBox->setCheckState( (v < 0.5) ? Qt::Unchecked : Qt::Checked );
	}

 public slots :
	void setState(int v)		{ modifyZone(FAUSTFLOAT(v>0)); }
};

class uiSlider : public QObject, public uiItem
{
    Q_OBJECT

	int		faust2qt(FAUSTFLOAT x) 	{ return int(0.5 + (x-fMin)/fStep); }
	FAUSTFLOAT	qt2faust (int v)	{ return fMin + v*fStep; }
	int		optimalTick()		{
				FAUSTFLOAT x = fStep;
				while ((fMax-fMin)/x > 50) x*=10;
				while ((fMax-fMin)/x < 10) x/=2;
				return faust2qt(fMin+x);
			}

 public :
	QSlider* 	fSlider;
	FAUSTFLOAT	fCur;
	FAUSTFLOAT	fMin;
	FAUSTFLOAT	fMax;
	FAUSTFLOAT	fStep;

	uiSlider (GUI* ui, FAUSTFLOAT* zone, QSlider* slider, FAUSTFLOAT cur, FAUSTFLOAT lo, FAUSTFLOAT hi, FAUSTFLOAT step)
		: uiItem(ui, zone), fSlider(slider), fCur(cur), fMin(lo), fMax(hi), fStep(step)
	{
		fSlider->setMinimum(0);
		fSlider->setMaximum(faust2qt(fMax));
		fSlider->setValue(faust2qt(fCur));
		fSlider->setTickInterval(optimalTick());
		*fZone = fCur;
	}

	virtual void reflectZone()
	{
		FAUSTFLOAT v = *fZone;
		fCache = v;
		fSlider->setValue(faust2qt(v));
	}

 public slots :
	void setValue(int v)		{ modifyZone(qt2faust(v)); }
};

class uiKnob : public QObject, public uiItem
{
    Q_OBJECT

	int		faust2qt(FAUSTFLOAT x) 	{ return int(0.5 + (x-fMin)/fStep); }
	FAUSTFLOAT	qt2faust (int v)	{ return fMin + v*fStep; }
	int		optimalTick()		{
				FAUSTFLOAT x = fStep;
				while ((fMax-fMin)/x > 50) x*=10;
				while ((fMax-fMin)/x < 10) x/=2;
				return faust2qt(fMin+x);
			}

 public :
	QAbstractSlider* 	fSlider;
	FAUSTFLOAT			fCur;
	FAUSTFLOAT			fMin;
	FAUSTFLOAT			fMax;
	FAUSTFLOAT			fStep;

	uiKnob (GUI* ui, FAUSTFLOAT* zone, QAbstractSlider* slider, FAUSTFLOAT cur, FAUSTFLOAT lo, FAUSTFLOAT hi, FAUSTFLOAT step)
		: uiItem(ui, zone), fSlider(slider), fCur(cur), fMin(lo), fMax(hi), fStep(step)
	{
		fSlider->setMinimum(0);
		fSlider->setMaximum(faust2qt(fMax));
		fSlider->setValue(faust2qt(fCur));
		//fSlider->setTickInterval(optimalTick());
		*fZone = fCur;
	}

	virtual void reflectZone()
	{
		FAUSTFLOAT v = *fZone;
		fCache = v;
		fSlider->setValue(faust2qt(v));
	}

 public slots :
	void setValue(int v)		{ modifyZone(qt2faust(v)); }
};

class uiBargraph : public QObject, public uiItem
{
    Q_OBJECT

    int     faust2qt(FAUSTFLOAT x)   { return int(0.5 + (x-fMin)/(fMax-fMin)*fStep); }

 public :
    QProgressBar*   fBar;
    FAUSTFLOAT      fMin;
    FAUSTFLOAT      fMax;
    int             fStep;

    uiBargraph (GUI* ui, FAUSTFLOAT* zone, QProgressBar* bar, FAUSTFLOAT lo, FAUSTFLOAT hi)
        : uiItem(ui, zone), fBar(bar), fMin(lo), fMax(hi), fStep(1024)
    {
        fBar->setRange(0, fStep);
        fBar->setValue(0);
        *fZone = 0;
    }

    virtual void reflectZone()
    {
        FAUSTFLOAT v = *fZone;
        fCache = v;
        int x = faust2qt(v);
        //std::cout << "update *" << fBar << " = " << x << std::endl;
        fBar->setValue(x);
    }
};

class uiBargraph2 : public QObject, public uiItem
{
    Q_OBJECT

 public :
    AbstractDisplay*   fBar;

    uiBargraph2 (GUI* ui, FAUSTFLOAT* zone, AbstractDisplay* bar, FAUSTFLOAT lo, FAUSTFLOAT hi)
        : uiItem(ui, zone), fBar(bar)
    {
        fBar->setRange(lo, hi);
        fBar->setValue(lo);
        *fZone = lo;
    }

    virtual void reflectZone()
    {
        FAUSTFLOAT v = *fZone;
        fCache = v;
        fBar->setValue(v);
    }
};

class uiNumEntry : public QObject, public uiItem
{
    Q_OBJECT

 public :
	QDoubleSpinBox* 	fNumEntry;
	FAUSTFLOAT			fCur;
	FAUSTFLOAT			fMin;
	FAUSTFLOAT			fMax;
	FAUSTFLOAT			fStep;
	int					fDecimals;

	uiNumEntry (GUI* ui, FAUSTFLOAT* zone, QDoubleSpinBox* numEntry, FAUSTFLOAT cur, FAUSTFLOAT lo, FAUSTFLOAT hi, FAUSTFLOAT step)
		: uiItem(ui, zone), fNumEntry(numEntry), fCur(cur), fMin(lo), fMax(hi), fStep(step)
	{
		fDecimals = (fStep >= 1.0) ? 0 : int(0.5+log10(1.0/fStep));

		fNumEntry->setMinimum(fMin);
		fNumEntry->setMaximum(fMax);
		fNumEntry->setSingleStep(fStep);
		fNumEntry->setDecimals(fDecimals);
		fNumEntry->setValue(fCur);
		*fZone = fCur;
	}


	virtual void reflectZone()
	{
		FAUSTFLOAT v = *fZone;
		fCache = v;
		fNumEntry->setValue(v);
	}

 public slots :
	void setValue(double v)		{
		modifyZone(FAUSTFLOAT(v));
	}
};

/******************************************************************************
*******************************************************************************

						IMPLEMENTATION OF THE USER INTERFACE
							   (QT 4.3 for FAUST)

*******************************************************************************
*******************************************************************************/

class QTGUI : public QObject, public GUI
{
    Q_OBJECT
	QApplication		fAppl;
	QTimer*				fTimer;
	QStyle*			 	fStyle;
	string				gGroupTooltip;
	stack<QWidget* > 	fGroupStack;

    map<FAUSTFLOAT*, FAUSTFLOAT>      fGuiSize;       // map widget zone with widget size coef
    map<FAUSTFLOAT*, string>          fTooltip;       // map widget zone with tooltip strings
    map<FAUSTFLOAT*, string>          fUnit;          // map widget zone to unit string (i.e. "dB")
    set<FAUSTFLOAT*>                  fKnobSet;       // set of widget zone to be knobs
    set<FAUSTFLOAT*>                  fLedSet;        // set of widget zone to be LEDs


    /**
    * Format tooltip string by replacing some white spaces by
	* return characters so that line width doesn't exceed n.
	* Limitation : long words exceeding n are not cut
    */
	virtual string formatTooltip(int n, const string& tt)
	{
		string  ss = tt;	// ss string we are going to format
		int	lws = 0;	// last white space encountered
		int 	lri = 0;	// last return inserted
		for (int i=0; i< (int)tt.size(); i++) {
			if (tt[i] == ' ') lws = i;
			if (((i-lri) >= n) && (lws > lri)) {
				// insert return here
				ss[lws] = '\n';
				lri = lws;
			}
		}
		return ss;
	}

    /**
    * Analyses the widget zone metadata declarations and takes
    * appropriate actions
    */
    virtual void declare(FAUSTFLOAT* zone, const char* key, const char* value)
    {
		if (zone == 0) {
			// special zone 0 means group metadata
			if (strcmp(key,"tooltip")==0) {
				// only group tooltip are currently implemented
				gGroupTooltip = formatTooltip(30, value);
			}
		} else {
			if (strcmp(key,"size")==0) {
				fGuiSize[zone]=atof(value);
			}
			else if (strcmp(key,"tooltip")==0) {
				fTooltip[zone] = formatTooltip(30, value) ;
			}
			else if (strcmp(key,"unit")==0) {
				fUnit[zone] = value ;
			}
			else if (strcmp(key,"style")==0) {
			// else if ((strcmp(key,"style")==0) || (strcmp(key,"type")==0)) {
				if (strcmp(value,"knob") == 0) {
					fKnobSet.insert(zone);
				} else if (strcmp(value,"led") == 0) {
					fLedSet.insert(zone);
				}
			}
		}
	}

	bool isTabContext()
	{
		//return fGroupStack.empty() || ((!fGroupStack.empty()) && (dynamic_cast<QTabWidget*>(fGroupStack.top()) != 0));
		return ((!fGroupStack.empty()) && (dynamic_cast<QTabWidget*>(fGroupStack.top()) != 0));
	}

	void insert(const char* label, QWidget* widget)
	{
		if (fStyle) widget->setStyle(fStyle);
		if (!fGroupStack.empty()) {
			QWidget* mother = fGroupStack.top();
			QTabWidget*	tab = dynamic_cast<QTabWidget*>(mother);
			if (tab) {
				tab->addTab(widget,label);
			} else {
				widget->setParent(mother);
				mother->layout()->addWidget(widget);
			}
		}
	}

    /**
    * Analyses a full label and activates the relevant options. returns a simplified
    * label (without options) and an amount of stack adjustement (in case additional
    * containers were pushed on the stack).
    */

    int checkLabelOptions(QWidget* widget, const string& fullLabel, string& simplifiedLabel)
    {
        map<string, string> metadata;
        extractMetadata(fullLabel, simplifiedLabel, metadata);

        if (metadata.count("tooltip")) {
            widget->setToolTip(metadata["tooltip"].c_str());
        }
        if (metadata["option"] == "detachable") {
            //openHandleBox(simplifiedLabel.c_str());
            return 1;
        }

        // no adjustement of the stack needed
        return 0;
    }

    /**
    * Check if a tooltip is associated to a zone and add it to the corresponding widget
    */
    void checkForTooltip(FAUSTFLOAT* zone, QWidget* widget)
    {
        if (fTooltip.count(zone)) {
            widget->setToolTip(fTooltip[zone].c_str());
        }
    }

    /**
    * Check if a knob is required
    */
    bool isKnob(FAUSTFLOAT* zone)
    {
        return fKnobSet.count(zone) > 0;
    }

	void openBox(const char* fulllabel, QLayout* layout)
	{
		map<string, string> metadata;
        string label;
        extractMetadata(fulllabel, label, metadata);
  		layout->setMargin(5);
		QWidget* box;

        
        if (isTabContext()) {
			box = new QWidget();
            // set background color
            QPalette pal = box->palette();
            pal.setColor(box->backgroundRole(), QColor::fromRgb(150, 150, 150) );
            box->setPalette(pal);

		} else  if (label.size()>0) {
			QGroupBox* group = new QGroupBox();
			group->setTitle(label.c_str());
			box = group;
		} else {
			// no label here we use simple widget
			layout->setMargin(0);
			box = new QWidget();
		}

        box->setLayout(layout);
/*        if (metadata.count("tooltip")) {
            box->setToolTip(metadata["tooltip"].c_str());
        }*/
        if (gGroupTooltip != string()) {
			box->setToolTip(gGroupTooltip.c_str());
			gGroupTooltip = string();
		}
        insert(label.c_str(), box);
        fGroupStack.push(box);
    }

	void openTab(const char* label)
	{
		QTabWidget* group = new QTabWidget();
		if (fStyle) group->setStyle(fStyle);
		insert(label, group);
		fGroupStack.push(group);
	}

  public slots :
  
	void update()		{
        //std::cout << '.' << std::endl;
		updateAllZones();
	}

  public:

	QTGUI(int& argc, char* argv[], QStyle* style = 0) : fAppl(argc, argv), fTimer(0), fStyle(style){
        //fGroupStack.push(new QMainWindow());
    }

	virtual ~QTGUI() {}

	virtual void run()
	{
		if (fTimer == 0) {
			fTimer = new QTimer(this);
     		QObject::connect(fTimer, SIGNAL(timeout()), this, SLOT(update()));
     		fTimer->start(100);
		}
#if 1
        fAppl.setStyleSheet(

// BUTTONS
                        "QPushButton {"
                                    "background-color: qlineargradient(x1: 0, y1: 0, x2: 1, y2: 1,"
                                                                    "stop: 0 #B0B0B0, stop: 1 #404040);"
                                    "border: 2px solid grey;"
                                    "border-radius: 6px;"
                                    "margin-top: 1ex;"
                                 "}"

                 "QPushButton:hover {"
                                    "border: 2px solid orange;"
                                 "}"

                 "QPushButton:pressed {"
                                    //"border: 1px solid orange;"
                                    "background-color: qlineargradient(x1: 0, y1: 0, x2: 0, y2: 1,"
                                                                        "stop: 0 #404040, stop: 1 #B0B0B0);"
                                 "}"
// GROUPS
                       "QGroupBox {"
                                    "background-color: qlineargradient(x1: 0, y1: 0, x2: 1, y2: 1,"
                                                                    "stop: 0 #A0A0A0, stop: 1 #202020);"
                                    "border: 2px solid gray;"
                                    "border-radius: 5px;"
                                    "margin-top: 3ex;"
                                    "font-size:10pt;"
                                    "font-weight:bold;"
                                  //"color: dark grey;"
                                    "color: white;"
                                 "}"

                "QGroupBox::title {"
                                    "subcontrol-origin: margin;"
                                    "subcontrol-position: top center;" /* position at the top center */
                                    "padding: 0 5px;"
                                 "}"
// SLIDERS
                    // horizontal sliders
                    "QSlider::groove:vertical {"
                        "background: red;"
                        "position: absolute;" /* absolutely position 4px from the left and right of the widget. setting margins on the widget should work too... */
                        "left: 13px; right: 13px;"
                    "}"

                    "QSlider::handle:vertical {"
                        "height: 40px;"
                        "width: 30px;"
                        "background: qlineargradient(x1: 0, y1: 0, x2: 0, y2: 1,"
                                                          "stop: 0 #AAAAAA, stop : 0.05 #0A0A0A, stop: 0.3 #101010, stop : 0.90 #AAAAAA, stop: 0.91 #000000);"
                        "margin: 0 -5px; /* expand outside the groove */"
                        "border-radius: 5px;"
                    "}"

                    "QSlider::add-page:vertical {"
                        "background: qlineargradient(x1: 0, y1: 0, x2: 1, y2: 0,"
                                                          "stop: 0 yellow, stop : 0.5 orange);"
                    "}"

                    "QSlider::sub-page:vertical {"
                        "background: grey;"
                    "}"

                    // horizontal sliders

                    "QSlider::groove:horizontal {"
                        "background: red;"
                        "position: absolute;" /* absolutely position 4px from the left and right of the widget. setting margins on the widget should work too... */
                        "top: 14px; bottom: 14px;"
                    "}"

                    "QSlider::handle:horizontal {"
                        "width: 40px;"
                        "background: qlineargradient(x1: 0, y1: 0, x2: 1, y2: 0,"
                                                          "stop: 0 #AAAAAA, stop : 0.05 #0A0A0A, stop: 0.3 #101010, stop : 0.90 #AAAAAA, stop: 0.91 #000000);"
                        "margin: -5px 0; /* expand outside the groove */"
                        "border-radius: 5px;"
                    "}"

                    "QSlider::sub-page:horizontal {"
                        "background: qlineargradient(x1: 0, y1: 0, x2: 0, y2: 1,"
                                                          "stop: 0 yellow, stop : 0.5 orange);"
                    "}"

                    "QSlider::add-page:horizontal {"
                        "background: grey;"
                    "}"

// TABS
                    //TabWidget and TabBar
                    "QTabWidget::pane {" /* The tab widget frame */
                        //"border-top: 2px solid #C2C7CB;"
                        "border-top: 2px solid orange;"
                        "background-color: qlineargradient(x1: 0, y1: 0, x2: 0, y2: 1,"
                                                        "stop: 0 #A0A0A0, stop: 1 #202020);"
                    "}"

                    "QTabWidget::tab-bar {"
                        "left: 5px;" /* move to the right by 5px */
                    "}"

                    /* Style the tab using the tab sub-control. Note that
                        it reads QTabBar _not_ QTabWidget */
                    "QTabBar::tab {"
                        "background: qlineargradient(x1: 0, y1: 0, x2: 0, y2: 1,"
                                                    "stop: 0 #909090, stop: 0.4 #888888,"
                                                    "stop: 0.5 #808080, stop: 1.0 #909090);"
                        "border: 2px solid #808080;"
                        //"border-bottom-color: #C2C7CB;" /* same as the pane color */
                        "border-bottom-color: orange;" /* same as the pane color */
                        "border-top-left-radius: 4px;"
                        "border-top-right-radius: 4px;"
                        "min-width: 8ex;"
                        "padding: 2px;"
                    "}"

                    "QTabBar::tab:selected, QTabBar::tab:hover {"
                        "background: qlineargradient(x1: 0, y1: 0, x2: 0, y2: 1,"
                                                    "stop: 0 #D0D0D0, stop: 0.4 #A0A0A0,"
                                                    "stop: 0.5 #808080, stop: 1.0 #A0A0A0);"
                                                    //"stop: 0.5 #A0A0A0, stop: 1.0 #C0C0C0);"
                                                    //"stop: 0 #fafafa, stop: 0.4 #f4f4f4,"
                                                    //"stop: 0.5 #e7e7e7, stop: 1.0 #fafafa);"
                        //"border-bottom-color: orange;" /* same as the pane color */
                    "}"

                    "QTabBar::tab:selected {"
                        "border-color: orange;"
                        "border-bottom-color: #A0A0A0;" /* same as pane color */
                    "}"

                    "QTabBar::tab:!selected {"
                    "    margin-top: 2px;" /* make non-selected tabs look smaller */
                    "}"
                            );
#endif
		fAppl.exec();
		stop();

	}

	// ------------------------- Groups -----------------------------------

	virtual void openHorizontalBox(const char* label) { 
		openBox(label, new QHBoxLayout());
	}

	virtual void openVerticalBox(const char* label) 	{
        openBox(label, new QVBoxLayout());
    }

    virtual void openFrameBox(const char* ) 		{ }
	virtual void openTabBox(const char* label) 		{ 
		openTab(label);
	}

	virtual void closeBox()
	{
		QWidget* group = fGroupStack.top();
		fGroupStack.pop();
		if (fGroupStack.empty()) { group->show(); group->adjustSize();}
	}

	// ------------------------- active widgets -----------------------------------

	virtual void addButton(const char* label, FAUSTFLOAT* zone)
	{
		QAbstractButton* 	w = new QPushButton(label);
		uiButton* 			c = new uiButton(this, zone, w);

		insert(label, w);
		QObject::connect(w, SIGNAL(pressed()), c, SLOT(pressed()));
		QObject::connect(w, SIGNAL(released()), c, SLOT(released()));
        checkForTooltip(zone, w);
	}

    virtual void addToggleButton(const char*, FAUSTFLOAT*)
    {}

	virtual void addCheckButton(const char* label, FAUSTFLOAT* zone)
	{
		QCheckBox* 	w = new QCheckBox(label);
		uiCheckButton* 	c = new uiCheckButton(this, zone, w);

		insert(label, w);
		QObject::connect(w, SIGNAL(stateChanged(int)), c, SLOT(setState(int)));
        checkForTooltip(zone, w);
	}

    virtual void addNumEntry(const char* label, FAUSTFLOAT* zone, FAUSTFLOAT init, FAUSTFLOAT min, FAUSTFLOAT max, FAUSTFLOAT step)
    {
        if (isKnob(zone)) {
            addVerticalKnob(label, zone, init, min, max, step);
            return;
        }
        //insert(label, new QDoubleSpinBox());
        if (label && label[0]) openVerticalBox(label);
        QDoubleSpinBox*     w = new QDoubleSpinBox();
        uiNumEntry*         c = new uiNumEntry(this, zone, w, init, min, max, step);
        insert(label, w);
        w->setSuffix(fUnit[zone].c_str());
        QObject::connect(w, SIGNAL(valueChanged(double)), c, SLOT(setValue(double)));
        if (label && label[0]) closeBox();
        checkForTooltip(zone, w);
    }

    // special num entry without buttons
    virtual void addNumDisplay(const char* label, FAUSTFLOAT* zone, FAUSTFLOAT init, FAUSTFLOAT min, FAUSTFLOAT max, FAUSTFLOAT step)
    {
        //insert(label, new QDoubleSpinBox());
        if (label && label[0]) openVerticalBox(label);
        QDoubleSpinBox*     w = new QDoubleSpinBox();
        w->setAlignment(Qt::AlignHCenter);
#if 1
        w->setStyleSheet(
                  "QDoubleSpinBox {"
                                    "border: 2px solid orange;"
                                    "border-radius: 5px;"
                                    "font-size: 8pt;"
                                 "}"
        );
#endif
        uiNumEntry*         c = new uiNumEntry(this, zone, w, init, min, max, step);
        insert(label, w);
        w->setButtonSymbols(QAbstractSpinBox::NoButtons);
        w->setSuffix(fUnit[zone].c_str());
        QObject::connect(w, SIGNAL(valueChanged(double)), c, SLOT(setValue(double)));
        if (label && label[0]) closeBox();
        checkForTooltip(zone, w);
    }

	//////////////////////////////////////////////////////////////////////////////////////////////////////////
	//
	// KNOBS
	//
	//////////////////////////////////////////////////////////////////////////////////////////////////////////

	virtual void addVerticalKnob(const char* label, FAUSTFLOAT* zone, FAUSTFLOAT init, FAUSTFLOAT min, FAUSTFLOAT max, FAUSTFLOAT step)
	{
		openVerticalBox(label);
		QAbstractSlider* 	w = new QDial(); //qsynthKnob();
		uiKnob*	c = new uiKnob(this, zone, w, init, min, max, step);
		insert(label, w);
		w->setStyle(new qsynthDialVokiStyle());
		QObject::connect(w, SIGNAL(valueChanged(int)), c, SLOT(setValue(int)));
		addNumDisplay(0, zone, init, min, max, step);

        // compute the size of the knob+display
        int width  = int(64*pow(2,fGuiSize[zone]));
        int height = int(100*pow(2,fGuiSize[zone]));
        fGroupStack.top()->setMinimumSize(width,height);
        fGroupStack.top()->setMaximumSize(width,height);

		closeBox();
        checkForTooltip(zone, w);
	}

	virtual void addHorizontalKnob(const char* label, FAUSTFLOAT* zone, FAUSTFLOAT init, FAUSTFLOAT min, FAUSTFLOAT max, FAUSTFLOAT step)
	{
		openHorizontalBox(label);
		QAbstractSlider* 	w = new QDial(); //new qsynthKnob();
		uiKnob*	c = new uiKnob(this, zone, w, init, min, max, step);
		insert(label, w);
		w->setStyle(new qsynthDialVokiStyle());
		QObject::connect(w, SIGNAL(valueChanged(int)), c, SLOT(setValue(int)));
		addNumDisplay(0, zone, init, min, max, step);
		closeBox();
        checkForTooltip(zone, w);
	}

	//////////////////////////////////////////////////////////////////////////////////////////////////////////
	//
	// SLIDERS
	//
	//////////////////////////////////////////////////////////////////////////////////////////////////////////

	virtual void addVerticalSlider(const char* label, FAUSTFLOAT* zone, FAUSTFLOAT init, FAUSTFLOAT min, FAUSTFLOAT max, FAUSTFLOAT step)
	{
		if (isKnob(zone)) {
			addVerticalKnob(label, zone, init, min, max, step);
			return;
		}
		openVerticalBox(label);
		QSlider* 	w = new QSlider(Qt::Vertical);
        w->setMinimumHeight(160);
        w->setMinimumWidth(34);
		//w->setTickPosition(QSlider::TicksBothSides);
		uiSlider*	c = new uiSlider(this, zone, w, init, min, max, step);
		insert(label, w);
		QObject::connect(w, SIGNAL(valueChanged(int)), c, SLOT(setValue(int)));
		addNumDisplay(0, zone, init, min, max, step);
		closeBox();
        checkForTooltip(zone, w);
	}

	virtual void addHorizontalSlider(const char* label, FAUSTFLOAT* zone, FAUSTFLOAT init, FAUSTFLOAT min, FAUSTFLOAT max, FAUSTFLOAT step)
	{
		if (isKnob(zone)) {
			addHorizontalKnob(label, zone, init, min, max, step);
			return;
		}
		openHorizontalBox(label);
		QSlider* 	w = new QSlider(Qt::Horizontal);
        w->setMinimumHeight(34);
        w->setMinimumWidth(160);
		//w->setTickPosition(QSlider::TicksBothSides);
		uiSlider*	c = new uiSlider(this, zone, w, init, min, max, step);
		insert(label, w);
		QObject::connect(w, SIGNAL(valueChanged(int)), c, SLOT(setValue(int)));
		addNumDisplay(0, zone, init, min, max, step);
		closeBox();
        checkForTooltip(zone, w);
	}

	// ------------------------- passive widgets -----------------------------------

    virtual void addNumDisplay(const char*, FAUSTFLOAT*, int)
    {}

	virtual void addTextDisplay(const char*, FAUSTFLOAT*, const char* [], FAUSTFLOAT, FAUSTFLOAT)
    {}

    virtual void addHorizontalBargraph(const char* label , FAUSTFLOAT* zone, FAUSTFLOAT min, FAUSTFLOAT max)
    {
        AbstractDisplay*  bargraph;
        openVerticalBox(label);
        bool db = (fUnit[zone] == "dB");

        if (fLedSet.count(zone)) {
            if (db) {
                bargraph = new dbLED(min, max);
            } else {
                bargraph = new LED(min,max);
            }
        } else {
            if (db) {
                bargraph = new dbHorizontalBargraph(min, max);
            } else {
                bargraph = new linHorizontalBargraph(min, max);
            }
        }

        new uiBargraph2(this, zone, bargraph, min, max);
        insert(label, bargraph);
        closeBox();
        checkForTooltip(zone, bargraph);
    }

    virtual void addVerticalBargraph(const char* label, FAUSTFLOAT* zone, FAUSTFLOAT min, FAUSTFLOAT max)
    {
        AbstractDisplay*  bargraph;
        openVerticalBox(label);
        bool db = (fUnit[zone] == "dB");

        if (fLedSet.count(zone)) {
            if (db) {
                bargraph = new dbLED(min, max);
            } else {
                bargraph = new LED(min,max);
            }
        } else {
            if (db) {
                bargraph = new dbVerticalBargraph(min, max);
            } else {
                bargraph = new linVerticalBargraph(min, max);
            }
        }
        new uiBargraph2(this, zone, bargraph, min, max);
        insert(label, bargraph);
        closeBox();
        checkForTooltip(zone, bargraph);
    }

};

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

char* lopts(char *argv[], const char *name, char* def)
{
	int	i;
	for (i = 0; argv[i]; i++) if (!strcmp(argv[i], name)) return argv[i+1];
	return def;
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

#ifndef __coreaudio_dsp__
#define __coreaudio_dsp__

#include <math.h>
#include <stdlib.h>
#include <stdio.h>
#include <vector>
#include <iostream>

#include <AudioToolbox/AudioConverter.h>
#include <CoreAudio/CoreAudio.h>
#include <AudioUnit/AudioUnit.h>
#include <CoreServices/CoreServices.h>


/******************************************************************************
*******************************************************************************

						An abstraction layer over audio layer

*******************************************************************************
*******************************************************************************/

#ifndef __audio__
#define __audio__
			
class dsp;

typedef void (* shutdown_callback)(const char* message, void* arg);

typedef void (* buffer_size_callback)(int frames, void* arg);

class audio {
    
 public:
			 audio() {}
	virtual ~audio() {}
	
	virtual bool init(const char* name, dsp*)               = 0;
	virtual bool start()                                    = 0;
	virtual void stop()                                     = 0;
    virtual void shutdown(shutdown_callback cb, void* arg)  {}
    
};
					
#endif

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
	virtual void buildUserInterface(UI* interface) 					= 0;
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

using namespace std;

/******************************************************************************
*******************************************************************************

							COREAUDIO INTERNAL INTERFACE

*******************************************************************************
*******************************************************************************/

#define OPEN_ERR -1
#define CLOSE_ERR -1
#define NO_ERR 0

#define WAIT_COUNTER 60

typedef	UInt8	CAAudioHardwareDeviceSectionID;
#define	kAudioDeviceSectionInput	((CAAudioHardwareDeviceSectionID)0x01)
#define	kAudioDeviceSectionOutput	((CAAudioHardwareDeviceSectionID)0x00)
#define	kAudioDeviceSectionGlobal	((CAAudioHardwareDeviceSectionID)0x00)
#define	kAudioDeviceSectionWildcard	((CAAudioHardwareDeviceSectionID)0xFF)

class TCoreAudioRenderer
{
    protected:
    
        int	fDevNumInChans;
        int	fDevNumOutChans;
        
        float** fInChannel;
        float** fOutChannel;
        
        dsp* fDSP;
   
		AudioBufferList* fInputData;
		AudioDeviceID fDeviceID;
		AudioUnit fAUHAL;
        AudioObjectID fPluginID;    // Used for aggregate device
        bool fState;

		OSStatus GetDefaultDevice(int inChan, int outChan, int samplerate, AudioDeviceID* id);

        OSStatus CreateAggregateDevice(AudioDeviceID captureDeviceID, AudioDeviceID playbackDeviceID, int samplerate, AudioDeviceID* outAggregateDevice);
        OSStatus CreateAggregateDeviceAux(vector<AudioDeviceID> captureDeviceID, vector<AudioDeviceID> playbackDeviceID, int samplerate, AudioDeviceID* outAggregateDevice);
        OSStatus DestroyAggregateDevice();

        OSStatus GetDeviceNameFromID(AudioDeviceID id, char* name);

        int SetupSampleRateAux(AudioDeviceID inDevice, int samplerate);

		static OSStatus Render(void *inRefCon,
                               AudioUnitRenderActionFlags *ioActionFlags,
                               const AudioTimeStamp *inTimeStamp,
                               UInt32 inBusNumber,
                               UInt32 inNumberFrames,
                               AudioBufferList *ioData);
    
        static OSStatus SRNotificationCallback(AudioDeviceID inDevice,
                                            UInt32 inChannel,
                                            Boolean	isInput,
                                            AudioDevicePropertyID inPropertyID,
                                            void* inClientData);
    
        OSStatus Render(AudioUnitRenderActionFlags *ioActionFlags,
                        const AudioTimeStamp *inTimeStamp,
                        UInt32 inNumberFrames,
                        AudioBufferList *ioData);
    
    public:

        TCoreAudioRenderer()
            :fInputData(0),fDeviceID(0),fAUHAL(0),fPluginID(0),fState(false),fDevNumInChans(0),fDevNumOutChans(0),fDSP(0)
        {}
        virtual ~TCoreAudioRenderer()
        {}

        int OpenDefault(dsp* dsp, int inChan, int outChan, int bufferSize, int sampleRate);
        int Close();

        int Start();
        int Stop();

};

typedef TCoreAudioRenderer * TCoreAudioRendererPtr;

static void PrintStreamDesc(AudioStreamBasicDescription *inDesc)
{
    printf("- - - - - - - - - - - - - - - - - - - -\n");
    printf("  Sample Rate:%f\n", inDesc->mSampleRate);
    printf("  Format ID:%.*s\n", (int)sizeof(inDesc->mFormatID), (char*)&inDesc->mFormatID);
    printf("  Format Flags:%lX\n", inDesc->mFormatFlags);
    printf("  Bytes per Packet:%ld\n", inDesc->mBytesPerPacket);
    printf("  Frames per Packet:%ld\n", inDesc->mFramesPerPacket);
    printf("  Bytes per Frame:%ld\n", inDesc->mBytesPerFrame);
    printf("  Channels per Frame:%ld\n", inDesc->mChannelsPerFrame);
    printf("  Bits per Channel:%ld\n", inDesc->mBitsPerChannel);
    printf("- - - - - - - - - - - - - - - - - - - -\n");
}

static void printError(OSStatus err)
{
    switch (err) {
        case kAudioHardwareNoError:
            printf("error code : kAudioHardwareNoError\n");
            break;
		case kAudioConverterErr_FormatNotSupported:
            printf("error code : kAudioConverterErr_FormatNotSupported\n");
            break;
        case kAudioConverterErr_OperationNotSupported:
            printf("error code : kAudioConverterErr_OperationNotSupported\n");
            break;
        case kAudioConverterErr_PropertyNotSupported:
            printf("error code : kAudioConverterErr_PropertyNotSupported\n");
            break;
        case kAudioConverterErr_InvalidInputSize:
            printf("error code : kAudioConverterErr_InvalidInputSize\n");
            break;
        case kAudioConverterErr_InvalidOutputSize:
            printf("error code : kAudioConverterErr_InvalidOutputSize\n");
            break;
        case kAudioConverterErr_UnspecifiedError:
            printf("error code : kAudioConverterErr_UnspecifiedError\n");
            break;
        case kAudioConverterErr_BadPropertySizeError:
            printf("error code : kAudioConverterErr_BadPropertySizeError\n");
            break;
        case kAudioConverterErr_RequiresPacketDescriptionsError:
            printf("error code : kAudioConverterErr_RequiresPacketDescriptionsError\n");
            break;
        case kAudioConverterErr_InputSampleRateOutOfRange:
            printf("error code : kAudioConverterErr_InputSampleRateOutOfRange\n");
            break;
        case kAudioConverterErr_OutputSampleRateOutOfRange:
            printf("error code : kAudioConverterErr_OutputSampleRateOutOfRange\n");
            break;
		case kAudioHardwareNotRunningError:
            printf("error code : kAudioHardwareNotRunningError\n");
            break;
        case kAudioHardwareUnknownPropertyError:
            printf("error code : kAudioHardwareUnknownPropertyError\n");
            break;
        case kAudioHardwareIllegalOperationError:
            printf("error code : kAudioHardwareIllegalOperationError\n");
            break;
        case kAudioHardwareBadDeviceError:
            printf("error code : kAudioHardwareBadDeviceError\n");
            break;
        case kAudioHardwareBadStreamError:
            printf("error code : kAudioHardwareBadStreamError\n");
            break;
        case kAudioDeviceUnsupportedFormatError:
            printf("error code : kAudioDeviceUnsupportedFormatError\n");
            break;
        case kAudioDevicePermissionsError:
            printf("error code : kAudioDevicePermissionsError\n");
            break;
        default:
            printf("error code : unknown\n");
            break;
    }
}

OSStatus TCoreAudioRenderer::Render(void *inRefCon,
                                     AudioUnitRenderActionFlags *ioActionFlags,
                                     const AudioTimeStamp *inTimeStamp,
                                     UInt32,
                                     UInt32 inNumberFrames,
                                     AudioBufferList *ioData)
{
    return static_cast<TCoreAudioRendererPtr>(inRefCon)->Render(ioActionFlags, inTimeStamp, inNumberFrames, ioData);
}

OSStatus TCoreAudioRenderer::Render(AudioUnitRenderActionFlags *ioActionFlags,
                                    const AudioTimeStamp *inTimeStamp,
                                    UInt32 inNumberFrames,
                                    AudioBufferList *ioData)
{
    AudioUnitRender(fAUHAL, ioActionFlags, inTimeStamp, 1, inNumberFrames, fInputData);
    for (int i = 0; i < fDevNumInChans; i++) {
        fInChannel[i] = (float*)fInputData->mBuffers[i].mData;
    }
    for (int i = 0; i < fDevNumOutChans; i++) {
        fOutChannel[i] = (float*)ioData->mBuffers[i].mData;
    }
    fDSP->compute(inNumberFrames, fInChannel, fOutChannel);
	return 0;
}


static CFStringRef GetDeviceName(AudioDeviceID id)
{
    UInt32 size = sizeof(CFStringRef);
    CFStringRef UIname;
    OSStatus err = AudioDeviceGetProperty(id, 0, false, kAudioDevicePropertyDeviceUID, &size, &UIname);
    return (err == noErr) ? UIname : NULL;
}

OSStatus TCoreAudioRenderer::GetDeviceNameFromID(AudioDeviceID id, char* name)
{
    UInt32 size = 256;
    return AudioDeviceGetProperty(id, 0, false, kAudioDevicePropertyDeviceName, &size, name);
}

OSStatus TCoreAudioRenderer::GetDefaultDevice(int inChan, int outChan, int samplerate, AudioDeviceID* id)
{
    UInt32 theSize = sizeof(UInt32);
    AudioDeviceID inDefault;
    AudioDeviceID outDefault;
	OSStatus res;

    if ((res = AudioHardwareGetProperty(kAudioHardwarePropertyDefaultInputDevice,
                                        &theSize, &inDefault)) != noErr)
        return res;

    if ((res = AudioHardwareGetProperty(kAudioHardwarePropertyDefaultOutputDevice,
                                        &theSize, &outDefault)) != noErr)
        return res;

	// Duplex mode
	if (inChan > 0 && outChan > 0) {
		// Get the device only if default input and output are the same
		if (inDefault == outDefault) {
			*id = inDefault;
			return noErr;
		} else {
            //printf("GetDefaultDevice : input = %uld and output = %uld are not the same, create aggregate device...\n", inDefault, outDefault);
            if (CreateAggregateDevice(inDefault, outDefault, samplerate, id) != noErr) {
                return kAudioHardwareBadDeviceError;
            }
       	}
	} else if (inChan > 0) {
		*id = inDefault;
		return noErr;
	} else if (outChan > 0) {
		*id = outDefault;
		return noErr;
	} else {
		return kAudioHardwareBadDeviceError;
	}

	return noErr;
}

OSStatus TCoreAudioRenderer::CreateAggregateDevice(AudioDeviceID captureDeviceID, AudioDeviceID playbackDeviceID, int samplerate, AudioDeviceID* outAggregateDevice)
{
    OSStatus err = noErr;
    AudioObjectID sub_device[32];
    UInt32 outSize = sizeof(sub_device);

    err = AudioDeviceGetProperty(captureDeviceID, 0, kAudioDeviceSectionGlobal, kAudioAggregateDevicePropertyActiveSubDeviceList, &outSize, sub_device);
    vector<AudioDeviceID> captureDeviceIDArray;

    if (err != noErr) {
        //printf("Input device does not have subdevices\n");
        captureDeviceIDArray.push_back(captureDeviceID);
    } else {
        int num_devices = outSize / sizeof(AudioObjectID);
        //printf("Input device has %d subdevices\n", num_devices);
        for (int i = 0; i < num_devices; i++) {
            captureDeviceIDArray.push_back(sub_device[i]);
        }
    }

    err = AudioDeviceGetProperty(playbackDeviceID, 0, kAudioDeviceSectionGlobal, kAudioAggregateDevicePropertyActiveSubDeviceList, &outSize, sub_device);
    vector<AudioDeviceID> playbackDeviceIDArray;

    if (err != noErr) {
        //printf("Output device does not have subdevices\n");
        playbackDeviceIDArray.push_back(playbackDeviceID);
    } else {
        int num_devices = outSize / sizeof(AudioObjectID);
        //printf("Output device has %d subdevices\n", num_devices);
        for (int i = 0; i < num_devices; i++) {
            playbackDeviceIDArray.push_back(sub_device[i]);
        }
    }

    return CreateAggregateDeviceAux(captureDeviceIDArray, playbackDeviceIDArray, samplerate, outAggregateDevice);
}


OSStatus TCoreAudioRenderer::SRNotificationCallback(AudioDeviceID inDevice,
                                                    UInt32 /*inChannel*/,
                                                    Boolean	/*isInput*/,
                                                    AudioDevicePropertyID inPropertyID,
                                                    void* inClientData)
{
    TCoreAudioRenderer* driver = (TCoreAudioRenderer*)inClientData;

    switch (inPropertyID) {

        case kAudioDevicePropertyNominalSampleRate: {
            //printf("JackCoreAudioDriver::SRNotificationCallback kAudioDevicePropertyNominalSampleRate\n");
            driver->fState = true;
            // Check new sample rate
            Float64 sampleRate;
            UInt32 outSize =  sizeof(Float64);
            OSStatus err = AudioDeviceGetProperty(inDevice, 0, kAudioDeviceSectionGlobal, kAudioDevicePropertyNominalSampleRate, &outSize, &sampleRate);
            if (err != noErr) {
                printf("Cannot get current sample rate\n");
                printError(err);
            } else {
                //printf("SRNotificationCallback : checked sample rate = %f\n", sampleRate);
            }
            break;
        }
    }

    return noErr;
}

int TCoreAudioRenderer::SetupSampleRateAux(AudioDeviceID inDevice, int samplerate)
{
    OSStatus err = noErr;
    UInt32 outSize;
    Float64 sampleRate;

    // Get sample rate
    outSize =  sizeof(Float64);
    err = AudioDeviceGetProperty(inDevice, 0, kAudioDeviceSectionGlobal, kAudioDevicePropertyNominalSampleRate, &outSize, &sampleRate);
    if (err != noErr) {
        printf("Cannot get current sample rate\n");
        printError(err);
        return -1;
    } else {
        //printf("Current sample rate = %f\n", sampleRate);
    }

    // If needed, set new sample rate
    if (samplerate != (int)sampleRate) {
        sampleRate = (Float64)samplerate;

        // To get SR change notification
        err = AudioDeviceAddPropertyListener(inDevice, 0, true, kAudioDevicePropertyNominalSampleRate, SRNotificationCallback, this);
        if (err != noErr) {
            printf("Error calling AudioDeviceAddPropertyListener with kAudioDevicePropertyNominalSampleRate\n");
            printError(err);
            return -1;
        }
        err = AudioDeviceSetProperty(inDevice, NULL, 0, kAudioDeviceSectionGlobal, kAudioDevicePropertyNominalSampleRate, outSize, &sampleRate);
        if (err != noErr) {
            printf("Cannot set sample rate = %d\n", samplerate);
            printError(err);
            return -1;
        }

        // Waiting for SR change notification
        int count = 0;
        while (!fState && count++ < WAIT_COUNTER) {
            usleep(100000);
            //printf("Wait count = %d\n", count);
        }

        // Check new sample rate
        outSize =  sizeof(Float64);
        err = AudioDeviceGetProperty(inDevice, 0, kAudioDeviceSectionGlobal, kAudioDevicePropertyNominalSampleRate, &outSize, &sampleRate);
        if (err != noErr) {
            printf("Cannot get current sample rate\n");
            printError(err);
        } else {
            //printf("Checked sample rate = %f\n", sampleRate);
        }

        // Remove SR change notification
        AudioDeviceRemovePropertyListener(inDevice, 0, true, kAudioDevicePropertyNominalSampleRate, SRNotificationCallback);
    }

    return 0;
}

OSStatus TCoreAudioRenderer::CreateAggregateDeviceAux(vector<AudioDeviceID> captureDeviceID, vector<AudioDeviceID> playbackDeviceID, int samplerate, AudioDeviceID* outAggregateDevice)
{
    OSStatus osErr = noErr;
    UInt32 outSize;
    Boolean outWritable;

    bool fClockDriftCompensate = true;

    // Prepare sub-devices for clock drift compensation
    // Workaround for bug in the HAL : until 10.6.2
    AudioObjectPropertyAddress theAddressOwned = { kAudioObjectPropertyOwnedObjects, kAudioObjectPropertyScopeGlobal, kAudioObjectPropertyElementMaster };
    AudioObjectPropertyAddress theAddressDrift = { kAudioSubDevicePropertyDriftCompensation, kAudioObjectPropertyScopeGlobal, kAudioObjectPropertyElementMaster };
    UInt32 theQualifierDataSize = sizeof(AudioObjectID);
    AudioClassID inClass = kAudioSubDeviceClassID;
    void* theQualifierData = &inClass;
    UInt32 subDevicesNum = 0;

    //---------------------------------------------------------------------------
    // Setup SR of both devices otherwise creating AD may fail...
    //---------------------------------------------------------------------------
    UInt32 keptclockdomain = 0;
    UInt32 clockdomain = 0;
    outSize = sizeof(UInt32);
    bool need_clock_drift_compensation = false;

    for (UInt32 i = 0; i < captureDeviceID.size(); i++) {
        if (SetupSampleRateAux(captureDeviceID[i], samplerate) < 0) {
            printf("TCoreAudioRenderer::CreateAggregateDevice : cannot set SR of input device\n");
        } else  {
            // Check clock domain
            osErr = AudioDeviceGetProperty(captureDeviceID[i], 0, kAudioDeviceSectionGlobal, kAudioDevicePropertyClockDomain, &outSize, &clockdomain);
            if (osErr != 0) {
                printf("TCoreAudioRenderer::CreateAggregateDevice : kAudioDevicePropertyClockDomain error\n");
                printError(osErr);
            } else {
                keptclockdomain = (keptclockdomain == 0) ? clockdomain : keptclockdomain;
                //printf("TCoreAudioRenderer::CreateAggregateDevice : input clockdomain = %d\n", clockdomain);
                if (clockdomain != 0 && clockdomain != keptclockdomain) {
                    //printf("TCoreAudioRenderer::CreateAggregateDevice : devices do not share the same clock!! clock drift compensation would be needed...\n");
                    need_clock_drift_compensation = true;
                }
            }
        }
    }

    for (UInt32 i = 0; i < playbackDeviceID.size(); i++) {
        if (SetupSampleRateAux(playbackDeviceID[i], samplerate) < 0) {
            printf("TCoreAudioRenderer::CreateAggregateDevice : cannot set SR of output device\n");
        } else {
            // Check clock domain
            osErr = AudioDeviceGetProperty(playbackDeviceID[i], 0, kAudioDeviceSectionGlobal, kAudioDevicePropertyClockDomain, &outSize, &clockdomain);
            if (osErr != 0) {
                printf("TCoreAudioRenderer::CreateAggregateDevice : kAudioDevicePropertyClockDomain error\n");
                printError(osErr);
            } else {
                keptclockdomain = (keptclockdomain == 0) ? clockdomain : keptclockdomain;
                //printf("TCoreAudioRenderer::CreateAggregateDevice : output clockdomain = %d", clockdomain);
                if (clockdomain != 0 && clockdomain != keptclockdomain) {
                    //printf("TCoreAudioRenderer::CreateAggregateDevice : devices do not share the same clock!! clock drift compensation would be needed...\n");
                    need_clock_drift_compensation = true;
                }
            }
        }
    }

    // If no valid clock domain was found, then assume we have to compensate...
    if (keptclockdomain == 0) {
        need_clock_drift_compensation = true;
    }

    //---------------------------------------------------------------------------
    // Start to create a new aggregate by getting the base audio hardware plugin
    //---------------------------------------------------------------------------

    char device_name[256];
    for (UInt32 i = 0; i < captureDeviceID.size(); i++) {
        GetDeviceNameFromID(captureDeviceID[i], device_name);
        //printf("Separated input = '%s' \n", device_name);
    }

    for (UInt32 i = 0; i < playbackDeviceID.size(); i++) {
        GetDeviceNameFromID(playbackDeviceID[i], device_name);
        //printf("Separated output = '%s' \n", device_name);
    }

    osErr = AudioHardwareGetPropertyInfo(kAudioHardwarePropertyPlugInForBundleID, &outSize, &outWritable);
    if (osErr != noErr) {
        printf("TCoreAudioRenderer::CreateAggregateDevice : AudioHardwareGetPropertyInfo kAudioHardwarePropertyPlugInForBundleID error\n");
        printError(osErr);
        return osErr;
    }

    AudioValueTranslation pluginAVT;

    CFStringRef inBundleRef = CFSTR("com.apple.audio.CoreAudio");

    pluginAVT.mInputData = &inBundleRef;
    pluginAVT.mInputDataSize = sizeof(inBundleRef);
    pluginAVT.mOutputData = &fPluginID;
    pluginAVT.mOutputDataSize = sizeof(fPluginID);

    osErr = AudioHardwareGetProperty(kAudioHardwarePropertyPlugInForBundleID, &outSize, &pluginAVT);
    if (osErr != noErr) {
        printf("TCoreAudioRenderer::CreateAggregateDevice : AudioHardwareGetProperty kAudioHardwarePropertyPlugInForBundleID error\n");
        printError(osErr);
        return osErr;
    }

    //-------------------------------------------------
    // Create a CFDictionary for our aggregate device
    //-------------------------------------------------

    CFMutableDictionaryRef aggDeviceDict = CFDictionaryCreateMutable(NULL, 0, &kCFTypeDictionaryKeyCallBacks, &kCFTypeDictionaryValueCallBacks);

    CFStringRef AggregateDeviceNameRef = CFSTR("JackDuplex");
    CFStringRef AggregateDeviceUIDRef = CFSTR("com.grame.JackDuplex");

    // add the name of the device to the dictionary
    CFDictionaryAddValue(aggDeviceDict, CFSTR(kAudioAggregateDeviceNameKey), AggregateDeviceNameRef);

    // add our choice of UID for the aggregate device to the dictionary
    CFDictionaryAddValue(aggDeviceDict, CFSTR(kAudioAggregateDeviceUIDKey), AggregateDeviceUIDRef);

    // add a "private aggregate key" to the dictionary
    int value = 1;
    CFNumberRef AggregateDeviceNumberRef = CFNumberCreate(NULL, kCFNumberIntType, &value);

    SInt32 system;
    Gestalt(gestaltSystemVersion, &system);

    //printf("TCoreAudioRenderer::CreateAggregateDevice : system version = %x limit = %x\n", system, 0x00001054);

    // Starting with 10.5.4 systems, the AD can be internal... (better)
    if (system < 0x00001054) {
        //printf("TCoreAudioRenderer::CreateAggregateDevice : public aggregate device....\n");
    } else {
        //printf("TCoreAudioRenderer::CreateAggregateDevice : private aggregate device....\n");
        CFDictionaryAddValue(aggDeviceDict, CFSTR(kAudioAggregateDeviceIsPrivateKey), AggregateDeviceNumberRef);
    }

    // Prepare sub-devices for clock drift compensation
    CFMutableArrayRef subDevicesArrayClock = NULL;

    /*
    if (fClockDriftCompensate) {
        if (need_clock_drift_compensation) {
            jack_info("Clock drift compensation activated...");
            subDevicesArrayClock = CFArrayCreateMutable(NULL, 0, &kCFTypeArrayCallBacks);

            for (UInt32 i = 0; i < captureDeviceID.size(); i++) {
                CFStringRef UID = GetDeviceName(captureDeviceID[i]);
                if (UID) {
                    CFMutableDictionaryRef subdeviceAggDeviceDict = CFDictionaryCreateMutable(NULL, 0, &kCFTypeDictionaryKeyCallBacks, &kCFTypeDictionaryValueCallBacks);
                    CFDictionaryAddValue(subdeviceAggDeviceDict, CFSTR(kAudioSubDeviceUIDKey), UID);
                    CFDictionaryAddValue(subdeviceAggDeviceDict, CFSTR(kAudioSubDeviceDriftCompensationKey), AggregateDeviceNumberRef);
                    //CFRelease(UID);
                    CFArrayAppendValue(subDevicesArrayClock, subdeviceAggDeviceDict);
                }
            }

            for (UInt32 i = 0; i < playbackDeviceID.size(); i++) {
                CFStringRef UID = GetDeviceName(playbackDeviceID[i]);
                if (UID) {
                    CFMutableDictionaryRef subdeviceAggDeviceDict = CFDictionaryCreateMutable(NULL, 0, &kCFTypeDictionaryKeyCallBacks, &kCFTypeDictionaryValueCallBacks);
                    CFDictionaryAddValue(subdeviceAggDeviceDict, CFSTR(kAudioSubDeviceUIDKey), UID);
                    CFDictionaryAddValue(subdeviceAggDeviceDict, CFSTR(kAudioSubDeviceDriftCompensationKey), AggregateDeviceNumberRef);
                    //CFRelease(UID);
                    CFArrayAppendValue(subDevicesArrayClock, subdeviceAggDeviceDict);
                }
            }

            // add sub-device clock array for the aggregate device to the dictionary
            CFDictionaryAddValue(aggDeviceDict, CFSTR(kAudioAggregateDeviceSubDeviceListKey), subDevicesArrayClock);
        } else {
            jack_info("Clock drift compensation was asked but is not needed (devices use the same clock domain)");
        }
    }
    */

    //-------------------------------------------------
    // Create a CFMutableArray for our sub-device list
    //-------------------------------------------------

    // we need to append the UID for each device to a CFMutableArray, so create one here
    CFMutableArrayRef subDevicesArray = CFArrayCreateMutable(NULL, 0, &kCFTypeArrayCallBacks);

    vector<CFStringRef> captureDeviceUID;
    for (UInt32 i = 0; i < captureDeviceID.size(); i++) {
        CFStringRef ref = GetDeviceName(captureDeviceID[i]);
        if (ref == NULL)
            return -1;
        captureDeviceUID.push_back(ref);
        // input sub-devices in this example, so append the sub-device's UID to the CFArray
        CFArrayAppendValue(subDevicesArray, ref);
   }

    vector<CFStringRef> playbackDeviceUID;
    for (UInt32 i = 0; i < playbackDeviceID.size(); i++) {
        CFStringRef ref = GetDeviceName(playbackDeviceID[i]);
        if (ref == NULL)
            return -1;
        playbackDeviceUID.push_back(ref);
        // output sub-devices in this example, so append the sub-device's UID to the CFArray
        CFArrayAppendValue(subDevicesArray, ref);
    }

    //-----------------------------------------------------------------------
    // Feed the dictionary to the plugin, to create a blank aggregate device
    //-----------------------------------------------------------------------

    AudioObjectPropertyAddress pluginAOPA;
    pluginAOPA.mSelector = kAudioPlugInCreateAggregateDevice;
    pluginAOPA.mScope = kAudioObjectPropertyScopeGlobal;
    pluginAOPA.mElement = kAudioObjectPropertyElementMaster;
    UInt32 outDataSize;

    osErr = AudioObjectGetPropertyDataSize(fPluginID, &pluginAOPA, 0, NULL, &outDataSize);
    if (osErr != noErr) {
        printf("TCoreAudioRenderer::CreateAggregateDevice : AudioObjectGetPropertyDataSize error\n");
        printError(osErr);
        goto error;
    }

    osErr = AudioObjectGetPropertyData(fPluginID, &pluginAOPA, sizeof(aggDeviceDict), &aggDeviceDict, &outDataSize, outAggregateDevice);
    if (osErr != noErr) {
        printf("TCoreAudioRenderer::CreateAggregateDevice : AudioObjectGetPropertyData error\n");
        printError(osErr);
        goto error;
    }

    // pause for a bit to make sure that everything completed correctly
    // this is to work around a bug in the HAL where a new aggregate device seems to disappear briefly after it is created
    CFRunLoopRunInMode(kCFRunLoopDefaultMode, 0.1, false);

    //-------------------------
    // Set the sub-device list
    //-------------------------

    pluginAOPA.mSelector = kAudioAggregateDevicePropertyFullSubDeviceList;
    pluginAOPA.mScope = kAudioObjectPropertyScopeGlobal;
    pluginAOPA.mElement = kAudioObjectPropertyElementMaster;
    outDataSize = sizeof(CFMutableArrayRef);
    osErr = AudioObjectSetPropertyData(*outAggregateDevice, &pluginAOPA, 0, NULL, outDataSize, &subDevicesArray);
    if (osErr != noErr) {
        printf("TCoreAudioRenderer::CreateAggregateDevice : AudioObjectSetPropertyData for sub-device list error\n");
        printError(osErr);
        goto error;
    }

    // pause again to give the changes time to take effect
    CFRunLoopRunInMode(kCFRunLoopDefaultMode, 0.1, false);

    //-----------------------
    // Set the master device
    //-----------------------

    // set the master device manually (this is the device which will act as the master clock for the aggregate device)
    // pass in the UID of the device you want to use
    pluginAOPA.mSelector = kAudioAggregateDevicePropertyMasterSubDevice;
    pluginAOPA.mScope = kAudioObjectPropertyScopeGlobal;
    pluginAOPA.mElement = kAudioObjectPropertyElementMaster;
    outDataSize = sizeof(CFStringRef);
    osErr = AudioObjectSetPropertyData(*outAggregateDevice, &pluginAOPA, 0, NULL, outDataSize, &captureDeviceUID[0]);  // First apture is master...
    if (osErr != noErr) {
        printf("TCoreAudioRenderer::CreateAggregateDevice : AudioObjectSetPropertyData for master device error\n");
        printError(osErr);
        goto error;
    }

    // pause again to give the changes time to take effect
    CFRunLoopRunInMode(kCFRunLoopDefaultMode, 0.1, false);

    // Prepare sub-devices for clock drift compensation
    // Workaround for bug in the HAL : until 10.6.2

    if (fClockDriftCompensate) {
        if (need_clock_drift_compensation) {
            //printf("Clock drift compensation activated...\n");

            // Get the property data size
            osErr = AudioObjectGetPropertyDataSize(*outAggregateDevice, &theAddressOwned, theQualifierDataSize, theQualifierData, &outSize);
            if (osErr != noErr) {
                printf("TCoreAudioRenderer::CreateAggregateDevice kAudioObjectPropertyOwnedObjects error\n");
                printError(osErr);
            }

            //	Calculate the number of object IDs
            subDevicesNum = outSize / sizeof(AudioObjectID);
            //printf("TCoreAudioRenderer::CreateAggregateDevice clock drift compensation, number of sub-devices = %d\n", subDevicesNum);
            AudioObjectID subDevices[subDevicesNum];
            outSize = sizeof(subDevices);

            osErr = AudioObjectGetPropertyData(*outAggregateDevice, &theAddressOwned, theQualifierDataSize, theQualifierData, &outSize, subDevices);
            if (osErr != noErr) {
                printf("TCoreAudioRenderer::CreateAggregateDevice kAudioObjectPropertyOwnedObjects error\n");
                printError(osErr);
            }

            // Set kAudioSubDevicePropertyDriftCompensation property...
            for (UInt32 index = 0; index < subDevicesNum; ++index) {
                UInt32 theDriftCompensationValue = 1;
                osErr = AudioObjectSetPropertyData(subDevices[index], &theAddressDrift, 0, NULL, sizeof(UInt32), &theDriftCompensationValue);
                if (osErr != noErr) {
                    printf("TCoreAudioRenderer::CreateAggregateDevice kAudioSubDevicePropertyDriftCompensation error\n");
                    printError(osErr);
                }
            }
        } else {
            //printf("Clock drift compensation was asked but is not needed (devices use the same clock domain)\n");
        }
    }

    // pause again to give the changes time to take effect
    CFRunLoopRunInMode(kCFRunLoopDefaultMode, 0.1, false);

    //----------
    // Clean up
    //----------

    // release the private AD key
    CFRelease(AggregateDeviceNumberRef);

    // release the CF objects we have created - we don't need them any more
    CFRelease(aggDeviceDict);
    CFRelease(subDevicesArray);

    if (subDevicesArrayClock)
        CFRelease(subDevicesArrayClock);

    // release the device UID
    for (UInt32 i = 0; i < captureDeviceUID.size(); i++) {
        CFRelease(captureDeviceUID[i]);
    }

    for (UInt32 i = 0; i < playbackDeviceUID.size(); i++) {
        CFRelease(playbackDeviceUID[i]);
    }

    //printf("New aggregate device %d\n", *outAggregateDevice);
    return noErr;

error:
    DestroyAggregateDevice();
    return -1;
}

OSStatus TCoreAudioRenderer::DestroyAggregateDevice()
{
    OSStatus osErr = noErr;
    AudioObjectPropertyAddress pluginAOPA;
    pluginAOPA.mSelector = kAudioPlugInDestroyAggregateDevice;
    pluginAOPA.mScope = kAudioObjectPropertyScopeGlobal;
    pluginAOPA.mElement = kAudioObjectPropertyElementMaster;
    UInt32 outDataSize;

    if (fPluginID > 0)   {

        osErr = AudioObjectGetPropertyDataSize(fPluginID, &pluginAOPA, 0, NULL, &outDataSize);
        if (osErr != noErr) {
            printf("TCoreAudioRenderer::DestroyAggregateDevice : AudioObjectGetPropertyDataSize error\n");
            printError(osErr);
            return osErr;
        }

        osErr = AudioObjectGetPropertyData(fPluginID, &pluginAOPA, 0, NULL, &outDataSize, &fDeviceID);
        if (osErr != noErr) {
            printf("TCoreAudioRenderer::DestroyAggregateDevice : AudioObjectGetPropertyData error\n");
            printError(osErr);
            return osErr;
        }

    }

    return noErr;
}


int TCoreAudioRenderer::OpenDefault(dsp* dsp, int inChan, int outChan, int bufferSize, int samplerate)
{
	OSStatus err = noErr;
    ComponentResult err1;
    UInt32 outSize;
    UInt32 enableIO;
	Boolean isWritable;
	AudioStreamBasicDescription srcFormat, dstFormat, sampleRate;
    int in_nChannels, out_nChannels;
    
    fDSP = dsp;
    fDevNumInChans = inChan;
    fDevNumOutChans = outChan;
    
    fInChannel = new float*[fDevNumInChans];
    fOutChannel = new float*[fDevNumOutChans];

    //printf("OpenDefault inChan = %ld outChan = %ld bufferSize = %ld samplerate = %ld\n", inChan, outChan, bufferSize, samplerate);

    SInt32 major;
    SInt32 minor;
    Gestalt(gestaltSystemVersionMajor, &major);
    Gestalt(gestaltSystemVersionMinor, &minor);

    // Starting with 10.6 systems, the HAL notification thread is created internally
    if (major == 10 && minor >= 6) {
        CFRunLoopRef theRunLoop = NULL;
        AudioObjectPropertyAddress theAddress = { kAudioHardwarePropertyRunLoop, kAudioObjectPropertyScopeGlobal, kAudioObjectPropertyElementMaster };
        OSStatus osErr = AudioObjectSetPropertyData (kAudioObjectSystemObject, &theAddress, 0, NULL, sizeof(CFRunLoopRef), &theRunLoop);
        if (osErr != noErr) {
            printf("TCoreAudioRenderer::Open kAudioHardwarePropertyRunLoop error\n");
            printError(osErr);
        }
    }

	if (GetDefaultDevice(inChan, outChan, samplerate,&fDeviceID) != noErr) {
		printf("Cannot open default device\n");
		return OPEN_ERR;
	}

	// Setting buffer size
    outSize = sizeof(UInt32);
    err = AudioDeviceSetProperty(fDeviceID, NULL, 0, false, kAudioDevicePropertyBufferFrameSize, outSize, &bufferSize);
    if (err != noErr) {
        printf("Cannot set buffer size %ld\n", bufferSize);
        err = AudioDeviceGetProperty(fDeviceID, 0, false, kAudioDevicePropertyBufferFrameSize, &outSize, &bufferSize);
        if (err != noErr) {
            printf("Cannot get buffer size %ld\n", bufferSize);
            printError(err);
            return OPEN_ERR;
        } else {
            //printf("Use fixed buffer size %ld\n", bufferSize);
        }
    }

    // Setting sample rate
    outSize = sizeof(AudioStreamBasicDescription);
    err = AudioDeviceGetProperty(fDeviceID, 0, false, kAudioDevicePropertyStreamFormat, &outSize, &sampleRate);
    if (err != noErr) {
        printf("Cannot get current sample rate\n");
        printError(err);
        return OPEN_ERR;
    }

    if (samplerate != int(sampleRate.mSampleRate)) {
        sampleRate.mSampleRate = (Float64)(samplerate);
        err = AudioDeviceSetProperty(fDeviceID, NULL, 0, false, kAudioDevicePropertyStreamFormat, outSize, &sampleRate);
        if (err != noErr) {
            printf("Cannot set sample rate = %ld\n", samplerate);
            printError(err);
            return OPEN_ERR;
        }
    }

    // AUHAL
    ComponentDescription cd = {kAudioUnitType_Output, kAudioUnitSubType_HALOutput, kAudioUnitManufacturer_Apple, 0, 0};
    Component HALOutput = FindNextComponent(NULL, &cd);

    err1 = OpenAComponent(HALOutput, &fAUHAL);
    if (err1 != noErr) {
		printf("Error calling OpenAComponent\n");
        printError(err1);
        goto error;
	}

    err1 = AudioUnitInitialize(fAUHAL);
    if (err1 != noErr) {
		printf("Cannot initialize AUHAL unit\n");
		printError(err1);
        goto error;
	}

    enableIO = 1;
    err1 = AudioUnitSetProperty(fAUHAL, kAudioOutputUnitProperty_EnableIO, kAudioUnitScope_Output, 0, &enableIO, sizeof(enableIO));
    if (err1 != noErr) {
        printf("Error calling AudioUnitSetProperty - kAudioOutputUnitProperty_EnableIO, kAudioUnitScope_Output\n");
        printError(err1);
        goto error;
    }

    enableIO = 1;
    err1 = AudioUnitSetProperty(fAUHAL, kAudioOutputUnitProperty_EnableIO, kAudioUnitScope_Input, 1, &enableIO, sizeof(enableIO));
    if (err1 != noErr) {
        printf("Error calling AudioUnitSetProperty - kAudioOutputUnitProperty_EnableIO, kAudioUnitScope_Input\n");
        printError(err1);
        goto error;
    }

    err1 = AudioUnitSetProperty(fAUHAL, kAudioOutputUnitProperty_CurrentDevice, kAudioUnitScope_Global, 0, &fDeviceID, sizeof(AudioDeviceID));
    if (err1 != noErr) {
        printf("Error calling AudioUnitSetProperty - kAudioOutputUnitProperty_CurrentDevice\n");
        printError(err1);
        goto error;
    }

    err1 = AudioUnitSetProperty(fAUHAL, kAudioUnitProperty_MaximumFramesPerSlice, kAudioUnitScope_Global, 1, (UInt32*)&bufferSize, sizeof(UInt32));
    if (err1 != noErr) {
        printf("Error calling AudioUnitSetProperty - kAudioUnitProperty_MaximumFramesPerSlice\n");
        printError(err1);
        goto error;
    }

    err1 = AudioUnitSetProperty(fAUHAL, kAudioUnitProperty_MaximumFramesPerSlice, kAudioUnitScope_Global, 0, (UInt32*)&bufferSize, sizeof(UInt32));
    if (err1 != noErr) {
        printf("Error calling AudioUnitSetProperty - kAudioUnitProperty_MaximumFramesPerSlice\n");
        printError(err1);
        goto error;
    }

    err1 = AudioUnitGetPropertyInfo(fAUHAL, kAudioOutputUnitProperty_ChannelMap, kAudioUnitScope_Input, 1, &outSize, &isWritable);
    if (err1 != noErr) {
        printf("Error calling AudioUnitGetPropertyInfo - kAudioOutputUnitProperty_ChannelMap 1\n");
        printError(err1);
    }

    in_nChannels = (err1 == noErr) ? outSize / sizeof(SInt32) : 0;
    //printf("in_nChannels = %ld\n", in_nChannels);

    err1 = AudioUnitGetPropertyInfo(fAUHAL, kAudioOutputUnitProperty_ChannelMap, kAudioUnitScope_Output, 0, &outSize, &isWritable);
    if (err1 != noErr) {
        printf("Error calling AudioUnitGetPropertyInfo - kAudioOutputUnitProperty_ChannelMap 0\n");
        printError(err1);
    }

    out_nChannels = (err1 == noErr) ? outSize / sizeof(SInt32) : 0;
    //printf("out_nChannels = %ld\n", out_nChannels);

    /*
    Just ignore this case : seems to work without any further change...

    if (outChan > out_nChannels) {
        printf("This device hasn't required output channels\n");
        goto error;
    }
    if (inChan > in_nChannels) {
        printf("This device hasn't required input channels\n");
        goto error;
    }
    */

    if (outChan < out_nChannels) {
        SInt32 chanArr[out_nChannels];
        for (int i = 0;	i < out_nChannels; i++) {
            chanArr[i] = -1;
        }
        for (int i = 0; i < outChan; i++) {
            chanArr[i] = i;
        }
        err1 = AudioUnitSetProperty(fAUHAL, kAudioOutputUnitProperty_ChannelMap, kAudioUnitScope_Output, 0, chanArr, sizeof(SInt32) * out_nChannels);
        if (err1 != noErr) {
            printf("Error calling AudioUnitSetProperty - kAudioOutputUnitProperty_ChannelMap 0\n");
            printError(err1);
        }
    }

    if (inChan < in_nChannels) {
        SInt32 chanArr[in_nChannels];
        for (int i = 0; i < in_nChannels; i++) {
            chanArr[i] = -1;
        }
        for (int i = 0; i < inChan; i++) {
            chanArr[i] = i;
        }
        AudioUnitSetProperty(fAUHAL, kAudioOutputUnitProperty_ChannelMap , kAudioUnitScope_Input, 1, chanArr, sizeof(SInt32) * in_nChannels);
        if (err1 != noErr) {
            printf("Error calling AudioUnitSetProperty - kAudioOutputUnitProperty_ChannelMap 1\n");
            printError(err1);
        }
    }

    if (inChan > 0) {
        outSize = sizeof(AudioStreamBasicDescription);
        err1 = AudioUnitGetProperty(fAUHAL, kAudioUnitProperty_StreamFormat, kAudioUnitScope_Output, 1, &srcFormat, &outSize);
        if (err1 != noErr) {
            printf("Error calling AudioUnitGetProperty - kAudioUnitProperty_StreamFormat kAudioUnitScope_Output\n");
            printError(err1);
        }
        //PrintStreamDesc(&srcFormat);

        srcFormat.mSampleRate = samplerate;
        srcFormat.mFormatID = kAudioFormatLinearPCM;
        srcFormat.mFormatFlags = kAudioFormatFlagsNativeFloatPacked | kLinearPCMFormatFlagIsNonInterleaved;
        srcFormat.mBytesPerPacket = sizeof(float);
        srcFormat.mFramesPerPacket = 1;
        srcFormat.mBytesPerFrame = sizeof(float);
        srcFormat.mChannelsPerFrame = inChan;
        srcFormat.mBitsPerChannel = 32;

        //PrintStreamDesc(&srcFormat);

        err1 = AudioUnitSetProperty(fAUHAL, kAudioUnitProperty_StreamFormat, kAudioUnitScope_Output, 1, &srcFormat, sizeof(AudioStreamBasicDescription));
        if (err1 != noErr) {
            printf("Error calling AudioUnitSetProperty - kAudioUnitProperty_StreamFormat kAudioUnitScope_Output\n");
            printError(err1);
        }
    }

    if (outChan > 0) {
        outSize = sizeof(AudioStreamBasicDescription);
        err1 = AudioUnitGetProperty(fAUHAL, kAudioUnitProperty_StreamFormat, kAudioUnitScope_Input, 0, &dstFormat, &outSize);
        if (err1 != noErr) {
            printf("Error calling AudioUnitGetProperty - kAudioUnitProperty_StreamFormat kAudioUnitScope_Output\n");
            printError(err1);
        }
        //PrintStreamDesc(&dstFormat);

        dstFormat.mSampleRate = samplerate;
        dstFormat.mFormatID = kAudioFormatLinearPCM;
        dstFormat.mFormatFlags = kAudioFormatFlagsNativeFloatPacked | kLinearPCMFormatFlagIsNonInterleaved;
        dstFormat.mBytesPerPacket = sizeof(float);
        dstFormat.mFramesPerPacket = 1;
        dstFormat.mBytesPerFrame = sizeof(float);
        dstFormat.mChannelsPerFrame = outChan;
        dstFormat.mBitsPerChannel = 32;

        //PrintStreamDesc(&dstFormat);

        err1 = AudioUnitSetProperty(fAUHAL, kAudioUnitProperty_StreamFormat, kAudioUnitScope_Input, 0, &dstFormat, sizeof(AudioStreamBasicDescription));
        if (err1 != noErr) {
            printf("Error calling AudioUnitSetProperty - kAudioUnitProperty_StreamFormat kAudioUnitScope_Output\n");
            printError(err1);
        }
    }

    if (inChan > 0 && outChan == 0) {
        AURenderCallbackStruct output;
        output.inputProc = Render;
        output.inputProcRefCon = this;
        err1 = AudioUnitSetProperty(fAUHAL, kAudioOutputUnitProperty_SetInputCallback, kAudioUnitScope_Global, 0, &output, sizeof(output));
        if (err1 != noErr) {
            printf("Error calling AudioUnitSetProperty - kAudioUnitProperty_SetRenderCallback 1\n");
            printError(err1);
            goto error;
        }
    } else {
        AURenderCallbackStruct output;
        output.inputProc = Render;
        output.inputProcRefCon = this;
        err1 = AudioUnitSetProperty(fAUHAL, kAudioUnitProperty_SetRenderCallback, kAudioUnitScope_Input, 0, &output, sizeof(output));
        if (err1 != noErr) {
            printf("Error calling AudioUnitSetProperty - kAudioUnitProperty_SetRenderCallback 0\n");
            printError(err1);
            goto error;
        }
    }

    fInputData = (AudioBufferList*)malloc(sizeof(UInt32) + inChan * sizeof(AudioBuffer));
    if (fInputData == 0) {
		printf("Cannot allocate memory for input buffers\n");
        goto error;
	}
    fInputData->mNumberBuffers = inChan;

    // Prepare buffers
    for (int i = 0; i < inChan; i++) {
        fInputData->mBuffers[i].mNumberChannels = 1;
        fInputData->mBuffers[i].mData = malloc(bufferSize * sizeof(float));
        fInputData->mBuffers[i].mDataByteSize = bufferSize * sizeof(float);
    }

    return NO_ERR;

error:
    AudioUnitUninitialize(fAUHAL);
    CloseComponent(fAUHAL);
    return OPEN_ERR;
}

int TCoreAudioRenderer::Close()
{
    if (!fAUHAL) {
        return CLOSE_ERR;
    }
    
    for (int i = 0; i < fDevNumInChans; i++) {
        free(fInputData->mBuffers[i].mData);
    }
	free(fInputData);
	AudioUnitUninitialize(fAUHAL);
    CloseComponent(fAUHAL);
    DestroyAggregateDevice();
    
    delete[] fInChannel;
    delete[] fOutChannel;
    return NO_ERR;
}

int TCoreAudioRenderer::Start()
{
    if (!fAUHAL) {
        return OPEN_ERR;
    }
    
	OSStatus err = AudioOutputUnitStart(fAUHAL);

    if (err != noErr) {
        printf("Error while opening device : device open error \n");
        return OPEN_ERR;
    } else {
        return NO_ERR;
	}
}

int TCoreAudioRenderer::Stop()
{
    if (!fAUHAL) {
        return OPEN_ERR;
    }
    
    OSStatus err = AudioOutputUnitStop(fAUHAL);

    if (err != noErr) {
        printf("Error while closing device : device close error \n");
        return OPEN_ERR;
    } else {
        return NO_ERR;
	}
}

/******************************************************************************
*******************************************************************************

							CORE AUDIO INTERFACE

*******************************************************************************
*******************************************************************************/
class coreaudio : public audio {

    TCoreAudioRenderer fAudioDevice;
	int fSampleRate, fFramesPerBuf;

 public:
    coreaudio(int srate, int fpb) : fSampleRate(srate), fFramesPerBuf(fpb) {}
	virtual ~coreaudio() {}

	virtual bool init(const char* /*name*/, dsp* DSP) {
		DSP->init(fSampleRate);
		if (fAudioDevice.OpenDefault(DSP, DSP->getNumInputs(), DSP->getNumOutputs(), fFramesPerBuf, fSampleRate) < 0) {
			printf("Cannot open CoreAudio device\n");
			return false;
		}
        return true;
    }

	virtual bool start() 
    {
		if (fAudioDevice.Start() < 0) {
			printf("Cannot start CoreAudio device\n");
			return false;
		}
		return true;
	}

	virtual void stop() 
    {
		fAudioDevice.Stop();
		fAudioDevice.Close();
	}

};

#endif

/********************END ARCHITECTURE SECTION (part 2/2)****************/



#ifdef OSCCTRL
/*
   Copyright (C) 2011 Grame - Lyon
   All rights reserved.
   Redistribution and use in source and binary forms, with or without
   modification, are permitted.
*/

/*

  Faust Project

  Copyright (C) 2011 Grame

  This library is free software; you can redistribute it and/or
  modify it under the terms of the GNU Lesser General Public
  License as published by the Free Software Foundation; either
  version 2.1 of the License, or (at your option) any later version.

  This library is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
  Lesser General Public License for more details.

  You should have received a copy of the GNU Lesser General Public
  License along with this library; if not, write to the Free Software
  Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301  USA

  Grame Research Laboratory, 9 rue du Garet, 69001 Lyon - France
  research@grame.fr

*/

#ifndef __OSCControler__
#define __OSCControler__

#include <string>

namespace oscfaust
{

class OSCIO;
class OSCSetup;
class FaustFactory;

//--------------------------------------------------------------------------
/*!
	\brief the main Faust OSC Lib API
	
	The OSCControler is essentially a glue between the memory representation (in charge of the FaustFactory), 
	and the network services (in charge of OSCSetup).
*/
class OSCControler
{
	int fUDPPort, fUDPOut, fUPDErr;		// the udp ports numbers
	std::string		fDestAddress;		// the osc messages destination address
	FaustFactory *	fFactory;			// a factory to build the memory represetnatin
	OSCSetup*		fOsc;				// the network manager (handles the udp sockets)
	OSCIO*			fIO;				// hack for OSC IO support (actually only relayed to the factory)

	public:
		/*
			base udp port is chosen in an unassigned range from IANA PORT NUMBERS (last updated 2011-01-24)
			see at http://www.iana.org/assignments/port-numbers
			5507-5552  Unassigned
		*/
		enum { kUDPBasePort = 5510};

				 OSCControler (int argc, char *argv[], OSCIO* io=0);
		virtual ~OSCControler ();
	
		//--------------------------------------------------------------------------
		// addnode, opengroup and closegroup are simply relayed to the factory
		//--------------------------------------------------------------------------
		// Add a node in the current group (top of the group stack)
		template <typename C> void addnode (const char* label, C* zone, C init, C min, C max);
		
		//--------------------------------------------------------------------------
		// Add a node using its fullpath from the root instead of the current group
		// This method is used for alias messages. The arguments imin and imax allow
		// to map incomming values from the alias input range to the actual range 
		template <typename C> void addfullpathnode (const std::string& fullpath, C* zone, C imin, C imax, C init, C min, C max);
        	
		void opengroup (const char* label);
		void closegroup ();

		//--------------------------------------------------------------------------
		void run ();				// starts the network services
		void quit ();				// stop the network services
		
		int	getUDPPort()			{ return fUDPPort; }
		int	getUDPOut()				{ return fUDPOut; }
		int	getUDPErr()				{ return fUPDErr; }
		const char*	getDesAddress() { return fDestAddress.c_str(); }
		const char*	getRootName();	// probably useless, introduced for UI extension experiments

		static float version();				// the Faust OSC library version number
		static const char* versionstr();	// the Faust OSC library version number as a string
};

}

#endif
#include <vector>

/******************************************************************************
*******************************************************************************

					OSC (Open Sound Control) USER INTERFACE

*******************************************************************************
*******************************************************************************/
/*

Note about the OSC addresses and the Faust UI names:
----------------------------------------------------
There are potential conflicts between the Faust UI objects naming scheme and 
the OSC address space. An OSC symbolic names is an ASCII string consisting of
printable characters other than the following:
	space 
#	number sign
*	asterisk
,	comma
/	forward
?	question mark
[	open bracket
]	close bracket
{	open curly brace
}	close curly brace

a simple solution to address the problem consists in replacing 
space or tabulation with '_' (underscore)
all the other osc excluded characters with '-' (hyphen)

This solution is implemented in the proposed OSC UI;
*/

using namespace std;

//class oscfaust::OSCIO;
class OSCUI : public GUI 
{
	oscfaust::OSCControler*	fCtrl;
	vector<const char*>		fAlias;
	
	const char* tr(const char* label) const;
	
	// add all accumulated alias
	void addalias(FAUSTFLOAT* zone, FAUSTFLOAT init, FAUSTFLOAT min, FAUSTFLOAT max) 
	{
		for (unsigned int i=0; i<fAlias.size(); i++) {
			fCtrl->addfullpathnode(fAlias[i], zone, (FAUSTFLOAT)0, (FAUSTFLOAT)1, init, min, max);
		}
		fAlias.clear();
	}
	
 public:
		
	OSCUI(char* /*applicationname*/, int argc, char *argv[], oscfaust::OSCIO* io=0) : GUI() 
    { 
		fCtrl = new oscfaust::OSCControler(argc, argv, io); 
//		fCtrl->opengroup(applicationname);
	}
	
	virtual ~OSCUI() { delete fCtrl; }
    
    // -- widget's layouts
    
  	virtual void openTabBox(const char* label) 			{ fCtrl->opengroup( tr(label)); }
	virtual void openHorizontalBox(const char* label) 	{ fCtrl->opengroup( tr(label)); }
	virtual void openVerticalBox(const char* label) 	{ fCtrl->opengroup( tr(label)); }
	virtual void closeBox() 							{ fCtrl->closegroup(); }

	
	// -- active widgets
	virtual void addButton(const char* label, FAUSTFLOAT* zone) 		{ addalias(zone, 0, 0, 1); fCtrl->addnode( tr(label), zone, (FAUSTFLOAT)0, (FAUSTFLOAT)0, (FAUSTFLOAT)1); }
	virtual void addCheckButton(const char* label, FAUSTFLOAT* zone) 	{ addalias(zone, 0, 0, 1); fCtrl->addnode( tr(label), zone, (FAUSTFLOAT)0, (FAUSTFLOAT)0, (FAUSTFLOAT)1); }
	virtual void addVerticalSlider(const char* label, FAUSTFLOAT* zone, FAUSTFLOAT init, FAUSTFLOAT min, FAUSTFLOAT max, FAUSTFLOAT /*step*/) 	{ addalias(zone, init, min, max); fCtrl->addnode( tr(label), zone, init, min, max); }
	virtual void addHorizontalSlider(const char* label, FAUSTFLOAT* zone, FAUSTFLOAT init, FAUSTFLOAT min, FAUSTFLOAT max, FAUSTFLOAT /*step*/) { addalias(zone, init, min, max); fCtrl->addnode( tr(label), zone, init, min, max); }
	virtual void addNumEntry(const char* label, FAUSTFLOAT* zone, FAUSTFLOAT init, FAUSTFLOAT min, FAUSTFLOAT max, FAUSTFLOAT /*step*/) 		{ addalias(zone, init, min, max); fCtrl->addnode( tr(label), zone, init, min, max); }
	
	// -- passive widgets
	
	virtual void addHorizontalBargraph(const char* /*label*/, FAUSTFLOAT* /*zone*/, FAUSTFLOAT /*min*/, FAUSTFLOAT /*max*/) {}
	virtual void addVerticalBargraph(const char* /*label*/, FAUSTFLOAT* /*zone*/, FAUSTFLOAT /*min*/, FAUSTFLOAT /*max*/) {}
		
	// -- metadata declarations
    
	virtual void declare(FAUSTFLOAT* , const char* key , const char* alias) 
	{ 
		if (strcasecmp(key,"OSC")==0) fAlias.push_back(alias);
	}

	virtual void show() {}

	void run()											{ fCtrl->run(); }
	const char* getRootName()							{ return fCtrl->getRootName(); }
};

const char* OSCUI::tr(const char* label) const
{
	static char buffer[1024];
	char * ptr = buffer; int n=1;
	while (*label && (n++ < 1024)) {
		switch (*label) {
			case ' ': case '	':
				*ptr++ = '_';
				break;
			case '#': case '*': case ',': case '/': case '?':
			case '[': case ']': case '{': case '}':
				*ptr++ = '_';
				break;
			default: 
				*ptr++ = *label;
		}
		label++;
	}
	*ptr = 0;
	return buffer;
}
#endif

#ifdef HTTPCTRL
/*
   Copyright (C) 2012 Grame - Lyon
   All rights reserved.
   Redistribution and use in source and binary forms, with or without
   modification, are permitted.
*/

#ifndef __httpdUI__
#define __httpdUI__

/*

  Faust Project

  Copyright (C) 2012 Grame

  This library is free software; you can redistribute it and/or
  modify it under the terms of the GNU Lesser General Public
  License as published by the Free Software Foundation; either
  version 2.1 of the License, or (at your option) any later version.

  This library is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
  Lesser General Public License for more details.

  You should have received a copy of the GNU Lesser General Public
  License along with this library; if not, write to the Free Software
  Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301  USA

  Grame Research Laboratory, 9 rue du Garet, 69001 Lyon - France
  research@grame.fr

*/

#ifndef __HTTPDControler__
#define __HTTPDControler__

#include <string>
#include <map>

namespace httpdfaust
{

class HTTPDSetup;
class JSONDesc;
class FaustFactory;
class jsonfactory;
class htmlfactory;

//--------------------------------------------------------------------------
/*!
	\brief the main Faust HTTPD Lib API
	
	The HTTPDControler is essentially a glue between the memory representation (in charge of the FaustFactory), 
	and the network services (in charge of HTTPDSetup).
*/
class HTTPDControler
{
	int fTCPPort;				// the tcp port number
	FaustFactory *	fFactory;	// a factory to build the memory representation
	jsonfactory*	fJson;
	htmlfactory*	fHtml;
	HTTPDSetup*		fHttpd;		// the network manager
	std::string		fHTML;		// the corresponding HTML page
	std::map<std::string, std::string>	fCurrentMeta;	// the current meta declarations 

	public:
		/*
			base udp port is chosen in an unassigned range from IANA PORT NUMBERS (last updated 2011-01-24)
			see at http://www.iana.org/assignments/port-numbers
			5507-5552  Unassigned
		*/
		enum { kTCPBasePort = 5510};

				 HTTPDControler (int argc, char *argv[], const char* applicationname);
		virtual ~HTTPDControler ();
	
		//--------------------------------------------------------------------------
		// addnode, opengroup and closegroup are simply relayed to the factory
		//--------------------------------------------------------------------------
		template <typename C> void addnode (const char* type, const char* label, C* zone);
		template <typename C> void addnode (const char* type, const char* label, C* zone, C min, C max);
		template <typename C> void addnode (const char* type, const char* label, C* zone, C init, C min, C max, C step);
							  void declare (const char* key, const char* val ) { fCurrentMeta[key] = val; }

		void opengroup (const char* type, const char* label);
		void closegroup ();

		//--------------------------------------------------------------------------
		void run ();				// start the httpd server
		void quit ();				// stop the httpd server
		
		int	getTCPPort()			{ return fTCPPort; }

		static float version();				// the Faust httpd library version number
		static const char* versionstr();	// the Faust httpd library version number as a string
};

}

#endif

/******************************************************************************
*******************************************************************************

					HTTPD USER INTERFACE

*******************************************************************************
*******************************************************************************/
/*

Note about URLs and the Faust UI names:
----------------------------------------------------
Characters in a url could be:
1. Reserved: ; / ? : @ & = + $ ,
   These characters delimit URL parts.
2. Unreserved: alphanum - _ . ! ~ * ' ( )
   These characters have no special meaning and can be used as is.
3. Excluded: control characters, space, < > # % ", { } | \ ^ [ ] `

To solve potential conflicts between the Faust UI objects naming scheme and
the URL allowed characters, the reserved and excluded characters are replaced
with '-' (hyphen).
Space or tabulation are replaced with '_' (underscore)
*/

using namespace std;

class httpdUI : public UI 
{
	httpdfaust::HTTPDControler*	fCtrl;	
	const char* tr(const char* label) const;

 public:
		
	httpdUI(const char* applicationname, int argc, char *argv[]) 
    { 
		fCtrl = new httpdfaust::HTTPDControler(argc, argv, applicationname); 
	}
	
	virtual ~httpdUI() { delete fCtrl; }
		
    // -- widget's layouts
	virtual void openTabBox(const char* label) 			{ fCtrl->opengroup( "tgroup", tr(label)); }
	virtual void openHorizontalBox(const char* label) 	{ fCtrl->opengroup( "hgroup", tr(label)); }
	virtual void openVerticalBox(const char* label) 	{ fCtrl->opengroup( "vgroup", tr(label)); }
	virtual void closeBox() 							{ fCtrl->closegroup(); }
	
	// -- active widgets
	virtual void addButton(const char* label, FAUSTFLOAT* zone)			{ fCtrl->addnode( "button", tr(label), zone); }
	virtual void addCheckButton(const char* label, FAUSTFLOAT* zone)	{ fCtrl->addnode( "checkbox", tr(label), zone); }
	virtual void addVerticalSlider(const char* label, FAUSTFLOAT* zone, FAUSTFLOAT init, FAUSTFLOAT min, FAUSTFLOAT max, FAUSTFLOAT step)
									{ fCtrl->addnode( "vslider", tr(label), zone, init, min, max, step); }
	virtual void addHorizontalSlider(const char* label, FAUSTFLOAT* zone, FAUSTFLOAT init, FAUSTFLOAT min, FAUSTFLOAT max, FAUSTFLOAT step) 	
									{ fCtrl->addnode( "hslider", tr(label), zone, init, min, max, step); }
	virtual void addNumEntry(const char* label, FAUSTFLOAT* zone, FAUSTFLOAT init, FAUSTFLOAT min, FAUSTFLOAT max, FAUSTFLOAT step) 			
									{ fCtrl->addnode( "nentry", tr(label), zone, init, min, max, step); }
	
	// -- passive widgets	
	virtual void addHorizontalBargraph(const char* label, FAUSTFLOAT* zone, FAUSTFLOAT min, FAUSTFLOAT max) 
									{ fCtrl->addnode( "hbargraph", tr(label), zone, min, max); }
	virtual void addVerticalBargraph(const char* label, FAUSTFLOAT* zone, FAUSTFLOAT min, FAUSTFLOAT max)
									{ fCtrl->addnode( "vbargraph", tr(label), zone, min, max); }
	
    virtual void declare (FAUSTFLOAT* , const char* key, const char* val ) { fCtrl->declare(key, val); }

	void run()						{ fCtrl->run(); }
};

					
const char* httpdUI::tr(const char* label) const
{
	static char buffer[1024];
	char * ptr = buffer; int n=1;
	while (*label && (n++ < 1024)) {
		switch (*label) {
			case ' ': case '	':
				*ptr++ = '_';
				break;
			case ';': case '/': case '?': case ':': case '@': 
			case '&': case '=': case '+': case '$': case ',':
			case '<': case '>': case '#': case '%': case '"': 
			case '{': case '}': case '|': case '\\': case '^': 
			case '[': case ']': case '`':
				*ptr++ = '_';
				break;
			default: 
				*ptr++ = *label;
		}
		label++;
	}
	*ptr = 0;
	return buffer;
}

#endif
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


