// set serviceType to:
// 0 - javascript on same server as webservices 
// 1 - javascript served from a seperate server accessed internally
// 2 - javascript served from a seperate server accessed anywhere
// 
var serviceType = 2;

var webService = [ "http://127.0.0.1/testservice/",
                   "http://t81-omixed.internal.sanger.ac.uk:6666", // public ro snapshot
                   "http://t81-omixed.internal.sanger.ac.uk:6668", // bigtest2
                   "http://www.genedb.org/testservice",
                   "http://127.0.0.1:6666"]; 
var dataType = [ "json", "jsonp", "jsonp", "jsonp", "jsonp" ];

//
// web-artemis/index.html?src=Pf3D7_04&base=200000&width=8000&height=10

var debug = true;
var margin = 5;
var displayWidth = 1000;

var screenInterval = 100;
var baseInterval;
var featureSelected = -1;

var showStopCodons = true;
var lockSeqs = true;
var showGC = false;
var showAG = false;
var showOther = false;
var compare = false;

var features;
var count = 0;
var featureDisplayObjs = new Array();

var colour = [ 
    '255,255,255',
    '100,100,100',
    '255,0,0',
    '0,255,0',
    '0,0,255',
    '0,255,255',
    '255,0,255',
    '245,245,0',
    '152,251,152',
    '135,206,250',
    '255,165,0',
    '200,150,100',
    '255,200,200',
    '170,170,170',
    '0,0,0',
    '255,63,63',
    '255,127,127',
    '255,191,191'
];

$(document).ready(function() {

	var arr = getUrlVars();
	var leftBase = arr["base"];
	
	if(!leftBase) {
		leftBase = 1;
	}
	else {
		leftBase = parseInt(leftBase);
	}

	var basesDisplayWidth = arr["width"];
	if(!basesDisplayWidth) {
		basesDisplayWidth = 8000;
	}
	else {
		basesDisplayWidth = parseInt(basesDisplayWidth);
	}
	
	var hgt = arr["height"];
	
	var title = '';
	var ypos = 40;
	var lastObj;
	var compCount = 0;
	for(var i in arr) {
		var value = arr[i];
		if(i.indexOf("src") > -1) {
			title+=value+' ';

			if(!hgt) {
				hgt = 10;
			}
			else {
				hgt = parseInt(hgt);
			}
				
			var obj = new featureDisplayObj(basesDisplayWidth, ypos, 16000, value, hgt, leftBase);
			featureDisplayObjs[count - 1] = obj;
			ypos+=250;
			
			if(count > 1) {
				compare = true;
				new comparisonObj(lastObj, obj, compCount);
				compCount++;
			}
			lastObj = obj;
		}
	}

	if(count == 0) {
		if(!hgt) {
			hgt = 12
		}
		else {
			hgt = parseInt(hgt);
		}
		title = 'Pf3D7_01';
		new featureDisplayObj(basesDisplayWidth, 40, 16000, title, hgt, leftBase);
	}
	
	$('ul.sf-menu').superfish();
	$(this).attr("title", title);
});

function featureDisplayObj(basesDisplayWidth, marginTop, sequenceLength, 
		                   srcFeature, frameLineHeight, leftBase) {
	count++;
	this.index = count;
	this.firstTime = true;
	this.basesDisplayWidth = basesDisplayWidth;
	this.marginTop = marginTop;
	this.sequenceLength = sequenceLength;
	this.srcFeature = srcFeature;
	this.frameLineHeight = frameLineHeight;
	this.leftBase = leftBase;
	this.sequence;
	this.minimumDisplay = false;
	
	$('#featureDisplays').append('<div id="featureDisplay'+this.index+'" name="fDisplays" class="canvas"></div>');
	$('#stop_codons').append('<div id="stop_codons'+this.index+'"></div>');
	$("#slider_vertical_container").append('<div id="slider_vertical_container'+this.index+'"></div>');
	$("#slider_container").append('<div id="slider'+this.index+'"></div>');
	$('#features').append('<div id="features'+this.index+'"></div>');
	$('#ticks').append('<div id="ticks'+this.index+'"></div>');
	$('#buttons').append('<div id="left'+this.index+'" class="ui-state-default ui-corner-all" title=".ui-icon-circle-triangle-e"><span class="ui-icon ui-icon-circle-triangle-w"></span></div>');
	$('#buttons').append('<div id="right'+this.index+'" class="ui-state-default ui-corner-all" title=".ui-icon-circle-triangle-e"><span class="ui-icon ui-icon-circle-triangle-e"></span></div>');
	$('#rightDraggableEdge').append('<div id="rightDraggableEdge'+this.index+'" class="ui-resizable-se"></div>');

	var self = this;
	adjustFeatureDisplayPosition(false, self);
	
	$("#slider_vertical_container"+this.index).slider({
		orientation: "vertical",
		min: 0,
		max: self.sequenceLength-140,
		value: self.sequenceLength-self.basesDisplayWidth,
		step: 100,
		change: function(event, ui) {
		  var basesInView = self.sequenceLength-ui.value;
		
		  if(basesInView > 50000) {
			  showStopCodons = false;
		  } else if(basesInView < 1000) {
			  showStopCodons = true;
		  }
		  	
		  self.basesDisplayWidth = self.sequenceLength-ui.value;
		  drawAll(self);
		  $('#slider'+this.index).slider('option', 'step', self.basesDisplayWidth/2);
		}
	});

	this.lastLeftBase = leftBase;
	$('#slider'+this.index).slider( {
		animate: true,
		min : 1,
		max : self.sequenceLength,
		step : self.basesDisplayWidth/2,
		start: function(event, ui) {  
			lastLeftBase = ui.value;
	    },
		change : function(ev, ui) {
			self.leftBase = ui.value;
			drawAndScroll(self, lastLeftBase);
		}
	});
	
	//
	$('#rightDraggableEdge'+this.index).draggable({
		stop: function(event, ui) {
			var xpos = parseInt(
					$('#rightDraggableEdge'+self.index).css('margin-left').replace("px", ""));
			
			self.frameLineHeight = (ui.offset.top-self.marginTop+8)/17;
			displayWidth = (xpos-margin)+ui.offset.left;
			
			// adjust feature display canvas
			var cssObj = {
					 'height': self.frameLineHeight*17+'px',
					 'width': displayWidth+'px'
			};
			$('#featureDisplay'+self.index).css(cssObj);
			
			drawAll(self);
			adjustFeatureDisplayPosition(true, self);
			drawFrameAndStrand(self);
		}
	});
	
	drawFrameAndStrand(self);
	drawAll(self);
	getOrganismList(self);
	addEventHandlers(self);
}

