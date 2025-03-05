var canvas;
var gl;

var program;

var near = 1;
var far = 100;

var left = -6.0;
var right = 6.0;
var ytop =6.0;
var bottom = -6.0;


var lightPosition2 = vec4(700.0, 100.0, 100.0, 1.0 );
var lightPosition = vec4(200.0, 100.0, 500.0, 1.0 );


var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

var materialAmbient = vec4( 1.0, 0.0, 1.0, 1.0 );
var materialDiffuse = vec4( 1.0, 0.8, 0.0, 1.0 );
var materialSpecular = vec4( 0.4, 0.4, 0.4, 1.0 );
var materialShininess = 30.0;

var ambientColor, diffuseColor, specularColor;

var modelMatrix, viewMatrix, modelViewMatrix, projectionMatrix, normalMatrix;
var modelViewMatrixLoc, projectionMatrixLoc, normalMatrixLoc;
var eye;
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

var RX = 0;
var RY = 0;
var RZ = 0;

var MS = []; // The modeling matrix stack
var TIME = 0.0; // Realtime
var dt = 0.0
var prevTime = 0.0;
var resetTimerFlag = true;
var animFlag = false;
var controller;

// These are used to store the current state of objects.
// In animation it is often useful to think of an object as having some DOF
// Then the animation is simply evolving those DOF over time. You could very easily make a higher level object that stores these as Position, Rotation (and also Scale!)
var sphereRotation = [0,0,0];
var spherePosition = [-4,0,0];

var cubeRotation = [0,0,0];
var cubePosition = [-1,0,0];

var cylinderRotation = [0,0,0];
var cylinderPosition = [1.1,0,0];

var coneRotation = [0,0,0];
var conePosition = [3,0,0];

// Setting the colour which is needed during illumination of a surface
function setColor(c)
{
    ambientProduct = mult(lightAmbient, c);
    diffuseProduct = mult(lightDiffuse, c);
    specularProduct = mult(lightSpecular, materialSpecular);
    
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "specularProduct"),flatten(specularProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "lightPosition"),flatten(lightPosition) );
    gl.uniform1f( gl.getUniformLocation(program, 
                                        "shininess"),materialShininess );
}

window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0, 0,0 , 1.0 );
    
    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    

    setColor(materialDiffuse);
	
	// Initialize some shapes, note that the curved ones are procedural which allows you to parameterize how nice they look
	// Those number will correspond to how many sides are used to "estimate" a curved surface. More = smoother
    Cube.init(program);
    Cylinder.init(20,program);
    Cone.init(20,program);
    Sphere.init(36,program);

    // Matrix uniforms
    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    normalMatrixLoc = gl.getUniformLocation( program, "normalMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    
    // Lighting Uniforms
    gl.uniform4fv( gl.getUniformLocation(program, 
       "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "specularProduct"),flatten(specularProduct) );	
    gl.uniform4fv( gl.getUniformLocation(program, 
       "lightPosition"),flatten(lightPosition) );
    gl.uniform1f( gl.getUniformLocation(program, 
       "shininess"),materialShininess );


       animFlag = true;
       resetTimerFlag = true;
       window.requestAnimFrame(render);

    render(0);
}

// Sets the modelview and normal matrix in the shaders
function setMV() {
    modelViewMatrix = mult(viewMatrix,modelMatrix);
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    normalMatrix = inverseTranspose(modelViewMatrix);
    gl.uniformMatrix4fv(normalMatrixLoc, false, flatten(normalMatrix) );
}

// Sets the projection, modelview and normal matrix in the shaders
function setAllMatrices() {
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix) );
    setMV();   
}

// Draws a 2x2x2 cube center at the origin
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCube() {
    setMV();
    Cube.draw();
}

// Draws a sphere centered at the origin of radius 1.0.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawSphere() {
    setMV();
    Sphere.draw();
}

// Draws a cylinder along z of height 1 centered at the origin
// and radius 0.5.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCylinder() {
    setMV();
    Cylinder.draw();
}

// Draws a cone along z of height 1 centered at the origin
// and base radius 1.0.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCone() {
    setMV();
    Cone.draw();
}

// Post multiples the modelview matrix with a translation matrix
// and replaces the modeling matrix with the result, x, y, and z are the translation amounts for each axis
function gTranslate(x,y,z) {
    modelMatrix = mult(modelMatrix,translate([x,y,z]));
}

// Post multiples the modelview matrix with a rotation matrix
// and replaces the modeling matrix with the result, theta is the rotation amount, x, y, z are the components of an axis vector (angle, axis rotations!)
function gRotate(theta,x,y,z) {
    modelMatrix = mult(modelMatrix,rotate(theta,[x,y,z]));
}

