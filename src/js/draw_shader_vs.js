precision mediump float;

attribute vec2 inPos;
varying   vec2 vertPos;

void main()
{
    vertPos     = inPos;
    gl_Position = vec4( inPos, 0.0, 1.0 );
}