function drawAndScroll(featureDisplay, lastLeftBase) {
	drawAll(featureDisplay);

	if(lockSeqs) {
	  var diff = featureDisplay.leftBase - lastLeftBase;
	  for(var i=1; i<count+1; i++) {
		if(i != featureDisplay.index) {
			var pos = $('#slider'+i).slider('value')+diff
			if(pos > featureDisplayObjs[i-1].sequenceLength) {
				pos = featureDisplayObjs[i-1].sequenceLength - featureDisplayObjs[i-1].basesDisplayWidth;
			} else if(pos < 1) {
				pos = 1;
			}
			
			$('#slider'+i).slider('option', 'value', pos);
			featureDisplayObjs[i-1].leftBase = pos;
			drawAll(featureDisplayObjs[i-1]);
		}
	  }
	}	
}

function comparisonObj(featureDisplay1, featureDisplay2, index) {
	this.featureDisplay1 = featureDisplay1;
	this.featureDisplay2 = featureDisplay2;
	this.index = index;
	this.lock = true;
	featureDisplay1.comparison = this;
	featureDisplay2.comparison = this;
	
	$('#comparisons').append('<div id="comp'+this.index+'" class="canvas"></div>');

	drawComparison(featureDisplay1);
}

function drawComparison(featureDisplay) {

	if(!featureDisplay.comparison) {
		return;
	}
	$('#comp'+featureDisplay.comparison.index).html('');
	
	var serviceName = '/features/blastpair.json?';
	//?subject=Pk_strainH_chr09.embl&target=Pf3D7_10&score=1e-05&start=1&end=1000
	//?blastpair.json?f2=Pk_strainH_chr09.embl&f1=Pf3D7_10&start1=1&end1=10000&start2=1&end2=10000&normscore=0.000000000001
	
	var comparison = featureDisplay.comparison;
	var featureDisplay1 = comparison.featureDisplay1;
	var featureDisplay2 = comparison.featureDisplay2;
	
	var start1 = featureDisplay1.leftBase;
	var end1   = start1 + featureDisplay1.basesDisplayWidth;
	
	var start2 = featureDisplay2.leftBase;
	var end2   = start2 + featureDisplay2.basesDisplayWidth;

	var f1 = featureDisplay1.srcFeature;
	var f2 = featureDisplay2.srcFeature;
	var normscore = '1e-07';
	var maxLength = 200;
	
	handleAjaxCalling(serviceName, aComparison,
			{ f1:f1, start1:start1, end1:end1, start2:start2, end2:end2, f2:f2, normscore:normscore, length:maxLength }, featureDisplay, {});
}

//
function adjustFeatureDisplayPosition(drag, featureDisplay) {
	var thisMarginTop = featureDisplay.marginTop;
	var thisFLH = featureDisplay.frameLineHeight;
	
	var cssObj = {
			 'margin-left': margin+'px',
			 'position':'absolute',
			 'top': thisMarginTop+(thisFLH*17.5)+'px'
	};
	$('#left'+featureDisplay.index).css(cssObj);

	cssObj = {
			'margin-left': margin+displayWidth+'px',
			'position':'absolute',
			'top': thisMarginTop+(thisFLH*17.5)+'px'
	};
	$('#right'+featureDisplay.index).css(cssObj);

	var buttonWidth = $('#left'+featureDisplay.index).width()+5;
	cssObj = {
        'margin-left': margin+buttonWidth+'px',
        'width': displayWidth-buttonWidth+'px',
        'position':'absolute',
        'top':thisMarginTop+(thisFLH*17.5)+'px'
	};
	$('#slider'+featureDisplay.index).css(cssObj);

	cssObj = {
	     'margin-left': margin+margin+displayWidth+'px',
	     'height': (thisFLH*16)+'px',
	     'position':'absolute',
	     'top': thisMarginTop+7+'px'
	};
	$('#slider_vertical_container'+featureDisplay.index).css(cssObj);
	$('#featureDisplay'+featureDisplay.index).css('margin-top', thisMarginTop-5+'px');

	if(!drag) {
		cssObj = {
			'width': '12px', 
			'height': '12px',
			'border-right': '1px solid #FF0000',
			'border-bottom': '1px solid #FF0000',
			'position': 'absolute',
			'opacity':'0.4',
		    'left': margin+displayWidth+'px',
		    'top': thisMarginTop+(thisFLH*16)+'px'
		};
		$('#rightDraggableEdge'+featureDisplay.index).css(cssObj);
	} else {
		$('#rightDraggableEdge'+featureDisplay.index).css('top',thisMarginTop+(thisFLH*16)+'px');
	}
}

//
function addEventHandlers(featureDisplay) {
	// show/hide stop codons
	if(featureDisplay.index == 1) {
	
		$('#stopCodonToggle').click(function(event){
			showStopCodons = !showStopCodons;
			drawAll(featureDisplay);
		});
	
		$('#lockCheckBox').click(function(event){
			lockSeqs = !lockSeqs;
			if(lockSeqs) {
				$('#lockCheckBox').html("UnLock");
			} else {
				$('#lockCheckBox').html("Lock");
			}
		});

	// graphs
		$('#gcGraphToggle').click(function(event){
			if(showGC) {
				if(!showAG && !showOther) {
					$("#graph").css('height', 0+'px');
					$("#graph").html('');
				}
				showGC = false;
			} else {
				setGraphCss(displayWidth, featureDisplay.marginTop, margin, featureDisplay.frameLineHeight);
				showGC = true;	
			}
			drawAll(featureDisplay);
		});
	
		$('#agGraphToggle').click(function(event){
			if(showAG) {
				if(!showGC && !showOther) {
					$("#graph").css('height', 0+'px');
					$("#graph").html('');
				}
				showAG = false;
			} else {
				setGraphCss(displayWidth, featureDisplay.marginTop, margin, featureDisplay.frameLineHeight);
				showAG = true;	
			}
			drawAll(featureDisplay);
		});
	
		$('#otherGraphToggle').click(function(event){
			if(showOther) {
				if(!showGC && !showAG) {
					$("#graph").css('height', 0+'px');
					$("#graph").html('');
				}
				showOther = false;
			} else {
				setGraphCss(displayWidth, featureDisplay.marginTop, margin, featureDisplay.frameLineHeight);
				showOther = true;
			}
			drawAll(featureDisplay);
		});
	}
	
	// popup
	$('#features'+featureDisplay.index).mouseenter(function(event){
		var tgt = $(event.target);
	    var x = event.pageX+10;
		var y = event.pageY+10;

	    if( $(tgt).is(".featCDS") ) {
	    	var currentId = $(tgt).attr('id');  
	    	loadPopup("CDS<br />"+currentId,x,y);  
	    } else if( $(tgt).is(".featGene") ) {
	    	var currentId = $(tgt).attr('id');  
	    	loadPopup("Gene<br />"+currentId,x,y);  
	    } else if( $(event.target).is(".feat") ) {
	    	var currentId = $(tgt).attr('id'); 
	    	loadPopup(currentId,x,y);
	    }
	 });
	
	$('#features'+featureDisplay.index).click(function(event){
		handleFeatureClick($(event.target), featureDisplay);
	 });
	
	$('#features'+featureDisplay.index).mouseout(function(event){
		disablePopup();
	 });
	
	$('#translation').click(function(event){
		var aminoacid = $(event.target).attr('id');
		var bgColour = $(event.target).css('background-color');
		$(event.target).css('background-color', '#FFFF00');
	 });
	
	if(count > 1) {
		$('#comparisons').click(function(event){
			debugLog("CLICK "+event.pageX+" "+event.pageY);
			
		});
	}
	
	//scrolling
	addScrollEventHandlers(featureDisplay);
}

