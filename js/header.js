/*
faust2webaduio

Primarily written by Myles Borins
During the Spring 2013 offering of Music 420b with Julius Smith
A bit during the Summer of 2013 with the help of Joshua Kit Clayton
And finally a sprint during the late fall of 2013 to get everything working
A Special thanks to Yann Orlarey and Stéphane Letz

faust2webaudio is distributed under the terms the MIT or GPL2 Licenses.
Choose the license that best suits your project. The text of the MIT and GPL
licenses are at the root directory.

*/

/*global webkitAudioContext, Module, HEAPF32, HEAP32, Pointer_stringify, ALLOC_STACK, intArrayFromString, allocate*/

var faust = faust || {};

if (window.AudioContext === undefined) {
  window.AudioContext = window.webkitAudioContext;
}

(function () {

