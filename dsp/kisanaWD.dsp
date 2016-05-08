//-----------------------------------------------
// 		Kisana : 3-loops string instrument
//		(based on Karplus-Strong)
//
//-----------------------------------------------

declare name  	"Kisana";
declare author  "Yann Orlarey";

KEY = 60;	// basic midi key
NCY = 15; 	// note cycle length
CCY = 15;	// control cycle length
BPS = 360;	// general tempo (beat per sec)

import("effect.lib"); 

process = kisana;   

//-------------------------------kisana-------------------------------
// USAGE:  kisana : _,_;
// 		3-loops string instrument
//--------------------------------------------------------------------

kisana = hgroup("Loops", harpe(C,11,48), harpe(C,11,60), (harpe(C,11,72) : *(1.5), *(1.5))) 
	//<:	matrix : pan(0.1), pan(0.4), pan(0.6), pan(0.9) :>
	:> 
	freeverb :
	//flanger_demo :
	simplified_whawha :
	// NLFM, NLFM :
	//distortion :
	//_,_ <: component("tibetanFilterl.dsp"), _,_ :> _,_ :
	//_,_ <: matiere2, _,_ :> _,_ :
	//hgroup("disto", component("distortion1.dsp"),component("distortion1.dsp")):
	*(l),*(l)
	with {
		pan(p) = _ <: *(sqrt(1-p)), *(sqrt(p));
		matrix = _,+,+,_;
		l = hslider("[1]master",-20, -60, 0, 0.01) : db2linear;
		C = hslider("../[2]timbre",0, 0, 1, 0.01) : automat(BPS, CCY, 0.0);
		db2linear(x)	= pow(10, x/20.0);
	};
 

//----------------------------------Harpe-----------------------------
// USAGE:  harpe(C,10,60) : _,_;
//		C is the filter coefficient 0..1
// 		Build a N (10) strings harpe using a pentatonic scale 
//		based on midi key b (60)
//		Each string is triggered by a specific
//		position of the "hand"
//--------------------------------------------------------------------
harpe(C,N,b) = 	hand <: par(i, N, position(i+1)
							: string(C,Penta(b).degree2Hz(i), att, lvl)
							: pan((i+0.5)/N) )
				 	:> _,_
	with {
		att  = 4; 
		hand = vgroup("loop%b", vslider("[1]note", 0, 0, N, 1) : int : automat(BPS, NCY, 0.0));
		lvl  = vslider("v:loop/level", 0, 0, 6, 1) : int : automat(BPS, CCY, 0.0) : -(6) : db2linear; 
		pan(p) = _ <: *(sqrt(1-p)), *(sqrt(p));
		position(a,x) = abs(x - a) < 0.5;
		db2linear(x)	= pow(10, x/20.0);

	};


//----------------------------------Penta----------------------------
// Pentatonic scale with degree to midi and degree to Hz conversion
// USAGE: Penta(60).degree2midi(3) ==> 67 midikey
//        Penta(60).degree2Hz(4)   ==> 440 Hz
//--------------------------------------------------------------------

Penta(key) = environment {

	A4Hz = 440; 
	
	degree2midi(0) = key+0;
	degree2midi(1) = key+2;
	degree2midi(2) = key+4;
	degree2midi(3) = key+7;
	degree2midi(4) = key+9;
	degree2midi(d) = degree2midi(d-5)+12;
	
	degree2Hz(d) = A4Hz*semiton(degree2midi(d)-69) with { semiton(n) = 2.0^(n/12.0); };

};


//----------------------------------String----------------------------
// A karplus-strong string.
//
// USAGE: string(440Hz, 4s, 1.0, button("play"))
// or	  button("play") : string(440Hz, 4s, 1.0)
//--------------------------------------------------------------------

