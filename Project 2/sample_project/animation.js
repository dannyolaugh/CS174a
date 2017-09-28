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

var plane_move_var = vec3();
var plane = {value: mat4()};
var j = 0;
var i = 0;
var x = 0;
var angle = 0;
var global_count = 0;
var lift_increment = 0;
var turn_increment = 0;
var rotate_increment = 0;
var camera_rotate = 0;
var undo_forward_motion = 0;
var position_holder = mat4();
var land_increment = 0;
var position2 = mat4();


// *******************************************************
// IMPORTANT -- In the line below, add the filenames of any new images you want to include for textures!

var texture_filenames_to_load = [ "stars.png", "text.png", "earth.gif", "storm.jpg", "runway.jpg", "sky.jpg", "water.jpg", "sand.jpg", "cone.jpg", "glass.png"];

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

		gl.clearColor( 0, .1, 1, .4 );			// Background color

		for( var i = 0; i < texture_filenames_to_load.length; i++ )
			initTexture( texture_filenames_to_load[i], true );

		self.m_cube = new cube();
		self.m_obj = new shape_from_file( "teapot.obj" )
		self.m_axis = new axis();
		self.m_sphere = new sphere( mat4(), 4 );
		self.m_fan = new triangle_fan_full( 10, mat4() );
		self.m_strip = new rectangular_strip( 1, mat4() );
		self.m_cylinder = new cylindrical_strip( 10, mat4() );
		self.m_triangle = new triangle();
		self.m_windmill = new windmill(5);
		self.m_pyramid = new triangle(mat4());

		// 1st parameter is camera matrix.  2nd parameter is the projection:  The matrix that determines how depth is treated.  It projects 3D points onto a plane.
		self.graphicsState = new GraphicsState( translation(0, 0,-40), perspective(45, canvas.width/canvas.height, .1, 1000), 0 ); //change back to zero

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
  shortcut.add( "up",    function() { plane_move[1] = 1; moving = true; } );			shortcut.add( "up", function() { plane_move[1] =  0; moving = true;}, {'type':'keyup'} );

	//shortcut.add("up", plane_move[1] =  1; } );			shortcut.add( "up",     function() { thrust[0] =  0; }, {'type':'keyup'} );
}

function update_camera(self, animation_delta_time)
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
Animation.prototype.draw_ground = function(model_transform, color1, color2)
{
	model_transform = mult(model_transform, translation(0, -2, 0));
	model_transform = mult(model_transform, scale(60, 1, 300));
  this.m_cube.draw(this.graphicsState, model_transform, color1);
	model_transform = mult(model_transform, scale(1/60, 1, 1/300));

	model_transform = mult(model_transform, translation(0, .01, 0));
	model_transform = mult(model_transform, scale(1, 1, 300));
	this.m_cube.draw(this.graphicsState, model_transform, color2);
}

Animation.prototype.draw_sky = function(model_transform, color)
{
//	model_transform = mult(model_transform, rotation(90, 1, 0, 0));
	model_transform = mult(model_transform, scale(800, 800, 800));
	this.m_sphere.draw(this.graphicsState, model_transform, color);
}

