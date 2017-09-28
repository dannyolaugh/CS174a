// *******************************************************
// CS 174a Graphics Example Code
// animation.js - The main file and program start point.  The class definition here describes how to display an Animation and how it will react to key and mouse input.  Right now it has
// very little in it - you will fill it in with all your shape drawing calls and any extra key / mouse controls.

// Now go down to display() to see where the sample shapes are drawn, and to see where to fill in your own code.

"use strict"
var canvas, canvas_size, gl = null, g_addrs,
	movement = vec2(),	thrust = vec3(), 	looking = false, prev_time = 0, animate = false, animation_time = 0;
		var gouraud = false, color_normals = false, solid = false;
function CURRENT_BASIS_IS_WORTH_SHOWING(self, model_transform) { self.m_axis.draw( self.basis_id++, self.graphicsState, model_transform, new Material( vec4( .8,.3,.8,1 ), .5, 1, 1, 40, "" ) ); }


// *******************************************************
// IMPORTANT -- In the line below, add the filenames of any new images you want to include for textures!

var texture_filenames_to_load = [ "stars.png", "text.png", "earth.gif"];

// *******************************************************
// When the web page's window loads it creates an "Animation" object.  It registers itself as a displayable object to our other class "GL_Context" -- which OpenGL is told to call upon every time a
// draw / keyboard / mouse event happens.

window.onload = function init() {	var anim = new Animation();	}
function Animation()
{
	( function init (self)
	{
		self.context = new GL_Context( "gl-canvas" );
		self.context.register_display_object( self );

		gl.clearColor( 1, 0, 0, .2 );			// Background color

		for( var i = 0; i < texture_filenames_to_load.length; i++ )
			initTexture( texture_filenames_to_load[i], true );

		self.m_cube = new cube();
		self.m_obj = new shape_from_file( "teapot.obj" )
		self.m_axis = new axis();
		self.m_sphere = new sphere( mat4(), 4 );
		self.m_fan = new triangle_fan_full( 10, mat4() );
		self.m_strip = new rectangular_strip( 1, mat4() );
		self.m_cylinder = new cylindrical_strip( 10, mat4() );

		// 1st parameter is camera matrix.  2nd parameter is the projection:  The matrix that determines how depth is treated.  It projects 3D points onto a plane.
		self.graphicsState = new GraphicsState( translation(0, 0,-40), perspective(45, canvas.width/canvas.height, .1, 1000), 0 );

		gl.uniform1i( g_addrs.GOURAUD_loc, gouraud);		gl.uniform1i( g_addrs.COLOR_NORMALS_loc, color_normals);		gl.uniform1i( g_addrs.SOLID_loc, solid);

		self.context.render();
	} ) ( this );

	canvas.addEventListener('mousemove', function(e)	{		e = e || window.event;		movement = vec2( e.clientX - canvas.width/2, e.clientY - canvas.height/2, 0);	});
}

// *******************************************************
// init_keys():  Define any extra keyboard shortcuts here
Animation.prototype.init_keys = function()
{
	shortcut.add( "Space", function() { thrust[1] = -1; } );			shortcut.add( "Space", function() { thrust[1] =  0; }, {'type':'keyup'} );
	shortcut.add( "z",     function() { thrust[1] =  1; } );			shortcut.add( "z",     function() { thrust[1] =  0; }, {'type':'keyup'} );
	shortcut.add( "w",     function() { thrust[2] =  1; } );			shortcut.add( "w",     function() { thrust[2] =  0; }, {'type':'keyup'} );
	shortcut.add( "a",     function() { thrust[0] =  1; } );			shortcut.add( "a",     function() { thrust[0] =  0; }, {'type':'keyup'} );
	shortcut.add( "s",     function() { thrust[2] = -1; } );			shortcut.add( "s",     function() { thrust[2] =  0; }, {'type':'keyup'} );
	shortcut.add( "d",     function() { thrust[0] = -1; } );			shortcut.add( "d",     function() { thrust[0] =  0; }, {'type':'keyup'} );
	shortcut.add( "f",     function() { looking = !looking; } );
	shortcut.add( ",",     ( function(self) { return function() { self.graphicsState.camera_transform = mult( rotation( 3, 0, 0,  1 ), self.graphicsState.camera_transform ); }; } ) (this) ) ;
	shortcut.add( ".",     ( function(self) { return function() { self.graphicsState.camera_transform = mult( rotation( 3, 0, 0, -1 ), self.graphicsState.camera_transform ); }; } ) (this) ) ;

	shortcut.add( "r",     ( function(self) { return function() { self.graphicsState.camera_transform = mat4(); }; } ) (this) );
	shortcut.add( "ALT+s", function() { solid = !solid;					gl.uniform1i( g_addrs.SOLID_loc, solid);
																		gl.uniform4fv( g_addrs.SOLID_COLOR_loc, vec4(Math.random(), Math.random(), Math.random(), 1) );	 } );
	shortcut.add( "ALT+g", function() { gouraud = !gouraud;				gl.uniform1i( g_addrs.GOURAUD_loc, gouraud);	} );
	shortcut.add( "ALT+n", function() { color_normals = !color_normals;	gl.uniform1i( g_addrs.COLOR_NORMALS_loc, color_normals);	} );
	shortcut.add( "ALT+a", function() { animate = !animate; } );

	shortcut.add( "p",     ( function(self) { return function() { self.m_axis.basis_selection++; console.log("Selected Basis: " + self.m_axis.basis_selection ); }; } ) (this) );
	shortcut.add( "m",     ( function(self) { return function() { self.m_axis.basis_selection--; console.log("Selected Basis: " + self.m_axis.basis_selection ); }; } ) (this) );
}

