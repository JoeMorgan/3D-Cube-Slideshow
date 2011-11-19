/*global alert: false, confirm: false, console: false, Debug: false, $: false, jQuery: false, $V: false, $M: false, $L: false, $P: false, Matrix: false, window: false, DlHighlight: false */
// The preceding comment prevents JSLint from showing warnings about commonly used global variables

// Tells the browser to use ES5 strict mode, if supported; WARNING: MAKE SURE YOU UNDERSTAND THE IMPLICATIONS OF THIS BEFORE INCLUDING
"use strict";

(function($){
	var degToRad = function(degrees){
			return degrees * Math.PI / 180;
		},
		jmModal,
		deck = {
			"viewport":			$(".viewport"),
			"cubeRefs":			[],
			"currentMatrix":	Matrix.I(4),
			"switchTimer":		null,
			"rotationMatrices":	{
				"rotateRight":		Matrix.RotationY(degToRad(90)),	
				"rotateLeft":		Matrix.RotationY(degToRad(-90)),	
				"rotateForward":	Matrix.RotationX(degToRad(90)),	
				"rotateBack":		Matrix.RotationX(degToRad(-90)),
				"rotateCW":			Matrix.RotationZ(degToRad(-90)),
				"rotateCCW":		Matrix.RotationZ(degToRad(90))				
			},
			"stateMatrices":	[		// Each of these matrices represents the "right-side-up" state of a particular cube-face
				$M([					// Front
					[1, 0, 0, 0],
					[0, 1, 0, 0],
					[0, 0, 1, 0],
					[0, 0, 0, 1]
				]),
				$M([					// Right
					[0, 0, 1, 0],
					[0, 1, 0, 0],
					[-1, 0, 0, 0],
					[0, 0, 0, 1]
				]),
				$M([					// Top
					[0, 1, 0, 0],
					[0, 0, -1, 0],
					[-1, 0, 0, 0],
					[0, 0, 0, 1]
				]),
				$M([					// Back
					[0, 1, 0, 0],
					[1, 0, 0, 0],
					[0, 0, -1, 0],
					[0, 0, 0, 1]
				]),
				$M([					// Left
					[0, 0, -1, 0],
					[1, 0, 0, 0],
					[0, -1, 0, 0],
					[0, 0, 0, 1]
				]),
				$M([					// Bottom
					[1, 0, 0, 0],
					[0, 0, 1, 0],
					[0, -1, 0, 0],
					[0, 0, 0, 1]
				])
			]
		};
	deck.screen		= deck.viewport.find(".screen");
	deck.cubeSet	= deck.viewport.find(".cubes");
	deck.cubeLength = deck.screen.height();

	
	// Takes a transformation matrix and constructs the appropriate CSS transform property for the cube
	function getTransformString(srcMatrix, translation){
		var translationString = translation[0] + "px, " + translation[1] + "px, " + translation[2] + "px",
			s = "perspective(1000) translate3d(" + translationString + ") matrix3d(" +
			srcMatrix.e(1,1) + "," + srcMatrix.e(1,2) + "," + srcMatrix.e(1,3) + "," + srcMatrix.e(1,4) + "," +
			srcMatrix.e(2,1) + "," + srcMatrix.e(2,2) + "," + srcMatrix.e(2,3) + "," + srcMatrix.e(2,4) + "," +
			srcMatrix.e(3,1) + "," + srcMatrix.e(3,2) + "," + srcMatrix.e(3,3) + "," + srcMatrix.e(3,4) + "," +
			srcMatrix.e(4,1) + "," + srcMatrix.e(4,2) + "," + srcMatrix.e(4,3) + "," + srcMatrix.e(4,4) +
			")";		
		return s;
	}
	
	// Fixes each position of a matrix to ten places past the decimal, at maximum
	function fixMatrix(srcMatrix){
		var tempMatrix = [
			[srcMatrix.e(1,1).toFixed(10), srcMatrix.e(1,2).toFixed(10), srcMatrix.e(1,3).toFixed(10), srcMatrix.e(1,4).toFixed(10)],
			[srcMatrix.e(2,1).toFixed(10), srcMatrix.e(2,2).toFixed(10), srcMatrix.e(2,3).toFixed(10), srcMatrix.e(2,4).toFixed(10)],
			[srcMatrix.e(3,1).toFixed(10), srcMatrix.e(3,2).toFixed(10), srcMatrix.e(3,3).toFixed(10), srcMatrix.e(3,4).toFixed(10)],
			[srcMatrix.e(4,1).toFixed(10), srcMatrix.e(4,2).toFixed(10), srcMatrix.e(4,3).toFixed(10), srcMatrix.e(4,4).toFixed(10)]
		];
		return $M(tempMatrix);		
	}
	
	// The output of a matrix is a 3 by 3 matrix, so this function fills any missing matrix positions with corresponding values from the identity matrix 
	function fillMatrix(srcMatrix){
		var tempMatrix = [
			[srcMatrix.e(1,1) || 1, srcMatrix.e(1,2) || 0, srcMatrix.e(1,3) || 0, srcMatrix.e(1,4) || 0],
			[srcMatrix.e(2,1) || 0, srcMatrix.e(2,2) || 1, srcMatrix.e(2,3) || 0, srcMatrix.e(2,4) || 0],
			[srcMatrix.e(3,1) || 0, srcMatrix.e(3,2) || 0, srcMatrix.e(3,3) || 1, srcMatrix.e(3,4) || 0],
			[srcMatrix.e(4,1) || 0, srcMatrix.e(4,2) || 0, srcMatrix.e(4,3) || 0, srcMatrix.e(4,4) || 1]
		];
		return $M(tempMatrix);
	}

	function Cube(cubeElemRef){
		this.currentMatrix		= Matrix.I(4);
		this.currentFaceIndex	= 0;
		this.elemRef			= cubeElemRef;
		this.faces				= this.elemRef.children();
		this.faceElemRef		= $(this.faces[this.currentFaceIndex]);
		this.isUpright			= true;
		
		return this;
	}
	
	Cube.loadScreenContent = function(cube){
		var faceContent = cube.faceElemRef.clone();
		deck.screen.html(faceContent).show();
		cube.faceElemRef.addClass("s-active-face");
	};
	
	Cube.unloadScreenContent = function(){
		
		// Clear the contents of the screen element and hide it during transition
		deck.screen.html("").hide();
		$(".s-active-face").removeClass("s-active-face");
		window.clearTimeout(deck.switchTimer);		
	};	
	
	Cube.prototype.rotate = function(target){
		var transformString,
			timer,
			cube = this;
		
		Cube.unloadScreenContent();

		
		this.updateCurrentMatrix(target);
		this.updateCurrentFace();

		
		transformString = getTransformString(this.currentMatrix, [0, 0, deck.cubeLength * -0.5]);
	
		deck.viewport.addClass("s-in-transition");
		
		
		// Bbeginning of cube rotation
		cube.elemRef.css("-webkit-transform", transformString);

		// Delays removal of the s-in-transition class to coincide with the completion of the rotation
		timer = window.setTimeout(
			function(){
				deck.viewport.removeClass("s-in-transition");
			},
			700
		);
		if(cube.isUpright){
			// Delays switching and display of "screen" content to coincide with completion of CSS transitions
			deck.switchTimer = window.setTimeout(
				function(){
					Cube.loadScreenContent(cube);
				},
				750
			);			
		}
	};
	
	Cube.prototype.updateCurrentMatrix = function(target){
		this.currentMatrix = 
			target.constructor === String ? 
			this.currentMatrix.x(fixMatrix(fillMatrix(deck.rotationMatrices[target]))) : 
			deck.stateMatrices[target];
	};
	
	
	Cube.prototype.updateCurrentFace = function(){
		var currentMatrix = this.currentMatrix,
			tempIndex = this.currentFaceIndex,
			i = 6;
		
		if(currentMatrix.e(1,3)){
			tempIndex = currentMatrix.e(1,3) === 1 ? 1 : 4;
		}else if(currentMatrix.e(2, 3)){
			tempIndex = currentMatrix.e(2,3) === 1 ? 5 : 2;
		}else{
			tempIndex = currentMatrix.e(3,3) === 1 ? 0 : 3;
		}			
		this.currentFaceIndex = tempIndex;
		this.faceElemRef = $(this.faces[tempIndex]);
			
		while(i--){
			if(currentMatrix.eql(deck.stateMatrices[i])){
				this.isUpright = true;
				return false;
			}
		}
		this.isUpright = false;
	};
	
	
	Cube.prototype.doReveal = function(){
		var reveals			= this.faceElemRef.find(".reveal:hidden"),
			screenReveals	= deck.screen.find(".reveal:hidden");
		
		
		if(reveals.length > 0){
			$(reveals[0]).show();
			$(screenReveals[0]).show();		
			return true;
		}
			
		return false;
	};
	
	Cube.prototype.next = function(){
		var nextTrigger,
			currentFaceIndex = this.currentFaceIndex;
		
		if(this.doReveal()){
			return false;
		}
		
		if(currentFaceIndex < 5){
			
			if(!this.isUpright){
				this.currentMatrix = deck.stateMatrices[currentFaceIndex];
			}			
			
			nextTrigger = this.faceElemRef.find(".s-next");
			nextTrigger.click();
		}else{
			deck.changeCubes(1);
		}
	};
	
	Cube.prototype.prev = function(){
		var prevTrigger,
			currentFaceIndex = this.currentFaceIndex;
		if(currentFaceIndex > 0){
		
			if(!this.isUpright){
				this.currentMatrix = deck.stateMatrices[currentFaceIndex];
			}
			
			prevTrigger = this.faceElemRef.find(".s-prev");
			prevTrigger.click();
		}else{
			deck.changeCubes(-1);
		}
	};
	
	
	
	deck.changeCubes = function(flag){
		var cubes		= deck.cubeRefs,
			activeCube	= deck.activeCube,
			activeRef	= activeCube.elemRef,
			activeIndex	= activeRef.index(),
			targetIndex	= Math.max(0, Math.min(cubes.length, activeIndex + flag)),
			targetCube	= cubes[targetIndex],
			targetRef	= targetCube.elemRef,
			transformString,
			timer;
		
		Cube.unloadScreenContent();		
		
		transformString = getTransformString(
			activeCube.currentMatrix, 
			[-3000 * flag, 0, -2000]
		);
		
		activeRef.css("-webkit-transform", transformString);
		
		transformString = getTransformString(
			targetCube.currentMatrix, 
			[0, 0, deck.cubeLength * -0.5]
		);
		targetRef.css("-webkit-transform", transformString);
		
		deck.activeCube = targetCube;
		
		if(targetCube.isUpright){
			deck.switchTimer = window.setTimeout(
				function(){
					Cube.loadScreenContent(targetCube);
				},
				750
			);				
		}
	};	
	
	
	(function setup(){
		var cubes		= deck.cubeSet.children(),
			i,
			numCubes;
		
		for(i = 0, numCubes = cubes.length; i < numCubes; i++){
			deck.cubeRefs.push(new Cube($(cubes[i])));
		}
		
		deck.activeCube = deck.cubeRefs[0];
		
		function handleKeyDown(e){
			switch(e.keyCode){
				case 8:		// Backspace
					e.preventDefault();
					
					deck.activeCube.prev();
					break;	
				case 32:	// Space bar
					e.preventDefault();
					
					deck.activeCube.next();
					break;
				case 33:	// Page up
					e.preventDefault();
					
					deck.changeCubes(1);					
					break;
				case 34:	// Page down
					e.preventDefault();
					
					deck.changeCubes(-1);				
					break;
				case 35:	// End
					e.preventDefault();
					
					deck.activeCube.rotate("rotateCW", true);	
					break;
				case 36:	// Home
					e.preventDefault();
					
					deck.activeCube.rotate("rotateCCW", true);
					break;													
				case 37:	// Left
					e.preventDefault();
					deck.activeCube.rotate("rotateLeft");
					break;
				case 38:	// Up
					e.preventDefault();
					
					deck.activeCube.rotate("rotateForward");
					break;
				case 39:	// Right
					e.preventDefault();
					
					deck.activeCube.rotate("rotateRight");
					break;
				case 40:	// Down
					e.preventDefault();
					
					deck.activeCube.rotate("rotateBack");
					break;
				case 49:	// 1
					e.preventDefault();
					
					deck.activeCube.rotate(0);
					break;
				case 50:	// 2
					e.preventDefault();
					
					deck.activeCube.rotate(1);
					break;
				case 51:	// 3
					e.preventDefault();
					
					deck.activeCube.rotate(2);
					break;
				case 52:	// 4
					e.preventDefault();
					
					deck.activeCube.rotate(3);
					break;
				case 53:	// 5
					e.preventDefault();
					
					deck.activeCube.rotate(4);
					break;
				case 54:	// 6
					e.preventDefault();
					
					deck.activeCube.rotate(5);
					break;
			}
		}
	
		$(window).bind("keydown", handleKeyDown);
		
		$(".arrow").live("click", function(){
			var rotationDirection	= $(this).data("action"),
				supressZoom			= rotationDirection === "rotateCW" || rotationDirection === "rotateCCW";

			deck.activeCube.rotate(rotationDirection, supressZoom);
			return false;
		});
		
	}());

	
}(jQuery));




