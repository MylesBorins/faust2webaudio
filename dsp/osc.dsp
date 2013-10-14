declare name 		"osc";
declare version 	"1.0";
declare author 		"Grame";
declare license 	"BSD";
declare copyright 	"(c)GRAME 2009";

//-----------------------------------------------
// 			Sinusoidal Oscillator
//-----------------------------------------------

import("music.lib");

db2linear1(x)	= pow(10.0, x/20.0);

smooth(c)		= *(1-c) : +~*(c);
vol 			= 0.9 ;
freq 			= 440;


process 		= vgroup("Oscillator", osc(freq) * vol);