function update_camera( self, animation_delta_time )
	{
		var leeway = 70, border = 50;
		var degrees_per_frame = .0002 * animation_delta_time;
		var meters_per_frame  = .01 * animation_delta_time;
																					// Determine camera rotation movement first
		var movement_plus  = [ movement[0] + leeway, movement[1] + leeway ];		// movement[] is mouse position relative to canvas center; leeway is a tolerance from the center.
		var movement_minus = [ movement[0] - leeway, movement[1] - leeway ];
		var outside_border = false;

		for( var i = 0; i < 2; i++ )
			if ( Math.abs( movement[i] ) > canvas_size[i]/2 - border )	outside_border = true;		// Stop steering if we're on the outer edge of the canvas.

		for( var i = 0; looking && outside_border == false && i < 2; i++ )			// Steer according to "movement" vector, but don't start increasing until outside a leeway window from the center.
		{
			var velocity = ( ( movement_minus[i] > 0 && movement_minus[i] ) || ( movement_plus[i] < 0 && movement_plus[i] ) ) * degrees_per_frame;	// Use movement's quantity unless the &&'s zero it out
			self.graphicsState.camera_transform = mult( rotation( velocity, i, 1-i, 0 ), self.graphicsState.camera_transform );			// On X step, rotate around Y axis, and vice versa.
		}
		self.graphicsState.camera_transform = mult( translation( scale_vec( meters_per_frame, thrust ) ), self.graphicsState.camera_transform );		// Now translation movement of camera, applied in local camera coordinate frame
	}

//********************************************************
//my functions defined here

Animation.prototype.draw_ground = function(model_transform, green)
{
	model_transform = mult( model_transform, scale( 150, 1, 100) );		// Position the next shape by post-multiplying another matrix onto the current matrix product
		model_transform = mult( model_transform, translation(0, -1, 0));
			this.m_cube.draw( this.graphicsState, model_transform, green );
}

Animation.prototype.draw_tree = function(model_transform, color, part)
{
	if(part == "stem")
	{
		model_transform = mult(model_transform, scale(.33, 1, .33));
			this.m_cube.draw( this.graphicsState, model_transform, color);
	}
	if(part == "foliage")
	{
		model_transform = mult(model_transform, scale(2, 2, 2));
			model_transform = mult(model_transform, translation(0, .75, 0));
				this.m_sphere.draw(this.graphicsState, model_transform, color);
	}
}

