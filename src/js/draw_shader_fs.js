precision mediump float;

varying vec2      vertPos;
uniform sampler2D u_texture;
uniform float     u_distortion;
uniform float     u_stripe;
uniform float     u_rgbshift;

void main()
{
    // distortion
    vec2 ndc_pos = vertPos;
    vec2 testVec = ndc_pos.xy / max(abs(ndc_pos.x), abs(ndc_pos.y));
    float len = max(1.0,length( testVec ));
    ndc_pos *= mix(1.0, mix(1.0,len,max(abs(ndc_pos.x), abs(ndc_pos.y))), u_distortion);
    vec2 texCoord = vec2(ndc_pos.s, -ndc_pos.t) * 0.5 + 0.5;

    // stripes
    float stripTile = texCoord.t * mix(10.0, 100.0, u_stripe);
    float stripFac = 1.0 + 0.25 * u_stripe * (step(0.5, stripTile-float(int(stripTile))) - 0.5);

    // rgb shift
    float texR = texture2D( u_texture, texCoord.st-vec2(u_rgbshift) ).r;
    float texG = texture2D( u_texture, texCoord.st ).g;
    float texB = texture2D( u_texture, texCoord.st+vec2(u_rgbshift) ).b;

    float clip = step(0.0, texCoord.s) * step(texCoord.s, 1.0) * step(0.0, texCoord.t) * step(texCoord.t, 1.0);
    gl_FragColor  = vec4( vec3(texR, texG, texB) * stripFac * clip, 1.0 );
  }