//
function drawFrameAndStrand(featureDisplay){
	var ypos = featureDisplay.marginTop;
	var thisFLH = featureDisplay.frameLineHeight;
	
	for(var i=0;i<3; i++)
	{
	  var name = 'fwdFrame'+i+featureDisplay.index;
	  $('.'+name).html('');
	  addFrameLine('.fwdFrames',ypos,name, featureDisplay);
	  ypos+=thisFLH*2;
	}
	
	addStrandLine('.strands', ypos, 'fwdStrand'+featureDisplay.index, featureDisplay);
	ypos+=thisFLH*3;
	addStrandLine('.strands', ypos, 'bwdStrand'+featureDisplay.index, featureDisplay);
	
	ypos+=thisFLH*2;
	for(var i=0;i<3; i++)
	{
	  var name = 'bwdFrame'+i+featureDisplay.index;
	  $('.'+name).html('');
	  addFrameLine('.bwdFrames',ypos,name, featureDisplay);
	  ypos+=thisFLH*2;
	}
}

function addStrandLine(selector, ypos, strand, featureDisplay) {
	var thisFLH = featureDisplay.frameLineHeight;
	var cssObj = {
		'height':thisFLH+'px',
		'line-height' : thisFLH+'px',
		'width':displayWidth+'px',
		'margin-left': margin+'px',
		'margin-top': ypos+'px',
		'background':  'rgb(200, 200, 200)',
		'position':'absolute'
	};

	$(selector).append('<div class='+strand+'>&nbsp;</div>');
	$('.'+strand).css(cssObj);
}

function addFrameLine(selector, ypos, frame, featureDisplay) {
	var cssObj = {
		'height':featureDisplay.frameLineHeight+'px',
		'line-height' : featureDisplay.frameLineHeight+'px',
		'width':displayWidth+'px',
		'margin-left': margin+'px',
		'margin-top': ypos+'px',
		'background':  'rgb(240, 240, 240)',
		'position':'absolute'
	};

	$(selector).append('<div class='+frame+'>&nbsp;</div>');
	$('.'+frame).css(cssObj);
}

function drawAll(featureDisplay) {
      $('#featureDisplay'+featureDisplay.index).html('');
      var showSequence = true;
      
      if(featureDisplay.minimumDisplay &&
    	$('#slider_vertical_container'+featureDisplay.index).slider('option', 'value') <= featureDisplay.sequenceLength-800) {
    	  showSequence = false;
      }
      
      if(showSequence && (featureDisplay.firstTime || showStopCodons || showGC || showAG || showOther)) {
        getSequence(featureDisplay);
      } else {
    	$('#stop_codons'+featureDisplay.index).html('');
        $('#sequence').html('');
        $('#translation').html('');
      }

      drawFeatures(featureDisplay);
	  drawTicks(featureDisplay);
	  
	  if(compare) {
		drawComparison(featureDisplay);
	  }
}

function getSequence(featureDisplay) {
	var end = featureDisplay.leftBase+featureDisplay.basesDisplayWidth;

	if($('#slider_vertical_container'+featureDisplay.index).slider('option', 'value') > featureDisplay.sequenceLength-800) {
	  end+=2;
	}

	var serviceName = '/regions/sequence.json?';
	handleAjaxCalling(serviceName, aSequence,
			{ uniqueName:featureDisplay.srcFeature, start:featureDisplay.leftBase, end:end }, 
			featureDisplay, {});
}

function drawStopCodons(featureDisplay, basePerPixel) {
    var fwdStops1 = new Array();
    var fwdStops2 = new Array();
    var fwdStops3 = new Array();
    
    var bwdStops1 = new Array();
    var bwdStops2 = new Array();
    var bwdStops3 = new Array();

    //console.time('calculate stop codons');  
    calculateStopCodons(featureDisplay, fwdStops1, fwdStops2, fwdStops3, 'TAG', 'TAA', 'TGA', 1);
    calculateStopCodons(featureDisplay, bwdStops1, bwdStops2, bwdStops3, 'CTA', 'TTA', 'TCA', -1);
    //console.timeEnd('calculate stop codons');
	
	var nstops = fwdStops1.length + fwdStops2.length + fwdStops3.length +
				 bwdStops1.length + bwdStops2.length + bwdStops3.length; 
	if(nstops > 3000) {
		var canvasTop = $('#featureDisplay'+featureDisplay.index).css('margin-top').replace("px", "");
		var mTop = featureDisplay.marginTop;
		var flh  = featureDisplay.frameLineHeight;
		
		drawStopOnCanvas(fwdStops1, mTop+((flh*2)*0+1)-canvasTop, flh, featureDisplay, basePerPixel);
		drawStopOnCanvas(fwdStops2, mTop+((flh*2)*1+1)-canvasTop, flh, featureDisplay, basePerPixel);
		drawStopOnCanvas(fwdStops3, mTop+((flh*2)*2+1)-canvasTop, flh, featureDisplay, basePerPixel);
	
		drawStopOnCanvas(bwdStops1, mTop+(flh*10)+flh+((flh*2)*0+1)-canvasTop, flh, featureDisplay, basePerPixel);
		drawStopOnCanvas(bwdStops2, mTop+(flh*10)+flh+((flh*2)*1+1)-canvasTop, flh, featureDisplay, basePerPixel);
		drawStopOnCanvas(bwdStops3, mTop+(flh*10)+flh+((flh*2)*2+1)-canvasTop, flh, featureDisplay, basePerPixel);
	} else {
		//console.time('draw fwd stop codons');
		drawFwdStop(fwdStops1, 0, featureDisplay, basePerPixel);
		drawFwdStop(fwdStops2, 1, featureDisplay, basePerPixel);
		drawFwdStop(fwdStops3, 2, featureDisplay, basePerPixel);
		//console.timeEnd('draw fwd stop codons');
	
		//console.time('draw bwd stop codons');  
		drawBwdStop(bwdStops1, 0, featureDisplay, basePerPixel);
		drawBwdStop(bwdStops2, 1, featureDisplay, basePerPixel);
		drawBwdStop(bwdStops3, 2, featureDisplay, basePerPixel);
		//console.timeEnd('draw bwd stop codons');
		
		if($('.bases').height() != featureDisplay.frameLineHeight) {
		  $('.bases').css({'height' : featureDisplay.frameLineHeight+'px'});
		}
	}
};