Animation.prototype.draw_bee = function(model_transform, color, part)
{
	var wing_angle = (Math.sin((this.graphicsState.animation_time / 500)));

	if(part == "center_body")
	{
		model_transform = mult(model_transform, translation(0, 4, 12));   //translate
			model_transform = mult(model_transform, scale(2.5, 1, 1)); //scale
				this.m_cube.draw(this.graphicsState, model_transform, color);
	}
	else if(part == "bee-hind")
	{
		model_transform = mult(model_transform, translation(3.5, 4, 12));
			model_transform = mult(model_transform, scale(2.25, 1, 1));
				this.m_sphere.draw(this.graphicsState, model_transform, color);
	}
	else if(part == "head")
	{
		model_transform = mult(model_transform, translation(-1.75, 4, 12));
			model_transform = mult(model_transform, scale(.5, .5, .5));
				this.m_sphere.draw(this.graphicsState, model_transform, color);
	}
	else if(part == "left_wing")
	{
		model_transform = mult(model_transform, translation(0, 4.5, 12.5));
			model_transform = mult(model_transform, rotation(180, 0, 1, 0)); //rotate the wing around so it pivots in the correct side
				model_transform = mult(model_transform, rotation(-90, 1, 0, 0));  //rotates back
					model_transform = mult(model_transform, rotation(45 * wing_angle, 1, 0, 0));
						model_transform = mult(model_transform, translation(0, 2, 0));  //translates the now vertical wing to rest directly above the origin
							model_transform = mult(model_transform, rotation(90, 1, 0, 0));  //rotates wing
								model_transform = mult(model_transform, translation(0, .075, 0)); //bc the thickness is .15 so .075 above and below origin, want it to rest literally right above origin
									model_transform = mult(model_transform, scale(1.5, .15, 4))
										this.m_cube.draw(this.graphicsState, model_transform, color);
	}
	else if(part == "right_wing")
	{
		model_transform = mult(model_transform, translation(0, 4.5, 11.5));
			model_transform = mult(model_transform, rotation(-90, 1, 0, 0));  //rotates back
				model_transform = mult(model_transform, rotation(45 * wing_angle, 1, 0, 0));
					model_transform = mult(model_transform, translation(0, 2, 0));  //translates the now vertical wing to rest directly above the origin
						model_transform = mult(model_transform, rotation(90, 1, 0, 0));  //rotates wing
							model_transform = mult(model_transform, translation(0, .075, 0)); //bc the thickness is .15 so .075 above and below origin, want it to rest literally right above origin
								model_transform = mult(model_transform, scale(1.5, .15, 4))
									this.m_cube.draw(this.graphicsState, model_transform, color);
	}
	else if(part == "upper_right_legs")
	{
		this.m_cube.draw(this.graphicsState, model_transform, color);
	}
	else if(part == "upper_left_legs")
	{
		this.m_cube.draw(this.graphicsState, model_transform, color);
	}
	else if(part == "lower_right_legs")
	{
		this.m_cube.draw(this.graphicsState, model_transform, color);
	}
	else if(part == "lower_left_legs")
	{
		this.m_cube.draw(this.graphicsState, model_transform, color);
	}
}

//********************************************************

// *******************************************************
// display(): called once per frame, whenever OpenGL decides it's time to redraw.