/* ********** MODALS ********** */
(function($){
	var modal = {
		iframeModal:	$("#iframe-modal"),
		staticModal:	$("#static-modal"),
		overlay:		$("#modal-overlay")
	};
	modal.iframe = modal.iframeModal.find("iframe");

	function toggleOverlay(){
		if(modal.overlay.is(":hidden")){
			modal.overlay.fadeIn(300);
		}else{
			modal.overlay.fadeOut(300);
		}
	}
	
	function hideModal(e){
		$(".s-active-modal").removeClass("s-active-modal").fadeOut(300);
		modal.iframe.html('').attr('src', "");
		toggleOverlay();
	}
	
	function showModal(trigger, type){
		var target = modal[type + "Modal"],
			content;
		
		switch(type){
			case "iframe":

				modal.iframe.html('').attr('src', trigger.attr('href'));
				
				break;
			case "static":

				content = trigger.next(".modal-contents").clone();
				target.html(content);
				break;	
		}
		toggleOverlay();
		
		target.addClass("s-active-modal").fadeIn(300);
	}	
	
	
	/* Events */	
	modal.overlay.bind("click", function(e){
		hideModal(e);
	});	
	
	$("a.iframed").live("click", function(){
		showModal($(this), "iframe");
		return false;
	});
	$("a.static-modal").live("click", function(){
		showModal($(this), "static");
		return false;
	});
	modal.staticModal.bind("click", function(e){
		var modalReveals,
			targ = $(e.target);
		
		if(targ.hasClass("staged-content")){
			hideModal(e);
		}
	});
	$(".staged-content").live("click", function(e){
		var	self = $(this),
			modalReveals = self.find(".modal-reveal:hidden");
		if(modalReveals.length > 0){
			$(modalReveals[0]).slideDown("fast");
			self.find(".code-modal").animate(
				{scrollTop: "1000px"}, 
				500
			);
		}			
	});
/* ////////// END MODALS ////////// */	

// Syntax Highlighting
	DlHighlight.HELPERS.highlightByName("code", "pre");

}(jQuery));