Animation.prototype.draw_plane = function(model_transform, color, part)
{
	var stack = [];

	if(part == "body")
	{
		model_transform = mult(model_transform, scale(1, 1, 6));
		this.m_sphere.draw(this.graphicsState, model_transform, color);
	}
	else if(part == "window")
	{
		model_transform = mult(model_transform, translation(0, .75, 0));
		model_transform = mult(model_transform, scale(.75, 1, 2));
		this.m_sphere.draw(this.graphicsState, model_transform, color);
	}
	else if(part == "propeller")
	{
		stack.push(model_transform);
		model_transform = mult(model_transform, translation(-4, -.5, -2.2));  //outer right
		model_transform = mult(model_transform, rotation(-90, 1, 0, 0));
		model_transform = mult(model_transform, rotation(this.graphicsState.animation_time/10, 0, 1, 0));
		model_transform = mult(model_transform, scale(.7, .1, .7));
		this.m_windmill.draw(this.graphicsState, model_transform, color);

		model_transform = stack.pop();
		stack.push(model_transform);
		model_transform = mult(model_transform, translation(4, -.5, -2.2));  //outer left
		model_transform = mult(model_transform, rotation(-90, 1, 0, 0));
		model_transform = mult(model_transform, rotation(this.graphicsState.animation_time/10, 0, 1, 0));
		model_transform = mult(model_transform, scale(.7, .1, .7));
		this.m_windmill.draw(this.graphicsState, model_transform, color);

		model_transform = stack.pop();
		stack.push(model_transform);
		model_transform = mult(model_transform, translation(-2, -.5, -2.7));  //inner right
		model_transform = mult(model_transform, rotation(-90, 1, 0, 0));
		model_transform = mult(model_transform, rotation(this.graphicsState.animation_time/10, 0, 1, 0));
		model_transform = mult(model_transform, scale(.7, .1, .7));
		this.m_windmill.draw(this.graphicsState, model_transform, color);

		model_transform = stack.pop();
		stack.push(model_transform);
		model_transform = mult(model_transform, translation(2, -.5, -2.7));  //inner left
		model_transform = mult(model_transform, rotation(-90, 1, 0, 0));
		model_transform = mult(model_transform, rotation(this.graphicsState.animation_time/10, 0, 1, 0));
		model_transform = mult(model_transform, scale(.7, .1, .7));
		this.m_windmill.draw(this.graphicsState, model_transform, color);

		model_transform = stack.pop();   //back engine
		stack.push(model_transform);
		model_transform = mult(model_transform, translation(0, 0, 6));  //inner left
		model_transform = mult(model_transform, rotation(90, 1, 0, 0));
		model_transform = mult(model_transform, rotation(this.graphicsState.animation_time/10, 0, 1, 0));
		model_transform = mult(model_transform, scale(.5, .1, .5));
		this.m_windmill.draw(this.graphicsState, model_transform, color);

	}
	else if(part == "wings")
	{
		//make base rctangles of the wings
		stack.push(model_transform);  //pushes the identity matrix
		model_transform = mult(model_transform, translation(-3.75, 0, -1));
		model_transform = mult(model_transform, rotation(15, 0, 1, 0));
		model_transform = mult(model_transform, scale(7, .3, 2));
		this.m_cube.draw(this.graphicsState, model_transform, color);

		model_transform = stack.pop();
		stack.push(model_transform);   //make the base rectangles of the wing
		model_transform = mult(model_transform, translation(3.75, 0, -1));
		model_transform = mult(model_transform, rotation(-15, 0, 1, 0));
		model_transform = mult(model_transform, scale(7, .3, 2));
		this.m_cube.draw(this.graphicsState, model_transform, color);

		model_transform = stack.pop();
		stack.push(model_transform); //add rectangles to each side to make more triangular
		model_transform = mult(model_transform, translation(-3.75, 0, -.15));
		model_transform = mult(model_transform, scale(6.0, .3, 2));
		this.m_cube.draw(this.graphicsState, model_transform, color);

		model_transform = stack.pop();
		model_transform = mult(model_transform, translation(3.75, 0, -.15));
		model_transform = mult(model_transform, scale(6.0, .3, 2));
		this.m_cube.draw(this.graphicsState, model_transform, color);
	}
	else if(part == "back_wings")
	{
		stack.push(model_transform);
		model_transform = mult(model_transform, translation(1.75, 0, 4.5));
		model_transform = mult(model_transform, rotation(-15, 0, 1, 0));
		model_transform = mult(model_transform, scale(3, .3, 2));
		this.m_cube.draw(this.graphicsState, model_transform, color);

		model_transform = stack.pop();
		model_transform = mult(model_transform, translation(-1.75, 0, 4.5));
		model_transform = mult(model_transform, rotation(15, 0, 1, 0));
		model_transform = mult(model_transform, scale(3, .3, 2));
		this.m_cube.draw(this.graphicsState, model_transform, color);
	}
	else if(part == "top_fin")
	{
		stack.push(model_transform);
		model_transform = mult(model_transform, translation(0, 1, 4.5));
		model_transform = mult(model_transform, rotation(15, 1, 0, 0));
		model_transform = mult(model_transform, rotation(90, 0, 0, 1));
	  model_transform = mult(model_transform, scale(2, .3, 2));
		this.m_cube.draw(this.graphicsState, model_transform, color);

		model_transform = stack.pop();
		model_transform = mult(model_transform, translation(0, .5, 3.5));
		model_transform = mult(model_transform, rotation(90, 0, 0, 1));
		model_transform = mult(model_transform, scale(1.5, .3, 4));
		this.m_cube.draw(this.graphicsState, model_transform, color);
	}
	else if(part == "right_jet")
	{
		stack.push(model_transform);
		model_transform = mult(model_transform, translation(2, -.5, -2));
		model_transform = mult(model_transform, scale(.75, .75, .75));
		this.m_fan.draw(this.graphicsState, model_transform, color);

		model_transform = stack.pop();
		model_transform = mult(model_transform, translation(4, -.5, -1.5));
		model_transform = mult(model_transform, scale(.75, .75, .75));
		this.m_fan.draw(this.graphicsState, model_transform, color);
	}
	else if(part == "left_jet")
	{
		stack.push(model_transform);
		model_transform = mult(model_transform, translation(-2, -.5, -2));
		model_transform = mult(model_transform, scale(.75, .75, .75));
		this.m_fan.draw(this.graphicsState, model_transform, color);

		model_transform = stack.pop();
		model_transform = mult(model_transform, translation(-4, -.5, -1.5));
		model_transform = mult(model_transform, scale(.75, .75, .75));
		this.m_fan.draw(this.graphicsState, model_transform, color);
	}
	else if(part == "red_jet_circles")
	{
		stack.push(model_transform);  //right jet
		model_transform = mult(model_transform, translation(2, -.5, -2.75));
		model_transform = mult(model_transform, scale(.5, .5, 0));
		this.m_sphere.draw(this.graphicsState, model_transform, color);

		model_transform = stack.pop();  //left jet
		stack.push(model_transform);
		model_transform = mult(model_transform, translation(-2, -.5, -2.75));
		model_transform = mult(model_transform, scale(.5, .5, 0));
		this.m_sphere.draw(this.graphicsState, model_transform, color);

		model_transform = stack.pop();  //back jet
		stack.push(model_transform);
		model_transform = mult(model_transform, translation(0, 0, 6));
		model_transform = mult(model_transform, scale(.5, .5, 0));
		this.m_sphere.draw(this.graphicsState, model_transform, color);

		model_transform = stack.pop();
		stack.push(model_transform);  //back jet
		model_transform = mult(model_transform, translation(0, 0, 6.501));
		model_transform = mult(model_transform, scale(.15, .15, 0));
		this.m_sphere.draw(this.graphicsState, model_transform, color);

		model_transform = stack.pop();  //back jet
		stack.push(model_transform);
		model_transform = mult(model_transform, translation(0, 0, 7));
		model_transform = mult(model_transform, scale(.25, .25, 0));
		this.m_sphere.draw(this.graphicsState, model_transform, color);

		model_transform = stack.pop();
		stack.push(model_transform);
		model_transform = mult(model_transform, translation(4, -.5, -2.25));
		model_transform = mult(model_transform, scale(.5, .5, 0));
		this.m_fan.draw(this.graphicsState, model_transform, color);

		model_transform = stack.pop();
		model_transform = mult(model_transform, translation(-4, -.5, -2.25));
		model_transform = mult(model_transform, scale(.5, .5, 0));
		this.m_fan.draw(this.graphicsState, model_transform, color);
	}
	else if(part == "yellow_jet_circles")
	{
		stack.push(model_transform);  //back jet
		model_transform = mult(model_transform, translation(0, 0, 6.001));
		model_transform = mult(model_transform, scale(.25, .25, 0));
		this.m_sphere.draw(this.graphicsState, model_transform, color);

		model_transform = stack.pop();  //back jet
		stack.push(model_transform);
		model_transform = mult(model_transform, translation(0, 0, 6.5));
		model_transform = mult(model_transform, scale(.35, .35, 0));
		this.m_sphere.draw(this.graphicsState, model_transform, color);

		model_transform = stack.pop();
		stack.push(model_transform);  //back jet
		model_transform = mult(model_transform, translation(0, 0, 7.001));
		model_transform = mult(model_transform, scale(.1, .1, 0));
		this.m_sphere.draw(this.graphicsState, model_transform, color);

		model_transform = stack.pop();   //right jet
		stack.push(model_transform);
		model_transform = mult(model_transform, translation(2, -.5, -2.76));
		model_transform = mult(model_transform, scale(.25, .25, 0));
		this.m_sphere.draw(this.graphicsState, model_transform, color);

		model_transform = stack.pop();   //left jet
		stack.push(model_transform);
		model_transform = mult(model_transform, translation(-2, -.5, -2.76));
		model_transform = mult(model_transform, scale(.25, .25, 0));
		this.m_sphere.draw(this.graphicsState, model_transform, color);

		model_transform = stack.pop();
		stack.push(model_transform);
		model_transform = mult(model_transform, translation(4, -.5, -2.26));
		model_transform = mult(model_transform, scale(.25, .25, 0));
		this.m_fan.draw(this.graphicsState, model_transform, color);

		model_transform = stack.pop();
		model_transform = mult(model_transform, translation(-4, -.5, -2.26));
		model_transform = mult(model_transform, scale(.25, .25, 0));
		this.m_fan.draw(this.graphicsState, model_transform, color);
	}
	else if(part == "back_jet")
	{
		model_transform = mult(model_transform, translation(0, 0, 5.5));
		model_transform = mult(model_transform, rotation(180, 0, 1, 0));
		model_transform = mult(model_transform, scale(.75, .75, .75));
		this.m_fan.draw(this.graphicsState, model_transform, color);
	}
	else if(part == "blue_circle")
	{
		stack.push(model_transform);
		model_transform = mult(model_transform, translation(.16, 1.25, 4.6));
		model_transform = mult(model_transform, rotation(90, 0, 1, 0));
		model_transform = mult(model_transform, scale(.5, .5, 0));
		this.m_sphere.draw(this.graphicsState, model_transform, color);

		model_transform = stack.pop();
		model_transform = mult(model_transform, translation(-.16, 1.25, 4.6));
		model_transform = mult(model_transform, rotation(90, 0, 1, 0));
		model_transform = mult(model_transform, scale(.5, .5, 0));
		this.m_sphere.draw(this.graphicsState, model_transform, color);
	}
	else if(part == "white_circle")
	{
		stack.push(model_transform);
		model_transform = mult(model_transform, translation(.17, 1.25, 4.6));
		model_transform = mult(model_transform, rotation(90, 0, 1, 0));
		model_transform = mult(model_transform, scale(.35, .35, 0));
		this.m_sphere.draw(this.graphicsState, model_transform, color);

		model_transform = stack.pop();
		model_transform = mult(model_transform, translation(-.17, 1.25, 4.6));
		model_transform = mult(model_transform, rotation(90, 0, 1, 0));
		model_transform = mult(model_transform, scale(.35, .35, 0));
		this.m_sphere.draw(this.graphicsState, model_transform, color);
	}
	else if(part == "red_circle")
	{
		stack.push(model_transform);
		model_transform = mult(model_transform, translation(.18, 1.25, 4.6));
		model_transform = mult(model_transform, rotation(90, 0, 1, 0));
		model_transform = mult(model_transform, scale(.2, .2, 0));
		this.m_sphere.draw(this.graphicsState, model_transform, color);

		model_transform = stack.pop();
		model_transform = mult(model_transform, translation(-.18, 1.25, 4.6));
		model_transform = mult(model_transform, rotation(90, 0, 1, 0));
		model_transform = mult(model_transform, scale(.2, .2, 0));
		this.m_sphere.draw(this.graphicsState, model_transform, color);
	}
}