function drawStopOnCanvas(stop, ypos, frameLineHeight, featureDisplay, basePerPixel) {
	var len=stop.length;
	var colour = '#000000';
	for(var i=0; i<len; i++ ) {
		var position1 = stop[i];
		var stopPosition1 = margin+Math.round(stop[i]/basePerPixel);
		$("#featureDisplay"+featureDisplay.index).drawLine(stopPosition1, ypos, stopPosition1, ypos+frameLineHeight,
				{color: colour, stroke:'1'});
	}
}

function drawFwdStop(stop, frame, featureDisplay, basePerPixel) {

  var len=stop.length;
  var ypos = featureDisplay.marginTop+((featureDisplay.frameLineHeight*2)*frame);

  var fwdStopsStr = '';
  for(var i=0; i<len; i+=2 )
  {
	var position1 = stop[i];
	var stopPosition1 = margin+((position1 )/basePerPixel);
	var stopPosition2;
	if(i < len-2)
	  stopPosition2 = margin+((stop[i+1] )/basePerPixel);
	else
	  stopPosition2 = stopPosition1+1;

	var pos = ypos+"px "+stopPosition1+"px";
	var width = (stopPosition2-stopPosition1)+"px";

	fwdStopsStr = fwdStopsStr + '<div id=fs'+position1+' class="bases" style="width:'+width+'; margin:'+pos+'"></div>';
  }
  
  $('#stop_codons'+featureDisplay.index).append(fwdStopsStr);
}

function drawBwdStop(stop, frame, featureDisplay, basePerPixel) {
  var len=stop.length;
  var ypos = featureDisplay.marginTop+(featureDisplay.frameLineHeight*10)+
  			featureDisplay.frameLineHeight+((featureDisplay.frameLineHeight*2)*frame);

  var bwdStopsStr = '';
  for(var i=0; i<len; i+=2 )
  {
	var position1 = stop[i];
	var stopPosition1 = margin+((position1 )/basePerPixel);
	var stopPosition2;
	if(i < len-2)
	  stopPosition2 = margin+((stop[i+1] )/basePerPixel);
	else
	  stopPosition2 = stopPosition1+1;

	var pos = ypos+"px "+stopPosition1+"px";
	var width = (stopPosition2-stopPosition1)+"px";
	
	bwdStopsStr = bwdStopsStr + '<div id=bs'+position1+' class="bases" style="width:'+width+'; margin:'+pos+'"></div>';
  }
  //return bwdStopsStr;
  $('#stop_codons'+featureDisplay.index).append(bwdStopsStr);
}

function drawCodons(featureDisplay, basePerPixel) {
  var yposFwd = featureDisplay.marginTop+(6*featureDisplay.frameLineHeight);
  var yposBwd = yposFwd+(featureDisplay.frameLineHeight*3);
  var xpos = margin;
  for(var i=0;i<featureDisplay.basesDisplayWidth; i++) {
	  
	  if(i+featureDisplay.leftBase > sequenceLength)
		  break;
	  
	  var fwdid = 'fwdbase'+i;
	  var bwdid = 'bwdbase'+i;
	  $('#sequence').append('<div class="base" id="'+fwdid+'" >'+featureDisplay.sequence[i]+'</div>');
	  $('#sequence').append('<div class="base" id="'+bwdid+'" >'+complement(featureDisplay.sequence[i])+'</div>');

	  var cssObj = {
			  'margin-top': yposFwd+'px',
			  'margin-left': xpos+'px'
	  };		  
	  $('#'+fwdid).css(cssObj);
	  
	  cssObj = {
			  'margin-top': yposBwd+'px',
			  'margin-left': xpos+'px'
	  };
	  $('#'+bwdid).css(cssObj); 
	  xpos += (1/basePerPixel);
  }
}

function drawAminoAcids(featureDisplay, basePerPixel) {
  var xpos = margin;
  for(var i=0;i<featureDisplay.basesDisplayWidth; i++) {
	  
	  if(i+featureDisplay.leftBase > sequenceLength)
		  break;
	  
	  var frame = (featureDisplay.leftBase-1+i) % 3;
	  
	  var yposFwd = featureDisplay.marginTop+(frame*(featureDisplay.frameLineHeight*2));
	  var fwdid = 'fwdAA1'+i;
	  $('#translation').append('<div class="aminoacid" id="'+fwdid+'" >'+
			  getCodonTranslation(featureDisplay.sequence[i], featureDisplay.sequence[i+1], 
					  featureDisplay.sequence[i+2])+'</div>');
	  
	  var cssObj = {
			  'width': 3/basePerPixel+'px',
			  'margin-top': yposFwd+'px',
			  'margin-left': xpos+'px'
	  };		  
	  $('#'+fwdid).css(cssObj);	   


  	  var reversePos = sequenceLength-(i+featureDisplay.leftBase+1);
  	  frame = 3 - ((reversePos+3)-1) % 3 -1;

	  var yposBwd = featureDisplay.marginTop+(featureDisplay.frameLineHeight*11)+
	  						((featureDisplay.frameLineHeight*2)*frame);
	  var bwdid = 'bwdAA1'+i;
	  $('#translation').append('<div class="aminoacid" id="'+bwdid+'" >'+
			  getCodonTranslation(complement(featureDisplay.sequence[i+2]), 
					              complement(featureDisplay.sequence[i+1]), 
					              complement(featureDisplay.sequence[i]))+'</div>');

	  var cssObj = {
			  'width': 3/basePerPixel+'px',
			  'margin-top': yposBwd+'px',
			  'margin-left': xpos+'px'
	  };		  
	  $('#'+bwdid).css(cssObj);	 
	  
	  xpos += (1/basePerPixel);
  }
}

function drawFeatures(featureDisplay) {
	var end = parseInt(featureDisplay.leftBase)+parseInt(featureDisplay.basesDisplayWidth);
	
	debugLog("start..end = "+featureDisplay.leftBase+".."+end);
	if(end > featureDisplay.sequenceLength && 
	   featureDisplay.leftBase < featureDisplay.sequenceLength) {
		end = featureDisplay.sequenceLength;
	}
	
	var serviceName = '/regions/featureloc.json?';

	var relationshipsList = new Array();
	relationshipsList.push('part_of');
	relationshipsList.push('derives_from');
	
	handleAjaxCalling(serviceName, aFeature,
			{ uniqueName:featureDisplay.srcFeature, start:featureDisplay.leftBase, end:end, relationships:['part_of','derives_from'] }, 
			featureDisplay, { minDisplay:featureDisplay.minimumDisplay });
}

function getFeatureExons(transcript) {
	var nkids = transcript.features.length;
	var exons = [];
	if(nkids > 0)
	{
	  for(var i=0; i<nkids; i++)
	  {
		var kid = transcript.features[i];
		if(kid.type == "exon") {
	       exons.push(kid);
		}
      }	
	}
	
	if(exons.length > 0) {
	  exons.sort(sortFeatures);
	}
	return exons;
}

