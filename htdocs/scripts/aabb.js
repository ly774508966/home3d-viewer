/*
The MIT License (MIT)

Copyright (c) 2015 Markus Broecker <broecker@wisc.edu>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/


/*global
  gl, vec2, vec3, vec4, renderer
*/

var aabb = aabb || {};


aabb.calculate = function(pointcloud) {
  "use strict";

  const HUGE = 5000000;
  const smal = -HUGE;
  
  var minVal = [HUGE, HUGE, HUGE];
  var maxVal = [smal, smal, smal];
  
  var i = 0;
  var x, y, z;

  
  console.log("Calculating AABB for ", pointcloud.length/3, " points.");
  //console.log("Initial: ", minVal, maxVal);
 
  for (i = 0; i < pointcloud.length; i += 3) {
    
    x = pointcloud[i+0];
    y = pointcloud[i+1];
    z = pointcloud[i+2];
    
    minVal[0] = Math.min(minVal[0], x);
    maxVal[0] = Math.max(maxVal[0], x);
    
    minVal[1] = Math.min(minVal[1], y);
    maxVal[1] = Math.max(maxVal[1], y);
    
    minVal[2] = Math.min(minVal[2], z);
    maxVal[2] = Math.max(maxVal[2], z);
    
  }
  
  
  //console.log("AABB: ", minVal, " -- ", maxVal);
  
  
  return {min:minVal, max:maxVal};
};

aabb.create = function(minVals, maxVals) {
  "use strict";
  var minv = vec3.fromValues(minVals[0], minVals[1], minVals[2]);
  var maxv = vec3.fromValues(maxVals[0], maxVals[1], maxVals[2]);
  return {min:minv, max:maxv};
};

aabb.extractVertices = function(bbox) {
  /*
  +-------+
  |  o->x |
  |  |    |
  |  vz   |
  +-------+
  
  lower=min, caps=max
  xz Xz
  xZ XZ
  
  */
  
  "use strict";
  
  var vertices = [
    bbox.min[0], bbox.min[1], bbox.min[2],
    bbox.min[0], bbox.min[1], bbox.max[2],
    bbox.max[0], bbox.min[1], bbox.max[2],
    bbox.max[0], bbox.min[1], bbox.min[2],
    
    bbox.min[0], bbox.max[1], bbox.min[2],
    bbox.min[0], bbox.max[1], bbox.max[2],
    bbox.max[0], bbox.max[1], bbox.max[2],
    bbox.max[0], bbox.max[1], bbox.min[2]
    ];
  
  
  return vertices;
};

aabb.getCentroid = function(bbox) {
  "use strict";
  return [(bbox.min[0] + bbox.max[0])*0.5,
          (bbox.min[1] + bbox.max[1])*0.5,
          (bbox.min[2] + bbox.max[2])*0.5];
};

aabb.getSpanLength = function(bbox) {
  "use strict";
  return vec3.length(bbox.max - bbox.min);
  
};


aabb.calculateAABBAreas = function(bbox) {
  "use strict";

  // dimensions
  var x = bbox.max[0] - bbox.min[0];
  var y = bbox.max[1] - bbox.min[1];
  var z = bbox.max[2] - bbox.min[2];

  var xArea = y*z;
  var yArea = x*z;
  var zArea = x*y;

  return [xArea, yArea, zArea];
};