Animation.prototype.draw_rings = function(model_transform, color1, color2, part)
{
	if(part == "ring1" && this.graphicsState.animation_time < 10400)
	{
		model_transform = mult(model_transform, translation(0, 3, -108));
		model_transform = mult(model_transform, scale(8, 8, 4));
		this.m_cylinder.draw(this.graphicsState, model_transform, color1);
		//get the time when it passes thru and change it to green
	}
	else if(part == "ring1" && this.graphicsState.animation_time > 10400)
	{
		model_transform = mult(model_transform, translation(0, 3, -108));
		model_transform = mult(model_transform, scale(8, 8, 4));
		this.m_cylinder.draw(this.graphicsState, model_transform, color2);
		//get the time when it passes thru and change it to green
	}
	else if(part == "ring2" && this.graphicsState.animation_time < 15500)
	{
		model_transform = mult(model_transform, translation(0, 16, -250));
		model_transform = mult(model_transform, scale(8, 8, 4));
		this.m_cylinder.draw(this.graphicsState, model_transform, color1);
	}
	else if(part == "ring2" && this.graphicsState.animation_time > 15500)
	{
		model_transform = mult(model_transform, translation(0, 16, -250));
		model_transform = mult(model_transform, scale(8, 8, 4));
		this.m_cylinder.draw(this.graphicsState, model_transform, color2);
	}
	else if(part == "ring3" && this.graphicsState.animation_time < 11500)
	{
		model_transform = mult(model_transform, translation(0, 13, -135));
		model_transform = mult(model_transform, rotation(45, 1, 0, 0));
		model_transform = mult(model_transform, scale(8, 8, 4));
		this.m_cylinder.draw(this.graphicsState, model_transform, color1);
	}
	else if(part == "ring3" && this.graphicsState.animation_time > 11500)
	{
		model_transform = mult(model_transform, translation(0, 13, -135));
		model_transform = mult(model_transform, rotation(45, 1, 0, 0));
		model_transform = mult(model_transform, scale(8, 8, 4));
		this.m_cylinder.draw(this.graphicsState, model_transform, color2);
	}
	else if(part == "ring4" && this.graphicsState.animation_time < 22000)
	{
		model_transform = mult(model_transform, translation(100, 18, -360));
		model_transform = mult(model_transform, rotation(70, 0, 1, 0));
		model_transform = mult(model_transform, scale(10, 10, 4));
		this.m_cylinder.draw(this.graphicsState, model_transform, color1);
	}
	else if(part == "ring4" && this.graphicsState.animation_time > 22000)
	{
		model_transform = mult(model_transform, translation(100, 18, -360));
		model_transform = mult(model_transform, rotation(70, 0, 1, 0));
		model_transform = mult(model_transform, scale(10, 10, 4));
		this.m_cylinder.draw(this.graphicsState, model_transform, color2);
	}
}