function getFeaturePeptide(transcript) {
	var nkids = transcript.features.length;
	if(nkids > 0)
	{
	  for(var i=0; i<nkids; i++)
	  {
		var kid = transcript.features[i];	
		if(kid.type == "polypeptide") {
	       return kid;
		}
      }	
	}
	return -1;
}



function getSegmentFrameShift(exons, index, phase) {
  // find the number of bases in the segments before this one
  var base_count = 0;

  for(var i = 0; i < index; ++i) 
  {
    var exon = exons[i];
    base_count += exon.end-exon.start;
  }

  var mod_value = (base_count + 3 - phase) % 3;
  if (mod_value == 1) {
    return 2;
  } else if (mod_value == 2) {
    return 1;
  } 
  return 0;
}

function drawFeature(leftBase, feature, featureStr, ypos, className, basePerPixel) {

  var startFeature = margin+((feature.start - leftBase + 1)/basePerPixel);
  var endFeature   = margin+((feature.end - leftBase + 1)/basePerPixel);
  var extra = '';
  
  if(startFeature < margin) {
    startFeature = margin;
    extra = 'border-left: none;';
  }
  
  if(endFeature > margin+displayWidth) {
	if(startFeature > margin+displayWidth)   
		return featureStr;
    endFeature = margin+displayWidth;
    extra += 'border-right: none';
  }

  var pos = 'margin-top:'+ypos+"px; margin-left:"+startFeature+"px";
  var width = (endFeature-startFeature)+"px";

  featureStr = featureStr + 
	'<div id='+feature.uniquename+' class="'+className+'" style="width:'+width+'; '+pos+';'+extra+'"></div>';
  return featureStr;
}

function drawFeatureConnections(featureDisplay, lastExon, exon, lastYpos, ypos, colour, basePerPixel) {
	if(featureDisplay.minimumDisplay)
		return;
	
	var exonL;
	var exonR;
	
	if(exon.strand == 1) {
	 exonL = lastExon;
	 exonR = exon;
	} else {
	 exonL = exon;
	 exonR = lastExon;
	 var tmpPos = ypos;
	 ypos = lastYpos;
	 lastYpos = tmpPos;
	}
	
	var lpos = margin+((exonL.end   - featureDisplay.leftBase )/basePerPixel) + 1;
	if(lpos > displayWidth) {
	  return;
	}
	var rpos = margin+((exonR.start - featureDisplay.leftBase +1 )/basePerPixel) - 1;
	var mid  = lpos+(rpos-lpos)/2;
	
	var ymid = ypos-4;
	if(ypos > lastYpos) {
	  ymid = lastYpos-4;
	}
	var Xpoints = new Array(lpos, mid, rpos) ;
	var Ypoints = new Array(lastYpos+4, ymid, ypos+4);
	
	$("#featureDisplay"+featureDisplay.index).drawPolyline(Xpoints,Ypoints, {color: colour, stroke:'1'});
}

function drawArrow(featureDisplay, exon, ypos, basePerPixel) {
	if(featureDisplay.minimumDisplay)
		return;
	
	var Xpoints;
	var Ypoints;
	ypos++;
	
	var frameLineHeight2 = featureDisplay.frameLineHeight/2;
	if(exon.strand == 1) {
	  var end = margin+((exon.end - featureDisplay.leftBase )/basePerPixel) + 1;
	  if(end > displayWidth) {
		  return;
	  }
	  Xpoints = new Array(end, end+frameLineHeight2, end) ;
	  Ypoints = new Array(ypos, ypos+frameLineHeight2, ypos+featureDisplay.frameLineHeight);
	} else {
	  var start = margin+((exon.start - featureDisplay.leftBase )/basePerPixel) - 1;
	  if(start > displayWidth) {
		  return;
	  }
	  Xpoints = new Array(start, start-frameLineHeight2, start) ;
	  Ypoints = new Array(ypos, ypos+frameLineHeight2, ypos+featureDisplay.frameLineHeight);
	}

	$("#featureDisplay"+featureDisplay.index).drawPolyline(Xpoints,Ypoints, {color:'#020202', stroke:'1'});
}


function drawTicks(featureDisplay) {
	baseInterval = (featureDisplay.basesDisplayWidth/displayWidth)*screenInterval;
	var nticks = featureDisplay.basesDisplayWidth/baseInterval;
	var basePerPixel  = baseInterval/screenInterval;

	var baseRemainder = (featureDisplay.leftBase-1) % baseInterval;
	var start = Math.round(Math.floor((featureDisplay.leftBase-1)/baseInterval)*baseInterval);
	
	var xScreen = margin-(1/basePerPixel);
	if(baseRemainder > 0) {
	  xScreen -= ((featureDisplay.leftBase-start-1)/basePerPixel);
	}
 
	$('#ticks'+featureDisplay.index).html('');
	/*console.log('nticks='+nticks+' '+basePerPixel+
			" basesDisplayWidth="+basesDisplayWidth+" displayWidth="+displayWidth+ 
			" leftBasePosition="+leftBasePosition+
			" baseRemainder="+baseRemainder+" xScreen="+xScreen+
			" baseInterval="+baseInterval+"  1200%500="+1200%500+" start"+start);*/

	for(var i=1; i< nticks+1; i++) {
		xScreen+=screenInterval;
		
		if(xScreen >= displayWidth) {
			break;
		}
		else if(xScreen < margin) {
			continue;
		}
		var pos = featureDisplay.marginTop+(featureDisplay.frameLineHeight*9)-14+"px "+xScreen+"px";
		var thisTick = 'tick'+featureDisplay.index+i;
		
		$('#ticks'+featureDisplay.index).append('<div class="tickClass" id='+thisTick+'></div>');
		setTickCSS(pos, Math.round(i*baseInterval)+(start), '#'+thisTick);
	}
}

function setTickCSS(offset, number, selector) {
	$(selector).css('margin', offset);
	$(selector).html(number);
}


function getOrganismList(featureDisplay) {
	var serviceName = '/organisms/list.json';
	handleAjaxCalling(serviceName, aOrganism,
			{ }, featureDisplay, {});
}

function getSrcFeatureList(taxonomyid, featureDisplay)
{
	$('#srcFeatureSelector').html('');
	var jsonUrl = webService[serviceType]+'/regions/inorganism.json?taxonID='+taxonomyid;

	debugLog(jsonUrl);
	
	var serviceName = '/regions/inorganism.json';
	handleAjaxCalling(serviceName, aSrcFeature,
			{ taxonID:taxonomyid }, featureDisplay, {});
}