// clips the box against the frustum specified by the matrix (proj*modelview)
// returns 0 if box is completely outside, 1 if partially inside, 2 if fully inside 
aabb.clipBox = function(bbox, matrix) {
  "use strict";
  var vertices = aabb.extractVertices(bbox);

  var i = 0, j = 0;

  /* the six planes, based on manually extracting the mvp columns from clip space coordinates, as seen here:
    http://www.lighthouse3d.com/tutorials/view-frustum-culling/clip-space-approach-extracting-the-planes/
    Note that the article's matrix is in row-major format and therefore has to be switched. See also:
    http://www.cs.otago.ac.nz/postgrads/alexis/planeExtraction.pdf
  */

  function row(matrix, i) { 
    //return vec4.fromValues(matrix[i+0], matrix[i+4], matrix[i+8], matrix[i+12]);
    return [matrix[i+0], matrix[i+4], matrix[i+8], matrix[i+12]];
  }
  
  function neg(vec4) { 
    vec4[0] *= -1;
    vec4[1] *= -1;
    vec4[2] *= -1;
    vec4[3] *= -1;
    return vec4;
  }

  var row3 = row(matrix, 3);
  var planes = [ row(matrix, 0), neg(row(matrix, 0)), row(matrix, 1), neg(row(matrix, 1)), row(matrix, 2), neg(row(matrix, 2)) ];
  var vvertices = [];
  var v;

  for (i = 0; i < 8; i += 1) {
    //var v = vec4.fromValues(vertices[i*3+0], vertices[i*3+1], vertices[i*3+2], 1.0);
    v = [vertices[i*3+0], vertices[i*3+1], vertices[i*3+2], 1.0];
    vvertices.push(v);
  }


  // add the third row
  for (i = 0; i < planes.length; i += 1) { 
    vec4.add(planes[i], planes[i], row3);
  }
  
  var outside = 0, inside = 0;
  var d = 0;

  for (i = 0; i < 6; i += 1)
  {
    outside = 0;
    inside = 0;

    for (j = 0; j < 8; j += 1)
    {
      d = vec4.dot(planes[i], vvertices[j]);
      
      if (d < 0) {
        outside += 1;
      }
      else {
        inside += 1;
      }
    }

    // fully outside
    if (inside === 0) {
      bbox.screenSpaceVertices = null;
      return 0;
    }

    // partially inside
    // else if
    if (outside > 0) {
      return 1;
    }
  }

  // fully inside
  return 2;
};

aabb.drawAABB = function(bbox, shader) {
  "use strict";

  // 'pseudo static' -- check if the unchanging variables have been initialized (once)
  if (aabb.vertexBuffer === undefined) {
    console.log("creating AABB vertex buffers ");
    
    const bboxIndices = [ 0,1,1,2,2,3,3,0,
                          4,5,5,6,6,7,7,4,
                          0,4,1,5,2,6,3,7];
      
    aabb.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, aabb.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(8*3), gl.STREAM_DRAW);
    
    aabb.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, aabb.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(bboxIndices), gl.STATIC_DRAW);
    

  }
  
  // update vertex data
  var vertices = aabb.extractVertices(bbox);
  gl.bindBuffer(gl.ARRAY_BUFFER, aabb.vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
  gl.vertexAttribPointer(shader.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
 
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, aabb.indexBuffer);
  
  // setup shader
  gl.useProgram(shader);
  gl.enableVertexAttribArray(shader.vertexPositionAttribute);
  
  
  //gl.uniform3f(shader.colorUniform, 0.7, 0.7, 0.2);
  gl.uniformMatrix4fv(shader.projMatrixUniform, false, renderer.projMatrix);
  gl.uniformMatrix4fv(shader.viewMatrixUniform, false, renderer.viewMatrix);
  gl.drawElements(gl.LINES, 8*3, gl.UNSIGNED_BYTE, 0);
  
};


aabb.calculateScreenspaceBounds = function(bbox, matrix) {
  "use strict";

  // extract bounds vertices
  var clipVertices = [[0,0,0,1], [0,0,0,1], [0,0,0,1], [0,0,0,1], [0,0,0,1], [0,0,0,1], [0,0,0,1], [0,0,0,1]];
  var vertices = aabb.extractVertices(bbox);

  var i = 0;
  var v;

  for (i = 0; i < 8; i += 1) {

    v = clipVertices[i];

    //var v = vec4.fromValues(vertices[i*3+0], vertices[i*3+1], vertices[i*3+2], 1.0);
    v[0] = vertices[i*3+0];
    v[1] = vertices[i*3+1];
    v[2] = vertices[i*3+2];


    vec4.transformMat4(v, v, matrix);

    // homogenous transform
    vec4.scale(v, v, 1.0 / v[3]);
  }
  

  // calculate the x/y NDC bounds here
  const HUGE = 5000000;
  const smal = -HUGE;

  var boundsMin = [HUGE, HUGE], boundsMax = [smal, smal];

  for (i = 0; i < 8; i += 1) { 
    boundsMin[0] = Math.min(clipVertices[i][0], boundsMin[0]);
    boundsMin[1] = Math.min(clipVertices[i][1], boundsMin[1]);
    boundsMax[0] = Math.max(clipVertices[i][0], boundsMax[0]);
    boundsMax[1] = Math.max(clipVertices[i][1], boundsMax[1]);
  }


  bbox.screenSpaceBounds = {min:boundsMin, max:boundsMax};

};