// Post multiples the modelview matrix with a scaling matrix
// and replaces the modeling matrix with the result, x, y, and z are the scale amounts for each axis
function gScale(sx,sy,sz) {
    modelMatrix = mult(modelMatrix,scale(sx,sy,sz));
}

// Pops MS and stores the result as the current modelMatrix
function gPop() {
    modelMatrix = MS.pop();
}

// pushes the current modelViewMatrix in the stack MS
function gPush() {
    MS.push(modelMatrix);
}

const stars = starsinit(100);// initializing the field with 100 stars
let zPos = -9;// the depth of the stars (dont want it to touch the astro//jellyfish)
function starsinit(numStars) {
    //we are generating a set of stars with random positions and sizes 
    //heavy use of .radom here 
    const xPos =[];
    const yPos=[];
    const sizes= [];

    function randomRange(min, max) {
        // Helper function to generate a random number in a given range
        return Math.random()*(max - min) + min;
    }
    for (let i=0;i<numStars;i++) {
        xPos.push(randomRange(-6,6)); // i set a bound of 6 here , it is what worked the best !
        yPos.push(randomRange(-6,6));
        sizes.push(randomRange(0.02,0.1));
    }
    return { xPos, yPos, sizes };
}
function updateAndDrawStars(stars, dt) {
    //Updates star positions over time and draws them
    // Stars move diagonally and reset when they exit the visible area
    const { xPos,yPos, sizes} = stars;

    for (let i = 0; i < xPos.length; i++) {
        xPos[i] +=dt*0.9;
        yPos[i] +=dt*0.9;
        // as per the requirement i am REsetting the stars when they go out of the screen
        if (xPos[i] > 6||yPos[i] >6) {
            xPos[i] -= 12; //sub 12 from each (take them back))
            yPos[i] -= 12;
        }
        setColor(vec4(1.0, 1.0,1.0,1.0));
        drawspher(xPos[i], yPos[i], sizes[i]);
    }
}
function drawspher(x, y, size) {
    //draw the stars! (which are spehrs)
    gPush(); 
    gTranslate(x,y,zPos); 
    gScale(size,size,size); 
    drawSphere(); 
    gPop(); 
}