function handleFeatureClick(tgt, featureDisplay) {
	featureSelected = $(tgt).attr('id');

	var width = $(tgt).css('borderLeftWidth');
    if(width == '1px') {
	  $(tgt).css('border-width', '2px');
    } else {
      $(tgt).css('border-width', '1px');
    }
    showProperties(featureDisplay);
}

function showProperties(featureDisplay) {
    var nfeatures = features.length
    
    var featureStr = "&features="+featureSelected;
	var featurePropertyList = new Array();
	featurePropertyList.push(featureSelected);
	 
	var name = featureSelected;
	for(var i=0; i<nfeatures; i++ ) {
		var feature = features[i];
		var nkids = feature.features.length;
	  
		if(nkids > 0) {
			for(var j=0; j<nkids; j++ ) { 
				var kid = feature.features[j];
				var exons = getFeatureExons(kid);
				var nexons = exons.length;

				for(var k=0; k<nexons; k++) {
					var exon = exons[k];
					if(exon.uniquename == featureSelected ||
					   feature.uniquename == featureSelected) {
						
						if(nkids == 1)
							name = feature.uniquename;
						else
							name = kid.uniquename;
						featurePropertyList.push(feature.uniquename);
						featureStr += "&features="+feature.uniquename;
						var polypep = getFeaturePeptide(kid);
						if(polypep != -1) {
							featurePropertyList.push(polypep.uniquename);
							featureStr += "&features="+polypep.uniquename;
						}
						break;
					}
				}
			}
		}
	}
        
  
	handleAjaxCalling('/features/properties.json?', aFeatureProps,
		'us='+featurePropertyList, -1, {});
	
	handleAjaxCalling('/features/pubs.json?', aFeaturePubs,
			featureStr, -1, {});
	
	handleAjaxCalling('/features/dbxrefs.json?', aFeatureDbXRefs,
			featureStr, -1, {});

	handleAjaxCalling('/features/terms.json?', aFeatureCvTerms,
			featureStr, -1, {});
	
	handleAjaxCalling('/features/orthologues.json?', aOrthologues,
			featureStr, featureDisplay, {});
        
    $("div#properties").html("<div id='DISP"+featureSelected+"'></div>");
    $("div#DISP"+escapeId(featureSelected)).dialog({ height: 450 ,
		width:550, position: 'top', title:name});
}

function positionFeatureList(featureDisplay) {
	var ghgt = $('#graph').height();
	var top = featureDisplay.marginTop+(featureDisplay.frameLineHeight*19.5)+ghgt; 
	
    var cssObj = {
			 'margin-left': margin+'px',
			 'margin-right': margin+'px',
			 'position':'absolute',
			 'width': displayWidth+'px',
			 'top': top+'px'
	};
	
	$('#featureList').css(cssObj);
}

function setupFeatureList(features, featureDisplay) {
	positionFeatureList(featureDisplay);
	$('#featureList').html('<table id="featureListTable" class="tablesorter" cellspacing="1"></table>');
	$('#featureListTable').append('<thead><tr><th>Name</th><th>Type</th><th>Feature Start</th><th>Feature End</th><th>Properties</th></tr></thead>');
	$('#featureListTable').append('<tbody>');
	
	for(var i=0; i<features.length; i++) {
		var feature = features[i];
		
		appendFeatureToList(feature);
		
		for(var j=0; j<feature.features.length; j++) {
			var kid = feature.features[j];
			appendFeatureToList(kid);

			for(var k=0; k<kid.features.length; k++) {
				var kid2 = kid.features[k];
				appendFeatureToList(kid2);
			}
		}
	}
	
	$('#featureListTable').append('</tbody>');
	$('#featureListTable').tablesorter(); 
}

function appendFeatureToList(feature) {
	$('#featureListTable').append('<tr>'+
			'<td>'+feature.uniquename+'</td>'+
			'<td>'+feature.type+'</td>'+
			'<td>'+feature.start+'</td>'+
			'<td>'+feature.end+'</td>'+
			'<td id="'+feature.uniquename+':PROPS"></td>'+
			'</tr>');
}

//
// AJAX functions
//
var aSrcFeature = function ajaxGetSrcFeatures(featureDisplay, returned, options) {
	$('#srcFeatureSelector').html('<select id="srcFeatureList"></select>');
	$('#srcFeatureList').append('<option value="Sequence:">Sequence:</option>');
	
	var srcFeatures  = returned.response.regions;
	for(var j=0; j<srcFeatures.length; j++) {
		var feat = srcFeatures[j];
		if(feat)
		  $('#srcFeatureList').append(
				  '<option value="'+feat+'">'+feat+'</option>');
	}
	
	positionLists();
	
	$('#srcFeatureSelector').change(function(event){
		featureDisplay.srcFeature = $('#srcFeatureList option:selected')[0].value;
		firstTime = true;
		drawAll(featureDisplay);
	});
};

var aOrganism = function ajaxGetOrganisms(featureDisplay, returned, options) {
	var organisms  = returned.response.organisms;
	$('#organismSelector').html('<select id="organismList"></select>');
	$('#organismList').append('<option value="Organism:">Organism:</option>');
	for(var i=0; i<organisms.length; i++) {
		var organism = organisms[i];
		if(organism)
		  $('#organismList').append(
				  '<option value="'+organism.taxonomyid+'">'+organism.name+'</option>');
	}
	
	positionLists();
	
	$('#organismSelector').change(function(event){
		var taxonomyid = $('#organismList option:selected')[0].value;
		getSrcFeatureList(taxonomyid, featureDisplay);
	});
};

function positionLists() {
	// top position
    //var organismWidth = $('#organismSelector').css('width').replace("px", "");
    //var srcFeatureWidth = $('#srcFeatureSelector').css('width').replace("px", "");
    var organismWidth = $('#organismSelector').width();
    var srcFeatureWidth = $('#srcFeatureSelector').width();

	$('#organismSelector').css('margin-left', 
			margin+margin+displayWidth-organismWidth-srcFeatureWidth-10+'px');
	$('#srcFeatureSelector').css('margin-left', 
			margin+margin+displayWidth-srcFeatureWidth+'px');
}

var aFeatureCvTerms = function ajaxGetFeatureCvTerms(featureDisplay, returned, options) {
	showFeatureCvTerm(returned.response.features, featureSelected);
};