Animation.prototype.display = function(time)
	{
		if(!time) time = 0;
		this.animation_delta_time = time - prev_time;
		if(animate) this.graphicsState.animation_time += this.animation_delta_time;
		prev_time = time;

		update_camera( this, this.animation_delta_time );

		this.basis_id = 0;

		var model_transform = mat4();

		// Materials: Declare new ones as needed in every function.
		// 1st parameter:  Color (4 floats in RGBA format), 2nd: Ambient light, 3rd: Diffuse reflectivity, 4th: Specular reflectivity, 5th: Smoothness exponent, 6th: Texture image.
		var purplePlastic = new Material(vec4(.9,.5,.9,1 ), .2, .5, .8, 40), // Omit the final (string) parameter if you want no texture
			greyPlastic = new Material(vec4(.5,.5,.5,1 ), .2, .8, .5, 20),
			earth = new Material(vec4(.5,.5,.5,1 ), .5, 1, .5, 40, "earth.gif"),
			stars = new Material(vec4(.5,.5,.5,1 ), .5, 1, 1, 40, "stars.png"),
			green = new Material(vec4(1, 2, 0, .8), .2, .5, .8, 40),
			brown = new Material(vec4(1, 1, 0, 1), .2, .5, .8, 40),
			red = new Material(vec4(1, .1, 0, 1), .2, .5, .8, 40),
			yellow = new Material(vec4(1, .8, 0, 1), .2, .5, .8, 40);


		/**********************************
		Start coding here!!!!
		**********************************/

	  var stack = [];
		var i;
		var part;

		this.draw_ground(model_transform, green);

		var oscillation_angle = 4*Math.sin(this.graphicsState.animation_time/1100);

		//construct the stem
		part = "stem";
		for(i=0; i < 8; i++)
		{
			stack.push(model_transform);
			model_transform = mult( model_transform, rotation(oscillation_angle, 0, 0, 1));
				this.draw_tree(model_transform, earth, part);

			stack.push(model_transform);
			model_transform = mult(model_transform, translation(0, 1, 0));
		}

		//construct the leaves
		part = "foliage";
		this.draw_tree(model_transform, red, part);

		for(i=0; i < 16; i++)
		{
			model_transform = stack.pop();  //so that we can start from the origin again
		}

		//construct the Bee

		var bee_oscillation_angle = 1.5*Math.sin(this.graphicsState.animation_time/500);
		var bee_oscillation = mult(model_transform, translation(0, bee_oscillation_angle, 0));

		model_transform = bee_oscillation;
		model_transform = mult(model_transform, rotation(this.graphicsState.animation_time/20, 0, -1, 0));

		part = "center_body";
		this.draw_bee(model_transform, greyPlastic, part);

		part = "bee-hind";
		this.draw_bee(model_transform, yellow, part);

		part = "head";
		this.draw_bee(model_transform, purplePlastic, part);

		part = "left_wing";
		this.draw_bee(model_transform, greyPlastic, part);

		part = "right_wing";
		this.draw_bee(model_transform, greyPlastic, part);

		part = "upper_right_legs";
		var leg_angle = Math.sin((this.graphicsState.animation_time / 500));  //take away the 35

		var x, y, z;
		var counter = -.66;  //this determines the separation of the legs

		for(x = 0; x < 3; x++)
		{
			for(z = 0; z < 5; z++)
			{
				stack.push(model_transform);
			}

			model_transform = mult(model_transform, translation(counter, 3.5, 11.5));
				model_transform = mult(model_transform, rotation(180, 1, 0, 0));
					model_transform = mult(model_transform, rotation(20 * leg_angle, 1, 0, 0));
						model_transform = mult(model_transform, translation(0, .5, .165));
							model_transform = mult(model_transform, scale(.33, 1, .33));
								this.draw_bee(model_transform, yellow, part);

								model_transform = mult(model_transform, scale(1/.33, 1, 1/.33));
								model_transform = mult(model_transform, translation(0, .5, 0));//11.5
								model_transform = mult(model_transform, translation(0, 0, -.165));
								model_transform = mult(model_transform, rotation(20 * leg_angle - 20, 1, 0, 0));
								model_transform = mult(model_transform, translation(0, 0, .165));
								model_transform = mult(model_transform, translation(0, .5, 0));//11.5
								model_transform = mult(model_transform, scale(.33, 1, .33));
								this.draw_bee(model_transform, yellow, part);

			for(y = 0; y < 5; y++)
			{
				model_transform = stack.pop();
			}
			counter += .66;
		}

		part = "upper_left_legs";
		var a, b, c;
		counter = -.66;

		for(a = 0; a < 3; a++)
		{
			for(c = 0; c < 5; c++)
			{
				stack.push(model_transform);
			}

			model_transform = mult(model_transform, translation(counter, 3.5, 12.5));
				model_transform = mult(model_transform, rotation(180, 1, 0, 0));
					model_transform = mult(model_transform, rotation(-20 * leg_angle, 1, 0, 0));
						model_transform = mult(model_transform, translation(0, .5, -.165));
							model_transform = mult(model_transform, scale(.33, 1, .33));
								this.draw_bee(model_transform, yellow, part);

								model_transform = mult(model_transform, scale(1/.33, 1, 1/.33));
								model_transform = mult(model_transform, translation(0, .5, 0));
								model_transform = mult(model_transform, translation(0, 0, .165));
								model_transform = mult(model_transform, rotation(-20 * leg_angle + 20, 1, 0, 0));
								model_transform = mult(model_transform, translation(0, 0, -.165));
								model_transform = mult(model_transform, translation(0, .5, 0));
								model_transform = mult(model_transform, scale(.33, 1, .33));
								this.draw_bee(model_transform, yellow, part);

			for(b = 0; b < 5; b++)
			{
				model_transform = stack.pop();
			}
			counter += .66;
		}
	}



Animation.prototype.update_strings = function( debug_screen_strings )		// Strings this particular class contributes to the UI
{
	debug_screen_strings.string_map["time"] = "Animation Time: " + this.graphicsState.animation_time/1000 + "s";
	debug_screen_strings.string_map["basis"] = "Showing basis: " + this.m_axis.basis_selection;
	debug_screen_strings.string_map["animate"] = "Animation " + (animate ? "on" : "off") ;
	debug_screen_strings.string_map["thrust"] = "Thrust: " + thrust;
}
