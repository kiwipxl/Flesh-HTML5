/// <reference path="../lib-ts/pixi.js.d.ts" />
/// <reference path="../lib-ts/box2d.ts.d.ts"/>

class Square {

	base: PIXI.Sprite;
	angle: number;
};

var stage: PIXI.Container;
var renderer: PIXI.CanvasRenderer | PIXI.WebGLRenderer;
const padding = 15;
var squares: Square[] = [];
var container: PIXI.ParticleContainer;
var is_adding: boolean;
var dest_scale: number = 1;
var game_layer: PIXI.Container;
var ui_layer: PIXI.Container;
var terrain_container: TerrainContainer;

var world: box2d.b2World;
var bunny: PIXI.Sprite;

var ground_body: box2d.b2Body;
var ground_box_shape: box2d.b2PolygonShape;
var graphics: PIXI.Graphics;

window.onresize = function() {
	resize_canvas();
}
function resize_canvas() {
	var w = window.innerWidth - padding;
	var h = window.innerHeight - padding;
	renderer.view.style.width = w + "px";
	renderer.view.style.height = h + "px";
	renderer.resize(w, h);
	console.log("resize: " + renderer.width + "x" + renderer.height);
}

function spawn_square(amount: number) {
	for (var n = 0; n < amount; ++n) {
		var square = new Square();
		square.base = new PIXI.Sprite(texture_bunny);

		square.base.x = Math.random() * renderer.width;
		square.base.y = Math.random() * renderer.height;

		square.angle = Math.random() * Math.PI * 2.0;

		container.addChild(square.base);
		squares.push(square);
	}
}

window.onload = function() {
	// create a renderer instance
	renderer = new PIXI.WebGLRenderer(400, 300, {antialias: false});
	renderer.backgroundColor = 0x99ff77;
	document.body.appendChild(renderer.view);

	stage = new PIXI.Container();
	game_layer = new PIXI.Container();
	ui_layer = new PIXI.Container();
	stage.addChild(game_layer);
	stage.addChild(ui_layer);

	resize_canvas();

	container = new PIXI.ParticleContainer(100000, [false, true, false, false, false]);
	game_layer.addChild(container);

	console.log("initialising assets...");
	init_assets(function() {
		console.log("assets initialised");

		var terrain_arr = JSON.parse(raw_terrain).terrain;
		terrain_container = new TerrainContainer(terrain_arr);
		game_layer.addChild(terrain_container.container);
		game_layer.x = renderer.width / 2.0;
		game_layer.y = renderer.height / 2.0;
		game_layer.pivot.x = game_layer.width / 2.0;
		game_layer.pivot.y = game_layer.height / 2.0;

		document.ontouchstart = mouse_down;
		document.ontouchend = mouse_up;
		document.onmousedown = mouse_down;
		document.onmouseup = mouse_up;

		document.onkeydown = key_down;

		bunny = new PIXI.Sprite(texture_bunny);
		ui_layer.addChild(bunny);

		world = new box2d.b2World(new box2d.b2Vec2(0.0, 9.8));

		var body_def = new box2d.b2BodyDef();
		body_def.position.SetXY(0.0, 200.0);

		var body = world.CreateBody(body_def);
		body.SetAngleRadians(45 / (180 / Math.PI));

		var box_shape = new box2d.b2PolygonShape();
		box_shape.SetAsBox(100.0, 40.0);

		var fixture = new box2d.b2FixtureDef();
		fixture.shape = box_shape;
		body.CreateFixture(fixture);



		var ground_body_def = new box2d.b2BodyDef();
		ground_body_def.type = box2d.b2BodyType.b2_dynamicBody;

		ground_body = world.CreateBody(ground_body_def);

		ground_box_shape = new box2d.b2PolygonShape();
		ground_box_shape.SetAsBox(32, 32);

		var ground_fixture = new box2d.b2FixtureDef();
		ground_fixture.shape = ground_box_shape;
		ground_fixture.density = .5;
		ground_fixture.friction = .5;
		ground_fixture.restitution = .8;

		ground_body.CreateFixture(ground_fixture);
		ground_body.m_mass = 0;
		ground_body.SetFixedRotation(true);
		console.log(ground_body_def);

		graphics = new PIXI.Graphics();
		ui_layer.addChild(graphics);

		spawn_square(1);
		game_loop();
	});
}