var aOrthologues = function ajaxGetOrthologues(featureDisplay, returned, options) {
	var orthologues = returned.response.features;
	var midDisplay = featureDisplay.basesDisplayWidth/2;
	
	if(!orthologues || orthologues.length == 0)
		return;
	
	var clusters = new Array();
	var count = 0;
	
	for(var i=0; i<orthologues.length; i++) {	
		var featureOrthologues = orthologues[i].orthologues;
		for(var j=0; j<featureOrthologues.length; j++) {
			   
		   if(featureOrthologues[j].orthotype == 'polypeptide') {
			   
			 if(count == 0)
				$("div#DISP"+escapeId(featureSelected)).append(
				   "<br /><strong>Orthologues : </strong><br />");
				
			 count++;
		     var featureOrthologue = featureOrthologues[j].ortho;
		     $("div#DISP"+escapeId(featureSelected)).append(
				   '<a href="javascript:void(0)" onclick="openMe(\''+
				   featureOrthologue+'\','+midDisplay+');">'+
				   featureOrthologue+"</a> ("+featureOrthologues[j].orthoproduct+")<br />");
		   } else {
			 clusters.push(featureOrthologues[j].ortho);
		   }
		}
	}
	
	var serviceName = '/features/clusters.json?';
	handleAjaxCalling(serviceName, aCluster,
		'orthologues='+clusters, 
		featureDisplay, {});
};

var aCluster = function ajaxGetClusters(featureDisplay, returned, options) {
	var clusters = returned.response.clusters;
	var midDisplay = featureDisplay.basesDisplayWidth/2;
	
	if(!clusters || clusters.length == 0)
		return;
	
	$("div#DISP"+escapeId(featureSelected)).append(
			   "<br /><strong>Clusters : </strong><br />");
	for(var i=0; i<clusters.length; i++) {	
		var featureCluster = clusters[i].cluster;
		for(var j=0; j<featureCluster.length; j++) {
			   
		   if(featureCluster[j].subject_type == 'polypeptide') {
		     var subject = featureCluster[j].subject;
		     $("div#DISP"+escapeId(featureSelected)).append(
				   '<a href="javascript:void(0)" onclick="openMe(\''+
				   subject+'\','+midDisplay+');">'+
				   subject+"</a><br />");
		   }
		}
	}
}

function openMe(gene, midDisplay) {
	handleAjaxCalling('/features/coordinates.json?', 
			function(featureDisplay, returned, options) { 
		      var src  = returned.response.coordinates[0].regions[0].region; 
		      var base = parseInt(returned.response.coordinates[0].regions[0].fmin)-midDisplay;
		      window.open('?&src='+src+'&base='+base);
		    }, 
			{ features: gene}, {}, {});
}

var propertyFilter = [ 'fasta_file', 'blastp_file', 'blastp+go_file', 'private', 'pepstats_file' ];
var aFeatureProps = function ajaxGetFeatureProps(featureDisplay, returned, options) {
	
	var featProps  = returned.response.features;
    for(var i=0; i<featProps.length; i++) {	
		var featureprops = featProps[i].props;
		for(var j=0; j<featureprops.length; j++) {
			if(!containsString(propertyFilter, featureprops[j].name))
				$("div#DISP"+escapeId(featureSelected)).append(
						featureprops[j].name+"="+featureprops[j].value+"<br />");
		}
	}
};

var aFeaturePubs = function ajaxGetFeaturePubs(featureDisplay, returned, options) {
	var featPubs  = returned.response.features;
	if(!featPubs || featPubs.length == 0)
		return;
	
	$("div#DISP"+escapeId(featureSelected)).append(
			   "<br /><strong>Literature : </strong><br />");
	
    for(var i=0; i<featPubs.length; i++) {	
		var featurepubs = featPubs[i].pubs;
		showFeaturePubs(featurepubs, featureSelected);
	}
    
	$("div#DISP"+escapeId(featureSelected)).append("<br />");
};


var aFeatureDbXRefs = function ajaxGetFeatureDbXRefs(featureDisplay, returned, options) {
	var featDbXRefs  = returned.response.features;
	if(!featDbXRefs || featDbXRefs.length == 0)
		return;
	
	$("div#DISP"+escapeId(featureSelected)).append(
			   "<br /><strong>DbXRefs : </strong><br />");
	
    for(var i=0; i<featDbXRefs.length; i++) {	
		showFeatureDbXRefs(featDbXRefs[i].dbxrefs, featureSelected);
	}
    
	$("div#DISP"+escapeId(featureSelected)).append("<br />");
};

function containsString(anArray, aStr) {
	for(var i=0; i<anArray.length; i++) {
		if(aStr == anArray[i])
			return true;
	}
	return false;
}

var aFeaturePropColours = function ajaxGetFeaturePropColours(featureDisplay, returned, options) {
	var featProps  = returned.response.features;
	for(var i=0; i<featProps.length; i++) {	
		var featureprops = featProps[i].props;
		for(var j=0; j<featureprops.length; j++) {

			if(featureprops[j].name == 'comment')
				$('#'+escapeId(featProps[i].feature+":PROPS")).append(
						featureprops[j].name+"="+featureprops[j].value+";<br />");
			
			if(featureprops[j].name == 'colour') {
				var featureId = escapeId(featProps[i].feature);
				$('#'+featureId).css('background-color', 'rgb('+colour[featureprops[j].value]+')' );
			}
		}
	}
};

var aFeature = function ajaxGetFeatures(featureDisplay, returned, options) {
	
	features  = returned.response.features;
	var nfeatures = features.length;

	debugLog("No. of features "+ nfeatures+"  "+featureDisplay.leftBase+".."+
			(parseInt(featureDisplay.leftBase)+parseInt(featureDisplay.basesDisplayWidth)));

	baseInterval = (featureDisplay.basesDisplayWidth/displayWidth)*screenInterval;
	var basePerPixel  = baseInterval/screenInterval;
	  
	  
	var ypos;
	var featureStr = '';
	var featureToColourList = new Array();
	
	for(var i=0; i<nfeatures; i++ ) {
	  var feature = features[i];
	  
	  if(feature.type == "match_part") {
		  continue;
	  }
	  
	  var nkids = 0;
	  if(feature.features != undefined) {
		  nkids = feature.features.length;
	  }
	  
	  
	  if(nkids > 0) {
		for(var j=0; j<nkids; j++ ) { 
		  var kid = feature.features[j];
		  
		  if(kid.type == "mRNA") {
			if(!options.minDisplay) {
				var polypep = getFeaturePeptide(kid);
				if(polypep != -1) {
					featureToColourList.push(polypep.uniquename);
				}
			}
			var exons = getFeatureExons(kid);
			var nexons = exons.length;
			var lastExon = 0;
			var lastYpos = -1;
			var colour = '#666666';
			for(var k=0; k<nexons; k++) {
			  var exon = exons[k];

			  var phase = 0;
		      if(exon.phase != "None") {
			    phase = exon.phase;
		      }

		      if(exon.strand == 1) {
		    	var frame = ( (exon.start+1)-1+getSegmentFrameShift(exons, k, phase) ) % 3;
			  	ypos = featureDisplay.marginTop+((featureDisplay.frameLineHeight*2)*frame);
		      }
		      else {
			    var frame = 3 -
			          ((sequenceLength-exon.end+1)-1+getSegmentFrameShift(exons, k, phase)) % 3;
			    ypos = featureDisplay.marginTop+(featureDisplay.frameLineHeight*9)+
			    		((featureDisplay.frameLineHeight*2)*frame);
		      }

		      //featureToColourArray += '&uniqueName='+exon.uniquename;
		      featureToColourList.push(exon.uniquename);
		      featureStr = drawFeature(featureDisplay.leftBase, exon, featureStr, ypos, "featCDS", basePerPixel) ;
		      
		      var canvasTop = $('#featureDisplay'+featureDisplay.index).css('margin-top').replace("px", "");
		      if(lastYpos > -1) {
		      	  drawFeatureConnections(featureDisplay, lastExon, exon, 
		      			  lastYpos-canvasTop, ypos-canvasTop, colour, basePerPixel);
		      }
		      if(k == nexons-1) {
		      	  drawArrow(featureDisplay, exon, ypos-canvasTop, basePerPixel);
		      }
  			  lastExon = exon;
  			  lastYpos = ypos;
			}
	      }  
		}
	  }
	  
	  if(feature.strand == 1) {
			ypos = featureDisplay.marginTop+(featureDisplay.frameLineHeight*6);
		  }
		  else {
			ypos = featureDisplay.marginTop+(featureDisplay.frameLineHeight*9);
		  }	
	  
	  var className = "feat";
	  if(feature.type == "gene") {
		  className = "featGene";
	  }
	  featureStr = drawFeature(featureDisplay.leftBase, feature, featureStr, ypos, className, basePerPixel);

	}
	
	$('#features'+featureDisplay.index).html(featureStr);
	
	if(!options.minDisplay) {
		if($('.feat').height() != featureDisplay.frameLineHeight) {
			var cssObj = {
				'height':featureDisplay.frameLineHeight+'px',
				'line-height' : featureDisplay.frameLineHeight+'px'
			};
			$('.feat, .featCDS, .featGene, .featGreen').css(cssObj);
		}
	
		if(count < 2) {
			setupFeatureList(features, featureDisplay);
		}
		if(featureToColourList.length > 0 && featureToColourList.length < 500) {
			var serviceName = '/features/properties.json?';
			handleAjaxCalling(serviceName, aFeaturePropColours,
				'us='+featureToColourList, 
				featureDisplay.leftBase, {});
		}
	}
	return;
};