Animation.prototype.draw_landing_strip = function(model_transform, color1, color2)
{

	model_transform = mult(model_transform, translation(275, -42, -270));
	model_transform = mult(model_transform, scale(200, 60, 300));
	this.m_sphere.draw(this.graphicsState, model_transform, color1);
}

Animation.prototype.draw_water = function(model_transform, color)
{
	model_transform = mult(model_transform, translation(0, -5, 0));
	model_transform = mult(model_transform, scale(2000, 1, 2000));
	this.m_cube.draw(this.graphicsState, model_transform, color);
}

Animation.prototype.draw_cones = function(model_transform, color)
{
	var y;
	var incrementer = 0;
	for(y = 0; y < 15; y++)
	{
		model_transform = mult(model_transform, translation(-10, -1.3, -90 + incrementer));
		this.m_pyramid.draw(this.graphicsState, model_transform, color);
		model_transform = mult(model_transform, translation(10, 1.3, 90 - incrementer));

		model_transform = mult(model_transform, translation(10, -1.3, -90 + incrementer));
		this.m_pyramid.draw(this.graphicsState, model_transform, color);
		model_transform = mult(model_transform, translation(-10, 1.3, 90 - incrementer));
		incrementer += 8;
	}
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
		model_transform = mult(model_transform, translation(0, -.5, 0));
		model_transform = mult(model_transform, rotation(180, 1, 0, 0));
		model_transform = mult(model_transform, scale(2, 2, 2));
		this.m_windmill.draw(this.graphicsState, model_transform, color);
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

		update_camera(this, this.animation_delta_time);

		this.basis_id = 0;

		var model_transform = mat4();

		// Materials: Declare new ones as needed in every function.
		// 1st parameter:  Color (4 floats in RGBA format), 2nd: Ambient light, 3rd: Diffuse reflectivity, 4th: Specular reflectivity, 5th: Smoothness exponent, 6th: Texture image.
		var purplePlastic = new Material(vec4(.9,.5,.9,1 ), .2, .5, .8, 40), // Omit the final (string) parameter if you want no texture
			greyPlastic = new Material(vec4(.7,.7,.7, 1 ), .6, .8, .5, 20),
			earth = new Material(vec4(.5,.5,.5,1 ), .5, 1, .5, 40, "earth.gif"),
			stars = new Material(vec4(.5,.5,.5,1 ), .5, 1, 1, 40, "stars.png"),
			light_green = new Material(vec4(0, .5, 0, 1), 1, .5, .8, 40),  //the 1 was .2
			green = new Material(vec4(0, .5, 0, 1), .7, .5, .8, 40),
			brown = new Material(vec4(1, 1, 0, 1), .2, .5, .8, 40),
			red = new Material(vec4(1, 0, 0, 1), 1, .5, .8, 40),
			yellow = new Material(vec4(1, .8, 0, 1), 1, .5, .8, 40),
			blue = new Material(vec4(0, 0, 1, 1), 1, .5, .8, 40),
			white = new Material(vec4(1, 1, 1, 1), 1, 1, 1, 40),
			black = new Material(vec4(0, 0, 0, .8), 1, 1, 1, 40),
			storm = new Material(vec4(.5,.5,.5, 1 ), .5, .5, 1, 40, "storm.jpg"),
			sky = new Material(vec4(.5,.5,.5, 1), .5, .5, 1, 40, "sky.jpg"),
			grass_green = new Material(vec4(0, 1, 0, .8), 1, .5, .8, 40),
			runway = new Material(vec4(0, 0, 0, 1), 1, .5, .8, 40, "runway.jpg"),
			water = new Material(vec4(.5,.5,.5, 1), .5, .5, 1, 40, "water.jpg"),
			sand = new Material(vec4(.5,.5,.5, 1), .5, .5, 1, 40, "sand.jpg"),
			cone = new Material(vec4(.5,.5,.5, 1), .5, .5, 1, 40, "cone.jpg"),
			glass = new Material(vec4(.5,.5,.5, 1), .5, .5, 1, 40, "glass.png"),
			baby_blue = new Material(vec4(0,.1,1,1), 1, 1, 1, 40);

		/**********************************
		Start coding here!!!!
		**********************************/
		var oscillation_angle = 4*Math.sin(this.graphicsState.animation_time/1100);
	  var stack = [];
		var camera_stack = [];
		var part;
		var plane_take_off = this.graphicsState.animation_time - 7000;
		var beginning_scene = this.graphicsState.animation_time - 1;
		var plane_rotate = this.graphicsState.animation_time - 6000;
		var plane_lift_off = this.graphicsState.animation_time - 11000;
		var plane_level_out = this.graphicsState.animation_time - 12000;
		var plane_turn = this.graphicsState.animation_time - 16500;
		var plane_fly_right = this.graphicsState.animation_time - 20000;
		var plane_thru_ring = this.graphicsState.animation_time - 14000;


		camera_stack.push(this.graphicsState.camera_transform);
		this.graphicsState.camera_transform = camera_stack.pop();

		this.draw_landing_strip(model_transform, sand, yellow);
		this.draw_sky(model_transform, sky);
		this.draw_ground(model_transform, black, yellow);
		this.draw_water(model_transform, water);
		this.draw_cones(model_transform, cone);

		stack.push(model_transform);
////////////////////////////////////////////////////////////////////////////////////////

		part = "stem";
		model_transform = mult(model_transform, translation(230, 13, -300));
		model_transform = mult(model_transform, scale(5, 5, 5));
		for(i=0; i < 8; i++)
		{
			model_transform = mult( model_transform, rotation(oscillation_angle, 0, 0, 1));
			this.draw_tree(model_transform, brown, part);
			model_transform = mult(model_transform, translation(0, 1, 0));
		}

		//construct the leaves
		part = "foliage";
		this.draw_tree(model_transform, light_green, part);

		model_transform = stack.pop();  //so that we can start from the origin again

		////////////////////////////////////////////////////////////////////////////////////////
		part = "ring1";
		this.draw_rings(model_transform, yellow, grass_green, part);
		part = "ring2";
		this.draw_rings(model_transform, baby_blue, grass_green, part);
		part = "ring3";
		this.draw_rings(model_transform, purplePlastic, grass_green, part);
		part = "ring4";
		this.draw_rings(model_transform, red, grass_green, part);

		if(this.graphicsState.animation_time <= 0)  // to make sure the plane starts looking at viewer
		{
			model_transform = mult(model_transform, rotation(180, 0, 1, 0));
		}
		if(plane_take_off > 0 && plane_fly_right < 0) //makes the plane start to move forward
		{
			 model_transform = mult(model_transform, translation(0, 0, -1 + j));
			 position_holder = model_transform;
			 this.graphicsState.camera_transform = mult(translation(0, 0, .5), this.graphicsState.camera_transform);
			 j-=.5;
		}
		if(plane_rotate < 0 && this.graphicsState.animation_time > 0) //while the plane is still rotating and the animation has been started
		{
			model_transform = mult(model_transform, rotation(180 + angle, 0, 1, 0));
			angle += .5;

			this.graphicsState.camera_transform = mult(translation(0, -.03, 0 ), this.graphicsState.camera_transform);
		}
		if(plane_lift_off > 0 && plane_level_out <= 0)
		{
			model_transform = mult(model_transform, translation(0, 2 + lift_increment, 0));
			model_transform = mult(model_transform, rotation(20, 1, 0, 0));
			lift_increment += .3;
		}
		if(plane_level_out > 0)
		{
			//when this gets called, model transform will be the identity because it is set to identity in the beginning of display
			model_transform = mult(model_transform, translation(0, 2 + lift_increment - .5, 0));
		}
		if(plane_turn > 0 && plane_fly_right <= 0)
		{
			this.graphicsState.camera_transform = mult(rotation(.44, 0, 1, 0), this.graphicsState.camera_transform);
			//this.graphicsState.camera_transform = mult(rotation(.3, 0, 1, 0), this.graphicsState.camera_transform);

			this.graphicsState.camera_transform = mult(translation(.7, 0, 0), this.graphicsState.camera_transform);
			//this.graphicsState.camera_transform = mult(translation(.4, 0, 0), this.graphicsState.camera_transform);
			model_transform = mult(model_transform, translation(0 + turn_increment, 0, 0));

			model_transform = mult(model_transform, rotation(5 + rotate_increment, 0 , -1, 0 ));
			model_transform = mult(model_transform, rotation(-5, 0 , 0, 1 )); //i added this
			model_transform = mult(model_transform, rotation(8, 1 , 0, 0 )); //i added this

			turn_increment += .1;
			rotate_increment += .5;
		}
		if(plane_fly_right > 0 && plane_fly_right < 8000)
		{
			//but the plane is still moving out in the negative z direction!
			model_transform = position_holder;
			model_transform = mult(model_transform, translation(0, 20, 0));

			//makes sure the plane is where its supposed to be
			model_transform = mult(model_transform, translation(0 + turn_increment - .1, 0, 0));
			model_transform = mult(model_transform, rotation(5 + rotate_increment - .5, 0 , -1, 0 ));

			//now make it fly straight to the right_jet
			model_transform = mult(model_transform, translation(0, 0, -1 + x));
			x -= .5
/* uncomment this section to follow plane
			this.graphicsState.camera_transform = inverse(model_transform);
			this.graphicsState.camera_transform = mult(translation(0, 0, -45), this.graphicsState.camera_transform);
			this.graphicsState.camera_transform = mult(translation(0, 4, 0), this.graphicsState.camera_transform);
*/
			if(plane_fly_right <= 3000)  //only want to rotate camera for 1 second
			{
			    this.graphicsState.camera_transform = lookAt(vec3(0, 25, -390), vec3(100, 25, -350), vec3(0, 1, 0)); //fix later
			}
			else if(plane_fly_right > 1000 && plane_fly_right < 10000)
			{
				this.graphicsState.camera_transform = mult(translation(.04, 0, .65), this.graphicsState.camera_transform);
			}
			position2 = model_transform;
		}
		if(plane_fly_right > 8000)
		{
			model_transform = position2;
			if(plane_fly_right > 9000 && plane_fly_right < 11500)
			{
				this.graphicsState.camera_transform = inverse(model_transform);
				this.graphicsState.camera_transform = mult(translation(0, -2, -15), this.graphicsState.camera_transform);
			}
			else if(plane_fly_right > 11500 && plane_fly_right < 13500)
			{
				this.graphicsState.camera_transform = inverse(model_transform);
				this.graphicsState.camera_transform = mult(translation(0, -4, 15), this.graphicsState.camera_transform);
				this.graphicsState.camera_transform = mult(rotation(180, 0, 1, 0), this.graphicsState.camera_transform);
				this.graphicsState.camera_transform = mult(rotation(15, 1, 0, 0), this.graphicsState.camera_transform);
			}
			else if (plane_fly_right > 13500 && plane_fly_right < 15000)
			{
				this.graphicsState.camera_transform = inverse(model_transform);
				this.graphicsState.camera_transform = mult(translation(-14, -4, 18), this.graphicsState.camera_transform);
				this.graphicsState.camera_transform = mult(rotation(-135, 0, 1, 0), this.graphicsState.camera_transform);
			}
		}

		part = "propeller";
		this.draw_plane(model_transform, greyPlastic, part);
		part = "body";
		this.draw_plane(model_transform, light_green, part);
		part = "window";
		this.draw_plane(model_transform, glass, part);
		part = "wings";
		this.draw_plane(model_transform, green, part);
		part = "back_wings";
		this.draw_plane(model_transform, green, part);
		part = "top_fin";
		this.draw_plane(model_transform, light_green, part);
		part = "right_jet";
		this.draw_plane(model_transform, light_green, part);
		part = "left_jet";
		this.draw_plane(model_transform, light_green, part);
		part = "red_jet_circles";
		this.draw_plane(model_transform, red, part);
		part = "yellow_jet_circles";
		this.draw_plane(model_transform, yellow, part);
		part = "back_jet";
		this.draw_plane(model_transform, light_green, part);
    part = "blue_circle";
		this.draw_plane(model_transform, blue, part);
		part = "white_circle";
		this.draw_plane(model_transform, white, part);
		part = "red_circle";
		this.draw_plane(model_transform, red, part);
	}



Animation.prototype.update_strings = function( debug_screen_strings )		// Strings this particular class contributes to the UI
{
	debug_screen_strings.string_map["frame"] = "FPS: " + Math.round(1/(this.animation_delta_time/1000), 1) + " fps";
/*	debug_screen_strings.string_map["time"] = "Animation Time: " + this.graphicsState.animation_time/1000 + "s";
	debug_screen_strings.string_map["basis"] = "Showing basis: " + this.m_axis.basis_selection;
	debug_screen_strings.string_map["animate"] = "Animation " + (animate ? "on" : "off") ;
	debug_screen_strings.string_map["thrust"] = "Thrust: " + thrust; */
}

//move object how you wnat then invert it for your camera matrix