function render(timestamp) {
    
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    eye = vec3(0,0,10);
    MS = []; // Initialize modeling matrix stack
	// initialize the modeling matrix to identity
    modelMatrix = mat4();
    // set the camera matrix
    viewMatrix = lookAt(eye, at , up);
    // set the projection matrix
    projectionMatrix = ortho(left, right, bottom, ytop, near, far);
    // set all the matrices
    setAllMatrices();
	if( animFlag )
    {
		// dt is the change in time or delta time from the last frame to this one
		// in animation typically we have some property or degree of freedom we want to evolve over time
		// For example imagine x is the position of a thing.
		// To get the new position of a thing we do something called integration
		// the simpelst form of this looks like:
		// x_new = x + v*dt
		// That is, the new position equals the current position + the rate of of change of that position (often a velocity or speed) times the change in time
		// We can do this with angles or positions, the whole x,y,z position, or just one dimension. It is up to us!
		dt = (timestamp - prevTime) / 1000.0;
		prevTime = timestamp;
        sphereRotation[1] = sphereRotation[1] + 20 * dt; // Rotate 30 degrees per second
        if (sphereRotation[1] >= 360) {
            sphereRotation[1] -= 360; // Keep the angle within 0-360 degrees
	    }
    }
    if (animFlag) {
        let dt = (timestamp - prevTime) / 1000.0; // Convert delta time from milliseconds to seconds
        prevTime = timestamp;
    
        // Example: Update position
        spherePosition[0] += 0.05 * dt; // Move the sphere in the X-axis
        if (spherePosition[0] > 9) spherePosition[0] = -9; // Loop the position
    }

    updateAndDrawStars(stars, dt);// calling the stars 


    spherePosition[0]= 0.6* Math.sin((0.6*timestamp/1000)); //these will move the atsro up and down in a sinusoidal motion
    spherePosition[1]= 0.6* Math.sin((0.6*timestamp/1000)); //
    gTranslate(spherePosition[0],spherePosition[1],0);
//THE ASTRONAUT !!
    gPush();
        //going to do the torso 
        gScale(1.1,1.1,1.1); // just making the astronaut bigger, this was after realising everything was small
        gPush();
            setColor(vec4(1.0, 1.0, 1.0, 1.0));
            gRotate(-30, 0, 1, 0);
            gScale(0.5, 0.75, 0.25); 
            drawCube();
        gPop();
        //doing the buttons
        gPush();
            gTranslate(-0.38,0.43,0.2);
            gScale(0.12, 0.12, 0.01);   
            setColor(vec4(30 / 255, 40 / 255, 80 / 255, 1)); //I used a rgb finder then divided by 255 to get the values that work here
            drawSphere();  
        gPop();

        gPush();
            gTranslate(0,0,1);
            gScale(0.1, 0.1, 0.2);   
            setColor(vec4(110 / 255, 128 / 255, 209 / 255, 1)); 
            drawSphere();  
        gPop();

        gPush();
            gTranslate(-0.3,0,1);
            gScale(0.1, 0.1, 0.2);   
            setColor(vec4(110 / 255, 128 / 255, 209 / 255, 1)); 
            drawSphere();  
        gPop();

        gPush();
            gTranslate(-0.4,-0.3,0.7);
            gScale(0.1, 0.1, 0.2);   
            setColor(vec4(192 / 255, 197 / 255, 228 / 255, 1));
            drawSphere();  
        gPop();

        gPush();
            gTranslate(0.1,-0.3,0.7);
            gScale(0.1, 0.1, 0.2);   
            setColor(vec4(192 / 255, 197 / 255, 228 / 255, 1));
            drawSphere();  
        gPop();

        gPush();
            gTranslate(0,-0.53,0.7);
            gScale(0.1, 0.1, 0.2);   
            setColor(vec4(1, 0, 0, 1));
            drawSphere();  
        gPop();

        gPush();
            gTranslate(-0.3,-0.53,0.7);
            gScale(0.1, 0.1, 0.2);   
            setColor(vec4(1, 0, 0, 1));
            drawSphere();  
        gPop();
        //Doing the head 
        gPush();
        {
            gTranslate(0.0, 1.05, -0.25); 
            gRotate(-10, 0, 1, 0);
            gScale(0.375, 0.375, 0.375);
            setColor(vec4(1.0, 1.0, 1.0, 1.0));
            drawSphere();
        
            // This is the yellow part of the helmet//head (pushed it in here so everything is one)
            gPush();
            {
                gTranslate(-0.125, 0.0, 1); 

                gScale(0.9, 0.6, 0.5); 
                setColor(vec4(1.0, 0.65, 0.0, 1.0)); 
                drawSphere();
            }
            gPop();
        }
        gPop();

        // doing the Arms
        let armAngle = 5 * Math.sin((1.2*timestamp / 1000)); //again used the sin function to make the arms move in a sinusoidal motion
        gPush();
        {
            gTranslate(-0.85, 0, -0.375);  
            setColor(vec4(1.0, 1.0, 1.0, 1.0));
            //gRotate(0, 1, 0, 0);
            gRotate(-30, 0, 1, 0);
            gRotate(-45, 0, 0, 1);
            gRotate(armAngle, 0, 0, 1);
            gScale(0.125, 0.5, 0.125);  
            drawCube();
        }
        gPop();

        gPush();
        {
            gTranslate(0.8, 0, 0.48);  
            setColor(vec4(1.0, 1.0, 1.0, 1.0));
            gRotate(0, 1, 0, 0);
            gRotate(-30, 0, 1, 0);
            gRotate(45, 0, 0, 1);
            gRotate(armAngle, 0, 0, 1);
            gScale(0.125, 0.5, 0.125); 
            drawCube();
        }
        gPop();
        // Doing te legs
        let leftLegSwing = 10 * Math.sin((0.6 * timestamp) / 1000); 
        let rightLegSwing = 10 * Math.sin((0.6 * timestamp) / 1000); 
        let lowerLegBend = -5 * Math.sin((0.6 * timestamp) / 1000);
        let lowerLegBendtwo = 5 * Math.sin((0.6 * timestamp) / 1000);
        gPush(); // The thigh first
        {
            gTranslate(0.25, -1.20, 0); 
            setColor(vec4(1.0, 1.0, 1.0, 0.5));
            gRotate(15, 1, 0, 0);
            gRotate(-30, 0, 1, 0);
            gRotate(7, 0, 0, 1);
            gRotate(-leftLegSwing, 1, 0, 0);
            gPush();
            {
                gScale(0.135, 0.5, 0.135); 
                drawCube();
            }
            gPop();
        
            gPush(); //The leg of the thigh
            {
                gTranslate(-0.01, -0.95, -0.26);  
                setColor(vec4(1.0, 1.0, 1.0, 1.0));
                gRotate(10, 1, 0, 0);
                gRotate(19 + lowerLegBend, 1, 0, 0);
                gScale(0.135, 0.5, 0.135); 
                
                drawCube();
            }
            gPop();
            gPush(); // The foot of the same thigh 
            {
                gTranslate(0, -1.46, -0.19);  
                setColor(vec4(0.8, 0.8, 0.8, 1.0)); 
                gRotate(28, 1, 0, 0);
                gScale(0.13, 0.06, 0.2);  
                drawCube();
            }
            gPop();
        }
        gPop();
        gPush(); // Thigh #2
        {
            gTranslate(-0.25, -1.2, -3);  
            setColor(vec4(1.0, 1.0, 1.0, 1.0));
            gRotate(15, 1, 0, 0);
            gRotate(-30, 0, 1, 0); 
            gRotate(7, 0, 0, 1);
            gRotate(rightLegSwing, 1, 0, 0); 
            gPush();
            {
                gScale(0.135, 0.5, 0.135); 
                drawCube();
            }
            gPop();
        
            gPush(); 
            {
                gTranslate(0, -0.92, -0.23);  
                setColor(vec4(1.0, 1.0, 1.0, 1.0));
                //gRotate(2, 0, 0, 1);
                gRotate(30 + lowerLegBendtwo, 1, 0, 0); //30 +bend so its psoitoned at 30 degreed then swing
                gScale(0.125, 0.5, 0.125); 
                drawCube();
            }
            gPop();
            gPush(); 
            {
                gTranslate(0, -1.46, -0.19);  
                setColor(vec4(0.8, 0.8, 0.8, 1.0));
                gRotate(30, 1, 0, 0);
                gScale(0.13, 0.06, 0.2); 
                drawCube();
            }
            gPop();
        }
        gPop();
    gPop();
    //Done with the astronaut now the jelly fish , so popped out of the astronaut

    gRotate(20+sphereRotation[1], 0, 1, 0); //moving the jellyfish in a circular motion
    gPush();
        gPush(); // Smaller body
            gTranslate(-4.3, 1, 0);
            gRotate(-90, 0, 0, 1);
            gScale(0.6, 0.32, 0.5);
            setColor(vec4(0.914, 0.082, 0.569, 0.8));
            drawSphere();
            
            gPush();
                {//building and moving the tentacles
                gTranslate(2.5, 1, -0.4);
                gTranslate(0, -2, 0);
                gTranslate(-3.5, 0.4, 0);
                gRotate(100, 0, 0, -1);
        
                const oscillationSpeed = 0.001;
                const amplitudes = [20, 40, 50, 60].map(a => a / 3);//scaled amplitudes for tentacle movement
                
                //oscillation values for each tentacle segment based on time
                let sausages = amplitudes.map((amplitude, i) => 
                    amplitude * Math.sin(timestamp * oscillationSpeed + i * 0.6) 
                );
        
                const tentacleHeights = [1.8, 1, 0.1]; // how seprated they are from each other on the smaller body
                    
                for (let i = 0; i < tentacleHeights.length; i++) { 
                    let basePosition = tentacleHeights[i];
                        gPush();
                        {
                            gPush();
                            {
                                setColor(vec4(0.941, 0.718, 0.153, 1));
                                gTranslate(0, basePosition, -0.4);
                                gScale(0.3, 0.2, 0.4);
                                drawSphere();
                            }
                            gPop();
        
                            let accumulatedRotation = 0; //storing accumulated rotation for smoother motion
        
                            for (let j = 0; j < 4; j++) { 
                                gPush();
                                {
                                    gTranslate(0, basePosition, -0.7 - j * 0.45); //Position each seg as it goes
                                    
                                    
                                    let segmentOscillation = sausages[j] * (1 - j * 0.2); 
                                    accumulatedRotation += segmentOscillation;
        
                                    gRotate(accumulatedRotation, 1, 0, 0); 
                                    gTranslate(0, 0, -0.7 - j * 0.55);
                                    gScale(0.3, 0.22, 0.59);
                                    drawSphere();
                                }
                                gPop();
                            }
                        }
                        gPop();
                    }
                
                gPop();//out of tentacle
            }
        
                gPush(); // Bigger body
                    gTranslate(0, 1.6, 0);
                    gScale(1.5, 1.5, 1.5);
                    setColor(vec4(0.914, 0.082, 0.569, 0.8));
                    drawSphere();
                gPop();
        
            gPop(); // End of smaller body
        
        gPop(); // End of outer push
        
    
    if( animFlag )
        window.requestAnimFrame(render);
}