var aComparison = function ajaxGetComparisons(featureDisplay, returned, options) {
	var blastFeatures = returned.response.matches;
	var comparison = featureDisplay.comparison;
	
	var featureDisplay1 = comparison.featureDisplay1;
	var featureDisplay2 = comparison.featureDisplay2;
	var canvasTop = featureDisplay1.marginTop+(featureDisplay1.frameLineHeight*16);
	var canvasBtm = featureDisplay2.marginTop;
	
	var baseInterval1 = (featureDisplay1.basesDisplayWidth/displayWidth)*screenInterval;
	var basePerPixel1 = baseInterval1/screenInterval;
	
	var baseInterval2 = (featureDisplay2.basesDisplayWidth/displayWidth)*screenInterval;
	var basePerPixel2 = baseInterval2/screenInterval;
	
	// adjust comparison canvas
	var cssObj = {
			'margin-top': canvasTop+'px',
			'height': canvasBtm-canvasTop+'px',
			'width': displayWidth+'px',
			'background-color': '#CCCCCC'
	};
	$('#comp'+comparison.index).css(cssObj);
	
	for(var i=0; i<blastFeatures.length; i++ ) {
		var match = blastFeatures[i];

		var fmin1 = match.fmin1;
		var fmax1 = match.fmax1;
		var fmin2 = match.fmin2;
		var fmax2 = match.fmax2;
		
		//debugLog(match.fmin1+".."+match.fmax1+"    "+match.match+"  "+(match.fmax1-match.fmin1));
		var lpos1 = margin+((fmin1 - featureDisplay1.leftBase)/basePerPixel1) + 1;
		var rpos1 = margin+((fmax1 - featureDisplay1.leftBase +1 )/basePerPixel1) - 1;
		
		var lpos2 = margin+((fmin2 - featureDisplay2.leftBase)/basePerPixel2) + 1;
		var rpos2 = margin+((fmax2 - featureDisplay2.leftBase +1 )/basePerPixel2) - 1;
		
		var Xpoints = new Array(lpos1, rpos1, rpos2, lpos2) ;
		var Ypoints = new Array(0, 0, canvasBtm-canvasTop, canvasBtm-canvasTop);
		
		
		var colour;
		if( (fmin1 > fmax1 && fmin2 > fmax2) || (fmax1 > fmin1 && fmax2 > fmin2) ) {
			colour = '#FF0000';
		} else {
			colour = '#0000FF';
		}
		$("#comp"+comparison.index).fillPolygon(Xpoints,Ypoints, {color: colour, stroke:'1'});
	}
}

var aSequence = function ajaxGetSequence(featureDisplay, returned, options) {

	//sequence = returned.response.sequence[0].dna.replace(/\r|\n|\r\n/g,"").toUpperCase();
	var sequence = returned.response.sequence[0].dna.toUpperCase();
	featureDisplay.sequence = sequence;
	var seqLen = returned.response.sequence[0].length;

	baseInterval = (featureDisplay.basesDisplayWidth/displayWidth)*screenInterval;
	var basePerPixel  = baseInterval/screenInterval;
	
	debugLog("getSequence() sequence length = "+seqLen);
	if((seqLen-featureDisplay.sequenceLength) != 0) {
      $('#slider'+featureDisplay.index).slider('option', 'max', seqLen);
	}

	featureDisplay.sequenceLength = seqLen;
    sequenceLength = seqLen;
    
    //console.time('draw stop codons');
    $('#stop_codons'+featureDisplay.index).html('');
    $('#sequence').html('');
    $('#translation').html('');
	if($('#slider_vertical_container'+featureDisplay.index).slider('option', 'value') > seqLen-800) {
	  drawCodons(featureDisplay, basePerPixel);
	  drawAminoAcids(featureDisplay, basePerPixel);
	} else if(showStopCodons) {
      drawStopCodons(featureDisplay, basePerPixel);
	}
    //console.timeEnd('draw stop codons');  

    if (featureDisplay.firstTime) {
    	$("#slider_vertical_container"+featureDisplay.index).slider('option', 'max', (seqLen-140));
    	$("#slider_vertical_container"+featureDisplay.index).slider('option', 'value', (seqLen-featureDisplay.basesDisplayWidth));
    			
    	$('#slider'+featureDisplay.index).slider('option', 'max', sequenceLength);
    	$('#slider'+featureDisplay.index).slider('option', 'step', featureDisplay.basesDisplayWidth/2);
    	$('#slider'+featureDisplay.index).slider('option', 'value', featureDisplay.leftBase);
    	featureDisplay.firstTime = false;
	}

    if(showGC || showAG || showOther) {
    	drawContentGraphs(featureDisplay, showAG, showGC, showOther);
    }
    
    positionFeatureList(featureDisplay);
    
    return;
};