// calculate projected screen-space area in pixels
aabb.calculateScreenspaceArea = function(bbox, resolution) { 
    "use strict";

    if (!bbox.screenSpaceBounds) {
      return 0;
    }

    // scale NDC vertices from [-1..1] to [0..1]
    var bounds = [0,0,0,0];
    bounds[0] = bbox.screenSpaceBounds.min[0] * 0.5 + 0.5; 
    bounds[1] = bbox.screenSpaceBounds.min[1] * 0.5 + 0.5; 
    bounds[2] = bbox.screenSpaceBounds.max[0] * 0.5 + 0.5; 
    bounds[3] = bbox.screenSpaceBounds.max[1] * 0.5 + 0.5; 

    // clip them to valid values
    bounds[0] = Math.max(0, Math.min(resolution[0], bounds[0]));
    bounds[1] = Math.max(0, Math.min(resolution[1], bounds[1]));
    bounds[2] = Math.max(0, Math.min(resolution[0], bounds[2]));
    bounds[3] = Math.max(0, Math.min(resolution[1], bounds[3]));


    // projected area on the near clip plane
    var area = (bounds[2] - bounds[0]) * (bounds[3] - bounds[1]);

    // scale the area to the resolution
    return area * resolution[0]*resolution[1];
};

aabb.getScreenspaceCentroid = function(bbox) { 
  "use strict";

  var c = vec2.create();
  c[0] = (bbox.screenSpaceBounds.max[0] - bbox.screenSpaceBounds.min[0]) / 2;
  c[1] = (bbox.screenSpaceBounds.max[1] - bbox.screenSpaceBounds.min[1]) /2 ;

  return c;
};

aabb.drawScreenspaceBounds = function(bbox, shader) { 
  "use strict";


  if (!bbox.screenSpaceBounds) {
    return;
  }
 
  // line-loop vertices
  var vertices = [bbox.screenSpaceBounds.min[0], bbox.screenSpaceBounds.min[1], bbox.screenSpaceBounds.max[0], bbox.screenSpaceBounds.min[1], bbox.screenSpaceBounds.max[0], bbox.screenSpaceBounds.max[1], bbox.screenSpaceBounds.min[0], bbox.screenSpaceBounds.max[1]];

  // quad vertices
  //var vertices = [bbox.screenSpaceBounds.min[0], bbox.screenSpaceBounds.max[1], bbox.screenSpaceBounds.min[0], bbox.screenSpaceBounds.min[1], bbox.screenSpaceBounds.max[0], bbox.screenSpaceBounds.max[1], bbox.screenSpaceBounds.max[0], bbox.screenSpaceBounds.min[1]];



  if (aabb.drawScreenspaceBounds.vertexBuffer === undefined) {
    console.log("Creating bbox bounds vertex buffer");

    aabb.drawScreenspaceBounds.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, aabb.drawScreenspaceBounds.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(2*4), gl.STREAM_DRAW);

  }

  // update vertex buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, aabb.drawScreenspaceBounds.vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
  
  gl.vertexAttribPointer(shader.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.LINE_LOOP, 0, 4);
  //gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);


};

aabb.swapYZ = function(bbox) {
  "use strict";
  var temp = bbox.min[1];
  bbox.min[1] = bbox.min[2];
  bbox.min[2] = temp * -1;

  temp = bbox.max[1];
  bbox.max[1] = bbox.max[2];
  bbox.max[2] = temp * -1;


};