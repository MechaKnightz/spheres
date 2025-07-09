@group(0) @binding(0) var<uniform> color: f32;

@fragment
fn main() -> @location(0) vec4f {
    var point = vec2f(0.5, 0.5);
    return vec4f(color, 0.0, 0.0, 1.0);
}