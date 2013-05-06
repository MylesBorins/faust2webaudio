



function noise() {
	
	this.iRec0 = new Int32Array(2);
	this.fvslider0;
	this.fSamplingFreq;
	
	this.metadata = function(m) { 
		m.declare("name", "Noise");
		m.declare("version", "1.1");
		m.declare("author", "Grame");
		m.declare("license", "BSD");
		m.declare("copyright", "(c)GRAME 2009");
	}

	this.getNumInputs = function() {
		return 0;
		
	}
	this.getNumOutputs = function() {
		return 1;
		
	}
	this.getInputRate = function(channel) {
		var rate;
		switch (channel) {
			default: {
				rate = -1;
				break;
			}
			
		}
		return rate;
		
	}
	this.getOutputRate = function(channel) {
		var rate;
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
	
	this.classInit = function(samplingFreq) {
	}
	
	this.instanceInit = function(samplingFreq) {
		this.fSamplingFreq = samplingFreq;
		this.fvslider0 = 0;
		for (var i = 0; (i < 2); i = (i + 1)) {
			this.iRec0[i] = 0;
			
		}
		
	}
	
	this.init = function(samplingFreq) {
		this.classInit(samplingFreq);
		this.instanceInit(samplingFreq);
	}
	
	this.buildUserInterface = function(ui_interface) {
		ui_interface.openVerticalBox("noise");
		ui_interface.declare("fvslider0", "style", "knob");
		ui_interface.addVerticalSlider("Volume", function handler(obj) { function setval(val) { obj.fvslider0 = val; } return setval; }(this), 0, 0, 1, 0.1);
		ui_interface.closeBox();
		
	}
	
	this.compute = function(count, inputs, outputs) {
		var output0 = outputs[0];
		var fSlow0 = (4.65661e-10 * this.fvslider0);
		for (var i = 0; (i < count); i = (i + 1)) {
			this.iRec0[0] = (12345 + (1103515245 * this.iRec0[1]));
			output0[i] = (fSlow0 * this.iRec0[0]);
			this.iRec0[1] = this.iRec0[0];
			
		}
		
	}
	
}


<!-- WebAudio API -->

process_noise = function(obj) 
{
    function process_aux_noise(event) 
    {
        var count;
        
        /*
        if (event.inputBuffer.numberOfChannels < dsp.getNumInputs()) {
            console.log("Incorrect number of input %d instead of %d", event.inputBuffer.numberOfChannels, dsp.getNumInputs());
            return;
        }
        */
        
        if (event.outputBuffer.numberOfChannels < obj.dsp.getNumOutputs()) {
            console.log("Incorrect number of output %d instead of %d", event.outputBuffer.numberOfChannels, obj.dsp.getNumOutputs());
            return;
        }
         
        for (var i = 0; i < obj.dsp.getNumInputs(); i++) {
            obj.inputs[i] = event.inputBuffer.getChannelData(i);
            if (obj.inputs[i] != null) {
                count = obj.inputs[i].length;
            }
        }
        
        for (var i = 0; i < obj.dsp.getNumOutputs(); i++) {
            obj.outputs[i] = event.outputBuffer.getChannelData(i);
            if (obj.outputs[i] != null) {
                count = obj.outputs[i].length;
            }
        }
        
        obj.dsp.compute(count, obj.inputs, obj.outputs);

    }
    return process_aux_noise;
}

function create_noise(audio_context, user_interface, meta_interface, buffer_size)
{
    this.dsp = new noise();
    
    this.dsp.init(audio_context.sampleRate);
    this.dsp.buildUserInterface(user_interface);
    this.dsp.metadata(meta_interface);
    
    this.inputs = new Array(this.dsp.getNumInputs());
    this.outputs = new Array(this.dsp.getNumOutputs());
    
    console.log(audio_context.sampleRate);
    console.log(this.dsp.getNumInputs());
    console.log(this.dsp.getNumOutputs());
    
    this.processor = audio_context.createJavaScriptNode(buffer_size, this.dsp.getNumInputs(), this.dsp.getNumOutputs());
    this.processor.onaudioprocess = process_noise(this);
    
    return this.processor;
}