function key_down(e) {
	e = e || window.event;

	if (e.keyCode == 187) {
		dest_scale += .1;
	}else if (e.keyCode == 189) {
		dest_scale -= .1;
	}
	dest_scale = (dest_scale < .5 ) ? .5 : dest_scale;
	dest_scale = (dest_scale > 2) ? 2 : dest_scale;
}

function mouse_down() {
	is_adding = true;
}

function mouse_up() {
	is_adding = false;
}

var fps = 0;
var fps_accum = 0;
var ms_accum = 0;
var frame_count = 0;
var dt = 0;
var time_step = 1.0 / 60.0;
setInterval(function() {
	console.log("fps: " + Math.round(fps_accum / frame_count) + ", ms: " + Math.round(ms_accum / frame_count) + ", squares: " + squares.length);
	fps_accum = 0;
	ms_accum = 0;
	frame_count = 0;
}, 1000);

function game_loop() {
	var start_time = new Date().getTime();

	//only for collision, the higher the value, the better collision
	//accuracy at the cost of performance
	var vel_iterations = 6;
	var pos_iterations = 2;

	world.Step(time_step, vel_iterations, pos_iterations);

	var pos = ground_body.GetPosition();
	var angle = ground_body.GetAngleRadians();

	bunny.x = pos.x;
	bunny.y = pos.y;

	graphics.clear();
	graphics.beginFill(0x00ff00);
	graphics.fillAlpha = .4;
	graphics.lineStyle(1, 0x000000, .4);

	var x = pos.x;
	var y = pos.y;
	var w = 32;
	var h = 32;
	var origin_x = w / 2.0;
	var origin_y = h / 2.0;
	var c = Math.cos(angle);
	var s = Math.sin(angle);
	x += origin_x;
	y += origin_y;
	w -= origin_x;
	h -= origin_y;
	origin_x = -origin_x;
	origin_y = -origin_y;
	graphics.moveTo(x + ((c * origin_x) - (s * origin_y)), y + ((s * origin_x) + (c * origin_y)));
	graphics.lineTo(x + ((c * w) - (s * origin_y)), y + ((s * w) + (c * origin_y)));
	graphics.lineTo(x + ((c * w) - (s * h)), y + ((s * w) + (c * h)));
	graphics.lineTo(x + ((c * origin_x) - (s * h)), y + ((s * origin_x) + (c * h)));
	var mesh = terrain_container.terrain_list[1].fill_mesh;
	var vertices = mesh.get_static_vertices();
	var indices = mesh.get_static_indices();
	var s = 20.0;
	for (var n = 0; n < indices.length; ++n) {
		var i = Number(indices[n]) * 2;
		if (n % 3 == 0) {
			graphics.moveTo(Number(vertices[i]) * s, Number(vertices[i + 1]) * s);
		}else {
			graphics.lineTo(Number(vertices[i]) * s, Number(vertices[i + 1]) * s);
		}
		if (n % 3 == 2) {
			i = Number(indices[n - 2]) * 2;
			graphics.lineTo(Number(vertices[i]) * s, Number(vertices[i + 1]) * s);
		}
	}
	graphics.endFill();

	game_layer.scale.x -= (game_layer.scale.x - dest_scale) / 4.0;
	game_layer.scale.y -= (game_layer.scale.y - dest_scale) / 4.0;
	ui_layer.scale = game_layer.scale;

	if (is_adding) {
		spawn_square(100);
	}

	for (var n = 0; n < squares.length; ++n) {
		var square = squares[n];
		if (square.base.position.x < 0 || square.base.position.x > renderer.width - square.base.width) {
			square.angle = -square.angle + Math.PI;
		}
		if (square.base.position.y < 0 || square.base.position.y > renderer.height - square.base.height) {
			square.angle = -square.angle;
		}
		square.base.position.x += Math.cos(square.angle) * 4.0;
		square.base.position.y += Math.sin(square.angle) * 4.0;
	}

	renderer.render(stage);

	dt = new Date().getTime() - start_time;
	fps = 60;
	if (dt >= time_step * 1000.0) fps = 1000.0 / dt;
	fps_accum += fps;
	ms_accum += dt;
	++frame_count;
	if (dt >= time_step * 1000.0) {
		setTimeout(game_loop, 0);
	}else {
		setTimeout(game_loop, (time_step * 1000.0) - dt);
	}
}
