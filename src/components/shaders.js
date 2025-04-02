// 在shaders.glsl中添加转场特效
export const GLSL = {
  vertex: `
    attribute vec4 a_position;
    varying vec2 v_texCoord;
    void main() {
      gl_Position = a_position;
      v_texCoord = (a_position.xy + 1.0) / 2.0;
    }
  `,
  fragment: `
    precision mediump float;
    varying vec2 v_texCoord;
    uniform sampler2D u_texture;
    uniform float u_transition; // 转场进度

    void main() {
      vec4 current = texture2D(u_texture, v_texCoord);
      // 添加转场特效逻辑
      gl_FragColor = current;
    }
  `,
}