string(coef, freq, t60, level, trig) = noise*level
							: *(trig : trigger(freq2samples(freq)))
							: resonator(freq2samples(freq), att)
	with {
		resonator(d,a)	= (+ : @(d-1)) ~ (average : *(a));
		average(x)		= (x*(1+coef)+x'*(1-coef))/2;
		trigger(n) 		= upfront : + ~ decay(n) : >(0.0);
		upfront(x) 		= (x-x') > 0.0;
		decay(n,x)		= x - (x>0.0)/n;
		freq2samples(f) = 44100.0/f;
		att 			= pow(0.001,1.0/(freq*t60)); // attenuation coefficient
		random  		= +(12345)~*(1103515245);
		noise   		= random/2147483647.0;
	};


//------------------------- Simplified WhaWha ------------------------
// see effect.lib
// USAGE:  _,_ : simplified_whawha : _,_;
//--------------------------------------------------------------------

//simplified_whawha = par(i,2, crybaby_demo);

simplified_whawha = par(i,2, crybaby(wah)) with {
   wah = hslider("[1] WahWah",0.8,0,1,0.01) : automat(BPS, CCY, 0.0);
};
  

//------------------------- Stereo Distortion ------------------------
//
distortion 	= hgroup("distortion", 
	_,_ <: 	par(i, 2, cubicnl(drive,drivelevel) : *(wet) ) , 
			*(1-wet), *(1-wet) 
		:> _,_
	with {
		drivelevel  = 0; //hslider("level", 0.01, 0, 0.5, 0.01);
		drive		= hslider("drive", 0.64, 0, 1, 0.01);
		wet  		= hslider("dry-wet", 0, 0, 1, 0.01);
	}); 


//------------------------- Matière ---------------------------
// Fabrication de matière. D : delay, C : controle (0--1--2)
// 0--1 fermeture de la boucle
// 1--2 joue la boucle
//-------------------------------------------------------------------

matiere(D,C) = *(1-w) : + ~ (@(D):*(w)) : *(l)
	with {
		w = min(1,C);
		l = max(0,C-1);
	};
	
matiere2 = matiere(D,C), matiere(D,C) 
	with {
		D = hslider("loop_size", 0, 0, 2, 0.01) * 44100;
		C = hslider("loop-replay", 0, 0, 2, 0.01);
	};

//======================================================
//
//                      Freeverb
//        
//
//======================================================

// Constant Parameters
//--------------------

fixedgain   = 0.015; //value of the gain of fxctrl
scalewet    = 3.0;
scaledry    = 2.0;
scaledamp   = 0.4;
scaleroom   = 0.28;
offsetroom  = 0.7;
initialroom = 0.5;
initialdamp = 0.5;
initialwet  = 1.0/scalewet;
initialdry  = 0;
initialwidth= 1.0;
initialmode = 0.0;
freezemode  = 0.5;
stereospread= 23;
allpassfeed = 0.5; //feedback of the delays used in allpass filters


// Filter Parameters
//------------------

combtuningL(0)    = 1116;
combtuningL(1)    = 1188;
combtuningL(2)    = 1277;
combtuningL(3)    = 1356;
combtuningL(4)    = 1422;
combtuningL(5)    = 1491;
combtuningL(6)    = 1557;
combtuningL(7)    = 1617;

allpasstuningL(0) = 556;
allpasstuningL(1) = 441;
allpasstuningL(2) = 341;
allpasstuningL(3) = 225;


// Control Sliders
//--------------------
// Damp : filters the high frequencies of the echoes (especially active for great values of RoomSize)
// RoomSize : size of the reverberation room
// Dry : original signal
// Wet : reverberated signal

dampSlider      = 0.75*scaledamp; //hslider("Damp",0.5, 0, 1, 0.025)*scaledamp;
roomsizeSlider  = 0.8*scaleroom + offsetroom; //hslider("RoomSize", 0.5, 0, 1, 0.025)*scaleroom + offsetroom;
wetSlider       = hslider("Reverb", 0.3333, 0, 1, 0.025);
combfeed        = roomsizeSlider;


// Comb and Allpass filters
//-------------------------

allpass(dt,fb) = (_,_ <: (*(fb),_:+:@(dt)), -) ~ _ : (!,_);

comb(dt, fb, damp) = (+:@(dt)) ~ (*(1-damp) : (+ ~ *(damp)) : *(fb));


// Reverb components
//------------------

monoReverb(fb1, fb2, damp, spread)
    = _ <: par(i, 8, comb(combtuningL(i) + spread, fb1, damp))
        :> seq(i, 4, allpass (allpasstuningL(i) + spread, fb2));

stereoReverb(fb1, fb2, damp, spread)
    = + <:  monoReverb(fb1, fb2, damp, 0), monoReverb(fb1, fb2, damp, spread);


// fxctrl : add an input gain and a wet-dry control to a stereo FX
//----------------------------------------------------------------

fxctrl(g,w,Fx) =  _,_ <: (*(g),*(g) : Fx : *(w),*(w)), *(1-w), *(1-w) :> _,_;


// Freeverb
//---------

freeverb = fxctrl(fixedgain, wetSlider, stereoReverb(combfeed, allpassfeed, dampSlider, stereospread));
